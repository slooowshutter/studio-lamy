window.sitePret = true;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sign = document.querySelector('.sign-svg');
const glow = sign.cloneNode(true);
glow.classList.add('sign-glow');
sign.parentNode.appendChild(glow);
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduced) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
  reveals.forEach(el => observer.observe(el));
} else reveals.forEach(el => el.classList.add('visible'));

const services = [
  {name:'Brushing', duration:30},
  {name:'Coupe courte + brushing', duration:30},
  {name:'Coupe carré + brushing', duration:60},
  {name:'Coupe homme', duration:30},
  {name:'Coupe homme étudiant', duration:30}
];
const state = {step:1, service:null, date:null, time:null, first:'', phone:''};
const stage = document.querySelector('#booking-stage');
const stepCount = document.querySelector('#etape-numero');
const formatDay = date => new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(date);
const fullDay = date => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
function recap(){
 [['service',state.service?.name,1],['date',state.date ? fullDay(state.date) : null,2],['time',state.time,3]].forEach(([key,value,step])=>{const cell=document.querySelector('#recap-'+key);cell.replaceChildren();if(value){const b=document.createElement('button');b.type='button';b.className='summary-link';b.dataset.step=step;b.textContent=value;cell.appendChild(b)}else cell.textContent='À choisir'});
}
function button(label, cls='action', disabled=false){return `<button type="button" class="${cls}" ${disabled?'disabled':''}>${label}</button>`}
function render(focus=true){
 const active=document.activeElement;
 const restore=active?.name==='prestation' ? `[name=prestation][value="${active.value}"]` : active?.dataset.day!==undefined ? `[data-day="${active.dataset.day}"]` : active?.dataset.time ? `[data-time="${active.dataset.time}"]` : null;
 recap(); stepCount.textContent=state.step < 5 ? `Étape ${state.step} sur 4` : 'Simulation terminée';
 let html='';
 if(state.step===1){html=`<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations et durées issues de la carte publiée. Tarifs à confirmer auprès du salon.</p><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service?.name===s.name?'checked':''}><span>${s.name}</span><small>${s.duration} min</small></label>`).join('')}</div><div class="booking-actions">${button('Choisir un jour →','action next',!state.service)}</div>`}
 if(state.step===2){let days='';for(let i=0;i<14;i++){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);const closed=d.getDay()===0;const last=new Date(d);last.setHours(d.getDay()===6?16:19,0,0,0);last.setMinutes(last.getMinutes()-state.service.duration);const elapsed=last<=new Date();days+=`<button type="button" data-day="${i}" ${closed||elapsed?'disabled':''} aria-pressed="${state.date?.toDateString()===d.toDateString()}">${formatDay(d)}<small>${closed?'Fermé':elapsed?'Passé':'Choisir'}</small></button>`}html=`<h3 tabindex="-1">Choisir un jour</h3><p>Horaires à confirmer. Les créneaux proposés sont fictifs.</p><div class="day-grid">${days}</div><div class="booking-actions">${button('Retour','back')}${button('Choisir une heure →','action next',!state.date)}</div>`}
 if(state.step===3){const day=state.date.getDay(), start=day===6?510:540, end=day===6?960:1140;let slots='';for(let m=start;m+state.service.duration<=end;m+=30){const h=Math.floor(m/60),min=m%60, time=`${String(h).padStart(2,'0')} h ${String(min).padStart(2,'0')}`;const dt=new Date(state.date);dt.setHours(h,min,0,0);const past=dt<=new Date();slots+=`<button type="button" data-time="${time}" ${past?'disabled':''} aria-pressed="${state.time===time}">${time}</button>`}html=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux de démonstration, sans disponibilité réelle.</p><div class="time-grid">${slots}</div><div class="booking-actions">${button('Retour','back')}${button('Continuer →','action next',!state.time)}</div>`}
 if(state.step===4){html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Rien ne sera envoyé ni enregistré.</p><form id="coordonnees" novalidate><div class="field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></div><div class="field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></div><p>Simulation&nbsp;: <strong>${state.service.name}</strong>, ${fullDay(state.date)} à ${state.time}.</p><div class="booking-actions">${button('Retour','back')}<button class="action" type="submit">Terminer la simulation →</button></div></form>`}
 if(state.step===5){html=`<h3 tabindex="-1">Simulation terminée.</h3><p>Votre sélection est prête&nbsp;: <strong>${state.service.name}</strong>, ${fullDay(state.date)} à ${state.time}.</p><p>Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée. Pour réserver réellement, appelez le salon ou utilisez Booksy.</p><div class="booking-actions"><a class="button" href="tel:+33473923303">Appeler le salon ↗</a><a class="text-link" href="https://booksy.com/fr-fr/61964_arret-coiffure_salon-de-coiffure_83401_clermont-ferrand">Réserver sur Booksy ↗</a>${button('Recommencer','back restart')}</div>`}
 stage.innerHTML=html;stage.classList.remove('stage-enter');void stage.offsetWidth;stage.classList.add('stage-enter');
 if(state.step===4){document.querySelector('#prenom').value=state.first;document.querySelector('#telephone').value=state.phone}
 if(focus)stage.querySelector('h3')?.focus({preventScroll:true});
 else if(restore)stage.querySelector(restore)?.focus({preventScroll:true});
}
let changing=false;
function goTo(step){if(changing)return;changing=true;stage.classList.add('stage-leave');setTimeout(()=>{state.step=step;stage.classList.remove('stage-leave');render();changing=false},reduced?0:180)}
document.querySelector('.summary').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b)goTo(Number(b.dataset.step))});
stage.addEventListener('change',e=>{if(e.target.name==='prestation'){state.service=services[Number(e.target.value)];state.date=null;state.time=null;render(false)}});
stage.addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;
 if(target.dataset.day!==undefined){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+Number(target.dataset.day));state.date=d;state.time=null;render(false)}
 else if(target.dataset.time){state.time=target.dataset.time;render(false)}
 else if(target.classList.contains('restart')){Object.assign(state,{step:1,service:null,date:null,time:null,first:'',phone:''});render()}
 else if(target.classList.contains('back')){if(state.step===4){state.first=document.querySelector('#prenom').value;state.phone=document.querySelector('#telephone').value}goTo(state.step-1)}
 else if(target.classList.contains('next')){goTo(state.step+1)}
});
stage.addEventListener('submit',e=>{e.preventDefault();state.first=document.querySelector('#prenom').value.trim();state.phone=document.querySelector('#telephone').value.trim();const validName=state.first.length>0;const digits=state.phone.replace(/[\s.()-]/g,'');const validPhone=/^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);document.querySelector('#erreur-prenom').textContent=validName?'':'Indiquez votre prénom.';document.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';document.querySelector('#prenom').setAttribute('aria-invalid',String(!validName));document.querySelector('#telephone').setAttribute('aria-invalid',String(!validPhone));if(!validName)document.querySelector('#prenom').focus();else if(!validPhone)document.querySelector('#telephone').focus();else{goTo(5)}});
render(false);
