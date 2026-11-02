(() => {
'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const reveal = $$('.reveal');
function countMinutes(){
 const el=$('[data-compteur]');
 if (!el || reduced.matches) return;
 const start=performance.now(), duration=650;
 function frame(now){const progress=Math.min((now-start)/duration,1);el.textContent=String(Math.round(60*(1-Math.pow(1-progress,3))));if(progress<1)requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
}
if ('IntersectionObserver' in window && !reduced.matches) {
 const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting){entry.target.classList.add('is-visible');if(entry.target.classList.contains('signature'))countMinutes();observer.unobserve(entry.target);} }), {threshold:.1});
 reveal.forEach((el,i)=>{el.style.transitionDelay = `${(i%3)*60}ms`;observer.observe(el)});
} else reveal.forEach(el=>el.classList.add('is-visible'));
window.apercuPret=true;
$$('.filter').forEach(button => button.addEventListener('click', () => {
 $$('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button?'true':'false')});
 $$('.price-row').forEach(row=>{row.hidden=button.dataset.filter!=='tout' && row.dataset.category!==button.dataset.filter});
}));
const services = [
 {id:'tradition',name:'Coupe et Rasage Traditionnel',minutes:60},
 {id:'coupe',name:'Coupe Homme',minutes:30},
 {id:'shampoing',name:'Coupe + Shampoing',minutes:30},
 {id:'rasoir',name:'Rasoir tradition',minutes:30}
];
const state={step:0, service:null, day:null, time:null, name:'', phone:''};
const content=$('#booking-content'), summary=$('#selection');
const formatter=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Paris'});
const parisParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function todayParts(){const p={};parisParts.formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return p}
function dates(){const p=todayParts(), start=new Date(Date.UTC(+p.year,+p.month-1,+p.day,12)); return Array.from({length:14},(_,i)=>new Date(start.getTime()+i*86400000))}
function dateKey(d){return d.toISOString().slice(0,10)}
function niceDate(d){return formatter.format(d)}
function setStep(n){state.step=n;render();const h=$('.step-title',content);if(h)h.focus({preventScroll:true})}
function updateSummary(){summary.textContent=[state.service?.name,state.day?niceDate(state.day):null,state.time].filter(Boolean).join(' · ') || 'Prestation, jour et heure à choisir.'}
function render(){
 updateSummary();
 $$('[data-go]').forEach((b,i)=>{b.disabled=i>state.step && !(i===1&&state.service) && !(i===2&&state.day) && !(i===3&&state.time);if(i===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 content.classList.add('step-enter');requestAnimationFrame(()=>requestAnimationFrame(()=>content.classList.remove('step-enter')));
 if(state.step===0){content.innerHTML=`<h3 class="step-title" tabindex="-1">Choisir une prestation</h3><p class="step-note">Simulation sans prix. Durées issues de la carte Planity.</p><div class="choices">${services.map(s=>`<label class="choice"><input type="radio" name="prestation" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}</span><span>${s.minutes} min</span></label>`).join('')}</div><button class="next" type="button" id="next-service" ${state.service?'':'disabled'}>Choisir un jour →</button>`;
 $$('input[name=prestation]',content).forEach(input=>input.addEventListener('change',()=>{state.service=services.find(s=>s.id===input.value);state.day=null;state.time=null;updateSummary();$('#next-service').disabled=false}));$('#next-service').addEventListener('click',()=>setStep(1));
 } else if(state.step===1){content.innerHTML=`<h3 class="step-title" tabindex="-1">Choisir un jour</h3><p class="step-note">Dates fictives, horaires à confirmer. Dimanche fermé.</p><div class="date-grid">${dates().map(d=>`<button type="button" data-date="${dateKey(d)}" ${d.getUTCDay()===0?'disabled':''} class="${state.day&&dateKey(state.day)===dateKey(d)?'selected':''}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(d)}${d.getUTCDay()===0?'<br>Fermé':''}</button>`).join('')}</div>`;
 $$('[data-date]',content).forEach(b=>b.addEventListener('click',()=>{state.day=dates().find(d=>dateKey(d)===b.dataset.date);state.time=null;setStep(2)}));
 } else if(state.step===2){const weekday=state.day.getUTCDay(), ranges=weekday===6?[[540,750],[810,1080]]:weekday===5?[[540,780],[840,1140]]:[[600,780],[840,1140]];const now=todayParts(), today=`${now.year}-${now.month}-${now.day}`, slots=[];ranges.forEach(([start,end])=>{for(let t=start;t+state.service.minutes<=end;t+=30){const label=`${String(Math.floor(t/60)).padStart(2,'0')} h ${String(t%60).padStart(2,'0')}`;const past=dateKey(state.day)===today && t<=+now.hour*60+(+now.minute);const occupied=(t+state.day.getUTCDate())%7===0;slots.push({label,disabled:past||occupied})}});
 content.innerHTML=`<h3 class="step-title" tabindex="-1">Choisir une heure</h3><p class="step-note">${niceDate(state.day)} · créneaux fictifs, disponibilité réelle sur Planity.</p><div class="slot-grid">${slots.map(s=>`<button type="button" data-time="${s.label}" ${s.disabled?'disabled':''} class="${state.time===s.label?'selected':''}">${s.label}${s.disabled?'<br>Indisponible':''}</button>`).join('')}</div>${slots.every(s=>s.disabled)?'<p class="step-note">Aucun créneau fictif disponible ce jour. Choisissez un autre jour.</p>':''}<button class="next" type="button" id="change-day">← Changer de jour</button>`;
 $('#change-day').addEventListener('click',()=>setStep(1));
 $$('[data-time]',content).forEach(b=>b.addEventListener('click',()=>{state.time=b.dataset.time;setStep(3)}));
 } else if(state.step===3){content.innerHTML=`<h3 class="step-title" tabindex="-1">Vos coordonnées</h3><p class="step-note">Rien ne sera transmis au salon.</p><form id="booking-form" novalidate><div class="form-row"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" required aria-describedby="name-error"><p class="error" id="name-error" aria-live="polite"></p></div><div class="form-row"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"><p class="error" id="phone-error" aria-live="polite"></p></div><button class="next" type="submit">Confirmer la simulation →</button></form>`;
 $('#prenom').value=state.name;$('#telephone').value=state.phone;$('#booking-form').addEventListener('submit',e=>{e.preventDefault();state.name=$('#prenom').value.trim();state.phone=$('#telephone').value.trim();const validName=state.name.length>0, validPhone=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d){8}$/.test(state.phone);$('#name-error').textContent=validName?'':'Indiquez votre prénom.';$('#phone-error').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';if(!validName)$('#prenom').focus();else if(!validPhone)$('#telephone').focus();else setStep(4)});
 } else {content.innerHTML=`<h3 class="step-title" tabindex="-1">Simulation terminée.</h3><p>Votre sélection est prête à être vérifiée.</p><p class="step-note">Aucun rendez-vous n’a été envoyé. Pour réserver réellement, utilisez Planity ou appelez le salon.</p><a class="button stage-button" href="https://www.planity.com/ar-barbershop-67000-strasbourg">Aller sur Planity ↗</a><button class="next" type="button" id="restart">Recommencer</button>`;$('#restart').addEventListener('click',()=>{Object.assign(state,{service:null,day:null,time:null,name:'',phone:''});setStep(0)})}
}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>{if(!b.disabled)setStep(+b.dataset.go)}));
$$('[data-service]').forEach(a=>a.addEventListener('click',()=>{state.service=services.find(s=>s.id===a.dataset.service);state.day=null;state.time=null;setStep(0)}));
render();
})();
