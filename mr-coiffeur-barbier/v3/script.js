(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -36px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const form = document.getElementById('booking-form');
  if (!form) return;

  const serviceInfo = {
    coupe: { label: 'Shampoing + Coupe + Coiffage', duree: 30 },
    barbe: { label: 'Taille de Barbe avec rasage (Rasoir, serviette chaude et soin )', duree: 30 },
    ensemble: { label: 'Shampoing Coupe Séchage + Taille de Barbe ( rasage , serviette chaude et soin )', duree: 60 }
  };
  const state = { prestation: '', jour: null, heure: null };
  const panels = [...document.querySelectorAll('[data-step-panel]')];
  const continueButtons = [...document.querySelectorAll('[data-suivant]')];
  const dayList = document.getElementById('date-list');
  const slotList = document.getElementById('slot-list');
  const flowStatus = document.getElementById('flow-status');
  const recapService = document.getElementById('recap-prestation');
  const recapDay = document.getElementById('recap-jour');
  const recapTime = document.getElementById('recap-heure');
  const successPanel = document.getElementById('booking-success');
  let activeStep = 1;

  const twoDigits = (number) => String(number).padStart(2, '0');
  const dateKey = (date) => `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`;
  const dateAtLocalNoon = (year, month, day) => new Date(year, month, day, 12, 0, 0, 0);
  const todayInParis = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return dateAtLocalNoon(Number(value.year), Number(value.month) - 1, Number(value.day));
  };
  const currentTimeInParisMinutes = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(value.hour) * 60 + Number(value.minute);
  };
  const formatShortDate = (date) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
  const formatWeekday = (date) => {
    const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
    return label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1);
  };
  const formatLongDate = (date) => new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
  const formatTime = (minutes) => `${Math.floor(minutes / 60)} h ${twoDigits(minutes % 60)}`;

  const easterSunday = (year) => {
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
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return dateAtLocalNoon(year, month, day);
  };
  const publicHolidayKeys = (year) => {
    const fixed = [[0, 1], [4, 1], [4, 8], [6, 14], [7, 15], [10, 1], [10, 11], [11, 25]];
    const keys = fixed.map(([month, day]) => dateKey(dateAtLocalNoon(year, month, day)));
    const easter = easterSunday(year);
    [1, 39, 50].forEach((offset) => {
      const date = new Date(easter);
      date.setDate(easter.getDate() + offset);
      keys.push(dateKey(date));
    });
    return new Set(keys);
  };

  const holidaySet = new Set([...publicHolidayKeys(new Date().getFullYear()), ...publicHolidayKeys(new Date().getFullYear() + 1)]);
  const updateSummary = () => {
    recapService.textContent = state.prestation ? serviceInfo[state.prestation].label : 'Pas encore choisie';
    recapDay.textContent = state.jour ? formatLongDate(state.jour) : 'Pas encore choisi';
    recapTime.textContent = state.heure !== null ? formatTime(state.heure) : 'Pas encore choisie';
  };
  const setContinueState = () => {
    continueButtons.forEach((button) => {
      const nextStep = Number(button.dataset.suivant);
      const ready = nextStep === 2 ? Boolean(state.prestation)
        : nextStep === 3 ? Boolean(state.jour)
          : nextStep === 4 ? state.heure !== null : false;
      button.disabled = !ready;
    });
  };
  const stepHeading = (step) => document.querySelector(`[data-step-panel="${step}"] h3`);
  const changeStep = (step, focusHeading = true) => {
    const panel = panels.find((item) => Number(item.dataset.stepPanel) === step);
    if (!panel) return;
    activeStep = step;
    panels.forEach((item) => {
      const isActive = item === panel;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-hidden', String(!isActive));
      item.inert = !isActive;
      if (isActive) {
        item.hidden = false;
        item.classList.remove('is-entering');
        void item.offsetWidth;
        if (!reduceMotion) item.classList.add('is-entering');
      } else {
        item.hidden = true;
        item.classList.remove('is-entering');
      }
    });
    flowStatus.textContent = `Étape ${step} sur quatre : ${['', 'choisir une prestation', 'choisir un jour', 'choisir une heure', 'renseigner vos coordonnées'][step]}.`;
    if (focusHeading) stepHeading(step)?.focus();
  };

  const makeDateButton = (date) => {
    const weekday = date.getDay();
    const monday = weekday === 1;
    const sunday = weekday === 0;
    const isHoliday = holidaySet.has(dateKey(date));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-choice';
    button.dataset.date = dateKey(date);
    button.setAttribute('aria-pressed', 'false');
    const strong = document.createElement('strong');
    strong.textContent = formatShortDate(date);
    const small = document.createElement('small');
    if (sunday) {
      button.disabled = true;
      small.textContent = 'Dimanche · fermé';
      button.setAttribute('aria-label', `${formatLongDate(date)}, fermé`);
    } else if (monday) {
      button.disabled = true;
      small.textContent = 'Lundi · à confirmer';
      button.setAttribute('aria-label', `${formatLongDate(date)}, horaires à confirmer`);
    } else if (isHoliday) {
      button.classList.add('is-holiday');
      small.textContent = 'Férié · ouverture à confirmer';
      button.setAttribute('aria-label', `${formatLongDate(date)}, jour férié, ouverture à confirmer`);
    } else {
      small.textContent = formatWeekday(date);
      button.setAttribute('aria-label', `${formatLongDate(date)}, disponibilité à confirmer`);
    }
    button.append(strong, small);
    button.addEventListener('click', () => {
      state.jour = date;
      state.heure = null;
      dayList.querySelectorAll('.date-choice').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      updateSummary();
      renderSlots();
      setContinueState();
    });
    return button;
  };

  const buildDates = () => {
    const today = todayInParis();
    dayList.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      dayList.append(makeDateButton(date));
    }
  };

  const openingWindow = (date) => {
    const weekday = date.getDay();
    if (weekday >= 2 && weekday <= 5) return { ouverture: 9 * 60, fermeture: 19 * 60 };
    if (weekday === 6) return { ouverture: 9 * 60, fermeture: 18 * 60 };
    return null;
  };
  const renderSlots = () => {
    slotList.replaceChildren();
    const service = serviceInfo[state.prestation];
    const window = state.jour && openingWindow(state.jour);
    if (!service || !window) return;
    const isToday = dateKey(state.jour) === dateKey(todayInParis());
    const currentMinutes = currentTimeInParisMinutes();
    const candidates = [window.ouverture + 60, window.ouverture + 180, window.ouverture + 360, window.fermeture - service.duree];
    const times = [...new Set(candidates)]
      .filter((minute) => minute >= window.ouverture && minute + service.duree <= window.fermeture)
      .filter((minute) => !isToday || minute > currentMinutes)
      .sort((a, b) => a - b);
    if (times.length === 0) {
      const note = document.createElement('p');
      note.className = 'no-slots-note';
      note.textContent = 'Aucune heure d’exemple restante pour aujourd’hui. Choisissez une autre date.';
      slotList.append(note);
      return;
    }
    times.forEach((minute) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-choice';
      button.dataset.heure = String(minute);
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `Exemple à ${formatTime(minute)}, disponibilité à confirmer`);
      const timeLabel = document.createElement('strong');
      timeLabel.textContent = formatTime(minute);
      const note = document.createElement('small');
      note.textContent = 'Exemple à confirmer';
      button.append(timeLabel, note);
      button.addEventListener('click', () => {
        state.heure = minute;
        slotList.querySelectorAll('.slot-choice').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        updateSummary();
        setContinueState();
      });
      slotList.append(button);
    });
  };

  form.addEventListener('change', (event) => {
    if (event.target.name !== 'prestation') return;
    state.prestation = event.target.value;
    state.jour = null;
    state.heure = null;
    dayList.querySelectorAll('.date-choice').forEach((item) => item.setAttribute('aria-pressed', 'false'));
    slotList.replaceChildren();
    updateSummary();
    setContinueState();
  });
  continueButtons.forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.suivant);
    if (next === 3 && state.jour) renderSlots();
    changeStep(next);
  }));
  document.querySelectorAll('[data-retour]').forEach((button) => button.addEventListener('click', () => changeStep(Number(button.dataset.retour))));
  document.querySelectorAll('[data-choisir]').forEach((link) => link.addEventListener('click', () => {
    const key = link.dataset.choisir;
    const radio = form.querySelector(`input[name="prestation"][value="${key}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    buildDates();
    setContinueState();
    changeStep(2);
  }));

  const firstName = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  const firstNameError = document.getElementById('prenom-erreur');
  const phoneError = document.getElementById('telephone-erreur');
  const cleanPhone = (value) => value.replace(/[\s().-]/g, '');
  const isFrenchMobile = (value) => /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(cleanPhone(value));
  const validateName = () => {
    const valid = firstName.value.trim().length >= 2;
    firstNameError.textContent = valid ? '' : 'Saisissez un prénom d’au moins deux lettres.';
    firstName.setAttribute('aria-invalid', String(!valid));
    return valid;
  };
  const validatePhone = () => {
    const valid = isFrenchMobile(phone.value);
    phoneError.textContent = valid ? '' : 'Saisissez un numéro mobile français commençant par 06, 07 ou +33.';
    phone.setAttribute('aria-invalid', String(!valid));
    return valid;
  };
  firstName.addEventListener('blur', validateName);
  phone.addEventListener('blur', validatePhone);
  firstName.addEventListener('input', () => { if (firstNameError.textContent) validateName(); });
  phone.addEventListener('input', () => { if (phoneError.textContent) validatePhone(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validName = validateName();
    const validPhone = validatePhone();
    if (!validName) { firstName.focus(); return; }
    if (!validPhone) { phone.focus(); return; }
    const date = state.jour ? formatLongDate(state.jour) : '';
    const service = state.prestation ? serviceInfo[state.prestation].label : '';
    document.getElementById('success-recap').textContent = `${firstName.value.trim()} — ${service}, le ${date} à ${formatTime(state.heure)}. Cette demande n’a pas été transmise.`;
    form.querySelector('.step-stack').hidden = true;
    successPanel.hidden = false;
    flowStatus.textContent = 'Démonstration terminée. Rien n’a été transmis.';
    document.getElementById('titre-succes').focus();
  });
  document.getElementById('recommencer').addEventListener('click', () => {
    state.prestation = '';
    state.jour = null;
    state.heure = null;
    form.reset();
    firstNameError.textContent = '';
    phoneError.textContent = '';
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    form.querySelector('.step-stack').hidden = false;
    successPanel.hidden = true;
    buildDates();
    updateSummary();
    setContinueState();
    changeStep(1);
  });

  buildDates();
  updateSummary();
  setContinueState();

  const mobileBar = document.querySelector('.mobile-bar');
  const overlapTargets = [document.getElementById('reservation'), document.querySelector('.site-footer')].filter(Boolean);
  if (mobileBar && 'IntersectionObserver' in window) {
    const visibleTargets = new Set();
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleTargets.add(entry.target);
        else visibleTargets.delete(entry.target);
      });
      document.body.classList.toggle('bar-overlap', visibleTargets.size > 0);
    }, { threshold: 0.04 });
    overlapTargets.forEach((target) => barObserver.observe(target));
  }
})();
