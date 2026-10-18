/* Partner Program 01 · Opener. Round 2: two directions behind one knob.               -z1n
   Andrew, 25 Sep: "I want to rethink the hero. This hero is boring." The relay under it is cut, so
   the hero either carries the coating itself, or hands the page to the real product.

   KNOBS.hero
     'a'  The coat happens here. The v2 plate, big and bright, sits bare as the page opens. A moment
          later the zinc stream settles on it once, far end first: the finish turns from dull machined
          grey to the brighter, cooler, satin coat, and the plate turns a few degrees so the new
          finish catches the light. Then it rests coated. A one-time entrance: it plays when the hero
          is first on screen, never loops, and draws nothing once it has settled.
     'b'  BioMetal's own photograph of its two plates, big, with the headline over the clean ground.
          Nothing moves, except (KNOBS.sheen) one pass of light across the metal as the page opens.

   (a) is copied from _cut-02-relay, itself from 01-hero's look: 'photo' and 05-coat: the studio, the
   photo surface, the coat front and its crystals, the zinc particles, the contact shadow. The relay
   carried the plate through a standing stream; here the plate holds still and the front sweeps it,
   as on the homepage, over time instead of scroll. The plate is glb-plate-v2-hi as it ships
   (BMH.PLATE_V2). Never BMH.plateReshape.

   Reduced motion: (a) the settled, coated frame; (b) no sheen.
   Review hooks (not used by the page): BMH.pppOpener.at(ms) holds (a) at that moment of the
   entrance (null plays it normally); .replay() plays it again; .ready is a promise. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('ppp-opener', {
    hero: 'a',              // 'a' the coat happens here, live · 'b' BioMetal's photograph of its plates

    /* --- (a) the entrance: once, as the page opens ----------------------------------------------- */
    holdMs: 700,            // the bare plate holds this long before the first zinc arrives
    coatMs: 3400,           // how long the coat front takes to cross the plate
    coatFrom: 'right',      // the end the coat starts from: 'right' (the far end, under the stream) or 'left'
    turn: 9,                // degrees the plate turns while it coats, so the new finish catches the light
    flightTime: 0.6,        // seconds each zinc particle spends in the air
    settleTime: 0.28,       // seconds a landed particle stays before it becomes surface

    /* --- (a) the zinc particles (05-coat's) ------------------------------------------------------ */
    particles: 18000,       // how many, on wide screens
    particlesPhone: 9000,   // how many, under 900 px
    particlePx: 2.2,        // particle size on screen, px
    streak: 7.0,            // how far a fast particle stretches, in multiples of its size
    brake: 2.2,             // how hard they brake before landing (1 = not at all, 3 = a lot)
    reach: 1.2,             // how far away they start, in screen heights (above 1 = off-frame)
    spread: 0.3,            // how wide the stream is (0 = parallel, 1 = very wide)
    curl: 0.08,             // how much the paths bend
    from: [1.0, 0.55, 0.3],        // where the stream comes from, wide screens: [right, up, toward you].
                                   //   From the right and low, so it stays clear of the copy and the nav
    fromPhone: [1.0, 0.45, 0.35],  // ... under 900 px: from the side, clear of the copy above
    zincColor: '#cfd5dc',   // the crystals' metal colour
    zincRough: 0.34,

    /* --- (a) the coat (05-coat's front) ---------------------------------------------------------- */
    frontCurve: 0.02,       // how much the front bows, per mm² across the plate
    frontWobble: 0.9,       // how uneven the front is, mm
    band: 3.2,              // mm ahead of the front where the first crystals land
    fillIn: 5.0,            // mm behind the front until the young coat has settled
    grainMm: 0.5,           // zinc crystal size, mm ...
    grainPx: 7,             //   ... but never smaller than this on screen, px
    crystals: 0.05,         // how much each young crystal tilts the light
    // bare: pushed past biometal_uncoated (darker, rougher, grit in the normal) so the switch reads,
    // as on the homepage. coated: biometal_coated as it ships (color null = the GLB's own).
    bare:   { color: '#a9a9a7', rough: 1.3, grit: 1.0 },
    coated: { color: null, rough: 1.0 },

    /* --- (a) the photo look (01-hero's) ---------------------------------------------------------- */
    grain: 1.0,             // fine blasted grain, 0 smooth to 1.5 coarse
    scuffs: 0.5,            // handling smudges and fine scratches on the top face
    machiningMarks: 0.6,    // faint lengthwise lapping marks on the faces
    turningRings: 0.7,      // concentric tool rings in the countersinks
    wallGrit: 1.0,          // the blasted walls' blotches and streaks
    wallTone: 0.86,         // how bright the walls read against the faces
    coneRoughness: 0.22,    // how satin the coated countersinks are
    edgeRadiusMm: 0.3,      // the rolled radius along every top edge
    edgeCatch: 0.8,         // how brightly that radius catches the softbox
    shadow: 0.5,            // soft shadow strength
    contactShadow: 0.6,     // the tight dark line where metal meets ground
    shadowSoftMm: 2.2,      // how far the soft shadow spreads
    exposure: 1.0,

    /* --- (a) the camera: the plate fills the art box (.ppp-open__art in section.css) -------------- */
    lensDeg: 16,            // vertical field of view; lower is a longer lens
    elevation: 31,          // camera height above the ground, degrees (BioMetal's photographs: 31)
    yaw: 30,                // the plate's turn on the ground, wide screens, degrees (0 = broadside)
    yawPhone: 58,           // ... under 900 px, steeper so it fills the taller box
    plateSize: 1.0,         // how much of the art box's width the plate spans, wide screens
    plateSizePhone: 0.96,   // ... under 900 px
    phoneBelow: 900,

    /* --- (b) the photograph ---------------------------------------------------------------------- */
    sheen: true,            // one pass of light across the metal as the page opens (false: nothing moves)
    sheenDelayMs: 450,      // after the photo is on screen
    sheenMs: 1700,          // how long the pass takes, left to right
    sheenStrength: 0.5      // how bright the light is at its centre, 0..1
  });

  var BMH = window.BMH, THREE = window.THREE;
  var section = document.getElementById('s-ppp-opener');
  if (!BMH || !section) return;
  var hero = KNOBS.hero === 'b' ? 'b' : 'a';
  section.setAttribute('data-hero', hero);
  var still = !!BMH.reduced;

  /* ==== (b) the photograph: static, and at most one pass of light ============================== */
  if (hero === 'b') {
    var sheen = section.querySelector('.ppp-open__sheen');
    var img = section.querySelector('.ppp-open__img');
    if (!sheen || !img || !KNOBS.sheen || still || !sheen.animate) return;
    sheen.style.setProperty('--sheen', String(KNOBS.sheenStrength));
    var passed = false, decoded = false, seen = false;
    var pass = function () {
      if (passed || !decoded || !seen) return;
      passed = true;
      sheen.animate([
        { opacity: 1, backgroundPosition: '100% 0' },
        { opacity: 1, backgroundPosition: '0% 0' }
      ], { duration: KNOBS.sheenMs, delay: KNOBS.sheenDelayMs, easing: 'cubic-bezier(0.45, 0, 0.3, 1)' });
    };
    (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () { decoded = true; pass(); });
    BMH.visible(section, function (v) { if (v) { seen = true; pass(); } }, '0px');
    return;
  }

  /* ==== (a) the coat, live ======================================================================= */
  if (!THREE) { section.classList.add('no-gl'); return; }
  var canvas = section.querySelector('.ppp-open__canvas');
  var art = section.querySelector('.ppp-open__art');

  var DEG = Math.PI / 180;
  var clamp = BMH.clamp, lerp = BMH.lerp, smooth = BMH.smooth;
  var isPhone = function () { return window.innerWidth < KNOBS.phoneBelow; };

  /* The plate, in mm (BMH.PLATE_V2; model-plate-v2-z1n/SPEC.md §2). X long, +Y thickness, Z width. */
  var PV = BMH.PLATE_V2 || {
    blob: 'glb-plate-v2-hi', lengthMm: 57.786, widthMm: 9.068, thicknessMm: 1.815,
    holesXmm: [-24.359, -12.124, 12.124, 24.359], coneBottomYmm: 1.280, coneTopRmm: 3.194, boreRmm: 2.165
  };
  var HX = PV.lengthMm / 2, HZ = PV.widthMm / 2, T = PV.thicknessMm;
  var HOLES = PV.holesXmm, CONE_Y = PV.coneBottomYmm, CONE_R = PV.coneTopRmm, BORE_R = PV.boreRmm;
  var HMID = [(HOLES[0] + HOLES[1]) / 2, (HOLES[1] + HOLES[2]) / 2, (HOLES[2] + HOLES[3]) / 2];
  var f3 = function (x) { return x.toFixed(3); };

  /* ---- renderer -------------------------------------------------------------------------- */
  var renderer;
  try { renderer = BMH.renderer(canvas, { exposure: KNOBS.exposure }); }
  catch (e) { fail(); return; }
  renderer.setClearColor(0x000000, 0);
  function fail() { section.classList.add('no-gl'); }

  /* ---- 01-hero's 'photo' studio: softboxes of diffusion fabric over a cool seamless -------- */
  var STUDIO = {
    floor: 0.64, horizon: 0.9, sweep: 0.9, zenith: 0.5, front: 0.2,
    tint: [0.955, 0.95, 1.04], soft: 0.4,
    boxes: [
      [60, 40, [0, 34, 26], 2.4],    // big softbox above the camera: the rolled edges' bright line
      [60, 60, [0, 44, -4], 2.6],    // overhead: the far side of each cone
      [34, 22, [22, 20, -26], 1.6],  // key behind right: the sheen along the top face
      [14, 34, [-34, 14, 6], 1.1],   // strip, left
      [10, 28, [34, 10, 14], 0.7]    // strip, right
    ]
  };
  function buildStudio() {
    var s = new THREE.Scene(), t = STUDIO.tint;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uFloor: { value: STUDIO.floor }, uHorizon: { value: STUDIO.horizon }, uSweep: { value: STUDIO.sweep },
        uZenith: { value: STUDIO.zenith }, uFront: { value: STUDIO.front }, uTint: { value: new THREE.Vector3(t[0], t[1], t[2]) }
      },
      vertexShader: 'varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform float uFloor, uHorizon, uSweep, uZenith, uFront; uniform vec3 uTint; varying vec3 vD;',
        'void main() {',
        '  vec3 d = normalize(vD);',
        '  float up = mix(uHorizon, uSweep, smoothstep(0.0, 0.35, d.y));',
        '  up = mix(up, uZenith, smoothstep(0.45, 1.0, d.y));',
        '  up *= mix(1.0, uFront, smoothstep(-0.2, 0.7, d.z) * smoothstep(0.04, 0.3, d.y));',
        '  float c = d.y >= 0.0 ? up : mix(uHorizon, uFloor, smoothstep(0.0, -0.35, d.y));',
        '  gl_FragColor = vec4(c * uTint, 1.0);',
        '}'
      ].join('\n')
    })));
    STUDIO.boxes.forEach(function (b) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(b[0], b[1]), new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: { uCol: { value: new THREE.Color(b[3] * t[0], b[3] * t[1], b[3] * t[2]) }, uSoft: { value: STUDIO.soft } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform vec3 uCol; uniform float uSoft; varying vec2 vUv;',
          'void main() {',
          '  vec2 q = abs(vUv - 0.5) * 2.0;',
          '  float e = (1.0 - smoothstep(1.0 - uSoft, 1.0, q.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, q.y));',
          '  gl_FragColor = vec4(uCol * (1.0 - 0.18 * dot(q, q)), e);',
          '}'
        ].join('\n')
      }));
      m.position.set(b[2][0], b[2][1], b[2][2]);
      m.lookAt(0, 0, 0);
      s.add(m);
    });
    var pm = new THREE.PMREMGenerator(renderer);
    var tex = pm.fromScene(s, 0.0, 0.1, 200).texture;
    pm.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return tex;
  }

  var scene = new THREE.Scene();
  scene.environment = buildStudio();
  var camera = new THREE.PerspectiveCamera(KNOBS.lensDeg, 1, 5, 6000);

  /* ---- shader pieces ------------------------------------------------------------------------ */
  var GLSL_NOISE = [
    'float bmhMod(float x) { return x - floor(x / 289.0) * 289.0; }',
    'float bmhPerm(float x) { return bmhMod((x * 34.0 + 1.0) * x); }',
    'float bmhHash(float x, float y, float z) { return bmhPerm(bmhPerm(bmhPerm(x) + y) + z) / 289.0; }',
    'float bmhVN(vec3 p) {',
    '  vec3 i = floor(p); vec3 f = p - i;',
    '  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  float x0 = bmhMod(i.x), y0 = bmhMod(i.y), z0 = bmhMod(i.z);',
    '  float x1 = bmhMod(i.x + 1.0), y1 = bmhMod(i.y + 1.0), z1 = bmhMod(i.z + 1.0);',
    '  return mix(',
    '    mix(mix(bmhHash(x0, y0, z0), bmhHash(x1, y0, z0), u.x), mix(bmhHash(x0, y1, z0), bmhHash(x1, y1, z0), u.x), u.y),',
    '    mix(mix(bmhHash(x0, y0, z1), bmhHash(x1, y0, z1), u.x), mix(bmhHash(x0, y1, z1), bmhHash(x1, y1, z1), u.x), u.y), u.z);',
    '}',
    'vec3 hash33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }',
    'float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }',
    'void voro(vec3 x, out vec3 id, out float f1, out float f2){',
    '  vec3 i = floor(x), f = fract(x); f1 = 8.0; f2 = 8.0; id = i;',
    '  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int l = -1; l <= 1; l++) {',
    '    vec3 g = vec3(float(l), float(j), float(k));',
    '    vec3 r = g + hash33(i + g) * 0.8 + 0.1 - f;',
    '    float d = dot(r, r);',
    '    if (d < f1) { f2 = f1; f1 = d; id = i + g; } else if (d < f2) { f2 = d; }',
    '  }',
    '  f1 = sqrt(f1); f2 = sqrt(f2);',
    '}'
  ].join('\n');
  var GLSL_BUMP = [
    'vec3 bmhPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {',
    '  vec3 vSigmaX = dFdx(surf_pos.xyz); vec3 vSigmaY = dFdy(surf_pos.xyz);',
    '  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);',
    '  float fDet = dot(vSigmaX, R1) * faceDir;',
    '  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);',
    '  return normalize(abs(fDet) * surf_norm - vGrad);',
    '}'
  ].join('\n');
  var GLSL_SCRATCH = [
    'float bmhScratch(vec2 p, float px) {',
    '  vec2 cell = floor(p / 1.3);',
    '  float m = 0.0;',
    '  for (int b = -1; b <= 1; b++) for (int a = -1; a <= 1; a++) {',
    '    vec2 c = cell + vec2(float(a), float(b));',
    '    float cx = bmhMod(c.x + 40.0), cz = bmhMod(c.y + 40.0);',
    '    if (bmhHash(cx, cz, 7.0) > 0.4) continue;',
    '    vec2 o = (c + vec2(bmhHash(cx, cz, 11.0), bmhHash(cx, cz, 23.0))) * 1.3;',
    '    float an = bmhHash(cx, cz, 31.0) * 3.14159;',
    '    vec2 dir = vec2(cos(an), sin(an));',
    '    float len = 0.2 + 0.6 * bmhHash(cx, cz, 43.0);',
    '    vec2 d = p - o;',
    '    float t = clamp(dot(d, dir), -len, len);',
    '    float w = 0.006 + 0.008 * bmhHash(cx, cz, 59.0);',
    '    float cov = clamp(w / px, 0.0, 1.0) * (1.0 - smoothstep(0.5, 1.0, abs(t) / len));',
    '    m = max(m, cov * (1.0 - smoothstep(0.0, max(w, px), length(d - dir * t))));',
    '  }',
    '  return m;',
    '}'
  ].join('\n');
  /* The coat front, in plate-local mm. The coat starts at the end uDirL points to and sweeps to the
     other. Same formula in JS (frontS) for the particles. */
  var GLSL_FRONT = [
    'float frontS(vec3 p){',
    '  float a = dot(p.xz, uDirL.xz);',
    '  float w = dot(p.xz, vec2(-uDirL.z, uDirL.x));',
    '  return -a + uCurve * w * w + uWob * (0.6 * sin(1.7 * w - 0.35 * a) + 0.4 * sin(0.9 * w + 0.6 * a + 2.0));',
    '}'
  ].join('\n');
  var dirL = new THREE.Vector3(KNOBS.coatFrom === 'left' ? -1 : 1, 0, 0);   // plate-local: the coat starts at the end this points to
  function frontS(x, z) {
    var a = x * dirL.x + z * dirL.z, w = -x * dirL.z + z * dirL.x;
    return -a + KNOBS.frontCurve * w * w + KNOBS.frontWobble * (0.6 * Math.sin(1.7 * w - 0.35 * a) + 0.4 * Math.sin(0.9 * w + 0.6 * a + 2.0));
  }

  /* Uniforms shared by the plates and the zinc. uFront is each plate's own. */
  var U = {
    uGrain: { value: KNOBS.grain }, uThick: { value: T }, uYc: { value: CONE_Y }, uRt: { value: CONE_R }, uRb: { value: BORE_R },
    uScuff: { value: KNOBS.scuffs }, uLap: { value: KNOBS.machiningMarks }, uRings: { value: KNOBS.turningRings },
    uGrit: { value: KNOBS.wallGrit }, uWallTone: { value: KNOBS.wallTone }, uConeRough: { value: KNOBS.coneRoughness },
    uEdgeR: { value: KNOBS.edgeRadiusMm }, uEdgeCatch: { value: KNOBS.edgeCatch },
    uDirL: { value: dirL }, uCurve: { value: KNOBS.frontCurve }, uWob: { value: KNOBS.frontWobble },
    uBand: { value: KNOBS.band }, uFill: { value: KNOBS.fillIn }, uCGrain: { value: KNOBS.grainMm },
    uRawCol: { value: new THREE.Color(0.40, 0.40, 0.39) }, uCoatCol: { value: new THREE.Color(0.70, 0.722, 0.748) },
    uRawMap: { value: null }, uCoatMap: { value: null },
    uRawRough: { value: 0.62 * KNOBS.bare.rough }, uCoatRough: { value: 0.34 * KNOBS.coated.rough },
    uBareGrit: { value: KNOBS.bare.grit }, uCrystal: { value: KNOBS.crystals },
    // zinc
    uP: { value: 0 }, uFlight: { value: KNOBS.flightTime }, uSettle: { value: KNOBS.settleTime },
    uSize: { value: 0.2 }, uStreak: { value: KNOBS.streak }, uReach: { value: 100 }, uBrake: { value: KNOBS.brake },
    uCurl: { value: KNOBS.curl }, uSrc: { value: new THREE.Matrix3() }, uPlateM: { value: new THREE.Matrix4() }
  };

  /* ---- the plate: 01-hero's photo surface over 05-coat's bare -> crystals -> coat ------------ */
  function plateMaterial(src, front) {
    var m = src.clone();
    m.name = 'biometal (ppp opener)';
    m.metalness = 1;
    m.color.setRGB(1, 1, 1);
    m.roughness = 1;
    m.envMapIntensity = 1;
    var uFront = { value: front };
    m.userData.front = uFront;
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      sh.uniforms.uFront = uFront;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;')
        .replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'vPmm = position * 1000.0; vUpN = abs(normal.y);',
          'vVX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vVY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vVZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));'
        ].join('\n'));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', [
          '#include <common>',
          'varying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;',
          'uniform float uGrain, uThick, uYc, uRt, uRb;',
          'uniform float uScuff, uLap, uRings, uGrit, uWallTone, uConeRough, uEdgeR, uEdgeCatch;',
          'uniform vec3 uDirL; uniform float uCurve, uWob, uFront, uBand, uFill, uCGrain, uRawRough, uCoatRough, uBareGrit, uCrystal;',
          'uniform vec3 uRawCol, uCoatCol; uniform sampler2D uRawMap, uCoatMap;',
          GLSL_NOISE, GLSL_BUMP, GLSL_SCRATCH, GLSL_FRONT
        ].join('\n'))
        .replace('#include <clipping_planes_fragment>', [
          '#include <clipping_planes_fragment>',
          /* 01-hero photo: where on the part we are, and its marks */
          'float bmhMottle = bmhVN(vPmm * 0.9 + vec3(4.1, 2.2, 8.3)) * 0.65 + bmhVN(vPmm * 2.6 + vec3(1.7, 6.2, 3.3)) * 0.35 - 0.5;',
          'float bmhPx = max(length(dFdx(vPmm)), length(dFdy(vPmm)));',
          'float bmhGrainK = uGrain * mix(1.0, 0.55, vUpN);',
          'float bmhK1 = 1.0 - smoothstep(0.07, 0.14, bmhPx);',
          'float bmhK2 = 1.0 - smoothstep(0.03, 0.06, bmhPx);',
          'float bmhK3 = 1.0 - smoothstep(0.013, 0.026, bmhPx);',
          'float bmhG = 0.5 + (bmhVN(vPmm * 4.0) - 0.5) * 0.6 * bmhK1 + (bmhVN(vPmm * 9.0 + 3.1) - 0.5) * 0.8 * bmhK2 + (bmhVN(vPmm * 20.0 + 7.7) - 0.5) * 0.8 * bmhK3;',
          'float bmhPit = 0.6 * smoothstep(0.7, 0.9, bmhVN(vPmm * 7.0 + vec3(9.1, 1.3, 5.7))) * bmhK1 + smoothstep(0.72, 0.9, bmhVN(vPmm * 16.0 + vec3(2.9, 8.4, 0.6))) * bmhK2;',
          'float bmhHx = vPmm.x < ' + f3(HMID[0]) + ' ? ' + f3(HOLES[0]) + ' : vPmm.x < ' + f3(HMID[1]) + ' ? ' + f3(HOLES[1]) +
            ' : vPmm.x < ' + f3(HMID[2]) + ' ? ' + f3(HOLES[2]) + ' : ' + f3(HOLES[3]) + ';',
          'float bmhHr = length(vec2(vPmm.x - bmhHx, vPmm.z));',
          'vec2 bmhRad = vec2(vPmm.x - bmhHx, vPmm.z) / max(bmhHr, 1e-4);',
          'float bmhBore = (bmhHr < uRb + 0.08 && vPmm.y > 0.02 && vPmm.y < uYc + 0.02) ? 1.0 : 0.0;',
          'float bmhCone = (bmhHr < uRt + 0.03 && vPmm.y >= uYc - 0.02 && vPmm.y < uThick - 0.01) ? 1.0 : 0.0;',
          'bmhGrainK *= 1.0 - 0.75 * bmhCone;',
          'float bmhWall = (1.0 - bmhCone) * (1.0 - smoothstep(0.25, 0.6, vUpN));',
          'float bmhFace = (1.0 - bmhWall) * (1.0 - bmhCone);',
          'float bmhTop = bmhFace * step(uThick * 0.5, vPmm.y);',
          'float bmhAO = 1.0;',
          'bmhAO *= mix(1.0, mix(0.16, 0.55, smoothstep(0.0, uYc, vPmm.y)), bmhBore);',
          'bmhAO *= mix(1.0, mix(0.66, 1.0, smoothstep(uYc, uThick, vPmm.y)), bmhCone);',
          'bmhAO *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.45, vPmm.y)) * mix(0.72, 1.0, smoothstep(0.1, uThick, vPmm.y)), 1.0 - bmhBore);',
          'float bmhBlot = smoothstep(0.5, 0.85, bmhVN(vPmm * vec3(1.3, 2.2, 1.3) + vec3(5.3, 1.1, 9.4))) * (1.0 - smoothstep(0.2, 0.4, bmhPx));',
          'float bmhStK = 1.0 - smoothstep(0.035, 0.07, bmhPx);',
          'float bmhStreak = (bmhVN(vec3(vPmm.x * 7.0, vPmm.y * 0.9, vPmm.z * 7.0) + 2.7) - 0.5) * bmhStK;',
          'float bmhLapK1 = 1.0 - smoothstep(0.04, 0.08, bmhPx);',
          'float bmhLapK2 = 1.0 - smoothstep(0.012, 0.024, bmhPx);',
          'float bmhLapV = (bmhVN(vec3(vPmm.x * 0.5, vPmm.z * 6.0, 3.3)) - 0.5) * bmhLapK1 + (bmhVN(vec3(vPmm.x * 1.6, vPmm.z * 22.0, 8.1)) - 0.5) * 0.7 * bmhLapK2;',
          'float bmhSmudge = smoothstep(0.58, 0.86, bmhVN(vec3(vPmm.x * 0.38 + 13.1, vPmm.z * 0.55 + 2.0, 7.7)));',
          'float bmhScr = bmhScratch(vPmm.xz, bmhPx);',
          'float bmhRk1 = 1.0 - smoothstep(0.05, 0.1, bmhPx);',
          'float bmhRk2 = 1.0 - smoothstep(0.018, 0.036, bmhPx);',
          'float bmhRa = 0.35 + 0.9 * bmhVN(vec3(bmhRad * 2.2 + 7.0, bmhHr * 5.0));',
          'float bmhRph = 3.0 * bmhVN(vec3(bmhRad * 1.4 + 3.0, bmhHr * 2.0 + 1.0));',
          'float bmhRing = (sin(bmhHr * 31.4 + bmhRph) * bmhRa * bmhRk1 + sin(bmhHr * 89.0 + 1.7 * bmhRph) * 0.25 * bmhRk2) * uRings;',
          'float bmhScrM = bmhScr * bmhTop, bmhRingM = bmhRing * bmhCone;',
          /* 05-coat: zinc nucleates in a band ahead of the front, grows, merges, then settles */
          'vec3 cgid; float cf1, cf2; voro(vPmm / uCGrain, cgid, cf1, cf2);',
          'float cdF = uFront - frontS(vPmm);',
          'float cBirth = -uBand * hash13(cgid + 17.0);',
          'float cR = (cdF - cBirth) * (1.1 / max(uCGrain * 2.2, 0.3));',
          'float cAA = fwidth(cf1) * 1.2 + 0.02;',
          'float cIsl = (1.0 - smoothstep(cR - cAA, cR + cAA, cf1)) * step(cBirth, cdF);',
          'float cov = max(cIsl, smoothstep(0.0, 0.9, cdF));',
          'float cFresh = cov * (1.0 - smoothstep(0.0, uFill, cdF));',
          'float cBnd = 1.0 - smoothstep(0.0, 0.10 + cAA, cf2 - cf1);',
          'float gRaw = texture2D(uRawMap, vUv).g;',
          'float gCoat = texture2D(uCoatMap, vUv).g;'
        ].join('\n'))
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'vec3 coatC = uCoatCol * (1.0 - cBnd * cFresh * 0.22) * (1.0 + (hash13(cgid + 5.0) - 0.5) * 0.06 * cFresh);',
          'diffuseColor.rgb = mix(uRawCol, coatC, cov);'
        ].join('\n'))
        .replace('#include <alphatest_fragment>', [
          '#include <alphatest_fragment>',
          'diffuseColor.rgb *= (1.0 + bmhMottle * (0.04 + 0.05 * bmhFace) + (bmhG - 0.5) * (0.07 * bmhFace + 0.12 * bmhWall) * bmhGrainK',
          '                   - bmhPit * (0.02 + 0.24 * bmhWall) * uGrain * (1.0 - bmhCone)',
          '                   - bmhBlot * 0.12 * bmhWall * uGrit + bmhStreak * 0.10 * bmhWall * uGrit',
          '                   + bmhLapV * 0.035 * bmhFace * uLap - bmhSmudge * 0.035 * bmhTop * uScuff + bmhScrM * 0.08 * uScuff)',
          '                   * mix(1.0, uWallTone, bmhWall);'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', [
          /* both finish maps as glTF defines them (factor x map.G), mixed by the coat */
          'float rRough = uRawRough * gRaw;',
          'float cRough = uCoatRough * gCoat + ((hash13(cgid + 9.0) - 0.5) * 0.10 + cBnd * 0.30 + 0.08) * cFresh;',
          'float roughnessFactor = mix(rRough, cRough, cov);',
          'roughnessFactor = mix(roughnessFactor, mix(rRough, uConeRough, cov), bmhCone);',
          'roughnessFactor = clamp(roughnessFactor + bmhMottle * 0.05 + (bmhG - 0.5) * 0.08 * bmhGrainK + bmhPit * 0.12 * bmhWall',
          '                  + bmhBlot * 0.1 * bmhWall * uGrit + bmhLapV * 0.05 * bmhFace * uLap + bmhSmudge * 0.1 * bmhTop * uScuff',
          '                  - bmhScrM * 0.08 * uScuff + bmhRingM * 0.04, 0.04, 1.0);'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          /* young zinc: one tilt per crystal; the settled coat is the model's surface */
          '{',
          '  vec3 ct1 = normalize(abs(dot(normal, vVY)) < 0.9 ? cross(normal, vVY) : cross(normal, vVX));',
          '  vec3 ct2 = cross(normal, ct1);',
          '  vec3 cgt = hash33(cgid + 3.1) - 0.5;',
          '  normal = normalize(normal + (ct1 * cgt.x + ct2 * cgt.y) * uCrystal * cFresh);',
          '}',
          /* 01-hero photo: the rolled top edge and the countersink lip */
          'float bmhEu = bmhWall * (1.0 - bmhBore) * clamp((vPmm.y - (uThick - uEdgeR)) / max(uEdgeR, 1e-3), 0.0, 1.0);',
          'float bmhEa = (0.5 - sin(asin(1.0 - 2.0 * bmhEu) / 3.0)) * 1.5708 * uEdgeCatch;',
          'normal = normalize(cos(bmhEa) * normal + sin(bmhEa) * vVY);',
          'float bmhLipC = bmhCone * smoothstep(uThick - 0.45 * uEdgeR, uThick - 0.005, vPmm.y);',
          'float bmhLipF = bmhTop * (1.0 - smoothstep(uRt, uRt + 0.5 * uEdgeR, bmhHr));',
          'vec3 bmhIn = -normalize(bmhRad.x * vVX + bmhRad.y * vVZ);',
          'normal = normalize(normal + (vVY - normal) * bmhLipC * 0.7 * uEdgeCatch + bmhIn * bmhLipF * 0.6 * uEdgeCatch);',
          /* micro relief (mm), plus the bare metal's blasted grain read from its finish map, gone under the coat */
          'vec2 bmhDG = vec2(dFdx(bmhG), dFdy(bmhG));',
          'vec2 bmhDP = vec2(dFdx(bmhPit), dFdy(bmhPit));',
          'vec2 bmhDB = vec2(dFdx(bmhBlot), dFdy(bmhBlot));',
          'vec2 bmhDL = vec2(dFdx(bmhLapV), dFdy(bmhLapV));',
          'vec2 bmhDS = vec2(dFdx(bmhScr), dFdy(bmhScr));',
          'vec2 bmhDR = vec2(dFdx(bmhRing), dFdy(bmhRing));',
          'vec2 cDH = clamp(vec2(dFdx(gRaw), dFdy(gRaw)), -0.12, 0.12) * uBareGrit * 0.05 * (1.0 - cov);',
          'cDH *= 1.0 - step(0.06, max(fwidth(vUv.x), fwidth(vUv.y)));',
          'normal = bmhPerturb(-vViewPosition, normal, (bmhDG * (0.004 * bmhFace + 0.022 * bmhWall) - bmhDP * 0.012 * bmhWall) * bmhGrainK',
          '  - bmhDB * 0.01 * bmhWall * uGrit + bmhDL * 0.002 * bmhFace * uLap - bmhDS * 0.003 * bmhTop * uScuff + bmhDR * 0.004 * bmhCone + cDH, faceDirection);'
        ].join('\n'))
        .replace('#include <aomap_fragment>', [
          '#include <aomap_fragment>',
          'reflectedLight.indirectSpecular *= bmhAO;',
          'reflectedLight.indirectDiffuse *= bmhAO;'
        ].join('\n'));
    };
    return m;
  }

  /* ---- the zinc: 05-coat's small metal crystals, instanced, moved in the vertex shader -------
     In the air they are in world space, flying to the spot where their bit of plate will be when
     the front reaches it (aLandW). Once landed they ride on the plate (uPlateM x aTarget). */
  function zincMaterial() {
    var m = new THREE.MeshStandardMaterial({ color: BMH.color(KNOBS.zincColor), metalness: 1, roughness: KNOBS.zincRough });
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', [
          '#include <common>',
          'attribute vec3 aTarget; attribute vec3 aNorm; attribute vec3 aCone; attribute vec4 aSeed; attribute float aLand; attribute vec3 aLandW;',
          'uniform float uP, uFlight, uSettle, uSize, uStreak, uReach, uCurl, uBrake;',
          'uniform mat3 uSrc; uniform mat4 uPlateM;',
          'mat3 basisY(vec3 y, float spin){',
          '  vec3 up = abs(y.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);',
          '  vec3 x = normalize(cross(up, y)); vec3 z = cross(x, y);',
          '  float c = cos(spin), s = sin(spin);',
          '  return mat3(x * c + z * s, y, z * c - x * s);',
          '}'
        ].join('\n'))
        .replace('#include <beginnormal_vertex>', [
          'float tf = (uP - (aLand - uFlight)) / uFlight;',              // 0..1 in the air
          'float tl = (uP - aLand) / uSettle;',                           // 0..1 after landing
          'float alive = step(0.0, tf) * (1.0 - step(1.0, tl));',
          'float t = clamp(tf, 0.0, 1.0);',
          'float s = 1.0 - pow(1.0 - t, uBrake);',                         // fast, then settling
          'vec3 from = uSrc * aCone * uReach * (0.75 + 0.5 * aSeed.z);',
          'vec3 side = normalize(cross(from, vec3(0.0, 1.0, 0.0)) + 1e-4);',
          'float landed = step(1.0, tf);',
          'vec3 nW = normalize(mat3(uPlateM) * aNorm);',
          'vec3 onPlate = (uPlateM * vec4(aTarget, 1.0)).xyz + nW * 0.03;',
          'vec3 inAir = aLandW + from * (1.0 - s) + side * uCurl * uReach * (aSeed.w - 0.5) * sin(3.14159 * s) * (1.0 - s);',
          'vec3 pPos = mix(inAir, onPlate, landed);',
          'float st = clamp(tl, 0.0, 1.0);',
          'vec3 axis = normalize(mix(-normalize(from), nW, max(smoothstep(0.8, 1.0, t), landed)));',
          'float sz = uSize * (0.55 + 0.9 * aSeed.x);',
          'float fast = pow(1.0 - t, uBrake - 1.0);',
          'vec3 sc = vec3(1.0 - 0.45 * fast, 1.0 + uStreak * fast, 1.0 - 0.45 * fast);',
          'sc.y = mix(sc.y, 0.22, landed * smoothstep(0.0, 0.2, st));',  // flattens onto the surface
          'sc.xz *= 1.0 + 0.35 * landed * smoothstep(0.0, 0.3, st);',
          'sc *= 1.0 - smoothstep(0.15, 1.0, st);',                       // and becomes surface
          'sc *= alive;',
          'mat3 B = basisY(axis, aSeed.y * 6.2831853);',
          'vec3 objectNormal = normalize(B * (normal / max(sc, vec3(1e-3))));'
        ].join('\n'))
        .replace('#include <begin_vertex>', 'vec3 transformed = pPos + B * (position * sc * sz);');
    };
    return m;
  }

  /* ---- 01-hero's contact shadow, rendered once from under the plate ------------------------
     The plate never changes shape here, so its shadow is drawn once into two textures in the
     plate's own frame (tight: the contact line; wide: the soft shadow) and rides with it. */
  var SH = { w: 96, h: 28, rx: 768, ry: 224, far: 14 };
  var shadowTex = null;
  function bakeShadow(geo) {
    var halfOK = renderer.capabilities.isWebGL2 &&
      (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    var opts = { type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
    var rtDepth = new THREE.WebGLRenderTarget(SH.rx, SH.ry, opts);
    var nd = Object.assign({}, opts, { depthBuffer: false });
    var rtA = new THREE.WebGLRenderTarget(SH.rx, SH.ry, nd);
    var rtTight = new THREE.WebGLRenderTarget(SH.rx, SH.ry, nd);
    var rtWide = new THREE.WebGLRenderTarget(SH.rx, SH.ry, nd);
    var sScene = new THREE.Scene();
    var sCam = new THREE.OrthographicCamera(-SH.w / 2, SH.w / 2, SH.h / 2, -SH.h / 2, 0, SH.far);
    sCam.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    sCam.position.set(0, -0.05, 0);
    sCam.updateMatrixWorld();
    var sMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: { uTightH: { value: 0.9 }, uWideH: { value: 9.0 } },
      vertexShader: 'varying float vH; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vH = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform float uTightH, uWideH; varying float vH; void main() { gl_FragColor = vec4(1.0 - smoothstep(0.0, uTightH, vH), 1.0 - smoothstep(0.0, uWideH, vH), 0.0, 1.0); }'
    });
    var sMesh = new THREE.Mesh(geo, sMat);
    sMesh.scale.setScalar(1000);
    sScene.add(sMesh);
    var qScene = new THREE.Scene(), qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var blurMat = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tMap; uniform vec2 uDir; varying vec2 vUv;',
        'void main() {',
        '  vec4 s = texture2D(tMap, vUv) * 0.2270270270;',
        '  s += texture2D(tMap, vUv + uDir * 1.3846153846) * 0.3162162162;',
        '  s += texture2D(tMap, vUv - uDir * 1.3846153846) * 0.3162162162;',
        '  s += texture2D(tMap, vUv + uDir * 3.2307692308) * 0.0702702703;',
        '  s += texture2D(tMap, vUv - uDir * 3.2307692308) * 0.0702702703;',
        '  gl_FragColor = s;',
        '}'
      ].join('\n')
    });
    qScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
    function blur(from, to, dx, dy) {
      blurMat.uniforms.tMap.value = from.texture;
      blurMat.uniforms.uDir.value.set(dx / SH.rx, dy / SH.ry);
      renderer.setRenderTarget(to);
      renderer.render(qScene, qCam);
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rtDepth);
    renderer.render(sScene, sCam);
    var tight = 0.9, wide = KNOBS.shadowSoftMm / (SH.w / SH.rx) / 3.2;
    blur(rtDepth, rtA, tight, 0); blur(rtA, rtTight, 0, tight);
    blur(rtTight, rtA, wide, 0); blur(rtA, rtWide, 0, wide);
    blur(rtWide, rtA, wide * 0.7, 0); blur(rtA, rtWide, 0, wide * 0.7);
    renderer.setRenderTarget(null);
    rtDepth.dispose(); rtA.dispose(); sMat.dispose(); blurMat.dispose();
    shadowTex = { tight: rtTight.texture, wide: rtWide.texture };
  }
  var groundMat = null;
  function makeGround() {
    if (!groundMat) groundMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        tTight: { value: shadowTex.tight }, tWide: { value: shadowTex.wide },
        uTight: { value: KNOBS.contactShadow }, uWide: { value: KNOBS.shadow },
        uCol: { value: new THREE.Color('#646a7e') }, uSize: { value: new THREE.Vector2(SH.w, SH.h) }
      },
      vertexShader: 'varying vec2 vL; void main() { vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tTight, tWide; uniform float uTight, uWide; uniform vec3 uCol; uniform vec2 uSize; varying vec2 vL;',
        'void main() {',
        '  vec2 uv = vec2(vL.x / uSize.x + 0.5, 0.5 - vL.y / uSize.y);',
        '  float a = texture2D(tTight, uv).r * uTight + texture2D(tWide, uv).g * uWide;',
        '  vec2 e = smoothstep(0.0, 0.12, uv) * smoothstep(0.0, 0.12, 1.0 - uv);',
        '  a = clamp(a * e.x * e.y, 0.0, 0.92);',
        '  a += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(uCol, max(a, 0.0));',
        '}'
      ].join('\n')
    });
    var g = new THREE.Mesh(new THREE.PlaneGeometry(SH.w, SH.h), groundMat);
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.02;
    g.renderOrder = 1;
    return g;
  }

  /* ---- scene graph: carrier (mm, on the ground, moved and turned) > the GLB (metres) ------- */
  var carriers = [];          // [0] the plate
  function makeCarrier(geo, mat) {
    var c = new THREE.Group();
    var body = new THREE.Mesh(geo, mat);
    body.scale.setScalar(1000);
    c.add(body);
    c.add(makeGround());
    scene.add(c);
    return c;
  }

  var ready = false, zinc = null, N = 0, srcGeo = null;
  var Z = null;               // the zinc's per-particle source data, kept to recompute landings on resize

  function buildZinc(geoMetres) {
    N = isPhone() ? KNOBS.particlesPhone : KNOBS.particles;
    var soup = geoMetres.index ? geoMetres.toNonIndexed() : geoMetres;
    var sampler = new THREE.MeshSurfaceSampler(new THREE.Mesh(soup)).build();
    var p = new THREE.Vector3(), n = new THREE.Vector3();
    var aTarget = new Float32Array(N * 3), aNorm = new Float32Array(N * 3), aCone = new Float32Array(N * 3);
    var aSeed = new Float32Array(N * 4), sFront = new Float32Array(N);
    var i = 0, guard = 0;
    while (i < N && guard++ < N * 40) {
      sampler.sample(p, n);
      if (n.y < 0.5) continue;                      // the faces the stream can reach
      p.multiplyScalar(1000);
      aTarget.set([p.x, p.y, p.z], i * 3);
      aNorm.set([n.x, n.y, n.z], i * 3);
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * KNOBS.spread;
      var cx = Math.cos(a) * r, cy = Math.sin(a) * r, len = Math.sqrt(cx * cx + cy * cy + 1);
      aCone.set([cx / len, cy / len, 1 / len], i * 3);
      aSeed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      // it lands as the front reaches it, up to one band early: those are the first crystals
      sFront[i] = frontS(p.x, p.z) - KNOBS.band * Math.pow(Math.random(), 0.7);
      i++;
    }
    N = i;
    var base = new THREE.OctahedronGeometry(1, 0);
    var g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('normal', base.getAttribute('normal'));
    g.setAttribute('aTarget', new THREE.InstancedBufferAttribute(aTarget, 3));
    g.setAttribute('aNorm', new THREE.InstancedBufferAttribute(aNorm, 3));
    g.setAttribute('aCone', new THREE.InstancedBufferAttribute(aCone, 3));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 4));
    g.setAttribute('aLand', new THREE.InstancedBufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aLandW', new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3));
    g.instanceCount = N;
    var mesh = new THREE.Mesh(g, zincMaterial());
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    Z = { target: aTarget, front: sFront };
    return mesh;
  }

  /* ---- the timeline, in seconds from the start of the entrance ------------------------------
     The front (plate-local mm, the relay's frontS) runs from F0, before the first crystal, to F1,
     where the far end has settled. The zinc lands where and when the front reaches it. */
  var TL = { t0: 1, t1: 4, end: 5, F0: -40, F1: 40 };
  function timeline() {
    var wob = KNOBS.frontWobble;
    TL.F0 = -HX - wob - KNOBS.band - 0.3;
    TL.F1 = HX + KNOBS.frontCurve * HZ * HZ + wob + KNOBS.fillIn + 0.3;
    TL.t0 = KNOBS.holdMs / 1000 + KNOBS.flightTime;     // the first zinc lands here
    TL.t1 = TL.t0 + KNOBS.coatMs / 1000;
    TL.end = TL.t1 + KNOBS.settleTime + 0.05;
  }
  timeline();
  // a steady sweep that eases in and out a little
  function sweep(x) { x = clamp(x, 0, 1); return 0.4 * x + 0.6 * x * x * (3 - 2 * x); }
  function frontAt(t) { return lerp(TL.F0, TL.F1, sweep((t - TL.t0) / (TL.t1 - TL.t0))); }
  function yaw0() { return (phoneMode ? KNOBS.yawPhone : KNOBS.yaw) * DEG; }
  function yawAt(t) { return yaw0() - KNOBS.turn * DEG * (1 - smooth(TL.t0 - 0.3, TL.t1 + KNOBS.settleTime, t)); }

  /* ---- layout: the plate fills the art box ------------------------------------------------- */
  var W = 1, H = 1, pxPerMm = 6, phoneMode = isPhone();
  var camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camBack = new THREE.Vector3();
  var aim = new THREE.Vector3(0, T / 2, 0);

  function layout() {
    var sr = section.getBoundingClientRect(), r = art.getBoundingClientRect();
    W = Math.max(1, sr.width); H = Math.max(1, sr.height);
    renderer.setSize(W, H, false);
    phoneMode = isPhone();
    var box = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: Math.max(40, r.width), h: Math.max(40, r.height) };

    // size: exact on the plane through the plate's centre facing the camera. It fits both the pose
    // the plate starts in and the one it settles in, so it never leaves the box while it turns.
    var el = KNOBS.elevation * DEG, size = phoneMode ? KNOBS.plateSizePhone : KNOBS.plateSize;
    pxPerMm = Infinity;
    [yaw0(), yaw0() - KNOBS.turn * DEG].forEach(function (y) {
      var c = Math.abs(Math.cos(y)), s = Math.abs(Math.sin(y));
      var spanX = 2 * (HX * c + HZ * s);
      var spanY = 2 * (HX * s + HZ * c) * Math.sin(el) + T * Math.cos(el);
      pxPerMm = Math.min(pxPerMm, size * box.w / spanX, 0.94 * box.h / spanY);
    });

    camera.fov = KNOBS.lensDeg;
    camera.aspect = W / H;
    var d = H / (2 * Math.tan(KNOBS.lensDeg * DEG / 2) * pxPerMm);
    camera.position.set(0, Math.sin(el), Math.cos(el)).multiplyScalar(d).add(aim);
    camera.up.set(0, 1, 0);
    camera.lookAt(aim);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    // lens shift: the plate's centre lands on the art box's centre
    camera.projectionMatrix.elements[8] -= box.x / W * 2 - 1;
    camera.projectionMatrix.elements[9] -= 1 - box.y / H * 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    camBack.setFromMatrixColumn(camera.matrixWorld, 2);

    // the zinc: size on screen, reach, where it comes from, and every landing
    U.uSize.value = 0.5 * KNOBS.particlePx / pxPerMm;
    U.uCGrain.value = Math.max(KNOBS.grainMm, KNOBS.grainPx / pxPerMm);
    U.uReach.value = KNOBS.reach * (window.innerHeight || H) / pxPerMm;
    var f = phoneMode ? KNOBS.fromPhone : KNOBS.from;
    var sz = new THREE.Vector3().addScaledVector(camRight, f[0]).addScaledVector(camUp, f[1]).addScaledVector(camBack, f[2]).normalize();
    var sx = new THREE.Vector3().crossVectors(camUp, sz).normalize();
    var sy = new THREE.Vector3().crossVectors(sz, sx).normalize();
    U.uSrc.value.setFromMatrix4(new THREE.Matrix4().makeBasis(sx, sy, sz));
    if (zinc) landings();
  }

  /* every particle lands when the front reaches its spot: invert the sweep with a table */
  var TABLE_N = 1024, SW = null;
  function landings() {
    if (!SW) { SW = new Float32Array(TABLE_N + 1); for (var i = 0; i <= TABLE_N; i++) SW[i] = sweep(i / TABLE_N); }
    var aLand = zinc.geometry.attributes.aLand, aLandW = zinc.geometry.attributes.aLandW;
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
    var zero = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), yAxis = new THREE.Vector3(0, 1, 0);
    for (var k = 0; k < N; k++) {
      var qv = (Z.front[k] - TL.F0) / (TL.F1 - TL.F0), x, lo = 0, hi = TABLE_N;
      if (qv <= 0) x = 0;
      else if (qv >= 1) x = 1;
      else {
        while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (SW[mid] < qv) lo = mid; else hi = mid; }
        x = (lo + (qv - SW[lo]) / Math.max(SW[hi] - SW[lo], 1e-6)) / TABLE_N;
      }
      var tl = TL.t0 + x * (TL.t1 - TL.t0);
      aLand.array[k] = tl;
      q.setFromAxisAngle(yAxis, yawAt(tl));
      m.compose(zero, q, one);
      v.set(Z.target[k * 3], Z.target[k * 3 + 1], Z.target[k * 3 + 2]).applyMatrix4(m);
      aLandW.array[k * 3] = v.x; aLandW.array[k * 3 + 1] = v.y; aLandW.array[k * 3 + 2] = v.z;
    }
    aLand.needsUpdate = true; aLandW.needsUpdate = true;
  }

  /* ---- one frame, a pure function of the entrance clock ------------------------------------ */
  var clock = 0, playing = false, played = false, held = null, onScreen = false, lastNow = 0, raf = 0;
  var tmp = new THREE.Vector3(), Y_AXIS = new THREE.Vector3(0, 1, 0);

  function tNow() { return held != null ? held / 1000 : clock; }

  function render() {
    if (!ready) return;
    var c0 = carriers[0], t = tNow();
    var settled = still && held == null;
    c0.rotation.set(0, settled ? yaw0() : yawAt(t), 0);
    c0.userData.mat.userData.front.value = settled ? TL.F1 : frontAt(t);
    U.uP.value = settled ? 1e4 : t;
    c0.updateMatrixWorld(true);
    U.uPlateM.value.copy(c0.matrixWorld);
    // the shadow falls a touch toward the viewer, in the carrier's own frame
    tmp.set(0.35, 0, 0.7).applyAxisAngle(Y_AXIS, -c0.rotation.y);
    c0.children[1].position.set(tmp.x, -0.02, tmp.z);
    renderer.render(scene, camera);
  }

  function frame(now) {
    raf = 0;
    if (playing && onScreen && held == null) {
      clock += (lastNow ? Math.min(now - lastNow, 50) : 16) / 1000;   // a hidden tab pauses it
      lastNow = now;
      if (clock >= TL.end) { clock = TL.end; playing = false; played = true; }
    } else lastNow = 0;
    render();
    if (playing && onScreen && held == null) raf = requestAnimationFrame(frame);
  }
  function request() { if (!raf) raf = requestAnimationFrame(frame); }
  function start() {
    if (still || played || !ready || !onScreen) return;
    playing = true;
    request();
  }

  /* ---- load ------------------------------------------------------------------------------ */
  var resolveReady;
  var readyP = new Promise(function (r) { resolveReady = r; });

  BMH.glb(PV.blob).then(function (gltf) {
    // v2 as it ships (SPEC §5/§6): primitive 0 is the plate in biometal_uncoated; biometal_coated
    // rides on a buried quad, so it is read for its colour and finish map, never drawn.
    var body = null, mats = {};
    gltf.scene.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      mats[o.material.name] = o.material;
      if (o.material.name === 'biometal_uncoated') body = o;
    });
    var raw = mats.biometal_uncoated, coat = mats.biometal_coated;
    if (!body || !raw || !coat || !raw.roughnessMap || !coat.roughnessMap) { fail(); return; }
    srcGeo = body.geometry;
    U.uRawMap.value = raw.roughnessMap;
    U.uCoatMap.value = coat.roughnessMap;
    U.uRawRough.value = raw.roughness * KNOBS.bare.rough;
    U.uCoatRough.value = coat.roughness * KNOBS.coated.rough;
    U.uRawCol.value = KNOBS.bare.color ? BMH.color(KNOBS.bare.color) : raw.color.clone();
    U.uCoatCol.value = KNOBS.coated.color ? BMH.color(KNOBS.coated.color) : coat.color.clone();
    [raw.roughnessMap, coat.roughnessMap].forEach(function (t) {
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true;
    });

    bakeShadow(srcGeo);
    var mat = plateMaterial(coat, TL.F0);
    carriers.push(makeCarrier(srcGeo, mat));
    carriers[0].userData.mat = mat;
    if (!still) { zinc = buildZinc(srcGeo); scene.add(zinc); }   // reduced motion: the settled plate only

    layout();
    ready = true;
    render();
    section.classList.add('is-ready');
    start();
    resolveReady();
  }).catch(function (err) {
    if (window.console) console.warn('ppp 01-opener: plate failed to load', err);
    fail();
  });

  /* ---- wiring -------------------------------------------------------------------------------- */
  BMH.visible(section, function (v) {
    onScreen = v;
    if (v) { start(); request(); }
  }, '0px');
  var rt = 0, lastPhone = isPhone();
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (!ready) return;
      if (zinc && isPhone() !== lastPhone) {          // a different particle count for the new layout
        scene.remove(zinc); zinc.geometry.dispose();
        zinc = buildZinc(srcGeo); scene.add(zinc);
      }
      lastPhone = isPhone();
      layout();
      request();
    }, 60);
  });

  BMH.pppOpener = {
    knobs: KNOBS,
    ready: readyP,
    at: function (ms) { held = ms; return readyP.then(function () { request(); }); },
    replay: function () { held = null; clock = 0; played = false; lastNow = 0; playing = true; request(); }
  };
})();
