/* Opportunity 04 · How we sell. The chain draws itself as it comes into view.    -z1n
   Scroll-linked and reversible: nothing moves unless the page scrolls. One progress value runs
   the three connectors in turn; each name darkens as its connector arrives. Reduced motion (and
   no JS) keep the CSS default, the whole chain drawn. */
(function () {
  'use strict';
  const BMH = window.BMH;
  const KNOBS = BMH.knobs('opp-how-we-sell', {
    drawStart: 0.88,  // the line starts when the chain's top is this far down the screen (0 top, 1 bottom)
    drawEnd: 0.5,     // and is fully drawn when the chain's bottom reaches this far down
    arrive: 0.25,     // the last part of each connector over which the next name darkens (0..1)
    pale: 0.28,       // how much colour a name keeps before the line reaches it (0..1)
    track: true       // a faint path shows where the line will run before it draws
  });

  const root = document.getElementById('s-opp-how-we-sell');
  if (!root) return;
  const chain = root.querySelector('.sell__chain');
  const links = Array.prototype.slice.call(root.querySelectorAll('.sell__link'));
  const names = Array.prototype.slice.call(root.querySelectorAll('.sell__name'));

  root.style.setProperty('--sell-pale', KNOBS.pale);
  if (!KNOBS.track) root.classList.add('no-track');
  if (BMH.reduced || !chain || !links.length) return;   // settled frame

  root.classList.add('is-live');
  const n = links.length;
  let onscreen = true, last = -1;

  function paint(p) {
    for (let i = 0; i < n; i++) {
      const lp = BMH.clamp(p * n - i, 0, 1);
      links[i].style.setProperty('--p', lp.toFixed(4));
      links[i].style.setProperty('--h', lp > 0.002 ? '1' : '0');
      // names[0] is BioMetal Health™, always lit; name i+1 darkens as connector i lands
      if (names[i + 1]) names[i + 1].style.setProperty('--k', BMH.smooth(1 - KNOBS.arrive, 1, lp).toFixed(4));
    }
  }

  function update(st) {
    if (!onscreen) return;
    const r = chain.getBoundingClientRect();
    const a = st.vh * KNOBS.drawStart, b = st.vh * KNOBS.drawEnd;
    const p = BMH.clamp((a - (r.top + BMH.glideOff())) / Math.max(1, a - b + r.height), 0, 1);   /* glide (19 Nov) */
    if (Math.abs(p - last) < 0.0005) return;
    last = p;
    paint(p);
  }

  paint(0);
  BMH.visible(root, function (v) { onscreen = v; if (v) { last = -1; update({ vh: window.innerHeight }); } });
  BMH.onScroll(update);
})();
