/* Local simulation only. No requests, storage, or third-party scripts. */
const BiodomBooking = (() => {
  const services = {
    jade: { name: 'Le forfait « Jade »', detail: 'Demi-jambes, aisselles, maillot intégral + SIF', duration: 40, price: 40 },
    demi: { name: 'Demi-jambes', duration: 10, price: 15 },
    jambes: { name: 'Jambes complètes', duration: 20, price: 25 },
    integral: { name: 'Maillot intégral + SIF', duration: 15, price: 25 },
    bresilien: { name: 'Maillot brésilien + SIF', duration: 15, price: 25 },
    gel: { name: 'Renforcement en gel', duration: 60, price: 40 }
  };
  const hours = { 1: [600,1260], 2: [600,1260], 3: [600,1260], 4: [600,1260], 5: [600,1320], 6: [600,1260] };
  const paris = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parisNow(now = new Date()) {
    const parts = Object.fromEntries(paris.formatToParts(now).map(p => [p.type,p.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour)*60 + Number(parts.minute) };
  }
  const asDate = key => new Date(`${key}T12:00:00Z`);
  function dateLabel(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(asDate(key));
  }
  const timeLabel = minute => `${Math.floor(minute/60)}\u00a0h${minute%60 ? `\u00a0${String(minute%60).padStart(2,'0')}` : ''}`;
  function holiday(key) {
    if (['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(key.slice(5))) return true;
    const y = Number(key.slice(0,4));
    const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m+114)/31), day=(h+l-7*m+114)%31+1;
    const easter=new Date(Date.UTC(y,month-1,day,12));
    return [1,39,50].some(offset => { const date=new Date(easter); date.setUTCDate(date.getUTCDate()+offset); return date.toISOString().slice(0,10)===key; });
  }
  function slots(key, duration, now = new Date()) {
    const opening=hours[asDate(key).getUTCDay()];
    if (!opening) return [];
    const current=parisNow(now), seed=Math.floor(asDate(key).getTime()/86400000);
    const result=[];
    for (let minute=opening[0], index=0; minute+duration<=opening[1]; minute+=30,index++) {
      const past=key<current.key || (key===current.key && minute<=current.minute);
      const taken=(seed+index*7+duration)%5===0;
      result.push({minute,available:!past&&!taken,reason:past?'passé':taken?'déjà pris':''});
    }
    return result;
  }
  function days(duration, now = new Date()) {
    const today=asDate(parisNow(now).key);
    return Array.from({length:14},(_,index) => {
      const date=new Date(today); date.setUTCDate(today.getUTCDate()+index);
      const key=date.toISOString().slice(0,10), closed=!hours[date.getUTCDay()];
      return { key, index, closed, holiday:holiday(key), available:!closed&&slots(key,duration,now).some(slot=>slot.available) };
    });
  }
  const validPhone = raw => /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(raw.replace(/[\s.()\-]/g,''));
  return {services,hours,parisNow,asDate,dateLabel,timeLabel,holiday,slots,days,validPhone};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = BiodomBooking;

if (typeof document !== 'undefined') (() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const { services,days,slots,dateLabel,timeLabel,parisNow }=BiodomBooking;
  const state={service:'jade',day:'',time:null,step:0,reached:0,complete:false};
  let lastInput='pointer', transitionVersion=0;
  const form=$('#booking-form'), status=$('#booking-status'), reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const make=(tag,text,className) => {const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el;};
  const announce = message => {status.textContent=message;};
  const selected = () => services[state.service];
  document.addEventListener('keydown',() => {lastInput='keyboard'; document.documentElement.classList.add('keyboard');},true);
  document.addEventListener('pointerdown',() => {lastInput='pointer'; document.documentElement.classList.remove('keyboard');},true);

  function updateSummary() {
    $('#summary-service').textContent=selected().name;
    $('#summary-price').textContent=`${selected().duration===60?'1\u00a0h':`${selected().duration}\u00a0min`} · ${selected().price}\u00a0€`;
    $('#summary-day').textContent=state.day?dateLabel(state.day):'À choisir';
    $('#summary-time').textContent=state.time!==null?timeLabel(state.time):'À choisir';
    $$('[data-edit]').forEach(button => {button.disabled=state.complete || Number(button.dataset.edit)>state.reached;});
    $$('[data-step]').forEach(button => {
      const step=Number(button.dataset.step);
      button.disabled=state.complete || step>state.reached;
      if(step===state.step&&!state.complete)button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
    renderRecap($('#final-recap'));
  }
  function renderRecap(container, includeName=false) {
    container.replaceChildren();
    const title=make('p'); title.append(make('strong',selected().name)); container.append(title);
    if(selected().detail) container.append(make('p',selected().detail));
    if(state.day && state.time!==null) container.append(make('p',`${dateLabel(state.day)} à ${timeLabel(state.time)}`));
    container.append(make('p',`${selected().duration}\u00a0min · ${selected().price}\u00a0€ — tarif indicatif`));
    if(includeName) container.append(make('p',`Prénom saisi pour l’essai\u00a0: ${$('#first-name').value.trim()}`));
    container.append(make('p','13 rue d’Hauteville, 75010 Paris'));
  }
  function focusHeading(step) {
    const heading=$(`#step-title-${step}`);
    heading.focus({preventScroll:true});
    const bounds=heading.getBoundingClientRect();
    if(bounds.top<24 || bounds.bottom>window.innerHeight-100) heading.scrollIntoView({block:'start',behavior:'instant'});
  }
  function showStep(step, focus=true) {
    if(state.complete || step>state.reached)return;
    state.step=step;
    const version=++transitionVersion;
    $$('[data-panel]').forEach(panel => {
      panel.hidden=Number(panel.dataset.panel)!==step;
      panel.classList.remove('is-active');
    });
    const panel=$(`[data-panel="${step}"]`);
    if(reduced.matches||lastInput==='keyboard') panel.classList.add('is-active');
    else requestAnimationFrame(() => requestAnimationFrame(() => {if(version===transitionVersion)panel.classList.add('is-active');}));
    updateSummary();
    announce(`Étape ${step+1} sur 4\u00a0: ${['prestation','jour','heure','coordonnées'][step]}. Simulation uniquement.`);
    if(focus)focusHeading(step);
  }
  function renderDays() {
    const container=$('#day-options'); container.replaceChildren();
    days(selected().duration).forEach(day => {
      const label=make('label',undefined,'day-choice');
      const input=make('input'); input.type='radio'; input.name='day'; input.value=day.key;
      input.disabled=!day.available; input.checked=state.day===day.key;
      input.setAttribute('aria-describedby','day-error');
      const indication=day.closed?'fermé':!day.available?'complet':day.holiday?'férié\u00a0?':day.index===0?'auj.':day.index===1?'demain':'';
      input.setAttribute('aria-label',`${dateLabel(day.key)}${day.closed?', fermé':!day.available?', aucun créneau d’exemple libre':''}${day.holiday?', jour férié, ouverture à confirmer':''}`);
      label.append(input,make('span',dateLabel(day.key,{weekday:'short'}),'day-name'),make('span',dateLabel(day.key,{day:'numeric'}),'day-number'),make('span',dateLabel(day.key,{month:'short'}),'day-month'),make('span',indication||'\u00a0','day-state'));
      container.append(label);
    });
  }
  function renderSlots() {
    const container=$('#slot-options'); container.replaceChildren();
    if(!state.day)return;
    $('#slots-date').textContent=`${dateLabel(state.day)} · ${selected().duration}\u00a0min. Horaires à confirmer.`;
    const all=slots(state.day,selected().duration);
    for(const [title,min,max] of [['Matin',0,720],['Après-midi',720,1080],['Soir',1080,1440]]) {
      const group=all.filter(slot=>slot.minute>=min&&slot.minute<max);
      if(!group.length)continue;
      const count=group.filter(slot=>slot.available).length;
      const fieldset=make('fieldset'),legend=make('legend',`${title} · ${count} ${count===1?'libre':'libres'}`),list=make('div',undefined,'slot-options');
      fieldset.setAttribute('aria-describedby','slot-error');
      group.forEach(slot => {
        const label=make('label',undefined,'slot-choice'),input=make('input'),time=make('time',timeLabel(slot.minute));
        input.type='radio'; input.name='time'; input.value=String(slot.minute); input.disabled=!slot.available; input.checked=state.time===slot.minute;
        input.setAttribute('aria-label',`${timeLabel(slot.minute)}${slot.reason?`, ${slot.reason}`:''}`);
        time.dateTime=`${state.day}T${String(Math.floor(slot.minute/60)).padStart(2,'0')}:${String(slot.minute%60).padStart(2,'0')}`;
        label.append(input,time); if(slot.reason)label.append(make('small',slot.reason));
        list.append(label);
      });
      fieldset.append(legend,list);container.append(fieldset);
    }
    if(!all.some(slot=>slot.available))container.append(make('p','Aucun créneau d’exemple libre. Revenez au choix du jour.','note'));
  }
  function validateAvailability() {
    if(!state.day || !days(selected().duration).some(day=>day.key===state.day&&day.available)) {
      state.day='';state.time=null;state.reached=1;renderDays();updateSummary();
      $('#day-error').textContent='Choisissez un jour avec un créneau d’exemple disponible.';
      return 1;
    }
    if(state.time===null || !slots(state.day,selected().duration).some(slot=>slot.minute===state.time&&slot.available)) {
      state.time=null;state.reached=2;renderSlots();updateSummary();
      $('#slot-error').textContent='Choisissez une heure disponible. Un horaire passé ne peut plus être sélectionné.';
      return 2;
    }
    return null;
  }
  function chooseService(id) {
    if(!services[id])return;
    if(state.service!==id) {state.day='';state.time=null;state.reached=Math.min(state.reached,1);}
    state.service=id;
    const input=$(`input[name="service"][value="${id}"]`); input.checked=true;
    $('#day-error').textContent='';$('#slot-error').textContent='';$('#holiday-note').textContent='';
    renderDays();renderSlots();updateSummary();
  }
  form.addEventListener('change',event => {
    const input=event.target;
    if(input.name==='service')chooseService(input.value);
    if(input.name==='day') {
      state.day=input.value;state.time=null;state.reached=2;
      $('#day-error').textContent='';$('#slot-error').textContent='';
      $('#holiday-note').textContent=BiodomBooking.holiday(state.day)?'Jour férié\u00a0: ouverture à confirmer auprès de l’institut.':'';
      renderSlots();updateSummary();
      announce(`${dateLabel(state.day)} sélectionné. Choisissez ensuite une heure.`);
    }
    if(input.name==='time') {
      state.time=Number(input.value); state.reached=3;$('#slot-error').textContent='';updateSummary();
      announce(`${timeLabel(state.time)} sélectionné. Simulation uniquement.`);
    }
  });
  $$('[data-next]').forEach(button => button.addEventListener('click',() => {
    const next=Number(button.dataset.next);
    if(next===2) {
      if(!state.day || !days(selected().duration).some(day=>day.key===state.day&&day.available)) {
        $('#day-error').textContent='Choisissez un jour pour continuer.';announce('Choisissez un jour pour continuer.');
        $('input[name="day"]:not(:disabled)')?.focus();return;
      }
      renderSlots();
    }
    if(next===3) {const problem=validateAvailability();if(problem!==null){showStep(problem);announce(problem===1?'Le jour doit être choisi à nouveau.':'Choisissez une heure disponible.');return;}}
    state.reached=Math.max(state.reached,next);showStep(next);
  }));
  $$('[data-back],[data-step],[data-edit]').forEach(button => button.addEventListener('click',() => {
    const target=Number(button.dataset.back??button.dataset.step??button.dataset.edit);
    if(target===1)renderDays();if(target===2)renderSlots();showStep(target);
  }));
  $$('[data-book]').forEach(link => link.addEventListener('click',event => {
    event.preventDefault();
    if(state.complete)reset(false);
    chooseService(link.dataset.book);showStep(0,true);
  }));
  function validateField(input, announceError=false) {
    const isName=input.id==='first-name',value=input.value.trim();
    const error=isName?(!value?'Indiquez votre prénom pour essayer le formulaire.':''):(!BiodomBooking.validPhone(value)?'Saisissez un mobile français valide (06, 07 ou +33).':'');
    $(isName?'#name-error':'#phone-error').textContent=error;
    if(error)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');
    if(announceError&&error)announce(error);
    return !error;
  }
  ['#first-name','#phone'].forEach(selector => {
    const input=$(selector);
    input.addEventListener('blur',() => {if(input.value||input.hasAttribute('aria-invalid'))validateField(input);});
    input.addEventListener('input',() => {if(input.hasAttribute('aria-invalid'))validateField(input);});
  });
  form.addEventListener('submit',event => {
    event.preventDefault();
    if(state.step!==3||state.complete)return;
    const availability=validateAvailability();
    if(availability!==null){showStep(availability);announce('L’horaire doit être choisi à nouveau. Rien n’a été envoyé.');return;}
    const nameOK=validateField($('#first-name')),phoneOK=validateField($('#phone'));
    if(!nameOK||!phoneOK){(nameOK?$('#phone'):$('#first-name')).focus();announce('Vérifiez les coordonnées indiquées. Rien n’a été envoyé.');return;}
    state.complete=true;form.hidden=true;$('#booking-success').hidden=false;
    renderRecap($('#success-recap'),true);updateSummary();
    announce('Simulation terminée. Aucun rendez-vous réservé, aucune donnée envoyée.');
    $('#success-title').focus({preventScroll:true});$('#success-title').scrollIntoView({block:'start',behavior:'instant'});
  });
  function reset(focus=true) {
    Object.assign(state,{service:'jade',day:'',time:null,step:0,reached:0,complete:false});
    form.reset();form.hidden=false;$('#booking-success').hidden=true;
    ['#day-error','#slot-error','#name-error','#phone-error','#holiday-note'].forEach(selector=>{$(selector).textContent='';});
    $$('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
    $('#success-recap').replaceChildren();renderDays();renderSlots();showStep(0,focus);
  }
  $('#restart').addEventListener('click',()=>reset());
  window.addEventListener('pagehide',()=>reset(false));
  // Refresh availability after the page has been left open, including midnight in Paris.
  let renderedDay=parisNow().key;
  document.addEventListener('visibilitychange',() => {
    if(document.hidden||state.complete)return;
    const today=parisNow().key;
    if(today!==renderedDay){renderedDay=today;renderDays();}
    if(state.step>=2){const problem=validateAvailability();if(problem!==null)showStep(problem,false);else renderSlots();}
  });

  renderDays();updateSummary();$('#booking-app').hidden=false;
  const root=document.documentElement;
  $$('.menu-section,.practical,.booking-section').forEach(section=>section.setAttribute('data-rule',''));
  if('IntersectionObserver' in window) {
    const reveal=new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){entry.target.classList.add('in-view');reveal.unobserve(entry.target);}
    }),{threshold:.08});
    $$('[data-reveal],[data-rule]').forEach(el=>reveal.observe(el));
    let heroGone=false,bookingVisible=false,footerVisible=false;
    const bar=$('.mobile-bar');
    const visibility=new IntersectionObserver(entries => {
      entries.forEach(entry=>{
        if(entry.target.id==='hero-actions')heroGone=entry.boundingClientRect.bottom<0;
        if(entry.target.id==='reserver')bookingVisible=entry.isIntersecting;
        if(entry.target.id==='pied')footerVisible=entry.isIntersecting;
      });
      bar.classList.toggle('is-visible',heroGone&&!bookingVisible&&!footerVisible);
    },{threshold:0});
    ['#hero-actions','#reserver','#pied'].forEach(selector=>visibility.observe($(selector)));
  } else {
    $$('[data-reveal],[data-rule]').forEach(el=>el.classList.add('in-view'));
    $('.mobile-bar').classList.add('is-visible');
  }
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')));
  window.biodomReady=true;
})();
