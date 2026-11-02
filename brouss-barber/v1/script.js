/* Brouss Barber — parcours local, aucun envoi et aucun stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard');
  }, { passive: true });

  const services = [
    { id: 'lino', name: 'Coupe Lino Ventura', duration: 30 },
    { id: 'james', name: 'Coupe James Dean', duration: 30 },
    { id: 'vin', name: 'Coupe Vin Diesel', duration: 30 },
    { id: 'billy', name: 'Coupe Billy The Kid', duration: 30 },
    { id: 'georges', name: 'À la Georges Clooney', duration: 15 },
    { id: 'victor', name: 'À la Victor Hugo', duration: 30 },
    { id: 'ancienne', name: 'À l’ancienne', duration: 30 },
    { id: 'chabal', name: 'Forfait Chabal', duration: 60 }
  ];
  // Plages communes aux sources Planity et iCoiffeur ; samedi : 09:00 par prudence.
  const opening = { 0: [], 1: [], 2: [[540, 720], [840, 1140]], 3: [[540, 720], [840, 1140]], 4: [[540, 720], [840, 1140]], 5: [[540, 720], [840, 1140]], 6: [[540, 1020]] };
  const state = { service: null, day: null, time: null, step: 0 };
  const byId = id => document.getElementById(id);
  const form = byId('reservation-formulaire');
  const panels = [...document.querySelectorAll('.booking-step')];
  const headings = ['etape-prestation', 'etape-jour', 'etape-heure', 'etape-coordonnees'];
  const errors = ['erreur-prestation', 'erreur-jour', 'erreur-heure'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let animating = null;
  let completed = false;

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).map(p => [p.type, p.value]));
    return { date: new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12)), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function key(date) { return date.toISOString().slice(0, 10); }
  function dayDate(value) { return new Date(value + 'T12:00:00Z'); }
  function timeLabel(minutes) { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`; }
  function durationLabel(minutes) { return minutes === 60 ? '1\u00a0h' : `${minutes}\u00a0min`; }
  function announce(text) { byId('annonce').textContent = text; }
  function availableSlots(day, service, now = parisNow()) {
    if (!day || !service) return [];
    const date = dayDate(day);
    const today = key(now.date);
    const seed = Math.floor(date.getTime() / 86400000);
    const slots = [];
    (opening[date.getUTCDay()] || []).forEach(([start, end]) => {
      for (let minute = start; minute + service.duration <= end; minute += 30) {
        const past = day < today || (day === today && minute <= now.minutes);
        const unavailable = (seed + Math.floor(minute / 30)) % 7 === 0;
        slots.push({ minute, disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans l’essai' : 'Créneau fictif' });
      }
    });
    return slots;
  }
  function choiceInput(name, value) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    return input;
  }
  function renderServices() {
    const group = byId('prestations');
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'service-choice';
      const input = choiceInput('prestation', service.id);
      input.setAttribute('aria-describedby', 'erreur-prestation');
      const title = document.createElement('span');
      title.textContent = service.name;
      const duration = document.createElement('span');
      duration.textContent = durationLabel(service.duration);
      label.append(input, title, duration);
      group.append(label);
      input.addEventListener('change', () => selectService(service));
    });
  }
  function selectService(service) {
    const changed = state.service?.id !== service.id;
    state.service = service;
    const input = form.querySelector(`input[name="prestation"][value="${service.id}"]`);
    if (input) input.checked = true;
    if (changed) {
      state.day = null;
      state.time = null;
    }
    byId(errors[0]).hidden = true;
    updateSummary();
    announce(`${service.name}, ${durationLabel(service.duration)}. Sélection dans la simulation.`);
  }
  function renderDays() {
    const group = byId('jours');
    group.querySelectorAll('label').forEach(label => label.remove());
    const now = parisNow();
    for (let index = 0; index < 14; index++) {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + index);
      const value = key(date);
      const closed = opening[date.getUTCDay()].length === 0;
      const noSlots = !closed && !availableSlots(value, state.service, now).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'day-choice';
      const input = choiceInput('jour', value);
      input.disabled = closed || noSlots;
      input.checked = value === state.day && !input.disabled;
      const status = closed ? 'Fermé' : noSlots ? 'Écoulé' : monthFormat.format(date);
      input.setAttribute('aria-label', `${dateFormat.format(date)}, ${closed ? 'fermé selon les horaires publiés' : noSlots ? 'aucun créneau dans cet essai' : 'jour de démonstration'}`);
      input.setAttribute('aria-describedby', 'erreur-jour');
      const content = document.createElement('span');
      const weekday = document.createElement('span');
      weekday.textContent = weekdayFormat.format(date);
      const number = document.createElement('strong');
      number.textContent = String(date.getUTCDate());
      const detail = document.createElement('small');
      detail.textContent = status;
      content.append(weekday, number, detail);
      label.append(input, content);
      group.append(label);
      input.addEventListener('change', () => {
        state.day = value;
        state.time = null;
        byId(errors[1]).hidden = true;
        updateSummary();
        announce(`${dateFormat.format(date)}, jour de démonstration sélectionné.`);
      });
    }
  }
  function renderTimes() {
    const group = byId('heures');
    group.querySelectorAll('label').forEach(label => label.remove());
    const slots = availableSlots(state.day, state.service);
    byId('legende-creneaux').textContent = `${dateFormat.format(dayDate(state.day))}. Créneaux fictifs, aucune disponibilité réelle. Les heures barrées sont indisponibles dans l’essai.`;
    slots.forEach(slot => {
      const label = document.createElement('label');
      label.className = 'slot-choice';
      const input = choiceInput('heure', slot.minute);
      input.disabled = slot.disabled;
      input.checked = state.time === slot.minute && !slot.disabled;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.reason.toLocaleLowerCase('fr-FR')}`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      const content = document.createElement('span');
      content.textContent = timeLabel(slot.minute);
      label.append(input, content);
      group.append(label);
      input.addEventListener('change', () => {
        state.time = slot.minute;
        byId(errors[2]).hidden = true;
        updateSummary();
        announce(`${timeLabel(slot.minute)}, heure de démonstration sélectionnée.`);
      });
    });
  }
  function summaryText() {
    return `${state.service.name} · ${durationLabel(state.service.duration)} · ${dateFormat.format(dayDate(state.day))} à ${timeLabel(state.time)}. Simulation uniquement.`;
  }
  function updateSummary() {
    byId('recap-prestation').textContent = state.service ? state.service.name : 'Un nom à choisir.';
    byId('recap-duree').textContent = state.service ? durationLabel(state.service.duration) : 'À choisir';
    byId('recap-jour').textContent = state.day ? shortDate.format(dayDate(state.day)) : 'À choisir';
    byId('recap-heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    const editGroup = byId('modifications');
    editGroup.replaceChildren();
    if (completed) return;
    const items = [[0, 'La prestation', !!state.service], [1, 'Le jour', !!state.day], [2, 'L’heure', state.time !== null]];
    items.forEach(([index, label, selected]) => {
      if (!selected || index >= state.step) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-link';
      button.textContent = label;
      button.setAttribute('aria-label', `Modifier ${label.toLocaleLowerCase('fr-FR')}`);
      button.addEventListener('click', () => showStep(index));
      editGroup.append(button);
    });
    if (state.service && state.day && state.time !== null) byId('confirmation-recap').textContent = summaryText();
  }
  function runEntrance(element) {
    if (animating) animating.cancel();
    if (!keyboard && !reduced.matches && element.animate) {
      animating = element.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  function showStep(index, focus = true) {
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    document.querySelectorAll('.step-list li').forEach((item, i) => {
      if (i === index) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    updateSummary();
    runEntrance(panels[index]);
    if (focus) byId(headings[index]).focus({ preventScroll: false });
    announce(`Étape ${index + 1} sur 4 : ${byId(headings[index]).textContent} Simulation, sans envoi.`);
  }
  function proceed() {
    const chosen = [!!state.service, !!state.day, state.time !== null][state.step];
    if (!chosen) {
      const message = byId(errors[state.step]);
      message.hidden = false;
      const first = panels[state.step].querySelector('input:not(:disabled)');
      first?.focus();
      announce(message.textContent);
      return;
    }
    if (state.step === 1 && !availableSlots(state.day, state.service).some(slot => !slot.disabled)) {
      state.day = null;
      state.time = null;
      showStep(1);
      announce('Cette journée ne propose plus de créneau dans l’essai. Choisissez un autre jour.');
      return;
    }
    if (state.step === 2 && !availableSlots(state.day, state.service).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      renderTimes();
      updateSummary();
      announce('Cette heure est passée. Choisissez un autre créneau de démonstration.');
      return;
    }
    showStep(state.step + 1);
  }
  function validPhone(value) {
    const normalized = value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalized);
  }
  function setFieldError(input, message, invalid) {
    byId(message).hidden = !invalid;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const firstName = byId('prenom');
    const phone = byId('telephone');
    const invalidName = !firstName.value.trim();
    const invalidPhone = !validPhone(phone.value);
    setFieldError(firstName, 'erreur-prenom', invalidName);
    setFieldError(phone, 'erreur-telephone', invalidPhone);
    if (invalidName || invalidPhone) {
      (invalidName ? firstName : phone).focus();
      announce('Vérifiez les champs indiqués avant de terminer l’essai.');
      return;
    }
    if (!availableSlots(state.day, state.service).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      showStep(2);
      announce('Cette heure est passée. Choisissez un autre créneau de démonstration.');
      return;
    }
    completed = true;
    byId('resultat-recap').textContent = `${firstName.value.trim()}, voici votre sélection de démonstration : ${summaryText()}`;
    firstName.value = '';
    phone.value = '';
    form.hidden = true;
    byId('resultat').hidden = false;
    document.querySelector('.step-list').hidden = true;
    updateSummary();
    runEntrance(byId('resultat'));
    byId('resultat-titre').focus();
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  byId('prenom').addEventListener('input', () => setFieldError(byId('prenom'), 'erreur-prenom', false));
  byId('telephone').addEventListener('input', () => setFieldError(byId('telephone'), 'erreur-telephone', false));
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', proceed));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Math.max(0, state.step - 1))));

  function reset() {
    completed = false;
    form.hidden = false;
    byId('resultat').hidden = true;
    document.querySelector('.step-list').hidden = false;
    form.reset();
    state.service = null;
    state.day = null;
    state.time = null;
    errors.forEach(id => { byId(id).hidden = true; });
    setFieldError(byId('prenom'), 'erreur-prenom', false);
    setFieldError(byId('telephone'), 'erreur-telephone', false);
  }
  byId('recommencer').addEventListener('click', () => { reset(); showStep(0); });
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', event => {
      const service = services.find(item => item.id === link.dataset.service);
      if (!service) return;
      event.preventDefault();
      if (completed) reset();
      selectService(service);
      showStep(0, false);
      byId('essai').scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
      // Le déplacement reste immédiat au clavier et la mise au point ne relance pas le défilement.
      byId('etape-prestation').focus({ preventScroll: true });
    });
  });

  // La barre de téléphone revient entre les grandes actions, sans doubler le parcours.
  if ('IntersectionObserver' in window) {
    const bar = document.querySelector('.mobile-bar');
    const visible = new Set();
    bar.hidden = true;
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      bar.hidden = visible.size > 0;
    }, { threshold: 0 });
    ['.hero', '.simulation', '.site-footer'].forEach(selector => barObserver.observe(document.querySelector(selector)));
  }

  renderServices();
  byId('module-reservation').hidden = false;
  showStep(0, false);
  // Toutes les informations restent lisibles si le chargement du module échoue avant ce point.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const targets = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        if (element.dataset.reveal === 'row') {
          const siblings = [...element.parentElement.children];
          element.style.transitionDelay = `${siblings.indexOf(element) * 50}ms`;
        }
        element.classList.add('is-visible');
        observer.unobserve(element);
      });
    }, { threshold: .12 });
    targets.forEach(element => observer.observe(element));
    reduced.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect();
        targets.forEach(element => element.classList.add('is-visible'));
        animating?.cancel();
      }
    });
  } else targets.forEach(element => element.classList.add('is-visible'));
})();
