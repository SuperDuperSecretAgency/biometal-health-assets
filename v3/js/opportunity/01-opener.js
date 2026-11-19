/* Opportunity 01 · Opener (v3, 4 Nov 2026: PLAN.md §3.5 01, WP9)                                         -z1n
   Six real films under a dark scrim, a tag naming the implant on each, and two lines over them:
   "Plates and screws first." / "Then other metal implants."
   motion 'unfold' (desktop): the stage pins for one screen. The three plates (panels 1, 3, 5) develop once on arrival
   with line one live; as you scroll, the other hardware (2, 4, 6) opens in between, each film developing up out of the
   dark and its tag coming in late in its opening. When the unfold passes inkAt, line two takes the ink (it jumps, the
   Technology cutaway's device). Scroll-linked: it reverses on scroll-up and stops with the scroll.
   Phones and portrait tablets (always 'arrive'): the 3 x 2 grid. phoneRows 'stagger': the top row develops with line
   one live; rowGapMs later the bottom row develops and line two goes live. Plays once, then still.
   The unfold is the Webflow build's of 17 Oct (embed-src-1017.html, perf/AUDIT.md opportunity-opener-unfold): the
   panels keep their final layout and move by transform, each film counter-scaled inside, and the scroll tick reads
   only BMH.rect(root) and boxes measured once per resize. The three closed films decode in quiet time (BMH.idle).
   Reduced motion: the knobs still apply; nothing moves; the CSS default is the settled frame (six films, both lines
   live, six tags). */
(function () {
  'use strict';

  var BMH = window.BMH;
  var root = document.getElementById('s-opp-opener');
  if (!root || !BMH) return;

  var KNOBS = BMH.knobs('opp-opener', {
    headline: 'firstThen', // 'firstThen': "Plates and screws first." / line two. 'candidate': "Every metal implant is a candidate."
                           // (one line, at its old size, as the client reviewed it)
    line2: 'other',        // 'firstThen' line two: 'other' "Then other metal implants." 'any' "Then any metal implant."
    lineOne: 'live',       // 'live': line one stays live when line two goes live (both live at the end, as reduced motion).
                           // 'pale': the cutaway's device in full, line one goes pale as line two takes the ink
    inkAt: 0.5,            // desktop: share of the unfold at which line two goes live (it jumps over 520 ms; reverses on the way up)
    pale: null,            // how strong the line that isn't live is, 0 to 1 (alpha of the live colour).
                           // null = the default (dark look: white at 0.28; light look: the cutaway's --ink-line-strong)
    films: '1017',         // '1017' (Andrew, 5 Nov 2026: "I want the seventeen October six region tags. It's the best."): the
                           // 17 Oct six the client reviewed, the knee replacement swapped for the thigh plate (no joint
                           // replacement in any picture). 'firstThen': plates and screws in 1-3-5, other hardware in 2-4-6
    tags: 'region',        // 'region' (Shoulder plate, Elbow pins...; Andrew, 5 Nov) or 'hardware' (Plate, Pins...).
                           // null = region only for '1017' under 'candidate', hardware otherwise. Our compliance pass read
                           // bones named under "first" as a list of indications (PLAN Q3, checklist §4.5): README
    slot6: 'hip',          // 'firstThen' panel 6: 'hip' the hip screw, 'shin' the shin nail (the 375 call is in NOTES.md)
    phoneRows: 'together', // all six the same way (Garett via Diane, 19 Nov 2026; Andrew: "bring all six X-rays in the same way"). phones: 'stagger' = the top row with line one, then the bottom row with line two.
                           // 'together' = all six, left to right, 0.14 s apart (as built)
    rowGapMs: 900,         // 'stagger': ms from the top row to the bottom row and line two
    look: BMH.look,        // 'dark': the dark hero (the main site). 'light': light films, a pale shade, navy type and tags
                           // (the film knob then does nothing). Default: the site's look
    film: 'dark',          // 'dark': the films in their natural dark form, metal glowing pale. 'light': the site's light films, heavier scrim
    scrim: null,           // how strong the even scrim over every film is, 0 to 1. null = the default (dark 0.3, light film 0.7, light look 0)
    shade: null,           // how strong the shade behind the headline is, 0 to 1. null = the default (dark 0.62, light film 0.55, light look 0.85)
    place: 'foot',         // where the headline sits: 'foot' = low on the left, 'middle' = halfway up, still left-aligned
    motion: 'arrive',      // all six the same way (19 Nov 2026; was 'unfold'). desktop: 'unfold' = pinned, three films open into six as you scroll. 'arrive' = all six, each develops once
    scrollLength: 1.0,     // 'unfold': screens of scroll the row takes to open (the stage is pinned for this long)
    order: 'left',         // 'unfold': 'left' = the new films open one after another, left to right. 'together' = all three at once
    stagger: 0.2,          // 'unfold', 'left': share of the opening between one film starting and the next
    openLength: 0.6,       // 'unfold', 'left': share of the opening one film takes
    develop: 'veil',       // 'veil': a film comes up out of the dark as it appears. 'plain': it appears already sharp
    entrance: true,        // 'unfold': the first three films develop once when the page opens. false = they are there from the start
    ghost: 0.85,           // how faint a film is before it develops: 0 = sharp, 1 = nothing but field
    developTime: 1.6,      // 'arrive' and phones: seconds one film takes to develop
    developGap: 0.14       // 'arrive' and phones: seconds between one film starting and the next in a row
  });

  // ---- the films: one record each (imagery-1017/SOURCES.md; credits in this folder's SOURCES.md, never on the page).
  // A film in the default markup takes its src from there; the two the markup doesn't carry bring their own. ----
  var XRAY = {
    'shoulder-plate': { w: 850, h: 1416, alt: 'X-ray of a shoulder with a metal plate and screws on the upper arm bone.', hardware: 'Plate', region: 'Shoulder plate' },
    'elbow-pins':     { w: 700, h: 1162, alt: 'X-ray of an elbow with crossed metal pins holding a fracture.', hardware: 'Pins', region: 'Elbow pins' },
    'thigh-plate':    { w: 850, h: 1416, alt: 'X-ray of a thigh: a metal plate and screws on the femur.', hardware: 'Plate', region: 'Thigh plate' },
    'spine-rods':     { w: 850, h: 1416, alt: 'X-ray of a lower back with screws and rods.', hardware: 'Screws and rods', region: 'Spinal screws and rods' },
    'ankle-plate':    { w: 700, h: 1166, src: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.0/v3/img/opportunity/01-opener/opportunity-hero-ankle-plate.webp',
                        alt: 'X-ray of an ankle: a plate on the fibula and a screw in the inner ankle bone.', hardware: 'Plate and screws', region: 'Ankle plate and screws' },
    'shin-nail':      { w: 535, h: 1959, src: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.0/v3/img/opportunity/01-opener/opportunity-hero-shin-nail.webp',
                        alt: 'X-ray of a shin: a metal nail down the tibia, locked with screws at each end.', hardware: 'Nail', region: 'Shin nail' },
    'hip-screw':      { w: 700, h: 1166,
                        alt: 'X-ray of a hip: a sliding screw and side plate fixing the femoral neck.',
                        alt1017: 'X-ray of a hip with a metal screw and plate fixing a fracture.', hardware: 'Screw', region: 'Hip screw' },
    'ankle-screw':    { w: 700, h: 1167, src: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.0/v3/img/opportunity/01-opener/opportunity-hero-ankle-screw.webp',
                        alt: 'X-ray of an ankle with a screw across the fibula into the tibia.', hardware: 'Screw', region: 'Ankle screw' }
  };
  var is1017 = KNOBS.films === '1017';
  var SET = is1017
    ? ['shoulder-plate', 'elbow-pins', 'spine-rods', 'hip-screw', 'thigh-plate', 'ankle-screw']
    : ['shoulder-plate', 'elbow-pins', 'thigh-plate', 'spine-rods', 'ankle-plate', KNOBS.slot6 === 'shin' ? 'shin-nail' : 'hip-screw'];
  var tagStyle = KNOBS.tags === 'region' || KNOBS.tags === 'hardware' ? KNOBS.tags
    : (is1017 && KNOBS.headline === 'candidate' ? 'region' : 'hardware');

  var panels = Array.prototype.slice.call(root.querySelectorAll('.oo-p'));
  var srcOf = {};
  panels.forEach(function (el) {
    var im = el.querySelector('.oo-img');
    if (im) srcOf[im.getAttribute('data-xray')] = im.getAttribute('src');
  });
  panels.forEach(function (el, j) {
    var im = el.querySelector('.oo-img'), name = SET[j], x = XRAY[name];
    var cell = root.querySelector('[data-oo-tagcell="' + el.getAttribute('data-oo-panel') + '"] .oo-tag');
    if (!im || !x) return;
    var src = srcOf[name] || x.src;
    if (im.getAttribute('data-xray') !== name && src) {
      im.setAttribute('width', String(x.w));
      im.setAttribute('height', String(x.h));
      im.setAttribute('data-xray', name);
      im.src = src;
    }
    var alt = (is1017 && x.alt1017) || x.alt;
    if (im.alt !== alt) im.alt = alt;
    var tag = x[tagStyle];
    if (cell && cell.textContent !== tag) cell.textContent = tag;
  });

  // ---- the headline ----
  var lineA = root.querySelector('.oo-line--a'), lineB = root.querySelector('.oo-line--b');
  var candidate = KNOBS.headline === 'candidate';
  if (candidate) {
    root.setAttribute('data-headline', 'candidate');
    if (lineA) lineA.innerHTML = 'Every metal implant is a candidate<bmh-stop>.</bmh-stop>';
    if (lineB) {
      if (lineB.previousSibling && lineB.previousSibling.nodeType === 3) lineB.parentNode.removeChild(lineB.previousSibling);
      lineB.parentNode.removeChild(lineB);
      lineB = null;
    }
  } else if (KNOBS.line2 === 'any' && lineB) {
    lineB.innerHTML = 'Then any metal implant<bmh-stop>.</bmh-stop>';
  }
  root.setAttribute('data-line-one', !candidate && KNOBS.lineOne === 'pale' ? 'pale' : 'live');

  // ---- the look: applies with or without motion ----
  var look = KNOBS.look === 'light';
  var light = !look && KNOBS.film === 'light';
  if (look) root.setAttribute('data-look', 'light');
  if (light) root.setAttribute('data-film', 'light');
  if (KNOBS.place === 'middle') root.setAttribute('data-place', 'middle');
  root.style.setProperty('--oo-scrim', String(KNOBS.scrim != null ? KNOBS.scrim : (look ? 0 : light ? 0.7 : 0.3)));
  root.style.setProperty('--oo-shade', String(KNOBS.shade != null ? KNOBS.shade : (look ? 0.85 : light ? 0.55 : 0.62)));
  if (KNOBS.pale != null) root.style.setProperty('--oo-pale', (look ? 'rgb(10 31 58 / ' : 'rgb(255 255 255 / ') + KNOBS.pale + ')');

  if (BMH.reduced) return;

  var track = root.querySelector('.oo-track');
  var all = panels.map(function (el) {
    return {
      el: el, img: el.querySelector('.oo-img'), veil: el.querySelector('.oo-veil'),
      tag: root.querySelector('[data-oo-tagcell="' + el.getAttribute('data-oo-panel') + '"]'),
      fresh: el.getAttribute('data-oo-film') === 'new', last: -1, g: 1, X: -1, w: -1, xf: 0, fit: null
    };
  });
  if (!track || all.length !== 6 || all.some(function (p) { return !p.veil || !p.img; })) return;
  var firsts = all.filter(function (p) { return !p.fresh; });
  var fresh = all.filter(function (p) { return p.fresh; });

  var plain = KNOBS.develop === 'plain';
  if (plain) root.classList.add('is-plain');
  root.style.setProperty('--oo-ghost', String(KNOBS.ghost));
  root.style.setProperty('--oo-dev', KNOBS.developTime + 's');

  // ---- when each film develops in 'arrive' (phones), and when line two goes live ----
  // stagger: the top row 0.14 s apart, then rowGapMs later the bottom row, and line two with it.
  // together (as built): left to right as the eye reads the grid, top row then bottom, 0.14 s apart; line two with the bottom row.
  // Desktop 'arrive' (a knob): left to right along the row; line two at rowGapMs.
  function arriveOrder(stacked) {
    var gap = KNOBS.developGap, row = KNOBS.rowGapMs / 1000, together = KNOBS.phoneRows === 'together';
    all.forEach(function (p, j) {
      var d;
      if (!stacked) d = j * gap;
      else if (together) d = (p.fresh ? 3 + fresh.indexOf(p) : firsts.indexOf(p)) * gap;
      else d = p.fresh ? row + fresh.indexOf(p) * gap : firsts.indexOf(p) * gap;
      d = d.toFixed(3) + 's';
      p.el.style.setProperty('--oo-delay', d);
      if (p.tag) p.tag.style.setProperty('--oo-delay', d);
    });
    root.style.setProperty('--oo-ink-delay', (stacked && together ? 3 * gap : row).toFixed(3) + 's');
  }

  // Perf (Webflow, 17 Oct): geo = the row's size and the final panel width B, measured once per resize (with the track's
  // height); the scroll tick reads only BMH.rect(root), the box core.js measures before any section writes a style.
  var mode = null, seen = false, onScreen = true, lastSize = '', geo = null, trackH = 0, dirty = true, inkNow = -1;

  function off(v, free) {
    if (!v) return free * 0.5;
    if (v.slice(-1) === '%') return free * parseFloat(v) / 100;
    return parseFloat(v) || 0;
  }

  // fit(): size the film's box to the whole picture at the cover scale of the widest window this panel shows (the first
  // films: a third of the row at the start; the others: their final width), and remember its object-position.
  function fit(p) {
    var im = p.img;
    p.fit = null;
    if (!geo || !im || !(im.naturalWidth > 0 && im.naturalHeight > 0)) return;
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var pos = getComputedStyle(im).objectPosition.split(/\s+/);
    var s = Math.max((p.fresh ? geo.B : geo.w0) / iw, geo.H / ih);
    p.fit = { iw: iw, ih: ih, px: pos[0], py: pos[1], s: s };
    im.style.width = (iw * s) + 'px';
    im.style.height = (ih * s) + 'px';
    im.setAttribute('data-oo-fit', '');
  }

  function measure() {
    var rr = all[0].el.parentNode.getBoundingClientRect();
    if (!(rr.width > 0 && rr.height > 0)) { geo = null; return; }
    var gut = parseFloat(getComputedStyle(root).getPropertyValue('--oo-gutter')) || 0;
    geo = { W: rr.width, H: rr.height, gut: gut, B: (rr.width - 5 * gut) / 6, w0: (rr.width - 2 * gut) / 3 };
    all.forEach(function (p, j) { p.xf = j * (geo.B + gut); p.X = -1; p.w = -1; fit(p); });
    dirty = true;
  }

  // place(): show panel p as the window [X, X + w] of the row. The panel's final box (left xf, width B) is translated and
  // scaled across; its film gets the inverse horizontal scale, then the scale and offset object-fit: cover would give a
  // box w wide, so on screen the film is never stretched. Under a quarter pixel the panel is simply closed.
  function place(p, X, w) {
    if (!dirty && Math.abs(X - p.X) < 0.002 && Math.abs(w - p.w) < 0.002) return;
    p.X = X; p.w = w;
    var B = geo.B, dx = (X - p.xf).toFixed(3);
    if (w < 0.25) { p.el.style.transform = 'matrix(0,0,0,1,' + dx + ',0)'; return; }
    p.el.style.transform = 'matrix(' + (w / B).toFixed(5) + ',0,0,1,' + dx + ',0)';
    var f = p.fit;
    if (!f) return;
    var s = Math.max(w / f.iw, geo.H / f.ih), k = s / f.s;
    var ox = off(f.px, w - f.iw * s), oy = off(f.py, geo.H - f.ih * s);
    p.img.style.transform = 'matrix(' + (k * B / w).toFixed(5) + ',0,0,' + k.toFixed(5) + ',' + (ox * B / w).toFixed(3) + ',' + oy.toFixed(3) + ')';
  }

  // frame(): the flex layout the v2 CSS asked for (flex: g 1 0px, margin-left: gutter x g), solved in script for the six
  // openness values g (first films 1, the others smooth(0, 1, progress), the value the tag cells' --w carries).
  function frame() {
    var G = 0, M = 0, x = 0, j, p, w;
    for (j = 0; j < 6; j++) { G += all[j].g; if (j) M += geo.gut * all[j].g; }
    for (j = 0; j < 6; j++) {
      p = all[j];
      if (j) x += geo.gut * p.g;
      w = (geo.W - M) * p.g / G;
      place(p, x, w);
      x += w;
    }
    dirty = false;
  }

  function setInk(v) {
    if (v === inkNow) return;
    inkNow = v;
    root.style.setProperty('--oo-live', String(v));
  }

  function layout(vw, vh) {
    var size = vw + 'x' + vh;
    if (size === lastSize) return;
    lastSize = size;
    var stacked = getComputedStyle(root).getPropertyValue('--oo-stacked').trim() === '1';
    var m = (stacked || KNOBS.motion === 'arrive') ? 'arrive' : 'unfold';
    arriveOrder(stacked);
    if (m !== mode) {
      mode = m;
      root.classList.toggle('is-unfold', m === 'unfold');
      root.classList.toggle('is-pinned', m === 'unfold');
      root.classList.toggle('is-arrive', m === 'arrive');
      root.classList.toggle('is-entrance', m === 'unfold' && KNOBS.entrance !== false);
      track.style.height = m === 'unfold' ? ((1 + KNOBS.scrollLength) * 100) + 'vh' : '';
      all.forEach(function (p) {
        p.last = -1;
        p.g = 1;
        if (p.tag) p.tag.style.removeProperty('--w');
        p.veil.style.transform = '';
        p.el.style.transform = '';
        p.img.style.transform = ''; p.img.style.width = ''; p.img.style.height = ''; p.img.removeAttribute('data-oo-fit');
      });
      // the arrive states carry line two's ink in CSS; the unfold sets it from the scroll
      root.style.removeProperty('--oo-live');
      inkNow = -1;
    }
    if (mode === 'unfold') { trackH = track.offsetHeight; measure(); }
  }

  // unfold: w 0 = closed, 1 = open
  function apply(p, w) {
    w = Math.round(w * 1000) / 1000;
    if (w === p.last) return false;
    p.last = w;
    var ws = BMH.smooth(0, 1, w).toFixed(4);
    p.g = parseFloat(ws);
    if (p.tag) p.tag.style.setProperty('--w', ws);
    if (!plain) {
      var dev = BMH.smooth(0.12, 1, w);     // the film develops a beat behind the opening
      p.veil.style.transform = 'translate3d(0,' + (-60 * dev).toFixed(2) + '%,0)';
    }
    return true;
  }

  function update(st) {
    layout(st.vw, st.vh);
    if (!onScreen || mode !== 'unfold') return;
    var r = BMH.rect(root);
    var t = BMH.clamp(-r.top / Math.max(1, trackH - st.vh), 0, 1);
    var together = KNOBS.order === 'together', moved = dirty;
    fresh.forEach(function (p, i) {
      if (apply(p, together ? t : BMH.clamp((t - i * KNOBS.stagger) / KNOBS.openLength, 0, 1))) moved = true;
    });
    if (moved && geo) frame();
    setInk(lineB && t > 0 && t >= KNOBS.inkAt ? 1 : 0);
  }

  // a film still loading is measured and placed when it arrives
  all.forEach(function (p) {
    if (!(p.img.complete && p.img.naturalWidth > 0)) p.img.addEventListener('load', function () {
      if (mode !== 'unfold' || !geo) return;
      fit(p);
      dirty = true;
      if (onScreen) frame();
    });
  });

  // arrive, and unfold's entrance: develop once, the first time the hero is on screen
  function develop() {
    if (seen) return;
    seen = true;
    // two frames, so the covered state has painted before the transition starts
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-developed'); }); });
  }

  // Set the opening frame now, before first paint, so the row never flashes six then three and line two never flashes live.
  update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
  // the ink's 'jump' transition only once that frame has painted, so it never plays on load
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-ink'); }); });
  // the three closed films decode in quiet time, so the first scroll that opens them doesn't wait on a decode
  if (mode === 'unfold') BMH.idle(function () {
    fresh.forEach(function (p) { if (p.img.decode) p.img.decode().catch(function () {}); });
  });
  BMH.visible(root, function (v) {
    onScreen = v;
    if (v) {
      develop();
      update({ y: window.scrollY, vh: window.innerHeight, vw: window.innerWidth });
    }
  }, '0px');
  BMH.onScroll(update);
})();
