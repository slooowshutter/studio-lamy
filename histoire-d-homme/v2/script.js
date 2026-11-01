'use strict';
document.documentElement.classList.add('js');
const tiles = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 });
  tiles.forEach((tile, i) => { tile.style.transitionDelay = `${i * 60}ms`; observer.observe(tile); });
} else tiles.forEach(tile => tile.classList.add('visible'));

const services = [
  { id:'demi4', name:'Demi-tête · 1 à 4 tresses', price:48, minutes:30 },
  { id:'demi9', name:'Demi-tête · 4 à 9 tresses', price:58, minutes:60 },
  { id:'entiere4', name:'Tête entière · 1 à 4 tresses', price:68, minutes:60 },
  { id:'entiere9', name:'Tête entière · 4 à 9 tresses', price:78, minutes:60 },
  { id:'coupe', name:'Shampoing, coupe et coiffage', price:28, minutes:30 },
  { id:'coupebarbe', name:'Coupe et taille de barbe', price:43, minutes:60 },
  { id:'barbe', name:'Taille et soin de barbe', price:19, minutes:30 }
];
const state = { step:0, service:null, day:null, time:null, name:'', phone:'' };
const content = document.querySelector('#booking-content');
const summary = document.querySelector('#summary-text');
const stepButtons = [...document.querySelectorAll('[data-go]')];
const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(date);
const duration = minutes => minutes === 60 ? '1 h' : `${minutes} min`;
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function recap() {
  summary.textContent = state.service ? [state.service.name, duration(state.service.minutes), `${state.service.price} € publiés sur Planity`, state.day && formatDate(state.day), state.time].filter(Boolean).join(' · ') : 'Aucune prestation choisie.';
  stepButtons.forEach((button, i) => { button.disabled = state.step === 4 || i > (state.time ? 3 : state.day ? 2 : state.service ? 1 : 0); button.classList.toggle('current', i === state.step); if(i===state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
}
function render(focus = true) {
  recap();
  let html = '';
  if (state.step === 0) {
    html = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p class="hint">Tarifs publiés sur Planity, à confirmer avec Histoire d'Homme.</p><div role="radiogroup" aria-label="Prestation">${services.map(s => `<label class="choice"><input type="radio" name="prestation" value="${s.id}" ${state.service?.id === s.id ? 'checked' : ''}><span>${s.name}<br><small>${duration(s.minutes)}</small></span><b>${s.price}&nbsp;€</b></label>`).join('')}</div><button class="next" type="button" data-next="1">Choisir un jour →</button><p class="error" id="step-error" role="status"></p>`;
  } else if (state.step === 1) {
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Array.from({length:14},(_,i) => { const d = new Date(today); d.setDate(today.getDate()+i); return d; });
    html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="hint">Les disponibilités sont fictives. Horaires des jours fériés à confirmer.</p><div class="days">${days.map((d,i) => { const closed = d.getDay()===0 || d.getDay()===1; const selected = state.day && d.toDateString()===state.day.toDateString(); return `<button type="button" data-day="${i}" ${closed?'disabled':''} class="${selected?'selected':''}" aria-pressed="${!!selected}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<small>${closed?'Fermé':'Exemple'}</small></button>`; }).join('')}</div><button class="back" type="button" data-back="0">← Prestation</button><button class="next" type="button" data-next="2">Choisir une heure →</button><p class="error" id="step-error" role="status"></p>`;
  } else if (state.step === 2) {
    const close = state.day.getDay()===6 ? 18*60 : 20*60;
    const now = new Date(); const slots=[];
    for(let t=10*60;t+state.service.minutes<=close;t+=30){const hour=String(Math.floor(t/60)).padStart(2,'0'), minute=String(t%60).padStart(2,'0');const value=`${hour}:${minute}`;const past=state.day.toDateString()===now.toDateString() && t<=now.getHours()*60+now.getMinutes(); const taken=(t/30+state.day.getDate())%5===0;slots.push(`<button type="button" data-time="${value}" ${past||taken?'disabled':''} class="${state.time===value?'selected':''}" aria-pressed="${state.time===value}">${value}${past?' · passé':taken?' · déjà pris':''}</button>`);}
    html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">${formatDate(state.day)} · créneaux fictifs, selon la durée choisie.</p><div class="slots">${slots.join('')}</div><button class="back" type="button" data-back="1">← Jour</button><button class="next" type="button" data-next="3">Vos coordonnées →</button><p class="error" id="step-error" role="status"></p>`;
  } else if (state.step === 3) {
    html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Simulation uniquement&nbsp;: rien ne sera envoyé.</p><form id="details" novalidate><label class="field" for="firstname">Prénom<input id="firstname" name="prenom" autocomplete="given-name" value="${escapeHtml(state.name)}" aria-describedby="name-error"></label><p class="error" id="name-error"></p><label class="field" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHtml(state.phone)}" aria-describedby="phone-error"></label><p class="error" id="phone-error"></p><button class="back" type="button" data-back="2">← Heure</button><button class="confirm" type="submit">Confirmer la simulation →</button></form>`;
  } else {
    html = `<h3 tabindex="-1">Simulation terminée.</h3><div class="success"><p>Merci ${escapeHtml(state.name)}. Votre choix&nbsp;: ${escapeHtml(state.service.name)}, le ${formatDate(state.day)} à ${state.time}.</p><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris.</p></div><a class="button button-light" href="https://www.planity.com/histoire-dhomme-59000-lille" target="_blank" rel="noopener">Réserver réellement sur Planity ↗</a><button class="back" type="button" data-restart>Recommencer</button>`;
  }
  content.innerHTML=html;
  if (focus && !matchMedia('(prefers-reduced-motion: reduce)').matches) { content.classList.add('step-enter'); requestAnimationFrame(() => requestAnimationFrame(() => content.classList.remove('step-enter'))); }
  if(focus) content.querySelector('h3')?.focus({preventScroll:true});
}
content.addEventListener('change', event => { if(event.target.name==='prestation') { state.service=services.find(s=>s.id===event.target.value); state.day=null;state.time=null;recap(); } });
content.addEventListener('click', event => {
  const button=event.target.closest('button'); if(!button) return;
  if(button.dataset.day!==undefined){const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()+Number(button.dataset.day));state.day=day;state.time=null;render(false);content.querySelector(`[data-day="${button.dataset.day}"]`)?.focus();}
  if(button.dataset.time){state.time=button.dataset.time;render(false);content.querySelector(`[data-time="${button.dataset.time}"]`)?.focus();}
  if(button.dataset.back!==undefined){state.step=Number(button.dataset.back);render();}
  if(button.dataset.next!==undefined){const next=Number(button.dataset.next);if((next===1&&!state.service)||(next===2&&!state.day)||(next===3&&!state.time)){document.querySelector('#step-error').textContent='Veuillez faire un choix pour continuer.';return;}state.step=next;render();}
  if(button.hasAttribute('data-restart')){Object.assign(state,{step:0,service:null,day:null,time:null,name:'',phone:''});render();}
});
content.addEventListener('input', event => { if(event.target.id==='firstname') state.name=event.target.value; if(event.target.id==='telephone') state.phone=event.target.value; });
content.addEventListener('submit', event => {event.preventDefault();const name=content.querySelector('#firstname').value.trim();const phone=content.querySelector('#telephone').value.trim();const validName=name.length>=2;const validPhone=/^(?:(?:\+33|0033)[\s.\-]?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(phone);content.querySelector('#name-error').textContent=validName?'':'Indiquez votre prénom (2 caractères minimum).';content.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';content.querySelector('#firstname').setAttribute('aria-invalid',String(!validName));content.querySelector('#telephone').setAttribute('aria-invalid',String(!validPhone));if(!validName||!validPhone){content.querySelector(validName?'#telephone':'#firstname').focus();return;}state.name=name;state.phone=phone;state.step=4;render();});
stepButtons.forEach(button => button.addEventListener('click',()=>{state.step=Number(button.dataset.go);render();}));
document.querySelectorAll('[data-service]').forEach(button=>button.addEventListener('click',()=>{state.service=services.find(s=>s.id===button.dataset.service);state.day=null;state.time=null;state.step=1;render(false);document.querySelector('#reserver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});content.querySelector('h3').focus({preventScroll:true});}));
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelectorAll('.price-row').forEach(row=>{row.hidden=button.dataset.filter!=='tout'&&row.dataset.category!==button.dataset.filter;});}));
render(false);
