(() => {
  'use strict';

  const SHOP = {
    name: 'Ô MIROIR',
    phone: '05 46 41 79 71',
    address: '50 rue du Minage, 17000 La Rochelle',
    hours: {
      0: null,
      1: null,
      2: [540, 1080],
      3: [540, 1080],
      4: [540, 1080],
      5: [540, 1080],
      6: [540, 1020]
    }
  };
  const SERVICES = {
    'coupe-femme': { name: 'Shampoing + coupe + brushing, cheveux courts', short: 'Coupe + brushing, cheveux courts' },
    'coupe-homme': { name: 'Shampoing + coupe homme', short: 'Coupe homme' },
    brushing: { name: 'Shampoing + brushing, cheveux courts', short: 'Brushing, cheveux courts' },
    soin: { name: 'Soin profond', short: 'Soin profond' },
    junior: { name: 'Coupe + shampoing + séchage junior (-12 ans)', short: 'Coupe junior' }
  };
  const NB = '\u00a0';
  const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const doc = document;
  const $ = (selector, root = doc) => root.querySelector(selector);
  const $$ = (selector, root = doc) => Array.from(root.querySelectorAll(selector));
  const form = $('[data-booking]');
  const wrap = $('.booking-form-wrap');
  const announcement = document.createElement('p');
  announcement.className = 'visually-hidden';
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.dataset.announcement = '';
  form.append(announcement);

  const state = {
    service: 'coupe-femme',
    date: '',
    time: '',
    step: '1',
    maxStep: 1,
    name: '',
    phone: ''
  };

  const parisFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });

  function parisNow() {
    const parts = Object.fromEntries(parisFormatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
    const y = Number(parts.year);
    const m = Number(parts.month);
    const d = Number(parts.day);
    const atNoon = new Date(Date.UTC(y, m - 1, d, 12));
    return { y, m, d, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: atNoon.getUTCDay() };
  }

  function dateAtNoon(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  }

  function dateKey(date) {
    return dateAtNoon(date).toISOString().slice(0, 10);
  }

  function parisToday() {
    const { y, m, d } = parisNow();
    return new Date(Date.UTC(y, m - 1, d, 12));
  }

  function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(dateAtNoon(date));
  }

  function formatLongDate(date) {
    const value = dateFormatter.format(dateAtNoon(date));
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function formatDayNumber(date) { return String(dateAtNoon(date).getUTCDate()); }
  function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}${NB}h${NB}${String(m).padStart(2, '0')}` : `${h}${NB}h`;
  }
  function slotValue(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  function safeText(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }

  function serviceInfo() { return SERVICES[state.service] || SERVICES['coupe-femme']; }
  function selectedRadio() { return $('input[name="service"]:checked', form); }
  function updateService() {
    const radio = selectedRadio();
    if (radio && SERVICES[radio.value]) state.service = radio.value;
    if (state.date) renderSlots(false);
    updateSummary();
  }

  function availableHours(date) {
    return SHOP.hours[dateAtNoon(date).getUTCDay()];
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

  function isFrenchPublicHoliday(date) {
    const normalized = dateAtNoon(date);
    const fixed = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25']);
    const monthDay = `${String(normalized.getUTCMonth() + 1).padStart(2, '0')}-${String(normalized.getUTCDate()).padStart(2, '0')}`;
    if (fixed.has(monthDay)) return true;
    const easter = easterSunday(normalized.getUTCFullYear());
    const daysAfterEaster = Math.round((normalized.getTime() - easter.getTime()) / 86400000);
    return [1, 39, 50].includes(daysAfterEaster);
  }

  function deterministicBooked(key) {
    let hash = 2166136261;
    for (const char of key) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 5 === 0;
  }

  function renderDates() {
    const list = $('[data-date-list]');
    if (!list) return;
    list.replaceChildren();
    const today = parisToday();
    let firstOpen = '';
    const fragment = document.createDocumentFragment();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today.getTime() + offset * 86400000);
      const key = dateKey(date);
      const hours = availableHours(date);
      const closed = !hours;
      const holiday = isFrenchPublicHoliday(date);
      if (!closed && !firstOpen) firstOpen = key;
      const wrapDate = document.createElement('div');
      wrapDate.className = `date-choice${closed ? ' is-closed' : ''}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-date';
      input.id = `date-${key}`;
      input.value = key;
      input.disabled = closed;
      input.checked = Boolean(!closed && state.date === key);
      input.setAttribute('aria-label', `${formatLongDate(date)}${closed ? ', fermé' : holiday ? ', jour férié, ouverture à confirmer' : ''}`);
      const label = document.createElement('label');
      label.htmlFor = input.id;
      const weekday = document.createElement('span');
      weekday.textContent = offset === 0 ? 'Auj.' : formatDate(date, { weekday: 'short' }).replace('.', '');
      const dayNumber = document.createElement('span');
      dayNumber.textContent = formatDayNumber(date);
      const status = document.createElement('span');
      status.textContent = closed ? 'fermé' : holiday ? 'férié' : (offset === 1 ? 'demain' : '');
      label.append(weekday, dayNumber, status);
      wrapDate.append(input, label);
      fragment.append(wrapDate);
    }
    list.append(fragment);

    if (!state.date || !availableHours(new Date(`${state.date}T12:00:00Z`))) {
      state.date = firstOpen;
      state.time = '';
    }
    const selected = $(`input[name="booking-date"][value="${state.date}"]`, list);
    if (selected) selected.checked = true;
    renderSlots(false);
  }

  function renderSlots(announce = true) {
    const list = $('[data-slot-list]');
    const help = $('[data-slot-help]');
    if (!list || !help || !state.date) return;
    list.replaceChildren();
    const date = new Date(`${state.date}T12:00:00Z`);
    const hours = availableHours(date);
    if (!hours) {
      help.textContent = 'Ce jour est fermé selon les horaires publiés.';
      state.time = '';
      updateSummary();
      return;
    }

    const now = parisNow();
    const isToday = dateKey(parisToday()) === state.date;
    const earliest = isToday ? now.minutes : hours[0];
    const slots = [];
    for (let start = hours[0]; start < hours[1]; start += 30) {
      const past = isToday && start < earliest;
      const key = `${state.date}:${state.service}:${start}`;
      slots.push({ start, past, booked: !past && deterministicBooked(key) });
    }
    const futureSlots = slots.filter((slot) => !slot.past);
    if (futureSlots.length && futureSlots.every((slot) => slot.booked)) futureSlots[futureSlots.length - 1].booked = false;
    if (state.time && !slots.some((slot) => slotValue(slot.start) === state.time && !slot.booked && !slot.past)) state.time = '';

    const fragment = document.createDocumentFragment();
    for (const slot of slots) {
      const value = slotValue(slot.start);
      const item = document.createElement('div');
      item.className = `slot-choice${slot.booked || slot.past ? ' is-taken' : ''}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-time';
      input.id = `time-${state.date}-${value.replace(':', '')}`;
      input.value = value;
      input.disabled = slot.booked || slot.past;
      input.checked = !slot.booked && !slot.past && state.time === value;
      input.setAttribute('aria-label', `${formatTime(slot.start)}${slot.past ? ', passé' : slot.booked ? ', déjà pris' : ''}`);
      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = slot.past ? `${formatTime(slot.start)} · passé` : slot.booked ? `${formatTime(slot.start)} · pris` : formatTime(slot.start);
      item.append(input, label);
      fragment.append(item);
    }
    list.append(fragment);

    if (!futureSlots.length) {
      help.textContent = 'Aucun créneau ne reste pour cette journée. Choisissez un autre jour.';
    } else {
      const available = futureSlots.filter((slot) => !slot.booked).length;
      const holidayNote = isFrenchPublicHoliday(date) ? ' Jour férié : ouverture à confirmer.' : '';
      help.textContent = `${available} créneau${available > 1 ? 'x' : ''} libre${available > 1 ? 's' : ''} le ${formatLongDate(date)}.${holidayNote}`;
    }
    if (announce) announcement.textContent = help.textContent;
    updateSummary();
  }

  function prettyPhone(phone) { return phone.trim().replace(/\s+/g, ' '); }

  function updateSummary() {
    const service = serviceInfo();
    const serviceText = $('[data-summary-service]');
    const dateText = $('[data-summary-date]');
    const contactText = $('[data-summary-contact]');
    if (serviceText) serviceText.textContent = service.short;
    if (dateText) {
      if (state.date && state.time) {
        const date = new Date(`${state.date}T12:00:00Z`);
        const [hours, minutes] = state.time.split(':').map(Number);
        dateText.textContent = `${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(hours * 60 + minutes)}`;
      } else dateText.textContent = state.date ? `${formatLongDate(new Date(`${state.date}T12:00:00Z`))} · heure à choisir` : 'Jour et heure à choisir';
    }
    if (contactText) contactText.textContent = state.name ? `${state.name}${state.phone ? ` · ${prettyPhone(state.phone)}` : ''}` : 'Coordonnées à compléter';
    const activeStep = state.step === 'success' ? 4 : Number(state.step);
    $$('[data-edit]', document).forEach((button) => {
      const step = Number(button.dataset.edit);
      button.disabled = step > state.maxStep || step === activeStep;
    });
  }

  function setError(name, message) {
    const node = $(`[data-error="${name}"]`, form);
    if (node) node.textContent = message;
  }

  function clearErrors() { $$('[data-error]', form).forEach((node) => { node.textContent = ''; }); }

  function moveToStep(next) {
    const old = $(`[data-step="${state.step}"]`, form);
    const target = $(`[data-step="${next}"]`, form);
    if (!target || old === target) return;
    wrap.classList.add('is-transitioning');
    window.setTimeout(() => {
      if (old) {
        old.classList.remove('is-current');
        old.hidden = true;
      }
      target.hidden = false;
      target.classList.add('is-current');
      state.step = String(next);
      if (Number(next) > state.maxStep && next !== 'success') state.maxStep = Number(next);
      if (next === 'success') state.maxStep = 3;
      if (next === '2') renderDates();
      if (next === '3') renderRecap();
      updateProgress();
      updateSummary();
      requestAnimationFrame(() => {
        wrap.classList.remove('is-transitioning');
        const heading = $('h3[tabindex="-1"]', target);
        if (heading) heading.focus();
        announcement.textContent = next === 'success' ? 'Simulation terminée. Rien n’a été envoyé.' : `Étape ${next} sur 3.`;
      });
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 130);
  }

  function updateProgress() {
    const bar = $('[data-progress]');
    const value = state.step === 'success' ? 100 : Number(state.step) * 33.333;
    if (bar) bar.style.transform = `scaleX(${value / 100})`;
  }

  function renderRecap() {
    const node = $('[data-recap]');
    if (!node) return;
    const date = state.date ? new Date(`${state.date}T12:00:00Z`) : null;
    const [hours, minutes] = (state.time || '00:00').split(':').map(Number);
    node.innerHTML = `<p><strong>${safeText(serviceInfo().short)}</strong><br>${date ? safeText(formatLongDate(date)) : ''} · ${safeText(formatTime(hours * 60 + minutes))}</p>`;
  }

  function validMobile(value) {
    const trimmed = value.trim();
    let digits = trimmed.replace(/\D/g, '');
    if (trimmed.startsWith('+33') || trimmed.startsWith('0033')) {
      if (digits.startsWith('0033')) digits = digits.slice(4);
      else if (digits.startsWith('33')) digits = digits.slice(2);
      return /^[67]\d{8}$/.test(digits);
    }
    return /^0[67]\d{8}$/.test(digits);
  }

  function submitBooking(event) {
    event.preventDefault();
    clearErrors();
    const nameInput = $('#booking-name', form);
    const phoneInput = $('#booking-phone', form);
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    let invalid = false;
    if (!name) {
      setError('name', 'Indiquez votre prénom.');
      invalid = true;
    }
    if (!validMobile(phone)) {
      setError('phone', 'Indiquez un numéro de mobile français valide.');
      invalid = true;
    }
    if (!state.date || !state.time) {
      setError('slot', 'Choisissez d’abord un jour et un créneau.');
      invalid = true;
    }
    if (invalid) {
      const firstError = name ? phoneInput : nameInput;
      if (!name || !validMobile(phone)) firstError.focus();
      return;
    }
    state.name = name;
    state.phone = phone;
    renderSuccess();
    moveToStep('success');
  }

  function renderSuccess() {
    const node = $('[data-success-recap]');
    const date = new Date(`${state.date}T12:00:00Z`);
    const [hours, minutes] = state.time.split(':').map(Number);
    node.innerHTML = `<p><strong>${safeText(serviceInfo().short)}</strong><br>${safeText(formatLongDate(date))} · ${safeText(formatTime(hours * 60 + minutes))}<br>${safeText(state.name)} · ${safeText(prettyPhone(state.phone))}</p>`;
  }

  function initStatus() {
    const now = parisNow();
    const row = $(`.hours-list [data-day="${now.weekday}"]`);
    if (row) row.setAttribute('data-today', 'true');
    const status = $('[data-open-status]');
    if (!status) return;
    const range = SHOP.hours[now.weekday];
    if (isFrenchPublicHoliday(parisToday())) {
      status.textContent = 'Jour férié : horaires à confirmer auprès du salon.';
      return;
    }
    if (now.weekday === 6) {
      status.textContent = 'Samedi : horaires à confirmer auprès du salon.';
      return;
    }
    if (!range) {
      status.textContent = 'Fermé aujourd’hui selon les horaires publiés.';
    } else if (now.minutes >= range[0] && now.minutes < range[1]) {
      status.textContent = `Ouvert aujourd’hui jusqu’à ${formatTime(range[1])}, selon les horaires publiés.`;
    } else if (now.minutes < range[0]) {
      status.textContent = `Aujourd’hui, ouverture à ${formatTime(range[0])}, selon les horaires publiés.`;
    } else {
      status.textContent = 'Fermé aujourd’hui selon les horaires publiés.';
    }
  }

  function initReveals() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealNodes = $$('.reveal');
    const signature = $('.anniversary');
    const street = $('.street-figure');
    if (reduce.matches || !('IntersectionObserver' in window)) {
      revealNodes.forEach((node) => node.classList.add('is-visible'));
      if (signature) signature.classList.add('is-visible');
      if (street) street.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    }, { threshold: 0.14, rootMargin: '0px 0px -32px 0px' });
    revealNodes.forEach((node) => observer.observe(node));
    if (signature) observer.observe(signature);
    if (street) observer.observe(street);
  }

  function initBooking() {
    $$('input[name="service"]', form).forEach((radio) => {
      radio.addEventListener('change', () => {
        state.service = radio.value;
        if (state.date) renderSlots(false);
        updateSummary();
      });
    });
    form.addEventListener('change', (event) => {
      if (event.target.name === 'booking-date') {
        state.date = event.target.value;
        state.time = '';
        renderSlots(true);
        const focusTarget = $('[data-slot-help]', form);
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      } else if (event.target.name === 'booking-time') {
        state.time = event.target.value;
        setError('slot', '');
        updateSummary();
      }
    });
    form.addEventListener('click', (event) => {
      const next = event.target.closest('[data-next]');
      const back = event.target.closest('[data-back]');
      if (next) {
        clearErrors();
        if (state.step === '1') {
          updateService();
          moveToStep('2');
        } else if (state.step === '2') {
          if (!state.date || !state.time) {
            setError('slot', 'Choisissez un jour puis un créneau disponible.');
            $('[data-slot-help]', form).focus({ preventScroll: true });
          } else moveToStep('3');
        }
      }
      if (back) moveToStep(state.step === '3' ? '2' : '1');
    });
    form.addEventListener('submit', submitBooking);
    $$('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const destination = button.dataset.edit;
        if (Number(destination) <= state.maxStep) moveToStep(destination);
      });
    });
    $$('[data-service]').forEach((link) => {
      link.addEventListener('click', () => {
        const value = link.dataset.service;
        const radio = $(`input[name="service"][value="${value}"]`, form);
        if (radio) {
          radio.checked = true;
          state.service = value;
          if (state.step !== '1') moveToStep('1');
          updateSummary();
        }
      });
    });
    updateSummary();
  }

  function initMobileBar() {
    const bar = $('.mobile-bar');
    if (!bar || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('has-bar-observer');
    const heroLink = $('.hero__link');
    const footer = $('.site-footer');
    const booking = $('#reserver');
    let heroGone = false;
    let footerVisible = false;
    let bookingVisible = false;
    const update = () => bar.classList.toggle('is-visible', heroGone && !footerVisible && !bookingVisible);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === heroLink) heroGone = !entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
        if (entry.target === booking) bookingVisible = entry.isIntersecting;
      }
      update();
    }, { threshold: 0.05 });
    if (heroLink) observer.observe(heroLink);
    if (footer) observer.observe(footer);
    if (booking) observer.observe(booking);
  }

  function ready() {
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));
  }

  initStatus();
  initReveals();
  initBooking();
  initMobileBar();
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 650))]).then(ready);
  } else ready();
  window.__siteReady = true;
})();
