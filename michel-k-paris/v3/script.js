(() => {
  'use strict';

  const doc = document;
  const html = doc.documentElement;
  html.classList.add('js');

  const hero = doc.querySelector('.hero');
  requestAnimationFrame(() => hero?.classList.add('is-arrived'));

  const menuButton = doc.querySelector('.menu-toggle');
  const menu = doc.querySelector('#navigation-principale');

  function setMenu(open, moveFocus = false) {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.classList.toggle('is-open', open);
    if (open && moveFocus) menu.querySelector('a')?.focus();
    if (!open && moveFocus) menuButton.focus();
  }

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true', true);
  });
  menu?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false, false);
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });
  window.matchMedia('(min-width: 760px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false, false);
  });

  const revealItems = [...doc.querySelectorAll('.reveal')];
  for (const group of ['.reveal--step', '.reveal--row']) {
    doc.querySelectorAll(group).forEach((item, index) => {
      item.style.setProperty('--delai', `${Math.min(index, 5) * 58}ms`);
    });
  }
  if ('IntersectionObserver' in window && revealItems.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const mobileBar = doc.querySelector('[data-barre-mobile]');
  const bookingSection = doc.querySelector('#rendez-vous');
  const footer = doc.querySelector('#pied-de-page');
  if (mobileBar && 'IntersectionObserver' in window) {
    const visibleEnds = new Set();
    const barObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleEnds.add(entry.target);
        else visibleEnds.delete(entry.target);
      }
      const hidden = visibleEnds.size > 0;
      mobileBar.classList.toggle('is-hidden', hidden);
      mobileBar.setAttribute('aria-hidden', String(hidden));
      mobileBar.querySelectorAll('a').forEach((link) => { link.tabIndex = hidden ? -1 : 0; });
    }, { threshold: 0.01 });
    if (bookingSection) barObserver.observe(bookingSection);
    if (footer) barObserver.observe(footer);
  }

  const form = doc.querySelector('#simulation-formulaire');
  if (!form) return;

  const panels = [...form.querySelectorAll('[data-panneau-etape]')];
  const progressItems = [...doc.querySelectorAll('[data-indice-etape]')];
  const liveStatus = doc.querySelector('[data-etat-parcours]');
  const summaryService = doc.querySelector('[data-resume-prestation]');
  const summaryDay = doc.querySelector('[data-resume-jour]');
  const summaryTime = doc.querySelector('[data-resume-heure]');
  const dayList = doc.querySelector('[data-liste-jours]');
  const timeList = doc.querySelector('[data-liste-heures]');
  const successPanel = doc.querySelector('[data-panneau-reussite]');
  const firstName = doc.querySelector('#prenom-visiteur');
  const phone = doc.querySelector('#telephone-visiteur');
  const nameError = doc.querySelector('#erreur-prenom');
  const phoneError = doc.querySelector('#erreur-telephone');
  let activeStep = 0;
  let transitioning = false;
  let selectedDate = null;
  let selectedTime = null;
  let demoDates = [];

  const frenchLongDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const frenchShortDay = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', timeZone: 'UTC'
  });
  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  }

  function makeParisToday() {
    const parts = parisParts();
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  }

  function dateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateLabel(date) {
    return frenchLongDate.format(date).replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR'));
  }

  function isOpenDay(date) {
    const weekday = date.getUTCDay();
    return weekday !== 0 && weekday !== 1;
  }

  function buildDates() {
    const today = makeParisToday();
    const now = parisParts();
    const todayKey = dateKey(today);
    demoDates = Array.from({ length: 12 }, (_, offset) => new Date(Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset
    )));

    dayList.replaceChildren();
    let defaultDate = null;
    for (const date of demoDates) {
      const open = isOpenDay(date);
      const key = dateKey(date);
      const isToday = key === todayKey;
      const futureStartExists = !isToday || (now.hour < 18 || (now.hour === 18 && now.minute < 30));
      if (open && futureStartExists && !defaultDate) defaultDate = key;

      const id = `jour-souhaite-${key}`;
      const label = doc.createElement('label');
      label.className = 'date-choice';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = key;
      input.id = id;
      input.disabled = !open;
      input.setAttribute('aria-label', `${dateLabel(date)}${open ? ', ouvert' : ', fermé'}`);
      const face = doc.createElement('span');
      const weekday = doc.createElement('span');
      weekday.className = 'date-choice__weekday';
      weekday.textContent = isToday ? 'Aujourd’hui' : frenchShortDay.format(date).replace('.', '');
      const day = doc.createElement('span');
      day.className = 'date-choice__day';
      day.textContent = String(date.getUTCDate());
      face.append(weekday, day);
      if (!open) {
        const closed = doc.createElement('span');
        closed.className = 'date-choice__weekday';
        closed.textContent = 'Fermé';
        face.append(closed);
      }
      label.append(input, face);
      dayList.append(label);
    }

    selectedDate = defaultDate;
    if (selectedDate) {
      const defaultInput = dayList.querySelector(`input[value="${selectedDate}"]`);
      if (defaultInput) defaultInput.checked = true;
    }
    buildTimes();
    updateSummary();
  }

  function buildTimes() {
    if (!timeList) return;
    timeList.replaceChildren();
    selectedTime = null;
    const chosen = demoDates.find((date) => dateKey(date) === selectedDate);
    if (!chosen || !isOpenDay(chosen)) {
      const note = doc.createElement('p');
      note.className = 'form-hint';
      note.textContent = 'Choisissez un jour ouvert pour afficher les heures souhaitées.';
      timeList.append(note);
      updateSummary();
      return;
    }

    const now = parisParts();
    const isToday = dateKey(chosen) === dateKey(makeParisToday());
    const currentMinutes = now.hour * 60 + now.minute;
    const closing = 19 * 60;
    let availableCount = 0;
    for (let minutes = 9 * 60 + 30; minutes < closing; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      const value = `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
      const disabled = isToday && minutes <= currentMinutes;
      const id = `heure-souhaitee-${value.replace(':', '-')}`;
      const label = doc.createElement('label');
      label.className = 'time-choice';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = value;
      input.id = id;
      input.disabled = disabled;
      const shown = `${hours} h ${String(remainder).padStart(2, '0')}`;
      input.setAttribute('aria-label', `${shown}, heure de début souhaitée${disabled ? ', heure passée' : ''}`);
      const face = doc.createElement('span');
      face.textContent = shown;
      label.append(input, face);
      timeList.append(label);
      if (!disabled) availableCount += 1;
    }

    if (availableCount === 0) {
      const note = doc.createElement('p');
      note.className = 'form-hint';
      note.textContent = 'Aucune heure future à afficher pour cette journée.';
      timeList.prepend(note);
    }
    updateSummary();
  }

  function updateSummary() {
    const service = form.querySelector('input[name="prestation"]:checked');
    if (summaryService) summaryService.textContent = service?.value || 'À choisir';
    const date = demoDates.find((candidate) => dateKey(candidate) === selectedDate);
    if (summaryDay) summaryDay.textContent = date ? dateLabel(date) : 'À choisir';
    if (summaryTime) {
      const time = selectedTime;
      summaryTime.textContent = time ? `${Number(time.slice(0, 2))} h ${time.slice(3)}` : 'À choisir';
    }
  }

  function announceStep(index) {
    progressItems.forEach((item, itemIndex) => {
      if (itemIndex === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    const labels = ['Choisissez une prestation.', 'Choisissez un jour souhaité.', 'Choisissez une heure souhaitée.', 'Saisissez vos coordonnées.'];
    if (liveStatus) liveStatus.textContent = `Étape ${index + 1} sur 4. ${labels[index]}`;
  }

  function moveToStep(nextIndex) {
    const next = Math.max(0, Math.min(3, nextIndex));
    if (next === activeStep || transitioning) return;
    transitioning = true;
    const oldPanel = panels[activeStep];
    const newPanel = panels[next];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 0 : 220;
    oldPanel.classList.add('is-leaving');
    window.setTimeout(() => {
      oldPanel.hidden = true;
      oldPanel.classList.remove('is-leaving', 'is-active');
      newPanel.hidden = false;
      newPanel.classList.add('is-entering');
      activeStep = next;
      announceStep(next);
      updateSummary();
      requestAnimationFrame(() => {
        newPanel.classList.remove('is-entering');
        newPanel.classList.add('is-active');
        newPanel.querySelector('h3')?.focus({ preventScroll: true });
        transitioning = false;
      });
    }, duration);
  }

  function setFieldError(input, messageNode, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    messageNode.textContent = message;
  }

  function normalizedMobile(value) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0033')) digits = `0${digits.slice(4)}`;
    else if (digits.startsWith('33')) digits = `0${digits.slice(2)}`;
    return /^0[67]\d{8}$/.test(digits);
  }

  function validateContact() {
    const nameValid = Boolean(firstName.value.trim());
    const phoneValid = normalizedMobile(phone.value);
    setFieldError(firstName, nameError, nameValid ? '' : 'Saisissez votre prénom.');
    setFieldError(phone, phoneError, phoneValid ? '' : 'Saisissez un numéro de mobile français valide.');
    if (!nameValid) {
      firstName.focus();
      return false;
    }
    if (!phoneValid) {
      phone.focus();
      return false;
    }
    return true;
  }

  function showSuccess() {
    panels.forEach((panel) => { panel.hidden = true; panel.classList.remove('is-active', 'is-entering', 'is-leaving'); });
    successPanel.hidden = false;
    if (liveStatus) liveStatus.textContent = 'Démonstration terminée. Aucune demande n’a été envoyée.';
    successPanel.querySelector('h3')?.focus({ preventScroll: true });
  }

  function restartDemo() {
    transitioning = false;
    form.reset();
    panels.forEach((panel) => { panel.hidden = true; panel.classList.remove('is-active', 'is-entering', 'is-leaving'); });
    activeStep = 0;
    panels[0].hidden = false;
    panels[0].classList.add('is-active');
    successPanel.hidden = true;
    firstName.value = '';
    phone.value = '';
    setFieldError(firstName, nameError, '');
    setFieldError(phone, phoneError, '');
    buildDates();
    announceStep(0);
    panels[0].querySelector('h3')?.focus({ preventScroll: true });
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') updateSummary();
    if (input.name === 'jour') {
      selectedDate = input.value;
      buildTimes();
      updateSummary();
    }
    if (input.name === 'heure') {
      selectedTime = input.value;
      updateSummary();
    }
  });

  form.addEventListener('click', (event) => {
    const nextButton = event.target.closest('[data-suite]');
    const backButton = event.target.closest('[data-retour]');
    if (nextButton) {
      if (activeStep === 1 && !selectedDate) {
        if (liveStatus) liveStatus.textContent = 'Choisissez un jour ouvert pour continuer.';
        dayList.querySelector('input:not(:disabled)')?.focus();
        return;
      }
      if (activeStep === 2 && !selectedTime) {
        if (liveStatus) liveStatus.textContent = 'Choisissez une heure souhaitée pour continuer.';
        timeList.querySelector('input:not(:disabled)')?.focus();
        return;
      }
      moveToStep(activeStep + 1);
    }
    if (backButton) moveToStep(activeStep - 1);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activeStep !== 3 || !validateContact()) return;
    showSuccess();
  });

  [firstName, phone].forEach((input) => {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      if (input === firstName) nameError.textContent = '';
      else phoneError.textContent = '';
    });
  });

  doc.querySelector('[data-recommencer]')?.addEventListener('click', restartDemo);
  doc.querySelectorAll('[data-choix-prestation]').forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('data-choix-prestation');
      const matching = [...form.querySelectorAll('input[name="prestation"]')].find((input) => input.value === target);
      if (matching) matching.checked = true;
      updateSummary();
    });
  });

  buildDates();
  announceStep(0);
})();
