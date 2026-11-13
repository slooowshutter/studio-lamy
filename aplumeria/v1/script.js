/* Aplumeria — parcours local, aucune requête et aucun stockage de coordonnées. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    lissage: { name: 'Lissage brésilien', duration: null },
    ombre: { name: 'Ombré hair, cheveux courts', duration: 120 },
    coloration: { name: 'Coloration racines, cheveux courts', duration: 135 }
  };
  // Treatwell, recherche du 13/11/2026. Planity diverge : horaires à confirmer.
  const hours = { 0: null, 1: null, 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [570, 1110] };
  const state = { service: '', day: '', time: null, step: 0, reached: 0, success: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const next = $('#next');
  const previous = $('#previous');
  const finish = $('#finish');
  let transitionFrame = 0;
  let pointerAction = false;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function calendarDay(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function longDay(key) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(calendarDay(key));
  }
  function hourLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}\u00a0h\u00a0${String(minute).padStart(2, '0')}` : `${hour}\u00a0h`;
  }
  function slotsFor(key, duration, now = parisNow()) {
    const opening = hours[calendarDay(key).getUTCDay()];
    if (!opening || !duration) return [];
    const result = [];
    const seed = Number(key.replaceAll('-', ''));
    for (let minute = opening[0], index = 0; minute + duration <= opening[1]; minute += 30, index++) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const occupied = (seed + index * 7) % 9 === 0;
      result.push({ minute, disabled: past || occupied, label: past ? 'Passé' : occupied ? 'Occupé' : 'Fictif' });
    }
    return result;
  }
  function announce(text) { $('#booking-status').textContent = text; }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#summary-day').textContent = state.day ? longDay(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? hourLabel(state.time) : 'À choisir';
  }
  function validChoice(step) {
    if (step === 0) return Boolean(state.service && services[state.service].duration);
    if (step === 1) return Boolean(state.day && slotsFor(state.day, services[state.service]?.duration).some(slot => !slot.disabled));
    if (step === 2) return Boolean(state.day && state.time !== null && slotsFor(state.day, services[state.service]?.duration).some(slot => slot.minute === state.time && !slot.disabled));
    return true;
  }
  function updateControls() {
    previous.hidden = state.step === 0;
    finish.hidden = state.step !== 3;
    next.hidden = state.step === 3;
    next.disabled = !validChoice(state.step);
    const labels = ['Choisir un jour', 'Choisir une heure', 'Continuer'];
    if (state.step < 3) {
      next.replaceChildren(document.createTextNode(`${labels[state.step]} `));
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      next.append(arrow);
    }
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.reached || state.success;
      if (index === state.step && !state.success) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#lissage-notice').hidden = state.service !== 'lissage';
    updateSummary();
  }
  function revealPanel(panel, animate) {
    cancelAnimationFrame(transitionFrame);
    panels.forEach(item => item.classList.remove('is-entering'));
    if (!animate || reduceMotion.matches || !pointerAction) return;
    panel.classList.add('is-entering');
    transitionFrame = requestAnimationFrame(() => {
      transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
    });
  }
  function showStep(step, focus = true) {
    if (step > state.reached) return;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateControls();
    const panel = panels[step];
    revealPanel(panel, focus);
    if (focus) $('h3', panel).focus();
    announce(`Étape ${step + 1} sur 4. ${$('h3', panel).textContent}`);
  }
  function chooseService(value) {
    state.service = value;
    state.day = '';
    state.time = null;
    state.reached = 0;
    state.success = false;
    updateControls();
    announce(value === 'lissage' ? 'Lissage brésilien : durée à confirmer, appelez le salon.' : `${services[value].name}. Vous pouvez choisir un jour fictif.`);
  }
  function makeRadio(name, value, checked, disabled) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.checked = checked;
    input.disabled = disabled;
    return input;
  }
  function makeSpan(className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
  function renderDays() {
    const target = $('#days');
    target.replaceChildren();
    const today = parisNow();
    const start = calendarDay(today.key);
    for (let index = 0; index < 14; index++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const key = dateKey(date);
      const closed = !hours[date.getUTCDay()];
      const exhausted = !closed && !slotsFor(key, services[state.service].duration, today).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'date-choice';
      const radio = makeRadio('jour', key, state.day === key, closed || exhausted);
      const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const caption = closed ? 'Fermé' : exhausted ? 'Terminé' : month;
      radio.setAttribute('aria-label', `${longDay(key)}, ${closed ? 'fermé, à confirmer' : exhausted ? 'aucun créneau fictif restant' : 'jour fictif'}`);
      label.append(radio, makeSpan('date-day', weekday), makeSpan('date-number', String(date.getUTCDate())), makeSpan('date-label', caption));
      radio.addEventListener('change', () => {
        state.day = key;
        state.time = null;
        state.reached = 1;
        updateControls();
        announce(`${longDay(key)} sélectionné. Choisissez une heure à l’étape suivante.`);
      });
      target.append(label);
    }
  }
  function renderSlots() {
    const target = $('#slots');
    target.replaceChildren();
    const service = services[state.service];
    const opening = hours[calendarDay(state.day).getUTCDay()];
    $('#time-note').textContent = `${longDay(state.day)}. Horaires publiés : ${hourLabel(opening[0])}–${hourLabel(opening[1])}. Durée publiée : ${hourLabel(service.duration)}.`;
    const slots = slotsFor(state.day, service.duration);
    slots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-choice';
      const radio = makeRadio('heure', slot.minute, state.time === slot.minute, slot.disabled);
      radio.setAttribute('aria-label', `${hourLabel(slot.minute)}, ${slot.label === 'Occupé' ? 'occupé dans cet exemple' : slot.label === 'Passé' ? 'horaire passé' : 'créneau fictif'}`);
      label.append(radio, makeSpan('slot-time', hourLabel(slot.minute)), makeSpan('slot-state', slot.label));
      radio.addEventListener('change', () => { state.time = slot.minute; updateControls(); announce(`${hourLabel(slot.minute)} sélectionné, créneau fictif.`); });
      target.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      target.append(makeSpan('empty-slots', 'Aucun créneau fictif restant ce jour. Revenez au choix du jour.'));
    }
  }
  function setFieldError(field, errorId, text) {
    field.setAttribute('aria-invalid', text ? 'true' : 'false');
    $(errorId).textContent = text;
    return !text;
  }
  function validateName() {
    const field = $('#first-name');
    return setFieldError(field, '#name-error', field.value.trim() ? '' : 'Indiquez un prénom pour cet essai.');
  }
  function validatePhone() {
    const field = $('#telephone');
    const normalized = field.value.replace(/[\s.()\-]/g, '');
    const valid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalized);
    return setFieldError(field, '#phone-error', valid ? '' : 'Indiquez un numéro français de 10 chiffres, ou au format +33.');
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'prestation') chooseService(event.target.value);
  });
  next.addEventListener('click', () => {
    if (!validChoice(state.step)) {
      updateControls();
      announce('Ce choix doit être actualisé. Sélectionnez un jour ou une heure dans la simulation.');
      return;
    }
    state.reached = Math.max(state.reached, state.step + 1);
    showStep(state.step + 1);
  });
  previous.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $('#first-name').addEventListener('blur', validateName);
  $('#telephone').addEventListener('blur', validatePhone);
  $('#first-name').addEventListener('input', event => {
    if (event.target.getAttribute('aria-invalid') === 'true' && event.target.value.trim()) setFieldError(event.target, '#name-error', '');
  });
  $('#telephone').addEventListener('input', event => {
    if (event.target.getAttribute('aria-invalid') === 'true') setFieldError(event.target, '#phone-error', '');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      (!nameValid ? $('#first-name') : $('#telephone')).focus();
      announce('Vérifiez les champs signalés avant de terminer l’essai.');
      return;
    }
    if (!validChoice(2)) {
      state.time = null;
      showStep(2);
      announce('L’heure choisie est passée. Choisissez un autre créneau fictif.');
      return;
    }
    state.success = true;
    form.hidden = true;
    $('#success').hidden = false;
    $('#success-recap').textContent = `${services[state.service].name} · ${longDay(state.day)} · ${hourLabel(state.time)}. Sélection fictive, sans réservation.`;
    updateControls();
    $('#success h3').focus();
    announce('Simulation terminée. Aucun rendez-vous pris, aucune coordonnée envoyée.');
    form.reset();
  });
  $('#restart').addEventListener('click', () => {
    Object.assign(state, { service: '', day: '', time: null, step: 0, reached: 0, success: false });
    form.reset();
    setFieldError($('#first-name'), '#name-error', '');
    setFieldError($('#telephone'), '#phone-error', '');
    form.hidden = false;
    $('#success').hidden = true;
    showStep(0);
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    form.hidden = false;
    $('#success').hidden = true;
    const value = link.dataset.service;
    $(`input[name="prestation"][value="${value}"]`).checked = true;
    chooseService(value);
    showStep(0);
  }));

  document.addEventListener('pointerdown', () => { pointerAction = true; root.classList.remove('keyboard-use'); }, { passive: true });
  document.addEventListener('keydown', () => { pointerAction = false; root.classList.add('keyboard-use'); });
  $('#simulation').hidden = false;
  showStep(0, false);

  // Les révélations sont ajoutées seulement une fois l’interface initialisée.
  root.classList.add('js');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal], [data-band]').forEach(element => observer.observe(element));
  } else {
    $$('[data-reveal], [data-band]').forEach(element => element.classList.add('is-visible'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

  const bar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const observed = [$('.hero'), $('#rendez-vous'), $('.footer')];
    const visibility = new Map(observed.map(element => [element, false]));
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      bar.classList.toggle('is-hidden', [...visibility.values()].some(Boolean));
    }, { threshold: 0 });
    observed.forEach(element => barObserver.observe(element));
  }
})();
