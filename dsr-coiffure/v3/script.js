(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const cover = document.querySelector('.cover');
  if (cover) requestAnimationFrame(() => cover.classList.add('is-ready'));

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#navigation-principale');

  function closeMenu(returnFocus = false) {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
    menu.classList.remove('is-open');
    if (returnFocus) menuButton.focus();
  }

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.classList.toggle('is-open', opening);
      if (opening) menu.querySelector('a')?.focus();
    });
    menu.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  const readingCard = document.querySelector('.reading-card');
  if (readingCard && 'IntersectionObserver' in window) {
    const readingObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        readingCard.classList.add('is-visible');
        readingObserver.disconnect();
      }
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
    readingObserver.observe(readingCard);
  } else if (readingCard) {
    readingCard.classList.add('is-visible');
  }

  const form = document.querySelector('#booking-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.booking-step'));
  const progress = Array.from(form.querySelectorAll('[data-progress]'));
  const serviceInputs = Array.from(form.querySelectorAll('input[name="prestation"]'));
  const dayStrip = document.querySelector('#day-strip');
  const slotGrid = document.querySelector('#slot-grid');
  const announcement = document.querySelector('#booking-announcement');
  const success = document.querySelector('#booking-success');
  const successSummary = document.querySelector('#success-summary');
  const formControls = {
    service: document.querySelector('[data-error="service"]'),
    day: document.querySelector('[data-error="day"]'),
    slot: document.querySelector('[data-error="slot"]'),
    name: document.querySelector('#erreur-prenom'),
    phone: document.querySelector('#erreur-telephone')
  };
  const summary = {
    service: document.querySelector('#resume-prestation'),
    day: document.querySelector('#resume-jour'),
    time: document.querySelector('#resume-heure'),
    name: document.querySelector('#resume-prenom')
  };
  const dateLocale = 'fr-FR';
  const timeZone = 'Europe/Paris';
  let currentStep = 0;
  let selectedDay = null;
  let selectedSlot = null;
  let dayRecords = [];
  let transitioning = false;

  function parisParts(date = new Date()) {
    return new Intl.DateTimeFormat(dateLocale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date).reduce((parts, item) => {
      if (item.type !== 'literal') parts[item.type] = item.value;
      return parts;
    }, {});
  }

  function isoFromParts(parts) {
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function dateFromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function currentParisDate() {
    const parts = parisParts();
    return { iso: isoFromParts(parts), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function fullDate(iso) {
    return new Intl.DateTimeFormat(dateLocale, {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateFromIso(iso));
  }

  function compactDate(iso) {
    return new Intl.DateTimeFormat(dateLocale, {
      timeZone: 'UTC', day: '2-digit', month: 'short'
    }).format(dateFromIso(iso)).replace(/\.$/, '');
  }

  function weekday(iso) {
    return new Intl.DateTimeFormat(dateLocale, { timeZone: 'UTC', weekday: 'short' })
      .format(dateFromIso(iso)).replace(/\.$/, '');
  }

  function announce(message) {
    if (announcement) announcement.textContent = message;
  }

  function selectedService() {
    return serviceInputs.find(input => input.checked) || null;
  }

  function updateSummary() {
    const service = selectedService();
    if (summary.service) summary.service.textContent = service ? service.value : 'À choisir';
    if (summary.day) summary.day.textContent = selectedDay ? fullDate(selectedDay.iso) : 'À choisir';
    if (summary.time) summary.time.textContent = selectedSlot || 'À choisir';
    const nameField = document.querySelector('#prenom');
    if (summary.name) summary.name.textContent = nameField?.value.trim() || 'À saisir';
  }

  function renderDays() {
    if (!dayStrip) return;
    dayStrip.replaceChildren();
    const parisToday = currentParisDate();
    const [year, month, day] = parisToday.iso.split('-').map(Number);
    const todayAtUtc = Date.UTC(year, month - 1, day, 12);
    dayRecords = [];

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(todayAtUtc + offset * 86400000);
      const iso = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
      const isClosed = date.getUTCDay() === 0;
      dayRecords.push({ iso, index: offset, isClosed });
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-choice';
      button.dataset.date = iso;
      button.dataset.index = String(offset);
      button.disabled = isClosed;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${offset === 0 ? 'Aujourd’hui, ' : ''}${fullDate(iso)}${isClosed ? ', fermé selon les horaires Planity' : ', horaires affichés de 9 h à 20 h, à confirmer'}`);
      const state = isClosed ? 'Fermé' : offset === 0 ? 'Aujourd’hui' : 'Ouvert';
      button.innerHTML = `<span class="day-choice__name">${offset === 0 ? 'Auj.' : weekday(iso)}</span><span class="day-choice__date">${compactDate(iso)}</span><span class="day-choice__state">${state}</span>`;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        dayStrip.querySelectorAll('.day-choice').forEach(dayButton => dayButton.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        selectedDay = { iso, index: offset };
        selectedSlot = null;
        if (formControls.day) formControls.day.hidden = true;
        if (formControls.slot) formControls.slot.hidden = true;
        updateSummary();
        renderSlots();
        announce(`Jour choisi : ${fullDate(iso)}. Les heures de démonstration sont prêtes.`);
      });
      dayStrip.append(button);
    }
  }

  function formatTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${hour} h ${minute}`;
  }

  function renderSlots() {
    if (!slotGrid || !selectedDay) return;
    slotGrid.replaceChildren();
    const service = selectedService();
    const duration = Number(service?.dataset.duration || 30);
    const parisNow = currentParisDate();
    let availableCount = 0;

    for (let start = 540; start + duration <= 1200; start += 30) {
      const time = formatTime(start);
      const isPast = selectedDay.iso === parisNow.iso && start <= parisNow.minutes;
      const isTakenExample = ((Math.floor(start / 30) + selectedDay.index * 3 + duration) % 7) === 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `slot-choice${isTakenExample ? ' is-taken' : ''}`;
      button.textContent = time;
      button.dataset.time = time;
      button.disabled = isPast || isTakenExample;
      button.setAttribute('aria-pressed', 'false');
      if (isPast) {
        button.setAttribute('aria-label', `${time}, heure déjà passée`);
      } else if (isTakenExample) {
        button.setAttribute('aria-label', `${time}, indisponible pour l’exemple`);
      } else {
        availableCount += 1;
        button.setAttribute('aria-label', `${time}, choisir cette heure de démonstration`);
      }
      button.addEventListener('click', () => {
        if (button.disabled) return;
        slotGrid.querySelectorAll('.slot-choice').forEach(slot => slot.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        selectedSlot = time;
        if (formControls.slot) formControls.slot.hidden = true;
        updateSummary();
        announce(`Heure de démonstration choisie : ${time}.`);
      });
      slotGrid.append(button);
    }

    if (availableCount === 0) {
      const note = document.createElement('p');
      note.className = 'no-slots';
      note.textContent = 'Aucune heure future à montrer pour cette date. Choisissez un autre jour.';
      slotGrid.append(note);
    }
  }

  function updateProgress(step) {
    progress.forEach((item, index) => {
      item.classList.toggle('is-current', index === step);
      item.classList.toggle('is-complete', index < step);
      if (index === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }

  function hideStepErrors(step) {
    if (step === 0 && formControls.service) formControls.service.hidden = true;
    if (step === 1 && formControls.day) formControls.day.hidden = true;
    if (step === 2 && formControls.slot) formControls.slot.hidden = true;
    if (step === 3) {
      if (formControls.name) formControls.name.hidden = true;
      if (formControls.phone) formControls.phone.hidden = true;
    }
  }

  function moveToStep(nextStep) {
    if (transitioning || nextStep < 0 || nextStep >= steps.length) return;
    transitioning = true;
    const current = steps[currentStep];
    const next = steps[nextStep];
    form.classList.add('is-transitioning');
    current.classList.add('is-leaving');

    const transitionDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    window.setTimeout(() => {
      current.hidden = true;
      current.classList.remove('is-leaving', 'is-active');
      next.hidden = false;
      next.classList.remove('is-active');
      requestAnimationFrame(() => {
        next.classList.add('is-active');
        form.classList.remove('is-transitioning');
        currentStep = nextStep;
        updateProgress(currentStep);
        hideStepErrors(currentStep);
        next.querySelector('h3')?.focus({ preventScroll: true });
        announce(`Étape ${currentStep + 1} sur ${steps.length} : ${next.querySelector('h3')?.textContent.trim() || ''}`);
        transitioning = false;
      });
    }, transitionDelay);
  }

  function canContinue() {
    if (currentStep === 0 && !selectedService()) {
      formControls.service.hidden = false;
      serviceInputs[0]?.focus();
      announce('Choisissez une prestation pour continuer.');
      return false;
    }
    if (currentStep === 1 && !selectedDay) {
      formControls.day.hidden = false;
      announce('Choisissez un jour ouvert pour continuer.');
      return false;
    }
    if (currentStep === 2 && !selectedSlot) {
      formControls.slot.hidden = false;
      announce('Choisissez une heure disponible pour continuer.');
      return false;
    }
    return true;
  }

  form.querySelectorAll('[data-next]').forEach(button => {
    button.addEventListener('click', () => {
      if (canContinue()) moveToStep(currentStep + 1);
    });
  });
  form.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => moveToStep(currentStep - 1));
  });

  serviceInputs.forEach(input => {
    input.addEventListener('change', () => {
      selectedDay = null;
      selectedSlot = null;
      if (dayStrip) dayStrip.querySelectorAll('.day-choice').forEach(button => button.setAttribute('aria-pressed', 'false'));
      if (formControls.service) formControls.service.hidden = true;
      if (formControls.day) formControls.day.hidden = true;
      if (formControls.slot) formControls.slot.hidden = true;
      updateSummary();
      renderSlots();
      announce(`Prestation choisie : ${input.value}, durée ${input.dataset.duration} minutes.`);
    });
  });

  document.querySelectorAll('.service-row[data-prestation]').forEach(link => {
    link.addEventListener('click', () => {
      const matchingInput = serviceInputs.find(input => input.value === link.dataset.prestation);
      if (!matchingInput) return;
      matchingInput.checked = true;
      matchingInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  function validMobile(value) {
    const digits = value.replace(/\D/g, '');
    return (digits.length === 10 && /^0[67]/.test(digits)) || (digits.length === 11 && /^33[67]/.test(digits));
  }

  form.addEventListener('input', event => {
    if (event.target.matches('#prenom, #telephone')) updateSummary();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (currentStep !== 3) return;
    const nameField = document.querySelector('#prenom');
    const phoneField = document.querySelector('#telephone');
    const nameValid = Boolean(nameField?.value.trim());
    const phoneValid = Boolean(phoneField && validMobile(phoneField.value));
    formControls.name.hidden = nameValid;
    formControls.phone.hidden = phoneValid;
    if (!nameValid) {
      nameField?.focus();
      announce('Saisissez un prénom pour terminer la démonstration.');
      return;
    }
    if (!phoneValid) {
      phoneField?.focus();
      announce('Vérifiez le numéro de mobile.');
      return;
    }
    const service = selectedService();
    const serviceName = service ? service.value : 'Prestation à confirmer';
    successSummary.textContent = `${nameField.value.trim()}, la simulation montre « ${serviceName} », le ${fullDate(selectedDay.iso)} à ${selectedSlot}.`;
    steps.forEach(step => { step.hidden = true; step.classList.remove('is-active'); });
    form.querySelector('.booking-progress').hidden = true;
    success.hidden = false;
    success.focus();
    updateSummary();
    announce('Simulation terminée. Aucun rendez-vous n’a été demandé et aucune donnée n’a été envoyée.');
  });

  document.querySelector('#restart-booking')?.addEventListener('click', () => {
    form.reset();
    currentStep = 0;
    selectedDay = null;
    selectedSlot = null;
    transitioning = false;
    form.classList.remove('is-transitioning');
    form.querySelector('.booking-progress').hidden = false;
    success.hidden = true;
    steps.forEach((step, index) => {
      step.hidden = index !== 0;
      step.classList.remove('is-leaving');
      step.classList.toggle('is-active', index === 0);
    });
    updateProgress(0);
    updateSummary();
    renderDays();
    announce('La simulation a été réinitialisée. Choisissez une prestation.');
    steps[0].querySelector('h3')?.focus({ preventScroll: true });
  });

  document.querySelector('#telephone')?.addEventListener('blur', event => {
    const value = event.target.value.trim();
    if (value) formControls.phone.hidden = validMobile(value);
  });

  renderDays();
  updateSummary();
  updateProgress(0);

  const quickBar = document.querySelector('.mobile-bar');
  const reserveSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  if (quickBar && 'IntersectionObserver' in window) {
    const visibleSections = new Set();
    const quickBarObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      const hidden = visibleSections.size > 0;
      quickBar.classList.toggle('is-hidden', hidden);
      quickBar.toggleAttribute('inert', hidden);
      quickBar.setAttribute('aria-hidden', String(hidden));
    }, { threshold: 0.08, rootMargin: '0px 0px -18% 0px' });
    if (reserveSection) quickBarObserver.observe(reserveSection);
    if (footer) quickBarObserver.observe(footer);
  }
})();
