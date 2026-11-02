(() => {
  'use strict';

  const SERVICES = {
    henne: { label: 'Henné rouge ou noir · une main', duration: 30 },
    manucure: { label: 'Manucure', duration: 25 },
    vernis: { label: 'Pose de vernis', duration: 15 },
    sourcils: { label: 'Épilation des sourcils', duration: 15 }
  };
  // Source : profil Treatwell, 10 h à 20 h chaque jour ; réserve du lundi en note 3.
  const HOURS = { 0: [600, 1200], 1: [600, 1200], 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [600, 1200], 6: [600, 1200] };

  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function addDays(key, amount) {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
  }
  function formatDate(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(dateFromKey(key));
  }
  function formatTime(minutes) {
    const minute = minutes % 60;
    return `${Math.floor(minutes / 60)}\u00a0h${minute ? `\u00a0${String(minute).padStart(2, '0')}` : ''}`;
  }
  function slotsFor(key, serviceId, instant = new Date()) {
    const opening = HOURS[dateFromKey(key).getUTCDay()];
    const service = SERVICES[serviceId];
    if (!opening || !service) return [];
    const now = parisNow(instant);
    const seed = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const slots = [];
    for (let start = opening[0], index = 0; start + service.duration <= opening[1]; start += 30, index++) {
      const past = key < now.key || (key === now.key && start <= now.minute);
      // Occupation déterministe et entièrement fictive, explicitement signalée dans l’interface.
      const exampleBusy = (seed + index * 3) % 7 === 0;
      slots.push({ start, disabled: past || exampleBusy, reason: past ? 'Passé' : exampleBusy ? 'Occupé · exemple' : '' });
    }
    return slots;
  }
  function dayChoices(serviceId, instant = new Date()) {
    const first = parisNow(instant).key;
    return Array.from({ length: 14 }, (_, index) => {
      const key = addDays(first, index);
      return { key, disabled: !slotsFor(key, serviceId, instant).some(slot => !slot.disabled) };
    });
  }
  function validPhone(value) {
    return /^(?:0[1-9]|\+33[1-9]|0033[1-9])\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));
  }

  // Les mêmes fonctions pures permettent de contrôler le calendrier sans navigateur.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { SERVICES, HOURS, parisNow, addDays, dateFromKey, slotsFor, dayChoices, validPhone };
    return;
  }

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = selector => doc.querySelector(selector);
  const $$ = selector => [...doc.querySelectorAll(selector)];
  const state = { service: 'henne', day: null, time: null, step: 0 };
  let entryFrame = 0;
  let keyboard = false;
  const panels = $$('[data-panel]');
  const form = $('#booking-form');
  const stepButtons = $$('[data-step]');
  const fields = { prenom: $('#prenom'), telephone: $('#telephone') };

  doc.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  doc.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard');
  }, { passive: true });

  function announce(message) { $('#booking-status').textContent = message; }
  function updateSummary() {
    $('#summary-service').textContent = SERVICES[state.service].label;
    $('#summary-day').textContent = state.day ? formatDate(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : formatTime(state.time);
    $('#confirmation-recap').textContent = state.day && state.time !== null
      ? `Votre essai : ${SERVICES[state.service].label}, ${formatDate(state.day)} à ${formatTime(state.time)}. Aucun rendez-vous ne sera réservé.` : '';
    stepButtons.forEach((button, index) => {
      button.disabled = index === 1 ? !state.service : index === 2 ? !state.day : index === 3 ? state.time === null : false;
    });
  }
  function setError(id, message) { $(`#${id}`).textContent = message; }
  function clearChoiceErrors() {
    setError('day-error', '');
    setError('slot-error', '');
  }
  function makeRadio(name, value, disabled, checked) {
    const input = doc.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    return input;
  }
  function appendText(parent, tag, text) {
    const element = doc.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  }
  function renderDays() {
    const choices = dayChoices(state.service);
    if (state.day && !choices.some(day => day.key === state.day && !day.disabled)) {
      state.day = null; state.time = null;
    }
    const fragment = doc.createDocumentFragment();
    choices.forEach(day => {
      const label = doc.createElement('label'); label.className = 'day-choice';
      const input = makeRadio('jour', day.key, day.disabled, day.key === state.day);
      input.setAttribute('aria-label', `${formatDate(day.key)}${day.disabled ? ', sans créneau dans la simulation' : ', date de simulation'}`);
      label.append(input);
      appendText(label, 'span', formatDate(day.key, { weekday: 'short' }));
      appendText(label, 'strong', formatDate(day.key, { day: 'numeric' }));
      appendText(label, 'span', formatDate(day.key, { month: 'short' }));
      if (day.disabled) appendText(label, 'small', 'Sans créneau');
      input.addEventListener('change', () => {
        state.day = day.key; state.time = null;
        clearChoiceErrors(); renderSlots(); updateSummary();
        announce(`Jour choisi pour l’essai : ${formatDate(day.key)}.`);
      });
      fragment.append(label);
    });
    $('#day-options').replaceChildren(fragment);
  }
  function renderSlots() {
    const holder = $('#slot-options');
    holder.replaceChildren();
    if (!state.day) return;
    const slots = slotsFor(state.day, state.service);
    if (!slots.some(slot => slot.start === state.time && !slot.disabled)) state.time = null;
    $('#slot-intro').textContent = `${formatDate(state.day)}. Horaires publiés : 10\u00a0h à 20\u00a0h. Créneaux fictifs ; « occupé » est un exemple.`;
    const fragment = doc.createDocumentFragment();
    slots.forEach(slot => {
      const label = doc.createElement('label'); label.className = 'slot-choice';
      const input = makeRadio('heure', String(slot.start), slot.disabled, slot.start === state.time);
      input.setAttribute('aria-label', `${formatTime(slot.start)}, ${slot.reason || 'disponibilité fictive'}`);
      label.append(input);
      appendText(label, 'span', formatTime(slot.start));
      if (slot.reason) appendText(label, 'small', slot.reason);
      input.addEventListener('change', () => {
        state.time = slot.start; clearChoiceErrors(); updateSummary();
        announce(`Heure choisie pour l’essai : ${formatTime(state.time)}.`);
      });
      fragment.append(label);
    });
    holder.append(fragment);
  }
  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    const reserve = window.matchMedia('(max-width: 760px)').matches ? $('.booking-margin').getBoundingClientRect().height + 20 : 20;
    if (rect.top < reserve || rect.bottom > window.innerHeight - 90) {
      heading.scrollIntoView({ block: 'start', behavior: reduce.matches || keyboard ? 'instant' : 'smooth' });
    }
  }
  function showStep(index, focus = true, animate = true) {
    if ((index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null)) return;
    const direction = index < state.step ? 'from-back' : '';
    state.step = index;
    cancelAnimationFrame(entryFrame);
    panels.forEach(panel => { panel.hidden = true; panel.classList.remove('is-entering', 'from-back'); });
    const panel = panels[index]; panel.hidden = false;
    if (animate && !reduce.matches && !keyboard) {
      panel.classList.add('is-entering');
      if (direction) panel.classList.add(direction);
      entryFrame = requestAnimationFrame(() => {
        entryFrame = requestAnimationFrame(() => panel.classList.remove('is-entering', 'from-back'));
      });
    }
    stepButtons.forEach((button, buttonIndex) => {
      if (buttonIndex === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (focus) focusHeading(panel.querySelector('h3'));
    announce(`Étape ${index + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][index]}. Simulation sans envoi.`);
  }
  function currentSlotIsValid() {
    return state.day && state.time !== null && slotsFor(state.day, state.service).some(slot => slot.start === state.time && !slot.disabled);
  }
  function goNext() {
    clearChoiceErrors();
    if (state.step === 0) { renderDays(); updateSummary(); showStep(1); }
    else if (state.step === 1) {
      const validDay = dayChoices(state.service).some(day => day.key === state.day && !day.disabled);
      if (!validDay) {
        renderDays(); updateSummary();
        setError('day-error', 'Choisissez un jour pour continuer l’essai.');
        $('#day-options input:not(:disabled)')?.focus();
        return;
      }
      renderSlots(); updateSummary(); showStep(2);
    } else if (state.step === 2) {
      if (!currentSlotIsValid()) {
        renderSlots(); updateSummary();
        setError('slot-error', 'Choisissez un créneau encore disponible dans cette simulation.');
        $('#slot-options input:not(:disabled)')?.focus();
        return;
      }
      updateSummary(); showStep(3);
    }
  }
  function changeService(value) {
    if (!SERVICES[value]) return;
    if (value !== state.service) {
      state.service = value; state.time = null;
      renderDays();
    }
    clearChoiceErrors(); updateSummary();
  }
  function validateField(name) {
    const input = fields[name]; const value = input.value.trim();
    const valid = name === 'prenom' ? value.length > 0 : validPhone(value);
    const message = valid ? '' : name === 'prenom'
      ? 'Indiquez un prénom pour terminer l’essai.'
      : 'Indiquez un numéro français à 10 chiffres, ou avec l’indicatif +33.';
    input.setAttribute('aria-invalid', String(!valid));
    setError(`${name}-error`, message);
    return valid;
  }

  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => changeService(input.value)));
  $$('[data-next]').forEach(button => button.addEventListener('click', goNext));
  $$('[data-prev]').forEach(button => button.addEventListener('click', () => showStep(state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    updateSummary(); showStep(index);
  }));
  $$('[data-select]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    $('#booking-success').hidden = true; form.hidden = false;
    $('.step-nav').hidden = false;
    const input = $(`input[name="prestation"][value="${link.dataset.select}"]`);
    input.checked = true; changeService(input.value); showStep(0, false, false);
    $('#rendez-vous').scrollIntoView({ block: 'start', behavior: reduce.matches || keyboard ? 'instant' : 'smooth' });
    panels[0].querySelector('h3').focus({ preventScroll: true });
  }));
  Object.entries(fields).forEach(([name, input]) => {
    input.addEventListener('blur', () => { if (input.value.trim() || input.getAttribute('aria-invalid') === 'true') validateField(name); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); setError(`${name}-error`, ''); }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { goNext(); return; }
    if (!currentSlotIsValid()) {
      renderDays(); renderSlots(); updateSummary();
      showStep(state.day ? 2 : 1);
      setError(state.day ? 'slot-error' : 'day-error', 'Ce créneau est passé. Choisissez un autre créneau de simulation.');
      return;
    }
    const firstNameValid = validateField('prenom');
    const phoneValid = validateField('telephone');
    if (!firstNameValid || !phoneValid) { (firstNameValid ? fields.telephone : fields.prenom).focus(); return; }
    $('#success-recap').textContent = `${fields.prenom.value.trim()}, voici votre essai : ${SERVICES[state.service].label}, ${formatDate(state.day)} à ${formatTime(state.time)}.`;
    form.hidden = true; $('.step-nav').hidden = true;
    $('#booking-success').hidden = false;
    fields.prenom.value = ''; fields.telephone.value = '';
    focusHeading($('#titre-resultat'));
    announce('Simulation terminée. Aucune réservation n’a été effectuée et aucune donnée n’a été envoyée.');
  });
  $('#restart-booking').addEventListener('click', () => {
    form.reset(); state.service = 'henne'; state.day = null; state.time = null;
    Object.keys(fields).forEach(name => { fields[name].removeAttribute('aria-invalid'); setError(`${name}-error`, ''); });
    clearChoiceErrors(); renderDays(); renderSlots(); updateSummary();
    $('#booking-success').hidden = true; form.hidden = false; $('.step-nav').hidden = false;
    showStep(0);
  });

  renderDays(); updateSummary(); $('#booking-shell').hidden = false;

  const revealElements = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-seen'); reveals.unobserve(entry.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px 20px 0px' });
    revealElements.forEach(element => reveals.observe(element));
    const visibility = { heroPast: false, booking: false, footer: false };
    const bar = $('.mobile-bar');
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') visibility.heroPast = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        if (entry.target.id === 'rendez-vous') visibility.booking = entry.isIntersecting;
        if (entry.target.id === 'pied-de-page') visibility.footer = entry.isIntersecting;
      });
      bar.classList.toggle('is-visible', visibility.heroPast && !visibility.booking && !visibility.footer);
    });
    ['#hero-actions', '#rendez-vous', '#pied-de-page'].forEach(selector => barObserver.observe($(selector)));
  } else {
    revealElements.forEach(element => element.classList.add('is-seen'));
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
