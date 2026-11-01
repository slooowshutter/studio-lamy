/* Epil & You · Une simulation locale, aucun envoi ni stockage. */
(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = {
    epilation: { name: 'Épilation corporelle', duration: 30, price: 25 },
    visage: { name: 'Soin du visage', duration: 60, price: 55 },
    manucure: { name: 'Manucure', duration: 30, price: 25 },
    pieds: { name: 'Soin des pieds', duration: 45, price: 40 }
  };
  // Pages Jaunes, relevé le 01/11/2026. Grille à confirmer, utilisée uniquement pour l’exemple.
  const hours = { 0: null, 1: [600, 1170], 2: [600, 1170], 3: [600, 1170], 4: [600, 1170], 5: [600, 1170], 6: [540, 1140] };
  const state = { service: null, day: null, minutes: null, step: 0, maxStep: 0 };
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const panels = $$('[data-panel]');
  let keyboard = false;
  let transitionToken = 0;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).map(part => [part.type, part.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, y: +parts.year, m: +parts.month, d: +parts.day, minutes: +parts.hour * 60 + +parts.minute };
  }
  const asDate = iso => new Date(`${iso}T12:00:00Z`);
  const timeText = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`;
  const priceText = service => `${service.price}${NB}€`;
  const announce = text => { $('#booking-status').textContent = text; };

  function holiday(date) {
    const y = date.getUTCFullYear();
    const key = date.toISOString().slice(5, 10);
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key)) return true;
    // Calcul grégorien de Pâques pour signaler aussi les fêtes mobiles, sans affirmer une fermeture.
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451), n = h + l - 7 * m + 114;
    const easter = Date.UTC(y, Math.floor(n / 31) - 1, n % 31 + 1, 12);
    return [1, 39, 50].some(offset => easter + offset * 86400000 === date.getTime());
  }

  function slotsFor(iso, serviceKey, now = parisNow()) {
    const date = asDate(iso);
    const range = hours[date.getUTCDay()];
    const service = services[serviceKey];
    if (!range || !service) return [];
    const seed = [...iso + serviceKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const result = [];
    for (let minutes = range[0]; minutes + service.duration <= range[1]; minutes += 30) {
      const past = iso < now.iso || (iso === now.iso && minutes <= now.minutes);
      const taken = (seed + Math.floor(minutes / 30)) % 5 === 0;
      result.push({ minutes, disabled: past || taken, reason: past ? 'passé' : taken ? 'déjà pris (exemple)' : '' });
    }
    return result;
  }

  function radioChoice(name, value, label, inner, disabled = false, checked = false) {
    const wrap = document.createElement('label');
    wrap.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value;
    input.disabled = disabled; input.checked = checked;
    input.setAttribute('aria-label', label);
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = inner; // Uniquement des chaînes de dates et de créneaux générées localement.
    wrap.append(input, visual);
    return wrap;
  }

  function renderDays() {
    const now = parisNow();
    const fragment = document.createDocumentFragment();
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(Date.UTC(now.y, now.m - 1, now.d + offset, 12));
      const iso = date.toISOString().slice(0, 10);
      const closed = !hours[date.getUTCDay()];
      const full = !closed && !slotsFor(iso, state.service, now).some(slot => !slot.disabled);
      const isHoliday = holiday(date);
      const note = closed ? 'fermé' : full ? 'aucun créneau' : isHoliday ? 'férié*' : monthFormat.format(date);
      const accessible = `${longFormat.format(date)}${closed ? ', fermé' : full ? ', aucun créneau dans cet exemple' : isHoliday ? ', jour férié, horaires à confirmer' : ', exemple, horaires à confirmer'}`;
      fragment.append(radioChoice('day', iso, accessible, `${dayFormat.format(date)}<b>${date.getUTCDate()}</b><small>${note}</small>`, closed || full, iso === state.day));
    }
    $('#days').replaceChildren(fragment);
  }

  function renderSlots() {
    if (!state.day || !state.service) return;
    const slots = slotsFor(state.day, state.service);
    const fragment = document.createDocumentFragment();
    for (const slot of slots) {
      fragment.append(radioChoice('slot', String(slot.minutes), `${timeText(slot.minutes)}${slot.reason ? ', ' + slot.reason : ', disponible dans cet exemple'}`, timeText(slot.minutes), slot.disabled, slot.minutes === state.minutes));
    }
    $('#slots').replaceChildren(fragment);
    const available = slots.filter(slot => !slot.disabled).length;
    $('#slots-caption').textContent = `${longFormat.format(asDate(state.day))}${NB}· ${available}${NB}créneau${available > 1 ? 'x' : ''} d’exemple. Horaires à confirmer${holiday(asDate(state.day)) ? ', jour férié' : ''}.`;
    $('#slot-help').textContent = available ? 'Les créneaux barrés sont déjà pris dans cet exemple ou sont passés.' : 'Aucun créneau restant dans cet exemple. Revenez à l’étape Jour pour une autre date.';
    if (state.minutes !== null && !slots.some(slot => slot.minutes === state.minutes && !slot.disabled)) state.minutes = null;
  }

  function summary() {
    const service = services[state.service];
    $('#summary-service').textContent = service ? `${service.name} · ${service.duration}${NB}min` : 'À choisir';
    $('#summary-day').textContent = state.day ? longFormat.format(asDate(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.minutes === null ? 'À choisir' : timeText(state.minutes);
    $('#summary-price').textContent = service ? `${priceText(service)} · exemple` : '—';
    $('#compact-summary').textContent = service
      ? `Exemple · ${service.name} · ${service.duration}${NB}min · ${priceText(service)}${state.day ? ' · ' + longFormat.format(asDate(state.day)) : ' · jour à choisir'}${state.minutes !== null ? ' à ' + timeText(state.minutes) : ''}`
      : 'Exemple · choisissez une prestation.';
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.minutes === null;
    if (service && state.day && state.minutes !== null) {
      $('#final-recap').textContent = `${service.name} · ${service.duration}${NB}min · ${longFormat.format(asDate(state.day))} à ${timeText(state.minutes)}. ${priceText(service)} (exemple, à confirmer).`;
    }
    $$('[data-step]').forEach(button => {
      const step = +button.dataset.step;
      button.disabled = state.step === 4 || step > state.maxStep;
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function goTo(step, focus = true) {
    if (step > 0 && !state.service) return;
    if (step > 1 && !state.day) return;
    if (step > 2 && state.minutes === null) return;
    const token = ++transitionToken;
    state.step = step;
    state.maxStep = Math.max(state.maxStep, Math.min(step, 3));
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    const active = panels.find(panel => +panel.dataset.panel === step);
    panels.forEach(panel => { panel.hidden = panel !== active; panel.classList.remove('is-entering'); });
    if (!reduced.matches && !keyboard) {
      active.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => { if (token === transitionToken) active.classList.remove('is-entering'); }));
    }
    summary();
    const title = $(`#step-title-${step}`);
    if (focus) title.focus({ preventScroll: false });
    announce(step === 4 ? 'Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.' : `Étape ${step + 1} sur 4. ${title.textContent}.`);
  }

  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-nav'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-nav'); }, { passive: true });

  function chooseService(value) {
    if (!services[value]) return;
    state.service = value; state.day = null; state.minutes = null; state.maxStep = 0;
    $$('input[name="service"]').forEach(input => { input.checked = input.value === value; });
    renderDays(); summary();
    announce(`${services[value].name}, ${services[value].duration} minutes, ${services[value].price} euros. Exemple, à confirmer.`);
  }
  $('fieldset.service-options').addEventListener('change', event => chooseService(event.target.value));
  $('#days').addEventListener('change', event => {
    if (event.target.name !== 'day' || event.target.disabled) return;
    state.day = event.target.value; state.minutes = null; state.maxStep = 1;
    renderSlots(); summary();
    announce(`${longFormat.format(asDate(state.day))}, jour sélectionné dans la simulation.`);
  });
  $('#slots').addEventListener('change', event => {
    if (event.target.name !== 'slot' || event.target.disabled) return;
    state.minutes = +event.target.value;
    if (!slotsFor(state.day, state.service).some(slot => slot.minutes === state.minutes && !slot.disabled)) {
      renderSlots(); summary(); announce('Ce créneau est passé. Choisissez une autre heure.'); return;
    }
    state.maxStep = 2; summary();
    announce(`${timeText(state.minutes)}, heure sélectionnée dans la simulation.`);
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => goTo(+button.dataset.next)));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => goTo(+button.dataset.step)));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    chooseService(link.dataset.service); goTo(0, false);
  }));

  function validate() {
    const firstName = $('#first-name');
    const phone = $('#phone');
    const validName = /\p{L}/u.test(firstName.value.trim());
    const compactPhone = phone.value.replace(/[\s.()\-]/g, '');
    const validPhone = /^(?:0[67]|(?:\+33|0033)[67])\d{8}$/.test(compactPhone);
    $('#name-error').textContent = validName ? '' : 'Indiquez un prénom d’exemple contenant au moins une lettre.';
    $('#phone-error').textContent = validPhone ? '' : 'Indiquez un mobile français de 10 chiffres commençant par 06 ou 07 (ou +33).';
    firstName.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    return { valid: validName && validPhone, firstInvalid: !validName ? firstName : phone };
  }
  $('#details-form').addEventListener('submit', event => {
    event.preventDefault();
    const result = validate();
    if (!result.valid) { result.firstInvalid.focus(); announce('Vérifiez les champs signalés. Rien n’a été envoyé.'); return; }
    const currentSlot = slotsFor(state.day, state.service).find(slot => slot.minutes === state.minutes && !slot.disabled);
    if (!currentSlot) { state.minutes = null; state.maxStep = 2; goTo(2); announce('Ce créneau est désormais passé. Choisissez une autre heure.'); return; }
    $('#success-recap').textContent = $('#final-recap').textContent;
    goTo(4);
    // Les coordonnées ne servent qu’à démontrer la validation. Elles ne sont pas reprises ni conservées.
    $('#details-form').reset();
  });
  $$('#details-form input').forEach(input => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      input.removeAttribute('aria-invalid');
      $(input.id === 'phone' ? '#phone-error' : '#name-error').textContent = '';
    }
  }));
  $('#restart').addEventListener('click', () => {
    Object.assign(state, { service: null, day: null, minutes: null, step: 0, maxStep: 0 });
    $$('input[name="service"]').forEach(input => { input.checked = false; });
    $('#details-form').reset();
    $$('#details-form input').forEach(input => input.removeAttribute('aria-invalid'));
    $('#name-error').textContent = ''; $('#phone-error').textContent = '';
    goTo(0);
  });
  $('#booking-ui').hidden = false;
  summary();

  // One-time editorial reveals. No content is hidden unless the script reaches this point.
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => revealObserver.observe(element));
    root.classList.add('motion');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

    const bar = $('.mobile-bar');
    let heroVisible = true, bookingVisible = false, footerVisible = false;
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.matches('.hero-call')) heroVisible = entry.isIntersecting;
        else if (entry.target.id === 'rendez-vous') bookingVisible = entry.isIntersecting;
        else footerVisible = entry.isIntersecting;
      });
      const hide = heroVisible || bookingVisible || footerVisible;
      bar.classList.toggle('is-hidden', hide);
      bar.inert = hide;
    }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
    bar.classList.add('is-hidden'); bar.inert = true;
    [$('.hero-call'), $('#rendez-vous'), $('#pied')].forEach(element => barObserver.observe(element));
  }
})();
