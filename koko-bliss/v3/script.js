(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  window.requestAnimationFrame(() => root.classList.add('is-ready'));

  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-inview');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-inview'));
  }

  const bar = document.querySelector('.mobile-bar');
  const heroActions = document.querySelector('#actions-hero');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');

  if (bar && heroActions && bookingSection && footer && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let heroHasPassed = false;
    let bookingVisible = false;
    let footerVisible = false;
    let hideTimer = 0;

    const updateBar = () => {
      const shouldShow = heroHasPassed && !heroVisible && !bookingVisible && !footerVisible;
      window.clearTimeout(hideTimer);
      if (shouldShow) {
        bar.hidden = false;
        bar.inert = false;
        window.requestAnimationFrame(() => bar.classList.add('is-visible'));
      } else if (!bar.hidden) {
        bar.classList.remove('is-visible');
        bar.inert = true;
        hideTimer = window.setTimeout(() => { bar.hidden = true; }, 280);
      }
    };

    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroActions) {
          heroVisible = entry.isIntersecting;
          if (!entry.isIntersecting && entry.boundingClientRect.bottom < 0) heroHasPassed = true;
        } else if (entry.target === bookingSection) {
          bookingVisible = entry.isIntersecting;
        } else if (entry.target === footer) {
          footerVisible = entry.isIntersecting;
        }
      });
      updateBar();
    }, { threshold: 0.05 });

    barObserver.observe(heroActions);
    barObserver.observe(bookingSection);
    barObserver.observe(footer);
  }

  const form = document.querySelector('#booking-form');
  if (!form) return;

  const panels = [...form.querySelectorAll('.booking-step')];
  const status = document.querySelector('#booking-status');
  const nextButton = document.querySelector('#booking-next');
  const backButton = document.querySelector('#booking-back');
  const dateList = document.querySelector('#date-list');
  const timeList = document.querySelector('#time-list');
  const summaryValue = document.querySelector('#selection-value');
  const summaryEdits = document.querySelector('#selection-edits');
  const nameInput = document.querySelector('#prenom');
  const phoneInput = document.querySelector('#telephone');
  const confirmation = document.querySelector('#confirmation-recap');
  const controls = form.querySelector('[data-controls]');

  const state = { step: 1, service: '', day: '', time: '' };
  const stepNames = ['', 'Choisir une prestation', 'Choisir un jour', 'Choisir une heure', 'Indiquer vos coordonnées'];

  function selectedDateLabel(value) {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(new Date(year, month - 1, day));
  }

  function updateSummary() {
    const parts = [];
    if (state.service) parts.push(state.service);
    if (state.day) parts.push(selectedDateLabel(state.day));
    if (state.time) parts.push(state.time.replace(':', '\u202fh\u202f'));
    summaryValue.textContent = parts.length ? parts.join(' · ') : 'Aucune prestation choisie';

    summaryEdits.replaceChildren();
    const edits = [
      [state.service, 1, 'Modifier la prestation'],
      [state.day, 2, 'Modifier le jour'],
      [state.time, 3, 'Modifier l’heure']
    ].filter(([value]) => Boolean(value));
    edits.forEach(([, target, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.goto = String(target);
      button.textContent = label;
      summaryEdits.append(button);
    });
    summaryEdits.hidden = edits.length === 0 || state.step === 5;
  }

  function setError(id, visible) {
    const error = document.querySelector(`#${id}`);
    if (error) error.hidden = !visible;
  }

  function showStep(step, moveFocus = true) {
    state.step = step;
    panels.forEach((panel) => {
      const active = Number(panel.dataset.step) === step;
      if (!active) {
        panel.classList.remove('is-active');
        panel.hidden = true;
        panel.setAttribute('aria-hidden', 'true');
      } else {
        panel.hidden = false;
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.remove('is-active');
        window.requestAnimationFrame(() => panel.classList.add('is-active'));
      }
    });

    if (step < 5) {
      status.textContent = `Étape ${step} sur 4 · ${stepNames[step]}`;
      controls.hidden = false;
      backButton.hidden = step === 1;
      nextButton.hidden = false;
      nextButton.type = step === 4 ? 'submit' : 'button';
      nextButton.textContent = step === 4 ? 'Terminer la simulation' : 'Continuer';
    } else {
      status.textContent = 'Simulation terminée';
      controls.hidden = true;
    }

    updateSummary();
    if (moveFocus) {
      const title = panels.find((panel) => Number(panel.dataset.step) === step)?.querySelector('.booking-step__title');
      window.setTimeout(() => title?.focus(), 0);
    }
  }

  function makeIsoDay(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildDates() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const choices = [];
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    for (let index = 0; index < 14; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      const iso = makeIsoDay(date);
      const label = fullDate.format(date);
      const shortDay = weekday.format(date).replace('.', '');
      const labelStart = index === 0 ? 'Aujourd’hui, ' : index === 1 ? 'Demain, ' : '';
      const visibleStart = index === 0 ? 'Auj.' : index === 1 ? 'Demain' : shortDay;
      const choice = document.createElement('label');
      choice.className = 'date-choice';
      choice.innerHTML = `<input type="radio" name="jour" value="${iso}" aria-label="${labelStart}${label}"><span class="date-choice__text"><span class="date-choice__weekday">${visibleStart}</span><time class="date-choice__number" datetime="${iso}">${date.getDate()}</time></span>`;
      choices.push(choice);
    }
    dateList.replaceChildren(...choices);
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function takenSlots(day) {
    const seed = Number(day.replaceAll('-', ''));
    const random = seededRandom(seed);
    const count = 2 + Math.floor(random() * 2);
    const taken = new Set();
    while (taken.size < count) taken.add(Math.floor(random() * 12));
    return taken;
  }

  function buildTimes(day) {
    const times = [];
    const busy = takenSlots(day);
    const now = new Date();
    const today = makeIsoDay(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let index = 0; index < 12; index += 1) {
      const hour = 8 + index;
      const value = `${String(hour).padStart(2, '0')}:00`;
      const isPast = day === today && hour * 60 <= currentMinutes;
      const isTaken = busy.has(index) && !isPast;
      const disabled = isPast || isTaken;
      const stateLabel = isPast ? 'Passé' : isTaken ? 'Déjà pris' : '';
      const frenchHour = `${hour}\u202fh`;
      const accessibleState = isPast ? ', heure passée' : isTaken ? ', déjà pris dans cette démonstration' : '';
      const choice = document.createElement('label');
      choice.className = 'time-choice';
      choice.innerHTML = `<input type="radio" name="heure" value="${value}" aria-label="${frenchHour}${accessibleState}"${disabled ? ' disabled' : ''}><span>${frenchHour}</span>${stateLabel ? `<span class="time-choice__state">${stateLabel}</span>` : ''}`;
      times.push(choice);
    }
    timeList.replaceChildren(...times);
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    if (input.name === 'prestation') {
      state.service = input.value;
      setError('erreur-prestation', false);
    } else if (input.name === 'jour') {
      state.day = input.value;
      state.time = '';
      buildTimes(state.day);
      setError('erreur-jour', false);
      setError('erreur-heure', false);
    } else if (input.name === 'heure') {
      state.time = input.value;
      setError('erreur-heure', false);
    }

    updateSummary();
  });

  nextButton.addEventListener('click', () => {
    if (state.step === 1) {
      if (!state.service) { setError('erreur-prestation', true); return; }
      showStep(2);
    } else if (state.step === 2) {
      if (!state.day) { setError('erreur-jour', true); return; }
      showStep(3);
    } else if (state.step === 3) {
      if (!state.time) { setError('erreur-heure', true); return; }
      showStep(4);
    }
  });

  backButton.addEventListener('click', () => {
    if (state.step > 1 && state.step < 5) showStep(state.step - 1);
  });

  summaryEdits.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-goto]');
    if (button) showStep(Number(button.dataset.goto));
  });

  function validFrenchMobile(value) {
    const compact = value.trim().replace(/[\s().-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(compact);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 4) return;

    const name = nameInput.value.trim();
    const phoneValid = validFrenchMobile(phoneInput.value);
    setError('erreur-prenom', !name);
    setError('erreur-telephone', !phoneValid);
    nameInput.setAttribute('aria-invalid', String(!name));
    phoneInput.setAttribute('aria-invalid', String(!phoneValid));

    if (!name) { nameInput.focus(); return; }
    if (!phoneValid) { phoneInput.focus(); return; }

    const recap = `${state.service} · ${selectedDateLabel(state.day)} à ${state.time.replace(':', '\u202fh\u202f')}.`;
    confirmation.textContent = `Votre sélection simulée : ${recap}`;
    nameInput.value = '';
    phoneInput.value = '';
    showStep(5);
  });

  nameInput.addEventListener('input', () => {
    if (nameInput.value.trim()) {
      setError('erreur-prenom', false);
      nameInput.setAttribute('aria-invalid', 'false');
    }
  });

  phoneInput.addEventListener('input', () => {
    if (validFrenchMobile(phoneInput.value)) {
      setError('erreur-telephone', false);
      phoneInput.setAttribute('aria-invalid', 'false');
    }
  });

  buildDates();
  showStep(1, false);
})();
