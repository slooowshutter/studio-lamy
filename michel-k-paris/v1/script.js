(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const status = document.querySelector('#booking-status');
  const serviceNames = {
    lissage: 'Lissage brésilien',
    brushing: 'Shampoing et brushing',
    coupe: 'Coupe, shampoing, soin et brushing femme'
  };
  const state = { step: 0, reached: 0, service: 'lissage', day: '', time: null };
  let keyboard = false;
  let entryFrame = 0;

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true, capture: true });

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const dateOf = key => new Date(`${key}T12:00:00Z`);
  const weekday = key => dateOf(key).getUTCDay();
  const isOpen = key => weekday(key) >= 2 && weekday(key) <= 6;
  const longDay = key => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateOf(key));
  const hourLabel = minute => `${Math.floor(minute / 60)}\u00a0h\u00a0${String(minute % 60).padStart(2, '0')}`;
  function dayKeys() {
    const today = dateOf(parisNow().key);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }
  function selectableDay(key) {
    const now = parisNow();
    return dayKeys().includes(key) && isOpen(key) && (key > now.key || (key === now.key && now.minutes < 1110));
  }
  function selectableTime(key, minute) {
    const now = parisNow();
    return selectableDay(key) && Number.isInteger(minute) && minute >= 570 && minute <= 1110 && (minute - 570) % 30 === 0 && (key > now.key || minute > now.minutes);
  }
  function makeRadio(name, value, label, disabled, checked) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.checked = checked;
    input.setAttribute('aria-label', label);
    return input;
  }
  function renderDays() {
    const host = document.querySelector('#days');
    host.replaceChildren();
    dayKeys().forEach(key => {
      const date = dateOf(key);
      const closed = !isOpen(key);
      const elapsed = !closed && !selectableDay(key);
      const label = document.createElement('label');
      label.className = 'day-option';
      const radio = makeRadio('jour', key, `${longDay(key)}${closed ? ', fermé' : elapsed ? ', journée écoulée' : ', préférence de jour'}`, closed || elapsed, state.day === key);
      const face = document.createElement('span');
      const day = document.createElement('span');
      day.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const number = document.createElement('strong');
      number.textContent = date.getUTCDate();
      const note = document.createElement('small');
      note.textContent = closed ? 'Fermé' : elapsed ? 'Écoulé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      face.append(day, number, note);
      label.append(radio, face);
      host.append(label);
    });
  }
  function renderSlots() {
    const host = document.querySelector('#slots');
    host.replaceChildren();
    document.querySelector('#selected-day').textContent = state.day ? longDay(state.day) : '';
    if (!state.day || !selectableDay(state.day)) {
      const p = document.createElement('p');
      p.className = 'empty-slots';
      p.textContent = 'Ce jour n’est plus proposé. Revenez au choix du jour.';
      host.append(p);
      return;
    }
    for (let minute = 570; minute <= 1110; minute += 30) {
      const disabled = !selectableTime(state.day, minute);
      const label = document.createElement('label');
      label.className = 'slot-option';
      const radio = makeRadio('heure', String(minute), `${hourLabel(minute)}, ${disabled ? 'heure passée' : 'heure souhaitée, à confirmer'}`, disabled, state.time === minute);
      const face = document.createElement('span');
      face.textContent = hourLabel(minute);
      label.append(radio, face);
      host.append(label);
    }
  }
  function updateSummary() {
    document.querySelector('#summary-service').textContent = serviceNames[state.service];
    document.querySelector('#summary-day').textContent = state.day ? longDay(state.day) : 'Jour à choisir';
    document.querySelector('#summary-time').textContent = state.time !== null ? `${hourLabel(state.time)} · souhaitée` : 'Heure à choisir';
  }
  function announce(message) { status.textContent = message; }
  function enter(panel, heading) {
    cancelAnimationFrame(entryFrame);
    panel.classList.remove('is-entering', 'no-motion');
    if (!keyboard && !reduced.matches) {
      panel.classList.add('is-entering');
      entryFrame = requestAnimationFrame(() => {
        entryFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    } else {
      panel.classList.add('no-motion');
    }
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 20 || rect.bottom > window.innerHeight - 100) {
      heading.scrollIntoView({ behavior: keyboard || reduced.matches ? 'instant' : 'smooth', block: 'start' });
    }
  }
  function showStep(step, moveFocus = true) {
    state.step = step;
    state.reached = Math.max(state.reached, step);
    document.querySelector('#success').hidden = true;
    form.hidden = false;
    panels.forEach((p, i) => { p.hidden = i !== step; });
    stepButtons.forEach((button, i) => {
      button.disabled = i > state.reached;
      if (i === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    if (moveFocus) enter(panels[step], document.querySelector(`#step-title-${step}`));
    announce(`Étape ${step + 1} sur 4. ${document.querySelector(`#step-title-${step}`).textContent}`);
  }
  function dayError() {
    document.querySelector('#day-error').textContent = 'Choisissez un jour proposé, du mardi au samedi.';
    document.querySelector('#days input:not(:disabled)')?.focus();
  }
  function timeError() {
    document.querySelector('#time-error').textContent = 'Choisissez une heure souhaitée parmi les heures proposées.';
    document.querySelector('#slots input:not(:disabled)')?.focus();
  }
  function next() {
    if (state.step === 1 && !selectableDay(state.day)) { dayError(); return; }
    if (state.step === 2 && !selectableTime(state.day, state.time)) { timeError(); return; }
    if (state.step < 3) showStep(state.step + 1);
  }
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', next));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Math.max(0, state.step - 1))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step >= 2 && !selectableDay(state.day)) { showStep(1); dayError(); return; }
    if (step === 3 && !selectableTime(state.day, state.time)) { showStep(2); timeError(); return; }
    showStep(step);
  }));
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') state.service = input.value;
    if (input.name === 'jour') {
      state.day = input.value;
      state.time = null;
      document.querySelector('#day-error').textContent = '';
      document.querySelector('#time-error').textContent = '';
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      document.querySelector('#time-error').textContent = '';
    }
    updateSummary();
  });
  const firstname = document.querySelector('#firstname');
  const telephone = document.querySelector('#telephone');
  function validateField(field) {
    const name = field === firstname;
    const value = field.value.trim();
    const valid = name ? value.length > 0 : /^(?:0|\+33|0033)[1-9]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));
    const message = valid ? '' : name ? 'Indiquez un prénom pour terminer l’essai.' : 'Indiquez un téléphone français valide, avec 0 ou +33 et neuf chiffres.';
    document.querySelector(name ? '#name-error' : '#phone-error').textContent = message;
    field.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  [firstname, telephone].forEach(field => {
    field.addEventListener('blur', () => {
      document.body.classList.remove('form-focused');
      if (field.value || field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
    field.addEventListener('focus', () => document.body.classList.add('form-focused'));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') {
        field.removeAttribute('aria-invalid');
        document.querySelector(field === firstname ? '#name-error' : '#phone-error').textContent = '';
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { next(); return; }
    if (!selectableDay(state.day)) { showStep(1); dayError(); return; }
    if (!selectableTime(state.day, state.time)) { showStep(2); timeError(); return; }
    const nameValid = validateField(firstname);
    const phoneValid = validateField(telephone);
    if (!nameValid || !phoneValid) { (nameValid ? telephone : firstname).focus(); return; }
    const success = document.querySelector('#success');
    document.querySelector('#success-recap').textContent = `${firstname.value.trim()}, voici votre préférence : ${serviceNames[state.service]}, ${longDay(state.day)}, à ${hourLabel(state.time)}. La durée et la disponibilité restent à confirmer avec le salon.`;
    form.hidden = true;
    success.hidden = false;
    stepButtons.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    document.body.classList.remove('form-focused');
    enter(success, document.querySelector('#success-title'));
    announce('Simulation terminée. Aucun rendez-vous réservé et aucune donnée transmise.');
    firstname.value = '';
    telephone.value = '';
  });
  document.querySelector('#restart').addEventListener('click', () => {
    state.day = '';
    state.time = null;
    state.service = 'lissage';
    state.reached = 0;
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(p => { p.textContent = ''; });
    document.querySelector('#success-recap').textContent = '';
    updateSummary();
    showStep(0);
  });

  updateSummary();
  showStep(0, false);
  document.querySelector('#parcours').hidden = false;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const revealTargets = document.querySelectorAll('.ruled, [data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
    revealTargets.forEach((target, i) => {
      if (target.dataset.reveal === 'row') target.style.transitionDelay = `${(i % 4) * 60}ms`;
      observer.observe(target);
    });
  } else {
    revealTargets.forEach(target => target.classList.add('in-view'));
  }
})();
