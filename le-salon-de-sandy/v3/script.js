(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const one = (selector, scope = doc) => scope.querySelector(selector);
  const many = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';
  const serviceName = 'Coupe sur cheveux secs';
  const hours = [null, [630, 1170], [600, 1170], [600, 1140], [660, 1200], [600, 1170], [600, 1110]];
  const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const dateLong = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parisNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const value = {};
    parts.forEach((part) => { value[part.type] = part.value; });
    return {
      year: Number(value.year), month: Number(value.month), day: Number(value.day),
      hour: Number(value.hour), minute: Number(value.minute)
    };
  }

  function parisToday() {
    const now = parisNow();
    return new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
  }

  const isoDate = (date) => date.toISOString().slice(0, 10);
  const timeLabel = (minutes) => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const dateLabel = (date) => `${weekdayLong.format(date)} ${dateLong.format(date)}`;
  const cap = (value) => value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);

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
    return Date.UTC(year, month - 1, day, 12);
  }

  function isPublicHoliday(date) {
    const year = date.getUTCFullYear();
    const key = isoDate(date);
    const fixed = new Set([
      `${year}-01-01`, `${year}-05-01`, `${year}-05-08`, `${year}-07-14`,
      `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`
    ]);
    const easter = easterSunday(year);
    const movable = [1, 39, 50].map((offset) => isoDate(new Date(easter + offset * 864e5)));
    return fixed.has(key) || movable.includes(key);
  }

  function buildDays() {
    const today = parisToday();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(today.getTime() + index * 864e5);
      const weekday = date.getUTCDay();
      const holiday = isPublicHoliday(date);
      return {
        index,
        date,
        iso: isoDate(date),
        weekday,
        hours: hours[weekday],
        closed: weekday === 0,
        holiday
      };
    });
  }

  const dates = buildDays();
  const form = one('#booking-form');
  const progress = one('[data-progress]');
  const panel = one('#booking-panel');
  const steps = many('.booking-step', form);
  const live = one('[data-booking-live]');
  const dateOptions = one('[data-date-options]');
  const timeOptions = one('[data-time-options]');
  const dayHint = one('[data-selected-day]');
  const success = one('[data-success]');
  const successSummary = one('[data-success-summary]');
  const summaryService = one('[data-summary-service]');
  const summaryDay = one('[data-summary-day]');
  const summaryTime = one('[data-summary-time]');
  const summaryDayEdit = one('[data-go-step="2"]');
  const summaryTimeEdit = one('[data-go-step="3"]');
  const state = { step: 1, maxStep: 1, day: null, time: null, name: '', phone: '' };
  let switchTimer = 0;

  function hoursSummary(day) {
    if (!day.hours) return 'Fermé';
    return `${timeLabel(day.hours[0])} – ${timeLabel(day.hours[1])}`;
  }

  function renderDates() {
    if (!dateOptions) return;
    dateOptions.innerHTML = dates.map((day) => {
      const unavailable = day.closed || day.holiday;
      const ariaText = day.holiday
        ? `${cap(dateLabel(day.date))}, jour férié, ouverture à confirmer`
        : day.closed
          ? `${cap(dateLabel(day.date))}, fermé`
          : `${cap(dateLabel(day.date))}, ouvert de ${hoursSummary(day)}`;
      const tag = day.holiday ? 'À confirmer' : day.closed ? 'Fermé' : day.index === 0 ? 'Auj.' : day.index === 1 ? 'Demain' : '';
      return `<label class="date-option${unavailable ? ' date-option--disabled' : ''}">
        <input type="radio" name="jour" value="${day.iso}" aria-label="${ariaText}" ${unavailable ? 'disabled' : ''}>
        <span class="date-option__day">${weekdayShort.format(day.date)}</span>
        <span class="date-option__number">${day.date.getUTCDate()}</span>
        <span class="date-option__state">${tag}</span>
      </label>`;
    }).join('');
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function slotsFor(day) {
    if (!day || !day.hours || day.holiday) return [];
    const now = parisNow();
    const currentMinutes = now.hour * 60 + now.minute;
    const isToday = day.index === 0;
    const slots = [];
    for (let minute = day.hours[0]; minute + 30 <= day.hours[1]; minute += 30) {
      const passed = isToday && minute <= currentMinutes;
      const demonstrationUnavailable = hash(`${day.iso}|${minute}|sandy`) % 100 < 18;
      slots.push({ minute, passed, demonstrationUnavailable, available: !passed && !demonstrationUnavailable });
    }
    return slots;
  }

  function renderTimes() {
    const day = dates.find((item) => item.iso === state.day);
    if (!day || !timeOptions) return;
    state.time = null;
    dayHint.textContent = `${cap(dateLabel(day.date))} · horaires publiés sur Planity${NB}:${NB}${hoursSummary(day)}.`;
    const slots = slotsFor(day);
    const availableCount = slots.filter((slot) => slot.available).length;
    if (!slots.length || availableCount === 0) {
      timeOptions.innerHTML = '<p class="no-slots">Aucun exemple de créneau disponible pour cette date.</p>';
    } else {
      timeOptions.innerHTML = slots.map((slot) => {
        const label = timeLabel(slot.minute);
        const unavailableText = slot.passed ? 'horaire déjà passé' : 'créneau neutralisé dans la démonstration';
        const disabled = slot.available ? '' : 'disabled';
        const ariaLabel = slot.available ? label : `${label}, ${unavailableText}`;
        return `<div class="time-option">
          <input type="radio" name="heure" id="heure-${day.iso}-${slot.minute}" value="${slot.minute}" aria-label="${ariaLabel}" ${disabled}>
          <label for="heure-${day.iso}-${slot.minute}"><time class="time-option__label" datetime="${day.iso}T${String(Math.floor(slot.minute / 60)).padStart(2, '0')}:${String(slot.minute % 60).padStart(2, '0')}">${label}</time></label>
        </div>`;
      }).join('');
      const note = doc.createElement('p');
      note.className = 'slot-note';
      note.textContent = 'Les indisponibilités affichées sont fictives et servent uniquement à la démonstration.';
      timeOptions.append(note);
    }
    state.time = null;
    updateSummary();
    live.textContent = `${availableCount} exemples de créneaux pour ${dateLabel(day.date)}. Les horaires réels sont à vérifier sur Planity.`;
  }

  function onDateChange() {
    const selected = one('input[name="jour"]:checked', dateOptions);
    if (!selected) return;
    state.day = selected.value;
    state.time = null;
    renderTimes();
    const error = one('[data-date-error]');
    if (error) error.hidden = true;
    many('.date-option', dateOptions).forEach((label) => {
      const input = one('input', label);
      label.classList.toggle('is-selected', Boolean(input && input.checked));
    });
    updateSummary();
    live.textContent = `Jour choisi${NB}:${NB}${dateLabel(dates.find((day) => day.iso === state.day).date)}.`;
  }

  function updateSummary() {
    if (!form) return;
    summaryService.textContent = serviceName;
    const day = dates.find((item) => item.iso === state.day);
    summaryDay.textContent = day ? cap(dateLabel(day.date)) : 'À choisir';
    summaryTime.textContent = state.time === null ? 'À choisir' : timeLabel(Number(state.time));
    summaryDayEdit.disabled = state.maxStep < 2;
    summaryTimeEdit.disabled = state.maxStep < 3;
  }

  const stepWords = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };

  function focusStepHeading(step) {
    const heading = one(`[data-step="${step}"] h3`, form);
    if (heading) heading.focus({ preventScroll: true });
  }

  function setStep(step, shouldFocus = true) {
    if (!steps.some((item) => Number(item.dataset.step) === step)) return;
    window.clearTimeout(switchTimer);
    state.step = step;
    state.maxStep = Math.max(state.maxStep, step);
    progress.textContent = `Étape ${step} sur 4 · ${stepWords[step]}`;
    success.hidden = true;
    progress.hidden = false;
    panel.hidden = false;
    panel.classList.add('is-changing');
    switchTimer = window.setTimeout(() => {
      steps.forEach((item) => { item.hidden = Number(item.dataset.step) !== step; });
      panel.classList.remove('is-changing');
      live.textContent = `Étape ${step} sur 4${NB}·${NB}${stepWords[step]}.`;
      if (shouldFocus) focusStepHeading(step);
    }, reduceMotion.matches ? 0 : 110);
  }

  function showError(selector, message, inputSelector) {
    const error = one(selector, form);
    const input = inputSelector ? one(inputSelector, form) : null;
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
    live.textContent = message;
    return false;
  }

  function clearError(errorSelector, inputSelector) {
    const error = one(errorSelector, form);
    const input = one(inputSelector, form);
    if (error) error.hidden = true;
    if (input) input.removeAttribute('aria-invalid');
  }

  function goForward() {
    if (state.step === 1) {
      const selected = one('input[name="prestation"]:checked', form);
      if (!selected) return;
      state.maxStep = Math.max(state.maxStep, 2);
      setStep(2);
    } else if (state.step === 2) {
      const selected = one('input[name="jour"]:checked', form);
      if (!selected || !dates.some((day) => day.iso === selected.value && day.hours && !day.holiday)) {
        showError('[data-date-error]', 'Choisissez un jour ouvert pour continuer.');
        return;
      }
      state.day = selected.value;
      renderTimes();
      state.maxStep = Math.max(state.maxStep, 3);
      setStep(3);
    } else if (state.step === 3) {
      const selected = one('input[name="heure"]:checked', form);
      if (!selected) {
        showError('[data-time-error]', 'Choisissez une heure pour continuer.');
        return;
      }
      state.time = selected.value;
      state.maxStep = Math.max(state.maxStep, 4);
      updateSummary();
      setStep(4);
    }
  }

  function goBack() {
    if (state.step > 1) setStep(state.step - 1);
  }

  function validFrenchMobile(value) {
    const compact = value.replace(/[ .()\-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }

  function finishDemo(event) {
    event.preventDefault();
    const nameInput = one('input[name="prenom"]', form);
    const phoneInput = one('input[name="telephone"]', form);
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    clearError('#name-error', 'input[name="prenom"]');
    clearError('#phone-error', 'input[name="telephone"]');
    if (!name) {
      showError('#name-error', 'Indiquez votre prénom.', 'input[name="prenom"]');
      return;
    }
    if (!validFrenchMobile(phone)) {
      showError('#phone-error', 'Saisissez un numéro de portable français à 10 chiffres, commençant par 06 ou 07.', 'input[name="telephone"]');
      return;
    }
    state.name = name;
    state.phone = phone;
    const day = dates.find((item) => item.iso === state.day);
    successSummary.textContent = `${name}, ${serviceName.toLocaleLowerCase('fr-FR')} · ${dateLabel(day.date)} à ${timeLabel(Number(state.time))}.`;
    panel.hidden = true;
    progress.hidden = true;
    success.hidden = false;
    live.textContent = 'Récapitulatif de démonstration affiché. Aucune réservation n’a été transmise.';
    one('#success-title', success).focus({ preventScroll: true });
  }

  function restartDemo() {
    form.reset();
    state.step = 1;
    state.maxStep = 1;
    state.day = null;
    state.time = null;
    state.name = '';
    state.phone = '';
    many('.date-option', dateOptions).forEach((label) => label.classList.remove('is-selected'));
    many('.time-option input', timeOptions).forEach((input) => { input.checked = false; });
    success.hidden = true;
    progress.hidden = false;
    panel.hidden = false;
    updateSummary();
    setStep(1);
  }

  function initBooking() {
    if (!form) return;
    renderDates();
    dateOptions.addEventListener('change', onDateChange);
    steps.forEach((item) => { item.hidden = Number(item.dataset.step) !== 1; });
    updateSummary();
    form.addEventListener('click', (event) => {
      const next = event.target.closest('[data-next]');
      const back = event.target.closest('[data-back]');
      if (next) goForward();
      if (back) goBack();
    });
    many('[data-go-step]').forEach((button) => button.addEventListener('click', () => {
      if (!button.disabled) setStep(Number(button.dataset.goStep));
    }));
    form.addEventListener('change', (event) => {
      if (event.target.matches('input[name="heure"]')) {
        state.time = event.target.value;
        one('[data-time-error]').hidden = true;
        updateSummary();
      }
      if (event.target.matches('input[name="prestation"]')) updateSummary();
    });
    form.addEventListener('input', (event) => {
      if (event.target.name === 'prenom') clearError('#name-error', 'input[name="prenom"]');
      if (event.target.name === 'telephone') clearError('#phone-error', 'input[name="telephone"]');
    });
    form.addEventListener('submit', finishDemo);
    one('[data-restart]').addEventListener('click', restartDemo);
  }

  function initRevealMotion() {
    const hero = one('.hero');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => hero && hero.classList.add('is-ready')));
    const revealTargets = many('[data-reveal]');
    revealTargets.filter((item) => item.dataset.reveal === 'visit').forEach((item, index) => {
      item.style.transitionDelay = `${index * 55}ms`;
    });
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: .22, rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((item) => observer.observe(item));
  }

  function initMobileBar() {
    const bar = one('[data-mobile-bar]');
    if (!bar) return;
    if (!('IntersectionObserver' in window)) {
      bar.classList.add('is-visible');
      bar.setAttribute('aria-hidden', 'false');
      bar.removeAttribute('inert');
      return;
    }
    const stateSeen = { hero: true, booking: false, footer: false };
    const update = () => {
      const visible = !stateSeen.hero && !stateSeen.booking && !stateSeen.footer;
      bar.classList.toggle('is-visible', visible);
      bar.setAttribute('aria-hidden', String(!visible));
      bar.toggleAttribute('inert', !visible);
    };
    const watch = (selector, key) => {
      const element = one(selector);
      if (!element) return;
      const observer = new IntersectionObserver(([entry]) => {
        stateSeen[key] = entry.isIntersecting;
        update();
      }, { threshold: .01 });
      observer.observe(element);
    };
    watch('.hero', 'hero');
    watch('.booking', 'booking');
    watch('.site-footer', 'footer');
  }

  initBooking();
  initRevealMotion();
  initMobileBar();
  window.__site = true;
})();
