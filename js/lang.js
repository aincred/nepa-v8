/* Hindi / English switch (GIGW 3.0: language selector, lang attribute, saved choice).
   - Strings come from js/lang-hi.js (exact English text -> Hindi). That file is big (300 KB),
     so it is downloaded ONLY when Hindi is needed (saved choice, or the visitor taps Hindi).
     English visitors never download it, which keeps every page fast.
   - Elements with data-hi="..." get their whole HTML replaced (for text with bold words etc.).
   - Elements with data-no-i18n are never translated.
   - The choice is remembered for this browsing session (and applies to every page), then
     resets to Hindi (the default) next time the site is opened. */
(function () {
  var HI = window.NEPA_HI || {};
  var KEY = 'nepa-lang';
  /* folder this script was loaded from, so js/lang-hi.js is found from any page */
  var BASE = (function () {
    try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/[^\/?#]*([?#].*)?$/, ''); } catch (e) {}
    return 'js/';
  })();
  var hiState = window.NEPA_HI ? 'ready' : 'idle', hiWaiters = [];
  function ensureHi(cb) {                       /* load Hindi strings once, then call cb (always called, even on failure) */
    if (hiState === 'ready') { cb(); return; }
    hiWaiters.push(cb);
    if (hiState === 'loading') return;
    hiState = 'loading';
    function settle(ok) {
      hiState = ok ? 'ready' : 'idle';
      if (ok && window.NEPA_HI) HI = window.NEPA_HI;
      var w = hiWaiters; hiWaiters = []; w.forEach(function (f) { try { f(); } catch (e) {} });
    }
    try {
      var sc = document.createElement('script');
      sc.src = BASE + 'lang-hi.js';
      sc.async = true;
      sc.onload = function () { settle(true); };
      sc.onerror = function () { settle(false); };
      document.head.appendChild(sc);
      setTimeout(function () { if (hiState === 'loading') settle(!!window.NEPA_HI); }, 10000);
    } catch (e) { settle(false); }
  }
  var EN_M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var HI_M = ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
  var MRE = EN_M.join('|');
  var DATE = '\\d{1,2} (?:' + MRE + ') \\d{4}';
  var lang = 'hi';   /* Hindi is the default; English only if the visitor picked it this session or uses ?lang=en */
  try { var q = /[?&]lang=(hi|en)/.exec(location.search); lang = q ? q[1] : (sessionStorage.getItem(KEY) === 'en' ? 'en' : 'hi'); } catch (e) {}
  document.documentElement.lang = lang;

  function mon(s) { return s.replace(new RegExp(MRE, 'g'), function (m) { return HI_M[EN_M.indexOf(m)]; }); }
  var PATTERNS = [
    [/^(\d+) of (\d+)$/, function (m) { return m[2] + ' में से ' + m[1]; }],
    [/^Go to photo (\d+)$/, function (m) { return 'चित्र ' + m[1] + ' पर जाएँ'; }],
    [/^Training activity at North Eastern Police Academy, photo (\d+)$/, function (m) { return 'पूर्वोत्तर पुलिस अकादमी में प्रशिक्षण गतिविधि, चित्र ' + m[1]; }],
    [/^Call (.+)$/, function (m) { return m[1] + ' पर कॉल करें'; }],
    [/^Email (.+)$/, function (m) { return 'ईमेल ' + m[1]; }],
    [/^Contact details of (.+)$/, function (m) { return HI[m[1]] ? HI[m[1]] + ' का संपर्क विवरण' : null; }],
    [/^about (.+)$/, function (m) { return HI[m[1]] ? HI[m[1]] + ' के बारे में' : null; }],
    [/^(\d+) items$/, function (m) { return m[1] + ' मद'; }],
    [/^(\d+(?:\.\d+)?) MB$/, function (m) { return m[1] + ' एमबी'; }],
    [/^(\d+) km$/, function (m) { return m[1] + ' कि.मी.'; }],
    [/^(\d+) yards$/, function (m) { return m[1] + ' गज'; }],
    [/^(\d+) recipients? listed$/, function (m) { return m[1] + ' प्राप्तकर्ता सूचीबद्ध'; }],
    [/^(\d+) trainees?$/, function (m) { return m[1] + ' प्रशिक्षु'; }],
    [/^(\d+) recipients?$/, function (m) { return m[1] + ' प्राप्तकर्ता'; }],
    [new RegExp('^' + DATE + '$'), function (m) { return mon(m[0]); }],
    [new RegExp('^(' + DATE + ') to (' + DATE + ')$'), function (m) { return mon(m[1]) + ' से ' + mon(m[2]); }],
    [/^Photograph of (.+?)(?:, Director of NEPA)?$/, function (m) { return HI[m[1]] ? HI[m[1]] + ' का छायाचित्र' : null; }],
    [/^(.+): recipients$/, function (m) { return HI[m[1]] ? HI[m[1]] + ': प्राप्तकर्ता' : null; }],
    [/^(.+), (\d{4}(?:–\d{4})?)$/, function (m) { return HI[m[1]] ? HI[m[1]] + ', ' + m[2] : null; }]
  ];
  function tr(t) {
    if (!t) return null;
    if (Object.prototype.hasOwnProperty.call(HI, t)) return HI[t];
    for (var i = 0; i < PATTERNS.length; i++) {
      var m = PATTERNS[i][0].exec(t);
      if (m) { var r = PATTERNS[i][1](m); if (r) return r; }
    }
    return null;
  }
  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  var texts = new Map(), attrs = [], blocks = [];
  var ATTRS = ['alt', 'aria-label', 'title', 'data-label'];

  function skip(node) {
    var el = node.nodeType === 1 ? node : node.parentNode;
    if (!el || !el.closest) return true;
    if (el.closest('[data-no-i18n],script,style,noscript')) return true;
    return false;
  }
  function doText(node) {
    if (skip(node)) return;
    var rec = texts.get(node), cur = node.nodeValue;
    if (rec && cur === rec.hi) return;
    var h = tr(norm(cur));
    if (h == null) return;
    var lead = /^\s*/.exec(cur)[0], trail = /\s*$/.exec(cur)[0];
    var out = lead + h + trail;
    texts.set(node, { orig: cur, hi: out });
    node.nodeValue = out;
  }
  function doAttr(el, a) {
    if (!el.hasAttribute(a) || skip(el)) return;
    var cur = el.getAttribute(a), done = false;
    for (var i = 0; i < attrs.length; i++) if (attrs[i].el === el && attrs[i].a === a) { if (attrs[i].hi === cur) return; attrs.splice(i, 1); break; }
    var h = tr(norm(cur));
    if (h == null) return;
    attrs.push({ el: el, a: a, orig: cur, hi: h });
    el.setAttribute(a, h);
  }
  function doBlocks(root) {
    [].forEach.call((root.querySelectorAll ? root.querySelectorAll('[data-hi]') : []), function (el) {
      if (blocks.some(function (b) { return b.el === el; })) return;
      blocks.push({ el: el, orig: el.innerHTML });
      el.innerHTML = el.getAttribute('data-hi');
    });
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doBlocks(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = tw.nextNode())) doText(n);
    var els = root.querySelectorAll('[' + ATTRS.join('],[') + ']');
    [].forEach.call(els, function (el) { ATTRS.forEach(function (a) { doAttr(el, a); }); });
    ATTRS.forEach(function (a) { doAttr(root, a); });
  }
  function meta() {
    var d = document.querySelector('meta[name="description"]');
    if (!document.documentElement.__enTitle) {
      document.documentElement.__enTitle = document.title;
      document.documentElement.__enDesc = d ? d.getAttribute('content') : '';
    }
    var t = HI[norm(document.documentElement.__enTitle)], dd = HI[norm(document.documentElement.__enDesc)];
    if (lang === 'hi') { if (t) document.title = t; if (d && dd) d.setAttribute('content', dd); }
    else { document.title = document.documentElement.__enTitle; if (d) d.setAttribute('content', document.documentElement.__enDesc); }
  }
  function revert() {
    texts.forEach(function (rec, node) { if (node.nodeValue === rec.hi) node.nodeValue = rec.orig; });
    texts.clear();
    attrs.forEach(function (r) { if (r.el.getAttribute(r.a) === r.hi) r.el.setAttribute(r.a, r.orig); });
    attrs = [];
    blocks.forEach(function (b) { b.el.innerHTML = b.orig; });
    blocks = [];
  }
  function buttons() {
    [].forEach.call(document.querySelectorAll('[data-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }
  function apply(announce) {
    document.documentElement.lang = lang;
    if (lang === 'hi') walk(document.body); else revert();
    meta(); buttons();
    if (announce) {
      var s = document.getElementById('lang-status');
      if (s) s.textContent = lang === 'hi' ? 'भाषा हिन्दी में बदली गई' : 'Language changed to English';
    }
  }
  function set(l) {
    lang = l;
    try { sessionStorage.setItem(KEY, l); } catch (e) {}
    if (l === 'hi') ensureHi(function () { if (lang === 'hi') apply(true); });
    else apply(true);
  }
  /* warm-up: start downloading Hindi as soon as the visitor points at the Hindi button */
  function warm(e) { var b = e.target.closest && e.target.closest('[data-lang="hi"]'); if (b && lang !== 'hi') ensureHi(function () {}); }
  document.addEventListener('mouseover', warm);
  document.addEventListener('focusin', warm);
  document.addEventListener('touchstart', warm, { passive: true });

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang]');
    if (b) { e.preventDefault(); set(b.getAttribute('data-lang')); }
  });
  function first() {
    function go() { apply(false); observe(); window.__langReady = true; try { document.dispatchEvent(new Event('lang:ready')); } catch (e) {} }
    if (lang === 'hi') ensureHi(go); else go();
  }
  document.addEventListener('partials:loaded', first);
  var started = false;
  function observe() {
    if (started) return; started = true;
    new MutationObserver(function (list) {
      if (lang !== 'hi') return;
      list.forEach(function (m) {
        if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
        else [].forEach.call(m.addedNodes, walk);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (window.__partialsLoaded) first();
})();
