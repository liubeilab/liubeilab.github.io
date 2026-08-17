/* Mobile navigation. Both earlier drafts let the header nav wrap into several
   rows on a phone; below 860px it collapses behind a Menu button instead. */
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;

  function setOpen(open) {
    btn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    btn.textContent = open ? 'Close' : 'Menu';
  }

  btn.addEventListener('click', function () {
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      btn.focus();
    }
  });

  /* Leaving the mobile breakpoint must clear the toggled state, or the desktop
     nav inherits a stale is-open class. */
  var mq = window.matchMedia('(min-width: 861px)');
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () {
    if (mq.matches) setOpen(false);
  });
})();

/* Scroll reveal. The .reveal class is added here rather than in the markup, so
   a browser without JS never hides anything. */
(function () {
  var targets = document.querySelectorAll(
    '.section__head, .tools, .topics, .grid, .story, .pub-list, .people, .alumni, .posts, .band, .flow, .pi, .two-col, #resources'
  );
  if (!targets.length) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches || !('IntersectionObserver' in window)) return;

  Array.prototype.forEach.call(targets, function (el) { el.classList.add('reveal'); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);          // reveal once; re-animating on every pass is noise
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  Array.prototype.forEach.call(targets, function (el) { io.observe(el); });

  /* Anything already on screen at load reveals on the next frame, so the first
     view animates in rather than appearing pre-finished. */
  requestAnimationFrame(function () {
    Array.prototype.forEach.call(targets, function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { el.classList.add('is-in'); io.unobserve(el); }
    });
  });
})();
