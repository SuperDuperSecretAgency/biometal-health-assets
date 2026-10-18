/* Opportunity 01 · Opener (round 2)                                                 -z1n
   Six real films under a dark scrim, "Every metal implant is a candidate." in white over them.
   motion 'unfold' (desktop): the stage pins for one screen; the homepage's three films sit full
   width and a forearm, a collarbone and a second spine open in beside them, each developing up out
   of the dark, until the row is six. Scroll-linked: it reverses on scroll-up and stops with the scroll.
   motion 'arrive' (desktop), and always on phones: all six in place, each develops once, left to
   right, the first time the hero is seen. A one-time entrance; nothing loops. In 'unfold' the
   homepage's three films develop the same way on arrival (knob entrance) before the scroll opens the rest.
   Reduced motion: the look knobs still apply; nothing moves; the CSS default is the settled six. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('opp-opener', {
    look: window.BMH.look, // 'dark': the dark hero (the main site). 'light': the light look, light films, a pale shade, navy type
                           // (the film knob then does nothing). Default: the site's look
    film: 'dark',        // 'dark': the films in their natural dark form, metal glowing pale. 'light': the site's light films, heavier scrim.
    scrim: null,         // how strong the even scrim over every film is, 0 to 1. null = the default (dark 0.3, light film 0.7, light look 0)
    shade: null,         // how strong the shade behind the headline is, 0 to 1. null = the default (dark 0.62, light film 0.55, light look 0.85)
    place: 'foot',       // where the headline sits: 'foot' = low on the left, 'middle' = halfway up, still left-aligned
    motion: 'unfold',    // desktop: 'unfold' = pinned, three films open into six as you scroll. 'arrive' = all six, each develops once
    scrollLength: 1.0,   // 'unfold': screens of scroll the row takes to open (the stage is pinned for this long)
    order: 'left',       // 'unfold': 'left' = the new films open one after another, left to right. 'together' = all three at once
    stagger: 0.2,        // 'unfold', 'left': share of the opening between one film starting and the next
    openLength: 0.6,     // 'unfold', 'left': share of the opening one film takes
    develop: 'veil',     // 'veil': a film comes up out of the dark as it appears. 'plain': it appears already sharp
    entrance: true,      // 'unfold': the homepage's three films also develop once when the page opens. false = they are there from the start
    ghost: 0.85,         // how faint a film is before it develops: 0 = sharp, 1 = nothing but field
    developTime: 1.6,    // 'arrive' and phones: seconds one film takes to develop
    developGap: 0.14     // 'arrive' and phones: seconds between one film starting and the next
  });

  var BMH = window.BMH;
  var root = document.getElementById('s-opp-opener');
  if (!root || !BMH) return;

  // ---- the look: applies with or without motion ----
  var look = KNOBS.look === 'light';
  var light = !look && KNOBS.film === 'light';
  if (look) root.setAttribute('data-look', 'light');
  if (light) root.setAttribute('data-film', 'light');
  if (KNOBS.place === 'middle') root.setAttribute('data-place', 'middle');
  root.style.setProperty('--oo-scrim', String(KNOBS.scrim != null ? KNOBS.scrim : (look ? 0 : light ? 0.7 : 0.3)));
  root.style.setProperty('--oo-shade', String(KNOBS.shade != null ? KNOBS.shade : (look ? 0.85 : light ? 0.55 : 0.62)));

  if (BMH.reduced) return;

  var track = root.querySelector('.oo-track');
  var all = Array.prototype.map.call(root.querySelectorAll('.oo-p'), function (el) {
    return { el: el, veil: el.querySelector('.oo-veil'), fresh: el.classList.contains('oo-p--new'), last: -1 };
  });
  var fresh = all.filter(function (p) { return p.fresh; });

  var plain = KNOBS.develop === 'plain';
  if (plain) root.classList.add('is-plain');
  root.style.setProperty('--oo-ghost', String(KNOBS.ghost));
  root.style.setProperty('--oo-dev', KNOBS.developTime + 's');

  // Left to right as the eye reads the row: desktop order on a wide screen, then the grid's rows on a phone.
  function arriveOrder(stacked) {
    var list = stacked ? all.filter(function (p) { return !p.fresh; }).concat(fresh) : all;
    list.forEach(function (p, i) { p.el.style.setProperty('--oo-delay', (i * KNOBS.developGap).toFixed(3) + 's'); });
  }

  // ---- which mode: set once from section.css (the media query that sets --oo-stacked) ----
  var mode = null, seen = false, onScreen = true, lastSize = '';
  function layout(vw, vh) {
    var size = vw + 'x' + vh;
    if (size === lastSize) return;
    lastSize = size;
    var stacked = getComputedStyle(root).getPropertyValue('--oo-stacked').trim() === '1';
    var m = (stacked || KNOBS.motion === 'arrive') ? 'arrive' : 'unfold';
    arriveOrder(stacked);
    if (m === mode) return;
    mode = m;
    root.classList.toggle('is-unfold', m === 'unfold');
    root.classList.toggle('is-pinned', m === 'unfold');
    root.classList.toggle('is-arrive', m === 'arrive');
    root.classList.toggle('is-entrance', m === 'unfold' && KNOBS.entrance !== false);
    track.style.height = m === 'unfold' ? ((1 + KNOBS.scrollLength) * 100) + 'vh' : '';
    all.forEach(function (p) {
      p.last = -1;
      p.el.style.removeProperty('--w');
      p.veil.style.transform = '';
    });
  }

  // ---- unfold: w 0 = closed, 1 = open ----
  function apply(p, w) {
    w = Math.round(w * 1000) / 1000;
    if (w === p.last) return;
    p.last = w;
    p.el.style.setProperty('--w', BMH.smooth(0, 1, w).toFixed(4));
    if (!plain) {
      var dev = BMH.smooth(0.12, 1, w);     // the film develops a beat behind the opening
      p.veil.style.transform = 'translate3d(0,' + (-60 * dev).toFixed(2) + '%,0)';
    }
  }

  function update(st) {
    layout(st.vw, st.vh);
    if (!onScreen || mode !== 'unfold') return;
    var r = root.getBoundingClientRect();
    var t = BMH.clamp(-r.top / Math.max(1, track.offsetHeight - st.vh), 0, 1);
    var together = KNOBS.order === 'together';
    fresh.forEach(function (p, i) {
      apply(p, together ? t : BMH.clamp((t - i * KNOBS.stagger) / KNOBS.openLength, 0, 1));
    });
  }

  // ---- arrive, and unfold's entrance: develop once, the first time the hero is on screen ----
  function develop() {
    if (seen) return;
    seen = true;
    // two frames, so the covered state has painted before the transition starts
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-developed'); }); });
  }

  // Set the opening frame now, before first paint, so the row never flashes six then three.
  update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
  BMH.visible(root, function (v) {
    onScreen = v;
    if (v) {
      develop();
      update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
    }
  }, '0px');
  BMH.onScroll(update);
})();
