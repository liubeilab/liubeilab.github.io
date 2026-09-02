/* News timeline: reveal each event as it scrolls into view and grow the spine's
   progress line. No-op on pages without a .timeline. If this script never runs,
   the items stay fully visible (the hidden state is only applied once we add
   `tl-ready`), so the news list degrades to a plain list. */
(function () {
  var timeline = document.querySelector('.timeline');
  if (!timeline) return;

  var items = Array.prototype.slice.call(timeline.querySelectorAll('.tl-item'));
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Enable the animated (initially-hidden) state only now that JS is running.
  timeline.classList.add('tl-ready');

  // Reveal anything already in view synchronously to avoid a first-paint flash.
  var vh = window.innerHeight || document.documentElement.clientHeight;
  items.forEach(function (it) {
    if (reduce || it.getBoundingClientRect().top < vh * 0.9) it.classList.add('is-visible');
  });

  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -12% 0px' });
    items.forEach(function (it) { if (!it.classList.contains('is-visible')) io.observe(it); });
  } else {
    items.forEach(function (it) { it.classList.add('is-visible'); });
  }

  // Progress line: fill the spine to roughly the middle of the viewport.
  function updateProgress() {
    var r = timeline.getBoundingClientRect();
    var mid = (window.innerHeight || document.documentElement.clientHeight) * 0.5;
    var filled = Math.min(Math.max(mid - r.top, 0), r.height);
    timeline.style.setProperty('--tl-progress', (r.height ? (filled / r.height) * 100 : 0) + '%');
  }
  if (!reduce) {
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }
})();
