(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window && !reduced.matches) {
    root.classList.add('js');
    const items = document.querySelectorAll('.reveal');
    items.forEach(item => item.classList.add('pending'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('pending'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
    const blob = document.querySelector('.hero-blob');
    const shapeObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { blob.classList.add('in-view'); shapeObserver.disconnect(); }
    }), { threshold: .3 });
    shapeObserver.observe(blob);
  }

  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#booking-summary');
  const title = document.querySelector('#step-title');
  const count = document.querySelector('#step-count');
  const message = document.querySelector('#booking-message');
  const state = { step: 1, service: '', date: '', slot: '', firstName: '', phone: '' };
  const services = ['Coupe homme', 'Coupe femme', 'Coloration'];
  const parisToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nextDays = () => Array.from({length: 14}, (_, index) => { const date = new Date(`${parisToday()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + index); return date.toISOString().slice(0, 10); });
  const formatDate = date => new Intl.DateTimeFormat('fr-FR', {dateStyle:'full'}).format(new Date(`${date}T12:00:00`));
  function render(focus = true) {
    message.textContent = '';
    count.textContent = state.step < 5 ? `ÉTAPE ${state.step} SUR 4` : 'SIMULATION TERMINÉE';
    summary.innerHTML = state.step === 5 ? '' : [
      state.service && state.step > 1 ? `<button type="button" data-go="1" aria-label="Modifier la prestation">${escapeText(state.service)}</button>` : '',
      state.date && state.step > 2 ? `<button type="button" data-go="2" aria-label="Modifier la date">${escapeText(formatDate(state.date))}</button>` : '',
      state.slot && state.step > 3 ? `<button type="button" data-go="3" aria-label="Modifier l’heure">${escapeText(state.slot.replace(':',' h '))}</button>` : ''
    ].join('');
    if (state.step === 1) {
      title.textContent = 'Choisir une prestation';
      content.innerHTML = `<p class="hint">Simulation seulement · tarifs à confirmer auprès du salon.</p><fieldset class="service-options"><legend>Prestation souhaitée</legend>${services.map(s => `<label class="choice option"><input type="radio" name="prestation" value="${s}" ${state.service === s ? 'checked' : ''}><span>${s}</span></label>`).join('')}</fieldset><div class="booking-actions"><button type="button" data-service-next>Continuer</button></div>`;
    } else if (state.step === 2) {
      title.textContent = 'Choisir un jour';
      content.innerHTML = `<p class="hint">Choisissez parmi les quatorze prochains jours. Les horaires sont donnés à titre indicatif.</p><div class="day-list" aria-label="Jours proposés">${nextDays().map(date => { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); const closed = day === 0 || day === 1; return `<button class="day-choice" type="button" data-day="${date}" ${closed ? 'disabled' : ''}>${escapeText(formatDate(date))}<span>${closed ? 'Fermé' : 'Choisir ↗'}</span></button>`; }).join('')}</div><div class="booking-actions"><button type="button" class="back" data-back>Retour</button></div>`;
    } else if (state.step === 3) {
      title.textContent = 'Choisir une heure';
      const day = new Date(`${state.date}T12:00:00`).getDay();
      const slots = day === 6 ? ['09:00','11:00','14:00','16:00'] : ['09:00','11:00','14:00','16:00','18:00'];
      const nowParis = new Intl.DateTimeFormat('fr-FR', {timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
      const available = slots.filter(slot => state.date !== parisToday() || slot > nowParis);
      content.innerHTML = `<p class="hint">Ces heures sont fictives et ne correspondent pas à des disponibilités vérifiées.</p>${available.map(s => `<button class="choice" type="button" data-slot="${s}">${s.replace(':',' h ')}<span aria-hidden="true">↗</span></button>`).join('') || '<p>Aucune heure fictive restante ce jour. Choisissez une autre date.</p>'}<div class="booking-actions"><button type="button" class="back" data-back>Retour</button></div>`;
    } else if (state.step === 4) {
      title.textContent = 'Vos coordonnées';
      content.innerHTML = `<p class="hint">Pour essayer le parcours. Ces informations restent dans cette page et ne sont pas envoyées.</p><label for="first-name">Prénom</label><input id="first-name" autocomplete="given-name" value="${escapeText(state.firstName)}" aria-describedby="booking-message"><label for="phone">Téléphone</label><input id="phone" type="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="booking-message"><p class="hint">${escapeText(state.service)} · ${escapeText(formatDate(state.date))} à ${escapeText(state.slot.replace(':',' h '))}</p><div class="booking-actions"><button type="button" class="back" data-back>Retour</button><button type="button" data-confirm>Confirmer la simulation</button></div>`;
    } else {
      title.textContent = 'Votre exemple est prêt';
      content.innerHTML = `<p>${escapeText(state.firstName)} · ${escapeText(state.phone)}<br>${escapeText(state.service)}<br>${escapeText(formatDate(state.date))} à ${escapeText(state.slot.replace(':',' h '))}</p><p class="hint">Ceci est une simulation, pas un rendez-vous. Aucun message n’a été envoyé. Pour réserver, appelez le salon.</p><div class="booking-actions"><button type="button" class="back" data-restart>Recommencer</button><a class="button button-dark" href="tel:+33326091911">Appeler le salon ↗</a></div>`;
    }
    content.classList.remove('booking-content-enter');
    void content.offsetWidth;
    content.classList.add('booking-content-enter');
    if (focus) { title.focus({preventScroll:true}); message.textContent = `${count.textContent} : ${title.textContent}.`; }
  }
  summary.addEventListener('click', e => {
    const button = e.target.closest('[data-go]');
    if (button) { state.step = Number(button.dataset.go); render(); }
  });
  content.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-service-next')) {
      const selected = content.querySelector('input[name="prestation"]:checked');
      if (!selected) { message.textContent = 'Choisissez une prestation pour continuer.'; return; }
      state.service = selected.value; state.step = 2; render();
    } else if (button.dataset.day) {
      if (state.date !== button.dataset.day) state.slot = '';
      state.date = button.dataset.day; state.step = 3; render();
    } else if (button.dataset.slot) { state.slot = button.dataset.slot; state.step = 4; render(); }
    else if (button.hasAttribute('data-confirm')) {
      const first = document.querySelector('#first-name');
      const phone = document.querySelector('#phone');
      state.firstName = first.value.trim(); state.phone = phone.value.trim();
      first.removeAttribute('aria-invalid'); phone.removeAttribute('aria-invalid');
      if (!state.firstName) { first.setAttribute('aria-invalid','true'); message.textContent = 'Indiquez votre prénom pour continuer.'; first.focus(); return; }
      if (!/^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(state.phone)) { phone.setAttribute('aria-invalid','true'); message.textContent = 'Indiquez un numéro de téléphone français valide.'; phone.focus(); return; }
      state.step = 5; render();
    } else if (button.hasAttribute('data-back')) { state.step--; render(); }
    else if (button.hasAttribute('data-restart')) { Object.assign(state, {step:1,service:'',date:'',slot:'',firstName:'',phone:''}); render(); }
  });
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service = link.dataset.service; state.step = 2; render(false); }));
  render(false);
})();
