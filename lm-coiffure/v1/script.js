(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, parent = doc) => parent.querySelector(selector);
  const $$ = (selector, parent = doc) => [...parent.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const names = { coupe: 'Coupe', coloration: 'Coloration', meches: 'Mèches' };
  const descriptions = {
    coupe: 'Pour une coupe, précisez vos envies au salon. Le tarif et la durée sont à confirmer par téléphone.',
    coloration: 'Pour une coloration, échangez avec le salon sur ce que vous souhaitez. Le tarif et la durée sont à confirmer par téléphone.',
    meches: 'Pour des mèches, décrivez le résultat souhaité au salon. Le tarif et la durée sont à confirmer par téléphone.'
  };
  const state = { service: 'coupe', day: '', time: null, step: 0, reached: 0 };
  let keyboard = false;
  let days = [];
  let transitionFrame;
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const timeText = minutes => `${Math.floor(minutes / 60)}\u00a0h`;
  const chosenDate = () => days.find(day => day.iso === state.day);
  const announce = text => { $('#annonce-parcours').textContent = text; };

  function nowParis() {
    const parts = {};
    parisFormat.formatToParts(new Date()).forEach(part => { parts[part.type] = part.value; });
    return {
      iso: `${parts.year}-${parts.month}-${parts.day}`,
      date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)),
      minutes: +parts.hour * 60 + +parts.minute
    };
  }

  // Source : iCoiffeur, mercredi–samedi 10 h–19 h. Aucune durée présumée.
  // Les heures sont des repères pour la simulation, jamais des disponibilités.
  function withinHours(day) { return day >= 3 && day <= 6; }
  function slotExpired(iso, minutes, now = nowParis()) {
    return iso < now.iso || (iso === now.iso && minutes <= now.minutes);
  }
  function allowedDay(day, now = nowParis()) {
    return !!day && withinHours(day.date.getUTCDay()) && day.iso >= now.iso && !slotExpired(day.iso, 1080, now);
  }
  function validTime() {
    const day = chosenDate();
    return allowedDay(day) && Number.isInteger(state.time) && state.time >= 600 && state.time < 1140 && state.time % 60 === 0 && !slotExpired(state.day, state.time);
  }

  function summary() {
    $('#resume-prestation').textContent = names[state.service];
    const day = chosenDate();
    $('#resume-jour').textContent = day ? longDate.format(day.date) : 'Un jour à choisir';
    $('#resume-heure').textContent = state.time !== null ? timeText(state.time) : 'Une heure à choisir';
    $$('.steps button').forEach(button => {
      const step = +button.dataset.step;
      button.disabled = step > state.reached || (step >= 2 && !allowedDay(day)) || (step === 3 && !validTime());
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function enter(element) {
    cancelAnimationFrame(transitionFrame);
    $$('.is-entering').forEach(item => item.classList.remove('is-entering'));
    if (reduce.matches || keyboard) return;
    element.classList.add('is-entering');
    transitionFrame = requestAnimationFrame(() => {
      transitionFrame = requestAnimationFrame(() => element.classList.remove('is-entering'));
    });
  }

  function setService(service, announceChoice = false) {
    if (!names[service]) return;
    const changed = state.service !== service;
    state.service = service;
    $$('.service-chip').forEach(button => {
      const selected = button.dataset.service === service;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === service; });
    $('#detail-nom').textContent = names[service];
    $('#detail-texte').textContent = descriptions[service];
    if (!$('#fin-essai').hidden) showStep(0, false);
    if (changed) enter($('#detail-prestation'));
    summary();
    if (announceChoice) announce(`Prestation choisie pour l’essai : ${names[service]}.`);
  }

  function renderDays() {
    const now = nowParis();
    days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + index);
      return { date, iso: date.toISOString().slice(0, 10) };
    });
    if (state.day && !allowedDay(chosenDate(), now)) { state.day = ''; state.time = null; }
    const fragment = doc.createDocumentFragment();
    days.forEach(day => {
      const weekday = day.date.getUTCDay();
      const available = allowedDay(day, now);
      const label = doc.createElement('label');
      label.className = 'day-choice';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = day.iso;
      input.disabled = !available; input.checked = state.day === day.iso;
      input.setAttribute('aria-describedby', 'aide-jours erreur-jour');
      input.setAttribute('aria-label', `${longDate.format(day.date)}${available ? ', jour d’essai' : weekday === 0 ? ', fermé selon iCoiffeur' : !withinHours(weekday) ? ', horaires à confirmer' : ', heures passées'}`);
      const weekdayText = doc.createElement('span'); weekdayText.textContent = shortDay.format(day.date);
      const dateText = doc.createElement('strong'); dateText.textContent = day.date.getUTCDate();
      const monthText = doc.createElement('span'); monthText.textContent = shortMonth.format(day.date);
      label.append(input, weekdayText, dateText, monthText);
      if (!available) {
        const note = doc.createElement('small');
        note.textContent = weekday === 0 ? 'Fermé' : !withinHours(weekday) ? 'À confirmer' : 'Écoulé';
        label.append(note);
      }
      fragment.append(label);
    });
    $('#jours').replaceChildren($('legend', $('#jours')).cloneNode(true), fragment);
    summary();
  }

  function renderTimes() {
    const day = chosenDate();
    if (!day) return;
    $('#jour-choisi').textContent = longDate.format(day.date);
    if (state.time !== null && !validTime()) state.time = null;
    const now = nowParis();
    const fragment = doc.createDocumentFragment();
    for (let minutes = 600; minutes < 1140; minutes += 60) {
      const expired = slotExpired(day.iso, minutes, now);
      const label = doc.createElement('label'); label.className = 'time-choice';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = minutes;
      input.disabled = expired; input.checked = state.time === minutes;
      input.setAttribute('aria-describedby', 'aide-heures erreur-heure');
      input.setAttribute('aria-label', `${timeText(minutes)}${expired ? ', heure passée' : ', heure d’essai'}`);
      const text = doc.createElement('span'); text.textContent = timeText(minutes);
      label.append(input, text);
      if (expired) {
        const note = doc.createElement('small'); note.textContent = 'Passé'; label.append(note);
      }
      fragment.append(label);
    }
    $('#heures').replaceChildren($('legend', $('#heures')).cloneNode(true), fragment);
    summary();
  }

  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function showStep(step, moveFocus = true) {
    if (step >= 2 && !allowedDay(chosenDate())) step = 1;
    if (step === 3 && !validTime()) step = 2;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    state.step = step; state.reached = Math.max(state.reached, step);
    $('#formulaire').hidden = false; $('#fin-essai').hidden = true;
    const panel = $(`[data-panel="${step}"]`);
    $$('[data-panel]').forEach(item => { item.hidden = item !== panel; });
    summary(); enter(panel);
    announce(`Étape ${step + 1} sur 4 : ${['la prestation', 'le jour d’essai', 'l’heure d’essai', 'vos coordonnées'][step]}.`);
    if (moveFocus) focusHeading($('h3', panel));
  }

  $$('.service-chip').forEach(button => button.addEventListener('click', () => setService(button.dataset.service, true)));
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => setService(input.value)));
  $('#essayer-prestation').addEventListener('click', () => showStep(0, false));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = +button.dataset.next;
    if (next === 2 && !allowedDay(chosenDate())) {
      $('#erreur-jour').textContent = 'Choisissez un jour proposé pour continuer l’essai.';
      $('input[name="jour"]:not(:disabled)')?.focus(); return;
    }
    if (next === 3 && !validTime()) {
      renderTimes(); $('#erreur-heure').textContent = 'Choisissez une heure à venir pour continuer l’essai.';
      $('input[name="heure"]:not(:disabled)')?.focus(); return;
    }
    showStep(next);
  }));
  $$('[data-back], [data-step]').forEach(button => button.addEventListener('click', () => showStep(+(button.dataset.back ?? button.dataset.step))));
  $('#jours').addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    state.day = event.target.value; state.time = null;
    $('#erreur-jour').textContent = ''; summary();
    announce(`Jour d’essai choisi : ${longDate.format(chosenDate().date)}.`);
  });
  $('#heures').addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.time = +event.target.value;
    $('#erreur-heure').textContent = ''; summary();
    announce(`Heure d’essai choisie : ${timeText(state.time)}.`);
  });

  function validate(field) {
    let error = '';
    if (field.id === 'prenom') {
      if (!field.value.trim()) error = 'Indiquez votre prénom pour terminer l’essai.';
    } else {
      const normalized = field.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0|\+33|0033)[67]\d{8}$/.test(normalized)) error = 'Indiquez un mobile français valide : 06, 07 ou +33 suivi de 6 ou 7 et de huit chiffres.';
    }
    $(`#erreur-${field.id}`).textContent = error;
    if (error) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !error;
  }
  $$('#prenom, #telephone').forEach(field => {
    field.addEventListener('blur', () => { if (field.value || field.hasAttribute('aria-invalid')) validate(field); });
    field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) validate(field); });
  });
  $('#formulaire').addEventListener('submit', event => {
    event.preventDefault();
    if (!validTime()) {
      showStep(allowedDay(chosenDate()) ? 2 : 1);
      announce('La date ou l’heure d’essai est passée. Choisissez à nouveau.'); return;
    }
    const invalid = $$('#prenom, #telephone').filter(field => !validate(field));
    if (invalid.length) { invalid[0].focus(); announce('Vérifiez les champs signalés avant de terminer l’essai.'); return; }
    const day = chosenDate();
    $('#phrase-fin').textContent = `${$('#prenom').value.trim()}, votre essai portait sur une prestation « ${names[state.service]} », le ${longDate.format(day.date)}, vers ${timeText(state.time)}.`;
    $('#formulaire').hidden = true; $('#fin-essai').hidden = false;
    enter($('#fin-essai')); focusHeading($('#titre-fin'));
    announce('Simulation terminée. Aucun rendez-vous n’a été réservé et rien n’a été envoyé.');
  });
  $('#recommencer').addEventListener('click', () => {
    state.day = ''; state.time = null; state.reached = 0;
    $('#formulaire').reset(); setService('coupe');
    $$('.field-error').forEach(item => { item.textContent = ''; });
    $$('[aria-invalid]').forEach(item => item.removeAttribute('aria-invalid'));
    renderDays(); showStep(0);
  });

  // La référence s’ouvre avant que l’ancre reçoive le focus.
  $$('.source-ref').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); $('.source-details').open = true;
    const target = $('#source-histoire');
    target.scrollIntoView({ block: 'center', behavior: reduce.matches || keyboard ? 'instant' : 'smooth' });
    target.focus({ preventScroll: true });
    history.replaceState(null, '', '#source-histoire');
  }));

  if (navigator.clipboard && window.isSecureContext) {
    const copy = $('#copier-adresse'); copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('LM Coiffure, 11 rue Fournarié, 34000 Montpellier');
        $('#retour-copie').textContent = 'Adresse copiée.';
      } catch {
        $('#retour-copie').textContent = 'Copie indisponible. Adresse : 11 rue Fournarié, 34000 Montpellier.';
      }
    });
  }
  doc.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-use'); });
  doc.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-use'); }, { passive: true });

  // Seules les silhouettes bougent ; les textes restent stables.
  const shapes = $$('[data-soft-shape]');
  let scrollFrame = 0;
  function softenShapes() {
    scrollFrame = 0;
    if (reduce.matches) { shapes.forEach(shape => { shape.style.transform = ''; }); return; }
    const positions = shapes.map(shape => ({ shape, rect: shape.parentElement.getBoundingClientRect() }));
    positions.forEach(({ shape, rect }) => {
      if (rect.bottom < -100 || rect.top > innerHeight + 100) return;
      const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight));
      shape.style.transform = `rotate(${progress * 3}deg) scale(${1 + Math.abs(progress) * .018}, ${1 - Math.abs(progress) * .012})`;
    });
  }
  function onScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(softenShapes); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  reduce.addEventListener('change', softenShapes);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    const zones = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? zones.add(entry.target) : zones.delete(entry.target));
      $('.mobile-bar').classList.toggle('is-hidden', zones.size > 0);
    });
    ['#actions-hero', '#rendez-vous', '#sources'].forEach(selector => barObserver.observe($(selector)));
  } else $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));

  renderDays(); summary();
  $('#parcours').hidden = false;
  root.classList.add('js');
  const reveal = () => requestAnimationFrame(() => { root.classList.add('is-ready'); softenShapes(); });
  if (doc.fonts) Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 500))]).then(reveal);
  else reveal();
})();
