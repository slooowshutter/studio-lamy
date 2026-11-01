/* Camara’s — local-only demonstration. No requests, cookies, storage or analytics. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = {
    coupe: { name: 'Coupe homme', duration: 30, price: `20${NB}€ · exemple` },
    barbe: { name: 'Taille de barbe', duration: 20, price: `12${NB}€ · exemple` },
    duo: { name: 'Coupe & barbe', duration: 60, price: `Dès 30${NB}€ · à confirmer` }
  };
  // Directory schedule, not an assertion about current opening hours.
  // Sunday = 0. Planity: Tuesday–Saturday 10:00–20:00; Monday/Sunday closed.
  const hours = [null, null, [600, 1200], [600, 1200], [600, 1200], [600, 1200], [600, 1200]];
  const localFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const weekFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const timeText = (minute) => `${Math.floor(minute / 60)}${NB}h${minute % 60 ? NB + String(minute % 60).padStart(2, '0') : ''}`;
  const timeValue = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(localFormat.formatToParts(date).map((p) => [p.type, p.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, year: +parts.year, month: +parts.month, day: +parts.day, minute: +parts.hour * 60 + +parts.minute };
  }
  function daysFromNow() {
    const now = parisNow();
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(Date.UTC(now.year, now.month - 1, now.day + i, 12));
      return { date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay(), label: longFormat.format(date) };
    });
  }
  function isHoliday(day) {
    const date = day.date;
    const year = date.getUTCFullYear();
    const md = day.iso.slice(5);
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(md)) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), dom = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(year, month - 1, dom, 12);
    return [1, 39, 50].some((offset) => new Date(easter + offset * 86400000).toISOString().slice(0, 10) === day.iso);
  }
  function hash(value) {
    let out = 0;
    for (const char of value) out = ((out << 5) - out + char.charCodeAt(0)) | 0;
    return out >>> 0;
  }
  function slotsFor(day, duration, now = parisNow()) {
    const opening = hours[day.dow];
    if (!opening || day.iso < now.iso) return [];
    const slots = [];
    for (let minute = opening[0]; minute + duration <= opening[1]; minute += 20) {
      const past = day.iso === now.iso && minute <= now.minute;
      const taken = hash(`${day.iso}|${minute}|camaras`) % 7 < 2;
      slots.push({ minute, value: timeValue(minute), available: !past && !taken, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
    }
    return slots;
  }

  const root = document.documentElement;
  let keyboardAction = false;
  document.addEventListener('keydown', () => { keyboardAction = true; root.classList.add('using-keyboard'); }, { capture: true });
  document.addEventListener('pointerdown', () => { keyboardAction = false; root.classList.remove('using-keyboard'); }, { capture: true });
  const hero = $('.hero');
  const revealItems = $$('[data-reveal]');
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold: .12 });
  }
  if (!reduced.matches) {
    root.classList.add('js');
    for (const element of revealItems) {
      if (!observer) continue;
      element.classList.add('reveal-pending');
      observer.observe(element);
    }
    // All hidden states are armed only after the functioning script has loaded.
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  }
  reduced.addEventListener('change', (event) => {
    if (!event.matches) return;
    hero.classList.add('is-ready');
    revealItems.forEach((element) => element.classList.remove('reveal-pending'));
    observer?.disconnect();
  });

  const form = $('#booking-form');
  const workspace = $('.booking-workspace');
  const panels = $$('[data-panel]', form);
  const stepButtons = $$('[data-step]', form);
  const previous = $('#previous-step');
  const next = $('#next-step');
  const controls = $('.booking-controls');
  const error = $('#booking-error');
  const status = $('#booking-status');
  const nameField = $('#first-name');
  const phoneField = $('#phone-number');
  const state = { step: 0, service: '', day: '', time: '', complete: false };
  let days = daysFromNow();
  let transitionGeneration = 0;

  function reachableStep() {
    return !state.service ? 0 : !state.day ? 1 : !state.time ? 2 : 3;
  }
  function currentDay() { return days.find((day) => day.iso === state.day); }
  function currentService() { return services[state.service]; }
  function announce(message) { status.textContent = message; }
  function showError(message) { error.textContent = message; }
  function updateSummary() {
    const service = currentService();
    const day = currentDay();
    $('#summary-service').textContent = service ? `${service.name} · ${service.duration}${NB}min` : 'À choisir';
    $('#summary-day').textContent = day ? day.label : 'À choisir';
    $('#summary-time').textContent = state.time ? timeText(+state.time.slice(0, 2) * 60 + +state.time.slice(3)) : 'À choisir';
    $('#summary-price').textContent = service ? service.price : 'À confirmer';
    $('#compact-service').textContent = service ? `${service.name} · ${service.duration}${NB}min · ${service.price}` : 'Prestation à choisir · prix à confirmer';
    $('#compact-date').textContent = day ? `${day.label}${state.time ? ' · ' + state.time.replace(':', NB + 'h' + NB) : ' · heure à choisir'}` : 'Jour et heure à choisir';
    $$('[data-edit]').forEach((button) => { button.disabled = +button.dataset.edit > reachableStep(); });
    stepButtons.forEach((button) => {
      const step = +button.dataset.step;
      button.disabled = step > reachableStep();
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (service && day && state.time) {
      $('#contact-recap').textContent = `${service.name} · ${service.duration}${NB}min · ${day.label} à ${state.time.replace(':', NB + 'h' + NB)}. Prix indicatif${NB}: ${service.price}. Au 96 avenue Yves Brunaud. Simulation uniquement.`;
    }
  }

  function radioLabel(group, value, accessibleLabel, disabled = false) {
    const label = document.createElement('label');
    label.className = `${group === 'day' ? 'day' : 'slot'}-choice`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', accessibleLabel);
    input.checked = state[group === 'day' ? 'day' : 'time'] === value;
    const face = document.createElement('span');
    label.append(input, face);
    return { label, input, face };
  }

  function renderDays() {
    days = daysFromNow();
    if (state.day && !currentDay()) { state.day = ''; state.time = ''; }
    const now = parisNow();
    const container = $('#day-options');
    const fragment = document.createDocumentFragment();
    days.forEach((day, index) => {
      const closed = !hours[day.dow];
      const soldOutToday = !closed && day.iso === now.iso && !slotsFor(day, currentService()?.duration || 30, now).some((slot) => slot.available);
      const holiday = isHoliday(day);
      const note = closed ? 'fermé' : soldOutToday ? 'terminé' : holiday ? 'férié*' : index === 0 ? 'aujourd’hui' : index === 1 ? 'demain' : monthFormat.format(day.date);
      const a11y = `${day.label}${closed ? ', fermé dans la simulation' : soldOutToday ? ', aucun créneau restant' : holiday ? ', jour férié, ouverture à confirmer' : ''}`;
      const { label, face } = radioLabel('day', day.iso, a11y, closed || soldOutToday);
      const weekday = document.createElement('span');
      weekday.textContent = weekFormat.format(day.date);
      const number = document.createElement('strong');
      number.textContent = day.date.getUTCDate();
      const detail = document.createElement('small');
      detail.textContent = note;
      face.append(weekday, number, detail);
      fragment.append(label);
    });
    container.replaceChildren(fragment);
    if (days.some(isHoliday)) {
      const note = document.createElement('p');
      note.className = 'holiday-note tiny';
      note.textContent = `* Férié${NB}: ouverture à confirmer. Les créneaux restent fictifs.`;
      const existing = $('.holiday-note', panels[1]);
      if (existing) existing.replaceWith(note); else $('.day-options').after(note);
    }
  }

  function renderSlots() {
    const day = currentDay();
    const service = currentService();
    const container = $('#slot-options');
    if (!day || !service) { container.replaceChildren(); return; }
    const slots = slotsFor(day, service.duration);
    const fragment = document.createDocumentFragment();
    let free = 0;
    for (const slot of slots) {
      if (slot.available) free++;
      const a11y = `${timeText(slot.minute)}${slot.reason ? ', ' + slot.reason : ', créneau fictif disponible'}`;
      const { label, face } = radioLabel('time', slot.value, a11y, !slot.available);
      const time = document.createElement('time');
      time.className = 'slot-time';
      time.dateTime = `${day.iso}T${slot.value}`;
      time.textContent = timeText(slot.minute);
      face.append(time);
      if (slot.reason) {
        const reason = document.createElement('small');
        reason.textContent = slot.reason;
        face.append(reason);
      }
      fragment.append(label);
    }
    container.replaceChildren(fragment);
    $('#slot-caption').textContent = `${day.label} · ${free} créneau${free === 1 ? '' : 'x'} fictif${free === 1 ? '' : 's'} disponible${free === 1 ? '' : 's'}. ${isHoliday(day) ? `Jour férié${NB}: ouverture à confirmer. ` : ''}${free ? 'La durée de votre prestation est prise en compte.' : 'Choisissez un autre jour avec Retour.'}`;
  }

  const nextLabels = ['Choisir le jour', 'Choisir l’heure', 'Vos coordonnées', 'Terminer la simulation'];
  function goTo(step, { focus = true, instant = false } = {}) {
    if (step < 0 || step > 4 || (step < 4 && step > reachableStep())) return;
    const generation = ++transitionGeneration;
    if (step < 4) state.complete = false;
    state.step = step;
    showError('');
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    updateSummary();
    for (const panel of panels) {
      panel.hidden = +panel.dataset.panel !== step;
      panel.classList.remove('is-entering', 'is-leaving');
    }
    controls.hidden = step === 4;
    previous.hidden = step === 0;
    if (step < 4) {
      next.replaceChildren(document.createTextNode(nextLabels[step] + ' '));
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '→';
      next.append(arrow);
    }
    const panel = panels[step];
    if (!reduced.matches && !keyboardAction && !instant) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (generation === transitionGeneration) panel.classList.remove('is-entering');
      }));
    }
    if (focus) {
      const title = $(`#step-title-${step}`);
      title.focus({ preventScroll: true });
      title.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    announce(step === 4 ? 'Simulation terminée. Aucun rendez-vous pris et aucune donnée envoyée.' : `Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][step]}.`);
  }

  function validateContact() {
    const name = nameField.value.trim();
    const phone = phoneField.value.replace(/[\s.()\-]/g, '');
    const validName = name.length > 0 && name.length <= 60;
    const validPhone = /^(?:0|\+33|0033)[67]\d{8}$/.test(phone);
    $('#name-error').textContent = validName ? '' : 'Indiquez votre prénom pour essayer le récapitulatif.';
    $('#phone-error').textContent = validPhone ? '' : `Indiquez un mobile français${NB}: 06, 07 ou +33, suivi du numéro.`;
    nameField.setAttribute('aria-invalid', String(!validName));
    phoneField.setAttribute('aria-invalid', String(!validPhone));
    if (!validName) nameField.focus();
    else if (!validPhone) phoneField.focus();
    return validName && validPhone;
  }
  function stillAvailable() {
    const day = currentDay();
    const service = currentService();
    return day && service && slotsFor(day, service.duration).some((slot) => slot.value === state.time && slot.available);
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step === 0 && !state.service) { showError('Choisissez une prestation pour continuer.'); $('[name="service"]').focus(); return; }
    if (state.step === 1 && !state.day) { showError('Choisissez un jour ouvert pour la simulation.'); $('[name="day"]:enabled')?.focus(); return; }
    if (state.step === 2 && !state.time) { showError('Choisissez une heure disponible pour continuer.'); $('[name="time"]:enabled')?.focus(); return; }
    if (state.step >= 2 && state.time && !stillAvailable()) {
      state.time = '';
      goTo(2, { instant: true });
      showError('Ce créneau vient de passer. Choisissez une autre heure, ou revenez au choix du jour.');
      return;
    }
    if (state.step < 3) { goTo(state.step + 1); return; }
    if (state.step !== 3 || !validateContact()) return;
    const service = currentService();
    const day = currentDay();
    const time = state.time.replace(':', NB + 'h' + NB);
    $('#result-message').textContent = `${nameField.value.trim()}, voici votre exemple${NB}: ${service.name.toLowerCase()}, ${service.duration}${NB}min, le ${day.label} à ${time}. Prix indicatif${NB}: ${service.price}. Camara’s barbershop, 96 avenue Yves Brunaud, Toulouse.`;
    state.complete = true;
    goTo(4);
  });
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.disabled) return;
    if (input.name === 'service') {
      if (state.service !== input.value) { state.service = input.value; state.time = ''; }
    } else if (input.name === 'day') {
      if (state.day !== input.value) { state.day = input.value; state.time = ''; }
    } else if (input.name === 'time') state.time = input.value;
    else return;
    state.complete = false;
    showError('');
    updateSummary();
    const message = input.name === 'service' ? `${currentService().name}, ${currentService().price}, sélectionné.` : input.name === 'day' ? `${currentDay().label}, sélectionné.` : `${state.time}, sélectionné.`;
    announce(message);
  });
  previous.addEventListener('click', () => goTo(state.step - 1));
  stepButtons.forEach((button) => button.addEventListener('click', () => goTo(+button.dataset.step)));
  $$('[data-edit]').forEach((button) => button.addEventListener('click', () => goTo(+button.dataset.edit)));
  $$('[data-preselect]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const service = link.dataset.preselect;
    state.service = service;
    state.time = '';
    $(`[name="service"][value="${service}"]`).checked = true;
    $('#rendez-vous').scrollIntoView({ block: 'start', behavior: reduced.matches || keyboardAction ? 'instant' : 'smooth' });
    goTo(1, { focus: false });
    $('#step-title-1').focus({ preventScroll: true });
  }));
  [nameField, phoneField].forEach((field) => field.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    $(field === nameField ? '#name-error' : '#phone-error').textContent = '';
  }));
  $('#restart-booking').addEventListener('click', () => {
    state.service = ''; state.day = ''; state.time = ''; state.complete = false;
    form.reset();
    $('#name-error').textContent = ''; $('#phone-error').textContent = '';
    nameField.removeAttribute('aria-invalid'); phoneField.removeAttribute('aria-invalid');
    $('#result-message').textContent = '';
    goTo(0);
  });
  // Suppress the persistent mobile actions near the working form and keyboard.
  const mobileBar = $('.mobile-actions');
  let bookingVisible = false;
  let contactFocused = false;
  const updateBar = () => {
    const hide = bookingVisible || contactFocused;
    mobileBar.classList.toggle('is-hidden', hide);
    mobileBar.inert = hide;
  };
  if ('IntersectionObserver' in window) {
    const bookingObserver = new IntersectionObserver((entries) => {
      bookingVisible = entries[0].isIntersecting;
      updateBar();
    }, { threshold: 0 });
    bookingObserver.observe($('#rendez-vous'));
  }
  form.addEventListener('focusin', (event) => {
    contactFocused = event.target === nameField || event.target === phoneField;
    updateBar();
  });
  form.addEventListener('focusout', () => {
    contactFocused = false;
    updateBar();
  });
  workspace.hidden = false;
  updateSummary();
})();
