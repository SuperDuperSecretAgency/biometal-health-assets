/* 05 · Logo bar. Static apart from one knob: how "First place" is set (U6). The default is in the
   markup (data-win="caption"); this only changes it when a review board sets a different value.  -z1n
   'caption' (U6 A): "First place" under the Draper mark.
   'split'   (U6 B): "First place" heads the Draper mark, "Selected by" heads the other five. */
(function () {
  'use strict';

  const KNOBS = window.BMH.knobs('logos', {
    win: 'caption'      // 'caption' | 'split'
  });

  const row = document.querySelector('#s-logos .logos__row');
  if (row) row.dataset.win = KNOBS.win;
})();
