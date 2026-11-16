(() => {
  'use strict';
  const root = document.documentElement;
  root.classList.add('js');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const entries = document.querySelectorAll('.entrance');
  entries.forEach((tile, index) => { tile.style.setProperty('--delay', `${index * 70}ms`); });
  requestAnimationFrame(() => entries.forEach(tile => tile.classList.add('is-visible')));
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !motion.matches) {
    const observer = new IntersectionObserver((items) => items.forEach(item => {
      if (item.isIntersecting) { item.target.classList.add('is-visible'); observer.unobserve(item.target); }
    }), { threshold: 0.08 });
    reveals.forEach(item => observer.observe(item));
  } else reveals.forEach(item => item.classList.add('is-visible'));

  const steps = [...document.querySelectorAll('.booking-step')];
  const count = document.querySelector('#step-count');
  const selected = () => document.querySelector('input[name="prestation"]:checked');
  function showStep(number) {
    steps.forEach(step => { step.hidden = Number(step.dataset.step) !== number; step.classList.remove('arriving'); });
    const active = steps[number - 1];
    void active.offsetWidth;
    active.classList.add('arriving');
    count.textContent = `0${number} / 03`;
    active.querySelector('h3').focus();
  }
  document.querySelector('#to-details').addEventListener('click', () => {
    if (!selected()) { document.querySelector('#choice-error').textContent = 'Choisissez une prestation pour continuer.'; return; }
    document.querySelector('#choice-error').textContent = '';
    document.querySelector('#selection-text').textContent = selected().value;
    showStep(2);
  });
  document.querySelectorAll('input[name="prestation"]').forEach(input => input.addEventListener('change', () => { document.querySelector('#choice-error').textContent = ''; }));
  document.querySelector('#to-confirm').addEventListener('click', () => {
    document.querySelector('#final-selection').textContent = selected().value;
    showStep(3);
  });
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
    const input = [...document.querySelectorAll('input[name="prestation"]')].find(item => item.value === link.dataset.service);
    if (input) input.checked = true;
    document.querySelector('#choice-error').textContent = '';
    showStep(1);
  }));
})();
