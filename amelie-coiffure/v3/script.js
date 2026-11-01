(() => {
  const root = document.documentElement;
  const form = document.querySelector('#formulaire-rendez-vous');
  const steps = [...document.querySelectorAll('.booking-step')];
  const liveStatus = document.querySelector('#annonce-etape');
  const summary = document.querySelector('#resume-choix');
  const dayWrap = document.querySelector('#choix-jours');
  const timeWrap = document.querySelector('#choix-heures');
  const progress = document.querySelector('.booking-progress');
  const progressFill = document.querySelector('.booking-progress__fill');
  const success = document.querySelector('#confirmation');
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris'
  });
  const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', timeZone: 'Europe/Paris'
  });
  let currentStep = 1;
  let selectedDate = null;

  function announceStep(stepNumber) {
    const labels = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    liveStatus.textContent = `Étape ${stepNumber} sur 4 · ${labels[stepNumber - 1]}`;
    progress.setAttribute('aria-valuenow', String(stepNumber));
    progressFill.style.transform = `scaleX(${stepNumber / 4})`;
  }

  function changeStep(stepNumber) {
    if (stepNumber === currentStep) return;
    const previous = steps.find(step => Number(step.dataset.etape) === currentStep);
    const next = steps.find(step => Number(step.dataset.etape) === stepNumber);
    previous.classList.add('is-leaving');
    next.hidden = false;
    next.classList.add('is-entering');
    next.classList.add('is-current');
    currentStep = stepNumber;
    announceStep(stepNumber);
    updateSummary();
    requestAnimationFrame(() => next.classList.remove('is-entering'));
    window.setTimeout(() => {
      previous.hidden = true;
      previous.classList.remove('is-leaving', 'is-current');
    }, 230);
    next.querySelector('h3').focus({ preventScroll: true });
  }

  function getService() {
    return form.querySelector('input[name="prestation"]:checked')?.value || '';
  }

  function getTime() {
    return form.querySelector('input[name="heure"]:checked')?.value || '';
  }

  function updateSummary() {
    const parts = [];
    const service = getService();
    if (service) parts.push(service);
    if (selectedDate) parts.push(dateFormatter.format(selectedDate));
    const time = getTime();
    if (time) parts.push(`à ${time}`);
    summary.textContent = parts.length ? `Votre choix · ${parts.join(' · ')}` : 'Votre sélection apparaîtra ici.';
  }

  function makeParisCalendarDate(offset) {
    const todayInParis = new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris'
    }).format(new Date());
    const [year, month, day] = todayInParis.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + offset, 12, 0, 0, 0));
    return date;
  }

  function makeDayOptions() {
    for (let offset = 0; offset < 14; offset += 1) {
      const date = makeParisCalendarDate(offset);
      const day = date.getUTCDay();
      const button = document.createElement('button');
      const name = document.createElement('span');
      const dateLabel = document.createElement('span');
      button.className = 'day-option';
      button.type = 'button';
      name.className = 'day-option__name';
      name.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date).replace('.', '');
      dateLabel.className = 'day-option__date';
      dateLabel.textContent = shortDateFormatter.format(date).replace('.', '');
      button.setAttribute('aria-label', dateFormatter.format(date));
      button.setAttribute('aria-pressed', 'false');
      button.append(name, dateLabel);

      if (day === 1 || day === 0) {
        button.disabled = true;
        const reason = document.createElement('span');
        reason.className = 'day-option__reason';
        reason.textContent = 'Fermé';
        button.append(reason);
      } else if (day === 6) {
        button.disabled = true;
        const reason = document.createElement('span');
        reason.className = 'day-option__reason';
        reason.textContent = 'À confirmer';
        button.append(reason);
      } else {
        button.addEventListener('click', () => {
          dayWrap.querySelectorAll('.day-option').forEach(option => option.setAttribute('aria-pressed', 'false'));
          button.setAttribute('aria-pressed', 'true');
          selectedDate = date;
          renderTimeOptions(date);
          document.querySelector('#erreur-jour').textContent = '';
          updateSummary();
        });
      }
      dayWrap.append(button);
    }
  }

  function renderTimeOptions(date) {
    timeWrap.querySelectorAll('.time-option').forEach(option => option.remove());
    const now = new Date();
    const todayInParis = new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris'
    }).format(now);
    const selectedInParis = new Intl.DateTimeFormat('fr-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Paris'
    }).format(date);
    const isToday = todayInParis === selectedInParis;

    for (let minutes = 9 * 60; minutes < 19 * 60; minutes += 30) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const value = `${String(hour).padStart(2, '0')} h ${String(minute).padStart(2, '0')}`;
      const label = document.createElement('label');
      const input = document.createElement('input');
      const text = document.createElement('span');
      label.className = 'time-option';
      input.type = 'radio';
      input.name = 'heure';
      input.value = value;
      input.setAttribute('aria-label', value);
      text.textContent = value;
      if (isToday) {
        const current = new Intl.DateTimeFormat('fr-FR', {
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris'
        }).format(now).split(':').map(Number);
        const currentMinutes = current[0] * 60 + current[1];
        if (minutes <= currentMinutes) input.disabled = true;
      }
      input.addEventListener('change', updateSummary);
      label.append(input, text);
      timeWrap.append(label);
    }
  }

  function validateService() {
    const chosen = getService();
    document.querySelector('#erreur-prestation').textContent = chosen ? '' : 'Choisissez une prestation pour continuer.';
    return Boolean(chosen);
  }

  function validateDay() {
    const message = document.querySelector('#erreur-jour');
    message.textContent = selectedDate ? '' : 'Choisissez un jour proposé pour continuer.';
    return Boolean(selectedDate);
  }

  function validateTime() {
    const chosen = getTime();
    document.querySelector('#erreur-heure').textContent = chosen ? '' : 'Choisissez une heure proposée pour continuer.';
    return Boolean(chosen);
  }

  function validateDetails() {
    const firstName = document.querySelector('#prenom');
    const phone = document.querySelector('#telephone');
    const firstNameError = document.querySelector('#erreur-prenom');
    const phoneError = document.querySelector('#erreur-telephone');
    const mobilePattern = /^(?:(?:\+|00)33\s?|0)[67](?:[ .-]?\d{2}){4}$/;
    const nameOkay = firstName.value.trim().length > 0;
    const phoneOkay = mobilePattern.test(phone.value.trim());
    firstNameError.textContent = nameOkay ? '' : 'Saisissez votre prénom.';
    phoneError.textContent = phoneOkay ? '' : 'Saisissez un numéro de mobile français valide.';
    if (!nameOkay) firstName.focus();
    else if (!phoneOkay) phone.focus();
    return nameOkay && phoneOkay;
  }

  function showConfirmation() {
    const firstName = document.querySelector('#prenom').value.trim();
    const readableDate = dateFormatter.format(selectedDate);
    const time = getTime();
    const service = getService();
    document.querySelector('#recapitulatif-final').textContent = `${firstName} · ${service} · ${readableDate} à ${time}.`;
    form.hidden = true;
    summary.hidden = true;
    success.hidden = false;
    success.querySelector('h3').focus({ preventScroll: true });
  }

  form.addEventListener('click', event => {
    const nextButton = event.target.closest('[data-suivant]');
    const previousButton = event.target.closest('[data-precedent]');
    if (nextButton) {
      const next = Number(nextButton.dataset.suivant);
      const isValid = currentStep === 1 ? validateService() : currentStep === 2 ? validateDay() : currentStep === 3 ? validateTime() : true;
      if (isValid) changeStep(next);
    }
    if (previousButton) changeStep(Number(previousButton.dataset.precedent));
  });

  form.addEventListener('change', event => {
    if (event.target.matches('input[name="prestation"]')) {
      document.querySelector('#erreur-prestation').textContent = '';
      updateSummary();
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (validateDetails()) showConfirmation();
  });

  document.querySelector('.booking-reset').addEventListener('click', () => {
    form.reset();
    selectedDate = null;
    success.hidden = true;
    summary.hidden = false;
    form.hidden = false;
    steps.forEach((step, index) => {
      step.hidden = index !== 0;
      step.classList.remove('is-current', 'is-entering', 'is-leaving');
    });
    steps[0].classList.add('is-current');
    document.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    dayWrap.querySelectorAll('.day-option').forEach(option => option.setAttribute('aria-pressed', 'false'));
    timeWrap.querySelectorAll('.time-option').forEach(option => option.remove());
    currentStep = 1;
    announceStep(1);
    updateSummary();
    document.querySelector('#titre-etape-1').focus({ preventScroll: true });
  });

  document.querySelectorAll('.visit-list__item').forEach((item, index) => {
    item.dataset.reveal = 'true';
    item.style.transitionDelay = `${index * 65}ms`;
  });
  root.classList.add('js');
  if ('IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.reveal-line, .visit-list__item[data-reveal]').forEach(element => revealObserver.observe(element));

    const hideBarTargets = [document.querySelector('#rendez-vous'), document.querySelector('.site-footer')];
    const visibleHideTargets = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleHideTargets.add(entry.target);
        else visibleHideTargets.delete(entry.target);
      });
      document.body.classList.toggle('site--bar-hidden', visibleHideTargets.size > 0);
    }, { threshold: 0.12 });
    hideBarTargets.forEach(element => barObserver.observe(element));
  }

  makeDayOptions();
  announceStep(1);
  updateSummary();
})();
