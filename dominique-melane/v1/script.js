(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardAction = false;
  document.addEventListener('keydown', () => { keyboardAction = true; root.classList.add('using-keyboard'); }, true);
  document.addEventListener('pointerdown', () => { keyboardAction = false; root.classList.remove('using-keyboard'); }, true);
  const mayMove = () => !reducedMotion.matches && !keyboardAction;

  // Prepare only progressive enhancements. All article content is visible without JS.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
  const revealNodes = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    revealNodes.forEach((node, i) => {
      if (node.dataset.reveal === 'row') node.style.transitionDelay = `${(i % 3) * 60}ms`;
      observer.observe(node);
    });
  } else {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }

  const services = [
    { id: 'femme', name: 'Coupe femme' },
    { id: 'homme', name: 'Coupe homme' },
    { id: 'enfant', name: 'Coupe enfant' },
    { id: 'couleur', name: 'Coloration' },
    { id: 'meches', name: 'Mèches' },
    { id: 'chignon', name: 'Chignon' }
  ];
  // Horaires publiés par PagesJaunes ; samedi à confirmer par téléphone.
  const openingHours = { 1: [615,1110], 2: [615,1110], 4: [615,1110], 5: [615,1110] };
  const state = { service: null, day: null, time: null, step: 0, completed: false };
  const $ = selector => document.querySelector(selector);
  const app = $('#booking-app');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const progressButtons = [...document.querySelectorAll('[data-step]')];
  const announcement = $('#booking-announcement');
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'Europe/Paris' });
  const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
  let panelAnimation = null;
  let days = [];

  function parisNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const value = type => Number(parts.find(part => part.type === type).value);
    return { key: `${value('year')}-${String(value('month')).padStart(2,'0')}-${String(value('day')).padStart(2,'0')}`, year: value('year'), month: value('month'), day: value('day'), minutes: value('hour') * 60 + value('minute') };
  }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour}\u00a0h${minute ? `\u00a0${String(minute).padStart(2,'0')}` : ''}`;
  }
  function makeDays(now = new Date()) {
    const current = parisNow(now);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(Date.UTC(current.year, current.month - 1, current.day + offset, 12));
      const key = date.toISOString().slice(0,10);
      return { key, date, weekday: date.getUTCDay(), number: date.getUTCDate() };
    });
  }
  function availableSlots(day, service, now = new Date()) {
    if (!day || !service || !openingHours[day.weekday]) return [];
    const [open, close] = openingHours[day.weekday];
    const current = parisNow(now);
    const seed = Number(day.key.replaceAll('-',''));
    const slots = [];
    for (let time = open, index = 0; time < close; time += 15, index++) {
      const past = day.key < current.key || (day.key === current.key && time <= current.minutes);
      const taken = (seed + index * 7) % 11 < 2;
      slots.push({ time, past, taken, disabled: past || taken });
    }
    return slots;
  }
  function isMobileValid(value) {
    const number = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(number);
  }
  function clearError(id) { $(`#${id}`).textContent = ''; }
  function animatePanel(panel, backward = false) {
    if (panelAnimation) panelAnimation.cancel();
    if (mayMove() && panel.animate) {
      panelAnimation = panel.animate([
        { transform: `translateX(${backward ? '-8' : '8'}px)`, opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service?.name || 'À choisir';
    $('#summary-day').textContent = state.day ? dayFormatter.format(state.day.date) + (state.day.weekday === 6 ? ' · samedi à confirmer' : '') : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('#mobile-selection').textContent = state.service ? `${state.service.name}${state.day ? ' · ' + dayFormatter.format(state.day.date) : ''}${state.time !== null ? ' · ' + timeLabel(state.time) : ''}${state.day?.weekday === 6 ? ' · samedi à confirmer' : ''}` : 'Votre sélection : à choisir';
    updateProgress();
  }
  function updateProgress() {
    progressButtons.forEach((button, index) => {
      button.disabled = state.completed || (index === 1 && !state.service) || (index === 2 && (!state.service || !state.day)) || (index === 3 && (!state.service || !state.day || state.time === null));
      if (index === state.step && !state.completed) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }
  function focusHeading(heading) {
    heading.focus();
    const sticky = window.matchMedia('(max-width: 599px)').matches;
    const safeTop = sticky ? $('.booking-progress').getBoundingClientRect().height + 16 : 24;
    const rect = heading.getBoundingClientRect();
    if (rect.top < safeTop || rect.bottom > window.innerHeight - (sticky ? 100 : 24)) heading.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  function showStep(step, focus = true) {
    const backward = step < state.step;
    state.step = step;
    $('#booking-success').hidden = true;
    if (step === 1) {
      days = makeDays();
      if (state.day && !days.some(day => day.key === state.day.key)) { state.day = null; state.time = null; }
      renderDays();
    }
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateSummary();
    animatePanel(panels[step], backward);
    if (focus) focusHeading($(`#step-title-${step}`));
    announcement.textContent = `Étape ${step + 1} sur 4. ${$(`#step-title-${step}`).textContent}`;
  }
  function renderServices() {
    $('#service-options').innerHTML += services.map(service => `<label class="service-option"><input type="radio" name="service" value="${service.id}" aria-describedby="service-error"><span>${service.name}<small>À confirmer au salon</small></span><span class="option-price">À confirmer</span></label>`).join('');
  }
  function renderDays() {
    days = makeDays();
    $('#day-options').innerHTML = '<legend class="sr-only">Choisissez un jour de démonstration</legend>' + days.map(day => {
      const closed = !openingHours[day.weekday];
      return `<label class="choice"><input type="radio" name="day" value="${day.key}" aria-describedby="day-error" ${closed ? 'disabled' : ''} ${state.day?.key === day.key ? 'checked' : ''}><span>${shortDayFormatter.format(day.date)}</span><strong>${day.number}</strong><span>${monthFormatter.format(day.date)}</span>${closed ? `<small>${day.weekday === 6 ? 'À confirmer' : 'Fermé'}</small>` : ''}</label>`;
    }).join('');
  }
  function renderSlots() {
    const slots = availableSlots(state.day, state.service);
    $('#slot-options').innerHTML = '<legend class="sr-only">Choisissez une heure fictive</legend>' + slots.map(slot => `<label class="choice slot-choice"><input type="radio" name="slot" value="${slot.time}" aria-describedby="slot-error" ${slot.disabled ? 'disabled' : ''} ${state.time === slot.time ? 'checked' : ''}><strong>${timeLabel(slot.time)}</strong>${slot.past ? '<small>Passé</small>' : slot.taken ? '<small>Déjà pris · exemple</small>' : '<small>Exemple</small>'}</label>`).join('');
    $('#slots-empty').hidden = slots.some(slot => !slot.disabled);
    $('[data-next="3"]').disabled = !slots.some(slot => !slot.disabled);
  }
  function failChoice(errorId, message, selector) {
    $(`#${errorId}`).textContent = message;
    announcement.textContent = message;
    const field = $(selector);
    if (field) field.focus();
  }
  function validateSlot() { return availableSlots(state.day, state.service).some(slot => slot.time === state.time && !slot.disabled); }

  renderServices();
  app.hidden = false;
  updateSummary();
  $('#service-options').addEventListener('change', event => {
    state.service = services.find(service => service.id === event.target.value);
    state.day = null;
    state.time = null;
    clearError('service-error');
    clearError('day-error');
    clearError('slot-error');
    updateSummary();
    announcement.textContent = `${state.service.name} sélectionnée pour la simulation.`;
  });
  $('#day-options').addEventListener('change', event => {
    state.day = days.find(day => day.key === event.target.value);
    state.time = null;
    clearError('day-error');
    clearError('slot-error');
    updateSummary();
    announcement.textContent = `Jour sélectionné : ${dayFormatter.format(state.day.date)}. Simulation uniquement.`;
  });
  $('#slot-options').addEventListener('change', event => {
    state.time = Number(event.target.value);
    clearError('slot-error');
    updateSummary();
    announcement.textContent = `Heure d’exemple sélectionnée : ${timeLabel(state.time)}.`;
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.next);
    if (target === 1 && !state.service) return failChoice('service-error','Choisissez une prestation pour continuer.','input[name="service"]');
    if (target === 2 && !state.day) return failChoice('day-error','Choisissez un jour ouvert pour continuer.','input[name="day"]:not(:disabled)');
    if (target === 3 && state.time === null) return failChoice('slot-error','Choisissez une heure d’exemple pour continuer.','input[name="slot"]:not(:disabled)');
    if (target === 3 && !validateSlot()) {
      state.time = null;
      renderSlots();
      updateSummary();
      return failChoice('slot-error','Cette heure est passée. Choisissez un autre créneau d’exemple.','input[name="slot"]:not(:disabled)');
    }
    showStep(target);
  }));
  progressButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (state.completed) reset();
    state.service = services.find(service => service.id === button.dataset.service);
    state.day = null;
    state.time = null;
    const input = $(`input[name="service"][value="${state.service.id}"]`);
    input.checked = true;
    clearError('service-error');
    showStep(0);
    $('#reserver').scrollIntoView({ behavior: mayMove() ? 'smooth' : 'instant', block: 'start' });
  }));

  function validateName() {
    const input = $('#first-name');
    const valid = input.value.trim().length > 0;
    $('#name-error').textContent = valid ? '' : 'Indiquez un prénom, même d’exemple.';
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  function validatePhone() {
    const input = $('#mobile-number');
    const valid = isMobileValid(input.value);
    $('#phone-error').textContent = valid ? '' : 'Utilisez un mobile français : 06 ou 07 et 8 chiffres, ou +33 suivi de 6 ou 7 et 8 chiffres.';
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  $('#first-name').addEventListener('blur', validateName);
  $('#mobile-number').addEventListener('blur', validatePhone);
  $('#first-name').addEventListener('input', () => { if ($('#first-name').getAttribute('aria-invalid') === 'true') { clearError('name-error'); $('#first-name').removeAttribute('aria-invalid'); } });
  $('#mobile-number').addEventListener('input', () => { if ($('#mobile-number').getAttribute('aria-invalid') === 'true') { clearError('phone-error'); $('#mobile-number').removeAttribute('aria-invalid'); } });
  $('#details-form').addEventListener('submit', event => {
    event.preventDefault();
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) { (!nameValid ? $('#first-name') : $('#mobile-number')).focus(); return; }
    if (!validateSlot()) {
      state.time = null;
      showStep(2);
      return failChoice('slot-error','Cette heure est désormais passée. Choisissez une autre heure ou un autre jour.','input[name="slot"]:not(:disabled)');
    }
    state.completed = true;
    panels.forEach(panel => { panel.hidden = true; });
    const success = $('#booking-success');
    success.hidden = false;
    $('#success-recap').textContent = `${$('#first-name').value.trim()}, votre essai : ${state.service.name}, ${dayFormatter.format(state.day.date)} à ${timeLabel(state.time)}.`;
    $('#details-form').reset();
    updateProgress();
    animatePanel(success);
    focusHeading($('#success-title'));
    announcement.textContent = 'Simulation terminée. Aucune réservation effectuée. Aucune donnée envoyée au salon.';
  });
  function reset() {
    if (panelAnimation) panelAnimation.cancel();
    state.service = null;
    state.day = null;
    state.time = null;
    state.completed = false;
    document.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = false; });
    $('#details-form').reset();
    document.querySelectorAll('.field-error').forEach(node => { node.textContent = ''; });
    document.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    showStep(0);
  }
  $('#restart').addEventListener('click', reset);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      panelAnimation?.cancel();
      revealNodes.forEach(node => node.classList.add('is-visible'));
    }
  });
})();
