(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); const counter=entry.target.querySelector('[data-count]'); if(counter && !reduced){const start=performance.now(); const tick=now=>{const progress=Math.min((now-start)/650,1); counter.textContent=Math.round(60*(1-Math.pow(1-progress,3))); if(progress<1) requestAnimationFrame(tick);}; requestAnimationFrame(tick);} observer.unobserve(entry.target); } }), {threshold: .12}) : null;
  document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tous' && row.dataset.category !== button.dataset.filter; });
  }));
  const content = document.querySelector('#step-content');
  const summary = document.querySelector('#summary');
  const nav = [...document.querySelectorAll('[data-go]')];
  const state = {step: 0, max: 0, service: false, date: null, time: null, name: '', phone: ''};
  const fmt = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  const shortDay = new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'});
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function days() { const base = new Date(); base.setHours(0,0,0,0); return Array.from({length:14}, (_, i) => { const d = new Date(base); d.setDate(base.getDate()+i); return d; }); }
  function slots(date) {
    const end = date.getDay() === 3 ? 13*60+30 : 19*60;
    const now = new Date(); const out=[];
    for(let m=9*60; m+75<=end; m+=30) {
      const h=String(Math.floor(m/60)).padStart(2,'0'), min=String(m%60).padStart(2,'0');
      const past = dateKey(date)===dateKey(now) && m<=now.getHours()*60+now.getMinutes();
      const taken = (m/30+date.getDate())%4===0;
      out.push({time:`${h}:${min}`, disabled: past || taken, reason:past?'passé':taken?'déjà pris':''});
    }
    return out;
  }
  function updateSummary() {
    summary.replaceChildren();
    const lines = state.service ? ['Massage Signature', '1 h 15 de rendez-vous · 60 €', state.date ? fmt.format(state.date) : 'Jour à choisir', state.time || 'Heure à choisir'] : ['Choisissez une prestation pour commencer.'];
    lines.forEach(line => { const p=document.createElement('div'); p.textContent=line; summary.append(p); });
    nav.forEach((b,i) => {b.disabled=i>state.max; b.classList.toggle('current',i===state.step); if(i===state.step)b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');});
  }
  function render(focus=true) {
    updateSummary();
    if(state.step===0) content.innerHTML=`<h3 tabindex="-1">Choisir une prestation</h3><p>Tarifs indicatifs, à confirmer avec L’institut de Sarah.</p><label class="choice"><input type="radio" name="service" value="signature" ${state.service?'checked':''}><span><strong>Massage Signature</strong><small>60 min de soin · rendez-vous 1 h 15</small></span><b>60 €</b></label><button class="next" type="button" data-next>Choisir un jour →</button>`;
    if(state.step===1) content.innerHTML=`<h3 tabindex="-1">Choisir un jour</h3><p>Horaires à confirmer. Jours et disponibilités présentés à titre d’exemple.</p><div class="days">${days().map(d => { const closed = [0,6].includes(d.getDay()); const available = !closed && slots(d).some(s=>!s.disabled); return `<button type="button" data-date="${dateKey(d)}" ${!available?'disabled':''} class="${state.date && dateKey(state.date)===dateKey(d)?'selected':''}">${shortDay.format(d)}<small>${closed?'fermé':!available?'complet':'exemple'}</small></button>`; }).join('')}</div><button class="back" type="button" data-back>← Prestation</button><button class="next" type="button" data-next>Choisir une heure →</button>`;
    if(state.step===2) content.innerHTML=`<h3 tabindex="-1">Choisir une heure</h3><p>${fmt.format(state.date)} · créneaux simulés</p><div class="slots">${slots(state.date).map(s=>`<button type="button" data-time="${s.time}" ${s.disabled?'disabled':''} class="${state.time===s.time?'selected':''}" ${s.reason?`aria-label="${s.time} ${s.reason}"`:''}>${s.time}${s.reason?`<small> ${s.reason}</small>`:''}</button>`).join('')}</div><button class="back" type="button" data-back>← Jour</button><button class="next" type="button" data-next>Vos coordonnées →</button>`;
    if(state.step===3) content.innerHTML=`<h3 tabindex="-1">Vos coordonnées</h3><p>Simulation uniquement&nbsp;: rien ne sera envoyé.</p><form id="booking-form" novalidate><label class="field">Prénom <input name="name" autocomplete="given-name" required aria-describedby="name-error"></label><div class="error" id="name-error" aria-live="polite"></div><label class="field">Téléphone mobile <input name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"></label><div class="error" id="phone-error" aria-live="polite"></div><button class="back" type="button" data-back>← Heure</button><button class="next" type="submit">Confirmer la simulation →</button></form>`;
    if(state.step===4) { content.innerHTML=`<h3 tabindex="-1">Simulation terminée.</h3><p id="success-copy"></p><p>Aucun rendez-vous n’a été envoyé. Pour prendre un vrai rendez-vous, utilisez Planity ou appelez l’institut.</p><a class="button light" href="https://www.planity.com/linstitut-de-sarah-84000-avignon" target="_blank" rel="noopener">Aller sur Planity ↗</a><br><button class="back" type="button" data-restart>Recommencer</button>`; document.querySelector('#success-copy').textContent=`${state.name}, votre exemple : Massage Signature, ${fmt.format(state.date)} à ${state.time}, 60 €. Tarif à confirmer.`; }
    if(state.step===3) {content.querySelector('[name=name]').value=state.name;content.querySelector('[name=phone]').value=state.phone;}
    if(!reduced){ content.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => content.classList.remove('enter'))); }
    if(focus) content.querySelector('h3').focus({preventScroll:true});
  }
  function go(step) {state.step=step; state.max=Math.max(state.max,step);render();}
  nav.forEach(b=>b.addEventListener('click',()=>{if(!b.disabled)go(Number(b.dataset.go));}));
  content.addEventListener('change', e => {if(e.target.name==='service') state.service=true;});
  content.addEventListener('click',e=>{
    const date=e.target.closest('[data-date]'), time=e.target.closest('[data-time]');
    if(date && !date.disabled){ const [y,m,d]=date.dataset.date.split('-').map(Number); const nextDate=new Date(y,m-1,d); if(!state.date || dateKey(state.date)!==date.dataset.date){state.time=null;state.max=1;} state.date=nextDate; render(false); content.querySelector(`[data-date="${date.dataset.date}"]`)?.focus(); }
    if(time && !time.disabled){state.time=time.dataset.time;render(false);content.querySelector(`[data-time="${time.dataset.time}"]`)?.focus();}
    if(e.target.closest('[data-back]')) go(state.step-1);
    if(e.target.closest('[data-restart]')){Object.assign(state,{step:0,max:0,service:false,date:null,time:null,name:'',phone:''});render();}
    if(e.target.closest('[data-next]')) {
      const showError = message => { let error=content.querySelector('.step-error'); if(!error){error=document.createElement('p');error.className='step-error';error.setAttribute('role','alert');content.querySelector('[data-next]').before(error);} error.textContent=message; }; 
      if(state.step===0 && !state.service){showError('Choisissez une prestation pour continuer.');content.querySelector('input').focus();return;}
      if(state.step===1 && !state.date){showError('Choisissez un jour pour continuer.');content.querySelector('.days button:not(:disabled)')?.focus();return;}
      if(state.step===2 && !state.time){showError('Choisissez une heure pour continuer.');content.querySelector('.slots button:not(:disabled)')?.focus();return;}
      go(state.step+1);
    }
  });
  content.addEventListener('submit',e=>{e.preventDefault();const form=e.target;state.name=form.elements.name.value.trim();state.phone=form.elements.phone.value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');const nameOk=state.name.length>=2;const phoneOk=/^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(digits);content.querySelector('#name-error').textContent=nameOk?'':'Indiquez votre prénom (2 caractères minimum).';content.querySelector('#phone-error').textContent=phoneOk?'':'Indiquez un numéro de mobile français valide.';form.elements.name.setAttribute('aria-invalid',String(!nameOk));form.elements.phone.setAttribute('aria-invalid',String(!phoneOk));if(!nameOk)form.elements.name.focus();else if(!phoneOk)form.elements.phone.focus();else go(4);});
  render(false);
})();
