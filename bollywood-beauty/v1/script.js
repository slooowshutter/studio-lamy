/* Simulation locale : aucun envoi, aucune persistance, aucun suivi. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';
  const names = { fil: 'Épilation au fil', manucure: 'Manucure', pedicure: 'Pédicure', aisselles: 'Épilation des aisselles', visage: 'Soin du visage' };
  const state = { step: 0, service: '', day: '', time: null, complete: false };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const month = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  let entryTimer;
  let days = [];
  let keyboard = false;

  function parisNow(date = new Date()) {
    const parts = {};
    for (const part of parisFormat.formatToParts(date)) parts[part.type] = part.value;
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function fromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function todayKey(now = parisNow()) { return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`; }
  function timeLabel(minute) { return `${Math.floor(minute / 60)}${NB}h${minute % 60 ? NB + String(minute % 60).padStart(2, '0') : ''}`; }
  function slotList(key, now = parisNow()) {
    // La durée n’est pas publiée : ces départs n’impliquent aucune durée de soin.
    // Chaque heure proposée reste strictement dans la plage 10:30–19:00 de Treatwell.
    const hash = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = 630; minute < 1140; minute += 30) {
      const past = key < todayKey(now) || (key === todayKey(now) && minute <= now.minute);
      const unavailable = (hash + minute / 30) % 7 === 0;
      slots.push({ minute, disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans la simulation' : 'Créneau de démonstration' });
    }
    return slots;
  }
  function announce(text) { $('#booking-announcement').textContent = text; }
  function updateSummary() {
    $('#summary-service').textContent = names[state.service] || 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(fromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    stepButtons.forEach((button, i) => {
      const allowed = i === 0 || (i === 1 && state.service) || (i === 2 && state.service && state.day) || (i === 3 && state.service && state.day && state.time !== null);
      button.disabled = !allowed || state.complete;
      if (i === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    clearTimeout(entryTimer);
    state.step = index;
    panels.forEach((panel, i) => { panel.hidden = i !== index; panel.classList.remove('is-entering'); });
    const active = panels[index];
    if (!reduce.matches && !keyboard) {
      active.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => active.classList.remove('is-entering')));
      // Aucun verrou d’interaction ; même une nouvelle action immédiate est valide.
      entryTimer = setTimeout(() => active.classList.remove('is-entering'), 300);
    }
    updateSummary();
    if (focus) $(`#step-title-${index}`).focus();
    announce(`Étape ${index + 1} sur 4 : ${['choisir un soin', 'choisir un jour', 'choisir une heure', 'terminer la simulation'][index]}.`);
  }
  function createRadio(name, value, className) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    const span = document.createElement('span');
    label.append(input, span);
    return { label, input, span };
  }
  function renderDays() {
    const now = parisNow();
    const first = new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
    days = [];
    $('#day-options').replaceChildren();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(first.getTime() + offset * 86400000);
      const key = dateKey(date);
      days.push(key);
      const { label, input, span } = createRadio('jour', key, 'day-option');
      const available = slotList(key, now).some(slot => !slot.disabled);
      input.disabled = !available;
      input.checked = key === state.day;
      input.setAttribute('aria-label', `${longDate.format(date)}${available ? ', démonstration' : ', aucun départ de démonstration restant'}`);
      const weekday = document.createElement('span'); weekday.textContent = weekDay.format(date);
      const number = document.createElement('b'); number.textContent = String(date.getUTCDate());
      const monthName = document.createElement('span'); monthName.textContent = available ? month.format(date) : 'Terminé';
      span.append(weekday, number, monthName);
      input.addEventListener('change', () => {
        state.day = key; state.time = null;
        $('#day-error').textContent = ''; $('#time-error').textContent = ''; renderTimes(); updateSummary();
        announce(`${longDate.format(date)} sélectionné, dans la simulation.`);
      });
      $('#day-options').append(label);
    }
  }
  function renderTimes() {
    $('#time-options').replaceChildren();
    if (!state.day) return;
    for (const slot of slotList(state.day)) {
      const { label, input, span } = createRadio('heure', String(slot.minute), 'time-option');
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.reason.toLowerCase()}`);
      span.textContent = timeLabel(slot.minute);
      input.addEventListener('change', () => {
        state.time = slot.minute; $('#time-error').textContent = ''; updateSummary();
        announce(`${timeLabel(slot.minute)} sélectionné, dans la simulation.`);
      });
      $('#time-options').append(label);
    }
  }
  function selectedSlotStillAvailable() {
    return state.day && slotList(state.day).some(slot => slot.minute === state.time && !slot.disabled);
  }
  function next() {
    const errors = ['service-error', 'day-error', 'time-error'];
    const messages = ['Choisissez un soin pour continuer.', 'Choisissez un jour pour continuer.', 'Choisissez une heure pour continuer.'];
    const valid = [Boolean(state.service), Boolean(state.day), state.time !== null];
    if (!valid[state.step]) {
      $(`#${errors[state.step]}`).textContent = messages[state.step];
      const input = $('input:not(:disabled)', panels[state.step]);
      if (input) input.focus();
      return;
    }
    if (state.step === 1) renderTimes();
    if (state.step === 2 && !selectedSlotStillAvailable()) {
      state.time = null; renderTimes(); updateSummary();
      $('#time-error').textContent = 'Cette heure est passée. Choisissez un autre départ de démonstration.';
      return;
    }
    showStep(state.step + 1);
  }
  function validateField(input, error, valid, message) {
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    error.textContent = valid ? '' : message;
    return valid;
  }
  function checkName() {
    const input = $('#prenom');
    return validateField(input, $('#name-error'), input.value.trim().length > 0, 'Indiquez un prénom, même fictif, pour terminer l’essai.');
  }
  function checkPhone() {
    const input = $('#telephone');
    const normalized = input.value.replace(/[\s().-]/g, '').replace(/^0033/, '+33');
    return validateField(input, $('#phone-error'), /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalized), 'Indiquez un numéro français à 10 chiffres, ou au format +33.');
  }
  function reset() {
    form.reset(); state.service = ''; state.day = ''; state.time = null; state.step = 0; state.complete = false;
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    form.hidden = false; $('#booking-success').hidden = true;
    $('#success-recap').textContent = '';
    renderDays(); renderTimes(); showStep(0);
  }

  // Les interactions clavier n’attendent aucune transition décorative.
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => {
    state.service = input.value; $('#service-error').textContent = ''; updateSummary();
    announce(`${names[state.service]} sélectionné.`);
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click', next));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Math.max(0, state.step - 1))));
  stepButtons.forEach((button, i) => button.addEventListener('click', () => { if (i === 2 && state.day) renderTimes(); showStep(i); }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    const value = link.dataset.service;
    if (!names[value]) return;
    if (state.complete) reset();
    state.service = value;
    const radio = $(`input[name="prestation"][value="${value}"]`);
    radio.checked = true;
    $('#service-error').textContent = '';
    showStep(0, false);
    // L’ancre conserve son défilement natif et le focus arrive sur le titre utile.
    $('#step-title-0').focus({ preventScroll: true });
  }));
  $('#prenom').addEventListener('blur', checkName);
  $('#telephone').addEventListener('blur', checkPhone);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { next(); return; }
    const nameValid = checkName();
    const phoneValid = checkPhone();
    if (!nameValid || !phoneValid) { $(nameValid ? '#telephone' : '#prenom').focus(); return; }
    if (!selectedSlotStillAvailable()) {
      state.time = null; renderTimes(); showStep(2);
      $('#time-error').textContent = 'Cette heure est passée. Choisissez un autre départ de démonstration.';
      return;
    }
    state.complete = true;
    $('#success-recap').textContent = `${names[state.service]} — ${longDate.format(fromKey(state.day))}, à ${timeLabel(state.time)}. Votre sélection de démonstration.`;
    form.hidden = true; $('#booking-success').hidden = false;
    // Effacement immédiat des deux champs ; aucune donnée personnelle n’est reprise.
    $('#prenom').value = ''; $('#telephone').value = '';
    updateSummary();
    $('#success-title').focus();
    announce('Simulation terminée. Rien n’est réservé et aucune demande n’a été envoyée.');
  });
  $('#restart').addEventListener('click', reset);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.complete) return;
    if (days[0] !== todayKey()) {
      state.day = ''; state.time = null; renderDays(); renderTimes();
      if (state.step > 1) showStep(1, false);
      updateSummary();
    } else if (state.day) {
      if (state.time !== null && !selectedSlotStillAvailable()) state.time = null;
      renderTimes(); updateSummary();
    }
  });

  renderDays(); updateSummary(); $('#booking-app').hidden = false;
  // L’amélioration progressive est activée seulement après l’initialisation réussie.
  root.classList.add('js');
  const start = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  start();
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, i) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(i % 5) * 60}ms`;
      observer.observe(element);
    });
  } else $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
})();
