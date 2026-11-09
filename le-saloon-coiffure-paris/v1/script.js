(() => {
  'use strict';
  const $ = (selector, base = document) => base.querySelector(selector);
  const $$ = (selector, base = document) => Array.from(base.querySelectorAll(selector));
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    homme: 'MASCULIN - Coupe homme',
    court: 'SH COUPE BRUSH COURT',
    long: 'SH COUPE BRUSH LONG',
    barbe: 'Barbe'
  };
  const state = { service: '', day: '', time: null, step: 0, done: false };
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const flowError = $('#flow-error');
  let keyboard = false;
  let transitionSerial = 0;

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-use'); }, { passive: true });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-use'); }, { passive: true });

  function parisNow(now = new Date()) {
    const parts = {};
    for (const p of parisFormatter.formatToParts(now)) parts[p.type] = p.value;
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }
  const asDate = (key) => new Date(`${key}T12:00:00Z`);
  const dateKey = (date) => date.toISOString().slice(0, 10);
  const isOpenDay = (date) => date.getUTCDay() >= 2 && date.getUTCDay() <= 6;
  const timeLabel = (hour) => `${hour}\u00a0h`;
  const longDay = (key) => dayFormatter.format(asDate(key));
  function validDay(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const now = parisNow();
    const delta = (asDate(key) - asDate(now.date)) / 86400000;
    return delta >= 0 && delta < 14 && isOpenDay(asDate(key));
  }
  function unavailable(key, hour) {
    const now = parisNow();
    if (key < now.date || (key === now.date && hour * 60 <= now.minutes)) return 'Heure passée';
    if ((asDate(key).getUTCDate() + hour) % 5 === 0) return 'Indisponible dans l’essai';
    return '';
  }
  function hasAvailableTime(key) {
    return Array.from({ length: 9 }, (_, index) => index + 10).some((hour) => !unavailable(key, hour));
  }
  function validTime(key, hour) {
    return validDay(key) && Number.isInteger(hour) && hour >= 10 && hour < 19 && !unavailable(key, hour);
  }
  function createRadio(name, value, disabled, labelText) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', labelText);
    label.append(input);
    return { label, input };
  }
  function addText(parent, className, value, tag = 'span') {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    parent.append(element);
  }
  function renderDays() {
    const container = $('#day-options');
    container.replaceChildren();
    const now = parisNow();
    const first = asDate(now.date);
    for (let index = 0; index < 14; index++) {
      const date = new Date(first.getTime() + index * 86400000);
      const key = dateKey(date);
      const closed = !isOpenDay(date);
      const exhausted = !closed && !hasAvailableTime(key);
      const reason = closed ? 'Fermé' : exhausted ? 'Sans heure' : '';
      const { label, input } = createRadio('jour', key, !!reason, `${longDay(key)}${reason ? `, ${reason}` : ', simulation, jours fériés à confirmer'}`);
      input.checked = key === state.day;
      addText(label, 'day-name', weekdayFormatter.format(date));
      addText(label, 'day-number', date.getUTCDate());
      addText(label, 'day-month', reason || monthFormatter.format(date));
      container.append(label);
    }
  }
  function renderTimes() {
    const container = $('#time-options');
    container.replaceChildren();
    $('#chosen-day').textContent = state.day ? longDay(state.day) : '';
    if (!state.day) return;
    for (let hour = 10; hour < 19; hour++) {
      const reason = unavailable(state.day, hour);
      const { label, input } = createRadio('heure', String(hour), !!reason, `${timeLabel(hour)}, ${reason || 'heure souhaitée, simulation'}`);
      input.checked = hour === state.time;
      addText(label, '', timeLabel(hour));
      if (reason) addText(label, '', reason === 'Heure passée' ? 'Passé' : 'Pris · essai', 'small');
      container.append(label);
    }
    $('#no-times').hidden = hasAvailableTime(state.day);
  }
  function updateSummary() {
    $('#summary-service').textContent = services[state.service] || 'À choisir';
    $('#summary-day').textContent = state.day ? longDay(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : `${timeLabel(state.time)} · heure souhaitée`;
    stepButtons.forEach((button, index) => {
      const accessible = index === 0 || (index === 1 && state.service) || (index === 2 && state.service && state.day) || (index === 3 && state.service && state.day && state.time !== null);
      button.disabled = !accessible || state.done;
      if (state.step === index && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function setStep(step, focus = true) {
    state.step = step;
    const serial = ++transitionSerial;
    const next = panels[step];
    panels.forEach((panel) => { panel.hidden = panel !== next; panel.classList.remove('is-changing'); });
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    flowError.textContent = '';
    $('#previous').hidden = step === 0;
    $('#continue').innerHTML = step === 3 ? 'Terminer la simulation <span aria-hidden="true">→</span>' : 'Continuer <span aria-hidden="true">→</span>';
    updateSummary();
    if (!reduced.matches && !keyboard && focus) {
      next.classList.add('is-changing');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (serial === transitionSerial) next.classList.remove('is-changing');
      }));
    }
    $('#flow-status').textContent = `Étape ${step + 1} sur 4. ${$('h4', next).textContent}`;
    if (focus) {
      $('h4', next).focus({ preventScroll: true });
      const rectangle = next.getBoundingClientRect();
      if (rectangle.top < 12 || rectangle.top > window.innerHeight - 180) {
        next.scrollIntoView({ block: 'start', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
      }
    }
  }
  function selectService(value) {
    if (!(value in services)) return;
    if (value !== state.service) { state.day = ''; state.time = null; }
    state.service = value;
    $$('input[name="prestation"]').forEach((input) => { input.checked = input.value === value; });
    updateSummary();
  }
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = null;
      state.day = input.value;
      updateSummary();
    }
    if (input.name === 'heure') { state.time = Number(input.value); updateSummary(); }
    flowError.textContent = '';
  });
  stepButtons.forEach((button) => button.addEventListener('click', () => setStep(Number(button.dataset.step))));
  $('#previous').addEventListener('click', () => setStep(Math.max(0, state.step - 1)));
  function fieldError(input, element, message) {
    element.textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  const nameInput = $('#first-name');
  const phoneInput = $('#phone');
  for (const [input, error] of [[nameInput, $('#name-error')], [phoneInput, $('#phone-error')]]) {
    input.addEventListener('input', () => fieldError(input, error, ''));
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step === 0) {
      if (!state.service) { flowError.textContent = 'Choisissez une prestation pour poursuivre l’essai.'; $('input[name="prestation"]').focus(); return; }
      setStep(1); return;
    }
    if (state.step === 1) {
      if (!validDay(state.day)) { renderDays(); flowError.textContent = 'Choisissez un jour proposé pour poursuivre la simulation.'; $('#day-options input:not(:disabled)')?.focus(); return; }
      setStep(2); return;
    }
    if (state.step === 2) {
      if (!validTime(state.day, state.time)) { state.time = null; renderTimes(); updateSummary(); flowError.textContent = 'Choisissez une heure proposée. Les heures passées ne sont pas disponibles.'; $('#time-options input:not(:disabled)')?.focus(); return; }
      setStep(3); return;
    }
    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    const nameError = name.length < 2 ? 'Indiquez un prénom d’essai d’au moins deux caractères.' : '';
    const phoneError = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(phone) ? '' : 'Utilisez un mobile français d’essai, par exemple 06 00 00 00 00.';
    fieldError(nameInput, $('#name-error'), nameError);
    fieldError(phoneInput, $('#phone-error'), phoneError);
    if (nameError || phoneError) {
      $('#flow-status').textContent = 'Vérifiez les champs indiqués avant de terminer la simulation.';
      (nameError ? nameInput : phoneInput).focus();
      return;
    }
    if (!validTime(state.day, state.time)) {
      state.time = null;
      setStep(validDay(state.day) ? 2 : 1);
      flowError.textContent = 'Le temps a passé pendant cet essai. Choisissez à nouveau un jour et une heure.';
      return;
    }
    state.done = true;
    form.hidden = true;
    const result = $('#booking-success');
    result.hidden = false;
    $('#success-recap').textContent = `${name}, vous avez essayé le parcours pour ${services[state.service]}, le ${longDay(state.day)}, à ${timeLabel(state.time)}. Au 263 boulevard Voltaire, 75011 Paris.`;
    nameInput.value = '';
    phoneInput.value = '';
    updateSummary();
    $('#flow-status').textContent = 'Simulation terminée. Aucun rendez-vous créé et aucune demande envoyée.';
    $('h4', result).focus({ preventScroll: true });
    if (!reduced.matches && !keyboard) {
      result.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  });
  function reset() {
    state.service = ''; state.day = ''; state.time = null; state.step = 0; state.done = false;
    form.reset();
    form.hidden = false;
    $('#booking-success').hidden = true;
    fieldError(nameInput, $('#name-error'), '');
    fieldError(phoneInput, $('#phone-error'), '');
    setStep(0);
  }
  $('#restart').addEventListener('click', reset);
  $$('[data-service]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.done) reset();
    selectService(link.dataset.service);
    setStep(1, false);
    $('#essai').scrollIntoView({ block: 'start', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
    $('h4', panels[1]).focus({ preventScroll: true });
  }));
  const mobileActions = $('.mobile-actions');
  document.addEventListener('focusin', (event) => {
    if (event.target.matches('input[type="tel"], input[type="text"]')) mobileActions.hidden = true;
  });
  document.addEventListener('focusout', () => {
    requestAnimationFrame(() => { mobileActions.hidden = !!document.activeElement?.matches('input[type="tel"], input[type="text"]'); });
  });

  // Les notes de source restent accessibles, même depuis un lien pointant dans le volet fermé.
  function openSource(hash) {
    if (!hash || !hash.startsWith('#source-')) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    target.closest('details').open = true;
  }
  $$('a[href^="#source-"]').forEach((link) => link.addEventListener('click', () => openSource(link.hash)));
  window.addEventListener('hashchange', () => openSource(window.location.hash));
  openSource(window.location.hash);

  renderDays();
  setStep(0, false);
  $('#essai').hidden = false;
  // Aucun contenu éditorial n’est masqué avant que toute l’interface soit prête.
  if ('IntersectionObserver' in window) {
    root.classList.add('js');
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element) => observer.observe(element));
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }
  const progress = $('#reading-progress');
  let scheduled = false;
  let pageHeight = root.scrollHeight;
  function measure() { pageHeight = root.scrollHeight; }
  function paintProgress() {
    scheduled = false;
    if (reduced.matches) return;
    const range = pageHeight - window.innerHeight;
    const value = range > 0 ? Math.max(.001, Math.min(1, window.scrollY / range)) : 1;
    progress.style.transform = `scaleY(${value})`;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled && !reduced.matches) { scheduled = true; requestAnimationFrame(paintProgress); }
  }, { passive: true });
  window.addEventListener('resize', () => { measure(); paintProgress(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); paintProgress(); }).observe(document.body);
  document.fonts?.ready.then(() => { measure(); paintProgress(); });
  reduced.addEventListener('change', () => {
    if (reduced.matches) $$('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
    else paintProgress();
  });
  paintProgress();
})();
