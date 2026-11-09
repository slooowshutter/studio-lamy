(() => {
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary-text');
  const stepButtons = [...document.querySelectorAll('[data-go]')];
  const services = [
    { name: 'Pose de vernis mains', duration: 15 },
    { name: 'Vernis semi-permanent mains', duration: 20 },
    { name: 'Pose gel avec résine Babyboomer', duration: 70 }
  ];
  const state = { step: 0, furthest: 0, service: null, day: null, time: null, first: '', phone: '' };
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const clock = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
  const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  function render() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.furthest;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const bits = [];
    if (state.service !== null) bits.push(services[state.service].name);
    if (state.day) bits.push(dateLabel(state.day));
    if (state.time !== null) bits.push(clock(state.time));
    summary.textContent = bits.length ? bits.join(' · ') : 'Choisissez une prestation pour commencer.';
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><fieldset><legend>Prestation</legend>${services.map((s, i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === i ? 'checked' : ''}><span>${s.name}</span><span>${s.duration === 70 ? '1 h 10' : s.duration + ' min'}</span></label>`).join('')}</fieldset><div class="booking-actions"><button type="button" data-next ${state.service === null ? 'disabled' : ''}>Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const days = Array.from({ length: 14 }, (_, i) => { const date = new Date(today); date.setDate(today.getDate() + i); return date; });
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Le dimanche reste à confirmer auprès du salon.</p><fieldset><legend>Jours proposés</legend><div class="days">${days.map((date, i) => `<label><input type="radio" name="day" value="${i}" ${date.getDay() === 0 ? 'disabled' : ''} ${state.day && dayKey(state.day) === dayKey(date) ? 'checked' : ''}><span>${dateLabel(date)}${date.getDay() === 0 ? '<br>à confirmer' : ''}</span></label>`).join('')}</div></fieldset><div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="button" data-next ${!state.day ? 'disabled' : ''}>Choisir une heure →</button></div>`;
    } else if (state.step === 2) {
      const now = new Date(); const slots = [];
      for (let minute = 600; minute + services[state.service].duration <= 1170; minute += 30) slots.push(minute);
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>${dateLabel(state.day)} · horaires à confirmer</p><fieldset><legend>Créneaux simulés</legend><p>Les disponibilités réelles ne sont pas vérifiées.</p><div class="slots">${slots.map(minute => { const past = dayKey(state.day) === dayKey(now) && minute <= now.getHours() * 60 + now.getMinutes(); return `<label><input type="radio" name="time" value="${minute}" ${past ? 'disabled' : ''} ${state.time === minute ? 'checked' : ''}><span>${clock(minute)}${past ? ' · passé' : ''}</span></label>`; }).join('')}</div></fieldset><div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="button" data-next ${state.time === null ? 'disabled' : ''}>Vos coordonnées →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Rien ne sera envoyé.</p><form id="booking-form" novalidate><label class="field" for="first">Prénom<input id="first" name="first" autocomplete="given-name" required aria-describedby="first-error"></label><p class="error" id="first-error"></p><label class="field" for="phone">Téléphone<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"></label><p class="error" id="phone-error"></p><div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="submit">Confirmer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est récapitulée ci-dessous. Aucun rendez-vous n’a été pris et aucune information n’a été transmise.</p><div class="booking-actions"><button type="button" data-restart>Recommencer</button></div><p><a class="text-link" href="https://www.planity.com/sunny-nails-75015-paris">Réserver réellement sur Planity ↗</a></p>`;
    }
    content.innerHTML = `<div class="step-enter">${html}</div>`;
    if (state.step === 3) { content.querySelector('#first').value = state.first; content.querySelector('#phone').value = state.phone; }
  }
  function go(step) { state.step = step; state.furthest = Math.max(state.furthest, step); render(); content.querySelector('h3')?.focus({ preventScroll: true }); }
  content.addEventListener('change', event => {
    const target = event.target;
    if (target.name === 'service') { state.service = Number(target.value); state.day = null; state.time = null; state.furthest = 0; }
    if (target.name === 'day') { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + Number(target.value)); state.day = day; state.time = null; state.furthest = 1; }
    if (target.name === 'time') { state.time = Number(target.value); state.furthest = 2; }
    const selectedName = target.name;
    render();
    content.querySelector(`input[name="${selectedName}"]:checked`)?.focus({ preventScroll: true });
  });
  content.addEventListener('input', event => {
    if (event.target.name === 'first') state.first = event.target.value;
    if (event.target.name === 'phone') state.phone = event.target.value;
  });
  content.addEventListener('click', event => {
    if (event.target.closest('[data-next]')) go(state.step + 1);
    if (event.target.closest('[data-back]')) go(state.step - 1);
    if (event.target.closest('[data-restart]')) { Object.assign(state, { step: 0, furthest: 0, service: null, day: null, time: null, first: '', phone: '' }); go(0); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault();
    const first = content.querySelector('#first'); const phone = content.querySelector('#phone');
    const validFirst = first.value.trim().length >= 2;
    const validPhone = /^(?:(?:\+|00)33|0)[1-9](?:[ .-]*\d{2}){4}$/.test(phone.value.trim());
    content.querySelector('#first-error').textContent = validFirst ? '' : 'Indiquez votre prénom.';
    content.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    first.setAttribute('aria-invalid', String(!validFirst)); phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validFirst || !validPhone) { (validFirst ? phone : first).focus(); return; }
    go(4);
  });
  stepButtons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.go))));
  render();
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .1 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  } else document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
})();
