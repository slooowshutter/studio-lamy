(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.23,1,.32,1)';
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });

  // La couverture reste entièrement lisible si le script ne s’exécute pas.
  const name = $('[data-letters]');
  const fragment = document.createDocumentFragment();
  [...name.textContent].forEach((letter, i) => {
    const span = document.createElement('span');
    span.className = letter === ' ' ? 'letter letter-space' : 'letter';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', i);
    span.textContent = letter === ' ' ? '\u00a0' : letter;
    fragment.append(span);
  });
  name.replaceChildren(fragment);
  root.classList.add('js');
  // Deux trames, aucune attente du réseau ni des polices.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((el, i) => {
      if (el.dataset.reveal === 'row') el.style.transitionDelay = `${i % 4 * 60}ms`;
      reveals.observe(el);
    });
  } else $$('[data-reveal]').forEach(el => el.classList.add('is-visible'));

  // La simulation reprend les horaires Treatwell. Les durées variables
  // occupent leur maximum publié sur Fresha, sans créer de durée de service.
  const hours = { 0: null, 1: null, 2: [540, 1050], 3: [540, 1050], 4: [540, 1050], 5: [540, 1050], 6: [540, 990] };
  const services = {
    frange: { name: 'Frange seule', max: 15 },
    coupes: { name: 'Coupes', max: 105 },
    brushing: { name: 'Brushing', max: 90 }
  };
  const state = { step: 0, service: '', day: '', time: null, completed: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const form = $('#booking-form');
  const next = $('#next');
  const previous = $('#previous');
  const error = $('#booking-error');
  const status = $('#booking-status');
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const nb = '\u00a0';
  function parisNow() {
    const p = Object.fromEntries(parisFmt.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const dateOf = iso => new Date(`${iso}T12:00:00Z`);
  const hourFr = n => `${Math.floor(n / 60)}${nb}h${n % 60 ? nb + String(n % 60).padStart(2, '0') : ''}`;
  function flash(el, direction = 1) {
    if (reduced.matches || keyboard || !el.animate) return;
    el.getAnimations().forEach(animation => animation.cancel());
    el.animate([{ opacity: 0, transform: `translateX(${direction * 9}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: ease });
  }
  function announce(text) { status.textContent = text; }
  function updateSummary() {
    const values = [state.service ? services[state.service].name : 'À choisir', state.day ? dateFmt.format(dateOf(state.day)) : 'À choisir', state.time === null ? 'À choisir' : hourFr(state.time)];
    ['#summary-service', '#summary-day', '#summary-time'].forEach((selector, i) => {
      const el = $(selector);
      if (el.textContent !== values[i]) { el.textContent = values[i]; flash(el); }
    });
    $('#compact-service').textContent = state.service ? services[state.service].name : 'Prestation à choisir';
    $('#compact-when').textContent = `${state.day ? dateFmt.format(dateOf(state.day)) : 'Jour à choisir'} · ${state.time === null ? 'heure à choisir' : hourFr(state.time)}`;
    stepButtons.forEach((button, i) => {
      button.disabled = state.completed || (i > 0 && !state.service) || (i > 1 && !state.day) || (i > 2 && state.time === null);
      if (i === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function availableTimes(iso) {
    if (!state.service) return [];
    const day = dateOf(iso);
    const span = hours[day.getUTCDay()];
    if (!span) return [];
    const now = parisNow();
    const result = [];
    for (let t = span[0]; t + services[state.service].max <= span[1]; t += 30) {
      const past = iso < now.date || (iso === now.date && t <= now.minutes);
      // Motif déterministe clairement présenté comme une disponibilité fictive.
      const unavailable = (day.getUTCDate() + t / 30) % 5 === 0;
      result.push({ time: t, disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Pris (exemple)' : 'Exemple' });
    }
    return result;
  }
  function makeChoice({ group, value, heading, detail, disabled = false, label }) {
    const holder = document.createElement('label');
    holder.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = group; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', label);
    const span = document.createElement('span');
    const strong = document.createElement('strong'); strong.textContent = heading;
    const small = document.createElement('small'); small.textContent = detail;
    span.append(strong, small); holder.append(input, span);
    return holder;
  }
  function renderDays() {
    const today = dateOf(parisNow().date);
    const choices = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today.getTime() + i * 86400000);
      const iso = date.toISOString().slice(0, 10);
      const closed = !hours[date.getUTCDay()];
      const exhausted = !closed && !availableTimes(iso).some(t => !t.disabled);
      const detail = closed ? 'Fermé' : exhausted ? 'Aucun exemple' : monthFmt.format(date);
      const choice = makeChoice({ group: 'jour', value: iso, heading: `${shortFmt.format(date)} ${date.getUTCDate()}`, detail, disabled: closed || exhausted, label: `${dateFmt.format(date)} — ${detail}` });
      $('input', choice).checked = iso === state.day;
      choices.append(choice);
    }
    $('#days').replaceChildren(choices);
  }
  function renderSlots() {
    const slots = availableTimes(state.day);
    const choices = document.createDocumentFragment();
    slots.forEach(slot => {
      const choice = makeChoice({ group: 'heure', value: String(slot.time), heading: hourFr(slot.time), detail: slot.reason, disabled: slot.disabled, label: `${hourFr(slot.time)} — ${slot.reason}` });
      $('input', choice).checked = state.time === slot.time;
      choices.append(choice);
    });
    $('#slots').replaceChildren(choices);
    $('#slot-note').textContent = `${dateFmt.format(dateOf(state.day))}. Disponibilités fictives${nb}: «${nb}pris${nb}» est aussi un exemple. Les horaires du salon restent à confirmer.`;
  }
  function focusHeading(heading) {
    heading.focus();
    const summary = $('.compact-selection');
    const inset = window.getComputedStyle(summary).display === 'none' ? 24 : summary.getBoundingClientRect().height + 24;
    if (heading.getBoundingClientRect().top < inset) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function goTo(step) {
    const direction = step < state.step ? -1 : 1;
    state.step = step;
    error.textContent = '';
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, i) => { panel.hidden = i !== step; });
    previous.hidden = step === 0;
    next.textContent = step === 3 ? 'Terminer la simulation' : 'Continuer →';
    updateSummary();
    const heading = $('h3', panels[step]);
    focusHeading(heading);
    flash(panels[step], direction);
    announce(`Étape ${step + 1} sur 4${nb}: ${heading.textContent}`);
  }
  function fail(text, focusTarget) {
    error.textContent = text;
    if (focusTarget) focusTarget.focus();
  }
  function validatePerson() {
    const nameInput = $('#prenom');
    const phoneInput = $('#telephone');
    const nameValid = nameInput.value.trim().length > 0;
    const phone = phoneInput.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(phone);
    $('#erreur-prenom').textContent = nameValid ? '' : 'Indiquez un prénom pour cet essai.';
    $('#erreur-telephone').textContent = phoneValid ? '' : 'Saisissez un numéro mobile français au format indiqué.';
    nameInput.setAttribute('aria-invalid', String(!nameValid));
    phoneInput.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      fail('Vérifiez les champs signalés pour terminer l’essai.', !nameValid ? nameInput : phoneInput);
      return false;
    }
    return true;
  }
  function checkSlot() {
    return availableTimes(state.day).some(slot => slot.time === state.time && !slot.disabled);
  }
  form.addEventListener('change', event => {
    const input = event.target;
    error.textContent = '';
    if (input.name === 'prestation') {
      if (state.service !== input.value) { state.service = input.value; state.day = ''; state.time = null; }
    } else if (input.name === 'jour') {
      if (state.day !== input.value) { state.day = input.value; state.time = null; }
    } else if (input.name === 'heure') state.time = Number(input.value);
    updateSummary();
    announce(`Sélection${nb}: ${$('#summary-service').textContent}, ${$('#summary-day').textContent}, ${$('#summary-time').textContent}.`);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) return fail('Choisissez une prestation pour continuer.', $('input[name="prestation"]'));
    if (state.step === 1 && !state.day) return fail('Choisissez un jour d’exemple pour continuer.', $('#days input:not(:disabled)'));
    if (state.step === 2 && state.time === null) return fail('Choisissez une heure d’exemple pour continuer.', $('#slots input:not(:disabled)'));
    if (state.step >= 2 && !checkSlot()) {
      state.time = null; updateSummary(); goTo(1);
      return fail('Ce créneau est passé. Choisissez à nouveau un jour et une heure.');
    }
    if (state.step < 3) return goTo(state.step + 1);
    if (!validatePerson()) return;
    state.completed = true;
    form.hidden = true;
    $('#success').hidden = false;
    $('#success-recap').textContent = `${$('#prenom').value.trim()}, voici votre sélection d’essai${nb}: ${services[state.service].name.toLowerCase()}, ${dateFmt.format(dateOf(state.day))} à ${hourFr(state.time)}.`;
    updateSummary();
    focusHeading($('#titre-succes'));
    flash($('#success'));
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  previous.addEventListener('click', () => goTo(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  $('#restart').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { step: 0, service: '', day: '', time: null, completed: false });
    $$('.field-error').forEach(el => { el.textContent = ''; });
    $$('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    $('#success-recap').textContent = '';
    $('#success').hidden = true; form.hidden = false;
    goTo(0);
  });
  $$('.fields input').forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    $(`#erreur-${input.id}`).textContent = '';
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.completed = false;
    state.service = link.dataset.service;
    state.day = ''; state.time = null;
    form.hidden = false; $('#success').hidden = true;
    $('input[value="' + state.service + '"]', form).checked = true;
    goTo(0);
  }));
  $('#simulation').hidden = false;
  updateSummary();

  // La barre ne recouvre ni le parcours actif ni le pied de page.
  const bar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = new Map();
    const watch = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target.id, entry.isIntersecting));
      bar.classList.toggle('is-hidden', [...visibility.values()].some(Boolean) || !!document.activeElement.closest('form'));
    }, { threshold: 0 });
    ['rendez-vous', 'pied'].forEach(id => watch.observe(document.getElementById(id)));
  }
})();
