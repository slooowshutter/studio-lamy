(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const roots = document.documentElement;

  function setRevealDelays() {
    document.querySelectorAll('#visite .visit-list__item').forEach((item, index) => {
      item.style.setProperty('--reveal-delay', `${index * 50}ms`);
    });
    document.querySelectorAll('.street-line [data-trace]').forEach((item, index) => {
      item.style.setProperty('--trace-delay', `${index * 45}ms`);
    });
  }

  function setUpReveals() {
    const reveals = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -36px 0px' });

    reveals.forEach((item) => observer.observe(item));
  }

  function datePartsInParis(date) {
    const parts = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type).value;
    return { year: Number(part('year')), month: Number(part('month')), day: Number(part('day')) };
  }

  function parisToday() {
    const now = new Date();
    const parts = datePartsInParis(now);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  }

  function dateKey(date) {
    const parts = datePartsInParis(date);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  function dateLabel(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short'
    }).format(date).replaceAll('.', '');
  }

  function longDateLabel(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
    }).format(date);
  }

  function currentParisMinutes() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const hour = Number(parts.find((item) => item.type === 'hour').value);
    const minute = Number(parts.find((item) => item.type === 'minute').value);
    return hour * 60 + minute;
  }

    function isDemoUnavailable(day, minute) {
      const seedText = `${dateKey(day)}-${minute}`;
      let seed = 0;
      for (const character of seedText) seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
      return seed % 11 === 0;
    }

  function makeLabel(text, classes) {
    const label = document.createElement('label');
    label.className = classes;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'jour-rendez-vous';
    input.value = text.value;
    input.setAttribute('aria-label', text.accessible);
    const visible = document.createElement('span');
    visible.innerHTML = text.visible;
    label.append(input, visible);
    return { label, input };
  }

  function buildBooking() {
    const booking = document.querySelector('[data-booking]');
    if (!booking) return;

    const panels = Array.from(booking.querySelectorAll('[data-step-panel]'));
    const daysContainer = booking.querySelector('[data-days]');
    const timesContainer = booking.querySelector('[data-times]');
    const status = booking.querySelector('[data-booking-status]');
    const summaryService = document.querySelector('[data-summary-service]');
    const summaryWhen = document.querySelector('[data-summary-when]');
    const dayError = booking.querySelector('[data-day-error]');
    const timeError = booking.querySelector('[data-time-error]');
    const form = booking.querySelector('[data-contact-form]');
    const nameField = booking.querySelector('#prenom');
    const phoneField = booking.querySelector('#telephone');
    const nameError = booking.querySelector('[data-name-error]');
    const phoneError = booking.querySelector('[data-phone-error]');
    const formRecap = booking.querySelector('[data-form-recap]');
    const success = booking.querySelector('[data-success]');

    panels.forEach((panel, index) => { panel.hidden = index !== 0; });
    success.hidden = true;
    booking.querySelectorAll('[data-next], [data-back], [data-confirm], [data-restart]').forEach((button) => { button.disabled = false; });

    let currentStep = 0;
    let chosenDay = null;
    let chosenDayDate = null;
    let chosenTime = '';
    let moving = false;

    function updateSummary() {
      summaryService.textContent = 'Tatouage au henné rouge ou noir d’une main';
      if (!chosenDayDate) {
        summaryWhen.textContent = 'Jour et heure à choisir';
        return;
      }
      summaryWhen.textContent = `${longDateLabel(chosenDayDate)}${chosenTime ? ` · ${chosenTime.replace(':', ' h ')}` : ''}`;
    }

    function createDays() {
      const start = parisToday();
      for (let index = 0; index < 10; index += 1) {
        const date = new Date(start.getTime());
        date.setUTCDate(date.getUTCDate() + index);
        const key = dateKey(date);
        const labelText = dateLabel(date);
        const { label, input } = makeLabel({
          value: key,
          accessible: `Jour de démonstration : ${longDateLabel(date)}`,
          visible: `<span class="day-choice__label">${labelText.split(' ')[0]}</span><span class="day-choice__date">${labelText.split(' ').slice(1).join(' ')}</span>`
        }, 'day-choice');
        input.addEventListener('change', () => {
          chosenDay = key;
          chosenDayDate = date;
          chosenTime = '';
          dayError.hidden = true;
          makeTimes(date);
          updateSummary();
        });
        daysContainer.append(label);
      }
    }

    function makeTimes(date) {
      timesContainer.replaceChildren();
      const todayKey = dateKey(new Date());
      const selectedKey = dateKey(date);
      const currentMinutes = currentParisMinutes();
      let remaining = 0;

      for (let minute = 10 * 60; minute < 20 * 60; minute += 30) {
        const isPast = selectedKey === todayKey && minute <= currentMinutes;
        const isDemoBusy = !isPast && isDemoUnavailable(date, minute);
        if (!isPast && !isDemoBusy) remaining += 1;
        const hour = String(Math.floor(minute / 60)).padStart(2, '0');
        const minutes = String(minute % 60).padStart(2, '0');
        const time = `${hour}:${minutes}`;
        const label = document.createElement('label');
        label.className = 'time-choice';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'heure-rendez-vous';
        input.value = time;
        input.disabled = isPast || isDemoBusy;
        input.setAttribute('aria-label', `${isPast ? 'Heure passée' : isDemoBusy ? 'Heure indisponible pour la démonstration' : 'Heure de démonstration'} : ${hour} h ${minutes}`);
        const visible = document.createElement('span');
        visible.className = 'time-choice__value';
        visible.textContent = `${hour} h ${minutes}`;
        if (isPast || isDemoBusy) {
          const state = document.createElement('small');
          state.className = 'time-choice__state';
          state.textContent = isPast ? 'passé' : 'indisponible · démo';
          visible.append(state);
        }
        input.addEventListener('change', () => {
          chosenTime = time;
          timeError.hidden = true;
          updateSummary();
          updateFormRecap();
        });
        label.append(input, visible);
        timesContainer.append(label);
      }

      if (remaining === 0) {
        const message = document.createElement('p');
        message.className = 'empty-times';
        message.textContent = 'Aucune heure de démonstration ne reste aujourd’hui. Choisissez une autre date.';
        timesContainer.append(message);
      }
    }

    function updateFormRecap() {
      if (!chosenDayDate || !chosenTime) {
        formRecap.textContent = '';
        return;
      }
      formRecap.textContent = `Récapitulatif de démonstration : ${longDateLabel(chosenDayDate)} à ${chosenTime.replace(':', ' h ')}. Aucun rendez-vous n’est réservé.`;
    }

    function updateStepStatus(index) {
      const labels = ['prestation', 'jour', 'heure', 'coordonnées'];
      status.textContent = `Parcours : ${labels[index]}`;
    }

    function animateElement(element, frames, duration) {
      if (typeof element.animate !== 'function' || duration === 0) return Promise.resolve();
      const animation = element.animate(frames, {
        duration,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fill: 'forwards'
      });
      return animation.finished.catch(() => undefined);
    }

    async function showStep(nextStep) {
      if (moving || nextStep < 0 || nextStep >= panels.length) return;
      moving = true;
      const oldPanel = panels[currentStep];
      const nextPanel = panels[nextStep];
      const duration = reduceMotion ? 140 : 230;
      const outFrames = reduceMotion
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(7px)' }];
      await animateElement(oldPanel, outFrames, duration);
      oldPanel.hidden = true;
      nextPanel.hidden = false;
      updateStepStatus(nextStep);
      if (nextStep === 3) updateFormRecap();
      const inFrames = reduceMotion
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }];
      await animateElement(nextPanel, inFrames, duration);
      currentStep = nextStep;
      nextPanel.querySelector('h3').focus();
      moving = false;
    }

    function clearError(field, error) {
      field.removeAttribute('aria-invalid');
      error.hidden = true;
    }

    function validatePhone(value) {
      const digits = value.replace(/[\s().-]/g, '');
      return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(digits);
    }

    function validateForm() {
      const hasName = nameField.value.trim().length > 0;
      const hasPhone = validatePhone(phoneField.value.trim());
      nameError.hidden = hasName;
      phoneError.hidden = hasPhone;
      nameField.setAttribute('aria-invalid', String(!hasName));
      phoneField.setAttribute('aria-invalid', String(!hasPhone));
      if (!hasName) nameField.focus();
      else if (!hasPhone) phoneField.focus();
      return hasName && hasPhone;
    }

    daysContainer.addEventListener('change', (event) => {
      if (event.target.matches('input[type="radio"]')) updateSummary();
    });

    booking.addEventListener('click', (event) => {
      const nextButton = event.target.closest('[data-next]');
      const backButton = event.target.closest('[data-back]');
      const confirmButton = event.target.closest('[data-confirm]');
      const restartButton = event.target.closest('[data-restart]');

      if (confirmButton) {
        form.requestSubmit();
        return;
      }

      if (nextButton) {
        if (currentStep === 1 && !chosenDay) {
          dayError.hidden = false;
          daysContainer.querySelector('input')?.focus();
          return;
        }
        if (currentStep === 2 && !chosenTime) {
          timeError.hidden = false;
          timesContainer.querySelector('input:not(:disabled)')?.focus();
          return;
        }
        if (currentStep < 3) showStep(currentStep + 1);
      }

      if (backButton && currentStep > 0) showStep(currentStep - 1);

      if (restartButton) {
        success.hidden = true;
        form.reset();
        chosenDay = null;
        chosenDayDate = null;
        chosenTime = '';
        daysContainer.querySelectorAll('input').forEach((input) => { input.checked = false; });
        timesContainer.replaceChildren();
        nameField.value = '';
        phoneField.value = '';
        clearError(nameField, nameError);
        clearError(phoneField, phoneError);
        dayError.hidden = true;
        timeError.hidden = true;
        updateSummary();
        currentStep = 0;
        updateStepStatus(0);
        panels[0].hidden = false;
        panels[0].querySelector('h3').focus();
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (moving || !validateForm()) return;
      moving = true;
      const currentPanel = panels[currentStep];
      await animateElement(currentPanel, reduceMotion
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(7px)' }], reduceMotion ? 140 : 230);
      currentPanel.hidden = true;
      success.hidden = false;
      const summaryDate = chosenDayDate ? longDateLabel(chosenDayDate) : '';
      const summaryHour = chosenTime ? chosenTime.replace(':', ' h ') : '';
      booking.querySelector('[data-success-message]').textContent = `Simulation pour le tatouage au henné rouge ou noir d’une main, ${summaryDate} à ${summaryHour}. Aucune réservation ni demande n’a été transmise.`;
      await animateElement(success, reduceMotion
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'translateY(7px)' }, { opacity: 1, transform: 'translateY(0)' }], reduceMotion ? 140 : 230);
      success.querySelector('h3').textContent = 'Simulation terminée';
      success.querySelector('h3').focus();
      status.textContent = 'Simulation terminée. Rien n’a été transmis.';
      updateSummary();
      moving = false;
    });

    nameField.addEventListener('input', () => clearError(nameField, nameError));
    phoneField.addEventListener('input', () => clearError(phoneField, phoneError));
    createDays();
    updateSummary();
  }

  setRevealDelays();
  setUpReveals();
  buildBooking();
  requestAnimationFrame(() => roots.classList.add('is-ready'));
  window.__site = true;
})();
