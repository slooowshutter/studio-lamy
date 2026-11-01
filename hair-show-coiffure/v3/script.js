(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('[data-reveal]')];

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation-principale');

  if (menuButton && navigation) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Ouvrir le menu de navigation');
      navigation.classList.remove('is-open');
      if (returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Ouvrir le menu de navigation' : 'Fermer le menu de navigation');
      navigation.classList.toggle('is-open', !isOpen);
      if (!isOpen) navigation.querySelector('a')?.focus();
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 680) closeMenu();
    }, { passive: true });
  }

  const form = document.querySelector('#formulaire-rendez-vous');
  if (!form) return;

  const services = {
    'coupe-femme': { name: 'Coupe femme' },
    'coupe-homme': { name: 'Coupe homme' },
    brushing: { name: 'Brushing' },
    coloration: { name: 'Coloration' }
  };

  const state = { service: '', day: '', time: '', step: 0 };
  const steps = [...document.querySelectorAll('.booking-step')];
  const progressItems = [...document.querySelectorAll('.booking-progress li')];
  const progressLine = document.querySelector('.booking-progress__line span');
  const stepAnnouncement = document.querySelector('[data-step-announcement]');
  const dateList = document.querySelector('[data-date-list]');
  const timeList = document.querySelector('[data-time-list]');
  const summaryService = document.querySelector('[data-summary-service]');
  const summaryDate = document.querySelector('[data-summary-date]');
  const summaryTime = document.querySelector('[data-summary-time]');
  const editButtons = [...document.querySelectorAll('[data-edit-step]')];
  const success = document.querySelector('[data-success]');
  const calendarLink = document.querySelector('[data-calendar-link]');
  const mobilePhone = document.querySelector('.mobile-bar a[href^="tel:"]');

  const getService = () => services[state.service];

  const dateFromKey = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const makeDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const updateSummary = () => {
    const service = getService();
    summaryService.textContent = service ? service.name : 'À choisir';
    summaryDate.textContent = state.day
      ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateFromKey(state.day))
      : 'À choisir';
    summaryTime.textContent = state.time ? `${state.time.slice(0, 2)}\u00a0h\u00a0${state.time.slice(2)}` : 'À choisir';
    editButtons.forEach((button) => {
      const target = Number(button.dataset.editStep);
      button.hidden = target === 1 ? !state.day : target === 2 ? !state.time : false;
    });
  };

  const setStep = (nextStep) => {
    const boundedStep = Math.max(0, Math.min(3, nextStep));
    if (boundedStep === state.step && !success.hidden) return;
    const previousStep = state.step;
    const previousPanel = steps[previousStep];
    const nextPanel = steps[boundedStep];

    if (previousPanel && previousStep !== boundedStep) {
      previousPanel.classList.add('is-leaving');
      window.setTimeout(() => {
        previousPanel.hidden = true;
        previousPanel.classList.remove('is-leaving');
      }, reduceMotion ? 180 : 230);
    }

    nextPanel.hidden = false;
    nextPanel.classList.add('is-entering');
    window.requestAnimationFrame(() => nextPanel.classList.remove('is-entering'));
    state.step = boundedStep;
    if (!success.hidden) success.hidden = true;

    progressItems.forEach((item, index) => {
      if (index === boundedStep) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    progressLine.style.transform = `scaleX(${(boundedStep + 1) / 4})`;
    stepAnnouncement.textContent = `Étape ${boundedStep + 1} sur 4\u00a0: ${['choisir une prestation', 'choisir un jour', 'choisir une heure', 'indiquer vos coordonnées'][boundedStep]}.`;
    nextPanel.querySelector('h3')?.focus({ preventScroll: true });
    updateSummary();
  };

  const renderDates = () => {
    dateList.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const dayNumber = date.getDay();
      const isClosed = dayNumber === 0 || dayNumber === 1;
      const key = makeDateKey(date);
      const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
      const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date).replace('.', '');
      const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-choice';
      button.disabled = isClosed;
      button.dataset.date = key;
      button.setAttribute('aria-pressed', String(state.day === key));
      button.setAttribute('aria-label', `${longDate}${isClosed ? ', fermé' : ', horaires à confirmer'}`);

      const weekdayNode = document.createElement('span');
      weekdayNode.className = 'date-choice__day';
      weekdayNode.textContent = weekday;
      const dateNode = document.createElement('span');
      dateNode.className = 'date-choice__date';
      dateNode.textContent = dateLabel;
      button.append(weekdayNode, dateNode);

      if (isClosed) {
        const stateNode = document.createElement('span');
        stateNode.className = 'date-choice__state';
        stateNode.textContent = 'Fermé';
        button.append(stateNode);
      }

      button.addEventListener('click', () => {
        state.day = key;
        state.time = '';
        document.querySelectorAll('.date-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        renderTimes();
        updateSummary();
        document.querySelector('#erreur-jour').textContent = '';
      });

      dateList.append(button);
    }
  };

  const hashText = (value) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    return Math.abs(hash);
  };

  const renderTimes = () => {
    timeList.replaceChildren();
    const service = getService();
    if (!state.day || !service) return;

    const chosenDate = dateFromKey(state.day);
    const weekday = chosenDate.getDay();
    const closing = weekday === 6 ? (17 * 60) + 45 : 19 * 60;
    const opening = 10 * 60;
    const lastStart = closing - 1;
    const current = new Date();
    const isToday = makeDateKey(current) === state.day;

    for (let minute = opening, index = 0; minute <= lastStart; minute += 30, index += 1) {
      const hour = Math.floor(minute / 60);
      const remainder = minute % 60;
      const value = `${String(hour).padStart(2, '0')}${String(remainder).padStart(2, '0')}`;
      const time = `${String(hour).padStart(2, '0')}\u00a0h\u00a0${String(remainder).padStart(2, '0')}`;
      const isPast = isToday && minute <= (current.getHours() * 60) + current.getMinutes();
      const isBusy = !isPast && hashText(`${state.day}-${value}`) % 7 === 2;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `time-choice${isBusy ? ' is-busy' : ''}`;
      button.disabled = isPast || isBusy;
      button.dataset.time = value;
      button.setAttribute('aria-pressed', String(state.time === value));
      button.setAttribute('aria-label', `${time}${isPast ? ', passé' : isBusy ? ', déjà pris' : ''}`);
      button.append(document.createTextNode(time));

      if (isPast || isBusy) {
        const stateNode = document.createElement('span');
        stateNode.className = 'time-choice__state';
        stateNode.textContent = isPast ? 'Passé' : 'Déjà pris';
        button.append(stateNode);
      }

      button.addEventListener('click', () => {
        state.time = value;
        document.querySelectorAll('.time-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        updateSummary();
        document.querySelector('#erreur-heure').textContent = '';
      });

      timeList.append(button);
    }
  };

  document.querySelectorAll('input[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      const previous = state.service;
      state.service = input.value;
      if (previous && previous !== state.service) {
        state.day = '';
        state.time = '';
        renderDates();
      }
      renderTimes();
      updateSummary();
      document.querySelector('#erreur-prestation').textContent = '';
    });
  });

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (state.step === 0 && !state.service) {
        document.querySelector('#erreur-prestation').textContent = 'Choisissez une prestation pour continuer.';
        return;
      }
      if (state.step === 1 && !state.day) {
        document.querySelector('#erreur-jour').textContent = 'Choisissez un jour ouvert pour continuer.';
        return;
      }
      if (state.step === 2 && !state.time) {
        document.querySelector('#erreur-heure').textContent = 'Choisissez une heure disponible pour continuer.';
        return;
      }
      if (state.step === 0) renderDates();
      if (state.step === 1) renderTimes();
      if (state.step === 2) {
        const service = getService();
        document.querySelector('[data-inline-recap]').textContent = `${service.name} · ${summaryDate.textContent} à ${summaryTime.textContent}.`;
      }
      setStep(state.step + 1);
    });
  });

  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => setStep(state.step - 1));
  });

  editButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.editStep);
      if (target === 1 && !state.day) return;
      if (target === 2 && !state.time) return;
      success.hidden = true;
      setStep(target);
    });
  });

  const setFieldError = (input, message, errorNode) => {
    errorNode.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const isFrenchMobile = (value) => /^(?:0[67]|(?:\+33|0033)[67])(?:[\s.-]?\d{2}){4}$/.test(value.trim());
  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');

  [firstName, phone].forEach((input) => input.addEventListener('input', () => {
    const errorNode = document.querySelector(input === firstName ? '#erreur-prenom' : '#erreur-telephone');
    if (input === firstName && input.value.trim()) setFieldError(input, '', errorNode);
    if (input === phone && isFrenchMobile(input.value)) setFieldError(input, '', errorNode);
  }));

  const toUtcStamp = (date, minutes) => {
    const appointment = new Date(date);
    appointment.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return appointment.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const makeCalendarFile = () => {
    const service = getService();
    const chosenDate = dateFromKey(state.day);
    const [hour, minute] = [Number(state.time.slice(0, 2)), Number(state.time.slice(2))];
    const startMinutes = hour * 60 + minute;
    const start = toUtcStamp(chosenDate, startMinutes);
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Hair Show Coiffure//FR',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `DTSTART:${start}`,
      'SUMMARY:Rendez-vous simulé chez Hair Show Coiffure',
      'LOCATION:7 rue des Filatiers\, 31000 Toulouse',
      'DESCRIPTION:Simulation uniquement. Aucune demande n’a été envoyée au salon.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    calendarLink.href = url;
    calendarLink.download = 'rendez-vous-hair-show-coiffure.ics';
    calendarLink.hidden = false;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameError = document.querySelector('#erreur-prenom');
    const phoneError = document.querySelector('#erreur-telephone');
    const formError = document.querySelector('#erreur-formulaire');
    const nameIsValid = firstName.value.trim().length > 0;
    const phoneIsValid = isFrenchMobile(phone.value);

    setFieldError(firstName, nameIsValid ? '' : 'Indiquez votre prénom.', nameError);
    setFieldError(phone, phoneIsValid ? '' : 'Indiquez un numéro de mobile français valide.', phoneError);
    formError.textContent = '';

    if (!nameIsValid || !phoneIsValid) {
      (!nameIsValid ? firstName : phone).focus();
      return;
    }

    const service = getService();
    const dateLabel = summaryDate.textContent;
    const timeLabel = summaryTime.textContent;
    document.querySelector('[data-success-recap]').textContent = `${service.name}, le ${dateLabel} à ${timeLabel}.`;
    steps[state.step].hidden = true;
    success.hidden = false;
    progressItems.forEach((item) => item.removeAttribute('aria-current'));
    stepAnnouncement.textContent = 'Simulation terminée. Aucun rendez-vous n’a été demandé au salon.';
    makeCalendarFile();
    success.querySelector('h3').focus({ preventScroll: true });
  });

  if (mobilePhone) mobilePhone.setAttribute('aria-label', 'Appeler Hair Show Coiffure au 05 32 59 40 18');
  renderDates();
  updateSummary();
})();
