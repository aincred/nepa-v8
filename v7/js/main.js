/* North Eastern Police Academy - page behaviour (GIGW 3.0 / WCAG 2.2 aligned)
   Sections: header (menu, ticker) | footer (email) | home (slider, gallery viewer, reveal) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Photos: try local file, then the nepa.gov.in copy, then a neutral placeholder ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var list = (img.getAttribute('data-fallback') || '').split(' ').filter(Boolean);
    if (!list.length) return;
    img.setAttribute('data-fallback', list.slice(1).join(' '));
    img.src = list[0];
  }, true);

  /* ---------- Facilities: "See More" toggle ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.fc-more');
    if (!b) return;
    var box = document.getElementById(b.getAttribute('aria-controls'));
    var open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (box) box.hidden = !open;
  });

  /* ---------- HEADER: collapsible menu ---------- */
  function initNav() {
    var nav = document.getElementById('site-nav');
    if (!nav) return;
    var btn = nav.querySelector('.menu-toggle');
    if (!btn) return;
    var subs = [].slice.call(nav.querySelectorAll('li.has-sub'));
    var desktop = window.matchMedia ? window.matchMedia('(min-width: 901px)') : { matches: window.innerWidth > 900 };

    /* Open / close one dropdown and keep aria-expanded and the +/- sign in step */
    function setSub(li, open) {
      li.classList.toggle('open', open);
      var t = li.querySelector(':scope > .sub-toggle');
      if (!t) return;
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      var p = t.querySelector('.plus');
      if (p) p.textContent = open ? '−' : '+';
    }
    function closeSubs(except) {
      subs.forEach(function (li) { if (li !== except && !(except && li.contains(except))) setSub(li, false); });
    }
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) closeSubs(null);
    }

    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });

    /* Dropdown toggles (Academy, Training of NEPA, Services ... and nested Faculty) */
    subs.forEach(function (li) {
      var t = li.querySelector(':scope > .sub-toggle');
      if (!t) return;
      t.addEventListener('click', function (e) {
        e.preventDefault();
        var willOpen = !li.classList.contains('open');
        closeSubs(willOpen ? li : null);
        setSub(li, willOpen);
      });
      /* desktop: hover opens the menu (CSS), so keep the +/- sign in sync */
      li.addEventListener('mouseenter', function () { if (desktop.matches) setSub(li, true); });
      li.addEventListener('mouseleave', function () { if (desktop.matches) setSub(li, false); });
    });

    /* Real links close the mobile menu; dropdown toggles must NOT (they only expand their list) */
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || a.classList.contains('sub-toggle')) return;
      set(false);
    });
    /* tap outside the menu closes any open dropdown */
    document.addEventListener('click', function (e) { if (!e.target.closest('#site-nav')) closeSubs(null); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (nav.classList.contains('open')) { set(false); btn.focus(); } else closeSubs(null);
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) set(false); });
  }

  /* ---------- HEADER: accessibility panel (text size A+ / A / A-, contrast) ---------- */
  function initA11y() {
    var btn = document.querySelector('.a11y'), panel = document.getElementById('a11y-panel');
    if (!btn || !panel) return;
    var level = 0, MIN = -2, MAX = 4, store = {};
    try { store = window.localStorage; } catch (e) {}
    function save(k, v) { try { store.setItem(k, v); } catch (e) {} }
    function load(k) { try { return store.getItem(k); } catch (e) { return null; } }
    function apply() { document.body.style.zoom = (1 + level * 0.1).toFixed(2); }
    function contrast(on) {
      document.body.classList.toggle('hc', on);
      var cb = panel.querySelector('.a11y-contrast');
      if (cb) cb.setAttribute('aria-pressed', on ? 'true' : 'false');
      save('nepa-hc', on ? '1' : '0');
    }
    function toggle(open) { panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
    level = parseInt(load('nepa-size'), 10) || 0; apply();
    if (load('nepa-hc') === '1') contrast(true);
    btn.addEventListener('click', function () { toggle(panel.hidden); });
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a11y]'); if (!b) return;
      var a = b.getAttribute('data-a11y');
      if (a === 'inc') level = Math.min(MAX, level + 1);
      else if (a === 'dec') level = Math.max(MIN, level - 1);
      else if (a === 'reset') level = 0;
      else if (a === 'contrast') { contrast(!document.body.classList.contains('hc')); return; }
      apply(); save('nepa-size', level);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { toggle(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !e.target.closest('.a11y-wrap')) toggle(false); });
  }

  /* ---------- HEADER: full screen toggle button ---------- */
  function initFullscreen() {
    var nav = document.getElementById('site-nav');
    if (!nav) return;
    var btn = nav.querySelector('.fs');
    if (!btn) return;
    var root = document.documentElement;
    var supported = !!(root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen);
    if (!supported) { if (btn.parentNode) btn.parentNode.style.display = 'none'; return; }
    function isFullscreen() {
      return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }
    function enter() {
      var el = root;
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
    }
    function exit() {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (isFullscreen()) exit(); else enter();
    });
    function sync() { btn.setAttribute('aria-pressed', isFullscreen() ? 'true' : 'false'); }
    ['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(function (ev) {
      document.addEventListener(ev, sync);
    });
  }

  /* ---------- HEADER: pausable notice ticker (WCAG 2.2.2) ---------- */
  function initTicker() {
    var t = document.getElementById('ticker');
    if (!t) return;
    var b = t.querySelector('.tk-btn');
    if (!b) return;
    b.addEventListener('click', function () {
      var p = t.classList.toggle('is-paused');
      b.setAttribute('aria-pressed', p ? 'true' : 'false');
      b.setAttribute('aria-label', p ? 'Resume scrolling notice' : 'Pause scrolling notice');
    });
  }

  /* ---------- FOOTER: spam-safe email link ---------- */
  function initEmail() {
    /* every element carrying data-user + data-domain becomes a mailto link (footer and Contact Us page) */
    [].slice.call(document.querySelectorAll('[data-user][data-domain]')).forEach(function (m) {
      var addr = m.dataset.user + '@' + m.dataset.domain;
      var a = document.createElement('a');
      a.className = m.id === 'nepa-mail' ? 'c-val' : (m.className || '');
      a.href = 'mailto:' + addr;
      /* show the address in spam-safe form (name[at]domain[dot]in); the mailto link still opens the real address */
      a.textContent = m.dataset.user + '[at]' + m.dataset.domain.replace(/\./g, '[dot]');
      a.setAttribute('aria-label', 'Email ' + m.dataset.user + ' at ' + m.dataset.domain.replace('.', ' dot '));
      m.replaceWith(a);
    });
  }

  /* ---------- HOME: photo slider ---------- */
  function initSlider() {
    var root = document.getElementById('slider');
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('.slide'));
    var dots = [].slice.call(root.querySelectorAll('.dot'));
    var count = root.querySelector('.count'), list = root.querySelector('.slides');
    var tg = root.querySelector('.toggle'), cur = 0, timer = null, playing = false;
    function show(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('active', i === cur); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === cur); d.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
      count.textContent = (cur + 1) + ' / ' + slides.length;
      var nx = slides[(cur + 1) % slides.length].querySelector('img'); if (nx) nx.loading = 'eager';
    }
    function play() { if (timer) clearInterval(timer); timer = setInterval(function () { show(cur + 1); }, 5000); playing = true; tg.dataset.state = 'playing'; tg.setAttribute('aria-label', 'Pause slideshow'); list.setAttribute('aria-live', 'off'); }
    function pause() { if (timer) clearInterval(timer); timer = null; playing = false; tg.dataset.state = 'paused'; tg.setAttribute('aria-label', 'Play slideshow'); list.setAttribute('aria-live', 'polite'); }
    root.querySelector('.prev').addEventListener('click', function () { show(cur - 1); });
    root.querySelector('.next').addEventListener('click', function () { show(cur + 1); });
    tg.addEventListener('click', function () { playing ? pause() : play(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); }); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
    var wasPlaying = false;
    function hold() { if (playing) { wasPlaying = true; clearInterval(timer); timer = null; playing = false; tg.dataset.state = 'playing'; } }
    function release() { if (wasPlaying) { wasPlaying = false; play(); } }
    root.addEventListener('mouseenter', hold); root.addEventListener('mouseleave', release);
    root.addEventListener('focusin', hold); root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) release(); });
    show(0);
    if (reduce) pause(); else play();
  }

  /* ---------- HOME: accessible photo viewer (native <dialog>) ---------- */
  function initLightbox() {
    var dlg = document.getElementById('lightbox');
    if (!dlg || !dlg.showModal) return;
    var items = [].slice.call(document.querySelectorAll('.gal-item')), cur = 0, opener = null;
    var img = dlg.querySelector('.lb-img'), cap = dlg.querySelector('.lb-cap'), cnt = dlg.querySelector('.lb-count');
    function show(n) {
      cur = (n + items.length) % items.length;
      var it = items[cur];
      img.src = it.dataset.full; img.alt = it.querySelector('img').alt; cap.textContent = it.dataset.cap;
      cnt.textContent = (cur + 1) + ' / ' + items.length;
    }
    items.forEach(function (it, i) { it.addEventListener('click', function () { opener = it; show(i); dlg.showModal(); dlg.querySelector('.lb-close').focus(); }); });
    dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    dlg.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* ---------- HOME: gentle scroll reveal (off for reduced motion) ---------- */
  function initReveal() {
    var els = [].slice.call(document.querySelectorAll('main .sec-title, main .card, main .prog, main .fact, main .fcard, main .gal-li, main .newsbox, main .about2-top'));
    if (reduce || !('IntersectionObserver' in window)) return;
    els.forEach(function (e, i) { e.classList.add('reveal'); e.style.transitionDelay = (i % 4) * 70 + 'ms'; });
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- boot ----------
     Every start-up step runs on its own inside safe(): if one of them fails
     (for example a menu item was removed from the header), all the others still work. */
  function safe(fn, name) {
    try { fn(); } catch (err) {
      if (window.console && console.warn) console.warn('[NEPA] ' + name + ' failed:', err);
    }
  }
  var partsDone = false;
  function initPartials() {
    if (partsDone) return; partsDone = true;       /* never bind the header twice */
    safe(initNav, 'menu');
    safe(initFullscreen, 'full screen button');
    safe(initTicker, 'ticker');
    safe(initA11y, 'accessibility panel');
    safe(initEmail, 'email links');
  }
  safe(initSlider, 'slider');
  safe(initLightbox, 'photo viewer');
  safe(initReveal, 'scroll reveal');
  if (window.__partialsLoaded) initPartials();
  else document.addEventListener('partials:loaded', initPartials);
})();
