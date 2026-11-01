(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  let pointerAction = false;
  document.addEventListener('pointerdown', () => {
    pointerAction = true;
    root.classList.remove('keyboard-navigation');
  }, { passive: true });
  document.addEventListener('keydown', () => {
    pointerAction = false;
    root.classList.add('keyboard-navigation');
  });

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const revealNodes = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08 });
    revealNodes.forEach((node, index) => {
      if (node.classList.contains('menu-row')) node.style.transitionDelay = `${(index % 3) * 60}ms`;
      revealObserver.observe(node);
    });
  } else {
    revealNodes.forEach(node => node.classList.add('visible'));
  }

  // Le lien partagé est activé quand le dossier du studio est présent.
  // La section locale garde les deux formules accessibles dans ce checkout isolé.
  const studioLinks = document.querySelectorAll('[data-service-page]');
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    fetch('../service/index.html', { method: 'HEAD' }).then(response => {
      if (response.ok) studioLinks.forEach(link => { link.href = link.dataset.servicePage; });
    }).catch(() => {});
  }

  const services = [
    { id: 'apprenti', name: 'Coupe Apprenti', duration: 60, label: '1\u00a0h', person: 'Avec Nolan' },
    { id: 'simple', name: 'Coupe simple', duration: 25, label: '25\u00a0min' },
    { id: 'formule', name: 'Formule coupe + barbe', duration: 25, label: '25\u00a0min' },
    { id: 'enfant', name: 'Coupe enfant (-13 ans)', duration: 20, label: '20\u00a0min' },
    { id: 'longs', name: 'Coupe cheveux mi-longs–longs', duration: 55, label: '55\u00a0min' },
    { id: 'longs-barbe', name: 'Coupe cheveux mi-longs–longs + barbe', duration: 55, label: '55\u00a0min' }
  ];
  const openingHours = { 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };
  const state = { service: null, day: null, time: null, step: 0, completed: false };
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const dayContainer = document.getElementById('day-choices');
  const timeContainer = document.getElementById('time-choices');
  const status = document.getElementById('step-status');
  const fullDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthName = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
  }
  function dayKey(date) { return date.toISOString().slice(0, 10); }
  function selectedDate() { return new Date(`${state.day}T12:00:00Z`); }
  function formatTime(minute) {
    return `${Math.floor(minute / 60)}\u00a0h\u00a0${String(minute % 60).padStart(2, '0')}`;
  }
  function availableSlots(date, duration) {
    const hours = openingHours[date.getUTCDay()];
    if (!hours) return [];
    const now = parisNow();
    const key = dayKey(date);
    const seed = date.getUTCDate() + date.getUTCMonth() * 3;
    const slots = [];
    for (let minute = hours[0], index = 0; minute + duration <= hours[1]; minute += 30, index++) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const illustrativeUnavailable = (index + seed) % 5 === 2;
      slots.push({ minute, disabled: past || illustrativeUnavailable, past });
    }
    return slots;
  }
  function clearError(id) { document.getElementById(id).textContent = ''; }
  function setSelection(id) {
    const service = services.find(item => item.id === id);
    if (!service) return;
    if (state.service?.id !== id) {
      state.service = service;
      state.time = null;
      if (state.day && !availableSlots(selectedDate(), service.duration).some(slot => !slot.disabled)) state.day = null;
      if (state.day) renderTimes();
    }
    const radio = document.getElementById(`service-${id}`);
    radio.checked = true;
    clearError('service-error');
    renderDays();
    updateSummary();
  }
  function renderServices() {
    const container = document.getElementById('service-choices');
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'prestation'; input.id = `service-${service.id}`; input.value = service.id;
      input.setAttribute('aria-describedby', 'service-error');
      const face = document.createElement('span'); face.className = 'choice-face';
      const name = document.createElement('span'); name.className = 'choice-name';
      name.textContent = service.person ? `${service.name} · ${service.person}` : service.name;
      const duration = document.createElement('span'); duration.className = 'choice-duration'; duration.textContent = service.label;
      face.append(name, duration); label.append(input, face); container.append(label);
      input.addEventListener('change', () => setSelection(service.id));
    });
  }
  function renderDays() {
    dayContainer.replaceChildren();
    const today = new Date(`${parisNow().key}T12:00:00Z`);
    for (let index = 0; index < 14; index++) {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() + index);
      const key = dayKey(date);
      const closed = !openingHours[date.getUTCDay()];
      const exhausted = !closed && state.service && !availableSlots(date, state.service.duration).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'choice compact-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key; input.disabled = Boolean(closed || exhausted); input.checked = state.day === key;
      input.setAttribute('aria-label', `${fullDate.format(date)}${closed ? ', fermé' : exhausted ? ', aucun créneau dans cette simulation' : ', simulation'}`);
      input.setAttribute('aria-describedby', 'day-error');
      const face = document.createElement('span'); face.className = 'choice-face';
      const day = document.createElement('span'); day.textContent = weekday.format(date);
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.className = 'day-month'; month.textContent = monthName.format(date);
      const hint = document.createElement('span'); hint.className = 'day-state'; hint.textContent = closed ? 'Fermé' : exhausted ? 'Écoulé' : 'Essai';
      face.append(day, number, month, hint); label.append(input, face); dayContainer.append(label);
      input.addEventListener('change', () => {
        state.day = key; state.time = null; clearError('day-error'); renderTimes(); updateSummary();
      });
    }
  }
  function renderTimes() {
    timeContainer.replaceChildren();
    if (!state.day || !state.service) return;
    const date = selectedDate();
    document.getElementById('time-context').textContent = `${fullDate.format(date)}. Créneaux de démonstration pour une durée de ${state.service.label}.`;
    const slots = availableSlots(date, state.service.duration);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'choice time-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = slot.minute; input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${formatTime(slot.minute)}${slot.disabled ? slot.past ? ', créneau passé' : ', indisponible dans cette simulation' : ', simulation'}`);
      input.setAttribute('aria-describedby', 'time-error');
      const face = document.createElement('span'); face.className = 'choice-face'; face.textContent = formatTime(slot.minute);
      label.append(input, face); timeContainer.append(label);
      input.addEventListener('change', () => {
        state.time = slot.minute; clearError('time-error'); updateSummary();
      });
    });
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p'); message.textContent = 'Aucun créneau de démonstration ne reste pour ce jour. Choisissez un autre jour.';
      timeContainer.append(message);
    }
  }
  function summaryText() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name}${state.service.id === 'apprenti' ? ' avec Nolan' : ''} · ${fullDate.format(selectedDate())} à ${formatTime(state.time)} · ${state.service.label}.`;
  }
  function updateSummary() {
    document.getElementById('summary-service').textContent = state.service?.name || 'À choisir';
    document.getElementById('summary-duration').textContent = state.service?.label || 'À choisir';
    document.getElementById('summary-day').textContent = state.day ? fullDate.format(selectedDate()) : 'À choisir';
    document.getElementById('summary-time').textContent = state.time === null ? 'À choisir' : formatTime(state.time);
    document.getElementById('summary-apprentice').hidden = state.service?.id !== 'apprenti';
    document.getElementById('final-recap').textContent = `Récapitulatif de l’essai : ${summaryText()}`;
    document.getElementById('mobile-summary').textContent = [
      state.service ? `${state.service.name}${state.service.id === 'apprenti' ? ' avec Nolan' : ''} (${state.service.label})` : 'Prestation à choisir',
      state.day ? fullDate.format(selectedDate()) : 'jour à choisir',
      state.time === null ? 'heure à choisir' : formatTime(state.time),
      state.completed ? 'Aucun rendez-vous réservé.' : ''
    ].filter(Boolean).join(' · ');
    stepButtons.forEach((button, index) => {
      const unlocked = index === 0 || (index === 1 && state.service) || (index === 2 && state.service && state.day) || (index === 3 && state.service && state.day && state.time !== null);
      button.disabled = !unlocked || state.completed;
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  let entranceFrame = 0;
  function showStep(index, focus = true) {
    if (state.completed) return;
    const previous = state.step;
    state.step = index;
    cancelAnimationFrame(entranceFrame);
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('arriving', 'returning');
    });
    const panel = panels[index];
    if (pointerAction && !reducedMotion.matches) {
      panel.classList.add(index < previous ? 'returning' : 'arriving');
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => panel.classList.remove('arriving', 'returning'));
      });
    }
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    updateSummary();
    status.textContent = `Étape ${index + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][index]}. Simulation, aucun rendez-vous transmis.`;
    if (focus) panel.querySelector('h3').focus();
  }
  function validSlot() {
    return Boolean(state.day && state.service && state.time !== null && availableSlots(selectedDate(), state.service.duration).some(slot => slot.minute === state.time && !slot.disabled));
  }
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.next);
    const valid = [Boolean(state.service), Boolean(state.day && openingHours[selectedDate().getUTCDay()]), validSlot()][index];
    const errorIds = ['service-error', 'day-error', 'time-error'];
    const messages = ['Choisissez une prestation pour continuer.', 'Choisissez un jour proposé dans la simulation.', 'Choisissez un créneau proposé. Un créneau passé doit être remplacé.'];
    if (!valid) {
      document.getElementById(errorIds[index]).textContent = messages[index];
      const firstAvailable = panels[index].querySelector('input:not(:disabled)');
      if (firstAvailable) firstAvailable.focus();
      return;
    }
    clearError(errorIds[index]);
    showStep(index + 1);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  const nameInput = document.getElementById('first-name');
  const phoneInput = document.getElementById('phone');
  function validateName() {
    const valid = /\p{L}/u.test(nameInput.value.trim());
    nameInput.setAttribute('aria-invalid', String(!valid));
    document.getElementById('name-error').textContent = valid ? '' : 'Indiquez votre prénom pour terminer cet essai.';
    return valid;
  }
  function validatePhone() {
    const clean = phoneInput.value.replace(/[\s.()\-]/g, '');
    const valid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(clean);
    phoneInput.setAttribute('aria-invalid', String(!valid));
    document.getElementById('phone-error').textContent = valid ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.';
    return valid;
  }
  nameInput.addEventListener('blur', () => { if (nameInput.value || nameInput.hasAttribute('aria-invalid')) validateName(); });
  phoneInput.addEventListener('blur', () => { if (phoneInput.value || phoneInput.hasAttribute('aria-invalid')) validatePhone(); });
  nameInput.addEventListener('input', () => { if (nameInput.getAttribute('aria-invalid') === 'true') { clearError('name-error'); nameInput.removeAttribute('aria-invalid'); } });
  phoneInput.addEventListener('input', () => { if (phoneInput.getAttribute('aria-invalid') === 'true') { clearError('phone-error'); phoneInput.removeAttribute('aria-invalid'); } });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) { (nameValid ? phoneInput : nameInput).focus(); return; }
    if (!validSlot()) {
      state.time = null; showStep(2);
      document.getElementById('time-error').textContent = 'Ce créneau n’est plus proposé dans la simulation. Choisissez une autre heure.';
      return;
    }
    document.getElementById('success-recap').textContent = `Récapitulatif de l’essai : ${summaryText()}`;
    state.completed = true;
    form.hidden = true;
    document.getElementById('booking-success').hidden = false;
    nameInput.value = ''; phoneInput.value = '';
    updateSummary();
    status.textContent = 'Simulation terminée. Rien n’a été envoyé. Votre rendez-vous n’est pas réservé.';
    document.getElementById('titre-resultat').focus();
  });
  function restart() {
    state.completed = false; state.service = null; state.day = null; state.time = null; state.step = 0;
    form.reset();
    form.hidden = false;
    document.getElementById('booking-success').hidden = true;
    document.querySelectorAll('.field-error').forEach(node => { node.textContent = ''; });
    [nameInput, phoneInput].forEach(input => input.removeAttribute('aria-invalid'));
    renderDays(); timeContainer.replaceChildren();
    showStep(0);
  }
  document.getElementById('restart-booking').addEventListener('click', restart);
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.completed) restart();
    setSelection(link.dataset.service); showStep(0, false);
  }));

  renderServices(); renderDays(); updateSummary();
  document.getElementById('booking-interface').hidden = false;
})();
