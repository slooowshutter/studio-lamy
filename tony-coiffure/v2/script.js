const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  reveals.forEach((element, index) => { element.style.transitionDelay = `${(index % 3) * 80}ms`; observer.observe(element); element.classList.add('observed'); });
} else reveals.forEach(element => element.classList.add('visible'));

const services = {
  homme: { name: 'Coupe homme, shampoing et coiffage', duration: 25 },
  femme: { name: 'Coupe femme, soin, shampoing et brushing', duration: 60 },
  couleur: { name: 'Coloration des racines', duration: 60 }
};
const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
const content = document.querySelector('#booking-content');
const progress = document.querySelector('#progress');
const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDate = value => { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); };
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function updateSummary() {
  document.querySelector('#sum-service').textContent = services[state.service]?.name || '—';
  document.querySelector('#sum-date').textContent = state.date ? formatDate(parseDate(state.date)) : '—';
  document.querySelector('#sum-time').textContent = state.time || '—';
  document.querySelector('[data-jump="1"]').disabled = !state.service;
  document.querySelector('[data-jump="2"]').disabled = !state.service || !state.date;
}
function dateChoices() {
  const today = new Date();
  return Array.from({length: 14}, (_, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const value = dateKey(day), closed = day.getDay() === 0;
    return `<label class="choice"><input type="radio" name="jour" value="${value}" ${closed ? 'disabled' : ''} ${state.date === value ? 'checked' : ''}><span>${formatDate(day)}</span>${closed ? '<small>Fermé</small>' : ''}</label>`;
  }).join('');
}
function timeChoices() {
  const day = parseDate(state.date), weekday = day.getDay();
  const ranges = {1:[660,1080],2:[570,1110],3:[570,1110],4:[570,1110],5:[600,1110],6:[570,1140]};
  if (!ranges[weekday]) return '';
  const [start,end] = ranges[weekday], now = new Date();
  let output = '';
  for (let minute = start, i = 0; minute + services[state.service].duration <= end; minute += 30, i++) {
    const hh = Math.floor(minute / 60), mm = minute % 60;
    const value = `${String(hh).padStart(2,'0')} h ${String(mm).padStart(2,'0')}`;
    const instant = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm);
    const disabled = instant <= now || (i + day.getDate()) % 5 === 0;
    if (disabled && state.time === value) state.time = '';
    output += `<label class="choice"><input type="radio" name="heure" value="${value}" ${disabled ? 'disabled' : ''} ${state.time === value && !disabled ? 'checked' : ''}><span>${value}</span>${disabled ? '<small>Indisponible</small>' : ''}</label>`;
  }
  return output;
}
function render(focus = true) {
  if (state.step === 2 && state.date && state.service) timeChoices();
  updateSummary();
  progress.textContent = state.step < 4 ? `ÉTAPE ${state.step + 1} / 4` : 'TICKET IMPRIMÉ';
  let html = '';
  if (state.step === 0) html = `<h3 tabindex="-1">Choisir une prestation</h3><fieldset><legend>Votre choix</legend>${Object.entries(services).map(([key,s]) => `<label class="choice"><input type="radio" name="prestation" value="${key}" ${state.service === key ? 'checked' : ''}><span>${s.name}</span></label>`).join('')}</fieldset><div class="booking-actions"><button class="next" data-next ${state.service ? '' : 'disabled'}>Choisir le jour →</button></div>`;
  if (state.step === 1) html = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires publiés ; lundi à confirmer.</p><fieldset><legend>Les 14 prochains jours</legend>${dateChoices()}</fieldset><div class="booking-actions"><button data-back>← Prestation</button><button class="next" data-next ${state.date ? '' : 'disabled'}>Choisir l’heure →</button></div>`;
  if (state.step === 2) html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs, dans les horaires publiés.</p><fieldset><legend>${formatDate(parseDate(state.date))}</legend>${timeChoices()}</fieldset><div class="booking-actions"><button data-back>← Jour</button><button class="next" data-next ${state.time ? '' : 'disabled'}>Vos coordonnées →</button></div>`;
  if (state.step === 3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cette simulation, ces informations restent sur votre appareil.</p><form novalidate><label class="field" for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom" required><div class="error" id="erreur-prenom"></div><label class="field" for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone" required><div class="error" id="erreur-telephone"></div><div class="booking-actions"><button type="button" data-back>← Heure</button><button class="next" type="submit">Imprimer le ticket →</button></div></form>`;
  if (state.step === 4) html = `<h3 tabindex="-1">Votre ticket est prêt.</h3><p>Ceci est une simulation&nbsp;: aucun rendez-vous n’a été envoyé ou enregistré. Pour réserver, appelez le salon.</p><div class="printed"><span class="serial">TONY COIFFURE / SIMULATION</span><p><strong>${escapeText(state.name)}</strong><br>${escapeText(services[state.service].name)}<br>${formatDate(parseDate(state.date))} à ${escapeText(state.time)}</p><div class="barcode" aria-hidden="true"></div></div><div class="booking-actions"><a class="button dark" href="tel:0145896461">Appeler le salon ↗</a><button data-restart>Recommencer</button></div>`;
  content.innerHTML = `<div class="step-in">${html}</div>`;
  if (focus) content.querySelector('h3')?.focus({preventScroll:true});
}
content.addEventListener('change', event => {
  const target = event.target;
  if (target.name === 'prestation') { if (state.service !== target.value) { state.date = ''; state.time = ''; } state.service = target.value; }
  if (target.name === 'jour') { if (state.date !== target.value) state.time = ''; state.date = target.value; }
  if (target.name === 'heure') state.time = target.value;
  updateSummary();
  const next = content.querySelector('[data-next]'); if (next) next.disabled = false;
});
content.addEventListener('click', event => {
  if (event.target.closest('[data-next]')) { state.step++; render(); }
  if (event.target.closest('[data-back]')) { if (state.step === 3) { state.name = content.querySelector('#prenom').value; state.phone = content.querySelector('#telephone').value; } state.step--; render(); }
  if (event.target.closest('[data-restart]')) { Object.assign(state, { step:0, service:'', date:'', time:'', name:'', phone:'' }); render(); }
});
content.addEventListener('submit', event => {
  event.preventDefault();
  const name = content.querySelector('#prenom'), phone = content.querySelector('#telephone');
  state.name = name.value.trim(); state.phone = phone.value.trim();
  const validName = state.name.length > 0;
  const digits = state.phone.replace(/[\s.()-]/g,'');
  const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
  content.querySelector('#erreur-prenom').textContent = validName ? '' : 'Indiquez votre prénom.';
  content.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro français valide.';
  name.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
  if (!validName || !validPhone) { (validName ? phone : name).focus(); return; }
  state.step = 4; render();
});
document.querySelector('.summary').addEventListener('click', event => {
  const button = event.target.closest('[data-jump]');
  if (!button || button.disabled) return;
  if (state.step === 3) { state.name = content.querySelector('#prenom').value; state.phone = content.querySelector('#telephone').value; }
  state.step = Number(button.dataset.jump); render();
});
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  state.service = link.dataset.service; state.date = ''; state.time = ''; state.step = 0; render(false);
}));
render(false);
