/* H-STYLE — essai local. Aucun appel réseau, aucun stockage de coordonnées. */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const SERVICES = {
    homme: { name: 'Coupe homme', duration: 30, price: 18 },
    femme: { name: 'Coupe femme', duration: 40, price: 30 },
    enfant: { name: 'Coupe enfant', duration: 25, price: 14 },
    barbe: { name: 'Taille de barbe', duration: 20, price: 10 }
  };
  // Base 118712 / Pages Jaunes, à confirmer ; les pauses restent des intervalles distincts.
  const HOURS = {0: [], 1: [], 2: [[540,720],[840,1140]], 3: [[540,720],[840,1140]], 4: [[540,720],[840,1140]], 5: [[540,750],[840,1140]], 6: [[540,1080]]};
  const state = { service: null, day: null, time: null, step: 0 };
  const form = $('#booking-form');
  const panels = $$('[data-panel]');
  const stepLinks = $$('[data-step-link]');
  const announce = $('#booking-announcement');
  let keyboard = false;
  let transitionFrame = 0, settleFrame = 0;
  document.addEventListener('keydown', () => { keyboard = true; });
  document.addEventListener('pointerdown', () => { keyboard = false; }, {passive:true});
  const parisFormat = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const longDate = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  const shortDay = new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'});
  const month = new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'});
  const money = value => `${value}\u00a0€`;
  const timeText = value => `${Math.floor(value/60)}\u00a0h${value%60 ? '\u00a0'+String(value%60).padStart(2,'0') : ''}`;
  function parisNow(instant = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(instant).map(part => [part.type,part.value]));
    return { iso:`${p.year}-${p.month}-${p.day}`, minutes:(+p.hour%24)*60 + +p.minute };
  }
  const dateOf = iso => new Date(`${iso}T12:00:00Z`);
  const isoOf = date => date.toISOString().slice(0,10);
  function easter(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    return new Date(Date.UTC(year,Math.floor((h+l-7*m+114)/31)-1,(h+l-7*m+114)%31+1,12));
  }
  function isHoliday(iso) {
    if (['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(iso.slice(5))) return true;
    const e=easter(+iso.slice(0,4));
    return [1,39,50].some(offset => isoOf(new Date(+e+offset*86400000))===iso);
  }
  function slotsFor(iso, duration, now = parisNow()) {
    const seed = +iso.replaceAll('-','');
    return HOURS[dateOf(iso).getUTCDay()].flatMap(([start,end]) => {
      const slots=[];
      for(let minute=start;minute+duration<=end;minute+=15){
        const past = iso < now.iso || (iso===now.iso && minute<=now.minutes);
        const taken=(seed + minute/15)%7===0 || (seed + minute/15)%11===0;
        slots.push({minute,disabled:past||taken,reason:past?'Passé':taken?'Déjà pris':''});
      }
      return slots;
    });
  }
  function option(name,value,disabled,className) {
    const label=document.createElement('label'); label.className=className;
    const input=document.createElement('input'); input.type='radio';input.name=name;input.value=value;input.disabled=disabled;
    label.append(input);return label;
  }
  function textNode(tag,text,parent) {const element=document.createElement(tag);element.textContent=text;parent.append(element);return element;}
  function renderDays() {
    const grid=$('#day-options');grid.replaceChildren();
    const now=parisNow(), first=dateOf(now.iso);
    for(let i=0;i<14;i++) {
      const date=new Date(+first+i*86400000),iso=isoOf(date),closed=HOURS[date.getUTCDay()].length===0;
      const label=option('day',iso,closed,'day-option');
      $('input',label).checked=state.day===iso;
      textNode('span',i===0?'Aujourd’hui':shortDay.format(date),label);
      textNode('strong',String(date.getUTCDate()),label);
      textNode('small',closed?'Fermé':month.format(date),label);
      if(isHoliday(iso)) textNode('small','Férié · à confirmer',label);
      grid.append(label);
    }
  }
  function renderSlots() {
    const grid=$('#time-options');grid.replaceChildren();
    if(!state.day || !state.service)return;
    const slots=slotsFor(state.day,SERVICES[state.service].duration);
    if(!slots.some(s=>s.minute===state.time&&!s.disabled))state.time=null;
    for(const slot of slots){
      const label=option('time',String(slot.minute),slot.disabled,'time-option');
      $('input',label).checked=state.time===slot.minute;
      textNode('span',timeText(slot.minute),label);
      if(slot.reason)textNode('small',slot.reason,label);
      grid.append(label);
    }
    $('#no-slots').hidden=slots.some(slot=>!slot.disabled);
    $('#slot-caption').textContent=`${longDate.format(dateOf(state.day))} · disponibilités fictives. Les horaires barrés sont passés ou déjà pris dans la simulation.`;
  }
  function recap() {
    if(!state.service)return '';
    const service=SERVICES[state.service];
    return `${service.name} · ${state.day?longDate.format(dateOf(state.day)):'jour à choisir'}${state.time!==null?' à '+timeText(state.time):''} · ${service.duration}\u00a0min · ${money(service.price)} indicatifs.`;
  }
  function sync() {
    const service=SERVICES[state.service];
    $('[data-summary-service]').textContent=service?service.name:'À vous de choisir';
    $('[data-summary-day]').textContent=state.day?longDate.format(dateOf(state.day)):'Jour à choisir';
    $('[data-summary-time]').textContent=state.time!==null?timeText(state.time):'Heure à choisir';
    $('[data-summary-price]').textContent=service?`${service.duration}\u00a0min / ${money(service.price)} indicatifs`:'Tarif indicatif';
    $('#final-recap').textContent=recap();
    $$('[data-next]').forEach(button => {const n=+button.dataset.next;button.disabled=n===1?!state.service:n===2?!state.day:state.time===null;});
    stepLinks.forEach((button,index)=>{button.disabled=index===1?!state.service:index===2?!state.day:index===3?state.time===null:false;if(index===state.step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  }
  function go(step, focus = true) {
    if(step>0&&!state.service || step>1&&!state.day || step>2&&state.time===null)return;
    cancelAnimationFrame(transitionFrame); cancelAnimationFrame(settleFrame);
    if(step===1)renderDays();
    if(step===2)renderSlots();
    state.step=step;
    panels.forEach(panel => {panel.hidden=+panel.dataset.panel!==step;panel.classList.remove('is-entering');});
    const panel=panels[step];
    sync();
    if(!keyboard&&!reduce.matches){panel.classList.add('is-entering');transitionFrame=requestAnimationFrame(()=>{settleFrame=requestAnimationFrame(()=>panel.classList.remove('is-entering'));});}
    if(focus){$('h3',panel).focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'auto'});announce.textContent=`Étape ${step+1} sur 4. ${$('h3',panel).textContent}`;}
  }
  function setService(id) {
    if(!SERVICES[id])return;
    state.service=id;state.day=null;state.time=null;
    $('#day-options').replaceChildren(); $('#time-options').replaceChildren();
    announce.textContent=`${SERVICES[id].name} sélectionnée. Choisissez un jour pour cet essai.`;
    $(`input[name="service"][value="${id}"]`).checked=true;
    sync();
  }
  form.addEventListener('change',event=>{
    const target=event.target;
    if(target.name==='service')setService(target.value);
    if(target.name==='day'){state.day=target.value;state.time=null;$('#time-options').replaceChildren();}
    if(target.name==='time')state.time=+target.value;
    sync();
  });
  $$('[data-next]').forEach(button=>button.addEventListener('click',()=>go(+button.dataset.next)));
  $$('[data-back]').forEach(button=>button.addEventListener('click',()=>go(+button.dataset.back)));
  stepLinks.forEach(button=>button.addEventListener('click',()=>go(+button.dataset.stepLink)));
  $$('[data-book]').forEach(link=>link.addEventListener('click',()=>{
    $('#booking-success').hidden=true;form.hidden=false;$('.step-nav').hidden=false;
    setService(link.dataset.book);go(1,false);
    requestAnimationFrame(()=>$('#step-title-1').focus({preventScroll:true}));
    announce.textContent='Prestation choisie. Étape 2 sur 4 : choisissez le jour.';
  }));
  function validate(field) {
    const input=$(field==='name'?'#first-name':'#phone');
    const value=input.value.trim();
    const valid=field==='name'?value.length>=2:/^(?:0[67]|\+33[67]|0033[67])\d{8}$/.test(value.replace(/[\s.()-]/g,''));
    const error=$(field==='name'?'#name-error':'#phone-error');
    error.textContent=valid?'':field==='name'?'Indiquez un prénom d’au moins deux caractères.':'Indiquez un mobile français valide, par exemple 06 12 34 56 78.';
    input.setAttribute('aria-invalid',String(!valid));return valid;
  }
  for(const [id,field] of [['first-name','name'],['phone','phone']]){
    $('#'+id).addEventListener('blur',()=>{if($('#'+id).value || $('#'+id).hasAttribute('aria-invalid'))validate(field);});
    $('#'+id).addEventListener('input',()=>{if($('#'+id).getAttribute('aria-invalid')==='true'){$('#'+(field==='name'?'name-error':'phone-error')).textContent='';$('#'+id).removeAttribute('aria-invalid');}});
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const nameOK=validate('name'),phoneOK=validate('phone');
    if(!nameOK||!phoneOK){$(nameOK?'#phone':'#first-name').focus();return;}
    // Revalider l’heure : une page restée ouverte ne doit pas proposer un créneau passé.
    if(!state.service||!state.day||!slotsFor(state.day,SERVICES[state.service].duration).some(s=>s.minute===state.time&&!s.disabled)){
      state.time=null;go(state.day?2:1);announce.textContent='Ce créneau n’est plus disponible dans la simulation. Choisissez une autre heure.';return;
    }
    $('#success-recap').textContent=`${$('#first-name').value.trim()}, voici votre essai : ${recap()}`;
    form.hidden=true;$('.step-nav').hidden=true;$('#booking-success').hidden=false;
    $('#first-name').value='';$('#phone').value='';
    $('#success-title').focus({preventScroll:true});$('#booking-success').scrollIntoView({block:'nearest',behavior:'auto'});
    announce.textContent='Simulation terminée. Rien n’a été envoyé au salon. Aucun rendez-vous n’est confirmé.';
  });
  $('#restart').addEventListener('click',()=>{
    form.reset();Object.assign(state,{service:null,day:null,time:null,step:0});
    $$('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));$$('.field-error').forEach(error=>error.textContent='');
    $('#booking-success').hidden=true;form.hidden=false;$('.step-nav').hidden=false;go(0);
  });
  const currentDay=dateOf(parisNow().iso).getUTCDay();
  $(`[data-dow="${currentDay}"]`)?.classList.add('is-today');
  document.documentElement.classList.add('js');
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add('is-ready')));
  if('IntersectionObserver' in window&&!reduce.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12});
    $$('[data-reveal]').forEach((row,i)=>{row.classList.add('reveal-ready');row.style.transitionDelay=`${i*60}ms`;observer.observe(row);});
  }
  // Panneau natif : Escape, focus contenu et retour au déclencheur.
  const dialog=$('#booking-dialog');
  let opener=null,dialogFrame=0,dialogSettle=0;
  $$('a[href="#reserver"]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();opener=link;
    cancelAnimationFrame(dialogFrame);cancelAnimationFrame(dialogSettle);
    dialog.classList.remove('is-opening');
    if(!keyboard&&!reduce.matches)dialog.classList.add('is-opening');
    if(!dialog.open)dialog.showModal();
    dialogFrame=requestAnimationFrame(()=>{dialogSettle=requestAnimationFrame(()=>dialog.classList.remove('is-opening'));});
    const heading=$('#booking-success').hidden?$('h3',panels[state.step]):$('#success-title');
    heading.focus({preventScroll:true});
  }));
  $('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(dialogFrame);cancelAnimationFrame(dialogSettle);
    dialog.classList.remove('is-opening');
    opener?.focus({preventScroll:true});
  });
  go(0,false);
  if(location.hash==='#reserver'){opener=$('.nav-book');dialog.showModal();$('#step-title-0').focus({preventScroll:true});}
})();
