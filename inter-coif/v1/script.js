(() => {
  'use strict';

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const state = { service: '', date: '', time: null, step: 0 };
  const names = { courts: 'Cheveux courts', 'mi-longs': 'Cheveux mi-longs', longs: 'Cheveux longs' };
  // Minutes depuis minuit. Plages concordantes Planity / Cylex.
  // Aucun créneau le lundi : horaire contradictoire. Aucune durée inventée.
  const hours = { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1020] };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  let transitionFrame;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const data = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${data.year}-${data.month}-${data.day}`, minutes: Number(data.hour) * 60 + Number(data.minute) };
  }

  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}\u00a0h\u00a0${String(minute).padStart(2, '0')}` : `${hour}\u00a0h`;
  }
  function fullDate() { return state.date ? dateFormat.format(dateFromKey(state.date)) : 'À choisir'; }

  function choice(group, value, label, valueText, status, disabled) {
    const row = document.createElement('label');
    row.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = value;
    input.disabled = disabled;
    input.setAttribute('aria-label', label);
    input.setAttribute('aria-describedby', group === 'jour' ? 'erreur-jour' : 'slots-note erreur-heure');
    row.append(input);
    if (group === 'jour') {
      const weekday = document.createElement('span');
      weekday.textContent = dayFormat.format(dateFromKey(value));
      row.append(weekday);
    }
    const strong = document.createElement('span');
    strong.className = 'choice-value';
    strong.textContent = valueText;
    row.append(strong);
    if (status) {
      const note = document.createElement('span');
      note.className = 'choice-status';
      note.textContent = status;
      row.append(note);
    }
    return row;
  }

  function renderDays() {
    const today = parisNow();
    const start = dateFromKey(today.key);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      const day = date.getUTCDay();
      const key = dateKey(date);
      const range = hours[day];
      const finished = !!range && key === today.key && today.minutes >= range[1] - 60;
      const status = day === 0 ? 'Fermé' : day === 1 ? 'À confirmer' : finished ? 'Journée passée' : monthFormat.format(date);
      fragment.append(choice('jour', key, `${dateFormat.format(date)} · ${status}`, String(date.getUTCDate()), status, !range || finished));
    }
    $('#days').replaceChildren(fragment);
  }

  function renderSlots() {
    const date = dateFromKey(state.date);
    const range = hours[date.getUTCDay()];
    const fragment = document.createDocumentFragment();
    const now = parisNow();
    let available = 0;
    if (range) {
      // Échantillon d’heures d’essai, pas une durée de prestation ou un agenda réel.
      for (let minutes = range[0]; minutes < range[1]; minutes += 60) {
        const past = state.date < now.key || (state.date === now.key && minutes <= now.minutes);
        const label = `${timeLabel(minutes)} · ${past ? 'Heure passée' : 'Exemple, disponibilité à confirmer'}`;
        fragment.append(choice('heure', String(minutes), label, timeLabel(minutes), past ? 'Passée' : 'Exemple', past));
        if (!past) available++;
      }
    }
    if (!available) {
      const empty = document.createElement('p');
      empty.className = 'slots-empty';
      empty.textContent = 'Aucune heure d’essai restante ce jour. Choisissez un autre jour.';
      fragment.append(empty);
    }
    $('#slots').replaceChildren(fragment);
  }

  function updateSummary() {
    $('#summary-service').textContent = names[state.service] || 'À choisir';
    $('#summary-date').textContent = fullDate();
    $('#summary-time').textContent = state.time === null ? 'À choisir' : `${timeLabel(state.time)} · exemple`;
    $('#confirmation-recap').textContent = `Forfait boucles / frisés · ${names[state.service] || 'longueur à choisir'} · ${fullDate()} · ${state.time === null ? 'heure à choisir' : timeLabel(state.time) + ' (exemple)'}. Durée et disponibilité à confirmer.`;
    stepButtons.forEach((button, index) => {
      button.disabled = index === 1 ? !state.service : index === 2 ? !state.date : index === 3 ? state.time === null : false;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function showStep(index, pointer = false) {
    cancelAnimationFrame(transitionFrame);
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== index; panel.classList.remove('is-entering'); });
    const panel = panels[index];
    state.step = index;
    if (pointer && !reduced.matches) {
      panel.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    updateSummary();
    const heading = $('h3', panel);
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 16 || rect.bottom > window.innerHeight - 110) {
      heading.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    $('#booking-status').textContent = index === 4 ? 'Essai terminé. Aucun rendez-vous réservé.' : `Étape ${index + 1} sur 4\u00a0: ${heading.textContent}`;
  }

  function error(id, text) { $(id).textContent = text; }

  function checkSelection(next) {
    if (next === 1 && !state.service) {
      error('#erreur-longueur', 'Choisissez une longueur pour continuer.');
      $('[name="longueur"]').focus();
      return false;
    }
    if (next === 2 && !state.date) {
      error('#erreur-jour', 'Choisissez un jour d’essai pour continuer.');
      $('[name="jour"]:not(:disabled)').focus();
      return false;
    }
    if (next === 3 && state.time === null) {
      error('#erreur-heure', 'Choisissez une heure d’exemple pour continuer.');
      const first = $('[name="heure"]:not(:disabled)');
      if (first) first.focus();
      return false;
    }
    return true;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'longueur') {
      state.service = input.value;
      error('#erreur-longueur', '');
    } else if (input.name === 'jour') {
      state.date = input.value;
      state.time = null;
      error('#erreur-jour', '');
      error('#erreur-heure', '');
      renderSlots();
    } else if (input.name === 'heure') {
      state.time = Number(input.value);
      error('#erreur-heure', '');
    }
    updateSummary();
  });

  $$('[data-next]').forEach(button => button.addEventListener('click', event => {
    const next = Number(button.dataset.next);
    if (checkSelection(next)) showStep(next, event.detail > 0);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.back), event.detail > 0)));
  stepButtons.forEach(button => button.addEventListener('click', event => showStep(Number(button.dataset.step), event.detail > 0)));
  $$('[data-service]').forEach(link => link.addEventListener('click', event => {
    state.service = link.dataset.service;
    $(`[name="longueur"][value="${state.service}"]`).checked = true;
    error('#erreur-longueur', '');
    showStep(0, event.detail > 0);
  }));

  function validateField(input, message) {
    const invalid = !!message;
    input.setAttribute('aria-invalid', String(invalid));
    $(`#erreur-${input.id}`).textContent = message;
    return !invalid;
  }

  form.addEventListener('input', event => {
    if (event.target.matches('#prenom, #telephone')) validateField(event.target, '');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    // Une page restée ouverte ne peut valider une heure désormais passée.
    const now = parisNow();
    if (state.date < now.key || (state.date === now.key && state.time <= now.minutes)) {
      state.time = null;
      renderSlots();
      showStep(2);
      error('#erreur-heure', 'Cette heure est maintenant passée. Choisissez une autre heure d’essai.');
      return;
    }
    const firstName = $('#prenom');
    const phone = $('#telephone');
    const nameValid = validateField(firstName, firstName.value.trim().length >= 2 ? '' : 'Saisissez un prénom d’au moins deux caractères.');
    const cleanPhone = phone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = validateField(phone, /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(cleanPhone) ? '' : 'Saisissez un numéro français à dix chiffres, ou avec +33.');
    if (!nameValid || !phoneValid) {
      (!nameValid ? firstName : phone).focus();
      $('#booking-status').textContent = 'Vérifiez les champs indiqués avant de terminer l’essai.';
      return;
    }
    $('#success-recap').textContent = `Votre sélection d’essai\u00a0: forfait boucles / frisés, ${names[state.service].toLocaleLowerCase('fr-FR')}, ${fullDate()}, ${timeLabel(state.time)}. Disponibilité et durée à confirmer.`;
    showStep(4, event.submitter && document.activeElement === event.submitter && !document.documentElement.classList.contains('keyboard-use'));
  });

  $('.restart-button').addEventListener('click', event => {
    form.reset();
    Object.assign(state, { service: '', date: '', time: null });
    $$('.field-error').forEach(node => { node.textContent = ''; });
    $$('.field input').forEach(input => input.removeAttribute('aria-invalid'));
    renderDays();
    $('#slots').replaceChildren();
    showStep(0, event.detail > 0);
  });

  document.addEventListener('keydown', () => document.documentElement.classList.add('keyboard-use'), { passive: true });
  document.addEventListener('pointerdown', () => document.documentElement.classList.remove('keyboard-use'), { passive: true });

  renderDays();
  updateSummary();
  $('.interactive').hidden = false;
  $('.booking-fallback').hidden = true;
  document.documentElement.classList.add('js');

  const revealNodes = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    revealNodes.forEach(node => observer.observe(node));
    reduced.addEventListener('change', event => {
      if (event.matches) { revealNodes.forEach(node => node.classList.add('is-visible')); observer.disconnect(); }
    });
  } else revealNodes.forEach(node => node.classList.add('is-visible'));
})();
