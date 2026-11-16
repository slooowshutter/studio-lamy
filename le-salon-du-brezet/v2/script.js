(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const targets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    targets.forEach(target => observer.observe(target));
  } else targets.forEach(target => target.classList.add('is-visible'));
  const progress = document.getElementById('progression');
  let ticking = false;
  function updateProgress() {
    const total = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleY(${total > 0 ? Math.min(1, Math.max(0, scrollY / total)) : 0})`;
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateProgress); ticking = true; } }, { passive: true });
  updateProgress();

  const panel = document.getElementById('panneau');
  const form = document.getElementById('simulation');
  const summary = document.getElementById('resume');
  const live = document.getElementById('annonce');
  const steps = [...document.querySelectorAll('[data-go]')];
  const state = { step: 0, service: '', day: null, time: '', first: '', phone: '', complete: false };
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const dateShort = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  const dates = Array.from({length: 14}, (_, i) => { const d = new Date(); d.setHours  (12, 0, 0, 0); d.setDate(d.getDate() + i); return d; });
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function recap() {
    const pieces = [];
    if (state.service) pieces.push(state.service + ' · 5 min');
    if (state.day) pieces.push(dateLabel(state.day));
    if (state.time) pieces.push(state.time);
    summary.textContent = pieces.length ? pieces.join('\n') : 'Votre sélection apparaîtra ici.';
  }
  function jourEpuise(date) {
    const fin = new Date(date);
    fin.setHours(date.getDay() === 6 ? 14 : 18, 30, 0, 0);
    return fin <= new Date();
  }
  function slotButtons() {
    const saturday = state.day.getDay() === 6;
    const start = saturday ? 9 * 60 + 30 : 10 * 60;
    const end = saturday ? 15 * 60 : 19 * 60;
    const now = new Date();
    let html = '';
    for (let mins = start; mins + 5 <= end; mins += 30) {
      const hour = Math.floor(mins / 60), minute = mins % 60;
      const slot = new Date(state.day); slot.setHours(hour, minute, 0, 0);
      const label = `${String(hour).padStart(2,'0')} h ${String(minute).padStart(2,'0')}`;
      const disabled = slot <= now;
      html += `<button type="button" data-time="${label}" ${disabled ? 'disabled' : ''}>${label}${disabled ? '<span class="sr-only"> passé</span>' : ''}</button>`;
    }
    return html;
  }
  function render(focus = true) {
    recap();
    steps.forEach((button, i) => { button.disabled = i > state.step && !(i === 1 && state.service) && !(i === 2 && state.day) && !(i === 3 && state.time); button.classList.toggle('actif', i === state.step && !state.complete); });
    if (state.complete) {
      panel.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeText(state.first)}. Votre choix&nbsp;: ${escapeText(state.service)}, le ${dateLabel(state.day)} à ${state.time}.</p><p><strong>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée.</strong></p><p>Pour réserver réellement, <a href="https://www.planity.com/le-salon-du-brezet-63100-clermont-ferrand">consultez Planity</a> ou <a href="tel:+33473925083">appelez le salon</a>.</p><button class="bouton" type="button" data-restart>Recommencer</button>`;
    } else if (state.step === 0) {
      panel.innerHTML = `<h3 tabindex="-1">Choisir une prestation</h3><p>La simulation présente le soin signature. Sa durée publiée est de cinq minutes.</p><div class="choix"><label><input type="radio" name="prestation" value="Soin homme" ${state.service ? 'checked' : ''}> <span>Soin homme · massage du cuir chevelu sur fauteuil massant · 5 min</span></label></div><p class="erreur" id="erreur-prestation" aria-live="polite"></p><button class="bouton" type="submit">Choisir un jour →</button>`;
    } else if (state.step === 1) {
      panel.innerHTML = `<h3 tabindex="-1">Choisir un jour</h3><p>Jours proposés selon les horaires publiés. Les disponibilités sont fictives.</p><div class="jours">${dates.map((d,i) => `<button type="button" data-day="${i}" ${d.getDay() === 0 || jourEpuise(d) ? 'disabled' : ''}>${dateShort(d)}<span>${d.getDay() === 0 ? 'Fermé' : jourEpuise(d) ? 'Journée passée' : 'Choisir'}</span></button>`).join('')}</div><button class="retour" type="button" data-go-back="0">← Prestation</button>`;
    } else if (state.step === 2) {
      panel.innerHTML = `<h3 tabindex="-1">Choisir une heure</h3><p>${dateLabel(state.day)} · Créneaux fictifs, sans lien avec les disponibilités du salon.</p><div class="creneaux">${slotButtons()}</div><button class="retour" type="button" data-go-back="1">← Jour</button>`;
    } else {
      panel.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans cette page et ne sont pas transmises.</p><div class="champs"><label>Prénom<input name="prenom" autocomplete="given-name" value="${escapeText(state.first)}" aria-describedby="erreur-prenom" required><span class="erreur" id="erreur-prenom"></span></label><label>Téléphone<input name="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="erreur-telephone" required><span class="erreur" id="erreur-telephone"></span></label></div><button class="retour" type="button" data-go-back="2">← Heure</button><button class="bouton" type="submit">Terminer la simulation →</button>`;
    }
    panel.classList.remove('changement'); void panel.offsetWidth; panel.classList.add('changement');
    if (focus) panel.querySelector('h3').focus({preventScroll:true});
    live.textContent = panel.querySelector('h3').textContent;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state.step === 0) {
      const selected = form.querySelector('input[name="prestation"]:checked');
      if (!selected) { document.getElementById('erreur-prestation').textContent = 'Choisissez une prestation pour continuer.'; return; }
      if (state.service !== selected.value) { state.day = null; state.time = ''; } state.service = selected.value; state.step = 1; render();
    } else if (state.step === 3) {
      const first = form.elements.prenom.value.trim(); const phone = form.elements.telephone.value.trim();
      const validFirst = first.length > 0; const validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(phone);
      form.elements.prenom.setAttribute('aria-invalid', String(!validFirst));
      form.elements.telephone.setAttribute('aria-invalid', String(!validPhone));
      document.getElementById('erreur-prenom').textContent = validFirst ? '' : 'Indiquez votre prénom.';
      document.getElementById('erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
      if (!validFirst || !validPhone) { form.elements[validFirst ? 'telephone' : 'prenom'].focus(); return; }
      state.first = first; state.phone = phone; state.complete = true; render();
    }
  });
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.matches('[aria-invalid]')) { input.removeAttribute('aria-invalid'); const message = document.getElementById(input.getAttribute('aria-describedby')); if (message) message.textContent = ''; }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    if (button.dataset.go !== undefined) { state.step = Number(button.dataset.go); state.complete = false; render(); }
    if (button.dataset.goBack !== undefined) { state.step = Number(button.dataset.goBack); render(); }
    if (button.dataset.day !== undefined) { state.day = dates[Number(button.dataset.day)]; state.time = ''; state.step = 2; render(); }
    if (button.dataset.time !== undefined) { state.time = button.dataset.time; state.step = 3; render(); }
    if (button.hasAttribute('data-restart')) { Object.assign(state, {step:0, service:'', day:null, time:'', first:'', phone:'', complete:false}); render(); }
  });
  render(false);
  window.sitePret = true;
})();
