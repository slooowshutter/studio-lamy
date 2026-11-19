/* Piccadilly Hairshop : aucune requête, aucun stockage, aucune réservation. */
(() => {
  'use strict';
  const SERVICES = {
    kobido: { name: 'Massage facial Kobido', duration: 60 },
    'coupe-barbe': { name: 'Coupe + barbe', duration: 60 },
    barbe: { name: 'Entretien barbe', duration: 25 }
  };
  // Plages communes aux sources : Planity et Icoiffeur. Minutes depuis minuit.
  const HOURS = { 2: [540, 1140], 3: [600, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const PARIS = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const LONG_DATE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const SHORT_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const NB = '\u00a0';

  function parisNow(date = new Date()) {
    const p = {};
    PARIS.formatToParts(date).forEach(part => { p[part.type] = part.value; });
    return { date: new Date(Date.UTC(+p.year, +p.month - 1, +p.day, 12)), minute: +p.hour * 60 + +p.minute };
  }
  const keyOf = date => date.toISOString().slice(0, 10);
  const hourText = minute => `${Math.floor(minute / 60)}${NB}h${minute % 60 ? NB + String(minute % 60).padStart(2, '0') : ''}`;
  function slotList(date, duration, now = parisNow()) {
    const hours = HOURS[date.getUTCDay()];
    if (!hours) return [];
    const result = [];
    const hash = Math.floor(date.getTime() / 86400000) + duration;
    for (let minute = hours[0], index = 0; minute + duration <= hours[1]; minute += 30, index++) {
      const past = keyOf(date) < keyOf(now.date) || (keyOf(date) === keyOf(now.date) && minute <= now.minute);
      const occupied = (hash + index * 7) % 6 === 1;
      result.push({ minute, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Déjà pris' : '' });
    }
    return result;
  }
  const mobileValid = value => /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));

  /* Interface : les fonctions de calendrier ci-dessus ne dépendent pas du DOM. */
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard-user');
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-user'); }, { passive: true });

  const state = { service: null, day: null, time: null, step: 0 };
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const announcement = $('#booking-announcement');
  const mobileBar = $('.mobile-bar');
  let transitionId = 0;
  let transitionTimer;

  function announce(text) { announcement.textContent = text; }
  function syncSummary() {
    $('#selection-service').textContent = state.service ? SERVICES[state.service].name : 'À choisir';
    $('#selection-day').textContent = state.day ? LONG_DATE.format(state.day) : 'À choisir';
    $('#selection-time').textContent = state.time !== null ? hourText(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.day) || (index > 2 && state.time === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function error(id, message) { $(id).textContent = message; }
  function clearErrors() { $$('.field-error').forEach(element => { element.textContent = ''; }); }
  function refreshSlots() {
    const currentNow = parisNow();
    const data = slotList(state.day, SERVICES[state.service].duration, currentNow);
    const list = $('#slots');
    list.replaceChildren();
    data.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute);
      input.disabled = slot.disabled; input.checked = state.time === slot.minute && !slot.disabled;
      const text = document.createElement('span'); text.className = 'slot-time'; text.textContent = hourText(slot.minute);
      label.append(input, text);
      if (slot.reason) { const note = document.createElement('small'); note.textContent = slot.reason; label.append(note); }
      list.append(label);
    });
    if (state.time !== null && !data.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    $('#slot-note').textContent = `${LONG_DATE.format(state.day)}. Créneaux fictifs, sans lien avec les disponibilités du salon. «${NB}Déjà pris${NB}» est un état de démonstration.`;
    if (!data.some(slot => !slot.disabled)) {
      const text = document.createElement('p');
      text.textContent = 'Aucun créneau à essayer ce jour-là. Revenez au choix du jour.';
      list.append(text);
    }
  }
  function renderDays() {
    const now = parisNow();
    const list = $('#days');
    list.replaceChildren();
    for (let index = 0; index < 14; index++) {
      const date = new Date(now.date.getTime() + index * 86400000);
      const closed = !HOURS[date.getUTCDay()];
      const noSlot = !closed && !slotList(date, SERVICES[state.service || 'kobido'].duration, now).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = keyOf(date);
      input.disabled = closed || noSlot;
      input.checked = state.day !== null && keyOf(state.day) === input.value && !input.disabled;
      input.setAttribute('aria-label', `${LONG_DATE.format(date)}${closed ? ', fermé' : noSlot ? ', aucun créneau' : ''}`);
      const day = document.createElement('span'); day.textContent = SHORT_DAY.format(date);
      const number = document.createElement('strong'); number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.textContent = SHORT_MONTH.format(date);
      label.append(input, day, number, month);
      if (closed || noSlot) { const note = document.createElement('small'); note.textContent = closed ? 'Fermé' : 'Passé'; label.append(note); }
      list.append(label);
    }
  }
  function showStep(index, focus = true) {
    state.step = index;
    clearErrors();
    if (index === 1) renderDays();
    if (index === 2) refreshSlots();
    syncSummary();
    clearTimeout(transitionTimer);
    const thisTransition = ++transitionId;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; panel.classList.remove('is-changing'); });
    const target = panels[index];
    if (!reduce.matches && !keyboard) {
      target.classList.add('is-changing');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (transitionId === thisTransition) target.classList.remove('is-changing');
      }));
      transitionTimer = setTimeout(() => target.classList.remove('is-changing'), 260);
    }
    if (focus) target.querySelector('h3').focus();
    announce(`Étape ${index + 1} sur 4 : ${stepButtons[index].textContent.replace(/^\s*\d+/, '').trim()}.`);
  }
  function chooseService(id) {
    if (!SERVICES[id]) return;
    if (state.service !== id) { state.day = null; state.time = null; }
    state.service = id;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    error('#error-service', '');
    syncSummary();
  }
  function validateSelection(next) {
    const invalid = (step, id, message, selector) => {
      if (state.step !== step) showStep(step, false);
      error(id, message); syncSummary(); $(selector)?.focus(); return false;
    };
    if (!state.service) {
      return invalid(0, '#error-service', 'Choisissez une prestation pour continuer.', 'input[name="prestation"]');
    }
    if (next >= 2) {
      const now = parisNow();
      const dayOK = state.day && keyOf(state.day) >= keyOf(now.date) && slotList(state.day, SERVICES[state.service].duration, now).some(slot => !slot.disabled);
      if (!dayOK) {
        state.day = null; state.time = null;
        return invalid(1, '#error-day', 'Choisissez un jour encore disponible dans cette simulation.', '#days input:not(:disabled)');
      }
    }
    if (next >= 3) {
      const exists = state.time !== null && slotList(state.day, SERVICES[state.service].duration).some(slot => slot.minute === state.time && !slot.disabled);
      if (!exists) {
        state.time = null;
        return invalid(2, '#error-time', 'Choisissez une heure encore disponible dans cette simulation.', '#slots input:not(:disabled)');
      }
    }
    return true;
  }
  function fieldValidity(input, errorId) {
    const valid = input.id === 'prenom' ? input.value.trim().length >= 2 : mobileValid(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    error(errorId, valid ? '' : input.id === 'prenom' ? 'Saisissez au moins deux caractères pour le prénom.' : 'Saisissez un mobile français à 10 chiffres, commençant par 06 ou 07, ou son format +33.');
    return valid;
  }

  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (validateSelection(next)) showStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step === 0 || validateSelection(step)) showStep(step);
  }));
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      state.day = new Date(`${input.value}T12:00:00Z`); state.time = null; error('#error-day', '');
    }
    if (input.name === 'heure') { state.time = Number(input.value); error('#error-time', ''); }
    syncSummary();
  });
  ['prenom', 'telephone'].forEach(id => {
    const input = $(`#${id}`);
    const errorId = id === 'prenom' ? '#error-name' : '#error-phone';
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') fieldValidity(input, errorId); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid'); error(errorId, '');
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) {
      const next = state.step + 1;
      if (validateSelection(next)) showStep(next);
      return;
    }
    if (!validateSelection(3)) return;
    const nameOK = fieldValidity($('#prenom'), '#error-name');
    const phoneOK = fieldValidity($('#telephone'), '#error-phone');
    if (!nameOK || !phoneOK) { $(!nameOK ? '#prenom' : '#telephone').focus(); return; }
    $('#success-recap').textContent = `${SERVICES[state.service].name}, ${LONG_DATE.format(state.day)}, à ${hourText(state.time)}. Votre choix reste une démonstration.`;
    form.hidden = true;
    $('#booking-success').hidden = false;
    stepButtons.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    $('#titre-succes').focus();
    announce('Simulation terminée. Aucun rendez-vous n’est pris, aucune donnée n’a été envoyée.');
    // Le récapitulatif n’a besoin d’aucune donnée personnelle.
    $('#prenom').value = ''; $('#telephone').value = '';
  });
  function reset() {
    form.reset();
    state.service = null; state.day = null; state.time = null; state.step = 0;
    $('#booking-success').hidden = true; form.hidden = false;
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    showStep(0);
  }
  $('#restart').addEventListener('click', reset);
  $$('[data-select]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (form.hidden) reset();
    chooseService(link.dataset.select); showStep(0);
  }));

  // La barre ne recouvre aucun champ pendant la saisie.
  document.addEventListener('focusin', event => { if (event.target.matches('input[type="text"], input[type="tel"]')) mobileBar.classList.add('is-hidden'); });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!document.activeElement.matches('input[type="text"], input[type="tel"]')) mobileBar.classList.remove('is-hidden');
    }, 0);
  });

  syncSummary();
  $('.booking-app').hidden = false;

  // Le contenu n’est masqué qu’après la mise en place de l’observateur.
  if ('IntersectionObserver' in window && !reduce.matches) {
    const reveals = $$('[data-reveal]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending'); observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    reveals.forEach((element, index) => {
      element.classList.add('is-pending');
      element.style.transitionDelay = `${index % 3 * 60}ms`;
      observer.observe(element);
    });
    reduce.addEventListener('change', () => {
      if (reduce.matches) { reveals.forEach(element => element.classList.remove('is-pending')); observer.disconnect(); }
    });
  }
  root.classList.add('js');
})();
