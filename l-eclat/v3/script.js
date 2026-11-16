(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  const hero = document.querySelector('.hero');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach((item) => revealObserver.observe(item));

    const heroObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      hero.classList.add('is-visible');
      observer.disconnect();
    }, { threshold: 0.1 });
    if (hero) heroObserver.observe(hero);
  } else {
    reveals.forEach((item) => item.classList.add('is-visible'));
    if (hero) hero.classList.add('is-visible');
  }

  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('#menu-toggle');
  const navigation = document.querySelector('#navigation-principale');
  const navigationLinks = navigation ? [...navigation.querySelectorAll('a')] : [];

  function closeMenu(returnFocus = false) {
    if (!header || !menuToggle) return;
    header.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && header) {
    menuToggle.addEventListener('click', () => {
      const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
      header.classList.toggle('menu-open', opening);
      menuToggle.setAttribute('aria-expanded', String(opening));
      menuToggle.setAttribute('aria-label', opening ? 'Fermer le menu' : 'Ouvrir le menu');
      if (opening && navigationLinks[0]) navigationLinks[0].focus();
    });
    navigationLinks.forEach((link) => link.addEventListener('click', () => {
      closeMenu();
      const destination = document.querySelector(link.getAttribute('href'));
      const heading = destination?.querySelector('h1, h2');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    document.addEventListener('click', (event) => {
      if (header.classList.contains('menu-open') && !header.contains(event.target)) closeMenu();
    });
  }

  const flow = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('.booking-panel')];
  const progressItems = [...document.querySelectorAll('.booking-progress li')];
  const previousButtons = [...document.querySelectorAll('[data-edit-step]')];
  const status = document.querySelector('#booking-live');
  const selectionTitle = document.querySelector('#titre-selection');
  const selectionService = document.querySelector('#selection-service');
  const selectionDay = document.querySelector('#selection-day');
  const selectionTime = document.querySelector('#selection-time');
  const serviceLabels = {
    kydra: 'Coloration végétale Kydra avec séchage',
    'coupe-femme': 'Forfait — shampoing coupe brushing',
    'coupe-classique': 'Coupe classique',
    soin: 'Soin hydratant'
  };
  const serviceDurations = {
    kydra: 60,
    'coupe-femme': 30,
    'coupe-classique': 15,
    soin: 5
  };
  const openingHours = {
    0: null,
    1: { opening: 9 * 60 + 30, closing: 16 * 60 },
    2: { opening: 9 * 60 + 30, closing: 18 * 60 },
    3: null,
    4: { opening: 9 * 60 + 30, closing: 18 * 60 },
    5: { opening: 9 * 60 + 30, closing: 18 * 60 },
    6: { opening: 9 * 60 + 30, closing: 15 * 60 }
  };
  let currentStep = 0;
  let changingStep = false;
  let selectedService = '';
  let selectedDate = null;
  let selectedTime = '';

  const dateOptions = document.querySelector('#date-options');
  const timeOptions = document.querySelector('#time-options');
  const timeHint = document.querySelector('#time-hint');
  const serviceError = document.querySelector('#erreur-prestation');
  const dayError = document.querySelector('#erreur-jour');
  const timeError = document.querySelector('#erreur-heure');
  const firstNameField = document.querySelector('#prenom');
  const phoneField = document.querySelector('#telephone');
  const firstNameError = document.querySelector('#erreur-prenom');
  const phoneError = document.querySelector('#erreur-telephone');
  const successPanel = document.querySelector('#booking-success');
  const progressWrap = document.querySelector('.booking-progress-wrap');
  const successRecap = document.querySelector('#success-recap');

  function formatDate(date, options) {
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  function dayName(date) {
    return formatDate(date, { weekday: 'long' });
  }

  function fullDate(date) {
    return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function shortDate(date) {
    return formatDate(date, { day: 'numeric', month: 'short' }).replace('.', '');
  }

  function makeLocalDate(offset) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  }

  function updateSelection() {
    const serviceText = serviceLabels[selectedService] || 'À choisir';
    const dayText = selectedDate ? fullDate(selectedDate) : 'À choisir';
    const timeText = selectedTime || 'À choisir';
    selectionService.textContent = serviceText;
    selectionDay.textContent = dayText;
    selectionTime.textContent = timeText;
    selectionTitle.textContent = selectedService ? 'Votre demande' : 'À remplir';
  }

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function updateProgress() {
    progressItems.forEach((item, index) => {
      if (index === currentStep) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.dataset.done = String(index < currentStep);
    });
    previousButtons.forEach((button) => {
      button.hidden = Number(button.dataset.editStep) >= currentStep;
    });
    setStatus(`Étape ${currentStep + 1} sur 4 — ${['choisissez une prestation.', 'choisissez un jour.', 'choisissez une heure souhaitée.', 'ajoutez vos coordonnées.'][currentStep]}`);
  }

  function clearPanelError(step) {
    if (step === 0) serviceError.textContent = '';
    if (step === 1) dayError.textContent = '';
    if (step === 2) timeError.textContent = '';
  }

  async function showStep(nextStep) {
    if (changingStep || nextStep < 0 || nextStep > 3 || nextStep === currentStep) {
      if (nextStep === currentStep && panels[nextStep]) panels[nextStep].querySelector('h3').focus({ preventScroll: true });
      return;
    }
    changingStep = true;
    const oldPanel = panels[currentStep];
    const newPanel = panels[nextStep];
    oldPanel.classList.add('is-leaving');
    await new Promise((resolve) => window.setTimeout(resolve, reducedMotion.matches ? 0 : 225));
    oldPanel.hidden = true;
    oldPanel.classList.remove('is-leaving');
    newPanel.hidden = false;
    newPanel.classList.add('is-entering');
    currentStep = nextStep;
    updateProgress();
    requestAnimationFrame(() => requestAnimationFrame(() => newPanel.classList.remove('is-entering')));
    newPanel.querySelector('h3').focus({ preventScroll: true });
    changingStep = false;
  }

  function generateDays() {
    if (!dateOptions) return;
    dateOptions.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = makeLocalDate(offset);
      const hours = openingHours[date.getDay()];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-option';
      button.disabled = !hours;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', hours
        ? `${fullDate(date)}, horaires Planity à confirmer`
        : `${fullDate(date)}, fermé selon Planity, à confirmer`);
      const weekday = document.createElement('span');
      weekday.className = 'date-weekday';
      weekday.textContent = formatDate(date, { weekday: 'short' }).replace('.', '');
      const number = document.createElement('span');
      number.className = 'date-day';
      number.textContent = formatDate(date, { day: 'numeric' });
      button.append(weekday, number);
      if (!hours) {
        const state = document.createElement('span');
        state.className = 'date-state';
        state.textContent = 'fermé';
        button.append(state);
      }
      button.addEventListener('click', () => {
        selectedDate = date;
        selectedTime = '';
        dateOptions.querySelectorAll('.date-option').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        dayError.textContent = '';
        generateTimes();
        updateSelection();
      });
      dateOptions.append(button);
    }
  }

  function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')} h ${String(minutes).padStart(2, '0')}`;
  }

  function generateTimes() {
    if (!timeOptions || !selectedDate || !selectedService) return;
    timeOptions.replaceChildren();
    const hours = openingHours[selectedDate.getDay()];
    const duration = serviceDurations[selectedService];
    const starts = [];
    for (let time = hours.opening; time + duration <= hours.closing; time += 30) starts.push(time);
    const today = new Date();
    const isToday = selectedDate.getFullYear() === today.getFullYear()
      && selectedDate.getMonth() === today.getMonth()
      && selectedDate.getDate() === today.getDate();
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    timeHint.textContent = 'Heures souhaitées, calculées avec la durée affichée sur Planity. Horaires à confirmer ; les heures barrées sont fictives et ne décrivent pas l’agenda réel.';
    if (starts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-times';
      empty.textContent = 'Aucune heure à proposer pour ce jour. Choisissez une autre date ou appelez le salon.';
      timeOptions.append(empty);
      return;
    }
    const dateSeed = selectedDate.getFullYear() * 372 + selectedDate.getMonth() * 31 + selectedDate.getDate();
    const serviceSeed = [...serviceLabels[selectedService]].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
    starts.forEach((time, index) => {
      const isPast = isToday && time <= nowMinutes;
      const pseudoBusy = !isPast && ((index * 17 + dateSeed + serviceSeed) % 7) === 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = isPast ? 'time-option is-past' : pseudoBusy ? 'time-option is-taken' : 'time-option';
      button.disabled = isPast || pseudoBusy;
      const timeLabel = document.createElement('span');
      timeLabel.className = 'slot-time';
      timeLabel.textContent = formatTime(time);
      button.append(timeLabel);
      if (isPast || pseudoBusy) {
        const stateLabel = document.createElement('span');
        stateLabel.className = 'time-state';
        stateLabel.textContent = isPast ? 'passé' : 'pris';
        button.append(stateLabel);
      }
      button.setAttribute('aria-pressed', String(selectedTime === formatTime(time)));
      button.setAttribute('aria-label', isPast
        ? `${formatTime(time)}, heure passée aujourd’hui`
        : pseudoBusy
          ? `${formatTime(time)}, déjà pris dans cette simulation`
          : `${formatTime(time)}, heure souhaitée à confirmer`);
      if (!isPast && !pseudoBusy) {
        button.addEventListener('click', () => {
          selectedTime = formatTime(time);
          timeOptions.querySelectorAll('.time-option').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          timeError.textContent = '';
          updateSelection();
        });
      }
      timeOptions.append(button);
    });
    if (isToday && starts.every((time) => time <= nowMinutes)) {
      const empty = document.createElement('p');
      empty.className = 'empty-times';
      empty.textContent = 'Il n’y a plus d’heure future à proposer aujourd’hui. Choisissez un autre jour ou appelez le salon.';
      timeOptions.append(empty);
    }
  }

  function normalizeFrenchMobile(value) {
    let number = value.trim().replace(/[\s().-]/g, '');
    if (number.startsWith('+33')) number = `0${number.slice(3)}`;
    if (number.startsWith('0033')) number = `0${number.slice(4)}`;
    return /^0[67]\d{8}$/.test(number);
  }

  function setFieldError(field, node, message) {
    node.textContent = message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
  }

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextStep = Number(button.dataset.next);
      if (currentStep === 0 && !selectedService) {
        serviceError.textContent = 'Choisissez une prestation pour poursuivre.';
        return;
      }
      if (currentStep === 1 && !selectedDate) {
        dayError.textContent = 'Choisissez un jour ouvert sur la fiche Planity.';
        return;
      }
      if (currentStep === 2 && !selectedTime) {
        timeError.textContent = 'Choisissez une heure souhaitée pour poursuivre.';
        return;
      }
      clearPanelError(currentStep);
      if (nextStep === 2) generateTimes();
      showStep(nextStep);
    });
  });

  document.querySelectorAll('[data-previous]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.previous)));
  });
  previousButtons.forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.editStep)));
  });

  document.querySelectorAll('input[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      selectedService = input.value;
      selectedTime = '';
      serviceError.textContent = '';
      generateTimes();
      updateSelection();
    });
  });

  document.querySelectorAll('[data-preselect]').forEach((button) => {
    button.addEventListener('click', () => {
      const service = button.dataset.preselect;
      const radio = document.querySelector(`input[name="prestation"][value="${service}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      showStep(0);
      document.querySelector('#reserver').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    });
  });

  if (flow) {
    flow.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstName = firstNameField.value.trim();
      const mobileValid = normalizeFrenchMobile(phoneField.value);
      const firstNameValid = firstName.length > 0;
      setFieldError(firstNameField, firstNameError, firstNameValid ? '' : 'Saisissez votre prénom.');
      setFieldError(phoneField, phoneError, mobileValid ? '' : 'Saisissez un numéro mobile français valide.');
      if (!firstNameValid) {
        firstNameField.focus();
        return;
      }
      if (!mobileValid) {
        phoneField.focus();
        return;
      }
      successRecap.textContent = `${serviceLabels[selectedService]} · ${fullDate(selectedDate)} · ${selectedTime}.`;
      flow.hidden = true;
      progressWrap.hidden = true;
      successPanel.hidden = false;
      successPanel.querySelector('h3').focus({ preventScroll: true });
      setStatus('Simulation terminée. Rien n’a été envoyé et aucun rendez-vous n’a été réservé.');
    });
    firstNameField.addEventListener('input', () => {
      if (firstNameField.value.trim()) setFieldError(firstNameField, firstNameError, '');
    });
    phoneField.addEventListener('input', () => {
      if (normalizeFrenchMobile(phoneField.value)) setFieldError(phoneField, phoneError, '');
    });
  }

  document.querySelector('#reset-flow')?.addEventListener('click', () => {
    selectedService = '';
    selectedDate = null;
    selectedTime = '';
    firstNameField.value = '';
    phoneField.value = '';
    document.querySelectorAll('input[name="prestation"]').forEach((input) => { input.checked = false; });
    setFieldError(firstNameField, firstNameError, '');
    setFieldError(phoneField, phoneError, '');
    successPanel.hidden = true;
    flow.hidden = false;
    progressWrap.hidden = false;
    dateOptions.querySelectorAll('.date-option').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    timeOptions.replaceChildren();
    updateSelection();
    currentStep = 0;
    updateProgress();
    panels.forEach((panel, index) => { panel.hidden = index !== 0; });
    panels[0].querySelector('h3').focus({ preventScroll: true });
  });

  if (dateOptions) generateDays();
  updateSelection();
  updateProgress();

  const mobileBar = document.querySelector('#barre-mobile');
  const heroActions = document.querySelector('#actions-hero');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  const mobileViewport = window.matchMedia('(max-width: 720px)');
  let heroActionsVisible = true;
  let bookingVisible = false;
  let footerVisible = false;

  function updateMobileBar() {
    if (!mobileBar) return;
    mobileBar.hidden = !mobileViewport.matches || heroActionsVisible || bookingVisible || footerVisible;
  }

  if ('IntersectionObserver' in window && heroActions && bookingSection && footer) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroActions) heroActionsVisible = entry.isIntersecting;
        if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      updateMobileBar();
    }, { threshold: 0.06 });
    barObserver.observe(heroActions);
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
    mobileViewport.addEventListener('change', updateMobileBar);
  }
})();
