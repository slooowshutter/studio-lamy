/* L’Art de Pl’Hair · aperçu local. Rien n’est transmis ni enregistré. */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard-use');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-use');
  }, { passive: true });

  // Minutes depuis minuit, uniquement les plages concordantes de la recherche.
  // Mardi : état inconnu ; aucun créneau. Aucune durée de prestation supposée.
  const HOURS = { 0: [], 1: [], 2: [], 3: [[540, 720], [840, 1110]], 4: [[540, 1110]], 5: [[540, 1140]], 6: [[540, 960]] };
  const SERVICES = { coloration: 'Coloration', balayage: 'Balayage', ombre: 'Ombré hair' };
  const NB = '\u00a0';
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function formatHour(minutes) {
    const remainder = minutes % 60;
    return `${Math.floor(minutes / 60)}${NB}h${remainder ? `${NB}${String(remainder).padStart(2, '0')}` : ''}`;
  }
  function comingDays(now = parisNow()) {
    const first = dateFromKey(now.key);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + offset);
      return date;
    });
  }
  function easterSunday(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), total = h + l - 7 * m + 114;
    return new Date(Date.UTC(year, Math.floor(total / 31) - 1, total % 31 + 1, 12));
  }
  function isHoliday(date) {
    const year = date.getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(dateKey(date).slice(5))) return true;
    const easter = easterSunday(year);
    return [1, 39, 50].some(offset => {
      const holiday = new Date(easter);
      holiday.setUTCDate(easter.getUTCDate() + offset);
      return dateKey(holiday) === dateKey(date);
    });
  }
  function dayReason(date, now = parisNow()) {
    const key = dateKey(date), weekday = date.getUTCDay();
    if (key < now.key) return 'Passé';
    if (weekday === 2) return 'À confirmer';
    if (!HOURS[weekday].length) return 'Fermé';
    if (isHoliday(date)) return 'Férié · exclu';
    if (key === now.key && !HOURS[weekday].some(([, end]) => now.minute < end - 30)) return 'Journée terminée';
    return '';
  }
  function slotsFor(key, now = parisNow()) {
    if (!key) return [];
    const date = dateFromKey(key);
    if (dayReason(date, now)) return [];
    const seed = Math.floor(date.getTime() / 86400000);
    return HOURS[date.getUTCDay()].flatMap(([start, end]) => {
      const slots = [];
      for (let minute = start; minute < end; minute += 30) {
        const past = key === now.key && minute <= now.minute;
        const excluded = (seed + minute / 30) % 7 === 0;
        slots.push({ minute, disabled: past || excluded, reason: past ? 'Passée' : excluded ? 'Exclue · exemple' : '' });
      }
      return slots;
    });
  }
  function usableDay(key, now = parisNow()) {
    return comingDays(now).some(date => dateKey(date) === key && !dayReason(date, now)) && slotsFor(key, now).some(slot => !slot.disabled);
  }
  function usableTime(key, minute, now = parisNow()) {
    return usableDay(key, now) && slotsFor(key, now).some(slot => slot.minute === minute && !slot.disabled);
  }

  const state = { service: '', day: '', time: null, step: 0, complete: false };
  const form = $('#simulation');
  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const continueButton = $('#continuer');
  const previousButton = $('#precedent');
  const errorChoice = $('#erreur-choix');
  let panelAnimation;
  const announce = (text) => { $('#annonce-etape').textContent = text; };

  function animatePanel(panel) {
    if (panelAnimation) panelAnimation.cancel();
    if (reduced.matches || keyboard || typeof panel.animate !== 'function') return;
    panelAnimation = panel.animate([
      { opacity: 0, transform: 'translateX(8px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function focusInView(heading) {
    heading.focus({ preventScroll: true });
    const box = heading.getBoundingClientRect();
    if (box.top < 28 || box.bottom > window.innerHeight - 90) {
      heading.scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
    }
  }
  function recap() {
    const values = [SERVICES[state.service], state.day ? longDate.format(dateFromKey(state.day)) : '', state.time !== null ? `à ${formatHour(state.time)}` : ''];
    return values.filter(Boolean).join(' · ');
  }
  function updateSummary() {
    $('#choix-prestation').textContent = SERVICES[state.service] || 'À choisir';
    $('#choix-jour').textContent = state.day ? longDate.format(dateFromKey(state.day)) : 'À choisir';
    $('#choix-heure').textContent = state.time !== null ? formatHour(state.time) : 'À choisir';
    $('#recap-final').textContent = `Votre exemple : ${recap()}. Tarif et durée à confirmer par téléphone.`;
    steps.forEach((button, index) => {
      button.disabled = state.complete || (index === 1 && !state.service) || (index === 2 && !state.day) || (index === 3 && state.time === null);
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    requestRouteUpdate();
  }
  function addChoice(fieldset, { name, value, disabled = false, checked = false, children, accessibleName }) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', accessibleName);
    label.append(input);
    children.forEach(child => label.append(child));
    fieldset.append(label);
    return input;
  }
  function textNode(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function clearChoices(fieldset) {
    $$('label, .empty-choices', fieldset).forEach(node => node.remove());
  }
  function renderDays() {
    const fieldset = $('#jours'), now = parisNow();
    clearChoices(fieldset);
    if (state.day && !usableDay(state.day, now)) { state.day = ''; state.time = null; }
    comingDays(now).forEach(date => {
      const key = dateKey(date);
      let reason = dayReason(date, now);
      if (!reason && !slotsFor(key, now).some(slot => !slot.disabled)) reason = 'Journée terminée';
      addChoice(fieldset, {
        name: 'jour', value: key, disabled: !!reason, checked: state.day === key,
        accessibleName: `${longDate.format(date)}, ${reason || 'jour illustratif'}`,
        children: [textNode('span', `${shortDay.format(date)} ${shortMonth.format(date)}`), textNode('strong', String(date.getUTCDate())), textNode('span', reason || 'Exemple', 'day-state')]
      });
    });
  }
  function renderTimes() {
    const fieldset = $('#heures');
    clearChoices(fieldset);
    const slots = slotsFor(state.day);
    if (state.time !== null && !usableTime(state.day, state.time)) state.time = null;
    slots.forEach(slot => {
      addChoice(fieldset, {
        name: 'heure', value: String(slot.minute), disabled: slot.disabled, checked: state.time === slot.minute,
        accessibleName: `${formatHour(slot.minute)}, ${slot.reason || 'heure illustrative'}`,
        children: [textNode('span', formatHour(slot.minute), 'time-value'), textNode('small', slot.reason || 'Exemple')]
      });
    });
    if (!slots.some(slot => !slot.disabled)) fieldset.append(textNode('p', 'Il ne reste pas d’heure illustrative pour ce jour. Revenez au choix du jour.', 'empty-choices'));
  }
  function showStep(step, { focus = true, message = '' } = {}) {
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    previousButton.hidden = step === 0;
    const labels = ['Choisir le jour', 'Choisir l’heure', 'Continuer', 'Terminer la simulation'];
    continueButton.replaceChildren(textNode('span', labels[step]), textNode('span', '→'));
    continueButton.lastElementChild.setAttribute('aria-hidden', 'true');
    errorChoice.textContent = message;
    updateSummary();
    announce(`Étape ${step + 1} sur 4. ${$('.step-title', panels[step]).textContent}`);
    animatePanel(panels[step]);
    if (focus) focusInView($('.step-title', panels[step]));
  }
  function focusChoice(name) {
    const input = $(`input[name="${name}"]:not(:disabled)`, form);
    if (input) input.focus({ preventScroll: true });
  }
  function invalidChoice(message, name) {
    errorChoice.textContent = message;
    focusChoice(name);
  }
  function validateField(input, message, valid) {
    const error = $(`#erreur-${input.id}`);
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    error.textContent = valid ? '' : message;
    return valid;
  }
  function validName(value) { return /\p{L}/u.test(value.trim()) && value.trim().length <= 60; }
  function validPhone(value) { return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(value.replace(/[\s.()\-]/g, '')); }
  function validateDetails() {
    const name = $('#prenom'), phone = $('#telephone');
    const nameOK = validateField(name, 'Indiquez un prénom pour terminer la simulation.', validName(name.value));
    const phoneOK = validateField(phone, 'Indiquez un numéro français à dix chiffres ou avec +33.', validPhone(phone.value));
    if (!nameOK || !phoneOK) {
      (!nameOK ? name : phone).focus({ preventScroll: false });
      errorChoice.textContent = 'Vérifiez les champs signalés ci-dessus.';
      return false;
    }
    return true;
  }
  function finish() {
    state.complete = true;
    $('#resultat-recap').textContent = `Exemple de parcours : ${recap()}. Tarif et durée à confirmer avec le salon.`;
    form.hidden = true;
    $('.step-nav').hidden = true;
    $('#resultat').hidden = false;
    updateSummary();
    animatePanel($('#resultat'));
    focusInView($('#resultat h3'));
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée. Appelez le salon pour réserver.');
  }
  function reset() {
    form.reset();
    Object.assign(state, { service: '', day: '', time: null, step: 0, complete: false });
    $$('.field-error').forEach(node => { node.textContent = ''; });
    $$('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    $('#resultat').hidden = true;
    $('#resultat-recap').textContent = '';
    form.hidden = false;
    $('.step-nav').hidden = false;
    showStep(0);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') state.service = input.value;
    if (input.name === 'jour') { state.day = input.value; state.time = null; }
    if (input.name === 'heure') state.time = Number(input.value);
    errorChoice.textContent = '';
    updateSummary();
    if (input.name === 'prestation') announce(`${SERVICES[state.service]} sélectionné.`);
    if (input.name === 'jour') announce(`${longDate.format(dateFromKey(state.day))} sélectionné pour l’exemple.`);
    if (input.name === 'heure') announce(`${formatHour(state.time)} sélectionnée pour l’exemple.`);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) return invalidChoice('Choisissez une spécialité pour continuer.', 'prestation');
    if (state.step === 1 && !usableDay(state.day)) return invalidChoice('Choisissez un jour illustratif proposé.', 'jour');
    if (state.step === 2 && (state.time === null || !usableTime(state.day, state.time))) return invalidChoice('Choisissez une heure illustrative proposée.', 'heure');
    if (state.step === 3) {
      if (!usableTime(state.day, state.time)) {
        state.time = null;
        if (!usableDay(state.day)) { state.day = ''; showStep(1, { message: 'L’exemple a expiré. Choisissez un nouveau jour.' }); }
        else showStep(2, { message: 'Cette heure est passée. Choisissez une autre heure illustrative.' });
        return;
      }
      if (validateDetails()) finish();
      return;
    }
    showStep(state.step + 1);
  });
  previousButton.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  steps.forEach(button => button.addEventListener('click', () => { if (!button.disabled) showStep(Number(button.dataset.step)); }));
  $('#recommencer').addEventListener('click', reset);
  $('#prenom').addEventListener('blur', event => {
    if (event.target.value || event.target.hasAttribute('aria-invalid')) validateField(event.target, 'Indiquez un prénom pour terminer la simulation.', validName(event.target.value));
  });
  $('#telephone').addEventListener('blur', event => {
    if (event.target.value || event.target.hasAttribute('aria-invalid')) validateField(event.target, 'Indiquez un numéro français à dix chiffres ou avec +33.', validPhone(event.target.value));
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (state.complete) reset();
    state.service = link.dataset.service;
    $(`input[name="prestation"][value="${state.service}"]`).checked = true;
    showStep(1);
    $('.booking-panel').scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
  }));

  $('#copier-adresse').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Copie indisponible');
      await navigator.clipboard.writeText('18 avenue de la Concorde, 21000 Dijon');
      $('#copie-retour').textContent = 'Adresse copiée.';
    } catch {
      $('#copie-retour').textContent = 'Copie indisponible ici. Vous pouvez sélectionner l’adresse ci-dessus.';
    }
  });

  // Un seul calcul groupé par image pour le fil ; aucune animation de taille.
  const hero = $('.hero');
  const route = $('.route');
  const progress = $('.route__progress');
  const connector = $('.hero-connector');
  let scheduled = false;
  function updateRoute() {
    scheduled = false;
    if (reduced.matches) { progress.style.transform = 'none'; return; }
    const rect = route.getBoundingClientRect();
    const fraction = Math.max(.001, Math.min(1, (window.innerHeight * .7 - rect.top) / rect.height));
    progress.style.transform = `scaleY(${fraction})`;
  }
  function requestRouteUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateRoute);
  }
  function placeConnector() {
    const box = hero.getBoundingClientRect(), initial = $('#initiale').getBoundingClientRect();
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    const axis = narrow ? 12 : box.width / 2;
    const originX = initial.left - box.left + initial.width * .35;
    const originY = initial.bottom - box.top - 10;
    const edge = narrow ? 12 : 3;
    const turn = 18;
    const endY = box.height;
    connector.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const start = `M${originX} ${originY} H${edge + turn} Q${edge} ${originY} ${edge} ${originY + turn}`;
    $('path', connector).setAttribute('d', narrow ? `${start} V${endY + 3}` : `${start} V${endY - 47} Q${edge} ${endY - 24} ${edge + 23} ${endY - 24} H${axis - 24} Q${axis} ${endY - 24} ${axis} ${endY} V${endY + 3}`);
    requestRouteUpdate();
  }
  window.addEventListener('scroll', requestRouteUpdate, { passive: true });
  window.addEventListener('resize', placeConnector, { passive: true });
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(placeConnector);
    sizeObserver.observe(hero);
    const routeObserver = new ResizeObserver(requestRouteUpdate);
    routeObserver.observe(route);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeConnector);

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('.reveal, .stop__marker').forEach((node, index) => {
      if (node.classList.contains('service-row')) node.style.transitionDelay = `${(index % 3) * 60}ms`;
      revealObserver.observe(node);
    });

    const mobileBar = $('.mobile-bar');
    const visibleAreas = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibleAreas.set(entry.target.id, entry.isIntersecting));
      mobileBar.hidden = Array.from(visibleAreas.values()).some(Boolean);
    }, { threshold: 0 });
    [$('#actions-depart'), $('#rendez-vous'), $('#sources')].forEach(node => { visibleAreas.set(node.id, false); barObserver.observe(node); });

    if (!reduced.matches) {
      root.classList.add('motion-ready');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
    }
  }
  reduced.addEventListener('change', () => {
    if (panelAnimation) panelAnimation.cancel();
    if (reduced.matches) root.classList.remove('motion-ready');
    requestRouteUpdate();
  });

  $('.booking-app').hidden = false;
  showStep(0, { focus: false });
  placeConnector();
})();
