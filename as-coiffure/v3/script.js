/* AS Coiffure · proposition 3 « Le mur ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'AS Coiffure',
    address: '15 place Catinat, 59800 Lille',
    phone: '03 20 54 01 04',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    // Planity, relevé le 30/10/2026 : lun–ven 9 h 30 – 19 h, samedi 8 h – 13 h (9 h selon un annuaire), dimanche fermé.
    hours: { 0: null, 1: [570, 1140], 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: null },
    satFlag: 6,
    grid: [480, 1140], // l'emploi du temps va de 8 h à 19 h
    step: 30,
    days: 14,
    uid: 'apercu-v3.as-coiffure',
    ics: 'rdv-as-coiffure.ics',
  };

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  /* ---------- heure de Paris (Lille) ---------- */
  const partsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function paris(d = new Date()) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  }
  // « 9 h 30 », « 14 h » : l’heure à la française
  const hfr = (m) => {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    return mi ? `${h}${NB}h${NB}${String(mi).padStart(2, '0')}` : `${h}${NB}h`;
  };
  const iso = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dur = (m) => (m < 60 ? `${m}${NB}min` : `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + String(m % 60).padStart(2, '0') : ''}`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n}${NB}${n > 1 ? many : one}`;
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dayNum = (d) => (d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate()));

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, date, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* jours fériés (métropole) : on les signale, horaires à confirmer */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day, 12);
  }
  const holidayCache = {};
  function isHoliday(date) {
    const y = date.getUTCFullYear();
    if (!holidayCache[y]) {
      const e = easter(y);
      const add = (n) => new Date(e + n * 864e5).toISOString().slice(0, 10);
      holidayCache[y] = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((s) => `${y}-${s}`).concat([add(1), add(39), add(50)]));
    }
    return holidayCache[y].has(date.toISOString().slice(0, 10));
  }
  const addDays = (date, n) => new Date(date.getTime() + n * 864e5);

  /* ---------- entrée ---------- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) {
    Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 300))]).then(ready);
  } else {
    ready();
  }

  /* ---------- aujourd’hui dans le tableau des horaires ---------- */
  (function markToday() {
    const row = $(`.hours__table tr[data-dow="${today().dow}"]`);
    if (!row) return;
    row.classList.add('is-today');
    const th = $('th', row);
    if (th) th.insertAdjacentHTML('beforeend', '<span class="today-tag">aujourd’hui</span>');
  })();

  /* ---------- ouvert / fermé (recalculé chaque minute) ---------- */


  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu'), $('[data-bar]'), $('.top__mark')].filter(Boolean);
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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 230);
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
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.hero && !seen.book && !seen.foot);
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.wall--hero', 'hero');
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
        if (live) live.textContent = `Copie impossible. L’adresse${NB}: ${b.dataset.copy}`;
      }
      setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

})();
