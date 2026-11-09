(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const easing = 'cubic-bezier(.23,1,.32,1)';
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-input'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-input'); }, { passive: true });

  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const revealItems = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        const pills = entry.target.querySelector('.service-pills');
        if (pills) setTimeout(() => entry.target.classList.add('entrance-done'), 700);
        reveal.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealItems.forEach(item => reveal.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // La forme seule bouge : les mots ne sont jamais déformés au défilement.
  const blob = $('[data-blob]');
  const signature = $('.hero-signature');
  let signatureVisible = true;
  let scheduled = false;
  function updateShape() {
    scheduled = false;
    if (reduced.matches || !signatureVisible) return;
    const rect = signature.getBoundingClientRect();
    const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - rect.top - rect.height / 2) / window.innerHeight));
    blob.style.transform = `rotate(${progress * 5}deg) scale(${1 + Math.abs(progress) * .025},${1 - Math.abs(progress) * .018})`;
  }
  function scheduleShape() {
    if (scheduled || reduced.matches || !signatureVisible) return;
    scheduled = true;
    requestAnimationFrame(updateShape);
  }
  window.addEventListener('scroll', scheduleShape, { passive: true });
  window.addEventListener('resize', scheduleShape, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      signatureVisible = entries[0].isIntersecting;
      if (signatureVisible) scheduleShape();
    }).observe(signature);
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) blob.style.transform = '';
    else scheduleShape();
  });
  scheduleShape();

  // Les trois durées utilisées ci-dessous viennent du dossier Planity fourni.
  const services = {
    diagnostic: { name: 'Diagnostic et conseil', minutes: 15, text: 'Une prestation de diagnostic et de conseil figure à la carte publiée sur Planity.' },
    homme: { name: 'Coupe homme + shampoing + coiffage', minutes: 30, text: 'La carte associe la coupe homme au shampoing et au coiffage. Une prestation distincte existe pour les cheveux longs.' },
    femme: { name: 'Coupe femme + shampoing + coiffage', text: 'La carte distingue les cheveux au-dessus de la clavicule, les cheveux longs et les cheveux XXL ou très épais. Consultez Planity pour les modalités.' },
    frange: { name: 'Frange', minutes: 10, text: 'La frange apparaît comme une prestation à part entière sur la carte du salon.' },
    balayage: { name: 'Balayage', text: 'Plusieurs prestations de balayage figurent à la carte, selon la longueur. Le balayage transformation demande un diagnostic au salon.' }
  };
  const detail = $('#service-detail');
  let detailAnimation;
  $$('[data-service-detail]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.serviceDetail;
    const service = services[id];
    $$('[data-service-detail]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#detail-name').textContent = service.name;
    $('#detail-copy').textContent = service.text;
    $('#detail-duration').textContent = service.minutes ? `${service.minutes}\u00a0min` : 'Modalités sur Planity';
    const action = $('#detail-action');
    if (service.minutes) {
      action.href = '#rendez-vous';
      action.dataset.preselect = id;
      action.removeAttribute('target');
      action.removeAttribute('rel');
      action.innerHTML = 'Essayer avec cette prestation <span aria-hidden="true">→</span>';
    } else {
      action.href = 'https://www.planity.com/salon-lea-andouche-59000-lille';
      action.removeAttribute('data-preselect');
      action.target = '_blank';
      action.rel = 'noopener';
      action.innerHTML = 'Voir cette prestation sur Planity <span aria-hidden="true">↗</span>';
    }
    detailAnimation?.cancel();
    if (!reduced.matches && !keyboard && detail.animate) {
      detailAnimation = detail.animate([{ opacity: .55, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing });
    }
  }));

  // Calendrier civil de Paris : aucune dépendance au fuseau du navigateur.
  const calendarFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekdayDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  // Planity : dimanche/lundi fermés ; mar–ven 9–19 ; samedi 9–16.
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 960] };
  function parisNow() {
    const parts = Object.fromEntries(calendarFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day)), minute: +parts.hour * 60 + +parts.minute };
  }
  const dateKey = date => date.toISOString().slice(0, 10);
  const parseDay = key => new Date(`${key}T12:00:00Z`);
  const formatTime = minutes => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  function slotsFor(key, duration) {
    const day = parseDay(key);
    const range = hours[day.getUTCDay()];
    if (!range) return [];
    const now = parisNow();
    const todayKey = dateKey(now.date);
    const seed = +key.replaceAll('-', '');
    const slots = [];
    // Un pas de 30 minutes est un choix d’interface pour la démonstration.
    for (let minute = range[0], index = 0; minute + duration <= range[1]; minute += 30, index++) {
      const passed = key < todayKey || (key === todayKey && minute <= now.minute);
      const fictiveTaken = (seed + index * 7) % 6 === 0;
      slots.push({ minute, disabled: passed || fictiveTaken, passed });
    }
    return slots;
  }

  const state = { step: 0, service: null, day: null, time: null, success: false };
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const next = $('#next');
  const previous = $('#previous');
  const error = $('#booking-error');
  const status = $('#booking-status');
  let panelFrame;
  let summaryAnimation;
  const labels = ['Choisir le jour', 'Choisir l’heure', 'Poursuivre', 'Terminer la démonstration'];
  $('#booking-layout').hidden = false;

  function summary() {
    $('#summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(parseDay(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    const summaryElement = $('.booking-summary dl');
    summaryAnimation?.cancel();
    if (!reduced.matches && !keyboard && summaryElement.animate) summaryAnimation = summaryElement.animate([{ opacity: .6 }, { opacity: 1 }], { duration: 180, easing });
    steps.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.day) || (index > 2 && state.time === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showError(message) {
    error.textContent = message;
    error.hidden = false;
  }
  function clearError() { error.hidden = true; error.textContent = ''; }
  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 20 || rect.bottom > window.innerHeight - 90) heading.scrollIntoView({ block: 'start', behavior: keyboard || reduced.matches ? 'instant' : 'smooth' });
  }
  function showStep(index, moveFocus = true) {
    if (state.success) return;
    cancelAnimationFrame(panelFrame);
    panels.forEach(panel => { panel.hidden = true; panel.classList.remove('is-entering'); });
    state.step = index;
    const panel = panels[index];
    panel.hidden = false;
    if (!reduced.matches && !keyboard) {
      panel.classList.add('is-entering');
      panelFrame = requestAnimationFrame(() => {
        panelFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    previous.hidden = index === 0;
    next.innerHTML = `${labels[index]} <span aria-hidden="true">→</span>`;
    clearError();
    summary();
    status.textContent = `Étape ${index + 1} sur 4 : ${$('.step-panel:not([hidden]) h3').textContent}`;
    if (moveFocus) focusHeading($('h3', panel));
  }
  function renderDays() {
    const grid = $('#day-grid');
    grid.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Votre jour'; grid.append(legend);
    const now = parisNow();
    for (let index = 0; index < 14; index++) {
      const day = new Date(now.date.getTime() + index * 86400000);
      const key = dateKey(day);
      const closed = !hours[day.getUTCDay()];
      const full = !closed && !slotsFor(key, services[state.service].minutes).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'day-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'jour'; input.value = key; input.disabled = closed || full; input.checked = key === state.day;
      input.setAttribute('aria-label', `${longDate.format(day)}${closed ? ', fermé' : full ? ', aucun créneau fictif disponible' : ''}`);
      const content = document.createElement('span');
      const weekday = document.createElement('small'); weekday.textContent = weekdayDate.format(day);
      const number = document.createElement('strong'); number.textContent = day.getUTCDate();
      const month = document.createElement('small'); month.textContent = closed ? 'Fermé' : full ? 'Indisponible' : monthDate.format(day);
      content.append(weekday, number, month); label.append(input, content); grid.append(label);
    }
  }
  function renderSlots() {
    const grid = $('#slot-grid'); grid.replaceChildren();
    const legend = document.createElement('legend'); legend.className = 'sr-only'; legend.textContent = 'Votre heure'; grid.append(legend);
    $('#slot-description').textContent = `${services[state.service].name} · ${longDate.format(parseDay(state.day))}. Créneaux fictifs, sans lien avec les disponibilités du salon.`;
    const slots = slotsFor(state.day, services[state.service].minutes);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = slot.minute; input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${formatTime(slot.minute)}${slot.disabled ? slot.passed ? ', heure passée' : ', indisponibilité fictive' : ', créneau fictif'}`);
      const content = document.createElement('span');
      const time = document.createElement('b'); time.textContent = formatTime(slot.minute); content.append(time);
      if (slot.disabled) { const note = document.createElement('small'); note.textContent = slot.passed ? 'Passé' : 'Déjà pris · fictif'; content.append(note); }
      label.append(input, content); grid.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const note = document.createElement('p'); note.className = 'step-help'; note.textContent = 'Aucun créneau fictif disponible ce jour. Revenez au choix du jour.'; grid.append(note);
    }
  }
  form.addEventListener('change', event => {
    const input = event.target;
    clearError();
    if (input.name === 'prestation') {
      state.service = input.value; state.day = null; state.time = null;
    } else if (input.name === 'jour') {
      state.day = input.value; state.time = null;
    } else if (input.name === 'heure') state.time = +input.value;
    summary();
  });
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-preselect]');
    if (!action) return;
    event.preventDefault();
    if (state.success) reset();
    const input = $(`input[name="prestation"][value="${action.dataset.preselect}"]`);
    input.checked = true;
    state.service = input.value; state.day = null; state.time = null;
    renderDays();
    showStep(0, false);
    $('h3', panels[0]).focus({ preventScroll: true });
    $('#booking-layout').scrollIntoView({ behavior: keyboard || reduced.matches ? 'instant' : 'smooth', block: 'start' });
  });
  steps.forEach(button => button.addEventListener('click', () => {
    const index = +button.dataset.step;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    showStep(index);
  }));
  previous.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));

  const firstName = $('#prenom');
  const phone = $('#telephone');
  function validMobile(value) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s().-]/g, '')); }
  function fieldValidity(input, valid, id) {
    input.setAttribute('aria-invalid', String(!valid));
    $(id).hidden = valid;
  }
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    if (!input.hasAttribute('aria-invalid')) return;
    fieldValidity(input, input === firstName ? !!input.value.trim() : validMobile(input.value), input === firstName ? '#error-prenom' : '#error-telephone');
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError();
    if (!state.service) { showError('Choisissez une prestation pour poursuivre.'); $('input[name="prestation"]').focus(); return; }
    if (state.step === 0) { renderDays(); showStep(1); return; }
    if (!state.day) { showError('Choisissez un jour ouvert pour poursuivre.'); $('input[name="jour"]:not(:disabled)')?.focus(); return; }
    if (state.step === 1) { renderSlots(); showStep(2); return; }
    if (state.time === null) { showError('Choisissez un créneau fictif pour poursuivre.'); $('input[name="heure"]:not(:disabled)')?.focus(); return; }
    if (!slotsFor(state.day, services[state.service].minutes).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; renderSlots(); showStep(2); showError('Cette heure est passée. Choisissez un autre créneau fictif.'); return;
    }
    if (state.step === 2) { showStep(3); return; }
    const nameValid = !!firstName.value.trim();
    const phoneValid = validMobile(phone.value);
    fieldValidity(firstName, nameValid, '#error-prenom');
    fieldValidity(phone, phoneValid, '#error-telephone');
    if (!nameValid || !phoneValid) { (!nameValid ? firstName : phone).focus(); return; }
    state.success = true;
    $('#success-recap').textContent = `${services[state.service].name} · ${longDate.format(parseDay(state.day))}, à ${formatTime(state.time)}. Sélection fictive.`;
    firstName.value = ''; phone.value = '';
    form.hidden = true; $('.step-nav').hidden = true;
    const success = $('#booking-success'); success.hidden = false;
    status.textContent = 'Démonstration terminée. Aucun rendez-vous pris et aucune donnée envoyée. Les coordonnées ont été effacées.';
    if (!reduced.matches && !keyboard && success.animate) success.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing });
    focusHeading($('h3', success));
  });
  function reset() {
    Object.assign(state, { step: 0, service: null, day: null, time: null, success: false });
    form.reset();
    [firstName, phone].forEach(input => input.removeAttribute('aria-invalid'));
    $('#error-prenom').hidden = true; $('#error-telephone').hidden = true;
    $('#success-recap').textContent = '';
    $('#booking-success').hidden = true;
    form.hidden = false; $('.step-nav').hidden = false;
    showStep(0);
  }
  $('#restart').addEventListener('click', reset);
  showStep(0, false);

  // Barre mobile : utile après le héros, retirée sur le parcours et le pied.
  const bar = $('.mobile-bar');
  const mobile = window.matchMedia('(max-width: 760px)');
  const inView = { hero: true, booking: false, footer: false };
  function updateBar() { bar.hidden = !mobile.matches || inView.hero || inView.booking || inView.footer; }
  if ('IntersectionObserver' in window) {
    const sections = new Map([[$('.hero'), 'hero'], [$('#rendez-vous'), 'booking'], [$('.footer'), 'footer']]);
    new IntersectionObserver(entries => {
      entries.forEach(entry => { inView[sections.get(entry.target)] = entry.isIntersecting; });
      updateBar();
    }).observe($('.hero'));
    const otherObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { inView[sections.get(entry.target)] = entry.isIntersecting; });
      updateBar();
    });
    otherObserver.observe($('#rendez-vous')); otherObserver.observe($('.footer'));
  }
  mobile.addEventListener('change', updateBar);
  updateBar();
  // Le volet d’offre garde son comportement natif, avec une sortie clavier simple.
  document.addEventListener('keydown', event => {
    const offer = $('.offer-top');
    if (event.key === 'Escape' && offer.open) { offer.open = false; $('summary', offer).focus(); }
  });
  document.addEventListener('click', event => {
    const offer = $('.offer-top');
    if (offer.open && !offer.contains(event.target)) offer.open = false;
  });
})();
