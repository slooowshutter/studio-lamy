/* L’atelier Gonzag — aperçu local. Aucune donnée n’est envoyée ni conservée. */
(() => {
  'use strict';

  const SERVICES = [
    { id: 'coupe-courte', name: 'Shampoing + Coupe + Séchage court', duration: 50 },
    { id: 'coupe-homme', name: 'Coupe Homme', duration: 30 },
    { id: 'brushing', name: 'Shampoing + Brushing Cheveux Courts', duration: 30 },
    { id: 'coloration', name: 'Coloration racines + shampoing/soin brushing cheveux courts', duration: 90 }
  ];
  // Planity : mardi 9 h 30 (à confirmer), mercredi–vendredi 9 h, samedi 9 h.
  // Tableau indexé par jour UTC ; les dates du calendrier représentent midi à Paris.
  const HOURS = [null, null, [570, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1020]];
  const DAY_MS = 86400000;
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });

  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(instant).map(p => [p.type, p.value]));
    return { day: Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12), minute: +parts.hour * 60 + +parts.minute };
  }
  function formatTime(minute) {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function formatDuration(minute) {
    return minute < 60 ? `${minute}\u00a0min` : formatTime(minute);
  }
  function buildSlots(day, duration, now = parisNow()) {
    const opening = HOURS[new Date(day).getUTCDay()];
    if (!opening || day < now.day) return [];
    const result = [];
    for (let minute = opening[0]; minute + duration <= opening[1]; minute += 30) {
      const past = day === now.day && minute <= now.minute;
      const excluded = (Math.floor(day / DAY_MS) + minute / 30) % 7 === 0;
      result.push({ minute, disabled: past || excluded, reason: past ? 'Passé' : excluded ? 'Écarté' : '' });
    }
    return result;
  }
  function normalizePhone(value) {
    return value.replace(/[\s.()–-]/g, '');
  }
  function validPhone(value) {
    return /^(?:0|\+33|0033)[1-9]\d{8}$/.test(normalizePhone(value));
  }

  // Interface : tout ce qui précède est indépendant du document.
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const state = { service: null, day: null, slot: null, step: 0, completed: false };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  let animation = null;
  let keyboard = false;

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard-mode');
      if (animation) { animation.cancel(); animation = null; }
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  function makeOption(name, value, content, disabled = false, kind = '') {
    const label = document.createElement('label');
    label.className = `option ${kind}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.disabled = disabled;
    label.append(input, content);
    return label;
  }
  function textSpan(text, className = '') {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }
  function renderServices() {
    const container = $('#service-options');
    SERVICES.forEach(service => {
      const content = document.createElement('span');
      content.append(textSpan(service.name, 'option__name'), textSpan(formatDuration(service.duration), 'option__duration'));
      const label = makeOption('prestation', service.id, content);
      label.querySelector('input').addEventListener('change', () => selectService(service.id));
      container.append(label);
    });
  }
  function selectService(id) {
    const selected = SERVICES.find(service => service.id === id);
    if (!selected) return;
    if (state.service?.id !== id) { state.day = null; state.slot = null; }
    state.service = selected;
    state.completed = false;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    $('#service-error').textContent = '';
    updateSummary();
  }
  function renderDays() {
    const container = $('#day-options');
    container.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = 'Choisissez un jour d’essai';
    container.append(legend);
    const now = parisNow();
    for (let i = 0; i < 14; i++) {
      const day = now.day + i * DAY_MS;
      const date = new Date(day);
      const opening = HOURS[date.getUTCDay()];
      const hasSlots = opening && buildSlots(day, state.service.duration, now).some(slot => !slot.disabled);
      const content = document.createElement('span');
      content.className = 'option__name';
      content.append(textSpan(dayFormatter.format(date)));
      const number = document.createElement('strong');
      number.textContent = String(date.getUTCDate());
      content.append(number);
      const foot = document.createElement('small');
      foot.textContent = !opening ? 'Fermé' : !hasSlots ? 'Écoulé' : monthFormatter.format(date);
      content.append(foot);
      const option = makeOption('jour', day, content, !hasSlots, 'day-option');
      const input = option.querySelector('input');
      input.setAttribute('aria-label', `${fullDateFormatter.format(date)}${!opening ? ', fermé' : !hasSlots ? ', aucun créneau restant dans l’exemple' : ', exemple'}`);
      input.checked = day === state.day;
      input.addEventListener('change', () => {
        if (state.day !== day) state.slot = null;
        state.day = day;
        $('#day-error').textContent = '';
        updateSummary();
      });
      container.append(option);
    }
  }
  function renderSlots() {
    const container = $('#slot-options');
    container.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = 'Choisissez un créneau d’essai';
    container.append(legend);
    $('#slot-day').textContent = fullDateFormatter.format(new Date(state.day));
    buildSlots(state.day, state.service.duration).forEach(slot => {
      const content = document.createElement('span');
      content.className = 'option__name';
      content.append(textSpan(formatTime(slot.minute)));
      if (slot.disabled) {
        const reason = document.createElement('small');
        reason.textContent = slot.reason;
        content.append(reason);
      }
      const label = makeOption('heure', slot.minute, content, slot.disabled, 'slot-option');
      const input = label.querySelector('input');
      input.checked = state.slot === slot.minute;
      input.addEventListener('change', () => {
        state.slot = slot.minute;
        $('#slot-error').textContent = '';
        updateSummary();
      });
      container.append(label);
    });
  }
  function summaryText() {
    if (!state.service) return '';
    return `${state.service.name} · ${fullDateFormatter.format(new Date(state.day))} à ${formatTime(state.slot)} · ${formatDuration(state.service.duration)}. Simulation uniquement.`;
  }
  function updateSummary() {
    $('#recap-service').textContent = state.service ? state.service.name : 'Votre place vous attend.';
    $('#recap-date').textContent = state.day ? `${fullDateFormatter.format(new Date(state.day))}${state.slot !== null ? ` à ${formatTime(state.slot)}` : ''}` : 'Choisissez une prestation, puis un jour.';
    $('#recap-duration').textContent = state.service ? `Durée publiée : ${formatDuration(state.service.duration)}` : '';
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.slot === null);
    });
    if (state.day && state.slot !== null) $('#final-recap').textContent = summaryText();
  }
  function animatePanel(panel) {
    if (animation) { animation.cancel(); animation = null; }
    if (reducedMotion.matches || keyboard || !panel.animate) return;
    const currentAnimation = panel.animate(
      [{ opacity: 0, transform: 'translateY(9px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 240, easing: 'cubic-bezier(.23, 1, .32, 1)' }
    );
    animation = currentAnimation;
    currentAnimation.finished.then(() => {
      if (animation === currentAnimation) animation = null;
    }).catch(() => {});
  }
  function goToStep(index, focus = true) {
    if (index > 0 && !state.service) return;
    if (index > 1 && !state.day) return;
    if (index > 2 && state.slot === null) return;
    state.step = index;
    state.completed = false;
    $('#booking-success').hidden = true;
    form.hidden = false;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    stepButtons.forEach((button, i) => {
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary();
    animatePanel(panels[index]);
    if (focus) panels[index].querySelector('h3').focus();
    $('#booking-announcement').textContent = `Étape ${index + 1} sur 4 : ${panels[index].querySelector('h3').textContent}`;
  }
  function showError(id, message, selector) {
    $(id).textContent = message;
    const target = $(selector);
    if (target) target.focus();
  }
  function validSlot() {
    return state.day && state.service && buildSlots(state.day, state.service.duration).some(slot => slot.minute === state.slot && !slot.disabled);
  }
  function validateNext(next) {
    if (next === 1 && !state.service) {
      showError('#service-error', 'Choisissez une prestation pour continuer.', 'input[name="prestation"]');
      return;
    }
    if (next === 2 && !state.day) {
      showError('#day-error', 'Choisissez un jour d’essai pour continuer.', 'input[name="jour"]:not(:disabled)');
      return;
    }
    if (next === 3 && !validSlot()) {
      state.slot = null;
      renderSlots();
      updateSummary();
      showError('#slot-error', 'Choisissez un créneau d’essai encore à venir.', 'input[name="heure"]:not(:disabled)');
      return;
    }
    goToStep(next);
  }

  renderServices();
  $('#simulateur').hidden = false;
  $$('[data-next]').forEach(button => button.addEventListener('click', () => validateNext(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.step))));
  $$('[data-select-service]').forEach(button => button.addEventListener('click', () => {
    selectService(button.dataset.selectService);
    goToStep(1);
    $('#simulateur').scrollIntoView({ block: 'start', behavior: reducedMotion.matches || keyboard ? 'instant' : 'smooth' });
  }));
  ['first-name', 'phone'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      $(id === 'phone' ? '#phone-error' : '#name-error').textContent = '';
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { validateNext(state.step + 1); return; }
    if (!validSlot()) {
      state.slot = null;
      goToStep(2);
      showError('#slot-error', 'Ce créneau d’essai est passé. Choisissez une autre heure.', 'input[name="heure"]:not(:disabled)');
      return;
    }
    const name = $('#first-name');
    const phone = $('#phone');
    const nameValid = name.value.trim().length > 0;
    const phoneValid = validPhone(phone.value);
    name.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    $('#name-error').textContent = nameValid ? '' : 'Saisissez un prénom d’essai.';
    $('#phone-error').textContent = phoneValid ? '' : 'Saisissez un numéro français de dix chiffres, ou son format international.';
    if (!nameValid || !phoneValid) { (nameValid ? phone : name).focus(); return; }
    state.completed = true;
    form.hidden = true;
    const success = $('#booking-success');
    success.hidden = false;
    $('#success-recap').textContent = `${name.value.trim()}, voici votre essai : ${summaryText()}`;
    updateSummary();
    success.querySelector('h3').focus();
    animatePanel(success);
    $('#booking-announcement').textContent = 'Simulation terminée. Aucun rendez-vous réservé et aucune donnée envoyée.';
    // Les coordonnées ne servent qu’à vérifier le formulaire, puis sont effacées.
    name.value = '';
    phone.value = '';
  });
  $('#restart').addEventListener('click', () => {
    state.service = null;
    state.day = null;
    state.slot = null;
    state.completed = false;
    form.reset();
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    goToStep(0);
  });

  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach(element => revealObserver.observe(element));
  } else reveals.forEach(element => element.classList.add('is-visible'));

  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      $('#mobile-bar').classList.toggle('is-hidden', visible.size > 0);
      $('#mobile-bar').inert = visible.size > 0;
    }, { threshold: 0 });
    [$('.hero__actions'), $('#reserver'), $('.footer')].forEach(element => barObserver.observe(element));
  }
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    if (animation) { animation.cancel(); animation = null; }
    reveals.forEach(element => element.classList.add('is-visible'));
    root.classList.add('is-ready');
  });
})();
