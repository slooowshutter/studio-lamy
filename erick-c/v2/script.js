(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('loaded'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    reveals.forEach(element => observer.observe(element));
  } else reveals.forEach(element => element.classList.add('visible'));

  const art = document.querySelector('.hero-art');
  if ('IntersectionObserver' in window) {
    const artObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { art.classList.add('in-view'); artObserver.unobserve(art); }
    }), { threshold: 0.2 });
    artObserver.observe(art);
  } else art.classList.add('in-view');

  const app = document.querySelector('#booking-app');
  const counter = document.querySelector('#step-count');
  const state = { step: 1, service: '', day: '', time: '', first: '', phone: '' };
  const services = ['Coupe femme', 'Coloration', 'Mèches', 'Permanente', 'Coiffure de mariage'];
  const format = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + i);
    return date;
  });
  function updateSummary() {
    document.querySelector('#summary-service').textContent = state.service || 'À choisir';
    document.querySelector('#summary-day').textContent = state.day ? format.format(days[Number(state.day)]) : 'À choisir';
    document.querySelector('#summary-time').textContent = state.time || 'À choisir';
    document.querySelector('[data-go="2"]').disabled = !state.service;
    document.querySelector('[data-go="3"]').disabled = !state.day;
  }
  function render(focus = true) {
    counter.textContent = state.step <= 4 ? `Étape ${state.step} / 4` : 'Simulation terminée';
    let content = '';
    if (state.step === 1) {
      content = `<h3 tabindex="-1">Choisissez une prestation</h3><p>Prestations citées dans les annuaires, à confirmer avec le salon. Aucun tarif ni durée n’est indiqué dans cette simulation.</p><div class="choice-grid">${services.map((s, i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div><p class="error" id="step-error"></p><div class="step-actions"><button class="step-button" data-action="service">Choisir un jour →</button></div>`;
    } else if (state.step === 2) {
      content = `<h3 tabindex="-1">Choisissez un jour</h3><p>Horaires des annuaires à confirmer. Les jours fermés ne peuvent pas être choisis.</p><div class="choice-grid">${days.map((d, i) => { const closed = d.getDay() === 0 || d.getDay() === 1; return `<label class="choice"><input type="radio" name="day" value="${i}" ${state.day === String(i) ? 'checked' : ''} ${closed ? 'disabled' : ''}><span>${format.format(d)}${closed ? ' · fermé' : ''}</span></label>`; }).join('')}</div><p class="error" id="step-error"></p><div class="step-actions"><button class="back-button" data-back="1">← Prestation</button><button class="step-button" data-action="day">Choisir une heure →</button></div>`;
    } else if (state.step === 3) {
      const date = days[Number(state.day)], end = date.getDay() === 6 ? 18 : 19;
      const slots = Array.from({ length: end - 9 }, (_, i) => 9 + i);
      const noneLeft = date.toDateString() === new Date().toDateString() && slots.every(hour => hour <= new Date().getHours());
      content = `<h3 tabindex="-1">Choisissez une heure</h3>${noneLeft ? '<p>Toutes les heures proposées pour aujourd’hui sont passées. Revenez au choix du jour pour continuer.</p>' : ''}<p>Heures proposées pour la simulation, sans disponibilité réelle. La durée est à confirmer par téléphone.</p><div class="choice-grid">${slots.map(hour => {const past = date.toDateString() === new Date().toDateString() && hour <= new Date().getHours(); const value = `${hour} h`; return `<button class="slot" data-time="${hour}" aria-pressed="${state.time === value}" ${past ? 'disabled' : ''}>${value}${past ? ' · passé' : ''}</button>`;}).join('')}</div><p class="error" id="step-error"></p><div class="step-actions"><button class="back-button" data-back="2">← Jour</button><button class="step-button" data-action="time">Vos coordonnées →</button></div>`;
    } else if (state.step === 4) {
      content = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour terminer la simulation. Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="details" novalidate><div class="field"><label for="first">Prénom</label><input id="first" name="first" autocomplete="given-name" required aria-describedby="first-error"><p class="error" id="first-error" aria-live="polite"></p></div><div class="field"><label for="phone">Téléphone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"><p class="error" id="phone-error" aria-live="polite"></p></div><div class="step-actions"><button class="back-button" type="button" data-back="3">← Heure</button><button class="step-button" type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      content = `<h3 tabindex="-1">Simulation terminée.</h3><p id="success-recap"></p><p>Aucun rendez-vous n’a été envoyé. Pour réserver réellement, appelez le salon.</p><div class="step-actions"><a class="step-button" href="tel:+33561578184">Appeler le salon ↗</a><button class="back-button" data-back="1">Recommencer</button></div>`;
    }
    app.innerHTML = `<div class="step-view">${content}</div>`;
    const view = app.querySelector('.step-view');
    requestAnimationFrame(() => requestAnimationFrame(() => view.classList.add('ready')));
    if (state.step === 4) { document.querySelector('#first').value = state.first; document.querySelector('#phone').value = state.phone; }
    if (state.step === 5) document.querySelector('#success-recap').textContent = `${state.first}, votre sélection : ${state.service}, ${format.format(days[Number(state.day)])} à ${state.time}.`;
    updateSummary();
    if (focus) app.querySelector('h3').focus({ preventScroll: true });
  }
  document.querySelector('.selection').addEventListener('click', event => {
    const button = event.target.closest('[data-go]');
    if (button && !button.disabled) { state.step = Number(button.dataset.go); render(); }
  });
  app.addEventListener('click', event => {
    const back = event.target.closest('[data-back]');
    if (back) { state.step = Number(back.dataset.back); render(); return; }
    const slot = event.target.closest('[data-time]');
    if (slot) { state.time = `${slot.dataset.time} h`; app.querySelectorAll('[data-time]').forEach(button => button.setAttribute('aria-pressed', String(button === slot))); updateSummary(); return; }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    const error = app.querySelector('#step-error');
    if (action.dataset.action === 'service') { const picked = app.querySelector('input[name="service"]:checked'); if (!picked) { error.textContent = 'Choisissez une prestation pour continuer.'; return; } state.service = services[Number(picked.value)]; state.step = 2; }
    if (action.dataset.action === 'day') { const picked = app.querySelector('input[name="day"]:checked'); if (!picked) { error.textContent = 'Choisissez un jour pour continuer.'; return; } if (state.day !== picked.value) state.time = ''; state.day = picked.value; state.step = 3; }
    if (action.dataset.action === 'time') { if (!state.time) { error.textContent = 'Choisissez une heure pour continuer.'; return; } state.step = 4; }
    render();
  });
  app.addEventListener('submit', event => {
    event.preventDefault(); const first = app.querySelector('#first'), phone = app.querySelector('#phone');
    state.first = first.value.trim(); state.phone = phone.value.trim();
    const digits = state.phone.replace(/[\s.()-]/g, '');
    const firstOk = state.first.length > 0, phoneOk = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    app.querySelector('#first-error').textContent = firstOk ? '' : 'Indiquez votre prénom.';
    app.querySelector('#phone-error').textContent = phoneOk ? '' : 'Indiquez un numéro de téléphone français valide.';
    first.setAttribute('aria-invalid', String(!firstOk)); phone.setAttribute('aria-invalid', String(!phoneOk));
    if (!firstOk || !phoneOk) { (firstOk ? phone : first).focus(); return; }
    state.step = 5; render();
  });
  render(false);
})();
