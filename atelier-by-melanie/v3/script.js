document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const form = document.querySelector('#booking-form');
const panels = [...document.querySelectorAll('[data-step-panel]')];
const dayOptions = document.querySelector('#day-options');
const slotOptions = document.querySelector('#slot-options');
const liveRegion = document.querySelector('#booking-live');
const success = document.querySelector('#booking-success');
const state = { service: null, day: null, time: null, activeStep: 1, transition: 0 };

function startEntrance() {
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startEntrance, { once: true });
} else {
  startEntrance();
}

const revealItems = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const serviceInputs = [...document.querySelectorAll('input[name="service"]')];
const nextButtons = [...document.querySelectorAll('[data-next]')];
const panelsByStep = new Map(panels.map((panel) => [Number(panel.dataset.stepPanel), panel]));
const summary = {
  service: document.querySelector('#summary-service'),
  day: document.querySelector('#summary-day'),
  time: document.querySelector('#summary-time'),
  price: document.querySelector('#summary-price'),
  edit: document.querySelector('#selection-edit')
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function localISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dateFromISO(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function formatLongDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(dateFromISO(iso));
}

function formatShortDate(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short'
  }).format(dateFromISO(iso)).replace('.', '');
}

function currentService() {
  const chosen = serviceInputs.find((input) => input.checked);
  if (!chosen) return null;
  return {
    id: chosen.value,
    title: chosen.dataset.title,
    minutes: Number(chosen.dataset.duration),
    price: Number(chosen.dataset.price)
  };
}

function renderSummary() {
  summary.service.textContent = state.service ? state.service.title : 'À choisir';
  summary.day.textContent = state.day ? formatLongDate(state.day) : 'À choisir';
  summary.time.textContent = state.time || 'À choisir';
  summary.price.textContent = state.service ? `${state.service.price} € · indicatif` : '—';
  renderEditButtons();
  updateConfirmationRecap();
}

function renderEditButtons() {
  summary.edit.replaceChildren();
  const editSteps = [];
  if (state.service) editSteps.push([1, 'Modifier la prestation']);
  if (state.day) editSteps.push([2, 'Modifier le jour']);
  if (state.time) editSteps.push([3, 'Modifier l’heure']);
  editSteps.forEach(([step, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.editStep = String(step);
    button.textContent = label;
    summary.edit.append(button);
  });
  summary.edit.hidden = editSteps.length === 0;
}

function updateConfirmationRecap() {
  const recap = document.querySelector('#confirmation-recap');
  if (!recap) return;
  recap.replaceChildren();
  const rows = [
    ['Prestation', state.service?.title || 'À choisir'],
    ['Jour', state.day ? formatLongDate(state.day) : 'À choisir'],
    ['Heure', state.time || 'À choisir'],
    ['Prix indicatif', state.service ? `${state.service.price} €` : '—']
  ];
  rows.forEach(([label, value]) => {
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    recap.append(term, detail);
  });
}

function scheduleFor(date) {
  const weekday = date.getDay();
  if ([1, 2, 4, 5].includes(weekday)) return { open: 9 * 60, close: 18 * 60 + 30 };
  if (weekday === 6) return { open: 8 * 60 + 30, close: 17 * 60 + 30 };
  return null;
}

function createDayButton(date) {
  const iso = localISO(date);
  const open = Boolean(scheduleFor(date));
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'day-option';
  button.dataset.date = iso;
  button.disabled = !open;
  button.setAttribute('aria-pressed', String(state.day === iso));
  button.setAttribute('aria-label', `${formatLongDate(iso)}${open ? '' : ', fermé selon les horaires indicatifs'}`);

  const name = document.createElement('span');
  name.className = 'day-option__name';
  name.textContent = weekday;
  const day = document.createElement('span');
  day.className = 'day-option__date';
  day.textContent = pad(date.getDate());
  button.append(name, day);
  if (!open) {
    const closed = document.createElement('span');
    closed.className = 'day-option__state';
    closed.textContent = 'fermé';
    button.append(closed);
  }
  return button;
}

function renderDays() {
  dayOptions.replaceChildren();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + offset);
    dayOptions.append(createDayButton(date));
  }
}

function isPseudoBooked(iso, minutes) {
  const seed = `${iso}${minutes}`;
  let hash = 17;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 9973;
  }
  return hash % 7 === 0 || hash % 11 === 0;
}

function renderSlots() {
  slotOptions.replaceChildren();
  if (!state.day || !state.service) return;
  const date = dateFromISO(state.day);
  const hours = scheduleFor(date);
  if (!hours) return;

  const now = new Date();
  const today = localISO(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12));
  let count = 0;
  for (let minutes = hours.open; minutes + state.service.minutes <= hours.close; minutes += 30) {
    const isoTime = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    const isPast = state.day === today && minutes <= now.getHours() * 60 + now.getMinutes();
    const isTaken = !isPast && isPseudoBooked(state.day, minutes);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot-option';
    button.dataset.time = isoTime;
    button.disabled = isPast || isTaken;
    button.setAttribute('aria-pressed', String(state.time === isoTime));

    const time = document.createElement('span');
    time.textContent = `${Math.floor(minutes / 60)}\u00a0h\u00a0${pad(minutes % 60)}`;
    button.append(time);
    if (isTaken || isPast) {
      const status = document.createElement('span');
      status.className = 'slot-option__state';
      status.textContent = isPast ? 'passé' : 'déjà pris';
      button.append(status);
    }
    if (!button.disabled) count += 1;
    slotOptions.append(button);
  }

  if (count === 0) {
    const empty = document.createElement('p');
    empty.className = 'slot-empty';
    empty.textContent = 'Aucun créneau restant pour ce jour. Choisissez une autre date.';
    slotOptions.append(empty);
  }
}

function updateNextState() {
  const checks = {
    2: Boolean(state.service),
    3: Boolean(state.day),
    4: Boolean(state.time)
  };
  nextButtons.forEach((button) => {
    button.disabled = !checks[Number(button.dataset.next)];
  });
}

function changeStep(step, animate = true) {
  const nextStep = Number(step);
  const panel = panelsByStep.get(nextStep);
  if (!panel || nextStep === state.activeStep) return;
  if (nextStep > 1 && !state.service) return;
  if (nextStep > 2 && !state.day) return;
  if (nextStep > 3 && !state.time) return;

  const shouldAnimate = animate && !reducedMotion.matches;
  const transitionId = ++state.transition;
  const previousPanels = panels.filter((item) => !item.hidden && item !== panel);
  state.activeStep = nextStep;
  panel.hidden = false;
  panel.inert = false;
  panel.classList.remove('is-leaving');
  panel.classList.toggle('is-entering', shouldAnimate);
  previousPanels.forEach((item) => {
    item.inert = true;
    item.classList.remove('is-entering');
    item.classList.toggle('is-leaving', shouldAnimate);
  });

  if (nextStep === 3) renderSlots();
  if (nextStep === 4) updateConfirmationRecap();
  document.querySelector('#step-progress').textContent = `Étape ${nextStep} sur 4`;
  liveRegion.textContent = `Étape ${nextStep} sur 4. ${panel.querySelector('h3').textContent}`;
  panel.querySelector('h3').focus();

  const finishTransition = () => {
    if (shouldAnimate && transitionId !== state.transition) return;
    previousPanels.forEach((item) => {
      item.hidden = true;
      item.inert = false;
      item.classList.remove('is-leaving');
    });
    panel.classList.remove('is-entering');
  };

  if (shouldAnimate) {
    requestAnimationFrame(() => panel.classList.remove('is-entering'));
    window.setTimeout(finishTransition, 250);
  } else {
    finishTransition();
  }
}

function announce(message) {
  liveRegion.textContent = message;
}

function updateError(input, error, invalid, message) {
  error.hidden = !invalid;
  input.setAttribute('aria-invalid', String(invalid));
  if (message) error.textContent = message;
}

function validFrenchMobile(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0033')) digits = `33${digits.slice(4)}`;
  if (digits.startsWith('33')) return /^33[67]\d{8}$/.test(digits);
  return /^0[67]\d{8}$/.test(digits);
}

function icsDate(iso, time) {
  const [year, month, day] = iso.split('-');
  const [hour, minute] = time.split(':');
  return `${year}${month}${day}T${hour}${minute}00`;
}

function escapeICS(value) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function makeCalendarFile() {
  const start = dateFromISO(state.day);
  const [hour, minute] = state.time.split(':').map(Number);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + state.service.minutes * 60000);
  const endISO = localISO(end);
  const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  const summaryText = `Rendez-vous coiffure — ${state.service.title}`;
  const description = 'Créneau ajouté depuis un aperçu non officiel. Réservation non transmise au salon.';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Studio Lamy//Apercu reservation//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(16).slice(2)}@studiolamy.local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART;TZID=Europe/Paris:${icsDate(state.day, state.time)}`,
    `DTEND;TZID=Europe/Paris:${icsDate(endISO, endTime)}`,
    `SUMMARY:${escapeICS(summaryText)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    'LOCATION:15 avenue Franklin Roosevelt\\, 83000 Toulon',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.querySelector('#calendar-link');
  if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.dataset.url = url;
}

function completeSimulation() {
  const firstName = document.querySelector('#first-name');
  const phone = document.querySelector('#phone');
  const firstNameError = document.querySelector('#first-name-error');
  const phoneError = document.querySelector('#phone-error');
  const name = firstName.value.trim();
  const nameInvalid = name.length < 2;
  const phoneInvalid = !validFrenchMobile(phone.value.trim());
  updateError(firstName, firstNameError, nameInvalid);
  updateError(phone, phoneError, phoneInvalid);

  if (nameInvalid || phoneInvalid) {
    announce('Vérifiez les champs indiqués avant de continuer.');
    (nameInvalid ? firstName : phone).focus();
    return;
  }

  const title = document.querySelector('#success-title');
  const copy = document.querySelector('#success-copy');
  title.textContent = `Merci, ${name}.`;
  copy.textContent = `La simulation présente ${state.service.title.toLowerCase()}, le ${formatLongDate(state.day)} à ${state.time}, pour ${state.service.price} €. Ce tarif et le créneau sont indicatifs et à confirmer avec le salon.`;
  makeCalendarFile();
  form.hidden = true;
  success.hidden = false;
  document.querySelector('.selection-summary').classList.add('is-complete');
  summary.edit.hidden = true;
  document.querySelector('#mobile-book-label').textContent = 'Voir la confirmation';
  document.querySelector('.mobile-booking a').href = '#booking-success';
  title.focus();
  announce('Simulation prête. Rien n’a été envoyé ni réservé.');
}

function handleServiceChange(event) {
  const next = currentService();
  if (!next) return;
  const didChange = state.service?.id !== next.id;
  state.service = next;
  if (didChange) {
    state.day = null;
    state.time = null;
    renderDays();
    slotOptions.replaceChildren();
    document.querySelector('#day-options').querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  }
  updateNextState();
  renderSummary();
  announce(`${state.service.title} choisie. Durée et prix indicatifs.`);
}

form.addEventListener('change', (event) => {
  if (event.target.matches('input[name="service"]')) handleServiceChange(event);
});

dayOptions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-date]');
  if (!button || button.disabled) return;
  state.day = button.dataset.date;
  state.time = null;
  dayOptions.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelector('#day-error').hidden = true;
  updateNextState();
  renderSummary();
  announce(`${formatLongDate(state.day)} choisi.`);
});

slotOptions.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-time]');
  if (!button || button.disabled) return;
  state.time = button.dataset.time;
  slotOptions.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelector('#slot-error').hidden = true;
  updateNextState();
  renderSummary();
  announce(`${state.time} choisi.`);
});

form.addEventListener('click', (event) => {
  const next = event.target.closest('[data-next]');
  const back = event.target.closest('[data-back]');
  if (next && !next.disabled) changeStep(next.dataset.next, event.detail > 0);
  if (back) changeStep(back.dataset.back, event.detail > 0);
});

summary.edit.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit-step]');
  if (button) changeStep(button.dataset.editStep, event.detail > 0);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!state.service || !state.day || !state.time) {
    announce('Complétez les étapes de réservation avant de confirmer.');
    return;
  }
  completeSimulation();
});

const firstNameInput = document.querySelector('#first-name');
const phoneInput = document.querySelector('#phone');
firstNameInput.addEventListener('input', () => {
  if (firstNameInput.getAttribute('aria-invalid') === 'true') {
    updateError(firstNameInput, document.querySelector('#first-name-error'), firstNameInput.value.trim().length < 2);
  }
});
phoneInput.addEventListener('input', () => {
  if (phoneInput.getAttribute('aria-invalid') === 'true') {
    updateError(phoneInput, document.querySelector('#phone-error'), !validFrenchMobile(phoneInput.value.trim()));
  }
});

renderDays();
renderSummary();
updateNextState();
