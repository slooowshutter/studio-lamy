(() => {
  const services = [
    {name:'Shampoing · coupe · coiffage', duration:30, price:20},
    {name:'Coupe + barbe', duration:30, price:30},
    {name:'Barbe classique', duration:15, price:15},
    {name:'Barbe tondeuse et ciseaux', duration:30, price:20},
    {name:'Coupe enfant (6 à 10 ans)', duration:30, price:10}
  ];
  const panel = document.querySelector('#booking-panel');
  const summary = document.querySelector('#summary');
  const steps = [...document.querySelectorAll('[data-goto]')];
  let selection = {service:null, day:null, time:null};
  let step = 0, furthest = 0;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  const shortFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'});
  const days = Array.from({length:14}, (_,i) => {const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d;});
  const button = (text, handler, disabled=false, cls='') => {const b=document.createElement('button'); b.type='button'; b.textContent=text; b.disabled=disabled; b.className=cls; b.addEventListener('click',handler); return b;};
  function go(n){step=n;furthest=Math.max(furthest,n);render();panel.querySelector('h3')?.focus();}
  function render(){
    panel.replaceChildren();
    const heading=document.createElement('h3'); heading.tabIndex=-1; heading.textContent=['Choisir une prestation','Choisir un jour','Choisir une heure','Vos coordonnées','Simulation terminée'][step]; panel.append(heading);
    steps.forEach((b,i)=>{b.disabled=i>furthest || step===4; b.classList.toggle('current',i===step); if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    const s=services[selection.service];
    summary.textContent=s ? `${s.name} · ${s.duration} min · ${s.price} €${selection.day ? ' / '+dateFormat.format(selection.day):''}${selection.time ? ' à '+selection.time:''}` : 'Choisissez une prestation pour commencer.';
    if(step===0){
      const p=document.createElement('p');p.textContent='Tarifs indicatifs, à confirmer avec The Barber Marseille.';panel.append(p);
      services.forEach((service,i)=>{const l=document.createElement('label');l.className='booking-choice';const input=document.createElement('input');input.type='radio';input.name='service';input.value=i;input.checked=selection.service===i;const span=document.createElement('span');span.textContent=service.name;const small=document.createElement('small');small.textContent=`${service.duration} min · ${service.price} €`;span.append(small);input.addEventListener('change',()=>{if(selection.service!==i){selection.day=null;selection.time=null;furthest=0;steps.forEach((b,j)=>b.disabled=j>0);} selection.service=i;next.disabled=false; summary.textContent=`${service.name} · ${service.duration} min · ${service.price} €`;});l.append(input,span);panel.append(l);});
      const actions=document.createElement('div');actions.className='booking-actions';const next=button('Continuer →',()=>go(1),selection.service===null);actions.append(next);panel.append(actions);
    } else if(step===1){
      const p=document.createElement('p');p.textContent='Lundi à samedi, 10 h–19 h 30. Horaires à confirmer ; jours fériés à vérifier.';panel.append(p);const grid=document.createElement('div');grid.className='days';days.forEach(d=>{const closed=d.getDay()===0;const b=button(shortFormat.format(d)+(closed?' · fermé':''),()=>{selection.day=d;selection.time=null;go(2);},closed,selection.day?.getTime()===d.getTime()?'selected':'');b.setAttribute('aria-pressed',String(selection.day?.getTime()===d.getTime()));grid.append(b)});panel.append(grid);
    } else if(step===2){
      const p=document.createElement('p');p.textContent='Créneaux fictifs, sans lien avec les disponibilités réelles.';panel.append(p);const grid=document.createElement('div');grid.className='slots';let count=0;for(let min=600;min+s.duration<=1170;min+=30){const h=Math.floor(min/60),m=min%60;const str=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;const date=new Date(selection.day);date.setHours(h,m,0,0);const taken=(count+selection.day.getDate())%5===0;const unavailable=taken||date<=new Date();const slot=button(str+(date<=new Date()?' · passé':taken?' · pris':''),()=>{selection.time=str;go(3);},unavailable,selection.time===str?'selected':'');slot.setAttribute('aria-pressed',String(selection.time===str));grid.append(slot);count++;}panel.append(grid);
    } else if(step===3){
      const p=document.createElement('p');p.textContent='Ces coordonnées restent dans votre navigateur. Rien ne sera transmis.';panel.append(p);const form=document.createElement('form');form.noValidate=true;form.innerHTML='<label class="field">Prénom<input name="first" autocomplete="given-name" required aria-describedby="first-error"></label><div class="error" id="first-error" aria-live="polite"></div><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"></label><div class="error" id="phone-error" aria-live="polite"></div><button class="submit" type="submit">Confirmer la simulation →</button>';form.addEventListener('submit',e=>{e.preventDefault();const first=form.elements.first.value.trim();const phone=form.elements.phone.value.replace(/[\s.()-]/g,'');const valid=/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(phone);form.querySelector('#first-error').textContent=first?'':'Indiquez votre prénom.';form.querySelector('#phone-error').textContent=valid?'':'Indiquez un numéro de téléphone français valide.';if(!first||!valid){(first?form.elements.phone:form.elements.first).focus();return;}go(4)});panel.append(form);
    } else {const p=document.createElement('p');p.textContent='Rien n’a été envoyé et aucun rendez-vous n’a été pris. Pour réserver réellement, utilisez Planity ou appelez le salon.';const a=document.createElement('a');a.href='https://www.planity.com/the-barber-marseille-13001';a.target='_blank';a.rel='noopener';a.className='text-link';a.textContent='Réserver sur Planity ↗';const again=button('Recommencer',()=>{selection={service:null,day:null,time:null};furthest=0;go(0)});const actions=document.createElement('div');actions.className='booking-actions';actions.append(again);panel.append(p,a,actions);}
  }
  steps.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.goto))));
  document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{selection.service=Number(b.dataset.service);selection.day=null;selection.time=null;furthest=0;go(0);document.querySelector('#reserver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  render();
})();
