(() => {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    decoration: { name: 'Décoration 3D', duration: 15, price: 4, from: true },
    classique: { name: 'Manucure + vernis classique', duration: 30, price: 28 },
    semi: { name: 'Manucure + vernis semi-permanent', duration: 30, price: 35 },
    extensions: { name: 'Extensions capsules gel avec vernis semi-permanent', duration: 45, price: 50 },
    homme: { name: 'Manucure homme', duration: 30, price: 25 },
    pedicure: { name: 'Beauté des pieds', duration: 45, price: 30 },
    baby: { name: 'Baby boomer avec gel et vernis semi-permanent', duration: 45, price: 65 }
  };
  const form = $('#reservation-form');
  const app = $('.booking-app');
  const panels = $$('.booking-panel');
  const stepButtons = $$('[data-step]');
  const nextButton = $('#continuer');
  const backButton = $('#retour');
  const result = $('#resultat');
  const state = { service: 'decoration', date: '', time: null, step: 0, reached: 0 };
  const nextLabels = ['Choisir le jour', 'Choisir l’heure', 'Renseigner mes coordonnées', 'Terminer la simulation'];
  const announcements = ['Étape 1 sur 4 : la prestation.', 'Étape 2 sur 4 : le jour.', 'Étape 3 sur 4 : l’heure.', 'Étape 4 sur 4 : vos coordonnées.'];
  let keyboard = false;
  let panelAnimation = null;

  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard-mode'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard-mode'); }, true);

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
  }

  function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
  function addDays(key, count) {
    const date = dateObject(key);
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
  }
  function fullDate(key) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateObject(key));
  }
  function hoursFor(key) {
    const day = dateObject(key).getUTCDay();
    return day === 1 ? null : [600, day === 0 ? 1140 : 1170];
  }
  function hourLabel(minute) {
    const hours = Math.floor(minute / 60);
    const remainder = minute % 60;
    return `${hours}\u00a0h${remainder ? `\u00a0${String(remainder).padStart(2, '0')}` : ''}`;
  }
  function priceLabel(service) { return `${service.from ? 'À partir de ' : ''}${service.price}\u00a0€`; }
  function dateAllowed(key) {
    const today = parisNow().date;
    return Boolean(key && key >= today && key <= addDays(today, 13) && hoursFor(key));
  }
  function slotsFor(key, service) {
    const hours = hoursFor(key);
    if (!hours) return [];
    const now = parisNow();
    const dayHash = [...key].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, 0);
    const slots = [];
    for (let minute = hours[0]; minute + service.duration <= hours[1]; minute += 30) {
      const past = key < now.date || (key === now.date && minute <= now.minute);
      const taken = (dayHash + minute / 30) % 7 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function selectedTimeAllowed() {
    return dateAllowed(state.date) && state.time !== null && slotsFor(state.date, services[state.service]).some(slot => slot.minute === state.time && !slot.disabled);
  }

  function clearError(id) { $(`#${id}`).textContent = ''; }
  function announce(text) { $('#annonce').textContent = text; }
  function updateSummary() {
    const service = services[state.service];
    $('#resume-prestation').textContent = service.name;
    $('#resume-prix').textContent = priceLabel(service);
    $('#resume-duree').textContent = `${service.duration}\u00a0min · À confirmer avec LyVan Nails.`;
    $('#resume-jour').textContent = state.date ? fullDate(state.date) : 'À choisir';
    $('#resume-heure').textContent = state.time === null ? 'À choisir' : hourLabel(state.time);
  }

  function renderDays() {
    const container = $('#jours');
    container.replaceChildren();
    const now = parisNow();
    for (let index = 0; index < 14; index++) {
      const key = addDays(now.date, index);
      const date = dateObject(key);
      const hours = hoursFor(key);
      const ended = hours && key === now.date && !slotsFor(key, services[state.service]).some(slot => !slot.disabled);
      const disabled = !hours || ended;
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = key;
      input.disabled = Boolean(disabled);
      input.checked = state.date === key;
      input.setAttribute('aria-describedby', 'erreur-jour');
      input.setAttribute('aria-label', `${fullDate(key)}${!hours ? ', fermé' : ended ? ', aucun créneau restant' : ''}`);
      const face = document.createElement('span');
      face.className = 'day-face';
      const dayName = document.createElement('span');
      dayName.className = 'day-name';
      dayName.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
      const dayNumber = document.createElement('span');
      dayNumber.className = 'day-date';
      dayNumber.textContent = String(date.getUTCDate());
      const month = document.createElement('span');
      month.className = disabled ? 'day-status' : 'day-month';
      month.textContent = !hours ? 'Fermé' : ended ? 'Terminé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
      face.append(dayName, dayNumber, month);
      label.append(input, face);
      container.append(label);
    }
  }

  function renderTimes() {
    const container = $('#heures');
    container.replaceChildren();
    const service = services[state.service];
    const hours = hoursFor(state.date);
    if (!hours) return;
    $('#contexte-heures').textContent = `${fullDate(state.date)} · ${service.duration}\u00a0min · De ${hourLabel(hours[0])} à ${hourLabel(hours[1])}. Horaires à confirmer.`;
    const slots = slotsFor(state.date, service);
    for (const slot of slots) {
      const label = document.createElement('label');
      label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = String(slot.minute);
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minute && !slot.disabled;
      input.setAttribute('aria-describedby', 'erreur-heure');
      input.setAttribute('aria-label', `${hourLabel(slot.minute)}${slot.reason ? `, ${slot.reason.toLowerCase()}` : ', créneau d’exemple'}`);
      const face = document.createElement('span');
      face.className = 'slot-face';
      const time = document.createElement('span');
      time.textContent = hourLabel(slot.minute);
      face.append(time);
      if (slot.reason) {
        const reason = document.createElement('small');
        reason.textContent = slot.reason;
        face.append(reason);
      }
      label.append(input, face);
      container.append(label);
    }
    if (!slots.some(slot => !slot.disabled)) {
      const empty = document.createElement('p');
      empty.className = 'slot-empty';
      empty.textContent = 'Aucun créneau d’exemple ne reste pour ce jour. Revenez à l’étape Jour pour choisir une autre date.';
      container.append(empty);
    }
  }

  function showStep(index, focus = true) {
    panelAnimation?.cancel();
    state.step = index;
    state.reached = Math.max(state.reached, index);
    result.hidden = true;
    form.hidden = false;
    $('.step-nav').hidden = false;
    panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== index; });
    stepButtons.forEach((button, buttonIndex) => {
      button.disabled = buttonIndex > state.reached;
      if (buttonIndex === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    backButton.hidden = index === 0;
    nextButton.textContent = `${nextLabels[index]} ${index === 3 ? '' : '→'}`.trim();
    updateSummary();
    announce(announcements[index]);
    const panel = panels[index];
    if (focus) {
      $('h3', panel).focus({ preventScroll: true });
      const position = panel.getBoundingClientRect();
      if (position.top < 16 || position.top > window.innerHeight * .68) {
        panel.scrollIntoView({ behavior: motion.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
      }
    }
    if (focus && !motion.matches && !keyboard && typeof panel.animate === 'function') {
      panelAnimation = panel.animate([
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  function chooseService(key) {
    if (!services[key]) return;
    state.service = key;
    state.date = '';
    state.time = null;
    state.reached = 0;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === key; });
    clearError('erreur-jour');
    clearError('erreur-heure');
    clearError('erreur-parcours');
    showStep(0, false);
  }

  function validateField(input) {
    let message = '';
    if (input.id === 'prenom') {
      if (!/\p{L}/u.test(input.value.trim())) message = 'Indiquez votre prénom pour poursuivre cet essai.';
    } else {
      const number = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0|\+33|0033)[67]\d{8}$/.test(number)) message = 'Indiquez un mobile français valide : 06 ou 07 suivi de 8 chiffres, ou le format +33.';
    }
    $(`#erreur-${input.id}`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      state.date = input.value;
      state.time = null;
      state.reached = Math.min(state.reached, 2);
      stepButtons[3].disabled = true;
      clearError('erreur-jour');
      clearError('erreur-heure');
      clearError('erreur-parcours');
      updateSummary();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value);
      clearError('erreur-heure');
      clearError('erreur-parcours');
      updateSummary();
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearError('erreur-parcours');
    if (state.step === 0) { showStep(1); return; }
    if (state.step === 1) {
      if (!dateAllowed(state.date)) {
        $('#erreur-jour').textContent = 'Choisissez un jour ouvert parmi les dates proposées.';
        $('input[name="jour"]:not(:disabled)')?.focus();
        return;
      }
      showStep(2);
      return;
    }
    if (state.step === 2) {
      if (!selectedTimeAllowed()) {
        $('#erreur-heure').textContent = 'Choisissez un créneau d’exemple disponible. Les créneaux passés ou déjà pris ne peuvent pas être choisis.';
        $('input[name="heure"]:not(:disabled)')?.focus();
        return;
      }
      showStep(3);
      return;
    }
    if (!selectedTimeAllowed()) {
      state.time = null;
      const recoveryStep = dateAllowed(state.date) ? 2 : 1;
      if (recoveryStep === 1) state.date = '';
      state.reached = recoveryStep;
      $('#erreur-parcours').textContent = 'La date ou l’heure n’est plus disponible dans cet exemple. Choisissez un nouveau créneau.';
      showStep(recoveryStep);
      return;
    }
    const firstName = $('#prenom');
    const phone = $('#telephone');
    const nameValid = validateField(firstName);
    const phoneValid = validateField(phone);
    if (!nameValid || !phoneValid) { (!nameValid ? firstName : phone).focus(); return; }
    panelAnimation?.cancel();
    form.hidden = true;
    $('.step-nav').hidden = true;
    result.hidden = false;
    const service = services[state.service];
    $('#message-resultat').textContent = `${firstName.value.trim()}, voici votre essai : ${service.name}, ${fullDate(state.date)} à ${hourLabel(state.time)}. Durée relevée sur Planity : ${service.duration}\u00a0min. Tarif relevé sur Planity : ${priceLabel(service).toLowerCase()}, à confirmer avec LyVan Nails.`;
    announce('Simulation terminée. Rien n’a été envoyé. Aucun rendez-vous n’a été réservé.');
    $('#titre-resultat').focus();
    if (!motion.matches && !keyboard && typeof result.animate === 'function') {
      panelAnimation = result.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  });

  backButton.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (index <= state.reached) showStep(index);
  }));
  $$('.fields input').forEach(input => input.addEventListener('blur', () => {
    if (input.value.trim() || input.hasAttribute('aria-invalid')) validateField(input);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    chooseService(link.dataset.service);
    announce(`${services[state.service].name} : prestation sélectionnée pour la simulation.`);
    if (keyboard) $('#etape-prestation').focus({ preventScroll: true });
  }));
  $('#recommencer').addEventListener('click', () => {
    form.reset();
    $$('.fields input').forEach(input => { input.removeAttribute('aria-invalid'); });
    ['erreur-prenom', 'erreur-telephone', 'erreur-jour', 'erreur-heure', 'erreur-parcours'].forEach(clearError);
    chooseService('decoration');
    showStep(0);
  });

  app.hidden = false;
  showStep(0, false);
  const todayRow = $(`[data-weekday="${dateObject(parisNow().date).getUTCDay()}"]`);
  todayRow?.classList.add('is-today');

  const figure = $('.relief-figure');
  const reliefButton = $('.relief-toggle');
  reliefButton.hidden = false;
  reliefButton.addEventListener('click', () => {
    figure.classList.add('is-interactive');
    const flat = figure.classList.toggle('is-flat');
    reliefButton.setAttribute('aria-pressed', String(!flat));
    reliefButton.textContent = flat ? 'Faire apparaître le relief ↗' : 'Revenir à plat ↙';
  });

  const reveals = $$('[data-reveal]');
  const mobileBar = $('.mobile-bar');
  const observedVisibility = { hero: true, booking: false, footer: false };
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach((element, index) => {
      if (element.dataset.reveal === 'ligne') element.style.transitionDelay = `${index % 3 * 50}ms`;
      revealObserver.observe(element);
    });
    const visibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const name = entry.target.classList.contains('hero-actions') ? 'hero' : entry.target.id === 'reservation' ? 'booking' : 'footer';
        observedVisibility[name] = entry.isIntersecting;
      });
      mobileBar.hidden = observedVisibility.hero || observedVisibility.booking || observedVisibility.footer;
    }, { threshold: 0, rootMargin: '0px 0px 80px 0px' });
    [$('.hero-actions'), $('#reservation'), $('#pied-de-page')].forEach(element => visibilityObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }

  document.documentElement.classList.add('js');
  if (motion.matches) document.documentElement.classList.add('is-ready');
  else requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
  motion.addEventListener('change', () => {
    panelAnimation?.cancel();
    if (motion.matches) document.documentElement.classList.add('is-ready');
  });
})();
