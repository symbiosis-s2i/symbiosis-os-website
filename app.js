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
      title: 'Symbiosis OS - AI платформа за бизнес растеж | 90+ AI модела в едно | Sell 2 Inspire',
      desc: 'Symbiosis OS обединява AI видео създаване (Synema), кампанийни страници с AI търсене, продажби, клиенти, оферти и проекти в една система. Над 90 AI модела без отделни абонаменти.'
    },
    en: {
      title: 'Symbiosis OS - the AI platform for business growth | 90+ AI models in one | Sell 2 Inspire',
      desc: 'Symbiosis OS brings AI video production (Synema), AI-search campaign pages, sales, clients, proposals and projects into one system. 90+ AI models, no extra subscriptions.'
    }
  };

  var lang = 'bg';
  // Set by the Synema slate: it copies the active step's words, so a language switch has to copy them again.
  var refreshSlate = null;

  // remember: false when the page picked the language itself (from the browser's language), so a guess is never
  // stored as if the visitor had chosen it. A click on BG or EN, or ?lang= in the address, is a choice.
  function swap(next, remember) {
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

    if (refreshSlate) refreshSlate();

    root.querySelectorAll('[data-sym-lang]').forEach(function (b) {
      var on = b.getAttribute('data-sym-lang') === next;
      b.style.background = on ? '#f6f6f9' : 'transparent';
      b.style.color = on ? '#08080a' : '#88889a';
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    if (remember !== false) {
      try { localStorage.setItem('sym-lang', next); } catch (e) { /* private mode */ }
    }
  }

  /* ---------- menu ---------- */

  var menu = root.querySelector('[data-sym-menu]');
  var burger = root.querySelector('[data-act="toggleMenu"]');
  var menuOpen = false;

  function setMenu(open) {
    if (!menu) return;
    menuOpen = open;
    menu.style.display = open ? 'flex' : 'none';
    // styles.css fades the panel in and brings its links up one after the other
    menu.classList.toggle('sym-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMenu() { setMenu(!menuOpen); }

  if (menu) {
    menu.setAttribute('aria-hidden', 'true');
    // the order the panel's links and buttons arrive in when it opens (styles.css)
    var menuNav = menu.querySelector('nav');
    if (menuNav) {
      var arriving = Array.prototype.slice.call(menuNav.children);
      for (var after = menuNav.nextElementSibling; after; after = after.nextElementSibling) arriving.push(after);
      arriving.forEach(function (el, i) {
        el.classList.add('sym-ml');
        el.style.setProperty('--i', String(i));
      });
    }
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

  // A click on BG or EN cross-fades the page into the other language where the browser can do it in one step
  // (View Transitions); everywhere else, and with reduced motion, the text simply changes.
  function choose(next) {
    if (next === lang) return;
    if (!reduceMotion && document.startViewTransition) document.startViewTransition(function () { swap(next); });
    else swap(next);
  }

  var ACTIONS = {
    setBG: function () { choose('bg'); },
    setEN: function () { choose('en'); },
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

    // A blur that eases off is the most expensive part of the reveal: every
    // frame repaints the whole element. A phone gets the rise and the fade,
    // which the compositor carries alone.
    var soft = !window.matchMedia('(hover: none), (max-width: 760px)').matches;

    // What the markup itself said. The reveal borrows these three properties
    // and has to hand them back: left in place, its transition replaced the
    // hover easing the design gave the cards, and a zero blur kept a layer
    // alive under every one of them.
    // styles.css has two entrance details of its own (the rule beside an
    // eyebrow drawing in, the hub waking up). They wait on .sym-arm and are
    // released by .sym-in, both set here, so they are only ever armed where
    // this observer can also fire them - and only on the elements concerned,
    // which keeps the browser from restyling the whole page for a class.
    var marked = function (el) {
      return el.hasAttribute('data-hub') || /\.eyebrow$/.test(el.getAttribute('data-i') || '');
    };

    var authored = [];
    els.forEach(function (el, i) {
      if (marked(el)) el.classList.add('sym-arm');
      if (el.hasAttribute('data-hub')) {
        Array.prototype.slice.call(el.querySelectorAll('li')).forEach(function (chip, n) {
          chip.classList.add('sym-chip');
          chip.style.setProperty('--i', String(n));
        });
      }
      authored[i] = { o: el.style.opacity, t: el.style.transform, f: el.style.filter, tr: el.style.transition };
      el.style.opacity = '0';
      el.style.transform = 'translateY(26px)';
      if (soft) el.style.filter = 'blur(6px)';
      el.style.willChange = soft ? 'opacity, transform, filter' : 'opacity, transform';
    });

    // Section headlines arrive word by word. The words are only wrapped for
    // the length of the entrance; afterwards the heading is plain text again,
    // so the language switch and the browser's own line balancing see what
    // they always saw.
    var words = function (el, d) {
      var text = el.textContent;
      var parts = text.split(/(\s+)/);
      if (parts.length < 5 || parts.length > 60) return false;
      var height = el.offsetHeight;
      var frag = document.createDocumentFragment();
      var n = 0;
      parts.forEach(function (part) {
        if (!part) return;
        // the space as written: a non-breaking one has to stay non-breaking
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span');
        w.className = 'sym-w';
        w.style.animationDelay = (d + n * 42) + 'ms';
        w.textContent = part;
        frag.appendChild(w);
        n++;
      });
      el.textContent = '';
      el.appendChild(frag);
      // Wrapped words can break lines differently from plain text (the
      // browser balances a heading's lines as a whole). Where they do, the
      // heading keeps its plain text and arrives as one block instead.
      if (el.offsetHeight !== height) { el.textContent = text; return false; }
      window.setTimeout(function () {
        // a language switch in the meantime has already written plain text
        if (el.querySelector('.sym-w')) el.textContent = el.textContent;
      }, d + n * 42 + 900);
      return true;
    };

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var was = authored[els.indexOf(el)];
        var d = parseInt(el.getAttribute('data-reveal-d') || '0', 10);
        obs.unobserve(el);
        if (marked(el)) el.classList.add('sym-in');

        // word by word where there is a pointer and room: a phone gets the
        // heading as one block, which is one layer instead of a dozen
        if (soft && el.tagName === 'H2' && words(el, d)) {
          // the words carry the entrance; the heading itself just stops hiding
          el.style.opacity = was.o;
          el.style.transform = was.t;
          el.style.filter = was.f;
          el.style.willChange = '';
          return;
        }

        el.style.transition =
          'opacity .8s cubic-bezier(.2,.7,.2,1) ' + d + 'ms, ' +
          'transform .9s cubic-bezier(.2,.7,.2,1) ' + d + 'ms' +
          (soft ? ', filter .8s ease ' + d + 'ms' : '');
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        if (soft) el.style.filter = 'blur(0px)';
        // willChange is a promise to the compositor, not a decoration -
        // leaving it set on 110 elements keeps 110 layers alive. The same
        // goes for the borrowed properties: once the entrance has landed the
        // element is exactly as the markup wrote it. The authored
        // transition goes back two frames after the values do: returned
        // together, a card whose design eases its transform would start a
        // third of a second of transition from "moved by nothing" to "not
        // moved" - invisible, and restyled on every frame of it.
        window.setTimeout(function () {
          el.style.transition = 'none';
          el.style.opacity = was.o;
          el.style.transform = was.t;
          el.style.filter = was.f;
          el.style.willChange = '';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { el.style.transition = was.tr; });
          });
        }, 1000 + d);
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

  /* ---------- chart day labels stay readable when the chart shrinks ---------- */

  // The views chart is an SVG that scales with its card, and its day labels
  // scale with it: on a phone they came out at about 5px. Here they keep at
  // least 11px on screen, and the chart grows a little taller to hold them.
  // Where the chart is at least its natural width, the labels keep their size.
  function initChartLabels() {
    var svg = root.querySelector('[data-chart-days]');
    var g = svg && svg.querySelector('[data-chart-labels]');
    if (!g) return;
    var texts = Array.prototype.slice.call(g.querySelectorAll('text'));
    var fit = function () {
      var w = svg.getBoundingClientRect().width;
      if (!w) return;
      var size = Math.min(24, Math.max(11, 11 * 600 / w));
      if (size <= 11.01) {
        g.setAttribute('font-size', '11');
        texts.forEach(function (t) { t.setAttribute('y', '158'); });
        svg.setAttribute('viewBox', '0 0 600 163');
        return;
      }
      var baseline = Math.round(150 + size + 4);
      g.setAttribute('font-size', size.toFixed(1));
      texts.forEach(function (t) { t.setAttribute('y', String(baseline)); });
      // room under the baseline for letters that dip below it (р, у)
      svg.setAttribute('viewBox', '0 0 600 ' + Math.ceil(baseline + size * 0.32));
    };
    fit();
    window.addEventListener('resize', fit);
  }

  /* ---------- Synema slate: sticky card follows the active step ---------- */

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

    // The card shows one step's words at a time, and the steps are not the
    // same length. On a phone, where the card sits above the list instead of
    // beside it, every change resized it and moved the page under the
    // reader's thumb. It now reserves the height of its longest step, measured
    // with the words actually in use, again after a language switch or resize.
    var fit = function () {
      [[title, '[data-step-title]'], [body, '[data-step-body]']].forEach(function (pair) {
        var node = pair[0];
        var shown = node.textContent;
        var tallest = 0;
        node.style.minHeight = '';
        steps.forEach(function (st) {
          var src = st.querySelector(pair[1]);
          if (!src) return;
          node.textContent = src.textContent;
          tallest = Math.max(tallest, node.offsetHeight);
        });
        node.textContent = shown;
        if (tallest) node.style.minHeight = tallest + 'px';
      });
    };

    setActive(0);
    fit();
    // measured again once the webfonts are in: the fallback face sets wider
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    var fitTimer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(fitTimer);
      fitTimer = window.setTimeout(fit, 180);
    });
    refreshSlate = function () {
      var i = active;
      active = -1;
      setActive(i < 0 ? 0 : i);
      fit();
    };
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
      d.classList.add('sym-faq');   // styles.css: the answer opens smoothly
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
    // A mouse reports far more often than the screen refreshes; the card is
    // measured and written once per frame, with the last position seen.
    var card = null, x = 0, y = 0, raf = 0;
    var paint = function () {
      raf = 0;
      if (!card) return;
      var r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      card.style.setProperty('--mx', ((x - r.left) / r.width * 100).toFixed(1) + '%');
      card.style.setProperty('--my', ((y - r.top) / r.height * 100).toFixed(1) + '%');
    };
    document.addEventListener('pointermove', function (e) {
      card = e.target.closest ? e.target.closest('[data-spot]') : null;
      if (!card) return;
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
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
    // the AI-search audit, then the ticks of the Symbiosis OS card in the comparison
    [['as.c1', 'as.c2', 'as.c3', 'as.c4', 'as.c5'],
     ['cmp.d2.l1', 'cmp.d2.l2', 'cmp.d2.l3', 'cmp.d2.l4', 'cmp.d2.l5', 'cmp.d2.l6', 'cmp.d2.l7', 'cmp.d2.l8']
    ].forEach(function (group) {
      var n = 0;
      group.forEach(function (k) {
        var t = root.querySelector('[data-i="' + k + '"]');
        var li = t && t.parentElement;
        if (!li || li.firstElementChild === t) return;
        li.classList.add('sym-check-pop');
        li.style.setProperty('--symCheckD', (n++ * 90) + 'ms');
        items.push(li);
      });
    });
    if (!items.length) return;
    var obs = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        o.unobserve(en.target);
        en.target.classList.add('sym-in');
      });
    }, { threshold: 0.6 });
    items.forEach(function (li) { obs.observe(li); });
  }

  /* ---------- the header shows where you are ----------
     One observer with a hairline root across the middle of the screen: the
     section that line is inside is the current one. Sections the header has
     no link for count toward the last one that does, so the marker never
     goes dark halfway down the page. */

  function initNavSpy() {
    var nav = root.querySelector('[data-sym-nav] nav');
    var main = root.querySelector('main');
    if (!nav || !main || !('IntersectionObserver' in window)) return;
    var links = {};
    Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')).forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
      a.classList.add('sym-navl');
    });
    var owner = new Map();
    var last = null;
    Array.prototype.slice.call(main.children).forEach(function (sec) {
      if (sec.tagName !== 'SECTION') return;
      if (sec.id && links[sec.id]) last = sec.id;
      owner.set(sec, last);
    });
    var current = null;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = owner.get(en.target) || null;
        if (id === current) return;
        if (current && links[current]) links[current].removeAttribute('aria-current');
        current = id;
        if (id && links[id]) links[id].setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    owner.forEach(function (id, sec) { obs.observe(sec); });
  }

  /* ---------- things that switch on once, when they reach the reader ----------
     The six process steps light their number and run their connector as each
     one comes up the screen; the "usual stack" in the comparison is crossed
     out line by line. Both are a class added once - styles.css does the
     drawing - and both are armed only where this observer can run, so a page
     without JavaScript, or a visitor who asked for no motion, sees every step
     lit and nothing crossed out. */

  function initOnce() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    var arm = function (els, margin, threshold) {
      if (!els.length) return;
      var obs = new IntersectionObserver(function (entries, o) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          o.unobserve(en.target);
          en.target.classList.add('sym-on');
        });
      }, { rootMargin: margin, threshold: threshold });
      els.forEach(function (el) { obs.observe(el); });
    };

    var steps = Array.prototype.slice.call(root.querySelectorAll('#process ol > li'));
    steps.forEach(function (li) {
      var rail = li.firstElementChild;
      var num = rail && rail.firstElementChild;
      var line = rail && rail.lastElementChild;
      if (!num || !line || num === line) return;
      li.classList.add('sym-step');
      num.classList.add('sym-step-n');
      line.classList.add('sym-step-l');
    });
    arm(steps, '0px 0px -32% 0px', 0.2);

    var first = root.querySelector('[data-i="cmp.d1.l1"]');
    var list = first && first.closest('ul');
    if (list) {
      Array.prototype.slice.call(list.querySelectorAll('[data-i^="cmp.d1.l"]')).forEach(function (tool, n) {
        tool.classList.add('sym-x');
        tool.style.setProperty('--i', String(n));
      });
      arm([list], '0px 0px -12% 0px', 0.45);
    }
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
    // The two marquee belts and the three "live" dots loop for as long as
    // the page is open. Each dot is a box-shadow animation - a style pass
    // and a repaint on every frame - and they were running at the bottom of
    // the page while the reader was at the top.
    Array.prototype.slice.call(root.querySelectorAll('[style*="symMarq"], span[style*="symPulse"]'))
      .forEach(function (el) { if (hosts.indexOf(el) < 0) hosts.push(el); });
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
  initNavSpy();
  initOnce();
  initScroll();
  initDials();
  initBars();
  initSlate();
  initChartLabels();
  initFaq();

  // The Synema section was #cinema before the module was renamed. Links shared with the old name still land on it,
  // whether the page opens with one or a link on it changes the address.
  function followOldAnchor() {
    if (location.hash !== '#cinema') return;
    var synema = document.getElementById('synema');
    if (!synema) return;
    history.replaceState(null, '', '#synema');
    synema.scrollIntoView();
  }
  followOldAnchor();
  window.addEventListener('hashchange', followOldAnchor);

  // The opening language is decided by the script at the top of index.html
  // (so the page never flashes the wrong one): ?lang= in the address, then
  // the visitor's last choice, then the browser's language. A ?lang= outranks
  // what the browser stored, or the hreflang alternates would do nothing for
  // a returning visitor.
  var initial = window.__symLang;
  if (initial !== 'en' && initial !== 'bg') {
    // The head script is missing or did not run: fall back to the old rule.
    initial = null;
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'bg') initial = q;
    else { try { initial = localStorage.getItem('sym-lang'); } catch (e) { /* private mode */ } }
  }
  if (initial === 'en') swap('en', !window.__symLangAuto);

  // Text is in place: show the page.
  document.documentElement.classList.add('sym-ready');
  document.documentElement.removeAttribute('data-boot');
})();
