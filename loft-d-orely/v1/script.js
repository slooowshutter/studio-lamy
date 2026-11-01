/* Le loft d’Orely — simulation locale, aucune requête ni conservation. */
(() => {
  'use strict';
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nb = '\u00a0';
  const euro = value => `${value}${nb}€`;
  const durationText = value => value === 60 ? `1${nb}h` : `${value}${nb}min`;
  const minutesText = value => `${Math.floor(value / 60)}${nb}h${value % 60 ? `${nb}${String(value % 60).padStart(2, '0')}` : ''}`;
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthText = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  // Hypothèses de simulation, affichées à côté du module. Pas des horaires réels.
  const exampleHours = { 0: null, 1: [540,1080], 2: [540,1080], 3: [540,1080], 4: [540,1080], 5: [540,1080], 6: [540,1080] };

  function parisNow(now = new Date()) {
    const values = {};
    for (const p of parisFormat.formatToParts(now)) values[p.type] = p.value;
    return { key: `${values.year}-${values.month}-${values.day}`, minute: +values.hour * 60 + +values.minute };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function daysFromNow(now = new Date()) {
    const base = dateFromKey(parisNow(now).key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(base.getTime() + index * 86400000);
      return { key: date.toISOString().slice(0,10), date, closed: !exampleHours[date.getUTCDay()] };
    });
  }
  function slotsFor(key, duration, now = new Date()) {
    const date = dateFromKey(key);
    const hours = exampleHours[date.getUTCDay()];
    if (!hours) return [];
    const current = parisNow(now);
    const seed = Math.floor(date.getTime() / 86400000);
    const result = [];
    for (let start = hours[0]; start + duration <= hours[1]; start += 30) {
      const past = key < current.key || (key === current.key && start <= current.minute);
      const taken = (seed + start / 30) % 6 === 0;
      result.push({ start, unavailable: past || taken, reason: past ? 'passé' : taken ? 'déjà pris (exemple)' : 'disponible (exemple)' });
    }
    return result;
  }
  function validMobile(value) {
    const clean = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(clean);
  }

  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (['Tab','Enter',' ','ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  const revealItems = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const rows = entries.filter(entry => entry.isIntersecting);
      rows.forEach((entry, index) => {
        entry.target.style.transitionDelay = `${Math.min(index, 4) * 60}ms`;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));

  const services = $$('[data-service]').map(row => ({
    id: row.dataset.service, name: row.dataset.name, duration: +row.dataset.duration, price: +row.dataset.price
  }));
  const state = { step: 0, service: '', day: '', time: null, done: false };
  const app = $('#booking-app');
  const form = $('#booking-form');
  const live = $('#booking-live');
  const error = $('#flow-error');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const nextButton = $('#next-step');
  const backButton = $('#back-step');
  let panelMotion;
  const selectedService = () => services.find(service => service.id === state.service);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  $('#service-options').innerHTML = services.map(service => `<label class="option"><input type="radio" name="service" value="${service.id}"><span class="option-surface"><span>${escapeHTML(service.name)}</span><small>${durationText(service.duration)} · ${euro(service.price)} · indicatif</small></span></label>`).join('');

  function renderDays() {
    $('#day-options').innerHTML = daysFromNow().map(day => `<label class="option day-option"><input type="radio" name="day" value="${day.key}" ${day.closed ? 'disabled' : ''} ${day.key === state.day ? 'checked' : ''} aria-label="${escapeHTML(longDate.format(day.date))}${day.closed ? ', fermé dans cet exemple, à confirmer' : ', planning d’exemple'}"><span class="option-surface"><span>${shortDay.format(day.date)}</span><span class="day-number">${day.date.getUTCDate()}</span><small>${day.closed ? 'fermé (ex.)' : monthText.format(day.date)}</small></span></label>`).join('');
  }
  function renderSlots() {
    const service = selectedService();
    if (!state.day || !service) return;
    const slots = slotsFor(state.day, service.duration);
    const available = slots.filter(slot => !slot.unavailable).length;
    $('#slot-context').textContent = `${longDate.format(dateFromKey(state.day))} · ${available} heure${available > 1 ? 's' : ''} disponible${available > 1 ? 's' : ''} dans cet exemple.`;
    $('#slot-options').innerHTML = slots.map(slot => `<label class="option slot-option"><input type="radio" name="time" value="${slot.start}" ${slot.unavailable ? 'disabled' : ''} ${slot.start === state.time ? 'checked' : ''} aria-label="${minutesText(slot.start)}, ${slot.reason}"><span class="option-surface">${minutesText(slot.start)}</span></label>`).join('');
    if (!available) $('#slot-context').textContent += ' Revenez au choix du jour pour continuer.';
  }
  function stepAllowed(index) {
    if (index === 0) return true;
    if (!state.service) return false;
    if (index === 1) return true;
    if (!state.day) return false;
    if (index === 2) return true;
    return state.time !== null;
  }
  function updateSummary() {
    const service = selectedService();
    $('#summary-service').textContent = service ? service.name : 'Une prestation à choisir.';
    $('#summary-price').textContent = service ? `${durationText(service.duration)} / ${euro(service.price)}` : '—';
    $('#summary-day').textContent = state.day ? longDate.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? minutesText(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || !stepAllowed(index);
      if (index === state.step && !state.done) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }
  function animatePanel(panel) {
    if (panelMotion) panelMotion.cancel();
    if (!reducedMotion.matches && !keyboard && panel.animate) {
      panelMotion = panel.animate([{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function showStep(index, focus = true) {
    if (!stepAllowed(index)) return;
    state.step = index;
    state.done = false;
    form.hidden = false;
    $('#booking-success').hidden = true;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    backButton.hidden = index === 0;
    nextButton.textContent = index === 3 ? 'Terminer la simulation →' : 'Continuer →';
    error.textContent = '';
    updateSummary();
    if (focus) {
      const panel = panels[index];
      $(`#step-title-${index}`).focus({ preventScroll: true });
      // Keep the new heading visible even after a long list of services.
      $(`#step-title-${index}`).scrollIntoView({ block: 'start', behavior: 'instant' });
      animatePanel(panel);
      live.textContent = `Simulation, étape ${index + 1} sur 4 : ${$(`#step-title-${index}`).textContent}`;
    }
  }
  function failSelection(message) {
    error.textContent = message;
    const first = $('input:not(:disabled)', panels[state.step]);
    if (first) first.focus();
  }
  function validateContact() {
    const name = $('#first-name');
    const phone = $('#phone');
    const nameValid = name.value.trim().length >= 2;
    const phoneValid = validMobile(phone.value);
    $('#name-error').textContent = nameValid ? '' : 'Indiquez un prénom de deux caractères au minimum.';
    $('#phone-error').textContent = phoneValid ? '' : 'Indiquez un mobile français, par exemple 06 00 00 00 00.';
    name.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      error.textContent = 'Vérifiez les champs indiqués pour terminer la simulation.';
      (!nameValid ? name : phone).focus();
      return false;
    }
    return true;
  }
  function finish() {
    // Revalidate against the current Paris time, including midnight changes.
    const service = selectedService();
    const slot = slotsFor(state.day, service.duration).find(item => item.start === state.time && !item.unavailable);
    if (!slot) {
      state.time = null;
      showStep(2);
      error.textContent = 'Cette heure est passée. Choisissez un autre créneau d’exemple.';
      return;
    }
    state.done = true;
    form.hidden = true;
    $('#booking-success').hidden = false;
    $('#success-recap').textContent = `${$('#first-name').value.trim()}, votre choix d’exemple : ${service.name}, le ${longDate.format(dateFromKey(state.day))} à ${minutesText(state.time)}. ${durationText(service.duration)} · ${euro(service.price)}, tarif indicatif à confirmer.`;
    updateSummary();
    $('#success-title').focus({ preventScroll: true });
    $('#booking-success').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    animatePanel($('#booking-success'));
    live.textContent = 'Simulation terminée. Aucun rendez-vous pris. Rien envoyé au salon.';
    // Values only live in this page; drop the fields once the recap is displayed.
    $('#first-name').value = '';
    $('#phone').value = '';
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service' && state.service !== input.value) {
      state.service = input.value;
      state.time = null;
    }
    if (input.name === 'day' && state.day !== input.value) {
      state.day = input.value;
      state.time = null;
    }
    if (input.name === 'time') state.time = +input.value;
    error.textContent = '';
    updateSummary();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) return failSelection('Choisissez une prestation pour continuer.');
    if (state.step === 1) {
      const day = daysFromNow().find(item => item.key === state.day && !item.closed);
      if (!day) { state.day = ''; updateSummary(); return failSelection('Choisissez un jour disponible dans cet exemple.'); }
    }
    if (state.step === 2) {
      if (state.time === null) return failSelection('Choisissez une heure disponible pour continuer.');
      const service = selectedService();
      const freshSlot = slotsFor(state.day, service.duration).find(slot => slot.start === state.time && !slot.unavailable);
      if (!freshSlot) {
        state.time = null;
        renderSlots();
        updateSummary();
        return failSelection('Cette heure est passée. Choisissez un autre créneau d’exemple.');
      }
    }
    if (state.step === 3) {
      if (validateContact()) finish();
      return;
    }
    showStep(state.step + 1);
  });
  backButton.addEventListener('click', () => showStep(Math.max(0,state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(+button.dataset.step)));
  $$('[data-choose]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    state.service = link.dataset.choose;
    state.time = null;
    const radio = $(`input[name="service"][value="${state.service}"]`);
    if (radio) radio.checked = true;
    showStep(1);
  }));
  $('#restart-booking').addEventListener('click', () => {
    state.service = '';
    state.day = '';
    state.time = null;
    state.done = false;
    form.reset();
    ['name','phone'].forEach(id => { $(`#${id}-error`).textContent = ''; });
    $('#first-name').removeAttribute('aria-invalid');
    $('#phone').removeAttribute('aria-invalid');
    showStep(0);
  });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && panelMotion) panelMotion.cancel(); });
  app.hidden = false;
  showStep(0,false);

  const mobileBar = $('#mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') visibility.hero = entry.isIntersecting;
        if (entry.target.id === 'reserver') visibility.booking = entry.isIntersecting;
        if (entry.target.id === 'pied') visibility.footer = entry.isIntersecting;
      });
      mobileBar.hidden = visibility.hero || visibility.booking || visibility.footer;
    });
    ['hero-actions','reserver','pied'].forEach(id => observer.observe($(`#${id}`)));
  }
  window.loftReady = true;
})();
