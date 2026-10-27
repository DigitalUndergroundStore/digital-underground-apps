// Email list stored in COMMUNITY_KV under "sub:<email>". CASL: express consent recorded with text, time, page.
export const CONSENT_TEXT = "Yes, email me new apps, updates and occasional offers from Digital Underground. I can unsubscribe at any time.";
// Free signup gift = Humanity X AUDIOBOOK only (rule Oct 26 2026). Ebook is paid-only in the store.
export const GIFT_URL = "/listen-hx-r7v2/";
export const AUDIO_URL = "/listen-hx-r7v2/";
export const SENDER = "Digital Underground, Ontario, Canada · digitalundergroundstore.com/support/";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
export function normEmail(e) { return String(e || "").trim().toLowerCase(); }
export function validEmail(e) { return e.length <= 254 && EMAIL_RE.test(e); }
export function token() { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, "0")).join(""); }
export async function listSubscribers(kv) {
  const out = []; let cursor;
  do {
    const r = await kv.list({ prefix: "sub:", cursor });
    for (const k of r.keys) { const v = await kv.get(k.name, "json"); if (v) out.push(v); }
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out.sort((a, b) => (b.at || 0) - (a.at || 0));
}
export function subscribersToCsv(rows) {
  const esc = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const cols = ["email", "status", "subscribed_at", "source", "consent_text", "unsubscribed_at", "unsubscribe_url"];
  return [cols.join(",")].concat(rows.map(r => [r.email, r.status, new Date(r.at).toISOString(), r.source, r.consent, r.unsubAt ? new Date(r.unsubAt).toISOString() : "", "https://digitalundergroundstore.com/api/unsubscribe?e=" + encodeURIComponent(r.email) + "&t=" + r.unsub].map(esc).join(","))).join("\n") + "\n";
}
