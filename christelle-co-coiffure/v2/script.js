(() => {
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !motion.matches) {
    root.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.reveal, .hero-blob').forEach(element => observer.observe(element));
    const hero = document.querySelector('.hero-copy');
    hero.classList.add('hero-arriving');
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.remove('hero-arriving')));
  }
  const panel = document.getElementById('step-content');
  if (!panel) return;
  const state = {service:'', date:'', time:'', name:'', phone:''};
  let step = 0;
  let maxStep = 0;
  const serviceNames = ['Coupe femme', 'Coloration', 'Balayage'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'});
  const days = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate() + i);
    if (date.getDay() !== 0 && date.getDay() !== 6) days.push(dateFormat.format(date));
  }
  const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options = (values, name, selected) => values.map(value => `<label class="choice"><input type="radio" name="${name}" value="${escapeHTML(value)}" ${selected === value ? 'checked' : ''}> <span>${escapeHTML(value)}</span></label>`).join('');
  const summary = () => {
    document.getElementById('recap-service').textContent = state.service || 'Prestation à choisir';
    document.getElementById('recap-date').textContent = state.date || 'Jour à choisir';
    document.getElementById('recap-time').textContent = state.time || 'Heure à choisir';
  };
  function render(focus = true) {
    summary();
    const labels = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    document.getElementById('step-nav').innerHTML = labels.map((label, index) => `<button type="button" data-step="${index}" ${index > maxStep ? 'disabled' : ''} ${step === index ? 'aria-current="step"' : ''}>${index + 1}<span class="sr-only"> ${label}</span></button>`).join('');
    let content = '';
    if (step === 0) content = `<p class="tiny">Étape 1 sur 4</p><h3 tabindex="-1">Choisir une prestation</h3><p>Liste à confirmer auprès du salon.</p><fieldset><legend class="sr-only">Prestation</legend><div class="choices">${options(serviceNames,'service',state.service)}</div></fieldset>`;
    if (step === 1) content = `<p class="tiny">Étape 2 sur 4</p><h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés pour cette simulation seulement. Horaires à confirmer.</p><fieldset><legend class="sr-only">Jour simulé</legend><div class="date-list">${options(days,'date',state.date)}</div></fieldset>`;
    if (step === 2) content = `<p class="tiny">Étape 3 sur 4</p><h3 tabindex="-1">Choisir une heure</h3><p>Ces heures sont des exemples, sans durée associée et sans lien avec les disponibilités réelles.</p><fieldset><legend class="sr-only">Heure simulée</legend><div class="choices">${options(['10 h 00','11 h 00','14 h 00'],'time',state.time)}</div></fieldset>`;
    if (step === 3) content = `<p class="tiny">Étape 4 sur 4</p><h3 tabindex="-1">Vos coordonnées</h3><p>Elles restent dans cette page et ne sont pas envoyées.</p><label class="field">Prénom<input id="name" type="text" autocomplete="given-name" value="${escapeHTML(state.name)}" aria-describedby="name-error"><span class="error" id="name-error"></span></label><label class="field">Téléphone<input id="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></label>`;
    if (step === 4) content = `<p class="tiny">Simulation terminée</p><h3 tabindex="-1">Rien n’a été envoyé.</h3><p>${escapeHTML(state.name)}, votre exemple&nbsp;: ${escapeHTML(state.service)}, ${escapeHTML(state.date)} à ${escapeHTML(state.time)}.</p><p>Pour un vrai rendez-vous, appelez le salon.</p><a class="button button-dark" href="tel:+33240461694">02 40 46 16 94 ↗</a>`;
    const actions = step < 4 ? `<div class="step-actions">${step > 0 ? '<button class="secondary" type="button" data-action="back">Retour</button>' : ''}<button type="button" data-action="next">${step === 3 ? 'Terminer la simulation' : 'Continuer'} →</button></div>` : '<div class="step-actions"><button class="secondary" type="button" data-action="restart">Recommencer</button></div>';
    panel.innerHTML = `<div class="step">${content}<p class="error selection-error" aria-live="polite"></p>${actions}</div>`;
    if (!motion.matches) { const current = panel.querySelector('.step'); current.classList.add('step-arriving'); requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('step-arriving'))); }
    if (focus) panel.querySelector('h3').focus({preventScroll:true});
  }
  document.getElementById('step-nav').addEventListener('click', event => {
    const button = event.target.closest('button[data-step]');
    if (!button || button.disabled) return;
    if (step === 3) { state.name = document.getElementById('name').value.trim(); state.phone = document.getElementById('phone').value.trim(); }
    step = Number(button.dataset.step); render();
  });
  panel.addEventListener('change', event => { if (event.target.matches('input[type=radio]')) { state[event.target.name] = event.target.value; summary(); } });
  panel.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.action;
    if (!action) return;
    if (action === 'restart') { Object.assign(state,{service:'',date:'',time:'',name:'',phone:''}); step=0; maxStep=0; render(); return; }
    if (step === 3) { state.name = document.getElementById('name').value.trim(); state.phone = document.getElementById('phone').value.trim(); }
    if (action === 'back') { step--; render(); return; }
    if (step < 3 && !state[['service','date','time'][step]]) { panel.querySelector('.selection-error').textContent = 'Faites un choix pour continuer.'; panel.querySelector('input').focus(); return; }
    if (step === 3) {
      const nameError = document.getElementById('name-error'); const phoneError = document.getElementById('phone-error');
      nameError.textContent = state.name ? '' : 'Indiquez votre prénom.';
      const validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);
      phoneError.textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!state.name || !validPhone) { document.getElementById(!state.name ? 'name' : 'phone').focus(); return; }
    }
    step++; maxStep = Math.max(maxStep, Math.min(step, 3)); render();
  });
  render(false);
})();
