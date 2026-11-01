(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.entrance').forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 65, 325)}ms`;
    requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('shown')));
  });
  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('shown'); observer.unobserve(entry.target); }
    }), {threshold: .15});
    reveal.forEach((item, index) => { item.style.transitionDelay = `${index * 70}ms`; observer.observe(item); });
    window.setTimeout(() => reveal.forEach(item => item.classList.add('shown')), 1800);
  } else reveal.forEach(item => item.classList.add('shown'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    const rows = Array.from(document.querySelectorAll('.service-row'));
    rows.forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
    const count = rows.filter(row => !row.hidden).length;
    document.getElementById('filter-status').textContent = `${count} prestation${count > 1 ? 's' : ''} affichée${count > 1 ? 's' : ''}.`;
  }));
  const one = document.getElementById('step-one');
  const two = document.getElementById('step-two');
  const error = document.getElementById('booking-error');
  const stepNumber = document.getElementById('step-number');
  let changing = false;
  function showStep(next) {
    if (changing) return;
    const current = one.hidden ? two : one;
    if (current === next) return;
    changing = true;
    const finish = () => {
      current.hidden = true;
      current.classList.remove('leaving');
      next.hidden = false;
      stepNumber.textContent = next === one ? '01 / 02' : '02 / 02';
      next.classList.remove('enter');
      void next.offsetWidth;
      next.classList.add('enter');
      next.querySelector('h3').focus({preventScroll:true});
      changing = false;
    };
    if (reduced) finish();
    else { current.classList.add('leaving'); window.setTimeout(finish, 180); }
  }
  document.getElementById('continue').addEventListener('click', () => {
    const selected = document.querySelector('input[name="prestation"]:checked');
    if (!selected) { error.textContent = 'Choisissez une prestation pour continuer.'; return; }
    error.textContent = '';
    document.getElementById('chosen-service').textContent = selected.value;
    showStep(two);
  });
  document.getElementById('back').addEventListener('click', () => showStep(one));
  document.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change', () => { error.textContent = ''; }));
  document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
    const input = Array.from(document.querySelectorAll('input[name="prestation"]')).find(item => item.value === button.dataset.service);
    if (input) input.checked = true;
    error.textContent = '';
    one.hidden = false; two.hidden = true; stepNumber.textContent = '01 / 02';
    document.getElementById('reservation').scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
    input.focus({preventScroll:true});
  }));
})();
