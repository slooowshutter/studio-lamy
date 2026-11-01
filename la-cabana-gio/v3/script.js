(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));

  if ('IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -7% 0px' });

    $$('[data-reveal]').forEach((element) => revealObserver.observe(element));
  }

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-visible')));

  const form = $('#booking-form');
  if (!form) return;

  const panels = $$('[data-booking-step]', form);
  const successPanel = $('#booking-success', form);
  const stepNav = $$('[data-step-nav]', form);
  const dayStrip = $('#day-strip', form);
  const slotGroups = $('#slot-groups', form);
  const live = $('#flow-live', form);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const services = {
    curl: {
      label: 'Coupe sur cheveux secs · boucles ou frisures',
      shortLabel: 'Coupe à sec · boucles ou frisures',
      duration: 45,
      price: null
    },
    brushing: {
      label: 'Shampoing, coupe et brushing',
      shortLabel: 'Shampoing, coupe et brushing',
      duration: 45,
      price: 30
    },
    men: {
      label: 'Coupe homme',
      shortLabel: 'Coupe homme',
      duration: 30,
      price: 23
    },
    color: {
      label: 'Coupe et couleur',
      shortLabel: 'Coupe et couleur',
      duration: 90,
      price: 54
    }
  };

  const openingHours = {
    0: null,
    1: [14 * 60, 19 * 60],
    2: [10 * 60, 19 * 60],
    3: [10 * 60, 19 * 60],
    4: [10 * 60, 19 * 60],
    5: [10 * 60, 19 * 60],
    6: [10 * 60, 18 * 60]
  };

  const state = {
    currentStep: 0,
    maxVisited: 0,
    service: null,
    date: null,
    time: null,
    transitioning: false
  };

  const parisParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      iso: `${values.year}-${values.month}-${values.day}`,
      minutes: Number(values.hour) * 60 + Number(values.minute)
    };
  };

  const dateFromISO = (iso) => new Date(`${iso}T12:00:00Z`);
  const weekdayFor = (iso) => dateFromISO(iso).getUTCDay();
  const addDays = (iso, count) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + count, 12)).toISOString().slice(0, 10);
  };

  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'short'
  });
  const fullDateFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
  });
  const dayNumberFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', day: 'numeric'
  });

  const titleCase = (text) => text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : text;
  const fullDayLabel = (iso) => titleCase(fullDateFormat.format(dateFromISO(iso)));
  const serviceFor = (key = state.service) => key ? services[key] : null;
  const priceLabel = (service = serviceFor()) => {
    if (!service || service.price === null) return 'À confirmer';
    return `${service.price} € · indicatif`;
  };
  const timeLabel = (value) => value ? `${value.slice(0, 2)} h ${value.slice(3)}` : 'À choisir';

  const announce = (message) => {
    live.textContent = '';
    window.setTimeout(() => { live.textContent = message; }, 25);
  };

  function updateSummary() {
    const service = serviceFor();
    const summaryService = $('[data-summary-service]');
    const summaryDate = $('[data-summary-date]');
    const summaryTime = $('[data-summary-time]');
    const summaryPrice = $('[data-summary-price]');
    const finalService = $('[data-final-service]');
    const finalDate = $('[data-final-date]');
    const finalTime = $('[data-final-time]');
    const finalPrice = $('[data-final-price]');

    summaryService.textContent = service ? service.shortLabel : 'À choisir';
    summaryDate.textContent = state.date ? fullDayLabel(state.date) : 'À choisir';
    summaryTime.textContent = timeLabel(state.time);
    summaryPrice.textContent = priceLabel(service);

    finalService.textContent = service ? service.label : 'À compléter';
    finalDate.textContent = state.date ? fullDayLabel(state.date) : 'Jour à choisir';
    finalTime.textContent = timeLabel(state.time);
    finalPrice.textContent = `Tarif ${priceLabel(service).toLocaleLowerCase('fr-FR')}`;

    $$('[data-edit-step]', form).forEach((button) => {
      const target = Number(button.dataset.editStep);
      const complete = target === 0 ? Boolean(state.service)
        : target === 1 ? Boolean(state.date)
          : Boolean(state.time);
      button.disabled = !complete;
    });
  }

  function updateStepNav() {
    stepNav.forEach((button) => {
      const index = Number(button.dataset.stepNav);
      if (index === state.currentStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = index > state.maxVisited || state.transitioning;
    });
  }

  function renderDays() {
    const today = parisParts().iso;
    dayStrip.replaceChildren();

    for (let offset = 0; offset < 14; offset += 1) {
      const iso = addDays(today, offset);
      const weekday = weekdayFor(iso);
      const closed = openingHours[weekday] === null;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'day-button';
      button.dataset.date = iso;
      button.disabled = closed;
      button.setAttribute('aria-pressed', state.date === iso ? 'true' : 'false');

      const dayName = offset === 0 ? 'Aujourd’hui' : offset === 1 ? 'Demain' : weekdayFormat.format(dateFromISO(iso)).replace('.', '');
      const dayPart = doc.createElement('span');
      dayPart.className = 'day-week';
      dayPart.textContent = dayName;

      const datePart = doc.createElement('span');
      datePart.className = 'day-date';
      datePart.textContent = dayNumberFormat.format(dateFromISO(iso));

      button.append(dayPart, datePart);
      if (closed) {
        button.classList.add('is-closed');
        const closedPart = doc.createElement('span');
        closedPart.className = 'day-closed';
        closedPart.textContent = 'fermé';
        button.append(closedPart);
      }

      const longName = fullDateFormat.format(dateFromISO(iso));
      button.setAttribute('aria-label', `${longName}${closed ? ', fermé' : ''}`);
      dayStrip.append(button);
    }
  }

  function hashText(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  const asClock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  function renderSlots() {
    slotGroups.replaceChildren();
    state.time = null;
    updateSummary();

    const service = serviceFor();
    if (!state.date || !service) {
      const message = doc.createElement('p');
      message.className = 'slot-empty';
      message.textContent = 'Choisissez d’abord une prestation et un jour.';
      slotGroups.append(message);
      return;
    }

    const weekday = weekdayFor(state.date);
    const range = openingHours[weekday];
    if (!range) {
      const message = doc.createElement('p');
      message.className = 'slot-empty';
      message.textContent = 'Le salon est indiqué fermé ce jour-là. Choisissez une autre date.';
      slotGroups.append(message);
      return;
    }

    const parisNow = parisParts();
    const today = state.date === parisNow.iso;
    const periods = [
      { title: 'Matin', test: (minutes) => minutes < 12 * 60, slots: [] },
      { title: 'Après-midi', test: (minutes) => minutes >= 12 * 60 && minutes < 17 * 60, slots: [] },
      { title: 'Soir', test: (minutes) => minutes >= 17 * 60, slots: [] }
    ];

    let slotCount = 0;
    let availableCount = 0;
    for (let start = range[0]; start + service.duration <= range[1]; start += 30) {
      const value = asClock(start);
      const isPast = today && start <= parisNow.minutes;
      const isTaken = !isPast && hashText(`${state.date}-${state.service}-${value}`) % 7 === 2;
      const group = periods.find((period) => period.test(start));
      if (group) {
        group.slots.push({ value, isPast, isTaken });
        slotCount += 1;
        if (!isPast && !isTaken) availableCount += 1;
      }
    }

    $('#slot-day-copy').textContent = `${fullDayLabel(state.date)} · durée de démonstration ${service.duration} min, à confirmer.`;

    periods.forEach((period, periodIndex) => {
      if (!period.slots.length) return;
      const fieldset = doc.createElement('fieldset');
      fieldset.className = 'slot-group';
      const legend = doc.createElement('legend');
      legend.textContent = period.title;
      const grid = doc.createElement('div');
      grid.className = 'slot-grid';

      period.slots.forEach((slot, slotIndex) => {
        const label = doc.createElement('label');
        label.className = 'slot-choice';
        const input = doc.createElement('input');
        input.type = 'radio';
        input.name = 'slot';
        input.value = slot.value;
        input.required = true;
        input.disabled = slot.isPast || slot.isTaken;
        input.id = `slot-${state.date}-${periodIndex}-${slotIndex}`;
        const time = doc.createElement('span');
        time.className = 'slot-time';
        time.textContent = timeLabel(slot.value);
        label.append(input, time);

        if (slot.isPast || slot.isTaken) {
          const stateLabel = doc.createElement('span');
          stateLabel.className = 'slot-state';
          stateLabel.textContent = slot.isPast ? 'passé' : 'déjà pris';
          label.append(stateLabel);
          input.setAttribute('aria-label', `${timeLabel(slot.value)}, ${stateLabel.textContent}`);
        } else {
          input.setAttribute('aria-label', timeLabel(slot.value));
        }

        grid.append(label);
      });

      fieldset.append(legend, grid);
      slotGroups.append(fieldset);
    });

    if (!slotCount) {
      const message = doc.createElement('p');
      message.className = 'slot-empty';
      message.textContent = 'Aucun créneau indicatif ne correspond à cette durée. Choisissez un autre jour.';
      slotGroups.append(message);
    } else if (!availableCount) {
      const message = doc.createElement('p');
      message.className = 'slot-empty';
      message.textContent = 'Plus aucun créneau libre à cette date. Choisissez un autre jour.';
      slotGroups.append(message);
    }
  }

  function setError(id, visible) {
    const error = $(`#${id}`, form);
    if (error) error.hidden = !visible;
  }

  function setCurrentStep(index) {
    if (state.transitioning || index < 0 || index >= panels.length) return;
    const successWasActive = state.currentStep === 4;
    if (index === state.currentStep && !successWasActive) return;

    const previousIndex = state.currentStep;
    const previous = successWasActive ? null : panels[previousIndex];
    const next = panels[index];
    state.transitioning = true;
    updateStepNav();

    if (successWasActive) {
      successPanel.hidden = true;
      successPanel.inert = true;
    }
    if (previous) {
      previous.inert = true;
      previous.setAttribute('aria-hidden', 'true');
      previous.classList.add('is-leaving');
    }

    const wait = reduceMotion ? 120 : 230;
    window.setTimeout(() => {
      if (previous) {
        previous.hidden = true;
        previous.classList.remove('is-leaving');
      }
      next.hidden = false;
      next.inert = false;
      next.removeAttribute('aria-hidden');
      next.classList.add('is-entering');
      state.currentStep = index;
      state.maxVisited = Math.max(state.maxVisited, index);
      state.transitioning = false;
      updateStepNav();
      updateSummary();
      announce(`Étape ${index + 1} sur 4. ${$('h3', next).textContent}`);
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('is-entering')));
      window.setTimeout(() => $('h3', next).focus({ preventScroll: true }), 30);
    }, wait);
  }

  function showBookingSuccess() {
    panels[state.currentStep].hidden = true;
    panels[state.currentStep].inert = true;
    panels[state.currentStep].setAttribute('aria-hidden', 'true');
    successPanel.hidden = false;
    successPanel.inert = false;
    state.currentStep = 4;
    updateStepNav();

    const service = serviceFor();
    const name = $('#customer-name').value.trim();
    const result = `${name}, votre choix : ${service.label}, le ${fullDayLabel(state.date).toLocaleLowerCase('fr-FR')} à ${timeLabel(state.time)}. Tarif ${priceLabel(service).toLocaleLowerCase('fr-FR')}.`;
    $('[data-success-summary]').textContent = result;
    updateSummary();
    announce('Démonstration terminée. Aucun rendez-vous n’a été envoyé.');
    window.setTimeout(() => $('#success-title').focus({ preventScroll: true }), 30);
  }

  function phoneIsValid(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0033')) digits = `0${digits.slice(4)}`;
    else if (digits.startsWith('33') && digits.length === 11) digits = `0${digits.slice(2)}`;
    return /^0[67]\d{8}$/.test(digits);
  }

  function validateContact() {
    const name = $('#customer-name');
    const phone = $('#customer-phone');
    const nameInvalid = !name.value.trim();
    const phoneInvalid = !phoneIsValid(phone.value);
    name.setAttribute('aria-invalid', nameInvalid ? 'true' : 'false');
    phone.setAttribute('aria-invalid', phoneInvalid ? 'true' : 'false');
    setError('name-error', nameInvalid);
    setError('phone-error', phoneInvalid);
    setError('details-error', nameInvalid || phoneInvalid);
    if (nameInvalid) name.focus();
    else if (phoneInvalid) phone.focus();
    return !nameInvalid && !phoneInvalid;
  }

  function updateDetailsError() {
    const nameInvalid = !$('#customer-name').value.trim();
    const phoneInvalid = !phoneIsValid($('#customer-phone').value);
    setError('details-error', nameInvalid || phoneInvalid);
  }

  function continueFromStep() {
    const index = state.currentStep;
    if (index === 0) {
      const selected = $('input[name="service"]:checked', form);
      setError('service-error', !selected);
      if (!selected) {
        announce('Choisissez une prestation pour continuer.');
        $('input[name="service"]', form).focus();
        return;
      }
      state.service = selected.value;
      state.time = null;
      updateSummary();
      renderDays();
    }
    if (index === 1) {
      setError('day-error', !state.date);
      if (!state.date) {
        announce('Choisissez un jour ouvert pour continuer.');
        return;
      }
      renderSlots();
    }
    if (index === 2) {
      const selected = $('input[name="slot"]:checked', form);
      state.time = selected ? selected.value : null;
      setError('slot-error', !state.time);
      if (!state.time) {
        announce('Choisissez un créneau disponible pour continuer.');
        const firstAvailable = $('input[name="slot"]:not(:disabled)', form);
        if (firstAvailable) firstAvailable.focus();
        return;
      }
      updateSummary();
    }
    if (index < panels.length - 1) setCurrentStep(index + 1);
  }

  panels.forEach((panel, index) => {
    panel.inert = index !== 0;
    if (index !== 0) panel.setAttribute('aria-hidden', 'true');
  });

  renderDays();
  updateSummary();
  updateStepNav();

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'service') {
      state.service = target.value;
      state.time = null;
      setError('service-error', false);
      if (state.date) renderSlots();
      else slotGroups.replaceChildren();
      updateSummary();
      announce(`${serviceFor().shortLabel} sélectionnée. ${priceLabel().toLocaleLowerCase('fr-FR')}.`);
    }

    if (target.name === 'slot') {
      state.time = target.value;
      setError('slot-error', false);
      updateSummary();
      announce(`${timeLabel(state.time)} sélectionnée.`);
    }
  });

  dayStrip.addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (!button || button.disabled) return;
    state.date = button.dataset.date;
    state.time = null;
    $$('.day-button', dayStrip).forEach((day) => day.setAttribute('aria-pressed', day === button ? 'true' : 'false'));
    setError('day-error', false);
    if (state.service) renderSlots();
    updateSummary();
    announce(`${fullDayLabel(state.date)} sélectionné.`);
  });

  $$('[data-next]', form).forEach((button) => button.addEventListener('click', continueFromStep));
  $$('[data-back]', form).forEach((button) => button.addEventListener('click', () => setCurrentStep(state.currentStep - 1)));

  stepNav.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.stepNav);
      if (index > state.maxVisited) return;
      setCurrentStep(index);
    });
  });

  $$('[data-edit-step]', form).forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.editStep);
      if (index > state.maxVisited) return;
      setCurrentStep(index);
    });
  });

  $('#customer-name').addEventListener('blur', (event) => {
    const invalid = !event.target.value.trim();
    event.target.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    setError('name-error', invalid);
    updateDetailsError();
  });
  $('#customer-phone').addEventListener('blur', (event) => {
    const invalid = !phoneIsValid(event.target.value);
    event.target.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    setError('phone-error', invalid);
    updateDetailsError();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.currentStep !== 3 || !validateContact()) {
      if (state.currentStep === 3) announce('Vérifiez les champs signalés avant de continuer.');
      return;
    }
    showBookingSuccess();
  });

  const mobileBar = $('.mobile-bar');
  if (mobileBar && 'IntersectionObserver' in window) {
    mobileBar.setAttribute('aria-hidden', 'true');
    mobileBar.querySelectorAll('a').forEach((link) => { link.tabIndex = -1; });
    root.classList.add('bar-controlled');
    const hero = $('.hero');
    const booking = $('#reservation');
    const footer = $('.site-footer');
    const visible = { hero: true, booking: false, footer: false };
    const updateBar = () => {
      const show = !visible.hero && !visible.booking && !visible.footer;
      mobileBar.classList.toggle('is-visible', show);
      mobileBar.setAttribute('aria-hidden', show ? 'false' : 'true');
      mobileBar.querySelectorAll('a').forEach((link) => { link.tabIndex = show ? 0 : -1; });
    };

    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) visible.hero = entry.isIntersecting;
        if (entry.target === booking) visible.booking = entry.isIntersecting;
        if (entry.target === footer) visible.footer = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.04 });

    barObserver.observe(hero);
    barObserver.observe(booking);
    barObserver.observe(footer);
  }
})();
