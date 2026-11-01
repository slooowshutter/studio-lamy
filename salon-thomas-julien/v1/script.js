(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('au-clavier');
  }, true);
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('au-clavier');
  }, true);

  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const serviceInputs = [...form.querySelectorAll('input[name="prestation"]')];
  const services = new Map(serviceInputs.map(input => [input.value, {
    id: input.value,
    name: input.dataset.name
  }]));
  const state = { service: null, day: null, time: null, step: 0 };
  const dayOptions = document.querySelector('#day-options');
  const slotOptions = document.querySelector('#slot-options');
  const status = document.querySelector('#booking-status');
  const success = document.querySelector('#booking-success');
  const stepNav = document.querySelector('.step-nav');
  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  const zone = 'Europe/Paris';
  const fullDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone: zone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { timeZone: zone, weekday: 'short' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { timeZone: zone, day: 'numeric', month: 'short' });
  let stepAnimation = null;

  function parisClock(instant = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant).map(part => [part.type, part.value]));
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }

  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }

  function nextDays(now = parisClock()) {
    const start = dateFromKey(now.key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return { date, key: keyFromDate(date) };
    });
  }

  function opening(key) {
    const weekday = dateFromKey(key).getUTCDay();
    return weekday === 0 || weekday === 1 ? null : { start: 8 * 60, end: 19 * 60 };
  }

  function slotsFor(key, now = parisClock()) {
    const hours = opening(key);
    if (!hours) return [];
    const seed = [...key].reduce((total, letter) => total + letter.charCodeAt(0), 0);
    const slots = [];
    for (let minutes = hours.start, index = 0; minutes < hours.end; minutes += 30, index++) {
      const past = key < now.key || (key === now.key && minutes <= now.minutes);
      const taken = (seed + index * 13) % 7 === 0;
      slots.push({ minutes, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : 'Essai libre' });
    }
    return slots;
  }

  function timeLabel(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  }


  function canEnter(step) {
    return step === 0 || (step === 1 && !!state.service) ||
      (step === 2 && !!state.service && !!state.day) ||
      (step === 3 && !!state.service && !!state.day && state.time !== null);
  }

  function selectionText() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name} · ${fullDate.format(dateFromKey(state.day))} à ${timeLabel(state.time)}.`;
  }

  function updateSummary() {
    document.querySelector('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    document.querySelector('#summary-date').textContent = state.day ? fullDate.format(dateFromKey(state.day)) : 'À choisir';
    document.querySelector('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    document.querySelector('#summary-price').textContent = 'Appeler le salon';
    document.querySelector('#final-recap').textContent = selectionText();
    document.querySelector('[data-next="1"]').disabled = !state.service;
    document.querySelector('[data-next="2"]').disabled = !state.day;
    document.querySelector('[data-next="3"]').disabled = state.time === null;
    stepButtons.forEach(button => {
      button.disabled = !canEnter(Number(button.dataset.step));
      if (Number(button.dataset.step) === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function radioLabel(className, name, value, ariaLabel, disabled, checked) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.setAttribute('aria-label', ariaLabel);
    input.disabled = disabled;
    input.checked = checked;
    label.append(input);
    return label;
  }

  function addText(parent, tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    parent.append(element);
  }

  function renderDays() {
    dayOptions.querySelectorAll('label').forEach(label => label.remove());
    const now = parisClock();
    nextDays(now).forEach(({ date, key }) => {
      const weekday = date.getUTCDay();
      const closed = !opening(key);
      const available = !closed && slotsFor(key, now).some(slot => !slot.disabled);
      const dayState = closed ? (weekday === 1 ? 'À confirmer' : 'Fermé') : available ? 'Essai disponible' : 'Sans créneau';
      const label = radioLabel('day-option', 'jour', key,
        `${fullDate.format(date)}, ${dayState}`, !available, state.day === key);
      addText(label, 'span', 'day-label', shortWeekday.format(date));
      addText(label, 'span', 'day-number', shortDate.format(date));
      addText(label, 'span', 'day-state', dayState);
      dayOptions.append(label);
    });
  }

  function renderSlots() {
    slotOptions.querySelectorAll('label').forEach(label => label.remove());
    document.querySelector('#slot-day').textContent = fullDate.format(dateFromKey(state.day));
    const slots = slotsFor(state.day);
    const stillValid = slots.some(slot => !slot.disabled && slot.minutes === state.time);
    if (!stillValid) state.time = null;
    slots.forEach(slot => {
      const label = radioLabel('slot-option', 'heure', String(slot.minutes),
        `${timeLabel(slot.minutes)}, ${slot.reason}, créneau fictif`, slot.disabled, state.time === slot.minutes);
      addText(label, 'span', '', timeLabel(slot.minutes));
      addText(label, 'small', '', slot.reason);
      slotOptions.append(label);
    });
    document.querySelector('#no-slots').hidden = slots.some(slot => !slot.disabled);
  }

  function animateStep(panel, direction) {
    if (stepAnimation) stepAnimation.cancel();
    if (reducedMotion.matches || keyboard || typeof panel.animate !== 'function') return;
    stepAnimation = panel.animate([
      { opacity: .35, transform: `translateX(${direction * 10}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }

  function showStep(step, focus = true) {
    if (!canEnter(step)) return;
    const direction = step >= state.step ? 1 : -1;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
    updateSummary();
    const panel = panels[step];
    if (focus) {
      animateStep(panel, direction);
      document.querySelector(`#etape-${step}`).focus();
      status.textContent = `Simulation, étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][step]}.`;
    }
  }

  function selectService(id) {
    if (!services.has(id)) return;
    if (state.service?.id !== id) {
      state.day = null;
      state.time = null;
    }
    state.service = services.get(id);
    serviceInputs.forEach(input => { input.checked = input.value === id; });
    updateSummary();
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = null;
      state.day = input.value;
      updateSummary();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      updateSummary();
    }
  });

  document.querySelectorAll('[data-next], [data-back], [data-step]').forEach(button => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.next ?? button.dataset.back ?? button.dataset.step);
      showStep(step);
    });
  });

  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (!success.hidden) resetBooking(false);
      selectService(link.dataset.service);
      showStep(1);
    });
  });

  function validateField(input) {
    const isName = input === firstName;
    let value = input.value.trim();
    if (!isName) value = value.replace(/\(0\)/g, '').replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    const valid = isName ? value.length > 0 : /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(value);
    input.setAttribute('aria-invalid', String(!valid));
    document.querySelector(isName ? '#prenom-error' : '#telephone-error').textContent = valid ? '' :
      isName ? 'Indiquez un prénom pour continuer.' : 'Indiquez un portable français à 10 chiffres commençant par 06 ou 07, ou son format +33.';
    return valid;
  }

  [firstName, phone].forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!state.service || !state.day || state.time === null) return;
    if (!slotsFor(state.day).some(slot => slot.minutes === state.time && !slot.disabled)) {
      state.time = null;
      state.day = null;
      showStep(1);
      status.textContent = 'Ce créneau d’exemple est maintenant passé. Choisissez un nouveau jour.';
      return;
    }
    const nameValid = validateField(firstName);
    const phoneValid = validateField(phone);
    if (!nameValid || !phoneValid) {
      (nameValid ? phone : firstName).focus();
      return;
    }
    document.querySelector('#success-name').textContent = `${firstName.value.trim()}, voici le récapitulatif de votre essai.`;
    document.querySelector('#success-recap').textContent = selectionText();
    form.hidden = true;
    stepNav.hidden = true;
    success.hidden = false;
    firstName.value = '';
    phone.value = '';
    animateStep(success, 1);
    document.querySelector('#succes-titre').focus();
    status.textContent = 'Simulation terminée. Aucun rendez-vous réservé et aucune donnée envoyée.';
  });

  function resetBooking(focus = true) {
    form.reset();
    state.service = null;
    state.day = null;
    state.time = null;
    state.step = 0;
    [firstName, phone].forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelector('#prenom-error').textContent = '';
    document.querySelector('#telephone-error').textContent = '';
    document.querySelector('#success-name').textContent = '';
    document.querySelector('#success-recap').textContent = '';
    success.hidden = true;
    form.hidden = false;
    stepNav.hidden = false;
    showStep(0, focus);
  }
  document.querySelector('#restart-booking').addEventListener('click', () => resetBooking());

  updateSummary();

  // Aucun stockage ni requête réseau : le carnet reste dans la page.
  const revealElements = [...document.querySelectorAll('[data-reveal]')];
  const rows = [...document.querySelectorAll('[data-reveal="row"]')];
  rows.forEach((row, index) => { row.style.transitionDelay = `${index * 60}ms`; });
  root.classList.add('js');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1, rootMargin: '0px 0px -24px 0px' });
    revealElements.forEach(element => observer.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-visible'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    if (stepAnimation) stepAnimation.cancel();
    revealElements.forEach(element => element.classList.add('is-visible'));
  });
})();
