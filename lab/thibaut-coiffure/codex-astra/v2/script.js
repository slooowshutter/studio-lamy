/* Thibaut Coiffure. Local preview only: no requests and no persistent storage. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hours = {0:null,1:null,2:[540,1170],3:[540,1200],4:[540,1170],5:[540,1200],6:[540,1200]};
  const services = $$('[data-service]').map(el => ({id:el.dataset.service,name:el.dataset.name,duration:Number(el.dataset.duration),price:Number(el.dataset.price),from:el.dataset.from==='true',technical:el.dataset.technical==='true'}));
  const state = {service:null,day:null,time:null,step:0,completed:false};
  let keyboard = false;
  let animation;
  reduceMotion.addEventListener('change', event => { if(event.matches && animation)animation.cancel(); });
  document.addEventListener('keydown', () => { keyboard = true; document.documentElement.dataset.keyboard='true'; if(animation)animation.cancel(); });
  document.addEventListener('pointerdown', () => { keyboard = false; delete document.documentElement.dataset.keyboard; }, {passive:true});
  const durationText = value => value < 60 ? `${value}\u00a0min` : `${Math.floor(value/60)}\u00a0h${value%60 ? `\u00a0${String(value%60).padStart(2,'0')}` : ''}`;
  const timeText = value => `${String(Math.floor(value/60)).padStart(2,'0')}\u00a0h\u00a0${String(value%60).padStart(2,'0')}`;
  const priceText = service => `${service.from ? 'Dès ' : ''}${service.price}\u00a0€`;
  const serviceSelected = () => services.find(service => service.id === state.service);
  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type,part.value]));
    return {key:`${values.year}-${values.month}-${values.day}`,minutes:Number(values.hour)*60+Number(values.minute)};
  }
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const dateKey = date => date.toISOString().slice(0,10);
  const dateText = key => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Paris'}).format(dateFromKey(key));
  function holiday(key) {
    if (['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(key.slice(5))) return true;
    const year = Number(key.slice(0,4));
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
    const easter=new Date(Date.UTC(year,month-1,day,12));
    return [1,39,50].some(offset => dateKey(new Date(easter.getTime()+offset*86400000))===key);
  }
  function slotList(key, duration) {
    const opening = hours[dateFromKey(key).getUTCDay()];
    if (!opening) return [];
    const now = parisNow();
    const hash = Number(key.replaceAll('-',''));
    const slots = [];
    for (let minute=opening[0];minute+duration<=opening[1];minute+=30) {
      const past = key < now.key || (key===now.key && minute<=now.minutes);
      const taken = (hash+Math.floor(minute/30)*7)%11<2;
      slots.push({minute,disabled:past||taken,reason:past?'Passé':taken?'Déjà pris':'Disponible'});
    }
    return slots;
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className=className;
    if (text !== undefined) el.textContent=text;
    return el;
  }
  function radio(name,value,disabled=false) {
    const input=element('input');
    input.type='radio';input.name=name;input.value=String(value);input.disabled=disabled;
    return input;
  }
  function pulse(el) {
    if (animation) animation.cancel();
    if (reduceMotion.matches || keyboard || !el.animate) return;
    animation=el.animate([{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.23,1,.32,1)'});
  }
  const intents={
    cut:{label:'Entretenir ou transformer',copy:'La longueur et l’envie font la différence. Pour un grand changement, parlons-en au salon.',link:'Voir les coupes',href:'#prestations'},
    color:{label:'La couleur se prépare',copy:'Racines ou changement de couleur : le salon précise le forfait et les suppléments avec vous.',link:'Parler de ma couleur',href:'tel:+33466272850'},
    light:{label:'D’abord, le diagnostic',copy:'Avant un balayage, le salon examine vos cheveux. Une mèche test peut être nécessaire avant de réserver.',link:'Appeler pour le diagnostic',href:'tel:+33466272850'}
  };
  $$('[data-intent]').forEach(button=>button.addEventListener('click',()=>{
    const intent=intents[button.dataset.intent];
    $$('[data-intent]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    $('#intent-label').textContent=intent.label;$('#intent-copy').textContent=intent.copy;
    $('#intent-link').textContent=`${intent.link} →`;$('#intent-link').href=intent.href;
    pulse($('.intent-answer'));
  }));
  function buildServices() {
    services.forEach(service=>{
      const label=element('label','service-option');
      const input=radio('service',service.id);
      input.setAttribute('aria-describedby','service-error');
      const copy=element('span','',service.name);
      copy.append(element('small','',`${durationText(service.duration)}${service.technical?' · Diagnostic à prévoir':''}`));
      label.append(input,copy,element('span','option-price',priceText(service)));
      $('#service-options').append(label);
      input.addEventListener('change',()=>selectService(service.id));
    });
  }
  function selectService(id) {
    if(state.service!==id){state.service=id;state.day=null;state.time=null;}
    $$('input[name="service"]').forEach(input=>{input.checked=input.value===id;});
    $('#service-error').textContent='';
    updateSummary();
  }
  function buildDays() {
    $$('#day-options label').forEach(label=>label.remove());
    const today=dateFromKey(parisNow().key);
    const last=new Date(today.getTime()+13*86400000);
    const rangeFormat=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
    $('#calendar-range').textContent=`Du ${rangeFormat.format(today)} au ${rangeFormat.format(last)}`;
    for(let offset=0;offset<14;offset++){
      const date=new Date(today.getTime()+offset*86400000),key=dateKey(date);
      const closed=!hours[date.getUTCDay()];
      const full=!closed&&!slotList(key,serviceSelected().duration).some(slot=>!slot.disabled);
      const label=element('label','day-option');
      const input=radio('day',key,closed||full);input.checked=state.day===key;
      input.setAttribute('aria-label',`${dateText(key)}${closed?', fermé':full?', aucun créneau':holiday(key)?', férié, ouverture à confirmer':''}`);
      input.setAttribute('aria-describedby','day-error');
      label.append(input,element('span','day-week',new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'}).format(date)),element('span','day-number',String(date.getUTCDate())),element('span','day-month',new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'}).format(date)),element('span','day-state',closed?'Fermé':full?'Complet':holiday(key)?'Férié · à confirmer':'Ouvert'));
      $('#day-options').append(label);
      input.addEventListener('change',()=>{state.day=key;state.time=null;$('#day-error').textContent='';updateSummary();});
    }
    if(state.day && !$$('input[name="day"]').some(input=>input.value===state.day&&!input.disabled)){state.day=null;state.time=null;updateSummary();}
  }
  function buildTimes() {
    $$('#time-options label').forEach(label=>label.remove());
    $('#slot-description').textContent=`${dateText(state.day)} · ${durationText(serviceSelected().duration)}. Le rendez-vous se termine avant la fermeture.`;
    slotList(state.day,serviceSelected().duration).forEach(slot=>{
      const label=element('label','time-option');
      const input=radio('time',slot.minute,slot.disabled);input.checked=state.time===slot.minute;
      input.setAttribute('aria-label',`${timeText(slot.minute)}, ${slot.reason}`);
      input.setAttribute('aria-describedby','time-error');
      label.append(input,element('span','',timeText(slot.minute)),element('small','',slot.reason));
      $('#time-options').append(label);
      input.addEventListener('change',()=>{state.time=slot.minute;$('#time-error').textContent='';updateSummary();});
    });
    if(state.time!==null&&!slotList(state.day,serviceSelected().duration).some(slot=>slot.minute===state.time&&!slot.disabled)){state.time=null;updateSummary();}
  }
  function updateSummary() {
    const service=serviceSelected();
    $('#summary-service').textContent=service?service.name:'À choisir';
    $('#summary-day').textContent=state.day?dateText(state.day):'À choisir';
    $('#summary-time').textContent=state.time!==null?timeText(state.time):'À choisir';
    $('#summary-duration').textContent=service?durationText(service.duration):'—';
    $('#summary-price').textContent=service?priceText(service):'—';
    $$('[data-step]').forEach(button=>{
      const step=Number(button.dataset.step);
      button.disabled=state.completed||step>0&&(!state.service||step>1&&!state.day||step>2&&state.time===null);
      if(step===state.step&&!state.completed)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
  }
  function goStep(step,focus=true) {
    if(step>0&&!state.service||step>1&&!state.day||step>2&&state.time===null)return;
    state.step=step;
    if(step===1)buildDays();
    if(step===2)buildTimes();
    if(step===3)$('#technical-note').hidden=!serviceSelected().technical;
    $$('[data-panel]').forEach(panel=>{panel.hidden=Number(panel.dataset.panel)!==step;});
    updateSummary();
    const heading=$(`#step-title-${step}`);
    $('#booking-announcement').textContent=`Étape ${step+1} sur 4 : ${heading.textContent}`;
    if(focus){heading.focus({preventScroll:true});heading.scrollIntoView({behavior:'instant',block:'nearest'});pulse(heading.parentElement);}
  }
  function failStep(message,target) {
    $(target).textContent=message;
    const input=$('[data-panel]:not([hidden]) input:not(:disabled)');
    if(input)input.focus();
  }
  function next(step) {
    if(step===1&&!state.service)return failStep('Choisissez une prestation pour continuer.','#service-error');
    if(step===2&&!state.day)return failStep('Choisissez un jour ouvert pour continuer.','#day-error');
    if(step===3&&state.time===null)return failStep('Choisissez un horaire disponible pour continuer.','#time-error');
    goStep(step);
  }
  function validateName() {
    const valid=$('#first-name').value.trim().length>=2;
    $('#first-name').setAttribute('aria-invalid',String(!valid));
    $('#name-error').textContent=valid?'':'Indiquez un prénom d’au moins deux caractères.';
    return valid;
  }
  function validatePhone() {
    const number=$('#phone').value.replace(/[\s.()\-]/g,'');
    const valid=/^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(number);
    $('#phone').setAttribute('aria-invalid',String(!valid));
    $('#phone-error').textContent=valid?'':'Indiquez un mobile français, par exemple 06 12 34 56 78.';
    return valid;
  }
  function submit(event) {
    event.preventDefault();
    const nameOK=validateName(),phoneOK=validatePhone();
    if(!nameOK||!phoneOK){(nameOK?$('#phone'):$('#first-name')).focus();return;}
    if(!state.day||state.time===null||!serviceSelected())return;
    const stillValid=slotList(state.day,serviceSelected().duration).some(slot=>slot.minute===state.time&&!slot.disabled);
    if(!stillValid){state.time=null;goStep(2);$('#time-error').textContent='Ce créneau est maintenant passé. Choisissez une autre heure ou un autre jour.';return;}
    const name=$('#first-name').value.trim();
    $('#success-greeting').textContent=`${name}, voici ce que donnerait votre sélection.`;
    $('#success-recap').replaceChildren();
    [['Prestation',serviceSelected().name],['Date',dateText(state.day)],['Heure',timeText(state.time)],['Durée',durationText(serviceSelected().duration)],['Indicatif',priceText(serviceSelected())]].forEach(([key,value])=>{
      const row=element('div');row.append(element('dt','',key),element('dd','',value));$('#success-recap').append(row);
    });
    state.completed=true;updateSummary();
    $('#booking-form').hidden=true;$('#booking-success').hidden=false;
    $('#first-name').value='';$('#phone').value='';
    $('#booking-announcement').textContent='Démonstration terminée. Aucun rendez-vous pris, aucune donnée envoyée.';
    $('#success-title').focus({preventScroll:true});$('#success-title').scrollIntoView({behavior:'instant',block:'nearest'});pulse($('#booking-success'));
  }
  function reset() {
    state.service=null;state.day=null;state.time=null;state.completed=false;
    $('#booking-form').reset();$('#booking-form').hidden=false;$('#booking-success').hidden=true;
    $$('.field-error').forEach(el=>{el.textContent='';});
    $$('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    goStep(0);
  }
  buildServices();
  $('#booking-app').hidden=false;
  $$('[data-next]').forEach(button=>button.addEventListener('click',()=>next(Number(button.dataset.next))));
  $$('[data-back]').forEach(button=>button.addEventListener('click',()=>goStep(Number(button.dataset.back))));
  $$('[data-step]').forEach(button=>button.addEventListener('click',()=>goStep(Number(button.dataset.step))));
  $$('[data-pick]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();if(state.completed)reset();selectService(link.dataset.pick);goStep(1);
  }));
  $('#booking-form').addEventListener('submit',submit);
  $('#first-name').addEventListener('blur',validateName);$('#phone').addEventListener('blur',validatePhone);
  $('#restart').addEventListener('click',reset);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!state.completed){if(state.step===1)buildDays();if(state.step===2&&state.day)buildTimes();}});
  updateSummary();
})();
