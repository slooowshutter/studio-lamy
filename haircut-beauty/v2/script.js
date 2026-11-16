(() => {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .1 });
    reveals.forEach((element, index) => { element.style.transitionDelay = `${(index % 4) * 60}ms`; observer.observe(element); });
  } else reveals.forEach(element => element.classList.add('visible'));
  const content = document.getElementById('booking-content');
  const summary = document.getElementById('summary');
  const tabs = [...document.querySelectorAll('[data-step]')];
  const state = { step: 0, service: false, day: '', time: '', name: '', phone: '', done: false };
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const key = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parisNow = () => {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date());
    const part = type => Number(parts.find(item => item.type === type).value);
    return { date: new Date(part('year'), part('month')-1, part('day'), 12), minutes: part('hour')*60+part('minute') };
  };
  const getDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); };
  const hours = date => date.getDay() === 0 ? [] : date.getDay() === 5 ? [[9,12],[14,21]] : [[9,20]];
  const prettyDay = value => value ? dayFormat.format(getDate(value)) : '';
  function refreshSummary() {
    summary.textContent = state.service ? ['Soin du visage complet profond', prettyDay(state.day), state.time, state.done ? state.name : ''].filter(Boolean).join(' · ') : 'Aucune sélection pour le moment.';
    tabs.forEach((tab, i) => { tab.disabled = i > 0 && !(i === 1 ? state.service : i === 2 ? state.day : state.time); tab.toggleAttribute('aria-current', i === state.step && !state.done); if (i === state.step && !state.done) tab.setAttribute('aria-current','step'); });
  }
  function render(focus = true) {
    refreshSummary();
    content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter');
    if (state.done) {
      content.innerHTML = '<h3 tabindex="-1">Simulation terminée</h3><p class="booking-copy">Aucune demande n’a été envoyée. Pour un vrai rendez-vous, réservez sur Planity ou appelez le salon.</p><div class="booking-actions"><a href="https://www.planity.com/haircut-beauty-rue-de-vesoul-25000-besancon">Aller sur Planity ↗</a><button type="button" data-action="restart" class="back">Recommencer</button></div>';
    } else if (state.step === 0) {
      content.innerHTML = `<h3 tabindex="-1">Choisir une prestation</h3><p class="booking-copy">Pour cet aperçu, le parcours présente le soin du visage.</p><div class="choices"><label class="choice"><input type="radio" name="service" value="soin" ${state.service?'checked':''}><span>Soin du visage complet profond<br>30 min</span></label></div><p class="error" role="status"></p><div class="booking-actions"><button type="button" data-action="next">Choisir le jour →</button></div>`;
    } else if (state.step === 1) {
      const today = parisNow().date;
      const days = Array.from({length:14}, (_,i) => {const d = new Date(today); d.setDate(d.getDate()+i); const value=key(d), closed=!hours(d).length; return `<label class="choice"><input type="radio" name="jour" value="${value}" ${closed?'disabled':''} ${state.day===value?'checked':''}><span>${dayFormat.format(d)}${closed?' · fermé':''}</span></label>`;}).join('');
      content.innerHTML = `<h3 tabindex="-1">Choisir un jour</h3><p class="booking-copy">Créneaux fictifs, dans les horaires publiés et à confirmer.</p><div class="choices">${days}</div><p class="error" role="status"></p><div class="booking-actions"><button type="button" data-action="back" class="back">← Retour</button><button type="button" data-action="next">Choisir l’heure →</button></div>`;
    } else if (state.step === 2) {
      const date=getDate(state.day), now=parisNow(), isToday=state.day===key(now.date); let slots=[];
      hours(date).forEach(([start,end]) => { for(let minutes=start*60;minutes+30<=end*60;minutes+=30){const time=`${String(Math.floor(minutes/60)).padStart(2,'0')} h ${String(minutes%60).padStart(2,'0')}`; const occupied=(minutes/30+date.getDate())%5===0; const past=isToday && minutes<=now.minutes; slots.push(`<label class="choice"><input type="radio" name="heure" value="${time}" ${occupied||past?'disabled':''} ${state.time===time?'checked':''}><span>${time}${occupied||past?' · indisponible':''}</span></label>`); }});
      content.innerHTML = `<h3 tabindex="-1">Choisir une heure</h3><p class="booking-copy">${prettyDay(state.day)} · disponibilités fictives.</p><div class="choices">${slots.join('')}</div><p class="error" role="status"></p><div class="booking-actions"><button type="button" data-action="back" class="back">← Retour</button><button type="button" data-action="next">Vos coordonnées →</button></div>`;
    } else {
      content.innerHTML = '<h3 tabindex="-1">Vos coordonnées</h3><p class="booking-copy">Ces informations restent dans cette page et ne sont pas envoyées.</p><div class="fields"><label>Prénom<input id="prenom" autocomplete="given-name" required aria-describedby="name-error"><span class="error" id="name-error" role="status"></span></label><label>Téléphone<input id="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"><span class="error" id="phone-error" role="status"></span></label></div><div class="booking-actions"><button type="button" data-action="back" class="back">← Retour</button><button type="button" data-action="confirm">Terminer la simulation</button></div>';
      document.getElementById('prenom').value=state.name; document.getElementById('telephone').value=state.phone;
    }
    if (focus) content.querySelector('h3').focus({preventScroll:true});
  }
  content.addEventListener('change', event => {
    if (event.target.name==='service') state.service=true;
    if (event.target.name==='jour') {if(state.day!==event.target.value) state.time=''; state.day=event.target.value;}
    if (event.target.name==='heure') state.time=event.target.value;
    refreshSummary();
  });
  content.addEventListener('click', event => {
    const action=event.target.closest('[data-action]')?.dataset.action; if(!action)return;
    if(action==='restart'){Object.assign(state,{step:0,service:false,day:'',time:'',name:'',phone:'',done:false});render();return;}
    if(action==='back'){state.step--;render();return;}
    if(action==='next'){
      if(![state.service,state.day,state.time][state.step]){content.querySelector('.error').textContent='Veuillez faire une sélection pour continuer.';return;}
      state.step++;render();return;
    }
    if(action==='confirm'){
      state.name=document.getElementById('prenom').value.trim();state.phone=document.getElementById('telephone').value.trim();
      const digits=state.phone.replace(/[\s.()-]/g,'');
      const validPhone=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
      const nameField=document.getElementById('prenom'), phoneField=document.getElementById('telephone');
      document.getElementById('name-error').textContent=state.name ? '' : 'Indiquez votre prénom.';
      document.getElementById('phone-error').textContent=validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      nameField.setAttribute('aria-invalid',String(!state.name)); phoneField.setAttribute('aria-invalid',String(!validPhone));
      if(!state.name || !validPhone){(state.name ? phoneField : nameField).focus();return;}
      state.done=true;render();
    }
  });
  tabs.forEach(tab => tab.addEventListener('click',()=>{state.done=false;state.step=Number(tab.dataset.step);render();}));
  render(false);
})();
