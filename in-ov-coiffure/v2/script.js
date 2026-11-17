(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    revealItems.forEach(el => observer.observe(el));
    const art = document.querySelector('.hero-art');
    const artObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) art.classList.add('pose');
    }), { threshold: .2 });
    artObserver.observe(art);
  } else revealItems.forEach(el => el.classList.add('visible'));

  const zone = document.querySelector('#booking-contenu');
  const recap = document.querySelector('#recap-texte');
  const tabs = [...document.querySelectorAll('[data-go]')];
  const prestations = ['Coupe femme', 'Coupe enfant', 'Coloration', 'Séchage au sèche-cheveux', 'Cheveux bouclés', 'Tressage de cheveux'];
  const state = { step: 0, max: 0, service: '', date: '', heure: '', prenom: '', telephone: '' };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const dateFromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeText = value => { const node = document.createElement('span'); node.textContent = value; return node.innerHTML; };
  const days = () => Array.from({length: 14}, (_, i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); return d; });
  const updateRecap = () => { const parts = [state.service, state.date && dateFormat.format(dateFromKey(state.date)), state.heure]; recap.textContent = parts.filter(Boolean).join(' · ') || 'Aucune sélection pour le moment.'; };
  function render(focus = false) {
    tabs.forEach((tab, i) => { tab.disabled = i > state.max; if (i === state.step) tab.setAttribute('aria-current','step'); else tab.removeAttribute('aria-current'); });
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Catégories d’annuaire à confirmer avec le salon. Aucun tarif ni durée n’est indiqué dans cette simulation.</p><div class="choix">${prestations.map((s,i) => `<label><input type="radio" name="prestation" value="${i}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div><p class="erreur" id="erreur" role="status"></p><div class="actions"><button class="principal" type="button" data-next>Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Horaires d’annuaire à confirmer&nbsp;: lundi à samedi, 9 h–19 h. Dimanche fermé.</p><div class="choix">${days().map(d => { const key=dateKey(d), closed=d.getDay()===0; return `<label><input type="radio" name="jour" value="${key}" ${state.date===key?'checked':''} ${closed?'disabled':''}><span>${shortFormat.format(d)}${closed?'<small>Fermé</small>':''}</span></label>`; }).join('')}</div><p class="erreur" id="erreur" role="status"></p><div class="actions"><button class="secondaire" type="button" data-back>Retour</button><button class="principal" type="button" data-next>Choisir une heure →</button></div>`;
    } else if (state.step === 2) {
      const today = dateKey(new Date());
      const hours = [9,10,11,12,13,14,15,16,17,18];
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>Heures proposées pour la simulation uniquement, sans disponibilité vérifiée.</p><div class="choix">${hours.map(h => { const val=`${String(h).padStart(2,'0')} h`; const past=state.date===today && h<=new Date().getHours(); return `<label><input type="radio" name="heure" value="${val}" ${state.heure===val?'checked':''} ${past?'disabled':''}><span>${val}${past?'<small>Passé</small>':''}</span></label>`; }).join('')}</div><p class="erreur" id="erreur" role="status"></p><div class="actions"><button class="secondaire" type="button" data-back>Retour</button><button class="principal" type="button" data-next>Vos coordonnées →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><div class="champs"><label for="prenom">Prénom</label><input id="prenom" autocomplete="given-name" aria-describedby="erreur"><label for="telephone">Téléphone</label><input id="telephone" type="tel" inputmode="tel" autocomplete="tel" aria-describedby="erreur"></div><p class="erreur" id="erreur" role="status"></p><div class="actions"><button class="secondaire" type="button" data-back>Retour</button><button class="principal" type="button" data-next>Terminer la simulation →</button></div>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.prenom)}. Rien n’a été envoyé&nbsp;: pour prendre rendez-vous, contactez le salon par téléphone.</p><p><strong>${escapeText(state.service)} · ${escapeText(dateFormat.format(dateFromKey(state.date)))} · ${escapeText(state.heure)}</strong></p><div class="actions"><a class="bouton bouton-clair" href="tel:+33241392733">Appeler le salon ↗</a><button class="secondaire" type="button" data-reset>Recommencer</button></div>`;
    }
    zone.innerHTML = html;
    if (state.step === 3) { zone.querySelector('#prenom').value = state.prenom; zone.querySelector('#telephone').value = state.telephone; }
    zone.classList.remove('booking-transition'); void zone.offsetWidth; zone.classList.add('booking-transition');
    updateRecap();
    if (focus) zone.querySelector('h3')?.focus();
  }
  tabs.forEach(tab => tab.addEventListener('click', () => { state.step=Number(tab.dataset.go); render(true); }));
  zone.addEventListener('change', e => {
    if (e.target.name === 'prestation') { const next=prestations[Number(e.target.value)]; if(next!==state.service){state.service=next; state.date=''; state.heure=''; state.max=0;} }
    if (e.target.name === 'jour') { if(state.date!==e.target.value){state.date=e.target.value;state.heure='';state.max=Math.min(state.max,1);} }
    if (e.target.name === 'heure') state.heure=e.target.value;
    updateRecap();
  });
  zone.addEventListener('click', e => {
    if (e.target.closest('[data-reset]')) { Object.assign(state,{step:0,max:0,service:'',date:'',heure:'',prenom:'',telephone:''}); render(true); return; }
    if (e.target.closest('[data-back]')) { state.step--; render(true); return; }
    if (!e.target.closest('[data-next]')) return;
    const error = zone.querySelector('#erreur');
    if (state.step===0 && !state.service) { error.textContent='Choisissez une prestation pour continuer.'; return; }
    if (state.step===1 && !state.date) { error.textContent='Choisissez un jour pour continuer.'; return; }
    if (state.step===2 && !state.heure) { error.textContent='Choisissez une heure pour continuer.'; return; }
    if (state.step===3) {
      state.prenom=zone.querySelector('#prenom').value.trim(); state.telephone=zone.querySelector('#telephone').value.trim();
      if (!state.prenom || !/^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.telephone)) { error.textContent='Indiquez votre prénom et un numéro de téléphone français valide.'; return; }
    }
    state.step++; state.max=Math.max(state.max,Math.min(state.step,3)); render(true);
  });
  render();
})();
