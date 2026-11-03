(() => {
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  const rows = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .1 });
    rows.forEach((row, i) => { row.style.setProperty('--delay', `${(i % 5) * 40}ms`); observer.observe(row); });
  } else rows.forEach(row => row.classList.add('visible'));

  const app = document.querySelector('#booking-app');
  const state = { service: '', day: '', time: '', first: '', phone: '' };
  const services = ['Coupe femme', 'Coupe homme', 'Coupe enfant', 'Coloration', 'Balayage'];
  const dates = [];
  const start = new Date(); start.setHours(0,0,0,0);
  for (let i = 0; i < 14; i++) { const date = new Date(start); date.setDate(start.getDate() + i); dates.push(date); }
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const label = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(date);
  const findDate = value => dates.find(date => key(date) === value);
  const selected = (value, chosen) => value === chosen ? ' checked' : '';
  const isPast = (date, hour) => { const point = new Date(date); point.setHours(hour, 0, 0, 0); return point <= new Date(); };
  const summary = () => {
    document.querySelector('#summary-service b').textContent = state.service || '—';
    document.querySelector('#summary-day b').textContent = state.day ? label(findDate(state.day)) : '—';
    document.querySelector('#summary-time b').textContent = state.time || '—';
    document.querySelector('#summary-day').disabled = !state.service;
    document.querySelector('#summary-time').disabled = !state.day;
  };
  function show(step, focus = true) {
    if (state.day && state.time) {
      const hour = Number(state.time.split(' ')[0]);
      if (isPast(findDate(state.day), hour)) state.time = '';
    }
    summary();
    let content = '';
    if (step === 1) content = `<h3 tabindex="-1">01. Choisir une prestation</h3><p class="help">Liste à confirmer auprès du salon.</p><div class="options">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}"${selected(s,state.service)}><span>${s}</span></label>`).join('')}</div><div class="step-actions"><span></span><button class="button" type="button" data-next="2" ${state.service ? '' : 'disabled'}>Choisir un jour →</button></div>`;
    if (step === 2) content = `<h3 tabindex="-1">02. Choisir un jour</h3><p class="help">Horaires d’annuaire à confirmer. Les jours fermés ne sont pas proposés.</p><div class="options">${dates.map(date => {const closed = date.getDay() === 0 || date.getDay() === 3; const elapsed = [10,14,16].every(h => isPast(date,h)); const value = key(date); return `<label class="choice"><input type="radio" name="day" value="${value}"${selected(value,state.day)} ${closed || elapsed ? 'disabled' : ''}><span>${label(date)}</span><small>${closed ? 'Fermé' : elapsed ? 'Passé' : 'Exemple'}</small></label>`}).join('')}</div><div class="step-actions"><button class="button secondary" type="button" data-back="1">← Prestation</button><button class="button" type="button" data-next="3" ${state.day ? '' : 'disabled'}>Choisir une heure →</button></div>`;
    if (step === 3) {
      const date = findDate(state.day);
      const times = ['10 h 00','14 h 00','16 h 00'];
      content = `<h3 tabindex="-1">03. Choisir une heure</h3><p class="help">Exemples dans les horaires indiqués, sans disponibilité réelle ni durée garantie.</p><div class="options">${times.map((t,i) => {const h=[10,14,16][i]; const past = isPast(date,h); return `<label class="choice"><input type="radio" name="time" value="${t}"${selected(t,state.time)} ${past ? 'disabled' : ''}><span>${t}</span><small>${past ? 'Passé' : 'Exemple'}</small></label>`}).join('')}</div><div class="step-actions"><button class="button secondary" type="button" data-back="2">← Jour</button><button class="button" type="button" data-next="4" ${state.time ? '' : 'disabled'}>Vos coordonnées →</button></div>`;
    }
    if (step === 4) content = `<h3 tabindex="-1">04. Vos coordonnées</h3><p class="help">Ces informations restent dans cette page et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required aria-describedby="first-error"></label><p class="error" id="first-error"></p><label class="field">Téléphone<input name="phone" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"></label><p class="error" id="phone-error"></p><div class="step-actions"><button class="button secondary" type="button" data-back="3">← Heure</button><button class="button" type="submit">Terminer la simulation →</button></div></form>`;
    if (step === 5) content = `<h3 tabindex="-1">Simulation terminée</h3><p class="success-note">Aucun rendez-vous n’a été pris et aucune information n’a été envoyée. Pour joindre le salon, appelez le <a href="tel:0380303862">03 80 30 38 62</a>.</p><button class="button secondary" type="button" data-reset>Recommencer</button>`;
    app.innerHTML = `<div class="step step-enter" aria-live="polite">${content}</div>`;
    const panel = app.firstElementChild;
    requestAnimationFrame(() => panel.classList.remove('step-enter'));
    if (step === 4) { app.querySelector('[name="first"]').value = state.first; app.querySelector('[name="phone"]').value = state.phone; }
    if (focus) panel.querySelector('h3').focus();
  }
  document.querySelector('.summary').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (button && !button.disabled) show(Number(button.dataset.step)); });
  app.addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'service') { state.service = value; }
    if (name === 'day') { if (state.day !== value) state.time = ''; state.day = value; }
    if (name === 'time') state.time = value;
    summary(); const next = app.querySelector('[data-next]'); if (next) next.disabled = false;
  });
  app.addEventListener('input', event => { if (event.target.name === 'first' || event.target.name === 'phone') { state[event.target.name] = event.target.value; const error = app.querySelector(`#${event.target.name}-error`); if (error) error.textContent = ''; event.target.removeAttribute('aria-invalid'); } });
  app.addEventListener('click', event => {
    const next = event.target.closest('[data-next]'); const back = event.target.closest('[data-back]');
    if (next) show(Number(next.dataset.next));
    if (back) show(Number(back.dataset.back));
    if (event.target.closest('[data-reset]')) { Object.keys(state).forEach(k => state[k] = ''); show(1); }
  });
  app.addEventListener('submit', event => {
    event.preventDefault(); const first = state.first.trim(); const digits = state.phone.replace(/[\s.()-]/g,'');
    const firstError = app.querySelector('#first-error'); const phoneError = app.querySelector('#phone-error');
    firstError.textContent = first ? '' : 'Indiquez votre prénom.';
    phoneError.textContent = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits) ? '' : 'Indiquez un numéro de téléphone français valide.';
    app.querySelector('[name="first"]').toggleAttribute('aria-invalid', Boolean(firstError.textContent));
    app.querySelector('[name="phone"]').toggleAttribute('aria-invalid', Boolean(phoneError.textContent));
    if (firstError.textContent || phoneError.textContent) { const field = app.querySelector(firstError.textContent ? '[name="first"]' : '[name="phone"]'); field.setAttribute('aria-invalid','true'); field.focus(); return; }
    show(5);
  });
  show(1, false);
})();
