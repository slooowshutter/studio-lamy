(() => {
  'use strict';

  document.documentElement.classList.replace('no-js', 'js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const hero = $('.hero');
  const heroDrawing = $('.hero__water');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero?.classList.add('is-ready');
    heroDrawing?.classList.add('is-drawn');
  }));

  const revealTargets = $$('[data-reveal]');
  const drawings = $$('.signature__line, .street-figure');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible', 'is-drawn');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
    [...new Set([...revealTargets, ...drawings])].forEach((element) => revealObserver.observe(element));
  } else {
    [...revealTargets, ...drawings].forEach((element) => element.classList.add('is-visible', 'is-drawn'));
  }

  const mobileBar = $('[data-mobile-bar]');
  if (mobileBar && 'IntersectionObserver' in window) {
    const sections = { hero: true, booking: false, footer: false };
    const updateBar = () => {
      const visible = !sections.hero && !sections.booking && !sections.footer;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.toggleAttribute('inert', !visible);
      mobileBar.setAttribute('aria-hidden', String(!visible));
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const key = entry.target === hero ? 'hero' : entry.target.id === 'rendez-vous' ? 'booking' : 'footer';
        sections[key] = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.01 });
    if (hero) barObserver.observe(hero);
    const bookingSection = $('#rendez-vous');
    const footer = $('.site-footer');
    if (bookingSection) barObserver.observe(bookingSection);
    if (footer) barObserver.observe(footer);
  } else if (mobileBar) {
    mobileBar.classList.add('is-visible');
    mobileBar.removeAttribute('inert');
    mobileBar.setAttribute('aria-hidden', 'false');
  }

  const form = $('#booking-form');
  if (!form) return;

  const summary = $('[data-summary="service"]');
  const choose = (input) => {
    if (!input) return;
    input.checked = true;
    summary.textContent = $('.option-name', input.closest('label')).textContent;
  };
  form.addEventListener('change', (event) => {
    if (event.target.name === 'service') choose(event.target);
  });
  form.addEventListener('submit', (event) => event.preventDefault());
  $$('[data-book]').forEach((button) => button.addEventListener('click', () => {
    choose($(`input[name="service"][value="${button.dataset.book}"]`, form));
    $('#rendez-vous').scrollIntoView({ behavior: 'auto' });
  }));
  $('[data-summary="day"]').textContent = 'Sur appel';
  $('[data-summary="time"]').textContent = 'Sur appel';
})();
