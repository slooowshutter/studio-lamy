/* L’instant N : simulation locale, sans requête, stockage ni disponibilité réelle. */
(() => {
  'use strict';
  const doc = document;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    coupe: 'Coupe de cheveux pour femme',
    extensions: 'Extensions de cheveux'
  };
  // Horaires concordants des annuaires du dossier de recherche, à confirmer.
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const state = { step: 0, service: '', day: '', slot: null, finished: false };
  const form = doc.querySelector('#booking-form');
  const panels = [...doc.querySelectorAll('[data-panel]')];
  const stepButtons = [...doc.querySelectorAll('[data-step]')];
  const next = doc.querySelector('#continuer');
  const previous = doc.querySelector('#precedent');
  const result = doc.querySelector('#resultat');
  const nameInput = doc.querySelector('#prenom');
  const phoneInput = doc.querySelector('#telephone');
  const fullDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthName = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const labels = ['Choisir le jour', 'Choisir l’heure', 'Passer aux coordonnées', 'Terminer la simulation'];
  let panelFrame = 0;

  function parisNow() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`; }
  function announce(message) { doc.querySelector('#annonce').textContent = message; }
  function usableSlots(key) {
    if (!key) return [];
    const opening = hours[dateFromKey(key).getUTCDay()];
    if (!opening) return [];
    const now = parisNow();
    if (key < now.date) return [];
    // Choix d’heures ponctuelles : ne représente pas une durée de prestation.
    const slots = [];
    for (let minutes = opening[0]; minutes < opening[1]; minutes += 60) {
      if (key > now.date || minutes > now.minutes) slots.push(minutes);
    }
    return slots;
  }
  function createChoice(name, value, disabled, classes, accessibleLabel) {
    const label = doc.createElement('label');
    label.className = `choice ${classes}`;
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', accessibleLabel);
    label.append(input);
    return { label, input };
  }
  function span(className, content) {
    const el = doc.createElement('span');
    el.className = className;
    el.textContent = content;
    return el;
  }
  function renderDays() {
    const grid = doc.querySelector('#jours');
    grid.replaceChildren();
    const now = parisNow();
    const start = dateFromKey(now.date);
    let currentMonth = '';
    for (let i = 0; i < 14; i += 1) {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + i);
      const key = keyFromDate(day);
      const month = monthName.format(day);
      if (month !== currentMonth) {
        grid.append(span('month-label', month));
        currentMonth = month;
      }
      const closed = !hours[day.getUTCDay()];
      const elapsed = !closed && usableSlots(key).length === 0;
      const status = closed ? 'Fermé' : elapsed ? 'Écoulé' : 'Exemple';
      const choice = createChoice('jour', key, closed || elapsed, 'day-choice', `${fullDate.format(day)}, ${status.toLowerCase()}`);
      choice.input.checked = state.day === key;
      choice.label.append(span('day-choice__name', shortDay.format(day).replace('.', '')), span('day-choice__number', String(day.getUTCDate())), span('day-choice__state', status));
      grid.append(choice.label);
    }
  }
  function renderSlots() {
    const grid = doc.querySelector('#heures');
    grid.replaceChildren();
    const slots = usableSlots(state.day);
    if (!slots.length) {
      const p = doc.createElement('p');
      p.className = 'slot-empty';
      p.textContent = 'Plus d’heure d’exemple pour ce jour. Revenez au choix du jour.';
      grid.append(p);
      return;
    }
    for (const minutes of slots) {
      const choice = createChoice('heure', String(minutes), false, 'slot-choice', `${timeLabel(minutes)}, heure d’exemple`);
      choice.input.checked = state.slot === minutes;
      choice.label.append(span('', timeLabel(minutes)));
      grid.append(choice.label);
    }
  }
  function updateSummary() {
    doc.querySelector('#recap-prestation').textContent = services[state.service] || 'À choisir';
    doc.querySelector('#recap-jour').textContent = state.day ? fullDate.format(dateFromKey(state.day)) : 'À choisir';
    doc.querySelector('#recap-heure').textContent = state.slot !== null ? timeLabel(state.slot) : 'À choisir';
  }
  function updateControls() {
    next.textContent = labels[state.step];
    next.disabled = state.step === 0 ? !state.service : state.step === 1 ? !state.day : state.step === 2 ? state.slot === null : false;
    previous.hidden = state.step === 0;
    stepButtons.forEach((button, i) => {
      if (i === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = i > state.step && !(i === 1 && state.service) && !(i === 2 && state.day) && !(i === 3 && state.slot !== null);
    });
  }
  function revealPanel(panel) {
    cancelAnimationFrame(panelFrame);
    panels.forEach(p => p.classList.remove('is-entering'));
    result.classList.remove('is-entering');
    if (!reduceMotion.matches) {
      panel.classList.add('is-entering');
      panelFrame = requestAnimationFrame(() => {
        panelFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    const heading = panel.querySelector('h3');
    if (heading) {
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function showStep(index, focus = true) {
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    updateControls();
    updateSummary();
    if (focus) {
      revealPanel(panels[index]);
      announce(`Étape ${index + 1} sur 4 : ${panels[index].querySelector('h3').textContent}`);
    }
  }
  function setService(service) {
    if (!services[service]) return;
    state.service = service;
    doc.querySelectorAll('input[name="prestation"]').forEach(input => { input.checked = input.value === service; });
    updateSummary();
    updateControls();
  }
  function clearError(input, errorId) {
    input.removeAttribute('aria-invalid');
    doc.getElementById(errorId).hidden = true;
  }
  function validateDetails() {
    const nameOK = nameInput.value.trim().length > 0;
    const normalized = phoneInput.value.replace(/[\s().-]/g, '').replace(/^0033/, '+33');
    const phoneOK = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(normalized);
    for (const [input, ok, id] of [[nameInput, nameOK, 'erreur-prenom'], [phoneInput, phoneOK, 'erreur-telephone']]) {
      doc.getElementById(id).hidden = ok;
      if (ok) input.removeAttribute('aria-invalid');
      else input.setAttribute('aria-invalid', 'true');
    }
    if (!nameOK || !phoneOK) {
      (nameOK ? phoneInput : nameInput).focus();
      announce('La simulation reste ouverte. Vérifiez les champs signalés.');
    }
    return nameOK && phoneOK;
  }
  function revalidateSelection() {
    if (!services[state.service]) { showStep(0); return false; }
    if (!state.day || !usableSlots(state.day).length) {
      state.day = ''; state.slot = null;
      showStep(1);
      announce('Le jour choisi est écoulé. Choisissez un autre jour d’exemple.');
      return false;
    }
    if (state.slot === null || !usableSlots(state.day).includes(state.slot)) {
      state.slot = null;
      showStep(2);
      announce('Cette heure est écoulée. Choisissez une autre heure d’exemple.');
      return false;
    }
    return true;
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') setService(input.value);
    if (input.name === 'jour') {
      state.day = input.value;
      state.slot = null;
    }
    if (input.name === 'heure') state.slot = Number(input.value);
    updateSummary(); updateControls();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (next.disabled) return;
    if (state.step === 1 && !usableSlots(state.day).length) {
      state.day = ''; showStep(1);
      announce('Ce jour est écoulé. Choisissez un autre jour d’exemple.');
      return;
    }
    if (state.step < 3) { showStep(state.step + 1); return; }
    if (!revalidateSelection() || !validateDetails()) return;
    state.finished = true;
    form.hidden = true;
    doc.querySelector('.steps').hidden = true;
    result.hidden = false;
    doc.querySelector('#recap-final').textContent = `Votre sélection d’essai : ${services[state.service]}, ${fullDate.format(dateFromKey(state.day))} à ${timeLabel(state.slot)}.`;
    revealPanel(result);
    announce('Simulation terminée. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.');
    // Les coordonnées ne sont même pas reprises dans le résultat.
    nameInput.value = ''; phoneInput.value = '';
  });
  previous.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  nameInput.addEventListener('input', () => clearError(nameInput, 'erreur-prenom'));
  phoneInput.addEventListener('input', () => clearError(phoneInput, 'erreur-telephone'));
  function restart() {
    state.step = 0; state.service = ''; state.day = ''; state.slot = null; state.finished = false;
    form.reset();
    form.hidden = false; result.hidden = true; doc.querySelector('.steps').hidden = false;
    clearError(nameInput, 'erreur-prenom'); clearError(phoneInput, 'erreur-telephone');
    showStep(0);
  }
  doc.querySelector('#recommencer').addEventListener('click', restart);
  doc.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (state.finished) restart();
    setService(link.dataset.service);
    showStep(1);
    doc.querySelector('.booking__interface').scrollIntoView({ behavior: 'instant', block: 'start' });
  }));
  doc.querySelector('#simulation').hidden = false;
  showStep(0, false);

  // Enrichissement progressif : on ne cache les éléments que si l’observateur existe.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1 });
    doc.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    doc.documentElement.classList.add('js');
  }
})();
