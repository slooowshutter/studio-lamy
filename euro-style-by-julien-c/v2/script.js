(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const observed = document.querySelectorAll('.reveal-side, .reveal-group');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    observed.forEach(el => observer.observe(el));
  } else observed.forEach(el => el.classList.add('visible'));

  const content = document.getElementById('booking-content');
  const summary = document.getElementById('selection');
  const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Coupe femme', 'Coupe enfant', 'Coloration', 'Balayage'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const chosenDate = () => dates.find(d => key(d) === state.day);
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    const parts = [state.service, chosenDate() && dateFormat.format(chosenDate()), state.time && `${state.time.replace(':',' h ')}`].filter(Boolean);
    summary.innerHTML = `<strong>Votre sélection</strong><span>${parts.length ? parts.map(safe).join(' · ') : 'Rien pour le moment'}</span><div class="selection-nav">${state.step > 0 && state.step < 4 ? '<button type="button" data-step="0">Prestation</button>' : ''}${state.step > 1 && state.step < 4 ? '<button type="button" data-step="1">Jour</button>' : ''}${state.step > 2 && state.step < 4 ? '<button type="button" data-step="2">Heure</button>' : ''}</div>`;
  }
  function render(focus = false) {
    let body = '';
    if (state.step === 0) body = `<h3 tabindex="-1">Choisir une prestation</h3><fieldset><legend>Prestation à confirmer</legend>${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</fieldset>`;
    if (state.step === 1) body = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés pour cet essai uniquement.</p><fieldset><legend>Jour</legend><div class="choices-grid">${dates.map(d => { const closed = d.getDay() === 0 || d.getDay() === 1; const ended = key(d) === key(new Date()) && new Date().getHours() >= 15; return `<label class="choice-chip"><input type="radio" name="day" value="${key(d)}" ${state.day === key(d) ? 'checked' : ''} ${closed || ended ? 'disabled' : ''}><span>${dateFormat.format(d)}${closed ? ' · fermé selon les fiches' : ended ? ' · essai terminé pour ce jour' : ''}</span></label>`; }).join('')}</div></fieldset>`;
    if (state.step === 2) {
      const d = chosenDate();
      const times = ['11:00','15:00'];
      body = `<h3 tabindex="-1">Choisir une heure</h3><p>Heures fictives, sans disponibilité réelle. Horaires du salon à confirmer.</p><fieldset><legend>Heure de l’essai</legend><div class="choices-grid">${times.map(t => { const when = new Date(d); const [h,m] = t.split(':').map(Number); when.setHours(h,m,0,0); const past = when <= new Date(); return `<label class="choice-chip"><input type="radio" name="time" value="${t}" ${state.time === t ? 'checked' : ''} ${past ? 'disabled' : ''}><span>${t.replace(':',' h ')}${past ? ' · passé' : ''}</span></label>`; }).join('')}</div></fieldset>`;
    }
    if (state.step === 3) body = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour l’essai seulement&nbsp;: aucune donnée n’est envoyée.</p><label class="field"><span>Prénom</span><input name="name" autocomplete="given-name" value="${safe(state.name)}" aria-describedby="erreur-nom"><small class="error" id="erreur-nom" role="status"></small></label><label class="field"><span>Téléphone</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${safe(state.phone)}" aria-describedby="erreur-telephone"><small class="error" id="erreur-telephone" role="status"></small></label>`;
    if (state.step === 4) body = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${safe(state.name)}. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p>Pour un rendez-vous réel, appelez le <a href="tel:+33561489569">05 61 48 95 69</a>.</p>`;
    const action = state.step < 4 ? `<div class="booking-actions">${state.step > 0 ? '<button type="button" data-action="back">Retour</button>' : ''}<button type="button" class="primary" data-action="next">${state.step === 3 ? 'Terminer la simulation' : 'Continuer'} →</button></div>` : '<div class="booking-actions"><button type="button" data-action="restart">Recommencer</button></div>';
    content.innerHTML = `<div class="step-panel${focus ? ' entering' : ''}">${body}${action}</div>`;
    updateSummary();
    if (focus) { const panel = content.querySelector('.step-panel'); requestAnimationFrame(() => panel.classList.remove('entering')); content.querySelector('h3').focus({preventScroll:true}); }
  }
  summary.addEventListener('click', e => { const button = e.target.closest('[data-step]'); if (button) { state.step = Number(button.dataset.step); render(true); } });
  content.addEventListener('change', e => {
    if (e.target.name === 'service') { state.service = e.target.value; }
    if (e.target.name === 'day') { state.day = e.target.value; state.time = ''; }
    if (e.target.name === 'time') state.time = e.target.value;
    updateSummary();
  });
  content.addEventListener('click', e => {
    const action = e.target.closest('button')?.dataset.action;
    if (!action) return;
    if (action === 'restart') { Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''}); render(true); return; }
    if (action === 'back') { state.step--; render(true); return; }
    if (state.step === 0 && !state.service || state.step === 1 && !state.day || state.step === 2 && !state.time) {
      let msg = content.querySelector('.error');
      if (!msg) { msg = document.createElement('p'); msg.className = 'error'; msg.setAttribute('role','status'); content.querySelector('.booking-actions').before(msg); }
      msg.textContent = 'Choisissez une option pour continuer.'; return;
    }
    if (state.step === 3) {
      state.name = content.querySelector('[name="name"]').value.trim(); state.phone = content.querySelector('[name="phone"]').value.trim();
      const validPhone = /^(?:(?:\+|00)33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(state.phone);
      content.querySelector('#erreur-nom').textContent = state.name ? '' : 'Indiquez votre prénom.';
      content.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      content.querySelector('[name="name"]').setAttribute('aria-invalid', String(!state.name));
      content.querySelector('[name="phone"]').setAttribute('aria-invalid', String(!validPhone));
      if (!state.name || !validPhone) { content.querySelector(!state.name ? '[name="name"]' : '[name="phone"]').focus(); return; }
    }
    state.step++; render(true);
  });
  render();
})();
