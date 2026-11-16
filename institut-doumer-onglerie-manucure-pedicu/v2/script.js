(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  requestAnimationFrame(() => document.querySelectorAll('.entrance').forEach(el => el.classList.add('visible')));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));

  const services = {
    mains: { label: 'Manucure avec vernis couleur', duration: 20 },
    pieds: { label: 'Vernis couleur pour les pieds', duration: 35 },
    sourcils: { label: 'Épilation des sourcils', duration: 15 }
  };
  const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary');
  const progress = document.querySelector('#progress');
  const summaryActions = document.querySelector('#summary-actions');
  const formatDay = d => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(d);
  const dateAtNoon = value => new Date(`${value}T12:00:00`);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    const parts = [];
    if (state.service) parts.push(services[state.service].label);
    if (state.date) parts.push(formatDay(dateAtNoon(state.date)));
    if (state.time) parts.push(state.time.replace(':',' h '));
    summary.textContent = parts.join(' · ') || 'Aucune prestation choisie';
    summaryActions.innerHTML = [state.service && state.step>0 ? '<button type="button" data-edit="0">Modifier la prestation</button>' : '', state.date && state.step>1 ? '<button type="button" data-edit="1">Modifier le jour</button>' : '', state.time && state.step>2 ? '<button type="button" data-edit="2">Modifier l’heure</button>' : ''].join('');
  }
  function optionsForDays() {
    const now = new Date();
    return Array.from({length:14}, (_, i) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()+i, 12);
      const value = dateKey(day);
      const label = new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(day);
      return `<label class="choice"><input type="radio" name="jour" value="${value}" ${state.date===value?'checked':''}><span>${label}</span></label>`;
    }).join('');
  }
  function optionsForTimes() {
    const now = new Date();
    const duration = services[state.service].duration;
    const items = [];
    for (let minutes=630; minutes+duration<=1200; minutes+=30) {
      const hour = Math.floor(minutes/60), minute = minutes%60;
      const value = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
      const isPast = state.date===dateKey(now) && minutes<=now.getHours()*60+now.getMinutes();
      if (!isPast) items.push(`<label class="choice"><input type="radio" name="heure" value="${value}" ${state.time===value?'checked':''}><span>${value.replace(':',' h ')}</span></label>`);
    }
    return items.join('') || '<p>Il ne reste pas de créneau fictif aujourd’hui. Choisissez un autre jour.</p>';
  }
  function render(focus = false) {
    updateSummary();
    progress.innerHTML = Array.from({length:4}, (_,i)=>`<span class="${i<=Math.min(state.step,3)?'current':''}" aria-hidden="true"></span>`).join('');
    let html = '';
    if (state.step===0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p class="hint">Étape 1 sur 4 · Durées de la fiche, à confirmer.</p><fieldset class="choices"><legend>Prestation</legend>${Object.entries(services).map(([key,item])=>`<label class="choice"><input type="radio" name="prestation" value="${key}" ${state.service===key?'checked':''}><span>${item.label}</span><span>${item.duration}&nbsp;min</span></label>`).join('')}</fieldset><div class="booking-actions"><button type="button" data-next ${state.service?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step===1) {
      html = `<h3 tabindex="-1">Choisir un jour</h3><p class="hint">Étape 2 sur 4 · Horaires affichés sur la fiche, à confirmer. Les jours sont fictifs.</p><fieldset class="days"><legend>Jour</legend>${optionsForDays()}</fieldset><div class="booking-actions"><button class="secondary" type="button" data-back>← Retour</button><button type="button" data-next ${state.date?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step===2) {
      html = `<h3 tabindex="-1">Choisir une heure</h3><p class="hint">Étape 3 sur 4 · Créneaux fictifs, entre 10 h 30 et 20 h.</p><fieldset class="slots"><legend>Heure</legend>${optionsForTimes()}</fieldset><div class="booking-actions"><button class="secondary" type="button" data-back>← Retour</button><button type="button" data-next ${state.time?'':'disabled'}>Continuer →</button></div>`;
    } else if (state.step===3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Étape 4 sur 4 · Simulation uniquement, rien ne sera transmis.</p><form id="coordonnees" novalidate><label class="field" for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-prenom"><p class="error" id="erreur-prenom"></p><label class="field" for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><p class="error" id="erreur-telephone"></p><div class="booking-actions"><button class="secondary" type="button" data-back>← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Rien n’a été envoyé et aucun rendez-vous n’a été réservé.</p><p class="hint" id="recapitulatif"></p><div class="booking-actions"><a class="button button-pink" href="https://www.treatwell.fr/salon/institut-doumer/" target="_blank" rel="noopener">Réserver sur Treatwell ↗</a><button class="secondary" type="button" data-restart>Recommencer</button></div>`;
    }
    content.innerHTML = `<div class="booking-step${focus && !reduced.matches?' enter':''}">${html}</div>`;
    const step = content.querySelector('.booking-step');
    if (state.step===4) content.querySelector('#recapitulatif').textContent = `${state.name} · ${services[state.service].label} · ${formatDay(dateAtNoon(state.date))} à ${state.time.replace(':',' h ')}`;
    if (focus) {
      step.querySelector('h3').focus({preventScroll:true});
      requestAnimationFrame(()=>requestAnimationFrame(()=>step.classList.remove('enter')));
    }
  }
  content.addEventListener('change', event => {
    const input = event.target;
    if (input.name==='prestation') { state.service=input.value; state.time=''; }
    if (input.name==='jour') { state.date=input.value; state.time=''; }
    if (input.name==='heure') state.time=input.value;
    updateSummary();
    const next = content.querySelector('[data-next]'); if (next) next.disabled=false;
  });
  content.addEventListener('click', event => {
    if (event.target.closest('[data-next]')) { state.step++; render(true); }
    if (event.target.closest('[data-back]')) { if(state.step===3){state.name=content.querySelector('#prenom').value;state.phone=content.querySelector('#telephone').value;} state.step--; render(true); }
    if (event.target.closest('[data-restart]')) { Object.assign(state,{step:0,service:'',date:'',time:'',name:'',phone:''}); render(true); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault();
    state.name=content.querySelector('#prenom').value.trim(); state.phone=content.querySelector('#telephone').value.trim();
    const validName = state.name.length>=2;
    const digits = state.phone.replace(/[\s.()-]/g,'');
    const validPhone = /^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);
    content.querySelector('#erreur-prenom').textContent=validName?'':'Indiquez votre prénom.';
    content.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro de téléphone français valide.';
    content.querySelector('#prenom').setAttribute('aria-invalid',String(!validName));
    content.querySelector('#telephone').setAttribute('aria-invalid',String(!validPhone));
    if (!validName || !validPhone) { content.querySelector(validName?'#telephone':'#prenom').focus(); return; }
    state.step=4; render(true);
  });
  summaryActions.addEventListener('click', event => {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    if (state.step===3) { state.name=content.querySelector('#prenom').value; state.phone=content.querySelector('#telephone').value; }
    state.step=Number(button.dataset.edit); render(true);
  });
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{ state.service=link.dataset.service; state.date=''; state.time=''; state.step=0; render(); }));
  render();
})();
