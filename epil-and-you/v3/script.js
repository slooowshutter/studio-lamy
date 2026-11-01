(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const revealTargets = document.querySelectorAll('[data-reveal-item], [data-reveal-service], [data-draw]');
  document.querySelectorAll('[data-reveal-item], [data-reveal-service]').forEach((item) => {
    const selector = item.matches('[data-reveal-service]') ? '[data-reveal-service]' : '[data-reveal-item]';
    const siblings = [...item.parentElement.querySelectorAll(selector)];
    item.style.setProperty('--reveal-delay', `${(siblings.indexOf(item) % 4) * 55}ms`);
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        if (target.matches('[data-draw]')) target.classList.add('is-drawn');
        else target.classList.add('is-visible');
        observer.unobserve(target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -32px 0px' });
    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add(target.matches('[data-draw]') ? 'is-drawn' : 'is-visible'));
  }

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('motion-ready')));

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  if (menuButton && mobileMenu) {
    const menuLinks = [...mobileMenu.querySelectorAll('a')];
    let closeTimer;

    function closeMenu(returnFocus = false) {
      menuButton.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => { mobileMenu.hidden = true; }, reduceMotion.matches ? 0 : 190);
      if (returnFocus) menuButton.focus();
    }

    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      window.clearTimeout(closeTimer);
      if (!opening) {
        closeMenu(true);
        return;
      }
      mobileMenu.hidden = false;
      menuButton.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => mobileMenu.classList.add('is-open'));
      if (menuLinks[0]) menuLinks[0].focus();
    });

    menuLinks.forEach((link) => link.addEventListener('click', () => closeMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
  }

  const booking = document.querySelector('[data-booking]');
  if (!booking) {
    window.__site = true;
    return;
  }

  const panels = [...booking.querySelectorAll('[data-panel]')];
  const stepLinks = [...booking.querySelectorAll('[data-step-link]')];
  const summaryService = booking.querySelector('[data-summary-service]');
  const summaryDay = booking.querySelector('[data-summary-day]');
  const summaryTime = booking.querySelector('[data-summary-time]');
  const editButtons = [...booking.querySelectorAll('[data-edit-step]')];
  const status = booking.querySelector('[data-booking-status]');
  const dayList = booking.querySelector('[data-day-list]');
  const slotList = booking.querySelector('[data-slot-list]');
  const slotDate = booking.querySelector('[data-slot-date]');
  const contactForm = booking.querySelector('[data-contact-form]');
  const successPanel = booking.querySelector('[data-booking-success]');
  const formSummary = booking.querySelector('[data-form-summary]');
  const state = { service: null, date: null, time: null, firstName: '', phone: '' };
  let currentStep = 1;
  let transitionNumber = 0;

  const weekdayFull = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const monthFull = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function dateKeyFromParts(parts) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function utcDateFromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function frenchDate(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    const value = new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(utcDateFromKey(key));
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function formatHour(minutes, french = true) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return french ? `${hour}\u00a0h\u00a0${minute}` : `${hour}:${minute}`;
  }

  function daySchedule(key) {
    const day = utcDateFromKey(key).getUTCDay();
    if (day === 0) return null;
    if (day === 6) return { opens: 9 * 60, closes: 19 * 60 };
    return { opens: 10 * 60, closes: 19 * 60 + 30 };
  }

  const parisToday = dateKeyFromParts(parisParts());
  const parisClock = parisParts();
  const parisMinutesNow = Number(parisClock.hour) * 60 + Number(parisClock.minute);

  function renderDays() {
    const today = utcDateFromKey(parisToday);
    const dates = [];
    for (let offset = 0; offset < 12; offset += 1) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + offset);
      dates.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`);
    }

    dayList.replaceChildren();
    dates.forEach((key, index) => {
      const date = utcDateFromKey(key);
      const closed = daySchedule(key) === null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-choice';
      button.dataset.date = key;
      button.setAttribute('aria-pressed', String(state.date === key));
      button.setAttribute('aria-label', `${frenchDate(key)}${closed ? ', fermé' : ''}`);
      button.disabled = closed;

      const weekday = document.createElement('span');
      weekday.className = 'day-choice__weekday';
      weekday.textContent = index === 0 ? 'Aujourd’hui' : weekdayShort.format(date).replace('.', '');
      const number = document.createElement('span');
      number.className = 'day-choice__number';
      number.textContent = String(date.getUTCDate());
      const month = document.createElement('span');
      month.className = 'day-choice__month';
      month.textContent = monthShort.format(date).replace('.', '');
      button.append(weekday, number, month);

      if (closed) {
        const closedLabel = document.createElement('span');
        closedLabel.className = 'day-choice__closed';
        closedLabel.textContent = 'Fermé';
        button.append(closedLabel);
      }
      dayList.append(button);
    });
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function slotIsPast(key, minute) {
    if (key !== parisToday) return false;
    return minute <= parisMinutesNow;
  }

  function slotIsTaken(key, minute, index) {
    const seed = hashString(`${key}:${state.service ? state.service.id : 'soin'}`);
    return (seed + index * 17 + minute * 3) % 11 === 0 || (seed + index * 29 + minute) % 17 === 0;
  }

  function makeSlotLabel(key, minute, stateText) {
    const label = document.createElement('label');
    label.className = 'slot-choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'appointment-time';
    radio.value = formatHour(minute, false);
    radio.dataset.minutes = String(minute);
    radio.dataset.date = key;
    radio.disabled = Boolean(stateText);
    radio.checked = state.time === minute;

    const time = document.createElement('time');
    time.dateTime = `${key}T${formatHour(minute, false)}`;
    time.textContent = formatHour(minute);
    label.append(radio, time);

    if (stateText) {
      const note = document.createElement('small');
      note.textContent = stateText;
      label.append(note);
    }
    return label;
  }

  function renderSlots() {
    slotList.replaceChildren();
    if (!state.date || !state.service) {
      slotDate.textContent = 'Choisissez un jour pour afficher les créneaux.';
      return;
    }

    const schedule = daySchedule(state.date);
    if (!schedule) {
      slotDate.textContent = `${frenchDate(state.date)} · fermé selon l’horaire affiché, à confirmer.`;
      slotList.append(Object.assign(document.createElement('p'), { className: 'slot-empty', textContent: 'Aucun créneau ce jour-là.' }));
      return;
    }

    slotDate.textContent = `${frenchDate(state.date)} · créneaux simulés.`;
    const groups = [
      { label: 'Matin', from: schedule.opens, to: 12 * 60 },
      { label: 'Après-midi', from: 12 * 60, to: 17 * 60 },
      { label: 'Fin de journée', from: 17 * 60, to: schedule.closes }
    ];
    let index = 0;
    let availableCount = 0;

    groups.forEach((group) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'slot-group';
      const legend = document.createElement('legend');
      legend.textContent = group.label;
      const grid = document.createElement('div');
      grid.className = 'slot-grid';
      let groupCount = 0;

      for (let minute = group.from; minute < Math.min(group.to, schedule.closes); minute += 30) {
        if (minute < schedule.opens) continue;
        const past = slotIsPast(state.date, minute);
        const taken = !past && slotIsTaken(state.date, minute, index);
        const label = makeSlotLabel(state.date, minute, past ? 'Passé' : taken ? 'Déjà pris' : '');
        if (!past && !taken) availableCount += 1;
        grid.append(label);
        groupCount += 1;
        index += 1;
      }

      if (groupCount) {
        fieldset.append(legend, grid);
        slotList.append(fieldset);
      }
    });

    if (availableCount === 0) {
      const empty = document.createElement('p');
      empty.className = 'slot-empty';
      empty.textContent = 'Aucun créneau libre dans la simulation. Choisissez un autre jour.';
      slotList.append(empty);
      status.textContent = `Aucun créneau libre affiché pour ${frenchDate(state.date)}.`;
    } else {
      status.textContent = `${availableCount} créneaux d’exemple affichés pour ${frenchDate(state.date)}. Les disponibilités sont simulées.`;
    }
  }

  function canGo(step) {
    if (step === 1) return true;
    if (step === 2) return Boolean(state.service);
    if (step === 3) return Boolean(state.service && state.date);
    if (step === 4) return Boolean(state.service && state.date && state.time !== null);
    return false;
  }

  function updateStepNav() {
    stepLinks.forEach((button) => {
      const step = Number(button.dataset.stepLink);
      button.disabled = !canGo(step);
      button.removeAttribute('aria-current');
      if (step === currentStep) button.setAttribute('aria-current', 'step');
    });

    editButtons.forEach((button) => {
      button.disabled = !canGo(Number(button.dataset.editStep));
    });
  }

  function updateSummary() {
    summaryService.textContent = state.service ? state.service.name : 'À choisir';
    summaryDay.textContent = state.date ? frenchDate(state.date) : 'À choisir';
    summaryTime.textContent = state.time !== null ? formatHour(state.time) : 'À choisir';
    formSummary.textContent = state.service
      ? `${state.service.name} · ${state.date ? frenchDate(state.date) : 'jour à choisir'} · ${state.time !== null ? formatHour(state.time) : 'heure à choisir'} · Prix à confirmer.`
      : 'Votre sélection s’affichera ici.';
    updateStepNav();
  }

  function focusStep(step) {
    const heading = booking.querySelector(`#step-title-${step}`);
    if (heading) heading.focus();
  }

  function goToStep(step, focus = true) {
    if (!canGo(step)) {
      status.textContent = step === 2 ? 'Choisissez d’abord un soin.' : step === 3 ? 'Choisissez d’abord un jour.' : 'Choisissez d’abord une heure.';
      if (step === 2) booking.querySelector('input[name="service"]')?.focus();
      else if (step === 3) dayList.querySelector('.day-choice:not(:disabled)')?.focus();
      else if (step === 4) slotList.querySelector('input:not(:disabled)')?.focus();
      return;
    }

    if (step === currentStep) {
      if (focus) focusStep(step);
      return;
    }

    if (step === 3) renderSlots();
    const number = ++transitionNumber;
    const previousPanel = booking.querySelector(`[data-panel="${currentStep}"]`);
    const nextPanel = booking.querySelector(`[data-panel="${step}"]`);
    panels.forEach((panel) => {
      if (panel === previousPanel || panel === nextPanel) return;
      panel.hidden = true;
      panel.classList.remove('is-active', 'is-entering', 'is-leaving');
      panel.inert = true;
      panel.setAttribute('aria-hidden', 'true');
    });
    currentStep = step;
    nextPanel.hidden = false;
    nextPanel.classList.remove('is-active', 'is-leaving');
    nextPanel.removeAttribute('aria-hidden');
    nextPanel.inert = false;
    nextPanel.classList.add('is-entering');
    previousPanel.classList.remove('is-entering');
    previousPanel.classList.remove('is-leaving');
    previousPanel.inert = true;
    previousPanel.setAttribute('aria-hidden', 'true');
    previousPanel.classList.remove('is-active');
    previousPanel.classList.add('is-leaving');
    updateStepNav();
    status.textContent = `Étape ${step} sur 4.`;

    requestAnimationFrame(() => {
      if (number !== transitionNumber) return;
      nextPanel.classList.remove('is-entering');
      nextPanel.classList.add('is-active');
    });

    const delay = reduceMotion.matches ? 150 : 230;
    window.setTimeout(() => {
      if (number !== transitionNumber) return;
      previousPanel.hidden = true;
      previousPanel.classList.remove('is-leaving');
      nextPanel.inert = false;
      nextPanel.removeAttribute('aria-hidden');
      if (focus) focusStep(step);
    }, delay);
  }

  function updateSelectedDay() {
    dayList.querySelectorAll('.day-choice').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.date === state.date));
    });
  }

  function clearTimeSelection() {
    state.time = null;
    slotList.querySelectorAll('input[name="appointment-time"]').forEach((input) => { input.checked = false; });
  }

  renderDays();
  updateSummary();

  booking.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.name === 'service') {
      const changed = !state.service || state.service.id !== input.value;
      state.service = { id: input.value, name: input.dataset.name };
      if (changed) {
        state.date = null;
        clearTimeSelection();
        updateSelectedDay();
        renderSlots();
      }
      updateSummary();
      status.textContent = `${state.service.name} sélectionné. Prix à confirmer.`;
    }

    if (input.name === 'appointment-time') {
      state.time = Number(input.dataset.minutes);
      updateSummary();
      status.textContent = `${formatHour(state.time)} sélectionné. Prix à confirmer.`;
    }
  });

  dayList.addEventListener('click', (event) => {
    const button = event.target.closest('.day-choice');
    if (!button || button.disabled) return;
    state.date = button.dataset.date;
    clearTimeSelection();
    updateSelectedDay();
    renderSlots();
    updateSummary();
  });

  booking.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.next)));
  });

  booking.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.back)));
  });

  stepLinks.forEach((button) => button.addEventListener('click', () => {
    if (!button.disabled) goToStep(Number(button.dataset.stepLink));
  }));

  editButtons.forEach((button) => button.addEventListener('click', () => {
    if (!button.disabled) goToStep(Number(button.dataset.editStep));
  }));

  document.querySelectorAll('[data-book-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const serviceId = link.dataset.bookService;
      const radio = booking.querySelector(`input[name="service"][value="${CSS.escape(serviceId)}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      goToStep(1, false);
    });
  });

  const nameInput = booking.querySelector('#client-name');
  const phoneInput = booking.querySelector('#client-phone');
  const nameError = booking.querySelector('[data-name-error]');
  const phoneError = booking.querySelector('[data-phone-error]');

  function normalizeFrenchMobile(value) {
    const digits = value.replace(/\D/g, '');
    if (/^0[67]\d{8}$/.test(digits)) return digits;
    if (/^(?:33|0033)[67]\d{8}$/.test(digits)) return `0${digits.slice(-9)}`;
    return '';
  }

  function clearFieldError(input, messageNode) {
    input.removeAttribute('aria-invalid');
    messageNode.textContent = '';
  }

  nameInput.addEventListener('input', () => clearFieldError(nameInput, nameError));
  phoneInput.addEventListener('input', () => clearFieldError(phoneInput, phoneError));

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    let valid = true;
    const firstName = nameInput.value.trim();
    const phone = normalizeFrenchMobile(phoneInput.value);
    clearFieldError(nameInput, nameError);
    clearFieldError(phoneInput, phoneError);

    if (!firstName) {
      nameInput.setAttribute('aria-invalid', 'true');
      nameError.textContent = 'Indiquez votre prénom pour terminer la démonstration.';
      valid = false;
    }
    if (!phone) {
      phoneInput.setAttribute('aria-invalid', 'true');
      phoneError.textContent = 'Saisissez un numéro mobile français valide, commençant par 06 ou 07.';
      valid = false;
    }
    if (!valid) {
      (nameInput.getAttribute('aria-invalid') ? nameInput : phoneInput).focus();
      status.textContent = 'Vérifiez les champs signalés.';
      return;
    }

    state.firstName = firstName;
    state.phone = phone;
    const service = state.service ? state.service.name : 'Soin à confirmer';
    const dateText = state.date ? frenchDate(state.date) : 'jour à choisir';
    const timeText = state.time !== null ? formatHour(state.time) : 'heure à choisir';
    booking.querySelector('[data-success-summary]').textContent = `${firstName} · ${service} · ${dateText}, à ${timeText} · prix à confirmer.`;
    contactForm.hidden = true;
    successPanel.hidden = false;
    successPanel.querySelector('h4').focus();
    status.textContent = 'Simulation terminée. Aucun rendez-vous n’a été transmis.';
  });

  function escapeIcs(value) {
    return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function parisWallTimeToUtc(key, time) {
    const [year, month, day] = key.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(wallClockUtc));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const representedUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    return new Date(wallClockUtc - (representedUtc - wallClockUtc));
  }

  function utcStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function foldIcsLine(line) {
    let output = '';
    let byteCount = 0;
    const encoder = new TextEncoder();
    for (const character of line) {
      const size = encoder.encode(character).length;
      if (byteCount + size > 75) {
        output += '\r\n ';
        byteCount = 1;
      }
      output += character;
      byteCount += size;
    }
    return output;
  }

  function downloadCalendar() {
    if (!state.date || state.time === null || !state.service) return;
    const start = parisWallTimeToUtc(state.date, formatHour(state.time, false));
    const summary = escapeIcs(`Rendez-vous à confirmer — ${state.service.name} · Epil & You`);
    const location = escapeIcs('19, place Meynard, 33000 Bordeaux');
    const description = escapeIcs('Ajout de calendrier pour une simulation. Aucun rendez-vous n’a été transmis à Epil & You. Prix à confirmer.');
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@preview.studio-lamy.invalid`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Epil You//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${utcStamp(new Date())}`, `DTSTART:${utcStamp(start)}`,
      `SUMMARY:${summary}`, `LOCATION:${location}`, `DESCRIPTION:${description}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const calendar = `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
    const file = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'rendez-vous-a-confirmer-epil-you.ics';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  booking.querySelector('[data-download-ics]').addEventListener('click', downloadCalendar);

  booking.querySelector('[data-restart]').addEventListener('click', () => {
    state.service = null;
    state.date = null;
    state.time = null;
    state.firstName = '';
    state.phone = '';
    booking.querySelectorAll('input[name="service"], input[name="appointment-time"]').forEach((input) => { input.checked = false; });
    contactForm.reset();
    contactForm.hidden = false;
    successPanel.hidden = true;
    clearFieldError(nameInput, nameError);
    clearFieldError(phoneInput, phoneError);
    renderDays();
    updateSelectedDay();
    renderSlots();
    updateSummary();
    goToStep(1);
  });

  document.addEventListener('focusin', (event) => {
    if (event.target.matches('input, textarea, select')) document.body.classList.add('form-is-focused');
  });
  document.addEventListener('focusout', (event) => {
    if (!event.target.matches('input, textarea, select')) return;
    window.setTimeout(() => {
      if (!document.activeElement.matches('input, textarea, select')) document.body.classList.remove('form-is-focused');
    }, 0);
  });

  window.__site = true;
})();
