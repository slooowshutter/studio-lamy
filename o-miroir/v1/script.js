/* Ô MIROIR — tous les rendez-vous de ce module sont fictifs. Aucun réseau, aucun stockage. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'coupe-brushing', name: 'Coupe & brushing', detail: 'Shampoing, coupe et brushing · cheveux courts' },
    { id: 'homme', name: 'Coupe homme', detail: 'Shampoing et coupe' },
    { id: 'etudiant', name: 'Coupe étudiant', detail: 'Shampoing et coupe' },
    { id: 'junior', name: 'Coupe junior', detail: 'Moins de 12 ans · shampoing, coupe et séchage' },
    { id: 'brushing-court', name: 'Brushing · cheveux courts', detail: 'Shampoing et brushing' },
    { id: 'brushing-long', name: 'Brushing · cheveux longs', detail: 'Shampoing et brushing' },
    { id: 'soin', name: 'Soin profond', detail: 'Prestation de soin du menu Planity' }
  ];
  // Dimanche = 0. Minutes depuis minuit. Source : Planity, 01/11/2026.
  const hours = [null, null, [540, 1080], [540, 1080], [540, 1080], [540, 1080], [540, 1020]];
  const state = { step: 0, service: null, day: '', time: null, success: false };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  let keyboard = false;
  let transitionVersion = 0;
  let snapshotDay = '';

  function parisNow() {
    const p = Object.fromEntries(parisFormat.formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const dateFromKey = (key) => new Date(`${key}T12:00:00Z`);
  const dateKey = (date) => date.toISOString().slice(0, 10);
  const fullDate = (key) => dateFormat.format(dateFromKey(key));
  const timeLabel = (minutes) => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  function holiday(key) {
    const year = Number(key.slice(0, 4));
    if (['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].includes(key.slice(5))) return true;
    // Pâques grégorien : puis lundi de Pâques, Ascension et lundi de Pentecôte.
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    return [1, 39, 50].some(offset => dateKey(new Date(Date.UTC(year, month - 1, day + offset, 12))) === key);
  }
  function slotData(key) {
    const now = parisNow();
    const period = hours[dateFromKey(key).getUTCDay()];
    if (!period || key < now.day) return [];
    const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const slots = [];
    for (let time = period[0]; time < period[1]; time += 30) {
      const past = key === now.day && time <= now.minutes;
      const taken = (seed + time / 30) % 5 === 0;
      slots.push({ time, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return slots;
  }

  function renderServices() {
    $('#service-options').innerHTML = services.map(service => `<label class="service-choice"><input type="radio" name="service" value="${service.id}"${state.service?.id === service.id ? ' checked' : ''}><span><strong>${service.name}</strong><small>${service.detail}</small></span><span class="choice-price">Simulation</span></label>`).join('');
  }
  function renderDays() {
    const today = parisNow().day;
    snapshotDay = today;
    const start = dateFromKey(today);
    const dates = Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + offset);
      return date;
    });
    if (!dates.some(date => dateKey(date) === state.day)) { state.day = ''; state.time = null; }
    $('#day-options').innerHTML = dates.map((date, index) => {
      const key = dateKey(date);
      const closed = !hours[date.getUTCDay()];
      const special = holiday(key);
      const note = closed ? 'Fermé' : special ? 'Férié*' : index === 0 ? 'Auj.' : index === 1 ? 'Demain' : 'Ouvert';
      return `<label class="day-choice"><input type="radio" name="day" value="${key}" aria-label="${fullDate(key)}, ${closed ? 'fermé' : special ? 'jour férié, ouverture à confirmer' : 'ouvert'}"${closed ? ' disabled' : ''}${state.day === key ? ' checked' : ''}><span>${weekdayFormat.format(date)}</span><strong>${date.getUTCDate()}</strong><span>${monthFormat.format(date)}</span><small>${note}</small></label>`;
    }).join('');
  }
  function renderSlots() {
    if (!state.day || !state.service) return;
    const slots = slotData(state.day);
    if (!slots.some(slot => slot.time === state.time && !slot.disabled)) state.time = null;
    const available = slots.filter(slot => !slot.disabled).length;
    $('#slot-caption').textContent = `${fullDate(state.day)} · ${available} heures disponibles pour l’essai.${holiday(state.day) ? ' Jour férié : ouverture à confirmer.' : ''}${dateFromKey(state.day).getUTCDay() === 6 ? ' Samedi : fermeture à 17 h à confirmer.' : ''}`;
    $('#slot-options').innerHTML = slots.map(slot => `<label class="slot-choice"><input type="radio" name="slot" value="${slot.time}" aria-label="${timeLabel(slot.time)}${slot.reason ? `, ${slot.reason.toLowerCase()}` : ''}"${slot.disabled ? ' disabled' : ''}${state.time === slot.time ? ' checked' : ''}><span class="slot-time">${timeLabel(slot.time)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label>`).join('');
    $('#slot-empty').hidden = available !== 0;
  }
  function allowedStep(step) {
    return step === 0 || (step === 1 && !!state.service) || (step === 2 && !!state.service && !!state.day) || (step === 3 && !!state.service && !!state.day && state.time !== null);
  }
  function sync() {
    $('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    $('#summary-day').textContent = state.day ? fullDate(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#summary-price').textContent = 'Par téléphone';
    $$('.step-nav button').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = state.success || !allowedStep(step);
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#next-step').disabled = !allowedStep(state.step + 1);
  }
  function goTo(step, focus = true) {
    if (step < 4 && !allowedStep(step)) return;
    if (snapshotDay !== parisNow().day) renderDays();
    if (step === 1) renderDays();
    if (step === 2 || step === 3) renderSlots();
    // Une heure passée pendant l’essai doit être choisie de nouveau.
    if (step === 3 && state.time === null) step = 2;
    if (step >= 2 && !state.day) step = 1;
    state.step = step;
    $$('[data-panel]').forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
    $('#booking-controls').hidden = step >= 3;
    $('#back-step').hidden = step === 0;
    sync();
    const current = ++transitionVersion;
    const panel = $('#step-panel');
    panel.classList.toggle('entering', !keyboard && !reduceMotion.matches);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (current === transitionVersion) panel.classList.remove('entering'); }));
    if (focus) {
      const heading = $(`#step-title-${step}`);
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    $('#booking-status').textContent = step === 4 ? 'Fin de la simulation. Aucun rendez-vous pris.' : `Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][step]}.`;
  }
  function chooseService(id) {
    const service = services.find(service => service.id === id);
    if (!service) return;
    state.service = service;
    state.time = null;
    state.success = false;
    renderServices();
    sync();
  }
  function validateField(input) {
    const isName = input.id === 'first-name';
    const normalizedPhone = input.value.replace(/[\s.()\-]/g, '').replace(/^(\+33|0033)0/, '$1');
    const valid = isName ? /\p{L}/u.test(input.value.trim()) : /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(normalizedPhone);
    input.setAttribute('aria-invalid', String(!valid));
    $(isName ? '#name-error' : '#phone-error').textContent = valid ? '' : isName ? 'Indiquez un prénom, même pour cet essai.' : 'Indiquez un portable français à 10 chiffres commençant par 06 ou 07, ou son format +33.';
    return valid;
  }

  renderServices();
  renderDays();
  sync();
  $('#booking-app').hidden = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });
  $('#booking-app').addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') {
      state.service = services.find(service => service.id === input.value);
      state.time = null;
    }
    if (input.name === 'day') { state.day = input.value; state.time = null; }
    if (input.name === 'slot') state.time = Number(input.value);
    sync();
  });
  $('#next-step').addEventListener('click', () => goTo(state.step + 1));
  $('#back-step').addEventListener('click', () => goTo(state.step - 1));
  $$('.step-nav button').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  $$('[data-preselect]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    chooseService(link.dataset.preselect);
    goTo(1);
  }));
  $$('.field input').forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') { input.removeAttribute('aria-invalid'); $(input.id === 'first-name' ? '#name-error' : '#phone-error').textContent = ''; }
    });
  });
  $('#contact-form').addEventListener('submit', event => {
    event.preventDefault();
    const inputs = $$('.field input');
    const valid = inputs.map(validateField);
    if (valid.some(value => !value)) { inputs[valid.indexOf(false)].focus(); return; }
    const slots = state.day && state.service ? slotData(state.day) : [];
    if (!slots.some(slot => slot.time === state.time && !slot.disabled)) {
      state.time = null;
      goTo(state.day ? 2 : 1);
      $('#booking-status').textContent = 'Cette heure est passée. Veuillez choisir une nouvelle heure pour la simulation.';
      return;
    }
    state.success = true;
    $('#success-recap').textContent = `${$('#first-name').value.trim()}, votre sélection d’essai : ${state.service.name}, ${fullDate(state.day)} à ${timeLabel(state.time)}.`;
    // Les coordonnées ne figurent que dans le formulaire de cette page, jamais en stockage local.
    goTo(4);
  });
  $('#restart').addEventListener('click', () => {
    Object.assign(state, { step: 0, service: null, day: '', time: null, success: false });
    $('#contact-form').reset();
    $$('.field input').forEach(input => input.removeAttribute('aria-invalid'));
    $('#name-error').textContent = '';
    $('#phone-error').textContent = '';
    $('#success-recap').textContent = '';
    renderServices(); renderDays(); goTo(0);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !state.success && state.step >= 1) {
      if (snapshotDay !== parisNow().day) renderDays();
      if (state.step >= 2) goTo(state.step, false);
    }
  });

  // Entrées une fois : un traitement par type de contenu, sans écouteur de scroll.
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('.menu-column').forEach(column => [...column.querySelectorAll('[data-reveal="row"]')].forEach((row, index) => { row.style.transitionDelay = `${index * 60}ms`; }));
    $$('[data-reveal]').forEach(element => reveals.observe(element));
    const visible = { hero: true, booking: false, footer: false };
    const bar = $('.mobile-bar');
    const updateBar = () => {
      const show = !visible.hero && !visible.booking && !visible.footer;
      bar.classList.toggle('is-visible', show);
      bar.inert = !show;
    };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'hero-actions' ? 'hero' : entry.target.id === 'reserver' ? 'booking' : 'footer';
        visible[key] = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0 });
    ['#hero-actions', '#reserver', '#pied'].forEach(selector => barObserver.observe($(selector)));
    updateBar();
  } else {
    $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
    $('.mobile-bar').classList.add('is-visible');
  }
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
