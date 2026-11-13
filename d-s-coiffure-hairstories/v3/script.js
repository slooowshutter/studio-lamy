(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const form = document.querySelector('#formulaire-rendez-vous');
  if (!form) return;

  const noScript = document.querySelector('.no-script');
  if (noScript) noScript.hidden = true;
  form.hidden = false;

  const panels = new Map(Array.from(form.querySelectorAll('[data-panel]')).map((panel) => [
    Number(panel.dataset.panel), panel
  ]));
  const stepButtons = Array.from(form.querySelectorAll('[data-step-jump]'));
  const announce = form.querySelector('[data-annonce]');
  const state = { service: '', day: '', time: '' };
  let activeStep = 1;
  let unlockedStep = 1;
  let transitionTimer = 0;
  let pointerSubmission = false;

  const summaryNodes = {
    service: document.querySelector('[data-resume="service"]'),
    day: document.querySelector('[data-resume="day"]'),
    time: document.querySelector('[data-resume="time"]')
  };

  const parisToday = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Number(value.year), Number(value.month) - 1, Number(value.day), 12);
  };

  const dateKey = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const heureParis = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(value.hour) * 60 + Number(value.minute);
  };

  const jourComplet = (date) => date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const heureLisible = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return `${hours} h ${String(minutes).padStart(2, '0')}`;
  };

  const horaires = (date) => {
    const day = date.getDay();
    if (day === 0 || day === 1) return null;
    if (day === 6) return { ouverture: 9 * 60, fermeture: 16 * 60 + 30 };
    return { ouverture: 9 * 60, fermeture: 17 * 60 + 30 };
  };

  const resumeJour = () => {
    if (!state.day) return 'À choisir';
    const [year, month, day] = state.day.split('-').map(Number);
    return jourComplet(new Date(year, month - 1, day, 12));
  };

  const actualiserResume = () => {
    summaryNodes.service.textContent = state.service || 'À choisir';
    summaryNodes.day.textContent = resumeJour();
    summaryNodes.time.textContent = state.time ? heureLisible(state.time) : 'À choisir';
  };

  const ajouterChoixJour = () => {
    const list = form.querySelector('[data-days]');
    const today = parisToday();
    list.textContent = '';

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const key = dateKey(date);
      const schedule = horaires(date);
      const fullDate = jourComplet(date);
      const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
      const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      const label = document.createElement('label');
      label.className = 'day-choice';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = key;
      input.disabled = !schedule;
      input.setAttribute('aria-label', schedule ? fullDate : `${fullDate}, fermé`);

      const weekdayText = document.createElement('span');
      weekdayText.className = 'day-choice__weekday';
      weekdayText.textContent = weekday;

      const dateText = document.createElement('span');
      dateText.className = 'day-choice__date';
      dateText.textContent = String(date.getDate());

      const monthText = document.createElement('span');
      monthText.className = 'day-choice__weekday';
      monthText.textContent = month;

      label.append(input, weekdayText, dateText, monthText);

      if (!schedule) {
        const closedText = document.createElement('span');
        closedText.className = 'day-choice__closed';
        closedText.textContent = 'Fermé';
        label.append(closedText);
      }

      list.append(label);
    }
  };

  const ajouterChoixHeure = () => {
    const list = form.querySelector('[data-times]');
    const note = form.querySelector('[data-time-note]');
    const [year, month, day] = state.day.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    const schedule = horaires(date);
    const examples = ['09:00', '10:30', '12:00', '14:00', '15:30', '16:30'];
    const todayKey = dateKey(parisToday());
    const isToday = state.day === todayKey;
    const now = isToday ? heureParis() : -1;
    list.textContent = '';
    state.time = '';

    if (!schedule) {
      note.textContent = 'Ce jour est fermé sur Treatwell. Choisissez un autre exemple.';
      actualiserResume();
      return;
    }

    note.textContent = `Horaires d’exemple : de ${heureLisible('09:00')} à ${heureLisible(schedule.fermeture === 990 ? '16:30' : '17:30')}. Disponibilités non consultées.`;

    examples.forEach((value) => {
      const [hours, minutes] = value.split(':').map(Number);
      const minuteValue = hours * 60 + minutes;
      if (minuteValue < schedule.ouverture || minuteValue >= schedule.fermeture) return;

      const passed = isToday && minuteValue <= now;
      const label = document.createElement('label');
      label.className = 'time-choice';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = value;
      input.disabled = passed;
      input.setAttribute('aria-label', passed ? `${heureLisible(value)}, horaire d’exemple déjà passé` : `${heureLisible(value)}, horaire d’exemple`);
      const time = document.createElement('span');
      time.textContent = heureLisible(value);
      label.append(input, time);

      if (passed) {
        const past = document.createElement('span');
        past.className = 'day-choice__closed';
        past.textContent = 'Passé';
        label.append(past);
      }

      list.append(label);
    });

    if (!list.children.length) {
      const empty = document.createElement('p');
      empty.className = 'booking-panel__note';
      empty.textContent = 'Aucun horaire d’exemple ne reste aujourd’hui. Choisissez une autre date.';
      list.append(empty);
    }

    actualiserResume();
  };

  const actualiserEtapes = () => {
    stepButtons.forEach((button) => {
      const step = Number(button.dataset.stepJump);
      button.disabled = step > unlockedStep;
      if (step === activeStep && activeStep < 4) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }
    });
  };

  const afficherEtape = (nextStep, event) => {
    const previousStep = activeStep;
    const previousPanel = panels.get(previousStep);
    const nextPanel = panels.get(nextStep);
    if (!nextPanel || previousStep === nextStep) return;

    window.clearTimeout(transitionTimer);
    const animate = Boolean(event && event.detail > 0 && !reduceMotion.matches);
    activeStep = nextStep;
    actualiserEtapes();
    nextPanel.hidden = false;
    nextPanel.inert = false;
    previousPanel.inert = true;

    if (!animate) {
      previousPanel.hidden = true;
      previousPanel.classList.remove('is-leaving', 'is-entering', 'no-transition');
      nextPanel.classList.remove('is-leaving', 'is-entering');
      nextPanel.classList.add('no-transition');
      const title = nextPanel.querySelector('.booking-panel__title');
      if (title) title.focus({ preventScroll: true });
      requestAnimationFrame(() => nextPanel.classList.remove('no-transition'));
    } else {
      nextPanel.classList.add('is-entering');
      requestAnimationFrame(() => {
        nextPanel.classList.remove('is-entering');
        previousPanel.classList.add('is-leaving');
      });
      transitionTimer = window.setTimeout(() => {
        previousPanel.hidden = true;
        previousPanel.inert = false;
        previousPanel.classList.remove('is-leaving');
        const title = nextPanel.querySelector('.booking-panel__title');
        if (title) title.focus({ preventScroll: true });
      }, 235);
    }

    if (nextStep < 4) {
      const label = ['la prestation', 'le jour', 'l’heure'][nextStep - 1];
      announce.textContent = `Étape ${nextStep} sur 3 : choisir ${label}.`;
    }
  };

  const afficherErreur = (step) => {
    const message = form.querySelector(`[data-error="${step}"]`);
    message.hidden = false;
    announce.textContent = message.textContent;
  };

  const effacerErreur = (step) => {
    const message = form.querySelector(`[data-error="${step}"]`);
    if (message) message.hidden = true;
  };

  ajouterChoixJour();
  actualiserResume();

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'prestation') {
      state.service = target.value;
      effacerErreur(1);
    }
    if (target.name === 'jour') {
      state.day = target.value;
      state.time = '';
      effacerErreur(2);
      effacerErreur(3);
      ajouterChoixHeure();
    }
    if (target.name === 'heure') {
      state.time = target.value;
      effacerErreur(3);
    }
    actualiserResume();
  });

  form.addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-next]');
    const previousButton = event.target.closest('[data-previous]');
    const jumpButton = event.target.closest('[data-step-jump]');
    const restartButton = event.target.closest('[data-restart]');
    if (event.target.closest('button[type="submit"]')) {
      pointerSubmission = event.detail > 0;
      window.setTimeout(() => { pointerSubmission = false; }, 0);
    }

    if (nextButton) {
      if (activeStep === 1) {
        if (!state.service) return afficherErreur(1);
        unlockedStep = Math.max(unlockedStep, 2);
        afficherEtape(2, event);
      } else if (activeStep === 2) {
        if (!state.day || !horaires(new Date(`${state.day}T12:00:00`))) return afficherErreur(2);
        unlockedStep = Math.max(unlockedStep, 3);
        ajouterChoixHeure();
        afficherEtape(3, event);
      }
    }

    if (previousButton && activeStep > 1 && activeStep < 4) {
      afficherEtape(activeStep - 1, event);
    }

    if (jumpButton) {
      const requestedStep = Number(jumpButton.dataset.stepJump);
      if (requestedStep < activeStep && requestedStep <= unlockedStep) afficherEtape(requestedStep, event);
    }

    if (restartButton) {
      form.querySelectorAll('input[type="radio"]').forEach((input) => { input.checked = false; });
      state.service = '';
      state.day = '';
      state.time = '';
      unlockedStep = 1;
      form.querySelectorAll('[data-error]').forEach((message) => { message.hidden = true; });
      actualiserResume();
      afficherEtape(1, event);
      announce.textContent = 'La simulation a recommencé.';
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.service) return afficherErreur(1);
    if (!state.day) return afficherErreur(2);
    if (!state.time) return afficherErreur(3);

    const completion = form.querySelector('[data-completion]');
    completion.textContent = `${state.service} · ${resumeJour()} · ${heureLisible(state.time)}.`;
    unlockedStep = 4;
    afficherEtape(4, { detail: pointerSubmission ? 1 : 0 });
    announce.textContent = 'Simulation terminée. Rien n’a été transmis au salon.';
  });

  document.querySelectorAll('[data-choisir]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const option = Array.from(form.querySelectorAll('input[name="prestation"]'))
        .find((input) => input.value === link.dataset.choisir);
      if (!option) return;
      option.checked = true;
      option.dispatchEvent(new Event('change', { bubbles: true }));
      if (activeStep !== 1) afficherEtape(1, event);
      announce.textContent = `${link.dataset.choisir} sélectionné pour la simulation.`;
    });
  });
})();
