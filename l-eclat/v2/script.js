document.documentElement.classList.add('js');
requestAnimationFrame(() => document.documentElement.classList.add('ready'));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('shown'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
  reveals.forEach(item => observer.observe(item));
} else reveals.forEach(item => item.classList.add('shown'));
const content = document.querySelector('#booking-content');
const selection = document.querySelector('#selection span');
const count = document.querySelector('#step-count');
const stepButtons = [...document.querySelectorAll('[data-go]')];
let step = 0;
let transitionTimer;
const state = { service: '', date: null, time: '', first: '', phone: '' };
const names = ['Coloration végétale Kydra avec séchage', 'Coupe', 'Coloration et mèches', 'Soin'];
const formatter = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' });
const dateLabel = date => formatter.format(date);
function summary(){
  selection.textContent = [state.service, state.date && dateLabel(state.date), state.time].filter(Boolean).join(' · ') || 'À compléter';
  stepButtons.forEach((button, index) => { button.disabled = index > step && !(index === 1 && state.service) && !(index === 2 && state.date) && !(index === 3 && state.time); button.toggleAttribute('aria-current', index === step); if(index === step) button.setAttribute('aria-current','step'); });
  count.textContent = step < 4 ? `0${step + 1} / 04` : 'Terminé';
}
function render(focus = false){
  summary();
  if(step === 0){
    content.innerHTML = `<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation sans prix ni envoi. Le choix reste à confirmer auprès du salon.</p><div>${names.map((name,i)=>`<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===name?'checked':''}>${name}</label>`).join('')}</div><div class="booking-actions"><button class="button" type="button" id="next" ${state.service?'':'disabled'}>Choisir un jour →</button></div>`;
    content.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{ state.service=names[Number(input.value)]; content.querySelector('#next').disabled=false; summary(); }));
    content.querySelector('#next').addEventListener('click',()=>go(1));
  } else if(step === 1){
    const now = new Date(); now.setHours(0,0,0,0);
    const days = Array.from({length:14},(_,i)=>{const d = new Date(now);d.setDate(d.getDate()+i);return d;});
    content.innerHTML = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours fictifs selon les horaires Planity, à confirmer. Aucun rendez-vous ne sera créé.</p><div class="day-grid">${days.map((d,i)=>{const closed=[0,3].includes(d.getDay());return `<button type="button" data-day="${i}" aria-pressed="${Boolean(state.date && d.toDateString() === state.date.toDateString())}" ${closed?'disabled':''} aria-label="${dateLabel(d)}${closed?', fermé':''}">${d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})}<small>${closed?'Fermé':d.toLocaleDateString('fr-FR',{month:'short'})}</small></button>`}).join('')}</div><div class="booking-actions"><button class="button secondary" id="back" type="button">← Prestation</button></div>`;
    content.querySelectorAll('[data-day]').forEach(button=>button.addEventListener('click',()=>{state.date=days[Number(button.dataset.day)];state.time='';go(2);}));
    content.querySelector('#back').addEventListener('click',()=>go(0));
  } else if(step === 2){
    const now=new Date(); const slots=['10 h 00','11 h 00','14 h 00'];
    content.innerHTML=`<h3 tabindex="-1">Choisir une heure</h3><p>${dateLabel(state.date)} · créneaux fictifs, horaires à confirmer.</p><div class="time-grid">${slots.map((slot,i)=>{const past=state.date.toDateString()===now.toDateString() && Number(slot.slice(0,2))<=now.getHours(); const taken=(state.date.getDate()+i)%5===0; return `<button type="button" data-time="${i}" aria-pressed="${state.time === slot}" ${past||taken?'disabled':''}>${slot}${taken?'<small> · indisponible</small>':''}</button>`}).join('')}</div><div class="booking-actions"><button class="button secondary" id="back" type="button">← Jour</button></div>`;
    content.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{state.time=slots[Number(button.dataset.time)];go(3);}));
    content.querySelector('#back').addEventListener('click',()=>go(1));
  } else if(step === 3){
    content.innerHTML=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required aria-describedby="erreur"></label><label class="field">Téléphone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="erreur"></label><p class="error" id="erreur" role="status"></p><div class="booking-actions"><button class="button secondary" id="back" type="button">← Heure</button><button class="button" type="submit">Confirmer la simulation</button></div></form>`;
    const form=content.querySelector('form'); form.elements.first.value=state.first; form.elements.phone.value=state.phone;
    content.querySelector('#back').addEventListener('click',()=>go(2));
    form.addEventListener('submit',event=>{event.preventDefault();state.first=form.elements.first.value.trim();state.phone=form.elements.phone.value.trim(); const digits=state.phone.replace(/[\s.()-]/g,''); if(!state.first || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){content.querySelector('#erreur').textContent='Indiquez votre prénom et un numéro de téléphone français valide.'; (!state.first ? form.elements.first : form.elements.phone).focus(); return;}go(4);});
  } else {
    content.innerHTML='<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est prête. Aucun rendez-vous n’a été réservé et aucune information n’a été envoyée.</p><a class="button" href="tel:+33298021634">Appeler le salon</a> <button class="button secondary" type="button" id="restart">Recommencer</button>';
    content.querySelector('#restart').addEventListener('click',()=>{Object.assign(state,{service:'',date:null,time:'',first:'',phone:''});go(0);});
  }
  if(focus) content.querySelector('h3').focus();
}
function go(next){
  clearTimeout(transitionTimer);
  step=next;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){render(true);return;}
  content.classList.add('changing');
  transitionTimer = setTimeout(()=>{render(true);content.classList.remove('changing');},150);
}
stepButtons.forEach(button=>button.addEventListener('click',()=>{if(!button.disabled)go(Number(button.dataset.go));}));
render();
