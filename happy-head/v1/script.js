/* Happy Head · aperçu non officiel. Tout le parcours reste dans cette page. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const HOURS = [null, null, [540, 1110], [540, 1110], [540, 1110], [540, 1110], [510, 1020]];
  const SERVICES = {
    homme: { name: 'Coupe homme', person: 'Manu' },
    femme: { name: 'Coupe femme', person: 'Sonia ou Amandine' },
    coloration: { name: 'Coloration', person: 'Sonia ou Amandine' }
  };
  const NB = '\u00a0';
  const DAY = 86400000;
  const state = { step: 0, service: '', day: '', time: null, complete: false };
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const month = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const hfr = (minutes) => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const dateObject = (iso) => new Date(`${iso}T12:00:00Z`);
  const isoDate = (date) => date.toISOString().slice(0, 10);
  function parisNow() {
    const parts = {};
    parisFormatter.formatToParts(new Date()).forEach((part) => { parts[part.type] = part.value; });
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function availableDay(iso, now = parisNow()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const date = dateObject(iso);
    const distance = (date - dateObject(now.iso)) / DAY;
    const hours = HOURS[date.getUTCDay()];
    return distance >= 0 && distance < 14 && !!hours && (iso !== now.iso || now.minutes < hours[1] - 30);
  }
  function validTime(now = parisNow()) {
    if (!availableDay(state.day, now) || state.time === null) return false;
    const [start, end] = HOURS[dateObject(state.day).getUTCDay()];
    return state.time >= start && state.time < end && (state.time - start) % 30 === 0 && (state.day !== now.iso || state.time > now.minutes);
  }

  /* Une entrée unique, puis des révélations ponctuelles ; rien ne boucle. */
  let entranceFrame = 0;
  let observer;
  const revealAll = () => {
    root.classList.add('entered');
    $$('[data-reveal]').forEach((element) => element.classList.add('revealed'));
  };
  if (!reduce.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    entranceFrame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px 20px 0px' });
    $$('[data-reveal]').forEach((element) => observer.observe(element));
  }
  reduce.addEventListener('change', () => {
    if (reduce.matches) { cancelAnimationFrame(entranceFrame); revealAll(); observer?.disconnect(); }
  });
  document.addEventListener('keydown', (event) => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      root.classList.add('keyboard-mode');
      revealAll();
    }
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-mode'), { passive: true });

  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const flowError = $('#flow-error');
  const status = $('#flow-status');
  let stepFrame = 0;
  let personFrame = 0;
  function announce(text) { status.textContent = text; }
  function summary(animatePerson = false) {
    const service = SERVICES[state.service];
    $('#summary-service').textContent = service?.name || 'À choisir';
    const person = $('#summary-person');
    person.textContent = service?.person || 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(dateObject(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : hfr(state.time);
    if (animatePerson && !reduce.matches && !root.classList.contains('keyboard-mode')) {
      person.style.transition = 'none';
      person.style.opacity = '.3';
      cancelAnimationFrame(personFrame);
      personFrame = requestAnimationFrame(() => requestAnimationFrame(() => {
        person.style.transition = 'opacity 180ms cubic-bezier(.23,1,.32,1)';
        person.style.opacity = '1';
      }));
    }
  }
  function updateSteps() {
    stepButtons.forEach((button, index) => {
      const reachable = index === 0 || index === 1 && !!state.service || index === 2 && !!state.service && availableDay(state.day) || index === 3 && !!state.service && validTime();
      button.disabled = state.complete || !reachable;
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const now = parisNow();
    const start = dateObject(now.iso);
    const grid = $('#days-grid');
    grid.replaceChildren();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(start.getTime() + index * DAY);
      const iso = isoDate(date);
      const hours = HOURS[date.getUTCDay()];
      const enabled = availableDay(iso, now);
      const label = document.createElement('label');
      label.className = 'day-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = iso;
      radio.checked = state.day === iso; radio.disabled = !enabled;
      radio.setAttribute('aria-label', `${longDate.format(date)}${!hours ? ', fermé' : !enabled ? ', heures passées' : ', pour la simulation'}`);
      const weekday = document.createElement('span'); weekday.textContent = shortDay.format(date);
      const number = document.createElement('b'); number.textContent = String(date.getUTCDate());
      const note = document.createElement('small'); note.textContent = !hours ? 'Fermé' : !enabled ? 'Passé' : month.format(date);
      label.append(radio, weekday, number, note); grid.append(label);
    }
  }
  function renderSlots() {
    const grid = $('#slots-grid');
    grid.replaceChildren();
    $('#slots-empty').hidden = true;
    if (!state.day || !HOURS[dateObject(state.day).getUTCDay()]) return;
    const now = parisNow();
    const [start, end] = HOURS[dateObject(state.day).getUTCDay()];
    $('#slot-day').textContent = longDate.format(dateObject(state.day));
    let count = 0;
    for (let minutes = start; minutes < end; minutes += 30) {
      const past = state.day < now.iso || state.day === now.iso && minutes <= now.minutes;
      const label = document.createElement('label'); label.className = 'slot-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = String(minutes); radio.disabled = past;
      radio.checked = state.time === minutes;
      radio.setAttribute('aria-label', `${hfr(minutes)}${past ? ', heure passée' : ', heure d’essai'}`);
      const text = document.createElement('span'); text.textContent = hfr(minutes);
      label.append(radio, text); grid.append(label);
      if (!past) count += 1;
    }
    $('#slots-empty').hidden = count > 0;
    if (state.time !== null && !validTime(now)) state.time = null;
  }
  function focusInView(element) {
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function goTo(step, focus = true) {
    cancelAnimationFrame(stepFrame);
    const goingBack = step < state.step;
    state.complete = false;
    state.step = step;
    form.hidden = false; $('#success').hidden = true;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => {
      panel.hidden = index !== step;
      panel.classList.remove('is-entering', 'is-back');
    });
    const panel = panels[step];
    if (!reduce.matches && !root.classList.contains('keyboard-mode')) {
      panel.classList.add('is-entering');
      if (goingBack) panel.classList.add('is-back');
      stepFrame = requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering', 'is-back')));
    }
    $('#back').hidden = step === 0;
    $('#continue').hidden = step === 3;
    $('#finish').hidden = step !== 3;
    flowError.textContent = '';
    updateSteps(); summary();
    if (focus) focusInView(panel.querySelector('h3'));
    announce(`Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure souhaitée', 'coordonnées de démonstration'][step]}.`);
  }
  function choiceError(message, selector) {
    flowError.textContent = message;
    const input = $(selector);
    if (input) {
      input.focus({ preventScroll: true });
      (input.type === 'radio' ? input.parentElement : input).scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  $('#continue').addEventListener('click', () => {
    if (state.step === 0 && !state.service) { choiceError('Choisissez une prestation pour poursuivre l’essai.', 'input[name="prestation"]'); return; }
    if (state.step === 1 && !availableDay(state.day)) { renderDays(); choiceError('Choisissez un jour proposé pour poursuivre l’essai.', 'input[name="jour"]:not(:disabled)'); return; }
    if (state.step === 2 && !validTime()) { renderSlots(); choiceError('Choisissez une heure d’essai encore à venir.', 'input[name="heure"]:not(:disabled)'); return; }
    goTo(Math.min(3, state.step + 1));
  });
  $('#back').addEventListener('click', () => goTo(Math.max(0, state.step - 1)));
  stepButtons.forEach((button) => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation' && SERVICES[input.value]) {
      state.service = input.value;
      summary(true);
      announce(`${SERVICES[state.service].name}, avec ${SERVICES[state.service].person}, pour la simulation.`);
    }
    if (input.name === 'jour') {
      state.day = input.value; state.time = null;
      summary(); announce(`${longDate.format(dateObject(state.day))}, jour choisi pour la simulation.`);
    }
    if (input.name === 'heure') {
      state.time = Number(input.value); summary(); announce(`${hfr(state.time)}, heure souhaitée pour la simulation.`);
    }
    flowError.textContent = ''; updateSteps();
  });
  const nameField = $('#prenom');
  const phoneField = $('#telephone');
  function validateField(input, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(`#${input.id}-erreur`).textContent = message;
    return !message;
  }
  [nameField, phoneField].forEach((input) => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') validateField(input, '');
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 3) { $('#continue').click(); return; }
    if (!state.service || !validTime()) {
      state.time = null; goTo(state.service ? 1 : 0);
      choiceError('Votre choix doit être actualisé. Choisissez un jour et une heure à venir.', state.service ? 'input[name="jour"]:not(:disabled)' : 'input[name="prestation"]');
      return;
    }
    const nameValid = validateField(nameField, nameField.value.trim() ? '' : 'Saisissez un prénom pour cet essai.');
    const phone = phoneField.value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    const phoneValid = validateField(phoneField, /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(phone) ? '' : 'Saisissez un numéro français de dix chiffres, ou son format +33.');
    if (!nameValid || !phoneValid) {
      announce('Vérifiez les champs signalés avant de terminer la simulation.');
      focusInView(!nameValid ? nameField : phoneField); return;
    }
    state.complete = true;
    const service = SERVICES[state.service];
    $('#success-recap').textContent = `Votre sélection d’essai : ${service.name.toLocaleLowerCase('fr-FR')}, avec ${service.person}, ${longDate.format(dateObject(state.day))} à ${hfr(state.time)}.`;
    form.hidden = true; $('#success').hidden = false;
    nameField.value = ''; phoneField.value = '';
    updateSteps();
    focusInView($('#success-title'));
    announce('Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé au salon.');
  });
  $('#restart').addEventListener('click', () => {
    form.reset(); state.service = ''; state.day = ''; state.time = null;
    [nameField, phoneField].forEach((input) => validateField(input, ''));
    goTo(0);
  });
  $$('[data-preselect]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    state.service = link.dataset.preselect;
    $(`input[name="prestation"][value="${state.service}"]`).checked = true;
    goTo(0, false); summary(true);
    $('#essayer').scrollIntoView({ behavior: reduce.matches || root.classList.contains('keyboard-mode') ? 'instant' : 'smooth', block: 'start' });
    panels[0].querySelector('h3').focus({ preventScroll: true });
  }));
  summary(); renderDays(); updateSteps();
  $('#booking-app').hidden = false;
})();
