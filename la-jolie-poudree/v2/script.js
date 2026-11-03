const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => root.classList.add('ready'));
const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 }) : null;
document.querySelectorAll('.reveal').forEach(element => observer ? observer.observe(element) : element.classList.add('visible'));

const services = [
  {nom:'Indonésie ancestrale', minutes:65, duree:'1 h 05'},
  {nom:'Épilation des sourcils', minutes:15, duree:'15 min'},
  {nom:'Manucure russe combinée', minutes:30, duree:'30 min'},
  {nom:'Vernis semi-permanent couleur', minutes:30, duree:'30 min'}
];
const state = {step:0, service:null, day:null, time:null, name:'', phone:''};
const container = document.querySelector('#etape');
const recap = document.querySelector('#recap');
const formatDate = date => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(date);
const dateKey = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
function makeDays(){return Array.from({length:14},(_,i)=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()+i);return day;});}
function summary(){
  const lines=[];
  if(state.service!==null) lines.push(services[state.service].nom,services[state.service].duree);
  if(state.day) lines.push(formatDate(new Date(state.day+'T12:00:00')));
  if(state.time) lines.push(state.time.replace(':',' h '));
  if(state.step===4 && state.name) lines.push(state.name);
  recap.textContent=lines.length ? lines.join(' · ') : 'Choisissez une prestation pour commencer.';
}
function nav(){const names=['Prestation','Jour','Heure','Coordonnées'];return `<div class="step-links" aria-label="Étapes de la simulation">${names.map((name,i)=>`<button type="button" data-go="${i}" ${i===state.step?'aria-current="step"':''} ${i>=state.step?'disabled':''}>${i+1}. ${name}</button>`).join('')}</div>`;}
function actions(back=true){return `<div class="booking-actions">${back?'<button type="button" data-back>Retour</button>':''}<button class="next" type="submit">Continuer →</button></div><p class="error" id="erreur" role="alert"></p>`;}
function render(focus=true){
  summary();
  let content='';
  if(state.step===0){content=`${nav()}<h3 tabindex="-1">Choisir une prestation</h3><form><fieldset><legend>Tarifs indicatifs, à confirmer avec La Jolie Poudrée. Aucun tarif n’est affiché dans cette simulation.</legend>${services.map((s,i)=>`<label class="choice"><input type="radio" name="service" value="${i}" ${state.service===i?'checked':''}><span>${s.nom}</span><strong>${s.duree}</strong></label>`).join('')}</fieldset>${actions(false)}</form>`;}
  if(state.step===1){content=`${nav()}<h3 tabindex="-1">Choisir un jour</h3><form><fieldset><legend>Les jours proposés suivent les horaires publiés. Disponibilités fictives.</legend>${makeDays().map(d=>{const key=dateKey(d),closed=d.getDay()===0;return `<label class="choice"><input type="radio" name="jour" value="${key}" ${closed?'disabled':''} ${state.day===key?'checked':''}><span>${formatDate(d)}</span><strong>${closed?'Fermé':''}</strong></label>`}).join('')}</fieldset>${actions()}</form>`;}
  if(state.step===2){const d=new Date(state.day+'T12:00:00'), end=d.getDay()===6?18*60:19*60, now=new Date();let slots='';for(let m=9*60;m+services[state.service].minutes<=end;m+=30){const value=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');const past=dateKey(now)===state.day && m<=now.getHours()*60+now.getMinutes();const taken=(m/30+d.getDate())%5===0;slots+=`<label class="choice"><input type="radio" name="heure" value="${value}" ${past||taken?'disabled':''} ${state.time===value?'checked':''}><span>${value.replace(':',' h ')}</span></label>`;}content=`${nav()}<h3 tabindex="-1">Choisir une heure</h3><form><fieldset><legend>Créneaux fictifs pour le ${formatDate(d)}. Les heures barrées sont indisponibles dans cette simulation.</legend><div class="slots">${slots}</div></fieldset>${actions()}</form>`;}
  if(state.step===3){content=`${nav()}<h3 tabindex="-1">Vos coordonnées</h3><p class="notice">Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form novalidate><label class="field" for="prenom">Prénom<input id="prenom" name="prenom" type="text" autocomplete="given-name" required aria-describedby="erreur-prenom"></label><p class="error" id="erreur-prenom"></p><label class="field" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="erreur-telephone"></label><p class="error" id="erreur-telephone"></p><div class="booking-actions"><button type="button" data-back>Retour</button><button class="next" type="submit">Confirmer la simulation →</button></div></form>`;}
  if(state.step===4){content=`<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est prête. Aucun rendez-vous ni aucune donnée n’a été envoyé à l’institut.</p><p>Pour prendre un véritable rendez-vous, utilisez Planity ou appelez le 09&nbsp;88&nbsp;34&nbsp;24&nbsp;68.</p><a class="button" href="https://www.planity.com/la-jolie-poudree-80000-amiens" target="_blank" rel="noopener">Aller sur Planity ↗</a><div class="booking-actions"><button type="button" data-restart>Recommencer</button></div>`;}
  container.classList.add('step-enter');container.innerHTML=content;
  if(state.step===3){container.querySelector('#prenom').value=state.name;container.querySelector('#telephone').value=state.phone;}
  requestAnimationFrame(()=>container.classList.remove('step-enter'));
  if(focus) container.querySelector('h3')?.focus({preventScroll:true});
}
container.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go){state.step=Number(go.dataset.go);render();return;}if(e.target.closest('[data-back]')){state.step--;render();return;}if(e.target.closest('[data-restart]')){Object.assign(state,{step:0,service:null,day:null,time:null,name:'',phone:''});render();}});
container.addEventListener('submit',e=>{e.preventDefault();const form=e.target;const data=new FormData(form);if(state.step===0){if(!data.has('service')){form.querySelector('#erreur').textContent='Choisissez une prestation pour continuer.';return;}const next=Number(data.get('service'));if(next!==state.service){state.day=null;state.time=null;}state.service=next;}
else if(state.step===1){if(!data.has('jour')){form.querySelector('#erreur').textContent='Choisissez un jour pour continuer.';return;}if(state.day!==data.get('jour'))state.time=null;state.day=data.get('jour');}
else if(state.step===2){if(!data.has('heure')){form.querySelector('#erreur').textContent='Choisissez une heure pour continuer.';return;}state.time=data.get('heure');}
else if(state.step===3){state.name=data.get('prenom').trim();state.phone=data.get('telephone').trim();const nameError=form.querySelector('#erreur-prenom'),phoneError=form.querySelector('#erreur-telephone');nameError.textContent=state.name?'':'Indiquez votre prénom.';phoneError.textContent=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone)?'':'Indiquez un numéro de téléphone français valide.';if(nameError.textContent||phoneError.textContent){(nameError.textContent?form.querySelector('#prenom'):form.querySelector('#telephone')).focus();return;}}
state.step++;render();});
render(false);
