/* Research 03 · by property.                                                     -z1n
   The list is static HTML (make-list.py). This does three things: runs the two tabs (By property /
   Research from BioMetal Health Members), opens a paper's row when an address points at it (#res-<paper>
   or #res-m-<paper>), and applies the layout knobs. Without JS both panels render one after the other
   and the tab row stays hidden. Nothing moves; the swap is instant. */
(function () {
  var KNOBS = window.BMH.knobs('res-by-property', {
    index: true,      // the row of six property links under the tabs
    sticky: true,     // desktop: the property's name stays in view while its list scrolls
    members: true     // the Members tab; false shows the property list alone (no tab row, panel 2 hidden)
  });

  var sec = document.getElementById('s-res-by-property');
  if (!sec) return;
  if (!KNOBS.index) sec.classList.add('is-noindex');
  if (!KNOBS.sticky) sec.classList.add('is-nosticky');

  var tabs = [].slice.call(sec.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  var bar = sec.querySelector('.byprop__tabs');

  function select(i, focus) {
    tabs.forEach(function (t, j) {
      var on = j === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }

  if (KNOBS.members && bar && tabs.length === 2) {
    bar.hidden = false;
    select(0);
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = tabs.length, to = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') to = (i + 1) % n;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') to = (i + n - 1) % n;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = n - 1;
        if (to < 0) return;
        e.preventDefault();
        select(to, true);
      });
    });
  } else if (!KNOBS.members && panels[1]) {
    panels[1].hidden = true;
    if (bar) bar.hidden = true;
  }

  // #res-members and #res-m-<id> are panel 2; any other #res-... is panel 1
  function openFor(hash, scroll) {
    if (!hash || hash.indexOf('#res-') !== 0) return;
    var el = document.getElementById(hash.slice(1));
    if (!el || !sec.contains(el)) return;
    var inMembers = !!(panels[1] && panels[1].contains(el));
    if (inMembers && !KNOBS.members) return;
    if (bar && !bar.hidden) select(inMembers ? 1 : 0);
    var d = el.querySelector('details');
    if (d) d.open = true;
    if (scroll) el.scrollIntoView();
  }

  sec.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#res-"]');
    if (a) openFor(a.getAttribute('href'));
  });
  // links from elsewhere on the page (the founders' "Jack's papers") arrive as a hash change
  window.addEventListener('hashchange', function () { openFor(location.hash, true); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#res-"]');
    if (a && !sec.contains(a)) openFor(a.getAttribute('href'));
  });
  openFor(location.hash, !!location.hash);
})();
