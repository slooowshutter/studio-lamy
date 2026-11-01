/* Hi Happiness · aperçu. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';


  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));

  /* ---------- heure de Paris ---------- */
  const partsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function paris(d = new Date()) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  }
  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- entrée ---------- */
  // le titre attend la police (700 ms au plus) pour ne pas changer de fonte en montant
  const fontsReady = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 700))]) : Promise.resolve();
  fontsReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))));

  /* ---------- horaires : aujourd’hui ---------- */
  (function week() {
    $$('.wk').forEach((r, i) => r.style.setProperty('--i', i));
    const { dow } = today();
    const row = $(`.wk[data-dow="${dow}"]`);
    if (!row) return;
    row.classList.add('is-today');
    const name = $('.sr-only', row);
    if (name) name.textContent += ', aujourd’hui';
  })();

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu')].filter(Boolean);
    let timer;
    const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Menu');
      outside().forEach((n) => { n.inert = open; });
      const bar = $('[data-bar]');
      if (bar) bar.inert = open || !bar.classList.contains('is-on');
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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 230);
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(!isOpen(), true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    $('#top').addEventListener('click', (e) => { if (isOpen() && e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setMenu(false, true);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches && isOpen()) setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
  $$('[data-reveal="rows"]').forEach((g) => $$('.item', g).forEach((el, i) => el.style.setProperty('--i', i)));
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- un lien vers une question l’ouvre ---------- */
  $$('a[href^="#q-"]').forEach((a) => a.addEventListener('click', () => {
    const d = $(a.getAttribute('href'));
    if (d && d.tagName === 'DETAILS') d.open = true;
  }));

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => {
      const on = !seen.hero && !seen.book && !seen.foot;
      bar.classList.toggle('is-on', on);
      bar.inert = !on;
    };
    bar.inert = true;
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.hero', 'hero');
    watch('#reserver', 'book');
    watch('#foot', 'foot');
  }

  /* ---------- copier l’adresse ---------- */
  $$('[data-copy]').forEach((b) => {
    const label = b.textContent;
    b.addEventListener('click', async () => {
      const live = $('[data-copy-live]');
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Adresse copiée';
        if (live) live.textContent = 'Adresse copiée dans le presse-papiers.';
      } catch (err) {
        if (live) live.textContent = 'Copie impossible. Adresse : ' + b.dataset.copy;
      }
      setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

  /* familles de soins : flèches sur téléphone */
  const famsEl = $('#fams');
  const famBtns = $$('[data-fams]');
  if (famsEl && famBtns.length) {
    let fr = 0;
    const sync = () => {
      fr = 0;
      const max = famsEl.scrollWidth - famsEl.clientWidth - 2;
      famBtns.forEach((b) => { b.disabled = +b.dataset.fams < 0 ? famsEl.scrollLeft <= 2 : famsEl.scrollLeft >= max; });
    };
    famBtns.forEach((b) => b.addEventListener('click', () => {
      famsEl.scrollBy({ left: +b.dataset.fams * famsEl.clientWidth * 0.86, behavior: reduce.matches ? 'auto' : 'smooth' });
    }));
    famsEl.addEventListener('scroll', () => { if (!fr) fr = requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
})();
