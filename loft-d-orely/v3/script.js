(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileView = window.matchMedia('(max-width: 760px)');
  const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';

  function setupMenu() {
    const trigger = $('.menu-toggle');
    const menu = $('#mobile-menu');
    if (!trigger || !menu) return;
    let closeTimer = 0;

    function setOpen(open, restoreFocus = false) {
      window.clearTimeout(closeTimer);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        menu.hidden = false;
        menu.classList.add('is-opening');
        requestAnimationFrame(() => menu.classList.remove('is-opening'));
        const firstLink = $('a', menu);
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else {
        menu.classList.add('is-opening');
        closeTimer = window.setTimeout(() => {
          menu.hidden = true;
          menu.classList.remove('is-opening');
        }, reduceMotion.matches ? 0 : 200);
        if (restoreFocus) trigger.focus({ preventScroll: true });
      }
    }

    trigger.addEventListener('click', () => setOpen(trigger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', (event) => {
      if (trigger.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
    });
  }

  function setupReveals() {
    const hero = $('.hero');
    const figure = $('[data-hero-figure]');
    requestAnimationFrame(() => {
      if (hero) hero.classList.add('hero--entered');
      if (figure) figure.classList.add('is-entered');
    });

    const revealTargets = $$('.reveal-clip, .reveal-line, .reveal-x, [data-reveal]');
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach((node) => node.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        node.classList.add('is-revealed');
        if (node.matches('[data-reveal="rows"]')) node.querySelectorAll('.service-row').forEach((row) => row.classList.add('is-revealed'));
        activeObserver.unobserve(node);
      });
    }, { threshold: .14, rootMargin: '0px 0px -5% 0px' });
    revealTargets.forEach((node) => observer.observe(node));
  }

  function setupMobileBar() {
    const bar = $('[data-mobile-bar]');
    const heroCta = $('[data-hero-cta]');
    const blockedAreas = [$('#rendez-vous'), $('.site-footer')].filter(Boolean);
    if (!bar || !heroCta || !('IntersectionObserver' in window)) return;
    let heroIsOut = false;
    let areaIsBlocked = false;

    const update = () => {
      const menuOpen = $('.menu-toggle')?.getAttribute('aria-expanded') === 'true';
      const visible = mobileView.matches && heroIsOut && !areaIsBlocked && !menuOpen;
      bar.hidden = !visible;
      document.body.classList.toggle('has-mobile-bar', visible);
    };

    const heroObserver = new IntersectionObserver(([entry]) => {
      heroIsOut = !entry.isIntersecting;
      update();
    }, { threshold: .05 });
    heroObserver.observe(heroCta);

    let intersections = 0;
    const blockedObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { intersections += entry.isIntersecting ? 1 : -1; });
      intersections = Math.max(0, intersections);
      areaIsBlocked = intersections > 0;
      update();
    }, { threshold: 0 });
    blockedAreas.forEach((node) => blockedObserver.observe(node));
    mobileView.addEventListener('change', update);
    $('.menu-toggle')?.addEventListener('click', () => window.setTimeout(update, 0));
    update();
  }

  setupMenu();
  setupReveals();
  setupMobileBar();
  window.__site = true;
})();
