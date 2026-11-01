(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); if (e.target.classList.contains('story-tile')) countSeven(); observer.unobserve(e.target); } }), { threshold: .12 }) : null;
  function countSeven() {
    const number = document.querySelector('#seven-count');
    if (!number || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    function tick(now) { const progress = Math.min((now - start) / 650, 1); number.textContent = String(Math.floor(7 * progress)); if (progress < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  document.querySelectorAll('.reveal').forEach((el, i) => { if (observer) { el.style.transitionDelay = `${(i % 3) * 60}ms`; observer.observe(el); } else el.classList.add('visible'); });
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && row.dataset.category !== button.dataset.filter; });
  }));
  const services = [
    {id:'homme', name:'Coupe homme', price:'23 €'},
    {id:'femme', name:'Coupe femme · cheveux courts', price:'40 €'},
    {id:'couleur', name:'Couleur + brushing', price:'dès 58 €'},
    {id:'meches', name:'Mèches + brushing · cheveux courts', price:'dès 73 €'},
    {id:'barbe', name:'Entretien barbe', price:'12 €'},
    {id:'enfant', name:'Coupe enfant · moins de 3 ans', price:'14 €'}
  ];
  const state = {step:0, service:null, date:null, time:null, name:'', phone:''};
  const panel = document.querySelector('#booking-panel');
  const summary = document.querySelector('#summary-content');
  const stepButtons = [...document.querySelectorAll('[data-goto]')];
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const fmtDate = key => new Intl.DateTimeFormat('fr-FR', {weekday:'long',day:'numeric',month:'long'}).format(fromKey(key));
  const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    if (!state.service) { summary.textContent = 'Choisissez une prestation pour commencer.'; return; }
    summary.innerHTML = `<dl><dt>Prestation</dt><dd>${escapeText(state.service.name)}</dd><dt>Tarif indicatif</dt><dd>${state.service.price}</dd>${state.date ? `<dt>Jour</dt><dd>${fmtDate(state.date)}</dd>` : ''}${state.time ? `<dt>Heure</dt><dd>${state.time}</dd>` : ''}</dl>`;
  }
  function recap() { return `<div class="booking-recap"><strong>Votre sélection</strong>${escapeText(state.service.name)} · ${state.service.price}<br>${fmtDate(state.date)} à ${state.time}</div>`; }
  function render(focus = true) {
    updateSummary();
    stepButtons.forEach((button, i) => {
      button.disabled = i > 0 && (i === 1 ? !state.service : i === 2 ? !state.date : !state.time);
      if (i === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p class="hint">Tarifs indicatifs, à confirmer avec Salon SLH. Durées à confirmer auprès du salon.</p><form id="service-form">${services.map(s => `<label class="service-option"><input type="radio" name="service" value="${s.id}" ${state.service?.id === s.id ? 'checked' : ''}><span>${s.name}<small>Durée à confirmer auprès du salon</small></span><b>${s.price}</b></label>`).join('')}<p id="service-error" class="error" role="alert"></p><button class="action" type="submit">Choisir le jour →</button></form>`;
    } else if (state.step === 1) {
      const today = new Date(); today.setHours(0,0,0,0);
      let days = '';
      for (let i=0; i<14; i++) { const d = new Date(today); d.setDate(today.getDate()+i); const key = dateKey(d), closed = d.getDay() === 0 || d.getDay() === 1; days += `<button type="button" data-day="${key}" ${closed ? 'disabled' : ''} class="${state.date === key ? 'selected' : ''}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<span>${closed ? 'fermé' : 'choisir'}</span></button>`; }
      html = `<h3 tabindex="-1">Choisir un jour</h3><p class="hint">Horaires à confirmer. Les jours fermés sont indiqués.</p><div class="days">${days}</div><button class="back" type="button" data-back="0">← Prestation</button>`;
    } else if (state.step === 2) {
      const date = fromKey(state.date), end = date.getDay() === 6 ? 16*60 : 18*60+30, now = new Date(); let slots = '', available = 0;
      for (let minutes=9*60, i=0; minutes<end; minutes+=30, i++) { const h = Math.floor(minutes/60), m = minutes%60, time = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; const at = new Date(date); at.setHours(h,m,0,0); const taken = (i + date.getDate()) % 4 === 0; const past = at <= now; if (!taken && !past) available++; slots += `<button type="button" data-time="${time}" ${taken || past ? 'disabled' : ''} class="${state.time === time ? 'selected' : ''}" aria-label="${time}${taken ? ', déjà pris' : past ? ', passé' : ''}">${time}${taken ? ' · pris' : past ? ' · passé' : ''}</button>`; }
      html = `<h3 tabindex="-1">Choisir une heure</h3><p class="hint">${fmtDate(state.date)} · créneaux fictifs, horaires à confirmer.</p><div class="slots">${slots}</div>${available ? '' : '<p class="hint">Aucun créneau disponible ce jour. Choisissez un autre jour.</p>'}<button class="back" type="button" data-back="1">← Jour</button>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Simulation uniquement&nbsp;: rien ne sera envoyé.</p>${recap()}<form id="contact-form" novalidate><label class="field">Prénom<input name="name" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="name-error" required></label><p id="name-error" class="error" role="alert"></p><label class="field">Téléphone portable<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error" required></label><p id="phone-error" class="error" role="alert"></p><button class="back" type="button" data-back="2">← Heure</button><button class="action" type="submit">Confirmer la simulation →</button></form>`;
    } else {
      html = `<div class="success"><h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.name)}, aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p>${recap()}<p><a href="https://www.planity.com/salon-slh-brest-29200">Prendre un vrai rendez-vous sur Planity ↗</a></p><button class="action" type="button" id="restart">Recommencer</button></div>`;
    }
    panel.classList.add('panel-enter'); panel.innerHTML = html; requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('panel-enter')));
    if (focus) panel.querySelector('h3')?.focus({preventScroll:true});
  }
  panel.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.id === 'service-form') { const chosen = event.target.querySelector(':checked'); if (!chosen) { document.querySelector('#service-error').textContent = 'Choisissez une prestation.'; return; } const next = services.find(s => s.id === chosen.value); if (state.service?.id !== next.id) {state.date = null; state.time = null;} state.service = next; state.step = 1; render(); }
    if (event.target.id === 'contact-form') { const data = new FormData(event.target); state.name = String(data.get('name')).trim(); state.phone = String(data.get('phone')).trim(); const normalized = state.phone.replace(/[\s.()-]/g,''); const nameOk = state.name.length >= 2, phoneOk = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(normalized); document.querySelector('#name-error').textContent = nameOk ? '' : 'Indiquez votre prénom (2 caractères minimum).'; document.querySelector('#phone-error').textContent = phoneOk ? '' : 'Indiquez un numéro de portable français valide.'; if (!nameOk || !phoneOk) { event.target.querySelector(nameOk ? '[name=phone]' : '[name=name]').focus(); return; } state.step = 4; render(); }
  });
  panel.addEventListener('click', event => { const day = event.target.closest('[data-day]'), time = event.target.closest('[data-time]'), back = event.target.closest('[data-back]'); if(day && !day.disabled){if(state.date !== day.dataset.day) state.time = null; state.date=day.dataset.day; state.step=2; render();} if(time && !time.disabled){state.time=time.dataset.time;state.step=3;render();} if(back){state.step=Number(back.dataset.back);render();} if(event.target.id === 'restart'){Object.assign(state,{step:0,service:null,date:null,time:null,name:'',phone:''});render();} });
  stepButtons.forEach(b => b.addEventListener('click', () => { if(!b.disabled){state.step=Number(b.dataset.goto);render();} }));
  document.querySelectorAll('[data-service]').forEach(b => b.addEventListener('click', () => { state.service=services.find(s=>s.id===b.dataset.service);state.date=null;state.time=null;state.step=1;render();document.querySelector('#reservation').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }));
  render(false);
})();
