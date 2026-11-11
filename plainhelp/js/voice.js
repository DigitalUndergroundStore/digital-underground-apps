/* Voice: tap-to-talk STT + spoken replies.
   Mic stays on until tapped off. A quiet VoiceFocus learns the near-mic
   speaker automatically (no UI) and drops far-field TV/background speech. */
import { stripSearchPlaceholders } from "./placeholders.js";

const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export const sttSupported = () => !!SR;
export const ttsSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

const BANDS = 8;
const LEARN_MIN = 20;       // frames before we start filtering hard
const SIM_OK = 0.55;        // cosine similarity vs profile
const NEAR_RMS = 0.018;     // near-field speech floor (phone mic)
const TV_RMS_MAX = 0.008;   // below this while filtering → treat as background

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normBands(arr) {
  const out = new Float32Array(BANDS);
  let s = 0;
  for (let i = 0; i < BANDS; i++) s += arr[i] || 0;
  if (s < 1e-9) return out;
  for (let i = 0; i < BANDS; i++) out[i] = (arr[i] || 0) / s;
  return out;
}

/* Learns a spectral fingerprint from loud near-mic speech; gates STT finals. */
export class VoiceFocus {
  constructor({ loadProfile = () => null, saveProfile = () => {} } = {}) {
    this.loadProfile = loadProfile;
    this.saveProfile = saveProfile;
    this.profile = null;
    this.samples = 0;
    this._restore();
  }

  _restore() {
    try {
      const p = this.loadProfile();
      if (p && Array.isArray(p.bands) && p.bands.length === BANDS && (p.samples || 0) > 0) {
        this.profile = Float32Array.from(p.bands);
        this.samples = p.samples | 0;
      }
    } catch (e) { /* ignore */ }
  }

  _persist() {
    if (!this.profile) return;
    try {
      this.saveProfile({ bands: Array.from(this.profile), samples: this.samples, updatedAt: Date.now() });
    } catch (e) { /* ignore */ }
  }

  /* Short sample while user taps mic ON — then release the mic so SpeechRecognition can use it.
     Holding getUserMedia + STT together breaks listening on many phones. */
  async learnBurst(ms = 700) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    let stream = null, ctx = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        video: false,
      });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      if (ctx.state === "suspended") await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;
      src.connect(analyser);
      const time = new Uint8Array(analyser.fftSize);
      const freq = new Uint8Array(analyser.frequencyBinCount);
      const t0 = Date.now();
      while (Date.now() - t0 < ms) {
        analyser.getByteTimeDomainData(time);
        let sum = 0;
        for (let i = 0; i < time.length; i++) {
          const v = (time[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / time.length);
        analyser.getByteFrequencyData(freq);
        const raw = new Float32Array(BANDS);
        const n = freq.length;
        const startB = Math.floor(n * 0.04);
        const endB = Math.floor(n * 0.55);
        const span = Math.max(1, endB - startB);
        for (let b = 0; b < BANDS; b++) {
          const a = startB + Math.floor((span * b) / BANDS);
          const z = startB + Math.floor((span * (b + 1)) / BANDS);
          let acc = 0, c = 0;
          for (let i = a; i < z; i++) { acc += freq[i]; c++; }
          raw[b] = c ? acc / c : 0;
        }
        if (rms >= NEAR_RMS) {
          const bands = normBands(raw);
          if (!this.profile) this.profile = new Float32Array(BANDS);
          const alpha = this.samples < LEARN_MIN ? 0.4 : 0.12;
          for (let i = 0; i < BANDS; i++) this.profile[i] = this.profile[i] * (1 - alpha) + bands[i] * alpha;
          this.profile = normBands(this.profile);
          this.samples += 1;
        }
        await new Promise((r) => setTimeout(r, 60));
      }
      this._persist();
      return true;
    } catch (e) {
      return false;
    } finally {
      try { if (stream) stream.getTracks().forEach((tr) => tr.stop()); } catch (e) { /* ignore */ }
      try { if (ctx) ctx.close(); } catch (e) { /* ignore */ }
    }
  }

  async start() { return this.learnBurst(650); }
  stop() { this._persist(); }

  /* During STT we don't hold the analyser (mic must stay free). Always accept. */
  shouldAccept() { return true; }
}

export class Listener {
  constructor({
    lang = "",
    onInterim = () => {},
    onFinal = () => {},
    onState = () => {},
    onError = () => {},
    voiceFocus = null,
  } = {}) {
    Object.assign(this, { lang, onInterim, onFinal, onState, onError, voiceFocus });
    this.rec = null;
    this.active = false;
    this.wantOn = false;
    this.text = "";
    this._sentThrough = 0;
  }

  start() {
    if (!SR) return false;
    this.wantOn = true;
    // Learn a quick voice sample, release the mic, THEN start SpeechRecognition.
    // Running both at once makes many phones stop hearing you.
    const go = () => { if (this.wantOn) this._begin(); };
    if (this.voiceFocus) {
      this.voiceFocus.start().catch(() => {}).finally(go);
      return true;
    }
    return this._begin();
  }

  _begin() {
    if (!SR || !this.wantOn) return false;
    if (this.rec) return true;
    const rec = new SR();
    rec.lang = this.lang || navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    this.text = "";
    this._sentThrough = 0;
    rec.onresult = (e) => {
      let interim = "", finals = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript; else interim += r[0].transcript;
      }
      this.text = (finals || interim).trim();
      this.onInterim((finals + (interim ? " " + interim : "")).trim() || interim.trim());

      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r.isFinal) continue;
        if (i + 1 <= this._sentThrough) continue;
        this._sentThrough = i + 1;
        const chunk = String(r[0].transcript || "").trim();
        if (!chunk) continue;
        const conf = (r[0] && typeof r[0].confidence === "number") ? r[0].confidence : null;
        if (this.voiceFocus && !this.voiceFocus.shouldAccept(conf)) {
          continue; // TV / other speaker — ignore quietly
        }
        this.onFinal(chunk);
      }
    };
    rec.onerror = (e) => {
      const why = {
        "not-allowed": "Microphone permission is off. Allow the microphone for this site, or type instead (your keyboard's mic key works too).",
        "service-not-allowed": "Speech recognition isn't allowed here. Use your keyboard's mic (dictation) key instead.",
        "no-speech": this.wantOn ? "" : "I didn't hear anything. Tap the mic and speak, or type.",
        "audio-capture": "No microphone found. Type instead.",
        network: "Speech recognition needs internet. Type instead, or try again.",
        aborted: "",
      }[e.error];
      if (e.error === "no-speech" && this.wantOn) return;
      if (e.error !== "aborted" && why) this.onError(why);
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        this.wantOn = false;
      }
    };
    rec.onend = () => {
      this.rec = null;
      if (this.wantOn) {
        try {
          setTimeout(() => {
            if (this.wantOn && !this.rec) this._begin();
          }, 120);
        } catch (err) { /* ignore */ }
        return;
      }
      this.active = false;
      this.onState(false);
    };
    try {
      rec.start();
    } catch (e) {
      this.wantOn = false;
      this.active = false;
      this.rec = null;
      this.onError("Couldn't start voice input. Type instead.");
      this.onState(false);
      return false;
    }
    this.rec = rec;
    this.active = true;
    this.onState(true);
    return true;
  }

  stop() {
    this.wantOn = false;
    if (this.voiceFocus) {
      try { this.voiceFocus.stop(); } catch (e) { /* ignore */ }
    }
    if (this.rec) {
      try { this.rec.stop(); } catch (e) { /* ignore */ }
    } else {
      this.active = false;
      this.onState(false);
    }
  }

  cancel() {
    this.wantOn = false;
    this.text = "";
    if (this.voiceFocus) {
      try { this.voiceFocus.stop(); } catch (e) { /* ignore */ }
    }
    if (this.rec) {
      try { this.rec.abort(); } catch (e) { /* ignore */ }
    }
    this.active = false;
    this.rec = null;
    this.onState(false);
  }
}

export class Speaker {
  constructor() {
    this.enabled = true;
    this.voiceURI = "";
    this.rate = 1;
    this.buffer = "";
    this.unlocked = false;
  }

  voices() { return ttsSupported() ? speechSynthesis.getVoices() : []; }

  /* iOS only allows speech after a user tap: call this from a tap handler. */
  unlock() {
    if (this.unlocked || !ttsSupported()) return;
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
      this.unlocked = true;
    } catch (e) { /* ignore */ }
  }

  say(text) {
    if (!this.enabled || !ttsSupported()) return;
    const clean = stripSearchPlaceholders(text).replace(/https?:\/\/\S+/g, "").replace(/[*_#`>|]/g, "").trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    const v = this.voices().find((x) => x.voiceURI === this.voiceURI);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = this.rate || 1;
    speechSynthesis.speak(u);
  }

  /* Feed streamed text; speaks each finished sentence. */
  feed(delta) {
    this.buffer += delta;
    const re = /^([\s\S]*?[.!?…])(\s+|$)/;
    let m;
    while ((m = re.exec(this.buffer)) && m[2] !== "") {
      this.say(m[1]);
      this.buffer = this.buffer.slice(m[0].length);
    }
  }

  flush() { const rest = this.buffer; this.buffer = ""; this.say(rest); }

  stop() { this.buffer = ""; if (ttsSupported()) speechSynthesis.cancel(); }
}
