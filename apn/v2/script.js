const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => root.classList.add('loaded'));
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .01 }) : null;
document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tous' && row.dataset.category !== button.dataset.filter; });
}));
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#summary');
const progress = document.querySelector('#progress');
const services = [{name:'Coupe classique', duration:30}, {name:'Barbe classique', duration:30}, {name:'Coupe & barbe classique', duration:45}];
const state = {step:0, service:null, date:null, time:null, first:'', phone:''};
const formatDate = date => new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'}).format(date);
function render(focusHeading = false, restoreSelector = null) {
  progress.textContent = state.step < 4 ? `0${state.step + 1} / 04` : 'TERMINÉ';
  summary.textContent = 'Votre sélection : ' + [state.service?.name, state.date && formatDate(state.date), state.time].filter(Boolean).join(' · ');
  if (!state.service) summary.textContent += 'à commencer';
  let html = '';
  if (state.step === 0) {
    html = '<h3 class="step-title" tabindex="-1">Choisir une prestation</h3><p class="step-help">Simulation sans prix. Pour le tarif hebdomadaire, appelez le salon.</p>' + services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === s ? 'checked' : ''}><span>${s.name}</span><small>${s.duration} min</small></label>`).join('') + '<p class="error" id="error"></p><div class="flow-actions"><button type="button" data-action="next">Continuer →</button></div>';
  } else if (state.step === 1) {
    const now = new Date(); now.setHours(12,0,0,0);
    html = '<h3 class="step-title" tabindex="-1">Choisir un jour</h3><p class="step-help">Dates proposées pour la simulation, horaires à confirmer.</p><div class="days">' + Array.from({length:12}, (_,i) => {const d = new Date(now); d.setDate(d.getDate()+i); return `<button type="button" data-day="${i}" class="${state.date && d.toDateString() === state.date.toDateString() ? 'selected' : ''}" aria-pressed="${!!state.date && d.toDateString() === state.date.toDateString()}">${formatDate(d)}</button>`;}).join('') + '</div><p class="error" id="error"></p><div class="flow-actions"><button class="back" data-action="back">← Retour</button><button data-action="next">Continuer →</button></div>';
  } else if (state.step === 2) {
    const slots=[]; const now=new Date();
    for(let minutes=9*60; minutes + state.service.duration <= 19*60; minutes+=30) { const h=String(Math.floor(minutes/60)).padStart(2,'0'), m=String(minutes%60).padStart(2,'0'); const time=`${h}:${m}`; const past = state.date.toDateString() === now.toDateString() && minutes <= now.getHours()*60+now.getMinutes(); if(!past) slots.push(`<button type="button" data-time="${time}" class="${state.time === time ? 'selected' : ''}" aria-pressed="${state.time === time}">${h} h ${m}</button>`); }
    html = '<h3 class="step-title" tabindex="-1">Choisir une heure</h3><p class="step-help">Créneaux fictifs, sans indication de disponibilité réelle.</p><div class="slots">' + (slots.join('') || 'Aucun horaire proposé pour ce jour.') + '</div><p class="error" id="error"></p><div class="flow-actions"><button class="back" data-action="back">← Retour</button><button data-action="next">Continuer →</button></div>';
  } else if (state.step === 3) {
    html = `<h3 class="step-title" tabindex="-1">Vos coordonnées</h3><p class="step-help">Elles restent dans cette page et ne sont pas envoyées.</p><label class="field"><span>Prénom</span><input id="first" aria-describedby="error" autocomplete="given-name" value="${escapeText(state.first)}"></label><label class="field"><span>Téléphone</span><input id="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="error"></label><p class="error" id="error" aria-live="polite"></p><div class="flow-actions"><button class="back" data-action="back">← Retour</button><button data-action="confirm">Terminer la simulation →</button></div>`;
  } else {
    html = `<h3 class="step-title" tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.first)}. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p class="step-help">Pour une réservation réelle, rendez-vous sur Planity ou appelez APN.</p><div class="flow-actions"><button data-action="restart">Recommencer</button></div>`;
  }
  const steps = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const navigation = state.step > 0 && state.step < 4 ? `<nav class="step-nav" aria-label="Étapes terminées">${steps.slice(0, state.step).map((label, i) => `<button type="button" data-step="${i}">${label}</button>`).join('')}</nav>` : '';
  content.innerHTML = `${navigation}<div class="step-enter">${html}</div>`;
  if (focusHeading) content.querySelector('.step-title').focus({preventScroll:true});
  else if (restoreSelector) content.querySelector(restoreSelector)?.focus({preventScroll:true});
}
function escapeText(value) { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
content.addEventListener('change', e => { if(e.target.name === 'service') { state.service=services[Number(e.target.value)]; state.time=null; } });
content.addEventListener('click', e => {
  const button=e.target.closest('button'); if(!button) return;
  if(button.dataset.step !== undefined) { state.step=Number(button.dataset.step); render(true); return; }
  if(button.dataset.day !== undefined) { const d=new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+Number(button.dataset.day)); state.date=d; state.time=null; render(false, `[data-day="${button.dataset.day}"]`); return; }
  if(button.dataset.time) { state.time=button.dataset.time; render(false, `[data-time="${button.dataset.time}"]`); return; }
  const action=button.dataset.action;
  if(action==='back') { if(state.step===3) {state.first=content.querySelector('#first').value; state.phone=content.querySelector('#phone').value;} state.step--; render(true); }
  if(action==='next') { if((state.step===0&&!state.service)||(state.step===1&&!state.date)||(state.step===2&&!state.time)) {content.querySelector('#error').textContent='Veuillez faire un choix pour continuer.'; return;} state.step++; render(true); }
  if(action==='confirm') {state.first=content.querySelector('#first').value.trim(); state.phone=content.querySelector('#phone').value.trim(); const validPhone=/^(?:(?:\+33|0033)\s*|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(state.phone); content.querySelector('#first').setAttribute('aria-invalid', String(!state.first)); content.querySelector('#phone').setAttribute('aria-invalid', String(!validPhone)); if(!state.first || !validPhone) {content.querySelector('#error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.'; return;} state.step=4; render(true);}
  if(action==='restart') {Object.assign(state,{step:0,service:null,date:null,time:null,first:'',phone:''});render(true);}
});
render();
