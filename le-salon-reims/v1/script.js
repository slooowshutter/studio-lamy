(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'homme', name: 'Coupe homme', duration: 15, price: 30, detail: '15\u00a0min' },
    { id: 'etudiant', name: 'Coupe étudiant', duration: 15, price: 27, detail: 'Moins de 25 ans · 15\u00a0min' },
    { id: 'court', name: 'Coupe + brushing court', duration: 30, price: 49, detail: '30\u00a0min' },
    { id: 'long', name: 'Coupe + brushing long', duration: 30, price: 55, detail: '30\u00a0min' },
    { id: 'couleur', name: 'Coloration + coupe + brushing', duration: 90, price: 90, from: true, detail: '1\u00a0h\u00a030' },
    { id: 'ombre', name: 'Ombré hair + coupe + brushing avec patine', duration: 180, price: 160, from: true, detail: '3\u00a0h' }
  ];
  // Index JavaScript : dimanche = 0. Horaires Planity, à confirmer.
  const hours = [null, [600, 1080], [540, 1140], [540, 1140], [540, 1020], [540, 1140], [540, 1080]];
  const state = { service: null, day: null, time: null, step: 0, reached: 0, complete: false };
  const $ = (selector) => document.querySelector(selector);
  const panels = [...document.querySelectorAll('[data-panel]')];
  const form = $('#booking-form');
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const announcer = $('#booking-announcement');
  let panelTimer;
  const parisDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parisTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  function currentParis() {
    const now = new Date();
    const parts = Object.fromEntries(parisDate.formatToParts(now).map(p => [p.type, p.value]));
    const time = Object.fromEntries(parisTime.formatToParts(now).map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(time.hour) * 60 + Number(time.minute) };
  }
  const dayDate = (key) => new Date(`${key}T12:00:00Z`);
  const priceText = (service) => `${service.from ? 'Dès ' : ''}${service.price}\u00a0€`;
  const timeText = (minutes) => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  function announce(message) { announcer.textContent = message; }
  function textNode(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }
  function radioChoice(group, value, label, extra = {}) {
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = group; radio.value = value;
    radio.disabled = !!extra.disabled;
    if (extra.description) radio.setAttribute('aria-describedby', extra.description);
    const face = document.createElement('span'); face.className = 'choice-face';
    face.append(...label);
    wrapper.append(radio, face);
    return wrapper;
  }
  function renderServices() {
    const group = $('#service-options');
    services.forEach(service => {
      const name = textNode('span', 'choice-name', service.name);
      name.append(textNode('span', 'choice-meta', service.detail));
      group.append(radioChoice('prestation', service.id, [name, textNode('span', 'choice-price', priceText(service))], { description: 'service-error' }));
    });
  }
  function renderDays() {
    const group = $('#day-options');
    group.querySelectorAll('label').forEach(node => node.remove());
    const today = currentParis();
    const base = dayDate(today.key);
    for (let i = 0; i < 14; i++) {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + i);
      const key = date.toISOString().slice(0, 10);
      const closed = !hours[date.getUTCDay()];
      const ended = i === 0 && !closed && today.minutes + (state.service?.duration || 15) > hours[date.getUTCDay()][1];
      const label = [textNode('span', 'day-label', shortDay.format(date)), textNode('span', 'choice-value', String(date.getUTCDate())), textNode('span', 'day-label', month.format(date)), textNode('span', 'day-state', closed ? 'Fermé' : ended ? 'Terminé' : i === 0 ? 'Aujourd’hui' : 'À essayer')];
      const choice = radioChoice('jour', key, label, { disabled: closed || ended, description: 'day-error' });
      choice.querySelector('input').setAttribute('aria-label', `${longDate.format(date)}${closed ? ', fermé' : ended ? ', journée terminée' : ', disponibilité simulée'}`);
      choice.querySelector('input').checked = key === state.day;
      group.append(choice);
    }
  }
  function simulatedTaken(key, minutes) {
    const seed = Number(key.replaceAll('-', ''));
    return (seed + Math.floor(minutes / 15) * 7) % 9 === 0;
  }
  function slotList(key, service, now = currentParis()) {
    const opening = hours[dayDate(key).getUTCDay()];
    if (!opening) return [];
    const result = [];
    for (let minutes = opening[0]; minutes + service.duration <= opening[1]; minutes += 15) {
      const past = key < now.key || (key === now.key && minutes <= now.minutes);
      const taken = simulatedTaken(key, minutes);
      result.push({ minutes, past, taken, disabled: past || taken });
    }
    return result;
  }
  function renderTimes() {
    const group = $('#time-options');
    group.querySelectorAll('label').forEach(node => node.remove());
    const opening = hours[dayDate(state.day).getUTCDay()];
    $('#slot-description').textContent = `${longDate.format(dayDate(state.day))} · ${timeText(opening[0])} – ${timeText(opening[1])}. Créneaux fictifs\u00a0: «\u00a0déjà pris\u00a0» est aussi simulé.`;
    const slots = slotList(state.day, state.service);
    slots.forEach(slot => {
      const label = [textNode('span', 'choice-value', timeText(slot.minutes)), textNode('span', 'slot-state', slot.past ? 'Passé' : slot.taken ? 'Déjà pris' : 'Fictif')];
      const choice = radioChoice('heure', String(slot.minutes), label, { disabled: slot.disabled, description: 'time-error' });
      choice.querySelector('input').checked = slot.minutes === state.time;
      group.append(choice);
    });
    if (!slots.some(slot => !slot.disabled)) $('#time-error').textContent = 'Aucun créneau à essayer ce jour. Revenez au choix du jour.';
  }
  function recapText() {
    return `${state.service.name} · ${longDate.format(dayDate(state.day))} à ${timeText(state.time)} · ${priceText(state.service)}, tarif indicatif à confirmer.`;
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(dayDate(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    $('#summary-price').textContent = state.service ? priceText(state.service) : '—';
    if (state.service && state.day && state.time !== null) $('#final-recap').textContent = recapText();
  }
  function enterPanel(panel) {
    if (reduceMotion.matches || root.classList.contains('using-keyboard')) return;
    panel.classList.add('is-changing');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-changing')));
  }
  function showStep(index, focus = true) {
    clearTimeout(panelTimer);
    state.step = index;
    state.reached = Math.max(state.reached, index);
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    const panel = panels[index];
    panels.forEach(p => { p.hidden = p !== panel; p.classList.remove('is-changing'); });
    stepButtons.forEach((button, i) => {
      button.disabled = i > state.reached;
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    enterPanel(panel);
    if (focus) panel.querySelector('.step-title').focus();
    announce(`Étape ${index + 1} sur 4\u00a0: ${['prestation', 'jour', 'heure', 'vos coordonnées'][index]}.`);
    updateSummary();
  }
  function clearErrors() {
    ['service-error', 'day-error', 'time-error'].forEach(id => document.getElementById(id).textContent = '');
  }
  function chooseService(id) {
    const service = services.find(item => item.id === id);
    if (!service) return;
    if (state.service?.id !== id) {
      state.service = service; state.day = null; state.time = null; state.reached = 0;
      document.querySelectorAll('input[name="jour"], input[name="heure"]').forEach(input => input.checked = false);
    }
    const radio = document.querySelector(`input[name="prestation"][value="${id}"]`);
    radio.checked = true;
    clearErrors(); updateSummary();
    stepButtons.forEach((button, i) => button.disabled = i > state.reached);
  }
  function resetSuccess() {
    if (!state.complete) return;
    state.complete = false;
    form.hidden = false;
    $('.step-nav').hidden = false;
    $('#booking-success').hidden = true;
    $('#success-name').textContent = '';
  }
  function validateNext(index) {
    clearErrors();
    if (index === 1 && !state.service) {
      $('#service-error').textContent = 'Choisissez une prestation pour continuer.';
      $('input[name="prestation"]').focus(); return;
    }
    if (index === 2 && !state.day) {
      $('#day-error').textContent = 'Choisissez un jour pour continuer.';
      $('input[name="jour"]:not(:disabled)').focus(); return;
    }
    if (index === 3 && state.time === null) {
      $('#time-error').textContent = 'Choisissez une heure pour continuer.';
      $('input[name="heure"]:not(:disabled)')?.focus(); return;
    }
    showStep(index);
  }
  renderServices();
  $('#booking-app').hidden = false;
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      if (state.day !== input.value) { state.time = null; state.reached = 1; }
      state.day = input.value;
      $('#day-error').textContent = '';
      stepButtons.forEach((button, i) => button.disabled = i > state.reached);
      updateSummary();
    }
    if (input.name === 'heure') { state.time = Number(input.value); $('#time-error').textContent = ''; updateSummary(); }
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => validateNext(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    resetSuccess(); chooseService(link.dataset.service); showStep(1, false);
    panelTimer = setTimeout(() => panels[1].querySelector('.step-title').focus({ preventScroll: true }), reduceMotion.matches ? 0 : 250);
  }));
  ['prenom', 'telephone'].forEach(id => document.getElementById(id).addEventListener('input', () => {
    document.getElementById(`${id}-error`).textContent = '';
    document.getElementById(id).removeAttribute('aria-invalid');
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { validateNext(state.step + 1); return; }
    if (!state.service || !state.day || state.time === null) { showStep(0); return; }
    const selected = slotList(state.day, state.service).find(slot => slot.minutes === state.time);
    if (!selected || selected.disabled) {
      state.time = null; state.reached = 2; showStep(2);
      $('#time-error').textContent = 'Ce créneau n’est plus proposé dans la simulation. Choisissez une autre heure ou un autre jour.';
      return;
    }
    const firstName = $('#prenom');
    const phone = $('#telephone');
    const nameOK = firstName.value.trim().length >= 2;
    const compactPhone = phone.value.replace(/[\s.()\-]/g, '');
    const phoneOK = /^(?:0|\+33|0033)[67]\d{8}$/.test(compactPhone);
    $('#prenom-error').textContent = nameOK ? '' : 'Indiquez un prénom d’au moins deux caractères.';
    $('#telephone-error').textContent = phoneOK ? '' : 'Indiquez un mobile français de 10 chiffres, commençant par 06 ou 07, ou son format +33.';
    firstName.setAttribute('aria-invalid', String(!nameOK));
    phone.setAttribute('aria-invalid', String(!phoneOK));
    if (!nameOK || !phoneOK) { (!nameOK ? firstName : phone).focus(); announce('Vérifiez les champs signalés.'); return; }
    state.complete = true;
    $('#success-name').textContent = `${firstName.value.trim()}, voici votre sélection pour cet essai.`;
    $('#success-recap').textContent = recapText();
    form.hidden = true; $('.step-nav').hidden = true;
    const success = $('#booking-success'); success.hidden = false;
    enterPanel(success);
    success.querySelector('.step-title').focus();
    announce('Simulation terminée. Aucun rendez-vous réservé et aucune information envoyée.');
    // Effacement immédiat des coordonnées saisies ; aucun stockage ni appel réseau.
    firstName.value = ''; phone.value = '';
  });
  $('#restart').addEventListener('click', () => {
    resetSuccess(); form.reset(); state.service = null; state.day = null; state.time = null; state.reached = 0;
    ['prenom', 'telephone'].forEach(id => { document.getElementById(id).removeAttribute('aria-invalid'); document.getElementById(`${id}-error`).textContent = ''; });
    clearErrors(); showStep(0);
  });
  document.addEventListener('keydown', () => root.classList.add('using-keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('using-keyboard'), { passive: true });
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
    }), { threshold: .12, rootMargin: '0px 0px -16px 0px' });
    document.querySelectorAll('[data-reveal]').forEach((element, i) => {
      element.classList.add('is-armed');
      if (element.dataset.reveal === 'ligne') element.style.transitionDelay = `${(i % 4) * 60}ms`;
      observer.observe(element);
    });
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
