/* Technology 05 · Where it goes. Static: no motion. Three switches.                      -z1n */
(function () {
  'use strict';
  var KNOBS = window.BMH.knobs('tech-where', {
    photo: 'together',   // 'together': the one photo of plates and screws shot side by side. 'pair': the separate plates and screws photos, set the same way, true to size.
    layout: 'tuck',      // 'tuck': the photo rises beside the headline, filling its empty corner (wide screens). 'below': the photo under the headline, centred.
    size: 0.72           // how big the parts are at 1440: CSS px per photo px. 0.72: plates 1.7x and screws 1.25x their round-one size. Past 0.8 they soften on a 2x screen.
  });
  var root = document.getElementById('s-tech-where');
  if (!root) return;
  root.classList.toggle('tw--pair', KNOBS.photo === 'pair');
  root.classList.toggle('tw--tuck', KNOBS.layout !== 'below');
  root.style.setProperty('--tw-size', Math.max(0.3, Math.min(1, +KNOBS.size || 0.72)));
})();
