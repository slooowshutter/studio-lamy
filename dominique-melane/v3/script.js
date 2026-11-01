(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-nav');
  const mobileBar = document.querySelector('.mobile-bar');
  const heroActions = document.querySelector('.hero-actions');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');

  const revealTargets = document.querySelectorAll('.reveal, .door-art, .street-figure');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((element) => revealObserver.observe(element));
  }

  const heroCopy = document.querySelector('.hero-copy');
  requestAnimationFrame(() => heroCopy?.classList.add('is-entered'));

  if (menuButton && navigation) {
    const closeMenu = (restoreFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      navigation.classList.toggle('is-open', !isOpen);
      if (!isOpen) navigation.querySelector('a')?.focus();
      else menuButton.focus();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(true);
    });
    document.addEventListener('click', (event) => {
      if (menuButton.getAttribute('aria-expanded') === 'true' &&
          !navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  if (mobileBar && heroActions && bookingSection && footer && 'IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const syncBar = () => {
      mobileBar.classList.toggle('is-visible', !visibility.hero && !visibility.booking && !visibility.footer);
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroActions) visibility.hero = entry.isIntersecting;
        if (entry.target === bookingSection) visibility.booking = entry.isIntersecting;
        if (entry.target === footer) visibility.footer = entry.isIntersecting;
      });
      syncBar();
    }, { threshold: 0.01 });
    barObserver.observe(heroActions);
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
  }

  const form = document.querySelector('#booking-form');
  if (!form) return;

  const steps = [...form.querySelectorAll('.booking-step')];
  const stepButtons = [...form.querySelectorAll('.stepper-item')];
  const liveMessage = document.querySelector('#booking-live');
  const dateOptions = document.querySelector('#date-options');
  const timeOptions = document.querySelector('#time-options');
  const slotsIntro = document.querySelector('#slots-intro');
  const summary = {
    service: document.querySelector('#summary-service'),
    day: document.querySelector('#summary-day'),
    time: document.querySelector('#summary-time')
  };
  const state = { service: null, date: null, time: null, maxStep: 0, visibleStep: 0 };
  const openingHours = {
    0: null,
    1: { open: '10:15', close: '18:30' },
    2: { open: '10:15', close: '18:30' },
    3: null,
    4: { open: '10:15', close: '18:30' },
    5: { open: '10:15', close: '18:30' },
    6: null
  };
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const pad = (number) => String(number).padStart(2, '0');
  const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const dateLabel = (date, withYear = false) => `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`;
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const minutesToTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const displayTime = (time) => time.replace(':', '\u00a0h\u00a0');

  const setSummary = () => {
    summary.service.textContent = state.service?.label || 'À choisir';
    summary.day.textContent = state.date ? dateLabel(state.date) : 'À choisir';
    summary.time.textContent = state.time ? displayTime(state.time) : 'À choisir';
  };

  const refreshStepper = () => {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.maxStep || index === 4;
      button.classList.toggle('is-current', index === state.visibleStep);
      button.classList.toggle('is-complete', index < state.visibleStep && index <= state.maxStep);
      if (index === state.visibleStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };

  const showStep = (nextIndex, message) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const priorIndex = state.visibleStep;
    const prior = steps[priorIndex];
    const next = steps[nextIndex];
    state.visibleStep = nextIndex;
    if (prior && prior !== next) {
      prior.classList.remove('is-active');
      window.setTimeout(() => {
        if (state.visibleStep !== priorIndex) prior.hidden = true;
      }, reduceMotion ? 120 : 190);
    }
    next.hidden = false;
    next.classList.remove('is-active');
    requestAnimationFrame(() => next.classList.add('is-active'));
    refreshStepper();
    if (message) liveMessage.textContent = message;
    const heading = next.querySelector('h3');
    window.setTimeout(() => {
      if (state.visibleStep === nextIndex) heading?.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 40);
    next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  };

  const clearError = (name) => {
    const error = form.querySelector(`[data-error="${name}"]`);
    if (error) error.hidden = true;
  };
  const showError = (name) => {
    const error = form.querySelector(`[data-error="${name}"]`);
    if (error) error.hidden = false;
  };

  const makeDateOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateOptions.replaceChildren();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const hours = openingHours[date.getDay()];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-option';
      button.dataset.date = dateKey(date);
      button.disabled = !hours;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${dateLabel(date, true)}${hours ? ', ouvert selon les horaires publiés' : date.getDay() === 6 ? ', à confirmer' : ', fermé'}`);
      const weekday = document.createElement('strong');
      weekday.textContent = dayNames[date.getDay()].slice(0, 3);
      const dayNumber = document.createElement('span');
      dayNumber.textContent = String(date.getDate());
      const stateLabel = document.createElement('small');
      stateLabel.textContent = !hours ? date.getDay() === 6 ? 'à confirmer' : 'fermé' : '\u00a0';
      if (!hours) stateLabel.className = 'closed-label';
      button.append(weekday, dayNumber, stateLabel);
      button.addEventListener('click', () => {
        if (button.disabled) return;
        dateOptions.querySelectorAll('.date-option').forEach((item) => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.date = new Date(date);
        state.time = null;
        state.maxStep = Math.min(state.maxStep, 2);
        clearError('day');
        clearError('time');
        setSummary();
        makeTimeOptions();
        liveMessage.textContent = `${dateLabel(state.date)} sélectionné. Choisissez une heure pour cette simulation.`;
        refreshStepper();
      });
      dateOptions.append(button);
    }
  };

  const makeTimeOptions = () => {
    timeOptions.replaceChildren();
    if (!state.date || !state.service) return;
    const hours = openingHours[state.date.getDay()];
    if (!hours) return;
    const start = timeToMinutes(hours.open);
    const close = timeToMinutes(hours.close);
    const now = new Date();
    const isToday = dateKey(state.date) === dateKey(now);
    const seed = Number(dateKey(state.date).replace(/-/g, ''));
    let slotIndex = 0;
    for (let slot = start; slot < close; slot += 30) {
      const time = minutesToTime(slot);
      const taken = (seed + slotIndex * 13) % 11 === 3 || (seed + slotIndex * 7) % 17 === 5;
      const past = isToday && slot <= now.getHours() * 60 + now.getMinutes();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `time-option${taken ? ' is-booked' : past ? ' is-past' : ''}`;
      button.textContent = displayTime(time);
      button.dataset.time = time;
      button.disabled = taken || past;
      button.setAttribute('aria-pressed', 'false');
      if (taken) button.setAttribute('aria-label', `${displayTime(time)}, déjà pris dans cette simulation`);
      else if (past) button.setAttribute('aria-label', `${displayTime(time)}, heure passée`);
      button.addEventListener('click', () => {
        if (button.disabled) return;
        timeOptions.querySelectorAll('.time-option').forEach((item) => item.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.time = time;
        clearError('time');
        setSummary();
        liveMessage.textContent = `${time} sélectionné pour ${dateLabel(state.date)}.`;
      });
      timeOptions.append(button);
      slotIndex += 1;
    }
    slotsIntro.textContent = `${dateLabel(state.date)} · créneaux indicatifs selon les horaires publiés${hours.caution ? ' (samedi à confirmer)' : ''}.`;
  };

  form.querySelectorAll('input[name="service"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.service = {
        label: radio.value
      };
      state.time = null;
      state.maxStep = Math.min(state.maxStep, 1);
      clearError('service');
      clearError('time');
      timeOptions.replaceChildren();
      setSummary();
      if (state.date) makeTimeOptions();
      liveMessage.textContent = `${state.service.label} sélectionnée pour la simulation.`;
      refreshStepper();
    });
  });

  const validStep = (index) => {
    if (index === 0 && !state.service) { showError('service'); form.querySelector('input[name="service"]')?.focus(); return false; }
    if (index === 1 && !state.date) { showError('day'); dateOptions.querySelector('button:not(:disabled)')?.focus(); return false; }
    if (index === 2 && !state.time) { showError('time'); timeOptions.querySelector('button:not(:disabled)')?.focus(); return false; }
    return true;
  };

  form.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const stepIndex = Number(button.closest('.booking-step').dataset.step);
      if (!validStep(stepIndex)) return;
      const next = stepIndex + 1;
      state.maxStep = Math.max(state.maxStep, next);
      setSummary();
      if (next === 3) {
        const recap = document.querySelector('#contact-recap');
        recap.textContent = `${state.service.label} · ${dateLabel(state.date)} à ${displayTime(state.time)}`;
      }
      showStep(next, ['Prestation choisie.', 'Jour sélectionné.', 'Heure choisie.', 'Ajoutez vos coordonnées pour terminer la simulation.'][next]);
    });
  });

  form.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = Number(button.closest('.booking-step').dataset.step);
      showStep(current - 1, 'Vous pouvez modifier votre sélection.');
    });
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      const target = Number(button.dataset.goto);
      showStep(target, `Étape ${target + 1} sur 4.`);
    });
  });

  const firstName = document.querySelector('#first-name');
  const phone = document.querySelector('#phone');
  const nameError = document.querySelector('#name-error');
  const phoneError = document.querySelector('#phone-error');
  const isFrenchMobile = (value) => {
    const compact = value.replace(/[\s.()-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.visibleStep !== 3 || !state.service || !state.date || !state.time) return;
    const nameValid = firstName.value.trim().length >= 2;
    const phoneValid = isFrenchMobile(phone.value.trim());
    nameError.hidden = nameValid;
    phoneError.hidden = phoneValid;
    firstName.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      showError('contact');
      liveMessage.textContent = 'Vérifiez le prénom et le numéro de mobile.';
      (nameValid ? phone : firstName).focus();
      return;
    }
    clearError('contact');
    const recap = document.querySelector('#success-recap');
    recap.replaceChildren();
    const lines = [
      `${firstName.value.trim()} · ${state.service.label}`,
      `${dateLabel(state.date, true)} à ${displayTime(state.time)}`
    ];
    lines.forEach((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      recap.append(paragraph);
    });
    state.maxStep = 4;
    showStep(4, 'La simulation est terminée. Rien n’a été envoyé.');
  });

  document.querySelector('#restart-booking')?.addEventListener('click', () => {
    form.reset();
    state.service = null;
    state.date = null;
    state.time = null;
    state.maxStep = 0;
    dateOptions.querySelectorAll('.date-option').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    timeOptions.replaceChildren();
    setSummary();
    nameError.hidden = true;
    phoneError.hidden = true;
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    showStep(0, 'Choisissez une prestation pour commencer.');
  });

  document.querySelector('#calendar-download')?.addEventListener('click', () => {
    if (!state.date || !state.time || !state.service) return;
    const startMinutes = timeToMinutes(state.time);
    const formatIcsDate = (date, minutes) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
    const day = formatIcsDate(state.date, startMinutes);
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu local//FR',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `DTSTART;TZID=Europe/Paris:${day}`,
      'SUMMARY:Visite simulée — Dominique Mélane Coiffure',
      'LOCATION:26 avenue de l’U.R.S.S., 31400 Toulouse',
      'DESCRIPTION:Créneau indicatif téléchargé depuis un aperçu non officiel. Aucune réservation n’a été transmise.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'visite-dominique-melane.ics';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  makeDateOptions();
  setSummary();
  refreshStepper();
})();
