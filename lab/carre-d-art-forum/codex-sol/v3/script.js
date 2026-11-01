/* Carré d’Art Forum · simulation locale, aucune donnée transmise. */
(() => {
  'use strict';
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'));
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const nb = '\u00a0';
  const durationText = m => m < 60 ? `${m}${nb}min` : `${Math.floor(m / 60)}${nb}h${m % 60 ? nb + String(m % 60).padStart(2, '0') : ''}`;
  const timeText = m => `${Math.floor(m / 60)}${nb}h${m % 60 ? nb + String(m % 60).padStart(2, '0') : ''}`;
  const longDate = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d);
  const dayCode = d => d.toISOString().slice(0, 10);
  function parisNow() {
    const data = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(p => data[p.type] = p.value);
    return { date: new Date(Date.UTC(+data.year, +data.month - 1, +data.day, 12)), minutes: (+data.hour % 24) * 60 + +data.minute };
  }
  function holiday(d) {
    const y = d.getUTCFullYear(), a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const e = Math.floor(b / 4), f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - e - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * (b % 4) + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easter = new Date(Date.UTC(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12));
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    return fixed.includes(dayCode(d).slice(5)) || [1, 39, 50].some(n => dayCode(new Date(+easter + n * 86400000)) === dayCode(d));
  }
  function updateStatus() {
    const { date, minutes } = parisNow();
    const h = hours[date.getUTCDay()];
    const text = holiday(date) ? 'Jour férié · ouverture à confirmer par téléphone.' : h ? (minutes >= h[0] && minutes < h[1] ? `Ouvert aujourd’hui jusqu’à ${timeText(h[1])}.` : `Aujourd’hui${nb}: ${timeText(h[0])}–${timeText(h[1])}.`) : 'Fermé aujourd’hui · du mardi au samedi au Forum.';
    $('[data-status]').textContent = text;
    $('[data-hours-today]').textContent = text;
    $$('[data-dow]').forEach(r => r.classList.toggle('is-today', +r.dataset.dow === date.getUTCDay()));
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  // Le document se dévoile une fois, sans masquer le contenu en l’absence de JS.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); }
    }), { threshold: .1 });
    $$('[data-reveal]').forEach(el => { el.classList.add('waiting'); observer.observe(el); });
    reduced.addEventListener('change', e => { if (e.matches) { $$('[data-reveal]').forEach(el => el.classList.remove('waiting')); observer.disconnect(); } });
  }

  const services = $$('[data-service]').map(el => ({ id: el.dataset.service, name: el.dataset.name, duration: +el.dataset.duration, price: +el.dataset.price, from: el.dataset.from === 'true' }));
  const priceText = s => `${s.from ? 'dès ' : ''}${s.price}${nb}€`;
  const state = { service: null, date: null, time: null, step: 0, reached: 0 };
  const booking = $('[data-booking]');
  const live = $('[data-live]');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  let transitionFrame = 0;
  const announce = text => { live.textContent = text; };
  function updateTempo() {
    const example = state.service || services.find(s => s.id === 'brushing');
    $('[data-tempo-number]').textContent = String(example.duration);
    $('[data-tempo-example]').textContent = example.name;
    $('[data-tempo-name]').textContent = example.name;
    $('[data-tempo-price]').textContent = priceText(example);
    $$('[data-duration-choice]').forEach(input => {
      input.checked = services.find(s => s.id === input.value).duration === example.duration;
    });
  }
  function updateSummary() {
    updateTempo();
    $('[data-summary-service]').textContent = state.service?.name || 'À choisir';
    $('[data-summary-day]').textContent = state.date ? longDate(state.date) : 'À choisir';
    $('[data-summary-time]').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    $('[data-summary-duration]').textContent = state.service ? durationText(state.service.duration) : '—';
    $('[data-summary-price]').textContent = state.service ? priceText(state.service) : '—';
    $('[data-recap]').textContent = state.service && state.date && state.time !== null ? `${state.service.name} · ${longDate(state.date)} à ${timeText(state.time)} · ${durationText(state.service.duration)} · ${priceText(state.service)}, indicatif.` : '';
    stepButtons.forEach((b, i) => {
      b.disabled = i > state.reached;
      if (i === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  function showStep(next, focus = true) {
    cancelAnimationFrame(transitionFrame);
    panels.forEach(p => { p.hidden = +p.dataset.panel !== next; p.classList.remove('enter'); });
    state.step = next;
    state.reached = Math.max(state.reached, Math.min(3, next));
    const active = $(`[data-panel="${next}"]`);
    if (!reduced.matches && !root.classList.contains('keyboard')) {
      active.classList.add('enter');
      transitionFrame = requestAnimationFrame(() => { void active.offsetWidth; active.classList.remove('enter'); });
    }
    updateSummary();
    if (focus) $('h3', active).focus();
    announce(next === 4 ? 'Simulation terminée. Aucun rendez-vous réel, aucune donnée envoyée.' : `Étape ${next + 1} sur 4${nb}: ${$('h3', active).textContent}`);
  }
  function renderServices() {
    $('[data-service-options]').innerHTML = services.map(s => `<label class="choice"><input type="radio" name="prestation" value="${s.id}"><span>${s.name}<small>${durationText(s.duration)}</small></span><strong>${priceText(s)}</strong></label>`).join('');
  }
  function selectService(id) {
    const s = services.find(s => s.id === id);
    if (!s) return;
    state.service = s;
    state.date = null; state.time = null; state.reached = 0;
    $(`[name="prestation"][value="${id}"]`).checked = true;
    $('[data-next="1"]').disabled = false;
    $('[data-next="2"]').disabled = true;
    $('[data-next="3"]').disabled = true;
    renderDays();
    updateSummary();
    announce(`${s.name}, ${durationText(s.duration)}, ${priceText(s)} indicatif. Choisissez le jour pour continuer.`);
  }
  function slotsFor(date, service) {
    const h = hours[date.getUTCDay()];
    if (!h || !service) return [];
    const now = parisNow(), seed = Math.floor(+date / 86400000);
    const slots = [];
    for (let time = h[0]; time + service.duration <= h[1]; time += 30) {
      const past = dayCode(date) < dayCode(now.date) || (dayCode(date) === dayCode(now.date) && time <= now.minutes);
      const taken = (seed + time / 30 + service.duration) % 7 === 0 || (seed + time / 30) % 11 === 0;
      slots.push({ time, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
    }
    return slots;
  }
  function renderDays() {
    const today = parisNow().date;
    const days = Array.from({ length: 14 }, (_, i) => new Date(+today + i * 86400000));
    if (state.date && (!days.some(d => dayCode(d) === dayCode(state.date)) || !slotsFor(state.date, state.service).some(s => !s.disabled))) {
      state.date = null; state.time = null; state.reached = 1;
      $('[data-next="2"]').disabled = true; $('[data-next="3"]').disabled = true;
    }
    $('[data-days]').innerHTML = days.map(d => {
      const closed = !hours[d.getUTCDay()];
      const full = !closed && !slotsFor(d, state.service).some(s => !s.disabled);
      const disabled = closed || full;
      const week = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(d);
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(d);
      const note = closed ? 'fermé' : full ? 'complet' : holiday(d) ? 'férié, à confirmer' : month;
      const checked = !disabled && state.date && dayCode(d) === dayCode(state.date);
      return `<label class="day"><input type="radio" name="jour" value="${dayCode(d)}" ${disabled ? 'disabled' : ''} ${checked ? 'checked' : ''} aria-label="${longDate(d)}, ${note}"><span>${week}</span><strong>${d.getUTCDate()}</strong><small>${note}</small></label>`;
    }).join('');
  }
  function renderSlots() {
    const slots = slotsFor(state.date, state.service);
    if (state.time !== null && !slots.some(s => s.time === state.time && !s.disabled)) {
      state.time = null; state.reached = 2; $('[data-next="3"]').disabled = true;
    }
    $('[data-slots]').innerHTML = slots.map(s => `<label class="slot"><input type="radio" name="heure" value="${s.time}" ${s.disabled ? 'disabled' : ''} ${!s.disabled && s.time === state.time ? 'checked' : ''} aria-label="${timeText(s.time)}${s.reason ? ', ' + s.reason : ''}"><span>${timeText(s.time)}</span>${s.reason ? `<small>${s.reason}</small>` : ''}</label>`).join('');
    $('[data-slot-help]').textContent = `${longDate(state.date)} · ${durationText(state.service.duration)}. Créneaux fictifs${nb}; horaires barrés déjà pris ou passés.${holiday(state.date) ? ` Jour férié${nb}: ouverture à confirmer.` : ''}`;
  }
  renderServices();
  booking.hidden = false;
  updateSummary();
  booking.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      state.date = new Date(`${input.value}T12:00:00Z`); state.time = null; state.reached = 1;
      $('[data-next="2"]').disabled = false; $('[data-next="3"]').disabled = true;
      renderSlots(); updateSummary(); announce(`${longDate(state.date)} sélectionné. Choisissez l’heure pour continuer.`);
    }
    if (input.name === 'heure') {
      state.time = +input.value; $('[data-next="3"]').disabled = false;
      updateSummary(); announce(`${timeText(state.time)} sélectionné. Continuez vers vos coordonnées.`);
    }
  });
  $$('[data-next]').forEach(b => b.addEventListener('click', () => {
    const next = +b.dataset.next;
    if (next === 1 && state.service) renderDays();
    if (next === 2 && state.date) renderSlots();
    showStep(next);
  }));
  stepButtons.forEach(b => b.addEventListener('click', () => {
    if (+b.dataset.step === 1) renderDays();
    if (+b.dataset.step === 2 && state.date) renderSlots();
    showStep(+b.dataset.step);
  }));
  $$('[data-book]').forEach(a => a.addEventListener('click', event => {
    event.preventDefault();
    selectService(a.dataset.book);
    showStep(0);
  }));
  $$('[data-duration-choice]').forEach(input => input.addEventListener('change', () => {
    selectService(input.value);
    showStep(0, false);
    const s = state.service;
    $('[data-tempo-live]').textContent = `${s.duration}${nb}minutes${nb}: ${s.name}, ${priceText(s)}, indicatif. Prestation sélectionnée dans le simulateur.`;
  }));
  $('[data-time-book]').addEventListener('click', event => {
    event.preventDefault();
    if (!state.service) selectService('brushing');
    renderDays();
    showStep(1);
  });
  function fieldError(id, message) {
    $(`#${id}-error`).textContent = message;
    $(`#${id}`).setAttribute('aria-invalid', String(Boolean(message)));
  }
  ['prenom', 'telephone'].forEach(id => $(`#${id}`).addEventListener('input', () => fieldError(id, '')));
  $('[data-form]').addEventListener('submit', event => {
    event.preventDefault();
    const first = $('#prenom').value.trim(), phone = $('#telephone').value.replace(/[\s.()\-]/g, '');
    const firstOK = first.length >= 2 && /\p{L}/u.test(first);
    const phoneOK = /^(?:0|\+33|0033)[67]\d{8}$/.test(phone);
    fieldError('prenom', firstOK ? '' : 'Indiquez un prénom d’au moins deux caractères.');
    fieldError('telephone', phoneOK ? '' : 'Indiquez un mobile français\u00a0: 06 ou 07, suivi de huit chiffres.');
    if (!firstOK || !phoneOK) { (!firstOK ? $('#prenom') : $('#telephone')).focus(); announce('Vérifiez les coordonnées indiquées.'); return; }
    const valid = state.date && slotsFor(state.date, state.service).some(s => s.time === state.time && !s.disabled);
    if (!valid) {
      state.time = null; state.reached = 2; $('[data-next="3"]').disabled = true;
      renderSlots(); showStep(2); announce('Ce créneau est passé. Choisissez un nouvel horaire fictif.'); return;
    }
    $('[data-success]').textContent = `${first}, vous avez essayé${nb}: ${state.service.name}, ${longDate(state.date)} à ${timeText(state.time)}. Durée ${durationText(state.service.duration)}${nb}; ${priceText(state.service)}, à confirmer au salon.`;
    showStep(4);
  });
  $('[data-restart]').addEventListener('click', () => {
    state.service = null; state.date = null; state.time = null; state.reached = 0;
    $('[data-form]').reset(); renderServices();
    ['prenom', 'telephone'].forEach(id => fieldError(id, ''));
    $$('[data-next]').forEach(b => b.disabled = true);
    showStep(0);
  });
  // Activer les contrôles seulement après initialisation complète de la simulation.
  $('.tempo-selector').disabled = false;
})();
