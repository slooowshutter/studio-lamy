/* A local, deliberately simulated appointment. No request, storage or analytics. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    rituel: { name: 'Barbier à l’ancienne & massage de tête', duration: 45, price: 35 },
    coupe: { name: 'Coupe', duration: 30, price: 25 },
    couleur: { name: 'Coloration', duration: 90, price: 65 },
    balayage: { name: 'Balayage', duration: 120, price: 85 }
  };
  const openingHours = { 0: null, 1: null, 2: [540, 1110], 3: [540, 1110], 4: [540, 1110], 5: [540, 1110], 6: [540, 1080] };
  const state = { service: null, day: null, time: null, step: 0, maxStep: 0, complete: false, firstName: '' };
  const panels = $$('[data-panel]');
  const progress = $$('[data-step]');
  const timeFormat = (minutes) => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const priceFormat = (price) => `${price}\u00a0€`;
  const dayDate = (key) => new Date(`${key}T12:00:00Z`);
  const dayLabel = (key) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(dayDate(key));
  const dayKey = (date) => date.toISOString().slice(0, 10);
  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((part) => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function nextDays(now = parisNow()) {
    const first = dayDate(now.key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      return { key: dayKey(date), weekday: date.getUTCDay(), date };
    });
  }
  function getSlots(key, serviceId, now = parisNow()) {
    const service = services[serviceId];
    const hours = openingHours[dayDate(key).getUTCDay()];
    if (!service || !hours) return [];
    const seed = [...`${key}-${serviceId}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    const result = [];
    for (let minute = hours[0], index = 0; minute + service.duration <= hours[1]; minute += 30, index += 1) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const taken = (seed + index * 7) % 6 === 0 || (seed + index * 3) % 11 === 0;
      result.push({ minute, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
    }
    return result;
  }
  function announce(message) { $('#booking-announcement').textContent = message; }
  function showError(id, visible) { $(`#${id}`).hidden = !visible; }
  function updateProgress() {
    progress.forEach((button, index) => {
      button.disabled = index > state.maxStep || state.complete;
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function updateSummary() {
    const service = services[state.service];
    $('#summary-service').textContent = service ? service.name : 'À choisir';
    $('#summary-day').textContent = state.day ? dayLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeFormat(state.time) : 'À choisir';
    $('#summary-duration').textContent = service ? `${service.duration}\u00a0min` : '—';
    $('#summary-price').textContent = service ? priceFormat(service.price) : '—';
    const recap = $('#final-recap');
    recap.replaceChildren();
    if (service && state.day && state.time !== null) {
      const title = document.createElement('strong');
      title.textContent = service.name;
      const details = document.createElement('p');
      details.textContent = `${dayLabel(state.day)}, ${timeFormat(state.time)}.`;
      const note = document.createElement('small');
      note.textContent = `${service.duration}\u00a0min · ${priceFormat(service.price)} — durée et montant exemples, à confirmer avec ANA GALAN.`;
      recap.append(title, details, note);
    }
    updateProgress();
  }
  function radioChoice(name, value, className, disabled, description) {
    const label = document.createElement('label');
    label.className = className;
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = name; radio.value = value; radio.disabled = disabled;
    radio.setAttribute('aria-describedby', description);
    const content = document.createElement('span');
    label.append(radio, content);
    return { label, radio, content };
  }
  function renderDays() {
    const grid = $('#day-grid');
    grid.replaceChildren();
    const now = parisNow();
    nextDays(now).forEach(({ key, date, weekday }) => {
      const hours = openingHours[weekday];
      const exhausted = !!hours && !getSlots(key, state.service, now).some((slot) => !slot.disabled);
      const disabled = !hours || exhausted;
      const { label, radio, content } = radioChoice('day', key, 'date-choice', disabled, 'days-help day-error');
      radio.checked = state.day === key;
      radio.setAttribute('aria-label', `${dayLabel(key)}${!hours ? ', fermé' : exhausted ? ', complet dans cet essai' : ''}`);
      const weekdayLabel = document.createElement('span');
      weekdayLabel.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
      const number = document.createElement('b'); number.textContent = date.getUTCDate();
      const month = document.createElement('small');
      month.textContent = !hours ? 'fermé' : exhausted ? 'complet' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
      content.append(weekdayLabel, number, month);
      grid.append(label);
    });
  }
  function renderSlots() {
    const grid = $('#slot-grid');
    grid.replaceChildren();
    if (!state.day) return;
    $('#selected-day').textContent = dayLabel(state.day);
    const slots = getSlots(state.day, state.service);
    slots.forEach((slot) => {
      const { label, radio, content } = radioChoice('time', String(slot.minute), 'time-choice', slot.disabled, 'slots-help slot-error');
      radio.checked = state.time === slot.minute;
      radio.setAttribute('aria-label', `${timeFormat(slot.minute)}${slot.reason ? `, ${slot.reason}` : ''}`);
      const hour = document.createElement('b'); hour.textContent = timeFormat(slot.minute);
      content.append(hour);
      if (slot.reason) { const reason = document.createElement('small'); reason.textContent = slot.reason; content.append(reason); }
      grid.append(label);
    });
    $('#no-slots').hidden = slots.some((slot) => !slot.disabled);
  }
  function showStep(index, focus = true) {
    state.step = index;
    state.maxStep = Math.max(index, state.maxStep);
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('is-entering');
    });
    const panel = panels[index];
    if (!reducedMotion.matches && !document.documentElement.classList.contains('keyboard-action')) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }
    updateSummary();
    if (focus) panel.querySelector('h3').focus({ preventScroll: false });
    announce(`Étape ${index + 1} sur 4. ${panel.querySelector('h3').textContent}`);
  }
  function validateStep(index) {
    if (index === 0) {
      const valid = !!services[state.service];
      showError('service-error', !valid);
      $('.service-choices').setAttribute('aria-describedby', valid ? 'booking-prices' : 'booking-prices service-error');
      if (!valid) { $('[name="service"]').focus(); announce('Choisissez une prestation pour continuer.'); }
      return valid;
    }
    if (index === 1) {
      const valid = !!state.day && nextDays().some((day) => day.key === state.day && openingHours[day.weekday]) && getSlots(state.day, state.service).some((slot) => !slot.disabled);
      showError('day-error', !valid);
      if (!valid) { renderDays(); $('#day-grid input:not(:disabled)')?.focus(); announce('Choisissez un jour ouvert avec des créneaux.'); }
      return valid;
    }
    const valid = state.time !== null && !!state.day && getSlots(state.day, state.service).some((slot) => slot.minute === state.time && !slot.disabled);
    showError('slot-error', !valid);
    if (!valid) { state.time = null; renderSlots(); $('#slot-grid input:not(:disabled)')?.focus(); updateSummary(); announce('Ce créneau n’est plus disponible dans l’essai. Choisissez une autre heure.'); }
    return valid;
  }
  function chooseService(id) {
    if (!services[id]) return;
    if (id !== state.service) {
      state.service = id; state.day = null; state.time = null; state.maxStep = 0;
    }
    $(`[name="service"][value="${id}"]`).checked = true;
    showError('service-error', false);
    updateSummary();
  }
  $('#booking-form').addEventListener('change', (event) => {
    const { name, value } = event.target;
    if (name === 'service') chooseService(value);
    if (name === 'day') {
      if (value !== state.day) { state.day = value; state.time = null; state.maxStep = Math.min(state.maxStep, 2); }
      showError('day-error', false); updateSummary();
    }
    if (name === 'time') { state.time = Number(value); showError('slot-error', false); updateSummary(); }
  });
  $$('[data-next]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.next);
    if (validateStep(index)) showStep(index + 1);
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  progress.forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-book]').forEach((link) => link.addEventListener('click', () => {
    if (state.complete) restart(false);
    chooseService(link.dataset.book);
    showStep(1, false);
    announce(`${services[link.dataset.book].name} sélectionné. Étape 2 sur 4\u00a0: choisissez le jour.`);
    requestAnimationFrame(() => panels[1].querySelector('h3').focus({ preventScroll: true }));
  }));
  function phoneIsValid(value) {
    const compact = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(compact);
  }
  function validateContact() {
    const firstName = $('#first-name');
    const phone = $('#phone');
    const validName = firstName.value.trim().length > 0;
    const validPhone = phoneIsValid(phone.value);
    showError('name-error', !validName); showError('phone-error', !validPhone);
    firstName.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName) firstName.focus(); else if (!validPhone) phone.focus();
    return validName && validPhone;
  }
  ['first-name', 'phone'].forEach((id) => $(`#${id}`).addEventListener('input', () => {
    $(`#${id}`).removeAttribute('aria-invalid');
    showError(id === 'phone' ? 'phone-error' : 'name-error', false);
  }));
  $('#booking-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < 3) { if (validateStep(state.step)) showStep(state.step + 1); return; }
    if (!validateStep(1)) { showStep(1); return; }
    if (!validateStep(2)) { showStep(2); return; }
    if (!validateContact()) return;
    state.complete = true;
    state.firstName = $('#first-name').value.trim();
    const service = services[state.service];
    $('#success-recap').textContent = `${state.firstName}, voici votre essai\u00a0: ${service.name}, ${dayLabel(state.day)} à ${timeFormat(state.time)}. ${service.duration}\u00a0min · ${priceFormat(service.price)}, exemples à confirmer.`;
    $('#booking-form').hidden = true;
    $('#booking-success').hidden = false;
    updateProgress();
    $('#success-title').focus();
    announce('Simulation terminée. Aucun rendez-vous réservé, aucune donnée envoyée.');
  });
  function restart(focus = true) {
    Object.assign(state, { service: null, day: null, time: null, step: 0, maxStep: 0, complete: false, firstName: '' });
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('#booking-success').hidden = true;
    $$('.field-error').forEach((element) => { element.hidden = true; });
    $$('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
    showStep(0, focus);
  }
  $('#restart-booking').addEventListener('click', () => restart());
  function parisAppointmentUTC(key, minute) {
    const [year, month, day] = key.split('-').map(Number);
    const guess = new Date(Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60));
    const local = parisNow(guess);
    const [localYear, localMonth, localDay] = local.key.split('-').map(Number);
    const localAsUTC = Date.UTC(localYear, localMonth - 1, localDay, Math.floor(local.minute / 60), local.minute % 60);
    return new Date(guess.getTime() - (localAsUTC - guess.getTime()));
  }
  function calendarFile() {
    if (!state.complete) return '';
    const service = services[state.service];
    const utcStamp = (minute) => parisAppointmentUTC(state.day, minute).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ANA GALAN//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:essai-${state.day}-${state.time}@studiolamy.local`, `DTSTAMP:${stamp}`, `DTSTART:${utcStamp(state.time)}`, `DTEND:${utcStamp(state.time + service.duration)}`, 'SUMMARY:ESSAI uniquement - ANA GALAN - aucun RDV reserve', 'LOCATION:6 rue Alexander Taylor\\, 64000 Pau', 'DESCRIPTION:Simulation. Aucun rendez-vous reserve. Appelez le 05 59 27 47 13.', 'STATUS:TENTATIVE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  $('#download-calendar').addEventListener('click', () => {
    const blob = new Blob([calendarFile()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'ana-galan-ESSAI-aucun-rendez-vous.ics';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Fichier agenda de simulation téléchargé. Aucun rendez-vous réel.');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ' || event.key.startsWith('Arrow')) document.documentElement.classList.add('keyboard-action');
  });
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-action'), { passive: true });
  const today = dayDate(parisNow().key).getUTCDay();
  $(`[data-weekday="${today}"]`)?.setAttribute('data-today', '');
  const revealed = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealed.forEach((element) => revealObserver.observe(element));
  } else revealed.forEach((element) => element.classList.add('is-visible'));

  const mobileBar = $('.mobile-bar');
  function refreshMobileBar() {
    if (!('IntersectionObserver' in window)) return;
    const activeInput = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    const away = activeInput || $('#reserver').dataset.onScreen === 'true' || $('.site-footer').dataset.onScreen === 'true';
    mobileBar.classList.toggle('is-away', away);
    mobileBar.inert = away;
    if (away) mobileBar.setAttribute('aria-hidden', 'true'); else mobileBar.removeAttribute('aria-hidden');
  }
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { entry.target.dataset.onScreen = String(entry.isIntersecting); });
      refreshMobileBar();
    }, { threshold: 0 });
    barObserver.observe($('#reserver')); barObserver.observe($('.site-footer'));
    document.addEventListener('focusin', refreshMobileBar);
    document.addEventListener('focusout', () => requestAnimationFrame(refreshMobileBar));
  }
  updateSummary();
  window.anaGalanReady = true;
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
})();
