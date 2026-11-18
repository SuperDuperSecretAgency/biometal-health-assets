/* Research 01 · Read it yourself: the wall sorts itself.                              -z1n
   Scroll timeline, measured from the top of the page:
     1. focus  the wall arrives as the homepage's (blurred, faded, a little close), and pulls back
               into sharp focus while the opener copy scrolls away and the stage pins.
     2. hold   the sharp wall, still scattered.
     3. sort   one page at a time lifts, straightens and files into its column; each property name
               appears as its first page lands.
     4. hold   the five columns, sorted. Then the page scrolls on into 03-by-property.
   Every frame is a function of scroll position, so it reverses on the way up and stops when the
   scroll stops. The sorted layout is plain CSS; this file only offsets pages from it (FLIP), so at
   the end of the sort every page is untransformed, unfiltered and fully opaque.
   Reduced motion: no pin and no motion, just the sorted columns, sharp. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('res-wall', {
    focus: 0.55,        // viewport heights of scroll after the pin before the wall is sharp
    hold: 0.35,         // viewport heights the sharp, scattered wall holds before the sort
    sort: 2.0,          // viewport heights the sort takes, first page lifting to last page landing
    endHold: 0.4,       // viewport heights the sorted columns hold before the page scrolls on
    travel: 0.24,       // share of the sort each page spends in flight (bigger = more pages moving at once)
    order: 'column',    // 'column' files one column at a time, left to right; 'deal' deals one page to each column in turn
    lift: 0.07,         // how much a page grows mid-flight, as it lifts off the wall
    zoom: 1.12,         // on arrival the wall sits this much closer; it pulls back to 1 as it focuses
    blurNear: 0.065,    // arrival blur on the nearest pages, in vw (the homepage's values)
    blurFar: 0.3,       // arrival blur on the farthest pages, in vw
    blurNearNarrow: 0.18, // the same two on phones
    blurFarNarrow: 0.7,
    fadeNear: 0.16,     // arrival fade toward the ground, nearest pages, 0..1 (homepage)
    fadeFar: 0.52,      // arrival fade, farthest pages
    minShow: 0.17,      // least share of each filed page that shows in its column
    maxShow: 0.36,      // most share of each filed page that shows in its column
    evenSteps: false,   // true: every column cascades at the fullest column's step (a tidier grid, less of each page)
    leaveOut: ['xia-2025', 'liao-2020', 'guo-2025', 'alker-2018']   // not zinc-implant papers (magnesium, PEEK, titanium, nutrition); off the wall and the list
  });

  var BMH = window.BMH;
  var sec = document.getElementById('s-res-wall');
  if (!sec || !BMH) return;

  var track = sec.querySelector('.wall__track');
  var stage = sec.querySelector('.wall__stage');
  var cols = [].slice.call(sec.querySelectorAll('.wall__col'));
  var names = cols.map(function (c) { return c.querySelector('.wall__name'); });

  // pages the knobs leave out go before anything is measured
  (KNOBS.leaveOut || []).forEach(function (id) {
    var f = sec.querySelector('.wall__page[data-id="' + id + '"]');
    if (f && f.parentNode) f.parentNode.parentNode.removeChild(f.parentNode);
  });

  var narrowMq = window.matchMedia('(max-width: 700px)');
  var RATIO = 990 / 700;          // the tallest first page (alker, guo, liao), height / width

  /* ---- size the sorted layout to the viewport ---- */
  function size() {
    var narrow = narrowMq.matches;
    var vh = window.innerHeight;
    var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
    var padT = parseFloat(getComputedStyle(stage).paddingTop) || 0;
    var padB = parseFloat(getComputedStyle(stage).paddingBottom) || 0;
    var gap = parseFloat(getComputedStyle(names[0]).marginBottom) || 0;
    var counts = cols.map(function (c) { return c.querySelectorAll('.wall__slot').length; });
    var most = Math.max.apply(null, counts);
    var avail = vh - navH - padT - padB;

    sec.style.removeProperty('--name-h');
    if (!narrow) {
      var nameH = 0;
      names.forEach(function (n) { nameH = Math.max(nameH, n.offsetHeight); });
      sec.style.setProperty('--name-h', nameH + 'px');
      var colW = cols[0].clientWidth;
      var h = avail - nameH - gap;                               // room for the tallest cascade
      var pw = Math.min(colW, h / (1 + (most - 1) * KNOBS.minShow) / RATIO);
      pw = Math.max(pw, Math.min(colW, 90));
      var ph = pw * RATIO;
      sec.style.setProperty('--pw', pw.toFixed(1) + 'px');
      // even: every column steps like the fullest one; otherwise a shorter column opens up and shows more of each page
      cols.forEach(function (c, ci) {
        var n = KNOBS.evenSteps ? most : counts[ci];
        var step = n > 1 ? (h - ph) / (n - 1) : ph;
        step = BMH.clamp(step, ph * KNOBS.minShow, ph * KNOBS.maxShow);
        c.style.setProperty('--step', step.toFixed(1) + 'px');
      });
    } else {
      var rowGap = 14, nameHn = names[0].offsetHeight;
      var row = (avail - rowGap * (cols.length - 1)) / cols.length - nameHn - gap;
      var cw = cols[0].clientWidth;
      var pwn = Math.min(row / RATIO, cw / (1 + (most - 1) * 0.55));
      pwn = Math.max(pwn, 44);
      var stepx = most > 1 ? Math.min(pwn + 6, (cw - pwn) / (most - 1)) : pwn;
      sec.style.setProperty('--row-gap', rowGap + 'px');
      sec.style.setProperty('--pw', pwn.toFixed(1) + 'px');
      sec.style.setProperty('--stepx', stepx.toFixed(1) + 'px');
    }
    return { vh: vh, navH: navH };
  }

  var pages = [].slice.call(sec.querySelectorAll('.wall__page')).map(function (el) {
    var cs = el.style;
    function v(n, fb) { var x = parseFloat(cs.getPropertyValue(n)); return isNaN(x) ? fb : x; }
    var col = cols.indexOf(el.closest('.wall__col'));
    var slots = [].slice.call(el.closest('.wall__list').children);
    return {
      el: el, img: el.querySelector('img'), col: col, slot: slots.indexOf(el.parentNode),
      x: v('--x', 50), y: v('--y', 50), w: v('--w', 14), r: v('--r', 0), d: v('--d', 0.5),
      mx: v('--mx', v('--x', 50)), my: v('--my', v('--y', 50)), mw: v('--mw', 36), mr: v('--mr', v('--r', 0)),
      sx: 0, sy: 0, sw: 1, start: 0
    };
  });

  if (BMH.reduced) {
    sec.classList.add('is-static');
    size();
    window.addEventListener('resize', size);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    return;
  }

  /* the filing order: column by column, or dealt round the columns */
  (function orderPages() {
    var seq = pages.slice();
    if (KNOBS.order === 'deal') seq.sort(function (a, b) { return a.slot - b.slot || a.col - b.col; });
    else seq.sort(function (a, b) { return a.col - b.col || a.slot - b.slot; });
    var n = seq.length, travel = BMH.clamp(KNOBS.travel, 0.05, 1);
    var stagger = n > 1 ? (1 - travel) / (n - 1) : 0;
    seq.forEach(function (p, i) { p.start = i * stagger; });
    pages.travel = travel;
    cols.forEach(function (c, ci) {
      var first = seq.filter(function (p) { return p.col === ci; })[0];
      c._first = first ? first.start : 0;
    });
  })();

  sec.classList.add('is-live');

  var geo = null, last = '';
  function measure() {
    var m = size();
    pages.forEach(function (p) { p.el.style.transform = 'none'; p.el.style.filter = ''; });
    var sr = stage.getBoundingClientRect();
    pages.forEach(function (p) {
      var r = p.el.getBoundingClientRect();
      p.sx = r.left - sr.left + r.width / 2;
      p.sy = r.top - sr.top + r.height / 2;
      p.sw = r.width || 1;
    });
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var pinLen = (KNOBS.focus + KNOBS.hold + KNOBS.sort + KNOBS.endHold) * m.vh;
    track.style.height = (sh + pinLen) + 'px';
    geo = {
      vh: m.vh, vw: window.innerWidth, navH: m.navH, sw: sw, sh: sh,
      ref: Math.min(sw, sh * 1.75),
      pinAt: track.offsetTop - m.navH          // scroll into the section at which the stage pins
    };
    last = '';
  }

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function frame() {
    if (!geo) return;
    var s = -sec.getBoundingClientRect().top;                  // scroll into the section
    var vh = geo.vh;
    var fEnd = Math.max(1, geo.pinAt + KNOBS.focus * vh);
    var f = BMH.smooth(0, 1, s / fEnd);                        // 0 arrival .. 1 sharp
    var sortAt = geo.pinAt + (KNOBS.focus + KNOBS.hold) * vh;
    var q = BMH.clamp((s - sortAt) / (KNOBS.sort * vh), 0, 1); // 0 scattered .. 1 sorted
    var key = f.toFixed(4) + '|' + q.toFixed(4);
    if (key === last) return;
    last = key;

    var narrow = narrowMq.matches;
    var bNear = narrow ? KNOBS.blurNearNarrow : KNOBS.blurNear;
    var bFar = narrow ? KNOBS.blurFarNarrow : KNOBS.blurFar;
    var unfocus = 1 - f;
    var cx0 = geo.sw / 2, cy0 = geo.sh / 2;

    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      var t = BMH.clamp((q - p.start) / pages.travel, 0, 1);
      var e = easeInOut(t);
      var el = p.el;

      if (t >= 1) {                                            // filed: exactly the CSS layout
        el.style.transform = 'none';
        el.style.filter = '';
        el.style.zIndex = String(30 + p.slot);
        el.style.boxShadow = '';
        p.img.style.opacity = '';
        continue;
      }

      // where this page sits in the wall: its design spot, pushed out by the arrival zoom
      var far = 1 - p.d;
      var z = 1 + (KNOBS.zoom - 1) * unfocus * (0.5 + p.d);    // near pages come closer than far ones
      var wx = (narrow ? p.mx : p.x) / 100 * geo.sw;
      var wy = (narrow ? p.my : p.y) / 100 * geo.sh;
      var ww = (narrow ? p.mw : p.w) / 100 * geo.ref;
      wx = cx0 + (wx - cx0) * z;
      wy = cy0 + (wy - cy0) * z;
      ww *= z;
      var rot = narrow ? p.mr : p.r;

      var dx = (wx - p.sx) * (1 - e);
      var dy = (wy - p.sy) * (1 - e);
      var k = BMH.lerp(ww / p.sw, 1, e) * (1 + KNOBS.lift * Math.sin(Math.PI * t));
      var rr = rot * (1 - e);
      el.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0) rotate(' +
        rr.toFixed(2) + 'deg) scale(' + k.toFixed(4) + ')';

      // blur and fade live only on arrival; once sharp there is nothing on the page but the page
      if (unfocus > 0.001 && t <= 0) {
        var blur = (bNear + far * (bFar - bNear)) * unfocus;
        var fade = (KNOBS.fadeNear + far * (KNOBS.fadeFar - KNOBS.fadeNear)) * unfocus;
        el.style.filter = 'blur(' + (blur * geo.vw / 100).toFixed(2) + 'px)';
        p.img.style.opacity = (1 - fade).toFixed(3);
      } else {
        el.style.filter = '';
        p.img.style.opacity = '';
      }

      if (t > 0) {                                             // in flight: above everything, lifted
        var l = Math.sin(Math.PI * t);
        el.style.zIndex = '60';
        el.style.boxShadow = '0 ' + (12 + 26 * l).toFixed(0) + 'px ' + (14 + 40 * l).toFixed(0) + 'px ' +
          (-12 + 2 * l).toFixed(0) + 'px rgba(15,41,66,' + (0.28 - 0.08 * l).toFixed(3) + ')';
      } else {                                                 // still on the wall: stacked by depth
        el.style.zIndex = String(1 + Math.round(p.d * 20));
        el.style.boxShadow = '';
      }
    }

    // each property name comes up as its first page lands
    for (var c = 0; c < cols.length; c++) {
      var tf = BMH.clamp((q - cols[c]._first) / pages.travel, 0, 1);
      var o = BMH.smooth(0.55, 1, tf);
      names[c].style.opacity = o >= 1 ? '' : o.toFixed(3);
    }
  }

  var active = true;
  BMH.visible(sec, function (v) { active = v; if (v) last = ''; }, '10% 0px');
  BMH.onScroll(function () { if (active) frame(); });

  var rt = 0;
  function remeasure() { measure(); frame(); }
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(remeasure, 120); });
  if (narrowMq.addEventListener) narrowMq.addEventListener('change', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  window.addEventListener('load', remeasure);
  measure();
  frame();
})();
