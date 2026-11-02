(() => {
  document.documentElement.classList.add('js');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); const number = entry.target.querySelector('[data-count]'); if (number && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const start = performance.now(); const tick = now => { const progress = Math.min((now - start) / 500, 1); number.textContent = Math.round(Number(number.dataset.count) * (1 - Math.pow(1 - progress, 3))); if (progress < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); } observer.unobserve(entry.target); } }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 60}ms`; if (observer) observer.observe(el); else el.classList.add('visible'); });
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll('.service-list > div').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const content = document.querySelector('#booking-content');
  const summary = document.querySelector('#summary-text');
  const progress = [...document.querySelectorAll('[data-go]')];
  const state = { step: 0, max: 0, service: '', day: '', time: '' };
  const services = ['Coupe homme', 'Taille et soin de la barbe', 'Rasage traditionnel', 'Coupe enfant'];
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const format = d => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  function render(focus = true) {
    progress.forEach((button, i) => { button.disabled = i > state.max; if (i === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    summary.textContent = [state.service, state.day && format(days.find(d => dayKey(d) === state.day)), state.time].filter(Boolean).join(' · ') || 'À compléter';
    let body = '';
    if (state.step === 0) body = `<h3 tabindex="-1">Choisir une prestation</h3><p>Tarifs et durées à confirmer auprès du salon.</p><div class="choices">${services.map((s, i) => `<label><input type="radio" name="prestation" value="${i}" ${state.service === s ? 'checked' : ''}> ${s}</label>`).join('')}</div><button class="next" type="button" ${state.service ? '' : 'disabled'}>Continuer →</button>`;
    if (state.step === 1) body = `<h3 tabindex="-1">Choisir un jour</h3><p>Exemples sur les deux prochaines semaines. Le dimanche est fermé.</p><div class="days">${days.map(d => `<button type="button" data-day="${dayKey(d)}" class="${state.day === dayKey(d) ? 'selected' : ''}" ${d.getDay() === 0 ? 'disabled' : ''}>${format(d)}${d.getDay() === 0 ? '<br>Fermé' : ''}</button>`).join('')}</div><button class="next" type="button" ${state.day ? '' : 'disabled'}>Continuer →</button>`;
    if (state.step === 2) {
      const chosen = days.find(d => dayKey(d) === state.day);
      const times = ['10 h', '14 h', '17 h'].filter(t => { const date = new Date(chosen); date.setHours(parseInt(t, 10), 0, 0, 0); return date > new Date(); });
      body = `<h3 tabindex="-1">Choisir une heure</h3><p>Heures données en exemple, sans disponibilité vérifiée.</p><div class="slots">${times.length ? times.map(t => `<button type="button" data-time="${t}" class="${state.time === t ? 'selected' : ''}">${t}</button>`).join('') : 'Aucun exemple restant ce jour. Choisissez un autre jour.'}</div><button class="next" type="button" ${state.time ? '' : 'disabled'}>Continuer →</button>`;
    }
    if (state.step === 3) body = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour essayer la dernière étape. Ces informations restent dans votre navigateur et ne sont pas envoyées.</p><form id="simulation-form" novalidate><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" required><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="form-error" required><p id="form-error" role="status"></p><button class="next" type="submit">Confirmer la simulation →</button></form>`;
    if (state.step === 4) body = `<h3 tabindex="-1">Simulation terminée</h3><p>${state.service}<br>${format(days.find(d => dayKey(d) === state.day))} à ${state.time}</p><p>Aucun rendez-vous n’a été pris et rien n’a été envoyé. Appelez le salon pour convenir d’un rendez-vous.</p><a class="button light" href="tel:0981485389">Appeler le salon ↗</a><br><button class="restart" type="button">Recommencer</button>`;
    content.innerHTML = `<div class="step${focus ? ' step-enter' : ''}">${body}</div>`;
    if (focus) content.querySelector('h3').focus();
  }
  content.addEventListener('submit', e => {
    if (e.target.id !== 'simulation-form') return;
    e.preventDefault();
    const name = e.target.elements.prenom.value.trim();
    const phone = e.target.elements.telephone.value.replace(/[\s.()-]/g, '');
    const error = e.target.querySelector('#form-error');
    if (!name || !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(phone)) {
      error.textContent = 'Indiquez votre prénom et un numéro de téléphone français valide.';
      (name ? e.target.elements.telephone : e.target.elements.prenom).focus();
      return;
    }
    state.step = 4; render();
  });
  content.addEventListener('change', e => { if (e.target.name === 'prestation') { const choice = e.target.value; state.service = services[Number(choice)]; render(false); content.querySelector(`input[value="${choice}"]`).focus(); } });
  content.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.day) { const choice = b.dataset.day; if (state.day !== choice) { state.day = choice; state.time = ''; state.max = Math.min(state.max, 1); } render(false); content.querySelector(`[data-day="${choice}"]`).focus(); }
    if (b.dataset.time) { const choice = b.dataset.time; state.time = choice; render(false); [...content.querySelectorAll('[data-time]')].find(item => item.dataset.time === choice).focus(); }
    if (b.classList.contains('next') && b.type === 'button' && !b.disabled) { state.step++; state.max = Math.max(state.max, state.step); render(); }
    if (b.classList.contains('restart')) { Object.assign(state, {step:0,max:0,service:'',day:'',time:''}); render(); }
  });
  progress.forEach(button => button.addEventListener('click', () => { state.step = Number(button.dataset.go); render(); }));
  render(false);
})();
