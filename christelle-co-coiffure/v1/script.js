/* Parcours local de démonstration. Aucun envoi et aucun stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardAction = false;
  document.addEventListener('keydown', () => { keyboardAction = true; root.classList.add('keyboard-use'); }, true);
  document.addEventListener('pointerdown', () => { keyboardAction = false; root.classList.remove('keyboard-use'); }, true);
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('is-ready'));

  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('awaiting');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px 35px 0px' });
    $$('[data-reveal]').forEach(element => {
      element.classList.add('awaiting');
      observer.observe(element);
    });
    reduce.addEventListener('change', event => {
      if (event.matches) {
        $$('[data-reveal]').forEach(element => element.classList.remove('awaiting'));
        observer.disconnect();
      }
    });
  }

  // Source : iCoiffeur, relevé du 17 novembre 2026. Les autres annuaires divergent.
  // Minutes depuis minuit, index dimanche = 0. Seulement pour la démonstration.
  // Aucune durée de prestation ni fausse disponibilité n’est créée.
  const hours = { 0: null, 1: [600, 1080], 2: [540, 930], 3: [540, 1080], 4: [540, 930], 5: [540, 930], 6: null };
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const daysGrid = $('#days-grid');
  const slotsGrid = $('#slots-grid');
  const form = $('#booking-form');
  const state = { step: 0, furthest: 0, day: '', time: null };
  let stepAnimation;
  reduce.addEventListener('change', () => { if (reduce.matches && stepAnimation) stepAnimation.cancel(); });

  function parisNow() {
    const values = {};
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(part => { values[part.type] = part.value; });
    return { key: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }
  const dateObject = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const dayName = key => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateObject(key));
  const shortDay = key => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(dateObject(key)).replace('.', '');
  const monthName = key => new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(dateObject(key));
  const clock = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;

  function possibleTimes(key) {
    const limits = hours[dateObject(key).getUTCDay()];
    if (!limits) return [];
    const now = parisNow();
    if (key < now.key) return [];
    const choices = [];
    for (let minute = limits[0]; minute < limits[1]; minute += 60) {
      if (key !== now.key || minute > now.minutes) choices.push(minute);
    }
    return choices;
  }

  function clearError(id) { $(`#${id}`).textContent = ''; }
  function announce(message) { $('#booking-status').textContent = message; }
  function updateSummary() {
    $('#summary-day').textContent = state.day ? dayName(state.day) : 'Jour à choisir';
    $('#summary-time').textContent = state.time !== null ? clock(state.time) : 'Heure à choisir';
    const recap = state.day && state.time !== null ? `Coiffure · ${dayName(state.day)}, à ${clock(state.time)}. À titre de démonstration seulement.` : '';
    $('#final-recap').textContent = recap;
  }

  function makeChoice(name, value, className, content, disabled, labelText) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', labelText);
    const face = document.createElement('span');
    face.innerHTML = content; // Exclusivement des chaînes et des dates générées ici.
    label.append(input, face);
    return label;
  }

  function renderDays() {
    const today = dateObject(parisNow().key);
    daysGrid.replaceChildren();
    for (let index = 0; index < 14; index++) {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() + index);
      const key = dateKey(date);
      const closed = !hours[date.getUTCDay()];
      const elapsed = !closed && possibleTimes(key).length === 0;
      const disabled = closed || elapsed;
      const note = closed ? 'Fermé*' : elapsed ? 'Passé' : monthName(key);
      const label = makeChoice('jour', key, 'date-choice', `<span class="day-label">${shortDay(key)}</span><span class="day-number">${date.getUTCDate()}</span><small>${note}</small>`, disabled, `${dayName(key)}${closed ? ', fermé selon iCoiffeur, à confirmer' : elapsed ? ', heures passées' : ', démonstration'}`);
      const input = $('input', label);
      input.checked = key === state.day;
      input.setAttribute('aria-describedby', 'erreur-jour');
      input.addEventListener('change', () => {
        state.day = key; state.time = null;
        state.furthest = Math.min(state.furthest, 2);
        clearError('erreur-jour'); updateSummary(); updateStepNav();
        announce(`Jour choisi pour la démonstration : ${dayName(key)}.`);
      });
      daysGrid.append(label);
    }
    const note = document.createElement('p');
    note.className = 'small-note'; note.style.gridColumn = '1 / -1';
    note.textContent = '* Fermé selon iCoiffeur, à confirmer auprès du salon.';
    daysGrid.append(note);
    const last = new Date(today); last.setUTCDate(today.getUTCDate() + 13);
    $('#periode-jours').textContent = `Du ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(today)} au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(last)}`;
  }

  function renderTimes() {
    slotsGrid.replaceChildren();
    $('#selected-day').textContent = dayName(state.day);
    possibleTimes(state.day).forEach(minute => {
      const label = makeChoice('heure', minute, 'slot-choice', clock(minute), false, `${clock(minute)}, démonstration`);
      const input = $('input', label); input.checked = state.time === minute;
      input.setAttribute('aria-describedby', 'erreur-heure');
      input.addEventListener('change', () => {
        state.time = minute; clearError('erreur-heure'); updateSummary();
        announce(`Heure choisie pour la démonstration : ${clock(minute)}.`);
      });
      slotsGrid.append(label);
    });
    if (!slotsGrid.children.length) {
      const note = document.createElement('p');
      note.textContent = 'Les heures de ce jour sont passées. Revenez choisir un autre jour.';
      slotsGrid.append(note);
    }
  }

  function updateStepNav() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.furthest || state.step === 4;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(next, focus = true) {
    if (stepAnimation) stepAnimation.cancel();
    const previous = state.step;
    panels.forEach((panel, index) => { panel.hidden = index !== next; });
    state.step = next; state.furthest = Math.max(state.furthest, Math.min(next, 3));
    updateSummary(); updateStepNav();
    const panel = panels[next];
    if (focus) {
      const heading = $('h3', panel);
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      if (bounds.top < 25 || bounds.top > innerHeight - 170) {
        heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }
    if (!reduce.matches && !keyboardAction && panel.animate) {
      const offset = next >= previous ? 12 : -12;
      stepAnimation = panel.animate([
        { opacity: 0, transform: `translateX(${offset}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    announce(next === 4 ? 'Simulation terminée. Rien n’a été envoyé au salon.' : `Étape ${next + 1} sur 4 : ${$('h3', panel).textContent}`);
  }

  function timeStillValid() { return state.day && state.time !== null && possibleTimes(state.day).includes(state.time); }
  function nextStep() {
    if (state.step === 0) { renderDays(); showStep(1); }
    else if (state.step === 1) {
      if (!state.day || !possibleTimes(state.day).length) {
        $('#erreur-jour').textContent = 'Choisissez un jour proposé pour continuer la démonstration.';
        $('input:not(:disabled)', daysGrid)?.focus(); return;
      }
      renderTimes(); showStep(2);
    } else if (state.step === 2) {
      if (!timeStillValid()) {
        state.time = null; updateSummary(); renderTimes();
        $('#erreur-heure').textContent = 'Choisissez une heure proposée pour continuer la démonstration.';
        $('input:not(:disabled)', slotsGrid)?.focus(); return;
      }
      showStep(3);
    }
  }
  $$('[data-next]').forEach(button => button.addEventListener('click', nextStep));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => {
    if (state.step === 2) renderDays();
    if (state.step === 3) renderTimes();
    showStep(Math.max(0, state.step - 1));
  }));
  stepButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    showStep(index);
  }));

  const firstName = $('#prenom');
  const telephone = $('#telephone');
  function validateField(input) {
    let error = '';
    if (input === firstName && !input.value.trim()) error = 'Indiquez votre prénom pour essayer la confirmation.';
    if (input === telephone) {
      const normalized = input.value.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
      if (!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalized)) error = 'Indiquez un numéro français à dix chiffres, ou commençant par +33.';
    }
    const target = input === firstName ? $('#erreur-prenom') : $('#erreur-telephone');
    target.textContent = error;
    if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    return !error;
  }
  [firstName, telephone].forEach(input => {
    input.addEventListener('blur', () => { if (input.value.trim() || input.hasAttribute('aria-invalid')) validateField(input); });
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) {
        input.removeAttribute('aria-invalid');
        $(`#erreur-${input.id}`).textContent = '';
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!timeStillValid()) {
      state.time = null; renderTimes(); showStep(2);
      $('#erreur-heure').textContent = 'Cette heure est passée. Choisissez une autre heure de démonstration.';
      return;
    }
    const nameValid = validateField(firstName); const phoneValid = validateField(telephone);
    if (!nameValid || !phoneValid) { (nameValid ? telephone : firstName).focus(); return; }
    $('#success-recap').textContent = `Votre essai : coiffure, ${dayName(state.day)} à ${clock(state.time)}, chez Christelle&Co Coiffure, 23 rue de la Prière à Nantes.`;
    $('#summary-stamp').textContent = 'Essai terminé';
    form.reset();
    showStep(4);
  });
  function reset() {
    state.day = ''; state.time = null; state.furthest = 0;
    form.reset();
    [firstName, telephone].forEach(input => input.removeAttribute('aria-invalid'));
    ['erreur-prenom', 'erreur-telephone', 'erreur-jour', 'erreur-heure'].forEach(clearError);
    $('#summary-stamp').textContent = 'Simulation';
    showStep(0);
  }
  $('#restart').addEventListener('click', reset);
  $$('[data-start]').forEach(link => link.addEventListener('click', () => {
    reset();
  }));
  $('#booking-app').hidden = false;
  renderDays(); updateSummary();

  // La barre cesse de couvrir le contenu quand le parcours ou le pied est à l’écran.
  const bar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const actionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      });
      bar.hidden = visible.size > 0;
    }, { threshold: 0 });
    [$('.hero-call'), $('#rendez-vous'), $('#pied')].forEach(element => actionObserver.observe(element));
  } else { bar.hidden = false; }
})();
