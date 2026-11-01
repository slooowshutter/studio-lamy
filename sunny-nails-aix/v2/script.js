window.sunnyReady = true;
(() => {
  'use strict';
  const services = [
    {id:'resine', name:'Gel ou résine sur ongles naturels, sans capsule', duration:45, price:50},
    {id:'semi', name:'Gel / résine & semi-permanent', duration:60, price:55},
    {id:'manucure', name:'Manucure classique sans couleur', duration:20, price:15},
    {id:'mains', name:'Manucure & semi-permanent', duration:30, price:35}
  ];
  const state = {step:0, max:0, service:null, date:null, time:null, first:'', phone:''};
  const panel = document.querySelector('#step-content');
  const steps = [...document.querySelectorAll('[data-step]')];
  const formatDay = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const formatShort = d => new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d);
  const formatTime = minutes => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const escapeText = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function summary(){
    document.querySelector('#sum-service').textContent = state.service?.name || '—';
    document.querySelector('#sum-day').textContent = state.date ? formatDay(state.date) : '—';
    document.querySelector('#sum-time').textContent = state.time == null ? '—' : formatTime(state.time);
    document.querySelector('#sum-price').textContent = state.service ? `${state.service.price} €` : '—';
    steps.forEach((b,i) => { b.disabled = i > state.max; b.classList.toggle('current', i === state.step); if(i===state.step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current'); });
  }
  function render(){
    summary();
    if(state.step===0){
      panel.innerHTML = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p class="hint">Tarifs relevés sur Planity, à confirmer avec Sunny Nails Aix.</p><div class="service-options">${services.map(s=>`<label class="service-option"><input type="radio" name="service" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}<small>Durée à confirmer</small></span><strong>${s.price} €</strong></label>`).join('')}</div><button class="primary" type="button" data-next ${state.service?'':'disabled'}>Choisir un jour <span aria-hidden="true">→</span></button>`;
    } else if(state.step===1){
      const today = new Date(); today.setHours(0,0,0,0);
      const days = Array.from({length:14},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d;});
      panel.innerHTML = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="hint">Lundi–samedi, 10:00–20:00 · horaires à confirmer. Dimanche fermé.</p><div class="day-grid">${days.map(d=>`<button type="button" class="choice ${state.date && dateKey(state.date)===dateKey(d)?'selected':''}" data-date="${dateKey(d)}" ${d.getDay()===0?'disabled':''}>${formatShort(d)}${d.getDay()===0?'<small>Fermé</small>':''}</button>`).join('')}</div><button class="primary" type="button" data-next ${state.date?'':'disabled'}>Choisir une heure <span aria-hidden="true">→</span></button>`;
    } else if(state.step===2){
      const now = new Date(); const sameDay = dateKey(now)===dateKey(state.date);
      const slots=[]; for(let m=600;m+state.service.duration<=1200;m+=30){const busy=((m/30 + state.date.getDate()*3)%7===0); const past=sameDay && m<=now.getHours()*60+now.getMinutes(); slots.push({m,busy,past});}
      panel.innerHTML = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">Créneaux fictifs pour le ${formatDay(state.date)}. Les horaires et durées sont à confirmer.</p><div class="slot-grid">${slots.map(s=>`<button type="button" class="choice ${state.time===s.m?'selected':''}" data-time="${s.m}" ${s.busy||s.past?'disabled':''}>${formatTime(s.m)}${s.busy?'<small>Déjà pris</small>':s.past?'<small>Passé</small>':''}</button>`).join('')}</div><button class="primary" type="button" data-next ${state.time==null?'disabled':''}>Vos coordonnées <span aria-hidden="true">→</span></button>`;
    } else if(state.step===3){
      panel.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Simulation uniquement&nbsp;: aucune donnée n’est envoyée.</p><form id="booking-form" novalidate><label class="field" for="first">Prénom<input id="first" name="first" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="first-error"></label><p class="error" id="first-error"></p><label class="field" for="phone">Téléphone<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"></label><p class="error" id="phone-error"></p><button class="primary" type="submit">Confirmer la simulation <span aria-hidden="true">→</span></button></form>`;
    } else {
      panel.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p class="success-note">${escapeText(state.first)}, votre exemple&nbsp;: ${escapeText(state.service.name)}, le ${formatDay(state.date)} à ${formatTime(state.time)}, ${state.service.price}&nbsp;€ relevés sur Planity, à confirmer.</p><p>Ce rendez-vous n’est pas réservé et rien n’a été envoyé. Pour contacter le salon, appelez le <a href="tel:+33695683748">06 95 68 37 48</a>.</p><button class="primary" type="button" data-reset>Recommencer <span aria-hidden="true">↻</span></button>`;
    }
  }
  function go(n){
    state.step=n; state.max=Math.max(state.max,n); summary();
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.classList.add('changing');
    clearTimeout(go.timer);
    go.timer=setTimeout(()=>{render();panel.classList.remove('changing');panel.querySelector('h3')?.focus({preventScroll:true});}, reduced?0:220);
  }
  panel.addEventListener('change', e=>{if(e.target.name==='service'){state.service=services.find(s=>s.id===e.target.value);state.date=null;state.time=null;state.max=0;summary();panel.querySelector('[data-next]').disabled=false;}});
  panel.addEventListener('click', e=>{
    const day=e.target.closest('[data-date]'); const time=e.target.closest('[data-time]');
    if(day){const [y,m,d]=day.dataset.date.split('-').map(Number);state.date=new Date(y,m-1,d);state.time=null;state.max=1;render();panel.querySelector(`[data-date="${dateKey(state.date)}"]`)?.focus({preventScroll:true});}
    if(time){state.time=Number(time.dataset.time);state.max=2;render();panel.querySelector(`[data-time="${state.time}"]`)?.focus({preventScroll:true});}
    if(e.target.closest('[data-next]')) go(state.step+1);
    if(e.target.closest('[data-reset]')){Object.assign(state,{step:0,max:0,service:null,date:null,time:null,first:'',phone:''});go(0);}
  });
  panel.addEventListener('submit', e=>{
    if(e.target.id!=='booking-form')return; e.preventDefault();
    state.first=e.target.elements.first.value.trim();state.phone=e.target.elements.phone.value.trim();
    const normalized=state.phone.replace(/[\s.()-]/g,'');
    const validFirst=state.first.length>=2; const validPhone=/^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(normalized);
    document.querySelector('#first-error').textContent=validFirst?'':'Indiquez votre prénom (2 caractères minimum).';
    document.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro de mobile français valide.';
    document.querySelector('#first').setAttribute('aria-invalid',String(!validFirst));document.querySelector('#phone').setAttribute('aria-invalid',String(!validPhone));
    if(validFirst && validPhone)go(4);else document.querySelector(validFirst?'#phone':'#first').focus();
  });
  steps.forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.step);if(n<=state.max)go(n);}));
  document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>{state.service=services.find(s=>s.id===a.dataset.service);state.date=null;state.time=null;state.max=0;go(0);}));
  document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelectorAll('.price-row').forEach(row=>{row.hidden=button.dataset.filter!=='all' && row.dataset.category!==button.dataset.filter;});}));
  render(); requestAnimationFrame(()=>document.documentElement.classList.add('ready'));
  const tiles=[...document.querySelectorAll('.reveal')]; tiles.forEach((tile,i)=>tile.style.setProperty('--r',i));

  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target);}}),{threshold:.12});tiles.forEach(tile=>observer.observe(tile));}else tiles.forEach(tile=>tile.classList.add('revealed'));
})();
