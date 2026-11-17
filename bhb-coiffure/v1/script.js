(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = {
    coupe: { name: 'Coupe & brushing', detail: 'Shampooing, coupe, soin et brushing.' },
    brushing: { name: 'Brushing', detail: 'Shampooing, soin et brushing.' },
    couleur: { name: 'Couleur', detail: 'Couleur, shampooing, coupe, soin et brushing.' },
    meches: { name: 'Mèches', detail: 'Mèches, shampooing, coupe, soin et brushing.' }
  };
  // Horaires hebdomadaires publiés sur Planity, relevés le 17/11/2026.
  // Aucun temps de prestation n’est déduit de ces heures.
  const hours = { 0: null, 1: null, 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1140], 6: [480, 1020] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthName = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const state = { length: 'courts', service: 'coupe', date: '', time: null, step: 0, reached: 0 };
  const form = $('#simulation-form');
  let panelFrame = 0;
  let started = false;
  let pointerInput = false;
  const announcement = $('[data-announcement]');

  document.addEventListener('pointerdown', () => {
    pointerInput = true;
    root.classList.remove('using-keyboard');
  }, { capture: true, passive: true });
  document.addEventListener('keydown', () => {
    pointerInput = false;
    root.classList.add('using-keyboard');
  }, { capture: true });

  function nowInParis(date = new Date()) {
    const parts = {};
    parisFormat.formatToParts(date).forEach(part => { parts[part.type] = part.value; });
    return {
      iso: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }
  const dateFromISO = iso => new Date(`${iso}T12:00:00Z`);
  function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hour}${NB}h${NB}${String(remainder).padStart(2, '0')}` : `${hour}${NB}h`;
  }
  function slotsFor(iso, now = nowInParis()) {
    const opening = hours[dateFromISO(iso).getUTCDay()];
    if (!opening) return [];
    const slots = [];
    for (let minute = opening[0]; minute < opening[1]; minute += 30) {
      slots.push({ minute, past: iso < now.iso || (iso === now.iso && minute <= now.minutes) });
    }
    return slots;
  }
  function say(message) { announcement.textContent = message; }
  function lengthName() { return state.length === 'courts' ? 'Cheveux courts' : 'Cheveux longs'; }
  function lengthDetail() { return state.length === 'courts' ? 'Jusqu’au-dessus des épaules.' : 'Aux épaules ou en dessous.'; }
  function selectionText() {
    let text = `${services[state.service].name}, cheveux ${state.length}`;
    if (state.date) text += `, ${longDate.format(dateFromISO(state.date))}`;
    if (state.time !== null) text += ` à ${formatTime(state.time)}`;
    return text + '.';
  }
  function updateSummary() {
    $('[data-summary-length]').textContent = lengthName();
    $('[data-summary-service]').textContent = services[state.service].name;
    $('[data-summary-day]').textContent = state.date ? longDate.format(dateFromISO(state.date)) : 'À choisir';
    $('[data-summary-time]').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    $('[data-final-recap]').textContent = 'Votre sélection pour l’essai : ' + selectionText();
    $('[data-mobile-summary]').textContent = selectionText();
  }
  function syncChoices(announce = false) {
    $$('[data-length]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.length === state.length)));
    $('[data-length-art]').dataset.lengthArt = state.length;
    $('[data-length-caption]').textContent = lengthDetail();
    $('[data-length-explanation]').textContent = lengthDetail();
    $$('input[name="longueur"]').forEach(input => { input.checked = input.value === state.length; });
    $$('[data-service]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.service === state.service)));
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === state.service; });
    $('[data-service-title]').textContent = services[state.service].name;
    $('[data-service-inclusions]').textContent = services[state.service].detail;
    $('[data-try-service]').setAttribute('aria-label', `Essayer la réservation : ${services[state.service].name}, cheveux ${state.length}`);
    updateSummary();
    if (announce) say(`${lengthName()}. ${lengthDetail()} Forfait : ${services[state.service].name}.`);
  }

  function makeRadio(name, value, description) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.setAttribute('aria-label', description);
    return input;
  }
  function span(className, value) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = value;
    return element;
  }
  function renderDays() {
    const target = $('[data-days]');
    const fragment = document.createDocumentFragment();
    const now = nowInParis();
    for (let offset = 0; offset < 14; offset++) {
      const date = dateFromISO(now.iso);
      date.setUTCDate(date.getUTCDate() + offset);
      const iso = date.toISOString().slice(0, 10);
      const opening = hours[date.getUTCDay()];
      const elapsed = opening && !slotsFor(iso, now).some(slot => !slot.past);
      const disabled = !opening || elapsed;
      const label = document.createElement('label');
      label.className = 'date-choice';
      const description = longDate.format(date) + (!opening ? ', fermé' : elapsed ? ', journée écoulée' : ', exemple pour la simulation');
      const input = makeRadio('jour', iso, description);
      input.disabled = disabled;
      input.checked = state.date === iso && !disabled;
      input.setAttribute('aria-describedby', 'erreur-jour');
      label.append(input, span('date-weekday', weekDay.format(date)), span('date-number', date.getUTCDate()), span('date-month', monthName.format(date)));
      if (disabled) label.append(span('date-closed', !opening ? 'Fermé' : 'Écoulé'));
      fragment.append(label);
    }
    target.replaceChildren(fragment);
  }
  function renderSlots() {
    const target = $('[data-slots]');
    target.replaceChildren();
    if (!state.date) return;
    const opening = hours[dateFromISO(state.date).getUTCDay()];
    $('[data-day-heading]').textContent = `${longDate.format(dateFromISO(state.date))} · horaires publiés : ${formatTime(opening[0])} – ${formatTime(opening[1])}.`;
    const fragment = document.createDocumentFragment();
    slotsFor(state.date).forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-choice';
      const input = makeRadio('heure', slot.minute, formatTime(slot.minute) + (slot.past ? ', heure passée' : ', exemple pour la simulation'));
      input.disabled = slot.past;
      input.checked = state.time === slot.minute && !slot.past;
      input.setAttribute('aria-describedby', 'erreur-heure');
      label.append(input, span('', formatTime(slot.minute)));
      fragment.append(label);
    });
    target.append(fragment);
  }
  function selectedTimeIsValid() {
    return Boolean(state.date && state.time !== null && slotsFor(state.date).some(slot => slot.minute === state.time && !slot.past));
  }
  function clearErrors() {
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
  }
  function updateSteps() {
    $$('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = step > state.reached;
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('[data-back]').hidden = state.step === 0;
  }
  function showStep(step, focus = true) {
    if (step < 0 || step > state.reached) return;
    cancelAnimationFrame(panelFrame);
    $$('.booking-panel').forEach(panel => { panel.hidden = true; panel.classList.remove('is-entering'); });
    form.hidden = false;
    $('.steps').hidden = false;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    const panel = $(`[data-panel="${step}"]`);
    panel.hidden = false;
    if (!reduced.matches && pointerInput) {
      panel.classList.add('is-entering');
      panelFrame = requestAnimationFrame(() => { panelFrame = requestAnimationFrame(() => panel.classList.remove('is-entering')); });
    }
    updateSteps();
    updateSummary();
    if (focus) $('h3', panel).focus();
    say(`Étape ${step + 1} sur 4 : ${$('h3', panel).textContent}`);
  }
  function resetBooking(keepChoice = false) {
    form.reset();
    if (!keepChoice) { state.length = 'courts'; state.service = 'coupe'; }
    state.date = '';
    state.time = null;
    state.reached = 0;
    state.step = 0;
    started = false;
    clearErrors();
    syncChoices();
    showStep(0, false);
  }

  $$('[data-length]').forEach(button => button.addEventListener('click', () => {
    state.length = button.dataset.length;
    if (!$('[data-success]').hidden) resetBooking(true);
    syncChoices(true);
  }));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    state.service = button.dataset.service;
    if (!$('[data-success]').hidden) resetBooking(true);
    syncChoices();
  }));
  $('[data-try-service]').addEventListener('click', event => {
    event.preventDefault();
    if (started || $('[data-success]').hidden === false) resetBooking(true);
    showStep(0);
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'longueur') { state.length = input.value; syncChoices(true); }
    if (input.name === 'prestation') { state.service = input.value; syncChoices(); }
    if (input.name === 'jour') {
      state.date = input.value;
      state.time = null;
      state.reached = 1;
      $('#erreur-jour').textContent = '';
      updateSteps();
      updateSummary();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      $('#erreur-heure').textContent = '';
      updateSummary();
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    started = true;
    if (state.step === 1 && (!state.date || !slotsFor(state.date).some(slot => !slot.past))) {
      $('#erreur-jour').textContent = 'Choisissez un jour proposé pour poursuivre l’essai.';
      $('input[name="jour"]:not(:disabled)').focus();
      return;
    }
    if (state.step === 2 && !selectedTimeIsValid()) {
      $('#erreur-heure').textContent = 'Choisissez une heure proposée pour poursuivre l’essai.';
      $('input[name="heure"]:not(:disabled)')?.focus();
      return;
    }
    state.reached = Math.max(state.reached, state.step + 1);
    showStep(state.step + 1);
  }));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $('[data-back]').addEventListener('click', () => showStep(state.step - 1));

  function validateField(input) {
    let message = '';
    const value = input.value.trim();
    if (input.id === 'prenom' && value && !/[\p{L}]/u.test(value)) message = 'Indiquez un prénom ou laissez ce champ vide.';
    if (input.id === 'telephone' && value) {
      const phone = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33').replace(/^\+33/, '0');
      if (!/^0[1-9]\d{8}$/.test(phone)) message = 'Indiquez un numéro français à 10 chiffres ou laissez ce champ vide.';
    }
    $(`#erreur-${input.id}`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }
  ['prenom', 'telephone'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateField(input);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!selectedTimeIsValid()) {
      state.time = null;
      state.reached = Math.min(state.reached, 2);
      showStep(state.date && slotsFor(state.date).some(slot => !slot.past) ? 2 : 1);
      const error = state.step === 2 ? $('#erreur-heure') : $('#erreur-jour');
      error.textContent = 'L’heure choisie est passée. Choisissez une nouvelle heure pour l’essai.';
      return;
    }
    const validName = validateField($('#prenom'));
    const validPhone = validateField($('#telephone'));
    if (!validName || !validPhone) { $('[aria-invalid="true"]').focus(); return; }
    form.hidden = true;
    $('.steps').hidden = true;
    $('[data-back]').hidden = true;
    const success = $('[data-success]');
    success.hidden = false;
    $('[data-success-recap]').textContent = ($('#prenom').value.trim() ? `${$('#prenom').value.trim()}, voici votre essai : ` : 'Voici votre essai : ') + selectionText();
    $('h3', success).focus();
    say('La simulation est terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.');
  });
  $('[data-restart]').addEventListener('click', () => {
    resetBooking();
    $('[data-panel="0"] h3').focus();
  });

  // Révélations uniques. La forme de fond se déplace sans déplacer son texte.
  function setupMotion() {
    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('service-chip')) {
          window.setTimeout(() => entry.target.classList.add('is-settled'), 700);
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    const blobs = $$('[data-blob]');
    const visibleBlobs = new Set();
    const blobObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) visibleBlobs.add(entry.target);
      else visibleBlobs.delete(entry.target);
    }), { rootMargin: '100px' });
    blobs.forEach(blob => blobObserver.observe(blob));
    let pending = false;
    function updateBlobs() {
      pending = false;
      if (reduced.matches) { blobs.forEach(blob => blob.style.removeProperty('transform')); return; }
      const positions = [...visibleBlobs].map(blob => ({ blob, top: blob.getBoundingClientRect().top }));
      positions.forEach(({ blob, top }) => {
        const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - top) / window.innerHeight));
        blob.style.transform = `rotate(${(progress * 1.8).toFixed(2)}deg) scale(${(1 + Math.abs(progress) * .012).toFixed(3)}, ${(1 - Math.abs(progress) * .008).toFixed(3)})`;
      });
    }
    function requestUpdate() {
      if (!pending) { pending = true; requestAnimationFrame(updateBlobs); }
    }
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    reduced.addEventListener('change', requestUpdate);
  }

  // Amélioration progressive : aucune information n’est masquée sans ce démarrage.
  root.classList.add('js');
  const fallback = window.setTimeout(() => root.classList.remove('js'), 2200);
  syncChoices();
  setupMotion();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('is-ready');
    window.clearTimeout(fallback);
  }));
})();
