'use strict';

/* Calculs de calendrier isolés pour vérifier les horaires sans navigateur. */
const LlorensAgenda = (() => {
  const services = [
    { id: 'bilan', name: 'Bilan préalable IPL', minutes: 30, duration: '30\u00a0min', price: 25, from: false },
    { id: 'americaine', name: 'Pose américaine sans dépose', minutes: 45, duration: '45\u00a0min', price: 57, from: true },
    { id: 'gel', name: 'Extension gel', minutes: 90, duration: '1\u00a0h\u00a030', price: 70, from: true },
    { id: 'cils', name: 'Rehaussement de cils', minutes: 45, duration: '45\u00a0min', price: 46, from: false },
    { id: 'teinture', name: 'Teinture cils ou sourcils', minutes: 15, duration: '15\u00a0min', price: 15, from: false }
  ];
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateAtNoon = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function addDays(key, days) {
    const date = dateAtNoon(key);
    date.setUTCDate(date.getUTCDate() + days);
    return dateKey(date);
  }
  function hours(key) {
    const weekday = dateAtNoon(key).getUTCDay();
    if (weekday === 0) return null;
    return weekday === 6 ? { start: 540, end: 825 } : { start: 570, end: 1140 };
  }
  function holiday(key) {
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5))) return true;
    const year = Number(key.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return [1, 39, 50].some(offset => addDays(easter, offset) === key);
  }
  function slots(key, service, now = parisNow()) {
    const opening = hours(key);
    if (!opening || !service) return [];
    const ordinal = Math.floor(dateAtNoon(key).getTime() / 86400000);
    const salt = services.findIndex(item => item.id === service.id);
    const result = [];
    for (let minute = opening.start, index = 0; minute + service.minutes <= opening.end; minute += 30, index++) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const taken = (ordinal + index + salt + 1) % 5 === 0;
      result.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return result;
  }
  function days(service, now = parisNow()) {
    return Array.from({ length: 14 }, (_, index) => {
      const key = addDays(now.key, index);
      const closed = !hours(key);
      const finished = !closed && !slots(key, service, now).some(slot => !slot.disabled);
      return { key, disabled: closed || finished, status: closed ? 'Fermé' : finished ? 'Terminé' : holiday(key) ? 'Férié*' : 'Exemple' };
    });
  }
  const timeLabel = minute => `${Math.floor(minute / 60)}\u00a0h\u00a0${String(minute % 60).padStart(2, '0')}`;
  const priceLabel = service => `${service.from ? 'À partir de ' : ''}${service.price}\u00a0€`;
  function validMobile(raw) {
    const compact = raw.replace(/[\s.()\-]/g, '');
    return /^(?:0|\+33|0033)[67]\d{8}$/.test(compact);
  }
  return { services, parisNow, dateAtNoon, addDays, hours, holiday, slots, days, timeLabel, priceLabel, validMobile };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = LlorensAgenda;

if (typeof document !== 'undefined') (() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  root.classList.add('js');

  /* Au clavier, les actions répondent immédiatement (STANDARDS.md). */
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') root.classList.add('keyboard');
  }, true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), true);

  const revealTargets = $$('.hero, [data-reveal], [data-rule]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealTargets.forEach(target => revealObserver.observe(target));
  } else revealTargets.forEach(target => target.classList.add('is-visible'));

  /* Les actions rapides laissent la place au formulaire et aux sources. */
  if ('IntersectionObserver' in window) {
    const visibleSections = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      $('.mobile-bar').hidden = visibleSections.size > 0;
    });
    ['#reserver', '#pied'].forEach(selector => barObserver.observe($(selector)));
  }

  const agenda = LlorensAgenda;
  const state = { service: null, day: null, minute: null, step: 0, reached: 0, done: false };
  const panels = $$('.booking-step');
  const steps = $$('.step-nav button');
  const form = $('#booking-form');
  const success = $('#resultat');
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });
  const stepNames = ['Choisir le soin', 'Choisir le jour', 'Choisir l’heure', 'Vos coordonnées'];
  let transitionTimer;
  let announceTimer;

  function announce(text) {
    clearTimeout(announceTimer);
    $('#annonce').textContent = '';
    announceTimer = setTimeout(() => { $('#annonce').textContent = text; }, 30);
  }
  function clearStepErrors() {
    ['soin', 'jour', 'heure'].forEach(name => { $(`#erreur-${name}`).textContent = ''; });
  }
  function selectionText() {
    if (!state.service) return '';
    return `${state.service.name}, ${state.service.duration}, ${agenda.priceLabel(state.service)}${state.day ? `, ${longDate.format(agenda.dateAtNoon(state.day))}` : ''}${state.minute !== null ? ` à ${agenda.timeLabel(state.minute)}` : ''}.`;
  }
  function recap(container) {
    const strong = document.createElement('strong');
    strong.textContent = state.service.name;
    const text = document.createElement('p');
    text.textContent = `${longDate.format(agenda.dateAtNoon(state.day))} à ${agenda.timeLabel(state.minute)} · ${state.service.duration} · ${agenda.priceLabel(state.service)}`;
    const note = document.createElement('p');
    note.className = 'caption';
    note.textContent = 'Tarifs de la fiche Planity, à confirmer avec le salon. Créneau fictif.';
    container.replaceChildren(strong, text, note);
  }
  function updateSummary() {
    $('#selection-soin').textContent = state.service ? `${state.service.name} · ${state.service.duration}` : 'À choisir';
    $('#selection-jour').textContent = state.day ? longDate.format(agenda.dateAtNoon(state.day)) : 'À choisir';
    $('#selection-heure').textContent = state.minute !== null ? agenda.timeLabel(state.minute) : 'À choisir';
    $('#selection-prix').textContent = state.service ? agenda.priceLabel(state.service) : '—';
  }
  function updateNavigation() {
    steps.forEach((button, index) => {
      button.disabled = index > state.reached || state.done;
      if (index === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    clearTimeout(transitionTimer);
    panels.forEach(panel => { panel.hidden = true; panel.classList.remove('is-entering'); });
    success.hidden = true;
    state.done = false;
    form.hidden = false;
    state.step = index;
    state.reached = Math.max(state.reached, index);
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    if (index === 3) recap($('#recap-final'));
    const panel = panels[index];
    panel.hidden = false;
    if (!reduceMotion.matches && !root.classList.contains('keyboard')) {
      panel.classList.add('is-entering');
      transitionTimer = setTimeout(() => panel.classList.remove('is-entering'), 20);
    }
    updateNavigation();
    if (focus) {
      const heading = panel.querySelector('h3');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      announce(`Étape ${index + 1} sur 4. ${stepNames[index]}.`);
    }
  }
  function renderServices() {
    $('#choix-soins').innerHTML = agenda.services.map(service => `<label class="service-option"><input type="radio" name="soin" value="${service.id}" aria-describedby="erreur-soin" ${state.service?.id === service.id ? 'checked' : ''}><span><span class="option-name">${service.name}</span><span class="option-duration">${service.duration}</span></span><span class="option-price">${service.from ? '<small>À partir de</small>' : ''}${service.price}\u00a0€</span></label>`).join('');
  }
  function chooseService(id) {
    const service = agenda.services.find(item => item.id === id);
    if (!service) return;
    if (state.service?.id !== id) {
      state.day = null;
      state.minute = null;
      state.reached = 1;
    }
    state.service = service;
    clearStepErrors();
    updateSummary();
    updateNavigation();
    announce(`${service.name}, ${service.duration}, ${agenda.priceLabel(service)}. Tarif Planity à confirmer.`);
  }
  function renderDays() {
    const list = agenda.days(state.service);
    if (state.day && !list.some(day => day.key === state.day && !day.disabled)) {
      state.day = null;
      state.minute = null;
      state.reached = 1;
      updateSummary();
    }
    $('#choix-jours').innerHTML = list.map(day => {
      const date = agenda.dateAtNoon(day.key);
      const label = `${longDate.format(date)}${agenda.holiday(day.key) ? ', jour férié, ouverture à confirmer' : ''}, ${day.status === 'Exemple' ? 'disponibilités fictives' : day.status}`;
      return `<label class="day-option"><input type="radio" name="jour" value="${day.key}" aria-label="${label}" aria-describedby="erreur-jour" ${day.disabled ? 'disabled' : ''} ${state.day === day.key ? 'checked' : ''}><span class="day-name">${shortDay.format(date)}</span><span class="day-date">${date.getUTCDate()}</span><span class="day-name">${monthLabel.format(date)}</span><span class="day-state">${day.status}</span></label>`;
    }).join('');
    const note = document.createElement('p');
    note.className = 'caption';
    note.textContent = '* Jour férié\u00a0: ouverture à confirmer auprès de l’institut. Créneaux entièrement fictifs.';
    $('#choix-jours').append(note);
  }
  function renderSlots() {
    const list = agenda.slots(state.day, state.service);
    if (state.minute !== null && !list.some(slot => slot.minute === state.minute && !slot.disabled)) {
      state.minute = null;
      state.reached = 2;
      updateSummary();
    }
    $('#aide-heures').textContent = `${longDate.format(agenda.dateAtNoon(state.day))}. Créneaux d’exemple\u00a0; «\u00a0Déjà pris\u00a0» est aussi simulé.${agenda.holiday(state.day) ? ' Jour férié\u00a0: ouverture à confirmer.' : ''}`;
    $('#choix-heures').innerHTML = list.map(slot => `<label class="slot-option"><input type="radio" name="heure" value="${slot.minute}" aria-label="${agenda.timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', créneau fictif'}" aria-describedby="erreur-heure" ${slot.disabled ? 'disabled' : ''} ${state.minute === slot.minute ? 'checked' : ''}><span>${agenda.timeLabel(slot.minute)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label>`).join('');
    if (!list.some(slot => !slot.disabled)) {
      const empty = document.createElement('p');
      empty.className = 'empty-slots';
      empty.textContent = 'Aucun créneau d’exemple disponible ce jour. Revenez à l’étape Jour pour choisir une autre date.';
      $('#choix-heures').append(empty);
    }
  }
  function invalidStep(kind, message) {
    const error = $(`#erreur-${kind}`);
    error.textContent = message;
    const name = kind === 'soin' ? 'soin' : kind === 'jour' ? 'jour' : 'heure';
    const first = form.querySelector(`input[name="${name}"]:not(:disabled)`);
    first?.focus();
    announce(message);
  }

  $('#choix-soins').addEventListener('change', event => chooseService(event.target.value));
  $('#choix-jours').addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    state.day = event.target.value;
    state.minute = null;
    state.reached = 2;
    clearStepErrors();
    updateSummary();
    updateNavigation();
    announce(`Jour sélectionné\u00a0: ${longDate.format(agenda.dateAtNoon(state.day))}.`);
  });
  $('#choix-heures').addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.minute = Number(event.target.value);
    state.reached = 3;
    clearStepErrors();
    updateSummary();
    updateNavigation();
    announce(`Heure sélectionnée\u00a0: ${agenda.timeLabel(state.minute)}. Créneau fictif.`);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !state.service) return invalidStep('soin', 'Choisissez une prestation pour continuer.');
    if (next === 2 && !state.day) return invalidStep('jour', 'Choisissez un jour pour continuer.');
    if (next === 3 && state.minute === null) return invalidStep('heure', 'Choisissez un créneau pour continuer.');
    clearStepErrors();
    showStep(next);
  }));
  steps.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (index <= state.reached) showStep(index);
  }));
  $$('[data-preselect]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    chooseService(link.dataset.preselect);
    renderServices();
    showStep(0, false);
    updateNavigation();
    $('#reserver').scrollIntoView({ behavior: reduceMotion.matches || root.classList.contains('keyboard') ? 'instant' : 'smooth', block: 'start' });
    $('#etape-soin').focus({ preventScroll: true });
    announce(`${selectionText()} Étape 1 sur 4. Choisir le soin.`);
  }));

  function clearFieldError(input) {
    input.removeAttribute('aria-invalid');
    $(`#erreur-${input.id}`).textContent = '';
  }
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('input', event => clearFieldError(event.target));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    /* La touche Entrée ne doit pas sauter les étapes du formulaire. */
    if (state.step !== 3 || state.done) return;
    const name = $('#prenom');
    const phone = $('#telephone');
    clearFieldError(name);
    clearFieldError(phone);
    let firstError;
    if (name.value.trim().length < 2) {
      name.setAttribute('aria-invalid', 'true');
      $('#erreur-prenom').textContent = 'Indiquez un prénom d’au moins deux caractères.';
      firstError = name;
    }
    if (!agenda.validMobile(phone.value)) {
      phone.setAttribute('aria-invalid', 'true');
      $('#erreur-telephone').textContent = 'Indiquez un mobile français à 10 chiffres commençant par 06 ou 07, ou au format +33.';
      firstError ||= phone;
    }
    if (firstError) {
      firstError.focus();
      announce('Vérifiez les champs indiqués avant de terminer la simulation.');
      return;
    }
    const validDay = agenda.days(state.service).some(day => day.key === state.day && !day.disabled);
    const validSlot = validDay && agenda.slots(state.day, state.service).some(slot => slot.minute === state.minute && !slot.disabled);
    if (!validDay || !validSlot) {
      state.minute = null;
      state.reached = validDay ? 2 : 1;
      showStep(validDay ? 2 : 1);
      updateSummary();
      return invalidStep(validDay ? 'heure' : 'jour', 'Le temps a passé depuis votre choix. Choisissez un nouveau créneau d’exemple.');
    }
    clearTimeout(transitionTimer);
    recap($('#recap-resultat'));
    state.done = true;
    form.hidden = true;
    success.hidden = false;
    if (!reduceMotion.matches && !root.classList.contains('keyboard')) {
      success.classList.add('is-entering');
      transitionTimer = setTimeout(() => success.classList.remove('is-entering'), 20);
    }
    updateNavigation();
    $('#titre-resultat').focus({ preventScroll: true });
    $('#titre-resultat').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    announce('Simulation terminée. Aucun rendez-vous n’a été pris, aucune information n’a été envoyée.');
    /* Les coordonnées ne sont utilisées ni dans le résultat ni dans une URL. */
    name.value = '';
    phone.value = '';
  });
  $('#recommencer').addEventListener('click', () => {
    Object.assign(state, { service: null, day: null, minute: null, step: 0, reached: 0, done: false });
    form.reset();
    ['prenom', 'telephone'].forEach(id => clearFieldError($(`#${id}`)));
    clearStepErrors();
    renderServices();
    updateSummary();
    showStep(0);
  });

  renderServices();
  updateSummary();
  $('#parcours').hidden = false;
  showStep(0, false);
})();
