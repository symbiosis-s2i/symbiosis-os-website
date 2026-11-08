/* Symbiosis OS - interaction layer.

   A direct port of the component the design shipped inside Claude
   Design's runtime. Same behaviours, same easing, same thresholds; the
   class became an IIFE, `this.props` became constants, and the two
   responsive `display` toggles moved into real media queries in
   styles.css so the header does not have to wait for JavaScript to know
   how wide the window is.

   Everything below degrades: with this file absent the page is still
   readable, still navigable, and still has all 22 sections in the
   markup. */

(function () {
  'use strict';

  var root = document.querySelector('[data-sym-root]');
  if (!root) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language ---------- */

  var META = {
    bg: {
      title: 'Symbiosis OS - AI платформа за бизнес растеж | 100+ AI модела в едно | Sell 2 Inspire',
      desc: 'Symbiosis OS обединява AI видео създаване (Cinema), кампанийни страници с AI търсене, продажби, клиенти, оферти и проекти в една система. Над 100 AI модела без допълнителни абонаменти.'
    },
    en: {
      title: 'Symbiosis OS - the AI platform for business growth | 100+ AI models in one | Sell 2 Inspire',
      desc: 'Symbiosis OS brings AI video production (Cinema), AI-search campaign pages, sales, clients, proposals and projects into one system. Over 100 AI models, no extra subscriptions.'
    }
  };

  var lang = 'bg';

  function swap(next) {
    var dict = window.I18N && window.I18N[next];
    lang = next;
    document.documentElement.lang = next;

    if (dict) {
      // textContent, not innerHTML: the dictionary is content, and none of
      // these strings carry markup.
      // document, not root: the skip link sits outside the design's own
      // wrapper, and scoping this to the wrapper left it in Bulgarian.
      document.querySelectorAll('[data-i]').forEach(function (el) {
        var v = dict[el.getAttribute('data-i')];
        if (typeof v === 'string') el.textContent = v;
      });
      // alt text and aria-labels are content too. The reference translated
      // neither, so a screen reader in English still heard Bulgarian.
      document.querySelectorAll('[data-ia]').forEach(function (el) {
        var spec = el.getAttribute('data-ia').split(':');
        var v = dict[spec[1]];
        if (typeof v === 'string') el.setAttribute(spec[0], v);
      });
    }

    var meta = META[next];
    if (meta) {
      document.title = meta.title;
      var d = document.querySelector('meta[name="description"]');
      if (d) d.setAttribute('content', meta.desc);
      var og = document.querySelector('meta[property="og:title"]');
      if (og) og.setAttribute('content', meta.title);
      var ogd = document.querySelector('meta[property="og:description"]');
      if (ogd) ogd.setAttribute('content', meta.desc);
    }

    root.querySelectorAll('[data-sym-lang]').forEach(function (b) {
      var on = b.getAttribute('data-sym-lang') === next;
      b.style.background = on ? '#f6f6f9' : 'transparent';
      b.style.color = on ? '#08080a' : '#88889a';
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    try { localStorage.setItem('sym-lang', next); } catch (e) { /* private mode */ }
  }

  /* ---------- menu ---------- */

  var menu = root.querySelector('[data-sym-menu]');
  var burger = root.querySelector('[data-act="toggleMenu"]');
  var menuOpen = false;

  function setMenu(open) {
    if (!menu) return;
    menuOpen = open;
    menu.style.display = open ? 'flex' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMenu() { setMenu(!menuOpen); }

  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
    // Any link inside the panel is a navigation; the panel should not
    // stay over the destination.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) {
      setMenu(false);
      if (burger) burger.focus();
    }
  });

  // The panel is fixed and full-bleed; leaving it open across the
  // breakpoint hides a desktop header behind it.
  var wide = window.matchMedia('(min-width: 1180px)');
  var onWide = function (m) { if (m.matches && menuOpen) setMenu(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else wide.addListener(onWide);

  /* ---------- declarative actions ---------- */

  var ACTIONS = {
    setBG: function () { swap('bg'); },
    setEN: function () { swap('en'); },
    toggleMenu: toggleMenu
  };

  root.querySelectorAll('[data-act]').forEach(function (el) {
    var fn = ACTIONS[el.getAttribute('data-act')];
    if (!fn) return;
    el.addEventListener('click', function (e) {
      if (el.tagName === 'BUTTON') e.preventDefault();
      fn(e);
    });
  });

  /* ---------- reveal on scroll ---------- */

  function initReveal() {
    var els = Array.prototype.slice.call(root.querySelectorAll('[data-reveal]'));
    if (!els.length) return;
    // Hiding the content first and revealing it on intersection is only
    // safe if the reveal can actually run. Without IntersectionObserver,
    // or with reduced motion asked for, the page stays as authored.
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    els.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      el.style.filter = 'blur(6px)';
      el.style.willChange = 'opacity, transform, filter';
    });

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = parseInt(el.getAttribute('data-reveal-d') || '0', 10);
        el.style.transition =
          'opacity .8s cubic-bezier(.2,.7,.2,1) ' + d + 'ms, ' +
          'transform .9s cubic-bezier(.2,.7,.2,1) ' + d + 'ms, ' +
          'filter .8s ease ' + d + 'ms';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        el.style.filter = 'blur(0px)';
        // willChange is a promise to the compositor, not a decoration -
        // leaving it set on 110 elements keeps 110 layers alive.
        window.setTimeout(function () { el.style.willChange = 'auto'; }, 1200 + d);
        obs.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- scroll-driven chrome ---------- */

  function initScroll() {
    var bar = root.querySelector('[data-sym-progress]');
    var nav = root.querySelector('[data-sym-nav]');
    var glow = root.querySelector('[data-sym-glow]');
    var raf = 0;

    // The glow used to track the scroll position 1:1; it now chases it,
    // one lerp step per frame, so a wheel flick reads as light settling
    // rather than light bolted to the page. The chase runs its own frame
    // loop and retires the moment it lands - an idle page schedules
    // nothing. The 1400px clamp keeps the old cutoff without the old
    // rule's hard stop.
    var glowY = 0, glowRaf = 0;
    var glowStep = function () {
      glowRaf = 0;
      var target = Math.min(window.scrollY || 0, 1400) * 0.16;
      glowY += (target - glowY) * 0.11;
      if (Math.abs(target - glowY) < 0.15) glowY = target;
      glow.style.transform = 'translateX(-50%) translate3d(0,' + glowY.toFixed(2) + 'px,0)';
      if (glowY !== target) glowRaf = requestAnimationFrame(glowStep);
    };

    var tick = function () {
      raf = 0;
      var y = window.scrollY || 0;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
      if (nav) {
        var on = y > 24;
        nav.style.background = on ? 'rgba(8,8,10,0.86)' : 'rgba(8,8,10,0.55)';
        nav.style.borderBottomColor = on ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)';
        nav.style.paddingTop = on ? '10px' : '14px';
        nav.style.paddingBottom = on ? '10px' : '14px';
      }
      if (glow && !reduceMotion && !glowRaf) glowRaf = requestAnimationFrame(glowStep);
    };

    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    tick();
  }

  /* ---------- animated score dial ---------- */

  function initDials() {
    var dials = Array.prototype.slice.call(root.querySelectorAll('[data-dial]'));
    if (!dials.length) return;

    var paint = function (el, value) {
      var num = el.querySelector('[data-dial-num]');
      var deg = (value / 100) * 360;
      el.style.background =
        'conic-gradient(#ff9b4a 0deg,#7a4dff ' + deg + 'deg,rgba(255,255,255,0.07) ' + deg + 'deg)';
      if (num) num.textContent = String(Math.round(value));
    };

    if (reduceMotion || !('IntersectionObserver' in window)) {
      dials.forEach(function (d) { paint(d, parseInt(d.getAttribute('data-dial') || '0', 10)); });
      return;
    }

    // The dial landing on its score deserves a full stop: a ring and a
    // handful of key/fill coloured sparks leave the rim and burn out.
    // Web Animations rather than a stylesheet because every particle has
    // its own vector, and the nodes remove themselves on finish, so the
    // DOM ends as it began. Only the animated path ever gets here, so
    // reduced motion never sees it.
    var shockwave = function (dial) {
      if (!dial.animate) return;
      var spawn = function (i, n) {
        var dot = document.createElement('span');
        var ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 58 + Math.random() * 54;
        var size = 3 + Math.random() * 3;
        var color = i % 3 ? '#8aa6ff' : '#ff9b4a';
        dot.setAttribute('aria-hidden', 'true');
        dot.style.cssText =
          'position:absolute;left:50%;top:50%;width:' + size.toFixed(1) + 'px;height:' +
          size.toFixed(1) + 'px;margin:' + (-size / 2).toFixed(1) + 'px;border-radius:50%;background:' +
          color + ';filter:drop-shadow(0 0 6px ' + color + ');pointer-events:none';
        dial.appendChild(dot);
        dot.animate([
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
          { transform: 'translate3d(' + (Math.cos(ang) * dist).toFixed(1) + 'px,' +
            (Math.sin(ang) * dist).toFixed(1) + 'px,0) scale(.25)', opacity: 0 }
        ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
          .onfinish = function () { dot.remove(); };
      };
      for (var i = 0; i < 18; i++) spawn(i, 18);
      var ring = document.createElement('span');
      ring.setAttribute('aria-hidden', 'true');
      ring.style.cssText =
        'position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(255,155,74,0.7);pointer-events:none';
      dial.appendChild(ring);
      ring.animate([
        { transform: 'scale(.55)', opacity: .9 },
        { transform: 'scale(1.55)', opacity: 0 }
      ], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' })
        .onfinish = function () { ring.remove(); };
    };

    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        o.unobserve(el);
        var target = parseInt(el.getAttribute('data-dial') || '0', 10);
        var start = performance.now();
        var step = function (now) {
          var p = Math.min(1, (now - start) / 1400);
          paint(el, target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
          else if (target === 94) shockwave(el);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });

    dials.forEach(function (d) { obs.observe(d); });
  }

  /* ---------- animated ratio bars ---------- */

  function initBars() {
    var bars = Array.prototype.slice.call(root.querySelectorAll('[data-bar]'));
    if (!bars.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      bars.forEach(function (b) { b.style.width = b.getAttribute('data-bar') + '%'; });
      return;
    }
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        o.unobserve(en.target);
        en.target.style.width = en.target.getAttribute('data-bar') + '%';
      });
    }, { threshold: 0.5 });
    bars.forEach(function (b) { obs.observe(b); });
  }

  /* ---------- Cinema slate: sticky card follows the active step ---------- */

  function initSlate() {
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-step]'));
    var num = root.querySelector('[data-slate-num]');
    var title = root.querySelector('[data-slate-title]');
    var body = root.querySelector('[data-slate-body]');
    if (!steps.length || !num || !title || !body) return;

    var rails = Array.prototype.slice.call(root.querySelectorAll('[data-slate-rail]'));
    var active = -1;

    var setActive = function (i) {
      if (i === active || i < 0) return;
      active = i;
      var el = steps[i];
      var t = el.querySelector('[data-step-title]');
      var b = el.querySelector('[data-step-body]');
      num.textContent = String(i + 1).padStart(2, '0');
      if (t) title.textContent = t.textContent;
      if (b) body.textContent = b.textContent;

      if (!reduceMotion) {
        // A rack-focus rather than a dissolve: the outgoing text defocuses
        // for a single beat (120ms) while the travel eases in over a
        // longer one, so the change reads as the slate being re-aimed.
        [num, title, body].forEach(function (n) {
          n.style.transition = 'none';
          n.style.opacity = '0';
          n.style.filter = 'blur(5px)';
          n.style.transform = 'translateY(7px)';
          requestAnimationFrame(function () {
            n.style.transition =
              'opacity .12s ease-out, filter .12s ease-out, ' +
              'transform .3s cubic-bezier(.2,.7,.2,1)';
            n.style.opacity = '1';
            n.style.filter = 'blur(0px)';
            n.style.transform = 'translateY(0)';
          });
        });
        // The rail that just filled flashes once. Removing and re-adding
        // the class (with a forced reflow between) restarts the animation
        // when the same rail fires twice in a fast scroll.
        var rail = rails[i];
        if (rail) {
          rail.classList.remove('sym-rail-pulse');
          void rail.offsetWidth;
          rail.classList.add('sym-rail-pulse');
        }
      }

      rails.forEach(function (r, ri) {
        r.style.background = ri <= i ? '#8aa6ff' : 'rgba(255,255,255,0.1)';
      });
      steps.forEach(function (s, si) {
        var on = si === i;
        var last = si === steps.length - 1;
        s.style.borderColor = on
          ? 'rgba(138,166,255,0.45)'
          : (last ? 'rgba(138,166,255,0.28)' : 'rgba(255,255,255,0.08)');
        if (!last) s.style.background = on ? '#101018' : '#0c0c11';
      });
    };

    setActive(0);
    if (!('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (en) {
        if (en.isIntersecting && (!best || en.intersectionRatio > best.intersectionRatio)) best = en;
      });
      if (best) setActive(steps.indexOf(best.target));
    }, { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.4, 1] });

    steps.forEach(function (s) { obs.observe(s); });
  }

  /* ---------- FAQ: single-open accordion ---------- */

  function initFaq() {
    var faq = document.getElementById('faq');
    if (!faq) return;
    var items = Array.prototype.slice.call(faq.querySelectorAll('details'));

    items.forEach(function (d) {
      var mark = d.querySelector('summary > span:last-child');
      if (mark) mark.style.transition = 'transform .3s cubic-bezier(.2,.7,.2,1), color .3s, border-color .3s';
      d.addEventListener('toggle', function () {
        if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
        items.forEach(function (o) {
          var m = o.querySelector('summary > span:last-child');
          if (!m) return;
          m.style.transform = o.open ? 'rotate(135deg)' : 'rotate(0deg)';
          m.style.borderColor = o.open ? 'rgba(138,166,255,0.5)' : 'rgba(255,255,255,0.14)';
        });
      });
    });
  }

  /* ---------- numbers that count up ----------
     The page already animates its score dial and grows its ratio bars; the
     large figures were the one place a number simply appeared. Each one
     reads its own text when it first comes into view, so whatever the
     language switch left there is what it counts to. */

  function initCounters() {
    var els = Array.prototype.slice.call(root.querySelectorAll('[data-count]'));
    if (!els.length) return;

    // "1 200" -> prefix "", digits "1 200", suffix ""; "−70%" -> "−", "70", "%"
    var split = function (text) {
      var m = text.match(/^(\D*?)([\d][\d   ]*)(.*)$/);
      if (!m) return null;
      var raw = m[2];
      var n = parseInt(raw.replace(/[^\d]/g, ''), 10);
      if (!isFinite(n)) return null;
      // keep whatever separator the copy used, at the same position
      var sep = raw.match(/[   ]/);
      return { pre: m[1], n: n, suf: m[3], sep: sep ? sep[0] : '', grouped: !!sep };
    };

    var render = function (p, v) {
      var s = String(v);
      if (p.grouped && s.length > 3) s = s.slice(0, s.length - 3) + p.sep + s.slice(s.length - 3);
      return p.pre + s + p.suf;
    };

    if (reduceMotion || !('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        o.unobserve(el);
        var parts = split((el.textContent || '').trim());
        if (!parts) return;
        var final = el.textContent;
        var start = performance.now();
        var step = function (now) {
          var t = Math.min(1, (now - start) / 1100);
          var e = 1 - Math.pow(1 - t, 3);
          el.textContent = render(parts, Math.round(parts.n * e));
          if (t < 1) requestAnimationFrame(step);
          else el.textContent = final;   // restore the exact original string
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });

    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---------- tile rows arrive in sequence ----------
     A row of eight cards landing as one block reads as a slab. The reveal
     moves onto the children, staggered, and capped so the last card is
     never more than a third of a second behind the first. */

  function initCascade() {
    root.querySelectorAll('[data-cascade]').forEach(function (row) {
      var kids = Array.prototype.slice.call(row.children);
      if (kids.length < 2) { row.setAttribute('data-reveal', '1'); return; }
      var stepMs = Math.min(60, Math.round(340 / kids.length));
      kids.forEach(function (kid, i) {
        if (kid.hasAttribute('data-reveal')) return;
        kid.setAttribute('data-reveal', '1');
        if (i) kid.setAttribute('data-reveal-d', String(i * stepMs));
      });
    });
  }

  /* ---------- the pointer spotlight ----------
     One delegated listener rather than eighty. The card only needs to know
     where the cursor is inside it; CSS paints the rest. */

  function initSpotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var current = null;
    document.addEventListener('pointermove', function (e) {
      var card = e.target.closest && e.target.closest('[data-spot]');
      if (!card) { current = null; return; }
      if (card !== current) current = card;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    }, { passive: true });
  }

  /* ---------- the hero strip tilts toward the pointer ----------
     One rect read per move, one style write per frame. The transition
     stays on while the values stream, so the card is always easing
     toward the cursor rather than snapped to it - the lag is the
     weight. Only the portrait cards tilt; the placeholder frames have
     their own hover life in styles.css. */

  function initTilt() {
    if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;
    root.querySelectorAll('[data-sym-strip]').forEach(function (strip) {
      Array.prototype.slice.call(strip.children).forEach(function (card) {
        if (!card.querySelector('img')) return;
        var raf = 0, rx = 0, ry = 0, on = false;
        var apply = function () {
          raf = 0;
          card.style.transform = on
            ? 'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
              ry.toFixed(2) + 'deg) scale(1.04)'
            : '';
        };
        card.addEventListener('pointerenter', function () {
          on = true;
          card.style.transition = 'transform .6s cubic-bezier(0.16, 1, 0.3, 1)';
          card.style.willChange = 'transform';
          card.style.zIndex = '2';
        });
        card.addEventListener('pointermove', function (e) {
          if (!on) return;
          var r = card.getBoundingClientRect();
          ry = ((e.clientX - r.left) / r.width - 0.5) * 14;
          rx = (0.5 - (e.clientY - r.top) / r.height) * 10;
          if (!raf) raf = requestAnimationFrame(apply);
        });
        card.addEventListener('pointerleave', function () {
          on = false;
          rx = ry = 0;
          if (!raf) raf = requestAnimationFrame(apply);
          window.setTimeout(function () {
            if (!on) { card.style.willChange = 'auto'; card.style.zIndex = ''; }
          }, 650);
        });
      });
    });
  }

  /* ---------- the AI answers arrive as a stream ----------
     Each bubble reads its own current text - whichever language the
     switch last wrote - empties itself when it scrolls into view, and
     streams the same string back at an uneven pace under a blinking
     caret. min-height holds the bubble's box while it is empty, so the
     chat column never reflows. If the language changes mid-stream the
     dictionary has already rewritten the node; the stream sees the flag
     and stands down without touching it. */

  function initTypewriter() {
    var els = ['cn.chat.a1', 'cn.chat.a2', 'cn.chat.a3'].map(function (k) {
      return root.querySelector('[data-i="' + k + '"]');
    }).filter(Boolean);
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;

    var stream = function (el, delay) {
      var full = el.textContent;
      var startLang = lang;
      el.style.minHeight = el.offsetHeight + 'px';
      el.textContent = '';
      el.classList.add('sym-typing');
      var i = 0, last = 0, t0 = performance.now() + delay;
      var step = function (now) {
        if (lang !== startLang) {
          el.classList.remove('sym-typing');
          el.style.minHeight = '';
          return;
        }
        if (now >= t0 && now - last > 16) {
          last = now;
          i = Math.min(full.length, i + 1 + Math.floor(Math.random() * 3));
          el.textContent = full.slice(0, i);
        }
        if (i < full.length) requestAnimationFrame(step);
        else {
          el.style.minHeight = '';
          window.setTimeout(function () { el.classList.remove('sym-typing'); }, 900);
        }
      };
      requestAnimationFrame(step);
    };

    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        o.unobserve(en.target);
        // the answers queue rather than talk over each other
        stream(en.target, els.indexOf(en.target) * 500);
      });
    }, { threshold: 0.55 });

    els.forEach(function (el) { obs.observe(el); });
  }

  /* ---------- the analytics bars stand up ----------
     The rects keep their markup geometry; scaleY from each bar's own
     baseline (fill-box) is the only thing that moves, staggered left to
     right with an elastic settle. Bars at scaleY(0) are only ever set
     where this same function can grow them back. */

  function initChart() {
    var rects = Array.prototype.slice.call(
      root.querySelectorAll('rect[fill="url(#symcn1)"], rect[fill="url(#symcn2)"]'));
    if (!rects.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var svg = rects[0].ownerSVGElement;
    if (!svg) return;

    rects.forEach(function (r) {
      r.style.transformBox = 'fill-box';
      r.style.transformOrigin = '50% 100%';
      r.style.transform = 'scaleY(0)';
    });

    var elastic = function (t) {
      return t >= 1 ? 1
        : Math.max(0, Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1);
    };

    var obs = new IntersectionObserver(function (entries, o) {
      if (!entries.some(function (en) { return en.isIntersecting; })) return;
      o.disconnect();
      rects.forEach(function (r, i) {
        var start = performance.now() + i * 90;
        var step = function (now) {
          var t = (now - start) / 900;
          if (t >= 1) { r.style.transform = 'scaleY(1)'; return; }
          if (t > 0) r.style.transform = 'scaleY(' + elastic(t).toFixed(4) + ')';
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.35 });

    obs.observe(svg);
  }

  /* ---------- the audit ticks ----------
     The hide-then-pop class pair is armed here, where the observer that
     fires it also lives: a page without JavaScript, or a visitor with
     reduced motion, never has the marks hidden at all. */

  function initChecks() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var items = [];
    ['as.c1', 'as.c2', 'as.c3', 'as.c4', 'as.c5'].forEach(function (k) {
      var t = root.querySelector('[data-i="' + k + '"]');
      var li = t && t.parentElement;
      if (li && li.firstElementChild !== t) items.push(li);
    });
    if (!items.length) return;
    items.forEach(function (li, i) {
      li.classList.add('sym-check-pop');
      li.style.setProperty('--symCheckD', (i * 90) + 'ms');
    });
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        o.unobserve(en.target);
        en.target.classList.add('sym-in');
      });
    }, { threshold: 0.6 });
    items.forEach(function (li) { obs.observe(li); });
  }

  /* ---------- park the unconditional loops while offscreen ----------
     The REC ping, the chat card's border laser and the AI-search beam
     never stop on their own. One observer parks each behind .sym-idle
     while its host is out of the viewport, so a reader three sections
     away is not paying for a laser they cannot see. */

  function initLoopGate() {
    if (!('IntersectionObserver' in window)) return;
    var hosts = Array.prototype.slice.call(
      root.querySelectorAll('[data-sym-strip] span[style*="#ff5a5a"]'));
    var a1 = root.querySelector('[data-i="cn.chat.a1"]');
    if (a1 && a1.parentElement && a1.parentElement.parentElement &&
        a1.parentElement.parentElement.parentElement) {
      hosts.push(a1.parentElement.parentElement.parentElement);
    }
    var field = root.querySelector('#aisearch [data-gridfield]');
    if (field) hosts.push(field);
    if (!hosts.length) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        en.target.classList.toggle('sym-idle', !en.isIntersecting);
      });
    }, { rootMargin: '80px 0px' });
    hosts.forEach(function (h) { obs.observe(h); });
  }

  /* ---------- boot ---------- */

  initCascade();
  initReveal();
  initCounters();
  initSpotlight();
  initTilt();
  initTypewriter();
  initChart();
  initChecks();
  initLoopGate();
  initScroll();
  initDials();
  initBars();
  initSlate();
  initFaq();

  // An explicit ?lang= is a deliberate request and outranks whatever this
  // browser stored last time; otherwise the hreflang alternates would do
  // nothing for a returning visitor.
  var initial = null;
  var q = new URLSearchParams(location.search).get('lang');
  if (q === 'en' || q === 'bg') initial = q;
  else { try { initial = localStorage.getItem('sym-lang'); } catch (e) { /* private mode */ } }
  if (initial === 'en') swap('en');
})();
