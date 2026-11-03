(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let usingKeyboard = false;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ' || event.key.startsWith('Arrow')) {
      usingKeyboard = true;
      root.classList.add('keyboard-navigation');
    }
  });
  document.addEventListener('pointerdown', () => {
    usingKeyboard = false;
    root.classList.remove('keyboard-navigation');
  }, { passive: true });

  const revealElements = [...document.querySelectorAll('[data-reveal]')];
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => observer.observe(element));
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-loaded')));
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) {
        observer.disconnect();
        revealElements.forEach((element) => element.classList.add('is-visible'));
        root.classList.remove('motion-ready');
      }
    });
  }

  const services = {
    diagnostic: { name: 'Diagnostic capillaire', duration: 30 },
    coupe: { name: 'Coupe et coiffage femme, cheveux courts', duration: 30 },
    brushing: { name: 'Brushing femme, cheveux courts', duration: 30 }
  };
  // Horaires Planity relevés dans la recherche : lundi–samedi 09:00–20:00, dimanche fermé.
  const hours = { 0: null, 1: [540, 1200], 2: [540, 1200], 3: [540, 1200], 4: [540, 1200], 5: [540, 1200], 6: [540, 1200] };
  const state = { service: null, day: null, time: null, step: 0 };
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const navButtons = [...document.querySelectorAll('[data-go]')];
  const next = document.getElementById('next');
  const previous = document.getElementById('previous');
  const confirm = document.getElementById('confirm');
  const formError = document.getElementById('form-error');
  const announcement = document.getElementById('booking-announcement');
  const dayContainer = document.getElementById('days');
  const slotContainer = document.getElementById('slots');
  const success = document.getElementById('success');
  const firstname = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  let transitionTimer = null;
  let frameOne = null;
  let frameTwo = null;
  let transitionVersion = 0;
  let completed = false;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, minutes: +values.hour * 60 + +values.minute };
  }
  function dayObject(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function formatDay(key) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dayObject(key));
  }
  function formatTime(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  }
  function availableSlots(key) {
    const schedule = hours[dayObject(key).getUTCDay()];
    if (!schedule) return [];
    const now = parisNow();
    const duration = services[state.service]?.duration || 30;
    const seed = Math.floor(dayObject(key).getTime() / 86400000);
    const slots = [];
    for (let time = schedule[0]; time + duration <= schedule[1]; time += 30) {
      const past = key < now.date || (key === now.date && time <= now.minutes);
      const exampleUnavailable = ((seed + time / 30) % 7 === 2);
      slots.push({ time, past, disabled: past || exampleUnavailable });
    }
    return slots;
  }
  function choiceInput(name, value, disabled) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    return input;
  }
  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }
  function focusAndReveal(element) {
    if (!element) return;
    element.focus({ preventScroll: true });
    const visibleTarget = element.closest('label') || element;
    const bounds = visibleTarget.getBoundingClientRect();
    const barHeight = document.querySelector('.mobile-bar').getBoundingClientRect().height;
    if (bounds.top < 24 || bounds.bottom > window.innerHeight - barHeight - 16) {
      visibleTarget.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function renderDays() {
    dayContainer.replaceChildren();
    const now = parisNow();
    const start = dayObject(now.date);
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const key = dateKey(date);
      const closed = !hours[date.getUTCDay()];
      const elapsed = !closed && !availableSlots(key).some((slot) => !slot.disabled);
      const label = document.createElement('label'); label.className = 'choice';
      const input = choiceInput('jour', key, closed || elapsed);
      input.checked = state.day === key;
      const content = document.createElement('span');
      content.append(
        textElement('span', 'day-name', new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date)),
        textElement('span', 'day-number', new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date)),
        textElement('span', 'day-month', new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date))
      );
      if (closed || elapsed) content.append(textElement('small', 'day-status', closed ? 'Fermé' : 'Passé'));
      input.setAttribute('aria-label', `${formatDay(key)}${closed ? ', fermé' : elapsed ? ', passé' : ', simulation'}`);
      label.append(input, content); dayContainer.append(label);
    }
  }
  function renderSlots() {
    slotContainer.replaceChildren();
    const slots = availableSlots(state.day);
    if (!slots.some((slot) => !slot.disabled)) {
      slotContainer.append(textElement('p', 'empty-slots', 'Aucun créneau fictif restant ce jour. Revenez au choix du jour.'));
      return;
    }
    slots.forEach((slot) => {
      const label = document.createElement('label'); label.className = 'choice';
      const input = choiceInput('heure', slot.time, slot.disabled);
      input.checked = state.time === slot.time;
      const content = document.createElement('span');
      content.append(textElement('span', '', formatTime(slot.time)));
      if (slot.disabled) content.append(textElement('small', '', slot.past ? 'Passé' : 'Indisponible'));
      input.setAttribute('aria-label', `${formatTime(slot.time)}, ${slot.disabled ? slot.past ? 'passé' : 'indisponible, exemple' : 'créneau fictif'}`);
      label.append(input, content); slotContainer.append(label);
    });
  }
  function updateSummary() {
    document.getElementById('summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    document.getElementById('summary-day').textContent = state.day ? formatDay(state.day) : 'À choisir';
    document.getElementById('summary-time').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    const maximumStep = !state.service ? 0 : !state.day ? 1 : state.time === null ? 2 : 3;
    navButtons.forEach((button, index) => {
      button.disabled = completed || index > maximumStep;
      if (!completed && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(step, focus = true) {
    const oldStep = state.step;
    state.step = step;
    completed = false;
    clearTimeout(transitionTimer);
    cancelAnimationFrame(frameOne); cancelAnimationFrame(frameTwo);
    const version = ++transitionVersion;
    panels.forEach((panel) => panel.classList.remove('is-entering', 'is-leaving'));
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    formError.textContent = '';
    updateSummary();
    function commit() {
      if (version !== transitionVersion) return;
      panels.forEach((panel, index) => { panel.hidden = index !== step; });
      const panel = panels[step];
      panel.classList.remove('is-leaving');
      previous.hidden = step === 0;
      next.hidden = step === 3;
      confirm.hidden = step !== 3;
      if (!reduceMotion.matches && !usingKeyboard && oldStep !== step) {
        panel.classList.add('is-entering');
        frameOne = requestAnimationFrame(() => {
          frameTwo = requestAnimationFrame(() => {
            if (version === transitionVersion) panel.classList.remove('is-entering');
          });
        });
      }
      if (focus) focusAndReveal(panel.querySelector('h3'));
      announcement.textContent = `Étape ${step + 1} sur 4. ${panel.querySelector('h3').textContent}`;
    }
    if (!reduceMotion.matches && !usingKeyboard && oldStep !== step && !panels[oldStep].hidden) {
      panels[oldStep].classList.add('is-leaving');
      transitionTimer = setTimeout(commit, 100);
    } else commit();
  }
  function checkSlotStillValid() {
    if (!state.day || state.time === null) return false;
    return availableSlots(state.day).some((slot) => slot.time === state.time && !slot.disabled);
  }
  function announceError(message) {
    formError.textContent = message;
    announcement.textContent = message;
  }
  function focusChoice(name) {
    focusAndReveal(form.querySelector(`input[name="${name}"]:not(:disabled)`));
  }
  function resetFieldError(input) {
    input.removeAttribute('aria-invalid');
    document.getElementById(`erreur-${input.id}`).textContent = '';
  }
  function validateField(input) {
    const value = input.value.trim();
    let message = '';
    if (input === firstname && !/[\p{L}]/u.test(value)) message = 'Indiquez un prénom pour essayer le parcours.';
    if (input === phone && !/^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''))) message = 'Indiquez un mobile français commençant par 06, 07, +33 6 ou +33 7.';
    document.getElementById(`erreur-${input.id}`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !message;
  }
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') {
      if (state.service !== input.value) { state.day = null; state.time = null; }
      state.service = input.value;
    }
    if (input.name === 'jour') { if (state.day !== input.value) state.time = null; state.day = input.value; }
    if (input.name === 'heure') state.time = Number(input.value);
    formError.textContent = '';
    updateSummary();
  });
  next.addEventListener('click', () => {
    if (state.step === 0 && !state.service) {
      announceError('Choisissez une prestation pour continuer.'); focusChoice('prestation'); return;
    }
    if (state.step === 1 && !state.day) {
      announceError('Choisissez un jour pour continuer.'); focusChoice('jour'); return;
    }
    if (state.step === 2 && state.time === null) {
      announceError('Choisissez une heure pour continuer.'); focusChoice('heure'); return;
    }
    if (state.step === 2 && !checkSlotStillValid()) {
      state.time = null; renderSlots(); updateSummary();
      announceError('Ce créneau est maintenant passé. Choisissez une autre heure ou un autre jour.'); return;
    }
    showStep(Math.min(3, state.step + 1));
  });
  previous.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  navButtons.forEach((button) => button.addEventListener('click', () => {
    const step = Number(button.dataset.go);
    if (step === 3 && !checkSlotStillValid()) {
      state.time = null; showStep(2); announceError('Choisissez à nouveau une heure, ce créneau est passé.'); return;
    }
    showStep(step);
  }));
  document.querySelectorAll('[data-service]').forEach((link) => {
    link.addEventListener('click', () => {
      resetBooking(false);
      const service = link.dataset.service;
      if (!services[service]) return;
      state.service = service;
      form.querySelector(`input[name="prestation"][value="${service}"]`).checked = true;
      showStep(0);
    });
  });
  [firstname, phone].forEach((input) => {
    input.addEventListener('blur', () => { if (input.value.trim()) validateField(input); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) resetFieldError(input); });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 3) { next.click(); return; }
    if (!state.service || !state.day) { showStep(state.service ? 1 : 0); return; }
    if (!checkSlotStillValid()) {
      state.time = null; showStep(2); announceError('Ce créneau est maintenant passé. Choisissez une autre heure ou un autre jour.'); return;
    }
    const nameValid = validateField(firstname);
    const phoneValid = validateField(phone);
    if (!nameValid || !phoneValid) {
      announceError('Vérifiez les champs signalés avant de terminer.');
      focusAndReveal(!nameValid ? firstname : phone); return;
    }
    completed = true;
    document.getElementById('success-summary').textContent = `${firstname.value.trim()}, votre essai : ${services[state.service].name}, ${formatDay(state.day)} à ${formatTime(state.time)}.`;
    document.querySelector('.booking-body').hidden = true;
    success.hidden = false;
    updateSummary();
    focusAndReveal(success.querySelector('h3'));
    announcement.textContent = 'Simulation terminée. Aucun rendez-vous pris, rien envoyé au salon.';
    firstname.value = ''; phone.value = '';
  });
  function resetBooking(focus = true) {
    clearTimeout(transitionTimer); ++transitionVersion;
    form.reset();
    state.service = null; state.day = null; state.time = null; state.step = 0;
    completed = false;
    firstname.value = ''; phone.value = '';
    resetFieldError(firstname); resetFieldError(phone);
    document.getElementById('success-summary').textContent = '';
    success.hidden = true;
    document.querySelector('.booking-body').hidden = false;
    dayContainer.replaceChildren(); slotContainer.replaceChildren();
    showStep(0, focus);
  }
  document.getElementById('restart').addEventListener('click', () => resetBooking());
  document.getElementById('booking-interface').hidden = false;
  document.getElementById('booking-fallback').hidden = true;
  updateSummary();
})();
