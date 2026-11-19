/* Coiffure Demet · aperçu local. Aucun envoi, aucun stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const NB = '\u00a0';
  const services = { coupe: 'Coupe femme', coloration: 'Coloration' };
  // Fresha et iCoiffeur : mardi–vendredi 09:00–19:00 ; samedi 09:00–18:00.
  // Points de départ illustratifs, aucune durée ou disponibilité réelle supposée.
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const state = { step: 0, service: null, day: null, time: null };
  const panels = $$('[data-panel]');
  const progress = $$('[data-step]');
  let stepAnimation = null;
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), minutes: +parts.hour * 60 + +parts.minute };
  }
  function key(date) { return date.toISOString().slice(0, 10); }
  function dateFromKey(value) { return new Date(`${value}T12:00:00Z`); }
  function clock(minutes) { return `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + String(minutes % 60).padStart(2, '0') : ''}`; }
  function slotsFor(date, now = parisNow()) {
    const opening = hours[date.getUTCDay()];
    if (!opening || key(date) < key(now.date)) return [];
    const slots = [];
    for (let time = opening[0]; time < opening[1]; time += 60) {
      if (key(date) !== key(now.date) || time > now.minutes) slots.push(time);
    }
    return slots;
  }
  function sync() {
    $('#recap-prestation').textContent = services[state.service] || 'À choisir';
    $('#recap-jour').textContent = state.day ? longDate.format(dateFromKey(state.day)) : 'À choisir';
    $('#recap-heure').textContent = state.time !== null ? clock(state.time) : 'À choisir';
    $('#vers-jour').disabled = !state.service;
    $('#vers-heure').disabled = !state.day;
    $('#vers-recapitulatif').disabled = state.time === null;
    progress.forEach((button, index) => {
      button.disabled = index === 1 ? !state.service : index === 2 ? !state.day : index === 3 ? state.time === null : false;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function recap() {
    return `${services[state.service]}, le ${longDate.format(dateFromKey(state.day))} à ${clock(state.time)}. Cette sélection est illustrative.`;
  }
  function focusPanel(panel) {
    const heading = $('h3', panel);
    heading.focus({ preventScroll: true });
    const box = heading.getBoundingClientRect();
    if (box.top < 16 || box.bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function goTo(step, shouldFocus = true) {
    if (step > 0 && !state.service || step > 1 && !state.day || step > 2 && state.time === null) return;
    if (stepAnimation) stepAnimation.cancel();
    state.step = step;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    if (step === 3) $('#texte-recapitulatif').textContent = recap();
    if (step === 4) $('#texte-fin').textContent = recap();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    sync();
    const activePanel = panels[step];
    if (!reducedMotion.matches && root.dataset.input !== 'clavier' && activePanel.animate) {
      stepAnimation = activePanel.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    if (shouldFocus) focusPanel(activePanel);
    $('#annonce-etape').textContent = step === 4 ? 'Simulation terminée. Aucun rendez-vous n’a été pris.' : `Étape ${step + 1} sur 4${NB}: ${$('h3', activePanel).textContent}`;
  }
  function legend(text) {
    const element = document.createElement('legend');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  }
  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    element.textContent = text;
    return element;
  }
  function choice(name, value, disabled = false) {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    label.append(input);
    return { label, input };
  }
  function renderDays() {
    const now = parisNow();
    const fragment = document.createDocumentFragment();
    fragment.append(legend('Choisir un jour pour la simulation'));
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(now.date);
      date.setUTCDate(date.getUTCDate() + offset);
      const value = key(date);
      const closed = !hours[date.getUTCDay()];
      const ended = !closed && slotsFor(date, now).length === 0;
      const { label, input } = choice('jour', value, closed || ended);
      input.checked = state.day === value;
      label.append(span('choice-day', shortDay.format(date)), span('choice-date', shortDate.format(date)));
      const status = closed ? 'Fermé' : ended ? 'Passé' : offset === 0 ? 'Ce jour' : '';
      if (status) label.append(span('choice-state', status));
      input.addEventListener('change', () => {
        state.day = value;
        state.time = null;
        sync();
      });
      fragment.append(label);
    }
    $('#jours').replaceChildren(fragment);
  }
  function renderSlots() {
    const date = dateFromKey(state.day);
    const now = parisNow();
    const opening = hours[date.getUTCDay()];
    const fragment = document.createDocumentFragment();
    fragment.append(legend('Choisir une heure illustrative'));
    $('#jour-choisi').textContent = longDate.format(date);
    $('#message-heures').textContent = '';
    if (!opening) { state.day = null; state.time = null; return; }
    const available = slotsFor(date, now);
    if (state.time !== null && !available.includes(state.time)) state.time = null;
    for (let time = opening[0]; time < opening[1]; time += 60) {
      const passed = !available.includes(time);
      const { label, input } = choice('heure', String(time), passed);
      label.classList.add('slot');
      input.checked = state.time === time;
      label.append(span('slot-time', clock(time)));
      if (passed) label.append(span('choice-state', 'Passé'));
      input.addEventListener('change', () => { state.time = time; sync(); });
      fragment.append(label);
    }
    $('#heures').replaceChildren(fragment);
    if (!available.length) $('#message-heures').textContent = 'Toutes les heures de cette journée sont passées. Choisissez un autre jour à l’étape précédente.';
  }
  function chooseService(value) {
    state.service = value;
    state.day = null;
    state.time = null;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === value; });
    sync();
  }
  function revealContent() {
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    const rowCounters = new WeakMap();
    $$('[data-reveal]').forEach(element => {
      let rowIndex = 0;
      if (element.dataset.reveal === 'row') {
        rowIndex = rowCounters.get(element.parentElement) || 0;
        rowCounters.set(element.parentElement, rowIndex + 1);
      }
      // Le haut déjà affiché reste lisible ; seules les entrées suivantes sont préparées.
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.classList.add('reveal-ready');
      if (element.dataset.reveal === 'row') element.style.transitionDelay = `${rowIndex * 60}ms`;
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', () => {
      if (!reducedMotion.matches) return;
      observer.disconnect();
      $$('.reveal-ready').forEach(element => element.classList.add('is-visible'));
      if (stepAnimation) stepAnimation.cancel();
    });
  }
  try {
    document.addEventListener('keydown', () => { root.dataset.input = 'clavier'; }, { passive: true });
    document.addEventListener('pointerdown', () => { root.dataset.input = 'pointeur'; }, { passive: true });
    $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => chooseService(input.value)));
    $('#vers-jour').addEventListener('click', () => goTo(1));
    $('#vers-heure').addEventListener('click', () => goTo(2));
    $('#vers-recapitulatif').addEventListener('click', () => {
      if (!slotsFor(dateFromKey(state.day)).includes(state.time)) {
        state.time = null;
        goTo(2);
        $('#message-heures').textContent = 'Cette heure est passée. Choisissez une autre heure.';
      } else goTo(3);
    });
    $('#terminer').addEventListener('click', () => {
      if (!slotsFor(dateFromKey(state.day)).includes(state.time)) {
        state.time = null;
        goTo(2);
        $('#message-heures').textContent = 'Cette heure est passée. Choisissez une autre heure.';
      } else goTo(4);
    });
    $('#recommencer').addEventListener('click', () => { chooseService(null); goTo(0); });
    progress.forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
    $$('[data-service]').forEach(button => button.addEventListener('click', () => {
      chooseService(button.dataset.service);
      goTo(0, false);
      $('#rendez-vous').scrollIntoView({ block: 'start', behavior: reducedMotion.matches || root.dataset.input === 'clavier' ? 'instant' : 'smooth' });
      $('#etape-prestation h3').focus({ preventScroll: true });
    }));
    sync();
    $('#simulation').hidden = false;
    revealContent();
    root.classList.add('js');
    $$('[data-service]').forEach(button => { button.disabled = false; });
  } catch (error) {
    root.classList.remove('js');
    $('#simulation').hidden = true;
    const message = document.createElement('p');
    message.className = 'no-script';
    message.textContent = 'La simulation est indisponible. Pour prendre rendez-vous, appelez le 03 88 30 55 85.';
    $('.booking-heading').after(message);
  }
})();
