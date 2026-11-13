(() => {
  const services = {
    full: { label: 'Full balayage', duration: 240, durationText: '4 h' },
    soleil: { label: 'Effet Soleil', duration: 190, durationText: '3 h 10' },
    ombre: { label: 'Ombré ou painting balayage', duration: 210, durationText: '3 h 30' },
    bronde: { label: 'Bronde', duration: 240, durationText: '4 h' },
    contouring: { label: 'Contouring', duration: 150, durationText: '2 h 30' }
  };

  const hours = {
    0: null,
    1: null,
    2: { open: 10 * 60, close: 19 * 60 },
    3: { open: 10 * 60, close: 19 * 60 },
    4: { open: 10 * 60, close: 19 * 60 },
    5: { open: 10 * 60, close: 19 * 60 },
    6: { open: 8 * 60, close: 16 * 60 + 30 }
  };

  const panels = [...document.querySelectorAll('[data-step-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step-link]')];
  const live = document.getElementById('booking-live');
  const dayOptions = document.getElementById('day-options');
  const timeOptions = document.getElementById('time-options');
  const dateLine = document.getElementById('selected-day');
  const summaryService = document.getElementById('recap-service');
  const summaryDay = document.getElementById('recap-day');
  const summaryTime = document.getElementById('recap-time');
  const finalRecap = document.getElementById('final-recap');
  const successRecap = document.getElementById('success-recap');
  const stepNav = document.querySelector('.step-nav');
  const actionbar = document.querySelector('.mobile-actionbar');
  const coverActions = document.querySelector('.cover__actions');
  const footerContact = document.querySelector('.footer-contact');

  let chosenService = '';
  let chosenDate = '';
  let chosenTime = '';
  let currentStep = 1;
  let furthestStep = 1;
  let transitionTimer = 0;
  let transitionNumber = 0;
  let hasSucceeded = false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const todayAtMidnight = new Date();
  todayAtMidnight.setHours(0, 0, 0, 0);

  function localIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function fullFrenchDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(date);
  }

  function shortFrenchDate(date) {
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
    const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date);
    return { weekday, day };
  }

  function getService() {
    return services[chosenService] || null;
  }

  function updateSummary() {
    const service = getService();
    const date = chosenDate ? new Date(`${chosenDate}T12:00:00`) : null;
    summaryService.textContent = service ? `${service.label} · ${service.durationText}` : 'À choisir';
    summaryDay.textContent = date ? fullFrenchDate(date) : 'À choisir';
    summaryTime.textContent = chosenTime || 'À choisir';
    finalRecap.textContent = service && date && chosenTime
      ? `${service.label} · ${fullFrenchDate(date)} · ${chosenTime}`
      : 'Votre choix apparaîtra ici.';
  }

  function createDayOptions() {
    dayOptions.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(todayAtMidnight);
      date.setDate(date.getDate() + offset);
      const weekday = date.getDay();
      const isClosed = !hours[weekday];
      const compact = shortFrenchDate(date);
      const longDate = fullFrenchDate(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-option';
      button.dataset.date = localIsoDate(date);
      button.disabled = isClosed;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', isClosed ? `${longDate}, fermé` : longDate);

      const weekdayText = document.createElement('span');
      weekdayText.textContent = compact.weekday;
      const dayText = document.createElement('strong');
      dayText.textContent = compact.day;
      const stateText = document.createElement('small');
      stateText.textContent = isClosed ? 'Fermé' : '\u00a0';
      button.append(weekdayText, dayText, stateText);

      if (!isClosed) {
        button.addEventListener('click', () => {
          chosenDate = button.dataset.date;
          chosenTime = '';
          furthestStep = Math.min(furthestStep, 3);
          dayOptions.querySelectorAll('.day-option').forEach((option) => {
            option.setAttribute('aria-pressed', String(option === button));
          });
          document.getElementById('erreur-jour').textContent = '';
          dateLine.textContent = fullFrenchDate(date);
          createTimeOptions();
          updateSummary();
          updateStepButtons();
        });
      }
      dayOptions.append(button);
    }
  }

  function hashText(value) {
    let total = 0;
    for (let index = 0; index < value.length; index += 1) {
      total = (total * 31 + value.charCodeAt(index)) >>> 0;
    }
    return total;
  }

  function formatClock(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function createTimeOptions() {
    timeOptions.replaceChildren();
    const service = getService();
    const date = chosenDate ? new Date(`${chosenDate}T12:00:00`) : null;
    const openForDay = date ? hours[date.getDay()] : null;
    if (!service || !date || !openForDay) return;

    const now = new Date();
    const isToday = chosenDate === localIsoDate(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let count = 0;
    for (let start = openForDay.open; start + service.duration <= openForDay.close; start += 30) {
      const time = formatClock(start);
      const isPast = isToday && start <= currentMinutes;
      const seed = hashText(`${chosenDate}-${chosenService}-${time}`);
      const isSimulatedBusy = seed % 7 === 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-option';
      button.dataset.time = time;
      button.setAttribute('aria-pressed', 'false');

      const timeText = document.createElement('span');
      timeText.textContent = time;
      button.append(timeText);

      if (isPast || isSimulatedBusy) {
        button.disabled = true;
        const state = document.createElement('small');
        state.textContent = isPast ? 'Passé' : 'Déjà pris · simulation';
        button.append(state);
        button.setAttribute('aria-label', isPast ? `${time}, créneau passé` : `${time}, déjà pris pour la simulation`);
      } else {
        button.addEventListener('click', () => {
          chosenTime = time;
          timeOptions.querySelectorAll('.time-option').forEach((option) => {
            option.setAttribute('aria-pressed', String(option === button));
          });
          document.getElementById('erreur-heure').textContent = '';
          updateSummary();
          furthestStep = Math.max(furthestStep, 4);
          updateStepButtons();
        });
      }
      timeOptions.append(button);
      count += 1;
    }

    if (!count) {
      const message = document.createElement('p');
      message.className = 'time-empty';
      message.textContent = 'Aucun créneau ne correspond à la durée de cette prestation ce jour-là.';
      timeOptions.append(message);
    }
  }

  function panelFor(step) {
    return panels.find((panel) => panel.dataset.stepPanel === String(step));
  }

  function updateStepButtons() {
    stepButtons.forEach((button) => {
      const number = Number(button.dataset.stepLink);
      button.disabled = number > furthestStep || hasSucceeded;
      if (number === currentStep && !hasSucceeded) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  }

  function stepMessage(step) {
    const messages = {
      1: 'Choisissez une prestation.',
      2: 'Choisissez un jour où le salon est ouvert.',
      3: 'Choisissez un créneau disponible dans la simulation.',
      4: 'Ajoutez vos coordonnées pour terminer la simulation.'
    };
    return `Étape ${step} sur 4. ${messages[step]}`;
  }

  function setStep(step, options = {}) {
    if (step < 1 || step > 4 || step > furthestStep) return;
    if (step === currentStep) return;
    const animate = options.animate !== false && !reduceMotion.matches;
    const oldPanel = panelFor(currentStep);
    const nextPanel = panelFor(step);
    const successPanel = panelFor('success');
    if (!nextPanel) return;

    window.clearTimeout(transitionTimer);
    transitionNumber += 1;
    const thisTransition = transitionNumber;
    panels.forEach((panel) => panel.classList.remove('is-leaving', 'is-arriving', 'is-active'));
    if (successPanel) {
      successPanel.hidden = true;
      successPanel.inert = true;
      successPanel.setAttribute('aria-hidden', 'true');
    }

    if (oldPanel && oldPanel !== nextPanel) {
      oldPanel.inert = true;
      oldPanel.setAttribute('aria-hidden', 'true');
      oldPanel.hidden = true;
    }

    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.setAttribute('aria-hidden', 'false');
    if (animate) nextPanel.classList.add('is-arriving');
    currentStep = step;
    hasSucceeded = false;
    stepNav.hidden = false;
    live.textContent = stepMessage(step);
    updateStepButtons();
    updateSummary();
    const heading = nextPanel.querySelector('h3');
    if (heading) heading.focus({ preventScroll: true });

    if (animate) {
      window.requestAnimationFrame(() => nextPanel.classList.add('is-active'));
      transitionTimer = window.setTimeout(() => {
        if (thisTransition !== transitionNumber) return;
        nextPanel.classList.remove('is-arriving', 'is-active');
      }, 240);
    }
  }

  function showBookingError(id, message, focusTarget) {
    const error = document.getElementById(id);
    error.textContent = message;
    if (focusTarget) focusTarget.focus();
  }

  function validateStep(step) {
    if (step === 1 && !chosenService) {
      showBookingError('erreur-prestation', 'Choisissez une prestation pour continuer.');
      return false;
    }
    if (step === 2 && !chosenDate) {
      showBookingError('erreur-jour', 'Choisissez un jour où le salon est ouvert.');
      return false;
    }
    if (step === 3 && !chosenTime) {
      showBookingError('erreur-heure', 'Choisissez un horaire disponible dans la simulation.');
      return false;
    }
    return true;
  }

  function normalizedMobile(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('0033')) return `0${digits.slice(4)}`;
    if (digits.startsWith('33')) return `0${digits.slice(2)}`;
    return digits;
  }

  function finishSimulation() {
    const nameInput = document.getElementById('nom');
    const phoneInput = document.getElementById('telephone');
    const nameError = document.getElementById('erreur-nom');
    const phoneError = document.getElementById('erreur-telephone');
    const name = nameInput.value.trim();
    const mobile = normalizedMobile(phoneInput.value);
    nameError.textContent = '';
    phoneError.textContent = '';
    nameInput.removeAttribute('aria-invalid');
    phoneInput.removeAttribute('aria-invalid');

    if (name.length < 2) {
      nameError.textContent = 'Saisissez un prénom de deux lettres au moins.';
      nameInput.setAttribute('aria-invalid', 'true');
      nameInput.focus();
      return;
    }
    if (!/^0[67]\d{8}$/.test(mobile)) {
      phoneError.textContent = 'Saisissez un numéro de mobile français valide.';
      phoneInput.setAttribute('aria-invalid', 'true');
      phoneInput.focus();
      return;
    }

    const service = getService();
    const date = new Date(`${chosenDate}T12:00:00`);
    successRecap.textContent = `${service.label} · ${fullFrenchDate(date)} à ${chosenTime}. Merci, ${name}.`;
    nameInput.value = '';
    phoneInput.value = '';
    const active = panelFor(currentStep);
    const success = panelFor('success');
    active.hidden = true;
    active.inert = true;
    active.setAttribute('aria-hidden', 'true');
    success.hidden = false;
    success.inert = false;
    success.setAttribute('aria-hidden', 'false');
    currentStep = 4;
    hasSucceeded = true;
    stepNav.hidden = true;
    live.textContent = 'La simulation est terminée. Rien n’a été envoyé et aucun rendez-vous n’est réservé.';
    updateStepButtons();
    success.querySelector('h3').focus({ preventScroll: true });
  }

  function resetBooking() {
    chosenService = '';
    chosenDate = '';
    chosenTime = '';
    furthestStep = 1;
    hasSucceeded = false;
    document.querySelectorAll('input[name="prestation"]').forEach((input) => { input.checked = false; });
    document.getElementById('nom').value = '';
    document.getElementById('telephone').value = '';
    document.getElementById('erreur-prestation').textContent = '';
    document.getElementById('erreur-jour').textContent = '';
    document.getElementById('erreur-heure').textContent = '';
    document.getElementById('erreur-nom').textContent = '';
    document.getElementById('erreur-telephone').textContent = '';
    document.getElementById('nom').removeAttribute('aria-invalid');
    document.getElementById('telephone').removeAttribute('aria-invalid');
    dayOptions.querySelectorAll('.day-option').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    dateLine.textContent = '';
    createTimeOptions();
    updateSummary();
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.stepPanel !== '1';
      panel.inert = panel.hidden;
      panel.setAttribute('aria-hidden', String(panel.hidden));
      panel.classList.remove('is-leaving', 'is-arriving', 'is-active');
    });
    currentStep = 1;
    stepNav.hidden = false;
    live.textContent = stepMessage(1);
    updateStepButtons();
    panelFor(1).querySelector('h3').focus({ preventScroll: true });
  }

  document.querySelectorAll('input[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      chosenService = input.value;
      chosenDate = '';
      chosenTime = '';
      furthestStep = 1;
      document.getElementById('erreur-prestation').textContent = '';
      dayOptions.querySelectorAll('.day-option').forEach((button) => button.setAttribute('aria-pressed', 'false'));
      dateLine.textContent = '';
      createTimeOptions();
      updateSummary();
      updateStepButtons();
    });
  });

  document.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (!validateStep(currentStep)) return;
      const next = Number(button.dataset.nextStep);
      furthestStep = Math.max(furthestStep, next);
      setStep(next, { animate: event.detail > 0 });
    });
  });

  document.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', (event) => {
      setStep(Number(button.dataset.previousStep), { animate: event.detail > 0 });
    });
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const targetStep = Number(button.dataset.stepLink);
      if (targetStep <= furthestStep) setStep(targetStep, { animate: event.detail > 0 });
    });
  });

  document.querySelectorAll('[data-book-service]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const serviceId = button.dataset.bookService;
      const radio = document.querySelector(`input[name="prestation"][value="${serviceId}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      furthestStep = 2;
      const animate = event.detail > 0 && !reduceMotion.matches;
      setStep(2, { animate });
      document.getElementById('reservation').scrollIntoView({ block: 'start', behavior: animate ? 'smooth' : 'auto' });
    });
  });

  document.getElementById('finish-booking').addEventListener('click', finishSimulation);
  document.getElementById('restart-booking').addEventListener('click', resetBooking);

  createDayOptions();
  updateSummary();
  panels.forEach((panel) => {
    const isInitial = panel.dataset.stepPanel === '1';
    panel.hidden = !isInitial;
    panel.inert = !isInitial;
    panel.setAttribute('aria-hidden', String(!isInitial));
  });
  updateStepButtons();

  requestAnimationFrame(() => document.querySelector('.cover').classList.add('is-ready'));
  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  }

  if (actionbar && coverActions && footerContact && 'IntersectionObserver' in window) {
    let coverHasPassed = false;
    let footerIsVisible = false;
    const updateActionbar = () => {
      const show = coverHasPassed && !footerIsVisible && window.matchMedia('(max-width: 680px)').matches;
      actionbar.classList.toggle('is-visible', show);
      actionbar.inert = !show;
      actionbar.setAttribute('aria-hidden', String(!show));
    };
    const coverObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) coverHasPassed = false;
        else if (entry.boundingClientRect.bottom < 0) coverHasPassed = true;
        else if (entry.boundingClientRect.top > window.innerHeight) coverHasPassed = false;
        updateActionbar();
      });
    }, { threshold: 0 });
    const footerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        footerIsVisible = entry.isIntersecting;
        updateActionbar();
      });
    }, { threshold: 0 });
    coverObserver.observe(coverActions);
    footerObserver.observe(footerContact);
    window.addEventListener('resize', updateActionbar, { passive: true });
  } else if (actionbar) {
    actionbar.hidden = true;
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const focusedPanel = document.activeElement && document.activeElement.closest('[data-step-panel]');
    if (focusedPanel && currentStep > 1 && !hasSucceeded) setStep(currentStep - 1, { animate: false });
  });
})();
