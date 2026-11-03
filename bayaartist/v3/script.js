(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');

  if (menuButton && navigation) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
      navigation.dataset.open = 'false';
      if (returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Fermer la navigation' : 'Ouvrir la navigation');
      navigation.dataset.open = String(opening);
      if (opening) navigation.querySelector('a')?.focus();
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  const progressLine = document.querySelector('#progress-line');
  let progressFrame = 0;
  const updateProgress = () => {
    if (!progressLine || progressFrame) return;
    progressFrame = window.requestAnimationFrame(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const amount = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressLine.style.transform = `scaleY(${amount})`;
      progressFrame = 0;
    });
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });

    revealItems.forEach((item, index) => {
      const siblingIndex = item.parentElement ? [...item.parentElement.querySelectorAll('[data-reveal]')].indexOf(item) : 0;
      item.style.transitionDelay = `${Math.min(siblingIndex, 5) * 55}ms`;
      item.classList.add('reveal-pending');
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('reveal-visible'));
  }

  const mobileBookbar = document.querySelector('.mobile-bookbar');
  const bookingSection = document.querySelector('#reservation');
  const footer = document.querySelector('.site-footer');
  if (mobileBookbar && 'IntersectionObserver' in window) {
    const watchedSections = new Set();
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) watchedSections.add(entry.target);
        else watchedSections.delete(entry.target);
      });
      const hidden = watchedSections.size > 0;
      mobileBookbar.dataset.visible = String(!hidden);
      mobileBookbar.setAttribute('aria-hidden', String(hidden));
      mobileBookbar.inert = hidden;
    }, { threshold: 0.08, rootMargin: '0px 0px -18% 0px' });
    if (bookingSection) barObserver.observe(bookingSection);
    if (footer) barObserver.observe(footer);
  }

  const form = document.querySelector('#booking-form');
  if (!form) return;

  const panels = [...form.querySelectorAll('[data-flow-step]')];
  const progressButtons = [...form.querySelectorAll('[data-step-jump]')];
  const panelTimers = new WeakMap();
  const dayList = document.querySelector('#day-list');
  const slotList = document.querySelector('#slot-list');
  const chosenDay = document.querySelector('#selection-day');
  const chosenTime = document.querySelector('#selection-time');
  const selectionService = document.querySelector('#selection-service');
  const selectionDuration = document.querySelector('#selection-duration');
  const serviceInputs = [...form.querySelectorAll('input[name="prestation"]')];
  const dayError = document.querySelector('#jour-erreur');
  const timeError = document.querySelector('#heure-erreur');
  const nameInput = document.querySelector('#prenom');
  const phoneInput = document.querySelector('#telephone');
  const nameError = document.querySelector('#prenom-erreur');
  const phoneError = document.querySelector('#telephone-erreur');
  const confirmationButton = document.querySelector('#confirm-booking');
  const successSummary = document.querySelector('#success-summary');
  const locale = 'fr-FR';
  const dateLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekdayLabel = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  let currentStep = 1;
  let furthestStep = 1;
  let selectedDate = null;
  let selectedTime = null;
  let selectedDayButton = null;
  let selectedSlotButton = null;

  panels.forEach((panel) => {
    const inactive = panel.dataset.flowStep !== '1';
    panel.setAttribute('aria-hidden', String(inactive));
    panel.dataset.inactive = String(inactive);
  });

  let serviceName = serviceInputs.find((input) => input.checked)?.dataset.nom || 'BayaArtist Signature';
  let serviceDuration = Number(serviceInputs.find((input) => input.checked)?.dataset.duree || 75);

  const durationLabel = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${minutes}\u00a0min`;
    return remainder ? `${hours}\u00a0h\u00a0${String(remainder).padStart(2, '0')}` : `${hours}\u00a0h`;
  };

  const showStep = (step, moveFocus = true) => {
    const nextPanel = panels.find((panel) => panel.dataset.flowStep === String(step));
    if (!nextPanel) return;

    const currentPanel = panels.find((panel) => panel.dataset.flowStep === String(currentStep));
    if (currentPanel && currentPanel !== nextPanel) {
      const priorTimer = panelTimers.get(currentPanel);
      if (priorTimer) window.clearTimeout(priorTimer);
      currentPanel.classList.add('is-leaving');
      const timer = window.setTimeout(() => {
        if (currentPanel !== nextPanel) {
          currentPanel.setAttribute('aria-hidden', 'true');
          currentPanel.dataset.inactive = 'true';
        }
        currentPanel.classList.remove('is-leaving');
      }, 220);
      panelTimers.set(currentPanel, timer);
    }

    const priorNextTimer = panelTimers.get(nextPanel);
    if (priorNextTimer) window.clearTimeout(priorNextTimer);
    nextPanel.setAttribute('aria-hidden', 'false');
    nextPanel.dataset.inactive = 'false';
    nextPanel.classList.add('is-entering');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => nextPanel.classList.remove('is-entering'));
    });
    currentStep = step === 'success' ? 'success' : Number(step);

    progressButtons.forEach((button) => {
      const buttonStep = Number(button.dataset.stepJump);
      if (buttonStep === Number(step)) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = buttonStep > furthestStep || step === 'success';
    });

    if (moveFocus) nextPanel.querySelector('h3')?.focus();
  };

  const updateSelection = () => {
    selectionService.textContent = serviceName;
    selectionDuration.textContent = durationLabel(serviceDuration);
    chosenDay.textContent = selectedDate ? dateLabel.format(selectedDate) : 'À choisir';
    chosenTime.textContent = selectedTime || 'À choisir';
  };

  const getDayHours = (date) => {
    const weekday = date.getDay();
    if (weekday === 0) return null;
    return { start: 10 * 60, end: (weekday === 6 ? 20 : 19) * 60 };
  };

  const isPastTime = (date, minute) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minute / 60), minute % 60);
    return date.getTime() === today.getTime() && start.getTime() <= now.getTime();
  };

  const startTimesFor = (date) => {
    const hours = getDayHours(date);
    if (!hours) return [];
    const starts = [];
    for (let minute = hours.start; minute + serviceDuration <= hours.end; minute += 30) {
      starts.push(minute);
    }
    return starts;
  };

  const isTaken = (date, index) => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const seed = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
    return (index + seed) % 5 === 2;
  };

  const minuteLabel = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}\u00a0h\u00a0${String(minute % 60).padStart(2, '0')}`;

  const renderDays = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dayList.replaceChildren();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + offset);
      const starts = startTimesFor(date);
      const closed = getDayHours(date) === null;
      const noFutureTime = !closed && starts.every((minute) => isPastTime(date, minute));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-choice';
      button.disabled = closed || noFutureTime;
      button.setAttribute('aria-label', `${dateLabel.format(date)}${closed ? ', fermé' : noFutureTime ? ', aucun créneau restant' : ''}`);
      button.setAttribute('aria-pressed', 'false');

      const weekday = document.createElement('span');
      weekday.className = 'day-choice__weekday';
      const rawWeekday = weekdayLabel.format(date).replace('.', '');
      weekday.textContent = rawWeekday.charAt(0).toLocaleUpperCase(locale) + rawWeekday.slice(1);
      const dayNumber = document.createElement('span');
      dayNumber.className = 'day-choice__date';
      dayNumber.textContent = shortDateLabel.format(date);
      button.append(weekday, dayNumber);

      if (closed || noFutureTime) {
        const state = document.createElement('span');
        state.className = 'day-choice__closed';
        state.textContent = closed ? 'Fermé' : 'Plus de créneau';
        button.append(state);
      }

      button.addEventListener('click', () => {
        selectedDate = date;
        selectedTime = null;
        furthestStep = Math.min(furthestStep, 2);
        selectedSlotButton = null;
        if (selectedDayButton) selectedDayButton.setAttribute('aria-pressed', 'false');
        selectedDayButton = button;
        button.setAttribute('aria-pressed', 'true');
        dayError.hidden = true;
        renderSlots();
        updateSelection();
        progressButtons.forEach((progressButton) => {
          progressButton.disabled = Number(progressButton.dataset.stepJump) > furthestStep;
        });
      });
      dayList.append(button);
    }
  };

  const renderSlots = () => {
    slotList.replaceChildren();
    if (!selectedDate) {
      const message = document.createElement('p');
      message.textContent = 'Choisissez d’abord un jour.';
      slotList.append(message);
      return;
    }

    const starts = startTimesFor(selectedDate);
    if (starts.length === 0) {
      const message = document.createElement('p');
      message.textContent = 'Aucun créneau ne reste dans cette journée de démonstration.';
      slotList.append(message);
      return;
    }

    starts.forEach((minute, index) => {
      const past = isPastTime(selectedDate, minute);
      const taken = !past && isTaken(selectedDate, index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-choice';
      button.textContent = minuteLabel(minute);
      button.disabled = past || taken;
      button.setAttribute('aria-pressed', 'false');
      if (past) button.setAttribute('aria-label', `${minuteLabel(minute)}, heure passée`);
      else if (taken) button.setAttribute('aria-label', `${minuteLabel(minute)}, déjà pris dans cette démonstration`);
      button.addEventListener('click', () => {
        selectedTime = minuteLabel(minute);
        if (selectedSlotButton) selectedSlotButton.setAttribute('aria-pressed', 'false');
        selectedSlotButton = button;
        button.setAttribute('aria-pressed', 'true');
        timeError.hidden = true;
        updateSelection();
      });
      slotList.append(button);
    });
  };

  const selectService = (input) => {
    if (!input) return;
    input.checked = true;
    serviceName = input.dataset.nom;
    serviceDuration = Number(input.dataset.duree);
    selectedDate = null;
    selectedTime = null;
    selectedDayButton = null;
    selectedSlotButton = null;
    furthestStep = 1;
    dayError.hidden = true;
    timeError.hidden = true;
    progressButtons.forEach((button) => {
      button.disabled = Number(button.dataset.stepJump) > furthestStep;
    });
    renderDays();
    renderSlots();
    updateSelection();
    showStep(1, false);
  };

  serviceInputs.forEach((input) => {
    input.addEventListener('change', () => selectService(input));
  });

  document.querySelectorAll('[data-select-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const input = serviceInputs.find((option) => option.value === link.dataset.selectService);
      if (input) selectService(input);
    });
  });

  const clearError = (input, error) => {
    input.removeAttribute('aria-invalid');
    error.hidden = true;
  };

  const validPhone = (value) => {
    const compact = value.trim().replace(/[\s().-]/g, '');
    return /^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(compact);
  };

  document.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = Number(button.dataset.nextStep);
      if (next === 3 && !selectedDate) {
        dayError.hidden = false;
        dayList.querySelector('.day-choice:not(:disabled)')?.focus();
        return;
      }
      if (next === 4 && !selectedTime) {
        timeError.hidden = false;
        slotList.querySelector('.slot-choice:not(:disabled)')?.focus();
        return;
      }
      furthestStep = Math.max(furthestStep, next);
      showStep(next);
    });
  });

  document.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.previousStep)));
  });

  progressButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.stepJump);
      if (step <= furthestStep) showStep(step);
    });
  });

  nameInput.addEventListener('input', () => clearError(nameInput, nameError));
  phoneInput.addEventListener('input', () => clearError(phoneInput, phoneError));

  confirmationButton.addEventListener('click', () => {
    const nameValid = nameInput.value.trim().length >= 2;
    const phoneIsValid = validPhone(phoneInput.value);
    nameError.hidden = nameValid;
    phoneError.hidden = phoneIsValid;
    nameInput.setAttribute('aria-invalid', String(!nameValid));
    phoneInput.setAttribute('aria-invalid', String(!phoneIsValid));

    if (!nameValid) {
      nameInput.focus();
      return;
    }
    if (!phoneIsValid) {
      phoneInput.focus();
      return;
    }
    if (!selectedDate || !selectedTime) {
      showStep(!selectedDate ? 2 : 3);
      return;
    }

    const recap = document.createElement('p');
    recap.textContent = `${serviceName}, le ${dateLabel.format(selectedDate)} à ${selectedTime}. Simulation au nom de ${nameInput.value.trim()}.`;
    successSummary.replaceChildren(recap);
    showStep('success');
  });

  renderDays();
  renderSlots();
  updateSelection();
})();
