/* Euro Style by Julien C. — aperçu local, sans envoi ni stockage. */
(() => {
  'use strict';

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.23, 1, .32, 1)';
  const services = {
    'coupe-femme': 'Coupe femme',
    'coupe-enfant': 'Coupe enfant',
    coloration: 'Coloration',
    balayage: 'Balayage'
  };

  // Uniquement les plages communes aux deux annuaires (relevé du 17/11/2026).
  // Ce sont des heures souhaitées : aucune durée ni disponibilité n’est supposée.
  const hours = {
    0: [], 1: [],
    2: [[600, 780], [870, 1140]],
    3: [[600, 780], [870, 1140]],
    4: [[600, 780], [870, 1140]],
    5: [[600, 1140]],
    6: [[600, 1080]]
  };
  const state = { service: '', day: '', time: null, step: 1, reached: 1 };
  const panelAnimations = new Map();
  let keyboard = false;
  let finished = false;
  const form = $('#simulation');
  const stepNames = ['Prestation', 'Jour', 'Heure', 'Relire'];
  const dateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dateShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Paris' });
  const nbsp = '\u00a0';

  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function timeLabel(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return `${h}${nbsp}h${m ? `${nbsp}${String(m).padStart(2, '0')}` : ''}`;
  }
  function futureDays() {
    const start = dateFromKey(parisNow().iso);
    return Array.from({ length: 14 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      return day.toISOString().slice(0, 10);
    });
  }
  function possibleTimes(key) {
    const ranges = hours[dateFromKey(key).getUTCDay()];
    return ranges.flatMap(([start, end]) => {
      const values = [];
      for (let time = start; time < end; time += 30) values.push(time);
      return values;
    });
  }
  function timeIsFuture(key, time) {
    const now = parisNow();
    return key > now.iso || (key === now.iso && time > now.minutes);
  }
  function dayIsUsable(key) { return futureDays().includes(key) && possibleTimes(key).some(time => timeIsFuture(key, time)); }
  function error(step, message) {
    const node = $(`#erreur-${step}`);
    if (message) node.textContent = message;
    node.hidden = false;
  }
  function clearError(step) { $(`#erreur-${step}`).hidden = true; }

  function renderDays() {
    const legend = $('#jours legend');
    $('#jours').replaceChildren(legend);
    const fragment = document.createDocumentFragment();
    futureDays().forEach(key => {
      const day = dateFromKey(key);
      const closed = hours[day.getUTCDay()].length === 0;
      const disabled = !dayIsUsable(key);
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.checked = state.day === key; input.disabled = disabled;
      input.setAttribute('aria-label', `${dateLong.format(day)}${closed ? ', fermé selon les annuaires' : disabled ? ', journée écoulée' : ', jour souhaité, à confirmer'}`);
      const weekday = document.createElement('span'); weekday.textContent = dateShort.format(day);
      const number = document.createElement('strong'); number.textContent = String(day.getUTCDate());
      const month = document.createElement('span'); month.textContent = monthShort.format(day);
      label.append(input, weekday, number, month);
      if (disabled) { const status = document.createElement('span'); status.className = 'day-state'; status.textContent = closed ? 'Fermé' : 'Écoulé'; label.append(status); }
      fragment.append(label);
    });
    $('#jours').append(fragment);
  }

  function renderTimes() {
    const legend = $('#heures legend');
    $('#heures').replaceChildren(legend);
    $('#jour-choisi').textContent = state.day ? dateLong.format(dateFromKey(state.day)) : '';
    if (!state.day) return;
    const fragment = document.createDocumentFragment();
    possibleTimes(state.day).forEach(time => {
      const label = document.createElement('label');
      label.className = 'time-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(time);
      input.checked = state.time === time;
      input.disabled = !timeIsFuture(state.day, time);
      input.setAttribute('aria-label', `${timeLabel(time)}, ${input.disabled ? 'heure passée' : 'heure souhaitée, à confirmer'}`);
      const text = document.createElement('span'); text.textContent = timeLabel(time);
      label.append(input, text);
      fragment.append(label);
    });
    $('#heures').append(fragment);
  }

  function recap() {
    if (!state.service || !state.day || state.time === null) return '';
    return `${services[state.service]}, ${dateLong.format(dateFromKey(state.day))} à ${timeLabel(state.time)}. Choix d’essai, à confirmer par téléphone.`;
  }
  function updateSummary() {
    $('#selection-prestation').textContent = services[state.service] || 'À choisir';
    $('#selection-jour').textContent = state.day ? dateFromKey(state.day).getUTCDate() : '—';
    $('#selection-mois').textContent = state.day ? monthYear.format(dateFromKey(state.day)) : 'Jour souhaité';
    $('#selection-heure').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('#titre-selection').innerHTML = finished ? 'Un essai.<br>Rien de réservé.' : state.day ? 'Votre date<br>souhaitée.' : 'Une date<br>à choisir.';
    $('#recapitulatif').textContent = recap();
    $$('[data-step-link]').forEach(button => {
      const target = Number(button.dataset.stepLink);
      button.disabled = finished || target > state.reached;
      if (target === state.step && !finished) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function cancelPanelAnimation(panel) {
    const animation = panelAnimations.get(panel);
    if (animation) { animation.cancel(); panelAnimations.delete(panel); }
  }
  function showStep(target, focus = true) {
    const previous = state.step;
    state.step = target;
    state.reached = Math.max(state.reached, target);
    if (target === 2) renderDays();
    if (target === 3) renderTimes();
    const animate = !reduced.matches && !keyboard && typeof Element.prototype.animate === 'function';
    $$('[data-panel]').forEach(panel => {
      cancelPanelAnimation(panel);
      const isTarget = Number(panel.dataset.panel) === target;
      const wasVisible = !panel.hidden;
      panel.inert = !isTarget;
      if (isTarget) {
        panel.hidden = false;
        if (animate && previous !== target) {
          const direction = target > previous ? 1 : -1;
          const animation = panel.animate([
            { opacity: 0, transform: `translate(${direction * 14}px, ${direction * -4}px)` },
            { opacity: 1, transform: 'translate(0, 0)' }
          ], { duration: 220, easing: ease });
          panelAnimations.set(panel, animation);
        }
      } else if (animate && wasVisible) {
        const animation = panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: ease });
        panelAnimations.set(panel, animation);
        animation.onfinish = () => { if (state.step !== Number(panel.dataset.panel)) panel.hidden = true; panelAnimations.delete(panel); };
      } else panel.hidden = true;
    });
    updateSummary();
    $('#annonce').textContent = `Étape ${target} sur 4 : ${stepNames[target - 1]}. Simulation uniquement.`;
    if (focus) {
      const heading = $(`#etape-${target}`);
      heading.focus({ preventScroll: true });
      const rect = heading.getBoundingClientRect();
      if (rect.top < 24 || rect.bottom > window.innerHeight - 100) {
        heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }
  }
  function selectService(value) {
    if (!services[value]) return;
    state.service = value; state.day = ''; state.time = null; state.reached = 1;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    clearError(1); updateSummary();
  }
  function validateStep(step) {
    if (step === 1 && !state.service) { error(1); $('input[name="prestation"]').focus(); return false; }
    if (step === 2 && (!state.day || !dayIsUsable(state.day))) {
      error(2, 'Choisissez un jour proposé pour continuer.');
      $('#jours input:not(:disabled)')?.focus(); return false;
    }
    if (step === 3 && (state.time === null || !possibleTimes(state.day).includes(state.time) || !timeIsFuture(state.day, state.time))) {
      error(3, 'Choisissez une heure à venir pour continuer.');
      $('#heures input:not(:disabled)')?.focus(); return false;
    }
    clearError(step); return true;
  }

  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard-mode'); }, { passive: true });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') selectService(input.value);
    if (input.name === 'jour') {
      state.day = input.value; state.time = null; state.reached = 2;
      clearError(2); updateSummary();
    }
    if (input.name === 'heure') {
      state.time = Number(input.value); clearError(3); updateSummary();
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (validateStep(state.step)) showStep(Number(button.dataset.next));
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  $$('[data-step-link]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.stepLink);
    if (target <= state.reached) showStep(target);
  }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (finished) reset(false);
    selectService(link.dataset.service);
    showStep(1);
  }));

  function fieldError(id, messageId, invalid) {
    $(`#${messageId}`).hidden = !invalid;
    if (invalid) $(`#${id}`).setAttribute('aria-invalid', 'true');
    else $(`#${id}`).removeAttribute('aria-invalid');
  }
  function phoneIsValid(value) {
    const cleaned = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(cleaned);
  }
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => fieldError(id, `erreur-${id}`, false));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 4) return;
    if (!state.service) { showStep(1); validateStep(1); return; }
    if (!state.day || !dayIsUsable(state.day)) { state.day = ''; state.time = null; state.reached = 2; showStep(2); error(2, 'Le jour choisi est écoulé. Choisissez un autre jour.'); return; }
    if (state.time === null || !possibleTimes(state.day).includes(state.time) || !timeIsFuture(state.day, state.time)) { state.time = null; state.reached = 3; showStep(3); error(3, 'L’heure choisie est passée. Choisissez une autre heure.'); return; }
    const name = $('#prenom').value.trim();
    const nameInvalid = name.length < 2;
    const phoneInvalid = !phoneIsValid($('#telephone').value);
    fieldError('prenom', 'erreur-prenom', nameInvalid);
    fieldError('telephone', 'erreur-telephone', phoneInvalid);
    if (nameInvalid || phoneInvalid) {
      $(nameInvalid ? '#prenom' : '#telephone').focus();
      $('#annonce').textContent = 'Vérifiez les champs indiqués pour terminer la simulation.';
      return;
    }
    finished = true;
    $('#resultat-recap').textContent = `Pour ${name} : ${recap()}`;
    form.hidden = true;
    $('#resultat').hidden = false;
    updateSummary();
    $('#annonce').textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé.';
    $('#titre-resultat').focus({ preventScroll: true });
    if (!reduced.matches && !keyboard && typeof Element.prototype.animate === 'function') {
      $('#resultat').animate([{ opacity: 0, transform: 'translate(12px, -4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: ease });
    }
  });
  function reset(focus = true) {
    finished = false;
    form.reset();
    state.service = ''; state.day = ''; state.time = null; state.reached = 1;
    $('#resultat').hidden = true; $('#resultat-recap').textContent = ''; form.hidden = false;
    [1, 2, 3].forEach(clearError);
    ['prenom', 'telephone'].forEach(id => fieldError(id, `erreur-${id}`, false));
    showStep(1, focus);
  }
  $('#recommencer').addEventListener('click', () => reset());

  $('#parcours').hidden = false;
  $('#sans-javascript').hidden = true;
  $$('[data-panel]').forEach(panel => { panel.inert = panel.hidden; });
  updateSummary();

  // Une seule entrée par élément. Le contenu reste visible si JavaScript manque.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    document.documentElement.classList.add('reveal-ready');
    reduced.addEventListener('change', event => {
      if (event.matches) {
        observer.disconnect(); document.documentElement.classList.remove('reveal-ready', 'motion-ready');
        panelAnimations.forEach(animation => animation.cancel());
        $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== state.step; });
      }
    });
  }
  if (!reduced.matches) document.documentElement.classList.add('motion-ready');
})();
