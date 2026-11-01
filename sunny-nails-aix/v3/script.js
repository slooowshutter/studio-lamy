(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  root.classList.add('js');

  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const NB = '\u202f';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const months = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
  const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const weekdayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const datePartsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function parisNowParts(date = new Date()) {
    const parts = Object.fromEntries(datePartsFmt.formatToParts(date).map((part) => [part.type, part.value]));
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
  }

  function parisToday() {
    const now = parisNowParts();
    return new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
  }

  function addDays(date, amount) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + amount, 12));
  }

  function dateKey(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }

  function fromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function cap(text) { return text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1); }
  function minuteLabel(value) { return `${String(Math.floor(value / 60)).padStart(2, '0')}${NB}h${NB}${String(value % 60).padStart(2, '0')}`; }

  const services = {
    classique: { name: 'Manucure classique, sans couleur', minutes: 20, price: 15 },
    semi: { name: 'Manucure avec vernis semi-permanent', minutes: 30, price: 35 },
    resine: { name: 'Gel ou résine sur ongles naturels, sans capsule', minutes: 45, price: 50 }
  };
  const openingHours = {
    0: null,
    1: [600, 1200],
    2: [600, 1200],
    3: [600, 1200],
    4: [600, 1200],
    5: [600, 1200],
    6: [600, 1200]
  };

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

  const holidayMemo = new Map();
  function holidays(year) {
    if (holidayMemo.has(year)) return holidayMemo.get(year);
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((part) => `${year}-${part}`);
    const easter = easterSunday(year);
    const movable = [1, 39, 50].map((offset) => dateKey(addDays(easter, offset)));
    const result = new Set([...fixed, ...movable]);
    holidayMemo.set(year, result);
    return result;
  }

  function isHoliday(date) { return holidays(date.getUTCFullYear()).has(dateKey(date)); }

  /* The hero's entrance is one short, staggered arrival; the linework is the focal motion. */
  const hero = $('.hero');
  const enterHero = () => {
    if (!hero || hero.classList.contains('is-entered')) return;
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-entered')));
  };
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(enterHero).catch(enterHero);
    window.setTimeout(enterHero, 500);
  } else {
    enterHero();
  }

  /* Scroll reveals fire once. Rows vary from the hand-drawn line instead of all rising alike. */
  const revealRows = $$('.visit-steps > li, .service-list > li');
  revealRows.forEach((el, index) => el.style.setProperty('--reveal-delay', `${(index % 4) * 58}ms`));
  const revealItems = $$('[data-reveal]');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* Accessible mobile navigation. Closing from a section link moves focus to its heading. */
  const menuToggle = $('.menu-toggle');
  const menu = $('#menu-principal');
  function setMenu(open, returnFocus = false) {
    if (!menuToggle || !menu) return;
    menu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    if (returnFocus) menuToggle.focus();
  }
  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  menu?.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (menuToggle?.getAttribute('aria-expanded') !== 'true') return;
    const target = $(link.getAttribute('href'));
    setMenu(false);
    if (target) {
      const heading = target.matches('h1,h2,h3') ? target : $('h1,h2,h3', target);
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
      }
    }
  });

  /* Booking preview. It intentionally keeps every choice in this browser only. */
  const booking = $('[data-booking]');
  const form = $('#booking-form');
  if (!booking || !form) return;

  const panels = $$('[data-step]', booking);
  const tabs = $$('[data-step-go]', booking);
  const announcement = $('[data-announcement]', booking);
  const dayList = $('[data-days]', booking);
  const slotList = $('[data-slots]', booking);
  const success = $('[data-success]', booking);
  const summary = {
    service: $('[data-summary="service"]', booking),
    day: $('[data-summary="day"]', booking),
    time: $('[data-summary="time"]', booking),
    price: $('[data-summary="price"]', booking)
  };
  const state = { step: 0, furthest: 0, service: null, day: null, time: null, locked: false };
  const currentTime = parisNowParts();
  const todayKey = dateKey(parisToday());
  const firstDay = parisToday();

  function announce(message) {
    if (!announcement) return;
    announcement.textContent = '';
    window.requestAnimationFrame(() => { announcement.textContent = message; });
  }

  function getService() { return state.service ? services[state.service] : null; }
  function servicePriceLabel() { return getService() ? `${getService().price}${NB}€` : '—'; }
  function dateSummary(key) {
    if (!key) return 'À choisir';
    return cap(longDate.format(fromKey(key)));
  }
  function timeSummary(time) { return time ? time.replace(':', `${NB}h${NB}`) : 'À choisir'; }

  function updateSummary() {
    if (summary.service) summary.service.textContent = getService()?.name || 'À choisir';
    if (summary.day) summary.day.textContent = dateSummary(state.day);
    if (summary.time) summary.time.textContent = timeSummary(state.time);
    if (summary.price) summary.price.textContent = servicePriceLabel();
    const recap = $('[data-recap-text]', booking);
    if (recap) {
      const lines = [getService()?.name, state.day ? dateSummary(state.day) : '', state.time ? timeSummary(state.time) : ''].filter(Boolean);
      recap.textContent = lines.length ? `${lines.join(' · ')} · ${servicePriceLabel()} relevés sur Planity, à confirmer` : 'Choisissez une prestation, un jour et une heure.';
    }
  }

  function updateTabs() {
    tabs.forEach((tab, index) => {
      tab.disabled = index > state.furthest;
      tab.classList.toggle('is-current', index === state.step);
      if (index === state.step) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
    });
  }

  function setError(key, message) {
    const el = $(`[data-error="${key}"]`, booking);
    if (el) el.textContent = message || '';
  }

  function showStep(nextStep) {
    if (state.locked || nextStep < 0 || nextStep > state.furthest || nextStep === state.step) return;
    const previous = panels[state.step];
    const next = panels[nextStep];
    if (!previous || !next) return;
    state.locked = true;
    previous.classList.add('is-leaving');
    const duration = reduceMotion.matches ? 0 : 240;
    window.setTimeout(() => {
      previous.classList.remove('is-active', 'is-leaving');
      previous.hidden = true;
      next.hidden = false;
      next.classList.add('is-active', 'is-entering');
      state.step = nextStep;
      state.furthest = Math.max(state.furthest, nextStep);
      updateTabs();
      updateSummary();
      announce(`Étape ${nextStep + 1} sur 4 : ${$('h3', next).textContent}`);
      const heading = $('h3', next);
      heading?.focus({ preventScroll: true });
      requestAnimationFrame(() => next.classList.remove('is-entering'));
      state.locked = false;
    }, duration);
  }

  function makeButton(className, label, callback, options = {}) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    if (options.disabled) button.disabled = true;
    if (options.pressed !== undefined) button.setAttribute('aria-pressed', String(options.pressed));
    if (options.state) button.dataset.state = options.state;
    if (options.title) button.title = options.title;
    button.addEventListener('click', callback);
    return button;
  }

  function renderDays() {
    if (!dayList) return;
    dayList.replaceChildren();
    const range = $('[data-day-range]', booking);
    const lastDay = addDays(firstDay, 13);
    const dayPart = (date) => `${date.getUTCDate() === 1 ? '1er' : date.getUTCDate()} ${months.format(date)} ${date.getUTCFullYear()}`;
    if (range) range.textContent = `Du ${dayPart(firstDay)} au ${dayPart(lastDay)}.`;
    for (let offset = 0; offset < 14; offset += 1) {
      const date = addDays(firstDay, offset);
      const key = dateKey(date);
      const dow = date.getUTCDay();
      const closed = !openingHours[dow];
      const holiday = isHoliday(date);
      const button = makeButton('day-choice', '', () => {
        state.day = key;
        state.time = null;
        setError('day', '');
        setError('slot', '');
        $$('.day-choice', dayList).forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        renderSlots();
        updateSummary();
        announce(`${cap(longDate.format(date))} sélectionné${holiday ? ', jour férié, ouverture à confirmer' : ''}.`);
      }, { disabled: closed, pressed: key === state.day, title: closed ? 'Fermé le dimanche' : (holiday ? 'Jour férié, ouverture à confirmer' : '') });
      button.setAttribute('aria-label', `${cap(weekdayLong.format(date))} ${date.getUTCDate()} ${months.format(date)}${key === todayKey ? ', aujourd’hui' : ''}${closed ? ', fermé' : ''}${holiday ? ', jour férié, ouverture à confirmer' : ''}`);
      const weekday = doc.createElement('span');
      weekday.textContent = weekdayShort.format(date).replace('.', '');
      const dayNumber = doc.createElement('span');
      dayNumber.className = 'day-choice__num';
      dayNumber.textContent = String(date.getUTCDate());
      const stateLabel = doc.createElement('span');
      stateLabel.className = 'day-choice__state';
      stateLabel.textContent = closed ? 'fermé' : (holiday ? 'férié · ?' : (key === todayKey ? 'auj.' : 'ouvert'));
      button.append(weekday, dayNumber, stateLabel);
      if (key === todayKey) button.dataset.today = 'true';
      dayList.append(button);
    }
  }

  function bookedSlot(key, minute) {
    const dayCode = Number(key.replaceAll('-', ''));
    const slotCode = minute / 30;
    return ((dayCode + slotCode * 11 + (state.service || '').length * 7) % 9) === 0;
  }

  function renderSlots() {
    if (!slotList) return;
    slotList.replaceChildren();
    const service = getService();
    const date = state.day ? fromKey(state.day) : null;
    const hours = date && openingHours[date.getUTCDay()];
    if (!service || !date || !hours) return;
    const [opens, closes] = hours;
    const parisNow = parisNowParts();
    const sameDay = state.day === todayKey;
    let count = 0;
    for (let minute = opens; minute + service.minutes <= closes; minute += 30) {
      if (sameDay && minute <= parisNow.hour * 60 + parisNow.minute) continue;
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const taken = bookedSlot(state.day, minute);
      const button = makeButton('slot-choice', '', () => {
        state.time = time;
        setError('slot', '');
        $$('.slot-choice:not(:disabled)', slotList).forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        updateSummary();
        announce(`${minuteLabel(minute)} sélectionné.`);
      }, { disabled: taken, pressed: time === state.time, state: taken ? 'booked' : 'available', title: taken ? 'Déjà pris dans cette simulation' : '' });
      const visibleTime = doc.createElement('span');
      visibleTime.className = 'slot-choice__time';
      visibleTime.textContent = minuteLabel(minute);
      button.append(visibleTime);
      button.setAttribute('aria-label', `${minuteLabel(minute)}${taken ? ', déjà pris' : ''}`);
      if (taken) {
        const visibleState = doc.createElement('span');
        visibleState.className = 'slot-choice__status';
        visibleState.textContent = 'déjà pris';
        const sr = doc.createElement('span');
        sr.className = 'sr-only';
        sr.textContent = 'dans cette simulation';
        button.append(visibleState, sr);
      }
      slotList.append(button);
      count += 1;
    }
    if (!count) {
      const empty = doc.createElement('p');
      empty.className = 'slot-note-empty';
      empty.textContent = 'Aucun créneau restant pour ce jour dans la simulation. Choisissez une autre date.';
      slotList.append(empty);
    }
  }

  function validateStep(step) {
    if (step === 0 && !state.service) {
      setError('service', 'Choisissez une prestation pour continuer.');
      $('input[name="service"]', form)?.focus();
      return false;
    }
    if (step === 1 && !state.day) {
      setError('day', 'Choisissez un jour ouvert.');
      return false;
    }
    if (step === 2 && !state.time) {
      setError('slot', 'Choisissez un créneau encore disponible dans la simulation.');
      return false;
    }
    return true;
  }

  function escapeICS(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function icsDate(key, time) { return `${key.replaceAll('-', '')}T${time.replace(':', '')}00`; }

  function makeCalendarLink(name) {
    const service = getService();
    const [hour, minute] = state.time.split(':').map(Number);
    const endTotal = hour * 60 + minute + service.minutes;
    const endTime = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
    const start = icsDate(state.day, state.time);
    const end = icsDate(state.day, endTime);
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = `Rendez-vous Sunny Nails Aix — ${service.name}`;
    const description = `Simulation d’aperçu. Rien n’a été envoyé.\nTarif relevé sur Planity : ${service.price} EUR, à confirmer.`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Sunny Nails Aix//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${Date.now()}-sunny-nails-aix@studiolamy.preview`, `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Paris:${start}`, `DTEND;TZID=Europe/Paris:${end}`, `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description)}`, `LOCATION:${escapeICS('10 rue Félibre Gaut, 13100 Aix-en-Provence')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = 'rendez-vous-sunny-nails-aix.ics';
    link.textContent = 'Ajouter à mon calendrier';
    link.addEventListener('click', () => window.setTimeout(() => URL.revokeObjectURL(url), 5000), { once: true });
    return link;
  }

  function showSuccess(name) {
    const service = getService();
    const successHeading = doc.createElement('h3');
    successHeading.textContent = 'Simulation enregistrée dans cette page.';
    const recap = doc.createElement('p');
    recap.textContent = `${name}, ${service.name.toLocaleLowerCase('fr-FR')} · ${dateSummary(state.day)} à ${timeSummary(state.time)} · ${service.price}${NB}€ relevés sur Planity, à confirmer.`;
    const note = doc.createElement('p');
    note.textContent = 'Rien n’a été envoyé au salon. Cette demande ne réserve pas de rendez-vous.';
    success.replaceChildren(successHeading, recap, note, makeCalendarLink(name));
    success.hidden = false;
    booking.dataset.completed = 'true';
    success.classList.remove('is-visible');
    requestAnimationFrame(() => requestAnimationFrame(() => success.classList.add('is-visible')));
    announce('Simulation terminée. Rien n’a été envoyé au salon.');
    successHeading.focus({ preventScroll: true });
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name !== 'service') return;
    state.service = input.value;
    state.day = null;
    state.time = null;
    state.furthest = Math.min(state.furthest, 0);
    setError('service', '');
    renderDays();
    renderSlots();
    updateTabs();
    updateSummary();
  });

  $$('[data-next]', booking).forEach((button) => button.addEventListener('click', () => {
    if (!validateStep(state.step)) return;
    if (state.step === 0) renderDays();
    if (state.step === 1) renderSlots();
    state.furthest = Math.max(state.furthest, state.step + 1);
    showStep(state.step + 1);
  }));

  $$('[data-back]', booking).forEach((button) => button.addEventListener('click', () => showStep(state.step - 1)));
  tabs.forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.stepGo))));

  $$('[data-select-service]').forEach((link) => link.addEventListener('click', () => {
    const id = link.dataset.selectService;
    const input = $(`input[name="service"][value="${id}"]`, form);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (state.step !== 0) {
      const wait = state.locked ? 260 : 0;
      window.setTimeout(() => {
        if (state.step !== 0) showStep(0);
      }, wait);
    }
  }));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameField = $('#client-name');
    const phoneField = $('#client-phone');
    const name = nameField.value.trim();
    let phone = phoneField.value.replace(/[^\d]/g, '');
    if (phone.startsWith('0033')) phone = `0${phone.slice(4)}`;
    else if (phone.startsWith('33')) phone = `0${phone.slice(2)}`;
    const validName = name.length >= 2;
    const validPhone = /^0[67]\d{8}$/.test(phone);
    setError('name', validName ? '' : 'Saisissez un prénom de deux caractères au moins.');
    setError('phone', validPhone ? '' : 'Saisissez un numéro mobile français en 06 ou 07.');
    if (!validName) { nameField.focus(); return; }
    if (!validPhone) { phoneField.focus(); return; }
    if (!state.service || !state.day || !state.time) {
      announce('Une étape de la sélection manque. Revenez aux étapes précédentes.');
      showStep(!state.service ? 0 : (!state.day ? 1 : 2));
      return;
    }
    showSuccess(name);
  });

  renderDays();
  updateTabs();
  updateSummary();
})();
