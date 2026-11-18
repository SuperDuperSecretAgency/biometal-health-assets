/* Opportunity 02 · When implants fail                                              -z1n
   Desktop: the stage pins. Infection, then loosening, then the second surgery each rise into their
   ruled slot in turn; then $21B rises, and the line under it; then the turn, "A better implant can
   solve this problem.", lands last and holds. The x-ray eases in very slightly over the whole pin.
   Phones: stacked; each line rises as it scrolls up the screen.
   Scroll-linked: it reverses on scroll-up and stops when the scroll stops.
   Reduced motion: nothing runs; the CSS default shows everything. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('opp-failure', {
    scrollLength: 1.9,   // screens of scroll the stage stays pinned while the beats arrive (desktop); was 1.6 before the turn
    leadIn: 0.25,        // screens before the pin at which the timeline starts
    firstAt: 0.08,       // when the first beat starts rising (share of the timeline)
    stepGap: 0.17,       // share of the timeline between one beat starting and the next
    stepLength: 0.13,    // share of the timeline one beat takes to land
    costAt: 0.58,        // when $21B starts to rise; the line under it follows
    turnAt: 0.76,        // when "A better implant can solve this problem." starts to rise; it lands, then holds to the end
    turnLength: 0.16,    // share of the timeline the turn takes to land (a touch slower than a beat)
    turnColour: 'navy',  // the turn's ink: 'navy' (--brand, like $21B) or 'blue' (--brand-mid, the live site's highlight)
    pushIn: 0.05,        // the x-ray eases from 105% to 100% over the pin; 0 = holds still
    stackStart: 0.9,     // phones: a line starts rising when its slot's top is this far down the screen
    stackSpan: 0.16      // phones: screens of scroll one line takes to land
  });

  var BMH = window.BMH;
  var root = document.getElementById('s-opp-failure');
  if (!root || !BMH) return;
  root.classList.toggle('of--turn-blue', KNOBS.turnColour === 'blue');
  if (BMH.reduced) return;

  var track = root.querySelector('.of-track');
  var img = root.querySelector('.of-xray img');
  // Each line: the element that rises, and the slot that clips it (for the phone trigger).
  var lines = Array.prototype.map.call(root.querySelectorAll('.of-rise'), function (el) {
    return { el: el, slot: el.parentNode, last: -1 };
  });
  // Desktop timeline: beats 0..2 step in; then the number, then its line; then the turn.
  lines.forEach(function (l, i) {
    l.len = KNOBS.stepLength;
    if (i < 3) l.at = KNOBS.firstAt + i * KNOBS.stepGap;
    else if (i < 5) l.at = KNOBS.costAt + (i - 3) * 0.08;
    else { l.at = KNOBS.turnAt; l.len = KNOBS.turnLength; }
  });

  root.classList.add('is-live');

  var stacked = null, onScreen = true, lastSize = '', lastImg = -1;
  function layout(vw, vh) {
    var size = vw + 'x' + vh;
    if (size === lastSize) return;
    lastSize = size;
    var s = getComputedStyle(root).getPropertyValue('--of-stacked').trim() === '1';
    if (s === stacked) return;
    stacked = s;
    root.classList.toggle('is-pinned', !s);
    track.style.height = s ? '' : ((1 + KNOBS.scrollLength) * 100) + 'vh';
    lines.forEach(function (l) { l.last = -1; });
    lastImg = -1;
  }

  // p: 0 = waiting below its slot, 1 = landed. Always an explicit transform (the CSS default is landed).
  function rise(l, p) {
    p = Math.round(BMH.smooth(0, 1, p) * 1000) / 1000;
    if (p === l.last) return;
    l.last = p;
    l.el.style.transform = 'translate3d(0,' + ((1 - p) * 112).toFixed(2) + '%,0)';
  }

  function update(st) {
    layout(st.vw, st.vh);
    if (!onScreen) return;
    var vh = st.vh;
    if (stacked) {
      lines.forEach(function (l) {
        var r = l.slot.getBoundingClientRect();
        rise(l, BMH.clamp((vh * KNOBS.stackStart - r.top) / (vh * KNOBS.stackSpan), 0, 1));
      });
      if (lastImg !== 0) { img.style.transform = ''; lastImg = 0; }
      return;
    }
    var r = track.getBoundingClientRect();
    var lead = KNOBS.leadIn * vh;
    var t = BMH.clamp((lead - r.top) / (r.height - vh + lead), 0, 1);
    lines.forEach(function (l) { rise(l, (t - l.at) / l.len); });
    if (KNOBS.pushIn) {
      var s = Math.round((1 + KNOBS.pushIn * (1 - BMH.smooth(0, 1, t))) * 10000) / 10000;
      if (s !== lastImg) { img.style.transform = 'scale(' + s + ')'; lastImg = s; }
    }
  }

  update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
  BMH.visible(root, function (v) {
    onScreen = v;
    if (v) update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
  });
  BMH.onScroll(update);
})();
