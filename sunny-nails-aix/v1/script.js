'use strict';
/* Core: calendar dates and prices stay independent of the viewer's timezone. */
const SunnyBooking = (() => {
  const services = Object.freeze({
    naturel: { name: 'Gel ou résine sur ongle naturel, sans capsule', minutes: 45, cents: 5000 },
    french: { name: 'Babyboomer / French, gel ou résine', minutes: 60, cents: 6000 },
    semi: { name: 'Pose gel ou résine + semi-permanent', minutes: 60, cents: 5500 },
    remplissage: { name: 'Remplissage gel / résine + semi-permanent', minutes: 45, cents: 4500 }
  });
  const parisFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function now(date = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(date).map(part => [part.type, part.value]));
    return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const addDays = (day, count) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
  const weekday = day => new Date(`${day}T12:00:00Z`).getUTCDay();
  const dateLabel = day => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00:00Z`));
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const money = cents => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(cents / 100);
  function total(state) {
    const service = services[state.service];
    if (!service) return { minutes: 0, cents: 0 };
    return { minutes: service.minutes + (state.nailart ? 5 : 0) + (state.french && state.service !== 'french' ? 10 : 0), cents: service.cents + (state.nailart ? 150 : 0) + (state.french && state.service !== 'french' ? 500 : 0) };
  }
  function slots(day, duration, current = now()) {
    if (!duration || weekday(day) === 0) return [];
    const seed = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400000);
    const result = [];
    for (let minute = 600; minute + duration <= 1200; minute += 30) {
      const past = day < current.day || (day === current.day && minute <= current.minutes);
      const busy = (seed + minute / 30) % 7 === 0;
      result.push({ minute, disabled: past || busy, reason: past ? 'passé' : busy ? 'déjà pris' : '' });
    }
    return result;
  }
  function validMobile(value) {
    const phone = value.replace(/[\s.()\-]/g, '').replace(/^\+330/, '+33').replace(/^00330/, '0033');
    return /^(?:0|\+33|0033)[67]\d{8}$/.test(phone);
  }
  return Object.freeze({ services, now, addDays, weekday, dateLabel, timeLabel, money, total, slots, validMobile });
})();

/* Interface: no request, cookie or persistent storage. */
(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const core = SunnyBooking;
  const state = { service: '', nailart: false, french: false, day: '', time: null, step: 0, unlocked: 0, done: false };
  let transitionId = 0;
  let dayStart = '';
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const live = $('#booking-status');
  const mobileSummary = document.createElement('p');
  mobileSummary.className = 'mobile-selection';
  $('.step-nav').after(mobileSummary);
  const announce = text => { live.textContent = text; };

  document.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-mode'), { passive: true });

  function extraLabel() {
    const items = [];
    if (state.nailart) items.push('Nail art sur un ongle');
    if (state.french) items.push('French');
    return items.length ? items.join(' + ') : 'Sans supplément';
  }
  function recap() {
    const service = core.services[state.service];
    if (!service) return '';
    const amount = core.total(state);
    return `${service.name}${state.nailart || state.french ? ` + ${extraLabel()}` : ''} · ${state.day ? core.dateLabel(state.day) : 'jour à choisir'}${state.time !== null ? ` à ${core.timeLabel(state.time)}` : ''} · ${amount.minutes}\u00a0min · ${core.money(amount.cents)} (indicatif).`;
  }
  function updateSummary() {
    const service = core.services[state.service];
    const amount = core.total(state);
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-extra').textContent = extraLabel();
    $('#summary-day').textContent = state.day ? core.dateLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? core.timeLabel(state.time) : 'À choisir';
    $('#summary-price').textContent = service ? core.money(amount.cents) : '—';
    $('#summary-duration').textContent = service ? `${amount.minutes}\u00a0min au total · durée indicative` : 'La durée dépend de votre sélection.';
    $('#final-recap').textContent = recap();
    mobileSummary.textContent = service ? `${service.name}${state.nailart || state.french ? ` + ${extraLabel()}` : ''} · ${amount.minutes}\u00a0min · ${core.money(amount.cents)} indicatifs${state.day ? ` · ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${state.day}T12:00:00Z`))}` : ''}${state.time !== null ? ` à ${core.timeLabel(state.time)}` : ''}` : 'Votre sélection apparaîtra ici.';
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || index > state.unlocked;
      if (!state.done && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function markError(id, message, input) {
    $(`#${id}`).textContent = message;
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  function clearFlowErrors() {
    ['service-error', 'day-error', 'time-error', 'confirm-error'].forEach(id => markError(id, ''));
  }
  function resetSchedule() {
    state.day = '';
    state.time = null;
    state.unlocked = 0;
    dayStart = '';
    clearFlowErrors();
    updateSummary();
  }
  function buildDays() {
    const current = core.now();
    const container = $('#day-options');
    container.replaceChildren();
    dayStart = current.day;
    for (let index = 0; index < 14; index++) {
      const day = core.addDays(current.day, index);
      const date = new Date(`${day}T12:00:00Z`);
      const closed = core.weekday(day) === 0;
      const ended = !closed && !core.slots(day, core.total(state).minutes, current).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'choice-label';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'day'; input.value = day; input.disabled = closed || ended;
      input.checked = state.day === day;
      input.setAttribute('aria-label', `${core.dateLabel(day)}${closed ? ', fermé' : ended ? ', aucun créneau' : ''}`);
      input.setAttribute('aria-describedby', 'day-error');
      const content = document.createElement('span');
      const week = document.createElement('span');
      week.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const number = document.createElement('b'); number.textContent = String(date.getUTCDate());
      const month = document.createElement('small');
      month.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const note = document.createElement('small'); note.textContent = closed ? 'fermé' : ended ? 'complet' : index === 0 ? 'aujourd’hui' : index === 1 ? 'demain' : '\u00a0';
      content.append(week, number, month, note); label.append(input, content); container.append(label);
    }
  }
  function buildSlots() {
    const container = $('#slot-options');
    container.replaceChildren();
    const slots = core.slots(state.day, core.total(state).minutes);
    const available = slots.filter(slot => !slot.disabled);
    $('#slot-caption').textContent = `${core.dateLabel(state.day)} · ${core.total(state).minutes}\u00a0min au total. ${available.length} créneaux fictifs libres. «\u00a0Déjà pris\u00a0» est également simulé.`;
    if (!available.length) {
      const text = document.createElement('p'); text.className = 'empty-slots'; text.textContent = 'Aucun créneau pour cette durée. Revenez au choix du jour.'; container.append(text);
    }
    for (const slot of slots) {
      const label = document.createElement('label'); label.className = 'choice-label';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'time'; input.value = String(slot.minute); input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${core.timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ''}`);
      input.setAttribute('aria-describedby', 'slot-caption time-error');
      const content = document.createElement('span'); content.textContent = core.timeLabel(slot.minute);
      if (slot.reason) { const note = document.createElement('small'); note.textContent = slot.reason; content.append(note); }
      label.append(input, content); container.append(label);
    }
  }
  function showStep(step, moveFocus = true) {
    if (step > 0 && !state.service) step = 0;
    if (step > 1 && !state.day) step = 1;
    if (step > 2 && state.time === null) step = 2;
    state.done = false;
    state.step = step;
    state.unlocked = Math.max(state.unlocked, step);
    clearFlowErrors();
    if (step === 1) buildDays();
    if (step === 2) buildSlots();
    const token = ++transitionId;
    panels.forEach((panel, index) => {
      panel.hidden = index !== step;
      panel.classList.remove('is-entering');
    });
    $('#booking-success').hidden = true;
    form.hidden = false;
    const panel = panels[step];
    if (moveFocus && !reducedMotion.matches && !root.classList.contains('keyboard-mode')) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => { if (token === transitionId) panel.classList.remove('is-entering'); }));
    }
    updateSummary();
    if (moveFocus) $(`#step-${step}-title`).focus();
    announce(`Étape ${step + 1} sur 4 : ${$(`#step-${step}-title`).textContent}`);
  }
  function scheduleStillValid() {
    const current = core.now();
    return state.day >= current.day && state.day <= core.addDays(current.day, 13) && core.slots(state.day, core.total(state).minutes, current).some(slot => slot.minute === state.time && !slot.disabled);
  }
  function handleNext(next) {
    if (next === 1 && !state.service) {
      markError('service-error', 'Choisissez une prestation pour continuer.');
      $('[name="service"]').focus(); return;
    }
    if (next === 2 && !state.day) {
      markError('day-error', 'Choisissez un jour ouvert.');
      $('[name="day"]:not(:disabled)').focus(); return;
    }
    if (next === 3 && state.time === null) {
      markError('time-error', 'Choisissez un créneau libre.');
      $('[name="time"]:not(:disabled)')?.focus(); return;
    }
    if (next === 3 && !scheduleStillValid()) {
      state.time = null; showStep(2); markError('time-error', 'Ce créneau est passé. Choisissez une nouvelle heure.'); updateSummary(); return;
    }
    showStep(next);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') {
      state.service = input.value;
      const frenchInput = $('#french-extra');
      frenchInput.disabled = input.value === 'french';
      if (frenchInput.disabled) { frenchInput.checked = false; state.french = false; }
      resetSchedule();
    } else if (input.name === 'nailart' || input.name === 'extra-french') {
      state.nailart = $('#nail-art-extra').checked;
      state.french = $('#french-extra').checked;
      resetSchedule();
    } else if (input.name === 'day') {
      state.day = input.value; state.time = null; state.unlocked = 1;
      markError('day-error', ''); updateSummary();
    } else if (input.name === 'time') {
      state.time = Number(input.value); markError('time-error', ''); updateSummary();
    }
    if (['service', 'nailart', 'extra-french', 'day', 'time'].includes(input.name)) {
      const amount = core.total(state);
      announce(`Sélection mise à jour. ${amount.minutes}\u00a0min, ${core.money(amount.cents)} indicatifs.${state.day ? ` ${core.dateLabel(state.day)}.` : ''}${state.time !== null ? ` ${core.timeLabel(state.time)}.` : ''}`);
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => handleNext(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-pick]').forEach(button => {
    button.setAttribute('aria-label', `Essayer ${core.services[button.dataset.pick].name} dans le simulateur`);
    button.addEventListener('click', () => {
      const input = $(`[name="service"][value="${button.dataset.pick}"]`);
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      showStep(0);
      $('#rendez-vous').scrollIntoView({ behavior: reducedMotion.matches || root.classList.contains('keyboard-mode') ? 'instant' : 'smooth', block: 'start' });
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) { handleNext(state.step + 1); return; }
    const nameInput = $('#first-name');
    const phoneInput = $('#phone');
    const nameOK = /\p{L}/u.test(nameInput.value.trim());
    const phoneOK = core.validMobile(phoneInput.value);
    markError('name-error', nameOK ? '' : 'Indiquez votre prénom.', nameInput);
    markError('phone-error', phoneOK ? '' : 'Indiquez un mobile français valide, par exemple 06 12 34 56 78.', phoneInput);
    if (!nameOK || !phoneOK) { (nameOK ? phoneInput : nameInput).focus(); announce('Vérifiez les coordonnées indiquées.'); return; }
    if (!scheduleStillValid()) {
      state.time = null; state.unlocked = 2; showStep(2); markError('time-error', 'Le créneau a expiré. Choisissez une nouvelle heure ou un autre jour.'); return;
    }
    state.done = true;
    ++transitionId;
    form.hidden = true;
    $('#booking-success').hidden = false;
    $('#success-greeting').textContent = `${nameInput.value.trim()}, voici le récapitulatif de votre essai\u00a0:`;
    $('#success-recap').textContent = recap();
    updateSummary();
    $('#success-title').focus();
    announce('Simulation terminée. Aucun rendez-vous réservé, aucune information envoyée.');
  });
  ['first-name', 'phone'].forEach(id => $(`#${id}`).addEventListener('input', () => markError(id === 'first-name' ? 'name-error' : 'phone-error', '', $(`#${id}`))));
  $('#restart').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { service: '', nailart: false, french: false, day: '', time: null, step: 0, unlocked: 0, done: false });
    $('#french-extra').disabled = false;
    markError('name-error', '', $('#first-name')); markError('phone-error', '', $('#phone'));
    $('#success-greeting').textContent = ''; $('#success-recap').textContent = '';
    showStep(0);
  });
  window.addEventListener('focus', () => {
    if (state.done || !state.service) return;
    if (state.step === 1 && core.now().day !== dayStart) { state.day = ''; state.time = null; state.unlocked = 1; buildDays(); updateSummary(); }
    else if (state.step === 2 && state.day) buildSlots();
  });
  $('#booking-ui').hidden = false;
  showStep(0, false);

  // One-shot editorial reveals. No scroll listener or background loop.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, index) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 4) * 60}ms`;
      revealObserver.observe(element);
    });
    const mobileBar = $('.mobile-bar');
    let heroPassed = false;
    let bookingVisible = false;
    let footerVisible = false;
    const updateBar = () => {
      const visible = heroPassed && !bookingVisible && !footerVisible;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.inert = !visible;
    };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-book') heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        if (entry.target.id === 'rendez-vous') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'pied-de-page') footerVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0 });
    ['hero-book', 'rendez-vous', 'pied-de-page'].forEach(id => barObserver.observe($(`#${id}`)));
    updateBar();
  } else {
    $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
    $('.mobile-bar').classList.add('is-visible');
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
