/* PPP 05 · How to join. Static: this only applies the knobs.                                 -z1n
   Round 2: the scroll-drawn timeline is gone (section-prev-r2.js keeps it). */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('ppp-join-steps', {
    layout: 'side',   // 'side': headline left, lines right (desktop) · 'stack': lines under the headline
    rules: true       // a hairline between the lines (false = the lines alone)
  });

  const el = document.getElementById('s-ppp-join-steps');
  if (!el) return;
  el.dataset.layout = KNOBS.layout === 'stack' ? 'stack' : 'side';
  el.dataset.rules = KNOBS.rules ? 'on' : 'off';
})();
