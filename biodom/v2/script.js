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
  document.querySelector('#sum-day').textContent=state.day ? dayFormat.format(state.day) : 'Par téléphone';
  document.querySelector('#sum-time').textContent=state.time || 'Par téléphone';
  document.querySelector('#sum-price').textContent=state.service ? euro(state.service.price) : '—';
}
function render(focus=true){
  summary(); document.querySelectorAll('[data-goto]').forEach(button=>{const n=Number(button.dataset.goto); button.disabled=n>state.step || state.step===4; button.setAttribute('aria-current',n===state.step?'step':'false')}); stepNumber.textContent=state.step<4?`${String(state.step+1).padStart(2,'0')} / 02`:'TERMINÉ';
  let html='';
  if(state.step===0){html=`<h3 class="step-heading" tabindex="-1">Votre prestation</h3><p class="step-note">Tarifs relevés sur Treatwell, à confirmer avec Biodom Bien-Être.</p><div class="options">${services.map(s=>`<label class="option"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span class="option-main">${s.name}<small>${s.duration} min</small></span><strong>${euro(s.price)}</strong></label>`).join('')}</div><div class="booking-actions"><button type="button" data-next>Continuer →</button></div><p class="error" id="step-error" role="status"></p>`}
  if(state.step===1){html=`<h3 class="step-heading" tabindex="-1">Votre sélection</h3><p>Simulation : ${state.service.name}. Aucun rendez-vous n’a été pris.</p><p class="step-note">Pour connaître les disponibilités, appelez le salon au 06 70 87 79 87.</p><div class="booking-actions"><button class="back" type="button" data-back>← Prestation</button><a class="button light" href="tel:+33670877987">Appeler le salon ↗</a></div>`}
  content.innerHTML=html; content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
  if(focus) content.querySelector('.step-heading')?.focus({preventScroll:true});
}
content.addEventListener('change',e=>{if(e.target.name==='service'){state.service=services.find(s=>s.id===e.target.value);state.time=null;summary()}});
content.addEventListener('click',e=>{
  const button=e.target.closest('button'); if(!button)return;
  if(button.hasAttribute('data-back')){state.step--;render();return}
  if(button.hasAttribute('data-restart')){Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});render();return}
  if(button.hasAttribute('data-next')){if((state.step===0&&!state.service)||(state.step===1&&!state.day)||(state.step===2&&!state.time)){content.querySelector('#step-error').textContent='Choisissez une option pour continuer.';return}state.step++;render()}
});
document.querySelector('.booking-progress').addEventListener('click',e=>{const button=e.target.closest('[data-goto]');if(!button||button.disabled)return;state.step=Number(button.dataset.goto);render()});
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=services.find(s=>s.id===link.dataset.service);state.step=0;state.time=null;render(false)}));
document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});document.querySelectorAll('.service-row').forEach(row=>row.hidden=button.dataset.filter!=='all'&&row.dataset.category!==button.dataset.filter)}));
render(false);
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=`${Math.min(i%4,3)*60}ms`;observer.observe(el)})}else{document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'))}

const motionOK=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(motionOK && 'IntersectionObserver' in window){const number=document.querySelector('.count');const counter=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;counter.unobserve(number);const start=performance.now();function tick(now){const p=Math.min((now-start)/600,1);number.textContent=Math.round(40*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}),{threshold:.5});counter.observe(number)}
if('IntersectionObserver' in window){const bar=document.querySelector('.mobile-bar');const overlaps=new Set();const hideBar=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?overlaps.add(entry.target):overlaps.delete(entry.target));bar.classList.toggle('is-hidden',overlaps.size>0)},{threshold:0});[document.querySelector('#reserver'),document.querySelector('footer')].forEach(el=>hideBar.observe(el))}
