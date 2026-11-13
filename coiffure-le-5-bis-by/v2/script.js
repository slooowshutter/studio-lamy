(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    reveals.forEach(el => el.classList.add('waiting'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('waiting'); observer.unobserve(entry.target); }
    }), {threshold: 0.12});
    reveals.forEach(el => observer.observe(el));
    const blob = document.querySelector('.hero-blob');
    const blobObserver = new IntersectionObserver(entries => entries.forEach(entry => blob.classList.toggle('shifted', !entry.isIntersecting)), {threshold: 0.45});
    blobObserver.observe(document.querySelector('.hero-copy'));
  }
  const steps = [...document.querySelectorAll('.step')];
  const buttons = [...document.querySelectorAll('[data-go]')];
  const error = document.querySelector('#erreur');
  let pointerAction = false;
  document.addEventListener('pointerdown', () => { pointerAction = true; }, true);
  document.addEventListener('keydown', () => { pointerAction = false; }, true);
  function syncSelection() {
    const selected = document.querySelector('input[name="prestation"]:checked');
    if (selected) document.querySelectorAll('.selection').forEach(el => { el.textContent = selected.value; });
  }
  function showStep(index) {
    if (index === 1) syncSelection();
    steps.forEach((step, i) => { step.hidden = i !== index; step.classList.remove('enter'); });
    buttons.forEach((button, i) => { if (i === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current'); });
    const current = steps[index];
    if (!reduced.matches && pointerAction) {
      current.classList.add('enter');
      requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('enter')));
    }
    current.querySelector('h3').focus({preventScroll: true});
  }
  document.querySelector('.next').addEventListener('click', () => {
    const selected = document.querySelector('input[name="prestation"]:checked');
    if (!selected) { error.textContent = 'Choisissez une prestation pour continuer.'; return; }
    error.textContent = '';
    syncSelection();
    buttons[1].disabled = false;
    showStep(1);
  });
  document.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change', () => { error.textContent = ''; syncSelection(); }));
  buttons.forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.go))));
  document.querySelector('.back').addEventListener('click', () => showStep(0));
})();
