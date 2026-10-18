/* BioMetal Health | bmh-shim.js
   The section scripts in this folder are the HTML handoff's originals, unedited. They find their
   elements by the handoff's IDs and class names (#s-hero, .hero__canvas ...). The Webflow build
   uses Client-First classes instead, so each element a script needs carries a custom attribute:
     data-bmh-as="#s-hero"              -> gets id="s-hero"
     data-bmh-as=".hero__canvas"        -> gets class "hero__canvas"
     data-bmh-as="#s-x .a .b"           -> several at once
   The names added here have no Webflow styles; they only let the original scripts find things.
   Load this after the page content and before core.js and the section scripts. */
(function () {
  var els = document.querySelectorAll('[data-bmh-as]');
  for (var i = 0; i < els.length; i++) {
    var tokens = els[i].getAttribute('data-bmh-as').trim().split(/\s+/);
    for (var j = 0; j < tokens.length; j++) {
      var t = tokens[j];
      if (t.charAt(0) === '#') els[i].id = t.slice(1);
      else if (t.charAt(0) === '.') els[i].classList.add(t.slice(1));
    }
  }
})();
