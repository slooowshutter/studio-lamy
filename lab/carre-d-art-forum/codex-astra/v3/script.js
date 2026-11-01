/* Carré d’Art Forum. Simulation only: no network, storage, or submission. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hours = { 2: [540,1140], 3: [540,1140], 4: [540,1140], 5: [540,1140], 6: [540,1080] };
  const services = $$('.service').map(el => ({id:el.dataset.service,name:el.dataset.name,duration:+el.dataset.duration,price:+el.dataset.price,from:el.dataset.from === 'true'}));
  const byId = id => services.find(s => s.id === id);
  const nb = '\u00a0';
  const price = s => `${s.from ? 'Dès ' : ''}${s.price}${nb}€`;
  const duration = s => s.duration < 60 ? `${s.duration}${nb}min` : `${s.duration/60}${nb}h`;
  const clock = minutes => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  const dayFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});
  const shortDay = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'short'});
  const shortMonth = new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',month:'short'});
  const parisFormat = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function parisNow() {
    const p = Object.fromEntries(parisFormat.formatToParts(new Date()).map(x=>[x.type,x.value]));
    return {iso:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute)};
  }
  function dateOf(iso) { return new Date(`${iso}T12:00:00Z`); }
  function holiday(iso) {
    const y=+iso.slice(0,4),a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    const n=h+l-7*m+114, easter=Date.UTC(y,Math.floor(n/31)-1,n%31+1,12);
    return ['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(iso.slice(5)) || [1,39,50].some(days=>new Date(easter+days*86400000).toISOString().slice(0,10)===iso);
  }
  function daysFromNow() {
    const first=dateOf(parisNow().iso);
    return Array.from({length:14},(_,index)=>{const date=new Date(first.getTime()+index*86400000);return {date,iso:date.toISOString().slice(0,10),open:hours[date.getUTCDay()]};});
  }
  function slotsFor(iso, service) {
    const range=hours[dateOf(iso).getUTCDay()];
    if(!range||!service)return [];
    const now=parisNow(),seed=Number(iso.replaceAll('-',''))+service.duration;
    const slots=[];
    for(let minute=range[0];minute+service.duration<=range[1];minute+=30){
      const past=iso<now.iso||(iso===now.iso&&minute<=now.minute);
      const taken=(seed+minute/30)%7===0;
      slots.push({minute,disabled:past||taken,reason:past?'Passé':taken?'Déjà pris':''});
    }
    return slots;
  }
  let step=0,state={service:null,day:null,time:null},keyboard=false;
  const form=$('#booking-form'),panels=$$('[data-panel]'),status=$('#booking-status');
  function announce(text){status.textContent=text;}
  function radio(name,value,labelHTML,classes,disabled=false){
    const label=document.createElement('label');label.className=`choice ${classes}`;
    const input=document.createElement('input');input.type='radio';input.name=name;input.value=value;input.disabled=disabled;
    label.append(input);label.insertAdjacentHTML('beforeend',labelHTML);return label;
  }
  services.forEach(s=>{
    const label=radio('service',s.id,`<span>${s.name}<small>${duration(s)} · tarif indicatif</small></span><strong>${price(s)}</strong>`,'service-choice');
    $('#service-options').append(label);
  });
  function renderDays(){
    const container=$('#day-options');container.replaceChildren();
    for(const d of daysFromNow()){
      const special=holiday(d.iso);
      const label=radio('day',d.iso,`<span>${shortDay.format(d.date)}</span><strong>${d.date.getUTCDate()}</strong><span>${shortMonth.format(d.date)}</span><small>${!d.open?'Fermé':special?'Férié · à confirmer':'Ouvert'}</small>`,'day-choice',!d.open);
      const input=$('input',label);input.checked=state.day===d.iso;input.setAttribute('aria-label',`${dayFormat.format(d.date)}${!d.open?', fermé':special?', férié, ouverture à confirmer':''}`);container.append(label);
    }
  }
  function renderSlots(){
    const container=$('#slot-options');container.replaceChildren();
    const slots=slotsFor(state.day,byId(state.service));let available=0;
    for(const slot of slots){
      if(!slot.disabled)available++;
      const label=radio('time',String(slot.minute),`<span>${clock(slot.minute)}</span><small>${slot.reason||'Essai'}</small>`,'slot-choice',slot.disabled);
      const input=$('input',label);input.checked=state.time===slot.minute;input.setAttribute('aria-label',`${clock(slot.minute)}${slot.reason?', '+slot.reason:''}`);container.append(label);
    }
    $('#slot-note').textContent=available?`${available} créneaux fictifs le ${dayFormat.format(dateOf(state.day))}. Les créneaux « déjà pris » sont simulés.`:'Aucun créneau pour cette journée. Revenez au choix du jour pour en sélectionner un autre.';
  }
  function summary(){
    const s=byId(state.service),values={service:s?s.name:'À choisir',day:state.day?dayFormat.format(dateOf(state.day)):'À choisir',time:state.time!==null?clock(state.time):'À choisir',duration:s?duration(s):'—',price:s?price(s):'—'};
    $$('[data-summary]').forEach(el=>{el.textContent=values[el.dataset.summary];});
    if(s&&state.day&&state.time!==null)$('#final-recap').textContent=`Récapitulatif de l’essai : ${s.name}, le ${values.day} à ${values.time} (heure de Paris), ${values.duration}. ${price(s)}, tarif indicatif.`;
  }
  function canVisit(n){return n===0||(n===1&&!!state.service)||(n===2&&!!state.service&&!!state.day)||(n===3&&!!state.service&&!!state.day&&state.time!==null);}
  function showStep(n,focus=true){
    if(!canVisit(n))return;
    step=n;$('#step-error').textContent='';
    if(n===1)renderDays();if(n===2)renderSlots();
    panels.forEach((p,index)=>{p.hidden=index!==n;p.classList.remove('entering');});
    $$('[data-step]').forEach(button=>{const index=+button.dataset.step;button.disabled=!canVisit(index);if(index===n)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    $('#back').hidden=n===0;$('#continue').textContent=n===3?'Terminer la simulation →':'Continuer →';
    const panel=panels[n];
    if(!keyboard&&!reduced.matches){panel.classList.add('entering');requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('entering')));}
    if(focus){const heading=$('h3',panel);heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});}
    summary();announce(`Étape ${n+1} sur 4. ${$('h3',panel).textContent}`);
  }
  form.addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='service'){state={service:input.value,day:null,time:null};}
    if(input.name==='day'){state.day=input.value;state.time=null;}
    if(input.name==='time')state.time=+input.value;
    summary();$$('[data-step]').forEach(button=>button.disabled=!canVisit(+button.dataset.step));$('#step-error').textContent='';
  });
  $$('[data-step]').forEach(button=>button.addEventListener('click',()=>showStep(+button.dataset.step)));
  $('#back').addEventListener('click',()=>showStep(Math.max(0,step-1)));
  function validPhone(value){return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g,''));}
  function validateDetails(){
    const name=$('#first-name'),phone=$('#phone');
    const nameValid=name.value.trim().length>=2,phoneValid=validPhone(phone.value);
    $('#name-error').textContent=nameValid?'':'Indiquez un prénom d’au moins deux caractères.';
    $('#phone-error').textContent=phoneValid?'':'Indiquez un mobile français commençant par 06, 07 ou +33 6 / 7.';
    name.setAttribute('aria-invalid',String(!nameValid));phone.setAttribute('aria-invalid',String(!phoneValid));
    if(!nameValid)name.focus();else if(!phoneValid)phone.focus();
    return nameValid&&phoneValid;
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(step===0&&!state.service){$('#step-error').textContent='Choisissez une prestation pour continuer.';return;}
    if(step===1&&!state.day){$('#step-error').textContent='Choisissez un jour ouvert pour continuer.';return;}
    if(step===2&&state.time===null){$('#step-error').textContent='Choisissez une heure disponible pour cet essai.';return;}
    if(step<3){showStep(step+1);return;}
    if(!validateDetails())return;
    // Recheck at completion: a tab may have remained open past its selected time.
    if(!daysFromNow().some(d=>d.iso===state.day&&d.open)||!slotsFor(state.day,byId(state.service)).some(s=>s.minute===state.time&&!s.disabled)){
      state.day=null;state.time=null;showStep(1);$('#step-error').textContent='Ce créneau est maintenant passé. Choisissez un nouveau jour pour poursuivre l’essai.';return;
    }
    const s=byId(state.service);
    $('#success-recap').textContent=`${$('#first-name').value.trim()}, voici votre sélection : ${s.name}, le ${dayFormat.format(dateOf(state.day))} à ${clock(state.time)} (heure de Paris), ${duration(s)}. ${price(s)}, tarif indicatif.`;
    $('#booking-app').hidden=true;$('#success').hidden=false;$('#success h3').focus();announce('Simulation terminée. Aucun rendez-vous réservé, aucune donnée envoyée.');
  });
  $('#restart').addEventListener('click',()=>{
    state={service:null,day:null,time:null};form.reset();$$('.error').forEach(el=>el.textContent='');$$('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));$('#success-recap').textContent='';$('#success').hidden=true;$('#booking-app').hidden=false;showStep(0);
  });
  $$('[data-book]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();
    state={service:link.dataset.book,day:null,time:null};
    $(`input[name="service"][value="${state.service}"]`).checked=true;
    $('#success').hidden=true;$('#booking-app').hidden=false;showStep(1);
  }));
  $$('[data-intent]').forEach(button=>button.addEventListener('click',()=>{
    $$('[data-intent]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const intentLink=$('[data-intent-book]');if(intentLink)intentLink.dataset.book=button.dataset.intent;
    const s=byId(button.dataset.intent);$('[data-intent-name]').textContent=s.name;$('[data-intent-price]').textContent=`${price(s)} · ${duration(s)}`;
  }));
  document.addEventListener('keydown',event=>{if(event.key==='Tab'||event.key.startsWith('Arrow')||event.key==='Enter'||event.key===' '){keyboard=true;root.classList.add('keyboard');}});
  document.addEventListener('pointerdown',()=>{keyboard=false;root.classList.remove('keyboard');},{passive:true});
  const todayRow=$(`[data-dow="${dateOf(parisNow().iso).getUTCDay()}"]`);if(todayRow)todayRow.classList.add('today');
  $('.js-fallback').hidden=true;$('#booking-app').hidden=false;showStep(0,false);
  root.classList.add('js');
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')));
  const approach=$('.partition');
  if('IntersectionObserver' in window&&!reduced.matches&&approach){
    approach.dataset.reveal='';const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.dataset.visible='';observer.unobserve(entry.target);}}),{threshold:.12});observer.observe(approach);
  }
})();
