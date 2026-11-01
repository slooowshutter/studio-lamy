/* The Barber Marseille. Simulation locale : aucun stockage, aucune requête. */
(() => {
  'use strict';
  const NB = '\u00a0';
  const time = n => `${Math.floor(n / 60)}${NB}h${n % 60 ? NB + String(n % 60).padStart(2, '0') : ''}`;
  const duration = n => n < 60 ? `${n}${NB}min` : time(n);
  const money = (n, from = false) => `${from ? 'dès' + NB : ''}${n}${NB}€`;
  const iso = date => date.toISOString().slice(0, 10);
  const dateAtNoon = key => new Date(key + 'T12:00:00Z');
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function paris(now = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(now).map(v => [v.type, v.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function easter(y) {
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
    return new Date(Date.UTC(y,Math.floor(n/31)-1,n%31+1,12));
  }
  function holiday(key) {
    const y=Number(key.slice(0,4));
    if(['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(key.slice(5))) return true;
    return [1,39,50].some(n => { const e=easter(y); e.setUTCDate(e.getUTCDate()+n); return iso(e)===key; });
  }
  function dateInHorizon(key, now = new Date()) {
    if(!key)return false;
    const current=paris(now),last=dateAtNoon(current.key);last.setUTCDate(last.getUTCDate()+13);
    return key>=current.key&&key<=iso(last)&&dateAtNoon(key).getUTCDay()!==0;
  }
  function slotsFor(key, minutes, now = new Date()) {
    const current=paris(now), day=dateAtNoon(key);
    if(day.getUTCDay()===0 || key<current.key) return [];
    const seed=Math.floor(day.getTime()/86400000), slots=[];
    for(let n=600;n+minutes<=1170;n+=15) {
      const elapsed=key===current.key && n<=current.minutes;
      const busy=(seed+Math.floor(n/15)*7)%11===0 || (seed+Math.floor(n/15))%9===0;
      slots.push({minute:n,disabled:elapsed||busy,reason:elapsed?'passé':'déjà pris'});
    }
    return slots;
  }
  if(typeof module!=='undefined' && module.exports) module.exports={paris,slotsFor,holiday,duration,dateInHorizon};
  if(typeof document==='undefined') return;
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard=false, panelAnimation=null;
  document.addEventListener('keydown',()=>{keyboard=true;document.documentElement.classList.add('keyboard-input');},true);
  document.addEventListener('pointerdown',()=>{keyboard=false;document.documentElement.classList.remove('keyboard-input');},true);
  const state={service:null,date:null,minute:null,step:0,done:false};
  const radios=$$('input[name="prestation"]');
  function announce(text){$('#booking-live').textContent=text;}
  function readService(radio){return {id:radio.value,name:radio.dataset.name,duration:Number(radio.dataset.duration),price:Number(radio.dataset.price),from:radio.dataset.from==='true'};}
  function clearError(id){$('#'+id).textContent='';}
  function summary(){
    $('#sum-service').textContent=state.service?.name||'À choisir';
    $('#sum-day').textContent=state.date?fmtLong.format(dateAtNoon(state.date)):'À choisir';
    $('#sum-time').textContent=state.minute!==null?time(state.minute):'À choisir';
    $('#sum-duration').textContent=state.service?duration(state.service.duration):'—';
    $('#sum-price').textContent=state.service?money(state.service.price,state.service.from):'—';
    $$('[data-step]').forEach((b,i)=>{
      b.disabled=state.done || (i===1&&!state.service) || (i===2&&!state.date) || (i===3&&state.minute===null);
      if(i===state.step&&!state.done)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  function showStep(step,focus=true){
    state.step=step;state.done=false;
    if(step===1)renderDays();
    if(step===2)renderSlots();
    $$('.step-panel').forEach(p=>{p.hidden=p.dataset.panel!==String(step);});
    summary();
    const panel=$(`[data-panel="${step}"]`), heading=$('h3',panel);
    if(panelAnimation)panelAnimation.cancel();
    if(!reduced.matches&&!keyboard&&panel.animate) panelAnimation=panel.animate([{opacity:0,transform:'translateX(8px)'},{opacity:1,transform:'translateX(0)'}],{duration:220,easing:'cubic-bezier(0.23,1,0.32,1)'});
    if(focus)heading.focus({preventScroll:false});
    announce(`Étape ${step+1} sur 4. ${heading.textContent}`);
  }
  function selectService(radio){
    const next=readService(radio);
    if(next.id!==state.service?.id){state.date=null;state.minute=null;}
    state.service=next;state.done=false;clearError('service-error');summary();
    announce(`${next.name}, ${duration(next.duration)}, ${money(next.price,next.from)} indicatifs.`);
  }
  radios.forEach(r=>r.addEventListener('change',()=>selectService(r)));
  $$('[data-select]').forEach(b=>b.addEventListener('click',()=>{
    const r=radios.find(v=>v.value===b.dataset.select);
    if(!r)return;
    r.checked=true;selectService(r);showStep(0);
    r.closest('label').scrollIntoView({block:'nearest',behavior:'instant'});
    $('#reserver').scrollIntoView({block:'start',behavior:reduced.matches||keyboard?'instant':'smooth'});
  }));
  function makeChoice(name,value,disabled,label,content){
    const outer=document.createElement('label');outer.className='choice';
    const r=document.createElement('input');r.type='radio';r.name=name;r.value=String(value);r.disabled=disabled;r.setAttribute('aria-label',label);
    outer.append(r);content.forEach(([tag,text])=>{const el=document.createElement(tag);el.textContent=text;outer.append(el);});
    return {outer,r};
  }
  function renderDays(){
    const parent=$('#days');parent.replaceChildren();const current=paris();
    for(let i=0;i<14;i++){
      const d=dateAtNoon(current.key);d.setUTCDate(d.getUTCDate()+i);const key=iso(d), closed=d.getUTCDay()===0, allPast=!slotsFor(key,state.service.duration).some(s=>!s.disabled);
      const note=closed?'fermé':allPast?'complet':holiday(key)?'férié*':'';
      const c=makeChoice('jour',key,closed||allPast,`${fmtLong.format(d)}${note?', '+note:''}`,[['span',fmtDay.format(d)],['strong',String(d.getUTCDate())],['span',fmtMonth.format(d)],['small',note||'ouvert']]);
      c.r.checked=state.date===key;
      c.r.addEventListener('change',()=>{state.date=key;state.minute=null;clearError('day-error');summary();announce(fmtLong.format(d)+', jour choisi.');});
      parent.append(c.outer);
    }
  }
  function renderSlots(){
    const parent=$('#slots');parent.replaceChildren();
    const slots=slotsFor(state.date,state.service.duration);
    for(const slot of slots){
      const c=makeChoice('heure',slot.minute,slot.disabled,`${time(slot.minute)}${slot.disabled?', '+slot.reason:''}`,[['span',time(slot.minute)]]);
      c.r.checked=state.minute===slot.minute;
      c.r.addEventListener('change',()=>{state.minute=slot.minute;clearError('time-error');summary();announce(time(slot.minute)+', heure choisie.');});
      parent.append(c.outer);
    }
    if(!slots.some(s=>!s.disabled))$('#time-error').textContent='Aucun horaire disponible. Choisissez un autre jour à l’étape 02.';
  }
  $$('[data-step]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.step))));
  $$('[data-next]').forEach(b=>b.addEventListener('click',()=>{
    const next=Number(b.dataset.next), err=next===1?'service-error':next===2?'day-error':'time-error';
    const valid=next===1?state.service:next===2?state.date:state.minute!==null;
    if(!valid){$('#'+err).textContent=next===1?'Choisissez une prestation pour continuer.':next===2?'Choisissez un jour ouvert pour continuer.':'Choisissez une heure disponible pour continuer.';return;}
    if(next>=2 && (!dateInHorizon(state.date)||!slotsFor(state.date,state.service.duration).some(s=>!s.disabled))){
      state.date=null;state.minute=null;showStep(1);$('#day-error').textContent='Ce jour n’a plus de créneau. Choisissez un autre jour.';return;
    }
    if(next===3&&!slotStillValid()){state.minute=null;showStep(2);$('#time-error').textContent='Cet horaire est passé. Choisissez un autre créneau.';return;}
    clearError(err);showStep(next);
  }));
  function slotStillValid(){return state.service&&dateInHorizon(state.date)&&slotsFor(state.date,state.service.duration).some(s=>s.minute===state.minute&&!s.disabled);}
  const nameInput=$('#first-name'),phoneInput=$('#phone');
  function fieldError(input,id,message){input.setAttribute('aria-invalid',String(Boolean(message)));$('#'+id).textContent=message;}
  [nameInput,phoneInput].forEach(input=>input.addEventListener('input',()=>fieldError(input,input===nameInput?'name-error':'phone-error','')));
  $('#booking-form').addEventListener('submit',event=>{
    event.preventDefault();
    const name=nameInput.value.trim(), phone=phoneInput.value.replace(/[\s.()\-]/g,'');
    const nameOK=name.length>=2&&/\p{L}/u.test(name),phoneOK=/^(?:0|\+33|0033)[67]\d{8}$/.test(phone);
    fieldError(nameInput,'name-error',nameOK?'':'Indiquez un prénom d’au moins deux caractères.');
    fieldError(phoneInput,'phone-error',phoneOK?'':'Indiquez un mobile français : 06, 07 ou +33 suivi de 6 ou 7.');
    if(!nameOK||!phoneOK){(!nameOK?nameInput:phoneInput).focus();announce('Vérifiez les champs indiqués.');return;}
    if(!dateInHorizon(state.date)){state.date=null;state.minute=null;showStep(1);$('#day-error').textContent='Choisissez un jour parmi les 14 prochains jours.';return;}
    if(!slotStillValid()){
      state.minute=null;showStep(2);$('#time-error').textContent='Cet horaire n’est plus disponible. Choisissez un nouveau créneau.';return;
    }
    state.done=true;
    $$('.step-panel').forEach(p=>{p.hidden=p.id!=='success';});
    $('#success-recap').textContent=`${name}, votre essai : ${state.service.name}, ${fmtLong.format(dateAtNoon(state.date))} à ${time(state.minute)}, ${duration(state.service.duration)}, ${money(state.service.price,state.service.from)} indicatifs.`;
    nameInput.value='';phoneInput.value='';summary();$('#success h3').focus();announce('Démonstration terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  $('#restart').addEventListener('click',()=>{
    state.service=null;state.date=null;state.minute=null;state.done=false;radios.forEach(r=>r.checked=false);$('#booking-form').reset();
    ['service-error','day-error','time-error','submit-error','name-error','phone-error'].forEach(clearError);
    nameInput.removeAttribute('aria-invalid');phoneInput.removeAttribute('aria-invalid');$('#success-recap').textContent='';showStep(0);
  });
  function status(){
    const now=paris(),d=dateAtNoon(now.key),dow=d.getUTCDay(),h=holiday(now.key);
    const text=h?'Jour férié · ouverture à confirmer':dow===0?'Dimanche fermé · retour lundi à 10 h*':now.minutes>=600&&now.minutes<1170?'Ouvert selon Planity · jusqu’à 19 h 30*':now.minutes<600?'Ouverture à 10 h selon Planity*':'Fermé selon Planity · voir les horaires*';
    $$('[data-status]').forEach(el=>{el.textContent=text;});
    $$('[data-dow]').forEach(el=>{el.classList.toggle('today',Number(el.dataset.dow)===dow);});
  }
  status();setInterval(status,60000);
  $('#copy-address').addEventListener('click',async()=>{
    const feedback=$('#copy-feedback');
    try{await navigator.clipboard.writeText('The Barber Marseille, 71 rue de Rome, Marseille');feedback.textContent='Adresse copiée.';}
    catch{feedback.textContent='À copier : The Barber Marseille, 71 rue de Rome, Marseille.';}
  });
  // Les entrées ne sont masquées qu’une fois l’observateur prêt ; sans JS tout reste lisible.
  if(!reduced.matches&&'IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}},{threshold:.08});
    $$('.menu-group').forEach(group=>$$('[data-row]',group).forEach((row,i)=>{row.classList.add('row-reveal');row.style.transitionDelay=`${Math.min(i,3)*50}ms`;io.observe(row);}));
    document.documentElement.classList.add('motion-ready');
    reduced.addEventListener('change',()=>{if(reduced.matches){$$('.row-reveal').forEach(r=>r.classList.add('visible'));io.disconnect();}});
  }
  $('#booking-app').hidden=false;summary();
})();

/* Index du comptoir : filtrage local, sans masquer la carte en l’absence de JS. */
(() => {
  'use strict';
  if(typeof document==='undefined')return;
  const filters=document.querySelector('.menu-filters');
  if(!filters)return;
  filters.hidden=false;
  const groups=[...document.querySelectorAll('[data-family]')];
  filters.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    const family=button.dataset.filter;
    filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    groups.forEach(g=>{g.hidden=family!=='all'&&g.dataset.family!==family;});
    if(family!=='all'&&family!=='other')document.querySelector('.techniques').open=false;
    const count=groups.filter(g=>!g.hidden).reduce((n,g)=>n+g.querySelectorAll('.service-row').length,0);
    document.querySelector('#filter-live').textContent=`${count} prestations affichées. Filtre : ${button.textContent}.`;
  }));
})();
