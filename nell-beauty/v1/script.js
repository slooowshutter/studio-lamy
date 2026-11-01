(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardMode = false;
  document.addEventListener('keydown', () => {
    keyboardMode = true;
    root.classList.add('keyboard-mode');
  });
  document.addEventListener('pointerdown', () => {
    keyboardMode = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  // Préparer d’abord les observateurs ; un échec laisse le contenu lisible.
  const revealTargets = [...document.querySelectorAll('[data-reveal]')];
  let revealObserver;
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    revealTargets.forEach(target => revealObserver.observe(target));
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector('.hero').classList.add('is-ready');
    }));
  }

  const services = new Map([
    ['microshading', 'Microshading'],
    ['microblading', 'Microblading'],
    ['candy-lips', 'Candy Lips'],
    ['eye-liner', 'Eye-liner']
  ]);
  const duration = 120;
  // Plages PagesJaunes uniquement : les annuaires ne sont pas concordants.
  const hours = [
    [660, 1080], [600, 1080], [600, 1080], [600, 1080],
    [600, 1080], [600, 1080], [600, 1080]
  ];
  const state = { step: 0, service: '', date: '', time: '', completed: false };
  const form = document.getElementById('reservation');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const dayFieldset = document.getElementById('jours');
  const timeFieldset = document.getElementById('heures');
  const firstName = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  const announcer = document.getElementById('annonce-etape');
  const stepNames = ['Prestation', 'Jour', 'Heure', 'Coordonnées', 'Fin de la simulation'];
  let panelAnimation;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
      key: `${values.year}-${values.month}-${values.day}`,
      date: new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12)),
      minute: Number(values.hour) * 60 + Number(values.minute)
    };
  }

  function dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function fromKey(key) {
    return new Date(`${key}T12:00:00Z`);
  }

  function formatDate(key) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(fromKey(key));
  }

  function formatTime(value) {
    const minute = Number(value);
    const remainder = minute % 60;
    return `${Math.floor(minute / 60)}\u00a0h${remainder ? `\u00a0${String(remainder).padStart(2, '0')}` : ''}`;
  }

  function slotsFor(key) {
    const now = parisNow();
    const date = fromKey(key);
    const [opening, closing] = hours[date.getUTCDay()];
    const slots = [];
    for (let minute = opening; minute + duration <= closing; minute += 30) {
      slots.push({ minute, past: key < now.key || (key === now.key && minute <= now.minute) });
    }
    return slots;
  }

  function clearChoices(fieldset) {
    fieldset.querySelectorAll('label, .empty-slots').forEach(node => node.remove());
  }

  function makeRadio(name, value, disabled, description) {
    const label = document.createElement('label');
    label.className = 'choice-label';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', description);
    input.setAttribute('aria-describedby', `erreur-${name}`);
    label.append(input);
    return { label, input };
  }

  function addText(parent, text, className) {
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    parent.append(span);
  }

  function renderDays() {
    clearChoices(dayFieldset);
    const now = parisNow();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = dateKey(date);
      const disabled = !slotsFor(key).some(slot => !slot.past);
      const { label, input } = makeRadio('jour', key, disabled, `${formatDate(key)}${disabled ? ', journée écoulée' : ', date de simulation'}`);
      input.checked = state.date === key && !disabled;
      addText(label, new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date), 'choice-day-name');
      addText(label, String(date.getUTCDate()), 'choice-day-number');
      addText(label, new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date), 'choice-month');
      if (disabled) addText(label, 'Écoulé', 'choice-status');
      dayFieldset.append(label);
    }
  }

  function renderTimes() {
    clearChoices(timeFieldset);
    if (!state.date) return;
    for (const slot of slotsFor(state.date)) {
      const value = String(slot.minute);
      const { label, input } = makeRadio('heure', value, slot.past,
        `${formatTime(value)}${slot.past ? ', heure passée' : ', créneau de simulation'}`);
      input.checked = state.time === value && !slot.past;
      addText(label, formatTime(value));
      timeFieldset.append(label);
    }
  }

  function setError(name, message) {
    document.getElementById(`erreur-${name}`).textContent = message;
  }

  function selectionText() {
    return [services.get(state.service) || 'Une prestation à choisir',
      state.date ? formatDate(state.date) : 'jour à choisir',
      state.time ? formatTime(state.time) : 'heure à choisir'].join(' · ');
  }

  function updateSummary(announce = false) {
    document.getElementById('selection-prestation').textContent = services.get(state.service) || 'À choisir';
    document.getElementById('selection-jour').textContent = state.date ? formatDate(state.date) : 'À choisir';
    document.getElementById('selection-heure').textContent = state.time ? formatTime(state.time) : 'À choisir';
    document.getElementById('selection-mobile').textContent = selectionText();
    if (announce) document.getElementById('annonce-selection').textContent = `Votre sélection : ${selectionText()}.`;
    const complete = [Boolean(state.service), Boolean(state.date), Boolean(state.time), state.completed];
    document.querySelectorAll('.selection-rules i').forEach((rule, index) => rule.classList.toggle('is-complete', complete[index]));
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || (index > 0 && !state.service) || (index > 1 && !state.date) || (index > 2 && !state.time);
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function reconcileSelection() {
    if (!state.date) return '';
    const slots = slotsFor(state.date);
    if (!slots.some(slot => !slot.past)) {
      state.date = '';
      state.time = '';
      return 'jour';
    }
    if (state.time && !slots.some(slot => String(slot.minute) === state.time && !slot.past)) {
      state.time = '';
      return 'heure';
    }
    return '';
  }

  function showStep(index, focus = true) {
    const previous = state.step;
    if (panelAnimation) panelAnimation.cancel();
    const expired = state.completed ? '' : reconcileSelection();
    if (index > 0 && index < 4 && !state.service) index = 0;
    if (index > 1 && index < 4 && !state.date) index = 1;
    if (index > 2 && index < 4 && !state.time) index = 2;
    state.step = index;
    panels.forEach((panel, number) => { panel.hidden = number !== index; });
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    updateSummary();
    if (expired === 'jour') setError('jour', 'Cette journée est passée. Choisissez un autre jour pour la simulation.');
    if (expired === 'heure') setError('heure', 'Cette heure est passée. Choisissez une autre heure pour la simulation.');
    announcer.textContent = index < 4 ? `Étape ${index + 1} sur 4 : ${stepNames[index]}. Simulation sans envoi.` : 'Simulation terminée. Aucun rendez-vous n’a été pris.';
    const current = panels[index];
    if (!reducedMotion.matches && !keyboardMode && current.animate) {
      panelAnimation = current.animate([
        { opacity: 0, transform: `translateX(${index >= previous ? 10 : -10}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 230, easing: 'cubic-bezier(.23, 1, .32, 1)' });
    }
    if (focus) current.querySelector('h3').focus({ preventScroll: false });
  }

  function selectService(value) {
    if (!services.has(value)) return;
    state.service = value;
    state.date = '';
    state.time = '';
    state.completed = false;
    form.querySelectorAll('input[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    setError('prestation', '');
    setError('jour', '');
    setError('heure', '');
    updateSummary(true);
  }

  function focusChoice(name) {
    const input = form.querySelector(`input[name="${name}"]:not(:disabled)`);
    if (input) input.focus();
  }

  function next() {
    const expired = reconcileSelection();
    if (expired && state.step >= 1) {
      showStep(expired === 'jour' ? 1 : 2);
      setError(expired, expired === 'jour'
        ? 'Cette journée est passée. Choisissez un autre jour pour la simulation.'
        : 'Cette heure est passée. Choisissez une autre heure pour la simulation.');
      return;
    }
    if (state.step === 0 && !state.service) {
      setError('prestation', 'Choisissez une prestation pour continuer.');
      focusChoice('prestation');
      return;
    }
    if (state.step === 1 && !state.date) {
      setError('jour', 'Choisissez un jour pour continuer.');
      focusChoice('jour');
      return;
    }
    if (state.step === 2 && !state.time) {
      setError('heure', 'Choisissez une heure pour continuer.');
      focusChoice('heure');
      return;
    }
    if (state.step < 3) showStep(state.step + 1);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      state.date = input.value;
      state.time = '';
      setError('jour', '');
      setError('heure', '');
    }
    if (input.name === 'heure') {
      state.time = input.value;
      setError('heure', '');
    }
    updateSummary(true);
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', next));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Math.max(0, state.step - 1))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    selectService(link.dataset.service);
    showStep(1, false);
    document.getElementById('reserver').scrollIntoView({ behavior: reducedMotion.matches || keyboardMode ? 'instant' : 'smooth', block: 'start' });
    panels[1].querySelector('h3').focus({ preventScroll: true });
  }));

  function validateContact() {
    const validName = firstName.value.trim().length > 0;
    const normalizedPhone = phone.value.replace(/[\s.()\-]/g, '');
    const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalizedPhone);
    setError('prenom', validName ? '' : 'Indiquez un prénom pour terminer l’essai.');
    setError('telephone', validPhone ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.');
    firstName.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName) firstName.focus();
    else if (!validPhone) phone.focus();
    return validName && validPhone;
  }

  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    if (input.hasAttribute('aria-invalid')) {
      input.removeAttribute('aria-invalid');
      setError(input.name, '');
    }
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) { next(); return; }
    if (state.completed || !validateContact()) return;
    if (!state.service || !state.date || !state.time) { showStep(0); return; }
    const slot = slotsFor(state.date).find(candidate => String(candidate.minute) === state.time);
    if (!slot || slot.past) {
      state.time = '';
      showStep(2);
      setError('heure', 'Cette heure est passée. Choisissez une autre heure pour poursuivre la simulation.');
      return;
    }
    document.getElementById('success-recap').textContent = `${services.get(state.service)} — ${formatDate(state.date)}, à ${formatTime(state.time)}. Sélection de démonstration.`;
    state.completed = true;
    // L’essai ne conserve pas les coordonnées après la dernière étape.
    firstName.value = '';
    phone.value = '';
    showStep(4);
  });

  document.getElementById('recommencer').addEventListener('click', () => {
    form.reset();
    state.service = '';
    state.date = '';
    state.time = '';
    state.completed = false;
    ['prestation', 'jour', 'heure', 'prenom', 'telephone'].forEach(name => setError(name, ''));
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    showStep(0);
  });

  form.querySelectorAll('input[name="prestation"]').forEach(input => input.setAttribute('aria-describedby', 'erreur-prestation'));
  document.getElementById('parcours').hidden = false;
  updateSummary();

  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    if (panelAnimation) panelAnimation.cancel();
    if (revealObserver) revealObserver.disconnect();
    revealTargets.forEach(target => target.classList.add('is-visible'));
    document.querySelector('.hero').classList.add('is-ready');
  });
})();
