/* Design Hair — aperçu local ; aucune donnée n’est envoyée. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, within = document) => within.querySelector(selector);
  const $$ = (selector, within = document) => [...within.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = {
    'coupe-homme': { name: 'Coupe — Homme', duration: 30 },
    'coupe-courts': { name: 'Shampoing-coupe-brushing — Cheveux courts', duration: 30 },
    'coupe-longs': { name: 'Shampoing-coupe-brushing — Cheveux longs', duration: 50 },
    coloration: { name: 'Coloration-coupe-brushing — Cheveux courts', duration: 90 },
    balayage: { name: 'Balayage-coupe-brushing — Cheveux courts', duration: 120 }
  };
  // Plage commune aux sources archivées : Planity, iCoiffeur et Fresha.
  const hours = { 0: null, 1: null, 2: [720, 1200], 3: [600, 1200], 4: [720, 1200], 5: [600, 1200], 6: [600, 1200] };
  const state = { service: '', day: '', time: null, step: 0, completed: false };
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-step]');
  const daysBox = $('#days');
  const slotsBox = $('#slots');
  const workspace = $('.booking-workspace');
  const status = $('#booking-status');
  let transitionFrame = 0;
  let keyboard = false;
  let liveTimer = 0;
  const localParts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dayShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dayLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const timeText = minute => `${Math.floor(minute / 60)}${NB}h${minute % 60 ? `${NB}${String(minute % 60).padStart(2, '0')}` : ''}`;
  const dateFrom = iso => new Date(`${iso}T12:00:00Z`);
  function nowParis(date = new Date()) {
    const parts = Object.fromEntries(localParts.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
    return { iso: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function isHoliday(date) {
    const year = date.getUTCFullYear();
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(date.toISOString().slice(5, 10))) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = Date.UTC(year, month - 1, day, 12);
    return [1, 39, 50].some(offset => date.getTime() === easter + offset * 86400000);
  }
  function announce(message) {
    clearTimeout(liveTimer);
    status.textContent = '';
    liveTimer = setTimeout(() => { status.textContent = message; }, 40);
  }
  function selectedService() { return services[state.service]; }
  function availableSlot(date, minute) {
    const now = nowParis();
    const range = hours[date.getUTCDay()];
    if (!selectedService() || !range || isHoliday(date)) return false;
    const iso = date.toISOString().slice(0, 10);
    return iso >= now.iso && minute >= range[0] && minute + selectedService().duration <= range[1] && (iso !== now.iso || minute > now.minutes);
  }
  function slotTaken(date, minute) {
    // Indisponibilités fictives déterministes, clairement marquées « Simulation ».
    return ((date.getUTCDate() * 7 + date.getUTCMonth() * 3 + Math.floor(minute / 30)) % 7) === 0;
  }
  function setError(step, message) {
    $(`#error-${step}`).textContent = message;
    const name = ['prestation', 'jour', 'heure'][step];
    $$(`input[name="${name}"]`).forEach(input => {
      if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    });
  }
  function updateSummary() {
    $('#summary-service').textContent = selectedService()?.name || 'À choisir';
    $('#summary-day').textContent = state.day ? dayLong.format(dateFrom(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? timeText(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = state.completed || (index > 0 && !state.service) || (index > 1 && !state.day) || (index > 2 && state.time === null);
      if (index === state.step && !state.completed) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const start = dateFrom(nowParis().iso);
    const fragment = document.createDocumentFragment();
    for (let n = 0; n < 14; n++) {
      const date = new Date(start.getTime() + n * 86400000);
      const iso = date.toISOString().slice(0, 10);
      const range = hours[date.getUTCDay()];
      const holiday = isHoliday(date);
      const expired = range && iso === nowParis().iso && nowParis().minutes + selectedService().duration >= range[1];
      const disabled = !range || holiday || expired;
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = iso;
      input.disabled = Boolean(disabled); input.checked = state.day === iso;
      input.setAttribute('aria-label', `${dayLong.format(date)}${disabled ? `, ${holiday ? 'ouverture à confirmer' : expired ? 'aucun créneau restant' : 'fermé'}` : ', simulation'}`);
      input.setAttribute('aria-describedby', 'error-1');
      const weekday = document.createElement('span'); weekday.className = 'day-name'; weekday.textContent = dayShort.format(date);
      const day = document.createElement('span'); day.className = 'day-number'; day.textContent = date.getUTCDate();
      const detail = document.createElement('span'); detail.className = 'day-state'; detail.textContent = holiday ? 'À confirmer' : !range ? 'Fermé' : expired ? 'Écoulé' : monthShort.format(date);
      label.append(input, weekday, day, detail); fragment.append(label);
    }
    daysBox.replaceChildren(fragment);
  }
  function renderSlots() {
    const date = dateFrom(state.day), range = hours[date.getUTCDay()];
    slotsBox.replaceChildren();
    if (!range) return;
    $('#slot-note').textContent = `${dayLong.format(date)}. Créneaux fictifs${NB}; les mentions «${NB}Occupé${NB}» font partie de la simulation.`;
    const fragment = document.createDocumentFragment();
    let available = 0;
    for (let minute = range[0]; minute + selectedService().duration <= range[1]; minute += 30) {
      const past = !availableSlot(date, minute);
      const occupied = slotTaken(date, minute);
      if (!past && !occupied) available++;
      const label = document.createElement('label'); label.className = 'slot-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = minute; input.disabled = past || occupied; input.checked = state.time === minute && !input.disabled;
      input.setAttribute('aria-label', `${timeText(minute)}${past ? ', écoulé' : occupied ? ', occupé pour la simulation' : ', simulation'}`); input.setAttribute('aria-describedby', 'error-2');
      const value = document.createElement('span'); value.textContent = timeText(minute);
      label.append(input, value);
      if (past || occupied) { const note = document.createElement('small'); note.textContent = past ? 'Écoulé' : 'Occupé · essai'; label.append(note); }
      fragment.append(label);
    }
    slotsBox.append(fragment);
    if (!available) $('#slot-note').textContent = 'Aucun créneau pour cette simulation. Revenez au choix du jour.';
  }
  function showStep(index, focus = true) {
    cancelAnimationFrame(transitionFrame);
    state.step = index;
    if (index === 1) renderDays();
    if (index === 2) renderSlots();
    panels.forEach((panel, n) => { panel.hidden = n !== index; panel.classList.remove('is-entering'); });
    const panel = panels[index];
    if (!reduced.matches && !keyboard && focus) {
      panel.classList.add('is-entering');
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    updateSummary();
    if (focus) {
      $(`#step-title-${index}`).focus({ preventScroll: true });
      panel.scrollIntoView({ behavior: 'instant', block: 'nearest' });
      announce(`Étape ${index + 1} sur 4${NB}: ${$(`#step-title-${index}`).textContent}`);
    }
  }
  function stepValid(index) {
    if (index === 0 && !state.service) { setError(0, 'Choisissez une prestation pour continuer.'); $('input[name="prestation"]').focus(); return false; }
    if (index === 1) {
      const choice = $('input[name="jour"]:checked');
      if (!state.day || !choice || choice.disabled) { setError(1, 'Choisissez un jour disponible pour la simulation.'); $('input[name="jour"]:not(:disabled)')?.focus(); return false; }
    }
    if (index === 2) {
      const valid = state.time !== null && availableSlot(dateFrom(state.day), state.time) && !slotTaken(dateFrom(state.day), state.time);
      if (!valid) { state.time = null; updateSummary(); renderSlots(); setError(2, 'Choisissez un créneau disponible pour la simulation.'); $('input[name="heure"]:not(:disabled)')?.focus(); return false; }
    }
    return true;
  }
  function validMobile(value) {
    const normalized = value.replace(/[\s.()-]/g, '').replace(/^0033/, '+33').replace(/^\+33/, '0');
    return /^0[67]\d{8}$/.test(normalized);
  }
  function fieldError(input, message) {
    $(`#error-${input.id}`).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') {
      state.service = input.value; state.day = ''; state.time = null;
      setError(0, ''); daysBox.replaceChildren(); slotsBox.replaceChildren();
    }
    if (input.name === 'jour') { state.day = input.value; state.time = null; setError(1, ''); }
    if (input.name === 'heure') { state.time = Number(input.value); setError(2, ''); }
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => { if (stepValid(state.step)) showStep(state.step + 1); }));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(state.step - 1)));
  stepButtons.forEach((button, index) => button.addEventListener('click', () => { if (!button.disabled) showStep(index); }));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    if (state.completed) reset();
    const input = $(`input[name="prestation"][value="${link.dataset.service}"]`);
    input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
    showStep(0);
  }));
  form.addEventListener('input', event => { if (['prenom', 'telephone'].includes(event.target.id)) fieldError(event.target, ''); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step !== 3) { if (stepValid(state.step)) showStep(state.step + 1); return; }
    if (!state.service || !state.day) { showStep(0); return; }
    if (!stepValid(2)) { showStep(2); return; }
    const firstName = $('#prenom'), phone = $('#telephone');
    const nameError = !firstName.value.trim() ? 'Saisissez un prénom pour tester le formulaire.' : '';
    const phoneError = !validMobile(phone.value) ? 'Saisissez un numéro mobile français valide (06, 07 ou +33).' : '';
    fieldError(firstName, nameError); fieldError(phone, phoneError);
    if (nameError || phoneError) { (nameError ? firstName : phone).focus(); return; }
    state.completed = true; form.hidden = true;
    workspace.classList.add('is-complete');
    $('#booking-success').hidden = false;
    $('#success-recap').textContent = `Sélection d’essai${NB}: ${selectedService().name}, ${dayLong.format(dateFrom(state.day))} à ${timeText(state.time)}.`;
    // Les coordonnées ne sont ni conservées ni reprises dans le récapitulatif.
    firstName.value = ''; phone.value = '';
    updateSummary();
    $('#success-title').focus({ preventScroll: true });
    $('#booking-success').scrollIntoView({ behavior: 'instant', block: 'nearest' });
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  function reset() {
    form.reset(); form.hidden = false; state.service = ''; state.day = ''; state.time = null; state.completed = false;
    workspace.classList.remove('is-complete'); $('#booking-success').hidden = true;
    [0, 1, 2].forEach(index => setError(index, ''));
    [$('#prenom'), $('#telephone')].forEach(input => fieldError(input, ''));
    daysBox.replaceChildren(); slotsBox.replaceChildren(); $('#success-recap').textContent = '';
    showStep(0);
  }
  $('#restart').addEventListener('click', reset);
  updateSummary();

  // Le contenu reste visible si le script n’a pas atteint cette initialisation.
  root.classList.add('js');
  function entrance() { requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready'))); }
  if (document.fonts?.ready && !reduced.matches) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 450))]).then(entrance);
  else entrance();
  const reveals = $$('[data-rule], [data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
    reveals.forEach(element => observer.observe(element));
    document.addEventListener('focusin', event => { const target = event.target.closest('[data-reveal]'); if (target) target.classList.add('is-visible'); });
  } else reveals.forEach(element => element.classList.add('is-visible'));
  // Après une préférence modifiée en cours de visite, ne rien cacher à nouveau.
  reduced.addEventListener('change', () => { if (reduced.matches) { root.classList.add('is-ready'); reveals.forEach(element => element.classList.add('is-visible')); } });
})();
