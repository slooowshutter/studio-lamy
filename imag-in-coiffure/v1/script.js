/* Imag'in Coiffure — aperçu local, sans envoi et sans stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  // Le HTML reste entièrement lisible si ce script ne s’exécute pas.
  if (!reduceMotion.matches) {
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') root.classList.add('using-keyboard');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('using-keyboard'), { passive: true });

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const reveals = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.hasAttribute('data-reveal') ? 'revealed' : 'rule-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    $$('.menu-row').forEach((row, index) => { row.style.transitionDelay = `${index * 60}ms`; });
    $$('[data-reveal], .feature, .services, .visit').forEach((element) => reveals.observe(element));
  } else {
    $$('[data-reveal]').forEach((element) => element.classList.add('revealed'));
    $$('.feature, .services, .visit').forEach((element) => element.classList.add('rule-visible'));
  }

  const services = {
    lissage: { name: 'Lissage Enzymotherapy', duration: 210 },
    brushing: { name: 'Shampoing brushing', duration: 45 },
    coupe: { name: 'Shampoing coupe brushing', duration: 45 },
    homme: { name: 'Shampooing coupe homme coiffage', duration: 30 }
  };
  // Horaires Planity : dimanche/lundi fermés, mardi–vendredi 9–19, samedi 9–18.
  const hours = [null, null, [540, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1080]];
  const state = { service: 'lissage', day: '', time: null, step: 0, furthest: 0 };
  const panels = $$('.booking-panel');
  const stepButtons = $$('.booking-steps button');
  let transitionToken = 0;
  let transitionTimer;
  let switching = false;

  function parisNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const get = (type) => Number(parts.find((part) => part.type === type).value);
    return { year: get('year'), month: get('month'), day: get('day'), minutes: get('hour') * 60 + get('minute') };
  }
  function keyFor(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`; }
  function dateFor(key) { return new Date(`${key}T12:00:00Z`); }
  function todayKey(now = parisNow()) { return `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`; }
  function dateLabel(key, short = false) {
    if (!key) return 'À choisir';
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long' }).format(dateFor(key));
  }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`; }
  function durationLabel(minutes) { return minutes < 60 ? `${minutes}\u00a0min` : `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${minutes % 60}` : ''}`; }
  function slotsFor(key, duration, now = parisNow()) {
    if (!key || key < todayKey(now)) return [];
    const date = dateFor(key);
    const range = hours[date.getUTCDay()];
    if (!range) return [];
    const slots = [];
    for (let start = range[0]; start + duration <= range[1]; start += 30) {
      const past = key === todayKey(now) && start <= now.minutes;
      const sampleTaken = (Math.floor(start / 30) + date.getUTCDate()) % 9 === 2;
      slots.push({ start, disabled: past || sampleTaken, past });
    }
    return slots;
  }
  function duration() { return services[state.service].duration; }
  function announce(message) { $('#booking-announcement').textContent = message; }
  function make(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  }
  function syncSummary() {
    const service = services[state.service];
    $('#summary-service').textContent = service.name;
    $('#summary-duration').textContent = durationLabel(service.duration);
    $('#summary-day').textContent = dateLabel(state.day, true);
    $('#summary-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $$('.summary-ruler i').forEach((segment, index) => {
      const fraction = Math.max(.035, Math.min(1, (service.duration - index * 30) / 30));
      segment.style.transform = `scaleX(${fraction})`;
      segment.style.opacity = fraction > .035 ? '1' : '.18';
    });
    const recap = state.day && state.time !== null ? `${service.name} · ${dateLabel(state.day)} à ${timeLabel(state.time)} · ${durationLabel(service.duration)}. Simulation sans envoi.` : '';
    $('#confirmation-recap').textContent = recap;
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.furthest || state.step === 4;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const now = parisNow();
    const base = new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
    const container = $('#day-choices');
    container.replaceChildren(make('legend', 'visually-hidden', 'Choisir un jour d’exemple'));
    for (let index = 0; index < 14; index++) {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + index);
      const key = keyFor(date);
      const closed = !hours[date.getUTCDay()];
      const ended = !closed && !slotsFor(key, duration(), now).some((slot) => !slot.disabled);
      const label = make('label', 'date-choice');
      const input = make('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || ended; input.checked = state.day === key;
      input.setAttribute('aria-describedby', 'day-error');
      input.setAttribute('aria-label', `${dateLabel(key)}${closed ? ', fermé' : ended ? ', aucun créneau dans cet exemple' : ', date d’exemple'}`);
      const face = make('span');
      face.append(make('span', '', new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date)), make('b', '', String(date.getUTCDate())), make('small', '', closed ? 'Fermé' : ended ? 'Terminé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date)));
      label.append(input, face); container.append(label);
    }
  }
  function renderSlots() {
    const container = $('#slot-choices');
    container.replaceChildren(make('legend', 'visually-hidden', 'Choisir un horaire d’exemple'));
    $('#slot-context').textContent = `${dateLabel(state.day)} · Durée à prévoir : ${durationLabel(duration())}.`;
    const slots = slotsFor(state.day, duration());
    if (!slots.some((slot) => !slot.disabled)) {
      container.append(make('p', 'slot-empty', 'Aucun créneau dans cet exemple pour ce jour. Revenez au choix du jour.'));
    }
    slots.forEach((slot) => {
      const label = make('label', 'slot-choice');
      const input = make('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.start);
      input.disabled = slot.disabled; input.checked = state.time === slot.start;
      input.setAttribute('aria-describedby', 'slot-error');
      input.setAttribute('aria-label', `${timeLabel(slot.start)}${slot.disabled ? slot.past ? ', horaire passé' : ', indisponible dans cet exemple' : ', créneau d’exemple'}`);
      label.append(input, make('span', '', timeLabel(slot.start))); container.append(label);
    });
  }
  function showStep(next, focus = true) {
    clearTimeout(transitionTimer);
    const token = ++transitionToken;
    const previous = panels.find((panel) => !panel.hidden);
    const destination = panels[next];
    const instant = reduceMotion.matches || root.classList.contains('using-keyboard') || previous === destination;
    switching = false;
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    state.step = next;
    syncSummary();
    const reveal = () => {
      if (token !== transitionToken) return;
      panels.forEach((panel) => { panel.hidden = panel !== destination; panel.classList.remove('is-entering', 'is-leaving'); });
      if (!instant) destination.classList.add('is-entering');
      destination.hidden = false;
      if (focus) $(`#step-title-${next}`).focus();
      announce(next === 4 ? 'Simulation terminée. Aucun rendez-vous n’est pris.' : `Étape ${next + 1} sur 4 : ${$(`#step-title-${next}`).textContent}`);
      requestAnimationFrame(() => requestAnimationFrame(() => destination.classList.remove('is-entering')));
      switching = false;
    };
    if (!instant && previous) {
      switching = true;
      previous.classList.add('is-leaving');
      transitionTimer = setTimeout(reveal, 120);
    } else reveal();
  }
  function clearError(id) { $(id).textContent = ''; }
  function failChoice(id, message, selector) {
    $(id).textContent = message; announce(message);
    const input = $(selector); if (input) input.focus({ preventScroll: true });
  }
  function selectService(key) {
    if (!services[key]) return;
    state.service = key; state.day = ''; state.time = null; state.furthest = 0;
    $$('input[name="prestation"]').forEach((input) => { input.checked = input.value === key; });
    clearError('#day-error'); clearError('#slot-error'); syncSummary();
  }

  $('#booking-form').addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      state.day = input.value; state.time = null; state.furthest = 1;
      clearError('#day-error'); clearError('#slot-error'); syncSummary();
    }
    if (input.name === 'heure') { state.time = Number(input.value); clearError('#slot-error'); syncSummary(); }
  });
  $$('[data-next]').forEach((button) => button.addEventListener('click', () => {
    if (switching) return;
    const next = Number(button.dataset.next);
    if (next === 2 && !state.day) { failChoice('#day-error', 'Choisissez un jour pour continuer.', 'input[name="jour"]:not(:disabled)'); return; }
    if (next === 3 && state.time === null) { failChoice('#slot-error', 'Choisissez une heure pour continuer.', 'input[name="heure"]:not(:disabled)'); return; }
    if (next === 3 && !slotsFor(state.day, duration()).some((slot) => slot.start === state.time && !slot.disabled)) {
      state.time = null; renderSlots(); syncSummary(); failChoice('#slot-error', 'Cet horaire est passé. Choisissez un autre créneau d’exemple.', 'input[name="heure"]:not(:disabled)'); return;
    }
    state.furthest = Math.max(state.furthest, next); showStep(next);
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.step); if (next <= state.furthest && state.step !== 4) showStep(next);
  }));
  $$('[data-service]').forEach((link) => link.addEventListener('click', () => { selectService(link.dataset.service); showStep(0); }));

  function validPhone(value) {
    const digits = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0|\+33)[67]\d{8}$/.test(digits);
  }
  function validateField(input, condition, errorId, message) {
    input.setAttribute('aria-invalid', condition ? 'false' : 'true');
    $(errorId).textContent = condition ? '' : message;
    return condition;
  }
  ['prenom', 'telephone'].forEach((id) => $(`#${id}`).addEventListener('input', () => {
    $(`#${id}`).removeAttribute('aria-invalid'); clearError(`#${id}-error`);
  }));
  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (switching || state.step !== 3) return;
    if (!state.day || state.time === null || !slotsFor(state.day, duration()).some((slot) => slot.start === state.time && !slot.disabled)) {
      state.time = null; state.furthest = 2; showStep(2); failChoice('#slot-error', 'Le créneau d’exemple doit être choisi à nouveau.', 'input[name="heure"]:not(:disabled)'); return;
    }
    const first = $('#prenom'); const phone = $('#telephone');
    const firstValid = validateField(first, /\p{L}/u.test(first.value.trim()) && first.value.trim().length <= 60, '#prenom-error', 'Indiquez un prénom pour l’essai.');
    const phoneValid = validateField(phone, validPhone(phone.value), '#telephone-error', 'Indiquez un mobile français commençant par 06, 07, +33 6 ou +33 7.');
    if (!firstValid || !phoneValid) {
      (firstValid ? phone : first).focus({ preventScroll: true }); announce('Vérifiez les coordonnées de l’essai indiquées ci-dessous.'); return;
    }
    $('#success-recap').textContent = `${first.value.trim()}, voici votre exemple : ${services[state.service].name}, ${dateLabel(state.day)} à ${timeLabel(state.time)}, pour ${durationLabel(duration())}.`;
    showStep(4);
  });
  $('#restart-booking').addEventListener('click', () => {
    $('#booking-form').reset();
    ['prenom', 'telephone'].forEach((id) => { $(`#${id}`).removeAttribute('aria-invalid'); clearError(`#${id}-error`); });
    selectService('lissage'); showStep(0);
  });
  $('#booking-app').hidden = false;
  syncSummary();
})();
