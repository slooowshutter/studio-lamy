/* Aperçu local : aucune requête, aucun stockage, aucun rendez-vous transmis. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    diagnostic: { name: 'Diagnostic technique', duration: 15 },
    'coupe-femme': { name: 'Coupe & coiffage femme', duration: 45 },
    'coupe-homme': { name: 'Coupe classique homme', duration: 30 },
    brushing: { name: 'Shampoing & brushing, cheveux courts', duration: 30 }
  };
  // Planity + iCoiffeur : minutes depuis minuit ; dimanche et mercredi fermés.
  const hours = { 0: null, 1: [540, 1140], 2: [540, 1140], 3: null, 4: [540, 1140], 5: [540, 1140], 6: [540, 1020] };
  const state = { service: null, day: null, time: null, step: 0 };
  const form = $('#booking-form');
  const panels = $$('.booking-step');
  const stepButtons = $$('[data-step]');
  const dateChoices = $('#date-choices');
  const slotChoices = $('#slot-choices');
  const stepNames = ['Votre prestation', 'Le jour', 'L’heure', 'Vos coordonnées'];
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const nb = '\u00a0';
  let entranceRun = 0;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(date).map(part => [part.type, part.value]));
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function todayKey(now = parisNow()) { return keyFromDate(new Date(Date.UTC(now.year, now.month - 1, now.day, 12))); }
  function clockText(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}${nb}h${m ? `${nb}${String(m).padStart(2, '0')}` : ''}`;
  }
  function longDay(key) { return dayFormatter.format(dateFromKey(key)); }
  function announce(text) { $('#booking-status').textContent = text; }
  function slotsFor(key, duration, now = parisNow()) {
    const date = dateFromKey(key);
    const schedule = hours[date.getUTCDay()];
    if (!schedule || key < todayKey(now)) return [];
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    // Quelques créneaux représentatifs : aucune disponibilité réelle n’est connue.
    for (let minute = schedule[0]; minute + duration <= schedule[1]; minute += 60) {
      const past = key === todayKey(now) && minute <= now.minutes;
      const unavailable = (seed + minute / 60 + duration) % 5 === 1;
      slots.push({ minute, disabled: past || unavailable, reason: past ? 'Passé' : unavailable ? 'Pris dans l’exemple' : 'Exemple' });
    }
    return slots;
  }
  function selectionError(id, message, fieldset) {
    $(`#${id}`).textContent = message;
    if (fieldset) {
      fieldset.setAttribute('aria-describedby', id);
      fieldset.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? `${services[state.service].name} · ${services[state.service].duration}${nb}min` : 'À choisir';
    $('#summary-day').textContent = state.day ? longDay(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? clockText(state.time) : 'À choisir';
    $('#confirmation-summary').textContent = state.service && state.day && state.time !== null
      ? `Votre exemple : ${services[state.service].name}, ${longDay(state.day)} à ${clockText(state.time)}. Durée : ${services[state.service].duration}${nb}min.`
      : 'Votre sélection apparaîtra ici avant de terminer l’essai.';
    const allowed = [true, Boolean(state.service), Boolean(state.service && state.day), Boolean(state.service && state.day && state.time !== null)];
    stepButtons.forEach((button, index) => {
      button.disabled = !allowed[index];
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const now = parisNow();
    const firstDay = new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = 'Choisir un jour pour la simulation';
    dateChoices.replaceChildren(legend);
    for (let offset = 0; offset < 12; offset += 1) {
      const date = new Date(firstDay);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = keyFromDate(date);
      const closed = !hours[date.getUTCDay()];
      const finished = !closed && !slotsFor(key, services[state.service].duration, now).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'date-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || finished;
      input.checked = key === state.day;
      input.setAttribute('aria-label', `${longDay(key)}, ${closed ? 'fermé' : finished ? 'journée terminée' : 'exemple de jour'}`);
      const face = document.createElement('span');
      face.className = 'date-face';
      face.innerHTML = `<span>${weekdayFormatter.format(date)}</span><strong>${date.getUTCDate()}</strong><span>${monthFormatter.format(date)}</span><small>${closed ? 'Fermé' : finished ? 'Terminé' : 'Exemple'}</small>`;
      label.append(input, face);
      dateChoices.append(label);
    }
  }
  function renderSlots() {
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Choisir une heure pour la simulation';
    slotChoices.replaceChildren(legend);
    if (!state.day || !state.service) return;
    const slots = slotsFor(state.day, services[state.service].duration);
    $('#slot-explanation').textContent = `${longDay(state.day)}. Créneaux d’exemple, sans lien avec les disponibilités réelles.`;
    slots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute);
      input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${clockText(slot.minute)}, ${slot.reason.toLocaleLowerCase('fr-FR')}`);
      const face = document.createElement('span');
      const time = document.createElement('b'); time.textContent = clockText(slot.minute);
      const reason = document.createElement('small'); reason.textContent = slot.reason;
      face.append(time, reason); label.append(input, face); slotChoices.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const empty = document.createElement('p');
      empty.textContent = 'Aucun créneau d’exemple ne reste pour ce jour. Revenez au choix du jour.';
      slotChoices.append(empty);
    }
  }
  function focusStep(index) {
    const title = $(`#step-title-${index}`);
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function showStep(index, focus = true) {
    state.step = index;
    const run = ++entranceRun;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('step-enter');
    });
    const panel = panels[index];
    if (!reduced.matches && !root.classList.contains('keyboard-use')) {
      panel.classList.add('step-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (run === entranceRun) panel.classList.remove('step-enter');
      }));
    }
    updateSummary();
    announce(`Étape ${index + 1} sur 4 : ${stepNames[index]}. Simulation uniquement.`);
    if (focus) focusStep(index);
  }
  function chooseService(id) {
    if (!services[id]) return;
    state.service = id; state.day = null; state.time = null;
    $$('.service-choice input').forEach(input => { input.checked = input.value === id; });
    selectionError('service-error', '', $('.service-choices'));
    selectionError('date-error', '', dateChoices);
    selectionError('time-error', '', slotChoices);
    updateSummary();
    announce(`${services[id].name}, ${services[id].duration} minutes, sélectionné pour la simulation.`);
  }
  function validSelectedTime() {
    return state.service && state.day && state.time !== null && slotsFor(state.day, services[state.service].duration).some(slot => slot.minute === state.time && !slot.disabled);
  }
  function advance(index) {
    if (index === 0 && !state.service) {
      selectionError('service-error', 'Choisissez une prestation pour continuer.', $('.service-choices'));
      $('.service-choice input').focus(); return;
    }
    if (index === 1 && (!state.day || !slotsFor(state.day, services[state.service].duration).some(slot => !slot.disabled))) {
      state.day = null; state.time = null; renderDays(); updateSummary();
      selectionError('date-error', 'Choisissez un jour avec des créneaux d’exemple à venir.', dateChoices);
      $('input:not(:disabled)', dateChoices)?.focus(); return;
    }
    if (index === 2 && !validSelectedTime()) {
      state.time = null; renderSlots(); updateSummary();
      selectionError('time-error', 'Choisissez une heure d’exemple encore à venir.', slotChoices);
      $('input:not(:disabled)', slotChoices)?.focus(); return;
    }
    showStep(index + 1);
  }

  $$('.service-choice input').forEach(input => input.addEventListener('change', () => chooseService(input.value)));
  dateChoices.addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    state.day = event.target.value; state.time = null;
    selectionError('date-error', '', dateChoices);
    selectionError('time-error', '', slotChoices);
    updateSummary(); announce(`${longDay(state.day)} sélectionné pour la simulation.`);
  });
  slotChoices.addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.time = Number(event.target.value);
    selectionError('time-error', '', slotChoices);
    updateSummary(); announce(`${clockText(state.time)} sélectionné pour la simulation.`);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => advance(Number(button.dataset.next))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    if (!button.disabled) showStep(Number(button.dataset.step));
  }));

  function clearFieldError(input, errorId) {
    input.removeAttribute('aria-invalid'); $(`#${errorId}`).textContent = '';
  }
  const nameInput = $('#first-name');
  const phoneInput = $('#telephone');
  nameInput.addEventListener('input', () => clearFieldError(nameInput, 'name-error'));
  phoneInput.addEventListener('input', () => clearFieldError(phoneInput, 'phone-error'));

  function resetBooking(focus = true) {
    entranceRun += 1;
    form.reset(); form.hidden = false;
    $('#booking-result').hidden = true;
    $('.step-nav').hidden = false;
    $('#result-summary').textContent = '';
    state.service = null; state.day = null; state.time = null;
    ['service-error', 'date-error', 'time-error', 'name-error', 'phone-error'].forEach(id => { $(`#${id}`).textContent = ''; });
    $$('#booking-form [aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    showStep(0, focus);
  }
  $('#restart-booking').addEventListener('click', () => resetBooking());
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (form.hidden) resetBooking(false);
    chooseService(button.dataset.service);
    showStep(0, false);
    $('#rendez-vous').scrollIntoView({ behavior: reduced.matches || root.classList.contains('keyboard-use') ? 'instant' : 'smooth', block: 'start' });
    $('#step-title-0').focus({ preventScroll: true });
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) { advance(state.step); return; }
    if (!validSelectedTime()) {
      state.time = null; showStep(2);
      selectionError('time-error', 'Ce créneau d’exemple est passé. Choisissez une autre heure ou un autre jour.', slotChoices);
      return;
    }
    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/[\s().-]/g, '').replace(/^0033/, '+33').replace(/^\+330/, '+33');
    clearFieldError(nameInput, 'name-error'); clearFieldError(phoneInput, 'phone-error');
    let firstInvalid = null;
    if (!name) {
      $('#name-error').textContent = 'Indiquez votre prénom pour terminer l’essai.';
      nameInput.setAttribute('aria-invalid', 'true'); firstInvalid = nameInput;
    }
    if (!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(phone)) {
      $('#phone-error').textContent = 'Indiquez un numéro français à dix chiffres, ou avec +33.';
      phoneInput.setAttribute('aria-invalid', 'true'); firstInvalid ||= phoneInput;
    }
    if (firstInvalid) { firstInvalid.focus(); return; }
    $('#result-summary').textContent = `${name}, voici votre exemple : ${services[state.service].name}, ${longDay(state.day)} à ${clockText(state.time)}. Pour prendre ce rendez-vous réellement, consultez les disponibilités sur Planity.`;
    form.hidden = true; $('.step-nav').hidden = true;
    const result = $('#booking-result'); result.hidden = false;
    if (!reduced.matches && !root.classList.contains('keyboard-use')) {
      result.classList.add('step-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => result.classList.remove('step-enter')));
    }
    // Effacement immédiat des champs, sans stockage local ni envoi.
    nameInput.value = ''; phoneInput.value = '';
    $('#result-title').focus({ preventScroll: true });
    $('#result-title').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce('Simulation terminée. Aucun rendez-vous n’est pris. Aucune donnée n’a été envoyée.');
  });

  /* Le clavier conserve une réponse immédiate, sans transition de position. */
  document.addEventListener('keydown', () => root.classList.add('keyboard-use'), { passive: true });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-use'), { passive: true });

  $('#booking-interface').hidden = false;
  updateSummary();
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

  /* Les contenus restent lisibles ; seuls les repères et les traits se révèlent. */
  if ('IntersectionObserver' in window) {
    const nodeObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); nodeObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    $$('.path-stop').forEach(stop => nodeObserver.observe(stop));
  } else {
    $$('.path-stop').forEach(stop => stop.classList.add('is-visible'));
  }
  const rail = $('.path-rail');
  const progress = $('#path-progress');
  let scheduled = false;
  function drawPath() {
    scheduled = false;
    if (reduced.matches) { progress.style.transform = 'none'; return; }
    const rect = rail.getBoundingClientRect();
    const fraction = Math.max(.001, Math.min(1, (window.innerHeight * .76 - rect.top) / Math.max(rect.height, 1)));
    progress.style.transform = `scaleY(${fraction})`;
  }
  function scheduleDraw() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(drawPath); }
  }
  window.addEventListener('scroll', scheduleDraw, { passive: true });
  window.addEventListener('resize', scheduleDraw, { passive: true });
  document.fonts?.ready.then(scheduleDraw);
  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(scheduleDraw) : null;
  resizeObserver?.observe($('.journey'));
  reduced.addEventListener('change', scheduleDraw);
  scheduleDraw();

  const bar = $('#mobile-bar');
  if ('IntersectionObserver' in window) {
    let heroPassed = false;
    const visible = new Map();
    bar.classList.add('is-hidden');
    bar.inert = true;
    bar.setAttribute('aria-hidden', 'true');
    const stickyObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        visible.set(entry.target.id, entry.isIntersecting);
        if (entry.target.id === 'hero-actions') heroPassed = entry.boundingClientRect.bottom < 0;
      });
      const hidden = !heroPassed || Boolean(visible.get('rendez-vous') || visible.get('sources'));
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
      bar.setAttribute('aria-hidden', String(hidden));
    }, { threshold: 0 });
    ['hero-actions', 'rendez-vous', 'sources'].forEach(id => stickyObserver.observe($(`#${id}`)));
  }
})();
