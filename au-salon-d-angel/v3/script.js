(() => {
  'use strict';

  const page = document.documentElement;
  page.classList.add('js');
  window.requestAnimationFrame(() => page.classList.add('motion-ready'));

  const menuButton = document.querySelector('.nav-toggle');
  const menu = document.querySelector('#navigation-principale');

  function closeMenu(returnFocus = false) {
    if (!menuButton || !menu) return;
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
    if (returnFocus) menuButton.focus();
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(willOpen));
      menuButton.setAttribute('aria-label', willOpen ? 'Fermer la navigation' : 'Ouvrir la navigation');
      menu.classList.toggle('is-open', willOpen);
      if (willOpen) menu.querySelector('a')?.focus();
    });

    menu.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const destination = link.getAttribute('href');
      const section = destination?.startsWith('#') ? document.querySelector(destination) : null;
      const heading = section?.querySelector('h1, h2, h3') || section;
      if (heading) heading.setAttribute('tabindex', '-1');
      closeMenu();
      window.requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });

    document.addEventListener('pointerdown', (event) => {
      if (menuButton.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  const revealTargets = document.querySelectorAll('.reveal, [data-draw-line]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -7% 0px' });
    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  }

  const mobileBar = document.querySelector('.mobile-action-bar');
  const occludingSections = document.querySelectorAll('#rendez-vous, .site-footer');
  if (mobileBar && 'IntersectionObserver' in window) {
    const visibleSections = new Set();
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      mobileBar.classList.toggle('is-obscured', visibleSections.size > 0);
    }, { threshold: 0.02 });
    occludingSections.forEach((section) => barObserver.observe(section));
  }

  const panels = Array.from(document.querySelectorAll('[data-step-panel]'));
  const progressButtons = Array.from(document.querySelectorAll('[data-progress-step]'));
  const serviceInputs = Array.from(document.querySelectorAll('input[name="prestation"]'));
  const dayOptions = document.querySelector('[data-date-options]');
  const timeOptions = document.querySelector('[data-time-options]');
  const bookingForm = document.querySelector('#booking-form');
  const summaryService = document.querySelector('[data-summary-service]');
  const summaryDay = document.querySelector('[data-summary-day]');
  const summaryTime = document.querySelector('[data-summary-time]');
  const state = { step: 1, furthest: 1, service: '', day: null, time: '' };

  const openingHours = {
    0: null,
    1: null,
    2: [9 * 60, 18 * 60],
    3: [9 * 60, 12 * 60],
    4: null,
    5: [9 * 60, 18 * 60],
    6: [9 * 60, 17 * 60]
  };

  function parisParts(date) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function dateKey(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }

  function frenchDate(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...options }).format(date);
  }

  function currentParisKey() {
    const parts = parisParts(new Date());
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function updateSummary() {
    if (summaryService) summaryService.textContent = state.service || 'À choisir';
    if (summaryDay) summaryDay.textContent = state.day ? frenchDate(state.day.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    if (summaryTime) summaryTime.textContent = state.time ? state.time.replace(':', ' h ') : 'À choisir';
  }

  function updateProgress() {
    progressButtons.forEach((button) => {
      const step = Number(button.dataset.progressStep);
      const current = step === state.step;
      button.classList.toggle('is-current', current);
      button.disabled = step > state.furthest;
      if (current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(step, moveFocus = true) {
    state.step = step;
    panels.forEach((panel) => {
      const active = Number(panel.dataset.stepPanel) === step;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
    });
    updateProgress();
    updateSummary();
    if (moveFocus) {
      const activeHeading = document.querySelector(`[data-step-panel="${step}"] h3`);
      window.requestAnimationFrame(() => activeHeading?.focus({ preventScroll: true }));
    }
  }

  function setError(name, message) {
    const error = document.querySelector(`[data-error="${name}"]`);
    if (error) error.textContent = message;
  }

  function buildDates() {
    if (!dayOptions) return;
    const today = parisParts(new Date());
    const base = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day), 12));
    const todayKey = currentParisKey();
    const todayTime = parisParts(new Date());
    const nowMinutes = Number(todayTime.hour) * 60 + Number(todayTime.minute);
    const dateLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' });

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(base.getTime() + offset * 86400000);
      const key = dateKey(date);
      const hours = openingHours[date.getUTCDay()];
      const parts = dateLabel.formatToParts(date);
      const weekday = parts.find((part) => part.type === 'weekday')?.value || '';
      const day = parts.find((part) => part.type === 'day')?.value || '';
      const month = parts.find((part) => part.type === 'month')?.value || '';
      const uncertain = date.getUTCDay() === 4;
      const closed = !hours && !uncertain;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-option';
      button.disabled = !hours || (key === todayKey && nowMinutes >= hours[1]);
      button.dataset.dateKey = key;
      button.setAttribute('aria-label', `${weekday} ${day} ${month}${uncertain ? ', horaires à confirmer' : closed ? ', fermé' : ''}`);
      button.innerHTML = `<span>${weekday}</span><strong>${day} ${month}</strong>${uncertain ? '<small>À confirmer</small>' : closed ? '<small>Fermé</small>' : ''}`;
      button.addEventListener('click', () => {
        dayOptions.querySelectorAll('.date-option').forEach((option) => {
          option.classList.toggle('is-selected', option === button);
          if (option === button) option.setAttribute('aria-pressed', 'true');
          else option.removeAttribute('aria-pressed');
        });
        state.day = { key, date };
        state.time = '';
        state.furthest = Math.min(state.furthest, 2);
        setError('jour', '');
        setError('heure', '');
        renderTimes();
        updateProgress();
        updateSummary();
      });
      dayOptions.append(button);
    }
  }

  function renderTimes() {
    if (!timeOptions || !state.day) return;
    timeOptions.replaceChildren();
    const weekday = state.day.date.getUTCDay();
    const hours = openingHours[weekday];
    if (!hours) return;
    const todayKey = currentParisKey();
    const now = parisParts(new Date());
    const nowMinutes = Number(now.hour) * 60 + Number(now.minute);
    let count = 0;

    for (let minute = hours[0]; minute < hours[1]; minute += 60) {
      const hour = Math.floor(minute / 60);
      const remainder = minute % 60;
      const value = `${String(hour).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-option';
      button.textContent = `${String(hour).padStart(2, '0')} h ${String(remainder).padStart(2, '0')}`;
      button.dataset.time = value;
      button.disabled = state.day.key === todayKey && minute <= nowMinutes;
      if (button.disabled) button.title = 'Cette heure est déjà passée';
      button.addEventListener('click', () => {
        timeOptions.querySelectorAll('.time-option').forEach((option) => {
          option.classList.toggle('is-selected', option === button);
          if (option === button) option.setAttribute('aria-pressed', 'true');
          else option.removeAttribute('aria-pressed');
        });
        state.time = value;
        state.furthest = Math.min(state.furthest, 3);
        setError('heure', '');
        updateProgress();
        updateSummary();
      });
      timeOptions.append(button);
      if (!button.disabled) count += 1;
    }

    if (count === 0) {
      const note = document.createElement('p');
      note.className = 'step-description';
      note.textContent = 'Aucune heure de démonstration ne reste aujourd’hui. Choisissez un autre jour.';
      timeOptions.append(note);
    }
  }

  serviceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      state.service = input.value;
      state.day = null;
      state.time = '';
      state.furthest = 1;
      dayOptions?.querySelectorAll('.date-option').forEach((option) => {
        option.classList.remove('is-selected');
        option.removeAttribute('aria-pressed');
      });
      timeOptions?.replaceChildren();
      setError('prestation', '');
      setError('jour', '');
      setError('heure', '');
      updateProgress();
      updateSummary();
    });
  });

  document.querySelectorAll('[data-preselect]').forEach((link) => {
    link.addEventListener('click', () => {
      const input = serviceInputs.find((option) => option.value === link.dataset.preselect);
      if (!input) return;
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      showStep(1);
    });
  });

  function canContinue(nextStep) {
    if (nextStep === 2 && !state.service) {
      setError('prestation', 'Choisissez une prestation pour continuer.');
      serviceInputs[0]?.focus();
      return false;
    }
    if (nextStep === 3 && !state.day) {
      setError('jour', 'Choisissez un jour de démonstration pour continuer.');
      dayOptions?.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    if (nextStep === 4 && !state.time) {
      setError('heure', 'Choisissez une heure de démonstration pour continuer.');
      timeOptions?.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  document.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextStep = Number(button.dataset.nextStep);
      if (!canContinue(nextStep)) return;
      state.furthest = Math.max(state.furthest, nextStep);
      showStep(nextStep);
    });
  });

  document.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.previousStep)));
  });

  progressButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = Number(button.dataset.progressStep);
      if (target <= state.furthest) showStep(target);
    });
  });

  function clearFieldError(input, errorId) {
    const error = document.querySelector(`#${errorId}`);
    input.removeAttribute('aria-invalid');
    if (error) error.textContent = '';
  }

  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  firstName?.addEventListener('input', () => clearFieldError(firstName, 'erreur-prenom'));
  phone?.addEventListener('input', () => clearFieldError(phone, 'erreur-telephone'));

  function validFrenchMobile(value) {
    const compact = value.trim().replace(/[\s().-]/g, '');
    return /^0[67]\d{8}$/.test(compact) || /^\+33[67]\d{8}$/.test(compact);
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      let valid = true;
      const nameValue = firstName?.value.trim() || '';
      const phoneValue = phone?.value.trim() || '';
      const nameError = document.querySelector('#erreur-prenom');
      const phoneError = document.querySelector('#erreur-telephone');

      clearFieldError(firstName, 'erreur-prenom');
      clearFieldError(phone, 'erreur-telephone');

      if (nameValue.length < 2) {
        if (nameError) nameError.textContent = 'Indiquez votre prénom.';
        firstName?.setAttribute('aria-invalid', 'true');
        firstName?.focus();
        valid = false;
      }
      if (!validFrenchMobile(phoneValue)) {
        if (phoneError) phoneError.textContent = 'Indiquez un numéro mobile français commençant par 06 ou 07.';
        phone?.setAttribute('aria-invalid', 'true');
        if (valid) phone?.focus();
        valid = false;
      }
      if (!valid) return;

      const successName = document.querySelector('[data-success-name]');
      const successSummary = document.querySelector('[data-success-summary]');
      if (successName) successName.textContent = nameValue;
      if (successSummary) {
        const day = state.day ? frenchDate(state.day.date, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        successSummary.textContent = `${state.service}, le ${day} à ${state.time.replace(':', ' h ')}.`;
      }
      state.furthest = 5;
      showStep(5);
    });
  }

  buildDates();
  updateProgress();
  updateSummary();
  showStep(1, false);
})();
