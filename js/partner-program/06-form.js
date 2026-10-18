/* Preferred Partner Program · 06 · Let's talk. Static: this only applies the knobs.          -z1n
   Round 2: the join form is gone (section-prev-r2.js keeps it). The button goes to contact.html. */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('ppp-talk', {
    height: 'band',   // 'band': a band sized by its padding · 'screen': with the footer, the last screen
    blendPx: 200      // the soft blend up from the white section above, in px (0 = a clean edge)
  });

  const sec = document.getElementById('s-ppp-talk');
  if (!sec) return;
  sec.dataset.height = KNOBS.height === 'screen' ? 'screen' : 'band';
  sec.style.setProperty('--pt-blend', Math.max(0, +KNOBS.blendPx || 0) + 'px');

  /* 'screen' on a phone: the band fills what the footer leaves */
  const foot = document.querySelector('.site-foot');
  function measureFoot() { sec.style.setProperty('--pt-foot', (foot ? foot.offsetHeight : 0) + 'px'); }
  if (KNOBS.height === 'screen') {
    measureFoot();
    if (foot && 'ResizeObserver' in window) new ResizeObserver(measureFoot).observe(foot);
    else window.addEventListener('resize', measureFoot);
  }
})();
