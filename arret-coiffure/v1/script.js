(() => {
  'use strict';

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.23, 1, .32, 1)';
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('clavier'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('clavier'); }, true);

  // Les faits restent visibles si l’observation ou JavaScript sont indisponibles.
  if ('IntersectionObserver' in window && !reduced.matches) {
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('has-entered')));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        card.classList.add('is-visible');
        const numeral = card.querySelector('[data-count]');
        if (numeral && !reduced.matches) {
          const end = Number(numeral.dataset.count);
          const start = performance.now();
          const tick = now => {
            if (reduced.matches) {
              numeral.textContent = String(end).padStart(2, '0');
              return;
            }
            const progress = Math.min(1, (now - start) / 360);
            numeral.textContent = String(Math.round(end * (1 - Math.pow(1 - progress, 3)))).padStart(2, '0');
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
        observer.unobserve(card);
      });
    }, { threshold: .08 });
    document.querySelectorAll('[data-reveal]').forEach(card => observer.observe(card));
    document.addEventListener('focusin', event => {
      const card = event.target.closest('[data-reveal]');
      if (card) card.classList.add('is-visible');
    });
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      root.classList.remove('motion-ready');
      observer.disconnect();
    });
  }

  const services = {
    brushing: { name: 'Brushing', duration: 30 },
    courte: { name: 'Coupe courte + brushing', duration: 30 },
    carre: { name: 'Coupe carré + brushing', duration: 60 },
    'mi-long': { name: 'Coupe mi-long + brushing', duration: 60 },
    homme: { name: 'Coupe homme', duration: 30 }
  };
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const month = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const app = document.querySelector('#reservation');
  const form = document.querySelector('#booking-form');
  const result = document.querySelector('#booking-result');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const message = document.querySelector('#form-message');
  const bookingStatus = document.querySelector('#booking-status');
  const nextButton = document.querySelector('#continue');
  const previousButton = document.querySelector('#previous');
  const dayContainer = document.querySelector('#days');
  const slotContainer = document.querySelector('#slots');
  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  const state = { service: null, day: null, time: null, step: 0, finished: false };
  let panelAnimation;

  function clock(now = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFor(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function dayAfter(key, offset) {
    const date = dateFor(key);
    date.setUTCDate(date.getUTCDate() + offset);
    return dateKey(date);
  }
  function displayTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}\u00a0h${rest ? `\u00a0${String(rest).padStart(2, '0')}` : ''}`;
  }
  function opening(key) {
    const day = dateFor(key).getUTCDay();
    if (day === 0) return null;
    return day === 6 ? { start: 510, end: 960 } : { start: 540, end: 1140 };
  }
  function holiday(key) {
    const year = Number(key.slice(0, 4));
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key.slice(5))) return true;
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
    const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
    const easterDay = (h + l - 7 * m + 114) % 31 + 1;
    const easterKey = dateKey(new Date(Date.UTC(year, easterMonth - 1, easterDay, 12)));
    return [1, 39, 50].some(offset => dayAfter(easterKey, offset) === key);
  }
  function slotsFor(key, duration, now = clock()) {
    const hours = opening(key);
    if (!hours || holiday(key) || key < now.key) return [];
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let time = hours.start, index = 0; time + duration <= hours.end; time += 30, index += 1) {
      const past = key === now.key && time <= now.minutes;
      const busy = (seed + index * 3) % 7 === 2;
      slots.push({ time, disabled: past || busy, reason: past ? 'Horaire passé' : busy ? 'Indisponible dans la simulation' : '' });
    }
    return slots;
  }
  function validDay(key) {
    if (!key || !state.service) return false;
    const today = clock().key;
    return key >= today && key <= dayAfter(today, 13) && slotsFor(key, services[state.service].duration).some(slot => !slot.disabled);
  }
  function validTime() {
    if (!validDay(state.day) || state.time === null) return false;
    return slotsFor(state.day, services[state.service].duration).some(slot => slot.time === state.time && !slot.disabled);
  }
  function radio(name, value, checked, disabled) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.disabled = disabled;
    return input;
  }
  function refreshDays() {
    const today = clock().key;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index += 1) {
      const key = dayAfter(today, index);
      const date = dateFor(key);
      const closed = !opening(key);
      const publicHoliday = holiday(key);
      const available = !closed && !publicHoliday && slotsFor(key, services[state.service].duration).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'day';
      const input = radio('jour', key, state.day === key, !available);
      const status = closed ? 'Fermé' : publicHoliday ? 'À confirmer' : !available ? 'Complet' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : month.format(date);
      input.setAttribute('aria-label', `${longDate.format(date)}${!available ? `, ${status.toLocaleLowerCase('fr')}` : ', simulation'}`);
      const face = document.createElement('span');
      const dayName = document.createElement('small');
      dayName.textContent = weekday.format(date);
      const number = document.createElement('strong');
      number.textContent = date.getUTCDate();
      const annotation = document.createElement('em');
      annotation.textContent = status;
      face.append(dayName, number, annotation);
      label.append(input, face);
      fragment.append(label);
    }
    dayContainer.replaceChildren(fragment);
  }
  function refreshSlots() {
    const fragment = document.createDocumentFragment();
    const availableSlots = slotsFor(state.day, services[state.service].duration);
    availableSlots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot';
      const input = radio('heure', slot.time, state.time === slot.time, slot.disabled);
      input.setAttribute('aria-label', `${displayTime(slot.time)}${slot.reason ? `, ${slot.reason}` : ', exemple disponible'}`);
      const face = document.createElement('span');
      face.textContent = displayTime(slot.time);
      label.append(input, face);
      fragment.append(label);
    });
    slotContainer.replaceChildren(fragment);
    document.querySelector('#slot-caption').textContent = `${longDate.format(dateFor(state.day))} · durée publiée : ${services[state.service].duration}\u00a0min.`;
    document.querySelector('#no-slots').hidden = availableSlots.some(slot => !slot.disabled);
  }
  function updateSummary() {
    document.querySelector('#resume-prestation').textContent = state.service ? services[state.service].name : 'À choisir';
    document.querySelector('#resume-jour').textContent = state.day ? shortDate.format(dateFor(state.day)) : 'À choisir';
    document.querySelector('#resume-heure').textContent = state.time !== null ? displayTime(state.time) : 'À choisir';
    steps.forEach((stepButton, index) => {
      stepButton.disabled = state.finished || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null);
      if (!state.finished && index === state.step) stepButton.setAttribute('aria-current', 'step');
      else stepButton.removeAttribute('aria-current');
    });
  }
  function animatePanel(panel, backwards) {
    if (panelAnimation) panelAnimation.cancel();
    if (reduced.matches || keyboard || !panel.animate) return;
    panelAnimation = panel.animate([
      { transform: `translateX(${backwards ? '-10px' : '10px'})`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ], { duration: 220, easing: ease });
  }
  function showStep(index, focus = true) {
    const backwards = index < state.step;
    if (index > 0 && !state.service) index = 0;
    if (index > 1 && !validDay(state.day)) { state.day = null; state.time = null; index = 1; }
    if (index > 2 && !validTime()) { state.time = null; index = 2; }
    state.step = index;
    state.finished = false;
    form.hidden = false;
    result.hidden = true;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
    if (index === 1) refreshDays();
    if (index === 2) refreshSlots();
    nextButton.textContent = index === 3 ? 'Terminer la simulation' : 'Continuer →';
    previousButton.hidden = index === 0;
    message.textContent = '';
    updateSummary();
    if (focus) {
      bookingStatus.textContent = `Étape ${index + 1} sur 4 : ${steps[index].textContent}. Simulation uniquement.`;
      panels[index].querySelector('h4').focus({ preventScroll: true });
      panels[index].scrollIntoView({ block: 'nearest', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
      animatePanel(panels[index], backwards);
    }
  }
  function say(text) { message.textContent = text; }
  function invalid(input, errorId, text) {
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    document.getElementById(errorId).textContent = text;
    return Boolean(text);
  }
  function validateContact() {
    const nameError = invalid(firstName, 'erreur-prenom', firstName.value.trim().length < 2 ? 'Indiquez un prénom d’au moins deux caractères.' : '');
    const cleaned = phone.value.replace(/[\s.()\-]/g, '');
    const phoneError = invalid(phone, 'erreur-telephone', /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(cleaned) ? '' : 'Indiquez un numéro français à dix chiffres, ou au format +33.');
    if (nameError || phoneError) {
      (nameError ? firstName : phone).focus();
      say('Vérifiez les champs indiqués. Rien n’a été envoyé.');
      return false;
    }
    return true;
  }
  function finish() {
    state.finished = true;
    form.hidden = true;
    result.hidden = false;
    document.querySelector('#result-recap').textContent = `${services[state.service].name}, ${longDate.format(dateFor(state.day))}, à ${displayTime(state.time)}. Ceci est un exemple de récapitulatif.`;
    updateSummary();
    bookingStatus.textContent = 'Simulation terminée. Aucun rendez-vous réservé, aucune information envoyée.';
    result.querySelector('h4').focus({ preventScroll: true });
    result.scrollIntoView({ block: 'nearest', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
    animatePanel(result, false);
    // Les coordonnées ne sont ni transmises ni enregistrées.
    firstName.value = '';
    phone.value = '';
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation' && services[input.value]) {
      state.service = input.value;
      state.day = null;
      state.time = null;
    } else if (input.name === 'jour' && !input.disabled) {
      state.day = input.value;
      state.time = null;
    } else if (input.name === 'heure' && !input.disabled) {
      state.time = Number(input.value);
    }
    message.textContent = '';
    updateSummary();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) { say('Choisissez une prestation pour continuer.'); return; }
    if (state.step === 1 && !validDay(state.day)) { say('Choisissez un jour disponible dans la simulation.'); refreshDays(); return; }
    if (state.step >= 2 && !validTime()) {
      state.time = null;
      showStep(2);
      say('Choisissez un créneau d’exemple encore disponible.');
      return;
    }
    if (state.step < 3) showStep(state.step + 1);
    else if (validateContact()) finish();
  });
  previousButton.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  steps.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  firstName.addEventListener('input', () => { invalid(firstName, 'erreur-prenom', ''); });
  phone.addEventListener('input', () => { invalid(phone, 'erreur-telephone', ''); });
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    state.day = null;
    state.time = null;
    document.querySelector(`input[name='prestation'][value='${state.service}']`).checked = true;
    showStep(0, false);
    // L’ancre conserve son comportement natif ; le focus rejoint le formulaire.
    setTimeout(() => panels[0].querySelector('h4').focus({ preventScroll: true }), 0);
  }));
  document.querySelector('#restart').addEventListener('click', () => {
    form.reset();
    state.service = null;
    state.day = null;
    state.time = null;
    invalid(firstName, 'erreur-prenom', '');
    invalid(phone, 'erreur-telephone', '');
    showStep(0);
  });

  app.hidden = false;
  showStep(0, false);
})();
