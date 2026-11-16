(() => {
  document.documentElement.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    revealItems.forEach(el => { el.classList.add('waiting'); observer.observe(el); });
  }
  const content = document.getElementById('booking-content');
  const status = document.getElementById('booking-status');
  const state = { step: 0, service: '', date: null, time: '', name: '', phone: '' };
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const summary = () => `<div class="summary"><strong>Votre sélection</strong><p>${state.service ? `<button type="button" data-step="0">${escape(state.service)}</button>` : 'Prestation à choisir'}${state.date ? ` · <button type="button" data-step="1">${dateFormat.format(state.date)}</button>` : ''}${state.time ? ` · <button type="button" data-step="2">${state.time}</button>` : ''}</p></div>`;
  function render(focus = true) {
    let html = '';
    if (state.step === 0) {
      html = `<p class="overline">Étape 1 sur 4</p><h3 tabindex="-1">Choisir le soin</h3><p>Un exemple de parcours, sans réservation réelle.</p><fieldset><legend>Prestation</legend><div class="choice"><input type="radio" name="service" id="serenity" value="Rituel serenity" ${state.service ? 'checked' : ''}><label for="serenity">Rituel serenity · 1 h 30</label></div></fieldset><button class="next" type="button" data-action="service">Choisir un jour →</button><p class="error" id="error"></p>`;
    } else if (state.step === 1) {
      const now = new Date(); now.setHours(0,0,0,0);
      const days = Array.from({length:14}, (_,i) => { const d = new Date(now); d.setDate(now.getDate()+i); const closed = d.getDay() === 0 || d.getDay() === 1; return `<button type="button" data-day="${i}" ${closed ? 'disabled' : ''}>${shortDate.format(d)}${closed ? '<br>Fermé' : ''}</button>`; }).join('');
      html = `<p class="overline">Étape 2 sur 4</p><h3 tabindex="-1">Choisir un jour</h3><p>Jours d’ouverture indiqués à titre informatif, à confirmer.</p><div class="day-grid">${days}</div><button class="back" type="button" data-step="0">← Retour</button>`;
    } else if (state.step === 2) {
      const end = state.date.getDay() === 6 ? 17 : 19;
      const now = new Date();
      const slots = []; let available = 0;
      for (let hour = 9; hour + 1.5 <= end; hour++) {
        const date = new Date(state.date); date.setHours(hour,0,0,0);
        const label = `${String(hour).padStart(2,'0')} h 00`; if (date > now) available++;
        slots.push(`<button type="button" data-time="${label}" ${date <= now ? 'disabled' : ''}>${label}</button>`);
      }
      html = `<p class="overline">Étape 3 sur 4</p><h3 tabindex="-1">Choisir une heure</h3><p>${dateFormat.format(state.date)}. Ces horaires sont fictifs et ne reflètent pas les disponibilités.</p><div class="slot-grid">${slots.join('')}</div>${available ? '' : '<p>Aucun horaire restant pour ce jour. Choisissez un autre jour.</p>'}<button class="back" type="button" data-step="1">← Retour</button>`;
    } else if (state.step === 3) {
      html = `<p class="overline">Étape 4 sur 4</p><h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer le parcours seulement&nbsp;: aucune donnée n’est envoyée.</p><form id="booking-form" novalidate><label class="field-label" for="name">Prénom</label><input id="name" name="name" type="text" autocomplete="given-name" value="${escape(state.name)}" aria-describedby="name-error"><p class="error" id="name-error"></p><label class="field-label" for="phone">Téléphone</label><input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escape(state.phone)}" aria-describedby="phone-error"><p class="error" id="phone-error"></p><button class="back" type="button" data-step="2">← Retour</button><button class="next" type="submit">Terminer la simulation →</button></form>`;
    } else {
      html = `<p class="overline">Simulation terminée</p><h3 tabindex="-1">Votre carte est prête.</h3><p>${escape(state.name)}, vous avez choisi le ${dateFormat.format(state.date)} à ${state.time} pour le Rituel serenity.</p><p><strong>Rien n’a été envoyé et aucun rendez-vous n’a été pris.</strong> Pour réserver, utilisez Planity ou téléphonez au salon.</p><a class="solid-link" href="https://www.planity.com/glam-by-hair-69009-lyon" target="_blank" rel="noopener">Réserver sur Planity ↗</a><button class="back" type="button" data-action="reset">Recommencer</button>`;
    }
    content.innerHTML = html + summary();
    content.classList.remove('step-in'); void content.offsetWidth; if (!reduced) content.classList.add('step-in');
    if (focus) { content.querySelector('h3').focus(); status.textContent = state.step === 4 ? 'Simulation terminée' : `Étape ${state.step + 1} sur 4`; }
  }
  content.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.step !== undefined) { state.step = Number(button.dataset.step); render(); }
    if (button.dataset.action === 'service') { const selected = content.querySelector('input[name=service]:checked'); if (!selected) { content.querySelector('#error').textContent = 'Choisissez une prestation pour continuer.'; return; } state.service = selected.value; state.step = 1; render(); }
    if (button.dataset.day !== undefined) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+Number(button.dataset.day)); state.date = d; state.time = ''; state.step = 2; render(); }
    if (button.dataset.time) { state.time = button.dataset.time; state.step = 3; render(); }
    if (button.dataset.action === 'reset') { Object.assign(state,{step:0,service:'',date:null,time:'',name:'',phone:''}); render(); }
  });
  content.addEventListener('input', event => { if (event.target.id === 'name') state.name = event.target.value; if (event.target.id === 'phone') state.phone = event.target.value; });
  content.addEventListener('submit', event => {
    event.preventDefault(); state.name = content.querySelector('#name').value.trim(); state.phone = content.querySelector('#phone').value.trim();
    const validName = state.name.length >= 2; const validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);
    content.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom (au moins deux caractères).';
    content.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    content.querySelector('#name').setAttribute('aria-invalid', String(!validName)); content.querySelector('#phone').setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) { content.querySelector(validName ? '#phone' : '#name').focus(); return; }
    state.step = 4; render();
  });
  render(false);
})();
