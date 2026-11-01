(() => {
  const services = [
    {id:'femme', name:'Coupe femme'},
    {id:'homme', name:'Coupe homme'},
    {id:'enfant', name:'Coupe enfant'},
    {id:'brushing', name:'Brushing'},
    {id:'coloration', name:'Coloration'}
  ];
  const state = {step:0, service:null, day:null, time:null};
  const content = document.querySelector('#step-content');
  const recap = document.querySelector('#recap');
  const live = document.querySelector('#booking-live');
  const nav = [...document.querySelectorAll('[data-go]')];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const shortDay = new Intl.DateTimeFormat('fr-FR', {weekday:'short'});
  const month = new Intl.DateTimeFormat('fr-FR', {month:'short'});
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dates = () => Array.from({length:14}, (_, i) => {const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d;});
  const dayForKey = key => dates().find(d => dateKey(d) === key);
  const isClosed = d => d.getDay() === 0 || d.getDay() === 1;
  const times = day => {
    if (!day || !state.service || isClosed(day)) return [];
    const out = [];
    for (let mins = 600; mins < (day.getDay() === 6 ? 1065 : 1140); mins += 30) {
      const h = Math.floor(mins/60), m = mins%60;
      const date = new Date(day); date.setHours(h,m,0,0);
      const taken = (day.getDate() + mins/30) % 5 === 0 || date <= new Date();
      out.push({value:`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, taken});
    }
    return out;
  };
  function updateSummary() {
    recap.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = 'Votre sélection'; recap.append(heading);
    const parts = [];
    if (state.service) parts.push(state.service.name);
    if (state.day) parts.push(dateFormat.format(dayForKey(state.day)));
    if (state.time) parts.push(state.time.replace(':',' h '));
    if (!parts.length) parts.push('Votre choix apparaîtra ici.');
    parts.forEach(part => {const line = document.createElement('div'); line.textContent = part; recap.append(line);});
    nav.forEach((button, index) => {
      button.disabled = index > 0 && (index === 1 ? !state.service : index === 2 ? !state.day : !state.time);
      if (index === state.step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  function render(focus = true) {
    updateSummary();
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations mentionnées par un annuaire, à confirmer avec le salon. Pour les tarifs, appelez le 05 32 59 40 18.</p><fieldset class="choice-list"><legend class="sr-only">Prestation</legend>${services.map(s => `<label class="choice"><input type="radio" name="prestation" value="${s.id}" ${state.service?.id===s.id?'checked':''}><span>${s.name}</span><small>Sur appel</small></label>`).join('')}</fieldset><div class="actions"><button class="primary" type="button" data-next ${state.service?'':'disabled'}>Choisir le jour →</button></div>`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires indicatifs, à confirmer. Les dimanches et lundis sont indiqués fermés.</p><div class="date-grid" role="group" aria-label="Jours proposés">${dates().map(d => {const closed=isClosed(d), key=dateKey(d); return `<button type="button" class="date-choice ${state.day===key?'selected':''}" data-day="${key}" ${closed?'disabled':''} aria-pressed="${state.day===key}" aria-label="${dateFormat.format(d)}${closed?', fermé':''}"><span>${shortDay.format(d)}</span><strong>${d.getDate()}</strong><small>${closed?'fermé':month.format(d)}</small></button>`;}).join('')}</div><div class="actions"><button class="secondary" type="button" data-back>← Prestation</button><button class="primary" type="button" data-next ${state.day?'':'disabled'}>Choisir l’heure →</button></div>`;
    } else if (state.step === 2) {
      const slots=times(dayForKey(state.day));
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>${dateFormat.format(dayForKey(state.day))} · créneaux fictifs, barrés lorsqu’indisponibles.</p><div class="slot-grid" role="group" aria-label="Heures proposées">${slots.map(slot=>`<button type="button" class="slot ${state.time===slot.value?'selected':''}" data-time="${slot.value}" ${slot.taken?'disabled':''} aria-pressed="${state.time===slot.value}" aria-label="${slot.value.replace(':',' h ')}${slot.taken?', indisponible':''}">${slot.value.replace(':',' h ')}</button>`).join('')}</div><div class="actions"><button class="secondary" type="button" data-back>← Jour</button><button class="primary" type="button" data-next ${state.time?'':'disabled'}>Vos coordonnées →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Vérifiez votre sélection puis terminez la simulation. Rien ne sera envoyé.</p><form id="booking-form" novalidate><div class="fields"><div class="field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" required aria-describedby="prenom-erreur"><span class="error" id="prenom-erreur"></span></div><div class="field"><label for="telephone">Téléphone mobile</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="telephone-erreur"><span class="error" id="telephone-erreur"></span></div></div><div class="actions"><button class="secondary" type="button" data-back>← Heure</button><button class="primary" type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      html = `<div class="success"><h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été transmis. Pour joindre le salon, appelez le <a href="tel:+33532594018">05 32 59 40 18</a>.</p><p>Votre sélection reste affichée à gauche. Horaires et tarifs sont à confirmer par téléphone.</p><button class="primary" type="button" data-restart>Recommencer</button></div>`;
    }
    content.innerHTML = `<div class="step-body entering">${html}</div>`;
    const body=content.firstElementChild;
    requestAnimationFrame(()=>requestAnimationFrame(()=>body.classList.remove('entering')));
    const h=content.querySelector('h3');
    live.textContent = h.textContent;
    if (focus) h.focus({preventScroll:true});
  }
  content.addEventListener('change', e => {
    if (e.target.name === 'prestation') {
      const selected=services.find(s=>s.id===e.target.value);
      if (state.service?.id !== selected.id) {state.day=null; state.time=null;}
      state.service=selected; updateSummary(); content.querySelector('[data-next]').disabled=false;
    }
  });
  content.addEventListener('click', e => {
    const button=e.target.closest('button'); if(!button) return;
    if (button.hasAttribute('data-day')) {if(state.day!==button.dataset.day) state.time=null; state.day=button.dataset.day; content.querySelectorAll('[data-day]').forEach(b=>{const selected=b===button; b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected));}); content.querySelector('[data-next]').disabled=false; updateSummary();}
    else if(button.hasAttribute('data-time')) {state.time=button.dataset.time; content.querySelectorAll('[data-time]').forEach(b=>{const selected=b===button; b.classList.toggle('selected',selected); b.setAttribute('aria-pressed',String(selected));}); content.querySelector('[data-next]').disabled=false; updateSummary();}
    else if(button.hasAttribute('data-next')) {state.step++; render();}
    else if(button.hasAttribute('data-back')) {state.step--; render();}
    else if(button.hasAttribute('data-restart')) {Object.assign(state,{step:0,service:null,day:null,time:null}); render();}
  });
  content.addEventListener('input', e => {
    if (e.target.id === 'prenom' || e.target.id === 'telephone') { const error=content.querySelector(`#${e.target.id}-erreur`); error.textContent=''; e.target.removeAttribute('aria-invalid'); }
  });
  content.addEventListener('submit', e => {
    e.preventDefault();
    const first=content.querySelector('#prenom'), phone=content.querySelector('#telephone');
    const clean=phone.value.replace(/[\s.()\-]/g,'');
    const validFirst=first.value.trim().length>=2;
    const validPhone=/^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(clean);
    content.querySelector('#prenom-erreur').textContent=validFirst?'':'Indiquez votre prénom (au moins deux caractères).';
    content.querySelector('#telephone-erreur').textContent=validPhone?'':'Indiquez un numéro mobile français valide.';
    first.setAttribute('aria-invalid',String(!validFirst)); phone.setAttribute('aria-invalid',String(!validPhone));
    if(!validFirst) first.focus(); else if(!validPhone) phone.focus(); else {state.step=4; render();}
  });
  nav.forEach(button=>button.addEventListener('click',()=>{if(!button.disabled){state.step=Number(button.dataset.go); render();}}));
  document.querySelectorAll('[data-service]').forEach(button=>button.addEventListener('click',()=>{state.service=services.find(s=>s.id===button.dataset.service); state.day=null; state.time=null; state.step=0; render(); document.querySelector('#reservation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  document.querySelectorAll('.filter').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>{b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button));}); document.querySelectorAll('.price-row').forEach(row=>{row.hidden=button.dataset.filter!=='tout' && row.dataset.category!==button.dataset.filter;});}));
  render(false);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('shown'); observer.unobserve(entry.target);}}),{threshold:.12}) : null;
  document.querySelectorAll('.entrance, .reveal, .date-block').forEach((element,i)=>{if(element.classList.contains('entrance')) element.style.transitionDelay=`${Math.min(i*65,260)}ms`; if(observer) observer.observe(element); else element.classList.add('shown');});
})();
