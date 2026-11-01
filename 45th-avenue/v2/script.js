(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .12 }) : null;
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
    if (observer) observer.observe(el); else el.classList.add('visible');
  });

  // Prestations, prix et durées publiés sur Planity.
  const services = [
    { name: 'Shampooing traitant, coupe et coiffage · cheveux courts', price: 43, duration: 30, category: 'coupe' },
    { name: 'Shampoing et coiffage · cheveux courts', price: 30, duration: 30, category: 'coupe' },
    { name: 'Shampoing, coupe et coiffage homme', price: 30, duration: 30, category: 'coupe' },
    { name: 'Couleur, shampoing et coiffage · cheveux courts', price: 67, duration: 90, category: 'couleur' },
    { name: 'Balayage · cheveux courts', price: 60, duration: 60, category: 'couleur' },
    { name: 'Shampooing, coupe, coiffage et barbe · homme', price: 35, duration: 35, category: 'barbe' },
    { name: 'Taille de barbe express, contours et mise en forme', price: 10, duration: 15, category: 'barbe' }
  ];
  const list = document.querySelector('#price-list');
  const panel = document.querySelector('#booking-panel');
  const summary = document.querySelector('#summary');
  const steps = [...document.querySelectorAll('[data-step]')];
  const state = { step: 0, max: 0, service: null, day: null, time: null, firstName: '', phone: '' };
  const formatDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parseDay = key => { const [y,m,d] = key.split('-').map(Number); return new Date(y,m-1,d); };
  function renderPrices(filter = 'tout') {
    list.innerHTML = services.map((s, i) => ({...s, i})).filter(s => filter === 'tout' || s.category === filter).map(s => `<article class="price-row"><span class="num">${String(s.i+1).padStart(2,'0')}</span><h3>${s.name}</h3><span class="duration">${s.duration} min</span><strong class="price">${s.price} €</strong><button type="button" data-book="${s.i}">Choisir ↗</button></article>`).join('');
  }
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    renderPrices(button.dataset.filter);
  }));
  list.addEventListener('click', e => {
    const button = e.target.closest('[data-book]'); if (!button) return;
    state.service = Number(button.dataset.book); state.day = null; state.time = null; state.max = 1;
    show(1); document.querySelector('#reserver').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  function updateSummary() {
    const parts = [];
    if (state.service !== null) { const s = services[state.service]; parts.push(`${s.name} · ${s.price} € selon Planity · ${s.duration} min`); }
    if (state.day) parts.push(formatDate(parseDay(state.day)));
    if (state.time) parts.push(state.time.replace(':', ' h '));
    summary.textContent = parts.join(' / ') || 'Choisissez une prestation pour commencer.';
  }
  function show(step, focus = true) {
    if (step >= 1 && state.service === null) step = 0;
    if (step >= 2 && !state.day) step = 1;
    if (step >= 3 && !state.time) step = 2;
    state.step = step; state.max = Math.max(state.max, step);
    steps.forEach((button, i) => { button.disabled = i > state.max; button.classList.toggle('current', i === step); if (i === step) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current'); });
    updateSummary();
    if (step === 0) {
      panel.innerHTML = `<h3 class="panel-title" tabindex="-1">Choisir une prestation</h3><p class="panel-note">Prix et durées publiés sur Planity, à confirmer avec le salon.</p><div class="service-options">${services.map((s,i) => `<label class="choice"><input type="radio" name="prestation" value="${i}" ${state.service === i ? 'checked' : ''}><span>${s.name}<br><small>${s.duration} min selon Planity</small></span><strong>${s.price} €</strong></label>`).join('')}</div><div class="panel-actions"><span></span><button class="next" type="button" data-action="next-service" ${state.service === null ? 'disabled' : ''}>Choisir le jour →</button></div>`;
    } else if (step === 1) {
      const today = new Date(); today.setHours(0,0,0,0);
      const days = Array.from({length:14}, (_,i) => { const date = new Date(today); date.setDate(today.getDate()+i); return date; });
      panel.innerHTML = `<h3 class="panel-title" tabindex="-1">Choisir un jour</h3><p class="panel-note">Le lundi, appelez le salon. Les disponibilités sont fictives.</p><div class="days">${days.map(date => { const closed = date.getDay() === 0 || date.getDay() === 1; const key = dayKey(date); return `<button class="day ${state.day === key ? 'selected' : ''}" type="button" data-day="${key}" ${closed ? 'disabled' : ''} aria-pressed="${state.day === key}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(date)}<span>${date.getDay() === 1 ? 'Appeler le salon' : closed ? 'Fermé' : 'Choisir'}</span></button>`; }).join('')}</div><div class="panel-actions"><button type="button" data-action="back-service">← Prestation</button><button class="next" type="button" data-action="next-day" ${!state.day ? 'disabled' : ''}>Choisir l’heure →</button></div>`;
    } else if (step === 2) {
      const date = parseDay(state.day), weekday = date.getDay(), start = weekday === 6 ? 540 : 570, end = weekday === 6 ? 1050 : 1140;
      const now = new Date(); let slots = '';
      for (let minute = start, n = 0; minute + services[state.service].duration <= end; minute += 30, n++) {
        const time = `${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
        const slotDate = new Date(date); slotDate.setHours(Math.floor(minute/60), minute%60);
        const taken = (n + date.getDate()) % 4 === 0 || slotDate <= now;
        slots += `<button type="button" class="slot ${state.time === time ? 'selected' : ''}" data-time="${time}" ${taken ? 'disabled' : ''} aria-pressed="${state.time === time}">${time.replace(':',' h ')}${taken ? ' · déjà pris' : ''}</button>`;
      }
      panel.innerHTML = `<h3 class="panel-title" tabindex="-1">Choisir une heure</h3><p class="panel-note">${formatDate(date)} · créneaux fictifs, sans lien avec les disponibilités réelles.</p><div class="slots">${slots || '<p>Aucun créneau pour cette durée.</p>'}</div><div class="panel-actions"><button type="button" data-action="back-day">← Jour</button><button class="next" type="button" data-action="next-time" ${!state.time ? 'disabled' : ''}>Vos coordonnées →</button></div>`;
    } else if (step === 3) {
      panel.innerHTML = `<h3 class="panel-title" tabindex="-1">Vos coordonnées</h3><p class="panel-note">Pour essayer la confirmation. Rien ne sera envoyé.</p><form id="booking-form" novalidate><div class="fields"><label for="first-name">Prénom<input id="first-name" name="prenom" autocomplete="given-name" required aria-describedby="name-error"><span class="error" id="name-error"></span></label><label for="phone">Téléphone<input id="phone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="phone-error"><span class="error" id="phone-error"></span></label></div><div class="panel-actions"><button type="button" data-action="back-time">← Heure</button><button class="confirm" type="submit">Confirmer la simulation →</button></div></form>`;
      document.querySelector('#first-name').value = state.firstName; document.querySelector('#phone').value = state.phone;
    } else {
      panel.innerHTML = `<div class="success"><h3 class="panel-title" tabindex="-1">Simulation terminée.</h3><p>Merci <span id="success-name"></span>. Voici votre sélection&nbsp;:</p><p id="success-summary"></p><p><strong>Aucun rendez-vous n’a été envoyé au salon.</strong> Pour réserver réellement, utilisez la page Planity ou appelez le salon.</p><a href="https://www.planity.com/45th-avenue-33200-bordeaux">Réserver sur Planity ↗</a><br><a href="tel:+33556089300">Appeler le 05 56 08 93 00 ↗</a></div><div class="panel-actions"><button type="button" data-action="restart">Recommencer</button></div>`;
      document.querySelector('#success-name').textContent = state.firstName; document.querySelector('#success-summary').textContent = summary.textContent;
    }
    panel.classList.add('panel-enter'); requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove('panel-enter')));
    if (focus) panel.querySelector('.panel-title').focus({preventScroll:true});
  }
  steps.forEach((button, i) => button.addEventListener('click', () => { if (!button.disabled) show(i); }));
  panel.addEventListener('change', e => {
    if (e.target.name === 'prestation') { const selected = Number(e.target.value); if (state.service !== selected) { state.day = null; state.time = null; state.max = 0; steps.forEach((b, i) => { if (i > 0) b.disabled = true; }); } state.service = selected; updateSummary(); panel.querySelector('[data-action="next-service"]').disabled = false; }
  });
  panel.addEventListener('click', e => {
    const day = e.target.closest('[data-day]'), time = e.target.closest('[data-time]'), action = e.target.closest('[data-action]')?.dataset.action;
    if (day && !day.disabled) { if (state.day !== day.dataset.day) { state.time = null; state.max = 1; steps.forEach((b, i) => { if (i > 1) b.disabled = true; }); } state.day = day.dataset.day; updateSummary(); panel.querySelectorAll('[data-day]').forEach(b => { b.classList.toggle('selected', b === day); b.setAttribute('aria-pressed', String(b === day)); }); panel.querySelector('[data-action="next-day"]').disabled = false; }
    if (time && !time.disabled) { state.time = time.dataset.time; updateSummary(); panel.querySelectorAll('[data-time]').forEach(b => { b.classList.toggle('selected', b === time); b.setAttribute('aria-pressed', String(b === time)); }); panel.querySelector('[data-action="next-time"]').disabled = false; }
    if (action === 'next-service' && state.service !== null) show(1);
    if (action === 'back-service') show(0);
    if (action === 'next-day' && state.day) show(2);
    if (action === 'back-day') show(1);
    if (action === 'next-time' && state.time) show(3);
    if (action === 'back-time') { state.firstName = document.querySelector('#first-name')?.value || ''; state.phone = document.querySelector('#phone')?.value || ''; show(2); }
    if (action === 'restart') { Object.assign(state, {step:0,max:0,service:null,day:null,time:null,firstName:'',phone:''}); show(0); }
  });
  panel.addEventListener('submit', e => {
    if (e.target.id !== 'booking-form') return; e.preventDefault();
    const name = document.querySelector('#first-name'), phone = document.querySelector('#phone');
    state.firstName = name.value.trim(); state.phone = phone.value.trim();
    const validName = state.firstName.length > 0, validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(state.phone);
    document.querySelector('#name-error').textContent = validName ? '' : 'Indiquez votre prénom.';
    document.querySelector('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    name.setAttribute('aria-invalid', String(!validName)); phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) { (validName ? phone : name).focus(); return; }
    show(4);
  });
  renderPrices(); show(0, false);
})();
