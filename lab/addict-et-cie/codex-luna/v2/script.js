/* Addict & Cie · registre de réservation simulé, sans envoi de données. */
window.__site = 1;
(() => {
  'use strict';

  const CONFIG = {
    shop: 'Addict & Cie',
    address: '3bis rue Saint-Epvre, 54000 Nancy',
    phone: '03 83 32 73 98',
    hours: {
      0: null,
      1: null,
      2: [540, 1110],
      3: [540, 1110],
      4: [540, 1110],
      5: [540, 1140],
      6: [540, 1020]
    },
    step: 30,
    days: 14
  };

  const SERVICES = {
    'coupe-femme-s': { name: 'Coupe femme · cheveux courts', short: 'Coupe femme, courts', minutes: 30, price: 45, priceLabel: 'Dès 45 €' },
    'coupe-femme-m': { name: 'Coupe femme · cheveux mi-longs', short: 'Coupe femme, mi-longs', minutes: 60, price: 55, priceLabel: 'Dès 55 €' },
    'coupe-homme': { name: 'Coupe homme', short: 'Coupe homme', minutes: 30, price: 30, priceLabel: '30 €' },
    'entretien-barbe': { name: 'Entretien coupe et barbe', short: 'Coupe + barbe', minutes: 60, price: 40, priceLabel: '40 €' },
    'balayage-court': { name: 'Forfait balayage · cheveux courts', short: 'Balayage, courts', minutes: 150, price: 156, priceLabel: '156 €' }
  };

  const doc = document;
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const timeZone = 'Europe/Paris';
  const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const clockParts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const weekdayParts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
  const NB = '\u00a0';

  const state = {
    step: 1,
    service: 'coupe-femme-s',
    day: null,
    slot: null,
    firstName: '',
    phone: ''
  };

  const booking = $('[data-booking]');
  if (!booking) return;
  const form = $('#booking-form');
  const status = $('[data-flow-status]');
  const panels = $$('[data-step]', booking);
  const summary = $('[data-summary]');
  const summaryEmpty = $('[data-summary-empty]');

  function partsMap(formatter, date = new Date()) {
    return Object.fromEntries(formatter.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  }

  function parisToday() {
    const parts = partsMap(dateParts);
    const clock = partsMap(clockParts);
    const weekday = weekdayParts.format(new Date());
    const weekdayNumber = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
    return {
      year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
      hour: Number(clock.hour), minute: Number(clock.minute), weekday: weekdayNumber
    };
  }

  function dateToValue(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function valueToDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function localTodayValue() {
    const now = parisToday();
    return dateToValue(new Date(Date.UTC(now.year, now.month - 1, now.day)));
  }

  function minutesNow() {
    const now = parisToday();
    return now.hour * 60 + now.minute;
  }

  function dateIsToday(value) { return value === localTodayValue(); }
  function dayName(value) { return dayLong.format(valueToDate(value)); }
  function dayNameShort(value) {
    const date = valueToDate(value);
    return `${dayShort.format(date).replace('.', '')} ${date.getUTCDate()} ${monthShort.format(date).replace('.', '')}`;
  }

  function padHour(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  function minutesToFrench(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h} h ${String(m).padStart(2, '0')}`;
    if (h) return `${h} h`;
    return `${m} min`;
  }

  function formatPrice(service) {
    return `${service.price}${NB}€`;
  }

  function publicHoliday(value) {
    const date = valueToDate(value);
    const year = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    if ((m === 1 && d === 1) || (m === 5 && (d === 1 || d === 8)) || (m === 7 && d === 14) || (m === 8 && d === 15) || (m === 11 && (d === 1 || d === 11)) || (m === 12 && d === 25)) return true;
    const easter = easterSunday(year);
    const easterMonday = addDays(easter, 1);
    const ascension = addDays(easter, 39);
    const pentecostMonday = addDays(easter, 50);
    return [easterMonday, ascension, pentecostMonday].some(holiday => dateToValue(holiday) === value);
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
    return new Date(Date.UTC(year, month - 1, day));
  }

  function addDays(date, amount) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + amount);
    return copy;
  }

  function makeDays() {
    const today = parisToday();
    const first = new Date(Date.UTC(today.year, today.month - 1, today.day));
    return Array.from({ length: CONFIG.days }, (_, index) => {
      const date = addDays(first, index);
      const value = dateToValue(date);
      return { date, value, weekday: date.getUTCDay(), closed: !CONFIG.hours[date.getUTCDay()], holiday: publicHoliday(value), today: index === 0 };
    });
  }

  function renderDays() {
    const container = $('[data-days]');
    if (!container) return;
    container.replaceChildren();
    makeDays().forEach((entry, index) => {
      const button = doc.createElement('button');
      const closed = entry.closed || entry.holiday;
      button.type = 'button';
      button.className = 'day-choice';
      button.dataset.date = entry.value;
      button.setAttribute('aria-label', `${dayName(entry.value)}${entry.holiday ? ', jour férié, ouverture à confirmer' : entry.closed ? ', fermé' : ''}`);
      button.setAttribute('aria-pressed', String(state.day === entry.value));
      if (closed) button.disabled = true;
      const label = entry.holiday ? 'Férié' : entry.closed ? 'Fermé' : entry.today ? 'Auj.' : index === 1 ? 'Demain' : '&nbsp;';
      const displayWeekday = dayShort.format(entry.date).replace('.', '');
      button.innerHTML = `<span class="day-choice__weekday">${displayWeekday}</span><strong class="day-choice__date">${entry.date.getUTCDate()}</strong><span class="day-choice__state">${label}</span>`;
      if (state.day === entry.value) button.setAttribute('aria-pressed', 'true');
      container.append(button);
    });
    updateSummary();
  }

  function stableHash(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function slotIsTaken(day, minute, serviceId) {
    const hash = stableHash(`${day}|${minute}|${serviceId}`);
    return hash % 8 === 2 || hash % 11 === 4;
  }

  function slotGroupName(minute) {
    if (minute < 12 * 60) return 'Matin';
    if (minute < 17 * 60) return 'Après-midi';
    return 'Fin de journée';
  }

  function renderSlots() {
    const container = $('[data-slots]');
    const intro = $('[data-slot-day]');
    const next = $('.flow-step[data-step="3"] [data-next]');
    if (!container || !state.day) return;
    const service = SERVICES[state.service];
    const hours = CONFIG.hours[valueToDate(state.day).getUTCDay()];
    container.replaceChildren();
    if (intro) intro.textContent = `${dayName(state.day)} · horaires recensés, à confirmer.`;
    if (!hours || publicHoliday(state.day)) {
      const message = doc.createElement('p');
      message.className = 'slot-empty';
      message.textContent = publicHoliday(state.day) ? 'Jour férié · ouverture à confirmer avec le salon.' : 'Le salon est indiqué fermé ce jour-là.';
      container.append(message);
      if (next) next.disabled = true;
      updateSummary();
      return;
    }

    const slotsByGroup = new Map([['Matin', []], ['Après-midi', []], ['Fin de journée', []]]);
    for (let minute = hours[0]; minute + service.minutes <= hours[1]; minute += CONFIG.step) {
      if (dateIsToday(state.day) && minute <= minutesNow()) continue;
      slotsByGroup.get(slotGroupName(minute)).push({ minute, taken: slotIsTaken(state.day, minute, state.service) });
    }

    const freeCount = Array.from(slotsByGroup.values()).flat().filter(slot => !slot.taken).length;
    const count = doc.createElement('p');
    count.className = 'field-hint';
    count.textContent = `${freeCount} créneau${freeCount > 1 ? 'x' : ''} disponible${freeCount > 1 ? 's' : ''} dans cette simulation.`;
    container.append(count);
    if (status) status.textContent = `${freeCount} créneau${freeCount > 1 ? 'x' : ''} le ${dayName(state.day)}.`;

    let radioIndex = 0;
    slotsByGroup.forEach((slots, label) => {
      if (!slots.length) return;
      const fieldset = doc.createElement('fieldset');
      fieldset.className = 'slot-group';
      const legend = doc.createElement('legend');
      legend.textContent = label;
      const grid = doc.createElement('div');
      grid.className = 'slot-grid';
      slots.forEach(slot => {
        const id = `slot-${radioIndex++}`;
        const wrapper = doc.createElement('div');
        wrapper.className = `slot-option${slot.taken ? ' slot-option--taken' : ''}`;
        const input = doc.createElement('input');
        input.type = 'radio';
        input.name = 'slot';
        input.id = id;
        input.value = padHour(slot.minute);
        input.disabled = slot.taken;
        input.checked = state.slot === input.value;
        input.setAttribute('aria-label', slot.taken ? `${padHour(slot.minute)}, déjà réservé` : padHour(slot.minute));
        const slotLabel = doc.createElement('label');
        slotLabel.htmlFor = id;
        const time = doc.createElement('time');
        time.dateTime = `${state.day}T${padHour(slot.minute)}`;
        time.textContent = padHour(slot.minute);
        slotLabel.append(time);
        if (slot.taken) {
          const small = doc.createElement('span');
          small.className = 'slot-taken-text';
          small.textContent = 'Déjà pris';
          slotLabel.append(small);
        }
        wrapper.append(input, slotLabel);
        grid.append(wrapper);
      });
      fieldset.append(legend, grid);
      container.append(fieldset);
    });

    if (freeCount === 0) {
      const noSlots = doc.createElement('p');
      noSlots.className = 'slot-empty';
      noSlots.textContent = 'Aucun créneau disponible dans cette simulation. Choisissez un autre jour.';
      container.append(noSlots);
    }
    if (next) next.disabled = true;
    updateSummary();
  }

  function selectedService() { return SERVICES[state.service]; }

  function updateSummary() {
    const service = selectedService();
    const serviceEl = $('[data-summary-service]');
    const dayEl = $('[data-summary-day]');
    const timeEl = $('[data-summary-time]');
    const durationEl = $('[data-summary-duration]');
    const priceEl = $('[data-summary-price]');
    if (!serviceEl) return;
    serviceEl.textContent = service.name;
    durationEl.textContent = minutesToFrench(service.minutes);
    priceEl.textContent = service.priceLabel;
    dayEl.textContent = state.day ? dayNameShort(state.day) : 'À choisir';
    timeEl.textContent = state.slot || 'À choisir';
    const hasSelection = Boolean(state.service);
    if (summary) summary.hidden = !hasSelection;
    if (summaryEmpty) summaryEmpty.hidden = hasSelection;
    $$('[data-edit-step]').forEach(button => {
      const targetStep = Number(button.dataset.editStep);
      button.disabled = (targetStep === 2 && !state.day) || (targetStep === 3 && !state.slot);
    });
    const recap = $('[data-recap]');
    if (recap) {
      const dayText = state.day ? dayName(state.day) : 'jour à choisir';
      const timeText = state.slot || 'heure à choisir';
      recap.innerHTML = `<p><strong>${service.name}</strong> · ${minutesToFrench(service.minutes)} · tarif indicatif ${service.priceLabel}</p><p>${dayText} · ${timeText}</p>`;
    }
  }

  function setStep(nextStep, announce = true) {
    state.step = nextStep;
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.step) !== nextStep; });
    const progress = $('[data-progress]');
    const stepCount = $('[data-step-count]');
    if (progress) progress.style.transform = `scaleX(${Math.min(nextStep, 4) / 4})`;
    if (stepCount) stepCount.textContent = nextStep === 5 ? 'CARTE AJOUTÉE' : `ÉTAPE ${nextStep} / 4`;
    if (announce) {
      const heading = $(`#step-${['', 'one', 'two', 'three', 'four', 'five'][nextStep]}-title`);
      if (status) status.textContent = nextStep === 5 ? 'Simulation ajoutée au registre. Rien n’a été envoyé.' : `Étape ${nextStep} sur 4.`;
      if (heading) requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    }
    if (nextStep === 2) renderDays();
    if (nextStep === 3) renderSlots();
    if (nextStep === 4) {
      state.firstName = $('#first-name')?.value.trim() || state.firstName;
      state.phone = $('#phone')?.value.trim() || state.phone;
      updateSummary();
    }
  }

  function clearErrors() {
    $('#first-name-error').textContent = '';
    $('#phone-error').textContent = '';
    $('#first-name').removeAttribute('aria-invalid');
    $('#phone').removeAttribute('aria-invalid');
  }

  function validFrenchMobile(value) {
    const compact = value.replace(/[\s().-]/g, '');
    return /^(0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }

  function validateContact() {
    clearErrors();
    const nameInput = $('#first-name');
    const phoneInput = $('#phone');
    const firstName = nameInput.value.trim();
    const phoneValue = phoneInput.value.trim();
    let valid = true;
    if (firstName.length < 2) {
      $('#first-name-error').textContent = 'Indiquez un prénom d’au moins deux lettres.';
      nameInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!validFrenchMobile(phoneValue)) {
      $('#phone-error').textContent = 'Indiquez un numéro mobile français, par exemple 06 12 34 56 78.';
      phoneInput.setAttribute('aria-invalid', 'true');
      valid = false;
    }
    if (!valid) {
      const firstInvalid = $('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return false;
    }
    state.firstName = firstName;
    state.phone = phoneValue;
    return true;
  }

  function renderSuccess() {
    const name = $('[data-success-name]');
    const card = $('[data-success-card]');
    const service = selectedService();
    const date = state.day ? dayName(state.day) : '';
    if (name) name.textContent = state.firstName;
    if (card) {
      card.innerHTML = `<dt>Prestation</dt><dd>${service.name}</dd><dt>Jour</dt><dd>${date}</dd><dt>Heure</dt><dd>${state.slot}</dd><dt>Durée</dt><dd>${minutesToFrench(service.minutes)}</dd><dt>Tarif indicatif</dt><dd>${service.priceLabel}</dd><dt>Adresse</dt><dd>${CONFIG.address}</dd>`;
    }
  }

  function frenchOffsetMinutes(date) {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date);
    const label = parts.find(part => part.type === 'timeZoneName')?.value || 'GMT+1';
    const match = label.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return 60;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] || 0));
  }

  function parisLocalDateTime(value, time) {
    const [year, month, day] = value.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const naive = Date.UTC(year, month - 1, day, hour, minute);
    const offset = frenchOffsetMinutes(new Date(naive));
    return new Date(naive - offset * 60000);
  }

  function escapeIcs(value) { return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function icsStamp(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function foldIcsLine(line) {
    const chunks = [];
    let chunk = '';
    let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 73) {
        chunks.push(chunk);
        chunk = ` ${char}`;
        bytes = size + 1;
      } else {
        chunk += char;
        bytes += size;
      }
    }
    chunks.push(chunk);
    return chunks.join('\r\n');
  }

  function downloadCalendar() {
    if (!state.day || !state.slot) return;
    const service = selectedService();
    const start = parisLocalDateTime(state.day, state.slot);
    const end = new Date(start.getTime() + service.minutes * 60000);
    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Addict Cie//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${state.day.replace(/-/g, '')}-${state.slot.replace(':', '')}-${stableHash(service.name)}@addict-et-cie.preview`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${escapeIcs(`${service.name} — Addict & Cie`)}`,
      `LOCATION:${escapeIcs(CONFIG.address)}`,
      `DESCRIPTION:${escapeIcs('Simulation depuis un aperçu non officiel. Ce rendez-vous n’a pas été transmis au salon. Téléphone : ' + CONFIG.phone)}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.map(foldIcsLine).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const link = doc.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rdv-addict-et-cie.ics';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function nextOpenDayName(fromWeekday) {
    for (let offset = 1; offset < 8; offset += 1) {
      const day = (fromWeekday + offset) % 7;
      if (CONFIG.hours[day]) return { day, hours: CONFIG.hours[day] };
    }
    return null;
  }

  function renderOpenStatus() {
    const target = $('[data-open-status]');
    if (!target) return;
    const today = parisToday();
    const nowDay = today.weekday;
    const hours = CONFIG.hours[nowDay];
    const current = today.hour * 60 + today.minute;
    const row = $(`[data-hours-day="${nowDay}"]`);
    if (row) row.classList.add('is-today');
    if (!hours) {
      const next = nextOpenDayName(nowDay);
      const weekdayName = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][next.day];
      const openingHour = `${Math.floor(next.hours[0] / 60)} h`;
      target.textContent = `Fermé aujourd’hui · réouverture ${weekdayName} à ${openingHour}`;
      return;
    }
    if (current >= hours[0] && current < hours[1]) {
      target.textContent = `Ouvert jusqu’à ${Math.floor(hours[1] / 60)} h${hours[1] % 60 ? ` ${String(hours[1] % 60).padStart(2, '0')}` : ''} · horaire à confirmer`;
      target.closest('.hours-now')?.classList.add('is-open');
    } else if (current < hours[0]) {
      target.textContent = `Ouvre aujourd’hui à ${Math.floor(hours[0] / 60)} h · horaire à confirmer`;
    } else {
      const next = nextOpenDayName(nowDay);
      const weekdayName = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][next.day];
      target.textContent = `Fermé · prochaine ouverture ${weekdayName} à ${Math.floor(next.hours[0] / 60)} h`;
    }
  }

  function setupHours() {
    const today = parisToday();
    $$('[data-hours-day]').forEach(row => row.classList.toggle('is-today', Number(row.dataset.hoursDay) === today.weekday));
    renderOpenStatus();
  }

  function setupMobileBar() {
    const bar = $('[data-mobile-bar]');
    const heroAction = $('.hero__actions');
    const footer = $('.site-footer');
    if (!bar) return;
    if (!('IntersectionObserver' in window)) {
      bar.classList.add('is-visible');
      return;
    }
    let heroVisible = true;
    let footerVisible = false;
    const update = () => bar.classList.toggle('is-visible', !heroVisible && !footerVisible);
    if (heroAction) {
      new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; update(); }, { threshold: 0.01 }).observe(heroAction);
    }
    if (footer) {
      new IntersectionObserver(([entry]) => { footerVisible = entry.isIntersecting; update(); }, { threshold: 0.03 }).observe(footer);
    }
  }

  function setupCopyAddress() {
    const button = $('[data-copy-address]');
    const message = $('[data-copy-status]');
    if (!button || !message) return;
    button.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(CONFIG.address);
        } else {
          const input = doc.createElement('textarea');
          input.value = CONFIG.address;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          doc.body.append(input);
          input.select();
          doc.execCommand('copy');
          input.remove();
        }
        message.textContent = 'Adresse copiée.';
      } catch (error) {
        message.textContent = 'Copie impossible ici. Sélectionnez : ' + CONFIG.address;
      }
    });
  }

  function setupInteractions() {
    $$('[data-next]', booking).forEach(button => button.addEventListener('click', () => {
      if (state.step === 1 && state.service) setStep(2);
      else if (state.step === 2 && state.day) setStep(3);
      else if (state.step === 3 && state.slot) setStep(4);
    }));

    $$('[data-prev]', booking).forEach(button => button.addEventListener('click', () => {
      if (state.step > 1 && state.step < 5) setStep(state.step - 1);
    }));

    $$('input[name="service"]', booking).forEach(input => input.addEventListener('change', () => {
      state.service = input.value;
      state.day = null;
      state.slot = null;
      updateSummary();
    }));

    $('[data-days]')?.addEventListener('click', event => {
      const button = event.target.closest('.day-choice');
      if (!button || button.disabled) return;
      state.day = button.dataset.date;
      state.slot = null;
      $$('.day-choice', $('[data-days]')).forEach(day => day.setAttribute('aria-pressed', String(day === button)));
      const next = $('.flow-step[data-step="2"] [data-next]');
      if (next) next.disabled = false;
      const dateLabel = dayName(state.day);
      if (status) status.textContent = `Jour sélectionné : ${dateLabel}. Les heures vont s’afficher.`;
      updateSummary();
    });

    $('[data-slots]')?.addEventListener('change', event => {
      const input = event.target.closest('input[name="slot"]');
      if (!input || input.disabled) return;
      state.slot = input.value;
      const next = $('.flow-step[data-step="3"] [data-next]');
      if (next) next.disabled = false;
      if (status) status.textContent = `Heure sélectionnée : ${state.slot}.`;
      updateSummary();
    });

    $('#first-name')?.addEventListener('input', event => {
      state.firstName = event.target.value;
      if (event.target.value.trim().length >= 2) $('#first-name-error').textContent = '';
    });
    $('#phone')?.addEventListener('input', event => {
      state.phone = event.target.value;
      if (validFrenchMobile(event.target.value)) $('#phone-error').textContent = '';
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (state.step !== 4 || !validateContact()) return;
      renderSuccess();
      setStep(5);
    });

    $('[data-ics]')?.addEventListener('click', downloadCalendar);
    $('[data-restart]')?.addEventListener('click', () => {
      state.day = null;
      state.slot = null;
      state.firstName = '';
      state.phone = '';
      form.reset();
      const defaultRadio = $('input[name="service"][value="coupe-femme-s"]');
      if (defaultRadio) defaultRadio.checked = true;
      state.service = 'coupe-femme-s';
      clearErrors();
      updateSummary();
      setStep(1);
    });

    $$('[data-book]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.book;
      if (!SERVICES[id]) return;
      state.service = id;
      state.day = null;
      state.slot = null;
      const radio = $(`input[name="service"][value="${id}"]`, booking);
      if (radio) radio.checked = true;
      updateSummary();
      setStep(1);
      $('#reserver').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }));

    $$('[data-edit-step]').forEach(button => button.addEventListener('click', () => {
      const step = Number(button.dataset.editStep);
      if (step >= 1 && step <= 4) setStep(step);
    }));
  }

  function setupReveals() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elements = $$('[data-reveal]');
    if (!elements.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    doc.documentElement.classList.add('reveal-ready');
    elements.forEach(element => observer.observe(element));
  }

  function init() {
    setupHours();
    setupCopyAddress();
    setupMobileBar();
    setupInteractions();
    updateSummary();
    setupReveals();
  }

  init();
})();
