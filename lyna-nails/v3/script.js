(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';

  const services = {
    semi: 'Vernis semi-permanent',
    pieds: 'Beauté des pieds avec vernis',
    cire: 'Épilation à la cire classique'
  };

  const state = {
    step: 'prestation',
    service: null,
    date: null,
    time: null,
    firstName: '',
    mobile: ''
  };

  const hero = $('.hero');
  const booking = $('.booking');
  const bookingForm = $('#booking-form');
  const steps = $$('.booking-step', bookingForm);
  const live = $('[data-booking-live]', bookingForm);
  const dayList = $('[data-day-list]');
  const timeList = $('[data-time-list]');
  const mobileBar = $('.mobile-bar');

  function speak(message) {
    live.textContent = '';
    window.setTimeout(() => { live.textContent = message; }, 20);
  }

  function revealHero() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => hero.classList.add('is-ready'));
    });
  }

  if (reduceMotion.matches) {
    $$('.reveal').forEach((item) => item.classList.add('is-revealed'));
    hero.classList.add('is-ready');
  } else {
    revealHero();
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        if (entry.target.matches('.signature__thread, .street-drawing')) entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal, .signature__thread, .street-drawing').forEach((item) => revealObserver.observe(item));
  } else {
    $$('.reveal').forEach((item) => item.classList.add('is-revealed'));
    $$('.signature__thread, .street-drawing').forEach((item) => item.classList.add('is-drawn'));
  }

  function updateMobileBar() {
    const heroOut = !heroActionsVisible;
    const shouldShow = heroOut && !bookingVisible && !footerVisible && !formHasFocus;
    mobileBar.classList.toggle('is-visible', shouldShow);
    mobileBar.setAttribute('aria-hidden', String(!shouldShow));
    mobileBar.inert = !shouldShow;
  }

  const heroActions = $('.hero__actions');
  const footer = $('.site-footer');
  let heroActionsVisible = true;
  let bookingVisible = false;
  let footerVisible = false;
  let formHasFocus = false;

  if ('IntersectionObserver' in window) {
    const mobileObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroActions) heroActionsVisible = entry.isIntersecting;
        if (entry.target === booking) bookingVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      updateMobileBar();
    }, { threshold: 0.02 });
    mobileObserver.observe(heroActions);
    mobileObserver.observe(booking);
    mobileObserver.observe(footer);
  }

  bookingForm.addEventListener('focusin', () => {
    formHasFocus = true;
    updateMobileBar();
  });
  bookingForm.addEventListener('focusout', () => {
    window.setTimeout(() => {
      formHasFocus = bookingForm.contains(document.activeElement);
      updateMobileBar();
    }, 0);
  });

  const address = '84 rue de Saussure, 75017 Paris';
  const copyButton = $('[data-copier]');
  const copyStatus = $('[data-copy-status]');

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('aria-hidden', 'true');
    field.tabIndex = -1;
    field.style.position = 'fixed';
    field.style.insetInlineStart = '-10000px';
    document.body.append(field);
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    field.remove();
    return copied;
  }

  copyButton.addEventListener('click', async () => {
    try {
      const copied = await copyText(address);
      copyStatus.textContent = copied ? 'Adresse copiée.' : 'Copie indisponible. Adresse : 84 rue de Saussure, 75017 Paris.';
    } catch (_) {
      copyStatus.textContent = 'Copie indisponible. Adresse : 84 rue de Saussure, 75017 Paris.';
    }
  });

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const shortWeekdayFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short'
  });
  const dateNumberFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', day: 'numeric'
  });
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function parisNow() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map((part) => [part.type, part.value]));
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
    return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function dateIso(date) { return date.toISOString().slice(0, 10); }

  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function frenchHolidays(year) {
    const holidays = new Set([
      '01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'
    ].map((part) => `${year}-${part}`));
    const easter = easterSunday(year);
    [1, 39, 50].forEach((offset) => {
      const day = new Date(easter.getTime() + offset * 86400000);
      holidays.add(dateIso(day));
    });
    return holidays;
  }

  const todayInfo = parisNow();
  const todayIso = dateIso(todayInfo.date);
  const holidaysByYear = new Map();
  function isHoliday(date) {
    const year = date.getUTCFullYear();
    if (!holidaysByYear.has(year)) holidaysByYear.set(year, frenchHolidays(year));
    return holidaysByYear.get(year).has(dateIso(date));
  }

  function appendDay(date, offset) {
    const iso = dateIso(date);
    const weekday = date.getUTCDay();
    const closed = weekday === 0;
    const holiday = isHoliday(date);
    const disabled = closed || holiday;
    const id = `jour-${iso}`;
    const option = document.createElement('div');
    option.className = 'day-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'jour';
    input.id = id;
    input.value = iso;
    input.disabled = disabled;
    input.setAttribute('aria-label', `${dateFormatter.format(date)}${closed ? ', fermé' : ''}${holiday ? ', jour férié, ouverture à confirmer' : ''}`);
    input.addEventListener('change', () => {
      state.date = iso;
      state.time = null;
      renderTimes(date);
      updateSummary();
      clearError('jour');
      speak(`Jour choisi : ${dateFormatter.format(date)}. Choisissez ensuite une heure de démonstration.`);
    });

    const label = document.createElement('label');
    label.htmlFor = id;
    const dayName = document.createElement('span');
    dayName.textContent = shortWeekdayFormatter.format(date).replace('.', '');
    const dayNumber = document.createElement('span');
    dayNumber.textContent = dateNumberFormatter.format(date);
    const marker = document.createElement('span');
    if (closed) marker.textContent = 'fermé';
    else if (holiday) marker.textContent = 'férié · à confirmer';
    else if (offset === 0) marker.textContent = 'aujourd’hui';
    else if (offset === 1) marker.textContent = 'demain';
    else marker.textContent = NB;
    label.append(dayName, dayNumber, marker);
    option.append(input, label);
    dayList.append(option);
  }

  function renderDays() {
    dayList.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(todayInfo.date.getTime() + offset * 86400000);
      appendDay(date, offset);
    }
  }

  function renderTimes(date) {
    timeList.replaceChildren();
    const dateId = dateIso(date);
    const times = [];
    for (let minute = 600; minute < 1140; minute += 60) times.push(minute);

    times.forEach((minute, index) => {
      const id = `heure-${dateId}-${minute}`;
      const past = dateId === todayIso && minute <= todayInfo.minutes;
      const unavailableInSimulation = !past && ((index + date.getUTCDate()) % 5 === 2);
      const option = document.createElement('div');
      option.className = 'time-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.id = id;
      input.value = String(minute);
      input.disabled = past || unavailableInSimulation;
      input.setAttribute('aria-label', `${formatTime(minute)}${past ? ', heure passée' : unavailableInSimulation ? ', indisponible dans cette simulation' : ''}`);
      input.addEventListener('change', () => {
        state.time = minute;
        updateSummary();
        clearError('heure');
        speak(`Heure choisie : ${formatTime(minute)}. Disponibilité réelle à vérifier sur Treatwell.`);
      });

      const label = document.createElement('label');
      label.htmlFor = id;
      const timeText = document.createElement('span');
      timeText.textContent = formatTime(minute);
      label.append(timeText);
      if (past || unavailableInSimulation) {
        const note = document.createElement('small');
        note.textContent = past ? 'passé' : 'indisponible';
        label.append(note);
      }
      option.append(input, label);
      timeList.append(option);
    });
  }

  function formatTime(minutes) {
    return `${Math.floor(minutes / 60)}${NB}h`;
  }

  function updateSummary() {
    $('[data-resume-service]').textContent = state.service ? services[state.service] : 'À choisir';
    $('[data-resume-day]').textContent = state.date
      ? dateFormatter.format(new Date(`${state.date}T12:00:00Z`))
      : 'À choisir';
    $('[data-resume-time]').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    $$('[data-retour-etape]').forEach((button) => {
      const selected = { prestation: state.service, jour: state.date, heure: state.time }[button.dataset.retourEtape];
      button.hidden = !selected;
    });
  }

  const previousStep = { jour: 'prestation', heure: 'jour', coordonnees: 'heure' };
  const headingIds = {
    prestation: 'titre-etape-service',
    jour: 'titre-etape-jour',
    heure: 'titre-etape-heure',
    coordonnees: 'titre-etape-coordonnees',
    terminee: 'titre-succes'
  };
  const stepMessages = {
    prestation: 'Étape 1 sur 4 : prestation.',
    jour: 'Étape 2 sur 4 : jour.',
    heure: 'Étape 3 sur 4 : heure.',
    coordonnees: 'Étape 4 sur 4 : coordonnées.',
    terminee: 'Simulation terminée. Aucun rendez-vous réel n’a été créé.'
  };

  function setStep(name, announce = true) {
    state.step = name;
    const progressSteps = ['prestation', 'jour', 'heure', 'coordonnees'];
    const currentIndex = progressSteps.indexOf(name);
    steps.forEach((panel) => {
      const active = panel.dataset.step === name;
      panel.hidden = false;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
    });
    $$('[data-progress]').forEach((item, index) => {
      const active = item.dataset.progress === name;
      item.classList.toggle('is-current', active);
      item.classList.toggle('is-complete', name === 'terminee' || index < currentIndex);
      if (active) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const heading = document.getElementById(headingIds[name]);
    if (heading) heading.focus({ preventScroll: true });
    if (announce) speak(stepMessages[name]);
  }

  function clearError(name) {
    const element = document.getElementById(`erreur-${name}`);
    if (element) element.textContent = '';
    if (name === 'prenom' || name === 'mobile') {
      const input = document.getElementById(name);
      input.removeAttribute('aria-invalid');
    }
  }

  function setError(name, message, focusTarget) {
    const element = document.getElementById(`erreur-${name}`);
    if (element) element.textContent = message;
    if (name === 'prenom' || name === 'mobile') document.getElementById(name).setAttribute('aria-invalid', 'true');
    if (focusTarget) focusTarget.focus();
    speak(message);
  }

  function canContinue() {
    if (state.step === 'prestation' && !state.service) {
      setError('prestation', 'Choisissez une prestation pour continuer.', $('[name="prestation"]'));
      return false;
    }
    if (state.step === 'jour' && !state.date) {
      setError('jour', 'Choisissez un jour ouvert pour la simulation.', $('[name="jour"]:not(:disabled)'));
      return false;
    }
    if (state.step === 'heure' && state.time === null) {
      setError('heure', 'Choisissez une heure disponible dans la simulation.', $('[name="heure"]:not(:disabled)'));
      return false;
    }
    return true;
  }

  $$('[data-suivant]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!canContinue()) return;
      const next = { prestation: 'jour', jour: 'heure', heure: 'coordonnees' }[state.step];
      if (next) setStep(next);
    });
  });

  $$('[data-retour]').forEach((button) => {
    button.addEventListener('click', () => {
      const previous = previousStep[state.step];
      if (previous) setStep(previous);
    });
  });

  $$('[data-retour-etape]').forEach((button) => {
    button.addEventListener('click', () => setStep(button.dataset.retourEtape));
  });

  $$('[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.service = input.value;
      updateSummary();
      clearError('prestation');
      speak(`${services[state.service]} choisie.`);
    });
  });

  $$('[data-choisir]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.choisir;
      const input = $(`[name="prestation"][value="${id}"]`);
      input.checked = true;
      state.service = id;
      updateSummary();
      setStep('prestation', false);
      document.getElementById('titre-reserver').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => $('#titre-etape-service').focus({ preventScroll: true }), 220);
      speak(`${services[id]} choisie. La simulation est prête à continuer.`);
    });
  });

  function mobileIsValid(value) {
    const normalized = value.replace(/[\s.()-]/g, '').replace(/^\+33/, '0');
    return /^0[67]\d{8}$/.test(normalized);
  }

  bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstName = $('#prenom').value.trim();
    const mobile = $('#mobile').value.trim();
    clearError('prenom');
    clearError('mobile');
    if (firstName.length < 2) {
      setError('prenom', 'Saisissez votre prénom.', $('#prenom'));
      return;
    }
    if (!mobileIsValid(mobile)) {
      setError('mobile', 'Saisissez un numéro de mobile français valide.', $('#mobile'));
      return;
    }
    state.firstName = firstName;
    state.mobile = mobile;
    const fullDate = state.date ? dateFormatter.format(new Date(`${state.date}T12:00:00Z`)) : '';
    $('[data-success-recap]').textContent = `${firstName}, ${services[state.service]}, le ${fullDate} à ${formatTime(state.time)}.`;
    setStep('terminee');
  });

  $('[data-recommencer]').addEventListener('click', () => {
    bookingForm.reset();
    state.step = 'prestation';
    state.service = null;
    state.date = null;
    state.time = null;
    state.firstName = '';
    state.mobile = '';
    dayList.querySelectorAll('input').forEach((input) => { input.checked = false; });
    timeList.replaceChildren();
    ['prestation', 'jour', 'heure', 'prenom', 'mobile'].forEach(clearError);
    updateSummary();
    setStep('prestation');
  });

  renderDays();
  updateSummary();
  setStep('prestation', false);
  updateMobileBar();
  window.__previewReady = true;
  window.clearTimeout(window.__previewFallbackTimer);
})();
