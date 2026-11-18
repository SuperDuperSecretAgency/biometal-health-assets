/* Technology 04 · What zinc brings to an implant. Round 3 (28 Sep).                   -z1n
   Five x-ray columns. One opens at a time: on hover (after a short rest, so sweeping across the row
   doesn't flicker), on keyboard focus, or on a tap. Opening widens it and fades in its lines.
   Each column's header is a button with aria-expanded; every line stays in the DOM for screen readers.
   Nothing moves on its own and nothing loops. Reduced motion: the same states, instantly. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('tech-properties', {
    film: window.BMH.look === 'light' ? 'light' : 'dark',
                        // 'light': the site's light films, dark type. 'dark': the Opportunity hero's dark films under a navy scrim,
                        // white type. Default: 'dark' on the main site (Andrew's pick, 28 Sep), 'light' in the light look
    start: 'even',      // on arrival: 'even' = five equal columns. 'first' = "Fights infection" already open
    rest: 'even',       // when the pointer or focus leaves the row: 'even' = back to equal. 'last' = the last one stays open
    grow: 2.4,          // how wide the open column is, against 1 for each of the others (desktop)
    duration: 0.55,     // seconds the widening takes
    textDelay: 0.14,    // seconds after the widening starts before the lines fade in
    hoverDelay: 90,     // milliseconds the pointer rests on a column before it opens
    words: 'foot',      // desktop: 'top' = headers along the top of the films. 'foot' = along the bottom
    width: 'bleed',     // desktop: 'bleed' = edge to edge, like the Opportunity hero. 'wrap' = inside the page margins
    height: 0.78,       // desktop: the row's height, as a share of the screen (held between 560 and 820 px)
    edge: 'hard',       // 'hard': the films end on a straight line. 'soft': their far edge fades into the page too
    cue: 'phone'        // the small plus in each header: 'phone' = on stacked bands only. 'always'. 'none'
  });

  var BMH = window.BMH;
  var root = document.getElementById('s-tech-properties');
  if (!root || !BMH) return;
  var row = root.querySelector('.tp-row');
  var cols = Array.prototype.slice.call(root.querySelectorAll('.tp-col'));
  var btns = cols.map(function (c) { return c.querySelector('.tp-btn'); });
  if (!row || !cols.length) return;

  // ---- the look ----
  if (KNOBS.film === 'dark') root.setAttribute('data-film', 'dark');
  if (KNOBS.width === 'wrap') root.setAttribute('data-width', 'wrap');
  root.setAttribute('data-words', KNOBS.words === 'foot' ? 'foot' : 'top');
  root.setAttribute('data-edge', KNOBS.edge === 'soft' ? 'soft' : 'hard');
  root.setAttribute('data-cue', KNOBS.cue);
  root.style.setProperty('--tp-grow', String(KNOBS.grow));
  root.style.setProperty('--tp-dur', KNOBS.duration + 's');
  root.style.setProperty('--tp-delay', KNOBS.textDelay + 's');
  root.style.setProperty('--tp-row-h', 'clamp(560px, ' + (KNOBS.height * 100) + 'vh, 820px)');
  if (BMH.reduced) root.classList.add('is-still');
  row.classList.add('is-js');

  // ---- state: which column is open (-1 = none, all equal) ----
  var open = -1;
  function set(i) {
    if (i === open) return;
    open = i;
    cols.forEach(function (c, k) {
      var on = k === i;
      c.classList.toggle('is-open', on);
      btns[k].setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    row.classList.toggle('has-open', i >= 0);
  }
  function rest() { if (KNOBS.rest !== 'last') set(-1); }

  // ---- pointer: a mouse opens on hover; touch and pen toggle on tap ----
  var timer = 0, lastPointer = 'mouse', inside = false;
  cols.forEach(function (c, i) {
    c.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      inside = true;
      clearTimeout(timer);
      timer = setTimeout(function () { set(i); }, KNOBS.hoverDelay);
    });
    c.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType || 'mouse'; });
    // a click anywhere in the column counts as its button
    c.addEventListener('click', function (e) {
      var keyboard = e.detail === 0 && e.target === btns[i];   // Enter or Space on the button
      if (keyboard || lastPointer !== 'mouse') set(open === i ? -1 : i);
      else set(i);                                            // a mouse click keeps what hover opened
    });
  });
  row.addEventListener('pointerleave', function (e) {
    if (e.pointerType !== 'mouse') return;
    inside = false;
    clearTimeout(timer);
    if (!row.contains(document.activeElement) || !root.matches(':has(.tp-btn:focus-visible)')) rest();
  });

  // ---- keyboard: focus opens (so Tab walks the five), Escape closes, leaving the row rests ----
  btns.forEach(function (b, i) {
    b.addEventListener('focus', function () { if (b.matches(':focus-visible')) set(i); });
  });
  row.addEventListener('focusout', function (e) {
    if (!row.contains(e.relatedTarget) && !inside) rest();
  });
  row.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open >= 0) set(-1);
  });

  // ---- measure: the tallest header and the tallest set of lines, so the words sit on one line
  //      across the row and never move when a column opens (desktop only) ----
  var measured = '';
  function measure() {
    var stacked = getComputedStyle(root).getPropertyValue('--tp-stacked').trim() === '1';
    var key = root.clientWidth + 'x' + window.innerHeight + (stacked ? 's' : 'd');
    if (key === measured) return;
    measured = key;
    if (stacked) return;
    var head = 0, more = 0;
    cols.forEach(function (c) {
      head = Math.max(head, c.querySelector('.tp-h').offsetHeight);
      more = Math.max(more, c.querySelector('.tp-more p').offsetHeight);
    });
    if (head) root.style.setProperty('--tp-head-h', head + 'px');
    if (more) root.style.setProperty('--tp-more-h', more + 'px');
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measured = ''; measure(); });
  var queued = false;
  function queue() { if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; measure(); }); } }
  if ('ResizeObserver' in window) new ResizeObserver(queue).observe(root);
  else window.addEventListener('resize', queue);

  set(KNOBS.start === 'first' ? 0 : -1);
  if (open < 0) btns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
})();
