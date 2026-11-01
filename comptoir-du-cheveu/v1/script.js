(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const services = [
    ['coupe-soin', 'Shampoing, coupe, soin et coiffage'],
    ['transfo', 'BIG TRANSFO'],
    ['coiffage', 'Shampoing et coiffage'],
    ['coupe-homme', 'Coupe homme'],
    ['coupe-barbe', 'Coupe et barbe'],
    ['barbe', 'Taille de barbe']
  ];
  const options = $('#service-options');
  for (const [id, nom] of services) {
    const label = document.createElement('label');
    label.className = 'choice-label';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'prestation'; input.value = id;
    const contenu = document.createElement('span'); contenu.className = 'choice-content'; contenu.textContent = nom;
    label.append(input, contenu); options.append(label);
    input.addEventListener('change', () => { $('#summary-service').textContent = nom; });
  }
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    const input = options.querySelector(`input[value="${link.dataset.service}"]`);
    if (input) { input.checked = true; input.dispatchEvent(new Event('change')); }
  }));
  document.addEventListener('keydown', () => root.classList.add('keyboard-mode'), true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-mode'), true);

  const revealTargets = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    $$('.menu-row').forEach((row, index) => { row.style.transitionDelay = `${(index % 3) * 50}ms`; });
    revealTargets.forEach(target => revealObserver.observe(target));

    const mobileBar = $('.mobile-bar');
    const visibility = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      mobileBar.classList.toggle('is-away', [...visibility.values()].some(Boolean));
    }, { threshold: 0 });
    ['#actions-hero', '#booking-app', '#pied-de-page'].forEach(selector => barObserver.observe($(selector)));
  } else { revealTargets.forEach(target => target.classList.add('is-visible')); }

  // L’activation à la fin évite de masquer la page si l’initialisation échoue.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
