(() => {
  const panels = [...document.querySelectorAll('.panel')];
  function openPanel(panel) {
    panels.forEach(item => {
      const open = item === panel;
      item.classList.toggle('is-open', open);
      item.querySelector('.panel-toggle').setAttribute('aria-expanded', String(open));
      item.querySelector('.panel-grid').inert = !open;
    });
  }
  panels.forEach(panel => panel.querySelector('.panel-toggle').addEventListener('click', () => openPanel(panel)));
  document.querySelectorAll('[data-open]').forEach(link => link.addEventListener('click', () => openPanel(document.getElementById(link.dataset.open))));
  document.documentElement.classList.add('js');
  openPanel(panels[0]);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .2 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); }

  const services = [
    { name: 'Coupe Homme', minutes: 30 },
    { name: 'Coupe Homme cheveux longs', minutes: 40 },
    { name: 'Coupe Homme + Barbe', minutes: 30 },
    { name: 'Barbe Courte', minutes: 30 },
    { name: 'Barbe longue', minutes: 30 }
  ];
  const state = { step: 0, service: null, date: null, time: null, first: '', phone: '' };
  const content = document.getElementById('booking-content');
  const summary = document.getElementById('summary');
  const count = document.getElementById('step-count');
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const pad = n => String(n).padStart(2, '0');
  const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  function days() { const now = new Date(); return Array.from({length: 14}, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12)); }
  function prettyDate(key) { const [y,m,d] = key.split('-').map(Number); return dayFormat.format(new Date(y,m-1,d,12)); }
  function escapeText(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
  function updateSummary() {
    const rows = [];
    if (state.service !== null) rows.push(`<button type="button" data-go="0"><strong>Prestation</strong>${services[state.service].name}</button>`);
    if (state.date) rows.push(`<button type="button" data-go="1"><strong>Jour</strong>${prettyDate(state.date)}</button>`);
    if (state.time) rows.push(`<button type="button" data-go="2"><strong>Heure</strong>${state.time.replace(':', ' h ')}</button>`);
    summary.innerHTML = rows.join('') || 'Prestation, jour et heure à choisir.';
  }
  function render(focus = true) {
    count.textContent = state.step === 4 ? 'TERMINÉ' : `${pad(state.step + 1)} / 04`;
    updateSummary();
    let html = '';
    if (state.step === 0) {
      html = `<h3 tabindex="-1">Choisir une prestation</h3><p>Les prestations sont issues de la carte publiée. Les tarifs sont à consulter auprès du salon.</p><fieldset><legend>Prestation</legend><div class="choices">${services.map((s,i) => `<label class="choice"><input type="radio" name="service" value="${i}" ${state.service === i ? 'checked' : ''}>${s.name}</label>`).join('')}</div></fieldset><p class="error" id="error" role="alert"></p><div class="booking-actions"><button class="next" data-action="next">Choisir un jour →</button></div>`;
    } else if (state.step === 1) {
      html = `<h3 tabindex="-1">Choisir un jour</h3><p>Exemple sur les 14 prochains jours. Les dimanches sont fermés.</p><fieldset><legend>Jour</legend><div class="choices">${days().map(d => { const key = dateKey(d), closed = d.getDay() === 0; return `<label class="choice"><input type="radio" name="date" value="${key}" ${state.date === key ? 'checked' : ''} ${closed ? 'disabled' : ''}>${dayFormat.format(d)}${closed ? '<small>Fermé</small>' : ''}</label>`; }).join('')}</div></fieldset><p class="error" id="error" role="alert"></p><div class="booking-actions"><button class="back" data-action="back">← Prestation</button><button class="next" data-action="next">Choisir une heure →</button></div>`;
    } else if (state.step === 2) {
      const now = new Date(); const slots = []; let available = 0;
      for (let minute = 9 * 60; minute + services[state.service].minutes <= 19 * 60; minute += 30) {
        const value = `${pad(Math.floor(minute/60))}:${pad(minute%60)}`;
        const past = state.date === dateKey(now) && minute <= now.getHours()*60 + now.getMinutes();
        const taken = (minute / 30 + Number(state.date.slice(-2))) % 4 === 0;
        if (!past && !taken) available++;
        slots.push(`<label class="choice"><input type="radio" name="time" value="${value}" ${state.time === value ? 'checked' : ''} ${past || taken ? 'disabled' : ''}>${value.replace(':',' h ')}${past ? '<small>Passé</small>' : taken ? '<small>Indisponible dans cet exemple</small>' : ''}</label>`);
      }
      html = `<h3 tabindex="-1">Choisir une heure</h3><p>Créneaux fictifs pour le ${prettyDate(state.date)}. Ils ne représentent pas les disponibilités du salon.</p>${available === 0 ? '<p>Aucun créneau disponible dans cet exemple. Revenez au choix du jour.</p>' : ''}<fieldset><legend>Heure</legend><div class="choices">${slots.join('')}</div></fieldset><p class="error" id="error" role="alert"></p><div class="booking-actions"><button class="back" data-action="back">← Jour</button><button class="next" data-action="next">Vos coordonnées →</button></div>`;
    } else if (state.step === 3) {
      html = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour cet essai, rien ne sera envoyé.</p><div class="field"><label for="first">Prénom</label><input id="first" type="text" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="first-error"><p class="error" id="first-error" role="alert"></p></div><div class="field"><label for="phone">Téléphone</label><input id="phone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><p class="error" id="phone-error" role="alert"></p></div><div class="booking-actions"><button class="back" data-action="back">← Heure</button><button class="next" data-action="confirm">Terminer la simulation →</button></div>`;
    } else {
      html = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escapeText(state.first)}, vous avez choisi ${services[state.service].name}, le ${prettyDate(state.date)} à ${state.time.replace(':',' h ')}.</p><p><strong>Aucun rendez-vous n’a été transmis.</strong> Pour réserver réellement, utilisez <a href="https://www.planity.com/my-barber-76000-rouen-3f2">Planity</a> ou appelez le <a href="tel:+33988071857">09 88 07 18 57</a>.</p><div class="booking-actions"><button class="next" data-action="restart">Recommencer</button></div>`;
    }
    content.innerHTML = `<div class="step-enter">${html}</div>`;
    if (focus) content.querySelector('h3').focus({preventScroll:true});
  }
  content.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const action = button.dataset.action;
    if (action === 'back') { if (state.step === 3) { state.first = document.getElementById('first').value; state.phone = document.getElementById('phone').value; } state.step--; render(); return; }
    if (action === 'restart') { Object.assign(state, {step:0, service:null, date:null, time:null, first:'', phone:''}); render(); return; }
    if (action === 'confirm') {
      state.first = document.getElementById('first').value.trim(); state.phone = document.getElementById('phone').value.trim();
      const validName = state.first.length > 0; const validPhone = /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(state.phone);
      document.getElementById('first-error').textContent = validName ? '' : 'Indiquez votre prénom.';
      document.getElementById('phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!validName || !validPhone) { document.getElementById(validName ? 'phone' : 'first').focus(); return; }
      state.step = 4; render(); return;
    }
    const name = ['service','date','time'][state.step]; const selected = content.querySelector(`input[name="${name}"]:checked`);
    if (!selected) { document.getElementById('error').textContent = 'Choisissez une option pour continuer.'; return; }
    if (name === 'service') { const value = Number(selected.value); if (state.service !== value) { state.date = null; state.time = null; } state.service = value; }
    if (name === 'date') { if (state.date !== selected.value) state.time = null; state.date = selected.value; }
    if (name === 'time') state.time = selected.value;
    state.step++; render();
  });
  summary.addEventListener('click', event => { const button = event.target.closest('[data-go]'); if (button) { if (state.step === 3) { state.first = document.getElementById('first').value; state.phone = document.getElementById('phone').value; } state.step = Number(button.dataset.go); render(); } });
  render(false);
})();
