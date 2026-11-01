/* Coif hom — simulation locale, aucun appel réseau et aucun stockage. */
(() => {
  'use strict';
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    coupe: { name: 'Coupe homme', minutes: 30, price: 25 },
    barbe: { name: 'Barbe', minutes: 20, price: 15 },
    duo: { name: 'Coupe + barbe', minutes: 45, price: 38 }
  };
  // Minutes de l’heure civile Europe/Paris. Samedi 17 h, autre source 18 h : à confirmer.
  const hours = { 2: [540,1140], 3: [540,1140], 4: [540,1140], 5: [540,1140], 6: [540,1020] };
  const parisFormat = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', weekday:'long', day:'numeric', month:'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', weekday:'short' });
  const month = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', month:'short' });
  const state = { step:0, service:null, day:null, time:null, done:false };
  let keyboard = false, entryFrame = 0;
  function parisNow() {
    const p = Object.fromEntries(parisFormat.formatToParts(new Date()).map(p => [p.type,p.value]));
    return { key:`${p.year}-${p.month}-${p.day}`, minute:Number(p.hour)*60+Number(p.minute), date:new Date(Date.UTC(+p.year,+p.month-1,+p.day,12)) };
  }
  const keyOf = d => d.toISOString().slice(0,10);
  const dateOf = key => new Date(`${key}T12:00:00Z`);
  const clock = m => `${Math.floor(m/60)}\u00a0h${m%60 ? `\u00a0${String(m%60).padStart(2,'0')}` : ''}`;
  function isHoliday(date) {
    const year = date.getUTCFullYear(), key = keyOf(date).slice(5);
    if (['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(key)) return true;
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
    const easter = Date.UTC(year,Math.floor(n/31)-1,n%31+1,12);
    return [1,39,50].some(offset => keyOf(new Date(easter+offset*86400000))===keyOf(date));
  }
  // Reproductible, explicitement fictif. Aucun agenda réel n’est consulté.
  function busy(key, minute, service) {
    let hash=0; for(const c of `${key}-${minute}-${service}`) hash=(hash*31+c.charCodeAt(0))>>>0;
    return hash%7===0;
  }
  function slotData(dayKey, serviceId, now=parisNow()) {
    const span=hours[dateOf(dayKey).getUTCDay()];
    if(!span || !services[serviceId]) return [];
    const slots=[];
    for(let minute=span[0];minute+services[serviceId].minutes<=span[1];minute+=15) {
      const past=dayKey<now.key || (dayKey===now.key && minute<=now.minute);
      slots.push({minute,past,taken:busy(dayKey,minute,serviceId)});
    }
    return slots;
  }
  function updateStatus() {
    const now=parisNow(), dow=now.date.getUTCDay(), span=hours[dow];
    let text='Fermé aujourd’hui, selon les horaires publiés.';
    if(span) text=now.minute<span[0] ? `Ouverture prévue à ${clock(span[0])}.` : now.minute<span[1] ? `Ouvert selon les horaires publiés, jusqu’à ${clock(span[1])}.` : 'Fermé à cette heure, selon les horaires publiés.';
    if(isHoliday(now.date)) text='Jour férié\u00a0: ouverture à confirmer par téléphone.';
    else text+=' Horaires à confirmer.';
    $$('[data-status]').forEach(el=>el.textContent=text);
    $$('[data-weekday]').forEach(row=>row.classList.toggle('is-today',+row.dataset.weekday===dow));
  }
  function sync() {
    const service=services[state.service];
    const values={service:service?.name || 'À choisir',date:state.day ? longDate.format(dateOf(state.day)) : 'À choisir',time:state.time!==null ? clock(state.time) : 'À choisir',duration:service ? `${service.minutes}\u00a0min` : '—',price:service ? `${service.price}\u00a0€` : '—'};
    $$('[data-summary]').forEach(el=>el.textContent=values[el.dataset.summary]);
    $('[data-mini-service]').textContent=service?.name || 'Coupe ou barbe ?';
    $('[data-mini-date]').textContent=state.day ? `${longDate.format(dateOf(state.day))}${state.time!==null ? `, ${clock(state.time)}` : ''}` : 'À vous de choisir.';
    $$('[data-step]').forEach((button,index)=>{
      button.disabled=state.done || (index>0&&!state.service) || (index>1&&!state.day) || (index>2&&state.time===null);
      if(index===state.step&&!state.done) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const now=parisNow(), fragment=document.createDocumentFragment();
    for(let i=0;i<14;i++) {
      const date=new Date(now.date.getTime()+i*86400000), key=keyOf(date), span=hours[date.getUTCDay()];
      const ended=!!span&&key===now.key&&!slotData(key,state.service,now).some(s=>!s.past&&!s.taken);
      const disabled=!span||ended;
      const label=document.createElement('label'); label.className=`choice${disabled?' is-disabled':''}`;
      const radio=document.createElement('input');radio.type='radio';radio.name='day';radio.value=key;radio.disabled=disabled;radio.checked=state.day===key;
      const a=document.createElement('span');a.textContent=shortDay.format(date);
      const b=document.createElement('b');b.textContent=date.getUTCDate();
      const c=document.createElement('span');c.textContent=month.format(date);
      const d=document.createElement('small');d.textContent=!span?'fermé':ended?'terminé':isHoliday(date)?'férié*':i===0?'aujourd’hui':'disponible';
      label.append(radio,a,b,c,d);fragment.append(label);
    }
    $('#days').replaceChildren(fragment);
  }
  function renderSlots() {
    const fragment=document.createDocumentFragment();
    const available=slotData(state.day,state.service);
    available.forEach(slot=>{
      const label=document.createElement('label');label.className=`choice${slot.past||slot.taken?' is-disabled':''}`;
      const radio=document.createElement('input');radio.type='radio';radio.name='time';radio.value=slot.minute;radio.disabled=slot.past||slot.taken;radio.checked=state.time===slot.minute;
      const title=document.createElement('b');title.textContent=clock(slot.minute);
      const desc=document.createElement('small');desc.textContent=slot.past?'passé':slot.taken?'déjà pris':'libre';
      label.append(radio,title,desc);fragment.append(label);
    });
    $('#slots').replaceChildren(fragment);
    $('#slot-caption').textContent=`${longDate.format(dateOf(state.day))}. Créneaux fictifs, sans lien avec l’agenda du salon.${isHoliday(dateOf(state.day))?' Jour férié\u00a0: ouverture à confirmer.':''}`;
  }
  function go(step,focus=true) {
    state.step=step;
    $('#choice-error').textContent='';
    if(step===1) renderDays(); if(step===2) renderSlots();
    cancelAnimationFrame(entryFrame);
    $$('[data-panel]').forEach((panel,index)=>{
      panel.hidden=index!==step;panel.classList.remove('is-entering');
      if(index===step&&!reduced.matches&&!keyboard) {
        panel.classList.add('is-entering');
        entryFrame=requestAnimationFrame(()=>{entryFrame=requestAnimationFrame(()=>panel.classList.remove('is-entering'));});
      }
    });
    $('#previous').hidden=step===0;
    $('#next').textContent=['Choisir un jour →','Choisir une heure →','Continuer →','Terminer la simulation →'][step];
    sync();
    $('#booking-announcement').textContent=`Étape ${step+1} sur 4. ${['Prestation','Jour','Heure','Coordonnées'][step]}. Simulation, aucun envoi.`;
    if(focus) $(`#step-title-${step}`).focus({preventScroll:false});
  }
  $('#booking-form').addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='service') {state.service=input.value;state.day=null;state.time=null;}
    if(input.name==='day') {state.day=input.value;state.time=null;}
    if(input.name==='time') state.time=+input.value;
    $('#choice-error').textContent='';sync();
  });
  $$('[data-step]').forEach(button=>button.addEventListener('click',()=>go(+button.dataset.step)));
  $('#previous').addEventListener('click',()=>go(Math.max(0,state.step-1)));
  function validateFields() {
    const name=$('#first-name'),phone=$('#phone'),clean=phone.value.replace(/[\s.()\-]/g,'');
    const validName=name.value.trim().length>=2;
    const validPhone=/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(clean);
    $('#name-error').textContent=validName?'':'Indiquez un prénom d’au moins 2 caractères.';
    $('#phone-error').textContent=validPhone?'':'Indiquez un mobile français, par exemple 06 12 34 56 78.';
    name.setAttribute('aria-invalid',String(!validName));phone.setAttribute('aria-invalid',String(!validPhone));
    if(!validName||!validPhone) (!validName?name:phone).focus();
    return validName&&validPhone;
  }
  ['first-name','phone'].forEach(id=>$('#'+id).addEventListener('input',()=>{
    $('#'+(id==='phone'?'phone-error':'name-error')).textContent='';$('#'+id).removeAttribute('aria-invalid');
  }));
  $('#booking-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(state.step<3) {
      const choice=[state.service,state.day,state.time!==null][state.step];
      if(!choice) {$('#choice-error').textContent=['Choisissez une prestation pour continuer.','Choisissez un jour ouvert pour continuer.','Choisissez un créneau libre pour continuer.'][state.step];$('input:not(:disabled)', $(`[data-panel="${state.step}"]`))?.focus();return;}
      go(state.step+1);return;
    }
    if(!validateFields()) return;
    if(!slotData(state.day,state.service).some(s=>s.minute===state.time&&!s.past&&!s.taken)) {
      state.time=null;
      const hasSlots=slotData(state.day,state.service).some(s=>!s.past&&!s.taken);
      if(!hasSlots) state.day=null;
      go(hasSlots?2:1);
      $('#choice-error').textContent=hasSlots?'Ce créneau est passé. Choisissez une nouvelle heure.':'Cette journée est terminée. Choisissez un nouveau jour.';return;
    }
    state.done=true;
    const service=services[state.service];
    $('#success-recap').textContent=`${$('#first-name').value.trim()}, votre essai\u00a0: ${service.name.toLowerCase()}, ${longDate.format(dateOf(state.day))} à ${clock(state.time)}. ${service.minutes}\u00a0min · ${service.price}\u00a0€ indicatifs.`;
    $('#booking-form').hidden=true;$('#success').hidden=false;sync();
    $('#booking-announcement').textContent='Essai terminé. Aucun rendez-vous pris, aucun message envoyé.';
    $('#success-title').focus();
  });
  function restart() {
    Object.assign(state,{step:0,service:null,day:null,time:null,done:false});
    $('#booking-form').reset();$('#booking-form').hidden=false;$('#success').hidden=true;$('#success-recap').textContent='';
    ['first-name','phone'].forEach(id=>$('#'+id).removeAttribute('aria-invalid'));
    $('#name-error').textContent='';$('#phone-error').textContent='';go(0);
  }
  $('#restart').addEventListener('click',restart);
  $$('[data-book]').forEach(link=>link.addEventListener('click',()=>{
    if(state.done) restart();
    state.service=link.dataset.book;state.day=null;state.time=null;
    $(`input[name="service"][value="${state.service}"]`).checked=true;
    // Laisser la navigation d’ancre placer la section, puis focaliser l’étape.
    go(1,false);setTimeout(() => $('#step-title-1').focus({preventScroll:true}),0);
  }));
  $('#copy-address').addEventListener('click',async()=>{
    const address='Coif hom, 21 rue Sainte-Hélène, 69002 Lyon';
    try {await navigator.clipboard.writeText(address);$('#copy-message').textContent='Adresse copiée.';}
    catch {$('#copy-message').textContent=`Copiez cette adresse\u00a0: ${address}`;}
  });
  document.addEventListener('keydown',()=>{keyboard=true;root.classList.add('keyboard-input');},true);
  document.addEventListener('pointerdown',()=>{keyboard=false;root.classList.remove('keyboard-input');},true);
  updateStatus();setInterval(updateStatus,60000);
  root.classList.add('js');sync();
  // Hors écran uniquement, déclenchement unique ; le contenu reste visible sans JS.
  if('IntersectionObserver' in window&&!reduced.matches) {
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.remove('is-waiting');observer.unobserve(entry.target);}
    }),{threshold:.08});
    $$('[data-reveal]').forEach((el,index)=>{
      el.classList.add(`reveal-${el.dataset.reveal}`);
      if(el.getBoundingClientRect().top>innerHeight) {el.classList.add('is-waiting');el.style.transitionDelay=`${index%3*60}ms`;}
      observer.observe(el);
    });
    reduced.addEventListener('change',()=>{if(reduced.matches){$$('.is-waiting').forEach(el=>el.classList.remove('is-waiting'));observer.disconnect();}});
  }
})();
