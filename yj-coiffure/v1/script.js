/* Yj Coiffure : aperçu local. Aucun envoi, aucun stockage de coordonnées. */
(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.23,1,.32,1)';
  let keyboard = false;
  let stepAnimation;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-input'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-input'); }, { passive: true });

  /* Les lettres restent du vrai texte, avec une seule lecture du nom. */
  const wordmark = $('.masthead__letters');
  const text = wordmark.textContent;
  wordmark.textContent = '';
  [...text].forEach((letter, i) => {
    const span = document.createElement('span');
    span.textContent = letter === ' ' ? '\u00a0' : letter;
    span.style.setProperty('--letter', i);
    wordmark.append(span);
  });
  // La manchette occupe sa largeur, avec les métriques de la police réellement chargée.
  function fitMasthead() {
    const heading = $('.masthead');
    if (!wordmark.getBoundingClientRect) return;
    heading.style.fontSize = '';
    const naturalWidth = wordmark.getBoundingClientRect().width;
    const available = heading.clientWidth;
    if (naturalWidth > 0 && available > 0) {
      const size = parseFloat(getComputedStyle(heading).fontSize);
      heading.style.fontSize = `${size * available / naturalWidth * .985}px`;
    }
  }
  let fitFrame;
  window.addEventListener('resize', () => {
    if (fitFrame) cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(fitMasthead);
  }, { passive: true });

  /* Heure locale à Toulouse, indépendante de celle de l’appareil. */
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dateFromISO = value => new Date(`${value}T12:00:00Z`);
  const fullDate = value => dateFormat.format(dateFromISO(value));
  const timeText = value => `${Math.floor(value / 60)}\u00a0h${value % 60 ? `\u00a0${String(value % 60).padStart(2, '0')}` : ''}`;
  function parisNow() {
    const p = {};
    parisFormat.formatToParts(new Date()).forEach(part => { p[part.type] = part.value; });
    return { iso: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }

  // Amplitude documentée : lundi–samedi 09:30–19:30 ; dimanche fermé.
  // Pas de durée de prestation : ces heures sont seulement des préférences d’essai.
  function possibleHours(iso) {
    const now = parisNow();
    if (!iso || iso < now.iso || dateFromISO(iso).getUTCDay() === 0) return [];
    const result = [];
    for (let minutes = 570; minutes < 1170; minutes += 30) {
      if (iso > now.iso || minutes > now.minutes) result.push(minutes);
    }
    return result;
  }

  const app = $('#booking-app');
  const form = $('#booking-form');
  const state = { step: 0, motif: '', day: '', hour: null, done: false };
  const headingIds = ['etape-motif', 'etape-jour', 'etape-heure', 'etape-verifier'];
  const announcements = ['Motif', 'Jour souhaité', 'Heure souhaitée', 'Vérification'];
  const announce = message => { $('#annonce').textContent = message; };

  function summary() {
    $('#selection-motif').textContent = state.motif || 'À choisir';
    $('#selection-jour').textContent = state.day ? fullDate(state.day) : 'À choisir';
    $('#selection-heure').textContent = state.hour !== null ? `${timeText(state.hour)} · exemple` : 'À choisir';
    $('#selection-mobile').textContent = [state.motif || 'Motif à choisir', state.day ? fullDate(state.day) : 'jour à choisir', state.hour !== null ? timeText(state.hour) : 'heure à choisir'].join(' · ');
    $('#selection-note').textContent = state.done ? 'Simulation terminée. Aucun rendez-vous réservé.' : 'Simulation uniquement. Aucun rendez-vous réservé.';
    $('#recap-final').textContent = state.motif && state.day && state.hour !== null
      ? `${state.motif} · ${fullDate(state.day)} à ${timeText(state.hour)} · 21 rue Sainte-Ursule, Toulouse. Exemple uniquement.`
      : '';
    $$('[data-step]').forEach(button => {
      const n = Number(button.dataset.step);
      button.disabled = state.done || (n >= 1 && !state.motif) || (n >= 2 && !state.day) || (n >= 3 && state.hour === null);
      if (n === state.step && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function clearError(name) { $(`#erreur-${name}`).textContent = ''; }
  function setError(name, message) {
    $(`#erreur-${name}`).textContent = message;
    announce(message);
  }

  function renderDays() {
    const today = parisNow().iso;
    const start = dateFromISO(today);
    const grid = $('#jours');
    grid.replaceChildren();
    for (let i = 0; i < 14; i++) {
      const date = new Date(start.getTime() + i * 86400000);
      const iso = date.toISOString().slice(0, 10);
      const sunday = date.getUTCDay() === 0;
      const elapsed = !sunday && possibleHours(iso).length === 0;
      const label = document.createElement('label');
      label.className = 'day-choice';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = iso;
      radio.checked = state.day === iso; radio.disabled = sunday || elapsed;
      radio.setAttribute('aria-describedby', 'erreur-jour');
      const reason = sunday ? 'fermé' : elapsed ? 'journée passée' : 'exemple';
      radio.setAttribute('aria-label', `${dateFormat.format(date)}, ${reason}`);
      const weekday = document.createElement('small'); weekday.textContent = weekdayFormat.format(date);
      const day = document.createElement('strong'); day.textContent = date.getUTCDate();
      const month = document.createElement('small'); month.textContent = monthFormat.format(date);
      const note = document.createElement('span'); note.textContent = sunday ? 'fermé' : elapsed ? 'passé' : i === 0 ? 'auj.' : 'exemple';
      label.append(radio, weekday, day, month, note); grid.append(label);
    }
  }

  function renderHours() {
    const grid = $('#heures');
    grid.replaceChildren();
    $('#heure-jour').textContent = state.day ? `Pour le ${fullDate(state.day)}.` : '';
    const hours = possibleHours(state.day);
    if (!hours.includes(state.hour)) state.hour = null;
    hours.forEach(minutes => {
      const label = document.createElement('label'); label.className = 'slot-choice';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'heure';
      radio.value = String(minutes); radio.checked = state.hour === minutes;
      radio.setAttribute('aria-label', `${timeText(minutes)}, exemple d’heure souhaitée`);
      radio.setAttribute('aria-describedby', 'erreur-heure');
      const text = document.createElement('span'); text.textContent = timeText(minutes);
      label.append(radio, text); grid.append(label);
    });
    if (hours.length === 0) {
      const message = document.createElement('p');
      message.textContent = 'Cette journée ne propose plus d’heures d’essai. Revenez au choix du jour.';
      grid.append(message);
    }
  }

  function animatePanel(panel) {
    if (stepAnimation) stepAnimation.cancel();
    if (!keyboard && !reduced.matches && typeof panel.animate === 'function') {
      stepAnimation = panel.animate([
        { opacity: 0, transform: 'translateX(10px)' },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: ease });
    }
  }

  function goToStep(index, push = true, focus = true) {
    if (state.done) return;
    if (!state.motif && index > 0) index = 0;
    else if (!state.day && index > 1) index = 1;
    else if (state.hour === null && index > 2) index = 2;
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderHours();
    $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== index; });
    summary();
    if (push) history.pushState({ ...history.state, yjStep: index }, '');
    const panel = $(`[data-panel="${index}"]`);
    animatePanel(panel);
    if (focus) $(`#${headingIds[index]}`).focus({ preventScroll: false });
    announce(`Étape ${index + 1} sur 4 : ${announcements[index]}. Simulation, rien n’est envoyé.`);
  }

  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'motif') { state.motif = input.value; clearError('motif'); }
    if (input.name === 'jour') {
      if (state.day !== input.value) state.hour = null;
      state.day = input.value; clearError('jour'); clearError('heure');
    }
    if (input.name === 'heure') { state.hour = Number(input.value); clearError('heure'); }
    summary();
  });

  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.next);
    if (step === 0 && !state.motif) {
      setError('motif', 'Choisissez l’activité pour continuer.');
      $('input[name="motif"]').focus(); return;
    }
    if (step === 1 && (!state.day || possibleHours(state.day).length === 0)) {
      setError('jour', 'Choisissez un jour proposé dans la simulation.');
      renderDays(); $('input[name="jour"]:not(:disabled)')?.focus(); return;
    }
    if (step === 2 && (state.hour === null || !possibleHours(state.day).includes(state.hour))) {
      state.hour = null; renderHours(); summary();
      setError('heure', 'Choisissez une heure d’exemple encore proposée.');
      $('input[name="heure"]')?.focus(); return;
    }
    goToStep(step + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.back))));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => goToStep(Number(button.dataset.step))));

  window.addEventListener('popstate', event => {
    if (Number.isInteger(event.state?.yjStep)) {
      if (state.done) {
        state.done = false;
        $('#resultat').hidden = true; form.hidden = false;
      }
      goToStep(event.state.yjStep, false);
    }
  });

  $('[data-choose-service]').addEventListener('click', () => {
    if (state.done) reset();
    state.motif = 'Coiffure hommes';
    $('input[name="motif"]').checked = true;
    clearError('motif');
    goToStep(1, true, false);
  });

  function validateField(id, valid, message) {
    const input = $(`#${id}`);
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    $(`#erreur-${id}`).textContent = valid ? '' : message;
    return valid;
  }
  ['prenom', 'telephone'].forEach(id => $(`#${id}`).addEventListener('input', () => {
    $(`#${id}`).removeAttribute('aria-invalid'); clearError(id);
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!state.motif || !state.day || !possibleHours(state.day).includes(state.hour)) {
      state.hour = null; goToStep(state.day ? 2 : 1);
      setError('heure', 'Le choix d’heure a expiré. Choisissez une nouvelle heure d’exemple.'); return;
    }
    const firstName = $('#prenom').value.trim();
    const phone = $('#telephone').value.replace(/[\s.()\-]/g, '');
    const nameValid = validateField('prenom', firstName.length > 0, 'Saisissez un prénom d’essai.');
    const phoneValid = validateField('telephone', /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone), 'Saisissez un numéro français d’essai valide.');
    if (!nameValid || !phoneValid) {
      announce('Vérifiez les champs indiqués avant de terminer la simulation.');
      $(`#${nameValid ? 'telephone' : 'prenom'}`).focus(); return;
    }
    state.done = true;
    summary();
    form.hidden = true;
    const result = $('#resultat'); result.hidden = false;
    $('#resultat-recap').textContent = `${firstName}, votre exemple : ${state.motif.toLowerCase()}, le ${fullDate(state.day)} à ${timeText(state.hour)}.`;
    animatePanel(result);
    $('#resultat-titre').focus();
    announce('Simulation terminée. Rien n’a été envoyé. Aucun rendez-vous n’est réservé.');
    // Les coordonnées ne servent qu’à l’essai ; effacement des champs après validation.
    $('#prenom').value = ''; $('#telephone').value = '';
  });

  function reset() {
    state.motif = ''; state.day = ''; state.hour = null; state.done = false;
    form.reset(); form.hidden = false; $('#resultat').hidden = true;
    $('#resultat-recap').textContent = '';
    $$('.field-error').forEach(error => { error.textContent = ''; });
    $$('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    goToStep(0);
  }
  $('#recommencer').addEventListener('click', reset);

  $('#copier-adresse').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('21 rue Sainte-Ursule, 31000 Toulouse');
      $('#copie-statut').textContent = 'Adresse copiée.';
    } catch {
      $('#copie-statut').textContent = 'Copie indisponible. Adresse : 21 rue Sainte-Ursule, 31000 Toulouse.';
    }
  });

  /* Initialisation avant de cacher les seules illustrations à révéler. */
  renderDays(); summary(); app.hidden = false;
  history.replaceState({ ...history.state, yjStep: 0 }, '');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observer.observe(element));
    root.classList.add('js');
  }
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    fitMasthead();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  };
  if (document.fonts?.ready) document.fonts.ready.then(() => { fitMasthead(); enter(); });
  setTimeout(enter, 450);
  reduced.addEventListener('change', () => { if (reduced.matches && stepAnimation) stepAnimation.cancel(); });
})();
