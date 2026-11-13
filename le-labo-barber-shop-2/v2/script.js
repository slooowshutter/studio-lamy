(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); } });
  }, { threshold: 0.08 }) : null;
  document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));

  const services = ['Coupe', 'Coupe + barbe', 'Barbe', 'Coupe enfant -10 ans'];
  const state = { service: '', date: '', time: '', name: '', phone: '', step: 0, reached: 0 };
  const panel = document.getElementById('etape');
  const steps = [...document.querySelectorAll('[data-go]')];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parseDate = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    document.getElementById('resume-service').textContent = state.service || 'À choisir';
    document.getElementById('resume-jour').textContent = state.date ? dateFormat.format(parseDate(state.date)) : 'À choisir';
    document.getElementById('resume-heure').textContent = state.time || 'À choisir';
    steps.forEach((button, index) => { button.disabled = index > state.reached; if (index === state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
  }
  function days() {
    const now = new Date(); now.setHours(0,0,0,0);
    return Array.from({length:14}, (_,i) => { const d = new Date(now); d.setDate(now.getDate()+i); return d; });
  }
  function unavailable(date, hour, minute, index) {
    const slot = parseDate(date); slot.setHours(hour, minute, 0, 0);
    return slot <= new Date() || (slot.getDate() + index * 3) % 7 === 0;
  }
  function render(moveFocus = true) {
    updateSummary();
    if (state.step === 0) {
      panel.innerHTML = `<h3 tabindex="-1">Choisissez une prestation</h3><p>Liste publiée par le salon sur Planity.</p><fieldset><legend>Prestation</legend><div class="choices">${services.map((s,i)=>`<label class="choice"><input type="radio" name="prestation" value="${escapeText(s)}" ${state.service===s?'checked':''}><span>${escapeText(s)}</span></label>`).join('')}</div></fieldset><p class="error" id="erreur" role="status"></p><div class="step-actions"><button type="button" data-next>Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      panel.innerHTML = `<h3 tabindex="-1">Choisissez un jour</h3><p>Pour cette simulation, seuls les jours du lundi au jeudi sont proposés ; les autres jours ne sont pas nécessairement fermés.</p><fieldset><legend>Jour de la simulation</legend><div class="choices">${days().map(d=>{const value=iso(d), closed=d.getDay()===0 || d.getDay()>=5; return `<label class="choice"><input type="radio" name="jour" value="${value}" ${closed?'disabled':''} ${state.date===value?'checked':''}><span>${dayFormat.format(d)}${closed?'<small>Non proposé</small>':''}</span></label>`}).join('')}</div></fieldset><p class="error" id="erreur" role="status"></p><div class="step-actions"><button type="button" class="back" data-back>← Prestation</button><button type="button" data-next>Choisir une heure →</button></div>`;
    } else if (state.step === 2) {
      const slots = Array.from({length:18}, (_,i)=>{const hour=10+Math.floor(i/2),minute=i%2?30:0, label=`${String(hour).padStart(2,'0')} h ${String(minute).padStart(2,'0')}`, disabled=unavailable(state.date,hour,minute,i); return `<label class="choice"><input type="radio" name="heure" value="${label}" ${disabled?'disabled':''} ${state.time===label?'checked':''}><span>${label}${disabled?'<small>Indisponible dans cet exemple</small>':''}</span></label>`}).join('');
      panel.innerHTML = `<h3 tabindex="-1">Choisissez une heure</h3><p>Créneaux fictifs, sans lien avec les disponibilités réelles.</p><fieldset><legend>Heure de la simulation</legend><div class="choices">${slots}</div></fieldset><p class="error" id="erreur" role="status"></p><div class="step-actions"><button type="button" class="back" data-back>← Jour</button><button type="button" data-next>Continuer →</button></div>`;
    } else if (state.step === 3) {
      panel.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="coordonnees" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" required aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></label><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" required aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></label><div class="step-actions"><button type="button" class="back" data-back>← Heure</button><button class="form-submit" type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      panel.innerHTML = `<h3 tabindex="-1">Simulation terminée</h3><p>${escapeText(state.name)}, votre sélection&nbsp;: <strong>${escapeText(state.service)}</strong>, le ${dateFormat.format(parseDate(state.date))} à ${escapeText(state.time)}.</p><p><strong>Aucun rendez-vous n’a été pris et rien n’a été envoyé.</strong> Pour réserver réellement, utilisez <a href="https://www.planity.com/labo-barber-tours-37000">Planity</a> ou appelez le <a href="tel:+33234383856">02 34 38 38 56</a>.</p><div class="step-actions"><button type="button" data-restart>Recommencer</button></div>`;
    }
    if (moveFocus) panel.querySelector('h3')?.focus({preventScroll:true});
  }
  let transitionTimer;
  function go(step) {
    clearTimeout(transitionTimer);
    state.step = step; state.reached = Math.max(state.reached,step);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { render(); return; }
    panel.classList.add('changing');
    transitionTimer = setTimeout(() => { render(); panel.classList.remove('changing'); }, 200);
  }
  panel.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation' && state.service !== input.value) { state.service=input.value; state.date=''; state.time=''; state.reached=0; }
    if (input.name === 'jour' && state.date !== input.value) { state.date=input.value; state.time=''; state.reached=1; }
    if (input.name === 'heure') { state.time=input.value; state.reached=2; }
    updateSummary();
  });
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-back]')) go(state.step-1);
    if (event.target.closest('[data-restart]')) { Object.assign(state,{service:'',date:'',time:'',name:'',phone:'',step:0,reached:0}); go(0); }
    if (!event.target.closest('[data-next]')) return;
    const valid = [state.service,state.date,state.time][state.step];
    if (!valid) { document.getElementById('erreur').textContent = 'Veuillez choisir une option pour continuer.'; return; }
    go(state.step+1);
  });
  panel.addEventListener('submit', event => {
    event.preventDefault(); const data=new FormData(event.target); state.name=String(data.get('prenom')).trim(); state.phone=String(data.get('telephone')).trim();
    const nameError=document.getElementById('erreur-prenom'),phoneError=document.getElementById('erreur-telephone');
    nameError.textContent=state.name ? '' : 'Indiquez votre prénom.';
    phoneError.textContent=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone) ? '' : 'Indiquez un numéro de téléphone français valide.';
    if(nameError.textContent || phoneError.textContent) { (nameError.textContent ? event.target.prenom : event.target.telephone).focus(); return; }
    go(4);
  });
  steps.forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.go);if(target<=state.reached)go(target)}));
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.date='';state.time='';state.reached=1;go(1)}));
  render(false);
})();
