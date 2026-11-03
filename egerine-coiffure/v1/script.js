/* Egerine — aperçu local. Aucun appel réseau, aucun stockage de coordonnées. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => Array.from(scope.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const EASE = 'cubic-bezier(.23,1,.32,1)';
  const SERVICES = {
    rasage: { name: 'Rasage signature', detail: 'Serviette chaude et massage pour le rasage signature.' },
    homme: { name: 'Coupe homme', detail: 'Shampoing, coupe et coiffage.' },
    femme: { name: 'Coupe femme', detail: 'Shampoing, coupe et brushing.' }
  };
  // Source : Planity, reprise dans research/brand-egerine-coiffure.md.
  // Minutes depuis minuit. La durée des soins est inconnue : aucune n’est inventée.
  const HOURS = { 0: null, 1: null, 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [570, 1110] };
  const state = { service: 'rasage', day: '', time: null, step: 0, finished: false };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  function parisNow(now = new Date()) {
    const values = {};
    parisFormat.formatToParts(now).forEach((part) => { values[part.type] = part.value; });
    const key = `${values.year}-${values.month}-${values.day}`;
    return { key, date: new Date(`${key}T12:00:00Z`), minute: (+values.hour % 24) * 60 + +values.minute };
  }
  function asDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function hourFr(minute) {
    const hours = Math.floor(minute / 60);
    const rest = minute % 60;
    return `${hours}${NB}h${rest ? NB + String(rest).padStart(2, '0') : ''}`;
  }
  function daysAhead(now = new Date()) {
    const current = parisNow(now);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(current.date.getTime() + index * 86400000);
      const key = dateKey(date);
      const hours = HOURS[date.getUTCDay()];
      const passed = key === current.key && hours && current.minute >= hours[1];
      return { date, key, closed: !hours, passed: !!passed, disabled: !hours || !!passed };
    });
  }
  function slotsFor(key, now = new Date()) {
    const date = asDate(key);
    if (Number.isNaN(date.getTime())) return [];
    const hours = HOURS[date.getUTCDay()];
    const current = parisNow(now);
    if (!hours || key < current.key) return [];
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    for (let minute = hours[0]; minute < hours[1]; minute += 30) {
      const passed = key === current.key && minute <= current.minute;
      const exampleUnavailable = (seed + minute / 30) % 5 === 0;
      slots.push({ minute, disabled: passed || exampleUnavailable, passed });
    }
    return slots;
  }
  function validPhone(value) {
    const number = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33').replace(/^\+33(?:0)?/, '0');
    return /^0[1-9]\d{8}$/.test(number);
  }

  document.addEventListener('keydown', () => root.classList.add('clavier'), true);
  document.addEventListener('pointerdown', () => root.classList.remove('clavier'), true);

  /* Un seul volet ouvert. Les contenus restent entièrement lisibles sans JS. */
  const panels = $$('.panel');
  let scrollTimer;
  function isQuiet() { return reduced.matches || root.classList.contains('clavier'); }
  function revealNow(panel) {
    if (isQuiet()) $$('[data-reveal]', panel).forEach((el) => el.classList.add('is-revealed'));
  }
  function openPanel(id, { navigate = false, focus = false } = {}) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('panel')) return;
    panels.forEach((panel) => {
      const open = panel === target;
      panel.classList.toggle('is-open', open);
      $('.panel__trigger', panel).setAttribute('aria-expanded', String(open));
      $('.panel__body', panel).inert = !open;
    });
    revealNow(target);
    if (id === 'rendez-vous') refreshDates();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const trigger = $('.panel__trigger', target);
      const bounds = trigger.getBoundingClientRect();
      if (navigate || bounds.top < 0 || bounds.bottom > window.innerHeight - 90) {
        target.scrollIntoView({ block: 'start', behavior: isQuiet() ? 'auto' : 'smooth' });
      }
      if (focus) trigger.focus({ preventScroll: true });
    }, isQuiet() ? 0 : 310);
  }
  panels.forEach((panel, index) => {
    const trigger = $('.panel__trigger', panel);
    trigger.disabled = false;
    trigger.setAttribute('aria-expanded', String(index === 0));
    $('.panel__body', panel).inert = index !== 0;
    trigger.addEventListener('click', () => {
      if (panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        $('.panel__body', panel).inert = true;
      } else openPanel(panel.id);
    });
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-open], a[data-service]');
    if (!link) return;
    event.preventDefault();
    let id = link.dataset.open;
    if (link.dataset.service) {
      id = 'rendez-vous';
      if (state.finished) reset();
      state.service = link.dataset.service;
      const radio = $(`input[name="soin"][value="${state.service}"]`);
      radio.checked = true;
      updateSummary();
      showStep(0, false);
    }
    openPanel(id, { navigate: true, focus: true });
    try { history.replaceState(null, '', `#${id}`); } catch (_) { /* Lecture locale. */ }
  });
  window.addEventListener('hashchange', () => openPanel(location.hash.slice(1), { navigate: true, focus: true }));

  /* Les deux composantes du rasage sont découvertes dans un seul objet. */
  const ritualButton = $('#deplier');
  ritualButton.hidden = false;
  ritualButton.addEventListener('click', () => {
    const unfolded = $('.ritual').classList.toggle('is-unfolded');
    ritualButton.setAttribute('aria-pressed', String(unfolded));
    ritualButton.innerHTML = unfolded ? 'Replier le geste <span aria-hidden="true">↙</span>' : 'Déplier le geste <span aria-hidden="true">↗</span>';
  });

  /* Parcours d’essai — état local et étapes modifiables. */
  const form = $('#formulaire');
  const stages = $$('.booking-step');
  const stepButtons = $$('[data-step]');
  let stepAnimation;
  function announce(text) { $('#annonce').textContent = text; }
  function updateSummary() {
    $('#selection-soin').textContent = SERVICES[state.service].name;
    $('#selection-jour').textContent = state.day ? longDate.format(asDate(state.day)) : 'À choisir';
    $('#selection-heure').textContent = state.time === null ? 'À choisir' : hourFr(state.time);
    $('#selection-detail').textContent = SERVICES[state.service].detail;
    stepButtons.forEach((button, index) => {
      button.disabled = state.finished || (index === 1 && !state.service) || (index === 2 && !state.day) || (index === 3 && state.time === null);
      if (index === state.step && !state.finished) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    state.step = index;
    if (stepAnimation) stepAnimation.cancel();
    stages.forEach((stage, position) => { stage.hidden = position !== index; });
    const stage = stages[index];
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    updateSummary();
    if (!isQuiet()) {
      stepAnimation = stage.animate([{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: EASE });
    }
    if (focus) {
      const heading = $('h3', stage);
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      if (bounds.top < 15 || bounds.bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'start', behavior: isQuiet() ? 'auto' : 'smooth' });
    }
    announce(`Étape ${index + 1} sur 4${NB}: ${$('h3', stage).textContent}`);
  }
  function radioChoice({ name, value, disabled = false, checked = false, label, description, face }) {
    const wrap = document.createElement('label');
    wrap.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', label);
    input.setAttribute('aria-describedby', description);
    const visual = document.createElement('span');
    visual.className = 'choice__face'; visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = face;
    wrap.append(input, visual);
    return wrap;
  }
  function renderDays() {
    const container = $('#jours');
    container.replaceChildren();
    daysAhead().forEach((day) => {
      const status = day.closed ? 'Fermé' : day.passed ? 'Passé' : shortMonth.format(day.date);
      const choice = radioChoice({ name: 'jour', value: day.key, disabled: day.disabled, checked: state.day === day.key,
        label: `${longDate.format(day.date)}${day.closed ? ', fermé' : day.passed ? ', passé' : ', simulation'}`,
        description: 'erreur-jour', face: `<span>${shortDay.format(day.date)}</span><span class="choice__number">${day.date.getUTCDate()}</span><span class="choice__state">${status}</span>` });
      $('input', choice).addEventListener('change', () => {
        state.day = day.key; state.time = null;
        $('#erreur-jour').textContent = ''; $('#erreur-heure').textContent = '';
        updateSummary();
      });
      container.append(choice);
    });
  }
  function renderSlots() {
    const container = $('#heures');
    container.replaceChildren();
    const slots = slotsFor(state.day);
    slots.forEach((slot) => {
      const status = slot.passed ? 'Passé' : slot.disabled ? 'Indisponible' : 'Essai';
      const choice = radioChoice({ name: 'heure', value: String(slot.minute), disabled: slot.disabled, checked: state.time === slot.minute,
        label: `${hourFr(slot.minute)}, ${status.toLowerCase()}, simulation`, description: 'erreur-heure',
        face: `<span>${hourFr(slot.minute)}</span><span class="choice__state">${status}</span>` });
      $('input', choice).addEventListener('change', () => {
        state.time = slot.minute; $('#erreur-heure').textContent = ''; updateSummary();
      });
      container.append(choice);
    });
    if (!slots.some((slot) => !slot.disabled)) {
      const note = document.createElement('p');
      note.className = 'form-note'; note.textContent = 'Plus d’heure à essayer ce jour-là. Revenez au choix du jour.';
      container.append(note);
    }
  }
  function refreshDates() {
    const validDays = daysAhead();
    if (state.day && !validDays.some((day) => day.key === state.day && !day.disabled)) {
      state.day = ''; state.time = null;
      if (!state.finished) showStep(1, false);
    }
    if (state.time !== null && !slotsFor(state.day).some((slot) => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      if (!state.finished) showStep(2, false);
    }
    if (state.step === 1) renderDays();
    if (state.step === 2) renderSlots();
    updateSummary();
  }
  function advance(next) {
    if (next >= 2 && !daysAhead().some((day) => day.key === state.day && !day.disabled)) {
      state.day = ''; state.time = null;
      showStep(1);
      $('#erreur-jour').textContent = 'Choisissez un jour ouvert pour continuer.';
      $('input:not(:disabled)', $('#jours'))?.focus();
      return;
    }
    if (next >= 3 && !slotsFor(state.day).some((slot) => slot.minute === state.time && !slot.disabled)) {
      state.time = null; showStep(2);
      $('#erreur-heure').textContent = 'Choisissez une heure pour continuer. Une heure passée doit être remplacée.';
      $('input:not(:disabled)', $('#heures'))?.focus();
      return;
    }
    showStep(next);
  }
  $$('input[name="soin"]').forEach((radio) => radio.addEventListener('change', () => { state.service = radio.value; updateSummary(); }));
  $$('[data-next]').forEach((button) => button.addEventListener('click', () => advance(+button.dataset.next)));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(+button.dataset.back)));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const next = +button.dataset.step;
    if (next <= state.step) showStep(next);
    else advance(next);
  }));
  function clearFieldError(id) {
    document.getElementById(id).removeAttribute('aria-invalid');
    document.getElementById(`erreur-${id}`).textContent = '';
  }
  ['prenom', 'telephone'].forEach((id) => document.getElementById(id).addEventListener('input', () => clearFieldError(id)));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < 3) { advance(state.step + 1); return; }
    // On contrôle encore les heures au moment de terminer, même si la page est restée ouverte.
    if (!daysAhead().some((day) => day.key === state.day && !day.disabled) || !slotsFor(state.day).some((slot) => slot.minute === state.time && !slot.disabled)) {
      advance(3); return;
    }
    let invalid = null;
    const name = $('#prenom').value.trim();
    const phone = $('#telephone').value.trim();
    clearFieldError('prenom'); clearFieldError('telephone');
    if (name.length < 2 || !/\p{L}/u.test(name)) {
      $('#erreur-prenom').textContent = 'Indiquez un prénom contenant au moins deux caractères.';
      $('#prenom').setAttribute('aria-invalid', 'true'); invalid = $('#prenom');
    }
    if (!validPhone(phone)) {
      $('#erreur-telephone').textContent = 'Indiquez un numéro français valide, par exemple en commençant par 06 ou +33.';
      $('#telephone').setAttribute('aria-invalid', 'true'); invalid ||= $('#telephone');
    }
    if (invalid) { invalid.focus(); return; }
    state.finished = true;
    form.hidden = true;
    $('#resultat').hidden = false;
    $('#recapitulatif').textContent = `${name}, votre choix pour cet essai${NB}: ${SERVICES[state.service].name.toLowerCase()}, ${longDate.format(asDate(state.day))} à ${hourFr(state.time)}. Tarifs et durée à confirmer avec Egerine.`;
    updateSummary();
    if (!isQuiet()) $('#resultat').animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: EASE });
    $('#resultat h3').focus({ preventScroll: true });
    $('#resultat').scrollIntoView({ block: 'nearest', behavior: isQuiet() ? 'auto' : 'smooth' });
    announce('Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.');
    // Les coordonnées ne sont ni conservées ni réutilisées.
    $('#prenom').value = ''; $('#telephone').value = '';
  });
  function reset() {
    state.service = 'rasage'; state.day = ''; state.time = null; state.finished = false;
    form.reset(); form.hidden = false; $('#resultat').hidden = true; $('#recapitulatif').textContent = '';
    ['prenom', 'telephone'].forEach(clearFieldError);
    $('#erreur-jour').textContent = ''; $('#erreur-heure').textContent = '';
    showStep(0);
  }
  $('#recommencer').addEventListener('click', reset);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('#rendez-vous').classList.contains('is-open') && !state.finished) refreshDates();
  });

  $('#sans-javascript').hidden = true;
  $('#simulation').hidden = false;
  updateSummary();
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.closest('.panel').classList.contains('is-open')) {
          entry.target.classList.add('is-revealed'); observer.unobserve(entry.target);
        }
      });
    }, { threshold: .15 });
    $$('[data-reveal]').forEach((element) => observer.observe(element));
  } else $$('[data-reveal]').forEach((element) => element.classList.add('is-revealed'));
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      if (stepAnimation) stepAnimation.cancel();
      $$('[data-reveal]').forEach((element) => element.classList.add('is-revealed'));
    }
  });
  if (location.hash) openPanel(location.hash.slice(1), { navigate: true });
})();
