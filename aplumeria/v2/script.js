(() => {
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal, .reveal-ribbon');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary');
  const progress = [...document.querySelectorAll('[data-go]')];
  const state = { step: 0, reached: 0, service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Lissage brésilien', 'Ombré hair', 'Coloration'];
  const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatDate = value => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(new Date(value + 'T12:00:00'));
  function dates() {
    const today = new Date(); today.setHours(12,0,0,0);
    return Array.from({length:14}, (_, i) => { const d = new Date(today); d.setDate(today.getDate()+i); return d; }).filter(d => d.getDay() !== 0 && d.getDay() !== 1);
  }
  const dateValue = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const times = ['10 h 00', '11 h 00', '14 h 00', '16 h 00'];
  function updateTimes() {
    const day = content.querySelector('#jour');
    const time = content.querySelector('#heure');
    if (!day || !time) return;
    const previous = time.value;
    const now = new Date();
    const today = dateValue(now);
    const available = times.filter(t => {
      if (day.value !== today) return true;
      const [hour, minute] = t.split(' h ').map(Number);
      return hour * 60 + minute > now.getHours() * 60 + now.getMinutes();
    });
    time.innerHTML = '<option value="">Choisir une heure</option>' + available.map(t => `<option>${t}</option>`).join('');
    if (available.includes(previous)) time.value = previous;
  }
  function show(step, focus = true) {
    state.step = step; state.reached = Math.max(state.reached, step);
    progress.forEach((button, i) => { button.disabled = i > state.reached || step === 3; if (i === step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    let html = '';
    if (step === 0) html = `<h3 tabindex="-1">Choisir une spécialité</h3><fieldset><legend>Prestation</legend><div class="choices">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s}" ${state.service === s ? 'checked' : ''}>${s}</label>`).join('')}</div></fieldset><p class="error" id="erreur" role="status"></p><div class="step-actions"><button class="next" type="button" data-action="service">Continuer →</button></div>`;
    if (step === 1) html = `<h3 tabindex="-1">Choisir un jour et une heure</h3><p class="fine">Exemples de créneaux pendant les horaires indiqués par Treatwell, à confirmer. Ils ne représentent pas les disponibilités du salon.</p><div class="fields"><label for="jour">Jour</label><select id="jour"><option value="">Choisir un jour</option>${dates().map(d => {const v=dateValue(d);return `<option value="${v}" ${state.day===v?'selected':''}>${formatDate(v)}</option>`}).join('')}</select><label for="heure">Heure</label><select id="heure"><option value="">Choisir une heure</option>${['10 h 00','11 h 00','14 h 00','16 h 00'].map(t => `<option ${state.time===t?'selected':''}>${t}</option>`).join('')}</select></div><p class="error" id="erreur" role="status"></p><div class="step-actions"><button type="button" data-go="0">← Retour</button><button class="next" type="button" data-action="date">Continuer →</button></div>`;
    if (step === 2) html = `<h3 tabindex="-1">Vos coordonnées</h3><p class="fine">Ces informations restent dans cette page et ne sont pas envoyées.</p><div class="fields"><label for="prenom">Prénom</label><input id="prenom" autocomplete="given-name" value="${escapeHTML(state.name)}" aria-describedby="erreur"><label for="telephone">Téléphone</label><input id="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="erreur"></div><p class="error" id="erreur" role="status"></p><div class="step-actions"><button type="button" data-go="1">← Retour</button><button class="next" type="button" data-action="confirm">Terminer la simulation</button></div>`;
    if (step === 3) html = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeHTML(state.name)}, votre sélection est prête&nbsp;: ${escapeHTML(state.service)}, ${formatDate(state.day)} à ${escapeHTML(state.time)}.</p><p>Rien n’a été envoyé et aucun rendez-vous n’a été pris. Pour réserver, utilisez Treatwell ou téléphonez au salon.</p><div class="step-actions"><button type="button" data-action="reset">Recommencer</button></div>`;
    content.innerHTML = `<div class="step-enter">${html}</div>`;
    if (step === 1) updateTimes();
    summary.textContent = 'Votre sélection : ' + (state.service || 'aucune prestation choisie') + (state.day ? ' · ' + formatDate(state.day) : '') + (state.time ? ' · ' + state.time : '') + '.';
    if (focus) content.querySelector('h3').focus();
  }
  content.addEventListener('change', event => { if (event.target.id === 'jour') updateTimes(); });
  content.addEventListener('focusin', event => { if (event.target.matches('input:not([type=radio])')) document.body.classList.add('saisie'); });
  content.addEventListener('focusout', event => { if (event.target.matches('input:not([type=radio])')) document.body.classList.remove('saisie'); });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.go !== undefined && !button.disabled) { show(Number(button.dataset.go)); return; }
    const action = button.dataset.action; const error = content.querySelector('#erreur');
    if (action === 'service') { const selected=content.querySelector('input[name="service"]:checked'); if (!selected) { error.textContent='Choisissez une prestation pour continuer.'; return; } if (state.service !== selected.value) { state.day=''; state.time=''; state.reached=0; } state.service=selected.value; show(1); }
    if (action === 'date') { const day=content.querySelector('#jour').value, time=content.querySelector('#heure').value; if (!day || !time) {error.textContent='Choisissez un jour et une heure pour continuer.'; return;} state.day=day;state.time=time;show(2); }
    if (action === 'confirm') { state.name=content.querySelector('#prenom').value.trim();state.phone=content.querySelector('#telephone').value.trim();const digits=state.phone.replace(/[\s.()-]/g,'');if (!state.name || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits)) {error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.';return;}show(3); }
    if (action === 'reset') {Object.assign(state,{step:0,reached:0,service:'',day:'',time:'',name:'',phone:''});show(0);}
  });
  show(0, false);
})();
