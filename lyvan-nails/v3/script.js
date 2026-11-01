document.documentElement.classList.add('js');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const menuButton = document.querySelector('.menu-toggle');
const mainNavigation = document.querySelector('.main-nav');

function closeNavigation(returnFocus = false) {
  if (!menuButton || !mainNavigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Ouvrir le menu');
  mainNavigation.classList.remove('is-open');
  if (returnFocus) menuButton.focus();
}

if (menuButton && mainNavigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    mainNavigation.classList.toggle('is-open', open);
  });
  mainNavigation.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    closeNavigation();
    const target = link.hash ? document.querySelector(link.hash) : null;
    const heading = target?.querySelector('h1, h2, h3');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeNavigation(true);
  });
}

requestAnimationFrame(() => document.documentElement.classList.add('hero-ready'));

const revealItems = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window && !reducedMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -4% 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const stickyBar = document.querySelector('.mobile-sticky');
const heroActions = document.querySelector('.hero-actions');
const bookingSection = document.querySelector('#reserver');
const footer = document.querySelector('.site-footer');
if (stickyBar && heroActions && 'IntersectionObserver' in window) {
  let heroHasPassed = false;
  let bookingIsVisible = false;
  let footerIsVisible = false;
  const updateStickyBar = () => {
    stickyBar.classList.toggle('is-visible', heroHasPassed && !bookingIsVisible && !footerIsVisible);
  };
  const heroObserver = new IntersectionObserver(([entry]) => {
    heroHasPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    updateStickyBar();
  }, { threshold: 0.01 });
  heroObserver.observe(heroActions);
  const lowerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === bookingSection) bookingIsVisible = entry.isIntersecting;
      if (entry.target === footer) footerIsVisible = entry.isIntersecting;
    });
    updateStickyBar();
  }, { threshold: 0.03 });
  if (bookingSection) lowerObserver.observe(bookingSection);
  if (footer) lowerObserver.observe(footer);
}

const services = {
  'manucure-classique': { name: 'Manucure vernis classique', duration: 30, price: `28\u00a0€` },
  'manucure-semi': { name: 'Manucure semi-permanent', duration: 30, price: `35\u00a0€` },
  'extensions-gel': { name: 'Extensions capsules gel et vernis semi-permanent', duration: 45, price: `50\u00a0€` },
  'beaute-pieds': { name: 'Beauté des pieds', duration: 45, price: `30\u00a0€` },
  'decoration-3d': { name: 'Décoration 3D', duration: 15, price: `dès 4\u00a0€` }
};

const state = { service: '', date: null, time: '', step: 1, calendarUrl: '' };
const panels = [...document.querySelectorAll('[data-panneau]')];
const progressButtons = [...document.querySelectorAll('[data-etape-cible]')];
const announceStep = document.querySelector('#annonce-etape');
const errorMessages = {
  service: document.querySelector('#erreur-prestation'),
  day: document.querySelector('#erreur-jour'),
  time: document.querySelector('#erreur-heure'),
  contact: document.querySelector('#erreur-coordonnees'),
  firstName: document.querySelector('#erreur-prenom'),
  phone: document.querySelector('#erreur-telephone')
};

const recap = {
  service: document.querySelector('#recap-prestation'),
  day: document.querySelector('#recap-jour'),
  time: document.querySelector('#recap-heure'),
  price: document.querySelector('#recap-tarif')
};

function announce(message) {
  if (announceStep) announceStep.textContent = message;
}

function selectedService() {
  return services[state.service] || null;
}

function formatDay(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function updateRecap() {
  const service = selectedService();
  if (recap.service) recap.service.textContent = service ? service.name : 'À choisir';
  if (recap.day) recap.day.textContent = state.date ? formatDay(state.date) : 'À choisir';
  if (recap.time) recap.time.textContent = state.time || 'À choisir';
  if (recap.price) recap.price.textContent = service ? `Planity · ${service.price}` : 'À confirmer';
  const finalRecap = document.querySelector('#recap-final');
  if (finalRecap && service && state.date && state.time) {
    finalRecap.textContent = `${service.name} · ${formatDay(state.date)} à ${state.time} · tarif Planity ${service.price}.`;
  } else if (finalRecap) {
    finalRecap.textContent = 'Choisissez une prestation, un jour et une heure pour voir le récapitulatif.';
  }
}

function canVisitStep(step) {
  if (step === 1) return true;
  if (!state.service) return false;
  if (step === 2) return true;
  if (!state.date) return false;
  if (step === 3) return true;
  if (!state.time) return false;
  return step === 4;
}

function updateProgress() {
  progressButtons.forEach((button) => {
    const step = Number(button.dataset.etapeCible);
    button.disabled = !canVisitStep(step);
    if (step === state.step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}

function setStep(step, moveFocus = true) {
  if (!canVisitStep(step)) return;
  state.step = step;
  panels.forEach((panel) => {
    const active = Number(panel.dataset.panneau) === step;
    panel.classList.toggle('is-current', active);
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  });
  updateProgress();
  updateRecap();
  const labels = ['la prestation', 'le jour', 'l’heure', 'vos coordonnées'];
  announce(`Étape ${step} sur 4\u00a0: ${labels[step - 1]}.`);
  if (moveFocus) {
    const heading = document.querySelector(`#titre-etape-${step}`);
    if (heading) requestAnimationFrame(() => heading.focus({ preventScroll: true }));
  }
}

function showError(key, message) {
  if (errorMessages[key]) errorMessages[key].textContent = message;
}

function clearError(key) {
  if (errorMessages[key]) errorMessages[key].textContent = '';
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function openingHours(day) {
  if (day === 1) return null;
  if (day === 0) return { open: 10 * 60, close: 19 * 60 };
  return { open: 10 * 60, close: 19 * 60 + 30 };
}

function renderDays() {
  const container = document.querySelector('#liste-jours');
  if (!container) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const hours = openingHours(date.getDay());
    const key = dateKey(date);
    const shortLabel = formatDay(date, { weekday: 'short' }).replace('.', '');
    const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
    const isClosed = !hours;
    days.push(`<button class="day-option" type="button" data-date="${key}" aria-pressed="${state.date && dateKey(state.date) === key ? 'true' : 'false'}" aria-label="Choisir ${formatDay(date)}${isClosed ? ', fermé' : ''}"${isClosed ? ' disabled' : ''}><span>${shortLabel}</span><span>${isClosed ? 'Fermé' : dayNumber}</span></button>`);
  }
  container.innerHTML = days.join('');
  container.querySelectorAll('.day-option:not(:disabled)').forEach((button) => {
    button.addEventListener('click', () => {
      const [year, month, day] = button.dataset.date.split('-').map(Number);
      state.date = new Date(year, month - 1, day);
      state.time = '';
      clearError('day');
      clearError('time');
      container.querySelectorAll('.day-option').forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
      updateRecap();
      renderTimes();
      updateProgress();
      const note = document.querySelector('#jour-choisi-note');
      if (note) note.textContent = `Créneaux fictifs pour ${formatDay(state.date)}. Horaires à confirmer.`;
    });
  });
}

function stableHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function renderTimes() {
  const container = document.querySelector('#liste-heures');
  if (!container || !state.date || !selectedService()) return;
  const hours = openingHours(state.date.getDay());
  if (!hours) {
    container.innerHTML = '<legend>Créneaux proposés</legend><p>Aucun créneau proposé ce jour. Choisissez une autre date.</p>';
    return;
  }
  const service = selectedService();
  const now = new Date();
  const isToday = dateKey(now) === dateKey(state.date);
  const slots = [];
  for (let minute = hours.open; minute + service.duration <= hours.close; minute += 30) slots.push(minute);
  const seed = stableHash(`${dateKey(state.date)}-${state.service}`);
  const options = slots.map((minute, index) => {
    const booked = (seed + index * 11) % 7 === 2 && index !== slots.length - 1;
    const past = isToday && minute <= now.getHours() * 60 + now.getMinutes();
    const disabled = booked || past;
    const hour = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    const time = `${hour}\u00a0h\u00a0${minutes}`;
    const status = booked ? 'déjà pris' : past ? 'passé' : '';
    const label = status ? ` aria-label="${time}, ${status}"` : ` aria-label="Choisir ${time}"`;
    return `<label class="time-option"><input type="radio" name="heure" value="${time}"${disabled ? ' disabled' : ''}${state.time === time ? ' checked' : ''}${label}><span>${time}</span>${status ? `<small>${status}</small>` : ''}</label>`;
  });
  container.innerHTML = `<legend>Créneaux proposés · durée ${service.duration}\u00a0min</legend>${options.join('')}`;
  container.querySelectorAll('input[name="heure"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.time = input.value;
      clearError('time');
      updateRecap();
      updateProgress();
    });
  });
}

document.querySelectorAll('input[name="prestation"]').forEach((input) => {
  input.addEventListener('change', () => {
    state.service = input.value;
    state.time = '';
    clearError('service');
    if (state.date) renderTimes();
    updateRecap();
    updateProgress();
  });
});

document.querySelectorAll('[data-choisir]').forEach((link) => {
  link.addEventListener('click', () => {
    const input = document.querySelector(`input[name="prestation"][value="${link.dataset.choisir}"]`);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (state.date) renderDays();
    setStep(2);
  });
});

document.querySelectorAll('[data-avancer]').forEach((button) => {
  button.addEventListener('click', () => {
    const from = Number(button.dataset.avancer);
    if (from === 1 && !state.service) {
      showError('service', 'Choisissez une prestation pour continuer.');
      document.querySelector('input[name="prestation"]')?.focus();
      return;
    }
    if (from === 2 && !state.date) {
      showError('day', 'Choisissez un jour parmi les dates proposées.');
      document.querySelector('.day-option:not(:disabled)')?.focus();
      return;
    }
    if (from === 3 && !state.time) {
      const availableTime = document.querySelector('#liste-heures input:not(:disabled)');
      showError('time', availableTime ? 'Choisissez une heure disponible.' : 'Aucun créneau disponible ce jour. Revenez choisir une autre date.');
      (availableTime || document.querySelector('[data-retour="2"]'))?.focus();
      return;
    }
    setStep(from + 1);
  });
});

document.querySelectorAll('[data-retour]').forEach((button) => {
  button.addEventListener('click', () => setStep(Number(button.dataset.retour)));
});

progressButtons.forEach((button) => {
  button.addEventListener('click', () => setStep(Number(button.dataset.etapeCible)));
});

const firstName = document.querySelector('#prenom');
const phone = document.querySelector('#telephone');
const confirmButton = document.querySelector('#confirmer');
const bookingForm = document.querySelector('#formulaire-reservation');

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.step === 4) confirmButton.click();
});

function validMobile(value) {
  const compact = value.trim().replace(/[ .()\-]/g, '');
  return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
}

function localCalendarDate(date, time) {
  const [hour, minute] = time.replace(/\u00a0/g, ' ').split(' h ').map(Number);
  const start = new Date(date);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + selectedService().duration);
  const asLocalStamp = (value) => `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(value.getDate()).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}00`;
  return { start: asLocalStamp(start), end: asLocalStamp(end) };
}

function createCalendarFile() {
  const service = selectedService();
  const dateTimes = localCalendarDate(state.date, state.time);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const description = `Simulation uniquement. Rien n’a été envoyé à LyVan Nails. Tarif Planity\u00a0: ${service.price}.`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Studio Lamy//Aperçu LyVan Nails//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${stamp}-${dateTimes.start}@studiolamy.local`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/Paris:${dateTimes.start}`,
    `DTEND;TZID=Europe/Paris:${dateTimes.end}`,
    `SUMMARY:Rendez-vous simulé · LyVan Nails · ${service.name}`,
    `LOCATION:1 rue Camille-Crespin-du-Gast\\, 75011 Paris`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  if (state.calendarUrl) URL.revokeObjectURL(state.calendarUrl);
  state.calendarUrl = URL.createObjectURL(blob);
  const link = document.querySelector('#ajouter-agenda');
  link.href = state.calendarUrl;
  link.download = 'rendez-vous-simule-lyvan-nails.ics';
}

if (confirmButton) {
  confirmButton.addEventListener('click', () => {
    const name = firstName.value.trim();
    const number = phone.value.trim();
    clearError('contact');
    clearError('firstName');
    clearError('phone');
    let valid = true;
    if (name.length < 2) {
      showError('firstName', 'Indiquez votre prénom.');
      valid = false;
    }
    if (!validMobile(number)) {
      showError('phone', 'Entrez un numéro de mobile français valide, par exemple 06 12 34 56 78.');
      valid = false;
    }
    if (!valid) {
      showError('contact', 'Vérifiez les informations indiquées.');
      (name.length < 2 ? firstName : phone).focus();
      return;
    }
    const service = selectedService();
    const successText = document.querySelector('#texte-confirmation');
    const success = document.querySelector('#confirmation-simulation');
    const form = document.querySelector('#formulaire-reservation');
    successText.textContent = `${name}, votre sélection de ${service.name.toLowerCase()} le ${formatDay(state.date)} à ${state.time} est affichée ici. Le tarif de ${service.price} est relevé sur Planity et reste à confirmer. Cette simulation n’a rien envoyé à LyVan Nails.`;
    createCalendarFile();
    form.hidden = true;
    success.hidden = false;
    document.querySelector('#titre-confirmation').focus();
  });
}

renderDays();
updateRecap();
updateProgress();
