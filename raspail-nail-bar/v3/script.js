/* Interactions de la maquette : aucune réservation ni donnée n'est transmise. */
document.documentElement.classList.add('js');

(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.chapter--hero');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation-principale');
  const stickyBar = document.querySelector('.sticky-bar');

  if (hero) requestAnimationFrame(() => hero.classList.add('is-ready'));

  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (entry.target.matches('[data-reveal="dial"]')) entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  if (menuButton && navigation) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.querySelector('.menu-toggle__text').textContent = 'Afficher le menu';
      navigation.dataset.menu = 'ferme';
      if (returnFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.querySelector('.menu-toggle__text').textContent = opening ? 'Masquer le menu' : 'Afficher le menu';
      navigation.dataset.menu = opening ? 'ouvert' : 'ferme';
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
  }

  const progressFill = document.querySelector('.reading-track__fill');
  let progressFrame = 0;
  const paintProgress = () => {
    if (!progressFill || progressFrame) return;
    progressFrame = requestAnimationFrame(() => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      progressFill.style.transform = `scaleY(${ratio})`;
      progressFrame = 0;
    });
  };
  window.addEventListener('scroll', paintProgress, { passive: true });
  window.addEventListener('resize', paintProgress, { passive: true });
  paintProgress();

  if (stickyBar && 'IntersectionObserver' in window) {
    const visibleSections = new Set();
    const updateSticky = () => {
      const hidden = visibleSections.size > 0;
      stickyBar.classList.toggle('is-hidden', hidden);
      stickyBar.setAttribute('aria-hidden', String(hidden));
      stickyBar.inert = hidden;
    };
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target.id);
        else visibleSections.delete(entry.target.id);
      });
      updateSticky();
    }, { threshold: 0.12 });
    ['reserver', 'sources'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) stickyObserver.observe(section);
    });
  }

  const app = document.querySelector('#booking-app');
  if (!app) return;
  app.hidden = false;

  const state = { service: null, day: null, time: null, firstName: '' };
  const serviceInputs = [...app.querySelectorAll('input[name="prestation"]')];
  const panels = [...app.querySelectorAll('[data-step-panel]')];
  const progressSteps = [...app.querySelectorAll('[data-go-to]')];
  const dayList = app.querySelector('#day-list');
  const slotList = app.querySelector('#slot-list');
  const selectionService = app.querySelector('#selection-service');
  const selectionDuration = app.querySelector('#selection-duration');
  const selectionDate = app.querySelector('#selection-date');
  const selectionTime = app.querySelector('#selection-time');
  const confirmationRecap = app.querySelector('#confirmation-recap');
  const currentDate = parisDateParts(new Date());
  let currentStep = 0;
  let furthestStep = 0;
  let dayChoices = [];
  let todayMinutes = 0;

  function parisDateParts(date) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(values.year), month: Number(values.month), day: Number(values.day),
      hour: Number(values.hour), minute: Number(values.minute)
    };
  }

  function dateFromParts(year, month, day) {
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatFullDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric', month: 'short', timeZone: 'UTC'
    }).format(date).replace('.', '');
  }

  function formatWeekday(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short', timeZone: 'UTC'
    }).format(date).replace('.', '');
  }

  function selectedService() {
    return serviceInputs.find((input) => input.checked) || serviceInputs[0];
  }

  function readService() {
    const input = selectedService();
    state.service = {
      id: input.value,
      name: input.dataset.name,
      duration: Number(input.dataset.duration)
    };
    selectionService.textContent = serviceName(input.value);
    selectionDuration.textContent = durationLabel(state.service.duration);
  }

  function serviceName(id) {
    const names = {
      'pieds-opi': 'Femme - Beauté des pieds express et pose de vernis semi-permanent OPI',
      'manucure-semi': 'Manucure et pose de vernis semi-permanent',
      'mains-semi': 'Mains - Pose de vernis semi-permanent',
      gelcolor: 'Manucure, beauté des pieds express et pose de vernis GelColor'
    };
    return names[id] || 'Prestation sélectionnée';
  }

  function durationLabel(minutes) {
    if (minutes === 90) return '1 h 30';
    return `${minutes} min`;
  }

  function setSummaryDate(date) {
    selectionDate.textContent = date ? formatFullDate(date) : 'Choisissez un jour';
  }

  function addRadioLabel(group, config) {
    const label = document.createElement('label');
    label.className = config.className;
    if (config.disabled) label.classList.add('is-unavailable');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = config.name;
    input.value = config.value;
    if (config.checked) input.checked = true;
    if (config.disabled) input.disabled = true;
    const caption = document.createElement('span');
    if (config.weekday) {
      const weekday = document.createElement('small');
      weekday.className = 'day-option__weekday';
      weekday.textContent = config.weekday;
      const day = document.createElement('strong');
      day.className = 'day-option__day';
      day.textContent = config.day;
      const month = document.createElement('small');
      month.className = 'day-option__month';
      month.textContent = config.month;
      caption.append(weekday, day, month);
      label.setAttribute('aria-label', config.accessibleName);
    } else {
      caption.textContent = config.time;
      if (config.disabled) {
        const status = document.createElement('small');
        status.textContent = config.disabledLabel;
        caption.append(status);
        label.setAttribute('aria-label', `${config.time}, ${config.disabledLabel}`);
      } else {
        label.setAttribute('aria-label', `${config.time}, créneau simulé`);
      }
    }
    label.append(input, caption);
    group.append(label);
    return input;
  }

  function buildDays() {
    dayList.replaceChildren();
    todayMinutes = currentDate.hour * 60 + currentDate.minute;
    dayChoices = [];
    for (let offset = 0; offset < 14; offset += 1) {
      const date = dateFromParts(currentDate.year, currentDate.month, currentDate.day + offset);
      const key = dateKey(date);
      const weekday = date.getUTCDay();
      const dateInput = addRadioLabel(dayList, {
        className: 'day-option', name: 'jour', value: key, checked: offset === 0,
        weekday: formatWeekday(date), day: String(date.getUTCDate()), month: formatShortDate(date),
        accessibleName: `${formatFullDate(date)}, ouvert selon les horaires publiés`
      });
      dayChoices.push({ date, key, weekday, input: dateInput });
    }
    state.day = dayChoices[0];
    setSummaryDate(state.day.date);
    buildSlots();
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function buildSlots() {
    if (!state.day || !state.service) return;
    slotList.replaceChildren();
    state.time = null;
    selectionTime.textContent = 'Puis une heure';
    const opensAt = 10 * 60;
    const closesAt = state.day.weekday === 0 ? 19 * 60 : 20 * 60;
    const lastStart = closesAt - state.service.duration;
    const isToday = state.day.key === dateKey(dateFromParts(currentDate.year, currentDate.month, currentDate.day));
    let usableCount = 0;
    for (let start = opensAt; start <= lastStart; start += 30) {
      const hour = String(Math.floor(start / 60)).padStart(2, '0');
      const minute = String(start % 60).padStart(2, '0');
      const time = `${hour}:${minute}`;
      const past = isToday && start <= todayMinutes;
      const unavailable = stableHash(`${state.day.key}-${state.service.id}-${time}`) % 7 === 0;
      const disabled = past || unavailable;
      if (!disabled) usableCount += 1;
      addRadioLabel(slotList, {
        className: 'slot-option', name: 'heure', value: time, time,
        disabled, disabledLabel: past ? 'heure passée' : 'indisponible · simulation'
      });
    }
    if (usableCount === 0) {
      const note = document.createElement('p');
      note.textContent = 'Aucun créneau de démonstration ne reste pour ce jour. Choisissez une autre date.';
      slotList.append(note);
    }
  }

  function updateStepControls() {
    progressSteps.forEach((button, index) => {
      const active = index === currentStep;
      button.classList.toggle('is-current', active);
      button.disabled = index > furthestStep;
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function goToStep(index) {
    if (index < 0 || index > furthestStep || index >= panels.length) return;
    const nextPanel = panels.find((panel) => Number(panel.dataset.stepPanel) === index);
    const previousPanel = panels.find((panel) => !panel.hidden);
    if (!nextPanel) return;
    if (previousPanel === nextPanel) return;
    currentStep = index;
    updateStepControls();
    nextPanel.hidden = false;
    nextPanel.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => nextPanel.classList.remove('is-entering')));
    if (previousPanel) {
      previousPanel.classList.add('is-exiting');
      window.setTimeout(() => {
        previousPanel.hidden = true;
        previousPanel.classList.remove('is-exiting');
      }, reducedMotion ? 100 : 220);
    }
    const heading = nextPanel.querySelector('h3');
    window.setTimeout(() => heading && heading.focus(), 35);
    if (index === 3) updateConfirmationRecap();
  }

  function updateConfirmationRecap() {
    confirmationRecap.replaceChildren();
    const rows = [
      ['Prestation', state.service ? serviceName(state.service.id) : 'À choisir'],
      ['Durée', state.service ? durationLabel(state.service.duration) : 'À choisir'],
      ['Jour', state.day ? formatFullDate(state.day.date) : 'À choisir'],
      ['Heure', state.time || 'À choisir']
    ];
    rows.forEach(([label, value]) => {
      const row = document.createElement('p');
      const title = document.createElement('strong');
      title.textContent = `${label} : `;
      row.append(title, document.createTextNode(value));
      confirmationRecap.append(row);
    });
  }

  function setError(id, message) {
    const element = app.querySelector(`#${id}`);
    if (element) element.textContent = message;
  }

  function clearFieldError(input, errorId) {
    input.removeAttribute('aria-invalid');
    setError(errorId, '');
  }

  function validateStep(step) {
    if (step === 0) {
      if (!selectedService()) {
        setError('service-error', 'Choisissez une prestation pour continuer.');
        return false;
      }
      return true;
    }
    if (step === 1) {
      const selected = app.querySelector('input[name="jour"]:checked');
      if (!selected) {
        setError('day-error', 'Choisissez un jour pour continuer.');
        return false;
      }
      state.day = dayChoices.find((choice) => choice.key === selected.value);
      setSummaryDate(state.day.date);
      buildSlots();
      return true;
    }
    if (step === 2) {
      const selected = app.querySelector('input[name="heure"]:checked');
      if (!selected) {
        setError('slot-error', 'Choisissez une heure disponible dans la démonstration.');
        return false;
      }
      state.time = selected.value;
      selectionTime.textContent = state.time;
      return true;
    }
    return true;
  }

  serviceInputs.forEach((input) => input.addEventListener('change', () => {
    readService();
    state.time = null;
    if (state.day) buildSlots();
    if (currentStep >= 3) updateConfirmationRecap();
  }));

  dayList.addEventListener('change', (event) => {
    if (!event.target.matches('input[name="jour"]')) return;
    state.day = dayChoices.find((choice) => choice.key === event.target.value);
    setSummaryDate(state.day.date);
    buildSlots();
    setError('day-error', '');
  });

  slotList.addEventListener('change', (event) => {
    if (!event.target.matches('input[name="heure"]')) return;
    state.time = event.target.value;
    selectionTime.textContent = state.time;
    setError('slot-error', '');
  });

  app.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    furthestStep = Math.max(furthestStep, currentStep + 1);
    goToStep(currentStep + 1);
  }));
  app.querySelectorAll('[data-previous]').forEach((button) => button.addEventListener('click', () => goToStep(currentStep - 1)));
  progressSteps.forEach((button) => button.addEventListener('click', () => {
    const destination = Number(button.dataset.goTo);
    if (destination <= furthestStep) goToStep(destination);
  }));

  const nameInput = app.querySelector('#booking-name');
  const phoneInput = app.querySelector('#booking-phone');
  nameInput.addEventListener('input', () => clearFieldError(nameInput, 'name-error'));
  phoneInput.addEventListener('input', () => clearFieldError(phoneInput, 'phone-error'));

  app.querySelector('#confirm-booking').addEventListener('click', () => {
    const firstName = nameInput.value.trim();
    const phone = phoneInput.value.trim().replace(/[\s().-]/g, '');
    const validName = /^[\p{L}]+(?:[ '\u2019-][\p{L}]+)*$/u.test(firstName) && firstName.length >= 2;
    const validMobile = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phone);
    let valid = true;
    if (!validName) {
      nameInput.setAttribute('aria-invalid', 'true');
      setError('name-error', 'Saisissez un prénom valide.');
      valid = false;
    } else clearFieldError(nameInput, 'name-error');
    if (!validMobile) {
      phoneInput.setAttribute('aria-invalid', 'true');
      setError('phone-error', 'Saisissez un numéro de téléphone portable français valide.');
      valid = false;
    } else clearFieldError(phoneInput, 'phone-error');
    if (!valid) {
      (validName ? phoneInput : nameInput).focus();
      return;
    }
    state.firstName = firstName;
    const successMessage = app.querySelector('#success-message');
    successMessage.textContent = `${firstName}, votre sélection porte sur ${serviceName(state.service.id)}, le ${formatFullDate(state.day.date)} à ${state.time}.`;
    furthestStep = 4;
    goToStep(4);
  });

  app.querySelector('#restart-booking').addEventListener('click', () => {
    nameInput.value = '';
    phoneInput.value = '';
    clearFieldError(nameInput, 'name-error');
    clearFieldError(phoneInput, 'phone-error');
    state.firstName = '';
    state.time = null;
    state.day = dayChoices[0];
    dayChoices.forEach((choice, index) => { choice.input.checked = index === 0; });
    setSummaryDate(state.day.date);
    selectionTime.textContent = 'Puis une heure';
    app.querySelector('#success-message').textContent = '';
    confirmationRecap.replaceChildren();
    furthestStep = 0;
    buildSlots();
    goToStep(0);
  });

  document.querySelectorAll('[data-preselect]').forEach((button) => button.addEventListener('click', () => {
    const input = app.querySelector(`input[name="prestation"][value="${button.dataset.preselect}"]`);
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      furthestStep = 0;
      goToStep(0);
      document.querySelector('#reserver').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => app.querySelector('#step-title-0').focus(), reducedMotion ? 0 : 250);
    }
  }));

  readService();
  buildDays();
  updateStepControls();
})();
