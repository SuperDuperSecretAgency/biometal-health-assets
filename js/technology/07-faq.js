/* Technology 06 · the FAQ. The accordions are native <details> and work without this file;     -z1n
   it only applies the knobs. Round 3 (28 Sep): heading options, and the open state as a knob. */
(function () {
  'use strict';
  var KNOBS = window.BMH.knobs('tech-faq', {
    heading: 'a',        // which headline, from HEADINGS below
    open: 'first',       // 'first': the first answer starts open · 'none': all closed · 'all': all open
    leadIn: true,        // true: each answer's short first line in darker type; false: one colour
    duration: 320,       // ms for an answer to open or close
    oneAtATime: false    // true: opening one answer closes the one that was open
  });
  // Visible headline text. The build doesn't scan JS-rendered text for banned words; these are clean.
  var HEADINGS = {
    a: 'What implant makers ask.',
    b: 'The hard questions.',
    c: 'Before you coat.',
    current: 'Questions partners ask first.'
  };
  var root = document.getElementById('s-tech-faq');
  if (!root) return;

  var h = root.querySelector('.tf-h');
  if (h && HEADINGS[KNOBS.heading]) h.textContent = HEADINGS[KNOBS.heading];

  root.classList.toggle('tf--plain', !KNOBS.leadIn);
  var dur = window.BMH.reduced ? 0 : Math.max(0, +KNOBS.duration || 0);
  root.style.setProperty('--tf-dur', dur + 'ms');

  var items = root.querySelectorAll('.tf-item');
  for (var i = 0; i < items.length; i++) {
    if (KNOBS.oneAtATime) items[i].setAttribute('name', 'tech-faq');
    else items[i].removeAttribute('name');
    items[i].open = KNOBS.open === 'all' || (KNOBS.open === 'first' && i === 0);
  }
})();
