/* Close band. GENERATED from src/parts/close-band/band.js by make.py: edit there and re-run.      -z1n
   The x-ray develops out of the light field and the frame pushes in slowly as the line lands, as on
   the homepage close. Scroll-linked: it reverses on scroll-up and stops when the scroll stops.
   Reduced motion (and no JS) show the settled frame, set as the CSS defaults. Nothing loops.

   This band draws no implant (PLAN.md v3, decision 14: no product imagery on this page). The film
   alone: it develops and pushes in on scroll, and the settled frame is the reduced-motion frame of
   the other bands. No canvas, no models.
*/
(function () {
  'use strict';

  const KNOBS = window.BMH.knobs('res-close', {
    develop: true,      // false = the x-ray is simply there: no develop-in, no push
    developFrom: 0,     // image opacity as the band first enters (0 = blank field, 1 = no develop)
    pushFrom: 1.0,      // image scale as the band first enters
    pushTo: 1.07,       // image scale once settled (push-in: larger = closer)
    start: 0.08,        // scroll point where both begin: 0 = the band's top at the viewport bottom
    developEnd: 0.42,   // scroll point where the x-ray is fully developed
    pushEnd: 0.5,       // scroll point where the push-in settles (0.5 = the band fills the screen)
    blendPx: 200,       // the soft blend up from the section above, in px (0 = a clean edge)
  });

  const BMH = window.BMH;
  const sec = document.getElementById('s-res-close');
  if (!sec || !BMH) return;
  const stage = sec.querySelector('.close');
  const foot = document.querySelector('.site-foot');
  /* blend up from whatever ground the section above has, so the seam is clean whoever built it */
  const prev = sec.previousElementSibling;
  const bg = prev ? getComputedStyle(prev).backgroundColor : '';
  if (bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) sec.style.setProperty('--close-from', bg);
  sec.style.setProperty('--close-blend', Math.max(0, +KNOBS.blendPx || 0) + 'px');

  /* the phone layout sizes the band to the screen minus the footer, so the two make the last
     screen together */
  function measureFoot() { sec.style.setProperty('--close-foot', (foot ? foot.offsetHeight : 0) + 'px'); }
  measureFoot();
  if (foot && 'ResizeObserver' in window) new ResizeObserver(measureFoot).observe(foot);
  else window.addEventListener('resize', measureFoot);

  function settle() {
    sec.style.setProperty('--close-dev', '1');
    sec.style.setProperty('--close-push', String(KNOBS.pushTo));
  }
  if (BMH.reduced) { settle(); return; }   // the settled film, and never the implant

  if (KNOBS.develop) {
    let onscreen = true, last = -1;
    const develop = function () {
      if (!onscreen) return;
      const p = BMH.passProgress(stage);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const d = BMH.smooth(KNOBS.start, KNOBS.developEnd, p);
      const k = BMH.ease((p - KNOBS.start) / (KNOBS.pushEnd - KNOBS.start));
      sec.style.setProperty('--close-dev', BMH.lerp(KNOBS.developFrom, 1, d).toFixed(3));
      sec.style.setProperty('--close-push', BMH.lerp(KNOBS.pushFrom, KNOBS.pushTo, k).toFixed(4));
    };
    /* a jump (End key, reload at the foot of the page) lands before the observer says the band is
       on screen, so catch up when it does */
    BMH.visible(stage, function (v) { onscreen = v; if (v) develop(); });
    BMH.onScroll(develop);
  } else settle();
})();
