(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const reveals = document.querySelectorAll('.reveal');
  const animateDuration = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const figures = document.querySelectorAll('[data-count]');
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / 600, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      figures.forEach(figure => { const number = Math.round(Number(figure.dataset.count) * eased); figure.textContent = figure.dataset.count === '30' ? String(number).padStart(2, '0') : String(number); });
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); if (entry.target.classList.contains('signature')) animateDuration(); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    reveals.forEach(element => observer.observe(element));
  } else reveals.forEach(element => element.classList.add('visible'));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.remove('active'); item.setAttribute('aria-pressed', 'false'); });
    button.classList.add('active'); button.setAttribute('aria-pressed', 'true');
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary');
  const counter = document.querySelector('#step-count');
  const state = { step: 0, date: null, time: '', firstName: '', phone: '' };
  const dates = Array.from({length: 14}, (_, index) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + index); return d; });
  const lastStart = date => (date.getDay() === 6 ? 18 * 60 : 19 * 60) - 210;
  const hasTime = date => { const last = new Date(date); const minutes = lastStart(date); last.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); return last > new Date(); };
  let keyboardNavigation = false;
  document.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') keyboardNavigation = true; });
  document.addEventListener('pointerdown', () => { keyboardNavigation = false; });
  const dayLabel = date => new Intl.DateTimeFormat('fr-FR', {weekday:'short', day:'numeric', month:'short'}).format(date);
  const fullDate = date => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'}).format(date);
  const escape = value => value.replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  function show(step, focus = true) {
    state.step = step;
    counter.textContent = step < 4 ? `0${step + 1} / 04` : 'TERMINÉ';
    summary.textContent = ['Lissage Enzymotherapy · 3 h 30', state.date ? fullDate(state.date) : '', state.time].filter(Boolean).join(' · ');
    let markup = '';
    if (step === 0) markup = `<h3 tabindex="-1">La prestation</h3><p>Une prestation à explorer dans cette simulation.</p><label class="choice"><input type="radio" name="service" checked><span>Lissage Enzymotherapy · 3 h 30 · sur devis</span></label><div class="booking-actions"><button type="button" data-next>Choisir un jour →</button></div>`;
    if (step === 1) markup = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés selon les horaires publiés. Disponibilités réelles à vérifier.</p><div class="choices">${dates.map((date, index) => {const closed = date.getDay() === 0 || date.getDay() === 1; const unavailable = !closed && !hasTime(date); return `<label class="choice"><input type="radio" name="jour" value="${index}" ${closed || unavailable ? 'disabled' : ''} ${state.date && date.getTime() === state.date.getTime() ? 'checked' : ''}><span>${dayLabel(date)}${closed ? ' · fermé' : unavailable ? ' · passé' : ''}</span></label>`;}).join('')}</div><div class="booking-actions"><button type="button" class="back" data-back>← Prestation</button><button type="button" data-next ${state.date ? '' : 'disabled'}>Choisir une heure →</button></div>`;
    if (step === 2) {
      const end = state.date.getDay() === 6 ? 18 * 60 : 19 * 60;
      const now = new Date();
      let slots = '';
      if (state.time) { const parts = state.time.match(/(\d+) h (\d+)/); const selected = new Date(state.date); selected.setHours(Number(parts[1]), Number(parts[2]), 0, 0); if (selected <= now) state.time = ''; }
      for (let minute = 9 * 60; minute + 210 <= end; minute += 30) {
        const hour = Math.floor(minute / 60), minutes = minute % 60;
        const slot = `${hour} h ${String(minutes).padStart(2,'0')}`;
        const slotDate = new Date(state.date); slotDate.setHours(hour, minutes);
        const past = slotDate <= now;
        slots += `<label class="choice"><input type="radio" name="heure" value="${slot}" ${past ? 'disabled' : ''} ${slot === state.time && !past ? 'checked' : ''}><span>${slot}${past ? ' · passé' : ''}</span></label>`;
      }
      markup = `<h3 tabindex="-1">Choisir une heure</h3><p>Exemples pour ${fullDate(state.date)}. Ces heures ne sont pas des disponibilités réelles.</p><div class="choices">${slots}</div><div class="booking-actions"><button type="button" class="back" data-back>← Jour</button><button type="button" data-next ${state.time ? '' : 'disabled'}>Vos coordonnées →</button></div>`;
    }
    if (step === 3) markup = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour compléter l’aperçu uniquement. Rien ne sera envoyé.</p><form id="details" novalidate><div class="field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" value="${escape(state.firstName)}" aria-describedby="prenom-error"><span class="error" id="prenom-error"></span></div><div class="field"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escape(state.phone)}" aria-describedby="telephone-error"><span class="error" id="telephone-error"></span></div><div class="booking-actions"><button type="button" class="back" data-back>← Heure</button><button type="submit">Terminer la simulation →</button></div></form>`;
    if (step === 4) markup = `<h3 tabindex="-1">Simulation terminée.</h3><p>${escape(state.firstName)}, votre choix est affiché ci-dessus. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.</p><p>Pour réserver réellement, utilisez Planity ou appelez le salon.</p><a class="text-link" href="https://www.planity.com/imagin-coiffure-69006-lyon" target="_blank" rel="noopener">Aller sur Planity ↗</a><div class="booking-actions"><button type="button" data-restart>Recommencer</button></div>`;
    content.innerHTML = `<div class="booking-step${keyboardNavigation ? ' no-motion' : ''}">${markup}</div>`;
    if (focus) content.querySelector('h3').focus({preventScroll:true});
    content.querySelector('[data-back]')?.addEventListener('click', () => show(step - 1));
    content.querySelector('[data-next]')?.addEventListener('click', () => show(step + 1));
    content.querySelector('[data-restart]')?.addEventListener('click', () => {state.date = null; state.time = ''; state.firstName = ''; state.phone = ''; show(0);});
    content.querySelectorAll('input[name="jour"]').forEach(input => input.addEventListener('change', () => {state.date = dates[Number(input.value)]; state.time = ''; content.querySelector('[data-next]').disabled = false; summary.textContent = `Lissage Enzymotherapy · 3 h 30 · ${fullDate(state.date)}`;}));
    content.querySelectorAll('input[name="heure"]').forEach(input => input.addEventListener('change', () => {state.time = input.value; content.querySelector('[data-next]').disabled = false; summary.textContent = `Lissage Enzymotherapy · 3 h 30 · ${fullDate(state.date)} · ${state.time}`;}));
    content.querySelector('#prenom')?.addEventListener('input', event => { state.firstName = event.target.value; });
    content.querySelector('#telephone')?.addEventListener('input', event => { state.phone = event.target.value; });
    content.querySelector('#details')?.addEventListener('submit', event => {
      event.preventDefault();
      state.firstName = content.querySelector('#prenom').value.trim(); state.phone = content.querySelector('#telephone').value.trim();
      const validName = state.firstName.length > 0; const validPhone = /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(state.phone);
      content.querySelector('#prenom-error').textContent = validName ? '' : 'Indiquez votre prénom.';
      content.querySelector('#telephone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!validName) content.querySelector('#prenom').focus(); else if (!validPhone) content.querySelector('#telephone').focus(); else show(4);
    });
  }
  show(0, false);
})();
