/* Click any news photo to view it full-screen (fit to the window), with a close
   button, click-outside, and Escape. No-op on pages with no news photos. */
(function () {
  var imgs = document.querySelectorAll('.tl-media img');
  if (!imgs.length) return;

  var ov = document.createElement('div');
  ov.className = 'lightbox';
  ov.hidden = true;
  ov.innerHTML =
    '<button class="lightbox__close" type="button" aria-label="Close">×</button>' +
    '<img class="lightbox__img" alt="" />';
  document.body.appendChild(ov);

  var full = ov.querySelector('.lightbox__img');
  var closeBtn = ov.querySelector('.lightbox__close');

  function open(src) {
    if (!src) return;
    full.src = src;
    ov.hidden = false;
    document.body.style.overflow = 'hidden';   // freeze the page behind
    closeBtn.focus();
  }
  function close() {
    ov.hidden = true;
    full.removeAttribute('src');
    document.body.style.overflow = '';
  }

  imgs.forEach(function (im) {
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', function () { open(im.currentSrc || im.src); });
  });
  closeBtn.addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !ov.hidden) close();
  });
})();
