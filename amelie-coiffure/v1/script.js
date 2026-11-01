(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('using-keyboard');
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('using-keyboard');
  }, { passive: true });

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const services = {
    brushing: 'Brushing',
    coloration: 'Coloration',
    balayage: 'Balayage',
    meches: 'Mèches',
    permanente: 'Permanente'
  };
  const state = { step: 0, service: '', day: '', time: '', complete: false };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const titles = ['Quelle prestation ?', 'Quel jour ?', 'À quelle heure ?', 'Vos coordonnées'];
  const stepErrors = ['#erreur-prestation', '#erreur-jour', '#erreur-heure'];
  const form = $('#formulaire-carnet');
  let currentAnimation = null;

  function parisNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { id: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }

  function dayDate(id) { return new Date(`${id}T12:00:00Z`); }
  function dayId(date) { return date.toISOString().slice(0, 10); }
  function weekday(id) { return dayDate(id).getUTCDay(); }
  function isSupportedDay(id) { return weekday(id) >= 2 && weekday(id) <= 5; }
  function formattedDay(id, short = false) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', weekday: short ? undefined : 'long', day: 'numeric', month: short ? 'short' : 'long'
    }).format(dayDate(id));
  }
  function formattedTime(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  }
  function possibleTimes(id, now = parisNow()) {
    if (!isSupportedDay(id) || id < now.id) return [];
    const times = [];
    for (let minutes = 9 * 60; minutes < 19 * 60; minutes += 30) {
      if (id !== now.id || minutes > now.minutes) times.push(minutes);
    }
    return times;
  }

  function makeRadio(name, value, className, accessibleName) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.setAttribute('aria-label', accessibleName);
    input.setAttribute('aria-describedby', name === 'jour' ? 'erreur-jour' : 'erreur-heure');
    label.append(input);
    return { label, input };
  }

  function renderDays() {
    const host = $('#choix-jours');
    const now = parisNow();
    const start = dayDate(now.id);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const id = dayId(date);
      const day = weekday(id);
      const available = possibleTimes(id, now).length > 0;
      const status = day === 6 ? 'À confirmer' : !isSupportedDay(id) ? 'Fermé' : !available ? 'Jour écoulé' : i === 0 ? 'Aujourd’hui' : '';
      const { label, input } = makeRadio('jour', id, 'day-option', `${formattedDay(id)}${status ? `, ${status}` : ''}, simulation`);
      input.disabled = !available;
      input.checked = state.day === id;
      const face = document.createElement('span');
      face.className = 'day-face';
      const week = document.createElement('span');
      week.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date);
      const number = document.createElement('strong');
      number.textContent = date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(date);
      const note = document.createElement('small');
      note.textContent = status;
      face.append(week, number, month, note);
      label.append(face);
      fragment.append(label);
    }
    host.replaceChildren(fragment);
  }

  function renderTimes() {
    const host = $('#choix-heures');
    const fragment = document.createDocumentFragment();
    const times = possibleTimes(state.day);
    for (const time of times) {
      const { label, input } = makeRadio('heure', String(time), 'time-option', `${formattedTime(time)}, heure de démonstration`);
      input.checked = state.time === String(time);
      const face = document.createElement('span');
      face.className = 'time-face';
      face.textContent = formattedTime(time);
      label.append(face);
      fragment.append(label);
    }
    if (!times.length) {
      state.time = '';
      const empty = document.createElement('p');
      empty.className = 'empty-times';
      empty.textContent = 'Ce jour ne propose plus d’heure de démonstration. Revenez au choix du jour.';
      fragment.append(empty);
    }
    host.replaceChildren(fragment);
  }

  function setSummary(selector, text) {
    const node = $(selector);
    if (node.textContent === text) return;
    node.getAnimations().forEach((animation) => animation.cancel());
    node.textContent = text;
    if (!reducedMotion.matches && !keyboard && node.animate) {
      node.animate([{ opacity: .3, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }

  function updateSummary() {
    setSummary('#resume-prestation', services[state.service] || 'À choisir');
    setSummary('#resume-jour', state.day ? formattedDay(state.day, true) : 'À choisir');
    setSummary('#resume-heure', state.time ? formattedTime(Number(state.time)) : 'À choisir');
    $('#recap-confirmation').textContent = state.service && state.day && state.time
      ? `Votre essai\u00a0: ${services[state.service]}, le ${formattedDay(state.day)} à ${formattedTime(Number(state.time))}. Tarif et durée à confirmer par téléphone.`
      : '';
    updateStepNavigation();
  }

  function announce(text) { $('#annonce-etape').textContent = text; }

  function maximumStep() {
    if (!services[state.service]) return 0;
    if (!state.day || !possibleTimes(state.day).length) return 1;
    if (!state.time || !possibleTimes(state.day).includes(Number(state.time))) return 2;
    return 3;
  }

  function updateStepNavigation() {
    const maximum = maximumStep();
    stepButtons.forEach((button, position) => {
      button.disabled = position > maximum;
      if (position === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(index, focus = true) {
    const previous = state.step;
    if (state.day && !possibleTimes(state.day).length) { state.day = ''; state.time = ''; }
    if (state.time && !possibleTimes(state.day).includes(Number(state.time))) state.time = '';
    index = Math.min(index, maximumStep());
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    if (currentAnimation) currentAnimation.cancel();
    panels.forEach((panel, position) => { panel.hidden = position !== index; });
    updateSummary();
    const panel = panels[index];
    if (!reducedMotion.matches && !keyboard && panel.animate) {
      const distance = index < previous ? '-8px' : '8px';
      currentAnimation = panel.animate([{ opacity: .15, transform: `translateX(${distance})` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    if (focus) panel.querySelector('h3').focus();
    announce(`Étape ${index + 1} sur 4\u00a0: ${titles[index]}. Simulation, aucune réservation transmise.`);
  }

  function stepValid(index) {
    const value = [state.service, state.day, state.time][index];
    const errors = ['Choisissez une prestation pour continuer.', 'Choisissez un jour proposé pour continuer.', 'Choisissez une heure de démonstration pour continuer.'];
    const node = $(stepErrors[index]);
    if (!value) {
      node.textContent = errors[index];
      const first = panels[index].querySelector('input:not(:disabled)');
      if (first) first.focus();
      return false;
    }
    node.textContent = '';
    return true;
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value;
      $('#erreur-prestation').textContent = '';
      $$('input[name="prestation"]').forEach((radio) => radio.setAttribute('aria-describedby', 'erreur-prestation'));
    }
    if (input.name === 'jour') {
      state.day = input.value;
      state.time = '';
      $('#erreur-jour').textContent = '';
      renderTimes();
    }
    if (input.name === 'heure') {
      state.time = input.value;
      $('#erreur-heure').textContent = '';
    }
    updateSummary();
  });

  $$('[data-next]').forEach((button) => button.addEventListener('click', () => {
    if (!stepValid(state.step)) return;
    if (state.step === 0) renderDays();
    if (state.step === 1) renderTimes();
    if (state.step === 2 && !possibleTimes(state.day).includes(Number(state.time))) {
      state.time = '';
      renderTimes();
      updateSummary();
      $('#erreur-heure').textContent = 'Cette heure est passée. Choisissez une autre heure de démonstration.';
      return;
    }
    showStep(Number(button.dataset.next));
  }));
  $$('[data-back]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    if (button.disabled) return;
    const index = Number(button.dataset.step);
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    showStep(index);
  }));

  function validateField(input) {
    const value = input.value.trim();
    let error = '';
    if (input.id === 'prenom' && !value) error = 'Indiquez votre prénom pour terminer cet essai.';
    if (input.id === 'telephone') {
      const digits = value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(digits)) error = 'Indiquez un numéro mobile français valide (06, 07 ou +33).';
    }
    $(`#erreur-${input.id}`).textContent = error;
    input.setAttribute('aria-invalid', error ? 'true' : 'false');
    return !error;
  }
  $$('.contact-fields input').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 3) { if (stepValid(state.step)) showStep(state.step + 1); return; }
    const fields = $$('.contact-fields input');
    const results = fields.map(validateField);
    const firstInvalid = results.indexOf(false);
    if (firstInvalid !== -1) { fields[firstInvalid].focus(); return; }
    if (!possibleTimes(state.day).includes(Number(state.time))) {
      state.time = '';
      renderTimes();
      showStep(2);
      $(stepErrors[state.step]).textContent = state.step === 1
        ? 'Ce jour est écoulé. Choisissez un autre jour de démonstration.'
        : 'Cette heure est passée. Choisissez une autre heure de démonstration.';
      return;
    }
    state.complete = true;
    $('#resume-final').textContent = `${$('#prenom').value.trim()}, voici votre essai\u00a0: ${services[state.service]}, le ${formattedDay(state.day)} à ${formattedTime(Number(state.time))}.`;
    // Les coordonnées ne restent pas dans les champs après l’essai.
    fields.forEach((input) => { input.value = ''; });
    form.hidden = true;
    $('.step-nav').hidden = true;
    const result = $('#resultat-carnet');
    result.hidden = false;
    if (!reducedMotion.matches && !keyboard && result.animate) {
      result.animate([{ opacity: .2, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    $('#titre-resultat').focus();
    announce('Démonstration terminée. Aucune réservation envoyée. Appelez le salon pour un rendez-vous réel.');
  });

  $('#recommencer').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { step: 0, service: '', day: '', time: '', complete: false });
    $$('.field-error').forEach((node) => { node.textContent = ''; });
    $$('.contact-fields input').forEach((input) => input.removeAttribute('aria-invalid'));
    $('#resume-final').textContent = '';
    $('#resultat-carnet').hidden = true;
    form.hidden = false;
    $('.step-nav').hidden = false;
    renderDays();
    $('#choix-heures').replaceChildren();
    showStep(0);
  });

  $$('[data-prestation]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      if (state.complete) $('#recommencer').click();
      state.service = button.dataset.prestation;
      $$('input[name="prestation"]').forEach((input) => { input.checked = input.value === state.service; });
      $('#erreur-prestation').textContent = '';
      renderDays();
      showStep(1);
    });
  });

  // La page commune n’est pas livrée avec cet aperçu autonome.
  // Si elle existe chez l’hébergeur, elle prend le relais des liens de repli.
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    const studioLinks = $$('[data-chemin-studio]');
    const destination = studioLinks[0]?.dataset.cheminStudio;
    if (destination) {
      fetch(destination, { method: 'HEAD', cache: 'no-store' }).then((response) => {
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
          studioLinks.forEach((link) => { link.href = destination; });
        }
      }).catch(() => { /* L’offre locale reste disponible hors connexion. */ });
    }
  }

  const address = '55 rue du Pré de la Bataille, 76000 Rouen';
  if (navigator.clipboard && window.isSecureContext) {
    const copy = $('#copier-adresse');
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(address);
        $('#retour-adresse').textContent = 'L’adresse est copiée.';
      } catch {
        $('#retour-adresse').textContent = 'Copie indisponible. L’adresse est affichée juste au-dessus.';
      }
    });
  }

  $$('input[name="prestation"]').forEach((input) => input.setAttribute('aria-describedby', 'erreur-prestation'));
  renderDays();
  updateSummary();
  $('#carnet').hidden = false;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -18px 0px' });
    $$('[data-reveal]').forEach((node) => observer.observe(node));
  } else {
    $$('[data-reveal]').forEach((node) => node.classList.add('is-visible'));
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
