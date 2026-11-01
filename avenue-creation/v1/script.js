(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) root.classList.add('keyboard-mode');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-mode'), { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('.hero').classList.add('is-visible')));
  const revealNodes = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    revealNodes.forEach(node => observer.observe(node));
    reducedMotion.addEventListener('change', event => {
      if (event.matches) { revealNodes.forEach(node => node.classList.add('is-visible')); observer.disconnect(); }
    });
  } else revealNodes.forEach(node => node.classList.add('is-visible'));

  const SERVICES = [
    { id: 'coupe-femme', name: 'Coupe femme' },
    { id: 'coupe-homme', name: 'Coupe homme' },
    { id: 'coupe-enfant', name: 'Coupe enfant' },
    { id: 'coloration', name: 'Coloration' }
  ];
  const HOURS = { 0: null, 1: null, 2: [540, 1020], 3: [540, 900], 4: [540, 1020], 5: [540, 1020], 6: [510, 960] };
  const state = { service: null, day: null, time: null, step: 0 };
  const app = document.getElementById('booking-app');
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const dayOptions = document.getElementById('day-options');
  const slotOptions = document.getElementById('slot-options');
  const status = document.getElementById('booking-status');
  const success = document.getElementById('booking-success');
  const firstName = document.getElementById('first-name');
  const phone = document.getElementById('phone-number');
  const stepNames = ['La prestation', 'Le jour', 'L’heure', 'Vos coordonnées'];
  let transitionFrame = 0;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const fields = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { key: `${fields.year}-${fields.month}-${fields.day}`, minutes: Number(fields.hour) * 60 + Number(fields.minute) };
  }
  function asDate(key) { return new Date(`${key}T12:00:00Z`); }
  function keyOf(date) { return date.toISOString().slice(0, 10); }
  function fullDate(key) { return dateFormat.format(asDate(key)); }
  function timeLabel(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}\u00a0h\u00a0${String(remainder).padStart(2, '0')}` : `${hours}\u00a0h`;
  }
  function isHoliday(key) {
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5))) return true;
    const year = Number(key.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 12));
    return [1, 39, 50].some(offset => {
      const date = new Date(easter); date.setUTCDate(date.getUTCDate() + offset); return keyOf(date) === key;
    });
  }
  function slotsFor(key, service, now = parisNow()) {
    if (!service || key < now.key) return [];
    const range = HOURS[asDate(key).getUTCDay()];
    if (!range) return [];
    const seed = Number(key.replaceAll('-', ''));
    const result = [];
    for (let start = range[0]; start < range[1]; start += 30) {
      const past = key === now.key && start <= now.minutes;
      const busy = (seed + Math.floor(start / 30) * 7 ) % 5 === 0;
      result.push({ start, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : 'Disponible' });
    }
    return result;
  }
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function clearError(id) { document.getElementById(id).textContent = ''; }
  function error(id, message, target) {
    document.getElementById(id).textContent = message;
    if (target) { target.setAttribute('aria-invalid', 'true'); target.focus(); }
    return false;
  }
  function setSteps() {
    stepButtons.forEach((button, index) => {
      button.disabled = index === 1 ? !state.service : index === 2 ? !state.service || !state.day : index === 3 ? !state.time : false;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function recap() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${state.service.name}, le ${fullDate(state.day)} à ${timeLabel(state.time)}. Sélection fictive.`;
  }
  function updateSummary() {
    document.getElementById('summary-service').textContent = state.service ? state.service.name : 'À choisir';
    document.getElementById('summary-day').textContent = state.day ? fullDate(state.day) : 'À choisir';
    document.getElementById('summary-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    document.getElementById('summary-price').textContent = 'Appelez le salon';
    document.getElementById('confirm-recap').textContent = recap();
    setSteps();
  }
  function announceSelection() {
    const pieces = [state.service?.name, state.day ? fullDate(state.day) : null, state.time === null ? null : timeLabel(state.time)].filter(Boolean);
    status.textContent = `Votre sélection\u00a0: ${pieces.join(', ')}. Simulation uniquement.`;
  }
  function renderDays() {
    dayOptions.replaceChildren(node('legend', 'sr-only', 'Choisissez un jour'));
    const now = parisNow();
    const start = asDate(now.key);
    for (let index = 0; index < 14; index++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + index);
      const key = keyOf(date);
      const closed = !HOURS[date.getUTCDay()];
      const noSlots = !closed && !slotsFor(key, state.service, now).some(slot => !slot.disabled);
      const holiday = isHoliday(key);
      const label = node('label', 'day-option');
      const input = node('input'); input.type = 'radio'; input.name = 'jour'; input.value = key; input.disabled = closed || noSlots; input.checked = state.day === key;
      input.setAttribute('aria-describedby', 'day-error');
      input.setAttribute('aria-label', `${fullDate(key)}${closed ? ', fermé' : noSlots ? ', aucun créneau restant' : ''}${holiday ? ', jour férié, ouverture à confirmer' : ''}`);
      const body = node('span'); body.append(node('small', '', shortWeekday.format(date)), node('strong', '', String(date.getUTCDate())), node('small', '', shortMonth.format(date)));
      body.append(node('span', 'day-note', closed ? 'Fermé' : noSlots ? 'Sans créneau' : holiday ? 'Férié' : index === 0 ? 'Aujourd’hui' : 'Exemple'));
      label.append(input, body); dayOptions.append(label);
    }
  }
  function renderSlots() {
    slotOptions.replaceChildren(node('legend', 'sr-only', 'Choisissez un horaire d’exemple'));
    if (!state.day || !state.service) return;
    const range = HOURS[asDate(state.day).getUTCDay()];
    document.getElementById('slot-context').textContent = `${fullDate(state.day)} · ${timeLabel(range[0])} – ${timeLabel(range[1])}`;
    const slots = slotsFor(state.day, state.service);
    document.getElementById('slot-empty').hidden = slots.some(slot => !slot.disabled);
    slots.forEach(slot => {
      const label = node('label', 'slot-option');
      const input = node('input'); input.type = 'radio'; input.name = 'heure'; input.value = String(slot.start); input.disabled = slot.disabled; input.checked = state.time === slot.start;
      input.setAttribute('aria-label', `${timeLabel(slot.start)}, ${slot.reason.toLocaleLowerCase('fr-FR')}, simulation`);
      input.setAttribute('aria-describedby', 'time-error');
      const body = node('span'); body.append(node('b', '', timeLabel(slot.start)), node('small', '', slot.reason));
      label.append(input, body); slotOptions.append(label);
    });
  }
  function showStep(index, focus = true) {
    const previous = state.step;
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    if (index === 3) document.getElementById('confirm-recap').textContent = recap();
    cancelAnimationFrame(transitionFrame);
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('is-entering', 'from-back');
    });
    const panel = panels[index];
    if (!reducedMotion.matches && !root.classList.contains('keyboard-mode')) {
      panel.classList.toggle('from-back', index < previous);
      panel.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    setSteps();
    status.textContent = `Étape ${index + 1} sur 4\u00a0: ${stepNames[index]}.`;
    if (focus) panel.querySelector('h3').focus();
  }
  function validFor(index) {
    if (index >= 1 && !state.service) return error('service-error', 'Choisissez une prestation pour continuer.', form.querySelector('[name="prestation"]'));
    if (index >= 2 && !state.day) return error('day-error', 'Choisissez un jour d’ouverture pour continuer.', dayOptions.querySelector('input:not(:disabled)'));
    if (index >= 3 && state.time === null) return error('time-error', 'Choisissez un horaire disponible pour continuer.', slotOptions.querySelector('input:not(:disabled)'));
    if (index >= 3 && !slotsFor(state.day, state.service).some(slot => slot.start === state.time && !slot.disabled)) {
      state.time = null; updateSummary(); showStep(2);
      return error('time-error', 'Cet horaire est désormais passé. Choisissez un autre créneau ou un autre jour.');
    }
    return true;
  }
  form.querySelector('.service-options').setAttribute('aria-describedby', 'service-error');
  form.querySelectorAll('[name="prestation"]').forEach(input => input.setAttribute('aria-describedby', 'service-error'));
  form.addEventListener('change', event => {
    const input = event.target;
    input.removeAttribute('aria-invalid');
    if (input.name === 'prestation') {
      const selected = SERVICES.find(service => service.id === input.value);
      if (state.service?.id !== selected.id) { state.day = null; state.time = null; }
      state.service = selected; clearError('service-error');
    }
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = null;
      state.day = input.value; clearError('day-error');
    }
    if (input.name === 'heure') { state.time = Number(input.value); clearError('time-error'); }
    updateSummary(); announceSelection();
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.next);
    if (validFor(target)) showStep(target);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.step); if (validFor(target)) showStep(target);
  }));
  firstName.addEventListener('input', () => { clearError('name-error'); firstName.removeAttribute('aria-invalid'); });
  phone.addEventListener('input', () => { clearError('phone-error'); phone.removeAttribute('aria-invalid'); });
  function validName() { return firstName.value.trim().length >= 2; }
  function validPhone() { return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phone.value.replace(/[\s.()–-]/g, '')); }
  firstName.addEventListener('blur', () => { if (firstName.value && !validName()) { firstName.setAttribute('aria-invalid', 'true'); error('name-error', 'Indiquez un prénom d’au moins deux caractères.'); } });
  phone.addEventListener('blur', () => { if (phone.value && !validPhone()) { phone.setAttribute('aria-invalid', 'true'); error('phone-error', 'Indiquez un mobile français, par exemple 06 12 34 56 78.'); } });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { const next = state.step + 1; if (validFor(next)) showStep(next); return; }
    if (!validFor(3)) return;
    const nameOk = validName(), phoneOk = validPhone();
    if (!phoneOk) error('phone-error', 'Indiquez un mobile français, par exemple 06 12 34 56 78.', phone);
    if (!nameOk) error('name-error', 'Indiquez un prénom d’au moins deux caractères.', firstName);
    if (!nameOk || !phoneOk) return;
    document.getElementById('success-recap').textContent = `${firstName.value.trim()}, voici votre sélection d’essai\u00a0: ${recap()}`;
    form.hidden = true; document.querySelector('.steps').hidden = true; success.hidden = false;
    success.querySelector('h3').focus();
    status.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.';
  });
  function resetBooking() {
    state.service = null; state.day = null; state.time = null; state.step = 0;
    form.reset(); form.hidden = false; success.hidden = true; document.querySelector('.steps').hidden = false;
    document.querySelectorAll('.field-error').forEach(element => { element.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    updateSummary(); showStep(0);
  }
  document.getElementById('restart-booking').addEventListener('click', resetBooking);
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (!success.hidden) resetBooking();
    const input = [...form.querySelectorAll('[name="prestation"]')].find(radio => radio.value === button.dataset.service);
    input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    showStep(1);
    document.getElementById('reserver').scrollIntoView({ behavior: reducedMotion.matches || root.classList.contains('keyboard-mode') ? 'instant' : 'smooth', block: 'start' });
  }));
  app.hidden = false;
  updateSummary();
})();
