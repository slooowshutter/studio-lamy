(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cover = document.querySelector('#couverture');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#menu-mobile');

  if (cover) {
    cover.querySelectorAll('.masthead__word').forEach((word) => {
      const letters = [...word.textContent].map((character, index) => {
        const letter = document.createElement('span');
        letter.className = 'masthead__letter';
        letter.textContent = character;
        letter.style.transitionDelay = `${index * 25}ms`;
        return letter;
      });
      word.replaceChildren(...letters);
    });
    requestAnimationFrame(() => cover.classList.add('is-ready'));
  }

  if (menuButton && mobileNav) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      mobileNav.hidden = true;
      if (returnFocus) menuButton.focus();
    };

    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
      if (!open) mobileNav.querySelector('a')?.focus();
    });

    mobileNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const stickyBar = document.querySelector('.mobile-action-bar');
  const coverLead = document.querySelector('.cover-lead');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  if (stickyBar && 'IntersectionObserver' in window) {
    const visible = { hero: true, booking: false, footer: false };
    const paintStickyBar = () => {
      const shouldShow = !visible.hero && !visible.booking && !visible.footer;
      stickyBar.classList.toggle('is-hidden', !shouldShow);
      stickyBar.setAttribute('aria-hidden', String(!shouldShow));
      stickyBar.inert = !shouldShow;
    };
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === coverLead) visible.hero = entry.isIntersecting;
        if (entry.target === bookingSection) visible.booking = entry.isIntersecting;
        if (entry.target === footer) visible.footer = entry.isIntersecting;
      });
      paintStickyBar();
    }, { threshold: 0.08 });
    if (coverLead) stickyObserver.observe(coverLead);
    if (bookingSection) stickyObserver.observe(bookingSection);
    if (footer) stickyObserver.observe(footer);
    paintStickyBar();
  }

  const serviceData = {
    visage: { name: 'Une séance visage INDIBA', duration: 20 },
    corps: { name: 'Une séance corps minceur INDIBA', duration: 20 }
  };
  const booking = document.querySelector('.booking-flow');
  if (!booking) return;

  const stepPanels = [...booking.querySelectorAll('[data-step]')];
  const stepButtons = [...booking.querySelectorAll('[data-step-nav]')];
  const announcement = booking.querySelector('[data-step-announcement]');
  const summary = {
    service: document.querySelector('[data-summary="prestation"]'),
    day: document.querySelector('[data-summary="jour"]'),
    time: document.querySelector('[data-summary="heure"]')
  };
  const dayStrip = booking.querySelector('.date-strip');
  const timeGrid = booking.querySelector('.time-grid');
  const contactForm = booking.querySelector('.contact-fields');
  let currentStep = 0;
  let highestStep = 0;
  let selectedService = 'visage';
  let selectedDay = '';
  let selectedTime = '';
  let hideTimers = [];

  const parisParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  };
  const parisToday = parisParts();
  const todayUtc = Date.UTC(Number(parisToday.year), Number(parisToday.month) - 1, Number(parisToday.day));
  const dateFromKey = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };
  const dateKey = (date) => date.toISOString().slice(0, 10);
  const dateLabel = (date, options) => new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(date);
  const dateLongLabel = (key) => dateLabel(dateFromKey(key), { weekday: 'long', day: 'numeric', month: 'long' });
  const closedDay = (date) => [0, 1].includes(date.getUTCDay());
  const chosenRadio = () => booking.querySelector('input[name="prestation"]:checked');

  const updateSummary = () => {
    if (summary.service) summary.service.textContent = serviceData[selectedService].name;
    if (summary.day) summary.day.textContent = selectedDay ? dateLongLabel(selectedDay) : 'À choisir';
    if (summary.time) summary.time.textContent = selectedTime || 'À choisir';
  };

  const updateProgress = () => {
    stepButtons.forEach((button) => {
      const index = Number(button.dataset.stepNav);
      button.disabled = index > highestStep;
      if (index === currentStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };

  const announceStep = (step) => {
    const labels = ['Étape 1 sur 4, prestation.', 'Étape 2 sur 4, jour.', 'Étape 3 sur 4, heure.', 'Étape 4 sur 4, coordonnées.'];
    if (announcement) announcement.textContent = labels[step] || 'Démonstration terminée. Aucun rendez-vous n’a été envoyé.';
  };

  const showPanel = (index) => {
    hideTimers.forEach((timer) => window.clearTimeout(timer));
    hideTimers = [];
    stepPanels.forEach((panel) => {
      const panelIndex = Number(panel.dataset.step);
      const active = panelIndex === index;
      if (active) {
        panel.hidden = false;
        requestAnimationFrame(() => panel.classList.add('is-active'));
      } else {
        panel.classList.remove('is-active');
        const timer = window.setTimeout(() => {
          if (!panel.classList.contains('is-active')) panel.hidden = true;
        }, prefersReducedMotion ? 1 : 230);
        hideTimers.push(timer);
      }
    });
  };

  const goToStep = (step, message = true) => {
    currentStep = step;
    highestStep = Math.max(highestStep, step);
    updateProgress();
    showPanel(step);
    updateSummary();
    if (message) announceStep(step);
    const heading = booking.querySelector(`[data-step="${step}"] h3`);
    requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
  };

  const makeDates = () => {
    if (!dayStrip) return;
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(todayUtc + offset * 86400000);
      const key = dateKey(date);
      const closed = closedDay(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-choice pressable';
      button.dataset.date = key;
      button.disabled = closed;
      button.setAttribute('aria-pressed', 'false');
      const fullDate = dateLongLabel(key);
      button.setAttribute('aria-label', closed ? `${fullDate}, fermé` : `Choisir ${fullDate} pour la démonstration`);

      const weekday = document.createElement('span');
      weekday.textContent = dateLabel(date, { weekday: 'short' }).replace('.', '');
      const number = document.createElement('span');
      number.textContent = dateLabel(date, { day: 'numeric', month: 'short' }).replace('.', '');
      const state = document.createElement('span');
      state.textContent = closed ? 'Fermé' : '';
      button.append(weekday, number, state);
      fragment.append(button);
    }
    dayStrip.replaceChildren(fragment);
  };

  const parisMinutesNow = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  };

  const slotLabel = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;

  const hashDate = (key) => [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  const makeSlots = () => {
    if (!timeGrid) return;
    const fragment = document.createDocumentFragment();
    const start = 10 * 60;
    const close = 19 * 60;
    const duration = serviceData[selectedService].duration;
    const seed = hashDate(selectedDay + selectedService);
    for (let minutes = start, index = 0; minutes + duration <= close; minutes += 30, index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-choice pressable';
      button.dataset.time = slotLabel(minutes);
      button.setAttribute('aria-pressed', 'false');
      const past = selectedDay === dateKey(new Date(todayUtc)) && minutes <= parisMinutesNow();
      const notOffered = !past && (index + seed) % 6 === 2;
      button.disabled = past || notOffered;
      button.setAttribute('aria-label', notOffered ? `${slotLabel(minutes)}, non proposé dans cette démonstration` : past ? `${slotLabel(minutes)}, heure passée` : `Choisir ${slotLabel(minutes)}`);
      const time = document.createElement('span');
      time.textContent = slotLabel(minutes);
      button.append(time);
      if (notOffered) {
        const state = document.createElement('span');
        state.className = 'time-choice__state';
        state.textContent = 'Non proposé';
        button.append(state);
      }
      fragment.append(button);
    }
    timeGrid.replaceChildren(fragment);
  };

  dayStrip?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (!button || button.disabled) return;
    selectedDay = button.dataset.date;
    selectedTime = '';
    dayStrip.querySelectorAll('[data-date]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    makeSlots();
    updateSummary();
    const error = booking.querySelector('[data-error="jour"]');
    if (error) error.hidden = true;
  });

  timeGrid?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-time]');
    if (!button || button.disabled) return;
    selectedTime = button.dataset.time;
    timeGrid.querySelectorAll('[data-time]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    updateSummary();
    const error = booking.querySelector('[data-error="heure"]');
    if (error) error.hidden = true;
  });

  booking.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      selectedService = radio.value;
      selectedDay = '';
      selectedTime = '';
      updateSummary();
    });
  });

  document.querySelectorAll('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const key = link.dataset.service;
      if (!serviceData[key]) return;
      selectedService = key;
      selectedDay = '';
      selectedTime = '';
      const radio = booking.querySelector(`input[name="prestation"][value="${key}"]`);
      if (radio) radio.checked = true;
      if (currentStep !== 0) goToStep(0);
      updateSummary();
    });
  });

  booking.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (currentStep === 0) {
        const radio = chosenRadio();
        if (!radio) {
          const error = booking.querySelector('[data-error="prestation"]');
          if (error) error.hidden = false;
          return;
        }
        selectedService = radio.value;
        goToStep(1);
      } else if (currentStep === 1) {
        if (!selectedDay) {
          const error = booking.querySelector('[data-error="jour"]');
          if (error) error.hidden = false;
          return;
        }
        goToStep(2);
      } else if (currentStep === 2) {
        if (!selectedTime) {
          const error = booking.querySelector('[data-error="heure"]');
          if (error) error.hidden = false;
          return;
        }
        goToStep(3);
      }
    });
  });

  booking.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goToStep(Math.max(0, currentStep - 1)));
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.stepNav);
      if (step <= highestStep) goToStep(step);
    });
  });

  const showFieldError = (input, error, show) => {
    error.hidden = !show;
    if (show) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  contactForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstName = contactForm.querySelector('#prenom');
    const phone = contactForm.querySelector('#telephone');
    const firstNameError = contactForm.querySelector('#erreur-prenom');
    const phoneError = contactForm.querySelector('#erreur-telephone');
    const cleanName = firstName.value.trim();
    const normalizedPhone = phone.value.trim().replace(/[\s().-]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
    const validName = cleanName.length > 0;
    const validPhone = /^0[67]\d{8}$/.test(normalizedPhone);
    showFieldError(firstName, firstNameError, !validName);
    showFieldError(phone, phoneError, !validPhone);
    if (!validName || !validPhone) {
      (validName ? phone : firstName).focus();
      return;
    }

    const recap = `${serviceData[selectedService].name} · ${dateLongLabel(selectedDay)} à ${selectedTime}.`;
    const summaryText = booking.querySelector('.success-summary');
    if (summaryText) summaryText.textContent = recap;
    highestStep = 3;
    showPanel(4);
    stepButtons.forEach((button) => {
      button.disabled = true;
      button.removeAttribute('aria-current');
    });
    announceStep(4);
    requestAnimationFrame(() => booking.querySelector('#success-title')?.focus({ preventScroll: true }));
  });

  booking.querySelector('[data-restart]')?.addEventListener('click', () => {
    contactForm?.reset();
    selectedService = 'visage';
    selectedDay = '';
    selectedTime = '';
    const defaultRadio = booking.querySelector('input[name="prestation"][value="visage"]');
    if (defaultRadio) defaultRadio.checked = true;
    dayStrip?.querySelectorAll('[data-date]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    makeSlots();
    highestStep = 0;
    goToStep(0);
  });

  const copyButton = document.querySelector('[data-copy-address]');
  const copyMessage = document.querySelector('.copy-message');
  copyButton?.addEventListener('click', async () => {
    const address = 'Institut Biba, 22 place Saint-Georges, 31000 Toulouse';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const temporaryField = document.createElement('textarea');
        temporaryField.value = address;
        temporaryField.setAttribute('readonly', '');
        temporaryField.style.position = 'fixed';
        temporaryField.style.opacity = '0';
        document.body.append(temporaryField);
        temporaryField.select();
        document.execCommand('copy');
        temporaryField.remove();
      }
      if (copyMessage) {
        copyMessage.hidden = false;
        window.setTimeout(() => { copyMessage.hidden = true; }, 2400);
      }
    } catch {
      if (copyMessage) {
        copyMessage.textContent = 'Copie indisponible. Sélectionnez l’adresse pour la copier.';
        copyMessage.hidden = false;
      }
    }
  });

  makeDates();
  makeSlots();
  updateSummary();
  updateProgress();
})();
