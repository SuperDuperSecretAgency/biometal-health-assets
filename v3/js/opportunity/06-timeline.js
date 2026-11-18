/* Opportunity · 06 · Our timeline.                        -z1n
   Round 2: a compact band with no pin. Scroll draws the line as the band passes up the screen; each
   milestone settles as the line reaches it. Everything is a pure function of scroll position, so it
   reverses on the way up and stops when the scroll stops.
   Wide screens: the line draws left to right while it travels from drawStart to drawEnd on the screen.
   Narrow screens: the line's tip follows a point on the screen as the list passes.
   Reduced motion: the whole line drawn, every milestone settled (the default CSS).
   Previous version (pinned, 2.5 screens): section-prev-r2.js. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('opp-timeline', {
    drawStart: 0.85,       // wide: the line starts drawing when it is this far down the screen (0 = top, 1 = bottom)
    drawEnd: 0.4,          // wide: ...and reaches its far end when it is this far down
    tipAt: 0.62,           // narrow: the line's tip follows this point down the screen (0 = top, 1 = bottom)
    settle: 80,            // px of line past a milestone over which it settles
    rise: 10,              // px a milestone's words travel as they settle
    waiting: 0,            // a milestone before the line reaches it: 0 = hidden, 0.15 = ghosted
    track: 1,              // the faint path ahead of the line: 1 = shown, 0 = none
    futureText: 'blue'     // the undated steps' words and "What's coming next?": 'blue' or 'navy'
  });

  var BMH = window.BMH;
  var sec = document.getElementById('s-opp-timeline');
  if (!sec || !BMH) return;

  var line = sec.querySelector('.tl-line');
  var track = sec.querySelector('.tl-track');
  var items = [].slice.call(sec.querySelectorAll('.tl-item'));
  var nowAt = items.indexOf(sec.querySelector('.tl-item--now'));
  if (nowAt < 0) nowAt = items.length - 1;      // r11: no 'now' step, so the line is navy to the last milestone
  var mq = window.matchMedia('(min-width: 1024px)');   // matches the CSS breakpoint
  var live = !BMH.reduced;

  var s = sec.style;
  s.setProperty('--tl-wait', KNOBS.waiting);
  s.setProperty('--tl-rise', KNOBS.rise + 'px');
  s.setProperty('--tl-track', KNOBS.track);
  sec.classList.toggle('tl--navy-next', KNOBS.futureText === 'navy');

  var wide = mq.matches, pos = [], len = 0, last = -1;

  /* Where each dot sits along the line, and the line's colours in those same pixels:
     navy to the Master File, then light blue fading out past the last step. */
  function measure() {
    wide = mq.matches;
    var lr = line.getBoundingClientRect();
    len = wide ? lr.width : lr.height;
    pos = items.map(function (li) {
      var d = li.querySelector('.tl-dot').getBoundingClientRect();
      return wide ? d.left + d.width / 2 - lr.left : d.top + d.height / 2 - lr.top;
    });
    var a = pos[nowAt].toFixed(1), b = pos[items.length - 1].toFixed(1), dir = wide ? '90deg' : '180deg';
    line.style.backgroundImage = 'linear-gradient(' + dir + ', var(--brand) 0, var(--brand) ' + a + 'px, ' +
      'var(--brand-mid) ' + a + 'px, var(--brand-pale) ' + b + 'px, transparent ' + len.toFixed(1) + 'px)';
    last = -1;
  }

  function tip() {
    var vh = window.innerHeight, lr = line.getBoundingClientRect();
    if (wide) {
      var y = lr.top + lr.height / 2;          // where the line is on the screen
      var span = Math.max(0.05, KNOBS.drawStart - KNOBS.drawEnd) * vh;
      return BMH.clamp((KNOBS.drawStart * vh - y) / span, 0, 1) * len;
    }
    return BMH.clamp(vh * KNOBS.tipAt - lr.top, 0, len);
  }

  function draw() {
    var t = tip();
    if (Math.abs(t - last) < 0.25) return;
    last = t;
    var cut = len ? (100 * (1 - t / len)).toFixed(3) : '0';
    line.style.clipPath = wide ? 'inset(0 ' + cut + '% 0 0)' : 'inset(0 0 ' + cut + '% 0)';
    for (var i = 0; i < items.length; i++) {
      items[i].style.setProperty('--k', BMH.smooth(pos[i] - 4, pos[i] + KNOBS.settle, t).toFixed(3));
    }
  }

  measure();
  if (!live) {                                  // settled frame: drawn, no path ahead
    track.style.display = 'none';
    window.addEventListener('resize', measure);
    return;
  }
  draw();

  var onScreen = true;
  BMH.visible(sec, function (v) { onScreen = v; if (v) draw(); });
  function remeasure() { measure(); draw(); }
  window.addEventListener('resize', remeasure);
  if (mq.addEventListener) mq.addEventListener('change', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  BMH.onScroll(function () { if (onScreen) draw(); });
})();
