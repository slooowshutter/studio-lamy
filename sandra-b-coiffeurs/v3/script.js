(() => {
  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js-ready');
  requestAnimationFrame(() => root.classList.add('page-ready'));

  if ('IntersectionObserver' in window && !prefersReduced) {
    const revealGroups = new Map();
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      const parent = element.parentElement;
      const siblings = [...parent.querySelectorAll(':scope > [data-reveal]')];
      element.style.transitionDelay = `${Math.min(siblings.indexOf(element) * 55, 220)}ms`;
      revealGroups.set(element, parent);
    });

    root.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries, io) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealGroups.forEach((_, element) => observer.observe(element));
    document.querySelectorAll('[data-line-reveal]').forEach((element) => observer.observe(element));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  const mobileLinks = [...mobileMenu.querySelectorAll('a')];

  function closeMenu(restoreFocus = false) {
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    mobileMenu.hidden = !opening;
    if (opening) mobileLinks[0].focus();
  });
  mobileLinks.forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  const services = {
    'coupe-homme': { name: 'Coupe homme' },
    rasage: { name: 'Rasage à la serviette chaude' },
    couleur: { name: 'Coloration ou mèches' },
    chignon: { name: 'Chignon' }
  };
  const schedule = {
    0: null,
    1: null,
    2: { start: '09:15', end: '18:00' },
    3: { start: '09:15', end: '18:00' },
    4: { start: '09:15', end: '18:00' },
    5: { start: '09:00', end: '18:30' },
    6: { start: '09:00', end: '18:30' }
  };

  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-step-panel]')];
  const dateGrid = document.querySelector('#date-grid');
  const timeGrid = document.querySelector('#time-grid');
  const state = { step: 1, service: null, date: null, dateLabel: null, time: null, firstName: '', phone: '' };
  let panelTimer = 0;
  let focusTimer = 0;
  const summary = document.querySelector('#selection-summary');
  const announcement = document.querySelector('#booking-announcement');
  const progressLabel = document.querySelector('#progress-label');
  const progressFill = document.querySelector('#progress-fill');
  const finalRecap = document.querySelector('#final-recap');


  function parisParts(options) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...options })
      .formatToParts(new Date()).reduce((result, part) => {
        if (part.type !== 'literal') result[part.type] = part.value;
        return result;
      }, {});
  }

  function parisDateKey() {
    const parts = parisParts({ year: 'numeric', month: '2-digit', day: '2-digit' });
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function parisClock() {
    const parts = parisParts({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return Number(parts.hour) * 60 + Number(parts.minute);
  }

  function dateObject(key) {
    return new Date(`${key}T12:00:00Z`);
  }

  function dateLongLabel(key) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateObject(key));
  }

  function createDateChoices() {
    dateGrid.replaceChildren();
    const start = dateObject(parisDateKey());
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      const weekday = date.getUTCDay();
      const isClosed = !schedule[weekday];
      const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
      const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
      const longLabel = dateLongLabel(key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-choice';
      button.dataset.date = key;
      button.setAttribute('aria-pressed', 'false');
      button.disabled = isClosed;
      button.setAttribute('aria-label', `${longLabel}${isClosed ? ', fermé' : ''}`);
      button.innerHTML = `<span>${offset === 0 ? 'aujourd’hui' : dayName}</span><strong>${dayNumber}</strong>${isClosed ? '<small class="date-choice__status">Fermé</small>' : ''}`;
      button.addEventListener('click', () => {
        state.date = key;
        state.dateLabel = longLabel;
        state.time = null;
        dateGrid.querySelectorAll('.date-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        document.querySelector('#date-error').textContent = '';
        renderSummary();
        if (state.step >= 3) renderTimes();
      });
      dateGrid.append(button);
    }
  }

  function parseMinutes(value) {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  function formatMinutes(value) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  }

  function isBusy(key, time) {
    const seed = `${key}-${time}-sandra-b`;
    let hash = 7;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
    return hash % 7 === 0;
  }

  function renderTimes() {
    timeGrid.replaceChildren();
    if (!state.date || !state.service) return;
    const date = dateObject(state.date);
    const hours = schedule[date.getUTCDay()];
    if (!hours) return;
    const start = parseMinutes(hours.start);
    const close = parseMinutes(hours.end);
    const today = state.date === parisDateKey();
    document.querySelector('#time-hint').textContent = `${state.dateLabel} · créneaux fictifs, horaires à confirmer par téléphone`;

    for (let minute = start; minute < close; minute += 30) {
      const time = formatMinutes(minute);
      const busy = isBusy(state.date, time);
      const past = today && minute <= parisClock();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-choice';
      button.dataset.time = time;
      button.setAttribute('aria-pressed', String(state.time === time));
      button.disabled = busy || past;
      if (state.time === time) button.setAttribute('aria-pressed', 'true');
      if (busy) {
        button.textContent = `${time} · Déjà pris`;
        button.setAttribute('aria-label', `${time}, déjà pris`);
      } else {
        button.textContent = time;
        if (past) button.setAttribute('aria-label', `${time}, horaire passé`);
      }
      button.addEventListener('click', () => {
        state.time = time;
        document.querySelectorAll('.time-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        document.querySelector('#time-error').textContent = '';
        renderSummary();
      });
      timeGrid.append(button);
    }
  }

  function renderSummary() {
    const items = [];
    if (state.service) items.push(state.service.name);
    if (state.dateLabel) items.push(state.dateLabel);
    if (state.time) items.push(`${state.time}`);
    summary.textContent = items.length ? items.join(' · ') : 'Choisissez une prestation pour commencer.';
    if (state.service && state.dateLabel && state.time) {
      finalRecap.innerHTML = `<p><strong>${state.service.name}</strong> · ${state.dateLabel} à ${state.time}</p><p>Tarif et durée à confirmer par téléphone.</p>`;
    } else {
      finalRecap.replaceChildren();
    }
  }

  function setStep(nextStep, animate = true) {
    const previousStep = state.step;
    const oldPanel = panels.find((panel) => Number(panel.dataset.stepPanel) === previousStep);
    const newPanel = panels.find((panel) => Number(panel.dataset.stepPanel) === nextStep);
    window.clearTimeout(panelTimer);
    window.clearTimeout(focusTimer);
    const transitionClasses = ['is-entering-from-below', 'is-entering-from-above', 'is-leaving-up', 'is-leaving-down'];
    panels.forEach((panel) => {
      if (panel === oldPanel || panel === newPanel) return;
      panel.hidden = true;
      panel.inert = true;
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove(...transitionClasses);
    });
    oldPanel.hidden = false;
    state.step = nextStep;
    oldPanel.inert = true;
    oldPanel.setAttribute('aria-hidden', 'true');
    oldPanel.classList.remove(...transitionClasses);
    newPanel.hidden = false;
    newPanel.inert = false;
    newPanel.removeAttribute('aria-hidden');
    newPanel.classList.remove(...transitionClasses);
    if (animate && !prefersReduced) {
      const movingBack = nextStep < previousStep;
      const enteringClass = movingBack ? 'is-entering-from-above' : 'is-entering-from-below';
      const leavingClass = movingBack ? 'is-leaving-down' : 'is-leaving-up';
      oldPanel.classList.add(leavingClass);
      newPanel.classList.add(enteringClass);
      requestAnimationFrame(() => requestAnimationFrame(() => newPanel.classList.remove(enteringClass)));
      panelTimer = window.setTimeout(() => {
        oldPanel.hidden = true;
        oldPanel.classList.remove(leavingClass);
      }, 230);
      focusTimer = window.setTimeout(() => newPanel.querySelector('.step-title').focus(), 235);
    } else {
      oldPanel.hidden = true;
      newPanel.querySelector('.step-title').focus();
    }
    progressLabel.textContent = `Étape ${nextStep} sur 4`;
    progressFill.style.transform = `scaleX(${nextStep / 4})`;
    announcement.textContent = `Étape ${nextStep} sur 4.`;
    renderSummary();
  }

  function clearError(id) {
    const error = document.getElementById(id);
    if (error) error.textContent = '';
  }

  function validateStep() {
    if (state.step === 1 && !state.service) {
      document.querySelector('#service-error').textContent = 'Choisissez une prestation pour continuer.';
      form.querySelector('input[name="service"]').focus();
      return false;
    }
    if (state.step === 2 && !state.date) {
      document.querySelector('#date-error').textContent = 'Choisissez un jour où le salon est indiqué ouvert.';
      dateGrid.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    if (state.step === 3 && !state.time) {
      document.querySelector('#time-error').textContent = 'Choisissez un horaire disponible.';
      timeGrid.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  form.addEventListener('change', (event) => {
    if (event.target.name !== 'service') return;
    state.service = services[event.target.value];
    state.date = null;
    state.dateLabel = null;
    state.time = null;
    dateGrid.querySelectorAll('.date-choice').forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
    clearError('service-error');
    renderSummary();
    renderTimes();
  });

  document.querySelectorAll('[data-preselect]').forEach((link) => link.addEventListener('click', () => {
    const radio = form.querySelector(`input[name="service"][value="${link.dataset.preselect}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }));

  form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', (event) => {
    if (!validateStep()) return;
    if (state.step === 2) renderTimes();
    setStep(state.step + 1, event.detail !== 0);
  }));

  form.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', (event) => {
    setStep(state.step - 1, event.detail !== 0);
  }));

  function normalizeFrenchMobile(value) {
    let digits = value.replace(/[^\d+]/g, '');
    if (digits.startsWith('+33')) digits = `0${digits.slice(3)}`;
    if (digits.startsWith('0033')) digits = `0${digits.slice(4)}`;
    return digits.replace(/\D/g, '');
  }

  function showFieldError(input, errorId, message) {
    input.setAttribute('aria-invalid', 'true');
    document.getElementById(errorId).textContent = message;
  }

  function clearFieldError(input, errorId) {
    input.removeAttribute('aria-invalid');
    document.getElementById(errorId).textContent = '';
  }

  const nameInput = document.querySelector('#first-name');
  const phoneInput = document.querySelector('#phone');
  nameInput.addEventListener('input', () => clearFieldError(nameInput, 'name-error'));
  phoneInput.addEventListener('input', () => clearFieldError(phoneInput, 'phone-error'));

  function escapeICS(value) {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function prepareCalendarLink() {
    const datePart = state.date.replaceAll('-', '');
    const timePart = state.time.replace(':', '') + '00';
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Sandra B Preview//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Paris', 'X-LIC-LOCATION:Europe/Paris',
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT', `UID:${datePart}-${timePart}-sandra-b@studiolamy`, `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Paris:${datePart}T${timePart}`,
      `SUMMARY:${escapeICS(`Simulation — ${state.service.name} chez Sandra B.`)}`,
      `DESCRIPTION:${escapeICS('Simulation uniquement. Rien n’a été envoyé au salon.')}`,
      'LOCATION:8 rue du Vieux Sextier\\, 84000 Avignon', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const previousUrl = document.querySelector('#calendar-download').dataset.blobUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = document.querySelector('#calendar-download');
    link.href = url;
    link.dataset.blobUrl = url;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.service || !state.date || !state.time) return;
    const firstName = nameInput.value.trim();
    const phone = normalizeFrenchMobile(phoneInput.value);
    let valid = true;
    if (!firstName) {
      showFieldError(nameInput, 'name-error', 'Indiquez votre prénom pour continuer.');
      valid = false;
    }
    if (!/^0[67]\d{8}$/.test(phone)) {
      showFieldError(phoneInput, 'phone-error', 'Indiquez un numéro de mobile français valide.');
      valid = false;
    }
    if (!valid) {
      (nameInput.getAttribute('aria-invalid') === 'true' ? nameInput : phoneInput).focus();
      return;
    }

    state.firstName = firstName;
    state.phone = phoneInput.value.trim();
    prepareCalendarLink();
    document.querySelector('#success-recap').textContent = `${state.service.name}, ${dateLongLabel(state.date)} à ${state.time}.`;
    form.hidden = true;
    document.querySelector('.booking-progress').hidden = true;
    document.querySelector('#booking-success').hidden = false;
    document.querySelector('#success-title').focus();
    announcement.textContent = 'La simulation est terminée. Rien n’a été envoyé au salon.';
    renderSummary();
  });

  document.querySelector('#restart-booking').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { step: 1, service: null, date: null, dateLabel: null, time: null, firstName: '', phone: '' });
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0;
      panel.inert = index !== 0;
      if (index === 0) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
    ['service-error', 'date-error', 'time-error', 'name-error', 'phone-error', 'contact-error'].forEach(clearError);
    [nameInput, phoneInput].forEach((input) => input.removeAttribute('aria-invalid'));
    document.querySelector('#booking-success').hidden = true;
    document.querySelector('.booking-progress').hidden = false;
    progressLabel.textContent = 'Étape 1 sur 4';
    progressFill.style.transform = 'scaleX(0.25)';
    createDateChoices();
    renderSummary();
    document.querySelector('#step-service-title').focus();
    form.scrollIntoView({ block: 'start', behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  panels.forEach((panel, index) => {
    panel.inert = index !== 0;
    if (index !== 0) panel.setAttribute('aria-hidden', 'true');
  });
  createDateChoices();
  renderSummary();

  const actionBar = document.querySelector('#mobile-action-bar');
  const heroAction = document.querySelector('.hero .text-link');
  const bookingSection = document.querySelector('#rendez-vous');
  const footer = document.querySelector('.site-footer');
  if ('IntersectionObserver' in window) {
    const visibility = { heroAction: true, booking: false, footer: false };
    const updateBar = () => actionBar.classList.toggle('is-visible', !visibility.heroAction && !visibility.booking && !visibility.footer);
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroAction) visibility.heroAction = entry.isIntersecting;
        if (entry.target === bookingSection) visibility.booking = entry.isIntersecting;
        if (entry.target === footer) visibility.footer = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.01 });
    barObserver.observe(heroAction);
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
  }
})();
