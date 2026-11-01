/* Local preview only. No requests, persistence or real booking. */
(() => {
  'use strict';
  const SERVICES = [
    { id: 'balneo', name: 'Soin des pieds en balnéo', duration: 45, price: 35 },
    { id: 'pieds', name: 'Semi-permanent pieds', duration: 45, price: 30 },
    { id: 'mains', name: 'Semi-permanent mains', duration: 45, price: 30 },
    { id: 'gainage', name: 'Gainage des ongles naturels', duration: 60, price: 40 },
    { id: 'extensions', name: 'Extensions d’ongles', duration: 90, price: 55 }
  ];
  // PagesJaunes, 01/11/2026. Other directories disagree; all hours are labelled unconfirmed.
  const HOURS = { 1: [540, 1080], 2: [540, 1080], 3: [540, 1080], 4: [540, 1080], 5: [540, 1080] };
  const parisFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function parisParts(now = new Date()) {
    return Object.fromEntries(parisFormatter.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  }
  function todayKey(now = new Date()) {
    const p = parisParts(now);
    return `${p.year}-${p.month}-${p.day}`;
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function addDays(key, amount) {
    const day = dateFromKey(key);
    day.setUTCDate(day.getUTCDate() + amount);
    return day.toISOString().slice(0, 10);
  }
  function dayHours(key) { return HOURS[dateFromKey(key).getUTCDay()] || null; }
  function makeDays(now = new Date()) {
    const first = todayKey(now);
    return Array.from({ length: 14 }, (_, i) => {
      const key = addDays(first, i);
      return { key, closed: !dayHours(key) };
    });
  }
  function makeSlots(key, duration, now = new Date()) {
    const hours = dayHours(key);
    if (!hours) return [];
    const current = parisParts(now);
    const currentMinute = Number(current.hour) * 60 + Number(current.minute);
    const today = todayKey(now);
    const seed = Math.floor(dateFromKey(key).getTime() / 86400000);
    const busy = Array.from({ length: 18 }, (_, i) => i)
      .filter(i => (seed + i * 7) % 11 === 0)
      .map(i => [hours[0] + i * 30, hours[0] + (i + 1) * 30]);
    const slots = [];
    for (let minute = hours[0]; minute + duration <= hours[1]; minute += 30) {
      const past = key < today || (key === today && minute <= currentMinute);
      const taken = busy.some(([start, end]) => minute < end && minute + duration > start);
      slots.push({ minute, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function validName(value) { return /^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{0,59}$/u.test(value.trim()); }
  function validPhone(value) { return /^(?:0[67]|(?:\+33|0033)[67])\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }
  function timeLabel(minute) { return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`; }
  function dateLabel(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(dateFromKey(key));
  }
  function parisInstant(key, minute) {
    const [year, month, day] = key.split('-').map(Number);
    const desired = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60);
    let timestamp = desired;
    for (let i = 0; i < 3; i++) {
      const p = parisParts(new Date(timestamp));
      const displayed = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
      timestamp += desired - displayed;
    }
    return new Date(timestamp);
  }
  function resolveNavigation(selection, requestedStep, now = new Date()) {
    const result = { step: requestedStep, day: selection.day, time: selection.time, notice: '' };
    const first = todayKey(now);
    if (selection.day && (selection.day < first || selection.day > addDays(first, 13) || !dayHours(selection.day))) {
      return { step: Math.min(requestedStep, 1), day: '', time: null, notice: 'Le jour choisi n’est plus dans les dates proposées. Choisissez un autre jour d’exemple.' };
    }
    const item = SERVICES.find(s => s.id === selection.service);
    if (requestedStep >= 3 && selection.day && selection.time !== null && item &&
        !makeSlots(selection.day, item.duration, now).some(s => s.minute === selection.time && !s.disabled)) {
      return { ...result, step: 2, time: null, notice: 'Ce créneau n’est plus disponible dans la simulation. Choisissez une autre heure.' };
    }
    return result;
  }
  const logic = { SERVICES, HOURS, todayKey, addDays, dayHours, makeDays, makeSlots, validName, validPhone, timeLabel, parisInstant, resolveNavigation };
  if (typeof module !== 'undefined' && module.exports) module.exports = logic;
  if (typeof document === 'undefined') return;

  window.siteReady = true;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.classList.add('keyboard'); }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; document.documentElement.classList.remove('keyboard'); }, true);
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // One finite ripple on arrival; further ripples have an explicit user cause.
  const ripple = document.querySelector('.ripple');
  let waveTimer;
  function makeWave() {
    if (reduced.matches || keyboard) return;
    clearTimeout(waveTimer);
    ripple.classList.add('is-spreading');
    waveTimer = setTimeout(() => ripple.classList.remove('is-spreading'), 650);
  }
  document.querySelector('.wave-trigger').addEventListener('click', makeWave);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.entrance').forEach(el => el.classList.add('is-visible'));
    makeWave();
  }));
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach((el, i) => {
      if (el.dataset.reveal === 'line') el.style.transitionDelay = `${(i % 3) * 60}ms`;
      observer.observe(el);
    });
  } else reveals.forEach(el => el.classList.add('is-visible'));

  const app = document.getElementById('booking-app');
  const panel = document.getElementById('booking-panel');
  const status = document.getElementById('booking-status');
  const state = { step: 0, service: 'balneo', day: '', time: null, name: '', phone: '', success: false };
  let renderTimer;
  let transitionFrame;
  let submitted = false;
  let navigationNotice = '';
  const service = () => SERVICES.find(item => item.id === state.service);
  const available = () => state.day && makeSlots(state.day, service().duration).some(slot => slot.minute === state.time && !slot.disabled);
  const canVisit = step => step === 0 || (step === 1 && !!service()) || (step === 2 && !!state.day) || (step === 3 && available());

  function updateSummary() {
    document.getElementById('summary-service').textContent = service().name;
    document.getElementById('summary-day').textContent = state.day ? dateLabel(state.day) : 'À choisir';
    document.getElementById('summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    document.getElementById('summary-price').textContent = `${service().price}\u00a0€ · ${service().duration}\u00a0min (exemples)`;
    document.querySelectorAll('[data-step], [data-edit]').forEach(button => {
      const step = Number(button.dataset.step ?? button.dataset.edit);
      button.disabled = state.success || !canVisit(step);
      if (button.hasAttribute('data-step')) {
        if (state.step === step && !state.success) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      }
    });
  }
  function actions(nextStep, ready = true) {
    return `<div class="panel-actions">${state.step ? `<button class="back-button" type="button" data-go="${state.step - 1}">← Retour</button>` : '<span class="form-note">Prix et durées d’exemple</span>'}<button class="button" type="button" data-go="${nextStep}" ${ready ? '' : 'disabled'}>Continuer <span aria-hidden="true">→</span></button></div>`;
  }
  function serviceView() {
    return `<h3 id="step-heading" tabindex="-1">Quel soin pour vous&nbsp;?</h3><p class="panel-intro">Tarifs indicatifs, à confirmer avec L’Esprit Des Jolis Ongles. Prix et durées ci-dessous&nbsp;: exemples pour l’aperçu.</p><fieldset><legend class="sr-only">Choisir une prestation</legend><div class="choice-list">${SERVICES.map(item => `<label class="choice"><input type="radio" name="service" value="${item.id}" ${state.service === item.id ? 'checked' : ''}><span><span class="choice-title">${item.name}</span><span class="choice-detail">${item.duration}&nbsp;min · exemple</span></span><span class="choice-price">${item.price}&nbsp;€</span></label>`).join('')}</div></fieldset>${actions(1)}`;
  }
  function dayView() {
    return `<h3 id="step-heading" tabindex="-1">Un jour qui vous convient.</h3><p class="panel-intro">14 jours à venir, à l’heure de Paris. Horaires à confirmer&nbsp;: lundi–vendredi, 9&nbsp;h–18&nbsp;h. Aucun agenda réel connecté.</p><fieldset><legend class="sr-only">Choisir un jour d’exemple</legend><div class="day-strip">${makeDays().map(({ key, closed }) => `<label class="day-choice"><input type="radio" name="day" value="${key}" aria-label="${dateLabel(key)}${closed ? ', fermé selon les horaires indicatifs' : ''}" ${closed ? 'disabled' : ''} ${state.day === key ? 'checked' : ''}><span>${dateLabel(key, { weekday: 'short' })}</span><strong>${dateFromKey(key).getUTCDate()}</strong><span>${dateLabel(key, { month: 'short' })}</span><small>${closed ? 'Fermé' : key === todayKey() ? 'Aujourd’hui' : 'Exemple'}</small></label>`).join('')}</div></fieldset><p class="calendar-caption">Samedi et dimanche fermés selon PagesJaunes. D’autres annuaires divergent sur le samedi&nbsp;; à vérifier auprès du salon.</p>${actions(2, !!state.day)}`;
  }
  function timeView() {
    const slots = makeSlots(state.day, service().duration);
    const free = slots.filter(slot => !slot.disabled).length;
    const group = (label, list) => list.length ? `<p class="slot-heading">${label}</p><div class="slot-grid">${list.map(slot => `<label class="slot-choice"><input type="radio" name="time" value="${slot.minute}" aria-label="${timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', créneau d’exemple'}" ${slot.disabled ? 'disabled' : ''} ${state.time === slot.minute && !slot.disabled ? 'checked' : ''}><span>${timeLabel(slot.minute)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label>`).join('')}</div>` : '';
    return `<h3 id="step-heading" tabindex="-1">À quelle heure&nbsp;?</h3><p class="panel-intro">${dateLabel(state.day)} · ${service().duration}&nbsp;min d’exemple.<br>${free ? `${free} créneaux d’exemple libres.` : 'Aucun créneau d’exemple disponible ce jour. Choisissez un autre jour.'} Les mentions «&nbsp;déjà pris&nbsp;» sont simulées.</p><fieldset><legend class="sr-only">Choisir un créneau d’exemple</legend>${group('Matin', slots.filter(slot => slot.minute < 720))}${group('Après-midi', slots.filter(slot => slot.minute >= 720))}</fieldset>${actions(3, available())}`;
  }
  function contactView() {
    return `<h3 id="step-heading" tabindex="-1">Juste pour essayer.</h3><p class="panel-intro">Utilisez des coordonnées d’exemple. Rien n’est transmis ni sauvegardé après fermeture de la page.</p><form id="booking-form" class="booking-form" novalidate><div class="field"><label for="first-name">Prénom</label><input id="first-name" name="first-name" autocomplete="given-name" maxlength="60" required value="${escapeHTML(state.name)}" aria-describedby="name-error"><p class="field-error" id="name-error" hidden></p></div><div class="field"><label for="phone">Téléphone mobile</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" required value="${escapeHTML(state.phone)}" aria-describedby="phone-help phone-error"><p class="form-note" id="phone-help">Format français, en 06, 07 ou +33.</p><p class="field-error" id="phone-error" hidden></p></div><div class="confirm-recap"><strong>${service().name}</strong>${dateLabel(state.day)} à ${timeLabel(state.time)}<br>${service().duration}&nbsp;min · ${service().price}&nbsp;€ (exemples)<br>Tarifs indicatifs, à confirmer avec L’Esprit Des Jolis Ongles.</div><p class="form-note">Cette validation termine la démonstration. Elle ne réserve aucun rendez-vous.</p><div class="panel-actions"><button class="back-button" type="button" data-go="2">← Retour</button><button type="submit" class="button">Terminer la simulation <span aria-hidden="true">→</span></button></div></form>`;
  }
  function successView() {
    return `<h3 id="step-heading" tabindex="-1">La pause est dessinée.</h3><p class="success-note"><strong>Simulation terminée, ${escapeHTML(state.name.trim())}.</strong><br>Aucun rendez-vous n’a été réservé. Rien n’a été envoyé au salon.</p><div class="confirm-recap"><strong>${service().name}</strong>${dateLabel(state.day)} à ${timeLabel(state.time)}<br>${service().duration}&nbsp;min · ${service().price}&nbsp;€ (exemples)<br>50 boulevard Victor Beaussier, Angers<br>Tarifs indicatifs, à confirmer avec L’Esprit Des Jolis Ongles.</div><div class="success-actions"><a class="text-link" href="tel:+33663670729">Pour un vrai rendez-vous&nbsp;: 06&nbsp;63&nbsp;67&nbsp;07&nbsp;29 <span aria-hidden="true">↗</span></a><button class="back-button" type="button" data-calendar>Garder cet exemple dans mon agenda (.ics)</button><button class="back-button" type="button" data-restart>Recommencer la simulation</button></div>`;
  }
  function commitView(focus = true) {
    const notice = navigationNotice ? `<p class="navigation-notice">${navigationNotice}</p>` : '';
    panel.innerHTML = notice + (state.success ? successView() : [serviceView, dayView, timeView, contactView][state.step]());
    updateSummary();
    const title = panel.querySelector('#step-heading');
    if (focus) {
      title.focus({ preventScroll: true });
      const rect = title.getBoundingClientRect();
      if (rect.top < 24 || rect.bottom > window.innerHeight - 24) title.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    status.textContent = state.success ? 'Simulation terminée. Aucun rendez-vous réservé, rien envoyé.' : `${navigationNotice} Étape ${state.step + 1} sur 4. ${title.textContent}`;
  }
  function render(focus = true) {
    clearTimeout(renderTimer);
    cancelAnimationFrame(transitionFrame);
    // The same container retargets from its current opacity/transform, even on rapid navigation.
    if (!focus || keyboard || reduced.matches) {
      panel.classList.add('instant');
      panel.classList.remove('is-changing');
      commitView(focus);
      transitionFrame = requestAnimationFrame(() => panel.classList.remove('instant'));
      return;
    }
    panel.style.transitionDuration = '80ms';
    panel.classList.add('is-changing');
    renderTimer = setTimeout(() => {
      commitView(focus);
      panel.style.transitionDuration = '160ms';
      panel.classList.remove('is-changing');
    }, 80);
  }
  function go(step) {
    if (state.success) return;
    // Normalize before checking reachability, so an expired selection has an escape route.
    const next = resolveNavigation(state, step);
    navigationNotice = next.notice;
    if (next.notice) Object.assign(state, { step: next.step, day: next.day, time: next.time });
    else if (canVisit(step)) state.step = step;
    else return;
    render();
  }
  function showError(id, inputId, message, valid) {
    const error = document.getElementById(id);
    const input = document.getElementById(inputId);
    error.hidden = valid;
    error.textContent = valid ? '' : message;
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  }
  function validateContact() {
    const nameOK = validName(state.name);
    const phoneOK = validPhone(state.phone);
    showError('name-error', 'first-name', 'Indiquez un prénom (60 caractères maximum, lettres, espaces, apostrophes ou tirets).', nameOK);
    showError('phone-error', 'phone', 'Indiquez un mobile français valide en 06, 07 ou +33.', phoneOK);
    return nameOK && phoneOK;
  }
  panel.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') { state.service = input.value; state.day = ''; state.time = null; }
    if (input.name === 'day') { state.day = input.value; state.time = null; }
    if (input.name === 'time') state.time = Number(input.value);
    updateSummary();
    const next = panel.querySelector('.panel-actions .button');
    if (next && input.name === 'day') next.disabled = !state.day;
    if (next && input.name === 'time') next.disabled = !available();
  });
  panel.addEventListener('input', event => {
    if (event.target.name === 'first-name') state.name = event.target.value;
    if (event.target.name === 'phone') state.phone = event.target.value;
    if (submitted && state.step === 3) validateContact();
  });
  app.addEventListener('click', event => {
    const control = event.target.closest('button');
    if (!control || control.disabled) return;
    const next = control.dataset.go ?? control.dataset.step ?? control.dataset.edit;
    if (next !== undefined) go(Number(next));
    if (control.hasAttribute('data-restart')) {
      Object.assign(state, { step: 0, service: 'balneo', day: '', time: null, name: '', phone: '', success: false });
      submitted = false; navigationNotice = ''; render();
    }
    if (control.hasAttribute('data-calendar')) downloadCalendar();
  });
  panel.addEventListener('submit', event => {
    event.preventDefault();
    submitted = true;
    if (!validateContact()) {
      panel.querySelector('[aria-invalid="true"]').focus();
      status.textContent = 'Vérifiez les coordonnées indiquées. Les erreurs sont précisées sous les champs.';
      return;
    }
    if (!available()) {
      go(3);
      return;
    }
    navigationNotice = '';
    state.success = true;
    render();
  });
  document.querySelectorAll('[data-preselect]').forEach(link => link.addEventListener('click', () => {
    Object.assign(state, { step: 0, service: link.dataset.preselect, day: '', time: null, success: false });
    navigationNotice = '';
    render(false);
    // Preserve normal anchor navigation; focus the named step after native scrolling.
    setTimeout(() => panel.querySelector('#step-heading').focus({ preventScroll: true }), 0);
  }));
  function downloadCalendar() {
    if (!state.success) return;
    const start = parisInstant(state.day, state.time);
    const end = new Date(start.getTime() + service().duration * 60000);
    const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escapeICS = value => value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Simulation non officielle//FR',
      'BEGIN:VEVENT', `UID:${Date.now()}@simulation.example`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeICS(`SIMULATION — ${service().name}`)}`,
      `DESCRIPTION:${escapeICS('Exemple uniquement. Aucun rendez-vous réservé. Appelez le salon au 06 63 67 07 29 pour un vrai rendez-vous.')}`,
      'STATUS:TENTATIVE', 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'
    ];
    // Fold at 75 UTF-8 octets, never in the middle of a code point.
    const folded = lines.map(line => {
      let out = ''; let column = 0;
      for (const char of line) {
        const length = new TextEncoder().encode(char).length;
        if (column + length > 75) { out += '\r\n '; column = 1; }
        out += char; column += length;
      }
      return out;
    }).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([folded], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'simulation-balneo-esprit-jolis-ongles.ics';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Fichier d’exemple téléchargé. Aucun rendez-vous réservé.';
  }
  app.hidden = false;
  render(false);

  // Hide the mobile contact bar while it would duplicate or obstruct current actions.
  const bar = document.querySelector('.mobile-bar');
  const visible = { hero: false, booking: false, footer: false };
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'hero-actions' ? 'hero' : entry.target.id === 'reserver' ? 'booking' : 'footer';
        visible[key] = entry.isIntersecting;
      });
      bar.classList.toggle('is-hidden', visible.hero || visible.booking || visible.footer);
    }, { threshold: 0 });
    ['hero-actions', 'reserver', 'footer'].forEach(id => barObserver.observe(document.getElementById(id)));
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      clearTimeout(waveTimer); ripple.classList.remove('is-spreading');
      reveals.forEach(el => el.classList.add('is-visible'));
      clearTimeout(renderTimer); panel.classList.remove('is-changing'); commitView(false);
    }
  });
})();
