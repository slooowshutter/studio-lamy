(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    poil: { name: 'Microbrows poil à poil', duration: 45, price: 350 },
    powder: { name: 'Powder Brows 3D', duration: 120, price: 400 },
    mixte: { name: 'Microbrows mixte', duration: 45, price: 380 },
    magic: { name: 'Magic Brows / Hairstroke Nanobrows', duration: 180, price: 500 },
    retouche: { name: 'Retouche fixatrice après Microbrows', duration: 30, price: 50 },
    lips: { name: 'Blush Lips', duration: 180, price: 400 },
    cils: { name: 'Rehaussement de cils', duration: 60, price: 70 },
    teinture: { name: 'Teinture cils', duration: 15, price: 15 }
  };
  const openingHours = { 0: null, 1: [540, 1140], 2: [540, 1020], 3: [510, 1140], 4: [540, 1080], 5: [540, 1140], 6: [540, 1020] };
  const state = { service: null, day: null, time: null, step: 0, reached: 0 };
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const dateOptions = document.querySelector('#date-options');
  const slotOptions = document.querySelector('#slot-options');
  const status = document.querySelector('#booking-status');
  const success = document.querySelector('#booking-success');
  const steps = document.querySelector('.steps');
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const summaryFrames = new Map();
  const panelFrames = new Map();

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function dateFromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function timeLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}\u00a0h\u00a0${String(remainder).padStart(2, '0')}` : `${hours}\u00a0h`;
  }

  function durationLabel(minutes) {
    return minutes < 60 ? `${minutes}\u00a0min` : (minutes % 60 ? `${Math.floor(minutes / 60)}\u00a0h\u00a0${minutes % 60}` : `${minutes / 60}\u00a0h`);
  }

  function slotsFor(day, serviceId, now = new Date()) {
    const service = services[serviceId];
    const hours = openingHours[dateFromKey(day).getUTCDay()];
    if (!service || !hours) return [];
    const current = parisNow(now);
    const seed = [...`${day}-${serviceId}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const slots = [];
    for (let minutes = hours[0]; minutes + service.duration <= hours[1]; minutes += 30) {
      const past = day < current.key || (day === current.key && minutes <= current.minutes);
      const taken = (seed + minutes * 17) % 11 < 3;
      slots.push({ minutes, disabled: past || taken, label: timeLabel(minutes), note: past ? 'Passé' : taken ? 'Déjà pris' : 'Exemple' });
    }
    return slots;
  }

  function makeSpan(className, text) {
    const span = document.createElement('span');
    span.className = className;
    if (text) span.textContent = text;
    return span;
  }

  function renderDates() {
    dateOptions.querySelectorAll('label').forEach(label => label.remove());
    const current = parisNow();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(Date.UTC(current.year, current.month - 1, current.day + offset, 12));
      const key = dateKey(date);
      const closed = !openingHours[date.getUTCDay()];
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = key;
      input.disabled = closed;
      input.checked = state.day === key;
      input.setAttribute('aria-label', `${fullDate.format(date)}${closed ? ', fermé' : ', horaires à confirmer'}`);
      const face = makeSpan('date-face');
      face.append(makeSpan('', shortDay.format(date)));
      const number = document.createElement('b');
      number.textContent = String(date.getUTCDate());
      face.append(number, makeSpan('', shortMonth.format(date)));
      const note = document.createElement('small');
      note.textContent = closed ? 'Fermé' : offset === 0 ? 'Aujourd’hui' : 'À confirmer';
      face.append(note);
      label.append(input, face);
      dateOptions.append(label);
    }
  }

  function renderSlots() {
    slotOptions.querySelectorAll('label').forEach(label => label.remove());
    const slots = state.day && state.service ? slotsFor(state.day, state.service) : [];
    if (!slots.some(slot => slot.minutes === state.time && !slot.disabled)) state.time = null;
    slots.forEach(slot => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = String(slot.minutes);
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minutes;
      input.setAttribute('aria-label', `${slot.label}, ${slot.note.toLocaleLowerCase('fr-FR')}`);
      const face = makeSpan('slot-face');
      const note = document.createElement('small');
      note.textContent = slot.note;
      face.append(makeSpan('', slot.label), note);
      label.append(input, face);
      slotOptions.append(label);
    });
    document.querySelector('#no-slots').hidden = slots.some(slot => !slot.disabled);
    updateControls();
  }

  function updateSummaryText(id, value) {
    const element = document.querySelector(id);
    if (element.textContent === value) return;
    const previousFrame = summaryFrames.get(element);
    if (previousFrame) cancelAnimationFrame(previousFrame);
    element.textContent = value;
    if (!reducedMotion.matches && !root.classList.contains('keyboard-input')) {
      element.classList.add('is-updating');
      summaryFrames.set(element, requestAnimationFrame(() => {
        summaryFrames.set(element, requestAnimationFrame(() => {
          element.classList.remove('is-updating');
          summaryFrames.delete(element);
        }));
      }));
    } else {
      element.classList.remove('is-updating');
    }
  }

  function recapText() {
    if (!state.service) return '';
    const service = services[state.service];
    return `${service.name} · ${durationLabel(service.duration)} · ${state.day ? fullDate.format(dateFromKey(state.day)) : 'jour à choisir'}${state.time !== null ? ` à ${timeLabel(state.time)}` : ''} · ${euros.format(service.price)}, tarif Planity à confirmer.`;
  }

  function updateSummary() {
    const service = services[state.service];
    updateSummaryText('#summary-service', service ? `${service.name} · ${durationLabel(service.duration)}` : 'Une prestation à choisir');
    updateSummaryText('#summary-date', state.day ? fullDate.format(dateFromKey(state.day)) : 'Un jour à choisir');
    updateSummaryText('#summary-time', state.time !== null ? timeLabel(state.time) : 'Une heure à choisir');
    updateSummaryText('#summary-price', service ? euros.format(service.price) : '—');
    document.querySelector('#mobile-summary').textContent = service ? recapText() : 'Prestation, jour et heure à choisir.';
    document.querySelector('#final-recap').textContent = `Votre essai : ${recapText()}`;
  }

  function updateControls() {
    document.querySelector('[data-next="1"]').disabled = !state.service;
    document.querySelector('[data-next="2"]').disabled = !state.day;
    document.querySelector('[data-next="3"]').disabled = state.time === null;
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.reached;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function goToStep(index, focus = true) {
    if (index > 0 && !state.service) return;
    if (index > 1 && !state.day) return;
    if (index > 2 && state.time === null) return;
    const backwards = index < state.step;
    state.step = index;
    state.reached = Math.max(state.reached, index);
    if (index === 1) renderDates();
    if (index === 2) renderSlots();
    panels.forEach((panel, panelIndex) => {
      const frame = panelFrames.get(panel);
      if (frame) cancelAnimationFrame(frame);
      panel.classList.remove('is-entering');
      panel.hidden = panelIndex !== index;
    });
    const panel = panels[index];
    if (!reducedMotion.matches && !root.classList.contains('keyboard-input')) {
      panel.dataset.backwards = String(backwards);
      panel.classList.add('is-entering');
      panelFrames.set(panel, requestAnimationFrame(() => {
        panelFrames.set(panel, requestAnimationFrame(() => {
          panel.classList.remove('is-entering');
          panelFrames.delete(panel);
        }));
      }));
    }
    updateControls();
    updateSummary();
    status.textContent = `Étape ${index + 1} sur 4 : ${panel.querySelector('h3').textContent}`;
    if (focus) {
      const heading = panel.querySelector('h3');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  function selectService(serviceId) {
    if (!services[serviceId]) return;
    if (state.service !== serviceId) {
      state.service = serviceId;
      state.day = null;
      state.time = null;
      state.reached = 0;
      renderDates();
    }
    form.querySelectorAll('[name="prestation"]').forEach(input => { input.checked = input.value === serviceId; });
    updateControls();
    updateSummary();
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      state.day = input.value;
      state.time = null;
      state.reached = 1;
      updateSummary();
      updateControls();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      updateSummary();
      updateControls();
    }
  });

  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.step))));

  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (!success.hidden) restart(false);
    selectService(link.dataset.service);
    goToStep(1);
    document.querySelector('#reserver').scrollIntoView({ behavior: reducedMotion.matches || root.classList.contains('keyboard-input') ? 'instant' : 'smooth', block: 'start' });
  }));

  function normalizePhone(value) {
    if (!/^[\d\s.+()-]+$/.test(value)) return null;
    let phone = value.replace(/[\s.()-]/g, '');
    if (phone.startsWith('+33')) phone = `0${phone.slice(3)}`;
    return /^0[67]\d{8}$/.test(phone) ? phone : null;
  }

  function setFieldError(input, errorId, invalid) {
    document.querySelector(errorId).hidden = !invalid;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  firstName.addEventListener('input', () => {
    if (firstName.value.trim()) setFieldError(firstName, '#prenom-error', false);
  });
  phone.addEventListener('input', () => {
    if (normalizePhone(phone.value)) setFieldError(phone, '#telephone-error', false);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) return;
    const validSlot = state.day && state.service && slotsFor(state.day, state.service).some(slot => slot.minutes === state.time && !slot.disabled);
    if (!validSlot) {
      state.time = null;
      state.reached = 2;
      goToStep(2);
      status.textContent = 'Ce créneau d’exemple est passé. Choisissez une autre heure ou un autre jour.';
      return;
    }
    const invalidName = !firstName.value.trim();
    const invalidPhone = !normalizePhone(phone.value);
    setFieldError(firstName, '#prenom-error', invalidName);
    setFieldError(phone, '#telephone-error', invalidPhone);
    if (invalidName || invalidPhone) {
      status.textContent = 'Vérifiez les champs indiqués avant de terminer la simulation.';
      (invalidName ? firstName : phone).focus();
      return;
    }
    document.querySelector('#success-recap').textContent = `${firstName.value.trim()}, voici votre sélection d’exemple : ${recapText()}`;
    form.hidden = true;
    steps.hidden = true;
    success.hidden = false;
    document.querySelector('#success-title').focus({ preventScroll: true });
    document.querySelector('#success-title').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    status.textContent = 'Simulation terminée. Aucun rendez-vous n’est réservé. Rien n’a été envoyé au salon.';
  });

  function restart(focus = true) {
    form.reset();
    state.service = null;
    state.day = null;
    state.time = null;
    state.reached = 0;
    success.hidden = true;
    form.hidden = false;
    steps.hidden = false;
    setFieldError(firstName, '#prenom-error', false);
    setFieldError(phone, '#telephone-error', false);
    goToStep(0, focus);
  }
  document.querySelector('#restart').addEventListener('click', () => restart());

  // Le contenu reste visible si le navigateur ne gère pas les révélations.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach((element, index) => {
      element.style.transitionDelay = `${(index % 3) * 60}ms`;
      observer.observe(element);
    });
    const activeRegions = new Set();
    const mobileBar = document.querySelector('.mobile-bar');
    const actionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activeRegions.add(entry.target);
        else activeRegions.delete(entry.target);
      });
      mobileBar.hidden = activeRegions.size > 0;
    });
    actionObserver.observe(document.querySelector('#reserver'));
    actionObserver.observe(document.querySelector('#pied-page'));
  } else {
    document.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  }

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) root.classList.add('keyboard-input');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-input'), { passive: true });

  renderDates();
  updateControls();
  form.inert = false;
  form.querySelector('button[type="submit"]').disabled = false;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
