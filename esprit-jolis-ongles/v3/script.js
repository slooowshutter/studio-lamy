(() => {
  'use strict';

  document.documentElement.classList.replace('no-js', 'js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const hero = $('.hero');
  const heroDrawing = $('.hero__water');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero?.classList.add('is-ready');
    heroDrawing?.classList.add('is-drawn');
  }));

  const revealTargets = $$('[data-reveal]');
  const drawings = $$('.signature__line, .street-figure');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible', 'is-drawn');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
    [...new Set([...revealTargets, ...drawings])].forEach((element) => revealObserver.observe(element));
  } else {
    [...revealTargets, ...drawings].forEach((element) => element.classList.add('is-visible', 'is-drawn'));
  }

  const mobileBar = $('[data-mobile-bar]');
  if (mobileBar && 'IntersectionObserver' in window) {
    const sections = { hero: true, booking: false, footer: false };
    const updateBar = () => {
      const visible = !sections.hero && !sections.booking && !sections.footer;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.toggleAttribute('inert', !visible);
      mobileBar.setAttribute('aria-hidden', String(!visible));
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const key = entry.target === hero ? 'hero' : entry.target.id === 'rendez-vous' ? 'booking' : 'footer';
        sections[key] = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.01 });
    if (hero) barObserver.observe(hero);
    const bookingSection = $('#rendez-vous');
    const footer = $('.site-footer');
    if (bookingSection) barObserver.observe(bookingSection);
    if (footer) barObserver.observe(footer);
  } else if (mobileBar) {
    mobileBar.classList.add('is-visible');
    mobileBar.removeAttribute('inert');
    mobileBar.setAttribute('aria-hidden', 'false');
  }

  const form = $('#booking-form');
  if (!form) return;

  const SHOP = {
    phone: '06 63 67 07 29'
  };
  const EURO = '\u202f€';
  const NNBSP = '\u202f';
  const HOURS = {
    0: null,
    1: [9 * 60, 18 * 60],
    2: [9 * 60, 18 * 60],
    3: [9 * 60, 18 * 60],
    4: [9 * 60, 18 * 60],
    5: [9 * 60, 18 * 60],
    6: [9 * 60, 13 * 60]
  };
  const SERVICES = [
    { id: 'balneo', name: 'Soin des pieds en balnéo', minutes: 45, price: 35 },
    { id: 'semi-mains', name: 'Semi-permanent mains', minutes: 60, price: 32 },
    { id: 'semi-pieds', name: 'Semi-permanent pieds', minutes: 60, price: 35 },
    { id: 'extensions', name: 'Extensions d’ongles', minutes: 90, price: 55 },
    { id: 'gainage', name: 'Gainage des ongles naturels', minutes: 60, price: 40 }
  ];
  const serviceById = (id) => SERVICES.find((service) => service.id === id);
  const panels = $$('.form-panel', form);
  const stepButtons = $$('.step-nav [data-goto]', form);
  const stepNav = $('.step-nav', form);
  const live = $('[data-live]', form);
  const dayWrap = $('[data-days]', form);
  const timeWrap = $('[data-times]', form);
  const state = { step: 1, max: 1, service: null, day: null, time: null };
  const fmtWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() + index);
    return { date, index, iso: dateIso(date), weekday: date.getDay() };
  });

  function dateIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function titleCase(value) {
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}${NNBSP}h${NNBSP}${String(minute).padStart(2, '0')}` : `${hour}${NNBSP}h`;
  }

  function dateFromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function longDate(iso) {
    return titleCase(fmtLong.format(dateFromIso(iso)));
  }

  function daySlots(day, service) {
    const windowForDay = HOURS[day.weekday];
    if (!windowForDay || !service) return [];
    const [opening, closing] = windowForDay;
    const isToday = day.iso === dateIso(today);
    const nowLimit = currentMinutes() + 15;
    const slots = [];
    for (let minute = opening; minute + service.minutes <= closing; minute += 30) {
      const past = isToday && minute <= nowLimit;
      let booked = false;
      for (let occupied = minute; occupied < minute + service.minutes; occupied += 30) {
        if (stableHash(`${day.iso}|${occupied}|${service.id}`) % 100 < 17) {
          booked = true;
          break;
        }
      }
      slots.push({ minute, past, booked, available: !past && !booked });
    }
    return slots;
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function dateState(day) {
    if (!HOURS[day.weekday]) return 'closed';
    const service = serviceById(state.service);
    if (service && daySlots(day, service).every((slot) => !slot.available)) return 'full';
    return 'open';
  }

  function renderDays() {
    if (!dayWrap) return;
    dayWrap.innerHTML = dates.map((day) => {
      const stateForDay = dateState(day);
      const disabled = stateForDay !== 'open';
      const dayName = fmtWeekday.format(day.date).replace('.', '');
      const number = fmtDay.format(day.date);
      const tag = stateForDay === 'closed' ? 'fermé' : stateForDay === 'full' ? 'complet' :
        day.index === 0 ? 'auj.' : day.index === 1 ? 'demain' : fmtMonth.format(day.date).replace('.', '');
      const dateName = titleCase(fmtLong.format(day.date));
      const reason = stateForDay === 'closed' ? ', fermé' : stateForDay === 'full' ? ', complet' : '';
      return `<label class="day-choice">
        <input type="radio" name="day" value="${day.iso}" aria-label="${dateName}${reason}"${disabled ? ' disabled' : ''}${state.day === day.iso && !disabled ? ' checked' : ''}>
        <span aria-hidden="true"><small>${dayName}</small><strong>${number}</strong><em>${tag}</em></span>
      </label>`;
    }).join('');
  }

  function renderTimes() {
    if (!timeWrap) return;
    const service = serviceById(state.service);
    const day = dates.find((item) => item.iso === state.day);
    if (!service || !day) {
      timeWrap.innerHTML = '';
      return;
    }
    const slots = daySlots(day, service);
    const freeCount = slots.filter((slot) => slot.available).length;
    const slotNote = $('[data-slot-note]', form);
    if (slotNote) {
      slotNote.textContent = `${longDate(day.iso)} · ${freeCount} ${freeCount === 1 ? 'créneau disponible' : 'créneaux disponibles'} dans les horaires d’essai. Les créneaux barrés sont déjà pris ou passés.`;
    }
    if (!freeCount) {
      timeWrap.innerHTML = '<p class="empty-slots">Aucun créneau libre dans cet exemple. Choisissez un autre jour.</p>';
      return;
    }
    const groups = [
      { id: 'morning', label: 'Matin', min: 0, max: 12 * 60 },
      { id: 'afternoon', label: 'Après-midi', min: 12 * 60, max: 24 * 60 }
    ];
    timeWrap.innerHTML = groups.map((group) => {
      const groupSlots = slots.filter((slot) => slot.minute >= group.min && slot.minute < group.max);
      if (!groupSlots.length) return '';
      return `<div class="slots-group" role="group" aria-labelledby="slots-${group.id}">
        <h4 id="slots-${group.id}">${group.label}</h4>
        <div class="slot-list">${groupSlots.map((slot) => {
          const reason = slot.past ? 'passé' : slot.booked ? 'déjà pris' : '';
          const label = timeLabel(slot.minute);
          return `<label class="time-choice${slot.booked ? ' is-booked' : ''}${slot.past ? ' is-past' : ''}">
            <input type="radio" name="time" value="${slot.minute}" aria-label="${label}${reason ? `, ${reason}` : ''}"${slot.available ? '' : ' disabled'}${state.time === slot.minute && slot.available ? ' checked' : ''}>
            <span>${label}${reason ? `<small>${reason}</small>` : ''}</span>
          </label>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    if (state.time !== null && !slots.some((slot) => slot.minute === state.time && slot.available)) state.time = null;
  }

  function updateSummary() {
    const service = serviceById(state.service);
    const entries = {
      service: service ? service.name : 'À choisir',
      day: state.day ? longDate(state.day) : 'À choisir',
      time: state.time !== null ? timeLabel(state.time) : 'À choisir',
      price: service ? `${service.price}${EURO} · indicatif` : 'Exemple à confirmer'
    };
    Object.entries(entries).forEach(([key, value]) => {
      const element = $(`[data-summary="${key}"]`, form.closest('.booking-grid'));
      if (!element) return;
      element.textContent = value;
      element.classList.toggle('is-filled', value !== 'À choisir' && value !== 'Exemple à confirmer');
    });
  }

  function refreshMax() {
    state.max = state.service ? 2 : 1;
    if (state.service && state.day) state.max = 3;
    if (state.service && state.day && state.time !== null) state.max = 4;
    stepButtons.forEach((button) => {
      const number = Number(button.dataset.goto);
      button.disabled = state.step === 5 || number > state.max;
      if (state.step <= 4 && number === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  const STEP_NAMES = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
  function goToStep(number, options = {}) {
    const previous = state.step;
    state.step = number;
    let activePanel;
    panels.forEach((panel) => {
      const panelStep = Number(panel.dataset.step);
      if (panelStep === number) {
        activePanel = panel;
        panel.hidden = false;
        if (previous !== number) {
          panel.classList.add('is-entering');
          requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
        }
      } else {
        panel.hidden = true;
      }
    });
    stepNav?.classList.toggle('is-complete', number === 5);
    refreshMax();
    $$('.form-error', form).forEach((error) => { error.hidden = true; });
    updateSummary();
    if (number === 2) renderDays();
    if (number === 3) renderTimes();
    if (number === 5) {
      const service = serviceById(state.service);
      const date = state.day ? longDate(state.day) : '';
      const time = state.time !== null ? timeLabel(state.time) : '';
      const guest = $('#guest-name', form).value.trim();
      $('[data-confirm-name]', form).textContent = guest;
      $('[data-confirm-text]', form).textContent = `${service.name} · ${date} à ${time} · ${service.price}${EURO} indicatifs. Pour un vrai rendez-vous, appelez le ${SHOP.phone}.`;
      if (live) live.textContent = 'Récapitulatif affiché. Ceci est une simulation, rien n’a été envoyé.';
    } else if (live && !options.silent) {
      live.textContent = `Étape ${number} sur 4${NNBSP}:${NNBSP}${STEP_NAMES[number]}.`;
    }
    if (activePanel && !options.silent) {
      const heading = $('.panel-title', activePanel);
      heading?.focus();
    }
  }

  function errorForStep(number) {
    const error = $(`[data-error="${number}"]`, form);
    if (error) error.hidden = false;
    if (number === 1) $('input[name="service"]', form)?.focus();
    if (number === 2) $('input[name="day"]:not(:disabled)', form)?.focus();
    if (number === 3) $('input[name="time"]:not(:disabled)', form)?.focus();
  }

  function continueFlow() {
    const step = state.step;
    if (step === 1 && !state.service) return errorForStep(1);
    if (step === 2 && !state.day) return errorForStep(2);
    if (step === 3 && state.time === null) return errorForStep(3);
    if (step < 4) goToStep(step + 1);
  }

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'service') {
      state.service = target.value;
      if (state.day) {
        const day = dates.find((item) => item.iso === state.day);
        if (!day || dateState(day) !== 'open') {
          state.day = null;
          state.time = null;
        } else if (state.time !== null && !daySlots(day, serviceById(state.service)).some((slot) => slot.minute === state.time && slot.available)) {
          state.time = null;
        }
      }
      renderDays();
      if (state.step === 3) renderTimes();
      const error = $('[data-error="1"]', form);
      if (error) error.hidden = true;
    } else if (target.name === 'day') {
      state.day = target.value;
      state.time = null;
      renderTimes();
      const error = $('[data-error="2"]', form);
      if (error) error.hidden = true;
      if (live) {
        const available = daySlots(dates.find((item) => item.iso === state.day), serviceById(state.service)).filter((slot) => slot.available).length;
        live.textContent = `${longDate(state.day)}${NNBSP}:${NNBSP}${available} créneaux disponibles dans cet horaire d’essai.`;
      }
    } else if (target.name === 'time') {
      state.time = Number(target.value);
      const error = $('[data-error="3"]', form);
      if (error) error.hidden = true;
    }
    refreshMax();
    updateSummary();
  });

  form.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    const restart = event.target.closest('[data-restart]');
    const goto = event.target.closest('[data-goto]');
    if (next) continueFlow();
    if (back) goToStep(Math.max(1, state.step - 1));
    if (goto && !goto.disabled) goToStep(Number(goto.dataset.goto));
    if (restart) resetBooking();
  });

  $$('[data-book]').forEach((button) => {
    button.addEventListener('click', () => {
      const serviceId = button.dataset.book;
      const input = $(`input[name="service"][value="${serviceId}"]`, form);
      if (!input) return;
      if (state.service !== serviceId || state.step === 5) {
        state.day = null;
        state.time = null;
      }
      if (state.step === 5) {
        nameInput.value = '';
        phoneInput.value = '';
        [nameInput, phoneInput].forEach((field) => {
          field.removeAttribute('aria-invalid');
          field.setAttribute('aria-describedby', field === nameInput ? 'name-help' : 'phone-help');
        });
      }
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      goToStep(2);
    });
  });

  function isValidMobile(value) {
    return /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(value.replace(/[\s.\-()]/g, ''));
  }

  function setFieldError(input, error, bad, helpId) {
    error.hidden = !bad;
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    input.setAttribute('aria-describedby', bad ? `${helpId} ${error.id}` : helpId);
    return !bad;
  }

  const nameInput = $('#guest-name', form);
  const phoneInput = $('#guest-phone', form);
  const nameError = $('#name-error', form);
  const phoneError = $('#phone-error', form);
  nameInput.addEventListener('blur', () => {
    if (nameInput.value) setFieldError(nameInput, nameError, !nameInput.value.trim(), 'name-help');
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value) setFieldError(phoneInput, phoneError, !isValidMobile(phoneInput.value), 'phone-help');
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < 4) {
      continueFlow();
      return;
    }
    if (state.step !== 4) return;
    const validName = setFieldError(nameInput, nameError, !nameInput.value.trim(), 'name-help');
    const validPhone = setFieldError(phoneInput, phoneError, !isValidMobile(phoneInput.value), 'phone-help');
    const summaryError = $('[data-error="4"]', form);
    if (!validName || !validPhone) {
      summaryError.hidden = false;
      (validName ? phoneInput : nameInput).focus();
      return;
    }
    summaryError.hidden = true;
    goToStep(5);
  });

  function resetBooking() {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null });
    [nameInput, phoneInput].forEach((input) => {
      input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', input === nameInput ? 'name-help' : 'phone-help');
    });
    [nameError, phoneError].forEach((error) => { error.hidden = true; });
    renderDays();
    renderTimes();
    updateSummary();
    goToStep(1);
  }

  renderDays();
  renderTimes();
  updateSummary();
  goToStep(1, { silent: true });
})();
