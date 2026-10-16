/* =====================================================================
   include.js  -  puts the shared header, footer and back-to-top button on every page.

   HOW IT WORKS (three safety layers - the page can not end up without a header/footer):
     1. INSTANT : the text of each partial is kept in js/partials-bundle.js, so it is
                  already in memory. No network request, works on file:// and http://.
     2. FETCH   : if a partial is not inside the bundle, it is fetched from partials/.
     3. BACKUP  : if both fail, a small built-in header/footer with the main links is shown.

   SPEED: this script is loaded in <head>. A MutationObserver fills every
   <div data-include="..."> the moment the browser has read it, so the header is on
   screen before the page body has even finished loading.

   When everything is in place it sets  window.__partialsLoaded = true  and fires the
   "partials:loaded" event. main.js, lang.js, backtotop.js and loader.js wait for it.

   Do NOT edit partials-bundle.js by hand. Edit partials/*.html, then run:
       python build_partials.py
   ===================================================================== */
(function () {
  'use strict';
  if (window.__nepaIncludeRan) return;           /* never run twice */
  window.__nepaIncludeRan = true;

  var doc = document;
  var ATTR = 'data-include';
  var finished = false;

  /* ---------- layer 3: last-resort markup (kept tiny on purpose) ---------- */
  var BACKUP = {
    'partials/header.html':
      '<header style="background:#00205b;color:#fff;padding:12px 16px;font:600 16px/1.4 system-ui,Arial,sans-serif">' +
      '<a href="index.html" style="color:#fff;text-decoration:none;font-size:18px">North Eastern Police Academy</a>' +
      '<nav aria-label="Main menu" style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px 18px">' +
      '<a style="color:#fff" href="index.html">Home</a><a style="color:#fff" href="about.html">About</a>' +
      '<a style="color:#fff" href="news-events.html">News</a><a style="color:#fff" href="recruitment.html">Recruitment</a>' +
      '<a style="color:#fff" href="contact.html">Contact</a></nav></header>',
    'partials/footer.html':
      '<footer style="background:#00205b;color:#fff;padding:16px;margin-top:24px;font:15px/1.5 system-ui,Arial,sans-serif">' +
      '<p>North Eastern Police Academy, Umsaw, Meghalaya &ndash; Ministry of Home Affairs, Government of India.</p>' +
      '<p><a style="color:#fff" href="contact.html">Contact Us</a> &middot; <a style="color:#fff" href="sitemap.html">Sitemap</a></p></footer>',
    'partials/backtotop.html': ''
  };

  function bundled(url) {
    try { return window.NEPA_PARTIALS && window.NEPA_PARTIALS[url]; } catch (e) { return null; }
  }

  /* Swap one placeholder for its HTML. Never throws. */
  function put(slot, html) {
    try {
      if (!slot.parentNode) return;               /* already replaced */
      slot.outerHTML = html;
    } catch (e) {
      try { slot.innerHTML = html; slot.removeAttribute(ATTR); } catch (e2) {}
    }
  }

  var waiting = 0;                                 /* fetches still running */

  function fill(slot) {
    var url = slot.getAttribute(ATTR);
    if (!url) return;
    slot.setAttribute(ATTR, '');                   /* claim it so it is never filled twice */
    slot.setAttribute('data-include-src', url);

    var html = bundled(url);
    if (html != null) { put(slot, html); return; }   /* layer 1 */

    if (location.protocol === 'file:') {             /* fetch is blocked on file:// */
      put(slot, BACKUP[url] != null ? BACKUP[url] : ''); return;   /* layer 3 */
    }
    waiting++;                                       /* layer 2 */
    var settled = false;
    function done(h) {
      if (settled) return; settled = true;
      put(slot, h != null ? h : (BACKUP[url] != null ? BACKUP[url] : ''));   /* layer 3 if h is null */
      waiting--; maybeFinish();
    }
    try {
      fetch(url, { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(done, function () { done(null); });
      setTimeout(function () { done(null); }, 4000);   /* never wait more than 4 s */
    } catch (e) { done(null); }
  }

  /* Fill every placeholder that is safe to touch.
     "Safe" = the browser has finished reading it (something follows it, or the page is fully read). */
  function sweep() {
    var slots = doc.querySelectorAll('[' + ATTR + ']');
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (!s.getAttribute(ATTR)) continue;
      if (doc.readyState !== 'loading' || s.nextSibling) fill(s);
    }
  }

  function maybeFinish() {
    if (finished || waiting > 0 || doc.readyState === 'loading') return;
    finished = true;
    window.__partialsLoaded = true;
    try { doc.dispatchEvent(new Event('partials:loaded')); }
    catch (e) { try { var ev = doc.createEvent('Event'); ev.initEvent('partials:loaded', true, true); doc.dispatchEvent(ev); } catch (e2) {} }
  }

  function finalSweep() {
    try { sweep(); } catch (e) {}
    if (observer) { try { observer.disconnect(); } catch (e) {} }
    maybeFinish();
  }

  var observer = null;
  try {
    sweep();
    if ('MutationObserver' in window) {
      observer = new MutationObserver(function () { try { sweep(); } catch (e) {} });
      observer.observe(doc.documentElement, { childList: true, subtree: true });
    }
  } catch (e) {}

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', finalSweep);
  else finalSweep();

  /* Absolute safety net: even if something above went wrong, release waiting scripts. */
  setTimeout(function () { if (!finished) { try { sweep(); } catch (e) {} waiting = 0; maybeFinish(); } }, 5000);
})();
