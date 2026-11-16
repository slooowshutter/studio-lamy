(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    coupe: 'Coupe',
    transformation: 'Coupe transformation',
    brushing: 'Brushing / séchage',
    balayage: 'Balayage',
    barbe: 'Entretien barbe et moustache'
  };
  const state = { step: 0, service: '', day: '', time: '', complete: false };
  let keyboard = false;
  let panelFrame = 0;
  let receiptFrame = 0;

  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('keyboard-mode');
    $$('[data-reveal], [data-entrance]').forEach((element) => element.classList.add('is-visible'));
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  // Un jour civil à Paris ne dépend pas du fuseau horaire du navigateur.
  function parisClock(now = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return {
      day: `${values.year}-${values.month}-${values.day}`,
      minutes: Number(values.hour) * 60 + Number(values.minute)
    };
  }
  function calendarDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function dateLabel(key, short = false) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: short ? 'short' : 'long',
      day: 'numeric', month: short ? 'short' : 'long'
    }).format(calendarDate(key));
  }
  function hoursForDay(key) {
    // Fresha et icoiffeur : lundi–samedi 09:00–19:00 ; dimanche fermé.
    // Aucune durée de prestation n’étant sourcée, pas de durée inventée.
    return calendarDate(key).getUTCDay() === 0 ? null : [540, 1140];
  }
  function slotsForDay(key, now = new Date()) {
    const clock = parisClock(now);
    const hours = hoursForDay(key);
    if (!hours || key < clock.day) return [];
    const slots = [];
    for (let minute = hours[0]; minute < hours[1]; minute += 60) {
      if (key !== clock.day || minute > clock.minutes) slots.push(minute);
    }
    return slots;
  }
  function timeLabel(value) { return `${Math.floor(Number(value) / 60)}\u00a0h`; }
  function announce(message) { $('#booking-status').textContent = message; }
  function clearFlowError() { $('#flow-error').textContent = ''; }
  function flowError(message) { $('#flow-error').textContent = message; }

  const days = [];
  function renderDays() {
    days.length = 0;
    const first = calendarDate(parisClock().day);
    const group = $('#day-options');
    group.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = 'Choisissez un jour pour la simulation';
    group.append(legend);
    for (let index = 0; index < 14; index++) {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      const key = dateKey(date);
      days.push(key);
      const closed = !hoursForDay(key);
      const passed = !closed && slotsForDay(key).length === 0;
      const label = document.createElement('label');
      label.className = 'option-cell';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || passed;
      input.setAttribute('aria-label', `${dateLabel(key)}${closed ? ', fermé' : passed ? ', heures écoulées' : ', essai'}`);
      const cell = document.createElement('span');
      const weekday = document.createElement('small');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
      const number = document.createElement('span');
      number.className = 'day-number'; number.textContent = String(date.getUTCDate());
      const month = document.createElement('small');
      month.textContent = closed ? 'Fermé' : passed ? 'Écoulé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
      cell.append(weekday, number, month); label.append(input, cell); group.append(label);
      input.checked = state.day === key;
    }
  }

  function renderSlots() {
    const group = $('#slot-options');
    group.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Choisissez une heure pour la simulation';
    group.append(legend);
    const slots = state.day ? slotsForDay(state.day) : [];
    slots.forEach((minute) => {
      const label = document.createElement('label'); label.className = 'option-cell';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(minute);
      input.checked = state.time === String(minute);
      input.setAttribute('aria-label', `${timeLabel(minute)}, heure d’essai`);
      const cell = document.createElement('span'); cell.textContent = timeLabel(minute);
      label.append(input, cell); group.append(label);
    });
    $('#slots-empty').hidden = slots.length > 0;
  }

  function updateSummary() {
    $('#summary-service').textContent = services[state.service] || 'À choisir';
    $('#summary-day').textContent = state.day ? dateLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time ? timeLabel(state.time) : 'À choisir';
    $('#receipt-name-row').hidden = !state.complete;
    $('#summary-name').textContent = state.complete ? $('#prenom').value.trim() : '';
  }
  function updateSteps() {
    $$('[data-step]').forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled = state.complete || (step > 0 && !state.service) || (step > 1 && !state.day) || (step > 2 && !state.time);
      if (step === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(step, moveFocus = true) {
    const previous = state.step;
    state.step = step;
    clearFlowError();
    cancelAnimationFrame(panelFrame);
    $$('[data-panel]').forEach((panel) => {
      panel.hidden = Number(panel.dataset.panel) !== step;
      panel.classList.remove('is-entering', 'is-entering-back');
    });
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    const panel = $(`[data-panel="${step}"]`);
    if (!reducedMotion.matches && !keyboard) {
      panel.classList.add(step < previous ? 'is-entering-back' : 'is-entering');
      panelFrame = requestAnimationFrame(() => {
        panelFrame = requestAnimationFrame(() => panel.classList.remove('is-entering', 'is-entering-back'));
      });
    }
    updateSteps(); updateSummary();
    if (moveFocus) panel.querySelector('h3').focus({ preventScroll: true });
    announce(`Étape ${step + 1} sur 4. ${['Choix de la prestation', 'Choix du jour', 'Choix de l’heure', 'Préparation du ticket'][step]}. Simulation uniquement.`);
  }

  $('#booking-form').addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    clearFlowError();
    if (input.name === 'prestation' && services[input.value]) {
      state.service = input.value;
    } else if (input.name === 'jour') {
      if (state.day !== input.value) state.time = '';
      state.day = input.value;
    } else if (input.name === 'heure') {
      state.time = input.value;
    }
    updateSummary(); updateSteps();
  });

  $$('[data-next]').forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !state.service) { flowError('Choisissez une prestation pour continuer.'); return; }
    if (next === 2 && !state.day) { flowError('Choisissez un jour pour continuer.'); return; }
    if (next === 3 && !state.time) { flowError('Choisissez une heure pour continuer.'); return; }
    if (next >= 2 && (!days.includes(state.day) || !slotsForDay(state.day).length)) {
      state.day = ''; state.time = ''; showStep(1);
      flowError('Ce jour ne propose plus d’heure d’essai. Choisissez un autre jour.'); return;
    }
    if (next === 3 && !slotsForDay(state.day).includes(Number(state.time))) {
      state.time = ''; showStep(2); flowError('Cette heure est passée. Choisissez une autre heure.'); return;
    }
    showStep(next);
  }));
  $$('[data-step]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  $$('[data-service]').forEach((link) => link.addEventListener('click', () => {
    if (state.complete) resetBooking();
    state.service = link.dataset.service;
    $(`input[name="prestation"][value="${state.service}"]`).checked = true;
    showStep(1, false);
    // L’ancre garde son défilement natif ; le foyer rejoint le jour au clavier.
    if (keyboard) requestAnimationFrame(() => $('[data-panel="1"] h3').focus());
  }));

  function validateContact() {
    const name = $('#prenom'); const phone = $('#telephone');
    const validName = name.value.trim().length > 0;
    const normalized = phone.value.replace(/[\s.()\-]/g, '');
    const validPhone = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(normalized);
    $('#name-error').textContent = validName ? '' : 'Indiquez un prénom pour le ticket d’essai.';
    $('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro français à 10 chiffres ou commençant par +33.';
    name.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) {
      (validName ? phone : name).focus();
      announce('Vérifiez les champs signalés avant de sortir le ticket.');
      return false;
    }
    return true;
  }
  ['prenom', 'telephone'].forEach((id) => {
    $(`#${id}`).addEventListener('input', () => {
      $(`#${id}`).removeAttribute('aria-invalid');
      $(id === 'prenom' ? '#name-error' : '#phone-error').textContent = '';
    });
  });

  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    // Entrée dans un champ ou soumission implicite ne peut sauter les étapes.
    if (state.step !== 3 || !state.service || !state.day || !state.time) return;
    if (!slotsForDay(state.day).includes(Number(state.time))) {
      state.time = ''; showStep(2); flowError('Cette heure est passée. Choisissez une autre heure.'); return;
    }
    if (!validateContact()) return;
    state.complete = true; updateSteps(); updateSummary();
    $('#booking-form').hidden = true;
    $('#booking-success').hidden = false;
    $('#print-ticket').hidden = false;
    $('#booking-success h3').focus({ preventScroll: true });
    announce(`Ticket d’essai préparé pour ${services[state.service]}, ${dateLabel(state.day)} à ${timeLabel(state.time)}. Aucun rendez-vous n’est pris.`);
    const receipt = $('#booking-receipt');
    cancelAnimationFrame(receiptFrame);
    if (!reducedMotion.matches && !keyboard) {
      receipt.classList.add('is-printing');
      receiptFrame = requestAnimationFrame(() => {
        receiptFrame = requestAnimationFrame(() => receipt.classList.remove('is-printing'));
      });
    }
  });

  function resetBooking() {
    state.service = ''; state.day = ''; state.time = ''; state.complete = false;
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('#booking-success').hidden = true;
    $('#print-ticket').hidden = true;
    $('#booking-receipt').classList.remove('is-printing');
    $('#name-error').textContent = ''; $('#phone-error').textContent = '';
    $('#prenom').removeAttribute('aria-invalid'); $('#telephone').removeAttribute('aria-invalid');
    showStep(0);
  }
  $('#restart-booking').addEventListener('click', resetBooking);
  $('#print-ticket').addEventListener('click', () => { if (state.complete) window.print(); });

  const track = $('.service-track');
  const controls = $('.row-controls');
  controls.hidden = false;
  function updateTrackControls() {
    $('[data-scroll="-1"]').disabled = track.scrollLeft < 3;
    $('[data-scroll="1"]').disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 3;
  }
  $$('[data-scroll]').forEach((button) => button.addEventListener('click', () => {
    track.scrollBy({ left: Number(button.dataset.scroll) * (track.firstElementChild.getBoundingClientRect().width + 20), behavior: reducedMotion.matches || keyboard ? 'instant' : 'smooth' });
  }));
  let scrollFrame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollFrame); scrollFrame = requestAnimationFrame(updateTrackControls);
  }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(updateTrackControls).observe(track);
  else window.addEventListener('resize', updateTrackControls, { passive: true });

  renderDays(); updateSteps(); updateSummary();
  $('#booking-app').hidden = false;
  $('#booking-fallback').hidden = true;
  updateTrackControls();

  // Toutes les informations restent visibles sans JS et si les API manquent.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const reveals = new IntersectionObserver((entries, observer) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) { target.classList.add('is-visible'); observer.unobserve(target); }
      });
    }, { threshold: .08 });
    $$('[data-reveal]').forEach((element) => reveals.observe(element));
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => $('[data-entrance]').classList.add('is-visible')));
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      root.classList.remove('motion-ready');
      $$('[data-reveal], [data-entrance]').forEach((element) => element.classList.add('is-visible'));
    }
  });
})();
