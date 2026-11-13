/* OMA — simulation locale. Aucune requête, aucune donnée persistée. */
const OMAPlanning = (() => {
  'use strict';
  const services = [
    { id: 'curly-m', name: 'Curly M', duration: 90 },
    { id: 'curly-l', name: 'Curly L', duration: 105 },
    { id: 'prestige', name: 'Coupe Prestige', duration: 30 }
  ];
  const zone = 'Europe/Paris';
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  function nowParis(instant = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
    const get = type => parts.find(part => part.type === type).value;
    return { key: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  function toDate(key) { return new Date(`${key}T12:00:00Z`); }
  function addDays(key, amount) {
    const date = toDate(key);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }
  function closedReason(key) {
    const day = toDate(key).getUTCDay();
    if (key >= '2026-11-16' && key <= '2026-11-27') return 'Congés';
    return day === 0 || day === 6 ? 'Fermé' : '';
  }
  function slotsFor(key, duration, current = nowParis()) {
    if (closedReason(key) || key < current.key) return [];
    const slots = [];
    // Horaires Planity : 9 h–19 h. Pas de faux taux de disponibilité.
    for (let minute = 540; minute + duration <= 1140; minute += 30) {
      if (key !== current.key || minute > current.minutes) slots.push(minute);
    }
    return slots;
  }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`; }
  function durationLabel(minutes) { return minutes < 60 ? `${minutes}\u00a0min` : `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${minutes % 60}` : ''}`; }
  function validPhone(value) { return /^(?:0[67]|\+33[67]|0033[67])\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }
  return { services, nowParis, toDate, addDays, closedReason, slotsFor, timeLabel, durationLabel, validPhone, dateFormat, shortFormat, weekdayFormat };
})();

(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let usingKeyboard = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      usingKeyboard = true;
      root.classList.add('keyboard-use');
    }
  });
  document.addEventListener('pointerdown', () => {
    usingKeyboard = false;
    root.classList.remove('keyboard-use');
  }, { passive: true });

  // L’amélioration est activée ici seulement : sans script, rien n’est masqué.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    revealItems.forEach((item, index) => {
      if (item.dataset.reveal === 'deal') item.style.transitionDelay = `${(index % 3) * 80}ms`;
      observer.observe(item);
    });
  } else revealItems.forEach(item => item.classList.add('is-visible'));

  const track = document.querySelector('#service-track');
  const previous = document.querySelector('#services-prev');
  const next = document.querySelector('#services-next');
  function syncTrackButtons() {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  }
  function scrollTickets(direction) {
    const ticket = track.querySelector('.service-ticket');
    const distance = ticket.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    track.scrollBy({ left: direction * distance, behavior: reduced.matches || usingKeyboard ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => scrollTickets(-1));
  next.addEventListener('click', () => scrollTickets(1));
  let scrollFrame = 0;
  track.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => { syncTrackButtons(); scrollFrame = 0; });
  }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(syncTrackButtons).observe(track);
  syncTrackButtons();

  const P = OMAPlanning;
  const app = document.querySelector('#booking-app');
  const form = document.querySelector('#booking-form');
  const panel = document.querySelector('#booking-panel');
  const back = document.querySelector('#booking-back');
  const continueButton = document.querySelector('#booking-next');
  const status = document.querySelector('#booking-status');
  const steps = [...document.querySelectorAll('[data-step]')];
  const result = document.querySelector('#print-result');
  const receipt = document.querySelector('#printed-ticket');
  const state = { step: 0, service: null, date: '', time: null, firstName: '', phone: '', period: 0, start: P.nowParis().key, complete: false };
  let transitionFrame = 0;
  let printFrame = 0;
  const errorMarkup = '<p class="step-error" id="step-error" role="status" aria-live="polite"></p>';
  function safe(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
  function selected(condition) { return condition ? ' checked' : ''; }
  function fullDate(key) { return P.dateFormat.format(P.toDate(key)); }
  function announce(message) { status.textContent = message; }
  function focusInView(element) {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function updateSummary() {
    document.querySelector('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    document.querySelector('#summary-date').textContent = state.date ? P.shortFormat.format(P.toDate(state.date)) : 'À choisir';
    document.querySelector('#summary-time').textContent = state.time !== null ? P.timeLabel(state.time) : 'À choisir';
  }
  function canVisit(step) { return step === 0 || (step === 1 && !!state.service) || (step === 2 && !!state.service && !!state.date) || (step === 3 && !!state.service && !!state.date && state.time !== null); }
  function serviceMarkup() {
    return `<h3 tabindex="-1" id="step-title">Quelle prestation pour l’essai&nbsp;?</h3><fieldset aria-describedby="step-error"><legend>Prestations publiées sur Planity, sans prix reproduit.</legend>${P.services.map(service => `<label class="choice"><input type="radio" name="prestation" value="${service.id}"${selected(state.service?.id === service.id)}><span class="choice-name">${service.name}</span><span class="choice-duration">${P.durationLabel(service.duration)}</span></label>`).join('')}</fieldset>${errorMarkup}`;
  }
  function dateMarkup() {
    const first = P.addDays(state.start, state.period * 14);
    const last = P.addDays(first, 13);
    const current = P.nowParis();
    let possible = 0;
    const days = Array.from({ length: 14 }, (_, index) => {
      const key = P.addDays(first, index);
      let reason = P.closedReason(key);
      if (!reason && !P.slotsFor(key, state.service.duration, current).length) reason = 'Écoulé';
      if (!reason) possible++;
      const date = P.toDate(key);
      const note = reason || (key === current.key ? 'Aujourd’hui' : P.shortFormat.format(date).split(' ').slice(1).join(' '));
      return `<label class="date-choice"><input type="radio" name="jour" value="${key}" aria-label="${safe(fullDate(key))}${reason ? `, ${reason.toLowerCase()}` : ', exemple'}"${selected(state.date === key)}${reason ? ' disabled' : ''}><span>${P.weekdayFormat.format(date)}</span><strong>${date.getUTCDate()}</strong><small>${note}</small></label>`;
    }).join('');
    return `<h3 tabindex="-1" id="step-title">Quel jour pour l’essai&nbsp;?</h3><div class="period-nav"><p>${P.shortFormat.format(P.toDate(first))} – ${P.shortFormat.format(P.toDate(last))}</p><div class="period-buttons"><button type="button" data-period="-1" aria-label="Les quatorze jours précédents"${state.period === 0 ? ' disabled' : ''}><span aria-hidden="true">←</span></button><button type="button" data-period="1" aria-label="Les quatorze jours suivants"><span aria-hidden="true">→</span></button></div></div><fieldset aria-describedby="calendar-note step-error"><legend class="sr-only">Choisissez un jour pour la simulation</legend><div class="days-grid">${days}</div></fieldset><p class="calendar-note" id="calendar-note">Calendrier d’essai, dans les horaires publiés. Les congés annoncés sont exclus. Aucune disponibilité réelle n’est affichée.</p>${possible ? '' : '<p class="calendar-empty">Aucun jour proposé sur cette période. Passez aux quatorze jours suivants avec la flèche de droite.</p>'}${errorMarkup}`;
  }
  function timeMarkup() {
    const slots = P.slotsFor(state.date, state.service.duration);
    return `<h3 tabindex="-1" id="step-title">À quelle heure pour l’essai&nbsp;?</h3><fieldset aria-describedby="slot-note step-error"><legend>${safe(fullDate(state.date))} · ${P.durationLabel(state.service.duration)}</legend><div class="times-grid">${slots.map(time => `<label class="time-choice"><input type="radio" name="heure" value="${time}"${selected(state.time === time)}><span>${P.timeLabel(time)}</span></label>`).join('')}</div></fieldset><p class="slot-note" id="slot-note">Horaires de démonstration calculés de 9&nbsp;h à 19&nbsp;h. Ils ne reflètent pas les places libres du salon.</p>${slots.length ? '' : '<p class="calendar-empty">Cette journée est écoulée. Revenez au choix du jour.</p>'}${errorMarkup}`;
  }
  function detailsMarkup() {
    return `<h3 tabindex="-1" id="step-title">À quel prénom sortir le ticket&nbsp;?</h3><div class="field"><label for="first-name">Votre prénom</label><input type="text" id="first-name" name="prenom" autocomplete="given-name" maxlength="60" value="${safe(state.firstName)}" aria-describedby="name-error" required><p class="field-error" id="name-error" aria-live="polite"></p></div><div class="field"><label for="phone">Votre téléphone mobile</label><input type="tel" id="phone" name="telephone" inputmode="tel" autocomplete="tel" maxlength="24" value="${safe(state.phone)}" aria-describedby="phone-help phone-error" required><p class="field-help" id="phone-help">Numéro français commençant par 06, 07 ou +33.</p><p class="field-error" id="phone-error" aria-live="polite"></p></div><p class="slot-note">Utilisez des coordonnées d’essai. Elles restent dans cette page, ne sont ni envoyées ni enregistrées et s’effacent en la quittant.</p>${errorMarkup}`;
  }
  function render(focus = true) {
    cancelAnimationFrame(transitionFrame);
    const builders = [serviceMarkup, dateMarkup, timeMarkup, detailsMarkup];
    panel.innerHTML = builders[state.step]();
    back.hidden = state.step === 0;
    const labels = ['Choisir le jour', 'Choisir l’heure', 'Continuer', 'Sortir mon ticket d’essai'];
    continueButton.innerHTML = `${labels[state.step]} <span aria-hidden="true">→</span>`;
    steps.forEach((button, index) => {
      button.disabled = !canVisit(index);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary();
    if (reduced.matches || usingKeyboard || !focus) panel.classList.remove('is-changing');
    else {
      panel.classList.add('is-changing');
      transitionFrame = requestAnimationFrame(() => { transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-changing')); });
    }
    announce(`Étape ${state.step + 1} sur 4. ${panel.querySelector('h3').textContent}`);
    if (focus) focusInView(panel.querySelector('h3'));
  }
  function showError(message) {
    panel.querySelector('#step-error').textContent = message;
    const firstInput = panel.querySelector('input:not(:disabled)');
    if (firstInput) focusInView(firstInput);
    announce(message);
  }
  function rememberDetails() {
    if (state.step !== 3) return;
    state.firstName = panel.querySelector('#first-name').value;
    state.phone = panel.querySelector('#phone').value;
  }
  function visit(step) {
    if (state.complete || !canVisit(step)) return;
    rememberDetails();
    state.step = step;
    render();
  }
  panel.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      const service = P.services.find(item => item.id === input.value);
      if (!service) return;
      if (state.service?.id !== service.id) { state.date = ''; state.time = null; }
      state.service = service;
    }
    if (input.name === 'jour') { if (state.date !== input.value) state.time = null; state.date = input.value; }
    if (input.name === 'heure') state.time = Number(input.value);
    const error = panel.querySelector('#step-error');
    if (error) error.textContent = '';
    updateSummary();
    steps.forEach((button, index) => { button.disabled = !canVisit(index); });
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-period]');
    if (!button) return;
    const direction = Number(button.dataset.period);
    state.period = Math.max(0, state.period + direction);
    state.date = '';
    state.time = null;
    render(false);
    const replacement = panel.querySelector(`[data-period="${direction}"]`);
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    else panel.querySelector('[data-period="1"]').focus({ preventScroll: true });
  });
  panel.addEventListener('input', event => {
    if (event.target.id === 'first-name' || event.target.id === 'phone') {
      event.target.removeAttribute('aria-invalid');
      const errorId = event.target.id === 'first-name' ? '#name-error' : '#phone-error';
      panel.querySelector(errorId).textContent = '';
    }
  });
  back.addEventListener('click', () => visit(state.step - 1));
  steps.forEach(button => button.addEventListener('click', () => visit(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    const service = P.services.find(item => item.id === link.dataset.service);
    if (!service) return;
    rememberDetails();
    state.service = service;
    state.date = '';
    state.time = null;
    state.step = 0;
    state.complete = false;
    state.period = 0;
    state.start = P.nowParis().key;
    result.hidden = true;
    form.hidden = false;
    document.querySelector('.stepper').hidden = false;
    render();
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.complete) return;
    if (state.step === 0 && !state.service) return showError('Choisissez une prestation pour continuer.');
    if (state.step === 1 && !state.date) return showError('Choisissez un jour pour continuer.');
    if (state.step === 2 && state.time === null) return showError('Choisissez une heure pour continuer.');
    if (state.step >= 1 && state.date && P.closedReason(state.date)) { state.date = ''; state.time = null; state.step = 1; render(); return showError('Ce jour est fermé. Choisissez un autre jour.'); }
    if (state.step >= 2 && state.time !== null && !P.slotsFor(state.date, state.service.duration).includes(state.time)) {
      state.time = null;
      state.step = 2;
      render();
      return showError('Cette heure est désormais écoulée. Choisissez un autre horaire.');
    }
    if (state.step < 3) { state.step++; render(); return; }
    rememberDetails();
    const name = panel.querySelector('#first-name');
    const phone = panel.querySelector('#phone');
    let invalid = null;
    if (!state.firstName.trim()) { name.setAttribute('aria-invalid', 'true'); panel.querySelector('#name-error').textContent = 'Indiquez un prénom pour le ticket d’essai.'; invalid = name; }
    if (!P.validPhone(state.phone)) { phone.setAttribute('aria-invalid', 'true'); panel.querySelector('#phone-error').textContent = 'Indiquez un numéro mobile français à dix chiffres, ou au format +33.'; invalid = invalid || phone; }
    if (invalid) { focusInView(invalid); announce('Vérifiez les champs indiqués avant de sortir le ticket.'); return; }
    printTicket();
  });
  function printTicket() {
    state.complete = true;
    document.querySelector('#printed-name').textContent = `Pour ${state.firstName.trim()}.`;
    document.querySelector('#printed-summary').innerHTML = `<div><dt>Prestation</dt><dd>${safe(state.service.name)}</dd></div><div><dt>Jour d’essai</dt><dd>${safe(fullDate(state.date))}</dd></div><div><dt>Heure d’essai</dt><dd>${P.timeLabel(state.time)}</dd></div><div><dt>Durée</dt><dd>${P.durationLabel(state.service.duration)}</dd></div>`;
    // Les coordonnées quittent immédiatement le formulaire et l’état de travail.
    state.firstName = '';
    state.phone = '';
    form.reset();
    panel.querySelectorAll('input').forEach(input => { input.value = ''; input.defaultValue = ''; });
    form.hidden = true;
    document.querySelector('.stepper').hidden = true;
    steps.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    result.hidden = false;
    cancelAnimationFrame(printFrame);
    if (!reduced.matches && !usingKeyboard) {
      receipt.classList.add('is-unprinted');
      printFrame = requestAnimationFrame(() => { printFrame = requestAnimationFrame(() => receipt.classList.remove('is-unprinted')); });
    } else receipt.classList.remove('is-unprinted');
    announce('Votre ticket d’essai est prêt. Aucun rendez-vous n’a été pris, aucune donnée n’a été envoyée.');
    document.querySelector('#titre-resultat').focus({ preventScroll: true });
    result.scrollIntoView({ block: 'start', behavior: reduced.matches || usingKeyboard ? 'instant' : 'smooth' });
  }
  document.querySelector('#restart-booking').addEventListener('click', () => {
    state.step = 0;
    state.service = null;
    state.date = '';
    state.time = null;
    state.firstName = '';
    state.phone = '';
    state.period = 0;
    state.complete = false;
    state.start = P.nowParis().key;
    document.querySelector('#printed-name').textContent = '';
    document.querySelector('#printed-summary').replaceChildren();
    result.hidden = true;
    form.hidden = false;
    document.querySelector('.stepper').hidden = false;
    render();
    document.querySelector('#reserver').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  if (P.nowParis().key > '2026-11-27') document.querySelector('#holiday-note').hidden = true;
  render(false);
  app.hidden = false;
})();
