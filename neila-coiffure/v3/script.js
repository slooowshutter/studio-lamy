(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('is-ready'));

  const revealItems = document.querySelectorAll('.reveal-once, [data-reveal-row], .date-heading, [data-street-drawing]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.hasAttribute('data-street-drawing') ? 'is-drawn' : 'is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
    document.querySelectorAll('.visit-list, .service-list, .completion-note ul').forEach((group) => {
      [...group.querySelectorAll('[data-reveal-row], li')].forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
      });
    });
  } else {
    revealItems.forEach((item) => item.classList.add(item.hasAttribute('data-street-drawing') ? 'is-drawn' : 'is-revealed'));
  }

  const form = document.getElementById('booking-form');
  const stepPanels = [...document.querySelectorAll('[data-booking-step]')];
  const stepStatus = document.getElementById('etat-etape');
  const progress = [...document.querySelectorAll('[data-progress-mark]')];
  const summary = {
    service: document.getElementById('recap-prestation'),
    day: document.getElementById('recap-jour'),
    time: document.getElementById('recap-heure'),
    price: document.getElementById('recap-tarif')
  };
  const datesBox = document.getElementById('choix-jours');
  const slotsBox = document.getElementById('choix-heures');
  const selectedDayLabel = document.getElementById('jour-selectionne');
  const confirmation = document.getElementById('confirmation');
  const recapConfirmation = document.getElementById('recap-confirmation');
  const calendarLink = document.getElementById('ajouter-agenda');
  const restartButton = document.getElementById('recommencer');
  const firstName = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  const errorElements = {
    service: document.getElementById('erreur-prestation'),
    day: document.getElementById('erreur-jour'),
    time: document.getElementById('erreur-heure'),
    firstName: document.getElementById('erreur-prenom'),
    phone: document.getElementById('erreur-telephone'),
    contact: document.getElementById('erreur-coordonnees')
  };

  const services = {
    coupe: { name: 'Coupe femme' },
    boucles: { name: 'Cheveux bouclés' },
    coloration: { name: 'Coloration' },
    extensions: { name: 'Extensions' }
  };
  const weekdayNames = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
  const fullDateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortMonthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

  let activeStep = 1;
  let selectedService = null;
  let selectedDay = null;
  let selectedTime = null;
  let calendarUrl = null;
  const panelHideTimers = new Map();

  function capitalize(value) { return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1); }
  function pad(value) { return String(value).padStart(2, '0'); }
  function localKey(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  function formattedDay(date) { return capitalize(fullDateFormat.format(date)); }
  function selectedRadio() { return form.querySelector('input[name="prestation"]:checked'); }
  function serviceForRadio(input) { return input ? services[input.value] : null; }
  function selectedDayDate() { return selectedDay ? new Date(`${selectedDay}T12:00:00`) : null; }

  function updateSummary() {
    const radio = selectedRadio();
    const service = serviceForRadio(radio);
    selectedService = radio ? radio.value : null;
    summary.service.textContent = service ? service.name : 'À choisir';
    summary.day.textContent = selectedDayDate() ? formattedDay(selectedDayDate()) : 'À choisir';
    summary.time.textContent = selectedTime ? selectedTime.replace(':', ' h ') : 'À choisir';
    summary.price.textContent = service ? 'À confirmer' : '—';
    document.querySelectorAll('[data-edit-step]').forEach((button) => {
      const step = Number(button.dataset.editStep);
      const complete = step === 1 ? Boolean(service) : step === 2 ? Boolean(selectedDay) : Boolean(selectedTime);
      button.disabled = !complete || step >= activeStep;
    });
  }

  function updateProgress() {
    const label = ['Prestation', 'Jour', 'Heure', 'Coordonnées'][activeStep - 1];
    stepStatus.textContent = `Étape ${activeStep} sur 4 · ${label}`;
    const progressLabel = document.querySelector('.booking-progress');
    progressLabel.setAttribute('aria-label', `Étape ${activeStep} sur 4`);
    progress.forEach((mark, index) => mark.classList.toggle('is-active', index < activeStep));
  }

  function moveToStep(nextStep) {
    const oldPanel = stepPanels[activeStep - 1];
    const nextPanel = stepPanels[nextStep - 1];
    if (!nextPanel || nextStep === activeStep) return;
    window.clearTimeout(panelHideTimers.get(nextPanel));
    panelHideTimers.delete(nextPanel);
    nextPanel.classList.remove('is-leaving');
    oldPanel.classList.add('is-leaving');
    oldPanel.inert = true;
    oldPanel.setAttribute('aria-hidden', 'true');
    const hideTimer = window.setTimeout(() => {
      oldPanel.hidden = true;
      oldPanel.classList.remove('is-leaving');
      panelHideTimers.delete(oldPanel);
    }, 220);
    panelHideTimers.set(oldPanel, hideTimer);
    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.removeAttribute('aria-hidden');
    nextPanel.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => nextPanel.classList.remove('is-entering')));
    activeStep = nextStep;
    updateProgress();
    updateSummary();
    if (nextStep === 3) renderSlots();
    window.setTimeout(() => nextPanel.querySelector('h3').focus(), 0);
  }

  function showError(element, show) { element.hidden = !show; }
  function hideStepErrors(step) {
    if (step === 1) showError(errorElements.service, false);
    if (step === 2) showError(errorElements.day, false);
    if (step === 3) showError(errorElements.time, false);
    if (step === 4) {
      Object.values(errorElements).slice(3).forEach((element) => showError(element, false));
    }
  }

  function openingHours(date) {
    const day = date.getDay();
    if (day >= 2 && day <= 5) return { open: 9 * 60, close: 19 * 60 };
    if (day === 6) return { open: 8 * 60, close: 17 * 60 };
    return null;
  }

  function makeDateChoices() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const key = localKey(date);
      const hours = openingHours(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-choice';
      button.dataset.day = key;
      button.disabled = !hours;
      button.setAttribute('aria-pressed', 'false');
      const weekday = capitalize(weekdayNames.format(date).slice(0, 3).replace('.', ''));
      const dateNumber = document.createElement('span');
      dateNumber.className = 'date-number';
      dateNumber.textContent = String(date.getDate());
      const weekdayLabel = document.createElement('span');
      weekdayLabel.className = 'date-weekday';
      weekdayLabel.textContent = weekday;
      const state = document.createElement('span');
      state.className = 'date-state';
      state.textContent = hours ? shortMonthFormat.format(date).replace('.', '') : 'Fermé';
      button.setAttribute('aria-label', hours ? `${formattedDay(date)}, disponible dans cette démonstration` : `${formattedDay(date)}, fermé`);
      button.append(weekdayLabel, dateNumber, state);
      button.addEventListener('click', () => {
        if (!hours) return;
        selectedDay = key;
        selectedTime = null;
        datesBox.querySelectorAll('.date-choice').forEach((choice) => {
          const active = choice.dataset.day === key;
          choice.classList.toggle('is-selected', active);
          choice.setAttribute('aria-pressed', String(active));
        });
        updateSummary();
        showError(errorElements.day, false);
      });
      datesBox.append(button);
    }
  }

  function formatTime(minutes) { return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`; }
  function timeLabel(value) { return value.replace(':', ' h '); }
  function bookedInDemo(dateKey, index, serviceKey) {
    const seed = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const serviceSeed = [...serviceKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return (seed + serviceSeed * 3 + index * 7) % 11 === 0;
  }

  function renderSlots() {
    slotsBox.replaceChildren();
    const date = selectedDayDate();
    const service = services[selectedService];
    if (!date || !service) return;
    selectedDayLabel.textContent = `${formattedDay(date)} · créneaux simulés selon les horaires affichés, à confirmer.`;
    const hours = openingHours(date);
    if (!hours) return;
    const now = new Date();
    const isToday = localKey(now) === selectedDay;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let count = 0;
    for (let start = hours.open; start < hours.close; start += 30) {
      const value = formatTime(start);
      const button = document.createElement('button');
      const past = isToday && start <= currentMinutes;
      const booked = bookedInDemo(selectedDay, count, selectedService);
      button.type = 'button';
      button.className = 'time-choice';
      button.textContent = timeLabel(value);
      button.dataset.time = value;
      button.disabled = past || booked;
      button.setAttribute('aria-pressed', 'false');
      if (booked && !past) {
        button.classList.add('is-taken');
        button.setAttribute('aria-label', `${timeLabel(value)}, déjà pris dans cette démonstration`);
      } else if (past) {
        button.setAttribute('aria-label', `${timeLabel(value)}, heure passée`);
      } else {
        button.setAttribute('aria-label', `${timeLabel(value)}, disponible dans cette démonstration`);
      }
      if (selectedTime === value) {
        button.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
      }
      button.addEventListener('click', () => {
        if (button.disabled) return;
        selectedTime = value;
        slotsBox.querySelectorAll('.time-choice').forEach((slot) => {
          const active = slot.dataset.time === value;
          slot.classList.toggle('is-selected', active);
          slot.setAttribute('aria-pressed', String(active));
        });
        updateSummary();
        showError(errorElements.time, false);
      });
      slotsBox.append(button);
      count += 1;
    }
    if (!slotsBox.children.length) {
      const empty = document.createElement('p');
      empty.className = 'section-note';
      empty.textContent = 'Aucun créneau restant dans cette démonstration. Revenez en arrière et choisissez un autre jour.';
      slotsBox.append(empty);
    }
  }

  function validFrenchMobile(value) {
    const normalized = value.replace(/[\s.-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(normalized);
  }

  function icsDate(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function escapeIcs(value) { return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n'); }

  function createCalendarFile() {
    const date = selectedDayDate();
    const [hour, minute] = selectedTime.split(':').map(Number);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Neila Coiffure//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${Date.now()}@neila-coiffure.local`, `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `SUMMARY:${escapeIcs('Rendez-vous de démonstration — Neila Coiffure')}`,
      `LOCATION:${escapeIcs('7 rue Fresnel, 25000 Besançon')}`,
      `DESCRIPTION:${escapeIcs('Simulation uniquement : aucune demande n’a été transmise au salon.')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    if (calendarUrl) URL.revokeObjectURL(calendarUrl);
    calendarUrl = URL.createObjectURL(blob);
    calendarLink.href = calendarUrl;
    calendarLink.download = 'rendez-vous-neila-coiffure.ics';
  }

  function confirmSimulation() {
    const name = firstName.value.trim();
    const phoneValue = phone.value.trim();
    const nameValid = name.length >= 2;
    const phoneValid = validFrenchMobile(phoneValue);
    showError(errorElements.firstName, !nameValid);
    showError(errorElements.phone, !phoneValid);
    showError(errorElements.contact, !nameValid || !phoneValid);
    if (!nameValid || !phoneValid) {
      (nameValid ? phone : firstName).focus();
      return;
    }
    const date = selectedDayDate();
    const service = services[selectedService];
    const line = `${name}, votre sélection pour ${service.name} est prête : ${formattedDay(date)} à ${timeLabel(selectedTime)}. Tarif à confirmer.`;
    recapConfirmation.textContent = line;
    createCalendarFile();
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector('h3').focus();
  }

  function resetBooking() {
    if (calendarUrl) URL.revokeObjectURL(calendarUrl);
    calendarUrl = null;
    form.reset();
    form.hidden = false;
    confirmation.hidden = true;
    selectedService = null;
    selectedDay = null;
    selectedTime = null;
    panelHideTimers.forEach((timer) => window.clearTimeout(timer));
    panelHideTimers.clear();
    stepPanels.forEach((panel, index) => {
      panel.classList.remove('is-entering', 'is-leaving');
      panel.hidden = index !== 0;
      panel.inert = index !== 0;
      if (index === 0) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
    activeStep = 1;
    datesBox.querySelectorAll('.date-choice').forEach((choice) => {
      choice.classList.remove('is-selected');
      choice.setAttribute('aria-pressed', 'false');
    });
    Object.values(errorElements).forEach((element) => showError(element, false));
    updateSummary();
    updateProgress();
    document.querySelector('#titre-etape-1').focus();
  }

  if (!form || !datesBox || !slotsBox) return;
  makeDateChoices();
  updateSummary();
  updateProgress();

  form.addEventListener('change', (event) => {
    if (event.target.name === 'prestation') {
      selectedTime = null;
      updateSummary();
      showError(errorElements.service, false);
    }
  });

  document.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      hideStepErrors(activeStep);
      if (activeStep === 1 && !selectedRadio()) {
        showError(errorElements.service, true);
        errorElements.service.focus();
        return;
      }
      if (activeStep === 2 && !selectedDay) {
        showError(errorElements.day, true);
        errorElements.day.focus();
        return;
      }
      if (activeStep === 3 && !selectedTime) {
        showError(errorElements.time, true);
        errorElements.time.focus();
        return;
      }
      if (activeStep < 4) moveToStep(activeStep + 1);
    });
  });

  document.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', () => {
      hideStepErrors(activeStep);
      if (activeStep > 1) moveToStep(activeStep - 1);
    });
  });

  document.querySelectorAll('[data-edit-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      if (form.hidden) {
        form.hidden = false;
        confirmation.hidden = true;
      }
      moveToStep(Number(button.dataset.editStep));
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!selectedRadio() || !selectedDay || !selectedTime) {
      showError(errorElements.contact, true);
      return;
    }
    confirmSimulation();
  });
  firstName.addEventListener('input', () => {
    if (firstName.value.trim().length >= 2) showError(errorElements.firstName, false);
  });
  phone.addEventListener('input', () => {
    if (validFrenchMobile(phone.value.trim())) showError(errorElements.phone, false);
  });
  restartButton.addEventListener('click', resetBooking);

  document.querySelectorAll('[data-book-service]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = form.querySelector(`input[name="prestation"][value="${button.dataset.bookService}"]`);
      if (!input) return;
      form.hidden = false;
      confirmation.hidden = true;
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (activeStep !== 1) {
        moveToStep(1);
      } else {
        updateProgress();
      }
      updateSummary();
      document.getElementById('titre-etape-1').focus();
    });
  });
})();
