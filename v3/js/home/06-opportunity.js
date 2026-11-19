/* 06 · The opportunity                                                          -z1n
   Desktop: the stage pins; knee, spine, then ankle develop in turn (a pale veil sweeps up off
   each x-ray while it pulls back to size) and each fact rises into its panel.
   Phones: the panels stack and each develops as it scrolls through the screen.
   Everything is scroll-linked, so it reverses on scroll-up and stops when the scroll stops.
   Reduced motion: nothing runs; the CSS default is the settled triptych with all three facts. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('opportunity', {
    entrance: 'develop',   // 'develop': the x-ray comes up out of a pale veil. 'rise': the panel slides up into an empty slot.
    scrollLength: 2.2,     // screens of scroll the triptych stays pinned for (desktop)
    leadIn: 0.3,           // screens before the pin at which the first panel starts developing
    stagger: 0.27,         // share of the timeline between one panel starting and the next
    panelLength: 0.4,      // share of the timeline one panel takes to land
    ghost: 0.8,            // how faint a waiting x-ray is: 0 = fully visible, 1 = blank field
    pullBack: 0.08,        // how far each x-ray zooms out as it lands: 0.08 = from 108% to 100%
    factDelay: 0.3,        // within a panel's turn, when its number starts to rise (0..1)
    lineDelay: 0.45,       // ... and when the line under it starts
    stackStart: 0.92,      // phones: a panel starts developing when its top is this far down the screen
    stackSpan: 0.6,        // phones: screens of scroll a panel takes to develop
    fact2: 'revision',     // r11 (Jerry, 10 Nov): 'revision': $21B annual revision surgeries. Before: 'patent': 1 US patent, on the alloy, to 2040. 'draper': 1st place, UCLA Draper Innovation Showcase, 2026.
    fact3: 'transform'     // r11 (Jerry, 10 Nov): 'transform': Transform the standard (sentence case, Andrew 18 Nov) of care. Before: 'years': 14 years of research behind it. 'firstThen': Plates and screws first. Then other metal implants.
  });

  var BMH = window.BMH;
  var root = document.getElementById('s-opportunity');
  if (!root || !BMH || BMH.reduced) return;

  var track = root.querySelector('.opp__track');
  var panels = Array.prototype.map.call(root.querySelectorAll('.opp__panel'), function (el) {
    var rises = el.querySelectorAll('.opp__rise');
    return {
      el: el,
      inner: el.querySelector('.opp__inner'),
      img: el.querySelector('.opp__img'),
      veil: el.querySelector('.opp__veil'),
      big: rises[0],
      line: rises[1],
      last: -1
    };
  });

  /* [the big line, the line under it, how the big line is set: 'stat' a number, 'phrase' two short lines, 'word' one capitalised word] */
  var FACTS = {
    revision: ['$21B', 'annual revision surgeries.', 'stat'],
    transform: ['Transform', 'the standard of care.', 'word'],
    patent: ['1 US patent', 'on the alloy, to 2040.'],
    draper: ['1st place', 'UCLA Draper Innovation Showcase, 2026.'],
    years: ['14 years', 'of research behind it.'],
    firstThen: ['Plates and screws first.', 'Then other metal implants.']
  };
  [[KNOBS.fact2, 1], [KNOBS.fact3, 2]].forEach(function (f) {
    var t = FACTS[f[0]], p = panels[f[1]];
    if (!t || !p) return;
    var kind = t[2] || 'phrase';
    p.big.textContent = t[0]; p.line.textContent = t[1];
    p.big.className = (kind === 'stat' ? 'stat' : kind === 'word' ? 'opp__phrase opp__phrase--word' : 'opp__phrase') + ' opp__rise';
  });

  var rise = KNOBS.entrance === 'rise';
  root.classList.add('is-live');
  if (rise) root.classList.add('is-rise');
  root.style.setProperty('--opp-ghost', String(KNOBS.ghost));

  // Where the panels stack is set once, in section.css (the media query that sets --opp-stacked).
  var stacked = null, onScreen = true, lastSize = '', pinTop = 0;
  function layout(vw, vh) {
    var size = vw + 'x' + vh;
    if (size === lastSize) return;                  // only re-read the CSS when the window changes
    lastSize = size;
    var s = getComputedStyle(root).getPropertyValue('--opp-stacked').trim() === '1';
    if (s === stacked) return;
    stacked = s;
    root.classList.toggle('is-pinned', !s);
    pinTop = s ? 0 : (parseFloat(getComputedStyle(root.querySelector('.opp__stage')).top) || 0);
    track.style.height = s ? '' : 'calc(' + ((1 + KNOBS.scrollLength) * 100) + 'vh - ' + pinTop + 'px)';
    panels.forEach(function (p) { p.last = -1; });
  }

  function part(w, from, len) { return BMH.smooth(0, 1, (w - from) / len); }
  // Always an explicit transform: the CSS default is the settled frame, so '' would jump to it.
  function ty(el, pct) { el.style.transform = 'translate3d(0,' + pct.toFixed(2) + '%,0)'; }

  // w: 0 = waiting, 1 = landed.
  function apply(p, w) {
    w = Math.round(w * 1000) / 1000;
    if (w === p.last) return;
    p.last = w;
    var body = part(w, 0, 0.85);                    // the picture
    var big = part(w, KNOBS.factDelay, 0.45);       // the number
    var line = part(w, KNOBS.lineDelay, 0.45);      // the words under it
    if (rise) {
      ty(p.inner, (1 - body) * 101);
      p.img.style.transform = 'translate3d(0,' + (-(1 - body) * 35).toFixed(2) + '%,0) scale(' + (1 + KNOBS.pullBack * (1 - body)).toFixed(4) + ')';
    } else {
      ty(p.veil, -60 * body);
      p.img.style.transform = body < 1 ? 'scale(' + (1 + KNOBS.pullBack * (1 - body)).toFixed(4) + ')' : '';
    }
    ty(p.big, (1 - big) * 112);
    ty(p.line, (1 - line) * 112);
  }

  function update(st) {
    layout(st.vw, st.vh);
    if (!onScreen) return;
    var vh = st.vh;
    if (stacked) {
      panels.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        apply(p, BMH.clamp((vh * KNOBS.stackStart - (r.top + BMH.glideOff())) / (vh * KNOBS.stackSpan), 0, 1));
      });
      return;
    }
    var r = track.getBoundingClientRect();
    var lead = KNOBS.leadIn * vh + pinTop;
    var t = BMH.clamp((lead - (r.top + BMH.glideOff())) / (r.height - vh + lead), 0, 1);   /* glideOff: 0 unless the scroll glide is on */
    panels.forEach(function (p, i) {
      apply(p, BMH.clamp((t - i * KNOBS.stagger) / KNOBS.panelLength, 0, 1));
    });
  }

  layout(window.innerWidth, window.innerHeight);
  BMH.visible(root, function (v) {
    onScreen = v;
    if (v) update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
  });
  BMH.onScroll(update);
})();
