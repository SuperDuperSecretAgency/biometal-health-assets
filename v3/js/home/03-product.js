/* 03 · We make the implants. Plates and screws. — the set assembles as it scrolls past.           -z1n

   v3 (4 Nov 2026, PLAN.md §3.1 03, WP2). One four-hole plate (plate-v2-hi.glb, the measured part, drawn as it
   comes) level on the page's white seamless with its contact shadow, and four screws (screw.glb) standing on
   their axes 16 mm above their holes. As the section scrolls past, the screws come down, the outer pair first,
   then the inner, and seat: the head's rim bears on the 125° countersink cone (the close band's seat maths).
   The camera opens low and side-on (yaw 8°, elevation 6°), a pose the hero never uses, and rises to 24° while
   turning to 22° as they seat, so the heads finish in their countersinks. Nothing turns (a screw in an
   unthreaded countersink does not turn). Nothing floats. Nothing idles. Scrolling back reverses it.

   The engine is the Webflow-fixed hero's (webflow-v2-z1n/build/home/01-hero/embed.src.js, 17 Oct): the same
   studio, the plate's photo finish, the lens (16°), the contact shadow rendered from underneath, and the
   entrance, minus the dissolve and its grains. No depth of field (dof 0): no post pass, the canvas is
   multisampled. The scene builds in an idle period after the hero's entrance (BMH.idle), compiles off screen,
   and draws only when the assembly's progress, the entrance or the size changed. No layout reads in the scroll
   tick: the part slot is measured on resize (measure), the progress comes through BMH.passProgress (cached boxes).

   Drives (knob drive):
     'pass'  (default, F) each frame is a pure function of the section's trip through the viewport: progress 0 is
             the section's top at the viewport's foot, 1 its foot at the viewport's top; the assembly runs from
             passFrom to passTo, so it finishes before the section is centred, reverses on the way up and stops
             when the scroll stops. No pin: the section is one screen.
     'time'  once in view, on the close band's state machine: holdMs still, then assembleMs; replays on return.
     'pin'   the stage sticks for pinScreens screens and the assembly runs over the pin (pinFrom..pinTo).
   Assembly (knob assemble): 'seat' the screws come down and seat; 'beside' the flat lay (screws lying in front
   of the plate, nothing to assemble); 'photo' the live site's photograph in the slot with one pass of light on
   scroll (also the no-WebGL fallback). The screw look gate (NOTES.md) sets the default.
   The screw look (knob screwLook): 'pass1' the GLB's own matte material with one look pass toward
   swanson-screws-101.jpg (grit-blasted head, satin thread, the notches in shade); 'glb' the material as it comes.
   Never the plate's satin finish on a screw. ref: true shows the photograph in the slot (board v3-screw-look).

   Review hooks: BMH.product.set({...KNOBS}), BMH.product.hold(a) pins the assembly at a in 0..1 (null follows
   the drive again), BMH.product.replay() the entrance, BMH.product.ready a promise, BMH.product.stats the draw
   times (showStats() writes them on the page, for check renders only). */
(function () {
  'use strict';
  const sec = document.getElementById('s-product');
  if (!sec) return;
  const BMH = window.BMH, THREE = window.THREE;

  /* ------------------------------------------------------------------ the knobs */
  const KNOBS = BMH ? BMH.knobs('product', {
    /* The drive */
    drive: 'pass',            // 'pass' (scrubbed as it passes, no pin) · 'time' (once in view) · 'pin'
    passFrom: 0.2,            // 'pass': the assembly starts at this share of the section's trip through the viewport
    passTo: 0.56,             //         and is finished here (0.5: the section fills the viewport). The plan's 0.15 / 0.55
                              //         ran below the fold at 1440 (the set sits in the lower half of the stage): at 0.2 the
                              //         raised heads are just rising over the viewport's foot; at 0.56 the seated set sits
                              //         a little above centre
    pinScreens: 1.6,          // 'pin': screens of scroll the stage holds (0.6 of that on a phone)
    pinFrom: 0.08, pinTo: 0.85,
    holdMs: 500,              // 'time': still for this long once the section is in view,
    assembleMs: 2000,         //         then the whole assembly over this long; replays each time it returns
    hold: null,               // 0..1 freezes the assembly there (boards); null follows the drive

    /* What is shown. The screw look gate (NOTES.md, 4 Nov): the 3D screws did not read as the real matte,
       grit-blasted screws beside the photograph at this size (right form and finish, the plate's tone), so the
       photograph is the default and the assembly is the knob. */
    assemble: 'photo',        // 'photo' (the photograph, with the sheen) · 'seat' (the assembly) · 'beside' (the flat lay)
    copy: 'a',                // 'a' We make the implants. [Plates and screws.] · 'b' [We make the implants.] Plates and screws.
    /* The lead. The plan's line (the HTML's) was written for the set: one plate, four screws. The photograph
       shows two plates and two screws, so it takes its own line (the WP2 review). 'auto' follows what is in the
       slot; 'set' and 'photo' force one. The words are knobs too, so a board can try another. */
    lead: 'auto',             // 'auto' · 'set' (leadSet) · 'photo' (leadPhoto)
    leadSet: 'One zinc alloy plate. Four screws. Distributors are lining up.',
    leadPhoto: 'Using our patented zinc alloy. Distributors are lining up.',   // Andrew, 5 Nov 2026
    ref: false,               // true: the reference photograph (swanson-screws-101) in the slot, cropped to the set
    phonePhoto: 'group',      // phones, with the photograph: 'group' (the photo and the copy together, centred in the
                              //   one-screen stage) · 'foot' (the Webflow pose: the copy at the foot, the photo in the
                              //   room above) · 'tight' (no stage room: the section as tall as the photo and the copy)
    rest: 'ground',           // 'ground' · 'float' (the plate floatMm over its shadow, shanks visible)
    floatMm: 11,
    spin: 'none',             // 'none' · 'seat' (a quarter turn as it seats) · 'thread' (the real 1.35 mm pitch)
    screw: 'web',             // 'web' screw.glb · 'hi' screw-hi.glb (+1.1 MB)
    screwLook: 'pass1',       // 'pass1' (the look pass) · 'glb' (the GLB's own matte material)

    /* The descent */
    liftMm: 16,               // how high above its seat each screw starts
    stagger: 0.14,            // the inner pair starts this share of the assembly after the outer pair
    linearMm: 0.6,            // the last of each descent is linear, so the seat reads as a stop
    linearShare: 0.2,         // over this share of the descent
    descentEase: 2,           // the ease-out's power before the linear tail: 2 spreads the descent over the pass, 3 drops it early
    cameraStart: [8, 6],      // [yaw, elevation] degrees, screws raised. D3's low side-on: [16, 74]
    cameraEnd: [22, 24],      // as they seat

    /* The entrance, once, when the section first comes into view */
    entrance: true,
    entranceMs: 1400, entranceEase: 2.4, entranceTurnDeg: 12, entranceLiftMm: 1.6, entranceTiltDeg: 4,

    /* The look. The plate: the hero's photo finish (its knobs, same meaning). dof 0: no lens pass. */
    dof: 0,
    finish: 1.0, grain: 1.0, exposure: 1.0, metalColour: null,
    shadow: 0.55, contactShadow: 0.62, shadowSoftMm: 2.2, shadowOffsetMm: 0.7,
    scuffs: 0.5, machiningMarks: 0.6, turningRings: 0.7, wallGrit: 1.0, wallTone: 0.86,
    coneRoughness: 0.22, edgeRadiusMm: 0.3, edgeCatch: 0.8,
    /* The screw look pass ('pass1'), toward swanson-screws-101.jpg at the beat's on-screen size */
    screwTone: 0.9,           // the GLB's matte base, darkened: the photographs' screws sit well under the plate
    screwHeadRough: 0.52,     // the grit-blasted head (top, notch floors and walls, rim)
    screwShankRough: 0.9,     // scales the GLB's thread roughness (0.43 x its tool-mark map): satin flanks
    screwGrit: 1.0,           // the head's blasted grain and pits, 0 smooth to 1.5 coarse
    screwNotchAO: 0.55,       // how dark the drive notches read at their floor

    /* The camera and the framing. desktop: plate centre and width as shares of the part slot. phone (BMH.PHONE_MQ):
       the Webflow hero pose: centred across the stage, 0.84 of its width, in the room above the copy (roomAt down
       it), capped at fill of the room and maxH of the stage. */
    lensDeg: 16,
    pose: {
      desktop: { x: 0.5, y: 0.5, size: 0.86, rollDeg: 0 },
      phone: { x: 0.5, size: 0.84, rollDeg: 0, roomAt: 0.5, fill: 0.72, maxH: 0.32 }
    }
  }) : null;

  const stage = sec.querySelector('.product__stage');
  const copyEl = sec.querySelector('.product__copy');
  const part = sec.querySelector('.product__part');
  let canvas = sec.querySelector('.product__canvas');
  const sheen = sec.querySelector('.product__sheen');
  if (!KNOBS || !stage || !copyEl || !part) { sec.classList.add('is-photo'); return; }

  const reduced = !!BMH.reduced;
  const PHONE = window.matchMedia(BMH.PHONE_MQ || '(max-width: 900px)');
  const DEG = Math.PI / 180;

  /* the copy: knob 'b' moves the highlight onto the first sentence */
  if (KNOBS.copy === 'b') {
    const h2 = copyEl.querySelector('.h2');
    if (h2) h2.innerHTML = '<span class="hl">We make the implants.</span> Plates and screws.';
  }

  /* the lead follows what is in the slot (knob lead): the photograph's line is the HTML's (the default), the set's
     is swapped in before its first frame; ref (a review state) keeps the HTML's */
  function setLead(picture) {
    const which = KNOBS.lead === 'auto' ? picture : KNOBS.lead;
    const text = which === 'photo' ? KNOBS.leadPhoto : KNOBS.leadSet;
    const leadEl = copyEl.querySelector('.lead');
    if (leadEl && text && leadEl.textContent !== text) leadEl.textContent = text;
  }

  /* ------------------------------------------------------------------ the photograph (assemble 'photo', no WebGL)
     The live site's two plates and two screws, with one pass of light across the metal as the section passes
     (the Partner Program hero's sheen, driven by the same trip through the viewport as the assembly). */
  function photograph() {
    setLead('photo');
    sec.classList.add('is-photo');
    if (KNOBS.phonePhoto === 'foot') sec.classList.add('is-foot');
    else if (KNOBS.phonePhoto === 'tight') sec.classList.add('is-tight');
    sec.style.setProperty('--pin', 0);
    if (!sheen || reduced) return;
    sheen.style.setProperty('--sheen', '0.5');
    BMH.onScroll(function () {
      const p = BMH.clamp((BMH.passProgress(sec) - KNOBS.passFrom) / (KNOBS.passTo - KNOBS.passFrom), 0, 1);
      const e = p * p * (3 - 2 * p);
      sheen.style.opacity = p > 0 && p < 1 ? '1' : '0';
      sheen.style.backgroundPosition = (100 - 100 * e) + '% 0';
    });
  }
  if (KNOBS.ref) { sec.classList.add('is-ref'); sec.style.setProperty('--pin', 0); return; }
  if (KNOBS.assemble === 'photo' || !THREE || !canvas) { photograph(); return; }
  setLead('set');

  /* ------------------------------------------------------------------ the parts, in millimetres
     Plate: BMH.PLATE_V2 (model-plate-v2-z1n/SPEC.md). GLB axes: length along X, seating face at Y = 0, width
     along Z. Screw: model-screw-z1n/SPEC.md §2-3 (tip at Y = 0, head top at 10.5, head r 2.8). Its underside is
     flatter than the plate's 125° cone, so it bears on the cone at its outer rim, 1.25 mm below the head's top. */
  const PV = BMH.PLATE_V2 || {};
  const HALF = (PV.lengthMm || 57.786) / 2;
  const HALF_W = (PV.widthMm || 9.068) / 2;
  const THICK = PV.thicknessMm || 1.815;
  const HOLES = PV.holesXmm || [-24.359, -12.124, 12.124, 24.359];
  const CONE_Y = PV.coneBottomYmm || 1.280;
  const CONE_R = PV.coneTopRmm || 3.194;
  const BORE_R = PV.boreRmm || 2.165;
  const SCREW = { lengthMm: 10.5, headRmm: 2.8, rimBelowTopMm: 1.25, headHmm: 1.55, notchFloorMm: 9.5, threadRmm: 2.0, pitchMm: 1.35 };
  const SEAT_Y = CONE_Y + (SCREW.headRmm - BORE_R) * (THICK - CONE_Y) / (CONE_R - BORE_R);   // 1.610: the rim on the cone
  const TIP_Y = SEAT_Y + SCREW.rimBelowTopMm - SCREW.lengthMm;                                // -7.640: head top at 2.860
  const ORDER = [0, 0, 0, 0]; ORDER[1] = ORDER[2] = 1;                                         // outer pair first, then inner

  /* ------------------------------------------------------------------ renderer */
  let renderer;
  try { renderer = BMH.renderer(canvas, { alpha: false, exposure: KNOBS.exposure, antialias: true }); }
  catch (e) { photograph(); return; }
  renderer.setClearColor(0xffffff, 1);
  renderer.localClippingEnabled = true;     // the shanks end at the ground: nothing draws below the seamless

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(KNOBS.lensDeg, 1, 5, 4000);

  /* Scene graph: yaw (the set's turn on the ground) > lift (entrance height, roll; the float) > the plate (plateG,
     metres to millimetres) and the four screw pivots. The shadow's ground follows the yaw but not the lift. */
  const yawG = new THREE.Group(), liftG = new THREE.Group(), plateG = new THREE.Group();
  plateG.scale.setScalar(1000);
  scene.add(yawG); yawG.add(liftG); liftG.add(plateG);
  const groundG = new THREE.Group();
  scene.add(groundG);

  /* ------------------------------------------------------------------ the studio: the hero's photo room */
  const STUDIO = {
    floor: 0.64, horizon: 0.9, sweep: 0.9, zenith: 0.5, front: 0.2,
    tint: [0.955, 0.95, 1.04], soft: 0.4,
    boxes: [
      [60, 40, [0, 34, 26], 2.4],    // big softbox above the camera: the rolled edges' bright line
      [60, 60, [0, 44, -4], 2.6],    // overhead: the far side of each cone, the screw heads' top faces
      [34, 22, [22, 20, -26], 1.6],  // key behind right: the sheen along the top face
      [14, 34, [-34, 14, 6], 1.1],   // strip, left
      [10, 28, [34, 10, 14], 0.7]    // strip, right
    ]
  };
  let envTex = null;
  function buildStudio() {
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
    if (envTex) envTex.dispose();
    envTex = tex;
    [metal, screwMat].forEach(function (m) { if (m) { m.envMap = envTex; m.needsUpdate = true; } });
  }

  /* ------------------------------------------------------------------ shared GLSL: noise and a screen-space bump */
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
    '}',
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

  /* ------------------------------------------------------------------ the plate's metal: the hero's photo finish
     The GLB's satin material (its second one), cloned, is the base: colour, roughness ceiling and finish map
     (satin faces, grit-blasted walls and bore, turned cones). Layered on, exactly as the hero does: occlusion in
     the bore, cone and along the foot of the wall; blasted grain and dark blotches on the walls; lapping marks,
     smudges and scratches on the faces; turning rings in the countersinks; the rolled edge and the countersink lip
     that catch the softbox. No dissolve. Every detail fades before it drops under about two pixels. */
  const G = {
    uGrain: { value: KNOBS.grain },
    uThick: { value: THICK }, uYc: { value: CONE_Y }, uRt: { value: CONE_R }, uRb: { value: BORE_R },
    uGround: { value: 1 }
  };
  const P = {
    uScuff: { value: KNOBS.scuffs }, uLap: { value: KNOBS.machiningMarks }, uRings: { value: KNOBS.turningRings },
    uGrit: { value: KNOBS.wallGrit }, uWallTone: { value: KNOBS.wallTone }, uConeRough: { value: KNOBS.coneRoughness },
    uEdgeR: { value: KNOBS.edgeRadiusMm }, uEdgeCatch: { value: KNOBS.edgeCatch }
  };
  const HMID = [(HOLES[0] + HOLES[1]) / 2, (HOLES[1] + HOLES[2]) / 2, (HOLES[2] + HOLES[3]) / 2];
  const f3 = function (x) { return x.toFixed(3); };
  let metal = null, plateMesh = null, baseColour = null, baseRough = 0.34, srcMetal = null;

  function plateCompile(sh) {
    Object.assign(sh.uniforms, G, P);
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
        'uniform float uScuff, uLap, uRings, uGrit, uWallTone, uConeRough, uEdgeR, uEdgeCatch;\n' + GLSL_NOISE + GLSL_SCRATCH)
      .replace('#include <clipping_planes_fragment>', [
        '#include <clipping_planes_fragment>',
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
        'float bmhScrM = bmhScr * bmhTop, bmhRingM = bmhRing * bmhCone;'
      ].join('\n'))
      .replace('#include <alphatest_fragment>', [
        '#include <alphatest_fragment>',
        'diffuseColor.rgb *= (1.0 + bmhMottle * (0.04 + 0.05 * bmhFace) + (bmhG - 0.5) * (0.07 * bmhFace + 0.12 * bmhWall) * bmhGrainK',
        '                   - bmhPit * (0.02 + 0.24 * bmhWall) * uGrain * (1.0 - bmhCone)',
        '                   - bmhBlot * 0.12 * bmhWall * uGrit + bmhStreak * 0.10 * bmhWall * uGrit',
        '                   + bmhLapV * 0.035 * bmhFace * uLap - bmhSmudge * 0.035 * bmhTop * uScuff + bmhScrM * 0.08 * uScuff) * mix(1.0, uWallTone, bmhWall);'
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
        '  - bmhDB * 0.01 * bmhWall * uGrit + bmhDL * 0.002 * bmhFace * uLap - bmhDS * 0.003 * bmhTop * uScuff + bmhDR * 0.004 * bmhCone, faceDirection);'
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
        '                  - bmhScrM * 0.08 * uScuff + bmhRingM * 0.04, 0.04, 1.0);'
      ].join('\n'));
  }
  function makeMetal(src) {
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: new THREE.Color(0.70, 0.722, 0.748), metalness: 1, roughness: 0.34 });
    baseColour = m.color.clone();
    baseRough = m.roughness;
    m.name = 'plate metal (photo)';
    m.metalness = 1;
    m.envMap = envTex;
    m.envMapIntensity = 1;
    m.side = THREE.FrontSide;
    m.onBeforeCompile = plateCompile;
    return m;
  }

  /* ------------------------------------------------------------------ the screws' metal
     The screw GLB's own matte material (its first one: #999da3-ish base, roughness 0.43 x a tool-mark map),
     cloned, with the ground clip. 'pass1' layers the look pass on it, toward swanson-screws-101.jpg at the beat's
     on-screen size, look development only:
       - the head (top face, the four drive notches' floors and walls, the rim) is grit-blasted: matte, with the
         hero's three-octave blasted grain and the small dark pits grit leaves, in tone, roughness and relief;
       - the thread keeps the GLB's turned finish, a touch more satin, its roots in shade;
       - the notches read dark at their floors, the head's underside and the thread roots a little darker;
       - the whole screw sits under the plate's brightness (screwTone), as in the photographs, where the screws
         are the darker, cooler parts beside the bright plate.
     Each detail fades out before its features drop under about two pixels, so nothing shimmers. */
  const S = {
    uTone: { value: KNOBS.screwTone }, uHeadRough: { value: KNOBS.screwHeadRough }, uShankRough: { value: KNOBS.screwShankRough },
    uSGrit: { value: KNOBS.screwGrit }, uNotchAO: { value: KNOBS.screwNotchAO },
    uHeadY: { value: SCREW.lengthMm - SCREW.headHmm }, uTopY: { value: SCREW.lengthMm }, uFloorY: { value: SCREW.notchFloorMm }
  };
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.0);
  let screwMat = null, screwSrc = null;
  function screwCompile(sh) {
    Object.assign(sh.uniforms, S);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSmm; varying vec3 vSN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSmm = position * 1000.0; vSN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSmm; varying vec3 vSN;\n' +
        'uniform float uTone, uHeadRough, uShankRough, uSGrit, uNotchAO, uHeadY, uTopY, uFloorY;\n' + GLSL_NOISE)
      .replace('#include <clipping_planes_fragment>', [
        '#include <clipping_planes_fragment>',
        'float sY = vSmm.y, sR = length(vSmm.xz), sNy = vSN.y, sAn = abs(sNy);',
        'float sHead = smoothstep(uHeadY - 0.1, uHeadY + 0.1, sY);',
        'float sUp = step(0.85, sNy);',
        'float sTop = sHead * sUp * step(uTopY - 0.15, sY);',                       // the top face
        'float sFloor = sHead * sUp * (1.0 - step(uTopY - 0.15, sY));',             // the notch floors
        'float sRadial = sR > 0.2 ? abs(dot(normalize(vSN.xz + vec2(1e-5)), vSmm.xz / sR)) : 1.0;',
        'float sSide = sHead * (1.0 - smoothstep(0.35, 0.6, sAn));',
        'float sNotch = sSide * (1.0 - smoothstep(0.75, 0.95, sRadial));',          // the notches\' walls face across, not out
        'float sUnder = sHead * step(sNy, -0.5);',
        'float sShank = 1.0 - sHead;',
        'float sBlast = sHead * uSGrit;',
        'float sPx = max(length(dFdx(vSmm)), length(dFdy(vSmm)));',
        'float sK1 = 1.0 - smoothstep(0.07, 0.14, sPx);',
        'float sK2 = 1.0 - smoothstep(0.03, 0.06, sPx);',
        'float sK3 = 1.0 - smoothstep(0.013, 0.026, sPx);',
        'float sG = 0.5 + (bmhVN(vSmm * 4.0) - 0.5) * 0.6 * sK1 + (bmhVN(vSmm * 9.0 + 3.1) - 0.5) * 0.8 * sK2 + (bmhVN(vSmm * 20.0 + 7.7) - 0.5) * 0.8 * sK3;',
        'float sPit = 0.6 * smoothstep(0.7, 0.9, bmhVN(vSmm * 7.0 + vec3(9.1, 1.3, 5.7))) * sK1 + smoothstep(0.72, 0.9, bmhVN(vSmm * 16.0 + vec3(2.9, 8.4, 0.6))) * sK2;',
        'float sMottle = bmhVN(vSmm * 0.9 + vec3(4.1, 2.2, 8.3)) * 0.65 + bmhVN(vSmm * 2.6 + vec3(1.7, 6.2, 3.3)) * 0.35 - 0.5;',
        'float sAO = 1.0;',
        'sAO *= mix(1.0, uNotchAO, sFloor);',
        'sAO *= mix(1.0, mix(uNotchAO, 1.0, smoothstep(uFloorY, uTopY, sY)), sNotch);',
        'sAO *= mix(1.0, 0.72, sUnder);',
        'sAO *= mix(1.0, mix(0.7, 1.0, smoothstep(1.35, 2.0, sR)), sShank);'
      ].join('\n'))
      .replace('#include <alphatest_fragment>', [
        '#include <alphatest_fragment>',
        'diffuseColor.rgb *= uTone * (1.0 + sMottle * 0.05 + (sG - 0.5) * (0.05 + 0.16 * sBlast) - sPit * (0.02 + 0.12 * sBlast));'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        'normal = bmhPerturb(-vViewPosition, normal, (vec2(dFdx(sG), dFdy(sG)) * 0.02 - vec2(dFdx(sPit), dFdy(sPit)) * 0.01) * sBlast, faceDirection);'
      ].join('\n'))
      .replace('#include <aomap_fragment>', [
        '#include <aomap_fragment>',
        'reflectedLight.indirectSpecular *= sAO;',
        'reflectedLight.indirectDiffuse *= sAO;'
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', [
        'float roughnessFactor = roughness;',
        '#ifdef USE_ROUGHNESSMAP',
        '  roughnessFactor *= texture2D(roughnessMap, vUv).g;',
        '#endif',
        'roughnessFactor = mix(roughnessFactor * uShankRough, uHeadRough, sBlast);',
        'roughnessFactor = clamp(roughnessFactor + sMottle * 0.05 + (sG - 0.5) * 0.1 * sBlast + sPit * 0.1 * sBlast, 0.04, 1.0);'
      ].join('\n'));
  }
  function makeScrewMat(src) {
    const m = src ? src.clone() : new THREE.MeshStandardMaterial({ color: new THREE.Color(0.60, 0.615, 0.638), metalness: 1, roughness: 0.43 });
    m.name = KNOBS.screwLook === 'glb' ? 'screw metal (glb)' : 'screw metal (pass 1)';
    m.metalness = 1;
    m.envMap = envTex;
    m.envMapIntensity = 1;
    m.side = THREE.FrontSide;
    m.clippingPlanes = [groundPlane];
    if (KNOBS.screwLook !== 'glb') m.onBeforeCompile = screwCompile;
    return m;
  }

  /* ------------------------------------------------------------------ the contact shadow (the hero's)
     Rendered from underneath with an orthographic camera looking up, set-aligned. Each texel stores how close
     the lowest metal above it is to the ground (R: within a hair, for the contact line; G: within a few mm, for
     the soft shadow). Blurred twice, drawn on the ground. The plate and the four screws all cast. */
  const SH = { w: 96, h: 28, rx: 768, ry: 224, far: 14 };
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
    uniforms: { uTightH: { value: 0.9 }, uWideH: { value: 9.0 } },
    vertexShader: [
      'varying float vH;',
      'void main() {',
      '  vec4 w = modelMatrix * vec4(position, 1.0);',
      '  vH = w.y;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTightH, uWideH;',
      'varying float vH;',
      'void main() {',
      '  gl_FragColor = vec4(1.0 - smoothstep(0.0, uTightH, vH), 1.0 - smoothstep(0.0, uWideH, vH), 0.0, 1.0);',
      '}'
    ].join('\n')
  });
  const casters = [];   // [visible mesh, its shadow twin]

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
    for (let i = 0; i < casters.length; i++) {
      casters[i][1].matrix.copy(casters[i][0].matrixWorld);
      casters[i][1].matrixWorldNeedsUpdate = true;
    }
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

  /* ------------------------------------------------------------------ framing
     The camera orbits at the frame's elevation. Its distance sets the plate's width on screen and a lens shift
     puts the plate's centre where the layout wants it, so perspective never skews as the camera rises. The
     target (where, how wide) is measured from the part slot on resize, never in the scroll tick. */
  const corners = [];
  for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? HALF : -HALF, i & 2 ? THICK : 0, i & 4 ? HALF_W : -HALF_W));
  const v3 = new THREE.Vector3();
  let target = { tx: 0.5, ty: 0.5, size: 0.5, maxBoxH: 0, roll: 0, w: 1, h: 1 };

  function measure() {
    const w = stage.clientWidth || window.innerWidth, h = stage.clientHeight || window.innerHeight;
    const sr = stage.getBoundingClientRect(), pr = part.getBoundingClientRect();
    const slot = { x: pr.left - sr.left, y: pr.top - sr.top, w: Math.max(1, pr.width), h: Math.max(1, pr.height) };
    const PZ = KNOBS.pose;
    if (PHONE.matches) {
      const L = PZ.phone;
      target = { tx: L.x == null ? 0.5 : L.x, ty: (slot.y + slot.h * (L.roomAt == null ? 0.5 : L.roomAt)) / h,
                 size: L.size, maxBoxH: Math.min((slot.h / h) * (L.fill || 0.72), L.maxH || 1), roll: L.rollDeg || 0, w: w, h: h };
    } else {
      const L = PZ.desktop;
      target = { tx: (slot.x + slot.w * L.x) / w, ty: (slot.y + slot.h * L.y) / h,
                 size: L.size * slot.w / w, maxBoxH: (slot.h / h) * 0.9, roll: L.rollDeg || 0, w: w, h: h };
    }
    renderer.setSize(w, h, false);
    camera.fov = KNOBS.lensDeg;
    camera.aspect = w / h;
  }

  function frame(yawDeg, elDeg) {
    const el = elDeg * DEG, yaw = yawDeg * DEG, L = target;
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
    const aim = new THREE.Vector3(0, THICK / 2, 0);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    function project(d) {
      camera.position.copy(dir).multiplyScalar(d).add(aim);
      camera.lookAt(aim);
      camera.rotateZ(L.roll * DEG);
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      corners.forEach(function (c) {
        v3.set(c.x * cy + c.z * sy, c.y, -c.x * sy + c.z * cy).project(camera);
        x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); y0 = Math.min(y0, v3.y); y1 = Math.max(y1, v3.y);
      });
      return { x0: x0, x1: x1, y0: y0, y1: y1 };
    }
    let size = L.size;
    let b = project(200);
    let d = 200 * (b.x1 - b.x0) / (size * 2);
    b = project(d);
    if (L.maxBoxH && (b.y1 - b.y0) / 2 > L.maxBoxH) d *= ((b.y1 - b.y0) / 2) / L.maxBoxH;
    else d *= (b.x1 - b.x0) / (size * 2);
    b = project(d);
    const Pm = camera.projectionMatrix.elements;
    Pm[8] -= (L.tx * 2 - 1) - (b.x0 + b.x1) / 2;
    Pm[9] -= (1 - L.ty * 2) - (b.y0 + b.y1) / 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  /* ------------------------------------------------------------------ the assembly */
  const screws = [];   // { pivot, mesh, x, order }
  function descent(u) {              // 0..1 of one screw's descent -> mm above its seat
    const H = KNOBS.liftMm, lin = Math.min(KNOBS.linearMm, H), share = BMH.clamp(KNOBS.linearShare, 0.01, 0.9);
    if (u <= 0) return H;
    if (u >= 1) return 0;
    const u1 = 1 - share;
    if (u < u1) { const t = u / u1; return lin + (H - lin) * Math.pow(1 - t, KNOBS.descentEase || 2); }   // ease out, to the linear tail
    return lin * (1 - (u - u1) / share);                                            // the last of it at one speed: a stop
  }
  function pose(a, e) {
    const camT = a * a * (3 - 2 * a);
    const yawDeg = BMH.lerp(KNOBS.cameraStart[0], KNOBS.cameraEnd[0], camT) - KNOBS.entranceTurnDeg * (1 - e);
    const elDeg = BMH.lerp(KNOBS.cameraStart[1], KNOBS.cameraEnd[1], camT);
    yawG.rotation.y = yawDeg * DEG;
    const lift = KNOBS.entranceLiftMm * (1 - e) + (KNOBS.rest === 'float' ? KNOBS.floatMm : 0);
    liftG.position.y = lift;
    liftG.rotation.x = KNOBS.entranceTiltDeg * (1 - e) * DEG;
    G.uGround.value = 1 - BMH.smooth(0, 0.6, lift);
    groundG.rotation.y = yawG.rotation.y;
    const oz = KNOBS.shadowOffsetMm;
    groundG.position.set(oz * 0.5, 0, oz);
    const span = Math.max(1e-3, 1 - KNOBS.stagger);
    for (let i = 0; i < screws.length; i++) {
      const s = screws[i];
      if (KNOBS.assemble === 'beside') continue;
      const u = BMH.clamp((a - s.order * KNOBS.stagger) / span, 0, 1);
      const hmm = descent(u);
      s.mesh.position.y = TIP_Y - SEAT_Y + hmm;
      if (KNOBS.spin === 'seat') s.mesh.rotation.y = s.turn + Math.PI / 2 * BMH.smooth(0.75, 1, u);
      else if (KNOBS.spin === 'thread') s.mesh.rotation.y = s.turn + 2 * Math.PI * (KNOBS.liftMm - hmm) / SCREW.pitchMm;
      else s.mesh.rotation.y = s.turn;
    }
    frame(yawDeg, elDeg);
  }

  /* ------------------------------------------------------------------ state and drawing */
  let ready = false, visible = true, queued = false, rafId = 0;
  let enterAt = 0, entering = false, seen = false, a = reduced ? 1 : 0, held = null, timeA = 0, dirty = false;
  const stats = { draws: 0, lastMs: 0, maxMs: 0, sumMs: 0 };
  let statsEl = null;

  function current() { return held != null ? held : KNOBS.hold != null ? BMH.clamp(KNOBS.hold, 0, 1) : a; }

  function draw(now) {
    queued = false; rafId = 0;
    if (!ready) return;
    const t0 = performance.now();
    let e = seen || reduced || !KNOBS.entrance ? 1 : 0;   // before the entrance: held where it starts from
    if (entering) {
      const t = BMH.clamp(((now || t0) - enterAt) / KNOBS.entranceMs, 0, 1);
      if (t >= 1) entering = false;
      e = 1 - Math.pow(1 - t, KNOBS.entranceEase);
    }
    pose(current(), e);
    scene.updateMatrixWorld();
    renderShadow();
    renderer.render(scene, camera);
    dirty = false;
    const ms = performance.now() - t0;
    stats.draws++; stats.lastMs = ms; stats.sumMs += ms; if (ms > stats.maxMs) stats.maxMs = ms;
    if (statsEl) statsEl.textContent = 'draws ' + stats.draws + ' · last ' + ms.toFixed(1) + ' ms · max ' + stats.maxMs.toFixed(1) + ' ms · mean ' + (stats.sumMs / stats.draws).toFixed(1) + ' ms';
    if (entering && visible) request();
  }
  function request() { if (!queued) { queued = true; rafId = requestAnimationFrame(draw); } }
  function drawNow() {
    if (queued) { cancelAnimationFrame(rafId); queued = false; rafId = 0; }
    draw(performance.now());
  }

  function pinScreens() { return !reduced && KNOBS.drive === 'pin' ? KNOBS.pinScreens * (PHONE.matches ? 0.6 : 1) : 0; }

  /* the drive: the assembly's progress from the section's trip through the viewport (no layout read: BMH.rect's
     cached boxes), from the pin, or from the clock */
  function progress() {
    if (reduced) return 1;
    if (KNOBS.drive === 'time') return timeA;
    if (KNOBS.drive === 'pin') return BMH.clamp((BMH.pinProgress(sec) - KNOBS.pinFrom) / Math.max(1e-6, KNOBS.pinTo - KNOBS.pinFrom), 0, 1);
    return BMH.clamp((BMH.passProgress(sec) - KNOBS.passFrom) / Math.max(1e-6, KNOBS.passTo - KNOBS.passFrom), 0, 1);
  }
  /* the entrance, once: with the 'pass' drive it starts as the set first rises over the viewport's foot (the first
     progress above 0), so it is not spent while the set is still below the fold; with 'pin' and 'time' when the
     section is first in view */
  function maybeEnter() {
    if (seen || !ready || !visible) return;
    if (KNOBS.drive === 'pass' && !(current() > 0)) return;
    seen = true;
    if (KNOBS.entrance && !reduced) { entering = true; enterAt = performance.now(); }
    request();
  }
  function readScroll(inTick) {
    const a2 = progress();
    if (a2 === a) return;
    a = a2;
    if (!ready) return;
    if (!visible) { dirty = true; return; }
    if (!seen) { maybeEnter(); if (seen) return; }
    if (inTick && !entering) drawNow(); else request();
  }

  /* 'time': the close band's state machine. In view: still for holdMs, then the assembly over assembleMs. Out of
     view: back to raised, so it plays again on return. */
  let timer = 0, timeRaf = 0, timeT0 = 0;
  function timeStop() { clearTimeout(timer); cancelAnimationFrame(timeRaf); timer = 0; timeRaf = 0; }
  function timeReset() { timeStop(); timeA = 0; readScroll(false); }
  function timeStart() {
    timeStop();
    timer = setTimeout(function () {
      timeT0 = performance.now();
      (function step(now) {
        timeA = BMH.clamp((now - timeT0) / KNOBS.assembleMs, 0, 1);
        readScroll(false);
        if (timeA < 1) timeRaf = requestAnimationFrame(step);
      })(timeT0);
    }, KNOBS.holdMs);
  }

  function applyKnobs() {
    renderer.toneMappingExposure = KNOBS.exposure;
    G.uGrain.value = KNOBS.grain;
    if (metal) {
      if (KNOBS.metalColour) metal.color.copy(BMH.color(KNOBS.metalColour));
      else metal.color.copy(baseColour);
      metal.roughness = baseRough * KNOBS.finish;
    }
    groundMat.uniforms.uTight.value = KNOBS.contactShadow;
    groundMat.uniforms.uWide.value = KNOBS.shadow;
    shadowMat.uniforms.uWideH.value = KNOBS.rest === 'float' ? KNOBS.floatMm + 9 : 9;
    P.uScuff.value = KNOBS.scuffs; P.uLap.value = KNOBS.machiningMarks; P.uRings.value = KNOBS.turningRings;
    P.uGrit.value = KNOBS.wallGrit; P.uWallTone.value = KNOBS.wallTone; P.uConeRough.value = KNOBS.coneRoughness;
    P.uEdgeR.value = KNOBS.edgeRadiusMm; P.uEdgeCatch.value = KNOBS.edgeCatch;
    S.uTone.value = KNOBS.screwTone; S.uHeadRough.value = KNOBS.screwHeadRough; S.uShankRough.value = KNOBS.screwShankRough;
    S.uSGrit.value = KNOBS.screwGrit; S.uNotchAO.value = KNOBS.screwNotchAO;
    sec.style.setProperty('--pin', pinScreens());
    measure();
  }

  /* ------------------------------------------------------------------ build, in quiet time
     The two models come through the page's queue (one parse each, in idle periods); the scene is built, posed and
     compiled in one idle job after the hero's entrance has played, off screen, then drawn when it comes into view. */
  sec.style.setProperty('--pin', pinScreens());
  let resolveReady;
  const readyP = new Promise(function (r) { resolveReady = r; });
  const t0 = performance.now();
  function screwBlob() { return KNOBS.screw === 'hi' ? 'glb-screw-hi' : 'glb-screw'; }
  function loadScrew() {
    return BMH.glb(screwBlob()).catch(function (err) {
      if (KNOBS.screw !== 'hi') throw err;
      KNOBS.screw = 'web';                     // no hi blob on this page: the web screw
      return BMH.glb('glb-screw');
    });
  }
  function bodyOf(gltf) {
    let body = null;
    gltf.scene.traverse(function (o) {
      if (o.isMesh && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o;
    });
    return body;
  }
  function matOf(gltf, name, fallback) {
    let m = null;
    gltf.scene.traverse(function (o) { if (o.isMesh && o.material && o.material.name === name) m = o.material; });
    return m || fallback;
  }

  Promise.all([BMH.glb(PV.blob || 'glb-plate-v2-hi'), loadScrew()]).then(function (g) {
    return BMH.idle(function () {
      buildStudio();
      const gP = g[0], gS = g[1];
      const plateBody = bodyOf(gP), screwBody = bodyOf(gS);
      if (!plateBody || !screwBody) throw new Error('03-product: no mesh in a model');
      const SATIN = (PV.materials || [])[1] || 'biometal_coated', MATTE = (PV.materials || [])[0] || 'biometal_uncoated';
      srcMetal = matOf(gP, SATIN, plateBody.material);
      screwSrc = matOf(gS, MATTE, screwBody.material);
      metal = makeMetal(srcMetal);
      plateMesh = new THREE.Mesh(plateBody.geometry, metal);
      plateG.add(plateMesh);
      const plateShadow = new THREE.Mesh(plateBody.geometry, shadowMat);
      plateShadow.matrixAutoUpdate = false;
      shadowScene.add(plateShadow);
      casters.push([plateMesh, plateShadow]);

      screwMat = makeScrewMat(screwSrc);
      const turns = [0.21, 0.62, 1.37, 0.95];     // each screw's notches at their own angle, as dropped in by hand
      HOLES.forEach(function (x, i) {
        const pivot = new THREE.Group();
        const mesh = new THREE.Mesh(screwBody.geometry, screwMat);
        mesh.scale.setScalar(1000);
        if (KNOBS.assemble === 'beside') {
          /* the flat lay: the four lying in a row in front of the plate, heads toward the camera, each resting on its
             head rim and its thread crests (the head is the wider end, so the axis pitches down to the tip) */
          const pitch = Math.atan2(SCREW.headRmm - SCREW.threadRmm, SCREW.lengthMm);
          pivot.position.set((i - 1.5) * 9, SCREW.threadRmm, HALF_W + 3.5);
          pivot.rotation.y = (turns[i] - 0.8) * 0.12;
          mesh.rotation.x = Math.PI / 2 - pitch;
          mesh.position.set(0, 0, 0);
        } else {
          pivot.position.set(x, SEAT_Y, 0);
          mesh.position.set(0, TIP_Y - SEAT_Y + KNOBS.liftMm, 0);
        }
        mesh.rotation.y = turns[i];
        pivot.add(mesh);
        liftG.add(pivot);
        const twin = new THREE.Mesh(screwBody.geometry, shadowMat);
        twin.matrixAutoUpdate = false;
        shadowScene.add(twin);
        casters.push([mesh, twin]);
        screws.push({ pivot: pivot, mesh: mesh, x: x, order: ORDER[i], turn: turns[i] });
      });

      applyKnobs();
      a = progress();
      pose(current(), KNOBS.entrance && !reduced ? 0 : 1);   // posed as it will first show: where the entrance starts from
      scene.updateMatrixWorld();
      /* compile every program off screen: the shadow pass's, the blur's and the scene's */
      renderShadow();
      BMH.warm(renderer, scene, camera);
      ready = true;
      BMH.product.setupMs = Math.round(performance.now() - t0);
      sec.classList.add('is-ready');
      resolveReady();

      BMH.onScroll(function () { readScroll(true); });
      BMH.visible(sec, function (v) {
        visible = v;
        if (!v) return;
        maybeEnter();
        request();
      });
      if (KNOBS.drive === 'time' && !reduced) BMH.visible(sec, function (v) { if (v) timeStart(); else timeReset(); }, '0px');
      let rz = 0;
      function relayout() { sec.style.setProperty('--pin', pinScreens()); measure(); a = progress(); request(); }
      window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(relayout); });
      function lateLayout() { cancelAnimationFrame(rz); rz = requestAnimationFrame(relayout); }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(lateLayout);
      if (window.ResizeObserver) { const ro = new ResizeObserver(lateLayout); ro.observe(copyEl); ro.observe(part); }
      if (!visible) dirty = true; else request();
    });
  }).catch(function (err) {
    if (window.console) console.warn('03-product: the set failed to build', err);
    photograph();
  });

  /* ------------------------------------------------------------------ review hooks */
  BMH.product = {
    knobs: KNOBS,
    studio: STUDIO,
    ready: readyP,
    stats: stats,
    set: function (o) {
      return readyP.then(function () {
        const relook = o && (('screwLook' in o && o.screwLook !== KNOBS.screwLook) || ('screwTone' in o) || ('screwHeadRough' in o) || ('screwShankRough' in o) || ('screwGrit' in o) || ('screwNotchAO' in o));
        if (o && o.studio) { Object.assign(STUDIO, o.studio); delete o.studio; buildStudio(); }
        Object.assign(KNOBS, o || {});
        if (relook && 'screwLook' in (o || {})) {
          const old = screwMat;
          screwMat = makeScrewMat(screwSrc);
          screws.forEach(function (s) { s.mesh.material = screwMat; });
          old.dispose();
        }
        applyKnobs();
        entering = false;
        a = progress();
        draw(performance.now());
      });
    },
    hold: function (v) { held = v; request(); return readyP; },
    replay: function () { entering = true; enterAt = performance.now(); request(); },
    showStats: function () {
      if (statsEl) return statsEl;
      statsEl = document.createElement('div');
      statsEl.className = 'product__stats';
      statsEl.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:12px/1.4 monospace;background:#fff;color:#000;padding:4px 6px;border:1px solid #000';
      document.body.appendChild(statsEl);
      return statsEl;
    }
  };
})();
