/* David & Laurent : récit en chapitres, sans envoi de données. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

  const observed = document.querySelectorAll('.reveal-number, .reveal-line, [data-signature]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    observed.forEach(element => observer.observe(element));
  } else {
    observed.forEach(element => element.classList.add('is-visible'));
  }

  const progress = document.getElementById('progression');
  let framePending = false;
  let pageRange = 1;
  const measurePage = () => { pageRange = Math.max(1, root.scrollHeight - window.innerHeight); };
  const paintProgress = () => {
    framePending = false;
    if (!reduce.matches) progress.style.transform = `scaleY(${Math.max(.001, Math.min(1, window.scrollY / pageRange))})`;
  };
  const requestProgress = () => {
    if (!framePending) { framePending = true; requestAnimationFrame(paintProgress); }
  };
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', () => { measurePage(); requestProgress(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measurePage(); requestProgress(); }).observe(document.body);
  document.fonts?.ready.then(() => { measurePage(); requestProgress(); });
  measurePage();
  paintProgress();

  let keyboardAction = false;
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboardAction = true;
      root.classList.add('navigation-clavier');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboardAction = false;
    root.classList.remove('navigation-clavier');
  }, { passive: true });

  const services = {
    coloration: { title: 'Coloration', person: 'David' },
    meches: { title: 'Mèches', person: 'David' },
    coupe: { title: 'Coupe', person: 'Laurent' }
  };
  // Horaires Fresha : à confirmer. Seulement des heures de début, aucune durée attribuée.
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1080], 5: [540, 1140], 6: [540, 1140] };
  const state = { service: '', day: '', time: '', step: 0, maxStep: 0 };
  const demo = document.getElementById('simulateur');
  const form = document.getElementById('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const status = document.getElementById('booking-status');
  let transitionTimer;
  let enterFrame;
  const todayInParis = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = type => Number(parts.find(part => part.type === type).value);
    return { date: new Date(Date.UTC(get('year'), get('month') - 1, get('day'), 12)), minute: get('hour') * 60 + get('minute') };
  };
  const dateKey = date => date.toISOString().slice(0, 10);
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const formatDate = key => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(dateFromKey(key));
  const formatTime = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  const isPast = (key, minute) => {
    const today = todayInParis();
    return key < dateKey(today.date) || (key === dateKey(today.date) && minute <= today.minute);
  };
  const updateSummary = () => {
    const service = services[state.service];
    document.getElementById('summary-service').textContent = service ? service.title : 'Couleur ou coupe\u00a0?';
    document.getElementById('summary-person').textContent = service ? `${service.person}, selon le Petit Futé` : 'À choisir';
    document.getElementById('summary-day').textContent = state.day ? formatDate(state.day) : 'À choisir';
    document.getElementById('summary-time').textContent = state.time !== '' ? formatTime(Number(state.time)) : 'À choisir';
    document.getElementById('confirmation-recap').textContent = service && state.day && state.time !== '' ? `Votre sélection simulée\u00a0: ${service.title}, ${formatDate(state.day)}, à ${formatTime(Number(state.time))}. Tarif et durée à confirmer au salon.` : '';
  };
  const setError = (id, message) => { document.getElementById(id).textContent = message; };
  const refreshSteps = () => {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.maxStep || state.step === 4;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  };
  const focusPanel = index => {
    panels[index].querySelector('h3').focus({ preventScroll: true });
    status.textContent = index === 4 ? 'Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.' : `Étape ${index + 1} sur 4. ${panels[index].querySelector('h3').textContent}`;
    const heading = panels[index].querySelector('h3');
    const bounds = heading.getBoundingClientRect();
    if (bounds.top < 20 || bounds.bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'center', behavior: 'instant' });
  };
  const showStep = (index, animate = true) => {
    clearTimeout(transitionTimer);
    cancelAnimationFrame(enterFrame);
    const oldPanel = panels[state.step];
    const panel = panels[index];
    const moving = animate && !reduce.matches && !keyboardAction && oldPanel !== panel;
    panels.forEach(item => {
      item.classList.remove('entering', 'leaving');
      item.hidden = item !== panel;
      item.inert = false;
      item.removeAttribute('aria-hidden');
    });
    state.step = index;
    state.maxStep = Math.max(state.maxStep, Math.min(index, 3));
    refreshSteps();
    if (moving) {
      oldPanel.hidden = false;
      oldPanel.inert = true;
      oldPanel.setAttribute('aria-hidden', 'true');
      oldPanel.classList.add('leaving');
      panel.classList.add('entering');
      // Une seule mesure prépare la transition simultanée, sans retarder les contrôles.
      panel.getBoundingClientRect();
      enterFrame = requestAnimationFrame(() => panel.classList.remove('entering'));
      transitionTimer = setTimeout(() => {
        oldPanel.hidden = true;
        oldPanel.inert = false;
        oldPanel.removeAttribute('aria-hidden');
        oldPanel.classList.remove('leaving');
      }, 240);
    }
    focusPanel(index);
    measurePage();
  };
  const makeDay = (date, today) => {
    const key = dateKey(date);
    const range = hours[date.getUTCDay()];
    const expired = key < dateKey(today.date) || (key === dateKey(today.date) && range && today.minute >= range[1] - 60);
    const disabled = !range || expired;
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
    const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
    const label = document.createElement('label');
    label.className = 'day-choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'jour'; input.value = key; input.disabled = !!disabled;
    input.checked = key === state.day;
    input.setAttribute('aria-label', `${formatDate(key)}${!range ? ', fermé selon les horaires publiés' : expired ? ', passé' : ', simulation'}`);
    const face = document.createElement('span'); face.className = 'day-face';
    const top = document.createElement('span'); top.textContent = weekday;
    const day = document.createElement('strong'); day.textContent = date.getUTCDate();
    const bottom = document.createElement('span'); bottom.textContent = !range ? 'Fermé' : expired ? 'Passé' : month;
    face.append(top, day, bottom); label.append(input, face);
    return label;
  };
  const renderDays = () => {
    const today = todayInParis();
    const days = document.getElementById('days');
    days.replaceChildren();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(today.date); date.setUTCDate(date.getUTCDate() + offset);
      days.append(makeDay(date, today));
    }
    const selected = days.querySelector('input:checked');
    if (state.day && (!selected || selected.disabled)) { state.day = ''; state.time = ''; }
  };
  const renderSlots = () => {
    const slots = document.getElementById('slots');
    slots.replaceChildren();
    document.getElementById('selected-day').textContent = state.day ? formatDate(state.day) : '';
    if (!state.day) return;
    const range = hours[dateFromKey(state.day).getUTCDay()];
    if (!range) return;
    let available = 0;
    for (let minute = range[0]; minute < range[1]; minute += 60) {
      const label = document.createElement('label'); label.className = 'slot-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = minute;
      input.checked = String(minute) === String(state.time); input.disabled = isPast(state.day, minute);
      input.setAttribute('aria-label', `${formatTime(minute)}${input.disabled ? ', passé' : ', heure de démonstration'}`);
      const text = document.createElement('span'); text.textContent = formatTime(minute);
      label.append(input, text); slots.append(label);
      if (!input.disabled) available++;
    }
    if (!available) {
      const empty = document.createElement('p'); empty.className = 'slot-empty';
      empty.textContent = 'Les heures proposées sont passées. Revenez au choix du jour.'; slots.append(empty);
    }
    const selected = slots.querySelector('input:checked');
    if (state.time !== '' && (!selected || selected.disabled)) state.time = '';
  };
  const selectService = value => {
    state.service = value;
    const radio = form.querySelector(`input[name="prestation"][value="${value}"]`);
    if (radio) radio.checked = true;
    setError('service-error', '');
    updateSummary();
  };
  form.addEventListener('change', event => {
    if (event.target.name === 'prestation') selectService(event.target.value);
    if (event.target.name === 'jour') {
      state.day = event.target.value; state.time = ''; state.maxStep = Math.min(state.maxStep, 2);
      setError('day-error', ''); renderSlots(); updateSummary(); refreshSteps();
    }
    if (event.target.name === 'heure') { state.time = event.target.value; setError('time-error', ''); updateSummary(); }
  });
  document.getElementById('service-next').addEventListener('click', () => {
    if (!state.service) { setError('service-error', 'Choisissez une prestation pour continuer.'); form.querySelector('[name="prestation"]').focus(); return; }
    renderDays(); showStep(1);
  });
  document.getElementById('day-next').addEventListener('click', () => {
    renderDays();
    if (!state.day) { setError('day-error', 'Choisissez un jour de démonstration pour continuer.'); document.querySelector('#days input:not(:disabled)')?.focus(); return; }
    renderSlots(); updateSummary(); showStep(2);
  });
  document.getElementById('time-next').addEventListener('click', () => {
    if (state.time === '' || isPast(state.day, Number(state.time))) {
      renderSlots(); setError('time-error', 'Choisissez une heure de début encore à venir.');
      document.querySelector('#slots input:not(:disabled)')?.focus(); return;
    }
    showStep(3);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.step);
    if (index > state.maxStep) return;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    updateSummary(); showStep(index);
  }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.service); state.maxStep = Math.max(state.maxStep, 1);
    renderDays(); showStep(1, false);
  }));
  const validateField = input => {
    const isName = input.id === 'first-name';
    const cleanPhone = input.value.replace(/[\s.()\-]/g, '');
    const valid = isName ? input.value.trim().length >= 1 : /^(?:0|\+33|0033)[67]\d{8}$/.test(cleanPhone);
    const errorId = isName ? 'name-error' : 'phone-error';
    setError(errorId, valid ? '' : isName ? 'Indiquez un prénom pour terminer l’essai.' : 'Indiquez un portable français commençant par 06, 07 ou +33.');
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  };
  const nameInput = document.getElementById('first-name');
  const phoneInput = document.getElementById('phone');
  [nameInput, phoneInput].forEach(input => input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validateField(input); }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const goodName = validateField(nameInput); const goodPhone = validateField(phoneInput);
    if (!goodName || !goodPhone) { (!goodName ? nameInput : phoneInput).focus(); return; }
    if (!state.day || state.time === '' || isPast(state.day, Number(state.time))) {
      renderDays(); renderSlots(); updateSummary(); showStep(1);
      setError('day-error', 'Le créneau d’essai est passé. Choisissez un autre jour.'); return;
    }
    document.getElementById('result-summary').textContent = `Votre essai\u00a0: ${services[state.service].title.toLowerCase()}, ${formatDate(state.day)}, à ${formatTime(Number(state.time))}.`;
    nameInput.value = ''; phoneInput.value = '';
    showStep(4);
  });
  document.getElementById('restart').addEventListener('click', () => {
    form.reset(); Object.assign(state, { service: '', day: '', time: '', maxStep: 0 });
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    document.getElementById('result-summary').textContent = '';
    renderDays(); updateSummary(); showStep(0);
  });
  demo.hidden = false;
  renderDays(); updateSummary(); refreshSteps(); measurePage();
})();
