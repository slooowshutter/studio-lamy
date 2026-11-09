/* Gentlemen's barber shop — démonstration locale, aucune transmission. */
(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SERVICES = [
    { id: 'coupe', name: 'Coupe Homme', duration: 30 },
    { id: 'etudiant', name: 'Coupe Étudiant', duration: 30 },
    { id: 'coupe-barbe', name: 'Coupe Homme + Barbe', duration: 40 },
    { id: 'barbe', name: 'Barbe', duration: 25 },
    { id: 'rasage', name: 'Rasage', duration: 30 }
  ];
  // Plages Planity consignées dans le dossier de recherche fourni.
  const HOURS = { 0: [], 1: [], 2: [[600, 720], [840, 1140]], 3: [[600, 720], [840, 1140]], 4: [[600, 720], [840, 1140]], 5: [[600, 720], [840, 1140]], 6: [[600, 900]] };
  const STEPS = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const NEXT_LABELS = ['Choisir le jour', 'Choisir l’heure', 'Mes coordonnées', 'Terminer la simulation'];
  const state = { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false };
  let inputMode = 'pointer';
  let panelAnimation;
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });
  const nbsp = '\u00a0';

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dayDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function service() { return SERVICES.find(item => item.id === state.service); }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}${nbsp}h${minutes % 60 ? `${nbsp}${String(minutes % 60).padStart(2, '0')}` : ''}`; }
  function daysAhead(now = parisNow()) {
    const start = dayDate(now.key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return { key: dateKey(date), date, open: HOURS[date.getUTCDay()].length > 0 };
    });
  }
  function slotsFor(key, duration, now = parisNow()) {
    const date = dayDate(key);
    const seed = Number(key.replaceAll('-', ''));
    return HOURS[date.getUTCDay()].flatMap(([start, end]) => {
      const result = [];
      for (let minute = start; minute + duration <= end; minute += 30) {
        const past = key < now.key || (key === now.key && minute <= now.minutes);
        const exampleTaken = (seed + minute / 30) % 5 === 0;
        result.push({ minute, past, taken: exampleTaken, disabled: past || exampleTaken });
      }
      return result;
    });
  }
  function validPhone(value) { return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(value.replace(/[\s().-]/g, '')); }
  function escapeText(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function selectionText() {
    return [service()?.name, state.day ? longDayFormat.format(dayDate(state.day)) : '', state.time !== null ? timeLabel(state.time) : ''].filter(Boolean).join(' · ');
  }
  function updateSummary() {
    $('#resume-prestation').textContent = service()?.name || 'À choisir';
    $('#resume-jour').textContent = state.day ? longDayFormat.format(dayDate(state.day)) : 'À choisir';
    $('#resume-heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
  }
  function makeTitle(text) { return `<h3 class="step-title" id="titre-etape" tabindex="-1">${text}</h3>`; }
  function servicesPanel() {
    return `${makeTitle('Quelle prestation souhaitez-vous essayer ?')}<p class="step-intro">La carte du salon, dans une simulation sans réservation réelle.</p>
      <fieldset aria-describedby="choix-message"><legend>Choisissez une prestation</legend><div class="radio-list">${SERVICES.map(item => `<label class="radio-choice"><input type="radio" name="prestation" value="${item.id}" ${state.service === item.id ? 'checked' : ''}><span>${item.name}</span><span class="choice-duration">${item.duration}${nbsp}min</span></label>`).join('')}</div></fieldset>`;
  }
  function daysPanel() {
    const now = parisNow();
    return `${makeTitle('Quel jour ?')}<p class="step-intro">Dates de démonstration. Lundi et dimanche sont fermés selon Planity. Horaires à confirmer avec le salon.</p>
      <fieldset aria-describedby="choix-message"><legend>Choisissez un jour</legend><div class="day-grid">${daysAhead(now).map(day => {
        const slots = slotsFor(day.key, service().duration, now);
        const exhausted = day.open && !slots.some(slot => !slot.disabled);
        const status = !day.open ? 'Fermé' : exhausted ? 'Aucun créneau' : monthFormat.format(day.date);
        return `<label class="compact-choice"><input type="radio" name="jour" value="${day.key}" aria-label="${longDayFormat.format(day.date)}${!day.open ? ', fermé' : exhausted ? ', aucun créneau de démonstration' : ''}" ${day.key === state.day ? 'checked' : ''} ${!day.open || exhausted ? 'disabled' : ''}><span class="day-name">${shortDayFormat.format(day.date)}</span><span class="day-number">${day.date.getUTCDate()}</span><span class="day-status">${status}</span></label>`;
      }).join('')}</div></fieldset>`;
  }
  function timesPanel() {
    const slots = slotsFor(state.day, service().duration);
    const groups = [{ title: 'Matin', slots: slots.filter(slot => slot.minute < 720) }, { title: 'Après-midi', slots: slots.filter(slot => slot.minute >= 720) }].filter(group => group.slots.length);
    return `${makeTitle('À quelle heure ?')}<p class="step-intro">${longDayFormat.format(dayDate(state.day))}. Créneaux fictifs dans les horaires Planity. «${nbsp}Pris (exemple)${nbsp}» illustre un créneau indisponible.</p>
      <fieldset aria-describedby="choix-message"><legend>Choisissez une heure de démonstration</legend>${groups.map(group => `<h4 class="slot-heading">${group.title}</h4><div class="slot-grid">${group.slots.map(slot => {
        const status = slot.past ? 'Passé' : slot.taken ? 'Pris (exemple)' : 'Exemple libre';
        const isoTime = `${String(Math.floor(slot.minute / 60)).padStart(2, '0')}:${String(slot.minute % 60).padStart(2, '0')}`;
        return `<label class="compact-choice"><input type="radio" name="heure" value="${slot.minute}" aria-label="${timeLabel(slot.minute)}, ${status.toLowerCase()}" ${state.time === slot.minute ? 'checked' : ''} ${slot.disabled ? 'disabled' : ''}><time datetime="${isoTime}">${timeLabel(slot.minute)}</time><span class="day-status">${status}</span></label>`;
      }).join('')}</div>`).join('')}</fieldset>`;
  }
  function detailsPanel() {
    return `${makeTitle('Vos coordonnées, pour essayer.')}<p class="step-intro">Ces champs restent dans cette page. Rien n’est enregistré ni envoyé. Les deux champs sont obligatoires pour terminer l’essai.</p>
      <p class="recap-inline">${selectionText()}</p><div class="fields">
      <div class="field"><label for="prenom">Votre prénom</label><input id="prenom" name="prenom" autocomplete="given-name" maxlength="60" value="${escapeText(state.firstName)}" aria-describedby="erreur-prenom" required><p class="field-error" id="erreur-prenom"></p></div>
      <div class="field"><label for="telephone">Votre téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" value="${escapeText(state.phone)}" aria-describedby="aide-telephone erreur-telephone" required><p class="field-hint" id="aide-telephone">Numéro français, avec 0 ou +33.</p><p class="field-error" id="erreur-telephone"></p></div></div>`;
  }
  const panels = [servicesPanel, daysPanel, timesPanel, detailsPanel];

  function canVisit(step) {
    if (step < 0 || step >= STEPS.length) return false;
    if (step === 0) return true;
    if (!service()) return false;
    if (step === 1) return true;
    if (!state.day || !daysAhead().some(day => day.key === state.day && day.open)) return false;
    if (step === 2) return true;
    return state.time !== null && slotsFor(state.day, service().duration).some(slot => slot.minute === state.time && !slot.disabled);
  }
  function saveFields() {
    if ($('#prenom')) state.firstName = $('#prenom').value;
    if ($('#telephone')) state.phone = $('#telephone').value;
  }
  function renderPanel(focus = false) {
    const panel = $('#step-panel');
    panel.innerHTML = panels[state.step]();
    $('#continuer').innerHTML = `${NEXT_LABELS[state.step]} <span aria-hidden="true">→</span>`;
    $('#retour').hidden = state.step === 0;
    $('#choix-message').textContent = '';
    $$('.step-nav button').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = !canVisit(step);
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary();
    $('#annonce-etape').textContent = `Étape ${state.step + 1} sur 4 : ${STEPS[state.step]}. Simulation uniquement.`;
    if (focus) $('#titre-etape').focus({ preventScroll: true });
  }
  function goTo(step, focus = true) {
    if (state.done || !canVisit(step)) return;
    saveFields();
    const previous = state.step;
    state.step = step;
    panelAnimation?.cancel();
    const panel = $('#step-panel');
    renderPanel(focus);
    // Le clavier et la réduction des animations obtiennent immédiatement l’état final.
    if (!reducedMotion.matches && inputMode !== 'keyboard' && focus && panel.animate) {
      panelAnimation = panel.animate([
        { opacity: 0, transform: `translateX(${step < previous ? -8 : 8}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function showMessage(text) { $('#choix-message').textContent = text; }
  function validateDetails() {
    saveFields();
    const nameOK = state.firstName.trim().length > 0;
    const phoneOK = validPhone(state.phone);
    $('#erreur-prenom').textContent = nameOK ? '' : 'Saisissez votre prénom pour terminer l’essai.';
    $('#erreur-telephone').textContent = phoneOK ? '' : 'Saisissez un numéro français de 10 chiffres, ou commençant par +33.';
    $('#prenom').setAttribute('aria-invalid', String(!nameOK));
    $('#telephone').setAttribute('aria-invalid', String(!phoneOK));
    if (!nameOK || !phoneOK) {
      showMessage('Vérifiez le champ signalé. Aucune information n’est envoyée.');
      (nameOK ? $('#telephone') : $('#prenom')).focus();
    }
    return nameOK && phoneOK;
  }
  function finishDemo() {
    state.done = true;
    panelAnimation?.cancel();
    $('#step-panel').innerHTML = `<div class="booking-success"><p class="section-label">Essai terminé</p><h3 id="titre-etape" tabindex="-1">La ligne est remplie.<br>Rien n’a été réservé.</h3><p class="recap-inline">${selectionText()}</p><p>Votre simulation est terminée. Aucun rendez-vous n’a été pris et aucune information n’a été envoyée au salon.</p><div class="actions"><a class="button primary" href="https://www.planity.com/gentlemens-barber-shop-64000-pau" target="_blank" rel="noopener">Réserver sur Planity <span aria-hidden="true">↗</span></a><button class="back-button" id="recommencer" type="button">Recommencer l’essai</button></div></div>`;
    $('.booking-controls').hidden = true;
    $('.step-nav').hidden = true;
    $('#choix-message').textContent = '';
    $('#annonce-etape').textContent = 'Essai terminé. Aucun rendez-vous réservé. Aucune information envoyée.';
    // Les coordonnées ne sont ni conservées ni répétées dans le résultat.
    state.firstName = '';
    state.phone = '';
    $('#titre-etape').focus({ preventScroll: true });
  }
  function resetDemo() {
    panelAnimation?.cancel();
    Object.assign(state, { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false });
    $('.booking-controls').hidden = false;
    $('.step-nav').hidden = false;
    renderPanel(true);
  }

  document.addEventListener('keydown', () => { inputMode = 'keyboard'; root.classList.add('keyboard-mode'); }, { capture: true });
  document.addEventListener('pointerdown', () => { inputMode = 'pointer'; root.classList.remove('keyboard-mode'); }, { capture: true, passive: true });
  reducedMotion.addEventListener?.('change', () => { if (reducedMotion.matches) panelAnimation?.cancel(); });
  $('#reservation-demo').hidden = false;
  renderPanel();
  $('#booking-form').addEventListener('change', event => {
    const field = event.target;
    if (field.name === 'prestation' && state.service !== field.value) {
      state.service = field.value;
      state.day = '';
      state.time = null;
    } else if (field.name === 'jour' && state.day !== field.value) {
      state.day = field.value;
      state.time = null;
    } else if (field.name === 'heure') state.time = Number(field.value);
    updateSummary();
    $('#choix-message').textContent = '';
    $$('.step-nav button').forEach(button => { button.disabled = !canVisit(Number(button.dataset.step)); });
  });
  $('#booking-form').addEventListener('input', event => {
    if (event.target.id === 'prenom' || event.target.id === 'telephone') {
      event.target.removeAttribute('aria-invalid');
      const errorId = event.target.id === 'prenom' ? '#erreur-prenom' : '#erreur-telephone';
      $(errorId).textContent = '';
    }
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.done) return;
    if (state.step === 0 && !service()) { showMessage('Choisissez une prestation pour poursuivre la simulation.'); return; }
    if (state.step === 1 && !canVisit(2)) { showMessage('Choisissez un jour ouvert pour poursuivre.'); return; }
    if (state.step >= 2 && !canVisit(2)) {
      state.day = '';
      state.time = null;
      goTo(1);
      showMessage('Le calendrier a changé. Choisissez un autre jour de démonstration.');
      return;
    }
    if (state.step >= 2 && !canVisit(3)) {
      state.time = null;
      updateSummary();
      if (state.step === 3) goTo(2);
      else renderPanel();
      showMessage('Choisissez une heure disponible dans cette démonstration. Les créneaux passés ne peuvent plus être sélectionnés.');
      return;
    }
    if (state.step < 3) goTo(state.step + 1);
    else if (validateDetails()) finishDemo();
  });
  $('#retour').addEventListener('click', () => goTo(state.step - 1));
  $$('.step-nav button').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  $('#booking-form').addEventListener('click', event => { if (event.target.closest('#recommencer')) resetDemo(); });
  $$('.choose-service').forEach(button => button.addEventListener('click', () => {
    if (state.done) resetDemo();
    saveFields();
    state.service = button.dataset.service;
    state.day = '';
    state.time = null;
    goTo(0, false);
    $('#reserver').scrollIntoView({ behavior: reducedMotion.matches || inputMode === 'keyboard' ? 'instant' : 'smooth', block: 'start' });
    $('#titre-etape').focus({ preventScroll: true });
  }));

  // La barre apparaît seulement après les actions du premier écran.
  if ('IntersectionObserver' in window) {
    const mobileBar = $('.mobile-bar');
    let passedHero = false;
    let inBooking = false;
    let inFooter = false;
    function updateBar() { mobileBar.hidden = !passedHero || inBooking || inFooter || !!document.activeElement?.closest('#booking-form'); }
    const actionObserver = new IntersectionObserver(entries => { passedHero = entries[0].boundingClientRect.bottom < 0; updateBar(); });
    actionObserver.observe($('#hero-actions'));
    const bottomObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.target.id === 'reserver') inBooking = entry.isIntersecting; else inFooter = entry.isIntersecting; });
      updateBar();
    });
    bottomObserver.observe($('#reserver'));
    bottomObserver.observe($('#pied'));
    document.addEventListener('focusin', updateBar);
    document.addEventListener('focusout', () => requestAnimationFrame(updateBar));

    const reveals = $$('[data-reveal]');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08 });
    reveals.forEach(element => observer.observe(element));
    $$('.service-table tbody tr').forEach((row, index) => { row.style.transitionDelay = `${index * 60}ms`; });
    root.classList.add('js');
  }
  if (!reducedMotion.matches) {
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }
})();
