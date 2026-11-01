(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.addEventListener('keydown', () => root.classList.add('keyboard-action'), true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-action'), true);
  const summary = document.querySelector('[data-summary="service"]');
  const inputs = document.querySelectorAll('input[name="service"]');
  inputs.forEach(input => input.addEventListener('change', () => { summary.textContent = input.dataset.name; }));
  document.querySelectorAll('a[data-service]').forEach(link => link.addEventListener('click', () => {
    const input = document.querySelector(`input[name="service"][value="${link.dataset.service}"]`);
    if (input) { input.checked = true; summary.textContent = input.dataset.name; }
  }));
  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .13, rootMargin: '0px 0px -20px 0px' });
    revealElements.forEach(element => observer.observe(element));
  } else revealElements.forEach(element => element.classList.add('is-visible'));
  window.__atelierReady = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();

document.querySelector('#booking-form').addEventListener('submit', event => event.preventDefault());
