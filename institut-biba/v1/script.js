/* Institut Biba — simulation locale, sans envoi ni stockage de données. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = $$('.panneau');
  const triggers = $$('.volet');
  let scrollTimer;

  document.addEventListener('keydown', () => root.setAttribute('data-clavier', ''), true);
  document.addEventListener('pointerdown', () => root.removeAttribute('data-clavier'), true);

  function openPanel(id, move = false) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('panneau')) return;
    clearTimeout(scrollTimer);
    panels.forEach(panel => {
      const open = panel === target;
      panel.toggleAttribute('data-ouvert', open);
      $('.volet', panel).setAttribute('aria-expanded', String(open));
      const content = $('.depliant', panel);
      content.inert = !open;
      content.setAttribute('aria-hidden', String(!open));
    });
    if (move) {
      $('.volet', target).focus({ preventScroll: true });
      const instant = reduce.matches || root.hasAttribute('data-clavier');
      scrollTimer = setTimeout(() => target.scrollIntoView({ block: 'start', behavior: instant ? 'instant' : 'smooth' }), instant ? 0 : 310);
    }
  }
  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', () => openPanel(trigger.closest('.panneau').id, true));
    trigger.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % triggers.length;
      if (event.key === 'ArrowUp') next = (index + triggers.length - 1) % triggers.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = triggers.length - 1;
      if (next !== undefined) { event.preventDefault(); triggers[next].focus(); }
    });
  });
  $$('[data-ouvrir]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    openPanel(link.dataset.ouvrir, true);
  }));
  window.addEventListener('hashchange', () => openPanel(location.hash.slice(1), true));

  /* Heure civile parisienne, indépendante du fuseau de l’appareil. */
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayLong = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dayShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const services = {
    visage: { name: 'INDIBA visage', duration: 20 },
    corps: { name: 'INDIBA corps', duration: 20 }
  };
  // Planity et Salonsmassage : mardi à samedi, 10 h–19 h. Lundi/dimanche fermés.
  const hours = { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [600, 1140] };
  const state = { step: 0, service: '', date: '', time: null, done: false };
  const screens = $$('.etape');
  const stepButtons = $$('[data-etape]');
  const form = $('#reservation');
  let screenFrame;

  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    return { date: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)), minutes: parts.hour * 60 + parts.minute };
  }
  function keyOf(date) { return date.toISOString().slice(0, 10); }
  function dateOf(key) { return new Date(`${key}T00:00:00Z`); }
  function timeLabel(minutes) { return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`; }
  function slotsFor(date, duration, now = parisNow()) {
    const range = hours[date.getUTCDay()];
    if (!range) return [];
    const pastDay = date < now.date;
    const today = keyOf(date) === keyOf(now.date);
    const slots = [];
    for (let minute = range[0]; minute + duration <= range[1]; minute += 20) {
      slots.push({ minute, past: pastDay || (today && minute <= now.minutes) });
    }
    return slots;
  }
  function recap() {
    $('#recap-soin').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#recap-jour').textContent = state.date ? dayLong.format(dateOf(state.date)) : 'À choisir';
    $('#recap-heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    screens.forEach((screen, index) => {
      const button = $('[data-suivant]', screen);
      if (button) button.disabled = index === 0 ? !state.service : index === 1 ? !state.date : state.time === null;
    });
    stepButtons.forEach((button, index) => {
      button.disabled = state.done || (index > 0 && !state.service) || (index > 1 && !state.date) || (index > 2 && state.time === null);
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function announce(text) { $('#annonce').textContent = text; }
  function setStep(index, focus = true) {
    const backwards = index < state.step;
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    if (screenFrame) cancelAnimationFrame(screenFrame);
    screens.forEach((screen, number) => {
      screen.hidden = number !== index;
      screen.classList.remove('en-arrivee', 'en-retour');
    });
    const screen = screens[index];
    if (!reduce.matches && !root.hasAttribute('data-clavier')) {
      screen.classList.add(backwards ? 'en-retour' : 'en-arrivee');
      screenFrame = requestAnimationFrame(() => {
        screenFrame = requestAnimationFrame(() => screen.classList.remove('en-arrivee', 'en-retour'));
      });
    }
    recap();
    if (focus) $('.titre-etape', screen).focus();
    announce(`Étape ${index + 1} sur 4. ${$('.titre-etape', screen).textContent}`);
  }
  function makeRadio(name, value, disabled, checked) {
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    return input;
  }
  function renderDays() {
    const now = parisNow();
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + index);
      const key = keyOf(date);
      const closed = !hours[date.getUTCDay()];
      const allPast = !closed && slotsFor(date, services[state.service].duration, now).every(slot => slot.past);
      const disabled = closed || allPast;
      const label = document.createElement('label'); label.className = 'jour';
      const input = makeRadio('jour', key, disabled, state.date === key);
      const status = closed ? 'Fermé' : allPast ? 'Terminé' : '';
      input.setAttribute('aria-label', `${dayLong.format(date)}${status ? `, ${status.toLowerCase()}` : ', simulation'}`);
      label.append(input);
      [['jour-nom', dayShort.format(date)], ['jour-numero', date.getUTCDate()], ['jour-mois', status || monthShort.format(date)]].forEach(([className, text]) => {
        const span = document.createElement('span'); span.className = className; span.textContent = text; label.append(span);
      });
      input.addEventListener('change', () => {
        state.date = key; state.time = null; recap();
        announce(`Jour choisi : ${dayLong.format(date)}. Créneaux simulés.`);
      });
      fragment.append(label);
    }
    $('#jours').replaceChildren(fragment);
  }
  function renderSlots() {
    const fragment = document.createDocumentFragment();
    const slots = slotsFor(dateOf(state.date), services[state.service].duration);
    slots.forEach(slot => {
      const label = document.createElement('label'); label.className = 'heure';
      const input = makeRadio('heure', String(slot.minute), slot.past, state.time === slot.minute);
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}, ${slot.past ? 'horaire passé' : 'créneau simulé'}`);
      const text = document.createElement('span'); text.textContent = timeLabel(slot.minute);
      label.append(input, text);
      if (slot.past) { const note = document.createElement('small'); note.textContent = 'Passé'; label.append(note); }
      input.addEventListener('change', () => { state.time = slot.minute; recap(); announce(`Heure choisie : ${timeLabel(slot.minute)}. Créneau simulé.`); });
      fragment.append(label);
    });
    $('#heures').replaceChildren(fragment);
    $('#aucun-creneau').hidden = slots.some(slot => !slot.past);
  }
  function resetForm() {
    state.service = ''; state.date = ''; state.time = null; state.done = false;
    form.reset(); form.hidden = false; $('#reussite').hidden = true;
    $$('.erreur').forEach(error => { error.textContent = ''; });
    $$('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    setStep(0);
  }
  function chooseService(value) {
    if (state.done) resetForm();
    state.service = value; state.time = null;
    $(`input[name="soin"][value="${value}"]`).checked = true;
    setStep(0, false); openPanel('rendez-vous', true);
  }
  $$('[data-prestation]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); chooseService(link.dataset.prestation);
  }));
  $$('input[name="soin"]').forEach(input => input.addEventListener('change', () => {
    state.service = input.value; state.time = null; recap(); announce(`${services[state.service].name} sélectionné.`);
  }));
  $$('[data-suivant]').forEach(button => button.addEventListener('click', () => {
    if (!button.disabled) setStep(state.step + 1);
  }));
  $$('[data-retour]').forEach(button => button.addEventListener('click', () => setStep(state.step - 1)));
  stepButtons.forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.etape))));

  function phoneValid(value) {
    const compact = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(compact);
  }
  function validateField(id) {
    const input = $(`#${id}`);
    const valid = id === 'prenom' ? input.value.trim().length >= 2 : phoneValid(input.value);
    $(`#erreur-${id}`).textContent = valid ? '' : id === 'prenom' ? 'Saisissez un prénom d’au moins deux caractères.' : 'Saisissez un numéro français valide, avec ou sans +33.';
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('blur', () => { if ($(`#${id}`).value || $(`#${id}`).hasAttribute('aria-invalid')) validateField(id); });
    $(`#${id}`).addEventListener('input', () => { if ($(`#${id}`).getAttribute('aria-invalid') === 'true') { $(`#${id}`).removeAttribute('aria-invalid'); $(`#erreur-${id}`).textContent = ''; } });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const firstValid = validateField('prenom');
    const telephoneValid = validateField('telephone');
    if (!firstValid || !telephoneValid) {
      (!firstValid ? $('#prenom') : $('#telephone')).focus();
      announce('Vérifiez les champs signalés avant de terminer l’essai.'); return;
    }
    // Vérifier de nouveau le temps écoulé : un ancien créneau ne reste pas sélectionnable.
    const stillAvailable = state.service && state.date && slotsFor(dateOf(state.date), services[state.service].duration).some(slot => slot.minute === state.time && !slot.past);
    if (!stillAvailable) {
      state.time = null; state.date = ''; setStep(1);
      announce('Le créneau choisi est maintenant passé. Choisissez un autre jour pour continuer la simulation.'); return;
    }
    $('#confirmation-recap').textContent = `${services[state.service].name}, ${dayLong.format(dateOf(state.date))}, à ${timeLabel(state.time)} : voici votre sélection simulée.`;
    state.done = true; recap(); form.hidden = true; $('#reussite').hidden = false;
    $('#prenom').value = ''; $('#telephone').value = '';
    $('.titre-etape', $('#reussite')).focus();
    announce('Essai terminé. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.');
  });
  $('#recommencer').addEventListener('click', resetForm);

  /* Amélioration progressive : les cinq contenus restent visibles sans JavaScript. */
  openPanel('le-fait');
  $('#module-reservation').hidden = false;
  recap();
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('pret')));
  if (location.hash) openPanel(location.hash.slice(1));
  const reveals = $$('[data-revelation]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .15 });
    reveals.forEach(element => observer.observe(element));
  } else reveals.forEach(element => element.classList.add('visible'));
})();
