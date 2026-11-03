/* Simulation locale : aucune requête, aucun stockage des coordonnées. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  const immediate = () => reduce.matches || keyboard;
  document.addEventListener('keydown', () => { keyboard = true; root.dataset.input = 'clavier'; }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.dataset.input = 'pointeur'; }, true);
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const revealNodes = [...document.querySelectorAll('.reveal-tile, .reveal-art')];
  if ('IntersectionObserver' in window && !reduce.matches) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        reveal.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px 24px 0px' });
    revealNodes.forEach(node => {
      node.classList.add('reveal-pending');
      reveal.observe(node);
      node.addEventListener('focusin', () => { node.classList.remove('reveal-pending'); reveal.unobserve(node); });
    });
    reduce.addEventListener('change', () => {
      if (reduce.matches) { reveal.disconnect(); revealNodes.forEach(node => node.classList.remove('reveal-pending')); }
    });
  }

  const form = document.querySelector('#booking-form');
  const panels = [...form.querySelectorAll('.booking-panel')];
  const steps = [...form.querySelectorAll('[data-step-target]')];
  const announce = document.querySelector('#annonce');
  const summary = key => document.querySelector(`[data-summary="${key}"]`);
  const summaryTiles = [...document.querySelectorAll('.summary-mosaic span')];
  const success = document.querySelector('#resultat');
  const nameInput = form.elements.prenom;
  const phoneInput = form.elements.telephone;
  const services = {
    signature: { name: 'BayaArtist Signature', minutes: 75 },
    regard: { name: 'Rehaussement des sourcils', minutes: 45 }
  };
  const state = { service: '', day: '', time: null, step: 0, finished: false };
  let panelFrame = 0;

  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function nowInParis() {
    const p = Object.fromEntries(parisClock.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
  }
  const asDate = day => new Date(`${day}T12:00:00Z`);
  const dayKey = date => date.toISOString().slice(0, 10);
  const longDay = day => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(asDate(day));
  const shortDay = day => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).format(asDate(day));
  const timeLabel = min => `${Math.floor(min / 60)}\u00a0h${min % 60 ? `\u00a0${String(min % 60).padStart(2, '0')}` : ''}`;
  function hours(day) {
    const weekday = asDate(day).getUTCDay();
    return weekday === 0 ? null : { start: 600, end: weekday === 6 ? 1200 : 1140 };
  }
  // Les indisponibilités sont des exemples déterministes, jamais un agenda réel.
  function slotStatus(day, minute, serviceId) {
    const current = nowInParis();
    if (day < current.day || (day === current.day && minute <= current.minute)) return 'Heure passée';
    const seed = Number(day.replaceAll('-', '')) + minute / 15 + services[serviceId].minutes;
    return seed % 7 === 0 ? 'Exemple indisponible' : '';
  }
  function validTime() {
    const opening = state.day && hours(state.day);
    return Boolean(opening && state.service && state.time !== null && state.time >= opening.start &&
      state.time + services[state.service].minutes <= opening.end && !slotStatus(state.day, state.time, state.service));
  }

  function option(name, value, descriptionId, disabled = false) {
    const label = document.createElement('label');
    label.className = `choice ${name === 'jour' ? 'day-choice' : 'slot-choice'}`;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-describedby', descriptionId);
    label.append(input);
    return { label, input };
  }
  function appendText(node, tag, text, className) {
    const child = document.createElement(tag);
    child.textContent = text;
    if (className) child.className = className;
    node.append(child);
    return child;
  }
  function renderDays() {
    const container = document.querySelector('#jours');
    container.replaceChildren();
    const first = asDate(nowInParis().day);
    for (let i = 0; i < 14; i++) {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + i);
      const key = dayKey(date);
      const closed = !hours(key);
      const { label, input } = option('jour', key, 'erreur-jour', closed);
      input.checked = key === state.day;
      input.setAttribute('aria-label', `${longDay(key)}${closed ? ', fermé' : ', exemple de jour'}`);
      appendText(label, 'span', new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date));
      appendText(label, 'span', String(date.getUTCDate()), 'day-number');
      appendText(label, 'small', new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date));
      appendText(label, 'small', closed ? 'Fermé' : i === 0 ? 'Aujourd’hui' : 'Exemple');
      container.append(label);
    }
  }
  function renderSlots() {
    const container = document.querySelector('#heures');
    container.replaceChildren();
    const opening = hours(state.day);
    if (!opening || !state.service) return;
    let available = 0;
    for (let minute = opening.start; minute + services[state.service].minutes <= opening.end; minute += 15) {
      const reason = slotStatus(state.day, minute, state.service);
      const { label, input } = option('heure', String(minute), 'erreur-heure', Boolean(reason));
      input.checked = minute === state.time && !reason;
      input.setAttribute('aria-label', `${timeLabel(minute)}, ${reason || 'exemple disponible'}`);
      appendText(label, 'span', timeLabel(minute));
      appendText(label, 'small', reason || 'Exemple');
      if (!reason) available++;
      container.append(label);
    }
    if (!available) {
      const message = document.createElement('p');
      message.className = 'empty-slots';
      message.textContent = 'Il ne reste aucun exemple de créneau ce jour-là. Revenez au choix du jour.';
      container.prepend(message);
    }
  }
  function updateSummary() {
    summary('service').textContent = state.service ? services[state.service].name : 'À choisir';
    summary('jour').textContent = state.day ? shortDay(state.day) : 'À choisir';
    summary('heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    [Boolean(state.service), Boolean(state.day), state.time !== null, state.finished].forEach((filled, index) => summaryTiles[index].classList.toggle('is-filled', filled));
    const allowed = [true, Boolean(state.service), Boolean(state.service && state.day), validTime()];
    steps.forEach((button, index) => {
      button.disabled = !allowed[index];
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (state.service && state.day && state.time !== null) {
      document.querySelector('#recapitulatif').textContent = `Votre simulation\u00a0: ${services[state.service].name}, le ${longDay(state.day)} à ${timeLabel(state.time)}. Aucun rendez-vous réel.`;
    }
  }
  function showStep(index, moveFocus = true) {
    cancelAnimationFrame(panelFrame);
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, i) => { panel.hidden = i !== index; panel.classList.remove('is-entering'); });
    const panel = panels[index];
    if (!immediate()) {
      panel.classList.add('is-entering');
      panel.getBoundingClientRect();
      panelFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
    }
    updateSummary();
    if (moveFocus) {
      panel.querySelector('h3').focus({ preventScroll: true });
      const rect = panel.getBoundingClientRect();
      if (rect.top < 12 || rect.top > window.innerHeight - 140) panel.scrollIntoView({ block: 'start', behavior: immediate() ? 'instant' : 'smooth' });
    }
    announce.textContent = `Étape ${index + 1} sur 4\u00a0: ${['le soin', 'le jour', 'l’heure', 'vos coordonnées'][index]}. Simulation sans envoi.`;
  }
  function error(id, show) { document.getElementById(id).hidden = !show; }
  function validateStep() {
    const keys = ['soin', 'jour', 'heure'];
    const valid = state.step === 0 ? Boolean(state.service) : state.step === 1 ? Boolean(state.day && hours(state.day) && state.day >= nowInParis().day) : validTime();
    if (state.step < 3) error(`erreur-${keys[state.step]}`, !valid);
    if (!valid) {
      const input = panels[state.step].querySelector('input:not(:disabled)');
      if (input) input.focus();
      announce.textContent = document.querySelector(`#erreur-${keys[state.step]}`).textContent;
    }
    return valid;
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'soin') { state.service = input.value; state.time = null; error('erreur-soin', false); }
    if (input.name === 'jour') { state.day = input.value; state.time = null; error('erreur-jour', false); }
    if (input.name === 'heure') { state.time = Number(input.value); error('erreur-heure', false); }
    updateSummary();
  });
  form.addEventListener('click', event => {
    if (event.target.closest('[data-next]') && validateStep()) showStep(state.step + 1);
    if (event.target.closest('[data-back]')) showStep(state.step - 1);
    const stepButton = event.target.closest('[data-step-target]');
    if (stepButton && !stepButton.disabled) showStep(Number(stepButton.dataset.stepTarget));
  });
  function validateField(input) {
    const valid = input === nameInput ? input.value.trim().length > 0 : /^(?:0[67]|\+33[67]|0033[67])\d{8}$/.test(input.value.replace(/[\s().-]/g, ''));
    input.setAttribute('aria-invalid', String(!valid));
    error(`erreur-${input.name}`, !valid);
    return valid;
  }
  [nameInput, phoneInput].forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); error(`erreur-${input.name}`, false); }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { if (validateStep()) showStep(state.step + 1); return; }
    if (!validTime()) {
      state.time = null;
      showStep(2);
      error('erreur-heure', true);
      document.querySelector('#erreur-heure').textContent = 'Ce créneau est passé. Choisissez un autre exemple ou revenez au choix du jour.';
      return;
    }
    const validName = validateField(nameInput);
    const validPhone = validateField(phoneInput);
    if (!validName || !validPhone) {
      (!validName ? nameInput : phoneInput).focus();
      announce.textContent = 'Vérifiez les champs signalés avant de terminer la simulation.';
      return;
    }
    state.finished = true;
    document.querySelector('#resultat-detail').textContent = `Votre essai\u00a0: ${services[state.service].name}, le ${longDay(state.day)} à ${timeLabel(state.time)}. Durée publiée\u00a0: ${services[state.service].minutes === 75 ? '1\u00a0h\u00a015' : '45\u00a0min'}.`;
    nameInput.value = ''; phoneInput.value = '';
    form.hidden = true; success.hidden = false;
    updateSummary();
    success.querySelector('h3').focus({ preventScroll: true });
    success.scrollIntoView({ block: 'nearest', behavior: immediate() ? 'instant' : 'smooth' });
    announce.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris, aucune donnée n’a été envoyée.';
  });
  function reset(focus = true) {
    Object.assign(state, { service: '', day: '', time: null, step: 0, finished: false });
    form.reset();
    form.querySelectorAll('.error').forEach(node => { node.hidden = true; });
    [nameInput, phoneInput].forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelector('#erreur-heure').textContent = 'Choisissez une heure pour continuer.';
    success.hidden = true; form.hidden = false;
    showStep(0, focus);
  }
  document.querySelector('#recommencer').addEventListener('click', () => reset());
  document.querySelectorAll('[data-select-service]').forEach(link => link.addEventListener('click', () => {
    if (state.finished) reset(false);
    state.service = link.dataset.selectService;
    state.time = null;
    form.querySelector(`input[name="soin"][value="${state.service}"]`).checked = true;
    error('erreur-soin', false);
    showStep(1);
  }));
  // Un retour de page ne conserve aucune coordonnée saisie.
  window.addEventListener('pageshow', event => { if (event.persisted) reset(false); });
  form.hidden = false;
  showStep(0, false);

  const bar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target, entry.isIntersecting));
      const away = [...visible.values()].some(Boolean);
      bar.classList.toggle('is-away', away);
      bar.inert = away;
    });
    [document.querySelector('.hero-main .button'), document.querySelector('.booking-board'), document.querySelector('.site-footer')].forEach(node => barObserver.observe(node));
  }
})();
