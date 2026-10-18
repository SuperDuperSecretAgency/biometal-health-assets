/* Research 04 · Under the microscope: the as-cast / extruded slider.               -z1n
   Nothing moves on its own. The divider moves only when someone drags it, taps it, or uses the
   keyboard on the range input underneath (arrows, Page Up/Down, Home/End). Touch drags take over
   only once a gesture is clearly sideways, so a vertical swipe over the image still scrolls.
   Round 2: a corner tag hides as soon as the divider reaches it (measured, since the tags now
   carry two lines). Round 1 is section-prev-r2.js. */
(function () {
  'use strict';
  var root = document.getElementById('s-res-microscope');
  if (!root || !window.BMH) return;

  var KNOBS = window.BMH.knobs('res-microscope', {
    start: 50,        // where the divider starts, % from the left (100 = all "as cast", 0 = all "after extrusion")
    scaleBar: false,  // false crops the patent's black scale-bar band and puts 500× / 1,000× in the corner tags; true keeps the bands
    tagHide: 'auto'   // 'auto' hides a corner tag once the divider reaches it; a number hides it within that % of its side
  });

  var slide = root.querySelector('.slide');
  var range = root.querySelector('.slide__range');
  if (!slide || !range) return;
  var tagL = slide.querySelector('.slide__tag--l');
  var tagR = slide.querySelector('.slide__tag--r');
  var clamp = window.BMH.clamp;
  var lim = { l: 22, r: 22 }, cur = KNOBS.start;

  // How far in from each side (in %) the divider can come before it touches that side's tag.
  function measure() {
    if (typeof KNOBS.tagHide === 'number') { lim.l = lim.r = KNOBS.tagHide; return; }
    var w = slide.clientWidth;
    if (!w || !tagL || !tagR) return;
    lim.l = (tagL.offsetLeft + tagL.offsetWidth + 10) / w * 100;
    lim.r = (w - tagR.offsetLeft + 10) / w * 100;
  }

  if (!KNOBS.scaleBar) slide.classList.add('is-nobar');

  function set(v) {
    v = clamp(v, 0, 100);
    cur = v;
    slide.style.setProperty('--pos', v.toFixed(2) + '%');
    var r = Math.round(v);
    if (+range.value !== r) range.value = r;
    range.setAttribute('aria-valuetext',
      r >= 100 ? 'All as cast' : r <= 0 ? 'All after extrusion' : r + '% as cast, ' + (100 - r) + '% after extrusion');
    slide.classList.toggle('is-hide-l', v < lim.l);
    slide.classList.toggle('is-hide-r', v > 100 - lim.r);
  }
  function setFromX(x) {
    var b = slide.getBoundingClientRect();
    if (b.width > 0) set((x - b.left) / b.width * 100);
  }

  function capture(id) { try { slide.setPointerCapture(id); } catch (err) { /* pointer already gone */ } }

  var drag = null;
  slide.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, mouse: e.pointerType === 'mouse' };
    if (drag.mouse) {
      e.preventDefault();
      capture(e.pointerId);
      slide.classList.add('is-drag');
      try { range.focus({ preventScroll: true }); } catch (err) { /* old browsers */ }
      setFromX(e.clientX);
    }
  });
  slide.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.mouse && !drag.moved) {
      var dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
      if (dx < 5 && dy < 5) return;
      if (dy > dx) { drag = null; return; }          // a scroll, not a drag
      capture(e.pointerId);
      slide.classList.add('is-drag');
    }
    drag.moved = true;
    setFromX(e.clientX);
  });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (e.type === 'pointerup' && !drag.mouse && !drag.moved) setFromX(e.clientX);   // a tap jumps there
    drag = null;
    slide.classList.remove('is-drag');
  }
  slide.addEventListener('pointerup', end);
  slide.addEventListener('pointercancel', end);
  slide.addEventListener('lostpointercapture', function () { slide.classList.remove('is-drag'); });

  range.addEventListener('input', function () { set(+range.value); });

  measure();
  set(KNOBS.start);
  if (window.ResizeObserver) new ResizeObserver(function () { measure(); set(cur); }).observe(slide);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); set(cur); });
})();
