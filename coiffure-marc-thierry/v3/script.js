(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;

  if (!reduceMotion) {
    html.classList.add('motion-ready');
    document.querySelectorAll('.hero-entry').forEach((item, index) => {
      window.setTimeout(() => item.classList.add('is-in'), 35 + index * 95);
    });
  }

  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  function closeMenu(returnFocus = false) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    if (returnFocus) menuToggle.focus();
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(opening));
      mobileMenu.hidden = !opening;
      if (opening) mobileMenu.querySelector('a')?.focus();
    });
    mobileMenu.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      closeMenu();
      const destination = link.getAttribute('href');
      const heading = destination?.startsWith('#')
        ? document.querySelector(`${destination} h1, ${destination} h2, ${destination} h3`)
        : null;
      if (heading) {
        heading.tabIndex = -1;
        window.setTimeout(() => heading.focus(), 0);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
  }

  const signature = document.querySelector('.signature');
  const arrival = document.querySelector('.arrival');
  const revealRows = [...document.querySelectorAll('[data-reveal-row]')];
  if ('IntersectionObserver' in window && !reduceMotion) {
    const lineObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.25 });
    if (signature) lineObserver.observe(signature);
    if (arrival) lineObserver.observe(arrival);

    const rowObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = revealRows.indexOf(entry.target);
        window.setTimeout(() => entry.target.classList.add('is-revealed'), Math.max(index, 0) * 60);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 });
    revealRows.forEach((row) => rowObserver.observe(row));
  } else {
    signature?.classList.add('is-revealed');
    arrival?.classList.add('is-revealed');
    revealRows.forEach((row) => row.classList.add('is-revealed'));
  }

  const mobileSticky = document.getElementById('mobile-sticky');
  const hero = document.getElementById('accueil');
  const bookingSection = document.getElementById('rendez-vous');
  const footer = document.querySelector('.site-footer');
  if (mobileSticky && 'IntersectionObserver' in window) {
    mobileSticky.setAttribute('aria-hidden', 'true');
    mobileSticky.inert = true;
    const visible = new Map([[hero, true], [bookingSection, false], [footer, false]]);
    const updateSticky = () => {
      const shouldShow = !visible.get(hero) && !visible.get(bookingSection) && !visible.get(footer);
      mobileSticky.classList.toggle('is-visible', shouldShow);
      mobileSticky.setAttribute('aria-hidden', String(!shouldShow));
      mobileSticky.inert = !shouldShow;
    };
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting));
      updateSticky();
    }, { threshold: 0.06 });
    [hero, bookingSection, footer].forEach((element) => element && stickyObserver.observe(element));
  } else if (mobileSticky) {
    mobileSticky.classList.add('is-visible');
    mobileSticky.setAttribute('aria-hidden', 'false');
    mobileSticky.inert = false;
  }

  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const hoursByDay = {
    0: null,
    1: { open: 570, close: 1200 },
    2: { open: 570, close: 1200 },
    3: null,
    4: { open: 570, close: 1200 },
    5: { open: 570, close: 1200 },
    6: { open: 570, close: 1200 }
  };
  const parisFormat = (options) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...options });
  const parisNowParts = () => Object.fromEntries(parisFormat({
    weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));

  const openingStatus = document.getElementById('open-status');
  if (openingStatus) {
    const now = parisNowParts();
    const englishWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'long' }).format(new Date());
    const weekday = dayMap[englishWeekday];
    const currentMinutes = Number(now.hour) * 60 + Number(now.minute);
    const hours = hoursByDay[weekday];
    if (weekday === 3) {
      openingStatus.textContent = 'Horaires du mercredi à confirmer par téléphone.';
    } else if (!hours) {
      openingStatus.textContent = 'Fermé aujourd’hui selon les horaires publiés. Mercredi à confirmer.';
    } else if (currentMinutes >= hours.open && currentMinutes < hours.close) {
      openingStatus.textContent = 'Ouvert actuellement selon les horaires publiés. Mercredi à confirmer.';
    } else {
      openingStatus.textContent = 'Fermé actuellement selon les horaires publiés. Mercredi à confirmer.';
    }
  }

  const form = document.getElementById('booking-form');
  if (!form) return;

  const dateOptions = document.getElementById('date-options');
  const timeOptions = document.getElementById('time-options');
  const noSlotsMessage = document.getElementById('no-slots');
  const bookingSuccess = document.getElementById('booking-success');
  const progressItems = [...document.querySelectorAll('.booking-progress button[data-jump]')];
  const summary = {
    service: document.getElementById('summary-service'),
    detail: document.getElementById('summary-detail'),
    day: document.getElementById('summary-day'),
    time: document.getElementById('summary-time'),
    duration: document.getElementById('summary-duration'),
    price: document.getElementById('summary-price')
  };
  const serviceRadios = [...form.querySelectorAll('input[name="service"]')];
  let chosenDate = null;
  let chosenTime = null;
  let activeStep = 1;
  let unlockedStep = 1;
  let completed = false;

  function selectedService() {
    const input = serviceRadios.find((radio) => radio.checked);
    if (!input) return null;
    return {
      id: input.value,
      name: input.dataset.name,
      detail: input.dataset.detail
    };
  }

  function updateSummary() {
    const service = selectedService();
    if (service) {
      summary.service.textContent = service.name;
      summary.detail.textContent = service.detail;
      summary.duration.textContent = 'À confirmer';
      summary.price.textContent = 'À confirmer';
    }
    summary.day.textContent = chosenDate ? chosenDate.longLabel : 'À choisir';
    summary.time.textContent = chosenTime ? chosenTime.label : 'À choisir';
  }

  function dateAtOffset(offset) {
    const parisParts = Object.fromEntries(parisFormat({ year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map((part) => [part.type, part.value]));
    const todayUtc = new Date(Date.UTC(Number(parisParts.year), Number(parisParts.month) - 1, Number(parisParts.day) + offset, 12));
    const iso = `${todayUtc.getUTCFullYear()}-${String(todayUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(todayUtc.getUTCDate()).padStart(2, '0')}`;
    const weekday = todayUtc.getUTCDay();
    const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(todayUtc).replace('.', '');
    const longLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(todayUtc);
    return { iso, dayNumber: todayUtc.getUTCDate(), weekday, shortDay, longLabel, date: todayUtc };
  }

  function renderDates() {
    if (!dateOptions) return;
    dateOptions.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const item = dateAtOffset(offset);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'date-choice';
      button.dataset.date = item.iso;
      button.setAttribute('aria-pressed', String(chosenDate?.iso === item.iso));
      button.setAttribute('aria-label', `${item.longLabel}${item.weekday === 0 ? ', fermé' : item.weekday === 3 ? ', à confirmer' : ''}`);
      button.disabled = item.weekday === 0 || item.weekday === 3;
      button.innerHTML = `<span>${item.shortDay}</span><strong>${item.dayNumber}</strong>${item.weekday === 0 ? '<small>Fermé</small>' : item.weekday === 3 ? '<small>À confirmer</small>' : ''}`;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        chosenDate = item;
        chosenTime = null;
        dateOptions.querySelectorAll('.date-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        const error = document.getElementById('date-error');
        if (error) error.hidden = true;
        renderTimes();
        updateSummary();
      });
      dateOptions.append(button);
    }
  }

  function formatClock(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour}\u00a0h${minute ? `\u00a0${String(minute).padStart(2, '0')}` : ''}`;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function renderTimes() {
    if (!timeOptions) return;
    timeOptions.replaceChildren();
    if (!chosenDate) return;
    const hours = hoursByDay[chosenDate.weekday];
    const service = selectedService();
    if (!hours || !service) return;
    const parisToday = dateAtOffset(0).iso;
    const nowParts = parisNowParts();
    const nowMinutes = Number(nowParts.hour) * 60 + Number(nowParts.minute);
    let count = 0;
    for (let start = hours.open; start < hours.close; start += 30) {
      const label = formatClock(start);
      const past = chosenDate.iso === parisToday && start <= nowMinutes;
      const demoBusy = hashString(`${chosenDate.iso}|${service.id}|${start}`) % 7 === 0;
      const unavailable = past || demoBusy;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time-choice';
      button.dataset.time = String(start);
      button.setAttribute('aria-pressed', String(chosenTime?.minutes === start));
      button.disabled = unavailable;
      button.setAttribute('aria-label', unavailable
        ? `${label}, indisponible dans cette démonstration, disponibilité réelle inconnue`
        : `${label}, créneau de démonstration`);
      button.innerHTML = unavailable ? `${label}<small>${past ? 'passé' : 'indispo. · démo'}</small>` : label;
      button.addEventListener('click', () => {
        if (button.disabled) return;
        chosenTime = { minutes: start, label };
        timeOptions.querySelectorAll('.time-choice').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
        const error = document.getElementById('time-error');
        if (error) error.hidden = true;
        updateSummary();
      });
      timeOptions.append(button);
      if (!unavailable) count += 1;
    }
    if (noSlotsMessage) noSlotsMessage.hidden = count > 0;
  }

  function animateStep(step) {
    const target = form.querySelector(`[data-step="${step}"]`);
    if (!target || reduceMotion || typeof target.animate !== 'function') return;
    target.animate([
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 230, easing: 'cubic-bezier(.23, 1, .32, 1)' });
  }

  function updateProgress() {
    progressItems.forEach((button) => {
      const step = Number(button.dataset.jump);
      button.disabled = step > unlockedStep || completed;
      if (step === activeStep && !completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function goToStep(step, { focus = true, animate = true } = {}) {
    if (step > unlockedStep || completed) return;
    form.querySelectorAll('[data-step]').forEach((panel) => { panel.hidden = Number(panel.dataset.step) !== step; });
    activeStep = step;
    updateProgress();
    if (animate) animateStep(step);
    const heading = form.querySelector(`[data-step="${step}"] h3`);
    if (focus) window.setTimeout(() => heading?.focus(), reduceMotion ? 0 : 30);
  }

  function announceDateChoiceError() {
    const error = document.getElementById('date-error');
    if (error) error.hidden = Boolean(chosenDate);
  }

  function announceTimeChoiceError() {
    const error = document.getElementById('time-error');
    if (error) error.hidden = Boolean(chosenTime);
  }

  serviceRadios.forEach((radio) => radio.addEventListener('change', () => {
    chosenTime = null;
    updateSummary();
    if (chosenDate) renderTimes();
  }));

  document.querySelectorAll('[data-select-service]').forEach((link) => {
    link.addEventListener('click', () => {
      const service = serviceRadios.find((radio) => radio.value === link.dataset.selectService);
      if (service) {
        service.checked = true;
        service.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = Number(button.dataset.next);
      if (activeStep === 1 && !selectedService()) return;
      if (activeStep === 2 && !chosenDate) { announceDateChoiceError(); return; }
      if (activeStep === 3 && !chosenTime) { announceTimeChoiceError(); return; }
      if (activeStep === 2) renderTimes();
      unlockedStep = Math.max(unlockedStep, next);
      goToStep(next);
    });
  });

  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.back)));
  });

  progressItems.forEach((button) => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.jump)));
  });

  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');

  function phoneIsValid(value) {
    let digits = value.replace(/\D/g, '');
    if (value.trim().startsWith('+') && digits.startsWith('33')) digits = `0${digits.slice(2)}`;
    return /^0[67]\d{8}$/.test(digits);
  }

  function clearFieldError(input, error) {
    if (!input || !error) return;
    input.removeAttribute('aria-invalid');
    error.hidden = true;
  }

  nameInput?.addEventListener('input', () => clearFieldError(nameInput, nameError));
  phoneInput?.addEventListener('input', () => clearFieldError(phoneInput, phoneError));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const validName = (nameInput?.value.trim().length || 0) >= 2;
    const validPhone = phoneInput ? phoneIsValid(phoneInput.value) : false;
    if (!validName) {
      nameInput?.setAttribute('aria-invalid', 'true');
      if (nameError) nameError.hidden = false;
    } else clearFieldError(nameInput, nameError);
    if (!validPhone) {
      phoneInput?.setAttribute('aria-invalid', 'true');
      if (phoneError) phoneError.hidden = false;
    } else clearFieldError(phoneInput, phoneError);
    if (!validName || !validPhone) {
      (validName ? phoneInput : nameInput)?.focus();
      return;
    }
    completed = true;
    form.hidden = true;
    document.querySelector('.booking-progress').hidden = true;
    bookingSuccess.hidden = false;
    updateProgress();
    window.setTimeout(() => document.getElementById('success-title')?.focus(), reduceMotion ? 0 : 20);
  });

  function escapeCalendarText(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  document.getElementById('calendar-link')?.addEventListener('click', () => {
    if (!chosenDate || !chosenTime) return;
    const service = selectedService();
    const [year, month, day] = chosenDate.iso.split('-');
    const start = chosenTime.minutes;
    const clockPart = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const description = 'Parcours de réservation simulé pour un aperçu non officiel. Rien n’a été transmis au salon.';
    const content = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Coiffure Marc Thierry//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${Date.now()}@studio-lamy-preview`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Paris:${year}${month}${day}T${clockPart(start)}`,
      `SUMMARY:${escapeCalendarText(`Simulation · ${service?.name || 'Rendez-vous'} · Coiffure Marc Thierry`)}`,
      `DESCRIPTION:${escapeCalendarText(description)}`,
      'LOCATION:116 Grand Place, 38100 Grenoble', 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-coiffure-marc-thierry.ics';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  document.getElementById('restart-booking')?.addEventListener('click', () => {
    chosenDate = null;
    chosenTime = null;
    completed = false;
    unlockedStep = 1;
    activeStep = 1;
    form.reset();
    const defaultService = serviceRadios[0];
    if (defaultService) defaultService.checked = true;
    form.hidden = false;
    document.querySelector('.booking-progress').hidden = false;
    bookingSuccess.hidden = true;
    renderDates();
    updateSummary();
    goToStep(1, { animate: false });
  });

  renderDates();
  updateSummary();
  updateProgress();
})();
