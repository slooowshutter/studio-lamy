/* Coif hom — simulation locale. Aucun stockage, aucun appel réseau. */
(function () {
  'use strict';
  const SERVICES = {
    coupe: {name:'Coupe homme', duration:30, price:25},
    barbe: {name:'Taille de barbe', duration:20, price:15},
    duo: {name:'Coupe & barbe', duration:45, price:35}
  };
  const HOURS = {2:[540,1140],3:[540,1140],4:[540,1140],5:[540,1140],6:[540,1020]};
  const PARIS = new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function parisNow(date = new Date()) {
    const p = Object.fromEntries(PARIS.formatToParts(date).map(x => [x.type,x.value]));
    return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute)};
  }
  function dayDate(iso) {return new Date(`${iso}T12:00:00Z`);}
  function plusDays(iso,n) {const d=dayDate(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
  function dayLabel(iso) {return new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(dayDate(iso));}
  function timeLabel(m) {return `${Math.floor(m/60)}\u00a0h\u00a0${String(m%60).padStart(2,'0')}`;}
  function holiday(iso) {
    const fixed={'01-01':'Jour de l’an','05-01':'Fête du Travail','05-08':'8 Mai','07-14':'14 Juillet','08-15':'Assomption','11-01':'Toussaint','11-11':'11 Novembre','12-25':'Noël'};
    if(fixed[iso.slice(5)]) return fixed[iso.slice(5)];
    const y=Number(iso.slice(0,4)),a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
    const easter=`${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return iso===plusDays(easter,1)?'Lundi de Pâques':iso===plusDays(easter,39)?'Ascension':iso===plusDays(easter,50)?'Lundi de Pentecôte':'';
  }
  function slotsFor(iso,serviceId,now=parisNow()) {
    const hours=HOURS[dayDate(iso).getUTCDay()],service=SERVICES[serviceId];
    if(!hours||!service) return [];
    const seed=Number(iso.replaceAll('-',''));
    const slots=[];
    for(let minute=hours[0];minute+service.duration<=hours[1];minute+=15){
      const past=iso<now.date||(iso===now.date&&minute<=now.minute);
      const taken=(seed+Math.floor(minute/15)*7)%11<2;
      slots.push({minute,disabled:past||taken,reason:past?'Passé':taken?'Déjà pris':''});
    }
    return slots;
  }
  function validMobile(value) {return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g,''));}
  // Exposition réservée au contrôle local Node, sans dépendance DOM.
  if(typeof module!=='undefined'&&module.exports) module.exports={SERVICES,HOURS,parisNow,plusDays,dayLabel,holiday,slotsFor,validMobile};
  if(typeof document==='undefined') return;
  const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>Array.from(c.querySelectorAll(s));
  const state={service:null,day:null,time:null,step:0,done:false};
  const root=document.documentElement;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const form=$('#booking-form');
  document.addEventListener('keydown',()=>root.classList.add('keyboard'));
  document.addEventListener('pointerdown',()=>root.classList.remove('keyboard'),{passive:true});
  function announcement(text){$('#booking-status').textContent=text;}
  function recap(){const s=SERVICES[state.service];return s&&state.day&&state.time!==null?`${s.name} · ${dayLabel(state.day)} à ${timeLabel(state.time)} · ${s.duration}\u00a0min · ${s.price}\u00a0€ (indicatif).`:'';}
  function updateSummary(){
    const service=SERVICES[state.service];
    $('#sum-service').textContent=service?`${service.name} · ${service.duration}\u00a0min`:'À choisir';
    $('#sum-day').textContent=state.day?dayLabel(state.day):'À choisir';
    $('#sum-time').textContent=state.time!==null?timeLabel(state.time):'À choisir';
    $('#sum-price').textContent=service?`${service.price}\u00a0€`:'—';
    $('#confirm-recap').textContent=recap();
    $('#mobile-recap').textContent=service?`${service.name} · ${service.price}\u00a0€ (indicatif)${state.day?' · '+dayLabel(state.day):''}${state.time!==null?' · '+timeLabel(state.time):''}`:'Choisissez une prestation.';
    $('[data-next="1"]').disabled=!state.service;
    $('[data-next="2"]').disabled=!state.day;
    $('[data-next="3"]').disabled=state.time===null;
    $$('[data-step]').forEach(b=>{
      const n=Number(b.dataset.step);
      b.disabled=state.done||(n===1&&!state.service)||(n===2&&!state.day)||(n===3&&state.time===null);
      if(n===state.step&&!state.done)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  function showStep(n){
    state.step=n;
    if(n===1)renderDays();
    if(n===2)renderSlots();
    $$('[data-panel]').forEach(p=>p.hidden=Number(p.dataset.panel)!==n);
    updateSummary();
    const title=$(`[data-panel="${n}"] h3`);
    title.focus({preventScroll:true});
    title.scrollIntoView({block:'nearest',behavior:'instant'});
    announcement(`Étape ${n+1} sur 4. ${title.textContent}`);
  }
  function renderDays(){
    const now=parisNow();
    if(state.day&&state.day<now.date){state.day=null;state.time=null;}
    $('#day-options').innerHTML=Array.from({length:14},(_,i)=>{
      const iso=plusDays(now.date,i),d=dayDate(iso),closed=!HOURS[d.getUTCDay()],full=!closed&&!slotsFor(iso,state.service,now).some(s=>!s.disabled),holidayName=holiday(iso);
      const label=new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'short'}).format(d);
      const month=new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',month:'short'}).format(d);
      const detail=closed?'Fermé':full?'Terminé':holidayName?'Férié · à confirmer':d.getUTCDay()===6?'17 h · à confirmer':i===0?'Aujourd’hui':'9 h – 19 h';
      return `<label class="choice day-choice"><input type="radio" name="day" value="${iso}" ${closed||full?'disabled':''} ${state.day===iso?'checked':''} aria-label="${dayLabel(iso)}, ${detail}"><span>${label}</span><span class="day-number">${d.getUTCDate()}</span><span>${month}</span><small>${detail}</small></label>`;
    }).join('');
  }
  function renderSlots(){
    const h=HOURS[dayDate(state.day).getUTCDay()];
    $('#slot-context').textContent=`${dayLabel(state.day)} · ${timeLabel(h[0])} – ${timeLabel(h[1])}${holiday(state.day)?' · Férié : ouverture à confirmer':''}${dayDate(state.day).getUTCDay()===6?' · fermeture à confirmer':''}`;
    const slots=slotsFor(state.day,state.service);
    if(state.time!==null&&!slots.some(s=>s.minute===state.time&&!s.disabled))state.time=null;
    $('#slot-options').innerHTML=slots.map(s=>`<label class="choice slot-choice"><input type="radio" name="time" value="${s.minute}" ${s.disabled?'disabled':''} ${state.time===s.minute?'checked':''} aria-label="${timeLabel(s.minute)}${s.reason?', '+s.reason:''}"><span>${timeLabel(s.minute)}</span><small>${s.reason||'Disponible'}</small></label>`).join('');
    if(!slots.some(s=>!s.disabled))$('#slot-options').insertAdjacentHTML('beforeend','<p>Aucune heure disponible. Revenez à l’étape Jour.</p>');
  }
  function selectService(id){
    state.service=id;state.day=null;state.time=null;state.done=false;
    $$('input[name=service]').forEach(r=>r.checked=r.value===id);
    $('#booking-success').hidden=true;form.hidden=false;
    updateSummary();
  }
  form.addEventListener('change',e=>{
    if(e.target.name==='service'){selectService(e.target.value);announcement(`Prestation choisie : ${SERVICES[state.service].name}. Vous pouvez choisir le jour.`);}
    if(e.target.name==='day'){state.day=e.target.value;state.time=null;updateSummary();announcement(`Jour choisi : ${dayLabel(state.day)}.`);}
    if(e.target.name==='time'){state.time=Number(e.target.value);updateSummary();announcement(`Heure choisie : ${timeLabel(state.time)}.`);}
  });
  $$('[data-next]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.next))));
  $$('[data-step]').forEach(b=>b.addEventListener('click',()=>showStep(Number(b.dataset.step))));
  $$('[data-service]').forEach(a=>a.addEventListener('click',()=>{selectService(a.dataset.service);showStep(1);}));
  function fieldError(id,text){const input=$(id);input.setAttribute('aria-invalid',String(Boolean(text)));$(id==='#first-name'?'#name-error':'#phone-error').textContent=text;}
  ['#first-name','#phone'].forEach(id=>$(id).addEventListener('input',()=>fieldError(id,'')));
  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(state.step!==3)return;
    const name=$('#first-name').value.trim(),phone=$('#phone').value;
    const nameOk=name.length>=2,mobileOk=validMobile(phone);
    fieldError('#first-name',nameOk?'':'Indiquez un prénom d’au moins deux caractères.');
    fieldError('#phone',mobileOk?'':'Indiquez un mobile français de 10 chiffres commençant par 06 ou 07.');
    if(!nameOk||!mobileOk){(!nameOk?$('#first-name'):$('#phone')).focus();announcement('Vérifiez les champs signalés.');return;}
    if(!slotsFor(state.day,state.service).some(s=>s.minute===state.time&&!s.disabled)){
      state.time=null;showStep(2);announcement('Cette heure est maintenant passée. Choisissez une autre heure ou un autre jour.');return;
    }
    state.done=true;updateSummary();
    $('#success-recap').textContent=`${name}, voici votre essai : ${recap()}`;
    form.hidden=true;$('#booking-success').hidden=false;
    $('#first-name').value='';$('#phone').value='';
    $('#booking-success h3').focus({preventScroll:true});$('#booking-success').scrollIntoView({block:'nearest',behavior:'instant'});
    announcement('Simulation terminée. Aucun rendez-vous réservé et aucune donnée envoyée.');
  });
  $('#restart').addEventListener('click',()=>{
    Object.assign(state,{service:null,day:null,time:null,step:0,done:false});form.reset();
    fieldError('#first-name','');fieldError('#phone','');$('#success-recap').textContent='';
    form.hidden=false;$('#booking-success').hidden=true;showStep(0);
  });
  $('#booking-app').hidden=false;
  $('#mobile-selection').hidden=false;
  updateSummary();
  // Les contenus ne deviennent révélables qu’après installation de l’observateur.
  if('IntersectionObserver' in window){
    if(!reduce.matches){
      const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');observer.unobserve(entry.target);}}),{threshold:.12});
      root.classList.add('js');
      $$('[data-reveal]').forEach(el=>{el.classList.add('pending');observer.observe(el);});
      reduce.addEventListener('change',()=>{if(reduce.matches){$$('.pending').forEach(el=>el.classList.remove('pending'));observer.disconnect();}});
    }
    const bar=$('.mobile-bar'),visible=new Set();
    const barObserver=new IntersectionObserver(entries=>{
      entries.forEach(e=>e.isIntersecting?visible.add(e.target):visible.delete(e.target));
      bar.classList.toggle('is-hidden',visible.size>0);
    },{threshold:0});
    ['.hero-copy','#reserver','.site-footer'].forEach(s=>barObserver.observe($(s)));
  }
})();
