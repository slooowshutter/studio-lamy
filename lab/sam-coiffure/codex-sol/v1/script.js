/* Sam Coiffure — démonstration locale. Aucune requête, aucun stockage. */
'use strict';
const SamBooking = (() => {
  const services = {
    coupe: { name: 'Coupe homme', duration: 30, price: 18 },
    barbe: { name: 'Entretien de barbe', duration: 20, price: 10 },
    duo: { name: 'Coupe + barbe', duration: 45, price: 25 }
  };
  // Horaires iCoiffeur/Waze, à confirmer ; le samedi contredit Pages Jaunes.
  const schedule = { 0: [], 1: [[540,1110]], 2: [[540,1110]], 3: [[540,1110]], 4: [[540,1110]], 5: [[510,750],[870,1110]], 6: [[510,1110]] };
  const parisFormat = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Paris', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' });
  const pad = n => String(n).padStart(2,'0');
  const iso = d => d.toISOString().slice(0,10);
  const date = key => new Date(key+'T12:00:00Z');
  function now(value = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(value).map(x => [x.type,x.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour)*60+Number(p.minute) };
  }
  function easter(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(Date.UTC(year,Math.floor((h+l-7*m+114)/31)-1,(h+l-7*m+114)%31+1,12));
  }
  function holiday(key) {
    // Fermetures de démonstration, dont vendredi saint et 26 décembre.
    const y=Number(key.slice(0,4));
    const fixed=['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25','12-26'];
    if(fixed.includes(key.slice(5))) return true;
    const e=easter(y).getTime();
    return [-2,1,39,50].some(n=>iso(new Date(e+n*86400000))===key);
  }
  function hours(key) { return holiday(key) ? [] : schedule[date(key).getUTCDay()]; }
  const time = minute => `${Math.floor(minute/60)}\u00a0h${minute%60 ? '\u00a0'+pad(minute%60) : ''}`;
  function slots(key,duration,clock=now()) {
    const seed=Number(key.replaceAll('-',''));
    const result=[];
    for(const [open,close] of hours(key)) {
      for(let start=open;start+duration<=close;start+=15) {
        const past=key<clock.key || (key===clock.key && start<=clock.minute);
        // Occupations fictives de 30 min ; un service ne peut pas les chevaucher.
        const busy=Array.from({length:Math.ceil((close-open)/30)},(_,i)=>open+i*30)
          .some(block=>(seed+Math.floor(block/30))%7===0 && start<block+30 && start+duration>block);
        result.push({ start, disabled:past||busy, reason:past?'Passé':busy?'Déjà pris · fictif':'' });
      }
    }
    return result;
  }
  function days(start,count=14) { return Array.from({length:count},(_,i)=>iso(new Date(date(start).getTime()+i*86400000))); }
  function mobile(value) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g,'')); }
  function utc(key,minute) {
    const target=Date.UTC(Number(key.slice(0,4)),Number(key.slice(5,7))-1,Number(key.slice(8)),Math.floor(minute/60),minute%60);
    let value=target;
    for(let i=0;i<3;i++) {
      const p=now(new Date(value));
      const interpreted=Date.parse(p.key+'T00:00:00Z')+p.minute*60000;
      value+=target-interpreted;
    }
    return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  }
  return {services,now,date,holiday,hours,time,slots,days,mobile,utc};
})();
if(typeof module!=='undefined' && module.exports) module.exports=SamBooking;
if(typeof document!=='undefined') (() => {
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  const B=SamBooking, form=$('#booking-form');
  if(!form) return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const longDate=key=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(B.date(key));
  const shortDay=key=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'}).format(B.date(key));
  const month=key=>new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'}).format(B.date(key));
  let state={service:null,day:null,time:null,step:1}, keyboard=false;
  document.addEventListener('keydown',e=>{if(['Tab','Enter',' '].includes(e.key)||e.key.startsWith('Arrow')) {keyboard=true;document.body.classList.add('is-keyboard');}});
  document.addEventListener('pointerdown',()=>{keyboard=false;document.body.classList.remove('is-keyboard');},{passive:true});
  const announce=text=>{$('#booking-announcement').textContent=text;};
  function mirror() {
    const s=B.services[state.service];
    const values={service:s?s.name:'À choisir',duration:s?s.duration+'\u00a0min':'—',price:s?s.price+'\u00a0€':'—',day:state.day?longDate(state.day):'À choisir',time:state.time!==null?B.time(state.time):'À choisir'};
    for(const [key,value] of Object.entries(values)) $$(`[data-mirror="${key}"]`).forEach(e=>e.textContent=value);
    $$('[data-step]').forEach(button=>{
      const step=Number(button.dataset.step);
      button.disabled=step>1 && (!state.service || (step>2&&!state.day) || (step>3&&state.time===null));
      if(step===state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  function radio(labelClass,name,value,content,disabled=false) {
    const label=document.createElement('label'); label.className=labelClass;
    const input=document.createElement('input'); input.type='radio';input.name=name;input.value=value;input.disabled=disabled;
    input.setAttribute('aria-describedby',name==='day'?'error-day':'slot-help error-time');
    label.append(input); label.insertAdjacentHTML('beforeend',content); return label;
  }
  function renderDays() {
    const host=$('#days'); host.querySelectorAll('label').forEach(x=>x.remove());
    const clock=B.now(),s=B.services[state.service];
    B.days(clock.key).forEach(key=>{
      const closed=!B.hours(key).length;
      const noSlot=!closed&&!B.slots(key,s.duration,clock).some(x=>!x.disabled);
      const saturday=B.date(key).getUTCDay()===6;
      const note=closed?'Fermé':noSlot?'Terminé':saturday?'À confirmer':'Essai';
      const label=radio('day-option','day',key,`<span>${shortDay(key)}</span><strong>${Number(key.slice(8))}</strong><span>${month(key)}</span><small>${note}</small>`,closed||noSlot);
      label.querySelector('input').checked=state.day===key;
      host.append(label);
    });
  }
  function renderSlots() {
    const host=$('#slots'); host.querySelectorAll('label,.empty-slots').forEach(x=>x.remove());
    const slots=B.slots(state.day,B.services[state.service].duration);
    slots.forEach(slot=>{
      const label=radio('slot-option','time',slot.start,`<span class="slot-time">${B.time(slot.start)}</span><small>${slot.reason||'Essai'}</small>`,slot.disabled);
      label.querySelector('input').checked=state.time===slot.start;
      host.append(label);
    });
    if(!slots.some(x=>!x.disabled)) {
      const p=document.createElement('p');p.className='empty-slots';p.textContent='Aucun créneau d’essai restant. Revenez au choix du jour.';host.append(p);
    }
  }
  function show(step) {
    state.step=step;
    if(step===2) renderDays();
    if(step===3) renderSlots();
    $$('.step-panel').forEach(panel=>{panel.hidden=Number(panel.dataset.panel)!==step;panel.classList.remove('is-entering');});
    const panel=$(`[data-panel="${step}"]`);
    if(!keyboard&&!reduce.matches) {
      panel.classList.remove('instant');panel.classList.add('is-entering');
      requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('is-entering')));
    } else panel.classList.add('instant');
    mirror();
    panel.querySelector('h3').focus({preventScroll:true});
    panel.scrollIntoView({block:'nearest',behavior:'instant'});
    announce(`Étape ${step} sur 4. ${panel.querySelector('h3').textContent}`);
  }
  function clearError(id) { $('#'+id).textContent=''; }
  function error(id,message,control) {
    $('#'+id).textContent=message;
    if(control) {control.setAttribute('aria-invalid','true');control.focus();}
    announce(message);
  }
  function selectService(id) {
    if(!B.services[id]) return;
    state.service=id;state.day=null;state.time=null;
    $$('.booking-services input').forEach(input=>{input.checked=input.value===id;input.removeAttribute('aria-invalid');input.setAttribute('aria-describedby','error-service');});
    ['error-service','error-day','error-time','error-confirm'].forEach(clearError);mirror();
  }
  form.addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='service') selectService(input.value);
    if(input.name==='day') {state.day=input.value;state.time=null;$$('#days input').forEach(x=>x.removeAttribute('aria-invalid'));clearError('error-day');clearError('error-time');mirror();}
    if(input.name==='time') {state.time=Number(input.value);$$('#slots input').forEach(x=>x.removeAttribute('aria-invalid'));clearError('error-time');mirror();}
  });
  $$('[data-service]').forEach(button=>button.addEventListener('click',()=>{
    if(form.hidden) restart(false);
    selectService(button.dataset.service);show(2);
  }));
  $$('[data-next]').forEach(button=>button.addEventListener('click',()=>{
    const next=Number(button.dataset.next);
    if(next===2&&!state.service) return error('error-service','Choisissez une prestation pour continuer.',$('.booking-services input'));
    if(next===3&&!state.day) return error('error-day','Choisissez un jour disponible pour cet essai.',$('#days input:not(:disabled)'));
    if(next===4&&(state.time===null||!B.slots(state.day,B.services[state.service].duration).some(s=>s.start===state.time&&!s.disabled))) {
      state.time=null;renderSlots();mirror();return error('error-time','Choisissez une heure disponible pour cet essai.',$('#slots input:not(:disabled)'));
    }
    show(next);
  }));
  $$('[data-back]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.back))));
  $$('[data-step]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.step))));
  [$('#first-name'),$('#mobile')].forEach(input=>input.addEventListener('input',()=>{
    input.removeAttribute('aria-invalid');clearError(input.id==='mobile'?'error-phone':'error-name');clearError('error-confirm');
  }));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const name=$('#first-name'),phone=$('#mobile');
    if(name.value.trim().length<2) return error('error-name','Saisissez au moins deux caractères pour le prénom.',name);
    if(!B.mobile(phone.value)) return error('error-phone','Saisissez un mobile français, par exemple 06 12 34 56 78.',phone);
    const valid=state.service&&state.day&&state.time!==null&&B.days(B.now().key).includes(state.day)&&B.slots(state.day,B.services[state.service].duration).some(s=>s.start===state.time&&!s.disabled);
    if(!valid) {state.day=null;state.time=null;show(2);return error('error-day','Le jour ou l’heure a expiré. Choisissez un nouveau passage simulé.');}
    const s=B.services[state.service];
    $('#success-copy').textContent=`${name.value.trim()}, votre essai : ${s.name.toLowerCase()}, ${longDate(state.day)} à ${B.time(state.time)}, ${s.duration}\u00a0min, ${s.price}\u00a0€ indicatifs.`;
    form.hidden=true;$('.selection').hidden=true;$('#booking-success').hidden=false;
    $('#success-title').focus({preventScroll:true});$('#booking-success').scrollIntoView({block:'nearest',behavior:'instant'});
    announce('Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée.');
  });
  function restart(focus=true) {
    form.reset();form.hidden=false;$('.selection').hidden=false;$('#booking-success').hidden=true;
    state={service:null,day:null,time:null,step:1};
    $$('.field-error').forEach(x=>x.textContent='');$$('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
    $('#success-copy').textContent='';mirror();if(focus) show(1);
  }
  $('#restart').addEventListener('click',()=>restart());
  $('#calendar-download').addEventListener('click',()=>{
    const s=B.services[state.service];if(!s) return;
    const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Studio Lamy//Sam Coiffure Apercu//FR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:essai-sam-${state.day}-${state.time}@studiolamy.local`,`DTSTAMP:${B.utc(B.now().key,B.now().minute)}`,`DTSTART:${B.utc(state.day,state.time)}`,`DTEND:${B.utc(state.day,state.time+s.duration)}`,'SUMMARY:ESSAI FICTIF — Sam Coiffure','DESCRIPTION:Simulation uniquement. Aucun rendez-vous pris. Rien envoyé au salon.','LOCATION:8 rue Jacques Peirotes\\, 67000 Strasbourg','STATUS:TENTATIVE','TRANSP:TRANSPARENT','END:VEVENT','END:VCALENDAR',''].join('\r\n');
    const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='essai-fictif-sam-coiffure.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $$('.copy-address').forEach(button=>button.addEventListener('click',async()=>{
    const result=button.nextElementSibling;
    try {await navigator.clipboard.writeText('Sam Coiffure, 8 rue Jacques Peirotes, 67000 Strasbourg');result.textContent='Adresse copiée.';}
    catch {result.textContent='À copier : 8 rue Jacques Peirotes, 67000 Strasbourg.';}
  }));
  const opening=$('#opening-status'),today=B.now().key,periods=B.hours(today);
  if(opening) opening.textContent=periods.length?`Horaires publiés aujourd’hui : ${periods.map(p=>p.map(B.time).join('–')).join(' / ')}. À confirmer.`:'Fermé selon les horaires retenus pour cet aperçu. À confirmer.';
  mirror();
  $('#booking-shell').hidden=false;
  // Contenu visible si JS manque ; un seul passage d’animation, jamais au clavier.
  const reveal=$$('[data-reveal]');
  if('IntersectionObserver' in window && !reduce.matches) {
    document.documentElement.classList.add('js');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting) {entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:.08});
    reveal.forEach(e=>observer.observe(e));
    document.addEventListener('focusin',e=>{const target=e.target.closest('[data-reveal]');if(target) target.classList.add('is-visible');});
    reduce.addEventListener('change',()=>{if(reduce.matches){reveal.forEach(e=>e.classList.add('is-visible'));observer.disconnect();}});
  }
})();
