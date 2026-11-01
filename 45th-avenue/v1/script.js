'use strict';

document.documentElement.classList.add('js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let keyboardInput = false;
document.addEventListener('keydown', () => {
  keyboardInput = true;
  document.documentElement.classList.add('keyboard-input');
});
document.addEventListener('pointerdown', () => {
  keyboardInput = false;
  document.documentElement.classList.remove('keyboard-input');
}, { passive: true });
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

const revealElements = document.querySelectorAll('[data-reveal], .reveal-group');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    let rowIndex = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (entry.target.dataset.reveal === 'row' && !reduceMotion.matches) {
        entry.target.style.transitionDelay = `${Math.min(rowIndex++, 3) * 60}ms`;
      }
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .08 });
  revealElements.forEach(element => observer.observe(element));
} else {
  revealElements.forEach(element => element.classList.add('is-visible'));
}

const SERVICES = [
  { id: 'coiffage-court', name: 'Shampooing et coiffage', detail: 'Femme · cheveux courts', duration: 30, price: 30 },
  { id: 'coiffage-milong', name: 'Shampooing et coiffage', detail: 'Femme · cheveux mi-longs', duration: 35, price: 34 },
  { id: 'coiffage-long', name: 'Shampooing et coiffage', detail: 'Femme · cheveux longs', duration: 40, price: 38 },
  { id: 'coupe-court', name: 'Shampooing traitant, coupe et coiffage', detail: 'Femme · cheveux courts', duration: 30, price: 43 },
  { id: 'coupe-milong', name: 'Shampooing traitant, coupe et coiffage', detail: 'Femme · cheveux mi-longs', duration: 35, price: 48 },
  { id: 'couleur-court', name: 'Couleur, shampooing et coiffage', detail: 'Femme · cheveux courts', duration: 90, price: 67 },
  { id: 'couleur-milong', name: 'Couleur, shampooing et coiffage', detail: 'Femme · cheveux mi-longs', duration: 100, price: 74 },
  { id: 'homme', name: 'Shampooing, coupe et coiffage', detail: 'Homme', duration: 30, price: 30 },
  { id: 'homme-barbe', name: 'Shampooing, coupe, coiffage et barbe', detail: 'Homme', duration: 35, price: 35 },
  { id: 'barbe', name: 'Taille de barbe express', detail: 'Contours et mise en forme', duration: 15, price: 10 }
];
const HOURS = { 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [540, 1050] };
const state = { service: null, date: null, time: null, step: 1, complete: false };
const byId = id => document.getElementById(id);
const form = byId('booking-form');
const panels = Array.from(document.querySelectorAll('[data-panel]'));
const stepButtons = Array.from(document.querySelectorAll('[data-step]'));
const navigation = document.querySelector('.step-navigation');
const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
const SHORT_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
const SHORT_MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
let transitionSerial = 0;

function shopNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}
function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
function weekday(key) { return dateObject(key).getUTCDay(); }
function dateLabel(key) { return DATE_FORMAT.format(dateObject(key)); }
function nextDates() {
  const today = dateObject(shopNow().date);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}
function hourLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}\u00a0h${rest ? `\u00a0${String(rest).padStart(2, '0')}` : ''}`;
}
function durationLabel(minutes) { return minutes >= 60 ? hourLabel(minutes) : `${minutes}\u00a0min`; }
function priceLabel(price) { return `${price}\u00a0€`; }
function serviceLabel(service) { return `${service.name} · ${service.detail}`; }
function hash(value) { return Array.from(value).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7); }
function slotsFor(key, service, now = shopNow()) {
  const hours = HOURS[weekday(key)];
  if (!hours || !service || key < now.date) return [];
  const slots = [];
  for (let minute = hours[0]; minute + service.duration <= hours[1]; minute += 15) {
    const past = key === now.date && minute <= now.minutes;
    const taken = hash(`${key}-${minute}`) % 5 === 0;
    slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
  }
  return slots;
}
function chosenSlotAvailable() {
  return state.service && state.date && state.time !== null && nextDates().includes(state.date) &&
    slotsFor(state.date, state.service).some(slot => slot.minute === state.time && !slot.disabled);
}
function announce(message) { byId('booking-announcement').textContent = message; }
function updateNavigation() {
  stepButtons.forEach(button => {
    const step = Number(button.dataset.step);
    button.disabled = state.complete || (step >= 2 && !state.service) || (step >= 3 && !state.date) || (step >= 4 && state.time === null);
    if (step === state.step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}
function updateSummary() {
  byId('summary-service').textContent = state.service ? serviceLabel(state.service) : 'À choisir';
  byId('summary-date').textContent = state.date ? dateLabel(state.date) : 'À choisir';
  byId('summary-time').textContent = state.time === null ? 'À choisir' : hourLabel(state.time);
  byId('summary-price').textContent = state.service ? priceLabel(state.service.price) : '—';
  updateNavigation();
  if (state.service && state.date && state.time !== null) {
    byId('final-recap').textContent = `${serviceLabel(state.service)}. ${dateLabel(state.date)} à ${hourLabel(state.time)}. Durée : ${durationLabel(state.service.duration)}. Tarif Planity : ${priceLabel(state.service.price)}. Au 45 avenue de la République, Bordeaux. Simulation uniquement.`;
  }
}
function clearError(id) { byId(id).textContent = ''; }
function makeChoice({ name, value, title, detail = '', price, disabled = false, checked = false, extraClass = '', dateNumber = '', accessibleName = '' }) {
  const label = document.createElement('label');
  label.className = `choice ${extraClass}`;
  const input = document.createElement('input');
  input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled; input.checked = checked;
  if (accessibleName) input.setAttribute('aria-label', accessibleName);
  const errorIds = { prestation: 'service-error', jour: 'date-error', heure: 'time-error' };
  input.setAttribute('aria-describedby', errorIds[name]);
  const content = document.createElement('span');
  const heading = document.createElement('span'); heading.className = 'choice-title'; heading.textContent = title; content.append(heading);
  if (dateNumber) { const number = document.createElement('span'); number.className = 'date-number'; number.textContent = dateNumber; content.append(number); }
  if (detail) { const note = document.createElement('span'); note.className = 'choice-detail'; note.textContent = detail; content.append(note); }
  label.append(input, content);
  if (price !== undefined) { const amount = document.createElement('span'); amount.className = 'choice-price'; amount.textContent = priceLabel(price); label.append(amount); }
  return label;
}
function renderServices() {
  const fragment = document.createDocumentFragment();
  SERVICES.forEach(service => fragment.append(makeChoice({
    name: 'prestation', value: service.id, title: service.name, detail: `${service.detail} · ${durationLabel(service.duration)}`, price: service.price, checked: state.service?.id === service.id
  })));
  byId('service-options').replaceChildren(fragment);
}
function renderDates() {
  const fragment = document.createDocumentFragment();
  nextDates().forEach(key => {
    const date = dateObject(key);
    const closed = !HOURS[weekday(key)];
    const available = slotsFor(key, state.service).some(slot => !slot.disabled);
    const note = closed ? (weekday(key) === 1 ? 'Appeler le salon' : 'Fermé') : !available ? 'Plus de créneau' : SHORT_MONTH.format(date);
    fragment.append(makeChoice({ name: 'jour', value: key, title: SHORT_DAY.format(date), detail: note, disabled: closed || !available, checked: state.date === key, dateNumber: String(date.getUTCDate()), extraClass: 'date-choice', accessibleName: `${dateLabel(key)} · ${note}` }));
  });
  byId('date-options').replaceChildren(fragment);
}
function renderTimes() {
  const fragment = document.createDocumentFragment();
  const slots = slotsFor(state.date, state.service);
  slots.forEach(slot => fragment.append(makeChoice({ name: 'heure', value: String(slot.minute), title: hourLabel(slot.minute), detail: slot.reason, disabled: slot.disabled, checked: state.time === slot.minute, extraClass: 'time-choice', accessibleName: `${hourLabel(slot.minute)}${slot.reason ? ` · ${slot.reason}` : ' · créneau de simulation'}` })));
  byId('time-options').replaceChildren(fragment);
  const opening = HOURS[weekday(state.date)];
  byId('slot-context').textContent = `${dateLabel(state.date)} · ${durationLabel(state.service.duration)} · ouverture de ${hourLabel(opening[0])} à ${hourLabel(opening[1])}.`;
  if (!slots.some(slot => !slot.disabled)) {
    byId('time-error').textContent = 'Il ne reste plus d’heure pour cet essai. Revenez à l’étape Jour pour choisir une autre date.';
  }
}
function showStep(step, focus = true) {
  const serial = ++transitionSerial;
  state.step = step;
  if (step === 2) renderDates();
  if (step === 3) renderTimes();
  updateSummary();
  const incoming = panels.find(panel => Number(panel.dataset.panel) === step);
  panels.forEach(panel => { panel.hidden = panel !== incoming; panel.classList.remove('is-entering'); });
  if (!reduceMotion.matches && !keyboardInput && focus) {
    incoming.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (serial === transitionSerial) incoming.classList.remove('is-entering');
    }));
  }
  if (focus) {
    incoming.querySelector('h3').focus({ preventScroll: true });
    const readingStart = window.matchMedia('(max-width: 760px)').matches ? byId('parcours') : incoming;
    readingStart.scrollIntoView({ behavior: 'instant', block: 'start' });
    announce(`Étape ${step} sur 4 : ${incoming.querySelector('h3').textContent}`);
  }
}
function chooseService(id) {
  const service = SERVICES.find(item => item.id === id);
  if (!service) return;
  if (state.service?.id !== id) { state.date = null; state.time = null; }
  state.service = service;
  clearError('service-error'); clearError('date-error'); clearError('time-error');
  updateSummary();
}
function validateStep(step) {
  if (step === 1 && !state.service) {
    byId('service-error').textContent = 'Choisissez une prestation pour continuer.';
    byId('service-options').querySelector('input').focus();
    return false;
  }
  if (step === 2 && (!state.date || !nextDates().includes(state.date) || !slotsFor(state.date, state.service).some(slot => !slot.disabled))) {
    state.date = null; state.time = null; updateSummary(); renderDates();
    byId('date-error').textContent = 'Choisissez un jour avec une heure disponible pour cet essai.';
    byId('date-options').querySelector('input:not(:disabled)')?.focus();
    return false;
  }
  if (step === 3 && !chosenSlotAvailable()) {
    state.time = null; updateSummary(); renderTimes();
    byId('time-error').textContent = 'Choisissez une heure disponible pour continuer.';
    byId('time-options').querySelector('input:not(:disabled)')?.focus();
    return false;
  }
  return true;
}
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    if (state.complete) resetBooking(false);
    chooseService(button.dataset.service);
    renderServices();
    showStep(1, false);
    byId('reserver').scrollIntoView({ behavior: reduceMotion.matches || keyboardInput ? 'instant' : 'smooth', block: 'start' });
    byId('etape-1').focus({ preventScroll: true });
    announce('Prestation présélectionnée. Vérifiez la longueur puis choisissez le jour.');
  });
});
form.addEventListener('change', event => {
  const input = event.target;
  if (input.name === 'prestation') chooseService(input.value);
  if (input.name === 'jour') { state.date = input.value; state.time = null; clearError('date-error'); clearError('time-error'); updateSummary(); }
  if (input.name === 'heure') { state.time = Number(input.value); clearError('time-error'); updateSummary(); }
});
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
  if (validateStep(state.step)) showStep(Number(button.dataset.next));
}));
stepButtons.forEach(button => button.addEventListener('click', () => {
  if (!button.disabled) showStep(Number(button.dataset.step));
}));
function validateName() {
  const value = byId('prenom').value.trim();
  const valid = value.length >= 1 && /\p{L}/u.test(value);
  byId('prenom').setAttribute('aria-invalid', String(!valid));
  byId('prenom-error').textContent = valid ? '' : 'Indiquez un prénom d’exemple contenant au moins une lettre.';
  return valid;
}
function validatePhone() {
  const value = byId('telephone').value.replace(/[\s.()\-]/g, '');
  const valid = /^(?:0|\+33|0033)[67]\d{8}$/.test(value);
  byId('telephone').setAttribute('aria-invalid', String(!valid));
  byId('telephone-error').textContent = valid ? '' : 'Indiquez un mobile français d’exemple, comme 06 00 00 00 00.';
  return valid;
}
[['prenom', validateName], ['telephone', validatePhone]].forEach(([id, validate]) => {
  byId(id).addEventListener('blur', validate);
  byId(id).addEventListener('input', () => { if (byId(id).getAttribute('aria-invalid') === 'true') validate(); });
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (state.step !== 4) { if (validateStep(state.step)) showStep(state.step + 1); return; }
  if (!chosenSlotAvailable()) { showStep(2); announce('L’heure choisie a passé. Veuillez choisir un nouveau jour et une nouvelle heure.'); return; }
  const nameValid = validateName();
  const phoneValid = validatePhone();
  if (!nameValid || !phoneValid) { byId(nameValid ? 'telephone' : 'prenom').focus(); announce('Vérifiez les coordonnées d’exemple indiquées.'); return; }
  state.complete = true;
  form.hidden = true; navigation.hidden = true;
  byId('success-recap').textContent = `${byId('prenom').value.trim()}, votre essai : ${serviceLabel(state.service)}, ${dateLabel(state.date)} à ${hourLabel(state.time)}. ${durationLabel(state.service.duration)}, ${priceLabel(state.service.price)} selon Planity. Au 45 avenue de la République, Bordeaux.`;
  byId('booking-success').hidden = false;
  byId('titre-resultat').focus({ preventScroll: true });
  byId('booking-success').scrollIntoView({ behavior: 'instant', block: 'start' });
  updateSummary();
  announce('Simulation terminée. Aucun rendez-vous n’a été réservé et aucune donnée n’a été envoyée.');
});
function resetBooking(focus = true) {
  state.service = null; state.date = null; state.time = null; state.complete = false;
  form.reset(); form.hidden = false; navigation.hidden = false;
  byId('booking-success').hidden = true;
  ['service-error', 'date-error', 'time-error', 'prenom-error', 'telephone-error'].forEach(clearError);
  ['prenom', 'telephone'].forEach(id => byId(id).removeAttribute('aria-invalid'));
  renderServices(); showStep(1, focus);
}
byId('restart').addEventListener('click', () => resetBooking());
renderServices();
byId('parcours').hidden = false;
showStep(1, false);
