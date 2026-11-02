const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  revealItems.forEach((item, index) => { item.style.transitionDelay = `${index % 3 * 60}ms`; observer.observe(item); });
} else revealItems.forEach(item => item.classList.add('visible'));

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const services = [
  { name: 'Coupe Homme « classique »', duration: 30 },
  { name: 'Shampoing + Coupe + Coiffage', duration: 30 },
  { name: 'Taille de barbe courte à la tondeuse', duration: 15 },
  { name: 'Soin visage bio nettoyant purifiant (huile d’argan et eau de rose)', duration: 45 }
];
const state = { step: 0, service: null, day: null, time: null, name: '', phone: '' };
const booking = document.querySelector('#booking');
const summary = document.querySelector('#summary');
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const days = Array.from({length: 14}, (_, i) => { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() + i); return date; });
function escapeText(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
function updateSummary() {
  const parts = [];
  if (state.service !== null) parts.push(services[state.service].name);
  if (state.day !== null) parts.push(fullDate.format(days[state.day]));
  if (state.time) parts.push(state.time);
  summary.textContent = parts.length ? parts.join(' · ') : 'Aucune sélection pour le moment.';
  const links = document.createElement('div'); links.className = 'summary-links';
  [['prestation', 0, state.service !== null], ['jour', 1, state.day !== null], ['heure', 2, Boolean(state.time)]].forEach(([label, step, available]) => { if (available) { const button = document.createElement('button'); button.type = 'button'; button.dataset.goto = step; button.textContent = `Modifier ${label === 'heure' ? 'l’' : 'la '}${label}`; links.append(button); } });
  summary.append(links);
}
function render(focus = true, animate = true) {
  updateSummary();
  let content = '';
  if (state.step === 0) content = `<h3 tabindex="-1">01 / Prestation</h3><p>Choisissez une prestation pour cette simulation.</p>${services.map((service, i) => `<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service === i ? 'checked' : ''}><span>${service.name}</span><small>${service.duration} min</small></label>`).join('')}<div class="booking-controls"><button type="button" data-action="service">Continuer →</button></div><p class="error" id="erreur"></p>`;
  if (state.step === 1) content = `<h3 tabindex="-1">02 / Jour</h3><p>Dates fictives établies selon les horaires Planity, à confirmer&nbsp;: les autres fiches diffèrent. Elles ne montrent aucune disponibilité réelle.</p><div class="days">${days.map((day, i) => `<button type="button" class="day" data-day="${i}" aria-pressed="${state.day === i}">${dateFormat.format(day)}</button>`).join('')}</div><div class="booking-controls"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="day">Continuer →</button></div><p class="error" id="erreur"></p>`;
  if (state.step === 2) {
    const date = days[state.day]; const start = date.getDay() === 0 ? 10 : 9; const duration = services[state.service].duration; const slots = [];
    for (let minute = start * 60; minute + duration <= 20 * 60; minute += 30) {
      const time = `${String(Math.floor(minute / 60)).padStart(2,'0')} h ${String(minute % 60).padStart(2,'0')}`;
      const slotDate = new Date(date); slotDate.setHours(Math.floor(minute/60), minute%60);
      slots.push(`<button type="button" class="slot" data-time="${time}" aria-pressed="${state.time === time}" ${slotDate <= new Date() ? 'disabled' : ''}>${time}</button>`);
    }
    content = `<h3 tabindex="-1">03 / Heure</h3><p>Créneaux fictifs, sans indication de disponibilité réelle.</p><div class="slots">${slots.join('')}</div><div class="booking-controls"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="time">Continuer →</button></div><p class="error" id="erreur"></p>`;
  }
  if (state.step === 3) content = `<h3 tabindex="-1">04 / Vos coordonnées</h3><p>Pour essayer le parcours seulement. Rien ne sera envoyé.</p><label class="field" for="prenom">Prénom</label><input id="prenom" type="text" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom"><p class="error" id="erreur-prenom"></p><label class="field" for="telephone">Téléphone</label><input id="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><p class="error" id="erreur-telephone"></p><div class="booking-controls"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="confirm">Terminer la simulation →</button></div>`;
  if (state.step === 4) content = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.name)}. Aucun rendez-vous n’a été envoyé ni réservé.</p><p>Pour prendre un vrai rendez-vous, utilisez Planity ou appelez le salon.</p><div class="booking-controls"><a class="button dark" href="https://www.planity.com/vintage-barber-50s-83000-toulon" target="_blank" rel="noopener">Réserver sur Planity ↗</a><button class="back" type="button" data-action="restart">Recommencer</button></div>`;
  booking.innerHTML = `<div class="booking-panel${animate ? ' enter' : ''}">${content}</div>`;
  if (focus) booking.querySelector('h3').focus({preventScroll:true});
}
booking.addEventListener('click', event => {
  const day = event.target.closest('[data-day]'); const slot = event.target.closest('[data-time]'); const action = event.target.closest('[data-action]')?.dataset.action;
  if (day) { state.day = Number(day.dataset.day); state.time = null; render(false, false); booking.querySelector(`[data-day="${state.day}"]`).focus({preventScroll:true}); }
  if (slot) { state.time = slot.dataset.time; render(false, false); [...booking.querySelectorAll('[data-time]')].find(item => item.dataset.time === state.time).focus({preventScroll:true}); }
  if (!action) return;
  const error = booking.querySelector('#erreur');
  if (action === 'service') { const selected = booking.querySelector('input[name=prestation]:checked'); if (!selected) { error.textContent = 'Choisissez une prestation pour continuer.'; return; } const next = Number(selected.value); if (state.service !== next) { state.day = null; state.time = null; } state.service = next; state.step = 1; }
  if (action === 'day') { if (state.day === null) { error.textContent = 'Choisissez un jour pour continuer.'; return; } state.step = 2; }
  if (action === 'time') { if (!state.time) { error.textContent = 'Choisissez une heure pour continuer.'; return; } state.step = 3; }
  if (action === 'back') { if (state.step === 3) { state.name = booking.querySelector('#prenom').value; state.phone = booking.querySelector('#telephone').value; } state.step--; }
  if (action === 'confirm') { const nameField = booking.querySelector('#prenom'); const phoneField = booking.querySelector('#telephone'); state.name = nameField.value.trim(); state.phone = phoneField.value.trim(); const nameValid = Boolean(state.name); const phoneValid = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone); nameField.setAttribute('aria-invalid', String(!nameValid)); phoneField.setAttribute('aria-invalid', String(!phoneValid)); booking.querySelector('#erreur-prenom').textContent = nameValid ? '' : 'Indiquez votre prénom.'; booking.querySelector('#erreur-telephone').textContent = phoneValid ? '' : 'Indiquez un numéro de téléphone français valide.'; if (!nameValid || !phoneValid) { (nameValid ? phoneField : nameField).focus(); return; } state.step = 4; }
  if (action === 'restart') { Object.assign(state, {step:0,service:null,day:null,time:null,name:'',phone:''}); }
  render(true, event.detail !== 0);
});
summary.addEventListener('click', event => { const button = event.target.closest('[data-goto]'); if (!button) return; if (state.step === 3) { state.name = booking.querySelector('#prenom').value; state.phone = booking.querySelector('#telephone').value; } state.step = Number(button.dataset.goto); render(true, event.detail !== 0); });
render(false);
