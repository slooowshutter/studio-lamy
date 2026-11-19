document.documentElement.classList.add('js');
const observed = document.querySelectorAll('.reveal, .history-copy');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }), {threshold: .12});
  observed.forEach(item => observer.observe(item));
} else observed.forEach(item => item.classList.add('is-visible'));
const state = {step:0, service:'', day:'', time:'', name:'', phone:''};
let highestStep = 0;
let transitionTimer;
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#selection');
const counter = document.querySelector('#step-count');
const progress = document.querySelector('#progress-line');
const services = ['Coupe','Coloration','Mèches'];
const dates = Array.from({length:14},(_,i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); return d; });
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const labelDate = key => {const d=dates.find(x=>dateKey(x)===key); return d ? new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d) : '';};
const escapeText = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(focus = false){
  counter.textContent = state.step === 4 ? 'Terminé' : `${String(state.step+1).padStart(2,'0')} / 04`;
  progress.style.transform = `scaleX(${state.step+1})`;
  let html='';
  if(state.step===0){html=`<h3 tabindex="-1">Choisir une prestation</h3><p>Disponibilité à confirmer auprès du salon.</p><div class="choices">${services.map(s=>`<label class="choice"><input type="radio" name="service" value="${s}" ${state.service===s?'checked':''}>${s}</label>`).join('')}</div><div class="actions"><button class="next" data-action="next">Continuer →</button></div>`;}
  if(state.step===1){html=`<h3 tabindex="-1">Choisir un jour</h3><p>Simulation sur la plage commune publiée par les annuaires&nbsp;: mercredi à samedi, 10 h–19 h. Horaires à confirmer.</p><div class="choices">${dates.map(d=>{const key=dateKey(d), closed=![3,4,5,6].includes(d.getDay());return `<label class="choice"><input type="radio" name="day" value="${key}" ${closed?'disabled':''} ${state.day===key?'checked':''}><span>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}${closed?'<small>Indisponible dans la simulation</small>':''}</span></label>`}).join('')}</div><div class="actions"><button data-action="back">← Retour</button><button class="next" data-action="next">Continuer →</button></div>`;}
  if(state.step===2){html=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs, sous réserve des horaires à confirmer.</p><div class="choices">${['10:00','14:00','17:00'].map(t=>{const d=dates.find(x=>dateKey(x)===state.day);const past=d && dateKey(d)===dateKey(new Date()) && Number(t.slice(0,2))<=new Date().getHours();const taken=t==='14:00';return `<label class="choice"><input type="radio" name="time" value="${t}" ${past||taken?'disabled':''} ${state.time===t?'checked':''}>${t.replace(':',' h ')}${past?' · passé':taken?' · indisponible (exemple)':''}</label>`}).join('')}</div><div class="actions"><button data-action="back">← Retour</button><button class="next" data-action="next">Continuer →</button></div>`;}
  if(state.step===3){html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cet essai, rien ne sera transmis.</p><label class="field">Prénom<input id="nom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur"></label><label class="field">Téléphone<input id="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur"></label><div class="actions"><button data-action="back">← Retour</button><button class="next" data-action="next">Terminer la simulation →</button></div>`;}
  if(state.step===4){html=`<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${escapeText(state.name)}. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée. Pour réserver, appelez le salon.</p><div class="actions"><a class="button" href="tel:+33658069673">Appeler le salon ↗</a><button data-action="reset">Recommencer</button></div>`;}
  content.innerHTML=html+'<p class="error" id="erreur" role="status"></p>';
  updateSummary();
  if(focus) content.querySelector('h3').focus();
}
function updateSummary(){
 const details=[state.service,state.day?labelDate(state.day):'',state.time?state.time.replace(':',' h '):''].filter(Boolean);
 const labels=['Prestation','Jour','Heure','Coordonnées'];
 summary.innerHTML=`<strong>Votre sélection</strong><p>${details.length?details.map(escapeText).join(' · '):'Aucune sélection pour le moment.'}</p><div class="step-links" aria-label="Revenir à une étape">${labels.map((label,i)=>i < state.step && i <= highestStep ? `<button type="button" data-step="${i}">${label}</button>` : '').join('')}</div>`;
}
function changeStep(step){
 clearTimeout(transitionTimer);
 content.classList.add('changing');
 const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:200;
 transitionTimer=setTimeout(()=>{state.step=step; highestStep=Math.max(highestStep,step);render(true);content.classList.remove('changing');},delay);
}
summary.addEventListener('click',e=>{const button=e.target.closest('[data-step]');if(button) changeStep(Number(button.dataset.step));});
content.addEventListener('change',e=>{if(e.target.name==='service'){state.service=e.target.value;} if(e.target.name==='day'){state.day=e.target.value;state.time='';} if(e.target.name==='time'){state.time=e.target.value;} updateSummary(); });
content.addEventListener('input',e=>{if(e.target.id==='nom') state.name=e.target.value;if(e.target.id==='telephone') state.phone=e.target.value;});
content.addEventListener('click',e=>{const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='reset'){Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''});highestStep=0;render(true);return;}if(action==='back'){changeStep(state.step-1);return;}if(action==='next'){if(state.step===3){state.name=document.querySelector('#nom').value.trim();state.phone=document.querySelector('#telephone').value.trim();}const valid=[state.service,state.day,state.time,state.name && /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(state.phone)][state.step];if(!valid){document.querySelector('#erreur').textContent=state.step===3?'Indiquez votre prénom et un numéro de téléphone français valide.':'Choisissez une option pour continuer.';return;}changeStep(state.step+1);}});
render();
