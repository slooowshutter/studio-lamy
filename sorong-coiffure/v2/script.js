(() => {
  const services = [
    {id:'crane', name:'Rasage du crâne', duration:30, price:30},
    {id:'coupe', name:'Forfait coupe homme', duration:30, price:28},
    {id:'degrade', name:'Dégradé à blanc rasoir', duration:30, price:30},
    {id:'barbe', name:'Taille de barbe à la tondeuse', duration:30, price:16},
    {id:'combo', name:'Coupe homme + barbe', duration:60, price:44},
    {id:'tracage', name:'Coupe + barbe avec traçage', duration:60, price:47}
  ];
  const state = {step:0, service:null, date:null, time:null, firstName:'', phone:''};
  const panel = document.querySelector('#booking-panel');
  const steps = [...document.querySelectorAll('[data-step]')];
  const pad = n => String(n).padStart(2,'0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateLabel = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const parseDate = key => {const [y,m,d]=key.split('-').map(Number);return new Date(y,m-1,d,12)};
  const formatTime = n => `${pad(Math.floor(n/60))}:${pad(n%60)}`;
  function todayParis() {
    const p = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get = type => Number(p.find(x => x.type === type).value);
    return new Date(get('year'),get('month')-1,get('day'),12);
  }
  function parisMinutes(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());return Number(p.find(x=>x.type==='hour').value)*60+Number(p.find(x=>x.type==='minute').value)}
  function updateSummary(){
    document.querySelector('#summary-service').textContent=state.service ? state.service.name : 'Prestation —';
    document.querySelector('#summary-date').textContent=state.date ? dateLabel(parseDate(state.date)) : 'Jour —';
    document.querySelector('#summary-time').textContent=state.time || 'Heure —';
    document.querySelector('#summary-price').textContent=state.service ? `${state.service.price} € · tarif publié sur Planity` : 'Tarif —';
    steps.forEach((button,i)=>{button.disabled = i>0 && (i===1?!state.service:i===2?!state.date:!state.time);button.classList.toggle('current',i===state.step);if(i===state.step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});
  }
  function draw(focus=true){
    updateSummary();
    if(state.step===0){
      panel.innerHTML=`<h3 tabindex="-1">Choisir une prestation.</h3><p class="hint">Tarifs publiés sur Planity, à confirmer avec Sorong Coiffure.</p><div class="option-list">${services.map(s=>`<label class="option"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}<br><small>${s.duration} min</small></span><b>${s.price} €</b></label>`).join('')}</div><button class="booking-next" type="button" ${state.service?'':'disabled'}>Choisir un jour →</button>`;
      panel.querySelectorAll('[name="service"]').forEach(input=>input.addEventListener('change',()=>{const next=services.find(s=>s.id===input.value);if(state.service?.id!==next.id){state.date=null;state.time=null}state.service=next;updateSummary();panel.querySelector('.booking-next').disabled=false}));
      panel.querySelector('.booking-next').addEventListener('click',()=>go(1));
    } else if(state.step===1){
      const today=todayParis();let days='';for(let i=0;i<14;i++){let d=new Date(today);d.setDate(today.getDate()+i);const key=dateKey(d),closed=d.getDay()===0||d.getDay()===1;days+=`<button type="button" class="choice ${state.date===key?'selected':''}" data-date="${key}" ${closed?'disabled':''} aria-pressed="${state.date===key}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<small>${closed?'Fermé':'Exemple'}</small></button>`}
      panel.innerHTML=`<h3 tabindex="-1">Choisir un jour.</h3><p class="hint">14 prochains jours · horaires habituels · jours fériés à confirmer.</p><div class="day-grid">${days}</div><button class="booking-next" type="button" ${state.date?'':'disabled'}>Choisir une heure →</button>`;
      panel.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{if(state.date!==b.dataset.date)state.time=null;state.date=b.dataset.date;panel.querySelectorAll('[data-date]').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))});panel.querySelector('.booking-next').disabled=false;updateSummary()}));panel.querySelector('.booking-next').addEventListener('click',()=>go(2));
    } else if(state.step===2){
      const d=parseDate(state.date), end=d.getDay()===6?1110:1140, nowKey=dateKey(todayParis());let slots='';for(let n=540;n+state.service.duration<=end;n+=30){let taken=((n/30+d.getDate()+d.getMonth())%5===0), past=state.date===nowKey&&n<=parisMinutes(), time=formatTime(n);slots+=`<button type="button" class="choice ${state.time===time?'selected':''}" data-time="${time}" ${taken||past?'disabled':''} aria-pressed="${state.time===time}">${time}<small>${past?'Passé':taken?'Déjà pris':'Exemple'}</small></button>`}
      panel.innerHTML=`<h3 tabindex="-1">Choisir une heure.</h3><p class="hint">Créneaux fictifs, présentés pour l’exemple.</p><div class="slot-grid">${slots}</div><button class="booking-next" type="button" ${state.time?'':'disabled'}>Vos coordonnées →</button>`;
      panel.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{state.time=b.dataset.time;panel.querySelectorAll('[data-time]').forEach(x=>{const selected=x===b;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))});panel.querySelector('.booking-next').disabled=false;updateSummary()}));panel.querySelector('.booking-next').addEventListener('click',()=>go(3));
    } else if(state.step===3){
      panel.innerHTML=`<h3 tabindex="-1">Vos coordonnées.</h3><p class="hint">Simulation uniquement. Rien ne sera transmis au salon.</p><p class="form-recap">${state.service.name} · ${dateLabel(parseDate(state.date))} à ${state.time} · ${state.service.price}&nbsp;€ publiés sur Planity</p><form novalidate><label class="form-field" for="first-name">Prénom<input id="first-name" name="given-name" autocomplete="given-name" required aria-describedby="name-error"></label><span class="error" id="name-error" aria-live="polite"></span><label class="form-field" for="phone">Téléphone<input id="phone" name="tel" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"></label><span class="error" id="phone-error" aria-live="polite"></span><button class="booking-next" type="submit">Confirmer la simulation →</button></form>`;
      const name=panel.querySelector('#first-name'),phone=panel.querySelector('#phone');name.value=state.firstName;phone.value=state.phone;name.addEventListener('input',()=>state.firstName=name.value);phone.addEventListener('input',()=>state.phone=phone.value);
      panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const digits=phone.value.replace(/[\s.()-]/g,'');const validName=name.value.trim().length>0,validPhone=/^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(digits);document.querySelector('#name-error').textContent=validName?'':'Indiquez votre prénom.';document.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro mobile français valide.';name.setAttribute('aria-invalid',String(!validName));phone.setAttribute('aria-invalid',String(!validPhone));if(!validName)name.focus();else if(!validPhone)phone.focus();else go(4)});
    } else {
      panel.innerHTML=`<h3 tabindex="-1">Simulation terminée.</h3><div class="success"><p><strong>Votre choix est prêt.</strong></p><p id="success-name"></p><p>Aucune réservation n’a été envoyée. Pour un vrai rendez-vous, utilisez Planity ou appelez le salon.</p></div><a class="button dark" href="https://www.planity.com/sorong-coiffure-44000-nantes-r8j" target="_blank" rel="noopener">Aller sur Planity ↗</a>`;
      panel.querySelector('#success-name').textContent=`${state.firstName.trim()} · ${state.service.name} · ${dateLabel(parseDate(state.date))} à ${state.time} · ${state.service.price} € publiés sur Planity.`;
    }
    panel.classList.remove('enter');if(focus){void panel.offsetWidth;panel.classList.add('enter')}if(focus)panel.querySelector('h3')?.focus({preventScroll:true});
  }
  function go(step){state.step=step;draw()}
  steps.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{state.service=services.find(s=>s.id===a.dataset.service);state.date=null;state.time=null;state.step=0;draw(false)}));
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});document.querySelectorAll('.price-row').forEach(row=>row.hidden=b.dataset.filter!=='all'&&!row.dataset.category.split(' ').includes(b.dataset.filter))}));
  draw(false);
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);const number=entry.target.querySelector('[data-count]');if(number&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let start;const target=Number(number.dataset.count);function tick(t){if(!start)start=t;const progress=Math.min((t-start)/550,1);number.textContent=Math.round(progress*target);if(progress<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)}}}),{threshold:.15});document.documentElement.classList.add('motion-ready');document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
})();
