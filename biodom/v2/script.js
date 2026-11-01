document.documentElement.classList.add('js');
const services = [
  {id:'jade', name:'Forfait Jade', duration:40, price:40},
  {id:'maillot', name:'Maillot intégral + SIF', duration:15, price:25},
  {id:'demi', name:'Demi-jambes', duration:10, price:15},
  {id:'jambes', name:'Jambes complètes', duration:20, price:25},
  {id:'gel', name:'Renforcement en gel', duration:60, price:40}
];
const state = {step:0, service:null, day:null, time:null, first:'', phone:''};
const content = document.querySelector('#booking-content');
const stepNumber = document.querySelector('#step-number');
const dayFormat = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const shortFormat = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'});
const euro = n => `${n} €`;
function summary(){
  document.querySelector('#sum-service').textContent=state.service?.name || 'À choisir';
  document.querySelector('#sum-day').textContent=state.day ? dayFormat.format(state.day) : 'À choisir';
  document.querySelector('#sum-time').textContent=state.time || 'À choisir';
  document.querySelector('#sum-price').textContent=state.service ? euro(state.service.price) : '—';
}
function dates(){const out=[]; const now=new Date(); for(let i=0;i<14;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12);out.push(d)}return out}
function slots(){
  const out=[]; const day=state.day; const closing=day.getDay()===5?22*60:21*60; const now=new Date();
  for(let minutes=10*60;minutes+state.service.duration<=closing;minutes+=30){
    const h=Math.floor(minutes/60), m=minutes%60, date=new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,m);
    const busy=((day.getDate()*7+minutes/30)%5===0); out.push({label:`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')}`,disabled:date<=now||busy,reason:date<=now?'passé':busy?'déjà pris':''});
  }return out;
}
function render(focus=true){
  summary(); document.querySelectorAll('[data-goto]').forEach(button=>{const n=Number(button.dataset.goto); button.disabled=n>state.step || state.step===4; button.setAttribute('aria-current',n===state.step?'step':'false')}); stepNumber.textContent=state.step<4?`${String(state.step+1).padStart(2,'0')} / 04`:'TERMINÉ';
  let html='';
  if(state.step===0){html=`<h3 class="step-heading" tabindex="-1">Votre prestation</h3><p class="step-note">Tarifs indicatifs, à confirmer avec Biodom Bien-Être.</p><div class="options">${services.map(s=>`<label class="option"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span class="option-main">${s.name}<small>${s.duration} min</small></span><strong>${euro(s.price)}</strong></label>`).join('')}</div><div class="booking-actions"><button type="button" data-next>Choisir un jour →</button></div><p class="error" id="step-error" role="status"></p>`}
  if(state.step===1){html=`<h3 class="step-heading" tabindex="-1">Quel jour&nbsp;?</h3><p class="step-note">Horaires indicatifs, à confirmer. Dimanche fermé.</p><div class="day-grid">${dates().map((d,i)=>`<button type="button" data-day="${i}" ${d.getDay()===0?'disabled':''} class="${state.day?.toDateString()===d.toDateString()?'selected':''}">${shortFormat.format(d)}${d.getDay()===0?'<small>fermé</small>':''}</button>`).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Prestation</button><button type="button" data-next>Choisir une heure →</button></div><p class="error" id="step-error" role="status"></p>`}
  if(state.step===2){const available=slots().some(slot=>!slot.disabled);html=`<h3 class="step-heading" tabindex="-1">À quelle heure&nbsp;?</h3><p class="step-note">${dayFormat.format(state.day)} · créneaux fictifs, à confirmer.</p><div class="slot-grid">${slots().map(s=>`<button type="button" data-time="${s.label}" ${s.disabled?'disabled':''} class="${state.time===s.label?'selected':''}">${s.label}${s.reason?`<small> ${s.reason}</small>`:''}</button>`).join('')}</div>${available?'':'<p class="step-note">Aucun créneau disponible pour ce jour dans cette simulation. Choisissez un autre jour.</p>'}<div class="booking-actions"><button class="back" type="button" data-back>← Jour</button><button type="button" data-next>Vos coordonnées →</button></div><p class="error" id="step-error" role="status"></p>`}
  if(state.step===3){html=`<h3 class="step-heading" tabindex="-1">Vos coordonnées</h3><p class="step-note">${state.service.name} · ${dayFormat.format(state.day)} à ${state.time} · ${euro(state.service.price)} indicatifs</p><form id="details" novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required aria-describedby="first-error" value=""><span class="error" id="first-error"></span></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><div class="booking-actions"><button class="back" type="button" data-back>← Heure</button><button type="submit">Terminer la simulation →</button></div></form>`}
  if(state.step===4){html=`<h3 class="step-heading" tabindex="-1">Simulation terminée.</h3><p>Votre sélection&nbsp;: <strong>${state.service.name}</strong>, ${dayFormat.format(state.day)} à ${state.time} · ${euro(state.service.price)} indicatifs.</p><p class="step-note">Aucun rendez-vous n’a été envoyé. Pour réserver, contactez l’institut ou consultez sa fiche Treatwell.</p><div class="booking-actions"><a class="button light" href="tel:+33670877987">Appeler l’institut ↗</a><button class="restart" type="button" data-restart>Recommencer</button></div>`}
  content.innerHTML=html; content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
  if(state.step===3){content.querySelector('[name=first]').value=state.first;content.querySelector('[name=phone]').value=state.phone}
  if(focus) content.querySelector('.step-heading')?.focus({preventScroll:true});
}
content.addEventListener('change',e=>{if(e.target.name==='service'){state.service=services.find(s=>s.id===e.target.value);state.time=null;summary()}});
content.addEventListener('click',e=>{
  const button=e.target.closest('button'); if(!button)return;
  if(button.dataset.day!==undefined){state.day=dates()[Number(button.dataset.day)];state.time=null;render(false);content.querySelector(`[data-day="${button.dataset.day}"]`)?.focus();return}
  if(button.dataset.time){state.time=button.dataset.time;render(false);Array.from(content.querySelectorAll('[data-time]')).find(item=>item.dataset.time===state.time)?.focus();return}
  if(button.hasAttribute('data-back')){if(state.step===3){state.first=content.querySelector('[name=first]').value;state.phone=content.querySelector('[name=phone]').value}state.step--;render();return}
  if(button.hasAttribute('data-restart')){Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});render();return}
  if(button.hasAttribute('data-next')){if((state.step===0&&!state.service)||(state.step===1&&!state.day)||(state.step===2&&!state.time)){content.querySelector('#step-error').textContent='Choisissez une option pour continuer.';return}state.step++;render()}
});
content.addEventListener('submit',e=>{e.preventDefault();const form=e.target; state.first=form.first.value.trim();state.phone=form.phone.value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');const validFirst=state.first.length>0;const validPhone=/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(digits);form.querySelector('#first-error').textContent=validFirst?'':'Indiquez votre prénom.';form.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';form.first.setAttribute('aria-invalid',String(!validFirst));form.phone.setAttribute('aria-invalid',String(!validPhone));if(!validFirst)form.first.focus();else if(!validPhone)form.phone.focus();else{state.step=4;render()}});
document.querySelector('.booking-progress').addEventListener('click',e=>{const button=e.target.closest('[data-goto]');if(!button||button.disabled)return;if(state.step===3){state.first=content.querySelector('[name=first]').value;state.phone=content.querySelector('[name=phone]').value}state.step=Number(button.dataset.goto);render()});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=services.find(s=>s.id===link.dataset.service);state.step=0;state.time=null;render(false)}));
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});document.querySelectorAll('.service-row').forEach(row=>row.hidden=button.dataset.filter!=='all'&&row.dataset.category!==button.dataset.filter)}));
render(false);
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${Math.min(i%4,3)*60}ms`;observer.observe(el)})}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'))}

const motionOK=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(motionOK && 'IntersectionObserver' in window){const number=document.querySelector('.count');const counter=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;counter.unobserve(number);const start=performance.now();function tick(now){const p=Math.min((now-start)/600,1);number.textContent=Math.round(40*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}),{threshold:.5});counter.observe(number)}
if('IntersectionObserver' in window){const bar=document.querySelector('.mobile-bar');const overlaps=new Set();const hideBar=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?overlaps.add(entry.target):overlaps.delete(entry.target));bar.classList.toggle('is-hidden',overlaps.size>0)},{threshold:0});[document.querySelector('#reserver'),document.querySelector('footer')].forEach(el=>hideBar.observe(el))}
