(() => {
  const form = document.querySelector('#booking-form');
  const steps = [...document.querySelectorAll('.step')];
  const state = { service: '', date: '', time: '' };
  const dates = document.querySelector('#dates');
  const times = document.querySelector('#times');
  const recap = document.querySelector('#recap');
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const pad = n => String(n).padStart(2, '0');
  const localKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const closed = date.getDay() === 0;
    const label = document.createElement('label');
    label.className = 'date-choice';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'jour'; input.value = localKey(date); input.disabled = closed;
    const text = document.createElement('span'); text.textContent = `${shortDate.format(date)}${closed ? ' · fermé' : ''}`;
    label.append(input, text); dates.append(label);
  }
  function formatDate(key) {
    const [y,m,d] = key.split('-').map(Number);
    return dateFormat.format(new Date(y,m-1,d,12));
  }
  function updateRecap() {
    const parts = [state.service, state.date && formatDate(state.date), state.time && state.time.replace(':',' h ')].filter(Boolean);
    recap.replaceChildren();
    if (!parts.length) { recap.textContent = 'Commencez par choisir une étape.'; return; }
    parts.forEach((part, index) => { const row = document.createElement('button'); row.type = 'button'; row.className = 'recap-link'; row.dataset.goto = String(index + 1); row.textContent = `${part} · modifier`; recap.append(row); });
  }
  function buildTimes() {
    times.replaceChildren(); state.time = '';
    const current = new Date();
    for (let hour = 10; hour <= 19; hour++) {
      const time = `${pad(hour)}:00`;
      const label = document.createElement('label'); label.className = 'time-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = time;
      if (state.date === localKey(current) && hour * 60 <= current.getHours() * 60 + current.getMinutes()) input.disabled = true;
      const text = document.createElement('span'); text.textContent = `${hour} h 00${input.disabled ? ' · passé' : ''}`;
      label.append(input, text); times.append(label);
    }
    updateRecap();
  }
  function showStep(number) {
    steps.forEach(step => { step.hidden = Number(step.dataset.step) !== number; step.classList.remove('enter'); });
    const active = steps.find(step => Number(step.dataset.step) === number);
    active.classList.add('enter');
    document.querySelector('#step-count').textContent = number === 5 ? 'Simulation terminée' : `Étape ${number} / 4`;
    document.querySelector('#booking-live').textContent = number === 5 ? 'Simulation terminée' : `Étape ${number} sur 4`;
    active.querySelector('h3').focus({preventScroll:true});
  }
  recap.addEventListener('click', event => { const button = event.target.closest('[data-goto]'); if (button) showStep(Number(button.dataset.goto)); });
  form.addEventListener('change', event => {
    if (event.target.name === 'service') state.service = event.target.value;
    if (event.target.name === 'jour') { state.date = event.target.value; buildTimes(); }
    if (event.target.name === 'heure') state.time = event.target.value;
    updateRecap();
  });
  form.addEventListener('click', event => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    if (back) showStep(Number(back.dataset.back));
    if (!next) return;
    const target = Number(next.dataset.next);
    const checks = {2:['service','error-service','Choisissez une prestation.'],3:['date','error-date','Choisissez un jour.'],4:['time','error-time','Choisissez une heure.']};
    const [key,id,message] = checks[target];
    document.getElementById(id).textContent = state[key] ? '' : message;
    if (state[key]) showStep(target);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const first = document.querySelector('#prenom'); const phone = document.querySelector('#telephone');
    const validFirst = first.value.trim().length > 0;
    const validPhone = /^(?:(?:\+33|0033)\s*[1-9]|0[1-9])(?:[\s.\-]*\d{2}){4}$/.test(phone.value.trim());
    document.querySelector('#error-prenom').textContent = validFirst ? '' : 'Indiquez votre prénom.';
    document.querySelector('#error-telephone').textContent = validPhone ? '' : 'Indiquez un numéro de téléphone français valide.';
    first.setAttribute('aria-invalid', String(!validFirst)); phone.setAttribute('aria-invalid', String(!validPhone));
    if (!validFirst || !validPhone) { (validFirst ? phone : first).focus(); return; }
    document.querySelector('#success-copy').textContent = `${first.value.trim()}, votre choix fictif : ${state.service}, ${formatDate(state.date)} à ${state.time.replace(':',' h ')}.`;
    showStep(5);
  });
  document.querySelector('#restart').addEventListener('click', () => { form.reset(); state.service = ''; state.date = ''; state.time = ''; updateRecap(); showStep(1); });
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .1 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));
})();
