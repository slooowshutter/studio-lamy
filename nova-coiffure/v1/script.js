/* Simulation locale : aucun envoi, aucun stockage, aucun agenda réel. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const services = [
    { id: 'coupe', name: 'Coupe homme', duration: 30 },
    { id: 'coiffage', name: 'Shampoing, coupe et coiffage homme', duration: 35 },
    { id: 'barbe', name: 'Taille de barbe', duration: 25 },
    { id: 'duo', name: 'Coupe et taille de barbe', duration: 45 },
    { id: 'rasage', name: 'Rasage à l’ancienne', duration: 25 }
  ];
  // Horaires Treatwell et iCoiffeur : 9 h–21 h, lundi–samedi ; dimanche fermé.
  const opening = 9 * 60;
  const closing = 21 * 60;
  const state = { service: null, date: '', time: null, current: 0, furthest: 0, done: false };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(instant = new Date()) {
    const parts = {};
    parisFormat.formatToParts(instant).forEach(part => { parts[part.type] = part.value; });
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const keyFromDate = date => date.toISOString().slice(0, 10);
  const formatTime = minutes => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const longDate = key => dateFormat.format(dateFromKey(key));

  function makeSlots(key, duration, now = parisNow()) {
    const date = dateFromKey(key);
    if (!key || !Number.isFinite(date.getTime()) || date.getUTCDay() === 0 || key < now.key) return [];
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    for (let minute = opening; minute + duration <= closing; minute += 30) {
      const past = key === now.key && minute <= now.minutes;
      const unavailable = (seed + minute / 30) % 7 === 2;
      slots.push({ minute, disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans cet exemple' : '' });
    }
    return slots;
  }

  function availableDay(key, duration, now = parisNow()) {
    const start = dateFromKey(now.key);
    const difference = Math.round((dateFromKey(key) - start) / 86400000);
    return difference >= 0 && difference < 14 && makeSlots(key, duration, now).some(slot => !slot.disabled);
  }

  function selectedSlotIsValid() {
    return state.service && state.date && state.time !== null && availableDay(state.date, state.service.duration) &&
      makeSlots(state.date, state.service.duration).some(slot => slot.minute === state.time && !slot.disabled);
  }

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      root.classList.add('keyboard-navigation');
    }
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-navigation'), { passive: true });

  // Le contenu n’est masqué qu’une fois l’observateur opérationnel.
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
    // Le titre reste lisible si un navigateur interrompt les premières trames.
    window.setTimeout(() => root.classList.add('entered'), 1000);
  }

  const app = $('#booking-app');
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const serviceOptions = $('#service-options');
  const dateOptions = $('#date-options');
  const timeOptions = $('#time-options');
  let announcementTimer;

  function focusInView(element) {
    element.focus({ preventScroll: true });
    const bounds = element.getBoundingClientRect();
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    if (bounds.top < 24 || bounds.bottom > viewportHeight - 24) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
  }

  function announce(message) {
    window.clearTimeout(announcementTimer);
    $('#booking-announcement').textContent = '';
    announcementTimer = window.setTimeout(() => { $('#booking-announcement').textContent = message; }, 30);
  }

  function setSummary(selector, value) {
    const element = $(selector);
    if (element.textContent === value) return;
    element.textContent = value;
    if (!reducedMotion.matches && !root.classList.contains('keyboard-navigation') && element.animate) {
      element.getAnimations().forEach(animation => animation.cancel());
      element.animate([{ opacity: .3, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
      });
    }
  }

  function recap() {
    if (!state.service || !state.date || state.time === null) return '';
    return `${state.service.name}, le ${longDate(state.date)} à ${formatTime(state.time)}. Simulation uniquement.`;
  }

  function updateSummary() {
    setSummary('#summary-service', state.service ? state.service.name : 'À choisir');
    setSummary('#summary-date', state.date ? longDate(state.date) : 'À choisir');
    setSummary('#summary-time', state.time !== null ? formatTime(state.time) : 'À choisir');
    $('#final-recap').textContent = recap();
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || index > state.furthest;
      if (index === state.current && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function buildServiceOptions() {
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'choice service-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'prestation';
      input.value = service.id;
      input.setAttribute('aria-describedby', 'service-error');
      const name = document.createElement('span');
      name.textContent = service.name;
      const duration = document.createElement('span');
      duration.className = 'duration';
      duration.textContent = `${service.duration}\u00a0min`;
      label.append(input, name, duration);
      serviceOptions.append(label);
      input.addEventListener('change', () => {
        state.service = service;
        state.time = null;
        state.furthest = Math.min(state.furthest, 1);
        if (state.date && !availableDay(state.date, service.duration)) state.date = '';
        $('#service-error').textContent = '';
        updateSummary();
      });
    });
  }

  function buildDates() {
    dateOptions.replaceChildren();
    const now = parisNow();
    const first = dateFromKey(now.key);
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + i);
      const key = keyFromDate(date);
      const sunday = date.getUTCDay() === 0;
      const available = availableDay(key, state.service.duration, now);
      const label = document.createElement('label');
      label.className = 'choice date-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = !available;
      input.checked = state.date === key && available;
      const dayState = sunday ? 'Fermé' : !available ? 'Écoulé' : i === 0 ? 'Aujourd’hui' : 'Exemple';
      input.setAttribute('aria-label', `${longDate(key)}, ${dayState.toLowerCase()}`);
      input.setAttribute('aria-describedby', 'date-error');
      label.append(input);
      [['day-week', dayFormat.format(date)], ['day-number', date.getUTCDate()], ['day-month', monthFormat.format(date)], ['day-state', dayState]].forEach(([className, text]) => {
        const span = document.createElement('span'); span.className = className; span.textContent = text;
        span.setAttribute('aria-hidden', 'true'); label.append(span);
      });
      input.addEventListener('change', () => {
        state.date = key; state.time = null; state.furthest = Math.min(state.furthest, 2);
        $('#date-error').textContent = ''; updateSummary();
      });
      dateOptions.append(label);
    }
  }

  function buildTimes() {
    timeOptions.replaceChildren();
    const slots = makeSlots(state.date, state.service.duration);
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p');
      message.className = 'small-copy'; message.textContent = 'Il ne reste plus de créneau pour ce jour. Revenez au choix du jour.';
      timeOptions.append(message);
    }
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'choice time-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute); input.disabled = slot.disabled;
      input.checked = state.time === slot.minute && !slot.disabled;
      input.setAttribute('aria-label', `${formatTime(slot.minute)}, ${slot.reason || 'créneau fictif'}`);
      input.setAttribute('aria-describedby', 'time-error');
      const span = document.createElement('span'); span.className = 'time-value'; span.textContent = formatTime(slot.minute);
      span.setAttribute('aria-hidden', 'true');
      label.append(input, span); timeOptions.append(label);
      input.addEventListener('change', () => {
        state.time = slot.minute; $('#time-error').textContent = ''; updateSummary();
      });
    });
  }

  function changeStep(next, focus = true) {
    state.current = next;
    state.furthest = Math.max(state.furthest, next);
    if (next === 1) buildDates();
    if (next === 2) buildTimes();
    panels.forEach((panel, index) => {
      panel.hidden = index !== next;
      panel.classList.remove('entering');
    });
    const panel = panels[next];
    if (!reducedMotion.matches && !root.classList.contains('keyboard-navigation')) {
      panel.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
    }
    updateSummary();
    const heading = $(`#step-title-${next}`);
    if (focus) focusInView(heading);
    announce(`Étape ${next + 1} sur 4. ${heading.textContent}`);
  }

  function rejectSelection(field, message) {
    $(`#${field}-error`).textContent = message;
    const group = $(`#${field === 'service' ? 'service' : field === 'date' ? 'date' : 'time'}-options`);
    const input = $('input:not(:disabled)', group);
    if (input) focusInView(input);
    announce(message);
  }

  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !state.service) return rejectSelection('service', 'Choisissez une prestation pour continuer.');
    if (next === 2 && (!state.date || !availableDay(state.date, state.service.duration))) {
      state.date = ''; state.time = null; buildDates(); updateSummary();
      return rejectSelection('date', 'Choisissez un jour encore disponible dans cet exemple.');
    }
    if (next === 3 && !selectedSlotIsValid()) {
      state.time = null; buildTimes(); updateSummary();
      return rejectSelection('time', 'Choisissez une heure encore disponible dans cet exemple.');
    }
    changeStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => changeStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.step);
    if (next > 1 && (!state.date || !state.service || !availableDay(state.date, state.service.duration))) return changeStep(1);
    if (next === 3 && !selectedSlotIsValid()) return changeStep(2);
    changeStep(next);
  }));

  const nameInput = $('#first-name');
  const phoneInput = $('#phone');
  [nameInput, phoneInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(input === nameInput ? '#name-error' : '#phone-error').textContent = '';
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    // Entrée dans un champ ne doit jamais sauter une étape ou envoyer une donnée.
    if (state.current !== 3) return;
    if (!selectedSlotIsValid()) {
      state.time = null; state.furthest = 2; changeStep(2);
      rejectSelection('time', 'Ce créneau est passé. Choisissez une autre heure, ou revenez au choix du jour.');
      return;
    }
    let invalid = null;
    const name = nameInput.value.trim();
    const telephone = phoneInput.value.replace(/[\s().-]/g, '');
    if (!name || !/\p{L}/u.test(name)) {
      nameInput.setAttribute('aria-invalid', 'true');
      $('#name-error').textContent = 'Indiquez un prénom, même fictif, pour terminer l’essai.';
      invalid = nameInput;
    }
    if (!/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(telephone)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      $('#phone-error').textContent = 'Indiquez un numéro français à 10 chiffres, ou au format +33.';
      invalid = invalid || phoneInput;
    }
    if (invalid) {
      focusInView(invalid); announce('Vérifiez les champs signalés avant de terminer l’essai.'); return;
    }
    state.done = true;
    $('#success-recap').textContent = recap();
    form.hidden = true;
    $('#booking-success').hidden = false;
    nameInput.value = ''; phoneInput.value = '';
    updateSummary();
    focusInView($('#success-title'));
    announce('Simulation terminée. Aucun rendez-vous pris, aucune information envoyée.');
  });

  function resetBooking(focus = true) {
    Object.assign(state, { service: null, date: '', time: null, current: 0, furthest: 0, done: false });
    form.reset(); form.hidden = false;
    $('#booking-success').hidden = true;
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    changeStep(0, focus);
  }
  $('#restart').addEventListener('click', () => resetBooking());

  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    const service = services.find(item => item.id === link.dataset.service);
    if (!service) return;
    event.preventDefault();
    resetBooking(false);
    state.service = service;
    $(`input[value='${service.id}']`, serviceOptions).checked = true;
    changeStep(1);
  }));

  buildServiceOptions();
  updateSummary();
  app.hidden = false;

  // La barre d’action ne recouvre ni le parcours ni les notes de pied de page.
  const mobileBar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const active = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) active.add(entry.target.id); else active.delete(entry.target.id);
      });
      const hidden = active.size > 0;
      mobileBar.classList.toggle('is-hidden', hidden);
      mobileBar.inert = hidden;
    }, { threshold: 0 });
    barObserver.observe($('#reserver'));
    barObserver.observe($('#pied-de-page'));
  }
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      root.classList.remove('motion-ready');
      $$('.entering').forEach(element => element.classList.remove('entering'));
    }
  });
})();
