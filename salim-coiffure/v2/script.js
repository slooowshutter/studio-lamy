(() => {
  'use strict';
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  function animateYear() {
    const year = document.getElementById('year-count');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / 600, 1);
      year.textContent = String(2000 + Math.round(17 * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); if (entry.target.classList.contains('date-tile')) animateYear(); observer.unobserve(entry.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach((el, index) => { if (observer) { el.style.transitionDelay = `${index * 60}ms`; observer.observe(el); } else el.classList.add('visible'); });

  const services = [
    { id: 'coupe', name: 'Coupe femme' },
    { id: 'balayage', name: 'Balayage' },
    { id: 'soin', name: 'Soin kératine' }
  ];
  const state = { step: 0, service: null, day: null, time: null, name: '', phone: '', complete: false };
  const content = document.getElementById('booking-content');
  const counter = document.getElementById('step-counter');
  const nav = [...document.querySelectorAll('[data-step]')];
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
  const parisParts = () => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  function days() {
    const now = parisParts();
    return Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(now.year, now.month - 1, now.day + i, 12)));
  }
  const dateKey = date => date.toISOString().slice(0, 10);
  const labelDay = day => dayFormat.format(day);
  const timeLabel = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
  function availableSlots(day, service) {
    const weekday = day.getUTCDay();
    if (weekday === 0) return [];
    const close = weekday === 1 ? 20 * 60 : 21 * 60;
    const now = parisParts();
    const today = `${now.year}-${String(now.month).padStart(2, '0')}-${String(now.day).padStart(2, '0')}`;
    const seed = Number(dateKey(day).replaceAll('-', ''));
    const slots = [];
    for (let minutes = 600, i = 0; minutes < close; minutes += 30, i++) {
      const taken = (seed + i * 7) % 5 === 0;
      const past = dateKey(day) === today && minutes <= now.hour * 60 + now.minute;
      slots.push({ minutes, disabled: taken || past, reason: past ? 'passé' : taken ? 'déjà pris' : '' });
    }
    return slots;
  }
  function updateSummary() {
    document.getElementById('sum-service').textContent = state.service?.name || 'À choisir';
    document.getElementById('sum-day').textContent = state.day ? labelDay(state.day) : 'À choisir';
    document.getElementById('sum-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    document.getElementById('sum-price').textContent = 'Par téléphone';
    const unlocked = [true, !!state.service, !!state.day, state.time !== null];
    nav.forEach((button, i) => {
      button.disabled = !unlocked[i] || state.complete;
      if (i === state.step && !state.complete) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    counter.textContent = state.complete ? 'TERMINÉ' : `0${state.step + 1} / 04`;
  }
  function render(focus = true) {
    updateSummary();
    let body = '';
    if (state.complete) {
      body = `<h3 tabindex="-1">Simulation terminée.</h3><p>Aucune réservation n’a été envoyée. Pour prendre rendez-vous, appelez le salon.</p><p id="success-recap"></p><a class="button orange-button" href="tel:+33643287233">Appeler le salon ↗</a> <button class="booking-back" type="button" data-restart>Recommencer</button>`;
    } else if (state.step === 0) {
      body = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Tarifs et prestations : appelez le salon au 06 43 28 72 33.</p><fieldset class="service-fieldset"><legend>Choisissez une prestation</legend>${services.map(s => `<label class="service-choice"><input type="radio" name="service" value="${s.id}" ${state.service?.id === s.id ? 'checked' : ''}><strong>${s.name}</strong><span>À confirmer</span></label>`).join('')}</fieldset><button class="booking-next" type="button" ${state.service ? '' : 'disabled'}>Choisir un jour →</button>`;
    } else if (state.step === 1) {
      body = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Horaires de répertoires à confirmer. Les disponibilités sont fictives.</p><div class="choice-grid">${days().map((d, i) => `<button type="button" data-day="${dateKey(d)}" class="${state.day && dateKey(state.day) === dateKey(d) ? 'selected' : ''}" aria-pressed="${!!state.day && dateKey(state.day) === dateKey(d)}" ${d.getUTCDay() === 0 ? 'disabled' : ''}>${i === 0 ? 'Aujourd’hui' : shortDay.format(d)}${d.getUTCDay() === 0 ? '<small>Fermé</small>' : ''}</button>`).join('')}</div><button class="booking-back" type="button">← Retour</button><button class="booking-next" type="button" ${state.day ? '' : 'disabled'}>Choisir une heure →</button>`;
    } else if (state.step === 2) {
      body = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>${labelDay(state.day)} · créneaux d’exemple, sans disponibilité réelle.</p><div class="choice-grid">${availableSlots(state.day, state.service).map(slot => `<button type="button" data-time="${slot.minutes}" class="${state.time === slot.minutes ? 'selected' : ''}" aria-pressed="${state.time === slot.minutes}" ${slot.disabled ? 'disabled' : ''}>${timeLabel(slot.minutes)}${slot.reason ? `<small>${slot.reason}</small>` : ''}</button>`).join('')}</div><button class="booking-back" type="button">← Retour</button><button class="booking-next" type="button" ${state.time !== null ? '' : 'disabled'}>Vos coordonnées →</button>`;
    } else {
      body = `<h3 tabindex="-1">Vos coordonnées.</h3><p>Pour essayer la dernière étape. Ces informations restent dans votre navigateur.</p><form id="booking-form" novalidate><div class="form-field"><label for="first-name">Prénom</label><input id="first-name" name="first-name" autocomplete="given-name" required aria-describedby="name-error"><div class="error" id="name-error"></div></div><div class="form-field"><label for="phone">Téléphone mobile</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"><div class="error" id="phone-error"></div></div><p>Récapitulatif dans « Votre sélection ». Simulation uniquement&nbsp;: rien ne sera envoyé.</p><button class="booking-back" type="button">← Retour</button><button class="confirm" type="submit">Terminer la simulation →</button></form>`;
    }
    content.innerHTML = `<div class="booking-panel${focus ? ' entering' : ''}">${body}</div>`;
    if (focus) requestAnimationFrame(() => content.querySelector('.booking-panel')?.classList.remove('entering'));
    if (state.complete) document.getElementById('success-recap').textContent = `${state.name} · ${state.service.name} · ${labelDay(state.day)} à ${timeLabel(state.time)}.`;
    if (state.step === 3 && !state.complete) { document.getElementById('first-name').value = state.name; document.getElementById('phone').value = state.phone; }
    if (focus) content.querySelector('h3').focus({ preventScroll: true });
  }
  content.addEventListener('change', event => {
    if (event.target.name === 'service') {
      const next = services.find(s => s.id === event.target.value);
      if (state.service?.id !== next.id) { state.day = null; state.time = null; }
      state.service = next; updateSummary(); content.querySelector('.booking-next').disabled = false;
    }
  });
  content.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.dataset.day) { const next = new Date(`${target.dataset.day}T12:00:00Z`); if (!state.day || dateKey(state.day) !== dateKey(next)) state.time = null; state.day = next; render(false); content.querySelector(`[data-day="${dateKey(next)}"]`)?.focus({ preventScroll: true }); }
    if (target.dataset.time) { state.time = Number(target.dataset.time); render(false); content.querySelector(`[data-time="${state.time}"]`)?.focus({ preventScroll: true }); }
    if (target.classList.contains('booking-next')) { state.step++; render(); }
    if (target.classList.contains('booking-back')) { state.step--; render(); }
    if (target.hasAttribute('data-restart')) { Object.assign(state, { step: 0, service: null, day: null, time: null, name: '', phone: '', complete: false }); render(); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('first-name'); const phone = document.getElementById('phone');
    state.name = name.value.trim(); state.phone = phone.value.trim();
    const validName = state.name.length >= 2;
    const digits = state.phone.replace(/[\s.()-]/g, '').replace(/^\+33/, '0');
    const validPhone = /^0[67]\d{8}$/.test(digits);
    document.getElementById('name-error').textContent = validName ? '' : 'Indiquez votre prénom (au moins 2 caractères).';
    document.getElementById('phone-error').textContent = validPhone ? '' : 'Indiquez un numéro mobile français valide.';
    name.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) { (validName ? phone : name).focus(); return; }
    state.complete = true; render();
  });
  nav.forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.step); render(); }));
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => {
    const selected = services.find(s => s.id === button.dataset.book);
    if (state.service?.id !== selected.id) { state.day = null; state.time = null; }
    state.service = selected; state.step = 0; state.complete = false; render(); document.getElementById('reserver').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && row.dataset.category !== button.dataset.filter; });
  }));
  render(false);
})();
