window.__site = 1;
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const PLANITY = 'https://www.planity.com/thibaut-coiffure-30900-nimes';
  const CFG = {
    name: 'Thibaut Coiffure',
    address: '78 avenue Jean Jaurès, 30900 Nîmes',
    phone: '04 66 27 28 50',
    hours: { 0: null, 1: null, 2: [540, 1170], 3: [540, 1200], 4: [540, 1170], 5: [540, 1200], 6: [540, 1200] },
    days: 14,
    step: 30,
    ics: 'rendez-vous-thibaut-coiffure.ics'
  };
  const SERVICES = {
    'f-court': { name: 'Coupe femme · cheveux courts', short: 'Coupe femme, cheveux courts', minutes: 30, price: 41, priceText: '41 €' },
    'f-mi': { name: 'Coupe femme · cheveux mi-longs', short: 'Coupe femme, cheveux mi-longs', minutes: 30, price: 46, priceText: '46 €' },
    'f-long': { name: 'Coupe femme · cheveux longs', short: 'Coupe femme, cheveux longs', minutes: 60, price: 51, priceText: '51 €' },
    transform: { name: 'Coupe transformation', short: 'Coupe transformation', minutes: 60, price: 60, priceText: '60 €' },
    homme: { name: 'Coupe homme', short: 'Coupe homme', minutes: 30, price: 25, priceText: '25 €' },
    balayage: { name: 'Balayage soft · à partir de', short: 'Balayage soft', minutes: 210, price: 158, priceText: 'dès 158 €' },
    intense: { name: 'Balayage intense · à partir de', short: 'Balayage intense', minutes: 270, price: 200, priceText: 'dès 200 €' }
  };
  const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const stepOrder = ['service', 'day', 'time', 'details'];
  let currentStep = 'service';
  let selectedDay = '';
  let selectedTime = '';
  let appointmentName = '';

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const result = {};
    parts.forEach((part) => { result[part.type] = part.value; });
    return { year: +result.year, month: +result.month, day: +result.day, hour: +result.hour % 24, minute: +result.minute };
  }
  const isoFromParts = (p) => `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  function todayParis() {
    const p = parisParts();
    const noon = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
    return { ...p, dow: noon.getUTCDay(), now: p.hour * 60 + p.minute, date: noon };
  }
  const displayTime = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  const euro = (amount) => `${amount}${NB}€`;
  const longDate = (iso) => {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00Z`);
    return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  };
  const shortDay = (iso) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return { weekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(d).replace('.', ''), day: d.getUTCDate() };
  };

  function updateOpenStatus() {
    const target = $('[data-open-status]');
    if (!target) return;
    const t = todayParis();
    const schedule = CFG.hours[t.dow];
    if (!schedule) {
      target.textContent = 'Fermé aujourd’hui · horaires Planity';
      return;
    }
    const [open, close] = schedule;
    if (t.now >= open && t.now < close) target.textContent = `Ouvert actuellement · ferme à ${displayTime(close).replace(':', ` h `)}`;
    else if (t.now < open) target.textContent = `Ouvre aujourd’hui à ${displayTime(open).replace(':', ` h `)}`;
    else target.textContent = 'Fermé actuellement · horaires Planity';
  }
  updateOpenStatus();

  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-menu');
  function closeMenu(returnFocus = false) {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menu.hidden = expanded;
    if (!expanded) $('a', menu)?.focus();
  });
  menu?.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true); });

  const strand = $('.strand-stage');
  if (strand && !reduce.matches) {
    strand.classList.add('is-arriving');
    requestAnimationFrame(() => requestAnimationFrame(() => strand.classList.remove('is-arriving')));
  }

  // Copy the exact address without requiring clipboard support.
  $('[data-copy-address]')?.addEventListener('click', async () => {
    const status = $('[data-copy-status]');
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(CFG.address);
      else {
        const field = document.createElement('textarea');
        field.value = CFG.address; field.setAttribute('readonly', ''); field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.append(field); field.select(); document.execCommand('copy'); field.remove();
      }
      status.textContent = 'Adresse copiée.';
    } catch (_) { status.textContent = CFG.address; }
  });

  // Booking preview: nothing is sent to the salon.
  const flow = $('[data-booking-flow]');
  if (!flow) return;
  const summary = {
    service: $('[data-summary-service]'), duration: $('[data-summary-duration]'), price: $('[data-summary-price]'),
    day: $('[data-summary-day]'), time: $('[data-summary-time]')
  };
  const priceDisplay = (service) => service.priceText.replace('€', `${NB}€`);
  const durationDisplay = (minutes) => minutes < 60 ? `${minutes}${NB}min` : `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? `${NB}${String(minutes % 60).padStart(2, '0')}` : ''}`;
  function chosenService() {
    const radio = $('input[name="service"]:checked', flow);
    return radio ? { key: radio.value, ...SERVICES[radio.value] } : null;
  }
  function updateSummary() {
    const service = chosenService();
    if (service) {
      summary.service.textContent = service.name;
      summary.duration.textContent = durationDisplay(service.minutes);
      summary.price.textContent = priceDisplay(service);
    }
    summary.day.textContent = selectedDay ? longDate(selectedDay) : 'À choisir';
    summary.time.textContent = selectedTime || 'À choisir';
  }
  updateSummary();
  flow.addEventListener('change', (event) => {
    if (event.target.name === 'service') { completed.clear(); selectedDay = ''; selectedTime = ''; updateSummary(); updateStepNav(); }
  });

  function addDays(iso, count) {
    const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10);
  }
  function easterSunday(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  function isFrenchHoliday(iso) {
    const d = new Date(`${iso}T12:00:00Z`), year = d.getUTCFullYear(), mmdd = iso.slice(5);
    const fixed = new Set(['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25']);
    if (fixed.has(mmdd)) return true;
    const easter = easterSunday(year), day = d.getTime(), delta = 86400000;
    return [1,39,50].some((offset) => day === easter.getTime() + offset * delta);
  }
  function buildDays() {
    const holder = $('[data-days]');
    const today = todayParis();
    const first = isoFromParts(today);
    let firstOpen = '';
    holder.replaceChildren();
    for (let i = 0; i < CFG.days; i += 1) {
      const iso = addDays(first, i);
      const d = new Date(`${iso}T12:00:00Z`);
      const dow = d.getUTCDay();
      const closed = CFG.hours[dow] === null;
      const parts = shortDay(iso);
      const wrap = document.createElement('div'); wrap.className = 'day-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'appointment-day'; input.id = `day-${iso}`; input.value = iso; input.disabled = closed;
      input.setAttribute('aria-label', `${parts.weekday} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${closed ? ', fermé' : ''}`);
      const label = document.createElement('label'); label.htmlFor = input.id; if (closed) label.classList.add('is-closed');
      const weekday = document.createElement('span'); weekday.textContent = parts.weekday;
      const date = document.createElement('strong'); date.textContent = String(parts.day);
      const note = document.createElement('small'); note.textContent = closed ? 'Fermé' : (isFrenchHoliday(iso) ? 'Férié*' : MONTHS[d.getUTCMonth()].slice(0,3));
      label.append(weekday, date, note); wrap.append(input, label); holder.append(wrap);
      if (!closed && !firstOpen) firstOpen = iso;
    }
    if (firstOpen) {
      const radio = $(`#day-${firstOpen}`); radio.checked = true; selectedDay = firstOpen;
      radio.addEventListener('change', () => { selectedDay = radio.value; selectedTime = ''; updateSummary(); });
    }
    $$('input[name="appointment-day"]', holder).forEach((radio) => radio.addEventListener('change', () => { selectedDay = radio.value; selectedTime = ''; updateSummary(); }));
    updateSummary();
  }
  function hashSlot(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function renderSlots() {
    const holder = $('[data-slots]');
    const service = chosenService();
    if (!selectedDay || !service) return;
    const day = new Date(`${selectedDay}T12:00:00Z`).getUTCDay();
    const hours = CFG.hours[day];
    const [open, close] = hours;
    const times = [];
    for (let minute = open; minute + service.minutes <= close; minute += CFG.step) times.push(minute);
    holder.replaceChildren(); selectedTime = '';
    const taken = new Set(times.filter((minute, index) => hashSlot(`${selectedDay}/${service.key}/${minute}`) % 7 === 0 && index % 6 !== 0).slice(0, Math.max(0, times.length - 1)));
    const now = todayParis();
    const isToday = selectedDay === isoFromParts(now);
    times.forEach((minute, index) => {
      const wrap = document.createElement('div'); wrap.className = 'slot-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'appointment-time'; input.id = `time-${minute}`; input.value = displayTime(minute);
      const label = document.createElement('label'); label.htmlFor = input.id; label.textContent = displayTime(minute);
      const past = isToday && minute <= now.now;
      const busy = taken.has(minute);
      if (past) { input.disabled = true; label.classList.add('is-past'); label.title = 'Heure passée'; }
      else if (busy) { input.disabled = true; label.classList.add('is-taken'); label.textContent += ' · Déjà pris'; label.title = 'Créneau déjà pris dans cette simulation'; }
      if (!past && !busy && !selectedTime) { input.checked = true; selectedTime = input.value; }
      input.addEventListener('change', () => { selectedTime = input.value; updateSummary(); });
      wrap.append(input, label); holder.append(wrap);
    });
    $('[data-time-error]').hidden = true;
    $('[data-time-intro]').textContent = `${longDate(selectedDay)} · durée ${durationDisplay(service.minutes)} · horaires publiés du salon.`;
    updateSummary();
  }

  const navButtons = $$('[data-step-link]');
  const completed = new Set();
  function updateStepNav() {
    navButtons.forEach((button) => {
      const key = button.dataset.stepLink;
      button.disabled = !(key === currentStep || completed.has(key));
      if (key === currentStep) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function activateStep(key, focus = true) {
    const old = $(`[data-step="${currentStep}"]`, flow);
    const next = $(`[data-step="${key}"]`, flow);
    if (!next) return;
    if (old && old !== next) {
      if (!reduce.matches) {
        old.classList.add('is-exiting');
        window.setTimeout(() => { old.hidden = true; old.classList.remove('is-exiting'); }, 220);
      } else old.hidden = true;
    }
    currentStep = key;
    next.hidden = false;
    if (!reduce.matches) {
      next.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('is-entering')));
    }
    updateStepNav();
    if (focus) window.setTimeout(() => $('h3', next)?.focus(), reduce.matches ? 0 : 180);
  }
  navButtons.forEach((button) => button.addEventListener('click', () => {
    if (!button.disabled && completed.has(button.dataset.stepLink)) {
      if (button.dataset.stepLink === 'time') renderSlots();
      activateStep(button.dataset.stepLink);
    }
  }));

  function setService(key) {
    const input = $(`input[name="service"][value="${CSS.escape(key)}"]`, flow);
    if (!input) return;
    input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    completed.clear(); selectedDay = ''; selectedTime = ''; updateSummary(); activateStep('service', false);
  }
  $$('[data-select-service]').forEach((button) => button.addEventListener('click', () => {
    setService(button.dataset.selectService);
    $('#reservation').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => $('#step-service-title')?.focus(), reduce.matches ? 0 : 350);
  }));
  $$('[data-next]', flow).forEach((button) => button.addEventListener('click', (event) => {
    const step = event.currentTarget.closest('[data-step]').dataset.step;
    if (step === 'service') {
      if (!chosenService()) return;
      completed.add('service'); buildDays(); activateStep('day');
    } else if (step === 'day') {
      const selected = $('input[name="appointment-day"]:checked', flow);
      if (!selected || selected.disabled) return;
      selectedDay = selected.value; renderSlots(); completed.add('day'); activateStep('time');
    } else if (step === 'time') {
      const selected = $('input[name="appointment-time"]:checked', flow);
      if (!selected || selected.disabled) { $('[data-time-error]').hidden = false; $('#step-time-title').focus(); return; }
      selectedTime = selected.value; updateSummary(); completed.add('time'); buildRecap(); activateStep('details');
    }
  }));
  $$('[data-back]', flow).forEach((button) => button.addEventListener('click', () => {
    const step = button.closest('[data-step]').dataset.step;
    if (step === 'day') activateStep('service');
    else if (step === 'time') activateStep('day');
    else if (step === 'details') activateStep('time');
  }));
  $('[data-days]')?.addEventListener('change', (event) => {
    if (event.target.name === 'appointment-day') { selectedDay = event.target.value; selectedTime = ''; updateSummary(); }
  });
  $('[data-slots]')?.addEventListener('change', (event) => {
    if (event.target.name === 'appointment-time') { selectedTime = event.target.value; updateSummary(); }
  });
  function buildRecap() {
    const service = chosenService();
    $('[data-final-recap]').textContent = `${service.name} · ${longDate(selectedDay)} à ${selectedTime} · ${priceDisplay(service)} (tarif indicatif).`;
  }
  const nameInput = $('#guest-name');
  const phoneInput = $('#guest-phone');
  const detailsForm = $('.details-form');
  function normalizePhone(value) { return value.replace(/[\s().-]/g, ''); }
  function validMobile(value) {
    const compact = normalizePhone(value);
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }
  function setInvalid(input, error, invalid) {
    input.setAttribute('aria-invalid', String(invalid)); error.hidden = !invalid;
  }
  nameInput?.addEventListener('input', () => setInvalid(nameInput, $('#name-error'), !nameInput.value.trim()));
  phoneInput?.addEventListener('input', () => setInvalid(phoneInput, $('#phone-error'), !validMobile(phoneInput.value)));

  function localParisToUtc(iso, time) {
    const dateParts = iso.split('-').map(Number);
    const timeParts = time.split(':').map(Number);
    const localAsUtc = Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    const p = parisParts(new Date(localAsUtc));
    const parisAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    return new Date(localAsUtc - (parisAsUtc - localAsUtc));
  }
  function utcICS(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function createICS() {
    const service = chosenService();
    const parts = selectedTime.split(':').map(Number);
    const endLocal = new Date(selectedDay + 'T12:00:00Z');
    endLocal.setUTCHours(parts[0], parts[1] + service.minutes, 0, 0);
    const endIso = endLocal.toISOString().slice(0, 10);
    const endTime = String(endLocal.getUTCHours()).padStart(2, '0') + ':' + String(endLocal.getUTCMinutes()).padStart(2, '0');
    const escapeICS = (value) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const uid = String(Date.now()) + '-preview-thibaut@studiolamy.local';
    const lines = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Studio Lamy//Apercu Thibaut Coiffure//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'BEGIN:VEVENT','UID:' + uid,'DTSTAMP:' + utcICS(new Date()),
      'DTSTART:' + utcICS(localParisToUtc(selectedDay, selectedTime)),'DTEND:' + utcICS(localParisToUtc(endIso, endTime)),
      'SUMMARY:' + escapeICS(service.short + ' · Thibaut Coiffure'),'LOCATION:' + escapeICS(CFG.address),
      'DESCRIPTION:' + escapeICS('Créneau de démonstration non transmis. Confirmer le rendez-vous sur Planity.'),'END:VEVENT','END:VCALENDAR'
    ];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }
  detailsForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameInvalid = !nameInput.value.trim();
    const phoneInvalid = !validMobile(phoneInput.value);
    setInvalid(nameInput, $('#name-error'), nameInvalid);
    setInvalid(phoneInput, $('#phone-error'), phoneInvalid);
    if (nameInvalid || phoneInvalid) { (nameInvalid ? nameInput : phoneInput).focus(); return; }
    appointmentName = nameInput.value.trim();
    const service = chosenService();
    $('[data-success-copy]').textContent = `${appointmentName}, votre créneau simulé : ${service.short}, ${longDate(selectedDay)} à ${selectedTime}. Rien n’a été transmis au salon. Pour confirmer ce rendez-vous, passez par la page Planity.`;
    $('[data-ics]').href = createICS();
    completed.add('details');
    activateStep('success');
    navButtons.forEach((button) => { button.disabled = true; button.removeAttribute('aria-current'); });
  });
  $('[data-reset]')?.addEventListener('click', () => {
    detailsForm.reset(); selectedDay = ''; selectedTime = ''; completed.clear();
    const first = $('input[name="service"]', flow); if (first) first.checked = true;
    updateSummary(); activateStep('service');
  });

  // Escape menu and keep a valid status if a user changes the machine's clock.
  window.setInterval(updateOpenStatus, 60000);
})();
