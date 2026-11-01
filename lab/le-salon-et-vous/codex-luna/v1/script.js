(() => {
  const root = document.querySelector('[data-booking]');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const live = root.querySelector('[data-live]');
  const steps = [...root.querySelectorAll('[data-step]')];
  const serviceInputs = [...root.querySelectorAll('input[name="service"]')];
  const dateList = root.querySelector('[data-days]');
  const slotList = root.querySelector('[data-slots]');
  const slotCount = root.querySelector('[data-slot-count]');
  const nextButtons = [...root.querySelectorAll('[data-next]')];
  const contactForm = root.querySelector('.contact-form');
  const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
  const stepNames = ['prestation', 'jour', 'heure', 'coordonnees', 'confirmation'];
  const hours = { 0: null, 1: null, 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [570, 1140] };
  const services = {
    femme: { name: 'Coupe femme', price: 'Dès 60 €', duration: '45 min*', minutes: 45 },
    homme: { name: 'Coupe homme', price: 'Dès 32 €', duration: '30 min*', minutes: 30 },
    enfant: { name: 'Coupe enfant', price: 'Dès 25 €', duration: '30 min*', minutes: 30 },
    coloration: { name: 'Coloration', price: 'Dès 50 €', duration: '1 h 45*', minutes: 105 },
    meches: { name: 'Mèches', price: 'Dès 60 €', duration: '2 h*', minutes: 120 },
    chignon: { name: 'Chignon', price: 'Dès 80 €', duration: '1 h 15*', minutes: 75 }
  };
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const summary = {
    service: root.querySelector('[data-summary-service]'),
    price: root.querySelector('[data-summary-price]'),
    day: root.querySelector('[data-summary-day]'),
    time: root.querySelector('[data-summary-time]'),
    duration: root.querySelector('[data-summary-duration]')
  };

  const pad = (value) => String(value).padStart(2, '0');
  const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseISODate = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  };
  const formatDate = (value) => dateFormatter.format(parseISODate(value)).replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR'));

  function updateSummary() {
    const service = services[state.service];
    summary.service.textContent = service ? service.name : 'Choisissez une prestation';
    summary.price.textContent = service ? service.price : '—';
    summary.duration.textContent = service ? service.duration : '—';
    summary.day.textContent = state.date ? formatDate(state.date) : 'À choisir';
    summary.time.textContent = state.time || 'À choisir';
    root.querySelector('[data-goto="0"]').disabled = !state.service;
    root.querySelector('[data-goto="1"]').disabled = !state.service;
    root.querySelector('[data-goto="2"]').disabled = !state.date;
  }

  function setStep(index, push = true) {
    if (index < 0 || index >= steps.length) return;
    state.step = index;
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === index;
      if (active) {
        step.hidden = false;
        step.classList.remove('is-active');
        requestAnimationFrame(() => {
          if (state.step === stepIndex) step.classList.add('is-active');
        });
      } else {
        step.classList.remove('is-active');
        step.hidden = true;
      }
    });
    nextButtons.forEach((button) => {
      const stepNumber = Number(button.closest('[data-step]').dataset.step);
      const ready = (stepNumber === 0 && Boolean(state.service)) ||
        (stepNumber === 1 && Boolean(state.date)) ||
        (stepNumber === 2 && Boolean(state.time));
      button.disabled = !ready;
    });
    const targetName = stepNames[index];
    if (push) history.pushState({ bookingStep: index }, '', `?etape=${targetName}`);
    else history.replaceState({ bookingStep: index }, '', `?etape=${targetName}`);
    updateSummary();
    const heading = steps[index].querySelector('h3');
    if (heading) {
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      if (bounds.top < 92 || bounds.bottom > window.innerHeight) {
        heading.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      }
    }
    live.textContent = `Étape ${index + 1} sur 5 : ${heading ? heading.textContent.replace(/[?？]/g, '').trim() : ''}`;
  }

  function renderDays() {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    dateList.replaceChildren();
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + offset);
      const iso = toISODate(day);
      const isClosed = hours[day.getDay()] === null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-chip';
      button.dataset.date = iso;
      button.disabled = isClosed;
      button.setAttribute('aria-pressed', String(state.date === iso));
      button.setAttribute('aria-label', `${formatDate(iso)}${isClosed ? ', fermé' : ''}`);
      const weekday = document.createElement('span');
      weekday.textContent = offset === 0 ? 'auj.' : dayFormatter.format(day).replace('.', '');
      const dateNumber = document.createElement('strong');
      dateNumber.textContent = String(day.getDate());
      const stateLabel = document.createElement('span');
      stateLabel.textContent = isClosed ? 'fermé' : (offset === 1 ? 'demain' : '');
      button.append(weekday, dateNumber, stateLabel);
      button.addEventListener('click', () => {
        state.date = iso;
        state.time = '';
        renderDays();
        renderSlots();
        updateSummary();
        const available = slotList.querySelectorAll('input:not(:disabled)').length;
        live.textContent = `${available} créneaux proposés le ${formatDate(iso)}. Sélectionnez « Voir les heures » pour continuer.`;
        nextButtons.forEach((next) => {
          if (Number(next.closest('[data-step]').dataset.step) === 1) next.disabled = false;
        });
      });
      dateList.append(button);
    }
  }

  function bookedForDate(iso, index) {
    const seed = [...iso].reduce((total, character) => total + character.charCodeAt(0), 0);
    return (seed + index * 7) % 13 === 0;
  }

  function renderSlots() {
    slotList.replaceChildren();
    nextButtons.forEach((button) => {
      if (Number(button.closest('[data-step]').dataset.step) === 2) button.disabled = true;
    });
    if (!state.date || !state.service) {
      slotCount.textContent = 'Choisissez un jour pour afficher les créneaux.';
      return;
    }
    const dayDate = parseISODate(state.date);
    const opening = hours[dayDate.getDay()];
    if (!opening) {
      slotCount.textContent = 'Ce jour est indiqué fermé dans la maquette.';
      return;
    }
    const duration = services[state.service].minutes;
    const todayISO = toISODate(new Date());
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const groups = [
      { name: 'Matin', min: opening[0], max: 720 },
      { name: 'Après-midi', min: 720, max: 1020 },
      { name: 'Soir', min: 1020, max: opening[1] }
    ];
    let freeCount = 0;
    let slotIndex = 0;
    groups.forEach((group) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'slot-group';
      const legend = document.createElement('legend');
      legend.textContent = group.name;
      const options = document.createElement('div');
      options.className = 'slot-options';
      for (let minute = opening[0]; minute + duration <= opening[1]; minute += 30) {
        if (minute < group.min || minute >= group.max) continue;
        const hour = Math.floor(minute / 60);
        const mins = minute % 60;
        const timeText = `${pad(hour)}:${pad(mins)}`;
        const isPast = state.date === todayISO && minute <= nowMinutes;
        const isBooked = bookedForDate(state.date, slotIndex);
        const label = document.createElement('label');
        label.className = 'slot-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'booking-time';
        radio.value = timeText;
        radio.disabled = isPast || isBooked;
        radio.checked = state.time === timeText;
        const visual = document.createElement('span');
        const time = document.createElement('time');
        time.dateTime = `${state.date}T${timeText}`;
        time.textContent = timeText;
        visual.append(time);
        if (isBooked || isPast) {
          const marker = document.createElement('small');
          marker.textContent = isPast ? 'passé' : 'déjà pris';
          visual.append(marker);
        }
        radio.addEventListener('change', () => {
          state.time = timeText;
          nextButtons.forEach((button) => {
            if (Number(button.closest('[data-step]').dataset.step) === 2) button.disabled = false;
          });
          updateSummary();
        });
        label.append(radio, visual);
        options.append(label);
        if (!radio.disabled) freeCount += 1;
        slotIndex += 1;
      }
      if (options.childElementCount) {
        fieldset.append(legend, options);
        slotList.append(fieldset);
      }
    });
    slotCount.textContent = `${freeCount} créneau${freeCount > 1 ? 'x' : ''} proposé${freeCount > 1 ? 's' : ''} le ${formatDate(state.date)}.`;
    nextButtons.forEach((button) => {
      if (Number(button.closest('[data-step]').dataset.step) === 2) button.disabled = !state.time;
    });
  }

  serviceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const changed = state.service !== input.value;
      if (changed) {
        state.date = '';
        state.time = '';
      }
      state.service = input.value;
      if (changed) {
        renderDays();
        renderSlots();
      }
      updateSummary();
      nextButtons.forEach((button) => {
        const step = Number(button.closest('[data-step]').dataset.step);
        if (step === 0) button.disabled = !state.service;
        if (step === 1) button.disabled = !state.date;
        if (step === 2) button.disabled = !state.time;
      });
    });
  });

  root.querySelectorAll('[data-book]').forEach((button) => {
    button.addEventListener('click', () => {
      const service = button.dataset.book;
      const input = serviceInputs.find((radio) => radio.value === service);
      if (!input) return;
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      renderDays();
      renderSlots();
      setStep(0);
      document.querySelector('#rendez-vous').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  nextButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const current = Number(button.closest('[data-step]').dataset.step);
      if (current === 0 && state.service) setStep(1);
      if (current === 1 && state.date) {
        renderSlots();
        setStep(2);
      }
      if (current === 2 && state.time) setStep(3);
    });
  });

  root.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => setStep(Math.max(0, state.step - 1)));
  });
  root.querySelectorAll('[data-goto]').forEach((button) => {
    button.addEventListener('click', () => setStep(Number(button.dataset.goto)));
  });

  function setError(input, message, errorId) {
    input.setAttribute('aria-invalid', String(Boolean(message)));
    document.getElementById(errorId).textContent = message;
  }
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const phoneIsValid = (value) => /^(?:\+33|0)[67](?:[ .-]?\d{2}){4}$/.test(value.trim());
  nameInput.addEventListener('input', () => setError(nameInput, '', 'name-error'));
  phoneInput.addEventListener('input', () => setError(phoneInput, '', 'phone-error'));

  function parisWallTimeToUtc(isoDate, time) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const intended = Date.UTC(year, month - 1, day, hour, minute);
    let utcValue = intended;
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(utcValue)).map((part) => [part.type, part.value]));
      const parisAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      utcValue += intended - parisAsUtc;
    }
    return new Date(utcValue);
  }

  const icsEscape = (text) => String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function foldICalendarLine(line) {
    const encoder = new TextEncoder();
    const parts = [];
    let current = '';
    let limit = 75;
    for (const character of line) {
      if (encoder.encode(current + character).length > limit && current) {
        parts.push(current);
        current = ` ${character}`;
        limit = 75;
      } else {
        current += character;
      }
    }
    parts.push(current);
    return parts.join('\r\n');
  }

  function downloadCalendar() {
    const service = services[state.service];
    if (!service || !state.date || !state.time) return;
    const start = parisWallTimeToUtc(state.date, state.time);
    const end = new Date(start.getTime() + service.minutes * 60_000);
    const toIcsDate = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
    const now = toIcsDate(new Date());
    const uid = `${Date.now()}-${state.date}-${state.time.replace(':', '')}@studiolamy.preview`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu rendez-vous//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`, `DTSTART:${toIcsDate(start)}`, `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${icsEscape(`${service.name} — Le Salon et Vous`)}`,
      `LOCATION:${icsEscape('92 rue de Turenne, 75003 Paris')}`,
      `DESCRIPTION:${icsEscape('Créneau choisi dans une simulation Studio Lamy. Ce rendez-vous n’est pas confirmé. Appelez le salon au 01 42 61 35 34.')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const content = lines.map(foldICalendarLine).join('\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'demande-le-salon-et-vous.ics';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const cleanName = nameInput.value.trim();
    const cleanPhone = phoneInput.value.trim();
    const nameError = cleanName.length < 2 ? 'Saisissez votre prénom.' : '';
    const phoneError = phoneIsValid(cleanPhone) ? '' : 'Indiquez un numéro de mobile français valide.';
    setError(nameInput, nameError, 'name-error');
    setError(phoneInput, phoneError, 'phone-error');
    if (nameError || phoneError) {
      live.textContent = 'Vérifiez les champs signalés.';
      (nameError ? nameInput : phoneInput).focus();
      return;
    }
    state.name = cleanName;
    state.phone = cleanPhone;
    const service = services[state.service];
    const confirmation = root.querySelector('[data-confirmation]');
    confirmation.textContent = `${state.name}, vous avez choisi ${service.name.toLocaleLowerCase('fr-FR')} le ${formatDate(state.date)} à ${state.time} (${service.price}). Appelez le salon pour confirmer ce créneau.`;
    setStep(4);
  });
  root.querySelector('[data-calendar]').addEventListener('click', downloadCalendar);

  history.replaceState({ bookingStep: 0 }, '', window.location.pathname);
  window.addEventListener('popstate', (event) => {
    const index = Number.isInteger(event.state?.bookingStep) ? event.state.bookingStep : 0;
    if (index === 2) renderSlots();
    setStep(index, false);
  });

  updateSummary();
  renderDays();
  renderSlots();

  const todayLabel = document.querySelector('[data-today]');
  if (todayLabel) {
    const now = new Date();
    const todayHours = hours[now.getDay()];
    if (!todayHours) {
      todayLabel.textContent = 'Fermé';
    } else {
      const current = now.getHours() * 60 + now.getMinutes();
      const stateLabel = current >= todayHours[0] && current < todayHours[1] ? 'Ouvert' : 'Fermé';
      todayLabel.textContent = `${stateLabel} · 9 h 30 – 19 h`;
    }
  }

  const copyButton = document.querySelector('[data-copy-address]');
  const copyLive = document.querySelector('[data-copy-live]');
  if (copyButton && copyLive) {
    copyButton.addEventListener('click', async () => {
      const address = '92 rue de Turenne, 75003 Paris';
      try {
        await navigator.clipboard.writeText(address);
        copyLive.textContent = 'Adresse copiée.';
      } catch {
        const helper = document.createElement('textarea');
        helper.value = address;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        document.body.append(helper);
        helper.select();
        const copied = document.execCommand('copy');
        helper.remove();
        copyLive.textContent = copied ? 'Adresse copiée.' : 'Copie impossible. 92 rue de Turenne, 75003 Paris.';
      }
    });
  }

  const mobileBar = document.querySelector('[data-mobile-bar]');
  const heroActions = document.querySelector('[data-hero-actions]');
  const footerTop = document.querySelector('.footer__top');
  const bookingSection = document.querySelector('#rendez-vous');
  if (mobileBar && heroActions && footerTop && bookingSection && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let footerVisible = false;
    let bookingVisible = false;
    const updateBar = () => mobileBar.classList.toggle('is-visible', !heroVisible && !footerVisible && !bookingVisible);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroActions) heroVisible = entry.isIntersecting;
        if (entry.target === footerTop) footerVisible = entry.isIntersecting;
        if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.05 });
    observer.observe(heroActions);
    observer.observe(footerTop);
    observer.observe(bookingSection);
  }

  const mapPath = document.querySelector('.map-route');
  if (mapPath && 'IntersectionObserver' in window) {
    const mapObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        mapPath.classList.add('is-visible');
        mapObserver.disconnect();
      }
    }, { threshold: 0.4 });
    mapObserver.observe(mapPath);
  } else if (mapPath) {
    mapPath.classList.add('is-visible');
  }
})();
