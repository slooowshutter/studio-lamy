/* L’atelier coiffure by mélanie · « Un premier jour ».
   Aucune requête réseau, aucun stockage, aucune transmission de formulaire. */
(() => {
  'use strict';

  // Fresha / iCoiffeur / Meilleur-coiffeur, relevé du 01/11/2026.
  // Horaires à confirmer. Minutes depuis minuit, dimanche = 0.
  const HOURS = [null, [540, 1110], [540, 1110], null, [540, 1110], [540, 1110], [510, 1050]];
  const DAY_MS = 86400000;
  const NB = '\u00a0';
  const parisFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const money = n => `${n}${NB}€`;
  const timeLabel = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const keyFromDate = date => date.toISOString().slice(0, 10);
  const dateLabel = key => dateFormatter.format(dateFromKey(key));

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(now).map(p => [p.type, p.value]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    return { key, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: dateFromKey(key).getUTCDay() };
  }

  function holidayName(key) {
    const fixed = { '01-01': 'Jour de l’An', '05-01': 'Fête du Travail', '05-08': '8 Mai', '07-14': 'Fête nationale', '08-15': 'Assomption', '11-01': 'Toussaint', '11-11': 'Armistice', '12-25': 'Noël' };
    if (fixed[key.slice(5)]) return fixed[key.slice(5)];
    const y = Number(key.slice(0, 4));
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(y, month - 1, day, 12);
    for (const [offset, name] of [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']]) {
      if (keyFromDate(new Date(easter + offset * DAY_MS)) === key) return name;
    }
    return '';
  }

  function buildSlots(key, duration, now = new Date()) {
    const hours = HOURS[dateFromKey(key).getUTCDay()];
    if (!hours || !Number.isFinite(duration) || duration <= 0) return [];
    const current = parisNow(now);
    const seed = [...key].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 17);
    const slots = [];
    for (let minutes = hours[0], index = 0; minutes + duration <= hours[1]; minutes += 30, index++) {
      const past = key < current.key || (key === current.key && minutes <= current.minutes);
      const taken = (seed + index * 7 + Math.floor(duration / 15)) % 9 < 2;
      slots.push({ minutes, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
    }
    return slots;
  }

  function buildDays(duration, now = new Date()) {
    const today = dateFromKey(parisNow(now).key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today.getTime() + index * DAY_MS), key = keyFromDate(date);
      const closed = !HOURS[date.getUTCDay()];
      const unavailable = !closed && !buildSlots(key, duration, now).some(slot => !slot.disabled);
      return { key, date, closed, unavailable, disabled: closed || unavailable, holiday: holidayName(key) };
    });
  }

  function validMobile(value) {
    return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));
  }

  // Petite surface de test pour les calculs ; aucune donnée client n’est exportée.
  if (typeof module !== 'undefined' && module.exports) module.exports = { HOURS, parisNow, holidayName, buildSlots, buildDays, validMobile };
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { step: 0, service: null, day: '', time: null, finished: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const success = $('#booking-success');
  const status = $('#booking-status');
  const firstName = $('#firstname');
  const phone = $('#telephone');
  let transitionTimer = null;
  let transitionFrame = null;
  let announcementTimer = null;
  let keyboard = false;

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-action'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-action'); }, true);
  function say(message) {
    clearTimeout(announcementTimer);
    status.textContent = '';
    announcementTimer = setTimeout(() => { status.textContent = message; }, 30);
  }
  function serviceFromInput(input) {
    return { id: input.value, name: input.dataset.name, duration: Number(input.dataset.duration), price: Number(input.dataset.price) };
  }
  function selectionText() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name}, le ${dateLabel(state.day)} à ${timeLabel(state.time)}. Tarif indicatif${NB}: ${money(state.service.price)}, à confirmer. Durée d’exemple${NB}: ${state.service.duration}${NB}min.`;
  }

  function updateSummary() {
    const values = { service: state.service ? state.service.name : 'À choisir', day: state.day ? dateLabel(state.day) : 'À choisir', time: state.time === null ? 'À choisir' : timeLabel(state.time), price: state.service ? `${money(state.service.price)} · à confirmer` : '—' };
    $$('[data-summary]').forEach(element => { element.textContent = values[element.dataset.summary]; });
    $('#final-recap').textContent = selectionText();
    stepButtons.forEach((button, index) => {
      button.disabled = state.finished || index > (state.time !== null ? 3 : state.day ? 2 : state.service ? 1 : 0);
      if (!state.finished && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
  }

  function makeRadio(name, value, disabled, checked, labelText) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', labelText);
    return input;
  }
  function makeSpan(className, text) {
    const span = document.createElement('span'); span.className = className; span.textContent = text; span.setAttribute('aria-hidden', 'true'); return span;
  }
  function renderDays() {
    if (!state.service) return;
    const group = $('#day-options');
    group.querySelectorAll('label').forEach(label => label.remove());
    const fragment = document.createDocumentFragment();
    buildDays(state.service.duration).forEach(day => {
      const label = document.createElement('label'); label.className = 'date-option';
      const stateText = [day.closed ? 'fermé' : day.unavailable ? 'complet' : '', day.holiday ? 'férié' : ''].filter(Boolean).join(' · ');
      const accessible = `${dateLabel(day.key)}${stateText ? ', ' + stateText : ''}${day.holiday ? ', ' + day.holiday + ', ouverture à confirmer' : ''}`;
      label.append(makeRadio('day', day.key, day.disabled, day.key === state.day, accessible));
      label.append(makeSpan('date-option__day', weekdayFormatter.format(day.date)), makeSpan('date-option__number', String(day.date.getUTCDate())), makeSpan('date-option__month', monthFormatter.format(day.date)), makeSpan('date-option__state', stateText));
      fragment.append(label);
    });
    group.append(fragment);
    $('#day-help').textContent = state.day && holidayName(state.day) ? `${holidayName(state.day)}${NB}: ouverture à confirmer auprès du salon.` : 'Les disponibilités affichées sont fictives. Aucun créneau réel n’est interrogé.';
  }
  function renderSlots() {
    const group = $('#slot-options');
    group.querySelectorAll('label').forEach(label => label.remove());
    if (!state.day || !state.service) return;
    const slots = buildSlots(state.day, state.service.duration);
    const fragment = document.createDocumentFragment();
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-option';
      label.append(makeRadio('time', String(slot.minutes), slot.disabled, state.time === slot.minutes, `${timeLabel(slot.minutes)}${slot.reason ? ', ' + slot.reason + ' dans la simulation' : ', disponible dans la simulation'}`));
      label.append(makeSpan('', timeLabel(slot.minutes)));
      if (slot.reason) { const small = document.createElement('small'); small.textContent = slot.reason; small.setAttribute('aria-hidden', 'true'); label.append(small); }
      fragment.append(label);
    });
    group.append(fragment);
    const hours = HOURS[dateFromKey(state.day).getUTCDay()];
    $('#slot-description').textContent = `${dateLabel(state.day)} · ${timeLabel(hours[0])} – ${timeLabel(hours[1])}, à confirmer. Les horaires barrés sont indisponibles dans la simulation.`;
    $('#slot-help').textContent = !slots.some(slot => !slot.disabled) ? 'Aucun horaire disponible pour cette durée. Revenez au choix du jour.' : holidayName(state.day) ? `${holidayName(state.day)}${NB}: ouverture à confirmer. Ces créneaux restent des exemples.` : 'Créneaux fictifs, calculés pour que la durée d’exemple tienne avant la fermeture.';
  }

  function cancelTransition() {
    clearTimeout(transitionTimer);
    if (transitionFrame !== null) cancelAnimationFrame(transitionFrame);
    transitionFrame = null;
    panels.forEach((panel, index) => {
      panel.classList.remove('is-entering', 'is-exiting'); panel.inert = false;
      panel.hidden = state.finished || index !== state.step;
    });
    success.classList.remove('is-entering', 'is-exiting');
  }
  function showStep(next, message = '') {
    if (state.finished) return;
    cancelTransition();
    const previous = panels.find(panel => !panel.hidden);
    const target = panels[next];
    const changed = previous !== target;
    state.step = next;
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    updateSummary();
    const instant = reduced.matches || keyboard || !changed;
    panels.forEach(panel => { panel.hidden = panel !== target && (!changed || panel !== previous || instant); });
    target.classList.toggle('is-entering', !instant);
    target.hidden = false;
    if (!instant) {
      // Le sortant se superpose au nouveau panneau : entrée et sortie durent
      // ensemble 240 ms, sans attendre et sans animer la hauteur du formulaire.
      previous.classList.add('is-exiting');
      previous.inert = true;
      void target.offsetWidth;
      transitionFrame = requestAnimationFrame(() => { target.classList.remove('is-entering'); transitionFrame = null; });
      transitionTimer = setTimeout(() => { previous.hidden = true; previous.inert = false; previous.classList.remove('is-exiting'); }, 240);
    }
    const heading = target.querySelector('.step-title');
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 20 || rect.bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'center', behavior: 'auto' });
    say(message || `Étape ${next + 1} sur 4. ${heading.textContent}`);
  }

  function checkFreshSelection() {
    if (!state.service) return 0;
    const day = buildDays(state.service.duration).find(item => item.key === state.day);
    if (!day || day.disabled) { state.day = ''; state.time = null; return 1; }
    if (!buildSlots(state.day, state.service.duration).some(slot => slot.minutes === state.time && !slot.disabled)) { state.time = null; return 2; }
    return null;
  }
  function clearValidation() {
    [firstName, phone].forEach(input => { input.removeAttribute('aria-invalid'); });
    $('#firstname-error').textContent = ''; $('#telephone-error').textContent = '';
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') {
      if (!state.service || input.value !== state.service.id) { state.day = ''; state.time = null; }
      state.service = serviceFromInput(input);
      say(`${state.service.name}, ${money(state.service.price)} à confirmer. Choisissez ensuite le jour.`);
    } else if (input.name === 'day') {
      state.day = input.value; state.time = null;
      $('#day-help').textContent = holidayName(state.day) ? `${holidayName(state.day)}${NB}: ouverture à confirmer auprès du salon.` : `${dateLabel(state.day)} sélectionné. Choisissez ensuite l’heure.`;
      say(`${dateLabel(state.day)} sélectionné.`);
    } else if (input.name === 'time') {
      state.time = Number(input.value); say(`${timeLabel(state.time)} sélectionné.`);
    }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (!state.service || (next >= 2 && !state.day) || (next >= 3 && state.time === null)) return;
    if (next >= 2) {
      const invalid = checkFreshSelection();
      // À l’étape jour, une heure n’a pas encore à être choisie.
      if (invalid !== null && invalid < next) { showStep(invalid, 'La date ou l’heure a changé. Merci de choisir un nouveau créneau d’exemple.'); return; }
    }
    showStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.finished) reset(false);
    const input = $(`input[name="service"][value="${link.dataset.service}"]`);
    input.checked = true;
    if (!state.service || state.service.id !== input.value) { state.day = ''; state.time = null; }
    state.service = serviceFromInput(input);
    showStep(0, `${state.service.name} présélectionné. Passez au choix du jour.`);
  }));
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(`#${input.id}-error`).textContent = '';
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.finished) return;
    if (state.step !== 3) { say('Complétez les étapes dans l’ordre avant de terminer la simulation.'); return; }
    const invalid = checkFreshSelection();
    if (invalid !== null) { showStep(invalid, 'Ce créneau d’exemple n’est plus disponible. Choisissez à nouveau.'); return; }
    clearValidation();
    let firstInvalid = null;
    if (!firstName.value.trim()) {
      firstName.setAttribute('aria-invalid', 'true'); $('#firstname-error').textContent = 'Indiquez un prénom, même pour l’exemple.'; firstInvalid = firstName;
    }
    if (!validMobile(phone.value)) {
      phone.setAttribute('aria-invalid', 'true'); $('#telephone-error').textContent = 'Utilisez un mobile français de 10 chiffres commençant par 06 ou 07, ou son format +33.'; firstInvalid = firstInvalid || phone;
    }
    if (firstInvalid) { firstInvalid.focus(); say('Vérifiez les champs signalés. Rien n’a été envoyé.'); return; }
    cancelTransition();
    state.finished = true;
    $('#success-recap').textContent = `${firstName.value.trim()}, voici votre sélection d’exemple${NB}: ${selectionText()}`;
    form.hidden = true; success.hidden = false;
    success.classList.toggle('is-entering', !reduced.matches && !keyboard);
    if (!reduced.matches && !keyboard) { void success.offsetWidth; transitionFrame = requestAnimationFrame(() => { success.classList.remove('is-entering'); transitionFrame = null; }); }
    updateSummary();
    success.querySelector('.step-title').focus({ preventScroll: true });
    success.scrollIntoView({ block: 'center', behavior: 'auto' });
    say('Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.');
    // Effacement immédiat des champs ; aucun numéro ne figure dans le résultat.
    firstName.value = ''; phone.value = '';
  });
  function reset(focus = true) {
    cancelTransition();
    state.service = null; state.day = ''; state.time = null; state.step = 0; state.finished = false;
    form.reset(); clearValidation(); $('#success-recap').textContent = ''; success.hidden = true; form.hidden = false;
    panels.forEach((panel, index) => { panel.hidden = index !== 0; });
    updateSummary();
    if (focus) showStep(0, 'La simulation a été réinitialisée.');
  }
  $('#restart').addEventListener('click', () => reset());
  // Les champs de démonstration ne survivent pas à la mise en cache de la page.
  window.addEventListener('pageshow', event => { if (event.persisted) reset(false); });
  window.addEventListener('pagehide', () => { firstName.value = ''; phone.value = ''; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.finished || !state.service) return;
    const invalid = state.day ? checkFreshSelection() : null;
    if (invalid !== null && state.step >= invalid) showStep(invalid, 'Les créneaux d’exemple ont été actualisés.');
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) { cancelTransition(); panels.forEach((panel, index) => { panel.hidden = index !== state.step || state.finished; }); }
  });

  $$('[data-weekday]').forEach(row => {
    if (Number(row.dataset.weekday) === parisNow().weekday) row.classList.add('is-today');
  });
  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .13, rootMargin: '0px 0px -20px 0px' });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('is-visible'));
  updateSummary();
  window.__atelierReady = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
