(() => {
  const root = document.documentElement;
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    if (entry.target.classList.contains('tile-address') && !reduced) {
      const number = entry.target.querySelector('.number');
      const start = performance.now();
      const tick = now => {
        const progress = Math.min((now - start) / 650, 1);
        number.textContent = Math.round(174 * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    observer.unobserve(entry.target);
  }), { threshold: .15 }) : null;
  document.querySelectorAll('.reveal').forEach(el => observer ? observer.observe(el) : el.classList.add('visible'));
  if (observer) {
    const barObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      document.body.classList.toggle(entry.target.tagName === 'FOOTER' ? 'footer-visible' : 'booking-visible', entry.isIntersecting);
    }), { threshold: 0 });
    barObserver.observe(document.querySelector('#reservation'));
    barObserver.observe(document.querySelector('footer'));
  }

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));

  const services = [
    {id:'brushing', name:'Shampoing & brushing · cheveux courts'},
    {id:'coupe-femme', name:'Shampoing, coupe & brushing · cheveux courts'},
    {id:'homme', name:'Coupe homme'},
    {id:'racines', name:'Racines, shampoing & brushing · cheveux courts'}
  ];
  const state = {step:0, service:null, date:null, time:null, name:'', phone:''};
  const panel = document.querySelector('#booking-step');
  const summary = document.querySelector('#summary-text');
  const formatDate = d => new Intl.DateTimeFormat('fr-FR', {weekday:'long', day:'numeric', month:'long'}).format(d);
  const localDate = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const keyDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const escapeHTML = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function updateSummary() {
    const parts = [];
    if (state.service) parts.push(state.service.name);
    if (state.date) parts.push(formatDate(state.date));
    if (state.time) parts.push(state.time);
    summary.textContent = parts.length ? parts.join(' / ') : 'Choisissez une prestation pour commencer.';
    document.querySelectorAll('[data-go]').forEach((button, index) => {
      button.disabled = index > 0 && (index === 1 ? !state.service : index === 2 ? !state.date : !state.time);
      button.setAttribute('aria-current', index === state.step ? 'step' : 'false');
    });
  }
  let transitionTimer;
  let keyboardInput = false;
  document.addEventListener('keydown', () => { keyboardInput = true; });
  document.addEventListener('pointerdown', () => { keyboardInput = false; });
  function show(step, animate = true) {
    clearTimeout(transitionTimer);
    state.step = step;
    const render = () => {
      updateSummary();
      if (step === 0) {
        panel.innerHTML = `<h3 tabindex="-1">Votre prestation</h3><p>Simulation : tarifs et durées à confirmer auprès du salon.</p><div class="choice-list">${services.map(s => `<label class="choice"><input type="radio" name="service" value="${s.id}" ${state.service?.id === s.id ? 'checked' : ''}><span>${s.name}<small>Tarif à confirmer</small></span><b>Choisir</b></label>`).join('')}</div><button class="next" type="button" id="next-service" ${state.service ? '' : 'disabled'}>Choisir un jour →</button>`;
        panel.querySelectorAll('[name=service]').forEach(input => input.addEventListener('change', () => { state.service = services.find(s => s.id === input.value); state.date = null; state.time = null; updateSummary(); panel.querySelector('#next-service').disabled = false; }));
        panel.querySelector('#next-service').addEventListener('click', () => show(1));
      } else if (step === 1) {
        const today = localDate(new Date());
        const days = Array.from({length:14}, (_, i) => { const d = new Date(today); d.setDate(d.getDate()+i); return d; });
        panel.innerHTML = `<h3 tabindex="-1">Quel jour&nbsp;?</h3><p>Horaires utilisés pour cet exemple&nbsp;: ceux de Planity, à confirmer.</p><div class="days">${days.map(d => {const closed = d.getDay() === 0; return `<button type="button" data-date="${keyDate(d)}" ${closed ? 'disabled' : ''} class="${state.date && keyDate(state.date) === keyDate(d) ? 'selected' : ''}" aria-pressed="${Boolean(state.date && keyDate(state.date) === keyDate(d))}">${new Intl.DateTimeFormat('fr-FR',{weekday:'short',day:'numeric',month:'short'}).format(d)}<small>${closed ? 'Fermé' : 'Choisir'}</small></button>`}).join('')}</div><button class="next" id="next-day" type="button" ${state.date ? '' : 'disabled'}>Choisir une heure →</button>`;
        panel.querySelectorAll('[data-date]').forEach(button => button.addEventListener('click', () => { const [y,m,d] = button.dataset.date.split('-').map(Number); state.date = new Date(y,m-1,d); state.time = null; panel.querySelectorAll('[data-date]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); panel.querySelector('#next-day').disabled = false; updateSummary(); }));
        panel.querySelector('#next-day').addEventListener('click', () => show(2));
      } else if (step === 2) {
        const open = state.date.getDay() === 1 ? 10*60 : 9*60, close = state.date.getDay() === 6 ? 17*60 : 19*60;
        const now = new Date(); const slots = [];
        for (let mins = open; mins < close; mins += 30) {
          const h = Math.floor(mins / 60), m = mins % 60, label = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          const dateTime = new Date(state.date); dateTime.setHours(h,m,0,0);
          const busy = (Math.floor(mins/30) + state.date.getDate()) % 5 === 0;
          slots.push({label, unavailable:busy || dateTime <= now});
        }
        panel.innerHTML = `<h3 tabindex="-1">À quelle heure&nbsp;?</h3><p>${formatDate(state.date)} · Créneaux simulés, les heures barrées sont indisponibles dans cet exemple.</p><div class="slots">${slots.map(s => `<button type="button" data-time="${s.label}" ${s.unavailable ? 'disabled' : ''} class="${state.time === s.label ? 'selected' : ''}" aria-pressed="${state.time === s.label}">${s.label}${s.unavailable ? '<span class="sr-only"> indisponible</span>' : ''}</button>`).join('')}</div><button class="next" id="next-time" type="button" ${state.time ? '' : 'disabled'}>Vos coordonnées →</button>`;
        panel.querySelectorAll('[data-time]').forEach(button => button.addEventListener('click', () => { state.time = button.dataset.time; panel.querySelectorAll('[data-time]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); panel.querySelector('#next-time').disabled = false; updateSummary(); }));
        panel.querySelector('#next-time').addEventListener('click', () => show(3));
      } else if (step === 3) {
        panel.innerHTML = `<h3 tabindex="-1">Vos coordonnées</h3><p>Pour terminer la simulation. Rien ne sera envoyé.</p><form id="booking-form" novalidate><div class="fields"><label for="first-name">Prénom<input id="first-name" name="first-name" autocomplete="given-name" value="${escapeHTML(state.name)}" aria-describedby="name-error"><span class="error" id="name-error"></span></label><label for="phone">Téléphone mobile<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHTML(state.phone)}" aria-describedby="phone-error"><span class="error" id="phone-error"></span></label></div><button class="next" type="submit">Confirmer la simulation →</button></form>`;
        panel.querySelector('form').addEventListener('submit', event => {
          event.preventDefault(); state.name = panel.querySelector('#first-name').value.trim(); state.phone = panel.querySelector('#phone').value.trim();
          const digits = state.phone.replace(/[\s.()-]/g,'');
          const nameOK = state.name.length >= 2, phoneOK = /^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(digits);
          panel.querySelector('#name-error').textContent = nameOK ? '' : 'Indiquez votre prénom (2 caractères minimum).';
          panel.querySelector('#phone-error').textContent = phoneOK ? '' : 'Indiquez un numéro mobile français valide.';
          panel.querySelector('#first-name').setAttribute('aria-invalid', String(!nameOK)); panel.querySelector('#phone').setAttribute('aria-invalid', String(!phoneOK));
          if (nameOK && phoneOK) show(4); else panel.querySelector(nameOK ? '#phone' : '#first-name').focus();
        });
      } else {
        panel.innerHTML = `<h3 tabindex="-1">Simulation terminée.</h3><p>Merci ${escapeHTML(state.name)}. Votre sélection&nbsp;: ${state.service.name}, le ${formatDate(state.date)} à ${state.time}.</p><p><strong>Aucun rendez-vous n’a été envoyé au salon.</strong> Pour réserver réellement, utilisez Planity ou téléphonez au salon.</p><a class="next button" href="https://www.planity.com/art-detente-coiffure-69007-lyon">Réserver sur Planity ↗</a> <button class="next" id="restart" type="button">Recommencer</button>`;
        panel.querySelector('#restart').addEventListener('click', () => { Object.assign(state,{service:null,date:null,time:null,name:'',phone:''}); show(0); });
      }
      panel.classList.remove('changing');
      if (animate) panel.querySelector('h3').focus({preventScroll:true});
    };
    if (animate && !reduced && !keyboardInput) { panel.classList.add('changing'); transitionTimer = setTimeout(render, 180); } else render();
  }
  document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.go))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => { state.service = services.find(s => s.id === link.dataset.service); state.date = null; state.time = null; show(0, false); }));
  show(0, false);
})();
