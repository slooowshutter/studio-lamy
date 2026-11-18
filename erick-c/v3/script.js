window.__site = 1;
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const one = (selector, context = doc) => context.querySelector(selector);
  const many = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const NB = '\u00a0';
  const hoursByDay = {
    0: null,
    1: null,
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 18 * 60]
  };
  const sampleTimes = {
    2: [9 * 60, 11 * 60, 14 * 60, 16 * 60 + 30, 18 * 60],
    3: [9 * 60, 11 * 60, 14 * 60, 16 * 60 + 30, 18 * 60],
    4: [9 * 60, 11 * 60, 14 * 60, 16 * 60 + 30, 18 * 60],
    5: [9 * 60, 11 * 60, 14 * 60, 16 * 60 + 30, 18 * 60],
    6: [9 * 60, 11 * 60, 13 * 60 + 30, 15 * 60 + 30, 17 * 60]
  };
  const frenchLongDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const frenchShortWeek = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const frenchShortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const parisDateParts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parisTimeParts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function localDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function parisToday() {
    const parts = Object.fromEntries(parisDateParts.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12);
  }

  function parisMinutesNow() {
    const parts = Object.fromEntries(parisTimeParts.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return (Number(parts.hour) % 24) * 60 + Number(parts.minute);
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}${NB}h${NB}${String(minute).padStart(2, '0')}` : `${hour}${NB}h`;
  }

  function cleanFormat(value) {
    return value.replace(/[.]/g, '').toLocaleLowerCase('fr-FR');
  }

  const form = one('#booking-form');
  const panels = many('[data-panel]');
  const stepButtons = many('[data-step-link]');
  const announcement = doc.createElement('p');
  announcement.className = 'sr-only';
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.id = 'annonce-reservation';
  one('.booking-main').prepend(announcement);

  const selected = { service: '', date: null, time: null, firstName: '', phone: '' };
  const complete = new Set();
  let activePanel = 0;
  let transitionNumber = 0;

  const inputName = one('#prenom');
  const inputPhone = one('#telephone');
  const bookingSuccess = one('#booking-success');

  function setFieldError(field, message, errorId) {
    const error = errorId ? one(`#${errorId}`) : one(`[data-error="${field}"]`);
    if (error) error.textContent = message;
    if (field === 'prenom' && inputName) inputName.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (field === 'telephone' && inputPhone) inputPhone.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function selectedService() {
    const choice = one('input[name="prestation"]:checked');
    return choice ? choice.value : '';
  }

  function formatSelectedDate() {
    return selected.date ? cleanFormat(frenchLongDate.format(selected.date)) : '';
  }

  function updateSummary() {
    selected.service = selectedService();
    one('#resume-prestation').textContent = selected.service || 'À choisir';
    one('#resume-jour').textContent = formatSelectedDate() || 'À choisir';
    one('#resume-heure').textContent = selected.time === null ? 'À choisir' : formatTime(selected.time);
    const recap = one('#booking-recap');
    if (recap) {
      const parts = [];
      if (selected.service) parts.push(selected.service);
      if (selected.date) parts.push(formatSelectedDate());
      if (selected.time !== null) parts.push(formatTime(selected.time));
      recap.textContent = parts.length ? `Récapitulatif de la simulation : ${parts.join(' · ')}.` : '';
    }
  }

  function updateStepNavigation() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > activePanel && !complete.has(index - 1);
      if (index === activePanel) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function animatePanel(panel, direction, initiatedByPointer) {
    if (reduceMotion.matches) return;
    if (!initiatedByPointer) return;
    const from = direction > 0 ? 'translateX(9px)' : 'translateX(-9px)';
    panel.animate(
      [{ opacity: 0, transform: from }, { opacity: 1, transform: 'translateX(0)' }],
      { duration: 205, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }

  async function showPanel(index, options = {}) {
    if (index < 0 || index >= panels.length) return;
    const direction = index >= activePanel ? 1 : -1;
    const wasSuccessVisible = !bookingSuccess.hidden;
    const previousIndex = activePanel;
    const previous = panels[previousIndex];
    const next = panels[index];
    const token = ++transitionNumber;
    const initiatedByPointer = options.initiatedByPointer === true;
    if (wasSuccessVisible) bookingSuccess.hidden = true;
    if (previous && previous !== next && !previous.hidden && initiatedByPointer && !reduceMotion.matches) {
      const exitAnimation = previous.animate(
        [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: direction > 0 ? 'translateX(-7px)' : 'translateX(7px)' }],
        { duration: 75, easing: 'ease-out', fill: 'forwards' }
      );
      try { await exitAnimation.finished; } catch (_) { /* Une étape plus récente a interrompu la transition. */ }
      if (token !== transitionNumber) {
        exitAnimation.cancel();
        return;
      }
      exitAnimation.cancel();
    }
    panels.forEach((panel) => { panel.hidden = panel !== next; });
    activePanel = index;
    updateStepNavigation();
    updateSummary();
    const heading = one('h3', next);
    heading.focus({ preventScroll: true });
    announcement.textContent = `Étape ${index + 1} sur 4 : ${heading.textContent}`;
    animatePanel(next, direction, initiatedByPointer);
  }

  function stepIsComplete(index) {
    if (index === 0) return Boolean(selectedService());
    if (index === 1) return Boolean(selected.date);
    if (index === 2) return selected.time !== null;
    return false;
  }

  function markCurrentComplete() {
    const key = ['prestation', 'jour', 'heure'][activePanel];
    if (!stepIsComplete(activePanel)) {
      const timeAvailable = activePanel === 2 && Boolean(one('.time-choice:not(:disabled)', panels[activePanel]));
      const message = activePanel === 0
        ? 'Choisissez une prestation ou une autre demande pour continuer.'
        : activePanel === 1
          ? 'Choisissez un jour ouvert pour continuer.'
          : timeAvailable
            ? 'Choisissez une heure d’exemple pour continuer.'
            : 'Aucun créneau d’exemple n’est disponible pour cette date. Revenez au choix du jour.';
      setFieldError(key, message);
      const firstControl = activePanel === 0
        ? one('input[name="prestation"]')
        : activePanel === 2
          ? one('.time-choice:not(:disabled)', panels[activePanel]) || one('[data-back]', panels[activePanel])
          : one('.date-choice:not(:disabled)', panels[activePanel]);
      if (firstControl) firstControl.focus({ preventScroll: true });
      return false;
    }
    setFieldError(key, '');
    complete.add(activePanel);
    return true;
  }

  function renderDates() {
    const host = one('#date-options');
    host.replaceChildren();
    const firstDay = parisToday();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + offset, 12);
      const dayIndex = date.getDay();
      const closed = hoursByDay[dayIndex] === null;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'date-choice';
      button.disabled = closed;
      button.dataset.date = dateKey(date);
      button.setAttribute('aria-pressed', String(Boolean(selected.date && dateKey(selected.date) === dateKey(date))));
      const weekday = doc.createElement('strong');
      weekday.textContent = cleanFormat(frenchShortWeek.format(date));
      const dayNumber = doc.createElement('span');
      dayNumber.textContent = String(date.getDate());
      const month = doc.createElement('small');
      month.textContent = closed ? 'Fermé' : cleanFormat(frenchShortMonth.format(date));
      button.append(weekday, dayNumber, month);
      const longName = cleanFormat(frenchLongDate.format(date));
      button.setAttribute('aria-label', closed ? `${longName}, fermé` : longName);
      host.append(button);
    }
  }

  function parseDate(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function renderTimes() {
    const host = one('#time-options');
    host.replaceChildren();
    if (!selected.date) return;
    const dayIndex = selected.date.getDay();
    const range = hoursByDay[dayIndex];
    const sameAsToday = dateKey(selected.date) === dateKey(parisToday());
    const nowMinutes = parisMinutesNow();
    const times = (sampleTimes[dayIndex] || []).filter((minutes) => {
      if (!range || minutes < range[0] || minutes >= range[1]) return false;
      return true;
    });
    if (!times.length) {
      const note = doc.createElement('p');
      note.className = 'panel-note';
      note.textContent = 'Aucun créneau d’exemple ne reste aujourd’hui. Choisissez un autre jour.';
      host.append(note);
      return;
    }
    times.forEach((minutes) => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'time-choice';
      button.dataset.minutes = String(minutes);
      const isPast = sameAsToday && minutes <= nowMinutes;
      button.disabled = isPast;
      button.setAttribute('aria-pressed', String(!isPast && selected.time === minutes));
      button.setAttribute('aria-label', isPast ? `${formatTime(minutes)}, passé` : formatTime(minutes));
      const label = doc.createElement('span');
      label.textContent = formatTime(minutes);
      button.append(label);
      if (isPast) {
        const pastLabel = doc.createElement('small');
        pastLabel.textContent = 'Passé';
        button.append(pastLabel);
      }
      host.append(button);
    });
    if (sameAsToday && times.every((minutes) => minutes <= nowMinutes)) {
      const note = doc.createElement('p');
      note.className = 'panel-note';
      note.textContent = 'Aucun créneau d’exemple ne reste aujourd’hui. Choisissez un autre jour.';
      host.append(note);
    }
  }

  function updateDateButtons() {
    many('.date-choice').forEach((button) => {
      button.setAttribute('aria-pressed', String(Boolean(selected.date && button.dataset.date === dateKey(selected.date))));
    });
  }

  function updateTimeButtons() {
    many('.time-choice').forEach((button) => {
      button.setAttribute('aria-pressed', String(!button.disabled && Number(button.dataset.minutes) === selected.time));
    });
  }

  function validFrenchMobile(value) {
    const compact = value.replace(/[ .-]/g, '');
    return /^(?:\+33|0033|0)[67]\d{8}$/.test(compact);
  }

  function validateContact() {
    const firstName = inputName.value.trim();
    const phone = inputPhone.value.trim();
    const nameOkay = firstName.length >= 2;
    const phoneOkay = validFrenchMobile(phone);
    setFieldError('prenom', nameOkay ? '' : 'Saisissez un prénom de deux lettres au minimum.', 'erreur-prenom');
    setFieldError('telephone', phoneOkay ? '' : 'Saisissez un numéro de portable français valide.', 'erreur-telephone');
    if (!nameOkay) {
      inputName.focus({ preventScroll: true });
      return false;
    }
    if (!phoneOkay) {
      inputPhone.focus({ preventScroll: true });
      return false;
    }
    selected.firstName = firstName;
    selected.phone = phone;
    return true;
  }

  inputName.addEventListener('input', () => {
    if (inputName.getAttribute('aria-invalid') === 'true' && inputName.value.trim().length >= 2) {
      setFieldError('prenom', '', 'erreur-prenom');
    }
  });
  inputPhone.addEventListener('input', () => {
    if (inputPhone.getAttribute('aria-invalid') === 'true' && validFrenchMobile(inputPhone.value.trim())) {
      setFieldError('telephone', '', 'erreur-telephone');
    }
  });

  function finishSimulation(initiatedByPointer) {
    panels.forEach((panel) => { panel.hidden = true; });
    bookingSuccess.hidden = false;
    one('#success-summary').textContent = `${selected.firstName}, votre demande simulée concerne ${selected.service.toLocaleLowerCase('fr-FR')}, le ${formatSelectedDate()} à ${formatTime(selected.time)}.`;
    updateSummary();
    one('#titre-confirmation').focus({ preventScroll: true });
    announcement.textContent = 'Simulation terminée. Aucune demande n’a été envoyée.';
    if (initiatedByPointer && !reduceMotion.matches) {
      bookingSuccess.animate(
        [{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
  }

  many('input[name="prestation"]').forEach((input) => {
    input.addEventListener('change', () => {
      selected.service = input.value;
      complete.add(0);
      setFieldError('prestation', '');
      updateSummary();
      updateStepNavigation();
    });
  });

  one('#date-options').addEventListener('click', (event) => {
    const button = event.target.closest('.date-choice');
    if (!button || button.disabled) return;
    selected.date = parseDate(button.dataset.date);
    selected.time = null;
    complete.delete(2);
    setFieldError('jour', '');
    updateDateButtons();
    renderTimes();
    updateSummary();
    updateStepNavigation();
  });

  one('#time-options').addEventListener('click', (event) => {
    const button = event.target.closest('.time-choice');
    if (!button) return;
    selected.time = Number(button.dataset.minutes);
    complete.add(2);
    setFieldError('heure', '');
    updateTimeButtons();
    updateSummary();
    updateStepNavigation();
  });

  one('.booking-main').addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-next]');
    if (nextButton) {
      if (!markCurrentComplete()) return;
      const nextIndex = activePanel + 1;
      if (activePanel === 1) renderTimes();
      showPanel(nextIndex, { initiatedByPointer: event.detail > 0 });
      return;
    }
    const backButton = event.target.closest('[data-back]');
    if (backButton) showPanel(Math.max(0, activePanel - 1), { initiatedByPointer: event.detail > 0 });
    const stepButton = event.target.closest('[data-step-link]');
    if (stepButton && !stepButton.disabled) showPanel(Number(stepButton.dataset.stepLink), { initiatedByPointer: event.detail > 0 });
  });

  let confirmByPointer = false;
  one('button[type="submit"]', form).addEventListener('click', (event) => {
    confirmByPointer = event.detail > 0;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activePanel !== 3 || !validateContact()) {
      confirmByPointer = false;
      return;
    }
    finishSimulation(confirmByPointer);
    confirmByPointer = false;
  });

  one('#restart-booking').addEventListener('click', (event) => {
    form.reset();
    selected.service = '';
    selected.date = null;
    selected.time = null;
    selected.firstName = '';
    selected.phone = '';
    complete.clear();
    setFieldError('prestation', '');
    setFieldError('jour', '');
    setFieldError('heure', '');
    setFieldError('prenom', '', 'erreur-prenom');
    setFieldError('telephone', '', 'erreur-telephone');
    one('#booking-recap').textContent = '';
    renderDates();
    updateSummary();
    showPanel(0, { initiatedByPointer: event.detail > 0 });
  });

  many('[data-prestation]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const value = link.dataset.prestation;
      const choice = many('input[name="prestation"]').find((input) => input.value === value);
      if (choice) {
        choice.checked = true;
        choice.dispatchEvent(new Event('change', { bubbles: true }));
      }
      showPanel(0, { initiatedByPointer: event.detail > 0 });
      one('#rendez-vous').scrollIntoView({ behavior: event.detail > 0 && !reduceMotion.matches ? 'smooth' : 'auto', block: 'start' });
    });
  });

  const menuButton = one('.menu-toggle');
  const menu = one('#menu-mobile');
  function closeMenu(returnFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    if (opening) one('a', menu).focus();
  });
  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    closeMenu();
    const destination = link.hash;
    window.setTimeout(() => {
      const target = one(destination);
      if (!target) return;
      const removeTemporaryTabIndex = !target.hasAttribute('tabindex');
      if (removeTemporaryTabIndex) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (removeTemporaryTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }, 0);
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) closeMenu(true);
  });

  function setUpReveals() {
    const targets = many('[data-reveal]');
    many('[data-reveal="service"]').forEach((item, index) => {
      item.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 55}ms`);
    });
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-revealed'));
      return;
    }
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
    targets.forEach((target) => revealObserver.observe(target));
  }

  function setUpMobileBar() {
    const bar = one('#mobile-action-bar');
    if (!bar || !('IntersectionObserver' in window)) return;
    const covered = new Set();
    const relevant = [one('#rendez-vous'), one('.site-footer')];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) covered.add(entry.target);
        else covered.delete(entry.target);
      });
      bar.hidden = covered.size > 0;
    }, { threshold: 0.08 });
    relevant.forEach((target) => observer.observe(target));
  }

  function startHeroEntrance() {
    const hero = one('.hero');
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  }

  renderDates();
  updateSummary();
  updateStepNavigation();
  setUpReveals();
  setUpMobileBar();
  startHeroEntrance();
})();
