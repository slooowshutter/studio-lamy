(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); if (entry.target.classList.contains('experience')) countExperience(); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  function countExperience() {
    const number = document.querySelector('[data-count]');
    const start = performance.now();
    function update(now) {
      const progress = Math.min((now - start) / 650, 1);
      number.textContent = String(Math.round(20 * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  const services = {
    femme: { name: 'Coupe femme' },
    homme: { name: 'Coupe homme' },
    couleur: { name: 'Coloration' },
    soin: { name: 'Soin' }
  };
  const hours = { 2: [540, 1020], 3: [540, 900], 4: [540, 1020], 5: [540, 1020], 6: [510, 960] };
  const state = { service: null, day: null, time: null, step: 0 };
  const $ = selector => document.querySelector(selector);
  const steps = [...document.querySelectorAll('.step')];
  const dates = [];
  const dateKey = date => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const dayLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const timeLabel = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  for (let i = 0; i < 14; i++) { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + i); dates.push(date); }
  function summary() {
    $('#sum-service').textContent = state.service ? services[state.service].name : 'À choisir';
    $('#sum-day').textContent = state.day ? dayLabel(state.day) : 'À choisir';
    $('#sum-time').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    $('#sum-price').textContent = 'Appelez le salon';
    document.querySelectorAll('[data-goto]').forEach(button => {
      const step = Number(button.dataset.goto);
      button.disabled = step > 0 && (!state.service || (step > 1 && !state.day) || (step > 2 && state.time === null));
      button.classList.toggle('current', step === state.step);
      if (step === state.step) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
  }
  function showStep(index, focus = true) {
    state.step = index;
    $('#booking-message').textContent = '';
    steps.forEach((step, i) => { step.hidden = i !== index; });
    const current = steps[index];
    if (!reduced.matches) {
      current.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('entering')));
    }
    summary();
    if (focus) current.querySelector('h3').focus({ preventScroll: true });
  }
  function renderDays() {
    const container = $('#days'); container.replaceChildren();
    dates.forEach(date => {
      const button = document.createElement('button'); button.type = 'button';
      const open = Boolean(hours[date.getDay()]);
      button.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
      if (!open) { const small = document.createElement('small'); small.textContent = 'Fermé'; button.append(small); button.disabled = true; }
      const selected = Boolean(state.day && dateKey(date) === dateKey(state.day));
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
      button.addEventListener('click', () => { state.day = date; state.time = null; renderDays(); renderSlots(); summary(); $('#booking-message').textContent = ''; container.querySelector('[aria-pressed="true"]').focus(); });
      container.append(button);
    });
  }
  function renderSlots() {
    const container = $('#slots'); container.replaceChildren();
    if (!state.day || !state.service) return;
    const [start, end] = hours[state.day.getDay()];
    let available = 0;
    for (let minute = start, i = 0; minute < end; minute += 30, i++) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = timeLabel(minute);
      const when = new Date(state.day); when.setHours(Math.floor(minute / 60), minute % 60);
      const taken = (i + state.day.getDate()) % 5 === 0; const past = when <= new Date();
      if (taken || past) { button.disabled = true; button.setAttribute('aria-label', `${timeLabel(minute)}, ${past ? 'horaire passé' : 'déjà pris, exemple'}`); button.title = past ? 'Horaire passé' : 'Déjà pris, exemple'; }
      else available++;
      const selected = state.time === minute; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
      button.addEventListener('click', () => { state.time = minute; renderSlots(); summary(); $('#booking-message').textContent = ''; container.querySelector('[aria-pressed="true"]').focus(); });
      container.append(button);
    }
    if (!available) { const p = document.createElement('p'); p.textContent = 'Aucun créneau fictif disponible ce jour. Choisissez un autre jour.'; container.append(p); }
  }
  document.querySelectorAll('input[name="service"]').forEach(input => input.addEventListener('change', () => {
    state.service = input.value; state.time = null; $('#booking-message').textContent = ''; renderSlots(); summary();
  }));
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !state.service) { $('#booking-message').textContent = 'Choisissez une prestation pour continuer.'; $('input[name="service"]').focus(); return; }
    if (next === 2 && !state.day) { $('#booking-message').textContent = 'Choisissez un jour pour continuer.'; $('#days button:not(:disabled)')?.focus(); return; }
    if (next === 3 && state.time === null) { $('#booking-message').textContent = 'Choisissez une heure pour continuer.'; $('#slots button:not(:disabled)')?.focus(); return; }
    if (next === 1) renderDays(); if (next === 2) renderSlots(); showStep(next);
  }));
  document.querySelectorAll('[data-back],[data-goto]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back ?? button.dataset.goto))));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector(`input[name="service"][value="${button.dataset.service}"]`); input.checked = true; input.dispatchEvent(new Event('change')); showStep(0, false); $('#reservation').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' }); input.focus({ preventScroll: true });
  }));
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  $('#booking-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('#first-name').value.trim(); const phone = $('#phone').value.trim();
    const validName = name.length > 0; const validPhone = /^(?:(?:\+33|0033|0)[1-9])(?:[ .-]?\d{2}){4}$/.test(phone);
    $('#name-error').textContent = validName ? '' : 'Indiquez votre prénom.';
    $('#phone-error').textContent = validPhone ? '' : 'Indiquez un numéro français valide, par exemple 06 12 34 56 78.';
    $('#first-name').setAttribute('aria-invalid', String(!validName)); $('#phone').setAttribute('aria-invalid', String(!validPhone));
    if (!validName || !validPhone) { (validName ? $('#phone') : $('#first-name')).focus(); return; }
    $('#success-copy').textContent = `${name}, votre exemple : ${services[state.service].name}, le ${dayLabel(state.day)} à ${timeLabel(state.time)}.`;
    showStep(4);
  });
  $('#restart').addEventListener('click', () => { state.service = null; state.day = null; state.time = null; $('#booking-form').reset(); document.querySelectorAll('input[name="service"]').forEach(input => { input.checked = false; }); $('#name-error').textContent = ''; $('#phone-error').textContent = ''; showStep(0); });
  renderDays(); summary();
})();
