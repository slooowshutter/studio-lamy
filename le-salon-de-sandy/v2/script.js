(() => {
  const filters = document.querySelectorAll('.filter');
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const state = { service: '', date: null, heure: '', prenom: '', telephone: '' };
  const step = document.getElementById('etape');
  const recap = document.getElementById('recap');
  const nav = [...document.querySelectorAll('[data-go]')];
  let current = 0, reached = 0, timer, clavier = false;
  document.addEventListener('keydown', () => { clavier = true; });
  document.addEventListener('pointerdown', () => { clavier = false; });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const escapeText = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateRecap() {
    recap.textContent = [state.service, state.date && dateFormat.format(state.date), state.heure, state.prenom].filter(Boolean).join(' · ') || 'Rien de choisi pour le moment.';
    nav.forEach((b, i) => { b.disabled = i > reached; b.setAttribute('aria-current', i === current ? 'step' : 'false'); });
  }
  function go(index) {
    current = index; reached = Math.max(reached, index); updateRecap();
    clearTimeout(timer);
    const immediate = clavier || matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (immediate) { step.classList.remove('changing'); render(); step.querySelector('h3')?.focus(); return; }
    step.classList.add('changing');
    timer = setTimeout(() => { render(); step.classList.remove('changing'); step.querySelector('h3')?.focus(); }, 180);
  }
  function render() {
    if (current === 0) {
      step.innerHTML = `<h3 tabindex="-1">Choisissez une prestation</h3><p>Une seule prestation est proposée dans cette simulation.</p><div class="choices"><label class="choice"><input type="radio" name="prestation" value="Coupe sur cheveux secs" ${state.service ? 'checked' : ''}> Coupe sur cheveux secs</label></div><button class="primary" id="suite" type="button" ${state.service ? '' : 'disabled'}>Choisir un jour →</button>`;
      step.querySelector('input').addEventListener('change', () => { state.service = 'Coupe sur cheveux secs'; step.querySelector('#suite').disabled = false; updateRecap(); });
      step.querySelector('#suite').addEventListener('click', () => go(1));
    } else if (current === 1) {
      step.innerHTML = '<h3 tabindex="-1">Choisissez un jour</h3><p>Jours proposés à titre d’exemple, sous réserve des horaires du salon.</p><div class="date-grid"></div><button class="primary" id="suite" type="button" disabled>Choisir une heure →</button>';
      const grid = step.querySelector('.date-grid');
      for (let i = 0; i < 14; i++) {
        const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() + i);
        const button = document.createElement('button'); button.type = 'button';
        const fin = new Date(date); fin.setHours(14,0,0,0);
        const unavailable = date.getDay() === 0 || date.getDay() === 1 || fin <= new Date();
        button.disabled = unavailable; button.textContent = shortFormat.format(date) + (unavailable ? ' · non proposé' : '');
        if (state.date && date.toDateString() === state.date.toDateString()) { button.classList.add('selected'); step.querySelector('#suite').disabled = false; }
        button.addEventListener('click', () => { state.date = date; state.heure = ''; reached = 1; grid.querySelectorAll('button').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); step.querySelector('#suite').disabled = false; updateRecap(); });
        grid.append(button);
      }
      step.querySelector('#suite').addEventListener('click', () => go(2));
    } else if (current === 2) {
      step.innerHTML = '<h3 tabindex="-1">Choisissez une heure</h3><p>Heures d’exemple, sans lien avec les disponibilités réelles.</p><div class="time-grid"></div><button class="primary" id="suite" type="button" disabled>Vos coordonnées →</button>';
      const grid = step.querySelector('.time-grid');
      ['11:00','14:00'].forEach(time => {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = time.replace(':',' h ');
        const slot = new Date(state.date); const [h,m] = time.split(':').map(Number); slot.setHours(h,m,0,0); button.disabled = slot <= new Date();
        if (state.heure === time && !button.disabled) { button.classList.add('selected'); step.querySelector('#suite').disabled = false; }
        button.addEventListener('click', () => { state.heure = time; reached = 2; grid.querySelectorAll('button').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); step.querySelector('#suite').disabled = false; updateRecap(); }); grid.append(button);
      });
      step.querySelector('#suite').addEventListener('click', () => go(3));
    } else if (current === 3) {
      step.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Ces informations restent dans cette page et ne sont pas envoyées.</p><form novalidate><label class="form-field">Prénom<input name="prenom" autocomplete="given-name" required value="${escapeText(state.prenom)}" aria-describedby="erreur-prenom"></label><p class="error" id="erreur-prenom"></p><label class="form-field">Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required value="${escapeText(state.telephone)}" aria-describedby="erreur-telephone"></label><p class="error" id="erreur-telephone"></p><button class="primary" type="submit">Terminer la simulation →</button></form>`;
      step.querySelector('form').addEventListener('submit', e => { e.preventDefault(); if (!state.service || !state.date || !state.heure) { reached = state.date ? 2 : state.service ? 1 : 0; go(reached); return; } const f = e.currentTarget; state.prenom = f.prenom.value.trim(); state.telephone = f.telephone.value.trim(); const validName = state.prenom.length > 0; const validPhone = /^(?:(?:\+33|0033)\s*\(?0?\)?|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(state.telephone); step.querySelector('#erreur-prenom').textContent = validName ? '' : 'Indiquez votre prénom.'; step.querySelector('#erreur-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.'; f.prenom.setAttribute('aria-invalid', String(!validName)); f.telephone.setAttribute('aria-invalid', String(!validPhone)); if (validName && validPhone) go(4); else (validName ? f.telephone : f.prenom).focus(); });
    } else {
      step.innerHTML = '<h3 tabindex="-1">Simulation terminée.</h3><p>Aucun rendez-vous n’a été pris et aucune information n’a été envoyée. Pour réserver, utilisez Planity ou appelez le salon.</p><p><a href="https://www.planity.com/le-salon-de-sandy-75008-paris">Réserver sur Planity ↗</a></p><p><a href="tel:+33142654234">Appeler le salon ↗</a></p><button class="primary" id="recommencer" type="button">Recommencer</button>';
      step.querySelector('#recommencer').addEventListener('click', () => { Object.assign(state, {service:'', date:null, heure:'', prenom:'', telephone:''}); reached=0; go(0); });
    }
  }
  nav.forEach(button => button.addEventListener('click', () => { const target = Number(button.dataset.go); if (target <= reached) go(target); }));
  render(); updateRecap(); window.sitePret = true;
})();
