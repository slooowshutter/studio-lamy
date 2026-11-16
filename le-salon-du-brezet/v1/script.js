(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard-mode'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard-mode'); }, { passive: true });

  // Le contenu n’est masqué qu’après l’initialisation ; il reste lisible sans script.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const posters = [...document.querySelectorAll('.poster')];
  posters.forEach(poster => {
    const reel = poster.querySelector('[data-reel]');
    if (reel) poster.classList.add('reel-ready');
    const number = poster.querySelector('[data-count]');
    if (number && !reduce.matches) {
      const value = Number(number.dataset.count);
      const windowSpan = document.createElement('span');
      windowSpan.className = 'number-window';
      windowSpan.style.setProperty('--number', value);
      const track = document.createElement('span');
      track.className = 'number-track';
      for (let n = 0; n <= value; n++) {
        const digit = document.createElement('span');
        digit.textContent = String(n).padStart(2, '0');
        track.append(digit);
      }
      windowSpan.append(track);
      number.replaceChildren(windowSpan);
    }
  });
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('awaiting');
        entry.target.classList.add('is-visible');
        entry.target.querySelector('.number-window')?.classList.add('is-counted');
        reveals.unobserve(entry.target);
      });
    }, { threshold: .12 });
    posters.forEach(poster => {
      if (poster.hasAttribute('data-reveal') && !reduce.matches) poster.classList.add('awaiting');
      reveals.observe(poster);
    });
  } else {
    posters.forEach(poster => {
      poster.classList.add('is-visible');
      poster.querySelector('.number-window')?.classList.add('is-counted');
    });
  }

  // Deux colonnes à hauteur naturelle, ordre de lecture documentaire conservé.
  const wall = document.querySelector('.poster-grid');
  const slots = [...wall.children];
  const wide = window.matchMedia('(min-width: 861px)');
  let layoutFrame = 0;
  function layoutPosters() {
    layoutFrame = 0;
    wall.classList.toggle('masonry-ready', wide.matches);
    const heights = slots.map(slot => slot.firstElementChild.offsetHeight);
    slots.forEach((slot, index) => {
      slot.style.gridRowEnd = wide.matches ? `span ${Math.ceil((heights[index] + 24) / 8)}` : '';
    });
  }
  function queueLayout() {
    if (!layoutFrame) layoutFrame = requestAnimationFrame(layoutPosters);
  }
  if ('ResizeObserver' in window) {
    const sizes = new ResizeObserver(queueLayout);
    posters.forEach(poster => sizes.observe(poster));
  }
  window.addEventListener('resize', queueLayout, { passive: true });
  document.fonts?.ready.then(queueLayout);
  queueLayout();

  const app = document.querySelector('.booking-app');
  const form = document.querySelector('#booking-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const navButtons = [...document.querySelectorAll('[data-step]')];
  const stage = document.querySelector('.step-stage');
  const back = document.querySelector('#previous-step');
  const next = document.querySelector('#next-step');
  const status = document.querySelector('#booking-status');
  const success = document.querySelector('#booking-success');
  const services = {
    soin: { name: 'Soin homme', duration: 5, detail: 'Cinq minutes de massage du cuir chevelu sur fauteuil massant.' },
    coupe: { name: 'Coupe homme', duration: 30, detail: 'Durée publiée : 30 minutes.' },
    barbe: { name: 'Entretien barbe tondeuse', duration: 10, detail: 'Durée publiée : 10 minutes.' }
  };
  // Horaires sourcés : Planity, relevé du 16/11/2026. Dimanche fermé.
  const hours = { 1: [600, 1140], 2: [600, 1140], 3: [600, 1140], 4: [600, 1140], 5: [600, 1140], 6: [570, 900] };
  const state = { service: '', day: '', time: '', step: 0, completed: false };
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
  const parisParts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let transitionTimer = 0;
  let announceTimer = 0;
  function nowParis() {
    const parts = Object.fromEntries(parisParts.formatToParts(new Date()).map(p => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFor(key) { return new Date(`${key}T12:00:00+01:00`); }
  function dateKey(date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function weekday(key) {
    // Les dates sont représentées à midi afin de rester stables aux changements d’heure.
    return dateFor(key).getUTCDay();
  }
  function formatTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function announce(message) {
    clearTimeout(announceTimer);
    status.textContent = '';
    announceTimer = setTimeout(() => { status.textContent = message; }, 30);
  }
  function slotAvailable(key, minutes, duration) {
    const range = hours[weekday(key)];
    const now = nowParis();
    return !!range && key >= now.date && minutes >= range[0] && minutes + duration <= range[1]
      && !(key === now.date && minutes <= now.minutes)
      && (Math.floor(minutes / 15) + Number(key.replaceAll('-', ''))) % 7 !== 0;
  }
  function dayAvailable(key) {
    const range = hours[weekday(key)];
    const duration = services[state.service]?.duration || 5;
    if (!range || key < nowParis().date) return false;
    for (let m = range[0]; m + duration <= range[1]; m += 15) {
      if (slotAvailable(key, m, duration)) return true;
    }
    return false;
  }
  function option(name, value, disabled, label) {
    const wrapper = document.createElement('label');
    wrapper.className = 'option-choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = name; input.value = value; input.disabled = disabled;
    input.setAttribute('aria-label', label);
    const face = document.createElement('span');
    face.className = 'option-face';
    wrapper.append(input, face);
    return { wrapper, input, face };
  }
  function makeDays() {
    const list = document.querySelector('#day-grid');
    list.replaceChildren();
    const now = nowParis();
    const start = dateFor(now.date);
    for (let n = 0; n < 14; n++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + n);
      const key = dateKey(date);
      const range = hours[weekday(key)];
      const tooLate = !!range && !dayAvailable(key);
      const note = !range ? 'Fermé' : tooLate ? 'Terminé' : n === 0 ? 'Aujourd’hui' : 'Exemple';
      const { wrapper, input, face } = option('jour', key, !range || tooLate, `${dayFormatter.format(date)}, ${note.toLocaleLowerCase('fr-FR')}`);
      input.checked = state.day === key;
      const day = document.createElement('span'); day.textContent = shortDay.format(date);
      const number = document.createElement('span'); number.className = 'day-number'; number.textContent = String(date.getUTCDate());
      const month = document.createElement('span'); month.textContent = shortMonth.format(date);
      const detail = document.createElement('span'); detail.className = 'day-note'; detail.textContent = note;
      face.append(day, number, month, detail); list.append(wrapper);
    }
  }
  function makeTimes() {
    const list = document.querySelector('#time-grid');
    list.replaceChildren();
    const range = hours[weekday(state.day)];
    if (!range) return;
    const duration = services[state.service].duration;
    for (let minutes = range[0]; minutes + duration <= range[1]; minutes += 15) {
      const allowed = slotAvailable(state.day, minutes, duration);
      const { wrapper, input, face } = option('heure', String(minutes), !allowed, `${formatTime(minutes)}, ${allowed ? 'créneau d’exemple' : 'indisponible dans la simulation'}`);
      wrapper.classList.add('time-choice'); input.checked = state.time === String(minutes);
      const value = document.createElement('span'); value.textContent = formatTime(minutes);
      const note = document.createElement('span'); note.className = 'slot-note'; note.textContent = allowed ? 'Exemple' : 'Indisponible';
      face.append(value, note); list.append(wrapper);
    }
  }
  function updateSummary() {
    document.querySelector('#summary-service').textContent = state.service ? services[state.service].name : 'À choisir';
    document.querySelector('#summary-day').textContent = state.day ? dayFormatter.format(dateFor(state.day)) : 'À choisir';
    document.querySelector('#summary-time').textContent = state.time ? formatTime(Number(state.time)) : 'À choisir';
    document.querySelector('#summary-detail').textContent = state.service ? services[state.service].detail : 'Le soin homme, cinq minutes sur fauteuil massant, est proposé dans ce parcours.';
    navButtons.forEach((button, index) => {
      const allowed = index === 0 || (index === 1 && state.service) || (index === 2 && state.service && state.day) || (index === 3 && state.service && state.day && state.time);
      button.disabled = !allowed || state.completed;
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    queueLayout();
  }
  function showStep(index, focus = true) {
    clearTimeout(transitionTimer);
    if (index >= 2 && !dayAvailable(state.day)) {
      state.day = ''; state.time = ''; index = 1;
      document.querySelector('#day-error').textContent = 'Choisissez une nouvelle date avec un créneau futur dans la simulation.';
    }
    const render = () => {
      transitionTimer = 0;
      if (index === 1) makeDays();
      if (index === 2) makeTimes();
      state.step = index;
      panels.forEach((panel, n) => { panel.hidden = n !== index; });
      back.hidden = index === 0;
      next.textContent = ['Choisir le jour →', 'Choisir l’heure →', 'Continuer →', 'Terminer la simulation'][index];
      updateSummary();
      stage.classList.remove('is-changing');
      if (focus) document.querySelector(`#step-title-${index}`).focus();
      announce(`Étape ${index + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][index]}. Simulation uniquement.`);
    };
    if (!focus || keyboard || reduce.matches) render();
    else {
      stage.classList.add('is-changing');
      transitionTimer = setTimeout(render, 120);
    }
  }
  function error(id, text, selector) {
    document.querySelector(id).textContent = text;
    document.querySelector(selector)?.focus();
  }
  form.addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'prestation') {
      state.service = value; state.day = ''; state.time = '';
      document.querySelector('#service-error').textContent = '';
    } else if (name === 'jour') {
      state.day = value; state.time = '';
      document.querySelector('#day-error').textContent = '';
    } else if (name === 'heure') {
      state.time = value;
      document.querySelector('#time-error').textContent = '';
    }
    updateSummary();
  });
  form.addEventListener('input', event => {
    if (!['prenom', 'telephone'].includes(event.target.name)) return;
    event.target.removeAttribute('aria-invalid');
    document.querySelector(`#${event.target.name}-error`).textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer = 0; stage.classList.remove('is-changing'); }
    if (state.step === 0 && !state.service) return error('#service-error', 'Choisissez une prestation pour continuer.', 'input[name="prestation"]');
    if (state.step === 1 && !state.day) return error('#day-error', 'Choisissez un jour pour continuer.', 'input[name="jour"]:not(:disabled)');
    if (state.step === 1 && !dayAvailable(state.day)) {
      state.day = ''; state.time = ''; updateSummary(); makeDays();
      return error('#day-error', 'Ce jour n’a plus de créneau futur dans la simulation. Choisissez une autre date.', 'input[name="jour"]:not(:disabled)');
    }
    if (state.step === 2 && !state.time) return error('#time-error', 'Choisissez une heure pour continuer.', 'input[name="heure"]:not(:disabled)');
    if (state.step < 3) { showStep(state.step + 1); return; }
    const first = document.querySelector('#prenom');
    const phone = document.querySelector('#telephone');
    const cleaned = phone.value.replace(/[\s().-]/g, '');
    const validName = first.value.trim().length > 0;
    const validPhone = /^(?:0|\+33|0033)[1-9]\d{8}$/.test(cleaned);
    first.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    document.querySelector('#prenom-error').textContent = validName ? '' : 'Indiquez un prénom, même fictif.';
    document.querySelector('#telephone-error').textContent = validPhone ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.';
    if (!validName || !validPhone) {
      (!validName ? first : phone).focus();
      announce('Vérifiez les champs indiqués avant de terminer la simulation.');
      return;
    }
    if (!slotAvailable(state.day, Number(state.time), services[state.service].duration)) {
      state.time = ''; updateSummary(); showStep(2);
      error('#time-error', 'Cet horaire est maintenant passé. Choisissez un autre créneau d’exemple.', '#step-title-2');
      return;
    }
    state.completed = true;
    form.hidden = true; success.hidden = false;
    // Effacement immédiat : les coordonnées ne sont ni envoyées ni stockées.
    first.value = ''; phone.value = '';
    updateSummary();
    document.querySelector('#success-title').focus();
    announce('Simulation terminée. Aucun rendez-vous n’a été réservé et rien n’a été envoyé.');
  });
  back.addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
  navButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelector('#restart').addEventListener('click', () => {
    clearTimeout(transitionTimer);
    Object.assign(state, { service: '', day: '', time: '', step: 0, completed: false });
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(field => { field.textContent = ''; });
    success.hidden = true; form.hidden = false; showStep(0);
  });
  app.hidden = false;
  showStep(0, false);

  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const hidingRegions = new Set();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) hidingRegions.add(entry.target);
        else hidingRegions.delete(entry.target);
      });
      mobileBar.classList.toggle('is-away', hidingRegions.size > 0);
    }, { threshold: 0 });
    ['.hero', '.booking-poster', '.site-footer'].forEach(selector => barObserver.observe(document.querySelector(selector)));
  }
})();
