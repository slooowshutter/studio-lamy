/* ANA GALAN · aperçu non officiel · interactions locales, sans envoi. */
window.__anaGalanSite = 1;
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const hours = {
    0: null,
    1: null,
    2: [540, 1110],
    3: [540, 1110],
    4: [540, 1110],
    5: [540, 1110],
    6: [540, 1080]
  };
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const shortDayNames = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const state = { current: 1, completed: new Set(), service: null, date: null, time: null, busy: false };

  const pad2 = value => String(value).padStart(2, '0');
  const dateKey = date => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const formatDay = date => `${dayNames[date.getDay()]} ${date.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date)}`;
  const formatTime = minutes => `${pad2(Math.floor(minutes / 60))}\u00a0h\u00a0${pad2(minutes % 60)}`;
  const getService = () => {
    const input = $('input[name="service"]:checked');
    return input ? {
      id: input.value,
      name: input.dataset.name
    } : null;
  };

  function setupMenu() {
    const toggle = $('.menu-toggle');
    const menu = $('#mobile-nav');
    if (!toggle || !menu) return;
    menu.inert = true;
    const close = (restoreFocus = false) => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Ouvrir le menu');
      menu.classList.remove('is-open');
      menu.inert = true;
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', open);
      menu.inert = !open;
      if (open) $('.mobile-nav a', menu)?.focus();
    });
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) close(false);
    });
    doc.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true);
    });
  }

  function setupReveals() {
    const reveals = $$('[data-reveal]');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      reveals.forEach(element => element.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach(element => observer.observe(element));
  }

  function setupStickyBar() {
    const bar = $('#mobile-bar');
    const hero = $('.hero');
    const booking = $('#reserver');
    const footer = $('.site-footer');
    if (!bar || !hero || !booking || !footer || !('IntersectionObserver' in window)) return;
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const update = () => {
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      bar.classList.toggle('is-visible', mobile && !heroVisible && !bookingVisible && !footerVisible);
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === booking) bookingVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      update();
    }, { threshold: 0.08 });
    [hero, booking, footer].forEach(element => observer.observe(element));
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  function setupBooking() {
    const form = $('#booking-form');
    const steps = $$('.flow-step', form);
    const progressButtons = $$('[data-jump]');
    const summary = $('#summary-value');
    const recap = $('#booking-recap');
    const announcement = $('#flow-announcement');
    const dayOptions = $('#day-options');
    const timeOptions = $('#time-options');
    const success = $('#booking-success');
    const successRecap = $('#success-recap');
    const serviceRadios = $$('input[name="service"]', form);
    if (!form || !steps.length) return;

    function updateProgress() {
      const furthest = Math.max(...state.completed, state.current);
      progressButtons.forEach(button => {
        const target = Number(button.dataset.jump);
        button.disabled = target > furthest;
        if (target === state.current) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
    }

    function updateSummary() {
      state.service = getService();
      if (!state.service) return;
      const pieces = [`${state.service.name}`];
      if (state.date) pieces.push(formatDay(state.date));
      if (state.time !== null) pieces.push(formatTime(state.time));
      summary.textContent = pieces.join(' · ');
      const recapParts = [state.service.name];
      if (state.date) recapParts.push(formatDay(state.date));
      if (state.time !== null) recapParts.push(`à ${formatTime(state.time)}`);
      recap.textContent = `${recapParts.join(' · ')}.`;
    }

    function clearStepError(name) {
      const error = $(`[data-error="${name}"]`, form);
      if (error) error.textContent = '';
    }

    function announceStep() {
      const heading = $(`#step-title-${state.current}`);
      announcement.textContent = `Étape ${state.current} sur 4 : ${heading ? heading.textContent.replace(/^\d+\s*/, '') : ''}.`;
      if (heading) {
        heading.focus({ preventScroll: true });
        heading.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    }

    function goToStep(target) {
      if (target === state.current || state.busy) return;
      const currentElement = $(`[data-step="${state.current}"]`, form);
      const nextElement = $(`[data-step="${target}"]`, form);
      if (!currentElement || !nextElement) return;
      state.busy = true;
      const finish = () => {
        currentElement.classList.remove('is-current', 'is-out');
        nextElement.classList.add('is-current', 'is-in');
        state.current = target;
        updateProgress();
        updateSummary();
        requestAnimationFrame(() => nextElement.classList.remove('is-in'));
        announceStep();
        window.setTimeout(() => { state.busy = false; }, reduceMotion.matches ? 0 : 240);
      };
      if (reduceMotion.matches) {
        finish();
      } else {
        currentElement.classList.add('is-out');
        window.setTimeout(finish, 180);
      }
    }

    function serviceIsValid() {
      if (!getService()) {
        const error = $('[data-error="service"]', form);
        error.textContent = 'Choisissez une prestation pour continuer.';
        return false;
      }
      clearStepError('service');
      return true;
    }

    function renderDays() {
      dayOptions.replaceChildren();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        const open = hours[date.getDay()];
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'day-option';
        button.dataset.date = dateKey(date);
        button.disabled = !open;
        const selected = Boolean(state.date && dateKey(state.date) === dateKey(date));
        button.setAttribute('aria-pressed', String(selected));
        if (selected) button.classList.add('is-selected');
        const weekday = doc.createElement('span');
        weekday.className = 'day-option__weekday';
        weekday.textContent = shortDayNames[date.getDay()];
        const number = doc.createElement('span');
        number.className = 'day-option__date';
        number.textContent = pad2(date.getDate());
        const status = doc.createElement('span');
        status.className = 'day-option__state';
        status.textContent = open ? (offset === 0 ? 'auj.' : 'ouvert') : 'fermé';
        button.setAttribute('aria-label', `${formatDay(date)}${offset === 0 ? ', aujourd’hui' : ''}${open ? '' : ', fermé'}`);
        button.append(weekday, number, status);
        if (open) {
          button.addEventListener('click', () => {
            state.date = date;
            state.time = null;
            clearStepError('day');
            renderTimes();
            $$('.day-option', dayOptions).forEach(option => {
              const selected = option === button;
              option.classList.toggle('is-selected', selected);
              option.setAttribute('aria-pressed', String(selected));
            });
            updateSummary();
          });
        }
        dayOptions.append(button);
      }
    }

    function hashDate(value) {
      let hash = 0;
      for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
      return hash;
    }

    function isTaken(date, minute, index) {
      const seed = hashDate(dateKey(date)) + minute * 7 + state.service.id.length * 19 + index * 31;
      return seed % 9 === 0;
    }

    function renderTimes() {
      timeOptions.replaceChildren();
      if (!state.date || !state.service) return;
      const hoursForDate = hours[state.date.getDay()];
      if (!hoursForDate) return;
      const [opening, closing] = hoursForDate;
      const now = new Date();
      const isToday = dateKey(now) === dateKey(state.date);
      let index = 0;
      for (let minute = opening; minute < closing; minute += 30) {
        const label = doc.createElement('label');
        label.className = 'time-option';
        const input = doc.createElement('input');
        input.type = 'radio';
        input.name = 'booking-time';
        input.value = String(minute);
        input.dataset.time = String(minute);
        const visibleTime = doc.createElement('time');
        visibleTime.className = 'time-option__value';
        visibleTime.dateTime = `${dateKey(state.date)}T${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`;
        visibleTime.textContent = formatTime(minute);
        label.append(input, visibleTime);
        const taken = isTaken(state.date, minute, index);
        const past = isToday && minute <= now.getHours() * 60 + now.getMinutes();
        if (taken || past) {
          input.disabled = true;
          label.classList.add(past ? 'is-past' : 'is-taken');
          input.setAttribute('aria-label', `${formatTime(minute)}, ${past ? 'heure passée' : 'déjà pris dans cette simulation'}`);
        } else {
          input.checked = state.time === minute;
          input.addEventListener('change', () => {
            state.time = minute;
            clearStepError('time');
            updateSummary();
          });
        }
        timeOptions.append(label);
        index += 1;
      }
    }

    function validateStep() {
      if (state.current === 1) {
        if (!serviceIsValid()) return false;
        state.completed.add(1);
        state.service = getService();
        updateSummary();
        renderDays();
        return true;
      }
      if (state.current === 2) {
        if (!state.date) {
          $('[data-error="day"]', form).textContent = 'Choisissez un jour ouvert pour continuer.';
          return false;
        }
        clearStepError('day');
        state.completed.add(2);
        renderTimes();
        return true;
      }
      if (state.current === 3) {
        const stillAvailable = state.time !== null && $$('input[data-time]', timeOptions).some(input => Number(input.dataset.time) === state.time && !input.disabled);
        if (!stillAvailable) {
          state.time = null;
          renderTimes();
          $('[data-error="time"]', form).textContent = 'Ce créneau n’est plus disponible dans la simulation. Choisissez-en un autre.';
          return false;
        }
        clearStepError('time');
        state.completed.add(3);
        updateSummary();
        return true;
      }
      return true;
    }

    serviceRadios.forEach(radio => radio.addEventListener('change', () => {
      state.service = getService();
      state.time = null;
      if (state.date) renderTimes();
      clearStepError('service');
      updateSummary();
    }));

    $$('[data-next]', form).forEach(button => button.addEventListener('click', () => {
      if (!validateStep()) return;
      goToStep(Math.min(state.current + 1, 4));
    }));
    $$('[data-back]', form).forEach(button => button.addEventListener('click', () => goToStep(Math.max(1, state.current - 1))));
    progressButtons.forEach(button => button.addEventListener('click', () => {
      const target = Number(button.dataset.jump);
      if (!button.disabled) goToStep(target);
    }));

    function phoneIsValid(value) {
      let normalized = value.trim().replace(/[\s().-]/g, '');
      if (normalized.startsWith('0033')) normalized = `+33${normalized.slice(4)}`;
      return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(normalized);
    }

    const nameInput = $('#first-name', form);
    const phoneInput = $('#phone', form);
    nameInput.addEventListener('input', () => {
      $('#first-name-error').textContent = '';
      nameInput.removeAttribute('aria-invalid');
    });
    phoneInput.addEventListener('input', () => {
      $('#phone-error').textContent = '';
      phoneInput.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!validateStep()) return;
      const firstName = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      let valid = true;
      if (!firstName) {
        $('#first-name-error').textContent = 'Indiquez votre prénom.';
        nameInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }
      if (!phoneIsValid(phone)) {
        $('#phone-error').textContent = 'Saisissez un numéro mobile français valide.';
        phoneInput.setAttribute('aria-invalid', 'true');
        valid = false;
      }
      if (!valid) {
        $('[data-error="contact"]', form).textContent = 'Vérifiez les champs indiqués.';
        (nameInput.getAttribute('aria-invalid') ? nameInput : phoneInput).focus();
        return;
      }
      $('[data-error="contact"]', form).textContent = '';
      state.completed.add(4);
      updateProgress();
      updateSummary();
      successRecap.textContent = `${firstName}, votre choix : ${recap.textContent}`;
      form.hidden = true;
      $('.booking-progress').hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      announcement.textContent = 'Simulation terminée. Aucune réservation n’a été envoyée.';
    });

    function utcStamp(date, minute) {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minute / 60), minute % 60);
      return start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }
    function escapeICS(value) {
      return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }
    $('#calendar-download').addEventListener('click', () => {
      if (!state.date || state.time === null || !state.service) return;
      const start = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate(), Math.floor(state.time / 60), state.time % 60);
      const description = escapeICS(`Simulation d’aperçu pour Ana Galan. Aucune réservation n’a été envoyée.`);
      const location = escapeICS('6 rue Alexander Taylor, 64000 Pau');
      const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ANA GALAN//FR', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT', `UID:ana-galan-${Date.now()}@studiolamy.local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
        `DTSTART:${utcStamp(state.date, state.time)}`,
        `SUMMARY:${escapeICS(`Simulation · ${state.service.name}`)}`, `DESCRIPTION:${description}`, `LOCATION:${location}`,
        'END:VEVENT', 'END:VCALENDAR'
      ];
      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = doc.createElement('a');
      link.href = url;
      link.download = 'rendez-vous-simule-ana-galan.ics';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    state.service = getService();
    updateSummary();
    updateProgress();
  }

  setupMenu();
  setupReveals();
  setupStickyBar();
  setupBooking();
  requestAnimationFrame(() => root.classList.add('motion-ready'));
})();
