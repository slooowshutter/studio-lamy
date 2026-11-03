const root = document.documentElement;
root.classList.add('js');
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 }) : null;
document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));

const content = document.querySelector('#booking-content');
const count = document.querySelector('#step-count');
const summary = document.querySelector('#summary');
const state = { step: 1, date: null, time: '', name: '', phone: '' };
const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
const pad = n => String(n).padStart(2, '0');
function dates() {
  const result = [];
  for (let i = 0; i < 14; i++) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); result.push(d); }
  return result;
}
function slots(date) {
  const close = date.getDay() === 6 ? 20 : 19;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const list = [];
  for (let minutes = 600; minutes + 75 <= close * 60; minutes += 30) {
    const text = `${pad(Math.floor(minutes / 60))} h ${pad(minutes % 60)}`;
    const past = sameDay && minutes <= now.getHours() * 60 + now.getMinutes();
    list.push({ text, disabled: past || (minutes / 30 + date.getDate()) % 5 === 0 });
  }
  return list;
}
function updateSummary() {
  const parts = [];
  if (state.step > 1) parts.push('<button type="button" data-step="1">BayaArtist Signature</button>');
  if (state.date) parts.push(`<button type="button" data-step="2">${dateLabel(state.date)}</button>`);
  if (state.time) parts.push(`<button type="button" data-step="3">${state.time}</button>`);
  summary.innerHTML = parts.length ? parts.join('<span aria-hidden="true"> · </span>') : 'À composer';
}
summary.addEventListener('click', event => {
  const step = event.target.closest('[data-step]');
  if (!step) return;
  state.step = Number(step.dataset.step);
  render();
});

function render(focus = true) {
  updateSummary();
  count.textContent = state.step <= 4 ? `0${state.step} / 04` : 'Terminé';
  let html = '';
  if (state.step === 1) {
    html = `<h3 tabindex="-1">Choisir le soin</h3><p>Une seule prestation est présentée dans cette simulation.</p><div class="choices"><div class="choice"><input type="radio" name="soin" id="soin-signature" checked><label for="soin-signature">BayaArtist Signature<br>1 h 15</label></div></div><div class="booking-actions"><span></span><button class="primary" data-action="next">Choisir un jour →</button></div>`;
  } else if (state.step === 2) {
    html = `<h3 tabindex="-1">Choisir un jour</h3><p>Créneaux fictifs, horaires à confirmer auprès de Bayaartist.</p><div class="choices days">${dates().map((d,i) => { const closed = d.getDay() === 0; const short = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d); return `<div class="choice"><input type="radio" name="jour" id="jour-${i}" value="${i}" ${closed?'disabled':''} ${state.date && d.toDateString() === state.date.toDateString()?'checked':''}><label for="jour-${i}">${short}${closed?'<small>Fermé</small>':''}</label></div>`; }).join('')}</div><div class="booking-actions"><button data-action="back">← Retour</button><button class="primary" data-action="next" ${state.date?'':'disabled'}>Choisir une heure →</button></div>`;
  } else if (state.step === 3) {
    html = `<h3 tabindex="-1">Choisir une heure</h3><p>${dateLabel(state.date)} · les créneaux barrés sont indisponibles dans cet exemple.</p><div class="choices">${slots(state.date).map((s,i)=>`<div class="choice"><input type="radio" name="heure" id="heure-${i}" value="${s.text}" ${s.disabled?'disabled':''} ${state.time===s.text?'checked':''}><label for="heure-${i}">${s.text}</label></div>`).join('')}</div><div class="booking-actions"><button data-action="back">← Retour</button><button class="primary" data-action="next" ${state.time?'':'disabled'}>Vos coordonnées →</button></div>`;
  } else if (state.step === 4) {
    html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Rien ne sera transmis.</p><form id="coordonnees" novalidate><label class="field"><span>Prénom</span><input name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom" value=""><span class="error" id="erreur-prenom" role="status"></span></label><label class="field"><span>Téléphone</span><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone" value=""><span class="error" id="erreur-telephone" role="status"></span></label><div class="booking-actions"><button type="button" data-action="back">← Retour</button><button class="primary" type="submit">Terminer la simulation</button></div></form>`;
  } else {
    html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Votre choix est récapitulé ci-dessus. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p>Pour une vraie demande, utilisez la page Planity ou appelez Bayaartist.</p><a class="text-link" href="https://www.planity.com/bayaartist-13001-marseille" target="_blank" rel="noopener">Aller sur Planity ↗</a><div class="booking-actions"><button data-action="restart">Recommencer</button></div>`;
  }
  content.innerHTML = `<div class="booking-step entering">${html}</div>`;
  requestAnimationFrame(() => content.querySelector('.booking-step')?.classList.remove('entering'));
  if (state.step === 4) { content.querySelector('[name="prenom"]').value = state.name; content.querySelector('[name="telephone"]').value = state.phone; }
  if (focus) content.querySelector('h3').focus({preventScroll:true});
}
content.addEventListener('change', event => {
  if (event.target.name === 'jour') { state.date = dates()[Number(event.target.value)]; state.time = ''; updateSummary(); content.querySelector('[data-action="next"]').disabled = false; }
  if (event.target.name === 'heure') { state.time = event.target.value; updateSummary(); content.querySelector('[data-action="next"]').disabled = false; }
});
content.addEventListener('click', event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'next') state.step++;
  if (action === 'back') { if (state.step === 4) { state.name = content.querySelector('[name="prenom"]').value; state.phone = content.querySelector('[name="telephone"]').value; } state.step--; }
  if (action === 'restart') Object.assign(state, { step: 1, date: null, time: '', name: '', phone: '' });
  render();
});
content.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const name = form.elements.prenom.value.trim();
  const phone = form.elements.telephone.value.trim();
  const digits = phone.replace(/[\s.()-]/g, '');
  const nameError = form.querySelector('#erreur-prenom');
  const phoneError = form.querySelector('#erreur-telephone');
  nameError.textContent = ''; phoneError.textContent = '';
  form.elements.prenom.removeAttribute('aria-invalid'); form.elements.telephone.removeAttribute('aria-invalid');
  if (!name) { nameError.textContent = 'Indiquez votre prénom.'; form.elements.prenom.setAttribute('aria-invalid', 'true'); form.elements.prenom.focus(); return; }
  if (!/^(?:\+33|0)[1-9]\d{8}$/.test(digits)) { phoneError.textContent = 'Indiquez un numéro de téléphone français valide.'; form.elements.telephone.setAttribute('aria-invalid', 'true'); form.elements.telephone.focus(); return; }
  state.name = name; state.phone = phone; state.step = 5; render();
});
render(false);
