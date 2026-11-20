(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardAction = false;
  document.addEventListener('keydown', () => {
    keyboardAction = true;
    root.classList.add('keyboard-action');
  }, true);
  document.addEventListener('pointerdown', () => {
    keyboardAction = false;
    root.classList.remove('keyboard-action');
  }, true);

  // Les textes restent visibles si JavaScript ou l’observateur n’est pas disponible.
  const reveals = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach(element => observer.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const track = document.querySelector('.service-track');
  document.querySelectorAll('[data-scroll]').forEach(button => {
    button.addEventListener('click', () => {
      const card = track.querySelector('.service-ticket');
      const distance = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
      track.scrollBy({ left: Number(button.dataset.scroll) * distance, behavior: reducedMotion.matches || keyboardAction ? 'instant' : 'smooth' });
    });
  });

  const services = { balayage: 'Balayage', couleurs: 'Couleurs', meches: 'Mèches', ombre: 'Ombré hair' };
  // Intersection des relevés Fresha, Kalendes et AllBiz. Ce sont uniquement
  // des plages pour l’essai, jamais un horaire officiel ou une durée de service.
  const commonHours = {
    0: [], 1: [],
    2: [[510, 720], [840, 1050]],
    3: [[510, 720], [840, 1005]],
    4: [[510, 720], [840, 1005]],
    5: [[480, 1005]],
    6: [[480, 615]]
  };
  const state = { step: 0, completed: -1, service: '', date: '', time: null, person: '' };
  const app = document.querySelector('#booking-app');
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const previous = document.querySelector('#previous-step');
  const next = document.querySelector('#next-step');
  const formError = document.querySelector('#form-error');
  const dateOptions = document.querySelector('#date-options');
  const timeOptions = document.querySelector('#time-options');
  const emptySlots = document.querySelector('#empty-slots');
  const status = document.querySelector('#booking-status');
  const success = document.querySelector('#booking-success');
  const receipt = document.querySelector('#selection-ticket');
  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  const summaryService = document.querySelector('#summary-service');
  const summaryDate = document.querySelector('#summary-date');
  const summaryTime = document.querySelector('#summary-time');
  let transitionToken = 0;

  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' });
  const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longDateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

  function parisNow() {
    const parts = Object.fromEntries(parisFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function calendarDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function readableDate(key) { return key ? longDateFormatter.format(calendarDate(key)) : 'À choisir'; }
  function readableTime(minutes) {
    return minutes === null ? 'À choisir' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  }
  function isPast(key, minutes) {
    const now = parisNow();
    return key < now.key || (key === now.key && minutes <= now.minutes);
  }
  function slotList(key) {
    const date = calendarDate(key);
    const slots = [];
    (commonHours[date.getUTCDay()] || []).forEach(([start, end]) => {
      // Le pas est une grille de départs ; aucune durée de prestation n’est supposée.
      for (let minute = start; minute < end; minute += 30) {
        slots.push({ minute, past: isPast(key, minute) });
      }
    });
    return slots;
  }
  function availableDay(key) { return slotList(key).some(slot => !slot.past); }
  function makeRadio(name, value, disabled) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    return input;
  }
  function makeText(tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function announce(message) { status.textContent = message; }

  function renderDates() {
    dateOptions.querySelectorAll('label').forEach(label => label.remove());
    const today = calendarDate(parisNow().key);
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() + offset);
      const key = dateKey(day);
      const closed = commonHours[day.getUTCDay()].length === 0;
      const expired = !closed && !availableDay(key);
      const label = document.createElement('label');
      const input = makeRadio('jour', key, closed || expired);
      input.checked = state.date === key;
      input.setAttribute('aria-label', `${longDateFormatter.format(day)}${closed ? ', fermé dans les relevés' : expired ? ', heures passées' : ', simulation'}`);
      label.append(input, makeText('span', shortDayFormatter.format(day)), makeText('strong', String(day.getUTCDate())), makeText('span', monthFormatter.format(day), 'date-month'));
      if (closed || expired) label.append(makeText('span', closed ? 'Fermé' : 'Passé', 'closed-label'));
      dateOptions.append(label);
    }
  }
  function renderTimes() {
    timeOptions.querySelectorAll('label').forEach(label => label.remove());
    const slots = state.date ? slotList(state.date) : [];
    slots.forEach(slot => {
      const label = document.createElement('label');
      const input = makeRadio('heure', String(slot.minute), slot.past);
      input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${readableTime(slot.minute)}${slot.past ? ', heure passée' : ', départ fictif'}`);
      label.append(input, makeText('span', readableTime(slot.minute)));
      if (slot.past) label.append(makeText('small', 'Heure passée'));
      timeOptions.append(label);
    });
    emptySlots.hidden = slots.some(slot => !slot.past);
  }
  function updateSummary() {
    summaryService.textContent = services[state.service] || 'À choisir';
    summaryDate.textContent = readableDate(state.date);
    summaryTime.textContent = readableTime(state.time);
    const recap = [services[state.service], state.date ? readableDate(state.date) : '', state.time !== null ? readableTime(state.time) : ''].filter(Boolean).join(' · ');
    document.querySelector('#compact-selection-text').textContent = recap || 'Une envie de couleur à choisir.';
    document.querySelector('#final-recap').textContent = recap ? `Votre essai : ${recap}. Tarif et durée à confirmer au salon. Aucun rendez-vous ne sera pris.` : '';
  }
  function updateProgress() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.completed + 1;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    transitionToken++;
    const token = transitionToken;
    state.step = index;
    if (index === 1) renderDates();
    if (index === 2) renderTimes();
    formError.textContent = '';
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('is-entering');
    });
    const panel = panels[index];
    const animate = !reducedMotion.matches && !keyboardAction;
    if (animate) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token === transitionToken) panel.classList.remove('is-entering');
      }));
    }
    previous.hidden = index === 0;
    const actions = ['Choisir le jour', 'Choisir l’heure', 'Vos coordonnées', 'Imprimer le ticket d’essai'];
    next.replaceChildren(document.createTextNode(`${actions[index]} `), makeText('span', index === 3 ? '↓' : '→'));
    next.lastChild.setAttribute('aria-hidden', 'true');
    updateProgress(); updateSummary();
    if (focus) {
      const heading = panel.querySelector('h3');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    announce(`Étape ${index + 1} sur 4. ${panel.querySelector('h3').textContent}`);
  }
  function selectService(id) {
    if (!services[id]) return;
    if (!success.hidden) resetBooking(false);
    state.service = id;
    state.completed = 0;
    state.date = ''; state.time = null;
    form.querySelectorAll('[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
    showStep(0, false);
  }
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      selectService(link.dataset.service);
      panels[0].querySelector('h3').focus({ preventScroll: true });
      announce(`${services[link.dataset.service]} sélectionné. Choisissez ensuite le jour.`);
    });
  });
  form.addEventListener('change', event => {
    const input = event.target;
    formError.textContent = '';
    if (input.name === 'prestation') {
      state.service = input.value;
      state.date = ''; state.time = null; state.completed = 0;
    } else if (input.name === 'jour') {
      state.date = input.value; state.time = null; state.completed = 1;
    } else if (input.name === 'heure') {
      state.time = Number(input.value); state.completed = 2;
    }
    updateSummary(); updateProgress();
    if (input.name === 'prestation') announce(`Votre envie : ${services[state.service]}.`);
    if (input.name === 'jour') announce(`Votre jour : ${readableDate(state.date)}.`);
    if (input.name === 'heure') announce(`Votre heure fictive : ${readableTime(state.time)}.`);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  previous.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));

  function reportError(message, target) {
    formError.textContent = message;
    if (target) target.focus();
    announce(message);
  }
  function validateContact() {
    const nameValid = firstName.value.trim().length > 0;
    const normalized = phone.value.replace(/[\s().-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalized);
    document.querySelector('#erreur-prenom').textContent = nameValid ? '' : 'Indiquez un prénom pour votre ticket d’essai.';
    document.querySelector('#erreur-telephone').textContent = phoneValid ? '' : 'Indiquez un numéro français de dix chiffres, ou son format +33.';
    firstName.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid) firstName.focus();
    else if (!phoneValid) phone.focus();
    if (!nameValid || !phoneValid) announce('Vérifiez les champs indiqués avant d’imprimer le ticket d’essai.');
    return nameValid && phoneValid;
  }
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input.getAttribute('aria-describedby')).textContent = '';
  }));

  function printTicket() {
    state.person = firstName.value.trim();
    document.querySelector('#summary-person').textContent = state.person;
    document.querySelector('#summary-person-row').hidden = false;
    form.hidden = true;
    document.querySelector('#compact-selection').hidden = true;
    document.querySelector('.booking-progress').hidden = true;
    success.hidden = false;
    receipt.classList.add('is-printed');
    if (!reducedMotion.matches && !keyboardAction) {
      receipt.classList.add('is-printing');
      requestAnimationFrame(() => requestAnimationFrame(() => receipt.classList.remove('is-printing')));
    }
    success.querySelector('h3').focus({ preventScroll: true });
    announce(`Simulation terminée. Ticket pour ${state.person}, ${services[state.service]}, ${readableDate(state.date)} à ${readableTime(state.time)}. Aucun rendez-vous pris. Appelez le salon pour réserver.`);
    // Pas de stockage, de requête réseau ou de coordonnées conservées après l’essai.
    firstName.value = ''; phone.value = '';
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) {
      reportError('Choisissez une prestation pour continuer.', form.querySelector('[name="prestation"]'));
      return;
    }
    if (state.step === 1 && (!state.date || !availableDay(state.date))) {
      reportError('Choisissez un jour proposant encore des départs fictifs.', dateOptions.querySelector('input:not(:disabled)'));
      return;
    }
    if (state.step >= 2 && (state.time === null || !slotList(state.date).some(slot => slot.minute === state.time && !slot.past))) {
      if (state.step !== 2) showStep(2);
      renderTimes();
      reportError('Choisissez une heure fictive à venir.', timeOptions.querySelector('input:not(:disabled)'));
      return;
    }
    if (state.step < 3) {
      state.completed = Math.max(state.completed, state.step);
      showStep(state.step + 1);
    } else if (validateContact()) printTicket();
  });
  function resetBooking(focus = true) {
    state.step = 0; state.completed = -1; state.service = ''; state.date = ''; state.time = null; state.person = '';
    form.reset(); form.hidden = false;
    document.querySelector('#compact-selection').hidden = false;
    document.querySelector('.booking-progress').hidden = false;
    success.hidden = true;
    document.querySelector('#summary-person-row').hidden = true;
    document.querySelector('#summary-person').textContent = '';
    receipt.classList.remove('is-printed', 'is-printing');
    [firstName, phone].forEach(input => {
      input.removeAttribute('aria-invalid');
      document.getElementById(input.getAttribute('aria-describedby')).textContent = '';
    });
    showStep(0, focus);
  }
  document.querySelector('#restart-booking').addEventListener('click', () => resetBooking());
  showStep(0, false);
  app.hidden = false;

  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      const hide = [...visibility.values()].some(Boolean);
      mobileBar.classList.toggle('is-hidden', hide);
      mobileBar.inert = hide;
      mobileBar.setAttribute('aria-hidden', String(hide));
    }, { threshold: 0 });
    [document.querySelector('.hero'), document.querySelector('#reserver'), document.querySelector('footer')].forEach(element => barObserver.observe(element));
  }
})();
