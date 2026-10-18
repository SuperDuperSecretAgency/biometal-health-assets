/* 05 · You make the implant. We coat it.                                        -z1n
   A bare bone plate. As you scroll, zinc particles fly in from off-frame, land, and a coating
   front spreads across the part behind them: first scattered crystals, then a continuous coat,
   the blasted grain filling in behind it. The part ends bright, cool, satin and at rest.

   The plate is v2 (glb-plate-v2-hi, BMH.PLATE_V2), measured from BioMetal's photographs. Both
   states sit on its own finish maps (model-plate-v2-z1n/SPEC.md §5): satin top and seating faces,
   grit-blasted walls and bore, a turned countersink with concentric marks.

   Everything is a pure function of scroll progress, so it plays backwards on scroll-up and stops
   when the scroll stops. WebGL draws only when progress or layout changes, never in a loop.

   Truth limits. The coated end state is the GLB's biometal_coated as it ships: its colour, its
   finish map, its roughness factor. It is the same material the hero draws. The bare state is
   pushed past biometal_uncoated (darker, rougher, a little grit in the normal) so the switch reads;
   the push is recorded in KNOBS.bare. Both stay metalness 1.0 PBR: no overlay, tint or glow. */
(function () {
  'use strict';

  var KNOBS = window.BMH.knobs('coat', {
    /* --- scroll --------------------------------------------------------------------------- */
    scrollScreens: 2.8,     // section height in screens. More = a slower coat.
    coatStart: 0.10,        // where in the pinned scroll the first zinc lands (0..1)
    coatEnd: 0.74,          // where the coat reaches the far end of the plate (0..1)

    /* --- the zinc particles --------------------------------------------------------------- */
    particles: 16000,       // how many, on desktop
    particlesPhone: 9000,   // how many, under 900 px
    flightTime: 0.09,       // share of the scroll each particle spends in the air
    settleTime: 0.03,       // share of the scroll a landed particle stays before it becomes surface
    particlePx: 2.0,        // particle size on screen, in px
    streak: 7.0,            // how far a fast particle stretches, in multiples of its size
    arrive: 2.2,            // how hard they brake before landing (1 = not at all, 3 = a lot)
    reach: 1.35,            // how far away they start, in screen heights (above 1 = off-frame)
    spread: 0.55,           // how wide the stream is (0 = parallel, 1 = very wide)
    curl: 0.08,             // how much the paths bend
    fromUp: 1.0,            // where they come from, in screen terms: up ...
    fromRight: 0.35,        //   ... right ...
    fromFront: 0.30,        //   ... and toward the viewer

    /* --- the coat ------------------------------------------------------------------------- */
    sweep: 1,               // 1 = the coat travels toward plate +X, -1 = the other way
    frontCurve: 0.07,       // how much the front bows (per mm², across the plate)
    frontWobble: 0.9,       // how uneven the front is, in mm
    band: 3.2,              // mm ahead of the front where the first crystals appear
    fillIn: 5.0,            // mm behind the front until the coat has settled and the blasted grain is gone
    grainMm: 0.5,           // crystal grain size, mm ...
    grainPx: 8,             //   ... but never smaller than this on screen, px
    // The two surfaces. Roughness is the GLB's finish map times its own factor, times `rough`.
    //   biometal_uncoated as shipped: #cbced1; faces 0.36, walls 0.54, countersink 0.25
    //   biometal_coated as shipped:   #dadde0; faces 0.22, walls 0.30, countersink 0.17
    // color: null = the GLB's own colour. grit: how much the blasted grain shows as texture.
    bare:   { color: '#a9a9a7', rough: 1.3, grit: 1.0 },
    coated: { color: null,      rough: 1.0, crystals: 0.05 },

    /* --- pose and camera ------------------------------------------------------------------ */
    fov: 22,                // degrees
    elevation: 44,          // camera height above the plate, degrees
    yaw: -24,               // plate angle on desktop, degrees
    yawPhone: -66,          // plate angle under 900 px
    turn: 14,               // degrees the plate turns across the whole section
    tilt: 0,                // degrees the plate tips toward you across the section (moves the highlight)
    fill: 0.94,             // how much of its box the plate fills
    lift: 2.2,              // mm the plate floats above its shadow
    shadow: 0.22,           // shadow strength
    stillPair: true,        // reduced motion: a bare plate behind a coated one (false = the coated plate alone)
    pairGap: 15,            //   ... centre to centre, mm
    keyLight: 1.2,          // the one direct light, for a tight glint on the coat
    softbox: 1.15,          // brightness of the big soft light the top face mirrors
    card: 0.08,             // brightness of the dark card below it (0 = black)
    horizon: 37,            // elevation of the line between light and card, degrees. The coat mirrors
                            //   it as a crisp light/dark edge; machined metal smears it to grey.
  });

  var BMH = window.BMH;
  var section = document.getElementById('s-coat');
  if (!BMH || !section || !window.THREE) return;
  var THREE = window.THREE;
  var stage = section.querySelector('.coat__stage');
  var canvas = section.querySelector('.coat__canvas');
  var partBox = section.querySelector('.coat__part');

  var still = BMH.reduced;
  if (still) section.classList.add('is-still');
  else section.style.height = (KNOBS.scrollScreens * 100) + 'vh';

  var phone = function () { return window.innerWidth < 900; };
  var rad = function (d) { return d * Math.PI / 180; };

  /* ---- the front, shared by JS (particle landing times) and GLSL (the coat) ------------- */
  var FRONT_GLSL = [
    'uniform float uSweep, uCurve, uWob;',
    'float frontS(vec3 p){',
    '  float x = p.x * uSweep;',
    '  return x + uCurve * p.z * p.z + uWob * (0.6 * sin(1.7 * p.z + 0.35 * x) + 0.4 * sin(0.9 * p.z - 0.6 * x + 2.0));',
    '}'
  ].join('\n');
  function frontS(x, z) {
    x *= KNOBS.sweep;
    return x + KNOBS.frontCurve * z * z + KNOBS.frontWobble * (0.6 * Math.sin(1.7 * z + 0.35 * x) + 0.4 * Math.sin(0.9 * z - 0.6 * x + 2.0));
  }
  // the plate, in mm (BMH.PLATE_V2; model-plate-v2-z1n/SPEC.md §2). X long, +Y thickness, Z width.
  var PV = BMH.PLATE_V2 || {
    blob: 'glb-plate-v2-hi', lengthMm: 57.786, widthMm: 9.068, thicknessMm: 1.815,
    holesXmm: [-24.359, -12.124, 12.124, 24.359], boreRmm: 2.165
  };
  var HX = PV.lengthMm / 2, HZ = PV.widthMm / 2, T = PV.thicknessMm;   // 28.893, 4.534, 1.815
  var HOLES = PV.holesXmm, BORE_R = PV.boreRmm, LOBE_R = HZ, BRIDGE_HALF = 5.170 / 2;
  var S_MIN = -HX - KNOBS.frontWobble - 0.5;
  var S_MAX = HX + KNOBS.frontCurve * HZ * HZ + KNOBS.frontWobble + 0.5;
  // the front must clear the far end by the settle distance so the whole part ends settled
  var S_END = S_MAX + KNOBS.fillIn;

  /* ---- scene --------------------------------------------------------------------------- */
  var renderer;
  try { renderer = BMH.renderer(canvas, { exposure: 1.0 }); }
  catch (e) { section.classList.add('no-gl'); section.style.height = ''; return; }
  renderer.setClearColor(0x000000, 0);

  /* The shared studio (BMH.studio's RoomEnvironment) plus a softbox with a dark card under it,
     placed where the plate's top face mirrors them: how a product photographer lights polished
     metal. Smooth metal shows the light/card edge crisp; rough machined metal smears it into grey.
     Same light on both states, so the difference on screen is the surface's own. */
  function panel(env, e0, e1, value) {
    var dist = 9, mid = rad((e0 + e1) / 2), half = rad((e1 - e0) / 2);
    var h = 2 * dist * Math.tan(half), w = 2 * dist * Math.tan(rad(55));
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setScalar(value);
    m.position.set(0, Math.sin(mid) * dist, -Math.cos(mid) * dist);
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  function studio() {
    var env = new THREE.RoomEnvironment();
    panel(env, KNOBS.horizon, KNOBS.horizon + 34, KNOBS.softbox);
    panel(env, KNOBS.horizon - 26, KNOBS.horizon, KNOBS.card);
    var pm = new THREE.PMREMGenerator(renderer);
    var tex = pm.fromScene(env, 0.02).texture;
    pm.dispose();
    return tex;
  }

  var scene = new THREE.Scene();
  scene.environment = studio();
  var camera = new THREE.PerspectiveCamera(KNOBS.fov, 1, 1, 2000);
  var key = new THREE.DirectionalLight(0xffffff, KNOBS.keyLight);
  scene.add(key);

  var rig = new THREE.Group();          // turns with scroll
  scene.add(rig);
  var partSpace = new THREE.Group();    // plate-local millimetres, seating face at y = 0
  partSpace.position.y = -T / 2;
  rig.add(partSpace);

  var U = {                              // uniforms shared by the plate and the particles
    uSweep: { value: KNOBS.sweep }, uCurve: { value: KNOBS.frontCurve }, uWob: { value: KNOBS.frontWobble },
    uFront: { value: S_MIN - 20 },
    uBand: { value: KNOBS.band }, uFill: { value: KNOBS.fillIn },
    uGrain: { value: KNOBS.grainMm },
    // filled from the GLB's two materials once it loads
    uRawCol: { value: new THREE.Color(0.600, 0.615, 0.638) }, uCoatCol: { value: new THREE.Color(0.700, 0.722, 0.748) },
    uRawMap: { value: null }, uCoatMap: { value: null },
    uRawRough: { value: 0.62 * KNOBS.bare.rough }, uCoatRough: { value: 0.34 * KNOBS.coated.rough },
    uGrit: { value: KNOBS.bare.grit }, uCrystal: { value: KNOBS.coated.crystals },
    // particles
    uP: { value: 0 }, uC0: { value: KNOBS.coatStart }, uC1: { value: KNOBS.coatEnd },
    uFlight: { value: KNOBS.flightTime }, uSettle: { value: KNOBS.settleTime },
    uSize: { value: 0.2 }, uStreak: { value: KNOBS.streak }, uReach: { value: 100 }, uArrive: { value: KNOBS.arrive },
    uCurl: { value: KNOBS.curl }, uSrc: { value: new THREE.Matrix3() }
  };

  /* ---- the plate's surface: bare metal -> zinc crystals -> settled coat ------------------
     Both states read the GLB's finish maps: G = roughness / factor, in three bands laid out by
     what each face is (satin faces, blasted walls and bore, turned countersink). */
  var HASH_GLSL = [
    'vec3 hash33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }',
    'float hash13(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }'
  ].join('\n');

  function plateMaterial(bare) {
    var m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 1 });
    m.roughnessMap = U.uRawMap.value;     // switches on the model's UVs; the sample is replaced below
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      if (bare) sh.uniforms.uFront = { value: -1000 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vLN; varying vec3 vAX; varying vec3 vAY; varying vec3 vAZ;')
        .replace('#include <begin_vertex>', [
          '#include <begin_vertex>',
          'vLP = position * 1000.0;',
          'vLN = normal;',
          'vAX = normalMatrix * vec3(1.0, 0.0, 0.0);',
          'vAY = normalMatrix * vec3(0.0, 1.0, 0.0);',
          'vAZ = normalMatrix * vec3(0.0, 0.0, 1.0);'
        ].join('\n'));
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', [
          '#include <common>',
          'varying vec3 vLP; varying vec3 vLN; varying vec3 vAX; varying vec3 vAY; varying vec3 vAZ;',
          'uniform float uFront, uBand, uFill, uGrain, uRawRough, uCoatRough, uGrit, uCrystal;',
          'uniform vec3 uRawCol, uCoatCol;',
          'uniform sampler2D uRawMap, uCoatMap;',
          FRONT_GLSL,
          HASH_GLSL,
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
        ].join('\n'))
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'vec3 lp = vLP; vec3 ln = normalize(vLN);',
          'float dF = uFront - frontS(lp);',                               // mm behind the front
          // grains of zinc: nucleate inside the band ahead of the front, grow, merge
          'vec3 gid; float f1, f2; voro(lp / uGrain, gid, f1, f2);',
          'float gh = hash13(gid + 17.0);',
          'float birth = -uBand * gh;',
          'float R = (dF - birth) * (1.1 / max(uGrain * 2.2, 0.3));',
          'float aa = fwidth(f1) * 1.2 + 0.02;',
          'float isl = (1.0 - smoothstep(R - aa, R + aa, f1)) * step(birth, dF);',
          'float cov = max(isl, smoothstep(0.0, 0.9, dF));',
          'float fresh = cov * (1.0 - smoothstep(0.0, uFill, dF));',          // young coat, still crystalline
          'float bnd = 1.0 - smoothstep(0.0, 0.10 + aa, f2 - f1);',        // grain boundaries
          // the real finishes, from the model
          'float gRaw = texture2D(uRawMap, vUv).g;',
          'float gCoat = texture2D(uCoatMap, vUv).g;',
          'vec3 coatC = uCoatCol * (1.0 - bnd * fresh * 0.22) * (1.0 + (hash13(gid + 5.0) - 0.5) * 0.06 * fresh);',
          'diffuseColor.rgb = mix(uRawCol, coatC, cov);',
          'float rRough = uRawRough * gRaw;',
          'float cRough = uCoatRough * gCoat + ((hash13(gid + 9.0) - 0.5) * 0.10 + bnd * 0.30 + 0.08) * fresh;'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', [
          '#include <roughnessmap_fragment>',
          'roughnessFactor = clamp(mix(rRough, cRough, cov), 0.04, 1.0);'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          '{',
          // a crystal tilt per young zinc grain; the settled coat is the model's surface, untouched
          '  vec3 nL = ln;',
          '  vec3 t1 = normalize(abs(nL.y) < 0.9 ? cross(nL, vec3(0.0, 1.0, 0.0)) : cross(nL, vec3(1.0, 0.0, 0.0)));',
          '  vec3 t2 = cross(nL, t1);',
          '  vec3 gt = hash33(gid + 3.1) - 0.5;',
          '  nL += (t1 * gt.x + t2 * gt.y) * uCrystal * fresh;',
          '  normal = normalize(nL.x * vAX + nL.y * vAY + nL.z * vAZ);',
          // the bare metal's blasted grain as texture: the finish map read as height (three.js
          // bumpMap method), skipped across UV seams, gone under the coat
          '  vec2 dH = clamp(vec2(dFdx(gRaw), dFdy(gRaw)), -0.12, 0.12) * uGrit * 0.05 * (1.0 - cov);',
          '  dH *= 1.0 - step(0.06, max(fwidth(vUv.x), fwidth(vUv.y)));',
          '  vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);',
          '  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);',
          '  float det = dot(sx, r1);',
          '  normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));',
          '}'
        ].join('\n'));
    };
    return m;
  }

  /* ---- the zinc: small metal crystals, instanced, moved entirely in the vertex shader ---- */
  function zincMaterial() {
    var m = new THREE.MeshStandardMaterial({ color: new THREE.Color('#eef2f6'), metalness: 1, roughness: 0.34 });
    m.onBeforeCompile = function (sh) {
      for (var k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', [
          '#include <common>',
          'attribute vec3 aTarget; attribute vec3 aNorm; attribute vec3 aCone; attribute vec4 aSeed; attribute float aFrac;',
          'uniform float uP, uC0, uC1, uFlight, uSettle, uSize, uStreak, uReach, uCurl, uArrive;',
          'uniform mat3 uSrc;',
          'mat3 basisY(vec3 y, float spin){',
          '  vec3 up = abs(y.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);',
          '  vec3 x = normalize(cross(up, y)); vec3 z = cross(x, y);',
          '  float c = cos(spin), s = sin(spin);',
          '  return mat3(x * c + z * s, y, z * c - x * s);',
          '}'
        ].join('\n'))
        .replace('#include <beginnormal_vertex>', [
          'float tLand = uC0 + (uC1 - uC0) * aFrac;',
          'float tf = (uP - (tLand - uFlight)) / uFlight;',              // 0..1 in the air
          'float tl = (uP - tLand) / uSettle;',                           // 0..1 after landing
          'float alive = step(0.0, tf) * (1.0 - step(1.0, tl));',
          'float t = clamp(tf, 0.0, 1.0);',
          'float s = 1.0 - pow(1.0 - t, uArrive);',                        // fast, then settling
          'vec3 from = uSrc * aCone * uReach * (0.75 + 0.5 * aSeed.z);',
          'vec3 side = normalize(cross(from, vec3(0.0, 1.0, 0.0)) + 1e-4);',
          'vec3 pPos = aTarget + from * (1.0 - s) + side * uCurl * uReach * (aSeed.w - 0.5) * sin(3.14159 * s) * (1.0 - s);',
          'float landed = step(1.0, tf);',
          'float st = clamp(tl, 0.0, 1.0);',
          'vec3 axis = normalize(mix(-normalize(from), aNorm, smoothstep(0.8, 1.0, t)));',
          'float sz = uSize * (0.55 + 0.9 * aSeed.x);',
          'float fast = pow(1.0 - t, uArrive - 1.0);',
          'vec3 sc = vec3(1.0 - 0.45 * fast, 1.0 + uStreak * fast, 1.0 - 0.45 * fast);',
          'sc.y = mix(sc.y, 0.22, landed * smoothstep(0.0, 0.2, st));',        // flattens onto the surface
          'sc.xz *= 1.0 + 0.35 * landed * smoothstep(0.0, 0.3, st);',
          'sc *= 1.0 - smoothstep(0.15, 1.0, st);',                             // and becomes surface
          'sc *= alive;',
          'pPos += aNorm * 0.03 * landed;',
          'mat3 B = basisY(axis, aSeed.y * 6.2831853);',
          'vec3 objectNormal = normalize(B * (normal / max(sc, vec3(1e-3))));'
        ].join('\n'))
        .replace('#include <begin_vertex>', 'vec3 transformed = pPos + B * (position * sc * sz);');
    };
    return m;
  }

  /* ---- a soft shadow under the plate --------------------------------------------------- */
  // v2's own outline (lobes, bridge) with light through the four bores, blurred via shadowBlur
  // so it works in every browser
  var SH_W = 72, SH_H = 24, SH_PX = 8;
  function shadowTexture() {
    var c = document.createElement('canvas'); c.width = SH_W * SH_PX; c.height = SH_H * SH_PX;
    var g = c.getContext('2d');
    var off = 4000, cx = c.width / 2, cy = c.height / 2, k = SH_PX;
    var x0 = HOLES[0], x1 = HOLES[HOLES.length - 1];
    g.shadowColor = '#000'; g.shadowBlur = 2.2 * k; g.shadowOffsetX = off;
    g.beginPath();
    HOLES.forEach(function (x) { g.moveTo(cx + (x + LOBE_R) * k - off, cy); g.arc(cx + x * k - off, cy, LOBE_R * k, 0, Math.PI * 2); });
    g.rect(cx + x0 * k - off, cy - BRIDGE_HALF * k, (x1 - x0) * k, 2 * BRIDGE_HALF * k);
    g.fill('nonzero');
    g.globalCompositeOperation = 'destination-out';
    g.shadowBlur = 1.4 * k;
    g.beginPath();
    HOLES.forEach(function (x) { g.moveTo(cx + (x + BORE_R) * k - off, cy); g.arc(cx + x * k - off, cy, BORE_R * k, 0, Math.PI * 2); });
    g.fill();
    return new THREE.CanvasTexture(c);
  }

  var plate = null, zinc = null, shadow = null, ready = false;
  var pair = still && KNOBS.stillPair;
  if (pair) canvas.setAttribute('aria-label', 'Two metal bone plates: a bare one behind, and the same plate coated in front.');
  var N = phone() ? KNOBS.particlesPhone : KNOBS.particles;

  function buildZinc(geoMetres) {
    var soup = geoMetres.index ? geoMetres.toNonIndexed() : geoMetres;
    var tmp = new THREE.Mesh(soup);
    var sampler = new THREE.MeshSurfaceSampler(tmp).build();
    var p = new THREE.Vector3(), n = new THREE.Vector3();
    var aTarget = new Float32Array(N * 3), aNorm = new Float32Array(N * 3), aCone = new Float32Array(N * 3);
    var aSeed = new Float32Array(N * 4), aFrac = new Float32Array(N);
    var i = 0, guard = 0;
    while (i < N && guard++ < N * 40) {
      sampler.sample(p, n);
      if (n.y < 0.5) continue;                     // land on the faces the stream can reach
      p.multiplyScalar(1000);
      aTarget.set([p.x, p.y, p.z], i * 3);
      aNorm.set([n.x, n.y, n.z], i * 3);
      // a direction in a cone around +Z of the source frame
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * KNOBS.spread;
      var cx = Math.cos(a) * r, cy = Math.sin(a) * r, len = Math.sqrt(cx * cx + cy * cy + 1);
      aCone.set([cx / len, cy / len, 1 / len], i * 3);
      aSeed.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      // it lands as the front reaches it, up to one band early: those are the first crystals
      var s = frontS(p.x, p.z) - KNOBS.band * Math.pow(Math.random(), 0.7);
      aFrac[i] = (s - S_MIN) / (S_END - S_MIN);
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
    g.setAttribute('aFrac', new THREE.InstancedBufferAttribute(aFrac, 1));
    g.instanceCount = N;
    var mesh = new THREE.Mesh(g, zincMaterial());
    mesh.frustumCulled = false;
    return mesh;
  }

  BMH.glb(PV.blob).then(function (gltf) {
    // v2 as it ships: never BMH.plateReshape (SPEC.md §6). Primitive 0 is the plate in
    // biometal_uncoated; biometal_coated rides on a buried quad, so it is read, not drawn.
    var src = null, mats = {};
    gltf.scene.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      mats[o.material.name] = o.material;
      if (o.material.name === 'biometal_uncoated') src = o;
    });
    var raw = mats.biometal_uncoated, coat = mats.biometal_coated;
    if (!src || !raw || !coat || !raw.roughnessMap || !coat.roughnessMap) return;
    U.uRawMap.value = raw.roughnessMap;
    U.uCoatMap.value = coat.roughnessMap;
    U.uRawRough.value = raw.roughness * KNOBS.bare.rough;
    U.uCoatRough.value = coat.roughness * KNOBS.coated.rough;
    // knob colours are sRGB hex, as a designer reads them; the GLB's factors are already linear
    var lin = function (hex) { return new THREE.Color(hex).convertSRGBToLinear(); };
    U.uRawCol.value = KNOBS.bare.color ? lin(KNOBS.bare.color) : raw.color.clone();
    U.uCoatCol.value = KNOBS.coated.color ? lin(KNOBS.coated.color) : coat.color.clone();
    [raw.roughnessMap, coat.roughnessMap].forEach(function (t) {
      t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.needsUpdate = true;
    });

    plate = new THREE.Mesh(src.geometry, plateMaterial());
    plate.scale.setScalar(1000);
    partSpace.add(plate);

    zinc = buildZinc(src.geometry);
    partSpace.add(zinc);

    var shTex = shadowTexture();
    function makeShadow() {
      var sh = new THREE.Mesh(new THREE.PlaneGeometry(SH_W, SH_H), new THREE.MeshBasicMaterial({
        map: shTex, color: 0x0a1f3a, transparent: true, opacity: KNOBS.shadow, depthWrite: false
      }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = -KNOBS.lift;
      return sh;
    }
    shadow = makeShadow();
    partSpace.add(shadow);

    if (pair) {                                    // reduced motion: the same plate, bare, behind
      partSpace.position.set(1.5, -T / 2, KNOBS.pairGap / 2);
      var bareSpace = new THREE.Group();
      bareSpace.position.set(-1.5, -T / 2, -KNOBS.pairGap / 2);
      var bare = new THREE.Mesh(src.geometry, plateMaterial(true));
      bare.scale.setScalar(1000);
      bareSpace.add(bare);
      bareSpace.add(makeShadow());
      rig.add(bareSpace);
    }

    ready = true;
    BMH.coat.parts = { plate: plate, zinc: zinc, shadow: shadow };
    layout();
    draw(true);
  }).catch(function () { section.classList.add('no-gl'); section.style.height = ''; });

  /* ---- framing: fit the plate into .coat__part ----------------------------------------- */
  var W = 1, H = 1, pxPerMm = 10, lastP = -1, dirty = true, onScreen = true;
  var camRight = new THREE.Vector3(), camUp = new THREE.Vector3(), camBack = new THREE.Vector3();

  function baseYaw() { return rad(phone() ? KNOBS.yawPhone : KNOBS.yaw); }

  function layout() {
    var sr = stage.getBoundingClientRect();
    W = Math.max(1, sr.width); H = Math.max(1, sr.height);
    renderer.setSize(W, H, false);
    var br = partBox.getBoundingClientRect();
    var box = { x: br.left - sr.left, y: br.top - sr.top, w: Math.max(40, br.width), h: Math.max(40, br.height) };

    camera.aspect = W / H;
    camera.fov = KNOBS.fov;
    var el = rad(KNOBS.elevation);
    var dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
    // hull of the plate at both ends of its turn (or at rest, when still), in world space
    var local = [];
    var zs = pair ? [KNOBS.pairGap / 2, -KNOBS.pairGap / 2] : [0];
    zs.forEach(function (z0, j) {
      var x0 = pair ? (j ? -1.5 : 1.5) : 0;
      for (var sx = -1; sx <= 1; sx += 2) for (var sz = -1; sz <= 1; sz += 2) for (var sy = -1; sy <= 1; sy += 2)
        local.push(new THREE.Vector3(x0 + sx * (HX + 0.6), sy * T / 2, z0 + sz * (HZ + 0.6)));
    });
    var pts = [], yaws = still ? [0.5] : [0, 1];
    yaws.forEach(function (q) {
      rig.rotation.set(0, baseYaw() + rad(KNOBS.turn) * (q - 0.5), 0);
      rig.updateMatrixWorld(true);
      local.forEach(function (lp) { pts.push(lp.clone().applyMatrix4(rig.matrixWorld)); });
    });
    var v = new THREE.Vector3(), d = 150;
    for (var it = 0; it < 3; it++) {
      camera.position.copy(dir).multiplyScalar(d);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      for (var i = 0; i < pts.length; i++) {
        v.copy(pts[i]).project(camera);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
      var wPx = (maxX - minX) / 2 * W, hPx = (maxY - minY) / 2 * H;
      var k = Math.min(box.w / wPx, box.h / hPx) * KNOBS.fill;
      d = d / k;
    }
    camera.position.copy(dir).multiplyScalar(d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    // centre of the projected hull -> centre of the box (an off-axis shift, no perspective change)
    minX = 1e9; maxX = -1e9; minY = 1e9; maxY = -1e9;
    for (i = 0; i < pts.length; i++) {
      v.copy(pts[i]).project(camera);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    var tx = (box.x + box.w / 2) / W * 2 - 1, ty = 1 - (box.y + box.h / 2) / H * 2;
    camera.projectionMatrix.elements[8] -= (tx - cx);
    camera.projectionMatrix.elements[9] -= (ty - cy);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    pxPerMm = H / (2 * d * Math.tan(rad(KNOBS.fov) / 2));
    U.uSize.value = 0.5 * KNOBS.particlePx / pxPerMm;
    U.uGrain.value = Math.max(KNOBS.grainMm, KNOBS.grainPx / pxPerMm);
    U.uReach.value = KNOBS.reach * (H / pxPerMm);

    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    camBack.setFromMatrixColumn(camera.matrixWorld, 2);
    key.position.copy(camUp).multiplyScalar(0.8).add(camBack.clone().multiplyScalar(0.35)).add(camRight.clone().multiplyScalar(-0.6)).normalize();
    dirty = true;
  }

  /* ---- one frame, a pure function of progress ------------------------------------------ */
  var m3 = new THREE.Matrix3(), m4 = new THREE.Matrix4(), srcZ = new THREE.Vector3(), srcX = new THREE.Vector3(), srcY = new THREE.Vector3();

  function progress() {
    if (still) return 1;
    return BMH.pinProgress(section);
  }

  function draw(force) {
    if (!ready) return;
    var p = progress();
    if (!force && !dirty && Math.abs(p - lastP) < 1e-5) return;
    lastP = p; dirty = false;

    // the front: from before the near end to past the far end, across the coat window
    var q = BMH.clamp((p - KNOBS.coatStart) / (KNOBS.coatEnd - KNOBS.coatStart), 0, 1);
    U.uFront.value = BMH.lerp(S_MIN, S_END, q);
    if (p <= KNOBS.coatStart - 1e-4) U.uFront.value = S_MIN - 20;
    U.uP.value = p;

    rig.rotation.y = baseYaw() + rad(KNOBS.turn) * (p - 0.5);
    rig.rotation.x = rad(KNOBS.tilt) * (p - 0.5);
    rig.updateMatrixWorld(true);

    // where the zinc comes from: fixed to the screen, expressed in plate space
    srcZ.set(0, 0, 0).addScaledVector(camUp, KNOBS.fromUp).addScaledVector(camRight, KNOBS.fromRight).addScaledVector(camBack, KNOBS.fromFront).normalize();
    srcX.crossVectors(camUp, srcZ).normalize();
    srcY.crossVectors(srcZ, srcX).normalize();
    m4.makeBasis(srcX, srcY, srcZ);
    m3.setFromMatrix4(m4);
    var inv = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(partSpace.matrixWorld).invert());
    U.uSrc.value.multiplyMatrices(inv, m3);

    renderer.render(scene, camera);
  }

  /* ---- wiring -------------------------------------------------------------------------- */
  BMH.visible(section, function (v) { onScreen = v; if (v) draw(true); });
  BMH.onScroll(function () { if (onScreen) draw(false); });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (ready) { layout(); draw(true); } }, 60);
  });

  BMH.coat = { knobs: KNOBS, draw: function () { if (ready) { layout(); draw(true); } } };
})();
