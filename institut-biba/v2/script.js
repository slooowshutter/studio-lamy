(() => {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach((element, index) => { element.style.setProperty('--delay', `${(index % 5) * 40}ms`); observer.observe(element); });
  } else reveals.forEach(element => element.classList.add('visible'));

  const form = document.querySelector('#booking-form');
  const steps = [...form.querySelectorAll('.step')];
  const dayBox = document.querySelector('#days');
  const timeBox = document.querySelector('#times');
  let step = 0, furthestStep = 0, chosenDay = null, changing = false;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const serviceName = () => form.elements.service.value === 'visage' ? 'INDIBA visage' : 'INDIBA corps';
  const summary = () => {
    document.querySelector('#summary-service b').textContent = form.elements.service.value ? serviceName() : '—';
    document.querySelector('#summary-day b').textContent = chosenDay ? dateFormat.format(chosenDay) : '—';
    document.querySelector('#summary-time b').textContent = form.querySelector('input[name="time"]:checked')?.value || '—';
    document.querySelectorAll('[data-return]').forEach(button => { button.disabled = Number(button.dataset.return) >= step || Number(button.dataset.return) >= furthestStep; });
  };
  function show(index) {
    if (changing) return;
    changing = true;
    const previous = steps[step];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    previous.classList.add('leaving');
    setTimeout(() => {
      previous.hidden = true; previous.classList.remove('leaving');
      step = index; furthestStep = Math.max(furthestStep, index); const current = steps[step];
      current.classList.add('arriving'); current.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('arriving')));
      const heading = current.querySelector('h3');
      document.querySelector('#step-announcement').textContent = heading.textContent;
      heading.focus(); summary(); changing = false;
    }, reduced ? 0 : 180);
  }
  function makeDays() {
    dayBox.replaceChildren(); const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const date = new Date(today); date.setDate(today.getDate() + i);
      const closed = date.getDay() === 0 || date.getDay() === 1;
      const label = document.createElement('label'); const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'day'; radio.value = String(i); radio.disabled = closed;
      const text = document.createElement('span'); text.textContent = shortFormat.format(date);
      label.append(radio, text); if (closed) { const note = document.createElement('small'); note.textContent = 'Fermé'; label.append(note); }
      radio.addEventListener('change', () => { chosenDay = date; makeTimes(); summary(); }); dayBox.append(label);
    }
  }
  function makeTimes() {
    timeBox.replaceChildren(); const now = new Date();
    for (let mins = 600, i = 0; mins <= 1120; mins += 20, i++) {
      const hour = Math.floor(mins / 60), minute = mins % 60;
      const value = `${String(hour).padStart(2, '0')} h ${String(minute).padStart(2, '0')}`;
      const slot = new Date(chosenDay); slot.setHours(hour, minute, 0, 0);
      const taken = (i + chosenDay.getDate()) % 5 === 0; const past = slot <= now;
      const label = document.createElement('label'); const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'time'; radio.value = value; radio.disabled = taken || past;
      const text = document.createElement('span'); text.textContent = value; label.append(radio, text);
      if (taken || past) { const note = document.createElement('small'); note.textContent = past ? 'Passé' : 'Déjà pris'; label.append(note); }
      radio.addEventListener('change', summary); timeBox.append(label);
    }
  }
  form.addEventListener('change', summary);
  form.addEventListener('click', event => {
    if (event.target.closest('[data-back]')) { show(step - 1); return; }
    if (!event.target.closest('[data-next]')) return;
    const selected = step === 0 ? form.elements.service.value : step === 1 ? form.querySelector('input[name="day"]:checked') : form.querySelector('input[name="time"]:checked');
    const error = steps[step].querySelector('.error');
    if (!selected) { error.textContent = 'Veuillez choisir une option pour continuer.'; return; }
    error.textContent = ''; show(step + 1);
  });
  form.addEventListener('submit', event => {
    event.preventDefault(); const name = form.elements.firstname.value.trim(); const phone = form.elements.phone.value.trim();
    const digits = phone.replace(/[\s.()-]/g, '');
    document.querySelector('#name-error').textContent = name ? '' : 'Indiquez votre prénom.';
    document.querySelector('#phone-error').textContent = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(digits) ? '' : 'Indiquez un numéro de téléphone français valide.';
    if (!name || document.querySelector('#phone-error').textContent) return;
    document.querySelector('#result').textContent = `${name}, votre sélection : ${serviceName()}, ${dateFormat.format(chosenDay)} à ${form.querySelector('input[name="time"]:checked').value}.`;
    show(4);
  });
  document.querySelectorAll('[data-return]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.return))));
  document.querySelector('#restart').addEventListener('click', () => { form.reset(); chosenDay = null; furthestStep = 0; makeDays(); show(0); });
  makeDays(); form.hidden = false;
})();
