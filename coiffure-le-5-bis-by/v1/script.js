/* Parcours local : aucune transmission et aucun stockage persistant. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => doc.querySelector(selector);
  const $$ = (selector) => Array.from(doc.querySelectorAll(selector));

  // Fiche iCoiffeur : mardi/samedi 9–19, jeudi/vendredi 9–21.
  // Ces plages sourcées servent à un essai, jamais à annoncer une disponibilité.
  const HOURS = { 0: null, 1: null, 2: [540, 1140], 3: null, 4: [540, 1260], 5: [540, 1260], 6: [540, 1140] };
  const SERVICES = { coupe: 'Coupe', coloration: 'Coloration', soins: 'Soins capillaires' };
  const BUTTONS = ['Choisir le jour', 'Choisir l’horaire', 'Voir le récapitulatif', 'Terminer la simulation'];
  const TITLES = ['Choix de la coiffure', 'Choix du jour', 'Choix de l’horaire', 'Récapitulatif de l’essai'];
  const state = { step: 0, furthest: 0, service: '', date: '', time: null, completed: false };
  let currentDates = [];
  let entranceFrame = 0;
  let lastInput = 'pointer';

  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });

  function parisNow(at = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(at).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    const key = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    return { ...parts, key, minutes: parts.hour * 60 + parts.minute };
  }

  function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function hourLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}\u00a0h${rest ? `\u00a0${String(rest).padStart(2, '0')}` : ''}`;
  }

  function slotsFor(key, now = parisNow()) {
    const range = HOURS[dateObject(key).getUTCDay()];
    if (!range) return [];
    const slots = [];
    for (let minute = range[0]; minute < range[1]; minute += 60) {
      slots.push({ minute, past: key < now.key || (key === now.key && minute <= now.minutes) });
    }
    return slots;
  }

  function buildDates(now = parisNow()) {
    const start = dateObject(now.key);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const key = dateKey(date);
      const closed = !HOURS[date.getUTCDay()];
      const elapsed = !closed && !slotsFor(key, now).some(slot => !slot.past);
      return { key, date, closed, elapsed };
    });
  }

  function makeRadio(name, value, id, disabled = false) {
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.id = id;
    input.disabled = disabled;
    return input;
  }

  function appendText(parent, tag, content) {
    const element = doc.createElement(tag);
    element.textContent = content;
    parent.append(element);
    return element;
  }

  function renderDates() {
    currentDates = buildDates();
    const fragment = doc.createDocumentFragment();
    currentDates.forEach(({ key, date, closed, elapsed }) => {
      const label = doc.createElement('label');
      label.className = `date-choice${closed || elapsed ? ' is-disabled' : ''}`;
      const input = makeRadio('jour', key, `jour-${key}`, closed || elapsed);
      input.checked = state.date === key;
      const qualifier = closed ? ', fermé d’après iCoiffeur, à confirmer' : elapsed ? ', horaires écoulés' : ', jour de simulation';
      input.setAttribute('aria-label', `${longDate.format(date)}${qualifier}`);
      label.append(input);
      appendText(label, 'span', shortWeekday.format(date));
      appendText(label, 'strong', String(date.getUTCDate()));
      appendText(label, 'small', closed ? 'Fermé*' : elapsed ? 'Écoulé' : shortMonth.format(date));
      fragment.append(label);
    });
    $('#jours').replaceChildren(fragment);
  }

  function renderTimes() {
    if (!state.date) return;
    $('#jour-choisi').textContent = longDate.format(dateObject(state.date));
    const fragment = doc.createDocumentFragment();
    slotsFor(state.date).forEach(({ minute, past }) => {
      const label = doc.createElement('label');
      label.className = `time-choice${past ? ' is-disabled' : ''}`;
      const input = makeRadio('horaire', minute, `heure-${minute}`, past);
      input.checked = state.time === minute;
      input.setAttribute('aria-label', `${hourLabel(minute)}, ${past ? 'horaire écoulé' : 'préférence de simulation, à confirmer'}`);
      label.append(input);
      appendText(label, 'span', hourLabel(minute));
      if (past) appendText(label, 'small', 'Écoulé');
      fragment.append(label);
    });
    $('#heures').replaceChildren(fragment);
  }

  function updateSummary() {
    $('#selection-coiffure').textContent = SERVICES[state.service] || 'À choisir';
    $('#selection-jour').textContent = state.date ? longDate.format(dateObject(state.date)) : 'À choisir';
    $('#selection-horaire').textContent = state.time === null ? 'À choisir' : `${hourLabel(state.time)} · à confirmer`;
  }

  function syncStepNavigation() {
    $$('.step-nav button').forEach((button, index) => {
      button.disabled = index > state.furthest;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function setError(field, message) {
    $(`#erreur-${field}`).textContent = message;
    const input = $(`#${field}`);
    if (input) input.setAttribute('aria-invalid', String(Boolean(message)));
  }

  function clearErrors() {
    ['coiffure', 'jour', 'horaire', 'prenom', 'telephone'].forEach(field => setError(field, ''));
  }

  function animateStep() {
    const stage = $('#step-stage');
    cancelAnimationFrame(entranceFrame);
    stage.classList.remove('is-entering');
    if (reducedMotion.matches || lastInput === 'keyboard') return;
    // Pas d’attente artificielle : les commandes restent utilisables.
    stage.classList.add('is-entering');
    entranceFrame = requestAnimationFrame(() => {
      entranceFrame = requestAnimationFrame(() => stage.classList.remove('is-entering'));
    });
  }

  function showStep(step, focus = true) {
    state.step = step;
    state.furthest = Math.max(state.furthest, step);
    if (step === 1) renderDates();
    if (step === 2) renderTimes();
    $$('.booking-step').forEach((panel, index) => { panel.hidden = index !== step; });
    syncStepNavigation();
    $('#precedent').hidden = step === 0;
    $('#continuer').replaceChildren(doc.createTextNode(BUTTONS[step] + ' '));
    const arrow = appendText($('#continuer'), 'span', '→');
    arrow.setAttribute('aria-hidden', 'true');
    $('#annonce-etape').textContent = `Étape ${step + 1} sur 4. ${TITLES[step]}. Simulation uniquement.`;
    updateSummary();
    if (focus) {
      animateStep();
      $(`[data-panel="${step}"] h3`).focus({ preventScroll: true });
      const panel = $(`[data-panel="${step}"]`);
      const position = panel.getBoundingClientRect();
      if (position.top < 16 || position.top > window.innerHeight - 180) {
        panel.scrollIntoView({ block: 'start', behavior: reducedMotion.matches || lastInput === 'keyboard' ? 'instant' : 'smooth' });
      }
    }
  }

  function validSelection() {
    if (!SERVICES[state.service]) {
      showStep(0);
      setError('coiffure', 'Choisissez une catégorie pour continuer l’essai.');
      $('input[name="coiffure"]').focus();
      return false;
    }
    const validDate = buildDates().some(date => date.key === state.date && !date.closed && !date.elapsed);
    if (!validDate) {
      state.date = '';
      state.time = null;
      state.furthest = 1;
      showStep(1);
      setError('jour', 'Choisissez un jour proposé dans cet essai.');
      return false;
    }
    const validTime = slotsFor(state.date).some(slot => slot.minute === state.time && !slot.past);
    if (!validTime) {
      state.time = null;
      state.furthest = 2;
      showStep(2);
      setError('horaire', 'Choisissez une préférence d’horaire encore à venir.');
      return false;
    }
    return true;
  }

  function validPhone(value) {
    const compact = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(compact);
  }

  function finish() {
    const name = $('#prenom').value.trim();
    const phone = $('#telephone').value.trim();
    setError('prenom', name ? '' : 'Saisissez un prénom d’essai.');
    setError('telephone', validPhone(phone) ? '' : 'Saisissez un numéro français de 10 chiffres, ou commençant par +33.');
    if (!name || !validPhone(phone)) {
      $(!name ? '#prenom' : '#telephone').focus();
      return;
    }
    if (!validSelection()) return;
    state.completed = true;
    $('#booking-form').hidden = true;
    $('.step-nav').hidden = true;
    $('#resultat').hidden = false;
    $('#message-resultat').textContent = `${name}, votre sélection d’essai : ${SERVICES[state.service].toLocaleLowerCase('fr-FR')}, ${longDate.format(dateObject(state.date))}, à ${hourLabel(state.time)}. Cet horaire reste à confirmer avec le salon.`;
    $('#annonce-etape').textContent = 'Essai terminé. Aucun rendez-vous n’a été pris. Aucune information n’a été envoyée.';
    $('#titre-resultat').focus({ preventScroll: true });
    $('#resultat').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    // Les coordonnées ne servent plus une fois l’essai terminé.
    $('#telephone').value = '';
    $('#prenom').value = '';
  }

  function reset() {
    Object.assign(state, { step: 0, furthest: 0, service: '', date: '', time: null, completed: false });
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('.step-nav').hidden = false;
    $('#resultat').hidden = true;
    $('#message-resultat').textContent = '';
    clearErrors();
    showStep(0);
  }

  function initBooking() {
    $('#essai').hidden = false;
    showStep(0, false);
    $('#booking-form').addEventListener('change', (event) => {
      const input = event.target;
      if (input.name === 'coiffure') {
        state.service = input.value;
        setError('coiffure', '');
      }
      if (input.name === 'jour') {
        if (state.date !== input.value) {
          state.time = null;
          state.furthest = Math.min(state.furthest, 2);
        }
        state.date = input.value;
        setError('jour', '');
        syncStepNavigation();
      }
      if (input.name === 'horaire') {
        state.time = Number(input.value);
        setError('horaire', '');
      }
      updateSummary();
    });
    ['prenom', 'telephone'].forEach(field => $(`#${field}`).addEventListener('input', () => setError(field, '')));
    $('#booking-form').addEventListener('submit', (event) => {
      event.preventDefault();
      clearErrors();
      if (state.step === 0 && !SERVICES[state.service]) {
        setError('coiffure', 'Choisissez une catégorie pour continuer l’essai.');
        $('input[name="coiffure"]').focus();
        return;
      }
      if (state.step === 1 && !buildDates().some(day => day.key === state.date && !day.closed && !day.elapsed)) {
        setError('jour', 'Choisissez un jour proposé dans cet essai.');
        $('#jours input:not(:disabled)')?.focus();
        return;
      }
      if (state.step === 2 && !slotsFor(state.date).some(slot => slot.minute === state.time && !slot.past)) {
        setError('horaire', 'Choisissez une préférence d’horaire encore à venir.');
        $('#heures input:not(:disabled)')?.focus();
        return;
      }
      if (state.step < 3) showStep(state.step + 1);
      else finish();
    });
    $('#precedent').addEventListener('click', () => { clearErrors(); showStep(Math.max(0, state.step - 1)); });
    $$('.step-nav button').forEach(button => button.addEventListener('click', () => {
      if (state.completed) return;
      const destination = Number(button.dataset.step);
      if (destination <= state.furthest) { clearErrors(); showStep(destination); }
    }));
    $$('[data-service]').forEach(link => link.addEventListener('click', () => {
      if (state.completed) reset();
      state.service = link.dataset.service;
      $(`input[name="coiffure"][value="${state.service}"]`).checked = true;
      clearErrors();
      showStep(0, false);
      $('#etape-coiffure').focus({ preventScroll: true });
    }));
    $('#recommencer').addEventListener('click', reset);
  }

  function initMotion() {
    const reveals = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(element => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach(element => observer.observe(element));
  }

  function initMobileBar() {
    if (!('IntersectionObserver' in window)) return;
    const visibility = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target.id, entry.isIntersecting));
      $('.mobile-bar').classList.toggle('is-away', Array.from(visibility.values()).some(Boolean));
    });
    ['actions-principales', 'rendez-vous', 'sources'].forEach(id => observer.observe(doc.getElementById(id)));
  }

  try {
    initBooking();
    initMotion();
    initMobileBar();
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
    doc.addEventListener('keydown', event => {
      if (['Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        lastInput = 'keyboard';
        root.classList.add('keyboard-navigation');
      }
    });
    doc.addEventListener('pointerdown', () => {
      lastInput = 'pointer';
      root.classList.remove('keyboard-navigation');
    }, { passive: true });
  } catch (error) {
    // Un échec d’enrichissement ne doit jamais masquer le contenu ni le téléphone.
    root.classList.remove('js');
    $('#essai').hidden = true;
    const fallback = doc.createElement('p');
    fallback.className = 'no-script';
    fallback.textContent = 'Le parcours d’essai est indisponible. Pour prendre rendez-vous, appelez le 04 93 87 23 37.';
    $('#rendez-vous').append(fallback);
  }
})();
