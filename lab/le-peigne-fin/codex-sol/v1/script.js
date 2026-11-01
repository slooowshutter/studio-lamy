/* Moteur local de démonstration. Aucun réseau, stockage ou envoi de formulaire. */
(() => {
  'use strict';
  const HOURS = [null,[600,1080],[540,1140],[540,1140],[570,1140],[540,1140],[540,1050]];
  const SERVICES = {coupe:{name:'Coupe homme',duration:30,price:25},barbe:{name:'Taille de barbe',duration:20,price:15},duo:{name:'Coupe + barbe',duration:50,price:35}};
  const parisFormatter = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(now).map(x=>[x.type,x.value]));
    return {key:`${p.year}-${p.month}-${p.day}`,minutes:Number(p.hour)*60+Number(p.minute)};
  }
  const utcDate = key => new Date(key+'T12:00:00Z');
  const hfr = n => `${Math.floor(n/60)}\u00a0h${n%60?'\u00a0'+String(n%60).padStart(2,'0'):''}`;
  const dayFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});
  const dayShort = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'short'});
  const monthShort = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',month:'short'});
  function nextDays(now = new Date()) {
    const first=utcDate(parisNow(now).key);
    return Array.from({length:14},(_,i)=>{
      const date=new Date(first.getTime()+i*86400000);
      return {key:date.toISOString().slice(0,10),date,closed:!HOURS[date.getUTCDay()]};
    });
  }
  function holiday(key) {
    // Indication prudente, sans promesse d’ouverture. Toute exception reste à valider.
    const year=Number(key.slice(0,4)),md=key.slice(5);
    if(['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25','12-26'].includes(md))return true;
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
    const easter=Date.UTC(year,month-1,day,12);
    return [-2,1,39,50].some(offset=>new Date(easter+offset*86400000).toISOString().slice(0,10)===key);
  }
  function slotsFor(key,serviceId,now = new Date()) {
    const service=SERVICES[serviceId],date=utcDate(key),hours=HOURS[date.getUTCDay()],today=parisNow(now);
    if(!service||!hours||key<today.key)return [];
    const seed=Number(key.replaceAll('-',''));
    const result=[];
    for(let minute=hours[0],n=0;minute+service.duration<=hours[1];minute+=30,n++){
      const past=key===today.key&&minute<=today.minutes;
      const busy=(seed+n*3)%7===0;
      result.push({minute,disabled:past||busy,reason:past?'Passé':busy?'Déjà pris':''});
    }
    return result;
  }
  function validMobile(value) {
    const phone=value.replace(/[\s.()\-]/g,'');
    return /^(?:0|\+33|0033)[67]\d{8}$/.test(phone);
  }
  const engine={HOURS,SERVICES,parisNow,nextDays,slotsFor,validMobile,holiday,hfr};
  if(typeof module!=='undefined'&&module.exports)module.exports=engine;
  if(typeof document==='undefined')return;

  const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>Array.from(c.querySelectorAll(s));
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard=false;
  document.addEventListener('keydown',()=>{keyboard=true;document.documentElement.classList.add('keyboard')},{capture:true});
  document.addEventListener('pointerdown',()=>{keyboard=false;document.documentElement.classList.remove('keyboard')},{capture:true,passive:true});
  document.documentElement.classList.add('js');
  const comb=$('.comb-object');
  if(comb&&!reduce.matches){comb.classList.add('is-starting');requestAnimationFrame(()=>requestAnimationFrame(()=>comb.classList.remove('is-starting')));}
  if('IntersectionObserver'in window&&!reduce.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.1});
    $$('[data-reveal]').forEach((el,i)=>{el.classList.add('will-reveal');el.style.transitionDelay=`${i%3*60}ms`;observer.observe(el)});
  }
  $$('details').forEach(el=>el.addEventListener('keydown',event=>{if(event.key==='Escape'&&el.open){el.open=false;$('summary',el).focus()}}));
  const todayRow=$(`[data-dow="${utcDate(parisNow().key).getUTCDay()}"]`);
  if(todayRow){todayRow.classList.add('is-today');$('th',todayRow).insertAdjacentHTML('beforeend','<span class="sr-only">, aujourd’hui</span>')}

  const state={step:0,service:null,day:null,time:null,done:false};
  const ui=$('#booking-ui'),form=$('#booking-form'),panels=$$('[data-panel]'),status=$('#booking-status');
  if(!ui||!form)return;
  ui.hidden=false;
  const announce=text=>{status.textContent=text};
  const selected=()=>SERVICES[state.service];
  const canAccess=step=>step===0||Boolean(state.service&&(step===1||state.day&&(step===2||state.time!==null)));
  function summary(){
    $('#summary-service').textContent=state.service?`${selected().name} · ${selected().duration}\u00a0min`:'À choisir';
    $('#summary-day').textContent=state.day?dayFormat.format(utcDate(state.day)):'À choisir';
    $('#summary-time').textContent=state.time!==null?hfr(state.time):'À choisir';
    $('#summary-price').textContent=state.service?`${selected().price}\u00a0€`:'—';
    $('#mobile-summary-service').textContent=state.service?`${selected().name} · ${selected().price}\u00a0€ indicatifs`:'Prestation à choisir';
    $('#mobile-summary-when').textContent=(state.day?dayFormat.format(utcDate(state.day)):'Jour à choisir')+' · '+(state.time!==null?hfr(state.time):'heure à choisir');
    $$('[data-step]').forEach(button=>{
      const step=Number(button.dataset.step);button.disabled=!canAccess(step)||state.done;
      if(step===state.step&&!state.done)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    $$('[data-edit]').forEach(button=>{button.disabled=!canAccess(Number(button.dataset.edit))||state.done});
  }
  function renderDays(){
    $('#days').replaceChildren();
    nextDays().forEach((day,index)=>{
      const label=document.createElement('label');label.className='choice day-choice';
      const input=document.createElement('input');input.type='radio';input.name='day';input.value=day.key;input.disabled=day.closed;input.checked=state.day===day.key;
      const special=holiday(day.key);input.setAttribute('aria-label',`${dayFormat.format(day.date)}${day.closed?', fermé':special?', ouverture à confirmer':''}`);
      const face=document.createElement('span');
      const week=document.createElement('span');week.textContent=dayShort.format(day.date);
      const num=document.createElement('b');num.textContent=day.date.getUTCDate();
      const month=document.createElement('span');month.textContent=monthShort.format(day.date);
      const note=document.createElement('small');note.textContent=day.closed?'Fermé':special?'À confirmer':index===0?'Aujourd’hui':index===1?'Demain':'';
      face.append(week,num,month,note);label.append(input,face);$('#days').append(label);
    });
  }
  function renderSlots(){
    const container=$('#slots');container.replaceChildren();
    const slots=slotsFor(state.day,state.service);
    slots.forEach(slot=>{
      const label=document.createElement('label');label.className='choice slot-choice';
      const input=document.createElement('input');input.type='radio';input.name='time';input.value=slot.minute;input.disabled=slot.disabled;input.checked=state.time===slot.minute;
      input.setAttribute('aria-label',hfr(slot.minute)+(slot.reason?', '+slot.reason:''));
      const face=document.createElement('span'),time=document.createElement('b'),reason=document.createElement('small');
      time.textContent=hfr(slot.minute);reason.textContent=slot.reason||'Libre';face.append(time,reason);label.append(input,face);container.append(label);
    });
    const available=slots.filter(x=>!x.disabled).length;
    if(!available){const p=document.createElement('p');p.textContent='Aucun créneau disponible ce jour dans la simulation. Choisissez un autre jour.';p.className='field-note';container.append(p)}
    $('#slot-note').textContent=`${dayFormat.format(utcDate(state.day))} · ${available} créneau${available>1?'x':''} fictif${available>1?'s':''} libre${available>1?'s':''}. Heure de Strasbourg. Horaires et jours fériés à confirmer.`;
  }
  function go(step,focus=true){
    if(state.done||!canAccess(step))return;
    state.step=step;
    if(step===1)renderDays();
    if(step===2)renderSlots();
    panels.forEach((panel,i)=>{panel.hidden=i!==step;panel.classList.remove('is-entering')});
    const panel=panels[step];
    if(!reduce.matches&&!keyboard){panel.classList.add('is-entering');requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('is-entering')))}
    $('#back').hidden=step===0;$('#continue').textContent=step===3?'Terminer la simulation':'Continuer →';
    $('#step-error').textContent='';summary();
    if(focus)$('h3',panel).focus({preventScroll:false});
    announce(`Étape ${step+1} sur 4. ${$('h3',panel).textContent}`);
  }
  function chooseService(id){
    if(!SERVICES[id])return;
    state.service=id;state.day=null;state.time=null;
    $$('input[name="service"]').forEach(input=>input.checked=input.value===id);summary();
  }
  form.addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='service')chooseService(input.value);
    if(input.name==='day'){state.day=input.value;state.time=null}
    if(input.name==='time')state.time=Number(input.value);
    $('#step-error').textContent='';summary();
  });
  $$('[data-step],[data-edit]').forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.step??button.dataset.edit))));
  $('#back').addEventListener('click',()=>go(state.step-1));
  $$('[data-service]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();
    if(state.done)reset(false);
    chooseService(link.dataset.service);go(1,false);$('#reserver').scrollIntoView({behavior:reduce.matches||keyboard?'instant':'smooth',block:'start'});$('#step-title-1').focus({preventScroll:true});
  }));
  function fail(text,selector){$('#step-error').textContent=text;announce(text);$(selector).focus()}
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(state.step===0){if(!state.service)return fail('Choisissez une prestation pour continuer.','input[name="service"]');return go(1)}
    if(state.step===1){if(!state.day)return fail('Choisissez un jour ouvert pour continuer.','input[name="day"]:not(:disabled)');return go(2)}
    if(state.step===2){if(state.time===null)return fail('Choisissez un créneau libre pour continuer.','#step-title-2');return go(3)}
    const first=$('#first-name'),phone=$('#phone');
    const nameValid=first.value.trim().length>=2&&first.value.trim().length<=60,phoneValid=validMobile(phone.value);
    $('#name-error').textContent=nameValid?'':'Indiquez un prénom de deux caractères au moins.';
    $('#phone-error').textContent=phoneValid?'':'Indiquez un mobile français commençant par 06, 07, +33 6 ou +33 7.';
    first.setAttribute('aria-invalid',String(!nameValid));phone.setAttribute('aria-invalid',String(!phoneValid));
    if(!nameValid||!phoneValid){(!nameValid?first:phone).focus();announce('Vérifiez les coordonnées indiquées.');return}
    const stillAvailable=slotsFor(state.day,state.service).some(slot=>slot.minute===state.time&&!slot.disabled);
    if(!stillAvailable){state.time=null;go(2);$('#step-error').textContent='Ce créneau est passé. Choisissez une autre heure.';return}
    state.done=true;form.hidden=true;$('#success').hidden=false;summary();
    $('#success-name').textContent=first.value.trim();
    $('#success-recap').textContent=`Votre essai : ${selected().name}, ${dayFormat.format(utcDate(state.day))} à ${hfr(state.time)}. ${selected().duration}\u00a0min · ${selected().price}\u00a0€ indicatifs.`;
    $('#success-title').focus();announce('Simulation terminée. Aucun rendez-vous pris, aucune information envoyée.');
  });
  function reset(focus=true){
    Object.assign(state,{step:0,service:null,day:null,time:null,done:false});form.reset();form.hidden=false;$('#success').hidden=true;
    ['name','phone'].forEach(id=>$('#'+id+'-error').textContent='');$('#first-name').removeAttribute('aria-invalid');$('#phone').removeAttribute('aria-invalid');go(0,focus);
  }
  $('#restart').addEventListener('click',()=>reset());
  [$('#first-name'),$('#phone')].forEach(input=>input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');$('#'+(input.id==='first-name'?'name':'phone')+'-error').textContent=''}));
  go(0,false);
})();
