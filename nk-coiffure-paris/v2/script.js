document.documentElement.classList.add('js');
const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('shown'); revealObserver.unobserve(entry.target); } }), {threshold: .12}) : null;
document.querySelectorAll('.reveal').forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add('shown'));

const app = document.querySelector('#booking-app');
const resume = document.querySelector('#resume');
const stepNav = document.querySelector('#etapes');
let keyboardAction = false;
document.addEventListener('keydown', () => { keyboardAction = true; });
document.addEventListener('pointerdown', () => { keyboardAction = false; });
const services = [
  {name:'Shampoing, soin et brushing', duration:60},
  {name:'Coupe homme classique', duration:30}
];
const state = {step:0, service:null, date:null, time:null, first:'', phone:''};
const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseDate(key) { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); }
function timesFor(date, duration) {
  const start = date.getDay() === 6 ? 570 : 600;
  const now = new Date();
  const times = [];
  for (let minutes = start; minutes + duration <= 1140; minutes += 30) {
    const slot = new Date(date); slot.setHours(Math.floor(minutes/60), minutes%60, 0, 0);
    const occupied = (date.getDate() + minutes / 30) % 5 === 0;
    times.push({value:`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`, disabled:slot <= now || occupied, label:slot <= now ? 'passé' : occupied ? 'déjà pris' : ''});
  }
  return times;
}
function updateSummary() {
  const bits=[];
  if(state.service !== null) bits.push(services[state.service].name);
  if(state.date) bits.push(dateFormat.format(parseDate(state.date)));
  if(state.time) bits.push(state.time.replace(':',' h '));
  resume.textContent = bits.length ? bits.join(' · ') : 'Choisissez une prestation pour commencer.';
  const completed = [];
  if (state.step > 0 && state.service !== null) completed.push('<button type="button" data-step="0">Modifier la prestation</button>');
  if (state.step > 1 && state.date) completed.push('<button type="button" data-step="1">Modifier le jour</button>');
  if (state.step > 2 && state.time) completed.push('<button type="button" data-step="2">Modifier l’heure</button>');
  stepNav.innerHTML = completed.join('');
}
function showStep(focus = true) {
  updateSummary();
  let content='';
  if(state.step===0){
    content=`<h3 tabindex="-1">1. Choisir une prestation</h3><p>Simulation sans prix. Pour les extensions, le diagnostic se fait sans rendez-vous au salon.</p><fieldset><legend>Prestation</legend>${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===i?'checked':''}><span>${s.name}</span><span>${s.duration} min</span></label>`).join('')}</fieldset><p class="error" id="erreur" aria-live="polite"></p><div class="step-actions"><button class="button" type="button" data-action="next">Continuer</button></div>`;
  } else if(state.step===1){
    const today = new Date(); today.setHours(0,0,0,0);
    const days=Array.from({length:14},(_,i)=>{const d=new Date(today); d.setDate(today.getDate()+i); const closed=d.getDay()===0||d.getDay()===1; const k=dateKey(d); return `<label class="choice"><input type="radio" name="jour" value="${k}" ${closed?'disabled':''} ${state.date===k?'checked':''}><span>${dateFormat.format(d)}${closed?' · fermé':''}</span></label>`;}).join('');
    content=`<h3 tabindex="-1">2. Choisir un jour</h3><p>Jours présentés à titre de simulation.</p><fieldset><legend>Les prochains jours</legend><div class="choices-grid">${days}</div></fieldset><p class="error" id="erreur" aria-live="polite"></p><div class="step-actions"><button class="button secondary" type="button" data-action="back">Retour</button><button class="button" type="button" data-action="next">Continuer</button></div>`;
  } else if(state.step===2){
    const slots=timesFor(parseDate(state.date),services[state.service].duration).map(t=>`<label class="choice"><input type="radio" name="heure" value="${t.value}" ${t.disabled?'disabled':''} ${state.time===t.value&&!t.disabled?'checked':''}><span>${t.value.replace(':',' h ')}${t.label?' · '+t.label:''}</span></label>`).join('');
    content=`<h3 tabindex="-1">3. Choisir une heure</h3><p>Créneaux fictifs, présentés pour la démonstration.</p><fieldset><legend>Horaires simulés</legend><div class="choices-grid">${slots}</div></fieldset><p class="error" id="erreur" aria-live="polite"></p><div class="step-actions"><button class="button secondary" type="button" data-action="back">Retour</button><button class="button" type="button" data-action="next">Continuer</button></div>`;
  } else if(state.step===3){
    content=`<h3 tabindex="-1">4. Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><label class="field" for="prenom">Prénom</label><input id="prenom" type="text" autocomplete="given-name" aria-describedby="erreur" required><label class="field" for="telephone">Téléphone</label><input id="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="erreur" required><p class="error" id="erreur" aria-live="polite"></p><div class="step-actions"><button class="button secondary" type="button" data-action="back">Retour</button><button class="button" type="button" data-action="confirm">Terminer la simulation</button></div>`;
  } else {
    content=`<h3 tabindex="-1">Simulation terminée</h3><p>Aucune réservation n’a été envoyée. Pour prendre rendez-vous, utilisez la page Planity ou appelez le salon.</p><div class="step-actions"><a class="button" href="https://www.planity.com/nk-coiffure-paris-75019-iad" target="_blank" rel="noopener">Aller sur Planity ↗</a><button class="button secondary" type="button" data-action="restart">Recommencer</button></div>`;
  }
  app.innerHTML=`<div class="step-panel${focus && !keyboardAction ? ' enter' : ''}" aria-live="polite">${content}</div>`;
  const panel = app.querySelector('.step-panel');
  if (panel.classList.contains('enter')) requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('enter')));
  if(state.step===3){document.querySelector('#prenom').value=state.first;document.querySelector('#telephone').value=state.phone;}
  if(focus) app.querySelector('h3').focus({preventScroll:true});
}
stepNav.addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (button) { state.step = Number(button.dataset.step); showStep(); }
});
app.addEventListener('click',event=>{
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='restart'){Object.assign(state,{step:0,service:null,date:null,time:null,first:'',phone:''});showStep();return;}
  if(action==='back'){state.step--;showStep();return;}
  const error=app.querySelector('#erreur');
  if(state.step===0){const selected=app.querySelector('[name=prestation]:checked');if(!selected){error.textContent='Choisissez une prestation.';return;}const choice=Number(selected.value);if(state.service!==choice){state.date=null;state.time=null;}state.service=choice;}
  if(state.step===1){const selected=app.querySelector('[name=jour]:checked');if(!selected){error.textContent='Choisissez un jour.';return;}if(state.date!==selected.value)state.time=null;state.date=selected.value;}
  if(state.step===2){const selected=app.querySelector('[name=heure]:checked');if(!selected){error.textContent='Choisissez une heure disponible.';return;}state.time=selected.value;}
  if(state.step===3){if (!timesFor(parseDate(state.date), services[state.service].duration).some(t => t.value === state.time && !t.disabled)) { state.time=null; state.step=2; showStep(); app.querySelector('#erreur').textContent='Cette heure est passée ; choisissez un autre créneau simulé.'; return; } state.first=app.querySelector('#prenom').value.trim();state.phone=app.querySelector('#telephone').value.trim();const digits=state.phone.replace(/[^0-9+]/g,'');if(!state.first){error.textContent='Indiquez votre prénom.';app.querySelector('#prenom').focus();return;}if(!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(digits)){error.textContent='Indiquez un numéro de téléphone français valide.';app.querySelector('#telephone').focus();return;}}
  state.step++;showStep();
});
showStep(false);
