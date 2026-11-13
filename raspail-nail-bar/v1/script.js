(() => {
  'use strict';

  const services = [
    { id: 'pieds', name: 'Beauté des pieds express + vernis semi-permanent OPI — coloré', minutes: 45 },
    { id: 'mains', name: 'Vernis semi-permanent mains — coloré', minutes: 30 },
    { id: 'manucure', name: 'Manucure + vernis semi-permanent — coloré', minutes: 45 },
    { id: 'duo', name: 'Manucure + beauté des pieds express + GelColor — coloré', minutes: 90 }
  ];
  const state = { service: '', day: '', time: null, step: 0 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const byId = id => document.getElementById(id);
  const form = byId('booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const currentService = () => services.find(service => service.id === state.service);
  let panelAnimation;

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
  function dayLabel(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'Europe/Paris' }).format(dateObject(key));
  }
  function durationLabel(minutes) { return minutes === 90 ? '1 h 30' : `${minutes} min`; }
  function timeLabel(minute) {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    return minutes ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${hours} h`;
  }

  // Horaires publiés par Treatwell : lundi–samedi 10–20, dimanche 10–19.
  // Les disponibilités sont entièrement fictives ; aucune requête réseau.
  function slotsFor(key, duration, now = parisNow()) {
    const close = dateObject(key).getUTCDay() === 0 ? 19 * 60 : 20 * 60;
    const slots = [];
    for (let minute = 10 * 60, index = 0; minute + duration <= close; minute += 30, index++) {
      const past = key < now.day || (key === now.day && minute <= now.minute);
      const occupiedExample = (Number(key.replaceAll('-', '')) + index + duration) % 7 === 3;
      slots.push({ minute, disabled: past || occupiedExample, reason: past ? 'Passé' : occupiedExample ? 'Exemple occupé' : '' });
    }
    return slots;
  }

  function announce(text) { byId('booking-status').textContent = text; }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function radioChoice(group, value, label, disabled = false, description = '') {
    const wrapper = make('label', 'choice');
    const input = make('input');
    input.type = 'radio'; input.name = group; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', label);
    if (description) input.setAttribute('aria-describedby', description);
    const body = make('span', 'choice-body');
    wrapper.append(input, body);
    return { wrapper, input, body };
  }

  function renderServices() {
    const container = byId('service-options');
    container.replaceChildren();
    services.forEach(service => {
      const { wrapper, input, body } = radioChoice('soin', service.id, `${service.name}, ${durationLabel(service.minutes)}`, false, 'service-error');
      const content = make('span', 'choice-title', service.name);
      content.append(make('span', 'choice-duration', durationLabel(service.minutes)));
      input.checked = service.id === state.service;
      body.append(content);
      input.addEventListener('change', () => selectService(service.id));
      container.append(wrapper);
    });
  }

  function selectService(id) {
    if (!services.some(service => service.id === id)) return;
    if (state.service !== id) {
      state.service = id; state.day = ''; state.time = null;
    }
    byId('service-error').textContent = '';
    document.querySelectorAll('input[name="soin"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
  }

  function renderDays() {
    const container = byId('date-options');
    container.replaceChildren();
    const now = parisNow();
    const duration = currentService().minutes;
    for (let index = 0; index < 14; index++) {
      const date = dateObject(now.day);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const unavailable = !slotsFor(key, duration, now).some(slot => !slot.disabled);
      const label = `${dayLabel(key)}${unavailable ? ', aucun créneau fictif restant' : ''}`;
      const { wrapper, input, body } = radioChoice('jour', key, label, unavailable, 'date-error');
      input.checked = state.day === key;
      body.append(make('span', 'day-name', index === 0 ? 'Aujourd’hui' : dayLabel(key, { weekday: 'short' })),
        make('span', 'day-number', String(date.getUTCDate())),
        make('span', 'day-month', unavailable ? 'Passé' : dayLabel(key, { month: 'short' })));
      input.addEventListener('change', () => {
        if (state.day !== key) state.time = null;
        state.day = key;
        byId('date-error').textContent = '';
        updateSummary();
        announce(`Jour choisi : ${dayLabel(key)}. Vous pouvez choisir l’heure.`);
      });
      container.append(wrapper);
    }
  }

  function renderSlots() {
    const container = byId('time-options');
    container.replaceChildren();
    const slots = slotsFor(state.day, currentService().minutes);
    const availableCount = slots.filter(slot => !slot.disabled).length;
    byId('slots-help').textContent = `${dayLabel(state.day)} : ${availableCount} créneaux fictifs proposés dans les horaires publiés par Treatwell. Les mentions « Exemple occupé » illustrent une indisponibilité.`;
    slots.forEach(slot => {
      const { wrapper, input, body } = radioChoice('heure', String(slot.minute), `${timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason.toLowerCase()}` : ', créneau fictif'}`, slot.disabled, 'time-error');
      input.checked = slot.minute === state.time && !slot.disabled;
      body.append(make('span', '', timeLabel(slot.minute)));
      if (slot.reason) body.append(make('span', 'slot-reason', slot.reason));
      input.addEventListener('change', () => {
        state.time = slot.minute;
        byId('time-error').textContent = '';
        updateSummary();
        announce(`Heure choisie : ${timeLabel(slot.minute)}. Simulation uniquement.`);
      });
      container.append(wrapper);
    });
    if (state.time !== null && !slots.some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
    return availableCount;
  }

  function latestAllowed() {
    return !state.service ? 0 : !state.day ? 1 : state.time === null ? 2 : 3;
  }
  function updateSummary() {
    const chosen = currentService();
    const summaryItems = [
      ['summary-service', chosen ? `${chosen.name} · ${durationLabel(chosen.minutes)}` : '', 0],
      ['summary-date', state.day ? dayLabel(state.day) : '', 1],
      ['summary-time', state.time !== null ? timeLabel(state.time) : '', 2]
    ];
    summaryItems.forEach(([id, text, step]) => {
      const target = byId(id);
      target.replaceChildren();
      if (text && state.step !== 4) {
        const button = make('button', '', text);
        button.type = 'button';
        button.setAttribute('aria-label', `Modifier : ${text}`);
        button.addEventListener('click', event => showStep(step, event.detail > 0));
        target.append(button);
      } else target.textContent = text || 'À choisir';
    });
    stepButtons.forEach((button, index) => {
      button.disabled = state.step === 4 || index > latestAllowed();
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(step, animate = false, focus = true) {
    if (step < 0 || step > 4 || (step !== 4 && step > latestAllowed())) return;
    const previous = state.step;
    state.step = step;
    if (panelAnimation) panelAnimation.cancel();
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateSummary();
    const heading = byId(`step-title-${step}`);
    if (focus) heading.focus();
    if (animate && !reduceMotion.matches && panels[step].animate) {
      panelAnimation = panels[step].animate([
        { opacity: 0, transform: `translateX(${step < previous ? '-10px' : '10px'})` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    announce(step === 4 ? 'Simulation terminée. Aucun rendez-vous pris.' : `Étape ${step + 1} sur 4. ${heading.textContent}`);
  }

  function requireChoice(next) {
    const checks = [
      [1, Boolean(state.service), 'service-error', 'Choisissez une prestation pour continuer.', 'soin'],
      [2, Boolean(state.day), 'date-error', 'Choisissez un jour pour continuer.', 'jour'],
      [3, state.time !== null, 'time-error', 'Choisissez un créneau fictif pour continuer.', 'heure']
    ];
    const check = checks.find(([step]) => step === next);
    if (!check || check[1]) return true;
    byId(check[2]).textContent = check[3];
    const input = form.querySelector(`input[name="${check[4]}"]:not(:disabled)`);
    if (input) input.focus();
    return false;
  }

  function validMobile(value) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }
  function validateField(input, valid, errorId, message) {
    input.setAttribute('aria-invalid', String(!valid));
    byId(errorId).textContent = valid ? '' : message;
    return valid;
  }

  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', event => {
    const next = Number(button.dataset.next);
    if (requireChoice(next)) showStep(next, event.detail > 0);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.back), event.detail > 0)));
  stepButtons.forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.step), event.detail > 0)));
  document.querySelectorAll('[data-choose]').forEach(link => link.addEventListener('click', event => {
    selectService(link.dataset.choose);
    showStep(0, event.detail > 0, false);
    if (!event.detail) byId('step-title-0').focus();
    else announce('Le soin est sélectionné dans le parcours de démonstration.');
  }));
  document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-mode'));
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-mode'), { passive: true });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const name = byId('prenom');
    const phone = byId('telephone');
    const nameOk = validateField(name, name.value.trim().length >= 1, 'name-error', 'Indiquez un prénom pour essayer le parcours.');
    const phoneOk = validateField(phone, validMobile(phone.value), 'phone-error', 'Indiquez un mobile français commençant par 06 ou 07, avec 10 chiffres, ou son format +33.');
    if (!nameOk || !phoneOk) { (!nameOk ? name : phone).focus(); return; }
    if (!currentService() || !state.day || state.time === null) { showStep(latestAllowed()); return; }
    const stillAvailable = slotsFor(state.day, currentService().minutes).some(slot => slot.minute === state.time && !slot.disabled);
    if (!stillAvailable) {
      state.time = null; showStep(2);
      byId('time-error').textContent = 'Ce créneau est maintenant passé. Choisissez une autre heure pour la simulation.';
      return;
    }
    byId('success-recap').textContent = `${currentService().name}, le ${dayLabel(state.day)} à ${timeLabel(state.time)}.`;
    name.value = ''; phone.value = '';
    showStep(4, Boolean(event.submitter && event.submitter.matches(':focus-visible') === false));
  });
  [['prenom', 'name-error'], ['telephone', 'phone-error']].forEach(([id, errorId]) => byId(id).addEventListener('input', () => {
    byId(id).removeAttribute('aria-invalid'); byId(errorId).textContent = '';
  }));
  byId('restart').addEventListener('click', event => {
    state.service = ''; state.day = ''; state.time = null;
    form.reset();
    document.querySelectorAll('.field-error').forEach(node => { node.textContent = ''; });
    document.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    renderServices(); showStep(0, event.detail > 0);
  });

  renderServices(); updateSummary();
  byId('booking-interface').hidden = false;

  // Une seule entrée en scène ; les informations restent visibles sans JavaScript.
  document.querySelector('.masthead').setAttribute('aria-label', 'Raspail nail bar');
  document.querySelectorAll('[data-letters]').forEach(word => {
    const letters = [...word.textContent];
    word.setAttribute('aria-hidden', 'true');
    word.replaceChildren(...letters.map((letter, index) => {
      const node = make('span', 'letter', letter === ' ' ? '\u00a0' : letter);
      node.style.setProperty('--delay', `${index * 22}ms`);
      return node;
    }));
  });
  document.querySelectorAll('.service-row').forEach((row, index) => row.style.setProperty('--delay', `${index * 60}ms`));
  const revealNodes = [...document.querySelectorAll('[data-reveal]')];
  const root = document.documentElement;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    revealNodes.forEach(node => observer.observe(node));
    if (!reduceMotion.matches) {
      root.classList.add('motion-ready');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
    }
  } else revealNodes.forEach(node => node.classList.add('revealed'));

  const bar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = { cover: true, booking: false, footer: false };
    const visibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'couverture') visible.cover = entry.isIntersecting;
        if (entry.target.id === 'rendez-vous') visible.booking = entry.isIntersecting;
        if (entry.target.id === 'sources') visible.footer = entry.isIntersecting;
      });
      const hidden = visible.cover || visible.booking || visible.footer;
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
    }, { threshold: 0 });
    bar.classList.add('is-hidden'); bar.inert = true;
    ['couverture', 'rendez-vous', 'sources'].forEach(id => visibilityObserver.observe(byId(id)));
  }
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      root.classList.remove('motion-ready');
      revealNodes.forEach(node => node.classList.add('revealed'));
      if (panelAnimation) panelAnimation.cancel();
    }
  });
})();
