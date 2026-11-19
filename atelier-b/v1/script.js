'use strict';

/* Les heures sont celles de la fiche Planity. Aucune disponibilité réelle. */
const AtelierCalendar = (() => {
  const zone = 'Europe/Paris';
  const clockFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(clockFormat.formatToParts(instant).map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateOf(key) { return new Date(`${key}T12:00:00Z`); }
  function opening(key) {
    const weekday = dateOf(key).getUTCDay();
    return weekday === 0 || weekday === 1 ? null : [540, weekday === 6 ? 1020 : 1110];
  }
  function slots(key, duration, instant = new Date()) {
    const hours = opening(key);
    if (!hours) return [];
    const now = parisNow(instant);
    if (key < now.key) return [];
    const result = [];
    for (let minute = hours[0]; minute + duration <= hours[1]; minute += 30) {
      if (key > now.key || minute > now.minutes) result.push(minute);
    }
    return result;
  }
  function days(duration, instant = new Date()) {
    const date = dateOf(parisNow(instant).key);
    return Array.from({ length: 14 }, (_, offset) => {
      const day = new Date(date);
      day.setUTCDate(date.getUTCDate() + offset);
      const key = day.toISOString().slice(0, 10);
      return {
        key, number: day.getUTCDate(), short: shortFormat.format(day).replace('.', ''),
        month: monthFormat.format(day), full: dateFormat.format(day),
        closed: !opening(key), available: slots(key, duration, instant).length > 0
      };
    });
  }
  function hour(minute) { return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`; }
  function fullDate(key) { return dateFormat.format(dateOf(key)); }
  function validPhone(phone) { return /^0[1-9]\d{8}$/.test(phone.replace(/[\s.()\-]/g, '').replace(/^(?:\+33|0033)/, '0')); }
  return { parisNow, opening, slots, days, hour, fullDate, validPhone };
})();

(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panel = document.getElementById('step-panel');
  const form = document.getElementById('reservation-form');
  const announcement = document.getElementById('booking-announcement');
  const layout = document.getElementById('booking-layout');
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const summaryFields = {
    service: document.getElementById('summary-service'),
    day: document.getElementById('summary-day'),
    time: document.getElementById('summary-time')
  };
  const services = [
    { id: 'coupe-courts', name: 'Shampoing Coupe Brushing', detail: 'Cheveux courts / mi-longs', duration: 30 },
    { id: 'coupe-longs', name: 'Shampoing Coupe Brushing', detail: 'Cheveux longs', duration: 60 },
    { id: 'coupe-homme', name: 'Shampoing Coupe', detail: 'Homme', duration: 30 },
    { id: 'couleur-courts', name: 'Couleur Coupe Brushing', detail: 'Cheveux courts / mi-longs', duration: 90 },
    { id: 'couleur-longs', name: 'Couleur Coupe Brushing', detail: 'Cheveux longs', duration: 120 }
  ];
  const state = { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false };
  const stepNames = ['Prestation', 'Jour', 'Heure', 'Validation'];
  let keyboard = false;
  let transitionTimer;
  let summaryTimer;
  let transitionId = 0;
  const selectedService = () => services.find(s => s.id === state.service);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, true);

  function say(text) { announcement.textContent = text; }
  function updateSummary() {
    const service = selectedService();
    const values = {
      service: service ? `${service.name} · ${service.detail}` : 'À choisir',
      day: state.day ? AtelierCalendar.fullDate(state.day) : 'À choisir',
      time: state.time !== null ? AtelierCalendar.hour(state.time) : 'À choisir'
    };
    clearTimeout(summaryTimer);
    const changed = Object.keys(values).filter(key => summaryFields[key].textContent !== values[key]);
    if (!changed.length) return;
    const apply = () => {
      changed.forEach(key => {
        summaryFields[key].textContent = values[key];
        summaryFields[key].classList.remove('is-updating');
      });
    };
    if (reduced.matches || keyboard) { apply(); return; }
    changed.forEach(key => summaryFields[key].classList.add('is-updating'));
    summaryTimer = setTimeout(apply, 100);
  }
  function updateSteps() {
    const enabled = [true, Boolean(state.service), Boolean(state.day), state.time !== null];
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || !enabled[index];
      if (state.step === index && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function focusTitle() {
    const heading = panel.querySelector('.step-title');
    if (heading) heading.focus({ preventScroll: true });
  }
  function move(step, { focus = true, scroll = false } = {}) {
    clearTimeout(transitionTimer);
    const id = ++transitionId;
    state.step = step;
    const immediate = reduced.matches || keyboard || !panel.children.length;
    const apply = () => {
      if (id !== transitionId) return;
      render();
      updateSteps();
      updateSummary();
      panel.classList.remove('is-changing');
      if (focus) focusTitle();
      if (scroll) layout.scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
      say(state.done ? 'Simulation terminée. Aucun rendez-vous n’a été réservé.' : `Étape ${step + 1} sur 4 : ${stepNames[step]}.`);
    };
    panel.classList.toggle('no-motion', immediate);
    if (immediate) { panel.classList.remove('is-changing'); apply(); }
    else { panel.classList.add('is-changing'); transitionTimer = setTimeout(apply, 120); }
  }
  function actions(back, next = 'Continuer') {
    return `<p class="flow-error" id="flow-error" role="status" aria-live="polite"></p><div class="flow-actions">${back === null ? '' : `<button class="back-button" type="button" data-back="${back}">Retour</button>`}<button class="button button--plum" type="submit">${next}</button></div>`;
  }
  function recap() {
    const service = selectedService();
    return `<div class="recap"><strong>${escape(service.name)}</strong>${escape(service.detail)}<br>${escape(AtelierCalendar.fullDate(state.day))} à ${AtelierCalendar.hour(state.time)}</div>`;
  }
  function render() {
    if (state.done) {
      panel.innerHTML = `<div class="success-panel"><div class="success-mark" aria-hidden="true"><svg viewBox="0 0 42 42"><path d="M9 21h8V9h16v24H9zM16 23l5 5 12-15"/></svg></div><h3 class="step-title" tabindex="-1">Le parcours est terminé.</h3><p>Merci ${escape(state.firstName)}. Voici votre sélection d’exemple.</p>${recap()}<p><strong>Aucun rendez-vous n’a été réservé.</strong> Aucune information n’a été envoyée ni enregistrée.</p><p>Pour réserver, <a href="https://www.planity.com/atelier-b-14000-caen" target="_blank" rel="noopener">rendez-vous sur Planity</a> ou appelez le <a href="tel:+33231945959">02 31 94 59 59</a>.</p><button class="button button--outline" type="button" data-restart>Recommencer la simulation</button></div>`;
      document.getElementById('sheet-status').textContent = 'Parcours terminé · rien n’est réservé';
      return;
    }
    if (state.step === 0) {
      panel.innerHTML = `<h3 class="step-title" tabindex="-1">Quelle prestation souhaitez-vous essayer&nbsp;?</h3><p class="step-help">Ce choix prépare uniquement la simulation.</p><fieldset><legend class="sr-only">La prestation</legend>${services.map(service => `<label class="radio-row"><input type="radio" name="prestation" value="${service.id}" ${service.id === state.service ? 'checked' : ''}><span class="radio-row__name">${service.name}<small>${service.detail}</small></span><span class="radio-row__duration">${service.duration < 60 ? `${service.duration}&nbsp;min` : `${Math.floor(service.duration / 60)}&nbsp;h${service.duration % 60 ? '&nbsp;30' : ''}`}</span></label>`).join('')}</fieldset>${actions(null)}`;
    } else if (state.step === 1) {
      const days = AtelierCalendar.days(selectedService().duration);
      panel.innerHTML = `<h3 class="step-title" tabindex="-1">Quel jour vous conviendrait&nbsp;?</h3><p class="step-help">Les quatorze prochains jours. Lundi et dimanche fermés. Ouverture du samedi à confirmer.</p><div class="day-grid" role="group" aria-label="Choisir un jour pour la simulation">${days.map(day => `<button type="button" class="day-choice" data-day="${day.key}" ${day.available ? '' : 'disabled'} aria-pressed="${day.key === state.day}" aria-label="${escape(day.full)}${day.closed ? ', fermé' : !day.available ? ', aucun créneau restant' : ', exemple de jour'}"><span>${day.short}</span><strong>${day.number}</strong><small>${day.closed ? 'Fermé' : !day.available ? 'Terminé' : day.month}</small></button>`).join('')}</div>${actions(0)}`;
    } else if (state.step === 2) {
      const times = AtelierCalendar.slots(state.day, selectedService().duration);
      panel.innerHTML = `<h3 class="step-title" tabindex="-1">À quelle heure&nbsp;?</h3><p class="step-help">${escape(AtelierCalendar.fullDate(state.day))}. Heures de Paris. Créneaux d’exemple, aucune disponibilité vérifiée.</p>${times.length ? `<div class="time-grid" role="group" aria-label="Choisir une heure pour la simulation">${times.map(time => `<button type="button" class="time-choice" data-time="${time}" aria-pressed="${time === state.time}">${AtelierCalendar.hour(time)}</button>`).join('')}</div>` : '<p class="empty-times">Il ne reste aucun créneau pour cette durée. Revenez au choix du jour.</p>'}${actions(1)}`;
    } else {
      panel.innerHTML = `<h3 class="step-title" tabindex="-1">Vérifier la sélection d’exemple</h3><p class="step-help" id="privacy-note">Vous pouvez utiliser des coordonnées d’exemple. Rien n’est envoyé ni enregistré.</p>${recap()}<div class="form-field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="80" value="${escape(state.firstName)}" aria-describedby="prenom-error privacy-note" required><p class="field-error" id="prenom-error" aria-live="polite"></p></div><div class="form-field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" value="${escape(state.phone)}" aria-describedby="telephone-error privacy-note" required><p class="field-error" id="telephone-error" aria-live="polite"></p></div>${actions(2, 'Terminer la simulation')}`;
    }
  }
  function error(message) {
    const element = document.getElementById('flow-error');
    if (element) element.textContent = message;
  }
  function clearError() { error(''); }
  function refreshValidity() {
    const service = selectedService();
    if (!service || !state.day) return true;
    const times = AtelierCalendar.slots(state.day, service.duration);
    if (!times.length) {
      state.day = ''; state.time = null;
      move(1);
      say('Cette journée est terminée pour la durée choisie. Choisissez un autre jour.');
      return false;
    }
    if (state.time !== null && !times.includes(state.time)) {
      state.time = null;
      move(2);
      say('Cette heure est passée. Choisissez une autre heure.');
      return false;
    }
    return true;
  }

  panel.addEventListener('change', event => {
    if (event.target.name !== 'prestation') return;
    if (state.service !== event.target.value) {
      state.service = event.target.value; state.day = ''; state.time = null;
    }
    updateSteps(); updateSummary(); clearError();
    say(`${selectedService().name}, ${selectedService().detail}.`);
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-back')) move(Number(button.dataset.back));
    if (button.hasAttribute('data-day')) {
      if (state.day !== button.dataset.day) { state.day = button.dataset.day; state.time = null; }
      panel.querySelectorAll('[data-day]').forEach(day => day.setAttribute('aria-pressed', String(day === button)));
      clearError(); updateSteps(); updateSummary(); say(`${AtelierCalendar.fullDate(state.day)} sélectionné.`);
    }
    if (button.hasAttribute('data-time')) {
      state.time = Number(button.dataset.time);
      panel.querySelectorAll('[data-time]').forEach(time => time.setAttribute('aria-pressed', String(time === button)));
      clearError(); updateSteps(); updateSummary(); say(`${AtelierCalendar.hour(state.time)} sélectionné pour la simulation.`);
    }
    if (button.hasAttribute('data-restart')) {
      Object.assign(state, { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false });
      document.getElementById('sheet-status').textContent = 'Simulation · rien n’est réservé';
      move(0);
    }
  });
  panel.addEventListener('input', event => {
    if (event.target.id === 'prenom') state.firstName = event.target.value;
    else if (event.target.id === 'telephone') state.phone = event.target.value;
    else return;
    event.target.removeAttribute('aria-invalid');
    const errorId = event.target.id === 'prenom' ? 'prenom-error' : 'telephone-error';
    document.getElementById(errorId).textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.done) return;
    if (state.step === 0) {
      if (!selectedService()) { error('Choisissez une prestation pour continuer.'); return; }
      move(1); return;
    }
    if (state.step === 1) {
      if (!state.day) { error('Choisissez un jour pour continuer.'); return; }
      if (refreshValidity()) move(2);
      return;
    }
    if (state.step === 2) {
      if (state.time === null) { error('Choisissez une heure pour continuer.'); return; }
      if (refreshValidity()) move(3);
      return;
    }
    state.firstName = document.getElementById('prenom').value.trim();
    state.phone = document.getElementById('telephone').value.trim();
    let firstInvalid = null;
    if (state.firstName.length < 2) {
      document.getElementById('prenom-error').textContent = 'Indiquez un prénom d’au moins deux caractères.';
      firstInvalid = document.getElementById('prenom');
      firstInvalid.setAttribute('aria-invalid', 'true');
    }
    if (!AtelierCalendar.validPhone(state.phone)) {
      document.getElementById('telephone-error').textContent = 'Indiquez un numéro français à dix chiffres, ou commençant par +33.';
      const telephone = document.getElementById('telephone');
      telephone.setAttribute('aria-invalid', 'true');
      firstInvalid = firstInvalid || telephone;
    }
    if (firstInvalid) { firstInvalid.focus(); return; }
    if (!refreshValidity()) return;
    state.done = true;
    state.phone = '';
    move(3);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => move(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    state.service = link.dataset.service;
    state.day = ''; state.time = null; state.done = false;
    document.getElementById('sheet-status').textContent = 'Simulation · rien n’est réservé';
    move(1, { scroll: true });
  }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.done) return;
    if (state.step > 0 && !refreshValidity()) return;
    if (state.step === 1) move(1, { focus: false });
  });

  /* Les révélations sont uniques ; le rendu sans JavaScript reste complet. */
  if (!reduced.matches && 'IntersectionObserver' in window) {
    root.classList.add('js');
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    reveals.forEach((element, index) => {
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${(index % 3) * 60}ms`;
      observer.observe(element);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      root.classList.remove('js');
      panel.classList.add('no-motion');
    }
  });
  layout.hidden = false;
  move(0, { focus: false });
})();
