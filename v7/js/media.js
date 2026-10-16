/* Media page: photo viewer that moves only within the year being viewed.
   Without JavaScript the thumbnails are plain links to the large photo. */
(function () {
  var dlg = document.getElementById('md-lightbox');
  if (!dlg || !dlg.showModal) return;
  var img = dlg.querySelector('.lb-img'), cap = dlg.querySelector('.lb-cap'), cnt = dlg.querySelector('.lb-count');
  var list = [], cur = 0, opener = null;
  function show(n) {
    cur = (n + list.length) % list.length;
    var it = list[cur];
    img.src = it.getAttribute('href');
    img.alt = it.querySelector('img').alt;
    cap.textContent = it.getAttribute('data-cap');
    cnt.textContent = (cur + 1) + ' / ' + list.length;
  }
  [].forEach.call(document.querySelectorAll('.md-item'), function (it) {
    it.addEventListener('click', function (ev) {
      ev.preventDefault();
      opener = it;
      list = [].slice.call(it.closest('.md-grid').querySelectorAll('.md-item'));
      show(list.indexOf(it));
      dlg.showModal();
      dlg.querySelector('.lb-close').focus();
    });
  });
  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
  dlg.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (opener) opener.focus(); });
})();
