(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  requestAnimationFrame(() => document.body.classList.add('is-ready'));

  const revealItems = $$('.reveal, [data-draw], [data-draw-x]');
  const revealNow = (item) => {
    item.classList.add('is-visible', 'is-drawn');
  };
  if (reduceMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach(revealNow);
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const actionBar = $('[data-action-bar]');
  if (actionBar && 'IntersectionObserver' in window) {
    const seen = { hero: true, booking: false, footer: false };
    const syncBar = () => {
      const visible = !seen.hero && !seen.booking && !seen.footer;
      actionBar.classList.toggle('is-visible', visible);
      actionBar.setAttribute('aria-hidden', String(!visible));
      if (visible) actionBar.removeAttribute('inert');
      else actionBar.setAttribute('inert', '');
    };
    const heroCta = $('.hero__links');
    const bookingSection = $('.booking');
    const footer = $('.site-foot');
    const actionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroCta) seen.hero = entry.isIntersecting || entry.boundingClientRect.top >= 0;
        if (entry.target === bookingSection) seen.booking = entry.isIntersecting;
        if (entry.target === footer) seen.footer = entry.isIntersecting;
      });
      syncBar();
    }, { threshold: 0.01 });
    if (heroCta) actionObserver.observe(heroCta);
    if (bookingSection) actionObserver.observe(bookingSection);
    if (footer) actionObserver.observe(footer);
  }

  const form = $('[data-booking-form]');
  if (!form) return;

  const hours = {
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 19 * 60]
  };
  const services = {
    coupe: { name: 'Coupe masculine' },
    soin: { name: 'Soin capillaire' }
  };
  const state = {
    step: 1,
    maxStep: 1,
    service: 'coupe',
    day: null,
    time: null,
    firstName: ''
  };
  const panes = $$('.book-pane', form);
  const progress = $$('[data-progress]', form);
  const live = $('[data-book-live]', form);
  const daysRoot = $('[data-days]', form);
  const slotsRoot = $('[data-slots]', form);
  const nameInput = $('#contact-name', form);
  const phoneInput = $('#contact-phone', form);

  const pad = (number) => String(number).padStart(2, '0');
  const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };
  const capitalize = (value) => value.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase('fr-FR'));
  const formatDay = (key, options = {}) => new Intl.DateTimeFormat('fr-FR', {
    weekday: options.short ? 'short' : 'long',
    day: 'numeric',
    month: options.short ? 'short' : 'long'
  }).format(parseDate(key));
  const formatTime = (minutes) => `${pad(Math.floor(minutes / 60))} h ${pad(minutes % 60)}`;
  const formatSlot = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const currentService = () => services[state.service] || services.coupe;
  const currentDate = () => state.day ? parseDate(state.day) : null;
  const dayIsOpen = (date) => Object.prototype.hasOwnProperty.call(hours, date.getDay());

  function renderDays() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayKey = dateKey(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dateKey(tomorrow);
    const markup = [];

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const key = dateKey(date);
      const closed = !dayIsOpen(date);
      const selected = state.day === key;
      const special = key === todayKey ? 'Auj.' : (key === tomorrowKey ? 'Dem.' : (closed ? 'fermé' : '&nbsp;'));
      const label = `${capitalize(formatDay(key))}${closed ? ', fermé' : ''}`;
      markup.push(`<button class="day-choice" type="button" data-date="${key}" aria-label="${label}" aria-pressed="${selected}"${closed ? ' disabled' : ''}>` +
        `<span class="day-choice__week">${formatDay(key, { short: true })}</span>` +
        `<span class="day-choice__date">${date.getDate()}</span>` +
        `<span class="day-choice__state">${closed ? 'fermé' : special}</span></button>`);
    }
    daysRoot.innerHTML = markup.join('');
  }

  function takenSlot(day, minute) {
    const date = parseDate(day);
    const seed = date.getDate() * 17 + (date.getMonth() + 1) * 31 + minute * 7;
    return seed % 9 === 0;
  }

  function renderSlots() {
    if (!state.day) {
      slotsRoot.innerHTML = '<p class="slots-empty">Choisissez d’abord un jour.</p>';
      return;
    }
    const date = currentDate();
    const [openAt, closeAt] = hours[date.getDay()] || [0, 0];
    const now = new Date();
    const isToday = dateKey(now) === state.day;
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const slots = [];

    for (let minute = openAt; minute < closeAt; minute += 30) {
      const past = isToday && minute < currentMinute;
      const taken = !past && takenSlot(state.day, minute);
      slots.push({ minute, past, taken });
    }

    const groups = [
      { name: 'Matin', slots: slots.filter((slot) => slot.minute < 12 * 60) },
      { name: 'Après-midi', slots: slots.filter((slot) => slot.minute >= 12 * 60) }
    ].filter((group) => group.slots.length);

    const html = groups.map((group, groupIndex) => {
      const radios = group.slots.map((slot) => {
        const id = `slot-${groupIndex}-${slot.minute}`;
        const disabled = slot.past || slot.taken;
        const reason = slot.past ? 'passé' : (slot.taken ? 'déjà pris' : '');
        const checked = state.time === slot.minute ? ' checked' : '';
        return `<label class="slot-choice" for="${id}"><input id="${id}" type="radio" name="slot" value="${slot.minute}"${checked}${disabled ? ' disabled' : ''}>` +
          `<span class="slot-choice__label"><time datetime="${state.day}T${formatSlot(slot.minute)}">${formatSlot(slot.minute)}</time>${reason ? `<small class="slot-choice__reason">${reason}</small>` : ''}</span></label>`;
      }).join('');
      return `<fieldset class="slot-group"><legend>${group.name}</legend><div class="slot-grid">${radios}</div></fieldset>`;
    }).join('');

    const available = slots.filter((slot) => !slot.past && !slot.taken).length;
    slotsRoot.innerHTML = html || '<p class="slots-empty">Aucun créneau dans cette plage.</p>';
    if (available === 0) {
      slotsRoot.insertAdjacentHTML('beforeend', '<p class="slots-empty">Aucun créneau libre dans cette simulation.</p>');
    }
    const caption = $('[data-slots-caption]', form);
    caption.textContent = `${capitalize(formatDay(state.day))} · créneaux d’exemple selon la plage provisoire à confirmer.`;
  }

  function updateSummary() {
    const service = currentService();
    $('[data-summary="service"]').textContent = state.service ? service.name : 'À choisir';
    $('[data-summary="duration"]').textContent = 'À demander au salon';
    $('[data-summary="day"]').textContent = state.day ? capitalize(formatDay(state.day)) : 'À choisir';
    $('[data-summary="time"]').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    $('[data-summary="price"]').textContent = 'À confirmer';
    $$('[data-edit]').forEach((button) => {
      const target = Number(button.dataset.edit);
      button.disabled = state.step === 5 || state.step === target || state.maxStep < target;
    });
    const recap = `<p><strong>${service.name}</strong></p>` +
      `<p>${state.day ? capitalize(formatDay(state.day)) : 'Jour à choisir'}${state.time !== null ? ` · ${formatTime(state.time)}` : ''}</p>` +
      '<p>Tarif à confirmer.</p>';
    const contactRecap = $('[data-contact-recap]');
    const successRecap = $('[data-success-recap]');
    if (contactRecap) contactRecap.innerHTML = recap;
    if (successRecap) successRecap.innerHTML = recap;
  }

  function announce(text) {
    if (live) live.textContent = text;
  }

  function showStepError(name, visible) {
    const error = $(`[data-error="${name}"]`, form);
    if (error) error.hidden = !visible;
  }

  function go(step) {
    const previous = state.step;
    state.step = step;
    if (step <= 4) state.maxStep = Math.max(state.maxStep, step);
    if (step === 2) renderDays();
    if (step === 3) renderSlots();
    if (step === 4) updateSummary();

    let activePane = null;
    panes.forEach((pane) => {
      if (Number(pane.dataset.pane) === step) {
        pane.hidden = false;
        pane.dataset.entering = '';
        activePane = pane;
      } else {
        pane.hidden = true;
        pane.removeAttribute('data-entering');
      }
    });
    if (activePane) {
      requestAnimationFrame(() => requestAnimationFrame(() => activePane.removeAttribute('data-entering')));
      const heading = $('.pane-title', activePane);
      if (heading) heading.focus();
    }

    progress.forEach((item) => {
      const itemStep = Number(item.dataset.progress);
      if (itemStep === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const labels = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'le récapitulatif' };
    announce(step === 5 ? 'Simulation terminée. Aucune demande n’a été transmise.' : `Étape ${step} sur 4 : ${labels[step]}.`);
    updateSummary();
    if (previous !== step && step === 3) {
      const dateText = state.day ? capitalize(formatDay(state.day)) : 'jour choisi';
      announce(`${dateText} : les créneaux de démonstration sont affichés.`);
    }
  }

  function next() {
    if (state.step === 1) {
      go(2);
      return;
    }
    if (state.step === 2) {
      showStepError('day', !state.day);
      if (!state.day) return;
      go(3);
      return;
    }
    if (state.step === 3) {
      showStepError('time', state.time === null);
      if (state.time === null) return;
      go(4);
    }
  }

  function validPhone(value) {
    const compact = value.trim().replace(/[\s.()\-]/g, '');
    return /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(compact);
  }

  function setFieldError(input, errorId, invalid) {
    const error = document.getElementById(errorId);
    input.setAttribute('aria-invalid', String(invalid));
    if (error) error.hidden = !invalid;
    return invalid;
  }

  function escapeCalendar(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  }

  function calendarStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function downloadCalendar() {
    if (!state.day || state.time === null) return;
    const date = parseDate(state.day);
    date.setHours(Math.floor(state.time / 60), state.time % 60, 0, 0);
    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Apercu simulation//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${calendarStamp(date)}-simulation@marichal-francis.example`,
      `DTSTAMP:${calendarStamp(now)}`,
      `DTSTART:${calendarStamp(date)}`,
      `SUMMARY:${escapeCalendar(`Simulation · ${currentService().name} · Marichal Francis Coiffure`)}`,
      `LOCATION:${escapeCalendar('722 avenue de la République, 59800 Lille')}`,
      `DESCRIPTION:${escapeCalendar('Entrée de simulation issue d’un aperçu non officiel. Aucun rendez-vous n’a été transmis au salon. Vérifiez horaires et tarif directement auprès du salon.')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-marichal-francis.ics';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function restart() {
    form.reset();
    state.step = 1;
    state.maxStep = 1;
    state.service = 'coupe';
    state.day = null;
    state.time = null;
    state.firstName = '';
    [nameInput, phoneInput].forEach((input) => {
      input.removeAttribute('aria-invalid');
    });
    showStepError('day', false);
    showStepError('time', false);
    showStepError('contact', false);
    renderDays();
    go(1);
  }

  daysRoot.addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (!button || button.disabled) return;
    state.day = button.dataset.date;
    state.time = null;
    $$('.day-choice', daysRoot).forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
    showStepError('day', false);
    showStepError('time', false);
    updateSummary();
    announce(`${capitalize(formatDay(state.day))} choisi.`);
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'service') {
      state.service = target.value;
      state.time = null;
      showStepError('time', false);
      updateSummary();
      announce(`${currentService().name} choisi. Tarif à confirmer auprès du salon.`);
    }
    if (target.name === 'slot') {
      state.time = Number(target.value);
      showStepError('time', false);
      updateSummary();
      announce(`Créneau de démonstration sélectionné à ${formatTime(state.time)}.`);
    }
  });

  form.addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-next]');
    const backButton = event.target.closest('[data-back]');
    const editButton = event.target.closest('[data-edit]');
    if (nextButton) next();
    if (backButton && state.step > 1 && state.step <= 4) go(state.step - 1);
    if (editButton && !editButton.disabled) go(Number(editButton.dataset.edit));
    if (event.target.closest('[data-restart]')) restart();
    if (event.target.closest('[data-download-ics]')) downloadCalendar();
  });

  nameInput.addEventListener('blur', () => {
    if (nameInput.value.trim()) setFieldError(nameInput, 'name-error', false);
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.trim()) setFieldError(phoneInput, 'phone-error', !validPhone(phoneInput.value));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < 4) {
      next();
      return;
    }
    if (state.step !== 4) return;
    const nameInvalid = setFieldError(nameInput, 'name-error', !nameInput.value.trim());
    const phoneInvalid = setFieldError(phoneInput, 'phone-error', !validPhone(phoneInput.value));
    if (nameInvalid || phoneInvalid) {
      showStepError('contact', true);
      const firstInvalid = nameInvalid ? nameInput : phoneInput;
      firstInvalid.focus();
      return;
    }
    state.firstName = nameInput.value.trim();
    const successCopy = $('[data-success-copy]');
    successCopy.textContent = `Merci, ${state.firstName}. Cette simulation n’a transmis aucune information au salon.`;
    showStepError('contact', false);
    go(5);
  });

  renderDays();
  updateSummary();
})();
