window.sitePret = true;
const panel = document.querySelector('#booking-panel');
const count = document.querySelector('#step-count');
const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
const services = ['Coupe', 'Brushing', 'Coloration', 'Soins capillaires'];
const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
function localKey(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function dateFromKey(key) { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); }
function escapeText(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function summary() {
 document.querySelector('#recap-service').textContent = state.service ? 'Prestation : ' + state.service : 'Prestation —';
 document.querySelector('#recap-day').textContent = state.day ? 'Jour : ' + dateFormat.format(dateFromKey(state.day)) : 'Jour —';
 document.querySelector('#recap-time').textContent = state.time ? 'Heure : ' + state.time.replace(':', ' h ') : 'Heure —';
 document.querySelector('#recap-service').disabled = !state.service;
 document.querySelector('#recap-day').disabled = !state.day;
 document.querySelector('#recap-time').disabled = !state.time;
}
function option(name,value,label,checked,disabled,sub='') { return `<label class="choice"><input type="radio" name="${name}" value="${escapeText(value)}" ${checked?'checked':''} ${disabled?'disabled':''}><span>${escapeText(label)}${sub?`<small>${sub}</small>`:''}</span></label>`; }
function render(focus=true) {
 summary(); count.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'Terminé';
 let html = '';
 if (state.step === 0) {
  html = `<h3 tabindex="-1">Choisir une prestation</h3><p class="hint">Prestations à confirmer avec le salon ; tarifs et durées sur demande.</p><fieldset class="choices"><legend>Prestation à confirmer</legend>${services.map(s=>option('service',s,s,state.service===s,false)).join('')}</fieldset><div class="booking-actions"><button class="button" data-next>Continuer →</button></div>`;
 } else if (state.step === 1) {
  const today = new Date(); today.setHours(0,0,0,0); let days = '';
  for(let i=0;i<14;i++){const d=new Date(today);d.setDate(today.getDate()+i);const key=localKey(d), closed=d.getDay()===0||d.getDay()===1;days+=option('day',key,dateFormat.format(d),state.day===key,closed,closed?'Fermé':'Horaire à confirmer');}
  html = `<h3 tabindex="-1">Choisir un jour</h3><p class="hint">Horaires d’annuaires à confirmer. Les jours sont proposés pour la simulation.</p><fieldset class="choices"><legend>Jour de la simulation</legend>${days}</fieldset><div class="booking-actions"><button class="button secondary" data-back>← Retour</button><button class="button" data-next>Continuer →</button></div>`;
 } else if (state.step === 2) {
  const now=new Date(), same=state.day===localKey(now); const times=['09:00','11:00','14:00','16:00'];
  html = `<h3 tabindex="-1">Choisir une heure</h3><p class="hint">Ces horaires illustrent la simulation et ne correspondent pas à des disponibilités réelles.</p><fieldset class="choices"><legend>Heure de la simulation</legend>${times.map(t=>{const [h,m]=t.split(':').map(Number);return option('time',t,t.replace(':',' h '),state.time===t,same&&(h*60+m<=now.getHours()*60+now.getMinutes()),same&&(h*60+m<=now.getHours()*60+now.getMinutes())?'Passé':'');}).join('')}</fieldset><div class="booking-actions"><button class="button secondary" data-back>← Retour</button><button class="button" data-next>Continuer →</button></div>`;
 } else if (state.step === 3) {
  html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Pour cette démonstration, ces données restent dans votre navigateur et ne sont pas envoyées.</p><form id="booking-form" novalidate><div class="field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="name-error"><span class="error" id="name-error"></span></div><div class="field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></div><div class="booking-actions"><button class="button secondary" type="button" data-back>← Retour</button><button class="button" type="submit">Terminer la simulation →</button></div></form>`;
 } else {
  html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.name)}. Votre choix : ${escapeText(state.service)}, le ${escapeText(dateFormat.format(dateFromKey(state.day)))} à ${escapeText(state.time.replace(':',' h '))}.</p><p class="hint">Aucun rendez-vous n’a été pris et rien n’a été envoyé. Pour réserver, appelez le salon.</p><div class="booking-actions"><a class="button" href="tel:+33322461095">Appeler le salon ↗</a><button class="button secondary" data-reset>Recommencer</button></div>`;
 }
 panel.classList.add('changing'); panel.innerHTML = html; requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('changing')));
 if(focus) panel.querySelector('h3').focus({preventScroll:true});
 const next=panel.querySelector('[data-next]'); if(next) next.addEventListener('click',()=>{const selected=panel.querySelector('input:checked');if(!selected){let msg=panel.querySelector('.error');if(!msg){msg=document.createElement('p');msg.className='error';msg.setAttribute('role','status');next.parentNode.before(msg);}msg.textContent='Veuillez faire un choix pour continuer.';return;}if(state.step===0){if(state.service!==selected.value){state.day='';state.time='';}state.service=selected.value;}if(state.step===1){if(state.day!==selected.value)state.time='';state.day=selected.value;}if(state.step===2)state.time=selected.value;state.step++;render();});
 const back=panel.querySelector('[data-back]'); if(back) back.addEventListener('click',()=>{if(state.step===3){state.name=panel.querySelector('#prenom').value;state.phone=panel.querySelector('#telephone').value;}state.step--;render();});
 const form=panel.querySelector('form');if(form)form.addEventListener('submit',e=>{e.preventDefault();state.name=form.prenom.value.trim();state.phone=form.telephone.value.trim();const validName=state.name.length>0, validPhone=/^(?:(?:\+33|0033)[ .-]?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}$/.test(state.phone);form.querySelector('#name-error').textContent=validName?'':'Indiquez votre prénom.';form.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';form.prenom.setAttribute('aria-invalid',String(!validName));form.telephone.setAttribute('aria-invalid',String(!validPhone));if(validName&&validPhone){state.step=4;render();}else form.querySelector(validName?'#telephone':'#prenom').focus();});
 const reset=panel.querySelector('[data-reset]');if(reset)reset.addEventListener('click',()=>{Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''});render();});
}
document.querySelectorAll('.recap-step').forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.step); render(); }));
render(false);
setTimeout(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')), 2500);
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${(i%4)*60}ms`;observer.observe(el);});}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
