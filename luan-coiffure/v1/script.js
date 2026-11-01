(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = [
    { id: 'coupe-femme', name: 'Coupe femme', duration: 45, price: 35 },
    { id: 'coupe-homme', name: 'Coupe homme', duration: 30, price: 23 },
    { id: 'barbe', name: 'Taille de barbe', duration: 20, price: 15 }
  ];
  const hours = { 0: null, 1: [720, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1020] };
  const state = { step: 0, service: '', date: '', time: null, firstName: '', phone: '', complete: false };
  const content = document.querySelector('#step-content');
  const app = document.querySelector('#booking-app');
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const status = document.querySelector('#booking-status');
  const stepNames = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' });
  let pointerAction = false;
  let stepAnimation;
  let summaryAnimation;
  let calendarUrl;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateObject(key) { return new Date(`${key}T12:00:00Z`); }
  function keyForOffset(key, offset) {
    const d = dateObject(key);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  function selectedService() { return services.find(service => service.id === state.service); }
  function clock(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function longDate(key) { return dayFormat.format(dateObject(key)); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function holiday(key) {
    const fixed = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
    if (fixed.includes(key.slice(5))) return true;
    const year = Number(key.slice(0, 4));
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = (h + l - 7 * m + 114) % 31 + 1;
    const easter = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return [1, 39, 50].some(offset => keyForOffset(easter, offset) === key);
  }
  function slotsFor(key, duration) {
    const schedule = hours[dateObject(key).getUTCDay()];
    if (!schedule) return [];
    const now = parisNow();
    const seed = Number(key.replaceAll('-', ''));
    const slots = [];
    for (let start = schedule[0]; start + duration <= schedule[1]; start += 15) {
      const past = key < now.date || (key === now.date && start <= now.minutes);
      const taken = (seed + Math.floor(start / 15) * 7 + duration) % 6 === 0;
      slots.push({ start, disabled: past || taken, reason: past ? 'Passé' : taken ? 'Déjà pris' : '' });
    }
    return slots;
  }
  function slotAvailable() {
    const service = selectedService();
    return service && state.date && slotsFor(state.date, service.duration).some(slot => slot.start === state.time && !slot.disabled);
  }
  function announce(message) { status.textContent = message; }
  function summary() {
    const service = selectedService();
    document.querySelector('#summary-service').textContent = service ? `${service.name} · ${service.duration}\u00a0min · exemple` : 'Une prestation à choisir';
    document.querySelector('#summary-date').textContent = state.date ? longDate(state.date) : 'Un jour à choisir';
    document.querySelector('#summary-time').textContent = state.time !== null ? clock(state.time) : 'Une heure à choisir';
    document.querySelector('#summary-price').textContent = service ? `${service.price}\u00a0€ · à confirmer` : '—';
    document.querySelector('#selection-titre').innerHTML = state.complete ? 'Une date<br><em>pour l’exemple.</em>' : 'Une date<br><em>à écrire.</em>';
    if (pointerAction && !reducedMotion.matches) {
      summaryAnimation?.cancel();
      summaryAnimation = document.querySelector('.summary-date-row dd').animate([{ opacity: .35 }, { opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  }
  function actions(next, back = true) {
    return `<div class="step-actions">${back ? '<button type="button" class="back-button" data-back>← Retour</button>' : ''}<button type="button" class="button cream" data-next>${next} <span aria-hidden="true">→</span></button></div><p class="booking-error" id="step-error" role="status" aria-live="polite"></p>`;
  }
  function renderServices() {
    return `<h3 id="step-title" tabindex="-1">Pour quelle prestation&nbsp;?</h3><p>Tarifs indicatifs, à confirmer avec Luan Coiffure. Intitulés, durées et prix d’exemple.</p><fieldset class="services-choices" aria-describedby="step-error"><legend class="sr-only">Choisir une prestation d’exemple</legend>${services.map(service => `<label class="choice"><input type="radio" name="service" value="${service.id}" ${state.service === service.id ? 'checked' : ''}><span><span class="choice-name">${service.name}</span><span class="choice-detail">${service.duration}&nbsp;min · exemple, à confirmer</span></span><span class="choice-price">${service.price}&nbsp;€</span></label>`).join('')}</fieldset>${actions('Choisir le jour', false)}`;
  }
  function renderDays() {
    const today = parisNow().date;
    const duration = selectedService().duration;
    const days = Array.from({ length: 14 }, (_, offset) => {
      const key = keyForOffset(today, offset);
      const date = dateObject(key);
      const closed = !hours[date.getUTCDay()];
      const exhausted = !closed && !slotsFor(key, duration).some(slot => !slot.disabled);
      const isHoliday = holiday(key);
      const note = closed ? 'Fermé' : exhausted ? 'Aucun créneau' : isHoliday ? 'Férié*' : offset === 0 ? 'Aujourd’hui' : '';
      return `<label class="day-option"><input type="radio" name="day" value="${key}" ${state.date === key ? 'checked' : ''} ${closed || exhausted ? 'disabled' : ''} aria-label="${longDate(key)}${note ? `, ${note}` : ''}"><span>${shortDayFormat.format(date)}</span><strong>${date.getUTCDate()}</strong><span>${monthFormat.format(date)}</span><small>${note || '&nbsp;'}</small></label>`;
    }).join('');
    return `<h3 id="step-title" tabindex="-1">Quel jour vous conviendrait&nbsp;?</h3><p>Les 14 prochains jours. Dimanche fermé. Lundi dès 12&nbsp;h, à confirmer.</p><fieldset class="day-grid" aria-describedby="day-note step-error"><legend class="sr-only">Choisir un jour</legend>${days}</fieldset><p class="fine-print" id="day-note">* Jours fériés&nbsp;: ouverture à confirmer. Les créneaux proposés sont fictifs.</p>${actions('Choisir l’heure')}`;
  }
  function renderTimes() {
    const service = selectedService();
    const schedule = hours[dateObject(state.date).getUTCDay()];
    return `<h3 id="step-title" tabindex="-1">À quelle heure&nbsp;?</h3><p>${longDate(state.date)} · ${clock(schedule[0])}–${clock(schedule[1])}${holiday(state.date) ? ' · jour férié, ouverture à confirmer' : ''}. Disponibilités simulées.</p><fieldset class="time-grid" aria-describedby="step-error"><legend class="sr-only">Choisir une heure d’exemple</legend>${slotsFor(state.date, service.duration).map(slot => `<label class="time-option"><input type="radio" name="time" value="${slot.start}" ${slot.start === state.time ? 'checked' : ''} ${slot.disabled ? 'disabled' : ''} aria-label="${clock(slot.start)}${slot.reason ? `, ${slot.reason}` : ''}"><span class="slot-time">${clock(slot.start)}</span>${slot.reason ? `<small>${slot.reason}</small>` : ''}</label>`).join('')}</fieldset>${actions('Continuer')}`;
  }
  function renderContact() {
    const service = selectedService();
    return `<h3 id="step-title" tabindex="-1">À quel prénom&nbsp;?</h3><p>Vous pouvez utiliser des coordonnées d’exemple. Elles restent dans cette page, sans stockage ni envoi.</p><form class="contact-form" id="contact-form" novalidate><div class="field-group"><label for="first-name">Prénom</label><input id="first-name" name="given-name" autocomplete="given-name" maxlength="60" required value="${escapeHtml(state.firstName)}" aria-describedby="name-error"><p class="booking-error" id="name-error" aria-live="polite"></p></div><div class="field-group"><label for="phone">Téléphone mobile français</label><input id="phone" name="tel" type="tel" autocomplete="tel" inputmode="tel" maxlength="24" required value="${escapeHtml(state.phone)}" aria-describedby="phone-hint phone-error"><p class="fine-print" id="phone-hint">Format&nbsp;: 06 ou 07, suivi de 8 chiffres ; +33 accepté.</p><p class="booking-error" id="phone-error" aria-live="polite"></p></div><div class="contact-recap"><strong>Votre rendez-vous d’exemple</strong>${service.name} · ${service.duration}&nbsp;min<br>${longDate(state.date)} à ${clock(state.time)}<br>${service.price}&nbsp;€ · exemple de tarif, à confirmer</div><p class="form-note">Aucune réservation ne sera faite. Pour un vrai rendez-vous, appelez le 09 81 30 08 69.</p><div class="step-actions"><button type="button" class="back-button" data-back>← Retour</button><button type="submit" class="button cream">Terminer l’exemple <span aria-hidden="true">↗</span></button></div><p class="booking-error" id="step-error" role="status" aria-live="polite"></p></form>`;
  }
  function updateSteps() {
    stepButtons.forEach((button, index) => {
      button.disabled = state.complete || (index > 0 && !state.service) || (index > 1 && !state.date) || (index > 2 && state.time === null);
      if (index === state.step && !state.complete) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function showStep(step, focus = true) {
    const previous = state.step;
    state.step = step;
    stepAnimation?.cancel();
    content.innerHTML = [renderServices, renderDays, renderTimes, renderContact][step]();
    updateSteps();
    summary();
    if (focus && pointerAction && !reducedMotion.matches) {
      stepAnimation = content.animate([{ opacity: 0, transform: `translateX(${step < previous ? '-10px' : '10px'})` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
    if (focus) {
      const title = content.querySelector('#step-title');
      title.focus({ preventScroll: true });
      const rect = title.getBoundingClientRect();
      if (rect.top < 24 || rect.bottom > window.innerHeight - 100) title.scrollIntoView({ block: 'start', behavior: 'instant' });
      announce(`Étape ${step + 1} sur 4\u00a0: ${stepNames[step]}.`);
    }
  }
  function stepError(message) {
    document.querySelector('#step-error').textContent = message;
    const field = content.querySelector('input:not(:disabled)');
    field?.focus({ preventScroll: true });
  }
  function nextStep() {
    if (state.step === 0 && !state.service) return stepError('Choisissez une prestation d’exemple pour continuer.');
    if (state.step === 1 && !state.date) return stepError('Choisissez un jour pour continuer.');
    if (state.step === 1 && !slotsFor(state.date, selectedService().duration).some(slot => !slot.disabled)) {
      state.date = ''; state.time = null; showStep(1); return stepError('Ce jour n’a plus de créneau d’exemple. Choisissez un autre jour.');
    }
    if (state.step === 2 && !slotAvailable()) return stepError('Choisissez une heure disponible. Les horaires passés ne peuvent pas être sélectionnés.');
    showStep(state.step + 1);
  }
  function validateField(input) {
    let message = '';
    if (input.id === 'first-name' && !input.value.trim()) message = 'Indiquez un prénom, même pour l’exemple.';
    if (input.id === 'phone') {
      const phone = input.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(phone)) message = 'Indiquez un mobile français valide\u00a0: 06 ou 07 et 8 chiffres, ou +33.';
    }
    const error = document.querySelector(input.id === 'first-name' ? '#name-error' : '#phone-error');
    input.setAttribute('aria-invalid', String(Boolean(message)));
    error.textContent = message;
    return !message;
  }
  function createCalendar() {
    if (calendarUrl) URL.revokeObjectURL(calendarUrl);
    const service = selectedService();
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const localStamp = minutes => `${state.date.replaceAll('-', '')}T${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`;
    const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Luan Coiffure//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:exemple-${Date.now()}@preview.invalid`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Europe/Paris:${localStamp(state.time)}`, `DTEND;TZID=Europe/Paris:${localStamp(state.time + service.duration)}`, 'SUMMARY:SIMULATION - Luan Coiffure - aucun rendez-vous reserve', 'DESCRIPTION:Exemple uniquement. Rien n’a ete transmis au salon. Appelez le 09 81 30 08 69 pour reserver.', 'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
    calendarUrl = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  }
  function success() {
    state.complete = true;
    createCalendar();
    const service = selectedService();
    content.innerHTML = `<span class="success-mark">Démonstration terminée</span><h3 class="success-title" id="step-title" tabindex="-1">Votre exemple<br>est prêt.</h3><p>Merci ${escapeHtml(state.firstName.trim())}. Rien n’a été envoyé au salon et aucun rendez-vous n’est réservé.</p><div class="success-recap">${service.name} · ${service.duration}&nbsp;min<br>${longDate(state.date)} à ${clock(state.time)}<br>${service.price}&nbsp;€ · exemple de tarif, à confirmer</div><div class="success-actions"><a class="button cream" href="tel:+33981300869">Appeler pour réserver <span aria-hidden="true">↗</span></a><a class="text-link" href="${calendarUrl}" download="luan-coiffure-SIMULATION.ics">Enregistrer l’exemple (.ics)</a></div><button type="button" class="back-button" data-reset>Recommencer la démonstration</button>`;
    updateSteps();
    summary();
    content.querySelector('#step-title').focus({ preventScroll: true });
    announce('Démonstration terminée. Aucun rendez-vous réservé. Rien n’a été envoyé.');
  }

  document.addEventListener('pointerdown', () => { pointerAction = true; root.classList.remove('keyboard-input'); }, { passive: true });
  document.addEventListener('keydown', () => { pointerAction = false; root.classList.add('keyboard-input'); });
  content.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service' && state.service !== input.value) {
      state.service = input.value; state.date = ''; state.time = null;
    } else if (input.name === 'day' && state.date !== input.value) {
      state.date = input.value; state.time = null;
    } else if (input.name === 'time') state.time = Number(input.value);
    summary(); updateSteps();
    const error = document.querySelector('#step-error');
    if (error) error.textContent = '';
  });
  content.addEventListener('input', event => {
    const input = event.target;
    if (input.id === 'first-name') state.firstName = input.value;
    if (input.id === 'phone') state.phone = input.value;
    if (input.hasAttribute('aria-invalid')) validateField(input);
  });
  content.addEventListener('focusout', event => {
    if (['first-name', 'phone'].includes(event.target.id)) validateField(event.target);
  });
  content.addEventListener('click', event => {
    if (event.target.closest('[data-next]')) nextStep();
    if (event.target.closest('[data-back]')) showStep(Math.max(0, state.step - 1));
    if (event.target.closest('[data-reset]')) {
      if (calendarUrl) { URL.revokeObjectURL(calendarUrl); calendarUrl = null; }
      Object.assign(state, { step: 0, service: '', date: '', time: null, firstName: '', phone: '', complete: false });
      showStep(0);
    }
  });
  content.addEventListener('submit', event => {
    event.preventDefault();
    const first = document.querySelector('#first-name');
    const phone = document.querySelector('#phone');
    const validName = validateField(first);
    const validPhone = validateField(phone);
    if (!validName || !validPhone) { (!validName ? first : phone).focus(); return; }
    if (!slotAvailable()) { state.time = null; showStep(2); stepError('Ce créneau d’exemple est désormais passé. Choisissez une autre heure.'); return; }
    success();
  });
  stepButtons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    state.date = ''; state.time = null; state.complete = false;
    showStep(1);
  }));
  showStep(0, false);
  app.hidden = false;
  const now = parisNow();
  document.querySelector(`[data-weekday="${dateObject(now.date).getUTCDay()}"]`)?.classList.add('is-today');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
    const bar = document.querySelector('.mobile-bar');
    const visibility = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      const hidden = [...visibility.values()].some(Boolean);
      bar.classList.toggle('is-hidden', hidden);
      bar.inert = hidden;
    });
    ['.hero', '#reserver', '.footer'].forEach(selector => {
      const element = document.querySelector(selector);
      visibility.set(element, false);
      barObserver.observe(element);
    });
    root.classList.add('js');
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { stepAnimation?.cancel(); summaryAnimation?.cancel(); }
  });
  window.addEventListener('pagehide', () => { if (calendarUrl) URL.revokeObjectURL(calendarUrl); });
})();
