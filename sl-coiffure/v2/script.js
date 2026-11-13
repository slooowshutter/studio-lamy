(() => {
  window.sitePret = true;
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  const content = document.getElementById('booking-content');
  const progress = document.querySelectorAll('.steps span');
  let service = '';
  let day = '';
  const services = ['Coupe femme', 'Coupe enfant', 'Coloration', 'Balayage'];
  const days = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  function show(step) {
    progress.forEach((item, index) => item.classList.toggle('active', index < step));
    if (step === 1) {
      content.innerHTML = `<div class="booking-panel"><p class="eyebrow">Étape 1 sur 3</p><h3>Quelle prestation&nbsp;?</h3><p>Prestations à confirmer avec le salon.</p><div class="choices">${services.map(item => `<button type="button" data-service="${item}">${item} <span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
    } else if (step === 2) {
      content.innerHTML = `<div class="booking-panel"><p class="eyebrow">Étape 2 sur 3</p><h3>Quel jour&nbsp;?</h3><p>Choix fictif, sans vérification des disponibilités.</p><div class="choices">${days.map(item => `<button type="button" data-day="${item}">${item} <span aria-hidden="true">↗</span></button>`).join('')}</div><button class="back-button" type="button" data-back="1">← Retour</button></div>`;
    } else {
      content.innerHTML = `<div class="booking-panel"><p class="eyebrow">Étape 3 sur 3 · Simulation</p><h3>Votre choix</h3><p>${service} · ${day}</p><p>Ce choix est un exemple&nbsp;: aucune demande n’a été envoyée. Pour connaître les disponibilités et réserver, appelez le salon.</p><a class="call" href="tel:+33473350914">Appeler le 04 73 35 09 14 ↗</a><br><button class="back-button" type="button" data-back="2">← Modifier le jour</button></div>`;
    }
    const heading = content.querySelector('h3');
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  content.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.service) { service = target.dataset.service; show(2); }
    else if (target.dataset.day) { day = target.dataset.day; show(3); }
    else if (target.dataset.back) show(Number(target.dataset.back));
  });
})();
