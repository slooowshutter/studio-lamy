document.documentElement.classList.add('js');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function startEntrance() { requestAnimationFrame(() => document.body.classList.add('is-ready')); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startEntrance, { once: true });
else startEntrance();
const revealItems = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  revealItems.forEach(item => revealObserver.observe(item));
} else revealItems.forEach(item => item.classList.add('is-visible'));
document.querySelectorAll('input[name="service"]').forEach(input => input.addEventListener('change', () => {
  document.querySelector('#summary-service').textContent = input.dataset.title;
}));

document.querySelector('#booking-form').addEventListener('submit', event => event.preventDefault());
