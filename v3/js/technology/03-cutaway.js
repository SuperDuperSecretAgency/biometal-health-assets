/* Technology 03 · "Zinc alloys dissolve evenly." on BioMetal's own photograph. No words beyond the H2, no 3D plate.  -z1n
   5 Nov 2026, Andrew: "The row of plates is nice." The cutaway ("One alloy, all the way through.") and evenThin are retired:
   section.js-prev-1105d has both.

   One plate, whole and large. The view eases back and tracks right: seven places in a row at the photograph's own spacing,
   thinning on one clock, each stopping at its own stage, then one empty place of bare ground. Stop anywhere and the row can
   still be read in one frame. Phones stack five places up the room.

   How a plate thins (make-assets.py bakes the field; the numpy there is this shader, for the stills). D is each pixel's
   distance from the plate's outside, holes included. L is the height of the plate's crest nearest it. tt = q * L takes off a
   share of each part's own width, so wide and narrow reach a fine line together, and on the crest L is D, so it never breaks.
   What's left is squeezed from ds = (D - tt) / (1 - q), so the pixel at the new edge shows the rim that was at the old edge.
   At q = 0 the output is the untouched photograph.

   Multiply: the canvas clears white and blends onto the stage's --bg-soft, so white paper equals the ground. Places multiply
   onto each other the same way.

   Reduced motion, and no WebGL: no pin, a still above the H2. Review hooks as the cutaway's: BMH.techCutaway.hold(p), .ready,
   .set({...}), .stats, .dpr(r). */
(function () {
  'use strict';
  const BMH = window.BMH, THREE = window.THREE;
  const sec = document.getElementById('s-tech-cutaway');
  if (!BMH || !sec) return;

  /* A board's overrides reach these by the same names: BMH_KNOBS = { 'tech-cutaway': { places: 5, endScale: 0.7 } } */
  const K = BMH.knobs('tech-cutaway', {
    scrollScreens: 2.0,        // the pin, desktop
    scrollScreensPhone: 1.6,   // the pin, phone
    trackFrom: 0.08,           // the view starts easing back (share of the pin)
    trackTo: 0.72,             // ...settled from here to the end of the pin
    places: 7,                 // plates in the row; one more empty place of bare ground is kept in the frame
    stages: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84],   // where each place stops, left to right. 0 whole, 1 nothing
    placesPhone: 5,
    stagesPhone: [0, 0.22, 0.45, 0.68, 0.86],
    startX: 0.56,              // where the first plate sits before the view moves (share of the width)
    endScale: 0.62,            // the settled scale at 1440 wide; it grows and shrinks with the window, never past 1 source px per CSS px
    step: [230, 70],           // one place to the next, source px: the photograph's own spacing
    /* phone: the plate's outline as a share of the width, and one place to the next in CSS px at the settled view, 375 wide */
    plateWidthPhone: 0.72,
    stepPhone: [0, 84],        // straight down, a little closer (Andrew, 18 Nov; was [10, 96])
    /* how the others arrive, since at scale 1 three more places would be in frame. 'spread': they start off the right of the
       frame and close up sideways as the view eases back, each at its own height, so nothing crosses the headline.
       'fade': each comes up pale in its place, left to right (it reads as a plate dissolving backwards) */
    reveal: 'spread',
    /* line two, "Then the entire substrate.", goes from pale to blue (--brand-mid) left to right as the row thins (Andrew,
       18 Nov). inkFrom/inkTo: where on the view's ease (0..1) the wipe starts and ends. inkLine false keeps it pale */
    inkLine: true,
    inkFrom: 0.15,
    inkTo: 0.95,
    maxDpr: 2
  });

  /* From make-assets.py. dmax undoes the field's packing; bbox is the matte's box in source px: what gets fitted and centred.
     tail is how far the photograph's own shadow runs past that box on the right, source px: fitted with it, or the frame clips it */
  const INFO = { w: 701, h: 496, dmax: 40.01, bbox: [49, 49, 652, 447], tail: 19 };
  const SRC = { photo: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/technology/03-cutaway/row-photo.webp', field: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/technology/03-cutaway/row-field.webp', still: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/technology/03-cutaway/row-still.webp', stillPhone: 'https://cdn.jsdelivr.net/gh/SuperDuperSecretAgency/biometal-health-assets@v2.0.1/v3/img/technology/03-cutaway/row-still-phone.webp', stillW: 1560, stillH: 618, phoneW: 696, phoneH: 1204 };
  const LABEL = 'A row of zinc alloy bone plates, each thinner than the last, from whole to a fine outline.';

  const stage = sec.querySelector('.cut__stage');
  const canvas = sec.querySelector('.cut__canvas');
  const title = sec.querySelector('.cut__title');
  const PHONE = window.matchMedia(BMH.PHONE_MQ || '(max-width: 900px)');

  function setPin() {
    sec.style.setProperty('--pin', BMH.reduced ? 0 : (PHONE.matches ? K.scrollScreensPhone : K.scrollScreens));
  }
  setPin();

  /* the plain frame: reduced motion, and a browser with no WebGL */
  function showPlain() {
    if (!sec.querySelector('.cut__plain')) {
      const fig = document.createElement('figure');
      fig.className = 'cut__plain cut__plain--row';
      fig.setAttribute('role', 'img');
      fig.setAttribute('aria-label', LABEL);
      const add = function (src, w, h, cls) {
        const im = new Image();
      im.crossOrigin = 'anonymous';   // Webflow: the photographs come from another host and WebGL needs them clean
        im.alt = ''; im.width = w; im.height = h; im.decoding = 'async'; im.className = cls || '';
        im.src = src;
        fig.appendChild(im);
      };
      add(SRC.still, SRC.stillW, SRC.stillH, 'cut__plain-wide');
      if (SRC.stillPhone) add(SRC.stillPhone, SRC.phoneW, SRC.phoneH, 'cut__plain-phone');
      stage.insertBefore(fig, stage.firstChild);
    }
    sec.classList.add('is-plain', 'is-ready');
    sec.style.setProperty('--pin', 0);
  }

  /* ---------------------------------------------------------------- the shader */
  const VERT = [
    'uniform vec4 uRect; varying vec2 vUv;',
    'void main() { vUv = uv; gl_Position = vec4(uRect.xy + position.xy * uRect.zw, 0.0, 1.0); }'
  ].join('\n');
  const FRAG = [
    'uniform sampler2D uPhoto, uField;',
    'uniform vec2 uSize;',
    'uniform float uDmax, uP, uAlpha, uPx, uLod;',
    'varying vec2 vUv;',
    'float rAt(vec2 uv) { return texture2DLodEXT(uField, uv, 0.0).r; }',
    'void main() {',
    '  vec2 tx = 1.0 / uSize;',
    '  vec3 F = texture2DLodEXT(uField, vUv, 0.0).rgb;',
    '  float D = F.r * uDmax, L = F.g * uDmax, M = F.b;',
    '  float q = min(uP, 0.985);',
    '  float tt = q * L;',
    '  float ds = min(max(D - tt, 0.0) / (1.0 - q), D);',
    /* which way is inward: the field's own slope, one texel and a half each side */
    '  vec2 e = tx * 1.5;',
    '  vec2 g = vec2(rAt(vUv + vec2(e.x, 0.0)) - rAt(vUv - vec2(e.x, 0.0)), rAt(vUv + vec2(0.0, e.y)) - rAt(vUv - vec2(0.0, e.y)));',
    '  g /= max(length(g), 1e-4);',
    '  vec2 src = vUv - g * (D - ds) * tx;',
    '  vec3 photo = texture2DLodEXT(uPhoto, vUv, uLod).rgb;',
    '  vec3 metal = texture2DLodEXT(uPhoto, src, uLod).rgb;',
    '  float fade = 1.0 - smoothstep(0.86, 1.0, uP);',
    '  float keep = smoothstep(0.0, 1.5, (D - tt) * uPx) * M * fade;',
    /* the ground: the photograph\'s own shadow leaves by p 0.14, or it would leave a white halo round a thinner plate;
       under the plate the paper is white once the plate starts to move, and exactly the photograph before that */
    '  vec3 soft = texture2DLodEXT(uPhoto, vUv, uLod + 3.0).rgb;',
    '  float gapW = 1.0 - min(soft.r, min(soft.g, soft.b));',
    '  vec3 paper = mix(vec3(1.0), photo, smoothstep(0.004, 0.02, gapW) * max(0.0, 1.0 - uP / 0.14));',
    '  paper = mix(paper, vec3(1.0), M * smoothstep(0.0, 0.02, q));',
    /* a soft shadow stays attached to the metal that is left: (5, 7) px right and down, as the photograph\'s light falls */
    '  vec2 Fo = texture2DLodEXT(uField, vUv + vec2(-5.0, 7.0) * tx, 0.0).rg * uDmax;',
    '  float S = 0.2 * smoothstep(-5.0, 5.0, Fo.x - q * Fo.y) * smoothstep(0.0, 3.0, Fo.x) * fade * min(1.0, uP / 0.14);',
    '  paper *= 1.0 - S * (1.0 - vec3(0.94, 0.95, 1.0) * 0.72);',
    '  gl_FragColor = vec4(mix(vec3(1.0), mix(paper, metal, keep), uAlpha), 1.0);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------------- state */
  let renderer = null, scene = null, cam = null, meshes = [], held = null, lastP = -1, visible = true, raf = 0, drawn = false;
  let dpr = 1, vw = 0, vh = 0, boxW = 0, boxH = 0, titleTop = 0, titleLeft = 0, navH = 72, boxesOk = false;
  let viewKey = '', V = null;
  const stats = { drawMs: 0, draws: 0 };

  function measure() {
    boxW = stage.clientWidth || window.innerWidth;
    boxH = stage.clientHeight || window.innerHeight;
    const tr = title.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    titleTop = tr.top - sr.top; titleLeft = tr.left - sr.left;
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'));
    navH = v > 0 ? v : 72;
    viewKey = '';
    boxesOk = true;
  }

  function loadImage(src) {
    return new Promise(function (ok, no) {
      const im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = no;
      im.src = src;
    });
  }
  function texture(im, mips) {
    const t = new THREE.Texture(im);
    t.encoding = THREE.LinearEncoding;                   // the photograph's sRGB values go straight to the canvas
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.generateMipmaps = !!mips;
    t.needsUpdate = true;
    return t;
  }
  function addQuad(photo, field) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      depthTest: false, depthWrite: false, toneMapped: false, transparent: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
      extensions: { shaderTextureLOD: true },
      uniforms: {
        uPhoto: { value: photo }, uField: { value: field },
        uSize: { value: new THREE.Vector2(INFO.w, INFO.h) }, uDmax: { value: INFO.dmax },
        uRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uP: { value: 0 }, uAlpha: { value: 1 }, uPx: { value: 1 }, uLod: { value: 0 }
      }
    }));
    m.frustumCulled = false;
    m.renderOrder = meshes.length;
    scene.add(m);
    meshes.push(m);
    return m;
  }
  /* one quad, its source's top-left at (x, y) CSS px, s CSS px per source px */
  function setQuad(m, x, y, s, p, alpha, w, h) {
    const u = m.material.uniforms, W = INFO.w * s, H = INFO.h * s;
    u.uRect.value.set((x + W / 2) / w * 2 - 1, 1 - (y + H / 2) / h * 2, W / w, H / h);
    u.uP.value = p;
    u.uAlpha.value = alpha;
    u.uPx.value = s * dpr;
    u.uLod.value = Math.max(0, Math.log2(1 / (s * dpr)));
    m.visible = alpha > 0.001;
  }

  /* ---------------------------------------------------------------- the room the headline leaves */
  function room(h) {
    const top = navH, bottom = Math.max(titleTop, h * 0.4);
    return { top: top, h: bottom - top, cy: (top + bottom) / 2 };
  }

  /* ---------------------------------------------------------------- the row
     A plain scale and translate, never past 1 source px per CSS px. The first plate's centre travels a straight line and
     the scale eases geometrically, so it reads as a camera easing back. */
  function rowView(w, h) {
    const key = [w, h, titleTop, navH, PHONE.matches, K.endScale, K.startX, K.reveal].join();
    if (key === viewKey && V) return V;
    viewKey = key;
    const b = INFO.bbox, bw = b[2] - b[0], bh = b[3] - b[1], r = room(h), phone = PHONE.matches;
    const stages = (phone ? K.stagesPhone : K.stages).slice(0, phone ? K.placesPhone : K.places);
    const n = stages.length;
    const bcx = (b[0] + b[2]) / 2, bcy = (b[1] + b[3]) / 2;
    let s0, s1, stepX, stepY, a0x, a0y, a1x, a1y, floor = null;
    if (phone) {
      /* fit the stack: the plate at its share of the width, the step in CSS px, all of it pulled in if the room is short */
      let sp = K.plateWidthPhone * w / bw, sx = K.stepPhone[0] * w / 375, sy = K.stepPhone[1] * w / 375;
      const tall = sp * bh + (n - 1) * sy, wide = sp * bw + (n - 1) * sx;
      const f = Math.min(1, r.h * 0.97 / tall, (w - 16) / wide);
      sp *= f; sx *= f; sy *= f;
      s1 = sp; stepX = sx / sp; stepY = sy / sp;
      s0 = Math.min(1, (w - 24) / (bw + INFO.tail), r.h * 0.9 / bh);
      a0x = (w - s0 * INFO.tail) / 2; a0y = r.cy;
      const left = (w - (sp * bw + (n - 1) * sx)) / 2, top = r.top + (r.h - (sp * bh + (n - 1) * sy)) / 2;
      a1x = left + sp * bw / 2; a1y = top + sp * bh / 2;
      floor = r.top + r.h - 8;                                        // the foot of the room, just above the headline
    } else {
      stepX = K.step[0]; stepY = K.step[1];
      const spanX = bw + n * stepX, spanY = bh + (n - 1) * stepY;     // n * stepX: the bare place is in the frame too
      s0 = Math.min(1, r.h * 0.96 / bh, w * 0.8 / bw);
      s1 = Math.min(1, K.endScale * w / 1440, (w - 32) / spanX, r.h * 0.96 / spanY);
      a0x = BMH.clamp(K.startX * w, s0 * bw / 2 + 16, Math.max(s0 * bw / 2 + 16, w - s0 * bw / 2 - 16)); a0y = r.cy;
      /* whole at the left, over the headline's first word, unless the window is wide enough to centre the row */
      a1x = Math.min(titleLeft, (w - s1 * (bw + (n - 1) * stepX)) / 2) + s1 * bw / 2;
      a1y = r.cy - s1 * spanY / 2 + s1 * bh / 2;
    }
    /* 'spread': the extra sideways gap at the start, source px, that puts the second plate just off the frame */
    const leftNow = a0x - s0 * bw / 2;                                // the first plate's left edge on screen
    const extra = K.reveal === 'spread' ? Math.max(0, (w + 24 - leftNow) / s0 - stepX) : 0;
    V = { s0: s0, s1: s1, stepX: stepX, stepY: stepY, a0x: a0x, a0y: a0y, a1x: a1x, a1y: a1y, stages: stages, n: n, extra: extra, bcx: bcx, bcy: bcy, top: Math.max.apply(null, stages), floor: floor, bh: bh };
    return V;
  }
  /* The height of a place's centre on screen. Desktop: wherever the view puts it. Phone: the stack only fits the room at the
     settled scale, so part way back the view would run the lower places down behind the headline. Each centre goes straight
     from a start held clear of the room's foot to its settled place instead: the scale eases below that line, so the foot
     of the plate never crosses the room's. Place 0's start is never held, so it still travels the view's own line. */
  function rowY(v, i, s, ay, t) {
    if (v.floor == null) return ay + s * i * v.stepY;
    const from = Math.min(v.a0y + v.s0 * i * v.stepY, v.floor - v.s0 * v.bh / 2);
    return BMH.lerp(from, v.a1y + v.s1 * i * v.stepY, t);
  }
  function drawRow(w, h, p) {
    const v = rowView(w, h), t = BMH.smooth(K.trackFrom, K.trackTo, p);
    const s = Math.exp(BMH.lerp(Math.log(v.s0), Math.log(v.s1), t));
    const ax = BMH.lerp(v.a0x, v.a1x, t), ay = BMH.lerp(v.a0y, v.a1y, t);
    const snap = t === 0 ? function (a) { return Math.round(a * dpr) / dpr; } : function (a) { return a; };   // pixel for pixel until the view moves
    const gap = v.stepX + v.extra * (1 - t), clock = t * v.top;
    for (let i = 0; i < meshes.length; i++) {
      if (i >= v.n) { meshes[i].visible = false; continue; }
      let alpha = 1;
      if (K.reveal === 'fade' && i > 0) {
        const a = 0.04 + (i - 1) * 0.1;
        alpha = BMH.smooth(a, a + 0.3, t);
      }
      setQuad(meshes[i], snap(ax - s * v.bcx + s * i * gap), snap(rowY(v, i, s, ay, t) - s * v.bcy), s, Math.min(v.stages[i], clock), alpha, w, h);
    }
  }

  /* ---------------------------------------------------------------- draw */
  function draw() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!renderer) return;
    const t0 = performance.now();
    if (!boxesOk) measure();                             // reads first; nothing below writes a style
    const p = held != null ? held : BMH.pinProgress(sec);
    const w = boxW, h = boxH;
    if (w !== vw || h !== vh) { renderer.setSize(w, h, false); vw = w; vh = h; }
    dpr = renderer.getPixelRatio();
    drawRow(w, h, p);
    if (K.inkLine) sec.style.setProperty('--cut-ink', BMH.smooth(K.inkFrom, K.inkTo, BMH.smooth(K.trackFrom, K.trackTo, p)).toFixed(4));
    renderer.render(scene, cam);
    drawn = true;
    stats.drawMs = performance.now() - t0;
    stats.draws++;
  }
  function request() { if (!raf && visible) raf = requestAnimationFrame(function () { raf = 0; draw(); }); }
  /* lastP belongs to the tick, as in the cutaway. If draw set it, a draw just ahead of the tick in the same frame would leave
     the tick nothing to ask for, and the canvas would move on every other frame of a scroll */
  function readScroll() {
    const p = held != null ? held : BMH.pinProgress(sec);
    if (p !== lastP || !drawn) { lastP = p; request(); }
  }

  /* ---------------------------------------------------------------- start */
  let resolveReady;
  const readyP = new Promise(function (r) { resolveReady = r; });
  const t0 = performance.now();
  BMH.techCutaway = {
    knobs: K, ready: readyP, stats: stats,
    get renderer() { return renderer; },
    set: function (o) { return readyP.then(function () { Object.assign(K, o || {}); viewKey = ''; boxesOk = false; setPin(); draw(); }); },
    hold: function (p) { held = p; return readyP.then(function () { draw(); }); },
    dpr: function (r) { if (renderer) { renderer.setPixelRatio(r); vw = 0; draw(); } }
  };

  if (BMH.reduced || !THREE) { showPlain(); resolveReady(); return; }

  Promise.all([loadImage(SRC.photo), loadImage(SRC.field)]).then(function (ims) {
    return BMH.idle(function () {
      try {
        renderer = BMH.renderer(canvas, { alpha: true, antialias: false, maxDpr: K.maxDpr });
      } catch (e) { renderer = null; }
      if (!renderer) { showPlain(); return; }
      renderer.setClearColor(0xffffff, 1);
      scene = new THREE.Scene();
      cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const photo = texture(ims[0], true), field = texture(ims[1], false);
      const count = Math.max(K.places, K.placesPhone);
      for (let i = 0; i < count; i++) addQuad(photo, field);
      draw();
      BMH.onScroll(readScroll);
      BMH.visible(sec, function (v) { visible = v; if (v) draw(); });
      const stale = function () { boxesOk = false; request(); };
      window.addEventListener('resize', stale);
      if ('ResizeObserver' in window) { const ro = new ResizeObserver(stale); ro.observe(stage); ro.observe(title); }
      if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', stale);
      const pose = function () { setPin(); stale(); };
      if (PHONE.addEventListener) PHONE.addEventListener('change', pose); else if (PHONE.addListener) PHONE.addListener(pose);
      BMH.techCutaway.setupMs = Math.round(performance.now() - t0);
      sec.classList.add('is-ready');
    });
  }).catch(function (err) {
    if (window.console) console.warn('technology/03-cutaway: the photograph failed to load', err);
    showPlain();
  }).then(function () { resolveReady(); });
})();
