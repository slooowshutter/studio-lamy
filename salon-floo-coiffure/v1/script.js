/* Salon Floo Coiffure — démonstration locale, sans envoi ni stockage. */
(() => {
  'use strict';

  const NB = '\u00a0';
  const SERVICES = Object.freeze({ femme: 'Coupe femme', enfant: 'Coupe enfant', meches: 'Mèches' });
  // Plages concordantes des annuaires. Jeudi inconnu, donc exclu de l’essai.
  const HOURS = Object.freeze({ 2: [540, 1140], 3: [540, 1140], 5: [540, 1140], 6: [540, 1080] });
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(now).map(part => [part.type, part.value]));
    return { date: new Date(Date.UTC(+p.year, +p.month - 1, +p.day, 12)), minutes: +p.hour * 60 + +p.minute };
  }
  const key = date => date.toISOString().slice(0, 10);
  const hourText = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;

  function holiday(date) {
    // Jours fériés métropolitains : exclus, aucune ouverture exceptionnelle supposée.
    const year = date.getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key(date).slice(5))) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(year, month - 1, day, 12);
    return [1, 39, 50].some(offset => key(new Date(easter + offset * 86400000)) === key(date));
  }
  function dayReason(date) {
    if ([0, 1].includes(date.getUTCDay())) return 'Fermé';
    if (date.getUTCDay() === 4 || holiday(date)) return 'À confirmer';
    return '';
  }
  function slotsFor(date, now = new Date()) {
    if (dayReason(date)) return [];
    const hours = HOURS[date.getUTCDay()];
    if (!hours) return [];
    const current = parisNow(now);
    if (key(date) < key(current.date)) return [];
    const slots = [];
    // Heures de début seulement : l’intervalle ne décrit aucune durée de prestation.
    for (let minutes = hours[0]; minutes < hours[1]; minutes += 60) {
      if (key(date) !== key(current.date) || minutes > current.minutes) slots.push(minutes);
    }
    return slots;
  }
  function daysFrom(now = new Date()) {
    const current = parisNow(now);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(current.date.getTime() + offset * 86400000);
      return { date, reason: dayReason(date) || (slotsFor(date, now).length ? '' : 'Terminé') };
    });
  }
  function phoneValid(value) { return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(value.replace(/[\s.()\-]/g, '')); }

  // Le même moteur se vérifie avec Node, sans dépendance ni navigateur.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SERVICES, HOURS, parisNow, key, hourText, dayReason, slotsFor, daysFrom, phoneValid, holiday };
  }
  if (typeof document === 'undefined') return;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { service: '', date: null, minutes: null, step: 0 };
  const form = $('#booking-form');
  const stepButtons = $$('[data-step]');
  const panels = $$('[data-panel]');
  let panelAnimation;
  let summaryAnimation;

  root.dataset.input = 'pointeur';
  document.addEventListener('keydown', () => { root.dataset.input = 'clavier'; });
  document.addEventListener('pointerdown', () => { root.dataset.input = 'pointeur'; }, { passive: true });
  function mayAnimate() { return !reduced.matches && root.dataset.input !== 'clavier'; }
  function announce(message) { $('#booking-status').textContent = message; }
  function animateElement(element, direction = 1) {
    if (!mayAnimate() || !element.animate) return null;
    return element.animate([
      { opacity: .2, transform: `translateX(${direction * 10}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 220, easing: 'cubic-bezier(.23, 1, .32, 1)' });
  }
  function updateSummary() {
    $('#summary-service').textContent = SERVICES[state.service] || 'À choisir';
    $('#summary-day').textContent = state.date ? fullDateFormatter.format(state.date) : 'À choisir';
    $('#summary-time').textContent = state.minutes === null ? 'À choisir' : hourText(state.minutes);
    if (summaryAnimation) summaryAnimation.cancel();
    if (mayAnimate() && $('.selection dl').animate) {
      summaryAnimation = $('.selection dl').animate([{ opacity: .35 }, { opacity: 1 }], { duration: 180 });
    }
    stepButtons.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.date) || (index > 2 && state.minutes === null));
    });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.date;
    $('[data-next="3"]').disabled = state.minutes === null;
  }
  function showStep(index) {
    if (stepButtons[index].disabled) return;
    const direction = index >= state.step ? 1 : -1;
    state.step = index;
    if (panelAnimation) panelAnimation.cancel();
    panels.forEach((panel, position) => { panel.hidden = position !== index; });
    stepButtons.forEach((button, position) => {
      if (position === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const panel = panels[index];
    panelAnimation = animateElement(panel, direction);
    const heading = panel.querySelector('h3');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce(`Simulation, étape ${index + 1} sur 4 : ${heading.textContent}`);
  }
  function span(className, content) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = content;
    return node;
  }
  function drawDays() {
    const target = $('#days');
    target.replaceChildren();
    daysFrom().forEach(({ date, reason }) => {
      const label = document.createElement('label');
      label.className = 'choice day-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = key(date);
      radio.disabled = !!reason;
      radio.checked = !!state.date && key(state.date) === key(date);
      radio.setAttribute('aria-label', `${fullDateFormatter.format(date)}${reason ? ', ' + reason : ', simulation'}`);
      label.append(radio, span('day-week', dayFormatter.format(date)), span('day-number', String(date.getUTCDate())), span('day-month', monthFormatter.format(date)));
      if (reason) label.append(span('day-status', reason));
      radio.addEventListener('change', () => {
        state.date = date; state.minutes = null;
        drawSlots(); updateSummary();
        announce(`Jour de l’essai : ${fullDateFormatter.format(date)}. Choisissez ensuite une heure.`);
      });
      target.append(label);
    });
  }
  function drawSlots() {
    const target = $('#slots');
    target.replaceChildren();
    const slots = state.date ? slotsFor(state.date) : [];
    $('#empty-slots').hidden = slots.length > 0;
    slots.forEach(minutes => {
      const label = document.createElement('label');
      label.className = 'choice time-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = String(minutes);
      radio.checked = state.minutes === minutes;
      radio.setAttribute('aria-label', `${hourText(minutes)}, heure de début pour la simulation`);
      label.append(radio, span('slot-time', hourText(minutes)));
      radio.addEventListener('change', () => {
        state.minutes = minutes; updateSummary();
        announce(`Heure souhaitée pour l’essai : ${hourText(minutes)}. Aucune disponibilité réelle n’est vérifiée.`);
      });
      target.append(label);
    });
  }
  function stillValid() {
    if (!state.date) return false;
    const currentDays = daysFrom();
    const day = currentDays.find(item => key(item.date) === key(state.date));
    if (!day || day.reason) {
      state.date = null; state.minutes = null;
      drawDays(); updateSummary(); showStep(1);
      announce('Ce jour ne peut plus être essayé. Choisissez un autre jour.');
      return false;
    }
    if (state.minutes !== null && !slotsFor(state.date).includes(state.minutes)) {
      state.minutes = null; drawSlots(); updateSummary(); showStep(2);
      announce('Cette heure est passée. Choisissez une autre heure pour l’essai.');
      return false;
    }
    return true;
  }

  $$('input[name="prestation"]').forEach(radio => radio.addEventListener('change', () => {
    state.service = radio.value;
    updateSummary();
    announce(`Prestation pour l’essai : ${SERVICES[state.service]}.`);
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const target = +button.dataset.next;
    if (target > 1 && !stillValid()) return;
    if (target === 1) drawDays();
    if (target === 2) drawSlots();
    showStep(target);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.back)));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const target = +button.dataset.step;
    if (target > 1 && !stillValid()) return;
    if (target === 1) drawDays();
    if (target === 2) drawSlots();
    showStep(target);
  }));

  const firstName = $('#prenom');
  const phone = $('#telephone');
  function validateField(input) {
    const valid = input === phone ? phoneValid(input.value) : input.value.trim().length > 0;
    const error = input === phone ? $('#erreur-telephone') : $('#erreur-prenom');
    error.hidden = valid;
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  [firstName, phone].forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || !state.service || !state.date || state.minutes === null) return;
    if (!stillValid()) return;
    const nameOK = validateField(firstName), phoneOK = validateField(phone);
    if (!nameOK || !phoneOK) {
      (!nameOK ? firstName : phone).focus();
      announce('Vérifiez les champs signalés pour terminer la simulation.');
      return;
    }
    form.hidden = true;
    $('.steps').hidden = true;
    const success = $('#booking-success');
    success.hidden = false;
    form.reset();
    if (panelAnimation) panelAnimation.cancel();
    panelAnimation = animateElement(success);
    success.querySelector('h3').focus({ preventScroll: true });
    success.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce('L’essai est terminé. Aucun rendez-vous n’a été pris, rien n’a été envoyé au salon.');
  });
  function restart() {
    state.service = ''; state.date = null; state.minutes = null;
    form.reset(); form.hidden = false;
    $('.steps').hidden = false;
    $('#booking-success').hidden = true;
    [firstName, phone].forEach(input => { input.removeAttribute('aria-invalid'); });
    $$('.field-error').forEach(error => { error.hidden = true; });
    drawDays(); drawSlots(); updateSummary(); showStep(0);
  }
  $('#restart').addEventListener('click', restart);
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (form.hidden) restart();
    state.service = link.dataset.service;
    $$('input[name="prestation"]').forEach(radio => { radio.checked = radio.value === state.service; });
    updateSummary();
    state.step = 0;
    panels.forEach((panel, index) => { panel.hidden = index !== 0; });
    stepButtons.forEach((button, index) => { if (!index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    announce(`${SERVICES[state.service]} est choisi pour la simulation. Choisissez ensuite un jour.`);
    // L’ancre fait défiler le document ; le focus suit le titre sans second défilement.
    requestAnimationFrame(() => panels[0].querySelector('h3').focus({ preventScroll: true }));
  }));
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      if (panelAnimation) panelAnimation.cancel();
      if (summaryAnimation) summaryAnimation.cancel();
      $$('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
    }
  });
  drawDays(); updateSummary();
  $('#booking-app').hidden = false;

  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('reveal-pending');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    $$('[data-reveal]').forEach(element => { element.classList.add('reveal-pending'); observer.observe(element); });
  }
  root.classList.add('js');
})();
