/* Aperçu local : aucune requête, aucun stockage, aucune transmission. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), { passive: true });

  /* Une seule apparition, des gestes différents selon le contenu. */
  $$('.ink-lines i').forEach((line, index) => { line.style.transitionDelay = `${index * 35}ms`; });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seen');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('.reveal-text, .reveal-quote, .menu-row').forEach(element => observer.observe(element));
  } else {
    $$('.reveal-text, .reveal-quote, .menu-row').forEach(element => element.classList.add('seen'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => $('.hero').classList.add('seen')));
  reduced.addEventListener('change', event => {
    if (event.matches) $$('.reveal-text, .reveal-quote, .menu-row').forEach(element => element.classList.add('seen'));
  });

  // Services et durées : tableau Planity conservé dans la recherche fournie.
  const services = [
    { id: 'coupe-barbe', name: 'Coupe + entretien de la barbe', duration: 45 },
    { id: 'tondeuse', name: 'Tondeuse cheveux', duration: 30 },
    { id: 'entretien-barbe', name: 'Entretien barbe sans rasage', duration: 30 },
    { id: 'barbe-courte', name: 'Barbe courte avec rasage', duration: 45 },
    { id: 'barbe-longue', name: 'Barbe longue avec rasage', duration: 45 },
    { id: 'moustache', name: 'Taille de moustache', duration: 30 }
  ];
  // Minutes depuis minuit, horaire Planity et iCoiffeur. Jamais de créneau hors de ces plages.
  const hours = { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 960] };
  const state = { step: 0, service: null, date: '', time: null };
  const form = $('#reservation');
  const steps = $$('.steps button');
  const panels = $$('.booking-panel');
  const nb = '\u00a0';
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function nowParis() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const utcDate = key => new Date(`${key}T12:00:00Z`);
  const keyOf = date => date.toISOString().slice(0, 10);
  const timeText = minutes => `${Math.floor(minutes / 60)}${nb}h${minutes % 60 ? nb + String(minutes % 60).padStart(2, '0') : ''}`;

  function easter(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    return new Date(Date.UTC(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12));
  }
  function isHoliday(key) {
    const year = Number(key.slice(0, 4));
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key.slice(5))) return true;
    const base = easter(year);
    return [1, 39, 50].some(offset => {
      const date = new Date(base);
      date.setUTCDate(date.getUTCDate() + offset);
      return keyOf(date) === key;
    });
  }
  function slotsFor(key, duration) {
    const dayHours = hours[utcDate(key).getUTCDay()];
    const now = nowParis();
    if (!dayHours || isHoliday(key) || key < now.date) return [];
    const slots = [];
    for (let minutes = dayHours[0]; minutes + duration <= dayHours[1]; minutes += 30) {
      const past = key === now.date && minutes <= now.minutes;
      const occupied = (Math.floor(utcDate(key).getTime() / 86400000) + minutes / 30) % 5 === 0;
      slots.push({ minutes, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Indisponible' : '' });
    }
    return slots;
  }
  function announce(text) { $('#annonce').textContent = text; }
  function focusVisible(element) {
    element.focus({ preventScroll: true });
    const bounds = element.getBoundingClientRect();
    const bottomInset = matchMedia('(max-width: 760px)').matches ? 100 : 24;
    if (bounds.top < 24 || bounds.bottom > innerHeight - bottomInset) {
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }
  function option(name, value, text, detail, disabled = false, checked = false) {
    const label = document.createElement('label');
    label.className = 'option';
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = name; radio.value = value;
    radio.disabled = disabled; radio.checked = checked;
    const content = document.createElement('span');
    const title = document.createElement('span');
    title.textContent = text;
    if (name === 'heure') title.className = 'slot-hour';
    content.append(title);
    if (detail) { const small = document.createElement('small'); small.textContent = detail; content.append(small); }
    label.append(radio, content);
    return label;
  }
  services.forEach(service => $('#services-options').append(option('prestation', service.id, service.name, `${service.duration}${nb}min`)));
  function renderDays() {
    const box = $('#jours-options');
    $$('label', box).forEach(element => element.remove());
    const today = utcDate(nowParis().date);
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(today); date.setUTCDate(today.getUTCDate() + offset);
      const key = keyOf(date);
      const closed = !hours[date.getUTCDay()];
      const holiday = isHoliday(key);
      const available = !closed && !holiday && slotsFor(key, state.service.duration).some(slot => !slot.disabled);
      const detail = closed ? 'Fermé' : holiday ? 'Férié · à confirmer' : !available ? 'Indisponible' : 'Simulation';
      const label = option('jour', key, `${shortDay.format(date)} ${shortMonth.format(date)}`, detail, !available, state.date === key);
      $('input', label).setAttribute('aria-label', `${dateFormat.format(date)} · ${detail}`);
      box.append(label);
    }
  }
  function renderTimes() {
    const box = $('#heures-options');
    $$('label, .empty-slots', box).forEach(element => element.remove());
    const slots = slotsFor(state.date, state.service.duration);
    if (state.time !== null && !slots.some(slot => slot.minutes === state.time && !slot.disabled)) state.time = null;
    if (!slots.some(slot => !slot.disabled)) {
      state.time = null;
      const message = document.createElement('p'); message.className = 'empty-slots';
      message.textContent = 'Aucun créneau pour cette journée. Revenez à l’étape Jour pour en choisir une autre.';
      box.append(message);
    }
    slots.forEach(slot => box.append(option('heure', String(slot.minutes), timeText(slot.minutes), slot.reason || 'Simulation', slot.disabled, state.time === slot.minutes && !slot.disabled)));
  }
  function updateSummary() {
    $('#selection-prestation').textContent = state.service ? state.service.name : 'Une prestation à choisir.';
    $('#selection-jour').textContent = state.date ? dateFormat.format(utcDate(state.date)) : 'Jour à choisir';
    $('#selection-heure').textContent = state.time !== null ? timeText(state.time) : 'Heure à choisir';
    steps.forEach((button, index) => {
      button.disabled = index === 1 ? !state.service : index === 2 ? !state.date : index === 3 ? state.time === null : false;
      if (index === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function go(step, focus = true) {
    if (step > 0 && !state.service || step > 1 && !state.date || step > 2 && state.time === null) return;
    if (step === 3 && !slotsFor(state.date, state.service.duration).some(slot => slot.minutes === state.time && !slot.disabled)) {
      state.time = null;
      go(2, focus);
      $('#erreur-heure').textContent = 'Ce créneau est passé. Choisissez une autre heure.';
      return;
    }
    const previous = state.step;
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    panels.forEach((panel, index) => {
      panel.classList.remove('entering', 'backwards');
      panel.hidden = index !== step;
    });
    const panel = panels[step];
    if (!reduced.matches && !root.classList.contains('keyboard')) {
      panel.classList.add('entering');
      panel.classList.toggle('backwards', step < previous);
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
    }
    updateSummary();
    if (focus) focusVisible($('h3', panel));
    announce(`Étape ${step + 1} sur 4${nb}: ${$('h3', panel).textContent}`);
  }
  const errorNames = ['prestation', 'jour', 'heure'];
  function clearChoiceError(index) { $(`#erreur-${errorNames[index]}`).textContent = ''; }
  form.addEventListener('change', event => {
    const target = event.target;
    if (target.name === 'prestation') {
      const service = services.find(item => item.id === target.value);
      if (!service) return;
      state.service = service; state.date = ''; state.time = null;
      clearChoiceError(0);
    } else if (target.name === 'jour') {
      state.date = target.value; state.time = null; clearChoiceError(1);
    } else if (target.name === 'heure') {
      state.time = Number(target.value); clearChoiceError(2);
    }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    const value = next === 1 ? state.service : next === 2 ? state.date : state.time;
    if (value === null || value === '') {
      const messages = ['Choisissez une prestation pour continuer.', 'Choisissez un jour disponible pour continuer.', 'Choisissez une heure disponible pour continuer.'];
      $(`#erreur-${errorNames[next - 1]}`).textContent = messages[next - 1];
      const first = $('input:not(:disabled)', panels[next - 1]);
      if (first) focusVisible(first);
      return;
    }
    if (next === 3 && !slotsFor(state.date, state.service.duration).some(slot => slot.minutes === state.time && !slot.disabled)) {
      state.time = null; renderTimes(); updateSummary();
      $('#erreur-heure').textContent = 'Ce créneau est passé. Choisissez une autre heure.';
      return;
    }
    go(next);
  }));
  steps.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    reset(false);
    const input = $(`input[name="prestation"][value="${link.dataset.service}"]`);
    if (!input) return;
    input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    go(1);
  }));

  function validateField(input) {
    const value = input.value.trim();
    const valid = input.id === 'prenom' ? value.length > 0 : /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(value.replace(/[\s.()\-]/g, ''));
    const message = input.id === 'prenom' ? 'Indiquez votre prénom pour continuer.' : 'Indiquez un mobile français commençant par 06, 07 ou +33.';
    $(`#erreur-${input.id}`).textContent = valid ? '' : message;
    input.setAttribute('aria-invalid', String(!valid));
    return valid;
  }
  [$('#prenom'), $('#telephone')].forEach(input => {
    input.addEventListener('blur', () => { if (input.value) validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid'); $(`#erreur-${input.id}`).textContent = '';
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const fields = [$('#prenom'), $('#telephone')];
    const invalid = fields.filter(input => !validateField(input));
    if (invalid.length) { invalid[0].focus(); return; }
    const slotValid = state.service && state.date && state.time !== null && slotsFor(state.date, state.service.duration).some(slot => slot.minutes === state.time && !slot.disabled);
    if (!slotValid) {
      state.time = null; go(state.date ? 2 : state.service ? 1 : 0);
      announce('Choisissez un créneau encore disponible dans la simulation.');
      return;
    }
    $('#recapitulatif').textContent = `${$('#prenom').value.trim()}, votre sélection pour cette simulation${nb}: ${state.service.name}, le ${dateFormat.format(utcDate(state.date))} à ${timeText(state.time)} (${state.service.duration}${nb}min).`;
    $('.booking-body').hidden = true;
    $('.steps').hidden = true;
    $('#resultat').hidden = false;
    focusVisible($('#titre-resultat'));
    // Les coordonnées sont effacées dès que la démonstration se termine.
    $('#telephone').value = ''; $('#prenom').value = '';
    announce('Simulation terminée. Aucun rendez-vous n’a été réservé. Rien n’a été envoyé.');
  });
  function reset(focus = true) {
    state.service = null; state.date = ''; state.time = null; state.step = 0;
    form.reset();
    $$('.field-error').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    $('.booking-body').hidden = false; $('.steps').hidden = false; $('#resultat').hidden = true;
    go(0, focus);
  }
  $('#recommencer').addEventListener('click', () => reset());
  $('.booking-app').hidden = false;
  updateSummary();
})();
