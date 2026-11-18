/* PPP 01 · Opener: BioMetal's photograph of its two plates. On one screen of scroll a pass of light crosses the metal, then
   both plates dissolve.                                                                                        -z1n
   5 Nov 2026, Andrew: "Why would only one of them dissolve? This is a strange thing. No, I just want both of them to dissolve."
   The one-plate directions (oneStays, thinAway) and the light on its own are in section.js-prev-1105d.

   One front crosses both plates from their far ends to their near ends, and the photograph's own metal breaks into fine
   grain that lifts up and to the right. The shadows go with the plates. It runs back on the way up.

   2D on the photograph, no model. The whole picture is one quad: at rest it outputs the photograph's own pixels. The canvas
   multiplies onto the ground as the <img> does, so white is paper. The <img> stays as first paint and fallback.
   Reduced motion and no WebGL: both plates whole, no pin.
   The maps come from make-assets.py, which also prints the numbers in FIELD. */
(function () {
  'use strict';
  var BMH = window.BMH;
  var KNOBS = BMH.knobs('ppp-opener', {
    sheen: true,            // the pass of light. false: none at all
    sheenStrength: 0.5,     // how bright the light is at its centre, 0..1
    sheenDone: 0.3,         // the pass ends at this share of the pin
    bandFrom: 81,           // background-position % where the light first touches the left plate
    bandTo: 26,             // and where it leaves the right plate (the CSS's 260% band crosses the metal only between these)

    dissolveFrom: 0.25,     // the front starts at this share of the pin
    dissolveTo: 0.85,       // and the last grain has thinned out at this share
    grains: 80000,          // how many grains the two plates shed (half on a phone)
    grainPx: 1.5,           // grain size, CSS px
    grainLife: 0.14,        // how long a grain lasts, as a share of the length the front walks meanwhile
    driftPx: 70,            // how far a grain lifts, photo px
    driftDir: [0.34, -1],   // the one shared vector: up and to the right
    ragged: 0.22,           // how uneven the front is, as a share of its length
    bandMetal: 0.015,       // how wide the front is on the metal, as a share of its length. Wider reads as fog
    bandShadow: 0.06,       // and on the shadow, which has no edge of its own
    fineCell: 1.25,         // the fine noise that breaks the front: cell size in photo px
    fineAmount: 1.8,        // and its strength, in front widths
    maxDpr: 2
  });
  var section = document.getElementById('s-ppp-opener');
  if (!section) return;
  section.setAttribute('data-direction', 'bothGo');                  // the CSS's short-screen rule keys on it
  var sheen = section.querySelector('.ppp-open__sheen');
  var img = section.querySelector('.ppp-open__img');
  if (!img || BMH.reduced) return;                                   // the whole photograph; the CSS drops the tall section

  var PW = 1100, PH = 620;                                           // plates.webp
  var FIELD = { far: [767.9, 102.0], axis: [-0.2805, 0.9598], len: 499.1 };   // make-assets.py prints these
  var TILE = 64;

  var canvas = document.createElement('canvas'), renderer;
  canvas.className = 'ppp-open__gl';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Two zinc alloy bone plates on a white surface. As you scroll, both dissolve.');
  var glAttrs = { alpha: false, antialias: false, stencil: false }, gl = null;
  try { gl = canvas.getContext('webgl2', glAttrs) || canvas.getContext('webgl', glAttrs); } catch (e) { gl = null; }
  try {
    if (gl) renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, antialias: false, alpha: false });
  } catch (e) { renderer = null; }
  if (!renderer) {
    section.setAttribute('data-drive', 'load');                      // no pin, the photograph as it is
    return;
  }
  renderer.setClearColor(0xffffff, 1);
  canvas.style.visibility = 'hidden';
  img.parentNode.insertBefore(canvas, sheen || null);
  canvas.addEventListener('webglcontextlost', function () {          // the photograph comes back
    canvas.style.visibility = 'hidden';
    img.style.visibility = '';
  });

  var box = img.parentNode;
  var pr = Math.min(window.devicePixelRatio || 1, KNOBS.maxDpr);
  var scene = new THREE.Scene(), cam = new THREE.Camera(), built = false, onScreen = true, lastF = null, fFrom = -0.1, fTo = 1.3;

  var rand = rng(11);
  var tile = new Uint8Array(TILE * TILE * 4);
  for (var i = 0; i < TILE * TILE; i++) tile[i * 4] = tile[i * 4 + 1] = tile[i * 4 + 2] = Math.floor(rand() * 256), tile[i * 4 + 3] = 255;

  var dl = Math.hypot(KNOBS.driftDir[0], KNOBS.driftDir[1]);
  var GU = {
    uF: { value: -1 }, uLife: { value: KNOBS.grainLife }, uDrift: { value: KNOBS.driftPx },
    uDir: { value: new THREE.Vector2(KNOBS.driftDir[0] / dl, KNOBS.driftDir[1] / dl) },
    uPx: { value: KNOBS.grainPx * pr }, uRound: { value: KNOBS.grainPx * pr >= 2.5 ? 1 : 0 },
    uSize: { value: new THREE.Vector2(PW, PH) }
  };
  var U = {
    uPhoto: { value: null }, uField: { value: null }, uRegion: { value: null }, uTile: { value: null },
    uSize: GU.uSize, uF: GU.uF,
    uFar: { value: new THREE.Vector2(FIELD.far[0], FIELD.far[1]) },
    uAxis: { value: new THREE.Vector2(FIELD.axis[0], FIELD.axis[1]) },
    uLen: { value: FIELD.len },
    uRagged: { value: KNOBS.ragged }, uBand: { value: KNOBS.bandMetal }, uBandShadow: { value: KNOBS.bandShadow },
    uFineCell: { value: KNOBS.fineCell }, uFineAmount: { value: KNOBS.fineAmount }, uGate: { value: 0 }
  };

  /* the canvas sits exactly on the image's contain box, wherever object-position puts it */
  function layout() {
    var b = box.getBoundingClientRect();
    if (!b.width || !b.height) return false;
    var k = Math.min(b.width / PW, b.height / PH), w = PW * k, h = PH * k;
    var pos = getComputedStyle(img).objectPosition.split(/\s+/);
    canvas.style.left = (b.width - w) * (parseFloat(pos[0]) || 0) / 100 + 'px';
    canvas.style.top = (b.height - h) * (parseFloat(pos[1]) || 0) / 100 + 'px';
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    renderer.setDrawingBufferSize(Math.round(w * pr), Math.round(h * pr), 1);
    return true;
  }

  function texture(el) {
    var t = new THREE.Texture(el);
    t.flipY = false;                                                 // uv (0, 0) is the photograph's top left: uv * size is photo px
    t.encoding = THREE.LinearEncoding;                               // the file's values, untouched
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  function load(src) {
    var im = new Image();
    im.crossOrigin = 'anonymous';   // Webflow: the photographs come from another host and WebGL needs them clean
    im.src = src;
    return (im.decode ? im.decode() : new Promise(function (ok, no) { im.onload = ok; im.onerror = no; })).then(function () { return im; });
  }

  /* the same value noise in the shader and here, so a grain leaves exactly when the metal under it does */
  function vn(x, y, cell) {
    var gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    function T(a, b) { return tile[(((b % TILE) + TILE) % TILE * TILE + ((a % TILE) + TILE) % TILE) * 4] / 255; }
    return BMH.lerp(BMH.lerp(T(ix, iy), T(ix + 1, iy), fx), BMH.lerp(T(ix, iy + 1), T(ix + 1, iy + 1), fx), fy);
  }
  function fieldAt(x, y) {
    var s = ((x - FIELD.far[0]) * FIELD.axis[0] + (y - FIELD.far[1]) * FIELD.axis[1]) / FIELD.len;
    return s + (vn(x, y, 46) * 0.65 + vn(x, y, 18) * 0.35 - 0.5) * KNOBS.ragged;
  }

  function frontAt(pin) {
    /* the front starts at the first grain of metal and runs on until the last grain has thinned out (build measures both) */
    return BMH.lerp(fFrom, fTo, BMH.smooth(KNOBS.dissolveFrom, KNOBS.dissolveTo, pin));
  }
  function setFront(f) {
    GU.uF.value = f;
    U.uGate.value = BMH.clamp((f - fFrom) / 0.02, 0, 1);             // exactly the photograph at rest
  }
  function draw() { renderer.render(scene, cam); }
  /* drawn only when it changed and only on screen. The observer can report after the tick that brought the section back,
     so it brings the picture up to date itself */
  function sync(pin) {
    if (!built || !onScreen) return;
    var f = frontAt(pin);
    if (f !== lastF) { lastF = f; setFront(f); draw(); }
  }

  function build(fieldImg, photoImg) {
    var t = new THREE.DataTexture(tile, TILE, TILE, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    U.uTile.value = t;

    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: U, depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5); gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: [
        'uniform sampler2D uPhoto, uField, uRegion, uTile;',
        'uniform vec2 uSize, uFar, uAxis;',
        'uniform float uLen, uF, uRagged, uBand, uBandShadow, uFineCell, uFineAmount, uGate;',
        'varying vec2 vUv;',
        'float vn(vec2 P, float cell) {',
        '  vec2 g = P / cell, i = floor(g), f = fract(g);',
        '  f = f * f * (3.0 - 2.0 * f);',
        '  return texture2D(uTile, (i + f + 0.5) / ' + TILE + '.0).r;',
        '}',
        'float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',
        'void main() {',
        '  vec3 photo = texture2D(uPhoto, vUv).rgb;',
        '  float reg = texture2D(uRegion, vUv).r;',
        '  float M = texture2D(uField, vUv).b;',
        '  vec2 P = vUv * uSize;',
        '  float s = dot(P - uFar, uAxis) / uLen;',
        '  float fld = s + (vn(P, 46.0) * 0.65 + vn(P, 18.0) * 0.35 - 0.5) * uRagged;',
        /* narrow on the metal, or it reads as white fog; the fine noise breaks that edge into grain */
        '  float metal = smoothstep(0.1, 0.6, M);',
        '  float band = mix(uBandShadow, uBand, metal);',
        '  float fine = (hash(floor(P / uFineCell)) - 0.5) * uBand * uFineAmount * metal;',
        '  float k = clamp((fld + fine - uF) / band, 0.0, 1.0);',
        '  k = k * k * (3.0 - 2.0 * k);',
        /* white multiplies away to the ground */
        '  gl_FragColor = vec4(mix(photo, vec3(1.0), reg * (1.0 - k) * uGate), 1.0);',
        '}'
      ].join('\n')
    }));
    quad.frustumCulled = false;
    scene.add(quad);

    /* the grains: sampled from the matte, each with the photograph's colour at its point */
    var cv = document.createElement('canvas');
    cv.width = PW; cv.height = PH;
    var c = cv.getContext('2d', { willReadFrequently: true });
    c.drawImage(fieldImg, 0, 0);
    var fd = c.getImageData(0, 0, PW, PH).data;
    c.drawImage(photoImg, 0, 0);
    var pd = c.getImageData(0, 0, PW, PH).data;
    var inside = [];
    for (var n = 0, m = PW * PH; n < m; n++) if (fd[n * 4 + 2] > 153) inside.push(n);
    var N = Math.round(KNOBS.grains * (window.matchMedia(BMH.PHONE_MQ).matches ? 0.5 : 1));
    var pos = new Float32Array(N * 3), col = new Uint8Array(N * 4);
    var fMin = Infinity, fMax = -Infinity;
    for (var g = 0; g < N; g++) {
      var at = inside[Math.floor(rand() * inside.length)];
      var x = at % PW + rand(), y = Math.floor(at / PW) + rand(), here = fieldAt(x, y);
      if (here < fMin) fMin = here;
      if (here > fMax) fMax = here;
      pos[g * 3] = x; pos[g * 3 + 1] = y; pos[g * 3 + 2] = here;
      col[g * 4] = pd[at * 4]; col[g * 4 + 1] = pd[at * 4 + 1]; col[g * 4 + 2] = pd[at * 4 + 2];
      col[g * 4 + 3] = Math.floor(rand() * 256);                     // the grain's seed
    }
    fFrom = fMin - 0.01;
    fTo = fMax + KNOBS.grainLife * 1.2 + KNOBS.bandMetal;
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aC', new THREE.BufferAttribute(col, 4, true));
    /* the hero's three rules. Nothing falls: every grain lifts along one shared vector. No spikes: its displacement is a
       monotone eased function of its own clock. Nothing accumulates: MIN blending, so where grains overlap the field is only
       as dark as its single darkest grain */
    var points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: GU, depthTest: false, depthWrite: false, toneMapped: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.MinEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      vertexShader: [
        'attribute vec4 aC;',
        'uniform float uF, uLife, uDrift, uPx; uniform vec2 uDir, uSize;',
        'varying float vA; varying vec3 vC;',
        'void main() {',
        '  float q = (uF - position.z) / (uLife * (0.8 + 0.4 * aC.a));',
        '  if (q <= 0.0 || q >= 1.0) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; vC = vec3(1.0); return; }',
        '  float e = q * q * (3.0 - 2.0 * q);',
        '  vec2 p = position.xy + uDir * uDrift * e * (0.85 + 0.3 * aC.a);',
        '  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, 0.0, 1.0);',
        '  gl_PointSize = uPx;',
        '  vA = pow(1.0 - q, 1.2) * 0.85;',
        '  vC = aC.rgb;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uRound; varying float vA; varying vec3 vC;',
        'void main() {',
        '  float r = length(gl_PointCoord - 0.5) * 2.0;',
        '  float a = vA * (1.0 - uRound * smoothstep(0.45, 1.0, r));',
        '  gl_FragColor = vec4(mix(vec3(1.0), vC, a), 1.0);',
        '}'
      ].join('\n')
    }));
    points.frustumCulled = false;
    points.renderOrder = 1;
    scene.add(points);
  }

  /* the photograph is read from its own detached copy: three.js sizes a texture from image.width, and a laid-out <img>
     reports its CSS box there */
  Promise.all([
    load(img.currentSrc || img.src),
    load('https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/partner-program/01-opener/plates-field.webp'),
    load('https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/partner-program/01-opener/plates-region.webp')
  ]).then(function (got) {
    return BMH.idle(function () {
      U.uPhoto.value = texture(got[0]);
      U.uField.value = texture(got[1]);
      U.uRegion.value = texture(got[2]);
      build(got[1], got[0]);
      if (!layout()) return;
      built = true;
      lastF = frontAt(BMH.pinProgress(section));
      setFront(lastF);
      draw();
      img.style.visibility = 'hidden';
      canvas.style.visibility = '';
    }, { by: 600 });
  }).catch(function () {
    /* the photograph stays; a pinned stage with nothing moving would be a dead screen of scroll */
    canvas.remove();
    section.setAttribute('data-drive', 'load');
  });

  if (window.ResizeObserver) {
    new ResizeObserver(function () { if (built && layout()) draw(); }).observe(box);
  }

  if (sheen && KNOBS.sheen) sheen.style.setProperty('--sheen', String(KNOBS.sheenStrength));
  BMH.visible(section, function (v) { onScreen = v; if (v) sync(BMH.pinProgress(section)); }, '0px');
  BMH.onScroll(function () {
    var pin = BMH.pinProgress(section);
    if (sheen && KNOBS.sheen) {
      var p = BMH.clamp(pin / KNOBS.sheenDone, 0, 1), e = p * p * (3 - 2 * p);
      sheen.style.opacity = p > 0 && p < 1 ? '1' : '0';
      sheen.style.backgroundPosition = (KNOBS.bandFrom - (KNOBS.bandFrom - KNOBS.bandTo) * e) + '% 0';
    }
    sync(pin);
  });

  function rng(seed) {                    // mulberry32: the same grains on every load
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
})();
