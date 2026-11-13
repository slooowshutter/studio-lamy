(() => {
  const doc = document;
  const body = doc.body;
  const $ = (selector, root = doc) => root.querySelector(selector);
  const $$ = (selector, root = doc) => Array.from(root.querySelectorAll(selector));

  const nav = $('#site-nav');
  const menuToggle = $('.menu-toggle');
  const navLinks = $$('[data-nav-link]');
  const sections = $$('[data-section]');
  const navIndicator = $('.nav-indicator');

  function setMenu(open, returnFocus = false) {
    if (!nav || !menuToggle) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) {
      requestAnimationFrame(moveIndicator);
    } else if (returnFocus) {
      menuToggle.focus();
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false, true);
      }
    });
    nav?.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      setMenu(false);
      const target = $(link.getAttribute('href'));
      const heading = target?.querySelector('h2');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
        requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      }
    });
    window.matchMedia('(min-width: 921px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  function moveIndicator() {
    if (!navIndicator || !nav) return;
    const active = nav.querySelector('[aria-current="location"]');
    if (!active) return;
    const top = active.offsetTop + (active.offsetHeight - navIndicator.offsetHeight) / 2;
    navIndicator.style.transform = `translateY(${Math.max(0, top)}px)`;
  }

  function setActiveSection(sectionId) {
    const currentLink = navLinks.find((link) => link.getAttribute('href') === `#${sectionId}`);
    if (!currentLink) return;
    navLinks.forEach((link) => {
      if (link === currentLink) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    moveIndicator();
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        if (target.hasAttribute('data-reveal-row')) {
          const siblings = Array.from(target.parentElement.children);
          const order = siblings.indexOf(target);
          target.style.transitionDelay = `${Math.max(0, Math.min(order, 3) * 60)}ms`;
        }
        target.classList.add('is-visible');
        observer.unobserve(target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    $$('.reveal').forEach((element) => revealObserver.observe(element));

    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (!visible.length) return;
      visible.sort((a, b) => a.target.offsetTop - b.target.offsetTop);
      setActiveSection(visible[visible.length - 1].target.id);
    }, { threshold: 0.04, rootMargin: '-18% 0px -64% 0px' });

    sections.forEach((section) => sectionObserver.observe(section));

    const mobileBar = $('.mobile-booking-bar');
    if (mobileBar) {
      const observedSections = new Map();
      const barObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          observedSections.set(entry.target, entry.isIntersecting);
        });
        mobileBar.classList.toggle('is-hidden', Array.from(observedSections.values()).some(Boolean));
      }, { threshold: 0.04, rootMargin: '-10% 0px -18% 0px' });
      const reservation = $('#reservation');
      const footer = $('.site-footer');
      if (reservation) {
        observedSections.set(reservation, false);
        barObserver.observe(reservation);
      }
      if (footer) {
        observedSections.set(footer, false);
        barObserver.observe(footer);
      }
    }
  } else {
    $$('.reveal').forEach((element) => element.classList.add('is-visible'));
  }

  moveIndicator();

  const form = $('#booking-form');
  const panels = $$('[data-booking-panel]', form || doc);
  const stepTabs = $$('[data-go-step]', form || doc);
  const dayPicker = $('#day-picker');
  const timePicker = $('#time-picker');
  const liveRegion = $('#booking-live');
  const summaryService = $('[data-summary-service]');
  const summaryDate = $('[data-summary-date]');
  const summaryTime = $('[data-summary-time]');
  const summaryName = $('[data-summary-name]');
  const serviceError = $('#service-error');
  const dayError = $('#day-error');
  const timeError = $('#time-error');
  const firstName = $('#prenom');
  const phone = $('#telephone');
  const firstNameError = $('#prenom-error');
  const phoneError = $('#telephone-error');
  const slotTimes = ['11:30', '13:30', '15:30'];
  const state = { step: 1, maxStep: 1, service: '', date: '', dateLabel: '', time: '', name: '' };

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  }

  function parisTime(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  }

  function dateIso(date) { return date.toISOString().slice(0, 10); }
  function fullDate(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
  }
  function shortWeekday(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
  }
  function dateNumber(date) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
  }
  function shortMonth(date) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
  }

  function createDayChoices() {
    if (!dayPicker) return;
    const todayParts = parisParts();
    const start = new Date(Date.UTC(Number(todayParts.year), Number(todayParts.month) - 1, Number(todayParts.day)));
    const todayIso = dateIso(start);
    const fragment = doc.createDocumentFragment();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const iso = dateIso(date);
      const weekday = date.getUTCDay();
      const openAccordingToTreatwell = weekday !== 0 && weekday !== 1;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'day-chip';
      button.dataset.day = iso;
      button.setAttribute('aria-pressed', 'false');
      button.disabled = !openAccordingToTreatwell;
      button.setAttribute('aria-label', openAccordingToTreatwell
        ? `${fullDate(date)}, jour de démonstration`
        : `${fullDate(date)}, fermé selon les horaires affichés sur Treatwell`);

      const weekdayText = doc.createElement('span');
      weekdayText.className = 'day-chip__weekday';
      weekdayText.textContent = iso === todayIso ? 'Aujourd’hui' : shortWeekday(date);

      const dateText = doc.createElement('span');
      dateText.className = 'day-chip__date';
      dateText.textContent = dateNumber(date);

      const monthText = doc.createElement('span');
      monthText.className = 'day-chip__month';
      monthText.textContent = shortMonth(date);

      button.append(weekdayText, dateText, monthText);
      if (!openAccordingToTreatwell) {
        const closedText = doc.createElement('span');
        closedText.className = 'day-chip__closed';
        closedText.textContent = 'Fermé';
        button.append(closedText);
      }

      if (openAccordingToTreatwell) {
        button.addEventListener('click', () => {
          state.date = iso;
          state.dateLabel = fullDate(date);
          state.time = '';
          state.maxStep = Math.min(state.maxStep, 2);
          dayPicker.querySelectorAll('.day-chip').forEach((chip) => {
            const selected = chip === button;
            chip.classList.toggle('is-selected', selected);
            chip.setAttribute('aria-pressed', String(selected));
          });
          if (dayError) dayError.hidden = true;
          dayPicker.removeAttribute('aria-invalid');
          renderTimeChoices();
          updateSummary();
        });
      }

      fragment.append(button);
    }

    dayPicker.replaceChildren(fragment);
  }

  function renderTimeChoices() {
    if (!timePicker) return;
    if (!state.date) {
      const empty = doc.createElement('p');
      empty.className = 'time-picker__empty';
      empty.textContent = 'Choisissez d’abord un jour.';
      timePicker.replaceChildren(empty);
      return;
    }

    const now = parisTime();
    const todayParts = parisParts();
    const todayIso = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
    const isToday = state.date === todayIso;
    const fragment = doc.createDocumentFragment();
    const dateDigits = state.date.replaceAll('-', '').split('').reduce((sum, digit) => sum + Number(digit), 0);
    const unavailableIndex = dateDigits % slotTimes.length;

    slotTimes.forEach((time, index) => {
      const [hour, minute] = time.split(':').map(Number);
      const isPast = isToday && (hour < Number(now.hour) || (hour === Number(now.hour) && minute <= Number(now.minute)));
      const demoUnavailable = index === unavailableIndex;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'time-chip';
      button.setAttribute('aria-pressed', 'false');
      button.disabled = isPast || demoUnavailable;
      button.setAttribute('aria-label', `${hour} h ${String(minute).padStart(2, '0')}${isPast ? ', heure passée' : demoUnavailable ? ', indisponible dans cette démonstration' : ', créneau fictif'}`);

      const timeText = doc.createElement('span');
      timeText.textContent = `${hour} h ${String(minute).padStart(2, '0')}`;
      button.append(timeText);

      if (button.disabled) {
        const note = doc.createElement('span');
        note.className = 'time-chip__note';
        note.textContent = isPast ? 'Passé' : 'Indisponible ici';
        button.append(note);
      }

      if (!button.disabled) {
        button.addEventListener('click', () => {
          state.time = timeText.textContent;
          timePicker.querySelectorAll('.time-chip').forEach((chip) => {
            const selected = chip === button;
            chip.classList.toggle('is-selected', selected);
            chip.setAttribute('aria-pressed', String(selected));
          });
          if (timeError) timeError.hidden = true;
          timePicker.removeAttribute('aria-invalid');
          state.maxStep = Math.max(state.maxStep, 3);
          updateSummary();
        });
      }

      fragment.append(button);
    });

    timePicker.replaceChildren(fragment);
  }

  function updateSummary() {
    if (summaryService) summaryService.textContent = state.service || 'Choisissez une prestation';
    if (summaryDate) summaryDate.textContent = state.dateLabel || 'Jour à choisir';
    if (summaryTime) summaryTime.textContent = state.time || 'Heure à choisir';
    if (summaryName) summaryName.textContent = state.name ? `Pour ${state.name}` : '';
  }

  function setStep(nextStep, focusHeading = true) {
    state.step = nextStep;
    panels.forEach((panel) => {
      const active = Number(panel.dataset.bookingPanel) === nextStep;
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
    });

    stepTabs.forEach((tab) => {
      const number = Number(tab.dataset.goStep);
      const active = number === Math.min(nextStep, 4);
      tab.disabled = number > state.maxStep;
      tab.classList.toggle('is-current', active && nextStep < 5);
      if (active && nextStep < 5) tab.setAttribute('aria-current', 'step');
      else tab.removeAttribute('aria-current');
      if (number < state.maxStep) tab.classList.add('is-complete');
      else tab.classList.remove('is-complete');
    });

    const heading = $(`[data-booking-panel="${nextStep}"] .booking-panel__title`, form);
    if (heading && focusHeading) heading.focus({ preventScroll: true });
    if (liveRegion) {
      const label = nextStep === 5 ? 'Récapitulatif de démonstration affiché.' : `Étape ${nextStep} sur 4\u00a0: ${heading ? heading.textContent.toLowerCase() : ''}.`;
      liveRegion.textContent = label;
    }
  }

  function showError(element, input) {
    if (element) element.hidden = false;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }
  }

  function clearInputError(element, input) {
    if (element) element.hidden = true;
    if (input) input.removeAttribute('aria-invalid');
  }

  function canAdvance(nextStep) {
    if (state.step === 1) {
      const selected = $('input[name="prestation"]:checked', form);
      if (!selected) {
        if (serviceError) serviceError.hidden = false;
        $('.choice-list', form)?.setAttribute('aria-invalid', 'true');
        return false;
      }
      state.service = selected.value;
      state.maxStep = Math.max(state.maxStep, 2);
      if (serviceError) serviceError.hidden = true;
      $('.choice-list', form)?.removeAttribute('aria-invalid');
    }
    if (state.step === 2) {
      if (!state.date) {
        if (dayError) dayError.hidden = false;
        dayPicker?.setAttribute('aria-invalid', 'true');
        return false;
      }
      state.maxStep = Math.max(state.maxStep, 3);
      if (dayError) dayError.hidden = true;
      dayPicker?.removeAttribute('aria-invalid');
    }
    if (state.step === 3) {
      if (!state.time) {
        if (timeError) timeError.hidden = false;
        timePicker?.setAttribute('aria-invalid', 'true');
        return false;
      }
      state.maxStep = Math.max(state.maxStep, 4);
      if (timeError) timeError.hidden = true;
      timePicker?.removeAttribute('aria-invalid');
    }
    updateSummary();
    setStep(nextStep);
    return true;
  }

  if (form) {
    createDayChoices();
    renderTimeChoices();
    updateSummary();
    setStep(1, false);

    $$('input[name="prestation"]', form).forEach((input) => {
      input.addEventListener('change', () => {
        state.service = input.value;
        state.date = '';
        state.dateLabel = '';
        state.time = '';
        state.maxStep = 1;
        if (serviceError) serviceError.hidden = true;
        $('.choice-list', form)?.removeAttribute('aria-invalid');
        dayPicker?.querySelectorAll('.day-chip').forEach((chip) => {
          chip.classList.remove('is-selected');
          chip.setAttribute('aria-pressed', 'false');
        });
        renderTimeChoices();
        updateSummary();
      });
    });

    $$('[data-next-step]', form).forEach((button) => {
      button.addEventListener('click', () => canAdvance(Number(button.dataset.nextStep)));
    });

    $$('[data-previous-step]', form).forEach((button) => {
      button.addEventListener('click', () => setStep(Number(button.dataset.previousStep)));
    });

    stepTabs.forEach((button) => {
      button.addEventListener('click', () => {
        const destination = Number(button.dataset.goStep);
        if (destination <= state.maxStep) setStep(destination);
      });
    });

    $$('[data-select-service]').forEach((link) => {
      link.addEventListener('click', () => {
        const input = $$('input[name="prestation"]', form).find((choice) => choice.value === link.dataset.selectService);
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (state.step !== 1) setStep(1);
      });
    });

    firstName?.addEventListener('input', () => clearInputError(firstNameError, firstName));
    phone?.addEventListener('input', () => clearInputError(phoneError, phone));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.step !== 4) return;
      const name = firstName?.value.trim() || '';
      const rawPhone = phone?.value.trim() || '';
      const normalizedPhone = rawPhone.replace(/[\s().-]/g, '').replace(/^\+33/, '0');
      if (!name) {
        showError(firstNameError, firstName);
        return;
      }
      clearInputError(firstNameError, firstName);
      if (!/^0[67]\d{8}$/.test(normalizedPhone)) {
        showError(phoneError, phone);
        return;
      }
      clearInputError(phoneError, phone);
      state.name = name;
      updateSummary();
      setStep(5);
    });

    $('.restart-button', form)?.addEventListener('click', () => {
      form.reset();
      state.step = 1;
      state.maxStep = 1;
      state.service = '';
      state.date = '';
      state.dateLabel = '';
      state.time = '';
      state.name = '';
      clearInputError(firstNameError, firstName);
      clearInputError(phoneError, phone);
      if (serviceError) serviceError.hidden = true;
      if (dayError) dayError.hidden = true;
      if (timeError) timeError.hidden = true;
      $('.choice-list', form)?.removeAttribute('aria-invalid');
      dayPicker?.removeAttribute('aria-invalid');
      timePicker?.removeAttribute('aria-invalid');
      dayPicker?.querySelectorAll('.day-chip').forEach((chip) => {
        chip.classList.remove('is-selected');
        chip.setAttribute('aria-pressed', 'false');
      });
      renderTimeChoices();
      updateSummary();
      setStep(1);
    });
  }

  body.classList.add('is-ready');
})();
