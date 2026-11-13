(() => {
  document.documentElement.classList.add('js');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    const bookingObserver = new IntersectionObserver(entries => document.body.classList.toggle('booking-visible', entries[0].isIntersecting), { threshold: 0.05 });
    bookingObserver.observe(document.querySelector('#rendez-vous'));
  } else document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  const panel = document.querySelector('#booking-step');
  const summary = document.querySelector('#summary');
  const live = document.querySelector('#booking-live');
  const progress = document.querySelector('#progress-text');
  const dots = document.querySelector('#progress-dots');
  const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Full balayage', 'Coupe et coiffage', 'Gloss et soin'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const isoDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function todayParis() { const parts = new Intl.DateTimeFormat('fr-CA', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()).split('-').map(Number); return new Date(parts[0], parts[1]-1, parts[2], 12); }
  function dateFromISO(value) { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,12); }
  function dayLabel(value) { return dateFormat.format(dateFromISO(value)); }
  function updateSummary() { summary.textContent = [state.service, state.day ? dayLabel(state.day) : '', state.time].filter(Boolean).join(' · ') || 'À composer'; }
  function render(focus = true) {
    progress.textContent = state.step === 4 ? 'Simulation terminée' : `Étape ${state.step+1} sur 4`;
    dots.textContent = state.step === 4 ? '● ● ● ●' : Array.from({length:4}, (_, i) => i <= state.step ? '●' : '○').join(' ');
    let html = '';
    if (state.step === 0) html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Un aperçu du parcours, sans tarif ni disponibilité réelle.</p><fieldset><legend>Prestation</legend>${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}> ${s}</label>`).join('')}</fieldset>`;
    if (state.step === 1) { const base = todayParis(); const days = Array.from({length:14}, (_,i) => {const d = new Date(base); d.setDate(base.getDate()+i); return d;}); html = `<h3 tabindex="-1">Choisir un jour</h3><p>Les jours proposés suivent les horaires publiés, sous réserve de confirmation.</p><fieldset><legend>Jour</legend><div class="choices-grid">${days.map(d => {const id = isoDate(d), closed = d.getDay() === 0 || d.getDay() === 1; return `<label class="choice"><input type="radio" name="day" value="${id}" ${closed?'disabled':''} ${state.day===id?'checked':''}> <span>${dateFormat.format(d)}${closed?' · fermé':''}</span></label>`}).join('')}</div></fieldset>`; }
    if (state.step === 2) { const d = dateFromISO(state.day); const slots = d.getDay()===6 ? ['8 h','12 h'] : ['10 h','14 h']; const nowParts = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number); const nowMinutes=nowParts[0]*60+nowParts[1]; const today=isoDate(todayParis()); html=`<h3 tabindex="-1">Choisir une heure</h3><p>Heures fictives, sans disponibilité réelle. La durée et la faisabilité sont à confirmer avec le salon.</p><fieldset><legend>Heure pour le ${dayLabel(state.day)}</legend><div class="choices-grid">${slots.map(s=>{const past=state.day===today && parseInt(s,10)*60<=nowMinutes;return `<label class="choice"><input type="radio" name="time" value="${s}" ${past?'disabled':''} ${state.time===s&&!past?'checked':''}> ${s}${past?' · passé':''}</label>`}).join('')}</div></fieldset>`; }
    if (state.step === 3) html=`<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans cette page et ne sont pas envoyées.</p><div class="fields"><label for="name">Prénom</label><input id="name" autocomplete="given-name" value="${escapeHTML(state.name)}" aria-describedby="name-error"><div class="error" id="name-error" aria-live="polite"></div><label for="phone">Téléphone</label><input id="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="phone-error"><div class="error" id="phone-error" aria-live="polite"></div></div>`;
    if (state.step === 4) html=`<h3 tabindex="-1">Votre simulation est prête.</h3><p>${escapeHTML(state.name)}, vous avez choisi ${escapeHTML(state.service)}, le ${escapeHTML(dayLabel(state.day))} à ${escapeHTML(state.time)}.</p><p><strong>Aucun rendez-vous n’a été envoyé ni confirmé.</strong> Pour prendre rendez-vous, appelez le <a href="tel:+33478607811">04 78 60 78 11</a> ou utilisez <a href="https://www.planity.com/in2hair-69003-lyon" target="_blank" rel="noopener">Planity</a>.</p><div class="flow-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
    if (state.step < 4) html += `<p class="error" id="step-error" role="status"></p><div class="flow-actions">${state.step>0?'<button type="button" data-action="back">← Retour</button>':''}<button class="next" type="button" data-action="next">${state.step===3?'Terminer la simulation':'Continuer'} →</button></div>`;
    panel.innerHTML=html; updateSummary();
    if(focus) { const heading=panel.querySelector('h3'); heading.focus({preventScroll:true}); live.textContent=progress.textContent+' : '+heading.textContent; }
  }
  let transitionTimer;
  function changeStep(step, push = true) {
    clearTimeout(transitionTimer);
    panel.classList.add('changing');
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150;
    transitionTimer = setTimeout(() => { state.step = step; render(); panel.classList.remove('changing'); }, delay);
    if (push) history.pushState({ bookingStep: step }, '', location.href);
  }
  window.addEventListener('popstate', event => { if (event.state && Number.isInteger(event.state.bookingStep)) changeStep(event.state.bookingStep, false); });
  history.replaceState({ ...(history.state || {}), bookingStep: 0 }, '', location.href);
  panel.addEventListener('input', event => {
    if (event.target.id === 'name') state.name = event.target.value;
    if (event.target.id === 'phone') state.phone = event.target.value;
    if (event.target.name === 'service') state.service = event.target.value;
    if (event.target.name === 'day') { if (state.day !== event.target.value) state.time = ''; state.day = event.target.value; }
    if (event.target.name === 'time') state.time = event.target.value;
    updateSummary();
  });
  panel.addEventListener('click', event => { const action=event.target.closest('button')?.dataset.action; if(!action)return; if(action==='restart'){Object.assign(state,{service:'',day:'',time:'',name:'',phone:''});changeStep(0);return;} if(action==='back'){if(state.step===3){state.name=panel.querySelector('#name').value;state.phone=panel.querySelector('#phone').value;} changeStep(state.step-1);return;}
    if(state.step<3){const key=['service','day','time'][state.step];const selected=panel.querySelector(`input[name="${key}"]:checked`);if(!selected){panel.querySelector('#step-error').textContent='Veuillez faire un choix pour continuer.';return;}if(key==='day' && state.day!==selected.value)state.time='';state[key]=selected.value;}
    else {state.name=panel.querySelector('#name').value.trim();state.phone=panel.querySelector('#phone').value.trim();let valid=true;if(!state.name){panel.querySelector('#name-error').textContent='Indiquez votre prénom.';valid=false;}if(!/^(?:(?:\+33|0033|0)[1-9])(?:[ .-]?\d{2}){4}$/.test(state.phone)){panel.querySelector('#phone-error').textContent='Indiquez un numéro de téléphone français valide.';valid=false;}if(!valid)return;}
    changeStep(state.step+1);
  });
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.step=0;render(false);history.replaceState({ ...(history.state || {}), bookingStep: 0 }, '', location.href);}));
  render(false);
})();
