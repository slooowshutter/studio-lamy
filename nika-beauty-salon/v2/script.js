(() => {
  document.documentElement.classList.add('js');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const steps = [...document.querySelectorAll('.step')];
  const dayList = document.querySelector('#days');
  const timeList = document.querySelector('#times');
  const summaryDay = document.querySelector('#summary-day');
  const summaryTime = document.querySelector('#summary-time');
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', weekday:'long', day:'numeric', month:'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { timeZone:'UTC', weekday:'short', day:'numeric', month:'short' });
  let step = 0, day = null, time = '', moving = false, furthest = 0;
  const dateKey = d => d.toISOString().slice(0,10);
  function parisNow() {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date());
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
  }
  const paris = parisNow();
  const start = new Date(Date.UTC(+paris.year, +paris.month - 1, +paris.day));
  for (let i = 0; i < 14; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const unavailable = d.getUTCDay() === 0 || d.getUTCDay() === 1;
    const label = document.createElement('label');
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'jour'; input.value = dateKey(d); input.disabled = unavailable;
    const text = document.createElement('span'); text.textContent = shortFormat.format(d);
    label.append(input, text);
    if (unavailable) { const note = document.createElement('small'); note.textContent = 'Non proposé'; label.append(note); }
    input.addEventListener('change', () => { day = d; time = ''; summaryDay.textContent = dateFormat.format(d); summaryTime.textContent = 'À choisir'; document.querySelector('#day-error').textContent = ''; makeTimes(); });
    dayList.append(label);
  }
  function makeTimes() {
    timeList.replaceChildren();
    ['10:00','11:00','14:00','15:00','16:00','17:00'].forEach((slot, index) => {
      const [h,m] = slot.split(':').map(Number);
      const taken = (day.getUTCDate() + index * 3) % 7 === 0;
      const current = parisNow(); const todayKey = `${current.year}-${current.month}-${current.day}`;
      const past = dateKey(day) < todayKey || (dateKey(day) === todayKey && h * 60 + m <= +current.hour * 60 + +current.minute);
      const label = document.createElement('label'); const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = slot; input.disabled = taken || past;
      const text = document.createElement('span'); text.textContent = `${h} h ${String(m).padStart(2,'0')}`;
      label.append(input,text);
      if (taken || past) { const note = document.createElement('small'); note.textContent = past ? 'Passé' : 'Déjà pris'; label.append(note); }
      input.addEventListener('change', () => { time = slot; summaryTime.textContent = text.textContent; document.querySelector('#time-error').textContent = ''; });
      timeList.append(label);
    });
  }
  function show(next) {
    if (moving || next === step) return;
    moving = true;
    const old = steps[step]; old.classList.add('changing');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => {
      old.hidden = true; old.classList.remove('changing'); step = next; furthest = Math.max(furthest, step);
      document.querySelectorAll('[data-edit]').forEach(button => { button.hidden = step === 4 || Number(button.dataset.edit) >= step || Number(button.dataset.edit) > furthest; });
      const current = steps[step]; current.hidden = false; current.classList.add('changing');
      document.querySelector('#step-count').textContent = step === 4 ? 'BILLET SIMULÉ' : `ÉTAPE ${step+1} / 4`;
      current.querySelector('h3').focus({preventScroll:true});
      requestAnimationFrame(() => requestAnimationFrame(() => { current.classList.remove('changing'); moving = false; }));
      if (step === 4) { const receipt = document.querySelector('#receipt'); receipt.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => receipt.classList.remove('enter'))); }
    }, reduced ? 0 : 180);
  }
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (step === 1 && !day) { document.querySelector('#day-error').textContent = 'Choisissez un jour pour continuer.'; return; }
    if (step === 2 && !time) { document.querySelector('#time-error').textContent = 'Choisissez une heure pour continuer.'; return; }
    show(step+1);
  }));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => show(step-1)));
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.edit))));
  document.querySelector('#confirm').addEventListener('click', () => {
    const name = document.querySelector('#prenom').value.trim();
    const phone = document.querySelector('#telephone').value.trim().replace(/[\s.()-]/g,'');
    const nameError = document.querySelector('#name-error'); const phoneError = document.querySelector('#phone-error');
    nameError.textContent = name ? '' : 'Indiquez votre prénom.';
    phoneError.textContent = /^(?:(?:\+33|0033)[1-9]|0[1-9])\d{8}$/.test(phone) ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (nameError.textContent || phoneError.textContent) { document.querySelector(nameError.textContent ? '#prenom' : '#telephone').focus(); return; }
    document.querySelector('#receipt-details').textContent = `${name} · ${dateFormat.format(day)} · ${summaryTime.textContent}`;
    show(4);
  });
  document.querySelector('#restart').addEventListener('click', () => { day = null; time = ''; furthest = 0; document.querySelectorAll('input[name="jour"]').forEach(input => input.checked = false); summaryDay.textContent = 'À choisir'; summaryTime.textContent = 'À choisir'; document.querySelector('#prenom').value = ''; document.querySelector('#telephone').value = ''; show(0); });
})();
