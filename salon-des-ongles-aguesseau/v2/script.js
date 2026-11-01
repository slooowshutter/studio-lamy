window.siteReady = true;
(() => {
'use strict';
const services = {
  pose: {name:'Pose complète', duration:90, time:'1 h 30'},
  remplissage: {name:'Remplissage', duration:60, time:'1 h'},
  beaute: {name:'Beauté des mains et des pieds', duration:45, time:'45 min'}
};
const state = {step:0, service:null, date:null, time:null, first:'', phone:''};
const panel = document.querySelector('#booking-panel');
const summary = document.querySelector('#summary-content');
const count = document.querySelector('#step-count');
const fmtDate = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const fmtShort = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'});
const escapeHTML = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const timeLabel = n => `${String(Math.floor(n/60)).padStart(2,'0')} h ${String(n%60).padStart(2,'0')}`;
function updateSummary(){
 let html='';
 if(state.service) html += `<div class="summary-item"><b>PRESTATION</b><button type="button" data-goto="0">${services[state.service].name} · tarif à confirmer</button></div>`;
 if(state.date) html += `<div class="summary-item"><b>JOUR</b><button type="button" data-goto="1">${fmtDate.format(state.date)}</button></div>`;
 if(state.time!==null) html += `<div class="summary-item"><b>HEURE</b><button type="button" data-goto="2">${timeLabel(state.time)}</button></div>`;
 summary.innerHTML=html||'<p>Votre sélection apparaîtra ici.</p>';
}
function render(focus=true){
 count.textContent=state.step===4?'FIN / 04':`${String(state.step+1).padStart(2,'0')} / 04`;
 let html='';
 if(state.step===0){
  html=`<h3 tabindex="-1">Choisir une prestation</h3><p>Durées d’exemple et tarifs à confirmer avec le salon.</p><div class="options">${Object.entries(services).map(([id,s])=>`<label class="option"><input type="radio" name="service" value="${id}" ${state.service===id?'checked':''}><span>${s.name}</span><span>${s.time} · à confirmer</span></label>`).join('')}</div><div class="booking-actions"><button type="button" data-next ${state.service?'':'disabled'}>Choisir le jour →</button></div>`;
 } else if(state.step===1){
  const now=new Date(); now.setHours(0,0,0,0);
  let days=''; for(let i=0;i<14;i++){const d=new Date(now);d.setDate(d.getDate()+i);const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;const closed=d.getDay()===0;days+=`<button type="button" data-date="${key}" class="${state.date&&d.toDateString()===state.date.toDateString()?'selected':''}" aria-pressed="${Boolean(state.date&&d.toDateString()===state.date.toDateString())}" ${closed?'disabled':''}>${fmtShort.format(d)}<small>${closed?'fermé*':'exemple'}</small></button>`;}
  html=`<h3 tabindex="-1">Choisir un jour</h3><p>Horaires de simulation&nbsp;: lundi–samedi, 9&nbsp;h–19&nbsp;h. *Dimanche fermé par hypothèse, à confirmer.</p><div class="days">${days}</div><div class="booking-actions"><button type="button" class="back" data-back>← Prestation</button><button type="button" data-next ${state.date?'':'disabled'}>Choisir l’heure →</button></div>`;
 } else if(state.step===2){
  let slots='';const now=new Date();const same=state.date.toDateString()===now.toDateString();const duration=services[state.service].duration;
  for(let mins=540, i=0;mins+duration<=1140;mins+=30,i++){const past=same && mins<=now.getHours()*60+now.getMinutes();const taken=(i+state.date.getDate())%5===0;const disabled=past||taken;slots+=`<button type="button" data-time="${mins}" class="${state.time===mins?'selected':''}" aria-pressed="${state.time===mins}" ${disabled?'disabled':''} aria-label="${timeLabel(mins)}${disabled?(past?', passé':', déjà pris en simulation'):''}">${timeLabel(mins)}${disabled?'<small> · indisponible</small>':''}</button>`;}
  html=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour le ${fmtDate.format(state.date)}. Les disponibilités réelles sont à confirmer.</p><div class="slots">${slots}</div><div class="booking-actions"><button type="button" class="back" data-back>← Jour</button><button type="button" data-next ${state.time!==null?'':'disabled'}>Vos coordonnées →</button></div>`;
 } else if(state.step===3){
  html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent sur cet appareil. Rien ne sera envoyé.</p><form id="contact-form" novalidate><div class="field"><label for="first">Prénom</label><input id="first" name="first" autocomplete="given-name" value="${escapeHTML(state.first)}" aria-describedby="first-error"><span id="first-error" class="error"></span></div><div class="field"><label for="phone">Téléphone mobile</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="phone-error"><span id="phone-error" class="error"></span></div><p>${services[state.service].name} · ${fmtDate.format(state.date)} à ${timeLabel(state.time)} · tarif à confirmer</p><div class="booking-actions"><button type="button" class="back" data-back>← Heure</button><button type="submit">Terminer la simulation →</button></div></form>`;
 } else {
  html=`<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeHTML(state.first)}, votre exemple&nbsp;: ${services[state.service].name}, le ${fmtDate.format(state.date)} à ${timeLabel(state.time)}. Tarif à confirmer.</p><p><strong>Aucun rendez-vous n’a été envoyé au salon.</strong> Pour le joindre&nbsp;: <a href="tel:+33587701374">05 87 70 13 74</a>.</p><div class="booking-actions"><button type="button" data-reset>Recommencer</button></div>`;
 }
 panel.innerHTML=`<div class="booking-panel-inner panel-enter">${html}</div>`;
 updateSummary(); if(focus) panel.querySelector('h3').focus({preventScroll:true});
}
function setStep(n){state.step=n;render();}
panel.addEventListener('change',e=>{if(e.target.name==='service'){if(state.service!==e.target.value){state.service=e.target.value;state.date=null;state.time=null;} render(false);panel.querySelector(`input[value="${e.target.value}"]`).focus();}});
panel.addEventListener('click',e=>{
 const b=e.target.closest('button'); if(!b)return;
 if(b.dataset.date){const [y,m,d]=b.dataset.date.split('-').map(Number);state.date=new Date(y,m-1,d);state.time=null;const key=b.dataset.date;render(false);panel.querySelector(`[data-date="${key}"]`).focus();}
 if(b.dataset.time){state.time=Number(b.dataset.time);const key=b.dataset.time;render(false);panel.querySelector(`[data-time="${key}"]`).focus();}
 if(b.hasAttribute('data-next')) setStep(state.step+1);
 if(b.hasAttribute('data-back')) setStep(state.step-1);
 if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:null,date:null,time:null,first:'',phone:''});render();}
});
panel.addEventListener('input',e=>{if(e.target.name==='first')state.first=e.target.value;if(e.target.name==='phone')state.phone=e.target.value;});
panel.addEventListener('submit',e=>{e.preventDefault();const first=panel.querySelector('#first'),phone=panel.querySelector('#phone');state.first=first.value.trim();state.phone=phone.value.trim();let digits=state.phone.replace(/[\s.()-]/g,'').replace(/^\+33/,'0');let valid=true;const ferr=panel.querySelector('#first-error'),perr=panel.querySelector('#phone-error');ferr.textContent=state.first?'':'Indiquez votre prénom.';perr.textContent=/^0[67]\d{8}$/.test(digits)?'':'Indiquez un numéro mobile français valide.';first.setAttribute('aria-invalid',String(!state.first));phone.setAttribute('aria-invalid',String(!/^0[67]\d{8}$/.test(digits)));if(!state.first||perr.textContent)valid=false;if(valid)setStep(4);else (!state.first?first:phone).focus();});
summary.addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(b)setStep(Number(b.dataset.goto));});
document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>{state.service=b.dataset.select;state.date=null;state.time=null;setStep(0);document.querySelector('#reservation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelectorAll('.price-row').forEach(row=>row.hidden=button.dataset.filter!=='all'&&row.dataset.category!==button.dataset.filter);}));
render(false);
const rating=document.querySelector('.rating-number');
const ratingValue=rating.querySelector('[data-rating]');
function countRating(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const start=performance.now();
 function frame(now){const progress=Math.min((now-start)/650,1);ratingValue.textContent=(4.9*(1-Math.pow(1-progress,3))).toFixed(1).replace('.',',');if(progress<1)requestAnimationFrame(frame);}
 requestAnimationFrame(frame);
}
if('IntersectionObserver' in window){const ratingObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){countRating();ratingObserver.disconnect();}},{threshold:.4});ratingObserver.observe(rating);}
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${i*60}ms`;observer.observe(el);});}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
})();
