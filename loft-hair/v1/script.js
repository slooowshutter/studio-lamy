(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ready = () => requestAnimationFrame(() => root.classList.add('is-ready'));
  Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(resolve => setTimeout(resolve, 650))]).then(ready);
  setTimeout(ready, 900);

  document.addEventListener('keydown', () => document.body.classList.add('keyboard-action'));
  document.addEventListener('pointerdown', () => document.body.classList.remove('keyboard-action'), { passive: true });

  const revealItems = [...$$('.node'), ...$$('.service-row'), $('.botanical-sprig')].filter(Boolean);
  if ('IntersectionObserver' in window && !reduced.matches) {
    $$('.service-row').forEach((row, index) => row.style.setProperty('--delay', `${index * 60}ms`));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('awaiting');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -28px 0px', threshold: .12 });
    revealItems.forEach(item => {
      item.classList.add('awaiting');
      observer.observe(item);
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        revealItems.forEach(item => item.classList.remove('awaiting'));
        observer.disconnect();
      }
    });
  }

  /* Un seul trait, lu une fois après un changement de géométrie. */
  const journey = $('.journey');
  const track = $('.path-track');
  const progress = $('.path-progress');
  const origin = $('.origin');
  let pathTop = 0;
  let pathHeight = 1;
  let pendingScroll = false;
  let pendingMeasure = false;
  function drawPath() {
    pendingScroll = false;
    if (reduced.matches) { progress.style.transform = 'none'; return; }
    const portion = Math.max(.001, Math.min(1, (scrollY + innerHeight * .72 - pathTop) / pathHeight));
    progress.style.transform = `scaleY(${portion})`;
  }
  function measurePath() {
    pendingMeasure = false;
    const title = $('.hero h1');
    const body = $('.hero-body');
    const start = body.offsetTop;
    const originTop = title.offsetTop + title.offsetHeight - 25;
    origin.style.top = `${originTop}px`;
    origin.style.height = `${Math.max(16, start - originTop)}px`;
    track.style.top = `${start}px`;
    pathTop = journey.getBoundingClientRect().top + scrollY + start;
    pathHeight = track.offsetHeight;
    drawPath();
  }
  function queueMeasure() {
    if (!pendingMeasure) { pendingMeasure = true; requestAnimationFrame(measurePath); }
  }
  window.addEventListener('scroll', () => {
    if (!pendingScroll && !reduced.matches) { pendingScroll = true; requestAnimationFrame(drawPath); }
  }, { passive: true });
  window.addEventListener('resize', queueMeasure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(journey);
  if (document.fonts) document.fonts.ready.then(queueMeasure);
  reduced.addEventListener('change', drawPath);
  queueMeasure();

  /* Horaires Fresha : minutes depuis minuit, Europe/Paris.
     https://www.fresha.com/fr/a/loft-hair-reims-9-rue-ceres-apd5rk1o */
  const HOURS = { 0: null, 1: [540, 750], 2: [540, 1050], 3: null, 4: [540, 1050], 5: [540, 1050], 6: [540, 810] };
  const SERVICES = {
    femme: { name: 'Coupe femme et coiffage, sans soin', duration: 45, range: true },
    homme: { name: 'Coupe homme', duration: 30, range: false },
    brushing: { name: 'Brushing, sans soin', duration: 45, range: true }
  };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), minutes: +parts.hour * 60 + +parts.minute };
  }
  const isoDate = date => date.toISOString().slice(0, 10);
  const readDate = iso => new Date(`${iso}T12:00:00Z`);
  const frenchTime = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  const todayRow = $(`tr[data-day="${parisNow().date.getUTCDay()}"]`);
  if (todayRow) {
    todayRow.classList.add('is-today');
    const label = document.createElement('span');
    label.className = 'today-note'; label.textContent = 'Aujourd’hui';
    $('th', todayRow).append(label);
  }

  const state = { service: '', date: '', time: null, step: 0, reached: 0 };
  const form = $('#booking-form');
  const panels = $$('.booking-panel');
  const steps = $$('.steps button');
  const app = $('.booking-app');
  const success = $('#succes');
  app.hidden = false;
  const summary = $('.summary');
  const summaryHome = $('.booking-intro');
  const compact = matchMedia('(max-width: 760px)');
  summary.hidden = false;
  function placeSummary() {
    if (compact.matches) app.insertBefore(summary, $('.steps'));
    else summaryHome.append(summary);
    queueMeasure();
  }
  compact.addEventListener('change', placeSummary);
  placeSummary();
  let transitionFrame = 0;

  function slotsFor(date, service) {
    const day = readDate(date);
    const hours = HOURS[day.getUTCDay()];
    const now = parisNow();
    if (!hours || !SERVICES[service]) return [];
    const dateNumber = Math.floor(day.getTime() / 86400000);
    const sameDay = date === isoDate(now.date);
    const pastDay = date < isoDate(now.date);
    const slots = [];
    for (let minute = hours[0]; minute + SERVICES[service].duration <= hours[1]; minute += 30) {
      const past = pastDay || (sameDay && minute <= now.minutes);
      const unavailable = (dateNumber + Math.floor(minute / 30) * 3) % 7 === 2;
      slots.push({ minute, disabled: past || unavailable, reason: past ? 'Passé' : unavailable ? 'Pris · essai' : '' });
    }
    return slots;
  }
  const validSlot = () => state.date && slotsFor(state.date, state.service).some(slot => slot.minute === state.time && !slot.disabled);
  function syncSummary() {
    $('#resume-prestation').textContent = SERVICES[state.service]?.name || 'À choisir';
    $('#resume-jour').textContent = state.date ? longFormat.format(readDate(state.date)) : 'À choisir';
    $('#resume-heure').textContent = state.time === null ? 'À choisir' : frenchTime(state.time);
    $('#recap-final').textContent = selectionText();
  }
  function selectionText() {
    if (!state.service || !state.date || state.time === null) return '';
    return `${SERVICES[state.service].name} · ${longFormat.format(readDate(state.date))} à ${frenchTime(state.time)}. Créneau de simulation uniquement.`;
  }
  function syncSteps() {
    steps.forEach((button, index) => {
      button.disabled = index > state.reached;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function radioOption({ name, value, label, className, checked, disabled, description }) {
    const element = document.createElement('label'); element.className = className;
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = name; radio.value = String(value);
    radio.checked = checked; radio.disabled = disabled;
    radio.setAttribute('aria-label', label);
    radio.setAttribute('aria-describedby', description);
    element.append(radio);
    return element;
  }
  function renderDays() {
    const days = $('#jours');
    days.querySelectorAll('label').forEach(label => label.remove());
    const now = parisNow();
    const choices = [];
    for (let index = 0; index < 14; index++) {
      const date = new Date(now.date.getTime() + index * 86400000);
      const value = isoDate(date);
      const closed = !HOURS[date.getUTCDay()];
      const full = !closed && !slotsFor(value, state.service).some(slot => !slot.disabled);
      const reason = closed ? 'Fermé' : full ? 'Complet · essai' : monthFormat.format(date);
      choices.push(value);
      const option = radioOption({ name: 'jour', value, label: `${longFormat.format(date)}${closed ? ', fermé' : full ? ', complet dans l’essai' : ', simulation'}`, className: 'date-choice', checked: state.date === value && !closed && !full, disabled: closed || full, description: 'erreur-jour' });
      [['day-name', dayFormat.format(date)], ['day-number', String(date.getUTCDate())], ['day-state', reason]].forEach(([className, text]) => {
        const span = document.createElement('span'); span.className = className; span.textContent = text; option.append(span);
      });
      days.append(option);
    }
    if (state.date && (!choices.includes(state.date) || !$('input:checked', days))) {
      state.date = ''; state.time = null; state.reached = Math.min(state.reached, 1);
    }
    syncSummary();
  }
  function renderTimes() {
    const times = $('#heures');
    times.querySelectorAll('label, .empty-slots').forEach(item => item.remove());
    const slots = slotsFor(state.date, state.service);
    if (!validSlot()) state.time = null;
    slots.forEach(slot => {
      const option = radioOption({ name: 'heure', value: slot.minute, label: `${frenchTime(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', créneau simulé'}`, className: 'time-choice', checked: state.time === slot.minute, disabled: slot.disabled, description: 'erreur-heure slot-note' });
      const text = document.createElement('span'); text.textContent = frenchTime(slot.minute); option.append(text);
      if (slot.reason) { const reason = document.createElement('small'); reason.textContent = slot.reason; option.append(reason); }
      times.append(option);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const empty = document.createElement('p'); empty.className = 'empty-slots small-note'; empty.textContent = 'Aucun créneau d’essai restant pour ce jour. Revenez au choix du jour.'; times.append(empty);
    }
    $('#slot-note').textContent = `Créneaux d’essai, sans lien avec les disponibilités réelles.${SERVICES[state.service]?.range ? ' Pour le calcul, la durée haute publiée est retenue : 45\u00a0min.' : ''}`;
    syncSummary();
  }
  function showStep(index, { focus = true } = {}) {
    const previous = state.step;
    state.step = index; state.reached = Math.max(state.reached, index);
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    syncSummary(); syncSteps();
    success.hidden = true; form.hidden = false; $('.steps').hidden = false;
    cancelAnimationFrame(transitionFrame);
    panels.forEach((panel, number) => {
      panel.hidden = number !== index;
      panel.classList.remove('panel-entering', 'backwards');
    });
    const panel = panels[index];
    const animate = !reduced.matches && !document.body.classList.contains('keyboard-action');
    if (animate) {
      panel.classList.add('panel-entering');
      if (index < previous) panel.classList.add('backwards');
      transitionFrame = requestAnimationFrame(() => { transitionFrame = requestAnimationFrame(() => panel.classList.remove('panel-entering', 'backwards')); });
    }
    const title = $('h3', panel);
    if (focus) {
      title.focus({ preventScroll: true });
      const rect = title.getBoundingClientRect();
      const focusTop = compact.matches ? Math.max(24, summary.getBoundingClientRect().height + 16) : 24;
      if (rect.top < focusTop || rect.bottom > innerHeight - 100) title.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    $('#annonce').textContent = `Étape ${index + 1} sur 4 : ${title.textContent}`;
    queueMeasure();
  }
  function error(id, text, control) {
    $(`#${id}`).textContent = text;
    if (control) control.setAttribute('aria-invalid', 'true');
    $('#annonce').textContent = text;
  }
  function clearError(id, control) {
    $(`#${id}`).textContent = '';
    if (control) control.removeAttribute('aria-invalid');
  }
  function resetDependents(level) {
    if (level === 0) state.date = '';
    state.time = null;
    state.reached = Math.min(state.reached, level + 1);
    syncSummary(); syncSteps();
  }
  function selectService(value) {
    if (!SERVICES[value]) return;
    state.service = value;
    $(`input[name="prestation"][value="${value}"]`).checked = true;
    resetDependents(0);
    clearError('erreur-prestation');
    $$('input[name="prestation"]').forEach(input => input.removeAttribute('aria-invalid'));
  }
  $$('input[name="prestation"]').forEach(input => {
    input.setAttribute('aria-describedby', 'erreur-prestation');
    input.addEventListener('change', () => selectService(input.value));
  });
  $('#jours').addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    state.date = event.target.value; resetDependents(1); clearError('erreur-jour');
  });
  $('#heures').addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.time = +event.target.value; state.reached = Math.max(state.reached, 3);
    syncSummary(); syncSteps(); clearError('erreur-heure');
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (state.step === 0 && !state.service) { error('erreur-prestation', 'Choisissez une prestation pour continuer.', $('input[name="prestation"]')); $('input[name="prestation"]').focus(); return; }
    if (state.step === 1 && !state.date) { error('erreur-jour', 'Choisissez un jour pour continuer.'); $('#jours input:not(:disabled)')?.focus(); return; }
    if (state.step === 2 && !validSlot()) { renderTimes(); error('erreur-heure', 'Choisissez un créneau d’essai encore disponible.'); $('#heures input:not(:disabled)')?.focus(); return; }
    showStep(Math.min(state.step + 1, 3));
  }));
  $$('[data-prev]').forEach(button => button.addEventListener('click', () => showStep(Math.max(state.step - 1, 0))));
  steps.forEach((button, index) => button.addEventListener('click', () => { if (index <= state.reached) showStep(index); }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.service); showStep(0, { focus: false });
    requestAnimationFrame(() => $('#etape-prestation').focus({ preventScroll: true }));
  }));
  const firstName = $('#prenom');
  const phone = $('#telephone');
  firstName.addEventListener('input', () => clearError('erreur-prenom', firstName));
  phone.addEventListener('input', () => clearError('erreur-telephone', phone));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    clearError('erreur-prenom', firstName); clearError('erreur-telephone', phone);
    let invalid = null;
    if (!firstName.value.trim()) { error('erreur-prenom', 'Indiquez un prénom pour cet essai.', firstName); invalid = firstName; }
    const phoneText = phone.value.replace(/[\s().-]/g, '');
    if (!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(phoneText)) {
      error('erreur-telephone', 'Saisissez dix chiffres ou un numéro commençant par +33.', phone);
      if (!invalid) invalid = phone;
    }
    if (invalid) { invalid.focus(); return; }
    if (!validSlot()) { state.time = null; state.reached = 2; showStep(2); error('erreur-heure', 'Ce créneau d’essai est passé. Choisissez une autre heure.'); return; }
    $('#recap-succes').textContent = selectionText();
    form.hidden = true; $('.steps').hidden = true; success.hidden = false;
    $('h3', success).focus({ preventScroll: true });
    $('#annonce').textContent = 'Essai terminé. Aucun rendez-vous n’a été pris et rien n’a été envoyé au salon.';
    form.reset();
    queueMeasure();
  });
  $('#recommencer').addEventListener('click', () => {
    form.reset(); Object.assign(state, { service: '', date: '', time: null, step: 0, reached: 0 });
    $$('.field-error').forEach(item => item.textContent = '');
    $$('[aria-invalid]').forEach(item => item.removeAttribute('aria-invalid'));
    showStep(0);
  });
  syncSummary(); syncSteps();

  /* La barre mobile cesse de couvrir le formulaire et le pied de page. */
  if ('IntersectionObserver' in window) {
    const bar = $('.mobile-bar');
    const seen = new Set();
    new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target));
      bar.hidden = seen.size > 0;
    }, { threshold: 0 }).observe($('#rendez-vous'));
    const footerObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? seen.add(entry.target) : seen.delete(entry.target));
      bar.hidden = seen.size > 0;
    }, { threshold: 0 });
    footerObserver.observe($('.footer'));
  }
})();
