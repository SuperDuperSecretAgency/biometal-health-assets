/* Opportunity 03 · The numbers. Static; this only applies the knob.              -z1n */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('opp-numbers', {
    rule: 'baseline'   // 'none' | 'baseline' (a hairline both numbers stand on) | 'divider' (an upright hairline between them)
  });
  const root = document.getElementById('s-opp-numbers');
  if (!root) return;
  if (KNOBS.rule && KNOBS.rule !== 'none') root.classList.add('rule-' + KNOBS.rule);
})();
