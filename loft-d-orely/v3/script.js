(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileView = window.matchMedia('(max-width: 760px)');
  const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';

  function setupMenu() {
    const trigger = $('.menu-toggle');
    const menu = $('#mobile-menu');
    if (!trigger || !menu) return;
    let closeTimer = 0;

    function setOpen(open, restoreFocus = false) {
      window.clearTimeout(closeTimer);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        menu.hidden = false;
        menu.classList.add('is-opening');
        requestAnimationFrame(() => menu.classList.remove('is-opening'));
        const firstLink = $('a', menu);
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else {
        menu.classList.add('is-opening');
        closeTimer = window.setTimeout(() => {
          menu.hidden = true;
          menu.classList.remove('is-opening');
        }, reduceMotion.matches ? 0 : 200);
        if (restoreFocus) trigger.focus({ preventScroll: true });
      }
    }

    trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', (event) => {
      if (trigger.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
    });
  }

  function setupReveals() {
    const hero = $('.hero');
    const figure = $('[data-hero-figure]');
    requestAnimationFrame(() => {
      if (hero) hero.classList.add('hero--entered');
      if (figure) figure.classList.add('is-entered');
    });

    const revealTargets = $$('.reveal-clip, .reveal-line, .reveal-x, [data-reveal]');
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((node) => node.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        node.classList.add('is-revealed');
        if (node.matches('[data-reveal="rows"]')) node.querySelectorAll('.service-row').forEach((row) => row.classList.add('is-revealed'));
        activeObserver.unobserve(node);
      });
    }, { threshold: .14, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((node) => observer.observe(node));
  }

  function setupMobileBar() {
    const bar = $('[data-mobile-bar]');
    const heroCta = $('[data-hero-cta]');
    const blockedAreas = [$('#rendez-vous'), $('.site-footer')].filter(Boolean);
    if (!bar || !heroCta || !('IntersectionObserver' in window)) return;
    let heroIsOut = false;
    let areaIsBlocked = false;

    const update = () => {
      const menuOpen = $('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
      const visible = mobileView.matches && heroIsOut && !areaIsBlocked && !menuOpen;
      bar.hidden = !visible;
      document.body.classList.toggle('has-mobile-bar', visible);
    };

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroIsOut = !entry.isIntersecting;
      update();
    }, { threshold: .05 });
    heroObserver.observe(heroCta);

    let intersections = 0;
    const blockedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { intersections += entry.isIntersecting ? 1 : -1; });
      intersections = Math.max(0, intersections);
      areaIsBlocked = intersections > 0;
      update();
    }, { threshold: 0 });
    blockedAreas.forEach((node) => blockedObserver.observe(node));
    mobileView.addEventListener('change', update);
    $('.menu-toggle')?.addEventListener('click', () => window.setTimeout(update, 0));
    update();
  }

  const serviceRows = $$('[data-service-row]');
  const services = new Map(serviceRows.map((row) => [row.dataset.service, {
    id: row.dataset.service,
    name: row.dataset.name,
    short: row.dataset.short,
    minutes: Number(row.dataset.min),
    price: Number(row.dataset.price)
  }]));

  function pad(value) { return String(value).padStart(2, '0'); }
  function localISO(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function capitalize(value) { return value ? value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1) : value; }
  function plural(count, singular, pluralForm) { return `${count} ${count === 1 ? singular : pluralForm}`; }
  function formatMinutes(minutes) { return minutes === 60 ? '1 h' : `${minutes} min`; }
  function displayTime(minutes) { return `${pad(Math.floor(minutes / 60))} h ${pad(minutes % 60)}`; }

  function setupBooking() {
    const form = $('[data-booking-form]');
    if (!form) return;
    const panels = new Map($$('[data-panel]', form).map((panel) => [Number(panel.dataset.panel), panel]));
    const stepButtons = $$('[data-go-step]');
    const live = $('[data-live]');
    const daysField = $('[data-days]', form);
    const slotsField = $('[data-slots]', form);
    const state = { step: 1, maxStep: 1, service: null, date: null, time: null, name: '', phone: '' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return { index, date, iso: localISO(date), weekday: date.getDay() };
    });
    const dayByISO = (iso) => days.find((day) => day.iso === iso);
    let transitionTimer = 0;
    const panelTimers = new Map();

    const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const weekdayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

    function hoursFor(day) {
      if (day.weekday === 0) return null;
      if (day.weekday === 6) return [9 * 60, 17 * 60];
      return [9 * 60, 18 * 60];
    }

    function hash(value) {
      let total = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        total ^= value.charCodeAt(index);
        total = Math.imul(total, 16777619);
      }
      return total >>> 0;
    }

    function slotsFor(day, duration) {
      const hours = hoursFor(day);
      if (!hours) return [];
      const now = new Date();
      const isToday = day.index === 0;
      const slots = [];
      for (let minute = hours[0]; minute + duration <= hours[1]; minute += 30) {
        const past = isToday && minute <= (now.getHours() * 60 + now.getMinutes() + 15);
        let occupied = false;
        for (let occupiedMinute = minute; occupiedMinute < minute + duration; occupiedMinute += 30) {
          if (hash(`${day.iso}|${occupiedMinute}|loft-orely`) % 100 < 22) { occupied = true; break; }
        }
        slots.push({ minute, past, occupied, available: !past && !occupied });
      }
      return slots;
    }

    function setSummary() {
      const service = services.get(state.service);
      const day = dayByISO(state.date);
      $('[data-summary-service]').textContent = service ? service.short : 'À choisir';
      $('[data-summary-day]').textContent = day ? capitalize(dayLong.format(day.date)) : 'À choisir';
      $('[data-summary-time]').textContent = state.time === null ? 'À choisir' : displayTime(state.time);
      $('[data-summary-price]').textContent = service ? `${service.price}\u00a0€` : '—';
      $('[data-summary-state]').textContent = state.step === 5 ? 'Simulation' : 'En cours';
    }

    function makeLabel(className, text, extraClass = '') {
      const label = document.createElement('label');
      label.className = `${className}${extraClass ? ` ${extraClass}` : ''}`;
      const input = document.createElement('input');
      input.type = 'radio';
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = text;
      label.append(input, span);
      return { label, input, span };
    }

    function renderDays() {
      const service = services.get(state.service);
      if (!service) return;
      daysField.replaceChildren();
      days.forEach((day) => {
        const hours = hoursFor(day);
        const slots = hours ? slotsFor(day, service.minutes) : [];
        const free = slots.filter((slot) => slot.available).length;
        const isClosed = !hours;
        const isUnavailable = isClosed || free === 0;
        const { label, input, span } = makeLabel('day-choice', '');
        input.name = 'day';
        input.value = day.iso;
        input.disabled = isUnavailable;
        input.checked = state.date === day.iso && !isUnavailable;
        input.setAttribute('aria-label', `${capitalize(dayLong.format(day.date))}${isClosed ? ', fermé' : isUnavailable ? ', aucun créneau simulé disponible' : `, ${plural(free, 'créneau disponible', 'créneaux disponibles')}`}`);
        if (isUnavailable) label.classList.add('day-choice--disabled');
        const dow = document.createElement('span');
        dow.className = 'day-choice__dow';
        dow.textContent = weekdayShort.format(day.date).replace('.', '');
        const date = document.createElement('span');
        date.className = 'day-choice__date';
        date.textContent = String(day.date.getDate());
        const tag = document.createElement('span');
        tag.className = 'day-choice__tag';
        tag.textContent = isClosed ? 'fermé' : isUnavailable ? 'complet' : day.index === 0 ? 'auj.' : day.index === 1 ? 'demain' : `${day.date.getMonth() + 1}/${pad(day.date.getDate())}`;
        span.removeAttribute('aria-hidden');
        span.replaceChildren(dow, date, tag);
        label.appendChild(input);
        label.insertBefore(input, span);
        daysField.appendChild(label);
      });
      if (state.date && !daysField.querySelector(`input[value="${state.date}"]:not(:disabled)`)) {
        state.date = null;
        state.time = null;
      }
    }

    function renderSlots() {
      const service = services.get(state.service);
      const day = dayByISO(state.date);
      if (!service || !day) return;
      const slots = slotsFor(day, service.minutes);
      const free = slots.filter((slot) => slot.available).length;
      $('[data-slot-caption]').textContent = `${capitalize(dayLong.format(day.date))} · ${formatMinutes(service.minutes)} · plages d’essai à confirmer.`;
      slotsField.replaceChildren();
      const legend = document.createElement('legend');
      legend.className = 'sr-only';
      legend.textContent = `Horaires d’essai disponibles le ${dayLong.format(day.date)}`;
      slotsField.appendChild(legend);
      if (!free) {
        const message = document.createElement('p');
        message.className = 'slot-empty';
        message.textContent = `Aucun horaire d’essai disponible ce jour-là. Appelez le 06 45 97 85 81 pour connaître les vrais créneaux.`;
        slotsField.appendChild(message);
        return;
      }
      slots.forEach((slot) => {
        const { label, input, span } = makeLabel('slot-choice', displayTime(slot.minute));
        input.name = 'time';
        input.value = String(slot.minute);
        input.disabled = !slot.available;
        input.checked = state.time === slot.minute && slot.available;
        input.setAttribute('aria-label', `${displayTime(slot.minute)}${slot.past ? ', heure passée' : slot.occupied ? ', déjà pris' : ', disponible'}`);
        if (!slot.available) label.classList.add('slot-choice--unavailable');
        slotsField.appendChild(label);
      });
      if (state.time !== null && !slotsField.querySelector(`input[value="${state.time}"]:not(:disabled)`)) state.time = null;
    }

    function updateRecap() {
      const recap = $('[data-recap]');
      const service = services.get(state.service);
      const day = dayByISO(state.date);
      if (!service || !day || state.time === null) {
        recap.replaceChildren(Object.assign(document.createElement('p'), { textContent: 'Votre sélection apparaîtra ici.' }));
        return;
      }
      const title = document.createElement('p');
      title.className = 'recap-card__title';
      title.textContent = service.name;
      const meta = document.createElement('p');
      meta.className = 'recap-card__meta';
      meta.textContent = `${capitalize(dayLong.format(day.date))} à ${displayTime(state.time)} · ${formatMinutes(service.minutes)} · ${service.price}\u00a0€ (indicatif)`;
      recap.replaceChildren(title, meta);
    }

    function announce(message) {
      if (live) live.textContent = message;
    }

    function refreshSteps() {
      stepButtons.forEach((button) => {
        const number = Number(button.dataset.goStep);
        if (number === state.step) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
        button.disabled = state.step === 5 || number > state.maxStep || number > 4;
      });
    }

    function setPanel(step, fromStep, shouldFocus = true) {
      const target = panels.get(step);
      if (!target) return;
      window.clearTimeout(panelTimers.get(fromStep));
      const oldPanel = panels.get(fromStep);
      if (oldPanel && oldPanel !== target && !oldPanel.hidden) {
        oldPanel.classList.remove('is-entering');
        oldPanel.classList.add('is-leaving');
        const timer = window.setTimeout(() => {
          oldPanel.hidden = true;
          oldPanel.classList.remove('is-leaving');
        }, reduceMotion.matches ? 150 : 240);
        panelTimers.set(fromStep, timer);
      }
      window.clearTimeout(panelTimers.get(step));
      target.hidden = false;
      target.classList.remove('is-leaving');
      target.classList.add('is-entering');
      requestAnimationFrame(() => target.classList.remove('is-entering'));
      state.step = step;
      state.maxStep = Math.max(state.maxStep, Math.min(step, 4));
      refreshSteps();
      setSummary();
      if (step === 4) updateRecap();
      if (shouldFocus) {
        const heading = $(`#step-title-${step}`, target);
        if (heading) heading.focus({ preventScroll: true });
        announce(step === 5 ? 'Simulation terminée. Aucun rendez-vous n’a été réservé.' : `Étape ${step} sur 4.`);
      }
    }

    function showError(step, message) {
      const error = $(`[data-error="${step}"]`, form);
      if (error) { error.hidden = false; error.textContent = message; }
      announce(message);
      const panel = panels.get(step);
      if (panel) {
        const first = $('input:not(:disabled)', panel);
        if (first) first.focus();
      }
    }

    function nextStep() {
      if (state.step === 1 && !state.service) return showError(1, 'Choisissez une prestation pour continuer.');
      if (state.step === 2 && !state.date) return showError(2, 'Choisissez un jour avec un créneau disponible.');
      if (state.step === 3 && state.time === null) return showError(3, 'Choisissez un créneau disponible.');
      if (state.step < 4) {
        const oldStep = state.step;
        if (oldStep === 1) renderDays();
        if (oldStep === 2) renderSlots();
        setPanel(oldStep + 1, oldStep);
      }
    }

    function updateInputError(input, errorId, invalid, hintId) {
      const error = document.getElementById(errorId);
      if (error) error.hidden = !invalid;
      input.setAttribute('aria-invalid', String(invalid));
      const describedBy = invalid ? `${hintId} ${errorId}` : hintId;
      input.setAttribute('aria-describedby', describedBy);
      return !invalid;
    }

    function normalizePhone(value) { return value.replace(/[\s().-]/g, ''); }
    function validMobile(value) { return /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(normalizePhone(value)); }

    form.addEventListener('change', (event) => {
      const input = event.target;
      if (input.name === 'service') {
        state.service = input.value;
        state.date = null;
        state.time = null;
        state.maxStep = Math.min(state.maxStep, 1);
        const serviceError = $('[data-error="1"]', form);
        if (serviceError) serviceError.hidden = true;
      } else if (input.name === 'day') {
        state.date = input.value;
        state.time = null;
        state.maxStep = Math.min(state.maxStep, 2);
        const dayError = $('[data-error="2"]', form);
        if (dayError) dayError.hidden = true;
      } else if (input.name === 'time') {
        state.time = Number(input.value);
        state.maxStep = Math.max(state.maxStep, 3);
        const timeError = $('[data-error="3"]', form);
        if (timeError) timeError.hidden = true;
      }
      setSummary();
      if (state.step === 4) updateRecap();
    });

    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-next]')) nextStep();
      if (event.target.closest('[data-back]')) {
        const oldStep = state.step;
        setPanel(Math.max(1, state.step - 1), oldStep);
      }
      if (event.target.closest('[data-reset]')) resetBooking();
      if (event.target.closest('[data-calendar]')) downloadCalendar();
    });

    stepButtons.forEach((button) => button.addEventListener('click', () => {
      const step = Number(button.dataset.goStep);
      if (step <= state.maxStep && state.step !== 5) {
        const oldStep = state.step;
        if (step === 2) renderDays();
        if (step === 3) renderSlots();
        setPanel(step, oldStep);
      }
    }));

    $$('[data-book]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      if (state.step === 5) resetBooking(true);
      const input = $(`input[name="service"][value="${button.dataset.book}"]`, form);
      if (!input) return;
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const oldStep = state.step;
      renderDays();
      setPanel(2, oldStep);
      $('#rendez-vous').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }));

    const nameInput = $('#guest-name', form);
    const phoneInput = $('#guest-phone', form);
    nameInput.addEventListener('blur', () => {
      if (nameInput.value) updateInputError(nameInput, 'name-error', !nameInput.value.trim(), 'name-hint');
    });
    phoneInput.addEventListener('blur', () => {
      if (phoneInput.value) updateInputError(phoneInput, 'phone-error', !validMobile(phoneInput.value), 'phone-hint');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.step !== 4) { nextStep(); return; }
      const nameValid = updateInputError(nameInput, 'name-error', !nameInput.value.trim(), 'name-hint');
      const phoneValid = updateInputError(phoneInput, 'phone-error', !validMobile(phoneInput.value), 'phone-hint');
      if (!nameValid) { nameInput.focus(); return; }
      if (!phoneValid) { phoneInput.focus(); return; }
      state.name = nameInput.value.trim();
      state.phone = phoneInput.value.trim();
      writeSuccess();
      setPanel(5, 4);
    });

    function writeSuccess() {
      const service = services.get(state.service);
      const day = dayByISO(state.date);
      $('[data-success-copy]').textContent = `Merci ${state.name}. Votre demande d’essai reste sur cet écran.`;
      const receipt = $('[data-success-receipt]');
      const title = document.createElement('strong');
      title.textContent = service.name;
      const time = document.createElement('span');
      time.textContent = `${capitalize(dayLong.format(day.date))} à ${displayTime(state.time)} · ${formatMinutes(service.minutes)} · ${service.price}\u00a0€ indicatifs`;
      receipt.replaceChildren(title, time);
    }

    function resetBooking(silent = false) {
      form.reset();
      state.step = 1;
      state.maxStep = 1;
      state.service = null;
      state.date = null;
      state.time = null;
      state.name = '';
      state.phone = '';
      [nameInput, phoneInput].forEach((input) => {
        input.removeAttribute('aria-invalid');
        input.setAttribute('aria-describedby', input === nameInput ? 'name-hint' : 'phone-hint');
      });
      $$('[data-error]', form).forEach((error) => { error.hidden = true; });
      panels.forEach((panel, number) => {
        panel.hidden = number !== 1;
        panel.classList.remove('is-entering', 'is-leaving');
      });
      setSummary();
      refreshSteps();
      if (!silent) {
        $('#step-title-1').focus({ preventScroll: true });
        announce('La simulation a été réinitialisée.');
      }
    }

    function escapeICS(value) { return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
    function downloadCalendar() {
      const service = services.get(state.service);
      const day = dayByISO(state.date);
      if (!service || !day || state.time === null) return;
      const dateKey = `${day.date.getFullYear()}${pad(day.date.getMonth() + 1)}${pad(day.date.getDate())}`;
      const hour = Math.floor(state.time / 60);
      const minute = state.time % 60;
      const start = `${dateKey}T${pad(hour)}${pad(minute)}00`;
      const finishDate = new Date(day.date);
      finishDate.setMinutes(state.time + service.minutes);
      const finish = `${finishDate.getFullYear()}${pad(finishDate.getMonth() + 1)}${pad(finishDate.getDate())}T${pad(finishDate.getHours())}${pad(finishDate.getMinutes())}00`;
      const now = new Date();
      const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
      const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Le loft d’Orely//FR',
        'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-TIMEZONE:Europe/Paris', 'BEGIN:VEVENT',
        `UID:${stamp}-${service.id}@studio-lamy-preview`, `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Paris:${start}`, `DTEND;TZID=Europe/Paris:${finish}`,
        `SUMMARY:${escapeICS(`${service.name} — Le loft d’Orely`)}`,
        'LOCATION:129 Bd André Sautel\\, 17000 La Rochelle',
        `DESCRIPTION:${escapeICS('Rappel de maquette : rendez-vous non transmis au salon.')}`,
        'END:VEVENT', 'END:VCALENDAR'
      ];
      const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rappel-loft-dorely.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    form.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.matches('input[type="radio"]')) {
        event.preventDefault();
        nextStep();
      }
    });

    setSummary();
    refreshSteps();
    window.__booking = { reset: resetBooking };
  }

  setupMenu();
  setupReveals();
  setupBooking();
  setupMobileBar();
  window.__site = true;
})();
