'use strict';

(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  let keyboardInput = false;
  document.addEventListener('keydown', () => {
    keyboardInput = true;
    root.classList.add('keyboard-input');
  });
  document.addEventListener('pointerdown', () => {
    keyboardInput = false;
    root.classList.remove('keyboard-input');
  }, { passive: true });
  // Reading stays available even if the visitor never scrolls or prefers no motion.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const revealNodes = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      let row = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (entry.target.dataset.reveal === 'row') {
          entry.target.style.transitionDelay = `${row++ * 50}ms`;
        }
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    revealNodes.forEach(node => revealObserver.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('is-visible'));
  }

  const services = {
    botox: { name: 'Soin Botox' },
    keratine: { name: 'Soin à la kératine' },
    japon: { name: 'Soins venus du Japon' },
    femme: { name: 'Coupe femme' },
    homme: { name: 'Coupe homme' },
    enfant: { name: 'Coupe enfant' }
  };
  const state = { step: 0, service: '', date: '', time: null, success: false };
  const $ = selector => document.querySelector(selector);
  const form = $('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const status = $('#booking-status');
  let entranceFrame = 0;
  let animateFrame = 0;

  function parisNow(at = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(at).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateObject = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const displayDate = key => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  }).format(dateObject(key));
  const displayTime = minutes => `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const displayPrice = () => 'Tarif à confirmer';

  function holidayName(key) {
    const fixed = { '01-01': 'Jour de l’An', '05-01': 'Fête du Travail', '05-08': '8 mai', '07-14': '14 juillet', '08-15': 'Assomption', '11-01': 'Toussaint', '11-11': '11 novembre', '12-25': 'Noël' };
    if (fixed[key.slice(5)]) return fixed[key.slice(5)];
    // Computus : jours fériés mobiles en France métropolitaine.
    const year = Number(key.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 12));
    for (const [offset, label] of [[1, 'Lundi de Pâques'], [39, 'Ascension'], [50, 'Lundi de Pentecôte']]) {
      const holiday = new Date(easter);
      holiday.setUTCDate(holiday.getUTCDate() + offset);
      if (dateKey(holiday) === key) return label;
    }
    return '';
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function updateSummary(announce = true) {
    const service = services[state.service];
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-date').textContent = state.date ? displayDate(state.date) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? displayTime(state.time) : 'À choisir';
    $('#summary-duration').textContent = 'À confirmer';
    $('#summary-price').textContent = service ? displayPrice(service) : 'À confirmer';
    $('#mobile-summary').textContent = service
      ? `${service.name} · ${state.date ? displayDate(state.date) : 'Jour à choisir'}${state.time !== null ? ` · ${displayTime(state.time)}` : ''} · ${displayPrice(service)} · Simulation`
      : 'Votre sélection\u00a0: prestation et jour à choisir. Simulation.';
    $('#service-next').disabled = !service;
    $('#day-next').disabled = !state.date;
    $('#slot-next').disabled = state.time === null;
    stepButtons[1].disabled = !service;
    stepButtons[2].disabled = !state.date;
    stepButtons[3].disabled = state.time === null;
    if (service && state.date && state.time !== null) {
      $('#form-recap').textContent = `${service.name} · ${displayDate(state.date)} à ${displayTime(state.time)} · ${displayPrice(service)}. Simulation uniquement, tarifs à confirmer.`;
    }
    if (announce && service) {
      const parts = [service.name, state.date && displayDate(state.date), state.time !== null && displayTime(state.time), displayPrice(service)];
      status.textContent = `Votre sélection\u00a0: ${parts.filter(Boolean).join(', ')}. Simulation.`;
    }
  }

  function revealPanel(panel) {
    cancelAnimationFrame(entranceFrame);
    cancelAnimationFrame(animateFrame);
    panel.classList.remove('is-entering');
    if (reduceMotion.matches || keyboardInput) return;
    panel.classList.add('is-entering');
    entranceFrame = requestAnimationFrame(() => {
      animateFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
    });
  }
  function showStep(step, focus = true) {
    if (state.success || (step > 0 && !state.service) || (step > 1 && !state.date) || (step > 2 && state.time === null)) return;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.panel) !== step;
      panel.classList.remove('is-entering');
    });
    stepButtons.forEach((button, index) => {
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary(false);
    const currentPanel = panels[step];
    revealPanel(currentPanel);
    const heading = $(`#step-title-${step}`);
    status.textContent = `Étape ${step + 1} sur 4. ${heading.textContent}`;
    if (focus) heading.focus();
  }

  function selectService(key) {
    if (!services[key]) return;
    if (state.service !== key) {
      state.date = '';
      state.time = null;
    }
    state.service = key;
    $(`input[name="service"][value="${key}"]`).checked = true;
    updateSummary();
  }

  function renderDays() {
    const container = $('#day-options');
    container.replaceChildren();
    const now = parisNow();
    const start = dateObject(now.key);
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = dateKey(date);
      const closed = [0, 3].includes(date.getUTCDay());
      const holiday = holidayName(key);
      const label = element('label', 'date-choice');
      const input = element('input', 'choice-input');
      input.type = 'radio';
      input.name = 'day';
      input.value = key;
      input.disabled = closed;
      input.checked = state.date === key;
      input.setAttribute('aria-label', `${displayDate(key)}${closed ? (date.getUTCDay() === 3 ? ', horaires à confirmer' : ', fermé') : ''}${holiday ? `, ${holiday}, ouverture à confirmer` : ''}${offset === 0 ? ', aujourd’hui' : ''}`);
      input.addEventListener('change', () => {
        if (state.date !== key) state.time = null;
        state.date = key;
        updateSummary();
      });
      label.append(input,
        element('span', 'date-weekday', new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date)),
        element('span', 'date-number', String(date.getUTCDate())),
        element('span', 'date-month', new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date)),
        element('span', 'date-state', closed ? (date.getUTCDay() === 3 ? 'À confirmer' : 'Fermé') : holiday ? 'Férié · à confirmer' : offset === 0 ? 'Aujourd’hui' : 'Exemple')
      );
      container.append(label);
    }
  }

  function slotState(key, minutes, service) {
    const now = parisNow();
    const closed = [0, 3].includes(dateObject(key).getUTCDay());
    const past = key < now.key || (key === now.key && minutes <= now.minutes);
    const seed = [...`${key}-${service.name}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const taken = (seed + minutes / 15 * 7) % 6 < 2;
    const outside = minutes < 570 || minutes >= 1200;
    return { disabled: closed || past || taken || outside, reason: closed ? (dateObject(key).getUTCDay() === 3 ? 'À confirmer' : 'Fermé') : past ? 'Passé' : outside ? 'Hors horaires' : taken ? 'Déjà pris' : '' };
  }

  function renderSlots() {
    const container = $('#slot-options');
    container.replaceChildren();
    const service = services[state.service];
    if (!service || !state.date) return;
    $('#slot-date').textContent = `${displayDate(state.date)} · ${holidayName(state.date) ? 'Jour férié, ouverture à confirmer' : '9\u00a0h\u00a030–20\u00a0h, à confirmer'}`;
    let available = 0;
    for (let minutes = 570; minutes < 1200; minutes += 30) {
      const slot = slotState(state.date, minutes, service);
      if (!slot.disabled) available++;
      const label = element('label', 'slot-choice');
      const input = element('input', 'choice-input');
      input.type = 'radio';
      input.name = 'time';
      input.value = String(minutes);
      input.disabled = slot.disabled;
      input.checked = state.time === minutes && !slot.disabled;
      input.setAttribute('aria-label', `${displayTime(minutes)}, ${slot.reason || 'disponible'}, simulation`);
      input.addEventListener('change', () => {
        state.time = minutes;
        updateSummary();
      });
      label.append(input, element('span', '', displayTime(minutes)), element('small', '', slot.reason || 'Exemple'));
      container.append(label);
    }
    if (state.time !== null && slotState(state.date, state.time, service).disabled) state.time = null;
    $('#no-slots').hidden = available > 0;
    updateSummary(false);
  }

  document.querySelectorAll('input[name="service"]').forEach(input => {
    input.addEventListener('change', () => selectService(input.value));
  });
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      if (state.success) resetBooking(false);
      selectService(link.dataset.service);
      showStep(1, false);
    });
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  function validateField(input) {
    let message = '';
    if (input.id === 'first-name' && !input.value.trim()) message = 'Indiquez un prénom, même d’exemple.';
    if (input.id === 'phone') {
      const phone = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phone)) {
        message = 'Indiquez un mobile français, par exemple 06 12 34 56 78.';
      }
    }
    const error = input.id === 'phone' ? $('#phone-error') : $('#name-error');
    error.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }
  ['#first-name', '#phone'].forEach(selector => {
    $(selector).addEventListener('input', event => {
      if (event.target.getAttribute('aria-invalid') === 'true') validateField(event.target);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) {
      if (state.step === 0 && state.service) showStep(1);
      else if (state.step === 1 && state.date) showStep(2);
      else if (state.step === 2 && state.time !== null) showStep(3);
      return;
    }
    const service = services[state.service];
    if (!service || !state.date || state.time === null || slotState(state.date, state.time, service).disabled) {
      state.time = null;
      showStep(2);
      status.textContent = 'Ce créneau exemple est passé. Choisissez une nouvelle heure ou un autre jour.';
      return;
    }
    const nameValid = validateField($('#first-name'));
    const phoneValid = validateField($('#phone'));
    if (!nameValid || !phoneValid) {
      status.textContent = 'Vérifiez les coordonnées. Les erreurs sont indiquées sous chaque champ.';
      (nameValid ? $('#phone') : $('#first-name')).focus();
      return;
    }
    state.success = true;
    form.hidden = true;
    $('#booking-success').hidden = false;
    $('#success-recap').textContent = `Exemple pour ${$('#first-name').value.trim()}\u00a0: ${service.name}, ${displayDate(state.date)} à ${displayTime(state.time)}. Tarif et durée à confirmer avec le salon.`;
    stepButtons.forEach(button => { button.disabled = true; button.removeAttribute('aria-current'); });
    revealPanel($('#booking-success'));
    status.textContent = 'Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.';
    $('#success-title').focus();
  });

  function resetBooking(focus = true) {
    state.success = false;
    state.service = '';
    state.date = '';
    state.time = null;
    form.reset();
    $('#success-recap').textContent = '';
    $('#form-recap').textContent = '';
    $('#name-error').textContent = '';
    $('#phone-error').textContent = '';
    $('#first-name').removeAttribute('aria-invalid');
    $('#phone').removeAttribute('aria-invalid');
    $('#booking-success').hidden = true;
    form.hidden = false;
    stepButtons[0].disabled = false;
    updateSummary(false);
    showStep(0, focus);
  }
  $('#restart-booking').addEventListener('click', () => resetBooking());

  const today = dateObject(parisNow().key).getUTCDay();
  document.querySelector(`[data-weekday="${today}"]`)?.classList.add('is-today');
  // La barre de contact cède la place au formulaire et aux informations du pied.
  if ('IntersectionObserver' in window) {
    const contactBar = $('.mobile-bar');
    const occupied = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) occupied.add(entry.target);
        else occupied.delete(entry.target);
      });
      contactBar.hidden = occupied.size > 0;
    }, { threshold: 0 });
    barObserver.observe($('#reserver'));
    barObserver.observe($('.site-footer'));
  }
  updateSummary(false);
  $('#booking-app').hidden = false;
})();
