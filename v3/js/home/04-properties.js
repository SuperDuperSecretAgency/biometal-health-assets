/* 04 · Four properties — the bone animation.                                    -z1n

   r11 (18 Nov 2026, Jerry: "Calm inflammation" is "too risky for FDA", remove completely; "DON'T CHANGE
   ANIMATION – it's very good"): four steps, not five. The inflammation step is gone from the copy, the rail
   and the scene: its scroll window is cut and the heat on the break never shows (knob inflammation 'none').
   The other four steps play exactly as before, each keeping its own window; the story's step numbers below
   are the old ones mapped onto the new (old 3, 4, 5 are now 2, 3, 4). The steps carry headline and subline
   only (the mono term is gone); copy() wipes whatever lines a step has.

   One scroll variable. Every property of the shot (camera, gap, tint, halo, new bone, plate
   surface, particles, dissolve, screw holes) is a continuous function of u, so scrubbing finds
   no cut. u runs 0 .. L in "steps": an opening hold, NSTEP (4) steps of one unit each, an end hold.
   Copy and rail ride the same u. Renders only when u changes and the section is on screen.

   v3 (4 Nov 2026, PLAN.md §3.1 04 and WP3):
     - THE NUMERALS (Koji, 31 Oct: "place the numbers in the right-side boxes and also add the
       corresponding numbers to the animations on the left, so the sequence is easier to follow").
       The rail and the steps carry them in the markup; on the scene one numeral at a time
       (.seq-n--mark) sits by the thing its step names, at a point in the bone's or the plate's
       millimetres projected each frame (the same call the step-two glow uses), offset a little up
       and left, kept inside the band between the headline and the copy, wiped on and off with its
       step's words. Knobs numbers, tickPx, numberSize, numberTint.
     - SPEED, ported from the Webflow build of 17 Oct (webflow-v2-z1n/build/home/03-properties/
       embed.src.js, perf/AUDIT.md home-properties-warmup). Nothing drawn changes; only when the work
       happens: once the models arrive the scene is built in BMH.idle jobs (quiet moments: no scroll,
       nothing busy, so after the hero's entrance), a step at a time, the specks a few milliseconds at
       a time; then, still off screen, it is warmed: sized, posed at the current u, every shader
       compiled and drawn once, so the first frame you see compiles and resizes nothing. Within a
       screen of the viewport, whatever is left runs at once. Each tick reads the track, canvas and
       band through BMH.rect (measured before any section writes a style that frame); boxes and the
       numeral's safe rect are cached on resize. No throwaway probe canvas.
     - The phone switch is matchMedia('(max-width: 760px)'), this section's own CSS breakpoint. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('properties', {
    /* scroll */
    scrollPerStep: 1.0,     /* viewports of scroll per property */
    openHold: 0.5,          /* steps of scroll held on the opening frame */
    endHold: 0.6,           /* steps of scroll held on the healed bone */
    wipe: 0.16,             /* how long a copy change takes, in steps */

    /* camera */
    turn: 24,               /* degrees the camera travels round the bone over the section. 0 = fixed side view, 90 = quarter-turn */
    yaw: -10,               /* where that travel is centred: negative looks from the left end */
    elevation: [24, 14],    /* degrees above the bone, start -> end */
    tilt: [5, 24],          /* the bone's angle on screen, degrees, rising to the right: [desktop, phone] */
    fov: 22,
    frame: [150, 84, 205],       /* desktop: mm of bone across the stage at the opening, closest (steps 1-4), end (whole bone) */
    framePhone: [100, 56, 200],  /* the same on phones (70 held the larger 2.86 plate in frame) */
    stageX: 0.5,            /* where the plate sits across the stage, 0..1 */

    /* the story */
    boneLength: 3.6,        /* the bone's length in plate lengths. 3.6 is the relation approved on 17 Sep, confirmed by Andrew on 25 Sep after trying 2.86. Lower makes the plate bigger on the bone */
    seatRaise: 8,           /* degrees the plate is turned up round the bone from its flattest seat, re-seated there: higher reads more centred on the bone from the camera */
    gapMM: 2.4,             /* how wide the break is at the opening */
    screwHoles: 'outer',    /* 'outer' or 'inner' plate holes take the two screws */
    haloReachMM: 8,         /* how far the step-one halo travels off the plate */
    haloStrength: 0.55,     /* how visible the halo is at its peak, 0..1 */
    specks: 30,             /* how many specks the halo clears */

    /* step two: how the inflammation shows, then calms.
       'a' heat on the bone: a red core at the break, amber round it, cooling to plain bone.
       'b' a warm glow round the break, swollen at first, then shrinking away.
       'c' hot spots round the break; zinc spreads off the plate and puts them out one by one. */
    inflammation: 'none',   /* r11: 'none', the step is cut and the break never shows heat. 'a' | 'b' | 'c' keep their look (unused) */
    warmBefore: 0.35,       /* how inflamed the break looks before step two, 0..1. It peaks as step two begins */
    heatWidthMM: 11,        /* (a, c) how far the heat spreads along the bone from the break */
    heatGlow: 0.5,          /* (a, c) how much the heat glows rather than stains, 0..1 */
    auraMM: [21, 14],       /* (b) the glow's size at its most swollen: along the bone, across it */
    auraShrink: 0.45,       /* (b) its size as it fades, as a share of the swollen size */
    embers: 26,             /* (c) how many hot spots. The zinc puts them out evenly across the step */
    emberMM: [2.4, 4.2],    /* (c) their size, smallest to largest, glow included */
    heatColors: ['#F3AA5B', '#EE7B36', '#DC3A26'],   /* amber, orange, red: a heat map, never blood */

    callusMM: 1.1,          /* how far new bone swells round the break */
    creepMM: 0.85,          /* how far new bone creeps onto the plate's edges */
    particles: 700,         /* step four */

    /* look */
    /* material colours, read as sRGB (BMH.color). Same look as round 2, which read them as linear */
    boneColor: '#F3EEE3',   /* matte ivory. A material colour, not a brand token */
    boneCutColor: '#E8E0D3',
    boneCanalColor: '#CDC5B6',
    newBoneColor: '#F7F4EC',
    speckColor: '#7E6F5B',
    envTurn: -30,             /* degrees the room is turned round the bone: moves the soft light on it */
    /* The studio the metal mirrors: white seamless all round, as the product photographs were shot.
       Radiance values. The plate's face mirrors the softbox behind the camera. */
    studio: {
      room: 0.4,            /* the room round the part, at the horizon */
      zenith: 0.34,
      floor: 0.8,           /* the lit seamless under the part: the near wall and the cones' far side */
      front: 1.0,           /* the softbox behind the camera: how bright the plate's face reads */
      frontFade: 0.45,      /* how far it dims toward the right: the sheen that runs along the plate */
      top: 0.95,            /* the overhead softbox: the highlight on the plate's upper edge */
      strip: 1.4            /* a narrow strip to the left: the streak in the countersinks */
    },
    exposure: 0.84,
    keyLight: 3.2,
    fill: 0.9,              /* the soft sky/ground light */
    boneEnv: 0.28,          /* how much of the studio room the bone sees; low keeps it matte and modelled */
    edge: 0.34,             /* how much the bone darkens toward its silhouette, so it holds on white */
    maxDpr: 2,

    /* the numerals (v3) */
    numbers: 'headline',    /* 'headline' (Andrew, 5 Nov 2026): each step's numeral is part of its headline, in the headline's own
                               font ("1. Fights infection"), and on the rail; nothing on the scene. 'rail+canvas' (4 Nov): on the
                               rail and, one at a time, on the scene. 'rail': the rail only (and the phone's steps). 'off': none */
    numberOffset: [-36, -32],  /* px from the point a numeral names to the numeral's centre: a little up and left */
    tickPx: 0,              /* 0: the numeral alone. 14: a 14 px hairline from it toward the point it names */
    numberSize: null,       /* a CSS length for the scene's and the steps' numerals. null: .seq-n's clamp(1.125rem, 1.6vw, 1.5rem) */
    numberLast: true,       /* step 5's numeral on the scene. true (PLAN §3.1 04): it wipes on with step 5's words at the plate's centre and outlives the plate. false: not drawn (the step's own numeral stays) */
    numberTint: '--text',   /* '--text' or '--brand': the scene's and the steps' numerals (the rail keeps its label colours) */

    /* reduced motion: the moment each still is taken, in u */
    stills: [1.05, 2.45, 3.05, 5.1],   /* r11: four steps (was 1.05, 1.95, 3.45, 4.05, 6.1 with the inflammation step) */

    /* the headline (5 Nov 2026: Andrew asked for cleaner options; board v3-props-headline).
       null: the markup's. A string replaces the H2's text */
    headline: null
  });
  var INFL = ({ a: 'INFL_A', b: 'INFL_B', c: 'INFL_C' })[KNOBS.inflammation] || 'INFL_A';

  var BMH = window.BMH;
  var root = document.getElementById('s-properties');
  if (!root || !BMH) return;

  if (typeof KNOBS.headline === 'string' && KNOBS.headline) {
    var headEl = root.querySelector('.props__h');
    if (headEl) headEl.textContent = KNOBS.headline;
  }

  var clamp = BMH.clamp, lerp = BMH.lerp, smooth = BMH.smooth;
  var RAD = Math.PI / 180;

  /* ---- the plate: v2, measured (BMH.PLATE_V2; model-plate-v2-z1n/SPEC.md §2, platelib.py) ----
     Plate-local millimetres: X along, +Y up off the seating face, Z across. The plan outline is
     real arcs: end lobe, concave neck fillet, inner lobe, concave waist fillet, straight bridge. */
  var PV = BMH.PLATE_V2 || { lengthMm: 57.786, widthMm: 9.068, thicknessMm: 1.815, holesXmm: [-24.359, -12.124, 12.124, 24.359], coneBottomYmm: 1.280, coneTopRmm: 3.194, boreRmm: 2.165, blob: 'glb-plate-v2-hi' };
  var PG = (function () {
    var K = 4.00 / 4.345;                                       /* platelib.py's millimetre ruler */
    var g = { T: PV.thicknessMm, HL: PV.lengthMm / 2, R: PV.widthMm / 2,
              XO: PV.holesXmm[3], XI: PV.holesXmm[2],
              W: 2.808 * K, RN: 6.28 * K, RW: 2.46 * K,         /* bridge half-width, neck and waist fillets */
              CT: PV.coneTopRmm, CB: PV.coneBottomYmm, BR: PV.boreRmm };
    var d = g.XO - g.XI, d1 = g.R + g.RN;
    g.FN = [(g.XO + g.XI) / 2, Math.sqrt(d1 * d1 - d * d / 4)];  /* neck fillet centre */
    var dw = g.R + g.RW, fq = g.W + g.RW;
    g.FW = [g.XI - Math.sqrt(dw * dw - fq * fq), fq];           /* waist fillet centre */
    function u(a, b) { var x = b[0] - a[0], y = b[1] - a[1], l = Math.hypot(x, y); return [x / l, y / l]; }
    var C1 = [g.XO, 0], C2 = [g.XI, 0];
    g.fnC2 = u(g.FN, C2); g.fnC1 = u(g.FN, C1); g.c2Fn = u(C2, g.FN); g.c2Fw = u(C2, g.FW);
    g.fwC2 = u(g.FW, C2); g.c1Fn = u(C1, g.FN);
    return g;
  })();
  /* the screw head's rim (r 2.80, 9.75 mm up the screw: model-screw-z1n/screwlib.py) bears on the
     125-degree cone; the shallower underside inside it stays clear of the cone */
  var SCREW_SEAT = PG.CB + (2.8 - PG.BR) * (PG.T - PG.CB) / (PG.CT - PG.BR);
  var plateK = 1;          /* plate mm -> bone mm, set from KNOBS.boneLength once the bone is loaded */
  var NSTEP = 4;            /* r11: the inflammation step is cut */
  var O = KNOBS.openHold, L = KNOBS.openHold + NSTEP + KNOBS.endHold;

  var track = root.querySelector('.props__track');
  var canvas = root.querySelector('.props__stage');
  var bandEl = root.querySelector('.props__band');
  var steps = [].slice.call(root.querySelectorAll('.props__step'));
  var labels = [].slice.call(root.querySelectorAll('.props__rail-label'));
  var railFill = root.querySelector('.props__rail-fill');
  var btn = root.querySelector('.props__btn');
  var mark = root.querySelector('.seq-n--mark');
  var tick = root.querySelector('.props__tick');
  var stepNums = [].slice.call(root.querySelectorAll('.seq-n--step'));
  var mqPhone = window.matchMedia('(max-width: 760px)');                 /* this section's CSS breakpoint */
  var mqShort = window.matchMedia('(orientation: landscape) and (max-height: 480px)');   /* a phone on its side: section.css's short block */

  /* the numerals' knobs: which show (CSS keys on data-numbers), their size and tint, the hairline */
  root.setAttribute('data-numbers', KNOBS.numbers);
  var markOn = KNOBS.numbers === 'rail+canvas' && !!mark;
  var tickOn = markOn && !!tick && KNOBS.tickPx > 0;
  [mark, tick].concat(stepNums).forEach(function (el) {
    if (!el) return;
    if (KNOBS.numberSize && el !== tick) el.style.fontSize = KNOBS.numberSize;
    if (KNOBS.numberTint && KNOBS.numberTint !== '--text') el.style.color = 'var(' + KNOBS.numberTint + ')';
  });
  if (tickOn) { root.classList.add('has-tick'); tick.style.width = KNOBS.tickPx + 'px'; }

  /* no probe context: BMH.renderer throws when WebGL can't start, and every build runs in a promise chain that catches it */
  var hasGL = !!window.THREE && ('WebGLRenderingContext' in window);

  /* step k, fraction a..b of its window -> 0..1. k is the story's old numbering (1..5, 2 the inflammation step, cut in
     r11): steps 3..5 play in windows 2..4, so each keeps its own motion exactly. */
  function S(u, k, a, b) { var w = k >= 3 ? k - 1 : k; return smooth(O + w - 1 + a, O + w - 1 + b, u); }

  /* ======================================================================
     The story as functions of u
     ==================================================================== */
  function story(u) {
    var s = {};
    var h = S(u, 1, 0.06, 0.82);
    s.haloR = 0.15 + h * KNOBS.haloReachMM;
    s.haloAmp = smooth(0.0, 0.10, h) * (1 - smooth(0.42, 1.0, h));
    s.haloLift = h;
    s.sheen = smooth(0.0, 0.08, h) * (1 - smooth(0.12, 0.45, h));
    /* step two. The break is a little inflamed from the start; it flares as step two's words land,
       then calms. (a) and (b) calm everywhere at once; in (c) the zinc front does the calming. */
    var flare = lerp(KNOBS.warmBefore, 1, S(u, 1, 0.70, 1.08));
    if (KNOBS.inflammation === 'none') {
      s.infl = 0; s.front = -9; s.embersOn = 0; s.halo2Amp = 0;
    } else if (KNOBS.inflammation === 'c') {
      var f = S(u, 2, 0.12, 0.84);
      s.infl = flare * (1 - S(u, 2, 0.80, 1.0));
      s.front = frontAt(f);
      s.embersOn = S(u, 1, 0.55, 1.0);
      s.halo2R = Math.max(0, s.front + 0.2);
      s.halo2Amp = smooth(0.0, 0.08, f) * (1 - smooth(0.6, 1.0, f));
      s.halo2Lift = f;
    } else {
      s.infl = flare * (1 - S(u, 2, 0.18, 0.86));
      s.front = -9; s.embersOn = 0; s.halo2Amp = 0;
    }
    s.gap = KNOBS.gapMM * (1 - S(u, 3, 0.04, 0.62));
    s.callus = S(u, 3, 0.05, 0.85) * (1 - S(u, 5, 0.45, 1.25));
    s.seam = S(u, 3, 0.30, 0.90);
    s.creep = S(u, 3, 0.22, 0.96) * KNOBS.creepMM;
    s.soft = S(u, 4, 0.05, 0.62);
    s.p4 = u - (O + 2);              /* particle clock, step-four units (old step four, now step three) */
    s.dissolve = S(u, 5, 0.03, 0.46);
    /* where each screw was, new bone fills in (pale, never a dark hole) and is gone as the plate goes */
    s.holeR = 1.8 * plateK * (1 - S(u, 5, 0.26, 0.50));   /* bone mm; just under the 2.0 mm thread radius */
    s.footprint = S(u, 5, 0.15, 0.42) * (1 - S(u, 5, 0.5, 0.95));
    return s;
  }

  /* (c) where the zinc front is, mm off the plate's edge, at step-two progress f. It speeds up
     and slows down so the hot spots go out one at a time, evenly, whatever their spacing. */
  var emberD = [];
  function frontAt(f) {
    var n = emberD.length;
    if (!n) return f * 8;
    var k = f * (n + 1), i = Math.floor(k), t = k - i;
    var a = i === 0 ? -0.6 : i > n ? emberD[n - 1] + 1.6 : emberD[i - 1] + 0.55;
    var b = i >= n ? emberD[n - 1] + 1.6 : emberD[i] + 0.55;
    return lerp(a, b, t);
  }

  /* the camera's framing width (mm across the stage) as a function of u, and how wide that
     is between the closest (0) and the end (1) */
  function framing(u, phone) {
    var f = phone ? KNOBS.framePhone : KNOBS.frame;
    var k = [[0, f[0]], [O + 0.75, f[1] * 1.08], [O + NSTEP - 0.8, f[1]], [O + NSTEP + 0.3, f[2]]];   /* r11: was O + 4.2, O + 5.3 */
    var W = k[k.length - 1][1];
    if (u <= k[0][0]) W = k[0][1];
    else for (var i = 1; i < k.length; i++) {
      if (u <= k[i][0]) { W = lerp(k[i - 1][1], k[i][1], smooth(k[i - 1][0], k[i][0], u)); break; }
    }
    return { W: W, wide: clamp((W - f[1]) / (f[2] - f[1]), 0, 1) };
  }

  /* ======================================================================
     Copy and rail: a soft vertical edge sweeps left to right; left of it is the
     new step, right of it the old. Same u, so it reverses on scroll-up.
     ==================================================================== */
  var lines = steps.map(function (li) { return [li.querySelector('.props__word'), li.querySelector('.props__term'), li.querySelector('.props__line')].filter(Boolean); });
  var lastMask = [];
  function maskFor(pIn, pOut) {
    var s = 0.22;
    var eIn = -s + pIn * (1 + 2 * s), eOut = -s + pOut * (1 + 2 * s);
    var A = eOut - s / 2, B = eOut + s / 2, C = eIn - s / 2, D = eIn + s / 2;
    if (C <= B + 0.001) return 'linear-gradient(90deg, transparent, transparent)';
    if (A <= -s && D >= 1 + s) return 'none';
    function p(x) { return (x * 100).toFixed(2) + '%'; }
    return 'linear-gradient(90deg, transparent ' + p(A) + ', #000 ' + p(B) + ', #000 ' + p(C) + ', transparent ' + p(D) + ')';
  }
  function setMask(el, i, m) {
    if (lastMask[i] === m) return;
    lastMask[i] = m;
    el.style.webkitMaskImage = m; el.style.maskImage = m;
  }
  function copy(u) {
    var W = KNOBS.wipe;
    for (var k = 0; k < NSTEP; k++) {
      var uIn = k === 0 ? O * 0.55 : O + k, uOut = k === NSTEP - 1 ? 1e9 : O + k + 1;
      for (var j = 0; j < lines[k].length; j++) {
        /* the old line is wiped off, then the new one wiped on, in the same place; lines stagger */
        var lag = j * 0.04;
        var pIn = clamp((u - (uIn + lag)) / (W / 2), 0, 1);
        var pOut = clamp((u - (uOut - W / 2 + lag)) / (W / 2), 0, 1);
        setMask(lines[k][j], k * 3 + j, maskFor(pIn, pOut));
      }
    }
    var bIn = clamp((u - (O + NSTEP)) / (W / 2), 0, 1);
    setMask(btn, 99, maskFor(bIn, 0));
    root.classList.toggle('is-end', bIn > 0.02);

    var on = u < O * 0.55 ? -1 : clamp(Math.floor(u - O + 0.001), 0, NSTEP - 1);
    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.toggle('is-on', i === on);
      labels[i].style.setProperty('--seg', clamp(u - O - i, 0, 1).toFixed(3));
    }
    railFill.style.transform = 'scaleY(' + clamp((u - O) / NSTEP, 0, 1).toFixed(4) + ')';
  }

  labels.forEach(function (el, i) {
    el.addEventListener('click', function () {
      var r = box(track), span = r.height - BMH.vh();
      var top = window.scrollY + r.top + span * ((O + i + 0.62) / L);
      window.scrollTo({ top: top, behavior: BMH.reduced ? 'auto' : 'smooth' });
    });
  });

  /* ======================================================================
     Shared GLSL
     ==================================================================== */
  var GLSL_COMMON = [
    'float bmhH3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }',
    'float bmhNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);',
    '  return mix(mix(mix(bmhH3(i), bmhH3(i+vec3(1,0,0)), f.x), mix(bmhH3(i+vec3(0,1,0)), bmhH3(i+vec3(1,1,0)), f.x), f.y),',
    '             mix(mix(bmhH3(i+vec3(0,0,1)), bmhH3(i+vec3(1,0,1)), f.x), mix(bmhH3(i+vec3(0,1,1)), bmhH3(i+vec3(1,1,1)), f.x), f.y), f.z); }',
    /* the plate's outline (v2), plate-local mm: x along, y across. Signed distance, <0 inside.
       Exact: the nearest of the quadrant's five pieces, signed by an inside test. */
    'bool bmhWedge(vec2 q, vec2 a, vec2 b){ float s = a.x*b.y - a.y*b.x; return (a.x*q.y - a.y*q.x)*s >= 0.0 && (q.x*b.y - q.y*b.x)*s >= 0.0; }',
    'float bmhArc(vec2 p, vec2 c, float r, vec2 a, vec2 b){ vec2 q = p - c;',
    '  return bmhWedge(q, a, b) ? abs(length(q) - r) : min(length(q - a*r), length(q - b*r)); }',
    'float bmhPlate(vec2 p){ p = abs(p);',
    '  const vec2 C1 = vec2(' + f4(PG.XO) + ', 0.0), C2 = vec2(' + f4(PG.XI) + ', 0.0);',
    '  const vec2 FN = ' + v2(PG.FN) + ', FW = ' + v2(PG.FW) + ';',
    '  const float R = ' + f4(PG.R) + ', RN = ' + f4(PG.RN) + ', RW = ' + f4(PG.RW) + ', W = ' + f4(PG.W) + ';',
    '  float d = length(p - vec2(min(p.x, FW.x), W));',
    '  d = min(d, bmhArc(p, FW, RW, vec2(0.0, -1.0), ' + v2(PG.fwC2) + '));',
    '  d = min(d, bmhArc(p, C2, R, ' + v2(PG.c2Fn) + ', ' + v2(PG.c2Fw) + '));',
    '  d = min(d, bmhArc(p, FN, RN, ' + v2(PG.fnC2) + ', ' + v2(PG.fnC1) + '));',
    '  d = min(d, bmhArc(p, C1, R, vec2(1.0, 0.0), ' + v2(PG.c1Fn) + '));',
    '  bool inside = length(p - C1) < R || length(p - C2) < R || (p.y < W && p.x < C2.x)',
    '    || (bmhWedge(p - FN, ' + v2(PG.fnC2) + ', ' + v2(PG.fnC1) + ') && length(p - FN) > RN)',
    '    || (bmhWedge(p - FW, vec2(0.0, -1.0), ' + v2(PG.fwC2) + ') && length(p - FW) > RW);',
    '  return inside ? -d : d; }',
    /* how far in from the edge the plate counts as fully "inside" when it dissolves */
    '#define PLATE_CORE ' + f4(PG.R * 0.84),
    /* the holes: centres, bore radius, cone foot height, cone top radius, thickness */
    '#define PL_XO ' + f4(PG.XO), '#define PL_XI ' + f4(PG.XI), '#define PL_BR ' + f4(PG.BR),
    '#define PL_CB ' + f4(PG.CB), '#define PL_CT ' + f4(PG.CT), '#define PL_T ' + f4(PG.T)
  ].join('\n');
  function f4(x) { return x.toFixed(4); }
  function v2(a) { return 'vec2(' + f4(a[0]) + ', ' + f4(a[1]) + ')'; }

  /* step two (b): the glow as a screen-space ellipse along the bone, in display colour and alpha */
  var GLSL_AURA = [
    'uniform float uAura; uniform vec2 uAuraC, uAuraAx, uAuraR; uniform vec3 uGlow0, uGlow1, uGlow2;',
    'vec4 bmhAura(vec2 fc){',
    '  vec2 q = fc - uAuraC;',
    '  vec2 e = vec2(dot(q, uAuraAx), dot(q, vec2(-uAuraAx.y, uAuraAx.x))) / uAuraR;',
    '  float g = uAura * exp(-2.0 * pow(dot(e, e), 1.4));',   /* flat-topped, quick soft edge */
    '  vec3 c = mix(uGlow0, uGlow1, smoothstep(0.16, 0.48, g));',
    '  c = mix(c, uGlow2, smoothstep(0.48, 0.86, g));',
    '  float dz = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;',   /* dither: no banding in the tail */
    '  return vec4(c, clamp(g * 0.8 + dz * 0.02 * step(0.004, g), 0.0, 0.8)); }'
  ].join('\n');

  /* the same outline in JS, for placing specks, particles and hot spots */
  function sdPlate(x, y) {
    x = Math.abs(x); y = Math.abs(y);
    function wedge(qx, qy, a, b) { var s = a[0] * b[1] - a[1] * b[0]; return (a[0] * qy - a[1] * qx) * s >= 0 && (qx * b[1] - qy * b[0]) * s >= 0; }
    function arc(c, r, a, b) {
      var qx = x - c[0], qy = y - c[1];
      return wedge(qx, qy, a, b) ? Math.abs(Math.hypot(qx, qy) - r)
        : Math.min(Math.hypot(qx - a[0] * r, qy - a[1] * r), Math.hypot(qx - b[0] * r, qy - b[1] * r));
    }
    var C1 = [PG.XO, 0], C2 = [PG.XI, 0], DN = [0, -1];
    var d = Math.hypot(x - Math.min(x, PG.FW[0]), y - PG.W);
    d = Math.min(d, arc(PG.FW, PG.RW, DN, PG.fwC2), arc(C2, PG.R, PG.c2Fn, PG.c2Fw),
                    arc(PG.FN, PG.RN, PG.fnC2, PG.fnC1), arc(C1, PG.R, [1, 0], PG.c1Fn));
    var inside = Math.hypot(x - C1[0], y) < PG.R || Math.hypot(x - C2[0], y) < PG.R || (y < PG.W && x < C2[0]) ||
      (wedge(x - PG.FN[0], y - PG.FN[1], PG.fnC2, PG.fnC1) && Math.hypot(x - PG.FN[0], y - PG.FN[1]) > PG.RN) ||
      (wedge(x - PG.FW[0], y - PG.FW[1], DN, PG.fwC2) && Math.hypot(x - PG.FW[0], y - PG.FW[1]) > PG.RW);
    return inside ? -d : d;
  }
  /* inside a countersink (plus a margin), at any of the four holes */
  function nearHole(x, z, m) {
    var ax = Math.abs(x);
    return Math.hypot(ax - PG.XO, z) < PG.CT + m || Math.hypot(ax - PG.XI, z) < PG.CT + m;
  }

  /* deterministic random: the same specks and particles on every machine */
  function rnd(i) {
    var h = (i * 374761393 + 668265263) | 0;
    h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* turn the studio room for everything that reflects it (r147 has no environment rotation) */
  function envRot(sh) {
    sh.uniforms.uEnvRot = U.uEnvRot;
    sh.fragmentShader = 'uniform mat3 uEnvRot;\n' + sh.fragmentShader.replace('#include <envmap_physical_pars_fragment>',
      THREE.ShaderChunk.envmap_physical_pars_fragment
        .replace('inverseTransformDirection( normal, viewMatrix )', 'uEnvRot * inverseTransformDirection( normal, viewMatrix )')
        .replace('reflectVec = inverseTransformDirection( reflectVec, viewMatrix );', 'reflectVec = uEnvRot * inverseTransformDirection( reflectVec, viewMatrix );'));
  }

  /* a hex handed to a lit material: sRGB, converted (r147 would read it as linear) */
  function col(hex) { return BMH.color ? BMH.color(hex) : new THREE.Color(hex).convertSRGBToLinear(); }

  function tokenColor(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return new THREE.Color(v || fallback);
  }

  /* ======================================================================
     The scene
     ==================================================================== */
  var renderer, scene, camera, U, plateFrame, plateC, boneC, distal, halo = [], specks, parts, embers, aura;
  var breakC, tmpV, tmpW, metalEnv;
  var screws = [];

  /* The metal's studio, in world directions: az 0 is the camera side (+Z), positive toward +X;
     el is height above the horizon. Soft-edged rectangles in (az, el) degrees, PMREM-blurred by
     the metal's own roughness. */
  function metalStudio(r) {
    var st = KNOBS.studio, s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 96, 48), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uRoom: { value: st.room }, uZen: { value: st.zenith }, uFloor: { value: st.floor },
        uFront: { value: st.front }, uFade: { value: st.frontFade }, uTop: { value: st.top }, uStrip: { value: st.strip }
      },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uRoom, uZen, uFloor, uFront, uFade, uTop, uStrip; varying vec3 vD;',
        'float box(vec2 p, vec2 c, vec2 h, float soft){ vec2 q = abs(p - c) - h; return 1.0 - smoothstep(0.0, soft, length(max(q, 0.0))); }',
        'void main(){ vec3 d = normalize(vD);',
        '  vec2 p = vec2(degrees(atan(d.x, d.z)), degrees(asin(clamp(d.y, -1.0, 1.0))));',
        '  float c = p.y >= 0.0 ? mix(uRoom, uZen, smoothstep(10.0, 80.0, p.y)) : mix(uRoom, uFloor, smoothstep(0.0, -30.0, p.y));',
        /* the face's softbox is only a little bigger than the path its reflection travels as the
           camera turns (az -10..30, el 0..14), so a rougher surface pulls in the darker room */
        '  float fr = uFront * (1.0 - uFade * smoothstep(-12.0, 34.0, p.x));',
        '  c = mix(c, fr, box(p, vec2(10.0, 7.0), vec2(22.0, 8.0), 11.0));',
        '  c = mix(c, uTop, smoothstep(52.0, 68.0, p.y));',
        '  c = mix(c, uStrip, box(p, vec2(-64.0, 16.0), vec2(4.0, 24.0), 7.0));',
        '  gl_FragColor = vec4(c * vec3(0.975, 0.99, 1.02), 1.0); }'
      ].join('\n')
    })));
    var pm = new THREE.PMREMGenerator(r);
    var tex = pm.fromScene(s, 0, 0.1, 200).texture;
    pm.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  /* The GLB's own finish, the one the hero draws: the second of the two material names core.js lists
     (BMH.PLATE_V2.materials). The screw's GLB carries the same two names. Falls back to any material. */
  function partFinish(g) {
    var mats = {}, any = null, names = (BMH.PLATE_V2 && BMH.PLATE_V2.materials) || [];
    g.scene.traverse(function (o) { if (o.isMesh) { mats[o.material.name] = o.material; any = any || o.material; } });
    return mats[names[1]] || any;
  }

  /* The scene, built in steps (speed, Webflow 17 Oct): each is one BMH.idle job; a step that returns false runs
     again in the next one. build() runs them all at once (the stills). Same work, same order as before. */
  function build(gB, gP, gS) { buildSteps(gB, gP, gS).forEach(function (f) { while (f(Infinity) === false) {} }); }
  function buildSteps(gB, gP, gS) {
    var pale, mid, hc, boneRoot, speckJob;
    return [function () {
    breakC = new THREE.Vector3(); tmpV = new THREE.Vector3(); tmpW = new THREE.Vector3();
    renderer = BMH.renderer(canvas, { alpha: true, shadows: true, maxDpr: KNOBS.maxDpr, exposure: KNOBS.exposure });
    renderer.setClearColor(0xffffff, 0);
    scene = new THREE.Scene();
    }, function () {
    scene.environment = BMH.studio(renderer);          /* the bone's room */
    }, function () {
    metalEnv = metalStudio(renderer);                  /* the plate's and screws' studio */
    camera = new THREE.PerspectiveCamera(KNOBS.fov, 1, 5, 4000);

    pale = tokenColor('--brand-pale', '#7FB6E8'); mid = tokenColor('--brand-mid', '#3D8BD3');
    hc = KNOBS.heatColors;

    U = {
      /* step two. Heat colours twice: as surface colour (linear, lit with the bone) and as
         screen colour (sRGB, laid over the finished pixel, for the glow) */
      uInfl: { value: 0 }, uHeatW: { value: KNOBS.heatWidthMM }, uHeatGlow: { value: KNOBS.heatGlow },
      uHeatK: { value: KNOBS.inflammation === 'c' ? 0.72 : 1.0 },
      uHeat0: { value: new THREE.Color(hc[0]).convertSRGBToLinear() },
      uHeat1: { value: new THREE.Color(hc[1]).convertSRGBToLinear() },
      uHeat2: { value: new THREE.Color(hc[2]).convertSRGBToLinear() },
      uGlow0: { value: new THREE.Color(hc[0]) }, uGlow1: { value: new THREE.Color(hc[1]) }, uGlow2: { value: new THREE.Color(hc[2]) },
      uFront: { value: -9 },
      uAura: { value: 0 }, uAuraC: { value: new THREE.Vector2() }, uAuraAx: { value: new THREE.Vector2(1, 0) }, uAuraR: { value: new THREE.Vector2(1, 1) },
      uCallus: { value: 0 }, uCallusH: { value: KNOBS.callusMM }, uSeam: { value: 0 },
      uNewCol: { value: col(KNOBS.newBoneColor) },
      uFrac: { value: new THREE.Vector4() },
      uPlateInv: { value: new THREE.Matrix4() },
      uHoleR: { value: 0 },
      uScrewP0: { value: new THREE.Vector3() }, uScrewP1: { value: new THREE.Vector3() }, uScrewN: { value: new THREE.Vector3() },
      uFootprint: { value: 0 }, uEdge: { value: KNOBS.edge },
      uSoft: { value: 0 }, uCreep: { value: 0 }, uCreepW: { value: 150 }, uDissolve: { value: 0 }, uSheen: { value: 0 },
      uSheenCol: { value: pale.clone() },
      uPatina: { value: col('#F5F6F6') },
      uCreepCol: { value: col(KNOBS.boneColor) },
      uEnvRot: { value: new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationY(KNOBS.envTurn * RAD)) }
    };

    /* ---- the bone ---- */
    boneRoot = gB.scene;
    boneRoot.scale.setScalar(1000);                    /* metres -> mm */
    distal = boneRoot.getObjectByName('Bone_Distal');
    var prox = boneRoot.getObjectByName('Bone_Proximal');
    distal.position.set(0, 0, 0); distal.quaternion.identity();   /* knit = 1: fragments in register */
    var boneMats = {
      bone_diagram: boneMaterial(KNOBS.boneColor, 'CORTEX'),
      bone_fracture: boneMaterial(KNOBS.boneCutColor, 'CUT'),
      bone_canal: boneMaterial(KNOBS.boneCanalColor, 'CANAL')
    };
    boneRoot.traverse(function (o) {
      if (!o.isMesh) return;
      o.material = boneMats[o.material.name] || boneMats.bone_diagram;
      o.receiveShadow = true; o.castShadow = false;
    });
    scene.add(boneRoot);
    boneRoot.updateMatrixWorld(true);

    /* ---- plate to bone: the plate and screws are drawn at plateK of their true size, so the bone
       stays KNOBS.boneLength plate lengths long. The whole scene stays in the bone's millimetres,
       so the framing, the break and every bone number are as before. ---- */
    var bb = new THREE.Box3().setFromObject(boneRoot);
    /* the bone's outline for a phone on its side (boneSpan): every few of the cortex's vertices, world mm */
    boneHull = [];
    boneRoot.traverse(function (o) {
      if (!o.isMesh || !o.material.defines || o.material.defines.CORTEX === undefined) return;
      var pa = o.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 600));
      for (var i = 0; i < pa.count; i += st) boneHull.push(new THREE.Vector3().fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld));
    });
    plateK = (bb.max.x - bb.min.x) / (KNOBS.boneLength * PV.lengthMm);
    U.uCreepW.value = 150 / (plateK * plateK);
    }, function () {

    /* ---- seat the plate: find the flattest place on the shaft across the break ---- */
    var seat = findSeat(boneRoot, PG.HL * plateK, PG.R * plateK);
    if (KNOBS.seatRaise) seat = findSeat(boneRoot, PG.HL * plateK, PG.R * plateK, seat.phi / RAD + KNOBS.seatRaise);
    var n = new THREE.Vector3(0, Math.sin(seat.phi), Math.cos(seat.phi));
    var a = new THREE.Vector3(0, Math.cos(seat.phi), -Math.sin(seat.phi));
    var zAx = new THREE.Vector3(1, 0, 0).cross(n);
    plateC = a.clone().multiplyScalar(seat.c0).addScaledVector(n, seat.h - 0.12);
    plateFrame = new THREE.Group();
    plateFrame.matrixAutoUpdate = false;
    plateFrame.matrix.makeBasis(new THREE.Vector3(1, 0, 0), n, zAx)
      .scale(new THREE.Vector3(plateK, plateK, plateK)).setPosition(plateC);
    scene.add(plateFrame);
    plateFrame.updateMatrixWorld(true);
    U.uPlateInv.value.copy(plateFrame.matrixWorld).invert();
    boneC = new THREE.Vector3(0, 0.5, 0);

    /* ---- the plate: v2's own finish (partFinish), finish map and all. Never reshaped. ---- */
    var plateMat = metalMaterial(partFinish(gP), 'PLATE');
    gP.scene.scale.setScalar(1000);
    gP.scene.traverse(function (o) {
      if (!o.isMesh) return;
      o.material = plateMat;
      o.castShadow = true; o.receiveShadow = true;
      o.customDepthMaterial = depthMaterial('PLATE');
    });
    plateFrame.add(gP.scene);

    /* ---- two screws, seated in the countersinks: the head's rim bears on the cone at
       SCREW_SEAT (1.61 mm), so the head stands 0.55 mm proud of the 1.815 mm plate ---- */
    var screwMat = metalMaterial(partFinish(gS), 'SCREW');
    var hx = KNOBS.screwHoles === 'inner' ? PG.XI : PG.XO;
    var tipY = SCREW_SEAT - 9.75 - 0.01;
    [-hx, hx].forEach(function (x, i) {
      var s = gS.scene.clone(true);
      s.scale.setScalar(1000);
      s.position.set(x, tipY, 0);
      s.rotation.y = i ? 0.62 : 0.21;
      s.traverse(function (o) {
        if (!o.isMesh) return;
        o.material = screwMat; o.castShadow = false; o.receiveShadow = true;
      });
      plateFrame.add(s);
      screws.push(s);
    });
    /* where the screws were, in bone mm, for the holes that close at the end */
    U.uScrewN.value.copy(n);
    plateFrame.localToWorld(U.uScrewP0.value.set(-hx, 0, 0));
    plateFrame.localToWorld(U.uScrewP1.value.set(hx, 0, 0));

    /* ---- light ---- */
    var key = new THREE.DirectionalLight(0xfffaf2, KNOBS.keyLight);
    key.position.copy(plateC).add(new THREE.Vector3(-70, 150, 120));
    key.target.position.copy(plateC);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 60; sc.far = 400;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    scene.add(key); scene.add(key.target);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0xb9c4d0, KNOBS.fill));

    /* ---- step one: the halo, a stack of thin sheets in the plate's plane ---- */
    var hGeo = new THREE.PlaneGeometry(PG.HL * 2 + 40, 48);
    hGeo.rotateX(-Math.PI / 2);
    for (var i = 0; i < 7; i++) {
      var m = new THREE.Mesh(hGeo, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uR: { value: 0 }, uAmp: { value: 0 }, uCol: { value: pale.clone().lerp(mid, 0.2) }, uLayer: { value: i / 6 }, uK: { value: KNOBS.haloStrength * 0.11 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: GLSL_COMMON + '\nuniform float uR, uAmp, uLayer, uK; uniform vec3 uCol; varying vec2 vP;\n' +
          'void main(){ float sd = bmhPlate(vP); float R = uR * (0.6 + 0.4*uLayer) + uLayer*0.8; float sg = 0.42 + uR*0.12;\n' +
          '  float ring = exp(-pow((sd - R)/sg, 2.0)); float a = uAmp * ring * (1.0 - 0.7*uLayer) * uK;\n' +
          '  if (a < 0.002) discard; gl_FragColor = vec4(uCol, a); }'
      }));
      m.renderOrder = 10 + i;
      halo.push(m);
      plateFrame.add(m);
    }

    speckJob = speckBuilder(boneRoot);
    }, function (ms) {
    /* ---- step one: specks near the plate, cleared as the halo passes (a slice at a time) ---- */
    var pts = speckJob.step(ms);
    if (pts === false) return false;
    specks = pts;
    plateFrame.add(specks);
    }, function () {

    /* ---- step four: particles leave the plate and sink into the bone ---- */
    parts = buildParticles(mid);
    plateFrame.add(parts);

    /* ---- step two (c): hot spots round the break ---- */
    if (INFL === 'INFL_C') { embers = buildEmbers(boneRoot, pale.clone().lerp(mid, 0.35)); plateFrame.add(embers); }

    /* ---- step two (b): the glow, drawn first behind everything; the bone lays the same glow
       over itself, so the two read as one volume with the plate in front ---- */
    if (INFL === 'INFL_B') {
      aura = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
        uniforms: U, depthTest: false, depthWrite: false, transparent: false,
        blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
        vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: GLSL_AURA + '\nvoid main(){ vec4 g = bmhAura(gl_FragCoord.xy); if (g.a < 0.002) discard; gl_FragColor = g; }'
      }));
      aura.frustumCulled = false;
      aura.renderOrder = -100;
      scene.add(aura);
    }
    }, function () {
    /* ---- the numerals: the point each step's numeral sits by (v3) ---- */
    if (markOn) anchors = anchorPoints(boneRoot);
    }];
  }

  /* The points the scene's numerals name. In the plate's millimetres (plateFrame, plate-local: X along, +Y off the
     seating face, Z across), except the break, which is in the bone's and moves as the gap closes:
       1 the halo's rim off the plate's far lobe (the end away from the camera), where the halo shows most;
       2 the break, on the bone's axis (breakC, the point step two's glow is centred on);
       3 the plate's near edge where new bone creeps on: the inner lobe on the camera's half, its lower edge on
         screen. Never the callus at the break: that would pin "bonds with bone" to fracture healing;
       4 the bone's surface just under the plate's middle, where the particles sink in;
       5 the plate's centre, on its face. The plate dissolves; the numeral stays. */
  function anchorPoints(boneRoot) {
    var u1 = O + 0.62;
    var yaw1 = (KNOBS.yaw + (-0.5 + u1 / L) * KNOBS.turn) * RAD;
    var far = Math.sin(yaw1) < 0 ? 1 : -1;           /* the camera stands toward -x, so the +x lobe is the far one */
    var rim = 0.15 + 0.26 * KNOBS.haloReachMM;       /* the halo's radius while it shows most (story(): h about 0.26) */
    var low = 1;                                     /* plate-local +Z is world (0, -cos phi, sin phi): lower on screen */
    var z4 = low * (PG.W + 1.6);
    return [   /* r11: the break's anchor (old step two) is gone with its step */
      new THREE.Vector3(far * (PG.HL + rim), PG.T + 0.05, 0),
      new THREE.Vector3(-far * PG.XI, PG.T, low * PG.R),
      boneSurface(boneRoot, 0, z4) || new THREE.Vector3(0, -0.3, z4),
      new THREE.Vector3(0, PG.T, 0)
    ];
  }
  /* the bone's surface under a plate-local (x, z), in plate-local mm: the specks' raycast */
  function boneSurface(boneRoot, x, z) {
    var meshes = []; boneRoot.traverse(function (o) { if (o.isMesh && o.material.defines.CORTEX !== undefined) meshes.push(o); });
    var fw = plateFrame.matrixWorld, nW = new THREE.Vector3().setFromMatrixColumn(fw, 1).normalize();
    var o = new THREE.Vector3(x, 20, z).applyMatrix4(fw);
    var hit = new THREE.Raycaster(o, nW.negate()).intersectObjects(meshes, false)[0];
    return hit ? hit.point.clone().applyMatrix4(U.uPlateInv.value) : null;
  }

  function boneMaterial(hex, kind) {
    var m = new THREE.MeshStandardMaterial({ color: col(hex), roughness: kind === 'CANAL' ? 1 : 0.9, metalness: 0, envMapIntensity: kind === 'CANAL' ? 0.35 : KNOBS.boneEnv });
    m.defines = {}; m.defines[kind] = ''; m.defines[INFL] = '';
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      var decl = GLSL_COMMON + '\n' + GLSL_AURA + '\nuniform float uInfl, uHeatW, uHeatGlow, uHeatK, uFront, uCallus, uCallusH, uSeam, uHoleR, uFootprint, uEdge; uniform vec3 uHeat0, uHeat1, uHeat2, uNewCol, uScrewP0, uScrewP1, uScrewN; uniform vec4 uFrac; uniform mat4 uPlateInv; varying vec3 vWP;\n';
      sh.vertexShader = decl + sh.vertexShader
        .replace('#include <beginnormal_vertex>', [
          '#include <beginnormal_vertex>',
          'float cDisp = 0.0; vec3 cDir = vec3(0.0);',
          /* new bone swells RADIALLY off the shaft's axis, so the cortex and the cut faces it
             shares an edge with move together and the fracture line stays closed; zero at the
             canal wall, so the cut faces stay joined to the canal */
          '#if defined(CORTEX) || defined(CUT)',
          '{ vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;',
          '  vec2 rv = vec2(wp.y - 1.9, wp.z); float rr = length(rv);',
          '  cDir = vec3(0.0, rv / max(rr, 0.001));',
          '  float fd = dot(wp, uFrac.xyz) + uFrac.w; float w = 5.5;',
          '  float bump = exp(-fd*fd/(w*w));',
          '  float nz = bmhNoise(wp*0.33);',
          '  vec3 pl = (uPlateInv * vec4(wp, 1.0)).xyz;',
          '  float under = smoothstep(-0.5, 2.2, bmhPlate(pl.xz));',
          '  float wall = clamp((rr - 4.6)/1.6, 0.0, 1.0);',
          '  float amp = uCallus * uCallusH * (0.65 + 0.7*nz) * mix(0.05, 1.0, under) * wall;',
          '  cDisp = amp * bump;',
          '#ifdef CORTEX',
          '  vec3 g = uFrac.xyz * (amp * bump * (-2.0*fd/(w*w)));',
          '  objectNormal = normalize(objectNormal - (g - dot(g, objectNormal)*objectNormal));',
          '#endif',
          '}',
          '#endif'
        ].join('\n'))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += cDir * cDisp / 1000.0;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = decl + sh.fragmentShader
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          '{ float fd = dot(vWP, uFrac.xyz) + uFrac.w;',
          '  float nz = bmhNoise(vWP*0.21);',
          '#ifndef CANAL',
          '  diffuseColor.rgb *= 0.965 + 0.05*bmhNoise(vWP*0.12) + 0.025*bmhNoise(vWP*1.7);',
          '#endif',
          /* step two (a, c): a heat map on the bone. T is the temperature: a band across the break
             with soft, wandering isotherms; it narrows as it cools. Amber, orange, then red at the core. */
          '#if defined(INFL_A) || defined(INFL_C)',
          '{ float fdn = fd + (bmhNoise(vWP*0.14 + 5.0) - 0.5)*5.0;',
          '  float w = uHeatW * (0.5 + 0.5*uInfl);',
          '  float T = uHeatK * uInfl * exp(-fdn*fdn/(w*w)) * (0.84 + 0.32*nz);',
          '#ifdef INFL_C',
          /* the zinc front clears the heat as it passes */
          '  vec3 plh = (uPlateInv * vec4(vWP, 1.0)).xyz;',
          '  T *= smoothstep(uFront - 0.8, uFront + 1.6, bmhPlate(plh.xz));',
          '#endif',
          '  float hk = smoothstep(0.06, 0.34, T);',
          '  vec3 hcol = mix(uHeat0, uHeat1, smoothstep(0.30, 0.60, T));',
          '  hcol = mix(hcol, uHeat2, smoothstep(0.60, 0.90, T));',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, hcol, hk * 0.92);',
          '  totalEmissiveRadiance += hcol * hk * uHeatGlow * 0.55;',
          '}',
          '#endif',
          '#ifdef CUT',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uNewCol, uSeam);',
          '#endif',
          '#ifdef CORTEX',
          '  float near = exp(-fd*fd/30.0);',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uNewCol, clamp(uCallus*near*(0.55+0.5*nz), 0.0, 1.0));',
          '  vec3 pl = (uPlateInv * vec4(vWP, 1.0)).xyz;',
          '  float fp = 1.0 - smoothstep(-0.6, 0.8, bmhPlate(pl.xz));',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uNewCol, uFootprint * fp * 0.7);',
          '  for (int i = 0; i < 2; i++) {',
          '    vec3 d = vWP - (i == 0 ? uScrewP0 : uScrewP1);',
          '    float al = dot(d, uScrewN); float r = length(d - al*uScrewN);',
          /* where a screw was: new bone, pale, closing in to nothing. Never a dark hole. */
          '    float fill = (1.0 - smoothstep(uHoleR - 0.5, uHoleR + 0.1, r)) * step(-4.0, al) * step(0.02, uHoleR);',
          '    diffuseColor.rgb = mix(diffuseColor.rgb, uNewCol, fill * 0.85);',
          '  }',
          '#endif',
          '}'
        ].join('\n'))
        .replace('#include <output_fragment>', [
          /* a soft darkening toward the silhouette: holds the lit edge against a white ground and
             keeps the register a rendering, not a photograph */
          'outgoingLight *= 1.0 - uEdge * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4);',
          '#include <output_fragment>'
        ].join('\n'))
        .replace('#include <dithering_fragment>', [
          /* step two (b): the glow laid over the finished pixel, exactly as the backdrop draws it */
          '#ifdef INFL_B',
          '{ vec4 ga = bmhAura(gl_FragCoord.xy); gl_FragColor.rgb = mix(gl_FragColor.rgb, ga.rgb, ga.a); }',
          '#endif',
          '#include <dithering_fragment>'
        ].join('\n'));
      envRot(sh);
    };
    return m;
  }

  function metalMaterial(src, kind) {
    var m = src.clone();
    m.envMap = metalEnv;             /* its own studio (metalStudio), not the bone's room */
    m.envMapIntensity = 1.0;
    /* The plate is v2's own finish (partFinish) exactly as it comes, the part the hero draws: #dadde0,
       roughness 0.34 x the three-band finish map (satin faces 0.22, grit-blasted walls and bore
       0.30, turned cones 0.17). The finish map carries the grain now, so none is added here. */
    /* The screw keeps its own GLB colour too (the same #dadde0, correctly read). Its head is matte
       and granular in the photographs (model-screw-z1n/SPEC.md); at the plate's roughness its flat
       top mirrors the dark of the room and reads black. */
    if (kind === 'SCREW') m.roughness = 0.5;
    m.defines = {}; m.defines[kind] = '';
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      var decl = GLSL_COMMON + '\nuniform float uSoft, uCreep, uCreepW, uDissolve, uSheen; uniform vec3 uNewCol, uPatina, uSheenCol, uCreepCol; varying vec3 vPL;\n';
      sh.vertexShader = decl + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPL = position * 1000.0;');
      sh.fragmentShader = decl + sh.fragmentShader
        .replace('#include <metalnessmap_fragment>', [
          '#include <metalnessmap_fragment>',
          'float bmhAO = 1.0;',
          '#ifdef PLATE',
          /* what a studio map cannot know: the bore sees mostly itself, the cone's foot and the
             walls' foot see less of the room. The photographs' bores read dark for this reason. */
          '{ float bx = abs(vPL.x), hr = min(length(vec2(bx - PL_XO, vPL.z)), length(vec2(bx - PL_XI, vPL.z)));',
          '  if (hr < PL_BR + 0.06) bmhAO = mix(0.3, 0.72, smoothstep(0.0, PL_CB, vPL.y));',
          '  else if (hr < PL_CT + 0.03 && vPL.y > PL_CB - 0.03) bmhAO = mix(0.78, 1.0, smoothstep(PL_CB, PL_T, vPL.y));',
          '  bmhAO *= mix(0.62, 1.0, smoothstep(0.0, 0.8, vPL.y)); }',
          '#endif',
          '{ float n1 = bmhNoise(vPL*1.1), n2 = bmhNoise(vPL*0.55 + 7.0);',
          '#ifdef PLATE',
          '  float inward = -bmhPlate(vPL.xz);',
          '  float edgeBias = clamp(inward/PLATE_CORE, 0.0, 1.0);',
          '#else',
          '  float inward = 2.8 - length(vPL.xz);',
          '  float edgeBias = clamp(1.0 - vPL.y/10.5, 0.0, 1.0)*0.3 + clamp(inward/2.8, 0.0, 1.0)*0.4;',
          '#endif',
          /* step four: the surface softens */
          '  float mott = bmhNoise(vPL*0.35 + 3.0);',
          '  roughnessFactor = mix(roughnessFactor, 0.33 + 0.05*mott, uSoft);',
          '  diffuseColor.rgb *= mix(1.0, 0.93, uSoft);',
          '  metalnessFactor = mix(metalnessFactor, 0.94, uSoft);',
          '#ifdef PLATE',
          /* step three: new bone creeps onto the edges */
          '  float reach = uCreep * (0.6 + 0.6*exp(-vPL.x*vPL.x/uCreepW));',
          '  float creep = (1.0 - smoothstep(reach - 0.35, reach + 0.05, inward + (n1 - 0.5)*0.7)) * step(0.01, uCreep);',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uCreepCol * 0.86, creep);',
          '  metalnessFactor = mix(metalnessFactor, 0.0, creep);',
          '  roughnessFactor = mix(roughnessFactor, 0.92, creep);',
          '#endif',
          /* step five: resorbs from the edges in */
          '  float v = edgeBias*0.68 + n2*0.32;',
          '  float thr = uDissolve*1.12 - 0.06;',
          '  if (uDissolve > 0.001 && v < thr) discard;',
          '  float front = (1.0 - smoothstep(0.0, 0.05, v - thr)) * step(0.001, uDissolve);',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uPatina, front);',
          '  metalnessFactor = mix(metalnessFactor, 0.2, front);',
          '  roughnessFactor = mix(roughnessFactor, 0.9, front);',
          '}'
        ].join('\n'))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uSheenCol * uSheen * 0.22;')
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= bmhAO; reflectedLight.indirectSpecular *= bmhAO;');
    };
    return m;
  }

  function depthMaterial(kind) {
    var m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.defines = {}; m.defines[kind] = '';
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uDissolve = U.uDissolve;
      var decl = GLSL_COMMON + '\nuniform float uDissolve; varying vec3 vPL;\n';
      sh.vertexShader = decl + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPL = position * 1000.0;');
      sh.fragmentShader = decl + sh.fragmentShader.replace('void main() {', [
        'void main() {',
        '  float n2 = bmhNoise(vPL*0.55 + 7.0);',
        '  float inward = -bmhPlate(vPL.xz); float edgeBias = clamp(inward/PLATE_CORE, 0.0, 1.0);',
        '  if (uDissolve > 0.001 && edgeBias*0.68 + n2*0.32 < uDissolve*1.12 - 0.06) discard;'
      ].join('\n'));
    };
    return m;
  }

  /* The flattest seat across the break: for each tilt of the plate's normal round the shaft, and
     each offset across it, how far does a flat plate stand off the bone at its edges? */
  function findSeat(boneRoot, hl, hw, onlyDeg) {
    /* hl, hw: the plate's half-length and half-width on the bone, mm. onlyDeg: search just that tilt */
    var e0 = hl - 1.9, st = [-e0, -e0 * 2 / 3, -e0 / 3, e0 / 3, e0 * 2 / 3, e0], secs = st.map(function () { return []; });
    var wIn = hw + 0.03, wEdge = hw - 0.475;
    var v = new THREE.Vector3();
    boneRoot.traverse(function (o) {
      if (!o.isMesh || o.material.defines.CORTEX === undefined) return;
      var p = o.geometry.attributes.position;
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        for (var s = 0; s < st.length; s++) if (Math.abs(v.x - st[s]) < 1.2) secs[s].push(v.y, v.z);
      }
    });
    var best = { cost: 1e9, phi: 14 * RAD, c0: 2, h: 5.6 };
    var pd0 = onlyDeg === undefined ? -30 : onlyDeg, pd1 = onlyDeg === undefined ? 50 : onlyDeg;
    for (var pd = pd0; pd <= pd1; pd += 1) {
      var phi = pd * RAD, ny = Math.sin(phi), nz = Math.cos(phi), ay = nz, az = -ny;
      for (var c0 = -4; c0 <= 4; c0 += 0.25) {
        var seats = [], fl = 0, nf = 0;
        for (var k = 0; k < secs.length; k++) {
          var sec = secs[k], seat = -1e9, e1 = -1e9, e2 = -1e9;
          for (var j = 0; j < sec.length; j += 2) {
            var y = sec[j], z = sec[j + 1], uu = y * ay + z * az - c0, hh = y * ny + z * nz;
            if (Math.abs(uu) <= wIn) seat = Math.max(seat, hh);
            if (Math.abs(uu - wEdge) < 0.7) e1 = Math.max(e1, hh);
            if (Math.abs(uu + wEdge) < 0.7) e2 = Math.max(e2, hh);
          }
          seats.push(seat); fl += (seat - e1) + (seat - e2); nf += 2;
        }
        var S0 = Math.max.apply(null, seats), sag = 0;
        for (k = 0; k < seats.length; k++) sag += S0 - seats[k];
        var cost = sag / seats.length * 0.5 + fl / nf;
        if (cost < best.cost) best = { cost: cost, phi: phi, c0: c0, h: S0 };
      }
    }
    return best;
  }

  /* the specks' placing raycasts the bone hundreds of times: step(ms) places them a slice at a time (the same tries in
     the same order, so the same specks) and returns false until it is done, then the Points */
  function speckBuilder(boneRoot) {
    var N = KNOBS.specks, pos = [], dd = [], sz = [];
    var rc = new THREE.Raycaster(), inv = U.uPlateInv.value, fw = plateFrame.matrixWorld;
    var meshes = []; boneRoot.traverse(function (o) { if (o.isMesh && o.material.defines.CORTEX !== undefined) meshes.push(o); });
    var nW = new THREE.Vector3().setFromMatrixColumn(fw, 1).normalize();
    var i = 0, tries = 0;
    return { step: function (ms) {
    var until = performance.now() + (ms === undefined ? Infinity : ms);
    for (; pos.length < N * 3 && tries < 800; tries++) {
      if (performance.now() >= until) return false;   /* resume at this same try */
      var x = (rnd(tries * 3 + 1) - 0.5) * (PG.HL * 2 + 14), z = (rnd(tries * 3 + 2) - 0.5) * 26;
      var d = sdPlate(x, z);
      if (d < -3.5 || d > 7.5) continue;
      if (d < 0) {                                        /* on the plate, off the holes */
        if (nearHole(x, z, 0.3)) continue;
        pos.push(x, PG.T + 0.08, z);
      } else {                                            /* on the bone round it */
        var o = new THREE.Vector3(x, 20, z).applyMatrix4(fw);
        rc.set(o, nW.clone().negate());
        var hit = rc.intersectObjects(meshes, false)[0];
        if (!hit) continue;
        var p = hit.point.clone().addScaledVector(nW, 0.25).applyMatrix4(inv);
        pos.push(p.x, p.y, p.z);
      }
      dd.push(Math.max(d, 0)); sz.push(3.0 + rnd(tries * 7 + 5) * 3.2);
      i++;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(sz, 1));
    var m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uR: { value: 0 }, uPx: { value: 1 }, uCol: { value: new THREE.Color(KNOBS.speckColor) } },
      vertexShader: 'attribute float aD, aS; uniform float uR, uPx; varying float vA;\n' +
        'void main(){ float f = 1.0 - smoothstep(aD - 0.6, aD + 1.6, uR); vA = f;\n' +
        '  gl_PointSize = aS * uPx * (0.35 + 0.65*f); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; varying float vA;\n' +
        'void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5 || vA < 0.01) discard;\n' +
        '  gl_FragColor = vec4(uCol, vA * 0.85 * (1.0 - smoothstep(0.32, 0.5, r))); }'
    });
    var pts = new THREE.Points(g, m);
    pts.renderOrder = 20;
    return pts;
    } };
  }

  /* step two (c): hot spots on the bone round the break, off the plate. Each knows how far it is
     from the plate's edge, so the zinc front reaches the nearest first. */
  function buildEmbers(boneRoot, zinc) {
    var N = KNOBS.embers, pos = [], dd = [], sz = [], ht = [];
    var rc = new THREE.Raycaster(), inv = U.uPlateInv.value, fw = plateFrame.matrixWorld;
    var meshes = []; boneRoot.traverse(function (o) { if (o.isMesh && o.material.defines.CORTEX !== undefined) meshes.push(o); });
    var nW = new THREE.Vector3().setFromMatrixColumn(fw, 1).normalize();
    /* place them on the bone as it stands in step two: the break still open */
    distal.position.x = KNOBS.gapMM / 1000; boneRoot.updateMatrixWorld(true);
    var nl = Math.hypot(1, 0.6677, 0.1328), fN = new THREE.Vector3(1 / nl, -0.6677 / nl, 0.1328 / nl), fW = (1.5309 - KNOBS.gapMM / 2) / nl;
    for (var tries = 0; pos.length < N * 3 && tries < 6000; tries++) {
      var x = (rnd(tries * 4 + 901) - 0.5) * 34, z = (rnd(tries * 4 + 902) - 0.5) * 26;
      var d = sdPlate(x, z);
      if (d < 0.7) continue;
      var o = new THREE.Vector3(x, 20, z).applyMatrix4(fw);
      rc.set(o, nW.clone().negate());
      var hit = rc.intersectObjects(meshes, false)[0];
      if (!hit) continue;
      if (hit.face && tmpV.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).dot(nW) < 0.5) continue;
      var fd = hit.point.dot(fN) + fW;
      if (Math.abs(fd) < 1.5 || rnd(tries * 4 + 903) > Math.exp(-fd * fd / 40)) continue;   /* clustered on the break, not in the gap */
      var ok = true;                                                                        /* no two on top of each other */
      for (var j = 0; j < pos.length && ok; j += 3) ok = Math.hypot(pos[j] - x, pos[j + 2] - z) > 2.6;
      var p = hit.point.clone().addScaledVector(nW, 0.5).applyMatrix4(inv);
      if (!ok) continue;
      pos.push(p.x, p.y, p.z);
      dd.push(d + rnd(tries * 4 + 904) * 1.2);
      sz.push(lerp(KNOBS.emberMM[0], KNOBS.emberMM[1], rnd(tries * 7 + 905)));
      ht.push(rnd(tries * 7 + 906));
    }
    distal.position.x = 0; boneRoot.updateMatrixWorld(true);
    emberD = dd.slice().sort(function (p, q) { return p - q; });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aD', new THREE.Float32BufferAttribute(dd, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(sz, 1));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(ht, 1));
    var m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uFront: U.uFront, uOn: { value: 0 }, uScale: { value: 1 }, uGlow0: U.uGlow0, uGlow1: U.uGlow1, uGlow2: U.uGlow2, uZinc: { value: zinc } },
      vertexShader: 'attribute float aD, aS, aH; uniform float uFront, uOn, uScale; varying float vA, vK, vH;\n' +
        'void main(){ float k = clamp((uFront - aD)/1.1, 0.0, 1.0); vK = k; vH = aH;\n' +
        '  vA = uOn * (1.0 - smoothstep(0.45, 1.0, k));\n' +
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);\n' +
        '  gl_PointSize = aS * uScale / -mv.z * (1.0 - 0.45*k) * (0.6 + 0.4*uOn);\n' +
        '  gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uGlow0, uGlow1, uGlow2, uZinc; varying float vA, vK, vH;\n' +
        /* a point of heat: a hot centre in a soft glow, no edge. Put out, it turns zinc blue and goes */
        'void main(){ float r = length(gl_PointCoord - 0.5)*2.0; if (r > 1.0 || vA < 0.01) discard;\n' +
        '  float t = exp(-r*r*7.0);\n' +
        '  vec3 c = mix(uGlow0, uGlow1, smoothstep(0.08, 0.45, t));\n' +
        '  c = mix(c, uGlow2, smoothstep(0.45, 0.85, t) * (0.7 + 0.3*vH));\n' +
        '  c = mix(c, uZinc, smoothstep(0.0, 0.3, vK));\n' +
        '  float a = 0.95*exp(-r*r*10.0) + 0.4*exp(-r*r*3.0);\n' +
        '  a *= 1.0 - smoothstep(0.8, 1.0, r);\n' +
        '  gl_FragColor = vec4(c, vA * clamp(a, 0.0, 1.0)); }'
    });
    var pts = new THREE.Points(g, m);
    pts.renderOrder = 22;
    pts.frustumCulled = false;
    return pts;
  }

  function buildParticles(mid) {
    var N = KNOBS.particles, pos = [], dir = [], meta = [];
    for (var i = 0, t = 0; i < N && t < 20000; t++) {
      var x = (rnd(t * 5 + 11) - 0.5) * PG.HL * 2, z = (rnd(t * 5 + 12) - 0.5) * PG.R * 2.2;
      var d = sdPlate(x, z);
      if (d > -0.1 || d < -2.2) continue;               /* a band just inside the edge */
      if (nearHole(x, z, 0.1)) continue;
      /* outward: the outline's gradient, which is mostly across the plate */
      var e = 0.05, gx = sdPlate(x + e, z) - sdPlate(x - e, z), gz = sdPlate(x, z + e) - sdPlate(x, z - e), gl = Math.hypot(gx, gz) || 1;
      var travel = -d + 0.5 + rnd(t * 5 + 13) * 2.6;
      pos.push(x, PG.T + 0.05, z);
      dir.push(gx / gl * travel, -(1.6 + rnd(t * 5 + 14) * 2.2), gz / gl * travel);
      var batch = i < N * 0.72 ? 0 : 1;                  /* most in step four, a trickle as it dissolves */
      var start = batch === 0 ? 0.04 + rnd(t * 5 + 15) * 0.58 : 1.02 + rnd(t * 5 + 15) * 0.42;
      meta.push(start, 0.3 + rnd(t * 5 + 16) * 0.16, 2.0 + rnd(t * 5 + 17) * 1.6);
      i++;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    g.setAttribute('aMeta', new THREE.Float32BufferAttribute(meta, 3));
    var col = mid.clone();
    var m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: -1 }, uPx: { value: 1 }, uCol: { value: col } },
      vertexShader: 'attribute vec3 aDir, aMeta; uniform float uT, uPx; varying float vA;\n' +
        'void main(){ float ph = clamp((uT - aMeta.x)/aMeta.y, 0.0, 1.0);\n' +
        '  float e = 1.0 - pow(1.0 - ph, 2.2);\n' +
        '  vec3 p = position + vec3(aDir.x*e, aDir.y*ph*ph, aDir.z*e);\n' +
        '  vA = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.55, 1.0, ph)) * step(0.0001, ph) * step(ph, 0.9999);\n' +
        '  gl_PointSize = aMeta.z * uPx * (1.0 - 0.45*ph); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; varying float vA;\n' +
        'void main(){ vec2 c = gl_PointCoord - 0.5; float r = length(c); if (r > 0.5 || vA < 0.01) discard;\n' +
        '  gl_FragColor = vec4(uCol, vA * 0.85 * (1.0 - smoothstep(0.28, 0.5, r))); }'
    });
    var pts = new THREE.Points(g, m);
    pts.renderOrder = 21;
    pts.frustumCulled = false;
    return pts;
  }

  /* ======================================================================
     One frame: every property from u
     ==================================================================== */
  var size = { w: 0, h: 0, cx: 0, cy: 0, bw: 0, bh: 0, phone: false, onSide: false, band: 0 };

  /* the bone on screen: its outline points (set at build) projected, top and bottom in canvas pixels */
  var boneHull = null, hullPt = null;
  function boneSpan() {
    var p = hullPt || (hullPt = new THREE.Vector3()), lo = 1e9, hi = -1e9;
    for (var i = 0; i < boneHull.length; i++) {
      var y = (0.5 - p.copy(boneHull[i]).project(camera).y * 0.5) * size.h;
      if (y < lo) lo = y;
      if (y > hi) hi = y;
    }
    return [lo, hi];
  }

  function apply(u) {
    var s = story(u);
    U.uInfl.value = s.infl;
    U.uFront.value = s.front;
    U.uCallus.value = s.callus;
    U.uSeam.value = s.seam;
    U.uSoft.value = s.soft;
    U.uCreep.value = s.creep;
    U.uDissolve.value = s.dissolve;
    U.uSheen.value = s.sheen;
    U.uHoleR.value = s.holeR * smooth(0.3, 0.7, s.dissolve);
    U.uFootprint.value = s.footprint;
    /* the fracture plane, fitted to the cut faces: x = 0.668 y - 0.133 z - 1.531 (mm), mid-gap */
    var nl = Math.hypot(1, 0.6677, 0.1328);
    U.uFrac.value.set(1 / nl, -0.6677 / nl, 0.1328 / nl, (1.5309 - s.gap / 2) / nl);
    distal.position.x = s.gap / 1000;

    /* the halo: step one's, or in (c) the zinc going out again in step two */
    var two = s.halo2Amp > s.haloAmp;
    for (var i = 0; i < halo.length; i++) {
      halo[i].material.uniforms.uR.value = two ? s.halo2R : s.haloR;
      halo[i].material.uniforms.uAmp.value = two ? s.halo2Amp : s.haloAmp;
      halo[i].position.y = PG.T + 0.05 + (i / (halo.length - 1)) * (two ? 0.4 + 1.0 * s.halo2Lift : 0.4 + 4.2 * s.haloLift);
      halo[i].visible = Math.max(s.haloAmp, s.halo2Amp) > 0.003;
    }
    specks.material.uniforms.uR.value = u < O ? 0 : s.haloR;
    specks.visible = s.haloR < KNOBS.haloReachMM - 0.05 || u < O + 0.5;
    parts.material.uniforms.uT.value = s.p4;
    parts.visible = s.p4 > 0 && s.p4 < 1.6;
    var px = renderer.getPixelRatio();
    specks.material.uniforms.uPx.value = px;
    parts.material.uniforms.uPx.value = px;
    for (i = 0; i < screws.length; i++) screws[i].visible = s.dissolve < 0.999;
    plateFrame.children[0].visible = s.dissolve < 0.999;

    /* camera: framing width, a slow turn round the bone, a fixed roll so phones run it on the diagonal */
    var fr = framing(u, size.phone), wide = fr.wide;
    var tilt = (size.phone ? KNOBS.tilt[1] : KNOBS.tilt[0]) * RAD;
    var along = Math.min(size.bw / Math.max(Math.abs(Math.cos(tilt)), 1e-3), size.bh / Math.max(Math.abs(Math.sin(tilt)), 1e-3));
    var across = Math.min(size.bw / Math.max(Math.abs(Math.sin(tilt)), 1e-3), size.bh / Math.max(Math.abs(Math.cos(tilt)), 1e-3));
    var pxmm = Math.min(along / fr.W, across / lerp(24, 40, wide));
    var D = size.h / (2 * Math.tan(KNOBS.fov / 2 * RAD) * pxmm);
    var yaw = (KNOBS.yaw + (-0.5 + u / L) * KNOBS.turn) * RAD;
    var el = lerp(KNOBS.elevation[0], KNOBS.elevation[1], clamp(u / L, 0, 1)) * RAD;
    var tx = lerp(plateC.x, boneC.x, wide), ty = lerp(plateC.y, boneC.y, wide), tz = lerp(plateC.z, boneC.z, wide);
    camera.position.set(tx + D * Math.sin(yaw) * Math.cos(el), ty + D * Math.sin(el), tz + D * Math.cos(yaw) * Math.cos(el));
    camera.lookAt(tx, ty, tz);
    /* roll so the bone's axis sits at the knob's angle whatever the turn is doing */
    camera.updateMatrixWorld();
    var ax = new THREE.Vector3(1, 0, 0).transformDirection(camera.matrixWorldInverse);
    camera.rotateZ(Math.atan2(ax.y, ax.x) - tilt);
    camera.aspect = size.w / size.h;
    camera.setViewOffset(size.w, size.h, size.w / 2 - size.cx, size.h / 2 - size.cy, size.w, size.h);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    /* a phone on its side: the whole bone kept inside the band, SAFE_PAD clear of the headline and the copy, and
       centred on it (the camera looks at the plate, which sits on top of the shaft, so the bone hung low) */
    if (size.onSide && boneHull) {
      var sp = boneSpan(), room = Math.max(1, size.band - 2 * SAFE_PAD);
      for (var it = 0; it < 3 && sp[1] - sp[0] > room; it++) {
        D *= (sp[1] - sp[0]) / room;                       /* back along the same line of sight: same view, smaller */
        camera.position.set(tx + D * Math.sin(yaw) * Math.cos(el), ty + D * Math.sin(el), tz + D * Math.cos(yaw) * Math.cos(el));
        camera.updateMatrixWorld();
        sp = boneSpan();
      }
      camera.setViewOffset(size.w, size.h, size.w / 2 - size.cx, size.h / 2 - size.cy + (sp[0] + sp[1]) / 2 - size.cy, size.w, size.h);
      camera.updateProjectionMatrix();
    }

    /* step two: sizes that depend on the camera */
    var bufH = size.h * px, focal = bufH / (2 * Math.tan(KNOBS.fov / 2 * RAD));
    if (embers) {
      embers.material.uniforms.uOn.value = s.embersOn;
      embers.material.uniforms.uScale.value = focal;
      embers.visible = s.embersOn > 0.01 && s.front < emberD[emberD.length - 1] + 1.5;
    }
    /* the break, on the bone's axis, mid-gap: the glow's centre, and step two's numeral */
    breakC.set(-0.26 + s.gap / 2, 1.9, 0);
    if (aura) {
      /* the glow sits on the bone's axis at the break; it is an ellipse along the bone on screen */
      tmpV.copy(breakC).project(camera);
      tmpW.set(breakC.x + 10, breakC.y, breakC.z).project(camera);
      var cx = (tmpV.x * 0.5 + 0.5) * size.w * px, cy = (tmpV.y * 0.5 + 0.5) * size.h * px;
      var sx = (tmpW.x - tmpV.x) * size.w, sy = (tmpW.y - tmpV.y) * size.h, sl = Math.hypot(sx, sy) || 1;
      var mm = focal / camera.position.distanceTo(breakC);
      var grow = lerp(KNOBS.auraShrink, 1, s.infl);
      U.uAura.value = s.infl;
      U.uAuraC.value.set(cx, cy);
      U.uAuraAx.value.set(sx / sl, sy / sl);
      U.uAuraR.value.set(KNOBS.auraMM[0] * grow * mm, KNOBS.auraMM[1] * grow * mm);
      aura.visible = s.infl > 0.004;
    }
  }

  /* a box, read once per frame: inside the scroll tick BMH.rect gives the box measured before any section wrote a
     style that frame (no forced layout); outside it, a live read */
  function box(el) { return BMH.rect ? BMH.rect(el) : el.getBoundingClientRect(); }
  function bandRect() { return box(bandEl); }

  /* fr, b: the canvas's and the band's boxes, read before this frame's first write. On a resize only. */
  function measure(fr, b) {
    var w = Math.max(1, Math.round(fr.width)), h = Math.max(1, Math.round(fr.height));
    /* a phone on its side has a wide, short band: it runs the desktop's camera (the phone's 24-degree diagonal would
       cross the copy), framed on the band less the bone's rise across the width (so the pull-back at the end still
       reads); apply() then fits the whole bone inside the band */
    var onSide = mqShort.matches;
    size.onSide = onSide;
    size.phone = mqPhone.matches && !onSide;
    size.w = w; size.h = h;
    size.bw = w;
    size.band = b.height;
    size.bh = onSide ? Math.max(40, b.height - w * Math.tan(KNOBS.tilt[0] * RAD)) : Math.max(80, b.height);
    size.cx = w * KNOBS.stageX;
    size.cy = (b.top - fr.top) + b.height / 2;
    renderer.setSize(w, h, false);
    /* the numeral's room: the band between the headline and the copy (on phones, the copy stacked under the
       bone), inside the page's gutters, in the canvas's pixels; and the numeral's own size */
    if (markOn) {
      var mb = box(mark);
      markW = mb.width; markH = mb.height;
      safe.l = b.left - fr.left; safe.r = b.right - fr.left;
      safe.t = b.top - fr.top + SAFE_PAD; safe.b = b.bottom - fr.top - SAFE_PAD;
    }
  }

  /* ======================================================================
     The scene's numeral (v3): one at a time, by the point its step names
     ==================================================================== */
  var anchors = null, markK = -1, markT = '', tickT = '', markW = 0, markH = 0;
  var safe = { l: 0, t: 0, r: 0, b: 0 }, SAFE_PAD = 10, tmpA = null;

  /* Its words' wipe (copy(): the word's line, no lag), so the numeral comes and goes with them and reverses on
     the way up. Placed by transform only, from the boxes measure() cached. */
  function placeMark(u) {
    if (!markOn || !anchors) return;
    var W = KNOBS.wipe;
    var k = u < O + 1 ? 0 : Math.min(NSTEP - 1, Math.floor(u - O));
    var uIn = k === 0 ? O * 0.55 : O + k, uOut = k === NSTEP - 1 ? 1e9 : O + k + 1;
    var pIn = clamp((u - uIn) / (W / 2), 0, 1), pOut = clamp((u - (uOut - W / 2)) / (W / 2), 0, 1);
    var m = maskFor(pIn, pOut);
    if (k === NSTEP - 1 && !KNOBS.numberLast) m = 'linear-gradient(90deg, transparent, transparent)';
    setMask(mark, 100, m);
    if (tickOn) setMask(tick, 101, m);
    if (k !== markK) { markK = k; mark.textContent = String(k + 1); }
    if (k === NSTEP - 1 && !KNOBS.numberLast) return;
    if (pIn <= 0 || pOut >= 1) return;                       /* out of sight: nothing to place */

    var a = tmpA || (tmpA = new THREE.Vector3());
    plateFrame.localToWorld(a.copy(anchors[k]));
    a.project(camera);
    if (a.z > 1) return;
    var ax = (a.x * 0.5 + 0.5) * size.w, ay = (0.5 - a.y * 0.5) * size.h;
    var hw = markW / 2, hh = markH / 2, off = KNOBS.numberOffset;
    var cx = clamp(ax + off[0], safe.l + hw, Math.max(safe.l + hw, safe.r - hw));
    var cy = clamp(ay + off[1], safe.t + hh, Math.max(safe.t + hh, safe.b - hh));
    var t = 'translate3d(' + (cx - hw).toFixed(1) + 'px,' + (cy - hh).toFixed(1) + 'px,0)';
    if (t !== markT) { mark.style.transform = t; markT = t; }

    if (tickOn) {
      /* from just outside the numeral's box toward the point, tickPx long, never past it */
      var dx = ax - cx, dy = ay - cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      var r0 = Math.min(Math.abs(ux) > 1e-4 ? hw / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-4 ? hh / Math.abs(uy) : 1e9) + 4;
      var len = clamp(d - r0 - 3, 0, KNOBS.tickPx);
      var tt = 'translate3d(' + (cx + ux * r0).toFixed(1) + 'px,' + (cy + uy * r0).toFixed(1) + 'px,0) rotate(' +
        Math.atan2(uy, ux).toFixed(4) + 'rad) scaleX(' + (len / KNOBS.tickPx).toFixed(3) + ')';
      if (tt !== tickT) { tick.style.transform = tt; tickT = tt; }
    }
  }

  /* ======================================================================
     Run
     ==================================================================== */
  var ready = false, onScreen = true, lastU = -1, lastW = 0, lastH = 0;
  var drawnU = -1, warmed = false, near = false;   /* drawnU: the u the canvas shows; warmed: every shader compiled */

  function currentU() {
    return clamp(BMH.pinProgress(track), 0, 1) * L;
  }

  /* draw u at the canvas's size (fr, b: boxes read before any write). The first draw compiles every material, the
     ones the later steps show too, so no step change compiles mid-scroll */
  function paint(u, fr, b) {
    var w = Math.round(fr.width), h = Math.round(fr.height);
    if (w !== lastW || h !== lastH) { measure(fr, b || bandRect()); lastW = w; lastH = h; }
    apply(u);
    placeMark(u);
    if (!warmed) { warmed = true; if (BMH.warm) { BMH.warm(renderer, scene, camera); drawnU = u; return; } renderer.compile(scene, camera); }
    renderer.render(scene, camera);
    drawnU = u;
  }

  function frame(force) {
    if (!onScreen) return;
    var u = currentU();
    var fr = box(canvas);
    var resized = ready && (Math.round(fr.width) !== lastW || Math.round(fr.height) !== lastH);
    if (force !== true && u === lastU && !resized) return;
    var b = resized ? bandRect() : null;
    if (force === true || u !== lastU) copy(u);
    lastU = u;
    if (ready && (resized || u !== drawnU)) paint(u, fr, b);
  }

  /* the warm-up, off screen and before the first frame anyone sees: the canvas at its real size, the scene posed at
     the current u, every shader compiled (one job), then drawn once (the next), uploading geometry and textures and
     building the shadow map's programs. The first visible frame then has nothing to compile, resize or redraw */
  function warmCompile() {
    if (!ready || warmed) return;
    var fr = box(canvas), w = Math.round(fr.width), h = Math.round(fr.height);
    if (w !== lastW || h !== lastH) { measure(fr, bandRect()); lastW = w; lastH = h; }
    apply(currentU());
    renderer.compile(scene, camera);
  }
  function warmDraw() {
    if (!ready || warmed) return;
    paint(currentU(), box(canvas), null);
  }

  function load() {
    return Promise.all([BMH.glb('glb-bone-hi'), BMH.glb(PV.blob || 'glb-plate-v2-hi'), BMH.glb('glb-screw')]);
  }

  /* reduced motion: four stills, each above its step's words; the step's numeral sits before its word (CSS) */
  function stills() {
    root.classList.add('is-still');
    if (!hasGL) return;
    load().then(function (g) {
      build(g[0], g[1], g[2]);
      var wrapW = Math.min(root.querySelector('.props__ui').clientWidth, 1280);
      var w = Math.max(320, wrapW), phone = mqPhone.matches, h = Math.round(w * (phone ? 0.78 : 0.5));
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      renderer.setSize(w, h, false);
      size = { w: w, h: h, cx: w / 2, cy: h / 2, bw: w, bh: h, phone: phone };
      steps.forEach(function (li, k) {
        apply(KNOBS.stills[k]);
        renderer.render(scene, camera);
        var img = new Image();
        img.className = 'props__still';
        img.alt = '';
        img.width = w; img.height = h;
        img.src = canvas.toDataURL('image/png');
        li.insertBefore(img, li.firstChild);
      });
    }).catch(function (e) { if (window.console) console.warn('04-properties:', e); });
  }

  function live() {
    root.classList.add('is-live');
    root.style.setProperty('--props-len', (KNOBS.scrollPerStep * L).toFixed(3));
    BMH.visible(root, function (v) { onScreen = v; if (v) frame(true); });
    BMH.onScroll(function () { frame(); });
    if (!hasGL) return;
    /* the build and the warm-up wait for quiet moments (BMH.idle: after the hero's entrance, never mid-scroll); the
       whole chain is given the time one job would be (4 s), then it carries on through a scroll. Within a screen of
       the viewport, whatever is left runs at once */
    var jobs = null, k = 0, t0 = 0, fail = function (e) { if (window.console) console.warn('04-properties:', e); };
    function built() {
      ready = true;
      frame(true);
      requestAnimationFrame(function () { root.classList.add('is-ready'); });
    }
    function next() {
      if (!jobs) return;
      try {
        if (k < jobs.length) { if (jobs[k](8) !== false) k++; if (k === jobs.length) built(); }
        else if (!warmed) { if (k === jobs.length) { warmCompile(); k++; } else { warmDraw(); jobs = null; return; } }
        else { jobs = null; return; }
      } catch (e) { jobs = null; fail(e); return; }
      BMH.idle(next, { by: Math.max(0, 4000 - (performance.now() - t0)) });
    }
    function now() {
      if (!jobs) return;
      try {
        while (k < jobs.length) { if (jobs[k](Infinity) !== false) k++; if (k === jobs.length) built(); }
        if (!warmed) { warmCompile(); warmDraw(); }
      } catch (e) { fail(e); }
      jobs = null;
    }
    BMH.visible(root, function (v) { near = v; if (v) now(); }, '100% 0px');
    load().then(function (g) {
      if (!BMH.idle) {   /* no quiet-time queue (an older core.js): as before, all at once, first drawn when on screen */
        build(g[0], g[1], g[2]);
        ready = true; frame(true);
        requestAnimationFrame(function () { root.classList.add('is-ready'); });
        return;
      }
      jobs = buildSteps(g[0], g[1], g[2]); k = 0; t0 = performance.now();
      if (near) now(); else BMH.idle(next);
    }).catch(fail);
  }

  function start() { if (BMH.reduced) stills(); else live(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
