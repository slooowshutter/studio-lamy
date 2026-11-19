(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-use'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-use'); }, { passive: true });

  // Le contenu reste visible si JavaScript est absent ou si l’observation échoue.
  if (!reduced.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('has-entered')));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px 30px 0px' });
    $$('.reveal-number, .reveal-line, .reveal-row').forEach(element => observer.observe(element));
    $$('.composition, .service-list, .visit-steps').forEach(group => {
      $$('.reveal-row', group).forEach((element, index) => { element.style.transitionDelay = `${(index % 4) * 60}ms`; });
    });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) root.classList.remove('motion-ready');
  });
  const progress = $('#progression');
  let ticking = false;
  function updateProgress() {
    const height = root.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleY(${height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 1})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking && !reduced.matches) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  const services = [
    { id: 'eclat', name: 'Soin visage coup d’éclat', duration: 35, detail: 'Soin de 30 min · créneau de 35 min' },
    { id: 'purifiant', name: 'Soin visage purifiant', duration: 65, detail: 'Soin de 1 h · créneau de 1 h 05' },
    { id: 'decouverte', name: 'Découverte (huiles florales)', duration: 40, detail: 'Massage de 2 zones · créneau de 40 min' },
    { id: 'manucure', name: 'Soin manucure complète', duration: 45, detail: 'Créneau de 45 min' }
  ];
  // Planity : lundi et dimanche fermés ; jeudi jusqu’à 18 h, à confirmer.
  const hours = { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1080], 5: [600, 1140], 6: [600, 1140] };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const form = $('#booking-form');
  const panel = $('#booking-panel');
  const next = $('#booking-next');
  const back = $('#booking-back');
  const actions = $('#booking-actions');
  const status = $('#booking-status');
  const stepButtons = $$('[data-step]');
  const state = { step: 0, furthest: 0, service: '', date: '', time: null, name: '', phone: '', done: false };
  const stepTitles = ['Quel soin vous fait envie ?', 'Quel jour vous conviendrait ?', 'À quelle heure ?', 'Pour terminer la simulation.'];
  const nextLabels = ['Choisir le jour', 'Choisir l’heure', 'Vos coordonnées', 'Terminer la simulation'];
  let entranceFrame = 0;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute), year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function formatTime(minute) { return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`; }
  function selectedService() { return services.find(service => service.id === state.service); }
  function hash(text) { return [...text].reduce((result, character) => (result * 31 + character.charCodeAt(0)) >>> 0, 11); }
  function slotsFor(key, service = selectedService()) {
    if (!service || !key) return [];
    const day = dateFromKey(key).getUTCDay();
    const opening = hours[day];
    if (!opening) return [];
    const now = parisNow();
    const slots = [];
    for (let minute = opening[0]; minute + service.duration <= opening[1]; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const taken = hash(`${key}-${service.id}-${minute}`) % 5 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris · simulé' : '' });
    }
    return slots;
  }
  function days() {
    const now = parisNow();
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(Date.UTC(now.year, now.month - 1, now.day + index, 12));
      const key = keyFromDate(date);
      return { date, key, closed: !hours[date.getUTCDay()], available: slotsFor(key).some(slot => !slot.disabled) };
    });
  }
  function announce(message) { status.textContent = message; }
  function updateSummary() {
    $('#selection-soin').textContent = selectedService()?.name || 'Un soin à choisir.';
    $('#selection-jour').textContent = state.date ? dateFormat.format(dateFromKey(state.date)) : 'À choisir';
    $('#selection-heure').textContent = state.time === null ? 'À choisir' : formatTime(state.time);
  }
  function inlineError(message) {
    let error = $('#step-error', panel);
    if (!error) { error = document.createElement('p'); error.id = 'step-error'; error.className = 'error'; error.setAttribute('role', 'alert'); panel.append(error); }
    error.textContent = message;
    const fieldset = $('fieldset', panel);
    if (fieldset) fieldset.setAttribute('aria-describedby', 'step-error');
  }
  function clearStepError() {
    $('#step-error', panel)?.remove();
    $('fieldset', panel)?.removeAttribute('aria-describedby');
  }
  function servicePanel() {
    return `<p class="panel-note">Prestations et créneaux indiqués sur Planity. Aucun tarif dans cette simulation.</p><fieldset><legend class="sr-only">Choisissez un soin</legend><div class="radio-services">${services.map(service => `<label class="radio-service"><input type="radio" name="soin" value="${service.id}" ${state.service === service.id ? 'checked' : ''}><span class="radio-name">${service.name}<small>${service.detail}</small></span></label>`).join('')}</div></fieldset>`;
  }
  function dayPanel() {
    return `<p class="panel-note">Les 14 prochains jours. Lundi et dimanche fermés. Jours fériés et fermeture du jeudi à confirmer par téléphone.</p><fieldset><legend class="sr-only">Choisissez un jour simulé</legend><div class="date-grid">${days().map(day => `<label class="date-choice"><input type="radio" name="jour" value="${day.key}" aria-label="${escapeHTML(dateFormat.format(day.date))}${day.closed ? ', fermé' : !day.available ? ', aucun créneau restant' : ', simulation'}" ${day.closed || !day.available ? 'disabled' : ''} ${state.date === day.key ? 'checked' : ''}><span>${dayFormat.format(day.date)}<strong>${day.date.getUTCDate()}</strong>${monthFormat.format(day.date)}<small>${day.closed ? 'Fermé' : !day.available ? 'Indisponible' : 'Simulation'}</small></span></label>`).join('')}</div></fieldset>`;
  }
  function timePanel() {
    return `<p class="panel-note">${dateFormat.format(dateFromKey(state.date))} · horaires et créneaux simulés, sans disponibilité réelle.</p><fieldset><legend class="sr-only">Choisissez une heure simulée</legend><div class="slot-grid">${slotsFor(state.date).map(slot => `<label class="slot-choice"><input type="radio" name="heure" value="${slot.minute}" aria-label="${formatTime(slot.minute)}${slot.reason ? ', ' + slot.reason : ', simulation'}" ${slot.disabled ? 'disabled' : ''} ${state.time === slot.minute ? 'checked' : ''}><span><b>${formatTime(slot.minute)}</b><small>${slot.reason || 'Simulation'}</small></span></label>`).join('')}</div></fieldset>`;
  }
  function contactPanel() {
    return `<p class="panel-note">Ces champs servent uniquement à essayer le formulaire. Rien n’est envoyé ni enregistré après la fermeture de la page.</p><div class="form-field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="60" value="${escapeHTML(state.name)}" aria-describedby="prenom-erreur" required><p id="prenom-erreur" class="error" hidden></p></div><div class="form-field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" value="${escapeHTML(state.phone)}" aria-describedby="telephone-erreur" required><p id="telephone-erreur" class="error" hidden></p></div><p class="data-note">La sélection ci-contre ou ci-dessus est un exemple de parcours. Pour réserver réellement, passez par Planity ou téléphonez à Azohia.</p>`;
  }
  function renderStep(focus = true) {
    cancelAnimationFrame(entranceFrame);
    state.done = false;
    const animate = !reduced.matches && !keyboard && focus;
    panel.style.transition = animate ? 'none' : '';
    panel.classList.toggle('is-entering', animate);
    panel.innerHTML = `<h3 id="etape-titre" tabindex="-1">${stepTitles[state.step]}</h3>${[servicePanel, dayPanel, timePanel, contactPanel][state.step]()}`;
    actions.hidden = false;
    back.hidden = state.step === 0;
    next.innerHTML = `${nextLabels[state.step]} <span aria-hidden="true">→</span>`;
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.furthest;
      if (index === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    updateSummary();
    if (animate) {
      // Un seul calcul de mise en page à chaque changement d’étape.
      void panel.offsetWidth;
      entranceFrame = requestAnimationFrame(() => {
        panel.style.transition = '';
        panel.classList.remove('is-entering');
      });
    }
    if (focus) {
      $('#etape-titre').focus({ preventScroll: true });
      const top = panel.getBoundingClientRect().top;
      if (top < 24 || top > window.innerHeight - 160) panel.scrollIntoView({ block: 'start', behavior: reduced.matches || keyboard ? 'instant' : 'smooth' });
      announce(`Étape ${state.step + 1} sur 4 : ${stepTitles[state.step]}`);
    }
  }
  function goTo(step) { state.step = step; state.furthest = Math.max(state.furthest, step); renderStep(); }
  function validateContact() {
    const name = $('#prenom');
    const phone = $('#telephone');
    state.name = name.value.trim(); state.phone = phone.value.trim();
    const normalizedPhone = state.phone.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    let firstInvalid = null;
    [[name, state.name.length >= 2, 'Indiquez un prénom d’au moins deux caractères.', 'prenom-erreur'], [phone, /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalizedPhone), 'Indiquez un numéro français de dix chiffres, ou au format +33.', 'telephone-erreur']].forEach(([field, valid, message, errorId]) => {
      const error = $('#' + errorId);
      field.setAttribute('aria-invalid', String(!valid));
      error.hidden = valid; error.textContent = valid ? '' : message;
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) { firstInvalid.focus(); announce('Vérifiez les champs indiqués avant de terminer la simulation.'); return false; }
    return true;
  }
  function success() {
    state.done = true;
    actions.hidden = true;
    panel.classList.remove('is-entering');
    stepButtons.forEach(button => button.removeAttribute('aria-current'));
    panel.innerHTML = `<h3 id="etape-titre" tabindex="-1">Le parcours est terminé.</h3><p class="success__mark">C’est un aperçu.</p><p>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée à Azohia.</p><p class="success__recap">${escapeHTML(selectedService().name)}<br>${dateFormat.format(dateFromKey(state.date))} à ${formatTime(state.time)}</p><div class="success__actions"><a class="button" href="https://www.planity.com/azohia-14000-caen" target="_blank" rel="noopener">Réserver sur Planity <span aria-hidden="true">↗</span></a><button class="text-link" type="button" id="recommencer">Recommencer</button></div>`;
    $('#etape-titre').focus({ preventScroll: true });
    announce('Simulation terminée. Aucun rendez-vous pris, aucun envoi.');
    $('#recommencer').addEventListener('click', () => {
      Object.assign(state, { step: 0, furthest: 0, service: '', date: '', time: null, name: '', phone: '', done: false });
      renderStep();
    });
  }
  panel.addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'soin' && value !== state.service) {
      state.service = value; state.date = ''; state.time = null; state.furthest = 0;
    } else if (name === 'jour' && value !== state.date) {
      state.date = value; state.time = null; state.furthest = 1;
    } else if (name === 'heure') state.time = Number(value);
    clearStepError();
    updateSummary();
    stepButtons.forEach((button, index) => { button.disabled = index > state.furthest; });
  });
  panel.addEventListener('input', event => {
    if (event.target.name === 'prenom' || event.target.name === 'telephone') {
      state[event.target.name === 'prenom' ? 'name' : 'phone'] = event.target.value;
      event.target.removeAttribute('aria-invalid');
      const error = $('#' + event.target.getAttribute('aria-describedby'));
      if (error) { error.hidden = true; error.textContent = ''; }
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.done) return;
    if (state.step === 0 && !selectedService()) { inlineError('Choisissez un soin pour continuer.'); return; }
    if (state.step === 1 && (!state.date || !days().some(day => day.key === state.date && day.available))) { inlineError('Choisissez un jour proposant des créneaux simulés.'); return; }
    if (state.step === 2 && (state.time === null || !slotsFor(state.date).some(slot => slot.minute === state.time && !slot.disabled))) { inlineError('Choisissez une heure disponible dans cette simulation.'); return; }
    if (state.step === 3) {
      if (!validateContact()) return;
      if (!days().some(day => day.key === state.date && day.available) || !slotsFor(state.date).some(slot => slot.minute === state.time && !slot.disabled)) {
        state.time = null; state.furthest = 1; goTo(1); inlineError('Ce créneau est désormais passé. Choisissez à nouveau un jour et une heure.'); return;
      }
      success(); return;
    }
    goTo(state.step + 1);
  });
  back.addEventListener('click', () => { if (state.step > 0) goTo(state.step - 1); });
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step <= state.furthest) goTo(step);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service; state.date = ''; state.time = null; state.furthest = 0; state.step = 0;
    renderStep(false);
    announce(`${selectedService().name} sélectionné dans la simulation. Pour un vrai rendez-vous, utilisez Planity ou le téléphone.`);
  }));
  $('#booking-app').hidden = false;
  renderStep(false);
})();
