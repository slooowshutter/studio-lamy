(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hours = { 0: null, 1: [630, 1170], 2: [600, 1170], 3: [600, 1140], 4: [660, 1200], 5: [600, 1170], 6: [600, 1110] };
  // Intervalle technique de 30 minutes, maximum de la plage de durées sourcée.
  // Il ne constitue ni une durée publiée par longueur ni une disponibilité réelle.
  const slotLength = 30;
  const lengths = { courts: 'Courts à mi-courts', 'mi-longs': 'Mi-longs', longs: 'Longs à très longs ou épais' };
  const state = { length: '', day: '', time: null, step: 0, finished: false };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let days = [];
  let keyboard = false;
  let transitionId = 0;

  function parisNow() {
    const parts = {};
    for (const part of parisFormat.formatToParts(new Date())) parts[part.type] = part.value;
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFor(key) { return new Date(`${key}T12:00:00Z`); }
  function dateLabel(key) { return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dateFor(key)); }
  function timeLabel(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour}\u00a0h${minute ? `\u00a0${String(minute).padStart(2, '0')}` : ''}`;
  }
  function slotsFor(key) {
    const date = dateFor(key);
    const range = hours[date.getUTCDay()];
    if (!range) return [];
    const now = parisNow();
    const seed = Math.floor(date.getTime() / 86400000);
    const result = [];
    for (let minute = range[0], index = 0; minute + slotLength <= range[1]; minute += slotLength, index++) {
      const past = key < now.key || (key === now.key && minute <= now.minutes);
      const occupied = (seed + index * 7) % 11 < 2;
      result.push({ minute, disabled: past || occupied, reason: past ? 'Passé' : occupied ? 'Pris (fictif)' : '' });
    }
    return result;
  }
  function announce(message) { $('#booking-status').textContent = message; }
  function updateSummary() {
    $('#summary-length').textContent = lengths[state.length] || 'À choisir';
    $('#summary-day').textContent = state.day ? dateLabel(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('[data-next="1"]').disabled = !state.length;
    $('[data-next="2"]').disabled = !state.day;
    $('[data-next="3"]').disabled = state.time === null;
    $$('.steps button').forEach((button, index) => {
      button.disabled = index > 0 && (!state.length || (index > 1 && !state.day) || (index > 2 && state.time === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function makeDays() {
    const today = parisNow().key;
    const start = dateFor(today);
    days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start.getTime());
      date.setUTCDate(date.getUTCDate() + index);
      return { key: date.toISOString().slice(0, 10), date };
    });
    $('#days').innerHTML = '<legend class="sr-only">Jour du rendez-vous fictif</legend>' + days.map(({ key, date }) => {
      const closed = !hours[date.getUTCDay()];
      const available = !closed && slotsFor(key).some(slot => !slot.disabled);
      const weekday = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }).format(date);
      const month = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' }).format(date);
      const status = closed ? 'Fermé' : !available ? 'Terminé' : month;
      return `<div class="day-option"><input type="radio" name="jour" id="jour-${key}" value="${key}" ${!available ? 'disabled' : ''} ${key === state.day ? 'checked' : ''}><label for="jour-${key}"><span>${weekday}</span><b>${date.getUTCDate()}</b><small>${status}</small><span class="sr-only">${dateLabel(key)}${closed ? ', fermé' : !available ? ', aucun créneau fictif restant' : ', simulation'}</span></label></div>`;
    }).join('');
  }
  function makeSlots() {
    const slots = slotsFor(state.day);
    $('#selected-day').textContent = dateLabel(state.day);
    $('#slots').innerHTML = '<legend class="sr-only">Heure du rendez-vous fictif</legend>' + slots.map(slot => `<div class="slot-option"><input type="radio" name="heure" id="heure-${slot.minute}" value="${slot.minute}" ${slot.disabled ? 'disabled' : ''} ${slot.minute === state.time ? 'checked' : ''}><label for="heure-${slot.minute}"><span>${timeLabel(slot.minute)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label></div>`).join('');
    $('#empty-slots').hidden = slots.some(slot => !slot.disabled);
  }
  function showStep(next, focus = true) {
    if (next > 0 && !state.length) return;
    if (next > 1 && !state.day) return;
    if (next > 2 && state.time === null) return;
    const id = ++transitionId;
    state.step = next;
    if (next === 1) makeDays();
    if (next === 2) makeSlots();
    $$('.booking-panel').forEach(panel => {
      const selected = Number(panel.dataset.panel) === next;
      panel.hidden = !selected;
      panel.classList.toggle('is-entering', selected && !reduced.matches && !keyboard);
    });
    updateSummary();
    const heading = $(`#step-${next}`);
    const panel = $(`[data-panel="${next}"]`);
    if (focus) {
      heading.focus({ preventScroll: true });
      const rect = heading.getBoundingClientRect();
      if (rect.top < 20 || rect.top > window.innerHeight - 150) heading.scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (id === transitionId) panel.classList.remove('is-entering');
    }));
    announce(`Étape ${next + 1} sur 4. ${heading.textContent}`);
  }
  function chooseLength(value) {
    if (!lengths[value]) return;
    state.length = value;
    state.day = '';
    state.time = null;
    $(`input[name="longueur"][value="${value}"]`).checked = true;
    updateSummary();
    announce(`Coupe sur cheveux secs, ${lengths[value].toLocaleLowerCase('fr-FR')}.`);
  }
  function validateField(input, message) {
    const error = $(`#${input.id}-error`);
    error.textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    return !message;
  }
  function validSlot() { return state.day && slotsFor(state.day).some(slot => slot.minute === state.time && !slot.disabled); }
  function resetBooking() {
    $('#booking-form').reset();
    state.length = '';
    state.day = '';
    state.time = null;
    state.finished = false;
    $('#success').hidden = true;
    $('.booking-layout').hidden = false;
    $('.steps').hidden = false;
    $$('.field input').forEach(input => validateField(input, ''));
    showStep(0);
  }

  doc.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  doc.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });
  doc.addEventListener('click', event => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    const step = event.target.closest('[data-step]');
    const lengthLink = event.target.closest('[data-length]');
    if (next && !next.disabled) {
      if (Number(next.dataset.next) === 3 && !validSlot()) {
        state.time = null;
        showStep(2);
        announce('Ce créneau fictif est passé. Choisissez une autre heure.');
      } else showStep(Number(next.dataset.next));
    }
    if (back) showStep(Number(back.dataset.back));
    if (step && !step.disabled) showStep(Number(step.dataset.step));
    if (lengthLink) {
      event.preventDefault();
      if (state.finished) resetBooking();
      chooseLength(lengthLink.dataset.length);
      showStep(1, false);
      $('#rendez-vous').scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'start' });
      $('#step-1').focus({ preventScroll: true });
    }
  });
  $('#booking-form').addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'longueur') chooseLength(input.value);
    if (input.name === 'jour') { state.day = input.value; state.time = null; updateSummary(); announce(`Jour choisi pour l’essai : ${dateLabel(state.day)}.`); }
    if (input.name === 'heure') { state.time = Number(input.value); updateSummary(); announce(`Heure choisie pour l’essai : ${timeLabel(state.time)}.`); }
  });
  $$('.field input').forEach(input => input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') validateField(input, '');
  }));
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#prenom');
    const phone = $('#telephone');
    const nameOK = validateField(name, name.value.trim().length > 0 ? '' : 'Indiquez votre prénom pour terminer l’essai.');
    const number = phone.value.replace(/[\s.()–-]/g, '');
    const phoneOK = validateField(phone, /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(number) ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.');
    if (!nameOK || !phoneOK) { (!nameOK ? name : phone).focus(); return; }
    if (!validSlot()) { state.time = null; showStep(2); announce('Ce créneau fictif est passé. Choisissez une autre heure.'); return; }
    $('#success-recap').textContent = `Votre sélection d’essai : coupe sur cheveux secs, ${lengths[state.length].toLocaleLowerCase('fr-FR')}, le ${dateLabel(state.day)} à ${timeLabel(state.time)}.`;
    $('.booking-layout').hidden = true;
    $('.steps').hidden = true;
    $('#success').hidden = false;
    state.finished = true;
    name.value = '';
    phone.value = '';
    $('#success-title').focus({ preventScroll: true });
    $('#success-title').scrollIntoView({ behavior: reduced.matches || keyboard ? 'instant' : 'smooth', block: 'center' });
    announce('L’essai est terminé. Aucun rendez-vous n’a été réservé. Rien n’a été envoyé.');
  });
  $('#restart').addEventListener('click', resetBooking);

  $('.booking-ui').hidden = false;
  updateSummary();
  makeDays();
  const revealElements = $$('.reveal-rule, [data-reveal], .volume-study');
  $$('.price-list, .secondary-prices').forEach(group => $$('[data-reveal]', group).forEach((element, index) => { element.style.transitionDelay = `${index * 60}ms`; }));
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('is-visible'));
  reduced.addEventListener('change', () => {
    if (reduced.matches) revealElements.forEach(element => element.classList.add('is-visible'));
  });

  const mobileBar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      mobileBar.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0 });
    [$('.hero-cta'), $('#rendez-vous'), $('.footer')].forEach(element => barObserver.observe(element));
  }
  window.sandyPret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
