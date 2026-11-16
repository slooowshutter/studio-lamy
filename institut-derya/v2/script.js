(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const nodes = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.1 });
    nodes.forEach(node => observer.observe(node));
  } else nodes.forEach(node => node.classList.add('visible'));
  const path = document.querySelector('.path');
  const fill = document.querySelector('.path-fill');
  let ticking = false;
  function drawPath() {
    const rect = path.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight * .7 - rect.top) / rect.height));
    fill.style.transform = `scaleY(${progress})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(drawPath); ticking = true; } }, { passive: true });
  drawPath();
  const form = document.querySelector('#booking-form');
  const panel = document.querySelector('#booking-panel');
  const summary = document.querySelector('#summary');
  const error = document.querySelector('#form-error');
  const back = document.querySelector('#back');
  const next = document.querySelector('#next');
  const count = document.querySelector('#step-count');
  const state = { step: 0, service: '', day: '', time: '', firstName: '', phone: '' };
  const services = ['Épilation orientale', 'Soin du visage', 'Massage'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' });
  function escapeText(value) { const span = document.createElement('span'); span.textContent = value; return span.innerHTML; }
  function choices(values, name, selected) {
    return '<div class="choices">' + values.map(item => `<label class="choice"><input type="radio" name="${name}" value="${escapeText(item.value)}" ${item.value === selected ? 'checked' : ''} ${item.disabled ? 'disabled' : ''}><span>${escapeText(item.label)}</span>${item.note ? `<small>${escapeText(item.note)}</small>` : ''}</label>`).join('') + '</div>';
  }
  function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function days() {
    const now = new Date(); const paris = new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const [y,m,d] = paris.split('-').map(Number); const result = [];
    for (let i=0;i<14;i++) { const day = new Date(y,m-1,d+i,12); const closed = day.getDay()===0 || day.getDay()===1; result.push({value:dateKey(day),label:dateFormat.format(day),disabled:closed,note:closed ? 'fermé' : ''}); }
    return result;
  }
  function slots() {
    const now = new Date(); const parisDate = new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const hour = Number(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(now));
    return Array.from({length:10},(_,i) => { const h=i+10; return {value:`${String(h).padStart(2,'0')}:00`,label:`${h} h`,disabled:state.day===parisDate && h<=hour,note:state.day===parisDate && h<=hour ? 'passé' : ''}; });
  }
  function render(focus=true) {
    error.textContent = '';
    const selections = [state.service, state.day ? dateFormat.format(new Date(state.day+'T12:00:00')) : '', state.time ? state.time.replace(':',' h ') : ''];
    summary.replaceChildren();
    if (!selections.some(Boolean)) summary.textContent = 'Votre sélection apparaîtra ici.';
    else selections.forEach((value, index) => {
      if (!value) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'summary-link';
      button.textContent = value; button.setAttribute('aria-label', `Modifier : ${value}`);
      button.addEventListener('click', () => { state.step = index; render(); }); summary.append(button);
    });
    count.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'Parcours terminé';
    back.hidden = state.step===0 || state.step===4;
    next.hidden = state.step===4;
    next.innerHTML = state.step===3 ? 'Terminer la simulation ↗' : 'Continuer ↗';
    if (state.step===0) panel.innerHTML = '<h3 tabindex="-1">Quel soin souhaitez-vous&nbsp;?</h3><p class="hint">Les tarifs et durées sont à confirmer par téléphone.</p>' + choices(services.map(s=>({value:s,label:s})), 'service',state.service);
    if (state.step===1) panel.innerHTML = '<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="hint">Horaires publiés&nbsp;: du mardi au samedi. Lundi à confirmer.</p>' + choices(days(), 'day',state.day);
    if (state.step===2) panel.innerHTML = '<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">Créneaux fictifs, proposés dans les horaires publiés. Disponibilités et durée à confirmer.</p>' + choices(slots(),'time',state.time);
    if (state.step===3) panel.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Elles restent sur cet appareil et ne sont pas envoyées.</p><div class="fields"><label for="first-name">Prénom</label><input id="first-name" name="firstName" autocomplete="given-name" value="${escapeText(state.firstName)}" aria-describedby="first-error" required><span id="first-error" class="field-error"></span><label for="phone">Téléphone</label><input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error" required><span id="phone-error" class="field-error"></span></div>`;
    if (state.step===4) panel.innerHTML = '<div class="success"><h3 tabindex="-1">Parcours terminé</h3><p>Votre sélection est une simulation&nbsp;: aucun rendez-vous n’a été pris et rien n’a été envoyé.</p><p>Pour convenir d’un rendez-vous, appelez le <a href="tel:+33623368665">06&nbsp;23&nbsp;36&nbsp;86&nbsp;65</a>.</p><button class="back" type="button" id="restart">Recommencer</button></div>';
    panel.classList.remove('panel-enter'); void panel.offsetWidth; panel.classList.add('panel-enter');
    if (focus) panel.querySelector('h3')?.focus({preventScroll:true});
    document.querySelector('#restart')?.addEventListener('click',()=>{Object.assign(state,{step:0,service:'',day:'',time:'',firstName:'',phone:''}); render();});
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step<3) { const names=['service','day','time']; const choice=form.querySelector(`input[name="${names[state.step]}"]:checked`); if(!choice){error.textContent='Veuillez choisir une option pour continuer.';return;} const key=names[state.step]; if(state[key]!==choice.value && key==='day') state.time=''; state[key]=choice.value; }
    else if(state.step===3) { state.firstName=form.elements.firstName.value.trim(); state.phone=form.elements.phone.value.trim(); const digits=state.phone.replace(/[\s.()-]/g,''); const validPhone = /^(?:(?:\+33|0033)[1-9]\d{8}|0[1-9]\d{8})$/.test(digits);
      const firstInput = form.elements.firstName, phoneInput = form.elements.phone;
      firstInput.setAttribute('aria-invalid', String(!state.firstName)); phoneInput.setAttribute('aria-invalid', String(!validPhone));
      document.querySelector('#first-error').textContent = state.firstName ? '' : 'Indiquez votre prénom.';
      document.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!state.firstName || !validPhone) { (!state.firstName ? firstInput : phoneInput).focus(); return; } }
    state.step++; render();
  });
  back.addEventListener('click',()=>{if(state.step>0){state.step--;render();}});
  document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{state.service=link.dataset.service;state.step=0;render(false);}));
  render(false);
})();
