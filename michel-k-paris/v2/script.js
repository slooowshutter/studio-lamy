const content = document.querySelector('#step-content');
const summary = document.querySelector('#summary');
const number = document.querySelector('#step-number');
const progress = document.querySelector('#booking-progress');
const state = { step: 0, service: '', day: '', time: '', firstName: '', phone: '' };
const services = ['Lissage brésilien', 'Coupe', 'Coloration des racines'];
const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDay = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d,12); };
const parisNow = () => { const parts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()); const part = type => parts.find(p=>p.type===type).value; return {day:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`}; };
const dateLabel = s => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(parseDay(s));
function render(focus = true) {
  number.textContent = state.step < 4 ? `${pad(state.step+1)} / 04` : 'TERMINÉ';
  updateSummary();
  progress.innerHTML = ['Prestation','Jour','Heure','Coordonnées'].map((label,i)=>`<button type="button" data-step="${i}" ${i>=state.step?'disabled':''} ${i===state.step?'aria-current="step"':''}>${pad(i+1)} <span>${label}</span></button>`).join('');
  let html = '';
  if (state.step === 0) {
    html = `<h3 tabindex="-1">La prestation</h3><p>Choisissez une prestation. Tarifs à confirmer auprès du salon.</p><div class="choices">${services.map(s=>`<label class="choice"><input type="radio" name="service" value="${s}" ${state.service===s?'checked':''}> <span>${s}</span></label>`).join('')}</div><div class="booking-actions"><button type="button" data-next ${state.service?'':'disabled'}>Choisir un jour →</button></div>`;
  } else if (state.step === 1) {
    const today = parseDay(parisNow().day);
    const days = Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d});
    html = `<h3 tabindex="-1">Le jour</h3><p>Jours présentés selon les horaires publiés. Disponibilités fictives.</p><div class="choices">${days.map(d=>{const key=dateKey(d),closed=d.getDay()===0||d.getDay()===1;return `<label class="choice"><input type="radio" name="day" value="${key}" ${closed?'disabled':''} ${state.day===key?'checked':''}><span>${dateLabel(key)}${closed?' · fermé':''}</span></label>`}).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="button" data-next ${state.day?'':'disabled'}>Choisir une heure →</button></div>`;
  } else if (state.step === 2) {
    const times=['09:30','10:30','11:30','14:00','15:00','16:00','17:00'];
    const now=parisNow();
    html = `<h3 tabindex="-1">L’heure</h3><p>Créneaux fictifs, sans indication de disponibilité réelle ni de durée.</p><div class="slots">${times.map(t=>{const past=state.day<now.day||(state.day===now.day&&t<=now.time);return `<button class="slot ${state.time===t?'selected':''}" type="button" data-time="${t}" aria-pressed="${state.time===t}" ${past?'disabled':''}>${t.replace(':',' h ')}</button>`}).join('')}</div><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="button" data-next ${state.time?'':'disabled'}>Vos coordonnées →</button></div>`;
  } else if (state.step === 3) {
    html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cette simulation, les informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="field">Prénom<input name="firstName" autocomplete="given-name" required value=""></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="form-error" value=""></label><p class="error" id="form-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-back>← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
  } else {
    html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée. Pour réserver, appelez le salon.</p><p><a href="tel:+33142663535">01 42 66 35 35 ↗</a></p><button class="success-reset" type="button" data-reset>Recommencer</button>`;
  }
  content.innerHTML = `<div class="step-enter">${html}</div>`;
  if(state.step===3){content.querySelector('[name=firstName]').value=state.firstName;content.querySelector('[name=phone]').value=state.phone;}
  if(focus) content.querySelector('h3').focus({preventScroll:true});
}
function updateSummary(){summary.textContent=[state.service,state.day&&dateLabel(state.day),state.time&&state.time.replace(':',' h ')].filter(Boolean).join(' · ')||'Aucune prestation sélectionnée'}
function enableNext(){const next=content.querySelector('[data-next]');if(next)next.disabled=false;updateSummary()}
content.addEventListener('change', e=>{
 if(e.target.name==='service'){state.service=e.target.value;state.day='';state.time='';enableNext()}
 if(e.target.name==='day'){state.day=e.target.value;state.time='';enableNext()}
});
progress.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(!b)return;if(state.step===3){state.firstName=content.querySelector('[name=firstName]').value;state.phone=content.querySelector('[name=phone]').value}state.step=Number(b.dataset.step);render()});
content.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-time')){state.time=b.dataset.time;content.querySelectorAll('[data-time]').forEach(slot=>{slot.classList.toggle('selected',slot===b);slot.setAttribute('aria-pressed',String(slot===b))});enableNext()}
 if(b.hasAttribute('data-back')){if(state.step===3){state.firstName=content.querySelector('[name=firstName]').value;state.phone=content.querySelector('[name=phone]').value}state.step--;render()}
 if(b.hasAttribute('data-next')){state.step++;render()}
 if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:'',day:'',time:'',firstName:'',phone:''});render()}
});
content.addEventListener('submit',e=>{e.preventDefault();const f=e.target;state.firstName=f.firstName.value.trim();state.phone=f.phone.value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');if(!state.firstName||! /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){f.querySelector('#form-error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return}state.step=4;render()});
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});document.querySelectorAll('.service-list article').forEach(row=>row.hidden=button.dataset.filter!=='tout'&&row.dataset.category!==button.dataset.filter)}));
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{Object.assign(state,{step:0,service:link.dataset.service,day:'',time:''});render(false)}));
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
render(false);
