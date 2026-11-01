/* Aperçu local : aucune donnée n’est transmise ni conservée. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  let keyboardMode = false;
  document.addEventListener('keydown', () => {
    keyboardMode = true;
    root.classList.add('keyboard-mode');
  });
  document.addEventListener('pointerdown', () => {
    keyboardMode = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(element => observer.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }

  const services = [
    { id: 'coupe', name: 'Coupe femme' },
    { id: 'couleur', name: 'Coloration' },
    { id: 'soin', name: 'Traitement à la kératine' }
  ];
  const hours = { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1020] };
  const state = { service: null, day: '', time: null, step: 0, complete: false };
  const $ = selector => document.querySelector(selector);
  const panels = [...document.querySelectorAll('[data-panel]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const form = $('#booking-form');
  const announcement = $('#booking-announcement');
  const timeText = value => `${Math.floor(value / 60)}\u00a0h\u00a0${String(value % 60).padStart(2, '0')}`;

  function parisNow(instant = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { day: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }
  const asDate = day => new Date(`${day}T12:00:00Z`);
  const dayKey = date => date.toISOString().slice(0, 10);
  const dateLabel = day => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(day));
  function holiday(day) {
    const fixed = { '01-01': 'Jour de l’An', '05-01': 'Fête du Travail', '05-08': '8 Mai', '07-14': 'Fête nationale', '08-15': 'Assomption', '11-01': 'Toussaint', '11-11': '11 Novembre', '12-25': 'Noël' };
    if (fixed[day.slice(5)]) return fixed[day.slice(5)];
    const year = Number(day.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const date = (h + l - 7 * m + 114) % 31 + 1;
    const easter = new Date(Date.UTC(year, month - 1, date, 12));
    return [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']].find(([offset]) => {
      const shifted = new Date(easter);
      shifted.setUTCDate(shifted.getUTCDate() + offset);
      return dayKey(shifted) === day;
    })?.[1] || '';
  }

  function makeSlots(day, service, now = parisNow()) {
    const opening = hours[asDate(day).getUTCDay()];
    if (!opening || !service) return [];
    const seed = [...`${day}${service.id}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const slots = [];
    for (let minute = opening[0], index = 0; minute < opening[1]; minute += 30, index++) {
      const past = day < now.day || (day === now.day && minute <= now.minutes);
      const taken = (seed + index * 3) % 7 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : 'Essai' });
    }
    return slots;
  }

  function renderServices() {
    $('#service-choices').innerHTML = services.map(service => `<label class="choice"><input type="radio" name="prestation" value="${service.id}" required><span class="choice-text">${service.name}<small>Prestation à confirmer</small></span><span class="choice-price">Tarif<small>à confirmer</small></span></label>`).join('');
  }
  function renderDays() {
    const today = asDate(parisNow().day);
    $('#day-choices').innerHTML = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + index);
      const day = dayKey(date);
      const closed = !hours[date.getUTCDay()];
      const special = holiday(day);
      const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const note = closed ? 'Fermé' : special ? 'Férié · à confirmer' : 'Essai';
      return `<label class="choice date-choice"><input type="radio" name="jour" value="${day}" aria-label="${dateLabel(day)}${special ? `, ${special}, ouverture à confirmer` : ''}${closed ? ', fermé' : ', simulation'}" ${closed ? 'disabled' : ''} ${state.day === day ? 'checked' : ''}><span>${weekday}</span><span class="day-num">${date.getUTCDate()}</span><span>${month}</span><small>${note}</small></label>`;
    }).join('');
  }
  function renderSlots() {
    const slots = makeSlots(state.day, state.service);
    $('#slot-choices').innerHTML = slots.map(slot => `<label class="choice time-choice"><input type="radio" name="heure" value="${slot.minute}" aria-label="${timeText(slot.minute)}, ${slot.reason === 'Essai' ? 'créneau fictif' : slot.reason.toLowerCase()}" ${slot.disabled ? 'disabled' : ''} ${state.time === slot.minute ? 'checked' : ''}><span class="time-text">${timeText(slot.minute)}</span><small>${slot.reason}</small></label>`).join('');
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
  }
  function allowedStep(index) {
    return index === 0 || (index === 1 && !!state.service) || (index === 2 && !!state.day) || (index === 3 && state.time !== null);
  }
  function recap() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name}, le ${dateLabel(state.day)} à ${timeText(state.time)}. Prestation et tarif à confirmer.`;
  }
  function updateSummary() {
    $('#summary-date').textContent = state.day ? dateLabel(state.day) : 'La prochaine date à écrire.';
    $('#summary-service').textContent = state.service?.name || 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    $('#summary-duration').textContent = 'À confirmer';
    $('#summary-price').textContent = 'À confirmer';
    $('#confirmation-recap').textContent = recap();
    $('#mobile-selection').textContent = state.service
      ? `Votre sélection\u00a0: ${state.service.name}${state.day ? ` · ${dateLabel(state.day)}` : ''}${state.time !== null ? ` · ${timeText(state.time)}` : ''}`
      : 'Votre sélection\u00a0: choisissez une prestation.';
    steps.forEach((button, index) => { button.disabled = !allowedStep(index); });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
  }
  function enterPanel(panel) {
    panel.classList.remove('is-arriving');
    if (!reduceMotion.matches && !keyboardMode) {
      panel.classList.add('is-arriving');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-arriving')));
    }
  }
  function showStep(index, moveFocus = true) {
    if (!allowedStep(index)) return;
    state.step = index;
    state.complete = false;
    form.hidden = false;
    $('#booking-success').hidden = true;
    if (index === 1) renderDays();
    if (index === 2) {
      const available = makeSlots(state.day, state.service).find(slot => slot.minute === state.time && !slot.disabled);
      if (!available) state.time = null;
      renderSlots();
    }
    panels.forEach((panel, number) => {
      panel.classList.remove('is-arriving');
      panel.hidden = number !== index;
    });
    steps.forEach((button, number) => {
      if (number === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const panel = panels[index];
    enterPanel(panel);
    updateSummary();
    if (moveFocus) panel.querySelector('h3').focus({ preventScroll: false });
    announcement.textContent = `Étape ${index + 1} sur 4\u00a0: ${panel.querySelector('h3').textContent}`;
  }

  renderServices();
  renderDays();
  updateSummary();
  $('#booking-app').hidden = false;

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = services.find(service => service.id === input.value);
      state.day = '';
      state.time = null;
      announcement.textContent = `${state.service.name} sélectionnée. Prestation et tarif à confirmer.`;
    } else if (input.name === 'jour') {
      state.day = input.value;
      state.time = null;
      announcement.textContent = `${dateLabel(state.day)} sélectionné${holiday(state.day) ? '. Jour férié, ouverture à confirmer' : ''}.`;
    } else if (input.name === 'heure') {
      state.time = Number(input.value);
      announcement.textContent = `${timeText(state.time)} sélectionné. Créneau fictif.`;
    }
    updateSummary();
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  steps.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    state.service = services.find(service => service.id === button.dataset.service);
    state.day = '';
    state.time = null;
    $(`input[name="prestation"][value="${state.service.id}"]`).checked = true;
    showStep(1);
  }));

  function validateName() {
    const input = $('#first-name');
    const valid = input.value.trim().length >= 1;
    input.setAttribute('aria-invalid', String(!valid));
    $('#name-error').textContent = valid ? '' : 'Indiquez un prénom, même un prénom d’exemple.';
    return valid;
  }
  function validatePhone() {
    const input = $('#mobile');
    const value = input.value.replace(/[\s.()\-]/g, '');
    const valid = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(value);
    input.setAttribute('aria-invalid', String(!valid));
    $('#phone-error').textContent = valid ? '' : 'Indiquez 10 chiffres commençant par 06 ou 07, ou un numéro au format +33 6 ou +33 7.';
    return valid;
  }
  $('#first-name').addEventListener('blur', validateName);
  $('#mobile').addEventListener('blur', validatePhone);
  [$('#first-name'), $('#mobile')].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(input.id === 'first-name' ? '#name-error' : '#phone-error').textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      announcement.textContent = 'Vérifiez les coordonnées\u00a0: les champs à corriger sont indiqués sous chaque champ.';
      (!nameValid ? $('#first-name') : $('#mobile')).focus();
      return;
    }
    if (!makeSlots(state.day, state.service).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      showStep(2);
      announcement.textContent = 'Ce créneau d’essai est maintenant passé. Choisissez une autre heure ou un autre jour.';
      return;
    }
    state.complete = true;
    form.hidden = true;
    steps.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    $('#success-recap').textContent = `${$('#first-name').value.trim()}, voici votre choix d’essai\u00a0: ${recap()}`;
    $('#booking-success').hidden = false;
    enterPanel($('#booking-success'));
    $('#booking-success h3').focus();
    announcement.textContent = 'Simulation terminée. Aucune réservation n’a été faite et rien n’a été envoyé au salon.';
  });
  $('#restart-booking').addEventListener('click', () => {
    form.reset();
    state.service = null;
    state.day = '';
    state.time = null;
    [$('#first-name'), $('#mobile')].forEach(input => input.removeAttribute('aria-invalid'));
    $('#name-error').textContent = '';
    $('#phone-error').textContent = '';
    showStep(0);
  });
})();
