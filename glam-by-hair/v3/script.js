window.__site = 1;
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';
  const daysFr = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const hoursByDay = {
    0: null,
    1: null,
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 17 * 60]
  };
  const serviceDuration = 90;
  const dateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dateShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  const atNoon = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
  const addDays = (date, amount) => new Date(date.getTime() + amount * 86400000);
  const toIso = (date) => date.toISOString().slice(0, 10);
  const hourLabel = (minutes) => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const longDate = (date) => dateLong.format(atNoon(date));
  const shortDate = (date) => dateShort.format(atNoon(date)).replace('.', '');
  const monthLabel = (date) => monthShort.format(atNoon(date)).replace('.', '');

  function parisNow() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return {
      date: new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12)),
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
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
    const l = (32 + 2 * e - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  const holidayMemo = new Map();
  function publicHolidays(year) {
    if (holidayMemo.has(year)) return holidayMemo.get(year);
    const pad = (number) => String(number).padStart(2, '0');
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((monthDay) => `${year}-${monthDay}`);
    const easter = easterSunday(year);
    const movable = [1, 39, 50].map((offset) => toIso(addDays(easter, offset)));
    const result = new Set(fixed.concat(movable));
    holidayMemo.set(year, result);
    return result;
  }

  function markReveals() {
    const groups = [
      $$('.ritual-steps li[data-reveal]'),
      $$('.service-table tbody tr[data-reveal]'),
      $$('.practical-index [data-reveal]'),
      $$('.source-list li[data-reveal]'),
      $$('.complete-block[data-reveal]')
    ];
    groups.forEach((items) => items.forEach((item, index) => item.style.setProperty('--stagger', `${index * 40}ms`)));
    const items = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-seen'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    items.forEach((item) => observer.observe(item));
  }

  function enterPage() {
    const show = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
    if (doc.fonts && doc.fonts.ready) {
      Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 700))]).then(show);
    } else {
      show();
    }
  }

  function setupBooking() {
    const booking = $('[data-booking]');
    if (!booking) return;

    const panels = $$('[data-panel]', booking);
    const stepButtons = $$('[data-step-jump]', booking);
    const nextButtons = $$('[data-next]', booking);
    const dayList = $('[data-day-list]', booking);
    const slotList = $('[data-slot-list]', booking);
    const nextDay = $('[data-next="3"]', booking);
    const nextSlot = $('[data-next="4"]', booking);
    const summaryService = $('[data-summary-service]', booking);
    const summaryDay = $('[data-summary-day]', booking);
    const summaryTime = $('[data-summary-time]', booking);
    const recap = $('[data-recap]', booking);
    const nameInput = $('#nom', booking);
    const phoneInput = $('#telephone', booking);
    const dayError = $('[data-day-error]', booking);
    const slotError = $('[data-slot-error]', booking);
    const bookingForm = $('[data-panel="4"]', booking);
    const successCopy = $('[data-success-copy]', booking);
    const calendarButton = $('[data-calendar]', booking);

    let currentStep = 1;
    let selectedDate = null;
    let selectedTime = null;
    let transitionLocked = false;
    let chosenService = { name: 'Rituel serenity', duration: serviceDuration };

    function updateStepper() {
      stepButtons.forEach((button) => {
        const step = Number(button.dataset.stepJump);
        button.disabled = step > currentStep;
        if (step === currentStep) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }

    function panelFor(step) {
      return panels.find((panel) => panel.dataset.panel === String(step)) || null;
    }

    function showPanel(step, focus = true) {
      const oldPanel = panels.find((panel) => !panel.hidden);
      const newPanel = panelFor(step);
      if (transitionLocked || !newPanel || oldPanel === newPanel) return;
      transitionLocked = true;
      if (oldPanel && !reduce.matches) oldPanel.classList.add('is-leaving');
      window.setTimeout(() => {
        if (oldPanel) {
          oldPanel.hidden = true;
          oldPanel.classList.remove('is-leaving');
        }
        currentStep = step;
        newPanel.hidden = false;
        if (!reduce.matches) newPanel.classList.add('is-arriving');
        updateStepper();
        if (focus) {
          const heading = $('h3', newPanel);
          if (heading) heading.focus({ preventScroll: true });
        }
        requestAnimationFrame(() => requestAnimationFrame(() => newPanel.classList.remove('is-arriving')));
        window.setTimeout(() => { transitionLocked = false; }, reduce.matches ? 0 : 220);
      }, oldPanel && !reduce.matches ? 70 : 0);
    }

    function refreshSummary() {
      summaryService.textContent = `${chosenService.name} · 1${NB}h${NB}30`;
      summaryDay.textContent = selectedDate ? longDate(selectedDate) : 'À choisir';
      summaryTime.textContent = selectedTime === null ? 'À choisir' : hourLabel(selectedTime);
      recap.textContent = selectedDate && selectedTime !== null
        ? `${chosenService.name} · ${longDate(selectedDate)} · ${hourLabel(selectedTime)} · durée ${hourLabel(chosenService.duration)}`
        : '';
    }

    function isHoliday(date) {
      return publicHolidays(date.getUTCFullYear()).has(toIso(date));
    }

    function makeDays() {
      const startDate = parisNow().date;
      for (let offset = 0; offset < 14; offset += 1) {
        const date = addDays(startDate, offset);
        const weekDay = date.getUTCDay();
        const holiday = isHoliday(date);
        const hours = hoursByDay[weekDay];
        const button = doc.createElement('button');
        button.className = 'day-button';
        button.type = 'button';
        button.dataset.iso = toIso(date);
        button.disabled = !hours || holiday;
        button.setAttribute('aria-pressed', 'false');
        const dayName = doc.createElement('strong');
        dayName.textContent = shortDate(date);
        const monthName = doc.createElement('small');
        monthName.textContent = monthLabel(date);
        const status = doc.createElement('small');
        if (holiday) {
          status.textContent = 'À confirmer';
          button.setAttribute('aria-label', `${daysFr[weekDay]} ${date.getUTCDate()} ${monthLabel(date)}, jour férié, horaires à confirmer`);
        } else if (!hours) {
          status.textContent = 'Fermé';
          button.setAttribute('aria-label', `${daysFr[weekDay]} ${date.getUTCDate()} ${monthLabel(date)}, fermé`);
        } else {
          status.textContent = `${hourLabel(hours[0])}–${hourLabel(hours[1])}`;
          button.setAttribute('aria-label', `${daysFr[weekDay]} ${date.getUTCDate()} ${monthLabel(date)}, ouvert de ${hourLabel(hours[0])} à ${hourLabel(hours[1])}`);
        }
        button.append(dayName, monthName, status);
        if (hours && !holiday) {
          button.addEventListener('click', () => {
            selectedDate = date;
            selectedTime = null;
            nextDay.disabled = false;
            nextSlot.disabled = true;
            dayError.hidden = true;
            $$('.day-button', dayList).forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            makeSlots();
            refreshSummary();
          });
        }
        dayList.append(button);
      }
    }

    function bookedForExample(dateIso, minute) {
      const seed = `${dateIso}${minute}`;
      let value = 0;
      for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) % 997;
      return value % 9 === 0 && minute % 120 !== 0;
    }

    function makeSlots() {
      slotList.replaceChildren();
      if (!selectedDate) return;
      const hours = hoursByDay[selectedDate.getUTCDay()];
      if (!hours || isHoliday(selectedDate)) return;
      const now = parisNow();
      const todayIso = toIso(now.date);
      for (let minute = hours[0]; minute + chosenService.duration <= hours[1]; minute += 30) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'slot-button';
        button.dataset.minute = String(minute);
        button.setAttribute('aria-pressed', 'false');
        const time = doc.createElement('strong');
        time.className = 'tnum';
        time.textContent = hourLabel(minute);
        const state = doc.createElement('small');
        const isPast = toIso(selectedDate) === todayIso && minute <= now.minutes;
        const unavailable = !isPast && bookedForExample(toIso(selectedDate), minute);
        button.disabled = isPast || unavailable;
        if (isPast) {
          state.textContent = 'Passé';
          button.setAttribute('aria-label', `${hourLabel(minute)}, heure déjà passée`);
        } else if (unavailable) {
          state.textContent = 'Indisponible · exemple';
          button.setAttribute('aria-label', `${hourLabel(minute)}, indisponible dans cette simulation`);
        } else {
          state.textContent = 'Choisir';
          button.setAttribute('aria-label', `Choisir ${hourLabel(minute)}`);
          button.addEventListener('click', () => {
            selectedTime = minute;
            nextSlot.disabled = false;
            slotError.hidden = true;
            $$('.slot-button', slotList).forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            refreshSummary();
          });
        }
        button.append(time, state);
        slotList.append(button);
      }
    }

    function validateMobile(value) {
      const normalized = value.trim().replace(/[ .()-]/g, '');
      return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalized);
    }

    function setError(input, message, visible) {
      const error = $(`#${input.id}-erreur`, booking);
      error.hidden = !visible;
      input.setAttribute('aria-invalid', String(visible));
      if (visible && message) error.textContent = message;
    }

    function parisUtcDate(date, minutes) {
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const utcGuess = Date.UTC(year, month, day, Math.floor(minutes / 60), minutes % 60);
      const parts = Object.fromEntries(parisClock.formatToParts(new Date(utcGuess)).map((part) => [part.type, part.value]));
      const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      return new Date(utcGuess - (localAsUtc - utcGuess));
    }

    function utcStamp(date) {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    function downloadCalendar() {
      if (!selectedDate || selectedTime === null) return;
      const start = parisUtcDate(selectedDate, selectedTime);
      const end = new Date(start.getTime() + chosenService.duration * 60000);
      const content = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Simulation GLAM BY HAIR//FR',
        'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${Date.now()}@studiolamy.preview`,
        `DTSTAMP:${utcStamp(new Date())}`, `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`,
        'SUMMARY:GLAM BY HAIR — Rituel serenity (simulation)',
        'DESCRIPTION:Parcours de démonstration uniquement. Aucun rendez-vous n’a été posé.',
        'LOCATION:24 rue de Saint-Cyr, 69009 Lyon', 'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const file = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = doc.createElement('a');
      link.href = url;
      link.download = 'rendez-vous-glam-by-hair.ics';
      link.click();
      URL.revokeObjectURL(url);
    }

    function finishSimulation() {
      if (transitionLocked) return;
      const name = nameInput.value.trim();
      const validName = name.length > 0;
      const validPhone = validateMobile(phoneInput.value);
      setError(nameInput, '', !validName);
      setError(phoneInput, '', !validPhone);
      if (!validName || !validPhone) {
        (validName ? phoneInput : nameInput).focus();
        return;
      }
      successCopy.textContent = `Merci ${name}. Votre simulation concerne le ${longDate(selectedDate)} à ${hourLabel(selectedTime)} pour le Rituel serenity.`;
      transitionLocked = true;
      const oldPanel = panels.find((panel) => !panel.hidden);
      const successPanel = $('[data-panel="success"]', booking);
      if (oldPanel && !reduce.matches) oldPanel.classList.add('is-leaving');
      window.setTimeout(() => {
        if (oldPanel) {
          oldPanel.hidden = true;
          oldPanel.classList.remove('is-leaving');
        }
        successPanel.hidden = false;
        if (!reduce.matches) successPanel.classList.add('is-arriving');
        currentStep = 4;
        updateStepper();
        $('h3', successPanel).focus({ preventScroll: true });
        requestAnimationFrame(() => requestAnimationFrame(() => successPanel.classList.remove('is-arriving')));
        window.setTimeout(() => { transitionLocked = false; }, reduce.matches ? 0 : 220);
      }, oldPanel && !reduce.matches ? 70 : 0);
    }

    function restart() {
      if (transitionLocked) return;
      selectedDate = null;
      selectedTime = null;
      nextDay.disabled = true;
      nextSlot.disabled = true;
      dayError.hidden = true;
      slotError.hidden = true;
      nameInput.value = '';
      phoneInput.value = '';
      setError(nameInput, '', false);
      setError(phoneInput, '', false);
      $$('.day-button', dayList).forEach((button) => button.setAttribute('aria-pressed', 'false'));
      panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== '1'; });
      currentStep = 1;
      selectedTime = null;
      stepButtons.forEach((button) => {
        const step = Number(button.dataset.stepJump);
        button.disabled = step !== 1;
      });
      stepButtons[0].setAttribute('aria-current', 'step');
      refreshSummary();
      $('#etape-prestation', booking).focus({ preventScroll: true });
    }

    const defaultRadio = $('input[name="prestation"]:checked', booking);
    if (defaultRadio) {
      chosenService = { name: defaultRadio.dataset.name, duration: Number(defaultRadio.dataset.duration) };
      defaultRadio.addEventListener('change', () => {
        chosenService = { name: defaultRadio.dataset.name, duration: Number(defaultRadio.dataset.duration) };
        refreshSummary();
        if (selectedDate) makeSlots();
      });
    }
    makeDays();
    refreshSummary();
    updateStepper();

    nextButtons.forEach((button) => button.addEventListener('click', () => {
      const target = Number(button.dataset.next);
      if (target === 3 && !selectedDate) { dayError.hidden = false; return; }
      if (target === 4 && selectedTime === null) { slotError.hidden = false; return; }
      showPanel(target);
    }));
    $$('[data-back]', booking).forEach((button) => button.addEventListener('click', () => showPanel(Number(button.dataset.back))));
    stepButtons.forEach((button) => button.addEventListener('click', () => {
      const target = Number(button.dataset.stepJump);
      if (!button.disabled && target < currentStep) showPanel(target);
    }));
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      finishSimulation();
    });
    calendarButton.addEventListener('click', downloadCalendar);
    $('[data-restart]', booking).addEventListener('click', restart);
    nameInput.addEventListener('input', () => { if (nameInput.value.trim()) setError(nameInput, '', false); });
    phoneInput.addEventListener('input', () => { if (validateMobile(phoneInput.value)) setError(phoneInput, '', false); });
  }

  function setupStickyBar() {
    const bar = $('[data-sticky-bar]');
    const reservation = $('#reservation');
    const heading = $('#titre-reservation');
    if (!bar || !reservation || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const away = entry.isIntersecting;
        if (away && bar.contains(doc.activeElement) && heading) heading.focus({ preventScroll: true });
        bar.classList.toggle('is-away', away);
        bar.setAttribute('aria-hidden', String(away));
        bar.inert = away;
      });
    }, { threshold: 0.08 });
    observer.observe(reservation);
  }

  markReveals();
  enterPage();
  setupBooking();
  setupStickyBar();
})();
