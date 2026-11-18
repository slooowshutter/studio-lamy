/* Erick.C — simulation locale ; aucun appel réseau ni stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const NB = '\u00a0';
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.dataset.input = 'clavier'; }, { capture: true });
  document.addEventListener('pointerdown', () => { keyboard = false; root.dataset.input = 'pointeur'; }, { capture: true, passive: true });

  function focusVisible(element, area = element) {
    const box = area.getBoundingClientRect();
    if (box.top < 20 || box.bottom > window.innerHeight - 90) {
      area.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    element.focus({ preventScroll: true });
  }

  /* Une seule entrée de couverture, sans attendre le chargement des polices. */
  if (!reduced.matches) root.classList.add('motion-ready');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1 });
    $$('[data-reveal]').forEach((element, index) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 3) * 50}ms`;
      observer.observe(element);
    });
    root.classList.add('reveal-ready');
    reduced.addEventListener('change', () => {
      if (reduced.matches) {
        root.classList.remove('reveal-ready', 'motion-ready');
        observer.disconnect();
      }
    });
  }

  const SERVICES = [
    { id: 'coupe', name: 'Coupe femme' },
    { id: 'coloration', name: 'Coloration' },
    { id: 'meches', name: 'Mèches' },
    { id: 'chignon', name: 'Chignon' },
    { id: 'permanente', name: 'Permanente' },
    { id: 'mariage', name: 'Coiffure de mariage' }
  ];
  /* Plages sourcées, en minutes. Aucune durée de prestation supposée. */
  const HOURS = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const form = $('#booking-form');
  const panels = $$('.booking-step');
  const stepButtons = $$('[data-step]');
  const nextButton = $('.next');
  const previousButton = $('.previous');
  const announcement = $('#booking-announcement');
  const state = { step: 0, service: '', day: '', time: null, complete: false };
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(date).map(part => [part.type, part.value]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    return { key, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const currentService = () => SERVICES.find(service => service.id === state.service);
  const timeLabel = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? `${NB}${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const dateLabel = key => dateFormatter.format(dateFromKey(key));

  function span(className, value) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = value;
    return element;
  }
  function choice(name, value, description, classes = '') {
    const label = document.createElement('label');
    label.className = `choice ${classes}`;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.setAttribute('aria-describedby', `erreur-${name}`);
    label.append(input, span('', description));
    return { label, input };
  }
  SERVICES.forEach(service => {
    const { label } = choice('prestation', service.id, service.name);
    $('.service-choices').append(label);
  });

  function renderDays() {
    const today = parisNow();
    const start = dateFromKey(today.key);
    $('.day-choices').replaceChildren();
    for (let index = 0; index < 14; index++) {
      const date = new Date(start.getTime() + index * 86400000);
      const key = dateKey(date);
      const hours = HOURS[date.getUTCDay()];
      const elapsed = hours && key === today.key && today.minutes >= hours[1] - 60;
      const { label, input } = choice('jour', key, '', 'day-choice');
      label.lastChild.remove();
      input.disabled = !hours || elapsed;
      input.checked = state.day === key;
      input.setAttribute('aria-label', `${dateLabel(key)}${!hours ? ', fermé' : elapsed ? ', journée terminée' : ', simulation'}`);
      label.append(span('', weekFormatter.format(date)), span('day-num', date.getUTCDate()), span('', monthFormatter.format(date)), span('day-state', !hours ? 'Fermé' : elapsed ? 'Terminé' : index === 0 ? 'Aujourd’hui' : 'Simulation'));
      $('.day-choices').append(label);
    }
  }
  function slotsFor(key, now = parisNow()) {
    const date = dateFromKey(key);
    const hours = HOURS[date.getUTCDay()];
    if (!hours || key < now.key) return [];
    const slots = [];
    /* Heures de début uniquement ; aucun temps de prestation inventé. */
    for (let minute = hours[0]; minute < hours[1]; minute += 60) {
      const past = key === now.key && minute <= now.minutes;
      const taken = (date.getUTCDate() + date.getUTCMonth() + minute / 60) % 5 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Indisponible' : 'Simulation' });
    }
    return slots;
  }
  function renderTimes() {
    $('.time-choices').replaceChildren();
    slotsFor(state.day).forEach(slot => {
      const { label, input } = choice('heure', String(slot.minute), '', 'time-choice');
      label.lastChild.remove();
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.reason.toLocaleLowerCase('fr-FR')}`);
      label.append(span('time-value', timeLabel(slot.minute)), span('time-state', slot.reason));
      $('.time-choices').append(label);
    });
  }

  function recap() {
    const service = currentService();
    return `${service ? service.name : ''} — ${state.day ? dateLabel(state.day) : ''} à ${state.time !== null ? timeLabel(state.time) : ''}, au 6 rue de Bayard. Simulation uniquement.`;
  }
  function animateSelection(element) {
    if (reduced.matches || keyboard || !element.animate) return;
    element.getAnimations().forEach(animation => animation.cancel());
    element.animate([{ opacity: .35, transform: 'translateX(5px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function setSummary(selector, value) {
    const element = $(selector);
    if (element.textContent === value) return;
    element.textContent = value;
    animateSelection(element);
  }
  function updateSummary() {
    setSummary('#resume-prestation', currentService()?.name || 'À choisir');
    setSummary('#resume-jour', state.day ? dateLabel(state.day) : 'À choisir');
    setSummary('#resume-heure', state.time !== null ? timeLabel(state.time) : 'À choisir');
    if (state.service && state.day && state.time !== null) $('#final-recap').textContent = recap();
  }
  function canVisit(step) {
    if (step === 0) return true;
    if (!state.service) return false;
    if (step === 1) return true;
    if (!state.day) return false;
    if (step === 2) return true;
    return state.time !== null;
  }
  function updateNavigation() {
    stepButtons.forEach((button, index) => {
      button.disabled = !canVisit(index);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    previousButton.hidden = state.step === 0;
    nextButton.replaceChildren(document.createTextNode(state.step === 3 ? 'Terminer la simulation ' : 'Continuer '), span('', '→'));
    nextButton.lastChild.setAttribute('aria-hidden', 'true');
  }
  function showStep(index, focus = true) {
    if (!canVisit(index)) return;
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    panels.forEach((panel, panelIndex) => {
      panel.getAnimations().forEach(animation => animation.cancel());
      panel.hidden = panelIndex !== index;
    });
    const panel = panels[index];
    if (!reduced.matches && !keyboard && panel.animate) {
      panel.animate([{ opacity: 0, transform: 'translateX(10px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    updateNavigation(); updateSummary();
    announcement.textContent = `Étape ${index + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][index]}. Simulation uniquement.`;
    if (focus) focusVisible($(`#etape-${index}`));
  }
  function clearError(name) {
    const error = $(`#erreur-${name}`);
    if (error) error.textContent = '';
  }
  function failStep(name, message) {
    $(`#erreur-${name}`).textContent = message;
    const first = $(`input[name='${name}']:not(:disabled)`);
    if (first) focusVisible(first, first.closest('label'));
    return false;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value;
      clearError('prestation');
    } else if (input.name === 'jour') {
      if (state.day !== input.value) {
        state.time = null;
        clearError('heure');
      }
      state.day = input.value;
      clearError('jour');
    } else if (input.name === 'heure') {
      state.time = Number(input.value);
      clearError('heure');
    }
    updateSummary(); updateNavigation();
  });
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  previousButton.addEventListener('click', () => showStep(state.step - 1));

  function validateDetails() {
    const first = $('#prenom');
    const phone = $('#telephone');
    const nameValid = first.value.trim().length > 0;
    const cleaned = phone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(cleaned);
    $('#erreur-prenom').textContent = nameValid ? '' : 'Indiquez un prénom pour l’essai.';
    $('#erreur-telephone').textContent = phoneValid ? '' : 'Indiquez un numéro français valide commençant par 06 ou 07.';
    first.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      announcement.textContent = 'Vérifiez les coordonnées indiquées pour l’essai.';
      focusVisible(nameValid ? phone : first);
    }
    return nameValid && phoneValid;
  }
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('input', event => {
      event.target.removeAttribute('aria-invalid');
      clearError(id);
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0) {
      if (!state.service) return failStep('prestation', 'Choisissez une prestation pour continuer.');
      showStep(1);
    } else if (state.step === 1) {
      if (!state.day) return failStep('jour', 'Choisissez un jour pour continuer.');
      const now = parisNow();
      if (!slotsFor(state.day, now).some(slot => !slot.disabled)) {
        state.day = ''; state.time = null;
        renderDays(); updateSummary(); updateNavigation();
        return failStep('jour', 'Il n’y a plus d’heure de début disponible pour cet essai. Choisissez un autre jour.');
      }
      showStep(2);
    } else if (state.step === 2) {
      if (state.time === null) return failStep('heure', 'Choisissez une heure pour continuer.');
      if (!slotsFor(state.day).some(slot => slot.minute === state.time && !slot.disabled)) {
        state.time = null; renderTimes(); updateSummary(); updateNavigation();
        return failStep('heure', 'Cette heure est passée. Choisissez une autre heure pour l’essai.');
      }
      showStep(3);
    } else {
      if (!validateDetails()) return;
      if (!slotsFor(state.day).some(slot => slot.minute === state.time && !slot.disabled)) {
        state.time = null; showStep(2);
        return failStep('heure', 'Cette heure est passée pendant l’essai. Choisissez une autre heure.');
      }
      state.complete = true;
      $('#success-recap').textContent = recap();
      form.hidden = true;
      $('.booking-success').hidden = false;
      focusVisible($('#titre-succes'));
      announcement.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris. Appelez Erick.C pour confirmer.';
      $('#prenom').value = ''; $('#telephone').value = '';
      const success = $('.booking-success');
      if (!reduced.matches && !keyboard && success.animate) success.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  });
  function resetBooking() {
    form.reset();
    state.step = 0; state.service = ''; state.day = ''; state.time = null; state.complete = false;
    $$('.field-error').forEach(error => { error.textContent = ''; });
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    $('.booking-success').hidden = true; form.hidden = false;
    showStep(0);
  }
  $('.restart').addEventListener('click', resetBooking);
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.complete) resetBooking();
    state.service = link.dataset.service;
    $(`input[name='prestation'][value='${state.service}']`).checked = true;
    clearError('prestation');
    showStep(0, false);
    announcement.textContent = `${currentService().name} sélectionnée pour la simulation.`;
  }));
  renderDays();
  form.hidden = false;
  $('.no-js').hidden = true;
  updateNavigation();

  /* La barre mobile libère les commandes du formulaire et le pied de page. */
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const bar = $('.mobile-bar');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      const hide = visible.size > 0;
      bar.classList.toggle('is-hidden', hide);
      bar.inert = hide;
      bar.setAttribute('aria-hidden', String(hide));
    }, { threshold: 0, rootMargin: '0px 0px -76px 0px' });
    observer.observe($('#rendez-vous'));
    observer.observe($('footer'));
  }
})();
