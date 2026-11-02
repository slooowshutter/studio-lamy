(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');
  const introItems = [...document.querySelectorAll('[data-intro]')];
  introItems.forEach((item, index) => item.style.setProperty('--intro-delay', `${index * 75}ms`));
  requestAnimationFrame(() => hero?.classList.add('is-intro-ready'));

  const revealItems = [...document.querySelectorAll('[data-reveal], [data-draw]')];
  revealItems.forEach((item) => item.style.setProperty('--reveal-delay', '0ms'));
  document.querySelectorAll('.visit-list__item, .service-list__item').forEach((item) => {
    const rowIndex = [...item.parentElement.children].indexOf(item);
    item.style.setProperty('--reveal-delay', `${rowIndex * 60}ms`);
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.hasAttribute('data-draw') ? 'is-drawn' : 'is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add(item.hasAttribute('data-draw') ? 'is-drawn' : 'is-visible'));
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileLinks = [...document.querySelectorAll('.mobile-nav a')];
  function closeMenu(returnFocus = false) {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    mobileNav.hidden = true;
    if (returnFocus) menuToggle.focus();
  }
  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Ouvrir le menu' : 'Fermer le menu');
    mobileNav.hidden = isOpen;
    if (!isOpen) mobileLinks[0]?.focus();
  });
  mobileLinks.forEach((link) => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  const form = document.querySelector('#booking-form');
  if (!form) return;

  const status = document.querySelector('#booking-status');
  const panels = [...document.querySelectorAll('.booking-step')];
  const stepButtons = [...document.querySelectorAll('[data-step-jump]')];
  const dayOptions = document.querySelector('#day-options');
  const timeOptions = document.querySelector('#time-options');
  const selectedDayLabel = document.querySelector('#jour-selectionne');
  const successPanel = document.querySelector('#booking-success');
  const successTitle = document.querySelector('#titre-succes');
  const successRecap = document.querySelector('#success-recap');
  const personName = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const hoursByDay = {
    0: [600, 1200], 1: [600, 1200], 2: [600, 1200], 3: [600, 1200],
    4: [600, 1200], 5: [600, 1200], 6: [600, 1200],
  };
  const offeredDays = 14;
  let currentStep = 1;
  let unlockedStep = 1;
  let transitionId = 0;
  let chosenService = null;
  let chosenDate = null;
  let chosenTime = null;

  const dates = new Map();
  const recaps = {
    service: document.querySelector('#recap-prestation'),
    day: document.querySelector('#recap-jour'),
    time: document.querySelector('#recap-heure'),
    name: document.querySelector('#recap-prenom'),
  };

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateFromKey(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function formatFullDate(value) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(dateFromKey(value));
  }

  function formatShortDay(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
  }

  function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? `${hours} h` : `${hours} h 30`;
  }

  function updateSummary() {
    recaps.service.textContent = chosenService?.name || 'À choisir';
    recaps.day.textContent = chosenDate ? formatFullDate(chosenDate) : 'À choisir';
    recaps.time.textContent = chosenTime || 'À choisir';
    recaps.name.textContent = personName.value.trim() || 'À compléter';
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function updateStepNavigation() {
    stepButtons.forEach((button) => {
      const number = Number(button.dataset.stepJump);
      button.disabled = number > unlockedStep;
      if (number === currentStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(nextStep, message) {
    if (nextStep < 1 || nextStep > panels.length || nextStep > unlockedStep) return;
    const sequence = ++transitionId;
    const previousPanel = panels.find((panel) => Number(panel.dataset.step) === currentStep);
    const nextPanel = panels.find((panel) => Number(panel.dataset.step) === nextStep);
    if (!nextPanel) return;

    if (previousPanel && previousPanel !== nextPanel) {
      previousPanel.inert = true;
      previousPanel.setAttribute('aria-hidden', 'true');
      previousPanel.classList.remove('is-current');
      previousPanel.classList.add('is-leaving');
      previousPanel.dataset.exitToken = String(sequence);
      window.setTimeout(() => {
        if (previousPanel.dataset.exitToken !== String(sequence)) return;
        previousPanel.hidden = true;
        previousPanel.classList.remove('is-leaving');
        delete previousPanel.dataset.exitToken;
      }, reduceMotion ? 10 : 220);
    }

    currentStep = nextStep;
    delete nextPanel.dataset.exitToken;
    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.removeAttribute('aria-hidden');
    nextPanel.classList.add('is-entering');
    window.requestAnimationFrame(() => {
      nextPanel.classList.remove('is-entering');
      nextPanel.classList.add('is-current');
    });
    updateStepNavigation();
    updateSummary();
    if (message) setStatus(message);
    window.setTimeout(() => {
      if (sequence === transitionId) nextPanel.querySelector('.booking-step__title')?.focus();
    }, reduceMotion ? 20 : 230);
  }

  function setError(id, isVisible) {
    const message = document.getElementById(id);
    if (message) message.hidden = !isVisible;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function buildDays() {
    dayOptions.replaceChildren();
    dates.clear();
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let offset = 0; offset < offeredDays; offset += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + offset);
      const key = dateKey(day);
      const isOpen = Boolean(hoursByDay[day.getDay()]);
      dates.set(key, day);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-option';
      button.dataset.date = key;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', `${formatFullDate(key)}${offset === 0 ? ', aujourd’hui' : ''}${isOpen ? '' : ', fermé'}`);
      button.disabled = !isOpen;

      const weekday = document.createElement('span');
      weekday.textContent = offset === 0 ? 'Aujourd’hui' : formatShortDay(day);
      const dayNumber = document.createElement('strong');
      dayNumber.textContent = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' }).format(day);
      const state = document.createElement('span');
      state.className = 'day-option__state';
      state.textContent = isOpen ? new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(day).replace('.', '') : 'Fermé';
      button.append(weekday, dayNumber, state);
      button.addEventListener('click', () => chooseDay(key));
      dayOptions.append(button);
    }
  }

  function chooseDay(key) {
    if (!dates.has(key)) return;
    chosenDate = key;
    chosenTime = null;
    unlockedStep = Math.max(unlockedStep, 3);
    dayOptions.querySelectorAll('.day-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.date === key));
    });
    setError('jour-erreur', false);
    const [openingMinute, closingMinute] = hoursByDay[dateFromKey(key).getDay()];
    selectedDayLabel.textContent = `${formatFullDate(key)} · créneaux entre ${formatTime(openingMinute)} et ${formatTime(closingMinute)}.`;
    renderTimes();
    updateStepNavigation();
    updateSummary();
    setStatus(`Jour choisi : ${formatFullDate(key)}.`);
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function isIllustrativelyTaken(key, serviceValue, slotIndex) {
    return stableHash(`${key}-${serviceValue}-${slotIndex}`) % 6 === 1;
  }

  function renderTimes() {
    timeOptions.replaceChildren();
    if (!chosenDate || !chosenService) return;
    const now = new Date();
    const isToday = chosenDate === todayKey();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const hours = hoursByDay[dateFromKey(chosenDate).getDay()];
    if (!hours) return;
    const [openingMinute, closingMinute] = hours;
    const durationMinutes = chosenService.duration;
    const lastStart = closingMinute - durationMinutes;
    const slotCount = Math.floor((lastStart - openingMinute) / durationMinutes) + 1;
    let index = 0;

    for (let start = openingMinute; start <= lastStart; start += durationMinutes) {
      const isPast = isToday && start <= currentMinutes;
      const isTaken = index < slotCount - 1 && isIllustrativelyTaken(chosenDate, chosenService.value, index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `time-option${isTaken ? ' time-option--taken' : ''}`;
      button.textContent = formatTime(start);
      button.dataset.time = formatTime(start);
      button.setAttribute('aria-pressed', 'false');
      button.disabled = isTaken || isPast;
      if (isTaken) button.setAttribute('aria-label', `${formatTime(start)} — déjà pris dans cette simulation`);
      else if (isPast) button.setAttribute('aria-label', `${formatTime(start)} — heure passée`);
      else button.setAttribute('aria-label', `${formatTime(start)} — choisir cette heure`);
      button.addEventListener('click', () => chooseTime(button.dataset.time));
      timeOptions.append(button);
      index += 1;
    }

    if (!timeOptions.children.length) {
      const note = document.createElement('p');
      note.className = 'field-error';
      note.textContent = 'Aucun créneau ne convient à cette prestation sur ce jour.';
      timeOptions.append(note);
    }
  }

  function chooseTime(value) {
    chosenTime = value;
    unlockedStep = Math.max(unlockedStep, 4);
    timeOptions.querySelectorAll('.time-option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.time === value));
    });
    setError('heure-erreur', false);
    updateStepNavigation();
    updateSummary();
    setStatus(`Heure choisie : ${value}.`);
  }

  function validateStep(step) {
    if (step === 1 && !chosenService) {
      setError('prestation-erreur', true);
      setStatus('Choisissez une prestation pour continuer.');
      document.querySelector('.service-option input')?.focus();
      return false;
    }
    if (step === 2 && !chosenDate) {
      setError('jour-erreur', true);
      setStatus('Choisissez un jour pour continuer.');
      dayOptions.querySelector('.day-option:not(:disabled)')?.focus();
      return false;
    }
    if (step === 3 && !chosenTime) {
      setError('heure-erreur', true);
      setStatus('Choisissez une heure disponible pour continuer.');
      timeOptions.querySelector('.time-option:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  function normalizeFrenchMobile(value) {
    const digits = value.replace(/\D/g, '');
    if (/^0[67]\d{8}$/.test(digits)) return digits;
    if (/^33[67]\d{8}$/.test(digits)) return `0${digits.slice(2)}`;
    return null;
  }

  function appendRecap(label, value) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    row.append(term, detail);
    successRecap.append(row);
  }

  function finishSimulation() {
    const cleanName = personName.value.trim();
    const normalizedPhone = normalizeFrenchMobile(telephone.value);
    const nameMissing = cleanName.length === 0;
    const phoneInvalid = normalizedPhone === null;
    personName.setAttribute('aria-invalid', String(nameMissing));
    telephone.setAttribute('aria-invalid', String(phoneInvalid));
    setError('prenom-erreur', nameMissing);
    setError('telephone-erreur', phoneInvalid);
    setError('coordonnees-erreur', nameMissing || phoneInvalid);
    if (nameMissing || phoneInvalid) {
      setStatus('Vérifiez les coordonnées signalées.');
      (nameMissing ? personName : telephone).focus();
      return;
    }

    personName.setAttribute('aria-invalid', 'false');
    telephone.setAttribute('aria-invalid', 'false');
    recaps.name.textContent = cleanName;
    successRecap.replaceChildren();
    appendRecap('Prestation', chosenService.name);
    appendRecap('Jour', formatFullDate(chosenDate));
    appendRecap('Heure', chosenTime);
    appendRecap('Prénom', cleanName);
    form.hidden = true;
    successPanel.hidden = false;
    setStatus('La simulation est terminée. Rien n’a été envoyé.');
    updateSummary();
    successTitle.focus();
  }

  document.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      chosenService = {
        value: radio.value,
        name: radio.dataset.nom,
        duration: Number(radio.dataset.duree),
      };
      chosenDate = null;
      chosenTime = null;
      unlockedStep = 2;
      dayOptions.querySelectorAll('.day-option').forEach((button) => button.setAttribute('aria-pressed', 'false'));
      renderTimes();
      setError('prestation-erreur', false);
      updateSummary();
      updateStepNavigation();
      setStatus(`${chosenService.name}, durée affichée : trois heures. Choisissez un jour.`);
    });
  });

  document.querySelectorAll('[data-continuer]').forEach((button) => {
    button.addEventListener('click', () => {
      const step = Number(button.dataset.continuer);
      if (!validateStep(step)) return;
      if (step === 1) {
        if (!dayOptions.children.length) buildDays();
        showStep(2, 'Choisissez un jour parmi les horaires affichés par Planity.');
      } else if (step === 2) {
        renderTimes();
        showStep(3, 'Choisissez une heure disponible dans cette simulation.');
      } else if (step === 3) {
        showStep(4, 'Renseignez vos coordonnées pour voir le récapitulatif fictif.');
      }
    });
  });

  document.querySelectorAll('[data-retour]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.retour), 'Vous pouvez modifier votre sélection.'));
  });

  stepButtons.forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.stepJump), 'Étape affichée.'));
  });

  personName.addEventListener('input', () => {
    if (personName.value.trim()) {
      setError('prenom-erreur', false);
      personName.setAttribute('aria-invalid', 'false');
    }
    setError('coordonnees-erreur', false);
    updateSummary();
  });
  telephone.addEventListener('input', () => {
    if (normalizeFrenchMobile(telephone.value)) {
      setError('telephone-erreur', false);
      telephone.setAttribute('aria-invalid', 'false');
    }
    setError('coordonnees-erreur', false);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (currentStep !== 4) return;
    finishSimulation();
  });

  document.querySelector('.reset-booking')?.addEventListener('click', () => {
    transitionId += 1;
    form.reset();
    chosenService = null;
    chosenDate = null;
    chosenTime = null;
    currentStep = 1;
    unlockedStep = 1;
    form.hidden = false;
    successPanel.hidden = true;
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0;
      panel.inert = index !== 0;
      panel.classList.toggle('is-current', index === 0);
      panel.classList.remove('is-leaving', 'is-entering');
      if (index === 0) panel.removeAttribute('aria-hidden');
      else panel.setAttribute('aria-hidden', 'true');
    });
    ['prestation-erreur', 'jour-erreur', 'heure-erreur', 'prenom-erreur', 'telephone-erreur', 'coordonnees-erreur'].forEach((id) => setError(id, false));
    personName.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');
    buildDays();
    updateStepNavigation();
    updateSummary();
    setStatus('Choisissez une prestation pour commencer.');
    panels[0].querySelector('.booking-step__title')?.focus();
  });

  buildDays();
  updateStepNavigation();
  updateSummary();
})();
