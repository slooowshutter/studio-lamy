/* Le Salon et Vous — local preview only. No network calls or persistence. */
(() => {
  'use strict';
  const SERVICES = [
    { id: 'brushing', name: 'Shampoing + brushing', minutes: 30, price: 45, detail: 'Hors cheveux longs', color: false },
    { id: 'coupe', name: 'Shampoing + coupe + brushing femme', minutes: 60, price: 77, detail: 'Hors cheveux longs ou épais', color: false },
    { id: 'homme', name: 'Coupe homme aux ciseaux', minutes: 30, price: 40, detail: 'Coupe aux ciseaux', color: false },
    { id: 'racines', name: 'Coloration racines + soin + brushing', minutes: 120, price: 118, detail: 'Hors cheveux longs ou épais', color: true },
    { id: 'gloss', name: 'Gloss + soin + brushing', minutes: 75, price: 103, detail: 'Hors cheveux longs ou épais', color: true },
    { id: 'balayage', name: 'Balayage + soin + brushing', minutes: 180, price: 168, detail: 'Cheveux courts', color: true }
  ];
  const OPENING = { 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [570, 1140] };
  const parisFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const pad = n => String(n).padStart(2, '0');
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(now).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const noon = date => new Date(`${date}T12:00:00Z`);
  const weekday = date => noon(date).getUTCDay();
  function addDays(date, count) { const d = noon(date); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
  function isHoliday(date) {
    const y = Number(date.slice(0, 4));
    // Gregorian Easter, then the three movable French public holidays.
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
    const easter = `${y}-${pad(Math.floor(n / 31))}-${pad(n % 31 + 1)}`;
    return ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(date.slice(5)) || [1, 39, 50].some(x => addDays(easter, x) === date);
  }
  function slotsFor(date, service, now = new Date()) {
    const hours = OPENING[weekday(date)];
    if (!hours || !service) return [];
    const current = parisNow(now);
    const seed = Math.floor(noon(date).getTime() / 86400000);
    const slots = [];
    for (let start = hours[0], index = 0; start + service.minutes <= hours[1]; start += 30, index++) {
      const past = date < current.date || (date === current.date && start <= current.minutes);
      const busy = (seed + index * 3 + service.minutes) % 7 === 2;
      slots.push({ start, end: start + service.minutes, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function daysFor(service, now = new Date()) {
    const today = parisNow(now).date;
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today, i), closed = !OPENING[weekday(date)];
      const ended = !closed && !slotsFor(date, service, now).some(s => !s.disabled);
      return { date, closed, disabled: closed || ended, reason: closed ? 'Fermé' : ended ? 'Sans créneau' : '', holiday: isHoliday(date) };
    });
  }
  function validPhone(value) { return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(value.replace(/[\s().-]/g, '')); }
  const validName = value => value.trim().length >= 2 && value.trim().length <= 60 && /\p{L}/u.test(value);
  const timeLabel = minutes => `${pad(Math.floor(minutes / 60))}\u00a0h\u00a0${pad(minutes % 60)}`;
  const money = amount => `${amount}\u00a0€`;
  const duration = minutes => minutes < 60 ? `${minutes}\u00a0min` : `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${pad(minutes % 60)}` : ''}`;
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(noon(date));

  // Pure functions are available to the local Node verification harness.
  if (typeof module !== 'undefined' && module.exports) module.exports = { SERVICES, OPENING, parisNow, addDays, weekday, isHoliday, slotsFor, daysFor, validPhone, validName };
  if (typeof document === 'undefined') return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let state = { service: null, day: null, time: null, step: 0 };
  let transitionFrame = 0;
  let transitionFinish = 0;

  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), { passive: true });
  function create(tag, cls, text) { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; }
  function choice(group, value, disabled) {
    const label = create('label', 'choice');
    const input = create('input'); input.type = 'radio'; input.name = group; input.value = value; input.disabled = disabled; label.append(input);
    return { label, input };
  }
  function renderServices() {
    const field = $('#service-options');
    SERVICES.forEach(service => {
      const { label } = choice('service', service.id, false);
      const body = create('span', 'choice-body', service.name);
      body.append(create('small', '', `${duration(service.minutes)} · ${service.detail}`));
      label.append(body, create('span', 'choice-price', money(service.price)));
      field.append(label);
    });
  }
  function clearChoices(field) { [...field.querySelectorAll('label')].forEach(x => x.remove()); }
  function renderDays() {
    const field = $('#day-options'); clearChoices(field);
    daysFor(state.service).forEach(day => {
      const { label, input } = choice('day', day.date, day.disabled);
      input.checked = day.date === state.day;
      const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(noon(day.date));
      const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(noon(day.date));
      label.append(create('small', '', dayName), create('span', 'day-num', String(noon(day.date).getUTCDate())), create('span', 'day-month', month));
      if (day.reason) label.append(create('small', '', day.reason));
      else if (day.holiday) label.append(create('small', '', 'Férié*'));
      input.setAttribute('aria-label', `${dateLabel(day.date)}${day.reason ? `, ${day.reason}` : ''}${day.holiday ? ', jour férié, ouverture à confirmer' : ''}`);
      field.append(label);
    });
  }
  function renderSlots() {
    const field = $('#slot-options'); clearChoices(field);
    const slots = slotsFor(state.day, state.service);
    slots.forEach(slot => {
      const { label, input } = choice('time', String(slot.start), slot.disabled);
      input.checked = slot.start === state.time;
      label.append(create('span', 'slot-time', timeLabel(slot.start)), create('small', '', slot.reason || `fin ${timeLabel(slot.end)}`));
      input.setAttribute('aria-label', `${timeLabel(slot.start)}, ${slot.reason || `fin à ${timeLabel(slot.end)}`}`);
      field.append(label);
    });
    $('#no-slots').hidden = slots.some(s => !s.disabled);
  }
  function sync() {
    $('#summary-service').textContent = state.service ? `${state.service.name} · ${state.service.detail} · ${duration(state.service.minutes)}` : 'À choisir';
    $('#summary-day').textContent = state.day ? dateLabel(state.day) + (isHoliday(state.day) ? ' · férié, à confirmer' : '') : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? `${timeLabel(state.time)} – ${timeLabel(state.time + state.service.minutes)}` : 'À choisir';
    $('#summary-price').textContent = state.service ? money(state.service.price) : '—';
    $('#color-reminder').hidden = !state.service?.color;
    $$('[data-next]').forEach(button => { const step = Number(button.dataset.next); button.disabled = step === 1 ? !state.service : step === 2 ? !state.day : state.time === null; });
    $$('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = step === 1 ? !state.service : step === 2 ? !state.day : step === 3 ? state.time === null : false;
      if (step === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function go(step, focus = true) {
    if ((step >= 1 && !state.service) || (step >= 2 && !state.day) || (step >= 3 && state.time === null)) return;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    cancelAnimationFrame(transitionFrame); cancelAnimationFrame(transitionFinish);
    $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; panel.classList.remove('entering'); });
    const panel = $(`[data-panel="${step}"]`);
    sync();
    $('#booking-status').textContent = `Étape ${step + 1} sur 4. ${panel.querySelector('h3').textContent}`;
    if (focus) {
      const heading = panel.querySelector('h3');
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'nearest', behavior: reduced.matches || root.classList.contains('keyboard') ? 'instant' : 'smooth' });
      if (!reduced.matches && !root.classList.contains('keyboard')) {
        panel.classList.add('entering');
        transitionFrame = requestAnimationFrame(() => { transitionFinish = requestAnimationFrame(() => panel.classList.remove('entering')); });
      }
    }
  }
  function restoreForm() {
    $('#booking-success').hidden = true;
    $('.booking-layout').hidden = false;
    $('.step-nav').hidden = false;
  }
  function selectService(id) {
    const service = SERVICES.find(s => s.id === id); if (!service) return;
    state.service = service; state.day = null; state.time = null;
    restoreForm();
    $$('input[name="service"]').forEach(input => { input.checked = input.value === id; });
    sync();
  }
  $('#booking-form').addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') selectService(input.value);
    else if (input.name === 'day') { state.day = input.value; state.time = null; sync(); }
    else if (input.name === 'time') { state.time = Number(input.value); sync(); }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.next))));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); selectService(link.dataset.service); go(1);
  }));
  function error(id, text) { const input = $(`#${id}`); input.setAttribute('aria-invalid', text ? 'true' : 'false'); $(`#${id === 'first-name' ? 'name' : 'phone'}-error`).textContent = text; }
  ['first-name', 'phone'].forEach(id => $(`#${id}`).addEventListener('input', () => error(id, '')));
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const currentDays = daysFor(state.service);
    const available = state.day && currentDays.some(d => d.date === state.day && !d.disabled) && slotsFor(state.day, state.service).some(s => s.start === state.time && !s.disabled);
    if (!available) { state.day = null; state.time = null; go(1); $('#booking-status').textContent = 'Ce créneau est maintenant passé. Choisissez un nouveau jour.'; return; }
    const name = $('#first-name').value.trim(), phone = $('#phone').value;
    const nameOK = validName(name), phoneOK = validPhone(phone);
    error('first-name', nameOK ? '' : 'Indiquez un prénom de 2 caractères au minimum.');
    error('phone', phoneOK ? '' : 'Utilisez un mobile français valide, par exemple 06 12 34 56 78.');
    if (!nameOK || !phoneOK) { $(!nameOK ? '#first-name' : '#phone').focus(); return; }
    $('#success-recap').textContent = `${name}, votre sélection d’essai : ${state.service.name} (${state.service.detail.toLowerCase()}), ${dateLabel(state.day)} de ${timeLabel(state.time)} à ${timeLabel(state.time + state.service.minutes)}. Tarif indicatif : ${money(state.service.price)}.${isHoliday(state.day) ? ' Jour férié : ouverture à confirmer.' : ''}`;
    $('.booking-layout').hidden = true; $('.step-nav').hidden = true; $('#booking-success').hidden = false;
    $('#booking-success h3').focus({ preventScroll: true });
    $('#booking-success').scrollIntoView({ block: 'nearest', behavior: 'instant' });
    $('#booking-status').textContent = 'Simulation terminée. Aucun rendez-vous pris, aucune information envoyée.';
    $('#phone').value = ''; $('#first-name').value = '';
  });
  $('#restart').addEventListener('click', () => {
    state = { service: null, day: null, time: null, step: 0 };
    $('#booking-form').reset(); $('#success-recap').textContent = ''; restoreForm(); go(0);
  });
  $$('.filters button').forEach(button => button.addEventListener('click', () => {
    $$('.filters button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    $$('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== row.dataset.category; if (!row.hidden) count++; });
    $('#filter-status').textContent = `${count} prestations affichées.`;
  }));
  $$('[data-project]').forEach(button => button.addEventListener('click', () => {
    $$('[data-project]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $('#project-text').textContent = button.dataset.project;
  }));

  renderServices(); sync();
  $('#booking-app').hidden = false;
  $$('.filters, .project-controls').forEach(el => { el.hidden = false; });
  // Only enhance after the essential UI has mounted. Static content never depends on a reveal.
  root.classList.add('js');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .12 });
    $$('.quarter, .conversation-lines, .dialogue-joint').forEach(el => { el.classList.add('is-observed'); observer.observe(el); });
  } else $$('.quarter, .conversation-lines, .dialogue-joint').forEach(el => el.classList.add('is-visible'));
})();
