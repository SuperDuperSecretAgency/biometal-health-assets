/* Opportunity 03 · The numbers. Static; this only applies the knob.              -z1n */
(function () {
  'use strict';
  const KNOBS = window.BMH.knobs('opp-numbers', {
    second: 'access',  // 'access' (Market Access, 2027) | 'none' (the $216B alone, centred)
    rule: 'baseline'   // 'none' | 'baseline' (a hairline both numbers stand on) | 'divider' (an upright hairline between them)
  });
  const root = document.getElementById('s-opp-numbers');
  if (!root) return;
  if (KNOBS.second === 'none') {
    const f = root.querySelector('.nums__fig--second');
    if (f) f.hidden = true;
    root.classList.add('only-one');
  }
  if (KNOBS.rule && KNOBS.rule !== 'none') root.classList.add('rule-' + KNOBS.rule);
})();
