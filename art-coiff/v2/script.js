(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries, obs) => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));
  const journey = document.querySelector('.journey');
  const track = document.querySelector('.track span');
  let ticking = false;
  function drawPath() {
    const rect = journey.getBoundingClientRect();
    const amount = Math.max(0, Math.min(1, (innerHeight * .65 - rect.top) / rect.height));
    track.style.setProperty('--draw', amount);
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(drawPath); ticking = true; } }, { passive: true });
  addEventListener('resize', drawPath, { passive: true });
  drawPath();

  const view = document.getElementById('booking-view');
  const summary = document.getElementById('summary');
  const progress = [...document.querySelectorAll('[data-goto]')];
  const state = { step: 0, max: 0, service: '', day: '', time: '', name: '', phone: '' };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const localKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dayFromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeHTML = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dateOptions() {
    const today = new Date();
    return Array.from({length: 14}, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const value = localKey(d);
      return `<label class="choice"><input type="radio" name="jour" value="${value}" ${weekend ? 'disabled' : ''} ${state.day === value ? 'checked' : ''}><span>${dateFormat.format(d)}${weekend ? ' — non proposé dans la simulation' : ''}</span></label>`;
    }).join('');
  }
  function timeOptions() {
    const today = new Date();
    return Array.from({length: 10}, (_, i) => {
      const h = i + 9, value = `${String(h).padStart(2, '0')}:00`;
      const past = state.day === localKey(today) && h <= today.getHours();
      return `<label class="choice"><input type="radio" name="heure" value="${value}" ${past ? 'disabled' : ''} ${state.time === value ? 'checked' : ''}><span>${h} h${past ? ' — passé' : ''}</span></label>`;
    }).join('');
  }
  function updateSummary() {
    const parts = [state.service, state.day ? dateFormat.format(dayFromKey(state.day)) : '', state.time ? state.time.replace(':00', ' h') : ''].filter(Boolean);
    summary.textContent = `Votre sélection : ${parts.length ? parts.join(' · ') : 'aucune pour le moment.'}`;
  }
  function syncProgress() {
    progress.forEach((button, i) => { button.disabled = i > state.max; if (i === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
  }
  function render(focus = false) {
    syncProgress();
    let html = '';
    if (state.step === 0) html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations mentionnées dans les annuaires. Tarifs à confirmer avec Art Coiff.</p><div class="choice-list">${['Coupe','Coloration','Mèches'].map(s => `<label class="choice"><input type="radio" name="prestation" value="${s}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div><div class="actions"><button class="action" type="button" data-next>Continuer →</button></div>`;
    if (state.step === 1) html = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés pour cette simulation uniquement. Horaires du salon à confirmer&nbsp;; le samedi n’est pas proposé car les sources divergent.</p><div class="choice-list">${dateOptions()}</div><div class="actions"><button class="action secondary" type="button" data-back>Retour</button><button class="action" type="button" data-next>Continuer →</button></div>`;
    if (state.step === 2) html = `<h3 tabindex="-1">Choisir une heure</h3><p>Heures proposées pour la simulation, entre 9 h et 19 h du lundi au vendredi selon les annuaires. Elles ne représentent pas les disponibilités réelles.</p><div class="choice-list">${timeOptions()}</div><div class="actions"><button class="action secondary" type="button" data-back>Retour</button><button class="action" type="button" data-next>Continuer →</button></div>`;
    if (state.step === 3) html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Aucune donnée n’est envoyée ni enregistrée.</p><div class="fields"><label for="prenom">Prénom</label><input id="prenom" autocomplete="given-name" value="${escapeHTML(state.name)}" aria-describedby="erreur"><label for="telephone">Téléphone</label><input id="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="erreur"></div><div class="actions"><button class="action secondary" type="button" data-back>Retour</button><button class="action" type="button" data-next>Terminer la simulation →</button></div>`;
    if (state.step === 4) html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeHTML(state.name)}. Votre choix est récapitulé ci-dessous. Aucun rendez-vous n’a été pris et rien n’a été envoyé.</p><p>Pour réserver réellement, appelez le <a href="tel:+33143543899">01 43 54 38 99</a>.</p><div class="actions"><button class="action secondary" type="button" data-reset>Recommencer</button></div>`;
    view.innerHTML = html + '<p id="erreur" class="error" role="status"></p>';
    view.classList.remove('is-entering');
    if (!reduced.matches && focus) { view.classList.add('is-entering'); requestAnimationFrame(() => requestAnimationFrame(() => view.classList.remove('is-entering'))); }
    updateSummary();
    if (focus) view.querySelector('h3').focus();
  }
  view.addEventListener('change', e => {
    if (e.target.name === 'prestation') { if (state.service !== e.target.value) { state.day = ''; state.time = ''; state.max = 0; } state.service = e.target.value; }
    if (e.target.name === 'jour') { if (state.day !== e.target.value) { state.time = ''; state.max = 1; } state.day = e.target.value; }
    if (e.target.name === 'heure') { if (state.time !== e.target.value) state.max = 2; state.time = e.target.value; }
    syncProgress();
    updateSummary();
  });
  view.addEventListener('click', e => {
    if (e.target.closest('[data-back]')) { state.step--; render(true); return; }
    if (e.target.closest('[data-reset]')) { Object.assign(state, {step:0,max:0,service:'',day:'',time:'',name:'',phone:''}); render(true); return; }
    if (!e.target.closest('[data-next]')) return;
    const error = view.querySelector('#erreur');
    if (state.step === 0 && !state.service) { error.textContent = 'Choisissez une prestation pour continuer.'; return; }
    if (state.step === 1 && !state.day) { error.textContent = 'Choisissez un jour pour continuer.'; return; }
    if (state.step === 2 && !state.time) { error.textContent = 'Choisissez une heure pour continuer.'; return; }
    if (state.step === 3) {
      state.name = view.querySelector('#prenom').value.trim(); state.phone = view.querySelector('#telephone').value.trim();
      if (!state.service || !state.day || !state.time) { state.step = !state.service ? 0 : !state.day ? 1 : 2; state.max = state.step; render(true); view.querySelector('#erreur').textContent = 'Complétez cette étape avant de continuer.'; return; }
      if (!state.name) { error.textContent = 'Indiquez votre prénom.'; view.querySelector('#prenom').focus(); return; }
      if (!/^(?:(?:\+|00)33|0)[1-9](?:[ .-]?\d{2}){4}$/.test(state.phone)) { error.textContent = 'Indiquez un numéro de téléphone français valide.'; view.querySelector('#telephone').focus(); return; }
    }
    state.step++; state.max = Math.max(state.max, state.step); render(true);
  });
  progress.forEach(button => button.addEventListener('click', () => { const step = Number(button.dataset.goto); if (step > state.max) return; state.step = step; render(true); }));
  render();
})();
