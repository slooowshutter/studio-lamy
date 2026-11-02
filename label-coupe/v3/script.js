(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nextFrame = (callback) => window.requestAnimationFrame(callback);

  function startPageMotion() {
    const heroThread = document.querySelector('.hero-thread');
    if (heroThread) {
      nextFrame(() => {
        root.classList.add('is-ready');
        nextFrame(() => heroThread.classList.add('is-visible'));
      });
    } else {
      root.classList.add('is-ready');
    }

    const revealItems = [...document.querySelectorAll('[data-reveal]')];
    document.querySelectorAll('.visit-steps, .service-list').forEach((group) => {
      [...group.querySelectorAll('[data-reveal]')].forEach((item, index) => {
        if (index > 0 && index < 4) item.dataset.stagger = String(index);
      });
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      document.querySelector('.fact-section')?.classList.add('is-visible');
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.classList.contains('fact-date')) {
          entry.target.closest('.fact-section')?.classList.add('is-visible');
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function setupMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('#navigation');
    if (!toggle || !nav) return;

    const closeMenu = (returnFocus = false) => {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      if (returnFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (open) nav.querySelector('a')?.focus();
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  function setupStickyActions() {
    const bar = document.querySelector('#sticky-actions');
    const heroLink = document.querySelector('.hero-link');
    const footer = document.querySelector('.site-footer');
    if (!bar || !heroLink || !footer || !('IntersectionObserver' in window)) return;

    let heroVisible = true;
    let footerVisible = false;
    const update = () => {
      const visible = !heroVisible && !footerVisible;
      bar.classList.toggle('is-visible', visible);
      bar.toggleAttribute('inert', !visible);
      bar.setAttribute('aria-hidden', String(!visible));
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroLink) heroVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      update();
    }, { threshold: 0.02 });
    observer.observe(heroLink);
    observer.observe(footer);
  }

  function setupBooking() {
    const form = document.querySelector('#booking-form');
    if (!form) return;

    const panels = [...form.querySelectorAll('[data-panel]')];
    const stepStatus = document.querySelector('#step-status');
    const motifInputs = [...form.querySelectorAll('input[name="motif"]')];
    const dateList = document.querySelector('#date-list');
    const timeList = document.querySelector('#time-list');
    const summaryService = document.querySelector('#summary-service');
    const summaryDay = document.querySelector('#summary-day');
    const summaryTime = document.querySelector('#summary-time');
    const editButtons = [...document.querySelectorAll('[data-edit]')];
    const success = document.querySelector('#booking-success');
    const successTitle = document.querySelector('#success-title');
    const successCopy = document.querySelector('#success-copy');
    const restart = document.querySelector('#restart-booking');
    const times = ['09:00', '10:30', '12:00', '14:00', '16:00', '18:00'];
    const stepNames = ['Motif', 'Jour', 'Heure', 'Coordonnées'];

    let activeStep = 0;
    let transitioning = false;
    let chosenDate = null;
    let chosenTime = null;
    let finished = false;

    function setSummary() {
      const selectedMotif = motifInputs.find((input) => input.checked);
      summaryService.textContent = selectedMotif ? selectedMotif.value : 'À choisir';
      summaryDay.textContent = chosenDate ? chosenDate.label : 'À choisir';
      summaryTime.textContent = chosenTime ? chosenTime.label : 'À choisir';
      editButtons[0].hidden = !selectedMotif;
      editButtons[1].hidden = !chosenDate;
      editButtons[2].hidden = !chosenTime;
    }

    function clearMessages() {
      form.querySelectorAll('.field-error').forEach((node) => { node.textContent = ''; });
      form.querySelectorAll('[aria-invalid="true"]').forEach((node) => node.removeAttribute('aria-invalid'));
    }

    function getSelectedMotif() {
      return motifInputs.find((input) => input.checked) || null;
    }

    function getLocalIso(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function formatDate(date, options) {
      return new Intl.DateTimeFormat('fr-FR', options).format(date);
    }

    function createDateChoices() {
      dateList.replaceChildren();
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(today);
        date.setDate(today.getDate() + offset);
        const closed = date.getDay() === 0;
        const label = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
        const shortDay = formatDate(date, { weekday: 'short' }).replace('.', '');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-choice';
        button.dataset.iso = getLocalIso(date);
        button.dataset.label = label;
        button.disabled = closed;
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('aria-label', closed ? `${label}, fermé` : `${label}, date proposée dans cette démonstration, à confirmer`);

        const weekday = document.createElement('span');
        weekday.textContent = shortDay;
        const number = document.createElement('strong');
        number.textContent = String(date.getDate());
        button.append(weekday, number);
        if (closed) {
          const state = document.createElement('small');
          state.textContent = 'Fermé';
          button.append(state);
        } else if (offset === 0) {
          const state = document.createElement('small');
          state.textContent = 'Aujourd’hui';
          button.append(state);
        }

        button.addEventListener('click', () => {
          dateList.querySelectorAll('.date-choice').forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
          button.setAttribute('aria-pressed', 'true');
          chosenDate = { iso: button.dataset.iso, label };
          chosenTime = null;
          createTimeChoices();
          setSummary();
          panels[1].querySelector('[data-next]').disabled = false;
        });
        dateList.append(button);
      }
    }

    function createTimeChoices() {
      timeList.replaceChildren();
      times.forEach((timeValue) => {
        const [hour, minute] = timeValue.split(':').map(Number);
        const labelText = `${hour} h ${String(minute).padStart(2, '0')}`;
        const label = document.createElement('label');
        label.className = 'time-choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'heure';
        input.value = timeValue;
        input.setAttribute('aria-label', `${labelText}, heure fictive de démonstration`);
        const time = document.createElement('time');
        time.dateTime = `${chosenDate.iso}T${timeValue}`;
        time.textContent = labelText;
        input.addEventListener('change', () => {
          if (!input.checked) return;
          chosenTime = { value: timeValue, label: labelText };
          setSummary();
          panels[2].querySelector('[data-next]').disabled = false;
        });
        label.append(input, time);
        timeList.append(label);
      });
    }

    function transitionTo(step) {
      if (transitioning || step < 0 || step >= panels.length || finished) return;
      const previous = panels[activeStep];
      const next = panels[step];
      if (!previous || !next || previous === next) return;
      clearMessages();
      transitioning = true;
      stepStatus.textContent = `Étape ${step + 1} sur 4 · ${stepNames[step]}`;
      next.hidden = false;

      if (motionReduced.matches) {
        previous.hidden = true;
        previous.removeAttribute('data-state');
        next.dataset.state = 'current';
        activeStep = step;
        next.querySelector('h3')?.focus();
        transitioning = false;
        return;
      }

      previous.dataset.state = 'leaving';
      next.dataset.state = 'entering';
      nextFrame(() => nextFrame(() => { next.dataset.state = 'current'; }));
      window.setTimeout(() => {
        previous.hidden = true;
        previous.removeAttribute('data-state');
        activeStep = step;
        next.querySelector('h3')?.focus();
        transitioning = false;
      }, 240);
    }

    function validateAndFinish() {
      const nameField = document.querySelector('#prenom');
      const phoneField = document.querySelector('#telephone');
      const nameError = document.querySelector('#prenom-error');
      const phoneError = document.querySelector('#telephone-error');
      const bookingError = document.querySelector('#booking-error');
      const name = nameField.value.trim();
      const phone = phoneField.value.trim();
      let valid = true;

      nameError.textContent = '';
      phoneError.textContent = '';
      bookingError.textContent = '';
      nameField.removeAttribute('aria-invalid');
      phoneField.removeAttribute('aria-invalid');

      if (name.length < 2) {
        nameError.textContent = 'Indiquez un prénom d’au moins deux caractères.';
        nameField.setAttribute('aria-invalid', 'true');
        valid = false;
      }

      const compactPhone = phone.replace(/[\s().-]/g, '');
      const mobileOk = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(compactPhone);
      if (!mobileOk) {
        phoneError.textContent = 'Saisissez un numéro de mobile français commençant par 06, 07, +336 ou +337.';
        phoneField.setAttribute('aria-invalid', 'true');
        valid = false;
      }

      if (!getSelectedMotif() || !chosenDate || !chosenTime) {
        bookingError.textContent = 'Revenez aux étapes précédentes pour compléter votre sélection.';
        valid = false;
      }
      if (!valid) {
        (nameField.getAttribute('aria-invalid') ? nameField : phoneField).focus();
        return;
      }

      finished = true;
      panels.forEach((panel) => { panel.hidden = true; panel.removeAttribute('data-state'); });
      stepStatus.hidden = true;
      success.hidden = false;
      successTitle.textContent = `Merci, ${name}.`;
      successCopy.textContent = `Votre choix de démonstration est prêt : ${getSelectedMotif().value}, le ${chosenDate.label} à ${chosenTime.label}. Rien n’a été envoyé et aucun rendez-vous n’est confirmé. Appelez le salon pour vérifier les prestations, les horaires et les disponibilités.`;
      setSummary();
      nextFrame(() => successTitle.focus());
    }

    motifInputs.forEach((input) => input.addEventListener('change', () => {
      setSummary();
      panels[0].querySelector('[data-next]').disabled = !getSelectedMotif();
    }));

    form.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
      if (activeStep === 0 && !getSelectedMotif()) return;
      if (activeStep === 1 && !chosenDate) {
        document.querySelector('#date-error').textContent = 'Choisissez une date de démonstration.';
        return;
      }
      if (activeStep === 2 && !chosenTime) {
        document.querySelector('#time-error').textContent = 'Choisissez une heure de démonstration.';
        return;
      }
      transitionTo(activeStep + 1);
    }));

    form.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => transitionTo(activeStep - 1)));
    editButtons.forEach((button) => button.addEventListener('click', () => transitionTo(Number(button.dataset.edit))));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (activeStep !== 3 || transitioning) return;
      validateAndFinish();
    });

    restart?.addEventListener('click', () => {
      finished = false;
      chosenDate = null;
      chosenTime = null;
      motifInputs.forEach((input) => { input.checked = false; });
      document.querySelector('#prenom').value = '';
      document.querySelector('#telephone').value = '';
      document.querySelector('#date-error').textContent = '';
      document.querySelector('#time-error').textContent = '';
      panels.forEach((panel, index) => {
        panel.hidden = index !== 0;
        panel.removeAttribute('data-state');
      });
      panels[0].querySelector('[data-next]').disabled = true;
      stepStatus.hidden = false;
      stepStatus.textContent = 'Étape 1 sur 4 · Motif';
      success.hidden = true;
      activeStep = 0;
      setSummary();
      panels[0].querySelector('h3')?.focus();
    });

    createDateChoices();
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0;
      panel.dataset.state = index === 0 ? 'current' : '';
    });
    setSummary();
  }

  startPageMotion();
  setupMenu();
  setupStickyActions();
  setupBooking();
})();
