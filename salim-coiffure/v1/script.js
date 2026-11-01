/* Salim coiffure — simulation locale, sans requête ni conservation des coordonnées. */
(() => {
  'use strict';

  const SERVICES = {
    coupe: { name: 'Coupe femme', duration: 30, price: 25 },
    balayage: { name: 'Balayage', duration: 120, price: 70 },
    keratine: { name: 'Soin à la kératine', duration: 60, price: 45 },
    lissage: { name: 'Lissage permanent', duration: 120, price: 90 }
  };
  // Horaires concordants des annuaires, à confirmer. Minutes depuis minuit à Paris.
  const HOURS = { 0: null, 1: [600, 1200], 2: [600, 1260], 3: [600, 1260], 4: [600, 1260], 5: [600, 1260], 6: [600, 1260] };
  const NB = '\u00a0';
  const parisClock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fullDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(instant).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
  function dateLabel(key) { return fullDate.format(dateObject(key)); }
  function timeLabel(minute) {
    return `${Math.floor(minute / 60)}${NB}h${minute % 60 ? `${NB}${String(minute % 60).padStart(2, '0')}` : ''}`;
  }
  function nextDays(instant = new Date()) {
    const today = parisNow(instant).key;
    return Array.from({ length: 14 }, (_, index) => {
      const day = dateObject(today);
      day.setUTCDate(day.getUTCDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { key, day, index, closed: !HOURS[day.getUTCDay()] };
    });
  }
  function slotsFor(key, duration, instant = new Date()) {
    const range = HOURS[dateObject(key).getUTCDay()];
    if (!range || !Number.isFinite(duration) || duration <= 0) return [];
    const now = parisNow(instant);
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = range[0]; minute + duration <= range[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const busy = ((seed + minute / 30) % 7 === 1) || ((seed + minute / 30) % 11 === 3);
      slots.push({ minute, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function validPhone(value) { return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(value.replace(/[\s().-]/g, '')); }
  // Pure scheduling functions can be checked with Node, without a browser or dependency.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { SERVICES, HOURS, parisNow, nextDays, slotsFor, validPhone };
    return;
  }

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { service: null, date: null, time: null, step: 0, completed: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const status = $('#booking-status');
  let transitionTimer = null;
  let entranceFrame = null;
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, true);

  function announce(message) { status.textContent = message; }
  function refreshSummary() {
    const service = SERVICES[state.service];
    $('#summary-service').textContent = service ? `${service.name} · ${service.duration}${NB}min` : 'À choisir';
    $('#summary-date').textContent = state.date ? dateLabel(state.date) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#summary-price').textContent = service ? `${service.price}${NB}€` : '—';
    $('#form-recap').textContent = service && state.date && state.time !== null
      ? `Exemple : ${service.name}, le ${dateLabel(state.date)} à ${timeLabel(state.time)}. Durée d’exemple : ${service.duration}${NB}min. Total indicatif : ${service.price}${NB}€. Aucun envoi.` : '';
    $$('[data-next]').forEach(button => {
      const step = Number(button.dataset.next);
      button.disabled = step === 1 ? !state.service : step === 2 ? !state.date : state.time === null;
    });
    stepButtons.forEach((button, index) => {
      const unlocked = index === 0 || (index === 1 && !!state.service) || (index === 2 && !!state.date) || (index === 3 && state.time !== null);
      button.disabled = state.completed || !unlocked;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(index, shouldFocus = true) {
    clearTimeout(transitionTimer);
    if (entranceFrame !== null) cancelAnimationFrame(entranceFrame);
    const previous = panels.find(panel => !panel.hidden);
    const target = panels[index];
    state.step = index;
    refreshSummary();
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach(panel => panel.classList.remove('is-entering', 'is-leaving'));
    const commit = () => {
      panels.forEach(panel => { panel.hidden = panel !== target; panel.classList.remove('is-leaving'); });
      if (!reduce.matches && !keyboard && previous !== target) {
        target.classList.add('is-entering');
        entranceFrame = requestAnimationFrame(() => {
          entranceFrame = requestAnimationFrame(() => { target.classList.remove('is-entering'); entranceFrame = null; });
        });
      }
      if (shouldFocus) $(`#step-title-${index}`).focus();
      announce(index === 4 ? 'Simulation terminée. Aucun rendez-vous réservé.' : `Étape ${index + 1} sur 4 : ${$('#step-title-' + index).textContent}`);
    };
    if (!reduce.matches && !keyboard && previous && previous !== target) {
      previous.classList.add('is-leaving');
      transitionTimer = setTimeout(commit, 100);
    } else commit();
  }

  function chooseService(value) {
    if (!SERVICES[value]) return;
    if (state.service !== value) { state.date = null; state.time = null; }
    state.service = value;
    state.completed = false;
    const radio = $(`input[name="service"][value="${value}"]`);
    if (radio) radio.checked = true;
    refreshSummary();
    announce(`${SERVICES[value].name}, ${SERVICES[value].duration} minutes, ${SERVICES[value].price} euros indicatifs. Exemple à confirmer.`);
  }
  $$('input[name="service"]').forEach(input => input.addEventListener('change', () => chooseService(input.value)));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    chooseService(link.dataset.service);
    showStep(1);
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return;
    const next = Number(button.dataset.next);
    if (next === 3 && !slotStillValid()) { expireSlot(); return; }
    showStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => { if (!button.disabled) showStep(Number(button.dataset.step)); }));

  function renderDays() {
    const fieldset = $('#day-options');
    fieldset.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Choisir le jour'; fieldset.append(legend);
    const days = nextDays();
    if (state.date && !days.some(day => day.key === state.date && !day.closed)) { state.date = null; state.time = null; refreshSummary(); }
    days.forEach(({ key, day, index, closed }) => {
      const wrap = document.createElement('div'); wrap.className = 'choice day-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'day'; input.id = `day-${key}`; input.value = key;
      input.disabled = closed; input.checked = state.date === key;
      input.setAttribute('aria-label', `${dateLabel(key)}${closed ? ', fermé' : ', horaires à confirmer'}`);
      const label = document.createElement('label'); label.htmlFor = input.id;
      const note = closed ? 'Fermé' : index === 0 ? 'Auj.' : index === 1 ? 'Demain' : '';
      [['day-week', shortDay.format(day)], ['day-number', String(day.getUTCDate())], ['day-month', shortMonth.format(day)], ['day-note', note]].forEach(([className, text]) => {
        const span = document.createElement('span'); span.className = className; span.textContent = text; label.append(span);
      });
      input.addEventListener('change', () => { state.date = key; state.time = null; refreshSummary(); announce(`Jour choisi : ${dateLabel(key)}.`); });
      wrap.append(input, label); fieldset.append(wrap);
    });
  }

  function renderSlots() {
    const container = $('#slot-options'); container.replaceChildren();
    $('#slot-error').textContent = '';
    if (!state.date || !state.service) return;
    const slots = slotsFor(state.date, SERVICES[state.service].duration);
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    const available = slots.filter(slot => !slot.disabled).length;
    $('#slot-caption').textContent = `${dateLabel(state.date)}. ${available} créneaux d’exemple disponibles. « Déjà pris » : indisponibilité simulée ; « Passé » : heure écoulée. Horaires à confirmer.`;
    [{ name: 'Matin', from: 0, to: 720 }, { name: 'Après-midi', from: 720, to: 1080 }, { name: 'Soir', from: 1080, to: 1440 }].forEach(group => {
      const matching = slots.filter(slot => slot.minute >= group.from && slot.minute < group.to);
      if (!matching.length) return;
      const fieldset = document.createElement('fieldset'); fieldset.className = 'slot-group';
      const legend = document.createElement('legend'); legend.textContent = group.name;
      const grid = document.createElement('div'); grid.className = 'slot-grid';
      matching.forEach(slot => {
        const wrap = document.createElement('div'); wrap.className = 'choice slot-choice';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'slot'; input.id = `slot-${slot.minute}`; input.value = String(slot.minute);
        input.disabled = slot.disabled; input.checked = state.time === slot.minute;
        input.setAttribute('aria-label', `${timeLabel(slot.minute)}${slot.reason ? ', ' + slot.reason : ', disponible dans la simulation'}`);
        const label = document.createElement('label'); label.htmlFor = input.id;
        const time = document.createElement('span'); time.textContent = timeLabel(slot.minute); label.append(time);
        const reason = document.createElement('small'); reason.textContent = slot.reason || 'Exemple'; label.append(reason);
        input.addEventListener('change', () => { state.time = slot.minute; $('#slot-error').textContent = ''; refreshSummary(); announce(`Heure choisie : ${timeLabel(slot.minute)}. Créneau d’exemple.`); });
        wrap.append(input, label); grid.append(wrap);
      });
      fieldset.append(legend, grid); container.append(fieldset);
    });
    if (!available) $('#slot-error').textContent = 'Aucun créneau d’exemple disponible ce jour-là. Choisissez un autre jour.';
    refreshSummary();
  }
  function slotStillValid() {
    return !!state.service && !!state.date && nextDays().some(day => day.key === state.date && !day.closed)
      && slotsFor(state.date, SERVICES[state.service].duration).some(slot => slot.minute === state.time && !slot.disabled);
  }
  function expireSlot() {
    state.time = null;
    showStep(2);
    $('#slot-error').textContent = 'Ce créneau est maintenant passé. Choisissez une nouvelle heure ou un autre jour.';
    announce('Le créneau a expiré. Choisissez une nouvelle heure.');
  }

  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#first-name'); const phone = $('#phone');
    const nameOK = name.value.trim().length > 0;
    const phoneOK = validPhone(phone.value);
    $('#name-error').textContent = nameOK ? '' : 'Indiquez un prénom, même d’exemple.';
    $('#phone-error').textContent = phoneOK ? '' : 'Indiquez un mobile français à 10 chiffres commençant par 06 ou 07, ou au format +33.';
    name.setAttribute('aria-invalid', String(!nameOK)); phone.setAttribute('aria-invalid', String(!phoneOK));
    if (!nameOK || !phoneOK) {
      (nameOK ? phone : name).focus();
      announce('Vérifiez les coordonnées indiquées sous les champs. Rien n’a été envoyé.');
      return;
    }
    if (!slotStillValid()) { expireSlot(); return; }
    const service = SERVICES[state.service];
    $('#success-recap').textContent = `Exemple : ${service.name}, le ${dateLabel(state.date)} à ${timeLabel(state.time)}. ${service.duration}${NB}min, ${service.price}${NB}€ indicatifs, à confirmer avec Salim coiffure.`;
    // Do not copy personal fields into the summary or retain them after the demonstration.
    name.value = ''; phone.value = '';
    state.completed = true;
    showStep(4);
  });
  [[$('#first-name'), $('#name-error')], [$('#phone'), $('#phone-error')]].forEach(([input, error]) => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); error.textContent = ''; }
  }));
  $('#restart').addEventListener('click', () => {
    state.service = null; state.date = null; state.time = null; state.completed = false;
    $('#booking-form').reset();
    $$('input[name="service"]').forEach(input => { input.checked = false; });
    showStep(0);
  });

  const todayRow = $(`[data-weekday="${dateObject(parisNow().key).getUTCDay()}"]`);
  if (todayRow) todayRow.classList.add('is-today');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, index) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 4) * 60}ms`;
      revealObserver.observe(element);
    });
    const hiddenRegions = new Set();
    const bar = $('.mobile-bar');
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) hiddenRegions.add(entry.target); else hiddenRegions.delete(entry.target); });
      const hidden = hiddenRegions.size > 0;
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
    }, { threshold: 0 });
    [$('.hero'), $('#reserver'), $('#fin')].forEach(element => barObserver.observe(element));
  } else {
    $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  }
  $('#booking-app').hidden = false;
  refreshSummary();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  window.salimReady = true;
})();
