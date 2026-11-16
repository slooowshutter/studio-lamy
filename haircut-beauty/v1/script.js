(() => {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const root = document.documentElement;
  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nb = '\u00a0';
  const services = {
    soin: { name: 'Soin du visage complet profond', duration: 30 },
    vapeur: { name: 'Vapeur et masque', duration: 30 },
    coupe: { name: 'Shampoing, coupe d’entretien et coiffage', duration: 30 },
    barbe: { name: 'Contour et taille traditionnelle avec serviette chaude', duration: 30 }
  };
  // Plages Planity et Cylex, reprises de la recherche fournie du 16/11/2026.
  // Minutes depuis minuit, dimanche = 0. Aucune plage fictive.
  const openingHours = {
    0: [], 1: [[540, 1200]], 2: [[540, 1200]], 3: [[540, 1200]],
    4: [[540, 1200]], 5: [[540, 720], [840, 1260]], 6: [[540, 1200]]
  };
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function parisNow(value = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(value).map(part => [part.type, part.value]));
    return { year: +parts.year, month: +parts.month, day: +parts.day, minutes: +parts.hour * 60 + +parts.minute };
  }
  const dateKey = date => date.toISOString().slice(0, 10);
  const timeLabel = minutes => `${Math.floor(minutes / 60)}${nb}h${minutes % 60 ? nb + String(minutes % 60).padStart(2, '0') : ''}`;
  const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);

  function makeDays(now = parisNow()) {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(Date.UTC(now.year, now.month - 1, now.day + index, 12));
      return { date, key: dateKey(date), closed: openingHours[date.getUTCDay()].length === 0 };
    });
  }

  function makeSlots(day, duration, now = parisNow()) {
    const today = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
    const isPast = day.key < today;
    const slots = [];
    for (const [start, end] of openingHours[day.date.getUTCDay()]) {
      for (let minute = start; minute + duration <= end; minute += 30) {
        const passed = isPast || (day.key === today && minute <= now.minutes);
        // L’occupation est fictive et déterministe, jamais une disponibilité réelle.
        const occupied = (day.date.getUTCDate() * 7 + day.date.getUTCMonth() + minute / 30) % 6 === 0;
        slots.push({ minute, disabled: passed || occupied, reason: passed ? 'passé' : occupied ? 'déjà pris, exemple' : '' });
      }
    }
    return slots;
  }

  // La manchette conserve son nom accessible ; seule la couche visuelle est découpée.
  const masthead = $('.masthead');
  const shopName = masthead.textContent.trim();
  masthead.setAttribute('aria-label', shopName);
  masthead.textContent = '';
  let letterIndex = 0;
  shopName.split(' ').forEach((word, wordIndex) => {
    if (wordIndex) masthead.append(document.createTextNode(' '));
    const group = document.createElement('span');
    group.className = 'word';
    group.setAttribute('aria-hidden', 'true');
    if (word === '&') group.classList.add('masthead-amp');
    for (const character of word) {
      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = character;
      letter.style.setProperty('--letter', letterIndex++);
      group.append(letter);
    }
    masthead.append(group);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
  } else {
    $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  }
  root.classList.add('js');

  const state = { service: '', day: '', time: null, step: 0, completed: false };
  const form = $('#booking-form');
  const panels = $$('.booking-panel');
  const stepButtons = $$('[data-step]');
  let days = makeDays();
  let activeAnimation = null;
  const status = $('#booking-status');
  const chosenDay = () => days.find(day => day.key === state.day);
  const currentService = () => services[state.service];

  function announce(message) { status.textContent = message; }

  function syncSummary() {
    $('#recap-service').textContent = currentService() ? `${currentService().name} · 30${nb}min` : 'À choisir';
    $('#recap-day').textContent = chosenDay() ? capitalize(longDate.format(chosenDay().date)) : 'À choisir';
    $('#recap-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || (index === 1 && !state.service) || (index === 2 && !chosenDay()) || (index === 3 && state.time === null);
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function refreshDates() {
    days = makeDays();
    if (state.day && !chosenDay()) {
      state.day = '';
      state.time = null;
    }
    if (state.time !== null && !isSelectedTimeValid()) state.time = null;
  }

  function showStep(index, keyboard = false) {
    refreshDates();
    if (index > 0 && !currentService()) index = 0;
    else if (index > 1 && !chosenDay()) index = 1;
    else if (index > 2 && !isSelectedTimeValid()) index = 2;
    const backwards = index < state.step;
    state.step = index;
    if (activeAnimation) {
      cancelAnimationFrame(activeAnimation);
      activeAnimation = null;
    }
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('is-entering', 'is-backward');
    });
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    syncSummary();
    const panel = panels[index];
    if (!reducedMotion.matches && !keyboard) {
      panel.classList.add('is-entering');
      if (backwards) panel.classList.add('is-backward');
      activeAnimation = requestAnimationFrame(() => {
        activeAnimation = requestAnimationFrame(() => {
          panel.classList.remove('is-entering', 'is-backward');
          activeAnimation = null;
        });
      });
    }
    const heading = $('h3', panel);
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce(`Étape ${index + 1} sur 4. ${heading.textContent}`);
  }

  function createChoice(group, value, labelText, disabled, selected, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-cell';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.id = id;
    input.value = value;
    input.disabled = disabled;
    input.checked = selected;
    const label = document.createElement('label');
    label.htmlFor = id;
    if (typeof labelText === 'string') label.textContent = labelText;
    else label.append(...labelText);
    wrapper.append(input, label);
    return wrapper;
  }

  function renderDays() {
    const target = $('#day-grid');
    target.replaceChildren();
    days.forEach((day, index) => {
      const weekday = document.createElement('span');
      weekday.textContent = capitalize(shortWeekday.format(day.date));
      const number = document.createElement('strong');
      number.textContent = day.date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = shortMonth.format(day.date);
      const note = document.createElement('small');
      note.textContent = day.closed ? 'Fermé' : index === 0 ? 'Aujourd’hui' : '';
      const cell = createChoice('jour', day.key, [weekday, number, month, note], day.closed, state.day === day.key, `jour-${index}`);
      $('input', cell).setAttribute('aria-label', `${longDate.format(day.date)}${day.closed ? ', fermé' : ''}`);
      target.append(cell);
    });
  }

  function renderSlots() {
    const day = chosenDay();
    const target = $('#slot-grid');
    target.replaceChildren();
    if (!day || !currentService()) return;
    $('#slot-day').textContent = capitalize(longDate.format(day.date));
    const slots = makeSlots(day, currentService().duration);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    slots.forEach((slot, index) => {
      const cell = createChoice('heure', String(slot.minute), timeLabel(slot.minute), slot.disabled, state.time === slot.minute && !slot.disabled, `heure-${index}`);
      $('input', cell).setAttribute('aria-describedby', 'slot-help');
      $('input', cell).setAttribute('aria-label', `${timeLabel(slot.minute)}${slot.disabled ? ', ' + slot.reason : ', créneau fictif'}`);
      target.append(cell);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p');
      message.className = 'slot-empty';
      message.textContent = 'Aucun créneau pour ce jour dans la simulation. Revenez à l’étape « Jour » pour choisir une autre date.';
      target.append(message);
    }
  }

  function setService(value) {
    if (!services[value]) return;
    if (value !== state.service) {
      state.day = '';
      state.time = null;
    }
    state.service = value;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    $('#prestation-error').textContent = '';
    syncSummary();
  }

  function fieldError(id, message, focus = true) {
    $(`#${id}-error`).textContent = message;
    const input = $(`#${id}`);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (focus) input.focus();
    }
    announce(message);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') setService(input.value);
    if (input.name === 'jour') {
      state.day = input.value;
      state.time = null;
      $('#jour-error').textContent = '';
      syncSummary();
      announce(`Jour choisi : ${longDate.format(chosenDay().date)}.`);
    }
    if (input.name === 'heure') {
      state.time = +input.value;
      $('#heure-error').textContent = '';
      syncSummary();
      announce(`Heure choisie : ${timeLabel(state.time)}. Créneau fictif.`);
    }
  });

  function isSelectedTimeValid() {
    const day = chosenDay();
    return Boolean(day && currentService() && makeSlots(day, currentService().duration).some(slot => slot.minute === state.time && !slot.disabled));
  }

  $$('[data-next]').forEach(button => button.addEventListener('click', event => {
    const index = +button.dataset.next;
    refreshDates();
    if (index === 1 && !currentService()) {
      fieldError('prestation', 'Choisissez une prestation pour continuer.');
      $('input[name="prestation"]').focus();
      return;
    }
    if (index >= 2 && !chosenDay()) {
      if (state.step !== 1) showStep(1, event.detail === 0);
      else renderDays();
      fieldError('jour', 'Choisissez un jour pour continuer.');
      $('input[name="jour"]:not(:disabled)').focus();
      return;
    }
    if (index === 3 && !isSelectedTimeValid()) {
      state.time = null;
      renderSlots();
      syncSummary();
      fieldError('heure', 'Choisissez une heure disponible dans la simulation.');
      $('input[name="heure"]:not(:disabled)')?.focus();
      return;
    }
    showStep(index, event.detail === 0);
  }));

  stepButtons.forEach(button => button.addEventListener('click', event => {
    if (!button.disabled) showStep(+button.dataset.step, event.detail === 0);
  }));

  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    if (state.completed) restart(false);
    setService(link.dataset.service);
    showStep(1, event.detail === 0);
  }));

  const firstName = $('#prenom');
  const phone = $('#telephone');
  const validPhone = value => /^(?:(?:\+33|0033)\s?(?:\(0\)\s?)?|0)[67](?:[\s.\-]?\d){8}$/.test(value.trim());
  function validateName() {
    if (firstName.value.trim().length < 2) {
      fieldError('prenom', 'Indiquez un prénom d’essai d’au moins deux caractères.', false);
      return false;
    }
    firstName.removeAttribute('aria-invalid');
    $('#prenom-error').textContent = '';
    return true;
  }
  function validatePhone() {
    if (!validPhone(phone.value)) {
      fieldError('telephone', 'Indiquez un mobile français de dix chiffres commençant par 06 ou 07, ou son format +33.', false);
      return false;
    }
    phone.removeAttribute('aria-invalid');
    $('#telephone-error').textContent = '';
    return true;
  }
  firstName.addEventListener('blur', () => { if (firstName.value || firstName.hasAttribute('aria-invalid')) validateName(); });
  phone.addEventListener('blur', () => { if (phone.value || phone.hasAttribute('aria-invalid')) validatePhone(); });
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    if (!input.hasAttribute('aria-invalid')) return;
    const valid = input === firstName ? firstName.value.trim().length >= 2 : validPhone(phone.value);
    if (valid) {
      input.removeAttribute('aria-invalid');
      $(`#${input.id}-error`).textContent = '';
    }
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    refreshDates();
    if (!isSelectedTimeValid()) {
      state.time = null;
      if (chosenDay()) {
        showStep(2, true);
        fieldError('heure', 'Ce créneau est maintenant passé. Choisissez une autre heure dans la simulation.');
      } else {
        showStep(1, true);
        fieldError('jour', 'Ce jour est maintenant passé. Choisissez une autre date dans la simulation.');
      }
      return;
    }
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      (nameValid ? phone : firstName).focus();
      return;
    }
    state.completed = true;
    $('#success-recap').textContent = `${currentService().name}, ${longDate.format(chosenDay().date)} à ${timeLabel(state.time)}. Durée : 30${nb}min. Ceci est uniquement le récapitulatif de votre essai.`;
    form.hidden = true;
    $('#booking-success').hidden = false;
    syncSummary();
    // Les valeurs d’essai n’ont aucune raison de rester dans le formulaire.
    firstName.value = '';
    phone.value = '';
    $('#titre-resultat').focus({ preventScroll: true });
    $('#titre-resultat').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce('Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.');
  });

  function restart(moveFocus = true) {
    Object.assign(state, { service: '', day: '', time: null, step: 0, completed: false });
    form.reset();
    form.hidden = false;
    $('#booking-success').hidden = true;
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    days = makeDays();
    syncSummary();
    if (moveFocus) showStep(0, true);
  }
  $('#restart').addEventListener('click', () => restart());
  syncSummary();
  $('#simulation').hidden = false;
})();
