(() => {
  'use strict';
  document.documentElement.classList.add('ready');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const content = document.querySelector('#step-content');
  const progress = document.querySelector('#progress');
  const summary = document.querySelector('#summary');
  const summaryActions = document.querySelector('#summary-actions');
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; });
  document.addEventListener('pointerdown', () => { keyboard = false; });
  const state = { step: 1, date: '', time: '', name: '', phone: '' };
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fromKey = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function recap() {
    const parts = [];
    if (state.step > 1) parts.push('Coiffure');
    if (state.date) parts.push(dateFormatter.format(fromKey(state.date)));
    if (state.time) parts.push(state.time.replace(':',' h '));
    summary.textContent = parts.length ? parts.join(' · ') : 'Rien pour le moment';
    summaryActions.innerHTML = state.step > 1 && state.step < 4 ? `<button type="button" data-go="1">Modifier la demande</button>${state.step > 2 ? '<button type="button" data-go="2">Modifier le créneau</button>' : ''}` : ''; 
  }
  function render(focus = true, transition = true) {
    progress.textContent = state.step === 4 ? 'SIMULATION TERMINÉE' : `ÉTAPE ${state.step} / 3`;
    recap();
    if (state.step === 1) {
      content.innerHTML = `<h3 tabindex="-1">Votre demande</h3><p>La carte détaillée est à confirmer. Choisissez la catégorie indiquée par les annuaires pour essayer le parcours.</p><div class="price-line"><span>01</span><strong>Coiffure</strong><span>Tarif à confirmer</span></div><div class="controls"><button type="button" data-action="next">Choisir un jour →</button></div>`;
    } else if (state.step === 2) {
      const today = new Date(); today.setHours(0,0,0,0);
      let days = '';
      for (let i=0; i<14; i++) {
        const day = new Date(today); day.setDate(today.getDate()+i);
        const key = dateKey(day), closed = day.getDay() === 0;
        days += `<button class="choice" type="button" data-date="${key}" aria-pressed="${state.date === key}" ${closed ? 'disabled' : ''}>${shortFormatter.format(day)}${closed ? '<br>Fermé' : ''}</button>`;
      }
      let times = '';
      if (state.date) {
        const selected = fromKey(state.date), now = new Date();
        for (let hour=9; hour<19; hour++) {
          const slot = new Date(selected); slot.setHours(hour,0,0,0);
          const value = `${String(hour).padStart(2,'0')}:00`;
          times += `<button class="choice" type="button" data-time="${value}" aria-pressed="${state.time === value}" ${slot <= now ? 'disabled' : ''}>${hour} h</button>`;
        }
      }
      content.innerHTML = `<h3 tabindex="-1">Jour et heure</h3><p>Créneaux fictifs dans les horaires indiqués par les annuaires, à confirmer.</p><div class="choices" aria-label="Choisir un jour">${days}</div>${state.date ? `<p>Choisissez une heure fictive&nbsp;:</p><div class="choices" aria-label="Choisir une heure">${times}</div>` : ''}<div class="controls"><button class="back" type="button" data-action="back">← Retour</button><button type="button" data-action="next" ${!state.time ? 'disabled' : ''}>Continuer →</button></div>`;
    } else if (state.step === 3) {
      content.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cet essai, les informations restent sur cet appareil et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="form-field">Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" required aria-describedby="form-error"></label><label class="form-field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" required aria-describedby="form-error"></label><p class="error" id="form-error" role="status"></p><div class="controls"><button class="back" type="button" data-action="back">← Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      content.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.name)}. Aucune demande n’a été envoyée et aucun créneau n’a été réservé.</p><p>Pour prendre rendez-vous, contactez directement le salon.</p><div class="controls"><a class="button dark" href="tel:+33463225218">Appeler le salon ↗</a><button class="back" type="button" data-action="restart">Recommencer</button></div>`;
    }
    content.classList.remove('step-enter');
    if (transition && !keyboard) { void content.offsetWidth; content.classList.add('step-enter'); }
    if (focus) content.querySelector('h3').focus({preventScroll:true});
  }
  content.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.date) { state.date = button.dataset.date; state.time = ''; render(false, false); const picked = content.querySelector(`[data-date="${state.date}"]`); if (picked) picked.focus({preventScroll:true}); }
    if (button.dataset.time) { state.time = button.dataset.time; render(false, false); const picked = content.querySelector(`[data-time="${state.time}"]`); if (picked) picked.focus({preventScroll:true}); }
    if (button.dataset.action === 'next') { state.step++; render(); }
    if (button.dataset.action === 'back') { state.step--; render(); }
    if (button.dataset.action === 'restart') { Object.assign(state,{step:1,date:'',time:'',name:'',phone:''}); render(); }
  });
  content.addEventListener('input', event => {
    if (event.target.name === 'prenom') state.name = event.target.value;
    if (event.target.name === 'telephone') state.phone = event.target.value;
  });
  summaryActions.addEventListener('click', event => {
    const button = event.target.closest('button[data-go]');
    if (button) { state.step = Number(button.dataset.go); render(); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target;
    state.name = form.elements.prenom.value.trim(); state.phone = form.elements.telephone.value.trim();
    const digits = state.phone.replace(/\D/g,'');
    if (!state.name || !/^(0[1-9]\d{8}|33[1-9]\d{8})$/.test(digits)) {
      document.querySelector('#form-error').textContent = 'Indiquez votre prénom et un numéro de téléphone français valide.';
      (!state.name ? form.elements.prenom : form.elements.telephone).focus(); return;
    }
    state.step = 4; render();
  });
  render(false);
  window.sitePret = true;
})();
