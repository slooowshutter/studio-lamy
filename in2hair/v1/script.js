/* In2hair · simulation locale. Aucun envoi, aucune conservation dans le navigateur. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  if (!reducedMotion.matches) root.classList.add('motion-ready');

  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    root.classList.add('reveal-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => {
      if (element.dataset.reveal === 'line') {
        const siblings = [...element.parentElement.children].filter(sibling => sibling.dataset.reveal === 'line');
        element.style.transitionDelay = `${siblings.indexOf(element) * 60}ms`;
      }
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', event => {
      if (!event.matches) return;
      root.classList.remove('reveal-ready', 'motion-ready');
      observer.disconnect();
    });
  }

  const services = [
    { id: 'full', name: 'Full balayage', duration: 240, durationText: '4\u00a0h', detail: 'AirTouch ou baby light · Olaplex · double gloss' },
    { id: 'contouring', name: 'Contouring', duration: 150, durationText: '2\u00a0h\u00a030', detail: 'Prestation publiée sur Planity' },
    { id: 'soleil', name: 'Effet Soleil', duration: 190, durationText: '3\u00a0h\u00a010', detail: 'Prestation publiée sur Planity' }
  ];
  // Planity, recherche fournie : mardi–vendredi 10:00–19:00 ; samedi 08:00–16:30.
  const hours = { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [480, 990] };
  const state = { step: 0, service: null, day: null, time: null, name: '', phone: '', complete: false };
  const panel = document.getElementById('form-panel');
  const app = document.getElementById('booking-app');
  const form = document.getElementById('booking-form');
  const next = document.getElementById('next');
  const previous = document.getElementById('previous');
  const status = document.getElementById('booking-status');
  const actions = document.getElementById('form-actions');
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const nextLabels = ['Choisir le jour', 'Choisir l’heure', 'Vos coordonnées', 'Terminer la simulation'];
  const stepNames = ['Choisissez une prestation', 'Choisissez un jour', 'Choisissez une heure', 'Vos coordonnées'];
  let keyboard = false;
  let transitionTimer = null;
  let transitionFrame = null;
  let changing = false;

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('using-keyboard'); }, { passive: true });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('using-keyboard'); }, { passive: true });

  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const selectedService = () => services.find(service => service.id === state.service);
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function parisClock() {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const read = type => parts.find(part => part.type === type).value;
    return { date: `${read('year')}-${read('month')}-${read('day')}`, minutes: Number(read('hour')) * 60 + Number(read('minute')) };
  }

  function dayDate(key) { return new Date(`${key}T12:00:00Z`); }
  function dayLabel(key) { return dateFormatter.format(dayDate(key)); }
  function timeLabel(minutes) {
    const minutePart = minutes % 60;
    return `${Math.floor(minutes / 60)}\u00a0h${minutePart ? `\u00a0${String(minutePart).padStart(2, '0')}` : ''}`;
  }

  function days() {
    const today = dayDate(parisClock().date);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + index);
      return { key: date.toISOString().slice(0, 10), date, index, open: Boolean(hours[date.getUTCDay()]) };
    });
  }

  function slots(key) {
    const service = selectedService();
    const range = hours[dayDate(key).getUTCDay()];
    if (!service || !range) return [];
    const clock = parisClock();
    const hash = key.replaceAll('-', '').split('').reduce((sum, digit) => sum + Number(digit), 0);
    const result = [];
    for (let minute = range[0], index = 0; minute + service.duration <= range[1]; minute += 30, index++) {
      const past = key < clock.date || (key === clock.date && minute <= clock.minutes);
      const taken = (hash + index) % 5 === 2;
      result.push({ minute, past, taken, disabled: past || taken });
    }
    return result;
  }

  function checked(value, current) { return value === current ? ' checked' : ''; }
  function groupError() { return '<p class="form-error" id="step-error" role="alert"></p>'; }

  function servicePanel() {
    return `<fieldset aria-describedby="step-error"><legend class="sr-only">Prestation pour la simulation</legend>${services.map(service => `
      <label class="radio-row"><input type="radio" name="prestation" value="${service.id}"${checked(service.id, state.service)}><span><span class="radio-name">${service.name}</span><span class="radio-info">${service.detail}</span></span><span class="radio-duration">${service.durationText}</span></label>
    `).join('')}</fieldset>${groupError()}`;
  }

  function dayPanel() {
    return `<fieldset aria-describedby="step-error"><legend class="sr-only">Jour du rendez-vous fictif</legend><div class="days-grid">${days().map(day => {
      const noFutureSlot = day.open && !slots(day.key).some(slot => !slot.disabled);
      const disabled = !day.open || noFutureSlot;
      const note = !day.open ? 'Fermé' : noFutureSlot ? 'Écoulé' : monthFormatter.format(day.date);
      return `<label class="choice"><input type="radio" name="jour" value="${day.key}" aria-label="${escapeHTML(dayLabel(day.key))}${disabled ? `, ${!day.open ? 'fermé' : 'aucun créneau restant'}` : ''}"${disabled ? ' disabled' : ''}${checked(day.key, state.day)}><span class="choice-body"><span>${weekdayFormatter.format(day.date)}</span><span class="choice-main">${day.date.getUTCDate()}</span><span class="choice-meta">${note}</span></span></label>`;
    }).join('')}</div></fieldset>${groupError()}`;
  }

  function timePanel() {
    const choices = slots(state.day);
    const free = choices.filter(slot => !slot.disabled).length;
    return `<p class="step-description">${escapeHTML(dayLabel(state.day))} · ${free} créneau${free > 1 ? 'x' : ''} fictif${free > 1 ? 's' : ''} disponible${free > 1 ? 's' : ''}. Heure de Paris.</p><fieldset aria-describedby="step-error"><legend class="sr-only">Heure du rendez-vous fictif</legend><div class="slots-grid">${choices.map(slot => `<label class="choice"><input type="radio" name="heure" value="${slot.minute}" aria-label="${timeLabel(slot.minute)}${slot.disabled ? slot.past ? ', heure passée' : ', déjà pris dans cet exemple' : ''}"${slot.disabled ? ' disabled' : ''}${checked(slot.minute, state.time)}><span class="choice-body"><span class="choice-main">${timeLabel(slot.minute)}</span><span class="choice-meta">${slot.disabled ? slot.past ? 'Passé' : 'Déjà pris' : 'Exemple'}</span></span></label>`).join('')}</div></fieldset>${groupError()}${free ? '' : '<p class="step-description">Il ne reste aucun créneau pour ce jour. Revenez au choix du jour.</p>'}`;
  }

  function contactPanel() {
    const service = selectedService();
    return `<p class="step-description">Vous pouvez laisser ces champs vides pour essayer. Ils ne servent qu’à illustrer le formulaire.</p>
      <div class="field"><label for="prenom">Prénom <span class="small">(facultatif)</span></label><input id="prenom" name="prenom" autocomplete="given-name" maxlength="80" value="${escapeHTML(state.name)}" aria-describedby="name-error"><p class="form-error" id="name-error" role="alert"></p></div>
      <div class="field"><label for="telephone">Téléphone <span class="small">(facultatif)</span></label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="25" value="${escapeHTML(state.phone)}" aria-describedby="phone-error"><p class="form-error" id="phone-error" role="alert"></p></div>
      <p class="privacy-note">Aucune donnée n’est envoyée ou enregistrée. Les champs seront effacés en terminant la simulation.</p>
      <div class="confirmation-recap"><strong>${service.name}</strong><p>${escapeHTML(dayLabel(state.day))} à ${timeLabel(state.time)}<br>Durée&nbsp;: ${service.durationText}<br>59 Cours Gambetta, 69003 Lyon</p></div>${groupError()}`;
  }

  function successPanel() {
    const service = selectedService();
    return `<h3 id="step-title" class="success-title" tabindex="-1">Votre carte est remplie.</h3><p class="success-note">La simulation s’arrête ici. <strong>Aucun rendez-vous n’a été réservé.</strong></p><div class="confirmation-recap"><strong>${service.name}</strong><p>${escapeHTML(dayLabel(state.day))} à ${timeLabel(state.time)}<br>Durée&nbsp;: ${service.durationText}<br>59 Cours Gambetta, 69003 Lyon</p></div><p class="success-note">Pour un vrai rendez-vous, poursuivez sur la page du salon ou appelez le <a href="tel:+33478607811">04&nbsp;78&nbsp;60&nbsp;78&nbsp;11</a>.</p><div class="success-actions"><a class="button" href="https://www.planity.com/in2hair-69003-lyon" target="_blank" rel="noopener">Réserver sur Planity <span aria-hidden="true">↗</span></a><button type="button" class="back-button" id="restart">Recommencer</button></div>`;
  }

  function updateSummary() {
    document.getElementById('summary-service').textContent = selectedService()?.name || 'Une prestation à choisir';
    document.getElementById('summary-date').textContent = state.day ? dayLabel(state.day) : 'Un jour à choisir';
    document.getElementById('summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'Une heure à choisir';
    document.getElementById('selection-mark').textContent = state.complete ? 'Exemple rempli' : 'À noter';
    stepButtons.forEach((button, index) => {
      button.disabled = state.complete || (index === 1 && !state.service) || (index === 2 && !state.day) || (index === 3 && state.time === null);
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function render(focus = false) {
    actions.hidden = state.complete;
    previous.hidden = state.step === 0;
    if (state.complete) panel.innerHTML = successPanel();
    else {
      const descriptions = [
        'Les durées sont celles de la carte Planity. Cette sélection ne réserve rien.',
        'Les jours fermés et les jours sans créneau restant sont désactivés.',
        'Ces disponibilités sont fictives. Le rendez-vous se termine avant la fermeture.',
        ''
      ];
      const contents = [servicePanel, dayPanel, timePanel, contactPanel];
      panel.innerHTML = `<h3 id="step-title" tabindex="-1">${stepNames[state.step]}</h3>${descriptions[state.step] ? `<p class="step-description">${descriptions[state.step]}</p>` : ''}${contents[state.step]()}`;
      next.innerHTML = `${nextLabels[state.step]} <span aria-hidden="true">→</span>`;
    }
    updateSummary();
    if (focus) {
      const heading = document.getElementById('step-title');
      heading.focus({ preventScroll: true });
      const rect = heading.getBoundingClientRect();
      if (rect.top < 20 || rect.bottom > window.innerHeight - 120) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      status.textContent = state.complete ? 'Simulation terminée. Aucune réservation effectuée.' : `Étape ${state.step + 1} sur 4. ${stepNames[state.step]}.`;
    }
  }

  function goTo(step) {
    clearTimeout(transitionTimer);
    cancelAnimationFrame(transitionFrame);
    state.step = step;
    panel.classList.toggle('no-motion', reducedMotion.matches || keyboard);
    if (reducedMotion.matches || keyboard) {
      panel.classList.remove('is-changing');
      changing = false;
      render(true);
      return;
    }
    changing = true;
    panel.classList.add('is-changing');
    transitionTimer = setTimeout(() => {
      render(true);
      transitionFrame = requestAnimationFrame(() => {
        panel.classList.remove('is-changing');
        changing = false;
      });
    }, 110);
  }

  function setError(message) {
    const element = document.getElementById('step-error');
    if (element) element.textContent = message;
    status.textContent = message;
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      if (state.service !== input.value) { state.day = null; state.time = null; }
      state.service = input.value;
    }
    if (input.name === 'jour') {
      if (state.day !== input.value) state.time = null;
      state.day = input.value;
    }
    if (input.name === 'heure') state.time = Number(input.value);
    const error = document.getElementById('step-error');
    if (error) error.textContent = '';
    updateSummary();
  });

  form.addEventListener('input', event => {
    const input = event.target;
    if (input.name === 'prenom') state.name = input.value;
    if (input.name === 'telephone') state.phone = input.value;
    if (input.name === 'prenom' || input.name === 'telephone') {
      input.removeAttribute('aria-invalid');
      const error = document.getElementById(input.name === 'prenom' ? 'name-error' : 'phone-error');
      error.textContent = '';
    }
  });

  function validSlot() {
    return state.day && days().some(day => day.key === state.day && day.open) && slots(state.day).some(slot => slot.minute === state.time && !slot.disabled);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (changing || state.complete) return;
    if (state.step === 0 && !state.service) { setError('Choisissez une prestation pour continuer.'); return; }
    if (state.step === 1 && (!state.day || !days().some(day => day.key === state.day && day.open && slots(day.key).some(slot => !slot.disabled)))) { setError('Choisissez un jour avec un créneau restant.'); return; }
    if (state.step === 2 && !validSlot()) { setError('Choisissez une heure disponible dans cet exemple.'); return; }
    if (state.step < 3) { goTo(state.step + 1); return; }

    const name = document.getElementById('prenom');
    const phone = document.getElementById('telephone');
    const phoneDigits = phone.value.replace(/[\s().-]/g, '');
    let invalid = null;
    if (name.value.trim() && !/\p{L}/u.test(name.value)) {
      document.getElementById('name-error').textContent = 'Indiquez un prénom contenant au moins une lettre, ou laissez le champ vide.';
      name.setAttribute('aria-invalid', 'true');
      invalid = name;
    }
    if (phoneDigits && !/^(?:0|\+33|0033)[1-9]\d{8}$/.test(phoneDigits)) {
      document.getElementById('phone-error').textContent = 'Indiquez un numéro français valide, ou laissez le champ vide.';
      phone.setAttribute('aria-invalid', 'true');
      invalid ||= phone;
    }
    if (invalid) { invalid.focus(); return; }
    if (!validSlot()) { state.time = null; goTo(2); status.textContent = 'Ce créneau est passé. Choisissez une autre heure.'; return; }
    state.name = '';
    state.phone = '';
    state.complete = true;
    goTo(3);
  });

  previous.addEventListener('click', () => { if (state.step > 0) goTo(state.step - 1); });
  stepButtons.forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));

  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    state.day = null;
    state.time = null;
    state.complete = false;
    goTo(0);
  }));

  panel.addEventListener('click', event => {
    if (event.target.id !== 'restart') return;
    Object.assign(state, { step: 0, service: null, day: null, time: null, name: '', phone: '', complete: false });
    goTo(0);
  });

  app.hidden = false;
  render();
})();
