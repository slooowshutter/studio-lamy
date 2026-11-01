/* Addict & Cie — simulateur local. Aucun réseau, aucune persistance des coordonnées. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const hours = {0:null,1:null,2:[540,1110],3:[540,1110],4:[540,1110],5:[540,1140],6:[540,1020]};
  const services = {
    consultation:{name:'Consultation couleur',minutes:20,price:15},
    'coupe-s':{name:'Coupe femme · courts',minutes:30,price:45,from:true},
    'coupe-m':{name:'Coupe femme · mi-longs',minutes:60,price:55,from:true},
    'coupe-l':{name:'Coupe femme · longs',minutes:60,price:60,from:true},
    couleur:{name:'Couleur & brushing · courts',minutes:90,price:70},
    gloss:{name:'Gloss & coiffage · courts',minutes:60,price:65},
    homme:{name:'Coupe homme',minutes:30,price:30},
    barbe:{name:'Coupe & barbe',minutes:60,price:40}
  };
  const state = {service:'consultation',date:null,time:null,step:0,visited:0};
  const dateFmt = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  const weekdayFmt = new Intl.DateTimeFormat('fr-FR',{weekday:'short',timeZone:'UTC'});
  const parisFmt = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function parisNow(now = new Date()) {
    const p = Object.fromEntries(parisFmt.formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type,x.value]));
    return {key:`${p.year}-${p.month}-${p.day}`,minutes:Number(p.hour)*60+Number(p.minute)};
  }
  const dateOf = key => new Date(key+'T12:00:00Z');
  const keyOf = date => date.toISOString().slice(0,10);
  function datesFrom(key) {
    const start = dateOf(key);
    return Array.from({length:14},(_,i) => keyOf(new Date(start.getTime()+i*86400000)));
  }
  function timeLabel(min) {
    return `${Math.floor(min/60)}\u00a0h${min%60 ? '\u00a0'+String(min%60).padStart(2,'0') : ''}`;
  }
  const money = item => `${item.from?'dès ':''}${item.price}\u00a0€`;
  function slotsFor(key,minutes,now = parisNow()) {
    const open = hours[dateOf(key).getUTCDay()];
    if(!open) return [];
    const seed = Number(key.replaceAll('-',''));
    const slots = [];
    for(let t=open[0]; t+minutes<=open[1]; t+=30) {
      const past = key<now.key || (key===now.key && t<=now.minutes);
      const taken = (seed+Math.floor(t/30)*7)%5===0;
      slots.push({time:t,disabled:past||taken,reason:past?'passé':'déjà pris'});
    }
    return slots;
  }
  const say = text => { $('#booking-status').textContent=text; };
  function renderDays() {
    const today = parisNow().key;
    if(state.date && !datesFrom(today).includes(state.date)){state.date=null;state.time=null;}
    $('#day-options').innerHTML = datesFrom(today).map((key,i) => {
      const d=dateOf(key),closed=!hours[d.getUTCDay()];
      return `<label class="choice day-choice"><input type="radio" name="day" value="${key}" ${closed?'disabled':''} ${state.date===key?'checked':''} aria-label="${dateFmt.format(d)}${closed?', fermé':''}" aria-describedby="day-error"><span>${weekdayFmt.format(d)}<b>${d.getUTCDate()}</b><small>${closed?'fermé':i===0?'auj.':i===1?'demain':d.toLocaleDateString('fr-FR',{month:'short',timeZone:'UTC'})}</small></span></label>`;
    }).join('');
  }
  function renderSlots() {
    if(!state.date) return;
    const slots=slotsFor(state.date,services[state.service].minutes);
    if(!slots.some(x=>x.time===state.time&&!x.disabled)) state.time=null;
    const free=slots.filter(x=>!x.disabled).length;
    $('#slot-help').textContent=`${dateFmt.format(dateOf(state.date))} · ${free} créneaux fictifs libres. Heures barrées indisponibles. Jours fériés à confirmer.`;
    $('#slot-options').innerHTML=slots.map(x=>`<label class="choice slot-choice"><input type="radio" name="time" value="${x.time}" ${x.disabled?'disabled':''} ${state.time===x.time?'checked':''} aria-label="${timeLabel(x.time)}${x.disabled?', '+x.reason:''}" aria-describedby="time-error"><span>${timeLabel(x.time)}${x.disabled?`<small>${x.reason}</small>`:''}</span></label>`).join('');
    if(!free) $('#slot-options').textContent='Aucune heure disponible pour cette durée. Choisissez un autre jour.';
  }
  function recap() {
    const s=services[state.service];
    return `${s.name} · ${s.minutes}\u00a0min · ${state.date?dateFmt.format(dateOf(state.date)):'jour à choisir'} · ${state.time!==null?timeLabel(state.time):'heure à choisir'} · ${money(s)} indicatifs.`;
  }
  function updateSummary() {
    const s=services[state.service];
    $('#sum-service').textContent=s.name;
    $('#sum-day').textContent=state.date?dateFmt.format(dateOf(state.date)):'À choisir';
    $('#sum-time').textContent=state.time!==null?timeLabel(state.time):'À choisir';
    $('#sum-price').textContent=money(s);
    $('#sum-duration').textContent=`${s.minutes}\u00a0min au salon · à confirmer`;
    $('#final-recap').textContent=recap();
  }
  function focusHeading(heading) {
    heading.focus({preventScroll:true});
    heading.scrollIntoView({behavior:reduce.matches||root.classList.contains('keyboard')?'auto':'smooth',block:'start'});
  }
  function showStep(n,focus=true) {
    state.step=n;
    state.visited=Math.max(state.visited,n);
    $('#success').hidden=true;
    $('#booking-form').hidden=false;
    $('.steps').hidden=false;
    $$('.booking-step').forEach((panel,i)=> {
      panel.hidden=i!==n;
      panel.classList.remove('entering');
      if(i===n && !reduce.matches && !root.classList.contains('keyboard')) {
        panel.classList.add('entering');
        requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('entering')));
      }
    });
    $$('[data-step]').forEach(b=> {
      const v=Number(b.dataset.step);
      b.disabled=v>state.visited;
      if(v===n)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
    updateSummary();
    say(`Étape ${n+1} sur 4. ${$('.booking-step:not([hidden]) h3').textContent}`);
    if(focus) focusHeading($('.booking-step:not([hidden]) h3'));
  }
  function chooseService(id) {
    if(!services[id]) return;
    state.service=id; state.time=null; state.visited=0;
    $$('input[name=service]').forEach(input=>input.checked=input.value===id);
    renderDays();
    if(state.date)renderSlots();
    showStep(0,false);
    $('.booking-step:not([hidden]) h3').focus({preventScroll:true});
    say(`${services[id].name} sélectionné. Choisissez ensuite un jour.`);
  }
  function validName(show=true) {
    const input=$('#first-name');
    const ok=input.value.trim().length>=2;
    if(show){input.setAttribute('aria-invalid',String(!ok));$('#name-error').textContent=ok?'':'Indiquez un prénom d’au moins deux caractères.';}
    return ok;
  }
  function validPhone(show=true) {
    const input=$('#phone');
    const number=input.value.replace(/[\s().-]/g,'');
    const ok=/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(number);
    if(show){input.setAttribute('aria-invalid',String(!ok));$('#phone-error').textContent=ok?'':'Indiquez un mobile français de 10 chiffres commençant par 06 ou 07, ou avec +33.';}
    return ok;
  }
  document.addEventListener('keydown',()=>root.classList.add('keyboard'));
  document.addEventListener('pointerdown',()=>root.classList.remove('keyboard'),{passive:true});
  root.classList.add('js');
  $('#booking-app').hidden=false;
  renderDays();updateSummary();showStep(0,false);
  document.addEventListener('click',event=> {
    const preselect=event.target.closest('[data-service]');
    if(preselect){
      event.preventDefault();chooseService(preselect.dataset.service);
      $('#reserver').scrollIntoView({behavior:reduce.matches?'auto':'smooth',block:'start'});
    }
    const next=event.target.closest('[data-next]');
    if(next){
      const n=Number(next.dataset.next);
      if(n===1)renderDays();
      if(n===2 && !state.date){$('#day-error').textContent='Choisissez un jour d’ouverture pour continuer.';say('Choisissez un jour d’ouverture.');$('input[name=day]:not(:disabled)').focus();return;}
      if(n===2)renderSlots();
      if(n===3 && state.date)renderSlots();
      if(n===3 && state.time===null){$('#time-error').textContent='Choisissez une heure libre pour continuer.';say('Choisissez une heure libre.');$('input[name=time]:not(:disabled)')?.focus();return;}
      showStep(n);
    }
    const back=event.target.closest('[data-back]');
    if(back){if(Number(back.dataset.back)===1)renderDays();showStep(Number(back.dataset.back));}
    const step=event.target.closest('[data-step]');
    if(step&&!step.disabled){const n=Number(step.dataset.step);if(n===1)renderDays();if(n===2)renderSlots();showStep(n);}
  });
  $('#booking-form').addEventListener('change',event=> {
    const input=event.target;
    if(input.name==='service'){state.service=input.value;state.time=null;state.visited=0;showStep(0,false);}
    if(input.name==='day'){state.date=input.value;state.time=null;state.visited=Math.min(state.visited,1);showStep(1,false);$('#day-error').textContent='';renderSlots();say(dateFmt.format(dateOf(state.date))+' sélectionné.');}
    if(input.name==='time'){state.time=Number(input.value);$('#time-error').textContent='';say(timeLabel(state.time)+' sélectionné.');}
    updateSummary();
  });
  $('#first-name').addEventListener('blur',()=>validName());
  $('#phone').addEventListener('blur',()=>validPhone());
  $('#first-name').addEventListener('input',()=>{if($('#first-name').hasAttribute('aria-invalid'))validName();});
  $('#phone').addEventListener('input',()=>{if($('#phone').hasAttribute('aria-invalid'))validPhone();});
  $('#booking-form').addEventListener('submit',event=> {
    event.preventDefault();
    const goodName=validName(),goodPhone=validPhone();
    if(!goodName||!goodPhone){(!goodName?$('#first-name'):$('#phone')).focus();return;}
    if(!state.date||!datesFrom(parisNow().key).includes(state.date)||!slotsFor(state.date,services[state.service].minutes).some(x=>x.time===state.time&&!x.disabled)){
      state.time=null;renderDays();if(state.date)renderSlots();showStep(state.date?2:1);const message='Cette heure n’est plus disponible. Choisissez un autre créneau.';$(state.date?'#time-error':'#day-error').textContent=message;say(message);return;
    }
    $('#booking-form').hidden=true;$('.steps').hidden=true;$('#success').hidden=false;
    $('#success-recap').textContent=`${$('#first-name').value.trim()}, voici votre essai : ${recap()}`;
    focusHeading($('#success h3'));say('Simulation terminée. Aucun rendez-vous pris. Rien n’a été envoyé.');
  });
  $('#restart').addEventListener('click',()=> {
    state.date=null;state.time=null;state.visited=0;state.service='consultation';
    $('#booking-form').reset();
    $$('.field-error').forEach(x=>x.textContent='');
    $$('input[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
    renderDays();showStep(0);
  });
  const day=dateOf(parisNow().key).getUTCDay();
  $(`[data-dow="${day}"]`)?.setAttribute('data-today','');
  if('IntersectionObserver' in window){
    const art=$('.specimen');
    if(art&&!reduce.matches){
      art.classList.add('is-pending');
      const artObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('is-pending');artObserver.unobserve(e.target);}}),{threshold:.12});
      artObserver.observe(art);
      setTimeout(()=>art.classList.remove('is-pending'),1500);
    }
    const scene=$('.house-center');
    if(scene&&!reduce.matches){
      scene.classList.add('is-pending');
      const sceneObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('is-pending');sceneObserver.unobserve(e.target);}}),{threshold:.15});
      sceneObserver.observe(scene);
      setTimeout(()=>scene.classList.remove('is-pending'),1500);
    }
    const rowObserver=new IntersectionObserver(entries=>entries.forEach((e,i)=>{if(e.isIntersecting){e.target.style.setProperty('--row-delay',`${(i%4)*60}ms`);e.target.classList.add('is-seen');rowObserver.unobserve(e.target);}}),{threshold:.2});
    $$('.service-row').forEach(x=>rowObserver.observe(x));
    const visible={hero:true,booking:false,footer:false};
    const bar=$('.mobile-bar');
    const barObserver=new IntersectionObserver(entries=>{
      entries.forEach(e=>visible[e.target.id==='hero-actions'?'hero':e.target.id==='reserver'?'booking':'footer']=e.isIntersecting);
      bar.hidden=visible.hero||visible.booking||visible.footer;
    });
    ['#hero-actions','#reserver','#footer'].forEach(s=>barObserver.observe($(s)));
  }
})();
