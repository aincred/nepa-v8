/* Loading screen for every page. Load this in <head> (before other scripts) with partials/loader.css.
   - Shows immediately when a page starts loading and when an internal link is clicked.
   - Hides as soon as the page text, header and footer are in place. It does NOT wait for
     photos any more (that made every page feel slow).
   - It can never get stuck: a timer hides it after 5 s, and partials/loader.css hides it
     by itself after 6 s even if JavaScript fails completely. */
(function () {
  'use strict';
  var MIN_MS = 120, MAX_MS = 5000;
  var start = Date.now(), el = null, done = false;
  var hi = (document.documentElement.lang || '') === 'hi' || (function () { try { var q = /[?&]lang=(hi|en)/.exec(location.search); return q ? q[1] === 'hi' : sessionStorage.getItem('nepa-lang') !== 'en'; } catch (e) { return true; } })();
  var label = hi ? 'लोड हो रहा है…' : 'Loading…';

  function build() {
    if (el) return el;
    el = document.createElement('div');
    el.className = 'nepa-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('data-no-i18n', '');
    el.innerHTML = '<img class="nepa-loader__logo" src="images/logo/3.png" alt="" width="96" height="96" onerror="this.style.display=\'none\'">' +
      '<div class="nepa-loader__ring" aria-hidden="true"></div>' +
      '<div class="nepa-loader__text">' + label + '</div>';
    document.documentElement.appendChild(el);
    return el;
  }
  function show() {
    done = false;
    var n = build();
    n.style.animation = 'none'; void n.offsetWidth; n.style.animation = '';   /* restart the 6 s CSS failsafe */
    n.classList.remove('is-hidden');
  }
  function hide() {
    if (done) return; done = true;
    var wait = Math.max(0, MIN_MS - (Date.now() - start));
    setTimeout(function () { if (el) el.classList.add('is-hidden'); }, wait);
  }

  show();
  /* ready = header/footer are in place (partials:loaded fires after the page is read).
     Hindi visitors also wait for the translation so they never see English flash first. */
  var parts = !!window.__partialsLoaded, lang = !wantsHindi() || !!window.__langReady;
  function wantsHindi() {
    try { var q = /[?&]lang=(hi|en)/.exec(location.search); return q ? q[1] === 'hi' : sessionStorage.getItem('nepa-lang') !== 'en'; }
    catch (e) { return true; }
  }
  function check() { if (parts && lang) hide(); }
  if (!parts) document.addEventListener('partials:loaded', function () { parts = true; check(); });
  if (!lang) document.addEventListener('lang:ready', function () { lang = true; check(); });
  window.addEventListener('load', function () { parts = true; lang = true; check(); });   /* backup: page fully loaded */
  check();
  setTimeout(hide, MAX_MS);

  /* Back/forward cache: never leave the loader stuck on a restored page */
  window.addEventListener('pageshow', function (e) { if (e.persisted) { start = 0; hide(); } });

  /* Show the loader when leaving through an internal link */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(h)) return;
    if (a.origin !== location.origin && location.protocol !== 'file:') return;
    if (a.pathname === location.pathname && a.search === location.search) return;
    start = Date.now(); show();
    setTimeout(hide, MAX_MS);
  });
})();
