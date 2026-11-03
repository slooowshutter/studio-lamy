const root = document.documentElement;
root.classList.add('js');
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); }
  }), { threshold: 0.1 });
  reveals.forEach((item, index) => { item.classList.add('pending'); item.style.transitionDelay = `${index % 3 * 60}ms`; observer.observe(item); });
}
const services = { homme: {name:'Forfait homme', minutes:30}, barbe: {name:'Barbe', minutes:20} };
const state = {step:0, service:'', day:'', time:'', first:'', phone:''};
const panel = document.querySelector('#booking-panel');
const formatDay = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDay = key => { const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); };
const days = Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);return d;});
function updateSummary(){document.querySelector('#sum-service').textContent=state.service ? services[state.service].name : '—';document.querySelector('#sum-day').textContent=state.day ? formatDay(parseDay(state.day)) : '—';document.querySelector('#sum-time').textContent=state.time || '—';document.querySelectorAll('[data-goto]').forEach(button => { const n=Number(button.dataset.goto); button.disabled = n===1 ? !state.service : n===2 ? !state.day : false; });document.querySelector('#step-count').textContent=`0${Math.min(state.step+1,4)} / 04`;}
function slots(){const d=parseDay(state.day), end=d.getDay()===6?18:19, result=[];for(let min=9*60;min+services[state.service].minutes<=end*60;min+=30){const h=Math.floor(min/60),m=min%60, at=new Date(d);at.setHours(h,m,0,0);result.push({label:`${String(h).padStart(2,'0')} h ${String(m).padStart(2,'0')}`,disabled:at<=new Date() || (min/30+d.getDate())%5===0});}return result;}
let transitionTimer;
let keyboardAction = false;
document.addEventListener('keydown', () => { keyboardAction = true; });
document.addEventListener('pointerdown', () => { keyboardAction = false; });
function render(focus=true){
  clearTimeout(transitionTimer);
  const current=panel.firstElementChild;
  if (!current || keyboardAction || matchMedia('(prefers-reduced-motion: reduce)').matches) { renderNow(focus); return; }
  current.classList.add('leaving');
  transitionTimer=setTimeout(()=>renderNow(focus),150);
}
function renderNow(focus=true){updateSummary(); let content='';
 if(state.step===0) content=`<h3 tabindex="-1">Choisir une prestation</h3><p>Durées relevées sur Planity, à confirmer avec le salon.</p><div class="choices">${Object.entries(services).map(([key,s])=>`<label class="choice"><input type="radio" name="service" value="${key}" ${state.service===key?'checked':''}><span>${s.name} · ${s.minutes} min</span></label>`).join('')}</div><div class="actions"><button class="btn" data-next>Continuer</button></div>`;
 if(state.step===1) content=`<h3 tabindex="-1">Choisir un jour</h3><p>Horaires du samedi à confirmer. Les jours fermés ne sont pas proposés.</p><div class="choices days">${days.map(d=>{const closed=[0,1].includes(d.getDay()),key=dateKey(d);return `<label class="choice"><input type="radio" name="day" value="${key}" ${closed?'disabled':''} ${state.day===key?'checked':''}><span>${formatDay(d)}${closed?' · fermé':''}</span></label>`}).join('')}</div><div class="actions"><button class="btn secondary" data-back>Retour</button><button class="btn" data-next>Continuer</button></div>`;
 if(state.step===2) content=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour cet essai.</p><div class="choices times">${slots().map(s=>`<label class="choice"><input type="radio" name="time" value="${s.label}" ${s.disabled?'disabled':''} ${state.time===s.label?'checked':''}><span>${s.label}${s.disabled?' · indisponible':''}</span></label>`).join('')}</div><div class="actions"><button class="btn secondary" data-back>Retour</button><button class="btn" data-next>Continuer</button></div>`;
 if(state.step===3) content=`<h3 tabindex="-1">Vos coordonnées</h3><p>Essai uniquement&nbsp;: aucune donnée ne sera envoyée.</p><form id="details" novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required value="${escapeText(state.first)}" aria-describedby="form-error"></label><label class="field">Téléphone<input name="phone" autocomplete="tel" inputmode="tel" required value="${escapeText(state.phone)}" aria-describedby="form-error"></label><p id="form-error" class="error" role="status"></p><p>${services[state.service].name} · ${formatDay(parseDay(state.day))} · ${state.time}</p><div class="actions"><button type="button" class="btn secondary" data-back>Retour</button><button class="btn" type="submit">Confirmer la simulation</button></div></form>`;
 if(state.step===4) content=`<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.first)}, vous avez choisi ${services[state.service].name}, le ${formatDay(parseDay(state.day))} à ${state.time}.</p><p><strong>Rien n’a été envoyé au salon.</strong> Pour prendre rendez-vous, utilisez <a href="https://www.planity.com/coiffure-unanyme-44000-nantes">Planity</a> ou appelez le <a href="tel:+33240690100">02 40 69 01 00</a>.</p><button class="btn secondary" data-reset>Recommencer</button>`;
 panel.innerHTML=`<div class="booking-panel-inner enter">${content}<p class="error" id="choice-error" role="status"></p></div>`;const inner=panel.firstElementChild;requestAnimationFrame(()=>inner.classList.remove('enter'));if(focus) panel.querySelector('h3').focus({preventScroll:true});}
function escapeText(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
panel.addEventListener('change',e=>{if(e.target.name==='service'){state.service=e.target.value;state.day='';state.time='';}if(e.target.name==='day'){state.day=e.target.value;state.time='';}if(e.target.name==='time')state.time=e.target.value;updateSummary();});
panel.addEventListener('click',e=>{if(e.target.closest('[data-next]')){const key=['service','day','time'][state.step];if(!state[key]){document.querySelector('#choice-error').textContent='Veuillez faire un choix pour continuer.';return;}state.step++;render();}if(e.target.closest('[data-back]')){state.step--;render();}if(e.target.closest('[data-reset]')){Object.assign(state,{step:0,service:'',day:'',time:'',first:'',phone:''});render();}});
panel.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.target);state.first=String(data.get('first')).trim();state.phone=String(data.get('phone')).trim();if(!state.first || !/^(?:(?:\+|00)33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(state.phone)){document.querySelector('#form-error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}state.step=4;render();});
document.querySelector('.summary').addEventListener('click',e=>{const button=e.target.closest('[data-goto]');if(button && !button.disabled){state.step=Number(button.dataset.goto);render();}});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.day='';state.time='';state.step=0;render(false);}));
render(false);
