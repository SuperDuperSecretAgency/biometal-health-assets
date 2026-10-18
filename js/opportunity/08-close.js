/* Close band. GENERATED from src/parts/close-band/band.js by make.py: edit there and re-run.      -z1n
   The x-ray develops out of the light field and the frame pushes in slowly as the line lands, as on
   the homepage close. Scroll-linked: it reverses on scroll-up and stops when the scroll stops.
   Reduced motion (and no JS) show the settled frame, set as the CSS defaults. Nothing loops.

   Image 'vanish' (Andrew, 25 Sep: "every time we show an implant and an X-ray, after we get there, I
   want the implant to sort of dissolve"): the homepage close's vanish, ported. Our own plate v2
   (glb-plate-v2-hi, its numbers in BMH.PLATE_V2, never reshaped) and screws (glb-screw) are drawn on
   a canvas over a hardware-free part of the real film, in the film's radiopaque density: flat
   --brand-dark with a slightly lighter thin edge. The film's pixels are never touched; the canvas
   sits in the image's box, under its mask and push. Once the x-ray is well in view it holds, then
   the metal resorbs: a soft front travels the implant, the metal at the front breaks into grain,
   and the grain thins to nothing. Nothing moves or falls. It plays once per arrival, resets out of
   sight and plays again on return. Time counts only while the tab is showing and the x-ray is on
   screen. Reduced motion never draws it.

   Review hooks (not used by the page): BMH.closeBand['opp-close'].set({...}), .hold(p) pins the resorb
   at p in 0..1 (null lets it run again), .ready is a promise. */
(function () {
  'use strict';

  const KNOBS = window.BMH.knobs('opp-close', {
    image: 'vanish',    // 'vanish' = a plate and screws on the bone, which resorb once per arrival (round 2)
                        // 'xray' = the plain film, as in round one
    develop: true,      // false = the x-ray is simply there: no develop-in, no push
    developFrom: 0,     // image opacity as the band first enters (0 = blank field, 1 = no develop)
    pushFrom: 1.0,      // image scale as the band first enters
    pushTo: 1.07,       // image scale once settled (push-in: larger = closer)
    start: 0.08,        // scroll point where both begin: 0 = the band's top at the viewport bottom
    developEnd: 0.42,   // scroll point where the x-ray is fully developed
    pushEnd: 0.5,       // scroll point where the push-in settles (0.5 = the band fills the screen)
    blendPx: 200,       // the soft blend up from the section above, in px (0 = a clean edge)

    /* 'vanish' only. Timing and look are the homepage close's. */
    trigger: 0.85,      // share of the x-ray that must be on screen before the hold starts (1 = all of it)
    holdMs: 800,        // how long the implant stays, once triggered, before it starts to go
    vanishMs: 2500,     // how long the implant takes to resorb
    replay: true,       // it plays again each time the x-ray comes back into view (it resets out of sight)
    resetBelow: 0.1,    // share of the x-ray still on screen when it resets (the film has faded out by then)
    repeatAfterMs: 0,   // while it stays in view: 0 = it plays once; otherwise it fades back after this long and goes again
    repeats: 2,         // with repeatAfterMs: how many more times, at most (nothing loops forever)
    fadeInMs: 700,      // with repeatAfterMs: how long the implant takes to fade back in
    vanishFrom: 'bottom', // where the metal goes first: 'bottom' (the front rises), 'top', 'ends', 'all' (everywhere at once)
    ragged: 0.35,       // how much the front wanders: 0 straight across, 1 all over
    band: 0.4,          // how deep the zone is where metal breaks into grain, as a share of the implant
    grainMm: 0.22,      // grain size, in implant millimetres
    thinning: 0.25,     // how much the whole implant pales while it goes, ahead of the front
    edge: 0.7,          // density at the metal's thin edge: 1 = flat to the rim, lower = a lighter rim
    screws: 4,          // 4 = every hole, 2 = the two outer holes
    implantSize: 0.78,  // how big the implant is against the film: 1 = true size by the film's scale
    viewDeg: 18,        // 0 = plate seen edge-on, screws crossing the bone in profile; 90 = plate flat to the camera
    bone: { x: 598, y: 415, angleDeg: -9.2, halfWidth: 60, side: -1 },
                        // the bone the plate sits on, in x-ray pixels (the film is 900 x 830): the radius shaft, plate on its outer (radial) edge.
                        // x, y: a point on its centre line; angleDeg: its lean from vertical (+ = far end
                        // to the right); halfWidth: its half-width; side: the edge the plate is on
                        // (-1 left, +1 right, turned with the lean)
  });

  const FILM_PX_PER_MM = 8.375;   // the film's 4 cm scale bar (335 px)

  /* The screw's head, from model-screw-z1n/SPEC.md §3 (screw.glb: tip at y = 0, head top at
     10.5 mm). Its underside is flatter (about 152°) than the plate's 125° countersink, so it bears
     on the cone at its outer rim: 2.8 mm out, 1.25 mm below the head's top. */
  const SCREW = { lengthMm: 10.5, headRmm: 2.8, rimBelowTopMm: 1.25 };

  const BMH = window.BMH;
  const sec = document.getElementById('s-opp-close');
  if (!sec || !BMH) return;
  const stage = sec.querySelector('.close');
  const box = stage.querySelector('.close__img');
  const img = box.querySelector('img');
  const foot = document.querySelector('.site-foot');

  /* blend up from whatever ground the section above has, so the seam is clean whoever built it */
  const prev = sec.previousElementSibling;
  const bg = prev ? getComputedStyle(prev).backgroundColor : '';
  if (bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg)) sec.style.setProperty('--close-from', bg);
  sec.style.setProperty('--close-blend', Math.max(0, +KNOBS.blendPx || 0) + 'px');

  /* the phone layout sizes the band to the screen minus the footer, so the two make the last
     screen together */
  function measureFoot() { sec.style.setProperty('--close-foot', (foot ? foot.offsetHeight : 0) + 'px'); }
  measureFoot();
  if (foot && 'ResizeObserver' in window) new ResizeObserver(measureFoot).observe(foot);
  else window.addEventListener('resize', measureFoot);

  function settle() {
    sec.style.setProperty('--close-dev', '1');
    sec.style.setProperty('--close-push', String(KNOBS.pushTo));
  }
  if (BMH.reduced) { settle(); return; }   // the settled film, and never the implant

  if (KNOBS.develop) {
    let onscreen = true, last = -1;
    const develop = function () {
      if (!onscreen) return;
      const p = BMH.passProgress(stage);
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      const d = BMH.smooth(KNOBS.start, KNOBS.developEnd, p);
      const k = BMH.ease((p - KNOBS.start) / (KNOBS.pushEnd - KNOBS.start));
      sec.style.setProperty('--close-dev', BMH.lerp(KNOBS.developFrom, 1, d).toFixed(3));
      sec.style.setProperty('--close-push', BMH.lerp(KNOBS.pushFrom, KNOBS.pushTo, k).toFixed(4));
    };
    /* a jump (End key, reload at the foot of the page) lands before the observer says the band is
       on screen, so catch up when it does */
    BMH.visible(stage, function (v) { onscreen = v; if (v) develop(); });
    BMH.onScroll(develop);
  } else settle();

  if (KNOBS.image === 'vanish' && window.THREE) vanish();

  /* ------------------------------------------------------------------ the vanish */
  function vanish() {
    const canvas = document.createElement('canvas');
    canvas.className = 'close__implant';
    canvas.setAttribute('aria-hidden', 'true');
    box.appendChild(canvas);
    let renderer;
    try { renderer = BMH.renderer(canvas, { alpha: true }); }
    catch (e) { canvas.remove(); return; }
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8000);
    camera.position.set(0, 0, 4000);

    const ink = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--brand-dark').trim() || '#0F2942');
    const MODES = { bottom: 0, top: 1, ends: 2, all: 3 };
    const U = {
      uInk: { value: new THREE.Vector3(ink.r, ink.g, ink.b) },   // sRGB, written straight out
      uP: { value: 0 },
      uEdge: { value: KNOBS.edge },
      uRagged: { value: KNOBS.ragged },
      uBand: { value: KNOBS.band },
      uGrain: { value: KNOBS.grainMm },
      uThin: { value: KNOBS.thinning },
      uMode: { value: MODES[KNOBS.vanishFrom] !== undefined ? MODES[KNOBS.vanishFrom] : 0 },
      uC: { value: new THREE.Vector2() },
      uAxis: { value: new THREE.Vector2(0, 1) },
      uHalf: { value: 1 },
      uPx: { value: 1 }
    };
    /* Every fragment writes its density, and the canvas keeps the MAX at each pixel: overlapping
       metal (a screw head in its countersink, a shank under the plate) is as dense as the densest
       layer, never denser, the way metal saturates on film. */
    const mat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: [
        'varying vec3 vW;',
        'varying vec3 vN;',
        'void main() {',
        '  vec4 w = modelMatrix * vec4(position, 1.0);',
        '  vW = w.xyz;',
        '  vN = normalize(normalMatrix * normal);',
        '  gl_Position = projectionMatrix * viewMatrix * w;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uInk;',
        'uniform float uP, uEdge, uRagged, uBand, uGrain, uThin, uMode, uHalf, uPx;',
        'uniform vec2 uC, uAxis;',
        'varying vec3 vW;',
        'varying vec3 vN;',
        'float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
        'float vn(vec2 p) {',
        '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
        '  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);',
        '}',
        'float fbm(vec2 p) { return 0.55 * vn(p) + 0.3 * vn(p * 2.03 + 7.1) + 0.15 * vn(p * 4.01 + 3.3); }',
        'void main() {',
        /* the thin edge: where the surface turns away from the beam the metal path is short */
        '  float ndv = abs(normalize(vN).z);',
        '  float a = mix(uEdge, 1.0, smoothstep(0.04, 0.42, ndv));',
        /* where on the implant this is, in the film plane, so front and back faces agree */
        '  vec2 d = vW.xy - uC;',
        '  vec2 q = d / uPx;',
        '  float s = clamp(dot(d, uAxis) / uHalf, -1.0, 1.0);',
        '  float along = uMode < 0.5 ? 0.5 + 0.5 * s : uMode < 1.5 ? 0.5 - 0.5 * s : uMode < 2.5 ? 1.0 - abs(s) : 0.5;',
        '  float f = mix(along, fbm(q / 2.6), uRagged);',
        /* the front: 0 intact, 1 gone. Each grain leaves at its own moment inside the band */
        '  float F = mix(0.15, 0.68 + uBand, uP);',
        '  float lp = clamp((F - f) / uBand, 0.0, 1.0);',
        '  float g = vn(q / uGrain);',
        '  float keep = (1.0 - smoothstep(g * 0.5, g * 0.5 + 0.5, lp)) * (1.0 - 0.6 * lp);',
        '  float dens = a * keep * (1.0 - uThin * uP) * (1.0 - smoothstep(0.9, 1.0, uP));',
        '  if (dens < 0.004) discard;',
        '  gl_FragColor = vec4(uInk * dens, dens);',
        '}'
      ].join('\n'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor
    });

    const implant = new THREE.Group();     // millimetres, plate frame: long axis X, normal +Y
    scene.add(implant);

    let ready = false, state = 'idle', held = null, raf = 0, visible = true;
    let resolveReady;
    const readyP = new Promise(function (r) { resolveReady = r; });

    /* the plate on the bone: bone.x/y is a point on the bone's centre line in film pixels, angleDeg its
       lean from vertical (+ = its far end to the right), halfWidth its half-width, side the edge the
       plate sits on (-1 left, +1 right, turned with the lean) */
    function place() {
      const b = KNOBS.bone, px = FILM_PX_PER_MM * KNOBS.implantSize;
      const lean = b.angleDeg * Math.PI / 180, view = KNOBS.viewDeg * Math.PI / 180;
      /* scene space: x right, y up (film y flipped), z toward the camera */
      const a = new THREE.Vector3(Math.sin(lean), Math.cos(lean), 0);
      const side = new THREE.Vector3(a.y, -a.x, 0).multiplyScalar(b.side < 0 ? -1 : 1);
      const n = side.clone().multiplyScalar(Math.cos(view)).add(new THREE.Vector3(0, 0, Math.sin(view)));
      const w = new THREE.Vector3().crossVectors(a, n);
      implant.matrixAutoUpdate = false;
      const m = new THREE.Matrix4().makeBasis(a, n, w).multiply(new THREE.Matrix4().makeScale(px, px, px));
      /* the seating face sits on the bone's surface, seen at the view angle */
      const c = new THREE.Vector3(b.x, -b.y, 0).addScaledVector(side, b.halfWidth * Math.cos(view));
      m.setPosition(c);
      implant.matrix.copy(m);
      implant.updateMatrixWorld(true);
      U.uC.value.set(c.x, c.y);
      U.uAxis.value.set(a.x, a.y);
      U.uHalf.value = BMH.PLATE_V2.lengthMm / 2 * px;
      U.uPx.value = px;
    }

    function layout() {
      const W = box.clientWidth, H = box.clientHeight;
      if (!W || !H) return false;
      renderer.setSize(W, H, false);
      const iw = img.naturalWidth || 900, ih = img.naturalHeight || 830;
      const k = Math.max(W / iw, H / ih);
      const pos = getComputedStyle(img).objectPosition.split(/\s+/);
      function off(v, free) {
        if (!v) return free * 0.5;
        if (v.slice(-1) === '%') return free * parseFloat(v) / 100;
        return parseFloat(v) || 0;
      }
      const ox = off(pos[0], W - iw * k), oy = off(pos[1], H - ih * k);
      camera.left = -ox / k; camera.right = (W - ox) / k;
      camera.top = oy / k; camera.bottom = -(H - oy) / k;
      camera.updateProjectionMatrix();
      return true;
    }

    function draw() {
      if (!ready) return;
      renderer.render(scene, camera);
    }

    /* The clock only runs while someone can see it: the tab is showing and the x-ray is on screen.
       Time is counted frame by frame (a hidden tab stops the frames), so it never jumps ahead and is
       never over before anyone looks. Phases: holding -> running -> done, then (with repeatAfterMs)
       waiting -> fading back in -> holding again. */
    let phase = 0, lastT = 0, plays = 0;
    function tick(now) {
      raf = 0;
      if (held !== null) return;
      phase += Math.min(now - lastT, 50);   // a stalled frame counts as one frame, not a skip
      lastT = now;
      if (state === 'holding') {
        if (phase >= KNOBS.holdMs) { state = 'running'; phase = 0; }
      } else if (state === 'running') {
        const t = BMH.clamp(phase / KNOBS.vanishMs, 0, 1);
        /* it starts to go as soon as the hold ends and slows into the rest */
        U.uP.value = 1 - Math.pow(1 - t, 1.25);
        if (visible) draw();
        if (t >= 1) {
          plays++;
          canvas.style.visibility = 'hidden';
          if (KNOBS.repeatAfterMs > 0 && plays <= KNOBS.repeats) { state = 'waiting'; phase = 0; }
          else { state = 'done'; return; }
        }
      } else if (state === 'waiting') {
        if (phase >= KNOBS.repeatAfterMs) {
          state = 'fading'; phase = 0;
          U.uP.value = 0; draw();
          canvas.style.opacity = '0';
          canvas.style.visibility = '';
        }
      } else if (state === 'fading') {
        const f = BMH.clamp(phase / KNOBS.fadeInMs, 0, 1);
        canvas.style.opacity = f.toFixed(3);
        if (f >= 1) { canvas.style.opacity = ''; state = 'holding'; phase = 0; }
      } else return;
      raf = requestAnimationFrame(tick);
    }

    function run() {
      if (raf) return;
      lastT = performance.now();
      raf = requestAnimationFrame(tick);
    }

    /* the implant back on the bone, whole, ready to go again */
    function reset() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; phase = 0; plays = 0;
      state = 'idle';
      U.uP.value = 0;
      canvas.style.opacity = '';
      canvas.style.visibility = '';
      if (layout()) draw();
    }

    function seen() {
      const r = box.getBoundingClientRect(), vh = window.innerHeight;
      if (!r.height) return 0;
      return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / r.height;
    }

    function check() {
      if (!ready || held !== null) return;
      const f = seen();
      /* out of sight: put it back, so the next visit sees it go (and a half-played one isn't missed) */
      if (state !== 'idle' && KNOBS.replay && f <= KNOBS.resetBelow) { reset(); return; }
      if (state !== 'idle' || document.visibilityState !== 'visible') return;
      if (f < KNOBS.trigger) return;
      state = 'holding'; phase = 0;
      run();
    }

    /* leaving the tab mid-play puts it back; coming back to the tab looks again */
    document.addEventListener('visibilitychange', function () {
      if (held !== null) return;
      if (document.visibilityState === 'visible') { check(); if (state !== 'idle' && state !== 'done') run(); return; }
      if (state === 'holding' || state === 'running' || state === 'fading') reset();
    });

    const P2 = BMH.PLATE_V2;
    BMH.glb(P2.blob).then(function (gP) {
      return BMH.glb('glb-screw').then(function (gS) { return [gP, gS]; });
    }).then(function (g) {
      const gP = g[0], gS = g[1];
      let body = null;
      gP.scene.traverse(function (o) {
        if (o.isMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
      });
      if (!body) return;
      /* v2 already has the measured thickness and crisp countersinks: drawn as it comes */
      const plate = new THREE.Mesh(body.geometry, mat);
      plate.scale.setScalar(1000);
      implant.add(plate);

      /* the screws seat in v2's countersinks, the head's rim bearing on the cone, and run into the
         bone along the plate normal, each a few degrees off true as a surgeon's would be */
      const H = P2.holesXmm;
      const holes = KNOBS.screws === 2 ? [H[0], H[3]] : H;
      const tilt = [0.05, -0.03, 0.04, -0.06];
      const coneSlope = (P2.thicknessMm - P2.coneBottomYmm) / (P2.coneTopRmm - P2.boreRmm);
      const seatY = P2.coneBottomYmm + (SCREW.headRmm - P2.boreRmm) * coneSlope;   // 1.610 mm
      const tipY = seatY + SCREW.rimBelowTopMm - SCREW.lengthMm;                     // head top 2.860
      holes.forEach(function (x, i) {
        const pivot = new THREE.Group();          // turns about the seat, so the head stays in it
        pivot.position.set(x, seatY, 0);
        pivot.rotation.set(tilt[(i + 1) % 4] * 0.6, 0, tilt[i]);
        const s = gS.scene.clone(true);
        s.scale.setScalar(1000);
        s.position.set(0, tipY - seatY, 0);
        s.traverse(function (o) { if (o.isMesh) o.material = mat; });
        pivot.add(s);
        implant.add(pivot);
      });

      place();
      layout();
      renderer.compile(scene, camera);
      ready = true;
      draw();
      resolveReady();

      BMH.onScroll(check);
      BMH.visible(box, function (v) { visible = v; });
      function relayout() { if (layout()) draw(); }
      if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(box);
      else window.addEventListener('resize', relayout);
    }).catch(function () { canvas.remove(); });

    BMH.closeBand = BMH.closeBand || {};
    BMH.closeBand['opp-close'] = {
      ready: readyP,
      set: function (o) {
        Object.assign(KNOBS, o || {});
        U.uEdge.value = KNOBS.edge; U.uRagged.value = KNOBS.ragged; U.uBand.value = KNOBS.band;
        U.uGrain.value = KNOBS.grainMm; U.uThin.value = KNOBS.thinning;
        if (MODES[KNOBS.vanishFrom] !== undefined) U.uMode.value = MODES[KNOBS.vanishFrom];
        readyP.then(function () { place(); layout(); draw(); });
      },
      hold: function (p) {
        held = p === null || p === undefined ? null : BMH.clamp(+p, 0, 1);
        if (held === null) { if (state === 'holding' || state === 'running') { state = 'idle'; } check(); return; }
        if (raf) cancelAnimationFrame(raf);
        raf = 0; phase = 0;
        state = 'idle';
        canvas.style.opacity = '';
        canvas.style.visibility = '';
        readyP.then(function () { layout(); U.uP.value = held; draw(); });
      }
    };
  }
})();
