/* Symbiosis OS landing page: language, menu, header line, entrances. Nothing here runs in a loop: the page is still
   once it has drawn, so a slow phone spends its time on scrolling, not on effects. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;

  /* ---- language ---------------------------------------------------------------------------------------------
     Bulgarian is in the markup, so the page reads and indexes without JavaScript. English comes from i18n.js, and
     the Bulgarian strings are read from the page once, so switching back never needs a second copy. */
  var authored = {};
  doc.querySelectorAll('[data-i]').forEach(function (el) {
    var k = el.getAttribute('data-i');
    if (!(k in authored)) authored[k] = el.textContent;
  });
  var authoredAttr = new Map();
  doc.querySelectorAll('[data-ia]').forEach(function (el) {
    var spec = el.getAttribute('data-ia').split(':');
    authoredAttr.set(el, el.getAttribute(spec[0]));
  });

  function setLang(next) {
    var dict = (window.I18N && window.I18N[next]) || {};
    var useAuthored = next === 'bg';
    doc.querySelectorAll('[data-i]').forEach(function (el) {
      var k = el.getAttribute('data-i');
      var v = useAuthored ? authored[k] : dict[k];
      if (typeof v === 'string') el.textContent = v;
    });
    doc.querySelectorAll('[data-ia]').forEach(function (el) {
      var spec = el.getAttribute('data-ia').split(':');
      var v = useAuthored ? authoredAttr.get(el) : dict[spec[1]];
      if (typeof v === 'string') el.setAttribute(spec[0], v);
    });
    root.lang = next;
    doc.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next));
    });
    try { localStorage.setItem('sym-lang', next); } catch (e) { /* private mode */ }
  }

  doc.querySelectorAll('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });

  // An explicit ?lang= outranks what this browser stored last time, so the hreflang alternates land where they say.
  var initial = new URLSearchParams(location.search).get('lang');
  if (initial !== 'bg' && initial !== 'en') {
    try { initial = localStorage.getItem('sym-lang'); } catch (e) { initial = null; }
  }
  if (initial === 'en') setLang('en');

  /* ---- menu (phones and tablets) ---- */
  var btn = doc.querySelector('[data-menu-btn]');
  var menu = doc.querySelector('[data-menu]');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---- header hairline once the page has scrolled (one class, written only when it changes) ---- */
  var nav = doc.querySelector('[data-nav]');
  var scrolled = false;
  function onScroll() {
    var now = window.scrollY > 8;
    if (now !== scrolled) {
      scrolled = now;
      nav.classList.toggle('scrolled', now);
    }
  }
  if (nav) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- entrances: each block fades in once, the first time it comes into view ---- */
  var blocks = doc.querySelectorAll('.reveal');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) {
    blocks.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    blocks.forEach(function (el) { io.observe(el); });
  }
})();
