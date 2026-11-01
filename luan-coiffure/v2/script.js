(() => {
  const services = [
    {id:'coupe', name:'Coiffure mixte', category:'coiffure'},
    {id:'rasage', name:'Rasage', category:'barbe'},
    {id:'barbe', name:'Taille de barbe', category:'barbe'}
  ];
  const state = {step:0, max:0, service:null, day:null, time:null, first:'', phone:''};
  let transitionTimer;
  const list = document.querySelector('#price-list');
  const area = document.querySelector('#step-area');
  const dateFormat = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'});
  const shortDay = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'});
  const formatTime = n => `${String(Math.floor(n/60)).padStart(2,'0')} h ${String(n%60).padStart(2,'0')}`;
  function localDate(offset){const d=new Date(); d.setHours(0,0,0,0);d.setDate(d.getDate()+offset);return d;}
  function hours(d){return [[0,0],[0,0],[540,1140],[540,1140],[540,1140],[540,1140],[480,1020]][d.getDay()];}
  function renderPrices(filter='all'){
    list.innerHTML = services.filter(s=>filter==='all'||s.category===filter).map((s,i)=>`<div class="price-row"><span>0${i+1}</span><div><h3>${s.name}</h3><small>Activité déclarée</small></div><span class="duration">À confirmer</span><span class="cost">À confirmer</span><button class="round-link" type="button" data-book="${s.id}" aria-label="Choisir ${s.name} pour la simulation">↗</button></div>`).join('');
  }
  function updateSummary(){
    document.querySelector('#sum-service').textContent=state.service?.name || 'À choisir';
    document.querySelector('#sum-day').textContent=state.day ? dateFormat.format(state.day) : 'À choisir';
    document.querySelector('#sum-time').textContent=state.time===null ? 'À choisir' : formatTime(state.time);
  }
  function go(step){
    clearTimeout(transitionTimer); state.step=step;state.max=Math.max(state.max,step);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    area.classList.add('switching');
    transitionTimer=setTimeout(()=>{render();area.classList.remove('switching');area.querySelector('h3')?.focus({preventScroll:true});},reduced?0:160);
  }
  function render(){
    updateSummary();
    document.querySelectorAll('.progress button').forEach((b,i)=>{b.disabled=i>state.max;b.classList.toggle('current',i===state.step);if(i===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    let html='';
    if(state.step===0){html=`<h3 tabindex="-1">Choisir une prestation</h3><p>Tarifs : appelez le salon au 09 81 30 08 69.</p><fieldset class="choices" style="border:0;padding:0"><legend class="fine">Prestation souhaitée</legend>${services.map(s=>`<label class="choice"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}<small>Activité déclarée</small></span><b>À confirmer</b></label>`).join('')}</fieldset><button class="next" data-next="1" ${state.service?'':'disabled'}>Choisir un jour →</button>`;}
    if(state.step===1){const days=Array.from({length:14},(_,i)=>localDate(i));html=`<h3 tabindex="-1">Choisir un jour</h3><p>Simulation : le lundi est à confirmer par téléphone.</p><div class="days">${days.map((d,i)=>`<button class="day ${state.day?.getTime()===d.getTime()?'selected':''}" data-day="${i}" aria-pressed="${state.day?.getTime()===d.getTime()}" ${!hours(d)[1]?'disabled':''}>${shortDay.format(d)}<span>${d.getDay()===1?'À confirmer':!hours(d)[1]?'Fermé':'Simulation'}</span></button>`).join('')}</div><button class="back" data-back="0">← Prestation</button><button class="next" data-next="2" ${state.day?'':'disabled'}>Choisir une heure →</button>`;}
    if(state.step===2){const [open,close]=hours(state.day);const now=new Date();const slots=[];for(let t=open;t<close;t+=30){const past=state.day.toDateString()===now.toDateString() && t<=now.getHours()*60+now.getMinutes();const taken=((t/30+state.day.getDate())%4===0);slots.push(`<button class="slot ${state.time===t?'selected':''}" data-time="${t}" aria-pressed="${state.time===t}" ${past||taken?'disabled':''} ${taken?'title="Déjà pris dans cet exemple"':''}>${formatTime(t)}${past||taken?'<br><small>indisponible</small>':''}</button>`)}html=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour le ${dateFormat.format(state.day)}. Les horaires barrés sont indisponibles dans cet exemple.</p><div class="slots">${slots.join('')}</div><button class="back" data-back="1">← Jour</button><button class="next" data-next="3" ${state.time===null?'disabled':''}>Continuer →</button>`;}
    if(state.step===3){html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="details" novalidate><div class="fields"><label>Prénom <input name="first" autocomplete="given-name" required aria-describedby="first-error"><span class="error" id="first-error" aria-live="polite"></span></label><label>Téléphone <input name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"><span class="error" id="phone-error" aria-live="polite"></span></label></div><button class="back" type="button" data-back="2">← Heure</button><button class="next" type="submit">Terminer la simulation →</button></form>`;}
    if(state.step===4){html=`<h3 tabindex="-1">Simulation terminée.</h3><p>Votre sélection est affichée ci-contre. Aucun rendez-vous n’a été envoyé ni réservé.</p><p>Pour prendre rendez-vous, appelez le <a href="tel:+33981300869">09 81 30 08 69</a>.</p><button class="next" data-restart>Recommencer</button>`;}
    area.innerHTML=html; if(state.step===3){area.querySelector('[name=first]').value=state.first;area.querySelector('[name=phone]').value=state.phone;}
  }
  document.addEventListener('click',e=>{
    const f=e.target.closest('[data-filter]');if(f){document.querySelectorAll('.filter').forEach(b=>{const active=b===f;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderPrices(f.dataset.filter);}
    const book=e.target.closest('[data-book]');if(book){state.service=services.find(s=>s.id===book.dataset.book);state.day=null;state.time=null;state.max=1;go(1);location.hash='reserver';}
    const progress=e.target.closest('[data-step]');if(progress&&!progress.disabled)go(Number(progress.dataset.step));
    const next=e.target.closest('[data-next]');if(next&&!next.disabled)go(Number(next.dataset.next));
    const back=e.target.closest('[data-back]');if(back)go(Number(back.dataset.back));
    const day=e.target.closest('[data-day]');if(day&&!day.disabled){state.day=localDate(Number(day.dataset.day));state.time=null;state.max=Math.min(state.max,1);render();area.querySelector(`[data-day="${day.dataset.day}"]`)?.focus();}
    const time=e.target.closest('[data-time]');if(time&&!time.disabled){state.time=Number(time.dataset.time);state.max=Math.min(state.max,2);render();area.querySelector(`[data-time="${time.dataset.time}"]`)?.focus();}
    if(e.target.closest('[data-restart]')){Object.assign(state,{step:0,max:0,service:null,day:null,time:null,first:'',phone:''});go(0);}
  });
  area.addEventListener('change',e=>{if(e.target.name==='service'){state.service=services.find(s=>s.id===e.target.value);state.day=null;state.time=null;state.max=0;render();area.querySelector(`[name=service][value="${e.target.value}"]`)?.focus();}});
  area.addEventListener('input',e=>{if(e.target.name==='first')state.first=e.target.value;if(e.target.name==='phone')state.phone=e.target.value;});
  area.addEventListener('submit',e=>{if(e.target.id!=='details')return;e.preventDefault();const first=e.target.elements.first,phone=e.target.elements.phone;const digits=phone.value.replace(/[\s.()-]/g,'');const validName=first.value.trim().length>0;const validPhone=/^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);document.querySelector('#first-error').textContent=validName?'':'Indiquez votre prénom.';document.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français à 10 chiffres.';first.setAttribute('aria-invalid',String(!validName));phone.setAttribute('aria-invalid',String(!validPhone));if(!validName)first.focus();else if(!validPhone)phone.focus();else go(4);});
  renderPrices();render();
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js');const els=document.querySelectorAll('.reveal');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');observer.unobserve(entry.target);}}),{threshold:.12});els.forEach((el,i)=>{el.classList.add('pending');el.style.transitionDelay=`${i*70}ms`;observer.observe(el);});}
})();
