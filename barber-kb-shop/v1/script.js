/* Barber KB Shop · aperçu local, aucun envoi ni stockage de coordonnées. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const services = {
    'degrade-shampoing': { name: 'Dégradé à blanc + shampoing', duration: 35 },
    degrade: { name: 'Dégradé à blanc', duration: 30 },
    classique: { name: 'Coupe classique', duration: 20 }
  };
  // Planity / iCoiffeur : lundi–samedi 09:00–19:00, dimanche fermé.
  const hours = { 0: null, 1: [540,1140], 2: [540,1140], 3: [540,1140], 4: [540,1140], 5: [540,1140], 6: [540,1140] };
  const weekday = ['dim.','lun.','mar.','mer.','jeu.','ven.','sam.'];
  const state = { service: 'degrade-shampoing', date: '', time: null, step: 0, reached: 0 };
  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const form = $('#booking-form');
  let dates = [];
  let transitionFrame = 0;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type,part.value]));
    return { day: new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))), minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const dateKey = day => day.toISOString().slice(0,10);
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const dateText = key => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateFromKey(key));
  const dateShort = key => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(dateFromKey(key));
  const timeText = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2,'0')}` : ''}`;

  function slotOptions(key, duration, current = parisNow()) {
    const day = dateFromKey(key);
    const range = hours[day.getUTCDay()];
    if (!range) return [];
    const isPastDay = key < dateKey(current.day);
    const today = key === dateKey(current.day);
    const result = [];
    for (let minute = range[0], index = 0; minute + duration <= range[1]; minute += 30, index++) {
      const past = isPastDay || (today && minute <= current.minutes);
      const unavailable = (day.getUTCDate() + index * 3) % 11 === 4;
      result.push({ minute, disabled: past || unavailable, reason: past ? 'Passé' : unavailable ? 'Indisponible' : '' });
    }
    return result;
  }

  function announce(message) { $('#booking-announcement').textContent = message; }
  function clearError(id) { $(`#${id}`).textContent = ''; }
  function updateSummary() {
    $('#summary-duration').textContent = services[state.service].duration;
    $('#summary-service').textContent = services[state.service].name;
    $('#summary-day').textContent = state.date ? dateShort(state.date) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
  }
  function chooseService(value) {
    if (!services[value]) return;
    if (state.service !== value) {
      state.service = value;
      state.time = null;
      state.reached = Math.min(state.reached,2);
      clearError('time-error');
    }
    $(`input[name="prestation"][value="${value}"]`).checked = true;
    renderDays();
    if (state.date) renderSlots();
    updateSummary();
  }

  function makeChoice(name, value, className, disabled, accessibleLabel) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label',accessibleLabel);
    input.setAttribute('aria-describedby',name === 'jour' ? 'day-error' : 'slot-help time-error');
    const span = document.createElement('span');
    label.append(input,span);
    return { label,input,span };
  }
  function renderDays() {
    const current = parisNow();
    const container = $('#booking-days');
    container.replaceChildren();
    dates = [];
    for (let offset = 0; offset < 14; offset++) {
      const day = new Date(current.day);
      day.setUTCDate(day.getUTCDate() + offset);
      const key = dateKey(day);
      dates.push(key);
      const closed = !hours[day.getUTCDay()];
      const ended = !closed && !slotOptions(key,services[state.service].duration,current).some(slot => !slot.disabled);
      const disabled = closed || ended;
      const choice = makeChoice('jour',key,'day-choice',disabled,`${dateText(key)}${closed ? ', fermé' : ended ? ', aucun créneau simulé restant' : ', date simulée'}`);
      const top = document.createElement('span'); top.textContent = weekday[day.getUTCDay()];
      const number = document.createElement('b'); number.textContent = day.getUTCDate();
      const bottom = document.createElement('small');
      bottom.textContent = closed ? 'Fermé' : ended ? 'Écoulé' : new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'}).format(day);
      choice.span.append(top,number,bottom);
      choice.input.checked = state.date === key && !disabled;
      choice.input.addEventListener('change',() => {
        state.date = key; state.time = null;
        state.reached = Math.min(state.reached,2);
        clearError('day-error'); clearError('time-error');
        renderSlots(); updateSummary(); updateSteps();
        announce(`${dateText(key)} sélectionné pour la simulation.`);
      });
      container.append(choice.label);
    }
    const selected = $$('input[name="jour"]',container).find(input => input.checked);
    if (state.date && !selected) { state.date = ''; state.time = null; state.reached = Math.min(state.reached,1); }
  }
  function renderSlots() {
    const container = $('#booking-slots');
    container.replaceChildren();
    if (!state.date) return;
    const slots = slotOptions(state.date,services[state.service].duration);
    const validSelection = slots.some(slot => slot.minute === state.time && !slot.disabled);
    if (!validSelection) state.time = null;
    $('#slot-help').textContent = `${dateText(state.date)}. Créneaux fictifs entre 9\u00a0h et 19\u00a0h, selon les horaires publiés. Les indisponibilités sont simulées.`;
    slots.forEach(slot => {
      const choice = makeChoice('heure',String(slot.minute),'slot-choice',slot.disabled,`${timeText(slot.minute)}, ${slot.reason ? slot.reason.toLowerCase() : 'créneau proposé'}, simulation`);
      const hour = document.createElement('b'); hour.textContent = timeText(slot.minute);
      choice.span.append(hour);
      if (slot.disabled) { const reason = document.createElement('small'); reason.textContent = slot.reason; choice.span.append(reason); }
      choice.input.checked = state.time === slot.minute;
      choice.input.addEventListener('change',() => {
        state.time = slot.minute; clearError('time-error'); updateSummary();
        announce(`${timeText(slot.minute)} sélectionné pour la simulation.`);
      });
      container.append(choice.label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const message = document.createElement('p');
      message.textContent = 'Aucun créneau simulé restant. Revenez au choix du jour.';
      container.append(message);
    }
  }
  function updateSteps() {
    steps.forEach((button,index) => {
      button.disabled = index > state.reached || state.step === 4;
      if (index === state.step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }
  function goToStep(index, focus = true) {
    cancelAnimationFrame(transitionFrame);
    panels.forEach((panel,i) => { panel.hidden = i !== index; panel.classList.remove('step-enter'); });
    const panel = panels[index];
    state.step = index;
    state.reached = Math.max(state.reached,index);
    updateSteps(); updateSummary();
    if (!reducedMotion.matches && !root.classList.contains('keyboard')) {
      panel.classList.add('step-enter');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('step-enter'));
      });
    }
    if (focus) $('h3',panel).focus({preventScroll:true});
    announce(index === 4 ? 'Simulation terminée. Aucune réservation effectuée.' : `Étape ${index + 1} sur 4 : ${$('h3',panel).textContent}`);
  }
  function focusFirst(name) {
    const input = $(`input[name="${name}"]:not(:disabled)`);
    if (input) input.focus();
  }
  function validateChoice(next) {
    if (next === 2) {
      renderDays(); updateSummary();
      if (!state.date) { $('#day-error').textContent = 'Choisissez une date pour continuer.'; focusFirst('jour'); return false; }
      renderSlots();
    }
    if (next === 3) {
      renderSlots(); updateSummary();
      if (state.time === null) { $('#time-error').textContent = 'Choisissez un créneau simulé pour continuer.'; focusFirst('heure'); return false; }
    }
    return true;
  }
  function validateField(input) {
    const nameField = input.id === 'prenom';
    const normal = input.value.replace(/[\s.()\-]/g,'');
    const valid = nameField ? input.value.trim().length > 0 : /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(normal);
    const error = nameField ? 'Indiquez un prénom pour terminer la simulation.' : 'Indiquez un mobile français valide : 06, 07, +33 6 ou +33 7, suivi des autres chiffres.';
    $(`#${nameField ? 'name-error' : 'phone-error'}`).textContent = valid ? '' : error;
    input.setAttribute('aria-invalid',String(!valid));
    return valid;
  }

  $$('input[name="prestation"]').forEach(input => input.addEventListener('change',() => {
    chooseService(input.value); updateSteps();
    announce(`${services[state.service].name}, ${services[state.service].duration} minutes, sélectionné.`);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click',() => {
    chooseService(link.dataset.service); state.reached = 0;
    goToStep(0);
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click',() => {
    const next = Number(button.dataset.next);
    if (next === 1) renderDays();
    if (validateChoice(next)) goToStep(next);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click',() => {
    if (button.dataset.back === '1') renderDays();
    if (button.dataset.back === '2') renderSlots();
    goToStep(Number(button.dataset.back));
  }));
  steps.forEach(button => button.addEventListener('click',() => {
    const next = Number(button.dataset.step);
    if (next > state.reached) return;
    if (next === 1) renderDays();
    if (next >= 2 && !state.date) { goToStep(1); return; }
    if (next >= 2) renderSlots();
    if (next === 3 && state.time === null) { goToStep(2); return; }
    goToStep(next);
  }));
  ['prenom','telephone'].forEach(id => {
    const input = $(`#${id}`);
    input.addEventListener('blur',() => { if (input.value || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input',() => {
      input.removeAttribute('aria-invalid');
      clearError(id === 'prenom' ? 'name-error' : 'phone-error');
    });
  });
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (state.step !== 3) return;
    renderDays();
    if (!state.date) { goToStep(1); $('#day-error').textContent = 'La date a changé. Choisissez une nouvelle date simulée.'; return; }
    renderSlots();
    if (state.time === null) { goToStep(2); $('#time-error').textContent = 'Ce créneau est maintenant passé. Choisissez une autre heure.'; return; }
    const validName = validateField($('#prenom'));
    const validPhone = validateField($('#telephone'));
    if (!validName || !validPhone) { $(validName ? '#telephone' : '#prenom').focus(); return; }
    $('#success-recap').textContent = `${services[state.service].name} — cheveux courts, ${services[state.service].duration} minutes. ${dateText(state.date)}, à ${timeText(state.time)}. Ceci est un récapitulatif fictif.`;
    // Effacement immédiat des coordonnées, sans stockage ni transmission.
    $('#prenom').value = ''; $('#telephone').value = '';
    goToStep(4);
  });
  $('#restart').addEventListener('click',() => {
    form.reset(); state.service = 'degrade-shampoing'; state.date = ''; state.time = null; state.reached = 0;
    ['name-error','phone-error','day-error','time-error'].forEach(clearError);
    $('#prenom').removeAttribute('aria-invalid'); $('#telephone').removeAttribute('aria-invalid');
    renderDays(); goToStep(0);
  });

  document.addEventListener('keydown',event => { if (event.key === 'Tab') root.classList.add('keyboard'); });
  document.addEventListener('pointerdown',() => root.classList.remove('keyboard'),{passive:true});
  renderDays(); updateSummary(); updateSteps();
  $('#booking-app').hidden = false; $('#booking-fallback').hidden = true;

  // Contenu visible sans JavaScript ; les seules apparitions sont ajoutées après initialisation.
  let revealObserver;
  function showAll() {
    root.classList.remove('motion');
    $$('.reveal').forEach(element => element.classList.add('is-visible'));
    if (revealObserver) revealObserver.disconnect();
    $('.blob-scroll').style.transform = '';
  }
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
    revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target);
    }),{threshold:.12});
    $$('.reveal').forEach(element => revealObserver.observe(element));
  }
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change',showAll);

  // Une légère variation de silhouette sur le fond uniquement ; le texte ne se déforme pas.
  const blob = $('.blob-scroll');
  let scrollFrame = 0;
  let blobOnScreen = true;
  const bar = $('#mobile-bar');
  const barRegions = new Set();
  if ('IntersectionObserver' in window) {
    const blobObserver = new IntersectionObserver(entries => { blobOnScreen = entries[0].isIntersecting; });
    blobObserver.observe($('.hero-art'));
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? barRegions.add(entry.target) : barRegions.delete(entry.target));
      const hide = barRegions.size > 0;
      bar.classList.toggle('is-hidden',hide);
      bar.inert = hide;
      bar.setAttribute('aria-hidden',String(hide));
    },{threshold:0});
    ['#hero-actions','#rendez-vous','#pied-de-page'].forEach(selector => barObserver.observe($(selector)));
  }
  window.addEventListener('scroll',() => {
    if (scrollFrame || reducedMotion.matches || !blobOnScreen) return;
    scrollFrame = requestAnimationFrame(() => {
      const progress = Math.min(window.scrollY / 850,1);
      blob.style.transform = `rotate(${-5 + progress * 7}deg) scale(${1 + progress * .025},${1 - progress * .02})`;
      scrollFrame = 0;
    });
  },{passive:true});
})();
