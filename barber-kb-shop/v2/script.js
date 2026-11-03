(() => {
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .15 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));
  const app = document.querySelector('#booking-app');
  const summary = document.querySelector('#summary');
  const count = document.querySelector('#step-count');
  const state = { step: 1, service: false, date: '', time: '', name: '', phone: '' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parisNow = () => { const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(p => p.type !== 'literal').map(p => [p.type,p.value])); return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour)*60+Number(parts.minute) }; };
  const dateKey = d => d.toISOString().slice(0,10);
  const isTaken = (min, key) => (min / 30 + Number(key.slice(-2))) % 5 === 0;
  const hasFutureSlot = now => { for (let min=9*60; min+35<=19*60; min+=30) if (min>now.minutes && !isTaken(min, now.key)) return true; return false; };
  const dateLabel = key => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${key}T12:00:00`));
  function render(focus = false) {
    count.textContent = state.step <= 4 ? `0${state.step} / 04` : 'Terminé';
    let html = '';
    if (state.step === 1) html = `<h3 tabindex="-1">Choisir la prestation</h3><p>Simulation uniquement. Tarif indicatif à consulter dans la carte ci-dessus.</p><label class="service-choice"><input type="radio" name="service" value="fade" ${state.service?'checked':''}><span>Dégradé à blanc + shampoing – cheveux courts<br><small>35 min</small></span></label><p class="error" id="error" aria-live="polite"></p><div class="booking-actions"><button type="button" data-action="service">Choisir le jour →</button></div>`;
    if (state.step === 2) {
      let days = ''; const now = parisNow();
      for(let i=0;i<14;i++){ const d=new Date(`${now.key}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+i); const key=dateKey(d); const closed=d.getUTCDay()===0; const ended=i===0 && !hasFutureSlot(now); days += `<label class="choice"><input type="radio" name="date" value="${key}" ${closed||ended?'disabled':''} ${state.date===key?'checked':''}><span>${new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(d)}${closed?'<br>Fermé':ended?'<br>Terminé':''}</span></label>`; }
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires indiqués&nbsp;: lundi à samedi, 9 h à 19 h. À confirmer.</p><div class="choices">${days}</div><p class="error" id="error" aria-live="polite"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Prestation</button><button type="button" data-action="date">Choisir l’heure →</button></div>`;
    }
    if (state.step === 3) {
      const now=parisNow(); let slots=''; for(let min=9*60;min+35<=19*60;min+=30){const h=Math.floor(min/60),m=min%60;const value=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;const past=state.date===now.key&&min<=now.minutes;const taken=isTaken(min,state.date);slots+=`<label class="choice"><input type="radio" name="time" value="${value}" ${past||taken?'disabled':''} ${state.time===value?'checked':''}><span>${value.replace(':',' h ')}${taken&&!past?'<br>Indisponible':''}${past?'<br>Passé':''}</span></label>`;}
      html=`<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour la simulation, sans disponibilité réelle.</p><div class="choices">${slots}</div><p class="error" id="error" aria-live="polite"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Jour</button><button type="button" data-action="time">Vos coordonnées →</button></div>`;
    }
    if (state.step === 4) html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><label class="field">Prénom<input name="name" autocomplete="given-name" value="${esc(state.name)}" aria-describedby="error"></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(state.phone)}" aria-describedby="error"></label><p class="error" id="error" aria-live="polite"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Heure</button><button type="button" data-action="confirm">Terminer la simulation</button></div>`;
    if (state.step === 5) html=`<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${esc(state.name)}. Aucun rendez-vous n’a été pris et rien n’a été envoyé.</p><p>Pour réserver réellement, utilisez la fiche Planity.</p><div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
    app.innerHTML=`<div class="booking-step step-enter">${html}</div>`;
    summary.textContent = 'Votre sélection : ' + (state.service ? 'Dégradé à blanc + shampoing – cheveux courts' : 'aucune pour le moment') + (state.date ? ` · ${dateLabel(state.date)}` : '') + (state.time ? ` · ${state.time.replace(':',' h ')}` : '') + (state.step===5 ? ` · ${state.name}` : '');
    requestAnimationFrame(() => app.querySelector('.booking-step')?.classList.add('shown'));
    if (state.step > 1) { const links=document.createElement('div'); links.className='summary-links'; [['prestation',1],['jour',2],['heure',3]].filter(([,step]) => step < state.step && step <= 3).forEach(([label,step]) => { const button=document.createElement('button'); button.type='button'; button.textContent='Modifier : '+label; button.dataset.step=step; links.append(button); }); summary.append(links); }
    if(focus) app.querySelector('h3')?.focus({preventScroll:true});
  }
  app.addEventListener('click', e => {
    const action=e.target.closest('button')?.dataset.action;if(!action)return;
    const error=app.querySelector('#error');
    if(action==='service'){if(!app.querySelector('[name=service]:checked')){error.textContent='Choisissez la prestation pour continuer.';return;}state.service=true;state.step=2;}
    if(action==='date'){const v=app.querySelector('[name=date]:checked')?.value;if(!v){error.textContent='Choisissez un jour pour continuer.';return;}if(state.date!==v)state.time='';state.date=v;state.step=3;}
    if(action==='time'){const v=app.querySelector('[name=time]:checked')?.value;if(!v){error.textContent='Choisissez une heure pour continuer.';return;}state.time=v;state.step=4;}
    if(action==='confirm'){state.name=app.querySelector('[name=name]').value.trim();state.phone=app.querySelector('[name=phone]').value.trim();if(!state.name||! /^(?:(?:\+33|0033|0)[1-9])(?:[ .-]?\d{2}){4}$/.test(state.phone)){error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}state.step=5;}
    if(action==='back')state.step--;
    if(action==='restart'){Object.assign(state,{step:1,service:false,date:'',time:'',name:'',phone:''});}
    render(true);
  });
  summary.addEventListener('click', e => { const button=e.target.closest('button[data-step]'); if(button){ state.step=Number(button.dataset.step); render(true); } });
  render();
})();
