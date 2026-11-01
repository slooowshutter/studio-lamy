window.siteReady = true;
(() => {
  'use strict';
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .15 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const services = {
    coupe: { name: 'Coupe homme', duration: 30, price: '15 €', detail: '30 min · 15 € · exemple' },
    barbe: { name: 'Taille de barbe', duration: 30, price: '10 €', detail: '30 min · 10 € · exemple' },
    duo: { name: 'Coupe + barbe', duration: 60, price: 'à partir de 30 €', detail: '1 h · à partir de 30 € · à confirmer' }
  };
  const hours = {0:null,1:[600,1020],2:[600,1200],3:[600,1200],4:[600,1200],5:[600,1200],6:[600,1200]};
  const state = { step:0, max:0, service:null, date:null, time:null, first:'', phone:'' };
  const content = document.getElementById('step-content');
  const steps = [...document.querySelectorAll('[data-step]')];
  const announcement = document.getElementById('step-announcement');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let transitionTimer;
  const summaries = ['service','date','time'].map(key => document.getElementById('summary-' + key));
  const paris = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function nowParis() { const p = Object.fromEntries(paris.formatToParts(new Date()).map(x => [x.type,x.value])); return { day:`${p.year}-${p.month}-${p.day}`, minutes:Number(p.hour)*60+Number(p.minute) }; }
  function days() { const today = nowParis().day; const base = new Date(today+'T12:00:00Z'); return Array.from({length:14},(_,i) => { const d = new Date(base); d.setUTCDate(d.getUTCDate()+i); return d; }); }
  function key(d) { return d.toISOString().slice(0,10); }
  function longDate(d) { return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(d); }
  function timeString(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }
  function updateSummary() {
    summaries[0].textContent = state.service ? `${services[state.service].name} · ${services[state.service].price}` : 'Prestation à choisir';
    summaries[1].textContent = state.date ? longDate(new Date(state.date+'T12:00:00Z')) : 'Jour à choisir';
    summaries[2].textContent = state.time != null ? timeString(state.time) : 'Heure à choisir';
  }
  function nextButton(label, enabled) { return `<button class="next" id="next" ${enabled?'':'disabled'}>${label} →</button>`; }
  function render(focus=true) {
    updateSummary();
    steps.forEach((button,i) => {button.disabled = i > state.max; button.classList.toggle('current', i === state.step); if(i === state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');});
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Tarifs indicatifs, à confirmer avec Camara's barbershop. Durées exemples.</p><div class="options">${Object.entries(services).map(([id,s])=>`<label class="option"><input type="radio" name="service" value="${id}" ${state.service===id?'checked':''}><span>${s.name}<small>${s.detail}</small></span><strong>↗</strong></label>`).join('')}</div>${nextButton('Choisir le jour',!!state.service)}`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Horaires indicatifs, à confirmer auprès du salon.</p><div class="date-grid">${days().map(d=>{const date=key(d), closed=!hours[d.getUTCDay()]; const label=new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(d);return `<button data-date="${date}" aria-pressed="${state.date===date}" ${closed?'disabled':''}>${label}<small>${closed?'fermé':'exemple'}</small></button>`}).join('')}</div>${nextButton('Choisir l’heure',!!state.date)}`;
    } else if (state.step === 2) {
      const d=new Date(state.date+'T12:00:00Z'), range=hours[d.getUTCDay()], duration=services[state.service].duration, now=nowParis(); let slots='';
      let available=0; for(let t=range[0],i=0;t+duration<=range[1];t+=30,i++){const taken=((d.getUTCDate()*13+i*7)%9<2), past=state.date===now.day && t<=now.minutes, disabled=taken||past; if(!disabled) available++; slots+=`<button data-time="${t}" aria-pressed="${state.time===t}" ${disabled?'disabled':''}>${timeString(t)}${disabled?'<small> indisponible</small>':''}</button>`;}
      html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux fictifs pour le ${longDate(d)}. Disponibilités à confirmer.</p><div class="slot-grid">${slots}</div>${available ? '' : '<p>Aucun créneau exemple restant ce jour. Utilisez « 02 Jour » pour choisir une autre date.</p>'}${nextButton('Vos coordonnées',state.time!==null)}`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Pour terminer</h3><p>Simulation uniquement&nbsp;: vos coordonnées restent dans ce navigateur et ne sont pas envoyées.</p><form id="details" novalidate><label class="field">Prénom<input id="first" name="given-name" autocomplete="given-name" required aria-describedby="first-error"><span class="error" id="first-error"></span></label><label class="field">Téléphone<input id="phone" name="tel" autocomplete="tel" inputmode="tel" type="tel" required aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><p>Votre sélection est récapitulée ci-contre ou ci-dessous.</p><button class="next" type="submit">Confirmer la simulation →</button></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><div class="success"><strong>Aucun rendez-vous n’a été envoyé.</strong><p>Pour confirmer une vraie visite, appelez le salon au <a href="tel:+33609989568">06 09 98 95 68</a>.</p></div><button class="next" id="restart">Recommencer →</button>`;
    }
    content.innerHTML = `<div class="step-panel">${html}</div>`;
    if(state.step===3){document.getElementById('first').value=state.first; document.getElementById('phone').value=state.phone;}
    if(focus) { const heading=content.querySelector('h3'); heading.focus({preventScroll:true}); announcement.textContent=heading.textContent; }
  }
  function go(step){
    clearTimeout(transitionTimer);
    const panel=content.querySelector('.step-panel');
    const finish=()=>{ state.step=step; state.max=Math.max(state.max,step); render(); };
    if(!panel || reducedMotion.matches){finish();return;}
    panel.classList.add('changing');
    transitionTimer=setTimeout(()=>{finish();const fresh=content.querySelector('.step-panel');fresh.classList.add('changing');requestAnimationFrame(()=>requestAnimationFrame(()=>fresh.classList.remove('changing')));},180);
  }
  content.addEventListener('change', e => {if(e.target.name==='service'){state.service=e.target.value;state.time=null;state.max=0;render(false);content.querySelector(`input[value="${state.service}"]`).focus({preventScroll:true});}});
  content.addEventListener('click', e => {
    const date=e.target.closest('[data-date]'), time=e.target.closest('[data-time]');
    if(date){state.date=date.dataset.date;state.time=null;state.max=1;render(false);content.querySelector(`[data-date="${state.date}"]`).focus({preventScroll:true});}
    if(time){state.time=Number(time.dataset.time);state.max=2;render(false);content.querySelector(`[data-time="${state.time}"]`).focus({preventScroll:true});}
    if(e.target.id==='next' && state.step<3) go(state.step+1);
    if(e.target.id==='restart'){Object.assign(state,{step:0,max:0,service:null,date:null,time:null,first:'',phone:''});render();}
  });
  content.addEventListener('submit', e=>{
    e.preventDefault(); const first=document.getElementById('first'), phone=document.getElementById('phone'); state.first=first.value.trim(); state.phone=phone.value.trim();
    const validFirst=state.first.length>0; const cleaned=state.phone.replace(/[\s.()-]/g,''); const validPhone=/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(cleaned);
    document.getElementById('first-error').textContent=validFirst?'':'Indiquez votre prénom.';document.getElementById('phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';
    first.setAttribute('aria-invalid',String(!validFirst));phone.setAttribute('aria-invalid',String(!validPhone));
    if(!validFirst){first.focus();return} if(!validPhone){phone.focus();return} go(4);
  });
  steps.forEach(button=>button.addEventListener('click',()=>go(Number(button.dataset.step))));
  document.querySelectorAll('[data-service]').forEach(button=>button.addEventListener('click',()=>{state.service=button.dataset.service;state.date=null;state.time=null;state.max=0;go(0);document.getElementById('reservation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>{const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});document.querySelectorAll('.price-row').forEach(row=>{row.hidden=button.dataset.filter!=='all'&&!row.dataset.category.split(' ').includes(button.dataset.filter);});}));
  render(false);
})();
