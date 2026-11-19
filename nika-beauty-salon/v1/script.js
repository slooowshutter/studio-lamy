/* La simulation est locale. Aucun appel réseau, aucun stockage. */
const NikaAgenda = (() => {
  'use strict';
  const services = Object.freeze({
    hydralift: { name: 'HydraLift Signature', duration: 90, durationText: '1\u00a0h\u00a030' },
    'peau-nette': { name: 'Soin Peau Nette', duration: 60, durationText: '1\u00a0h' }
  });
  // Plages Planity, à confirmer. Les annuaires divergent ; voir les sources.
  const hours = Object.freeze({ 0: null, 1: [600, 930], 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 1140] });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const pad = value => String(value).padStart(2, '0');
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const formatTime = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? '\u00a0' + pad(minutes % 60) : ''}`;
  function sampleTaken(key, minute) {
    let code = minute;
    for (const character of key) code = (code * 31 + character.charCodeAt(0)) >>> 0;
    return code % 7 === 0;
  }
  function slots(key, duration, now = new Date()) {
    const date = dateFromKey(key);
    if (Number.isNaN(date.getTime()) || ![60, 90].includes(duration)) return [];
    const range = hours[date.getUTCDay()];
    if (!range) return [];
    const current = parisNow(now);
    const result = [];
    for (let minute = range[0]; minute + duration <= range[1]; minute += 30) {
      const past = key < current.key || (key === current.key && minute <= current.minutes);
      const taken = sampleTaken(key, minute);
      result.push({ minute, disabled: past || taken, status: past ? 'Passé' : taken ? 'Indisponible dans l’exemple' : 'Exemple' });
    }
    return result;
  }
  function dates(duration, now = new Date()) {
    const first = dateFromKey(parisNow(now).key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const closed = !hours[date.getUTCDay()];
      return { key, date, disabled: closed || !slots(key, duration, now).some(slot => !slot.disabled), status: closed ? 'Fermé' : slots(key, duration, now).some(slot => !slot.disabled) ? 'Exemple' : 'Passé' };
    });
  }
  function validMobile(value) {
    const number = value.trim().replace(/[\s().-]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
    return /^0[67]\d{8}$/.test(number);
  }
  return { services, hours, parisNow, dateFromKey, formatTime, slots, dates, validMobile };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = NikaAgenda;

if (typeof document !== 'undefined') (() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { service: '', date: '', time: null, step: 0, done: false };
  const stepNames = ['Soin', 'Jour', 'Heure', 'Coordonnées'];
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const announcement = $('#booking-announcement');
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const fullDateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let keyboard = false;
  let entranceFrame = 0;

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard-mode');
      // Les actions au clavier sont immédiates, y compris une entrée déjà amorcée.
      panels.forEach(panel => panel.classList.remove('is-entering'));
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  reduce.addEventListener('change', () => { if (reduce.matches) panels.forEach(panel => panel.classList.remove('is-entering')); });

  function announce(text) { announcement.textContent = text; }
  const selectedService = () => NikaAgenda.services[state.service];
  const selectedDateText = () => state.date ? fullDateFormat.format(NikaAgenda.dateFromKey(state.date)) : '';
  function summary() {
    if (!state.service) return 'Un soin, puis un jour et une heure.';
    const service = selectedService();
    return [service.name, service.durationText, state.date ? selectedDateText() : '', state.time !== null ? `à ${NikaAgenda.formatTime(state.time)}` : ''].filter(Boolean).join(' · ');
  }
  function updateSummary() {
    $('#selection-text').textContent = summary();
    $('#confirmation-recap').textContent = `Votre essai : ${summary()}. Aucune réservation ne sera envoyée.`;
    const reached = state.time !== null ? 3 : state.date ? 2 : state.service ? 1 : 0;
    $$('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = step > reached || state.done;
      if (step === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(step, focus = true) {
    cancelAnimationFrame(entranceFrame);
    state.step = step;
    state.done = false;
    $('#booking-result').hidden = true;
    form.hidden = false;
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; panel.classList.remove('is-entering'); });
    const active = panels[step];
    if (!reduce.matches && !keyboard && focus) {
      active.classList.add('is-entering');
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => active.classList.remove('is-entering'));
      });
    }
    updateSummary();
    announce(`Étape ${step + 1} sur 4 : ${stepNames[step]}. Simulation sans envoi.`);
    if (focus) $(`#step-title-${step}`).focus();
  }
  function clearError(id) { $(id).textContent = ''; }
  function setChoiceError(id, text, focusSelector) {
    $(id).textContent = text;
    const input = $(focusSelector);
    if (input) input.focus();
  }
  function makePart(className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
  function renderDays() {
    const group = $('#day-options');
    group.replaceChildren();
    if (!state.service) return;
    for (const day of NikaAgenda.dates(selectedService().duration)) {
      const label = document.createElement('label');
      label.className = `option date-option${day.disabled ? ' is-disabled' : ''}`;
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = day.key;
      input.disabled = day.disabled; input.checked = state.date === day.key;
      input.setAttribute('aria-label', `${fullDateFormat.format(day.date)}, ${day.status.toLowerCase()}, simulation`);
      label.append(input, makePart('date-day', dayFormat.format(day.date)), makePart('date-number', day.date.getUTCDate()), makePart('date-month', monthFormat.format(day.date)), makePart('date-status', day.status));
      input.addEventListener('change', () => {
        if (state.date !== day.key) { state.time = null; state.date = day.key; }
        clearError('#day-error'); renderSlots(); updateSummary();
      });
      group.append(label);
    }
  }
  function renderSlots() {
    const group = $('#time-options');
    group.replaceChildren();
    if (!state.date || !state.service) return;
    const duration = selectedService().duration;
    $('#slots-note').textContent = `${selectedDateText()} · Durée du soin : ${selectedService().durationText}. Créneaux d’exemple, sans disponibilité réelle. Horaires à confirmer.`;
    const slots = NikaAgenda.slots(state.date, duration);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    if (!slots.some(slot => !slot.disabled)) {
      state.time = null;
      group.append(makePart('panel-note', 'Aucun créneau d’exemple ne reste ce jour. Revenez au choix du jour.'));
    }
    for (const slot of slots) {
      const label = document.createElement('label');
      label.className = `option time-option${slot.disabled ? ' is-disabled' : ''}`;
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = slot.minute;
      input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${NikaAgenda.formatTime(slot.minute)}, ${slot.status.toLowerCase()}, simulation`);
      label.append(input, makePart('time-text', NikaAgenda.formatTime(slot.minute)));
      if (slot.disabled) {
        const status = document.createElement('small');
        status.textContent = slot.status === 'Passé' ? 'Passé' : 'Indisponible · exemple';
        label.append(status);
      }
      input.addEventListener('change', () => { state.time = slot.minute; clearError('#time-error'); updateSummary(); });
      group.append(label);
    }
  }
  function selectService(id) {
    if (!NikaAgenda.services[id]) return;
    if (state.service !== id) { state.date = ''; state.time = null; }
    state.service = id;
    $$('input[name="soin"]').forEach(input => { input.checked = input.value === id; });
    ['#service-error', '#day-error', '#time-error'].forEach(clearError);
    renderDays(); renderSlots(); updateSummary();
  }
  $$('input[name="soin"]').forEach(input => input.addEventListener('change', () => selectService(input.value)));
  $$('[data-book]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.book);
    showStep(0);
  }));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.step);
    if (target === 1) renderDays();
    if (target === 2) renderSlots();
    showStep(target);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.back);
    if (target === 1) renderDays();
    if (target === 2) renderSlots();
    showStep(target);
  }));
  function dateStillValid() {
    return state.service && NikaAgenda.dates(selectedService().duration).some(day => day.key === state.date && !day.disabled);
  }
  function slotStillValid() {
    return dateStillValid() && NikaAgenda.slots(state.date, selectedService().duration).some(slot => slot.minute === state.time && !slot.disabled);
  }
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.next);
    if (target === 1) {
      if (!state.service) { setChoiceError('#service-error', 'Choisissez un soin pour continuer.', 'input[name="soin"]'); return; }
      renderDays();
    }
    if (target === 2) {
      if (!dateStillValid()) { state.date = ''; state.time = null; renderDays(); updateSummary(); setChoiceError('#day-error', 'Choisissez un jour proposé dans cette simulation.', 'input[name="jour"]:not(:disabled)'); return; }
      renderSlots();
    }
    if (target === 3 && !slotStillValid()) {
      state.time = null; renderSlots(); updateSummary();
      setChoiceError('#time-error', 'Choisissez un créneau d’exemple encore proposé. Vous pouvez aussi revenir au jour.', 'input[name="heure"]:not(:disabled)'); return;
    }
    showStep(target);
  }));
  function validateField(input, message) {
    const id = input.id === 'first-name' ? '#name-error' : '#phone-error';
    $(id).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }
  const firstName = $('#first-name');
  const phone = $('#phone');
  const validateName = () => validateField(firstName, firstName.value.trim() ? '' : 'Indiquez votre prénom pour terminer l’essai.');
  const validatePhone = () => validateField(phone, NikaAgenda.validMobile(phone.value) ? '' : 'Indiquez un mobile français valide, commençant par 06, 07 ou +33.');
  firstName.addEventListener('blur', validateName);
  phone.addEventListener('blur', validatePhone);
  firstName.addEventListener('input', () => { if (firstName.getAttribute('aria-invalid') === 'true' && firstName.value.trim()) validateField(firstName, ''); });
  phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid') === 'true' && NikaAgenda.validMobile(phone.value)) validateField(phone, ''); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!slotStillValid()) {
      state.time = null; renderDays(); renderSlots(); showStep(1);
      setChoiceError('#day-error', 'La date ou l’heure de cet essai est passée. Choisissez de nouveau un jour.', 'input[name="jour"]:not(:disabled)'); return;
    }
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) { (nameValid ? phone : firstName).focus(); return; }
    $('#success-recap').textContent = `${firstName.value.trim()}, voici le récapitulatif de votre simulation : ${summary()}.`;
    state.done = true;
    form.hidden = true;
    $('#booking-result').hidden = false;
    updateSummary();
    announce('Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.');
    $('#success-title').focus();
    // Les coordonnées ne restent pas dans des champs cachés après l’essai.
    firstName.value = ''; phone.value = '';
  });
  $('#restart').addEventListener('click', () => {
    state.service = ''; state.date = ''; state.time = null; state.done = false;
    form.reset();
    ['#service-error', '#day-error', '#time-error', '#name-error', '#phone-error'].forEach(clearError);
    firstName.removeAttribute('aria-invalid'); phone.removeAttribute('aria-invalid');
    $('#success-recap').textContent = '';
    renderDays(); renderSlots(); showStep(0);
  });

  $('#booking-app').hidden = false;
  showStep(0, false);
  const revealRows = $$('.reveal-row');
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    revealRows.forEach(row => observer.observe(row));
  } else revealRows.forEach(row => row.classList.add('is-visible'));
  if ('IntersectionObserver' in window) {
    const bar = $('.mobile-bar');
    const visibility = { signature: true, booking: false, footer: false };
    const sections = new Map([[$('.signature'), 'signature'], [$('.booking'), 'booking'], [$('footer'), 'footer']]);
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { visibility[sections.get(entry.target)] = entry.isIntersecting; });
      bar.classList.toggle('is-visible', !visibility.signature && !visibility.booking && !visibility.footer);
    }, { threshold: 0 });
    sections.forEach((name, section) => barObserver.observe(section));
  } else $('.mobile-bar').classList.add('is-visible');
  window.nikaPret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
