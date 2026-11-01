/* Cabeleira · proposition 3. Vanilla, sans dépendance. Moteur de réservation repris de la proposition 1. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Cabeleira',
    address: '167 avenue de Flandre, 75019 Paris',
    phone: '01 44 53 93 86',
    step: 30,
    days: 14,
    uid: 'apercu.cabeleira',
    ics: 'rdv-cabeleira.ics'
  };

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n}${NB}${n > 1 ? many : one}`;
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- jours fériés (France métropolitaine) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day, 12);
  }
  const holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    const e = easter(y);
    const DAY = 864e5;
    const set = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((md) => `${y}-${md}`));
    [1, 39, 50].forEach((n) => set.add(iso(e + n * DAY)));
    return (holidayCache[y] = set);
  }
  const isHoliday = (date) => holidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));

  /* ---------- entrée : seulement quand la police est là ---------- */
  let ready = false;
  const go2 = () => {
    if (ready) return;
    ready = true;
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
    setTimeout(() => $$('.nx.is-flip').forEach((n) => n.classList.remove('is-flip')), 890);
  };
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(go2);
  }
  setTimeout(go2, 500);



  /* ---------- horloge de Paris (en-tête, décorative) ---------- */
  const clockEl = $('[data-clock]');
  const tick = () => { if (!clockEl) return; const p = paris(); clockEl.textContent = String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); };
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000) + 50);

  /* ---------- filtre des prestations ---------- */
  const chips = $$('[data-filter]');
  const fLive = $('[data-filter-live]');
  chips.forEach((c) => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const body = $('.dep tbody');
    if (body) body.classList.add('is-filtered');
    let n = 0;
    $$('.dep tr.pt').forEach((r) => {
      const on = f === 'all' || r.dataset.cat.split(' ').includes(f);
      if (on && r.hidden) {
        r.classList.add('is-fresh');
        r.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('is-fresh')));
      } else if (!on) r.hidden = true;
      if (on) n++;
    });
    if (fLive) fLive.textContent = `${n} prestation${n > 1 ? 's' : ''} affichée${n > 1 ? 's' : ''}.`;
  }));

  let barUpdate = () => {};

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu'), $('[data-bar]'), $('.top__mark'), $('.top__cta')].filter(Boolean);
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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 250);
        barUpdate();
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
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

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => {
      const on = !seen.hero && !seen.book && !seen.foot;
      bar.classList.toggle('is-on', on);
      // hors écran = hors d’atteinte au clavier
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
    watch('.hero', 'hero');
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
        if (live) live.textContent = 'Copie impossible. Adresse : ' + b.dataset.copy;
      }
      t = setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

})();
