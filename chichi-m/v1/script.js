(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 700px)');
  const services = {
    'resine-classique': { label: 'Résine · finition vernis normal', minutes: 45 },
    'resine-semi': { label: 'Résine · semi-permanente', minutes: 50 },
    'gel-classique': { label: 'Gel · finition vernis normal', minutes: 50 },
    'gel-semi': { label: 'Gel · semi-permanente', minutes: 60 }
  };
  // Horaires Planity transcrits dans SOURCES.md. Les autres fiches divergent.
  const hours = { 0: [600, 1080], 1: [600, 1200], 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };
  const nbsp = '\u00a0';
  const timeText = minutes => `${Math.floor(minutes / 60)}${nbsp}h${minutes % 60 ? `${nbsp}${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const state = { service: '', date: '', slot: null, step: 0, done: false };
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard'); }, { capture: true });
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard'); }, { capture: true, passive: true });

  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function slotsFor(key, serviceId) {
    if (!services[serviceId]) return [];
    const day = dateFromKey(key);
    const range = hours[day.getUTCDay()];
    if (!range) return [];
    const now = parisNow();
    const seed = Math.floor(day.getTime() / 86400000);
    const slots = [];
    for (let minute = range[0], index = 0; minute + services[serviceId].minutes <= range[1]; minute += 60, index++) {
      const passed = key < now.key || (key === now.key && minute <= now.minutes);
      const occupied = (seed + index * 3) % 7 === 0;
      slots.push({ minute, disabled: passed || occupied });
    }
    return slots;
  }
  function buildRadio(name, value, disabled, checked, content, accessibleLabel) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', accessibleLabel);
    label.append(input, content);
    return label;
  }
  function renderDays() {
    const now = parisNow();
    const start = dateFromKey(now.key);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const date = new Date(start.getTime() + index * 86400000);
      const key = date.toISOString().slice(0, 10);
      const closed = !hours[date.getUTCDay()];
      const available = slotsFor(key, state.service).some(slot => !slot.disabled);
      const content = document.createElement('span');
      const week = document.createElement('span'); week.textContent = dayFormat.format(date);
      const day = document.createElement('strong'); day.textContent = date.getUTCDate();
      const month = document.createElement('small'); month.textContent = monthFormat.format(date);
      content.append(week, day, month);
      if (!available) { const note = document.createElement('small'); note.textContent = closed ? 'Fermé' : 'Complet'; content.append(note); }
      fragment.append(buildRadio('jour', key, !available, state.date === key, content, `${longFormat.format(date)}${!available ? (closed ? ', fermé' : ', complet dans la simulation') : ', simulation'}`));
    }
    $('#days').replaceChildren(fragment);
  }
  function renderSlots() {
    const fragment = document.createDocumentFragment();
    $('#slot-day').textContent = longFormat.format(dateFromKey(state.date));
    slotsFor(state.date, state.service).forEach(slot => {
      const content = document.createElement('span'); content.textContent = timeText(slot.minute);
      fragment.append(buildRadio('heure', String(slot.minute), slot.disabled, state.slot === slot.minute, content, `${timeText(slot.minute)}, ${slot.disabled ? 'indisponible' : 'créneau fictif'}`));
    });
    $('#slots').replaceChildren(fragment);
  }
  const panelHeadings = ['Quelle pose ?', 'Quel jour ?', 'À quelle heure ?', 'Pour qui ?'];
  function syncSummary() {
    $('#summary-service').textContent = state.service ? services[state.service].label : 'À choisir';
    $('#summary-day').textContent = state.date ? longFormat.format(dateFromKey(state.date)) : 'À choisir';
    $('#summary-time').textContent = state.slot !== null ? timeText(state.slot) : 'À choisir';
    $$('.steps button').forEach((button, index) => {
      button.disabled = state.done || (index > 0 && !state.service) || (index > 1 && !state.date) || (index > 2 && state.slot === null);
      if (index === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function announce(text) { $('#announcement').textContent = text; }
  function entrance(panel, backwards = false) {
    panel.getAnimations().forEach(animation => animation.cancel());
    if (!reduced.matches && !keyboard && panel.animate) {
      panel.animate([{ opacity: 0, transform: `translateX(${backwards ? '-10px' : '10px'})` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function go(step, focus = true) {
    const backwards = step < state.step;
    state.step = step;
    $('#flow-message').textContent = '';
    $$('.booking-panel').forEach((panel, index) => { panel.hidden = index !== step; });
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    $('#back').hidden = step === 0;
    $('#next').textContent = step === 3 ? 'Terminer la simulation' : 'Continuer →';
    syncSummary();
    const panel = $(`[data-panel="${step}"]`);
    entrance(panel, backwards);
    if (focus) $('h3', panel).focus();
    announce(`Simulation, étape ${step + 1} sur 4. ${panelHeadings[step]}`);
  }
  function setService(id) {
    if (!services[id]) return;
    if (state.service !== id) { state.service = id; state.date = ''; state.slot = null; }
    $(`input[name="prestation"][value="${id}"]`).checked = true;
    syncSummary();
  }
  function reset() {
    Object.assign(state, { service: '', date: '', slot: null, step: 0, done: false });
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('#success').hidden = true;
    $('#prenom-error').textContent = ''; $('#telephone-error').textContent = '';
    $('#prenom').removeAttribute('aria-invalid'); $('#telephone').removeAttribute('aria-invalid');
    go(0);
  }
  function validateField(input) {
    const name = input.id;
    let message = '';
    if (name === 'prenom' && !input.value.trim()) message = 'Indiquez un prénom pour essayer la simulation.';
    if (name === 'telephone') {
      const phone = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0|\+33|0033)[67]\d{8}$/.test(phone)) message = 'Indiquez un mobile français commençant par 06 ou 07, ou par +33.';
    }
    $(`#${name}-error`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !message;
  }

  $('#simulation').hidden = false;
  $('#booking-form').addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') setService(input.value);
    if (input.name === 'jour') { state.date = input.value; state.slot = null; syncSummary(); }
    if (input.name === 'heure') { state.slot = Number(input.value); syncSummary(); }
    $('#flow-message').textContent = '';
  });
  $$('.steps button').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));
  $('#back').addEventListener('click', () => go(Math.max(0, state.step - 1)));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.done) reset();
    setService(link.dataset.service);
    go(1, false);
    // Le lien garde son ancre native ; la mise au point suit son défilement.
    setTimeout(() => $('[data-panel="1"] h3').focus({ preventScroll: true }), 0);
  }));
  ['prenom', 'telephone'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) { input.removeAttribute('aria-invalid'); $(`#${id}-error`).textContent = ''; } });
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    let error = '';
    if (state.step === 0 && !state.service) error = 'Choisissez une pose pour continuer.';
    if (state.step === 1 && !state.date) error = 'Choisissez un jour dans la simulation.';
    if (state.step === 2 && state.slot === null) error = 'Choisissez une heure fictive pour continuer.';
    if (error) {
      $('#flow-message').textContent = error;
      $(`.booking-panel[data-panel="${state.step}"] input:not(:disabled)`)?.focus();
      return;
    }
    if (state.step < 3) { go(state.step + 1); return; }
    const nameValid = validateField($('#prenom'));
    const phoneValid = validateField($('#telephone'));
    if (!nameValid || !phoneValid) { (nameValid ? $('#telephone') : $('#prenom')).focus(); announce('Vérifiez les champs indiqués.'); return; }
    // Un créneau peut être devenu passé pendant que le formulaire était ouvert.
    if (!slotsFor(state.date, state.service).some(slot => slot.minute === state.slot && !slot.disabled)) {
      state.slot = null; go(2); $('#flow-message').textContent = 'Cette heure est passée. Choisissez un autre créneau fictif.'; return;
    }
    state.done = true;
    $('#booking-form').hidden = true; $('#success').hidden = false;
    $('#success-recap').textContent = `${$('#prenom').value.trim()} · ${services[state.service].label} · ${longFormat.format(dateFromKey(state.date))} à ${timeText(state.slot)}.`;
    syncSummary(); entrance($('#success')); $('#success h3').focus();
    announce('Simulation terminée. Aucun rendez-vous réservé. Aucune donnée envoyée.');
  });
  $('#restart').addEventListener('click', reset);
  syncSummary();

  // Affiches en maçonnerie : hauteurs naturelles, ordre du document conservé.
  const wall = $('.poster-wall');
  const posters = $$('.poster', wall);
  let layoutFrame = 0;
  function layout() {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      wall.classList.toggle('masonry', !narrow.matches);
      if (narrow.matches) { posters.forEach(poster => { poster.style.gridRowEnd = ''; }); return; }
      const heights = posters.map(poster => $('.poster-inner', poster).offsetHeight + parseFloat(getComputedStyle(poster).paddingTop) + 28);
      posters.forEach((poster, index) => { poster.style.gridRowEnd = `span ${Math.ceil(heights[index] / 8)}`; });
    });
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(layout);
    posters.forEach(poster => observer.observe($('.poster-inner', poster)));
  }
  narrow.addEventListener('change', layout);
  window.addEventListener('resize', layout, { passive: true });
  layout();

  function countOnce(element) {
    if (!element || reduced.matches) return;
    const target = Number(element.dataset.count);
    let value = 0;
    const tick = () => {
      value += 1;
      element.textContent = String(value).padStart(2, '0');
      if (value < target && !reduced.matches) setTimeout(tick, 42);
      else element.textContent = String(target).padStart(2, '0');
    };
    tick();
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      document.getAnimations().forEach(animation => animation.cancel());
      posters.forEach(poster => { poster.classList.add('in-view'); const number = $('.folio', poster); number.textContent = number.dataset.count.padStart(2, '0'); });
    }
  });
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view'); countOnce($('.folio', entry.target)); reveal.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    posters.forEach(poster => reveal.observe(poster));
  } else { posters.forEach(poster => poster.classList.add('in-view')); }
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  if (document.fonts) document.fonts.ready.then(layout);
})();
