(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const NBSP = '\u00a0';
  const TZ = 'Europe/Paris';
  const PHONE = '06 25 21 86 81';
  const ADDRESS = '5 rue Jean Monnet, 84000 Avignon';
  const PLANITY = 'https://www.planity.com/linstitut-de-sarah-84000-avignon';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const services = [
    { id: 'signature', name: 'Massage Signature', care: 60, duration: 75, price: 60 },
    { id: 'reflexologie', name: 'Soin réflexologie cranio-faciale', care: 60, duration: 75, price: 60 },
    { id: 'bonne-mine', name: 'Soin nettoyant / bonne mine', care: 45, duration: 60, price: 53 },
    { id: 'future-maman', name: 'Massage future maman', care: 60, duration: 75, price: 60 }
  ];

  const dateParts = (date, timeZone = TZ) => {
    const values = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return { year: +values.year, month: +values.month, day: +values.day, hour: +values.hour, minute: +values.minute };
  };
  const parisNow = () => dateParts(new Date());
  const isoDate = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const dateFromIso = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };
  const dateLabel = (value, options = { weekday: 'long', day: 'numeric', month: 'long' }) =>
    new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(dateFromIso(value));
  const timeLabel = (minutes) => `${Math.floor(minutes / 60)}${NBSP}h${NBSP}${String(minutes % 60).padStart(2, '0')}`;
  const durationLabel = (minutes) => minutes >= 60
    ? `${Math.floor(minutes / 60)}${NBSP}h${minutes % 60 ? `${NBSP}${String(minutes % 60).padStart(2, '0')}` : ''}`
    : `${minutes}${NBSP}min`;
  const euroLabel = (amount) => `${amount}${NBSP}€`;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  const menuButton = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  const closeMenu = (returnFocus = false) => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
    mobileMenu.hidden = true;
    if (returnFocus) menuButton.focus();
  };
  menuButton?.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Fermer le menu' : 'Ouvrir le menu');
    mobileMenu.hidden = !opening;
    if (opening) $('a', mobileMenu)?.focus();
  });
  mobileMenu?.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  const revealTargets = $$('[data-reveal]');
  revealTargets.forEach((target) => $$('li', target).forEach((item, index) => item.style.setProperty('--index', index)));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.shown = 'true';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((target) => revealObserver.observe(target));

    const actionBar = $('.mobile-action');
    const heroLink = $('.hero__link');
    const bookingSection = $('#booking');
    const footer = $('#foot');
    if (actionBar && heroLink && bookingSection && footer) {
      const seen = { hero: true, booking: false, footer: false };
      const syncBar = () => actionBar.classList.toggle('is-hidden', seen.hero || seen.booking || seen.footer);
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.target === heroLink) seen.hero = entry.isIntersecting;
          if (entry.target === bookingSection) seen.booking = entry.isIntersecting;
          if (entry.target === footer) seen.footer = entry.isIntersecting;
        });
        syncBar();
      }, { threshold: 0.02 });
      visibilityObserver.observe(heroLink);
      visibilityObserver.observe(bookingSection);
      visibilityObserver.observe(footer);
    }
  } else {
    revealTargets.forEach((target) => { target.dataset.shown = 'true'; });
  }

  requestAnimationFrame(() => {
    $$('[data-enter]').forEach((node, index) => {
      node.style.transitionDelay = `${index * 35}ms`;
      node.dataset.entered = 'true';
    });
  });

  const form = $('#booking-form');
  if (!form) {
    window.__siteReady = true;
    return;
  }
  form.hidden = false;

  const serviceHost = $('[data-services]', form);
  serviceHost.innerHTML = services.map((service) => `
    <label class="service-choice">
      <input type="radio" name="service" value="${escapeHtml(service.id)}">
      <span><span class="service-choice__name">${escapeHtml(service.name)}</span><span class="service-choice__meta">${durationLabel(service.duration)} de rendez-vous · ${durationLabel(service.care)} de soin</span></span>
      <span class="service-choice__price">${euroLabel(service.price)}</span>
    </label>`).join('');

  const parts = parisNow();
  const startOfWindow = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(startOfWindow);
    date.setUTCDate(date.getUTCDate() + index);
    return { date, iso: isoDate(date), day: date.getUTCDay(), index };
  });
  const hours = {
    0: null,
    1: [9 * 60, 19 * 60],
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 13 * 60 + 30],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: null
  };
  const serviceById = (id) => services.find((service) => service.id === id);
  const dayByIso = (value) => days.find((day) => day.iso === value);
  const hash = (value) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };
  const daySlots = (day, appointmentLength) => {
    const opening = hours[day.day];
    if (!opening) return [];
    const current = parisNow();
    const todayIso = `${current.year}-${String(current.month).padStart(2, '0')}-${String(current.day).padStart(2, '0')}`;
    const currentMinutes = current.hour * 60 + current.minute;
    const result = [];
    for (let minute = opening[0]; minute + appointmentLength <= opening[1]; minute += 15) {
      const past = day.iso === todayIso && minute <= currentMinutes;
      let booked = false;
      for (let segment = minute; segment < minute + appointmentLength; segment += 15) {
        if (hash(`${day.iso}|${segment}|sarah`) % 100 < 6) { booked = true; break; }
      }
      result.push({ minute, past, booked, available: !past && !booked });
    }
    return result;
  };
  const state = { step: 1, maxStep: 1, service: '', day: '', time: null, firstName: '', mobile: '' };
  const panels = $$('.booking-panel', form);
  const stepButtons = $$('[data-go]');
  const live = $('[data-step-live]');
  const slotHost = $('[data-times]');
  const dayHost = $('[data-days]');
  const slip = $('[data-slip]');

  const setFieldError = (name, visible, invalidField = null) => {
    const error = $(`[data-error="${name}"]`, form);
    if (error) error.hidden = !visible;
    if (invalidField) invalidField.setAttribute('aria-invalid', visible ? 'true' : 'false');
  };
  const clearErrors = () => {
    $$('[data-error]', form).forEach((error) => { error.hidden = true; });
    $$('input[aria-invalid="true"]', form).forEach((input) => input.removeAttribute('aria-invalid'));
  };
  const updateSlip = () => {
    const service = serviceById(state.service);
    const day = dayByIso(state.day);
    $('[data-slip-service]', slip).textContent = service?.name || 'À choisir';
    $('[data-slip-duration]', slip).textContent = service ? durationLabel(service.duration) : '—';
    $('[data-slip-day]', slip).textContent = day ? dateLabel(day.iso) : 'À choisir';
    $('[data-slip-time]', slip).textContent = state.time == null ? 'À choisir' : timeLabel(state.time);
    $('[data-slip-price]', slip).textContent = service ? euroLabel(service.price) : '—';
  };
  const renderDays = () => {
    const service = serviceById(state.service);
    const length = service?.duration || 15;
    dayHost.innerHTML = days.map((day) => {
      const slots = hours[day.day] ? daySlots(day, length) : [];
      const free = slots.filter((slot) => slot.available).length;
      const pastAll = slots.length > 0 && slots.every((slot) => slot.past);
      const unavailable = !hours[day.day] || free === 0;
      const status = !hours[day.day] ? 'Fermé' : pastAll ? 'Terminé' : free === 0 ? 'Complet' : day.index === 0 ? 'Aujourd’hui' : day.index === 1 ? 'Demain' : '';
      const spoken = `${dateLabel(day.iso)}, ${!hours[day.day] ? 'fermé' : free ? `${free} créneaux disponibles` : pastAll ? 'horaires passés' : 'complet'}`;
      const checked = state.day === day.iso && !unavailable ? ' checked' : '';
      return `<label class="day-choice"><input type="radio" name="day" value="${day.iso}" aria-label="${escapeHtml(spoken)}"${unavailable ? ' disabled' : ''}${checked}><span class="day-choice__week" aria-hidden="true">${new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(day.date).replace('.', '')}</span><span class="day-choice__date" aria-hidden="true">${day.date.getUTCDate()}</span><span class="day-choice__state" aria-hidden="true">${escapeHtml(status)}</span></label>`;
    }).join('');
    if (state.day && !$(`input[name="day"][value="${state.day}"]:not(:disabled)`, dayHost)) {
      state.day = '';
      state.time = null;
    }
  };
  const renderTimes = () => {
    const service = serviceById(state.service);
    const day = dayByIso(state.day);
    if (!service || !day) {
      slotHost.innerHTML = '';
      $('[data-slot-note]', form).textContent = '';
      return;
    }
    const slots = daySlots(day, service.duration);
    const available = slots.filter((slot) => slot.available).length;
    $('[data-slot-note]', form).textContent = `${dateLabel(day.iso)} · ${durationLabel(service.duration)} de rendez-vous · ${available} créneaux disponibles. Les horaires barrés sont déjà pris ou passés.`;
    if (!available) {
      slotHost.innerHTML = '<p class="time-empty">Aucun horaire ne reste disponible ce jour-là. Choisissez une autre date ou passez par Planity.</p>';
      state.time = null;
      return;
    }
    slotHost.innerHTML = slots.map((slot) => {
      const disabled = !slot.available;
      const label = timeLabel(slot.minute);
      const reason = slot.past ? 'horaire passé' : slot.booked ? 'déjà pris' : '';
      return `<label class="time-choice"><input type="radio" name="time" value="${slot.minute}" aria-label="${label}${reason ? `, ${reason}` : ''}"${disabled ? ' disabled' : ''}${state.time === slot.minute && !disabled ? ' checked' : ''}><span>${label}</span>${slot.booked && !slot.past ? '<small class="time-choice__state" aria-hidden="true">pris</small><span class="sr-only">, déjà pris</span>' : ''}</label>`;
    }).join('');
    if (state.time != null && !slots.some((slot) => slot.minute === state.time && slot.available)) state.time = null;
  };
  const setStep = (number, options = {}) => {
    state.step = number;
    state.maxStep = Math.max(state.maxStep, number < 5 ? number : 5);
    if (number === 2) renderDays();
    if (number === 3) renderTimes();
    if (number === 4) {
      const service = serviceById(state.service);
      const day = dayByIso(state.day);
      $('[data-confirm-recap]', form).textContent = service && day
        ? `${service.name} · ${dateLabel(day.iso)} à ${timeLabel(state.time)} · ${euroLabel(service.price)} (tarif indicatif).`
        : '';
    }
    panels.forEach((panel) => {
      const active = Number(panel.dataset.step) === number;
      if (active) {
        panel.hidden = false;
        panel.classList.add('is-enter');
        void panel.offsetHeight;
        requestAnimationFrame(() => panel.classList.remove('is-enter'));
      } else {
        panel.hidden = true;
        panel.classList.remove('is-enter');
      }
    });
    stepButtons.forEach((button) => {
      const target = Number(button.dataset.go);
      button.disabled = target > state.maxStep || target >= number;
      if (target === number) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    clearErrors();
    updateSlip();
    const labels = { 1: 'le soin', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'la confirmation' };
    if (live) live.textContent = number === 5 ? 'La simulation est terminée. Rien n’a été envoyé.' : `Étape ${number} sur 5${NBSP}:${NBSP}${labels[number]}.`;
    if (options.focus !== false) {
      const heading = $(`[data-step="${number}"] .panel-title`, form);
      heading?.focus({ preventScroll: true });
      if (heading) {
        const rect = heading.getBoundingClientRect();
        if (rect.top < 0 || rect.top > window.innerHeight * .72) heading.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
      }
    }
  };
  const setService = (serviceId, reset = true) => {
    const service = serviceById(serviceId);
    if (!service) return;
    if (reset) {
      state.day = '';
      state.time = null;
      state.firstName = '';
      state.mobile = '';
      state.maxStep = 1;
      state.step = 1;
      $('#first-name', form).value = '';
      $('#mobile', form).value = '';
    }
    state.service = service.id;
    const radio = $(`input[name="service"][value="${service.id}"]`, form);
    if (radio) radio.checked = true;
    if (reset) setStep(1, { focus: false });
    else {
      clearErrors();
      updateSlip();
    }
  };

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === 'service') {
      setService(input.value);
      setFieldError('service', false);
    }
    if (input.name === 'day') {
      state.day = input.value;
      state.time = null;
      state.maxStep = Math.min(state.maxStep, 2);
      updateSlip();
      setFieldError('day', false);
    }
    if (input.name === 'time') {
      state.time = Number(input.value);
      state.maxStep = Math.max(state.maxStep, 3);
      updateSlip();
      setFieldError('time', false);
    }
  });
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const target = Number(button.dataset.go);
    if (target < state.step && target <= state.maxStep) setStep(target);
  }));
  $$('[data-next]', form).forEach((button) => button.addEventListener('click', () => {
    if (state.step === 1) {
      if (!state.service) {
        setFieldError('service', true);
        $('input[name="service"]:not(:disabled)', form)?.focus();
        return;
      }
      state.maxStep = Math.max(state.maxStep, 2);
      setStep(2);
    } else if (state.step === 2) {
      if (!state.day) {
        setFieldError('day', true);
        $('input[name="day"]:not(:disabled)', dayHost)?.focus();
        return;
      }
      state.maxStep = Math.max(state.maxStep, 3);
      setStep(3);
    } else if (state.step === 3) {
      if (state.time == null) {
        setFieldError('time', true);
        $('input[name="time"]:not(:disabled)', slotHost)?.focus();
        return;
      }
      state.maxStep = Math.max(state.maxStep, 4);
      setStep(4);
    }
  }));
  $$('[data-back]', form).forEach((button) => button.addEventListener('click', () => {
    if (state.step > 1 && state.step < 5) setStep(state.step - 1);
  }));
  $('[data-confirm]', form).addEventListener('click', () => {
    const firstName = $('#first-name', form);
    const mobile = $('#mobile', form);
    const cleanName = firstName.value.trim();
    const normalizedPhone = mobile.value.replace(/[\s().-]/g, '');
    const validName = cleanName.length >= 2;
    const validPhone = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalizedPhone);
    setFieldError('name', !validName, firstName);
    setFieldError('phone', !validPhone, mobile);
    if (!validName) { firstName.focus(); return; }
    if (!validPhone) { mobile.focus(); return; }
    state.firstName = cleanName;
    state.mobile = mobile.value.trim();
    state.maxStep = 5;
    $('[data-success-copy]', form).textContent = `${state.firstName}, votre simulation porte sur ${serviceById(state.service).name}, le ${dateLabel(state.day)} à ${timeLabel(state.time)}.`;
    setStep(5);
  });
  $('[data-restart]', form).addEventListener('click', () => {
    state.step = 1;
    state.maxStep = 1;
    state.service = '';
    state.day = '';
    state.time = null;
    state.firstName = '';
    state.mobile = '';
    form.reset();
    updateSlip();
    stepButtons.forEach((button) => { button.disabled = Number(button.dataset.go) >= 1; });
    setStep(1);
  });

  const escapeIcs = (value) => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  $('[data-calendar]', form).addEventListener('click', () => {
    const service = serviceById(state.service);
    const day = state.day.replace(/-/g, '');
    const start = `${day}T${String(Math.floor(state.time / 60)).padStart(2, '0')}${String(state.time % 60).padStart(2, '0')}00`;
    const endMinute = state.time + service.duration;
    const end = `${day}T${String(Math.floor(endMinute / 60)).padStart(2, '0')}${String(endMinute % 60).padStart(2, '0')}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const eventId = `${Date.now()}@studio-lamy-preview`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu de reservation//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${eventId}`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Paris:${start}`, `DTEND;TZID=Europe/Paris:${end}`,
      `SUMMARY:${escapeIcs(service.name)} · simulation`, `LOCATION:${escapeIcs(ADDRESS)}`,
      'DESCRIPTION:Simulation locale uniquement. Ce fichier ne confirme pas un rendez-vous. Réserver sur Planity.',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rappel-soin.ics';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-preselect]');
    if (!link) return;
    setService(link.dataset.preselect);
  });

  updateSlip();
  window.__siteReady = true;
})();
