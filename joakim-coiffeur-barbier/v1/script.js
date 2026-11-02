/* Joakim — démonstration locale. Aucune requête, aucun stockage, aucun envoi. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const SERVICES = {
    monsieur: { name: 'Shampoing + Coupe + Séchage', category: 'Coiffure monsieur', duration: 25 },
    taper: { name: 'Taper', category: 'Coiffure monsieur', duration: 25 },
    barbe: { name: 'Service Traditionnel', category: 'Barbu', duration: 25 },
    duo: { name: 'Coupe homme + Barbe Service Traditionnel', category: 'Coiffure monsieur', duration: 50 },
    dame: { name: 'Shampoing + Coupe + Séchage', category: 'Coiffure dame', duration: 45 }
  };
  // Planity : lundi 13:30–19:00, mardi–vendredi 09:00–19:00, week-end fermé.
  // Les divergences des annuaires sont signalées sur la page. Minutes depuis minuit.
  const HOURS = { 0: null, 1: [810, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: null };
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pad = n => String(n).padStart(2, '0');
  const dateKey = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const toDate = key => new Date(`${key}T12:00:00Z`);
  const hourText = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + pad(minutes % 60) : ''}`;
  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(instant).map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function nextDays(instant = new Date()) {
    const today = parisNow(instant);
    const date = toDate(today.key);
    return Array.from({ length: 14 }, (_, index) => {
      const d = new Date(date);
      d.setUTCDate(date.getUTCDate() + index);
      return { date: d, key: dateKey(d), index };
    });
  }
  function slotsFor(key, serviceId, instant = new Date()) {
    const service = SERVICES[serviceId];
    const date = toDate(key);
    const hours = HOURS[date.getUTCDay()];
    if (!service || !hours) return [];
    const today = parisNow(instant);
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    for (let minutes = hours[0]; minutes + service.duration <= hours[1]; minutes += 30) {
      const past = key < today.key || (key === today.key && minutes <= today.minutes);
      const occupied = (seed + minutes * 7) % 11 === 0;
      slots.push({ minutes, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Indisponible' : 'Essai' });
    }
    return slots;
  }
  function validMobile(value) {
    return /^0[67]\d{8}$/.test(value.replace(/[\s.()\-]/g, '').replace(/^(\+33|0033)/, '0'));
  }

  const state = { step: 0, service: '', day: '', time: null, done: false };
  const form = $('#rdv-form');
  const panels = $$('[data-panel]');
  const announce = message => { $('#annonce').textContent = message; };
  let transitionId = 0;
  function updateSummary() {
    const service = SERVICES[state.service];
    $('#selection-prestation').textContent = service ? `${service.name} · ${service.category} · ${service.duration}${NB}min` : 'À choisir';
    $('#selection-jour').textContent = state.day ? longDay.format(toDate(state.day)) : 'À choisir';
    $('#selection-heure').textContent = state.time === null ? 'À choisir' : hourText(state.time);
    ['prestation', 'jour', 'heure'].forEach(key => {
      $(`#selection-mobile-${key}`).textContent = $(`#selection-${key}`).textContent;
    });
    $('#selection-mobile-apercu').textContent = service ? `${service.name}${state.day ? ' · ' + longDay.format(toDate(state.day)) : ' · Jour à choisir'}${state.time !== null ? ' · ' + hourText(state.time) : ''}` : 'Choisissez une prestation';
    $$('[data-edit]').forEach(button => {
      const target = Number(button.dataset.edit);
      button.disabled = state.done || (target === 1 && !state.service) || (target === 2 && !state.day);
    });
    $$('[data-next]').forEach(button => {
      const next = Number(button.dataset.next);
      button.disabled = next === 1 ? !state.service : next === 2 ? !state.day : state.time === null;
    });
    $$('[data-step]').forEach(button => {
      const target = Number(button.dataset.step);
      button.disabled = state.done || (target === 1 && !state.service) || (target === 2 && !state.day) || (target === 3 && state.time === null);
      if (target === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const days = nextDays();
    const fragment = document.createDocumentFragment();
    let selectedValid = false;
    days.forEach(({ date, key, index }) => {
      const closed = !HOURS[date.getUTCDay()];
      const ended = !closed && !slotsFor(key, state.service).some(slot => !slot.disabled);
      const disabled = closed || ended;
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key; input.disabled = disabled;
      input.checked = key === state.day && !disabled;
      if (input.checked) selectedValid = true;
      input.setAttribute('aria-label', `${longDay.format(date)}${closed ? ', fermé selon Planity' : ended ? ', journée terminée pour la simulation' : ', simulation'}`);
      const face = document.createElement('span');
      face.className = 'day-face';
      const weekday = document.createElement('span'); weekday.textContent = shortDay.format(date);
      const number = document.createElement('b'); number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.textContent = shortMonth.format(date);
      const note = document.createElement('small'); note.textContent = closed ? 'Fermé' : ended ? 'Terminé' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : 'Essai';
      face.append(weekday, number, month, note); label.append(input, face); fragment.append(label);
    });
    $('#jours').replaceChildren(fragment);
    if (!selectedValid) { state.day = ''; state.time = null; }
  }
  function renderSlots() {
    if (!state.day || !SERVICES[state.service]) return;
    const fragment = document.createDocumentFragment();
    const slots = slotsFor(state.day, state.service);
    if (!slots.some(slot => slot.minutes === state.time && !slot.disabled)) state.time = null;
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minutes);
      input.disabled = slot.disabled; input.checked = state.time === slot.minutes;
      input.setAttribute('aria-label', `${hourText(slot.minutes)}, ${slot.reason.toLowerCase()}, simulation`);
      const face = document.createElement('span'); face.className = 'slot-face';
      const time = document.createElement('time');
      time.dateTime = `${state.day}T${pad(Math.floor(slot.minutes / 60))}:${pad(slot.minutes % 60)}`;
      time.textContent = hourText(slot.minutes);
      const note = document.createElement('small'); note.textContent = slot.reason;
      face.append(time, note); label.append(input, face); fragment.append(label);
    });
    $('#heures').replaceChildren(fragment);
    $('#heure-jour').textContent = longDay.format(toDate(state.day));
    $('#aucune-heure').hidden = slots.some(slot => !slot.disabled);
  }
  function showStep(target, moveFocus = true) {
    if (target > 0 && !state.service) target = 0;
    if (target === 1) renderDays();
    if (target > 1 && !state.day) { target = 1; renderDays(); }
    if (target === 2) renderSlots();
    if (target === 3 && !slotsFor(state.day, state.service).some(slot => slot.minutes === state.time && !slot.disabled)) {
      state.time = null; target = 2; renderSlots();
    }
    const wasStep = state.step;
    state.step = target;
    state.done = false;
    $('#selection-mobile').open = false;
    const result = $('#resultat');
    result.hidden = true;
    result.style.transition = ''; result.style.opacity = ''; result.style.transform = '';
    form.hidden = false;
    const token = ++transitionId;
    panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.panel) !== target;
      panel.style.opacity = ''; panel.style.transform = ''; panel.style.transition = '';
    });
    const panel = panels[target];
    const animate = !reduce.matches && !root.classList.contains('keyboard-use') && wasStep !== target;
    if (animate) {
      panel.style.transition = 'none';
      panel.style.opacity = '0';
      panel.style.transform = `translateX(${target > wasStep ? '10' : '-10'}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== transitionId) return;
        panel.style.transition = ''; panel.style.opacity = ''; panel.style.transform = '';
      }));
    }
    updateSummary();
    const heading = $('h4', panel);
    if (moveFocus) heading.focus();
    announce(`Étape ${target + 1} sur 4. ${heading.textContent.trim()} Simulation uniquement.`);
  }
  function selectService(id) {
    if (!SERVICES[id]) return;
    if (state.service !== id) { state.day = ''; state.time = null; }
    state.service = id;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
  }
  function resetFlow() {
    form.reset();
    state.service = ''; state.day = ''; state.time = null; state.done = false;
    $$('.field input').forEach(input => input.removeAttribute('aria-invalid'));
    $$('.error').forEach(message => { message.textContent = ''; });
    showStep(0);
  }

  document.addEventListener('keydown', event => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) root.classList.add('keyboard-use');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-use'), { passive: true });
  document.addEventListener('focusin', event => {
    const parent = event.target.closest('[data-reveal]');
    if (parent) parent.classList.add('is-visible');
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') { state.day = input.value; state.time = null; updateSummary(); }
    if (input.name === 'heure') { state.time = Number(input.value); updateSummary(); }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-edit]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.edit))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    selectService(link.dataset.service);
    showStep(0);
  }));
  $$('.field input').forEach(input => input.addEventListener('input', () => {
    const valid = input.id === 'prenom' ? input.value.trim().length > 0 : validMobile(input.value);
    if (valid) { input.removeAttribute('aria-invalid'); $(`#erreur-${input.id}`).textContent = ''; }
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step < 3) {
      const ready = state.step === 0 ? !!state.service : state.step === 1 ? !!state.day : state.time !== null;
      if (ready) showStep(state.step + 1);
      return;
    }
    const current = parisNow();
    if (!state.day || state.day < current.key) {
      state.day = ''; state.time = null; showStep(1);
      announce('Le jour choisi est passé dans la simulation. Choisissez un autre jour.');
      return;
    }
    if (!slotsFor(state.day, state.service).some(slot => slot.minutes === state.time && !slot.disabled)) {
      state.time = null; showStep(2);
      announce('Ce créneau est passé dans la simulation. Choisissez une autre heure.');
      return;
    }
    const name = $('#prenom'); const phone = $('#telephone');
    const errors = [
      { input: name, valid: name.value.trim().length > 0, message: 'Indiquez un prénom pour terminer la simulation.' },
      { input: phone, valid: validMobile(phone.value), message: 'Saisissez un mobile français commençant par 06 ou 07, ou par +33 6 ou +33 7.' }
    ];
    errors.forEach(({ input, valid, message }) => {
      input.setAttribute('aria-invalid', String(!valid));
      $(`#erreur-${input.id}`).textContent = valid ? '' : message;
    });
    const invalid = errors.find(error => !error.valid);
    if (invalid) {
      invalid.input.focus(); announce('Vérifiez les champs signalés. Rien n’a été envoyé.');
      return;
    }
    state.done = true;
    const token = ++transitionId;
    form.hidden = true;
    const result = $('#resultat');
    result.hidden = false;
    if (!reduce.matches && !root.classList.contains('keyboard-use')) {
      result.style.transition = 'none'; result.style.opacity = '0'; result.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token !== transitionId) return;
        result.style.transition = ''; result.style.opacity = ''; result.style.transform = '';
      }));
    }
    updateSummary();
    $('#selection-mobile').open = false;
    $('#resultat-titre').focus();
    announce(`Simulation terminée. ${SERVICES[state.service].name}, ${longDay.format(toDate(state.day))}, ${hourText(state.time)}. Aucun rendez-vous pris, rien n’a été envoyé.`);
  });
  $('#recommencer').addEventListener('click', resetFlow);

  if ('IntersectionObserver' in window) {
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -35px 0px' });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    const bar = $('#barre-mobile');
    const visibility = { hero: true, booking: false, footer: false };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'actions-accueil' ? 'hero' : entry.target.id === 'reserver' ? 'booking' : 'footer';
        visibility[key] = entry.isIntersecting;
      });
      const visible = !visibility.hero && !visibility.booking && !visibility.footer;
      bar.classList.toggle('is-visible', visible);
      bar.inert = !visible;
      bar.setAttribute('aria-hidden', String(!visible));
    }, { threshold: 0 });
    ['#actions-accueil', '#reserver', '#pied'].forEach(selector => barObserver.observe($(selector)));
  } else {
    $('#barre-mobile').classList.add('is-visible');
  }
  reduce.addEventListener('change', () => {
    if (reduce.matches) {
      ++transitionId;
      [...panels, $('#resultat')].forEach(panel => { panel.style.transition = ''; panel.style.opacity = ''; panel.style.transform = ''; });
    }
  });
  updateSummary();
  $('#simulation').hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  window.apercuPret = true;
})();
