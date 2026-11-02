(() => {
  window.sitePret = true;
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary');
  const count = document.querySelector('#step-count');
  const steps = [...document.querySelectorAll('[data-goto]')];
  const services = ['Pose complète gel/résine court', 'Gainage gel sur ongles naturels', 'Réhaussement et teinture de cils', 'Microshading sourcils'];
  const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
  const escapeText = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', timeZone:'Europe/Paris' }).format(new Date(`${date}T12:00:00+01:00`));
  const todayParis = new Intl.DateTimeFormat('fr-CA', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  function dates() {
    const start = new Date(`${todayParis}T12:00:00Z`);
    return Array.from({length: 12}, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i + 1); return d.toISOString().slice(0,10); });
  }
  function choices(items, name, value, label) {
    return `<div class="choices">${items.map(item => `<label><input type="radio" name="${name}" value="${escapeText(item)}" ${item === value ? 'checked' : ''}><span>${escapeText(label(item))}</span></label>`).join('')}</div>`;
  }
  function render(focus = true) {
    const {step, service, date, time, name, phone} = state;
    count.textContent = step === 4 ? 'TERMINÉ' : `0${step + 1} / 04`;
    steps.forEach((button, index) => { button.disabled = index > step || step === 4; if (index === step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    summary.textContent = [service, date ? dateLabel(date) : '', time].filter(Boolean).join(' · ') || 'Choisissez une prestation pour commencer.';
    let html = '';
    if (step === 0) html = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p class="hint">Choisissez une prestation pour la simulation.</p>${choices(services,'service',service,x=>x)}<div class="booking-actions"><button type="button" data-next>Continuer →</button></div>`;
    if (step === 1) html = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p class="hint">Dates proposées pour cette simulation, sans indication de disponibilité réelle.</p>${choices(dates(),'date',date,dateLabel)}<div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="button" data-next>Continuer →</button></div>`;
    if (step === 2) html = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p class="hint">Horaires fictifs pour la simulation, à confirmer avec le salon.</p>${choices(['10 h 00','14 h 00','16 h 00'],'time',time,x=>x)}<div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="button" data-next>Continuer →</button></div>`;
    if (step === 3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Ces informations restent sur cette page et ne sont pas envoyées.${service === "Microshading sourcils" ? " Pour cette prestation, appelez le salon : elle ne se réserve pas en ligne." : ""}</p><label class="field"><span>Prénom</span><input name="name" autocomplete="given-name" value="${escapeText(name)}" required></label><label class="field"><span>Téléphone</span><input name="phone" autocomplete="tel" inputmode="tel" value="${escapeText(phone)}" required aria-describedby="form-error"></label><p class="error" id="form-error" role="status"></p><div class="booking-actions"><button class="back" type="button" data-back>Retour</button><button type="button" data-next>Terminer la simulation →</button></div>`;
    if (step === 4) html = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(name)}, votre choix&nbsp;: ${escapeText(service)}, le ${escapeText(dateLabel(date))} à ${escapeText(time)}.</p><p class="hint">Aucun rendez-vous n’a été réservé et rien n’a été envoyé.</p>${service === "Microshading sourcils" ? '<a href="tel:+33766822286">Appeler le salon pour réserver ↗</a>' : '<a href="https://www.planity.com/koko-bliss-06000-nice" target="_blank" rel="noopener">Réserver réellement sur Planity ↗</a>'}<div class="booking-actions"><button type="button" data-reset>Recommencer</button></div>`;
    content.innerHTML = html; content.classList.remove('booking-enter'); void content.offsetWidth; content.classList.add('booking-enter');
    if (focus) content.querySelector('h3')?.focus({preventScroll:true});
  }
  content.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'service') state.service = input.value;
    if (input.name === 'date') state.date = input.value;
    if (input.name === 'time') state.time = input.value;
    summary.textContent = [state.service, state.date ? dateLabel(state.date) : '', state.time].filter(Boolean).join(' · ');
  });
  content.addEventListener('click', event => {
    if (event.target.closest('[data-reset]')) { Object.assign(state,{step:0,service:'',date:'',time:'',name:'',phone:''}); render(); return; }
    if (event.target.closest('[data-back]')) { state.step--; render(); return; }
    if (!event.target.closest('[data-next]')) return;
    if (state.step < 3 && ![state.service,state.date,state.time][state.step]) {
      let error = content.querySelector('.error');
      if (!error) { error = document.createElement('p'); error.className = 'error'; error.setAttribute('role','status'); content.querySelector('.booking-actions').before(error); }
      error.textContent = 'Veuillez faire un choix pour continuer.'; return;
    }
    if (state.step === 3) {
      state.name = content.querySelector('[name=name]').value.trim(); state.phone = content.querySelector('[name=phone]').value.trim();
      const digits = state.phone.replace(/[\s.()-]/g,'');
      if (!state.name) { content.querySelector('#form-error').textContent = 'Indiquez votre prénom.'; content.querySelector('[name=name]').focus(); return; }
      if (!/^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(digits)) { content.querySelector('#form-error').textContent = 'Indiquez un numéro de téléphone français valide.'; content.querySelector('[name=phone]').focus(); return; }
    }
    state.step++; render();
  });
  steps.forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.goto); if (target <= state.step) { state.step = target; render(); } }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service = link.dataset.service; state.step = 1; render(false); }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active',active); item.setAttribute('aria-pressed',String(active)); });
    document.querySelectorAll('[data-category]').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  render(false);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); const number = entry.target.querySelector('[data-countup]'); if (number && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const start = performance.now(); const tick = now => { const progress = Math.min((now - start) / 650, 1); number.textContent = Math.round(100 * (1 - Math.pow(1 - progress, 3))) + '%'; if (progress < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); } observer.unobserve(entry.target); } }), {threshold:.12});
    document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
  } else document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
})();
