'use strict';

// Horaires et durées : dossier fourni, source Planity ; voir SOURCES.md.
const SERVICES = {
  lissage: { name: 'Lissage sur mesure', duration: 180 },
  soin: { name: 'Soin disciplinant', duration: 135 }
};
const HOURS = {
  0: [], 1: [],
  2: [[540, 780], [840, 1140]],
  3: [[540, 720], [840, 1140]],
  4: [[540, 750], [840, 1140]],
  5: [[540, 780], [840, 1140]],
  6: [[540, 780]]
};

function parisNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
}

function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function displayDate(key) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(dateObject(key));
}
function displayTime(minute) {
  const remainder = minute % 60;
  return `${Math.floor(minute / 60)}\u00a0h${remainder ? `\u00a0${String(remainder).padStart(2, '0')}` : ''}`;
}
function getSlots(key, serviceId, now = new Date()) {
  if (!SERVICES[serviceId]) return [];
  const today = parisNow(now);
  if (key < today.date) return [];
  const weekday = dateObject(key).getUTCDay();
  const slots = [];
  for (const [start, end] of HOURS[weekday]) {
    for (let minute = start; minute + SERVICES[serviceId].duration <= end; minute += 30) {
      if (key === today.date && minute <= today.minute) continue;
      slots.push({ minute, unavailable: (Number(key.slice(-2)) * 3 + minute / 30) % 7 === 0 });
    }
  }
  // L’indisponibilité est illustrative : conserver au moins un choix par jour.
  if (slots.length && slots.every(slot => slot.unavailable)) slots[0].unavailable = false;
  return slots;
}
function validPhone(value) { return /^(?:0|\+33|0033)[1-9]\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }

function init() {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  let keyboard = false;
  root.classList.add('js');
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-visible')));
  // Le contenu redevient immédiatement visible si l’observation n’est pas prise en charge.
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: .12 });
    reveals.forEach(element => observer.observe(element));
    reduced.addEventListener('change', event => {
      if (event.matches) { reveals.forEach(element => element.classList.add('is-visible')); observer.disconnect(); }
    });
  } else reveals.forEach(element => element.classList.add('is-visible'));

  const state = { service: '', date: '', time: null, step: 0 };
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const error = document.querySelector('#booking-error');
  const announcement = document.querySelector('#booking-announcement');
  const summaryService = document.querySelector('#recap-service');
  const summaryDate = document.querySelector('#recap-date');
  const summaryTime = document.querySelector('#recap-time');
  const mobileSummary = document.querySelector('#mobile-recap');
  const daysGrid = document.querySelector('#days-grid');
  const slotsGrid = document.querySelector('#slots-grid');
  const success = document.querySelector('#booking-success');
  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  document.querySelector('#parcours').hidden = false;

  function updateSummary() {
    summaryService.textContent = SERVICES[state.service]?.name || 'À choisir';
    summaryDate.textContent = state.date ? displayDate(state.date) : 'À choisir';
    summaryTime.textContent = state.time !== null ? displayTime(state.time) : 'À choisir';
    mobileSummary.textContent = [SERVICES[state.service]?.name || 'Prestation à choisir', state.date ? displayDate(state.date) : 'Jour à choisir', state.time !== null ? displayTime(state.time) : 'Heure à choisir'].join(' · ');
    steps.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.date) || (index > 2 && state.time === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const bounds = heading.getBoundingClientRect();
    const topLimit = window.matchMedia('(max-width: 700px)').matches ? 112 : 24;
    if (bounds.top < topLimit || bounds.bottom > window.innerHeight - 100) {
      heading.scrollIntoView({ block: 'start', behavior: keyboard || reduced.matches ? 'instant' : 'smooth' });
    }
  }

  function showStep(index, moveFocus = true) {
    state.step = index;
    error.textContent = '';
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, position) => {
      panel.hidden = position !== index;
      panel.classList.remove('is-entering', 'is-leaving');
    });
    const panel = panels[index];
    if (!reduced.matches && !keyboard) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }
    updateSummary();
    announcement.textContent = `Étape ${index + 1} sur 4 : ${panel.querySelector('h3').textContent}`;
    if (moveFocus) focusHeading(panel.querySelector('h3'));
  }

  function renderDays() {
    daysGrid.replaceChildren();
    const today = parisNow();
    const first = dateObject(today.date);
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(first);
      day.setUTCDate(first.getUTCDate() + offset);
      const key = dateKey(day);
      const closed = !HOURS[day.getUTCDay()].length;
      const unavailable = !getSlots(key, state.service).some(slot => !slot.unavailable);
      const label = document.createElement('label');
      label.className = 'day-option';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = key;
      radio.checked = state.date === key;
      radio.disabled = closed || unavailable;
      radio.setAttribute('aria-label', `${displayDate(key)}${closed ? ', fermé' : unavailable ? ', aucun créneau dans cet essai' : ''}`);
      const face = document.createElement('span');
      face.className = 'day-face';
      const weekday = document.createElement('small');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(day);
      const number = document.createElement('strong'); number.textContent = String(day.getUTCDate());
      const month = document.createElement('small');
      month.textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).format(day);
      const status = document.createElement('span');
      status.textContent = closed ? 'Fermé' : unavailable ? 'Écoulé' : 'Essai';
      face.append(weekday, number, month, status); label.append(radio, face); daysGrid.append(label);
    }
  }

  function renderSlots() {
    slotsGrid.replaceChildren();
    const slots = getSlots(state.date, state.service);
    if (!slots.some(slot => slot.minute === state.time && !slot.unavailable)) state.time = null;
    for (const slot of slots) {
      const label = document.createElement('label'); label.className = 'slot-option';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = String(slot.minute);
      radio.disabled = slot.unavailable; radio.checked = state.time === slot.minute;
      radio.setAttribute('aria-label', `${displayTime(slot.minute)}${slot.unavailable ? ', écarté pour l’essai' : ', créneau fictif'}`);
      const face = document.createElement('span');
      const text = document.createElement('span'); text.textContent = displayTime(slot.minute); face.append(text);
      if (slot.unavailable) {
        const note = document.createElement('small'); note.textContent = 'Écarté pour l’essai'; face.append(note);
      }
      label.append(radio, face); slotsGrid.append(label);
    }
    if (!slots.length) {
      const note = document.createElement('p');
      note.textContent = 'Les horaires de ce jour sont écoulés. Choisissez un autre jour pour poursuivre l’essai.';
      slotsGrid.append(note);
    }
    updateSummary();
  }

  function chooseService(value) {
    if (state.service !== value) { state.service = value; state.date = ''; state.time = null; }
    form.querySelectorAll('input[name="prestation"]').forEach(radio => { radio.checked = radio.value === value; });
    updateSummary();
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') { state.date = input.value; state.time = null; updateSummary(); }
    if (input.name === 'heure') { state.time = Number(input.value); updateSummary(); }
    error.textContent = '';
  });

  function validateStep() {
    if (!state.service) { error.textContent = 'Choisissez une prestation pour continuer.'; return false; }
    if (state.step >= 1 && !state.date) { error.textContent = 'Choisissez un jour pour continuer.'; return false; }
    if (state.step >= 2 && state.time === null) { error.textContent = 'Choisissez une heure pour continuer.'; return false; }
    if (state.step >= 2 && !getSlots(state.date, state.service).some(slot => slot.minute === state.time && !slot.unavailable)) {
      state.time = null; renderSlots(); updateSummary();
      error.textContent = 'Ce créneau est maintenant écoulé. Choisissez une autre heure ou un autre jour.';
      return false;
    }
    return true;
  }

  form.addEventListener('click', event => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    if (next && validateStep()) showStep(Number(next.dataset.next));
    if (back) showStep(Number(back.dataset.back));
  });
  steps.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    success.hidden = true; form.hidden = false; document.querySelector('.step-nav').hidden = false;
    chooseService(link.dataset.service);
    showStep(0);
  }));

  function fieldError(field, message) {
    document.querySelector(`#erreur-${field.id}`).textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
  }
  [firstName, phone].forEach(field => field.addEventListener('input', () => fieldError(field, '')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!validateStep()) { showStep(2); error.textContent = 'Choisissez à nouveau un créneau pour poursuivre l’essai.'; return; }
    const nameValid = /\p{L}/u.test(firstName.value.trim());
    const phoneValid = validPhone(phone.value);
    fieldError(firstName, nameValid ? '' : 'Indiquez un prénom pour terminer l’essai.');
    fieldError(phone, phoneValid ? '' : 'Indiquez un numéro français de 10 chiffres, ou au format +33.');
    if (!nameValid || !phoneValid) {
      announcement.textContent = 'Vérifiez les coordonnées indiquées.';
      (nameValid ? phone : firstName).focus(); return;
    }
    const recap = `${SERVICES[state.service].name}, ${displayDate(state.date)} à ${displayTime(state.time)} : votre sélection d’essai est complète.`;
    document.querySelector('#success-recap').textContent = recap;
    form.hidden = true; document.querySelector('.step-nav').hidden = true; success.hidden = false;
    firstName.value = ''; phone.value = '';
    announcement.textContent = 'Simulation terminée. Aucun rendez-vous n’a été réservé et rien n’a été envoyé.';
    focusHeading(document.querySelector('#titre-fin'));
  });

  document.querySelector('#restart').addEventListener('click', () => {
    state.service = ''; state.date = ''; state.time = null;
    form.reset(); [firstName, phone].forEach(field => fieldError(field, ''));
    success.hidden = true; form.hidden = false; document.querySelector('.step-nav').hidden = false;
    showStep(0);
  });
  updateSummary();

  // La barre mobile se retire quand les actions principales sont déjà visibles.
  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const heroAction = entry.target.matches('.hero-bottom .button');
        const inView = entry.isIntersecting && (!heroAction || entry.intersectionRatio >= .8);
        if (inView) visible.add(entry.target); else visible.delete(entry.target);
      });
      const hide = visible.size > 0;
      mobileBar.classList.toggle('is-hidden', hide);
      mobileBar.inert = hide;
    }, { threshold: [0, .8] });
    ['.hero-bottom .button', '#reserver', '#pied-page'].forEach(selector => barObserver.observe(document.querySelector(selector)));
  }
}

if (typeof document !== 'undefined') init();
if (typeof module !== 'undefined') module.exports = { SERVICES, HOURS, parisNow, getSlots, validPhone, displayTime };
