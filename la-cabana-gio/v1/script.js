/* La Cabana Gio. — Simulation locale. Aucune requête, aucun stockage. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const SERVICES = [
    { id: 'sec', name: 'Coupe sur cheveux secs', duration: 45, price: null, note: 'Modalités à confirmer · durée d’exemple' },
    { id: 'brushing', name: 'Shampoing, coupe & brushing', duration: 45, price: 30, note: 'Durée d’exemple' },
    { id: 'etudiante', name: 'Forfait étudiante', duration: 45, price: 27, note: 'Conditions à confirmer · durée d’exemple' },
    { id: 'homme', name: 'Coupe homme', duration: 30, price: 23, note: 'Durée d’exemple' },
    { id: 'couleur', name: 'Coupe & couleur', duration: 90, price: 54, note: 'Durée d’exemple' }
  ];
  // PagesJaunes et iCoiffeur, vus le 01/11/2026. Minutes depuis minuit.
  const HOURS = { 0: null, 1: [840, 1140], 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 1080] };
  const state = { step: 0, service: null, date: null, time: null, done: false };
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const fullDateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  let keyboard = false;
  let panelAnimation = null;
  let summaryAnimation = null;

  document.addEventListener('keydown', event => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      keyboard = true;
      root.classList.add('keyboard-mode');
      if (panelAnimation) panelAnimation.cancel();
      if (summaryAnimation) summaryAnimation.cancel();
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });

  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function asDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function addDays(key, count) { const date = asDate(key); date.setUTCDate(date.getUTCDate() + count); return date; }
  function timeLabel(minutes) { const h = Math.floor(minutes / 60); const m = minutes % 60; return `${h}${NB}h${m ? `${NB}${String(m).padStart(2, '0')}` : ''}`; }
  function durationLabel(minutes) { return minutes < 60 ? `${minutes}${NB}min` : timeLabel(minutes); }
  function priceLabel(service) { return service && service.price !== null ? `${service.price}${NB}€` : 'À confirmer'; }
  function longDate(key) { return fullDateFormat.format(asDate(key)); }

  function easter(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
    return new Date(Date.UTC(year, Math.floor(n / 31) - 1, n % 31 + 1, 12));
  }
  function isHoliday(key) {
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5))) return true;
    const e = easter(Number(key.slice(0, 4)));
    return [1, 39, 50].some(offset => dateKey(new Date(e.getTime() + offset * 86400000)) === key);
  }
  function hashKey(key) { return Array.from(key).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 17); }
  function slotsFor(key, service) {
    if (!key || !service) return [];
    const hours = HOURS[asDate(key).getUTCDay()];
    if (!hours) return [];
    const now = parisNow();
    const slots = [];
    for (let minutes = hours[0], index = 0; minutes + service.duration <= hours[1]; minutes += 30, index++) {
      const past = key < now.key || (key === now.key && minutes <= now.minutes);
      const taken = (hashKey(key) + index * 13) % 7 === 0;
      slots.push({ minutes, available: !past && !taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function validDate(key) {
    const now = parisNow();
    return key && key >= now.key && key <= dateKey(addDays(now.key, 13)) && slotsFor(key, state.service).some(slot => slot.available);
  }
  function validTime() { return validDate(state.date) && slotsFor(state.date, state.service).some(slot => slot.minutes === state.time && slot.available); }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function radio(name, value, checked = false, disabled = false) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.checked = checked; input.disabled = disabled;
    return input;
  }
  function notify(message) { $('#booking-live').textContent = message; }
  function error(index, visible) {
    const errorElement = $(`#error-${index}`);
    if (errorElement) errorElement.hidden = !visible;
  }
  function animateSelection() {
    if (summaryAnimation) summaryAnimation.cancel();
    if (reduced.matches || keyboard || !$('.selection').animate) return;
    summaryAnimation = $('.selection dl').animate([{ opacity: .45 }, { opacity: 1 }], { duration: 200, easing: EASE });
  }
  function updateSummary(animate = true) {
    $('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    $('#summary-day').textContent = state.date ? longDate(state.date) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#summary-price').textContent = priceLabel(state.service);
    if (animate) animateSelection();
    const furthest = !state.service ? 0 : !state.date ? 1 : state.time === null ? 2 : 3;
    $$('[data-step-nav]').forEach(button => {
      const index = Number(button.dataset.stepNav);
      button.disabled = state.done || index > furthest;
      if (!state.done && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (state.service && state.date && state.time !== null) {
      $('#confirmation-recap').textContent = `${state.service.name} — ${longDate(state.date)} à ${timeLabel(state.time)}. Durée d’exemple${NB}: ${durationLabel(state.service.duration)}. Prix indicatif${NB}: ${priceLabel(state.service)}. Aucun envoi au salon.`;
    }
  }
  function renderServices() {
    const container = $('#service-options');
    container.replaceChildren();
    SERVICES.forEach(service => {
      const label = node('label', 'radio-option');
      const input = radio('service', service.id, state.service?.id === service.id);
      const description = node('span', '', service.name);
      description.append(node('small', '', `${durationLabel(service.duration)} · ${service.note}`));
      label.append(input, description, node('span', 'option-price', priceLabel(service)));
      input.addEventListener('change', () => {
        if (state.service?.id !== service.id) { state.service = service; state.date = null; state.time = null; }
        error(0, false); updateSummary(); notify(`${service.name}, ${priceLabel(service)}. Durée d’exemple${NB}: ${durationLabel(service.duration)}.`);
      });
      container.append(label);
    });
  }
  function renderDays() {
    const container = $('#day-options');
    container.replaceChildren();
    const now = parisNow();
    for (let index = 0; index < 14; index++) {
      const date = addDays(now.key, index), key = dateKey(date);
      const closed = !HOURS[date.getUTCDay()];
      const available = slotsFor(key, state.service).some(slot => slot.available);
      const holiday = isHoliday(key);
      const label = node('label', 'day-option');
      const input = radio('date', key, state.date === key, closed || !available);
      const note = closed ? 'Fermé' : !available ? 'Indisponible' : holiday ? 'Férié · à confirmer' : index === 0 ? 'Aujourd’hui' : '';
      input.setAttribute('aria-label', `${longDate(key)}, ${closed ? 'fermé' : !available ? 'aucun créneau disponible' : holiday ? 'jour férié, ouverture à confirmer' : 'disponible pour la simulation'}`);
      label.append(input, node('span', 'day-name', dayFormat.format(date)), node('span', 'day-number', String(date.getUTCDate())), node('span', 'day-month', monthFormat.format(date)), node('span', 'day-note', note));
      input.addEventListener('change', () => {
        if (state.date !== key) { state.date = key; state.time = null; }
        error(1, false); updateSummary(); notify(`${longDate(key)} sélectionné.${holiday ? ' Jour férié, ouverture à confirmer.' : ''}`);
      });
      container.append(label);
    }
  }
  function renderSlots() {
    const container = $('#time-options');
    container.replaceChildren();
    const hours = HOURS[asDate(state.date).getUTCDay()];
    const holiday = isHoliday(state.date);
    $('#slots-note').textContent = `${longDate(state.date)} · ${timeLabel(hours[0])}–${timeLabel(hours[1])}. Créneaux fictifs, heure de Paris. «${NB}Déjà pris${NB}» est un état d’exemple.${holiday ? ' Jour férié, ouverture à confirmer.' : ''}`;
    const slots = slotsFor(state.date, state.service);
    slots.forEach(slot => {
      const label = node('label', 'slot-option');
      const input = radio('time', String(slot.minutes), state.time === slot.minutes, !slot.available);
      input.setAttribute('aria-label', `${timeLabel(slot.minutes)}${slot.reason ? `, ${slot.reason}` : ', créneau fictif disponible'}`);
      label.append(input, node('span', '', timeLabel(slot.minutes)));
      if (slot.reason) label.append(node('small', '', slot.reason));
      input.addEventListener('change', () => { state.time = slot.minutes; error(2, false); updateSummary(); notify(`${timeLabel(slot.minutes)} sélectionné.`); });
      container.append(label);
    });
    if (!slots.some(slot => slot.available)) container.append(node('p', 'slots-empty', 'Aucun créneau disponible. Revenez au choix du jour.'));
  }
  function moveTo(index, focus = true) {
    if (panelAnimation) panelAnimation.cancel();
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== index; });
    const panel = $(`[data-panel="${index}"]`);
    updateSummary(false);
    if (focus) {
      const heading = $('h3', panel);
      heading.focus({ preventScroll: true });
      const box = heading.getBoundingClientRect();
      if (box.top < 16 || box.bottom > window.innerHeight - 120) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      notify(index === 4 ? 'Simulation terminée. Aucun rendez-vous pris. Rien n’a été envoyé.' : `Étape ${index + 1} sur 4. ${heading.textContent}`);
    }
    if (!reduced.matches && !keyboard && panel.animate) {
      panelAnimation = panel.animate([{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240, easing: EASE });
    }
  }
  function focusChoice(selector) { $(selector)?.focus(); }
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const index = state.step;
    const valid = index === 0 ? Boolean(state.service) : index === 1 ? validDate(state.date) : validTime();
    if (!valid) {
      error(index, true);
      if (index === 2 && state.time !== null) { state.time = null; renderSlots(); updateSummary(); }
      focusChoice(index === 0 ? 'input[name="service"]' : index === 1 ? 'input[name="date"]:not(:disabled)' : 'input[name="time"]:not(:disabled)');
      notify(index === 2 ? 'Choisissez un créneau disponible. Les heures passées ne sont plus sélectionnables.' : 'Faites un choix pour continuer.');
      return;
    }
    error(index, false); moveTo(index + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => moveTo(Math.max(0, state.step - 1))));
  $$('[data-step-nav]').forEach(button => button.addEventListener('click', () => {
    if (!button.disabled) moveTo(Number(button.dataset.stepNav));
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const service = SERVICES.find(item => item.id === link.dataset.service);
    if (!service) return;
    if (state.done) reset(false);
    state.service = service; state.date = null; state.time = null;
    renderServices(); error(0, false); moveTo(0); updateSummary();
  }));

  function validateField(input, isValid, errorId) {
    input.setAttribute('aria-invalid', String(!isValid));
    $(`#${errorId}`).hidden = isValid;
    return isValid;
  }
  function validPhone(value) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }
  const nameInput = $('#first-name'), phoneInput = $('#phone');
  nameInput.addEventListener('blur', () => {
    if (nameInput.value || nameInput.getAttribute('aria-invalid') === 'true') validateField(nameInput, nameInput.value.trim().length > 0, 'name-error');
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value || phoneInput.getAttribute('aria-invalid') === 'true') validateField(phoneInput, validPhone(phoneInput.value), 'phone-error');
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    // Enter in an earlier step advances that step, never confirms an incomplete selection.
    if (state.step < 3) { $('[data-next]', $(`[data-panel="${state.step}"]`))?.click(); return; }
    if (state.step !== 3 || state.done) return;
    if (!state.service) { moveTo(0); error(0, true); return; }
    if (!validDate(state.date)) { state.date = null; state.time = null; moveTo(1); error(1, true); return; }
    if (!validTime()) { state.time = null; moveTo(2); error(2, true); return; }
    const validName = validateField(nameInput, nameInput.value.trim().length > 0, 'name-error');
    const validTel = validateField(phoneInput, validPhone(phoneInput.value), 'phone-error');
    if (!validName || !validTel) {
      (validName ? phoneInput : nameInput).focus();
      notify('Vérifiez les coordonnées indiquées.');
      return;
    }
    $('#success-recap').textContent = `${nameInput.value.trim()}, votre exemple${NB}: ${state.service.name.toLowerCase()}, ${longDate(state.date)} à ${timeLabel(state.time)}. Prix indicatif${NB}: ${priceLabel(state.service)}. Durée d’exemple${NB}: ${durationLabel(state.service.duration)}.`;
    state.done = true;
    // Discard personal details once the simulated recap has been prepared.
    phoneInput.value = ''; nameInput.value = '';
    moveTo(4);
  });
  function reset(focus = true) {
    state.service = null; state.date = null; state.time = null; state.done = false;
    $('#booking-form').reset();
    ['first-name', 'phone'].forEach(id => $(`#${id}`).removeAttribute('aria-invalid'));
    $$('.form-error').forEach(message => { message.hidden = true; });
    $('#success-recap').textContent = ''; $('#confirmation-recap').textContent = '';
    renderServices(); moveTo(0, focus);
  }
  $('#restart').addEventListener('click', () => reset());
  reduced.addEventListener('change', () => {
    if (reduced.matches) { panelAnimation?.cancel(); summaryAnimation?.cancel(); }
  });

  renderServices();
  updateSummary(false);
  $('#booking-app').hidden = false;
  const currentDay = asDate(parisNow().key).getUTCDay();
  $(`[data-day="${currentDay}"]`)?.classList.add('is-today');

  // Only opt into hidden entrance states after the functional page is initialized.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        if (target.dataset.reveal === 'row') {
          const index = $$('.menu-row').indexOf(target);
          target.style.transitionDelay = `${(index % 3) * 60}ms`;
        }
        target.classList.add('is-visible'); observer.unobserve(target);
      });
    }, { threshold: .12 });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('is-visible'));
})();
