/* 01 · Hero — a photoreal 3D plate that resorbs as you scroll.                    -z1n

   The plate is plate-v2-hi.glb (glb-plate-v2-hi): the 4-hole plate measured off BioMetal's
   photographs, 57.79 x 9.07 x 1.815 mm with crisp 125° countersinks over a straight bore
   (model-plate-v2-z1n/SPEC.md). It is drawn as it comes: no reshaping. Its own
   biometal_coated material is the base, finish map and all (satin faces, grit-blasted walls
   and bore, turned cones); the dissolve, the occlusion and the fine grain are layered onto it.
   It sits in a studio environment built here from softbox planes, on the page's white ground,
   with a real contact shadow rendered from underneath it.
   Every plate number comes from BMH.PLATE_V2 in core.js.

   Motion, in order:
     1. ENTRANCE, once, on load. The plate turns into its hero pose and settles onto the ground.
        Nothing idles afterwards.
     2. DISSOLVE, scroll-linked, while the stage is pinned. A soft noise-threshold front travels
        the plate from one end. At the front the metal breaks into grain; the grains lift a few
        millimetres and thin to nothing. The shadow goes with the metal. Scrolling back reverses it.

   The dissolve must read as RESORBING, not BREAKING (v1's acceptance rules, still binding):
     1. No gravity. Nothing falls. Every grain drifts along ONE shared vector, up and slightly out.
     2. No velocity spikes. A grain's displacement is a monotone eased function of its own
        progress, starting at zero velocity. No impulse, no scatter, no tumbling.
     3. Nothing accumulates. Grains composite with MIN blending, so where they overlap the field
        can only be as dark as its single darkest grain: it only ever gets thinner. No glow.

   The field that decides where metal goes is computed twice, identically: in GLSL for the metal
   and its shadow, and in JS (below) for each grain, so a grain leaves exactly when the metal
   under it does. Change one, change both.

   Two looks, switched by KNOBS.look (25 Sep). 'current' is the hero as reviewed, drawn exactly as
   before (checked pixel-identical at 375 and 1440). 'photo' keeps the same plate, motion and
   dissolve and changes only the surface, the studio and the lens: blasted walls, turned rings in the
   countersinks, handling scuffs, rolled edges that catch the light, soft-edged softboxes, and a macro
   lens's depth of field in one post pass that 'current' never builds. Matched against
   swanson-plates-5.jpg; review/01-hero/photo/compare-swanson-photo.png is the side by side.

   Review hooks (not used by the page): BMH.hero.set({...KNOBS}) (including look), BMH.hero.hold(d)
   pins the dissolve at d in 0..1 (null follows the scroll again), BMH.hero.ready is a promise. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ the knobs */
  const KNOBS = window.BMH.knobs('hero', {
    /* The pin */
    scrollScreens: 1.25,      // how many screens of scroll the stage holds while the plate goes
    dissolveFrom: 0.04,       // share of that scroll before the metal starts to go
    dissolveTo: 0.9,          // share of that scroll by which the metal and its vapour are gone

    /* The entrance, once on load */
    entranceMs: 1900,         // how long the plate takes to arrive
    entranceEase: 2.4,        // how front-loaded the arrival is: 1 even, 3 quick then a long settle
    entranceTurnDeg: 38,      // how far it turns on the way in
    entranceLiftMm: 2.4,      // how high above the ground it starts
    entranceTiltDeg: 5,       // how far it is rolled before it lies flat

    /* The dissolve */
    direction: 'left',        // where the metal goes first: 'left', 'right', 'ends', or 'all' (pits everywhere at once)
    ragged: 0.3,              // how much the front wanders: 0 straight across, 1 all over
    pits: 0,                  // pits opening ahead of the front: 0 none, 0.2 a porous zone (reads as debris)
    pitMm: 1.1,               // pit spacing
    edgeMm: 4.4,              // how wide the band is where metal breaks into grain (round one: 3.5 on the 46 mm plate)
    driftMm: 4.0,             // how far the vapour rises before it is gone (the plate is 57.8 mm long)
    driftDir: [0.22, 1, 0.1], // which way it rises: slightly right, up, slightly toward you
    vapourLife: 0.12,         // how long a grain lasts, as a share of the dissolve
    grains: 110000,           // how many grains the plate sheds (half on a phone)
    grainMm: 0.12,            // grain size, in plate millimetres
    grainGrow: 0.6,           // how much a grain swells as it thins
    vapourStrength: 0.9,      // how solid a fresh grain is: 1 is the metal's own tone
    etch: 0.55,               // how matte the metal goes just before it leaves

    /* The look. The shape, the base colour and the three finishes are the GLB's own.
       'current' is the hero as reviewed on 25 Sep. 'photo' is the variant built to read as
       photographed up close (see the block below); it changes nothing when 'current' is set. */
    look: 'photo',            // 'photo' (chosen by Andrew, 25 Sep) or 'current' (the look reviewed in round 2)
    finish: 1.0,              // scales the GLB's roughness (satin faces 0.22, blasted walls 0.30, turned cones 0.17): 1 as modelled
    grain: 1.0,               // the fine blasted grain on top of the finish map, 0 smooth to 1.5 coarse
    exposure: 1.0,
    metalColour: null,        // null: the GLB's biometal_coated base colour (#dadde0). A hex overrides it
    shadow: 0.55,             // the soft shadow's strength
    contactShadow: 0.62,      // the tight dark line where metal meets ground
    shadowSoftMm: 2.2,        // how far the soft shadow spreads
    shadowOffsetMm: 0.7,      // how far the shadow falls toward the viewer

    /* The 'photo' look only. Matched against swanson-plates-5.jpg, side by side and cropped in close. */
    scuffs: 0.5,              // handling smudges and fine scratches on the top face: 0 none, 1 well handled
    machiningMarks: 0.6,      // the faint lengthwise lapping marks on the faces
    turningRings: 0.7,        // the concentric tool rings in the countersinks
    wallGrit: 1.0,            // the blasted walls' and bore's coarse texture and dark blotches
    wallTone: 0.86,           // how bright the blasted walls read against the faces (1 the same; the photo's sit lower)
    coneRoughness: 0.22,      // how satin the turned countersinks are (the GLB's 0.17 reads as chrome)
    edgeRadiusMm: 0.3,        // the small radius along the top of every wall and round each countersink lip
    edgeCatch: 0.8,           // how brightly that radius catches the softbox: 0 knife-sharp, 1 fully rolled
    depthOfField: 0.15,       // lens blur at the plate's far end, in plate millimetres: 0 off
    focusAt: 0.18,            // where the lens focuses along the plate: 0 the near end, 0.18 the near holes, 1 the far end

    /* The camera */
    lensDeg: 16,              // vertical field of view; lower is a longer lens
    elevationDeg: 31,         // how far above the ground the camera looks down from. 31 is the photographs' (30.8°); round one had 40
    pose: 'photo',            // 'photo': turned into depth as in BioMetal's photographs. 'flat': round one's broadside diagonal
    poses: {
      /* yawDeg: the plate's resting angle on the ground. desktop/phone: plate centre (share of width,
         height; y null centres it in the space under the copy), its width (share of width), camera roll */
      photo: { yawDeg: 48, desktop: { x: 0.7, y: 0.58, size: 0.5, rollDeg: 0 },    phone: { x: 0.5, y: null, size: 0.92, rollDeg: -22 } },
      flat:  { yawDeg: 10, desktop: { x: 0.69, y: 0.6, size: 0.56, rollDeg: -24 }, phone: { x: 0.5, y: null, size: 0.92, rollDeg: -40 } }
    }
  });

  /* The studio. Radiance values for the environment the metal reflects. Mine, not Andrew's. */
  const STUDIO = {
    floor: 0.8,      // the lit seamless the walls reflect
    horizon: 1.0,
    sweep: 0.75,     // the seamless rising behind the plate: what the top face reflects
    zenith: 0.38,
    front: 0.28,     // the camera side of the room, flagged down
    tint: [0.96, 0.945, 1.04],       // cool, like the photographs, without round one's cyan cast
    boxes: [
      /* w,  h,   position,          radiance */
      [36, 22, [0, 32, 24], 2.8],    // big softbox above the camera: near rims, the edge break
      [30, 30, [0, 44, -4], 1.7],    // overhead: at the photographs' 31° the far side of each cone reflects straight up
      [26, 18, [22, 20, -26], 1.5],  // soft key behind right: the broad sheen along the top face
      [10, 30, [-34, 14, 6], 1.3],   // strip, left
      [8, 24, [34, 10, 14], 0.8]     // strip, right
    ]
  };

  /* The 'photo' look's studio: the same room, lit like a product table. The softboxes are diffusion
     fabric, bright in the middle and falling off to the frame, where STUDIO's are hard-edged panels
     (their sharp reflections in a turned cone are what reads as rendered). The seamless is a touch
     brighter overhead and the camera side darker, as in the photographs, where the walls facing the
     lens sit under the top face. */
  const PHOTO_STUDIO = {
    floor: 0.64,     // the table in front of the plate, all the near walls reflect: sets them at 0.8 of the top face, as photographed
    horizon: 0.9,
    sweep: 0.9,      // what the top face reflects
    zenith: 0.5,
    front: 0.2,
    tint: [0.955, 0.95, 1.04],
    soft: 0.4,       // share of each softbox's half-width that is falloff
    boxes: [
      [60, 40, [0, 34, 26], 2.4],    // big softbox above the camera: the rolled edges' bright line
      [60, 60, [0, 44, -4], 2.6],    // overhead: the far side of each cone
      [34, 22, [22, 20, -26], 1.6],  // key behind right: the sheen along the top face
      [14, 34, [-34, 14, 6], 1.1],   // strip, left
      [10, 28, [34, 10, 14], 0.7]    // strip, right
    ]
  };

  const STUDIO_CURRENT = STUDIO;

  const BMH = window.BMH, THREE = window.THREE;
  const sec = document.getElementById('s-hero');
  if (!BMH || !THREE || !sec) return;

  const stage = sec.querySelector('.hero__stage');
  const canvas = sec.querySelector('.hero__canvas');
  const copyEl = sec.querySelector('.hero__copy');
  const reduced = !!BMH.reduced;
  sec.style.setProperty('--pin', reduced ? 0 : KNOBS.scrollScreens);

  const DEG = Math.PI / 180;
  /* The plate, in millimetres, from BMH.PLATE_V2 (model-plate-v2-z1n/SPEC.md §2 and §6). GLB axes:
     length along X, seating face at Y = 0, width along Z. The fallbacks are the same numbers. */
  const PV = BMH.PLATE_V2 || {};
  const HALF = (PV.lengthMm || 57.786) / 2;            // 28.893
  const HALF_W = (PV.widthMm || 9.068) / 2;            // 4.534
  const THICK = PV.thicknessMm || 1.815;
  const HOLES = PV.holesXmm || [-24.359, -12.124, 12.124, 24.359];
  const CONE_Y = PV.coneBottomYmm || 1.280;            // where the countersink cone meets the bore
  const CONE_R = PV.coneTopRmm || 3.194;               // the cone's radius at the top face
  const BORE_R = PV.boreRmm || 2.165;                  // the straight bore
  const MODES = { ends: 0, left: 1, right: 2, all: 3 };

  /* ------------------------------------------------------------------ the field, in JS */
  function mod289(x) { return x - Math.floor(x / 289) * 289; }
  function perm(x) { return mod289((x * 34 + 1) * x); }
  function hash(x, y, z) { return perm(perm(perm(x) + y) + z) / 289; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function vnoise(px, py, pz) {
    const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
    const fx = px - ix, fy = py - iy, fz = pz - iz;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    const x0 = mod289(ix), y0 = mod289(iy), z0 = mod289(iz);
    const x1 = mod289(ix + 1), y1 = mod289(iy + 1), z1 = mod289(iz + 1);
    return mix(
      mix(mix(hash(x0, y0, z0), hash(x1, y0, z0), ux), mix(hash(x0, y1, z0), hash(x1, y1, z0), ux), uy),
      mix(mix(hash(x0, y0, z1), hash(x1, y0, z1), ux), mix(hash(x0, y1, z1), hash(x1, y1, z1), ux), uy), uz);
  }
  function worley(px, pz) {                 // [distance to the nearest pit centre, that pit's own hash]
    const ix = Math.floor(px), iz = Math.floor(pz), fx = px - ix, fz = pz - iz;
    let best = 8, h = 0;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const cx = mod289(ix + a), cz = mod289(iz + b);
      const dx = a + hash(cx, cz, 17) * 0.85 + 0.075 - fx, dz = b + hash(cx, cz, 53) * 0.85 + 0.075 - fz;
      const dd = dx * dx + dz * dz;
      if (dd < best) { best = dd; h = hash(cx, cz, 91); }
    }
    return [Math.sqrt(best), h];
  }
  function field(x, y, z, k) {              // plate-local millimetres; k = [mode, ragged, pits, 1/pitMm]
    const qy = y * 0.25, rx = 0.8 * x - 0.6 * z, rz = 0.6 * x + 0.8 * z;
    const n = 0.65 * vnoise(x * 0.16 + 11.3, qy * 0.16 + 5.1, z * 0.16 + 2.7)
            + 0.35 * vnoise(rx * 0.52 + 3.7, qy * 0.52 + 9.2, rz * 0.52 + 6.4);
    const s = x / HALF, mode = k[0];
    const L = mode < 0.5 ? 1 - Math.abs(s) : mode < 1.5 ? 0.5 + 0.5 * s : mode < 2.5 ? 0.5 - 0.5 * s : 0.5;
    const w = worley(x * k[3], z * k[3]);
    return mix(L, n, mode > 2.5 ? 0.35 : k[1]) + (mode > 2.5 ? 0.5 : k[2]) * (w[1] - 0.5 + 0.6 * w[0]);
  }

  /* ------------------------------------------------------------------ the field, in GLSL */
  const GLSL_FIELD = [
    'uniform float uMode;',
    'uniform float uRagged;',
    'uniform float uPits;',
    'uniform float uPitF;',
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
    'vec2 bmhWorley(vec2 p) {',
    '  vec2 i = floor(p); vec2 f = p - i;',
    '  float best = 8.0, h = 0.0;',
    '  for (int b = -1; b <= 1; b++) for (int a = -1; a <= 1; a++) {',
    '    float cx = bmhMod(i.x + float(a)), cz = bmhMod(i.y + float(b));',
    '    vec2 d = vec2(float(a) + bmhHash(cx, cz, 17.0) * 0.85 + 0.075 - f.x, float(b) + bmhHash(cx, cz, 53.0) * 0.85 + 0.075 - f.y);',
    '    float dd = dot(d, d);',
    '    if (dd < best) { best = dd; h = bmhHash(cx, cz, 91.0); }',
    '  }',
    '  return vec2(sqrt(best), h);',
    '}',
    'float bmhField(vec3 p) {',
    '  float qy = p.y * 0.25, rx = 0.8 * p.x - 0.6 * p.z, rz = 0.6 * p.x + 0.8 * p.z;',
    '  float n = 0.65 * bmhVN(vec3(p.x * 0.16 + 11.3, qy * 0.16 + 5.1, p.z * 0.16 + 2.7))',
    '          + 0.35 * bmhVN(vec3(rx * 0.52 + 3.7, qy * 0.52 + 9.2, rz * 0.52 + 6.4));',
    '  float s = p.x / ' + HALF.toFixed(3) + ';',
    '  float L = uMode < 0.5 ? 1.0 - abs(s) : uMode < 1.5 ? 0.5 + 0.5 * s : uMode < 2.5 ? 0.5 - 0.5 * s : 0.5;',
    '  vec2 w = bmhWorley(p.xz * uPitF);',
    '  return mix(L, n, uMode > 2.5 ? 0.35 : uRagged) + (uMode > 2.5 ? 0.5 : uPits) * (w.y - 0.5 + 0.6 * w.x);',
    '}'
  ].join('\n');

  /* Screen-space bump for the procedural grain (three's perturbNormalArb, which r147 only
     compiles when a bump map is bound). */
  const GLSL_BUMP = [
    'vec3 bmhPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {',
    '  vec3 vSigmaX = dFdx(surf_pos.xyz); vec3 vSigmaY = dFdy(surf_pos.xyz);',
    '  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);',
    '  float fDet = dot(vSigmaX, R1) * faceDir;',
    '  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);',
    '  return normalize(abs(fDet) * surf_norm - vGrad);',
    '}'
  ].join('\n');
  const G = {
    grain: { value: KNOBS.grain },
    uThick: { value: THICK }, uYc: { value: CONE_Y }, uRt: { value: CONE_R }, uRb: { value: BORE_R },   // the hole, for occlusion
    uGround: { value: 1 },                                           // 1 when the plate lies on the ground
    uCutCol: { value: new THREE.Color(0.5, 0.52, 0.56) },            // linear; the dissolve's cut faces
    uStipple: { value: 0.05 }, uStippleMm: { value: 0.12 }            // the front breaking into grain
  };

  /* ------------------------------------------------------------------ renderer */
  let renderer;
  try { renderer = BMH.renderer(canvas, { alpha: false, exposure: KNOBS.exposure }); }
  catch (e) { return; }
  renderer.setClearColor(0xffffff, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(KNOBS.lensDeg, 1, 5, 4000);

  const U = {                            // uniforms shared by the metal, its shadow and the grains
    uT: { value: -1 },
    uMode: { value: MODES[KNOBS.direction] || 0 },
    uRagged: { value: KNOBS.ragged },
    uPits: { value: KNOBS.pits },
    uPitF: { value: 1 / KNOBS.pitMm },
    uEtch: { value: 0 },
    uEtchW: { value: 0.05 }
  };

  /* Scene graph: yaw (the plate's turn on the ground) > lift (entrance height and roll) > plate. */
  const yawG = new THREE.Group(), liftG = new THREE.Group(), plateG = new THREE.Group();
  plateG.scale.setScalar(1000);          // the GLB is in metres; the world is in millimetres
  scene.add(yawG); yawG.add(liftG); liftG.add(plateG);
  const groundG = new THREE.Group();     // the shadow follows the yaw but not the lift
  scene.add(groundG);

  /* ------------------------------------------------------------------ studio environment */
  let envTex = null;
  function buildStudio() {
    const STUDIO = KNOBS.look === 'photo' ? PHOTO_STUDIO : STUDIO_CURRENT;
    const s = new THREE.Scene();
    const t = STUDIO.tint;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uFloor: { value: STUDIO.floor }, uHorizon: { value: STUDIO.horizon }, uSweep: { value: STUDIO.sweep },
        uZenith: { value: STUDIO.zenith }, uFront: { value: STUDIO.front },
        uTint: { value: new THREE.Vector3(t[0], t[1], t[2]) }
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
    }));
    s.add(sky);
    STUDIO.boxes.forEach(function (b) {
      const col = new THREE.Color(b[3] * t[0], b[3] * t[1], b[3] * t[2]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b[0], b[1]), STUDIO.soft ? new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: { uCol: { value: col }, uSoft: { value: STUDIO.soft } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          /* diffusion fabric: a hot centre, a long falloff to the frame */
          'uniform vec3 uCol; uniform float uSoft; varying vec2 vUv;',
          'void main() {',
          '  vec2 q = abs(vUv - 0.5) * 2.0;',
          '  float e = (1.0 - smoothstep(1.0 - uSoft, 1.0, q.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, q.y));',
          '  float hot = 1.0 - 0.18 * dot(q, q);',
          '  gl_FragColor = vec4(uCol * hot, e);',
          '}'
        ].join('\n')
      }) : new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      m.position.set(b[2][0], b[2][1], b[2][2]);
      m.lookAt(0, 0, 0);
      s.add(m);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromScene(s, 0.0, 0.1, 200).texture;
    pm.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    if (envTex) envTex.dispose();
    envTex = tex;
    if (metal) { metal.envMap = envTex; metal.needsUpdate = true; }
  }

  /* ------------------------------------------------------------------ the metal
     The GLB's biometal_coated material, cloned, is the base: its colour, its 0.34 roughness
     ceiling and its finish map (roughness = factor x map.G; satin faces, grit-blasted walls and
     bore, turned cones, laid out by UV band). What is layered on, and only this:
       - the dissolve: coverage from the field, alpha-to-coverage at the front, cut faces inside;
       - occlusion in the bore, the cone and along the foot of the wall, which a studio
         environment map cannot give on its own;
       - a fine blasted grain in the normal and a faint mottle. The finish map is roughness
         only, so without a little relief the walls read smoother than the photographs (SPEC §4.4).
     The plate never gets reshaped: v2 is already the measured part. */
  let metal = null, plateMesh = null, fieldMin = 0, fieldMax = 1, baseColour = null, baseRough = 0.34, srcMetal = null;

  const HMID = [(HOLES[0] + HOLES[1]) / 2, (HOLES[1] + HOLES[2]) / 2, (HOLES[2] + HOLES[3]) / 2];
  const f3 = function (x) { return x.toFixed(3); };

  function makeMetal(src) {
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: new THREE.Color(0.70, 0.722, 0.748), metalness: 1, roughness: 0.34 });
    baseColour = m.color.clone();
    baseRough = m.roughness;
    m.name = 'biometal_coated (hero)';
    m.metalness = 1;
    m.envMap = envTex;
    m.envMapIntensity = 1;
    m.side = THREE.DoubleSide;
    m.blending = THREE.NoBlending;      // lets alpha reach the output for alpha-to-coverage
    m.alphaToCoverage = true;           // an antialiased dissolve front, not a jagged discard
    if (KNOBS.look === 'photo') {
      m.name = 'biometal_coated (hero, photo)';
      if (post) m.defines = Object.assign({}, m.defines, { BMH_SRGB_OUT: '' });
      m.onBeforeCompile = photoCompile;
      return m;
    }
    m.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, U, { uGrain: G.grain, uThick: G.uThick, uYc: G.uYc, uRt: G.uRt, uRb: G.uRb, uGround: G.uGround, uCutCol: G.uCutCol, uStipple: G.uStipple, uStippleMm: G.uStippleMm });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPmm = position * 1000.0; vUpN = abs(normal.y);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN;\nuniform float uT, uEtch, uEtchW, uGrain, uThick, uYc, uRt, uRb, uGround, uStipple, uStippleMm; uniform vec3 uCutCol;\n' + GLSL_FIELD + GLSL_BUMP)
        .replace('#include <clipping_planes_fragment>', [
          '#include <clipping_planes_fragment>',
          'vec3 bmhCell = floor(vPmm / uStippleMm);',
          'float bmhF = bmhField(vPmm) + uStipple * (bmhHash(bmhMod(bmhCell.x), bmhMod(bmhCell.y), bmhMod(bmhCell.z)) - 0.5);',
          'float bmhW = max(fwidth(bmhF), 1e-5);',
          'float bmhCover = clamp((bmhF - uT - (gl_FrontFacing ? 0.0 : 0.7 * uStipple)) / bmhW + 0.5, 0.0, 1.0);',   // inside faces go first
          'if (bmhCover <= 0.0) discard;',
          'float bmhEtch = uEtch * (1.0 - smoothstep(uT, uT + uEtchW, bmhF));',
          'float bmhMottle = bmhVN(vPmm * 0.9 + vec3(4.1, 2.2, 8.3)) * 0.65 + bmhVN(vPmm * 2.6 + vec3(1.7, 6.2, 3.3)) * 0.35 - 0.5;',
          'float bmhPx = max(length(dFdx(vPmm)), length(dFdy(vPmm)));',   // mm per pixel here
          'float bmhGrainK = uGrain * mix(1.0, 0.55, vUpN);',
          /* the blasted grain: three octaves (0.25, 0.11, 0.05 mm), each faded out once its cells
             shrink below about two pixels, so it resolves on a retina screen and never shimmers */
          'float bmhK1 = 1.0 - smoothstep(0.07, 0.14, bmhPx);',
          'float bmhK2 = 1.0 - smoothstep(0.03, 0.06, bmhPx);',
          'float bmhK3 = 1.0 - smoothstep(0.013, 0.026, bmhPx);',
          'float bmhG = 0.5 + (bmhVN(vPmm * 4.0) - 0.5) * 0.6 * bmhK1 + (bmhVN(vPmm * 9.0 + 3.1) - 0.5) * 0.8 * bmhK2 + (bmhVN(vPmm * 20.0 + 7.7) - 0.5) * 0.8 * bmhK3;',
          /* pits: the small dark specks grit leaves */
          'float bmhPit = 0.6 * smoothstep(0.7, 0.9, bmhVN(vPmm * 7.0 + vec3(9.1, 1.3, 5.7))) * bmhK1 + smoothstep(0.72, 0.9, bmhVN(vPmm * 16.0 + vec3(2.9, 8.4, 0.6))) * bmhK2;',
          /* where we are relative to the nearest hole (v2's centres): bore, countersink, or neither */
          'float bmhHx = vPmm.x < ' + f3(HMID[0]) + ' ? ' + f3(HOLES[0]) + ' : vPmm.x < ' + f3(HMID[1]) + ' ? ' + f3(HOLES[1]) +
            ' : vPmm.x < ' + f3(HMID[2]) + ' ? ' + f3(HOLES[2]) + ' : ' + f3(HOLES[3]) + ';',
          'float bmhHr = length(vec2(vPmm.x - bmhHx, vPmm.z));',
          'float bmhBore = (bmhHr < uRb + 0.08 && vPmm.y > 0.02 && vPmm.y < uYc + 0.02) ? 1.0 : 0.0;',
          'float bmhCone = (bmhHr < uRt + 0.03 && vPmm.y >= uYc - 0.02 && vPmm.y < uThick - 0.01) ? 1.0 : 0.0;',
          'bmhGrainK *= 1.0 - 0.75 * bmhCone;',                            // turned: the tool leaves rings, not grit
          'float bmhWall = (1.0 - bmhCone) * (1.0 - smoothstep(0.25, 0.6, vUpN));',   // side walls and bore: blasted
          'float bmhAO = 1.0;',
          'bmhAO *= mix(1.0, mix(0.22, 0.72, smoothstep(0.0, uYc, vPmm.y)), bmhBore);',
          'bmhAO *= mix(1.0, mix(0.66, 1.0, smoothstep(uYc, uThick, vPmm.y)), bmhCone);',
          /* the wall reflects the floor beside it, which sits in the plate's own shadow: dark at the foot, bright at the rim */
          'bmhAO *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.45, vPmm.y)) * mix(0.72, 1.0, smoothstep(0.1, uThick, vPmm.y)), uGround * (1.0 - bmhBore));',
          /* the top of each outer wall rolls over into the face, as on the real part (wider than the
             modelled 0.10 mm break), so it catches the softbox above the camera as a bright line */
          'float bmhRim = bmhWall * (1.0 - bmhBore) * smoothstep(uThick - 0.24, uThick - 0.03, vPmm.y);'
        ].join('\n'))
        .replace('#include <alphatest_fragment>', [
          '#include <alphatest_fragment>',
          'diffuseColor.a = bmhCover;',
          'float bmhFace = (1.0 - bmhWall) * (1.0 - bmhCone);',
          'diffuseColor.rgb *= 1.0 + bmhMottle * (0.05 + 0.07 * bmhFace) + (bmhG - 0.5) * (0.10 + 0.22 * bmhWall) * bmhGrainK',
          '                   - bmhPit * (0.03 + 0.14 * bmhWall) * uGrain * (1.0 - bmhCone) - bmhEtch * 0.06;'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          'normal = normalize(normal + normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz) * bmhRim * 0.85);',
          /* relief only where the part was blasted: none on the turned cone, a trace on the satin faces */
          'normal = bmhPerturb(-vViewPosition, normal, (vec2(dFdx(bmhG), dFdy(bmhG)) * (0.005 * bmhFace + 0.03 * bmhWall)',
          '                                            - vec2(dFdx(bmhPit), dFdy(bmhPit)) * 0.012 * bmhWall) * bmhGrainK, faceDirection);'
        ].join('\n'))
        .replace('#include <output_fragment>', [
          '#include <output_fragment>',
          /* inside faces only show through the dissolve: draw them as the plain cut section of solid metal */
          'if (!gl_FrontFacing) gl_FragColor.rgb = uCutCol * mix(0.72, 1.0, smoothstep(0.0, uThick, vPmm.y));'
        ].join('\n'))
        .replace('#include <aomap_fragment>', [
          '#include <aomap_fragment>',
          'reflectedLight.indirectSpecular *= bmhAO;',
          'reflectedLight.indirectDiffuse *= bmhAO;'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', [
          /* the GLB's finish map, exactly as glTF defines it: factor x map.G */
          'float roughnessFactor = roughness;',
          '#ifdef USE_ROUGHNESSMAP',
          '  roughnessFactor *= texture2D(roughnessMap, vUv).g;',
          '#endif',
          'roughnessFactor = clamp(roughnessFactor + bmhMottle * 0.06 + (bmhG - 0.5) * 0.08 * bmhGrainK + bmhPit * 0.12 * bmhWall, 0.04, 1.0);',
          'roughnessFactor = mix(roughnessFactor, 0.66, bmhEtch);'
        ].join('\n'));
    };
    return m;
  }

  /* ------------------------------------------------------------------ the 'photo' look's metal
     The same base, dissolve and occlusion as the 'current' shader above. What changes is the surface,
     matched against swanson-plates-5.jpg cropped in close:
       - walls and bore: the blasted grain at lower contrast, with dark blotches and faint vertical
         streaks, and a shade darker than the faces, as photographed;
       - faces: faint lengthwise lapping marks, soft handling smudges and a few fine scratches;
       - countersinks: concentric turning rings in the normal and the roughness, satin not chrome;
       - edges: the top of every outer wall rolls over on a small radius and each countersink lip
         breaks, so both catch the softbox as a bright line. The mesh's 0.10 mm break is too small to.
     Every detail fades out before its features drop under about two pixels, so nothing shimmers.
     The geometry is untouched: all of it is normal, roughness and tone. */
  const P = {
    uScuff: { value: KNOBS.scuffs }, uLap: { value: KNOBS.machiningMarks }, uRings: { value: KNOBS.turningRings },
    uGrit: { value: KNOBS.wallGrit }, uWallTone: { value: KNOBS.wallTone }, uConeRough: { value: KNOBS.coneRoughness },
    uEdgeR: { value: KNOBS.edgeRadiusMm }, uEdgeCatch: { value: KNOBS.edgeCatch }
  };
  const GLSL_SCRATCH = [
    /* fine scratches on a plate-plan plane, millimetres: one short tapered segment in some 1.3 mm cells */
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

  function photoCompile(sh) {
    Object.assign(sh.uniforms, U, P, { uGrain: G.grain, uThick: G.uThick, uYc: G.uYc, uRt: G.uRt, uRb: G.uRb, uGround: G.uGround, uCutCol: G.uCutCol, uStipple: G.uStipple, uStippleMm: G.uStippleMm });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;')
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vPmm = position * 1000.0; vUpN = abs(normal.y);',
        /* the plate's own axes in view space: up, and the plan directions for the countersink lip */
        'vVX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vVY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vVZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));'
      ].join('\n'));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;\n' +
        'uniform float uT, uEtch, uEtchW, uGrain, uThick, uYc, uRt, uRb, uGround, uStipple, uStippleMm; uniform vec3 uCutCol;\n' +
        'uniform float uScuff, uLap, uRings, uGrit, uWallTone, uConeRough, uEdgeR, uEdgeCatch;\n' + GLSL_FIELD + GLSL_BUMP + GLSL_SCRATCH)
      .replace('#include <clipping_planes_fragment>', [
        '#include <clipping_planes_fragment>',
        /* the dissolve: identical to 'current' */
        'vec3 bmhCell = floor(vPmm / uStippleMm);',
        'float bmhF = bmhField(vPmm) + uStipple * (bmhHash(bmhMod(bmhCell.x), bmhMod(bmhCell.y), bmhMod(bmhCell.z)) - 0.5);',
        'float bmhW = max(fwidth(bmhF), 1e-5);',
        'float bmhCover = clamp((bmhF - uT - (gl_FrontFacing ? 0.0 : 0.7 * uStipple)) / bmhW + 0.5, 0.0, 1.0);',
        'if (bmhCover <= 0.0) discard;',
        'float bmhEtch = uEtch * (1.0 - smoothstep(uT, uT + uEtchW, bmhF));',
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
        'bmhAO *= mix(1.0, mix(0.16, 0.55, smoothstep(0.0, uYc, vPmm.y)), bmhBore);',   /* the photo's bore reads darker */
        'bmhAO *= mix(1.0, mix(0.66, 1.0, smoothstep(uYc, uThick, vPmm.y)), bmhCone);',
        'bmhAO *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.45, vPmm.y)) * mix(0.72, 1.0, smoothstep(0.1, uThick, vPmm.y)), uGround * (1.0 - bmhBore));',
        /* walls and bore: blotches (about 0.8 mm) and faint vertical streaks (0.14 mm across) */
        'float bmhBlot = smoothstep(0.5, 0.85, bmhVN(vPmm * vec3(1.3, 2.2, 1.3) + vec3(5.3, 1.1, 9.4))) * (1.0 - smoothstep(0.2, 0.4, bmhPx));',
        'float bmhStK = 1.0 - smoothstep(0.035, 0.07, bmhPx);',
        'float bmhStreak = (bmhVN(vec3(vPmm.x * 7.0, vPmm.y * 0.9, vPmm.z * 7.0) + 2.7) - 0.5) * bmhStK;',
        /* faces: lapping marks along the length, 0.17 and 0.05 mm across */
        'float bmhLapK1 = 1.0 - smoothstep(0.04, 0.08, bmhPx);',
        'float bmhLapK2 = 1.0 - smoothstep(0.012, 0.024, bmhPx);',
        'float bmhLapV = (bmhVN(vec3(vPmm.x * 0.5, vPmm.z * 6.0, 3.3)) - 0.5) * bmhLapK1 + (bmhVN(vec3(vPmm.x * 1.6, vPmm.z * 22.0, 8.1)) - 0.5) * 0.7 * bmhLapK2;',
        /* faces: handling smudges (a few mm) and fine scratches */
        'float bmhSmudge = smoothstep(0.58, 0.86, bmhVN(vec3(vPmm.x * 0.38 + 13.1, vPmm.z * 0.55 + 2.0, 7.7)));',
        'float bmhScr = bmhScratch(vPmm.xz, bmhPx);',
        /* countersinks: turning rings, 0.2 and 0.07 mm apart, their depth wandering round the cone */
        'float bmhRk1 = 1.0 - smoothstep(0.05, 0.1, bmhPx);',
        'float bmhRk2 = 1.0 - smoothstep(0.018, 0.036, bmhPx);',
        'float bmhRa = 0.35 + 0.9 * bmhVN(vec3(bmhRad * 2.2 + 7.0, bmhHr * 5.0));',
        'float bmhRph = 3.0 * bmhVN(vec3(bmhRad * 1.4 + 3.0, bmhHr * 2.0 + 1.0));',
        'float bmhRing = (sin(bmhHr * 31.4 + bmhRph) * bmhRa * bmhRk1 + sin(bmhHr * 89.0 + 1.7 * bmhRph) * 0.25 * bmhRk2) * uRings;',
        /* masks go on after any derivative is taken, or the step at each boundary shows as a dashed line */
        'float bmhScrM = bmhScr * bmhTop, bmhRingM = bmhRing * bmhCone;'
      ].join('\n'))
      .replace('#include <alphatest_fragment>', [
        '#include <alphatest_fragment>',
        'diffuseColor.a = bmhCover;',
        'diffuseColor.rgb *= (1.0 + bmhMottle * (0.04 + 0.05 * bmhFace) + (bmhG - 0.5) * (0.07 * bmhFace + 0.12 * bmhWall) * bmhGrainK',
        '                   - bmhPit * (0.02 + 0.24 * bmhWall) * uGrain * (1.0 - bmhCone)',   /* the photo's walls fleck dark, never bright */
        '                   - bmhBlot * 0.12 * bmhWall * uGrit + bmhStreak * 0.10 * bmhWall * uGrit',
        '                   + bmhLapV * 0.035 * bmhFace * uLap - bmhSmudge * 0.035 * bmhTop * uScuff + bmhScrM * 0.08 * uScuff',
        '                   - bmhEtch * 0.06) * mix(1.0, uWallTone, bmhWall);'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        /* the rolled edge: across the top edgeRadius of each outer wall the normal turns from the wall's to
           straight up, lingering near 45 degrees as a deburred edge does, so a band of it faces the
           softbox above the camera. The photo's bright band is about 0.2 mm */
        'float bmhEu = bmhWall * (1.0 - bmhBore) * clamp((vPmm.y - (uThick - uEdgeR)) / max(uEdgeR, 1e-3), 0.0, 1.0);',
        'float bmhEa = (0.5 - sin(asin(1.0 - 2.0 * bmhEu) / 3.0)) * 1.5708 * uEdgeCatch;',
        'normal = normalize(cos(bmhEa) * normal + sin(bmhEa) * vVY);',
        /* the countersink lip: the cone's top turns up, the face's edge turns in */
        'float bmhLipC = bmhCone * smoothstep(uThick - 0.45 * uEdgeR, uThick - 0.005, vPmm.y);',
        'float bmhLipF = bmhTop * (1.0 - smoothstep(uRt, uRt + 0.5 * uEdgeR, bmhHr));',
        'vec3 bmhIn = -normalize(bmhRad.x * vVX + bmhRad.y * vVZ);',
        'normal = normalize(normal + (vVY - normal) * bmhLipC * 0.7 * uEdgeCatch + bmhIn * bmhLipF * 0.6 * uEdgeCatch);',
        /* micro relief, heights in millimetres */
        'vec2 bmhDG = vec2(dFdx(bmhG), dFdy(bmhG));',
        'vec2 bmhDP = vec2(dFdx(bmhPit), dFdy(bmhPit));',
        'vec2 bmhDB = vec2(dFdx(bmhBlot), dFdy(bmhBlot));',
        'vec2 bmhDL = vec2(dFdx(bmhLapV), dFdy(bmhLapV));',
        'vec2 bmhDS = vec2(dFdx(bmhScr), dFdy(bmhScr));',
        'vec2 bmhDR = vec2(dFdx(bmhRing), dFdy(bmhRing));',
        'normal = bmhPerturb(-vViewPosition, normal, (bmhDG * (0.004 * bmhFace + 0.022 * bmhWall) - bmhDP * 0.012 * bmhWall) * bmhGrainK',
        '  - bmhDB * 0.01 * bmhWall * uGrit + bmhDL * 0.002 * bmhFace * uLap - bmhDS * 0.003 * bmhTop * uScuff + bmhDR * 0.004 * bmhCone, faceDirection);'
      ].join('\n'))
      .replace('#include <output_fragment>', [
        '#include <output_fragment>',
        'if (!gl_FrontFacing) gl_FragColor.rgb = uCutCol * mix(0.72, 1.0, smoothstep(0.0, uThick, vPmm.y));'
      ].join('\n'))
      .replace('#include <encodings_fragment>', [
        '#include <encodings_fragment>',
        /* drawn into the lens pass's target, which three leaves linear: encode as the canvas would */
        '#ifdef BMH_SRGB_OUT',
        'gl_FragColor = LinearTosRGB(gl_FragColor);',
        '#endif'
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'reflectedLight.indirectSpecular *= bmhAO;',
        'reflectedLight.indirectDiffuse *= bmhAO;'
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', [
        'float roughnessFactor = roughness;',
        '#ifdef USE_ROUGHNESSMAP',
        '  roughnessFactor *= texture2D(roughnessMap, vUv).g;',
        '#endif',
        'roughnessFactor = mix(roughnessFactor, uConeRough, bmhCone);',
        'roughnessFactor = clamp(roughnessFactor + bmhMottle * 0.05 + (bmhG - 0.5) * 0.08 * bmhGrainK + bmhPit * 0.12 * bmhWall',
        '                  + bmhBlot * 0.1 * bmhWall * uGrit + bmhLapV * 0.05 * bmhFace * uLap + bmhSmudge * 0.1 * bmhTop * uScuff',
        '                  - bmhScrM * 0.08 * uScuff + bmhRingM * 0.04, 0.04, 1.0);',
        'roughnessFactor = mix(roughnessFactor, 0.66, bmhEtch);'
      ].join('\n'));
  }

  /* ------------------------------------------------------------------ the 'photo' look's lens
     Built only when look is 'photo', so 'current' still draws straight to the canvas. The scene renders
     into a 4x multisampled target (the dissolve's alpha-to-coverage still antialiases), then one pass
     blurs it as a macro lens would: sharp on the near holes, softening toward the far end. The blur
     radius comes from the depth of the plate's plane under each pixel. For a plane, 1/depth is linear
     in screen space, so three numbers carry it and no depth buffer is read; the plate is 1.8 mm thick
     and lies on that plane, as do its shadow and vapour. The blur is done in linear light. */
  let post = null;
  function buildPost() {
    if (post || !renderer.capabilities.isWebGL2) return;
    const rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    const mat = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: {
        tColor: { value: rt.texture }, uTexel: { value: new THREE.Vector2(0.25, 0.25) },
        uPlane: { value: new THREE.Vector3(0, 0, 1) }, uK: { value: 0 }, uMax: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tColor; uniform vec2 uTexel; uniform vec3 uPlane; uniform float uK, uMax; varying vec2 vUv;',
        'void main() {',
        '  vec4 c0 = texture2D(tColor, vUv);',
        '  float coc = min(uK * abs(1.0 - (uPlane.x * vUv.x + uPlane.y * vUv.y + uPlane.z)), uMax);',   // radius, device px
        '  if (coc < 0.3) { gl_FragColor = vec4(c0.rgb, 1.0); return; }',
        '  vec3 acc = pow(c0.rgb, vec3(2.2));',
        '  for (int i = 1; i < 32; i++) {',
        '    float fi = float(i);',
        '    float a = fi * 2.39996323;',                                   // golden angle: an even disc
        '    acc += pow(texture2D(tColor, vUv + vec2(cos(a), sin(a)) * sqrt(fi / 31.0) * coc * uTexel).rgb, vec3(2.2));',
        '  }',
        '  vec3 c = pow(acc / 32.0, vec3(1.0 / 2.2));',
        '  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
        '  gl_FragColor = vec4(c, 1.0);',
        '}'
      ].join('\n')
    });
    const sc = new THREE.Scene();
    sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    post = { rt: rt, mat: mat, scene: sc };
  }
  function disposePost() {
    if (!post) return;
    post.rt.dispose(); post.mat.dispose();
    post.scene.children[0].geometry.dispose();
    post = null;
  }
  const lensM = new THREE.Matrix3(), lensV = new THREE.Vector3(), lensP = new THREE.Vector3();
  function lens() {
    const u = post.mat.uniforms;
    const farPx = KNOBS.depthOfField * pxPerMm * renderer.getPixelRatio();
    if (!(farPx > 0.05)) { u.uK.value = 0; return; }
    const yaw = yawG.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw), yh = THICK / 2;
    function depth(x, z) { lensP.set(x, yh, z).applyMatrix4(camera.matrixWorldInverse); return -lensP.z; }
    const dA = depth(HALF * cy, -HALF * sy), dB = depth(-HALF * cy, HALF * sy);
    const near = Math.min(dA, dB), far = Math.max(dA, dB);
    const zf = BMH.lerp(near, far, KNOBS.focusAt);
    /* 1/depth on the plane, as a*u + b*v + c over the target's uv, from three points on it */
    const pts = [[-40, -40], [40, -40], [0, 40]], inv = [], e = [];
    pts.forEach(function (q) {
      const d = depth(q[0], q[1]);
      lensP.set(q[0], yh, q[1]).project(camera);
      e.push(lensP.x * 0.5 + 0.5, lensP.y * 0.5 + 0.5, 1);
      inv.push(1 / d);
    });
    lensM.set(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8]).invert();
    lensV.set(inv[0], inv[1], inv[2]).applyMatrix3(lensM).multiplyScalar(zf);
    u.uPlane.value.copy(lensV);
    u.uK.value = farPx / Math.max(Math.abs(1 - zf / far), 1e-3);
    u.uMax.value = farPx * 1.6 + 0.5;
  }

  /* ------------------------------------------------------------------ the contact shadow
     Rendered from underneath with an orthographic camera looking up, plate-aligned. Each texel
     stores how close the lowest metal above it is to the ground (R: within a hair, for the
     contact line; G: within a few mm, for the soft shadow). Blurred twice, drawn on the ground.
     The same field discards here, so the shadow resorbs with the metal. */
  const SH = { w: 96, h: 28, rx: 768, ry: 224, far: 14 };   // mm and texels: 0.125 mm a texel, room past v2's 57.8 mm for the fade
  const halfOK = renderer.capabilities.isWebGL2 &&
    (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
  const rtOpts = { type: halfOK ? THREE.HalfFloatType : THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true };
  const rtDepth = new THREE.WebGLRenderTarget(SH.rx, SH.ry, rtOpts);
  const rtA = new THREE.WebGLRenderTarget(SH.rx, SH.ry, Object.assign({}, rtOpts, { depthBuffer: false }));
  const rtTight = new THREE.WebGLRenderTarget(SH.rx, SH.ry, Object.assign({}, rtOpts, { depthBuffer: false }));
  const rtWide = new THREE.WebGLRenderTarget(SH.rx, SH.ry, Object.assign({}, rtOpts, { depthBuffer: false }));
  const shadowScene = new THREE.Scene();
  const shadowCam = new THREE.OrthographicCamera(-SH.w / 2, SH.w / 2, SH.h / 2, -SH.h / 2, 0, SH.far);
  const qUp = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const qYaw = new THREE.Quaternion();
  const shadowMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: Object.assign({ uTightH: { value: 0.9 }, uWideH: { value: 9.0 } }, U),
    vertexShader: [
      'varying vec3 vPmm; varying float vH;',
      'void main() {',
      '  vPmm = position * 1000.0;',
      '  vec4 w = modelMatrix * vec4(position, 1.0);',
      '  vH = w.y;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uT, uTightH, uWideH;',
      GLSL_FIELD,
      'varying vec3 vPmm; varying float vH;',
      'void main() {',
      '  if (bmhField(vPmm) < uT) discard;',
      '  gl_FragColor = vec4(1.0 - smoothstep(0.0, uTightH, vH), 1.0 - smoothstep(0.0, uWideH, vH), 0.0, 1.0);',
      '}'
    ].join('\n')
  });
  let shadowMesh = null;

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const blurMat = new THREE.ShaderMaterial({
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
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));

  function blur(from, to, dx, dy) {
    blurMat.uniforms.tMap.value = from.texture;
    blurMat.uniforms.uDir.value.set(dx / SH.rx, dy / SH.ry);
    renderer.setRenderTarget(to);
    renderer.render(quadScene, quadCam);
  }

  const groundMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      tTight: { value: rtTight.texture }, tWide: { value: rtWide.texture },
      uTight: { value: KNOBS.contactShadow }, uWide: { value: KNOBS.shadow },
      uCol: { value: new THREE.Color('#646a7e') },
      uSize: { value: new THREE.Vector2(SH.w, SH.h) }
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SH.w, SH.h), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.renderOrder = 1;
  groundG.add(ground);

  const clearTmp = new THREE.Color();
  function renderShadow() {
    shadowMesh.matrix.copy(plateMesh.matrixWorld);
    shadowMesh.matrixWorldNeedsUpdate = true;
    qYaw.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawG.rotation.y);
    shadowCam.quaternion.copy(qYaw).multiply(qUp);
    shadowCam.position.set(0, -0.05, 0);
    shadowCam.updateMatrixWorld();

    renderer.getClearColor(clearTmp);
    const clearA = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rtDepth);
    renderer.render(shadowScene, shadowCam);
    const tight = 0.9, wide = KNOBS.shadowSoftMm / (SH.w / SH.rx) / 3.2;
    blur(rtDepth, rtA, tight, 0); blur(rtA, rtTight, 0, tight);
    blur(rtTight, rtA, wide, 0); blur(rtA, rtWide, 0, wide);
    blur(rtWide, rtA, wide * 0.7, 0); blur(rtA, rtWide, 0, wide * 0.7);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearTmp, clearA);
  }

  /* ------------------------------------------------------------------ the vapour */
  let grains = null;
  const grainMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    blending: THREE.CustomBlending, blendEquation: THREE.MinEquation,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: Object.assign({
      uLife: { value: 0.1 }, uSize: { value: 2 }, uMinPx: { value: 1.2 }, uGrow: { value: KNOBS.grainGrow },
      uDrift: { value: new THREE.Vector3() }, uStrength: { value: KNOBS.vapourStrength },
      uColA: { value: new THREE.Color('#a3aab7') }, uColB: { value: new THREE.Color('#c8cdd6') }
    }, U),
    vertexShader: [
      'attribute float aField; attribute float aSeed; attribute float aTone;',
      'uniform float uT, uLife, uSize, uMinPx, uGrow; uniform vec3 uDrift;',
      'varying float vA; varying float vTone;',
      'void main() {',
      '  float q = (uT - aField) / (uLife * (0.8 + 0.4 * aSeed));',
      '  if (q <= 0.0 || q >= 1.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vTone = 0.0; return; }',
      '  float e = q * q * (3.0 - 2.0 * q);',                       // zero velocity at release
      '  vec4 w = modelMatrix * vec4(position, 1.0);',
      '  w.xyz += uDrift * e * (0.85 + 0.3 * aSeed);',               // one shared vector
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '  gl_PointSize = max(uSize, uMinPx) * (1.0 + uGrow * e);',
      '  vA = pow(1.0 - q, 1.4);',
      '  vTone = aTone;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uColA, uColB; uniform float uStrength; varying float vA; varying float vTone;',
      'void main() {',
      '  float r = length(gl_PointCoord - 0.5) * 2.0;',
      '  if (r > 1.0) discard;',
      '  float a = vA * uStrength * (1.0 - smoothstep(0.3, 1.0, r));',
      '  gl_FragColor = vec4(mix(vec3(1.0), mix(uColA, uColB, vTone), a), 1.0);',   // MIN blend: never darker than one grain
      '}'
    ].join('\n')
  });

  function rng(seed) {                  // mulberry32: the same grains on every load
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildGrains(mesh) {
    const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const nrm = g.attributes.normal, wt = new Float32Array(nrm.count);
    for (let i = 0; i < nrm.count; i++) wt[i] = nrm.getY(i) < -0.7 ? 0.12 : 1.0;   // mostly the faces you can see
    g.setAttribute('bmhW', new THREE.BufferAttribute(wt, 1));
    const sampler = new THREE.MeshSurfaceSampler(new THREE.Mesh(g)).setWeightAttribute('bmhW');
    const rand = rng(20260924);
    sampler.setRandomGenerator(rand);
    sampler.build();

    const N = Math.round(KNOBS.grains * (window.innerWidth < 900 ? 0.5 : 1)), fk = [MODES[KNOBS.direction] || 0, KNOBS.ragged, KNOBS.pits, 1 / KNOBS.pitMm];
    const pos = new Float32Array(N * 3), fld = new Float32Array(N), seed = new Float32Array(N), tone = new Float32Array(N);
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) {
      sampler.sample(p, n);
      p.addScaledVector(n, 0.00002);   // 0.02 mm proud of the surface
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      const f = field(p.x * 1000, p.y * 1000, p.z * 1000, fk);
      fld[i] = f; if (f < lo) lo = f; if (f > hi) hi = f;
      seed[i] = rand();
      tone[i] = BMH.clamp((n.y > 0.6 ? 0.35 : n.y < -0.6 ? 0.15 : 0.75) + (rand() - 0.5) * 0.4, 0, 1);
    }
    g.dispose();
    fieldMin = lo; fieldMax = hi;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aField', new THREE.BufferAttribute(fld, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aTone', new THREE.BufferAttribute(tone, 1));
    if (grains) { grains.geometry.dispose(); plateG.remove(grains); }
    grains = new THREE.Points(geo, grainMat);
    grains.frustumCulled = false;
    grains.renderOrder = 2;
    plateG.add(grains);
  }

  /* ------------------------------------------------------------------ framing
     The camera orbits at a fixed elevation. Its distance sets the plate's size, and a lens shift
     puts the plate's centre where the layout wants it, so perspective never skews as it moves. */
  let pxPerMm = 10;
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? HALF : -HALF, i & 2 ? THICK : 0, i & 4 ? HALF_W : -HALF_W));
  const v3 = new THREE.Vector3();

  function thePose() { return KNOBS.poses[KNOBS.pose] || KNOBS.poses.photo; }

  function layout() {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const PZ = thePose();
    const L = w < 900 ? PZ.phone : PZ.desktop;
    camera.fov = KNOBS.lensDeg;
    camera.aspect = w / h;
    const el = KNOBS.elevationDeg * DEG, yaw = PZ.yawDeg * DEG;
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
    const aim = new THREE.Vector3(0, THICK / 2, 0);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);

    function project(d) {
      camera.position.copy(dir).multiplyScalar(d).add(aim);
      camera.lookAt(aim);
      camera.rotateZ((L.rollDeg || 0) * DEG);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      corners.forEach(function (c) {
        v3.set(c.x * cy + c.z * sy, c.y, -c.x * sy + c.z * cy).project(camera);
        x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
      });
      return { x0: x0, x1: x1, y0: y0, y1: y1 };
    }
    /* where the plate goes: from the knobs, or on a phone, centred in the room under the copy */
    let ty = L.y, size = L.size;
    if (ty == null) {
      const last = copyEl.lastElementChild;
      const top = last ? last.getBoundingClientRect().bottom - stage.getBoundingClientRect().top : h * 0.45;
      const room = Math.max(h - top, h * 0.3);
      ty = (top + room * 0.5) / h;
      size = Math.min(size, 0.9);
      L._room = room / h;
    }
    let b = project(200);
    let d = 200 * (b.x1 - b.x0) / (size * 2);
    b = project(d);
    if (L._room && (b.y1 - b.y0) / 2 > L._room * 0.72) d *= ((b.y1 - b.y0) / 2) / (L._room * 0.72);   // too tall for the room
    else d *= (b.x1 - b.x0) / (size * 2);
    b = project(d);
    size = (b.x1 - b.x0) / 2;
    const P = camera.projectionMatrix.elements;
    P[8] -= (L.x * 2 - 1) - (b.x0 + b.x1) / 2;
    P[9] -= (1 - ty * 2) - (b.y0 + b.y1) / 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    pxPerMm = (size * w) / (2 * HALF * Math.abs(cy) + 2 * HALF_W * Math.abs(sy));   // roughly: screen px per plate mm
    grainMat.uniforms.uSize.value = KNOBS.grainMm * pxPerMm * renderer.getPixelRatio();
    grainMat.uniforms.uMinPx.value = 1.3 * renderer.getPixelRatio();
    if (post) {
      const bw = Math.max(1, Math.round(w * renderer.getPixelRatio())), bh = Math.max(1, Math.round(h * renderer.getPixelRatio()));
      post.rt.setSize(bw, bh);
      post.mat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    }
  }

  /* ------------------------------------------------------------------ state and drawing */
  let ready = false, visible = true, queued = false;
  let enterAt = 0, entering = false, dissolve = 0, held = null;

  function applyKnobs() {
    renderer.toneMappingExposure = KNOBS.exposure;
    G.grain.value = KNOBS.grain;
    U.uMode.value = MODES[KNOBS.direction] || 0;
    U.uRagged.value = KNOBS.ragged;
    U.uPits.value = KNOBS.pits;
    U.uPitF.value = 1 / KNOBS.pitMm;
    if (metal) {
      if (KNOBS.metalColour) metal.color.copy(BMH.color ? BMH.color(KNOBS.metalColour) : new THREE.Color(KNOBS.metalColour).convertSRGBToLinear());
      else metal.color.copy(baseColour);
      metal.roughness = baseRough * KNOBS.finish;
    }
    groundMat.uniforms.uTight.value = KNOBS.contactShadow;
    groundMat.uniforms.uWide.value = KNOBS.shadow;
    grainMat.uniforms.uGrow.value = KNOBS.grainGrow;
    grainMat.uniforms.uStrength.value = KNOBS.vapourStrength;
    const dv = new THREE.Vector3().fromArray(KNOBS.driftDir).normalize().multiplyScalar(KNOBS.driftMm);
    grainMat.uniforms.uDrift.value.copy(dv);
    P.uScuff.value = KNOBS.scuffs; P.uLap.value = KNOBS.machiningMarks; P.uRings.value = KNOBS.turningRings;
    P.uGrit.value = KNOBS.wallGrit; P.uWallTone.value = KNOBS.wallTone; P.uConeRough.value = KNOBS.coneRoughness;
    P.uEdgeR.value = KNOBS.edgeRadiusMm; P.uEdgeCatch.value = KNOBS.edgeCatch;
    sec.style.setProperty('--pin', reduced ? 0 : KNOBS.scrollScreens);
    layout();
  }

  function schedule() {
    const mode = MODES[KNOBS.direction] || 0;
    const slope = (mode === 0 ? 1 / HALF : mode === 3 ? 0 : 0.5 / HALF) * (1 - KNOBS.ragged);   // field units per mm along the plate
    G.uStipple.value = mode === 3 ? 0.06 : KNOBS.edgeMm * slope;
    G.uStippleMm.value = Math.max(KNOBS.grainMm, 1.4 / (pxPerMm * renderer.getPixelRatio()));
    const span = fieldMax - fieldMin;
    const life = KNOBS.vapourLife * span;
    grainMat.uniforms.uLife.value = life;
    U.uEtchW.value = 0.07 * span;
    const d = held != null ? held : dissolve;
    const lead = G.uStipple.value * 1.2 + 0.01;                        // the stipple and the inside faces run ahead
    U.uT.value = BMH.lerp(fieldMin - lead, fieldMax + life * 1.2 + 0.01, d);
    U.uEtch.value = KNOBS.etch * BMH.smooth(0, 0.04, d);
  }

  function pose(now) {
    let t = 1;
    if (entering) {
      t = BMH.clamp((now - enterAt) / KNOBS.entranceMs, 0, 1);
      if (t >= 1) entering = false;
    }
    const e = 1 - Math.pow(1 - t, KNOBS.entranceEase);
    yawG.rotation.y = (thePose().yawDeg - KNOBS.entranceTurnDeg * (1 - e)) * DEG;
    liftG.position.y = KNOBS.entranceLiftMm * (1 - e);
    G.uGround.value = 1 - BMH.smooth(0, 0.6, liftG.position.y);
    liftG.rotation.x = KNOBS.entranceTiltDeg * (1 - e) * DEG;
    groundG.rotation.y = yawG.rotation.y;
    const oz = KNOBS.shadowOffsetMm;
    groundG.position.set(oz * 0.5, 0, oz);
  }

  function draw(now) {
    queued = false;
    if (!ready) return;
    pose(now || performance.now());
    schedule();
    scene.updateMatrixWorld();
    renderShadow();
    if (post) {                          // 'photo' only: the scene, then the lens
      lens();
      renderer.setRenderTarget(post.rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post.scene, quadCam);
    } else renderer.render(scene, camera);
    if (entering && visible) request();
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(draw); } }

  function readScroll() {
    if (reduced) { dissolve = 0; return; }
    const p = BMH.pinProgress(sec);
    const d = BMH.clamp((p - KNOBS.dissolveFrom) / (KNOBS.dissolveTo - KNOBS.dissolveFrom), 0, 1);
    if (d !== dissolve) { dissolve = d; request(); }
  }

  /* ------------------------------------------------------------------ load */
  buildStudio();
  let resolveReady;
  const readyP = new Promise(function (r) { resolveReady = r; });

  const t0 = performance.now();
  BMH.glb(PV.blob || 'glb-plate-v2-hi').then(function (gltf) {
    let body = null, coated = null;
    gltf.scene.traverse(function (o) {
      if (!o.isMesh) return;
      if (o.material && o.material.name === 'biometal_coated') coated = o.material;
      if (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count) body = o;
    });
    srcMetal = coated;
    if (KNOBS.look === 'photo') buildPost();
    metal = makeMetal(coated);
    plateMesh = new THREE.Mesh(body.geometry, metal);    // v2 as measured: never reshaped
    plateG.add(plateMesh);
    shadowMesh = new THREE.Mesh(plateMesh.geometry, shadowMat);
    shadowMesh.matrixAutoUpdate = false;
    shadowScene.add(shadowMesh);
    buildGrains(plateMesh);
    applyKnobs();
    readScroll();
    if (post) { renderer.setRenderTarget(post.rt); renderer.compile(scene, camera); renderer.setRenderTarget(null); }
    else renderer.compile(scene, camera);

    ready = true;
    BMH.hero.setupMs = Math.round(performance.now() - t0);
    entering = !reduced;
    enterAt = performance.now();
    draw(enterAt);
    sec.classList.add('is-ready');
    resolveReady();

    BMH.onScroll(readScroll);
    BMH.visible(sec, function (v) { visible = v; if (v) request(); });
    let rz = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(function () { layout(); request(); });
    });
  }).catch(function (err) {
    if (window.console) console.warn('01-hero: plate failed to load', err);
  });

  /* ------------------------------------------------------------------ review hooks */
  BMH.hero = {
    knobs: KNOBS,
    studio: STUDIO,
    ready: readyP,
    set: function (o) {
      return readyP.then(function () {
        const rebuildGrains = o && ('grains' in o || 'direction' in o || 'ragged' in o || 'pits' in o || 'pitMm' in o);
        const relook = o && 'look' in o && o.look !== KNOBS.look;
        if (o && o.studio) { Object.assign(KNOBS.look === 'photo' ? PHOTO_STUDIO : STUDIO, o.studio); delete o.studio; if (!relook) buildStudio(); }
        Object.assign(KNOBS, o || {});
        if (relook) {                    // swap the whole look: metal, studio and (for 'photo') the lens
          if (KNOBS.look === 'photo') buildPost(); else disposePost();
          const old = metal;
          metal = makeMetal(srcMetal);
          plateMesh.material = metal;
          old.dispose();
          buildStudio();
        }
        if (rebuildGrains) buildGrains(plateMesh);
        applyKnobs();
        entering = false;
        draw(performance.now());
      });
    },
    hold: function (d) { held = d; request(); return readyP; },
    replay: function () { entering = true; enterAt = performance.now(); request(); }
  };
})();
