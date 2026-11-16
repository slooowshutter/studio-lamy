(() => {
  'use strict';
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    lissage: { name: 'Lissage technique japonaise', duration: 180 },
    'coupe-femme': { name: 'Shampooing coupe brushing cheveux courts', duration: 45 },
    'coupe-homme': { name: 'Shampoing + Coupe + Coiffage', duration: 30 }
  };
  const state = { service: '', day: '', minute: null, step: 0, completed: false };
  const nb = '\u00a0';
  const formatHour = minute => `${Math.floor(minute / 60)}${nb}h${minute % 60 ? nb + String(minute % 60).padStart(2, '0') : ''}`;
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);

  function nowParis() {
    const part = Object.fromEntries(parisFormat.formatToParts(new Date()).map(item => [item.type, item.value]));
    return { key: `${part.year}-${part.month}-${part.day}`, minute: Number(part.hour) * 60 + Number(part.minute) };
  }
  function slotAvailable(key, minute, duration) {
    if (dateFromKey(key).getUTCDay() === 0 || minute < 570 || minute + duration > 1170) return false;
    const now = nowParis();
    if (key < now.key || (key === now.key && minute <= now.minute)) return false;
    const dayNumber = Math.floor(dateFromKey(key).getTime() / 86400000);
    // Indisponibilités illustratives déterministes, jamais un agenda réel.
    return (dayNumber + minute / 30) % 5 !== 0;
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === ' ') root.classList.add('keyboard-use');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-use'), { passive: true });

  // Le contenu est visible avant cette initialisation et si JavaScript est absent.
  if (!reduced.matches) {
    root.classList.add('motion-ready');
    let entered = false;
    const enter = () => {
      if (entered) return;
      entered = true;
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
    };
    if (document.fonts) document.fonts.ready.then(enter);
    setTimeout(enter, 700);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-pending');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: .12 });
      $$('[data-reveal]').forEach(element => {
        element.classList.add('reveal-pending');
        observer.observe(element);
      });
    }
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      root.classList.add('is-ready');
      $$('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
    }
  });

  const panels = $$('[data-panel]');
  const steps = $$('[data-step]');
  const live = $('#booking-status');
  let transitionFrame = 0;
  const announce = message => { live.textContent = message; };
  function updateSummary() {
    $('#summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#summary-day').textContent = state.day ? longDate.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-slot').textContent = state.minute !== null ? formatHour(state.minute) : 'À choisir';
    $$('.selection-ribbons i').forEach((stripe, index) => stripe.classList.toggle('is-filled', [Boolean(state.service), Boolean(state.day), state.minute !== null, state.completed][index]));
    const reachable = state.minute !== null ? 3 : state.day ? 2 : state.service ? 1 : 0;
    steps.forEach((button, index) => {
      button.disabled = state.completed || index > reachable;
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    cancelAnimationFrame(transitionFrame);
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
      panel.classList.remove('is-entering');
    });
    const panel = panels[index];
    if (!reduced.matches && !root.classList.contains('keyboard-use')) {
      panel.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    updateSummary();
    if (focus) {
      const heading = $(`#step-title-${index}`);
      heading.focus({ preventScroll: true });
      if (heading.getBoundingClientRect().top < 0 || heading.getBoundingClientRect().bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      announce(`Étape ${index + 1} sur 4. ${heading.textContent}`);
    }
  }
  function renderDays() {
    const now = nowParis();
    const today = dateFromKey(now.key);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index++) {
      const day = new Date(today.getTime() + index * 86400000);
      const key = day.toISOString().slice(0, 10);
      const closed = day.getUTCDay() === 0;
      const label = document.createElement('label');
      label.className = 'day';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key; input.checked = key === state.day; input.disabled = closed;
      input.setAttribute('aria-label', `${longDate.format(day)}${closed ? ', fermé' : ', simulation'}`);
      const face = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'day-name';
      name.textContent = weekday.format(day);
      const number = document.createElement('b'); number.textContent = String(day.getUTCDate());
      const caption = document.createElement('small'); caption.textContent = closed ? 'Fermé' : month.format(day);
      face.append(name, number, caption);
      label.append(input, face); fragment.append(label);
    }
    $('#days').replaceChildren(fragment);
  }
  function renderSlots() {
    const container = $('#slots');
    container.replaceChildren();
    if (!state.day || !state.service) return;
    const duration = services[state.service].duration;
    let available = 0;
    for (let minute = 570; minute + duration <= 1170; minute += 30) {
      const label = document.createElement('label'); label.className = 'slot';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(minute); input.disabled = !slotAvailable(state.day, minute, duration); input.checked = minute === state.minute;
      input.setAttribute('aria-label', `${formatHour(minute)}, ${input.disabled ? 'indisponible dans la simulation' : 'créneau fictif'}`);
      const face = document.createElement('span'); face.textContent = formatHour(minute);
      label.append(input, face); container.append(label);
      if (!input.disabled) available++;
    }
    $('#slot-note').textContent = `${longDate.format(dateFromKey(state.day))} · ${available} créneau${available > 1 ? 'x' : ''} fictif${available > 1 ? 's' : ''}. Les horaires barrés sont indisponibles dans cette simulation.`;
    if (!available) {
      const empty = document.createElement('p'); empty.textContent = 'Aucun créneau d’essai restant pour ce jour. Choisissez un autre jour.';
      container.prepend(empty);
    }
  }
  function selectService(value) {
    state.service = value;
    state.day = ''; state.minute = null;
    $('#service-error').textContent = ''; $('#day-error').textContent = ''; $('#slot-error').textContent = '';
    $$('[name="prestation"]').forEach(input => input.checked = input.value === value);
    updateSummary();
  }
  $('#booking-form').addEventListener('change', event => {
    const target = event.target;
    if (target.name === 'prestation') selectService(target.value);
    if (target.name === 'jour') {
      state.day = target.value; state.minute = null;
      $('#day-error').textContent = ''; $('#slot-error').textContent = '';
      updateSummary();
    }
    if (target.name === 'heure') {
      state.minute = Number(target.value); $('#slot-error').textContent = ''; updateSummary();
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.next);
    const values = [Boolean(state.service), Boolean(state.day), state.minute !== null];
    const errors = ['service-error', 'day-error', 'slot-error'];
    const messages = ['Choisissez une prestation pour continuer.', 'Choisissez un jour pour continuer.', 'Choisissez une heure pour continuer.'];
    if (!values[index]) { $(`#${errors[index]}`).textContent = messages[index]; announce(messages[index]); return; }
    if (index === 2 && !slotAvailable(state.day, state.minute, services[state.service].duration)) {
      state.minute = null; renderSlots(); updateSummary(); $('#slot-error').textContent = 'Ce créneau d’essai n’est plus disponible. Choisissez une autre heure.'; return;
    }
    showStep(index + 1);
  }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  steps.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    resetSuccess(); selectService(link.dataset.service); showStep(0);
  }));
  ['firstname', 'phone'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => {
      $(`#${id}`).removeAttribute('aria-invalid'); $(`#${id}-error`).textContent = '';
    });
  });
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { $('[data-next="' + state.step + '"]')?.click(); return; }
    const firstName = $('#firstname').value.trim();
    const phone = $('#phone').value.replace(/[\s.()\-]/g, '');
    const goodPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(phone);
    $('#firstname-error').textContent = firstName ? '' : 'Indiquez un prénom pour essayer le parcours.';
    $('#phone-error').textContent = goodPhone ? '' : 'Indiquez un numéro français de 10 chiffres, ou au format +33.';
    $('#firstname').setAttribute('aria-invalid', String(!firstName));
    $('#phone').setAttribute('aria-invalid', String(!goodPhone));
    if (!firstName || !goodPhone) {
      (!firstName ? $('#firstname') : $('#phone')).focus();
      announce('Vérifiez les champs indiqués.'); return;
    }
    if (!state.service || !state.day || state.minute === null) { showStep(0); return; }
    if (!slotAvailable(state.day, state.minute, services[state.service].duration)) {
      state.minute = null; showStep(2); $('#slot-error').textContent = 'Ce créneau d’essai n’est plus disponible. Choisissez une autre heure.'; return;
    }
    state.completed = true;
    $('#booking-form').hidden = true; $('#success').hidden = false;
    $('#success-recap').textContent = `${firstName}, voici votre sélection fictive : ${services[state.service].name}, ${longDate.format(dateFromKey(state.day))} à ${formatHour(state.minute)}.`;
    const real = $('#success-real');
    real.href = state.service === 'lissage' ? 'tel:+33147425423' : 'https://www.planity.com/coiffure-mario-salvatore-75002-paris';
    real.textContent = state.service === 'lissage' ? 'Appeler pour le lissage ↗' : 'Prendre rendez-vous sur Planity ↗';
    if (state.service === 'lissage') { real.removeAttribute('target'); real.removeAttribute('rel'); }
    else { real.target = '_blank'; real.rel = 'noopener'; }
    updateSummary();
    $('#success-title').focus({ preventScroll: true });
    $('#success-title').scrollIntoView({ block: 'center', behavior: 'instant' });
    announce('Simulation terminée. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.');
    // Ne pas conserver les coordonnées une fois la simulation terminée.
    $('#firstname').value = ''; $('#phone').value = '';
  });
  function resetSuccess() {
    state.completed = false;
    $('#success').hidden = true; $('#booking-form').hidden = false;
    $('#success-recap').textContent = '';
  }
  $('#restart').addEventListener('click', () => {
    resetSuccess();
    $('#booking-form').reset();
    state.service = ''; state.day = ''; state.minute = null;
    $$('.error').forEach(error => error.textContent = '');
    $$('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    showStep(0);
  });
  $('#booking-shell').hidden = false;
  $('#booking-fallback').hidden = true;
  updateSummary();
})();
