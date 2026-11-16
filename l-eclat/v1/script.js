(() => {
  'use strict';
  // Horaires Planity, en minutes depuis minuit ; divergences signalées sur la page.
  const HOURS = {0:null,1:[570,960],2:[570,1080],3:null,4:[570,1080],5:[570,1080],6:[570,900]};
  const DURATION = 60;
  const SERVICE = 'Coloration végétale Kydra avec séchage';
  const DAY_MS = 86400000;
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});
  const weekdayFormat = new Intl.DateTimeFormat('fr-FR', {timeZone:'UTC',weekday:'short'});
  const monthFormat = new Intl.DateTimeFormat('fr-FR', {timeZone:'UTC',month:'short'});
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(now).map(part => [part.type,part.value]));
    return {date:new Date(Date.UTC(+p.year,+p.month-1,+p.day,12)),minute:(+p.hour % 24)*60 + +p.minute};
  }
  function key(date) { return date.toISOString().slice(0,10); }
  function dateFromKey(value) { return new Date(`${value}T12:00:00Z`); }
  function timeLabel(minute) {
    const hours = Math.floor(minute/60), minutes = minute%60;
    return `${hours}\u00a0h${minutes ? '\u00a0'+String(minutes).padStart(2,'0') : ''}`;
  }
  function makeSlots(day, now = new Date()) {
    const date = dateFromKey(day), range = HOURS[date.getUTCDay()];
    if (!range) return [];
    const current = parisNow(now), today = key(current.date), result = [];
    for (let minute = range[0]; minute+DURATION <= range[1]; minute+=30) {
      const past = day < today || (day === today && minute <= current.minute);
      // Indisponibilité d'exemple uniquement ; aucun accès à l'agenda du salon.
      const busy = (date.getUTCDate()+date.getUTCMonth()+minute/30)%7 === 0;
      result.push({minute,disabled:past || busy,reason:past ? 'Passé' : busy ? 'Indisponible' : 'Essai'});
    }
    return result;
  }
  function validPhone(value) {
    const normalized = value.replace(/[\s().-]/g,'').replace(/^(?:\+33|0033)/,'0');
    return /^0[1-9]\d{8}$/.test(normalized);
  }
  /* Interface */
  const root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = $$('[data-panel]');
  const state = {step:0,reached:0,day:null,time:null,complete:false};
  let keyboard = false, transitionId = 0;
  document.addEventListener('keydown', () => {keyboard=true;root.classList.add('au-clavier');},true);
  document.addEventListener('pointerdown', () => {keyboard=false;root.classList.remove('au-clavier');},true);
  document.addEventListener('focusin', event => {
    root.classList.toggle('saisie',event.target.matches('input:not([type=radio])'));
  });
  document.addEventListener('focusout', event => {
    if (event.target.matches('input:not([type=radio])')) root.classList.remove('saisie');
  });

  function announce(message) { $('#annonce').textContent = message; }
  function availableStep(step) {
    if (state.complete) return false;
    if (step===0) return true;
    if (step===1) return state.reached>=1;
    if (step===2) return Boolean(state.day) && state.reached>=2;
    return Boolean(state.day && state.time!==null) && state.reached>=3;
  }
  function updateSummary() {
    $('#resume-jour').textContent = state.day ? dateFormat.format(dateFromKey(state.day)) : 'À choisir';
    $('#resume-heure').textContent = state.time!==null ? timeLabel(state.time) : 'À choisir';
    $$('.summary-list li').forEach((item,index) => item.toggleAttribute('data-complet',index===0 || (index===1 && Boolean(state.day)) || (index===2 && state.time!==null)));
    $$('[data-step]').forEach(button => {
      const step = Number(button.dataset.step);
      button.disabled = !availableStep(step);
      if (button.closest('.steps') && step===state.step && !state.complete) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    $('#recap-final').textContent = state.day && state.time!==null
      ? `Essai : ${SERVICE}, le ${dateFormat.format(dateFromKey(state.day))} à ${timeLabel(state.time)}. Aucune réservation réelle.` : '';
  }
  function createChoice(name,value,parts,disabled,label,checked=false) {
    const holder = document.createElement('label'); holder.className=disabled ? 'choice choice-disabled' : 'choice';
    const input = document.createElement('input'); input.type='radio'; input.name=name;input.value=String(value);input.disabled=disabled;input.checked=checked;input.setAttribute('aria-label',label);
    const face = document.createElement('span'); face.className='choice-face'; face.setAttribute('aria-hidden','true');
    parts.forEach(([className,text]) => {const span=document.createElement('span');span.className=className;span.textContent=text;face.append(span);});
    holder.append(input,face);return holder;
  }
  function renderDays() {
    const start = parisNow().date, dates = Array.from({length:14},(_,index) => new Date(start.getTime()+index*DAY_MS));
    if (state.day && !dates.some(date => key(date)===state.day)) {state.day=null;state.time=null;state.reached=1;}
    const fragment = document.createDocumentFragment();
    dates.forEach(date => {
      const value=key(date), range=HOURS[date.getUTCDay()], ended=range && !makeSlots(value).some(slot => !slot.disabled);
      const status = !range ? 'Fermé' : ended ? 'Terminé' : monthFormat.format(date);
      const disabled=!range || ended;
      fragment.append(createChoice('jour',value,[['day-week',weekdayFormat.format(date)],['day-number',String(date.getUTCDate())],['day-month',status]],disabled,`${dateFormat.format(date)}${!range ? ', fermé selon Planity' : ended ? ', aucun créneau restant dans la simulation' : ', simulation'}`,state.day===value));
    });
    $('#jours').replaceChildren(fragment);
  }
  function renderSlots() {
    $('#jour-choisi').textContent = `Le ${dateFormat.format(dateFromKey(state.day))} — horaires à confirmer.`;
    const fragment = document.createDocumentFragment();
    const slots = makeSlots(state.day);
    if (state.time!==null && !slots.some(slot => slot.minute===state.time && !slot.disabled)) state.time=null;
    slots.forEach(slot => fragment.append(createChoice('heure',slot.minute,[['slot-hour',timeLabel(slot.minute)],['slot-state',slot.reason]],slot.disabled,`${timeLabel(slot.minute)}, ${slot.reason.toLowerCase()}, simulation`,state.time===slot.minute)));
    $('#heures').replaceChildren(fragment);
    const hasSlots=slots.some(slot => !slot.disabled);
    $('#aucun-creneau').hidden=hasSlots;
    return hasSlots;
  }
  function enterPanel(element,heading) {
    const id=++transitionId;
    element.classList.remove('arrivee');
    if (!reduced.matches && !keyboard) {
      element.classList.add('arrivee');
      requestAnimationFrame(() => requestAnimationFrame(() => {if(id===transitionId) element.classList.remove('arrivee');}));
    }
    heading.focus({preventScroll:true});
    const bounds=heading.getBoundingClientRect();
    if (bounds.top<20 || bounds.bottom>window.innerHeight-100) heading.scrollIntoView({block:'start',behavior:'instant'});
  }
  function setStep(step,focus=true) {
    if (step===2 && !state.day) return;
    if (step===3 && (state.time===null || !state.day)) return;
    state.step=step;state.reached=Math.max(state.reached,step);
    if(step===1) renderDays();
    const noSlots=step===2 && !renderSlots();
    panels.forEach((panel,index) => {panel.hidden=index!==step;panel.classList.remove('arrivee');});
    updateSummary();
    const panel=panels[step], heading=panel.querySelector('h3');
    announce(`Étape ${step+1} sur 4 : ${heading.textContent}${noSlots ? ' Il ne reste aucun créneau de simulation ce jour. Choisissez un autre jour.' : ''}`);
    if(focus) enterPanel(panel,heading);
  }
  function clearError(name) {
    $(`#erreur-${name}`).hidden=true;
    const input=$(`#${name}`) || $(`#groupe-${name}`);
    if(input) input.removeAttribute('aria-invalid');
  }
  function showError(name,message) {
    const error=$(`#erreur-${name}`);if(message) error.textContent=message;error.hidden=false;
    const input=$(`#${name}`) || $(`#groupe-${name}`);if(input) input.setAttribute('aria-invalid','true');
    announce(error.textContent);
  }
  function slotStillValid() {return state.day && state.time!==null && makeSlots(state.day).some(slot => slot.minute===state.time && !slot.disabled);}
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next=Number(button.dataset.next);
    if(next===2 && !state.day) {showError('jour');$('#jours input:not(:disabled)')?.focus();return;}
    if(next===3 && !slotStillValid()) {
      state.time=null;renderSlots();updateSummary();showError('heure');$('#heures input:not(:disabled)')?.focus();return;
    }
    setStep(next);
  }));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => {const step=Number(button.dataset.step);if(availableStep(step)) setStep(step);}));
  $('#reservation').addEventListener('change', event => {
    if(event.target.name==='jour') {
      state.day=event.target.value;state.time=null;state.reached=Math.min(state.reached,2);clearError('jour');updateSummary();
    }
    if(event.target.name==='heure') {state.time=Number(event.target.value);clearError('heure');updateSummary();}
  });
  ['prenom','telephone'].forEach(name => $(`#${name}`).addEventListener('input',()=>clearError(name)));
  $('#reservation').addEventListener('submit', event => {
    event.preventDefault();
    if (state.step!==3) return;
    if(!slotStillValid()) {state.time=null;setStep(2);showError('heure','Ce créneau est maintenant passé. Choisissez une autre heure pour la simulation.');return;}
    const firstName=$('#prenom').value.trim(), phone=$('#telephone').value;
    const badName=!firstName, badPhone=!validPhone(phone);
    if(badName) showError('prenom');else clearError('prenom');
    if(badPhone) showError('telephone');else clearError('telephone');
    if(badName || badPhone) {$(badName ? '#prenom' : '#telephone').focus();return;}
    state.complete=true;updateSummary();
    $('#reservation').hidden=true;$('#succes').hidden=false;
    $('#message-succes').textContent=`${firstName}, vous avez essayé le parcours pour ${SERVICE.toLowerCase()}, le ${dateFormat.format(dateFromKey(state.day))} à ${timeLabel(state.time)}.`;
    announce('Simulation terminée. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.');
    enterPanel($('#succes'),$('#titre-succes'));
  });
  $('#recommencer').addEventListener('click', () => {
    $('#reservation').reset();['prenom','telephone','jour','heure'].forEach(clearError);
    state.day=null;state.time=null;state.step=0;state.reached=0;state.complete=false;
    $('#message-succes').textContent='';$('#succes').hidden=true;$('#reservation').hidden=false;
    setStep(0);
  });
  renderDays();updateSummary();$('#interface-reservation').hidden=false;

  // Le fil progresse sur son propre calque ; les mesures ne se font qu'au redimensionnement.
  const track=$('.path-track'), fill=$('.path-fill');
  let trackStart=0,trackHeight=1,queued=false;
  function drawPath() {
    queued=false;
    const ratio=reduced.matches ? 1 : Math.min(1,Math.max(.001,(window.scrollY+window.innerHeight*.7-trackStart)/trackHeight));
    fill.style.transform=`scaleY(${ratio})`;
  }
  function measurePath() {trackStart=track.getBoundingClientRect().top+window.scrollY;trackHeight=track.offsetHeight;drawPath();}
  function schedulePath() {if(!queued) {queued=true;requestAnimationFrame(drawPath);}}
  window.addEventListener('scroll',schedulePath,{passive:true});
  window.addEventListener('resize',measurePath,{passive:true});
  if('ResizeObserver' in window) new ResizeObserver(measurePath).observe($('#chemin'));
  if(document.fonts) document.fonts.ready.then(measurePath);
  const reveals=$$('.reveal,.node');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer=new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting) {entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:.12});
    root.classList.add('js');reveals.forEach(element => observer.observe(element));
  } else reveals.forEach(element => element.classList.add('is-visible'));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  reduced.addEventListener('change',()=>{if(reduced.matches) reveals.forEach(element=>element.classList.add('is-visible'));drawPath();});
  measurePath();
})();
