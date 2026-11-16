/* Institut Derya — aperçu non officiel. Aucun envoi, aucune conservation. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const services = {
    'aisselles': { name: 'Aisselles', duration: 15 },
    'maillot-classique': { name: 'Maillot classique', duration: 15 },
    'demi-jambes': { name: 'Demi-jambes', duration: 15 },
    'maillot-integral': { name: 'Maillot intégral', duration: 15 }
  };
  // Horaires Treatwell et Fresha, recherche du 16 novembre 2026.
  // Dimanche = 0. Le lundi reste fermé, son ouverture actuelle est à confirmer.
  const hours = { 0: null, 1: null, 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };
  const state = { service: '', day: '', time: null, step: 0, done: false };
  const days = [];
  let keyboard = false;
  let panelAnimation = null;
  const selectionAnimations = new Map();
  let observer;

  document.addEventListener('keydown', event => {
    keyboard = true;
    root.classList.add('keyboard');
    if (panelAnimation) panelAnimation.cancel();
    selectionAnimations.forEach(animation => animation.cancel());
    if (event.key === 'Escape') {
      const offer = $('.studio-details');
      if (offer.open) { offer.open = false; $('summary', offer).focus(); }
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  // Toutes les dates et toutes les heures sont celles de Paris, même à l’étranger.
  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
  }
  function dayDate(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFor(date) { return date.toISOString().slice(0, 10); }
  function longDay(key) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dayDate(key));
  }
  function timeLabel(minute) {
    return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  }
  function slotsFor(key) {
    const opening = hours[dayDate(key).getUTCDay()];
    if (!opening || !state.service) return [];
    const now = parisNow();
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = opening[0]; minute + services[state.service].duration <= opening[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      // Les indisponibilités sont déterministes et explicitement fictives.
      const taken = (seed + minute / 30) % 7 === 2;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris · exemple' : '' });
    }
    return slots;
  }
  function availableDay(key) {
    return Boolean(hours[dayDate(key).getUTCDay()]) && slotsFor(key).some(slot => !slot.disabled);
  }

  function makeRadio(name, value, accessibleName) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value);
    input.setAttribute('aria-label', accessibleName);
    return input;
  }
  function renderDays() {
    const field = $('#jours');
    field.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Choisissez une date pour la simulation';
    field.append(legend);
    const today = dayDate(parisNow().key);
    days.length = 0;
    for (let index = 0; index < 14; index++) {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() + index);
      const key = keyFor(date); days.push(key);
      const closed = !hours[date.getUTCDay()];
      const elapsed = !closed && !availableDay(key);
      const label = document.createElement('label'); label.className = 'day-choice';
      const input = makeRadio('jour', key, `${longDay(key)}${closed ? ', fermé' : elapsed ? ', aucun créneau restant' : ''}`);
      input.disabled = closed || elapsed; input.checked = state.day === key;
      input.setAttribute('aria-describedby', 'erreur-jour');
      const face = document.createElement('span');
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(date);
      const number = document.createElement('strong'); number.textContent = String(date.getUTCDate());
      const status = document.createElement('small');
      status.textContent = closed ? 'Fermé' : elapsed ? 'Passé' : index === 0 ? 'Auj.' : new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' }).format(date);
      face.append(weekday, number, status); label.append(input, face); field.append(label);
    }
  }
  function renderSlots() {
    const field = $('#heures'); field.replaceChildren();
    const legend = document.createElement('legend'); legend.className = 'sr-only'; legend.textContent = 'Choisissez une heure pour la simulation'; field.append(legend);
    if (!state.day) return;
    $('#date-selectionnee').textContent = `${longDay(state.day)} · horaires de Paris`;
    const slots = slotsFor(state.day);
    if (!slots.some(slot => !slot.disabled)) {
      const empty = document.createElement('p'); empty.className = 'no-slots';
      empty.textContent = 'Aucun créneau de simulation restant pour ce jour. Revenez au choix du jour.'; field.append(empty);
    }
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'time-choice';
      const input = makeRadio('heure', slot.minute, `${timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason.toLowerCase()}` : ', créneau fictif'}`);
      input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-describedby', 'erreur-heure');
      const face = document.createElement('span'); const time = document.createElement('time');
      time.dateTime = `${state.day}T${String(Math.floor(slot.minute / 60)).padStart(2, '0')}:${String(slot.minute % 60).padStart(2, '0')}`;
      time.textContent = timeLabel(slot.minute); face.append(time);
      if (slot.reason) { const reason = document.createElement('small'); reason.textContent = slot.reason; face.append(reason); }
      label.append(input, face); field.append(label);
    });
  }
  function clearError(id, valid) {
    $(`#${id}`).hidden = valid;
  }
  function selectionText() {
    return `${services[state.service].name}, épilation orientale, le ${longDay(state.day)} à ${timeLabel(state.time)}. Durée publiée\u00a0: 15\u00a0min. Simulation uniquement.`;
  }
  function updateSummary() {
    const values = {
      'selection-zone': state.service ? services[state.service].name : 'À choisir',
      'selection-jour': state.day ? longDay(state.day) : 'À choisir',
      'selection-heure': state.time !== null ? timeLabel(state.time) : 'À choisir'
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = $(`#${id}`);
      if (element.textContent === value) return;
      selectionAnimations.get(id)?.cancel(); element.textContent = value;
      if (!reduce.matches && !keyboard && element.animate) {
        const animation = element.animate([{ opacity: .45 }, { opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.23,1,.32,1)' });
        selectionAnimations.set(id, animation);
      }
    });
    if (state.service && state.day && state.time !== null) $('#recapitulatif-final').textContent = selectionText();
    $$('.step-nav button').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = state.done || (step > 0 && !state.service) || (step > 1 && !state.day) || (step > 2 && state.time === null);
      if (step === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function announce(message) { $('#booking-status').textContent = message; }
  function refreshValidity() {
    if (!state.day) return true;
    const now = parisNow();
    if (!days.includes(state.day) || state.day < now.key || !availableDay(state.day)) {
      state.day = ''; state.time = null; renderDays(); updateSummary();
      goTo(1); announce('Cette date ne propose plus de créneau de simulation. Choisissez un autre jour.'); return false;
    }
    if (state.time !== null && !slotsFor(state.day).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; renderSlots(); updateSummary();
      goTo(2); announce('Cette heure est passée. Choisissez une autre heure pour la simulation.'); return false;
    }
    return true;
  }
  function goTo(step, focus = true) {
    const prior = state.step;
    if (step > 0 && !state.service) step = 0;
    if (step > 1 && !state.day) step = 1;
    if (step > 2 && state.time === null) step = 2;
    state.step = step;
    if (panelAnimation) panelAnimation.cancel();
    $$('.booking-panel').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
    const panel = $(`[data-panel="${step}"]`);
    updateSummary();
    if (focus) {
      const heading = $('h3', panel); heading.focus({ preventScroll: true });
      const rect = panel.getBoundingClientRect();
      if (rect.top < 20 || rect.top > window.innerHeight * .6) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      announce(`Étape ${step + 1} sur 4\u00a0: ${heading.textContent}`);
    }
    if (focus && !reduce.matches && !keyboard && panel.animate) {
      panelAnimation = panel.animate([
        { opacity: 0, transform: `translateX(${step >= prior ? 12 : -12}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  const form = $('#booking-form');
  $$('input[name="prestation"]').forEach(input => { input.setAttribute('aria-describedby', 'erreur-zone'); });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value; state.day = ''; state.time = null;
      clearError('erreur-zone', true); renderDays();
    } else if (input.name === 'jour') {
      state.day = input.value; state.time = null;
      clearError('erreur-jour', true); renderSlots();
    } else if (input.name === 'heure') {
      state.time = Number(input.value); clearError('erreur-heure', true);
    }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    const valid = next === 1 ? Boolean(state.service) : next === 2 ? Boolean(state.day) : state.time !== null;
    const error = next === 1 ? 'erreur-zone' : next === 2 ? 'erreur-jour' : 'erreur-heure';
    clearError(error, valid);
    if (!valid) {
      announce($(`#${error}`).textContent);
      $(`[data-panel="${next - 1}"] input:not(:disabled)`)?.focus(); return;
    }
    if (!refreshValidity()) return;
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    goTo(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.back))));
  $$('.step-nav button').forEach(button => button.addEventListener('click', () => {
    if (refreshValidity()) goTo(Number(button.dataset.step));
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    resetSimulation(false);
    const input = $(`input[name="prestation"][value="${link.dataset.service}"]`);
    input.checked = true; state.service = input.value; renderDays(); updateSummary();
    goTo(1, false);
    // La navigation d’ancre conserve son comportement natif, y compris sans JavaScript.
    setTimeout(() => $('#etape-jour').focus({ preventScroll: true }), 0);
    announce(`${services[state.service].name} sélectionné. Étape 2 sur 4\u00a0: choisissez un jour.`);
  }));
  ['prenom', 'telephone'].forEach(id => $(`#${id}`).addEventListener('input', () => {
    $(`#${id}`).removeAttribute('aria-invalid'); $(`#erreur-${id}`).hidden = true;
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || !state.service || !state.day || state.time === null) { goTo(state.step); return; }
    if (!refreshValidity()) return;
    const firstName = $('#prenom'); const telephone = $('#telephone');
    const nameValid = firstName.value.trim().length > 0;
    const normalized = telephone.value.replace(/[\s().-]/g, '').replace(/^\+33|^0033/, '0');
    const phoneValid = /^0[67]\d{8}$/.test(normalized);
    [[firstName, nameValid], [telephone, phoneValid]].forEach(([field, valid]) => {
      field.setAttribute('aria-invalid', String(!valid)); $(`#erreur-${field.id}`).hidden = valid;
    });
    if (!nameValid || !phoneValid) {
      (!nameValid ? firstName : telephone).focus();
      announce('La simulation attend un prénom et un numéro de mobile français valides.'); return;
    }
    state.done = true; updateSummary(); form.hidden = true; $('.step-nav').hidden = true;
    $('#resultat-recap').textContent = `${firstName.value.trim()}, voici votre essai\u00a0: ${selectionText()}`;
    $('#resultat').hidden = false;
    firstName.value = ''; telephone.value = '';
    $('#titre-resultat').focus(); announce('Simulation terminée. Aucun rendez-vous pris, rien n’a été envoyé.');
  });
  function resetSimulation(focus = true) {
    if (panelAnimation) panelAnimation.cancel();
    form.reset(); Object.assign(state, { service: '', day: '', time: null, step: 0, done: false });
    form.hidden = false; $('.step-nav').hidden = false; $('#resultat').hidden = true;
    $('#resultat-recap').textContent = ''; $('#recapitulatif-final').textContent = '';
    $$('.field-error').forEach(error => { error.hidden = true; });
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    renderDays(); renderSlots(); goTo(0, focus);
  }
  $('#recommencer').addEventListener('click', () => resetSimulation());

  // La page n’est masquée pour les entrées qu’après initialisation des contrôles.
  renderDays(); updateSummary(); $('#simulation').hidden = false;
  root.classList.add('js');
  if (!reduce.matches) root.classList.add('motion');
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
  } else $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  reduce.addEventListener('change', () => {
    if (reduce.matches) {
      root.classList.remove('motion');
      if (panelAnimation) panelAnimation.cancel();
      selectionAnimations.forEach(animation => animation.cancel());
    }
  });

  const bar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = { hero: true, booking: false, footer: false };
    const watch = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'actions-hero') visible.hero = entry.isIntersecting;
        if (entry.target.id === 'rendez-vous') visible.booking = entry.isIntersecting;
        if (entry.target.id === 'sources') visible.footer = entry.isIntersecting;
      });
      bar.classList.toggle('is-visible', !visible.hero && !visible.booking && !visible.footer);
      bar.inert = !bar.classList.contains('is-visible');
    });
    ['actions-hero', 'rendez-vous', 'sources'].forEach(id => watch.observe($(`#${id}`)));
  }
})();
