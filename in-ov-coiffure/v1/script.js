(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'coupe-femme', name: 'Coupe femme' },
    { id: 'coupe-enfant', name: 'Coupe enfant' },
    { id: 'coloration', name: 'Coloration' },
    { id: 'brushing', name: 'Brushing' }
  ];
  const state = { step: 0, service: '', day: '', time: '', firstName: '', phone: '', success: false };
  const ui = {
    interface: document.querySelector('#reservation-interface'),
    form: document.querySelector('#simulation-form'),
    step: document.querySelector('#booking-step'),
    summary: document.querySelector('#selection-summary'),
    status: document.querySelector('#booking-status'),
    back: document.querySelector('#retour'),
    next: document.querySelector('#continuer'),
    steps: [...document.querySelectorAll('[data-step]')]
  };
  let entranceFrame = 0;
  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' });
  const fullDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const pad = value => String(value).padStart(2, '0');
  const dateKey = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const serviceName = () => services.find(service => service.id === state.service)?.name || 'À choisir';

  function nowInParis() {
    return Object.fromEntries(parisClock.formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  }

  function holiday(date) {
    const year = date.getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(dateKey(date).slice(5))) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(Date.UTC(year, month - 1, day, 12));
    return [1, 39, 50].some(offset => {
      const movable = new Date(easter);
      movable.setUTCDate(movable.getUTCDate() + offset);
      return dateKey(movable) === dateKey(date);
    });
  }

  function upcomingDays() {
    const now = nowInParis();
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(Date.UTC(now.year, now.month - 1, now.day + offset, 12));
      return { date, key: dateKey(date), closed: date.getUTCDay() === 0, holiday: holiday(date) };
    });
  }

  function timeChoices(key) {
    const now = nowInParis();
    const today = `${now.year}-${pad(now.month)}-${pad(now.day)}`;
    if (!key || key < today || dateFromKey(key).getUTCDay() === 0) return [];
    const seed = Number(key.replaceAll('-', ''));
    // Ces heures sont des choix d’interface, pas des disponibilités du salon.
    // Aucun temps de prestation n’est déduit de ces repères horaires.
    return Array.from({ length: 10 }, (_, offset) => {
      const hour = 9 + offset;
      const past = key === today && hour * 60 <= now.hour * 60 + now.minute;
      const unavailable = (seed + offset * 3) % 7 === 0;
      return { key: `${pad(hour)}:00`, label: `${hour}\u00a0h`, disabled: past || unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans cet essai' : '' };
    });
  }

  function selectionValid() {
    return services.some(service => service.id === state.service) &&
      upcomingDays().some(day => day.key === state.day && !day.closed) &&
      timeChoices(state.day).some(time => time.key === state.time && !time.disabled);
  }

  function saveFields() {
    if (state.step !== 3 || state.success) return;
    const name = document.querySelector('#prenom');
    const phone = document.querySelector('#telephone');
    if (name && phone) {
      state.firstName = name.value;
      state.phone = phone.value;
    }
  }

  function updateSummary() {
    const entries = [
      ['Prestation', serviceName()],
      ['Jour', state.day ? fullDay.format(dateFromKey(state.day)) : 'À choisir'],
      ['Heure', state.time ? `${Number(state.time.slice(0, 2))}\u00a0h` : 'À choisir']
    ];
    ui.summary.innerHTML = entries.map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('');
    ui.steps.forEach((button, index) => {
      const reachable = index === 0 || (index === 1 && state.service) || (index === 2 && state.day) || (index === 3 && state.time);
      button.disabled = !reachable || state.success;
      if (index === state.step && !state.success) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function renderStep(focus = false) {
    cancelAnimationFrame(entranceFrame);
    ui.step.classList.remove('is-entering');
    const titles = ['Quelle prestation\u00a0?', 'Quel jour\u00a0?', 'À quelle heure\u00a0?', 'Pour terminer cet essai'];
    const nextLabels = ['Choisir un jour', 'Choisir une heure', 'Continuer', 'Terminer la simulation'];
    let content = `<h3 id="titre-etape" tabindex="-1">${titles[state.step]}</h3>`;
    if (state.step === 0) {
      content += '<p class="step-description">Catégories d’annuaire à confirmer. Aucune durée ni aucun tarif publiés ici.</p><fieldset><legend class="sr-only">Choisir une prestation pour la simulation</legend><div class="choice-grid">';
      content += services.map(service => `<label class="choice"><input type="radio" name="prestation" value="${service.id}" ${state.service === service.id ? 'checked' : ''} aria-describedby="erreur-etape"><span class="choice-title">${service.name}</span></label>`).join('');
      content += '</div></fieldset>';
    } else if (state.step === 1) {
      content += '<p class="step-description">Quatorze jours à venir. Dimanche fermé selon les annuaires. Jours fériés à confirmer.</p><fieldset><legend class="sr-only">Choisir un jour de démonstration</legend><div class="day-grid">';
      content += upcomingDays().map(day => {
        const annotation = day.closed ? 'Fermé' : day.holiday ? 'Férié' : monthLabel.format(day.date);
        const name = `${fullDay.format(day.date)}${day.closed ? ', fermé' : day.holiday ? ', jour férié, ouverture à confirmer' : ''}`;
        return `<label class="choice day-choice"><input type="radio" name="jour" value="${day.key}" ${day.closed ? 'disabled' : ''} ${state.day === day.key ? 'checked' : ''} aria-label="${escape(name)}" aria-describedby="erreur-etape"><span><span class="day-name">${shortDay.format(day.date)}</span><span class="day-number">${day.date.getUTCDate()}</span><span class="day-state">${annotation}</span></span></label>`;
      }).join('');
      content += '</div></fieldset>';
    } else if (state.step === 2) {
      content += `<p class="step-description">${escape(fullDay.format(dateFromKey(state.day)))}. Heures fictives. Les heures barrées sont indisponibles dans cet essai.</p><fieldset><legend class="sr-only">Choisir une heure de démonstration</legend><div class="time-grid">`;
      const times = timeChoices(state.day);
      content += times.map(time => `<label class="choice time-choice"><input type="radio" name="heure" value="${time.key}" ${time.disabled ? 'disabled' : ''} ${state.time === time.key ? 'checked' : ''} aria-label="${time.label}${time.reason ? `, ${time.reason}` : ''}" aria-describedby="erreur-etape"><span>${time.label}</span></label>`).join('');
      content += '</div></fieldset>';
      if (!times.some(time => !time.disabled)) content += '<p class="step-description">Aucune heure disponible pour cet essai aujourd’hui. Revenez au choix du jour.</p>';
    } else {
      content += '<p class="step-description">Vous pouvez tester avec vos coordonnées. Elles restent dans cette page, sans envoi ni enregistrement.</p>';
      content += `<div class="field"><label for="prenom">Votre prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="50" value="${escape(state.firstName)}" aria-describedby="erreur-prenom"><p id="erreur-prenom" class="field-error" aria-live="polite"></p></div>`;
      content += `<div class="field"><label for="telephone">Votre téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" value="${escape(state.phone)}" aria-describedby="aide-telephone erreur-telephone"><p id="aide-telephone" class="field-hint">Un numéro français, mobile ou fixe.</p><p id="erreur-telephone" class="field-error" aria-live="polite"></p></div>`;
    }
    content += '<p id="erreur-etape" class="step-error" role="status" aria-live="polite"></p>';
    ui.step.innerHTML = content;
    ui.back.hidden = state.step === 0;
    ui.next.innerHTML = `${nextLabels[state.step]} <span aria-hidden="true">→</span>`;
    updateSummary();
    if (!reduceMotion.matches && root.dataset.saisie !== 'clavier') {
      ui.step.classList.add('is-entering');
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => ui.step.classList.remove('is-entering'));
      });
    }
    if (focus) focusCurrentStep();
    ui.status.textContent = `Étape ${state.step + 1} sur 4\u00a0: ${titles[state.step]}`;
  }

  function focusCurrentStep() {
    const title = document.querySelector('#titre-etape');
    title.focus({ preventScroll: true });
    const position = title.getBoundingClientRect();
    if (position.top < 24 || position.bottom > window.innerHeight - 96) {
      title.scrollIntoView({
        block: 'start',
        behavior: reduceMotion.matches || root.dataset.saisie === 'clavier' ? 'auto' : 'smooth'
      });
    }
  }

  function goToStep(index) {
    saveFields();
    state.step = index;
    renderStep(true);
  }

  function stepError(message, selector) {
    document.querySelector('#erreur-etape').textContent = message;
    document.querySelector(selector)?.focus({ preventScroll: true });
  }

  function validateContact() {
    const name = document.querySelector('#prenom');
    const phone = document.querySelector('#telephone');
    const nameValid = /^[\p{L}\p{M}][\p{L}\p{M}\s.’'\-]{1,49}$/u.test(name.value.trim()) && (name.value.match(/\p{L}/gu) || []).length >= 2;
    const cleanPhone = phone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(cleanPhone);
    document.querySelector('#erreur-prenom').textContent = nameValid ? '' : 'Saisissez un prénom de deux lettres au moins.';
    document.querySelector('#erreur-telephone').textContent = phoneValid ? '' : 'Saisissez un numéro français valide.';
    name.setAttribute('aria-invalid', String(!nameValid));
    phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!nameValid || !phoneValid) {
      (nameValid ? phone : name).focus();
      return false;
    }
    return true;
  }

  function finish() {
    state.success = true;
    state.firstName = '';
    state.phone = '';
    ui.step.classList.remove('is-entering');
    ui.step.innerHTML = `<span class="small-label success-kicker">Simulation terminée</span><h3 id="titre-etape" tabindex="-1">L’essai s’arrête ici.</h3><p class="success-message">Aucun rendez-vous n’a été pris. Aucune coordonnée n’a été envoyée au salon.</p><p class="success-recap"><strong>${escape(serviceName())}</strong>${escape(fullDay.format(dateFromKey(state.day)))} · ${Number(state.time.slice(0, 2))}\u00a0h<br>Votre choix de démonstration, sans réservation réelle.</p><a class="success-contact" href="tel:+33241392733">Prendre rendez-vous au 02\u00a041\u00a039\u00a027\u00a033 <span aria-hidden="true">↗</span></a>`;
    ui.back.hidden = true;
    ui.next.textContent = 'Recommencer l’essai';
    updateSummary();
    focusCurrentStep();
    ui.status.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.';
  }

  ui.form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.success) {
      Object.assign(state, { step: 0, service: '', day: '', time: '', firstName: '', phone: '', success: false });
      renderStep(true);
      return;
    }
    if (state.step === 0 && !state.service) return stepError('Choisissez une prestation pour essayer le parcours.', 'input[name="prestation"]');
    if (state.step === 1 && !upcomingDays().some(day => day.key === state.day && !day.closed)) return stepError('Choisissez un jour dans la liste.', 'input[name="jour"]:not(:disabled)');
    if (state.step === 2 && !timeChoices(state.day).some(time => time.key === state.time && !time.disabled)) return stepError('Choisissez une heure disponible dans cet essai.', 'input[name="heure"]:not(:disabled)');
    if (state.step < 3) return goToStep(state.step + 1);
    saveFields();
    if (!validateContact()) return;
    if (!selectionValid()) {
      state.time = '';
      goToStep(1);
      return stepError('La date ou l’heure a changé. Choisissez à nouveau votre jour.', 'input[name="jour"]:not(:disabled)');
    }
    finish();
  });

  ui.form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      if (state.service !== input.value) Object.assign(state, { service: input.value, day: '', time: '' });
    } else if (input.name === 'jour') {
      if (state.day !== input.value) Object.assign(state, { day: input.value, time: '' });
    } else if (input.name === 'heure') state.time = input.value;
    document.querySelector('#erreur-etape').textContent = '';
    updateSummary();
  });

  ui.form.addEventListener('input', event => {
    if (!['prenom', 'telephone'].includes(event.target.id)) return;
    event.target.removeAttribute('aria-invalid');
    const error = document.querySelector(`#erreur-${event.target.id}`);
    if (error) error.textContent = '';
    saveFields();
  });
  ui.back.addEventListener('click', () => { if (state.step > 0) goToStep(state.step - 1); });
  ui.steps.forEach(button => button.addEventListener('click', () => { if (!button.disabled) goToStep(Number(button.dataset.step)); }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    Object.assign(state, { service: link.dataset.service, day: '', time: '', step: 1, success: false, firstName: '', phone: '' });
    renderStep(false);
    ui.status.textContent = `${serviceName()} sélectionnée pour la simulation. Choisissez un jour.`;
  }));

  document.addEventListener('keydown', event => {
    root.dataset.saisie = 'clavier';
    if (event.key === 'Escape') {
      const openDetails = document.querySelector('.preview-offer[open]');
      if (openDetails) {
        openDetails.open = false;
        openDetails.querySelector('summary').focus();
      }
    }
  });
  document.addEventListener('pointerdown', () => { root.dataset.saisie = 'pointeur'; }, { passive: true });
  ui.interface.hidden = false;
  renderStep();

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    }), { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
    const visibilityObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const className = entry.target.id === 'reserver' ? 'booking-visible' : 'footer-visible';
      document.body.classList.toggle(className, entry.isIntersecting);
    }), { threshold: 0, rootMargin: '0px 0px -60px 0px' });
    visibilityObserver.observe(document.querySelector('#reserver'));
    visibilityObserver.observe(document.querySelector('#pied-de-page'));
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  }
})();
