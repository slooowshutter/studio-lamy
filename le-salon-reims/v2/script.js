(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    items.forEach(item => observer.observe(item));
    window.setTimeout(() => items.forEach(item => item.classList.add('visible')), 1800);
  } else items.forEach(item => item.classList.add('visible'));

  const filters = document.querySelectorAll('.filter');
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'toutes' && row.dataset.category !== button.dataset.filter; });
  }));

  const stage = document.getElementById('booking-stage');
  const recap = document.getElementById('recap');
  const count = document.getElementById('step-count');
  const services = ['Coupe homme', 'Couronne homme', 'Coupe étudiant de moins de 25 ans'];
  const hours = { 1:[10,18], 2:[9,19], 3:[9,19], 4:[9,17], 5:[9,19], 6:[9,18] };
  let reached = 1;
  const state = { step: 1, service: '', date: '', time: '', name: '', phone: '' };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
  const actions = (back, next) => `<div class="stage-actions">${back ? '<button type="button" data-action="back">Retour</button>' : ''}${next ? '<button type="button" class="next" data-action="next">Continuer →</button>' : ''}</div>`;
  function updateRecap() {
    const parts = [state.service];
    if (state.date) parts.push(dateFormat.format(parseDate(state.date)));
    if (state.time) parts.push(state.time);
    recap.textContent = parts.filter(Boolean).join(' · ') || 'Aucune prestation choisie.';
  }
  function render(focus = true) {
    count.textContent = state.step === 5 ? 'SIMULATION TERMINÉE' : `ÉTAPE ${state.step} / 4`;
    let content = '';
    if (state.step === 1) {
      content = `<h3 class="stage-heading" tabindex="-1">Choisir une prestation</h3><p class="stage-note">Trois prestations de la carte, chacune annoncée à 15 minutes. Durée à confirmer.</p><fieldset class="choice-list"><legend>Prestation</legend>${services.map((s,i) => `<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===s?'checked':''}><span>${s}</span><b>15 min</b></label>`).join('')}</fieldset><p class="error" id="stage-error" aria-live="polite"></p>${actions(false,true)}`;
    } else if (state.step === 2) {
      const today = new Date(); today.setHours(0,0,0,0);
      let days = '';
      for (let i=0; i<14; i++) {
        const day = new Date(today); day.setDate(today.getDate()+i);
        const value = localDate(day); const closed = !hours[day.getDay()];
        days += `<button type="button" data-date="${value}" aria-pressed="${state.date===value}" ${closed?'disabled':''}>${shortFormat.format(day)}${closed?'<small>fermé</small>':''}</button>`;
      }
      content = `<h3 class="stage-heading" tabindex="-1">Choisir un jour</h3><p class="stage-note">Jours simulés selon les horaires publiés, à confirmer avec le salon.</p><div class="days" aria-label="Jours proposés">${days}</div><p class="error" id="stage-error" aria-live="polite"></p>${actions(true,true)}`;
    } else if (state.step === 3) {
      const day = parseDate(state.date); const range = hours[day.getDay()]; let slots = ''; let available = 0;
      for (let minutes=range[0]*60; minutes+15<=range[1]*60; minutes+=30) {
        const hour = Math.floor(minutes/60); const min = minutes%60;
        const value = `${String(hour).padStart(2,'0')}h${String(min).padStart(2,'0')}`;
        const time = new Date(day); time.setHours(hour,min,0,0);
        if (time > new Date()) available++;
        slots += `<button type="button" data-time="${value}" aria-pressed="${state.time===value}" ${time<=new Date()?'disabled':''}>${value}</button>`;
      }
      content = `<h3 class="stage-heading" tabindex="-1">Choisir une heure</h3><p class="stage-note">${dateFormat.format(day)} · créneaux fictifs, sans disponibilité réelle.</p><div class="slots" aria-label="Heures proposées">${slots}</div>${available ? '' : '<p>Les heures de cette journée sont passées. Choisissez un autre jour.</p>'}<p class="error" id="stage-error" aria-live="polite"></p>${actions(true,true)}`;
    } else if (state.step === 4) {
      content = `<h3 class="stage-heading" tabindex="-1">Vos coordonnées</h3><p class="stage-note">Pour la simulation seulement&nbsp;: aucune donnée n’est envoyée.</p><label class="field" for="prenom">Prénom<input id="prenom" autocomplete="given-name" required aria-describedby="name-error"></label><p class="error" id="name-error" aria-live="polite"></p><label class="field" for="telephone">Téléphone<input id="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"></label><p class="error" id="phone-error" aria-live="polite"></p><div class="stage-actions"><button type="button" data-action="back">Retour</button><button type="button" class="next" data-action="confirm">Terminer la simulation →</button></div>`;
    } else {
      content = `<div class="success"><h3 class="stage-heading" tabindex="-1">Simulation terminée.</h3><p>Ce rendez-vous est fictif. Rien n’a été envoyé au salon.</p></div><div class="stage-actions"><button type="button" data-action="restart">Recommencer</button><a class="button dark" href="https://www.planity.com/le-salon-par-jeremy-51100-reims" target="_blank" rel="noopener">Réserver sur Planity ↗</a></div>`;
    }
    const progress = `<nav class="step-nav" aria-label="Étapes de la simulation">${['Prestation','Jour','Heure','Coordonnées'].map((label,i) => `<button type="button" data-step="${i+1}" ${i+1>reached?'disabled':''} ${i+1===state.step?'aria-current="step"':''}>${i+1}. ${label}</button>`).join('')}</nav>`;
    stage.innerHTML = progress + content;
    if (state.step === 4) { document.getElementById('prenom').value=state.name; document.getElementById('telephone').value=state.phone; }
    stage.classList.remove('stage-visible');
    requestAnimationFrame(() => stage.classList.add('stage-visible'));
    updateRecap();
    if (focus) stage.querySelector('h3').focus({preventScroll:true});
  }
  stage.addEventListener('change', event => {
    if (event.target.name === 'prestation') { const selected = services[Number(event.target.value)]; if (selected !== state.service) { state.date=''; state.time=''; reached=1; } state.service = selected; }
    updateRecap();
  });
  stage.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.dataset.date) { if (state.date !== target.dataset.date) { state.time=''; reached=2; } state.date=target.dataset.date; stage.querySelectorAll('[data-date]').forEach(b => b.setAttribute('aria-pressed',String(b===target))); updateRecap(); return; }
    if (target.dataset.time) { state.time=target.dataset.time; stage.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed',String(b===target))); updateRecap(); return; }
    if (target.dataset.step) { if (state.step===4) {state.name=document.getElementById('prenom').value;state.phone=document.getElementById('telephone').value;} state.step=Number(target.dataset.step); render(); return; }
    if (target.dataset.action === 'back') { if (state.step===4) {state.name=document.getElementById('prenom').value;state.phone=document.getElementById('telephone').value;} state.step--; render(); }
    if (target.dataset.action === 'next') {
      if ((state.step===1&&!state.service)||(state.step===2&&!state.date)||(state.step===3&&!state.time)) {document.getElementById('stage-error').textContent='Faites votre choix pour continuer.'; return;}
      state.step++; reached=Math.max(reached,state.step); render();
    }
    if (target.dataset.action === 'confirm') {
      const name=document.getElementById('prenom'); const phone=document.getElementById('telephone');
      state.name=name.value.trim(); state.phone=phone.value.trim();
      const goodName=state.name.length>0; const goodPhone=/^(?:0[1-9]|\+33\s*[1-9])(?:[\s.\-]*\d){8}$/.test(state.phone);
      document.getElementById('name-error').textContent=goodName?'':'Indiquez votre prénom.';
      document.getElementById('phone-error').textContent=goodPhone?'':'Indiquez un numéro de téléphone français valide.';
      name.setAttribute('aria-invalid',String(!goodName)); phone.setAttribute('aria-invalid',String(!goodPhone));
      if (!goodName || !goodPhone) { (goodName?phone:name).focus(); return; }
      state.step=5; render();
    }
    if (target.dataset.action === 'restart') { Object.assign(state,{step:1,service:'',date:'',time:'',name:'',phone:''}); reached=1; render(); }
  });
  render(false);
})();
