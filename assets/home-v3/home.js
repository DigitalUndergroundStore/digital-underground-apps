/* Developer Marketplace homepage v3. Rows: #du-data (SSR by scripts/build-community-ssr.py) + live API merge. */
(function () {
"use strict";
    // ═══════════ PARTICLE SYSTEM (non-blocking) ═══════════
    try {
      const canvas = document.getElementById('particles');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
          constructor() { this.reset(true); }
          reset(initial = false) {
            this.x = Math.random() * canvas.width;
            this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
            this.size = Math.random() * 1.8 + 0.4;
            this.speedY = Math.random() * 0.35 + 0.08;
            this.speedX = (Math.random() - 0.5) * 0.25;
            this.opacity = Math.random() * 0.5 + 0.15;
            this.hue = 250 + Math.random() * 40;
          }
          update() {
            this.y -= this.speedY;
            this.x += this.speedX;
            if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) this.reset();
          }
          draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 75%, ${this.opacity})`;
            ctx.fill();
          }
        }

        function initParticles() {
          const count = Math.min(Math.floor((canvas.width * canvas.height) / 18000), 80);
          particles = Array.from({ length: count }, () => new Particle());
        }
        initParticles();
        window.addEventListener('resize', initParticles);

        function animateParticles() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          particles.forEach(p => { p.update(); p.draw(); });
          requestAnimationFrame(animateParticles);
        }

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          animateParticles();
        }
      }
    } catch (e) {
      console.warn('Particles skipped', e);
    }

    // ═══════════ DATA + RENDER + FILTER (v3, data-driven) ═══════════
    // Listing rows come from <script id="du-data" type="application/json"> (server-rendered by
    // scripts/build-community-ssr.py on the live site). On the live domain we also merge the live API
    // the same way the previous homepage did, so new approved listings appear without a rebuild.
    const $ = id => document.getElementById(id);
    const ONSITE = /^https?:$/.test(location.protocol) && /(^|\.)digitalundergroundstore\.com$|digital-underground\.pages\.dev$|^localhost$|^127\./.test(location.hostname);
    const SITE = ONSITE ? '' : 'https://digitalundergroundstore.com';
    const abs = u => !u ? '' : (/^(https?:|data:)/.test(u) ? u : SITE + u);
    const grid = $('projectGrid');
    const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
    const GM = /[^\s@<>"]+@gmail\.com/gi;
    const esc = s => String(s ?? '').replace(GM, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const CATS = { apps: 'Apps', 'ai-tools': 'AI tools', games: 'Games', books: 'Books', templates: 'Templates', other: 'Services & other' };
    const DOTC = { 'Featured pick': '#8b5cf6', 'Beta / testing': '#fbbf24', 'In testing / development': '#34d399', 'In development / testing': '#22d3ee', 'No label': '#9ca3af' };

    function normalize(r) {
      if (/^cm_kerzy_/.test(r.id) || /kerzy/i.test(r.makerName || '')) { r.makerName = 'Kerzy Labs'; r.curated = false; }
      if (r.id === 'cm_kerzy_neonbastion' || /neon bastion/i.test(r.name || '')) r.stage = 'In development / testing';
      return r;
    }
    function makerSlug(r) {
      if (r.makerSlug && /^[a-z0-9-]{1,48}$/.test(r.makerSlug)) return r.makerSlug;
      if (/^cm_kerzy_/.test(r.id || '')) return 'kerzy-labs';
      return /^wolfitway$/i.test(r.makerName || '') ? 'wolfitway' : '';
    }
    // Default order (mirrors arrange() in build-community-ssr.py): Wolf Sniff 1st, Releviq 2nd, Wolfscent 4th, other Wolfitway spread out.
    function arrange(list) {
      const isW = r => /^wolfitway$/i.test(r.makerName || '');
      const wolf = list.filter(isW), rest = list.filter(r => !isW(r));
      if (!wolf.length) return list;
      const pick = re => { const i = wolf.findIndex(r => re.test(r.name || '')); return i >= 0 ? wolf.splice(i, 1)[0] : null; };
      const first = pick(/wolf sniff/i), second = pick(/wolfscent/i);
      const ri = rest.findIndex(r => /^releviq$/i.test(r.name || '')); const rel = ri >= 0 ? rest.splice(ri, 1)[0] : null;
      const out = [first, rel, rest.shift(), second].filter(Boolean);
      const tail = rest.slice(), n = wolf.length, slots = tail.length + n, pos = [];
      for (let k = 1; k <= n; k++) pos.push(Math.round(slots * k / (n + 1)) - 1);
      for (let j = 0, w = 0, t = 0; j < slots; j++) out.push(w < n && j === pos[w] ? wolf[w++] : (t < tail.length ? tail[t++] : wolf[w++]));
      return out.filter(Boolean);
    }
    function toProject(r, i) {
      const stage = r.stage && r.stage !== 'Released' ? r.stage : '';
      const nums = (String(r.priceLabel || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map(s => parseFloat(s.replace(/,/g, '')));
      return {
        id: r.id, order: i, title: r.name || '', maker: r.makerName || '', makerSlug: makerSlug(r), x: r.xHandle || '',
        category: r.category || 'other', price: r.priceLabel || 'See site', desc: r.pitchShort || '',
        badge: stage || (r.curated ? 'Featured pick' : null), label: r.statusLabel ? String(r.statusLabel).slice(0, 24) : null,
        url: r.visitUrl || r.projectUrl || '', page: SITE + '/community/p/?id=' + encodeURIComponent(r.id), img: r.imageUrl || '',
        tags: r.tags || [], contactable: r.contactable !== false, pv: nums.length ? Math.max(...nums) : 0
      };
    }
    const isFree = p => /^free/i.test(p.price.trim());
    const stamp = p => { const m = /^cm_([a-z0-9]{8})_/.exec(p.id); return m ? parseInt(m[1], 36) : 0; };
    const labelsOf = p => [p.badge || 'No label'].concat(p.label ? [p.label] : []);

    let projects = [], PMAX = 1, els = new Map();
    const DEF = () => ({ q: '', lo: 0, hi: PMAX, free: true, cats: new Set(), makers: new Set(), labels: new Set(), sort: 'featured' });
    let state = DEF();

    const NO_BADGE = new Set(['cm_mv822ro8_6d5c4cb4']); // Releviq: stays badge-free in 2nd place
    function badgeHTML(p) {
      const one = b => { const cls = /featured/i.test(b) ? 'badge-featured' : /beta/i.test(b) ? 'badge-beta' : 'badge-testing'; return `<span class="card-badge ${cls}">${(/featured/i.test(b) ? '<svg class="star" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg> ' : '') + esc(b)}</span>`; };
      const parts = [p.badge, p.label].filter(Boolean);
      const free = /^free$/i.test(String(p.price || '').trim()) && !NO_BADGE.has(p.id) ? '<span class="card-badge badge-free">Free</span>' : '';
      return parts.length || free ? `<div class="card-badges">${free}${parts.map(one).join('')}</div>` : '';
    }
    function makerHTML(p) {
      const name = p.makerSlug ? `<a href="${SITE}/makers/${encodeURIComponent(p.makerSlug)}/">${esc(p.maker)}</a>` : esc(p.maker);
      return name + (p.x ? ` · <a href="https://x.com/${encodeURIComponent(p.x)}" target="_blank" rel="noopener" aria-label="@${esc(p.x)} on X (opens in a new tab)">@${esc(p.x)}</a>` : '');
    }
    function cardEl(p) {
      const a = document.createElement('article');
      a.className = 'card'; a.dataset.id = p.id;
      a.innerHTML = `
          <div class="card-media">
            ${badgeHTML(p)}
            ${p.img ? `<img src="${esc(abs(p.img))}" alt="${esc(p.title)} cover image" width="640" height="360" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
            <div class="card-placeholder" aria-hidden="true">${esc(p.title.slice(0, 2))}</div>
          </div>
          <div class="card-body">
            <div class="card-meta">${makerHTML(p)}</div>
            <h3 class="card-title"><a href="${esc(p.page)}">${esc(p.title)}</a></h3>
            <p class="card-desc">${esc(p.desc)}</p>
            <div class="card-footer">
              <span class="card-price ${isFree(p) ? 'free' : ''}">${esc(p.price)}</span>
              <div class="card-actions">
                ${p.contactable ? `<a href="${esc(p.page)}#contact" class="btn btn-ghost" aria-label="Contact the developer of ${esc(p.title)}">Contact</a>` : ''}
                <a href="${esc(p.url)}" data-out="${esc(p.id)}" class="btn btn-primary" target="_blank" rel="noopener" aria-label="Visit ${esc(p.title)} (opens in a new tab)">Visit</a>
              </div>
            </div>
          </div>`;
      a.addEventListener('animationend', () => a.classList.remove('enter'));
      if (window.duTrack) duTrack.observe(a, p.id);
      return a;
    }
    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-state'; emptyEl.setAttribute('role', 'status');
    emptyEl.innerHTML = '<h3>No projects match</h3><p>Try a wider price range, another category, or clear the search.</p><button type="button" class="btn btn-outline">Clear all filters</button>';
    emptyEl.querySelector('button').addEventListener('click', () => resetFilters());

    // ── Option lists are built from the data, so new categories/makers/labels appear automatically ──
    function cb(name, val, label, n) {
      return `<label class="ck"><input type="checkbox" name="${name}" value="${esc(val)}"><span class="box" aria-hidden="true"></span><span class="ck-l">${esc(label)}</span><span class="ck-n">${n}</span></label>`;
    }
    function countBy(f) { const m = new Map(); projects.forEach(p => [].concat(f(p)).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return m; }
    function buildOptions() {
      const cc = countBy(p => p.category);
      $('catList').innerHTML = [...cc.keys()].sort((a, b) => (Object.keys(CATS).indexOf(a) + 99 * !CATS[a]) - (Object.keys(CATS).indexOf(b) + 99 * !CATS[b]))
        .map(c => cb('cat', c, CATS[c] || c, cc.get(c))).join('');
      const mc = countBy(p => p.maker);
      $('makerList').innerHTML = [...mc.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })).map(([m, n]) => cb('maker', m, m, n)).join('');
      const lc = countBy(labelsOf);
      const order = Object.keys(DOTC).filter(l => l !== 'No label').concat([...lc.keys()].filter(l => !(l in DOTC)), ['No label']);
      $('labelDots').innerHTML = order.filter(l => lc.get(l)).map(l => `<button type="button" class="dot" data-label="${esc(l)}" aria-pressed="false" aria-label="${esc(l)} (${lc.get(l)})" title="${esc(l)} (${lc.get(l)})" style="--c:${DOTC[l] || '#a78bfa'}"></button>`).join('');
      $('freeN').textContent = projects.filter(p => p.pv === 0).length;
      PMAX = Math.max(1, ...projects.map(p => p.pv)); pMin.max = pMax.max = PMAX;
      document.querySelectorAll('input[name=cat]').forEach(c => c.addEventListener('change', () => { c.checked ? state.cats.add(c.value) : state.cats.delete(c.value); applyFilters(); }));
      document.querySelectorAll('input[name=maker]').forEach(c => c.addEventListener('change', () => { c.checked ? state.makers.add(c.value) : state.makers.delete(c.value); applyFilters(); }));
      document.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => {
        const l = d.dataset.label, on = !state.labels.has(l);
        on ? state.labels.add(l) : state.labels.delete(l); d.setAttribute('aria-pressed', on); dotsCaption(); applyFilters();
      }));
    }

    // Animated count
    let shown = 0, countRaf = 0;
    function animateCount(to) {
      const el = $('cntNum'), from = shown; shown = to;
      $('cntOf').textContent = to === projects.length ? (to === 1 ? 'project' : 'projects') : `of ${projects.length} projects`;
      document.querySelectorAll('.cnt-apply').forEach(e => e.textContent = to);
      cancelAnimationFrame(countRaf);
      if (RM.matches || from === to) { el.textContent = to; return; }
      const t0 = performance.now(), d = 420;
      const step = t => { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) countRaf = requestAnimationFrame(step); };
      countRaf = requestAnimationFrame(step);
    }
    function renderCards(list, initial) {
      const animate = !RM.matches;
      const first = new Map();
      if (animate && !initial) grid.querySelectorAll('.card').forEach(c => first.set(c.dataset.id, c.getBoundingClientRect()));
      const nodes = list.map(p => els.get(p.id));
      grid.replaceChildren(...(nodes.length ? nodes : [emptyEl]));
      animateCount(list.length);
      if (!animate) return;
      let n = 0;
      nodes.forEach(el => {
        const r0 = first.get(el.dataset.id);
        el.classList.remove('enter');
        if (r0) {
          const r1 = el.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top;
          if (dx || dy) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
        } else {
          const r1 = el.getBoundingClientRect();
          if (r1.top < innerHeight + 50 && r1.bottom > -50) { void el.offsetWidth; el.style.setProperty('--i', Math.min(n++, 12)); el.classList.add('enter'); }
        }
      });
    }
    function applyFilters(initial) {
      const q = state.q.toLowerCase().trim(), words = q ? q.split(/\s+/) : [];
      let list = projects.filter(p => {
        const hay = [p.title, p.desc, p.maker, p.x, CATS[p.category] || p.category, p.tags.join(' ')].join(' ').toLowerCase();
        const priceOk = p.pv === 0 ? state.free : (p.pv >= state.lo && p.pv <= state.hi);
        return words.every(w => hay.includes(w)) && priceOk
          && (!state.cats.size || state.cats.has(p.category))
          && (!state.makers.size || state.makers.has(p.maker))
          && (!state.labels.size || labelsOf(p).some(l => state.labels.has(l)));
      });
      if (state.sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      else if (state.sort === 'newest') list.sort((a, b) => stamp(b) - stamp(a) || a.order - b.order);
      else list.sort((a, b) => a.order - b.order);
      const active = (q ? 1 : 0) + (state.lo > 0 || state.hi < PMAX) + (!state.free) + state.cats.size + state.makers.size + state.labels.size + (state.sort !== 'featured');
      const fb = $('filterBadge'); fb.hidden = !active; fb.textContent = active;
      renderCards(list, initial);
    }

    // ── Price slider (eased scale so small prices aren't squashed next to the largest) ──
    const rMin = $('rMin'), rMax = $('rMax'), pMin = $('pMin'), pMax = $('pMax'), fill = $('rangeFill');
    const toVal = pos => Math.round(PMAX * Math.pow(pos / 1000, 2.2));
    const toPos = v => Math.round(1000 * Math.pow(Math.min(Math.max(v, 0), PMAX) / PMAX, 1 / 2.2));
    function syncRange(fromInputs) {
      if (!fromInputs) { rMin.value = toPos(state.lo); rMax.value = toPos(state.hi); }
      pMin.value = state.lo; pMax.value = state.hi;
      fill.style.left = (rMin.value / 10) + '%'; fill.style.right = (100 - rMax.value / 10) + '%';
    }
    function onSlide(e) {
      let a = +rMin.value, b = +rMax.value;
      if (a > b) { if (e.target === rMin) a = b; else b = a; rMin.value = a; rMax.value = b; }
      state.lo = a === 0 ? 0 : toVal(a); state.hi = b === 1000 ? PMAX : toVal(b);
      syncRange(true); applyFilters();
    }
    rMin.addEventListener('input', onSlide); rMax.addEventListener('input', onSlide);
    function onBox() {
      let lo = Math.max(0, +pMin.value || 0), hi = pMax.value === '' ? PMAX : Math.min(PMAX, +pMax.value);
      if (lo > hi) [lo, hi] = [hi, lo];
      state.lo = lo; state.hi = hi; syncRange(false); applyFilters();
    }
    pMin.addEventListener('change', onBox); pMax.addEventListener('change', onBox);
    $('incFree').addEventListener('change', e => { state.free = e.target.checked; applyFilters(); });
    const searchInput = $('searchInput');
    let qT; searchInput.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { state.q = searchInput.value; applyFilters(); }, 120); });
    document.querySelectorAll('input[name=sort]').forEach(r => r.addEventListener('change', () => { state.sort = r.value; applyFilters(); }));
    function dotsCaption() { $('dotsCap').textContent = state.labels.size ? [...state.labels].join(', ') : 'Any label'; }
    function resetFilters() {
      state = DEF(); searchInput.value = ''; $('incFree').checked = true;
      document.querySelectorAll('input[name=cat],input[name=maker]').forEach(c => c.checked = false);
      document.querySelector('input[name=sort][value=featured]').checked = true;
      document.querySelectorAll('.dot').forEach(d => d.setAttribute('aria-pressed', 'false'));
      dotsCaption(); syncRange(false); applyFilters();
    }
    window.resetFilters = resetFilters;
    $('fReset').addEventListener('click', resetFilters); $('fResetD').addEventListener('click', resetFilters);

    function setProjects(rows, initial) {
      projects = rows.map(toProject);
      els = new Map(projects.map(p => [p.id, els.get(p.id) && initial === 'keep' ? els.get(p.id) : cardEl(p)]));
      if ($('heroCount')) $('heroCount').textContent = projects.length;
      buildOptions(); state = DEF(); searchInput.value = ''; dotsCaption(); syncRange(false);
      applyFilters(!!initial);
    }
    let seed = [];
    try { seed = JSON.parse($('du-data').textContent) || []; } catch (e) { seed = []; }
    setProjects(seed, true);
    // Live merge (same sources/order as the server render): static seed + live API + pinned order.
    if (ONSITE) Promise.all([
      fetch('/community/listings.json').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/community/listings').then(r => r.ok ? r.json() : { listings: [] }).catch(() => ({ listings: [] })),
      fetch('/community/pinned.json').then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([stat, api, pinned]) => {
      if (!Array.isArray(api && api.listings) || !api.listings.length) return;
      pinned = Array.isArray(pinned) ? pinned : [];
      const by = {};
      (Array.isArray(stat) ? stat : []).concat(api.listings).forEach(r => { if (r && r.id) by[r.id] = r; });
      let all = Object.values(by).map(normalize).filter(r => ['approved', 'live', 'published'].includes(r.status || 'approved') && !r.hidden && r.id !== 'cm_kerzy_easytracker');
      all.sort((a, b) => {
        const pa = pinned.indexOf(a.id), pb = pinned.indexOf(b.id);
        if (pa !== pb) return (pa < 0 ? 1e9 : pa) - (pb < 0 ? 1e9 : pb);
        if (!!a.curated !== !!b.curated) return a.curated ? 1 : -1;
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      });
      all = arrange(all);
      // Real submissions above seeded listings (mirrors build-community-ssr.py)
      const staticIds = new Set((Array.isArray(stat) ? stat : []).map(r => r && r.id));
      const seeded = r => staticIds.has(r.id) || /^cm_(kerzy|pick)_/.test(r.id) || /^digital underground$/i.test((r.makerName || '').trim());
      all = all.filter(r => !seeded(r)).concat(all.filter(seeded));
      const sig = rs => JSON.stringify(rs.map(r => [r.id, r.name, r.priceLabel, r.stage, r.statusLabel, r.curated, r.imageUrl, r.pitchShort]));
      if (sig(all) === sig(seed)) return;
      const untouched = !state.q && !state.cats.size && !state.makers.size && !state.labels.size && state.free && state.sort === 'featured' && state.lo === 0 && state.hi === PMAX;
      if (untouched) setProjects(all, 'keep');
    });

    // ── Collapsible sections ──
    document.querySelectorAll('.fsec-head').forEach(b => b.addEventListener('click', () => {
      const s = b.closest('.fsec'), o = s.classList.toggle('open'); b.setAttribute('aria-expanded', o);
    }));
    // ── Mobile drawer ──
    const fPanel = $('fPanel'), fToggle = $('fToggle'), fBackdrop = $('fBackdrop');
    function drawer(open) {
      fPanel.classList.toggle('open', open); fToggle.setAttribute('aria-expanded', open);
      document.body.classList.toggle('drawer-open', open);
      if (open) { fBackdrop.hidden = false; requestAnimationFrame(() => fBackdrop.classList.add('show')); setTimeout(() => $('fClose').focus(), 50); }
      else { fBackdrop.classList.remove('show'); setTimeout(() => { if (!fPanel.classList.contains('open')) fBackdrop.hidden = true; }, RM.matches ? 0 : 300); }
    }
    fToggle.addEventListener('click', () => drawer(true));
    $('fClose').addEventListener('click', () => { drawer(false); fToggle.focus(); });
    fBackdrop.addEventListener('click', () => drawer(false));
    $('fApply').addEventListener('click', () => { drawer(false); $('projects').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth' }); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && fPanel.classList.contains('open')) { drawer(false); fToggle.focus(); } });
    // ── Section scroll-reveal ──
    // threshold 0 (a % threshold never fires on tall sections on phones), reveal on anchor jumps, plus a 1.5s safety net.
    const revealAll = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
    const revealNear = () => document.querySelectorAll('.reveal:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight * 1.1) el.classList.add('in'); });
    if (RM.matches || !('IntersectionObserver' in window)) revealAll();
    else {
      const revealIO = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revealIO.unobserve(en.target); } }), { threshold: 0, rootMargin: '0px 0px 10% 0px' });
      document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));
      revealNear();
      addEventListener('hashchange', revealNear);
      addEventListener('scroll', () => requestAnimationFrame(revealNear), { passive: true });
      document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (a) { const t = document.querySelector(a.getAttribute('href')); if (t) t.classList.add('in'); t && t.querySelectorAll('.reveal').forEach(x => x.classList.add('in')); setTimeout(revealNear, 50); } });
      setTimeout(revealAll, 1500);
    }

    // ── Share ──
    const shareBtn = $('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', async () => {
      const url = 'https://digitalundergroundstore.com/';
      try { if (navigator.share) await navigator.share({ title: 'Developer Marketplace | Digital Underground', url }); else await navigator.clipboard.writeText(url); } catch (e) {}
    });

    // ═══════════ SCROLL REVEAL (must exist before first render) ═══════════
    const observerOptions = { threshold: 0.08, rootMargin: '0px 0px -20px 0px' };

    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          cardObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    function observeCards() {
      document.querySelectorAll('.card:not(.visible)').forEach(card => {
        cardObserver.observe(card);
      });
      // Fallback: force-visible anything already in (or near) viewport
      requestAnimationFrame(() => {
        document.querySelectorAll('.card:not(.visible)').forEach(card => {
          const rect = card.getBoundingClientRect();
          if (rect.top < window.innerHeight + 100) {
            card.classList.add('visible');
            cardObserver.unobserve(card);
          }
        });
      });
    }

    // Why cards reveal
    const whyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || 0);
          setTimeout(() => entry.target.classList.add('visible'), delay);
          whyObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) document.querySelectorAll('.why-card').forEach(c => c.classList.add('visible'));
    else document.querySelectorAll('.why-card').forEach(card => whyObserver.observe(card));


    // ═══════════ HEADER SCROLL ═══════════
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 24);
    }, { passive: true });

    // ═══════════ MOBILE MENU ═══════════
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open);
      menuToggle.innerHTML = open ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    });

    // ═══════════ FAQ ═══════════
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(el => {
          el.classList.remove('open');
          el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Escape closes mobile menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
      }
    });
})();
