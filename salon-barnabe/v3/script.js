(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');

  const hours = {
    0: null,
    1: [540, 1140],
    2: [540, 1140],
    3: null,
    4: [540, 1140],
    5: [540, 1140],
    6: [540, 1020]
  };
  const services = {
    diagnostic: { name: 'Diagnostic technique couleur', minutes: 15 },
    balayage: { name: 'Balayage · cheveux courts', minutes: 165 },
    'coupe-femme': { name: 'Shampoing, coupe et coiffage · cheveux courts', minutes: 45 },
    'coupe-homme': { name: 'Coupe homme classique + soin mentholé', minutes: 30 },
    brushing: { name: 'Shampoing et brushing · cheveux courts', minutes: 30 },
    'coupe-barbe': { name: 'Coupe et barbe au rasoir traditionnel', minutes: 60 }
  };
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const numberFormat = new Intl.NumberFormat('fr-FR');
  const dateParts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fullDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const shortDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', timeZone: 'UTC'
  });
  const state = { service: null, date: null, dayKey: '', time: null, firstName: '', phone: '' };
  const by = (selector, parent = doc) => parent.querySelector(selector);
  const all = (selector, parent = doc) => Array.from(parent.querySelectorAll(selector));
  const nbsp = '\u00a0';

  function getParisNow() {
    const parts = {};
    for (const part of dateParts.formatToParts(new Date())) parts[part.type] = part.value;
    const hour = Number(parts.hour) % 24;
    const minute = Number(parts.minute);
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      minuteOfDay: hour * 60 + minute
    };
  }

  function dateKey(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }

  function titleCase(value) {
    return value ? value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1) : '';
  }

  function formatLongDate(date) {
    return titleCase(fullDate.format(date));
  }

  function formatClock(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour}${nbsp}h${nbsp}${String(minute).padStart(2, '0')}`;
  }

  function formatDuration(minutes) {
    if (minutes < 60) return `${numberFormat.format(minutes)}${nbsp}min`;
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}${nbsp}h${nbsp}${String(minute).padStart(2, '0')}` : `${hour}${nbsp}h`;
  }

  function announce(message) {
    const live = by('[data-live-message]');
    if (live) live.textContent = message;
  }

  function updateSummary() {
    const serviceName = state.service ? state.service.name : 'À choisir';
    by('[data-summary-service]').textContent = serviceName;
    by('[data-summary-day]').textContent = state.date ? formatLongDate(state.date) : 'À choisir';
    by('[data-summary-time]').textContent = state.time === null ? 'À choisir' : formatClock(state.time);
    by('[data-summary-duration]').textContent = state.service ? formatDuration(state.service.minutes) : '—';
  }

  function setActiveStep(stepNumber) {
    const nextPanel = by(`[data-booking-step="${stepNumber}"]`);
    const oldPanel = all('[data-booking-step]').find((panel) => !panel.hidden);
    if (!nextPanel) return;

    if (oldPanel && oldPanel !== nextPanel) oldPanel.hidden = true;
    by('[data-booking-success]').hidden = true;
    nextPanel.hidden = false;
    nextPanel.classList.remove('is-entering');
    if (!reducedMotion.matches) {
      nextPanel.classList.add('is-entering');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => nextPanel.classList.remove('is-entering')));
    }

    all('[data-progress-step]').forEach((item) => {
      const itemStep = Number(item.dataset.progressStep);
      item.classList.toggle('is-current', itemStep === stepNumber);
      item.classList.toggle('is-complete', itemStep < stepNumber);
    });
    by('[data-step-count]').textContent = `Étape ${stepNumber} sur 4`;
    const heading = by('h3', nextPanel);
    if (heading) heading.focus({ preventScroll: true });
    announce(`Étape ${stepNumber} sur 4 : ${heading ? heading.textContent.replace(/[?!.]+$/, '') : ''}.`);
  }

  function clearDateAndTime() {
    state.date = null;
    state.dayKey = '';
    state.time = null;
    by('[data-next-step="3"]').disabled = true;
    by('[data-next-step="4"]').disabled = true;
    updateSummary();
  }

  function chooseService(key, fromMenu = false) {
    if (!services[key]) return;
    state.service = services[key];
    clearDateAndTime();
    const radio = by(`input[name="prestation"][value="${key}"]`);
    if (radio) radio.checked = true;
    by('[data-next-step="2"]').disabled = false;
    updateSummary();
    announce(`${state.service.name} sélectionnée, durée ${formatDuration(state.service.minutes)}.`);
    if (fromMenu) {
      by('#reservation').scrollIntoView({ block: 'start' });
      setActiveStep(2);
      renderDays();
    }
  }

  function renderDays() {
    const list = by('[data-day-list]');
    const now = getParisNow();
    const today = new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
    list.replaceChildren();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today.getTime() + offset * 86400000);
      const weekday = date.getUTCDay();
      const hoursForDay = hours[weekday];
      const weekdayLabel = shortDate.format(date).replace('.', '');
      const day = String(date.getUTCDate());
      const closed = !hoursForDay;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `day-button${closed ? ' is-closed' : ''}`;
      button.dataset.date = dateKey(date);
      button.dataset.weekday = String(weekday);
      button.disabled = closed;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', closed
        ? `${formatLongDate(date)} : fermé selon les horaires publiés`
        : `${formatLongDate(date)} : choisir ce jour`);

      const dayName = doc.createElement('span');
      dayName.textContent = titleCase(weekdayLabel);
      const dayNumber = doc.createElement('strong');
      dayNumber.textContent = day;
      const stateLabel = doc.createElement('small');
      stateLabel.textContent = closed ? 'fermé' : (offset === 0 ? 'aujourd’hui' : 'ouvert');
      button.append(dayName, dayNumber, stateLabel);

      if (!closed) {
        button.addEventListener('click', () => {
          state.date = date;
          state.dayKey = dateKey(date);
          state.time = null;
          all('.day-button', list).forEach((dayButton) => dayButton.setAttribute('aria-pressed', String(dayButton === button)));
          by('[data-next-step="3"]').disabled = false;
          by('[data-next-step="4"]').disabled = true;
          updateSummary();
          renderSlots();
          announce(`${formatLongDate(date)} sélectionné.`);
        });
      }
      list.append(button);
    }
  }

  function isToday(date) {
    const today = getParisNow();
    return date.getUTCFullYear() === today.year && date.getUTCMonth() + 1 === today.month && date.getUTCDate() === today.day;
  }

  function renderSlots() {
    const list = by('[data-slot-list]');
    const note = by('[data-slot-note]');
    list.replaceChildren();
    if (!state.date || !state.service) return;

    const weekday = state.date.getUTCDay();
    const hoursForDay = hours[weekday];
    if (!hoursForDay) return;
    const [opening, closing] = hoursForDay;
    const lastStart = closing - state.service.minutes;
    const now = getParisNow();
    note.textContent = `${formatLongDate(state.date)} · créneaux calculés dans les horaires publiés selon la durée sélectionnée. Disponibilités fictives.`;

    for (let minute = opening; minute <= lastStart; minute += 30) {
      const index = Math.floor(minute / 30);
      const unavailable = (index + state.date.getUTCDate() + weekday) % 7 === 0;
      const past = isToday(state.date) && minute <= now.minuteOfDay;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `slot-button${unavailable ? ' is-unavailable' : ''}`;
      button.setAttribute('aria-pressed', 'false');
      button.disabled = unavailable || past;
      button.setAttribute('aria-label', `${formatClock(minute)} : ${past ? 'heure déjà passée' : unavailable ? 'créneau indisponible dans cette démonstration' : 'choisir cette heure'}`);
      const timeLabel = doc.createElement('span');
      timeLabel.textContent = formatClock(minute);
      const stateLabel = doc.createElement('small');
      stateLabel.textContent = past ? 'passé' : unavailable ? 'indisponible' : 'choisir';
      button.append(timeLabel, stateLabel);

      if (!button.disabled) {
        button.addEventListener('click', () => {
          state.time = minute;
          all('.slot-button', list).forEach((slot) => slot.setAttribute('aria-pressed', String(slot === button)));
          by('[data-next-step="4"]').disabled = false;
          updateSummary();
          updateFormRecap();
          announce(`${formatClock(minute)} sélectionnée le ${formatLongDate(state.date)}.`);
        });
      }
      list.append(button);
    }
  }

  function updateFormRecap() {
    if (!state.service || !state.date || state.time === null) return;
    by('[data-form-recap]').textContent = `${state.service.name} · ${formatLongDate(state.date)} à ${formatClock(state.time)}. Cette sélection est une démonstration.`;
  }

  function validatePhone(value) {
    const compact = value.trim().replace(/[\s.-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(compact);
  }

  function setFieldError(input, error, invalid) {
    input.setAttribute('aria-invalid', String(invalid));
    error.hidden = !invalid;
  }

  function showSuccess() {
    const activePanel = all('[data-booking-step]').find((panel) => !panel.hidden);
    if (activePanel) activePanel.hidden = true;
    const success = by('[data-booking-success]');
    success.hidden = false;
    all('[data-progress-step]').forEach((item) => item.classList.add('is-complete'));
    by('[data-step-count]').textContent = 'Démonstration terminée';
    by('[data-success-recap]').textContent = `${state.firstName}, simulation pour ${state.service.name}, le ${formatLongDate(state.date)} à ${formatClock(state.time)}.`;
    by('#titre-succes').focus({ preventScroll: true });
    announce('Simulation terminée. Rien n’a été envoyé et aucun rendez-vous n’est réservé.');
  }

  function icsEscape(value) {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function parisOffsetMinutes(year, month, day, hour, minute) {
    const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
    const parts = {};
    for (const part of new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(localAsUtc))) parts[part.type] = part.value;
    const parisAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute));
    return (parisAsUtc - localAsUtc) / 60000;
  }

  function downloadCalendar() {
    if (!state.date || state.time === null || !state.service) return;
    const year = state.date.getUTCFullYear();
    const month = state.date.getUTCMonth() + 1;
    const day = state.date.getUTCDate();
    const hour = Math.floor(state.time / 60);
    const minute = state.time % 60;
    const offset = parisOffsetMinutes(year, month, day, hour, minute);
    const start = Date.UTC(year, month - 1, day, hour, minute) - offset * 60000;
    const end = start + state.service.minutes * 60000;
    const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const now = stamp(Date.now());
    const event = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Apercu Salon Barnabe//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-simulation-salon-barnabe@studiolamy`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${icsEscape('Simulation · Salon Barnabé')}`,
      `DESCRIPTION:${icsEscape('Créneau fictif. Cette simulation n’a rien envoyé et ne vaut pas réservation réelle.')}`,
      'LOCATION:72 rue Amiral Troude, 29200 Brest',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([event], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = 'simulation-salon-barnabe.ics';
    link.click();
    URL.revokeObjectURL(url);
    announce('Fichier de calendrier de démonstration téléchargé. Le rendez-vous n’est pas réservé.');
  }

  function resetBooking() {
    state.service = null;
    state.date = null;
    state.dayKey = '';
    state.time = null;
    state.firstName = '';
    state.phone = '';
    all('input[name="prestation"]').forEach((radio) => { radio.checked = false; });
    by('[data-first-name]').value = '';
    by('[data-mobile-phone]').value = '';
    by('[data-first-name]').removeAttribute('aria-invalid');
    by('[data-mobile-phone]').removeAttribute('aria-invalid');
    by('#erreur-prenom').hidden = true;
    by('#erreur-telephone').hidden = true;
    by('[data-next-step="2"]').disabled = true;
    by('[data-next-step="3"]').disabled = true;
    by('[data-next-step="4"]').disabled = true;
    by('[data-form-response]').textContent = '';
    updateSummary();
    renderDays();
    by('[data-step-count]').textContent = 'Étape 1 sur 4';
    all('[data-progress-step]').forEach((item, index) => {
      item.classList.toggle('is-current', index === 0);
      item.classList.remove('is-complete');
    });
    by('[data-booking-success]').hidden = true;
    all('[data-booking-step]').forEach((panel, index) => { panel.hidden = index !== 0; });
    by('#titre-etape-1').focus({ preventScroll: true });
    announce('Démonstration réinitialisée. Choisissez une prestation.');
  }

  // Révélations ponctuelles, différentes selon les éléments de contenu.
  const revealItems = all('.reveal');
  all('.service-row').forEach((row, index) => row.style.setProperty('--reveal-delay', `${index * 55}ms`));
  all('.step-item').forEach((item, index) => item.style.setProperty('--reveal-delay', `${index * 70}ms`));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  // Repère de navigation coulissant entre les rubriques visibles.
  const nav = by('#navigation-panneau');
  const navLinks = all('[data-nav-link]', nav);
  const marker = by('.active-marker', nav);
  function moveMarker(link) {
    if (!link || !marker) return;
    navLinks.forEach((item) => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'location');
    if (window.matchMedia('(max-width: 899px)').matches) {
      const scale = nav.scrollWidth ? link.offsetWidth / nav.scrollWidth : 1;
      marker.style.setProperty('--marker-x', `${link.offsetLeft}px`);
      marker.style.setProperty('--marker-scale', String(scale));
    } else {
      marker.style.transform = `translateY(${link.offsetTop}px)`;
    }
  }
  navLinks.forEach((link) => link.addEventListener('click', () => moveMarker(link)));
  if ('IntersectionObserver' in window) {
    const sections = all('[data-section]');
    const activeObserver = new IntersectionObserver((entries) => {
      const candidates = entries.filter((entry) => entry.isIntersecting);
      if (!candidates.length) return;
      candidates.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const link = navLinks.find((item) => item.hash === `#${candidates[0].target.id}`);
      if (link) moveMarker(link);
    }, { threshold: [0.15, 0.35, 0.6], rootMargin: '-20% 0px -54% 0px' });
    sections.forEach((section) => activeObserver.observe(section));
  }
  if (navLinks.length) moveMarker(navLinks[0]);
  window.addEventListener('resize', () => {
    const active = navLinks.find((item) => item.getAttribute('aria-current') === 'location');
    moveMarker(active);
  }, { passive: true });

  // Préselection depuis la carte de prestations.
  all('[data-select-service]').forEach((button) => button.addEventListener('click', () => chooseService(button.dataset.selectService, true)));
  all('input[name="prestation"]').forEach((radio) => radio.addEventListener('change', () => chooseService(radio.value)));
  all('[data-next-step]').forEach((button) => button.addEventListener('click', () => {
    const next = Number(button.dataset.nextStep);
    if (next === 2 && !state.service) return;
    if (next === 3 && (!state.service || !state.date)) return;
    if (next === 4 && (!state.service || !state.date || state.time === null)) return;
    if (next === 2) renderDays();
    if (next === 3) renderSlots();
    if (next === 4) updateFormRecap();
    setActiveStep(next);
  }));
  all('[data-previous-step]').forEach((button) => button.addEventListener('click', () => setActiveStep(Number(button.dataset.previousStep))));

  const firstNameInput = by('[data-first-name]');
  const phoneInput = by('[data-mobile-phone]');
  firstNameInput.addEventListener('input', () => setFieldError(firstNameInput, by('#erreur-prenom'), false));
  phoneInput.addEventListener('input', () => setFieldError(phoneInput, by('#erreur-telephone'), false));
  by('[data-booking-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const nameValid = firstNameInput.value.trim().length > 0;
    const phoneValid = validatePhone(phoneInput.value);
    setFieldError(firstNameInput, by('#erreur-prenom'), !nameValid);
    setFieldError(phoneInput, by('#erreur-telephone'), !phoneValid);
    if (!nameValid || !phoneValid) {
      by('[data-form-response]').textContent = 'Vérifiez les champs signalés.';
      (nameValid ? phoneInput : firstNameInput).focus();
      return;
    }
    state.firstName = firstNameInput.value.trim();
    state.phone = phoneInput.value.trim();
    by('[data-form-response]').textContent = '';
    showSuccess();
  });
  by('[data-download-calendar]').addEventListener('click', downloadCalendar);
  by('[data-restart]').addEventListener('click', resetBooking);

  renderDays();
  updateSummary();

  // La barre mobile s’efface pendant la réservation et dans le pied de page.
  const actionBar = by('.mobile-action-bar');
  if ('IntersectionObserver' in window && actionBar) {
    const coveredSections = new Set();
    const actionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) coveredSections.add(entry.target);
        else coveredSections.delete(entry.target);
      });
      actionBar.classList.toggle('is-hidden', coveredSections.size > 0);
    }, { threshold: 0.01, rootMargin: '-12% 0px -18% 0px' });
    actionObserver.observe(by('#reservation'));
    actionObserver.observe(by('.site-footer'));
  }

  window.requestAnimationFrame(() => window.requestAnimationFrame(() => doc.body.classList.add('is-ready')));
})();
