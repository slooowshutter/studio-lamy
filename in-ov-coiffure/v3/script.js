(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  root.classList.add('js');

  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));

  const hero = $('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('is-ready')));

  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        activeObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const menuToggle = $('.menu-toggle');
  const navigation = $('#navigation');
  const navigationLinks = $$('#navigation a');

  function closeMenu(returnFocus = false) {
    if (!menuToggle || !navigation) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    if (returnFocus) menuToggle.focus();
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    navigation?.classList.toggle('is-open', !isOpen);
    if (!isOpen) navigationLinks[0]?.focus();
  });

  navigationLinks.forEach((link) => link.addEventListener('click', () => {
    const target = link.hash ? $(link.hash) : null;
    const heading = target?.querySelector('h1, h2');
    closeMenu();
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    }
  }));
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });

  const stickyBar = $('.mobile-bar');
  const bookingSection = $('#reserver');
  const footer = $('.site-footer');
  if (stickyBar && 'IntersectionObserver' in window) {
    const visibleSections = new Set();
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      const shouldHide = visibleSections.size > 0;
      stickyBar.classList.toggle('is-hidden', shouldHide);
      stickyBar.setAttribute('aria-hidden', String(shouldHide));
      if (shouldHide && stickyBar.contains(doc.activeElement)) {
        const heading = bookingSection?.querySelector('h2');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
          heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
        }
      }
      stickyBar.inert = shouldHide;
    }, { threshold: 0.08 });
    if (bookingSection) stickyObserver.observe(bookingSection);
    if (footer) stickyObserver.observe(footer);
  }

  const booking = $('[data-booking]');
  if (!booking) return;

  const steps = $$('[data-step]', booking);
  const progress = $$('[data-progress]', booking);
  const backButton = $('[data-back]', booking);
  const nextButton = $('[data-next]', booking);
  const confirmButton = $('[data-confirm]', booking);
  const daysContainer = $('[data-days]', booking);
  const timesContainer = $('[data-times]', booking);
  const contactForm = $('[data-contact-form]', booking);
  const state = { step: 1, date: null, dateLabel: '', time: '', name: '', phone: '', transitionTimer: null };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function localDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parisDateParts(date) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  }

  function dateLabel(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'Europe/Paris' }).format(date);
  }

  function createDateChoices() {
    if (!daysContainer) return;
    const parisToday = parisDateParts(new Date());
    const today = new Date(Date.UTC(parisToday.year, parisToday.month - 1, parisToday.day, 12));
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset, 12));
      const closed = date.getUTCDay() === 0;
      const button = doc.createElement('button');
      button.className = 'day-choice';
      button.type = 'button';
      button.disabled = closed;
      button.setAttribute('aria-pressed', 'false');
      button.dataset.date = localDateKey(date);
      button.setAttribute('aria-label', closed
        ? `${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })}, fermé`
        : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }));

      const weekday = doc.createElement('span');
      weekday.className = 'day-choice__weekday';
      weekday.textContent = dateLabel(date, { weekday: 'short' }).replace('.', '');
      const number = doc.createElement('span');
      number.className = 'day-choice__date';
      number.textContent = dateLabel(date, { day: 'numeric', month: 'short' }).replace('.', '');
      button.append(weekday, number);

      if (closed) {
        const closedLabel = doc.createElement('span');
        closedLabel.className = 'day-choice__closed';
        closedLabel.textContent = 'Fermé';
        button.append(closedLabel);
      }

      button.addEventListener('click', () => {
        $$('.day-choice', daysContainer).forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.date = button.dataset.date;
        state.dateLabel = dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' });
        state.time = '';
        updateSummary();
        createTimeChoices(date);
        clearError('day');
      });

      daysContainer.append(button);
    }
  }

  function createTimeChoices(date) {
    if (!timesContainer) return;
    timesContainer.replaceChildren();
    const now = new Date();
    const parisNow = parisDateParts(now);
    const todayKey = `${parisNow.year}-${String(parisNow.month).padStart(2, '0')}-${String(parisNow.day).padStart(2, '0')}`;
    const isToday = localDateKey(date) === todayKey;
    for (let hour = 9; hour <= 17; hour += 1) {
      const button = doc.createElement('button');
      button.className = 'time-choice';
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.textContent = `${hour} h 00`;
      button.dataset.time = `${String(hour).padStart(2, '0')}:00`;
      const isPast = isToday && hour * 60 <= parisNow.hour * 60 + parisNow.minute;
      button.disabled = isPast;
      if (isPast) button.setAttribute('aria-label', `${hour} h 00, heure passée`);

      button.addEventListener('click', () => {
        $$('.time-choice', timesContainer).forEach((choice) => choice.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        state.time = button.dataset.time;
        updateSummary();
        clearError('time');
      });

      timesContainer.append(button);
    }
  }

  function updateSummary() {
    const summaryDay = $('[data-summary-day]', booking);
    const summaryTime = $('[data-summary-time]', booking);
    if (summaryDay) summaryDay.textContent = state.dateLabel || 'Pas de jour choisi';
    if (summaryTime) summaryTime.textContent = state.time ? state.time.replace(':', ' h ') : 'Pas d’heure choisie';
    const recapDay = $('[data-recap="day"]', booking);
    const recapTime = $('[data-recap="time"]', booking);
    if (recapDay) recapDay.textContent = state.dateLabel || 'À choisir';
    if (recapTime) recapTime.textContent = state.time ? state.time.replace(':', ' h ') : 'À choisir';
  }

  function clearError(key) {
    const error = $(`[data-error="${key}"]`, booking);
    if (error) error.textContent = '';
    const input = key === 'name' ? $('#nom-client', booking) : key === 'phone' ? $('#telephone-client', booking) : null;
    input?.removeAttribute('aria-invalid');
  }

  function showError(key, message) {
    const error = $(`[data-error="${key}"]`, booking);
    if (error) error.textContent = message;
    const input = key === 'name' ? $('#nom-client', booking) : key === 'phone' ? $('#telephone-client', booking) : null;
    input?.setAttribute('aria-invalid', 'true');
    input?.focus();
  }

  function changeStep(nextStep) {
    if (state.transitionTimer) window.clearTimeout(state.transitionTimer);
    const current = steps.find((step) => Number(step.dataset.step) === state.step);
    const next = steps.find((step) => Number(step.dataset.step) === nextStep);
    if (!current || !next) return;

    current.classList.remove('is-active');
    current.inert = true;
    next.hidden = false;
    next.inert = false;
    next.classList.remove('is-active');
    void next.offsetWidth;
    requestAnimationFrame(() => next.classList.add('is-active'));
    state.step = nextStep;
    progress.forEach((item) => {
      const number = Number(item.dataset.progress);
      item.classList.toggle('is-current', number === nextStep);
      item.classList.toggle('is-done', number < nextStep);
    });
    if (backButton) backButton.hidden = nextStep <= 1 || nextStep >= 5;
    if (nextButton) nextButton.hidden = nextStep >= 4;
    if (nextButton) nextButton.disabled = true;
    if (backButton) backButton.disabled = true;
    if (confirmButton) confirmButton.disabled = true;
    const delay = reduceMotion ? 1 : 240;
    state.transitionTimer = window.setTimeout(() => {
      current.hidden = true;
      if (backButton) backButton.disabled = false;
      if (nextButton) nextButton.disabled = false;
      if (confirmButton) confirmButton.disabled = false;
      $('h3', next)?.focus();
    }, delay);
  }

  function validateContact() {
    const nameInput = $('#nom-client', booking);
    const phoneInput = $('#telephone-client', booking);
    const name = nameInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';
    if (name.length < 2) {
      showError('name', 'Indiquez un prénom de deux lettres au moins.');
      return false;
    }
    clearError('name');
    const normalizedPhone = phone.replace(/[\s().-]/g, '');
    const validFrenchMobile = /^(?:\+33|0033|0)[67]\d{8}$/.test(normalizedPhone);
    if (!validFrenchMobile) {
      showError('phone', 'Saisissez un numéro de mobile français valide.');
      return false;
    }
    clearError('phone');
    state.name = name;
    state.phone = phone;
    return true;
  }

  createDateChoices();
  updateSummary();

  nextButton?.addEventListener('click', () => {
    if (state.step === 1) {
      if (!state.date) {
        showError('day', 'Choisissez un jour pour poursuivre.');
        return;
      }
      changeStep(2);
      return;
    }
    if (state.step === 2) {
      if (!state.time) {
        showError('time', 'Choisissez une heure de départ pour poursuivre.');
        return;
      }
      changeStep(3);
      return;
    }
    if (state.step === 3 && validateContact()) changeStep(4);
  });

  backButton?.addEventListener('click', () => {
    if (state.step > 1 && state.step < 5) changeStep(state.step - 1);
  });

  contactForm?.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.id === 'nom-client' && input.value.trim().length >= 2) clearError('name');
    if (input.id === 'telephone-client' && /^(?:\+33|0033|0)[67]\d{8}$/.test(input.value.trim().replace(/[\s().-]/g, ''))) clearError('phone');
  });

  confirmButton?.addEventListener('click', () => {
    const message = $('[data-success-message]', booking);
    if (message) message.textContent = `${state.name}, votre sélection du ${state.dateLabel} à ${state.time.replace(':', ' h ')} est affichée. Rien n’a été envoyé ni réservé.`;
    changeStep(5);
  });
})();
