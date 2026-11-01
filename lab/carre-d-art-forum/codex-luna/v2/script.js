(() => {
  'use strict';

  const doc = document;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  doc.documentElement.classList.add('js');
  const nameReveal = $('[data-name-reveal]');
  if (nameReveal) requestAnimationFrame(() => nameReveal.classList.add('is-in'));

  // Navigation mobile : ouverture explicite, fermeture avec Échap et retour du focus.
  const menuButton = $('.menu-toggle');
  const nav = $('#main-nav');
  if (menuButton && nav) {
    const closeMenu = (restoreFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      if (restoreFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      if (open) $('a', nav)?.focus({ preventScroll: true });
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
      if (event.matches) closeMenu(false);
    });
  }

  // Les lignes de prix apparaissent une fois, en lisant la page.
  const serviceRows = $$('.service-row');
  if ('IntersectionObserver' in window) {
    const revealRows = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealRows.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    serviceRows.forEach((row) => revealRows.observe(row));
  } else {
    serviceRows.forEach((row) => row.classList.add('is-in'));
  }

  // Barre d’appel mobile : apparaît après le premier écran, jamais sur la réservation ni le pied.
  const stickyActions = $('[data-sticky]');
  if (stickyActions) {
    stickyActions.hidden = false;
    if ('IntersectionObserver' in window) {
      const visible = { hero: true, booking: false, footer: false };
      const updateSticky = () => stickyActions.classList.toggle('is-on', !visible.hero && !visible.booking && !visible.footer);
      const observe = (selector, key, rootMargin = '0px') => {
        const target = $(selector);
        if (!target) return;
        const observer = new IntersectionObserver(([entry]) => {
          visible[key] = entry.isIntersecting;
          updateSticky();
        }, { rootMargin, threshold: 0 });
        observer.observe(target);
      };
      observe('.hero__actions', 'hero');
      observe('#reserver', 'booking', '-12% 0px -12% 0px');
      observe('.site-footer', 'footer', '-8% 0px -8% 0px');
    }
  }

  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;

  const services = [
    { id: 'brushing', name: 'Shampooing + brushing, cheveux courts', short: 'Brushing cheveux courts', detail: 'Cheveux courts', duration: 30, price: 30, from: true },
    { id: 'coupe-entretien', name: 'Coupe entretien + brushing', short: 'Coupe entretien', detail: 'Shampooing inclus', duration: 45, price: 55, from: true },
    { id: 'coupe-stylee', name: 'Coupe stylisée + brushing', short: 'Coupe stylisée', detail: 'Shampooing inclus', duration: 60, price: 70, from: true },
    { id: 'coupe-homme', name: 'Coupe entretien + coiffage, homme', short: 'Coupe homme', detail: 'Shampooing inclus · coiffage', duration: 30, price: 32, from: false },
    { id: 'barbe', name: 'Entretien de barbe', short: 'Entretien de barbe', detail: 'Barbier', duration: 30, price: 25, from: false },
    { id: 'couleur', name: 'Couleur + shampooing + brushing', short: 'Couleur', detail: 'Shampooing inclus', duration: 120, price: 75, from: true },
    { id: 'meches', name: 'Mèches + shampooing + brushing', short: 'Mèches', detail: 'Shampooing inclus', duration: 165, price: 105, from: true }
  ];
  const serviceById = (id) => services.find((service) => service.id === id);
  const state = { step: 1, maxStep: 1, service: '', day: '', time: null };
  const nb = '\u00a0';
  const hours = {
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 18 * 60]
  };
  const panels = $$('.booking-panel', form);
  const chips = $$('.step-chip', form);
  const live = $('[data-live]', form);
  const dateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

  const pad = (value) => String(value).padStart(2, '0');
  const localISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeText = (minutes) => `${Math.floor(minutes / 60)}${nb}h${nb}${pad(minutes % 60)}`;
  const durationText = (minutes) => minutes < 60 ? `${minutes}${nb}min` : `${Math.floor(minutes / 60)}${nb}h${minutes % 60 ? ` ${pad(minutes % 60)}` : ''}`;
  const moneyText = (service) => `${service.from ? 'dès ' : ''}${service.price}${nb}€`;
  const cleanDate = (date) => dateLong.format(date).replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR'));
  const dates = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return { index, date, iso: localISO(date), weekday: date.getDay() };
    });
  })();
  const dateByISO = (iso) => dates.find((day) => day.iso === iso);

  const stableHash = (text) => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  function slotsFor(day, service) {
    const range = hours[day.weekday];
    if (!range) return [];
    const now = new Date();
    const today = day.iso === localISO(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const slots = [];
    for (let start = range[0]; start + service.duration <= range[1]; start += 30) {
      const past = today && start <= currentMinutes;
      const taken = stableHash(`${day.iso}|${start}|carre-forum`) % 7 === 0;
      slots.push({ start, past, taken, available: !past && !taken });
    }
    return slots;
  }

  function renderServices() {
    const target = $('[data-services]', form);
    target.innerHTML = services.map((service, index) => `
      <label class="booking-option">
        <input type="radio" name="service" value="${service.id}">
        <span class="booking-option__name">${service.name}<small>${durationText(service.duration)} · ${service.detail}</small></span>
        <span class="booking-option__price">${moneyText(service)}</span>
      </label>`).join('');
  }

  function renderDays() {
    const service = serviceById(state.service) || services[0];
    $('[data-days]', form).innerHTML = dates.map((day) => {
      const closed = !hours[day.weekday];
      const slots = closed ? [] : slotsFor(day, service);
      const noOpenSlot = !closed && !slots.some((slot) => slot.available);
      const disabled = closed || noOpenSlot;
      const weekday = dateShort.format(day.date).replace('.', '');
      const tag = closed ? 'fermé' : day.index === 0 ? 'auj.' : day.index === 1 ? 'demain' : '';
      const label = `${cleanDate(day.date)}${closed ? ', fermé' : noOpenSlot ? ', aucun créneau disponible' : ''}`;
      return `<label class="date-option">
        <input type="radio" name="day" value="${day.iso}" aria-label="${label}"${disabled ? ' disabled' : ''}${state.day === day.iso && !disabled ? ' checked' : ''}>
        <span><b class="date-option__weekday">${weekday}</b><b class="date-option__date">${day.date.getDate()}</b><small class="date-option__tag">${tag || '&nbsp;'}</small></span>
      </label>`;
    }).join('');
    if (state.day && !$(`input[name="day"][value="${state.day}"]:not(:disabled)`, form)) {
      state.day = '';
      state.time = null;
    }
  }

  function renderSlots() {
    const service = serviceById(state.service);
    const day = dateByISO(state.day);
    const target = $('[data-slots]', form);
    if (!service || !day) {
      target.innerHTML = '';
      return;
    }
    const slots = slotsFor(day, service);
    const freeCount = slots.filter((slot) => slot.available).length;
    $('[data-slots-note]', form).textContent = `${cleanDate(day.date)}${nb}: ${freeCount} créneau${freeCount > 1 ? 'x' : ''} affiché${freeCount > 1 ? 's' : ''} pour ${durationText(service.duration)}. Certains horaires déjà pris sont désactivés.`;
    if (!freeCount) {
      target.innerHTML = '<p class="slots-empty">Aucun horaire ne convient pour cette prestation ce jour-là. Choisissez une autre date.</p>';
      state.time = null;
      return;
    }
    const groups = [
      ['Matin', 0, 720],
      ['Après-midi', 720, 1020],
      ['Fin de journée', 1020, 1440]
    ];
    target.innerHTML = groups.map(([label, start, end], groupIndex) => {
      const group = slots.filter((slot) => slot.start >= start && slot.start < end);
      if (!group.length) return '';
      return `<div class="slot-group" role="group" aria-labelledby="slot-group-${groupIndex}">
        <h4 id="slot-group-${groupIndex}">${label}</h4>
        <div class="slot-grid">${group.map((slot) => {
          const status = slot.past ? ', horaire passé' : slot.taken ? ', déjà pris' : '';
          const disabled = !slot.available;
          return `<label class="slot-option">
            <input type="radio" name="time" value="${slot.start}" aria-label="${timeText(slot.start)}${status}"${disabled ? ' disabled' : ''}${state.time === slot.start && !disabled ? ' checked' : ''}>
            <span>${timeText(slot.start)}</span>
          </label>`;
        }).join('')}</div>
      </div>`;
    }).join('');
    if (state.time != null && !slots.some((slot) => slot.start === state.time && slot.available)) state.time = null;
  }

  function updateSelection() {
    const service = serviceById(state.service);
    const day = dateByISO(state.day);
    const values = {
      service: service ? service.short : 'à choisir',
      day: day ? cleanDate(day.date) : 'à choisir',
      time: state.time == null ? 'à choisir' : timeText(state.time),
      price: service ? `${moneyText(service)} · indicatif` : 'selon le service'
    };
    Object.entries(values).forEach(([key, value]) => {
      const output = $(`[data-selected="${key}"]`);
      if (output) output.textContent = value;
    });
    const empty = $('[data-empty]');
    if (empty) empty.hidden = Boolean(service);
    const selectionStep = $('[data-selection] .selection-card__bottom span:last-child');
    if (selectionStep) selectionStep.textContent = state.step >= 5 ? '04 / 04' : `${String(state.step).padStart(2, '0')} / 04`;
  }

  function updateRecap() {
    const service = serviceById(state.service);
    const day = dateByISO(state.day);
    if (!service || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML = `<strong>${service.name}</strong><span>${cleanDate(day.date)} · ${timeText(state.time)}</span><small>${durationText(service.duration)} · ${moneyText(service)} (tarif indicatif, à confirmer).</small>`;
  }

  function transitionTo(panel, back = false) {
    panel.hidden = false;
    panel.classList.add(back ? 'is-enter-back' : 'is-enter');
    panel.getBoundingClientRect();
    requestAnimationFrame(() => panel.classList.remove('is-enter', 'is-enter-back'));
  }

  function goTo(step, options = {}) {
    const previous = state.step;
    state.step = step;
    state.maxStep = Math.max(state.maxStep, Math.min(step, 4));
    if (step === 2) renderDays();
    if (step === 3) renderSlots();
    if (step === 4) updateRecap();
    let currentPanel;
    panels.forEach((panel) => {
      const panelStep = Number(panel.dataset.panel);
      if (panelStep === step) {
        currentPanel = panel;
        if (panelStep !== previous || panel.hidden) transitionTo(panel, step < previous);
      } else {
        panel.hidden = true;
      }
    });
    chips.forEach((chip) => {
      const chipStep = Number(chip.dataset.goto);
      if (chipStep === step) chip.setAttribute('aria-current', 'step');
      else chip.removeAttribute('aria-current');
      chip.disabled = step === 5 || chipStep > state.maxStep;
    });
    $$('[data-error]', form).forEach((error) => { error.hidden = true; });
    updateSelection();
    if (!currentPanel || options.silent) return;
    if (live) live.textContent = step === 5 ? 'La fiche de rendez-vous est prête. Rien n’a été envoyé.' : `Étape ${step} sur 4${nb} : ${['', 'la prestation', 'le jour', 'l’heure', 'vos coordonnées'][step]}.`;
    const title = $('.panel-title', currentPanel);
    title?.focus({ preventScroll: true });
    if (!options.noScroll) {
      const formRect = form.getBoundingClientRect();
      if (formRect.top < 0 || formRect.top > window.innerHeight * .55) {
        form.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }

  function showError(step) {
    const error = $(`[data-error="${step}"]`, form);
    if (error) error.hidden = false;
    const panel = $(`[data-panel="${step}"]`, form);
    panel?.setAttribute('aria-describedby', `error-${step}`);
    const input = $('input:not(:disabled)', panel);
    input?.focus();
  }

  function nextStep() {
    if (state.step === 1 && !state.service) return showError(1);
    if (state.step === 2 && !state.day) return showError(2);
    if (state.step === 3 && state.time == null) return showError(3);
    if (state.step < 4) goTo(state.step + 1);
  }

  renderServices();
  updateSelection();
  goTo(1, { silent: true });

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'service') {
      state.service = input.value;
      state.day = '';
      state.time = null;
      state.maxStep = 2;
    } else if (input.name === 'day') {
      state.day = input.value;
      state.time = null;
      state.maxStep = 3;
    } else if (input.name === 'time') {
      state.time = Number(input.value);
      state.maxStep = Math.max(state.maxStep, 4);
    }
    if (input.name === 'service' || input.name === 'day' || input.name === 'time') {
      const currentStep = input.name === 'service' ? 1 : input.name === 'day' ? 2 : 3;
      const error = $(`[data-error="${currentStep}"]`, form);
      if (error) error.hidden = true;
      $(`[data-panel="${currentStep}"]`, form)?.removeAttribute('aria-describedby');
      chips.forEach((chip) => { chip.disabled = Number(chip.dataset.goto) > state.maxStep; });
      updateSelection();
    }
  });

  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-next]')) nextStep();
    else if (event.target.closest('[data-prev]')) goTo(Math.max(1, state.step - 1));
    else if (event.target.closest('[data-restart]')) {
      form.reset();
      Object.assign(state, { step: 1, maxStep: 1, service: '', day: '', time: null });
      ['guest-name', 'guest-phone'].forEach((id) => {
        const field = $(`#${id}`, form);
        field?.removeAttribute('aria-invalid');
      });
      $$('[data-error], #error-name, #error-phone', form).forEach((error) => { error.hidden = true; });
      $('[data-recap]', form).innerHTML = '';
      goTo(1);
    }
  });

  chips.forEach((chip) => chip.addEventListener('click', () => {
    const target = Number(chip.dataset.goto);
    if (target <= state.maxStep && state.step !== 5) goTo(target);
  }));

  $$('[data-book]').forEach((button) => button.addEventListener('click', () => {
    const service = serviceById(button.dataset.book);
    if (!service) return;
    const radio = $(`input[name="service"][value="${service.id}"]`, form);
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    goTo(2);
  }));

  const nameField = $('#guest-name', form);
  const phoneField = $('#guest-phone', form);
  const setFieldError = (field, errorId, invalid) => {
    const error = $(`#${errorId}`, form);
    if (error) error.hidden = !invalid;
    field.setAttribute('aria-invalid', String(invalid));
    return !invalid;
  };
  const validFrenchMobile = (value) => /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(value.replace(/[\s.\-()]/g, ''));

  nameField.addEventListener('blur', () => {
    if (nameField.value) setFieldError(nameField, 'error-name', !nameField.value.trim());
  });
  phoneField.addEventListener('blur', () => {
    if (phoneField.value) setFieldError(phoneField, 'error-phone', !validFrenchMobile(phoneField.value));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < 4) {
      nextStep();
      return;
    }
    if (state.step !== 4) return;
    const nameValid = setFieldError(nameField, 'error-name', !nameField.value.trim());
    const phoneValid = setFieldError(phoneField, 'error-phone', !validFrenchMobile(phoneField.value));
    if (!nameValid) { nameField.focus(); return; }
    if (!phoneValid) { phoneField.focus(); return; }
    const service = serviceById(state.service);
    const day = dateByISO(state.day);
    if (!service || !day || state.time == null) return;
    $('[data-success-title]', form).textContent = `Fiche d’essai prête, ${nameField.value.trim()}.`;
    $('[data-success-recap]', form).textContent = `${service.name} · ${cleanDate(day.date)} à ${timeText(state.time)} · ${durationText(service.duration)} · ${moneyText(service)} (indicatif).`;
    goTo(5);
  });

  $$('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    const liveStatus = $('[data-copy-live]');
    const address = button.dataset.copy;
    try {
      await navigator.clipboard.writeText(address);
      button.firstChild.textContent = 'Adresse copiée ';
      if (liveStatus) liveStatus.textContent = 'Adresse copiée dans le presse-papiers.';
    } catch (_) {
      if (liveStatus) liveStatus.textContent = `Copie impossible. Adresse : ${address}`;
    }
    window.setTimeout(() => { button.firstChild.textContent = 'Copier l’adresse '; }, 2200);
  }));
})();
