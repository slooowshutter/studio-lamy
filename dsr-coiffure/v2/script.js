(() => {
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));
  const mobileBar = document.querySelector('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const overlaps = new Set();
    const barObserver = new IntersectionObserver(entries => { entries.forEach(entry => entry.isIntersecting ? overlaps.add(entry.target) : overlaps.delete(entry.target)); mobileBar.classList.toggle('is-hidden', overlaps.size > 0); }, { threshold: 0 });
    [document.querySelector('#rendez-vous'), document.querySelector('footer')].forEach(item => barObserver.observe(item));
  }
  const state = { service: '', date: null, time: '' };
  const steps = [...document.querySelectorAll('.step')];
  const tabs = [...document.querySelectorAll('[data-go]')];
  const count = document.querySelector('#step-count');
  const summary = document.querySelector('#summary');
  const dayArea = document.querySelector('#days');
  const timeArea = document.querySelector('#time-area');
  const times = document.querySelector('#times');
  const dayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const fullFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  function updateSummary() {
    summary.textContent = [state.service, state.date && fullFormat.format(state.date), state.time].filter(Boolean).join(' · ') || 'Choisissez une prestation pour commencer.';
  }
  function showStep(index) {
    steps.forEach((step, i) => { step.hidden = i !== index; });
    tabs.forEach((tab, i) => { tab.classList.toggle('current', i === index); tab.disabled = i > index || index === 3; });
    count.textContent = index === 3 ? 'TERMINÉ' : `0${index + 1} — 03`;
    steps[index].querySelector('h3').focus({ preventScroll: true });
    updateSummary();
  }
  function selectService(value) {
    state.service = value;
    const radio = [...document.querySelectorAll('input[name="prestation"]')].find(input => input.value === value);
    if (radio) radio.checked = true;
    steps[0].querySelector('.next').disabled = false;
    updateSummary();
  }
  document.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change', () => selectService(input.value)));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => { selectService(button.dataset.service); showStep(0); document.querySelector('#rendez-vous').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }));
  steps[0].querySelector('.next').addEventListener('click', () => showStep(1));
  tabs.forEach(tab => tab.addEventListener('click', () => showStep(Number(tab.dataset.go))));
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = dayFormat.format(date); button.setAttribute('aria-pressed', 'false'); button.disabled = date.getDay() === 0;
    if (button.disabled) button.textContent += ' · fermé';
    button.addEventListener('click', () => {
      state.date = date; state.time = ''; updateSummary();
      dayArea.querySelectorAll('button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); }); button.classList.add('selected'); button.setAttribute('aria-pressed', 'true');
      times.replaceChildren(); timeArea.hidden = false; steps[1].querySelector('.next').disabled = true;
      [9, 10, 11, 14, 15, 16, 17, 18].forEach((hour, j) => {
        const slot = document.createElement('button'); slot.type = 'button'; slot.textContent = `${hour} h`; slot.setAttribute('aria-pressed', 'false');
        const past = date.toDateString() === now.toDateString() && hour <= now.getHours();
        slot.disabled = past || (i + j) % 5 === 0;
        if (slot.disabled) { slot.textContent += ' · indisponible'; slot.setAttribute('aria-label', `${hour} heures, indisponible`); }
        slot.addEventListener('click', () => { state.time = `${hour} h`; times.querySelectorAll('button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); }); slot.classList.add('selected'); slot.setAttribute('aria-pressed', 'true'); steps[1].querySelector('.next').disabled = false; updateSummary(); });
        times.append(slot);
      });
    }); dayArea.append(button);
  }
  steps[1].querySelector('.next').addEventListener('click', () => showStep(2));
  document.querySelectorAll('#booking-form input').forEach(input => input.addEventListener('input', () => { document.querySelector('#form-error').textContent = ''; }));
  document.querySelector('#booking-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.querySelector('#first-name'); const phone = document.querySelector('#phone'); const error = document.querySelector('#form-error');
    const digits = phone.value.replace(/[\s.()\-]/g, '');
    if (!name.value.trim()) { error.textContent = 'Veuillez indiquer votre prénom.'; name.focus(); return; }
    if (!/^(?:\+33|0)[1-9]\d{8}$/.test(digits)) { error.textContent = 'Veuillez indiquer un numéro de téléphone français valide.'; phone.focus(); return; }
    error.textContent = ''; showStep(3);
  });
  document.querySelector('.restart').addEventListener('click', () => { state.service = ''; state.date = null; state.time = ''; document.querySelector('#booking-form').reset(); document.querySelectorAll('input[name="prestation"]').forEach(input => input.checked = false); steps[0].querySelector('.next').disabled = true; steps[1].querySelector('.next').disabled = true; dayArea.querySelectorAll('button').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); }); timeArea.hidden = true; showStep(0); });
})();
