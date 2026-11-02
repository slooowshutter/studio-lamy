'use strict';

(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const reveals = document.querySelectorAll('[data-reveal]');
  document.querySelectorAll('.service-list').forEach(list => {
    list.querySelectorAll('[data-reveal]').forEach((row, index) => row.style.setProperty('--delay', `${index * 60}ms`));
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(element => revealObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }

  // Seulement les prestations et durées du relevé Planity. Aucun tarif dans la simulation.
  const services = [
    { id: 'traditionnelle', name: 'Barbe traditionnelle', detail: 'Rituel vapeur & serviette chaude', duration: 20 },
    { id: 'classique', name: 'Barbe classique', detail: 'Contour coupe-choux', duration: 15 },
    { id: 'coupe-traditionnelle', name: 'Coupe et barbe traditionnelle', detail: 'Rituel vapeur & serviette chaude', duration: 45 },
    { id: 'coupe-classique', name: 'Coupe et barbe classique', detail: 'Contour coupe-choux', duration: 45 },
    { id: 'coupe', name: 'Coupe', detail: '', duration: 30 },
    { id: 'enfant', name: 'Coupe enfant', detail: 'Moins de 12 ans', duration: 30 }
  ];
  const state = { service: services[0], date: '', slot: null, step: 0, reached: 0 };
  const form = document.getElementById('booking-form');
  const app = document.querySelector('.booking-app');
  const progress = document.querySelector('.booking-progress');
  const layout = document.querySelector('.booking-layout');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const success = document.querySelector('.booking-success');
  const announcement = document.getElementById('booking-announcement');
  let panelAnimation = null;

  function parisNow(now = new Date()) {
    const values = {};
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).forEach(part => { if (part.type !== 'literal') values[part.type] = Number(part.value); });
    const key = `${values.year}-${String(values.month).padStart(2, '0')}-${String(values.day).padStart(2, '0')}`;
    return { key, minutes: values.hour * 60 + values.minute, year: values.year, month: values.month, day: values.day };
  }

  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function dayLabel(key) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(dateFromKey(key));
  }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`; }

  function slotsFor(key, duration, now = parisNow()) {
    // Horaires Planity : lundi–samedi 10 h–19 h ; dimanche 10 h–18 h (à confirmer).
    const sunday = dateFromKey(key).getUTCDay() === 0;
    const close = sunday ? 1080 : 1140;
    const seed = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const slots = [];
    for (let minute = 600, index = 0; minute + duration <= close; minute += 20, index++) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const unavailable = (seed + index * 3) % 7 === 0;
      slots.push({ minute, disabled: past || unavailable, reason: past ? 'Passé' : unavailable ? 'Indisponible dans la simulation' : '' });
    }
    return slots;
  }

  function syncSummary() {
    document.getElementById('summary-service').textContent = state.service.name;
    document.getElementById('summary-day').textContent = state.date ? dayLabel(state.date) : 'À choisir';
    document.getElementById('summary-time').textContent = state.slot !== null ? timeLabel(state.slot) : 'À choisir';
    document.getElementById('summary-duration').textContent = `${state.service.duration} minutes`;
  }

  function updateProgress() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.reached;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function goStep(step, focus = true) {
    state.step = step;
    state.reached = Math.max(state.reached, step);
    if (panelAnimation) panelAnimation.cancel();
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateProgress();
    syncSummary();
    if (!reducedMotion.matches && !keyboard && panels[step].animate) {
      panelAnimation = panels[step].animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    const heading = panels[step].querySelector('h3');
    announcement.textContent = `Étape ${step + 1} sur 4. ${heading.textContent.replace(/\u00a0/g, ' ')}`;
    if (focus) heading.focus({ preventScroll: false });
  }

  function renderServices() {
    const container = document.getElementById('service-options');
    container.replaceChildren();
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'prestation'; radio.value = service.id;
      radio.checked = service.id === state.service.id;
      const content = document.createElement('span');
      const name = document.createElement('span');
      name.textContent = service.name;
      if (service.detail) {
        const detail = document.createElement('small');
        detail.textContent = service.detail;
        name.append(detail);
      }
      const duration = document.createElement('span');
      duration.className = 'choice-duration'; duration.textContent = `${service.duration}\u00a0min`;
      content.append(name, duration); label.append(radio, content); container.append(label);
      radio.addEventListener('change', () => selectService(service.id));
    });
  }

  function selectService(id) {
    const selected = services.find(service => service.id === id);
    if (!selected) return;
    state.service = selected;
    state.slot = null;
    state.reached = Math.min(state.reached, state.date ? 2 : 1);
    if (state.date && !slotsFor(state.date, selected.duration).some(slot => !slot.disabled)) {
      state.date = ''; state.reached = 1;
    }
    document.querySelectorAll('input[name=prestation]').forEach(radio => { radio.checked = radio.value === id; });
    syncSummary(); updateProgress();
  }

  function renderDays() {
    const container = document.getElementById('day-options');
    container.replaceChildren();
    const now = parisNow();
    const start = Date.UTC(now.year, now.month - 1, now.day, 12);
    for (let index = 0; index < 14; index++) {
      const date = new Date(start + index * 86400000);
      const key = dateKey(date);
      const sunday = date.getUTCDay() === 0;
      const available = slotsFor(key, state.service.duration, now).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'day-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = key;
      radio.checked = state.date === key; radio.disabled = !available;
      radio.setAttribute('aria-label', `${dayLabel(key)}${sunday ? ', dimanche à confirmer' : ''}${available ? '' : ', aucun créneau restant'}`);
      const content = document.createElement('span');
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
      const day = document.createElement('strong'); day.textContent = date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
      content.append(weekday, day, month);
      if (sunday || !available) {
        const note = document.createElement('small'); note.textContent = !available ? 'Terminé' : 'À confirmer'; content.append(note);
      }
      label.append(radio, content); container.append(label);
      radio.addEventListener('change', () => {
        state.date = key; state.slot = null; state.reached = 2;
        document.getElementById('day-error').textContent = '';
        syncSummary(); updateProgress();
      });
    }
  }

  function renderSlots() {
    const container = document.getElementById('slot-options');
    container.replaceChildren();
    const slots = slotsFor(state.date, state.service.duration);
    if (state.slot !== null && !slots.some(slot => slot.minute === state.slot && !slot.disabled)) state.slot = null;
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = slot.minute;
      radio.checked = state.slot === slot.minute; radio.disabled = slot.disabled;
      radio.setAttribute('aria-label', `${timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', créneau fictif'}`);
      const content = document.createElement('span'); content.textContent = timeLabel(slot.minute);
      label.append(radio, content); container.append(label);
      radio.addEventListener('change', () => {
        state.slot = slot.minute;
        document.getElementById('slot-error').textContent = '';
        syncSummary();
      });
    });
    if (!slots.some(slot => !slot.disabled)) {
      const note = document.createElement('p');
      note.className = 'small-note'; note.textContent = 'Aucun créneau restant pour ce jour. Choisissez un autre jour.'; container.append(note);
    }
    syncSummary();
  }

  function nextStep(step) {
    if (step >= 2 && !state.date) {
      document.getElementById('day-error').textContent = 'Choisissez un jour pour continuer.';
      document.querySelector('input[name=jour]:not(:disabled)')?.focus(); return;
    }
    if (step >= 3 && state.slot === null) {
      document.getElementById('slot-error').textContent = 'Choisissez une heure pour continuer.';
      document.querySelector('input[name=heure]:not(:disabled)')?.focus(); return;
    }
    if (step === 3 && !slotsFor(state.date, state.service.duration).some(slot => slot.minute === state.slot && !slot.disabled)) {
      state.slot = null; goStep(2);
      document.getElementById('slot-error').textContent = 'Ce créneau est passé. Choisissez une autre heure.'; return;
    }
    goStep(step);
  }

  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => nextStep(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => goStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step <= state.reached) {
      if (step >= 2 && !state.date) return;
      if (step >= 3 && state.slot === null) return;
      goStep(step);
    }
  }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (success.hidden === false) resetBooking();
    selectService(link.dataset.service);
    goStep(0, false);
    requestAnimationFrame(() => panels[0].querySelector('h3').focus({ preventScroll: true }));
  }));

  function setError(id, message) {
    document.getElementById(`${id}-error`).textContent = message;
    document.getElementById(id).setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  ['prenom', 'telephone'].forEach(id => document.getElementById(id).addEventListener('input', () => setError(id, '')));

  form.addEventListener('submit', event => {
    event.preventDefault();
    // Entrée dans une étape précédente fait avancer, sans soumettre prématurément.
    if (state.step !== 3) { nextStep(state.step + 1); return; }
    const firstName = document.getElementById('prenom').value.trim();
    const phone = document.getElementById('telephone').value.replace(/[\s.()\-]/g, '');
    const firstNameValid = firstName.length >= 2 && /\p{L}/u.test(firstName);
    const phoneValid = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone);
    setError('prenom', firstNameValid ? '' : 'Indiquez votre prénom, avec au moins deux caractères.');
    setError('telephone', phoneValid ? '' : 'Indiquez un numéro français valide, avec 10 chiffres ou +33.');
    if (!firstNameValid || !phoneValid) {
      announcement.textContent = 'Vérifiez les informations indiquées.';
      document.getElementById(firstNameValid ? 'telephone' : 'prenom').focus(); return;
    }
    if (!state.date || state.slot === null || !slotsFor(state.date, state.service.duration).some(slot => slot.minute === state.slot && !slot.disabled)) {
      state.slot = null; goStep(2);
      document.getElementById('slot-error').textContent = 'Ce créneau n’est plus disponible dans la simulation. Choisissez une autre heure.'; return;
    }
    document.getElementById('success-recap').textContent = `${firstName}, voici votre sélection fictive : ${state.service.name.toLocaleLowerCase('fr-FR')}, ${dayLabel(state.date)} à ${timeLabel(state.slot)} (${state.service.duration} minutes).`;
    form.reset(); // Les coordonnées ne sont ni envoyées ni conservées.
    progress.hidden = true; layout.hidden = true; success.hidden = false;
    if (!keyboard && !reducedMotion.matches && success.animate) {
      success.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
    success.querySelector('h3').focus();
    announcement.textContent = 'Simulation terminée. Aucun rendez-vous pris, aucun envoi.';
  });

  function resetBooking() {
    state.service = services[0]; state.date = ''; state.slot = null; state.step = 0; state.reached = 0;
    form.reset();
    ['prenom', 'telephone'].forEach(id => setError(id, ''));
    document.getElementById('day-error').textContent = '';
    document.getElementById('slot-error').textContent = '';
    document.getElementById('success-recap').textContent = '';
    success.hidden = true; progress.hidden = false; layout.hidden = false;
    renderServices(); goStep(0);
  }
  document.getElementById('restart-booking').addEventListener('click', resetBooking);

  // La barre quitte le champ quand le pied de page, avec ses propres liens, est visible.
  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const footerObserver = new IntersectionObserver(entries => {
      const hidden = entries[0].isIntersecting;
      mobileBar.classList.toggle('is-hidden', hidden);
      mobileBar.inert = hidden;
    }, { threshold: 0 });
    footerObserver.observe(document.querySelector('.footer'));
  }
  renderServices(); syncSummary(); app.hidden = false;
  window.captainPret = true;
})();
