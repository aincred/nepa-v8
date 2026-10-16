/* =========================================================
   NEPA shared header behaviour
   - Hamburger menu (phone and tablet) and dropdown menu (desktop)
   - Submenus: click, hover (mouse only), keyboard, Escape, arrows
   - Accessibility panel: text size and high contrast (remembered)
   - Language switch (sets html[data-lang], fires "nepa:langchange")
   - Full screen button and notice ticker pause/play

   Load with:  <script src="js/header.js" defer></script>
   If the header is injected later with fetch(), call NEPAHeader.init()
   after inserting it.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function onMedia(mq, fn) {
    if (mq.addEventListener) { mq.addEventListener('change', fn); } else if (mq.addListener) { mq.addListener(fn); }
  }

  /* ---------- Saved preferences, applied immediately to avoid a flash ---------- */
  var SIZES = [87.5, 100, 112.5, 125, 150];
  var sizeIndex = parseInt(read('nepa-text-size'), 10);
  if (isNaN(sizeIndex) || sizeIndex < 0 || sizeIndex >= SIZES.length) { sizeIndex = 1; }
  var highContrast = read('nepa-contrast') === '1';

  function applyPrefs() {
    root.style.fontSize = sizeIndex === 1 ? '' : SIZES[sizeIndex] + '%';
    root.classList.toggle('hc', highContrast);
  }
  applyPrefs();
  var savedLang = null;
  try { savedLang = window.sessionStorage.getItem('nepa-lang'); } catch (e) {}
  root.setAttribute('data-lang', savedLang === 'en' ? 'en' : 'hi');   /* Hindi first */

  /* =========================================================
     Main menu
     ========================================================= */
  function initMenu() {
    var nav = $('#site-nav');
    if (!nav || nav.getAttribute('data-ready')) { return; }
    nav.setAttribute('data-ready', '1');

    var toggle = $('.menu-toggle', nav);
    var list = $('#menu-list', nav);
    var items = $$('.has-sub', nav);
    var desktop = window.matchMedia('(min-width: 992px)');
    var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');

    function toggleOf(li) { return $(':scope > .sub-toggle', li); }
    function subOf(li) { return $(':scope > .sub', li); }

    /* Keep a submenu inside the viewport on the right edge */
    function place(li) {
      var sub = subOf(li);
      if (!sub) { return; }
      sub.classList.remove('flip');
      var r = sub.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) { sub.classList.add('flip'); }
    }

    function setOpen(li, open) {
      var t = toggleOf(li);
      li.classList.toggle('open', open);
      if (t) {
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
        var plus = $('.plus', t);
        if (plus) { plus.textContent = open ? '\u2212' : '+'; }
      }
      if (open && desktop.matches) { place(li); }
      if (!open) {
        $$('.has-sub.open', li).forEach(function (child) { setOpen(child, false); });
      }
    }

    function closeOthers(li) {
      items.forEach(function (other) {
        if (other !== li && !other.contains(li)) { setOpen(other, false); }
      });
    }

    function closeAll() {
      items.forEach(function (li) { setOpen(li, false); });
    }

    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      if (toggle) { toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); }
      if (!open) { closeAll(); }
    }

    function focusFirst(li) {
      var a = $(':scope > .sub > li > a', li);
      if (a) { a.focus(); }
    }

    /* Hamburger */
    if (toggle) {
      toggle.addEventListener('click', function () {
        setMenu(!nav.classList.contains('is-open'));
      });
    }

    /* Submenu toggles */
    $$('.sub-toggle', nav).forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        var li = t.parentNode;
        var isOpen = li.classList.contains('open');
        var next = !isOpen;
        /* With a mouse on desktop, hover already opens it; a click should keep it open */
        if (desktop.matches && hoverCapable.matches && isOpen && e.detail > 0) { next = true; }
        if (next) { closeOthers(li); }
        setOpen(li, next);
      });
    });

    /* Hover for mouse users on desktop */
    items.forEach(function (li) {
      li.addEventListener('mouseenter', function () {
        if (!desktop.matches || !hoverCapable.matches) { return; }
        window.clearTimeout(li._nepaTimer);
        closeOthers(li);
        setOpen(li, true);
      });
      li.addEventListener('mouseleave', function () {
        if (!desktop.matches || !hoverCapable.matches) { return; }
        li._nepaTimer = window.setTimeout(function () { setOpen(li, false); }, 180);
      });
    });

    /* Keyboard */
    nav.addEventListener('keydown', function (e) {
      var key = e.key;
      var target = e.target;
      var isToggle = target.classList && target.classList.contains('sub-toggle');

      if (key === 'Escape') {
        var openLi = target.closest ? target.closest('.has-sub.open') : null;
        if (openLi) {
          setOpen(openLi, false);
          var t = toggleOf(openLi);
          if (t) { t.focus(); }
          e.preventDefault();
        } else if (!desktop.matches && nav.classList.contains('is-open')) {
          setMenu(false);
          if (toggle) { toggle.focus(); }
          e.preventDefault();
        }
        return;
      }

      /* Space activates the link-like toggles */
      if (key === ' ' && isToggle) {
        e.preventDefault();
        target.click();
        return;
      }

      if (!desktop.matches) { return; }

      var parentUl = target.parentNode && target.parentNode.parentNode;
      var inTopLevel = parentUl === list;

      if (isToggle && (key === 'ArrowDown' || (!inTopLevel && key === 'ArrowRight'))) {
        e.preventDefault();
        var li = target.parentNode;
        closeOthers(li);
        setOpen(li, true);
        focusFirst(li);
        return;
      }

      if (inTopLevel && (key === 'ArrowRight' || key === 'ArrowLeft')) {
        var tops = $$(':scope > li > a', list).filter(function (a) { return a.offsetParent !== null; });
        var i = tops.indexOf(target);
        if (i > -1) {
          e.preventDefault();
          var n = tops[(i + (key === 'ArrowRight' ? 1 : tops.length - 1)) % tops.length];
          n.focus();
        }
        return;
      }

      if (!inTopLevel && parentUl && parentUl.classList.contains('sub')) {
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          e.preventDefault();
          var links = $$(':scope > li > a', parentUl);
          var idx = links.indexOf(target);
          var step = key === 'ArrowDown' ? 1 : links.length - 1;
          links[(idx + step) % links.length].focus();
        } else if (key === 'ArrowLeft') {
          var owner = parentUl.parentNode;
          if (owner && owner.classList.contains('has-sub')) {
            e.preventDefault();
            setOpen(owner, false);
            var ot = toggleOf(owner);
            if (ot) { ot.focus(); }
          }
        }
      }
    });

    /* Close when focus or a click leaves the navbar */
    nav.addEventListener('focusout', function (e) {
      if (desktop.matches && e.relatedTarget && !nav.contains(e.relatedTarget)) { closeAll(); }
    });
    doc.addEventListener('click', function (e) {
      if (nav.contains(e.target)) { return; }
      closeAll();
      if (!desktop.matches) { setMenu(false); }
    });

    /* Reset when crossing the breakpoint */
    onMedia(desktop, function () {
      setMenu(false);
      $$('.sub.flip', nav).forEach(function (s) { s.classList.remove('flip'); });
    });

    /* Mark the current page */
    var here = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('a[href]', list).forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^https?:/i.test(href)) { return; }
      var file = href.split('#')[0].split('?')[0].split('/').pop().toLowerCase();
      if (file === here) {
        a.setAttribute('aria-current', 'page');
        var p = a.parentNode;
        while (p && p !== list) {
          if (p.classList && p.classList.contains('has-sub')) { p.classList.add('has-active'); }
          p = p.parentNode;
        }
      }
    });

    /* Full screen button */
    var fs = $('.fs', nav);
    if (fs) {
      if (!doc.fullscreenEnabled) {
        if (fs.parentNode) { fs.parentNode.style.display = 'none'; }
      } else {
        fs.addEventListener('click', function (e) {
          e.preventDefault();
          if (doc.fullscreenElement) { doc.exitFullscreen(); } else { root.requestFullscreen(); }
        });
      }
    }
  }

  /* =========================================================
     Accessibility panel
     ========================================================= */
  function initA11y() {
    var wrap = $('.a11y-wrap');
    if (!wrap || wrap.getAttribute('data-ready')) { return; }
    wrap.setAttribute('data-ready', '1');

    var btn = $('.a11y', wrap);
    var panel = $('#a11y-panel', wrap);
    var contrastBtn = $('[data-a11y="contrast"]', wrap);
    if (!btn || !panel) { return; }

    function setPanel(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function sync() {
      applyPrefs();
      write('nepa-text-size', String(sizeIndex));
      write('nepa-contrast', highContrast ? '1' : '0');
      if (contrastBtn) { contrastBtn.setAttribute('aria-pressed', highContrast ? 'true' : 'false'); }
    }

    btn.addEventListener('click', function () { setPanel(panel.hidden); });

    panel.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-a11y]') : null;
      if (!b) { return; }
      var action = b.getAttribute('data-a11y');
      if (action === 'inc' && sizeIndex < SIZES.length - 1) { sizeIndex += 1; }
      if (action === 'dec' && sizeIndex > 0) { sizeIndex -= 1; }
      if (action === 'reset') { sizeIndex = 1; }
      if (action === 'contrast') { highContrast = !highContrast; }
      sync();
    });

    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setPanel(false); btn.focus(); }
    });
    doc.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) { setPanel(false); }
    });

    sync();
  }

  /* =========================================================
     Language switch
     ========================================================= */
  function initLang() {
    var sw = $('.lang-sw');
    if (!sw || sw.getAttribute('data-ready')) { return; }
    sw.setAttribute('data-ready', '1');

    var buttons = $$('[data-lang]', sw);
    var status = $('#lang-status');

    function setLang(lang, announce) {
      root.setAttribute('data-lang', lang);
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
      });
      try { window.sessionStorage.setItem('nepa-lang', lang); } catch (e) {}
      if (announce && status) {
        status.textContent = lang === 'hi' ? 'भाषा हिन्दी में बदली गई' : 'Language changed to English';
      }
      var detail = { lang: lang };
      var evt;
      if (typeof window.CustomEvent === 'function') {
        evt = new CustomEvent('nepa:langchange', { detail: detail });
      } else {
        evt = doc.createEvent('CustomEvent');
        evt.initCustomEvent('nepa:langchange', false, false, detail);
      }
      doc.dispatchEvent(evt);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); });
    });

    setLang(root.getAttribute('data-lang') === 'en' ? 'en' : 'hi', false);
  }

  /* =========================================================
     Notice ticker
     ========================================================= */
  function initTicker() {
    var ticker = $('#ticker');
    if (!ticker || ticker.getAttribute('data-ready')) { return; }
    ticker.setAttribute('data-ready', '1');

    var btn = $('.tk-btn', ticker);
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      var paused = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Resume scrolling notice' : 'Pause scrolling notice');
      ticker.classList.toggle('is-paused', paused);
    });
  }

  function init() {
    initMenu();
    initA11y();
    initLang();
    initTicker();
  }

  window.NEPAHeader = { init: init };

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
