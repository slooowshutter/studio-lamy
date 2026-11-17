(() => {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const app = document.querySelector('#booking-app');
  const state = { step: 0, furthest: 0, service: '', day: '', time: '', name: '', phone: '' };
  const labels = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const days = Array.from({ length: 14 }, (_, index) => {
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + index);
    return { key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, text: dateFormat.format(d), weekday: d.getDay() };
  });
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const dayText = () => days.find(day => day.key === state.day)?.text || 'À choisir';
  const timeAvailable = value => {
    if (value === '14 h') return false;
    return state.day !== days[0].key || Number.parseInt(value, 10) > new Date().getHours();
  };
  const todayFinished = () => new Date().getHours() >= 16;
  const choices = (name, values, selected) => `<div class="choices">${values.map(v => `<label><input type="radio" name="${name}" value="${esc(v.value)}" ${selected === v.value ? 'checked' : ''} ${v.disabled ? 'disabled' : ''}><span>${esc(v.label)}</span></label>`).join('')}</div>`;
  function render(focus = false, error = '', errorField = '') {
    const finished = state.step === 4;
    let content = '';
    if (state.step === 0) content = `<h4 tabindex="-1">Choisissez une prestation</h4>${choices('service', ['Lissage','Balayage'].map(value => ({value,label:value})), state.service)}`;
    if (state.step === 1) content = `<h4 tabindex="-1">Choisissez un jour fictif</h4><p>Les jours proposés suivent les horaires communs aux fiches consultées. Horaires à confirmer.</p>${choices('day', days.map(day => ({value:day.key,label:day.text + (day.weekday === 0 || day.weekday === 6 ? ' · à confirmer' : day.key === days[0].key && todayFinished() ? ' · aucun créneau fictif restant' : ''),disabled:day.weekday === 0 || day.weekday === 6 || (day.key === days[0].key && todayFinished())})), state.day)}`;
    if (state.step === 2) {
      content = `<h4 tabindex="-1">Choisissez une heure fictive</h4>${choices('time', ['10 h','11 h','14 h','15 h','16 h'].map((value, index) => ({value,label:value + (index === 2 ? ' · déjà pris' : ''),disabled:!timeAvailable(value)})), state.time)}`;
    }
    if (state.step === 3) content = `<h4 tabindex="-1">Vos coordonnées</h4><label class="field">Prénom<input name="name" autocomplete="given-name" value="${esc(state.name)}" ${errorField === 'name' ? 'aria-invalid="true" aria-describedby="booking-error"' : ''} required></label><label class="field">Téléphone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" value="${esc(state.phone)}" ${errorField === 'phone' ? 'aria-invalid="true" aria-describedby="booking-error"' : ''} required></label><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p>`;
    if (finished) content = `<h4 tabindex="-1">Simulation terminée</h4><p>Merci ${esc(state.name)}. Votre choix&nbsp;: ${esc(state.service)}, ${esc(dayText())} à ${esc(state.time)}.</p><p><strong>Aucun rendez-vous n’a été pris et rien n’a été envoyé.</strong> Pour réserver, appelez le salon.</p><a class="button" href="tel:+33437573843">Appeler le salon ↗</a><div class="actions"><button type="button" data-restart>Recommencer</button></div>`;
    app.innerHTML = `<div class="steps" aria-label="Étapes de la simulation">${labels.map((label, index) => `<button type="button" data-step="${index}" ${index > state.furthest || finished ? 'disabled' : ''} ${index === state.step ? 'aria-current="step"' : ''}>${index+1}. ${label}</button>`).join('')}</div><div class="step-panel entering" aria-live="polite">${content}${error ? `<p class="error" id="booking-error" role="alert">${esc(error)}</p>` : ''}${!finished ? `<div class="actions">${state.step ? '<button class="back" type="button" data-back>Retour</button>' : ''}<button type="button" data-next>${state.step === 3 ? 'Terminer la simulation' : 'Continuer'}</button></div>` : ''}</div><div class="summary"><strong>Votre sélection</strong><p>${esc(state.service || 'Prestation à choisir')} · ${esc(dayText())} · ${esc(state.time || 'Heure à choisir')}</p></div>`;
    requestAnimationFrame(() => app.querySelector('.step-panel')?.classList.remove('entering'));
    if (errorField) app.querySelector(`[name=${errorField}]`)?.focus();
    else if (focus) app.querySelector('h4')?.focus();
  }
  function read() {
    if (state.step === 0) {
      const value = app.querySelector('[name=service]:checked')?.value || '';
      if (value !== state.service) { state.day = ''; state.time = ''; state.furthest = 0; }
      state.service = value;
    }
    if (state.step === 1) {
      const value = app.querySelector('[name=day]:checked')?.value || '';
      if (value !== state.day) { state.time = ''; state.furthest = Math.min(state.furthest, 1); }
      state.day = value;
    }
    if (state.step === 2) state.time = app.querySelector('[name=time]:checked')?.value || '';
    if (state.step === 3) { state.name = app.querySelector('[name=name]').value.trim(); state.phone = app.querySelector('[name=phone]').value.trim(); }
  }
  app.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.hasAttribute('data-restart')) { Object.assign(state,{step:0,furthest:0,service:'',day:'',time:'',name:'',phone:''}); render(true); return; }
    if (target.hasAttribute('data-step')) { read(); state.step = Math.min(Number(target.dataset.step), state.furthest); render(true); return; }
    if (target.hasAttribute('data-back')) { read(); state.step--; render(true); return; }
    if (target.hasAttribute('data-next')) {
      read(); let error = ''; let errorField = '';
      if (state.step === 0 && !state.service) error = 'Choisissez une prestation pour continuer.';
      if (state.step === 1 && !state.day) error = 'Choisissez un jour pour continuer.';
      if (state.step === 2 && (!state.time || !timeAvailable(state.time))) error = 'Choisissez une heure pour continuer.';
      if (state.step === 3 && !state.name) { error = 'Indiquez votre prénom.'; errorField = 'name'; }
      else if (state.step === 3 && !/^(?:(?:\+33|0033)[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}$/.test(state.phone)) { error = 'Indiquez un numéro de téléphone français valide.'; errorField = 'phone'; }
      if (error) { render(false,error,errorField); return; }
      state.step++; state.furthest = Math.max(state.furthest, state.step); render(true);
    }
  });
  document.querySelectorAll('[data-preselect]').forEach(link => link.addEventListener('click', () => { if (state.service !== link.dataset.preselect) { state.day = ''; state.time = ''; state.furthest = 0; } state.service = link.dataset.preselect; state.step = 0; render(); }));
  render();
})();
