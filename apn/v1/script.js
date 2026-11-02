/* APN — simulation locale, aucune transmission ni conservation. */
(() => {
  'use strict';
  const NB = '\u00a0';
  const SERVICES = {
    coupe: { name: 'Coupe classique', duration: 30 },
    barbe: { name: 'Barbe classique', duration: 30 },
    'coupe-barbe': { name: 'Coupe & barbe classique', duration: 45 }
  };
  // Horaires Planity, relevés dans research/brand-apn.md. Divergence signalée dans le site.
  const HOURS = { 0: [540, 1140], 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow(instant = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(instant).map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function longDate(key) { return dateFormat.format(dateFromKey(key)); }
  function hourText(minutes) { return `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`; }
  function dayKeys(instant = new Date()) {
    const start = dateFromKey(parisNow(instant).key);
    return Array.from({ length: 14 }, (_, index) => new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10));
  }
  function slotsFor(key, duration, instant = new Date()) {
    const opening = HOURS[dateFromKey(key).getUTCDay()];
    if (!opening) return [];
    const now = parisNow(instant);
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = opening[0], i = 0; minute + duration <= opening[1]; minute += 30, i++) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const taken = (seed + i * 7) % 6 === 0;
      slots.push({ minute, past, taken, disabled: past || taken });
    }
    return slots;
  }
  function validPhone(value) {
    const normalized = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalized);
  }
  // Accès aux règles pures pour la vérification locale, sans dépendance de navigateur.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { SERVICES, HOURS, parisNow, dayKeys, slotsFor, validPhone, hourText };
    return;
  }

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const root = document.documentElement;
  const body = document.body;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const form = $('#reservation');
  const panels = $$('.panel');
  const result = $('#resultat');
  const announcement = $('#annonce');
  const state = { step: 1, service: '', day: '', minute: null };
  let keyboard = false;
  let transitionTimer;
  let entryFrame;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === ' ') { keyboard = true; root.classList.add('clavier'); }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('clavier'); }, { passive: true });
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  ready();
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    $$('[data-reveal], .cadence').forEach(element => reveal.observe(element));
    const bar = new IntersectionObserver(entries => {
      entries.forEach(entry => body.classList.toggle(entry.target.id === 'rendez-vous' ? 'in-booking' : 'in-footer', entry.isIntersecting));
    }, { threshold: 0 });
    bar.observe($('#rendez-vous'));
    bar.observe($('#sources'));
  } else { $$('[data-reveal], .cadence').forEach(element => element.classList.add('is-visible')); }

  function announce(text) { announcement.textContent = text; }
  function errorFor(step, show) { const error = $(`#erreur-${step}`); if (error) error.hidden = !show; }
  function updateSummary() {
    const service = SERVICES[state.service];
    $('#selection-soin').textContent = service ? service.name : 'À choisir';
    $('#selection-jour').textContent = state.day ? longDate(state.day) : 'À choisir';
    $('#selection-heure').textContent = state.minute !== null ? hourText(state.minute) : 'À choisir';
    $('#recap-final').textContent = service && state.day && state.minute !== null ? `${service.name} · ${longDate(state.day)} à ${hourText(state.minute)} · ${service.duration}${NB}min. Simulation uniquement.` : '';
    $$('[data-goto]').forEach(button => {
      const target = Number(button.dataset.goto);
      button.disabled = target > (state.minute !== null ? 4 : state.day ? 3 : state.service ? 2 : 1);
      if (target === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function radioLabel(name, value, className) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = String(value);
    label.append(input);
    return { label, input };
  }
  function span(text, className) {
    const element = document.createElement('span'); element.className = className; element.textContent = text; return element;
  }
  function renderDays() {
    const holder = $('#jours');
    holder.replaceChildren();
    dayKeys().forEach(key => {
      const date = dateFromKey(key);
      const closed = !HOURS[date.getUTCDay()];
      const ended = !closed && slotsFor(key, SERVICES[state.service].duration).every(slot => slot.disabled);
      const { label, input } = radioLabel('jour', key, 'day');
      input.disabled = closed || ended; input.checked = key === state.day;
      input.setAttribute('aria-label', `${longDate(key)}${closed ? ', fermé' : ended ? ', aucun créneau fictif restant' : ''}`);
      label.append(span(shortDayFormat.format(date), 'day__name'), span(String(date.getUTCDate()), 'day__number'), span(monthFormat.format(date), 'day__month'));
      if (closed || ended) label.append(span(closed ? 'Fermé' : 'Complet', 'day__note'));
      holder.append(label);
    });
  }
  function renderSlots() {
    const holder = $('#heures');
    holder.replaceChildren();
    $('#jour-choisi').textContent = `${longDate(state.day)} · ${SERVICES[state.service].duration}${NB}min.`;
    slotsFor(state.day, SERVICES[state.service].duration).forEach(slot => {
      const { label, input } = radioLabel('heure', slot.minute, 'slot');
      input.disabled = slot.disabled; input.checked = slot.minute === state.minute;
      const suffix = slot.past ? 'Passé' : slot.taken ? 'Indisponible' : '';
      input.setAttribute('aria-label', `${hourText(slot.minute)}${suffix ? `, ${suffix.toLowerCase()}` : ', créneau fictif'}`);
      label.append(span(hourText(slot.minute), 'slot__hour'));
      if (suffix) label.append(span(suffix, 'slot__note'));
      holder.append(label);
    });
    if (!holder.children.length) holder.textContent = 'Aucun créneau pour ce jour. Choisissez une autre date.';
  }
  function focusHeading(panel) { $('h3', panel).focus({ preventScroll: true }); }
  function showStep(target, options = {}) {
    if (target < 1 || target > 4) return;
    clearTimeout(transitionTimer);
    cancelAnimationFrame(entryFrame);
    const current = $(`[data-step="${state.step}"]`);
    const incoming = $(`[data-step="${target}"]`);
    if (target === 2) renderDays();
    if (target === 3) renderSlots();
    const instant = options.instant || keyboard || reduce.matches || target === state.step;
    // Une nouvelle demande nettoie la sortie précédente ; aucun clic n’est perdu.
    panels.forEach(panel => {
      panel.classList.remove('is-outgoing', 'is-leaving', 'is-entering');
      panel.inert = false; panel.removeAttribute('aria-hidden');
      panel.hidden = panel !== current && panel !== incoming;
    });
    incoming.hidden = false;
    if (instant) current.hidden = current !== incoming;
    else {
      current.classList.add('is-outgoing', 'is-leaving');
      incoming.classList.add('is-entering');
      current.inert = true;
      transitionTimer = setTimeout(() => {
        current.hidden = true; current.inert = false;
        current.removeAttribute('aria-hidden'); current.classList.remove('is-outgoing', 'is-leaving');
      }, 240);
      entryFrame = requestAnimationFrame(() => {
        entryFrame = requestAnimationFrame(() => incoming.classList.remove('is-entering'));
      });
    }
    state.step = target;
    errorFor(target, false); updateSummary();
    if (!options.noFocus) {
      focusHeading(incoming);
      if (options.scroll !== false) {
        const bounds = incoming.getBoundingClientRect();
        if (bounds.top < 24 || bounds.top > window.innerHeight * .6) incoming.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : 'smooth' });
      }
    }
    if (!instant) current.setAttribute('aria-hidden', 'true');
    announce(`Étape ${target} sur 4 : ${['la prestation', 'le jour', 'l’heure', 'vos coordonnées'][target - 1]}.`);
  }
  function validateStep() {
    const valid = state.step === 1 ? Boolean(state.service) : state.step === 2 ? Boolean(state.day) : state.step === 3 ? state.minute !== null : true;
    errorFor(state.step, !valid);
    if (!valid) {
      announce($(`#erreur-${state.step}`).textContent);
      const radio = $('input:not(:disabled)', $(`[data-step="${state.step}"]`));
      if (radio) radio.focus();
    }
    return valid;
  }
  function resetDownstream(level) {
    if (level <= 1) { state.day = ''; $$('input[name="jour"]').forEach(input => { input.checked = false; }); }
    if (level <= 2) { state.minute = null; $$('input[name="heure"]').forEach(input => { input.checked = false; }); }
    $$('[id^="erreur-"]').forEach(error => { error.hidden = true; });
    updateSummary();
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      if (state.service !== input.value) { state.service = input.value; resetDownstream(1); }
      errorFor(1, false);
      announce(`${SERVICES[state.service].name}, ${SERVICES[state.service].duration}${NB}min, sélectionnée.`);
    }
    if (input.name === 'jour') {
      if (state.day !== input.value) { state.day = input.value; resetDownstream(2); }
      errorFor(2, false); announce(`${longDate(state.day)}, sélectionné.`);
    }
    if (input.name === 'heure') {
      state.minute = Number(input.value); errorFor(3, false); updateSummary();
      announce(`${hourText(state.minute)}, sélectionné.`);
    }
  });
  form.addEventListener('click', event => {
    if (event.target.closest('[data-next]') && validateStep()) showStep(state.step + 1);
    if (event.target.closest('[data-prev]')) showStep(state.step - 1);
    const goto = event.target.closest('[data-goto]');
    if (goto && !goto.disabled) showStep(Number(goto.dataset.goto));
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    const service = link.dataset.service;
    if (!SERVICES[service]) return;
    if (!result.hidden) reset();
    if (state.service !== service) { state.service = service; resetDownstream(1); }
    $(`input[name="prestation"][value="${service}"]`).checked = true;
    showStep(1, { instant: true, noFocus: true });
    requestAnimationFrame(() => focusHeading($('[data-step="1"]')));
  }));

  function fieldError(id, bad) {
    $(`#erreur-${id}`).hidden = !bad;
    if (bad) $(`#${id}`).setAttribute('aria-invalid', 'true');
    else $(`#${id}`).removeAttribute('aria-invalid');
  }
  ['prenom', 'telephone'].forEach(id => $(`#${id}`).addEventListener('input', () => {
    if (id === 'prenom' ? Boolean($('#prenom').value.trim()) : validPhone($('#telephone').value)) fieldError(id, false);
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 4) return;
    const nameValid = Boolean($('#prenom').value.trim());
    const phoneValid = validPhone($('#telephone').value);
    fieldError('prenom', !nameValid); fieldError('telephone', !phoneValid);
    if (!nameValid || !phoneValid) {
      (nameValid ? $('#telephone') : $('#prenom')).focus();
      announce('Vérifiez les coordonnées indiquées. Rien n’a été envoyé.');
      return;
    }
    // Recontrôle à l’instant de validation : un créneau passé ne peut être confirmé.
    const stillAvailable = state.day && slotsFor(state.day, SERVICES[state.service].duration).some(slot => slot.minute === state.minute && !slot.disabled);
    if (!stillAvailable) {
      state.minute = null; showStep(3, { instant: true });
      announce('Ce créneau fictif est passé. Choisissez une autre heure.');
      return;
    }
    $('#recap-resultat').textContent = `${SERVICES[state.service].name} · ${longDate(state.day)} à ${hourText(state.minute)} · ${SERVICES[state.service].duration}${NB}min.`;
    $('#prenom').value = ''; $('#telephone').value = '';
    form.hidden = true; result.hidden = false;
    if (!keyboard && !reduce.matches) {
      result.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => result.classList.remove('is-entering')));
    }
    focusHeading(result);
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  function reset() {
    clearTimeout(transitionTimer); cancelAnimationFrame(entryFrame);
    state.step = 1; state.service = ''; state.day = ''; state.minute = null;
    form.reset(); form.hidden = false; result.hidden = true;
    panels.forEach((panel, index) => { panel.hidden = index !== 0; panel.inert = false; panel.removeAttribute('aria-hidden'); panel.classList.remove('is-outgoing', 'is-leaving', 'is-entering'); });
    $$('[id^="erreur-"]').forEach(error => { error.hidden = true; });
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    updateSummary();
  }
  $('#recommencer').addEventListener('click', () => { reset(); focusHeading(panels[0]); announce('Nouvelle simulation. Choisissez une prestation.'); });
  // Retour d’un onglet : actualiser les jours/créneaux au moment de les consulter.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || form.hidden) return;
    if (state.day && !dayKeys().includes(state.day)) { state.day = ''; state.minute = null; showStep(state.service ? 2 : 1, { instant: true, noFocus: true }); }
    else if (state.step === 2) renderDays();
    else if (state.step === 3) renderSlots();
    updateSummary();
  });
  form.hidden = false;
  $('.nojs').hidden = true;
  updateSummary();
  window.apnPret = true;
})();
