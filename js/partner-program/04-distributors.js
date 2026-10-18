/* PPP 04 · Something new to sell. Static; the script only applies the knobs.            -z1n */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('ppp-distributors', {
    side: 'left',       // 'left' | 'right': which side of the page the screws sit on (copy takes the other)
    ground: 'white'     // 'white' (--bg, one calm stretch with 03 and 05) | 'soft' (--bg-soft, a band)
  });
  const el = document.getElementById('s-ppp-distributors');
  if (!el) return;
  el.dataset.side = KNOBS.side === 'right' ? 'right' : 'left';
  el.dataset.ground = KNOBS.ground === 'soft' ? 'soft' : 'white';
})();
