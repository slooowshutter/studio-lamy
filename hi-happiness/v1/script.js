/* Hi Happiness · aperçu. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';


  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
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

  /* ---------- la glace : « Hi » s’essuie quand on la voit, une fois ---------- */
  const glace = $('[data-glace]');
  if (glace) {
    const svg = $('.glace__svg', glace);
    if ('IntersectionObserver' in window && svg) {
      const gio = new IntersectionObserver((entries) => {
        const seen = entries.some((e) => e.isIntersecting && (e.intersectionRatio >= 0.55 || e.intersectionRect.height >= window.innerHeight * 0.5));
        if (seen) { glace.classList.add('is-wiped'); gio.disconnect(); }
      }, { threshold: [0, 0.3, 0.55] });
      gio.observe(svg);
    } else {
      glace.classList.add('is-wiped');
    }

    // au curseur (souris seulement) : on essuie la buée, elle revient en deux secondes
    const trail = $('[data-trail]', glace);
    if (svg && trail && window.DOMPoint) {
      const NS = 'http://www.w3.org/2000/svg';
      let pending = null;
      let raf = 0;
      let last = null;
      const draw = () => {
        raf = 0;
        if (!pending) return;
        const m = svg.getScreenCTM();
        if (!m) return;
        const p = new DOMPoint(pending.clientX, pending.clientY).matrixTransform(m.inverse());
        pending = null;
        if (last && Math.hypot(p.x - last.x, p.y - last.y) < 9) return;
        last = p;
        const c = doc.createElementNS(NS, 'circle');
        c.setAttribute('cx', p.x.toFixed(1));
        c.setAttribute('cy', p.y.toFixed(1));
        c.setAttribute('r', '26');
        c.setAttribute('fill', 'url(#dab)');
        c.setAttribute('class', 'dab');
        trail.appendChild(c);
        while (trail.childElementCount > 90) trail.firstElementChild.remove();
        setTimeout(() => c.classList.add('is-fog'), 900);
        setTimeout(() => c.remove(), 2900);
      };
      svg.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !fine.matches || reduce.matches) return;
        pending = e;
        if (!raf) raf = requestAnimationFrame(draw);
      }, { passive: true });
      svg.addEventListener('pointerleave', () => { last = null; }, { passive: true });
    }
  }

  /* ---------- horaires : aujourd’hui ---------- */
  (function week() {
    $$('.wk').forEach((r, i) => r.style.setProperty('--i', i));
    const { dow } = today();
    const row = $(`.wk[data-dow="${dow}"]`);
    if (!row) return;
    row.classList.add('is-today');
    const th = $('th', row);
    if (th) th.insertAdjacentHTML('beforeend', '<span class="wk__today"><span class="sr-only">, </span>aujourd’hui</span>');
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

})();
