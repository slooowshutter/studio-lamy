/* Addict & Cie. Démonstration locale : aucune donnée n’est transmise. */
'use strict';
const BookingRules = (() => {
  const hours = [null, null, [540,1110], [540,1110], [540,1110], [540,1140], [540,1020]];
  function parisNow(date = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(date).map(v => [v.type,v.value]));
    return { date:`${p.year}-${p.month}-${p.day}`, minutes:Number(p.hour)*60+Number(p.minute) };
  }
  const dateObject = key => new Date(`${key}T12:00:00Z`);
  const addDays = (key, n) => { const d=dateObject(key); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
  function holiday(key) {
    const y=Number(key.slice(0,4)), md=key.slice(5);
    if(['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(md)) return true;
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;
    const easter=`${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`;
    return [1,39,50].some(n=>addDays(easter,n)===key);
  }
  function slots(key, duration, now = parisNow()) {
    const range=hours[dateObject(key).getUTCDay()];
    if(!range || holiday(key) || !Number.isFinite(duration) || duration<=0) return [];
    const seed=Number(key.replaceAll('-',''));
    const result=[];
    for(let t=range[0];t+duration<=range[1];t+=30) {
      const past=key<now.date || (key===now.date && t<=now.minutes);
      const taken=(Math.floor(t/30)+seed)%7===0 || (Math.floor(t/30)+seed)%11===0;
      result.push({ time:t, disabled:past||taken, reason:past?'Passé':taken?'Déjà pris':'Libre' });
    }
    return result;
  }
  function days(duration, now = parisNow()) {
    return Array.from({length:14},(_,i)=>{
      const key=addDays(now.date,i),closed=!hours[dateObject(key).getUTCDay()],festive=holiday(key);
      const available=slots(key,duration,now).some(s=>!s.disabled);
      return { key, disabled:closed||festive||!available, reason:closed?'Fermé':festive?'Férié · à confirmer':!available?'Complet':'Disponible' };
    });
  }
  const timeLabel=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
  const mobileOK=value=> /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(value.replace(/[\s.()-]/g,''));
  return { hours,parisNow,dateObject,addDays,holiday,slots,days,timeLabel,mobileOK };
})();
if(typeof module!=='undefined' && module.exports) module.exports=BookingRules;
if(typeof document!=='undefined') (()=>{
  const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard=false;
  document.addEventListener('keydown',()=>{ keyboard=true; document.documentElement.classList.add('keyboard'); });
  document.addEventListener('pointerdown',()=>{ keyboard=false; document.documentElement.classList.remove('keyboard'); },{passive:true});
  document.documentElement.classList.add('js');
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}
    }),{threshold:.05});
    document.documentElement.classList.add('js');
    $$('.test-stage,.service-row').forEach((el,i)=>{
      if(el.classList.contains('service-row')) el.style.transitionDelay=`${(i%3)*50}ms`;
      observer.observe(el);
    });
  }
  const services=$$('[data-service]').map(el=>({id:el.dataset.service,name:el.dataset.name,duration:Number(el.dataset.duration),price:Number(el.dataset.price),prefix:el.dataset.prefix}));
  const state={step:0,service:null,day:null,time:null,finished:false};
  const form=$('#booking-form'),next=$('#next-button'),back=$('#back-button'),live=$('#booking-live');
  const fullDay=key=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Paris'}).format(BookingRules.dateObject(key));
  const shortDay=key=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'Europe/Paris'}).format(BookingRules.dateObject(key));
  const shortMonth=key=>new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'Europe/Paris'}).format(BookingRules.dateObject(key));
  const price=s=>`${s.prefix?s.prefix+' ':''}${s.price}\u00a0€`;
  const duration=s=>s.duration<60?`${s.duration}\u00a0min`:`${Math.floor(s.duration/60)}\u00a0h${s.duration%60?'\u00a0'+s.duration%60:''}`;
  const announce=text=>{live.textContent=text;};
  function radio(name,value,disabled=false) {
    const input=document.createElement('input');input.type='radio';input.name=name;input.value=value;input.disabled=disabled;return input;
  }
  function span(text,className='') {const el=document.createElement('span');el.textContent=text;el.className=className;return el;}
  services.forEach(s=>{
    const label=document.createElement('label');label.className='radio-row';
    label.append(radio('service',s.id),span(s.name,'option-name'),span(`${duration(s)} · ${price(s)}`,'option-meta'));$('#service-options').append(label);
  });
  function summary() {
    $$('.step-nav button').forEach((button,i)=>{button.disabled=!reachable(i);button.removeAttribute('aria-current');if(i===state.step)button.setAttribute('aria-current','step');});
    $('#summary-service').textContent=state.service?`${state.service.name} · ${duration(state.service)}`:'À choisir';
    $('#summary-day').textContent=state.day?fullDay(state.day):'À choisir';
    $('#summary-time').textContent=state.time!==null?BookingRules.timeLabel(state.time):'À choisir';
    $('#summary-price').textContent=state.service?price(state.service):'—';
    $('#mobile-selection').textContent=state.service?`Démo · ${state.service.name} · ${price(state.service)}${state.day?' · '+fullDay(state.day):''}${state.time!==null?' · '+BookingRules.timeLabel(state.time):''}`:'Votre sélection · à choisir';
    if(state.service&&state.day&&state.time!==null) $('#confirmation-recap').textContent=recap();
  }
  function recap(){return `${state.service.name} · ${duration(state.service)} · ${fullDay(state.day)} à ${BookingRules.timeLabel(state.time)} · ${price(state.service)}, tarif indicatif.`;}
  function drawDays() {
    const field=$('#day-options');field.replaceChildren();
    const legend=document.createElement('legend');legend.className='sr-only';legend.textContent='Choisir un jour';field.append(legend);
    BookingRules.days(state.service.duration).forEach(d=>{
      const label=document.createElement('label');label.className='day-option';
      const input=radio('day',d.key,d.disabled);input.checked=d.key===state.day;input.setAttribute('aria-label',`${fullDay(d.key)}, ${d.reason}`);
      const number=document.createElement('strong');number.textContent=Number(d.key.slice(8));
      const small=document.createElement('small');small.textContent=d.disabled?d.reason:shortMonth(d.key);
      label.append(input,span(shortDay(d.key)),number,small);field.append(label);
    });
  }
  function drawSlots() {
    const field=$('#slot-options');field.replaceChildren();
    const legend=document.createElement('legend');legend.className='sr-only';legend.textContent='Choisir une heure';field.append(legend);
    const slots=BookingRules.slots(state.day,state.service.duration);
    slots.forEach(s=>{
      const label=document.createElement('label');label.className='slot-option';
      const input=radio('time',String(s.time),s.disabled);input.checked=s.time===state.time;input.setAttribute('aria-label',`${BookingRules.timeLabel(s.time)}, ${s.reason}, simulation`);
      label.append(input,span(BookingRules.timeLabel(s.time)));
      if(s.disabled){const small=document.createElement('small');small.textContent=s.reason;label.append(small);}
      field.append(label);
    });
    const count=slots.filter(s=>!s.disabled).length;
    $('#slot-note').textContent=`${fullDay(state.day)} · ${count} créneaux fictifs. Aucun accès à l’agenda réel du salon.`;
    if(!count){field.append(span('Aucun créneau proposé. Revenez au choix du jour.'));}
  }
  function reachable(step) {return step===0 || step===1&&!!state.service || step===2&&!!state.day || step===3&&state.time!==null;}
  function showStep(step,focus=true) {
    if(!reachable(step))return;
    state.step=step;
    if(step===1)drawDays();if(step===2)drawSlots();
    $$('.step-panel').forEach((panel,i)=>{panel.hidden=i!==step;panel.classList.remove('entering');});
    const panel=$(`[data-panel="${step}"]`);
    if(!reduced.matches&&!keyboard){panel.classList.add('entering');requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('entering')));}

    next.textContent=['Choisir le jour →','Choisir l’heure →','Continuer →','Terminer la simulation →'][step];back.hidden=step===0;
    $('#flow-error').textContent='';summary();
    announce(`Étape ${step+1} sur 4 : ${panel.querySelector('h3').textContent}`);
    if(focus)panel.querySelector('h3').focus();
  }
  function resetFinished() {
    if(!state.finished)return;
    state.finished=false;$('#booking-success').hidden=true;form.hidden=false;$('.selection').hidden=false;
  }
  function setService(id) {
    const service=services.find(s=>s.id===id);if(!service)return;
    resetFinished();state.service=service;state.day=null;state.time=null;
    $$('input[name="service"]').forEach(input=>{input.checked=input.value===id;});summary();
  }
  function error(text){$('#flow-error').textContent=text;announce(text);}
  form.addEventListener('change',event=>{
    const input=event.target;if(input.name==='service'){setService(input.value);showStep(0,false);}
    if(input.name==='day'){state.day=input.value;state.time=null;summary();}
    if(input.name==='time'){state.time=Number(input.value);summary();}
  });
  $$('[data-preset]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();setService(button.dataset.preset);showStep(1);
  }));
  $$('.step-nav button').forEach(button=>button.addEventListener('click',()=>showStep(Number(button.dataset.step))));
  back.addEventListener('click',()=>showStep(Math.max(0,state.step-1)));
  function selectedSlotValid(){return state.day&&state.service&&BookingRules.slots(state.day,state.service.duration).some(s=>s.time===state.time&&!s.disabled);}
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(state.step===0){if(!state.service){error('Choisissez une prestation pour continuer.');return;}showStep(1);return;}
    if(state.step===1){
      if(!state.day||!BookingRules.days(state.service.duration).some(d=>d.key===state.day&&!d.disabled)){state.day=null;state.time=null;drawDays();summary();error('Choisissez un jour proposé pour continuer.');return;}
      showStep(2);return;
    }
    if(!selectedSlotValid()){state.time=null;showStep(2);error('Choisissez un créneau proposé. Les heures passées ne sont plus disponibles.');return;}
    if(state.step===2){showStep(3);return;}
    const name=$('#first-name'),phone=$('#phone');
    const nameValid=name.value.trim().length>=2,phoneValid=BookingRules.mobileOK(phone.value);
    $('#name-error').textContent=nameValid?'':'Indiquez un prénom d’au moins deux caractères.';
    $('#phone-error').textContent=phoneValid?'':'Indiquez un mobile français, par exemple 06 00 00 00 00.';
    name.setAttribute('aria-invalid',String(!nameValid));phone.setAttribute('aria-invalid',String(!phoneValid));
    if(!nameValid||!phoneValid){(nameValid?phone:name).focus();announce('Vérifiez les coordonnées indiquées.');return;}
    state.finished=true;
    $('#success-recap').textContent=`${name.value.trim()}, voici votre essai : ${recap()}`;
    form.hidden=true;$('.selection').hidden=true;$('#booking-success').hidden=false;
    $('#success-title').focus();name.value='';phone.value='';
  });
  $('#restart').addEventListener('click',()=>{
    resetFinished();state.service=null;state.day=null;state.time=null;form.reset();
    $$('.field-error').forEach(el=>{el.textContent='';});$$('.field input').forEach(el=>el.removeAttribute('aria-invalid'));$('#success-recap').textContent='';showStep(0);
  });
  $('#booking-app').hidden=false;$('.booking-fallback').hidden=true;showStep(0,false);
})();
