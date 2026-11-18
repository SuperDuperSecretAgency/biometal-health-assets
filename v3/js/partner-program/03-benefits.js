/* PPP 03 · Benefits. Knobs only.                                                  -z1n
   benefit3  'full'   Support and partnership throughout regulatory and commercialization.
             'short'  Support at every step, from the first call on. */
(function () {
  'use strict';
  var KNOBS = window.BMH.knobs('ppp-benefits', { benefit3: 'full' });
  var el = document.querySelector('#s-ppp-benefits [data-benefit3]');
  if (el && KNOBS.benefit3 === 'short') el.textContent = 'Support at every step, from the first call on.';
})();
