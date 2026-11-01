/* Le Peigne Fin. Local demonstration only: no requests, storage, analytics or submission. */
(() => {
  'use strict';
  const $ = (s, node = document) => node.querySelector(s);
  const $$ = (s, node = document) => Array.from(node.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    coupe: { name: 'Coupe homme', duration: 30, price: 22 },
    barbe: { name: 'Taille de barbe', duration: 20, price: 14 },
    duo: { name: 'Coupe & barbe', duration: 45, price: 32 }
  };
  // Public hours: iCoiffeur/Fresha, 01/11/2026. To confirm with the shop.
  const hours = [null, [600, 1080], [540, 1140], [540, 1140], [570, 1140], [540, 1140], [540, 1050]];
  const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const parisFormat = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const state = { service: null, day: null, time: null, step: 0, completed: false };
  let dayList = [];
  let keyboard = false;
  let transitionFrame;
  const money = n => `${n}\u00a0€`;
  const timeLabel = n => `${Math.floor(n / 60)}\u00a0h${n % 60 ? '\u00a0' + String(n % 60).padStart(2, '0') : ''}`;
  const dateKey = date => date.toISOString().slice(0, 10);
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).map(p => [p.type, p.value]));
    const date = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
    return { date, key: dateKey(date), minute: +parts.hour * 60 + +parts.minute };
  }
  function isHoliday(date) {
    const key = dateKey(date).slice(5);
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25', '12-26'].includes(key)) return true;
    const y = date.getUTCFullYear();
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const easter = new Date(Date.UTC(y, month - 1, (h + l - 7 * m + 114) % 31 + 1));
    return [-2, 1, 39, 50].some(offset => dateKey(new Date(+easter + offset * 86400000)) === dateKey(date));
  }
  function slotsFor(day, serviceId, now = parisNow()) {
    const range = hours[day.getUTCDay()];
    if (!range || !services[serviceId]) return [];
    const duration = services[serviceId].duration;
    const seed = Math.floor(+day / 86400000);
    const results = [];
    for (let minute = range[0]; minute + duration <= range[1]; minute += 15) {
      const past = dateKey(day) < now.key || (dateKey(day) === now.key && minute <= now.minute);
      const busy = (seed + Math.floor(minute / 15) * 7) % 11 < 3;
      results.push({ minute, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : '' });
    }
    return results;
  }
  function status() {
    const now = parisNow();
    const weekday = now.date.getUTCDay(), range = hours[weekday];
    let label;
    if (isHoliday(now.date)) label = 'Jour férié · ouverture à confirmer';
    else if (!range) label = 'Dimanche · fermé selon les horaires publics';
    else if (now.minute >= range[0] && now.minute < range[1]) label = `Ouvert jusqu’à ${timeLabel(range[1])} · à confirmer`;
    else label = `Aujourd’hui ${timeLabel(range[0])}–${timeLabel(range[1])} · actuellement fermé, à confirmer`;
    $$('[data-open]').forEach(el => { el.textContent = label; });
    $$('[data-weekday]').forEach(row => {
      row.classList.toggle('today', +row.dataset.weekday === weekday);
      if (+row.dataset.weekday === weekday) row.setAttribute('aria-label', `${weekdays[weekday]}, aujourd’hui`);
      else row.removeAttribute('aria-label');
    });
  }
  function renderDays() {
    const today = parisNow().date;
    dayList = Array.from({ length: 14 }, (_, i) => new Date(+today + i * 86400000));
    $('#days').innerHTML = dayList.map((date, i) => {
      const closed = !hours[date.getUTCDay()];
      const holiday = isHoliday(date);
      const selected = state.day && dateKey(state.day) === dateKey(date);
      return `<label class="choice"><input type="radio" name="day" value="${i}" ${closed ? 'disabled' : ''} ${selected ? 'checked' : ''} aria-label="${dateFormat.format(date)}${closed ? ', fermé' : holiday ? ', férié, ouverture à confirmer' : ''}"><span>${weekdays[date.getUTCDay()].slice(0, 3)}.</span><b>${date.getUTCDate()}</b><span>${shortMonth.format(date)}</span>${closed ? '<small>Fermé</small>' : holiday ? '<small>Férié<br>à confirmer</small>' : ''}</label>`;
    }).join('');
  }
  function renderSlots() {
    if (!state.day || !state.service) return;
    $('#slot-context').textContent = `${dateFormat.format(state.day)} · ${services[state.service].duration}\u00a0min${isHoliday(state.day) ? ' · jour férié, ouverture à confirmer' : ''}`;
    const slots = slotsFor(state.day, state.service);
    if (state.time !== null && !slots.some(s => s.minute === state.time && !s.disabled)) state.time = null;
    $('#slots').innerHTML = slots.map(slot => `<label class="choice slot"><input type="radio" name="time" value="${slot.minute}" ${slot.disabled ? 'disabled' : ''} ${state.time === slot.minute ? 'checked' : ''} aria-label="${timeLabel(slot.minute)}${slot.reason ? ', ' + slot.reason : ''}"><span class="slot-time">${timeLabel(slot.minute)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label>`).join('');
    $('#no-slots').hidden = slots.some(slot => !slot.disabled);
  }
  function summaryText() {
    const s = services[state.service];
    if (!s || !state.day || state.time === null) return '';
    return `${s.name} · ${dateFormat.format(state.day)} à ${timeLabel(state.time)} · ${s.duration}\u00a0min · ${money(s.price)} (tarif indicatif).`;
  }
  function update() {
    const s = services[state.service];
    $('#summary-service').textContent = s ? `${s.name} · ${s.duration}\u00a0min` : 'À choisir';
    $('#summary-day').textContent = state.day ? dateFormat.format(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#summary-price').textContent = s ? money(s.price) : '—';
    $('[data-next="1"]').disabled = !s;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
    $$('[data-step]').forEach(button => {
      const step = +button.dataset.step;
      button.disabled = state.completed || (step === 1 && !s) || (step === 2 && !state.day) || (step === 3 && state.time === null);
      if (step === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#final-recap').textContent = summaryText();
    $('#mobile-summary').textContent = s ? [s.name, money(s.price) + ' indicatifs', state.day ? dateFormat.format(state.day) : 'jour à choisir', state.time !== null ? timeLabel(state.time) : ''].filter(Boolean).join(' · ') : 'Prestation à choisir';
  }
  function showStep(step, focus = true) {
    if (step > 0 && !state.service) step = 0;
    if (step > 1 && !state.day) step = 1;
    if (step > 2 && state.time === null) step = 2;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    cancelAnimationFrame(transitionFrame);
    $$('.step-panel').forEach(panel => {
      const active = +panel.dataset.panel === step;
      panel.hidden = !active;
      panel.classList.remove('entering');
      if (active && focus && !keyboard && !reduce.matches) {
        panel.classList.add('entering');
        transitionFrame = requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
      }
    });
    update();
    $('#booking-live').textContent = `Étape ${step + 1} sur 4. ${$(`#step-title-${step}`).textContent}`;
    if (focus) {
      const heading = $(`#step-title-${step}`);
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function selectService(id) {
    if (!services[id]) return;
    state.service = id; state.day = null; state.time = null;
    $(`input[name="service"][value="${id}"]`).checked = true;
    update();
  }
  function reset(focus = true) {
    Object.assign(state, { service: null, day: null, time: null, step: 0, completed: false });
    $('#booking-form').reset();
    $('#booking-form').hidden = false;
    $('#success').hidden = true;
    ['name', 'phone'].forEach(id => { $(`#${id}-error`).hidden = true; });
    $$('.field input').forEach(input => input.removeAttribute('aria-invalid'));
    showStep(0, focus);
  }
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-input'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-input'); }, { passive: true });
  document.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') selectService(input.value);
    if (input.name === 'day') { state.day = dayList[+input.value]; state.time = null; update(); }
    if (input.name === 'time') { state.time = +input.value; update(); }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.next)));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.step)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.back)));
  $$('[data-pick]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (state.completed) reset(false);
    selectService(link.dataset.pick);
    showStep(1);
  }));
  $$('.field input').forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(input.id === 'first-name' ? '#name-error' : '#phone-error').hidden = true;
  }));
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const name = $('#first-name').value.trim();
    let phone = $('#phone').value.replace(/[\s.()\-]/g, '');
    phone = phone.replace(/^0033/, '+33').replace(/^\+33/, '0');
    const nameOK = name.length >= 2 && /\p{L}/u.test(name);
    const phoneOK = /^0[67]\d{8}$/.test(phone);
    $('#name-error').hidden = nameOK;
    $('#phone-error').hidden = phoneOK;
    $('#first-name').setAttribute('aria-invalid', String(!nameOK));
    $('#phone').setAttribute('aria-invalid', String(!phoneOK));
    if (!nameOK || !phoneOK) {
      $('#booking-live').textContent = 'Vérifiez les champs signalés.';
      $(nameOK ? '#phone' : '#first-name').focus();
      return;
    }
    // Recheck at confirmation, including a tab left open past the chosen time.
    if (!state.day || !slotsFor(state.day, state.service).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null; showStep(2);
      $('#booking-live').textContent = 'Ce créneau n’est plus proposé. Choisissez une autre heure ou un autre jour.';
      return;
    }
    state.completed = true;
    $('#success-recap').textContent = `${name}, voici votre essai\u00a0: ${summaryText()}`;
    $('#booking-form').hidden = true;
    $('#success').hidden = false;
    $('#first-name').value = ''; $('#phone').value = '';
    update();
    $('#booking-live').textContent = 'Simulation terminée. Aucun rendez-vous réservé. Aucune donnée envoyée.';
    $('#success-title').focus({ preventScroll: true });
    $('#success-title').scrollIntoView({ block: 'start', behavior: 'instant' });
  });
  $('#restart').addEventListener('click', () => reset());
  $('#booking-app').hidden = false;
  renderDays(); showStep(0, false); status();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    status();
    if (!state.completed && state.day && dateKey(state.day) < parisNow().key) {
      state.day = null; state.time = null;
      showStep(state.service ? 1 : 0, false);
    } else if (state.step === 1) renderDays();
    else if (state.step === 2) { renderSlots(); update(); }
  });
  // No content is hidden before its observer has been installed.
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    const objects = $$('.comb-object, [data-reveal]');
    objects.forEach((el, i) => { el.classList.add('waiting'); if (el.hasAttribute('data-reveal')) el.style.transitionDelay = `${(i % 3) * 60}ms`; observer.observe(el); });
    root.classList.add('js');
    reduce.addEventListener('change', event => {
      if (event.matches) { objects.forEach(el => el.classList.remove('waiting')); observer.disconnect(); }
    });
  }
})();
