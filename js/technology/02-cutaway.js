/* Technology 02 · One alloy, two ways. The page's signature: the cutaway.            -z1n

   "A coating today." then "The full implant tomorrow." The v2 plate (glb-plate-v2-hi, BMH.PLATE_V2, never
   reshaped) lies on a pale ground in the homepage hero's photoreal finish. As you scroll:
     1. THE CUT. A plane sweeps in from the plate's near end and stops in the neck after the first
        hole. Everything in front of it is gone. The cut face shows a grey titanium core inside a
        bright zinc-alloy layer that wraps the whole part, holes included. The camera pushes in with
        the cut so the face ends up large.
     2. THE FILL. The zinc grows inward from the layer until the grey is gone and the face is one
        metal. Both headline lines are always there, big and low; the ink moves from the first line
        to the second as the core fills (round 2, 25 Sep: Andrew asked for it lower and more of a
        headline).
   Both are scroll-linked and reverse on the way up. Drawn only when the scroll moves, never offscreen.
   Reduced motion: no pin; two stills (the coated cut, the all-zinc cut), each beside its line.

   How the cut face is drawn. The plate mesh is closed (checked: no open or non-manifold edges), so
   anything seen through the cut is the inside of the part: back faces. Everything in front of the
   plane is discarded, and every back face is shaded as the flat cut face would be at that pixel: the
   plane's normal, and a point on the plane found by running the pixel's ray from the camera to it.
   A flat face lit by the studio only depends on the ray's direction, so this is exact, and the face
   can never read as hollow. Which metal a point on the face is comes from its distance to the edge of
   the section: the section is sliced from the mesh on the CPU whenever the cut moves (a few hundred
   segments into a small float texture), and the shader measures the distance to the nearest one.
   Inside the layer is zinc, deeper is titanium; the fill is the layer growing until it meets itself.
   The exterior is never changed: it is the coated plate throughout, because the coating is its skin.

   The metal, the studio, the lens and the contact shadow are the homepage hero's 'photo' look
   (src/sections/01-hero/section.js), copied here. The layer shows where the coating sits, not its
   true thickness. There is no label.

   Review hooks: BMH.techCutaway.set({...KNOBS}), .hold(p) pins the scroll progress (null follows the
   scroll again), .ready is a promise, .stats has the last draw's timings. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ the knobs */
  const KNOBS = window.BMH.knobs('tech-cutaway', {
    /* Scroll */
    scrollScreens: 2.6,       // how many screens of scroll the stage holds
    cutFrom: 0.04,            // share of that scroll where the cut starts
    cutTo: 0.42,              // ...and where it stops
    fillFrom: 0.56,           // share of that scroll where the core starts turning to zinc
    fillTo: 0.88,             // ...and where it is all zinc
    swapAt: 0.5,              // ink 'jump': how far into the fill the ink moves to line two (0 at its start, 1 at its end)

    /* The cut */
    cutEndMm: 10.65,          // how far in from the plate's near end the cut stops. 10.65 is the neck after
                              // the first hole (a clean 5 mm section); 16.8 is through the second hole; 28.9 is halfway

    /* The layer */
    layerTrueMm: 0.03,        // the coating's real thickness, ASSUMED (30 µm). Only scales the next knob
    layerTimes: 8,            // how many times thicker than life the layer is drawn (8 x 0.03 = 0.24 mm)
    zincColour: '#e2e5e8',    // the zinc alloy on the cut face (the coated plate's own metal is #dadde0)
    coreColour: '#908f8e',    // the titanium core
    interfaceLine: 0.45,      // the fine dark line where layer meets core: 0 none
    faceBrush: 1.0,           // how strongly the cut face shows its fine machining lines: 0 mirror-flat
    faceBrushDeg: 6,          // the angle of those lines against the plate's top face
    faceRoughness: 0.26,      // how satin the cut face is
    faceLight: 0.06,          // extra light on the cut face, so it never goes muddy: 0 the studio alone

    /* The headline: both lines always shown, the live one dark, the other pale */
    place: 'low',             // 'low': big, bottom left, the plate above and right. 'beside': level with the cut face, the plate right. Phones: always low
    ink: 'wipe',              // 'wipe': the dark ink runs along line two, left to right, in step with the fill. 'jump': it moves across at once, at swapAt

    /* The camera */
    lensDeg: 18,              // vertical field of view; lower is a longer lens
    zoom: 3.8,                // how far the camera pushes in by the end of the cut (1 = not at all)
    cameraStart: { yawDeg: 50, elevationDeg: 31 },   // the plate's turn and the camera's height, before the cut
    cameraEnd:   { yawDeg: 62, elevationDeg: 27 },   // ...and after it (a small turn to face the cut)
    /* Where it sits. start: the plate's centre (share of width, height) and its width (share of width).
       end: where the cut face's centre lands. y null: centred in the room the headline leaves. */
    desktop: { start: { x: 0.58, y: null, size: 0.5 }, end: { x: 0.5, y: null }, rollDeg: 0 },         // place 'low'
    desktopBeside: { start: { x: 0.72, y: 0.52, size: 0.42 }, end: { x: 0.7, y: 0.52 }, rollDeg: 0 },    // place 'beside'
    phone:   { start: { x: 0.5, y: null, size: 0.94 }, end: { x: 0.44, y: null }, rollDeg: -18 },
    still:   { start: { x: 0.5, y: 0.5, size: 0.9 }, end: { x: 0.4, y: 0.58 }, rollDeg: 0 },    // reduced motion's two stills
    depthOfField: 0.14,       // lens blur at the plate's far end, in plate millimetres: 0 off
    exposure: 1.0,
    maxDpr: 2
  });

  /* The hero's 'photo' finish, copied as it stands (01-hero KNOBS, 25 Sep). Not knobs here: this
     plate should match the homepage's, so change it there and copy it across. */
  const FINISH = {
    finish: 1.0, grain: 1.0, scuffs: 0.5, machiningMarks: 0.6, turningRings: 0.7, wallGrit: 1.0,
    wallTone: 0.86, coneRoughness: 0.22, edgeRadiusMm: 0.3, edgeCatch: 0.8,
    shadow: 0.55, contactShadow: 0.62, shadowSoftMm: 2.2, shadowOffsetMm: 0.7
  };

  /* The hero's 'photo' studio: soft-edged softboxes on a lit seamless. */
  const STUDIO = {
    floor: 0.64, horizon: 0.9, sweep: 0.9, zenith: 0.5, front: 0.2,
    tint: [0.955, 0.95, 1.04],
    soft: 0.4,
    boxes: [
      [60, 40, [0, 34, 26], 2.4],
      [60, 60, [0, 44, -4], 2.6],
      [34, 22, [22, 20, -26], 1.6],
      [14, 34, [-34, 14, 6], 1.1],
      [10, 28, [34, 10, 14], 0.7]
    ]
  };

  const BMH = window.BMH, THREE = window.THREE;
  const sec = document.getElementById('s-tech-cutaway');
  if (!BMH || !THREE || !sec) return;

  const stage = sec.querySelector('.cut__stage');
  const canvas = sec.querySelector('.cut__canvas');
  const title = sec.querySelector('.cut__title');
  const stills = [sec.querySelector('.cut__still--a canvas'), sec.querySelector('.cut__still--b canvas')];
  const reduced = !!BMH.reduced;
  sec.style.setProperty('--pin', reduced ? 0 : KNOBS.scrollScreens);
  function applyHeadline() {
    sec.classList.toggle('is-beside', KNOBS.place === 'beside');
    sec.classList.toggle('is-jump', KNOBS.ink === 'jump');
  }
  applyHeadline();
  let inkNow = -1;
  function setInk(v) { if (v !== inkNow) { inkNow = v; sec.style.setProperty('--cut-ink', v.toFixed(3)); } }

  const DEG = Math.PI / 180;
  const PV = BMH.PLATE_V2 || {};
  const HALF = (PV.lengthMm || 57.786) / 2;
  const HALF_W = (PV.widthMm || 9.068) / 2;
  const THICK = PV.thicknessMm || 1.815;
  const HOLES = PV.holesXmm || [-24.359, -12.124, 12.124, 24.359];
  const CONE_Y = PV.coneBottomYmm || 1.280;
  const CONE_R = PV.coneTopRmm || 3.194;
  const BORE_R = PV.boreRmm || 2.165;
  const SEG_MAX = 512;
  const f3 = function (x) { return x.toFixed(3); };
  const HMID = [(HOLES[0] + HOLES[1]) / 2, (HOLES[1] + HOLES[2]) / 2, (HOLES[2] + HOLES[3]) / 2];

  /* ------------------------------------------------------------------ GLSL, shared */
  const GLSL_NOISE = [
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
    '}'
  ].join('\n');
  const GLSL_BUMP = [
    'vec3 bmhPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {',
    '  vec3 vSigmaX = dFdx(surf_pos.xyz); vec3 vSigmaY = dFdy(surf_pos.xyz);',
    '  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);',
    '  float fDet = dot(vSigmaX, R1) * faceDir;',
    '  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);',
    '  return normalize(abs(fDet) * surf_norm - vGrad);',
    '}'
  ].join('\n');
  const GLSL_SCRATCH = [
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
  /* The cut face: distance to the section's edge, and the fine machining lines across it. */
  const GLSL_CAP = [
    'float bmhSegDist(vec2 q) {',
    '  float d = 1e4;',
    '  for (int i = 0; i < ' + SEG_MAX + '; i++) {',
    '    if (i >= uSegN) break;',
    '    vec4 s = texture2DLodEXT(uSegs, vec2((float(i) + 0.5) / ' + SEG_MAX + '.0, 0.5), 0.0);',
    '    vec2 pa = q - s.xy, ba = s.zw - s.xy;',
    '    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0);',
    '    vec2 e = pa - ba * h;',
    '    d = min(d, dot(e, e));',
    '  }',
    '  return sqrt(d);',
    '}',
    /* 1D value noise across the lines: (height, d height / dx) */
    'vec2 bmhN1(float x, float seed) {',
    '  float i = floor(x), f = x - i;',
    '  float a = bmhHash(bmhMod(i), seed, 3.0), b = bmhHash(bmhMod(i + 1.0), seed, 3.0);',
    '  float u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  float du = 30.0 * f * f * (f - 1.0) * (f - 1.0);',
    '  return vec2(mix(a, b, u), (b - a) * du);',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------ renderer and scene */
  let renderer;
  try { renderer = BMH.renderer(canvas, { alpha: false, exposure: KNOBS.exposure, maxDpr: KNOBS.maxDpr }); }
  catch (e) { return; }
  const BG = new THREE.Color('#F5F8FC');                 // --bg-soft, written straight to the canvas
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(KNOBS.lensDeg, 1, 5, 4000);
  const yawG = new THREE.Group(), plateG = new THREE.Group(), groundG = new THREE.Group();
  plateG.scale.setScalar(1000);                          // the GLB is in metres; the world is in millimetres
  scene.add(yawG); yawG.add(plateG); scene.add(groundG);

  /* ------------------------------------------------------------------ studio (the hero's 'photo' room) */
  let envTex = null;
  function buildStudio() {
    const s = new THREE.Scene(), t = STUDIO.tint;
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
      const col = new THREE.Color(b[3] * t[0], b[3] * t[1], b[3] * t[2]);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(b[0], b[1]), new THREE.ShaderMaterial({
        side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: { uCol: { value: col }, uSoft: { value: STUDIO.soft } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform vec3 uCol; uniform float uSoft; varying vec2 vUv;',
          'void main() {',
          '  vec2 q = abs(vUv - 0.5) * 2.0;',
          '  float e = (1.0 - smoothstep(1.0 - uSoft, 1.0, q.x)) * (1.0 - smoothstep(1.0 - uSoft, 1.0, q.y));',
          '  float hot = 1.0 - 0.18 * dot(q, q);',
          '  gl_FragColor = vec4(uCol * hot, e);',
          '}'
        ].join('\n')
      }));
      m.position.set(b[2][0], b[2][1], b[2][2]);
      m.lookAt(0, 0, 0);
      s.add(m);
    });
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromScene(s, 0.0, 0.1, 200).texture;
    pm.dispose();
    s.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    envTex = tex;
  }

  /* ------------------------------------------------------------------ the section, sliced on the CPU */
  const segData = new Float32Array(SEG_MAX * 4);
  const segTex = new THREE.DataTexture(segData, SEG_MAX, 1, THREE.RGBAFormat, THREE.FloatType);
  segTex.minFilter = segTex.magFilter = THREE.NearestFilter;
  segTex.generateMipmaps = false;
  segTex.needsUpdate = true;
  let triX = null, triYZ = null, triN = 0;               // candidate triangles, plate millimetres

  function prepareSlicing(geo) {
    const P = geo.attributes.position, idx = geo.index ? geo.index.array : null;
    const n = idx ? idx.length / 3 : P.count / 3;
    const reach = -HALF + Math.max(KNOBS.cutEndMm, 0) + 0.5;
    const xs = [], yz = [];
    for (let t = 0; t < n; t++) {
      const a = idx ? idx[t * 3] : t * 3, b = idx ? idx[t * 3 + 1] : t * 3 + 1, c = idx ? idx[t * 3 + 2] : t * 3 + 2;
      const xa = P.getX(a) * 1000, xb = P.getX(b) * 1000, xc = P.getX(c) * 1000;
      if (Math.min(xa, xb, xc) > reach) continue;       // the cut never gets there
      xs.push(xa, xb, xc);
      yz.push(P.getY(a) * 1000, P.getZ(a) * 1000, P.getY(b) * 1000, P.getZ(b) * 1000, P.getY(c) * 1000, P.getZ(c) * 1000);
    }
    triX = new Float32Array(xs); triYZ = new Float32Array(yz); triN = xs.length / 3;
  }

  /* segments of the plane x = c through the mesh, as (z0, y0, z1, y1); returns the count */
  const secMin = new THREE.Vector2(), secMax = new THREE.Vector2();
  function slice(c, out) {
    let n = 0, z0 = 1e9, y0 = 1e9, z1 = -1e9, y1 = -1e9;
    for (let t = 0; t < triN && n < SEG_MAX; t++) {
      const i = t * 3, j = t * 6;
      const d0 = triX[i] - c, d1 = triX[i + 1] - c, d2 = triX[i + 2] - c;
      const s0 = d0 < 0, s1 = d1 < 0, s2 = d2 < 0;
      if (s0 === s1 && s1 === s2) continue;
      let k = 0;
      const pts = [0, 0, 0, 0];
      const E = [[0, 1, d0, d1, s0, s1], [1, 2, d1, d2, s1, s2], [2, 0, d2, d0, s2, s0]];
      for (let e = 0; e < 3 && k < 4; e++) {
        const q = E[e];
        if (q[4] === q[5]) continue;
        const u = q[2] / (q[2] - q[3]);
        const ya = triYZ[j + q[0] * 2], za = triYZ[j + q[0] * 2 + 1], yb = triYZ[j + q[1] * 2], zb = triYZ[j + q[1] * 2 + 1];
        pts[k++] = za + (zb - za) * u; pts[k++] = ya + (yb - ya) * u;
      }
      if (k < 4) continue;
      out[n * 4] = pts[0]; out[n * 4 + 1] = pts[1]; out[n * 4 + 2] = pts[2]; out[n * 4 + 3] = pts[3];
      z0 = Math.min(z0, pts[0], pts[2]); z1 = Math.max(z1, pts[0], pts[2]);
      y0 = Math.min(y0, pts[1], pts[3]); y1 = Math.max(y1, pts[1], pts[3]);
      n++;
    }
    secMin.set(z0, y0); secMax.set(z1, y1);
    return n;
  }

  /* the deepest point of the section at the cut's end: the fill is done when the zinc reaches it */
  let deepMm = THICK / 2;
  function measureDeepest() {
    const tmp = new Float32Array(SEG_MAX * 4);
    const n = slice(-HALF + KNOBS.cutEndMm, tmp);
    if (!n) { deepMm = THICK / 2; return; }
    let best = 0;
    const NZ = 120, NY = 48;
    for (let a = 0; a <= NZ; a++) for (let b = 0; b <= NY; b++) {
      const z = BMH.lerp(secMin.x, secMax.x, a / NZ), y = BMH.lerp(secMin.y, secMax.y, b / NY);
      let inside = false, dmin = 1e9;
      for (let s = 0; s < n; s++) {
        const za = tmp[s * 4], ya = tmp[s * 4 + 1], zb = tmp[s * 4 + 2], yb = tmp[s * 4 + 3];
        if ((ya > y) !== (yb > y) && z < za + (zb - za) * (y - ya) / (yb - ya)) inside = !inside;
        const bz = zb - za, by = yb - ya, pz = z - za, py = y - ya;
        const h = BMH.clamp((pz * bz + py * by) / Math.max(bz * bz + by * by, 1e-12), 0, 1);
        dmin = Math.min(dmin, Math.hypot(pz - bz * h, py - by * h));
      }
      if (inside && dmin > best) best = dmin;
    }
    deepMm = best || THICK / 2;
  }

  /* ------------------------------------------------------------------ the metal
     The GLB's biometal_coated material, cloned, with the hero's 'photo' finish layered on: blasted
     walls, lapping marks, scuffs, turned rings in the countersinks, rolled edges. The hero's dissolve
     is gone; the cut and the cut face take its place. */
  const G = {
    uGrain: { value: FINISH.grain }, uThick: { value: THICK }, uYc: { value: CONE_Y }, uRt: { value: CONE_R }, uRb: { value: BORE_R },
    uGround: { value: 1 },
    uScuff: { value: FINISH.scuffs }, uLap: { value: FINISH.machiningMarks }, uRings: { value: FINISH.turningRings },
    uGrit: { value: FINISH.wallGrit }, uWallTone: { value: FINISH.wallTone }, uConeRough: { value: FINISH.coneRoughness },
    uEdgeR: { value: FINISH.edgeRadiusMm }, uEdgeCatch: { value: FINISH.edgeCatch }
  };
  const C = {
    uCut: { value: -1e4 }, uCamL: { value: new THREE.Vector3() },
    uLayer: { value: 0.24 }, uLine: { value: KNOBS.interfaceLine },
    uCoreCol: { value: new THREE.Color() }, uZincCol: { value: new THREE.Color() },
    uSegs: { value: segTex }, uSegN: { value: 0 }, uSecMin: { value: secMin }, uSecMax: { value: secMax },
    uBrush: { value: KNOBS.faceBrush }, uBrushDir: { value: new THREE.Vector2(1, 0) },
    uFaceRough: { value: KNOBS.faceRoughness }, uFaceLift: { value: KNOBS.faceLight }
  };

  let metal = null, plateMesh = null, baseColour = null, baseRough = 0.34;

  function makeMetal(src) {
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: new THREE.Color(0.70, 0.722, 0.748), metalness: 1, roughness: 0.34 });
    baseColour = m.color.clone();
    baseRough = m.roughness;
    m.name = 'biometal_coated (tech cutaway)';
    m.metalness = 1;
    m.envMap = envTex;
    m.envMapIntensity = 1;
    m.side = THREE.DoubleSide;
    m.extensions = { derivatives: true, shaderTextureLOD: true };
    if (post) m.defines = Object.assign({}, m.defines, { BMH_SRGB_OUT: '' });
    m.onBeforeCompile = compile;
    return m;
  }

  function compile(sh) {
    Object.assign(sh.uniforms, G, C);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;')
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vPmm = position * 1000.0; vUpN = abs(normal.y);',
        'vVX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vVY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vVZ = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));'
      ].join('\n'));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPmm; varying float vUpN; varying vec3 vVX; varying vec3 vVY; varying vec3 vVZ;\n' +
        'uniform float uGrain, uThick, uYc, uRt, uRb, uGround;\n' +
        'uniform float uScuff, uLap, uRings, uGrit, uWallTone, uConeRough, uEdgeR, uEdgeCatch;\n' +
        'uniform float uCut, uLayer, uLine, uBrush, uFaceRough, uFaceLift; uniform vec3 uCamL, uCoreCol, uZincCol;\n' +
        'uniform vec2 uSecMin, uSecMax, uBrushDir; uniform sampler2D uSegs; uniform int uSegN;\n' +
        GLSL_NOISE + '\n' + GLSL_BUMP + '\n' + GLSL_SCRATCH + '\n' + GLSL_CAP)
      .replace('#include <clipping_planes_fragment>', [
        '#include <clipping_planes_fragment>',
        /* the cut: nothing in front of the plane */
        'if (vPmm.x < uCut) discard;',
        'float bmhCapF = gl_FrontFacing ? 0.0 : 1.0;',
        /* where this pixel's ray meets the cut plane. It depends only on the ray, so it is smooth
           across every surface, and its derivatives are safe to take here */
        'vec3 bmhRay = vPmm - uCamL;',
        'vec3 bmhPc = uCamL + bmhRay * ((uCut - uCamL.x) / (abs(bmhRay.x) > 1e-4 ? bmhRay.x : 1e-4));',
        'vec2 bmhQ = bmhPc.zy;',
        'float bmhQpx = max(max(length(dFdx(bmhQ)), length(dFdy(bmhQ))), 1e-4);',
        /* the hero's 'photo' surface, unchanged */
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
        'bmhAO *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 0.45, vPmm.y)) * mix(0.72, 1.0, smoothstep(0.1, uThick, vPmm.y)), uGround * (1.0 - bmhBore));',
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
        /* the cut face: zinc within uLayer of the section's edge, titanium deeper; machining lines */
        'float bmhZinc = 1.0, bmhLineK = 0.0, bmhBrH = 0.5, bmhBrD = 0.0, bmhCapTone = 0.0;',
        'if (bmhCapF > 0.5) {',
        '  float d = 1e4;',
        '  if (all(greaterThan(bmhQ, uSecMin - 0.1)) && all(lessThan(bmhQ, uSecMax + 0.1))) d = bmhSegDist(bmhQ);',
        '  bmhZinc = 1.0 - smoothstep(uLayer - 0.5 * bmhQpx, uLayer + 0.5 * bmhQpx, d);',
        '  bmhLineK = uLine * (1.0 - smoothstep(0.6 * bmhQpx, 1.4 * bmhQpx + 0.004, abs(d - uLayer)));',
        /* machining lines: four octaves across the lines (4, 12, 26, 71 per mm), each faded out before
           it drops under about two pixels, their strength wandering along the lines */
        '  float s = dot(bmhQ, vec2(-uBrushDir.y, uBrushDir.x)), t = dot(bmhQ, uBrushDir);',
        '  float w = s + 0.0025 * sin(t * 1.3 + 2.0 * bmhVN(vec3(t * 0.7, s * 3.0, 1.0)));',
        '  float kA = 1.0 - smoothstep(0.03, 0.06, bmhQpx), kB = 1.0 - smoothstep(0.012, 0.024, bmhQpx), kC = 1.0 - smoothstep(0.005, 0.01, bmhQpx);',
        '  float amp = 0.45 + 1.1 * bmhVN(vec3(t * 0.45, s * 6.0, 4.0));',
        '  vec2 n0 = bmhN1(w * 4.0 + 2.0, 41.0), nA = bmhN1(w * 12.0 + 7.0, 5.0), nB = bmhN1(w * 26.0, 11.0), nC = bmhN1(w * 71.0 + 5.0, 23.0);',
        '  bmhBrH = 0.5 + (n0.x - 0.5) * 0.3 + ((nA.x - 0.5) * 0.6 * kA + (nB.x - 0.5) * 0.5 * kB + (nC.x - 0.5) * 0.35 * kC) * amp;',
        '  bmhBrD = n0.y * 4.0 * 0.3 + (nA.y * 12.0 * 0.6 * kA + nB.y * 26.0 * 0.5 * kB + nC.y * 71.0 * 0.35 * kC) * amp;',
        /* a soft mottle, and the face a shade brighter toward its top edge, where it sees the room */
        '  bmhCapTone = (bmhVN(vec3(bmhQ * 1.6, 7.0)) - 0.5) + 0.9 * (bmhQ.y / uThick - 0.5);',
        '}'
      ].join('\n'))
      .replace('#include <alphatest_fragment>', [
        '#include <alphatest_fragment>',
        'diffuseColor.rgb *= (1.0 + bmhMottle * (0.04 + 0.05 * bmhFace) + (bmhG - 0.5) * (0.07 * bmhFace + 0.12 * bmhWall) * bmhGrainK',
        '                   - bmhPit * (0.02 + 0.24 * bmhWall) * uGrain * (1.0 - bmhCone)',
        '                   - bmhBlot * 0.12 * bmhWall * uGrit + bmhStreak * 0.10 * bmhWall * uGrit',
        '                   + bmhLapV * 0.035 * bmhFace * uLap - bmhSmudge * 0.035 * bmhTop * uScuff + bmhScrM * 0.08 * uScuff)',
        '                   * mix(1.0, uWallTone, bmhWall);',
        'if (bmhCapF > 0.5) diffuseColor.rgb = mix(uCoreCol, uZincCol, bmhZinc) * (1.0 + (bmhBrH - 0.5) * 0.16 * uBrush + bmhCapTone * 0.06) * (1.0 - 0.45 * bmhLineK);'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'float bmhEu = bmhWall * (1.0 - bmhBore) * clamp((vPmm.y - (uThick - uEdgeR)) / max(uEdgeR, 1e-3), 0.0, 1.0);',
        'float bmhEa = (0.5 - sin(asin(1.0 - 2.0 * bmhEu) / 3.0)) * 1.5708 * uEdgeCatch;',
        'normal = normalize(cos(bmhEa) * normal + sin(bmhEa) * vVY);',
        'float bmhLipC = bmhCone * smoothstep(uThick - 0.45 * uEdgeR, uThick - 0.005, vPmm.y);',
        'float bmhLipF = bmhTop * (1.0 - smoothstep(uRt, uRt + 0.5 * uEdgeR, bmhHr));',
        'vec3 bmhIn = -normalize(bmhRad.x * vVX + bmhRad.y * vVZ);',
        'normal = normalize(normal + (vVY - normal) * bmhLipC * 0.7 * uEdgeCatch + bmhIn * bmhLipF * 0.6 * uEdgeCatch);',
        'vec2 bmhDG = vec2(dFdx(bmhG), dFdy(bmhG));',
        'vec2 bmhDP = vec2(dFdx(bmhPit), dFdy(bmhPit));',
        'vec2 bmhDB = vec2(dFdx(bmhBlot), dFdy(bmhBlot));',
        'vec2 bmhDL = vec2(dFdx(bmhLapV), dFdy(bmhLapV));',
        'vec2 bmhDS = vec2(dFdx(bmhScr), dFdy(bmhScr));',
        'vec2 bmhDR = vec2(dFdx(bmhRing), dFdy(bmhRing));',
        'normal = bmhPerturb(-vViewPosition, normal, (bmhDG * (0.004 * bmhFace + 0.022 * bmhWall) - bmhDP * 0.012 * bmhWall) * bmhGrainK',
        '  - bmhDB * 0.01 * bmhWall * uGrit + bmhDL * 0.002 * bmhFace * uLap - bmhDS * 0.003 * bmhTop * uScuff + bmhDR * 0.004 * bmhCone, faceDirection);',
        /* the cut face: flat, facing the side that was cut away, tilted only by the machining lines */
        'if (bmhCapF > 0.5) {',
        '  vec3 bmhAcross = normalize(-uBrushDir.y * vVZ + uBrushDir.x * vVY);',
        '  normal = normalize(-vVX - bmhAcross * bmhBrD * 0.0035 * uBrush);',
        '  geometryNormal = -vVX;',
        '}'
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance += bmhCapF * uFaceLift * diffuseColor.rgb;'
      ].join('\n'))
      .replace('#include <encodings_fragment>', [
        '#include <encodings_fragment>',
        '#ifdef BMH_SRGB_OUT',
        'gl_FragColor = LinearTosRGB(gl_FragColor);',
        '#endif'
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'float bmhAOk = mix(bmhAO, 1.0, bmhCapF);',
        'reflectedLight.indirectSpecular *= bmhAOk;',
        'reflectedLight.indirectDiffuse *= bmhAOk;'
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
        'if (bmhCapF > 0.5) roughnessFactor = clamp(uFaceRough + (bmhBrH - 0.5) * 0.1 * uBrush, 0.04, 1.0);'
      ].join('\n'));
  }

  /* ------------------------------------------------------------------ the lens (the hero's)
     The scene renders into a 4x multisampled target, then one pass blurs it as a macro lens would.
     The blur comes from the depth of the plate's plane under each pixel. Focus runs from the near
     holes to the cut face as the cut goes in. */
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
        '  float coc = min(uK * abs(1.0 - (uPlane.x * vUv.x + uPlane.y * vUv.y + uPlane.z)), uMax);',
        '  if (coc < 0.3) { gl_FragColor = vec4(c0.rgb, 1.0); return; }',
        '  vec3 acc = pow(c0.rgb, vec3(2.2));',
        '  for (int i = 1; i < 32; i++) {',
        '    float fi = float(i);',
        '    float a = fi * 2.39996323;',
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

  function toWorld(x, y, z, out) {                       // plate millimetres -> world, at the current yaw
    const yaw = yawG.rotation.y, cy = Math.cos(yaw), sy = Math.sin(yaw);
    return out.set(x * cy + z * sy, y, -x * sy + z * cy);
  }
  const lensM = new THREE.Matrix3(), lensV = new THREE.Vector3(), lensP = new THREE.Vector3();
  function depthAt(x, z) { toWorld(x, THICK / 2, z, lensP).applyMatrix4(camera.matrixWorldInverse); return -lensP.z; }
  function lens(focusX) {
    const u = post.mat.uniforms;
    const farPx = KNOBS.depthOfField * pxPerMm * renderer.getPixelRatio();
    if (!(farPx > 0.05)) { u.uK.value = 0; return; }
    const zf = depthAt(focusX, 0), far = Math.max(depthAt(HALF, -HALF_W), depthAt(HALF, HALF_W));
    const inv = [], e = [];
    [[-40, -40], [40, -40], [0, 40]].forEach(function (q) {
      lensP.set(q[0], THICK / 2, q[1]).applyMatrix4(camera.matrixWorldInverse);
      inv.push(1 / -lensP.z);
      lensP.set(q[0], THICK / 2, q[1]).project(camera);
      e.push(lensP.x * 0.5 + 0.5, lensP.y * 0.5 + 0.5, 1);
    });
    lensM.set(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8]).invert();
    lensV.set(inv[0], inv[1], inv[2]).applyMatrix3(lensM).multiplyScalar(zf);
    u.uPlane.value.copy(lensV);
    u.uK.value = farPx / Math.max(Math.abs(1 - zf / far), 1e-3);
    u.uMax.value = farPx * 1.6 + 0.5;
  }

  /* ------------------------------------------------------------------ the contact shadow (the hero's)
     Rendered from underneath, plate-aligned; the cut discards here too, so the part that is gone
     casts nothing. Re-rendered only when the cut moves. */
  const SH = { w: 96, h: 28, rx: 1024, ry: 300, far: 14 };
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
    uniforms: { uTightH: { value: 0.9 }, uWideH: { value: 9.0 }, uCut: C.uCut },
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
      'uniform float uTightH, uWideH, uCut;',
      'varying vec3 vPmm; varying float vH;',
      'void main() {',
      '  if (vPmm.x < uCut) discard;',
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
      uTight: { value: FINISH.contactShadow }, uWide: { value: FINISH.shadow },
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
    const tight = 0.9, wide = FINISH.shadowSoftMm / (SH.w / SH.rx) / 3.2;
    blur(rtDepth, rtA, tight, 0); blur(rtA, rtTight, 0, tight);
    blur(rtTight, rtA, wide, 0); blur(rtA, rtWide, 0, wide);
    blur(rtWide, rtA, wide * 0.7, 0); blur(rtA, rtWide, 0, wide * 0.7);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearTmp, clearA);
  }

  /* ------------------------------------------------------------------ framing
     The camera orbits at a set height and pushes in along one line. Its start distance fits the
     whole plate; zoom divides it. A lens shift puts the point it looks at (the plate's centre, then
     the cut face's centre) where the layout wants it, so perspective never skews as it moves. */
  let pxPerMm = 10, vw = 0, vh = 0;
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? HALF : -HALF, i & 2 ? THICK : 0, i & 4 ? HALF_W : -HALF_W));
  const v3 = new THREE.Vector3(), aim = new THREE.Vector3(), camDir = new THREE.Vector3(), pA = new THREE.Vector3(), pB = new THREE.Vector3();

  function cutEndX() { return -HALF + KNOBS.cutEndMm; }

  function setCamera(yaw, el, roll, d) {
    camDir.set(0, Math.sin(el), Math.cos(el));
    camera.position.copy(camDir).multiplyScalar(d).add(aim);
    camera.up.set(0, 1, 0);
    camera.lookAt(aim);
    camera.rotateZ(roll);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }
  function bounds(yaw) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    corners.forEach(function (c) {
      v3.set(c.x * cy + c.z * sy, c.y, -c.x * sy + c.z * cy).project(camera);
      x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
    });
    return { w: x1 - x0, h: y1 - y0 };
  }

  /* the room the headline leaves on a phone, as a share of the stage height: [its centre, its height].
     Headline low: between the nav and the headline. Headline high: under it. */
  function roomFree(h) {
    const r = title.getBoundingClientRect(), s0 = stage.getBoundingClientRect().top;
    const top = r.top - s0, bottom = r.bottom - s0;
    if (top > h * 0.5) {
      const a = 72, room = Math.max(top - a, h * 0.3);
      return [(a + room * 0.5) / h, room / h];
    }
    const room = Math.max(h - bottom, h * 0.3);
    return [(bottom + room * 0.5) / h, room / h];
  }

  function place(w, h, e, mode) {
    if (w !== vw || h !== vh) {
      renderer.setSize(w, h, false);
      vw = w; vh = h;
      if (post) {
        const bw = Math.max(1, Math.round(w * renderer.getPixelRatio())), bh = Math.max(1, Math.round(h * renderer.getPixelRatio()));
        post.rt.setSize(bw, bh);
        post.mat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
      }
    }
    const L = mode === 'still' ? KNOBS.still : (w < 900 ? KNOBS.phone : (KNOBS.place === 'beside' ? KNOBS.desktopBeside : KNOBS.desktop));
    const A = KNOBS.cameraStart, B = KNOBS.cameraEnd;
    const yaw = BMH.lerp(A.yawDeg, B.yawDeg, e) * DEG, el = BMH.lerp(A.elevationDeg, B.elevationDeg, e) * DEG;
    const roll = (L.rollDeg || 0) * DEG;
    yawG.rotation.y = yaw;
    groundG.rotation.y = yaw;
    groundG.position.set(FINISH.shadowOffsetMm * 0.5, 0, FINISH.shadowOffsetMm);
    camera.fov = KNOBS.lensDeg;
    camera.aspect = w / h;

    let sy0 = L.start.y, sy1 = L.end.y, room = 1;
    if (sy0 == null || sy1 == null) {
      const r = roomFree(h);
      room = r[1];
      if (sy0 == null) sy0 = r[0];
      if (sy1 == null) sy1 = r[0];
    }

    /* the start distance: the whole plate, at the start pose, L.start.size of the width */
    aim.set(0, THICK / 2, 0);
    const y0 = A.yawDeg * DEG, e0 = A.elevationDeg * DEG;
    setCamera(y0, e0, roll, 200);
    let b = bounds(y0);
    let d0 = 200 * b.w / (L.start.size * 2);
    setCamera(y0, e0, roll, d0);
    b = bounds(y0);
    d0 *= b.w / (L.start.size * 2);
    if (room < 1) {                                      // a phone: never taller than the room allows
      setCamera(y0, e0, roll, d0);
      b = bounds(y0);
      if (b.h / 2 > room * 0.7) d0 *= (b.h / 2) / (room * 0.7);
    }

    /* where the cut face's centre sits on screen before the push, with the plate framed as above */
    setCamera(y0, e0, roll, d0);
    const P = camera.projectionMatrix.elements;
    P[8] -= L.start.x * 2 - 1;
    P[9] -= 1 - sy0 * 2;
    const cy0 = Math.cos(y0), sn0 = Math.sin(y0), fx0 = cutEndX();
    v3.set(fx0 * cy0, THICK / 2, -fx0 * sn0).project(camera);
    const sx0 = v3.x * 0.5 + 0.5, sfy0 = 0.5 - v3.y * 0.5;

    /* now: the camera always looks at the cut face's centre, so the push closes in on it and the
       face never leaves the frame; it travels from where it started to where the layout wants it */
    toWorld(cutEndX(), THICK / 2, 0, aim);
    setCamera(yaw, el, roll, d0 / Math.pow(KNOBS.zoom, e));
    const tx = BMH.lerp(sx0, L.end.x, e), ty = BMH.lerp(sfy0, sy1, e);
    P[8] -= tx * 2 - 1;
    P[9] -= 1 - ty * 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    /* screen pixels per plate millimetre where the lens focuses */
    const fx = BMH.lerp(-HALF * 0.64, cutEndX(), e);
    toWorld(fx, THICK / 2, -0.5, pA).project(camera);
    toWorld(fx, THICK / 2, 0.5, pB).project(camera);
    pxPerMm = Math.hypot((pA.x - pB.x) * w / 2, (pA.y - pB.y) * h / 2);
    return fx;
  }

  /* ------------------------------------------------------------------ state and drawing */
  let ready = false, visible = true, queued = false, held = null, lastP = -1, lastCut = NaN, segN = 0;
  const stats = { drawMs: 0, sliceMs: 0, segments: 0, draws: 0 };

  function timeline(p) {
    const cut = BMH.smooth(KNOBS.cutFrom, KNOBS.cutTo, p);
    const fillLin = BMH.clamp((p - KNOBS.fillFrom) / (KNOBS.fillTo - KNOBS.fillFrom), 0, 1);
    return { cut: cut, fill: BMH.smooth(0, 1, fillLin), fillLin: fillLin };
  }

  function applyKnobs() {
    renderer.toneMappingExposure = KNOBS.exposure;
    C.uCoreCol.value.copy(BMH.color(KNOBS.coreColour));
    C.uZincCol.value.copy(BMH.color(KNOBS.zincColour));
    C.uLine.value = KNOBS.interfaceLine;
    C.uBrush.value = KNOBS.faceBrush;
    C.uBrushDir.value.set(Math.cos(KNOBS.faceBrushDeg * DEG), Math.sin(KNOBS.faceBrushDeg * DEG));
    C.uFaceRough.value = KNOBS.faceRoughness;
    C.uFaceLift.value = KNOBS.faceLight;
    if (metal) { metal.color.copy(baseColour); metal.roughness = baseRough * FINISH.finish; }
    applyHeadline();
    sec.style.setProperty('--pin', reduced ? 0 : KNOBS.scrollScreens);
    measureDeepest();
    lastCut = NaN;
  }

  const camL = new THREE.Vector3();
  function frame(w, h, s, mode) {
    const t0 = performance.now();
    const focusX = place(w, h, s.cut, mode);
    /* the cut */
    const c = BMH.lerp(-HALF - 0.4, cutEndX(), s.cut);
    C.uCut.value = c;
    const layer = KNOBS.layerTrueMm * KNOBS.layerTimes;
    C.uLayer.value = BMH.lerp(layer, Math.max(deepMm, layer) + 0.12, s.fill);
    C.uLine.value = KNOBS.interfaceLine * (1 - BMH.smooth(0.8, 1, s.fill));   // the front's line goes as the grey does
    scene.updateMatrixWorld();
    if (c !== lastCut) {
      const ts = performance.now();
      segN = c > -HALF ? slice(c, segData) : 0;
      if (!segN) { secMin.set(1e4, 1e4); secMax.set(-1e4, -1e4); }
      C.uSegN.value = segN;
      segTex.needsUpdate = true;
      stats.sliceMs = performance.now() - ts;
      stats.segments = segN;
      renderShadow();
      lastCut = c;
    }
    camL.copy(camera.position);
    plateMesh.worldToLocal(camL).multiplyScalar(1000);
    C.uCamL.value.copy(camL);
    if (post) {
      lens(focusX);
      renderer.setRenderTarget(post.rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(post.scene, quadCam);
    } else renderer.render(scene, camera);
    stats.drawMs = performance.now() - t0;
    stats.draws++;
  }

  function draw() {
    queued = false;
    if (!ready || reduced) return;
    const p = held != null ? held : BMH.pinProgress(sec);
    const s = timeline(p);
    setInk(KNOBS.ink === 'jump' ? (s.fillLin >= KNOBS.swapAt && s.fillLin > 0 ? 1 : 0) : s.fill);
    frame(stage.clientWidth || window.innerWidth, stage.clientHeight || window.innerHeight, s, 'stage');
  }
  function request() { if (!queued && visible) { queued = true; requestAnimationFrame(draw); } }

  function readScroll() {
    if (reduced) return;
    const p = BMH.pinProgress(sec);
    if (p !== lastP) { lastP = p; request(); }
  }

  /* Reduced motion: the same scene, drawn twice into the two stills at the end of the cut. */
  const WHITE = new THREE.Color('#FFFFFF');              // --bg: the stills read as two photographs on the pale ground
  function drawStills() {
    renderer.setClearColor(WHITE, 1);
    stills.forEach(function (cv, i) {
      if (!cv) return;
      const r = cv.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
      frame(w, h, { cut: 1, fill: i, fillLin: i }, 'still');
      const dpr = renderer.getPixelRatio();
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const ctx = cv.getContext('2d');
      ctx.drawImage(renderer.domElement, 0, 0, cv.width, cv.height);
    });
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
    buildPost();
    metal = makeMetal(coated);
    plateMesh = new THREE.Mesh(body.geometry, metal);    // v2 as measured: never reshaped
    plateG.add(plateMesh);
    shadowMesh = new THREE.Mesh(plateMesh.geometry, shadowMat);
    shadowMesh.matrixAutoUpdate = false;
    shadowScene.add(shadowMesh);
    prepareSlicing(body.geometry);
    applyKnobs();

    ready = true;
    if (reduced) {
      drawStills();
      let rz = 0;
      window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(drawStills); });
    } else {
      draw();
      BMH.onScroll(readScroll);
      BMH.visible(sec, function (v) { visible = v; if (v) request(); });
      let rz = 0;
      window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(function () { vw = 0; lastCut = NaN; request(); }); });
    }
    BMH.techCutaway.setupMs = Math.round(performance.now() - t0);
    sec.classList.add('is-ready');
    resolveReady();
  }).catch(function (err) {
    if (window.console) console.warn('technology/02-cutaway: plate failed to load', err);
  });

  /* ------------------------------------------------------------------ review hooks */
  BMH.techCutaway = {
    knobs: KNOBS,
    ready: readyP,
    stats: stats,
    renderer: renderer,
    set: function (o) {
      return readyP.then(function () {
        Object.assign(KNOBS, o || {});
        if (o && 'cutEndMm' in o) prepareSlicing(plateMesh.geometry);
        applyKnobs();
        vw = 0;
        if (reduced) drawStills(); else { queued = false; draw(); }
      });
    },
    hold: function (p) { held = p; return readyP.then(function () { queued = false; draw(); }); },
    dpr: function (r) { renderer.setPixelRatio(r); vw = 0; lastCut = NaN; queued = false; draw(); }
  };
})();
