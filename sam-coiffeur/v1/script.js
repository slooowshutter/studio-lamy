(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(0.23, 1, 0.32, 1)';
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard-input'); }, { passive: true });
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard-input'); }, { passive: true });

  // Entrée rare : présenter les deux côtés de la correspondance, puis son timbre.
  if (!reduced.matches) document.body.classList.add('motion-ready');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, index) => {
      element.classList.add('will-reveal');
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 4) * 60}ms`;
      revealObserver.observe(element);
    });
    reduced.addEventListener('change', () => {
      if (!reduced.matches) return;
      revealObserver.disconnect();
      $$('[data-reveal]').forEach(element => element.classList.add('is-revealed'));
    });
  }

  // Données publiées sur Treatwell, relevé du 18/11/2026. Aucun prix dans l’essai.
  const services = $$('.service-row').map(row => ({
    id: row.dataset.service,
    name: row.dataset.name,
    duration: Number(row.dataset.duration)
  }));
  const hours = { 0: [600, 1140], 1: [570, 1170], 2: [570, 1170], 3: [570, 1170], 4: [570, 1170], 5: [570, 1170], 6: [570, 1170] };
  const state = { step: 0, service: null, date: '', minute: null };
  const form = $('#reservation');
  const panels = $$('.booking-panel');
  const stepButtons = $$('[data-go]');
  let animation = null;
  reduced.addEventListener('change', () => { if (reduced.matches) animation?.cancel(); });
  const zoneFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const hourText = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  const dateValue = date => date.toISOString().slice(0, 10);
  const parseDate = value => new Date(`${value}T12:00:00Z`);
  const serviceValue = () => services.find(service => service.id === state.service);

  function parisNow() {
    const parts = Object.fromEntries(zoneFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function isPast(date, minute) {
    const now = parisNow();
    return date < now.date || (date === now.date && minute <= now.minutes);
  }
  // Les indisponibilités sont déterministes et expressément simulées.
  function simulatedUnavailable(date, minute) {
    return (Number(date.replaceAll('-', '')) + Math.floor(minute / 30)) % 7 === 0;
  }
  function slotsFor(date, duration) {
    const dayHours = hours[parseDate(date).getUTCDay()];
    if (!dayHours) return [];
    const slots = [];
    for (let minute = dayHours[0]; minute + duration <= dayHours[1]; minute += 30) {
      slots.push({ minute, disabled: isPast(date, minute) || simulatedUnavailable(date, minute) });
    }
    return slots;
  }
  function radio(name, value, descriptionId) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    if (descriptionId) input.setAttribute('aria-describedby', descriptionId);
    return input;
  }
  function text(tag, content, className) {
    const element = document.createElement(tag);
    element.textContent = content;
    if (className) element.className = className;
    return element;
  }
  function clearErrors() {
    $$('.error').forEach(element => { element.hidden = true; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
  }
  function updateSummary() {
    $('#recap-prestation').textContent = serviceValue()?.name || 'Une prestation à choisir';
    $('#recap-jour').textContent = state.date ? dateFormatter.format(parseDate(state.date)) : 'Un jour à choisir';
    $('#recap-heure').textContent = state.minute !== null ? hourText(state.minute) : 'Une heure à choisir';
    $('#confirmation-recap').textContent = state.service && state.date && state.minute !== null
      ? `${serviceValue().name}, le ${dateFormatter.format(parseDate(state.date))} à ${hourText(state.minute)}. Destination : 22 rue Frémicourt, Paris. Simulation uniquement.`
      : '';
    stepButtons.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.date) || (index > 2 && state.minute === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderServices() {
    const fragment = document.createDocumentFragment();
    for (const service of services) {
      const label = document.createElement('label'); label.className = 'service-option';
      const input = radio('prestation', service.id, 'erreur-prestation');
      input.checked = service.id === state.service;
      label.append(input, text('span', service.name), text('small', `${service.duration}\u00a0min`));
      fragment.append(label);
    }
    $('#choix-prestations').replaceChildren(fragment);
  }
  function renderDays() {
    const now = parisNow();
    const first = parseDate(now.date);
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(first); date.setUTCDate(first.getUTCDate() + offset);
      const value = dateValue(date);
      const label = document.createElement('label'); label.className = 'date-option';
      const input = radio('jour', value, 'erreur-jour');
      const closed = !hours[date.getUTCDay()];
      const noSlots = !closed && !slotsFor(value, serviceValue()?.duration || 40).some(slot => !slot.disabled);
      input.checked = value === state.date;
      input.disabled = closed || noSlots;
      input.setAttribute('aria-label', `${dateFormatter.format(date)}${closed ? ', fermé' : noSlots ? ', aucun créneau restant pour cet essai' : ''}`);
      label.append(input, text('span', weekFormatter.format(date)), text('span', String(date.getUTCDate()), 'day-number'), text('span', monthFormatter.format(date)));
      if (closed || noSlots) label.append(text('small', closed ? 'Fermé' : 'Terminé'));
      fragment.append(label);
    }
    $('#choix-jours').replaceChildren(fragment);
  }
  function renderSlots() {
    if (!state.date || !state.service) return;
    $('#jour-choisi').textContent = dateFormatter.format(parseDate(state.date));
    const fragment = document.createDocumentFragment();
    const slots = slotsFor(state.date, serviceValue().duration);
    for (const slot of slots) {
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = radio('heure', String(slot.minute), 'erreur-heure');
      input.disabled = slot.disabled; input.checked = state.minute === slot.minute;
      input.setAttribute('aria-label', `${hourText(slot.minute)}${slot.disabled ? ', indisponible dans la simulation' : ', créneau fictif'}`);
      label.append(input, text('span', hourText(slot.minute)));
      fragment.append(label);
    }
    $('#choix-heures').replaceChildren(fragment);
    $('#aucun-creneau').hidden = slots.some(slot => !slot.disabled);
  }
  function showStep(index, focus = true) {
    const oldStep = state.step;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    state.step = index;
    animation?.cancel();
    panels.forEach((panel, position) => { panel.hidden = position !== index; });
    const heading = $('h3', panels[index]);
    updateSummary(); clearErrors();
    $('#annonce-etape').textContent = `Étape ${index + 1} sur 4 : ${heading.textContent}`;
    if (focus) { heading.focus({ preventScroll: true }); heading.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }
    if (!reduced.matches && !keyboard && focus) {
      animation = panels[index].animate([
        { opacity: 0, transform: `translateX(${index >= oldStep ? '10px' : '-10px'})` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing });
    }
  }
  function errorForStep() {
    return state.step === 0 && !state.service ? 'prestation' : state.step === 1 && !state.date ? 'jour' : state.step === 2 && state.minute === null ? 'heure' : '';
  }
  function selectService(id) {
    state.service = id; state.minute = null;
    if (state.date && !slotsFor(state.date, serviceValue().duration).some(slot => !slot.disabled)) state.date = '';
    $$('#choix-prestations input').forEach(input => { input.checked = input.value === id; });
    clearErrors(); updateSummary();
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') { state.date = input.value; state.minute = null; clearErrors(); updateSummary(); }
    if (input.name === 'heure') { state.minute = Number(input.value); clearErrors(); updateSummary(); }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const invalid = errorForStep();
    if (invalid) {
      $(`#erreur-${invalid}`).hidden = false;
      $('input:not(:disabled)', panels[state.step])?.focus();
      return;
    }
    if (state.step === 2 && isPast(state.date, state.minute)) {
      state.minute = null; renderSlots(); updateSummary(); $('#erreur-heure').hidden = false;
      return;
    }
    showStep(state.step + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.go))));
  $$('[data-select]').forEach(link => link.addEventListener('click', () => {
    $('#resultat').hidden = true; form.hidden = false;
    $('#statut-brouillon').textContent = 'Simulation · Non envoyé';
    selectService(link.dataset.select); showStep(1);
  }));
  function validateField(input) {
    let valid = true;
    if (input.id === 'prenom') valid = input.value.trim().length > 0;
    if (input.id === 'telephone') {
      const cleaned = input.value.replace(/[\s.()\-]/g, '');
      valid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(cleaned);
    }
    $(`#erreur-${input.id}`).hidden = valid;
    if (valid) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    return valid;
  }
  ['prenom', 'telephone'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('blur', () => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateField(input);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    // La touche Entrée ne permet jamais de sauter les premières étapes.
    if (state.step !== 3) return;
    const fields = [$('#prenom'), $('#telephone')];
    const invalid = fields.filter(input => !validateField(input));
    if (invalid.length) { invalid[0].focus(); $('#annonce-etape').textContent = 'Vérifiez les champs signalés avant de terminer l’essai.'; return; }
    const chosen = state.date && state.service && slotsFor(state.date, serviceValue().duration).find(slot => slot.minute === state.minute && !slot.disabled);
    if (!chosen) { $('#erreur-creneau').hidden = false; return; }
    form.hidden = true;
    $('#resultat').hidden = false;
    $('#resultat-texte').textContent = `${$('#prenom').value.trim()}, votre brouillon : ${serviceValue().name.toLocaleLowerCase('fr-FR')}, le ${dateFormatter.format(parseDate(state.date))} à ${hourText(state.minute)}, au 22 rue Frémicourt, Paris.`;
    $('#statut-brouillon').textContent = 'Brouillon terminé · Non envoyé';
    $('#annonce-etape').textContent = 'Essai terminé. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.';
    const resultHeading = $('h3', $('#resultat'));
    resultHeading.focus({ preventScroll: true });
    resultHeading.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    fields.forEach(input => { input.value = ''; });
  });
  $('#recommencer').addEventListener('click', () => {
    form.reset(); state.service = null; state.date = ''; state.minute = null;
    $('#resultat').hidden = true; form.hidden = false;
    $('#statut-brouillon').textContent = 'Simulation · Non envoyé';
    renderServices(); showStep(0);
  });
  renderServices(); showStep(0, false);
  form.hidden = false; $('#sans-script').hidden = true;
})();
