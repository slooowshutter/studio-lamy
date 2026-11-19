(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const content = document.querySelector('#step-content');
  const summary = document.querySelector('#summary');
  const nav = [...document.querySelectorAll('[data-goto]')];
  const state = { step: 0, max: 0, service: '', date: '', time: '', name: '', phone: '' };
  const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const full = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  function dateFromKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
  function keyFor(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
  function escapeText(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function updateSummary() {
    const parts = [state.service, state.date ? full.format(dateFromKey(state.date)) : '', state.time];
    summary.textContent = parts.filter(Boolean).join(' · ') || 'Aucune sélection pour le moment.';
  }
  function render(focus = true) {
    nav.forEach((button, i) => { button.disabled = i > state.max; if (i === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Prestations mentionnées publiquement. Tarifs à confirmer avec le salon.</p><div class="choice-list"><label class="choice"><input type="radio" name="prestation" value="Coupe femme" ${state.service === 'Coupe femme' ? 'checked' : ''}> Coupe femme</label><label class="choice"><input type="radio" name="prestation" value="Coloration" ${state.service === 'Coloration' ? 'checked' : ''}> Coloration</label></div><div class="controls"><button type="button" data-next>Choisir le jour →</button></div><p class="error" id="error"></p>`;
    } else if (state.step === 1) {
      let days = '';
      for (let i = 0; i < 14; i++) { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+i); const key = keyFor(d); const closed = d.getDay() === 0 || d.getDay() === 1; const last = new Date(d); last.setHours(d.getDay() === 6 ? 17 : 18, 0, 0, 0); const finished = !closed && last <= new Date(); days += `<button type="button" data-date="${key}" class="${state.date === key ? 'selected' : ''}" ${closed || finished ? 'disabled' : ''}>${fmt.format(d)}${closed ? '<br>Fermé' : finished ? '<br>Terminé' : ''}</button>`; }
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours présentés selon les horaires publiés, à confirmer. Simulation uniquement.</p><div class="days">${days}</div><div class="controls"><button class="back" type="button" data-back>Retour</button><button type="button" data-next>Choisir l’heure →</button></div><p class="error" id="error"></p>`;
    } else if (state.step === 2) {
      const d = dateFromKey(state.date); const close = d.getDay() === 6 ? 18 : 19; let times = '';
      for (let hour = 9; hour < close; hour++) { const slot = new Date(d); slot.setHours(hour,0,0,0); const past = slot <= new Date(); const label = `${String(hour).padStart(2,'0')} h 00`; times += `<button type="button" data-time="${label}" class="${state.time === label ? 'selected' : ''}" ${past ? 'disabled' : ''}>${label}${past ? '<br>Passé' : ''}</button>`; }
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs, sans indication de disponibilité réelle ni de durée.</p><div class="times">${times}</div><div class="controls"><button class="back" type="button" data-back>Retour</button><button type="button" data-next>Vos coordonnées →</button></div><p class="error" id="error"></p>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="booking-form" novalidate><label class="form-field">Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="name-error"><span class="error" id="name-error"></span></label><label class="form-field">Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></label><div class="controls"><button class="back" type="button" data-back>Retour</button><button type="submit">Terminer la simulation →</button></div></form>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée</h3><p>Merci ${escapeText(state.name)}. Aucun rendez-vous n’a été envoyé ni réservé.</p><p>Pour prendre rendez-vous, appelez Coiffure Demet au <a href="tel:+33388305585">03 88 30 55 85</a>.</p><div class="controls"><button type="button" data-reset>Recommencer</button></div>`;
    }
    content.innerHTML = html; content.classList.remove('step-enter'); void content.offsetWidth; content.classList.add('step-enter'); updateSummary(); if (focus) content.querySelector('h3').focus();
  }
  function go(step) { state.step = step; state.max = Math.max(state.max, step); render(); }
  nav.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.goto))));
  content.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.date) { if (state.date !== button.dataset.date) { state.time = ''; state.max = 1; } state.date = button.dataset.date; render(false); content.querySelector('[data-date="' + state.date + '"]').focus(); }
    else if (button.dataset.time) { if (state.time !== button.dataset.time) state.max = 2; state.time = button.dataset.time; render(false); content.querySelector('[data-time="' + state.time + '"]').focus(); }
    else if (button.hasAttribute('data-back')) go(state.step - 1);
    else if (button.hasAttribute('data-reset')) { Object.assign(state, { step:0, max:0, service:'', date:'', time:'', name:'', phone:'' }); render(); }
    else if (button.hasAttribute('data-next')) {
      if (state.step === 0) { const selected = content.querySelector('input[name="prestation"]:checked'); if (!selected) { content.querySelector('#error').textContent = 'Choisissez une prestation.'; return; } state.service = selected.value; }
      if (state.step === 1 && !state.date) { content.querySelector('#error').textContent = 'Choisissez un jour.'; return; }
      if (state.step === 2 && !state.time) { content.querySelector('#error').textContent = 'Choisissez une heure.'; return; }
      go(state.step + 1);
    }
  });
  content.addEventListener('change', event => {
    if (event.target.name === 'prestation' && event.target.value !== state.service) { state.service = event.target.value; state.date = ''; state.time = ''; state.max = 0; updateSummary(); nav.forEach((button, i) => { button.disabled = i > state.max; }); }
  });
  content.addEventListener('submit', event => {
    event.preventDefault(); const form = event.target; state.name = form.prenom.value.trim(); state.phone = form.telephone.value.trim();
    const digits = state.phone.replace(/[\s.()-]/g, ''); const validPhone = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits);
    form.querySelector('#name-error').textContent = state.name ? '' : 'Indiquez votre prénom.';
    form.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (!state.name) { form.prenom.focus(); return; } if (!validPhone) { form.telephone.focus(); return; } go(4);
  });
  render(false);
})();
