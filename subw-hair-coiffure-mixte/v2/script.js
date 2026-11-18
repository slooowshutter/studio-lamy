(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add(entry.target.classList.contains('hero-blob') ? 'entered' : 'visible');
    observer.unobserve(entry.target);
  }), { threshold: 0.15 });
  document.querySelectorAll('.reveal, .hero-blob').forEach(el => observer.observe(el));
  } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); document.querySelector('.hero-blob').classList.add('entered'); }
  const app = document.querySelector('#booking-app');
  const recap = document.querySelector('#recap');
  const announcement = document.querySelector('#annonce');
  const progress = document.querySelector('#progression');
  const state = { step: 0, day: null, time: '', name: '', phone: '' };
  const now = new Date();
  const days = Array.from({length: 14}, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12); return d; });
  const dayLabel = d => new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'}).format(d);
  function hours(d) { const n = d.getDay(); return n === 0 ? [] : n === 1 ? [14,15,16,17,18] : n === 6 ? [8,9,10,11,12,13,14,15,16,17] : [9,10,11,12,13,14,15,16,17,18]; }
  const clean = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(focus = true) {
    recap.textContent = [state.day !== null ? dayLabel(days[state.day]) : '', state.time, state.name].filter(Boolean).join(' · ') || 'À compléter';
    const labels = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    progress.innerHTML = labels.map((label, i) => `<button type="button" data-step="${i}" ${i >= state.step || state.step === 4 ? 'disabled' : ''}>${label}</button>`).join('');
    let content = '';
    if (state.step === 0) content = `<h3 tabindex="-1">Une prestation à préciser</h3><p>La carte des prestations n’a pas été confirmée. Dans cet exemple, elle sera précisée avec le salon par téléphone.</p><div class="chips"><span>Prestation à préciser</span><span>Tarif à confirmer</span></div><div class="step-actions"><button data-action="next">Choisir un jour →</button></div>`;
    if (state.step === 1) content = `<h3 tabindex="-1">Choisir un jour</h3><p>Exemple sur les horaires publiés, à confirmer auprès du salon.</p><div class="step-options">${days.map((d,i) => `<button data-day="${i}" ${d.getDay() === 0 ? 'disabled' : ''} class="${state.day === i ? 'selected' : ''}" aria-pressed="${state.day === i}">${dayLabel(d)}${d.getDay() === 0 ? '<br>Fermé' : ''}</button>`).join('')}</div><div class="step-actions"><button class="back" data-action="back">Retour</button><button data-action="next" ${state.day === null ? 'disabled' : ''}>Choisir une heure →</button></div>`;
    if (state.step === 2) { const d=days[state.day]; content = `<h3 tabindex="-1">Choisir une heure</h3><p>Ces heures sont des exemples, pas des disponibilités réelles.</p><div class="step-options">${hours(d).map(h => { const past=d.toDateString()===now.toDateString() && h <= now.getHours(); const time=`${h} h`; return `<button data-time="${time}" ${past ? 'disabled' : ''} class="${state.time === time ? 'selected' : ''}" aria-pressed="${state.time === time}">${time}</button>`; }).join('')}</div>${hours(d).every(h => d.toDateString()===now.toDateString() && h <= now.getHours()) ? '<p>Aucune heure d’exemple ne reste aujourd’hui. Choisissez un autre jour.</p>' : ''}<div class="step-actions"><button class="back" data-action="back">Retour</button><button data-action="next" ${!state.time ? 'disabled' : ''}>Continuer →</button></div>`; }
    if (state.step === 3) content = `<h3 tabindex="-1">Vos coordonnées</h3><p>Exemple uniquement&nbsp;: rien ne sera envoyé.</p><form id="details" novalidate><label class="field">Prénom<input name="prenom" autocomplete="given-name" value="${clean(state.name)}" aria-describedby="erreur-prenom"></label><span class="error" id="erreur-prenom"></span><label class="field">Téléphone<input name="telephone" autocomplete="tel" inputmode="tel" value="${clean(state.phone)}" aria-describedby="erreur-telephone"></label><span class="error" id="erreur-telephone"></span><p>Prestation à préciser · ${dayLabel(days[state.day])} · ${state.time}</p><div class="step-actions"><button type="button" class="back" data-action="back">Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    if (state.step === 4) content = `<h3 tabindex="-1">Simulation terminée.</h3><p>${clean(state.name)}, votre exemple pour le ${dayLabel(days[state.day])} à ${state.time} est prêt.</p><p><strong>Aucune demande n’a été envoyée.</strong> Pour un vrai rendez-vous, appelez le salon.</p><div class="step-actions"><a class="button primary" href="tel:+33235718964">Appeler le salon ↗</a><button class="back" data-action="restart">Recommencer</button></div>`;
    app.innerHTML = `<div class="step">${content}</div>`;
    if (focus) { const heading = app.querySelector('h3'); announcement.textContent = heading.textContent; heading.focus({preventScroll:true}); }
  }
  function change(fn) { const el=app.querySelector('.step'); if (reduced.matches) { fn(); render(); return; } el.classList.add('changing'); setTimeout(() => {fn(); render();}, 180); }
  app.addEventListener('click', e => { const b=e.target.closest('button'); if (!b) return;
    if (b.dataset.day !== undefined) { state.day=Number(b.dataset.day); state.time=''; render(false); app.querySelector(`[data-day="${state.day}"]`).focus(); }
    if (b.dataset.time) { state.time=b.dataset.time; render(false); app.querySelector('.step-options .selected').focus(); }
    if (b.dataset.action === 'next') change(() => state.step++);
    if (b.dataset.action === 'back') change(() => state.step--);
    if (b.dataset.action === 'restart') change(() => Object.assign(state,{step:0,day:null,time:'',name:'',phone:''}));
  });
  progress.addEventListener('click', e => { const b = e.target.closest('button[data-step]'); if (b && !b.disabled) change(() => { state.step = Number(b.dataset.step); }); });
  app.addEventListener('input', e => { if (e.target.name === 'prenom') state.name = e.target.value; if (e.target.name === 'telephone') state.phone = e.target.value; });
  app.addEventListener('submit', e => {e.preventDefault(); const f=e.target; state.name=f.prenom.value.trim(); state.phone=f.telephone.value.trim(); const validName=state.name.length>0; const validPhone=/^(?:(?:\+33|0033)\s*\(?(?:0)\)?|(?:\+33|0033)|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(state.phone); f.querySelector('#erreur-prenom').textContent=validName?'':'Indiquez votre prénom.'; f.querySelector('#erreur-telephone').textContent=validPhone?'':'Indiquez un numéro français valide.'; if(validName && validPhone) change(() => state.step=4); else (validName ? f.telephone : f.prenom).focus(); });
  render(false);
})();
