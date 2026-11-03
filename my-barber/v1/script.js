/* MY BARBER · carte postale. Aucun appel réseau, stockage ou envoi de formulaire. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  // Recherche existante : Planity, consulté le 03/11/2026. Aucun prix dans la simulation.
  const services = [
    { id: 'coupe', name: 'Coupe Homme', duration: 30 },
    { id: 'longs', name: 'Coupe Homme cheveux longs', duration: 40 },
    { id: 'duo', name: 'Coupe Homme + Barbe', duration: 30 },
    { id: 'courte', name: 'Barbe Courte', duration: 30 },
    { id: 'longue', name: 'Barbe longue', duration: 30 }
  ];
  const state = { step: 0, service: null, day: null, time: null, complete: false };
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const todayFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(todayFormatter.formatToParts(now).map((part) => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateFromKey = (key) => new Date(`${key}T12:00:00Z`);
  const dayKey = (date) => date.toISOString().slice(0, 10);
  const formatTime = (minutes) => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const serviceById = (id) => services.find((service) => service.id === id);
  const announcement = $('#booking-announcement');
  let pointerAction = false;
  document.addEventListener('pointerdown', () => { pointerAction = true; }, { passive: true });
  document.addEventListener('keydown', () => { pointerAction = false; });

  function radioChoice({ group, value, content, className = '', disabled = false, description }) {
    const label = document.createElement('label');
    label.className = `choice ${className}${disabled ? ' is-disabled' : ''}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = value;
    input.disabled = disabled;
    if (description) {
      input.setAttribute('aria-describedby', description);
      input.setAttribute('aria-invalid', 'false');
    }
    label.append(input);
    const text = document.createElement('span');
    text.innerHTML = content;
    label.append(text);
    return label;
  }

  function createServices() {
    const container = $('#service-choices');
    services.forEach((service) => {
      const choice = radioChoice({ group: 'prestation', value: service.id, content: service.name, description: 'service-error' });
      const duration = document.createElement('small');
      duration.textContent = `${service.duration}\u00a0min`;
      choice.append(duration);
      container.append(choice);
    });
  }

  function createDays() {
    const container = $('#day-choices');
    container.replaceChildren();
    const current = dateFromKey(parisNow().key);
    for (let i = 0; i < 14; i += 1) {
      const day = new Date(current);
      day.setUTCDate(day.getUTCDate() + i);
      const key = dayKey(day);
      const closed = day.getUTCDay() === 0;
      const label = radioChoice({
        group: 'jour', value: key, disabled: closed, className: 'choice-day', description: 'day-error',
        content: `<span class="day-name">${shortDayFormatter.format(day)}</span><span class="day-number">${day.getUTCDate()}</span><span class="day-month">${monthFormatter.format(day)}</span>`
      });
      label.querySelector('input').setAttribute('aria-label', `${dateFormatter.format(day)}${closed ? ', fermé' : ', simulation'}`);
      label.querySelector('input').checked = state.day === key;
      if (closed) {
        const note = document.createElement('small');
        note.textContent = 'Fermé';
        label.append(note);
      }
      container.append(label);
    }
  }

  function slotsFor(day, duration, now = parisNow()) {
    if (!day || dateFromKey(day).getUTCDay() === 0) return [];
    const seed = Number(day.replaceAll('-', ''));
    const slots = [];
    // Planity et iCoiffeur : lundi–samedi, 09:00–19:00. Pas de dépassement de fin de journée.
    for (let time = 540; time + duration <= 1140; time += 30) {
      const past = day < now.key || (day === now.key && time <= now.minutes);
      const unavailable = (seed + Math.floor(time / 30)) % 7 === 0;
      slots.push({ time, disabled: past || unavailable, reason: past ? 'Passé' : unavailable ? 'Pris (essai)' : '' });
    }
    return slots;
  }

  function createTimes() {
    const container = $('#time-choices');
    container.replaceChildren();
    const service = serviceById(state.service);
    const slots = slotsFor(state.day, service.duration);
    slots.forEach((slot) => {
      const choice = radioChoice({ group: 'heure', value: String(slot.time), content: formatTime(slot.time), className: 'choice-time', disabled: slot.disabled, description: 'time-error' });
      choice.querySelector('input').checked = state.time === slot.time;
      choice.querySelector('input').setAttribute('aria-label', `${formatTime(slot.time)}, ${slot.reason || 'créneau fictif'}`);
      if (slot.reason) {
        const note = document.createElement('small');
        note.textContent = slot.reason;
        choice.append(note);
      }
      container.append(choice);
    });
    $('#no-times').hidden = slots.some((slot) => !slot.disabled);
  }

  function updateRecap() {
    const values = {
      service: state.service ? serviceById(state.service).name : 'À choisir',
      day: state.day ? dateFormatter.format(dateFromKey(state.day)) : 'À choisir',
      time: state.time !== null ? formatTime(state.time) : 'À choisir'
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = $(`#recap-${key}`);
      node.textContent = value;
      node.classList.toggle('is-filled', value !== 'À choisir');
    });
    $$('.steps button').forEach((button, index) => {
      button.disabled = state.complete || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null);
      if (!state.complete && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function clearErrors() {
    $$('.field-error').forEach((node) => { node.textContent = ''; });
    $$('input[aria-invalid]').forEach((input) => input.setAttribute('aria-invalid', 'false'));
  }

  function showStep(step, focus = true) {
    if (step === 1) createDays();
    if (step === 2) createTimes();
    state.step = step;
    clearErrors();
    $$('.step-panel').forEach((panel, index) => {
      panel.hidden = index !== step;
      panel.classList.remove('is-entering');
    });
    const panel = $(`[data-panel="${step}"]`);
    if (pointerAction && !reducedMotion.matches) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }
    $('#previous-step').hidden = step === 0;
    const nextLabels = ['Choisir le jour', 'Choisir l’heure', 'Vérifier ma carte', 'Terminer la simulation'];
    $('#next-step').innerHTML = `${nextLabels[step]} <span aria-hidden="true">→</span>`;
    updateRecap();
    if (focus) panel.querySelector('h3').focus({ preventScroll: true });
    announcement.textContent = `Étape ${step + 1} sur 4 : ${panel.querySelector('h3').textContent}`;
  }

  function showError(group, message) {
    const ids = { prestation: 'service-error', jour: 'day-error', heure: 'time-error' };
    $(`#${ids[group]}`).textContent = message;
    const inputs = $$(`input[name="${group}"]:not(:disabled)`);
    inputs.forEach((input) => input.setAttribute('aria-invalid', 'true'));
    if (inputs[0]) inputs[0].focus({ preventScroll: true });
    else $('#previous-step').focus({ preventScroll: true });
  }

  $('#booking-form').addEventListener('change', (event) => {
    const { name, value } = event.target;
    clearErrors();
    if (name === 'prestation') {
      state.service = value;
      state.time = null;
    } else if (name === 'jour') {
      state.day = value;
      state.time = null;
    } else if (name === 'heure') state.time = Number(value);
    updateRecap();
  });

  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step === 0 && !state.service) return showError('prestation', 'Choisissez une prestation pour continuer.');
    if (state.step === 1 && !state.day) return showError('jour', 'Choisissez un jour pour continuer.');
    if (state.step === 2 && state.time === null) return showError('heure', 'Choisissez une heure fictive pour continuer.');
    if (state.step >= 2) {
      const slots = slotsFor(state.day, serviceById(state.service).duration);
      if (!slots.some((slot) => slot.time === state.time && !slot.disabled)) {
        state.time = null;
        showStep(2);
        return showError('heure', 'Cette heure n’est plus proposée dans l’essai. Choisissez un autre créneau ou revenez au jour.');
      }
    }
    if (state.step < 3) return showStep(state.step + 1);
    state.complete = true;
    $('#booking-form').hidden = true;
    $('#booking-success').hidden = false;
    $('#success-recap').textContent = `${serviceById(state.service).name} · ${dateFormatter.format(dateFromKey(state.day))} · ${formatTime(state.time)}. Cette carte est fictive.`;
    updateRecap();
    $('#booking-success h3').focus({ preventScroll: true });
    announcement.textContent = 'Simulation terminée. Rien n’a été réservé ni envoyé au salon.';
  });

  $('#previous-step').addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  $$('.steps button').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $('#restart-booking').addEventListener('click', () => {
    Object.assign(state, { step: 0, service: null, day: null, time: null, complete: false });
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('#booking-success').hidden = true;
    showStep(0);
  });
  $$('[data-service]').forEach((link) => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    state.time = null;
    state.complete = false;
    $(`#service-choices input[value="${state.service}"]`).checked = true;
    $('#booking-form').hidden = false;
    $('#booking-success').hidden = true;
    showStep(0);
  }));

  createServices();
  showStep(0, false);
  $('#booking-app').hidden = false;
  $('#booking-fallback').hidden = true;

  const revealElements = $$('[data-reveal]');
  const revealAll = () => revealElements.forEach((element) => element.classList.add('is-visible'));
  let observer;
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    let rowIndex = 0;
    revealElements.forEach((element) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${rowIndex++ * 50}ms`;
    });
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => observer.observe(element));
  } else revealAll();
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      observer?.disconnect();
      revealAll();
    }
  });
  root.classList.add('site-ready');
  window.sitePret = true;
})();
