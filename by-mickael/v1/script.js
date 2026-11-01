(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let keyboardMode = false;
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === ' ') {
      keyboardMode = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboardMode = false;
    root.classList.remove('keyboard');
  }, { passive: true });

  $$('[data-service]').forEach((button) => button.addEventListener('click', () => {
    $('#reserver').scrollIntoView({ behavior: reduceMotion.matches || keyboardMode ? 'auto' : 'smooth', block: 'start' });
  }));

  // Les animations sont ajoutées après l’initialisation fonctionnelle : sans JS, tout le texte reste visible.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  const revealed = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); } });
    }, { threshold: .12 });
    $$('.menu-row').forEach((row, index) => { row.style.transitionDelay = `${index % 3 * 60}ms`; });
    revealed.forEach((element) => revealObserver.observe(element));
  } else revealed.forEach((element) => element.classList.add('is-visible'));
  const mobileBar = $('.mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const targets = new Map([[$('.hero-action'), 'hero'], [$('#reserver'), 'booking'], [$('#pied-de-page'), 'footer']]);
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { visibility[targets.get(entry.target)] = entry.isIntersecting; });
      mobileBar.classList.toggle('is-hidden', visibility.hero || visibility.booking || visibility.footer);
    }, { threshold: 0 });
    mobileBar.classList.add('is-hidden');
    targets.forEach((value, target) => barObserver.observe(target));
  }
})();
