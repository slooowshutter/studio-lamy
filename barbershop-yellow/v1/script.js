(() => {
  'use strict';

  // Horaires publiés par les annuaires, à confirmer par le salon.
  // Les valeurs sont des minutes depuis minuit, pas des durées de prestation.
  const hours = {
    0: [[780, 1140]],
    1: [[780, 1140]],
    2: [[540, 1140]],
    3: [[540, 1140]],
    4: [[540, 1140]],
    5: [[540, 750], [900, 1200]],
    6: [[540, 1140]]
  };
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(now).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dayDate(key) { return new Date(`${key}T12:00:00Z`); }
  function addDays(key, offset) {
    const date = dayDate(key);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  }
  function slotsFor(key, now = new Date()) {
    const current = parisNow(now);
    if (key < current.date) return [];
    const windows = hours[dayDate(key).getUTCDay()] || [];
    const slots = [];
    windows.forEach(([start, end]) => {
      for (let minute = start; minute < end; minute += 30) {
        if (key > current.date || minute > current.minutes) slots.push(minute);
      }
    });
    return slots;
  }
  function timeLabel(value) {
    const minute = value % 60;
    return `${Math.floor(value / 60)}\u00a0h${minute ? `\u00a0${String(minute).padStart(2, '0')}` : ''}`;
  }
  function validPhone(value) {
    return /^(?:0[67]|\+33[67]|0033[67])\d{8}$/.test(value.replace(/[\s.()-]/g, ''));
  }
  // Permet une vérification locale de la logique sans dépendance ni navigateur.
  if (typeof module !== 'undefined' && module.exports) module.exports = { hours, parisNow, addDays, slotsFor, timeLabel, validPhone };
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard');
  }, { passive: true });

  const demo = document.getElementById('demonstration');
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const days = document.getElementById('days');
  const slots = document.getElementById('slots');
  const summary = document.getElementById('selection');
  const result = document.getElementById('booking-result');
  const status = document.getElementById('booking-status');
  const state = { day: null, time: null, step: 0 };

  function announce(message) { status.textContent = message; }
  function updateSummary() {
    summary.textContent = state.day
      ? `${longDate.format(dayDate(state.day))}${state.time !== null ? ` · ${timeLabel(state.time)}` : ' · heure à choisir'}`
      : 'Choisissez un jour.';
    stepButtons.forEach((button, index) => {
      button.disabled = (index === 1 && !state.day) || (index === 2 && state.time === null);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function animatePanel(panel, backwards) {
    if (reducedMotion.matches || keyboard || !panel.animate) return;
    panel.getAnimations().forEach(animation => animation.cancel());
    panel.animate([
      { opacity: 0, transform: `translateX(${backwards ? '-10' : '10'}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function goToStep(next, focus = true) {
    const previous = state.step;
    state.step = next;
    panels.forEach((panel, index) => { panel.hidden = index !== next; });
    if (next === 1) renderSlots();
    updateSummary();
    const panel = panels[next];
    if (focus) {
      panel.querySelector('.step-heading').focus({ preventScroll: true });
      const bounds = panel.getBoundingClientRect();
      if (bounds.top < 24 || bounds.top > window.innerHeight - 150) {
        panel.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
      animatePanel(panel, next < previous);
    }
    announce(['Étape 1 sur 3 : choisissez un jour.', 'Étape 2 sur 3 : choisissez une heure.', 'Étape 3 sur 3 : vos coordonnées.'][next]);
  }
  function makeChoice(name, value, labelText, disabled = false) {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.disabled = disabled;
    input.setAttribute('aria-label', labelText);
    input.setAttribute('aria-describedby', name === 'jour' ? 'day-error' : 'time-error');
    const face = document.createElement('span');
    label.append(input, face);
    return { label, input, face };
  }
  function renderDays() {
    const current = parisNow();
    days.replaceChildren();
    for (let offset = 0; offset < 14; offset++) {
      const key = addDays(current.date, offset);
      const date = dayDate(key);
      const disabled = !slotsFor(key).length;
      const { label, input, face } = makeChoice('jour', key, `${longDate.format(date)}${disabled ? ', aucune heure à proposer' : ''}`, disabled);
      input.checked = state.day === key;
      const weekday = document.createElement('span');
      weekday.textContent = offset === 0 ? 'Auj.' : shortDay.format(date);
      const number = document.createElement('strong');
      number.className = 'day-number';
      number.textContent = String(date.getUTCDate());
      const month = document.createElement('span');
      month.textContent = disabled ? 'Passé' : shortMonth.format(date);
      face.append(weekday, number, month);
      input.addEventListener('change', () => {
        state.day = key;
        state.time = null;
        document.getElementById('day-error').textContent = '';
        updateSummary();
        announce(`${longDate.format(date)} sélectionné. Vous pouvez choisir une heure.`);
      });
      days.append(label);
    }
  }
  function renderSlots() {
    slots.replaceChildren();
    const available = slotsFor(state.day);
    if (!available.includes(state.time)) state.time = null;
    if (!available.length) {
      const note = document.createElement('p');
      note.textContent = 'Aucune heure à proposer pour ce jour. Choisissez un autre jour.';
      slots.append(note);
      return;
    }
    available.forEach(minute => {
      const { label, input, face } = makeChoice('heure', minute, timeLabel(minute));
      face.textContent = timeLabel(minute);
      input.checked = state.time === minute;
      input.addEventListener('change', () => {
        state.time = minute;
        document.getElementById('time-error').textContent = '';
        updateSummary();
        announce(`${timeLabel(minute)} sélectionné.`);
      });
      slots.append(label);
    });
  }
  document.getElementById('to-time').addEventListener('click', () => {
    if (!state.day || !slotsFor(state.day).length) {
      document.getElementById('day-error').textContent = 'Choisissez un jour avec une heure proposée.';
      renderDays();
      days.querySelector('input:not(:disabled)')?.focus();
      return;
    }
    goToStep(1);
  });
  document.getElementById('to-details').addEventListener('click', () => {
    if (state.time === null || !slotsFor(state.day).includes(state.time)) {
      renderSlots();
      document.getElementById('time-error').textContent = 'Choisissez une heure proposée.';
      slots.querySelector('input:not(:disabled)')?.focus();
      return;
    }
    goToStep(2);
  });
  stepButtons.forEach((button, index) => button.addEventListener('click', () => goToStep(index)));
  document.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.back)));
  });
  const nameInput = document.getElementById('firstname');
  const phoneInput = document.getElementById('telephone');
  [nameInput, phoneInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input === nameInput ? 'name-error' : 'phone-error').textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!state.day || state.time === null || !slotsFor(state.day).includes(state.time)) {
      state.day = null;
      state.time = null;
      renderDays();
      goToStep(0);
      document.getElementById('day-error').textContent = 'L’heure choisie est passée. Choisissez un nouveau jour et une nouvelle heure.';
      announce('L’heure choisie est passée. Choisissez un nouveau jour et une nouvelle heure.');
      return;
    }
    const nameValid = nameInput.value.trim().length > 0;
    const phoneValid = validPhone(phoneInput.value);
    nameInput.setAttribute('aria-invalid', String(!nameValid));
    phoneInput.setAttribute('aria-invalid', String(!phoneValid));
    document.getElementById('name-error').textContent = nameValid ? '' : 'Indiquez un prénom pour essayer le formulaire.';
    document.getElementById('phone-error').textContent = phoneValid ? '' : 'Indiquez un numéro mobile français commençant par 06, 07 ou +33.';
    if (!nameValid || !phoneValid) {
      (nameValid ? phoneInput : nameInput).focus();
      announce('Vérifiez les renseignements indiqués sous les champs.');
      return;
    }
    document.getElementById('result-recap').textContent = `${nameInput.value.trim()}, votre sélection d’essai : ${longDate.format(dayDate(state.day))} à ${timeLabel(state.time)}.`;
    form.hidden = true;
    result.hidden = false;
    stepButtons.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    result.querySelector('h3').focus({ preventScroll: true });
    animatePanel(result, false);
    announce('Simulation terminée. Aucun rendez-vous n’est réservé, aucune donnée n’est envoyée.');
    form.reset();
  });
  document.getElementById('restart').addEventListener('click', () => {
    state.day = null;
    state.time = null;
    form.reset();
    [nameInput, phoneInput].forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    result.hidden = true;
    document.getElementById('result-recap').textContent = '';
    form.hidden = false;
    renderDays();
    goToStep(0);
  });
  renderDays();
  updateSummary();
  demo.hidden = false;

  const copyButton = document.getElementById('copy-address');
  if (navigator.clipboard && window.isSecureContext) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('Barbershop YELLOW, 12 rue des Chandiots, 63100 Clermont-Ferrand');
        document.getElementById('copy-status').textContent = 'Adresse copiée.';
      } catch {
        document.getElementById('copy-status').textContent = 'Copie indisponible. Vous pouvez sélectionner l’adresse ci-dessus.';
      }
    });
  }

  // Les nombres ne montent qu’une fois. Leur valeur finale reste dans le HTML.
  const runningCounters = new Set();
  function countOnce(element) {
    if (element.dataset.counted) return;
    element.dataset.counted = 'true';
    if (reducedMotion.matches) return;
    const final = Number(element.dataset.count);
    const width = element.classList.contains('folio') ? 2 : 1;
    const start = performance.now();
    const counter = { element, final, width };
    runningCounters.add(counter);
    function tick(now) {
      if (reducedMotion.matches) {
        element.textContent = String(final).padStart(width, '0');
        runningCounters.delete(counter);
        return;
      }
      const progress = Math.min((now - start) / 450, 1);
      element.textContent = String(Math.round(final * (1 - Math.pow(1 - progress, 3)))).padStart(width, '0');
      if (progress < 1) requestAnimationFrame(tick);
      else runningCounters.delete(counter);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        entry.target.querySelectorAll('[data-count]').forEach(countOnce);
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.poster').forEach(poster => observer.observe(poster));
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    document.querySelectorAll('.poster').forEach(poster => poster.classList.add('is-visible'));
    document.getAnimations().forEach(animation => animation.cancel());
    runningCounters.forEach(({ element, final, width }) => { element.textContent = String(final).padStart(width, '0'); });
  });
})();
