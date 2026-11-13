(() => {
  'use strict';

  // Horaires des fiches Fresha et iCoiffeur ; divergence documentée dans SOURCES.md.
  // La cadence ci-dessous sert à choisir une heure, jamais à inventer une durée.
  const OPEN = 9 * 60 + 15;
  const CLOSE = 18 * 60;
  const NBSP = '\u00a0';
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function parisTime(now = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(now).map(p => [p.type, p.value]));
    return {
      date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)),
      minute: +parts.hour * 60 + +parts.minute
    };
  }
  function key(date) { return date.toISOString().slice(0, 10); }
  function isOpen(date) { return ![0, 1].includes(date.getUTCDay()); }
  function formatTime(minute) {
    const h = Math.floor(minute / 60), m = minute % 60;
    return `${h}${NBSP}h${m ? NBSP + String(m).padStart(2, '0') : ''}`;
  }
  function slotsFor(date, now = new Date()) {
    if (!isOpen(date)) return [];
    const current = parisTime(now);
    if (key(date) < key(current.date)) return [];
    const slots = [];
    for (let minute = OPEN; minute < CLOSE; minute += 30) {
      slots.push({ minute, past: key(date) === key(current.date) && minute <= current.minute });
    }
    return slots;
  }
  function daysFrom(now = new Date()) {
    const { date } = parisTime(now);
    return Array.from({ length: 14 }, (_, i) => {
      const day = new Date(date.getTime() + i * 86400000);
      return { date: day, key: key(day), closed: !isOpen(day), finished: isOpen(day) && !slotsFor(day, now).some(s => !s.past) };
    });
  }
  function validPhone(value) {
    const clean = value.replace(/[\s().-]/g, '');
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(clean);
  }

  // Fonctions pures accessibles au contrôle local, sans dépendance ni navigateur.
  if (typeof module !== 'undefined' && module.exports) module.exports = { parisTime, isOpen, slotsFor, daysFrom, formatTime, validPhone };
  if (typeof document === 'undefined') return;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  // Les informations restent lisibles si les observateurs ou le script échouent.
  try {
    if ('IntersectionObserver' in window && !reduced.matches) {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: .12 });
      $$('[data-reveal]').forEach(el => revealObserver.observe(el));
      root.classList.add('js');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
      setTimeout(() => root.classList.add('entered'), 1000);
    }
  } catch {
    root.classList.remove('js');
  }

  const services = $$('[data-service]').map(link => ({
    id: link.dataset.service,
    name: $('h3', link.closest('.service-row')).textContent.trim()
  }));
  const state = { service: '', day: '', time: null, step: 0, finished: false };
  let renderedDay = '';
  let keyboard = false;
  let transitionTimer;
  const panels = $$('[data-panel]');
  const form = $('#simulation');
  const workspace = $('.booking-workspace');
  const announce = $('#annonce');

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' '].includes(event.key)) { keyboard = true; root.classList.add('keyboard'); }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  function makeChoice({ name, value, text, disabled = false, className = '', describedBy = '' }) {
    const label = document.createElement('label');
    label.className = `choice ${className}`;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    if (describedBy) input.setAttribute('aria-describedby', describedBy);
    const content = document.createElement('span');
    content.textContent = text;
    label.append(input, content);
    return label;
  }

  function renderServices() {
    const container = $('#choix-prestations');
    services.forEach(service => container.append(makeChoice({ name: 'prestation', value: service.id, text: service.name, describedBy: 'erreur-prestation' })));
  }

  function renderDays() {
    const container = $('#choix-jours');
    container.replaceChildren();
    daysFrom().forEach(day => {
      const label = makeChoice({ name: 'jour', value: day.key, text: '', disabled: day.closed || day.finished, className: 'day-choice', describedBy: 'erreur-jour' });
      const input = $('input', label);
      input.checked = state.day === day.key;
      const content = $('span', label);
      content.remove();
      const dayName = document.createElement('span'); dayName.className = 'day-name'; dayName.textContent = dayFormat.format(day.date);
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = day.date.getUTCDate();
      const month = document.createElement('span'); month.className = 'choice-status';
      month.textContent = day.closed ? 'Fermé' : day.finished ? 'Passé' : monthFormat.format(day.date);
      input.setAttribute('aria-label', `${longFormat.format(day.date)}${day.closed ? ', fermé' : day.finished ? ', passé' : ''}`);
      label.append(dayName, number, month);
      container.append(label);
    });
  }

  function selectedDate() { return state.day ? new Date(`${state.day}T12:00:00Z`) : null; }
  function selectedService() { return services.find(service => service.id === state.service); }

  function renderTimes() {
    const container = $('#choix-heures');
    container.replaceChildren();
    renderedDay = state.day;
    if (!state.day) return;
    slotsFor(selectedDate()).forEach(slot => {
      const label = makeChoice({ name: 'heure', value: String(slot.minute), text: formatTime(slot.minute), disabled: slot.past, className: 'time-choice', describedBy: 'erreur-heure' });
      $('input', label).checked = state.time === slot.minute;
      if (slot.past) {
        const status = document.createElement('span'); status.className = 'choice-status'; status.textContent = 'Passé'; label.append(status);
      }
      container.append(label);
    });
  }

  function selectionText() {
    return `${selectedService()?.name || 'Prestation à choisir'} · ${state.day ? longFormat.format(selectedDate()) : 'jour à choisir'} · ${state.time !== null ? formatTime(state.time) : 'heure à choisir'}`;
  }

  function updateSummary() {
    $('[data-summary="service"]').textContent = selectedService()?.name || 'À choisir';
    $('[data-summary="day"]').textContent = state.day ? longFormat.format(selectedDate()) : 'À choisir';
    $('[data-summary="time"]').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    $('#recapitulatif').textContent = `Votre simulation au 236 boulevard du Redon : ${selectionText()}.`;
    $$('[data-step]').forEach(button => {
      const step = +button.dataset.step;
      button.disabled = state.finished || (step > 0 && !state.service) || (step > 1 && !state.day) || (step > 2 && state.time === null);
      if (!state.finished && step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === state.service; });
  }

  function focusVisible(target) {
    target.focus({ preventScroll: true });
    const rect = target.getBoundingClientRect();
    const viewport = window.visualViewport?.height || window.innerHeight;
    if (rect.top < 24 || rect.bottom > viewport - 24) {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }

  function transitionTo(target, focus = true) {
    clearTimeout(transitionTimer);
    const outgoing = panels.find(panel => !panel.hidden && !panel.classList.contains('is-leaving'));
    panels.forEach(panel => {
      panel.classList.remove('is-entering', 'is-leaving');
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      if (panel !== outgoing && panel !== target) panel.hidden = true;
    });
    const animate = !keyboard && !reduced.matches && target !== outgoing;
    if (outgoing && outgoing !== target) {
      if (animate) {
        outgoing.classList.add('is-leaving');
        outgoing.inert = true;
        outgoing.setAttribute('aria-hidden', 'true');
      } else outgoing.hidden = true;
    }
    target.hidden = false;
    if (animate) {
      target.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => target.classList.remove('is-entering')));
      transitionTimer = setTimeout(() => {
        if (outgoing && outgoing !== target) {
          outgoing.hidden = true; outgoing.inert = false; outgoing.classList.remove('is-leaving'); outgoing.removeAttribute('aria-hidden');
        }
      }, 220);
    }
    if (focus) focusVisible($('h3', target));
  }

  function freshDay() {
    return daysFrom().some(day => day.key === state.day && !day.closed && !day.finished);
  }

  function showStep(step, focus = true) {
    if (state.finished || (step > 0 && !state.service) || (step > 1 && !state.day) || (step > 2 && state.time === null)) return;
    const expired = step > 1 && !freshDay();
    if (expired) { state.day = ''; state.time = null; step = 1; }
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    transitionTo(panels[step], focus);
    updateSummary();
    announce.textContent = `Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][step]}. Simulation uniquement.`;
    if (expired) error('erreur-jour', 'Ce jour n’a plus d’heure à venir. Choisissez un autre jour.');
  }

  function error(id, text) { $(`#${id}`).textContent = text; }
  function freshTime() {
    if (!state.day || state.time === null) return false;
    return slotsFor(selectedDate()).some(slot => slot.minute === state.time && !slot.past);
  }

  workspace.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') { state.service = input.value; error('erreur-prestation', ''); }
    if (input.name === 'jour') {
      if (state.day !== input.value) { state.time = null; renderedDay = ''; }
      state.day = input.value; error('erreur-jour', ''); error('erreur-heure', '');
    }
    if (input.name === 'heure' && renderedDay === state.day) { state.time = +input.value; error('erreur-heure', ''); }
    updateSummary();
  });

  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const step = +button.dataset.next;
    if (step === 0 && !state.service) {
      error('erreur-prestation', 'Choisissez une prestation pour continuer.'); $('input[name="prestation"]').focus(); return;
    }
    if (step === 1 && !state.day) {
      error('erreur-jour', 'Choisissez un jour pour continuer.'); $('input[name="jour"]:not(:disabled)').focus(); return;
    }
    if (step === 2 && !freshTime()) {
      state.time = null; renderTimes(); updateSummary();
      error('erreur-heure', 'Choisissez une heure à venir pour continuer.'); $('input[name="heure"]:not(:disabled)')?.focus(); return;
    }
    showStep(step + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.back)));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(+button.dataset.step)));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.finished) reset(false);
    state.service = link.dataset.service;
    showStep(0, false); updateSummary();
    requestAnimationFrame(() => $('input[name="prestation"]:checked').focus({ preventScroll: true }));
    announce.textContent = `${selectedService().name}, sélectionnée pour la simulation.`;
  }));

  const firstName = $('#prenom'), phone = $('#telephone');
  [firstName, phone].forEach(input => input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid'); error(`erreur-${input.id}`, '');
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3 || state.finished) return;
    let firstInvalid = null;
    [[firstName, firstName.value.trim().length >= 2, 'Saisissez un prénom fictif d’au moins deux caractères.'],
      [phone, validPhone(phone.value), 'Saisissez un numéro fictif au format français, avec 10 chiffres ou +33.']].forEach(([input, valid, message]) => {
      error(`erreur-${input.id}`, valid ? '' : message);
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    if (!freshDay()) {
      state.day = ''; state.time = null; updateSummary(); showStep(1);
      error('erreur-jour', 'Ce jour n’a plus d’heure à venir. Choisissez un autre jour.'); return;
    }
    if (!freshTime()) {
      state.time = null; updateSummary(); showStep(2);
      error('erreur-heure', 'Cette heure est passée. Choisissez une autre heure de démonstration.'); return;
    }
    state.finished = true;
    $('#resultat-recap').textContent = `Votre essai : ${selectionText()}, au 236 boulevard du Redon, Marseille.`;
    clearTimeout(transitionTimer);
    panels.forEach(panel => { panel.hidden = true; panel.classList.remove('is-leaving', 'is-entering'); panel.inert = false; });
    form.hidden = true;
    $('#resultat').hidden = false;
    focusVisible($('#titre-resultat'));
    // Les données saisies sont effacées dès que la démonstration est terminée.
    firstName.value = ''; phone.value = '';
    updateSummary();
    announce.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris. Aucune donnée envoyée ni conservée.';
  });

  function reset(focus = true) {
    clearTimeout(transitionTimer);
    Object.assign(state, { service: '', day: '', time: null, step: 0, finished: false });
    renderedDay = '';
    form.reset(); form.hidden = false;
    $('#resultat').hidden = true;
    $$('.error').forEach(el => { el.textContent = ''; });
    $$('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    panels.forEach((panel, index) => { panel.hidden = index !== 0; panel.inert = false; panel.removeAttribute('aria-hidden'); panel.classList.remove('is-leaving', 'is-entering'); });
    updateSummary();
    if (focus) focusVisible($('#etape-prestation'));
    announce.textContent = 'Nouvelle simulation. Choisissez une prestation.';
  }
  $('#recommencer').addEventListener('click', () => reset());

  renderServices(); renderDays(); updateSummary();
  workspace.hidden = false;

  // Les heures et les jours sont revérifiés après un changement d’onglet.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.finished) return;
    if (state.day && !daysFrom().some(day => day.key === state.day && !day.closed && !day.finished)) { state.day = ''; state.time = null; if (state.step > 1) showStep(1); }
    if (state.time !== null && !freshTime()) state.time = null;
    if (state.step === 1) renderDays();
    if (state.step === 2) renderTimes();
    updateSummary();
  });

  const mobileBar = $('.mobile-actions');
  if ('IntersectionObserver' in window) {
    const visible = { heroPassed: false, booking: false, footer: false };
    const targets = new Map([[$('[data-hero-call]'), 'hero'], [$('#rendez-vous'), 'booking'], [$('footer'), 'footer']]);
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const kind = targets.get(entry.target);
        if (kind === 'hero') visible.heroPassed = entry.boundingClientRect.bottom <= 0;
        else visible[kind] = entry.isIntersecting;
      });
      mobileBar.hidden = !visible.heroPassed || visible.booking || visible.footer;
    }, { threshold: 0 });
    targets.forEach((_, target) => barObserver.observe(target));
  }
})();
