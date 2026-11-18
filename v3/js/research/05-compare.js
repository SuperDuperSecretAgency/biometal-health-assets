/* Research 05 · How zinc compares. No motion; the knobs only choose what the table shows.  -z1n
   Round 2: all four of the live site's rows show by default. Round 1 is section-prev-r2.js. */
(function () {
  'use strict';
  var root = document.getElementById('s-res-compare');
  if (!root || !window.BMH) return;

  var KNOBS = window.BMH.knobs('res-compare', {
    stiffnessRow: true,  // false hides "Close to bone's stiffness" (zinc's modulus is disputed; see the project CLAUDE.md §8)
    marks: 'words'       // 'words' (Yes / No / —) or 'symbols' (the live site's ✓ ✗ –)
  });

  if (!KNOBS.stiffnessRow) {
    var row = root.querySelector('[data-row="stiffness"]');
    if (row) row.hidden = true;
  }
  if (KNOBS.marks === 'symbols') root.classList.add('is-symbols');
})();
