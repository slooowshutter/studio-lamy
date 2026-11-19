(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.08 }) : null;
  document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));

  const services = { eclat: { name: 'Soin visage coup d’éclat', duration: 35, label: '35 min' }, purifiant: { name: 'Soin visage purifiant', duration: 65, label: '1 h 05' }, californien: { name: 'Massage californien', duration: 60, label: '1 h' } };
  const state = { step: 0, service: '', date: '', time: '', firstName: '', phone: '' };
  const content = document.getElementById('booking-content');
  const recap = document.getElementById('recap');
  const buttons = [...document.querySelectorAll('[data-go]')];
  const dateLabel = value => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value + 'T12:00:00'));
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const escapeText = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    const parts = [];
    if (state.service) parts.push(services[state.service].name);
    if (state.date) parts.push(dateLabel(state.date));
    if (state.time) parts.push(state.time.replace(':',' h '));
    recap.textContent = parts.join(' · ') || 'À construire ensemble';
    buttons.forEach((button, i) => { button.disabled = state.step === 4 || i > (state.time ? 3 : state.date ? 2 : state.service ? 1 : 0); button.toggleAttribute('aria-current', i === state.step); if (i === state.step) button.setAttribute('aria-current', 'step'); });
  }
  function display(focusHeading = true) {
    updateSummary();
    if (state.step === 0) {
      content.innerHTML = `<h3 tabindex="-1">Choisissez un soin</h3><p class="hint">Simulation · Durées relevées sur Planity. Tarifs à confirmer avec Azohia.</p><div class="choices">${Object.entries(services).map(([id, s]) => `<label class="choice"><input type="radio" name="soin" value="${id}" ${state.service === id ? 'checked' : ''}><span>${s.name}</span><small>${s.label}</small></label>`).join('')}</div><div class="action-row"><button type="button" data-next>Choisir un jour →</button></div><p class="error" role="status"></p>`;
    } else if (state.step === 1) {
      const today = new Date(); today.setHours(12,0,0,0);
      const days = Array.from({length: 14}, (_, i) => { const d = new Date(today); d.setDate(today.getDate()+i); const key = dateKey(d); const closed = d.getDay() === 0 || d.getDay() === 1; return `<label class="choice"><input type="radio" name="jour" value="${key}" ${closed ? 'disabled' : ''} ${state.date === key ? 'checked' : ''}><span>${dateLabel(key)}${closed ? ' · fermé' : ''}</span></label>`; }).join('');
      content.innerHTML = `<h3 tabindex="-1">Choisissez un jour</h3><p class="hint">Créneaux fictifs, dans les horaires relevés. Jeudi&nbsp;: horaire à confirmer.</p><div class="choices">${days}</div><div class="action-row"><button class="secondary" type="button" data-back>← Retour</button><button type="button" data-next>Choisir une heure →</button></div><p class="error" role="status"></p>`;
    } else if (state.step === 2) {
      const d = new Date(state.date + 'T12:00:00'); const end = d.getDay() === 4 ? 18*60 : 19*60; const slots = [];
      for (let minute=600, n=0; minute + services[state.service].duration <= end; minute+=30, n++) { const value = `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`; const dt = new Date(state.date + 'T' + value + ':00'); const past = dt <= new Date(); const unavailable = n % 4 === 2 || past; slots.push(`<label class="choice"><input type="radio" name="heure" value="${value}" ${unavailable?'disabled':''} ${state.time===value&&!unavailable?'checked':''}><span>${value.replace(':',' h ')}${past?' · passé':unavailable?' · indisponible (simulation)':''}</span></label>`); }
      content.innerHTML = `<h3 tabindex="-1">Choisissez une heure</h3><p class="hint">${dateLabel(state.date)} · disponibilités fictives</p><div class="slot-grid">${slots.join('')}</div><div class="action-row"><button class="secondary" type="button" data-back>← Retour</button><button type="button" data-next>Vos coordonnées →</button></div><p class="error" role="status"></p>`;
    } else if (state.step === 3) {
      content.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p class="hint">Rien ne sera envoyé à l’institut.</p><form novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" aria-describedby="erreur-prenom" value="${escapeText(state.firstName)}" required><span class="error" id="erreur-prenom"></span></label><label class="field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="erreur-telephone" value="${escapeText(state.phone)}" required><span class="error" id="erreur-telephone"></span></label><p class="error" role="status"></p><div class="action-row"><button class="secondary" type="button" data-back>← Retour</button><button type="submit">Confirmer la simulation →</button></div></form>`;
    } else {
      content.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.firstName)}. Aucun rendez-vous n’a été envoyé ni enregistré.</p><p>Votre sélection : ${escapeText(services[state.service].name)}, ${dateLabel(state.date)} à ${state.time.replace(':',' h ')}. Téléphone saisi : ${escapeText(state.phone)}.</p><p class="hint">Pour prendre réellement rendez-vous, utilisez la fiche Planity ou appelez l’institut.</p><div class="action-row"><a class="button button-light" href="https://www.planity.com/azohia-14000-caen" target="_blank" rel="noopener noreferrer">Aller sur Planity ↗</a><button type="button" data-restart>Recommencer</button></div>`;
    }
    if (focusHeading) content.querySelector('h3').focus({preventScroll:true});
  }
  let transitioning = false;
  function go(step) { if (transitioning) return; state.step = step; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return display(); transitioning = true; content.classList.add('changing'); setTimeout(() => { display(); content.classList.remove('changing'); transitioning = false; }, 180); }
  content.addEventListener('click', e => {
    if (transitioning) return;
    if (e.target.closest('[data-back]')) go(state.step-1);
    if (e.target.closest('[data-restart]')) { Object.assign(state, {service:'',date:'',time:'',firstName:'',phone:''}); go(0); }
    if (e.target.closest('[data-next]')) {
      const input = content.querySelector('input:checked');
      if (!input) { content.querySelector('.error').textContent = 'Veuillez choisir une option pour continuer.'; return; }
      if (state.step === 0 && state.service !== input.value) { state.service = input.value; state.date = ''; state.time = ''; }
      if (state.step === 1 && state.date !== input.value) { state.date = input.value; state.time = ''; }
      if (state.step === 2) state.time = input.value;
      go(state.step+1);
    }
  });
  content.addEventListener('submit', e => { e.preventDefault(); if (transitioning) return; const form = e.target; const name = form.elements.prenom.value.trim(); const phone = form.elements.telephone.value.trim(); const digits = phone.replace(/[\s.()-]/g,''); const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits); form.elements.prenom.setAttribute('aria-invalid', String(!name)); form.elements.telephone.setAttribute('aria-invalid', String(!validPhone)); form.querySelector('#erreur-prenom').textContent = name ? '' : 'Indiquez votre prénom.'; form.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.'; if (!name || !validPhone) { (name ? form.elements.telephone : form.elements.prenom).focus(); return; } state.firstName=name; state.phone=phone; go(4); });
  buttons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.go))));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => { state.service=button.dataset.service; state.date=''; state.time=''; go(1); document.getElementById('rendez-vous').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }));
  display(false);
})();
