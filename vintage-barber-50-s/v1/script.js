/* Les horaires sont ceux de Planity, relevés le 02/11/2026, à confirmer.
   Les disponibilités sont exclusivement une simulation. Aucun réseau ni stockage. */
const VintageModel = (() => {
  'use strict';
  const zone = 'Europe/Paris';
  const hours = Object.freeze({ 0: [600, 1200], 1: [540, 1200], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200], 6: [540, 1200] });
  const clock = new Intl.DateTimeFormat('fr-FR', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function paris(now = new Date()) {
    const p = Object.fromEntries(clock.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, year: +p.year, month: +p.month, day: +p.day, minutes: +p.hour * 60 + +p.minute };
  }
  function noon(key) { return new Date(`${key}T12:00:00Z`); }
  function days(now = new Date()) {
    const p = paris(now);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.UTC(p.year, p.month - 1, p.day + i, 12));
      const key = date.toISOString().slice(0, 10);
      return { key, date, weekday: date.getUTCDay(), closed: !hours[date.getUTCDay()] };
    });
  }
  function timeLabel(minute) {
    const h = Math.floor(minute / 60), m = minute % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function dateLabel(key) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' }).format(noon(key));
  }
  function slots(key, duration, now = new Date()) {
    const range = hours[noon(key).getUTCDay()];
    if (!range || !Number.isInteger(duration) || duration <= 0) return [];
    const today = paris(now);
    const seed = Math.floor(noon(key).getTime() / 86400000);
    const result = [];
    for (let minute = range[0]; minute + duration <= range[1]; minute += 30) {
      const past = key < today.key || (key === today.key && minute <= today.minutes);
      const occupied = (seed + Math.floor(minute / 30)) % 7 === 0;
      result.push({ minute, past, occupied, disabled: past || occupied });
    }
    return result;
  }
  function available(key, minute, duration, now = new Date()) {
    return slots(key, duration, now).some(slot => slot.minute === minute && !slot.disabled);
  }
  function validPhone(value) {
    return /^0[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, '').replace(/^(?:\+33|0033)/, '0'));
  }
  return { hours, paris, days, slots, available, timeLabel, dateLabel, validPhone };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = VintageModel;

/* Interface : tout est local à cette page. */
if (typeof document !== 'undefined') (() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const root = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const serviceInputs = $$('input[name="prestation"]');
  const serviceData = new Map(serviceInputs.map(input => [input.value, { id: input.value, name: input.nextElementSibling.childNodes[0].textContent.trim().replace(/\s+/g, ' '), duration: +input.dataset.duration }]));
  const state = { service: null, day: null, time: null, step: 0, done: false };
  let transitionId = 0;
  let moving = [];
  const stepNames = ['Choisir la prestation', 'Choisir le jour', 'Choisir l’heure', 'Coordonnées', 'Fin de la simulation'];
  const canVisit = index => index === 0 || (index === 1 && !!state.service) || (index === 2 && !!state.service && !!state.day) || (index === 3 && !!state.service && !!state.day && state.time !== null);

  function announce(text) { $('#booking-status').textContent = text; }
  function error(id, message) { $(`#${id}`).textContent = message; }
  function selection() {
    $('#recap-service').textContent = state.service ? state.service.name : 'À choisir';
    $('#recap-day').textContent = state.day ? VintageModel.dateLabel(state.day) : 'À choisir';
    $('#recap-time').textContent = state.time !== null ? VintageModel.timeLabel(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || !canVisit(index);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#final-recap').textContent = recap();
  }
  function recap() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name} · ${VintageModel.dateLabel(state.day)} à ${VintageModel.timeLabel(state.time)} · ${state.service.duration}\u00a0min. Simulation uniquement.`;
  }
  function stopMotion() { moving.forEach(animation => animation.cancel()); moving = []; }
  function showStep(index, focus = true) {
    const previous = state.step;
    state.step = index;
    const token = ++transitionId;
    stopMotion();
    panels.forEach((panel, i) => {
      panel.hidden = i !== index && i !== previous;
      panel.inert = i !== index;
      if (i !== index) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');
    });
    const next = panels[index], old = panels[previous];
    next.hidden = false;
    selection();
    if (focus) $(`#step-title-${index}`).focus();
    announce(stepNames[index]);
    if (previous === index || motion.matches || keyboard || !next.animate) {
      panels.forEach((panel, i) => { panel.hidden = i !== index; });
      return;
    }
    const direction = index > previous ? 1 : -1;
    moving = [
      old.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction * 7}px)` }], { duration: 150, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' }),
      next.animate([{ opacity: 0, transform: `translateX(${direction * 10}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' })
    ];
    Promise.allSettled(moving.map(animation => animation.finished)).then(() => {
      if (token !== transitionId) return;
      panels.forEach((panel, i) => { panel.hidden = i !== index; });
      stopMotion();
    });
  }
  function chooseService(id) {
    const service = serviceData.get(id);
    if (!service) return;
    state.service = service;
    state.time = null;
    state.done = false;
    serviceInputs.forEach(input => { input.checked = input.value === id; });
    error('service-error', '');
    error('time-error', '');
    selection();
  }
  function makeChoice(name, value, disabled) {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value); input.disabled = disabled;
    const span = document.createElement('span');
    label.append(input, span);
    return { label, input, span };
  }
  function renderDays() {
    const fragment = document.createDocumentFragment();
    VintageModel.days().forEach(day => {
      const { label, input, span } = makeChoice('jour', day.key, day.closed);
      input.checked = day.key === state.day;
      input.setAttribute('aria-label', VintageModel.dateLabel(day.key) + (day.closed ? ', fermé' : ''));
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(day.date);
      const number = document.createElement('b'); number.textContent = day.date.getUTCDate();
      const month = document.createElement('small');
      month.textContent = day.closed ? 'Fermé' : new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).format(day.date);
      span.append(weekday, number, month);
      input.addEventListener('change', () => {
        state.day = day.key; state.time = null;
        error('day-error', ''); error('time-error', ''); selection();
      });
      fragment.append(label);
    });
    $('#day-options').replaceChildren(fragment);
  }
  function renderSlots() {
    if (!state.day || !state.service) return;
    const slots = VintageModel.slots(state.day, state.service.duration);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    const fragment = document.createDocumentFragment();
    slots.forEach(slot => {
      const { label, input, span } = makeChoice('heure', slot.minute, slot.disabled);
      input.checked = slot.minute === state.time;
      const time = VintageModel.timeLabel(slot.minute);
      const reason = slot.past ? 'Heure passée' : slot.occupied ? 'Exemple indisponible' : '';
      input.setAttribute('aria-label', `${time}${reason ? `, ${reason}` : ', créneau de simulation'}`);
      const main = document.createElement('span'); main.className = 'slot-time'; main.textContent = time;
      span.append(main);
      if (reason) { const note = document.createElement('small'); note.textContent = reason; span.append(note); }
      input.addEventListener('change', () => { state.time = slot.minute; error('time-error', ''); selection(); });
      fragment.append(label);
    });
    $('#time-options').replaceChildren(fragment);
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
    selection();
  }
  function validateStep(index) {
    if (index === 0 && !state.service) {
      error('service-error', 'Choisissez une prestation pour continuer.');
      serviceInputs[0].focus(); return false;
    }
    if (index === 1 && !state.day) {
      error('day-error', 'Choisissez un jour pour continuer.');
      $('#day-options input:not(:disabled)')?.focus(); return false;
    }
    if (index === 2 && (state.time === null || !VintageModel.available(state.day, state.time, state.service.duration))) {
      error('time-error', 'Choisissez un créneau d’essai encore disponible.');
      renderSlots(); $('#time-options input:not(:disabled)')?.focus(); return false;
    }
    return true;
  }
  serviceInputs.forEach(input => input.addEventListener('change', () => chooseService(input.value)));
  $$('[data-next]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const destination = +button.dataset.next;
      if (!validateStep(destination - 1)) return;
      if (destination === 1) renderDays();
      if (destination === 2) renderSlots();
      showStep(destination);
    });
  });
  function goBack(destination) {
    if (!canVisit(destination) || state.done) return;
    if (destination === 1) renderDays();
    if (destination === 2) renderSlots();
    showStep(destination);
  }
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goBack(+button.dataset.back)));
  stepButtons.forEach(button => button.addEventListener('click', () => goBack(+button.dataset.step)));
  $$('[data-choice]').forEach(button => button.addEventListener('click', () => {
    chooseService(button.dataset.choice); renderDays(); showStep(1, false);
    $('#reserver').scrollIntoView({ behavior: motion.matches || keyboard ? 'auto' : 'smooth', block: 'start' });
    $('#step-title-1').focus({ preventScroll: true });
  }));
  function validatePerson() {
    const first = $('#prenom'), phone = $('#telephone');
    const firstOK = first.value.trim().length >= 2;
    const phoneOK = VintageModel.validPhone(phone.value);
    error('prenom-error', firstOK ? '' : 'Saisissez au moins deux caractères pour le prénom.');
    error('telephone-error', phoneOK ? '' : 'Saisissez un mobile français commençant par 06 ou 07, avec dix chiffres.');
    first.setAttribute('aria-invalid', String(!firstOK)); phone.setAttribute('aria-invalid', String(!phoneOK));
    if (!firstOK) first.focus(); else if (!phoneOK) phone.focus();
    return firstOK && phoneOK;
  }
  ['prenom', 'telephone'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); error(`${id}-error`, ''); });
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || state.done) return;
    if (!VintageModel.available(state.day, state.time, state.service.duration)) {
      state.time = null; renderSlots(); showStep(2);
      error('time-error', 'Ce créneau d’essai est passé. Choisissez une autre heure ou un autre jour.');
      return;
    }
    if (!validatePerson()) return;
    $('#success-recap').textContent = recap();
    $('#prenom').value = ''; $('#telephone').value = '';
    state.done = true;
    showStep(4);
    announce('Simulation terminée. Aucun rendez-vous n’a été pris. Aucune donnée n’a été envoyée.');
  });
  $('#restart').addEventListener('click', () => {
    $('#booking-form').reset();
    state.service = null; state.day = null; state.time = null; state.done = false;
    $$('.field-error').forEach(node => { node.textContent = ''; });
    $$('.input-row input').forEach(input => input.removeAttribute('aria-invalid'));
    $('#success-recap').textContent = '';
    showStep(0);
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    ++transitionId; stopMotion();
    panels.forEach((panel, i) => { panel.hidden = i !== state.step; });
    root.classList.add('ready');
    $$('.awaiting').forEach(element => element.classList.remove('awaiting'));
  });
  if ('IntersectionObserver' in window) {
    if (!motion.matches) {
      const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('awaiting'); reveal.unobserve(entry.target);
      }), { threshold: .12 });
      $$('[data-reveal]').forEach((element, index) => {
        element.classList.add('awaiting');
        if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 3) * 60}ms`;
        reveal.observe(element);
      });
    }
    const bar = $('.mobile-bar');
    const visible = new Map([['actions-hero', false], ['reserver', false], ['pied', false]]);
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.isIntersecting));
      const hide = Array.from(visible.values()).some(Boolean);
      bar.classList.toggle('is-hidden', hide); bar.inert = hide;
    });
    visible.forEach((_, id) => barObserver.observe($(`#${id}`)));
  }
  selection();
  window.vintagePret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
