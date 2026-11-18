/* Sanmalerine — simulation locale, sans envoi et sans stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard-navigation');
    }
    if (event.key === 'Escape') $$('.studio-offer[open]').forEach((details) => {
      details.open = false;
      $('summary', details).focus();
    });
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-navigation');
  }, { passive: true });

  const HOURS = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1020] };
  const SERVICE = {
    sechage: { name: 'Shampoing Coupe Séchage (très court)', duration: 30 },
    coiffage: { name: 'Shampoing Coupe Brushing ou Coiffage (court)', duration: 30 },
    homme: { name: 'H : Shampoing Coupe Classique et Coiffage', duration: 30 },
    enfant: { name: 'Filles ou Garçons moins de 3 ans Coupe Coiffage cheveux courts', duration: 15 }
  };
  const NB = '\u00a0';
  const state = { step: 0, service: '', day: '', time: null };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, year: +parts.year, month: +parts.month, day: +parts.day, minutes: +parts.hour * 60 + +parts.minute };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}${NB}h${NB}${String(minute).padStart(2, '0')}` : `${hour}${NB}h`;
  }
  const holidaysCache = new Map();
  function holidays(year) {
    if (holidaysCache.has(year)) return holidaysCache.get(year);
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(year, month - 1, day, 12);
    const set = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((suffix) => `${year}-${suffix}`));
    [1, 39, 50].forEach((offset) => set.add(keyFromDate(new Date(easter + offset * 86400000))));
    holidaysCache.set(year, set);
    return set;
  }
  function dayHours(key) {
    const date = dateFromKey(key);
    if (!Number.isFinite(date.getTime()) || holidays(date.getUTCFullYear()).has(key)) return null;
    return HOURS[date.getUTCDay()];
  }
  function slotsFor(key, serviceId, now = parisNow()) {
    const hours = dayHours(key), service = SERVICE[serviceId];
    if (!hours || !service || key < now.key) return [];
    const slots = [];
    const seed = Number(key.replaceAll('-', ''));
    let index = 0;
    for (let minute = hours[0]; minute + service.duration <= hours[1]; minute += 30) {
      const past = key === now.key && minute <= now.minutes;
      const occupied = (seed + index * 7) % 6 === 2;
      slots.push({ minute, disabled: past || occupied, reason: past ? 'Heure passée' : occupied ? 'Indisponible dans cet exemple' : 'Créneau fictif' });
      index++;
    }
    return slots;
  }
  function createRadio(name, value, disabled = false) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value); input.disabled = disabled;
    return input;
  }
  function createSpan(text, className) {
    const span = document.createElement('span'); span.textContent = text; span.className = className; return span;
  }
  function renderDays() {
    const now = parisNow();
    const dayContainer = $('#days'); dayContainer.replaceChildren();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(Date.UTC(now.year, now.month - 1, now.day + offset, 12));
      const key = keyFromDate(date), hours = dayHours(key);
      const isHoliday = holidays(date.getUTCFullYear()).has(key);
      const expired = !!hours && key === now.key && !slotsFor(key, state.service).some((slot) => !slot.disabled);
      const disabled = !hours || expired;
      const label = document.createElement('label');
      const input = createRadio('jour', key, disabled);
      input.checked = state.day === key;
      const status = isHoliday ? 'Férié · fermé' : !hours ? 'Fermé' : expired ? 'Terminé' : offset === 0 ? 'Aujourd’hui' : '';
      input.setAttribute('aria-label', `${longFormat.format(date)}${status ? `, ${status.toLowerCase()}` : ''}`);
      label.append(input, createSpan(dayFormat.format(date), 'day-name'), createSpan(String(date.getUTCDate()), 'day-number'), createSpan(monthFormat.format(date), 'day-month'));
      if (status) label.append(createSpan(status, 'day-state'));
      dayContainer.append(label);
    }
  }
  function renderSlots() {
    const container = $('#slots'); container.replaceChildren();
    $('#slot-date').textContent = longFormat.format(dateFromKey(state.day));
    const slots = slotsFor(state.day, state.service);
    if (state.time !== null && !slots.some((slot) => slot.minute === state.time && !slot.disabled)) state.time = null;
    slots.forEach((slot) => {
      const label = document.createElement('label');
      const input = createRadio('heure', slot.minute, slot.disabled);
      input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.reason.toLowerCase()}`);
      label.append(input, createSpan(timeLabel(slot.minute), 'slot-time'));
      container.append(label);
    });
    if (!slots.some((slot) => !slot.disabled)) {
      const paragraph = document.createElement('p'); paragraph.className = 'empty-slots';
      paragraph.textContent = 'Aucun créneau dans cet essai pour ce jour. Revenez au choix du jour.';
      container.prepend(paragraph);
    }
  }
  function canVisit(step) {
    return step === 0 || step === 1 && !!state.service || step === 2 && !!state.service && !!state.day || step === 3 && !!state.service && !!state.day && state.time !== null;
  }
  function recap() {
    $('#recap-service').textContent = state.service ? SERVICE[state.service].name : 'À choisir';
    $('#recap-day').textContent = state.day ? longFormat.format(dateFromKey(state.day)) : 'À choisir';
    $('#recap-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $$('.step-nav button').forEach((button) => { button.disabled = !canVisit(+button.dataset.step); });
  }
  let frame = 0;
  let frame2 = 0;
  function showStep(step, focus = true) {
    if (!canVisit(step)) return;
    const backward = step < state.step;
    state.step = step;
    cancelAnimationFrame(frame); cancelAnimationFrame(frame2);
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    $$('.booking-panel').forEach((panel) => {
      panel.hidden = +panel.dataset.panel !== step;
      panel.classList.remove('is-entering', 'is-back');
    });
    const active = $(`[data-panel="${step}"]`);
    if (!reduce.matches && !keyboard && focus) {
      active.classList.add('is-entering');
      active.classList.toggle('is-back', backward);
      frame = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => active.classList.remove('is-entering', 'is-back'));
      });
    }
    $$('.step-nav button').forEach((button) => {
      if (+button.dataset.step === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#previous').hidden = step === 0;
    $('#next').textContent = step === 3 ? 'Terminer la simulation' : 'Continuer →';
    $('#booking-error').textContent = '';
    recap();
    $('#booking-status').textContent = `Étape ${step + 1} sur 4 : ${$('h3', active).textContent}`;
    if (focus) $('h3', active).focus();
  }
  function chooseService(id) {
    if (!SERVICE[id]) return;
    if (state.service !== id) { state.day = ''; state.time = null; }
    state.service = id;
    const radio = $(`input[name="prestation"][value="${id}"]`);
    radio.checked = true;
    recap();
  }
  function validPhone(value) {
    let normal = value.replace(/[\s().-]/g, '');
    if (normal.startsWith('0033')) normal = `0${normal.slice(4)}`;
    else if (normal.startsWith('+33')) normal = `0${normal.slice(3)}`;
    return /^0[67]\d{8}$/.test(normal);
  }
  function validateField(id) {
    const input = $(`#${id}`);
    const value = input.value.trim();
    const message = id === 'prenom' ? (!/[\p{L}]/u.test(value) ? 'Indiquez votre prénom pour terminer cet essai.' : '') : (!validPhone(value) ? 'Indiquez un numéro mobile français complet, commençant par 06 ou 07.' : '');
    $(`#${id}-erreur`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !message;
  }

  try {
    $('#simulateur').hidden = false;
    $('#booking-form').addEventListener('change', (event) => {
      const input = event.target;
      if (input.name === 'prestation') chooseService(input.value);
      if (input.name === 'jour') {
        if (state.day !== input.value) state.time = null;
        state.day = input.value;
        recap();
      }
      if (input.name === 'heure') { state.time = +input.value; recap(); }
      $('#booking-error').textContent = '';
    });
    $('#booking-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const step = state.step;
      let message = '';
      if (step === 0 && !state.service) message = 'Choisissez une prestation pour continuer.';
      if (step === 1 && !state.day) message = 'Choisissez un jour pour continuer.';
      if (step === 2 && state.time === null) message = 'Choisissez une heure pour continuer.';
      if (message) { $('#booking-error').textContent = message; return; }
      if (step < 3) { showStep(step + 1); return; }
      const firstValid = validateField('prenom'), phoneValid = validateField('telephone');
      if (!firstValid || !phoneValid) {
        $('#booking-error').textContent = 'Vérifiez les champs signalés.';
        $(!firstValid ? '#prenom' : '#telephone').focus();
        return;
      }
      if (!slotsFor(state.day, state.service).some((slot) => slot.minute === state.time && !slot.disabled)) {
        state.time = null;
        showStep(2);
        $('#booking-error').textContent = 'Cette heure est passée. Choisissez un autre créneau pour l’essai.';
        return;
      }
      $('#success-text').textContent = `${$('#prenom').value.trim()}, votre sélection pour la simulation : ${SERVICE[state.service].name}, ${longFormat.format(dateFromKey(state.day))} à ${timeLabel(state.time)}, au 33 rue Maryse Bastié.`;
      $('#booking-form').hidden = true;
      $('.step-nav').hidden = true;
      $('#success').hidden = false;
      $('#booking-status').textContent = 'Simulation terminée. Aucun rendez-vous réservé, aucune donnée envoyée.';
      $('#success-title').focus();
    });
    $('#previous').addEventListener('click', () => showStep(state.step - 1));
    $$('.step-nav button').forEach((button) => button.addEventListener('click', () => showStep(+button.dataset.step)));
    ['prenom', 'telephone'].forEach((id) => {
      $(`#${id}`).addEventListener('blur', () => { if (state.step === 3) validateField(id); });
      $(`#${id}`).addEventListener('input', () => {
        if ($(`#${id}`).hasAttribute('aria-invalid')) validateField(id);
        $('#booking-error').textContent = '';
      });
    });
    function reset(focus = true) {
      $('#booking-form').reset();
      Object.assign(state, { step: 0, service: '', day: '', time: null });
      $('#booking-form').hidden = false; $('.step-nav').hidden = false; $('#success').hidden = true;
      $('#success-text').textContent = '';
      ['prenom', 'telephone'].forEach((id) => { $(`#${id}-erreur`).textContent = ''; $(`#${id}`).removeAttribute('aria-invalid'); });
      $('#days').replaceChildren(); $('#slots').replaceChildren();
      showStep(0, focus);
    }
    $('#restart').addEventListener('click', () => reset());
    $$('[data-choose]').forEach((link) => link.addEventListener('click', () => {
      if (!$('#success').hidden) reset(false);
      chooseService(link.dataset.choose);
      showStep(1);
    }));
    window.addEventListener('pageshow', (event) => { if (event.persisted) reset(false); });
    showStep(0, false);

    const revealElements = $$('[data-reveal]');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
        });
      }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
      revealElements.forEach((element) => observer.observe(element));
    } else revealElements.forEach((element) => element.classList.add('is-visible'));
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
  } catch (error) {
    root.classList.remove('js');
    $('#simulateur').hidden = true;
    const fallback = document.createElement('p');
    fallback.className = 'no-js';
    fallback.textContent = 'La simulation n’est pas disponible dans ce navigateur. Pour prendre rendez-vous, utilisez le lien Planity ou appelez le salon.';
    $('.booking-block').append(fallback);
  }
})();
