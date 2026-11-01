/* Le Salon et Vous. Simulation locale : aucune requête ni persistance. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const SERVICES = {
    femme: { name: 'Coupe femme', duration: 60, price: 60 },
    homme: { name: 'Coupe homme', duration: 30, price: 32 },
    enfant: { name: 'Coupe enfant', duration: 30, price: 25 },
    coloration: { name: 'Coloration', duration: 90, price: 50 },
    meches: { name: 'Mèches', duration: 120, price: 60 },
    chignon: { name: 'Chignon', duration: 60, price: 80 }
  };
  const HOURS = [null, null, [570, 1140], [570, 1140], [570, 1140], [570, 1140], [570, 1140]];
  const state = { service: null, day: null, time: null, step: 0 };
  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const longDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const timeText = m => `${String(Math.floor(m / 60)).padStart(2, '0')}\u00a0h\u00a0${String(m % 60).padStart(2, '0')}`;
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  function parisNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function holiday(key) {
    const y = Number(key.slice(0, 4));
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key.slice(5))) return true;
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
    const easter = new Date(Date.UTC(y, Math.floor(n / 31) - 1, n % 31 + 1, 12));
    return [1, 39, 50].some(offset => { const date = new Date(easter); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10) === key; });
  }
  function slotList(key, serviceId, now = parisNow()) {
    const hours = HOURS[dateFromKey(key).getUTCDay()];
    if (!hours || !SERVICES[serviceId]) return [];
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = hours[0]; minute + SERVICES[serviceId].duration <= hours[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const taken = (seed + minute / 30) % 7 === 2;
      slots.push({ minute, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris' : 'disponible' });
    }
    return slots;
  }
  function updateSummary() {
    const service = SERVICES[state.service];
    $('#summary-service').textContent = service ? `${service.name} · ${service.duration}\u00a0min*` : 'À choisir';
    $('#summary-day').textContent = state.day ? longDay.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    $('#summary-price').textContent = service ? `Dès ${service.price}\u00a0€*` : '—';
    $('#summary-name').textContent = $('#first-name').value.trim() || 'vous';
    const completeTo = state.time !== null ? 3 : state.day ? 2 : state.service ? 1 : 0;
    steps.forEach((button, i) => {
      button.disabled = state.step === 4 || i > completeTo;
      if (i === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
    if (service && state.day && state.time !== null) {
      $('#final-recap').replaceChildren(recap());
    }
  }
  function recap() {
    const fragment = document.createDocumentFragment();
    const s = SERVICES[state.service];
    const title = document.createElement('strong');
    title.textContent = s.name;
    const details = document.createElement('p');
    details.textContent = `${longDay.format(dateFromKey(state.day))} à ${timeText(state.time)} · ${s.duration}\u00a0min · dès ${s.price}\u00a0€`;
    const note = document.createElement('p');
    note.className = 'small';
    note.textContent = 'Prix de départ et durée indicatifs, à confirmer. 92, rue de Turenne, 75003 Paris. Heure de Paris.';
    fragment.append(title, details, note);
    return fragment;
  }
  let transitionId = 0;
  function showStep(index, focus = true) {
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    state.step = index;
    panels.forEach((panel, i) => { panel.hidden = i !== index; panel.classList.remove('is-entering'); });
    const panel = panels[index];
    const keyboard = document.documentElement.classList.contains('keyboard');
    const token = ++transitionId;
    if (!reduce.matches && !keyboard) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => { if (token === transitionId) panel.classList.remove('is-entering'); }));
    }
    updateSummary();
    if (focus) $('h3', panel).focus({ preventScroll: false });
    $('#booking-live').textContent = index === 4 ? 'Simulation terminée. Rien n’a été envoyé.' : `Étape ${index + 1} sur 4. ${$('h3', panel).textContent}`;
  }
  function makeRadio(name, value, className, disabled, checked, content) {
    const label = document.createElement('label'); label.className = className;
    const input = document.createElement('input'); input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled; input.checked = checked;
    const span = document.createElement('span'); span.innerHTML = content;
    label.append(input, span); return label;
  }
  function renderDays() {
    const now = parisNow();
    const start = dateFromKey(now.key);
    if (state.day && state.day < now.key) { state.day = null; state.time = null; }
    $('#days').replaceChildren();
    for (let i = 0; i < 14; i++) {
      const day = new Date(start); day.setUTCDate(day.getUTCDate() + i);
      const key = day.toISOString().slice(0, 10), closed = !HOURS[day.getUTCDay()];
      const status = closed ? 'fermé' : holiday(key) ? 'férié · à confirmer' : i === 0 ? 'aujourd’hui' : month.format(day);
      const label = makeRadio('day', key, 'day-choice', closed, state.day === key, `${shortDay.format(day)}<b>${day.getUTCDate()}</b><small>${status}</small>`);
      $('input', label).setAttribute('aria-label', `${longDay.format(day)}, ${status}`);
      $('#days').append(label);
    }
  }
  function renderSlots() {
    $('#slots').replaceChildren();
    const slots = slotList(state.day, state.service);
    if (!slots.some(s => s.minute === state.time && !s.disabled)) state.time = null;
    for (const slot of slots) {
      const label = makeRadio('time', String(slot.minute), 'slot-choice', slot.disabled, state.time === slot.minute, `<b>${timeText(slot.minute)}</b><small>${slot.reason}</small>`);
      $('#slots').append(label);
    }
    $('#slots-empty').hidden = slots.some(s => !s.disabled);
    updateSummary();
  }
  function selectService(id) {
    if (state.service !== id) state.time = null;
    state.service = id;
    $$('input[name="service"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
  }
  $$('input[name="service"]').forEach(input => input.addEventListener('change', () => selectService(input.value)));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    if (state.step === 4) reset(false);
    selectService(button.dataset.service); showStep(1);
    $('#reserver').scrollIntoView({ behavior: reduce.matches || document.documentElement.classList.contains('keyboard') ? 'instant' : 'smooth', block: 'start' });
  }));
  $('#days').addEventListener('change', event => { if (event.target.name === 'day') { state.day = event.target.value; state.time = null; updateSummary(); } });
  $('#slots').addEventListener('change', event => { if (event.target.name === 'time') { state.time = Number(event.target.value); updateSummary(); } });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  steps.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $('#first-name').addEventListener('input', updateSummary);
  function validate() {
    const name = $('#first-name'), phone = $('#phone');
    const nameValid = /\p{L}/u.test(name.value.trim());
    const mobile = phone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0|(?:\+|00)33)[67]\d{8}$/.test(mobile);
    $('#name-error').textContent = nameValid ? '' : 'Saisissez un prénom, même fictif.';
    $('#phone-error').textContent = phoneValid ? '' : 'Indiquez un mobile français commençant par 06, 07 ou +33 6 / 7.';
    name.setAttribute('aria-invalid', String(!nameValid)); phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      (nameValid ? phone : name).focus();
      $('#booking-live').textContent = 'Vérifiez les champs signalés. Rien n’a été envoyé.';
      return false;
    }
    return true;
  }
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!validate()) return;
    const valid = state.day && slotList(state.day, state.service).some(s => s.minute === state.time && !s.disabled);
    if (!valid) { showStep(2); $('#booking-live').textContent = 'Cette heure n’est plus disponible dans la simulation. Choisissez une autre heure.'; return; }
    $('#success-name').textContent = $('#first-name').value.trim();
    $('#success-recap').replaceChildren(recap());
    showStep(4);
  });
  function reset(focus = true) {
    Object.assign(state, { service: null, day: null, time: null, step: 0 });
    $('#booking-form').reset();
    $$('input[name="service"]').forEach(input => { input.checked = false; });
    ['name-error', 'phone-error'].forEach(id => { $(`#${id}`).textContent = ''; });
    ['first-name', 'phone'].forEach(id => { $(`#${id}`).removeAttribute('aria-invalid'); });
    showStep(0, focus);
  }
  $('#restart').addEventListener('click', () => reset());
  document.addEventListener('keydown', event => { if (['Tab', 'Enter', ' '].includes(event.key)) document.documentElement.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard'), { passive: true });
  const today = dateFromKey(parisNow().key).getUTCDay();
  $$('[data-weekday]').forEach(row => row.classList.toggle('is-today', Number(row.dataset.weekday) === today));
  if ('IntersectionObserver' in window) {
    const rows = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-seen'); rows.unobserve(entry.target); } }), { threshold: .15 });
    $$('.service-row').forEach(row => rows.observe(row));
    const visible = new Set();
    const bar = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)); $('.mobile-bar').classList.toggle('is-hidden', visible.size > 0); }, { threshold: 0 });
    [$('#reserver'), $('footer')].forEach(el => bar.observe(el));
  }
  updateSummary();
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));
})();
