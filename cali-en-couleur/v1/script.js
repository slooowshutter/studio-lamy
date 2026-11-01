(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.23,1,.32,1)';
  root.classList.add('js');
  root.dataset.input = 'pointeur';
  document.addEventListener('keydown', () => { root.dataset.input = 'clavier'; }, { passive: true });
  document.addEventListener('pointerdown', () => { root.dataset.input = 'pointeur'; }, { passive: true });
  const motionAllowed = () => !reducedMotion.matches && root.dataset.input !== 'clavier';

  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach((element) => observer.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add('is-visible'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const services = [
    { id: 'paraffine', name: 'Bain de paraffine', duration: 20, price: 19 },
    { id: 'depose', name: 'Dépose + semi-permanent', duration: 45, price: 33 },
    { id: 'manucure', name: 'Dépose + manucure + semi-permanent', duration: 60, price: 43 },
    { id: 'capsules', name: 'Capsules en gel, vernis couleur', duration: 90, price: 65 },
    { id: 'french', name: 'Capsules en gel, vernis french', duration: 100, price: 70 }
  ];
  const state = { service: null, day: null, time: null, step: 0, done: false };
  const euro = (value) => `${value}\u00a0€`;
  const timeLabel = (minutes) => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const durationLabel = (minutes) => minutes < 60 ? `${minutes}\u00a0min` : `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const fromDay = (iso) => new Date(`${iso}T12:00:00Z`);
  const formatDay = (iso) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fromDay(iso));
  function parisNow() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function openingHours(day) {
    return fromDay(day).getUTCDay() === 0 ? null : { open: 660, close: 1110 };
  }
  function slotsFor(day, service, clock = parisNow()) {
    const hours = openingHours(day);
    if (!hours || !service) return [];
    const seed = Math.floor(fromDay(day).getTime() / 86400000);
    const slots = [];
    for (let minute = hours.open; minute + service.duration <= hours.close; minute += 30) {
      const past = day < clock.day || (day === clock.day && minute <= clock.minutes);
      const occupied = (seed + minute / 30 + service.duration) % 7 === 0;
      slots.push({ minute, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Déjà pris' : '' });
    }
    return slots;
  }
  const announce = (text) => { $('#annonce-reservation').textContent = text; };
  function focusHeading(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function animatePanel(element, direction = 1) {
    element.getAnimations().forEach((animation) => animation.cancel());
    if (motionAllowed()) element.animate([
      { opacity: 0, transform: `translateX(${12 * direction}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 240, easing });
  }
  function animateSummary(element) {
    element.getAnimations().forEach((animation) => animation.cancel());
    if (motionAllowed()) element.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 180, easing });
  }
  function summaryText(selector, text) {
    const element = $(selector);
    if (element.textContent === text) return;
    element.textContent = text;
    animateSummary(element);
  }
  function updateSummary() {
    summaryText('#recap-soin', state.service ? state.service.name : 'À choisir');
    summaryText('#recap-jour', state.day ? formatDay(state.day) : 'À choisir');
    summaryText('#recap-heure', state.time !== null ? timeLabel(state.time) : 'À choisir');
    summaryText('#recap-prix', state.service ? euro(state.service.price) : '—');
    $('#recap-duree').textContent = state.service ? `Durée publiée\u00a0: ${durationLabel(state.service.duration)}. À confirmer.` : 'La durée s’affichera ici.';
    $('#vers-jour').disabled = !state.service;
    $('#vers-heure').disabled = !state.day;
    $('#vers-vous').disabled = state.time === null;
    updateNav();
  }
  function updateNav() {
    $$('.step-nav button').forEach((button, index) => {
      button.disabled = state.done || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null);
      if (!state.done && state.step === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(next, focus = true) {
    if (state.done || (next >= 1 && !state.service) || (next >= 2 && !state.day) || (next >= 3 && state.time === null)) return;
    const direction = next >= state.step ? 1 : -1;
    if (next === 1) renderDays();
    if (next === 2) renderTimes();
    state.step = next;
    $$('.booking-step').forEach((panel, index) => { panel.hidden = index !== next; });
    const active = $(`[data-panel="${next}"]`);
    updateNav();
    animatePanel(active, direction);
    if (focus) focusHeading(active.querySelector('h3'));
    announce(`Étape ${next + 1} sur 4\u00a0: ${active.querySelector('h3').textContent}`);
  }
  function chooseService(id) {
    const service = services.find((item) => item.id === id);
    if (!service) return;
    if (state.done) resetFlow(false);
    if (state.service?.id !== id) {
      state.service = service;
      state.time = null;
      if (state.day && !slotsFor(state.day, service).some((slot) => !slot.disabled)) state.day = null;
    }
    $(`input[name="prestation"][value="${id}"]`).checked = true;
    updateSummary();
    announce(`${service.name}, ${durationLabel(service.duration)}, ${euro(service.price)}. Prix Planity.`);
  }
  function createRadio(name, value) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    return input;
  }
  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }
  function renderDays() {
    const fieldset = $('#jours');
    fieldset.querySelectorAll('label').forEach((label) => label.remove());
    const clock = parisNow();
    const today = fromDay(clock.day);
    const lastDate = new Date(today);
    lastDate.setUTCDate(today.getUTCDate() + 13);
    const lastDay = lastDate.toISOString().slice(0, 10);
    if (state.day && (state.day < clock.day || state.day > lastDay || !slotsFor(state.day, state.service, clock).some((slot) => !slot.disabled))) {
      state.day = null;
      state.time = null;
      updateSummary();
    }
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + offset);
      const day = date.toISOString().slice(0, 10);
      const closed = !openingHours(day);
      const available = slotsFor(day, state.service, clock).some((slot) => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'date-option';
      const input = createRadio('jour', day);
      input.disabled = closed || !available;
      input.checked = state.day === day;
      const face = span('date-face', '');
      face.append(
        span('date-weekday', new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(date)),
        span('date-number', String(date.getUTCDate())),
        span('date-month', new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' }).format(date)),
        span('date-state', closed ? 'Fermé' : !available ? 'Sans créneau' : offset === 0 ? 'Aujourd’hui' : '')
      );
      input.setAttribute('aria-label', `${formatDay(day)}${closed ? ', fermé' : !available ? ', sans créneau d’exemple' : ''}`);
      label.append(input, face);
      input.addEventListener('change', () => {
        if (state.day !== day) state.time = null;
        state.day = day;
        $('#erreur-creneau').textContent = '';
        updateSummary();
        announce(`Jour choisi\u00a0: ${formatDay(day)}.`);
      });
      fieldset.append(label);
    }
  }
  function renderTimes() {
    const fieldset = $('#heures');
    fieldset.querySelectorAll('label').forEach((label) => label.remove());
    $('#jour-choisi').textContent = formatDay(state.day);
    const slots = slotsFor(state.day, state.service);
    if (state.time !== null && !slots.some((slot) => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      updateSummary();
    }
    $('#aucune-heure').hidden = slots.some((slot) => !slot.disabled);
    slots.forEach((slot) => {
      const label = document.createElement('label');
      label.className = 'time-option';
      const input = createRadio('heure', slot.minute);
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minute;
      const face = span('time-face', '');
      face.append(span('', timeLabel(slot.minute)));
      const reason = document.createElement('small');
      reason.textContent = slot.reason || 'Exemple';
      face.append(reason);
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.reason ? slot.reason.toLocaleLowerCase('fr-FR') : 'créneau d’exemple'}`);
      input.addEventListener('change', () => {
        state.time = slot.minute;
        $('#erreur-creneau').textContent = '';
        updateSummary();
        announce(`Heure choisie\u00a0: ${timeLabel(slot.minute)}.`);
      });
      label.append(input, face);
      fieldset.append(label);
    });
  }
  function setError(fieldId, message) {
    const input = $(`#${fieldId}`);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(`#erreur-${fieldId}`).textContent = message;
    return !message;
  }
  function validateName() {
    const value = $('#prenom').value.trim();
    return setError('prenom', value.length >= 2 && /\p{L}/u.test(value) ? '' : 'Indiquez votre prénom avec au moins deux caractères.');
  }
  function validatePhone() {
    const value = $('#telephone').value.replace(/[\s.()\-\u00a0]/g, '');
    return setError('telephone', /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(value) ? '' : 'Indiquez un mobile français valide, avec 10 chiffres pour un numéro en 06 ou 07.');
  }
  function resetFlow(focus = true) {
    Object.assign(state, { service: null, day: null, time: null, step: 0, done: false });
    $('#reservation-formulaire').reset();
    $('#reservation-formulaire').hidden = false;
    $('#resultat').hidden = true;
    $$('.step-nav')[0].hidden = false;
    $('#recap-resultat').textContent = '';
    $('#erreur-creneau').textContent = '';
    ['prenom', 'telephone'].forEach((id) => setError(id, ''));
    updateSummary();
    showStep(0, focus);
  }
  $$('input[name="prestation"]').forEach((input) => input.addEventListener('change', () => chooseService(input.value)));
  $$('[data-service]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    chooseService(link.dataset.service);
    showStep(1);
  }));
  $$('.step-nav button').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  $('#vers-jour').addEventListener('click', () => showStep(1));
  $('#vers-heure').addEventListener('click', () => showStep(2));
  $('#vers-vous').addEventListener('click', () => showStep(3));
  $('#prenom').addEventListener('blur', validateName);
  $('#telephone').addEventListener('blur', validatePhone);
  $('#prenom').addEventListener('input', () => { if ($('#prenom').getAttribute('aria-invalid') === 'true') setError('prenom', ''); });
  $('#telephone').addEventListener('input', () => { if ($('#telephone').getAttribute('aria-invalid') === 'true') setError('telephone', ''); });
  $('#recommencer').addEventListener('click', () => resetFlow());
  $('#reservation-formulaire').addEventListener('submit', (event) => {
    event.preventDefault();
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      (!nameValid ? $('#prenom') : $('#telephone')).focus();
      announce('Vérifiez les champs indiqués avant de terminer la simulation.');
      return;
    }
    const validSlot = state.service && state.day && state.time !== null && slotsFor(state.day, state.service).some((slot) => slot.minute === state.time && !slot.disabled);
    if (!validSlot) {
      state.time = null;
      updateSummary();
      showStep(state.day && state.day >= parisNow().day ? 2 : 1);
      $('#erreur-creneau').textContent = 'Ce créneau n’est plus disponible dans l’essai. Choisissez une nouvelle heure ou un autre jour.';
      announce($('#erreur-creneau').textContent);
      return;
    }
    state.done = true;
    $('#reservation-formulaire').hidden = true;
    $$('.step-nav')[0].hidden = true;
    $('#resultat').hidden = false;
    $('#recap-resultat').textContent = `${$('#prenom').value.trim()}, votre sélection d’exemple\u00a0: ${state.service.name}, le ${formatDay(state.day)} à ${timeLabel(state.time)}. ${durationLabel(state.service.duration)}, ${euro(state.service.price)} selon Planity, à confirmer.`;
    $('#telephone').value = '';
    $('#prenom').value = '';
    updateNav();
    animatePanel($('#resultat'));
    focusHeading($('#titre-resultat'));
    announce('Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.');
  });
  $('#parcours').hidden = false;
  updateSummary();
})();
