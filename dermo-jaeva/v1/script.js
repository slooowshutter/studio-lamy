/* Dermo Jaéva : simulation locale, sans requête ni conservation de données. */
(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const revealTargets = document.querySelectorAll('[data-reveal], .training-note');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -16px 0px' });
    revealTargets.forEach(target => revealObserver.observe(target));
  } else revealTargets.forEach(target => target.classList.add('is-visible'));

  const services = [
    { id: 'formation', label: 'Formation microblading · appel plan d’action', detail: 'Un appel pour parler du parcours de formation', minutes: 20, duration: '20 min' },
    { id: 'microblading', label: 'Création Microblading', detail: 'Premier rendez-vous · retouche incluse', minutes: 180, duration: '3 h' },
    { id: 'shading', label: 'Création Shading/Ombré Brows', detail: 'Premier rendez-vous · retouche incluse', minutes: 180, duration: '3 h' },
    { id: 'microshading', label: 'Création Microshading', detail: 'Premier rendez-vous · retouche incluse', minutes: 180, duration: '3 h' }
  ];
  const state = { service: null, day: null, time: null, step: 0, complete: false };
  const $ = selector => document.querySelector(selector);
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const announcement = $('#booking-announcement');
  const form = $('#details-form');
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parisNow() {
    const parts = Object.fromEntries(parisFormatter.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateLabel(key) { return dateFromKey(key).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }); }
  function timeLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function speak(message) { announcement.textContent = message; }
  function makeText(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }
  function radio(name, value, labelText) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    if (labelText) input.setAttribute('aria-label', labelText);
    return input;
  }
  function renderServices() {
    const group = $('#service-choices');
    services.forEach(service => {
      const label = makeText('label', 'choice');
      const input = radio('prestation', service.id);
      const words = makeText('span', 'choice-text', service.label);
      words.append(makeText('small', '', service.detail));
      label.append(input, words, makeText('span', 'choice-duration', service.duration));
      input.addEventListener('change', () => selectService(service.id));
      group.append(label);
    });
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? state.service.label : 'Un rendez-vous à choisir.';
    $('#summary-day').textContent = state.day ? dateLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#summary-duration').textContent = state.service ? state.service.duration : 'À choisir';
    $('#details-recap').textContent = state.service && state.day && state.time !== null
      ? `Votre essai\u00a0: ${state.service.label}, ${dateLabel(state.day)} à ${timeLabel(state.time)} (${state.service.duration}). Aucun rendez-vous ne sera pris.`
      : '';
    $('#to-day').disabled = !state.service;
    $('#to-time').disabled = !state.day;
    $('#to-details').disabled = state.time === null;
    stepButtons.forEach((button, index) => {
      button.disabled = state.complete || (index === 1 && !state.service) || (index === 2 && !state.day) || (index === 3 && state.time === null);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function selectService(id) {
    const selected = services.find(service => service.id === id);
    if (!selected) return;
    state.service = selected; state.day = null; state.time = null; state.complete = false;
    $('.simulation-stamp').textContent = 'Simulation · rien n’est réservé';
    document.querySelectorAll('input[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    renderDays(); $('#time-choices').replaceChildren(); updateSummary();
    speak(`${selected.label}, durée publiée ${selected.duration}. Choisissez ensuite un jour.`);
  }
  function renderDays() {
    const group = $('#day-choices'); group.replaceChildren();
    const today = parisNow().key;
    for (let index = 0; index < 14; index++) {
      const date = dateFromKey(today); date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const label = makeText('label', 'choice day-choice');
      const input = radio('jour', key, `${dateLabel(key)}, jour de simulation`);
      input.checked = key === state.day;
      const now = parisNow();
      // Le dernier départ doit laisser la durée entière avant 20 h.
      const latestStart = 1200 - (state.service ? state.service.minutes : 20);
      input.disabled = key < now.key || (key === now.key && now.minutes >= latestStart);
      const weekday = date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
      const month = date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });
      label.append(input, makeText('span', '', weekday), makeText('strong', '', String(date.getUTCDate())), makeText('small', '', input.disabled ? 'Indisponible' : month));
      if (input.disabled) label.classList.add('unavailable-day');
      input.addEventListener('change', () => {
        state.day = key; state.time = null; renderSlots(); updateSummary();
        speak(`${dateLabel(key)} sélectionné. Choisissez ensuite une heure.`);
      });
      group.append(label);
    }
  }
  function slotAvailability(key, minutes) {
    const now = parisNow();
    const past = key < now.key || (key === now.key && minutes <= now.minutes);
    const dayNumber = Math.floor(dateFromKey(key).getTime() / 86400000);
    const occupied = (dayNumber + Math.floor(minutes / 20)) % 7 === 0;
    return { disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Indisponible' : '' };
  }
  function renderSlots() {
    const group = $('#time-choices'); group.replaceChildren();
    if (!state.service || !state.day) return;
    let available = 0;
    // Planity : tous les jours 10 h–20 h ; pas de date de formation simulée.
    for (let minutes = 600; minutes + state.service.minutes <= 1200; minutes += 20) {
      const availability = slotAvailability(state.day, minutes);
      const label = makeText('label', 'choice slot-choice');
      const input = radio('heure', String(minutes), `${timeLabel(minutes)}, ${availability.disabled ? availability.reason.toLowerCase() : 'créneau fictif'}`);
      input.disabled = availability.disabled; input.checked = state.time === minutes;
      label.append(input, makeText('span', '', timeLabel(minutes)));
      if (availability.disabled) label.append(makeText('small', '', availability.reason));
      else available++;
      input.addEventListener('change', () => { state.time = minutes; updateSummary(); speak(`${timeLabel(minutes)} sélectionné pour la simulation.`); });
      group.append(label);
    }
    $('#no-slots').hidden = available > 0;
  }
  let transitionId = 0;
  function showStep(index, focus = true) {
    const token = ++transitionId;
    const old = panels.find(panel => !panel.hidden);
    state.step = index;
    const next = panels[index];
    const immediate = reduceMotion.matches || root.classList.contains('keyboard') || old === next || !focus;
    updateSummary();
    const apply = () => {
      if (token !== transitionId) return;
      panels.forEach(panel => { panel.hidden = panel !== next; panel.classList.remove('is-changing'); });
      if (!immediate) next.classList.add('is-changing');
      const reveal = () => {
        if (token !== transitionId) return;
        next.classList.remove('is-changing');
        if (focus) next.querySelector('h3').focus({ preventScroll: true });
        if (focus) next.scrollIntoView({ block: 'nearest', behavior: immediate ? 'instant' : 'smooth' });
      };
      if (immediate) reveal(); else requestAnimationFrame(() => requestAnimationFrame(reveal));
      speak(`Étape ${index + 1}\u00a0: ${next.querySelector('h3').textContent}`);
    };
    apply();
  }
  $('#to-day').addEventListener('click', () => { renderDays(); showStep(1); });
  $('#to-time').addEventListener('click', () => { renderSlots(); showStep(2); });
  $('#to-details').addEventListener('click', () => {
    if (state.time === null || slotAvailability(state.day, state.time).disabled) {
      state.time = null; renderSlots(); updateSummary(); speak('Ce créneau est passé. Choisissez une autre heure.'); return;
    }
    showStep(3);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.service); showStep(0, false);
  }));
  function validateField(input, error, message, valid) {
    error.textContent = valid ? '' : message;
    if (valid) input.removeAttribute('aria-invalid'); else input.setAttribute('aria-invalid', 'true');
    return valid;
  }
  const nameInput = $('#first-name'); const phoneInput = $('#phone');
  const nameError = $('#name-error'); const phoneError = $('#phone-error');
  [nameInput, phoneInput].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    (input === nameInput ? nameError : phoneError).textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!state.service || !state.day || state.time === null) { showStep(0); return; }
    if (slotAvailability(state.day, state.time).disabled) {
      state.time = null; renderSlots(); showStep(2); speak('L’heure choisie est passée. Choisissez un autre créneau fictif.'); return;
    }
    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/[\s.()\-]/g, '');
    const validName = validateField(nameInput, nameError, 'Indiquez un prénom pour poursuivre l’essai.', name.length > 0);
    const validPhone = validateField(phoneInput, phoneError, 'Indiquez un numéro mobile français commençant par 06, 07 ou +33.', /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phone));
    if (!validName || !validPhone) { (!validName ? nameInput : phoneInput).focus(); speak('Vérifiez les champs signalés.'); return; }
    $('#success-copy').textContent = `${name}, voici votre essai\u00a0: ${state.service.label}, ${dateLabel(state.day)} à ${timeLabel(state.time)} (${state.service.duration}).`;
    state.complete = true; showStep(4);
    $('.simulation-stamp').textContent = 'Essai terminé · rien n’est réservé';
    // Le téléphone n’est utilisé que pour la validation locale.
    phoneInput.value = ''; nameInput.value = '';
  });
  $('#restart').addEventListener('click', () => {
    state.service = null; state.day = null; state.time = null; state.complete = false;
    form.reset(); nameError.textContent = ''; phoneError.textContent = '';
    nameInput.removeAttribute('aria-invalid'); phoneInput.removeAttribute('aria-invalid');
    document.querySelectorAll('input[name="prestation"]').forEach(input => { input.checked = false; });
    $('.simulation-stamp').textContent = 'Simulation · rien n’est réservé';
    $('#success-copy').textContent = ''; renderDays(); $('#time-choices').replaceChildren(); showStep(0);
  });
  renderServices(); renderDays(); updateSummary();
  $('#booking-workspace').hidden = false; $('#selection-note').hidden = false;

  const mobileBar = $('.mobile-bar');
  let heroVisible = true; let bookingVisible = false; let footerVisible = false;
  const updateBar = () => {
    const visible = !heroVisible && !bookingVisible && !footerVisible;
    mobileBar.classList.toggle('is-visible', visible);
    mobileBar.inert = !visible;
  };
  if ('IntersectionObserver' in window) {
    const watch = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') heroVisible = entry.isIntersecting || entry.boundingClientRect.top > 0;
        if (entry.target.id === 'rendez-vous') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'pied') footerVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0 });
    ['hero-actions', 'rendez-vous', 'pied'].forEach(id => watch.observe(document.getElementById(id)));
  }
  updateBar();
})();
