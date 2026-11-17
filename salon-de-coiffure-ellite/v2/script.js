(() => {
  'use strict';
  const sections = [...document.querySelectorAll('[data-observe]')];
  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); reveal.unobserve(entry.target); }
    }), {threshold: .08});
    document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
    const nav = document.querySelector('.panel-nav');
    const indicator = document.querySelector('.nav-indicator');
    const active = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      let link = nav.querySelector(`[data-section="${entry.target.id}"]`);
      if (!link && entry.target.id === 'parcours') link = nav.querySelector('[data-section="prestations"]');
      if (link) { indicator.style.setProperty('--x', `${link.offsetLeft}px`);  }
    }), {rootMargin: '-20% 0px -60% 0px'});
    sections.forEach(el => active.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));

  const app = document.getElementById('booking-app');
  const summary = document.getElementById('summary');
  const state = {step:0, service:'', date:'', time:'', name:'', phone:''};
  const weekdays = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  function parisNow() {
    const values = Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p => [p.type,p.value]));
    return {date:`${values.year}-${values.month}-${values.day}`, minutes:Number(values.hour)*60+Number(values.minute)};
  }
  function makeDates() {
    const today = parisNow().date;
    return Array.from({length:14},(_,i)=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
  }
  function labelDate(value){return dateFormat.format(new Date(`${value}T12:00:00Z`));}
  function slots(date) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    const end = day === 6 ? 17*60 : 19*60;
    if(day===0||day===1)return [];
    const now=parisNow(); const result=[];
    for(let minutes=9*60;minutes+90<=end;minutes+=30){
      const label=`${String(Math.floor(minutes/60)).padStart(2,'0')} h ${String(minutes%60).padStart(2,'0')}`;
      const past=date===now.date && minutes<=now.minutes;
      result.push({label,disabled:past});
    }
    return result;
  }
  function refreshSummary(){
    summary.replaceChildren();
    const choices=[[state.service,0],[state.date && labelDate(state.date),1],[state.time,2]];
    choices.forEach(([label,step])=>{if(!label)return;const button=document.createElement('button');button.type='button';button.dataset.returnStep=step;button.textContent=label;button.setAttribute('aria-label',`Modifier : ${label}`);summary.append(button);});
    if(!summary.childNodes.length) summary.textContent='À compléter';
  }
  summary.addEventListener('click',e=>{const button=e.target.closest('button');if(button){state.step=Number(button.dataset.returnStep);render();}});
  function render(focus=true){
    refreshSummary(); let html='';
    if(state.step===0) html=`<h3 tabindex="-1">1. Choisir une prestation</h3><fieldset><legend>Prestation proposée dans cette simulation</legend><label class="choice"><input type="radio" name="prestation" value="Cure de cryothérapie avec séchage" ${state.service?'checked':''}> Cure de cryothérapie capillaire avec séchage · 1 h 30</label></fieldset><div class="flow-actions"><button class="next" type="button" data-action="service">Choisir un jour →</button></div><p class="error" role="status"></p>`;
    if(state.step===1) html=`<h3 tabindex="-1">2. Choisir un jour</h3><p>Jours proposés à titre de simulation, selon les horaires publiés.</p><div class="days">${makeDates().map(date=>{let day=new Date(`${date}T12:00:00Z`).getUTCDay();let closed=day===0||day===1;return `<button type="button" data-date="${date}" ${closed?'disabled':''}>${labelDate(date)}${closed?'<br>Fermé':''}</button>`}).join('')}</div><div class="flow-actions"><button type="button" data-back="0">← Prestation</button></div>`;
    if(state.step===2) html=`<h3 tabindex="-1">3. Choisir une heure</h3><p><strong>Simulation : aucune disponibilité n’est vérifiée.</strong> ${labelDate(state.date)} · horaires fictifs.</p><div class="slots">${slots(state.date).map(slot=>`<button type="button" data-time="${slot.label}" ${slot.disabled?'disabled':''}>${slot.label}</button>`).join('')}</div><div class="flow-actions"><button type="button" data-back="1">← Jour</button></div>`;
    if(state.step===3) html=`<h3 tabindex="-1">4. Vos coordonnées</h3><p>Les informations restent dans cette page et ne sont pas envoyées.</p><form id="details" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="erreur" value=""></label><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="erreur"></label><p class="error" id="erreur" role="status"></p><div class="flow-actions"><button type="button" data-back="2">← Heure</button><button class="next" type="submit">Confirmer la simulation</button></div></form>`;
    if(state.step===4) html=`<h3 tabindex="-1">Simulation terminée</h3><p>Votre sélection est affichée ci-dessus. Aucun rendez-vous n’a été pris et aucune information n’a été envoyée.</p><div class="flow-actions"><button type="button" data-action="reset">Recommencer</button></div>`;
    app.innerHTML=`<div class="flow-enter" aria-live="polite">${html}</div>`;
    if(focus) app.querySelector('h3').focus({preventScroll:true});
  }
  app.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.back!==undefined){state.step=Number(b.dataset.back);render();return;}
    if(b.dataset.action==='reset'){Object.assign(state,{step:0,service:'',date:'',time:'',name:'',phone:''});render();return;}
    if(b.dataset.action==='service'){const chosen=app.querySelector('input[name="prestation"]:checked');if(!chosen){app.querySelector('.error').textContent='Choisissez une prestation pour continuer.';return;}state.service=chosen.value;state.step=1;render();return;}
    if(b.dataset.date){state.date=b.dataset.date;state.time='';state.step=2;render();return;}
    if(b.dataset.time){state.time=b.dataset.time;state.step=3;render();}
  });
  app.addEventListener('submit',e=>{e.preventDefault();const form=e.target;const name=form.elements.prenom.value.trim();const phone=form.elements.telephone.value.trim();if(!name || !/^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(phone)){form.querySelector('.error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}state.name=name;state.phone=phone;state.step=4;render();});
  render(false);
})();
