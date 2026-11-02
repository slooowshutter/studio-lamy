/* Simulation locale : aucune requête, aucun stockage. Sources : SOURCES.md. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, scope = document) => scope.querySelector(s);
  const $$ = (s, scope = document) => [...scope.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.23,1,.32,1)';
  const services = [
    { id: 'coupe', name: 'Shampoing + Coupe + Coiffage', detail: 'Cheveux très courts · Ciseaux', duration: 45 },
    { id: 'coupe-barbe', name: 'Shampoing + Coupe + Barbe + Coiffage', detail: '', duration: 60 },
    { id: 'brushing-court', name: 'Shampoing + Coupe + Brushing - Cheveux Courts', detail: '', duration: 45 },
    { id: 'brushing-long', name: 'Shampoing + Coupe + Brushing - Cheveux Longs', detail: '', duration: 50 },
    { id: 'barbe', name: 'Barbe + Huiles Essentielles + Serviette Chaude + Après Rasage', detail: '', duration: 30 }
  ];
  // Dimanche → samedi, minutes depuis minuit. Tableau Planity, pas la prose promotionnelle.
  const hours = [[840, 1260], [600, 1140], [600, 1200], [600, 1260], [600, 1200], [600, 1260], [600, 1260]];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' });
  const state = { step: 0, service: '', day: '', time: null, done: false };
  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const form = $('#reservation');
  let panelAnimation;
  let keyboard = false;

  function parisNow() {
    const p = {};
    parisFormat.formatToParts(new Date()).forEach(v => { p[v.type] = v.value; });
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function fromISO(iso) { return new Date(`${iso}T12:00:00Z`); }
  function isoDate(date) { return date.toISOString().slice(0, 10); }
  function timeText(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function durationText(minutes) { return `${minutes}\u00a0min`; }
  function selectedService() { return services.find(v => v.id === state.service); }
  function slotData(iso, duration) {
    const day = fromISO(iso);
    const range = hours[day.getUTCDay()];
    if (!range) return [];
    const now = parisNow();
    const seed = Number(iso.replaceAll('-', ''));
    const slots = [];
    for (let time = range[0], i = 0; time + duration <= range[1]; time += 30, i++) {
      const past = iso < now.date || (iso === now.date && time <= now.minutes);
      const unavailable = (seed + i * 7) % 9 === 0;
      slots.push({ time, past, unavailable, disabled: past || unavailable });
    }
    return slots;
  }
  function makeRadio(name, value, text, className, describedBy) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    if (describedBy) input.setAttribute('aria-describedby', describedBy);
    const span = document.createElement('span');
    span.textContent = text;
    label.append(input, span);
    return { label, input, span };
  }
  function clearOptions(fieldset) { $$('label', fieldset).forEach(v => v.remove()); }
  function renderServices() {
    const target = $('#choix-prestation');
    services.forEach(service => {
      const { label, input, span } = makeRadio('prestation', service.id, service.name, 'service-option', 'erreur-prestation');
      span.className = 'option-text';
      const detail = document.createElement('span');
      detail.className = 'option-duration';
      detail.textContent = [service.detail, durationText(service.duration)].filter(Boolean).join(' · ');
      span.append(detail);
      input.addEventListener('change', () => chooseService(service.id));
      target.append(label);
    });
  }
  function chooseService(id) {
    state.service = id; state.day = ''; state.time = null;
    $$('input[name="prestation"]').forEach(v => { v.checked = v.value === id; });
    $('#erreur-prestation').textContent = '';
    updateSummary(); updateSteps();
  }
  function renderDays() {
    const target = $('#choix-jour');
    clearOptions(target);
    const today = fromISO(parisNow().date);
    const service = selectedService();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today); date.setUTCDate(date.getUTCDate() + i);
      const iso = isoDate(date);
      const closed = !hours[date.getUTCDay()];
      const available = !closed && slotData(iso, service.duration).some(v => !v.disabled);
      const { label, input, span } = makeRadio('jour', iso, dayFormat.format(date), 'day-option', 'erreur-jour');
      input.setAttribute('aria-label', `${dateFormat.format(date)}${closed ? ', fermé' : available ? ', exemple' : ', aucun créneau d’essai'}`);
      input.disabled = !available;
      input.checked = state.day === iso && available;
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = date.getUTCDate();
      const month = document.createElement('span'); month.className = 'day-month'; month.textContent = monthFormat.format(date);
      label.append(number, month);
      if (!available) {
        const status = document.createElement('span'); status.className = 'option-status'; status.textContent = closed ? 'Fermé' : 'Sans créneau'; label.append(status);
      }
      input.addEventListener('change', () => {
        state.day = iso; state.time = null;
        $('#erreur-jour').textContent = '';
        updateSummary(); updateSteps();
      });
      target.append(label);
    }
    if (state.day && !$('#choix-jour input:checked')) { state.day = ''; state.time = null; updateSummary(); updateSteps(); }
  }
  function renderSlots() {
    const target = $('#choix-heure');
    clearOptions(target);
    const service = selectedService();
    const range = hours[fromISO(state.day).getUTCDay()];
    $('#horaire-jour').textContent = `${dateFormat.format(fromISO(state.day))} · ${timeText(range[0])}–${timeText(range[1])}. Exemples uniquement, disponibilités réelles à confirmer.`;
    slotData(state.day, service.duration).forEach(slot => {
      const { label, input } = makeRadio('heure', String(slot.time), timeText(slot.time), 'slot-option', 'erreur-heure');
      input.disabled = slot.disabled;
      input.checked = state.time === slot.time && !slot.disabled;
      if (slot.disabled) {
        const status = document.createElement('span'); status.className = 'option-status'; status.textContent = slot.past ? 'Passé' : 'Exemple indisponible'; label.append(status);
      }
      input.addEventListener('change', () => {
        state.time = slot.time; $('#erreur-heure').textContent = '';
        updateSummary(); updateSteps();
      });
      target.append(label);
    });
    if (state.time !== null && !$('#choix-heure input:checked')) { state.time = null; updateSummary(); updateSteps(); }
  }
  function updateSummary() {
    const service = selectedService();
    $('#selection-prestation').textContent = service ? service.name : 'Une prestation à choisir';
    $('#selection-jour').textContent = state.day ? dateFormat.format(fromISO(state.day)) : 'Un jour à choisir';
    $('#selection-heure').textContent = state.time !== null ? timeText(state.time) : 'Une heure à choisir';
    $('#recapitulatif').textContent = service && state.day && state.time !== null ? `${service.name} · ${dateFormat.format(fromISO(state.day))} à ${timeText(state.time)}. Simulation uniquement.` : '';
  }
  function updateSteps() {
    steps.forEach((button, index) => {
      button.disabled = state.done || (index === 1 && !state.service) || (index === 2 && !state.day) || (index === 3 && state.time === null);
      if (index === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 24 || rect.bottom > window.innerHeight - 90) {
      heading.scrollIntoView({ block: 'start', behavior: keyboard || reduced.matches ? 'instant' : 'smooth' });
    }
  }
  function revealPanel(index, focus = true) {
    panelAnimation?.cancel();
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, n) => { panel.hidden = n !== index; });
    const panel = panels[index];
    if (!reduced.matches && !keyboard && panel.animate) {
      panelAnimation = panel.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing });
    }
    updateSteps();
    $('#annonce').textContent = `Étape ${index + 1} sur 4 : ${$('h3', panel).textContent}`;
    if (focus) focusHeading($('h3', panel));
  }
  function requireChoice(step) {
    const names = ['prestation', 'jour', 'heure'];
    const values = [state.service, state.day, state.time !== null];
    if (values[step]) return true;
    const name = names[step];
    $(`#erreur-${name}`).textContent = ['Choisissez une prestation pour continuer.', 'Choisissez un jour pour continuer.', 'Choisissez une heure pour continuer.'][step];
    $(`input[name="${name}"]:not(:disabled)`)?.focus();
    return false;
  }
  function validateField(input) {
    let error = '';
    const value = input.value.trim();
    if (input.id === 'prenom' && !value) error = 'Indiquez un prénom pour cet essai.';
    if (input.id === 'telephone') {
      const digits = value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(digits)) error = 'Indiquez un mobile français valide, commençant par 06, 07 ou +33.';
    }
    $(`#erreur-${input.id}`).textContent = error;
    input.setAttribute('aria-invalid', error ? 'true' : 'false');
    return !error;
  }
  steps.forEach(button => button.addEventListener('click', () => { if (!button.disabled) revealPanel(Number(button.dataset.step)); }));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (requireChoice(next - 1)) revealPanel(next);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.done) reset();
    chooseService(link.dataset.service);
    revealPanel(0, false);
  }));
  $$('#prenom, #telephone').forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validateField(input); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); $(`#erreur-${input.id}`).textContent = ''; } });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.done) return;
    if (state.step < 3) { if (requireChoice(state.step)) revealPanel(state.step + 1); return; }
    const service = selectedService();
    const validSlot = service && state.day && slotData(state.day, service.duration).some(v => v.time === state.time && !v.disabled);
    if (!validSlot) {
      state.time = null; updateSummary(); revealPanel(1);
      $('#erreur-jour').textContent = 'Le créneau d’essai est passé. Choisissez à nouveau un jour et une heure.';
      return;
    }
    const firstValid = validateField($('#prenom'));
    const phoneValid = validateField($('#telephone'));
    if (!firstValid || !phoneValid) { $(firstValid ? '#telephone' : '#prenom').focus(); return; }
    const name = $('#prenom').value.trim();
    $('#confirmation-texte').textContent = `${name}, voici votre essai : ${service.name}, ${dateFormat.format(fromISO(state.day))} à ${timeText(state.time)}.`;
    form.reset();
    state.done = true;
    form.hidden = true; $('#confirmation').hidden = false;
    updateSteps();
    $('#annonce').textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris, rien n’a été envoyé.';
    focusHeading($('#confirmation h3'));
  });
  function reset() {
    form.reset();
    Object.assign(state, { step: 0, service: '', day: '', time: null, done: false });
    $$('.form-error').forEach(v => { v.textContent = ''; });
    $$('[aria-invalid]').forEach(v => v.removeAttribute('aria-invalid'));
    $('#confirmation-texte').textContent = '';
    form.hidden = false; $('#confirmation').hidden = true;
    updateSummary(); revealPanel(0);
  }
  $('#recommencer').addEventListener('click', reset);
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); panelAnimation?.cancel(); }, { capture: true });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true, capture: true });
  reduced.addEventListener('change', () => { panelAnimation?.cancel(); });

  renderServices(); updateSummary(); updateSteps();
  $('#parcours').hidden = false;
  window.sitePret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('reading')));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); } });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach((element, index) => {
      element.classList.add('pending');
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 3) * 60}ms`;
      observer.observe(element);
    });
    const hiddenSections = new Set();
    const bar = $('.mobile-bar');
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) hiddenSections.add(entry.target); else hiddenSections.delete(entry.target); });
      const hidden = hiddenSections.size > 0;
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
      bar.setAttribute('aria-hidden', String(hidden));
    }, { threshold: 0 });
    [$('#reserver'), $('#pied-de-page')].forEach(v => barObserver.observe(v));
  }
})();
