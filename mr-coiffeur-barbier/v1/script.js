/* Simulation locale : aucun appel réseau, aucune conservation de coordonnées. */
(() => {
  'use strict';

  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function parisNow(date = new Date()) {
    const p = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function nextDays(key, count = 14) {
    const start = dateFromKey(key);
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + i);
      return dateKey(date);
    });
  }
  function openingHours(key) {
    const day = dateFromKey(key).getUTCDay();
    if (day < 2 || day > 5) return null;
    return { start: 10 * 60, end: 17 * 60 };
  }
  function timeLabel(minute) {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return m ? `${h}\u00a0h\u00a0${String(m).padStart(2, '0')}` : `${h}\u00a0h`;
  }
  function slotsForDay(key, duration, now = parisNow()) {
    const hours = openingHours(key);
    if (!hours || ![30, 60].includes(duration)) return [];
    const seed = Math.floor(dateFromKey(key).getTime() / 86400000) + duration;
    const slots = [];
    for (let minute = hours.start, i = 0; minute + duration <= hours.end; minute += 30, i++) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const occupied = (seed + i * 3) % 7 === 0;
      slots.push({ minute, disabled: past || occupied, reason: past ? 'Heure passée' : occupied ? 'Indisponible dans la simulation' : '' });
    }
    return slots;
  }
  function validMobile(value) {
    const compact = value.replace(/[\s.()\-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }
  function readableDate(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'Europe/Paris' }).format(dateFromKey(key));
  }

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; root.classList.add('keyboard'); });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  const revealTargets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealTargets.forEach(target => observer.observe(target));
  } else {
    revealTargets.forEach(target => target.classList.add('visible'));
  }

  const form = document.getElementById('reservation');
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const stepButtons = Array.from(document.querySelectorAll('[data-step]'));
  const services = Array.from(document.querySelectorAll('input[name="prestation"]'));
  const dayFieldset = document.getElementById('jours');
  const timeFieldset = document.getElementById('heures');
  const nextButtons = Array.from(document.querySelectorAll('[data-next]'));
  const status = document.getElementById('annonce');
  const bookingBody = document.querySelector('.booking-body');
  const stepsNav = document.querySelector('.steps');
  const confirmation = document.getElementById('confirmation');
  const firstName = document.getElementById('prenom');
  const phone = document.getElementById('telephone');
  const state = { service: null, day: null, time: null, step: 0, completed: false };
  let runningAnimation;

  function permittedStep(step) {
    return step === 0 || (step === 1 && !!state.service) ||
      (step === 2 && !!state.service && !!state.day) ||
      (step === 3 && !!state.service && !!state.day && state.time !== null);
  }
  function updateControls() {
    nextButtons.forEach(button => { button.disabled = !permittedStep(Number(button.dataset.next)); });
    stepButtons.forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = !permittedStep(step);
      if (step === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('recap-prestation').textContent = state.service ? state.service.name : 'À choisir';
    document.getElementById('recap-jour').textContent = state.day ? readableDate(state.day, { weekday: 'short', day: 'numeric', month: 'short' }) : 'À choisir';
    document.getElementById('recap-heure').textContent = state.time === null ? 'À choisir' : timeLabel(state.time);
  }
  function animatePanel(panel) {
    if (runningAnimation) runningAnimation.cancel();
    if (reduce.matches || keyboard || !panel.animate) return;
    runningAnimation = panel.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' }
    );
  }
  function focusHeading(heading) {
    heading.focus({ preventScroll: true });
    const rect = heading.getBoundingClientRect();
    if (rect.top < 16 || rect.bottom > window.innerHeight - 80) {
      heading.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
  function showStep(step, focus = true) {
    if (!permittedStep(step)) return;
    state.step = step;
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    updateControls();
    animatePanel(panels[step]);
    status.textContent = `Étape ${step + 1} sur 4\u00a0: ${['prestation', 'jour', 'heure', 'coordonnées'][step]}. Simulation uniquement.`;
    if (focus) focusHeading(panels[step].querySelector('h3'));
  }
  function chooseService(input) {
    const changed = !state.service || state.service.id !== input.value;
    input.checked = true;
    state.service = { id: input.value, name: input.dataset.name, duration: Number(input.dataset.duration) };
    if (changed) {
      state.day = null;
      state.time = null;
      renderDays();
      timeFieldset.querySelectorAll('label').forEach(label => label.remove());
    }
    updateControls();
  }
  function labelWithRadio(className, name, value, disabled) {
    const label = document.createElement('label');
    label.className = className;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.disabled = disabled;
    label.append(input);
    return { label, input };
  }
  function renderDays() {
    const now = parisNow();
    dayFieldset.querySelectorAll('label').forEach(label => label.remove());
    nextDays(now.key).forEach(key => {
      const day = dateFromKey(key).getUTCDay();
      const noSlot = state.service && !slotsForDay(key, state.service.duration, now).some(slot => !slot.disabled);
      const disabled = day < 2 || day > 5 || !!noSlot;
      const reason = (day < 2 || day > 5) ? 'Non proposé' : noSlot ? 'Écoulé' : '';
      const { label, input } = labelWithRadio('day-option', 'jour', key, disabled);
      const weekday = document.createElement('span');
      weekday.textContent = readableDate(key, { weekday: 'short' });
      const date = document.createElement('strong');
      date.textContent = readableDate(key, { day: 'numeric' });
      const month = document.createElement('small');
      month.textContent = readableDate(key, { month: 'short' });
      label.append(weekday, date, month);
      if (reason) {
        const note = document.createElement('small');
        note.textContent = reason;
        label.append(note);
      }
      input.setAttribute('aria-label', `${readableDate(key)}${reason ? `, ${reason}` : ''}`);
      input.checked = state.day === key;
      input.addEventListener('change', () => {
        state.day = key;
        state.time = null;
        renderTimes();
        updateControls();
        status.textContent = `Jour choisi\u00a0: ${readableDate(key)}. Choisissez ensuite une heure fictive.`;
      });
      dayFieldset.append(label);
    });
  }
  function renderTimes() {
    timeFieldset.querySelectorAll('label').forEach(label => label.remove());
    if (!state.day || !state.service) return;
    const slots = slotsForDay(state.day, state.service.duration);
    document.getElementById('aucune-heure').hidden = slots.some(slot => !slot.disabled);
    slots.forEach(slot => {
      const { label, input } = labelWithRadio('time-option', 'heure', slot.minute, slot.disabled);
      const text = document.createElement('span');
      text.textContent = timeLabel(slot.minute);
      label.append(text);
      input.setAttribute('aria-label', `${timeLabel(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', créneau fictif'}`);
      input.checked = state.time === slot.minute && !slot.disabled;
      input.addEventListener('change', () => {
        state.time = slot.minute;
        updateControls();
        status.textContent = `Heure fictive choisie\u00a0: ${timeLabel(slot.minute)}. Aucun rendez-vous réel.`;
      });
      timeFieldset.append(label);
    });
  }
  services.forEach(input => input.addEventListener('change', () => chooseService(input)));
  nextButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.next))));
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));

  function fieldError(field, id, invalid) {
    field.setAttribute('aria-invalid', String(invalid));
    document.getElementById(id).hidden = !invalid;
  }
  firstName.addEventListener('input', () => fieldError(firstName, 'erreur-prenom', !firstName.value.trim()));
  phone.addEventListener('input', () => {
    if (phone.getAttribute('aria-invalid') === 'true') fieldError(phone, 'erreur-telephone', !validMobile(phone.value));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!permittedStep(3)) return;
    const nameInvalid = !firstName.value.trim();
    const phoneInvalid = !validMobile(phone.value);
    fieldError(firstName, 'erreur-prenom', nameInvalid);
    fieldError(phone, 'erreur-telephone', phoneInvalid);
    if (nameInvalid || phoneInvalid) {
      status.textContent = 'Vérifiez les champs indiqués avant de terminer la simulation.';
      (nameInvalid ? firstName : phone).focus();
      return;
    }
    // Vérification au dernier instant : un onglet peut être resté ouvert longtemps.
    if (!slotsForDay(state.day, state.service.duration).some(slot => slot.minute === state.time && !slot.disabled)) {
      state.time = null;
      renderDays();
      renderTimes();
      showStep(2);
      status.textContent = 'Cette heure est passée. Choisissez un autre créneau fictif ou un autre jour.';
      return;
    }
    document.getElementById('recap-final').textContent = `${state.service.name} — ${readableDate(state.day)} à ${timeLabel(state.time)}. Cette sélection servait uniquement à la démonstration.`;
    firstName.value = '';
    phone.value = '';
    state.completed = true;
    bookingBody.hidden = true;
    stepsNav.hidden = true;
    confirmation.hidden = false;
    animatePanel(confirmation);
    focusHeading(confirmation.querySelector('h3'));
    status.textContent = 'Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.';
  });
  function resetDemo() {
    form.reset();
    state.service = null;
    state.day = null;
    state.time = null;
    state.completed = false;
    confirmation.hidden = true;
    bookingBody.hidden = false;
    stepsNav.hidden = false;
    fieldError(firstName, 'erreur-prenom', false);
    fieldError(phone, 'erreur-telephone', false);
    renderDays();
    timeFieldset.querySelectorAll('label').forEach(label => label.remove());
    showStep(0);
  }
  document.getElementById('recommencer').addEventListener('click', resetDemo);
  document.querySelectorAll('[data-choose]').forEach(link => link.addEventListener('click', () => {
    if (state.completed) resetDemo();
    const input = services.find(service => service.value === link.dataset.choose);
    if (!input) return;
    chooseService(input);
    showStep(1, false);
    // Le lien conserve son défilement natif ; la mise au point n’ajoute aucun saut.
    panels[1].querySelector('h3').focus({ preventScroll: true });
  }));

  const bar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const observed = [document.querySelector('.preview'), document.querySelector('.hero'), document.querySelector('.booking-section'), document.querySelector('.footer')];
    const visible = new Set(observed.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }));
    const updateBar = () => { bar.hidden = visible.size > 0; };
    updateBar();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      updateBar();
    });
    observed.forEach(element => barObserver.observe(element));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.completed) return;
    if (state.service) {
      renderDays();
      if (state.time !== null && !slotsForDay(state.day, state.service.duration).some(slot => slot.minute === state.time && !slot.disabled)) state.time = null;
      renderTimes();
      if (state.step === 3 && state.time === null) showStep(2, false);
      updateControls();
    }
  });
  renderDays();
  updateControls();
  window.sitePret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
