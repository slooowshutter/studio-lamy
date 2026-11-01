(() => {
  'use strict';

  window.__site = true;

  const services = {
    coupe: { name: 'Coupe homme', minutes: 30, price: 25 },
    'coupe-barbe': { name: 'Coupe + barbe', minutes: 45, price: 34 },
    barbe: { name: 'Taille de barbe', minutes: 20, price: 18 }
  };
  const hours = {
    0: null,
    1: [600, 1080],
    2: [540, 1140],
    3: [540, 1140],
    4: [570, 1140],
    5: [540, 1140],
    6: [540, 1050]
  };
  const state = { service: '', day: '', time: '', name: '', phone: '', step: 1 };
  const form = document.querySelector('#booking-form');
  const steps = [...document.querySelectorAll('[data-step]')];
  const success = document.querySelector('[data-success]');
  const live = document.querySelector('[data-live]');
  const dayList = document.querySelector('[data-days]');
  const slots = document.querySelector('[data-slots]');
  const calendarButton = document.querySelector('[data-calendar]');
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });

  const pad = (n) => String(n).padStart(2, '0');
  const parseKey = (key) => key.split('-').map(Number);
  const keyFromParts = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;
  const dateForKey = (key) => {
    const [year, month, day] = parseKey(key);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };
  const weekdayForKey = (key) => dateForKey(key).getUTCDay();
  const parisParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).reduce((out, part) => (out[part.type] = part.value, out), {});
    return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: Number(parts.weekday === 'Sun' ? 0 : ['Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday) + 1), hour: Number(parts.hour), minute: Number(parts.minute) };
  };
  const makeDateList = () => {
    const now = parisParts();
    const start = Date.UTC(now.year, now.month - 1, now.day, 12);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start + i * 86400000);
      return keyFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    });
  };
  const timeText = (minutes) => `${pad(Math.floor(minutes / 60))}\u00A0h\u00A0${pad(minutes % 60)}`;
  const shortTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const niceDate = (key) => {
    const text = dateFmt.format(dateForKey(key));
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  function syncSummary() {
    const item = services[state.service];
    document.querySelector('[data-summary-service]').textContent = item ? `${item.name} · ${item.minutes}\u00A0min` : 'À choisir';
    document.querySelector('[data-summary-price]').textContent = item ? `${item.price}\u00A0€*` : '—';
    document.querySelector('[data-summary-day]').textContent = state.day ? niceDate(state.day) : 'À choisir';
    document.querySelector('[data-summary-time]').textContent = state.time || 'À choisir';
    document.querySelectorAll('[data-edit]').forEach((button) => {
      const step = Number(button.dataset.edit);
      button.disabled = step === 1 ? !state.service : step === 2 ? !state.day : !state.time;
    });
    document.querySelectorAll('[name="service"]').forEach((input) => { input.checked = input.value === state.service; });
  }

  function renderDays() {
    const keys = makeDateList();
    dayList.replaceChildren();
    keys.forEach((key, index) => {
      const d = dateForKey(key);
      const day = weekdayForKey(key);
      const closed = !hours[day];
      const wrap = document.createElement('div');
      wrap.className = 'day-choice';
      const id = `day-${key}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-day';
      input.id = id;
      input.value = key;
      input.checked = key === state.day;
      input.disabled = closed;
      input.setAttribute('aria-label', niceDate(key) + (closed ? ', fermé' : ''));
      const label = document.createElement('label');
      label.htmlFor = id;
      const weekday = document.createElement('span');
      weekday.textContent = index === 0 ? 'Auj.' : index === 1 ? 'Dem.' : weekdayFmt.format(d).replace('.', '');
      const number = document.createElement('strong');
      number.textContent = String(d.getUTCDate());
      const month = document.createElement('small');
      month.textContent = closed ? 'fermé' : monthFmt.format(d).replace('.', '');
      label.append(weekday, number, month);
      input.addEventListener('change', () => {
        state.day = key;
        state.time = '';
        const openCount = renderSlots();
        syncSummary();
        document.querySelector('[data-day-error]').hidden = true;
        live.textContent = `${niceDate(key)} choisi. ${openCount} créneaux libres dans cette simulation ; horaires à confirmer.`;
      });
      wrap.append(input, label);
      dayList.append(wrap);
    });
    if (keys.includes(state.day) && !hours[weekdayForKey(state.day)]) state.day = '';
    syncSummary();
  }

  function deterministicTaken(key, minute) {
    const seed = [...`${key}-${minute}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    return seed % 5 === 0;
  }

  function renderSlots() {
    slots.replaceChildren();
    const item = services[state.service];
    if (!state.day || !item) {
      document.querySelector('[data-slot-caption]').textContent = 'Choisissez une prestation et un jour pour voir les créneaux simulés.';
      return 0;
    }
    const window = hours[weekdayForKey(state.day)];
    if (!window) return 0;
    document.querySelector('[data-slot-caption]').textContent = `${niceDate(state.day)} · horaires publics, à confirmer. Les créneaux « complet » sont fictifs.`;
    const now = parisParts();
    const nowKey = keyFromParts(now.year, now.month, now.day);
    const options = [];
    for (let minute = window[0]; minute + item.minutes <= window[1]; minute += 30) options.push(minute);
    let openCount = 0;
    options.forEach((minute) => {
      const past = state.day === nowKey && minute <= now.hour * 60 + now.minute;
      const taken = !past && deterministicTaken(state.day, minute);
      const wrap = document.createElement('div');
      wrap.className = `slot-choice${taken ? ' is-taken' : ''}`;
      const id = `slot-${state.day}-${minute}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'booking-time';
      input.id = id;
      input.value = shortTime(minute);
      input.disabled = past || taken;
      if (!input.disabled) openCount++;
      input.setAttribute('aria-label', `${timeText(minute)}${taken ? ', complet dans cette simulation' : past ? ', heure passée' : ''}`);
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = taken ? `${shortTime(minute)} · complet` : shortTime(minute);
      input.addEventListener('change', () => {
        state.time = shortTime(minute);
        syncSummary();
        document.querySelector('[data-slot-error]').hidden = true;
      });
      wrap.append(input, label);
      slots.append(wrap);
    });
    return openCount;
  }

  function showStep(number, push = true) {
    state.step = number;
    steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== number; });
    success.hidden = true;
    form.querySelector('[data-step-label]').textContent = `Étape ${number} sur 5`;
    form.querySelector('[data-progress]').style.transform = `scaleX(${number / 5})`;
    const heading = document.querySelector(`#step-title-${number}`);
    if (heading) heading.focus({ preventScroll: true });
    live.textContent = number === 3
      ? `Étape 3 sur 5. ${slots.querySelectorAll('input:not(:disabled)').length} créneaux libres le ${niceDate(state.day)} ; disponibilités fictives.`
      : `Étape ${number} sur 5.`;
    if (push) history.pushState({ step: number }, '', `?etape=${number}#booking`);
  }

  function errorVisible(selector, visible) {
    const element = document.querySelector(selector);
    if (element) element.hidden = !visible;
  }

  function validMobile(value) {
    const cleaned = value.replace(/[().-]/g, ' ').replace(/\s+/g, ' ').trim();
    return /^(?:0[67]|\+33\s?[67]|0033\s?[67])(?:\s?\d{2}){4}$/.test(cleaned);
  }

  function validateFor(next) {
    if (state.step === 1 && !state.service) {
      live.textContent = 'Choisissez une prestation pour continuer.';
      document.querySelector('[name="service"]').focus();
      return false;
    }
    if (state.step === 2 && !state.day) {
      errorVisible('[data-day-error]', true);
      live.textContent = 'Choisissez un jour où le salon est indiqué ouvert.';
      return false;
    }
    if (state.step === 3 && !state.time) {
      errorVisible('[data-slot-error]', true);
      live.textContent = 'Choisissez une heure disponible dans cette simulation.';
      return false;
    }
    if (state.step === 4) {
      const name = document.querySelector('#customer-name');
      const phone = document.querySelector('#customer-phone');
      const nameBad = name.value.trim().length < 2;
      const phoneBad = !validMobile(phone.value);
      errorVisible('#name-error', nameBad);
      errorVisible('#phone-error', phoneBad);
      if (nameBad || phoneBad) {
        live.textContent = nameBad ? 'Vérifiez le prénom.' : 'Vérifiez le numéro de téléphone mobile.';
        (nameBad ? name : phone).focus();
        return false;
      }
      state.name = name.value.trim();
      state.phone = phone.value.trim();
      renderRecap();
    }
    return next >= 1 && next <= 5;
  }

  function renderRecap() {
    const item = services[state.service];
    const rows = [
      ['Prestation', item.name],
      ['Jour', niceDate(state.day)],
      ['Heure', state.time],
      ['Durée estimée', `${item.minutes}\u00A0min*`],
      ['Prix indicatif', `${item.price}\u00A0€*`],
      ['Prénom', state.name],
      ['Téléphone', state.phone]
    ];
    const recap = document.querySelector('[data-recap]');
    recap.replaceChildren();
    rows.forEach(([term, value]) => {
      const wrapper = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = term;
      dd.textContent = value;
      wrapper.append(dt, dd);
      recap.append(wrapper);
    });
  }

  function submitSimulation() {
    const item = services[state.service];
    document.querySelector('[data-success-copy]').textContent = `${item.name}, ${niceDate(state.day)} à ${state.time}. Prix indicatif : ${item.price}\u00A0€. Cette demande n’a pas été envoyée.`;
    steps.forEach((step) => { step.hidden = true; });
    success.hidden = false;
    state.step = 6;
    history.pushState({ step: 6 }, '', '?etape=confirmee#booking');
    document.querySelector('#success-title').focus({ preventScroll: true });
    live.textContent = 'Simulation terminée. Rien n’a été envoyé.';
    calendarButton.hidden = false;
  }

  function restoreSuccess() {
    steps.forEach((step) => { step.hidden = true; });
    success.hidden = false;
    state.step = 6;
    calendarButton.hidden = false;
  }

  function parisLocalToUtc(key, time) {
    const [year, month, day] = parseKey(key);
    const [hour, minute] = time.split(':').map(Number);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    let guess = target;
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 3; i++) {
      const parts = fmt.formatToParts(new Date(guess)).reduce((out, part) => (out[part.type] = part.value, out), {});
      const displayedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      guess += target - displayedAsUtc;
    }
    return new Date(guess);
  }

  function downloadCalendar() {
    const item = services[state.service];
    const start = parisLocalToUtc(state.day, state.time);
    const end = new Date(start.getTime() + item.minutes * 60000);
    const dt = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const escapeIcs = (text) => text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@preview-studiolamy`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Simulation//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${uid}`, `DTSTAMP:${dt(new Date())}`, `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
      `SUMMARY:${escapeIcs(`Simulation · ${item.name} · Le Peigne Fin`)}`,
      `LOCATION:${escapeIcs('117 route du Polygone, 67000 Strasbourg')}`,
      `DESCRIPTION:${escapeIcs('Simulation de rendez-vous non transmise. Vérifier le créneau par téléphone au 03 88 84 04 88.')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-le-peigne-fin.ics';
    link.click();
    URL.revokeObjectURL(url);
  }

  document.querySelectorAll('[name="service"]').forEach((input) => input.addEventListener('change', () => {
    state.service = input.value;
    state.time = '';
    renderSlots();
    syncSummary();
  }));

  document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (!validateFor(next)) return;
    showStep(next);
  }));
  document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
    const step = Number(button.dataset.edit);
    if (!button.disabled) showStep(step);
  }));
  document.querySelectorAll('[data-book]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    state.service = link.dataset.book;
    state.day = '';
    state.time = '';
    syncSummary();
    renderDays();
    renderSlots();
    showStep(1);
    document.querySelector('#booking').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));
  form.addEventListener('submit', (event) => { event.preventDefault(); if (state.step === 5) submitSimulation(); });
  calendarButton.addEventListener('click', downloadCalendar);
  document.querySelector('[data-restart]').addEventListener('click', () => {
    state.service = ''; state.day = ''; state.time = ''; state.name = ''; state.phone = '';
    form.reset();
    calendarButton.hidden = true;
    syncSummary();
    renderDays();
    renderSlots();
    showStep(1);
  });

  const initialStep = new URLSearchParams(location.search).get('etape');
  if (initialStep && /^\d$/.test(initialStep) && Number(initialStep) >= 1 && Number(initialStep) <= 5) state.step = Number(initialStep);
  renderDays();
  renderSlots();
  syncSummary();
  steps.forEach((step) => { step.hidden = Number(step.dataset.step) !== state.step; });
  document.querySelector('[data-step-label]').textContent = `Étape ${state.step} sur 5`;
  document.querySelector('[data-progress]').style.transform = `scaleX(${state.step / 5})`;
  history.replaceState({ step: state.step }, '', location.href);
  window.addEventListener('popstate', (event) => {
    const next = Number(event.state && event.state.step);
    if (next >= 1 && next <= 5) showStep(next, false);
    else if (next === 6) restoreSuccess();
  });

  // Menu: preserve keyboard access and return focus to its trigger.
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  function closeMenu(returnFocus = false) {
    menuButton.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
    if (!open) nav.querySelector('a').focus();
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true); });

  // Open/closed status uses only the published directory hours and Europe/Paris time.
  const now = parisParts();
  const interval = hours[now.weekday];
  const currentMinute = now.hour * 60 + now.minute;
  const isOpen = Boolean(interval && currentMinute >= interval[0] && currentMinute < interval[1]);
  const statusText = interval ? `${isOpen ? 'Indiqué ouvert' : 'Indiqué fermé'} aujourd’hui · ${timeText(interval[0])} – ${timeText(interval[1])} · horaires à confirmer` : 'Indiqué fermé aujourd’hui · horaires à confirmer';
  document.querySelectorAll('[data-status]').forEach((el) => { el.textContent = statusText; el.classList.toggle('is-open', isOpen); });

  // The mobile action bar follows the hero actions and stays out of the booking and footer.
  const mobileBar = document.querySelector('[data-mobile-bar]');
  const heroActions = document.querySelector('.hero-actions');
  const bookingSection = document.querySelector('#booking');
  const footer = document.querySelector('.footer');
  if ('IntersectionObserver' in window) {
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const updateBar = () => mobileBar.classList.toggle('is-visible', !heroVisible && !bookingVisible && !footerVisible && matchMedia('(max-width: 860px)').matches);
    new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateBar(); }, { threshold: 0.05 }).observe(heroActions);
    new IntersectionObserver(([entry]) => { bookingVisible = entry.isIntersecting; updateBar(); }, { threshold: 0.05 }).observe(bookingSection);
    new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; updateBar(); }, { threshold: 0.05 }).observe(footer);
    matchMedia('(max-width: 860px)').addEventListener('change', updateBar);
  }

  // Once-only service row entrances; no content depends on this reveal.
  const serviceRows = [...document.querySelectorAll('[data-service-row]')];
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const reveal = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${Number([...serviceRows].indexOf(entry.target) % 4) * 55}ms`;
        entry.target.classList.add('is-seen');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.14 });
    serviceRows.forEach((row) => reveal.observe(row));
  } else serviceRows.forEach((row) => row.classList.add('is-seen'));

})();
