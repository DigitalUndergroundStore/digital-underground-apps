// Digital Underground — interactive photoreal Earth hero background.
// Three.js 0.162.0 via importmap ("three"). Textures: Solar System Scope (CC BY 4.0), three.js examples (MIT).
import * as THREE from "three";

const root = document.getElementById("du-globe-bg");
const canvas = document.getElementById("du-globe-canvas");

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (_) { return false; }
}
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!root || !canvas || reduced || !hasWebGL()) {
  if (root) root.classList.add("is-fallback");
} else {
  start();
}

function start() {
  const isMobile =
    matchMedia("(max-width: 820px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const RES = isMobile ? "2k" : "4k";
  const BASE = new URL(".", import.meta.url).href;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (_) { root.classList.add("is-fallback"); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const ZMIN = 2.35, ZMAX = 3.85;
  let zoom = isMobile ? 3.25 : 2.75;
  camera.position.set(0, 0, zoom);

  const sunDir = new THREE.Vector3(2.2, 0.65, 1.45).normalize();

  const earthGroup = new THREE.Group();
  earthGroup.rotation.z = THREE.MathUtils.degToRad(23.4);
  scene.add(earthGroup);
  const spin = new THREE.Group();
  spin.rotation.set(0.18, 4.15, 0);
  earthGroup.add(spin);

  // ---------- Stars ----------
  (function stars() {
    const N = isMobile ? 900 : 2000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    const pal = [new THREE.Color(1, 1, 1), new THREE.Color(0.72, 0.82, 1), new THREE.Color(0.78, 0.66, 1)];
    for (let i = 0; i < N; i++) {
      const r = 18 + Math.random() * 28, u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(t), r * u, r * s * Math.sin(t)], i * 3);
      const c = pal[Math.random() < 0.7 ? 0 : Math.random() < 0.5 ? 1 : 2];
      col.set([c.r, c.g, c.b], i * 3);
      size[i] = 0.6 + Math.random() * 1.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("size", new THREE.BufferAttribute(size, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uPR: { value: renderer.getPixelRatio() } },
      vertexShader: `attribute float size; varying vec3 vC; uniform float uPR;
        void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*uPR; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard; gl_FragColor=vec4(vC, smoothstep(.5,.0,d)*.9); }`,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    scene.add(new THREE.Points(g, m));
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
        vec3 dayCol = day * (0.12 + 0.98 * lit) * (1.0 - 0.35 * cShadow * dayMix);

        // ocean specular (Blinn-Phong)
        vec3 H = normalize(L + V);
        float sp = pow(max(dot(Nb, H), 0.0), 56.0) * spec * 0.85 * smoothstep(0.0, 0.25, ndl);
        dayCol += vec3(1.0, 0.96, 0.88) * sp;

        vec3 city = night * vec3(1.0, 0.725, 0.412) * 1.85 * (1.0 - cloud * 0.85);
        vec3 col = mix(city, dayCol, dayMix);

        // twilight purple band around the terminator
        float tw = smoothstep(-0.22, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.2, ndl));
        col += vec3(0.42, 0.2, 0.75) * tw * 0.22;

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
  const haloMat = new THREE.ShaderMaterial({
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
    camera.aspect = w / h;
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

  function inHeroControls(e) { return e.target.closest && e.target.closest("a,button,input,select,textarea,[role=button]"); }

  target.addEventListener("pointerdown", (e) => {
    if (inHeroControls(e)) return;
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

  let frames = 0, t0 = performance.now(), cloudOff = 0;
  window.__duGlobeFps = 0;
  function renderFrame() { renderer.render(scene, camera); }
  function loop() {
    raf = 0;
    if (!visible || !onScreen) return;
    if (!(dragging && lock === "h")) {
      spin.rotation.y += AUTO + vx; spin.rotation.x = THREE.MathUtils.clamp(spin.rotation.x + vy, -TILT, TILT);
      vx *= DAMP; vy *= DAMP;
      if (Math.abs(vx) < 1e-6) vx = 0; if (Math.abs(vy) < 1e-6) vy = 0;
    }
    cloudOff = (cloudOff + 0.000012) % 1;
    uniforms.uCloudOffset.value = cloudOff; cloudUni.uOffset.value = cloudOff;
    const dist = zoom / Math.min(1, camera.aspect * 1.25); // portrait screens: keep the globe inside the width
    camera.position.z += (dist - camera.position.z) * 0.12;
    // sun is fixed in world space; spin group rotation moves the terminator naturally
    renderFrame();
    frames++;
    const now = performance.now();
    if (now - t0 >= 1000) { window.__duGlobeFps = Math.round((frames * 1000) / (now - t0)); frames = 0; t0 = now; }
    raf = requestAnimationFrame(loop);
  }
  kick();
}
