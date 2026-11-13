(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const app = document.querySelector('#booking-app');
  if (!app) return;
  const state = { step: 0, service: '', date: '', time: '', name: '', phone: '' };
  const services = ['Coupe et brushing', 'Coupe homme classique', 'Coupe enfant'];
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const days = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + i);
    days.push(date);
  }
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const escapeText = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const chosenDate = () => days.find(day => dateKey(day) === state.date);
  const summary = () => [state.service, chosenDate() ? dateFormat.format(chosenDate()) : '', state.time].filter(Boolean).map(escapeText).join(' · ');
  const steps = ['Choisir une prestation', 'Choisir un jour', 'Choisir une heure', 'Vos coordonnées', 'Simulation terminée'];
  function draw(focus = false) {
    let content = '';
    if (state.step === 0) {
      content = `<p>Choisissez une prestation pour essayer le parcours.</p><div class="booking-choices">${services.map(service => `<label class="choice"><input type="radio" name="service" value="${service}" ${state.service === service ? 'checked' : ''}><span>${service}</span></label>`).join('')}</div><div class="booking-actions"><button data-action="next" ${state.service ? '' : 'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 1) {
      content = `<p>Jours proposés à titre de démonstration. Le lundi est à confirmer et le dimanche est fermé.</p><div class="booking-choices days">${days.map(day => { const unavailable = day.getDay() === 0 || day.getDay() === 1; return `<label class="choice ${unavailable ? 'unavailable' : ''}"><input type="radio" name="date" value="${dateKey(day)}" ${state.date === dateKey(day) ? 'checked' : ''} ${unavailable ? 'disabled' : ''}><span>${dateFormat.format(day)}${unavailable ? `<small>${day.getDay() === 0 ? 'Fermé' : 'À confirmer'}</small>` : ''}</span></label>`; }).join('')}</div><div class="booking-actions"><button class="secondary" data-action="back">← Retour</button><button data-action="next" ${state.date ? '' : 'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 2) {
      const date = chosenDate();
      const options = (date && date.getDay() === 6 ? ['09:30', '11:00', '14:00'] : ['10:00', '12:00', '15:00', '17:00']).filter(time => {
        const candidate = new Date(date); const [hours, minutes] = time.split(':').map(Number); candidate.setHours(hours, minutes, 0, 0); return candidate > new Date();
      });
      content = `<p>Heures de démonstration, sans disponibilité vérifiée.</p><div class="booking-choices">${options.length ? options.map(time => `<label class="choice"><input type="radio" name="time" value="${time}" ${state.time === time ? 'checked' : ''}><span>${time.replace(':', ' h ')}</span></label>`).join('') : '<p>Plus d’heure de démonstration aujourd’hui. Choisissez un autre jour.</p>'}</div><div class="booking-actions"><button class="secondary" data-action="back">← Retour</button><button data-action="next" ${state.time && options.includes(state.time) ? '' : 'disabled'}>Continuer →</button></div>`;
    } else if (state.step === 3) {
      content = `<p>Ces coordonnées restent dans votre navigateur et ne sont pas envoyées.</p><div class="booking-fields"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="form-error"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" autocomplete="tel" inputmode="tel" type="tel" value="${escapeText(state.phone)}" aria-describedby="form-error"><p class="error" id="form-error" role="status"></p></div><div class="booking-actions"><button class="secondary" data-action="back">← Retour</button><button data-action="finish">Terminer la simulation</button></div>`;
    } else {
      content = `<p>Merci ${escapeText(state.name)}. Votre sélection a été enregistrée uniquement dans cette simulation.</p><p><strong>Aucun rendez-vous n’a été pris et rien n’a été envoyé.</strong></p><div class="booking-actions"><button data-action="restart">Recommencer</button></div>`;
    }
    app.innerHTML = `<div class="booking-panel" aria-live="polite"><p class="booking-progress">${state.step < 4 ? `Étape ${state.step + 1} / 4` : 'Démonstration'}</p><h3 tabindex="-1">${steps[state.step]}</h3>${content}<div class="booking-summary"><strong>Votre sélection</strong><p>${summary() || 'À compléter'}</p><div class="summary-actions">${state.step > 0 && state.step < 4 ? '<button data-jump="0">Modifier la prestation</button>' : ''}${state.step > 1 && state.step < 4 ? '<button data-jump="1">Modifier le jour</button>' : ''}${state.step > 2 && state.step < 4 ? '<button data-jump="2">Modifier l’heure</button>' : ''}</div></div></div>`;
    if (focus) app.querySelector('h3').focus({ preventScroll: true });
  }
  let moving = false;
  function move(next) {
    if (moving) return;
    moving = true;
    const panel = app.querySelector('.booking-panel');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { state.step = next; draw(true); moving = false; return; }
    panel.classList.add('changing');
    setTimeout(() => { state.step = next; draw(true); const incoming = app.querySelector('.booking-panel'); incoming.classList.add('entering'); requestAnimationFrame(() => requestAnimationFrame(() => incoming.classList.remove('entering'))); moving = false; }, 220);
  }
  app.addEventListener('change', event => {
    const { name, value } = event.target;
    if (name === 'service') state.service = value;
    if (name === 'date') { state.date = value; state.time = ''; }
    if (name === 'time') state.time = value;
    const next = app.querySelector('[data-action="next"]'); if (next) next.disabled = false;
    const recap = app.querySelector('.booking-summary p'); if (recap) recap.textContent = [state.service, chosenDate() ? dateFormat.format(chosenDate()) : '', state.time].filter(Boolean).join(' · ') || 'À compléter';
  });
  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.dataset.jump !== undefined) { move(Number(button.dataset.jump)); return; }
    const action = button?.dataset.action;
    if (!action) return;
    if (action === 'next') move(state.step + 1);
    if (action === 'back') move(state.step - 1);
    if (action === 'restart') { Object.assign(state, { service: '', date: '', time: '', name: '', phone: '' }); move(0); }
    if (action === 'finish') {
      state.name = app.querySelector('#prenom').value.trim(); state.phone = app.querySelector('#telephone').value.trim();
      if (!state.name || !/^(?:(?:\+|00)33|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(state.phone)) { app.querySelector('#form-error').textContent = 'Indiquez votre prénom et un numéro de téléphone français valide.'; return; }
      move(4);
    }
  });
  draw();
})();
