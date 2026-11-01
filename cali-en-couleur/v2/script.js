const services = [
  {id:'paraffine', name:'Bain de paraffine', minutes:20, price:19},
  {id:'depose', name:'Dépose + semi-permanent', minutes:45, price:33},
  {id:'manucure', name:'Dépose + manucure + semi-permanent', minutes:60, price:43},
  {id:'gel', name:'Capsules gel + vernis couleur', minutes:90, price:65},
  {id:'french', name:'Capsules gel + vernis french', minutes:100, price:70}
];
const state={step:0,service:null,day:null,time:null,first:'',phone:''};
const content=document.querySelector('#booking-content');
const summary=document.querySelector('#summary-text');
const stepButtons=[...document.querySelectorAll('[data-step]')];
const fmtDate=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
const fmtShort=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d);
const euro=n=>`${n} €`;
function dayKey(d){return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function refreshSummary(){summary.textContent=state.service ? [state.service.name,`${state.service.minutes} min`,euro(state.service.price),state.day?fmtDate(state.day):null,state.time,state.step===4?state.first:null].filter(Boolean).join(' · ') : 'Aucune prestation choisie.'}
let stepTimer;
function setStep(n){
 clearTimeout(stepTimer);
 const old=content.querySelector('.booking-body');
 const show=()=>{state.step=n;render();document.querySelector('#booking-heading')?.focus()};
 if(!old||matchMedia('(prefers-reduced-motion: reduce)').matches){show();return}
 old.classList.add('leaving');
 stepTimer=setTimeout(show,160);
}
function render(){
 stepButtons.forEach((b,i)=>{b.disabled=i>0&&(!state.service||(i>1&&!state.day)||(i>2&&!state.time));b.classList.toggle('current',i===state.step);b.setAttribute('aria-current',i===state.step?'step':'false')});
 refreshSummary();
 let html='<div class="booking-body">';
 if(state.step===0){html+='<h3 id="booking-heading" tabindex="-1">Votre prestation</h3><p>Prix publiés sur Planity, à confirmer auprès du salon.</p><div class="choices">'+services.map(s=>`<label class="choice"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}<br><small>${s.minutes} min</small></span><strong>${euro(s.price)}</strong></label>`).join('')+'</div><div class="booking-actions"><button class="next" type="button" data-next>Choisir un jour →</button></div>'}
 if(state.step===1){let days='';for(let i=0;i<14;i++){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);let closed=d.getDay()===0;days+=`<button type="button" data-day="${i}" ${closed?'disabled':''} class="${state.day&&dayKey(d)===dayKey(state.day)?'selected':''}">${fmtShort(d)}${closed?'<small>Fermé</small>':''}</button>`}html+=`<h3 id="booking-heading" tabindex="-1">Quel jour&nbsp;?</h3><p>Du lundi au samedi · horaires à confirmer.</p><div class="days">${days}</div><div class="booking-actions"><button type="button" data-back>← Retour</button><button class="next" type="button" data-next>Choisir une heure →</button></div>`}
 if(state.step===2){let slots='';const now=new Date();for(let m=660;m+state.service.minutes<=1110;m+=30){const h=Math.floor(m/60),min=m%60;const label=`${String(h).padStart(2,'0')} h ${String(min).padStart(2,'0')}`;let past=dayKey(now)===dayKey(state.day)&&(h*60+min<=now.getHours()*60+now.getMinutes());let taken=(m/30+state.day.getDate())%5===0;slots+=`<button type="button" data-time="${label}" ${past||taken?'disabled':''} class="${state.time===label?'selected':''}" aria-label="${label}${past?' passé':taken?' déjà pris':''}">${label}${taken&&!past?' <small>pris</small>':''}</button>`}html+=`<h3 id="booking-heading" tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux fictifs pour le ${fmtDate(state.day)}.</p><div class="slots">${slots}</div><div class="booking-actions"><button type="button" data-back>← Retour</button><button class="next" type="button" data-next>Vos coordonnées →</button></div>`}
 if(state.step===3){html+=`<h3 id="booking-heading" tabindex="-1">Vos coordonnées</h3><p>Simulation uniquement&nbsp;: aucune donnée ne sera envoyée.</p><form id="booking-form" novalidate><label class="form-field">Prénom<input name="first" autocomplete="given-name" required value="${escapeHtml(state.first)}" aria-describedby="first-error"><span class="error" id="first-error"></span></label><label class="form-field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required value="${escapeHtml(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><div class="booking-actions"><button type="button" data-back>← Retour</button><button class="next" type="submit">Confirmer la simulation →</button></div></form>`}
 if(state.step===4){html+=`<h3 id="booking-heading" tabindex="-1">Simulation terminée.</h3><p>Votre choix est récapitulé ci-dessous. Rien n’a été envoyé au salon&nbsp;: appelez-le pour prendre rendez-vous.</p><a class="button dark" href="tel:+33145051854">Appeler le salon ↗</a><div class="booking-actions"><button type="button" data-reset>Recommencer</button></div>`}
 html+='</div>';content.innerHTML=html;
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
content.addEventListener('change',e=>{if(e.target.name==='service'){state.service=services.find(s=>s.id===e.target.value);state.day=null;state.time=null;refreshSummary()}});
content.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.day!==undefined){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+Number(b.dataset.day));state.day=d;state.time=null;render();content.querySelector(`[data-day="${b.dataset.day}"]`)?.focus()}else if(b.dataset.time){state.time=b.dataset.time;render();[...content.querySelectorAll('[data-time]')].find(x=>x.dataset.time===state.time)?.focus()}else if(b.hasAttribute('data-back'))setStep(state.step-1);else if(b.hasAttribute('data-next')){if(state.step===0&&!state.service||state.step===1&&!state.day||state.step===2&&!state.time){let old=content.querySelector('.selection-error');if(!old){old=document.createElement('p');old.className='error selection-error';b.parentElement.before(old)}old.textContent='Veuillez faire votre choix pour continuer.';return}setStep(state.step+1)}else if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});setStep(0)}});
content.addEventListener('submit',e=>{e.preventDefault();const form=e.target;state.first=form.elements.first.value.trim();state.phone=form.elements.phone.value.trim();const validName=state.first.length>0;const validPhone=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);form.querySelector('#first-error').textContent=validName?'':'Indiquez votre prénom.';form.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';if(validName&&validPhone)setStep(4);else form.querySelector(validName?'[name="phone"]':'[name="first"]').focus()});
stepButtons.forEach(b=>b.addEventListener('click',()=>setStep(Number(b.dataset.step))));
document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{state.service=services.find(s=>s.id===a.dataset.service);state.day=null;state.time=null;setStep(0)}));
document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',x===b)});document.querySelectorAll('#liste-tarifs article').forEach(row=>row.hidden=b.dataset.filter!=='tout'&&row.dataset.category!==b.dataset.filter)}));
render();
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js');const observer=new IntersectionObserver(entries=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${i*60}ms`;observer.observe(el)})}

