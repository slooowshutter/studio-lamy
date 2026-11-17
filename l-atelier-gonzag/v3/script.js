(() => {
  const root = document.documentElement;
  const prefersLessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('navigation-principale');

  function closeNavigation(returnFocus = false) {
    if (!navButton || !nav) return;
    navButton.setAttribute('aria-expanded', 'false');
    navButton.setAttribute('aria-label', 'Ouvrir la navigation');
    nav.classList.remove('is-open');
    if (returnFocus) navButton.focus();
  }

  if (navButton && nav) {
    navButton.addEventListener('click', () => {
      const isOpen = navButton.getAttribute('aria-expanded') === 'true';
      navButton.setAttribute('aria-expanded', String(!isOpen));
      navButton.setAttribute('aria-label', isOpen ? 'Ouvrir la navigation' : 'Fermer la navigation');
      nav.classList.toggle('is-open', !isOpen);
      if (!isOpen) nav.querySelector('a')?.focus();
    });
    nav.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        const wasOpen = navButton.getAttribute('aria-expanded') === 'true';
        closeNavigation(false);
        if (wasOpen) {
          const target = document.querySelector(link.getAttribute('href'));
          const heading = target?.querySelector('h1, h2, h3');
          if (heading) {
            heading.setAttribute('tabindex', '-1');
            window.setTimeout(() => heading.focus({ preventScroll: true }), 20);
          }
        }
      });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navButton.getAttribute('aria-expanded') === 'true') closeNavigation(true);
    });
    document.addEventListener('click', (event) => {
      if (navButton.getAttribute('aria-expanded') !== 'true') return;
      if (!nav.contains(event.target) && !navButton.contains(event.target)) closeNavigation(false);
    });
  }

  const crest = document.querySelector('.crest');
  if (crest && !prefersLessMotion) {
    crest.querySelectorAll('.crest__rules path, .crest__rules circle').forEach((shape) => {
      let length = 0;
      if (shape.tagName.toLowerCase() === 'path' && typeof shape.getTotalLength === 'function') length = shape.getTotalLength();
      if (shape.tagName.toLowerCase() === 'circle') length = Math.PI * 2 * Number(shape.getAttribute('r'));
      if (length > 0) {
        shape.style.strokeDasharray = String(length);
        shape.style.strokeDashoffset = String(length);
      }
    });
  }

  const serviceList = [
    { id: 'homme-coupe', name: 'Coupe Homme' },
    { id: 'homme-coupe-barbe', name: 'Coupe homme + Taille de Barbe' },
    { id: 'taille-barbe', name: 'Taille de Barbe' },
    { id: 'garcon-court', name: 'Garçon- 12 ans court' },
    { id: 'brushing-court', name: 'Shampoing + Brushing Cheveux Courts' },
    { id: 'brushing-long', name: 'Shampoing + Brushing Cheveux longs' },
    { id: 'coupe-sechage-court', name: 'Shampoing + Coupe + Séchage court' },
    { id: 'coloration-court', name: 'Coloration racines + shampoing/soin brushing cheveux courts' }
  ];
  const serviceById = new Map(serviceList.map((service) => [service.id, service]));
  const form = document.getElementById('formulaire-reservation');
  const panels = Array.from(document.querySelectorAll('[data-panneau]'));
  const progressItems = Array.from(document.querySelectorAll('[data-etape-indice]'));
  const liveMessage = document.querySelector('[data-annonce]');
  const dayPicker = document.querySelector('[data-jours]');
  const timePicker = document.querySelector('[data-heures]');
  const nextButtons = Array.from(document.querySelectorAll('[data-suivant]'));
  const summaryService = document.querySelector('[data-resume-prestation]');
  const summaryDate = document.querySelector('[data-resume-date]');
  const summaryTime = document.querySelector('[data-resume-heure]');
  const recapService = document.querySelector('[data-recap-prestation]');
  const recapDate = document.querySelector('[data-recap-date]');
  const recapTime = document.querySelector('[data-recap-heure]');
  const state = { service: '', day: '', time: '', contactComplete: false };
  let currentStep = 1;
  let changingStep = false;

  const openingTimes = {
    2: { opens: 570, closes: 1140 },
    3: { opens: 540, closes: 1140 },
    4: { opens: 540, closes: 1140 },
    5: { opens: 540, closes: 1140 },
    6: { opens: 540, closes: 1020 }
  };

  function parisDateParts() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
  }

  function parisMinuteOfDay() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return Number(value.hour) * 60 + Number(value.minute);
  }

  function dateFromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function isoDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function fullDate(iso) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateFromIso(iso));
  }

  function shortWeekday(date) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(date).replace('.', '');
  }

  function isOpenDay(date) {
    return Object.hasOwn(openingTimes, date.getUTCDay());
  }

  function timesForDay(iso) {
    const date = dateFromIso(iso);
    const hours = openingTimes[date.getUTCDay()];
    if (!hours) return [];
    const nowParts = parisDateParts();
    const today = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-${String(nowParts.day).padStart(2, '0')}`;
    const nowMinutes = parisMinuteOfDay();
    const times = [];
    for (let minute = hours.opens; minute < hours.closes; minute += 60) {
      if (iso === today && minute <= nowMinutes) continue;
      times.push(minute);
    }
    return times;
  }

  function minuteLabel(minute) {
    const hours = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    return `${hours} h ${minutes}`;
  }

  function updateSummary() {
    const service = serviceById.get(state.service);
    const dateText = state.day ? fullDate(state.day) : '';
    const timeText = state.time ? minuteLabel(Number(state.time)) : '';
    summaryService.textContent = service ? service.name : 'À choisir';
    summaryDate.textContent = dateText || 'À choisir';
    summaryTime.textContent = timeText || 'À choisir';
    recapService.textContent = service ? service.name : '—';
    recapDate.textContent = dateText || 'Choisissez un jour';
    recapTime.textContent = timeText || 'Choisissez une heure';
  }

  function updateNextButtons() {
    nextButtons.forEach((button) => {
      const step = Number(button.dataset.suivant);
      const valid = step === 1 ? Boolean(state.service) : step === 2 ? Boolean(state.day) : Boolean(state.time);
      button.disabled = !valid;
    });
    progressItems.forEach((item) => {
      const step = Number(item.dataset.etapeIndice);
      const jump = item.querySelector('[data-retour-etape]');
      if (step === currentStep && currentStep <= 4) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      const complete = step === 1 ? Boolean(state.service)
        : step === 2 ? Boolean(state.service && state.day)
          : step === 3 ? Boolean(state.service && state.day && state.time)
            : state.contactComplete;
      if (jump) jump.disabled = step >= currentStep || !complete;
    });
  }

  function renderDays() {
    if (!dayPicker) return;
    const start = parisDateParts();
    const beginning = new Date(Date.UTC(start.year, start.month - 1, start.day));
    const dates = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(beginning);
      date.setUTCDate(date.getUTCDate() + index);
      return date;
    });
    dayPicker.innerHTML = dates.map((date) => {
      const iso = isoDate(date);
      const open = isOpenDay(date);
      const future = open && timesForDay(iso).length > 0;
      const disabled = !open || !future;
      const weekday = shortWeekday(date);
      const dayNumber = date.getUTCDate();
      const accessibleDate = fullDate(iso);
      const reason = !open ? 'fermé' : !future ? 'aucune heure future dans cette plage simulée' : 'jour proposé pour la simulation';
      const stateText = !open ? 'Fermé' : !future ? 'Terminé' : 'Simulation';
      const checked = state.day === iso && !disabled;
      const id = `jour-${iso}`;
      return `<div class="day-choice${!open ? ' is-closed' : ''}"><input id="${id}" type="radio" name="jour" value="${iso}" aria-label="${accessibleDate}, ${reason}"${disabled ? ' disabled' : ''}${checked ? ' checked' : ''}><label for="${id}"><span class="day-choice__week" aria-hidden="true">${weekday}</span><span class="day-choice__date" aria-hidden="true">${dayNumber}</span><span class="day-choice__week">${stateText}</span></label></div>`;
    }).join('');

    dayPicker.querySelectorAll('input[name="jour"]').forEach((input) => {
      input.addEventListener('change', () => {
        state.day = input.value;
        state.contactComplete = false;
        const available = timesForDay(state.day).map(String);
        if (!available.includes(state.time)) state.time = '';
        renderTimes();
        updateSummary();
        updateNextButtons();
        liveMessage.textContent = `Jour de simulation choisi : ${fullDate(state.day)}.`;
      });
    });
  }

  function renderTimes() {
    if (!timePicker) return;
    if (!state.day) {
      timePicker.innerHTML = '<p class="time-empty">Choisissez d’abord un jour pour afficher les horaires simulés.</p>';
      return;
    }
    const times = timesForDay(state.day);
    if (!times.length) {
      timePicker.innerHTML = '<p class="time-empty">Aucun horaire futur dans la plage affichée. Choisissez un autre jour.</p>';
      return;
    }
    timePicker.innerHTML = times.map((minute) => {
      const id = `heure-${state.day}-${minute}`;
      const label = minuteLabel(minute);
      const checked = state.time === String(minute);
      return `<div class="time-choice"><input id="${id}" type="radio" name="heure" value="${minute}" aria-label="${label}, heure de démonstration"${checked ? ' checked' : ''}><label for="${id}">${label}</label></div>`;
    }).join('');
    timePicker.querySelectorAll('input[name="heure"]').forEach((input) => {
      input.addEventListener('change', () => {
        state.time = input.value;
        state.contactComplete = false;
        updateSummary();
        updateNextButtons();
        liveMessage.textContent = `Heure de démonstration choisie : ${minuteLabel(Number(state.time))}.`;
      });
    });
  }

  function changeStep(nextStep, options = {}) {
    if (changingStep || nextStep === currentStep) return;
    const nextPanel = panels.find((panel) => Number(panel.dataset.panneau) === nextStep);
    const oldPanel = panels.find((panel) => Number(panel.dataset.panneau) === currentStep);
    if (!nextPanel) return;
    changingStep = true;
    if (oldPanel) {
      oldPanel.classList.add('is-leaving');
      window.setTimeout(() => {
        oldPanel.hidden = true;
        oldPanel.classList.remove('is-leaving', 'is-entered');
      }, prefersLessMotion ? 0 : 220);
    }
    nextPanel.hidden = false;
    nextPanel.classList.add('is-entering');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      nextPanel.classList.remove('is-entering');
      nextPanel.classList.add('is-entered');
    }));
    currentStep = nextStep;
    updateSummary();
    updateNextButtons();
    if (options.announce !== false && liveMessage) {
      const stepNames = { 1: 'prestation', 2: 'jour', 3: 'heure', 4: 'coordonnées', 5: 'confirmation' };
      liveMessage.textContent = `Étape ${nextStep} : ${stepNames[nextStep]}.`;
    }
    if (options.focus !== false) {
      const heading = nextPanel.querySelector('h3');
      window.setTimeout(() => heading?.focus({ preventScroll: true }), 35);
    }
    window.setTimeout(() => { changingStep = false; }, prefersLessMotion ? 0 : 225);
  }

  if (form && dayPicker && timePicker) {
    renderDays();
    renderTimes();
    updateSummary();
    updateNextButtons();

    form.querySelectorAll('input[name="prestation"]').forEach((input) => {
      input.addEventListener('change', () => {
        state.service = input.value;
        state.day = '';
        state.time = '';
        state.contactComplete = false;
        renderDays();
        renderTimes();
        updateSummary();
        updateNextButtons();
        liveMessage.textContent = `Prestation choisie : ${serviceById.get(state.service).name}.`;
      });
    });

    progressItems.forEach((item) => {
      item.querySelector('[data-retour-etape]')?.addEventListener('click', () => {
        const step = Number(item.dataset.etapeIndice);
        if (step < currentStep && state.service && (step < 2 || state.day) && (step < 3 || state.time)) changeStep(step);
      });
    });

    nextButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const step = Number(button.dataset.suivant);
        if (step === 1) state.service = form.querySelector('input[name="prestation"]:checked')?.value || '';
        if (step === 2) state.day = form.querySelector('input[name="jour"]:checked')?.value || '';
        if (step === 3) state.time = form.querySelector('input[name="heure"]:checked')?.value || '';
        updateSummary();
        if ((step === 1 && state.service) || (step === 2 && state.day) || (step === 3 && state.time)) changeStep(step + 1);
      });
    });

    form.querySelectorAll('[data-retour]').forEach((button) => {
      button.addEventListener('click', () => changeStep(Number(button.dataset.retour) - 1));
    });

    document.querySelectorAll('[data-choisir]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.choisir;
        const input = form.querySelector(`input[name="prestation"][value="${id}"]`);
        if (!input) return;
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (currentStep !== 1) changeStep(1, { focus: false });
        const booking = document.getElementById('reserver');
        booking?.scrollIntoView({ behavior: prefersLessMotion ? 'auto' : 'smooth', block: 'start' });
        window.setTimeout(() => document.getElementById('etape-titre-1')?.focus({ preventScroll: true }), 30);
      });
    });

    const firstName = document.getElementById('prenom');
    const phone = document.getElementById('telephone');
    const firstNameError = document.getElementById('erreur-prenom');
    const phoneError = document.getElementById('erreur-telephone');
    [firstName, phone].forEach((input) => {
      input.addEventListener('input', () => {
        state.contactComplete = false;
        updateNextButtons();
      });
    });

    function validateContact() {
      let valid = true;
      const nameValue = firstName.value.trim();
      const phoneValue = phone.value.replace(/[\s().-]/g, '');
      const validName = nameValue.length >= 2;
      const validPhone = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(phoneValue);
      firstName.setAttribute('aria-invalid', String(!validName));
      phone.setAttribute('aria-invalid', String(!validPhone));
      firstNameError.textContent = validName ? '' : 'Saisissez un prénom d’au moins deux caractères.';
      phoneError.textContent = validPhone ? '' : 'Saisissez un numéro mobile français valide.';
      state.contactComplete = validName && validPhone;
      if (!validName) { valid = false; firstName.focus(); }
      else if (!validPhone) { valid = false; phone.focus(); }
      if (!valid) liveMessage.textContent = 'Le formulaire comporte une erreur. Consultez le champ signalé.';
      updateNextButtons();
      return valid;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (currentStep !== 4 || !validateContact()) return;
      const service = serviceById.get(state.service);
      const date = fullDate(state.day);
      const time = minuteLabel(Number(state.time));
      const success = document.querySelector('[data-succes-recap]');
      success.textContent = `${service.name} · ${date} à ${time}.`;
      changeStep(5);
    });

    document.querySelector('[data-recommencer]')?.addEventListener('click', () => {
      state.service = '';
      state.day = '';
      state.time = '';
      state.contactComplete = false;
      form.reset();
      firstName.removeAttribute('aria-invalid');
      phone.removeAttribute('aria-invalid');
      firstNameError.textContent = '';
      phoneError.textContent = '';
      renderDays();
      renderTimes();
      updateSummary();
      updateNextButtons();
      changeStep(1);
    });
  }

  const mobileBar = document.querySelector('.mobile-bar');
  const hero = document.querySelector('.hero');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.footer');
  if (mobileBar && 'IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) visibility.hero = entry.isIntersecting;
        if (entry.target === bookingSection) visibility.booking = entry.isIntersecting;
        if (entry.target === footer) visibility.footer = entry.isIntersecting;
      });
      mobileBar.hidden = visibility.hero || visibility.booking || visibility.footer;
    }, { threshold: 0.04 });
    if (hero) observer.observe(hero);
    if (bookingSection) observer.observe(bookingSection);
    if (footer) observer.observe(footer);
  }

  const revealItems = Array.from(document.querySelectorAll('.section__head, .service-row, .visit-grid, .complete__frame, .sources__list'));
  revealItems.forEach((item, index) => {
    item.dataset.reveal = '';
    if (!prefersLessMotion) item.style.transitionDelay = `${(index % 4) * 55}ms`;
  });

  if (!prefersLessMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  root.classList.add('motion-ready');
  const entranceItems = Array.from(document.querySelectorAll('[data-entree], [data-ruban]'));
  if (!prefersLessMotion) entranceItems.forEach((item, index) => { item.style.transitionDelay = `${index * 75}ms`; });
  if (prefersLessMotion) {
    entranceItems.forEach((item) => item.classList.add('is-visible'));
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    window.requestAnimationFrame(() => {
      entranceItems.forEach((item) => item.classList.add('is-visible'));
      if (crest) window.setTimeout(() => crest.classList.add('is-drawn'), 120);
    });
  }
})();
