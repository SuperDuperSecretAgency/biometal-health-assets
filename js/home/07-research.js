/* 07 · Decades of research: scroll-linked depth drift on the paper wall.        -z1n
   Near sheets drift up faster than the page, far sheets lag behind it, so the wall reads as
   layers of paper at different depths. Reversible, and still when the scroll stops.
   Reduced motion: the wall sits at its designed composition and never moves. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('research', {
    drift: 0.16,        // how far the nearest sheets travel each way across the pass, in viewport heights
    farDrift: -0.35,    // the farthest sheets move this share of that, the other way (they lag the scroll)
    turn: 1.2,          // degrees of extra tilt the nearest sheets gain and lose across the pass
    blurNear: 0.065,    // blur on the nearest sheets, in vw (desktop); about 0.9 px at 1440
    blurFar: 0.3,       // blur on the farthest sheets, in vw (desktop); about 4 px at 1440
    blurNearNarrow: 0.18, // the same two on phones and portrait tablets, where the sheets are smaller
    blurFarNarrow: 0.7,
    fadeNear: 0.16,     // how far the nearest sheets are lightened toward white, 0..1
    fadeFar: 0.52,      // how far the farthest sheets sink into the ground, 0..1
    wash: 0.96          // strength of the ground wash behind the headline, 0..1
  });

  var BMH = window.BMH;
  var sec = document.getElementById('s-research');
  if (!sec || !BMH) return;

  var narrowMq = window.matchMedia('(max-width: 700px), (max-width: 1100px) and (max-aspect-ratio: 4/5)');
  function applyLook() {
    var n = narrowMq.matches;
    sec.style.setProperty('--blur-near', (n ? KNOBS.blurNearNarrow : KNOBS.blurNear) + 'vw');
    sec.style.setProperty('--blur-far', (n ? KNOBS.blurFarNarrow : KNOBS.blurFar) + 'vw');
    sec.style.setProperty('--fade-near', KNOBS.fadeNear);
    sec.style.setProperty('--fade-far', KNOBS.fadeFar);
    sec.style.setProperty('--wash', KNOBS.wash);
  }
  applyLook();
  if (narrowMq.addEventListener) narrowMq.addEventListener('change', applyLook);

  if (BMH.reduced) return;

  var papers = [].map.call(sec.querySelectorAll('.paper'), function (el) {
    var cs = getComputedStyle(el);
    var d = parseFloat(cs.getPropertyValue('--d')) || 0;
    var r = parseFloat(cs.getPropertyValue('--r')) || 0;
    var mr = parseFloat(cs.getPropertyValue('--mr'));
    return { el: el, d: d, rate: BMH.lerp(KNOBS.farDrift, 1, d), sign: r < 0 ? -1 : 1, msign: isNaN(mr) ? (r < 0 ? -1 : 1) : (mr < 0 ? -1 : 1) };
  });

  var active = true, last = '';
  BMH.visible(sec, function (v) { active = v; if (v) last = ''; });

  BMH.onScroll(function (st) {
    if (!active) return;
    var p = BMH.passProgress(sec);
    var key = p.toFixed(4) + '|' + st.vh + '|' + st.vw;
    if (key === last) return;
    last = key;
    var k = (0.5 - p) * 2;                       // +1 entering, 0 centred, -1 leaving
    var travel = KNOBS.drift * st.vh;
    var narrow = narrowMq.matches;
    for (var i = 0; i < papers.length; i++) {
      var o = papers[i];
      var ty = k * travel * o.rate;
      var tr = k * KNOBS.turn * o.d * (narrow ? o.msign : o.sign);
      o.el.style.transform = 'translate3d(0,' + ty.toFixed(1) + 'px,0) rotate(' + tr.toFixed(2) + 'deg)';
    }
  });
})();
