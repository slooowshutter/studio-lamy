/* Coup de Tete · aucune requête, aucun stockage, aucun envoi. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const panels = $$('.panel');
  let keyboard = false;
  let panelTimer;

  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('keyboard-action');
  }, true);
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-action');
  }, true);

  function openPanel(id, moveFocus = false) {
    const target = panels.find(panel => panel.id === id);
    if (!target) return;
    clearTimeout(panelTimer);
    // Le focus quitte sa provenance avant que celle-ci devienne inerte.
    if (moveFocus) $('.panel-trigger', target).focus({ preventScroll: true });
    panels.forEach(panel => {
      const open = panel === target;
      panel.classList.toggle('is-open', open);
      $('.panel-trigger', panel).setAttribute('aria-expanded', String(open));
      $('.panel-body', panel).inert = !open;
    });
    panelTimer = setTimeout(() => {
      if (!target.classList.contains('is-open')) return;
      const trigger = $('.panel-trigger', target);
      const bounds = trigger.getBoundingClientRect();
      if (moveFocus || bounds.top < 0 || bounds.bottom > window.innerHeight - 90) {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, reduced.matches || keyboard ? 0 : 310);
  }

  panels.forEach((panel, index) => {
    panel.classList.toggle('is-open', index === 0);
    $('.panel-trigger', panel).setAttribute('aria-expanded', String(index === 0));
    $('.panel-body', panel).inert = index !== 0;
    $('.panel-trigger', panel).addEventListener('click', () => openPanel(panel.id));
    $('.panel-trigger', panel).addEventListener('keydown', event => {
      let destination;
      if (event.key === 'ArrowDown') destination = (index + 1) % panels.length;
      if (event.key === 'ArrowUp') destination = (index + panels.length - 1) % panels.length;
      if (event.key === 'Home') destination = 0;
      if (event.key === 'End') destination = panels.length - 1;
      if (destination !== undefined) {
        event.preventDefault();
        $('.panel-trigger', panels[destination]).focus();
      }
    });
  });
  root.classList.add('enhanced');
  $$('[data-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    openPanel(link.dataset.open, true);
    history.replaceState(null, '', `#${link.dataset.open}`);
  }));
  window.addEventListener('hashchange', () => {
    if (panels.some(panel => `#${panel.id}` === location.hash)) openPanel(location.hash.slice(1), true);
  });
  if (panels.some(panel => `#${panel.id}` === location.hash)) openPanel(location.hash.slice(1));

  if (!reduced.matches && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    $$('.reveal').forEach((element, index) => {
      element.style.transitionDelay = `${index % 7 * 50}ms`;
      observer.observe(element);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  }

  // Les plages viennent des annuaires. Aucun prix ni durée ne sont supposés.
  const hours = [null, null, [540, 1080], [540, 1080], [540, 1080], [540, 1140], [480, 960]];
  const services = {
    coupe: 'Coupe femme', enfant: 'Coiffure enfant', coloration: 'Coloration',
    meches: 'Mèches', chignon: 'Chignon', permanente: 'Permanente'
  };
  const state = { service: '', date: '', time: null, page: 0, completed: false };
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const longFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const parisClock = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const pages = $$('.booking-step');
  const stepButtons = $$('[data-step]');
  const form = $('#trial-form');
  let stepFrame;

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisClock.formatToParts(date).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const utcDay = key => new Date(`${key}T12:00:00Z`);
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const nextDays = () => {
    const first = utcDay(parisNow().key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(first);
      date.setUTCDate(first.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    });
  };
  function slotsFor(key, now = parisNow()) {
    const range = hours[utcDay(key).getUTCDay()];
    if (!range || key < now.key) return [];
    const values = [];
    for (let minute = range[0]; minute < range[1]; minute += 60) {
      values.push({ minute, past: key === now.key && minute <= now.minutes });
    }
    return values;
  }
  function validDate(key) {
    return nextDays().includes(key) && Boolean(hours[utcDay(key).getUTCDay()]);
  }
  function validTime() {
    return validDate(state.date) && slotsFor(state.date).some(slot => slot.minute === state.time && !slot.past);
  }
  function choiceLabel(type, value, className) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = type;
    input.value = value;
    label.append(input);
    return { label, input };
  }
  function renderDays() {
    const field = $('.days');
    $$('label', field).forEach(label => label.remove());
    nextDays().forEach(key => {
      const date = utcDay(key);
      const open = Boolean(hours[date.getUTCDay()]);
      const { label, input } = choiceLabel('jour', key, 'day-choice');
      input.disabled = !open;
      input.checked = state.date === key;
      input.setAttribute('aria-label', `${longFormatter.format(date)}${open ? ', essai seulement' : ', fermé'}`);
      const weekday = document.createElement('span');
      weekday.textContent = dayFormatter.format(date);
      const day = document.createElement('strong');
      day.textContent = date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = open ? monthFormatter.format(date) : 'Fermé';
      label.append(weekday, day, month);
      input.addEventListener('change', () => {
        if (state.date !== key) state.time = null;
        state.date = key;
        renderSlots();
        updateSummary();
      });
      field.append(label);
    });
  }
  function renderSlots() {
    const field = $('.slots');
    $$('label', field).forEach(label => label.remove());
    if (!state.date) return;
    const values = slotsFor(state.date);
    values.forEach(slot => {
      const { label, input } = choiceLabel('heure', String(slot.minute), 'slot-choice');
      input.disabled = slot.past;
      input.checked = state.time === slot.minute;
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}${slot.past ? ', heure passée' : ', heure fictive'}`);
      const caption = document.createElement('span');
      caption.textContent = timeLabel(slot.minute);
      label.append(caption);
      input.addEventListener('change', () => { state.time = slot.minute; updateSummary(); });
      field.append(label);
    });
    $('.empty-slots').hidden = values.some(slot => !slot.past);
  }
  function updateSummary() {
    $('#selection-service').textContent = services[state.service] || 'À choisir';
    $('#selection-date').textContent = state.date ? shortFormatter.format(utcDay(state.date)) : 'À choisir';
    $('#selection-time').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.date;
    $('[data-next="3"]').disabled = state.time === null;
    stepButtons.forEach((button, index) => {
      const allowed = index === 0 || index === 1 && state.service || index === 2 && state.date || index === 3 && state.time !== null;
      button.disabled = state.completed || !allowed;
      if (index === state.page) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function go(page, announce = true) {
    cancelAnimationFrame(stepFrame);
    if (page >= 1 && !state.service) page = 0;
    if (page >= 2 && !validDate(state.date)) {
      state.date = ''; state.time = null; page = 1;
    }
    if (page >= 3 && !validTime()) {
      state.time = null; page = 2;
    }
    if (page === 1) renderDays();
    if (page === 2) renderSlots();
    state.page = page;
    pages.forEach((element, index) => {
      element.hidden = page !== index;
      element.classList.remove('is-entering');
    });
    const current = pages[page];
    if (announce && !reduced.matches && !keyboard) {
      current.classList.add('is-entering');
      // Une seule mesure au changement d’étape, jamais de mesure par image.
      current.getBoundingClientRect();
      stepFrame = requestAnimationFrame(() => current.classList.remove('is-entering'));
    }
    updateSummary();
    if (announce) {
      $('h3', current).focus({ preventScroll: true });
      $('h3', current).scrollIntoView({ behavior: 'instant', block: 'nearest' });
      $('#booking-status').textContent = page === 4 ? 'Simulation terminée. Aucun rendez-vous réservé.' : `Étape ${page + 1} sur 4. ${$('h3', current).textContent}`;
    }
  }
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => {
    state.service = input.value;
    updateSummary();
  }));
  $$('[data-service]').forEach(button => button.addEventListener('click', () => {
    state.completed = false;
    state.service = button.dataset.service;
    $(`input[name="prestation"][value="${state.service}"]`).checked = true;
    go(0, false);
    openPanel('rendez-vous', true);
  }));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => go(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.step))));

  function validate(input) {
    let message = '';
    if (input.id === 'prenom' && (!input.value.trim() || !/\p{L}/u.test(input.value))) message = 'Indiquez un prénom contenant au moins une lettre.';
    if (input.id === 'telephone') {
      const phone = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone)) message = 'Indiquez un numéro français de dix chiffres, ou avec +33.';
    }
    $(`#erreur-${input.id}`).textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }
  const fields = $$('input', form);
  fields.forEach(input => {
    input.addEventListener('blur', () => validate(input));
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        $(`#erreur-${input.id}`).textContent = '';
      }
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const invalid = fields.filter(input => !validate(input));
    if (invalid.length) {
      invalid[0].focus();
      $('#booking-status').textContent = 'Vérifiez les champs indiqués dans le formulaire.';
      return;
    }
    if (!validTime()) {
      go(2);
      $('#booking-status').textContent = 'Cette heure est passée. Choisissez une autre heure d’essai.';
      return;
    }
    $('#result-recap').textContent = `Votre essai\u00a0: ${services[state.service]}, ${longFormatter.format(utcDay(state.date))}, à ${timeLabel(state.time)}. Coup de Tete, 4 avenue Aristide Briand, Strasbourg.`;
    // Les coordonnées ne figurent pas dans le résultat et sont effacées immédiatement.
    form.reset();
    state.completed = true;
    go(4);
  });
  $('#restart').addEventListener('click', () => {
    Object.assign(state, { service: '', date: '', time: null, completed: false });
    $$('input[name="prestation"]').forEach(input => { input.checked = false; });
    form.reset();
    fields.forEach(input => {
      input.removeAttribute('aria-invalid');
      $(`#erreur-${input.id}`).textContent = '';
    });
    go(0);
  });
  // Recalcul à la reprise d’un onglet : fuseau, jour et heures passées restent justes.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.completed) return;
    if (state.date && !validDate(state.date)) { state.date = ''; state.time = null; }
    if (state.time !== null && !validTime()) state.time = null;
    go(state.page, false);
  });
  renderDays();
  go(0, false);
  $('.booking-app').hidden = false;
})();
