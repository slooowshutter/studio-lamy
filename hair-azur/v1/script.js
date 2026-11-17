/* Hair Azur — simulation locale, aucun envoi ni stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = { coiffure: 'Coiffure', barbier: 'Barbier' };
  // Plages publiées par iCoiffeur / Fresha. À confirmer : d’autres fiches divergent.
  // Dimanche = 0 ; valeurs en minutes. Aucune durée de prestation n’est supposée.
  const hours = {
    0: [[810, 1170]], 1: [[540, 1170]], 2: [[540, 1170]],
    3: [[540, 1170]], 4: [[540, 1170]],
    5: [[540, 780], [885, 1170]], 6: [[540, 1170]]
  };
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  function parisNow() {
    const parts = {};
    for (const part of parisFormatter.formatToParts(new Date())) parts[part.type] = part.value;
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), minute: +parts.hour * 60 + +parts.minute };
  }
  const dateKey = date => date.toISOString().slice(0, 10);
  const asDate = key => new Date(`${key}T12:00:00Z`);
  const hourText = minute => `${Math.floor(minute / 60)}${NB}h${minute % 60 ? NB + String(minute % 60).padStart(2, '0') : ''}`;
  function slotsFor(key, now = parisNow()) {
    const date = asDate(key);
    const today = dateKey(now.date);
    if (key < today || key > dateKey(new Date(now.date.getTime() + 13 * 86400000))) return [];
    const slots = [];
    let index = 0;
    for (const [start, end] of hours[date.getUTCDay()] || []) {
      for (let minute = start; minute < end; minute += 30) {
        const past = key === today && minute <= now.minute;
        const unavailable = (date.getUTCDate() + date.getUTCMonth() + index++) % 7 === 0;
        slots.push({ minute, disabled: past || unavailable, label: past ? 'passé' : unavailable ? 'indisponible' : '' });
      }
    }
    return slots;
  }
  const state = { step: 0, service: '', day: '', minute: null };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const module = $('#booking-module');
  let transitionFrame = 0;
  let finished = false;

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === ' ') root.classList.add('keyboard');
  }, true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), true);

  function revealEntrance() { requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready'))); }
  if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 650))]).then(revealEntrance);
  else revealEntrance();
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); }
      }
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, index) => {
      if (element.getBoundingClientRect().top > innerHeight * .9) {
        element.classList.add('waiting');
        if (element.dataset.reveal === 'row') element.style.transitionDelay = `${index % 2 * 60}ms`;
        observer.observe(element);
      }
    });
    reduce.addEventListener('change', event => {
      if (event.matches) { $$('.waiting').forEach(element => element.classList.remove('waiting')); observer.disconnect(); }
    });
  }

  function announce(text) { $('#annonce-etape').textContent = text; }
  function setError(id, text) { $(`#${id}`).textContent = text; }
  function clearErrors() {
    $$('.error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
  }
  function summarize() {
    $('#choix-resume').textContent = services[state.service] || 'À choisir';
    $('#jour-resume').textContent = state.day ? longDate.format(asDate(state.day)) : 'À choisir';
    $('#heure-resume').textContent = state.minute !== null ? hourText(state.minute) : 'À choisir';
    $('#recap-final').textContent = state.day && state.minute !== null
      ? `Votre essai${NB}: ${services[state.service]}, ${longDate.format(asDate(state.day))} à ${hourText(state.minute)}. Tarif, durée et horaires à confirmer. Aucun rendez-vous ne sera réservé.`
      : '';
    const allowed = [true, !!state.service, !!state.service && !!state.day, !!state.service && !!state.day && state.minute !== null];
    stepButtons.forEach((button, index) => {
      button.disabled = finished || !allowed[index];
      if (index === state.step && !finished) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const now = parisNow();
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(now.date.getTime() + offset * 86400000);
      const key = dateKey(date);
      const available = slotsFor(key, now).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = !available; input.checked = state.day === key;
      input.setAttribute('aria-label', `${longDate.format(date)}${!available ? ', aucune heure proposée' : ''}`);
      input.setAttribute('aria-describedby', 'erreur-jour');
      const weekday = document.createElement('span'); weekday.textContent = shortWeekday.format(date);
      const number = document.createElement('strong'); number.textContent = String(date.getUTCDate());
      const month = document.createElement('span'); month.textContent = available ? shortMonth.format(date) : 'sans heure';
      label.append(input, weekday, number, month); fragment.append(label);
    }
    $('#jours').replaceChildren(fragment);
  }
  function renderSlots() {
    if (!state.day) return;
    const date = asDate(state.day);
    const ranges = (hours[date.getUTCDay()] || []).map(([start, end]) => `${hourText(start)} – ${hourText(end)}`).join(' et ');
    $('#plage-jour').textContent = `${longDate.format(date)}${NB}: ${ranges}. Horaires à confirmer.`;
    const fragment = document.createDocumentFragment();
    for (const slot of slotsFor(state.day)) {
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure';
      input.value = String(slot.minute); input.disabled = slot.disabled; input.checked = state.minute === slot.minute;
      input.setAttribute('aria-label', `${hourText(slot.minute)}${slot.label ? `, ${slot.label}` : ', simulation'}`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      const text = document.createElement('span'); text.textContent = hourText(slot.minute);
      label.append(input, text);
      if (slot.label) { const status = document.createElement('small'); status.textContent = slot.label; label.append(status); }
      fragment.append(label);
    }
    if (!fragment.childNodes.length) {
      const message = document.createElement('p'); message.textContent = 'Cette date est passée. Choisissez un autre jour.'; fragment.append(message);
    }
    $('#heures').replaceChildren(fragment);
  }
  function enterPanel(target) {
    cancelAnimationFrame(transitionFrame);
    target.classList.remove('is-entering');
    if (!reduce.matches && !root.classList.contains('keyboard')) {
      target.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => { transitionFrame = requestAnimationFrame(() => target.classList.remove('is-entering')); });
    }
  }
  function showStep(step, focus = true) {
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    state.step = step;
    const target = panels[step];
    for (const panel of panels) { panel.hidden = panel !== target; panel.classList.remove('is-entering'); }
    enterPanel(target);
    summarize();
    announce(`Étape ${step + 1} sur 4${NB}: ${$('h3', target).textContent}`);
    if (focus) $('h3', target).focus({ preventScroll: false });
  }
  function validateStep(step) {
    if (step === 0 && !state.service) {
      setError('erreur-choix', 'Choisissez un domaine pour continuer.');
      $('[name="prestation"]').focus(); return false;
    }
    if (step === 1 && (!state.day || !slotsFor(state.day).some(slot => !slot.disabled))) {
      state.day = ''; state.minute = null; renderDays(); summarize();
      setError('erreur-jour', 'Choisissez un jour avec une heure proposée pour l’essai.');
      $('[name="jour"]:not(:disabled)')?.focus(); return false;
    }
    if (step === 2 && (state.minute === null || !slotsFor(state.day).some(slot => slot.minute === state.minute && !slot.disabled))) {
      state.minute = null; renderSlots(); summarize();
      setError('erreur-heure', 'Choisissez une heure proposée. Une heure passée ne peut plus être sélectionnée.');
      $('[name="heure"]:not(:disabled)')?.focus(); return false;
    }
    return true;
  }
  function advance(step) { if (validateStep(step - 1)) { clearErrors(); showStep(step); } }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') { state.service = input.value; setError('erreur-choix', ''); }
    if (input.name === 'jour') { state.day = input.value; state.minute = null; setError('erreur-jour', ''); }
    if (input.name === 'heure') { state.minute = Number(input.value); setError('erreur-heure', ''); }
    summarize();
  });
  form.addEventListener('input', event => {
    if (['prenom', 'telephone'].includes(event.target.name)) {
      event.target.removeAttribute('aria-invalid'); setError(`erreur-${event.target.name}`, '');
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => advance(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => { clearErrors(); showStep(Number(button.dataset.back)); }));
  stepButtons.forEach(button => button.addEventListener('click', () => { clearErrors(); showStep(Number(button.dataset.step)); }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (finished) restart(false);
    state.service = link.dataset.service;
    $(`[name="prestation"][value="${state.service}"]`).checked = true;
    clearErrors(); showStep(0, false);
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) { advance(state.step + 1); return; }
    for (let step = 0; step < 3; step++) {
      if (!validateStep(step)) { showStep(step); return; }
    }
    clearErrors();
    const nameInput = $('#prenom');
    const phoneInput = $('#telephone');
    const nameValid = /\p{L}/u.test(nameInput.value.trim());
    const phone = phoneInput.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(phone);
    if (!nameValid) { setError('erreur-prenom', 'Saisissez un prénom pour cet essai.'); nameInput.setAttribute('aria-invalid', 'true'); }
    if (!phoneValid) { setError('erreur-telephone', 'Saisissez un numéro français à dix chiffres, ou avec +33.'); phoneInput.setAttribute('aria-invalid', 'true'); }
    if (!nameValid || !phoneValid) {
      announce('Vérifiez les champs indiqués avant de terminer l’essai.');
      (nameValid ? phoneInput : nameInput).focus(); return;
    }
    $('#recap-resultat').textContent = `${services[state.service]} · ${longDate.format(asDate(state.day))} · ${hourText(state.minute)}. Voici uniquement le récapitulatif de votre simulation.`;
    nameInput.value = ''; phoneInput.value = '';
    form.hidden = true; $('#resultat').hidden = false; enterPanel($('#resultat')); finished = true; summarize();
    $('#titre-resultat').focus(); announce('Simulation terminée. Aucun rendez-vous n’a été réservé. Rien n’a été envoyé.');
  });
  function restart(focus = true) {
    state.service = ''; state.day = ''; state.minute = null; finished = false;
    form.reset(); form.hidden = false; $('#resultat').hidden = true;
    $('#recap-resultat').textContent = ''; clearErrors(); renderDays(); showStep(0, focus);
  }
  $('#recommencer').addEventListener('click', () => restart());
  module.hidden = false;
  renderDays(); summarize();
  window.hairAzurPret = true;
})();
