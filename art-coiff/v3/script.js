(() => {
  'use strict';

  const documentElement = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  documentElement.classList.add('js');

  const panels = Array.from(document.querySelectorAll('.accordion-panel'));
  const navLinks = document.querySelectorAll('[data-ouvre]');
  const bookingPanel = document.getElementById('p-rendez-vous');

  function setPanel(panel, open) {
    const button = panel.querySelector('.panel-toggle');
    const body = panel.querySelector('.panel-body');
    panel.dataset.ouvert = open ? 'oui' : 'non';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', `${open ? 'Fermer' : 'Ouvrir'} le panneau ${panel.querySelector('.panel-title').textContent.trim()}`);
    body.setAttribute('aria-hidden', String(!open));
    if ('inert' in body) body.inert = !open;
  }

  panels.forEach((panel, index) => setPanel(panel, index === 0));

  function syncBookingBar() {
    document.body.dataset.reservation = bookingPanel.dataset.ouvert === 'oui' ? 'ouverte' : 'fermee';
  }

  panels.forEach((panel) => {
    const button = panel.querySelector('.panel-toggle');
    button.addEventListener('click', () => {
      const wasOpen = panel.dataset.ouvert === 'oui';
      panels.forEach((item) => setPanel(item, false));
      if (!wasOpen) setPanel(panel, true);
      syncBookingBar();
    });
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.dataset.ouvre);
      if (!target) return;
      event.preventDefault();
      panels.forEach((panel) => setPanel(panel, panel === target));
      syncBookingBar();
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      target.querySelector('.panel-toggle').focus({ preventScroll: true });
    });
  });

  /* Entrée du nom et de la phrase-signature. */
  const entranceItems = Array.from(document.querySelectorAll('[data-entree]'));
  if (reducedMotion.matches) {
    entranceItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    entranceItems.forEach((item, index) => {
      window.setTimeout(() => item.classList.add('is-visible'), index * 70 + 30);
    });
  }

  /* Révélations ponctuelles, différentes de l’entrée initiale. */
  const revealItems = Array.from(document.querySelectorAll('[data-reveal], [data-reveal-list]'));
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* Simulation locale, sans créneaux annoncés et sans transmission. */
  const form = document.getElementById('booking-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.booking-step'));
  const progress = document.getElementById('booking-progress');
  const success = document.getElementById('booking-success');
  const successCopy = document.getElementById('success-copy');
  const serviceInputs = Array.from(form.querySelectorAll('input[name="prestation"]'));
  const dateInput = document.getElementById('jour-souhaite');
  const timeInput = document.getElementById('heure-souhaitee');
  const nameInput = document.getElementById('prenom');
  const phoneInput = document.getElementById('telephone');
  const selectedService = () => serviceInputs.find((input) => input.checked)?.value || '';
  let transitionTimer = 0;
  let changingStep = false;
  const stepTransitionMs = reducedMotion.matches ? 150 : 220;

  form.addEventListener('submit', (event) => event.preventDefault());

  function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  dateInput.min = localDateValue(new Date());

  function formatDate(value) {
    if (!value) return 'À préciser';
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function formatTime(value) {
    return value ? `${value.slice(0, 2)}\u00a0h\u00a0${value.slice(3, 5)}` : 'À préciser';
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function updateSummary() {
    const service = selectedService();
    setText('summary-title', service || 'En attente');
    setText('summary-date', formatDate(dateInput.value));
    setText('summary-time', formatTime(timeInput.value));
    setText('summary-name', nameInput.value.trim() || 'À préciser');
  }

  function updateRecap() {
    setText('recap-prestation', selectedService() || 'À choisir');
    setText('recap-moment', `${formatDate(dateInput.value)} · ${formatTime(timeInput.value)}`);
    setText('recap-prenom', nameInput.value.trim() || 'À préciser');
    setText('recap-telephone', phoneInput.value.trim() || 'À préciser');
  }

  function setError(id, message, invalidFields = []) {
    const error = document.getElementById(id);
    error.textContent = message;
    error.hidden = !message;
    invalidFields.forEach((field) => {
      if (message) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
    });
  }

  function moveToStep(number) {
    if (changingStep) return;
    const current = steps.find((step) => !step.hidden);
    const next = steps[number - 1];
    if (!next || current === next) return;
    changingStep = true;
    window.clearTimeout(transitionTimer);
    if (current) current.classList.add('is-leaving');
    transitionTimer = window.setTimeout(() => {
      if (current) {
        current.hidden = true;
        current.classList.remove('is-leaving');
      }
      next.hidden = false;
      next.classList.add('is-entering');
      progress.textContent = `Étape ${number} sur 4 · ${['prestation', 'moment souhaité', 'coordonnées', 'vérification'][number - 1]}`;
      if (number === 4) updateRecap();
      window.requestAnimationFrame(() => {
        next.classList.remove('is-entering');
        next.querySelector('.step-title').focus({ preventScroll: true });
        changingStep = false;
      });
    }, current ? stepTransitionMs : 0);
  }

  function validateStep(number) {
    if (number === 1) {
      if (!selectedService()) {
        setError('service-error', 'Choisissez une prestation pour continuer.');
        return false;
      }
      setError('service-error', '');
      return true;
    }
    if (number === 2) {
      const dayIsValid = Boolean(dateInput.value) && dateInput.value >= dateInput.min;
      const timeIsValid = Boolean(timeInput.value);
      if (!dayIsValid || !timeIsValid) {
        const invalidFields = [];
        if (!dayIsValid) invalidFields.push(dateInput);
        if (!timeIsValid) invalidFields.push(timeInput);
        setError('moment-error', 'Indiquez un jour à partir d’aujourd’hui et une heure souhaitée. Ces préférences restent à confirmer.', invalidFields);
        (dayIsValid ? timeInput : dateInput).focus();
        return false;
      }
      setError('moment-error', '', [dateInput, timeInput]);
      return true;
    }
    if (number === 3) {
      const nameIsValid = nameInput.value.trim().length > 0;
      const digits = phoneInput.value.trim().replace(/[\s().-]/g, '');
      const phoneIsValid = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(digits);
      if (!nameIsValid || !phoneIsValid) {
        const message = !nameIsValid ? 'Indiquez votre prénom.' : 'Saisissez un mobile français en 06, 07 ou +33.';
        setError('coordonnees-error', message, [!nameIsValid ? nameInput : phoneInput]);
        (!nameIsValid ? nameInput : phoneInput).focus();
        return false;
      }
      setError('coordonnees-error', '', [nameInput, phoneInput]);
      return true;
    }
    return true;
  }

  form.querySelectorAll('[data-prochaine]').forEach((button) => {
    button.addEventListener('click', () => {
      const currentNumber = Number(button.dataset.prochaine);
      if (validateStep(currentNumber)) {
        updateSummary();
        moveToStep(currentNumber + 1);
      }
    });
  });

  form.querySelectorAll('[data-precedente]').forEach((button) => {
    button.addEventListener('click', () => moveToStep(Number(button.dataset.precedente) - 1));
  });

  serviceInputs.forEach((input) => input.addEventListener('change', () => {
    setError('service-error', '');
    updateSummary();
  }));

  [dateInput, timeInput, nameInput, phoneInput].forEach((input) => {
    input.addEventListener('input', () => {
      const errorId = input === dateInput || input === timeInput ? 'moment-error' : 'coordonnees-error';
      const fields = errorId === 'moment-error' ? [dateInput, timeInput] : [nameInput, phoneInput];
      setError(errorId, '', fields);
      updateSummary();
    });
  });

  document.getElementById('finish-booking').addEventListener('click', () => {
    updateRecap();
    steps[3].hidden = true;
    progress.hidden = true;
    const name = nameInput.value.trim();
    successCopy.textContent = `${name}, votre demande n’a pas été envoyée. Cette étape est une simulation. Pour convenir réellement du jour et de l’heure, appelez Art Coiff au 01 43 54 38 99.`;
    success.hidden = false;
    success.querySelector('.success-label').focus({ preventScroll: true });
  });

  document.getElementById('restart-booking').addEventListener('click', () => {
    form.reset();
    steps.forEach((step, index) => {
      step.hidden = index !== 0;
      step.classList.remove('is-leaving', 'is-entering');
    });
    progress.hidden = false;
    progress.textContent = 'Étape 1 sur 4 · prestation';
    success.hidden = true;
    ['service-error', 'moment-error', 'coordonnees-error'].forEach((id) => setError(id, ''));
    [dateInput, timeInput, nameInput, phoneInput].forEach((input) => input.removeAttribute('aria-invalid'));
    updateSummary();
    steps[0].querySelector('.step-title').focus({ preventScroll: true });
  });

  updateSummary();
  syncBookingBar();
})();
