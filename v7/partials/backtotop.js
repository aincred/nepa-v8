/* Back-to-top button behaviour. The button itself comes from partials/backtotop.html. */
(function () {
  'use strict';
  function init() {
    var b = document.getElementById('to-top');
    if (!b || b.getAttribute('data-ready')) return;
    b.setAttribute('data-ready', '1');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ((document.documentElement.lang || '') === 'hi') {
      b.setAttribute('aria-label', '\u092a\u0943\u0937\u094d\u0920 \u0915\u0947 \u0936\u0940\u0930\u094d\u0937 \u092a\u0930 \u091c\u093e\u090f\u0901');
      b.setAttribute('title', b.getAttribute('aria-label'));
    }
    b.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true });
    });
    function toggle() { b.hidden = (window.pageYOffset || document.documentElement.scrollTop) < 300; }
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }
  if (window.__partialsLoaded) init(); else document.addEventListener('partials:loaded', init);
})();
