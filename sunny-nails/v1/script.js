(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  // Les formes apparaissent une seule fois. Sans JavaScript, rien n’est masqué.
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1 });
    $$('[data-reveal]').forEach((element, index) => {
      element.classList.add('reveal-ready');
      element.style.transitionDelay = `${(index % 3) * 50}ms`;
      observer.observe(element);
    });
    reduce.addEventListener('change', () => {
      if (reduce.matches) {
        observer.disconnect();
        $$('.reveal-ready').forEach(element => element.classList.add('is-visible'));
      }
    });
  }

  const services = [
    { id: 'babyboomer', name: 'Pose gel avec résine « BABYBOOMER »', duration: 70, label: '1\u00a0h\u00a010' },
    { id: 'semi', name: 'Pose de vernis semi-permanent (mains)', duration: 20, label: '20\u00a0min' },
    { id: 'vernis', name: 'Pose de vernis (mains)', duration: 15, label: '15\u00a0min' },
    { id: 'pieds', name: 'Beauté des pieds sans vernis', duration: 30, label: '30\u00a0min' }
  ];
  const state = { step: 0, service: 'babyboomer', day: '', time: null };
  const form = $('#booking-form');
  const panels = $$('.booking-step');
  const progress = $$('[data-step]');
  const status = $('#booking-status');
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  let days = [];
  let panelAnimation;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).map(part => [part.type, part.value]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    return { key, minutes: Number(parts.hour) * 60 + Number(parts.minute), date: new Date(`${key}T12:00:00Z`) };
  }
  const selectedService = () => services.find(service => service.id === state.service);
  const selectedDay = () => days.find(day => day.key === state.day);
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;

  function makeRadio(name, value, disabled = false) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.disabled = disabled;
    return input;
  }
  function makeText(tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }
  function renderServices() {
    const container = $('#service-options');
    container.replaceChildren();
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'radio-option';
      const input = makeRadio('prestation', service.id);
      input.checked = service.id === state.service;
      input.setAttribute('aria-describedby', 'error-service');
      label.append(input, makeText('span', service.name), makeText('small', service.label));
      container.append(label);
    });
  }
  // Amplitude commune aux deux plateformes. Le dimanche reste à confirmer.
  function slotsFor(day, duration, now = parisNow()) {
    if (day.date.getUTCDay() === 0) return [];
    const slots = [];
    for (let minutes = 600; minutes + duration <= 1170; minutes += 30) {
      const past = day.key < now.key || (day.key === now.key && minutes <= now.minutes);
      const illustrativeBusy = (Number(day.key.replaceAll('-', '')) + minutes / 30) % 5 === 0;
      slots.push({ minutes, disabled: past || illustrativeBusy, reason: past ? 'Heure passée' : illustrativeBusy ? 'Indisponible · exemple' : 'Créneau fictif' });
    }
    return slots;
  }
  function buildDays() {
    const now = parisNow();
    days = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + offset);
      return { key: date.toISOString().slice(0, 10), date };
    });
  }
  function renderDays() {
    buildDays();
    const container = $('#day-options');
    container.replaceChildren();
    const service = selectedService();
    const now = parisNow();
    days.forEach(day => {
      const sunday = day.date.getUTCDay() === 0;
      const noSlots = !sunday && !slotsFor(day, service.duration, now).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'day-choice';
      const input = makeRadio('jour', day.key, sunday || noSlots);
      input.checked = state.day === day.key && !input.disabled;
      input.setAttribute('aria-label', `${longDate.format(day.date)}${sunday ? ', horaires à confirmer' : noSlots ? ', aucun créneau d’exemple' : ', exemple'}`);
      label.append(input, makeText('span', shortWeekday.format(day.date)), makeText('strong', day.date.getUTCDate()), makeText('span', shortMonth.format(day.date)), makeText('small', sunday ? 'À confirmer' : noSlots ? 'Terminé' : 'Exemple'));
      container.append(label);
    });
    if (state.day && !$('input[name="jour"]:checked')) { state.day = ''; state.time = null; }
  }
  function renderTimes() {
    const container = $('#time-options');
    container.replaceChildren();
    const day = selectedDay();
    if (!day) return;
    $('#time-legend').textContent = `Exemples du ${longDate.format(day.date)}`;
    const slots = slotsFor(day, selectedService().duration);
    slots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'time-choice';
      const input = makeRadio('heure', slot.minutes, slot.disabled);
      input.checked = state.time === slot.minutes && !slot.disabled;
      input.setAttribute('aria-label', `${timeLabel(slot.minutes)}, ${slot.reason.toLowerCase()}`);
      label.append(input, makeText('span', timeLabel(slot.minutes)), makeText('small', slot.reason));
      container.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) container.append(makeText('p', 'Aucun créneau d’exemple pour ce jour. Revenez au choix du jour.'));
    if (state.time !== null && !slots.some(slot => slot.minutes === state.time && !slot.disabled)) state.time = null;
  }
  function recap() {
    return `${selectedService().name} · ${selectedService().label}${selectedDay() ? ` · ${longDate.format(selectedDay().date)}` : ''}${state.time !== null ? ` à ${timeLabel(state.time)}` : ''}.`;
  }
  function updateSummary() {
    const service = selectedService();
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-duration').textContent = service ? service.label : '—';
    $('#summary-day').textContent = selectedDay() ? longDate.format(selectedDay().date) : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('#contact-recap').textContent = recap();
    progress.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || index > 1 && !state.day || index > 2 && state.time === null) || state.step === 4;
      if (index === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, moveFocus = true) {
    if (panelAnimation) panelAnimation.cancel();
    const previous = state.step;
    state.step = index;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
    const panel = panels[index];
    if (!reduce.matches && !keyboard && panel.animate) {
      panelAnimation = panel.animate([
        { opacity: 0, transform: `translateX(${index < previous ? '-8px' : '8px'})` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    updateSummary();
    if (moveFocus) $('h3', panel).focus({ preventScroll: true });
    if (moveFocus) panel.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    status.textContent = index === 4 ? 'Démonstration terminée. Aucun rendez-vous réservé.' : `Étape ${index + 1} sur 4. ${$('h3', panel).textContent}`;
  }
  function error(id, message, input) {
    $(id).textContent = message;
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  function verifySlot() {
    const day = selectedDay();
    return day && slotsFor(day, selectedService().duration).some(slot => slot.minutes === state.time && !slot.disabled);
  }
  function goNext(next) {
    if (next === 1) {
      if (!selectedService()) { error('#error-service', 'Choisissez une prestation pour continuer.'); return; }
      renderDays();
    }
    if (next === 2) {
      if (!selectedDay() || selectedDay().date.getUTCDay() === 0) { error('#error-day', 'Choisissez un jour d’exemple du lundi au samedi.'); return; }
      renderTimes();
    }
    if (next === 3 && !verifySlot()) {
      renderTimes();
      error('#error-time', 'Choisissez un créneau d’exemple encore proposé.');
      return;
    }
    showStep(next);
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value;
      state.day = ''; state.time = null;
      error('#error-service', '');
    }
    if (input.name === 'jour') { state.day = input.value; state.time = null; error('#error-day', ''); }
    if (input.name === 'heure') { state.time = Number(input.value); error('#error-time', ''); }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => goNext(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  progress.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    showStep(index);
  }));
  $$('[data-choose]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.choose; state.day = ''; state.time = null;
    form.reset(); renderServices(); renderDays();
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    showStep(0, false);
    requestAnimationFrame(() => $('#titre-parcours').focus({ preventScroll: true }));
  }));
  $('#titre-parcours').tabIndex = -1;
  $('#first-name').addEventListener('input', () => error('#error-name', '', $('#first-name')));
  $('#phone').addEventListener('input', () => error('#error-phone', '', $('#phone')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    // La touche Entrée ne peut pas contourner les étapes.
    if (state.step !== 3) { if (state.step < 3) goNext(state.step + 1); return; }
    const firstName = $('#first-name');
    const phone = $('#phone');
    const validName = firstName.value.trim().length > 0;
    const normalizedPhone = phone.value.replace(/[\s.()\-]/g, '');
    const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalizedPhone);
    error('#error-name', validName ? '' : 'Saisissez un prénom d’exemple.', firstName);
    error('#error-phone', validPhone ? '' : 'Saisissez un numéro français d’exemple à 10 chiffres, ou au format +33.', phone);
    if (!validName || !validPhone) { (validName ? phone : firstName).focus(); return; }
    if (!verifySlot()) { renderDays(); renderTimes(); showStep(2); error('#error-time', 'L’heure d’exemple est passée. Choisissez un autre créneau.'); return; }
    $('#success-recap').textContent = recap();
    firstName.value = ''; phone.value = '';
    showStep(4);
  });
  $('#restart').addEventListener('click', () => {
    form.reset(); state.service = 'babyboomer'; state.day = ''; state.time = null;
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    renderServices(); renderDays(); showStep(0);
  });
  reduce.addEventListener('change', () => { if (reduce.matches && panelAnimation) panelAnimation.cancel(); });
  renderServices(); renderDays(); updateSummary();
  $('#booking-app').hidden = false;
})();
