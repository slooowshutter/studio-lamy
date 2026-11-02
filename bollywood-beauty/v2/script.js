(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; });
  document.addEventListener('pointerdown', () => { keyboard = false; });
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    reveals.forEach((el, index) => { el.style.transitionDelay = `${index * 60}ms`; observer.observe(el); });
  } else reveals.forEach(el => el.classList.add('visible'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));

  const content = document.querySelector('#booking-content');
  const selection = document.querySelector('#selection');
  const progress = document.querySelector('#progress');
  const original = content.innerHTML;
  let chosen = '';
  function updateChoice() {
    const checked = content.querySelector('input[name="prestation"]:checked');
    if (checked) { chosen = checked.value; selection.textContent = chosen; }
  }
  function enter() {
    if (!reduced && !keyboard) {
      content.classList.add('transitioning');
      void content.offsetWidth;
      requestAnimationFrame(() => content.classList.remove('transitioning'));
    }
    content.querySelector('h3').focus({ preventScroll: true });
  }
  function first() {
    content.innerHTML = original;
    progress.textContent = 'ÉTAPE 1 / 2';
    content.querySelectorAll('input').forEach(input => { input.checked = input.value === chosen; });
    enter();
  }
  content.addEventListener('change', updateChoice);
  content.addEventListener('click', event => {
    if (event.target.closest('#continue')) {
      updateChoice();
      if (!chosen) { content.querySelector('#error').textContent = 'Choisissez une prestation pour continuer.'; return; }
      progress.textContent = 'ÉTAPE 2 / 2';
      content.innerHTML = '<h3 tabindex="-1">Votre sélection est prête.</h3><p>Prestation choisie&nbsp;: <strong id="recap"></strong>.</p><p>Cette démonstration ne transmet rien et ne crée pas de rendez-vous. Pour convenir d’un moment et connaître les tarifs, appelez le salon.</p><div class="booking-actions"><a class="button button-pink" href="tel:+33768570590">Appeler le salon ↗</a><button class="button button-outline" type="button" id="retour">Modifier la prestation</button></div>';
      content.querySelector('#recap').textContent = chosen;
      enter();
    }
    if (event.target.closest('#retour')) first();
  });
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    chosen = button.dataset.service; selection.textContent = chosen; first();
    document.querySelector('#rendez-vous').scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
  }));
})();
