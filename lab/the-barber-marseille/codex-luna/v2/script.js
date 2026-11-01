/* The Barber Marseille · simulation de réservation, sans envoi */
(() => {
  'use strict';

  const PLANITY = 'https://www.planity.com/the-barber-marseille-13001';
  const PHONE = '+33954666346';
  const OPEN = 600;
  const CLOSE = 1170;
  const SLOT_STEP = 15;
  const DAYS = 14;
  const NB = '\u00a0';
  const DOW = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const SERVICES = [
    { id: 'coupe-coiffage', group: 'Coupes homme', name: 'Shampoing Coupe Coiffage', minutes: 30, price: 20 },
    { id: 'coupe-transformation', group: 'Coupes homme', name: 'Coupe Transformation', minutes: 30, price: 25 },
    { id: 'coupe-longs', group: 'Coupes homme', name: 'Coupe Cheveux Longs', minutes: 30, price: 35 },
    { id: 'set-coupe-barbe', group: 'Coupe + barbe', name: 'Coupe Coiffage + Barbe', minutes: 30, price: 30 },
    { id: 'set-transform-barbe', group: 'Coupe + barbe', name: 'Coupe Transformation + Barbe', minutes: 45, price: 35 },
    { id: 'set-longs-barbe', group: 'Coupe + barbe', name: 'Coupe Cheveux Longs + Barbe', minutes: 45, price: 45 },
    { id: 'set-lissage', group: 'Coupe + barbe', name: 'Coupe + Lissage express + Masque à la kératine', minutes: 45, price: 45 },
    { id: 'barbe-classique', group: 'Barbes', name: 'Barbe Classique', minutes: 15, price: 15 },
    { id: 'barbe-tondeuse', group: 'Barbes', name: 'Barbe Tondeuse et Ciseaux', minutes: 30, price: 20 },
    { id: 'barbe-longue', group: 'Barbes', name: 'Barbe Longue', minutes: 30, price: 25 },
    { id: 'rasage-ancien', group: 'Barbes', name: 'Barbe à l’ancienne', minutes: 30, price: 25 },
    { id: 'barbe-coloration', group: 'Barbes', name: 'Coloration Barbe + Taille de barbe', minutes: 30, price: 30 },
    { id: 'enfant', group: 'Enfants · 6–10 ans', name: 'Coupe Enfant', minutes: 30, price: 10 },
    { id: 'soin-visage', group: 'Soin visage', name: 'Soin Visage - Premium', minutes: 45, price: 30 },
    { id: 'meches', group: 'Éclaircissement · coloration', name: 'Mèches ou Balayage + Coupe', minutes: 135, price: 65, from: true },
    { id: 'decoloration', group: 'Éclaircissement · coloration', name: 'Décoloration tête entière + Coupe', minutes: 135, price: 75, from: true },
    { id: 'coloration-coupe', group: 'Éclaircissement · coloration', name: 'Coloration + Coupe coiffage', minutes: 105, price: 50, from: true },
    { id: 'coloration-barbe', group: 'Éclaircissement · coloration', name: 'Coloration + Coupe coiffage + Barbe', minutes: 120, price: 65, from: true },
    { id: 'lissage', group: 'Lissage homme', name: 'Lissage Brésilien + Coupe Coiffage', minutes: 120, price: 95, from: true },
    { id: 'permanente-court', group: 'Permanente', name: 'Permanente + Coupe - Cheveux courts', minutes: 105, price: 45, from: true },
    { id: 'permanente-mi-longs', group: 'Permanente', name: 'Permanente + Coupe - Cheveux mi-longs', minutes: 120, price: 55, from: true },
    { id: 'permanente-longs', group: 'Permanente', name: 'Permanente + Coupe - Cheveux longs', minutes: 135, price: 65, from: true }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (value) => String(value).padStart(2, '0');
  const weekdayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const shortDateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const longDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const state = { step: 1, service: null, date: null, time: null, firstName: '', phone: '' };
  const form = $('#booking-form');
  let stepFrame = 0;

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const out = {};
    parts.forEach((part) => { out[part.type] = part.value; });
    return { y: Number(out.year), m: Number(out.month), d: Number(out.day), h: Number(out.hour) % 24, min: Number(out.minute) };
  }
  function dateAtOffset(offset) {
    const p = parisParts();
    const date = new Date(Date.UTC(p.y, p.m - 1, p.d + offset, 12));
    return {
      date,
      iso: date.toISOString().slice(0, 10),
      dow: date.getUTCDay(),
      day: date.getUTCDate(),
      month: date.getUTCMonth(),
      year: date.getUTCFullYear()
    };
  }
  function timeLabel(minutes) {
    return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
  }
  function servicePrice(service) {
    return (service.from ? 'dès ' : '') + service.price + NB + '€';
  }
  function serviceDuration(service) {
    const hours = Math.floor(service.minutes / 60);
    const minutes = service.minutes % 60;
    if (!hours) return service.minutes + NB + 'min';
    return hours + NB + 'h' + (minutes ? NB + pad(minutes) : '');
  }

  /* Menu mobile: focus géré, fermeture à Escape */
  const menuButton = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  const inertWhileOpen = [$('#apercu'), $('#main'), $('#foot'), $('[data-sticky-bar]')].filter(Boolean);
  if (menuButton && mobileMenu) {
    function closeMenu(returnFocus) {
      menuButton.setAttribute('aria-expanded', 'false');
      $('.menu-toggle__label', menuButton).textContent = 'Menu';
      mobileMenu.hidden = true;
      document.body.classList.remove('menu-open');
      inertWhileOpen.forEach((node) => { node.inert = false; });
      if (returnFocus) menuButton.focus();
    }
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      $('.menu-toggle__label', menuButton).textContent = open ? 'Fermer' : 'Menu';
      mobileMenu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      inertWhileOpen.forEach((node) => { node.inert = open; });
      if (open) $('a', mobileMenu).focus();
    });
    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
      if (event.key !== 'Tab' || menuButton.getAttribute('aria-expanded') !== 'true') return;
      const links = $$('a', mobileMenu);
      if (event.shiftKey && document.activeElement === links[0]) {
        event.preventDefault();
        links[links.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === links[links.length - 1]) {
        event.preventDefault();
        links[0].focus();
      }
    });
    window.matchMedia('(min-width: 851px)').addEventListener('change', (event) => {
      if (event.matches && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });
  }

  /* Horaires, statut et heure de référence */
  (function renderOpeningStatus() {
    const now = parisParts();
    const date = new Date(Date.UTC(now.y, now.m - 1, now.d, 12));
    const dow = date.getUTCDay();
    const todayRow = $('[data-weekday="' + dow + '"]');
    if (todayRow) todayRow.classList.add('is-today');
    const weekend = dow === 0;
    const openNow = !weekend && now.h * 60 + now.min >= OPEN && now.h * 60 + now.min < CLOSE;
    const openLaterToday = !weekend && now.h * 60 + now.min < OPEN;
    let message = '';
    if (openNow) message = 'Ouvert maintenant · ferme à 19' + NB + 'h' + NB + '30';
    else if (openLaterToday) message = 'Ouvre aujourd’hui à 10' + NB + 'h';
    else {
      let next = null;
      for (let i = 1; i <= 7; i += 1) {
        const candidate = new Date(Date.UTC(now.y, now.m - 1, now.d + i, 12));
        if (candidate.getUTCDay() !== 0) { next = i; break; }
      }
      message = 'Fermé aujourd’hui · reprise ' + (next === 1 ? 'demain' : DOW[(dow + next) % 7]) + ' à 10' + NB + 'h';
    }
    $$('[data-status]').forEach((node) => { node.textContent = message; });
    $$('[data-status-dot]').forEach((node) => {
      node.classList.toggle('is-open', openNow);
      node.classList.toggle('is-closed', !openNow);
    });
    const clock = $('[data-clock]');
    if (clock) clock.textContent = 'MARSEILLE · ' + pad(now.h) + ':' + pad(now.min);
  })();

  /* Créneaux de dates: dimanche affiché mais désactivé. */
  function renderDates() {
    const container = $('[data-date-list]');
    if (!container) return;
    container.replaceChildren();
    for (let offset = 0; offset < DAYS; offset += 1) {
      const day = dateAtOffset(offset);
      const id = 'booking-date-' + offset;
      const closed = day.dow === 0;
      const wrapper = document.createElement('div');
      wrapper.className = 'date-choice' + (closed ? ' is-closed' : '');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'bookingDate';
      input.id = id;
      input.value = day.iso;
      input.disabled = closed;
      input.setAttribute('aria-label', dateFmt.format(day.date) + (closed ? ', fermé' : ''));
      const label = document.createElement('label');
      label.htmlFor = id;
      label.innerHTML = '<span>' + weekdayFmt.format(day.date).replace('.', '') + '</span><span>' + day.day + '</span><span>' + monthFmt.format(day.date).replace('.', '') + (closed ? ' · fermé' : '') + '</span>';
      wrapper.append(input, label);
      container.append(wrapper);
    }
  }

  function hashCode(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function isSimulatedUnavailable(iso, minute, serviceId) {
    const seed = hashCode(iso + '|' + minute + '|' + serviceId);
    return seed % 11 === 0 || seed % 13 === 0;
  }
  function renderSlots() {
    const container = $('[data-slot-list]');
    if (!container) return;
    container.replaceChildren();
    state.time = null;
    const selectedDate = state.date;
    const service = state.service;
    if (!selectedDate || !service) return;
    const startOfDay = dateAtOffset(0);
    const sameDay = selectedDate === startOfDay.iso;
    const now = parisParts();
    const earliest = sameDay ? Math.ceil((now.h * 60 + now.min + 1) / SLOT_STEP) * SLOT_STEP : OPEN;
    let available = 0;
    for (let minute = OPEN; minute + service.minutes <= CLOSE; minute += SLOT_STEP) {
      const past = sameDay && minute < earliest;
      const unavailable = !past && isSimulatedUnavailable(selectedDate, minute, service.id);
      if (!past && !unavailable) available += 1;
      const id = 'booking-time-' + minute;
      const wrapper = document.createElement('div');
      wrapper.className = 'slot-choice' + (past ? ' is-past' : unavailable ? ' is-taken' : '');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'bookingTime';
      input.id = id;
      input.value = timeLabel(minute);
      input.disabled = past || unavailable;
      input.setAttribute('aria-label', timeLabel(minute) + (past ? ', heure passée' : unavailable ? ', indisponible dans cette simulation' : ''));
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = timeLabel(minute);
      if (past || unavailable) {
        const hidden = document.createElement('span');
        hidden.className = 'sr-only';
        hidden.textContent = past ? ' · heure passée' : ' · pris dans la simulation';
        label.append(hidden);
      }
      wrapper.append(input, label);
      container.append(wrapper);
    }
    if (!container.children.length || available === 0) {
      const note = document.createElement('p');
      note.className = 'form-error';
      note.textContent = 'Aucun créneau ne convient ce jour-là dans la simulation. Choisissez une autre date.';
      container.append(note);
    }
  }

  function renderServiceChoices() {
    const container = $('[data-service-choices]');
    if (!container) return;
    const groups = [];
    SERVICES.forEach((service) => {
      if (!groups.includes(service.group)) groups.push(service.group);
    });
    groups.forEach((group) => {
      const title = document.createElement('p');
      title.className = 'choice-group';
      title.textContent = group;
      container.append(title);
      SERVICES.filter((service) => service.group === group).forEach((service) => {
        const id = 'choice-' + service.id;
        const label = document.createElement('label');
        label.className = 'choice';
        label.htmlFor = id;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'service';
        input.id = id;
        input.value = service.id;
        input.checked = !state.service && service.id === SERVICES[0].id;
        const name = document.createElement('span');
        name.className = 'choice__name';
        name.textContent = service.name;
        const meta = document.createElement('span');
        meta.className = 'choice__meta';
        meta.textContent = serviceDuration(service) + ' · ' + servicePrice(service);
        const copy = document.createElement('span');
        copy.append(name, meta);
        label.append(input, copy);
        container.append(label);
      });
    });
    state.service = SERVICES[0];
    updateSelection();
  }

  function updateSelection() {
    const service = state.service;
    const show = (selector, value) => {
      const node = $(selector);
      if (node) node.textContent = value;
    };
    show('[data-selection-service]', service ? service.name : 'Choisissez une prestation');
    show('[data-selection-date]', state.date ? shortDateFmt.format(new Date(state.date + 'T12:00:00Z')) : '—');
    show('[data-selection-time]', state.time || '—');
    show('[data-selection-duration]', service ? serviceDuration(service) : '—');
    show('[data-selection-price]', service ? servicePrice(service) : '—');
    show('[data-selection-step]', pad(state.step === 5 ? 4 : state.step));
    if (state.step === 4) updateRecap();
  }

  function clearError(name) {
    const errorName = name === 'firstName' ? 'name' : name;
    const fieldName = name === 'name' ? 'firstName' : name;
    const node = $('[data-error="' + errorName + '"]');
    if (node) node.textContent = '';
    const input = form && $('[name="' + fieldName + '"]', form);
    if (input) input.removeAttribute('aria-invalid');
  }
  function updateRecap() {
    const recap = $('[data-recap]');
    if (!recap) return;
    if (!state.service || !state.date || !state.time) {
      recap.textContent = 'Choisissez une prestation, un jour et une heure pour afficher le récapitulatif.';
      return;
    }
    recap.innerHTML = '<span><strong>' + state.service.name + '</strong><br>' + serviceDuration(state.service) + ' · ' + servicePrice(state.service) + '</span><span><strong>' + longDateFmt.format(new Date(state.date + 'T12:00:00Z')) + '</strong><br>' + state.time + '</span>';
  }
  function setStep(step, moveFocus = true) {
    state.step = step;
    cancelAnimationFrame(stepFrame);
    let activePanel = null;
    $$('[data-step-panel]').forEach((panel) => {
      const active = Number(panel.dataset.stepPanel) === step;
      panel.hidden = !active;
      panel.classList.toggle('is-entering', active);
      if (active) activePanel = panel;
    });
    if (activePanel) stepFrame = requestAnimationFrame(() => activePanel.classList.remove('is-entering'));
    $$('.progress li').forEach((item) => {
      const n = Number(item.dataset.progress);
      item.removeAttribute('aria-current');
      item.classList.toggle('is-done', n < step);
      if (n === step && step <= 4) item.setAttribute('aria-current', 'step');
    });
    updateSelection();
    if (moveFocus) {
      const heading = $('#step-title-' + step);
      if (heading) heading.focus({ preventScroll: true });
    }
  }
  function showError(name, message) {
    const node = $('[data-error="' + name + '"]');
    if (node) node.textContent = message;
  }
  function selectedChoice(name) {
    const input = $('input[name="' + name + '"]:checked', form);
    return input ? input.value : null;
  }

  renderServiceChoices();
  renderDates();
  renderSlots();

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'service') {
      state.service = SERVICES.find((item) => item.id === target.value) || null;
      clearError('service');
      renderSlots();
      updateSelection();
    } else if (target.name === 'bookingDate') {
      state.date = target.value;
      clearError('date');
      renderSlots();
      updateSelection();
    } else if (target.name === 'bookingTime') {
      state.time = target.value;
      clearError('time');
      updateSelection();
    } else if (target.name === 'firstName' || target.name === 'phone') {
      clearError(target.name);
    }
  });

  form.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-next],[data-back]');
    if (!trigger) return;
    if (trigger.dataset.back) {
      setStep(Number(trigger.dataset.back));
      return;
    }
    const next = Number(trigger.dataset.next);
    if (state.step === 1 && !state.service) {
      showError('service', 'Choisissez une prestation.');
      return;
    }
    if (state.step === 2) {
      state.date = selectedChoice('bookingDate');
      if (!state.date) {
        showError('date', 'Choisissez un jour où le salon est indiqué ouvert.');
        return;
      }
    }
    if (state.step === 3) {
      state.time = selectedChoice('bookingTime');
      if (!state.time) {
        showError('time', 'Choisissez un créneau disponible dans cette simulation.');
        return;
      }
    }
    setStep(next);
  });

  function validFrenchMobile(value) {
    const normalized = value.trim().replace(/[ .-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(normalized);
  }
  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  }
  function appointmentLabel() {
    const date = new Date(state.date + 'T12:00:00Z');
    return dateFmt.format(date) + ' · ' + state.time;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstName = $('[name="firstName"]', form).value.trim();
    const phone = $('[name="phone"]', form).value.trim();
    let firstInvalid = null;
    if (firstName.length < 2) {
      showError('name', 'Indiquez un prénom de deux lettres minimum.');
      $('[name="firstName"]', form).setAttribute('aria-invalid', 'true');
      firstInvalid = $('[name="firstName"]', form);
    } else clearError('name');
    if (!validFrenchMobile(phone)) {
      showError('phone', 'Entrez un numéro mobile français commençant par 06 ou 07.');
      $('[name="phone"]', form).setAttribute('aria-invalid', 'true');
      firstInvalid = firstInvalid || $('[name="phone"]', form);
    } else clearError('phone');
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    state.firstName = firstName;
    state.phone = phone;
    const recap = $('.success-recap');
    recap.textContent = state.service.name + ' · ' + appointmentLabel() + ' · ' + servicePrice(state.service);
    const heading = $('#step-title-5');
    heading.insertAdjacentHTML('afterend', '<p class="success-name">Au nom de ' + escapeHtml(firstName) + '.</p>');
    setStep(5);
  });

  $('[data-ics]').addEventListener('click', () => {
    if (!state.service || !state.date || !state.time) return;
    const startMinute = Number(state.time.slice(0, 2)) * 60 + Number(state.time.slice(3, 5));
    const startDate = new Date(state.date + 'T12:00:00Z');
    const start = state.date.replace(/-/g, '') + 'T' + pad(Math.floor(startMinute / 60)) + pad(startMinute % 60) + '00';
    const endMinute = startMinute + state.service.minutes;
    const endDate = new Date(startDate.getTime() + Math.floor(endMinute / 1440) * 86400000);
    const endClock = endMinute % 1440;
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, '') + 'T' + pad(Math.floor(endClock / 60)) + pad(endClock % 60) + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu The Barber Marseille//FR',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + stamp + '-apercu@studiolamy',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=Europe/Paris:' + start,
      'DTEND;TZID=Europe/Paris:' + end,
      'SUMMARY:' + state.service.name.replace(/[,;\\]/g, '\\$&'),
      'LOCATION:71 Rue de Rome\\, 13001 Marseille',
      'DESCRIPTION:Simulation uniquement. Aucun rendez-vous n’a été transmis. Réservez sur ' + PLANITY,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-the-barber-marseille.ics';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  $('[data-reset]').addEventListener('click', () => {
    state.step = 1;
    state.date = null;
    state.time = null;
    state.firstName = '';
    state.phone = '';
    const name = $('[name="firstName"]', form);
    const phone = $('[name="phone"]', form);
    name.value = '';
    phone.value = '';
    name.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    $('.success-name')?.remove();
    $$('[data-error]').forEach((node) => { node.textContent = ''; });
    renderSlots();
    setStep(1);
  });

  /* Les liens de la carte ouvrent le module avec la prestation préchoisie. */
  $$('[data-book]').forEach((link) => {
    link.addEventListener('click', () => {
      const service = SERVICES.find((item) => item.id === link.dataset.book);
      if (!service) return;
      state.service = service;
      const radio = $('#choice-' + service.id);
      if (radio) radio.checked = true;
      state.date = null;
      state.time = null;
      $$('input[name="bookingDate"]:checked, input[name="bookingTime"]:checked', form).forEach((input) => { input.checked = false; });
      renderSlots();
      updateSelection();
      setStep(1);
    });
  });
})();


/* V2 — durée publiée, ramenée à l’échelle 15 min → 2 h 15. */
(() => {
  'use strict';
  document.querySelectorAll('.service-group li').forEach((row) => {
    const time = row.querySelector('.service-time');
    if (!time) return;
    const raw = time.textContent.replace(/\s/g, '').toLowerCase();
    let minutes = 0;
    const hours = raw.match(/(\d+)h(?:(\d{1,2}))?/);
    const mins = raw.match(/(\d+)min/);
    if (hours) minutes = Number(hours[1]) * 60 + Number(hours[2] || 0);
    else if (mins) minutes = Number(mins[1]);
    const width = Math.max(8, Math.min(100, Math.round(minutes / 135 * 100)));
    row.style.setProperty('--duration-width', width + '%');
    time.classList.add('service-time--scaled');
  });
})();
