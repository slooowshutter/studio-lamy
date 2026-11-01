'use strict';
document.documentElement.classList.add('js');
const services = [
  {name:'Manucure homme', price:25, duration:30, category:'mains'},
  {name:'Manucure et vernis classique', price:28, duration:30, category:'mains'},
  {name:'Manucure et vernis semi-permanent', price:35, duration:30, category:'mains'},
  {name:'Capsules gel et vernis semi-permanent', price:50, duration:45, category:'gel'},
  {name:'Décoration 3D', price:4, duration:15, category:'gel', from:true},
  {name:'Baby boomer, gel et semi-permanent', price:65, duration:45, category:'gel'},
  {name:'Beauté des pieds', price:30, duration:45, category:'pieds'}
];
const price = s => `${s.from ? 'Dès ' : ''}${s.price} €`;
const list = document.querySelector('#liste-prestations');
const stage = document.querySelector('#booking-stage');
const summary = document.querySelector('#summary-content');
const state = {step:0, service:null, day:null, time:null, first:'', phone:''};
function renderServices(filter='tout') {
  list.innerHTML = services.map((s,i) => ({s,i})).filter(({s}) => filter === 'tout' || s.category === filter).map(({s,i}) => `<article class="service-row"><h3>${s.name}</h3><span class="service-meta duration">${s.duration} min</span><span class="service-meta">${price(s)}</span><button type="button" data-book="${i}" aria-label="Choisir ${s.name}">↗</button></article>`).join('');
}
renderServices();
document.querySelector('.filters').addEventListener('click', e => {
  const button=e.target.closest('button[data-filter]'); if(!button) return;
  document.querySelectorAll('.filter').forEach(b => {b.classList.toggle('active', b===button);b.setAttribute('aria-pressed', String(b===button));});
  renderServices(button.dataset.filter);
});
list.addEventListener('click', e => {const b=e.target.closest('[data-book]');if(!b)return;state.service=Number(b.dataset.book);state.day=null;state.time=null;state.step=0;renderStep(true);document.querySelector('#reservation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
const formatDate = date => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(date);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function dates(){const now=new Date();return Array.from({length:14},(_,i)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()+i));}
function getSlots(day, duration){
  const end = day.getDay()===0 ? 19*60 : 19*60+30;
  const now = new Date(); const slots=[];
  for(let minutes=600; minutes+duration<=end; minutes+=30){
    const h=Math.floor(minutes/60), m=minutes%60;
    const d=new Date(day.getFullYear(),day.getMonth(),day.getDate(),h,m);
    const taken=(day.getDate()*7+minutes/30)%5===0;
    slots.push({label:`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')}`,disabled:d<=now||taken});
  }
  return slots;
}
function recap(){
  const items=[];
  if(state.service!==null){const s=services[state.service];items.push(`<p><button type="button" data-goto="0">Prestation&nbsp;: ${s.name} · ${price(s)}</button></p>`);}
  if(state.day)items.push(`<p><button type="button" data-goto="1">Jour&nbsp;: ${formatDate(state.day)}</button></p>`);
  if(state.time)items.push(`<p><button type="button" data-goto="2">Heure&nbsp;: ${state.time}</button></p>`);
  summary.innerHTML=items.join('')||'Votre choix apparaîtra ici.';
}
function paintStep(focus=false, restore=null){
  const s=state.service===null?null:services[state.service];
  document.querySelector('#step-number').textContent=state.step===4?'TERMINÉ':`${String(state.step+1).padStart(2,'0')} / 04`;
  let html='';
  if(state.step===0){html=`<span class="eyebrow">ÉTAPE 01 / 04</span><h3 tabindex="-1">La prestation</h3><p>Tarifs relevés sur Planity, à confirmer avec LyVan Nails.</p><fieldset><legend>Choisissez une prestation</legend>${services.map((item,i)=>`<div class="choice"><input type="radio" name="service" id="service-${i}" value="${i}" ${state.service===i?'checked':''}><label for="service-${i}">${item.name}<small>${item.duration} min · ${price(item)}</small></label></div>`).join('')}</fieldset><div class="step-actions"><button class="primary" type="button" data-next>Choisir le jour →</button></div><p class="error" id="step-error" role="status"></p>`;}
  if(state.step===1){html=`<span class="eyebrow">ÉTAPE 02 / 04</span><h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Horaires indicatifs, à confirmer. Le lundi est indiqué fermé.</p><div class="days">${dates().map(d=>{const closed=d.getDay()===1;return `<button type="button" data-day="${dateKey(d)}" aria-pressed="${state.day?dateKey(state.day)===dateKey(d):false}" ${closed?'disabled':''}>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}${closed?'<br>Fermé':''}</button>`}).join('')}</div><div class="step-actions"><button type="button" data-back>← Retour</button><button class="primary" type="button" data-next>Choisir l’heure →</button></div><p class="error" id="step-error" role="status"></p>`;}
  if(state.step===2){html=`<span class="eyebrow">ÉTAPE 03 / 04</span><h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux fictifs pour le ${formatDate(state.day)}. Les disponibilités sont à confirmer auprès du salon.</p><div class="slots">${getSlots(state.day,s.duration).map(t=>`<button type="button" data-time="${t.label}" aria-pressed="${state.time===t.label}" ${t.disabled?'disabled':''}>${t.label}${t.disabled?' · Indisponible':''}</button>`).join('')}</div><div class="step-actions"><button type="button" data-back>← Retour</button><button class="primary" type="button" data-next>Vos coordonnées →</button></div><p class="error" id="step-error" role="status"></p>`;}
  if(state.step===3){html=`<span class="eyebrow">ÉTAPE 04 / 04</span><h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le parcours. Ces informations restent sur cette page.</p><form id="booking-form" novalidate><label class="field" for="first">Prénom<input id="first" name="first" autocomplete="given-name" value="" required aria-describedby="form-error"></label><label class="field" for="phone">Téléphone<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="" required aria-describedby="form-error"></label><div class="recap">${s.name} · ${price(s)} · ${formatDate(state.day)} à ${state.time}</div><p class="error" id="form-error" role="status"></p><div class="step-actions"><button type="button" data-back>← Retour</button><button class="submit" type="submit">Terminer la simulation →</button></div></form>`;}
  if(state.step===4){html=`<span class="eyebrow">SIMULATION TERMINÉE</span><h3 tabindex="-1">C’est noté sur cet aperçu.</h3><p>Aucune réservation ni coordonnée n’a été envoyée. Pour prendre rendez-vous, appelez le salon.</p><div class="recap">${s.name} · ${price(s)}<br>${formatDate(state.day)} à ${state.time}</div><div class="step-actions"><a class="button dark" href="tel:+33148069626">Appeler le salon ↗</a><button type="button" data-reset>Recommencer</button></div>`;}
  stage.innerHTML=html;
  if(state.step===3){document.querySelector('#first').value=state.first;document.querySelector('#phone').value=state.phone;}
  recap();if(focus)stage.querySelector('h3')?.focus({preventScroll:true});else if(restore) stage.querySelector(restore)?.focus({preventScroll:true});
}
let transitionTimer;
function renderStep(focus=false, restore=null){
  clearTimeout(transitionTimer);
  if(!focus || matchMedia('(prefers-reduced-motion: reduce)').matches){stage.classList.remove('changing');paintStep(focus,restore);return;}
  stage.classList.add('changing');
  transitionTimer=setTimeout(()=>{paintStep(true);stage.classList.remove('changing');},100);
}
renderStep();
stage.addEventListener('change',e=>{if(e.target.name==='service'){state.service=Number(e.target.value);state.time=null;recap();}});
stage.addEventListener('click',e=>{
  const day=e.target.closest('[data-day]');if(day){const [y,m,d]=day.dataset.day.split('-').map(Number);state.day=new Date(y,m-1,d);state.time=null;renderStep(false, `[data-day="${day.dataset.day}"]`);return;}
  const time=e.target.closest('[data-time]');if(time){state.time=time.dataset.time;renderStep(false, `[data-time="${time.dataset.time}"]`);return;}
  if(e.target.closest('[data-back]')){if(state.step===3){state.first=document.querySelector('#first').value;state.phone=document.querySelector('#phone').value;}state.step--;renderStep(true);return;}
  if(e.target.closest('[data-reset]')){Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});renderStep(true);return;}
  if(e.target.closest('[data-next]')){const err=document.querySelector('#step-error');if(state.step===0&&state.service===null){err.textContent='Choisissez une prestation pour continuer.';return;}if(state.step===1&&!state.day){err.textContent='Choisissez un jour pour continuer.';return;}if(state.step===2&&!state.time){err.textContent='Choisissez une heure pour continuer.';return;}state.step++;renderStep(true);}
});
summary.addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(!b)return;if(state.step===3){state.first=document.querySelector('#first').value;state.phone=document.querySelector('#phone').value;}state.step=Number(b.dataset.goto);renderStep(true);});
stage.addEventListener('submit',e=>{e.preventDefault();state.first=document.querySelector('#first').value.trim();state.phone=document.querySelector('#phone').value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');const err=document.querySelector('#form-error');if(!state.first){err.textContent='Indiquez votre prénom.';document.querySelector('#first').focus();return;}if(!/^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits)){err.textContent='Indiquez un numéro de téléphone français valide.';document.querySelector('#phone').focus();return;}state.step=4;renderStep(true);});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');const count=entry.target.querySelector('[data-count]');if(count && !matchMedia('(prefers-reduced-motion: reduce)').matches){const end=Number(count.dataset.count), start=performance.now();const tick=now=>{const t=Math.min(1,(now-start)/450);count.textContent=Math.round(end*(1-Math.pow(1-t,3)));if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);}observer.unobserve(entry.target);}}),{threshold:.1});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
