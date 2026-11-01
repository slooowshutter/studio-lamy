/* Sam Coiffure — démonstration locale. Aucun envoi, aucun stockage. */
(() => {
  'use strict';
  const SERVICES = {
    coupe: { name: 'Coupe homme', duration: 30, price: 18 },
    barbe: { name: 'La barbe', duration: 20, price: 10 },
    duo: { name: 'Coupe + barbe', duration: 45, price: 25 },
    enfant: { name: 'Coupe enfant', duration: 25, price: 12 }
  };
  // Samedi : deux annuaires le donnent ouvert, Pages Jaunes le donne fermé.
  // Le conflit est affiché dans les horaires, le calendrier et le récapitulatif.
  const HOURS = [[], [[540,1110]], [[540,1110]], [[540,1110]], [[540,1110]], [[510,750],[870,1110]], [[510,1110]]];
  const parisFormatter = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'UTC' });
  const shortFormatter = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short', timeZone:'UTC' });
  const dateObj = key => new Date(key + 'T12:00:00Z');
  function paris(now = new Date()) {
    const p = Object.fromEntries(parisFormatter.formatToParts(now).map(x => [x.type,x.value]));
    return { key: `${p.year}-${p.month}-${p.day}`, minute: +p.hour * 60 + +p.minute };
  }
  const timeLabel = n => `${Math.floor(n/60)}\u00a0h${n%60 ? '\u00a0'+String(n%60).padStart(2,'0') : ''}`;
  function easter(year) {
    const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114;
    return new Date(Date.UTC(year,Math.floor(n/31)-1,n%31+1,12));
  }
  function holiday(key) {
    const year=+key.slice(0,4), fixed=['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25','12-26'];
    if(fixed.includes(key.slice(5))) return true;
    return [-2,1,39,50].some(offset => {const d=easter(year);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)===key;});
  }
  function ranges(key) { return holiday(key) ? [] : HOURS[dateObj(key).getUTCDay()]; }
  function dates(now = new Date()) {
    const first=dateObj(paris(now).key);
    return Array.from({length:14},(_,i)=>{const d=new Date(first);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  }
  function slots(key,service,now = new Date()) {
    if(!SERVICES[service]) return [];
    const local=paris(now), length=SERVICES[service].duration;
    const seed=+key.replaceAll('-','');
    return ranges(key).flatMap(([open,close])=>{
      const out=[];
      for(let start=open;start+length<=close;start+=15){
        const past=key<local.key || (key===local.key && start<=local.minute);
        const taken=(seed+Math.floor(start/15)*7)%11===0;
        out.push({start,disabled:past||taken,reason:past?'passé':taken?'déjà pris':''});
      }
      return out;
    });
  }
  function validPhone(value) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s.()\-]/g,'')); }
  const core={SERVICES,HOURS,paris,timeLabel,holiday,ranges,dates,slots,validPhone};
  if(typeof module!=='undefined' && module.exports) module.exports=core;
  if(typeof document==='undefined') return;
  const $ = s=>document.querySelector(s), $$ = s=>Array.from(document.querySelectorAll(s));
  const root=document.documentElement, reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const state={step:0,service:null,date:null,time:null};
  let keyboard=false, lastDay=paris().key;
  document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key.startsWith('Arrow')){keyboard=true;root.classList.add('keyboard');}});
  document.addEventListener('pointerdown',()=>{keyboard=false;root.classList.remove('keyboard');},{passive:true});
  function announce(text){$('#booking-status').textContent=text;}
  function summary() {
    const s=SERVICES[state.service];
    $('#sum-service').textContent=s?s.name:'Votre prochaine coupe';
    $('#sum-date').textContent=state.date?dayFormatter.format(dateObj(state.date)):'Un jour à choisir';
    $('#sum-time').textContent=state.time!==null?timeLabel(state.time):'Une heure à choisir';
    $('#sum-price').textContent=s?`${s.duration}\u00a0min / ${s.price}\u00a0€`:'—';
    const recap=s&&state.date&&state.time!==null?`${s.name} · ${dayFormatter.format(dateObj(state.date))} à ${timeLabel(state.time)} · ${s.duration}\u00a0min · ${s.price}\u00a0€ indicatifs. ${dateObj(state.date).getUTCDay()===6?'Samedi : ouverture à confirmer. ':''}Simulation uniquement.`:'';
    $('#final-recap').textContent=recap;
    $('#success-recap').textContent=recap;
    $$('[data-goto]').forEach(b=>{const n=+b.dataset.goto;b.disabled=(n===1&&!s)||(n===2&&!state.date)||(n===3&&state.time===null);if(n===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function renderDates() {
    const available=dates();
    if(state.date&&!available.includes(state.date)){state.date=null;state.time=null;}
    $('#dates').innerHTML='<legend class="sr-only">Choisir un jour</legend>'+available.map((key,i)=>{
      const closed=!ranges(key).length, day=dateObj(key), sat=day.getUTCDay()===6;
      const exhausted=!closed&&!slots(key,state.service).some(x=>!x.disabled);
      if(exhausted&&state.date===key){state.date=null;state.time=null;}
      const reason=closed?(holiday(key)?'férié · fermé':'fermé'):exhausted?'terminé':sat?'à confirmer':i===0?'aujourd’hui':i===1?'demain':'';
      return `<label class="choice"><input type="radio" name="date" value="${key}" ${closed||exhausted?'disabled':''} ${key===state.date?'checked':''} aria-label="${dayFormatter.format(day)}${reason?', '+reason:''}"><span>${shortFormatter.format(day).split(' ')[0]}</span><strong>${day.getUTCDate()}</strong><span>${new Intl.DateTimeFormat('fr-FR',{month:'short',timeZone:'UTC'}).format(day)}</span><small>${reason||'\u00a0'}</small></label>`;
    }).join('');
  }
  function renderSlots() {
    if(!state.date) return;
    const all=slots(state.date,state.service);
    if(state.time!==null&&!all.some(x=>x.start===state.time&&!x.disabled)) state.time=null;
    $('#slot-context').textContent=`${dayFormatter.format(dateObj(state.date))} · ${all.filter(x=>!x.disabled).length} créneaux fictifs disponibles.${dateObj(state.date).getUTCDay()===5?' Coupure de 12\u00a0h\u00a030 à 14\u00a0h\u00a030.':''}${dateObj(state.date).getUTCDay()===6?' Ouverture du samedi à confirmer.':''}`;
    $('#slots').innerHTML='<legend class="sr-only">Choisir une heure</legend>'+all.map(x=>`<label class="choice"><input type="radio" name="time" value="${x.start}" ${x.disabled?'disabled':''} ${state.time===x.start?'checked':''} aria-label="${timeLabel(x.start)}${x.reason?', '+x.reason:''}"><strong>${timeLabel(x.start)}</strong><small>${x.reason||'disponible'}</small></label>`).join('');
  }
  function focusInView(target) {
    target.focus({preventScroll:true});
    const offset=window.innerWidth<=700?$('.selection').offsetHeight+20:24;
    const box=target.getBoundingClientRect();
    if(box.top<offset||box.bottom>window.innerHeight-100) window.scrollTo({top:window.scrollY+box.top-offset,behavior:'instant'});
  }
  function showStep(n,focus=true) {
    if(n===1) renderDates();
    if(n===2) renderSlots();
    state.step=n;
    $$('.step').forEach(s=>{s.hidden=+s.dataset.step!==n;s.classList.remove('entering');});
    const panel=$(`[data-step="${n}"]`);
    if(!keyboard&&!reduced.matches){panel.classList.add('entering');requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.remove('entering')));}
    $('#back').hidden=n===0;
    $('#next').textContent=n===3?'Terminer la simulation →':'Continuer →';
    $('#form-error').textContent='';
    summary();
    if(focus) focusInView($('#step-'+n));
    announce(`Étape ${n+1} sur 4. ${$('#step-'+n).textContent}`);
  }
  function fail(message,target){$('#form-error').textContent=message;announce(message);if(target)target.focus();}
  function validateField(field) {
    const isName=field.id==='first-name';
    const okay=isName?field.value.trim().length>=2:validPhone(field.value);
    const error=isName?$('#name-error'):$('#phone-error');
    error.textContent=okay?'':isName?'Indiquez au moins deux caractères.':'Indiquez un mobile français, par exemple 06 12 34 56 78.';
    field.setAttribute('aria-invalid',String(!okay));return okay;
  }
  $('#booking-form').addEventListener('change',e=>{
    if(e.target.name==='service'){state.service=e.target.value;state.date=null;state.time=null;}
    if(e.target.name==='date'){state.date=e.target.value;state.time=null;}
    if(e.target.name==='time')state.time=+e.target.value;
    $('#form-error').textContent='';summary();
  });
  $('#booking-form').addEventListener('submit',e=>{
    e.preventDefault();
    if(state.step===0&&!state.service)return fail('Choisissez une prestation pour continuer.',$('input[name="service"]'));
    if(state.step===1&&!state.date)return fail('Choisissez un jour disponible.',$('input[name="date"]:not(:disabled)'));
    if(state.step===2&&state.time===null)return fail('Choisissez une heure disponible.',$('input[name="time"]:not(:disabled)'));
    if(state.step<3){showStep(state.step+1);return;}
    const goodName=validateField($('#first-name')),goodPhone=validateField($('#phone'));
    if(!goodName||!goodPhone){(!goodName?$('#first-name'):$('#phone')).focus();announce('Vérifiez les coordonnées indiquées.');return;}
    if(!dates().includes(state.date)||!slots(state.date,state.service).some(x=>x.start===state.time&&!x.disabled)){
      state.time=null;showStep(1);fail('Ce créneau est passé. Choisissez à nouveau un jour et une heure.');return;
    }
    summary();$('#booking-form').hidden=true;$('.step-nav').hidden=true;$('#success').hidden=false;
    focusInView($('#success-title'));announce('Démonstration terminée. Aucun rendez-vous pris, aucun envoi.');
    $('#first-name').value='';$('#phone').value='';
  });
  $('#back').addEventListener('click',()=>showStep(Math.max(0,state.step-1)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click',()=>showStep(+b.dataset.goto)));
  for(const field of [$('#first-name'),$('#phone')]){
    field.addEventListener('blur',()=>{if(field.value)validateField(field);});
    field.addEventListener('input',()=>{if(field.getAttribute('aria-invalid')==='true')validateField(field);});
  }
  function reset(service=null) {
    $('#booking-form').reset();Object.assign(state,{step:0,service,date:null,time:null});
    $('#success').hidden=true;$('#booking-form').hidden=false;$('.step-nav').hidden=false;
    for(const id of ['name-error','phone-error','form-error'])$('#'+id).textContent='';
    $('#first-name').removeAttribute('aria-invalid');$('#phone').removeAttribute('aria-invalid');
    if(service)$(`input[value="${service}"]`).checked=true;
    showStep(service?1:0);
  }
  $('#restart').addEventListener('click',()=>reset());
  $$('[data-book]').forEach(a=>a.addEventListener('click',()=>reset(a.dataset.book)));
  function markToday() {
    const day=dateObj(paris().key).getUTCDay();
    $$('[data-weekday]').forEach(r=>r.classList.toggle('is-today',r.dataset.weekday.split(',').includes(String(day))));
  }
  function refreshTime() {
    const active=document.activeElement;
    const restore=active&&['date','time'].includes(active.name)?{name:active.name,value:active.value}:null;
    const current=paris().key;
    if(current!==lastDay){lastDay=current;markToday();}
    if(state.step===1){renderDates();summary();}
    if(state.step===2){renderSlots();summary();}
    if(restore){
      const replacement=$(`input[name="${restore.name}"][value="${restore.value}"]`);
      if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
      else{focusInView($('#step-'+state.step));announce('Ce choix est devenu indisponible. Choisissez un nouveau créneau.');}
    }
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTime();});
  // Revalidate past slots even if the page stays open. Never announces every tick.
  window.setInterval(refreshTime,60000);
  $('#booking-app').hidden=false;showStep(0,false);markToday();
  if('IntersectionObserver' in window&&!reduced.matches){
    root.classList.add('js');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12});
    $$('[data-reveal]').forEach((el,i)=>{el.style.setProperty('--delay',`${el.dataset.reveal==='row'?(i%4)*60:0}ms`);observer.observe(el);});
    reduced.addEventListener('change',e=>{if(e.matches){root.classList.remove('js');observer.disconnect();}});
  }
})();
