(() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const Paris = 'Europe/Paris';
  const hero = $('.hero');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('is-entered')));

  const revealItems = $$('.reveal, .reveal-item, .address-visual');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const menuButton = $('.menu-toggle');
  const nav = $('#site-nav');
  function closeMenu(returnFocus = false) {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
    if (!open) $( 'a', nav)?.focus();
  });
  nav?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  const booking = $('#booking-ui');
  if (!booking) return;
  const state = { service: null, day: null, time: null, step: 1, furthest: 1 };
  const serviceInputs = $$('input[name="service"]', booking);
  const panels = $$('[data-step-panel]', booking);
  const stepButtons = $$('[data-goto-step]', booking);
  const dayGrid = $('#day-grid');
  const slotGrid = $('#slot-grid');
  const live = $('#booking-live');
  const form = $('#booking-form');
  let stepTransitionTimer = 0;
  let stepEnterFrame = 0;

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: Paris, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }
  function todayISO() {
    const parts = parisParts();
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function dateFromISO(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function formatDate(iso, options = {}) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(dateFromISO(iso));
  }
  function selectedService() {
    const input = serviceInputs.find((candidate) => candidate.checked);
    if (!input) return null;
    return {
      id: input.value,
      name: input.dataset.name,
      duration: Number(input.dataset.duration),
      price: Number(input.dataset.price)
    };
  }
  function durationLabel(minutes) {
    if (minutes < 60) return `${minutes}\u00a0min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}\u00a0h ${String(rest).padStart(2, '0')}` : `${hours}\u00a0h`;
  }
  function updateSummary() {
    const service = selectedService();
    $('#summary-service').textContent = service ? `${service.name} · exemple` : 'À choisir';
    $('#summary-duration').textContent = service ? `${durationLabel(service.duration)} · ${service.price}\u00a0€` : 'À choisir';
    $('#summary-day').textContent = state.day ? formatDate(state.day, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    $('#summary-time').textContent = state.time || 'À choisir';
  }
  function say(message) {
    if (live) live.textContent = message;
  }

  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function addUtcDays(date, amount) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + amount);
    return next;
  }
  function isoOf(date) {
    return date.toISOString().slice(0, 10);
  }
  function frenchHoliday(iso) {
    const date = dateFromISO(iso);
    const year = date.getUTCFullYear();
    const fixed = new Set([
      `${year}-01-01`, `${year}-05-01`, `${year}-05-08`, `${year}-07-14`,
      `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`
    ]);
    const easter = easterSunday(year);
    const movable = new Set([
      isoOf(addUtcDays(easter, 1)),
      isoOf(addUtcDays(easter, 39)),
      isoOf(addUtcDays(easter, 50))
    ]);
    return fixed.has(iso) || movable.has(iso);
  }
  function parisOpenMinutes(weekday) {
    if (weekday === 0) return null;
    return weekday === 1 ? { open: 10 * 60, close: 20 * 60 } : { open: 10 * 60, close: 21 * 60 };
  }
  function renderDays() {
    const start = dateFromISO(todayISO());
    const dayLabels = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
    const today = todayISO();
    dayGrid.innerHTML = '';
    for (let offset = 0; offset < 12; offset += 1) {
      const date = addUtcDays(start, offset);
      const iso = isoOf(date);
      const weekday = date.getUTCDay();
      const closed = weekday === 0;
      const holiday = frenchHoliday(iso);
      const id = `booking-day-${offset}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-day';
      input.id = id;
      input.value = iso;
      input.disabled = closed;
      input.checked = state.day === iso;
      const label = document.createElement('label');
      label.htmlFor = id;
      const weekdayLabel = document.createElement('span');
      weekdayLabel.textContent = dayLabels.format(date).replace('.', '');
      const numberLabel = document.createElement('span');
      numberLabel.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
      const monthLabel = document.createElement('small');
      monthLabel.textContent = closed ? 'fermé' : (holiday ? 'férié · à confirmer' : formatDate(iso, { month: 'short' }).replace('.', ''));
      label.append(weekdayLabel, numberLabel, monthLabel);
      wrapper.append(input, label);
      dayGrid.append(wrapper);
      input.addEventListener('change', () => {
        state.day = input.value;
        state.time = null;
        state.furthest = Math.min(state.furthest, 2);
        renderSlots();
        updateSummary();
        const holidayNote = frenchHoliday(state.day) ? ' Jour férié, ouverture à confirmer.' : '';
        $('#slot-day-label').textContent = `Horaires de répertoire, à confirmer.${holidayNote} Les créneaux sont des exemples.`;
        $('#day-error').hidden = true;
        say(`Jour choisi : ${formatDate(state.day, { weekday: 'long', day: 'numeric', month: 'long' })}.`);
      });
    }
    if (!state.day && parisOpenMinutes(dateFromISO(today).getUTCDay())) {
      const todayInput = $('input[value="' + today + '"]', dayGrid);
      if (todayInput) todayInput.disabled = false;
    }
  }
  function hashSlot(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function renderSlots() {
    slotGrid.innerHTML = '';
    if (!state.day) {
      slotGrid.textContent = 'Choisissez d’abord un jour.';
      updateSummary();
      return;
    }
    const date = dateFromISO(state.day);
    const opening = parisOpenMinutes(date.getUTCDay());
    const service = selectedService();
    if (!opening || !service) return;
    const current = parisParts();
    const currentISO = `${current.year}-${current.month}-${current.day}`;
    const currentMinutes = Number(current.hour) * 60 + Number(current.minute);
    const lastStart = opening.close - service.duration;
    for (let minutes = opening.open; minutes <= lastStart; minutes += 30) {
      const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
      const minute = String(minutes % 60).padStart(2, '0');
      const time = `${hour}:${minute}`;
      const unavailable = hashSlot(`${state.day}-${time}`) % 6 === 1;
      const past = state.day === currentISO && minutes <= currentMinutes;
      const id = `booking-time-${time.replace(':', '')}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-time';
      input.id = id;
      input.value = time;
      input.disabled = unavailable || past;
      input.checked = state.time === time;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = unavailable ? `${time} · déjà pris` : (past ? `${time} · passé` : time);
      wrapper.append(input, label);
      slotGrid.append(wrapper);
      input.addEventListener('change', () => {
        state.time = input.value;
        $('#slot-error').hidden = true;
        updateSummary();
        say(`Heure choisie : ${input.value}.`);
      });
    }
  }

  function setStep(step, announce = true) {
    const target = panels.find((panel) => Number(panel.dataset.stepPanel) === step);
    if (!target) return;
    window.clearTimeout(stepTransitionTimer);
    cancelAnimationFrame(stepEnterFrame);
    const current = panels.find((panel) => !panel.hidden && panel !== target);
    state.step = step;
    stepButtons.forEach((button) => {
      const number = Number(button.dataset.gotoStep);
      button.disabled = number > state.furthest;
      if (number === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (step === 3) renderSlots();
    if (step === 4) updateFormRecap();
    const showTarget = () => {
      if (current) {
        current.hidden = true;
        current.classList.remove('is-active', 'is-leaving');
      }
      target.hidden = false;
      target.classList.remove('is-active');
      stepEnterFrame = requestAnimationFrame(() => {
        target.classList.add('is-active');
        $(`#step-title-${step}`)?.focus({ preventScroll: true });
        if (announce) say(`Étape ${step} sur 4 : ${$(`#step-title-${step}`)?.textContent.replace(/^0[1-4] · /, '') || ''}.`);
      });
    };
    if (current && !reducedMotion.matches) {
      current.classList.remove('is-active');
      current.classList.add('is-leaving');
      stepTransitionTimer = window.setTimeout(showTarget, 220);
    } else {
      showTarget();
    }
  }
  function advance() {
    const step = state.step;
    if (step === 1 && !selectedService()) {
      $('#service-error').hidden = false;
      return;
    }
    if (step === 2 && !state.day) {
      $('#day-error').hidden = false;
      return;
    }
    if (step === 3 && !state.time) {
      $('#slot-error').hidden = false;
      return;
    }
    $('#service-error').hidden = true;
    $('#day-error').hidden = true;
    $('#slot-error').hidden = true;
    state.furthest = Math.max(state.furthest, step + 1);
    setStep(Math.min(4, step + 1));
  }
  function updateFormRecap() {
    const service = selectedService();
    const recap = $('#form-recap');
    recap.replaceChildren();
    const lines = [
      service ? `${service.name} · ${durationLabel(service.duration)} · ${service.price}\u00a0€ (exemple)` : 'Prestation à choisir',
      state.day ? formatDate(state.day, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Jour à choisir',
      state.time || 'Heure à choisir'
    ];
    lines.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      recap.append(p);
    });
  }
  function validMobile(raw) {
    const trimmed = raw.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (/^0[67]\d{8}$/.test(digits)) return true;
    if (/^33[67]\d{8}$/.test(digits)) return true;
    return /^0033[67]\d{8}$/.test(digits);
  }
  function setError(id, show) {
    const error = $(`#${id}`);
    error.hidden = !show;
    const field = error.closest('.field')?.querySelector('input');
    if (field) field.setAttribute('aria-invalid', String(show));
  }
  function escapeICS(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function parisToUTC(date, time) {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const wall = Date.UTC(year, month - 1, day, hour, minute);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: Paris, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(wall));
    const local = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
    const representedWall = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const offset = representedWall - wall;
    return new Date(wall - offset);
  }
  function compactUTC(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function makeCalendar() {
    const service = selectedService();
    const start = parisToUTC(state.day, state.time);
    const end = new Date(start.getTime() + service.duration * 60000);
    const stamp = compactUTC(new Date());
    const title = escapeICS(`Simulation — ${service.name} · Salim coiffure`);
    const description = escapeICS('Rendez-vous de démonstration uniquement. Rien n’a été envoyé au salon.');
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Salim Coiffure//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${Date.now()}@studiolamy.local`, `DTSTAMP:${stamp}`, `DTSTART:${compactUTC(start)}`, `DTEND:${compactUTC(end)}`,
      `SUMMARY:${title}`, `DESCRIPTION:${description}`, 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const anchor = $('#calendar-link');
    anchor.href = url;
    anchor.download = 'simulation-salim-coiffure.ics';
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function showSuccess() {
    const service = selectedService();
    const name = $('#customer-name').value.trim();
    $('#success-recap').textContent = `${name} · ${service.name}, ${formatDate(state.day, { weekday: 'long', day: 'numeric', month: 'long' })} à ${state.time}. Montant d’exemple : ${service.price}\u00a0€.`;
    makeCalendar();
    const activePanel = panels.find((panel) => !panel.hidden);
    if (activePanel) activePanel.hidden = true;
    $('#booking-success').hidden = false;
    $('#booking-success').classList.add('is-active');
    $('#success-title').focus({ preventScroll: true });
    say('Simulation terminée. Rien n’a été envoyé au salon.');
    stepButtons.forEach((button) => button.removeAttribute('aria-current'));
  }

  serviceInputs.forEach((input) => input.addEventListener('change', () => {
    state.time = null;
    state.furthest = Math.min(state.furthest, state.day ? 2 : 1);
    if (state.day) renderSlots();
    updateSummary();
    if (state.step === 4) updateFormRecap();
  }));
  $$('[data-next-step]', booking).forEach((button) => button.addEventListener('click', advance));
  $$('[data-previous-step]', booking).forEach((button) => button.addEventListener('click', () => setStep(Math.max(1, state.step - 1))));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const requested = Number(button.dataset.gotoStep);
    if (requested <= state.furthest) setStep(requested);
  }));
  form.addEventListener('input', () => {
    if ($('#customer-name').value.trim()) setError('name-error', false);
    if (validMobile($('#customer-phone').value)) setError('phone-error', false);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#customer-name').value.trim();
    const phone = $('#customer-phone').value.trim();
    const nameInvalid = name.length < 1;
    const phoneInvalid = !validMobile(phone);
    setError('name-error', nameInvalid);
    setError('phone-error', phoneInvalid);
    if (nameInvalid || phoneInvalid) {
      (nameInvalid ? $('#customer-name') : $('#customer-phone')).focus();
      return;
    }
    showSuccess();
  });
  $('#restart-booking').addEventListener('click', () => {
    form.reset();
    setError('name-error', false);
    setError('phone-error', false);
    state.day = null;
    state.time = null;
    state.furthest = 1;
    $('#booking-success').hidden = true;
    $('#booking-success').classList.remove('is-active');
    renderDays();
    updateSummary();
    setStep(1, false);
    say('Simulation réinitialisée.');
  });

  $$('[data-preselect]').forEach((link) => link.addEventListener('click', () => {
    const value = link.dataset.preselect;
    const input = serviceInputs.find((candidate) => candidate.value === value);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    state.day = null;
    state.time = null;
    state.furthest = 1;
    renderDays();
    updateSummary();
    setStep(1, false);
  }));

  renderDays();
  updateSummary();
  const initial = selectedService();
  if (initial) updateSummary();
})();
