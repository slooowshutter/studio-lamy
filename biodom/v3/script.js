(() => {
  const root = document.documentElement;
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('#main-nav');
  const skipLink = document.querySelector('.skip-link');

  skipLink?.addEventListener('click', () => {
    requestAnimationFrame(() => document.querySelector('#main')?.focus({ preventScroll: true }));
  });

  if (!reduceMotion && hero) {
    hero.classList.add('is-entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => hero.classList.add('is-visible'));
    });
  }

  function closeMenu(returnFocus = false) {
    if (!menuToggle || !mainNav) return;
    mainNav.classList.remove('is-open');
    mainNav.inert = mobileLayout.matches;
    if (mobileLayout.matches) mainNav.setAttribute('aria-hidden', 'true');
    else mainNav.removeAttribute('aria-hidden');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && mainNav) {
    function syncMenuAvailability() {
      if (mobileLayout.matches) {
        const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
        mainNav.inert = !isOpen;
        mainNav.setAttribute('aria-hidden', String(!isOpen));
      } else {
        mainNav.classList.remove('is-open');
        mainNav.inert = false;
        mainNav.removeAttribute('aria-hidden');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
      }
    }
    syncMenuAvailability();
    mobileLayout.addEventListener('change', syncMenuAvailability);

    menuToggle.addEventListener('click', () => {
      const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(willOpen));
      menuToggle.setAttribute('aria-label', willOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      mainNav.classList.toggle('is-open', willOpen);
      mainNav.inert = !willOpen;
      mainNav.setAttribute('aria-hidden', String(!willOpen));
      if (willOpen) mainNav.querySelector('a')?.focus();
    });

    mainNav.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      const targetId = link.getAttribute('href');
      closeMenu(false);
      if (targetId?.startsWith('#')) {
        const target = document.getElementById(targetId.slice(1));
        const heading = target?.matches('h1, h2') ? target : target?.querySelector('h1, h2');
        requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach((link) => {
    if (mainNav?.contains(link)) return;
    link.addEventListener('click', () => {
      const targetId = link.getAttribute('href')?.slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      const focusTarget = target?.querySelector('h1, h2')
        ?? (target?.matches('main, footer, li[id]') ? target : null);
      requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    });
  });

  const services = {
    jade: { name: 'Forfait « Jade »', duration: 40, price: 40 },
    demi: { name: 'Demi-jambes', duration: 10, price: 15 },
    maillot: { name: 'Maillot intégral + SIF', duration: 15, price: 25 },
    jambes: { name: 'Jambes complètes', duration: 20, price: 25 },
  };
  const hours = {};

  const form = document.querySelector('#booking-form');
  const status = document.querySelector('#booking-status');
  const dateList = document.querySelector('#date-list');
  const slotList = document.querySelector('#slot-list');
  const dateError = document.querySelector('#date-error');
  const slotError = document.querySelector('#slot-error');
  const slotsIntro = document.querySelector('#slots-intro');
  const selectionService = document.querySelector('#summary-service');
  const selectionDate = document.querySelector('#summary-date');
  const selectionSlot = document.querySelector('#summary-slot');
  const selectionPrice = document.querySelector('#summary-price');
  const selectionCompact = document.querySelector('#selection-compact');
  const selectionDetails = document.querySelector('.selection-details');
  const finalRecap = document.querySelector('#final-recap');
  const success = document.querySelector('#booking-success');
  const successTitle = document.querySelector('#success-title');
  const successRecap = document.querySelector('#success-recap');
  const stepNavButtons = [...document.querySelectorAll('[data-step-link]')];
  const stepPanels = [...document.querySelectorAll('.booking-step')];
  const modifierButtons = [...document.querySelectorAll('[data-summary-step]')];
  const nameInput = document.querySelector('#guest-name');
  const phoneInput = document.querySelector('#guest-phone');
  const nameError = document.querySelector('#name-error');
  const phoneError = document.querySelector('#phone-error');
  const restartButton = document.querySelector('#restart-booking');

  const state = {
    service: 'jade',
    date: null,
    slot: null,
    step: 1,
    maxStep: 1,
    days: [],
    complete: false,
  };

  function syncSelectionDetails() {
    if (selectionDetails) selectionDetails.open = !mobileLayout.matches;
  }
  syncSelectionDetails();
  mobileLayout.addEventListener('change', syncSelectionDetails);

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function titleCase(value) {
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function fullDate(key) {
    return titleCase(new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(dateFromKey(key)));
  }

  function makeDays() {
    state.days = [];
  }

  function createDateButton(item) {
    const button = document.createElement('button');
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(item.day).replace('.', '');
    const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(item.day).replace('.', '');
    const isClosed = hours[item.day.getDay()] === null;
    button.type = 'button';
    button.className = 'date-choice';
    button.dataset.date = item.key;
    button.setAttribute('aria-pressed', String(state.date === item.key));
    if (isClosed) {
      button.disabled = true;
      button.setAttribute('aria-label', `${fullDate(item.key)}, fermé`);
    } else {
      button.setAttribute('aria-label', fullDate(item.key));
      button.addEventListener('click', () => {
        state.date = item.key;
        state.slot = null;
        state.maxStep = 3;
        dateError.hidden = true;
        dateList.removeAttribute('aria-invalid');
        slotError.hidden = true;
        slotList.removeAttribute('aria-invalid');
        dateList.querySelectorAll('[data-date]').forEach((dateButton) => {
          dateButton.setAttribute('aria-pressed', String(dateButton.dataset.date === state.date));
        });
        renderSummary();
        setStepNav();
        if (status) status.textContent = `Jour choisi : ${fullDate(state.date)}.`;
      });
    }

    const weekdaySpan = document.createElement('span');
    weekdaySpan.className = 'date-choice__weekday';
    weekdaySpan.textContent = titleCase(weekday);
    const dateSpan = document.createElement('span');
    dateSpan.className = 'date-choice__date';
    dateSpan.textContent = String(item.day.getDate());
    const monthSpan = document.createElement('span');
    monthSpan.className = 'date-choice__month';
    monthSpan.textContent = month;
    button.append(weekdaySpan, dateSpan, monthSpan);
    if (isClosed) {
      const closedSpan = document.createElement('span');
      closedSpan.className = 'date-choice__closed';
      closedSpan.textContent = 'fermé';
      button.append(closedSpan);
    }
    return button;
  }

  function renderDates() {
    if (!dateList) return;
    dateList.replaceChildren(...state.days.map(createDateButton));
  }

  function formatTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${hour}\u00a0h\u00a0${minute}`;
  }

  function slotIsBusy(key, minutes) {
    const dateNumber = Number(key.replaceAll('-', ''));
    const halfHour = Math.floor(minutes / 30);
    return (dateNumber + halfHour * 7 + dateFromKey(key).getDay() * 11) % 9 === 4;
  }

  function slotIsPast(key, minutes) {
    const todayKey = localDateKey(new Date());
    if (key !== todayKey) return false;
    const now = new Date();
    return minutes <= now.getHours() * 60 + now.getMinutes();
  }

  function renderSlots() {
    if (!slotList || !state.date) return;
    const day = dateFromKey(state.date);
    const range = hours[day.getDay()];
    slotList.replaceChildren();
    if (!range) return;
    slotsIntro.textContent = `Le ${fullDate(state.date)}. Les créneaux indisponibles sont fictifs et servent à la démonstration.`;
    const service = services[state.service];
    const lastStart = range.close - service.duration;
    const availableChoices = [];

    for (let start = range.open; start <= lastStart; start += 30) {
      const isPast = slotIsPast(state.date, start);
      const isBusy = !isPast && slotIsBusy(state.date, start);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot-choice';
      button.dataset.time = String(start);
      button.setAttribute('aria-pressed', String(state.slot === start));
      button.textContent = formatTime(start);
      if (isPast || isBusy) {
        button.disabled = true;
        const reason = isPast ? 'passé' : 'déjà pris';
        button.setAttribute('aria-label', `${formatTime(start)}, ${reason}`);
        const note = document.createElement('small');
        note.textContent = reason === 'passé' ? 'passé' : 'déjà pris';
        button.append(note);
      } else {
        availableChoices.push(button);
        button.addEventListener('click', () => {
          state.slot = start;
          state.maxStep = Math.max(state.maxStep, 4);
          slotError.hidden = true;
          slotList.removeAttribute('aria-invalid');
          slotList.querySelectorAll('[data-time]').forEach((slotButton) => {
            slotButton.setAttribute('aria-pressed', String(Number(slotButton.dataset.time) === state.slot));
          });
          renderSummary();
          setStepNav();
          renderFinalRecap();
          if (status) status.textContent = `Heure choisie : ${formatTime(start)}.`;
        });
      }
      slotList.append(button);
    }

    if (!availableChoices.length) {
      const empty = document.createElement('p');
      empty.className = 'small-note';
      empty.textContent = 'Aucun créneau de démonstration ne reste pour cette date. Choisissez un autre jour.';
      slotList.append(empty);
    }
  }

  function renderSummary() {
    const service = services[state.service];
    if (selectionService) selectionService.textContent = service.name;
    if (selectionDate) selectionDate.textContent = state.date ? fullDate(state.date) : 'Par téléphone';
    if (selectionSlot) selectionSlot.textContent = state.slot === null ? 'Par téléphone' : `${formatTime(state.slot)} – ${formatTime(state.slot + service.duration)}`;
    if (selectionPrice) selectionPrice.textContent = `${service.price}\u00a0€`;
    if (selectionCompact) {
      const dateLabel = state.date ? fullDate(state.date) : 'jour à confirmer par téléphone';
      const slotLabel = state.slot === null ? 'heure à confirmer par téléphone' : formatTime(state.slot);
      selectionCompact.textContent = `${service.name} · ${dateLabel} · ${slotLabel}`;
    }

    modifierButtons.forEach((button) => {
      const target = Number(button.dataset.summaryStep);
      button.disabled = target > state.maxStep;
    });
  }

  function renderFinalRecap() {
    if (!finalRecap) return;
    finalRecap.replaceChildren();
    const service = services[state.service];
    const line = document.createElement('p');
    const serviceName = document.createElement('strong');
    serviceName.textContent = service.name;
    line.append(serviceName, document.createTextNode(` · ${service.duration}\u00a0min · ${service.price}\u00a0€ indicatifs`));
    const appointment = document.createElement('p');
    appointment.textContent = state.date && state.slot !== null
      ? `${fullDate(state.date)} à ${formatTime(state.slot)}.`
      : 'Jour et heure à choisir.';
    finalRecap.append(line, appointment);
  }

  function setStepNav() {
    stepNavButtons.forEach((button) => {
      const number = Number(button.dataset.stepLink);
      button.disabled = number > state.maxStep;
      if (number === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(number, { focus = true, announce = true } = {}) {
    if (!form || state.complete || number < 1 || number > 4 || number > state.maxStep) return;
    state.step = number;
    stepPanels.forEach((panel) => {
      const isActive = Number(panel.dataset.step) === number;
      panel.hidden = !isActive;
      panel.classList.toggle('is-entering', isActive && !reduceMotion);
    });
    setStepNav();
    if (number === 3) renderSlots();
    if (number === 4) renderFinalRecap();
    if (announce && status) status.textContent = `Étape ${number} sur 4 : ${['', 'prestation', 'téléphone', 'heure', 'coordonnées'][number]}.`;
    if (focus) {
      const heading = document.querySelector(`#step-title-${number}`);
      const activePanel = stepPanels.find((panel) => Number(panel.dataset.step) === number);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          heading?.focus();
          activePanel?.classList.remove('is-entering');
        });
      });
    }
  }

  function moveNext(number) {
    if (state.step === 1) {
      const selected = form.querySelector('input[name="service"]:checked');
      if (!selected || !services[selected.value]) return;
      state.service = selected.value;
      state.date = null;
      state.slot = null;
      state.maxStep = 2;
      renderDates();
      renderSummary();
      showStep(number);
      return;
    }

    if (state.step === 2) {
      if (!state.date) {
        dateError.hidden = false;
        dateList.setAttribute('aria-invalid', 'true');
        dateList.querySelector('button:not(:disabled)')?.focus();
        if (status) status.textContent = 'Choisissez un jour avant de continuer.';
        return;
      }
      state.maxStep = Math.max(state.maxStep, 3);
      renderSummary();
      showStep(number);
      return;
    }

    if (state.step === 3) {
      if (state.slot === null) {
        slotError.hidden = false;
        slotList.setAttribute('aria-invalid', 'true');
        slotList.querySelector('button:not(:disabled)')?.focus();
        if (status) status.textContent = 'Choisissez une heure avant de continuer.';
        return;
      }
      state.maxStep = Math.max(state.maxStep, 4);
      renderSummary();
      showStep(number);
    }
  }

  function selectService(serviceId) {
    if (!services[serviceId] || !form) return;
    const radio = form.querySelector(`input[name="service"][value="${serviceId}"]`);
    if (!radio) return;
    radio.checked = true;
    state.service = serviceId;
    state.date = null;
    state.slot = null;
    state.maxStep = 1;
    dateError.hidden = true;
    slotError.hidden = true;
    dateList.removeAttribute('aria-invalid');
    slotList.removeAttribute('aria-invalid');
    renderDates();
    renderSummary();
    renderFinalRecap();
    setStepNav();
    if (status) status.textContent = `Prestation choisie : ${services[serviceId].name}.`;
  }

  function restartBooking(serviceId = 'jade') {
    if (!form) return;
    const nextService = services[serviceId] ? serviceId : 'jade';
    form.reset();
    state.service = nextService;
    state.date = null;
    state.slot = null;
    state.step = 1;
    state.maxStep = 1;
    state.complete = false;
    const selectedRadio = form.querySelector(`input[name="service"][value="${nextService}"]`);
    if (selectedRadio) selectedRadio.checked = true;
    nameInput.removeAttribute('aria-invalid');
    phoneInput.removeAttribute('aria-invalid');
    nameError.hidden = true;
    phoneError.hidden = true;
    dateError.hidden = true;
    slotError.hidden = true;
    dateList.removeAttribute('aria-invalid');
    slotList.removeAttribute('aria-invalid');
    document.querySelector('.step-nav').hidden = false;
    success.hidden = true;
    renderDates();
    renderSummary();
    renderFinalRecap();
    showStep(1);
  }

  if (form) {
    makeDays();
    renderDates();
    renderSummary();
    renderFinalRecap();

    form.querySelectorAll('input[name="service"]').forEach((radio) => {
      radio.addEventListener('change', () => selectService(radio.value));
    });

    form.querySelectorAll('[data-next]').forEach((button) => {
      button.addEventListener('click', () => moveNext(Number(button.dataset.next)));
    });

    form.querySelectorAll('[data-back]').forEach((button) => {
      button.addEventListener('click', () => showStep(Number(button.dataset.back)));
    });

    stepNavButtons.forEach((button) => {
      button.addEventListener('click', () => showStep(Number(button.dataset.stepLink)));
    });

    modifierButtons.forEach((button) => {
      button.addEventListener('click', () => showStep(Number(button.dataset.summaryStep)));
    });

    document.querySelectorAll('[data-book-service]').forEach((link) => {
      link.addEventListener('click', () => {
        if (state.complete) {
          restartBooking(link.dataset.bookService);
        } else {
          selectService(link.dataset.bookService);
          showStep(1, { focus: true, announce: false });
        }
      });
    });

    function validateName() {
      const valid = nameInput.value.trim().length > 0;
      nameError.hidden = valid;
      nameInput.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    function validatePhone() {
      const digits = phoneInput.value.replace(/\D/g, '');
      const valid = /^0[67]\d{8}$/.test(digits) || /^33[67]\d{8}$/.test(digits);
      phoneError.hidden = valid;
      phoneInput.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    nameInput.addEventListener('blur', () => {
      if (nameInput.value.trim()) validateName();
    });
    phoneInput.addEventListener('blur', () => {
      if (phoneInput.value.trim()) validatePhone();
    });
    nameInput.addEventListener('input', () => {
      if (nameInput.getAttribute('aria-invalid') === 'true') validateName();
    });
    phoneInput.addEventListener('input', () => {
      if (phoneInput.getAttribute('aria-invalid') === 'true') validatePhone();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const validName = validateName();
      const validPhone = validatePhone();
      if (!validName || !validPhone) {
        if (!validName) nameInput.focus();
        else phoneInput.focus();
        if (status) status.textContent = 'Vérifiez les champs indiqués.';
        return;
      }

      if (!state.date || state.slot === null) {
        showStep(state.date ? 3 : 2);
        if (status) status.textContent = 'Choisissez un jour et une heure pour terminer la démonstration.';
        return;
      }

      state.complete = true;
      stepPanels.forEach((panel) => { panel.hidden = true; });
      document.querySelector('.step-nav').hidden = true;
      modifierButtons.forEach((button) => { button.disabled = true; });
      success.hidden = false;
      successRecap.textContent = `${nameInput.value.trim()}, votre simulation porte sur ${services[state.service].name}, le ${fullDate(state.date)} à ${formatTime(state.slot)}. Aucun rendez-vous n’a été transmis.`;
      status.textContent = 'Simulation terminée. Aucun rendez-vous n’a été transmis.';
      requestAnimationFrame(() => successTitle.focus());
    });

    restartButton.addEventListener('click', () => restartBooking());
  }

  const revealNodes = [
    ...document.querySelectorAll('.jade, .visit, .services, .info, .booking'),
    ...document.querySelectorAll('.visit-list__item, .service-row, .complete-note'),
  ];

  if ('IntersectionObserver' in window && revealNodes.length) {
    revealNodes.forEach((node) => node.classList.add('reveal'));
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealNodes.forEach((node) => observer.observe(node));
  }

  root.classList.add('js-ready');
})();
