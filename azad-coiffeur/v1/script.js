/* Azad Coiffeur — démonstration locale. Aucun appel réseau ni stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('keyboard-input');
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-input');
  }, { passive: true });

  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealElements.forEach(element => revealObserver.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-visible'));
  }

  const app = $('#parcours');
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const summary = $('#selection-register');
  const dayChoices = $('#day-choices');
  const slotChoices = $('#slot-choices');
  const status = $('#booking-status');
  const inputName = $('#prenom');
  const inputPhone = $('#telephone');
  const blankState = () => ({ day: '', minute: null, maxStep: 0, step: 0, complete: false });
  let state = blankState();
  let stepSequence = 0;

  // Les horaires proviennent d’iCoiffeur et Cylex : lundi–samedi 9 h–19 h.
  // Les départs fictifs ci-dessous ne représentent ni une durée ni une disponibilité.
  const OPENING = 9 * 60;
  const CLOSING = 19 * 60;
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthYear = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(instant).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function calendarDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function hourLabel(minute) { return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`; }
  function isPast(key, minute, now = parisNow()) { return key < now.key || (key === now.key && minute <= now.minute); }
  function isClosed(key) { return calendarDate(key).getUTCDay() === 0; }
  function isValidChoice() {
    const options = getDays();
    return options.some(day => day.key === state.day && !day.disabled) &&
      Number.isInteger(state.minute) && state.minute >= OPENING && state.minute < CLOSING &&
      state.minute % 60 === 0 && !isPast(state.day, state.minute);
  }
  function getDays() {
    const now = parisNow();
    return Array.from({ length: 14 }, (_, index) => {
      const date = calendarDate(now.key);
      date.setUTCDate(date.getUTCDate() + index);
      const key = dateKey(date);
      const closed = isClosed(key);
      const elapsed = key === now.key && now.minute >= CLOSING - 60;
      return { key, date, disabled: closed || elapsed, reason: closed ? 'Fermé' : elapsed ? 'Écoulé' : '' };
    });
  }

  function makeChoice({ name, value, label, disabled = false, content, describedBy }) {
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', label);
    if (describedBy) input.setAttribute('aria-describedby', describedBy);
    const face = document.createElement('span');
    face.className = 'choice-face';
    face.setAttribute('aria-hidden', 'true');
    content.forEach(([className, text]) => {
      const item = document.createElement('span');
      item.className = className;
      item.textContent = text;
      face.append(item);
    });
    wrapper.append(input, face);
    return wrapper;
  }

  function renderDays() {
    const fragment = document.createDocumentFragment();
    getDays().forEach(day => {
      const content = [
        ['choice-weekday', shortWeekday.format(day.date)],
        ['choice-number', String(day.date.getUTCDate())],
        ['choice-month', shortMonth.format(day.date)]
      ];
      if (day.reason) content.push(['choice-reason', day.reason]);
      const choice = makeChoice({ name: 'jour', value: day.key,
        label: `${longDate.format(day.date)}${day.reason ? `, ${day.reason.toLowerCase()}` : ', simulation'}`,
        disabled: day.disabled, content, describedBy: 'day-error' });
      $('input', choice).checked = day.key === state.day && !day.disabled;
      fragment.append(choice);
    });
    dayChoices.replaceChildren(fragment);
  }

  function renderSlots() {
    const fragment = document.createDocumentFragment();
    if (!state.day || isClosed(state.day)) return;
    for (let minute = OPENING; minute < CLOSING; minute += 60) {
      const past = isPast(state.day, minute);
      const content = [['choice-hour', hourLabel(minute)]];
      if (past) content.push(['choice-reason', 'Passée']);
      const choice = makeChoice({ name: 'heure', value: String(minute),
        label: `${hourLabel(minute)}, ${past ? 'heure passée' : 'heure fictive'}`,
        disabled: past, content, describedBy: 'slot-error' });
      $('input', choice).checked = minute === state.minute && !past;
      fragment.append(choice);
    }
    slotChoices.replaceChildren(fragment);
    $('#chosen-day-caption').textContent = `Pour le ${longDate.format(calendarDate(state.day))}. Toutes les heures proposées sont fictives.`;
  }

  function announce(message) { status.textContent = message; }
  function clearError(id) { $(`#${id}`).textContent = ''; }
  function updateSummary() {
    const date = state.day ? calendarDate(state.day) : null;
    $('#summary-month').textContent = date ? monthYear.format(date) : 'La prochaine date';
    $('#summary-day').textContent = date ? String(date.getUTCDate()) : '—';
    $('#summary-date').textContent = date ? longDate.format(date) : 'Choisissez un jour.';
    $('#summary-time').textContent = state.minute !== null ? `${hourLabel(state.minute)} · heure fictive` : 'Puis une heure.';
    $('#edit-selection').disabled = !state.day;
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.maxStep || state.complete;
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function renderRecap() {
    const fragment = document.createDocumentFragment();
    const values = [
      ['Jour', longDate.format(calendarDate(state.day))],
      ['Heure fictive', hourLabel(state.minute)],
      ['Prénom', inputName.value.trim()],
      ['Téléphone', inputPhone.value.trim()],
      ['Lieu', 'Azad Coiffeur, 11 rue Jules-Guesde, Clermont-Ferrand']
    ];
    values.forEach(([label, text]) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const definition = document.createElement('dd');
      term.textContent = label;
      definition.textContent = text;
      row.append(term, definition);
      fragment.append(row);
    });
    $('#final-recap').replaceChildren(fragment);
  }

  function showStep(index, { focus = true } = {}) {
    stepSequence += 1;
    const sequence = stepSequence;
    panels.forEach(panel => { panel.hidden = true; panel.classList.remove('is-entering', 'is-instant'); });
    state.step = index;
    const panel = panels[index];
    panel.hidden = false;
    if (keyboard || reduced.matches) panel.classList.add('is-instant');
    else panel.classList.add('is-entering');
    if (index === 0) renderDays();
    if (index === 1) renderSlots();
    if (index === 3) renderRecap();
    updateSummary();
    // Deux images garantissent un état initial sans retarder le focus ni les contrôles.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (sequence === stepSequence) panel.classList.remove('is-entering');
    }));
    if (focus) {
      const heading = $('h3', panel);
      heading.focus({ preventScroll: true });
      const top = app.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight / 2) {
        app.scrollIntoView({ block: 'start', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
      }
      announce(index < 4 ? `Étape ${index + 1} sur 4. ${heading.textContent}` : 'Simulation terminée. Aucun rendez-vous réservé.');
    }
  }

  function validDay() {
    const valid = getDays().some(day => day.key === state.day && !day.disabled);
    if (valid) { clearError('day-error'); return true; }
    $('#day-error').textContent = 'Choisissez un jour de démonstration autre qu’un dimanche ou une journée écoulée.';
    $('input:not(:disabled)', dayChoices)?.focus();
    return false;
  }
  function validSlot() {
    if (isValidChoice()) { clearError('slot-error'); return true; }
    $('#slot-error').textContent = 'Choisissez une heure fictive à venir pour ce jour.';
    $('input:not(:disabled)', slotChoices)?.focus();
    return false;
  }
  function validContact() {
    let firstInvalid = null;
    const nameValid = inputName.value.trim().length > 0;
    inputName.setAttribute('aria-invalid', String(!nameValid));
    $('#name-error').textContent = nameValid ? '' : 'Indiquez un prénom, même fictif.';
    if (!nameValid) firstInvalid = inputName;
    const normalized = inputPhone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalized);
    inputPhone.setAttribute('aria-invalid', String(!phoneValid));
    $('#phone-error').textContent = phoneValid ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.';
    if (!phoneValid && !firstInvalid) firstInvalid = inputPhone;
    firstInvalid?.focus();
    return !firstInvalid;
  }

  dayChoices.addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    if (state.day !== event.target.value) {
      state.day = event.target.value;
      state.minute = null;
      state.maxStep = 1;
    }
    clearError('day-error');
    clearError('slot-error');
    updateSummary();
    announce(`${longDate.format(calendarDate(state.day))}, jour de simulation choisi.`);
  });
  slotChoices.addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.minute = Number(event.target.value);
    state.maxStep = Math.max(state.maxStep, 2);
    clearError('slot-error');
    updateSummary();
    announce(`${hourLabel(state.minute)}, heure fictive choisie.`);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const from = Number(button.dataset.next);
    if (from === 0 && !validDay()) return;
    if (from === 1 && !validSlot()) return;
    if (from === 2 && !validContact()) return;
    state.maxStep = Math.max(state.maxStep, from + 1);
    showStep(from + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $('#edit-selection').addEventListener('click', () => {
    if (state.complete) return;
    showStep(0);
  });
  inputName.addEventListener('input', () => {
    clearError('name-error'); inputName.removeAttribute('aria-invalid');
  });
  inputPhone.addEventListener('input', () => {
    clearError('phone-error'); inputPhone.removeAttribute('aria-invalid');
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.complete) return;
    // Entrée dans un champ suit l’étape courante, jamais une confirmation implicite.
    if (state.step < 3) {
      $(`[data-next="${state.step}"]`)?.click();
      return;
    }
    if (!isValidChoice()) {
      state.minute = null;
      state.maxStep = 1;
      showStep(0);
      $('#day-error').textContent = 'L’heure choisie est passée. Choisissez une nouvelle date et une nouvelle heure fictives.';
      announce('La date ou l’heure choisie doit être actualisée.');
      return;
    }
    if (!validContact()) { showStep(2); validContact(); return; }
    state.complete = true;
    $('#success-recap').textContent = `Sélection fictive : le ${longDate.format(calendarDate(state.day))}, à ${hourLabel(state.minute)}.`;
    showStep(4);
    $('#edit-selection').disabled = true;
    // Le récapitulatif final ne conserve pas les coordonnées après la démonstration.
    form.reset();
    $('#final-recap').replaceChildren();
  });
  $('#restart').addEventListener('click', () => {
    state = blankState();
    form.reset();
    $$('.field-error').forEach(element => { element.textContent = ''; });
    [inputName, inputPhone].forEach(input => input.removeAttribute('aria-invalid'));
    slotChoices.replaceChildren();
    $('#success-recap').textContent = '';
    showStep(0);
  });

  renderDays();
  app.hidden = false;
  summary.hidden = false;
  root.classList.add('is-booking-ready');
  updateSummary();

  // La barre mobile s’efface près du formulaire et du pied de page.
  const mobileActions = $('.mobile-actions');
  if ('IntersectionObserver' in window) {
    const visibility = new Map();
    const mobileObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      const heroVisible = visibility.get($('.hero')) ?? true;
      const bookingVisible = visibility.get($('.booking-section')) ?? false;
      const footerVisible = visibility.get($('.footer')) ?? false;
      const hide = heroVisible || bookingVisible || footerVisible;
      mobileActions.classList.toggle('bar-hidden', hide);
      mobileActions.inert = hide;
      mobileActions.setAttribute('aria-hidden', String(hide));
    });
    [$('.hero'), $('.booking-section'), $('.footer')].forEach(element => mobileObserver.observe(element));
  }
})();
