(() => {
  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .1 });
    document.documentElement.classList.add('motion-ready');
    reveal.forEach(item => observer.observe(item));
  } else reveal.forEach(item => item.classList.add('visible'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
    document.querySelectorAll('.service').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));

  const services = [ ['James Dean',30], ['Lino Ventura',30], ['À la Georges Clooney',15], ['À la Victor Hugo',30], ['Chabal',60] ];
  const app = document.querySelector('#booking-app');
  const state = { step:0, furthest:0, service:'', date:'', time:'', name:'', phone:'' };
  const titles = ['Prestation','Jour','Heure','Coordonnées'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday:'short', day:'numeric', month:'short' });
  const longDate = new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const key = date => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
  const fromKey = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const days = () => Array.from({length:14}, (_,i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d; });
  const duration = () => (services.find(item => item[0] === state.service) || [null,30])[1];
  function slots() {
    const date = fromKey(state.date), weekday = date.getDay();
    const ranges = weekday === 6 ? [[540,1020]] : weekday >= 2 && weekday <= 5 ? [[540,720],[840,1140]] : [];
    const now = new Date(), result = [];
    ranges.forEach(([start,end]) => { for (let n=start; n+duration()<=end; n+=30) {
      const slot = `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
      const past = key(now) === state.date && n <= now.getHours()*60+now.getMinutes();
      result.push({ slot, disabled:past });
    }}); return result;
  }
  function summary() { return `<div class="booking-summary"><strong>Votre sélection</strong><br>${escape(state.service || 'Prestation à choisir')} · ${state.date ? escape(longDate.format(fromKey(state.date))) : 'jour à choisir'} · ${escape(state.time || 'heure à choisir')}</div>`; }
  function render(focus = true, animate = false) {
    if (state.step === 4) {
      app.innerHTML = `<div class="booking-content" aria-live="polite"><h3 tabindex="-1">Simulation terminée.</h3><p>${escape(state.name)}, votre sélection est ${escape(state.service)}, le ${escape(longDate.format(fromKey(state.date)))} à ${escape(state.time)}.</p><p>Aucun rendez-vous n’a été envoyé. Pour réserver réellement, utilisez Planity ou appelez le salon.</p><div class="booking-controls"><a class="button dark" href="https://www.planity.com/brouss-barber-37100-tours">Aller sur Planity ↗</a><button class="back" data-restart>Recommencer</button></div></div>`;
      if (focus) app.querySelector('h3').focus(); return;
    }
    let body = '';
    if (state.step === 0) body = `<p>Choisissez une prestation. Simulation sans prix ni envoi.</p><div class="choices">${services.map(([name]) => `<label class="choice"><span>${escape(name)}</span><input type="radio" name="service" value="${escape(name)}" ${state.service===name?'checked':''}></label>`).join('')}</div>`;
    if (state.step === 1) body = `<p>Choisissez un jour. Les horaires du samedi sont à confirmer.</p><div class="choices date-grid">${days().map(d => { const closed = d.getDay()===0 || d.getDay()===1; return `<label class="choice"><span>${escape(dateFormat.format(d))}${closed ? '<br>Fermé' : ''}</span><input type="radio" name="date" value="${key(d)}" ${closed?'disabled':''} ${state.date===key(d)?'checked':''}></label>`; }).join('')}</div>`;
    if (state.step === 2) body = `<p>Créneaux de démonstration, sans disponibilité réelle.</p><div class="choices time-grid">${slots().map(({slot,disabled}) => `<label class="choice"><span>${slot.replace(':',' h ')}</span><input type="radio" name="time" value="${slot}" ${disabled?'disabled':''} ${state.time===slot?'checked':''}></label>`).join('')}</div><p>Les créneaux passés ne sont pas sélectionnables.</p>`;
    if (state.step === 3) body = `<p>Ces coordonnées restent dans votre navigateur et ne sont pas envoyées.</p><label class="field">Prénom<input name="name" autocomplete="given-name" value="${escape(state.name)}" aria-describedby="name-error"><span id="name-error" class="error"></span></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escape(state.phone)}" aria-describedby="phone-error"><span id="phone-error" class="error"></span></label>`;
    app.innerHTML = `<div class="booking-content"><div class="steps" aria-label="Étapes de la simulation">${titles.map((title,i) => `<button data-step="${i}" class="${i===state.step?'current':''}" ${i>state.furthest?'disabled':''} ${i===state.step?'aria-current="step"':''}>${i+1}. ${title}</button>`).join('')}</div><div aria-live="polite"><h3 tabindex="-1">${titles[state.step]}</h3></div>${body}<p id="booking-error" class="error" role="status"></p><div class="booking-controls">${state.step ? '<button class="back" data-back>Retour</button>' : ''}<button class="action" data-next>${state.step===3?'Terminer la simulation':'Continuer →'}</button></div>${summary()}</div>`;
    if (focus) app.querySelector('h3').focus({preventScroll:true});
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) app.querySelector('.booking-content').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  app.addEventListener('change', e => { if (e.target.name === 'service') { state.service=e.target.value; state.date=''; state.time=''; state.furthest=0; } if (e.target.name === 'date') { state.date=e.target.value; state.time=''; state.furthest=1; } if (e.target.name === 'time') state.time=e.target.value; const old=app.querySelector('.booking-summary'); if(old) old.outerHTML=summary(); });
  app.addEventListener('input', e => { if (e.target.name==='name' || e.target.name==='phone') state[e.target.name]=e.target.value; });
  app.addEventListener('click', e => {
    if (e.target.closest('[data-restart]')) { Object.assign(state,{step:0,furthest:0,service:'',date:'',time:'',name:'',phone:''}); render(); return; }
    const step = e.target.closest('[data-step]'); if(step && !step.disabled) { state.step=Number(step.dataset.step); render(true, e.detail > 0); return; }
    if (e.target.closest('[data-back]')) { state.step--; render(true, e.detail > 0); return; }
    if (!e.target.closest('[data-next]')) return;
    let error='';
    if(state.step===0 && !state.service) error='Choisissez une prestation.';
    if(state.step===1 && !state.date) error='Choisissez un jour.';
    if(state.step===2 && !state.time) error='Choisissez une heure.';
    if(state.step===2 && state.time && !slots().some(item => item.slot===state.time && !item.disabled)) error='Cette heure est passée. Choisissez une autre heure.';
    if(state.step===3) {
      const badName = !state.name.trim();
      const badPhone = !/^(?:\+33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(state.phone.trim());
      app.querySelector('#name-error').textContent = badName ? 'Indiquez votre prénom.' : '';
      app.querySelector('#phone-error').textContent = badPhone ? 'Indiquez un numéro de téléphone français valide.' : '';
      app.querySelector('[name=name]').setAttribute('aria-invalid', String(badName));
      app.querySelector('[name=phone]').setAttribute('aria-invalid', String(badPhone));
      if (badName || badPhone) { app.querySelector(badName ? '[name=name]' : '[name=phone]').focus(); return; }
    }
    if(error) { app.querySelector('#booking-error').textContent=error; return; }
    state.step++; state.furthest=Math.max(state.furthest,state.step); render(true, e.detail > 0);
  });
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => { state.service=button.dataset.service; state.date=''; state.time=''; state.step=0; state.furthest=0; render(false); document.querySelector('#rendez-vous').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); app.querySelector('h3').focus({preventScroll:true}); }));
  render(false);
})();
