(() => {
  document.documentElement.classList.add('js');
  const panels = [...document.querySelectorAll('.panel')];
  function openPanel(id, scroll = false) {
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('panel')) return;
    panels.forEach(panel => {
      const active = panel === target;
      panel.classList.toggle('is-open', active);
      panel.querySelector('.panel-trigger').setAttribute('aria-expanded', String(active));
      panel.querySelector('.panel-content').inert = !active;
    });
    if (scroll) target.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }
  panels.forEach(panel => panel.querySelector('.panel-trigger').addEventListener('click', () => openPanel(panel.id)));
  openPanel('le-fait');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('ready')));
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('reveal-once'); observer.unobserve(entry.target); } }), {threshold:.25});
    panels.slice(1).forEach(panel => observer.observe(panel.querySelector('.panel-title')));
  }
  document.querySelectorAll('[data-open], a[href="#sources"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); openPanel(link.dataset.open || 'sources', true);
  }));
  const services = {'Coupe Homme':30,'Coupe Étudiant':30,'Coupe Homme + Barbe':40,'Barbe':25,'Rasage':30};
  const app = document.getElementById('booking-app');
  const state = {step:0, service:'', date:'', time:'', name:'', phone:''};
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateLabel = key => { const [y,m,d] = key.split('-').map(Number); return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(y,m-1,d)); };
  function days(){const list=[];const now=new Date();for(let i=0;i<21;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12);const key=dateKey(d);if(d.getDay()!==0&&d.getDay()!==1&&slots(key).length)list.push(key);}return list.slice(0,12)}
  function slots(key=state.date){const [y,m,d]=key.split('-').map(Number), date=new Date(y,m-1,d), ranges=date.getDay()===6?[[600,900]]:[[600,720],[840,1140]], out=[]; for(const [start,end] of ranges){for(let t=start;t+services[state.service]<=end;t+=30){const hour=Math.floor(t/60),min=t%60,slot=new Date(y,m-1,d,hour,min);if(slot>new Date())out.push(`${String(hour).padStart(2,'0')} h ${String(min).padStart(2,'0')}`)}}return out}
  const safe = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(focus=true, error=''){
    let content='';
    if(state.step===0) content=`<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation sans prix. Tarifs à confirmer avec le salon.</p><div class="choices">${Object.keys(services).map(s=>`<button type="button" data-choose="service" data-value="${safe(s)}" class="${state.service===s?'selected':''}">${safe(s)}</button>`).join('')}</div>`;
    if(state.step===1) content=`<h3 tabindex="-1">Choisir un jour</h3><p>Les horaires sont à confirmer avec le salon.</p><div class="choices">${days().map(d=>`<button type="button" data-choose="date" data-value="${d}">${dateLabel(d)}</button>`).join('')}</div>`;
    if(state.step===2){const available=slots(); content=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux proposés pour la simulation, disponibilités réelles à vérifier.</p><div class="choices">${available.length?available.map(t=>`<button type="button" data-choose="time" data-value="${t}">${t}</button>`).join(''):'Aucun créneau proposé pour ce jour.'}</div>`;}
    if(state.step===3) content=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent sur cet appareil et ne sont pas envoyées.</p><form id="booking-form" novalidate><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${safe(state.name)}" required><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" value="${safe(state.phone)}" required>${error?`<p class="error" role="alert">${error}</p>`:''}<div class="nav-buttons"><button class="primary" type="submit">Confirmer la simulation</button></div></form>`;
    if(state.step===4) content=`<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${safe(state.name)}. Rien n’a été envoyé et aucun rendez-vous n’a été pris.</p><p>Pour réserver réellement, <a href="https://www.planity.com/gentlemens-barber-shop-64000-pau" target="_blank" rel="noopener noreferrer">rendez-vous sur Planity</a> ou appelez le <a href="tel:+33972824592">09 72 82 45 92</a>.</p><button type="button" data-reset>Recommencer</button>`;
    const back=state.step>0&&state.step<4?'<div class="nav-buttons"><button type="button" data-back>← Retour</button></div>':'';
    const summary=state.service?`<div class="summary"><strong>Votre sélection</strong><br><button type="button" data-edit="0">${safe(state.service)}</button>${state.date?' <button type="button" data-edit="1">'+dateLabel(state.date)+'</button>':''}${state.time?' <button type="button" data-edit="2">'+state.time+'</button>':''}</div>`:'';
    app.innerHTML=`<div class="step-enter"><div aria-live="polite">${content}</div>${back}${summary}</div>`;
    if(focus) app.querySelector('h3')?.focus({preventScroll:true});
  }
  app.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.edit!==undefined){state.step=Number(b.dataset.edit);render()}else if(b.dataset.choose){state[b.dataset.choose]=b.dataset.value;if(b.dataset.choose==='service'){state.date='';state.time=''}if(b.dataset.choose==='date')state.time='';state.step++;render()} else if(b.hasAttribute('data-back')){state.step--;render()}else if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:'',date:'',time:'',name:'',phone:''});render()}});
  app.addEventListener('submit',e=>{e.preventDefault();state.name=app.querySelector('#prenom').value.trim();state.phone=app.querySelector('#telephone').value.trim();if(!state.name||(!/^\+?[\d\s().-]{9,20}$/.test(state.phone)||state.phone.replace(/\D/g,'').length<9)){render(false,'Indiquez votre prénom et un numéro de téléphone valide.');app.querySelector(!state.name?'#prenom':'#telephone')?.focus();return}state.step=4;render()});
  document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{state.service=b.dataset.service;state.date='';state.time='';state.step=1;render(false);openPanel('rendez-vous',true);app.querySelector('h3')?.focus({preventScroll:true})}));
  render(false);
  if(location.hash && document.querySelector(location.hash)?.classList.contains('panel')) openPanel(location.hash.slice(1));
})();
