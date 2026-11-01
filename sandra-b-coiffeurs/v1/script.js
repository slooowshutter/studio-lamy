'use strict';

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); });

  // L’armement n’a lieu qu’une fois le script chargé. Aucun contenu caché sans JS.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal], .ruled').forEach(element => {
      element.classList.add('is-armed');
      if (element.matches('.menu-row')) element.style.transitionDelay = `${Array.from(element.parentNode.children).filter(e => e.matches('.menu-row')).indexOf(element) * 60}ms`;
      observer.observe(element);
    });
  }

  let activeAnimation = null;
  function enter(element, direction = 1, duration = 240) {
    if (activeAnimation) activeAnimation.cancel();
    if (reduceMotion.matches || keyboard || !element.animate) return;
    activeAnimation = element.animate([
      { opacity: 0, transform: `translateX(${direction * 10}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration, easing: 'cubic-bezier(.23,1,.32,1)' });
  }

  const seasons = ['Printemps', 'Été', 'Automne', 'Hiver'];
  const sheet = document.querySelector('.season-sheet');
  const seasonWord = document.getElementById('season-word');
  document.querySelectorAll('button[data-season]').forEach(button => {
    button.addEventListener('click', () => {
      const season = Number(button.dataset.season);
      if (sheet.dataset.season === String(season)) return;
      sheet.dataset.season = String(season);
      seasonWord.textContent = seasons[season];
      sheet.querySelector('.sheet-heading span:last-child').textContent = `0${season + 1} / 04`;
      document.querySelectorAll('button[data-season]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      document.querySelectorAll('.summary-season').forEach(label => { label.textContent = seasons[season]; });
      enter(seasonWord);
    });
  });

  const services = {
    coupe: { name: 'Coupe homme' },
    couleur: { name: 'Couleur / mèches' },
    rasage: { name: 'Rasage à la serviette chaude' },
    chignon: { name: 'Chignon' }
  };
  // Minutes depuis minuit. Horaires publics divergents : à confirmer avec le salon.
  const hours = { 2: [555, 1080], 3: [555, 1080], 4: [555, 1080], 5: [540, 1110], 6: [540, 1110] };
  const state = { step: 0, service: null, date: null, time: null, completed: false };
  const form = document.getElementById('booking-form');
  const progress = document.querySelector('.booking-progress');
  const panels = Array.from(document.querySelectorAll('.booking-panel'));
  const stepButtons = Array.from(progress.querySelectorAll('button'));
  const next = document.getElementById('next-step');
  const previous = document.getElementById('previous-step');
  const status = document.getElementById('booking-status');
  const stepError = document.getElementById('step-error');
  const dayOptions = document.getElementById('day-options');
  const timeOptions = document.getElementById('time-options');
  const success = document.getElementById('booking-success');
  const nameInput = document.getElementById('first-name');
  const phoneInput = document.getElementById('phone');
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function formatDay(key) { return dateFormatter.format(dateFromKey(key)); }
  function formatTime(minutes) { return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`; }
  function holiday(key) { return ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5)); }

  function slotsFor(key, serviceId, now = parisNow()) {
    const day = dateFromKey(key);
    const opening = hours[day.getUTCDay()];
    if (!opening || !services[serviceId]) return [];
    const ordinal = Math.floor(day.getTime() / 86400000);
    const slots = [];
    for (let minute = opening[0]; minute < opening[1]; minute += 15) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const taken = (ordinal + minute / 15 + Object.keys(services).indexOf(serviceId)) % 5 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : 'exemple' });
    }
    return slots;
  }
  function radioLabel(name, value, className, faceClass) {
    const label = document.createElement('label');
    label.className = className;
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = name; radio.value = String(value);
    const face = document.createElement('span'); face.className = faceClass;
    label.append(radio, face);
    return { label, radio, face };
  }
  function appendText(parent, tag, value) {
    const element = document.createElement(tag); element.textContent = value; parent.append(element); return element;
  }
  function renderDays() {
    const now = parisNow();
    const first = dateFromKey(now.key);
    dayOptions.replaceChildren();
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(first); day.setUTCDate(first.getUTCDate() + offset);
      const key = dateKey(day);
      const opening = hours[day.getUTCDay()];
      const available = opening && slotsFor(key, state.service, now).some(slot => !slot.disabled);
      const { label, radio, face } = radioLabel('day', key, 'date-option', 'date-face');
      radio.disabled = !available;
      radio.checked = state.date === key;
      const isHoliday = holiday(key);
      if (isHoliday) label.classList.add('holiday');
      radio.setAttribute('aria-label', `${formatDay(key)}${!opening ? ', fermé' : !available ? ', aucun créneau' : ', exemple'}${isHoliday ? ', férié, ouverture à confirmer' : ''}`);
      appendText(face, 'span', dayFormatter.format(day));
      appendText(face, 'strong', String(day.getUTCDate()));
      appendText(face, 'span', monthFormatter.format(day));
      appendText(face, 'small', !opening ? 'fermé' : !available ? 'complet' : offset === 0 ? 'aujourd’hui' : 'exemple');
      if (isHoliday) appendText(face, 'small', 'férié · à confirmer');
      dayOptions.append(label);
    }
    if (state.date && !Array.from(dayOptions.querySelectorAll('input')).some(input => input.value === state.date && !input.disabled)) {
      state.date = null; state.time = null;
    }
  }
  function renderSlots() {
    timeOptions.replaceChildren();
    if (!state.date || !state.service) return;
    document.getElementById('slot-date').textContent = formatDay(state.date);
    const slots = slotsFor(state.date, state.service);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    slots.forEach(slot => {
      const { label, radio, face } = radioLabel('time', slot.minute, 'slot-option', 'slot-face');
      radio.disabled = slot.disabled; radio.checked = state.time === slot.minute;
      radio.setAttribute('aria-label', `${formatTime(slot.minute)}, ${slot.reason}${slot.reason === 'déjà pris' ? ', simulation' : ''}`);
      appendText(face, 'span', formatTime(slot.minute)); appendText(face, 'small', slot.reason);
      timeOptions.append(label);
    });
    document.getElementById('slots-empty').hidden = slots.some(slot => !slot.disabled);
  }
  function updateSummary() {
    const service = services[state.service];
    document.getElementById('summary-service').textContent = service ? service.name : 'Une prestation à choisir';
    document.getElementById('summary-day').textContent = state.date ? formatDay(state.date) : 'Un jour à choisir';
    document.getElementById('summary-time').textContent = state.time !== null ? formatTime(state.time) : 'Une heure à choisir';
    document.getElementById('summary-price').textContent = 'Sur demande';
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || (index === 1 && !state.service) || (index === 2 && !state.date) || (index === 3 && state.time === null);
    });
  }
  function goToStep(step, focus = true) {
    if (step > 0 && !state.service || step > 1 && !state.date || step > 2 && state.time === null) return;
    const direction = step >= state.step ? 1 : -1;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    stepButtons.forEach((button, index) => {
      if (index === step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    previous.hidden = step === 0;
    next.hidden = step === 3;
    next.firstChild.textContent = ['Choisir le jour ', 'Choisir l’heure ', 'Vos coordonnées '][step] || '';
    stepError.textContent = '';
    updateSummary();
    status.textContent = `Simulation, étape ${step + 1} sur 4\u00a0: ${['prestation', 'jour', 'heure', 'coordonnées'][step]}.`;
    if (focus) panels[step].querySelector('h3').focus();
    enter(panels[step], direction);
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') {
      state.service = input.value; state.time = null;
      renderDays();
    } else if (input.name === 'day') { state.date = input.value; state.time = null; }
    else if (input.name === 'time') state.time = Number(input.value);
    else return;
    stepError.textContent = '';
    updateSummary();
    status.textContent = `Votre sélection\u00a0: ${services[state.service]?.name || ''}${state.date ? ', ' + formatDay(state.date) : ''}${state.time !== null ? ', ' + formatTime(state.time) : ''}. Simulation uniquement.`;
  });
  stepButtons.forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.step))));
  previous.addEventListener('click', () => goToStep(state.step - 1));
  next.addEventListener('click', () => {
    const values = [state.service, state.date, state.time !== null];
    if (!values[state.step]) {
      stepError.textContent = ['Choisissez une prestation pour continuer.', 'Choisissez un jour disponible pour la simulation.', 'Choisissez un créneau d’exemple pour continuer.'][state.step];
      panels[state.step].querySelector('input:not(:disabled)')?.focus();
      return;
    }
    goToStep(state.step + 1);
  });
  document.querySelectorAll('a[data-service]').forEach(link => link.addEventListener('click', () => {
    state.completed = false;
    state.service = link.dataset.service; state.date = null; state.time = null;
    form.hidden = false; success.hidden = true; progress.hidden = false;
    form.querySelector(`input[value="${state.service}"]`).checked = true;
    goToStep(1);
  }));
  function validateField(input, errorId, message, valid) {
    input.setAttribute('aria-invalid', String(!valid));
    document.getElementById(errorId).textContent = valid ? '' : message;
    return valid;
  }
  function validName() { return validateField(nameInput, 'name-error', 'Indiquez un prénom, même fictif, pour cet essai.', nameInput.value.trim().length > 0); }
  function validPhone() {
    const phone = phoneInput.value.replace(/[\s.()\-]/g, '');
    return validateField(phoneInput, 'phone-error', 'Saisissez 10 chiffres commençant par 06 ou 07, ou le format +33.', /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(phone));
  }
  nameInput.addEventListener('blur', validName); phoneInput.addEventListener('blur', validPhone);
  [nameInput, phoneInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input === nameInput ? 'name-error' : 'phone-error').textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Entrée dans un champ ne doit pas contourner les étapes précédentes.
    if (state.step !== 3) return;
    const nameOk = validName(); const phoneOk = validPhone();
    if (!nameOk || !phoneOk) { (!nameOk ? nameInput : phoneInput).focus(); status.textContent = 'Vérifiez les coordonnées indiquées. Aucun envoi effectué.'; return; }
    if (!state.date || !state.service || !slotsFor(state.date, state.service).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; state.completed = false;
      goToStep(state.date ? 2 : 1);
      stepError.textContent = 'Le créneau d’exemple n’est plus disponible. Choisissez un nouveau créneau.';
      return;
    }
    const service = services[state.service];
    document.getElementById('success-recap').textContent = `${nameInput.value.trim()}, voici votre essai\u00a0: ${service.name}, ${formatDay(state.date)} à ${formatTime(state.time)}.`;
    state.completed = true;
    form.hidden = true; progress.hidden = true; success.hidden = false;
    updateSummary();
    status.textContent = 'Simulation terminée. Aucun rendez-vous pris et rien envoyé au salon.';
    success.querySelector('h3').focus();
    enter(success);
  });
  document.getElementById('restart-booking').addEventListener('click', () => {
    form.reset(); state.service = null; state.date = null; state.time = null; state.completed = false;
    form.hidden = false; progress.hidden = false; success.hidden = true;
    [nameInput, phoneInput].forEach(input => input.removeAttribute('aria-invalid'));
    document.getElementById('name-error').textContent = ''; document.getElementById('phone-error').textContent = '';
    goToStep(0);
  });
  document.getElementById('download-calendar').addEventListener('click', () => {
    if (!state.completed) return;
    const service = services[state.service];
    const stamp = minutes => `${state.date.replace(/-/g, '')}T${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`;
    const escapeIcs = value => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu non officiel//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:simulation-${Date.now()}@studiolamy.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`, `DTSTART;TZID=Europe/Paris:${stamp(state.time)}`, `SUMMARY:${escapeIcs('[SIMULATION] Sandra B. — ' + service.name)}`, 'DESCRIPTION:Essai uniquement. Aucun rendez-vous pris. Prix et duree a confirmer.', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'sandra-b-simulation.ics'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const todayWeekday = dateFromKey(parisNow().key).getUTCDay();
  document.querySelector(`.hours-table [data-weekday="${todayWeekday}"]`)?.classList.add('is-today');
  updateSummary();
})();
