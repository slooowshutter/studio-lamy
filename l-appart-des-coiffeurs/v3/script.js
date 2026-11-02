(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  requestAnimationFrame(() => root.classList.add('ready'));

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const menuLabel = document.querySelector('.menu-toggle__label');
  const navigation = document.querySelector('#navigation-principale');
  const navigationLinks = [...navigation.querySelectorAll('a')];

  function setNavigation(open, returnFocus = false) {
    menuButton.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Fermer la navigation' : 'Ouvrir la navigation';
    navigation.classList.toggle('is-open', open);
    if (open) navigationLinks[0].focus();
    if (!open && returnFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => {
    setNavigation(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  menuButton.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setNavigation(false, true);
    }
  });
  navigation.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setNavigation(false, true);
    }
  });
  navigationLinks.forEach((link) => link.addEventListener('click', () => setNavigation(false)));

  const bookingForm = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-step-panel]')];
  const dayList = document.querySelector('[data-day-list]');
  const slotList = document.querySelector('[data-slot-list]');
  const stepAnnouncement = document.querySelector('[data-step-announcement]');
  const dayError = document.querySelector('[data-day-error]');
  const slotError = document.querySelector('[data-slot-error]');
  const summaryDay = document.querySelector('[data-summary-day]');
  const summaryTime = document.querySelector('[data-summary-time]');
  const successPanel = document.querySelector('[data-success]');
  const successTitle = document.querySelector('[data-success-title]');
  const successCopy = document.querySelector('[data-success-copy]');
  const nameField = document.querySelector('#prenom');
  const phoneField = document.querySelector('#telephone');
  const nameError = document.querySelector('#prenom-erreur');
  const phoneError = document.querySelector('#telephone-erreur');
  const dayChoices = new Map();
  const state = { step: 1, day: null, time: null };
  const openingHours = new Map([
    [2, [9, 19]],
    [3, [9, 19]],
    [4, [9, 19]],
    [5, [9, 19]],
    [6, [9, 16]]
  ]);

  function parisClock() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
    return {
      year: values.year,
      month: values.month,
      day: values.day,
      minutes: values.hour * 60 + values.minute
    };
  }

  function makeDay(offset, today) {
    return new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12));
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateLabel(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(date);
  }

  function makeSlots(date) {
    const hours = openingHours.get(date.getUTCDay());
    if (!hours) return [];
    const [opening, closing] = hours;
    const key = dateKey(date);
    const now = parisClock();
    const todayKey = dateKey(new Date(Date.UTC(now.year, now.month - 1, now.day, 12)));
    const currentMinutes = now.minutes;
    const slots = [];
    for (let minute = opening * 60; minute + 30 <= closing * 60; minute += 30) {
      const seed = [...`${key}:${minute}`].reduce((total, character) => (Math.imul(total, 31) + character.charCodeAt(0)) >>> 0, 7);
      const occupied = seed % 5 === 0;
      const inPast = key === todayKey && minute < currentMinutes;
      slots.push({ minute, occupied, inPast });
    }
    return slots;
  }

  function timeLabel(minute) {
    const hour = Math.floor(minute / 60);
    const minutes = minute % 60;
    return minutes === 0 ? `${hour} h` : `${hour} h 30`;
  }

  function fullDateLabel(date) {
    return dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function updateSummary() {
    summaryDay.textContent = state.day ? fullDateLabel(dayChoices.get(state.day)) : 'À choisir';
    summaryTime.textContent = state.time || 'À choisir';
  }

  function renderDays() {
    const today = parisClock();
    dayList.replaceChildren();
    dayChoices.clear();
    for (let offset = 0; offset < 12; offset += 1) {
      const date = makeDay(offset, today);
      const key = dateKey(date);
      const weekday = date.getUTCDay();
      const hours = openingHours.get(weekday);
      const allSlots = makeSlots(date);
      const hasFutureSlot = allSlots.some((slot) => !slot.inPast && !slot.occupied);
      const closed = !hours;
      const unavailable = closed || !hasFutureSlot;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-option';
      button.disabled = unavailable;
      button.setAttribute('aria-pressed', String(state.day === key));
      const number = document.createElement('span');
      number.textContent = dateLabel(date, { day: 'numeric' });
      const label = document.createElement('span');
      if (closed) {
        label.textContent = `${dateLabel(date, { weekday: 'short', month: 'short' })} · fermé`;
      } else if (!hasFutureSlot) {
        label.textContent = `${dateLabel(date, { weekday: 'short', month: 'short' })} · terminé`;
      } else {
        label.textContent = dateLabel(date, { weekday: 'short', month: 'short' });
      }
      const longDate = fullDateLabel(date);
      button.setAttribute('aria-label', closed
        ? `${longDate}, fermé selon les horaires indiqués`
        : unavailable ? `${longDate}, aucun créneau de démonstration restant` : `${longDate}, choisir ce jour`);
      button.append(number, label);
      button.addEventListener('click', () => {
        state.day = key;
        state.time = null;
        dayError.textContent = '';
        dayChoices.set(key, date);
        [...dayList.querySelectorAll('.day-option')].forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        renderSlots();
        updateSummary();
      });
      dayChoices.set(key, date);
      dayList.append(button);
    }
  }

  function renderSlots() {
    slotList.replaceChildren();
    slotError.textContent = '';
    if (!state.day || !dayChoices.has(state.day)) return;
    makeSlots(dayChoices.get(state.day)).forEach((slot) => {
      const button = document.createElement('button');
      const label = timeLabel(slot.minute);
      const unavailable = slot.occupied || slot.inPast;
      button.type = 'button';
      button.className = 'slot-option';
      button.textContent = label;
      button.disabled = unavailable;
      button.setAttribute('aria-pressed', String(state.time === label));
      if (unavailable) button.setAttribute('aria-label', `${label}, indisponible dans cette simulation`);
      else button.setAttribute('aria-label', `${label}, choisir cette heure de démonstration`);
      button.addEventListener('click', () => {
        state.time = label;
        slotError.textContent = '';
        [...slotList.querySelectorAll('.slot-option')].forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        updateSummary();
      });
      slotList.append(button);
    });
  }

  function enterStep(nextStep) {
    if (nextStep < 1 || nextStep > panels.length) return;
    const previousPanel = panels[state.step - 1];
    const nextPanel = panels[nextStep - 1];
    state.step = nextStep;
    if (previousPanel !== nextPanel) {
      previousPanel.classList.remove('is-visible');
      previousPanel.classList.add('is-leaving');
      nextPanel.classList.add('is-current');
      nextPanel.classList.remove('is-leaving');
      requestAnimationFrame(() => nextPanel.classList.add('is-visible'));
      window.setTimeout(() => previousPanel.classList.remove('is-current', 'is-leaving'), motionPreference.matches ? 125 : 245);
    }
    const heading = nextPanel.querySelector('h3');
    heading.focus({ preventScroll: true });
    const counter = nextPanel.querySelector('.step-counter').textContent;
    stepAnnouncement.textContent = `${counter} : ${heading.textContent}.`;
    if (nextStep === 3) renderSlots();
  }

  function validateStep(step) {
    if (step === 2 && !state.day) {
      dayError.textContent = 'Choisissez un jour de démonstration.';
      return false;
    }
    if (step === 3 && !state.time) {
      slotError.textContent = 'Choisissez une heure de démonstration.';
      return false;
    }
    return true;
  }

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(state.step)) enterStep(state.step + 1);
    });
  });
  document.querySelectorAll('[data-previous]').forEach((button) => {
    button.addEventListener('click', () => enterStep(state.step - 1));
  });

  function validateName() {
    const valid = nameField.value.trim().length > 0;
    nameError.textContent = valid ? '' : 'Saisissez votre prénom.';
    nameField.setAttribute('aria-invalid', String(!valid));
    return valid;
  }

  function validatePhone() {
    const normalized = phoneField.value.trim().replace(/[\s.\u00a0-]/g, '');
    const valid = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalized);
    phoneError.textContent = valid ? '' : 'Saisissez un numéro de mobile français valide.';
    phoneField.setAttribute('aria-invalid', String(!valid));
    return valid;
  }

  nameField.addEventListener('input', () => {
    if (nameField.getAttribute('aria-invalid') === 'true') validateName();
  });
  phoneField.addEventListener('input', () => {
    if (phoneField.getAttribute('aria-invalid') === 'true') validatePhone();
  });

  function finishSimulation() {
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid) {
      nameField.focus();
      return;
    }
    if (!phoneValid) {
      phoneField.focus();
      return;
    }
    const chosenDate = dayChoices.get(state.day);
    const readableDate = fullDateLabel(chosenDate);
    successTitle.textContent = `Merci, ${nameField.value.trim()}.`;
    successCopy.textContent = `Votre simulation porte sur une consultation préalable, le ${readableDate} à ${state.time}.`;
    bookingForm.hidden = true;
    successPanel.hidden = false;
    stepAnnouncement.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.';
    successTitle.focus({ preventScroll: true });
  }

  document.querySelector('[data-confirm]').addEventListener('click', finishSimulation);
  bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step === 4) finishSimulation();
  });

  document.querySelector('[data-restart]').addEventListener('click', () => {
    bookingForm.reset();
    bookingForm.hidden = false;
    successPanel.hidden = true;
    state.day = null;
    state.time = null;
    dayError.textContent = '';
    slotError.textContent = '';
    nameError.textContent = '';
    phoneError.textContent = '';
    nameField.removeAttribute('aria-invalid');
    phoneField.removeAttribute('aria-invalid');
    updateSummary();
    renderDays();
    enterStep(1);
  });

  renderDays();
  updateSummary();
  bookingForm.querySelectorAll('[data-step-panel]:not([data-step-panel="1"])').forEach((panel) => {
    panel.classList.remove('is-current', 'is-visible', 'is-leaving');
  });
})();
