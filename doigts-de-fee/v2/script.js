const root = document.documentElement;
root.classList.add('js');
requestAnimationFrame(() => root.classList.add('ready'));
const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), {threshold: .1});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
const steps = [...document.querySelectorAll('.step')];
const progress = [...document.querySelectorAll('[data-goto]')];
const summary = document.querySelector('#summary');
const state = {service:'', day:null, time:'', max:0};
const formatDay = d => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(d);
function updateProgress(){ progress.forEach((el,i) => { el.disabled = i > state.max; }); }
function updateSummary(){ summary.textContent = [state.service, state.day && formatDay(state.day), state.time].filter(Boolean).join(' · ') || 'À composer'; }
function showStep(n){
  steps.forEach((el,i) => { el.hidden = i !== n; });
  progress.forEach((el,i) => { el.disabled = i > state.max; if(i === n) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); });
  const active = steps[n]; active.classList.add('entering'); requestAnimationFrame(() => requestAnimationFrame(() => active.classList.remove('entering')));
  active.querySelector('h3').focus(); updateSummary();
}
function makeDays(){
  const box = document.querySelector('#days'); box.replaceChildren();
  for(let i=0;i<14;i++){
    const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i);
    const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
    input.type='radio'; input.name='day'; input.value=d.toISOString(); input.disabled=d.getDay()===0;
    span.textContent = formatDay(d) + (input.disabled ? ' · fermé' : '');
    if(state.day && d.toDateString()===state.day.toDateString()) input.checked=true;
    input.addEventListener('change',()=>{state.day=d;state.time='';state.max=Math.min(state.max,2);updateProgress();document.querySelector('#day-error').textContent='';updateSummary();});
    label.append(input,span);box.append(label);
  }
}
function makeTimes(){
  const box=document.querySelector('#times'); box.replaceChildren();
  const hours={1:[14,0],2:[11,0],3:[10,30],4:[10,30],5:[10,30],6:[11,0]};
  const start=hours[state.day.getDay()]; if(!start)return;
  let available=0;
  for(let minutes=start[0]*60+start[1];minutes<18*60+30;minutes+=30){
    const hh=String(Math.floor(minutes/60)).padStart(2,'0'), mm=String(minutes%60).padStart(2,'0');
    const date=new Date(state.day);date.setHours(Math.floor(minutes/60),minutes%60,0,0);
    const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
    input.type='radio';input.name='time';input.value=hh+' h '+mm;input.disabled=date<=new Date();if(!input.disabled) available++;input.checked=state.time===input.value;
    span.textContent=input.value+(input.disabled?' · passé':'');
    input.addEventListener('change',()=>{state.time=input.value;document.querySelector('#time-error').textContent='';updateSummary();});label.append(input,span);box.append(label);
  }
  if(!available){const message=document.createElement('p');message.textContent='Les heures proposées pour ce jour sont passées. Choisissez un autre jour.';box.append(message);}
}
document.querySelectorAll('input[name="service"]').forEach(input => input.addEventListener('change',()=>{state.service=input.value;document.querySelector('#service-error').textContent='';updateSummary();}));
document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;document.querySelectorAll('input[name="service"]').forEach(i=>i.checked=i.value===state.service);showStep(0);}));
document.querySelectorAll('[data-next]').forEach(btn=>btn.addEventListener('click',()=>{const n=Number(btn.dataset.next);if(n===0&&!state.service){document.querySelector('#service-error').textContent='Choisissez une prestation.';return}if(n===1&&!state.day){document.querySelector('#day-error').textContent='Choisissez un jour.';return}if(n===2&&!state.time){document.querySelector('#time-error').textContent='Choisissez une heure.';return}if(n===0)makeDays();if(n===1)makeTimes();state.max=Math.max(state.max,n+1);showStep(n+1);}));
document.querySelectorAll('[data-back]').forEach(btn=>btn.addEventListener('click',()=>showStep(Number(btn.dataset.back))));
progress.forEach(btn=>btn.addEventListener('click',()=>{const n=Number(btn.dataset.goto);if(n===1)makeDays();if(n===2&&state.day)makeTimes();showStep(n);}));
document.querySelector('#confirm').addEventListener('click',()=>{if(!state.service||!state.day||!state.time){state.max=state.day?2:state.service?1:0;showStep(state.max);return}const name=document.querySelector('#first-name'),phone=document.querySelector('#phone');const digits=phone.value.replace(/[\s.()-]/g,'');document.querySelector('#name-error').textContent=name.value.trim()?'':'Indiquez votre prénom.';document.querySelector('#phone-error').textContent=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)?'':'Indiquez un numéro de téléphone français valide.';if(!name.value.trim()){name.focus();return}if(!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){phone.focus();return}document.querySelector('#result').textContent=name.value.trim()+' : '+state.service+', '+formatDay(state.day)+' à '+state.time+'.';showStep(4);});
document.querySelector('#restart').addEventListener('click',()=>{state.service='';state.day=null;state.time='';state.max=0;document.querySelectorAll('input').forEach(i=>{if(i.type==='radio')i.checked=false;else i.value=''});showStep(0);});
updateSummary();
