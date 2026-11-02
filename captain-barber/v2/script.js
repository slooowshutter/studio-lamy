(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiles = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-count]').forEach(el => {
        const end = Number(el.dataset.count); let start;
        const tick = now => { if (!start) start = now; const progress = Math.min((now - start) / 500, 1); el.textContent = String(Math.round(end * progress)); if (progress < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      observer.unobserve(entry.target);
    }), {threshold:.15});
    tiles.forEach((tile, i) => { tile.style.setProperty('--delay', `${i * 65}ms`); observer.observe(tile); });
  } else tiles.forEach(tile => tile.classList.add('visible'));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const services = {
    traditionnelle: { name:'Barbe traditionnelle', duration:20 },
    classique: { name:'Barbe classique, contour coupe-choux', duration:15 },
    coupe: { name:'Coupe', duration:30 },
    formule: { name:'Coupe et barbe traditionnelle', duration:45 }
  };
  const state = { service:'', date:'', time:'', first:'', phone:'', step:0, completed:0 };
  const content = document.querySelector('#step-content');
  const summary = document.querySelector('#summary');
  const stepNumber = document.querySelector('#step-number');
  const nav = [...document.querySelectorAll('[data-go]')];
  const formatDay = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(date);
  const dateAtNoon = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d,12); };
  const keyDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function updateSummary() {
    const bits = [];
    if (state.service) bits.push(services[state.service].name);
    if (state.date) bits.push(formatDay(dateAtNoon(state.date)));
    if (state.time) bits.push(state.time.replace(':',' h '));
    summary.textContent = bits.length ? bits.join(' · ') : 'Aucune prestation choisie.';
    nav.forEach((b,i) => { b.disabled = i > state.completed; b.classList.toggle('current', i === state.step); if (i === state.step) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current'); });
    stepNumber.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'TERMINÉ';
  }
  function show(step, focus = true) {
    state.step = step; updateSummary();
    let html = '';
    if (step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation sans tarif. Consultez la carte pour les tarifs indicatifs.</p><div class="options">${Object.entries(services).map(([key,s]) => `<label class="option"><input type="radio" name="prestation" value="${key}" ${state.service===key?'checked':''}><span>${s.name}</span><small>${s.duration} min</small></label>`).join('')}</div><p class="error" id="step-error" role="status"></p><button class="next-button" type="button" data-next>Choisir le jour →</button>`;
    } else if (step === 1) {
      const today = new Date(); today.setHours(12,0,0,0);
      const days = Array.from({length:14}, (_,i) => { const d = new Date(today); d.setDate(today.getDate()+i); const key=keyDate(d); const sunday=d.getDay()===0; return `<button type="button" data-day="${key}" ${sunday?'disabled':''} class="${state.date===key?'selected':''}" aria-pressed="${state.date===key}">${formatDay(d)}${sunday?'<br>à confirmer':''}</button>`; }).join('');
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Exemples du lundi au samedi. Le dimanche est à confirmer.</p><div class="day-grid">${days}</div><p class="error" id="step-error" role="status"></p><button class="next-button" type="button" data-next>Choisir l’heure →</button>`;
    } else if (step === 2) {
      const now = new Date(); const todayKey=keyDate(now); const duration=services[state.service].duration; let times='';
      for (let minutes=600; minutes+duration<=1140; minutes+=30) {
        const time=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
        const past=state.date===todayKey && minutes<=now.getHours()*60+now.getMinutes();
        times+=`<button type="button" data-time="${time}" ${past?'disabled':''} class="${state.time===time?'selected':''}" aria-pressed="${state.time===time}">${time.replace(':',' h ')}${past?' · passé':''}</button>`;
      }
      html=`<h3 tabindex="-1">Choisir une heure</h3><p>Horaires proposés à titre d’exemple, sans lien avec les disponibilités du salon.</p><div class="time-grid">${times}</div><p class="error" id="step-error" role="status"></p><button class="next-button" type="button" data-next>Vos coordonnées →</button>`;
    } else if (step === 3) {
      html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans cette page et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="form-field" for="first">Prénom<input id="first" name="first" autocomplete="given-name" aria-describedby="step-error" required></label><label class="form-field" for="phone">Téléphone<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="step-error" required></label><p class="error" id="step-error" role="status"></p><button class="next-button" type="submit">Terminer la simulation →</button></form>`;
    } else {
      html=`<h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été envoyé ni réservé. Pour réserver réellement, utilisez Planity ou appelez le salon.</p><a class="next-button button" href="https://www.planity.com/captain-barber-83000-toulon">Réserver sur Planity ↗</a> <p><a href="tel:+33953063887">Appeler le 09 53 06 38 87</a></p><button class="filter" style="color:#171714;border-color:#171714" type="button" data-restart>Recommencer</button>`;
    }
    content.innerHTML=`<div class="step-panel">${html}</div>`;
    if (step===3) { document.querySelector('#first').value=state.first; document.querySelector('#phone').value=state.phone; }
    if (focus) content.querySelector('h3').focus({preventScroll:true});
  }
  content.addEventListener('change', event => { if(event.target.name==='prestation') { state.service=event.target.value; state.date=''; state.time=''; state.completed=0; updateSummary(); } });
  content.addEventListener('click', event => {
    const day=event.target.closest('[data-day]'), time=event.target.closest('[data-time]');
    if(day) { if (state.date !== day.dataset.day) { state.time=''; state.completed=Math.min(state.completed,1); } state.date=day.dataset.day; content.querySelectorAll('[data-day]').forEach(b=>{ b.classList.toggle('selected', b===day); b.setAttribute('aria-pressed',String(b===day)); }); updateSummary(); }
    if(time) { state.time=time.dataset.time; content.querySelectorAll('[data-time]').forEach(b=>{ b.classList.toggle('selected', b===time); b.setAttribute('aria-pressed',String(b===time)); }); updateSummary(); }
    if(event.target.closest('[data-next]')) {
      const valid=state.step===0?state.service:state.step===1?state.date:state.time;
      if(!valid) { document.querySelector('#step-error').textContent='Faites un choix pour continuer.'; return; }
      state.completed=Math.max(state.completed,state.step+1); show(state.step+1);
    }
    if(event.target.closest('[data-restart]')) { Object.assign(state,{service:'',date:'',time:'',first:'',phone:'',step:0,completed:0}); show(0); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault(); if (!state.service || !state.date || !state.time) { state.completed=0; show(0); return; } state.first=document.querySelector('#first').value.trim(); state.phone=document.querySelector('#phone').value.trim();
    const digits=state.phone.replace(/[\s.()-]/g,'');
    if(!state.first || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)) { document.querySelector('#step-error').textContent='Indiquez votre prénom et un numéro de téléphone français valide.'; return; }
    show(4);
  });
  nav.forEach(button => button.addEventListener('click', () => { if(!button.disabled) show(Number(button.dataset.go)); }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service=link.dataset.service; state.date=''; state.time=''; state.completed=0; show(0,false); }));
  show(0,false);
})();
