/* Lyna Nails — simulation locale. Aucune requête, aucun stockage de données. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nb = '\u00a0';
  const services = {
    couleur: { name: 'Dépose et pose de semi-permanent coloré sur les mains', duration: 30 },
    manucure: { name: 'Manucure et pose de semi-permanent coloré', duration: 35 },
    depose: { name: 'Dépose complète de semi-permanent et pose d’un vernis soin durcisseur', duration: 15 }
  };
  // Source : profil Treatwell. Lundi à samedi 10 h–19 h ; dimanche fermé.
  const opening = 600;
  const closing = 1140;
  const state = { family: 'mains', service: null, day: null, time: null, step: 0, furthest: 0 };
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const hfr = minute => `${Math.floor(minute / 60)}${nb}h${minute % 60 ? nb + String(minute % 60).padStart(2, '0') : ''}`;
  const dateKey = date => date.toISOString().slice(0, 10);
  const parseDay = key => new Date(`${key}T12:00:00Z`);
  let availableDays = [];
  let panelFrame = 0;
  let summaryFrame = 0;

  document.addEventListener('keydown', () => root.classList.add('keyboard-input'), true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-input'), true);
  const canMove = () => !reduced.matches && !root.classList.contains('keyboard-input');

  function nowInParis() {
    const pieces = {};
    parisFormat.formatToParts(new Date()).forEach(piece => { pieces[piece.type] = piece.value; });
    return {
      date: new Date(Date.UTC(+pieces.year, +pieces.month - 1, +pieces.day, 12)),
      minute: (+pieces.hour % 24) * 60 + +pieces.minute
    };
  }

  // Les exceptions aux horaires ne sont pas publiées. Les jours fériés restent
  // donc à confirmer, sans créneau proposé par la simulation.
  function publicHoliday(date) {
    const y = date.getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(dateKey(date).slice(5))) return true;
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easter = Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12);
    return [1, 39, 50].some(offset => date.getTime() === easter + offset * 86400000);
  }

  function slotsFor(key) {
    if (!state.service || !key) return [];
    const date = parseDay(key);
    const now = nowInParis();
    if (date.getUTCDay() === 0 || publicHoliday(date) || key < dateKey(now.date)) return [];
    const duration = services[state.service].duration;
    const salt = date.getUTCDate() + date.getUTCMonth() * 3 + duration;
    const slots = [];
    for (let minute = opening; minute + duration <= closing; minute += 30) {
      const past = key === dateKey(now.date) && minute <= now.minute;
      const occupied = (minute / 30 + salt) % 5 === 0;
      slots.push({ minute, disabled: past || occupied, reason: past ? 'Heure passée' : occupied ? 'Indisponible dans cet exemple' : '' });
    }
    return slots;
  }

  function announce(message) { $('#booking-status').textContent = message; }
  function clearErrors() { $$('.field-error').forEach(node => { node.textContent = ''; }); }

  function updateNavigation() {
    $$('.step-nav button').forEach((button, index) => {
      button.disabled = index > state.furthest;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function updateSummary() {
    const serviceText = state.family === 'mains' ? state.service ? services[state.service].name : 'À choisir' : state.family === 'pieds' ? 'Beauté des pieds avec vernis' : 'Épilation à la cire classique';
    const values = {
      'summary-service': serviceText,
      'summary-day': state.family !== 'mains' ? 'Par téléphone' : state.day ? longDate.format(parseDay(state.day)) : 'À choisir',
      'summary-time': state.family !== 'mains' ? 'À confirmer' : state.time !== null ? hfr(state.time) : 'À choisir'
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element.textContent !== value) {
        element.textContent = value;
        element.classList.toggle('is-writing', canMove());
      }
    });
    cancelAnimationFrame(summaryFrame);
    summaryFrame = requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.selection-sheet dd').forEach(element => element.classList.remove('is-writing'));
    }));
    $$('[data-sheet-family]').forEach(element => element.classList.toggle('selected', element.dataset.sheetFamily === state.family));
  }

  function radioOption(className, name, value, labelText, disabled = false) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', labelText);
    label.append(input);
    return { label, input };
  }

  function renderDays() {
    const target = $('#day-options');
    target.replaceChildren();
    const now = nowInParis();
    availableDays = [];
    for (let index = 0; index < 14; index++) {
      const date = new Date(now.date.getTime() + index * 86400000);
      const key = dateKey(date);
      const sunday = date.getUTCDay() === 0;
      const holiday = publicHoliday(date);
      const allPast = !sunday && !holiday && !slotsFor(key).some(slot => !slot.disabled);
      const disabled = sunday || holiday || allPast;
      const status = sunday ? 'Fermé' : holiday ? 'À confirmer' : allPast ? 'Passé' : '';
      if (!disabled) availableDays.push(key);
      const { label, input } = radioOption('date-option', 'jour', key, `${longDate.format(date)}${status ? ', ' + status : ', simulation'}`, disabled);
      input.checked = state.day === key;
      const dayName = document.createElement('span'); dayName.textContent = weekday.format(date);
      const number = document.createElement('strong'); number.textContent = date.getUTCDate();
      const monthName = document.createElement('small'); monthName.textContent = month.format(date);
      label.append(dayName, number, monthName);
      if (status) { const note = document.createElement('span'); note.className = 'date-status'; note.textContent = status; label.append(note); }
      target.append(label);
    }
  }

  function renderTimes() {
    const target = $('#time-options'); target.replaceChildren();
    const slots = slotsFor(state.day);
    $('#chosen-day').textContent = state.day ? longDate.format(parseDay(state.day)) : '';
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
    slots.forEach(slot => {
      const { label, input } = radioOption('time-option', 'heure', String(slot.minute), `${hfr(slot.minute)}${slot.reason ? ', ' + slot.reason : ', simulation'}`, slot.disabled);
      input.checked = state.time === slot.minute && !slot.disabled;
      const text = document.createElement('span'); text.textContent = hfr(slot.minute); label.append(text);
      target.append(label);
    });
  }

  function recap() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${services[state.service].name} — ${longDate.format(parseDay(state.day))}, à ${hfr(state.time)}. Durée publiée : ${services[state.service].duration}${nb}min. Simulation uniquement.`;
  }

  function showStep(index, focus = true) {
    cancelAnimationFrame(panelFrame);
    state.step = index;
    $$('.booking-panel').forEach(panel => {
      panel.hidden = +panel.dataset.panel !== index;
      panel.classList.remove('is-entering');
    });
    const panel = $(`[data-panel="${index}"]`);
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    if (index === 3) $('#confirm-recap').textContent = recap();
    if (canMove()) {
      panel.classList.add('is-entering');
      panelFrame = requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }
    updateNavigation(); updateSummary();
    if (focus) {
      $(`#step-title-${index}`).focus({ preventScroll: true });
      const rect = panel.getBoundingClientRect();
      if (rect.top < 20 || rect.top > window.innerHeight - 180) panel.scrollIntoView({ block: 'start', behavior: canMove() ? 'smooth' : 'instant' });
    }
    announce(`Étape ${index + 1} sur 4. ${$(`#step-title-${index}`).textContent}`);
  }

  function setFamily(family) {
    if (state.family !== family) {
      state.family = family; state.service = null; state.day = null; state.time = null; state.furthest = 0;
      $$('input[name="soin"]').forEach(input => { input.checked = false; });
    }
    $$('[data-family]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.family === family)));
    const hands = family === 'mains';
    $('#service-options').hidden = !hands;
    $('#phone-care').hidden = hands;
    $('#service-next').hidden = !hands;
    if (!hands) $('.phone-care-title').textContent = family === 'pieds' ? 'Beauté des pieds avec vernis' : 'Épilation à la cire classique';
    clearErrors(); updateNavigation(); updateSummary();
    announce(hands ? 'Les soins des mains sont proposés dans la simulation.' : 'Pour ce soin, prise de rendez-vous par téléphone ou sur Treatwell.');
  }

  function fail(id, message, focusTarget) {
    $(id).textContent = message;
    if (focusTarget) focusTarget.focus();
    announce(message);
    return false;
  }

  function validDay() { renderDays(); return state.day && availableDays.includes(state.day); }
  function validTime() { return state.time !== null && slotsFor(state.day).some(slot => slot.minute === state.time && !slot.disabled); }

  function nextStep(index) {
    clearErrors();
    if (!state.service) return fail('#service-error', 'Choisissez un soin pour continuer.', $('input[name="soin"]'));
    if (index >= 2 && !validDay()) return fail('#day-error', 'Choisissez un jour proposé dans cette simulation.', $('input[name="jour"]:not(:disabled)'));
    if (index >= 3 && !validTime()) return fail('#time-error', 'Choisissez un horaire proposé dans cette simulation.', $('input[name="heure"]:not(:disabled)'));
    state.furthest = Math.max(state.furthest, index);
    showStep(index);
    return true;
  }

  $$('[data-family]').forEach(button => button.addEventListener('click', () => setFamily(button.dataset.family)));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => nextStep(+button.dataset.next)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => { clearErrors(); showStep(+button.dataset.back); }));
  $$('.step-nav button').forEach(button => button.addEventListener('click', () => { clearErrors(); showStep(+button.dataset.step); }));

  $('#booking-form').addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'soin') {
      state.service = input.value; state.day = null; state.time = null; state.furthest = 0;
      $('#service-error').textContent = '';
    } else if (input.name === 'jour') {
      state.day = input.value; state.time = null; state.furthest = 1; $('#day-error').textContent = '';
    } else if (input.name === 'heure') {
      state.time = +input.value; state.furthest = 2; $('#time-error').textContent = '';
    }
    updateNavigation(); updateSummary();
  });

  function resetSimulation(focus = true) {
    $('#booking-form').reset(); $('#booking-form').hidden = false;
    $('#booking-success').hidden = true; $('.step-nav').hidden = false;
    $('#prenom').removeAttribute('aria-invalid'); $('#telephone').removeAttribute('aria-invalid');
    Object.assign(state, { family: 'mains', service: null, day: null, time: null, step: 0, furthest: 0 });
    $('.sheet-stamp').replaceChildren(document.createTextNode('Simulation'), document.createElement('br'));
    const note = document.createElement('span'); note.textContent = 'Aucun rendez-vous réel'; $('.sheet-stamp').append(note);
    setFamily('mains'); clearErrors(); showStep(0, focus);
  }

  $$('.choose-care').forEach(button => button.addEventListener('click', () => {
    if (!$('#booking-success').hidden) resetSimulation(false);
    setFamily('mains');
    const input = $(`input[name="soin"][value="${button.dataset.service}"]`);
    input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    state.furthest = 1;
    showStep(1, false);
    $('#booking-workspace').scrollIntoView({ behavior: canMove() ? 'smooth' : 'instant', block: 'start' });
    $('#step-title-1').focus({ preventScroll: true });
  }));

  function validateContact() {
    const name = $('#prenom'), phone = $('#telephone');
    const nameOK = !name.value || name.value.trim().length >= 2;
    const digits = phone.value.replace(/[\s.()\-]/g, '');
    const phoneOK = !phone.value.trim() || /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    name.setAttribute('aria-invalid', String(!nameOK)); phone.setAttribute('aria-invalid', String(!phoneOK));
    $('#name-error').textContent = nameOK ? '' : 'Saisissez au moins deux caractères, ou laissez le champ vide.';
    $('#phone-error').textContent = phoneOK ? '' : 'Saisissez un numéro français à dix chiffres, ou laissez le champ vide.';
    if (!nameOK) name.focus(); else if (!phoneOK) phone.focus();
    return nameOK && phoneOK;
  }
  [$('#prenom'), $('#telephone')].forEach(input => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      input.removeAttribute('aria-invalid');
      $(input.id === 'prenom' ? '#name-error' : '#phone-error').textContent = '';
    }
  }));

  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!state.service) {
      setFamily('mains'); showStep(0);
      fail('#service-error', 'Choisissez un soin pour continuer.', $('input[name="soin"]')); return;
    }
    if (state.step !== 3) { nextStep(state.step + 1); return; }
    if (!validDay()) {
      state.day = null; state.time = null; state.furthest = 1; showStep(1);
      fail('#day-error', 'La date a changé. Choisissez un jour proposé dans la simulation.'); return;
    }
    if (!validTime()) {
      state.time = null; state.furthest = 2; showStep(2);
      fail('#time-error', 'Cet horaire est passé. Choisissez une autre heure.'); return;
    }
    if (!validateContact()) return;
    $('#success-recap').textContent = recap();
    $('#booking-form').hidden = true; $('.step-nav').hidden = true;
    const success = $('#booking-success'); success.hidden = false;
    if (canMove()) {
      success.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => success.classList.remove('is-entering')));
    }
    $('.sheet-stamp').firstChild.textContent = 'Essai terminé';
    $('#success-title').focus({ preventScroll: true });
    success.scrollIntoView({ behavior: canMove() ? 'smooth' : 'instant', block: 'start' });
    announce('Simulation terminée. Aucun rendez-vous réservé, aucune donnée transmise.');
  });
  $('#restart').addEventListener('click', () => resetSimulation());

  // État initial utile dès le chargement, avec une solution par téléphone sans JS.
  $('.booking-app').hidden = false;
  updateNavigation(); updateSummary();

  // Apparitions uniques ; les éléments restent lisibles si un navigateur ancien
  // ne fournit pas IntersectionObserver ou si le script ne se charge pas.
  if ('IntersectionObserver' in window) {
    root.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        if (element.dataset.reveal === 'ligne') {
          const rowIndex = Array.from(element.parentElement.children).indexOf(element);
          element.style.transitionDelay = canMove() ? `${rowIndex * 60}ms` : '0ms';
        }
        element.classList.add('is-visible'); observer.unobserve(element);
      });
    }, { threshold: .1, rootMargin: '0px 0px -20px 0px' });
    $$('[data-reveal]').forEach(element => observer.observe(element));
  }
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  if (document.fonts) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 550))]).then(ready);
  else ready();
})();
