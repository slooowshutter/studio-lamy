(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tiles = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const count = entry.target.querySelector('[data-count]');
        if (count) {
          const end = Number(count.dataset.count), start = performance.now();
          const tick = now => { const progress = Math.min((now - start) / 400, 1); count.textContent = String(Math.round(end * progress)); if (progress < 1) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    root.classList.add('motion-ready');
    tiles.forEach(tile => observer.observe(tile));
  } else { tiles.forEach(tile => tile.classList.add('visible')); }
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && !row.dataset.category.split(' ').includes(button.dataset.filter); });
  }));
  const services = [
    {name:'Coupe + entretien de la barbe', duration:45},
    {name:'Entretien barbe sans rasage', duration:30},
    {name:'Tondeuse cheveux', duration:30},
    {name:'Taille de moustache', duration:30}
  ];
  const state = {step:0, service:null, day:null, time:null, name:'', phone:''};
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary');
  const number = document.querySelector('#step-number');
  const formatDay = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(date);
  const pad = n => String(n).padStart(2,'0');
  function updateSummary() {
    const parts = [];
    if (state.service !== null) parts.push(services[state.service].name);
    if (state.day) parts.push(formatDay(state.day));
    if (state.time) parts.push(state.time.replace(':',' h '));
    summary.replaceChildren();
    if (!parts.length) { summary.textContent = 'Aucune sélection pour le moment.'; return; }
    parts.forEach((part, index) => {
      if (index) summary.append(' · ');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'summary-button'; button.dataset.step = String(index); button.textContent = part; summary.append(button);
    });
  }
  function render(focus = true) {
    updateSummary();
    number.textContent = state.step < 4 ? `${pad(state.step + 1)} / 04` : 'TERMINÉ';
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Simulation sans envoi au salon.</p><fieldset><legend>Prestation</legend><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="service" value="${i}" ${state.service===i?'checked':''}> <span>${s.name}</span></label>`).join('')}</div></fieldset><div class="booking-controls"><button type="button" data-action="next" ${state.service===null?'disabled':''}>Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      const today = new Date(); today.setHours(0,0,0,0);
      const days = Array.from({length:14},(_,i)=>{const date=new Date(today);date.setDate(today.getDate()+i);return date;});
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés pour la simulation, selon les horaires publiés.</p><div class="date-grid">${days.map((d,i)=>`<button type="button" data-day="${i}" ${[0,1].includes(d.getDay())?'disabled':''} class="${state.day && d.toDateString()===state.day.toDateString()?'selected':''}">${formatDay(d)}${[0,1].includes(d.getDay())?'<br>Fermé':''}</button>`).join('')}</div><div class="booking-controls"><button class="back" type="button" data-action="back">← Prestation</button><button type="button" data-action="next" ${!state.day?'disabled':''}>Choisir une heure →</button></div>`;
    } else if (state.step === 2) {
      const close = state.day.getDay()===6 ? 16*60 : 19*60;
      const now = new Date();
      const slots = [];
      for(let m=9*60;m+services[state.service].duration<=close;m+=30){const label=`${pad(Math.floor(m/60))}:${pad(m%60)}`; const date=new Date(state.day);date.setHours(Math.floor(m/60),m%60);slots.push({label,past:date<=now});}
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs&nbsp;: les disponibilités réelles sont sur Planity.</p><div class="slot-grid">${slots.map(s=>`<button type="button" data-time="${s.label}" ${s.past?'disabled':''} class="${state.time===s.label?'selected':''}">${s.label.replace(':',' h ')}</button>`).join('')}</div><div class="booking-controls"><button class="back" type="button" data-action="back">← Jour</button><button type="button" data-action="next" ${!state.time?'disabled':''}>Continuer →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer uniquement&nbsp;: rien ne sera envoyé.</p><form id="details" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="name-error"></label><p id="name-error" class="error" role="status"></p><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error"></label><p id="phone-error" class="error" role="status"></p><div class="booking-controls"><button class="back" type="button" data-action="back">← Heure</button><button type="submit">Confirmer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Votre sélection est récapitulée ci-dessous. Aucun rendez-vous n’a été envoyé ni réservé.</p><div class="booking-controls"><a class="button dark" href="https://www.planity.com/barberie-des-ducs-21000-dijon" target="_blank" rel="noopener noreferrer">Réserver sur Planity ↗</a><button class="back" type="button" data-action="restart">Recommencer</button></div>`;
    }
    content.innerHTML = html;
    if (focus) content.querySelector('h3')?.focus({preventScroll:true});
  }
  let moving = false;
  function goTo(step) {
    if (moving) return;
    moving = true; content.classList.add('leaving');
    setTimeout(() => { state.step = step; render(); requestAnimationFrame(() => { content.classList.remove('leaving'); moving = false; }); }, reduced.matches ? 0 : 110);
  }
  summary.addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (button) goTo(Number(button.dataset.step)); });
  content.addEventListener('change', event => {
    if(event.target.name==='service'){state.service=Number(event.target.value);state.day=null;state.time=null;render(false);content.querySelector(`input[value="${state.service}"]`)?.focus();}
  });
  content.addEventListener('click', event => {
    const button=event.target.closest('button'); if(!button)return;
    if(button.dataset.day!==undefined){const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()+Number(button.dataset.day));state.day=date;state.time=null;render(false);content.querySelector(`[data-day="${button.dataset.day}"]`)?.focus();}
    if(button.dataset.time){state.time=button.dataset.time;render(false);content.querySelector(`[data-time="${state.time}"]`)?.focus();}
    if(button.dataset.action==='next'){goTo(state.step+1);}
    if(button.dataset.action==='back'){goTo(state.step-1);}
    if(button.dataset.action==='restart'){Object.assign(state,{service:null,day:null,time:null,name:'',phone:''});goTo(0);}
  });
  content.addEventListener('submit', event => {
    event.preventDefault();const form=event.target;const name=form.elements.prenom.value.trim();const phone=form.elements.telephone.value.replace(/[\s.()-]/g,'');
    const validPhone = /^(?:\+33|0)[1-9]\d{8}$/.test(phone);
    document.querySelector('#name-error').textContent = name ? '' : 'Indiquez votre prénom.';
    document.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    form.elements.prenom.setAttribute('aria-invalid', String(!name)); form.elements.telephone.setAttribute('aria-invalid', String(!validPhone));
    if (!name || !validPhone) { (name ? form.elements.telephone : form.elements.prenom).focus(); return; }
    state.name=name;state.phone=phone;goTo(4);
  });
  render(false);
})();
