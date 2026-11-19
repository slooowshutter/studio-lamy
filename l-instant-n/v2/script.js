(() => {
  const panels = [...document.querySelectorAll('.panel')];
  function openPanel(id, focus = false) {
    const target = document.getElementById(id);
    if (!target) return;
    panels.forEach(panel => {
      const open = panel === target;
      panel.classList.toggle('is-open', open);
      panel.querySelector('.panel-toggle').setAttribute('aria-expanded', String(open));
      const content = panel.querySelector('.panel-grid');
      content.inert = !open;
    });
    if (focus) target.querySelector('.panel-toggle').focus({preventScroll:true});
  }
  panels.forEach(panel => {
    panel.querySelector('.panel-grid').inert = !panel.classList.contains('is-open');
    panel.querySelector('.panel-toggle').addEventListener('click', () => {
      if (panel.classList.contains('is-open')) {
        panel.classList.remove('is-open');
        panel.querySelector('.panel-toggle').setAttribute('aria-expanded', 'false');
        panel.querySelector('.panel-grid').inert = true;
      } else openPanel(panel.id);
    });
  });
  document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', () => openPanel(link.dataset.open)));
  const stepBox = document.getElementById('booking-step');
  const summary = document.getElementById('summary');
  const state = { service:'', date:'', time:'', name:'', phone:'' };
  let step = 0;
  let reached = 0;
  const services = ['Coupe de cheveux pour femme', 'Extensions de cheveux'];
  const dateLabel = value => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(new Date(value + 'T12:00:00'));
  function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function updateSummary() {
    summary.textContent = [state.service, state.date && dateLabel(state.date), state.time].filter(Boolean).join(' · ') || 'à commencer';
  }
  function escapeText(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
  function render(focus = true) {
    updateSummary();
    const names = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    let content = `<nav class="progress" aria-label="Étapes de la simulation">${names.map((name, index) => `<button type="button" data-step="${index}" ${index > reached || index > step || step === 4 ? 'disabled' : ''} ${index === step ? 'aria-current="step"' : ''}>${index + 1}. ${name}</button>`).join('')}</nav>`;
    if (step === 0) {
      content += `<h3 tabindex="-1">1. Choisir une prestation</h3><p>Les tarifs et les durées sont à confirmer par téléphone.</p><div class="choice-list">${services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</div>`;
    } else if (step === 1) {
      const dates = Array.from({length:14}, (_,i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()+i); return d; });
      content += `<h3 tabindex="-1">2. Choisir un jour</h3><p>Jours présentés selon les horaires publiés, à confirmer.</p><div class="choice-list days">${dates.map(d => { const value = localDate(d); const closed = d.getDay() === 0 || d.getDay() === 1; return `<label class="choice"><input type="radio" name="date" value="${value}" ${closed ? 'disabled' : ''} ${state.date === value ? 'checked' : ''}><span>${dateLabel(value)}${closed ? ' · fermé' : ''}</span></label>`; }).join('')}</div>`;
    } else if (step === 2) {
      const now = new Date();
      const today = localDate(now);
      const slots = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
      content += `<h3 tabindex="-1">3. Choisir une heure</h3><p>Créneaux d’exemple, sans indication de disponibilité réelle.</p><div class="choice-list slots">${slots.map(time => { const past = state.date === today && time <= `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; const label = time.replace(':',' h '); return `<label class="choice"><input type="radio" name="time" value="${time}" ${past ? 'disabled' : ''} ${state.time === time ? 'checked' : ''}><span>${label}${past ? ' · passé' : ''}</span></label>`; }).join('')}</div>`;
    } else if (step === 3) {
      content += `<h3 tabindex="-1">4. Vos coordonnées</h3><p>Pour cette démonstration, rien ne sera envoyé ni enregistré.</p><label class="field">Prénom<input name="name" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="name-error"><span class="field-error" id="name-error"></span></label><label class="field">Téléphone<input name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><span class="field-error" id="phone-error"></span></label>`;
    } else {
      content += `<h3 tabindex="-1">Simulation terminée</h3><p>Pour ${escapeText(state.name)}&nbsp;: ${escapeText(state.service)}, ${escapeText(dateLabel(state.date))} à ${escapeText(state.time.replace(':',' h '))}.</p><p><strong>Aucun rendez-vous n’a été envoyé.</strong> Pour réserver, contactez le salon au <a href="tel:+33472070607">04 72 07 06 07</a>.</p><div class="booking-actions"><button class="primary" type="button" data-restart>Recommencer</button></div>`;
    }
    if (step < 4) content += `<p class="error" id="booking-error" role="status"></p><div class="booking-actions">${step > 0 ? '<button class="secondary" type="button" data-back>Retour</button>' : ''}<button class="primary" type="button" data-next>${step === 3 ? 'Terminer la simulation' : 'Continuer'}</button></div>`;
    stepBox.innerHTML = `<div class="booking-screen enter">${content}</div>`;
    if (focus) stepBox.querySelector('h3').focus({preventScroll:true});
  }
  stepBox.addEventListener('click', event => {
    const jump = event.target.closest('[data-step]');
    if (jump && !jump.disabled) { if (step === 3) { state.name = stepBox.querySelector('[name=name]').value; state.phone = stepBox.querySelector('[name=phone]').value; } step = Number(jump.dataset.step); render(); return; }
    if (event.target.closest('[data-restart]')) { Object.assign(state,{service:'',date:'',time:'',name:'',phone:''}); step=0; reached=0; render(); return; }
    if (event.target.closest('[data-back]')) { if(step===3){state.name=stepBox.querySelector('[name=name]').value; state.phone=stepBox.querySelector('[name=phone]').value;} step--; render(); return; }
    if (!event.target.closest('[data-next]')) return;
    const error = stepBox.querySelector('#booking-error');
    if (step < 3) {
      const selected = stepBox.querySelector('input[type=radio]:checked');
      if (!selected) { error.textContent = 'Veuillez choisir une option pour continuer.'; return; }
      if (step === 0) state.service = services[Number(selected.value)];
      if (step === 1) { if (state.date !== selected.value) state.time = ''; state.date = selected.value; }
      if (step === 2) state.time = selected.value;
    } else {
      state.name = stepBox.querySelector('[name=name]').value.trim();
      state.phone = stepBox.querySelector('[name=phone]').value.trim();
      const nameInput = stepBox.querySelector('[name=name]');
      const phoneInput = stepBox.querySelector('[name=phone]');
      const nameInvalid = !state.name;
      const phoneInvalid = !/^(?:(?:\+33|0033)\s?\d|0\d)(?:[\s.\-]*\d){8}$/.test(state.phone);
      nameInput.setAttribute('aria-invalid', String(nameInvalid));
      phoneInput.setAttribute('aria-invalid', String(phoneInvalid));
      stepBox.querySelector('#name-error').textContent = nameInvalid ? 'Indiquez votre prénom.' : '';
      stepBox.querySelector('#phone-error').textContent = phoneInvalid ? 'Indiquez un numéro de téléphone français valide.' : '';
      if (nameInvalid || phoneInvalid) { (nameInvalid ? nameInput : phoneInput).focus(); return; }
    }
    step++; reached = Math.max(reached, step); render();
  });
  document.querySelectorAll('[data-book]').forEach(button => button.addEventListener('click', () => { state.service=button.dataset.book; step=1; reached=Math.max(reached,1); render(false); openPanel('rendez-vous'); document.getElementById('rendez-vous').scrollIntoView({behavior:'auto'}); stepBox.querySelector('h3').focus({preventScroll:true}); }));
  render(false);
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('seen'); observer.unobserve(entry.target); } }), {threshold:.08});
    document.querySelectorAll('.panel-toggle, footer').forEach(el => { el.classList.add('reveal'); observer.observe(el); });
  }
})();
