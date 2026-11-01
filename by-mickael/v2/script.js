(() => {
  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('ready'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerUsed = false;
  document.addEventListener('pointerdown', () => { pointerUsed = true; });
  document.addEventListener('keydown', () => { pointerUsed = false; });
  const tiles = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    tiles.forEach(tile => observer.observe(tile));
  } else tiles.forEach(tile => tile.classList.add('visible'));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    document.querySelectorAll('.price-row').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
  }));
  document.querySelectorAll('.price-row').forEach(row => row.addEventListener('click', () => {
    document.querySelector('#reservation').scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
  }));
})();
