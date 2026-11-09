/* ILIASS coiffure — simulation locale, aucune transmission, aucun stockage. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const services = {
    femme: 'Coupe femme', homme: 'Coupe homme', enfant: 'Coupe enfant',
    coloration: 'Coloration', meches: 'Mèches', chignon: 'Chignon'
  };
  // PagesJaunes et Fresha : mardi au samedi, deux plages. Aucune durée publiée.
  const hours = { 0: [], 1: [], 2: [[540, 750], [840, 1140]], 3: [[540, 750], [840, 1140]], 4: [[540, 750], [840, 1140]], 5: [[540, 750], [840, 1140]], 6: [[540, 750], [840, 1140]] };
  const state = { step: 0, reached: 0, service: '', day: '', time: null, complete: false };
  let keyboardAction = false;
  let motionFrame = 0;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function dateLabel(key, compact = false) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: compact ? 'short' : 'long', day: 'numeric', month: compact ? 'short' : 'long'
    }).format(dateFromKey(key));
  }
  function timeLabel(minute) {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function holiday(key) {
    const year = dateFromKey(key).getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key.slice(5))) return true;
    // Calcul grégorien de Pâques, puis lundi de Pâques, Ascension et lundi de Pentecôte.
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 12));
    return [1, 39, 50].some(offset => {
      const date = new Date(easter);
      date.setUTCDate(date.getUTCDate() + offset);
      return dateKey(date) === key;
    });
  }
  function proposedTimes(key, now = parisNow()) {
    const periods = hours[dateFromKey(key).getUTCDay()];
    return periods.flatMap(([start, end]) => {
      const times = [];
      for (let minute = start; minute < end; minute += 30) {
        times.push({ minute, past: key < now.key || (key === now.key && minute <= now.minute) });
      }
      return times;
    });
  }

  document.addEventListener('keydown', () => { keyboardAction = true; root.classList.add('keyboard-mode'); }, true);
  document.addEventListener('pointerdown', () => { keyboardAction = false; root.classList.remove('keyboard-mode'); }, true);

  function revealJourney() {
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('hero-ready')));
    const nodes = $$('.path-node');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: .08, rootMargin: '0px 0px -35px 0px' });
      nodes.forEach(node => observer.observe(node));
    } else {
      nodes.forEach(node => node.classList.add('is-visible'));
    }

    const rail = $('.journey-rail');
    const progress = $('.journey-progress');
    const journey = $('.journey');
    const endMarker = $('.end-marker');
    let drawn = 0;

    function updateRail() {
      motionFrame = 0;
      if (reduceMotion.matches) return;
      const box = rail.getBoundingClientRect();
      const next = Math.max(0, Math.min(1, (window.innerHeight * .74 - box.top) / box.height));
      drawn = Math.max(drawn, next);
      progress.style.transform = `scaleY(${Math.max(.0001, drawn)})`;
    }
    function queueRail() {
      if (!motionFrame) motionFrame = requestAnimationFrame(updateRail);
    }
    function measureRail() {
      const journeyBox = journey.getBoundingClientRect();
      const endBox = endMarker.getBoundingClientRect();
      const railTop = parseFloat(getComputedStyle(rail).top);
      rail.style.height = `${Math.max(1, endBox.top + endBox.height / 2 - journeyBox.top - railTop)}px`;
      rail.style.bottom = 'auto';
      queueRail();
    }
    window.addEventListener('scroll', queueRail, { passive: true });
    window.addEventListener('resize', measureRail, { passive: true });
    reduceMotion.addEventListener('change', () => { progress.style.transform = ''; queueRail(); });
    measureRail();
    if (document.fonts) document.fonts.ready.then(measureRail);
  }

  const form = $('#booking-form');
  const steps = $$('.booking-step');
  const stepButtons = $$('[data-goto]');
  const announcement = $('#booking-announcement');
  const errorIds = ['erreur-prestation', 'erreur-jour', 'erreur-heure'];
  let transitionFrame = 0;

  function setError(id, message = '') { document.getElementById(id).textContent = message; }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? services[state.service] : 'À choisir';
    $('#summary-day').textContent = state.day ? dateLabel(state.day, true) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    const recap = state.service && state.day && state.time !== null ? `${services[state.service]} · ${dateLabel(state.day)} à ${timeLabel(state.time)}. Horaire souhaité, à confirmer par téléphone.` : '';
    $('#final-recap').textContent = recap;
  }
  function setStep(index, focus = true) {
    if (transitionFrame) cancelAnimationFrame(transitionFrame);
    const back = index < state.step;
    state.step = index;
    state.reached = Math.max(index, state.reached);
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      step.classList.remove('entering', 'entering-back');
    });
    stepButtons.forEach((button, i) => {
      button.disabled = i > state.reached;
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    const active = steps[index];
    if (!reduceMotion.matches && !keyboardAction && focus) {
      active.classList.add('entering');
      if (back) active.classList.add('entering-back');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => {
          active.classList.remove('entering', 'entering-back');
          transitionFrame = 0;
        });
      });
    }
    updateSummary();
    if (focus) {
      const heading = $('h3', active);
      heading.focus({ preventScroll: true });
      const rect = heading.getBoundingClientRect();
      if (rect.top < 24 || rect.top > window.innerHeight - 200) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      announcement.textContent = `Étape ${index + 1} sur 4. ${heading.textContent}`;
    }
  }
  function makeRadio(name, value, disabled, checked, label) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', label);
    input.setAttribute('aria-describedby', name === 'jour' ? 'erreur-jour' : 'heure-note erreur-heure');
    return input;
  }
  function renderDays() {
    const fieldset = $('#day-choices');
    $$('label, .holiday-note', fieldset).forEach(element => element.remove());
    const now = parisNow();
    const today = dateFromKey(now.key);
    let hasHoliday = false;
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = dateKey(date);
      const closed = hours[date.getUTCDay()].length === 0;
      const past = !closed && !proposedTimes(key, now).some(time => !time.past);
      const isHoliday = holiday(key);
      hasHoliday ||= isHoliday && !closed;
      const label = document.createElement('label');
      label.className = 'choice';
      const status = closed ? 'Fermé' : past ? 'Terminé' : isHoliday ? 'Férié*' : '';
      label.append(makeRadio('jour', key, closed || past, state.day === key, `${dateLabel(key)}${status ? `, ${isHoliday && !closed && !past ? 'jour férié, ouverture à confirmer' : status}` : ''}`));
      const body = document.createElement('span'); body.className = 'choice-body'; body.setAttribute('aria-hidden', 'true');
      const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      [['choice-weekday', weekday], ['choice-date', String(date.getUTCDate())], ['choice-month', month], ['choice-status', status]].forEach(([className, text]) => {
        const span = document.createElement('span'); span.className = className; span.textContent = text; body.append(span);
      });
      label.append(body); fieldset.append(label);
    }
    if (hasHoliday) {
      const note = document.createElement('p'); note.className = 'holiday-note';
      note.textContent = '* Jour férié\u00a0: ouverture à confirmer par téléphone.'; fieldset.append(note);
    }
  }
  function renderTimes() {
    const fieldset = $('#time-choices');
    $$('label, .time-period, .holiday-note', fieldset).forEach(element => element.remove());
    if (!state.day) return;
    const times = proposedTimes(state.day);
    let period = '';
    times.forEach(({ minute, past }) => {
      const currentPeriod = minute < 780 ? 'Le matin' : 'L’après-midi';
      if (period !== currentPeriod) {
        const caption = document.createElement('p'); caption.className = 'time-period'; caption.textContent = currentPeriod;
        fieldset.append(caption); period = currentPeriod;
      }
      const label = document.createElement('label'); label.className = 'choice';
      label.append(makeRadio('heure', String(minute), past, state.time === minute, `${timeLabel(minute)}${past ? ', heure passée' : ', heure souhaitée'}`));
      const body = document.createElement('span'); body.className = 'choice-body'; body.textContent = timeLabel(minute); body.setAttribute('aria-hidden', 'true');
      label.append(body); fieldset.append(label);
    });
    if (!times.some(time => !time.past)) {
      const message = document.createElement('p'); message.className = 'holiday-note'; message.textContent = 'Plus d’heure proposée pour ce jour. Revenez au choix du jour.';
      fieldset.append(message);
    }
  }
  function validateStep(index) {
    let valid = true;
    if (index === 0 && !state.service) { setError(errorIds[0], 'Choisissez une prestation pour continuer.'); valid = false; }
    if (index === 1 && (!state.day || !proposedTimes(state.day).some(time => !time.past))) { setError(errorIds[1], 'Choisissez un jour proposé pour continuer.'); valid = false; }
    if (index === 2 && (state.time === null || !proposedTimes(state.day).some(time => time.minute === state.time && !time.past))) { setError(errorIds[2], 'Choisissez une heure souhaitée encore proposée.'); valid = false; }
    if (!valid) {
      const first = $('input:not(:disabled)', steps[index]);
      if (first) first.focus();
    }
    return valid;
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') { state.service = input.value; setError(errorIds[0]); }
    if (input.name === 'jour') {
      if (state.day !== input.value) { state.time = null; state.reached = Math.min(state.reached, 2); }
      state.day = input.value; setError(errorIds[1]);
    }
    if (input.name === 'heure') { state.time = Number(input.value); setError(errorIds[2]); }
    updateSummary();
    stepButtons.forEach((button, i) => { button.disabled = i > state.reached; });
  });
  $$('input[name="prestation"]').forEach(input => input.setAttribute('aria-describedby', 'erreur-prestation'));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (validateStep(state.step)) setStep(Number(button.dataset.next));
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.goto);
    for (let i = 0; i < target; i++) {
      if (!validateStep(i)) { setStep(i); return; }
    }
    setStep(target);
  }));

  function validateField(input) {
    const value = input.value.trim();
    let message = '';
    if (input.id === 'prenom' && !value) message = 'Saisissez un prénom pour terminer l’essai.';
    if (input.id === 'telephone' && !/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(value.replace(/[\s.()\-]/g, ''))) message = 'Saisissez un numéro français valide (10 chiffres, ou indicatif +33).';
    setError(`erreur-${input.id}`, message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }
  [$('#prenom'), $('#telephone')].forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); setError(`erreur-${input.id}`); }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { if (validateStep(state.step)) setStep(state.step + 1); return; }
    for (let i = 0; i < 3; i++) {
      if (!validateStep(i)) { setStep(i); return; }
    }
    const inputs = [$('#prenom'), $('#telephone')];
    const results = inputs.map(validateField);
    if (results.some(valid => !valid)) { inputs[results.indexOf(false)].focus(); return; }
    state.complete = true;
    $('#success-recap').textContent = `Votre essai\u00a0: ${services[state.service]}, ${dateLabel(state.day)} à ${timeLabel(state.time)}. Cet horaire est à confirmer par téléphone.`;
    form.hidden = true;
    $('.booking-steps').hidden = true;
    $('#booking-success').hidden = false;
    $('#titre-resultat').focus({ preventScroll: true });
    $('#titre-resultat').scrollIntoView({ block: 'center', behavior: 'instant' });
    announcement.textContent = 'Essai terminé. Rien n’a été envoyé et aucun rendez-vous n’est réservé.';
  });
  function restart() {
    form.reset();
    Object.assign(state, { step: 0, reached: 0, service: '', day: '', time: null, complete: false });
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    form.hidden = false; $('.booking-steps').hidden = false; $('#booking-success').hidden = true;
    setStep(0);
  }
  $('#restart').addEventListener('click', restart);
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (state.complete) restart();
    state.service = button.dataset.service;
    $(`input[name="prestation"][value="${state.service}"]`).checked = true;
    setError(errorIds[0]);
    setStep(0, false);
    $('#rendez-vous').scrollIntoView({ block: 'start', behavior: reduceMotion.matches || keyboardAction ? 'instant' : 'smooth' });
    $('#titre-etape-0').focus({ preventScroll: true });
    announcement.textContent = `${services[state.service]} sélectionnée pour la simulation. Choisissez le jour pour continuer.`;
  }));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.complete) return;
    if (state.day && !proposedTimes(state.day).some(time => !time.past)) { state.day = ''; state.time = null; state.reached = 1; setStep(1, false); }
    else if (state.time !== null && !proposedTimes(state.day).some(time => time.minute === state.time && !time.past)) { state.time = null; state.reached = 2; setStep(2, false); }
  });

  function mobileActions() {
    if (!('IntersectionObserver' in window)) return;
    const bar = $('.mobile-bar');
    const visibility = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      bar.classList.toggle('is-hidden', [...visibility.values()].some(Boolean));
    }, { threshold: 0, rootMargin: '0px 0px -70px 0px' });
    ['.hero-actions', '.booking-node', '.site-footer'].forEach(selector => observer.observe($(selector)));
  }

  // L’outil est prêt avant d’activer les états visuels progressifs.
  $('#module-rendez-vous').hidden = false;
  setStep(0, false);
  revealJourney();
  mobileActions();
})();
