(() => {
  const services = [
    {id:'resine-classique', nom:'Résine · finition classique', duree:45},
    {id:'resine-semi', nom:'Résine · finition semi-permanente', duree:50},
    {id:'gel-classique', nom:'Gel · finition classique', duree:50},
    {id:'gel-semi', nom:'Gel · finition semi-permanente', duree:60}
  ];
  const state = {step:0, service:null, date:null, heure:null, prenom:'', telephone:''};
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary-text');
  const steps = [...document.querySelectorAll('[data-go]')];
  let pointerInteraction = false;
  document.addEventListener('pointerdown', () => { pointerInteraction = true; });
  document.addEventListener('keydown', () => { pointerInteraction = false; });
  const formatDate = date => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(date);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const readDate = key => {const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d);};
  const choices = (items,name) => `<div class="choices">${items.map(item => `<label class="choice"><input type="radio" name="${name}" value="${item.value}" ${item.checked?'checked':''} ${item.disabled?'disabled':''}><span>${item.label}</span></label>`).join('')}</div>`;
  const actions = (next, back=true) => `<div class="step-actions">${back?'<button class="back" type="button" data-back>Retour</button>':''}<button type="submit">${next}</button></div>`;
  const safe = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(focus = true) {
    let markup = '';
    if(state.step===0){
      markup = `<h3 tabindex="-1">Choisir une prestation</h3><p>Durées indiquées sur Planity, à confirmer.</p><form>${choices(services.map(s=>({value:s.id,label:`${s.nom} · ${s.duree} min`,checked:state.service?.id===s.id})),'service')}<p class="error" id="erreur" role="status"></p>${actions('Continuer',false)}</form>`;
    } else if(state.step===1){
      const now=new Date(); now.setHours(0,0,0,0);
      const dates=Array.from({length:14},(_,i)=>{const d=new Date(now);d.setDate(now.getDate()+i);const key=dateKey(d);return {value:key,label:formatDate(d),checked:state.date===key};});
      markup=`<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés selon les horaires Planity, à confirmer.</p><form>${choices(dates,'date')}<p class="error" id="erreur" role="status"></p>${actions('Continuer')}</form>`;
    } else if(state.step===2){
      const date=readDate(state.date);const end=date.getDay()===0?18*60:20*60;const now=new Date();const slots=[];
      for(let m=600;m+state.service.duree<=end;m+=30){const heure=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;const instant=new Date(date);instant.setHours(Math.floor(m/60),m%60);const pris=(m/30+date.getDate())%5===0;const past=instant<=now;slots.push({value:heure,label:`${heure.replace(':',' h ')}${past?' · passé':pris?' · déjà pris':''}`,disabled:past||pris,checked:state.heure===heure});}
      markup=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs, proposés dans les horaires affichés par Planity.</p><form>${choices(slots,'heure')}<p class="error" id="erreur" role="status"></p>${actions('Continuer')}</form>`;
    } else if(state.step===3){
      markup=`<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le parcours seulement&nbsp;: aucune donnée n’est envoyée.</p><form novalidate><label class="field" for="prenom">Prénom<input id="prenom" name="prenom" autocomplete="given-name" value="${safe(state.prenom)}" required aria-describedby="erreur"></label><label class="field" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${safe(state.telephone)}" required aria-describedby="erreur"></label><p class="error" id="erreur" role="status"></p>${actions('Confirmer la simulation')}</form>`;
    } else {
      markup=`<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${safe(state.prenom)}. Votre sélection est récapitulée ci-dessous.</p><p><strong>Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</strong> Pour réserver, utilisez Planity ou appelez le salon.</p><div class="step-actions"><button type="button" data-reset>Recommencer</button><a class="button button-light" href="https://www.planity.com/chichi-m-75014-paris" target="_blank" rel="noopener">Aller sur Planity ↗</a></div>`;
    }
    content.innerHTML=`<div class="step-content${focus && pointerInteraction ? ' is-entering' : ''}">${markup}</div>`;
    const pane=content.querySelector('.step-content');
    if(pane.classList.contains('is-entering')) requestAnimationFrame(()=>requestAnimationFrame(()=>pane.classList.remove('is-entering')));
    const parts=[];if(state.service)parts.push(state.service.nom);if(state.date)parts.push(formatDate(readDate(state.date)));if(state.heure)parts.push(state.heure.replace(':',' h '));
    summary.textContent=parts.length?parts.join(' · '):'Choisissez une prestation pour commencer.';
    steps.forEach((button,i)=>{button.disabled=state.step===4 || i>state.step; if(i===state.step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    if(focus) content.querySelector('h3').focus();
  }
  content.addEventListener('submit', event => {
    event.preventDefault();const form=event.target;const error=form.querySelector('#erreur');const data=new FormData(form);
    if(state.step===0){const service=services.find(s=>s.id===data.get('service'));if(!service){error.textContent='Choisissez une prestation.';return;}if(state.service?.id!==service.id){state.date=null;state.heure=null;}state.service=service;}
    if(state.step===1){const date=data.get('date');if(!date){error.textContent='Choisissez un jour.';return;}if(state.date!==date)state.heure=null;state.date=date;}
    if(state.step===2){const heure=data.get('heure');if(!heure){error.textContent='Choisissez une heure disponible.';return;}state.heure=heure;}
    if(state.step===3){state.prenom=String(data.get('prenom')||'').trim();state.telephone=String(data.get('telephone')||'').trim();const digits=state.telephone.replace(/[\s.()-]/g,'');if(!state.prenom || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}}
    state.step++;render();
  });
  content.addEventListener('click',event=>{if(event.target.closest('[data-back]')){state.step--;render();}if(event.target.closest('[data-reset]')){Object.assign(state,{step:0,service:null,date:null,heure:null,prenom:'',telephone:''});render();}});
  steps.forEach(button=>button.addEventListener('click',()=>{state.step=Number(button.dataset.go);render();}));
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{const service=services.find(s=>s.id===link.dataset.service);if(state.service?.id!==service.id){state.date=null;state.heure=null;}state.service=service;state.step=0;render(false);}));
  render(false);
  requestAnimationFrame(()=>document.documentElement.classList.add('ready'));
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    const nodes=document.querySelectorAll('.reveal,.reveal-left');
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});
    nodes.forEach(node=>observer.observe(node));document.documentElement.classList.add('observing');
  }
})();
