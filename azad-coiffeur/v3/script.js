(() => {
  'use strict';

  const doc = document;
  const form = doc.querySelector('#booking-form');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const NB = '\u00a0';
  const hours = { 0: null, 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const timeSamples = [540, 660, 780, 900, 1020, 1080];
  const state = { step: 1, day: null, time: null, name: '', confirmed: false };
  let panelTimer = 0;
  let isTransitioning = false;

  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fullDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return {
      year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
      minute: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }
  function parisToday() {
    const now = parisNow();
    return new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
  }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function parseKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hour}${NB}h${NB}${String(remainder).padStart(2, '0')}` : `${hour}${NB}h`;
  }
  function ordinalWeekday(date) { return date.getUTCDay(); }

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
  function closedPublicHoliday(date) {
    const year = date.getUTCFullYear();
    const fixed = [`${year}-01-01`, `${year}-05-01`, `${year}-05-08`, `${year}-07-14`, `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`];
    if (fixed.includes(dateKey(date))) return true;
    const easter = easterSunday(year);
    const movable = [1, 39, 50].map((offset) => dateKey(new Date(easter.getTime() + offset * 864e5)));
    return movable.includes(dateKey(date));
  }

  function isOpenDate(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const date = parseKey(key);
    const offset = Math.round((date.getTime() - parisToday().getTime()) / 864e5);
    const day = ordinalWeekday(date);
    return dateKey(date) === key && offset >= 0 && offset < 14 && Boolean(hours[day]) && !closedPublicHoliday(date);
  }
  function isValidTime(key, minutes) {
    if (!isOpenDate(key) || !timeSamples.includes(minutes)) return false;
    const now = parisNow();
    return key !== dateKey(parisToday()) || minutes > now.minute;
  }
  function restoreStateFromLocation() {
    const parameters = new URLSearchParams(window.location.search);
    state.step = 1;
    state.day = null;
    state.time = null;
    state.confirmed = false;
    if (parameters.get('parcours') !== '1') return;

    const requestedStep = parameters.get('etape') === 'confirmation' ? 3 : Number(parameters.get('etape'));
    const requestedDay = parameters.get('jour') || '';
    const requestedTime = Number(parameters.get('heure'));
    if (isOpenDate(requestedDay)) state.day = requestedDay;
    if (state.day && isValidTime(state.day, requestedTime)) state.time = requestedTime;
    if (requestedStep >= 2 && requestedStep <= 3 && state.day) state.step = requestedStep;
    if (state.step === 3 && state.time === null) state.step = 2;
    if (parameters.get('etape') === 'confirmation' && state.step === 3 && state.time !== null) state.confirmed = true;
  }
  function writeHistory(push) {
    const parameters = new URLSearchParams();
    parameters.set('parcours', '1');
    parameters.set('etape', state.confirmed ? 'confirmation' : String(state.step));
    if (state.day) parameters.set('jour', state.day);
    if (state.time !== null) parameters.set('heure', String(state.time));
    const url = `${window.location.pathname}?${parameters.toString()}${window.location.hash}`;
    const details = { azad: true, etape: parameters.get('etape'), jour: state.day, heure: state.time };
    if (push) window.history.pushState(details, '', url);
    else window.history.replaceState(details, '', url);
  }
  function prepareHistory() {
    const requestedStep = state.step;
    const requestedDay = state.day;
    const requestedTime = state.time;
    const requestedConfirmation = state.confirmed;
    if (window.history.state && window.history.state.azad) {
      writeHistory(false);
      return;
    }
    state.step = 1;
    state.day = requestedDay;
    state.time = null;
    state.confirmed = false;
    writeHistory(false);
    if (requestedStep >= 2 && requestedDay) {
      state.step = 2;
      state.time = requestedTime;
      writeHistory(true);
    }
    if (requestedStep >= 3 && requestedTime !== null) {
      state.step = 3;
      writeHistory(true);
    }
    if (requestedConfirmation) {
      state.confirmed = true;
      writeHistory(true);
    }
    state.step = requestedStep;
    state.day = requestedDay;
    state.time = requestedTime;
    state.confirmed = requestedConfirmation;
  }

  function addChoice(container, { id, name, value, label, ariaLabel, disabled, className, secondary }) {
    const wrapper = doc.createElement('label');
    wrapper.className = className;
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id;
    input.value = value;
    input.disabled = Boolean(disabled);
    if (ariaLabel) input.setAttribute('aria-label', ariaLabel);
    const primary = doc.createElement('span');
    primary.className = className === 'day-choice' ? 'day-name' : 'time-label';
    primary.textContent = label;
    wrapper.append(input, primary);
    if (secondary) {
      const extra = doc.createElement('span');
      extra.className = secondary.className;
      extra.textContent = secondary.text;
      wrapper.append(extra);
    }
    container.append(wrapper);
    return input;
  }

  function renderDays() {
    const container = $('[data-days]');
    container.replaceChildren();
    const today = parisToday();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(today.getTime() + index * 864e5);
      const day = ordinalWeekday(date);
      const isHoliday = closedPublicHoliday(date);
      const closed = !hours[day] || isHoliday;
      const key = dateKey(date);
      const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(date).replace('.', '');
      const name = index === 0 ? 'Auj.' : index === 1 ? 'Demain' : weekday;
      const fullName = fullDate.format(date);
      const input = addChoice(container, {
        id: `jour-${key}`, name: 'jour', value: key, label: name,
        ariaLabel: `${fullName}${closed ? ', fermé' : ''}`,
        disabled: closed, className: 'day-choice',
        secondary: { className: closed ? 'day-closed' : 'day-number', text: closed ? 'fermé' : String(date.getUTCDate()) }
      });
      input.checked = state.day === key;
      input.addEventListener('change', () => {
        state.day = key;
        state.time = null;
        updateSummary();
        writeHistory(false);
        clearError('[data-day-error]');
      });
    }
  }

  function renderTimes() {
    const container = $('[data-times]');
    container.replaceChildren();
    const selectedDate = state.day ? parseKey(state.day) : null;
    if (!selectedDate) return;
    const groups = [
      { min: 0, max: 720, title: 'Matin' },
      { min: 720, max: 1020, title: 'Après-midi' },
      { min: 1020, max: 1440, title: 'Soir' }
    ].map((group) => {
      const section = doc.createElement('div');
      section.className = 'time-group';
      const heading = doc.createElement('h4');
      heading.textContent = group.title;
      const options = doc.createElement('div');
      options.className = 'time-options';
      section.append(heading, options);
      container.append(section);
      return { ...group, options };
    });
    const today = parisToday();
    const isToday = dateKey(selectedDate) === dateKey(today);
    const now = parisNow();
    if (isToday && state.time !== null && state.time <= now.minute) {
      state.time = null;
      writeHistory(false);
    }
    let available = 0;
    for (const minutes of timeSamples) {
      const past = isToday && minutes <= now.minute;
      const value = String(minutes);
      const group = groups.find((item) => minutes >= item.min && minutes < item.max);
      const input = addChoice(container, {
        id: `heure-${value}`, name: 'heure', value,
        label: timeLabel(minutes), ariaLabel: timeLabel(minutes), disabled: past,
        className: 'time-choice'
      });
      input.checked = state.time === minutes;
      group.options.append(input.parentElement);
      input.addEventListener('change', () => {
        state.time = minutes;
        updateSummary();
        writeHistory(false);
        clearError('[data-time-error]');
      });
      if (!past) available += 1;
    }
    const emptyMessage = $('[data-times-empty]');
    if (emptyMessage) emptyMessage.hidden = available > 0;
    updateSummary();
  }

  function updateSummary() {
    $('[data-summary-day]').textContent = state.day ? fullDate.format(parseKey(state.day)) : 'À choisir';
    $('[data-summary-time]').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('[data-summary-name]').textContent = state.name || 'À compléter';
    $$('[data-edit-step]').forEach((button) => { button.hidden = state.confirmed || state.step <= Number(button.dataset.editStep); });
  }
  function setLive(message) { $('[data-live]').textContent = message; }
  function stepMessage(step) {
    return ['', 'Choix du jour · premier temps.', 'Choix de l’horaire · deuxième temps.', 'Coordonnées · dernier temps.'][step];
  }
  function successMessage() {
    const name = state.name ? ` Prénom : ${state.name}.` : '';
    return `Votre sélection : ${fullDate.format(parseKey(state.day))} à ${timeLabel(state.time)}.${name} C’était une simulation ; rien n’a été envoyé au salon.`;
  }
  function clearError(selector) { const item = $(selector); if (item) item.textContent = ''; }
  function setStepError(selector, message) { $(selector).textContent = message; }

  function goToStep(nextStep, pushHistory = true) {
    if (isTransitioning || nextStep === state.step) return;
    const current = $(`[data-step="${state.step}"]`, form);
    const next = $(`[data-step="${nextStep}"]`, form);
    if (!current || !next) return;
    window.clearTimeout(panelTimer);
    isTransitioning = true;
    const finish = () => {
      current.hidden = true;
      current.classList.remove('is-leaving');
      next.hidden = false;
      next.classList.add('is-entering');
      requestAnimationFrame(() => next.classList.remove('is-entering'));
      state.step = nextStep;
      state.confirmed = false;
      writeHistory(pushHistory);
      setLive(stepMessage(nextStep));
      const heading = $('.step-title', next);
      $('[data-success]').hidden = true;
      updateSummary();
      if (heading) heading.focus({ preventScroll: true });
      isTransitioning = false;
    };
    if (prefersReduced.matches) {
      finish();
      return;
    }
    current.classList.add('is-leaving');
    panelTimer = window.setTimeout(finish, 220);
  }

  function validateMobile(value) {
    const cleaned = value.trim().replace(/[\s().-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(cleaned);
  }

  function handleNext() {
    if (state.step === 1) {
      if (!state.day) {
        setStepError('[data-day-error]', 'Choisissez un jour ouvert pour continuer.');
        return;
      }
      renderTimes();
      goToStep(2);
      return;
    }
    if (state.step === 2) {
      if (state.time === null) {
        setStepError('[data-time-error]', 'Choisissez un horaire indicatif pour continuer.');
        return;
      }
      goToStep(3);
    }
  }

  function finishSimulation(event) {
    event.preventDefault();
    const name = $('#prenom').value.trim();
    const phone = $('#telephone').value.trim();
    let valid = true;
    clearError('[data-name-error]');
    clearError('[data-phone-error]');
    if (!name) {
      setStepError('[data-name-error]', 'Saisissez un prénom pour compléter la simulation.');
      valid = false;
    }
    if (!validateMobile(phone)) {
      setStepError('[data-phone-error]', 'Saisissez un numéro de mobile français valide.');
      valid = false;
    }
    if (!valid) {
      const firstError = $('[data-name-error]').textContent ? $('#prenom') : $('#telephone');
      firstError.focus();
      return;
    }
    state.name = name;
    state.confirmed = true;
    updateSummary();
    const panels = $$('[data-step]', form);
    panels.forEach((panel) => { panel.hidden = true; panel.classList.remove('is-leaving', 'is-entering'); });
    const success = $('[data-success]');
    success.hidden = false;
    success.classList.add('is-entering');
    requestAnimationFrame(() => success.classList.remove('is-entering'));
    $('[data-success-copy]').textContent = successMessage();
    writeHistory(true);
    setLive('Simulation terminée. Rien n’a été envoyé au salon.');
    $('[data-success-heading]').focus({ preventScroll: true });
  }

  function resetSimulation() {
    window.clearTimeout(panelTimer);
    form.reset();
    state.step = 1;
    state.day = null;
    state.time = null;
    state.name = '';
    state.confirmed = false;
    $$('[data-step]', form).forEach((panel) => {
      panel.hidden = panel.dataset.step !== '1';
      panel.classList.remove('is-leaving', 'is-entering');
    });
    $('[data-success]').hidden = true;
    $$('[data-day-error], [data-time-error], [data-name-error], [data-phone-error]').forEach((error) => { error.textContent = ''; });
    updateSummary();
    isTransitioning = false;
    writeHistory(false);
    setLive(stepMessage(1));
    $('#titre-etape-jour').focus({ preventScroll: true });
  }

  function applyHistoryState() {
    const oldStep = state.step;
    const oldConfirmed = state.confirmed;
    window.clearTimeout(panelTimer);
    isTransitioning = false;
    restoreStateFromLocation();
    renderDays();
    if (state.step >= 2 && !state.confirmed) renderTimes();
    updateSummary();
    setLive(state.confirmed ? 'Simulation terminée. Rien n’a été envoyé au salon.' : stepMessage(state.step));

    const panels = $$('[data-step]', form);
    const success = $('[data-success]');
    if (state.confirmed) {
      panels.forEach((panel) => { panel.hidden = true; panel.classList.remove('is-leaving', 'is-entering'); });
      success.hidden = false;
      $('[data-success-copy]').textContent = successMessage();
      success.classList.add('is-entering');
      requestAnimationFrame(() => success.classList.remove('is-entering'));
      $('[data-success-heading]').focus({ preventScroll: true });
      return;
    }

    success.hidden = true;
    const next = $(`[data-step="${state.step}"]`, form);
    const current = oldConfirmed ? null : $(`[data-step="${oldStep}"]`, form);
    if (current && next && current !== next && !prefersReduced.matches) {
      current.classList.add('is-leaving');
      isTransitioning = true;
      panelTimer = window.setTimeout(() => {
        current.hidden = true;
        current.classList.remove('is-leaving');
        next.hidden = false;
        next.classList.add('is-entering');
        requestAnimationFrame(() => next.classList.remove('is-entering'));
        $('.step-title', next).focus({ preventScroll: true });
        isTransitioning = false;
      }, 220);
      return;
    }
    panels.forEach((panel) => { panel.hidden = panel !== next; panel.classList.remove('is-leaving', 'is-entering'); });
    if (next) {
      next.classList.add('is-entering');
      requestAnimationFrame(() => next.classList.remove('is-entering'));
      $('.step-title', next).focus({ preventScroll: true });
    }
  }

  function setupBooking() {
    if (!form) return;
    restoreStateFromLocation();
    prepareHistory();
    renderDays();
    if (state.step >= 2 && !state.confirmed) renderTimes();
    updateSummary();
    $('[aria-labelledby="titre-selection"]').hidden = false;
    form.hidden = false;
    $$('[data-step]', form).forEach((panel) => { panel.hidden = state.confirmed || Number(panel.dataset.step) !== state.step; });
    $('[data-success]').hidden = !state.confirmed;
    if (state.confirmed) $('[data-success-copy]').textContent = successMessage();
    setLive(state.confirmed ? 'Simulation terminée. Rien n’a été envoyé au salon.' : stepMessage(state.step));
    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-next]')) handleNext();
      if (event.target.closest('[data-previous]')) window.history.back();
      if (event.target.closest('[data-reset]')) resetSimulation();
    });
    $('[aria-labelledby="titre-selection"]').addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-step]');
      if (button) goToStep(Number(button.dataset.editStep), false);
    });
    $('#prenom').addEventListener('input', () => {
      state.name = $('#prenom').value.trim();
      updateSummary();
    });
    form.addEventListener('submit', finishSimulation);
    window.addEventListener('popstate', applyHistoryState);
  }

  function setupReveals() {
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || prefersReduced.matches) {
      items.forEach((item) => item.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    items.forEach((item) => observer.observe(item));
  }

  function setupMobileBar() {
    const bar = $('[data-mobile-bar]');
    if (!bar || !('IntersectionObserver' in window)) {
      if (bar) {
        bar.classList.add('is-visible');
        bar.inert = false;
        bar.setAttribute('aria-hidden', 'false');
      }
      return;
    }
    const stateVisible = { hero: true, footer: false };
    bar.inert = true;
    bar.setAttribute('aria-hidden', 'true');
    const update = () => {
      const visible = !stateVisible.hero && !stateVisible.footer;
      bar.classList.toggle('is-visible', visible);
      bar.inert = !visible;
      bar.setAttribute('aria-hidden', String(!visible));
    };
    const observe = (selector, key) => {
      const target = $(selector);
      if (!target) return;
      const observer = new IntersectionObserver(([entry]) => {
        stateVisible[key] = entry.isIntersecting;
        update();
      }, { threshold: 0 });
      observer.observe(target);
    };
    observe('.hero-actions', 'hero');
    observe('.site-footer', 'footer');
  }

  function startEntrance() {
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  }

  setupBooking();
  setupReveals();
  setupMobileBar();
  startEntrance();
})();
window.__azad = true;
