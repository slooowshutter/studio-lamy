/* Bruno Côté Salon — aperçu non officiel. Aucun envoi, aucun stockage. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  // Durées : carte Planity consultée le 13/11/2026. Aucun tarif dans la simulation.
  const services = {
    'co-wash': { name: 'Co-wash', duration: 15 },
    essentiel: { name: 'Soin essentiel', duration: 10 },
    modelage: { name: 'Modelage cranien', duration: 30 }
  };
  // Minutes depuis minuit à Paris. Planity : mar–ven 10 h–19 h, sam 9 h–16 h.
  const hours = { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [540, 960] };
  const state = { step: 0, service: '', date: '', time: null, success: false };
  const form = $('#booking-form');
  const panels = $$('.booking-step');
  const dayList = $('#days');
  const slotList = $('#slots');
  const status = $('#booking-status');
  const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const pad = number => String(number).padStart(2, '0');
  const dayKey = date => date.toISOString().slice(0, 10);
  const dayFromKey = key => new Date(`${key}T12:00:00Z`);
  const hourText = minutes => `${Math.floor(minutes / 60)}${NB}h${minutes % 60 ? NB + pad(minutes % 60) : ''}`;
  let keyboard = false;
  let entryFrames = new WeakMap();

  function parisNow() {
    const parts = Object.fromEntries(parisFormat.formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function slotsFor(key, serviceKey, now = parisNow()) {
    const date = dayFromKey(key);
    const opening = hours[date.getUTCDay()];
    if (!opening || !services[serviceKey] || key < now.key) return [];
    const duration = services[serviceKey].duration;
    const seed = Math.floor(date.getTime() / 86400000);
    const result = [];
    for (let start = opening[0], index = 0; start + duration <= opening[1]; start += 30, index++) {
      const past = key === now.key && start <= now.minutes;
      const unavailable = (seed + index * 3) % 7 === 0;
      result.push({ start, disabled: past || unavailable, reason: past ? 'heure passée' : unavailable ? 'indisponibilité fictive' : '' });
    }
    return result;
  }

  function announce(message) { status.textContent = message; }

  function enter(element) {
    const previous = entryFrames.get(element);
    if (previous) cancelAnimationFrame(previous);
    element.classList.remove('is-entering');
    if (reduce.matches || keyboard) return;
    element.classList.add('is-entering');
    entryFrames.set(element, requestAnimationFrame(() => {
      entryFrames.set(element, requestAnimationFrame(() => element.classList.remove('is-entering')));
    }));
  }

  function makeChoice(group, value, labelText, disabled, accessibleName) {
    const wrapper = document.createElement('div');
    wrapper.className = `choice ${group === 'jour' ? 'day-choice' : 'slot-choice'}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.value = String(value);
    input.id = `${group}-${String(value).replace(/[^a-z0-9-]/g, '')}`;
    input.disabled = disabled;
    input.setAttribute('aria-label', accessibleName);
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = labelText;
    wrapper.append(input, label);
    return { wrapper, input, label };
  }

  function renderDays() {
    const now = parisNow();
    const today = dayFromKey(now.key);
    if (state.date && !slotsFor(state.date, state.service, now).some(slot => !slot.disabled)) {
      state.date = '';
      state.time = null;
    }
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + index);
      const key = dayKey(date);
      const closed = !hours[date.getUTCDay()];
      const exhausted = !closed && !slotsFor(key, state.service, now).some(slot => !slot.disabled);
      const reason = closed ? 'fermé' : exhausted ? 'écoulé' : 'exemple';
      const choice = makeChoice('jour', key, '', closed || exhausted, `${fullDate.format(date)}, ${reason}`);
      choice.input.checked = state.date === key && !choice.input.disabled;
      const weekday = document.createElement('span');
      weekday.textContent = shortDay.format(date);
      const number = document.createElement('span');
      number.className = 'day-number';
      number.textContent = date.getUTCDate();
      const month = document.createElement('span');
      month.textContent = shortMonth.format(date);
      const caption = document.createElement('span');
      caption.className = 'day-state';
      caption.textContent = reason;
      choice.label.append(weekday, number, month, caption);
      fragment.append(choice.wrapper);
    }
    dayList.replaceChildren(fragment);
  }

  function renderSlots() {
    const fragment = document.createDocumentFragment();
    const slots = slotsFor(state.date, state.service);
    let available = 0;
    slots.forEach(slot => {
      if (!slot.disabled) available++;
      const text = hourText(slot.start);
      const choice = makeChoice('heure', slot.start, text, slot.disabled, `${text}, ${slot.reason || 'créneau fictif disponible'}`);
      choice.input.checked = state.time === slot.start && !slot.disabled;
      fragment.append(choice.wrapper);
    });
    slotList.replaceChildren(fragment);
    $('#slot-description').textContent = `${fullDate.format(dayFromKey(state.date))}. ${available} créneau${available > 1 ? 'x' : ''} de démonstration.`;
    $('#slots-note').textContent = available ? 'Les cases barrées illustrent une indisponibilité fictive ou une heure passée. Horaires de Paris, sans lien avec l’agenda du salon.' : 'Aucun créneau de démonstration restant pour ce jour. Choisissez un autre jour.';
  }

  function selectedSummary() {
    if (!state.service || !state.date || state.time === null) return '';
    return `${services[state.service].name} · ${fullDate.format(dayFromKey(state.date))} à ${hourText(state.time)}.`;
  }

  function updateSummary() {
    const values = [
      ['#summary-service', state.service ? services[state.service].name : '', 0],
      ['#summary-day', state.date ? fullDate.format(dayFromKey(state.date)) : '', 1],
      ['#summary-time', state.time !== null ? hourText(state.time) : '', 2]
    ];
    values.forEach(([selector, text, index]) => {
      const element = $(selector);
      const content = text || 'À choisir';
      if (element.textContent !== content) { element.textContent = content; enter(element); }
      element.classList.toggle('unset', !text);
      $(`[data-edit="${index}"]`).hidden = !text || state.success;
    });
    $$('.step-nav button').forEach((button, index) => {
      button.disabled = state.success || (index === 1 && !state.service) || (index === 2 && !state.date) || (index === 3 && state.time === null);
      if (index === state.step && !state.success) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('[data-next="1"]').disabled = !state.service;
    $('[data-next="2"]').disabled = !state.date;
    $('[data-next="3"]').disabled = state.time === null;
    $('#final-recap').textContent = `Votre essai : ${selectedSummary()}`;
    $('#mobile-selection').hidden = !state.service || state.success;
    const compactDate = state.date ? new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dayFromKey(state.date)) : 'Jour à choisir';
    $('#mobile-summary').textContent = state.service ? `${services[state.service].name} · ${compactDate} · ${state.time !== null ? hourText(state.time) : 'Heure à choisir'}` : '';
  }

  function showStep(step, focus = true) {
    if ((step >= 1 && !state.service) || (step >= 2 && !state.date) || (step >= 3 && state.time === null)) return;
    state.step = step;
    state.success = false;
    form.hidden = false;
    $('#booking-success').hidden = true;
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    const current = panels[step];
    updateSummary();
    enter(current);
    if (focus) $('h3', current).focus({ preventScroll: true });
    announce(`Simulation, étape ${step + 1} sur 4 : ${$('h3', current).textContent}`);
    if (focus) current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function slotStillValid() {
    return slotsFor(state.date, state.service).some(slot => slot.start === state.time && !slot.disabled);
  }

  function nextStep(step) {
    if (step === 3 && !slotStillValid()) {
      state.time = null;
      showStep(2);
      announce('L’heure choisie est passée. Choisissez un autre créneau de démonstration.');
      return;
    }
    showStep(step);
  }

  function validateField(id, valid, message) {
    const input = $(`#${id}`);
    input.setAttribute('aria-invalid', String(!valid));
    $(`#${id}-error`).textContent = valid ? '' : message;
    return valid;
  }

  function setupBooking() {
    form.addEventListener('change', event => {
      const input = event.target;
      if (input.name === 'soin' && services[input.value]) {
        state.service = input.value;
        state.date = '';
        state.time = null;
        announce(`${services[input.value].name} sélectionné pour la simulation.`);
      } else if (input.name === 'jour') {
        state.date = input.value;
        state.time = null;
        announce(`${fullDate.format(dayFromKey(state.date))} sélectionné pour la simulation.`);
      } else if (input.name === 'heure') {
        state.time = Number(input.value);
        announce(`${hourText(state.time)} sélectionné pour la simulation.`);
      }
      updateSummary();
    });
    $$('[data-next]').forEach(button => button.addEventListener('click', () => nextStep(Number(button.dataset.next))));
    $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
    $$('[data-step]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
    $$('[data-edit]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.edit))));
    $('#mobile-edit').addEventListener('click', () => showStep(0));
    $$('[data-select]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.select;
      if (!services[key]) return;
      const input = $(`input[name="soin"][value="${key}"]`);
      input.checked = true;
      state.service = key;
      state.date = '';
      state.time = null;
      showStep(1);
    }));
    ['prenom', 'telephone'].forEach(id => {
      $(`#${id}`).addEventListener('input', () => {
        if ($(`#${id}`).getAttribute('aria-invalid') === 'true') {
          $(`#${id}`).removeAttribute('aria-invalid');
          $(`#${id}-error`).textContent = '';
        }
      });
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (state.step < 3) {
        const next = $(`[data-next="${state.step + 1}"]`);
        if (next && !next.disabled) nextStep(state.step + 1);
        return;
      }
      const firstName = $('#prenom').value.trim();
      const phone = $('#telephone').value.replace(/[\s.()\-]/g, '');
      const nameValid = validateField('prenom', /\p{L}/u.test(firstName), 'Indiquez un prénom, fictif pour cet essai.');
      const phoneValid = validateField('telephone', /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone), 'Indiquez un numéro français de 10 chiffres ou commençant par +33.');
      if (!nameValid || !phoneValid) {
        (nameValid ? $('#telephone') : $('#prenom')).focus();
        announce('Vérifiez les champs signalés avant de terminer la simulation.');
        return;
      }
      if (!slotStillValid()) {
        state.time = null;
        showStep(1);
        announce('Ce créneau est passé. Choisissez un autre jour et une autre heure de démonstration.');
        return;
      }
      state.success = true;
      form.hidden = true;
      const success = $('#booking-success');
      success.hidden = false;
      $('#success-recap').textContent = `${firstName}, voici votre sélection fictive : ${selectedSummary()}`;
      $('#telephone').value = '';
      $('#prenom').value = '';
      updateSummary();
      enter(success);
      $('#titre-succes').focus({ preventScroll: true });
      success.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      announce('Simulation terminée. Aucun rendez-vous n’a été pris. Aucune coordonnée n’a été envoyée.');
    });
    $('#restart').addEventListener('click', () => {
      form.reset();
      state.service = '';
      state.date = '';
      state.time = null;
      state.success = false;
      ['prenom', 'telephone'].forEach(id => { $(`#${id}`).removeAttribute('aria-invalid'); $(`#${id}-error`).textContent = ''; });
      showStep(0);
    });
    updateSummary();
  }

  function setupMotion() {
    const reveals = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce.matches) {
      reveals.forEach(element => element.classList.add('is-visible'));
    } else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
      $$('.service-small').forEach((element, index) => { element.style.transitionDelay = `${index * 60}ms`; });
      reveals.forEach(element => observer.observe(element));
      reduce.addEventListener('change', event => {
        if (event.matches) { observer.disconnect(); reveals.forEach(element => element.classList.add('is-visible')); }
      });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-lit')));
  }

  function setupMobileBar() {
    const bar = $('.mobile-bar');
    if (!('IntersectionObserver' in window)) return;
    const visibility = { hero: true, booking: false, footer: false };
    const targets = new Map([[$('#actions-hero'), 'hero'], [$('#rendez-vous'), 'booking'], [$('#pied'), 'footer']]);
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { visibility[targets.get(entry.target)] = entry.isIntersecting; });
      const show = !visibility.hero && !visibility.booking && !visibility.footer;
      bar.classList.toggle('is-visible', show);
      bar.inert = !show;
    }, { threshold: 0 });
    bar.inert = true;
    targets.forEach((value, element) => observer.observe(element));
  }

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard');
    }
  }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, true);
  try {
    setupBooking();
    root.classList.add('js');
    setupMotion();
    setupMobileBar();
  } catch (error) {
    root.classList.remove('js');
    const notice = document.createElement('p');
    notice.className = 'noscript';
    notice.textContent = 'La simulation est indisponible. Pour un vrai rendez-vous, appelez le 04 72 41 99 08 ou consultez Planity.';
    $('.booking-panel').prepend(notice);
  }
})();
