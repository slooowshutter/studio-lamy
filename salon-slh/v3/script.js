(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Small-screen menu: the button controls a real navigation list, Escape closes it.
  const menuButton = $('.menu-toggle');
  const nav = $('#main-nav');
  if (menuButton && nav) {
    const setMenu = (open, returnFocus = false) => {
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      $('.menu-toggle__label', menuButton).textContent = open ? 'Fermer' : 'Menu';
      if (open) $('a', nav)?.focus();
      if (!open && returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      setMenu(false);
      if (link.hash) {
        const target = document.querySelector(link.hash);
        const heading = target?.matches('h1, h2') ? target : $('h1, h2', target || document);
        window.setTimeout(() => heading?.focus({ preventScroll: true }), 0);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 681px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  // Reveal only the drawings and the visit sequence; all copy stays readable without JS.
  const revealTargets = $$('[data-reveal-line], [data-reveal-step]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((element) => revealObserver.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  }

  // The mobile bar appears after the opening view and gives way to the booking/footer.
  const mobileBar = $('#mobile-bar');
  const hero = $('.hero');
  const bookingSection = $('#reserver');
  const footer = $('#footer');
  if (mobileBar && hero && bookingSection && footer && 'IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const updateMobileBar = () => {
      const visible = !visibility.hero && !visibility.booking && !visibility.footer;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.inert = !visible;
      mobileBar.setAttribute('aria-hidden', String(!visible));
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) visibility.hero = entry.isIntersecting;
        if (entry.target === bookingSection) visibility.booking = entry.isIntersecting;
        if (entry.target === footer) visibility.footer = entry.isIntersecting;
      });
      updateMobileBar();
    }, { threshold: 0.02 });
    barObserver.observe(hero);
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
  }

  const form = $('#booking-form');
  if (!form) return;

  const panelByStep = new Map($$('[data-panel]', form).map((panel) => [Number(panel.dataset.panel), panel]));
  const stepNames = { 1: 'Prestation', 2: 'Jour', 3: 'Heure', 4: 'Coordonnées', 5: 'confirmation' };
  const services = {
    women: { name: 'Coupe femme · cheveux courts', price: 40, duration: 45 },
    men: { name: 'Coupe homme', price: 23, duration: 30 },
    beard: { name: 'Entretien barbe', price: 12, duration: 20 },
    child: { name: 'Coupe garçon · moins de 12 ans', price: 17, duration: 30 }
  };
  const state = { service: '', date: '', time: '', firstName: '', phone: '' };
  let activeStep = 1;
  let highestStep = 1;
  let changingStep = false;
  let changeTimer = 0;

  const announcement = $('#step-announcement');
  const dayOptions = $('#day-options');
  const slotOptions = $('#slot-options');
  const slotMessage = $('#slot-message');
  const summaryService = $('#summary-service');
  const summaryDay = $('#summary-day');
  const summaryTime = $('#summary-time');
  const summaryPrice = $('#summary-price');
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

  const pad = (number) => String(number).padStart(2, '0');
  const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dateFromIso = (iso) => new Date(`${iso}T12:00:00`);
  const formatTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const dateLabel = (iso) => dayFormatter.format(dateFromIso(iso));

  function getOpenHours(iso) {
    const day = dateFromIso(iso).getDay();
    if (day === 0 || day === 1) return null;
    if (day === 6) return { start: 9 * 60, end: 16 * 60 };
    // Conservative simulation while the published 18 h 30 / 19 h closing conflict is unresolved.
    return { start: 9 * 60, end: 18 * 60 + 30 };
  }

  function renderDays() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const days = [];
    for (let offset = 0; offset < 12; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      days.push(date);
    }

    dayOptions.innerHTML = days.map((date) => {
      const iso = toIsoDate(date);
      const closed = getOpenHours(iso) === null;
      const weekday = shortWeekday.format(date).replace('.', '');
      const month = shortMonth.format(date).replace('.', '');
      const label = `${weekday} ${date.getDate()} ${month}${closed ? ', fermé' : ''}`;
      return `<label class="day-choice${closed ? ' is-closed' : ''}">
        <input type="radio" name="booking-day" value="${iso}" aria-label="${label}"${closed ? ' disabled' : ''}${state.date === iso && !closed ? ' checked' : ''}>
        <span class="day-choice__face" aria-hidden="true"><span class="day-choice__week">${weekday}</span><span class="day-choice__date">${date.getDate()}</span><span class="day-choice__month">${closed ? 'Fermé' : month}</span></span>
      </label>`;
    }).join('');
  }

  function renderSlots() {
    if (!state.date || !state.service) return;
    const hours = getOpenHours(state.date);
    if (!hours) {
      state.time = '';
      slotOptions.innerHTML = '';
      $('[data-next="4"]', form).disabled = true;
      updateSummary();
      slotMessage.textContent = 'Le salon est fermé ce jour-là.';
      return;
    }

    const service = services[state.service];
    const dayNumber = Number(state.date.slice(-2));
    const now = new Date();
    const isToday = toIsoDate(now) === state.date;
    const options = [];
    let sequence = 0;
    let availableCount = 0;
    let selectedTimeAvailable = false;

    for (let start = hours.start; start + service.duration <= hours.end; start += 30) {
      const time = formatTime(start);
      const startDate = new Date(`${state.date}T${time}:00`);
      const past = isToday && startDate <= now;
      const taken = (dayNumber + sequence * 3) % 7 === 0;
      const unavailable = past || taken;
      if (!unavailable) availableCount += 1;
      if (state.time === time && !unavailable) selectedTimeAvailable = true;
      const statusClass = past ? ' is-past' : taken ? ' is-taken' : '';
      const statusLabel = past ? '<span class="slot-availability">déjà passé</span>' : taken ? '<span class="slot-availability">déjà pris</span>' : '';
      const accessible = past ? `${time}, déjà passé` : taken ? `${time}, déjà pris` : time;
      options.push(`<label class="slot-choice${statusClass}">
        <input type="radio" name="booking-time" value="${time}" aria-label="${accessible}"${unavailable ? ' disabled' : ''}${state.time === time && !unavailable ? ' checked' : ''}>
        <span class="slot-choice__face" aria-hidden="true">${time}</span>${statusLabel}
      </label>`);
      sequence += 1;
    }

    slotOptions.innerHTML = options.join('');
    if (!selectedTimeAvailable) state.time = '';
    $('[data-next="4"]', form).disabled = !selectedTimeAvailable || availableCount === 0;
    updateSummary();
    slotMessage.textContent = availableCount
      ? 'Les créneaux sont fictifs et calculés à partir des horaires affichés.'
      : 'Aucun créneau ne reste ce jour-là. Choisissez une autre date.';
  }

  function updateSummary() {
    const service = services[state.service];
    summaryService.textContent = service ? service.name : 'À choisir';
    summaryDay.textContent = state.date ? dateLabel(state.date) : 'À choisir';
    summaryTime.textContent = state.time || 'À choisir';
    summaryPrice.textContent = service ? `${service.price}\u00a0€` : '—';

    $$('[data-goto]', document).forEach((button) => {
      const target = Number(button.dataset.goto);
      const ready = target === 1 ? Boolean(state.service) : target === 2 ? Boolean(state.date) : Boolean(state.time);
      button.disabled = !ready || activeStep === target || activeStep === 5;
    });

    const recap = $('#final-recap');
    if (recap && service && state.date && state.time) {
      recap.textContent = `${service.name} · ${dateLabel(state.date)} à ${state.time} · ${service.price}\u00a0€ indicatifs.`;
    }
  }

  function updateProgress(step) {
    const displayStep = step === 5 ? 4 : step;
    $$('[data-progress]').forEach((item) => {
      if (Number(item.dataset.progress) === displayStep) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    announcement.textContent = step === 5 ? 'Simulation terminée · rien n’a été envoyé' : `Étape ${step} sur 4 · ${stepNames[step]}`;
  }

  function transitionTo(step, focusHeading = true) {
    if (changingStep || !panelByStep.has(step)) return;
    const nextPanel = panelByStep.get(step);
    const currentPanel = panelByStep.get(activeStep);
    if (currentPanel === nextPanel) return;

    changingStep = true;
    window.clearTimeout(changeTimer);
    if (currentPanel) {
      currentPanel.classList.remove('is-current');
      currentPanel.classList.add('is-leaving');
      currentPanel.inert = true;
      currentPanel.setAttribute('aria-hidden', 'true');
    }
    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.removeAttribute('aria-hidden');
    activeStep = step;
    highestStep = Math.max(highestStep, step);
    updateProgress(step);
    updateSummary();
    if (step === 3) renderSlots();

    requestAnimationFrame(() => nextPanel.classList.add('is-current'));
    if (focusHeading) {
      const heading = $('h3[tabindex="-1"]', nextPanel);
      window.setTimeout(() => heading?.focus({ preventScroll: true }), 30);
    }

    changeTimer = window.setTimeout(() => {
      if (currentPanel) {
        currentPanel.hidden = true;
        currentPanel.classList.remove('is-leaving');
        currentPanel.removeAttribute('aria-hidden');
      }
      changingStep = false;
    }, reducedMotion.matches ? 30 : 240);
  }

  function canOpenStep(step) {
    if (step > highestStep || step > activeStep) return false;
    if (step === 1) return Boolean(state.service);
    if (step === 2) return Boolean(state.service && state.date);
    if (step === 3) return Boolean(state.service && state.date && state.time);
    return step === 4 && Boolean(state.service && state.date && state.time);
  }

  function chooseService(id) {
    const service = services[id];
    const input = $(`input[name="service"][value="${id}"]`, form);
    if (!service || !input) return;
    input.checked = true;
    state.service = id;
    state.date = '';
    state.time = '';
    highestStep = 1;
    renderDays();
    slotOptions.innerHTML = '';
    updateSummary();
    const nextButton = $('[data-next="2"]', form);
    if (nextButton) nextButton.disabled = false;
    $('[data-next="3"]', form).disabled = true;
    $('[data-next="4"]', form).disabled = true;
  }

  form.addEventListener('change', (event) => {
    const { target } = event;
    if (target.name === 'service') {
      state.service = target.value;
      state.date = '';
      state.time = '';
      highestStep = 1;
      renderDays();
      slotOptions.innerHTML = '';
      $('[data-next="2"]', form).disabled = false;
      $('[data-next="3"]', form).disabled = true;
      $('[data-next="4"]', form).disabled = true;
    } else if (target.name === 'booking-day') {
      state.date = target.value;
      state.time = '';
      $('[data-next="3"]', form).disabled = false;
      $('[data-next="4"]', form).disabled = true;
    } else if (target.name === 'booking-time') {
      state.time = target.value;
      $('[data-next="4"]', form).disabled = false;
    }
    updateSummary();
  });

  form.addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-next]');
    const backButton = event.target.closest('[data-back]');
    if (nextButton && !nextButton.disabled) {
      const next = Number(nextButton.dataset.next);
      if (next === 2 && !state.service) return;
      if (next === 3 && !state.date) return;
      if (next === 4 && !state.time) return;
      transitionTo(next);
    }
    if (backButton) transitionTo(Number(backButton.dataset.back));
  });

  $$('[data-goto]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.goto);
      if (canOpenStep(step)) transitionTo(step);
    });
  });

  $$('[data-select-service]').forEach((link) => {
    link.addEventListener('click', () => {
      chooseService(link.dataset.selectService);
      if (activeStep !== 1) transitionTo(1);
      updateSummary();
      window.setTimeout(() => $('#step-one-title')?.focus({ preventScroll: true }), 0);
    });
  });

  const firstName = $('#first-name');
  const phone = $('#phone-number');
  const nameError = $('#name-error');
  const phoneError = $('#phone-error');
  const nameValid = () => /\p{L}/u.test(firstName.value.trim());
  const phoneValid = () => {
    let digits = phone.value.replace(/\D/g, '');
    if (digits.startsWith('0033')) digits = digits.slice(2);
    return /^0[67]\d{8}$/.test(digits) || /^33[67]\d{8}$/.test(digits);
  };

  function setFieldError(input, error, valid, message) {
    input.setAttribute('aria-invalid', String(!valid));
    error.textContent = valid ? '' : message;
  }

  firstName.addEventListener('blur', () => {
    if (firstName.value) setFieldError(firstName, nameError, nameValid(), 'Indiquez un prénom pour continuer.');
  });
  phone.addEventListener('blur', () => {
    if (phone.value) setFieldError(phone, phoneError, phoneValid(), 'Indiquez un mobile français valide, par exemple 06 12 34 56 78.');
  });
  firstName.addEventListener('input', () => {
    if (firstName.hasAttribute('aria-invalid')) setFieldError(firstName, nameError, nameValid(), 'Indiquez un prénom pour continuer.');
  });
  phone.addEventListener('input', () => {
    if (phone.hasAttribute('aria-invalid')) setFieldError(phone, phoneError, phoneValid(), 'Indiquez un mobile français valide, par exemple 06 12 34 56 78.');
  });

  function escapeCalendar(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function calendarStamp(date) {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
  }

  function utcCalendarStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function downloadCalendar() {
    const service = services[state.service];
    const start = new Date(`${state.date}T${state.time}:00`);
    const end = new Date(start.getTime() + service.duration * 60000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Apercu SALON SLH//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-salon-slh@studiolamy.local`,
      `DTSTAMP:${utcCalendarStamp(new Date())}`,
      `DTSTART:${calendarStamp(start)}`,
      `DTEND:${calendarStamp(end)}`,
      `SUMMARY:${escapeCalendar(`Aperçu Salon SLH · ${service.name}`)}`,
      `LOCATION:${escapeCalendar('75 rue Auguste Kervern, 29200 Brest')}`,
      `DESCRIPTION:${escapeCalendar('Simulation Salon SLH. Créneau fictif, non transmis au salon.')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aperçu-salon-slh.ics';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activeStep !== 4) return;
    const validName = nameValid();
    const validPhone = phoneValid();
    setFieldError(firstName, nameError, validName, 'Indiquez un prénom pour continuer.');
    setFieldError(phone, phoneError, validPhone, 'Indiquez un mobile français valide, par exemple 06 12 34 56 78.');
    if (!validName || !validPhone) {
      (validName ? phone : firstName).focus();
      return;
    }

    state.firstName = firstName.value.trim();
    state.phone = phone.value.trim();
    const service = services[state.service];
    const recap = $('#success-recap');
    recap.replaceChildren();
    const firstLine = document.createElement('p');
    const firstNameText = document.createElement('strong');
    firstNameText.textContent = state.firstName;
    firstLine.append(firstNameText, document.createTextNode(` · ${service.name}`));
    const secondLine = document.createElement('p');
    secondLine.textContent = `${dateLabel(state.date)} à ${state.time} · ${service.price}\u00a0€ indicatifs`;
    const thirdLine = document.createElement('p');
    thirdLine.textContent = '75 rue Auguste Kervern, 29200 Brest';
    recap.append(firstLine, secondLine, thirdLine);
    transitionTo(5);
  });

  $('#calendar-download').addEventListener('click', downloadCalendar);
  $('#restart-booking').addEventListener('click', () => {
    window.clearTimeout(changeTimer);
    changingStep = false;
    form.reset();
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    nameError.textContent = '';
    phoneError.textContent = '';
    state.service = '';
    state.date = '';
    state.time = '';
    state.firstName = '';
    state.phone = '';
    highestStep = 1;
    renderDays();
    slotOptions.innerHTML = '';
    $('[data-next="2"]', form).disabled = true;
    $('[data-next="3"]', form).disabled = true;
    $('[data-next="4"]', form).disabled = true;
    transitionTo(1);
  });

  renderDays();
  updateSummary();
})();
