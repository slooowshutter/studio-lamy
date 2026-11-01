(() => {
  'use strict';
  const services = [
    {name:'Shampoing & brushing', minutes:30, price:45},
    {name:'Shampoing, coupe & brushing', minutes:60, price:77},
    {name:'Coupe homme', minutes:30, price:40},
    {name:'Coloration racines, soin & brushing', minutes:120, price:118, note:'Première couleur : consultation préalable à prévoir avec le salon.'}
  ];
  const app=document.querySelector('#booking-app'), summary=document.querySelector('#summary');
  const state={step:0,service:null,date:null,time:null,completed:0};
  const dateLabel=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const dateShort=d=>new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d);
  const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const escapeHTML=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary(){summary.textContent=[state.service?.name,state.date&&dateLabel(state.date),state.time, state.service&&`${state.service.price} €`].filter(Boolean).join(' · ')||'À compléter';}
  function render(focus=true){
    updateSummary();
    document.querySelectorAll('[data-go]').forEach(b=>{const n=+b.dataset.go;b.disabled=n>state.completed;b.setAttribute('aria-current',n===state.step?'step':'false')});
    let content='';
    if(state.step===0){content=`<h4 class="step-title" tabindex="-1">1. Choisissez une prestation</h4><fieldset><legend class="small">Tarifs indicatifs, à confirmer avec Le Salon et Vous</legend>${services.map((s,i)=>`<label class="service-option"><input type="radio" name="service" value="${i}" ${state.service===s?'checked':''}><span>${s.name}<small>${s.minutes} min${s.note ? ` · ${s.note}` : ''}</small></span><strong>${s.price} €</strong></label>`).join('')}</fieldset><button class="next" type="button">Choisir le jour →</button><p class="error" role="status"></p>`;}
    if(state.step===1){const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);const closed=[0,1].includes(d.getDay());return `<button type="button" class="choice" data-day="${i}" ${closed?'disabled':''} aria-pressed="${!!state.date&&d.toDateString()===state.date.toDateString()}">${dateShort(d)}${closed?'<br>fermé':''}</button>`}).join('');content=`<h4 class="step-title" tabindex="-1">2. Choisissez un jour</h4><p class="small">Lundi fermé dans cette simulation, à confirmer auprès du salon.</p><div class="days">${days}</div><button class="back" type="button">← Prestation</button>`;}
    if(state.step===2){let slots='';const now=new Date();for(let m=570;m+state.service.minutes<=1140;m+=30){const dt=new Date(state.date);dt.setHours(Math.floor(m/60),m%60,0,0);const occupied=((m/30+state.date.getDate()*3)%5===0);const disabled=dt<=now||occupied;slots+=`<button type="button" class="choice" data-time="${clock(m)}" ${disabled?'disabled':''} aria-pressed="${state.time===clock(m)}">${clock(m)}${occupied?'<br>déjà pris':''}</button>`}content=`<h4 class="step-title" tabindex="-1">3. Choisissez une heure</h4><p class="small">Créneaux fictifs pour le ${dateLabel(state.date)}.</p><div class="slots">${slots}</div><button class="back" type="button">← Jour</button>`;}
    if(state.step===3){content=`<h4 class="step-title" tabindex="-1">4. Vos coordonnées</h4><p class="small">Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form novalidate><label class="field">Prénom<input name="first" autocomplete="given-name" required aria-describedby="first-error"><span class="error" id="first-error"></span></label><label class="field">Téléphone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><button class="confirm" type="submit">Confirmer la simulation →</button></form><button class="back" type="button">← Heure</button>`;}
    if(state.step===4){content=`<h4 class="step-title" tabindex="-1">Simulation terminée</h4><p>Merci ${escapeHTML(state.first)}. Votre sélection&nbsp;: ${state.service.name}, le ${dateLabel(state.date)} à ${state.time} · ${state.service.price}&nbsp;€.</p><p><strong>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée.</strong></p><a class="button" href="https://www.planity.com/le-salon-et-vous-paris-le-marais-75003">Réserver vraiment sur Planity ↗</a><button class="back restart" type="button">Recommencer</button>`;}
    app.innerHTML=content;if(focus)app.querySelector('.step-title')?.focus();
  }
  document.querySelector('.step-nav').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(b&&!b.disabled){state.step=+b.dataset.go;render()}});
  document.querySelectorAll('[data-preset]').forEach(link=>link.addEventListener('click',()=>{state.service=services[+link.dataset.preset];state.date=null;state.time=null;state.completed=1;state.step=1;render(false)}));
  app.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
    if(t.classList.contains('next')){const chosen=app.querySelector('input[name=service]:checked');if(!chosen){app.querySelector('.error').textContent='Choisissez une prestation pour continuer.';return}const s=services[+chosen.value];if(state.service!==s){state.date=null;state.time=null;state.completed=1}state.service=s;state.step=1;state.completed=Math.max(state.completed,1);render()}
    if(t.dataset.day){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+Number(t.dataset.day));state.date=d;state.time=null;state.step=2;state.completed=2;render()}
    if(t.dataset.time){state.time=t.dataset.time;state.step=3;state.completed=3;render()}
    if(t.classList.contains('back')){if(t.classList.contains('restart')){Object.assign(state,{step:0,service:null,date:null,time:null,completed:0})}else state.step--;render()}
  });
  app.addEventListener('submit',e=>{e.preventDefault();const f=e.target,first=f.elements.first.value.trim(),phone=f.elements.phone.value.trim(),digits=phone.replace(/[\s.()-]/g,'');let valid=true;f.querySelector('#first-error').textContent=first?'':'Indiquez votre prénom.';f.querySelector('#phone-error').textContent=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)?'':'Indiquez un numéro français valide.';if(!first||f.querySelector('#phone-error').textContent)valid=false;if(!valid){(first?f.elements.phone:f.elements.first).focus();return}state.first=first;state.step=4;render()});
  render(false);
})();
