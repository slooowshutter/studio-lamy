/* H STYLE — simulation locale. Aucune requête, aucun stockage de coordonnées. */
(() => {
  'use strict';
  const SERVICES = {
    coupe: { name: 'Coupe', duration: 30, price: 20 },
    duo: { name: 'Coupe + barbe', duration: 45, price: 28 },
    barbe: { name: 'Taille de barbe', duration: 20, price: 12 },
    enfant: { name: 'Coupe enfant', duration: 25, price: 15 }
  };
  // Base Meilleur-coiffeur, 01/11/2026. Tous les horaires restent à confirmer.
  const HOURS = [[], [], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 720], [840, 1140]], [[540, 1110]]];
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const key = date => date.toISOString().slice(0, 10);
  const parseDay = value => new Date(`${value}T12:00:00Z`);
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).map(p => [p.type, p.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function nextDays(now = new Date()) {
    const start = parseDay(parisNow(now).day);
    return Array.from({ length: 14 }, (_, i) => new Date(start.getTime() + i * 86400000));
  }
  const timeLabel = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  function holidays(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easter = new Date(Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12));
    return new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map(x => `${year}-${x}`).concat([1, 39, 50].map(n => key(new Date(easter.getTime() + n * 86400000)))));
  }
  function slotsFor(day, duration, now = new Date()) {
    const today = parisNow(now), date = parseDay(day);
    if (day < today.day) return [];
    const seed = Math.floor(date.getTime() / 86400000);
    return HOURS[date.getUTCDay()].flatMap(([start, end]) => {
      const slots = [];
      for (let time = start; time + duration <= end; time += 15) {
        const past = day === today.day && time <= today.minutes;
        const taken = (seed + time / 15) % 7 === 2;
        slots.push({ time, unavailable: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
      }
      return slots;
    });
  }
  function validPhone(value) {
    const number = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(number);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { SERVICES, HOURS, parisNow, nextDays, slotsFor, holidays, validPhone, timeLabel };
  if (typeof document === 'undefined') return;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { step: 0, service: null, day: null, time: null };
  const panels = $$('[data-panel]');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard'); }, { passive: true });

  function sync() {
    const service = SERVICES[state.service];
    $('#sum-service').textContent = service ? service.name : 'À choisir';
    $('#sum-day').textContent = state.day ? longDate.format(parseDay(state.day)) : 'À choisir';
    $('#sum-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#sum-price').textContent = service ? `${service.price}\u00a0€` : '—';
    $('#sum-duration').textContent = service ? `${service.duration}\u00a0min · durée indicative` : 'Durée à préciser';
    $$('[data-service]').forEach(link => {
      const selected = link.dataset.service === state.service;
      link.classList.toggle('is-selected', selected);
      const label = link.querySelector('.service-action');
      if (label) label.textContent = selected ? 'Sélectionnée' : 'Choisir ↗';
    });
    const available = [true, !!service, !!state.day, state.time !== null];
    $$('[data-step]').forEach(button => {
      const n = Number(button.dataset.step);
      button.disabled = !available[n];
      if (n === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function dayChoice(date) {
    const value = key(date), closed = HOURS[date.getUTCDay()].length === 0;
    const holiday = holidays(date.getUTCFullYear()).has(value);
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'day'; input.value = value; input.disabled = closed; input.checked = state.day === value;
    input.setAttribute('aria-label', `${longDate.format(date)}${closed ? ', fermé dans cet essai' : ''}${holiday ? ', jour férié, ouverture à confirmer' : ''}`);
    const content = document.createElement('span');
    content.className = 'choice-content';
    content.innerHTML = `<span>${shortDay.format(date)}</span><b>${date.getUTCDate()}</b><span>${monthFormat.format(date)}</span><small>${closed ? 'fermé' : holiday ? 'férié · à confirmer' : 'à confirmer'}</small>`;
    label.append(input, content); return label;
  }
  function renderDays() {
    $('#days').replaceChildren(...nextDays().map(dayChoice));
  }
  function renderSlots() {
    if (!state.day || !state.service) return;
    const options = slotsFor(state.day, SERVICES[state.service].duration);
    $('#slot-context').textContent = `${longDate.format(parseDay(state.day))} · ${SERVICES[state.service].duration}\u00a0min. Les créneaux respectent les pauses et la fermeture.`;
    $('#slots').replaceChildren(...options.map(slot => {
      const label = document.createElement('label'); label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'time'; input.value = slot.time; input.disabled = slot.unavailable; input.checked = state.time === slot.time;
      input.setAttribute('aria-label', `${timeLabel(slot.time)}${slot.reason ? `, ${slot.reason}` : ''}`);
      const content = document.createElement('span'); content.className = 'choice-content';
      content.innerHTML = `<span>${timeLabel(slot.time)}</span><small>${slot.reason || 'essai'}</small>`;
      label.append(input, content); return label;
    }));
    $('#empty-slots').hidden = options.some(slot => !slot.unavailable);
  }
  function goStep(step, focus = true) {
    state.step = step;
    $('#selection-error').textContent = '';
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, i) => { panel.hidden = i !== step; panel.classList.remove('entering'); });
    const active = panels[step];
    if (!keyboard && !reduced.matches) {
      active.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => active.classList.remove('entering')));
    }
    $('#back').hidden = step === 0;
    $('#next').textContent = ['Choisir le jour →', 'Choisir l’heure →', 'Continuer →', 'Terminer l’essai →'][step];
    sync();
    $('#booking-status').textContent = `Étape ${step + 1} sur 4 : ${$(`#step-title-${step}`).textContent}`;
    if (focus) {
      const heading = $(`#step-title-${step}`);
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function selectService(value) {
    if (state.service !== value) { state.service = value; state.day = null; state.time = null; }
    $(`input[name=service][value=${value}]`).checked = true;
    sync();
  }
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    $('#success').hidden = true; $('#success-recap').textContent = ''; $('#booking-form').hidden = false; $('.steps').hidden = false;
    selectService(link.dataset.service);
    goStep(1);
    $(`#step-title-${state.step}`).scrollIntoView({ behavior: 'instant', block: 'start' });
  }));
  $('#booking-form').addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'service') selectService(value);
    if (name === 'day') { if (state.day !== value) state.time = null; state.day = value; }
    if (name === 'time') state.time = Number(value);
    $('#selection-error').textContent = ''; sync();
  });
  $$('[data-step]').forEach(button => button.addEventListener('click', () => goStep(Number(button.dataset.step))));
  $('#back').addEventListener('click', () => goStep(Math.max(0, state.step - 1)));
  function errorFor(id, message) {
    const field = $(id === 'name' ? '#first-name' : '#phone');
    $(`#${id}-error`).textContent = message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  $('#first-name').addEventListener('input', () => errorFor('name', ''));
  $('#phone').addEventListener('input', () => errorFor('phone', ''));
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const values = [state.service, state.day, state.time];
    if (state.step < 3 && values[state.step] === null) {
      $('#selection-error').textContent = ['Choisissez une prestation pour continuer.', 'Choisissez un jour pour continuer.', 'Choisissez une heure pour continuer.'][state.step];
      panels[state.step].querySelector('input:not(:disabled)')?.focus(); return;
    }
    if (state.step >= 1 && !nextDays().some(d => key(d) === state.day)) {
      state.day = null; state.time = null; goStep(1);
      $('#selection-error').textContent = 'Le calendrier a changé. Choisissez un nouveau jour.'; return;
    }
    if (state.step >= 2) {
      const valid = slotsFor(state.day, SERVICES[state.service].duration).some(slot => slot.time === state.time && !slot.unavailable);
      if (!valid) { state.time = null; goStep(2); $('#selection-error').textContent = 'Cette heure est passée. Choisissez un nouveau créneau.'; return; }
    }
    if (state.step < 3) { goStep(state.step + 1); return; }
    const firstName = $('#first-name').value.trim();
    const nameOk = /^[\p{L}][\p{L}\p{M}’' -]{0,59}$/u.test(firstName);
    const phoneOk = validPhone($('#phone').value);
    errorFor('name', nameOk ? '' : 'Indiquez un prénom, avec des lettres.');
    errorFor('phone', phoneOk ? '' : 'Indiquez un mobile français valide, par exemple 06 12 34 56 78.');
    if (!nameOk || !phoneOk) { $(nameOk ? '#phone' : '#first-name').focus(); return; }
    const service = SERVICES[state.service];
    $('#success-recap').textContent = `${firstName}, voici votre essai : ${service.name}, ${longDate.format(parseDay(state.day))} à ${timeLabel(state.time)}, ${service.duration}\u00a0min, ${service.price}\u00a0€ indicatifs. Au 5 rue d’Auxonne, Dijon.`;
    $('#booking-form').hidden = true; $('.steps').hidden = true; $('#success').hidden = false;
    $('#first-name').value = ''; $('#phone').value = '';
    $('#booking-status').textContent = 'Essai terminé. Aucun rendez-vous pris, aucune donnée envoyée.';
    $('#success-title').focus({ preventScroll: true });
    $('#success').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  $('#restart').addEventListener('click', () => {
    state.service = null; state.day = null; state.time = null;
    $('#booking-form').reset(); errorFor('name', ''); errorFor('phone', '');
    $('#success').hidden = true; $('#success-recap').textContent = ''; $('#booking-form').hidden = false; $('.steps').hidden = false;
    goStep(0);
  });
  $('#booking-app').hidden = false; $('#booking-fallback').hidden = true; goStep(0, false);

  if ('IntersectionObserver' in window) {
    const stage = $('.poster-line');
    if (stage && !reduced.matches) {
      document.documentElement.classList.add('motion-ready');
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }), { threshold: 0.08 });
      observer.observe(stage);
    }
    const visible = new Map();
    const bar = $('.mobile-bar');
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target, entry.isIntersecting));
      bar.classList.toggle('is-hidden', [...visible.values()].some(Boolean));
    });
    ['.hero-actions', '#reserver', '.site-footer'].forEach(selector => { const element = $(selector); if (element) barObserver.observe(element); });
  }
})();
