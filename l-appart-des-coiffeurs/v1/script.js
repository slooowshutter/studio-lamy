(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  document.addEventListener('keydown', () => root.classList.add('keyboard-input'), true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-input'), true);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealElements.forEach(element => observer.observe(element));
  } else {
    revealElements.forEach(element => element.classList.add('is-revealed'));
  }

  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const heroActions = document.getElementById('actions-hero');
    const bookingSection = document.getElementById('rendez-vous');
    const footer = document.querySelector('.footer');
    let bookingVisible = false;
    let footerVisible = false;
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      mobileBar.hidden = !(heroActions.getBoundingClientRect().bottom < 0 && !bookingVisible && !footerVisible);
    });
    [heroActions, bookingSection, footer].forEach(element => barObserver.observe(element));
  }

  // Horaires de la fiche Planity fournie dans la recherche. Aucune disponibilité réelle.
  const openingHours = {
    0: null,
    1: null,
    2: [540, 1140],
    3: [540, 1140],
    4: [540, 1140],
    5: [540, 1140],
    6: [540, 960]
  };
  const duration = 30;
  const selection = { service: false, day: null, time: null };
  let currentStep = 0;
  let maxReached = 0;
  let transitionTimer;
  let transitionNumber = 0;
  const steps = [...document.querySelectorAll('.booking-step')];
  const stepButtons = [...document.querySelectorAll('[data-go]')];
  const announcement = document.getElementById('annonce-etape');
  const dayGrid = document.getElementById('choix-jours');
  const slotGrid = document.getElementById('choix-heures');
  const serviceInput = document.querySelector('input[name="prestation"]');
  const dayNext = document.getElementById('vers-heure');
  const timeNext = document.getElementById('vers-coordonnees');
  const form = document.getElementById('formulaire-essai');
  const firstName = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  const summary = document.querySelector('.booking-summary');
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const weekFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function parisNow() {
    const parts = Object.fromEntries(parisFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function dateForKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function keyForDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function timeLabel(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  }

  function slotsForDay(key) {
    const hours = openingHours[dateForKey(key).getUTCDay()];
    if (!hours) return [];
    const now = parisNow();
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let start = hours[0], index = 0; start + duration <= hours[1]; start += 30, index++) {
      const past = key < now.key || (key === now.key && start <= now.minutes);
      const occupied = (seed + index * 7) % 11 === 0 || (seed + index * 7) % 11 === 3;
      slots.push({ start, past, occupied, disabled: past || occupied });
    }
    return slots;
  }

  function makeSpan(className, text) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    return span;
  }

  function renderDays() {
    dayGrid.replaceChildren();
    const today = dateForKey(parisNow().key);
    for (let index = 0; index < 14; index++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + index);
      const key = keyForDate(date);
      const closed = !openingHours[date.getUTCDay()];
      const finished = !closed && !slotsForDay(key).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'date-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = key;
      input.disabled = closed || finished;
      input.checked = selection.day === key;
      input.setAttribute('aria-label', `${dayFormatter.format(date)}${closed ? ', fermé' : finished ? ', aucun créneau dans cet exemple' : ', simulation'}`);
      label.append(input, makeSpan('day-week', weekFormatter.format(date)), makeSpan('day-number', date.getUTCDate()), makeSpan('day-month', monthFormatter.format(date)), makeSpan('day-state', closed ? 'Fermé' : finished ? 'Terminé' : 'Exemple'));
      dayGrid.append(label);
    }
  }

  function renderSlots() {
    slotGrid.replaceChildren();
    if (!selection.day) return;
    const slots = slotsForDay(selection.day);
    const day = dayFormatter.format(dateForKey(selection.day));
    document.getElementById('legende-heures').textContent = `${day} · créneaux fictifs de 30 minutes. Les cases barrées sont indisponibles dans cet exemple.`;
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p');
      message.className = 'empty-slots';
      message.textContent = 'Aucun créneau proposé dans cet exemple. Revenez au choix du jour.';
      slotGrid.append(message);
    }
    slots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = String(slot.start);
      input.disabled = slot.disabled;
      input.checked = selection.time === slot.start && !slot.disabled;
      input.setAttribute('aria-label', `${timeLabel(slot.start)}, ${slot.past ? 'horaire passé' : slot.occupied ? 'indisponible dans cet exemple' : 'créneau fictif'}`);
      label.append(input, makeSpan('', timeLabel(slot.start)));
      if (slot.disabled) {
        const state = document.createElement('small');
        state.textContent = slot.past ? 'Passé' : 'Pris · exemple';
        label.append(state);
      }
      slotGrid.append(label);
    });
  }

  function prerequisites(step) {
    return step === 0 || (selection.service && (step === 1 || (selection.day && (step === 2 || selection.time !== null))));
  }

  function updateNavigation() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > maxReached || !prerequisites(index);
      if (index === currentStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function updateSummary() {
    document.getElementById('resume-prestation').textContent = selection.service ? 'Consultation préalable' : 'À choisir';
    document.getElementById('resume-jour').textContent = selection.day ? dayFormatter.format(dateForKey(selection.day)) : 'À choisir';
    document.getElementById('resume-heure').textContent = selection.time !== null ? timeLabel(selection.time) : 'À choisir';
    summary.classList.toggle('has-selection', selection.service);
    if (selection.day && selection.time !== null) {
      document.getElementById('recapitulatif-final').textContent = `Votre essai : consultation préalable, ${dayFormatter.format(dateForKey(selection.day))} à ${timeLabel(selection.time)}, pour 30 minutes. Aucun rendez-vous réel.`;
    }
    updateNavigation();
  }

  function showStep(next, event) {
    if (!prerequisites(next) || next === currentStep) return;
    clearTimeout(transitionTimer);
    const ticket = ++transitionNumber;
    const outgoing = steps[currentStep];
    currentStep = next;
    maxReached = Math.max(maxReached, next);
    updateNavigation();
    const instant = reducedMotion.matches || root.classList.contains('keyboard-input') || (event && event.detail === 0);
    const enter = () => {
      if (ticket !== transitionNumber) return;
      steps.forEach(step => { step.hidden = true; step.classList.remove('is-leaving', 'is-entering'); });
      const incoming = steps[next];
      incoming.hidden = false;
      if (!instant) incoming.classList.add('is-entering');
      const heading = incoming.querySelector('h3');
      heading.focus({ preventScroll: true });
      announcement.textContent = next === 4 ? 'Simulation terminée. Aucun rendez-vous pris.' : `Étape ${next + 1} sur 4 : ${stepButtons[next].textContent.trim().replace(/^0\d\s*/, '')}.`;
      const rect = heading.getBoundingClientRect();
      if (rect.top < 20 || rect.bottom > window.innerHeight - 30) heading.scrollIntoView({ block: 'center', behavior: 'instant' });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (ticket === transitionNumber) incoming.classList.remove('is-entering');
      }));
    };
    if (instant) enter();
    else {
      outgoing.classList.add('is-leaving');
      transitionTimer = setTimeout(enter, 80);
    }
  }

  serviceInput.addEventListener('change', () => {
    selection.service = serviceInput.checked;
    document.getElementById('etat-prestation').textContent = selection.service ? '30 minutes · sélectionnée pour l’essai' : '30 minutes · à sélectionner pour l’essai';
    document.getElementById('vers-jour').disabled = !selection.service;
    updateSummary();
  });
  document.getElementById('vers-jour').addEventListener('click', event => { renderDays(); showStep(1, event); });
  dayGrid.addEventListener('change', event => {
    if (event.target.name !== 'jour' || event.target.disabled) return;
    const changed = selection.day !== event.target.value;
    selection.day = event.target.value;
    if (changed) { selection.time = null; maxReached = Math.min(maxReached, 2); }
    dayNext.disabled = false;
    timeNext.disabled = selection.time === null;
    updateSummary();
  });
  dayNext.addEventListener('click', event => { renderSlots(); showStep(2, event); });
  slotGrid.addEventListener('change', event => {
    if (event.target.name !== 'heure' || event.target.disabled) return;
    selection.time = Number(event.target.value);
    timeNext.disabled = false;
    updateSummary();
  });
  timeNext.addEventListener('click', event => showStep(3, event));
  document.querySelectorAll('[data-back], [data-go]').forEach(button => button.addEventListener('click', event => {
    const next = Number(button.dataset.back ?? button.dataset.go);
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    showStep(next, event);
  }));

  function setError(input, message) {
    const target = document.getElementById(input === firstName ? 'erreur-prenom' : 'erreur-telephone');
    target.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  [firstName, phone].forEach(input => input.addEventListener('input', () => setError(input, '')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const normalizedPhone = phone.value.replace(/[\s().-]/g, '').replace(/^\+330/, '+33').replace(/^00330/, '0033');
    const nameValid = firstName.value.trim().length >= 2;
    const phoneValid = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(normalizedPhone);
    setError(firstName, nameValid ? '' : 'Saisissez un prénom de deux caractères au moins.');
    setError(phone, phoneValid ? '' : 'Saisissez un numéro portable français au format indiqué.');
    if (!nameValid || !phoneValid) {
      announcement.textContent = 'Vérifiez les champs indiqués pour terminer la simulation.';
      (nameValid ? phone : firstName).focus();
      return;
    }
    const validSlot = selection.day && slotsForDay(selection.day).some(slot => slot.start === selection.time && !slot.disabled);
    if (!validSlot) {
      selection.time = null;
      timeNext.disabled = true;
      updateSummary();
      renderSlots();
      showStep(2, event);
      announcement.textContent = 'Le créneau de cet essai est passé. Choisissez une autre heure ou un autre jour.';
      return;
    }
    document.getElementById('resume-reussite').textContent = `Vous avez essayé le parcours pour une consultation le ${dayFormatter.format(dateForKey(selection.day))} à ${timeLabel(selection.time)}, pour 30 minutes.`;
    showStep(4, event);
  });

  document.getElementById('recommencer').addEventListener('click', event => {
    selection.service = false;
    selection.day = null;
    selection.time = null;
    maxReached = 0;
    form.reset();
    serviceInput.checked = false;
    document.getElementById('etat-prestation').textContent = '30 minutes · à sélectionner pour l’essai';
    [firstName, phone].forEach(input => setError(input, ''));
    document.getElementById('vers-jour').disabled = true;
    dayNext.disabled = true;
    timeNext.disabled = true;
    dayGrid.replaceChildren();
    slotGrid.replaceChildren();
    document.getElementById('recapitulatif-final').textContent = '';
    updateSummary();
    showStep(0, event);
  });

  updateSummary();
  document.getElementById('simulation').hidden = false;
})();
