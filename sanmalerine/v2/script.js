(() => {
  'use strict';
  const rows = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('attente'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    rows.forEach((row, i) => { row.style.transitionDelay = `${(i % 4) * 40}ms`; row.classList.add('attente'); observer.observe(row); });
  }
  const form = document.querySelector('#formulaire'), container = document.querySelector('#etape');
  const back = document.querySelector('#retour'), next = document.querySelector('#suite'), error = document.querySelector('#erreur');
  const state = { service: '', date: '', time: '', name: '', phone: '' };
  const services = ['Coupe et coiffage', 'Coloration racines', 'Coupe et barbe', 'Coupe enfant'];
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
  const parts = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(x => [x.type,x.value]));
  const today = new Date(Date.UTC(+p.year,+p.month-1,+p.day,12));
  const now = +p.hour * 60 + +p.minute;
  let step = 0;
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; });
  document.addEventListener('pointerdown', () => { keyboard = false; });
  const escapeText = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateText = iso => dateFormatter.format(new Date(`${iso}T12:00:00Z`));
  const choice = (name,value,label,checked,disabled=false) => `<label class="choice"><input type="radio" name="${name}" value="${escapeText(value)}" ${checked?'checked':''} ${disabled?'disabled':''}><span>${label}</span></label>`;
  function render(focus = true) {
    error.textContent = '';
    document.querySelectorAll('.progress span').forEach((el,i) => el.classList.toggle('actif',i===step));
    back.hidden = step === 0 || step === 4;
    next.hidden = step === 4;
    next.textContent = step === 3 ? 'Terminer la simulation →' : 'Continuer →';
    let html = '';
    if (step === 0) {
      html = `<fieldset><legend>Choisir une prestation</legend><div class="choices">${services.map(s => choice('service',s,escapeText(s),state.service===s)).join('')}</div><p class="hint">Tarifs et détails à confirmer auprès du salon.</p></fieldset>`;
    } else if (step === 1) {
      let options = '';
      for(let i=0;i<14;i++) { const d = new Date(today.getTime()+i*86400000), iso = d.toISOString().slice(0,10), closed = [0,1].includes(d.getUTCDay()); options += choice('date',iso,`${dateFormatter.format(d)}${closed?' · fermé':''}`,state.date===iso,closed); }
      html = `<fieldset><legend>Choisir un jour</legend><div class="choices">${options}</div><p class="hint">Jours proposés à titre de simulation. Horaires à confirmer, notamment les jours fériés.</p></fieldset>`;
    } else if (step === 2) {
      const d = new Date(`${state.date}T12:00:00Z`), end = d.getUTCDay() === 6 ? 17*60 : 19*60; let options = '';
      for(let t=9*60;t<end;t+=60) { const time = `${String(Math.floor(t/60)).padStart(2,'0')}:00`, past = state.date===today.toISOString().slice(0,10) && t<=now; options += choice('time',time,`${Math.floor(t/60)} h${past?' · passé':''}`,state.time===time,past); }
      html = `<fieldset><legend>Choisir une heure</legend><p class="hint">Heures de démonstration, sans disponibilité réelle ni durée garantie.</p><div class="choices">${options}</div></fieldset>`;
    } else if (step === 3) {
      html = `<h3 class="step-title" tabindex="-1">Vos coordonnées</h3><label class="form-field"><span>Prénom</span><input name="prenom" autocomplete="given-name" aria-describedby="erreur" value="${escapeText(state.name)}" required></label><label class="form-field"><span>Téléphone</span><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="aide-telephone erreur" required></label><p id="aide-telephone" class="hint">Numéro français, par exemple 06 12 34 56 78. Rien ne sera envoyé.</p>`;
    } else {
      html = `<h3 class="step-title" tabindex="-1">Simulation terminée</h3><p>${escapeText(state.name)}, votre sélection : ${escapeText(state.service)}, le ${escapeText(dateText(state.date))} à ${escapeText(state.time.replace(':',' h '))}.</p><p class="hint">Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée. Pour réserver, appelez le <a href="tel:+33478012238">04 78 01 22 38</a> ou utilisez <a href="https://www.planity.com/sanmalerine-69008-lyon">Planity</a>.</p><button type="button" class="button button-secondary" id="recommencer">Recommencer</button>`;
    }
    container.innerHTML = `<div class="step-enter${focus && !keyboard ? ' en-transition' : ''}">${html}</div>`;
    requestAnimationFrame(() => container.querySelector('.step-enter')?.classList.remove('en-transition'));
    document.querySelectorAll('[data-retour-etape]').forEach(button => { button.disabled = +button.dataset.retourEtape >= step || step === 4; });
    document.querySelector('#recap-service').textContent = state.service || 'À choisir';
    document.querySelector('#recap-jour').textContent = state.date ? dateText(state.date) : 'À choisir';
    document.querySelector('#recap-heure').textContent = state.time ? state.time.replace(':',' h ') : 'À choisir';
    if (focus) { const heading = container.querySelector('legend, h3'); if (heading) { heading.tabIndex = -1; heading.focus(); } }
    const restart = document.querySelector('#recommencer'); if (restart) restart.addEventListener('click', () => { Object.assign(state,{service:'',date:'',time:'',name:'',phone:''}); step=0; render(); });
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    if(step < 3) { const names = ['service','date','time']; const selected = form.querySelector(`input[name="${names[step]}"]:checked`); if(!selected){error.textContent='Veuillez faire un choix pour continuer.'; return;} const key = names[step]; if(state[key]!==selected.value && step<2) { if(step===0){state.date='';state.time='';} else state.time=''; } state[key]=selected.value; }
    else { state.name=form.prenom.value.trim(); state.phone=form.telephone.value.trim(); if(!state.name){error.textContent='Indiquez votre prénom.';form.prenom.setAttribute('aria-invalid','true');form.prenom.focus();return;} const digits=state.phone.replace(/[\s.()-]/g,''); if(!/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)){error.textContent='Indiquez un numéro de téléphone français valide.';form.telephone.setAttribute('aria-invalid','true');form.telephone.focus();return;} }
    step++; render();
  });
  back.addEventListener('click',()=>{if(step>0){step--;render();}});
  document.querySelectorAll('[data-retour-etape]').forEach(button => button.addEventListener('click', () => { step = +button.dataset.retourEtape; render(); }));
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.date='';state.time='';step=0;render(false);}));
  render(false);
})();
