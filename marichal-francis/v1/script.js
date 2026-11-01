/* Francis Marichal — preview only. No request, storage, analytics or booking backend. */
(() => {
  'use strict';

  const SERVICES = {
    coupe: { name: 'Coupe masculine', duration: 30, price: 20 },
    coiffage: { name: 'Coupe & coiffage', duration: 45, price: 25 },
    soin: { name: 'Soin capillaire', duration: 15, price: 10 }
  };
  // Bottin, research dated 01/11/2026. Conflicting public hours: to confirm.
  const HOURS = { 0: null, 1: null, 2: [480, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1080] };
  const parisClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateLong = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const weekdayShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(instant).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dayDate(key) { return new Date(`${key}T12:00:00Z`); }
  function nextDays(now = parisNow()) {
    const first = dayDate(now.key);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + offset);
      return { key: date.toISOString().slice(0, 10), date, weekday: date.getUTCDay() };
    });
  }
  function formatTime(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  }
  function simulatedSlots(key, service, now = parisNow()) {
    const range = HOURS[dayDate(key).getUTCDay()];
    if (!range || !service) return [];
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = range[0]; minute + service.duration <= range[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const occupied = ((seed * 13 + minute * 7) % 11) < 3;
      slots.push({ minute, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Déjà pris' : 'Exemple' });
    }
    return slots;
  }
  function validMobile(value) {
    return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));
  }
  // The date and availability functions above are deterministic and can be verified independently.

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { service: null, day: null, time: null, step: 0, done: false };
  const form = $('#booking-form');
  const panels = $$('.step-panel');
  const success = $('#success');
  const stepNav = $('.step-nav');
  const status = $('#booking-status');
  let inputMethod = 'pointer';
  let switchTimer = 0;
  let transitionToken = 0;
  let announceTimer = 0;
  let pendingCommit = null;

  root.classList.add('js');
  document.addEventListener('keydown', () => { inputMethod = 'keyboard'; }, { capture: true });
  document.addEventListener('pointerdown', () => { inputMethod = 'pointer'; }, { capture: true, passive: true });

  function announce(message) {
    clearTimeout(announceTimer);
    status.textContent = '';
    announceTimer = window.setTimeout(() => { status.textContent = message; }, 30);
  }
  function prerequisites(step) {
    return step === 0 || (step === 1 && !!state.service) || (step === 2 && !!state.service && !!state.day) || (step === 3 && !!state.service && !!state.day && state.time !== null);
  }
  function updateNav() {
    $$('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = !prerequisites(step);
      if (step === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.classList.toggle('is-complete', step < state.step);
    });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
  }
  function updateSummary() {
    const service = SERVICES[state.service];
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-day').textContent = state.day ? dateShort.format(dayDate(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    $('#summary-price').textContent = service ? `${service.duration}\u00a0min · ${service.price}\u00a0€ (exemple)` : '—';
    const recap = service && state.day && state.time !== null ? `${service.name} · ${dateLong.format(dayDate(state.day))} à ${formatTime(state.time)} · ${service.duration}\u00a0min · ${service.price}\u00a0€ indicatifs. Exemple uniquement, à confirmer avec le salon.` : '';
    $('#confirmation-recap').textContent = recap;
    updateNav();
  }

  function renderDays() {
    const container = $('#day-options');
    const service = SERVICES[state.service];
    const now = parisNow();
    const days = nextDays(now);
    if (state.day && !days.some(day => day.key === state.day)) { state.day = null; state.time = null; }
    container.replaceChildren();
    days.forEach(({ key, date, weekday }, index) => {
      const closed = !HOURS[weekday];
      const noHours = !closed && !simulatedSlots(key, service, now).some(slot => !slot.disabled);
      if (key === state.day && (closed || noHours)) { state.day = null; state.time = null; }
      const label = document.createElement('label');
      label.className = 'choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'day'; radio.value = key;
      radio.disabled = closed || noHours;
      radio.checked = state.day === key;
      const note = closed ? 'Fermé' : noHours ? 'Plus d’heure' : index === 0 ? 'Aujourd’hui' : monthShort.format(date);
      radio.setAttribute('aria-label', `${dateLong.format(date)}, ${closed ? 'fermé, horaires à confirmer' : noHours ? 'aucun créneau d’exemple restant' : 'jour de simulation'}`);
      const content = document.createElement('span'); content.className = 'choice-content';
      const top = document.createElement('span'); top.className = 'date-weekday'; top.textContent = weekdayShort.format(date);
      const number = document.createElement('span'); number.className = 'date-number'; number.textContent = date.getUTCDate();
      const bottom = document.createElement('span'); bottom.className = 'date-month'; bottom.textContent = note;
      content.append(top, number, bottom); label.append(radio, content); container.append(label);
    });
    updateSummary();
  }
  function renderSlots() {
    const container = $('#time-options');
    container.replaceChildren();
    if (!state.day || !state.service) return;
    const slots = simulatedSlots(state.day, SERVICES[state.service]);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    $('#slot-date').textContent = dateLong.format(dayDate(state.day));
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'time'; radio.value = slot.minute;
      radio.disabled = slot.disabled; radio.checked = state.time === slot.minute;
      radio.setAttribute('aria-label', `${formatTime(slot.minute)}, ${slot.reason.toLowerCase()}, simulation`);
      const content = document.createElement('span'); content.className = 'choice-content';
      const time = document.createElement('span'); time.textContent = formatTime(slot.minute);
      const note = document.createElement('small'); note.textContent = slot.reason;
      content.append(time, note); label.append(radio, content); container.append(label);
    });
    updateSummary();
  }

  function showStep(step, options = {}) {
    const isSuccess = options.success === true;
    if (!isSuccess && !prerequisites(step)) return;
    clearTimeout(switchTimer);
    const token = ++transitionToken;
    const active = !success.hidden ? success : panels.find(panel => !panel.hidden);
    const target = isSuccess ? success : panels[step];
    const animate = inputMethod !== 'keyboard' && !reducedMotion.matches && active !== target;
    [...panels, success].forEach(panel => panel.classList.remove('is-leaving', 'is-entering'));
    if (!isSuccess && step === 1) renderDays();
    if (!isSuccess && step === 2) renderSlots();
    function commit() {
      if (token !== transitionToken) return;
      pendingCommit = null;
      state.step = step; state.done = isSuccess;
      [...panels, success].forEach(panel => panel.classList.remove('is-leaving', 'is-entering'));
      panels.forEach(panel => { panel.hidden = panel !== target; });
      form.hidden = isSuccess;
      stepNav.hidden = isSuccess;
      success.hidden = !isSuccess;
      target.hidden = false;
      if (animate && !reducedMotion.matches) target.classList.add('is-entering');
      updateSummary();
      const heading = isSuccess ? $('#success-title') : $(`#step-title-${step}`);
      if (options.focus !== false) {
        heading.focus({ preventScroll: false });
        heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
      announce(isSuccess ? 'Simulation terminée. Aucun rendez-vous pris, aucune information envoyée.' : `Étape ${step + 1} sur 4. ${heading.textContent}`);
      if (animate) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (token === transitionToken) target.classList.remove('is-entering');
        }));
      }
    }
    pendingCommit = commit;
    if (animate && active) { active.classList.add('is-leaving'); switchTimer = window.setTimeout(commit, 110); }
    else commit();
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service' && SERVICES[input.value]) {
      const changed = state.service !== input.value;
      state.service = input.value;
      if (changed) { state.day = null; state.time = null; }
      announce(`${SERVICES[state.service].name}, ${SERVICES[state.service].duration} minutes, ${SERVICES[state.service].price} euros indicatifs. Exemple sélectionné.`);
    } else if (input.name === 'day' && !input.disabled) {
      state.day = input.value; state.time = null;
      announce(`${dateLong.format(dayDate(state.day))} sélectionné pour la simulation.`);
    } else if (input.name === 'time' && !input.disabled) {
      state.time = Number(input.value);
      announce(`${formatTime(state.time)} sélectionné, créneau fictif.`);
    }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.service;
    if (!SERVICES[id]) return;
    if (state.service !== id || state.done) { state.day = null; state.time = null; }
    state.service = id;
    $(`input[name="service"][value="${id}"]`).checked = true;
    if (state.done) { $('#first-name').value = ''; $('#phone').value = ''; }
    showStep(0);
    updateSummary();
    $('#essayer').scrollIntoView({ behavior: reducedMotion.matches || inputMethod === 'keyboard' ? 'instant' : 'smooth', block: 'start' });
    announce(`${SERVICES[id].name} sélectionné pour l’essai. Aucun rendez-vous réel.`);
  }));

  function fieldError(input, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(`#${input.id}-error`).textContent = message;
  }
  [$('#first-name'), $('#phone')].forEach(input => input.addEventListener('input', () => fieldError(input, '')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!prerequisites(3)) { announce('Choisissez une prestation, un jour et une heure d’exemple.'); return; }
    const stillAvailable = simulatedSlots(state.day, SERVICES[state.service]).some(slot => slot.minute === state.time && !slot.disabled);
    if (!stillAvailable) {
      state.time = null;
      showStep(2);
      announce('Cette heure est désormais passée. Choisissez une autre heure ou un autre jour pour l’essai.');
      return;
    }
    const name = $('#first-name'); const phone = $('#phone');
    const nameIssue = !name.value.trim() ? 'Indiquez un prénom, même fictif, pour l’essai.' : '';
    const phoneIssue = validMobile(phone.value) ? '' : 'Utilisez un mobile français commençant par 06, 07, +33 6 ou +33 7.';
    fieldError(name, nameIssue); fieldError(phone, phoneIssue);
    if (nameIssue || phoneIssue) {
      (nameIssue ? name : phone).focus();
      announce('Vérifiez les champs signalés. Aucune information n’a été envoyée.');
      return;
    }
    $('#success-recap').textContent = `Votre exemple : ${SERVICES[state.service].name}, ${dateLong.format(dayDate(state.day))} à ${formatTime(state.time)}, ${SERVICES[state.service].duration}\u00a0min, ${SERVICES[state.service].price}\u00a0€ indicatifs.`;
    // Contact data has no role after validation: clear it rather than retain it in the form.
    name.value = ''; phone.value = '';
    showStep(3, { success: true });
  });
  $('#restart').addEventListener('click', () => {
    state.service = null; state.day = null; state.time = null;
    form.reset();
    [$('#first-name'), $('#phone')].forEach(input => fieldError(input, ''));
    showStep(0);
    updateSummary();
  });

  const weekday = dayDate(parisNow().key).getUTCDay();
  $(`[data-weekday="${weekday}"]`)?.classList.add('is-today');
  updateSummary();

  // First-screen choreography and distinct, once-only reveals. The fallback is fully visible.
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
    $$('[data-reveal]').forEach(element => revealObserver.observe(element));
  }
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      root.classList.remove('motion');
      clearTimeout(switchTimer);
      [...panels, success].forEach(panel => panel.classList.remove('is-leaving', 'is-entering'));
      if (pendingCommit) pendingCommit();
    }
  });

  // Practical mobile actions, never a misleading reservation CTA for a walk-in salon.
  if ('IntersectionObserver' in window) {
    const bar = $('.mobile-bar');
    let heroPassed = false; let bookingVisible = false; let footerVisible = false;
    const updateBar = () => { bar.hidden = !heroPassed || bookingVisible || footerVisible; };
    const actionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0;
        if (entry.target.id === 'essayer') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'pied') footerVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0 });
    ['#hero-actions', '#essayer', '#pied'].forEach(selector => actionObserver.observe($(selector)));
  }
})();
