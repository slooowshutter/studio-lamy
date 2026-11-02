/* LABEL Coupe · simulation locale. Aucune requête, aucun stockage. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const find = (selector, context = document) => context.querySelector(selector);
  const all = (selector, context = document) => [...context.querySelectorAll(selector)];
  const form = find('#booking-form');
  const panels = all('[data-panel]');
  const stepButtons = all('[data-step-link]');
  const state = { step: 0, service: '', day: '', time: '' };
  const fullDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const status = find('#booking-status');
  let transitionFrame;

  function parisNow(now = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { key: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }

  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0, 10);
  const hourLabel = value => `${Number(value)}\u00a0h`;

  function datesToShow() {
    const today = dateFromKey(parisNow().key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + index);
      return date;
    });
  }

  // Ce sont des heures souhaitées, pas des disponibilités ni des durées de prestation.
  function hoursToShow(key, now = parisNow()) {
    const day = dateFromKey(key);
    if (Number.isNaN(day.getTime()) || day.getUTCDay() === 0) return [];
    return Array.from({ length: 10 }, (_, index) => {
      const hour = index + 9;
      return { hour, past: key < now.key || (key === now.key && hour * 60 <= now.minutes) };
    });
  }

  function setError(id, message) {
    find(`#${id}`).textContent = message;
  }

  function updateSummary() {
    find('#summary-service').textContent = state.service || 'À choisir';
    find('#summary-day').textContent = state.day ? shortDate.format(dateFromKey(state.day)) : 'À choisir';
    find('#summary-time').textContent = state.time ? hourLabel(state.time) : 'À choisir';
    const recap = state.day && state.time ? `${fullDate.format(dateFromKey(state.day))} à ${hourLabel(state.time)} · ${state.service}.` : '';
    find('#final-recap').replaceChildren();
    if (recap) {
      const label = document.createElement('strong');
      label.textContent = 'Votre choix de démonstration';
      const text = document.createElement('p');
      text.textContent = recap;
      find('#final-recap').append(label, text);
    }
  }

  function renderDays() {
    const container = find('#day-choices');
    const now = parisNow();
    container.replaceChildren();
    datesToShow().forEach((date, index) => {
      const key = dateKey(date);
      const sunday = date.getUTCDay() === 0;
      const ended = !sunday && hoursToShow(key, now).every(hour => hour.past);
      const label = document.createElement('label');
      label.className = 'choice-label';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = sunday || ended;
      input.checked = state.day === key && !input.disabled;
      input.setAttribute('aria-describedby', 'day-error');
      input.setAttribute('aria-label', `${fullDate.format(date)}${sunday ? ', fermé selon l’annuaire' : ended ? ', heures passées' : ', choix de simulation'}`);
      const content = document.createElement('span');
      content.className = 'choice-content';
      const dayName = document.createElement('span'); dayName.className = 'weekday'; dayName.textContent = weekday.format(date);
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = String(date.getUTCDate());
      const note = document.createElement('span'); note.className = 'choice-note';
      note.textContent = sunday ? 'Fermé' : ended ? 'Passé' : index === 0 ? 'Aujourd’hui' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      content.append(dayName, number, note); label.append(input, content); container.append(label);
    });
  }

  function renderHours() {
    const container = find('#time-choices');
    container.replaceChildren();
    if (!state.day) return;
    find('#selected-day').textContent = fullDate.format(dateFromKey(state.day));
    const hours = hoursToShow(state.day);
    hours.forEach(({ hour, past }) => {
      const label = document.createElement('label'); label.className = 'choice-label';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(hour); input.disabled = past;
      input.checked = state.time === String(hour) && !past;
      input.setAttribute('aria-describedby', 'time-error');
      input.setAttribute('aria-label', `${hourLabel(hour)}${past ? ', heure passée' : ', heure souhaitée de simulation'}`);
      const content = document.createElement('span'); content.className = 'choice-content'; content.textContent = hourLabel(hour);
      label.append(input, content); container.append(label);
    });
    if (!hours.some(hour => !hour.past)) {
      const empty = document.createElement('p'); empty.className = 'empty-slots';
      empty.textContent = 'Aucune heure à proposer dans cet aperçu. Revenez au choix du jour.';
      container.append(empty);
    }
  }

  function goToStep(step, focus = true) {
    cancelAnimationFrame(transitionFrame);
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderHours();
    updateSummary();
    panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.panel) !== step;
      panel.classList.remove('is-entering');
    });
    stepButtons.forEach((button, index) => {
      button.disabled = step === 4 || index > step;
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const panel = panels[step];
    const keyboard = root.classList.contains('keyboard-navigation');
    if (!reduceMotion.matches && !keyboard) {
      panel.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    if (focus) {
      const title = find('.step-title', panel);
      title.focus({ preventScroll: true });
      const position = title.getBoundingClientRect();
      if (position.top < 28 || position.bottom > window.innerHeight - 95) {
        title.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }
    status.textContent = step === 4 ? 'Simulation terminée. Aucun rendez-vous pris, aucun message envoyé.' : `Étape ${step + 1} sur 4 : ${find('.step-title', panel).textContent}`;
  }

  function nextStep() {
    if (state.step === 0 && !state.service) {
      setError('service-error', 'Sélectionnez la demande de coiffure pour essayer le parcours.');
      const input = find('[name="prestation"]'); input.setAttribute('aria-invalid', 'true'); input.focus(); return;
    }
    if (state.step === 1) {
      const today = parisNow().key;
      const validDays = datesToShow().map(dateKey);
      if (!state.day || state.day < today || !validDays.includes(state.day) || !hoursToShow(state.day).some(hour => !hour.past)) {
        setError('day-error', 'Choisissez un jour proposé pour poursuivre la simulation.');
        const input = find('[name="jour"]:not(:disabled)'); if (input) input.focus(); return;
      }
    }
    if (state.step === 2 && (!state.time || !hoursToShow(state.day).some(({ hour, past }) => !past && String(hour) === state.time))) {
      state.time = ''; updateSummary(); renderHours();
      setError('time-error', 'Choisissez une heure proposée pour la simulation.');
      const input = find('[name="heure"]:not(:disabled)'); if (input) input.focus(); return;
    }
    goToStep(state.step + 1);
  }

  function validateContact() {
    const name = find('#first-name');
    const phone = find('#phone');
    const nameValid = name.value.trim().length > 0;
    const normalizedPhone = phone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0|\+33|0033)[1-9]\d{8}$/.test(normalizedPhone);
    setError('name-error', nameValid ? '' : 'Indiquez votre prénom pour terminer l’essai.');
    setError('phone-error', phoneValid ? '' : 'Indiquez un numéro français de dix chiffres, ou commençant par +33.');
    name.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid) name.focus(); else if (!phoneValid) phone.focus();
    return nameValid && phoneValid;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value; input.removeAttribute('aria-invalid'); setError('service-error', '');
    }
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = '';
      state.day = input.value; setError('day-error', '');
    }
    if (input.name === 'heure') { state.time = input.value; setError('time-error', ''); }
    updateSummary();
  });

  ['first-name', 'phone'].forEach(id => {
    find(`#${id}`).addEventListener('input', event => {
      event.target.removeAttribute('aria-invalid');
      setError(id === 'phone' ? 'phone-error' : 'name-error', '');
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { if (state.step < 3) nextStep(); return; }
    if (!validateContact()) return;
    if (!hoursToShow(state.day).some(({ hour, past }) => !past && String(hour) === state.time)) {
      state.time = ''; goToStep(2); setError('time-error', 'Cette heure est désormais passée. Choisissez une autre heure pour l’essai.'); return;
    }
    find('#result-greeting').textContent = `${find('#first-name').value.trim()}, voici votre choix de démonstration.`;
    const label = document.createElement('strong'); label.textContent = 'Votre choix de démonstration';
    const recap = document.createElement('p');
    recap.textContent = `${state.service} · ${fullDate.format(dateFromKey(state.day))} à ${hourLabel(state.time)}.`;
    find('#result-recap').replaceChildren(label, recap);
    // Les coordonnées sont effacées après l’essai ; le bilan n’affiche pas le téléphone.
    find('#first-name').value = ''; find('#phone').value = '';
    goToStep(4);
  });

  all('[data-next]').forEach(button => button.addEventListener('click', nextStep));
  all('[data-back]').forEach(button => button.addEventListener('click', () => goToStep(Math.max(0, state.step - 1))));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.stepLink);
    if (step <= state.step) goToStep(step);
  }));
  find('#restart').addEventListener('click', () => {
    form.reset(); state.service = ''; state.day = ''; state.time = '';
    all('.field-error').forEach(error => { error.textContent = ''; });
    all('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    find('#result-greeting').textContent = ''; find('#result-recap').replaceChildren();
    goToStep(0);
  });

  document.addEventListener('keydown', () => root.classList.add('keyboard-navigation'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-navigation'), { passive: true });

  // L’amélioration est activée seulement après la mise en place du parcours.
  find('.booking-interactive').hidden = false;
  find('[name="prestation"]').setAttribute('aria-describedby', 'service-error');
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); reveals.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    all('[data-reveal]').forEach(element => reveals.observe(element));

    const mobileBar = find('.mobile-actions');
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    function refreshMobileBar() {
      const visible = !heroVisible && !bookingVisible && !footerVisible;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.inert = !visible;
      mobileBar.setAttribute('aria-hidden', String(!visible));
    }
    const actionsObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'actions-principales') heroVisible = entry.isIntersecting;
        if (entry.target.id === 'rendez-vous') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'pied-de-page') footerVisible = entry.isIntersecting;
      });
      refreshMobileBar();
    }, { threshold: 0 });
    ['#actions-principales', '#rendez-vous', '#pied-de-page'].forEach(selector => actionsObserver.observe(find(selector)));
    refreshMobileBar();
  } else {
    all('[data-reveal]').forEach(element => element.classList.add('is-revealed'));
    find('.mobile-actions').classList.add('is-visible');
  }
  updateSummary();
})();
