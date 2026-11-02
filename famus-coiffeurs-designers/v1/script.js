/* FAM’US — simulation locale. Ni requête réseau, ni stockage des coordonnées. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hours = { 0: null, 1: null, 2: [630, 1140], 3: [630, 1140], 4: [750, 1140], 5: [630, 1140], 6: [630, 1080] };
  const services = { diagnostic: { name: 'Diagnostic / conseil', minutes: 30 }, devis: { name: 'Devis', minutes: 15 } };
  const state = { service: null, day: null, time: null, step: 0, furthest: 0 };
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const status = $('#booking-status');
  const adult = $('#adult-confirm');
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtWeek = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  document.addEventListener('keydown', () => root.classList.add('keyboard-navigation'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-navigation'), { passive: true });

  function nowParis() {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return { date: new Date(Date.UTC(+p.year, +p.month - 1, +p.day)), minute: +p.hour * 60 + +p.minute };
  }
  const iso = (date) => date.toISOString().slice(0, 10);
  const asDate = (s) => new Date(`${s}T12:00:00Z`);
  const timeLabel = (n) => `${Math.floor(n / 60)}\u00a0h\u00a0${String(n % 60).padStart(2, '0')}`;
  const dayLabel = (s) => fmtDay.format(asDate(s));
  function schedule(date, service, current = nowParis()) {
    const interval = hours[date.getUTCDay()];
    if (!interval || !service || iso(date) < iso(current.date)) return [];
    const result = [];
    let index = 0;
    for (let minute = interval[0]; minute + services[service].minutes <= interval[1]; minute += 30) {
      const past = iso(date) === iso(current.date) && minute <= current.minute;
      const unavailable = (date.getUTCDate() + date.getUTCMonth() * 3 + index * 7) % 6 === 2;
      result.push({ minute, disabled: past || unavailable, reason: past ? 'Heure passée' : 'Indisponible dans cet essai' });
      index++;
    }
    return result;
  }
  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function choice(name, value, disabled, accessibleName, className) {
    const label = element('label', className);
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', accessibleName);
    input.setAttribute('aria-describedby', name === 'jour' ? 'erreur-1' : 'erreur-2');
    label.append(input);
    return { label, input };
  }
  function renderDays() {
    const current = nowParis();
    const fragment = document.createDocumentFragment();
    let selectedStillValid = false;
    for (let i = 0; i < 14; i++) {
      const date = new Date(current.date); date.setUTCDate(date.getUTCDate() + i);
      const key = iso(date);
      const closed = !hours[date.getUTCDay()];
      const available = schedule(date, state.service, current).some(x => !x.disabled);
      const disabled = closed || !available;
      const suffix = closed ? 'Fermé' : !available ? 'Aucune heure dans cet essai' : 'Simulation';
      const { label, input } = choice('jour', key, disabled, `${fmtDay.format(date)} — ${suffix.toLowerCase()}`, 'day-choice');
      const span = element('span');
      span.append(element('span', 'day-name', fmtWeek.format(date)), element('strong', '', String(date.getUTCDate())), element('small', '', fmtMonth.format(date)));
      if (disabled) span.append(element('small', '', closed ? 'Fermé' : 'Sans heure'));
      span.setAttribute('aria-hidden', 'true');
      if (key === state.day && !disabled) { input.checked = true; selectedStillValid = true; }
      label.append(span); fragment.append(label);
    }
    if (!selectedStillValid) { state.day = null; state.time = null; state.furthest = Math.min(state.furthest, 1); }
    $('#day-options').replaceChildren(fragment);
  }
  function renderSlots() {
    const fragment = document.createDocumentFragment();
    const slots = state.day ? schedule(asDate(state.day), state.service) : [];
    let selectedStillValid = false;
    slots.forEach(slot => {
      const text = timeLabel(slot.minute);
      const { label, input } = choice('heure', String(slot.minute), slot.disabled, `${text}${slot.disabled ? ` — ${slot.reason.toLowerCase()}` : ' — simulation'}`, 'slot-choice');
      if (slot.minute === state.time && !slot.disabled) { input.checked = true; selectedStillValid = true; }
      const span = element('span', '', text); span.setAttribute('aria-hidden', 'true');
      label.append(span); fragment.append(label);
    });
    if (!slots.some(x => !x.disabled)) fragment.append(element('p', 'small-note', 'Aucune heure proposée dans cet essai. Choisissez un autre jour.'));
    if (!selectedStillValid) { state.time = null; state.furthest = Math.min(state.furthest, 2); }
    $('#slot-options').replaceChildren(fragment);
  }
  function updateSummary() {
    $('#summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#summary-day').textContent = state.day ? dayLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $$('[data-step]').forEach(button => {
      const n = +button.dataset.step;
      button.disabled = n > state.furthest;
      if (n === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function error(step, message) {
    $(`#erreur-${step}`).textContent = message;
  }
  function clearErrors() {
    $$('.field-error').forEach(p => { p.textContent = ''; });
    $$('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }
  function setStep(step, focus = true) {
    if (step < 0 || step > state.furthest) return;
    state.step = step;
    clearErrors();
    panels.forEach((panel, index) => {
      panel.hidden = index !== step;
      panel.classList.remove('is-entering');
    });
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    const panel = panels[step];
    if (!reduce.matches && !root.classList.contains('keyboard-navigation')) {
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('is-entering')));
    }
    updateSummary();
    status.textContent = `Simulation, étape ${step + 1} sur 4. ${$(`#etape-${step}`).textContent}`;
    if (focus) $(`#etape-${step}`).focus();
  }
  function chooseService(value) {
    if (value !== state.service) {
      state.service = value; state.day = null; state.time = null; state.furthest = 0;
    }
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    updateSummary();
  }
  function validTime() {
    return state.day && state.service && schedule(asDate(state.day), state.service).some(x => x.minute === state.time && !x.disabled);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    clearErrors();
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      if (state.day !== input.value) { state.day = input.value; state.time = null; state.furthest = 1; }
      updateSummary();
    }
    if (input.name === 'heure') { state.time = +input.value; updateSummary(); }
    if (input === adult && !adult.checked) { state.furthest = 0; updateSummary(); }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = +button.dataset.next;
    clearErrors();
    if (next === 1) {
      if (!state.service) { error(0, 'Choisissez un motif pour continuer.'); $('input[name="prestation"]').focus(); return; }
      if (!adult.checked) { error(0, 'Confirmez être une personne adulte pour poursuivre cet essai.'); adult.setAttribute('aria-invalid', 'true'); adult.focus(); return; }
    }
    if (next === 2) {
      if (!state.day) { error(1, 'Choisissez un jour pour continuer.'); return; }
      if (!schedule(asDate(state.day), state.service).some(x => !x.disabled)) { renderDays(); updateSummary(); error(1, 'Ce jour ne propose plus d’heure dans cet essai. Choisissez-en un autre.'); return; }
    }
    if (next === 3 && !validTime()) { renderSlots(); updateSummary(); error(2, 'Choisissez une heure disponible dans cet essai.'); return; }
    state.furthest = Math.max(state.furthest, next);
    setStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => setStep(+button.dataset.back)));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => setStep(+button.dataset.step)));
  $$('[data-select-service]').forEach(link => link.addEventListener('click', () => {
    if (!form.hidden) { chooseService(link.dataset.selectService); setStep(0); }
  }));

  const firstName = $('#prenom');
  const phone = $('#telephone');
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid'); $(`#erreur-${input.id}`).textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    clearErrors();
    if (!adult.checked) { state.furthest = 0; setStep(0); error(0, 'La confirmation adulte est nécessaire.'); adult.focus(); return; }
    if (!validTime()) { state.time = null; state.furthest = 1; setStep(1); error(1, 'L’heure choisie n’est plus disponible dans cet essai. Choisissez à nouveau un jour.'); return; }
    const name = firstName.value.trim();
    const normalizedPhone = phone.value.replace(/[\s.\-()]/g, '');
    let firstInvalid = null;
    if (!name || !/\p{L}/u.test(name)) {
      $('#erreur-prenom').textContent = 'Indiquez un prénom pour essayer cette étape.';
      firstName.setAttribute('aria-invalid', 'true'); firstInvalid = firstName;
    }
    if (!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(normalizedPhone)) {
      $('#erreur-telephone').textContent = 'Indiquez un numéro français à 10 chiffres, ou commençant par +33.';
      phone.setAttribute('aria-invalid', 'true'); firstInvalid ||= phone;
    }
    if (firstInvalid) { error(3, 'Vérifiez les champs indiqués avant de terminer l’essai.'); firstInvalid.focus(); return; }
    $('#result-recap').textContent = `Votre essai : ${services[state.service].name}, ${dayLabel(state.day)} à ${timeLabel(state.time)}. Pour une personne adulte.`;
    firstName.value = ''; phone.value = '';
    form.hidden = true; $('.step-nav').hidden = true; $('#booking-result').hidden = false;
    status.textContent = 'Simulation terminée. Aucun rendez-vous réservé. Aucune donnée envoyée.';
    $('#result-title').focus();
  });
  $('#restart').addEventListener('click', () => {
    form.reset(); state.service = null; state.day = null; state.time = null; state.furthest = 0;
    $('#booking-result').hidden = true; $('#result-recap').textContent = ''; form.hidden = false; $('.step-nav').hidden = false;
    setStep(0);
  });

  $('#booking-app').hidden = false;
  updateSummary();
  $$('input[name="prestation"]').forEach(input => input.setAttribute('aria-describedby', 'erreur-0'));
  adult.setAttribute('aria-describedby', 'adulte-note erreur-0');

  const reveals = [...$$('[data-reveal]'), $('.menu-section')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('is-visible'));
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
