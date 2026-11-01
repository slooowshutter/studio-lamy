/* Réservation locale, sans envoi ni stockage.  */
(() => {
  'use strict';
  const SERVICES = [
    { id: 'pose', name: 'Pose gel / résine' },
    { id: 'remplissage', name: 'Remplissage' },
    { id: 'semi', name: 'Vernis semi-permanent' }
  ];
  const NB = '\u00a0';
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).map(p => [p.type, p.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const civilDate = iso => new Date(`${iso}T12:00:00Z`);
  const timeText = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const formatDate = iso => longDate.format(civilDate(iso));
  const hoursFor = iso => civilDate(iso).getUTCDay() === 0 ? null : [540, 1140];
  function holiday(iso) {
    const year = Number(iso.slice(0, 4));
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(iso.slice(5))) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(year, month - 1, day, 12);
    return [1, 39, 50].some(offset => new Date(easter + offset * 86400000).toISOString().slice(0, 10) === iso);
  }
  function slotsFor(iso, now = new Date()) {
    const hours = hoursFor(iso);
    if (!hours) return [];
    const current = parisNow(now);
    const seed = Number(iso.replaceAll('-', ''));
    const slots = [];
    for (let minute = hours[0]; minute < hours[1]; minute += 30) {
      const past = iso < current.iso || (iso === current.iso && minute <= current.minutes);
      const taken = (seed + minute / 30) % 7 < 2;
      slots.push({ minute, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : 'exemple' });
    }
    return slots;
  }
  function nextDays(now = new Date()) {
    const first = civilDate(parisNow(now).iso);
    return Array.from({ length: 14 }, (_, index) => new Date(first.getTime() + index * 86400000).toISOString().slice(0, 10));
  }
  const validPhone = value => /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));

  // The same pure scheduling logic is used by the local verification command.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { SERVICES, parisNow, civilDate, hoursFor, slotsFor, nextDays, validPhone, holiday, timeText };
    return;
  }
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { service: null, date: null, time: null, step: 0, success: false };
  let keyboard = false;
  let transitionTimer = null;
  let entranceFrame = null;
  let pendingPanel = null;
  let observer;

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ' || event.key.startsWith('Arrow')) {
      keyboard = true;
      root.classList.add('keyboard-mode');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  function revealAll() {
    root.classList.add('ready');
    $$('[data-reveal]').forEach(node => node.classList.add('is-visible'));
    if (observer) observer.disconnect();
  }
  if ('IntersectionObserver' in window && !reduced.matches) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    $$('[data-reveal]').forEach(node => observer.observe(node));
    $$('.menu-row').forEach((node, index) => { node.style.transitionDelay = `${index * 60}ms`; });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  } else revealAll();
  reduced.addEventListener('change', event => { if (event.matches) revealAll(); });

  const form = $('#booking-form');
  const app = $('#booking-app');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const status = $('#booking-status');

  function focusInView(node, block = 'start') {
    node.focus({ preventScroll: true });
    const barHeight = $('.mobile-bar').getBoundingClientRect().height;
    const bounds = node.getBoundingClientRect();
    if (bounds.top < 24 || bounds.bottom > window.innerHeight - barHeight - 20) {
      node.scrollIntoView({ block, behavior: 'instant' });
    }
  }
  // Native focus scrolling does not always account for a fixed mobile action bar.
  document.addEventListener('focusin', event => {
    if (!app.contains(event.target) || event.target.tabIndex === -1) return;
    const bounds = event.target.getBoundingClientRect();
    const barHeight = $('.mobile-bar').getBoundingClientRect().height;
    if (bounds.bottom > window.innerHeight - barHeight - 20 || bounds.top < 12) {
      event.target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  });

  function radio(name, value, content, disabled = false, checked = false) {
    const label = document.createElement('label');
    label.className = name === 'service' ? 'service-option' : 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value);
    input.disabled = disabled; input.checked = checked;
    label.append(input, content);
    return label;
  }
  function span(text, className = '') {
    const node = document.createElement('span');
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function renderServices() {
    const fragment = document.createDocumentFragment();
    SERVICES.forEach(service => {
      const content = document.createElement('span');
      content.append(span(service.name, 'service-name'), span('Durée à confirmer avec le salon', 'fine'), span('Tarif à confirmer avec le salon', 'fine'));
      fragment.append(radio('service', service.id, content, false, state.service?.id === service.id));
    });
    $('#service-options').replaceChildren(fragment);
  }
  function renderDays() {
    const fragment = document.createDocumentFragment();
    nextDays().forEach((iso, index) => {
      const date = civilDate(iso);
      const sunday = !hoursFor(iso);
      const available = !sunday && slotsFor(iso).some(slot => !slot.disabled);
      const content = document.createElement('span');
      content.className = 'choice-content';
      content.append(span(index === 0 ? 'Aujourd’hui' : shortDay.format(date)));
      const number = document.createElement('b'); number.textContent = date.getUTCDate();
      content.append(number, span(shortMonth.format(date)));
      const note = document.createElement('small');
      note.textContent = sunday ? 'non proposé' : !available ? 'complet / passé' : holiday(iso) ? 'férié · à confirmer' : '9 h – 19 h';
      content.append(note);
      fragment.append(radio('day', iso, content, !available, state.date === iso));
    });
    $('#day-options').replaceChildren(fragment);
  }
  function renderSlots() {
    if (!state.date || !state.service) return;
    $('#slot-date').textContent = formatDate(state.date);
    const fragment = document.createDocumentFragment();
    const slots = slotsFor(state.date);
    slots.forEach(slot => {
      const content = document.createElement('span'); content.className = 'choice-content';
      const note = document.createElement('small'); note.textContent = slot.reason;
      content.append(span(timeText(slot.minute)), note);
      fragment.append(radio('time', slot.minute, content, slot.disabled, state.time === slot.minute));
    });
    $('#slot-options').replaceChildren(fragment);
    if (!slots.some(slot => !slot.disabled)) $('#time-error').textContent = 'Aucun créneau disponible dans cet exemple. Choisissez un autre jour.';
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service?.name || 'Une prestation à choisir';
    $('#summary-date').textContent = state.date ? formatDate(state.date) : 'Un jour à choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'Une heure à choisir';
    $('#summary-duration').textContent = 'À confirmer avec le salon';
    stepButtons.forEach((button, index) => {
      button.disabled = state.success || (index > 0 && !state.service) || (index > 1 && !state.date) || (index > 2 && state.time === null);
      if (index === state.step && !state.success) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (state.service && state.date && state.time !== null) $('#final-recap').textContent = recap();
  }
  function recap() {
    return `${state.service.name} · ${formatDate(state.date)} à ${timeText(state.time)} · durée à confirmer · tarif à confirmer avec le salon. Adresse${NB}: 12 rue d’Aguesseau, Limoges.`;
  }
  function finishTransition() {
    clearTimeout(transitionTimer);
    if (entranceFrame) cancelAnimationFrame(entranceFrame);
    panels.forEach(panel => { panel.classList.remove('is-leaving', 'is-entering'); panel.inert = false; });
    $('#success').classList.remove('is-entering');
    if (pendingPanel) { panels.forEach(panel => { panel.hidden = panel !== pendingPanel; }); pendingPanel = null; }
  }
  function goTo(step, focus = true) {
    finishTransition();
    const currentPanel = panels.find(panel => !panel.hidden);
    const nextPanel = panels[step];
    const title = $(`#step-title-${step}`);
    const animate = !reduced.matches && !keyboard && currentPanel && currentPanel !== nextPanel;
    state.step = step;
    updateSummary();
    status.textContent = `Étape ${step + 1} sur 4${NB}: ${title.textContent}`;
    if (animate) {
      pendingPanel = nextPanel;
      nextPanel.hidden = false;
      nextPanel.classList.add('is-entering');
      currentPanel.inert = true;
      currentPanel.classList.add('is-leaving');
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => {
          nextPanel.classList.remove('is-entering');
          transitionTimer = setTimeout(() => {
            currentPanel.hidden = true;
            currentPanel.inert = false;
            currentPanel.classList.remove('is-leaving');
            pendingPanel = null;
          }, 240);
        });
      });
    } else panels.forEach(panel => { panel.hidden = panel !== nextPanel; });
    if (focus) focusInView(title);
  }
  function clearError(id) { $(id).textContent = ''; }
  function error(id, message, input) {
    $(id).textContent = message;
    if (input) focusInView(input, 'center');
  }
  function chooseService(id) {
    const next = SERVICES.find(service => service.id === id);
    if (!next) return;
    if (state.service?.id !== id) { state.service = next; state.date = null; state.time = null; }
    renderServices();
    renderDays();
    updateSummary();
    clearError('#service-error');
  }
  function validateStep(step) {
    if (step === 0 && !state.service) { error('#service-error', 'Choisissez une prestation pour continuer.', $('input[name="service"]')); return false; }
    if (step === 1) {
      const current = state.date && nextDays().includes(state.date) && slotsFor(state.date).some(slot => !slot.disabled);
      if (!current) {
        state.date = null; state.time = null; renderDays(); updateSummary();
        error('#day-error', 'Choisissez un jour disponible dans cet exemple.', $('input[name="day"]:not(:disabled)')); return false;
      }
    }
    if (step === 2 && state.time === null) { error('#time-error', 'Choisissez une heure pour continuer.', $('input[name="time"]:not(:disabled)')); return false; }
    return true;
  }
  form.addEventListener('change', event => {
    if (event.target.name === 'service') {
      // Keep keyboard focus on the selected radio when the group is rebuilt.
      const id = event.target.value;
      chooseService(id);
      $(`input[name="service"][value="${id}"]`).focus({ preventScroll: true });
    }
    if (event.target.name === 'day') {
      state.date = event.target.value; state.time = null;
      clearError('#day-error'); clearError('#time-error'); renderSlots(); updateSummary();
    }
    if (event.target.name === 'time') {
      state.time = Number(event.target.value); clearError('#time-error'); updateSummary();
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (!validateStep(state.step)) return;
    const next = Number(button.dataset.next);
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    if (next === 3) {
      const slot = slotsFor(state.date).find(item => item.minute === state.time);
      if (!slot || slot.disabled) {
        state.time = null; updateSummary(); renderSlots();
        error('#time-error', 'Cette heure vient de passer. Choisissez un autre créneau.'); return;
      }
    }
    goTo(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    goTo(step);
  }));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (state.success) reset();
    chooseService(button.dataset.service);
    goTo(1);
  }));
  function validateContact() {
    const first = $('#firstname'); const phone = $('#phone');
    const firstOk = first.value.trim().length > 0;
    const phoneOk = validPhone(phone.value);
    $('#firstname-error').textContent = firstOk ? '' : 'Indiquez un prénom, même pour cet essai.';
    $('#phone-error').textContent = phoneOk ? '' : 'Indiquez un mobile français, par exemple 06 00 00 00 00.';
    first.setAttribute('aria-invalid', String(!firstOk)); phone.setAttribute('aria-invalid', String(!phoneOk));
    if (!firstOk) focusInView(first, 'center'); else if (!phoneOk) focusInView(phone, 'center');
    return firstOk && phoneOk;
  }
  ['firstname', 'phone'].forEach(id => $(`#${id}`).addEventListener('input', () => {
    $(`#${id}`).removeAttribute('aria-invalid'); clearError(`#${id}-error`);
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!state.service || !state.date || state.time === null) { goTo(!state.service ? 0 : !state.date ? 1 : 2); return; }
    if (!validateContact()) return;
    const slot = slotsFor(state.date).find(item => item.minute === state.time);
    if (!slot || slot.disabled) {
      state.time = null; renderSlots(); goTo(2); error('#time-error', 'Cette heure vient de passer. Choisissez un autre créneau.'); return;
    }
    finishTransition();
    state.success = true;
    $('#success-recap').textContent = `${$('#firstname').value.trim()}, voici votre essai${NB}: ${recap()}`;
    form.hidden = true; $('#success').hidden = false;
    if (!reduced.matches && !keyboard) {
      $('#success').classList.add('is-entering');
      entranceFrame = requestAnimationFrame(() => { entranceFrame = requestAnimationFrame(() => $('#success').classList.remove('is-entering')); });
    }
    updateSummary();
    status.textContent = 'Simulation terminée. Rien n’a été envoyé et aucun créneau n’est réservé.';
    focusInView($('#success-title'));
  });
  function reset() {
    finishTransition(); form.reset(); state.service = null; state.date = null; state.time = null; state.step = 0; state.success = false;
    form.hidden = false; $('#success').hidden = true;
    $$('.field-error').forEach(node => { node.textContent = ''; });
    $$('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    renderServices(); updateSummary(); goTo(0);
  }
  $('#restart').addEventListener('click', reset);

  renderServices(); updateSummary(); app.hidden = false;
  window.salonReady = true;
})();
