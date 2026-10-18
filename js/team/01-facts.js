/* About, direction 2 · 01 facts. Two things move, and only when something changes.                 -z1n

   1. The link. Point at a face (mouse, keyboard focus, or a tap) and that person's universities and
      companies turn --brand-mid in the bar while the rest pale; point at a mark and its people come up
      while the rest pale. It reaches the wider team and the advisors in 02-people too (their rows carry
      the same data-marks), so Boston University finds Neil Frings. A click or tap pins it; a second
      tap, a tap elsewhere or Escape lets it go. Colour only, never position.
   2. The totals' arrival, once, when the column first comes into view (knob: totals).
      'still'  nothing moves; the stillness is the fact sheet's point.
      'settle' each rule draws, then its figure and word ink in, one cell after the next (CSS).
      'count'  the figures count up from zero.
      The inline script in section.html arms it before the first paint. Reduced motion shows the
      settled frame and the link changes instantly.
   Optional, off by default: 'tour' walks the link across the five once, after the totals land, so a
   first-time visitor sees what the bar does. It stops the moment anyone points at anything.

   Review hooks (not used by the page): BMH.ta2Facts.replay() plays the arrival again;
   BMH.ta2Facts.link('person' | 'mark', id) shows one link, link(null) clears it. */
(function () {
  'use strict';

  const KNOBS = window.BMH.knobs('ta2-facts', {
    totals: 'count',    // 'still' | 'count' | 'settle'. Keep in step with data-totals in section.html.
    delayMs: 250,       // after the column comes into view, before the arrival starts
    countMs: 1400,      // 'count': how long each figure takes to reach its number
    staggerMs: 120,     // 'count': one cell after the next (settle's own stagger is in the CSS, 120 ms)
    trigger: 0.35,      // share of the totals column on screen before it arrives
    tour: 'off',        // 'off' | 'once': walk the link across the five, once, after the totals land
    tourStepMs: 900,    // 'once': how long each person's link shows
    tourAfterMs: 700,   // 'once': the pause between the totals landing and the first step
    dimFaces: 0.34,     // the link: how much of a face that isn't linked stays (1 = no fade), greyed as well
    dimMarks: 15        // the link: how much of a mark that isn't linked stays, as % of its ink (100 = no fade)
  });

  const BMH = window.BMH;
  const sec = document.getElementById('s-ta2-facts');
  if (!sec) return;
  sec.style.setProperty('--dim-face', String(KNOBS.dimFaces));
  sec.style.setProperty('--dim-mix', KNOBS.dimMarks + '%');

  /* ============================================================ the link */
  const people = Array.prototype.slice.call(document.querySelectorAll('[data-ta2-person]'));
  const marks = Array.prototype.slice.call(sec.querySelectorAll('[data-ta2-mark]'));
  const markOf = {}, peopleOf = {};
  marks.forEach(function (m) { peopleOf[m.getAttribute('data-ta2-mark')] = []; });
  people.forEach(function (p) {
    const id = p.getAttribute('data-ta2-person');
    markOf[id] = (p.getAttribute('data-marks') || '').split(/\s+/).filter(function (k) { return k && peopleOf[k]; });
    markOf[id].forEach(function (k) { peopleOf[k].push(id); });
  });

  let pinned = null, hover = null, touring = false;
  const same = function (a, b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; };

  function render() {
    const a = hover || pinned;
    const onP = {}, onM = {};
    if (a && a.kind === 'person') { onP[a.id] = 1; markOf[a.id].forEach(function (k) { onM[k] = 1; }); }
    if (a && a.kind === 'mark') { onM[a.id] = 1; peopleOf[a.id].forEach(function (id) { onP[id] = 1; }); }
    people.forEach(function (p) {
      const id = p.getAttribute('data-ta2-person');
      if (!a) p.removeAttribute('data-state');
      else p.setAttribute('data-state', onP[id] ? 'on' : 'off');
      const b = p.querySelector('button');
      if (b) b.setAttribute('aria-pressed', pinned && pinned.kind === 'person' && pinned.id === id ? 'true' : 'false');
    });
    marks.forEach(function (m) {
      const id = m.getAttribute('data-ta2-mark');
      if (!a) m.removeAttribute('data-state');
      else m.setAttribute('data-state', onM[id] ? 'on' : 'off');
      const b = m.querySelector('button');
      if (b) b.setAttribute('aria-pressed', pinned && pinned.kind === 'mark' && pinned.id === id ? 'true' : 'false');
    });
  }

  function target(el) {
    const p = el.closest('[data-ta2-person]');
    if (p) return { kind: 'person', id: p.getAttribute('data-ta2-person'), el: p };
    const m = el.closest('[data-ta2-mark]');
    if (m) return { kind: 'mark', id: m.getAttribute('data-ta2-mark'), el: m };
    return null;
  }
  /* a person with no mark in the bar (Diane, Garett, three of the advisors) has nothing to show */
  function links(t) { return t && (t.kind === 'mark' || markOf[t.id].length > 0); }

  function stopTour() { if (touring) { touring = false; hover = null; } }

  people.concat(marks).forEach(function (el) {
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;          // a tap is a click, below
      const t = target(el);
      stopTour();
      hover = links(t) ? t : null;
      render();
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') return;
      if (hover && hover.el === el) { hover = null; render(); }
    });
  });
  /* keyboard: focus shows the link, like pointing */
  sec.addEventListener('focusin', function (e) {
    const t = target(e.target);
    if (!t) return;
    stopTour();
    hover = t;
    render();
  });
  sec.addEventListener('focusout', function (e) {
    if (!e.relatedTarget || !sec.contains(e.relatedTarget)) { hover = null; render(); }
  });
  /* click, tap, Enter, Space: pin it, or let it go */
  sec.addEventListener('click', function (e) {
    const t = target(e.target);
    if (!t) return;
    stopTour();
    pinned = same(pinned, t) ? null : t;
    if (e.pointerType === 'touch' || e.detail === 0) hover = null;   // touch and keys have no hover to fall back to
    if (!pinned && hover && same(hover, t) && e.detail !== 0) hover = null;
    render();
  });
  document.addEventListener('pointerdown', function (e) {
    if (!pinned || target(e.target)) return;
    pinned = null; render();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (pinned || hover)) { pinned = null; hover = null; stopTour(); render(); }
  });

  /* ============================================================ the totals' arrival */
  const totals = sec.querySelector('.ta2-totals');
  const nums = Array.prototype.slice.call(sec.querySelectorAll('.ta2-total__n'));
  const fmt = function (n, v) {
    const dp = +(n.getAttribute('data-dp') || 0);
    return (n.getAttribute('data-pre') || '') + v.toFixed(dp) + (n.getAttribute('data-post') || '');
  };
  let played = false, timers = [];

  function settleAll() {
    nums.forEach(function (n) { n.textContent = fmt(n, +n.getAttribute('data-to')); });
    sec.setAttribute('data-arrive', 'done');
  }

  function count() {
    const t0 = performance.now() + 16;
    function frame(now) {
      let busy = false;
      nums.forEach(function (n, i) {
        const t = (now - t0 - i * KNOBS.staggerMs) / KNOBS.countMs;
        const to = +n.getAttribute('data-to'), dp = +(n.getAttribute('data-dp') || 0);
        let v = to * BMH.ease(t);
        v = dp ? Math.ceil(v * Math.pow(10, dp) - 1e-9) / Math.pow(10, dp) : Math.ceil(v - 1e-9);   // up, so a 1 never sits at 0
        if (t >= 1) v = to; else busy = true;
        n.textContent = fmt(n, Math.max(0, v));
      });
      if (busy) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* how long the arrival takes, so the tour (if on) waits for it */
  function arrivalMs() {
    if (KNOBS.totals === 'count') return KNOBS.countMs + (nums.length - 1) * KNOBS.staggerMs;
    if (KNOBS.totals === 'settle') return (nums.length - 1) * 120 + 380 + 900;
    return 0;
  }

  function arrive() {
    if (played) return;
    played = true;
    timers.push(setTimeout(function () {
      if (KNOBS.totals === 'settle') sec.setAttribute('data-arrive', 'in');
      else if (KNOBS.totals === 'count') { sec.setAttribute('data-arrive', 'in'); count(); }
      if (KNOBS.tour === 'once') timers.push(setTimeout(tour, arrivalMs() + KNOBS.tourAfterMs));
    }, KNOBS.delayMs));
  }

  function tour() {
    if (hover || pinned) return;
    const five = people.filter(function (p) { return sec.contains(p); });
    let i = 0;
    touring = true;
    (function step() {
      if (!touring) return;
      if (i >= five.length) { touring = false; hover = null; render(); return; }
      hover = { kind: 'person', id: five[i].getAttribute('data-ta2-person'), el: null };
      render();
      i++;
      timers.push(setTimeout(step, KNOBS.tourStepMs));
    })();
  }

  sec.setAttribute('data-totals', KNOBS.totals);
  const armed = sec.getAttribute('data-arrive') === 'armed';
  if (BMH.reduced || !armed || (KNOBS.totals !== 'count' && KNOBS.totals !== 'settle')) {
    settleAll();
    played = true;
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (es) {
      if (es[0].intersectionRatio >= KNOBS.trigger || es[0].intersectionRect.height > window.innerHeight * 0.5) {
        io.disconnect();
        arrive();
      }
    }, { threshold: [0, KNOBS.trigger, 0.6, 1] });
    io.observe(totals);
  } else arrive();

  BMH.ta2Facts = {
    replay: function () {
      timers.forEach(clearTimeout); timers = [];
      touring = false; hover = null; pinned = null; render();
      if (BMH.reduced || KNOBS.totals === 'still') return;
      sec.setAttribute('data-arrive', 'armed');
      if (KNOBS.totals === 'count') nums.forEach(function (n) { n.textContent = fmt(n, 0); });
      void sec.offsetWidth;          // let the armed state land before the arrival starts
      played = false;
      arrive();
    },
    link: function (kind, id) {
      stopTour();
      hover = kind ? { kind: kind, id: id, el: null } : null;
      render();
    }
  };
})();
