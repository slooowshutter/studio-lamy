(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'brushing-court', name: 'Shampoing & brushing', detail: 'Cheveux courts', duration: 30, price: 20.5 },
    { id: 'brushing-long', name: 'Shampoing & brushing', detail: 'Cheveux longs', duration: 40, price: 23.5 },
    { id: 'coupe-brushing', name: 'Shampoing, coupe & brushing', detail: 'Cheveux courts', duration: 30, price: 35 },
    { id: 'racines', name: 'Couleur racines, shampoing & brushing', detail: 'Cheveux courts', duration: 90, price: 47.5 },
    { id: 'meches', name: 'Mèches, patine, shampoing, coupe & brushing', detail: 'Cheveux courts', duration: 105, price: 98, from: true },
    { id: 'homme', name: 'Coupe homme', detail: '', duration: 20, price: 22 }
  ];
  // Hours from the bounded Planity top-up. All remain subject to salon confirmation.
  const openingHours = [null, [600, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1020]];
  const state = { service: null, date: null, time: null, step: 0, success: false };
  const form = $('#booking-form');
  const app = $('.booking-app');
  const summary = $('.selection');
  const formatMoney = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  const priceLabel = service => `${service.from ? 'À partir de ' : ''}${formatMoney(service.price)}`;
  const durationLabel = value => value < 60 ? `${value}\u00a0min` : `${Math.floor(value / 60)}\u00a0h${value % 60 ? `\u00a0${value % 60}` : ''}`;
  const pad = value => String(value).padStart(2, '0');
  const dateKey = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const dateObject = key => new Date(`${key}T12:00:00Z`);
  const dateLabel = key => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dateObject(key));
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h\u00a0${pad(minutes % 60)}`;
  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }
  function holidays(year) {
    // French metropolitan public holidays, including Easter-derived dates.
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 12));
    const result = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map(suffix => `${year}-${suffix}`));
    [1, 39, 50].forEach(offset => {
      const date = new Date(easter);
      date.setUTCDate(date.getUTCDate() + offset);
      result.add(dateKey(date));
    });
    return result;
  }
  function slotsFor(key, service, now = parisNow()) {
    const hours = openingHours[dateObject(key).getUTCDay()];
    if (!hours || !service) return [];
    const seed = Number(key.replaceAll('-', '')) + service.duration;
    const result = [];
    for (let start = hours[0], index = 0; start + service.duration <= hours[1]; start += 30, index++) {
      const past = key < now.key || (key === now.key && start <= now.minutes);
      const busy = (seed + index * 7) % 9 === 2 || (seed + index * 7) % 9 === 5;
      result.push({ start, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : '' });
    }
    return result;
  }
  function announce(message) { $('#booking-status').textContent = message; }
  function makeSpan(className, text) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  }
  function makeChoice(className, name, value, disabled = false) {
    const label = document.createElement('label');
    label.className = `choice ${className}`;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    const face = document.createElement('span');
    label.append(input, face);
    return { label, input, face };
  }
  function renderServices() {
    const fragment = document.createDocumentFragment();
    services.forEach(service => {
      const { label, face } = makeChoice('service-choice', 'service', service.id);
      const name = makeSpan('service-name', service.name);
      name.append(makeSpan('service-meta', `${service.detail ? `${service.detail} · ` : ''}${durationLabel(service.duration)}`));
      const price = makeSpan('service-price', formatMoney(service.price));
      if (service.from) {
        const from = document.createElement('small');
        from.textContent = 'à partir de'; price.prepend(from);
      }
      face.append(name, price); fragment.append(label);
    });
    $('#services').replaceChildren(fragment);
  }
  function renderDays() {
    const now = parisNow();
    const first = dateObject(now.key);
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + offset);
      const key = dateKey(date), closed = !openingHours[date.getUTCDay()];
      const holiday = holidays(date.getUTCFullYear()).has(key);
      const exhausted = !closed && !slotsFor(key, state.service, now).some(slot => !slot.disabled);
      const { label, input, face } = makeChoice('day-choice', 'day', key, closed || exhausted);
      input.checked = state.date === key;
      face.append(
        makeSpan('day-week', new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date)),
        makeSpan('day-number', String(date.getUTCDate())),
        makeSpan('day-month', new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date))
      );
      if (closed || exhausted || holiday) face.append(makeSpan('day-note', closed ? 'Fermé' : exhausted ? 'Complet' : 'Férié · à confirmer'));
      input.setAttribute('aria-label', `${dateLabel(key)}${closed ? ', fermé' : exhausted ? ', aucun créneau' : holiday ? ', jour férié, ouverture à confirmer' : ''}`);
      fragment.append(label);
    }
    $('#days').replaceChildren(fragment);
  }
  function renderSlots() {
    if (!state.date || !state.service) return;
    $('#slot-context').textContent = `${dateLabel(state.date)} · ${durationLabel(state.service.duration)} · horaires à confirmer.`;
    const slots = slotsFor(state.date, state.service);
    const fragment = document.createDocumentFragment();
    slots.forEach(slot => {
      const { label, input, face } = makeChoice('slot-choice', 'time', String(slot.start), slot.disabled);
      input.checked = state.time === slot.start;
      face.append(makeSpan('', timeLabel(slot.start)));
      if (slot.reason) {
        const reason = document.createElement('small'); reason.textContent = slot.reason; face.append(reason);
      }
      input.setAttribute('aria-label', `${timeLabel(slot.start)}${slot.reason ? `, ${slot.reason.toLowerCase()}` : ''}`);
      fragment.append(label);
    });
    $('#slots').replaceChildren(fragment);
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
  }
  let keyboardInteraction = false;
  let panelTimer;
  let panelVersion = 0;
  let pendingFrame;
  const summaryAnimations = new Map();
  document.addEventListener('keydown', () => { keyboardInteraction = true; }, { capture: true });
  document.addEventListener('pointerdown', () => { keyboardInteraction = false; }, { capture: true, passive: true });
  function updateSummary() {
    const updates = {
      '#summary-service': state.service ? `${state.service.name}${state.service.detail ? ` · ${state.service.detail.toLowerCase()}` : ''}` : 'À choisir',
      '#summary-day': state.date ? dateLabel(state.date) : 'À choisir',
      '#summary-time': state.time !== null ? timeLabel(state.time) : 'À choisir',
      '#summary-price': state.service ? priceLabel(state.service) : '—'
    };
    Object.entries(updates).forEach(([selector, value]) => {
      const node = $(selector);
      if (node.textContent === value) return;
      summaryAnimations.get(node)?.cancel();
      node.textContent = value;
      if (!reducedMotion.matches && !keyboardInteraction && node.animate) {
        summaryAnimations.set(node, node.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' }));
      }
    });
    $$('[data-next]').forEach(button => {
      const target = Number(button.dataset.next);
      button.disabled = target === 1 ? !state.service : target === 2 ? !state.date : state.time === null;
    });
    $$('[data-step]').forEach(button => {
      const target = Number(button.dataset.step);
      button.disabled = state.success || (target === 1 && !state.service) || (target === 2 && !state.date) || (target === 3 && state.time === null);
      if (target === state.step && !state.success) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function activatePanel(target) {
    $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== target; });
    state.step = target;
    updateSummary();
    const title = $(`#step-title-${target}`);
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce(`Étape ${target + 1} sur 4. ${title.textContent}`);
  }
  function showStep(target) {
    if (state.success || (target >= 1 && !state.service) || (target >= 2 && !state.date) || (target >= 3 && state.time === null)) return;
    clearTimeout(panelTimer);
    cancelAnimationFrame(pendingFrame);
    const version = ++panelVersion;
    if (target === 1) renderDays();
    if (target === 2) renderSlots();
    if (keyboardInteraction || reducedMotion.matches) {
      form.classList.remove('is-leaving', 'is-entering'); activatePanel(target); return;
    }
    form.classList.remove('is-entering');
    form.classList.add('is-leaving');
    panelTimer = setTimeout(() => {
      if (version !== panelVersion) return;
      form.classList.remove('is-leaving'); form.classList.add('is-entering');
      activatePanel(target);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = requestAnimationFrame(() => { if (version === panelVersion) form.classList.remove('is-entering'); });
      });
    }, 90);
  }
  function selectService(id) {
    const service = services.find(item => item.id === id);
    if (!service) return;
    if (state.service?.id !== id) { state.date = null; state.time = null; }
    state.service = service;
    $$('input[name="service"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
    announce(`${service.name}, ${service.detail}, ${durationLabel(service.duration)}, ${priceLabel(service)}. Choisissez maintenant un jour.`);
  }
  function resetBooking(moveFocus = true) {
    clearTimeout(panelTimer); cancelAnimationFrame(pendingFrame); panelVersion++;
    state.service = null; state.date = null; state.time = null; state.step = 0; state.success = false;
    form.reset();
    form.classList.remove('is-leaving', 'is-entering'); form.hidden = false;
    $('#booking-success').hidden = true; summary.classList.remove('is-complete');
    $$('.field input').forEach(input => input.removeAttribute('aria-invalid'));
    $$('.field-error').forEach(error => { error.hidden = true; });
    $('#availability-error').hidden = true;
    $$('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== '0'; });
    updateSummary();
    if (moveFocus) activatePanel(0);
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') selectService(input.value);
    if (input.name === 'day') {
      $('#availability-error').hidden = true;
      state.date = input.value; state.time = null; updateSummary();
      announce(`${dateLabel(state.date)} sélectionné. Choisissez maintenant une heure.`);
    }
    if (input.name === 'time') {
      $('#availability-error').hidden = true;
      state.time = Number(input.value); updateSummary();
      announce(`${timeLabel(state.time)} sélectionné. Vous pouvez continuer vers vos coordonnées.`);
    }
  });
  $$('[data-next], [data-back], [data-step]').forEach(button => button.addEventListener('click', event => {
    if (event.detail === 0) keyboardInteraction = true;
    showStep(Number(button.dataset.next ?? button.dataset.back ?? button.dataset.step));
  }));
  $$('[data-service]').forEach(button => button.addEventListener('click', event => {
    if (event.detail === 0) keyboardInteraction = true;
    if (state.success) resetBooking(false);
    selectService(button.dataset.service);
    showStep(1);
  }));
  function nameValid() { return $('#first-name').value.trim().length >= 2; }
  function phoneValid() {
    let phone = $('#phone').value.trim().replace(/[\s.\-]/g, '');
    phone = phone.replace(/^0033/, '+33').replace(/^\+33\(0\)/, '+33').replace(/[()]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(phone);
  }
  function validateField(input, error, valid) {
    input.setAttribute('aria-invalid', String(!valid)); error.hidden = valid;
  }
  const validators = [
    { input: $('#first-name'), error: $('#name-error'), test: nameValid },
    { input: $('#phone'), error: $('#phone-error'), test: phoneValid }
  ];
  validators.forEach(({ input, error, test }) => input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) validateField(input, error, test());
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || !state.service || !state.date || state.time === null) return;
    let firstInvalid = null;
    validators.forEach(({ input, error, test }) => {
      const valid = test(); validateField(input, error, valid);
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); announce('Vérifiez les champs indiqués avant de terminer la simulation.'); return; }
    // Recheck the clock at confirmation, including a page left open overnight.
    const now = parisNow();
    const distance = (dateObject(state.date) - dateObject(now.key)) / 86400000;
    const slot = slotsFor(state.date, state.service, now).find(item => item.start === state.time);
    if (distance < 0 || distance >= 14 || !slot || slot.disabled) {
      state.time = null; if (distance < 0 || distance >= 14) state.date = null;
      updateSummary(); showStep(state.date ? 2 : 1);
      const error = $('#availability-error');
      error.textContent = 'Ce créneau n’est plus disponible. Choisissez un nouveau créneau de démonstration.';
      error.hidden = false;
      announce(error.textContent);
      return;
    }
    state.success = true; form.hidden = true;
    $('#booking-success').hidden = false; summary.classList.add('is-complete');
    $('#success-message').textContent = `${$('#first-name').value.trim()}, vous avez essayé le parcours pour ${state.service.name.toLowerCase()}${state.service.detail ? `, ${state.service.detail.toLowerCase()}` : ''}, le ${dateLabel(state.date)} à ${timeLabel(state.time)}. ${durationLabel(state.service.duration)} · ${priceLabel(state.service)}, à confirmer.`;
    updateSummary();
    const title = $('#success-title'); title.focus({ preventScroll: true }); title.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce('Simulation terminée. Aucun rendez-vous réservé, rien envoyé au salon.');
    if (!reducedMotion.matches && !keyboardInteraction && $('#booking-success').animate) {
      $('#booking-success').animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    // No contact information is retained in the inputs after the demonstration.
    $('#first-name').value = ''; $('#phone').value = '';
  });
  $('#restart').addEventListener('click', () => resetBooking());
  function stopMotion() {
    if (!reducedMotion.matches) return;
    document.getAnimations?.().forEach(animation => animation.finish());
    form.classList.remove('is-leaving', 'is-entering');
  }
  reducedMotion.addEventListener('change', stopMotion);
  renderServices(); updateSummary(); app.hidden = false;
  // All public content remains visible when JavaScript is unavailable or fails before initialization.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .08 });
    $$('.menu-row').forEach((row, index) => { row.style.transitionDelay = `${index % 3 * 60}ms`; });
    document.documentElement.classList.add('js');
    $$('[data-reveal]').forEach(node => observer.observe(node));
    requestAnimationFrame(() => requestAnimationFrame(() => $('.hero').classList.add('is-visible')));
  }
})();
