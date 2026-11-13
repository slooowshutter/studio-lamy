/* L'art de Nails · Répertoire. Essai local : aucun envoi et aucun stockage. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';

  // Heures publiées sur le microsite Treatwell : lundi–samedi 10:00–19:00, dimanche fermé.
  const HOURS = { 0: null, 1: [600, 1140], 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 1140] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fullDateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const isoDate = (date) => date.toISOString().slice(0, 10);
  const parseDate = (date) => new Date(`${date}T12:00:00Z`);
  const hour = (minutes) => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const duration = (minutes) => `${minutes}${NB}min`;

  function parisNow(date = new Date()) {
    const parts = {};
    for (const part of parisFormat.formatToParts(date)) parts[part.type] = part.value;
    const day = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12));
    return { date: day, key: isoDate(day), minute: +parts.hour * 60 + +parts.minute };
  }

  function slotsFor(dateKey, serviceDuration, now = parisNow()) {
    const date = parseDate(dateKey);
    const range = HOURS[date.getUTCDay()];
    if (!range || dateKey < now.key || !Number.isFinite(serviceDuration) || serviceDuration <= 0) return [];
    const slots = [];
    for (let minute = range[0]; minute + serviceDuration <= range[1]; minute += 30) {
      slots.push({ minute, past: dateKey === now.key && minute <= now.minute });
    }
    return slots;
  }

  function daysFor(serviceDuration, now = parisNow()) {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + index);
      const key = isoDate(date);
      const closed = HOURS[date.getUTCDay()] === null;
      const past = !closed && !slotsFor(key, serviceDuration, now).some((slot) => !slot.past);
      return { date, key, closed, past };
    });
  }

  function normalizePhone(value) {
    return value.replace(/[\s.()\-]/g, '').replace(/^(?:\+33|0033)/, '0');
  }
  function validName(value) {
    return /^[\p{L}\p{M}][\p{L}\p{M}\s’'\-]*$/u.test(value.trim());
  }
  function validPhone(value) {
    return /^0[67]\d{8}$/.test(normalizePhone(value));
  }

  const services = $$('[data-service]').map((row) => ({
    id: row.dataset.service,
    name: $('th[scope="row"]', row).textContent.trim(),
    minutes: Number(row.dataset.duration)
  }));
  const state = { service: null, day: null, time: null, step: 0, complete: false };
  const serviceById = (id) => services.find((service) => service.id === id);
  const currentService = () => serviceById(state.service);
  const panelButtons = $$('.step-button');
  const panels = $$('.step-panel');
  const live = $('#booking-status');
  let inputMode = 'pointer';
  let transitionFrame = 0;
  let transitionGeneration = 0;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      inputMode = 'keyboard';
      root.classList.add('keyboard-input');
    }
  });
  document.addEventListener('pointerdown', () => {
    inputMode = 'pointer';
    root.classList.remove('keyboard-input');
  }, { passive: true });
  document.addEventListener('focusin', (event) => {
    const row = event.target.closest('[data-reveal]');
    if (row) row.classList.remove('reveal-pending');
  });

  function announce(message) { live.textContent = message; }

  function updateSelection() {
    const service = currentService();
    const day = state.day ? fullDateFormat.format(parseDate(state.day)) : 'À choisir';
    const time = state.time === null ? 'À choisir' : hour(state.time);
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-day').textContent = day;
    $('#summary-time').textContent = time;
    $('[data-step-value="0"]').textContent = service ? service.name : 'À choisir';
    $('[data-step-value="1"]').textContent = day;
    $('[data-step-value="2"]').textContent = time;
    panelButtons[1].disabled = !service;
    panelButtons[2].disabled = !state.day;
    panelButtons[3].disabled = state.time === null;
  }

  function makeRadio(name, value, options = {}) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.checked = !!options.checked;
    input.disabled = !!options.disabled;
    return input;
  }

  function renderServices() {
    const container = $('#service-choices');
    container.replaceChildren();
    services.forEach((service) => {
      const label = document.createElement('label');
      label.className = 'service-choice';
      const input = makeRadio('prestation', service.id, { checked: service.id === state.service });
      input.setAttribute('aria-describedby', 'service-error');
      const name = document.createElement('span');
      name.textContent = service.name;
      const length = document.createElement('span');
      length.className = 'choice-duration';
      length.textContent = duration(service.minutes);
      label.append(input, name, length);
      container.append(label);
    });
  }

  function renderDays() {
    const container = $('#day-choices');
    container.replaceChildren();
    if (!currentService()) return;
    daysFor(currentService().minutes).forEach((day) => {
      const label = document.createElement('label');
      label.className = 'date-choice';
      const input = makeRadio('jour', day.key, { checked: day.key === state.day, disabled: day.closed || day.past });
      input.setAttribute('aria-label', `${fullDateFormat.format(day.date)}${day.closed ? ', fermé' : day.past ? ', journée passée pour cet essai' : ', date fictive pour cet essai'}`);
      input.setAttribute('aria-describedby', 'day-help day-error');
      const text = document.createElement('span');
      const weekday = document.createElement('span');
      weekday.textContent = weekdayFormat.format(day.date);
      const number = document.createElement('strong');
      number.textContent = day.date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = monthFormat.format(day.date);
      text.append(weekday, number, month);
      if (day.closed || day.past) {
        const status = document.createElement('small');
        status.textContent = day.closed ? 'Fermé' : 'Passé';
        text.append(status);
      }
      label.append(input, text);
      container.append(label);
    });
  }

  function renderTimes() {
    const container = $('#time-choices');
    container.replaceChildren();
    if (!state.day || !currentService()) return;
    const slots = slotsFor(state.day, currentService().minutes);
    slots.forEach((slot) => {
      const label = document.createElement('label');
      label.className = 'time-choice';
      const input = makeRadio('heure', slot.minute, { checked: slot.minute === state.time, disabled: slot.past });
      input.setAttribute('aria-label', `${hour(slot.minute)}, ${slot.past ? 'heure passée' : 'créneau fictif'}`);
      input.setAttribute('aria-describedby', 'time-help time-error');
      const text = document.createElement('span');
      text.textContent = hour(slot.minute);
      label.append(input, text);
      container.append(label);
    });
    if (!slots.some((slot) => !slot.past)) {
      const message = document.createElement('p');
      message.className = 'small muted';
      message.textContent = 'Plus d’heure pour cet essai ce jour-là. Choisissez un autre jour.';
      container.append(message);
    }
  }

  function showStep(index, focus = true) {
    if ((index >= 1 && !state.service) || (index >= 2 && !state.day) || (index >= 3 && state.time === null)) return;
    transitionGeneration += 1;
    const generation = transitionGeneration;
    cancelAnimationFrame(transitionFrame);
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      $('.panel-content', panel).classList.remove('is-entering');
      panelButtons[panelIndex].setAttribute('aria-expanded', String(panelIndex === index));
    });
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    const content = $('.panel-content', panels[index]);
    if (!reduce.matches && inputMode !== 'keyboard') {
      content.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => {
          if (generation === transitionGeneration) content.classList.remove('is-entering');
        });
      });
    }
    if (focus) {
      panelButtons[index].focus({ preventScroll: true });
      panelButtons[index].scrollIntoView({ block: 'nearest', behavior: reduce.matches || inputMode === 'keyboard' ? 'instant' : 'smooth' });
    }
    const names = ['La prestation', 'Le jour', 'L’heure', 'Les coordonnées'];
    announce(`Étape ${index + 1} sur 4${NB}: ${names[index]}. Simulation, rien n’est envoyé.`);
  }

  function setService(id) {
    if (!serviceById(id)) return;
    if (state.service !== id) {
      state.day = null;
      state.time = null;
    }
    state.service = id;
    $('#service-error').textContent = '';
    updateSelection();
  }

  function verifyStep(step) {
    const settings = [
      { valid: !!state.service, error: '#service-error', message: 'Choisissez une prestation pour poursuivre l’essai.', first: '#service-choices input' },
      { valid: !!state.day, error: '#day-error', message: 'Choisissez un jour pour poursuivre l’essai.', first: '#day-choices input:not(:disabled)' },
      { valid: state.time !== null, error: '#time-error', message: 'Choisissez une heure fictive pour poursuivre l’essai.', first: '#time-choices input:not(:disabled)' }
    ];
    const item = settings[step];
    if (!item) return true;
    $(item.error).textContent = item.valid ? '' : item.message;
    if (!item.valid) {
      announce(item.message);
      $(item.first)?.focus();
    }
    return item.valid;
  }

  $('#service-choices').addEventListener('change', (event) => {
    if (event.target.name !== 'prestation') return;
    setService(event.target.value);
    announce(`${currentService().name}, sélectionné pour la simulation.`);
  });
  $('#day-choices').addEventListener('change', (event) => {
    if (event.target.name !== 'jour' || event.target.disabled) return;
    state.day = event.target.value;
    state.time = null;
    $('#day-error').textContent = '';
    $('#time-error').textContent = '';
    updateSelection();
    announce(`${fullDateFormat.format(parseDate(state.day))}, sélectionné pour l’essai.`);
  });
  $('#time-choices').addEventListener('change', (event) => {
    if (event.target.name !== 'heure' || event.target.disabled) return;
    state.time = Number(event.target.value);
    $('#time-error').textContent = '';
    updateSelection();
    announce(`${hour(state.time)}, heure fictive sélectionnée.`);
  });

  $$('[data-next]').forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (verifyStep(next - 1)) showStep(next);
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  panelButtons.forEach((button, index) => button.addEventListener('click', () => showStep(index)));

  function resetSuccess() {
    state.complete = false;
    $('#booking-flow').hidden = false;
    $('#booking-success').hidden = true;
  }

  $$('[data-select]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    resetSuccess();
    setService(link.dataset.select);
    renderServices();
    showStep(1);
  }));

  function validateField(input) {
    const isName = input.id === 'prenom';
    const valid = isName ? validName(input.value) : validPhone(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    $(`#${input.id}-error`).textContent = valid ? '' : isName ? 'Indiquez un prénom pour cet essai, avec des lettres.' : 'Indiquez un numéro mobile français valide, commençant par 06 ou 07.';
    return valid;
  }
  ['prenom', 'telephone'].forEach((id) => {
    const input = $(`#${id}`);
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        $(`#${input.id}-error`).textContent = '';
      }
    });
  });

  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    $('#form-error').textContent = '';
    const fields = [$('#prenom'), $('#telephone')];
    const invalid = fields.filter((input) => !validateField(input));
    if (invalid.length) {
      $('#form-error').textContent = 'Corrigez les champs indiqués pour terminer cet essai.';
      announce('Les coordonnées de l’essai sont à corriger.');
      invalid[0].focus();
      return;
    }
    const service = currentService();
    const now = parisNow();
    if (!service || !state.day || state.day < now.key || !daysFor(service.minutes, now).some((day) => day.key === state.day && !day.closed && !day.past)) {
      state.day = null;
      state.time = null;
      updateSelection();
      showStep(service ? 1 : 0);
      $('#day-error').textContent = 'Le jour choisi est passé. Choisissez une autre date pour cet essai.';
      announce('Choisissez une autre date pour cet essai.');
      return;
    }
    if (!slotsFor(state.day, service.minutes, now).some((slot) => slot.minute === state.time && !slot.past)) {
      state.time = null;
      updateSelection();
      showStep(2);
      $('#time-error').textContent = 'Cette heure d’essai est passée. Choisissez-en une autre.';
      announce('Choisissez une autre heure pour cet essai.');
      return;
    }
    state.complete = true;
    $('#success-recap').textContent = `${service.name} — ${fullDateFormat.format(parseDate(state.day))} à ${hour(state.time)}. Cette sélection est fictive.`;
    $('#booking-flow').hidden = true;
    $('#booking-success').hidden = false;
    $('#success-title').focus();
    announce('Simulation terminée. Aucun rendez-vous réservé, rien envoyé au salon.');
  });

  $('#restart-booking').addEventListener('click', () => {
    state.service = null;
    state.day = null;
    state.time = null;
    $('#booking-form').reset();
    ['prenom', 'telephone'].forEach((id) => {
      $(`#${id}`).removeAttribute('aria-invalid');
      $(`#${id}-error`).textContent = '';
    });
    $$('.field-error').forEach((element) => { element.textContent = ''; });
    resetSuccess();
    renderServices();
    updateSelection();
    showStep(0);
  });

  renderServices();
  updateSelection();
  $('.booking-app').hidden = false;

  // Le contenu reste visible si le script ou IntersectionObserver manque.
  root.classList.add('js');
  const ready = () => root.classList.add('is-ready');
  requestAnimationFrame(() => requestAnimationFrame(ready));
  setTimeout(ready, 1000);
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    const rows = $$('[data-reveal]');
    const initiallyBelow = rows.map((row) => row.getBoundingClientRect().top >= window.innerHeight);
    rows.forEach((row, index) => {
      const siblings = $$('[data-reveal]', row.parentElement);
      row.style.transitionDelay = `${siblings.indexOf(row) * 40}ms`;
      if (initiallyBelow[index]) row.classList.add('reveal-pending');
      observer.observe(row);
    });
    reduce.addEventListener('change', () => {
      if (!reduce.matches) return;
      observer.disconnect();
      rows.forEach((row) => row.classList.remove('reveal-pending'));
    });
  }
})();
