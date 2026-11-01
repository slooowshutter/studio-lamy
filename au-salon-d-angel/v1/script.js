(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const app = document.querySelector('#booking-app');
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('.booking-step')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const live = document.querySelector('#annonce');
  const services = {
    consultation: { name: 'Consultation, diagnostic', duration: 20 },
    soin: { name: 'Soin à la kératine végétale, cheveux courts', duration: 60 }
  };
  // Horaires du tableau Planity. Aucune nocturne n’est déduite du texte.
  const hours = { 0: null, 1: null, 2: [540, 1080], 3: [540, 720], 4: null, 5: [540, 1080], 6: [540, 1020] };
  const state = { service: '', day: '', time: null, step: 0, visited: 0, finished: false };
  let keyboard = false;
  let panelFrame = 0;
  let proofTimer;

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard-mode');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-mode');
  }, { passive: true });

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function formatDate(key) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateFromKey(key));
  }
  function formatTime(minute) {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function slotsFor(key) {
    const date = dateFromKey(key);
    const schedule = hours[date.getUTCDay()];
    if (!schedule || !services[state.service]) return [];
    const now = parisNow();
    const duration = services[state.service].duration;
    const result = [];
    for (let minute = schedule[0]; minute + duration <= schedule[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      // Indisponibilités fictives, uniquement pour illustrer le fonctionnement.
      const unavailable = (date.getUTCDate() * 7 + minute / 30) % 6 === 0;
      result.push({ minute, past, unavailable, disabled: past || unavailable });
    }
    return result;
  }
  function announce(message) { live.textContent = message; }
  function clearError(name) {
    const error = document.querySelector(`#erreur-${name}`);
    if (error) error.textContent = '';
  }
  function error(name, message) {
    document.querySelector(`#erreur-${name}`).textContent = message;
    announce(message);
  }
  function updateSummary() {
    document.querySelector('#recap-prestation').textContent = state.service ? services[state.service].name : 'Tout commence par un choix.';
    document.querySelector('#recap-jour').textContent = state.day ? formatDate(state.day) : 'À choisir';
    document.querySelector('#recap-heure').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    document.querySelector('#verification-recap').textContent = state.service && state.day && state.time !== null
      ? `${services[state.service].name} · ${formatDate(state.day)} à ${formatTime(state.time)}. Créneau fictif.`
      : '';
    const proof = document.querySelector('.selection-proof');
    clearTimeout(proofTimer);
    if (!keyboard && !reducedMotion.matches) {
      proof.classList.add('changed');
      proofTimer = setTimeout(() => proof.classList.remove('changed'), 120);
    } else proof.classList.remove('changed');
    updateStepNav();
  }
  function updateStepNav() {
    stepButtons.forEach((button, index) => {
      button.disabled = state.finished || index > state.visited;
      if (!state.finished && index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const target = document.querySelector('#jours');
    target.replaceChildren();
    const base = dateFromKey(parisNow().key);
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      const uncertain = date.getUTCDay() === 4;
      const closed = !hours[date.getUTCDay()] && !uncertain;
      const noSlots = !closed && !slotsFor(key).some(slot => !slot.disabled);
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || uncertain || noSlots;
      input.checked = state.day === key;
      input.setAttribute('aria-label', `${formatDate(key)}${uncertain ? ', horaires à confirmer' : closed ? ', fermé' : noSlots ? ', journée terminée' : ', simulation'}`);
      const face = document.createElement('span');
      const weekday = document.createElement('small');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const number = document.createElement('b'); number.textContent = String(date.getUTCDate());
      const month = document.createElement('small');
      month.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const note = document.createElement('em'); note.textContent = uncertain ? 'À confirmer' : closed ? 'Fermé' : noSlots ? 'Terminé' : 'Essai';
      face.append(weekday, number, month, note); label.append(input, face); target.append(label);
    }
  }
  function renderSlots() {
    const target = document.querySelector('#heures');
    target.replaceChildren();
    document.querySelector('#heure-note').textContent = `${formatDate(state.day)} · Créneaux fictifs pour la simulation.`;
    for (const slot of slotsFor(state.day)) {
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute);
      input.disabled = slot.disabled; input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${formatTime(slot.minute)}, ${slot.past ? 'horaire passé' : slot.unavailable ? 'indisponible dans la simulation' : 'créneau fictif'}`);
      const face = document.createElement('span'); face.textContent = formatTime(slot.minute);
      if (slot.disabled) {
        const note = document.createElement('small'); note.textContent = slot.past ? 'Passé' : 'Indisponible'; face.append(note);
      }
      label.append(input, face); target.append(label);
    }
  }
  function showStep(index, focus = true) {
    cancelAnimationFrame(panelFrame);
    panels.forEach(panel => {
      panel.hidden = true;
      panel.classList.remove('entering', 'no-motion');
    });
    state.step = index;
    state.visited = Math.max(state.visited, index);
    const panel = panels[index];
    const animate = !keyboard && !reducedMotion.matches;
    if (!animate) panel.classList.add('no-motion');
    else panel.classList.add('entering');
    panel.hidden = false;
    updateStepNav();
    if (focus) focusHeading(panel.querySelector('h4'));
    panelFrame = requestAnimationFrame(() => {
      panelFrame = requestAnimationFrame(() => panel.classList.remove('entering'));
    });
    announce(`Étape ${index + 1} sur 4 : ${panel.querySelector('h4').textContent}`);
  }
  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 24 || rect.bottom > window.innerHeight - 90) {
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function chooseService(value) {
    state.service = value; state.day = ''; state.time = null; state.visited = 0;
    clearError('prestation'); clearError('jour'); clearError('heure');
    renderDays(); updateSummary();
  }
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      state.day = input.value; state.time = null; state.visited = 1;
      clearError('jour'); clearError('heure'); updateSummary(); renderSlots();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value); clearError('heure'); updateSummary();
    }
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !state.service) { error('prestation', 'Choisissez une prestation pour continuer.'); return; }
    if (next === 2 && !state.day) { error('jour', 'Choisissez un jour pour continuer.'); return; }
    if (next === 3 && state.time === null) { error('heure', 'Choisissez une heure pour continuer.'); return; }
    if (next === 1) renderDays();
    if (next === 2) renderSlots();
    showStep(next);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));

  function reset(focus = true) {
    form.reset();
    Object.assign(state, { service: '', day: '', time: null, step: 0, visited: 0, finished: false });
    ['prestation', 'jour', 'heure', 'prenom', 'telephone'].forEach(clearError);
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    document.querySelector('#succes').hidden = true;
    document.querySelector('#succes-recap').textContent = '';
    form.hidden = false;
    updateSummary(); showStep(0, focus);
  }
  document.querySelectorAll('[data-choose]').forEach(button => button.addEventListener('click', () => {
    reset(false);
    form.querySelector(`input[value="${button.dataset.choose}"]`).checked = true;
    chooseService(button.dataset.choose);
    showStep(1);
    document.querySelector('.simulator').scrollIntoView({ behavior: reducedMotion.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
  }));
  document.querySelector('#recommencer').addEventListener('click', () => reset());
  for (const id of ['prenom', 'telephone']) {
    document.querySelector(`#${id}`).addEventListener('input', event => {
      clearError(id); event.target.removeAttribute('aria-invalid');
    });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Entrée dans un champ : ne jamais sauter une étape ni transmettre de données.
    if (state.step !== 3) {
      document.querySelector(`[data-next="${state.step + 1}"]`)?.click();
      return;
    }
    const slot = state.day && slotsFor(state.day).find(item => item.minute === state.time);
    if (!slot || slot.disabled) {
      state.time = null; updateSummary(); renderDays();
      showStep(1); error('jour', 'Ce créneau d’essai n’est plus sélectionnable. Choisissez un autre jour.');
      return;
    }
    const firstName = document.querySelector('#prenom');
    const phone = document.querySelector('#telephone');
    const phoneValue = phone.value.replace(/[\s().-]/g, '');
    let invalid = null;
    if (firstName.value.trim().length < 2) {
      error('prenom', 'Saisissez au moins deux caractères pour le prénom d’essai.');
      firstName.setAttribute('aria-invalid', 'true'); invalid = firstName;
    }
    if (!/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phoneValue)) {
      error('telephone', 'Saisissez un numéro français à dix chiffres, ou au format +33.');
      phone.setAttribute('aria-invalid', 'true'); invalid ||= phone;
    }
    if (invalid) { invalid.focus(); return; }
    document.querySelector('#succes-recap').textContent = `${services[state.service].name} · ${formatDate(state.day)} à ${formatTime(state.time)}. Votre sélection d’essai est récapitulée ici.`;
    // Les coordonnées ne sont ni sauvegardées ni reprises dans le résultat.
    firstName.value = ''; phone.value = '';
    state.finished = true;
    form.hidden = true;
    document.querySelector('#succes').hidden = false;
    updateStepNav();
    focusHeading(document.querySelector('#titre-succes'));
    announce('Simulation terminée. Aucun rendez-vous pris. Rien n’a été envoyé au salon.');
  });

  app.hidden = false;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.remove('waiting'); revealObserver.unobserve(entry.target);
      }
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      element.classList.add('waiting'); revealObserver.observe(element);
    });
  }
  if ('IntersectionObserver' in window) {
    const mobileBar = document.querySelector('.mobile-bar');
    const hiddenBy = new Set();
    const barObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) hiddenBy.add(entry.target);
        else hiddenBy.delete(entry.target);
      }
      const suppressed = hiddenBy.size > 0;
      mobileBar.classList.toggle('suppressed', suppressed);
      mobileBar.inert = suppressed;
    });
    [document.querySelector('#rendez-vous'), document.querySelector('footer')].forEach(element => barObserver.observe(element));
  }
})();
