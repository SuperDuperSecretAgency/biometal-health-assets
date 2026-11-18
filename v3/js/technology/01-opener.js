/* Technology 01 · Opener: the page's hero. The implant in the x-ray dissolves as you scroll; the
   x-ray stays.                                                                                  -z1n

   Ported from the homepage close's 'vanish' (src/sections/09-close/section.js): our own plate v2
   (glb-plate-v2-hi, numbers in BMH.PLATE_V2, never reshaped) and four screws (glb-screw) drawn on a
   canvas over the bare tibia of a real film, in the film's radiopaque density. On a dark film metal
   is the brightest thing there, so the ink is the film's own top tone, near white; on the light
   look's film it is the darkest, --brand-dark. The canvas keeps the densest layer either way. The film's pixels
   are never touched; the canvas sits in the image's box, under the scrim, and turns and zooms with it.

   Here the resorb is tied to scroll, not time. The stage pins for KNOBS.scrollScreens; across it a
   soft front travels the implant, the metal at the front breaks into grain, and the grain thins to
   nothing. Scroll back up and it comes back. It draws only when the scroll moves, and not at all
   offscreen.

   Reduced motion: no pin and no implant, as the homepage close does, so the settled frame is the
   film alone (KNOBS.reducedImplant shows the implant whole instead).

   Speed (v3, 4 Nov: the engine of WF/build/technology/01-opener/embed.html, with the Webflow core of 17 Oct):
   the two models parse in quiet time, one per idle period (BMH.glb, which parses each inlined blob once and
   hands out copies); the build, its compile and the first draw follow as soon as both are in, never queued
   behind other quiet-time work, since this is the first screen. Until then the film shows alone. The opener
   holds the page's other quiet-time work (BMH.busy) until its implant is drawn, so the scenes further down
   build after it. The scroll tick makes no layout read: BMH.pinProgress reads the stage's box through
   BMH.rect, measured once at the start of the tick; the film's size is a constant (both looks' films are
   1100 x 2400). The film loads eagerly (loading="eager", perf/AUDIT.md 12).

   Review hooks (not used by the page): BMH.techOpener.hold(p) pins the resorb at p in 0..1 (null
   follows the scroll again), BMH.techOpener.ready is a promise.                                 */
(function () {
  'use strict';

  const KNOBS = window.BMH.knobs('tech-opener', {
    look: window.BMH.look, // 'dark': the dark film under a navy scrim, white type (the main site). 'light': the site's
                          // light film, a pale pool under the headline, navy type, navy metal. Default: the site's look
    scrollScreens: 1.25,  // how many screens of scroll the hero holds while the implant goes
    resorbFrom: 0.04,     // share of that scroll before the metal starts to go
    resorbTo: 0.82,       // share of that scroll by which it is gone; the bare film holds after
    scrim: 0.6,           // how dark the scrim is: 0 = the bare film, 1 = heaviest
    copy: 'bottom',       // landscape: the headline low on the left, as on Opportunity's hero; or 'top'
    copyPhone: 'bottom',  // portrait: the headline low (over the ankle) or 'top'

    /* the film */
    turn: -90,            // landscape: the upright film turned so the tibia lies across. -90 = bone along
                          // the top, shaft left, ankle right, soft tissue under it for the headline;
                          // 90 = the other way up (bone along the foot, headline on top); 0 = upright
    crop: [50, 0],        // landscape: which part of the film fills the view, as object-position % of
                          // the upright film [across, down]; down 0 = the top of the film (the shaft)
    cropPhone: [50, 0],   // portrait: the same, upright
    zoom: 1,              // landscape: push in on the film (1 = just fills the view)
    zoomPhone: 1.12,      // portrait

    /* the implant */
    implantAt: 640,       // where the plate's centre sits along the tibia, in film px from the film's top
    implantSize: 0.8,     // 1 = true size by the film's scale (57.8 mm plate); less = smaller
    implantAtPhone: 700,
    implantSizePhone: 0.8,
    viewDeg: 18,          // 0 = plate seen edge-on, screws crossing the bone in profile; 90 = plate flat to camera
    screws: 4,            // 4 = every hole, 2 = the two outer holes
    metal: null,          // the metal's density. null = the look's: on the dark film its brightest tone (make-film/make.sh),
                          // #E8EFF6, near white; on the light film its darkest, --brand-dark, as the close bands draw it

    /* how it goes (the homepage close's resorb) */
    vanishFrom: 'top',    // where the metal goes first, on the upright film: 'top' (the knee end, so on the
                          // turned film the front runs left to right), 'bottom', 'ends', 'all' (everywhere at once)
    ragged: 0.35,         // how much the front wanders: 0 straight across, 1 all over
    band: 0.4,            // how deep the zone is where metal breaks into grain, as a share of the implant
    grainMm: 0.22,        // grain size, in implant millimetres
    thinning: 0.25,       // how much the whole implant pales while it goes, ahead of the front
    edge: 0.7,            // density at the metal's thin edge: 1 = flat to the rim, lower = a lighter rim

    highlight: false,     // true: "dissolve." takes the live site's light-blue fade (.hl-fade)
    reducedImplant: false // reduced motion: false = the film alone (as the homepage close); true = the implant, whole
  });

  /* The film, upright, in its own pixels (1100 x 2400, make-film/make.sh). The real screws' 3.5 mm
     threads read about 55 px, so about 14.5 px per mm. The tibia's shaft is straight from the top to
     about y = 900: its medial surface at x ~ 552, its lateral near the crop's edge (~1085). The plate
     sits on the medial surface, seen nearly edge-on, and its screws run laterally into the bone. */
  const FILM_W = 1100, FILM_H = 2400;
  const FILM_PX_PER_MM = 14.5;
  const BONE = { x: 818, angleDeg: -0.4, halfWidth: 266, side: -1 };   // centre at the film's top, lean from upright
  /* the screw's head, from model-screw-z1n/SPEC.md §3 (as the homepage close) */
  const SCREW = { lengthMm: 10.5, headRmm: 2.8, rimBelowTopMm: 1.25 };

  const BMH = window.BMH;
  const sec = document.getElementById('s-tech-opener');
  if (!sec || !BMH) return;
  const stage = sec.querySelector('.to-stage');
  const box = sec.querySelector('.to-film');
  const img = box && box.querySelector('.to-img');
  if (!stage || !img) return;
  const hl = sec.querySelector('.to-hl');
  const light = KNOBS.look === 'light';
  if (light) {
    sec.setAttribute('data-look', 'light');
    if (img.dataset.lightSrc) img.src = img.dataset.lightSrc;   // only on a dark build with the knob set; build.py --look light swaps it already
  }
  if (hl) hl.classList.toggle('hl-fade', !!KNOBS.highlight);

  const portraitQ = window.matchMedia('(max-aspect-ratio: 1/1)');
  const phone = function () { return portraitQ.matches; };

  function applyLayout() {
    const p = phone();
    const crop = p ? KNOBS.cropPhone : KNOBS.crop;
    sec.style.setProperty('--scrim', String(KNOBS.scrim));
    sec.style.setProperty('--zoom', String(p ? KNOBS.zoomPhone : KNOBS.zoom));
    sec.style.setProperty('--turn', (KNOBS.turn || 0) + 'deg');
    sec.style.setProperty('--crop-x', crop[0] + '%');
    sec.style.setProperty('--crop-y', crop[1] + '%');
    sec.classList.toggle('is-upright', !KNOBS.turn);
    const at = p ? KNOBS.copyPhone : KNOBS.copy;
    sec.classList.toggle('copy-top', at === 'top');
    sec.classList.toggle('copy-bottom', at === 'bottom');
  }
  applyLayout();

  const still = BMH.reduced;
  sec.style.setProperty('--pin', String(still ? 0 : KNOBS.scrollScreens));
  if (still && !KNOBS.reducedImplant) {
    if (portraitQ.addEventListener) portraitQ.addEventListener('change', applyLayout);
    return;
  }
  if (!window.THREE) return;

  /* ------------------------------------------------------------------ the implant */
  const canvas = document.createElement('canvas');
  canvas.className = 'to-implant';
  canvas.setAttribute('aria-hidden', 'true');
  box.appendChild(canvas);
  let renderer;
  try { renderer = BMH.renderer(canvas, { alpha: true }); }
  catch (e) { canvas.remove(); return; }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8000);
  camera.position.set(0, 0, 4000);

  const ink = new THREE.Color(KNOBS.metal ||
    (light ? getComputedStyle(document.documentElement).getPropertyValue('--brand-dark').trim() || '#0F2942' : '#E8EFF6'));
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
  /* The close's shader, with one change: at uP = 0 the implant is whole (the close lets the first
     grain go at once; here the top of the page is the settled, intact frame). Every fragment writes
     its density and the canvas keeps the MAX at each pixel, so overlapping metal (a screw head in its
     countersink) is as dense as the densest layer, the way metal saturates on film. */
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
      '  float ndv = abs(normalize(vN).z);',
      '  float a = mix(uEdge, 1.0, smoothstep(0.04, 0.42, ndv));',
      '  vec2 d = vW.xy - uC;',
      '  vec2 q = d / uPx;',
      '  float s = clamp(dot(d, uAxis) / uHalf, -1.0, 1.0);',
      '  float along = uMode < 0.5 ? 0.5 + 0.5 * s : uMode < 1.5 ? 0.5 - 0.5 * s : uMode < 2.5 ? 1.0 - abs(s) : 0.5;',
      '  float f = mix(along, fbm(q / 2.6), uRagged);',
      '  float F = mix(0.0, 0.68 + uBand, uP);',
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

  let ready = false, onscreen = true, held = null, lastP = -1;
  let resolveReady;
  const readyP = new Promise(function (r) { resolveReady = r; });

  /* the plate on the tibia's medial surface, in film pixels (scene y = -film y) */
  function place() {
    const p = phone();
    const b = BONE, px = FILM_PX_PER_MM * (p ? KNOBS.implantSizePhone : KNOBS.implantSize);
    const y = p ? KNOBS.implantAtPhone : KNOBS.implantAt;
    const lean = b.angleDeg * Math.PI / 180, view = KNOBS.viewDeg * Math.PI / 180;
    const a = new THREE.Vector3(Math.sin(lean), Math.cos(lean), 0);          // along the bone, toward the knee
    const side = new THREE.Vector3(a.y, -a.x, 0).multiplyScalar(b.side < 0 ? -1 : 1); // across, to the plate's side
    const n = side.clone().multiplyScalar(Math.cos(view)).add(new THREE.Vector3(0, 0, Math.sin(view))); // plate normal
    const w = new THREE.Vector3().crossVectors(a, n);
    implant.matrixAutoUpdate = false;
    const m = new THREE.Matrix4().makeBasis(a, n, w).multiply(new THREE.Matrix4().makeScale(px, px, px));
    const c = new THREE.Vector3(b.x - Math.tan(lean) * y, -y, 0).addScaledVector(side, b.halfWidth * Math.cos(view));
    m.setPosition(c);
    implant.matrix.copy(m);
    implant.updateMatrixWorld(true);
    U.uC.value.set(c.x, c.y);
    U.uAxis.value.set(a.x, a.y);
    U.uHalf.value = BMH.PLATE_V2.lengthMm / 2 * px;
    U.uPx.value = px;
  }

  /* the camera sees exactly the part of the film the image shows (object-fit: cover). Runs at the build, on a
     resize and on a turn of the phone, never in a scroll tick. */
  function layout() {
    const W = box.clientWidth, H = box.clientHeight;
    if (!W || !H) return false;
    renderer.setSize(W, H, false);
    const iw = FILM_W, ih = FILM_H;
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

  function draw(p) {
    if (!ready) return;
    U.uP.value = p;
    canvas.style.visibility = p >= 1 ? 'hidden' : '';
    if (p < 1) renderer.render(scene, camera);
  }

  /* scroll -> resorb, eased in and out across its span */
  function progress() {
    if (still) return 0;
    const t = BMH.pinProgress(sec);
    return BMH.smooth(KNOBS.resorbFrom, KNOBS.resorbTo, t);
  }
  function onScroll() {
    if (!ready || !onscreen || held !== null) return;
    const p = progress();
    if (Math.abs(p - lastP) < 0.0005) return;
    lastP = p;
    draw(p);
  }

  function relayout() {
    applyLayout();
    if (!ready) return;
    place();
    if (layout()) { lastP = -1; draw(held !== null ? held : progress()); }
  }

  const P2 = BMH.PLATE_V2;
  const built = Promise.all([BMH.glb(P2.blob), BMH.glb('glb-screw')]).then(function (g) {
    const gP = g[0], gS = g[1];
    let body = null;
    gP.scene.traverse(function (o) {
      if (o.isMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
    });
    if (!body) return;
    const plate = new THREE.Mesh(body.geometry, mat);   // v2 as it comes: measured thickness, crisp countersinks
    plate.scale.setScalar(1000);
    implant.add(plate);

    /* the screws seat in v2's countersinks, the head's rim on the cone, and run into the bone along
       the plate normal, each a few degrees off true as a surgeon's would be */
    const H = P2.holesXmm;
    const holes = KNOBS.screws === 2 ? [H[0], H[3]] : H;
    const tilt = [0.05, -0.03, 0.04, -0.06];
    const coneSlope = (P2.thicknessMm - P2.coneBottomYmm) / (P2.coneTopRmm - P2.boreRmm);
    const seatY = P2.coneBottomYmm + (SCREW.headRmm - P2.boreRmm) * coneSlope;
    const tipY = seatY + SCREW.rimBelowTopMm - SCREW.lengthMm;
    holes.forEach(function (x, i) {
      const pivot = new THREE.Group();
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
    lastP = progress();
    draw(lastP);
    resolveReady();

    BMH.onScroll(onScroll);
    BMH.visible(stage, function (v) { onscreen = v; if (v) onScroll(); });
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(box);
    else window.addEventListener('resize', relayout);
    if (portraitQ.addEventListener) portraitQ.addEventListener('change', relayout);
  });
  built.catch(function () { canvas.remove(); });
  /* the hero's entrance: other sections' BMH.idle work waits for it (6 s at most) */
  if (BMH.busy) BMH.busy(built);

  BMH.techOpener = {
    ready: readyP,
    hold: function (p) {
      held = p === null || p === undefined ? null : BMH.clamp(+p, 0, 1);
      readyP.then(function () {
        if (held === null) { lastP = -1; onScroll(); return; }
        draw(held);
      });
    }
  };
})();
