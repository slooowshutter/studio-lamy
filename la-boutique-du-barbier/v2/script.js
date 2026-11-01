(() => {
  document.documentElement.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboardAction = false;
  document.addEventListener('keydown', () => { keyboardAction = true; });
  document.addEventListener('pointerdown', () => { keyboardAction = false; });
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('visible'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    document.querySelectorAll('.catalogue-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));

  const first = document.querySelector('#step-one');
  const second = document.querySelector('#step-two');
  const summary = document.querySelector('#summary');
  const count = document.querySelector('#step-count');
  const error = document.querySelector('#choice-error');
  const choices = document.querySelectorAll('input[name="sujet"]');
  choices.forEach(choice => choice.addEventListener('change', () => { summary.textContent = choice.value; error.textContent = ''; }));
  function showStep(from, to, number) {
    from.hidden = true;
    to.hidden = false;
    count.textContent = number;
    if (!reduced.matches && !keyboardAction) {
      to.classList.add('entering');
      requestAnimationFrame(() => requestAnimationFrame(() => to.classList.remove('entering')));
    }
    to.querySelector('h3').focus({ preventScroll: true });
  }
  document.querySelector('#continue').addEventListener('click', () => {
    const selected = document.querySelector('input[name="sujet"]:checked');
    if (!selected) { error.textContent = 'Choisissez un sujet pour continuer.'; choices[0].focus(); return; }
    document.querySelector('#recap').textContent = selected.value;
    showStep(first, second, '02 / 02');
  });
  document.querySelector('#back').addEventListener('click', () => showStep(second, first, '01 / 02'));
})();
