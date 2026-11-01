(() => {
  const services = {
    coupe: { name: 'Coupe femme' },
    coloration: { name: 'Coloration' },
    lissage: { name: 'Lissage permanent' }
  };
  const state = { step: 0, service: null, day: null, time: null, first: '', phone: '', done: false };
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary-content');
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(date);
  const dayKey = date => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
  function dates() {
    const today = new Date(); today.setHours(0,0,0,0);
    return Array.from({length:14}, (_, i) => { const d = new Date(today); d.setDate(today.getDate()+i); return d; });
  }
  function renderSummary() {
    if (!state.service) { summary.innerHTML = '<p>Choisissez une prestation pour commencer.</p>'; return; }
    summary.innerHTML = `<p><strong>${services[state.service].name}</strong>Prestation et tarif à confirmer</p>${state.day ? `<p><strong>${dateLabel(state.day)}</strong>${state.time || 'Heure à choisir'}</p>` : '<p>Jour et heure à choisir.</p>'}`;
  }
  function render(focus = true) {
    renderSummary();
    stepButtons.forEach((button, i) => {
      button.disabled = i > 0 && !state.service || i > 1 && !state.day || i > 2 && !state.time || state.done;
      if (i === state.step && !state.done) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    if (state.done) {
      content.innerHTML = `<div class="booking-panel"><h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${esc(state.first)}. Votre choix&nbsp;: ${services[state.service].name}, le ${dateLabel(state.day)} à ${state.time}. Tarif à confirmer.</p><p>Rien n’a été envoyé et aucun créneau n’a été réservé. Pour prendre rendez-vous, appelez le salon au <a href="tel:+33381578682">03 81 57 86 82</a>.</p><button class="booking-action" type="button" data-action="restart">Recommencer</button></div>`;
    } else if (state.step === 0) {
      content.innerHTML = `<div class="booking-panel"><h3 tabindex="-1">Votre prestation.</h3><p>Choisissez une proposition. Prestations et tarifs à confirmer avec Neila Coiffure.</p><div class="options">${Object.entries(services).map(([key,s]) => `<label class="option"><input type="radio" name="prestation" value="${key}" ${state.service === key ? 'checked' : ''}><span>${s.name}</span><small>À confirmer</small></label>`).join('')}</div><button class="booking-action" type="button" data-action="next-service" ${state.service ? '' : 'disabled'}>Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      content.innerHTML = `<div class="booking-panel"><h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Quatorze jours proposés selon les horaires publiés, à confirmer. Créneaux fictifs.</p><div class="days">${dates().map(d => { const closed = d.getDay() === 0 || d.getDay() === 1; return `<button type="button" data-day="${dayKey(d)}" ${closed ? 'disabled' : ''}>${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric'}).format(d)}<span>${closed ? 'fermé' : new Intl.DateTimeFormat('fr-FR',{month:'short'}).format(d)}</span></button>`; }).join('')}</div></div>`;
    } else if (state.step === 2) {
      const end = state.day.getDay() === 6 ? 17*60 : 19*60;
      const start = state.day.getDay() === 6 ? 8*60 : 9*60;
      const now = new Date(); let slots = '';
      for (let mins = start, i = 0; mins < end; mins += 30, i++) {
        const h = String(Math.floor(mins/60)).padStart(2,'0'), m = String(mins%60).padStart(2,'0');
        const time = `${h}:${m}`; const appointment = new Date(state.day); appointment.setHours(Number(h),Number(m),0,0);
        const unavailable = appointment <= now || (i + state.day.getDate()) % 4 === 0;
        slots += `<button type="button" data-time="${time}" ${unavailable ? 'disabled' : ''} aria-label="${h} heures ${m}${unavailable ? ', déjà pris ou passé' : ', créneau fictif'}">${h}h${m}${unavailable ? '<span class="small"> pris</span>' : ''}</button>`;
      }
      content.innerHTML = `<div class="booking-panel"><h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>${dateLabel(state.day)} · disponibilités fictives, à confirmer.</p><div class="slots">${slots || '<p>Aucun horaire proposé.</p>'}</div></div>`;
    } else {
      content.innerHTML = `<div class="booking-panel"><h3 tabindex="-1">Vos coordonnées.</h3><p>Pour terminer cet exemple. Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="field" for="first">Prénom<input id="first" name="prenom" autocomplete="given-name" value="${esc(state.first)}" aria-describedby="first-error" required><span class="error" id="first-error" aria-live="polite"></span></label><label class="field" for="phone">Téléphone<input id="phone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${esc(state.phone)}" aria-describedby="phone-error" required><span class="error" id="phone-error" aria-live="polite"></span></label><p class="recap">${services[state.service].name} · ${dateLabel(state.day)} à ${state.time} · tarif à confirmer</p><button class="booking-action" type="submit">Terminer la simulation →</button></form></div>`;
    }
    const panel = content.querySelector('.booking-panel');
    if (focus && panel && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      panel.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('entering')));
    }
    if (focus) content.querySelector('h3')?.focus({preventScroll:true});
  }
  content.addEventListener('change', e => {
    if (e.target.name === 'prestation') { if (state.service !== e.target.value) { state.day = null; state.time = null; } state.service = e.target.value; render(false); }
  });
  content.addEventListener('click', e => {
    const target = e.target.closest('button'); if (!target) return;
    if (target.dataset.action === 'next-service') { state.step = 1; render(); }
    if (target.dataset.day) { const [y,m,d] = target.dataset.day.split('-').map(Number); state.day = new Date(y,m-1,d); state.time = null; state.step = 2; render(); }
    if (target.dataset.time) { state.time = target.dataset.time; state.step = 3; render(); }
    if (target.dataset.action === 'restart') { Object.assign(state, {step:0,service:null,day:null,time:null,first:'',phone:'',done:false}); render(); }
  });
  content.addEventListener('input', e => {
    if (e.target.id === 'first') state.first = e.target.value;
    if (e.target.id === 'phone') state.phone = e.target.value;
  });
  content.addEventListener('submit', e => {
    if (e.target.id !== 'booking-form') return; e.preventDefault();
    const first = content.querySelector('#first'), phone = content.querySelector('#phone');
    state.first = first.value.trim(); state.phone = phone.value.trim();
    const digits = state.phone.replace(/[\s.()-]/g,'');
    const firstValid = state.first.length > 0; const phoneValid = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    content.querySelector('#first-error').textContent = firstValid ? '' : 'Indiquez votre prénom.';
    content.querySelector('#phone-error').textContent = phoneValid ? '' : 'Indiquez un numéro français valide, par exemple 06 12 34 56 78.';
    first.setAttribute('aria-invalid', String(!firstValid)); phone.setAttribute('aria-invalid', String(!phoneValid));
    if (!firstValid || !phoneValid) { (firstValid ? phone : first).focus(); return; }
    state.done = true; render();
  });
  stepButtons.forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.step); render(); }));
  document.querySelectorAll('.choose-service').forEach(button => button.addEventListener('click', () => { state.service = button.dataset.service; state.day = null; state.time = null; state.done = false; state.step = 1; render(); document.querySelector('#rendez-vous').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  render(false);
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); } }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach((item, index) => { item.classList.add('pending'); item.style.transitionDelay = `${index % 3 * 70}ms`; observer.observe(item); });
  }
  document.documentElement.classList.add('js');
})();
