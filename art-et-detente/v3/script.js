(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('is-ready')));

  const revealTargets = document.querySelectorAll('.signature-inner, .visit-step, .service-row, .street-marker');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((target) => {
      target.setAttribute('data-reveal', '');
      revealObserver.observe(target);
    });
  } else {
    revealTargets.forEach((target) => target.classList.add('is-visible'));
  }

  const menuButton = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('#site-nav');
  if (menuButton && siteNav) {
    const closeMenu = (restoreFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Ouvrir le menu');
      siteNav.classList.remove('is-open');
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      siteNav.classList.toggle('is-open', open);
      if (open) siteNav.querySelector('a')?.focus();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a') && window.matchMedia('(max-width: 760px)').matches) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (!window.matchMedia('(max-width: 760px)').matches) closeMenu();
    }, { passive: true });
  }

  const mobileBar = document.querySelector('#mobile-bar');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  if (mobileBar && bookingSection && footer && 'IntersectionObserver' in window) {
    const inView = new Set();
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) inView.add(entry.target);
        else inView.delete(entry.target);
      });
      mobileBar.classList.toggle('is-inactive', inView.size > 0);
      mobileBar.setAttribute('aria-hidden', String(inView.size > 0));
    }, { threshold: 0.01 });
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
  }

  const panel = document.querySelector('#booking-panel');
  const progress = document.querySelector('#booking-progress');
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.id = 'booking-announcement';
  document.querySelector('#booking-card')?.append(live);
  const dayOptions = document.querySelector('#day-options');
  const timeOptions = document.querySelector('#time-options');
  const state = { service: null, day: null, time: null, step: 'service' };
  const flowOrder = ['service', 'day', 'time', 'contact', 'success'];
  const stepLabels = { service: 'La prestation', day: 'Le jour', time: 'L’heure', contact: 'Vos coordonnées', success: 'Confirmation simulée' };
  const serviceRadios = [...document.querySelectorAll('input[name="service"]')];
  const nextButtons = [...document.querySelectorAll('[data-next]')];
  const summaryService = document.querySelector('#summary-service');
  const summaryDay = document.querySelector('#summary-day');
  const summaryTime = document.querySelector('#summary-time');
  const summaryPrice = document.querySelector('#summary-price');
  const summaryEdits = [...document.querySelectorAll('[data-edit]')];
  const phoneInput = document.querySelector('#booking-phone');
  const nameInput = document.querySelector('#booking-name');
  let stepTimer = null;

  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const frDate = (date, options = { weekday: 'long', day: 'numeric', month: 'long' }) => new Intl.DateTimeFormat('fr-FR', options).format(date);
  const todayKey = dateKey(new Date());
  const announcement = (message) => { live.textContent = message; };

  function updateSummary() {
    summaryService.textContent = state.service ? state.service.name : 'À choisir';
    summaryDay.textContent = state.day ? frDate(state.day, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    summaryTime.textContent = state.time || 'À choisir';
    summaryPrice.textContent = state.service ? 'À confirmer' : '—';
    summaryEdits.forEach((button) => {
      const which = button.dataset.edit;
      const complete = which === 'service' ? Boolean(state.service) : which === 'day' ? Boolean(state.day) : Boolean(state.time);
      button.disabled = !complete;
    });
  }

  function activateStep(name) {
    panel.querySelectorAll('[data-step]').forEach((step) => { step.hidden = step.dataset.step !== name; });
    state.step = name;
    const position = flowOrder.indexOf(name) + 1;
    progress.textContent = name === 'success' ? 'Terminé · démonstration' : `Étape ${position} sur 4`;
    const heading = panel.querySelector(`[data-step="${name}"] .flow-heading`);
    heading?.focus({ preventScroll: true });
    announcement(`${stepLabels[name]} · ${name === 'success' ? 'confirmation simulée' : `étape ${position} sur 4`}.`);
    updateSummary();
  }

  function showStep(name) {
    const nextPanel = panel.querySelector(`[data-step="${name}"]`);
    if (!nextPanel) return;
    window.clearTimeout(stepTimer);
    const currentPanel = panel.querySelector('[data-step]:not([hidden])');
    if (!currentPanel || currentPanel === nextPanel) {
      activateStep(name);
      return;
    }
    panel.classList.add('is-leaving');
    stepTimer = window.setTimeout(() => {
      activateStep(name);
      panel.classList.remove('is-leaving');
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }, 180);
  }

  function scheduleFor(date) {
    const weekday = date.getDay();
    if (weekday === 0) return null;
    return weekday === 1 ? { open: 10 * 60, close: 19 * 60 } : { open: 9 * 60, close: (weekday === 6 ? 17 : 19) * 60 };
  }

  function addDayOptions() {
    const now = new Date();
    dayOptions.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
      const open = scheduleFor(day);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-option';
      button.dataset.date = dateKey(day);
      button.disabled = !open;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${frDate(day)}${open ? '' : ', fermé'}`);
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day).replace('.', '');
      const date = document.createElement('strong');
      date.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(day).replace('.', '');
      const stateLabel = document.createElement('small');
      stateLabel.textContent = open ? (dateKey(day) === todayKey ? 'aujourd’hui' : 'ouvert') : 'fermé';
      button.append(weekday, date, stateLabel);
      if (open) {
        button.addEventListener('click', () => {
          state.day = day;
          state.time = null;
          dayOptions.querySelectorAll('.day-option').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          document.querySelector('[data-next="time"]').disabled = false;
          document.querySelector('[data-next="contact"]').disabled = true;
          document.querySelector('#day-error').hidden = true;
          updateSummary();
          renderTimeOptions();
        });
      }
      dayOptions.append(button);
    }
  }

  function renderTimeOptions() {
    timeOptions.replaceChildren();
    const selectedService = state.service;
    if (!state.day || !selectedService) return;
    const hours = scheduleFor(state.day);
    const dayLabel = document.querySelector('#slot-day-label');
    dayLabel.textContent = `${frDate(state.day)} · horaires indiqués sur Planity, à confirmer`;
    if (!hours) {
      const closed = document.createElement('p');
      closed.textContent = 'Fermé ce jour-là, selon les horaires indiqués sur Planity.';
      timeOptions.append(closed);
      return;
    }
    const seed = [...`${dateKey(state.day)}${selectedService.id}`].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const current = new Date();
    const isToday = dateKey(state.day) === dateKey(current);
    let slotIndex = 0;
    let restoredSelection = false;
    for (let start = hours.open; start < hours.close; start += 30) {
      const busy = (slotIndex + seed) % 5 === 1;
      const past = isToday && start <= current.getHours() * 60 + current.getMinutes();
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-option';
      button.textContent = `${String(Math.floor(start / 60)).padStart(2, '0')} h ${String(start % 60).padStart(2, '0')}`;
      button.disabled = busy || past;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${button.textContent}${busy ? ', déjà pris, exemple' : past ? ', heure passée' : ', disponible dans cette démonstration'}`);
      if (busy) button.classList.add('is-busy');
      if (!button.disabled) {
        if (button.textContent === state.time) {
          button.setAttribute('aria-pressed', 'true');
          restoredSelection = true;
        }
        button.addEventListener('click', () => {
          state.time = button.textContent;
          timeOptions.querySelectorAll('.time-option').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          document.querySelector('[data-next="contact"]').disabled = false;
          document.querySelector('#time-error').hidden = true;
          updateSummary();
        });
      }
      timeOptions.append(button);
      slotIndex += 1;
    }
    if (state.time && !restoredSelection) state.time = null;
    document.querySelector('[data-next="contact"]').disabled = !state.time;
    updateSummary();
  }

  function updateRecap() {
    const recap = document.querySelector('#confirmation-recap');
    recap.replaceChildren();
    const content = [
      ['Prestation', state.service.name],
      ['Jour', frDate(state.day)],
      ['Heure', state.time]
    ];
    content.forEach(([label, value], index) => {
      if (index) recap.append(document.createTextNode(' · '));
      const strong = document.createElement('strong');
      strong.textContent = `${label} : `;
      recap.append(strong, document.createTextNode(value));
    });
  }

  function isFrenchMobile(value) {
    let digits = value.trim().replace(/[\s().-]/g, '');
    if (digits.startsWith('+33')) digits = `0${digits.slice(3)}`;
    return /^0[67]\d{8}$/.test(digits);
  }

  function validateContact() {
    const nameError = document.querySelector('#name-error');
    const phoneError = document.querySelector('#phone-error');
    const nameValid = nameInput.value.trim().length > 0;
    const phoneValid = isFrenchMobile(phoneInput.value);
    nameError.hidden = nameValid;
    phoneError.hidden = phoneValid;
    nameInput.setAttribute('aria-invalid', String(!nameValid));
    phoneInput.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid) nameInput.focus();
    else if (!phoneValid) phoneInput.focus();
    return nameValid && phoneValid;
  }

  serviceRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const selected = serviceRadios.find((item) => item.checked);
      if (!selected) return;
      const changed = state.service?.id !== selected.value;
      state.service = {
        id: selected.value,
        name: selected.dataset.name
      };
      if (changed) {
        state.day = null;
        state.time = null;
        dayOptions?.querySelectorAll('.day-option').forEach((item) => item.setAttribute('aria-pressed', 'false'));
        document.querySelector('[data-next="day"]').disabled = false;
        document.querySelector('[data-next="time"]').disabled = true;
        document.querySelector('[data-next="contact"]').disabled = true;
      }
      updateSummary();
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.next;
      if (target === 'day' && !state.service) return;
      if (target === 'time' && !state.day) {
        document.querySelector('#day-error').hidden = false;
        return;
      }
      if (target === 'contact' && (!state.day || !state.time)) {
        document.querySelector('#time-error').hidden = false;
        return;
      }
      if (target === 'contact') updateRecap();
      showStep(target);
    });
  });

  summaryEdits.forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.edit;
      if (target === 'time') renderTimeOptions();
      showStep(target);
    });
  });

  document.querySelectorAll('[data-preset]').forEach((link) => {
    link.addEventListener('click', () => {
      const radio = serviceRadios.find((item) => item.value === link.dataset.preset);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      showStep('service');
    });
  });

  document.querySelector('#booking-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateContact()) return;
    const firstName = nameInput.value.trim().split(/\s+/)[0];
    const success = document.querySelector('#success-copy');
    success.textContent = `Merci ${firstName}. Votre demande fictive concerne ${state.service.name.toLocaleLowerCase('fr-FR')}, le ${frDate(state.day)} à ${state.time}.`;
    showStep('success');
  });

  nameInput.addEventListener('input', () => {
    if (!document.querySelector('#name-error').hidden) {
      const valid = nameInput.value.trim().length > 0;
      document.querySelector('#name-error').hidden = valid;
      nameInput.setAttribute('aria-invalid', String(!valid));
    }
  });
  phoneInput.addEventListener('input', () => {
    if (!document.querySelector('#phone-error').hidden) {
      const valid = isFrenchMobile(phoneInput.value);
      document.querySelector('#phone-error').hidden = valid;
      phoneInput.setAttribute('aria-invalid', String(!valid));
    }
  });

  addDayOptions();
  updateSummary();

  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    document.documentElement.classList.add('motion-ok');
  }
})();
