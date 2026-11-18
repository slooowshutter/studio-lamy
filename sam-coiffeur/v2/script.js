(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.08});
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const services = [
    {name:'Coupe homme, shampooing et coiffage', duration:25},
    {name:'Taille de barbe homme', duration:25},
    {name:'Coupe garçon', duration:30}
  ];
  const state = {service:null, day:null, time:null, first:'', phone:''};
  let current = 0;
  const panel = document.querySelector('#etape');
  const recap = document.querySelector('#recap');
  const stepButtons = [...document.querySelectorAll('[data-go]')];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long',day:'numeric',month:'long'});
  const dayFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'short',day:'numeric',month:'short'});
  const dates = Array.from({length:14}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d; });
  const escapeText = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const displayTime = minutes => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2,'0')}`;
  function updateRecap() {
    const pieces = [];
    if (state.service !== null) pieces.push(`<p><strong>Prestation</strong><br>${services[state.service].name}</p>`);
    if (state.day !== null) pieces.push(`<p><strong>Jour</strong><br>${dateFormat.format(dates[state.day])}</p>`);
    if (state.time !== null) pieces.push(`<p><strong>Heure</strong><br>${displayTime(state.time)}</p>`);
    recap.innerHTML = pieces.join('') || '<p>Votre billet se remplit au fil des étapes.</p>';
    stepButtons.forEach((button, i) => {
      button.disabled = (i >= 1 && state.service === null) || (i >= 2 && state.day === null) || (i >= 3 && state.time === null);
      if (i === current) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  function slots() {
    const date = dates[state.day];
    const start = date.getDay() === 0 ? 600 : 570;
    const end = date.getDay() === 0 ? 1140 : 1170;
    const now = new Date();
    const values = [];
    for (let t = start; t + services[state.service].duration <= end; t += 30) {
      const isPast = date.toDateString() === now.toDateString() && t <= now.getHours()*60 + now.getMinutes();
      values.push({time:t, disabled:isPast});
    }
    return values;
  }
  function content() {
    if (current === 0) return `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p class="hint">Choisissez une prestation pour remplir votre billet.</p><div class="choices">${services.map((s,i) => `<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service===i?'checked':''}><span>${s.name}</span><small>${s.duration} min</small></label>`).join('')}</div><div class="action-row"><button class="button" type="button" data-next>Choisir un jour →</button></div><p class="error" id="erreur" role="status"></p>`;
    if (current === 1) return `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="hint">Horaires à confirmer. Les jours et heures proposés servent uniquement à la simulation.</p><div class="days">${dates.map((date,i) => `<button type="button" data-day="${i}" class="${state.day===i?'selected':''}" aria-pressed="${state.day===i}">${dayFormat.format(date)}</button>`).join('')}</div><div class="action-row"><button class="button secondary" type="button" data-back>← Prestation</button><button class="button" type="button" data-next>Choisir une heure →</button></div><p class="error" id="erreur" role="status"></p>`;
    if (current === 2) return `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">Créneaux fictifs, sans lien avec les disponibilités du salon.</p><div class="hours">${slots().map(slot => `<button type="button" data-time="${slot.time}" class="${state.time===slot.time?'selected':''}" aria-pressed="${state.time===slot.time}" ${slot.disabled?'disabled':''}>${displayTime(slot.time)}${slot.disabled?' · passé':''}</button>`).join('')}</div><div class="action-row"><button class="button secondary" type="button" data-back>← Jour</button><button class="button" type="button" data-next>Vos coordonnées →</button></div><p class="error" id="erreur" role="status"></p>`;
    if (current === 3) return `<h3 tabindex="-1">Votre billet</h3><p class="hint">Ces coordonnées restent dans ce navigateur et ne sont pas envoyées.</p><form id="coordonnees" novalidate><label class="form-row" for="prenom">Prénom<input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="erreur-prenom"><span class="error" id="erreur-prenom"></span></label><label class="form-row" for="telephone">Téléphone<input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><span class="error" id="erreur-telephone"></span></label><div class="action-row"><button class="button secondary" type="button" data-back>← Heure</button><button class="button" type="submit">Terminer la simulation →</button></div></form>`;
    return `<h3 tabindex="-1">Votre billet est prêt.</h3><div class="success-ticket"><span class="eyebrow">SIMULATION / SAM COIFFEUR</span><p><strong>${escapeText(state.first)}</strong>${services[state.service].name}<br>${dateFormat.format(dates[state.day])} à ${displayTime(state.time)}</p><p>22 rue Frémicourt, 75015 Paris</p></div><p class="hint">Aucun rendez-vous n’a été pris et rien n’a été envoyé. Pour réserver, appelez le salon.</p><div class="action-row"><a class="button" href="tel:+33983862149">Appeler le salon ↗</a><button class="button secondary" type="button" data-reset>Recommencer</button></div>`;
  }
  function render(focus = false) {
    panel.innerHTML = content(); updateRecap();
    if (focus) panel.querySelector('h3')?.focus({preventScroll:true});
    const ticket = panel.querySelector('.success-ticket');
    if (ticket) requestAnimationFrame(() => requestAnimationFrame(() => ticket.classList.add('printed')));
  }
  let timer;
  function go(step) {
    clearTimeout(timer);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { current=step; render(true); return; }
    panel.classList.add('changing');
    timer = setTimeout(() => { current=step; render(true); panel.classList.remove('changing'); }, 180);
  }
  stepButtons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.go))));
  document.querySelectorAll('.choisir').forEach(button => button.addEventListener('click', () => {
    state.service=Number(button.dataset.service); state.day=null; state.time=null; current=0; render();
    document.querySelector('#rendez-vous').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));
  panel.addEventListener('change', event => { if (event.target.name === 'prestation') {const next=Number(event.target.value); if (state.service!==next) {state.day=null;state.time=null;} state.service=next;updateRecap();} });
  panel.addEventListener('click', event => {
    const button=event.target.closest('button'); if (!button) return;
    if (button.dataset.day !== undefined) {const next=Number(button.dataset.day);if(state.day!==next) state.time=null;state.day=next;render();panel.querySelector(`[data-day="${next}"]`).focus();}
    else if (button.dataset.time !== undefined) {state.time=Number(button.dataset.time);render();panel.querySelector(`[data-time="${state.time}"]`).focus();}
    else if (button.hasAttribute('data-back')) go(current-1);
    else if (button.hasAttribute('data-next')) {
      const missing = current===0 ? state.service===null : current===1 ? state.day===null : state.time===null;
      if (missing) {document.querySelector('#erreur').textContent='Choisissez une option pour continuer.';return;} go(current+1);
    } else if (button.hasAttribute('data-reset')) {Object.assign(state,{service:null,day:null,time:null,first:'',phone:''});go(0);}
  });
  panel.addEventListener('submit', event => {
    event.preventDefault(); const first=panel.querySelector('#prenom'); const phone=panel.querySelector('#telephone');
    state.first=first.value.trim(); state.phone=phone.value.trim();
    const validFirst=state.first.length>0; const validPhone=/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(state.phone.replace(/[\s.()-]/g,''));
    panel.querySelector('#erreur-prenom').textContent=validFirst?'':'Indiquez votre prénom.';
    panel.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro français à dix chiffres.';
    first.setAttribute('aria-invalid',String(!validFirst));phone.setAttribute('aria-invalid',String(!validPhone));
    if (!validFirst) first.focus(); else if (!validPhone) phone.focus(); else go(4);
  });
  render();
})();
