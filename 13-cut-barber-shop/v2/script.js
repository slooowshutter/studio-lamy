(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const services = {
    tondeuse: { name: 'Coupe classique tondeuse homme', duration: 30 },
    ciseaux: { name: 'Coupe classique tondeuse + ciseaux', duration: 30 },
    forfait: { name: 'Forfait coupe tondeuse + barbe', duration: 30 },
    rasage: { name: 'Rasage de barbe à la lame', duration: 15 }
  };
  const state = { step: 1, reached: 1, service: '', date: '', time: '', firstName: '', phone: '' };
  const body = document.querySelector('#booking-body');
  const summary = document.querySelector('#summary');
  const count = document.querySelector('#step-count');
  const progress = document.querySelector('#progress-fill');
  const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const parisNow = () => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); return Object.fromEntries(parts.map(p => [p.type, p.value])); };
  const parisKey = now => `${now.year}-${now.month}-${now.day}`;
  const expired = () => { const now=parisNow(); return state.date < parisKey(now) || (state.date === parisKey(now) && state.time <= `${now.hour}:${now.minute}`); };
  const dateFromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function refreshSummary() {
    const parts = [];
    if (state.service) parts.push(services[state.service].name);
    if (state.date) parts.push(dateFmt.format(dateFromKey(state.date)));
    if (state.time) parts.push(state.time.replace(':',' h '));
    summary.textContent = parts.length ? parts.join(' · ') : 'Choisissez une prestation pour commencer.';
  }
  function render(focus = true) {
    count.textContent = state.step <= 4 ? `0${state.step} / 04` : 'TERMINÉ';
    progress.style.width = `${Math.min(state.step,4)*25}%`;
    refreshSummary();
    document.querySelectorAll('[data-step]').forEach(button => { const step=Number(button.dataset.step); button.disabled=step>state.reached; button.setAttribute('aria-current', step===state.step ? 'step' : 'false'); });
    let html = '';
    if (state.step === 1) {
      html = `<h3 tabindex="-1">Votre prestation</h3><p class="hint">Simulation sans prix. Choisissez une prestation.</p><div class="choices">${Object.entries(services).map(([id,s]) => `<label class="choice"><input type="radio" name="prestation" value="${id}" ${state.service===id?'checked':''}><span>${s.name}</span><span>${s.duration}&nbsp;min</span></label>`).join('')}</div><div class="booking-actions"><button type="button" data-action="service-next">Continuer →</button></div><p class="error" id="booking-error" role="status"></p>`;
    } else if (state.step === 2) {
      const now = parisNow(); const today = new Date(Date.UTC(Number(now.year), Number(now.month)-1, Number(now.day), 12));
      const days = Array.from({length:14}, (_,i) => { const d = new Date(today); d.setUTCDate(d.getUTCDate()+i); const key = d.toISOString().slice(0,10); const allowed = d.getUTCDay() >= 2 && d.getUTCDay() <= 6; return `<button type="button" data-day="${key}" class="${state.date===key?'selected':''}" ${allowed?'':'disabled'} aria-pressed="${state.date===key}">${shortDay.format(d)}<br>${shortDate.format(d)}${allowed?'':'<small>non proposé</small>'}</button>`; }).join('');
      html = `<h3 tabindex="-1">Choisissez un jour</h3><p class="hint">Créneaux fictifs du mardi au samedi, horaires à confirmer.</p><div class="day-grid">${days}</div><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="day-next">Continuer →</button></div><p class="error" id="booking-error" role="status"></p>`;
    } else if (state.step === 3) {
      const now = parisNow(); const today = parisKey(now) === state.date;
      const slots = Array.from({length:16},(_,i) => { const minutes=660+i*30; const value=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`; const past=today && minutes <= Number(now.hour)*60+Number(now.minute); const taken=i%5===3; return `<button type="button" data-time="${value}" class="${state.time===value?'selected':''}" ${past||taken?'disabled':''} aria-pressed="${state.time===value}" ${taken?'aria-label="'+value.replace(':',' h ')+' non proposé dans cette simulation"':''}>${value.replace(':',' h ')}</button>`; }).join('');
      html = `<h3 tabindex="-1">Choisissez une heure</h3><p class="hint">Exemples de créneaux, sans disponibilité réelle. Les heures barrées ne sont pas proposées dans cette simulation. Horaires à confirmer.</p><div class="time-grid">${slots}</div><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="time-next">Continuer →</button></div><p class="error" id="booking-error" role="status"></p>`;
    } else if (state.step === 4) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Pour cet essai, les informations restent sur cet appareil.</p><form id="booking-form" novalidate><label class="form-field" for="first-name">Prénom<input id="first-name" name="prenom" autocomplete="given-name" value="${escapeHTML(state.firstName)}" aria-describedby="name-error" required></label><p class="error" id="name-error"></p><label class="form-field" for="phone">Téléphone<input id="phone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="phone-error" required></label><p class="error" id="phone-error"></p><div class="booking-actions"><button class="back" type="button" data-action="back">← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p class="success-copy">Merci ${escapeHTML(state.firstName)}. Rien n’a été envoyé&nbsp;: ceci n’est pas un rendez-vous confirmé.</p><p><a href="https://www.planity.com/13-cut-75013-paris" target="_blank" rel="noopener">Réserver réellement sur Planity ↗</a></p><div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
    }
    body.innerHTML = `<div class="step-enter is-entering">${html}</div>`;
    requestAnimationFrame(() => { const panel=body.querySelector('.step-enter'); if(panel) panel.classList.remove('is-entering'); });
    if (focus) body.querySelector('h3').focus({preventScroll:true});
  }
  function error(message) { const el = document.querySelector('#booking-error'); if (el) el.textContent=message; }
  body.addEventListener('change', e => { if (e.target.name==='prestation') { if (state.service !== e.target.value) { state.service=e.target.value; state.time=''; state.reached=1; } refreshSummary(); } });
  body.addEventListener('click', e => {
    const button=e.target.closest('button'); if(!button) return;
    if(button.dataset.day) { if(state.date!==button.dataset.day) { state.date=button.dataset.day; state.time=''; state.reached=Math.min(state.reached,3); } render(false); body.querySelector(`[data-day="${state.date}"]`).focus(); return; }
    if(button.dataset.time) { state.time=button.dataset.time; render(false); body.querySelector(`[data-time="${state.time}"]`).focus(); return; }
    switch(button.dataset.action) {
      case 'service-next': if(!state.service) return error('Choisissez une prestation.'); state.step=2; break;
      case 'day-next': if(!state.date) return error('Choisissez un jour.'); state.step=3; break;
      case 'time-next': if(!state.time) return error('Choisissez une heure.'); if(expired()) { state.time=''; state.reached=3; render(); return error('Cette heure est passée. Choisissez une autre heure.'); } state.step=4; break;
      case 'back': if(state.step===4){state.firstName=document.querySelector('#first-name').value;state.phone=document.querySelector('#phone').value;} state.step--; break;
      case 'restart': Object.assign(state,{step:1,reached:1,service:'',date:'',time:'',firstName:'',phone:''}); break;
      default:return;
    }
    state.reached=Math.max(state.reached,state.step);
    render();
  });
  document.querySelector('.booking-steps').addEventListener('click', e => { const button=e.target.closest('[data-step]'); if(!button || button.disabled) return; if(state.step===4) { state.firstName=document.querySelector('#first-name').value; state.phone=document.querySelector('#phone').value; } state.step=Number(button.dataset.step); render(); });
  body.addEventListener('submit', e => {
    e.preventDefault(); state.firstName=document.querySelector('#first-name').value.trim(); state.phone=document.querySelector('#phone').value.trim();
    const validName=state.firstName.length>0; const validPhone=/^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[ .-]?\d{2}){4}$/.test(state.phone);
    document.querySelector('#name-error').textContent=validName?'':'Indiquez votre prénom.';
    document.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';
    if (!validName || !validPhone) { document.querySelector(validName?'#phone':'#first-name').focus(); return; }
    if(expired()) { state.time=''; state.step=3; state.reached=3; render(); return error('Cette heure est passée. Choisissez une autre heure.'); }
    state.step=5; render();
  });
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => { state.service=button.dataset.service; state.step=1; state.reached=1; state.date=''; state.time=''; render(); location.hash='reservation'; }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => {const active=b===button;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    document.querySelectorAll('[data-category]').forEach(row => {row.hidden=filter!=='tout' && !row.dataset.category.split(' ').includes(filter);});
  }));
  render(false);
})();
