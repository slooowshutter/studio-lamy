(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));
  const path = document.querySelector('.path-line');
  const progress = document.querySelector('.path-progress');
  let ticking = false;
  function updatePath() {
    const rect = path.getBoundingClientRect();
    const amount = Math.min(1, Math.max(0, (window.innerHeight * .65 - rect.top) / rect.height));
    progress.style.transform = `scaleY(${amount})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking && !reduced.matches) { requestAnimationFrame(updatePath); ticking = true; } }, { passive: true });
  updatePath();

  const services = ['Coloration', 'Balayage highlight', 'Coloration gloss', 'Coupe', 'Brushing'];
  const state = { step: 0, service: '', day: '', time: '', name: '', phone: '' };
  const container = document.getElementById('step-content');
  const number = document.getElementById('step-number');
  const summaries = ['service', 'day', 'time'].map(k => document.querySelector(`#summary-${k} span`));
  const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const noSlotsToday = d => { const now = new Date(); return dateKey(d) === dateKey(now) && now.getHours() >= 17; };
  const choices = (name, values, selected) => values.map(v => `<label class="choice"><input type="radio" name="${name}" value="${v.value}" ${v.value === selected ? 'checked' : ''} ${v.disabled ? 'disabled' : ''}><span>${v.label}${v.reason || ''}</span></label>`).join('');
  function render(focus = true) {
    number.textContent = String(Math.min(state.step + 1, 5)).padStart(2, '0');
    summaries[0].textContent = state.service || 'À choisir';
    summaries[1].textContent = state.day ? formatDate(dates.find(d => dateKey(d) === state.day)) : 'À choisir';
    summaries[2].textContent = state.time || 'À choisir';
    document.querySelector('[data-goto="1"]').disabled = !state.service;
    document.querySelector('[data-goto="2"]').disabled = !state.day;
    document.querySelector('[data-goto="3"]').disabled = !state.time;
    document.querySelector('#summary-details span').textContent = state.name ? 'À modifier' : 'À compléter';
    let content = '';
    if (state.step === 0) content = `<h3 tabindex="-1">Choisir une prestation</h3><p class="fine">Tarifs et détails à confirmer auprès du salon.</p><fieldset><legend>Votre envie</legend>${choices('service', services.map(s => ({value:s,label:s})), state.service)}</fieldset><div class="booking-actions"><button class="primary" data-next ${state.service ? '' : 'disabled'}>Choisir un jour →</button></div>`;
    if (state.step === 1) content = `<h3 tabindex="-1">Choisir un jour</h3><p class="fine">Horaires Treatwell à confirmer. Les jours fermés ne sont pas proposés.</p><fieldset><legend>Dans les prochains jours</legend>${choices('day', dates.map(d => ({ value:dateKey(d), label:formatDate(d), disabled:d.getDay() === 0 || d.getDay() === 1 || noSlotsToday(d), reason: d.getDay() === 0 || d.getDay() === 1 ? ' · fermé' : noSlotsToday(d) ? ' · aucun créneau fictif restant' : '' })), state.day)}</fieldset><div class="booking-actions"><button data-back>← Prestation</button><button class="primary" data-next ${state.day ? '' : 'disabled'}>Choisir une heure →</button></div>`;
    if (state.step === 2) {
      const now = new Date();
      const slots = [11,12,13,14,15,16,17].filter(h => state.day !== dateKey(now) || h > now.getHours() || (h === now.getHours() && now.getMinutes() === 0));
      content = `<h3 tabindex="-1">Choisir une heure</h3><p class="fine">Ces créneaux sont fictifs et ne reflètent pas les disponibilités du salon.</p><fieldset><legend>Heure souhaitée</legend>${slots.length ? choices('time', slots.map(h => ({value:`${h} h`,label:`${h} h`})), state.time) : '<p>Aucun créneau fictif restant pour ce jour. Choisissez un autre jour.</p>'}</fieldset><div class="booking-actions"><button data-back>← Jour</button><button class="primary" data-next ${state.time && slots.some(h => `${h} h` === state.time) ? '' : 'disabled'}>Vos coordonnées →</button></div>`;
    }
    if (state.step === 3) content = `<h3 tabindex="-1">Vos coordonnées</h3><p class="fine">Simulation uniquement&nbsp;: rien ne sera transmis.</p><form id="details" novalidate><label class="field" for="prenom">Prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="name-error"><div class="error" id="name-error"></div><label class="field" for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${escapeText(state.phone)}" aria-describedby="phone-error"><div class="error" id="phone-error"></div><div class="booking-actions"><button type="button" data-back>← Heure</button><button class="primary" type="submit">Voir le récapitulatif →</button></div></form>`;
    if (state.step === 4) content = `<h3 tabindex="-1">Votre récapitulatif</h3><p>${escapeText(state.name)}, vous avez choisi ${escapeText(state.service)}, le ${formatDate(dates.find(d => dateKey(d) === state.day))} à ${escapeText(state.time)}.</p><p class="fine">Cette simulation ne réserve pas de créneau.</p><div class="booking-actions"><button data-back>← Coordonnées</button><button class="primary" data-next>Terminer la simulation</button></div>`;
    if (state.step === 5) content = `<h3 tabindex="-1">Simulation terminée.</h3><p>Votre choix&nbsp;: ${escapeText(state.service)}, le ${formatDate(dates.find(d => dateKey(d) === state.day))} à ${escapeText(state.time)}.</p><p><strong>Rien n’a été envoyé au salon.</strong> Pour prendre rendez-vous, appelez le <a href="tel:+33148241853">01 48 24 18 53</a> ou consultez <a href="https://omyhair.mytreatwell.fr/">Treatwell</a>.</p><div class="booking-actions"><button data-reset>Recommencer</button></div>`;
    container.innerHTML = `<div class="step-enter">${content}</div>`;
    if (focus) container.querySelector('h3').focus({preventScroll:true});
  }
  function escapeText(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  container.addEventListener('change', e => {
    if (e.target.name === 'service') { state.service = e.target.value; }
    if (e.target.name === 'day') { state.day = e.target.value; state.time = ''; }
    if (e.target.name === 'time') state.time = e.target.value;
    const next = container.querySelector('[data-next]'); if (next) next.disabled = false;
    summaries[0].textContent = state.service || 'À choisir';
    summaries[1].textContent = state.day ? formatDate(dates.find(d => dateKey(d) === state.day)) : 'À choisir';
    summaries[2].textContent = state.time || 'À choisir';
  });
  container.addEventListener('click', e => {
    if (e.target.closest('[data-back]')) { state.step--; render(); }
    if (e.target.closest('[data-next]')) { state.step++; render(); }
    if (e.target.closest('[data-reset]')) { Object.assign(state,{step:0,service:'',day:'',time:'',name:'',phone:''}); render(); }
  });
  container.addEventListener('submit', e => {
    e.preventDefault();
    state.name = container.querySelector('#prenom').value.trim(); state.phone = container.querySelector('#telephone').value.trim();
    const validName = state.name.length > 0; const validPhone = /^(?:(?:\+33|0033)\s*|0)[1-9](?:[\s.\-]*\d){8}$/.test(state.phone);
    container.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom.';
    container.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (validName && validPhone) { state.step = 4; render(); } else container.querySelector(validName ? '#telephone' : '#prenom').focus();
  });
  document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.goto); render(); }));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service = link.dataset.service; state.step = 0; render(false); }));
  render(false);
})();
