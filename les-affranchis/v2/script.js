(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); const count = entry.target.querySelector('.count'); if (count && !reduced) { const start = performance.now(); const tick = now => { const n = Math.min(1, (now - start) / 600); count.textContent = String(Math.max(1, Math.ceil(n * 5))); if (n < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); } } });
  }, { threshold: .15 }) : null;
  document.querySelectorAll('.reveal').forEach(el => { if (observer) { el.classList.add('observed'); observer.observe(el); } else el.classList.add('visible'); });
  setTimeout(() => document.querySelectorAll('.reveal.observed:not(.visible)').forEach(el => el.classList.remove('observed')), 4000);
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const content = document.querySelector('#booking-content');
  const progress = document.querySelector('#progress');
  const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Shampoing + coupe + coiffage', 'Shampoing + coupe + brushing', 'Taille de barbe', 'Shampoing + couleur + brushing', 'Balayage + coupe + patine + brushing'];
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris' });
  const longFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const parisToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const dates = Array.from({length: 10}, (_, i) => { const d = new Date(`${parisToday}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+i); return d.toISOString().slice(0,10); });
  const showDate = (date, formatter) => formatter.format(new Date(`${date}T12:00:00Z`));
  function summary() {
    document.querySelector('#summary-service').textContent = state.service || 'Prestation —';
    document.querySelector('#summary-day').textContent = state.day ? showDate(state.day, longFormatter) : 'Jour —';
    document.querySelector('#summary-time').textContent = state.time || 'Heure —';
    document.querySelector('#summary-day').disabled = !state.service;
    document.querySelector('#summary-time').disabled = !state.day;
  }
  function past(t) {
    if (state.day !== parisToday) return false;
    const current = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date());
    return Number(current.replace(':','')) >= Number(t.replace(/\D/g,''));
  }
  function render(focus = true) {
    progress.textContent = state.step < 4 ? `0${state.step + 1} / 04` : 'TERMINÉ';
    summary();
    let markup = '';
    if (state.step === 0) markup = `<h3 tabindex="-1">Quelle prestation&nbsp;?</h3><p>Choisissez une prestation pour cette simulation. Tarifs à confirmer auprès du salon.</p><div class="options">${services.map((s,i) => `<label class="option"><input type="radio" name="prestation" value="${i}" ${state.service === s ? 'checked' : ''}> <span>${s}</span></label>`).join('')}</div><p class="error" id="erreur" role="status"></p><div class="actions"><button class="action" data-action="service">Continuer →</button></div>`;
    if (state.step === 1) markup = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Dates proposées pour l’exemple. Horaires à confirmer avec le salon.</p><div class="days">${dates.map(d => `<button class="choice ${state.day === d ? 'selected' : ''}" data-day="${d}" aria-pressed="${state.day === d}">${showDate(d,dateFormatter)}</button>`).join('')}</div><p class="error" id="erreur" role="status"></p><div class="actions"><button class="action secondary" data-action="back">← Retour</button><button class="action" data-action="day">Continuer →</button></div>`;
    if (state.step === 2) markup = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>Créneaux fictifs, sans lien avec les disponibilités du salon.</p><div class="times">${['15 h 00','17 h 00'].map(t => `<button class="choice ${state.time === t ? 'selected' : ''}" data-time="${t}" aria-pressed="${state.time === t}" ${past(t) ? 'disabled' : ''}>${t}${past(t) ? ' · passé' : ''}</button>`).join('')}</div>${['15 h 00','17 h 00'].every(past) ? '<p>Ces exemples sont passés. Choisissez un autre jour.</p>' : ''}<p class="error" id="erreur" role="status"></p><div class="actions"><button class="action secondary" data-action="back">← Retour</button><button class="action" data-action="time">Continuer →</button></div>`;
    if (state.step === 3) markup = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Rien ne sera envoyé ni conservé.</p><form id="details" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" required aria-describedby="erreur-prenom"></label><p class="error" id="erreur-prenom" role="status"></p><label class="field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="erreur-telephone"></label><p class="error" id="erreur-telephone" role="status"></p><div class="actions"><button type="button" class="action secondary" data-action="back">← Retour</button><button class="action" type="submit">Terminer la simulation →</button></div></form>`;
    if (state.step === 4) markup = `<h3 tabindex="-1">Simulation terminée.</h3><p>Ce n’est pas un rendez-vous&nbsp;: aucune demande n’a été envoyée. Pour réserver, contactez le salon ou utilisez sa page de réservation.</p><div class="actions"><a class="button light" href="tel:+33140301267">Appeler le salon ↗</a><button class="action secondary" data-action="restart">Recommencer</button></div>`;
    content.innerHTML = markup;
    if (state.step === 3) { content.querySelector('[name=prenom]').value = state.name; content.querySelector('[name=telephone]').value = state.phone; }
    if (focus && !reduced) { content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter'); }
    if (focus) content.querySelector('h3')?.focus({preventScroll:true});
  }
  content.addEventListener('change', event => { if (event.target.name === 'prestation') { state.service = services[Number(event.target.value)]; summary(); } });
  content.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.day) { state.day = button.dataset.day; state.time = ''; render(false); content.querySelector(`[data-day="${state.day}"]`).focus(); return; }
    if (button.dataset.time) { state.time = button.dataset.time; render(false); content.querySelector(`[data-time="${state.time}"]`).focus(); return; }
    const action = button.dataset.action;
    if (action === 'back') { if (state.step === 3) { state.name = content.querySelector('[name=prenom]').value; state.phone = content.querySelector('[name=telephone]').value; } state.step--; render(); return; }
    if (action === 'restart') { Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''}); render(); return; }
    if (action === 'service' || action === 'day' || action === 'time') {
      const key = action; if (!state[key]) { content.querySelector('#erreur').textContent = `Choisissez ${key === 'service' ? 'une prestation' : key === 'day' ? 'un jour' : 'une heure'} pour continuer.`; return; }
      state.step++; render();
    }
  });
  content.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target; const name = form.elements.prenom.value.trim(); const phone = form.elements.telephone.value.trim();
    const validPhone = /^(?:(?:\+33|0033)\s*|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(phone);
    const nameInput = form.elements.prenom, phoneInput = form.elements.telephone;
    nameInput.setAttribute('aria-invalid', String(!name)); phoneInput.setAttribute('aria-invalid', String(!validPhone));
    form.querySelector('#erreur-prenom').textContent = name ? '' : 'Indiquez votre prénom.';
    form.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (!name || !validPhone) { (!name ? nameInput : phoneInput).focus(); return; }
    state.name = name; state.phone = phone; state.step = 4; render();
  });
  document.querySelector('.summary').addEventListener('click', event => { const button = event.target.closest('[data-step]'); if (!button || button.disabled) return; if (state.step === 3) { state.name = content.querySelector('[name=prenom]').value; state.phone = content.querySelector('[name=telephone]').value; } state.step = Number(button.dataset.step); render(); });
  render(false);
})();
