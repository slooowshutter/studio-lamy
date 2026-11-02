'use strict';
document.documentElement.classList.add('js');
requestAnimationFrame(() => document.documentElement.classList.add('ready'));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(tile) {
  if (reduceMotion) return;
  tile.querySelectorAll('[data-count]').forEach(number => {
    const end=Number(number.dataset.count), start=performance.now();
    function tick(now) { const progress=Math.min((now-start)/400,1); number.textContent=Math.round(end*(1-Math.pow(1-progress,3))); if(progress<1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  });
}
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); countUp(entry.target); observer.unobserve(entry.target); } }), {threshold: .12});
  document.documentElement.classList.add('reveal-ready');
  reveals.forEach(el => observer.observe(el));
} else reveals.forEach(el => el.classList.add('visible'));

document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
  document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const services = [
  {name:'Taille de barbe sculptée et tracée façon Gentleman + serviette chaude + soins', duration:20},
  {name:'Homme — taille de la barbe', duration:20},
  {name:'Homme — coupe aux ciseaux et tondeuse', duration:30}
];
const state = {step:0, service:null, day:null, time:null, first:'', phone:''};
const panel = document.getElementById('booking-step');
let keyboardInteraction = false;
document.addEventListener('keydown', () => { keyboardInteraction = true; });
document.addEventListener('pointerdown', () => { keyboardInteraction = false; });
const stepCount = document.getElementById('step-count');
const dayFormatter = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
const shortDay = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'});
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function getDays() { const days=[]; const now=new Date(); for(let i=0;i<14;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);days.push(d);} return days; }
function dateFromKey(value){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d);}
function updateSummary(){document.getElementById('summary-service').textContent=state.service===null?'À choisir':services[state.service].name;document.getElementById('summary-day').textContent=state.day?dayFormatter.format(dateFromKey(state.day)):'À choisir';document.getElementById('summary-time').textContent=state.time||'À choisir';document.querySelector('[data-go="1"]').disabled=state.service===null;document.querySelector('[data-go="2"]').disabled=!state.day;}
function actions(back, next, disabled=false){return `<div class="booking-actions">${back?'<button type="button" class="back" data-action="back">← Retour</button>':'<span></span>'}${next?`<button type="button" data-action="next" ${disabled?'disabled':''}>${next} →</button>`:''}</div>`;}
function render(focus=true){
 updateSummary(); stepCount.textContent=state.step===4?'SIMULATION TERMINÉE':`ÉTAPE 0${state.step+1} / 04`;
 let html='';
 if(state.step===0){html=`<h3 tabindex="-1">Choisir une prestation</h3><p class="booking-help">Une sélection pour essayer le parcours.</p><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===i?'checked':''}><span>${s.name}<small>${s.duration} min</small></span></label>`).join('')}</div>${actions(false,'Choisir un jour',state.service===null)}`;}
 if(state.step===1){html=`<h3 tabindex="-1">Choisir un jour</h3><p class="booking-help">Jours affichés selon les horaires Treatwell, à confirmer. Aucun créneau réel.</p><div class="days">${getDays().map(d=>{const closed=d.getDay()===0||d.getDay()===1;return `<button type="button" class="day ${state.day===key(d)?'selected':''}" data-day="${key(d)}" aria-pressed="${state.day===key(d)}" ${closed?'disabled':''}>${shortDay.format(d)}<small>${closed?'Fermé':'À choisir'}</small></button>`;}).join('')}</div>${actions(true,'Choisir une heure',!state.day)}`;}
 if(state.step===2){const d=dateFromKey(state.day), start=d.getDay()===6?9:10, now=new Date(), slots=[];for(let h=start;h<19;h++){for(let m=0;m<60;m+=30){const date=new Date(d);date.setHours(h,m,0,0);if(h*60+m+services[state.service].duration>19*60)continue;const label=`${String(h).padStart(2,'0')}h${String(m).padStart(2,'0')}`;const unavailable=date<=now||((h*2+m/30+d.getDate())%5===0);slots.push(`<button type="button" class="slot ${state.time===label?'selected':''}" data-time="${label}" aria-pressed="${state.time===label}" ${unavailable?'disabled':''}>${label}${unavailable?' · indisponible':''}</button>`);}}html=`<h3 tabindex="-1">Choisir une heure</h3><p class="booking-help">Créneaux fictifs, sans lien avec les disponibilités du salon.</p><div class="slots">${slots.join('')}</div>${actions(true,'Vos coordonnées',!state.time)}`;}
 if(state.step===3){html=`<h3 tabindex="-1">Vos coordonnées</h3><p class="booking-help">Ces informations restent dans cette page et ne sont pas envoyées.</p><form id="details" novalidate><label class="field"><span>Prénom</span><input name="prenom" autocomplete="given-name" required value="" aria-describedby="first-error"><small id="first-error" class="error"></small></label><label class="field"><span>Téléphone</span><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required value="" aria-describedby="phone-error"><small id="phone-error" class="error"></small></label><div class="booking-actions"><button type="button" class="back" data-action="back">← Retour</button><button type="submit">Confirmer la simulation →</button></div></form>`;}
 if(state.step===4){html=`<h3 tabindex="-1">Simulation terminée.</h3><p class="success-message">Votre sélection est récapitulée ci-contre. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p class="booking-help">Pour prendre rendez-vous, utilisez la fiche Treatwell ou appelez le salon.</p><a href="https://www.treatwell.fr/salon/gentleman-barber-shop-1/">Aller sur Treatwell ↗</a><div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>`;}
 panel.innerHTML=html;panel.classList.remove('step-enter');if(!keyboardInteraction){void panel.offsetWidth;panel.classList.add('step-enter');}
 if(state.step===3){panel.querySelector('[name=prenom]').value=state.first;panel.querySelector('[name=telephone]').value=state.phone;}
 if(focus) panel.querySelector('h3').focus();
}
panel.addEventListener('change',e=>{if(e.target.name==='prestation'){state.service=Number(e.target.value);state.day=null;state.time=null;updateSummary();panel.querySelector('[data-action=next]').disabled=false;}});
panel.addEventListener('click',e=>{const day=e.target.closest('[data-day]'),time=e.target.closest('[data-time]'),action=e.target.closest('[data-action]');if(day){state.day=day.dataset.day;state.time=null;render(false);panel.querySelector(`[data-day="${state.day}"]`).focus();}if(time){state.time=time.dataset.time;render(false);panel.querySelector(`[data-time="${state.time}"]`).focus();}if(action){if(action.dataset.action==='next')state.step++;if(action.dataset.action==='back')state.step--;if(action.dataset.action==='restart')Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});render();}});
document.querySelector('.summary').addEventListener('click', e => { const button=e.target.closest('[data-go]'); if(button && !button.disabled){state.step=Number(button.dataset.go);render();} });
panel.addEventListener('submit',e=>{e.preventDefault();const form=e.target,first=form.elements.prenom.value.trim(),phone=form.elements.telephone.value.trim();const goodFirst=first.length>0,goodPhone=/^(?:(?:\+33|0033)\s*|0)[1-9](?:[\s.\-]*\d){8}$/.test(phone);form.querySelector('#first-error').textContent=goodFirst?'':'Indiquez votre prénom.';form.querySelector('#phone-error').textContent=goodPhone?'':'Indiquez un numéro de téléphone français valide.';if(!goodFirst||!goodPhone){(goodFirst?form.elements.telephone:form.elements.prenom).focus();return;}state.first=first;state.phone=phone;state.step=4;render();});
render(false);
