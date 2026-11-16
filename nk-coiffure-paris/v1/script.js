/* NK COIFFURE PARIS · carnet de tickets. Aucun envoi, aucun stockage. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') { keyboard = true; root.classList.add('no-motion'); }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('no-motion'); }, { passive: true });

  // Le contenu ne devient animé qu’après l’installation du mécanisme de révélation.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const pending = $$('[data-reveal]');
    const observer = new IntersectionObserver(entries => {
      const entering = entries.filter(entry => entry.isIntersecting);
      entering.forEach((entry, index) => {
        const element = entry.target;
        element.style.transitionDelay = `${element.dataset.reveal === 'deal' ? Math.min(index, 3) * 80 : 0}ms`;
        element.classList.add('is-visible');
        observer.unobserve(element);
      });
    }, { threshold: .08 });
    root.classList.add('motion-ready');
    pending.forEach(element => observer.observe(element));
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
    // Si une API est interrompue, la lecture reste disponible.
    setTimeout(() => {
      if (!root.classList.contains('is-loaded')) root.classList.remove('motion-ready');
    }, 2000);
  }

  const track = $('.service-track');
  const trackButtons = $$('[data-scroll]');
  function updateTrackButtons() {
    const end = track.scrollWidth - track.clientWidth;
    trackButtons[0].disabled = track.scrollLeft <= 2;
    trackButtons[1].disabled = track.scrollLeft >= end - 2;
  }
  trackButtons.forEach(button => button.addEventListener('click', () => {
    const card = $('.service-ticket', track);
    track.scrollBy({ left: Number(button.dataset.scroll) * (card.offsetWidth + 18), behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
  }));
  track.addEventListener('scroll', updateTrackButtons, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(updateTrackButtons).observe(track);
  updateTrackButtons();

  const SERVICES = {
    coupe: { label: 'Shampoing, soin, coupe et brushing', minutes: 60 },
    brushing: { label: 'Shampoing, soin et brushing', minutes: 60 },
    homme: { label: 'Shampoing, coupe homme classique et coiffage', minutes: 30 }
  };
  // Planity, recherche du 16 novembre 2026. Index 0 = dimanche ; minutes depuis minuit.
  const HOURS = { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [570, 1140] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthName = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const hoursText = minute => `${Math.floor(minute / 60)}${NB}h${minute % 60 ? NB + String(minute % 60).padStart(2, '0') : ''}`;
  const state = { step: 0, furthest: 0, service: '', day: '', time: null, complete: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const next = $('#continue');
  const back = $('#back');
  const status = $('#booking-status');
  const summary = $('#printed-ticket');
  const dayBox = $('#days');
  const slotBox = $('#slots');
  let animationToken = 0;

  function announce(message) { status.textContent = message; }
  function availableSlots(key, serviceKey) {
    if (!key || !SERVICES[serviceKey]) return [];
    const date = dateFromKey(key);
    const opening = HOURS[date.getUTCDay()];
    const now = parisNow();
    if (!opening) return [];
    const slots = [];
    for (let minute = opening[0]; minute + SERVICES[serviceKey].minutes <= opening[1]; minute += 30) {
      const past = key < now.date || (key === now.date && minute <= now.minute);
      const taken = (date.getUTCDate() * 3 + date.getUTCMonth() + minute / 30) % 7 === 2;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Occupé pour l’essai' : '' });
    }
    return slots;
  }
  function inputRadio(name, value, disabled, checked, accessibleName) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value);
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', accessibleName);
    return input;
  }
  function textElement(tag, text) {
    const element = document.createElement(tag); element.textContent = text; return element;
  }
  function renderDays() {
    dayBox.replaceChildren();
    const now = parisNow();
    const first = dateFromKey(now.date);
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(first.getTime() + offset * 86400000);
      const key = dateKey(date);
      const closed = !HOURS[date.getUTCDay()];
      const exhausted = !closed && !availableSlots(key, state.service).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'day-choice';
      const note = closed ? 'Fermé' : exhausted ? 'Complet pour l’essai' : monthName.format(date);
      label.append(inputRadio('jour', key, closed || exhausted, key === state.day, `${longDate.format(date)}${closed ? ', salon fermé' : exhausted ? ', aucun créneau pour l’essai' : ''}`), textElement('span', shortDay.format(date)), textElement('strong', String(date.getUTCDate())), textElement('small', note));
      dayBox.append(label);
    }
  }
  function renderSlots() {
    slotBox.replaceChildren();
    const slots = availableSlots(state.day, state.service);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-choice';
      label.append(inputRadio('heure', slot.minute, slot.disabled, slot.minute === state.time, `${hoursText(slot.minute)}${slot.reason ? ', ' + slot.reason.toLowerCase() : ', créneau fictif'}`), textElement('span', hoursText(slot.minute)));
      if (slot.reason) label.append(textElement('small', slot.reason));
      slotBox.append(label);
    });
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
    if (state.day) $('#slots-help').textContent = `${longDate.format(dateFromKey(state.day))}. Créneaux fictifs, dans les horaires du salon.`;
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? SERVICES[state.service].label : 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? hoursText(state.time) : 'À choisir';
    $('.receipt-name').hidden = !state.complete;
    $('#summary-name').textContent = state.complete ? $('#prenom').value.trim() : '';
  }
  function animateEntry(panel) {
    const token = ++animationToken;
    if (reduced.matches || keyboard) { panel.classList.remove('panel-arriving'); return; }
    panel.style.transition = 'none';
    panel.classList.add('panel-arriving');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token !== animationToken) return;
      panel.style.removeProperty('transition');
      panel.classList.remove('panel-arriving');
    }));
  }
  function allowedStep() {
    if (!state.service) return 0;
    if (!state.day) return 1;
    if (state.time === null) return 2;
    return 3;
  }
  function syncSteps() {
    stepButtons.forEach((button, index) => { button.disabled = index > Math.min(state.furthest, allowedStep()); });
  }
  function showStep(step, focus = true) {
    step = Math.min(step, allowedStep());
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    state.step = step;
    state.furthest = Math.max(state.furthest, step);
    panels.forEach((panel, index) => { panel.hidden = index !== step; panel.classList.remove('panel-arriving'); });
    stepButtons.forEach((button, index) => {
      button.disabled = index > Math.min(state.furthest, allowedStep());
      if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    back.hidden = step === 0;
    next.textContent = ['Choisir le jour →', 'Choisir l’heure →', 'Continuer →', 'Créer le ticket d’essai →'][step];
    $('#selection-error').textContent = '';
    form.setAttribute('aria-describedby', 'selection-error');
    updateSummary();
    root.classList.toggle('no-motion', keyboard);
    animateEntry(panels[step]);
    if (focus) $('h3', panels[step]).focus();
    announce(`Étape ${step + 1} sur 4. ${['Choix de la prestation', 'Choix du jour', 'Choix de l’heure', 'Coordonnées pour l’essai'][step]}.`);
  }
  function selectionError(message, name) {
    $('#selection-error').textContent = message;
    const input = $(`input[name="${name}"]:not(:disabled)`, panels[state.step]);
    if (input) input.focus();
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation' && input.value !== state.service) {
      state.service = input.value; state.day = ''; state.time = null; state.furthest = 0;
      stepButtons.forEach((button, index) => { button.disabled = index > 0; });
    }
    if (input.name === 'jour' && input.value !== state.day) { state.day = input.value; state.time = null; state.furthest = 1; }
    if (input.name === 'heure') state.time = Number(input.value);
    syncSteps();
    $('#selection-error').textContent = '';
    updateSummary();
  });
  back.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  function validateField(input) {
    let message = '';
    if (input.id === 'prenom' && !input.value.trim()) message = 'Indiquez un prénom pour créer le ticket d’essai.';
    if (input.id === 'telephone' && !/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(input.value.replace(/[\s.()\-]/g, ''))) message = 'Indiquez un numéro français à 10 chiffres, ou commençant par +33.';
    input.setAttribute('aria-invalid', String(Boolean(message)));
    $(`#${input.id}-error`).textContent = message;
    return !message;
  }
  $$('.contact-fields input').forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid'); $(`#${input.id}-error`).textContent = '';
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) return selectionError('Choisissez une prestation pour continuer.', 'prestation');
    if (state.step === 1 && !state.day) return selectionError('Choisissez un jour pour continuer.', 'jour');
    if (state.step === 2 && state.time === null) return selectionError('Choisissez un créneau fictif pour continuer.', 'heure');
    if (state.step < 3) { showStep(state.step + 1); return; }
    const invalid = $$('.contact-fields input').map(input => ({ input, valid: validateField(input) })).filter(result => !result.valid);
    if (invalid.length) {
      invalid[0].input.focus(); announce('Vérifiez les champs signalés avant de créer le ticket.'); return;
    }
    // Recontrôle au moment de la confirmation : pas de créneau passé ni hors horaires.
    if (!availableSlots(state.day, state.service).some(slot => !slot.disabled && slot.minute === state.time)) {
      state.time = null; state.day = ''; state.furthest = 1; showStep(1); $('#selection-error').textContent = 'Ce créneau d’essai est passé. Choisissez de nouveau un jour et une heure.'; announce('Ce créneau d’essai est passé. Choisissez de nouveau un jour et une heure.'); return;
    }
    root.classList.toggle('no-motion', keyboard);
    state.complete = true;
    updateSummary();
    $('.booking-app').hidden = true;
    const success = $('.booking-success'); success.hidden = false;
    animateEntry(success);
    $('h3', success).focus();
    announce('Ticket d’essai créé. Aucun rendez-vous n’a été pris, rien n’a été envoyé.');
    if (!reduced.matches && !keyboard) {
      summary.style.transition = 'none';
      summary.classList.add('is-printing');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        summary.style.removeProperty('transition');
        summary.classList.remove('is-printing');
      }));
    }
  });
  $('#restart').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { step: 0, furthest: 0, service: '', day: '', time: null, complete: false });
    $$('.contact-fields input').forEach(input => { input.removeAttribute('aria-invalid'); $(`#${input.id}-error`).textContent = ''; });
    $('.booking-success').hidden = true; $('.booking-app').hidden = false;
    showStep(0);
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.complete) $('#restart').click();
    const serviceKey = link.dataset.service;
    $(`input[name="prestation"][value="${serviceKey}"]`).checked = true;
    state.service = serviceKey; state.day = ''; state.time = null; state.furthest = 0;
    showStep(1, false);
    requestAnimationFrame(() => $('h3', panels[1]).focus());
  }));
  showStep(0, false);
  $('.booking-app').hidden = false;

  // La barre ne recouvre ni les champs du formulaire, ni les liens du pied de page.
  if ('IntersectionObserver' in window) {
    const bar = $('.mobile-bar');
    const visibility = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      const hidden = [...visibility.values()].some(Boolean);
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
      bar.setAttribute('aria-hidden', String(hidden));
    });
    barObserver.observe($('#reservation'));
    barObserver.observe($('.site-footer'));
  }
})();
