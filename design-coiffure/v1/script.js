(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const names = { coupe: 'Coupe', coloration: 'Coloration', meches: 'Mèches' };
  // Sources : Cylex et Bottin.fr, recherche du 03/11/2026. Durées inconnues.
  const hours = { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const state = { step: 0, service: '', day: '', time: null, finished: false };
  const stage = $('#booking-stage');
  const panels = $$('[data-panel]');
  const navButtons = $$('[data-step]');
  const announcement = $('#booking-announcement');
  let transitionTimer;
  let transitionFrame;

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) root.classList.add('keyboard-navigation');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-navigation'), { passive: true });

  const parisClock = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateLong = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function nowInParis() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function keyFromDate(date) { return date.toISOString().slice(0, 10); }
  function formatTime(minutes) {
    const rest = minutes % 60;
    return `${Math.floor(minutes / 60)}\u00a0h${rest ? `\u00a0${String(rest).padStart(2, '0')}` : ''}`;
  }
  function holiday(key) {
    const date = dateFromKey(key);
    const year = date.getUTCFullYear();
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5))) return true;
    // Calcul grégorien de Pâques ; les jours fériés n’impliquent aucune ouverture.
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    const easter = new Date(Date.UTC(year, Math.floor(n / 31) - 1, n % 31 + 1, 12));
    return [1, 39, 50].some(offset => {
      const day = new Date(easter);
      day.setUTCDate(day.getUTCDate() + offset);
      return keyFromDate(day) === key;
    });
  }
  function possibleTimes(key, clock = nowInParis()) {
    if (!key || key < clock.key) return [];
    const range = hours[dateFromKey(key).getUTCDay()];
    if (!range) return [];
    const result = [];
    // Heures de départ souhaitées seulement : aucune durée de prestation supposée.
    for (let minute = range[0]; minute < range[1]; minute += 60) {
      if (key !== clock.key || minute > clock.minutes) result.push(minute);
    }
    return result;
  }
  function say(message) { announcement.textContent = message; }
  function makeChoice(group, value, text, disabled, ariaLabel) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio'; input.name = group; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', ariaLabel);
    const span = document.createElement('span');
    span.innerHTML = text;
    label.append(input, span);
    return label;
  }
  function renderDays() {
    const clock = nowInParis();
    const container = $('#days');
    $$('label', container).forEach(element => element.remove());
    for (let offset = 0; offset < 14; offset++) {
      const date = dateFromKey(clock.key);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = keyFromDate(date);
      const closed = !hours[date.getUTCDay()];
      const over = !closed && possibleTimes(key, clock).length === 0;
      const isHoliday = holiday(key);
      const note = closed ? 'Fermé' : over ? 'Jour terminé' : isHoliday ? 'Férié, à confirmer' : offset === 0 ? 'Aujourd’hui' : monthShort.format(date);
      const choice = makeChoice('jour', key, `<span>${dateShort.format(date)}</span><b>${date.getUTCDate()}</b><small>${note}</small>`, closed || over, `${dateLong.format(date)}, ${closed ? 'fermé' : over ? 'jour terminé' : isHoliday ? 'jour férié, ouverture à confirmer' : 'jour souhaité'}`);
      $('input', choice).checked = state.day === key && !closed && !over;
      container.append(choice);
    }
    if (state.day && !$('input:checked', container)) { state.day = ''; state.time = null; }
  }
  function renderSlots() {
    const container = $('#slots');
    $$('label', container).forEach(element => element.remove());
    const times = possibleTimes(state.day);
    if (!times.includes(state.time)) state.time = null;
    times.forEach(time => {
      const text = formatTime(time);
      const choice = makeChoice('heure', String(time), text, false, `${text}, heure souhaitée`);
      $('input', choice).checked = state.time === time;
      container.append(choice);
    });
    $('#empty-slots').hidden = times.length !== 0;
    $('#slot-note').textContent = state.day ? `${dateLong.format(dateFromKey(state.day))}${holiday(state.day) ? ' · jour férié, ouverture à confirmer' : ''}. Heure souhaitée uniquement. Durée et disponibilité à fixer avec le salon.` : 'Choisissez d’abord un jour.';
  }
  function update() {
    $('#summary-service').textContent = names[state.service] || 'À choisir';
    $('#summary-day').textContent = state.day ? dateLong.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    const mobileParts = [names[state.service], state.day ? dateLong.format(dateFromKey(state.day)) : '', state.time !== null ? formatTime(state.time) : ''].filter(Boolean);
    $('#mobile-summary').textContent = mobileParts.length ? mobileParts.join(' · ') : 'Choisissez une prestation.';
    const valid = [Boolean(state.service), Boolean(state.day), state.time !== null];
    panels.forEach((panel, index) => {
      const next = $('[data-next]', panel);
      if (next) next.disabled = !valid[index];
    });
    navButtons.forEach((button, index) => {
      button.disabled = state.finished || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null);
      if (index === state.step && !state.finished) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    if (state.service && state.day && state.time !== null) $('#final-recap').textContent = `Votre souhait\u00a0: ${names[state.service]}, ${dateLong.format(dateFromKey(state.day))} à ${formatTime(state.time)}. Tarif, durée et rendez-vous à confirmer par téléphone.`;
  }
  function focusTitle(title) {
    title.focus({ preventScroll: true });
    const rect = title.getBoundingClientRect();
    const summary = $('.mobile-selection');
    const topClearance = summary.getClientRects().length ? summary.getBoundingClientRect().height + 20 : 24;
    if (rect.top < topClearance || rect.bottom > window.innerHeight - 100) {
      window.scrollBy({ top: rect.top - topClearance, behavior: 'instant' });
    }
  }
  function showStep(step, focus = true) {
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    if (step > 0 && !state.service) step = 0;
    if (step > 1 && !state.day) step = 1;
    if (step > 2 && state.time === null) step = 2;
    state.step = step;
    clearTimeout(transitionTimer);
    cancelAnimationFrame(transitionFrame);
    const immediate = reduced.matches || root.classList.contains('keyboard-navigation') || !focus;
    stage.classList.toggle('keyboard', immediate);
    const commit = () => {
      panels.forEach((panel, index) => { panel.hidden = index !== step; });
      $('#success').hidden = true;
      update();
      transitionFrame = requestAnimationFrame(() => stage.classList.remove('switching'));
      if (focus) focusTitle($('h3', panels[step]));
      say(`Étape ${step + 1} sur 4\u00a0: ${$('h3', panels[step]).textContent}`);
    };
    if (immediate) { stage.classList.remove('switching'); commit(); }
    else { stage.classList.add('switching'); transitionTimer = setTimeout(commit, 120); }
  }
  function chooseService(service) {
    if (!names[service]) return;
    state.service = service;
    state.finished = false;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === service; });
    update();
  }
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => {
    chooseService(input.value);
    say(`Prestation souhaitée\u00a0: ${names[input.value]}. Choisissez ensuite un jour.`);
  }));
  $('#days').addEventListener('change', event => {
    if (event.target.name !== 'jour') return;
    state.day = event.target.value; state.time = null;
    update();
    say(`Jour souhaité\u00a0: ${dateLong.format(dateFromKey(state.day))}.`);
  });
  $('#slots').addEventListener('change', event => {
    if (event.target.name !== 'heure') return;
    state.time = Number(event.target.value);
    update();
    say(`Heure souhaitée\u00a0: ${formatTime(state.time)}.`);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => showStep(state.step + 1)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(state.step - 1)));
  navButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    chooseService(link.dataset.service);
    showStep(1, false);
  }));
  function errorFor(input, message) {
    $(`#${input.id}-error`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  const form = $('#contact-form');
  const firstName = $('#prenom');
  const telephone = $('#telephone');
  [firstName, telephone].forEach(input => input.addEventListener('input', () => errorFor(input, '')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!state.service || !state.day || !possibleTimes(state.day).includes(state.time)) {
      state.time = null;
      showStep(state.day ? 2 : 1);
      say('Cette heure est passée. Choisissez un autre jour ou une autre heure souhaitée.');
      return;
    }
    const nameValid = firstName.value.trim().length >= 1;
    const phone = telephone.value.replace(/[\s.()\-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone);
    errorFor(firstName, nameValid ? '' : 'Indiquez un prénom pour terminer cet essai.');
    errorFor(telephone, phoneValid ? '' : 'Indiquez un numéro français à 10 chiffres ou au format +33.');
    if (!nameValid || !phoneValid) {
      (nameValid ? telephone : firstName).focus();
      say('Vérifiez les coordonnées indiquées. Aucun renseignement n’est envoyé.');
      return;
    }
    state.finished = true;
    $('#success-recap').textContent = `Vous avez essayé le parcours pour une prestation «\u00a0${names[state.service]}\u00a0», le ${dateLong.format(dateFromKey(state.day))} à ${formatTime(state.time)}. Ce souhait reste à confirmer avec le salon.`;
    form.reset();
    [firstName, telephone].forEach(input => errorFor(input, ''));
    clearTimeout(transitionTimer);
    const commit = () => {
      panels.forEach(panel => { panel.hidden = true; });
      $('#success').hidden = false;
      update();
      stage.classList.remove('switching');
      focusTitle($('#success-title'));
      say('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée. Les coordonnées ont été effacées.');
    };
    if (reduced.matches || root.classList.contains('keyboard-navigation')) commit();
    else { stage.classList.add('switching'); transitionTimer = setTimeout(commit, 120); }
  });
  $('#restart').addEventListener('click', () => {
    state.service = ''; state.day = ''; state.time = null; state.finished = false;
    $$('input[name="prestation"]').forEach(input => { input.checked = false; });
    form.reset();
    showStep(0);
  });
  $('#booking-app').hidden = false;
  update();

  // Le fil de lecture suit le document ; aucun défilement n’est intercepté.
  const progress = $('#reading-progress');
  let scrollFrame = 0;
  let scrollRange = 1;
  function drawProgress() {
    scrollFrame = 0;
    if (!reduced.matches) progress.style.transform = `scaleY(${Math.min(1, Math.max(0, window.scrollY / scrollRange))})`;
  }
  function queueProgress() { if (!scrollFrame) scrollFrame = requestAnimationFrame(drawProgress); }
  function measure() { scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); queueProgress(); }
  window.addEventListener('scroll', queueProgress, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  measure();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -30px 0px' });
    $$('[data-reveal], [data-lines]').forEach(element => observer.observe(element));
    root.classList.add('motion-ready');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));
  }
})();
