(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  if (!reducedMotion.matches) root.classList.add('motion');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  reducedMotion.addEventListener('change', event => root.classList.toggle('motion', !event.matches));
  const revealItems = document.querySelectorAll('[data-reveal], [data-rule]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.menu-row[data-reveal]').forEach((row, index) => {
      row.style.transitionDelay = `${index % 3 * 50}ms`;
    });
    revealItems.forEach(item => revealObserver.observe(item));
  } else revealItems.forEach(item => item.classList.add('visible'));

  const services = {
    tradition: { name: 'Coupe et Rasage Traditionnel', duration: 60 },
    coupe: { name: 'Coupe Homme', duration: 30 },
    shampoing: { name: 'Coupe + Shampoing', duration: 30 },
    rasoir: { name: 'Rasoir tradition', duration: 30 },
    barbe: { name: 'Taille de barbe courte', duration: 20 },
    moustache: { name: 'Moustache', duration: 15 }
  };
  // Plages communes à Planity et à l’annuaire : pauses sourcées exclues par prudence.
  // Minutes depuis minuit, dimanche = 0. Voir SOURCES.md, rubrique Horaires.
  const opening = {
    0: [],
    1: [[600, 780], [840, 1140]],
    2: [[600, 780], [840, 1140]],
    3: [[600, 780], [840, 1140]],
    4: [[600, 780], [840, 1140]],
    5: [[540, 780], [840, 1140]],
    6: [[540, 750], [810, 1080]]
  };
  const state = { service: 'tradition', date: '', time: null, step: 0, reached: 0 };
  const app = document.getElementById('booking-app');
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('.booking-step')];
  const navigation = [...document.querySelectorAll('[data-step]')];
  const status = document.getElementById('booking-status');
  const dayOptions = document.getElementById('day-options');
  const slotOptions = document.getElementById('slot-options');
  const success = document.getElementById('booking-success');
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  function nowInParis() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hour}\u00a0h\u00a0${String(remainder).padStart(2, '0')}` : `${hour}\u00a0h`;
  }
  function durationLabel(minutes) { return minutes === 60 ? '1\u00a0h' : `${minutes}\u00a0min`; }
  function slotsFor(key) {
    const now = nowInParis();
    const duration = services[state.service].duration;
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    (opening[dateFromKey(key).getUTCDay()] || []).forEach(([start, end]) => {
      for (let minute = start; minute + duration <= end; minute += 30) {
        const past = key < now.key || (key === now.key && minute <= now.minute);
        const occupied = ((seed + minute / 30) % 5) === 0;
        slots.push({ minute, past, occupied, disabled: past || occupied });
      }
    });
    return slots;
  }
  function announce(message) { status.textContent = message; }
  function focusTitle(title) {
    title.focus({ preventScroll: true });
    const bounds = title.getBoundingClientRect();
    const safeBottom = window.innerHeight - 80;
    if (bounds.top < 24 || bounds.bottom > safeBottom) {
      title.scrollIntoView({ block: 'start', behavior: keyboard || reducedMotion.matches ? 'instant' : 'smooth' });
    }
  }
  function updateSummary() {
    const service = services[state.service];
    document.getElementById('summary-service').textContent = service.name;
    document.getElementById('summary-duration').textContent = durationLabel(service.duration);
    document.getElementById('summary-day').textContent = state.date ? dayFormatter.format(dateFromKey(state.date)) : 'Jour à choisir';
    document.getElementById('summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'Heure à choisir';
  }
  function makeRadio(name, value, disabled, checked) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled; input.checked = checked;
    return input;
  }
  function appendText(parent, tag, value) {
    const element = document.createElement(tag); element.textContent = value; parent.append(element); return element;
  }
  function renderDays() {
    const today = dateFromKey(nowInParis().key);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() + index);
      const key = dateKey(date);
      const closed = opening[date.getUTCDay()].length === 0;
      const elapsed = !closed && slotsFor(key).every(slot => slot.disabled);
      const label = document.createElement('label'); label.className = 'choice day-choice';
      label.append(makeRadio('jour', key, closed || elapsed, key === state.date));
      appendText(label, 'span', weekdayFormatter.format(date));
      appendText(label, 'strong', String(date.getUTCDate()));
      appendText(label, 'span', monthFormatter.format(date));
      appendText(label, 'span', closed ? 'Fermé' : elapsed ? 'Écoulé' : 'Fictif');
      fragment.append(label);
    }
    dayOptions.replaceChildren(fragment);
  }
  function renderSlots() {
    const fragment = document.createDocumentFragment();
    const slots = state.date ? slotsFor(state.date) : [];
    if (!slots.some(slot => !slot.disabled)) {
      const notice = document.createElement('p'); notice.className = 'empty-slots';
      notice.textContent = 'Aucun créneau fictif restant pour ce jour. Revenez au choix du jour.';
      fragment.append(notice);
    } else {
      slots.forEach(slot => {
        const label = document.createElement('label'); label.className = 'choice slot-choice';
        label.append(makeRadio('heure', String(slot.minute), slot.disabled, slot.minute === state.time));
        appendText(label, 'strong', timeLabel(slot.minute));
        appendText(label, 'span', slot.past ? 'Passé' : slot.occupied ? 'Pris (fictif)' : 'Fictif');
        fragment.append(label);
      });
    }
    slotOptions.replaceChildren(fragment);
  }
  function showStep(index, focus = true) {
    state.step = index;
    state.reached = Math.max(state.reached, index);
    form.hidden = false; success.hidden = true;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, number) => { panel.hidden = number !== index; panel.classList.remove('changing'); });
    navigation.forEach((button, number) => {
      button.disabled = number > state.reached;
      if (number === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const current = panels[index];
    if (!keyboard && !reducedMotion.matches) {
      current.classList.add('changing');
      requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('changing')));
    }
    if (focus) focusTitle(current.querySelector('h3'));
    announce(`Étape ${index + 1} sur 4 : ${current.querySelector('h3').textContent}`);
  }
  function invalidateTime() {
    state.time = null; state.reached = Math.min(state.reached, 2);
    document.getElementById('slot-error').textContent = '';
    updateSummary();
    navigation.forEach((button, index) => { button.disabled = index > state.reached; });
  }
  app.hidden = false;
  form.addEventListener('change', event => {
    if (event.target.name === 'prestation') {
      state.service = event.target.value;
      invalidateTime();
    }
    if (event.target.name === 'jour') {
      state.date = event.target.value; invalidateTime();
      document.getElementById('day-error').textContent = '';
    }
    if (event.target.name === 'heure') {
      state.time = Number(event.target.value); updateSummary();
      document.getElementById('slot-error').textContent = '';
    }
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 2 && (!state.date || !slotsFor(state.date).some(slot => !slot.disabled))) {
      document.getElementById('day-error').textContent = 'Choisissez un jour proposé avant de continuer.';
      dayOptions.querySelector('input:not(:disabled)')?.focus(); return;
    }
    if (next === 3 && !slotsFor(state.date).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; updateSummary(); renderSlots();
      document.getElementById('slot-error').textContent = 'Choisissez une heure proposée avant de continuer.';
      slotOptions.querySelector('input:not(:disabled)')?.focus(); return;
    }
    showStep(next);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  navigation.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    form.querySelector(`input[name="prestation"][value="${state.service}"]`).checked = true;
    state.time = null; state.reached = 1; updateSummary(); showStep(0, false);
  }));
  const nameField = document.getElementById('prenom');
  const phoneField = document.getElementById('telephone');
  [nameField, phoneField].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid'); document.getElementById(`${input.id}-error`).textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const name = nameField.value.trim();
    const phone = phoneField.value.replace(/[\s.()\-]/g, '');
    const nameValid = (name.match(/\p{L}/gu) || []).length >= 2;
    const phoneValid = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(phone);
    nameField.setAttribute('aria-invalid', String(!nameValid));
    phoneField.setAttribute('aria-invalid', String(!phoneValid));
    document.getElementById('prenom-error').textContent = nameValid ? '' : 'Saisissez un prénom fictif d’au moins deux lettres.';
    document.getElementById('telephone-error').textContent = phoneValid ? '' : 'Utilisez un mobile fictif au format 06 00 00 00 00 ou 07 00 00 00 00.';
    if (!nameValid || !phoneValid) {
      (nameValid ? phoneField : nameField).focus();
      announce('Les coordonnées fictives sont à corriger.'); return;
    }
    if (!state.date || !slotsFor(state.date).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; updateSummary(); showStep(2);
      document.getElementById('slot-error').textContent = 'Ce créneau est passé. Choisissez une autre heure fictive.'; return;
    }
    document.getElementById('success-recap').textContent = `${services[state.service].name} · ${durationLabel(services[state.service].duration)} · ${dayFormatter.format(dateFromKey(state.date))} à ${timeLabel(state.time)}.`;
    form.hidden = true; success.hidden = false;
    if (!keyboard && !reducedMotion.matches) {
      success.classList.add('changing');
      requestAnimationFrame(() => requestAnimationFrame(() => success.classList.remove('changing')));
    }
    navigation.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    nameField.value = ''; phoneField.value = '';
    focusTitle(document.getElementById('titre-fin'));
    announce('Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé.');
  });
  document.getElementById('restart').addEventListener('click', () => {
    form.reset(); state.service = 'tradition'; state.date = ''; state.time = null; state.reached = 0;
    [nameField, phoneField].forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    updateSummary(); showStep(0);
  });
  updateSummary();

  // Les raccourcis laissent le carnet et le pied de page entièrement accessibles.
  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      const hide = [...visibility.values()].some(Boolean);
      mobileBar.classList.toggle('is-hidden', hide);
      mobileBar.inert = hide;
    }, { threshold: 0 });
    [document.querySelector('.hero-bottom'), document.querySelector('.booking-section'), document.querySelector('.footer')].forEach(element => barObserver.observe(element));
  }
})();
