/* Carnet local de démonstration. Aucun réseau, aucune persistance. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const HOURS = { 0: null, 1: [540, 1140], 2: [540, 1140], 3: [540, 810], 4: [540, 1140], 5: [540, 1140], 6: null };
  const serviceRows = $$('.menu-row');
  const services = Object.fromEntries(serviceRows.map(row => [row.dataset.service, {
    id: row.dataset.service,
    name: $('h3', row).textContent.trim(),
    minutes: Number(row.dataset.minutes),
    care: row.dataset.service === 'zone' ? 15 : ['bonne-mine', 'gommage'].includes(row.dataset.service) ? 45 : 60,
    price: Number(row.dataset.price)
  }]));
  const state = { service: 'signature', day: null, time: null, step: 0, reached: 0 };
  let keyboardInput = false;
  let switchTimer;
  let frameId;
  const parisFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const dateObject = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const minutesText = value => value < 60 ? `${value}${NB}min` : `${Math.floor(value / 60)}${NB}h${value % 60 ? `${NB}${String(value % 60).padStart(2, '0')}` : ''}`;
  const timeText = value => `${Math.floor(value / 60)}${NB}h${value % 60 ? `${NB}${String(value % 60).padStart(2, '0')}` : ''}`;

  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(now).map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function holiday(key) {
    const year = Number(key.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
    const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = Date.UTC(year, easterMonth - 1, easterDay, 12);
    const moving = [1, 39, 50].map(offset => dateKey(new Date(easter + offset * 86400000)));
    return ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5)) || moving.includes(key);
  }
  function slotsFor(key, serviceId, now = parisNow()) {
    const hours = HOURS[dateObject(key).getUTCDay()];
    if (!hours || !services[serviceId]) return [];
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let time = hours[0]; time + services[serviceId].minutes <= hours[1]; time += 15) {
      const past = key < now.key || (key === now.key && time <= now.minutes);
      const busy = ((seed + time / 15 * 7) % 11) < 3;
      slots.push({ time, past, busy, disabled: past || busy });
    }
    return slots;
  }
  function available(key, time) {
    return slotsFor(key, state.service).some(slot => slot.time === time && !slot.disabled);
  }
  function announce(message) { $('#booking-announcement').textContent = message; }
  function clearError(id) { $(id).textContent = ''; }
  function updateSummary() {
    const service = services[state.service];
    $('#summary-service').textContent = service.name;
    $('#summary-care').textContent = `${service.care}${NB}min`;
    $('#summary-duration').textContent = minutesText(service.minutes);
    $('#summary-price').textContent = `${service.price}${NB}€`;
    $('#summary-day').textContent = state.day ? longDay.format(dateObject(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    $('.summary-rule span').style.transform = `scaleX(${Math.min(1, (state.step + 1) / 4)})`;
    $('#confirmation-recap').textContent = state.day && state.time !== null ? `${service.name} — ${longDay.format(dateObject(state.day))}, à ${timeText(state.time)}. Rendez-vous de ${minutesText(service.minutes)}, dont ${service.care}${NB}min de soin. ${service.price}${NB}€, tarif relevé sur Planity. Simulation uniquement.` : '';
    $$('[data-goto]', $('.booking-steps')).forEach(button => {
      const step = Number(button.dataset.goto);
      button.disabled = state.step === 4 || step > state.reached;
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function makeRadio(name, value, disabled = false) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    return input;
  }
  function renderDays() {
    const fieldset = $('#day-choices');
    $$('label', fieldset).forEach(label => label.remove());
    const today = parisNow();
    for (let offset = 0; offset < 14; offset++) {
      const date = dateObject(today.key);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = dateKey(date);
      const closed = !HOURS[date.getUTCDay()];
      const hasSlot = slotsFor(key, state.service, today).some(slot => !slot.disabled);
      const label = document.createElement('label'); label.className = 'day-option';
      const input = makeRadio('day', key, closed || !hasSlot);
      input.checked = state.day === key;
      input.setAttribute('aria-describedby', 'day-error');
      const isHoliday = holiday(key);
      const dayState = closed ? 'Fermé' : !hasSlot ? 'Indisponible' : isHoliday ? 'Férié · à confirmer' : 'Exemple';
      input.setAttribute('aria-label', `${longDay.format(date)}, ${dayState}`);
      const face = document.createElement('span'); face.className = 'day-face'; face.setAttribute('aria-hidden', 'true');
      const weekday = document.createElement('span'); weekday.textContent = offset === 0 ? 'Auj.' : shortWeekday.format(date);
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.textContent = shortMonth.format(date);
      const status = document.createElement('span'); status.className = 'day-state'; status.textContent = dayState;
      face.append(weekday, number, month, status); label.append(input, face); fieldset.append(label);
    }
  }
  function renderSlots() {
    const fieldset = $('#slot-choices');
    $$('label, .empty-slots', fieldset).forEach(node => node.remove());
    if (!state.day) return;
    const service = services[state.service];
    const hours = HOURS[dateObject(state.day).getUTCDay()];
    $('#slot-context').textContent = `${longDay.format(dateObject(state.day))} · ${hours ? `${timeText(hours[0])}–${timeText(hours[1])}` : 'Fermé'}. Créneau de ${minutesText(service.minutes)}${holiday(state.day) ? ' · Férié : ouverture à confirmer.' : '.'}`;
    const slots = slotsFor(state.day, state.service);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = makeRadio('time', String(slot.time), slot.disabled);
      input.checked = state.time === slot.time;
      input.setAttribute('aria-describedby', 'time-error');
      const statusText = slot.past ? 'Passé' : slot.busy ? 'Déjà pris' : '';
      input.setAttribute('aria-label', `${timeText(slot.time)}${statusText ? `, ${statusText.toLowerCase()}` : ', disponible dans la simulation'}`);
      const face = document.createElement('span'); face.className = 'slot-face'; face.setAttribute('aria-hidden', 'true');
      const time = document.createElement('span'); time.textContent = timeText(slot.time); face.append(time);
      if (statusText) { const status = document.createElement('small'); status.textContent = statusText; face.append(status); }
      label.append(input, face); fieldset.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const notice = document.createElement('p'); notice.className = 'empty-slots small';
      notice.textContent = 'Plus de créneau d’exemple disponible ce jour. Revenez au choix du jour.'; fieldset.append(notice);
    }
  }
  function showStep(next, focus = true) {
    clearTimeout(switchTimer); cancelAnimationFrame(frameId);
    const old = $(`[data-step='${state.step}']`);
    const target = $(`[data-step='${next}']`);
    const animate = !reduceMotion.matches && !keyboardInput && next !== state.step;
    const leave = animate && old && !old.hidden;
    $$('.booking-step').forEach(step => {
      step.hidden = step !== target && !(leave && step === old);
      step.classList.remove('is-leaving', 'is-entering');
      step.inert = step !== target;
    });
    if (leave) old.classList.add('is-leaving');
    if (animate) {
      target.classList.add('is-entering');
      frameId = requestAnimationFrame(() => { frameId = requestAnimationFrame(() => target.classList.remove('is-entering')); });
      switchTimer = setTimeout(() => {
        if (old !== target) { old.hidden = true; old.classList.remove('is-leaving'); }
      }, 280);
    }
    state.step = next; state.reached = Math.max(state.reached, Math.min(next, 3));
    updateSummary();
    announce(next === 4 ? 'Essai terminé. Aucun rendez-vous pris, rien envoyé à l’institut.' : `Étape ${next + 1} sur 4. ${$('h3', target).textContent}`);
    if (focus) {
      const title = $('h3', target); title.focus({ preventScroll: true });
      const rect = title.getBoundingClientRect();
      if (rect.top < 18 || rect.bottom > innerHeight - 90) title.scrollIntoView({ block: 'start', behavior: animate ? 'smooth' : 'instant' });
    }
  }
  function chooseService(id) {
    if (!services[id]) return;
    if (state.service !== id || state.step === 4) {
      state.service = id; state.day = null; state.time = null; state.reached = 0;
      $('#booking-form').reset();
      $$('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
      $$('.field-error').forEach(error => { error.textContent = ''; });
    }
    const input = $(`input[name='service'][value='${id}']`); input.checked = true;
    updateSummary();
  }
  function validateName() {
    const input = $('#first-name');
    const valid = input.value.trim().length > 0;
    input.setAttribute('aria-invalid', String(!valid));
    $('#name-error').textContent = valid ? '' : 'Indiquez un prénom pour continuer.';
    return valid;
  }
  function validatePhone() {
    const input = $('#phone');
    const compact = input.value.replace(/[\s.()\-]/g, '');
    const valid = /^(?:0|\+33|0033)[67]\d{8}$/.test(compact);
    input.setAttribute('aria-invalid', String(!valid));
    $('#phone-error').textContent = valid ? '' : 'Indiquez un mobile français valide (06, 07 ou +33).';
    return valid;
  }
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      keyboardInput = true; root.classList.add('keyboard-input');
    }
  });
  document.addEventListener('pointerdown', () => { keyboardInput = false; root.classList.remove('keyboard-input'); }, { passive: true });
  $$('[data-book]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    chooseService(link.dataset.book); showStep(0);
  }));
  $('.service-choices').addEventListener('change', event => {
    if (event.target.name === 'service') chooseService(event.target.value);
  });
  $('#day-choices').addEventListener('change', event => {
    if (event.target.name !== 'day') return;
    state.day = event.target.value; state.time = null; state.reached = 1;
    clearError('#day-error'); clearError('#time-error'); updateSummary();
  });
  $('#slot-choices').addEventListener('change', event => {
    if (event.target.name !== 'time') return;
    state.time = Number(event.target.value); clearError('#time-error'); updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1) renderDays();
    if (next === 2) {
      const today = parisNow();
      const valid = state.day && state.day >= today.key && HOURS[dateObject(state.day).getUTCDay()] && slotsFor(state.day, state.service).some(slot => !slot.disabled);
      if (!valid) { $('#day-error').textContent = 'Choisissez un jour ouvert avec un créneau disponible.'; $('input[name="day"]:not(:disabled)')?.focus(); return; }
      renderSlots();
    }
    if (next === 3 && (state.time === null || !available(state.day, state.time))) {
      state.time = null; renderSlots(); updateSummary(); $('#time-error').textContent = 'Choisissez une heure disponible.'; $('input[name="time"]:not(:disabled)')?.focus(); return;
    }
    showStep(next);
  }));
  $$('[data-goto]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.goto);
    if (state.step === 4 || next > state.reached) return;
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    showStep(next);
  }));
  $('#first-name').addEventListener('input', () => { if ($('#first-name').hasAttribute('aria-invalid')) validateName(); });
  $('#phone').addEventListener('input', () => { if ($('#phone').hasAttribute('aria-invalid')) validatePhone(); });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const nameOK = validateName(); const phoneOK = validatePhone();
    if (!nameOK || !phoneOK) { announce('Vérifiez les champs indiqués.'); $(nameOK ? '#phone' : '#first-name').focus(); return; }
    if (!state.day || state.time === null || !available(state.day, state.time)) {
      state.time = null; renderDays(); state.reached = 1; showStep(1);
      $('#day-error').textContent = 'Ce créneau est maintenant passé. Choisissez un nouveau jour.'; return;
    }
    const service = services[state.service];
    $('#success-greeting').textContent = `${$('#first-name').value.trim()}, voici votre choix d’essai : ${service.name}, ${longDay.format(dateObject(state.day))} à ${timeText(state.time)}, ${minutesText(service.minutes)} de rendez-vous, ${service.price}${NB}€ relevés sur Planity.`;
    showStep(4);
  });
  $('#restart-booking').addEventListener('click', () => {
    state.step = 4; chooseService('signature'); state.reached = 0; showStep(0);
  });
  $('#calendar-download').addEventListener('click', () => {
    if (!state.day || state.time === null) return;
    const service = services[state.service];
    const localStamp = value => `${state.day.replaceAll('-', '')}T${String(Math.floor(value / 60)).padStart(2, '0')}${String(value % 60).padStart(2, '0')}00`;
    const utcStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Carnet essai Sarah//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:Europe/Paris', 'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT', `UID:essai-${state.day}-${state.time}@studiolamy.local`, `DTSTAMP:${utcStamp}`, `DTSTART;TZID=Europe/Paris:${localStamp(state.time)}`, `DTEND;TZID=Europe/Paris:${localStamp(state.time + service.minutes)}`, `SUMMARY:SIMULATION - ${service.name}`, 'DESCRIPTION:Aucun rendez-vous pris. Rien envoye a l institut.', 'STATUS:TENTATIVE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'simulation-institut-de-sarah.ics'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('Rappel d’essai téléchargé. Il ne constitue pas un rendez-vous.');
  });

  // Le statut indique les horaires publiés, sans présumer des ouvertures fériées.
  function updateHours() {
    const now = parisNow(); const weekday = dateObject(now.key).getUTCDay(); const hours = HOURS[weekday];
    const status = holiday(now.key) ? 'Jour férié : ouverture à confirmer auprès de Sarah.' : !hours ? 'Fermé aujourd’hui selon les horaires publiés.' : now.minutes < hours[0] ? `Ouverture à ${timeText(hours[0])} selon les horaires publiés.` : now.minutes >= hours[1] ? 'Fermé pour aujourd’hui selon les horaires publiés.' : `Selon les horaires publiés, ouvert jusqu’à ${timeText(hours[1])}.`;
    $('[data-open-status]').textContent = status;
    $$('[data-weekday]').forEach(row => row.classList.toggle('is-today', Number(row.dataset.weekday) === weekday));
  }
  updateHours();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateHours(); });
  $('#booking-app').hidden = false;
  updateSummary();
  if ('IntersectionObserver' in window) {
    root.classList.add('js');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .08 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    requestAnimationFrame(() => requestAnimationFrame(() => $('.hero').classList.add('is-ready')));
  }
})();
