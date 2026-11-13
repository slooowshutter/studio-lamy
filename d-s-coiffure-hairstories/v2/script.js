(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('is-visible'));
  const path = document.querySelector('.path');
  const line = document.querySelector('.path-line span');
  let ticking = false;
  function draw() {
    if (!reduced.matches) {
      const rect = path.getBoundingClientRect();
      const amount = Math.max(0, Math.min(1, (innerHeight * .65 - rect.top) / rect.height));
      line.style.transform = `scaleY(${amount})`;
    } else line.style.transform = '';
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }, { passive: true });
  addEventListener('resize', draw, { passive: true });
  reduced.addEventListener?.('change', draw);
  draw();

  const container = document.querySelector('#simulation');
  const stage = document.querySelector('#etape');
  const recap = document.querySelector('#recap');
  const message = document.querySelector('#message');
  const back = document.querySelector('#retour');
  const next = document.querySelector('#continuer');
  container.hidden = false;
  let step = 0;
  const state = { service: '', day: '', time: '', name: '', phone: '' };
  const services = ['Coupe femme', 'Coupe homme', 'Coloration', 'Brushing', 'Soins capillaires'];
  const formatDay = day => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(new Date(`${day}T12:00:00`));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  function days() {
    const result = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+i);
      result.push({ key: dateKey(date), closed: date.getDay() === 0 || date.getDay() === 1 });
    }
    return result;
  }
  function slots() {
    const date = new Date(`${state.day}T12:00:00`);
    const end = date.getDay() === 6 ? 16 * 60 + 30 : 17 * 60 + 30;
    const now = new Date();
    const result = [];
    for (let minute = 9 * 60; minute < end; minute += 30) {
      const time = `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
      const candidate = new Date(`${state.day}T${time}:00`);
      if (candidate > now) result.push(time);
    }
    return result;
  }
  function choice(name, value, label, checked, disabled = false, suffix = '') {
    return `<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span>${suffix ? `<small>${suffix}</small>` : ''}</label>`;
  }
  function escapeText(value) { const node = document.createElement('span'); node.textContent = value; return node.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function render(focus = true) {
    message.textContent = '';
    back.hidden = step === 0 || step === 4;
    next.hidden = step === 4;
    next.textContent = step === 3 ? 'Terminer la simulation' : 'Continuer';
    if (step === 0) stage.innerHTML = `<fieldset><legend tabindex="-1">1 / Choisir une prestation</legend><div class="choices">${services.map(s => choice('service',s,s,state.service===s)).join('')}</div></fieldset><p class="form-note">Prestations et tarifs à confirmer auprès du salon.</p>`;
    if (step === 1) stage.innerHTML = `<fieldset><legend tabindex="-1">2 / Choisir un jour</legend><p class="form-note">Horaires Treatwell à confirmer.</p><div class="choices">${days().map(d => choice('day',d.key,formatDay(d.key),state.day===d.key,d.closed,d.closed ? 'Fermé' : '')).join('')}</div></fieldset>`;
    if (step === 2) {
      const options = slots();
      stage.innerHTML = `<fieldset><legend tabindex="-1">3 / Choisir une heure</legend><p class="form-note">Horaires proposés pour la simulation seulement, sans vérification de disponibilité.</p><div class="choices time-choices">${options.map(t => choice('time',t,t.replace(':',' h '),state.time===t)).join('')}</div></fieldset>${options.length ? '' : '<p>Aucun horaire restant aujourd’hui. Choisissez un autre jour.</p>'}`;
    }
    if (step === 3) stage.innerHTML = `<h4 class="step-title" tabindex="-1">4 / Vos coordonnées</h4><p class="form-note">Ces informations restent dans cette page et ne sont pas transmises.</p><label class="field">Prénom<input id="prenom" autocomplete="given-name" value="${escapeText(state.name)}" aria-describedby="message"></label><label class="field">Téléphone<input id="telephone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeText(state.phone)}" aria-describedby="message"></label>`;
    if (step === 4) stage.innerHTML = `<h4 class="step-title" tabindex="-1">Simulation terminée.</h4><p>Merci ${escapeText(state.name)}. Aucune demande n’a été envoyée&nbsp;: ce rendez-vous n’est pas réservé.</p><p>Pour réserver, appelez le <a href="tel:0142720412">01 42 72 04 12</a> ou utilisez <a href="https://www.treatwell.fr/salon/d-s-coiffure-hairstories/" target="_blank" rel="noopener">Treatwell</a>.</p><button type="button" class="button button-outline" id="recommencer">Recommencer</button>`;
    recap.innerHTML = [state.service && `<button type="button" data-step="0">${escapeText(state.service)} <span>Modifier</span></button>`, state.day && `<button type="button" data-step="1">${formatDay(state.day)} <span>Modifier</span></button>`, state.time && `<button type="button" data-step="2">${state.time.replace(':',' h ')} <span>Modifier</span></button>`].filter(Boolean).join('') || 'Choisissez une prestation pour commencer.';
    recap.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { if (step === 3) { state.name = document.querySelector('#prenom').value; state.phone = document.querySelector('#telephone').value; } step = Number(button.dataset.step); render(); }));
    stage.classList.remove('step-enter'); void stage.offsetWidth; stage.classList.add('step-enter');
    if (focus) stage.querySelector('legend, h4')?.focus();
    stage.querySelector('#recommencer')?.addEventListener('click', () => { Object.assign(state,{service:'',day:'',time:'',name:'',phone:''}); step=0; render(); });
  }
  back.addEventListener('click', () => { if (step === 3) { state.name = document.querySelector('#prenom').value; state.phone = document.querySelector('#telephone').value; } step--; render(); });
  next.addEventListener('click', () => {
    if (step < 3) {
      const selected = stage.querySelector('input:checked');
      if (!selected) { message.textContent = 'Choisissez une option pour continuer.'; return; }
      if (step === 0) state.service = selected.value;
      if (step === 1) { if (state.day !== selected.value) state.time = ''; state.day = selected.value; }
      if (step === 2) state.time = selected.value;
    } else {
      state.name = document.querySelector('#prenom').value.trim();
      state.phone = document.querySelector('#telephone').value.trim();
      if (!state.name) { message.textContent = 'Indiquez votre prénom.'; document.querySelector('#prenom').focus(); return; }
      if (!/^(?:\+33|0)[1-9](?:[\s.\-]*\d{2}){4}$/.test(state.phone)) { message.textContent = 'Indiquez un numéro de téléphone français valide.'; document.querySelector('#telephone').focus(); return; }
    }
    step++; render();
  });
  render(false);
})();
