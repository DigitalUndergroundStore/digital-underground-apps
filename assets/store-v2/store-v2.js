/* DU Store v2: header, section sidebar/drawer with search, card reveal, owner-only link. No product/link/checkout changes. */
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', function () {
  'use strict';
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var header = $('sxHeader');
  if (header) addEventListener('scroll', function () { header.classList.toggle('scrolled', scrollY > 20); }, { passive: true });
  var menu = $('sxMenu'), links = $('sxLinks');
  if (menu && links) menu.addEventListener('click', function () { var o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); }); // legacy header; shared DU nav handles the menu now
  // sections + counts (unique products per section; reels repeat featured items so they are not counted)
  var secs = [].slice.call(document.querySelectorAll('main > section[id]'));
  function items(sec) { return [].slice.call(sec.querySelectorAll('.card, .reel')).filter(function (el) { return !el.parentElement.closest('.card, .reel'); }); }
  function codes(sec) { var s = {}; sec.querySelectorAll('a[href*="gumroad.com/l/"]').forEach(function (a) { var m = a.href.match(/gumroad\.com\/l\/([\w-]+)/); if (m) s[m[1]] = 1; }); return Object.keys(s).length; }
  secs.forEach(function (sec) { var n = document.querySelector('[data-count="' + sec.id + '"]'); if (n) n.textContent = codes(sec); });
  // search
  var q = $('sxQ'), empty = $('sxEmpty'), cnt = $('sxCount'), bar = $('sxBarCount');
  function text(el) { return (el.textContent || '').toLowerCase(); }
  function apply() {
    var v = (q.value || '').trim().toLowerCase(), words = v ? v.split(/\s+/) : [], shown = {};
    secs.forEach(function (sec) {
      var any = false;
      items(sec).forEach(function (el) {
        var ok = words.every(function (w) { return text(el).indexOf(w) >= 0; });
        el.classList.toggle('sx-hidden', !ok);
        if (ok) { any = true; [el].concat([].slice.call(el.querySelectorAll('a'))).filter(function (a) { return /gumroad\.com\/l\//.test(a.href || ''); }).forEach(function (a) { var m = a.href.match(/gumroad\.com\/l\/([\w-]+)/); if (m) shown[m[1]] = 1; }); }
      });
      var lab = sec.querySelector('.reel-label'); if (lab) lab.classList.toggle('sx-hidden', !!v);
      sec.classList.toggle('sx-hidden', !any);
      var l = document.querySelector('.snav-link[data-sec="' + sec.id + '"]'); if (l) l.classList.toggle('dim', !any);
    });
    var n = Object.keys(shown).length;
    var msg = v ? n + (n === 1 ? ' product matches' : ' products match') : n + ' products';
    cnt.textContent = msg; bar.textContent = msg;
    $('sxApply').textContent = v ? 'Show ' + n + ' result' + (n === 1 ? '' : 's') : 'Show products';
    empty.hidden = n > 0;
  }
  var t; q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(apply, 120); });
  $('sxClear').addEventListener('click', function () { q.value = ''; apply(); });
  apply();
  // drawer
  var side = $('sxSide'), tog = $('sxToggle'), bd = $('sxBackdrop');
  function drawer(o) {
    side.classList.toggle('open', o); tog.setAttribute('aria-expanded', o); document.body.classList.toggle('sx-lock', o);
    if (o) { bd.hidden = false; requestAnimationFrame(function () { bd.classList.add('show'); }); setTimeout(function () { $('sxClose').focus(); }, 50); }
    else { bd.classList.remove('show'); setTimeout(function () { if (!side.classList.contains('open')) bd.hidden = true; }, RM ? 0 : 300); }
  }
  tog.addEventListener('click', function () { drawer(true); });
  // header "Browse products": phones/tablets open the browse + search drawer; desktop jumps to the sidebar search
  var hb = $('sxBrowse');
  if (hb) hb.addEventListener('click', function (e) {
    e.preventDefault();
    if (matchMedia('(max-width: 1099px)').matches) { drawer(true); tog = hb; }
    else { side.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); setTimeout(function () { q.focus({ preventScroll: true }); }, RM ? 0 : 400); }
  });
  $('sxClose').addEventListener('click', function () { drawer(false); tog.focus(); });
  bd.addEventListener('click', function () { drawer(false); });
  $('sxApply').addEventListener('click', function () { drawer(false); var f = secs.filter(function (s) { return !s.classList.contains('sx-hidden'); })[0]; if (f) f.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); });
  document.querySelectorAll('.snav-link').forEach(function (a) { a.addEventListener('click', function () { if (side.classList.contains('open')) drawer(false); }); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('open')) { drawer(false); tog.focus(); } });
  // active section highlight
  if ('IntersectionObserver' in window) {
    var act = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { document.querySelectorAll('.snav-link').forEach(function (l) { l.classList.toggle('active', l.dataset.sec === en.target.id); }); } }); }, { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach(function (s) { act.observe(s); });
  }
  // staggered card fade-up when cards come into view (never leaves cards hidden: animation only runs on visible cards)
  if (!RM && 'IntersectionObserver' in window) {
    var batch = 0, bt;
    var rev = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.style.setProperty('--i', Math.min(batch++, 8)); en.target.classList.add('sx-reveal'); rev.unobserve(en.target); } });
      clearTimeout(bt); bt = setTimeout(function () { batch = 0; }, 120);
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('main .card, main .reel').forEach(function (c) { if (c.getBoundingClientRect().top > innerHeight) rev.observe(c); });
  }
  // owner-only dashboard link (server-side cookie check, same as before); public visitors see nothing
  fetch('/api/nav', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || d.owner !== true) return;
    var a = document.createElement('a'); a.href = '/owner/'; a.className = 'sx-owner'; a.textContent = 'Owner';
    var slot = $('sxOwner'); if (slot) { slot.appendChild(document.createTextNode(' · ')); slot.appendChild(a); }
  }).catch(function () {});
});
