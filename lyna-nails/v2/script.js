const services = ['Vernis semi-permanent', 'Beauté des pieds avec vernis', 'Épilation à la cire classique'];
const state = {step: 0, service: '', day: '', time: '', name: '', phone: ''};
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#summary');
const stepNumber = document.querySelector('#step-number');
const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
function dayOptions(){
  const dates=[];
  const parts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type => Number(parts.find(p=>p.type===type).value);
  for(let i=0;i<14;i++){
    const day=new Date(part('year'),part('month')-1,part('day')+i,12);
    const key=[day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
    dates.push({key,label:dateFormat.format(day),closed:day.getDay()===0});
  }
  return dates;
}
function passedTime(day, hour){
  const parts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const now = Number(parts.find(p=>p.type==='hour').value)*60 + Number(parts.find(p=>p.type==='minute').value);
  return day === dayOptions()[0].key && Number.parseInt(hour,10)*60 <= now;
}
function escapeText(value){const el=document.createElement('span');el.textContent=value;return el.innerHTML;}
function render(focus=true){
  if(state.time && passedTime(state.day,state.time)) state.time='';
  stepNumber.textContent = state.step < 4 ? `${String(state.step+1).padStart(2,'0')} / 04` : 'TERMINÉ';
  const date=dayOptions().find(d=>d.key===state.day);
  summary.innerHTML = `<button type="button" data-go="0">${escapeText(state.service || 'Prestation à choisir')}</button>${date ? `<button type="button" data-go="1">${escapeText(date.label)}</button>` : ''}${state.time ? `<button type="button" data-go="2">${escapeText(state.time)}</button>` : ''}`;
  let html='';
  if(state.step===0){html=`<h3 tabindex="-1">Choisissez une prestation</h3><fieldset><legend>Prestation</legend><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="service" value="${i}" ${state.service===s?'checked':''}>${s}</label>`).join('')}</div></fieldset><p class="error" id="booking-error" role="status"></p><div class="booking-actions"><button type="button" data-action="next">Continuer →</button></div>`;}
  if(state.step===1){html=`<h3 tabindex="-1">Choisissez un jour</h3><p class="booking-notice">Jours indicatifs, selon les horaires publiés. Les disponibilités sont à vérifier sur Treatwell.</p><fieldset><legend>Jour</legend><div class="choices">${dayOptions().map(d=>`<label class="choice"><input type="radio" name="day" value="${d.key}" ${state.day===d.key?'checked':''} ${d.closed?'disabled':''}>${d.label}${d.closed?' — fermé':''}</label>`).join('')}</div></fieldset><p class="error" id="booking-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="next">Continuer →</button></div>`;}
  if(state.step===2){html=`<h3 tabindex="-1">Choisissez une heure</h3><p class="booking-notice">Heures de simulation, sans indication de disponibilité. Vérifiez le créneau auprès du salon.</p><fieldset><legend>Heure indicative</legend><div class="choices">${['10 h','12 h','14 h','16 h'].map(t=>`<label class="choice"><input type="radio" name="time" value="${t}" ${state.time===t?'checked':''} ${passedTime(state.day,t)?'disabled':''}>${t}${passedTime(state.day,t)?' — heure passée':''}</label>`).join('')}</div></fieldset><p class="error" id="booking-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="next">Continuer →</button></div>`;}
  if(state.step===3){html=`<h3 tabindex="-1">Vos coordonnées</h3><p class="booking-notice">Simulation uniquement&nbsp;: ces informations restent sur cette page et ne sont pas transmises.</p><label class="field"><span>Prénom</span><input type="text" name="name" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="booking-error"></label><label class="field"><span>Téléphone</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="booking-error"></label><p class="error" id="booking-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="next">Terminer la simulation</button></div>`;}
  if(state.step===4){html=`<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.name)}. Votre sélection est affichée ci-dessus.</p><p class="booking-notice">Aucun rendez-vous n’a été réservé et aucune information n’a été envoyée.</p><a class="text-link" href="https://lynanails.mytreatwell.fr/">Réserver réellement sur Treatwell ↗</a><div><button class="restart" type="button" data-action="restart">Recommencer</button></div>`;}
  content.innerHTML=html; content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
  if(focus) content.querySelector('h3')?.focus();
}
summary.addEventListener('click',e=>{const button=e.target.closest('[data-go]');if(button){state.step=Number(button.dataset.go);render();}});
content.addEventListener('change',e=>{
  if(e.target.name==='service')state.service=services[Number(e.target.value)];
  if(e.target.name==='day'){state.day=e.target.value;state.time='';}
  if(e.target.name==='time')state.time=e.target.value;
  const date=dayOptions().find(d=>d.key===state.day);
  summary.innerHTML=`<button type="button" data-go="0">${escapeText(state.service || 'Prestation à choisir')}</button>${date?`<button type="button" data-go="1">${escapeText(date.label)}</button>`:''}${state.time?`<button type="button" data-go="2">${escapeText(state.time)}</button>`:''}`;
});
content.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='restart'){Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''});render();return;}
  if(state.step===3){state.name=content.querySelector('[name=name]').value.trim();state.phone=content.querySelector('[name=phone]').value.trim();}
  if(action==='back'){state.step--;render();return;}
  let error='';
  if(state.step===0&&!state.service)error='Choisissez une prestation pour continuer.';
  if(state.step===1&&!state.day)error='Choisissez un jour pour continuer.';
  if(state.step===2&&!state.time)error='Choisissez une heure pour continuer.';
  if(state.step===3&&(!state.name||! /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone)))error='Indiquez votre prénom et un numéro de téléphone français valide.';
  if(error){content.querySelector('#booking-error').textContent=error;return;}
  state.step++;render();
});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.step=0;render(false);}));
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.filter').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('.service-list article').forEach(row=>row.hidden=button.dataset.filter!=='tout'&&row.dataset.category!==button.dataset.filter);
}));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));}
render(false);

window.sitePret=true;
setTimeout(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible')),2500);
