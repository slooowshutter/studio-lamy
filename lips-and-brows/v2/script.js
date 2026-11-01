(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 65}ms`; if (observer) { el.classList.add('observed'); observer.observe(el); } else el.classList.add('visible'); });
  window.setTimeout(() => document.querySelectorAll('.observed').forEach(el => el.classList.add('visible')), 2500);
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const services = [
    {id:'micro', name:'Microbrows poil à poil', duration:45, price:350},
    {id:'powder', name:'Powder Brows 3D', duration:120, price:400},
    {id:'magic', name:'Magic Brows / Hairstroke Nanobrows', duration:180, price:500},
    {id:'blush', name:'Blush Lips', duration:180, price:400},
    {id:'cils', name:'Rehaussement de cils', duration:60, price:70},
    {id:'teinture', name:'Teinture cils', duration:15, price:15}
  ];
  const hours = {1:[540,1140],2:[540,1020],3:[510,1140],4:[540,1080],5:[540,1140],6:[540,1020]};
  const state = {step:0, service:null, day:null, time:null, first:'', phone:''};
  const content = document.getElementById('booking-content');
  const summary = document.getElementById('summary-text');
  const nav = [...document.querySelectorAll('[data-step]')];
  const duration = n => n >= 60 ? `${Math.floor(n / 60)} h${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`;
  const dayText = d => new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(d);
  const timeText = n => `${String(Math.floor(n / 60)).padStart(2,'0')} h ${String(n % 60).padStart(2,'0')}`;
  const escapeText = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const days = () => Array.from({length:14}, (_,i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); return d; });
  const sameDay = (a,b) => a && b && a.toDateString() === b.toDateString();
  function updateSummary() {
    const pieces = [];
    if (state.service) pieces.push(`${state.service.name} · ${duration(state.service.duration)} · ${state.service.price} €`);
    if (state.day) pieces.push(dayText(state.day));
    if (state.time !== null) pieces.push(timeText(state.time));
    summary.textContent = pieces.join(' / ') || 'Aucune prestation choisie';
  }
  function render(focus = true) {
    nav.forEach((button,i) => { button.disabled = i > 0 && (i === 1 ? !state.service : i === 2 ? !state.day : state.time === null); if (i === state.step && state.step < 4) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisissez une prestation</h3><p class="hint">Tarifs relevés sur Planity, à confirmer avec Lips And Brows.</p><div class="options">${services.map(s => `<label class="option"><input type="radio" name="prestation" value="${s.id}" ${state.service?.id === s.id ? 'checked' : ''}><span>${s.name}<small>${duration(s.duration)}</small></span><b>${s.price} €</b></label>`).join('')}</div><p class="error" id="booking-error" role="status"></p><div class="booking-controls"><button class="next" type="button" data-action="service">Choisir le jour →</button></div>`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Quel jour vous convient&nbsp;?</h3><p class="hint">Horaires à confirmer. Les jours fermés ne sont pas proposés.</p><div class="days">${days().map((d,i) => { const closed = !hours[d.getDay()]; return `<button class="choice ${sameDay(state.day,d)?'selected':''}" type="button" aria-pressed="${sameDay(state.day,d)?'true':'false'}" data-day="${i}" ${closed?'disabled':''}>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<small>${closed?'Fermé':'À confirmer'}</small></button>`; }).join('')}</div><p class="error" id="booking-error" role="status"></p><div class="booking-controls"><button type="button" data-action="back">← Retour</button><button class="next" type="button" data-action="day">Choisir l’heure →</button></div>`;
    } else if (state.step === 2) {
      const range = hours[state.day.getDay()]; const now = new Date(); let slots = '';
      for (let m = range[0], i = 0; m + state.service.duration <= range[1]; m += 30, i++) {
        const past = sameDay(now,state.day) && m <= now.getHours()*60+now.getMinutes();
        const taken = (i + state.day.getDate()) % 4 === 0;
        slots += `<button class="choice ${state.time===m?'selected':''}" type="button" aria-pressed="${state.time===m?'true':'false'}" data-time="${m}" ${past || taken ? 'disabled' : ''}>${timeText(m)}${past?'<small>Passé</small>':taken?'<small>Déjà pris</small>':''}</button>`;
      }
      html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">Créneaux fictifs pour le ${dayText(state.day)}. Ils ne reflètent pas les disponibilités du salon.</p><div class="slots">${slots || 'Aucun créneau pour cette prestation.'}</div><p class="error" id="booking-error" role="status"></p><div class="booking-controls"><button type="button" data-action="back">← Retour</button><button class="next" type="button" data-action="time">Vos coordonnées →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Pour essayer le parcours seulement&nbsp;: aucune donnée n’est envoyée.</p><form id="details" novalidate><div class="form-row"><label for="first">Prénom</label><input id="first" name="prenom" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="first-error"><span class="error" id="first-error"></span></div><div class="form-row"><label for="phone">Téléphone mobile</label><input id="phone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></div><div class="booking-controls"><button type="button" data-action="back">← Retour</button><button class="next" type="submit">Confirmer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.first)}. Votre sélection&nbsp;: ${escapeText(state.service.name)}, le ${dayText(state.day)} à ${timeText(state.time)} · ${state.service.price} € sur Planity, à confirmer.</p><p class="hint">Ceci est une simulation&nbsp;: aucune réservation ni donnée n’a été envoyée au salon.</p><button class="success-button" type="button" data-action="reset">Recommencer</button>`;
    }
    content.innerHTML = `<div class="step-enter">${html}</div>`; updateSummary();
    if (focus) content.querySelector('h3')?.focus({preventScroll:true});
  }
  let transitionTimer;
  function changeStep() {
    clearTimeout(transitionTimer);
    const current = content.firstElementChild;
    if (!current || matchMedia('(prefers-reduced-motion: reduce)').matches) { render(); return; }
    current.classList.add('step-exit');
    transitionTimer = setTimeout(() => render(), 160);
  }
  content.addEventListener('change', event => {
    if (event.target.name !== 'prestation') return;
    const chosen = services.find(s => s.id === event.target.value);
    if (state.service?.id !== chosen.id) { state.day = null; state.time = null; }
    state.service = chosen; updateSummary();
    nav.forEach((button,i) => { if (i > 1) button.disabled = true; });
  });
  content.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.dataset.day !== undefined) { state.day = days()[Number(target.dataset.day)]; state.time = null; render(false); content.querySelector(`[data-day="${target.dataset.day}"]`)?.focus(); return; }
    if (target.dataset.time !== undefined) { state.time = Number(target.dataset.time); render(false); content.querySelector(`[data-time="${target.dataset.time}"]`)?.focus(); return; }
    const action = target.dataset.action;
    if (action === 'service') { const selected = content.querySelector('input[name="prestation"]:checked'); if (!selected) { document.getElementById('booking-error').textContent = 'Choisissez une prestation pour continuer.'; return; } const chosen = services.find(s => s.id === selected.value); if (state.service?.id !== chosen.id) { state.day = null; state.time = null; } state.service = chosen; state.step = 1; }
    else if (action === 'day') { if (!state.day) { document.getElementById('booking-error').textContent = 'Choisissez un jour pour continuer.'; return; } state.step = 2; }
    else if (action === 'time') { if (state.time === null) { document.getElementById('booking-error').textContent = 'Choisissez une heure pour continuer.'; return; } state.step = 3; }
    else if (action === 'back') state.step--;
    else if (action === 'reset') Object.assign(state,{step:0,service:null,day:null,time:null,first:'',phone:''});
    else return;
    changeStep();
  });
  content.addEventListener('submit', event => {
    event.preventDefault(); const first = document.getElementById('first'); const phone = document.getElementById('phone'); state.first = first.value.trim(); state.phone = phone.value.trim();
    const validFirst = state.first.length > 0; const digits = state.phone.replace(/[\s.()-]/g,''); const validPhone = /^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(digits);
    document.getElementById('first-error').textContent = validFirst ? '' : 'Indiquez votre prénom.'; document.getElementById('phone-error').textContent = validPhone ? '' : 'Indiquez un numéro mobile français valide.'; first.setAttribute('aria-invalid',String(!validFirst)); phone.setAttribute('aria-invalid',String(!validPhone));
    if (!validFirst || !validPhone) { (validFirst ? phone : first).focus(); return; } state.step = 4; changeStep();
  });
  nav.forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.step); changeStep(); }));
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => { state.service = services.find(s => s.id === button.dataset.book); state.day = null; state.time = null; state.step = 1; render(false); document.getElementById('reserver').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); content.querySelector('h3').focus({preventScroll:true}); }));
  render(false);
})();
