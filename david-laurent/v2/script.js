(() => {
  const root = document.documentElement;
  root.classList.add('js');
  document.body.classList.add('entering');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('entering')));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveals.forEach(el => { el.classList.add('pending'); observer.observe(el); });
  }
  const app = document.getElementById('booking-app');
  const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
  const services = ['Coloration', 'Mèches', 'Conseil de coupe'];
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00'));
  const dates = () => Array.from({length: 14}, (_, index) => {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + index);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {key, closed: d.getDay() === 0 || d.getDay() === 1};
  });
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function summary() {
    const parts = [state.service, state.date && dateLabel(state.date), state.time && state.time.replace(':',' h ')].filter(Boolean);
    const edits = [state.service && state.step > 0 ? '<button type="button" data-step="0">Modifier la prestation</button>' : '', state.date && state.step > 1 ? '<button type="button" data-step="1">Modifier le jour</button>' : '', state.time && state.step > 2 ? '<button type="button" data-step="2">Modifier l’heure</button>' : ''].join('');
    return `<div class="summary"><strong>Votre sélection</strong><p>${parts.length ? parts.map(escapeText).join(' · ') : 'Rien de choisi pour le moment.'}</p><div class="summary-actions">${edits}</div></div>`;
  }
  function render(focus = false) {
    let html = '';
    if (state.step === 0) html = `<h3 tabindex="-1">Choisir une prestation</h3><p class="fine">Étape 1 sur 4 · Tarifs et durées à confirmer.</p><fieldset><legend>Prestation</legend><div class="choices">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}>${s}</label>`).join('')}</div></fieldset>`;
    if (state.step === 1) html = `<h3 tabindex="-1">Choisir un jour</h3><p class="fine">Étape 2 sur 4 · Horaires publiés à confirmer. Les dates sont proposées pour cette simulation uniquement.</p><fieldset><legend>Jour</legend><div class="choices days">${dates().map(d => `<label class="choice"><input type="radio" name="date" value="${d.key}" ${d.key === state.date ? 'checked' : ''} ${d.closed ? 'disabled' : ''}>${dateLabel(d.key)}${d.closed ? ' · fermé' : ''}</label>`).join('')}</div></fieldset>`;
    if (state.step === 2) {
      const day = new Date(state.date + 'T12:00:00').getDay(), end = day === 4 ? 18 : 19, now = new Date();
      const slots = Array.from({length:end-9}, (_,i) => `${String(i+9).padStart(2,'0')}:00`).filter(t => new Date(`${state.date}T${t}:00`) > now);
      html = `<h3 tabindex="-1">Choisir une heure</h3><p class="fine">Étape 3 sur 4 · Heures proposées pour la simulation, sans indication de disponibilité réelle.</p><fieldset><legend>${dateLabel(state.date)}</legend><div class="choices days">${slots.length ? slots.map(t => `<label class="choice"><input type="radio" name="time" value="${t}" ${state.time === t ? 'checked' : ''}>${t.replace(':',' h ')}</label>`).join('') : '<p>Aucune heure proposée pour ce jour. Choisissez un autre jour.</p>'}</div></fieldset>`;
    }
    if (state.step === 3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="fine">Étape 4 sur 4 · Ces informations restent dans votre navigateur.</p><div class="fields"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="erreur-nom"><p class="error" id="erreur-nom"></p><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone"><p class="error" id="erreur-telephone"></p></div>`;
    if (state.step === 4) html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.name)}. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p>Pour un rendez-vous réel, appelez le <a href="tel:+33493625341">04 93 62 53 41</a>.</p>`;
    const actions = state.step < 4 ? `<div class="flow-actions">${state.step ? '<button type="button" class="flow-button secondary" data-action="back">← Retour</button>' : ''}<button type="button" class="flow-button" data-action="next">${state.step === 3 ? 'Terminer la simulation' : 'Continuer →'}</button></div><p class="error" id="erreur-choix" role="status"></p>` : '<div class="flow-actions"><button type="button" class="flow-button secondary" data-action="restart">Recommencer</button></div>';
    app.innerHTML = `<div class="flow-panel" aria-live="polite">${html}${actions}${summary()}</div>`;
    if (focus) app.querySelector('h3').focus();
  }
  let transitioning = false;
  function changeStep(step) {
    if (transitioning) return;
    transitioning = true;
    const panel = app.querySelector('.flow-panel');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { state.step = step; render(true); transitioning = false; return; }
    panel.classList.add('changing');
    setTimeout(() => { state.step = step; render(true); const nextPanel = app.querySelector('.flow-panel'); nextPanel.classList.add('arriving'); requestAnimationFrame(() => requestAnimationFrame(() => { nextPanel.classList.remove('arriving'); transitioning = false; })); }, 200);
  }
  app.addEventListener('change', e => {
    if (e.target.name === 'service') state.service = e.target.value;
    if (e.target.name === 'date') { state.date = e.target.value; state.time = ''; }
    if (e.target.name === 'time') state.time = e.target.value;
    const existing = app.querySelector('.summary'); if (existing) existing.outerHTML = summary();
  });
  app.addEventListener('click', e => {
    const button = e.target.closest('button'); if (!button || transitioning) return;
    if (button.dataset.step !== undefined) { if (state.step === 3) { state.name = app.querySelector('#prenom').value; state.phone = app.querySelector('#telephone').value; } changeStep(Number(button.dataset.step)); return; }
    const action = button.dataset.action; if (!action) return;
    if (action === 'restart') { Object.assign(state,{step:0, service:'',date:'',time:'',name:'',phone:''}); changeStep(0); return; }
    if (action === 'back') { if (state.step === 3) { state.name = app.querySelector('#prenom').value; state.phone = app.querySelector('#telephone').value; } changeStep(state.step-1); return; }
    if ((state.step === 0 && !state.service) || (state.step === 1 && !state.date) || (state.step === 2 && !state.time)) { app.querySelector('#erreur-choix').textContent = 'Veuillez faire un choix pour continuer.'; return; }
    if (state.step === 3) {
      state.name = app.querySelector('#prenom').value.trim(); state.phone = app.querySelector('#telephone').value.trim();
      const validName = state.name.length > 0, validPhone = /^(?:(?:\+33|0033)[\s.-]*[1-9]|0[1-9])(?:[\s.-]*\d{2}){4}$/.test(state.phone);
      app.querySelector('#erreur-nom').textContent = validName ? '' : 'Indiquez votre prénom.';
      app.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!validName || !validPhone) { app.querySelector(validName ? '#telephone' : '#prenom').focus(); return; }
    }
    changeStep(state.step+1);
  });
  render();
})();
