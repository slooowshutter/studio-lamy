(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'pose-court', name: 'Pose complète gel/résine court' },
    { id: 'pose-long', name: 'Pose complète gel/résine long' },
    { id: 'gainage', name: 'Gainage gel sur ongles naturels' },
    { id: 'remplissage-court', name: 'Remplissage court' },
    { id: 'remplissage-long', name: 'Remplissage long' }
  ];
  const state = { step: 1, service: '', day: '', time: null };
  const labels = { 1: 'Prestation', 2: 'Jour', 3: 'Heure', 4: 'Vos coordonnées' };
  const form = $('#booking-form');
  const panels = $$('[data-panel]', form);
  const live = $('#booking-live');
  const summaryFrames = new Map();
  let keyboardAction = false;
  let panelFrame = 0;

  document.addEventListener('keydown', () => { keyboardAction = true; }, true);
  document.addEventListener('pointerdown', () => { keyboardAction = false; }, true);

  function parisNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }

  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function longDay(key) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(dateFromKey(key));
  }
  function hourLabel(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  }
  function slotState(key, minutes, now = parisNow()) {
    const past = key < now.key || (key === now.key && minutes <= now.minutes);
    // La cadence sert uniquement à présenter l’essai ; aucune durée de soin n’est déduite.
    const seed = Number(key.replaceAll('-', ''));
    const unavailable = (seed + Math.floor(minutes / 30)) % 6 === 0;
    return { disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans l’essai' : '' };
  }
  function daySlots(key, now = parisNow()) {
    const result = [];
    // Plage Planity sourcée : 08:00–20:00, tous les jours ; aucune durée inventée.
    for (let minutes = 8 * 60; minutes < 20 * 60; minutes += 30) {
      result.push({ minutes, ...slotState(key, minutes, now) });
    }
    return result;
  }

  function radioChoice(name, value, className, checked, disabled = false) {
    const label = document.createElement('label');
    label.className = `choice ${className}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.disabled = disabled;
    label.append(input);
    return { label, input };
  }
  function appendText(parent, tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }
  function renderServices() {
    const container = $('#service-choices');
    services.forEach(service => {
      const { label } = radioChoice('prestation', service.id, 'service-choice', state.service === service.id);
      appendText(label, 'span', service.name);
      container.append(label);
    });
  }
  function renderDays() {
    const container = $('#day-choices');
    container.replaceChildren();
    const now = parisNow();
    const first = dateFromKey(now.key);
    for (let index = 0; index < 14; index++) {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const disabled = daySlots(key, now).every(slot => slot.disabled);
      const { label, input } = radioChoice('jour', key, 'day-choice', state.day === key, disabled);
      const options = { timeZone: 'Europe/Paris' };
      input.setAttribute('aria-label', `${longDay(key)}${disabled ? ', aucun créneau d’essai restant' : ''}`);
      appendText(label, 'span', new Intl.DateTimeFormat('fr-FR', { ...options, weekday: 'short' }).format(date), 'day-name');
      appendText(label, 'span', new Intl.DateTimeFormat('fr-FR', { ...options, day: 'numeric' }).format(date), 'day-number');
      appendText(label, 'span', disabled ? 'Terminé' : new Intl.DateTimeFormat('fr-FR', { ...options, month: 'short' }).format(date), 'day-month');
      container.append(label);
    }
  }
  function renderSlots() {
    const container = $('#slot-choices');
    container.replaceChildren();
    const slots = daySlots(state.day);
    if (state.time !== null && slots.find(slot => slot.minutes === state.time)?.disabled) state.time = null;
    slots.forEach(slot => {
      const { label, input } = radioChoice('heure', String(slot.minutes), 'slot-choice', state.time === slot.minutes, slot.disabled);
      input.setAttribute('aria-label', `${hourLabel(slot.minutes)}${slot.reason ? `, ${slot.reason}` : ', créneau fictif'}`);
      appendText(label, 'span', hourLabel(slot.minutes));
      if (slot.disabled) appendText(label, 'small', slot.reason === 'Heure passée' ? 'Passée' : 'Essai indisponible');
      container.append(label);
    });
    $('#empty-slots').hidden = slots.some(slot => !slot.disabled);
  }
  function updateSummaryText(id, value) {
    const element = $(id);
    if (element.textContent === value) return;
    if (summaryFrames.has(id)) cancelAnimationFrame(summaryFrames.get(id));
    element.classList.remove('is-changing');
    element.textContent = value;
    if (reducedMotion.matches || keyboardAction) return;
    element.classList.add('is-changing');
    element.getBoundingClientRect();
    summaryFrames.set(id, requestAnimationFrame(() => {
      element.classList.remove('is-changing');
      summaryFrames.delete(id);
    }));
  }
  function updateSummary() {
    const service = services.find(item => item.id === state.service);
    updateSummaryText('#summary-service', service?.name || 'À choisir');
    updateSummaryText('#summary-day', state.day ? longDay(state.day) : 'À choisir');
    updateSummaryText('#summary-time', state.time !== null ? hourLabel(state.time) : 'À choisir');
    $('#sheet-status').textContent = state.step === 5 ? 'Noté, pour cet essai seulement.' : 'À vous de choisir.';
    $$('[data-go]', form).forEach(button => {
      const step = Number(button.dataset.go);
      button.disabled = state.step === 5 || (step >= 2 && !state.service) || (step >= 3 && !state.day) || (step >= 4 && state.time === null);
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function recap() {
    const service = services.find(item => item.id === state.service);
    return `${service.name}, ${longDay(state.day)}, à ${hourLabel(state.time)}. Simulation uniquement.`;
  }
  function showError(id, input) {
    $(id).hidden = false;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
    live.textContent = $(id).textContent;
  }
  function go(step, { focus = true, scroll = true } = {}) {
    if ((step > 1 && !state.service) || (step > 2 && !state.day) || (step > 3 && state.time === null)) return;
    const previous = state.step;
    state.step = step;
    if (step === 2) renderDays();
    if (step === 3) renderSlots();
    if (step === 4) $('#final-recap').textContent = recap();
    cancelAnimationFrame(panelFrame);
    panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.panel) !== step;
      panel.classList.remove('is-entering', 'is-entering-back');
    });
    const panel = $(`[data-panel="${step}"]`, form);
    if (!reducedMotion.matches && !keyboardAction && previous !== step) {
      const motionClass = step < previous ? 'is-entering-back' : 'is-entering';
      panel.classList.add(motionClass);
      panel.getBoundingClientRect();
      panelFrame = requestAnimationFrame(() => panel.classList.remove(motionClass));
    }
    $$('.field-error', form).forEach(error => { error.hidden = true; });
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    updateSummary();
    if (!focus) return;
    const heading = $('.panel-heading', panel);
    heading.focus({ preventScroll: true });
    live.textContent = step === 5 ? 'Fin de la simulation. Aucun rendez-vous pris et aucune information envoyée.' : `Étape ${step} sur 4\u00a0: ${labels[step]}.`;
    const position = heading.getBoundingClientRect();
    if (scroll && (position.top < 24 || position.bottom > window.innerHeight - 100)) {
      heading.scrollIntoView({ behavior: reducedMotion.matches || keyboardAction ? 'instant' : 'smooth', block: 'start' });
    }
  }
  function next() {
    if (state.step === 1 && !state.service) return showError('#error-service', $('input[name="prestation"]', form));
    if (state.step === 2 && !state.day) return showError('#error-day', $('input[name="jour"]:not(:disabled)', form));
    if (state.step === 3 && state.time === null) return showError('#error-time', $('input[name="heure"]:not(:disabled)', form));
    if (state.step < 4) go(state.step + 1);
  }

  form.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-next')) next();
    if (target.hasAttribute('data-back')) go(state.step - 1);
    if (target.dataset.go) go(Number(target.dataset.go));
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value;
      $('#error-service').hidden = true;
    }
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = null;
      state.day = input.value;
      $('#error-day').hidden = true;
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      $('#error-time').hidden = true;
    }
    input.removeAttribute('aria-invalid');
    updateSummary();
  });
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'first-name' || input.id === 'telephone') {
      input.removeAttribute('aria-invalid');
      $(input.id === 'first-name' ? '#error-name' : '#error-phone').hidden = true;
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 4) return next();
    if (state.step !== 4) return;
    const firstName = $('#first-name');
    const phone = $('#telephone');
    const validName = firstName.value.trim().length > 0;
    const normalizedPhone = phone.value.replace(/[\s.()–-]/g, '');
    const validPhone = /^(?:0|\+33|0033)[67]\d{8}$/.test(normalizedPhone);
    $('#error-name').hidden = validName;
    $('#error-phone').hidden = validPhone;
    firstName.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) {
      const invalid = !validName ? firstName : phone;
      invalid.focus();
      live.textContent = !validName ? $('#error-name').textContent : $('#error-phone').textContent;
      return;
    }
    if (slotState(state.day, state.time).disabled) {
      $('#error-expired').hidden = false;
      $('#error-expired').setAttribute('tabindex', '-1');
      $('#error-expired').focus();
      live.textContent = $('#error-expired').textContent;
      return;
    }
    $('#success-recap').textContent = recap();
    // Rien n’est envoyé, ni enregistré dans le navigateur.
    firstName.value = '';
    phone.value = '';
    go(5);
  });
  $('#restart').addEventListener('click', () => {
    form.reset();
    state.service = '';
    state.day = '';
    state.time = null;
    go(1);
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    state.service = link.dataset.service;
    state.day = '';
    state.time = null;
    const input = $(`input[value="${state.service}"]`, form);
    if (input) input.checked = true;
    $('#first-name').value = '';
    $('#telephone').value = '';
    go(2);
  }));

  // Les actions clavier restent immédiates, conformément aux standards de mouvement.
  const keyboardStyle = document.createElement('style');
  keyboardStyle.textContent = '.keyboard-action .booking-panel,.keyboard-action .selection-sheet dd{transition:none;transform:none;opacity:1}';
  document.head.append(keyboardStyle);
  document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-action'), true);
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-action'), true);

  renderServices();
  $('#simulation').hidden = false;
  go(1, { focus: false, scroll: false });

  const revealElements = $$('[data-reveal], [data-rule]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('in-view'));

  document.documentElement.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
})();
