(() => {
  const root = document.documentElement;
  root.classList.add('js-ready');
  window.__site = true;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stepDuration = reduceMotion ? 150 : 220;

  // Menu: opening places focus in the panel; Escape closes it and restores focus.
  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  const menuLinks = $$('a', mobileNav);

  function closeMenu(restoreFocus = false) {
    if (!menuButton || !mobileNav) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
    mobileNav.hidden = true;
    if (restoreFocus) menuButton.focus();
  }

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      mobileNav.hidden = !open;
      if (open) requestAnimationFrame(() => menuLinks[0]?.focus());
    });
    menuLinks.forEach((link) => link.addEventListener('click', () => {
      const target = link.hash ? $(link.hash) : null;
      if (target) {
        closeMenu();
        const focusTarget = $('h1, h2, h3', target) || target;
        focusTarget.focus({ preventScroll: true });
      } else {
        closeMenu(true);
      }
    }));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
    document.addEventListener('click', (event) => {
      if (menuButton.getAttribute('aria-expanded') !== 'true') return;
      if (!mobileNav.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
    });
  }

  // Reveals happen once. Content remains visible if IntersectionObserver is unavailable.
  const reveals = $$('[data-reveal]');
  reveals.forEach((element) => {
    const parent = element.parentElement;
    const siblings = parent ? $$(':scope > [data-reveal]', parent) : [];
    const index = siblings.indexOf(element);
    if (index > 0 && siblings.length > 1) {
      element.style.setProperty('--reveal-delay', `${Math.min(index * 60, 240)}ms`);
    }
  });

  const drawTargets = [
    ...$$('[data-reveal]'),
    ...$$('[data-draw]'),
    $('.date-section__mark')
  ].filter(Boolean);

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    drawTargets.forEach((element) => revealObserver.observe(element));
  } else {
    drawTargets.forEach((element) => element.classList.add('is-visible'));
  }

  // Mobile actions appear after the opening copy leaves the screen, then rest
  // while the booking interface or footer is in view.
  const actionbar = $('.mobile-actionbar');
  const hero = $('.hero');
  const bookingSection = $('#reserver');
  const footer = $('.site-footer');
  if (actionbar && hero && 'IntersectionObserver' in window) {
    let heroPassed = false;
    let bookingVisible = false;
    let footerVisible = false;
    const updateActionbar = () => {
      const mobile = window.matchMedia('(max-width: 759px)').matches;
      const hasFocus = actionbar.contains(document.activeElement);
      const show = mobile && heroPassed && ((!bookingVisible && !footerVisible) || hasFocus);
      actionbar.classList.toggle('is-visible', show);
      actionbar.inert = !show;
    };
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
      updateActionbar();
    }, { threshold: 0 });
    heroObserver.observe(hero);
    const bookingObserver = new IntersectionObserver(([entry]) => {
      bookingVisible = entry.isIntersecting;
      updateActionbar();
    }, { threshold: 0.08 });
    if (bookingSection) bookingObserver.observe(bookingSection);
    const footerObserver = new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      updateActionbar();
    }, { threshold: 0.02 });
    if (footer) footerObserver.observe(footer);
    window.addEventListener('resize', updateActionbar, { passive: true });
    $('a[href="#reserver"]', actionbar)?.addEventListener('click', () => {
      const heading = bookingSection ? $('h2', bookingSection) : null;
      requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
    });
    actionbar.addEventListener('focusout', () => requestAnimationFrame(updateActionbar));
  } else if (actionbar) {
    actionbar.classList.add('is-visible');
    actionbar.inert = false;
  }

  const form = $('[data-booking-form]');
  if (!form) return;

  const steps = $$('.booking-step', form);
  const progress = $('[data-progress]', form);
  const summaryService = $('[data-summary-service]');
  const summaryDate = $('[data-summary-date]');
  const summaryTime = $('[data-summary-time]');
  const summaryPrice = $('[data-summary-price]');
  const dayList = $('[data-days]', form);
  const timeList = $('[data-times]', form);
  const slotNote = $('[data-slot-note]', form);
  const nameField = $('[data-name]', form);
  const phoneField = $('[data-phone]', form);
  const success = $('[data-success]');
  const successCopy = $('[data-success-copy]');
  const successTitle = $('#success-title');
  const live = $('[data-live]');
  const data = {
    service: null,
    day: null,
    time: null,
    transitioning: false
  };

  function activeService() {
    const input = $('input[name="service"]:checked', form);
    if (!input) return null;
    return {
      id: input.value,
      label: input.dataset.label
    };
  }

  function localIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function dateFromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function dateLabel(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    const value = new Intl.DateTimeFormat('fr-FR', options).format(date);
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function updateSummary() {
    const service = activeService();
    data.service = service?.id || null;
    if (summaryService) summaryService.textContent = service ? service.label : 'Pas encore de soin';
    if (summaryDate) summaryDate.textContent = data.day ? dateLabel(dateFromIso(data.day)) : 'Jour à choisir';
    if (summaryTime) summaryTime.textContent = data.time == null ? 'Heure à choisir' : formatTime(data.time);
    if (summaryPrice) summaryPrice.textContent = 'À confirmer';
    $$('[data-edit-step]', $('.selection')).forEach((button) => {
      const step = Number(button.dataset.editStep);
      button.disabled = step === 1 ? !service : step === 2 ? !data.day : data.time == null;
    });
  }

  function setError(key, message) {
    const target = $(`[data-error="${key}"]`, form);
    if (target) target.textContent = message;
    const field = key === 'name' ? nameField : key === 'phone' ? phoneField : null;
    if (field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function showStep(number, announce = true) {
    if (data.transitioning || number < 1 || number > steps.length) return;
    const next = steps.find((step) => Number(step.dataset.step) === number);
    const current = steps.find((step) => !step.hidden && step !== next);
    if (!next) return;
    data.transitioning = true;

    const enter = () => {
      next.hidden = false;
      next.inert = false;
      next.setAttribute('aria-hidden', 'false');
      next.classList.add('is-entering');
      requestAnimationFrame(() => {
        next.classList.remove('is-entering');
        next.classList.add('is-current');
      });
      data.transitioning = false;
      progress.textContent = `Étape ${number} sur ${steps.length}`;
      const heading = $('.booking-step__title', next);
      if (heading) heading.focus({ preventScroll: true });
      if (announce) live.textContent = `Étape ${number} sur ${steps.length} : ${heading?.textContent || ''}`;
    };

    if (!current) {
      enter();
      return;
    }
    current.inert = true;
    current.setAttribute('aria-hidden', 'true');
    current.classList.remove('is-current');
    current.classList.add('is-leaving');
    window.setTimeout(() => {
      current.hidden = true;
      current.classList.remove('is-leaving');
      enter();
    }, stepDuration);
  }

  function setStepError(key, text) {
    setError(key, text);
    const firstInput = key === 'service'
      ? $('input[name="service"]', form)
      : key === 'day'
        ? $('input[name="day"]:not(:disabled)', form)
        : key === 'time'
          ? $('input[name="time"]:not(:disabled)', form)
          : null;
    firstInput?.focus({ preventScroll: true });
  }

  function renderDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = [];
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + offset);
      dates.push(day);
    }
    dayList.innerHTML = dates.map((date, index) => {
      const iso = localIso(date);
      const closed = date.getDay() === 0;
      const week = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
      const dayNumber = new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(date);
      const current = data.day === iso;
      const readable = `${dateLabel(date)}, ${closed ? 'dimanche non proposé' : 'créneau simulé'}`;
      return `<label class="day-choice${closed ? ' is-disabled' : ''}${current ? ' is-selected' : ''}"${closed ? ' aria-disabled="true"' : ''}>
        <input type="radio" name="day" value="${iso}" aria-label="${readable}"${closed ? ' disabled' : ''}${current ? ' checked' : ''}>
        <span class="day-choice__week">${index === 0 ? 'aujourd’hui' : week}</span>
        <span class="day-choice__date">${dayNumber}</span>
        ${closed ? '<span class="day-choice__status">Non proposé</span>' : ''}
      </label>`;
    }).join('');
  }

  function deterministicTaken(iso, minute, serviceId) {
    const seed = `${iso}-${minute}-${serviceId || 'soin'}`;
    let hash = 17;
    for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) % 997;
    return hash % 5 === 1;
  }

  function formatTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${hour}\u00a0h\u00a0${minute}`;
  }

  function renderTimes() {
    if (!data.day || !activeService()) {
      timeList.innerHTML = '<p class="time-empty">Choisissez d’abord un soin et un jour.</p>';
      return;
    }
    const service = activeService();
    const date = dateFromIso(data.day);
    const isToday = data.day === localIso(new Date());
    const now = new Date();
    const closing = 19 * 60;
    const options = [];
    for (let minute = 9 * 60; minute < closing; minute += 30) {
      const slotDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(minute / 60), minute % 60);
      const past = isToday && slotDate.getTime() <= now.getTime();
      const taken = !past && deterministicTaken(data.day, minute, service.id);
      const selected = data.time === minute && !past && !taken;
      options.push(`<label class="time-choice${selected ? ' is-selected' : ''}${taken ? ' is-taken' : ''}${past ? ' is-past' : ''}">
        <input type="radio" name="time" value="${minute}" aria-label="${formatTime(minute)}${taken ? ', déjà pris, exemple' : past ? ', heure passée' : ''}"${taken || past ? ' disabled' : ''}${selected ? ' checked' : ''}>
        <span class="time-choice__text">${formatTime(minute)}</span>
        ${taken ? '<span class="time-choice__status">Déjà pris · exemple</span>' : past ? '<span class="time-choice__status">Passé</span>' : ''}
      </label>`);
    }
    timeList.innerHTML = options.length
      ? options.join('')
      : '<p class="time-empty">Aucun créneau ne tient dans cet horaire. Choisissez un autre jour.</p>';
    if (slotNote) slotNote.textContent = `Créneaux fictifs générés entre 09\u00a0h\u00a000 et 19\u00a0h\u00a000. Les heures disponibles, les dimanches et les jours fériés sont à confirmer.`;
  }

  function updateContactRecap() {
    const target = $('[data-contact-recap]', form);
    if (!target) return;
    const service = activeService();
    const day = data.day ? dateLabel(dateFromIso(data.day)) : 'jour à choisir';
    const time = data.time == null ? 'heure à choisir' : formatTime(data.time);
    target.textContent = `${service?.label || 'Soin à choisir'} · ${day} · ${time} · prix à confirmer.`;
  }

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (target.name === 'service') {
      data.service = target.value;
      data.time = null;
      setError('service', '');
      renderTimes();
      updateSummary();
      updateContactRecap();
    } else if (target.name === 'day') {
      data.day = target.value;
      data.time = null;
      setError('day', '');
      setError('time', '');
      $$('.day-choice', dayList).forEach((label) => label.classList.toggle('is-selected', $('input', label).checked));
      updateSummary();
      renderTimes();
      updateContactRecap();
    } else if (target.name === 'time') {
      data.time = Number(target.value);
      setError('time', '');
      $$('.time-choice', timeList).forEach((label) => label.classList.toggle('is-selected', $('input', label).checked));
      updateSummary();
      updateContactRecap();
    }
  });

  $('.service-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preselect-service]');
    if (!button) return;
    const radio = $(`input[name="service"][value="${button.dataset.preselectService}"]`, form);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (form.hidden) {
      form.hidden = false;
      success.hidden = true;
    }
    renderDays();
    updateSummary();
    showStep(2);
    $('#reserver').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  form.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    if (next) {
      const step = Number(next.closest('[data-step]').dataset.step);
      if (step === 1 && !activeService()) { setStepError('service', 'Choisissez un soin pour continuer.'); return; }
      if (step === 2 && !data.day) { setStepError('day', 'Choisissez un jour disponible.'); return; }
      if (step === 3 && data.time == null) { setStepError('time', 'Choisissez un créneau disponible.'); return; }
      if (step === 2) renderTimes();
      if (step === 3) updateContactRecap();
      showStep(step + 1);
    }
    if (back) {
      const step = Number(back.closest('[data-step]').dataset.step);
      showStep(step - 1);
    }
  });

  $('.selection')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-step]');
    if (!button || button.disabled) return;
    const step = Number(button.dataset.editStep);
    if (form.hidden) {
      form.hidden = false;
      success.hidden = true;
    }
    showStep(step);
  });

  function validFrenchMobile(value) {
    const digits = value.replace(/[\s.()-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(digits);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameField.value.trim();
    const phone = phoneField.value.trim();
    const nameOk = (name.match(/\p{L}/gu) || []).length >= 2;
    const phoneOk = validFrenchMobile(phone);
    setError('name', nameOk ? '' : 'Indiquez un prénom d’au moins deux lettres.');
    setError('phone', phoneOk ? '' : 'Indiquez un mobile français commençant par 06 ou 07.');
    if (!nameOk) { nameField.focus(); return; }
    if (!phoneOk) { phoneField.focus(); return; }

    const service = activeService();
    const day = data.day ? dateLabel(dateFromIso(data.day)) : '';
    const time = data.time == null ? '' : formatTime(data.time);
    successCopy.textContent = `${name}, ${service?.label || 'votre soin'} · ${day} à ${time} · tarif à confirmer avec le salon.`;
    form.hidden = true;
    success.hidden = false;
    success.classList.add('is-visible');
    successTitle.focus({ preventScroll: true });
    live.textContent = 'Récapitulatif prêt. Aucun rendez-vous n’a été transmis.';
  });

  $('[data-start-over]')?.addEventListener('click', () => {
    form.reset();
    data.service = null;
    data.day = null;
    data.time = null;
    data.transitioning = false;
    $$('.field-row input', form).forEach((field) => field.removeAttribute('aria-invalid'));
    $$('[data-error]', form).forEach((field) => { field.textContent = ''; });
    success.hidden = true;
    success.classList.remove('is-visible');
    form.hidden = false;
    renderDays();
    updateSummary();
    showStep(1, false);
    live.textContent = 'Simulation recommencée.';
  });

  renderDays();
  updateSummary();
  updateContactRecap();
})();
