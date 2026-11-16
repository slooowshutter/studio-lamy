/* Institut Doumer — simulation locale, sans requête ni stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    mains: { name: 'Manucure avec vernis coloré', minutes: 20 },
    semi: { name: 'Manucure semi-permanente couleur', minutes: 45 },
    pieds: { name: 'Beauté des pieds avec vernis coloré', minutes: 35 },
    epilation: { name: 'Épilation des sourcils femme', minutes: 15 }
  };
  // Treatwell : tous les jours de 10 h 30 à 20 h. À confirmer avec l’institut.
  const opening = { 0: [630, 1200], 1: [630, 1200], 2: [630, 1200], 3: [630, 1200], 4: [630, 1200], 5: [630, 1200], 6: [630, 1200] };
  const state = { step: 0, service: null, date: '', time: null };
  const form = document.querySelector('#reservation');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const nextButtons = [...document.querySelectorAll('[data-next]')];
  const live = document.querySelector('#annonce-etape');
  let keyboard = false;
  let activeAnimation;

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard-input');
      if (activeAnimation) activeAnimation.cancel();
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-input'); }, { passive: true });

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function longDate(key) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dateFromKey(key));
  }
  function hourLabel(minute) {
    const h = Math.floor(minute / 60), m = minute % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function getSlots(key, duration, now = new Date()) {
    const bounds = opening[dateFromKey(key).getUTCDay()];
    if (!bounds) return [];
    const current = parisNow(now);
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let minute = bounds[0]; minute + duration <= bounds[1]; minute += 30) {
      const past = key < current.key || (key === current.key && minute <= current.minute);
      const exampleTaken = (Math.floor(minute / 30) + seed) % 7 === 0;
      slots.push({ minute, disabled: past || exampleTaken, reason: past ? 'heure passée' : exampleTaken ? 'exemple indisponible' : '' });
    }
    return slots;
  }
  function makeRadio(name, value, id, label, className, disabled, accessibleLabel) {
    const wrapper = document.createElement('div');
    wrapper.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.id = id; input.disabled = disabled;
    if (accessibleLabel) input.setAttribute('aria-label', accessibleLabel);
    const text = document.createElement('label');
    text.htmlFor = id;
    if (typeof label === 'string') text.textContent = label;
    else text.append(...label);
    wrapper.append(input, text);
    return wrapper;
  }
  function generateDays() {
    const fieldset = document.querySelector('#jours');
    fieldset.querySelectorAll('.day-option').forEach(el => el.remove());
    const current = parisNow();
    const start = dateFromKey(current.key);
    for (let i = 0; i < 14; i++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + i);
      const key = dateKey(date);
      const closed = !opening[date.getUTCDay()];
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const number = document.createElement('strong'); number.textContent = String(date.getUTCDate());
      const month = document.createElement('span');
      month.textContent = closed ? 'Fermé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const radio = makeRadio('jour', key, `jour-${i}`, [weekday, number, month], 'day-option', closed, `${longDate(key)}${closed ? ', fermé' : ', simulation'}`);
      radio.querySelector('input').checked = state.date === key;
      fieldset.append(radio);
    }
  }
  function generateTimes() {
    const fieldset = document.querySelector('#heures');
    fieldset.querySelectorAll('.time-option').forEach(el => el.remove());
    if (!state.date || !state.service) return;
    const slots = getSlots(state.date, services[state.service].minutes);
    let remaining = 0;
    let selectedValid = false;
    slots.forEach((slot, i) => {
      const label = `${hourLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', simulation'}`;
      const radio = makeRadio('heure', String(slot.minute), `heure-${i}`, hourLabel(slot.minute), 'time-option', slot.disabled, label);
      radio.querySelector('input').checked = state.time === slot.minute && !slot.disabled;
      if (state.time === slot.minute && !slot.disabled) selectedValid = true;
      if (!slot.disabled) remaining++;
      fieldset.append(radio);
    });
    if (!selectedValid) state.time = null;
    document.querySelector('#aucun-creneau').hidden = remaining > 0;
    document.querySelector('#etape-heure').textContent = `À quelle heure, le ${longDate(state.date)}\u00a0?`;
  }
  function updateSummary() {
    document.querySelector('#resume-soin').textContent = state.service ? `${services[state.service].name} · ${services[state.service].minutes}\u00a0min` : 'À choisir';
    document.querySelector('#resume-jour').textContent = state.date ? longDate(state.date) : 'À choisir';
    document.querySelector('#resume-heure').textContent = state.time !== null ? hourLabel(state.time) : 'À choisir';
    nextButtons.forEach(button => {
      const target = Number(button.dataset.next);
      button.disabled = target === 1 ? !state.service : target === 2 ? !state.date : state.time === null;
    });
    stepButtons.forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = step === 0 ? false : step === 1 ? !state.service : step === 2 ? !state.date : state.time === null;
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(step, focus = true) {
    if (step > 0 && !state.service || step > 1 && !state.date || step > 2 && state.time === null) return;
    const previous = state.step;
    state.step = step;
    if (step === 1) generateDays();
    if (step === 2) generateTimes();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateSummary();
    const panel = panels[step];
    if (activeAnimation) activeAnimation.cancel();
    if (!reduced.matches && !keyboard && panel.animate) {
      const offset = step >= previous ? 12 : -12;
      activeAnimation = panel.animate([{ opacity: 0, transform: `translateX(${offset}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    if (focus) panel.querySelector('h3').focus();
    live.textContent = `Étape ${step + 1} sur 4\u00a0: ${['le soin', 'le jour', 'l’heure', 'vos coordonnées'][step]}. Simulation sans envoi.`;
  }
  function chooseService(value) {
    if (!services[value]) return;
    state.service = value;
    state.date = ''; state.time = null;
    form.querySelectorAll('[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    updateSummary();
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') { state.date = input.value; state.time = null; }
    if (input.name === 'heure') state.time = Number(input.value);
    updateSummary();
  });
  nextButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  function validateField(input) {
    let message = '';
    if (input.id === 'prenom' && !input.value.trim()) message = 'Indiquez un prénom pour terminer l’essai.';
    if (input.id === 'telephone') {
      const value = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0|\+33|0033)[67]\d{8}$/.test(value)) message = 'Indiquez un mobile français valide, avec 06, 07, +33 6 ou +33 7.';
    }
    document.querySelector(`#erreur-${input.id}`).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }
  const identityInputs = [...form.querySelectorAll('#prenom, #telephone')];
  identityInputs.forEach(input => {
    input.addEventListener('blur', () => { if (input.value.trim()) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); document.querySelector(`#erreur-${input.id}`).textContent = ''; }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!state.service || !state.date || state.time === null) { showStep(0); return; }
    const stillAvailable = getSlots(state.date, services[state.service].minutes).some(slot => slot.minute === state.time && !slot.disabled);
    if (!stillAvailable) {
      state.time = null; showStep(2);
      live.textContent = 'Ce créneau de démonstration est désormais passé. Choisissez une autre heure.';
      return;
    }
    const validity = identityInputs.map(validateField);
    if (validity.includes(false)) { identityInputs[validity.indexOf(false)].focus(); return; }
    form.hidden = true;
    document.querySelector('.step-nav').hidden = true;
    document.querySelector('#resultat').hidden = false;
    document.querySelector('#texte-resultat').textContent = `${services[state.service].name}, le ${longDate(state.date)} à ${hourLabel(state.time)}. Votre sélection reste un exemple.`;
    identityInputs.forEach(input => { input.value = ''; });
    document.querySelector('#titre-resultat').focus();
    live.textContent = 'Simulation terminée. Aucun rendez-vous pris. Aucune donnée envoyée.';
  });
  function resetSimulation() {
    form.reset(); state.service = null; state.date = ''; state.time = null;
    form.hidden = false;
    document.querySelector('.step-nav').hidden = false;
    document.querySelector('#resultat').hidden = true;
    identityInputs.forEach(input => { input.removeAttribute('aria-invalid'); document.querySelector(`#erreur-${input.id}`).textContent = ''; });
    showStep(0);
  }
  document.querySelector('#recommencer').addEventListener('click', resetSimulation);
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (form.hidden) resetSimulation();
    chooseService(link.dataset.service);
    showStep(1, false);
  }));

  generateDays(); updateSummary();
  document.querySelector('#simulateur').hidden = false;

  // Sans JavaScript, rien n’est masqué. Les révélations ne sont activées qu’après l’initialisation.
  root.classList.add('js');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
    }, { threshold: .08, rootMargin: '0px 0px 35px 0px' });
    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) { root.classList.remove('motion-ready'); if (activeAnimation) activeAnimation.cancel(); }
  });

  const bar = document.querySelector('#barre-mobile');
  if ('IntersectionObserver' in window) {
    const visible = { hero: true, booking: false, footer: false };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'actions-hero') visible.hero = entry.isIntersecting;
        if (entry.target.id === 'rendez-vous') visible.booking = entry.isIntersecting;
        if (entry.target.id === 'pied') visible.footer = entry.isIntersecting;
      });
      bar.hidden = visible.hero || visible.booking || visible.footer;
    }, { threshold: 0 });
    ['actions-hero', 'rendez-vous', 'pied'].forEach(id => barObserver.observe(document.getElementById(id)));
  }
})();
