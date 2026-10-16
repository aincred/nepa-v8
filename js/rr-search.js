/* Recruitment Rules and Recruitment pages: filter the list by text. Works with the Hindi/English switch. */
(function () {
  var q = document.getElementById('rr-q');
  if (!q) return;
  var items = [].slice.call(document.querySelectorAll('.rr-item'));
  var groups = [].slice.call(document.querySelectorAll('.rr-group'));
  var status = document.getElementById('rr-status');
  var none = document.getElementById('rr-none');
  var total = items.length;
  function hi() { return document.documentElement.lang === 'hi'; }
  var nounEn = status.getAttribute('data-noun-en') || 'Recruitment Rules';
  var nounHi = status.getAttribute('data-noun-hi') || 'सेवा भर्ती नियम';
  function say(shown, term) {
    if (hi()) {
      status.textContent = term ? total + ' में से ' + shown + ' ' + nounHi + ' दिखाए जा रहे हैं' : 'सभी ' + total + ' ' + nounHi + ' दिखाए जा रहे हैं';
    } else {
      status.textContent = term ? 'Showing ' + shown + ' of ' + total + ' ' + nounEn : 'Showing all ' + total + ' ' + nounEn;
    }
  }
  function run() {
    var term = q.value.trim().toLowerCase(), shown = 0;
    items.forEach(function (li) {
      var hay = (li.getAttribute('data-name') + ' ' + li.querySelector('h3').textContent).toLowerCase();
      var ok = !term || hay.indexOf(term) !== -1;
      li.hidden = !ok;
      if (ok) shown++;
    });
    groups.forEach(function (g) { g.hidden = !g.querySelector('.rr-item:not([hidden])'); });
    none.hidden = shown !== 0;
    say(shown, term);
  }
  q.addEventListener('input', run);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-lang]')) setTimeout(run, 50); });
})();
