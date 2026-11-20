(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardAction = false;
  document.addEventListener('keydown', () => { keyboardAction = true; root.classList.add('using-keyboard'); });
  document.addEventListener('pointerdown', () => { keyboardAction = false; root.classList.remove('using-keyboard'); });
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => Array.from(parent.querySelectorAll(s));

  /* Sans JavaScript, les textes restent visibles et les vrais liens fonctionnent. */
  if (!reduce.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
    $$('[data-reveal]').forEach((el, i) => {
      if (el.dataset.reveal === 'ligne') el.style.transitionDelay = `${(i % 4) * 50}ms`;
      observer.observe(el);
    });
  }

  /* Le fil grandit seulement sous le regard : un transform, une mesure par image. */
  const line = $('.path-line');
  const progress = $('.path-progress');
  const journey = $('.journey');
  const endNode = $('.path-node-end');
  let lineTop = 0;
  let lineHeight = 1;
  let framePending = false;
  function paintProgress() {
    framePending = false;
    if (reduce.matches) { progress.style.transform = 'none'; return; }
    const amount = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight * .72 - lineTop) / lineHeight));
    progress.style.transform = `scaleY(${amount})`;
  }
  function measureLine() {
    const journeyRect = journey.getBoundingClientRect();
    const nodeRect = endNode.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(line).top);
    const bottom = nodeRect.top + nodeRect.height / 2 - journeyRect.top;
    lineTop = journeyRect.top + window.scrollY + top;
    lineHeight = Math.max(1, bottom - top);
    line.style.height = `${lineHeight}px`;
    line.style.bottom = 'auto';
    paintProgress();
  }
  function onScroll() {
    if (!framePending) { framePending = true; requestAnimationFrame(paintProgress); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measureLine, { passive: true });
  window.addEventListener('load', measureLine, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(measureLine).observe(journey);
  reduce.addEventListener('change', () => {
    root.classList.remove('motion');
    if (stepAnimation) stepAnimation.cancel();
    paintProgress();
  });
  measureLine();

  /* Horaires Planity relevés le 19/11/2026. Aucune durée ni disponibilité supposée. */
  const HOURS = { 0: null, 1: null, 2: [540, 780], 3: [540, 1080], 4: [540, 1080], 5: [540, 1140], 6: [510, 1020] };
  const SERVICES = {
    coupe: 'Shampoing + coupe + brushing',
    couleur: 'Couleur + shampoing + coupe + brushing',
    masculin: 'Forfait masculin',
    barbe: 'Barbe sans soin'
  };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), minutes: (+parts.hour % 24) * 60 + +parts.minute };
  }
  const keyOf = d => d.toISOString().slice(0, 10);
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  let step = 0;
  let service = '';
  let selectedDate = '';
  let selectedTime = '';
  let dates = [];
  let stepAnimation;
  const panels = $$('[data-panel]');
  const form = $('#booking-form');
  const app = $('#booking-app');
  const announce = $('#booking-announcement');
  const stepButtons = $$('[data-step]');
  app.hidden = false;

  function makeRadio(name, value, text, cls, disabled = false) {
    const label = document.createElement('label');
    label.className = cls;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    const span = document.createElement('span');
    span.textContent = text;
    label.append(input, span);
    return { label, input, span };
  }
  function renderDates() {
    const { date: today, minutes } = parisNow();
    const container = $('#date-options');
    container.replaceChildren();
    dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);
      const key = keyOf(date), dow = date.getUTCDay(), hours = HOURS[dow];
      const elapsed = i === 0 && hours && minutes >= hours[1] - 30;
      const disabled = !hours || elapsed;
      dates.push({ date, key, dow });
      const { label, input, span } = makeRadio('jour', key, '', 'date-option', disabled);
      input.checked = key === selectedDate;
      input.setAttribute('aria-label', `${dateFormat.format(date)}${!hours ? ', fermé' : elapsed ? ', journée passée' : dow === 2 ? ', horaires à confirmer' : ''}`);
      const day = document.createElement('span'); day.textContent = shortDayFormat.format(date);
      const number = document.createElement('strong'); number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.textContent = monthFormat.format(date);
      const state = document.createElement('small'); state.textContent = !hours ? 'Fermé' : elapsed ? 'Passé' : dow === 2 ? 'À confirmer' : '';
      span.append(day, number, month, state);
      container.append(label);
    }
  }
  function renderTimes() {
    const container = $('#time-options');
    container.replaceChildren();
    const selected = dates.find(d => d.key === selectedDate);
    if (!selected || !HOURS[selected.dow]) return;
    const now = parisNow();
    const [opening, closing] = HOURS[selected.dow];
    let count = 0;
    for (let time = opening; time < closing; time += 30) {
      if (selectedDate === keyOf(now.date) && time <= now.minutes) continue;
      const { label, input } = makeRadio('heure', String(time), timeLabel(time), 'time-option');
      input.checked = String(time) === selectedTime;
      container.append(label); count++;
    }
    if (!count) {
      const message = document.createElement('p');
      message.textContent = 'Il n’y a plus d’heure à essayer pour ce jour. Choisissez un autre jour.';
      container.append(message);
    }
  }
  function momentLabel() {
    const date = dates.find(d => d.key === selectedDate);
    return date && selectedTime ? `${dateFormat.format(date.date)} à ${timeLabel(+selectedTime)}` : 'Un jour et une heure à choisir';
  }
  function updateSummary() {
    $('#selection-service').textContent = SERVICES[service] || 'Une prestation à choisir';
    $('#selection-date').textContent = momentLabel();
    $('#recap-service').textContent = SERVICES[service] || '';
    $('#recap-moment').textContent = momentLabel();
    measureLine();
  }
  function animatePanel(panel) {
    if (stepAnimation) stepAnimation.cancel();
    if (!reduce.matches && !keyboardAction && panel.animate) {
      stepAnimation = panel.animate([{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function showStep(next, focus = true) {
    step = next;
    panels.forEach((panel, i) => { panel.hidden = i !== step; });
    stepButtons.forEach((button, i) => {
      button.disabled = i === 1 ? !service : i === 2 ? !(service && selectedDate && selectedTime) : false;
      if (i === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    const current = panels[step];
    animatePanel(current);
    if (focus) $('h3', current).focus();
    announce.textContent = `Étape ${step + 1} sur 3\u00a0: ${$('h3', current).textContent}`;
    updateSummary();
  }
  function validService() {
    if (service) return true;
    $('#service-error').textContent = 'Choisissez une prestation pour continuer.';
    $('input[name="prestation"]').focus();
    return false;
  }
  function validMoment() {
    const date = dates.find(d => d.key === selectedDate);
    const now = parisNow();
    const hours = date && HOURS[date.dow];
    const time = +selectedTime;
    if (!date || !selectedTime || !hours || selectedDate < keyOf(now.date) || time < hours[0] || time >= hours[1] || (selectedDate === keyOf(now.date) && time <= now.minutes)) {
      $('#moment-error').textContent = 'Choisissez un jour et une heure à venir pour cet essai.';
      if (selectedDate) renderTimes();
      const target = selectedDate ? $('input[name="heure"]:not(:disabled)') : $('input[name="jour"]:not(:disabled)');
      if (target) target.focus();
      return false;
    }
    return true;
  }
  form.addEventListener('change', event => {
    const target = event.target;
    if (target.name === 'prestation') { service = target.value; $('#service-error').textContent = ''; }
    if (target.name === 'jour') { selectedDate = target.value; selectedTime = ''; renderTimes(); $('#moment-error').textContent = ''; }
    if (target.name === 'heure') { selectedTime = target.value; $('#moment-error').textContent = ''; }
    updateSummary();
    stepButtons[1].disabled = !service;
    stepButtons[2].disabled = !(service && selectedDate && selectedTime);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = +button.dataset.next;
    if (next === 1 && !validService()) return;
    if (next === 2 && !validMoment()) return;
    if (next === 1) { renderDates(); if (selectedDate) renderTimes(); }
    showStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.back)));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const next = +button.dataset.step;
    if (next === 2 && !validMoment()) return;
    if (next === 1) { renderDates(); if (selectedDate) renderTimes(); }
    showStep(next);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (!$('#booking-success').hidden) resetBooking();
    service = link.dataset.service;
    $(`input[name="prestation"][value="${service}"]`).checked = true;
    $('#service-error').textContent = '';
    renderDates();
    showStep(1, false);
  }));
  const firstName = $('#prenom');
  const phone = $('#telephone');
  function clearFieldError(input) {
    input.removeAttribute('aria-invalid');
    $(`#${input.id}-error`).textContent = '';
  }
  [firstName, phone].forEach(input => input.addEventListener('input', () => clearFieldError(input)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validService()) { showStep(0); return; }
    if (!validMoment()) { showStep(1); return; }
    clearFieldError(firstName); clearFieldError(phone);
    let firstInvalid;
    if (firstName.value.trim().length < 2) {
      $('#prenom-error').textContent = 'Indiquez un prénom d’au moins deux caractères.';
      firstName.setAttribute('aria-invalid', 'true'); firstInvalid = firstName;
    }
    const normalized = phone.value.replace(/[\s.()-]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
    if (!/^0[1-9]\d{8}$/.test(normalized)) {
      $('#telephone-error').textContent = 'Indiquez un numéro français de dix chiffres, ou avec +33.';
      phone.setAttribute('aria-invalid', 'true'); firstInvalid ||= phone;
    }
    if (firstInvalid) { firstInvalid.focus(); return; }
    form.hidden = true;
    $('.booking-steps').hidden = true;
    const success = $('#booking-success');
    success.hidden = false;
    $('#success-recap').textContent = `Sélection d’essai\u00a0: ${SERVICES[service]}, ${momentLabel()}, au 68 rue de Cernay à Reims.`;
    /* Les coordonnées sont effacées dès que le parcours est terminé. */
    firstName.value = ''; phone.value = '';
    animatePanel(success);
    $('#titre-succes').focus();
    announce.textContent = 'L’essai est terminé. Aucun rendez-vous n’a été pris. Aucune donnée n’a été envoyée.';
    measureLine();
  });
  function resetBooking() {
    form.reset();
    service = ''; selectedDate = ''; selectedTime = '';
    $('#booking-success').hidden = true;
    form.hidden = false;
    $('.booking-steps').hidden = false;
    $$('.field-error').forEach(el => { el.textContent = ''; });
    [firstName, phone].forEach(clearFieldError);
    $('#time-options').replaceChildren();
    const message = document.createElement('p'); message.textContent = 'Choisissez d’abord un jour.';
    $('#time-options').append(message);
    renderDates(); showStep(0);
  }
  $('#restart-booking').addEventListener('click', resetBooking);
  renderDates();
  showStep(0, false);
})();
