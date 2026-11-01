/* Le loft d’Orely — présentation du salon. */
(() => {
  'use strict';
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', event => {
    if (['Tab','Enter',' ','ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard');
    }
  });
  document.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('keyboard'); }, { passive: true });

  const revealItems = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const rows = entries.filter(entry => entry.isIntersecting);
      rows.forEach((entry, index) => {
        entry.target.style.transitionDelay = `${Math.min(index, 4) * 60}ms`;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('entered')));

  const mobileBar = $('#mobile-bar');
  if ('IntersectionObserver' in window) {
    const visibility = { hero: true, booking: false, footer: false };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'hero-actions') visibility.hero = entry.isIntersecting;
        if (entry.target.id === 'reserver') visibility.booking = entry.isIntersecting;
        if (entry.target.id === 'pied') visibility.footer = entry.isIntersecting;
      });
      mobileBar.hidden = visibility.hero || visibility.booking || visibility.footer;
    });
    ['hero-actions','reserver','pied'].forEach(id => observer.observe($(`#${id}`)));
  }
  window.loftReady = true;
})();
