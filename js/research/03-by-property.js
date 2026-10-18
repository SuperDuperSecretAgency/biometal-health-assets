/* Research 03 · by property.                                                     -z1n
   The list is static HTML (make-list.py). This only opens a paper's abstract when a link points
   at it (a #res-<paper> address), and applies two layout knobs.
   Nothing moves. */
(function () {
  var KNOBS = window.BMH.knobs('res-by-property', {
    index: true,      // the row of six property links under the headline
    sticky: true      // desktop: the property's name stays in view while its list scrolls
  });

  var sec = document.getElementById('s-res-by-property');
  if (!sec) return;
  if (!KNOBS.index) sec.classList.add('is-noindex');
  if (!KNOBS.sticky) sec.classList.add('is-nosticky');

  function openFor(hash) {
    if (!hash || hash.indexOf('#res-') !== 0) return;
    var el = document.getElementById(hash.slice(1));
    if (!el || !sec.contains(el)) return;
    var d = el.querySelector('details');
    if (d) d.open = true;
  }

  sec.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#res-"]');
    if (a) openFor(a.getAttribute('href'));
  });
  window.addEventListener('hashchange', function () { openFor(location.hash); });
  openFor(location.hash);
})();
