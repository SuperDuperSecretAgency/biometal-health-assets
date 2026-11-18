/* Opportunity 05 · What protects it. Static; this only applies the knob.         -z1n */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('opp-moat', {
    layout: 'split'   // 'split' (headline left, facts right) | 'stack' (headline over the facts)
  });
  const root = document.getElementById('s-opp-moat');
  if (!root) return;
  if (KNOBS.layout === 'stack') root.classList.add('is-stack');
})();
