/* Ellite hair. Aucun service distant ; la réservation ci-dessous est un essai. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  document.addEventListener('keydown', () => root.classList.add('is-keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('is-keyboard'), { passive: true });

  const reveals = document.querySelectorAll('[data-number], [data-rise], [data-art], [data-rule]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-seen');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(element => observer.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-seen'));
  }

  const readingLine = document.getElementById('lecture');
  let scrollPending = false;
  let readingHeight = 1;
  function measureReading() {
    readingHeight = Math.max(1, root.scrollHeight - window.innerHeight);
    paintReading();
  }
  function paintReading() {
    if (!reduced.matches) readingLine.style.transform = `scaleY(${Math.min(1, Math.max(0, window.scrollY / readingHeight))})`;
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending && !reduced.matches) {
      scrollPending = true;
      requestAnimationFrame(paintReading);
    }
  }, { passive: true });
  window.addEventListener('resize', measureReading, { passive: true });
  window.addEventListener('load', measureReading, { once: true });
  if ('ResizeObserver' in window) new ResizeObserver(measureReading).observe(document.body);
  document.fonts?.ready.then(measureReading);

  const app = document.getElementById('booking-app');
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const announcement = document.getElementById('booking-announcement');
  const dayGrid = document.getElementById('day-grid');
  const slotGrid = document.getElementById('slot-grid');
  const summaryDay = document.getElementById('summary-day');
  const summaryTime = document.getElementById('summary-time');
  const nameInput = document.getElementById('first-name');
  const phoneInput = document.getElementById('phone');
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1020] };
  const serviceDuration = 90; // Durée publiée : cure avec séchage, recherche Planity.
  const state = { step: 0, day: '', time: null, completed: false };
  const dates = new Map();
  const timers = new Map();
  let frame = 0;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }
  function dayKey(date) { return date.toISOString().slice(0, 10); }
  function timeLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function slotsFor(date, now = parisNow()) {
    const range = hours[date.getUTCDay()];
    if (!range) return [];
    const key = dayKey(date);
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    for (let minutes = range[0], index = 0; minutes + serviceDuration <= range[1]; minutes += 30, index++) {
      const past = key < now.key || (key === now.key && minutes <= now.minutes);
      slots.push({ minutes, past, disabled: past || (seed + index) % 5 === 0 });
    }
    return slots;
  }
  function radioChoice(name, value, disabled, content, description) {
    const label = document.createElement('label');
    label.className = 'choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = value;
    radio.disabled = disabled;
    radio.setAttribute('aria-label', description);
    const text = document.createElement('span');
    content.forEach(({ tag, text: valueText }) => {
      const node = document.createElement(tag);
      node.textContent = valueText;
      text.appendChild(node);
    });
    label.append(radio, text);
    return label;
  }
  function renderDays() {
    const now = parisNow();
    const start = new Date(`${now.key}T12:00:00Z`);
    dayGrid.replaceChildren();
    dates.clear();
    for (let i = 0; i < 14; i++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const key = dayKey(date);
      dates.set(key, date);
      const closed = !hours[date.getUTCDay()];
      const disabled = closed || !slotsFor(date, now).some(slot => !slot.disabled);
      const status = closed ? 'Fermé' : disabled ? 'Aucun créneau' : monthFormat.format(date);
      const choice = radioChoice('jour', key, disabled, [
        { tag: 'span', text: weekdayFormat.format(date) },
        { tag: 'strong', text: String(date.getUTCDate()) },
        { tag: 'small', text: status }
      ], `${dateFormat.format(date)}${disabled ? `, ${status}` : ', date simulée'}`);
      const radio = choice.querySelector('input');
      radio.checked = state.day === key && !disabled;
      dayGrid.appendChild(choice);
    }
    if (state.day && !dayGrid.querySelector('input:checked')) {
      state.day = '';
      state.time = null;
    }
    updateSummary();
  }
  function renderSlots() {
    slotGrid.replaceChildren();
    const date = dates.get(state.day);
    if (!date) return;
    const slots = slotsFor(date);
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p');
      message.textContent = 'Aucun créneau dans cet exemple pour ce jour. Revenez au choix du jour.';
      slotGrid.appendChild(message);
    }
    slots.forEach(slot => {
      const description = slot.past ? 'horaire passé' : 'indisponible dans cet exemple';
      const choice = radioChoice('heure', String(slot.minutes), slot.disabled,
        [{ tag: 'span', text: timeLabel(slot.minutes) }],
        `${timeLabel(slot.minutes)}${slot.disabled ? `, ${description}` : ', créneau simulé'}`);
      const radio = choice.querySelector('input');
      radio.checked = state.time === slot.minutes && !slot.disabled;
      slotGrid.appendChild(choice);
    });
    if (state.time !== null && !slotGrid.querySelector('input:checked')) state.time = null;
    updateSummary();
  }
  function updateSummary() {
    const date = dates.get(state.day);
    summaryDay.textContent = date ? dateFormat.format(date) : 'À choisir';
    summaryTime.textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || index > (state.day ? (state.time !== null ? 3 : 2) : state.step > 0 ? 1 : 0);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, animate = !root.classList.contains('is-keyboard')) {
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    cancelAnimationFrame(frame);
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    const old = panels[state.step];
    const next = panels[index];
    panels.forEach(panel => {
      panel.hidden = panel !== old && panel !== next;
      panel.classList.remove('is-arriving', 'is-leaving');
      panel.inert = panel !== next;
    });
    const motion = animate && !reduced.matches && old !== next;
    next.hidden = false;
    if (motion) {
      next.classList.add('is-arriving');
      old.classList.add('is-leaving');
      // Lire une fois pour armer la transition ; aucune boucle de mesure.
      void next.offsetWidth;
      frame = requestAnimationFrame(() => next.classList.remove('is-arriving'));
      timers.set(old, setTimeout(() => { old.hidden = true; old.classList.remove('is-leaving'); timers.delete(old); }, 260));
    } else if (old !== next) old.hidden = true;
    state.step = index;
    updateSummary();
    const heading = next.querySelector('h3');
    heading.focus({ preventScroll: true });
    const bounds = heading.getBoundingClientRect();
    const summaryBottom = window.innerWidth <= 740 ? document.querySelector('.selection').getBoundingClientRect().bottom + 12 : 10;
    if (bounds.top < summaryBottom || bounds.bottom > window.innerHeight - 90) heading.scrollIntoView({ block: 'center', behavior: 'instant' });
    announcement.textContent = index === 4 ? 'Simulation terminée. Aucun rendez-vous réservé.' : `Étape ${index + 1} sur 4. ${heading.textContent}`;
    measureReading();
  }
  function validSlot() {
    const date = dates.get(state.day);
    return date && slotsFor(date).some(slot => slot.minutes === state.time && !slot.disabled);
  }
  function goNext(index) {
    if (index === 2 && !state.day) {
      document.getElementById('day-error').textContent = 'Choisissez un jour pour continuer.';
      dayGrid.querySelector('input:not(:disabled)')?.focus();
      return;
    }
    if (index === 3 && !validSlot()) {
      state.time = null;
      renderSlots();
      document.getElementById('slot-error').textContent = 'Choisissez une heure pour continuer. Un horaire passé ne peut plus être choisi.';
      slotGrid.querySelector('input:not(:disabled)')?.focus();
      return;
    }
    showStep(index);
  }
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => goNext(Number(button.dataset.next))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  dayGrid.addEventListener('change', event => {
    if (!event.target.matches('input')) return;
    state.day = event.target.value;
    state.time = null;
    document.getElementById('day-error').textContent = '';
    updateSummary();
    announcement.textContent = `Jour choisi pour l’essai : ${summaryDay.textContent}. Choisissez ensuite une heure.`;
  });
  slotGrid.addEventListener('change', event => {
    if (!event.target.matches('input')) return;
    state.time = Number(event.target.value);
    document.getElementById('slot-error').textContent = '';
    updateSummary();
    announcement.textContent = `Heure choisie pour l’essai : ${summaryTime.textContent}.`;
  });
  function fieldValid(input, errorId, valid, message) {
    document.getElementById(errorId).textContent = valid ? '' : message;
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  function validateName() {
    return fieldValid(nameInput, 'name-error', nameInput.value.trim().length > 0, 'Indiquez un prénom de test pour terminer l’essai.');
  }
  function validatePhone() {
    const value = phoneInput.value.trim().replace(/[\s.()\-]/g, '');
    return fieldValid(phoneInput, 'phone-error', /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(value), 'Indiquez un numéro français de 10 chiffres, ou un numéro commençant par +33.');
  }
  nameInput.addEventListener('blur', validateName);
  phoneInput.addEventListener('blur', validatePhone);
  [nameInput, phoneInput].forEach(input => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      input.removeAttribute('aria-invalid');
      document.getElementById(input === nameInput ? 'name-error' : 'phone-error').textContent = '';
    }
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) {
      goNext(Math.min(3, state.step + 1));
      return;
    }
    if (!validSlot()) {
      state.time = null;
      showStep(1);
      document.getElementById('day-error').textContent = 'Cette date ou cette heure est passée. Choisissez un nouveau jour pour l’essai.';
      return;
    }
    const nameOk = validateName();
    const phoneOk = validatePhone();
    if (!nameOk || !phoneOk) {
      (nameOk ? phoneInput : nameInput).focus();
      return;
    }
    document.getElementById('success-recap').textContent = `Vous avez essayé le parcours « Cryothérapie avec séchage », le ${dateFormat.format(dates.get(state.day))} à ${timeLabel(state.time)}.`;
    state.completed = true;
    document.getElementById('summary-stamp').textContent = 'Essai terminé, sans réservation';
    // Les coordonnées de test ne sont conservées dans aucun stockage.
    nameInput.value = '';
    phoneInput.value = '';
    showStep(4);
  });
  document.getElementById('restart').addEventListener('click', () => {
    form.reset();
    state.day = '';
    state.time = null;
    state.completed = false;
    document.querySelectorAll('.field-error').forEach(element => { element.textContent = ''; });
    [nameInput, phoneInput].forEach(input => input.removeAttribute('aria-invalid'));
    document.getElementById('summary-stamp').textContent = 'Essai, sans réservation';
    showStep(0);
  });
  app.hidden = false;
  renderDays();
  updateSummary();
  measureReading();
})();
