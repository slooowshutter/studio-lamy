(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardInput = false;
  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboardInput = true;
      root.classList.add('keyboard-user');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboardInput = false;
    root.classList.remove('keyboard-user');
  }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  // Keep prose visible; reveal only the rule, quotation, and printed menu rows.
  const revealElements = [document.querySelector('.section-rule'), document.querySelector('.pull-quote'), ...document.querySelectorAll('.menu-row')];
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      let rowDelay = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (entry.target.classList.contains('menu-row')) {
          entry.target.style.transitionDelay = `${rowDelay * 60}ms`;
          rowDelay += 1;
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    revealElements.forEach(element => {
      if (!element) return;
      element.setAttribute('data-reveal', '');
      observer.observe(element);
    });
  }

  const services = [
    { id: 'crane', name: 'Rasage du crâne', detail: 'Shavette, protocole de serviette chaude', duration: 30, price: 30 },
    { id: 'coupe', name: 'Forfait coupe homme', detail: 'Shampooing, coupe, coiffage', duration: 30, price: 28 },
    { id: 'degrade', name: 'Dégradé à blanc rasoir', detail: '', duration: 30, price: 30 },
    { id: 'longs', name: 'Coupe homme cheveux longs aux ciseaux', detail: '', duration: 30, price: 28 },
    { id: 'barbe', name: 'Taille de barbe à la tondeuse', detail: '', duration: 30, price: 16 },
    { id: 'duo', name: 'Coupe homme & taille de barbe', detail: '', duration: 60, price: 44 },
    { id: 'tracage', name: 'Coupe homme & barbe avec traçage', detail: '', duration: 60, price: 47 },
    { id: 'etudiant', name: 'Coupe étudiant · 10–20 ans', detail: 'Justificatif requis', duration: 30, price: 25 },
    { id: 'etudiant-barbe', name: 'Coupe étudiant & taille de barbe', detail: 'Justificatif requis', duration: 60, price: 41 }
  ];
  const state = { step: 0, service: services[0], date: null, time: null, maxStep: 0, completed: false };
  const byId = id => document.getElementById(id);
  const form = byId('booking-form');
  const app = byId('booking-app');
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const stepButtons = Array.from(document.querySelectorAll('[data-step]'));
  const parisFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function dateLabel(key, short = false) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long' }).format(dateFromKey(key));
  }
  function hoursFor(key) {
    const weekday = dateFromKey(key).getUTCDay();
    return weekday === 0 || weekday === 1 ? null : { open: 9 * 60, close: weekday === 6 ? 18 * 60 + 30 : 19 * 60 };
  }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}\u00a0h\u00a0${String(minute).padStart(2, '0')}` : `${hour}\u00a0h`;
  }
  function durationLabel(duration) { return duration === 60 ? '1\u00a0h' : `${duration}\u00a0min`; }
  function priceLabel(price) { return `${price}\u00a0€`; }
  function slotsFor(key, duration, now = parisNow()) {
    const hours = hoursFor(key);
    if (!hours) return [];
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = hours.open; minute + duration <= hours.close; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const taken = (seed + minute / 30) % 5 === 1;
      slots.push({ minute, disabled: past || taken, status: past ? 'passé' : taken ? 'déjà pris' : 'libre' });
    }
    return slots;
  }
  function radioChoice({ name, value, content, className, checked = false, disabled = false }) {
    const label = document.createElement('label');
    label.className = `choice ${className}`;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.checked = checked; input.disabled = disabled;
    const presentation = document.createElement('span');
    presentation.className = 'choice-content';
    content.forEach(({ text, className: childClass, tag = 'span' }) => {
      const child = document.createElement(tag);
      child.className = childClass || '';
      child.textContent = text;
      presentation.append(child);
    });
    label.append(input, presentation);
    return label;
  }
  function renderServices() {
    const container = byId('service-options');
    services.forEach(service => {
      const content = [{ text: service.name, className: 'choice-title' }];
      if (service.detail) content.push({ text: service.detail, className: 'choice-detail' });
      content.push({ text: `${durationLabel(service.duration)} · ${priceLabel(service.price)}`, className: 'choice-value' });
      container.append(radioChoice({ name: 'service', value: service.id, content, className: 'service-choice', checked: service.id === state.service.id }));
    });
    container.addEventListener('change', event => selectService(event.target.value));
  }
  function selectService(id) {
    const service = services.find(item => item.id === id);
    if (!service) return;
    if (state.service.id !== id) {
      state.service = service;
      state.time = null;
      state.maxStep = state.date ? 2 : 1;
      state.completed = false;
    }
    document.querySelectorAll('input[name="service"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
    if (state.date) renderSlots();
    syncNavigation();
  }
  function renderDays() {
    const container = byId('date-options');
    container.replaceChildren();
    const today = parisNow();
    const start = dateFromKey(today.key);
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      const key = keyFromDate(date);
      const closed = !hoursFor(key);
      const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(date);
      const month = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).format(date);
      container.append(radioChoice({
        name: 'day', value: key, className: 'day-choice', checked: state.date === key, disabled: closed,
        content: [{ text: day, className: 'day-name' }, { text: String(date.getUTCDate()), className: 'day-number' }, { text: month, className: 'day-month' }, { text: closed ? 'fermé' : i === 0 ? 'aujourd’hui' : 'ouvert', className: 'day-state' }]
      }));
    }
  }
  byId('date-options').addEventListener('change', event => {
    state.date = event.target.value;
    state.time = null;
    state.maxStep = 2;
    renderSlots(); updateSummary(); syncNavigation();
  });
  function renderSlots() {
    const container = byId('time-options');
    container.replaceChildren();
    if (!state.date) return;
    const slots = slotsFor(state.date, state.service.duration);
    if (!slots.some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      state.maxStep = Math.min(state.maxStep, 2);
    }
    byId('slot-context').textContent = `${dateLabel(state.date)} · ${state.service.name} · ${durationLabel(state.service.duration)}`;
    slots.forEach(slot => container.append(radioChoice({
      name: 'time', value: String(slot.minute), className: 'slot-choice', checked: state.time === slot.minute, disabled: slot.disabled,
      content: [{ text: timeLabel(slot.minute) }, { text: slot.status, tag: 'small' }]
    })));
    byId('no-slots').hidden = slots.some(slot => !slot.disabled);
  }
  byId('time-options').addEventListener('change', event => {
    state.time = Number(event.target.value);
    state.maxStep = 3;
    updateSummary(); syncNavigation();
  });
  function recap() {
    return `${state.service.name} · ${dateLabel(state.date)} à ${timeLabel(state.time)} · ${durationLabel(state.service.duration)} · ${priceLabel(state.service.price)} (tarif publié sur Planity).`;
  }
  function updateSummary() {
    byId('summary-duration').textContent = String(state.service.duration);
    byId('summary-unit').textContent = 'minutes';
    byId('summary-service').textContent = state.service.name;
    byId('summary-detail').textContent = state.service.detail;
    byId('summary-day').textContent = state.date ? dateLabel(state.date, true) : 'À choisir';
    byId('summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    byId('summary-price').textContent = priceLabel(state.service.price);
    if (state.date && state.time !== null) byId('final-recap').textContent = recap();
  }
  function syncNavigation() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.maxStep;
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.querySelector('[data-next="2"]').disabled = !state.date;
    document.querySelector('[data-next="3"]').disabled = state.time === null;
  }
  function enterPanel(panel) {
    // No input waits on an animation. A second action cancels the prior entry.
    panel.classList.remove('is-entering');
    if (reducedMotion.matches || keyboardInput) return;
    panel.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
  }
  function showStep(index, focus = true) {
    if (index > state.maxStep) return;
    if (index === 1) renderDays();
    if (index >= 2) renderSlots();
    if (index === 3 && state.time === null) {
      index = 2;
      byId('booking-status').textContent = 'Ce créneau n’est plus disponible dans la simulation. Choisissez une autre heure.';
    }
    state.step = index;
    state.completed = false;
    form.hidden = false;
    byId('booking-success').hidden = true;
    panels.forEach((panel, number) => { panel.hidden = number !== index; });
    updateSummary(); syncNavigation();
    enterPanel(panels[index]);
    const title = byId(`step-title-${index}`);
    if (focus) title.focus();
    byId('booking-status').textContent = `Étape ${index + 1} sur 4. ${title.textContent}`;
  }
  document.querySelectorAll('[data-next], [data-back], [data-step]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.next;
    if (next) state.maxStep = Math.max(state.maxStep, Number(next));
    showStep(Number(next ?? button.dataset.back ?? button.dataset.step));
  }));
  document.querySelectorAll('[data-book]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.book);
    showStep(0, false);
  }));
  function validateName() {
    const input = byId('first-name');
    const valid = input.value.trim().length > 0;
    input.setAttribute('aria-invalid', String(!valid));
    byId('name-error').textContent = valid ? '' : 'Indiquez un prénom pour cet essai.';
    return valid;
  }
  function validatePhone() {
    const input = byId('phone');
    const compact = input.value.replace(/[\s().-]/g, '');
    const valid = /^(?:0|\+33|0033)[67]\d{8}$/.test(compact);
    input.setAttribute('aria-invalid', String(!valid));
    byId('phone-error').textContent = valid ? '' : 'Utilisez un mobile français, par exemple 06 12 34 56 78.';
    return valid;
  }
  byId('first-name').addEventListener('input', () => { if (byId('first-name').hasAttribute('aria-invalid')) validateName(); });
  byId('phone').addEventListener('input', () => { if (byId('phone').hasAttribute('aria-invalid')) validatePhone(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const available = state.date && slotsFor(state.date, state.service.duration).some(slot => slot.minute === state.time && !slot.disabled);
    if (!available) {
      state.time = null; state.maxStep = 2;
      showStep(state.date ? 2 : 1);
      byId('booking-status').textContent = 'Choisissez un nouveau créneau avant de terminer la simulation.';
      return;
    }
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      byId(nameValid ? 'phone' : 'first-name').focus();
      byId('booking-status').textContent = 'Vérifiez les coordonnées indiquées sous les champs.';
      return;
    }
    byId('success-recap').textContent = `${byId('first-name').value.trim()}, voici votre exemple : ${recap()}`;
    form.hidden = true;
    byId('booking-success').hidden = false;
    state.completed = true;
    syncNavigation();
    enterPanel(byId('booking-success'));
    byId('success-title').focus();
    byId('booking-status').textContent = 'Simulation terminée. Rien n’a été réservé, aucune donnée n’a été envoyée.';
    // Remove personal inputs immediately after the local-only demonstration.
    byId('first-name').value = '';
    byId('phone').value = '';
  });
  byId('restart').addEventListener('click', () => {
    form.reset();
    state.service = services[0]; state.date = null; state.time = null; state.maxStep = 0;
    ['first-name', 'phone'].forEach(id => byId(id).removeAttribute('aria-invalid'));
    byId('name-error').textContent = ''; byId('phone-error').textContent = '';
    selectService('crane');
    showStep(0);
  });
  renderServices(); renderDays(); updateSummary(); syncNavigation();
  app.hidden = false;

  // Show quick actions only between the hero and the booking, or between booking and footer.
  const bar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    let heroVisible = true, bookingVisible = false, footerVisible = false;
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') heroVisible = entry.isIntersecting;
        if (entry.target.id === 'reserver') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'footer') footerVisible = entry.isIntersecting;
      });
      bar.hidden = heroVisible || bookingVisible || footerVisible;
    });
    ['hero-actions', 'reserver', 'footer'].forEach(id => visibility.observe(byId(id)));
  } else bar.hidden = false;
})();
