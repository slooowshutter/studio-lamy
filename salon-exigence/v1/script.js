(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  let motion = null;
  const summaryMotions = new Map();
  document.addEventListener('keydown', () => {
    keyboard = true;
    document.documentElement.classList.add('clavier');
    if (motion) motion.cancel();
    summaryMotions.forEach(animation => animation.cancel());
    summaryMotions.clear();
  }, { passive: true });
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('clavier'); }, { passive: true });

  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        entry.target.style.transitionDelay = entry.target.dataset.reveal === 'ligne' ? `${index * 60}ms` : '0ms';
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1 });
    revealElements.forEach(element => observer.observe(element));
  } else { revealElements.forEach(element => element.classList.add('is-visible')); }

  const mobileBar = $('.mobile-bar');
  const visibleAreas = { hero: true, booking: false, footer: false };
  if ('IntersectionObserver' in window) {
    [['hero', '#actions-hero'], ['booking', '#simulation'], ['footer', '#pied']].forEach(([key, selector]) => {
      new IntersectionObserver(([entry]) => {
        visibleAreas[key] = entry.isIntersecting;
        mobileBar.hidden = visibleAreas.hero || visibleAreas.booking || visibleAreas.footer;
      }).observe($(selector));
    });
  }

  const services = {
    'dessus': 'Lissage brésilien Urban Keratin · dessus de tête',
    'mi-longs': 'Lissage brésilien Urban Keratin · cheveux mi-longs',
    'longs': 'Lissage brésilien Urban Keratin · cheveux longs',
    'brushing': 'Shampoing + brushing',
    'coupe': 'Shampoing + coupe + brushing'
  };
  const form = $('#booking-form');
  const panels = $$('[data-panel]', form);
  const stepButtons = $$('[data-step]', form);
  const live = $('#booking-live');
  const state = { step: 0, service: '', day: '', time: null, complete: false };
  const nb = '\u00a0';
  const parisDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function nowInParis() {
    const instant = new Date();
    const parts = Object.fromEntries(parisDate.formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    const clock = Object.fromEntries(parisClock.formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(clock.hour) * 60 + Number(clock.minute) };
  }
  function dateFor(iso) { return new Date(`${iso}T12:00:00Z`); }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}${nb}h${minutes % 60 ? nb + String(minutes % 60).padStart(2, '0') : ''}`; }
  function dayOpen(iso) { const weekday = dateFor(iso).getUTCDay(); return weekday >= 2 && weekday <= 6; }
  function possibleTimes(iso) {
    if (!dayOpen(iso)) return [];
    const now = nowInParis();
    // Heures de début d’essai uniquement, sans durée ni disponibilité inventée.
    return Array.from({ length: 19 }, (_, index) => 540 + index * 30).map(minutes => ({ minutes, past: iso < now.iso || (iso === now.iso && minutes <= now.minutes) }));
  }
  const startDate = nowInParis().iso;
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = dateFor(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    return { date, iso: date.toISOString().slice(0, 10) };
  });
  const make = (tag, content, className) => {
    const element = document.createElement(tag);
    if (content !== undefined) element.textContent = content;
    if (className) element.className = className;
    return element;
  };
  function renderDays() {
    const container = $('#day-options');
    $$('label', container).forEach(label => label.remove());
    days.forEach(({ date, iso }) => {
      const label = make('label');
      const input = make('input');
      const open = dayOpen(iso);
      const pastDay = iso < nowInParis().iso;
      const exhausted = open && possibleTimes(iso).every(slot => slot.past);
      input.type = 'radio'; input.name = 'jour'; input.value = iso;
      input.disabled = !open || pastDay || exhausted;
      input.checked = state.day === iso;
      const suffix = !open ? (date.getUTCDay() === 1 ? ', fermé, à confirmer' : ', fermé') : pastDay || exhausted ? ', passé' : ', jour d’essai';
      input.setAttribute('aria-label', longDate.format(date) + suffix);
      input.setAttribute('aria-describedby', 'erreur-jour');
      label.append(input, make('span', shortDay.format(date)), make('strong', String(date.getUTCDate())), make('span', shortMonth.format(date)), make('small', !open ? 'Fermé' : pastDay || exhausted ? 'Passé' : 'Essai'));
      container.append(label);
    });
  }
  function renderTimes() {
    const container = $('#time-options');
    $$('label', container).forEach(label => label.remove());
    possibleTimes(state.day).forEach(({ minutes, past }) => {
      const label = make('label');
      const input = make('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(minutes);
      input.disabled = past;
      input.checked = state.time === minutes;
      input.setAttribute('aria-label', `${timeLabel(minutes)}, ${past ? 'heure passée' : 'heure de début d’essai'}`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      label.append(input, make('span', timeLabel(minutes)));
      container.append(label);
    });
  }
  $$('input[name="prestation"]').forEach(input => input.setAttribute('aria-describedby', 'erreur-prestation'));
  function announce(message) { live.textContent = message; }
  function updateSummary() {
    const values = {
      'recap-service': state.service ? services[state.service] : 'À choisir',
      'recap-day': state.day ? longDate.format(dateFor(state.day)) : 'À choisir',
      'recap-time': state.time === null ? 'À choisir' : timeLabel(state.time)
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = $('#' + id);
      if (element.textContent !== value) {
        if (summaryMotions.has(element)) summaryMotions.get(element).cancel();
        element.textContent = value;
        if (!reduce.matches && !keyboard && element.animate) summaryMotions.set(element, element.animate([{ opacity: .3, transform: 'translateX(6px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' }));
      }
    });
    stepButtons.forEach((button, index) => {
      button.disabled = state.complete || (index === 1 && !state.service) || (index === 2 && (!state.service || !state.day)) || (index === 3 && (!state.service || !state.day || state.time === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function goTo(step, focus = true) {
    if (motion) { motion.cancel(); motion = null; }
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateSummary();
    const active = panels[step];
    if (!reduce.matches && !keyboard && active.animate) motion = active.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    if (focus) {
      const heading = $('h3', active);
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      if (bounds.top < 20 || bounds.bottom > window.innerHeight - 24) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    announce(step === 4 ? 'Essai terminé. Aucun rendez-vous pris, rien envoyé.' : `Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][step]}.`);
  }
  function errorFor(step, message) {
    const ids = ['prestation', 'jour', 'heure'];
    $('#erreur-' + ids[step]).textContent = message;
    const first = $('input:not(:disabled)', panels[step]);
    if (first) first.focus();
    announce(message);
  }
  function validateCurrent() {
    if (!state.service) { goTo(0, false); errorFor(0, 'Choisissez une prestation pour continuer.'); return false; }
    if (state.step >= 1 && (!state.day || !dayOpen(state.day) || !possibleTimes(state.day).some(slot => !slot.past))) {
      state.day = ''; state.time = null; goTo(1, false); errorFor(1, 'Choisissez un jour d’essai proposé.'); return false;
    }
    if (state.step >= 2 && !possibleTimes(state.day).some(slot => !slot.past && slot.minutes === state.time)) {
      state.time = null; goTo(2, false); errorFor(2, 'Choisissez une heure d’essai encore à venir.'); return false;
    }
    return true;
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (!['prestation', 'jour', 'heure'].includes(input.name)) return;
    if (input.name === 'prestation') {
      state.service = input.value;
      $('#erreur-prestation').textContent = '';
    }
    if (input.name === 'jour') {
      state.day = input.value; state.time = null;
      $('#erreur-jour').textContent = '';
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      $('#erreur-heure').textContent = '';
    }
    updateSummary();
    announce('Sélection : ' + [services[state.service], state.day ? longDate.format(dateFor(state.day)) : '', state.time === null ? '' : timeLabel(state.time)].filter(Boolean).join(', ') + '. Simulation uniquement.');
  });
  $$('[data-next]', form).forEach(button => button.addEventListener('click', () => { if (validateCurrent()) goTo(Number(button.dataset.next)); }));
  $$('[data-back]', form).forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  const firstName = $('#prenom');
  const phone = $('#telephone');
  function validateField(field) {
    const name = field === firstName;
    const normalized = field.value.replace(/[\s.()-]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
    const good = name ? field.value.trim().length >= 2 : /^0[67]\d{8}$/.test(normalized);
    const error = name ? $('#erreur-prenom') : $('#erreur-telephone');
    error.textContent = good ? '' : name ? 'Saisissez un prénom d’essai de deux caractères minimum.' : 'Saisissez dix chiffres commençant par 06 ou 07, ou le format +33.';
    field.setAttribute('aria-invalid', String(!good));
    return good;
  }
  [firstName, phone].forEach(field => {
    field.addEventListener('blur', () => { if (field.value || field.getAttribute('aria-invalid') === 'true') validateField(field); });
    field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || !validateCurrent()) return;
    const validName = validateField(firstName);
    const validPhone = validateField(phone);
    if (!validName || !validPhone) { (validName ? phone : firstName).focus(); announce('Vérifiez vos coordonnées d’essai.'); return; }
    $('#success-recap').textContent = `${services[state.service]}, ${longDate.format(dateFor(state.day))}, à ${timeLabel(state.time)}. Durée à confirmer avec le salon.`;
    // Ne conserver aucune coordonnée après l’essai.
    firstName.value = ''; phone.value = '';
    state.complete = true;
    goTo(4);
  });
  function reset() {
    form.reset();
    Object.assign(state, { step: 0, service: '', day: '', time: null, complete: false });
    $$('.error', form).forEach(element => { element.textContent = ''; });
    [firstName, phone].forEach(field => field.removeAttribute('aria-invalid'));
    $('#success-recap').textContent = '';
    goTo(0);
  }
  $('#restart').addEventListener('click', reset);
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (state.complete) reset();
    state.service = link.dataset.service;
    $(`input[name="prestation"][value="${state.service}"]`, form).checked = true;
    $('#erreur-prestation').textContent = '';
    window.history.replaceState(null, '', '#simulation');
    goTo(0);
  }));
  renderDays();
  updateSummary();
  $('#booking-interface').hidden = false;
  window.sitePret = true;
})();
