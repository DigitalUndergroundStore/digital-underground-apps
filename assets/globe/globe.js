// Digital Underground — interactive photoreal Earth hero background.
// Three.js 0.162.0, self-hosted in /assets/vendor/three (MIT). Merged: real-time day/night globe + touch ripples + pointer parallax.
// prefers-reduced-motion: one static frame, no animation loop or ripples. Textures: Solar System Scope (CC BY 4.0), three.js examples (MIT).
import * as THREE from "../vendor/three/three.module.min.js";

const root = document.getElementById("du-globe-bg");
const canvas = document.getElementById("du-globe-canvas");

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (_) { return false; }
}
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!root || !canvas || !hasWebGL()) {
  if (root) root.classList.add("is-fallback");
} else {
  start();
}

function start() {
  const isMobile =
    matchMedia("(max-width: 820px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const RES = root.dataset.res || (isMobile ? "2k" : "4k"); // pages can pin 2k via data-res
  const BASE = new URL(".", import.meta.url).href;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (_) { root.classList.add("is-fallback"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const ZMIN = 1.6, ZMAX = 5.5;
  let zoom = isMobile ? 3.25 : (parseFloat(root.dataset.zoom) || 3.15); // desktop zoomed out a touch so the terminator shows
  camera.position.set(0, 0, zoom);

  const sunDir = new THREE.Vector3(2.2, 0.65, 1.45).normalize();

  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
  scene.add(earthGroup);
  const spin = new THREE.Group();
  // Real-time sun: subsolar point from current UTC, expressed in the Earth's fixed (texture) frame.
  // three.js sphere UVs: lon λ -> phi = (λ+180)/360·2π, local dir = (-cos φ·cos δ, sin δ, sin φ·cos δ).
  const sunLocal = new THREE.Vector3();
  function subsolar(date) {
    const d = date || new Date();
    const start = Date.UTC(d.getUTCFullYear(), 0, 0);
    const doy = (d.getTime() - start) / 86400000;
    const g = (2 * Math.PI / 365.25) * (doy - 1);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)); // minutes
    const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    let lon = -(utcMin + eqt - 720) / 4; // degrees
    lon = ((lon + 540) % 360) - 180;
    return { lon, lat: decl * 180 / Math.PI };
  }
  function lonLatToLocal(lon, lat, out) {
    const phi = ((lon + 180) / 360) * Math.PI * 2, la = lat * Math.PI / 180;
    return out.set(-Math.cos(phi) * Math.cos(la), Math.sin(la), Math.sin(phi) * Math.cos(la));
  }
  let sun0 = subsolar();
  lonLatToLocal(sun0.lon, sun0.lat, sunLocal);
  setInterval(() => { sun0 = subsolar(); lonLatToLocal(sun0.lon, sun0.lat, sunLocal); }, 60000);
  // Start facing the evening terminator (~80° east of the subsolar point) for a day/night mix.
  const startLon = sun0.lon + 80;
  const startPhi = ((startLon + 180) / 360) * Math.PI * 2;
  spin.rotation.set(0.18, Math.PI / 2 - startPhi, 0);
  earthGroup.add(spin);

  // ---------- Space: nebula haze + starfield ----------
  const spaceUni = { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
  (function nebula() {
    const m = new THREE.ShaderMaterial({
      uniforms: spaceUni, side: THREE.BackSide, depthWrite: false, transparent: true,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec3 vD;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<${isMobile ? 3 : 5};i++){ v+=a*n(p); p*=2.03; a*=.5; } return v; }
        void main(){
          vec3 d = normalize(vD);
          // Milky Way band: a tilted great circle
          vec3 bandN = normalize(vec3(0.35, 1.0, -0.25));
          float band = exp(-pow(dot(d, bandN) / 0.28, 2.0));
          float f = fbm(d * 3.2 + 1.7);
          float g = fbm(d * 7.0 - 3.1);
          float neb = smoothstep(.35, .9, f) * .7 + band * (.45 + .55 * g);
          vec3 col = mix(vec3(.16, .10, .42), vec3(.10, .26, .62), smoothstep(.3, .8, g));
          col = mix(col, vec3(.42, .22, .78), smoothstep(.55, .95, f) * .5);
          float dust = smoothstep(.55, .75, fbm(d * 11.0)) * band * .5;
          gl_FragColor = vec4(col * neb * (1. - dust) * .95, 1.);
        }`,
    });
    const neb = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), m);
    neb.renderOrder = -2; neb.frustumCulled = false;
    scene.add(neb);
  })();
  (function stars() {
    const N = isMobile ? 1800 : 4500;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
    const pal = [new THREE.Color(1, 1, 1), new THREE.Color(0.75, 0.85, 1), new THREE.Color(0.82, 0.7, 1), new THREE.Color(1, 0.93, 0.82)];
    const bandN = new THREE.Vector3(0.35, 1, -0.25).normalize(), v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const r = 18 + Math.random() * 28;
      // ~35% of stars cluster along the Milky Way band
      do { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u); v.set(q * Math.cos(t), u, q * Math.sin(t)); }
      while (i % 3 === 0 && Math.abs(v.dot(bandN)) > 0.22);
      pos.set([v.x * r, v.y * r, v.z * r], i * 3);
      const c = pal[Math.random() < 0.6 ? 0 : (1 + Math.floor(Math.random() * 3))];
      col.set([c.r, c.g, c.b], i * 3);
      const k = Math.random();
      size[i] = k > 0.985 ? 4.2 + Math.random() * 2 : k > 0.9 ? 2.6 + Math.random() * 1.4 : 1.2 + Math.random() * 1.4;
      ph[i] = Math.random() < 0.35 ? Math.random() * 6.28 : -1; // -1 = steady
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(size, 1));
    g.setAttribute("phase", new THREE.BufferAttribute(ph, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: spaceUni,
      vertexShader: `attribute float size; attribute float phase; varying vec3 vC; varying float vA; uniform float uPR; uniform float uTime;
        void main(){ vC=color; float tw = phase < 0. ? 1. : .55 + .45 * sin(uTime * (1.2 + fract(phase) * 2.2) + phase);
          vA = tw; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*1.35*uPR*(.85+.15*tw); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
        float core = smoothstep(.5, .0, d); core = core * core * 1.6 + smoothstep(.18, .0, d);
        gl_FragColor = vec4(vC * 1.6, clamp(core, 0., 1.) * vA); }`,
      vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m); pts.renderOrder = -1; pts.frustumCulled = false;
    scene.add(pts);
  })();

  // ---------- Earth ----------
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
  const uniforms = {
    uDay: { value: blank }, uNight: { value: blank }, uClouds: { value: blank }, uSpec: { value: blank }, uBump: { value: blank },
    uSun: { value: sunDir.clone() },
    uBumpScale: { value: isMobile ? 0.018 : 0.025 },
    uTexel: { value: new THREE.Vector2(1 / 2048, 1 / 1024) },
    uCloudOffset: { value: 0 },
  };
  const earthMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv; varying vec3 vNw; varying vec3 vPw; varying vec3 vTw; varying vec3 vBw;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position,1.0);
        vPw = wp.xyz;
        vNw = normalize(mat3(modelMatrix) * normal);
        // tangent frame on sphere: east (d/du) and north (d/dv)
        vec3 east = normalize(vec3(-position.z, 0.0, position.x) + vec3(1e-5,0.0,0.0));
        vTw = normalize(mat3(modelMatrix) * east);
        vBw = normalize(cross(vNw, vTw));
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform sampler2D uDay, uNight, uClouds, uSpec, uBump;
      uniform vec3 uSun; uniform float uBumpScale; uniform vec2 uTexel; uniform float uCloudOffset;
      varying vec2 vUv; varying vec3 vNw; varying vec3 vPw; varying vec3 vTw; varying vec3 vBw;
      void main(){
        vec3 N = normalize(vNw);
        // bump via finite differences on the height map
        float h0 = texture2D(uBump, vUv).r;
        float hx = texture2D(uBump, vUv + vec2(uTexel.x, 0.0)).r;
        float hy = texture2D(uBump, vUv + vec2(0.0, uTexel.y)).r;
        vec3 Nb = normalize(N - uBumpScale * 40.0 * ((hx - h0) * normalize(vTw) + (hy - h0) * normalize(vBw)));
        vec3 L = normalize(uSun);
        vec3 V = normalize(cameraPosition - vPw);
        float ndl = dot(N, L);
        float dayMix = smoothstep(-0.16, 0.22, ndl);

        vec3 day = texture2D(uDay, vUv).rgb;
        vec3 night = texture2D(uNight, vUv).rgb;
        float cloud = texture2D(uClouds, vUv + vec2(uCloudOffset, 0.0)).r;
        float spec = texture2D(uSpec, vUv).r;

        float lit = clamp(dot(Nb, L), 0.0, 1.0);
        // cloud shadow: sample clouds slightly toward the sun
        float cShadow = texture2D(uClouds, vUv + vec2(uCloudOffset, 0.0) - vec2(L.x, L.y) * 0.004).r;
        vec3 dayCol = day * (0.18 + 1.0 * lit) * (1.0 - 0.35 * cShadow * dayMix);

        // ocean specular (Blinn-Phong)
        vec3 H = normalize(L + V);
        float sp = pow(max(dot(Nb, H), 0.0), 90.0) * spec * 0.3 * smoothstep(0.0, 0.25, ndl); // toned-down ocean glare
        dayCol += vec3(0.78, 0.84, 0.95) * sp;

        vec3 city = night * vec3(1.0, 0.725, 0.412) * 2.3 * (1.0 - cloud * 0.85) + day * vec3(0.05, 0.06, 0.11);
        vec3 col = mix(city, dayCol, dayMix);

        // twilight purple band around the terminator
        float tw = smoothstep(-0.22, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.2, ndl));
        col += vec3(0.42, 0.2, 0.75) * tw * 0.09;

        // fresnel rim
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        col += vec3(0.302, 0.486, 1.0) * fr * (0.25 + 0.75 * clamp(ndl + 0.35, 0.0, 1.0)) * 0.9;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, isMobile ? 96 : 160, isMobile ? 64 : 112), earthMat);
  spin.add(earth);

  // ---------- Clouds ----------
  const cloudUni = { uClouds: { value: blank }, uSun: { value: sunDir.clone() }, uOffset: { value: 0 } };
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: cloudUni, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
      void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.); vPw=wp.xyz; vNw=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform sampler2D uClouds; uniform vec3 uSun; uniform float uOffset; varying vec2 vUv; varying vec3 vNw; varying vec3 vPw;
      void main(){
        float c = texture2D(uClouds, vUv + vec2(uOffset, 0.0)).r;
        float ndl = dot(normalize(vNw), normalize(uSun));
        float d = smoothstep(-0.16, 0.22, ndl);
        vec3 col = mix(vec3(0.09, 0.08, 0.22), vec3(1.0), d) * (0.55 + 0.45 * clamp(ndl, 0.0, 1.0));
        gl_FragColor = vec4(col, c * mix(0.32, 0.92, d));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, isMobile ? 96 : 160, isMobile ? 64 : 112), cloudMat);
  spin.add(clouds);

  // ---------- Halo ----------
  var haloMat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir.clone() } },
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vNw; varying vec3 vPw;
      void main(){ vec4 wp=modelMatrix*vec4(position,1.); vPw=wp.xyz; vNw=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vNw; varying vec3 vPw;
      void main(){
        vec3 V = normalize(cameraPosition - vPw);
        float rim = pow(clamp(0.72 + dot(vNw, V), 0.0, 1.0), 4.0);
        float s = clamp(dot(-vNw, normalize(uSun)) * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(vec3(0.44, 0.22, 0.92), vec3(0.26, 0.56, 1.0), s);
        gl_FragColor = vec4(col * rim * 1.15, rim);
      }`,
  });
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.14, 96, 64), haloMat));

  // ---------- Touch / pointer ripples (screen-space overlay) ----------
  const NR = 6;
  const rip = []; for (let i = 0; i < NR; i++) rip.push(new THREE.Vector3(0, 0, -99));
  const fxUni = { uTime: { value: 0 }, uAspect: { value: 1 }, uR: { value: rip } };
  const fxScene = new THREE.Scene(), fxCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fxMat = new THREE.ShaderMaterial({
    uniforms: fxUni, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform float uTime, uAspect; uniform vec3 uR[${NR}]; varying vec2 vUv;
      void main(){
        vec2 p = vec2(vUv.x * uAspect, vUv.y); float a = 0.;
        for (int i = 0; i < ${NR}; i++) {
          float age = uTime - uR[i].z; if (age < 0. || age > 1.6) continue;
          float d = distance(p, vec2(uR[i].x * uAspect, uR[i].y));
          float r = age * .32, w = .006 + age * .012;
          a += exp(-pow((d - r) / w, 2.)) * pow(1. - age / 1.6, 2.) * .55;
          a += exp(-pow((d - r * .62) / (w * .7), 2.)) * pow(1. - age / 1.6, 3.) * .25;
        }
        gl_FragColor = vec4(vec3(.49, .72, 1.) * a, a);
      }`,
  });
  fxScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fxMat));
  let ripI = 0, lastRip = 0;
  function ripple(x, y) {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    rip[ripI].set((x - r.left) / r.width, 1 - (y - r.top) / r.height, performance.now() / 1000);
    ripI = (ripI + 1) % NR; lastRip = performance.now(); kick();
  }
  // parallax tilt toward the pointer (mouse hover) and drag direction
  let px = 0, py = 0, tpx = 0, tpy = 0;
  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    tpx = (e.clientX / innerWidth - 0.5) * 2; tpy = (e.clientY / innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });

  // ---------- Textures (idle) ----------
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  function tex(name, srgb) {
    return new Promise((res, rej) => loader.load(BASE + name, (t) => {
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = Math.min(8, maxAniso);
      t.wrapS = THREE.RepeatWrapping;
      res(t);
    }, undefined, rej));
  }
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
  idle(() => {
    Promise.all([tex(`day-${RES}.jpg`, true), tex(`night-${RES}.jpg`, true), tex(`clouds-${RES}.jpg`, false), tex("spec-2k.jpg", false), tex("bump-2k.jpg", false)])
      .then(([d, n, c, s, b]) => {
        uniforms.uDay.value = d; uniforms.uNight.value = n; uniforms.uClouds.value = c; uniforms.uSpec.value = s; uniforms.uBump.value = b;
        cloudUni.uClouds.value = c;
        renderer.compile(scene, camera);
        renderFrame();
        root.classList.add("is-ready");
        window.__duGlobeReady = true;
      })
      .catch(() => root.classList.add("is-fallback"));
  }, { timeout: 1500 });

  // ---------- Layout ----------
  let wide = false;
  function resize() {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; fxUni.uAspect.value = w / h;
    wide = w >= 960;
    camera.updateProjectionMatrix();
    earthGroup.position.x = wide ? 0.42 : 0;
    earthGroup.position.y = w < 800 ? -0.42 : 0;
    camera.position.z = zoom / Math.min(1, camera.aspect * 1.25);
  }
  resize();
  new ResizeObserver(resize).observe(root);

  // ---------- Controls ----------
  const SENS = 0.0045, DAMP = 0.94, TILT = 0.72, AUTO = 0.00085;
  let vx = 0, vy = 0, dragging = false, lastX = 0, lastY = 0;
  let lock = null, sx = 0, sy = 0; // touch gesture lock: "h" spin, "v" scroll
  const pts = new Map(); let pinch0 = 0, zoom0 = zoom;
  const target = root.parentElement || root;

  function inHeroControls(e) { return e.target.closest && e.target.closest("a,button,input,select,textarea,summary,[role=button],[data-globe-ignore]"); }

  target.addEventListener("pointerdown", (e) => {
    if (inHeroControls(e)) return;
    ripple(e.clientX, e.clientY);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; dragging = false; return; }
    dragging = true; lastX = sx = e.clientX; lastY = sy = e.clientY; vx = vy = 0;
    lock = e.pointerType === "touch" ? null : "h";
  });
  addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && pinch0) {
      const [a, b] = [...pts.values()];
      zoom = THREE.MathUtils.clamp(zoom0 * (pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))), ZMIN, ZMAX);
      return;
    }
    if (!dragging) return;
    if (lock === null) {
      const dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
      if (dx < 6 && dy < 6) return;
      lock = dx > dy ? "h" : "v";
    }
    if (performance.now() - lastRip > 140) ripple(e.clientX, e.clientY);
    if (lock === "v") return; // let the page scroll
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vx = dx * SENS; vy = dy * SENS;
    spin.rotation.y += vx;
    spin.rotation.x = THREE.MathUtils.clamp(spin.rotation.x + vy, -TILT, TILT);
    kick();
  });
  function up(e) { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; if (!pts.size) { dragging = false; if (lock === "v") vx = vy = 0; lock = null; } }
  addEventListener("pointerup", up); addEventListener("pointercancel", up);
  // horizontal touch swipes must not scroll; vertical swipes do (touch-action: pan-y handles the browser side)
  target.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom * (1 + Math.sign(e.deltaY) * 0.08), ZMIN, ZMAX);
    kick();
  }, { passive: false });

  // ---------- Loop ----------
  let visible = true, onScreen = true, raf = 0;
  document.addEventListener("visibilitychange", () => { visible = document.visibilityState === "visible"; kick(); });
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(root);
  function kick() { if (!raf && visible && onScreen) raf = requestAnimationFrame(loop); }

  const now0 = () => performance.now();
  let frames = 0, t0 = performance.now(), cloudOff = 0;
  window.__duGlobeFps = 0;
  const _q = new THREE.Quaternion();
  function updateSun() {
    spin.updateMatrixWorld();
    spin.getWorldQuaternion(_q);
    sunDir.copy(sunLocal).applyQuaternion(_q).normalize();
    uniforms.uSun.value.copy(sunDir); cloudUni.uSun.value.copy(sunDir); haloMat.uniforms.uSun.value.copy(sunDir);
  }
  function renderFrame() {
    updateSun(); renderer.clear(); renderer.render(scene, camera);
    if (!reduced) { fxUni.uTime.value = performance.now() / 1000; renderer.render(fxScene, fxCam); }
  }
  function loop() {
    raf = 0;
    if (!visible || !onScreen || reduced) { if (reduced) renderFrame(); return; }
    px += (tpx - px) * 0.04; py += (tpy - py) * 0.04;
    earthGroup.rotation.x = py * 0.06; earthGroup.rotation.y = px * 0.08;
    if (!(dragging && lock === "h")) {
      spin.rotation.y += AUTO + vx; spin.rotation.x = THREE.MathUtils.clamp(spin.rotation.x + vy, -TILT, TILT);
      vx *= DAMP; vy *= DAMP;
      if (Math.abs(vx) < 1e-6) vx = 0; if (Math.abs(vy) < 1e-6) vy = 0;
    }
    spaceUni.uTime.value = now0() / 1000;
    cloudOff = (cloudOff + 0.000012) % 1;
    uniforms.uCloudOffset.value = cloudOff; cloudUni.uOffset.value = cloudOff;
    const dist = zoom / Math.min(1, camera.aspect * 1.25); // portrait screens: keep the globe inside the width
    camera.position.z += (dist - camera.position.z) * 0.12;
    renderFrame();
    frames++;
    const now = performance.now();
    if (now - t0 >= 1000) { window.__duGlobeFps = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now; }
    raf = requestAnimationFrame(loop);
  }
  kick();
}
