/* 02 · The problem.                                                              -z1n
   The stage pins over the x-ray. Scroll plays three beats: the problem, the cost, the turn.
   The x-ray pushes in slowly through the first two, then clears for "There has to be a better way."
   Everything is a pure function of scroll position, so it reverses on scroll-up and stops when
   the scroll stops. Reduced motion: no pin, the beats stack over a still x-ray (section.css). */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('problem', {
    scrollLength: 3.6,     // section height in screens; the pin holds for this minus one
    pushIn: 1.12,          // x-ray scale by the end of the $21B beat (1 = no push)
    pushInTurn: 1.22,      // x-ray scale at the end, while it clears for the turn
    turnXray: 0,           // x-ray left behind the turn line: 0 = cleared, 0.12 = a ghost
    textDrift: 0.4,        // how far a beat travels as it leaves or arrives, in em

    // When each thing happens, as a fraction of the pinned scroll (0 = pin starts, 1 = pin ends)
    secondSentenceLands: [0.02, 0.13],   // "Too many need a second surgery." fills in
    secondSentenceStart: 0.35,           // its blue before it lands: 0 = invisible, 1 = no fill, just light blue
    problemLeaves: [0.22, 0.29],
    statArrives: [0.29, 0.37],
    statLineArrives: [0.33, 0.42],
    costLeaves: [0.57, 0.64],
    xrayClears: [0.60, 0.78],
    turnArrives: [0.70, 0.83],

    // Where the x-ray sits. Wide screens: the leg runs across the lower part of the screen.
    wide: { bandWidth: 1.1, roomAbove: 330, right: -0.08, bottom: 0.04, pushCentre: [74, 62] },
    // Portrait screens: the leg stands upright under the copy.
    narrow: { width: 1, kneeAt: 0.34, pushCentre: [72, 22] }
  });

  var BMH = window.BMH;
  var sec = document.getElementById('s-problem');
  if (!sec || !BMH) return;
  if (BMH.reduced) return;               // the static stack in section.css is the settled frame

  var xray = sec.querySelector('.p2-xray');
  var b1 = sec.querySelector('.p2-b1');
  var b2 = sec.querySelector('.p2-b2');
  var stat = b2.querySelector('.stat');
  var line = b2.querySelector('.lead');
  var b3 = sec.querySelector('.p2-b3');

  var s = sec.style;
  s.setProperty('--p2-len', KNOBS.scrollLength);
  s.setProperty('--p2-k0', KNOBS.secondSentenceStart);
  s.setProperty('--p2-bwf', KNOBS.wide.bandWidth);
  s.setProperty('--p2-room', KNOBS.wide.roomAbove + 'px');
  s.setProperty('--p2-br', KNOBS.wide.right);
  s.setProperty('--p2-bb', KNOBS.wide.bottom);
  s.setProperty('--p2-ox', KNOBS.wide.pushCentre[0] + '%');
  s.setProperty('--p2-oy', KNOBS.wide.pushCentre[1] + '%');
  s.setProperty('--p2-nwf', KNOBS.narrow.width);
  s.setProperty('--p2-nknee', KNOBS.narrow.kneeAt);
  s.setProperty('--p2-nox', KNOBS.narrow.pushCentre[0] + '%');
  s.setProperty('--p2-noy', KNOBS.narrow.pushCentre[1] + '%');
  sec.classList.add('is-pinned');

  function win(w, p) { return BMH.smooth(w[0], w[1], p); }
  function set(el, o, y, sc) {
    el.style.opacity = o.toFixed(3);
    el.style.transform = 'translate3d(0,' + y.toFixed(3) + 'em,0)' + (sc ? ' scale(' + sc.toFixed(4) + ')' : '');
    el.style.visibility = o < 0.002 ? 'hidden' : 'visible';
  }

  var onScreen = true, last = -1;
  BMH.visible(sec, function (v) { onScreen = v; if (v) draw(); });

  function draw() {
    var p = BMH.pinProgress(sec);
    if (Math.abs(p - last) < 1e-4) return;
    last = p;
    var d = KNOBS.textDrift;

    // beat 1: the problem. The second sentence lands, then the beat lifts away.
    s.setProperty('--p2-k', win(KNOBS.secondSentenceLands, p).toFixed(3));
    var out1 = win(KNOBS.problemLeaves, p);
    set(b1, 1 - out1, -d * out1);

    // beat 2: the cost. The number first, then what it pays for.
    var inS = win(KNOBS.statArrives, p), inL = win(KNOBS.statLineArrives, p), out2 = win(KNOBS.costLeaves, p);
    b2.style.opacity = '1';
    b2.style.visibility = (inS > 0 && out2 < 1) ? 'visible' : 'hidden';
    set(stat, inS * (1 - out2), d * (1 - inS) - d * out2);
    set(line, inL * (1 - out2), d * 1.4 * (1 - inL) - d * out2);

    // the x-ray: a slow push through beats 1-2, then it clears as the turn arrives
    var push = BMH.ease(BMH.clamp(p / KNOBS.costLeaves[1], 0, 1));
    var clear = win(KNOBS.xrayClears, p);
    var sc = 1 + (KNOBS.pushIn - 1) * push + (KNOBS.pushInTurn - KNOBS.pushIn) * clear;
    xray.style.transform = 'scale(' + sc.toFixed(4) + ')';
    xray.style.opacity = (1 - clear * (1 - KNOBS.turnXray)).toFixed(3);

    // beat 3: the turn. It comes forward out of the cleared field.
    var in3 = win(KNOBS.turnArrives, p);
    set(b3, in3, 0, 0.965 + 0.035 * in3);
  }

  BMH.onScroll(function () { if (onScreen) draw(); });
})();
