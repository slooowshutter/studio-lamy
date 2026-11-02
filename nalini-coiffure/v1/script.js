/* Nalini Coiffure : lecture éditoriale et parcours d’essai local, sans envoi. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nbsp = '\u00a0';

  // Planity, relevé du 02/11/2026. Minutes depuis minuit, dimanche = 0.
  // Les durées ne sont pas connues : ces heures illustrent un choix, pas un planning.
  const HOURS = [null, null, [600, 1140], [660, 1140], [660, 1170], [600, 1140], [660, 1140]];
  const SERVICES = {
    'coupe-homme': 'Coupe homme avec shampooing',
    'coupe-courts': 'Coupe femme + brushing, cheveux courts / mi-longs',
    'coupe-longs': 'Coupe femme + brushing, cheveux longs',
    'brushing': 'Brushing, selon longueur'
  };
  const STEP_NAMES = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const clockFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDateFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function parisClock(now = new Date()) {
    const parts = {};
    clockFormat.formatToParts(now).forEach(part => { parts[part.type] = part.value; });
    const y = Number(parts.year), m = Number(parts.month), d = Number(parts.day);
    return {
      key: `${parts.year}-${parts.month}-${parts.day}`,
      day: new Date(Date.UTC(y, m - 1, d, 12)),
      minute: (Number(parts.hour) % 24) * 60 + Number(parts.minute)
    };
  }
  function dateFromKey(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    return date.toISOString().slice(0, 10) === key ? date : null;
  }
  function timeLabel(minute) {
    const h = Math.floor(minute / 60), m = minute % 60;
    return `${h}${nbsp}h${m ? `${nbsp}${String(m).padStart(2, '0')}` : ''}`;
  }
  function slotsFor(key, now = new Date()) {
    const date = dateFromKey(key);
    if (!date) return [];
    const hours = HOURS[date.getUTCDay()];
    if (!hours) return [];
    const clock = parisClock(now);
    const slots = [];
    for (let minute = hours[0]; minute < hours[1]; minute += 30) {
      slots.push({ minute, past: key < clock.key || (key === clock.key && minute <= clock.minute) });
    }
    return slots;
  }
  function dayIsAvailable(key) { return slotsFor(key).some(slot => !slot.past); }
  function timeIsAvailable(key, minute) {
    return slotsFor(key).some(slot => slot.minute === minute && !slot.past);
  }

  const state = { step: 0, service: '', date: '', time: null, finished: false };
  const workspace = $('#parcours');
  const fallback = $('#reservation-sans-script');
  const form = $('#formulaire-essai');
  const panels = $$('.booking-step');
  const stepButtons = $$('[data-go-step]');
  const announcement = $('#annonce-parcours');
  const result = $('#resultat');
  let transitionId = 0;

  doc.addEventListener('keydown', event => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) root.classList.add('keyboard-use');
  }, { capture: true });
  doc.addEventListener('pointerdown', () => root.classList.remove('keyboard-use'), { capture: true, passive: true });
  const mayAnimate = event => !reducedMotion.matches && !root.classList.contains('keyboard-use') && (!event || event.detail !== 0);
  const say = message => { announcement.textContent = message; };

  function error(id, message, input) {
    $(`#erreur-${id}`).textContent = message;
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }
  function canVisit(step) {
    return step === 0 || Boolean(state.service && (step === 1 || (state.date && (step === 2 || state.time !== null))));
  }
  function updateStepNavigation() {
    stepButtons.forEach((button, index) => {
      button.disabled = !canVisit(index);
      button.classList.toggle('is-done', index < state.step);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function summaryLine(id, text, filled) {
    const element = $(id);
    element.textContent = text;
    element.classList.toggle('is-filled', filled);
  }
  function updateSummary() {
    summaryLine('#resume-prestation', SERVICES[state.service] || 'À choisir', Boolean(state.service));
    summaryLine('#resume-jour', state.date ? longDateFormat.format(dateFromKey(state.date)) : 'À choisir', Boolean(state.date));
    summaryLine('#resume-heure', state.time !== null ? timeLabel(state.time) : 'À choisir', state.time !== null);
    const progress = state.time !== null ? 1 : state.date ? .7 : state.service ? .4 : .15;
    $('.selection-rule').style.transform = `scaleX(${progress})`;
    if (state.service && state.date && state.time !== null) {
      $('#recapitulatif-final').textContent = `Pour l’essai${nbsp}: ${SERVICES[state.service]}, ${longDateFormat.format(dateFromKey(state.date))} à ${timeLabel(state.time)}. Aucune réservation ne sera effectuée.`;
    } else $('#recapitulatif-final').textContent = '';
    updateStepNavigation();
  }
  function moveFocus(element, scroll = true) {
    element.focus({ preventScroll: true });
    if (scroll) element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function enterPanel(panel, event, backward) {
    const token = ++transitionId;
    panel.classList.remove('is-entering', 'is-entering-back');
    if (!mayAnimate(event)) return;
    const className = backward ? 'is-entering-back' : 'is-entering';
    panel.classList.add(className);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token === transitionId) panel.classList.remove(className);
    }));
  }
  function showStep(next, event, scroll = true) {
    if (!canVisit(next) || state.finished) return;
    const backward = next < state.step;
    state.step = next;
    if (next === 1) renderDays();
    if (next === 2) renderTimes();
    panels.forEach((panel, index) => {
      panel.hidden = index !== next;
      panel.classList.toggle('is-current', index === next);
      if (index !== next) panel.classList.remove('is-entering', 'is-entering-back');
    });
    updateSummary();
    const panel = panels[next];
    enterPanel(panel, event, backward);
    say(`Simulation${nbsp}: étape ${next + 1} sur 4, ${STEP_NAMES[next].toLowerCase()}.`);
    moveFocus($('h3', panel), scroll);
  }
  function chooseService(value) {
    if (!Object.hasOwn(SERVICES, value)) return;
    if (state.service !== value) {
      state.service = value;
      state.date = '';
      state.time = null;
      error('jour', '');
      error('heure', '');
    }
    error('prestation', '');
    updateSummary();
  }

  function appendText(parent, className, text) {
    const span = doc.createElement('span');
    span.className = className;
    span.textContent = text;
    parent.append(span);
    return span;
  }
  function renderDays() {
    const container = $('#jours-disponibles');
    const clock = parisClock();
    const fragment = doc.createDocumentFragment();
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(clock.day.getTime() + offset * 86400000);
      const key = day.toISOString().slice(0, 10);
      const closed = !HOURS[day.getUTCDay()];
      const ended = !closed && !dayIsAvailable(key);
      const label = doc.createElement('label');
      label.className = 'date-option';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || ended;
      input.checked = key === state.date;
      input.setAttribute('aria-label', `${longDateFormat.format(day)}${closed ? ', fermé' : ended ? ', journée écoulée' : ', jour d’exemple'}`);
      const face = doc.createElement('span');
      appendText(face, 'date-weekday', weekdayFormat.format(day));
      appendText(face, 'date-number', String(day.getUTCDate()));
      appendText(face, 'date-month', monthFormat.format(day));
      appendText(face, 'date-caption', closed ? 'Fermé' : ended ? 'Écoulé' : offset === 0 ? 'Aujourd’hui' : 'Exemple');
      label.append(input, face);
      fragment.append(label);
    }
    container.replaceChildren(fragment);
  }
  function renderTimes() {
    const container = $('#heures-disponibles');
    const fragment = doc.createDocumentFragment();
    const slots = slotsFor(state.date);
    $('#jour-choisi').textContent = state.date ? longDateFormat.format(dateFromKey(state.date)) : '';
    slots.forEach(slot => {
      const label = doc.createElement('label');
      label.className = 'time-option';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute);
      input.disabled = slot.past; input.checked = slot.minute === state.time;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.past ? 'heure passée' : 'heure d’exemple'}`);
      const face = doc.createElement('span');
      appendText(face, 'time-label', timeLabel(slot.minute));
      if (slot.past) appendText(face, 'time-past', 'Passée');
      label.append(input, face);
      fragment.append(label);
    });
    if (!slots.some(slot => !slot.past)) {
      const note = doc.createElement('p');
      note.className = 'no-times';
      note.textContent = 'Aucune heure future pour cette journée. Revenez au choix du jour.';
      fragment.append(note);
    }
    container.replaceChildren(fragment);
  }

  function revalidateSelection(event) {
    if (!state.service) { showStep(0, event); error('prestation', 'Choisissez une prestation pour continuer.'); return false; }
    if (!state.date || !dayIsAvailable(state.date)) {
      state.date = ''; state.time = null;
      showStep(1, event);
      error('jour', 'Choisissez un jour proposant encore une heure future pour l’essai.');
      return false;
    }
    if (state.time === null || !timeIsAvailable(state.date, state.time)) {
      state.time = null;
      showStep(2, event);
      error('heure', 'Choisissez une heure future pour continuer l’essai.');
      return false;
    }
    return true;
  }
  function validateName() {
    const input = $('#prenom');
    const valid = /\p{L}/u.test(input.value.trim());
    error('prenom', valid ? '' : 'Saisissez un prénom fictif contenant au moins une lettre.', input);
    return valid;
  }
  function validatePhone() {
    const input = $('#telephone');
    const normalized = input.value.trim().replace(/[\s.()\-]/g, '');
    const valid = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(normalized);
    error('telephone', valid ? '' : 'Saisissez un numéro français à dix chiffres, ou au format +33.', input);
    return valid;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      chooseService(input.value);
      say(`Prestation choisie pour l’essai${nbsp}: ${SERVICES[state.service]}.`);
    }
    if (input.name === 'jour') {
      if (!dayIsAvailable(input.value)) { renderDays(); return; }
      if (state.date !== input.value) state.time = null;
      state.date = input.value;
      error('jour', ''); error('heure', '');
      updateSummary();
      say(`Jour choisi pour l’essai${nbsp}: ${longDateFormat.format(dateFromKey(state.date))}.`);
    }
    if (input.name === 'heure') {
      if (!timeIsAvailable(state.date, Number(input.value))) { renderTimes(); return; }
      state.time = Number(input.value);
      error('heure', ''); error('creneau', '');
      updateSummary();
      say(`Heure choisie pour l’essai${nbsp}: ${timeLabel(state.time)}.`);
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', event => {
    const step = Number(button.dataset.next);
    if (step === 0 && !state.service) {
      error('prestation', 'Choisissez une prestation pour continuer.');
      $('[name="prestation"]').focus();
      return;
    }
    if (step === 1 && (!state.date || !dayIsAvailable(state.date))) {
      state.date = ''; state.time = null; updateSummary(); renderDays();
      error('jour', 'Choisissez un jour pour continuer l’essai.');
      const first = $('[name="jour"]:not(:disabled)');
      if (first) first.focus();
      return;
    }
    if (step === 2 && !revalidateSelection(event)) return;
    showStep(step + 1, event);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.back), event)));
  stepButtons.forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.goStep), event)));

  $$('[data-select-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (state.finished) reset(false);
    const value = link.dataset.selectService;
    chooseService(value);
    const radio = $(`[name="prestation"][value="${value}"]`);
    if (radio) radio.checked = true;
    showStep(1, event);
  }));

  $('#prenom').addEventListener('blur', () => { if ($('#prenom').value || $('#prenom').hasAttribute('aria-invalid')) validateName(); });
  $('#telephone').addEventListener('blur', () => { if ($('#telephone').value || $('#telephone').hasAttribute('aria-invalid')) validatePhone(); });
  ['prenom', 'telephone'].forEach(id => $(`#${id}`).addEventListener('input', () => {
    if ($(`#${id}`).hasAttribute('aria-invalid')) error(id, '', $(`#${id}`));
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { $('button[data-next]', panels[state.step])?.click(); return; }
    if (!revalidateSelection(event)) return;
    const nameValid = validateName(), phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      say('Vérifiez les champs indiqués pour terminer la simulation.');
      (!nameValid ? $('#prenom') : $('#telephone')).focus();
      return;
    }
    $('#resultat-detail').textContent = `Votre sélection d’essai${nbsp}: ${SERVICES[state.service]}, ${longDateFormat.format(dateFromKey(state.date))} à ${timeLabel(state.time)}.`;
    state.finished = true;
    form.hidden = true;
    $('.step-navigation').hidden = true;
    result.hidden = false;
    enterPanel(result, event, false);
    form.reset();
    say('Simulation terminée. Aucun rendez-vous n’a été pris et aucune information n’a été envoyée.');
    moveFocus($('#titre-resultat'));
  });
  function reset(focus = true, event) {
    state.service = ''; state.date = ''; state.time = null; state.step = 0; state.finished = false;
    form.reset();
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    $$('.field-error', form).forEach(element => { element.textContent = ''; });
    result.hidden = true; form.hidden = false; $('.step-navigation').hidden = false;
    $('#resultat-detail').textContent = '';
    showStep(0, event, focus);
  }
  $('#recommencer').addEventListener('click', event => reset(true, event));

  // Un lecteur sans JavaScript garde toute la page et les vrais liens du salon.
  renderDays();
  updateSummary();
  workspace.hidden = false;
  fallback.hidden = true;
  root.classList.add('js');
  const startEntrance = () => requestAnimationFrame(() => root.classList.add('is-ready'));
  if (doc.fonts?.ready) {
    Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 500))]).then(startEntrance);
  } else startEntrance();

  const revealTargets = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      const menuEntries = entries.filter(entry => entry.isIntersecting && entry.target.dataset.reveal === 'menu');
      menuEntries.forEach((entry, index) => { entry.target.style.transitionDelay = `${index * 50}ms`; });
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealTargets.forEach(element => observer.observe(element));
  } else revealTargets.forEach(element => element.classList.add('is-visible'));
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      root.classList.add('is-ready');
      revealTargets.forEach(element => element.classList.add('is-visible'));
      panels.forEach(panel => panel.classList.remove('is-entering', 'is-entering-back'));
      result.classList.remove('is-entering');
    }
  });
  const todayRow = $(`[data-weekday="${parisClock().day.getUTCDay()}"]`);
  if (todayRow) {
    todayRow.classList.add('is-today');
    $('dt', todayRow).setAttribute('aria-label', `${$('dt', todayRow).textContent}, aujourd’hui`);
  }
})();
