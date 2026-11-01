/* Allure Barber · aperçu « Le dégradé ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';


  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  /* ---------- le mot-marque, ajusté à la largeur de la grille ---------- */
  const fits = $$('[data-fit]');
  function fit() {
    fits.forEach((el) => {
      const prop = el.dataset.fit || '--fit';
      const line = $('.wm__box, .foot__word', el);
      if (!line) return;
      el.style.removeProperty(prop);
      const size = parseFloat(getComputedStyle(el).fontSize);
      const w = line.getBoundingClientRect().width;
      const avail = el.clientWidth;
      if (!w || !avail) return;
      const max = parseFloat(getComputedStyle(root).fontSize) * 20;
      el.style.setProperty(prop, Math.min(max, (size * avail / w) * 0.996).toFixed(2) + 'px');
    });
  }
  let fitRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fit);
  }, { passive: true });

  /* ---------- entrée : la passe démarre quand Archivo est là (ou après 500 ms) ---------- */
  let ready = false;
  const start = () => {
    if (ready) return;
    ready = true;
    fit();
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  };
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(start);
    doc.fonts.load('820 1em "Archivo"').then(fit, () => {});
    doc.fonts.addEventListener('loadingdone', fit);
  }
  setTimeout(start, 500);

  let barUpdate = () => {};

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu'), $('[data-bar]'), $('.mark'), $('.top__cta')].filter(Boolean);
    let timer;
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.top__menu-label', menuBtn).textContent = open ? 'Fermer' : 'Menu';
      outside().forEach((n) => { n.inert = open; });
      if (open) {
        menu.style.setProperty('--menu-top', Math.max(0, $('#top').getBoundingClientRect().bottom) + 'px');
        menu.hidden = false;
        root.style.overflow = 'hidden';
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
        const first = $('a', menu);
        if (first) first.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        root.style.overflow = '';
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 280);
        barUpdate();
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => {
      const on = !seen.hero && !seen.book && !seen.foot;
      bar.classList.toggle('is-on', on);
      if (menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') return;
      bar.inert = !on;
    };
    barUpdate = update;
    bar.inert = true;
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.hero__cta', 'hero');
    watch('#reserver', 'book');
    watch('#foot', 'foot');
  }

  /* ---------- copier l’adresse ---------- */
  $$('[data-copy]').forEach((b) => {
    const label = b.textContent;
    let t;
    b.addEventListener('click', async () => {
      const live = $('[data-copy-live]');
      clearTimeout(t);
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Adresse copiée';
        if (live) live.textContent = 'Adresse copiée dans le presse-papiers.';
      } catch (err) {
        if (live) live.textContent = 'Copie impossible. Adresse\u00a0: ' + b.dataset.copy;
      }
      t = setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

})();
