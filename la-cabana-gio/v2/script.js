(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    reveals.forEach((el, i) => { el.style.transitionDelay = `${i * 60}ms`; observer.observe(el); });
  } else reveals.forEach(el => el.classList.add('visible'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.price-list article').forEach(row => {
      const show = button.dataset.filter === 'tous' || row.dataset.category === button.dataset.filter;
      if (show && row.hidden) { row.classList.add('filter-enter'); row.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('filter-enter'))); }
      else if (!show) row.hidden = true;
    });
  }));

  const services = [
    {name:'Shampoing · coupe · brushing', duration:45, price:30},
    {name:'Forfait étudiante', duration:45, price:27},
    {name:'Coupe homme', duration:30, price:23},
    {name:'Forfait coupe · couleur', duration:90, price:54}
  ];
  const state = {step:0, service:null, date:null, time:null, name:'', phone:''};
  const steps = document.querySelector('#steps');
  const summary = document.querySelector('#summary');
  const count = document.querySelector('#step-count');
  let renderedStep = null;
  const days = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const fmtDate = d => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(d);
  const fmtTime = n => `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`;
  const parisParts = () => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  const today = () => { const p = parisParts(); return new Date(p.year, p.month - 1, p.day); };
  const dateAt = n => { const d = today(); d.setDate(d.getDate()+n); return d; };
  const sameDate = (a,b) => a && b && a.toDateString() === b.toDateString();
  const hours = day => day === 0 ? null : day === 1 ? [14*60,19*60] : day === 6 ? [10*60,18*60] : [10*60,19*60];
  const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    let out = '';
    if (state.service !== null) out += `<div class="summary-item"><button type="button" data-goto="0">Prestation ↗</button><br>${services[state.service].name}<br>${services[state.service].price} € · ${services[state.service].duration} min*</div>`;
    if (state.date) out += `<div class="summary-item"><button type="button" data-goto="1">Jour ↗</button><br>${fmtDate(state.date)}</div>`;
    if (state.time !== null) out += `<div class="summary-item"><button type="button" data-goto="2">Heure ↗</button><br>${fmtTime(state.time)}</div>`;
    summary.innerHTML = out || 'Choisissez une prestation pour commencer.';
  }
  function render(focus = true) {
    count.textContent = state.step < 4 ? `0${state.step+1} / 04` : 'TERMINÉ';
    let html = '';
    if (state.step === 0) {
      html = `<div class="step"><h3 tabindex="-1">Choisir une prestation</h3><p>Tarifs indicatifs, à confirmer avec La Cabana Gio. Durées d’exemple.</p><fieldset><legend>Prestation</legend>${services.map((s,i)=>`<label class="option"><input type="radio" name="service" value="${i}" ${state.service===i?'checked':''}><span>${s.name}</span><small>${s.duration} min · ${s.price} €</small></label>`).join('')}</fieldset><div class="step-actions"><button class="next" data-next ${state.service===null?'disabled':''}>Choisir le jour →</button></div></div>`;
    } else if (state.step === 1) {
      html = `<div class="step"><h3 tabindex="-1">Choisir un jour</h3><p>Les 14 prochains jours · horaires à confirmer.</p><div class="days">${Array.from({length:14},(_,i)=>{const d=dateAt(i),closed=d.getDay()===0;return `<button class="day ${sameDate(state.date,d)?'selected':''}" data-day="${i}" ${closed?'disabled':''}>${days[d.getDay()].slice(0,3)} ${d.getDate()}<small>${closed?'fermé':'disponible*'}</small></button>`}).join('')}</div><p class="tiny">* Disponibilité simulée.</p><div class="step-actions"><button data-back>← Retour</button><button class="next" data-next ${!state.date?'disabled':''}>Choisir l’heure →</button></div></div>`;
    } else if (state.step === 2) {
      const [start,end] = hours(state.date.getDay());
      const now = parisParts();
      const slots=[];
      for(let t=start;t+services[state.service].duration<=end;t+=30){const past=sameDate(state.date,today())&&t<=now.hour*60+now.minute; const taken=(t/30+state.date.getDate())%5===0; slots.push(`<button class="slot ${state.time===t?'selected':''}" data-time="${t}" ${past||taken?'disabled':''}>${fmtTime(t)}${past?' · passé':taken?' · pris':''}</button>`)}
      html = `<div class="step"><h3 tabindex="-1">Choisir une heure</h3><p>${fmtDate(state.date)} · créneaux fictifs</p><div class="slots">${slots.join('')}</div><div class="step-actions"><button data-back>← Retour</button><button class="next" data-next ${state.time===null?'disabled':''}>Vos coordonnées →</button></div></div>`;
    } else if (state.step === 3) {
      html = `<div class="step"><h3 tabindex="-1">Vos coordonnées</h3><p>${services[state.service].name} · ${fmtDate(state.date)} à ${fmtTime(state.time)} · ${services[state.service].price} € indicatifs.</p><form id="details" novalidate><label class="field">Prénom<input name="firstname" autocomplete="given-name" value="${escapeText(state.name)}" required aria-describedby="name-error"><span class="error" id="name-error"></span></label><label class="field">Téléphone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" required aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><p>Simulation uniquement&nbsp;: aucune donnée n’est envoyée.</p><div class="step-actions"><button type="button" data-back>← Retour</button><button type="submit" class="next">Terminer la simulation →</button></div></form></div>`;
    } else {
      html = `<div class="step success"><h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, votre exemple&nbsp;: ${services[state.service].name}, le ${fmtDate(state.date)} à ${fmtTime(state.time)}.</p><p>Aucun rendez-vous n’a été pris et rien n’a été envoyé. Pour joindre le salon, appelez le <a href="tel:0299791266">02 99 79 12 66</a>.</p><div class="step-actions"><button data-reset>Recommencer</button></div></div>`;
    }
    steps.innerHTML=html; updateSummary();
    if (renderedStep !== null && renderedStep !== state.step) {
      const panel = steps.querySelector('.step');
      panel.classList.add('step-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('step-enter')));
    }
    renderedStep = state.step;
    if(focus) steps.querySelector('h3').focus({preventScroll:true});
  }
  steps.addEventListener('change', e => { if(e.target.name==='service'){const next=Number(e.target.value); if(next!==state.service){state.service=next;state.time=null;} render(false); steps.querySelector(`input[name=service][value="${next}"]`).focus();} });
  steps.addEventListener('click', e => {
    const b=e.target.closest('button'); if(!b)return;
    if(b.hasAttribute('data-day')){const d=dateAt(Number(b.dataset.day));if(!sameDate(state.date,d)){state.date=d;state.time=null;}const dayIndex=b.dataset.day;render(false);steps.querySelector(`[data-day="${dayIndex}"]`).focus();}
    if(b.hasAttribute('data-time')){state.time=Number(b.dataset.time);const selectedTime=state.time;render(false);steps.querySelector(`[data-time="${selectedTime}"]`).focus();}
    if(b.hasAttribute('data-next')){state.step++;render();}
    if(b.hasAttribute('data-back')){state.step--;render();}
    if(b.hasAttribute('data-reset')){Object.assign(state,{step:0,service:null,date:null,time:null,name:'',phone:''});render();}
  });
  steps.addEventListener('submit', e => {
    e.preventDefault(); const form=e.target; state.name=form.firstname.value.trim();state.phone=form.phone.value.trim();
    const validName=state.name.length>=2, validPhone=/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);
    form.querySelector('#name-error').textContent=validName?'':'Indiquez votre prénom (2 caractères minimum).';
    form.querySelector('#phone-error').textContent=validPhone?'':'Indiquez un numéro français valide.';
    form.firstname.setAttribute('aria-invalid',String(!validName));form.phone.setAttribute('aria-invalid',String(!validPhone));
    if(!validName)form.firstname.focus();else if(!validPhone)form.phone.focus();else{state.step=4;render();}
  });
  summary.addEventListener('click',e=>{const b=e.target.closest('[data-goto]');if(b){state.step=Number(b.dataset.goto);render();}});
  document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>{state.service=Number(b.dataset.service);state.date=null;state.time=null;state.step=0;render();document.querySelector('#reserver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
  render(false);
})();
