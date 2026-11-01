/* Thibaut Coiffure. Simulation locale : aucune requête, aucun stockage. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const hours = {0:null,1:null,2:[540,1170],3:[540,1200],4:[540,1170],5:[540,1200],6:[540,1200]};
  const services = $$('.service-row').map(el => ({id:el.dataset.service,name:el.dataset.name,duration:Number(el.dataset.duration),price:Number(el.dataset.price)}));
  const state = {step:0,service:null,date:null,time:null};
  let keyboard = false;
  document.addEventListener('keydown', e => {if(e.key === 'Tab' || e.key.startsWith('Arrow')){keyboard=true;document.body.classList.add('keyboard');}});
  document.addEventListener('pointerdown', () => {keyboard=false;document.body.classList.remove('keyboard');});
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
    return {key:`${p.year}-${p.month}-${p.day}`,date:new Date(Date.UTC(+p.year,+p.month-1,+p.day,12)),minutes:+p.hour*60 + +p.minute};
  }
  const dateKey = d => d.toISOString().slice(0,10);
  const parseDay = key => new Date(`${key}T12:00:00Z`);
  const dateText = key => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(parseDay(key));
  const timeText = n => `${Math.floor(n/60)}\u00a0h${n%60 ? '\u00a0'+String(n%60).padStart(2,'0') : ''}`;
  function holiday(key) {
    // Jours fériés nationaux fixes, plus lundi de Pâques / Ascension / Pentecôte.
    if(['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(key.slice(5))) return true;
    const y=+key.slice(0,4),a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
    return [1,39,50].some(offset=>dateKey(new Date(Date.UTC(y,month-1,day+offset,12)))===key);
  }
  function slotsFor(key, duration, now = parisNow()) {
    const range=hours[parseDay(key).getUTCDay()];
    if(!range) return [];
    const seed=Number(key.replaceAll('-',''));
    const list=[];
    for(let t=range[0];t+duration<=range[1];t+=30){
      const past=key<now.key || (key===now.key && t<=now.minutes);
      const busy=(seed+Math.floor(t/30)*7)%6===0;
      list.push({time:t,disabled:past||busy,reason:past?'passé':busy?'déjà pris':''});
    }
    return list;
  }
  function addRadio(parent, name, value, className, html, disabled = false, checked = false) {
    const label=document.createElement('label');label.className=className;
    const input=document.createElement('input');input.type='radio';input.name=name;input.value=value;input.disabled=disabled;input.checked=checked;
    label.append(input);const content=document.createElement('span');content.innerHTML=html;label.append(content);parent.append(label);return label;
  }
  services.forEach(s=>{
    const row=addRadio($('#service-options'),'service',s.id,'service-option',`${s.name}<small>${s.duration}\u00a0min · tarif indicatif</small>`);
    const price=document.createElement('b');price.textContent=`${s.price}\u00a0€`;row.append(price);
  });
  function renderDays() {
    const now=parisNow(),root=$('#day-options');root.replaceChildren();
    for(let i=0;i<14;i++){
      const d=new Date(now.date);d.setUTCDate(d.getUTCDate()+i);const key=dateKey(d),closed=!hours[d.getUTCDay()];
      const elapsed=!closed && state.service && !slotsFor(key,state.service.duration,now).some(x=>!x.disabled);
      const unavailable=closed||elapsed;
      const week=new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'}).format(d);
      const mo=new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'}).format(d);
      const label=addRadio(root,'date',key,'choice',`${week}<br><strong>${d.getUTCDate()}</strong> ${mo}<small>${closed?'fermé':elapsed?'complet':holiday(key)?'férié · à confirmer':'exemple'}</small>`,unavailable,state.date===key);
      $('input',label).setAttribute('aria-label',`${dateText(key)}${closed?', fermé':elapsed?', aucun créneau':holiday(key)?', jour férié, ouverture à confirmer':''}`);
    }
  }
  function renderSlots() {
    const root=$('#slot-options');root.replaceChildren();
    if(!state.date||!state.service) return;
    const slots=slotsFor(state.date,state.service.duration);
    $('#slot-note').textContent=`${dateText(state.date)} · ${state.service.duration}\u00a0min. Créneaux fictifs, horaires barrés indisponibles.${holiday(state.date)?' Jour férié : ouverture à confirmer.':''}`;
    slots.forEach(s=>{
      const label=addRadio(root,'time',s.time,'choice',`${timeText(s.time)}${s.reason?`<small>${s.reason}</small>`:''}`,s.disabled,state.time===s.time);
      $('input',label).setAttribute('aria-label',`${timeText(s.time)}${s.reason?', '+s.reason:''}`);
    });
  }
  function canVisit(step) {return step===0 || (step===1 && !!state.service) || (step===2 && !!state.service && !!state.date) || (step===3 && !!state.service && !!state.date && state.time!==null);}
  function recap() {return state.service&&state.date&&state.time!==null?`${state.service.name} · ${dateText(state.date)} à ${timeText(state.time)} · ${state.service.duration}\u00a0min · ${state.service.price}\u00a0€ (indicatif, à confirmer).${holiday(state.date)?' Jour férié : ouverture à confirmer.':''}`:'';}
  function update() {
    $$('[data-step]').forEach(btn=>{const n=+btn.dataset.step;btn.disabled=!canVisit(n);if(n===state.step)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current');});
    $('#next').disabled=!canVisit(state.step+1);
    $('#next').hidden=state.step===3;$('#confirm').hidden=state.step!==3;$('#previous').hidden=state.step===0;
    const summary={service:state.service?.name||'Une envie à choisir',date:state.date?dateText(state.date):'Un jour à trouver',time:state.time!==null?timeText(state.time):'Une heure à poser',price:state.service?`${state.service.duration}\u00a0min / ${state.service.price}\u00a0€`:'—'};
    $$('[data-summary]').forEach(el=>el.textContent=summary[el.dataset.summary]);
    $('[data-recap]').textContent=recap();
  }
  function showStep(n, focus=true) {
    if(!canVisit(n)) return;
    state.step=n;$('#flow-error').textContent='';
    if(n===1)renderDays();if(n===2)renderSlots();
    $$('[data-panel]').forEach(p=>p.hidden=+p.dataset.panel!==n);
    update();
    const panel=$(`[data-panel="${n}"]`);
    if(!keyboard&&!matchMedia('(prefers-reduced-motion: reduce)').matches){panel.classList.add('entering');requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('entering')));}
    if(focus)$('h3',panel).focus({preventScroll:true});
    $('#booking-live').textContent=`Étape ${n+1} sur 4. ${$('h3',panel).textContent}`;
  }
  $('#booking-form').addEventListener('change',e=>{
    const input=e.target;
    if(input.name==='service') {state.service=services.find(s=>s.id===input.value);state.date=null;state.time=null;}
    if(input.name==='date') {state.date=input.value;state.time=null;}
    if(input.name==='time') state.time=+input.value;
    update();
  });
  $('#next').addEventListener('click',()=>showStep(state.step+1));
  $('#previous').addEventListener('click',()=>showStep(state.step-1));
  $$('[data-step]').forEach(btn=>btn.addEventListener('click',()=>showStep(+btn.dataset.step)));
  $$('[data-book]').forEach(a=>a.addEventListener('click',()=>{
    if(!$('#success').hidden){$('#booking-form').reset();$$('.error').forEach(el=>el.textContent='');$$('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));}
    state.service=services.find(s=>s.id===a.dataset.book);state.date=null;state.time=null;
    const radio=$(`input[name=service][value="${state.service.id}"]`);radio.checked=true;
    $('.booking-layout').hidden=false;$('#success').hidden=true;showStep(1);
  }));
  function validateField(input,error,message,valid) {input.setAttribute('aria-invalid',String(!valid));error.textContent=valid?'':message;return valid;}
  function validName() {return validateField($('#first-name'),$('#name-error'),'Indiquez un prénom (2 caractères minimum).',$('#first-name').value.trim().length>=2);}
  function validPhone() {const raw=$('#phone').value.replace(/[\s().-]/g,'');return validateField($('#phone'),$('#phone-error'),'Indiquez un mobile français commençant par 06, 07 ou +33 6/7.',/^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(raw));}
  $('#first-name').addEventListener('input',()=>{if($('#first-name').hasAttribute('aria-invalid'))validName();});
  $('#phone').addEventListener('input',()=>{if($('#phone').hasAttribute('aria-invalid'))validPhone();});
  $('#booking-form').addEventListener('submit',e=>{
    e.preventDefault();
    if(!canVisit(3))return;
    const nameOk=validName(),phoneOk=validPhone();
    if(!nameOk||!phoneOk){(nameOk?$('#phone'):$('#first-name')).focus();return;}
    const now=parisNow();
    if(!slotsFor(state.date,state.service.duration,now).some(s=>s.time===state.time&&!s.disabled)){
      const expired=state.date<now.key;state.time=null;if(expired)state.date=null;showStep(expired?1:2);$('#flow-error').textContent='Ce créneau est maintenant passé. Choisissez une autre heure ou un autre jour.';return;
    }
    $('#success-recap').textContent=`${$('#first-name').value.trim()}, voici votre exemple : ${recap()}`;
    $('.booking-layout').hidden=true;$('#success').hidden=false;$('#success-title').focus({preventScroll:true});$('#success').scrollIntoView({behavior:keyboard||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    $('#booking-live').textContent='Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.';
  });
  $('#restart').addEventListener('click',()=>{
    $('#booking-form').reset();state.service=null;state.date=null;state.time=null;
    $$('.error').forEach(el=>el.textContent='');$$('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    $('.booking-layout').hidden=false;$('#success').hidden=true;showStep(0);
  });
  function renderStatus() {
    const now=parisNow(),day=now.date.getUTCDay(),range=hours[day];
    const today=holiday(now.key);
    const text=today?'Jour férié · ouverture à confirmer par téléphone':!range?'Aujourd’hui : fermé · retrouvez les horaires plus bas':now.minutes<range[0]?`Aujourd’hui : ouverture à ${timeText(range[0])}`:now.minutes<range[1]?`Ouvert selon Planity · jusqu’à ${timeText(range[1])} · à confirmer`:`Aujourd’hui : fermé depuis ${timeText(range[1])}`;
    $$('[data-status]').forEach(el=>el.textContent=text);
    $$('[data-weekday]').forEach(row=>{const active=+row.dataset.weekday===day;row.classList.toggle('today',active);const marker=$('.today-label',row);if(marker)marker.remove();if(active){const label=document.createElement('span');label.className='today-label';label.textContent=' · aujourd’hui';$('th',row).append(label);}});
  }
  update();renderStatus();setInterval(renderStatus,60000);
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.classList.add('motion-ready');
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');observer.unobserve(e.target);}}),{threshold:.08});
    $$('.hero-art,.service-row').forEach((el,i)=>{if(el.matches('.service-row'))el.style.transitionDelay=`${i%3*50}ms`;observer.observe(el);});
  }
})();
