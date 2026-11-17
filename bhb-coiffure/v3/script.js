(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const progressFill = document.querySelector('.edge-progress-fill');

  requestAnimationFrame(() => body.classList.add('page-ready'));

  if (navToggle && mainNav) {
    const mobileNavigation = window.matchMedia('(max-width: 760px)');

    const closeNavigation = (returnFocus) => {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Ouvrir la navigation');
      mainNav.classList.remove('is-open');
      mainNav.inert = true;
      if (returnFocus) navToggle.focus();
    };

    const syncNavigation = () => {
      if (mobileNavigation.matches) {
        closeNavigation(false);
      } else {
        mainNav.inert = false;
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    };

    syncNavigation();
    mobileNavigation.addEventListener('change', syncNavigation);
    navToggle.addEventListener('click', () => {
      const opening = navToggle.getAttribute('aria-expanded') !== 'true';
      navToggle.setAttribute('aria-expanded', String(opening));
      navToggle.setAttribute('aria-label', opening ? 'Fermer la navigation' : 'Ouvrir la navigation');
      mainNav.inert = !opening;
      mainNav.classList.toggle('is-open', opening);
      if (opening) mainNav.querySelector('a')?.focus();
    });
    mainNav.addEventListener('click', (event) => {
      if (event.target.closest('a') && mobileNavigation.matches) closeNavigation(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') closeNavigation(true);
    });
  }

  if (progressFill && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const amount = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressFill.style.transform = 'scaleY(' + amount + ')';
    };
    window.addEventListener('scroll', () => {
      if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  if ('IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('[data-reveal]');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((target, index) => {
      target.style.transitionDelay = Math.min(index % 3, 2) * 65 + 'ms';
      revealObserver.observe(target);
    });

    const rows = document.querySelectorAll('.service-table tbody tr');
    const rowObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('row-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    rows.forEach((row, index) => {
      row.style.setProperty('--row-delay', Math.min(index, 4) * 55 + 'ms');
      rowObserver.observe(row);
    });
  } else {
    document.querySelectorAll('[data-reveal], .service-table tbody tr').forEach((target) => target.classList.add('is-visible', 'row-visible'));
  }

  const bookingForm = document.querySelector('#booking-form');
  if (!bookingForm) return;

  const hours = {
    0: null,
    1: null,
    2: { ouverture: 9, fermeture: 18 },
    3: { ouverture: 9, fermeture: 18 },
    4: { ouverture: 9, fermeture: 18 },
    5: { ouverture: 9, fermeture: 19 },
    6: { ouverture: 8, fermeture: 17 }
  };
  const panels = Array.from(document.querySelectorAll('[data-flow-step]'));
  const tabs = Array.from(document.querySelectorAll('[data-go-step]'));
  const dayOptions = document.querySelector('#day-options');
  const timeOptions = document.querySelector('#time-options');
  const bookingLive = document.querySelector('#booking-live');
  const successPanel = document.querySelector('#booking-success');
  const successSummary = document.querySelector('#success-summary');
  const recapInline = document.querySelector('#recap-inline');
  const summaryService = document.querySelector('#summary-service');
  const summaryLength = document.querySelector('#summary-length');
  const summaryDay = document.querySelector('#summary-day');
  const summaryTime = document.querySelector('#summary-time');
  const firstNameInput = document.querySelector('#prenom');
  const phoneInput = document.querySelector('#telephone');
  let activeStep = 0;
  let selectedDay = null;
  let selectedTime = null;
  let transitionTimer = 0;

  const parisDateParts = (date) => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = {};
    parts.forEach((part) => { values[part.type] = part.value; });
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
  };

  const keyFromUtcDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  };

  const dateFromKey = (key) => new Date(key + 'T12:00:00Z');

  const formatDate = (date, options) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', ...options
  }).format(date);

  const currentParisTime = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = {};
    parts.forEach((part) => { values[part.type] = part.value; });
    return { hour: Number(values.hour), minute: Number(values.minute) };
  };

  const selectedService = () => {
    const choice = bookingForm.querySelector('input[name="prestation"]:checked');
    return choice ? choice.value : '';
  };

  const selectedLength = () => {
    const choice = bookingForm.querySelector('input[name="longueur"]:checked');
    return choice ? choice.value : '';
  };

  const announce = (message) => {
    bookingLive.textContent = '';
    window.setTimeout(() => { bookingLive.textContent = message; }, 20);
  };

  const updateSummary = () => {
    summaryLength.textContent = selectedLength() || 'À choisir';
    summaryService.textContent = selectedService() || 'À choisir';
    summaryDay.textContent = selectedDay ? formatDate(dateFromKey(selectedDay), { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    summaryTime.textContent = selectedTime ? selectedTime : 'À choisir';
    if (selectedLength() && selectedService() && selectedDay && selectedTime) {
      recapInline.textContent = 'Votre sélection : ' + selectedLength() + ' · ' + selectedService() + ' · ' + summaryDay.textContent + ' à ' + selectedTime + '. Aucune demande n’est transmise.';
    } else {
      recapInline.textContent = '';
    }
  };

  const syncStepTabs = () => {
    tabs.forEach((tab, index) => {
      tab.disabled = index > activeStep;
      if (index === activeStep) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    });
  };

  const showStep = (index, moveFocus) => {
    if (index < 0 || index >= panels.length || index > activeStep + 1) return;
    const oldPanel = panels[activeStep];
    const nextPanel = panels[index];
    if (oldPanel === nextPanel) return;
    window.clearTimeout(transitionTimer);
    oldPanel.classList.remove('is-entering', 'is-leaving');
    oldPanel.classList.add('is-leaving');
    nextPanel.hidden = false;
    nextPanel.classList.remove('is-leaving');
    nextPanel.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => nextPanel.classList.remove('is-entering')));
    transitionTimer = window.setTimeout(() => {
      if (oldPanel !== panels[activeStep]) oldPanel.hidden = true;
      oldPanel.classList.remove('is-leaving');
    }, 230);
    activeStep = index;
    syncStepTabs();
    updateSummary();
    announce('Étape ' + String(index + 1) + ' sur 5 : ' + nextPanel.querySelector('h3').textContent.replace(/^0[1-5] · /, ''));
    if (moveFocus) nextPanel.querySelector('h3').focus();
  };

  const clearError = (id) => {
    const error = document.getElementById(id);
    if (error) error.textContent = '';
  };

  const setError = (id, message, focusTarget) => {
    const error = document.getElementById(id);
    if (error) error.textContent = message;
    if (focusTarget) focusTarget.focus();
  };

  const renderDays = () => {
    const parisToday = parisDateParts(new Date());
    const today = new Date(Date.UTC(parisToday.year, parisToday.month - 1, parisToday.day, 12));
    const todayKey = keyFromUtcDate(today);
    const days = [];

    for (let index = 0; index < 14; index += 1) {
      const date = new Date(Date.UTC(parisToday.year, parisToday.month - 1, parisToday.day + index, 12));
      const key = keyFromUtcDate(date);
      const weekday = date.getUTCDay();
      const open = hours[weekday] !== null;
      const dayLabel = formatDate(date, { weekday: 'short' }).replace('.', '');
      const dayNumber = formatDate(date, { day: 'numeric' });
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-choice';
      button.dataset.dayKey = key;
      button.disabled = !open;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', dayLabel + ' ' + dayNumber + (open ? ', choisir ce jour' : ', fermé'));
      const number = document.createElement('strong');
      number.textContent = dayNumber;
      const weekdayName = document.createElement('span');
      weekdayName.textContent = dayLabel;
      const state = document.createElement('small');
      state.textContent = open ? (key === todayKey ? 'aujourd’hui' : 'choisir') : 'fermé';
      button.append(number, weekdayName, state);
      if (open) {
        button.addEventListener('click', () => {
          selectedDay = key;
          selectedTime = null;
          dayOptions.querySelectorAll('.day-choice').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          clearError('error-jour');
          renderTimes(todayKey);
          updateSummary();
          announce('Jour sélectionné : ' + formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }));
        });
      }
      days.push(button);
    }
    dayOptions.replaceChildren(...days);
  };

  const timeIsTaken = (dayKey, hour, minute) => {
    const seed = dayKey.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
    return (seed + hour * 17 + minute * 31) % 7 === 0;
  };

  const renderTimes = (todayKey) => {
    if (!selectedDay) return;
    const date = dateFromKey(selectedDay);
    const hoursForDay = hours[date.getUTCDay()];
    const times = [];
    const now = currentParisTime();
    const isToday = selectedDay === todayKey;

    for (let hour = hoursForDay.ouverture; hour < hoursForDay.fermeture; hour += 1) {
      for (const minute of [0, 30]) {
        if (isToday && (hour < now.hour || (hour === now.hour && minute <= now.minute))) continue;
        const button = document.createElement('button');
        const time = String(hour).padStart(2, '0') + ' h ' + String(minute).padStart(2, '0');
        const unavailable = timeIsTaken(selectedDay, hour, minute);
        button.type = 'button';
        button.className = 'time-choice';
        button.textContent = time;
        button.disabled = unavailable;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', time + (unavailable ? ', déjà pris dans cette simulation' : ', choisir cette heure'));
        if (unavailable) button.title = 'Déjà pris dans cette simulation';
        if (!unavailable) {
          button.addEventListener('click', () => {
            selectedTime = time;
            timeOptions.querySelectorAll('.time-choice').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            clearError('error-heure');
            updateSummary();
            announce('Heure sélectionnée : ' + time);
          });
        }
        times.push(button);
      }
    }

    if (!times.some((button) => !button.disabled)) {
      const empty = document.createElement('p');
      empty.className = 'time-empty';
      empty.textContent = 'Aucun créneau d’exemple ne reste pour ce jour. Choisissez une autre date.';
      timeOptions.replaceChildren(empty);
    } else {
      timeOptions.replaceChildren(...times);
    }
  };

  const validateStep = (step) => {
    if (step === 0 && !selectedLength()) {
      setError('error-longueur', 'Choisissez une longueur pour continuer.', bookingForm.querySelector('input[name="longueur"]'));
      return false;
    }
    if (step === 1 && !selectedService()) {
      setError('error-prestation', 'Choisissez un forfait pour continuer.', bookingForm.querySelector('input[name="prestation"]'));
      return false;
    }
    if (step === 2 && !selectedDay) {
      setError('error-jour', 'Choisissez un jour ouvert pour continuer.', dayOptions.querySelector('button:not(:disabled)'));
      return false;
    }
    if (step === 3 && !selectedTime) {
      setError('error-heure', 'Choisissez une heure disponible dans cette simulation.', timeOptions.querySelector('button:not(:disabled)'));
      return false;
    }
    return true;
  };

  const validateContact = () => {
    const firstName = firstNameInput.value.trim();
    const compactPhone = phoneInput.value.replace(/[^\d+]/g, '');
    let valid = true;
    firstNameInput.removeAttribute('aria-invalid');
    phoneInput.removeAttribute('aria-invalid');
    clearError('error-prenom');
    clearError('error-telephone');

    if (!firstName) {
      firstNameInput.setAttribute('aria-invalid', 'true');
      setError('error-prenom', 'Saisissez votre prénom.', firstNameInput);
      valid = false;
    }
    if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compactPhone)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      if (valid) phoneInput.focus();
      document.querySelector('#error-telephone').textContent = 'Saisissez un numéro mobile français commençant par 06 ou 07.';
      valid = false;
    }
    return valid;
  };

  bookingForm.querySelectorAll('input[name="longueur"]').forEach((input) => {
    input.addEventListener('change', () => {
      clearError('error-longueur');
      const appointmentWasChosen = Boolean(selectedDay || selectedTime);
      if (appointmentWasChosen) clearAppointmentSelection();
      updateSummary();
      announce(appointmentWasChosen ? 'Longueur sélectionnée : ' + input.value + '. Le jour et l’heure ont été réinitialisés.' : 'Longueur sélectionnée : ' + input.value + '.');
    });
  });

  const clearAppointmentSelection = () => {
    selectedDay = null;
    selectedTime = null;
    dayOptions.querySelectorAll('.day-choice').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    timeOptions.replaceChildren(Object.assign(document.createElement('p'), { className: 'time-empty', textContent: 'Choisissez d’abord un jour.' }));
    clearError('error-jour');
    clearError('error-heure');
  };

  bookingForm.querySelectorAll('input[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      clearError('error-prestation');
      clearAppointmentSelection();
      updateSummary();
      announce('Forfait sélectionné : ' + input.value + '. Le jour et l’heure ont été réinitialisés.');
    });
  });

  document.querySelectorAll('[data-select-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const value = link.dataset.selectService;
      const radio = Array.from(bookingForm.querySelectorAll('input[name="prestation"]')).find((input) => input.value === value);
      if (!radio) return;
      radio.checked = true;
      clearAppointmentSelection();
      clearError('error-prestation');
      updateSummary();
      const destination = selectedLength() ? 1 : 0;
      showStep(destination, true);
      announce('Forfait choisi dans le menu. Confirmez d’abord la longueur.');
    });
  });

  bookingForm.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(activeStep)) return;
      showStep(Number(button.dataset.nextStep), true);
    });
  });

  bookingForm.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.previousStep), true));
  });

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const destination = Number(tab.dataset.goStep);
      if (destination < activeStep) showStep(destination, true);
    });
  });

  const finishBooking = () => {
    if (!validateContact()) return;
    const dayLabel = formatDate(dateFromKey(selectedDay), { weekday: 'long', day: 'numeric', month: 'long' });
    successSummary.textContent = selectedLength() + ' · ' + selectedService() + ' · ' + dayLabel + ' à ' + selectedTime + ' · ' + firstNameInput.value.trim() + ' · ' + phoneInput.value.trim() + '.';
    panels.forEach((panel) => { panel.hidden = true; panel.classList.remove('is-entering', 'is-leaving'); });
    document.querySelector('.step-nav').hidden = true;
    successPanel.hidden = false;
    successPanel.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => successPanel.classList.remove('is-entering')));
    announce('Récapitulatif de démonstration affiché. Rien n’a été envoyé.');
    successPanel.querySelector('h3').focus();
  };

  document.querySelector('#show-booking-summary').addEventListener('click', finishBooking);

  document.querySelector('#restart-booking').addEventListener('click', () => {
    bookingForm.querySelectorAll('input').forEach((input) => {
      if (input.type === 'radio') input.checked = false;
      else input.value = '';
    });
    selectedDay = null;
    selectedTime = null;
    activeStep = 0;
    document.querySelector('.step-nav').hidden = false;
    successPanel.hidden = true;
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0;
      panel.classList.remove('is-entering', 'is-leaving');
    });
    clearError('error-prestation');
    clearError('error-longueur');
    clearError('error-jour');
    clearError('error-heure');
    clearError('error-prenom');
    clearError('error-telephone');
    firstNameInput.removeAttribute('aria-invalid');
    phoneInput.removeAttribute('aria-invalid');
    dayOptions.querySelectorAll('.day-choice').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    timeOptions.replaceChildren(Object.assign(document.createElement('p'), { className: 'time-empty', textContent: 'Choisissez d’abord un jour.' }));
    recapInline.textContent = '';
    updateSummary();
    syncStepTabs();
    document.querySelector('#step-title-0').focus();
    announce('La simulation a été réinitialisée.');
  });

  renderDays();
  panels.forEach((panel, index) => { panel.hidden = index !== 0; });
  syncStepTabs();
  updateSummary();
})();
