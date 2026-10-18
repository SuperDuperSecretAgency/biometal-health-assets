/* Contact · 01 · Talk to us: the form, and the faint x-ray behind the headline.     -z1n
   The x-ray develops out of the field once as the page opens (CSS, timed by the knobs below);
   nothing else moves. Reduced motion shows it settled. The email is checked in place; a good
   submit calls send(), and when that resolves the form gives way to one line, which takes the focus. */
(function () {
  'use strict';

  /* ======================== ENGINEERS: WIRE THE SEND HERE ========================
     send(data) is called once per valid submit, with every field trimmed:
       { form: 'contact', name, email, message }
     Return a Promise. Resolve when the message is accepted: the form gives way to the thanks line.
     Reject when it fails: the form stays, keeps what was typed, and shows its failure line.
     Until it is wired it sends nothing and resolves straight away. There's no backend yet. */
  function send(data) {
    return Promise.resolve(data);
  }
  /* =============================================================================== */

  const KNOBS = window.BMH.knobs('contact-form', {
    /* the x-ray */
    opacity: 0.9,          // how strongly the film reads on wide screens: 1 = the full shared treatment
    phoneOpacity: 0.55,    // on phones, where it sits closer to the words
    plateGap: '2rem',      // wide screens: the space from the last line of words down to the top of the plate
    left: '-3.5rem',       // the film's left edge against the headline's
    width: 'min(34vw, 460px)',  // the film's width
    phoneTop: '-6.5rem',   // on phones it hangs off the right edge
    phoneRight: '-24vw',
    phoneWidth: '70vw',
    entrance: true,        // the film develops out of the field once as the page opens (false = simply there)
    developMs: 1800,       // how long it takes to develop
    delayMs: 150,          // the wait before it starts
    pushFrom: 1.0,         // its scale as it starts (larger = closer)
    pushTo: 1.04,          // its scale once settled
    /* the form, as on the Partner page */
    line: 'navy',          // the resting box line: 'navy' (--brand, like the button's edge) or 'blue' (--brand-mid)
    align: 'top'           // the headline against the form: 'top' (level with its first field) or 'center'
  });

  const sec = document.getElementById('s-contact-form');
  if (!sec) return;
  const set = function (k, v) { sec.style.setProperty(k, String(v)); };
  set('--cx-o-wide', KNOBS.opacity);
  set('--cx-o-phone', KNOBS.phoneOpacity);
  set('--cx-gap', KNOBS.plateGap);
  set('--cx-left', KNOBS.left);
  set('--cx-w', KNOBS.width);
  set('--cx-phone-top', KNOBS.phoneTop);
  set('--cx-phone-right', KNOBS.phoneRight);
  set('--cx-phone-w', KNOBS.phoneWidth);
  set('--cx-from', KNOBS.pushFrom);
  set('--cx-to', KNOBS.pushTo);
  set('--cx-dur', KNOBS.developMs + 'ms');
  set('--cx-delay', KNOBS.delayMs + 'ms');
  sec.classList.toggle('is-still', !KNOBS.entrance);
  sec.classList.toggle('is-line-blue', KNOBS.line === 'blue');
  sec.classList.toggle('is-center', KNOBS.align === 'center');

  /* the page is short: the section and the shared footer make the first screen together */
  const foot = document.querySelector('.site-foot');
  function measureFoot() { if (foot) set('--contact-foot', foot.offsetHeight + 'px'); }
  measureFoot();
  if (foot && 'ResizeObserver' in window) new ResizeObserver(measureFoot).observe(foot);

  wireForm(sec, 'contact', send);

  /* ---- the form's behaviour: shared, line for line, with partner-program/06-form/section.js ---- */
  function wireForm(root, name, sendFn) {
    const form = root.querySelector('.bform__form');
    const done = root.querySelector('.bform__done');
    if (!form || !done) return;
    const email = form.querySelector('input[type="email"]');
    const err = document.getElementById(email.getAttribute('aria-describedby'));
    const fail = form.querySelector('.bform__fail');
    const btn = form.querySelector('.bform__send');
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const wide = window.matchMedia('(min-width: 901px)');
    let sending = false;

    function problem() {
      const v = email.value.trim();
      if (!v) return err.dataset.empty;
      return EMAIL.test(v) ? '' : err.dataset.bad;
    }
    function flag(msg) {
      err.textContent = msg;
      email.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }

    /* leaving a half-typed address says so; an empty field is left alone until submit */
    email.addEventListener('blur', function () { if (email.value.trim()) flag(problem()); });
    /* once flagged, the flag lifts the moment the address is good */
    email.addEventListener('input', function () {
      if (email.getAttribute('aria-invalid') === 'true' && !problem()) flag('');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      const p = problem();
      if (p) { flag(p); email.focus(); return; }
      flag('');
      fail.textContent = '';
      sending = true;
      form.classList.add('is-sending');
      btn.setAttribute('aria-disabled', 'true');

      const data = { form: name };
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });

      Promise.resolve().then(function () { return sendFn(data); }).then(function () {
        /* on a wide screen the form's space is kept, so the footer doesn't jump up */
        if (wide.matches) done.parentNode.style.minHeight = form.offsetHeight + 'px';
        form.hidden = true;
        done.hidden = false;
        done.focus();
      }, function () {
        sending = false;
        form.classList.remove('is-sending');
        btn.removeAttribute('aria-disabled');
        fail.textContent = fail.dataset.msg;
      });
    });
  }
})();
