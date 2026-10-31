/* Studio Lamy · « Affiche ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const EMAIL = 'studiolamy@proton.me';

  /* ---------- chaque ligne de l’affiche touche les bords ---------- */
  const lines = $$('[data-fit]');
  function fit() {
    lines.forEach((line) => {
      const inner = $('.poster__in', line);
      const avail = line.clientWidth;
      line.style.setProperty('--fs', '100px');
      const w = $('.poster__ink', inner).getBoundingClientRect().width;
      if (w > 0 && avail > 0) line.style.setProperty('--fs', Math.min((100 * avail) / w, window.innerWidth * 0.4).toFixed(1) + 'px');
    });
  }
  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('900 1em Archivo'), new Promise((r) => setTimeout(r, 1200))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => {
    fit();
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  });
  // police arrivée en retard : on réajuste sans saut visible (lignes masquées une image)
  if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', () => {
    if (!doc.body.classList.contains('is-ready')) { fit(); return; }
    const h1 = $('.poster');
    h1.style.opacity = '0';
    fit();
    requestAnimationFrame(() => { h1.style.opacity = ''; });
  });
  let fr = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(fr); fr = requestAnimationFrame(fit); }, { passive: true });

  /* ---------- menu mobile ---------- */
  const btn = $('.top__menu');
  const menu = $('#menu');
  if (btn && menu) {
    let timer;
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      btn.setAttribute('aria-expanded', String(open));
      $('.top__menu-label', btn).textContent = open ? 'Fermer' : 'Menu';
      [$('#main'), $('#foot')].forEach((n) => { if (n) n.inert = open; });
      if (open) {
        menu.hidden = false;
        root.style.overflow = 'hidden';
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
        const first = $('a', menu);
        if (first) first.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        root.style.overflow = '';
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 210);
        if (returnFocus) btn.focus();
      }
    };
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
    window.matchMedia('(min-width: 800px)').addEventListener('change', (e) => { if (e.matches && btn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
  }

  /* ---------- révélations (une seule fois) ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- le prix : 290 → 440, les chiffres roulent ---------- */
  const roll = $('[data-roll]');
  const optBtn = $('[data-opt]');
  if (roll && optBtn) {
    const build = (value) => {
      roll.innerHTML = String(value).split('').map(() => `<span class="roll__d">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span>`).join('');
    };
    const set = (value) => {
      const digits = String(value).split('');
      $$('.roll__d', roll).forEach((col, i) => { col.style.transform = `translateY(${-0.8 * +digits[i]}em)`; });
    };
    build(290);
    set(290);
    const line = $('[data-opt-line]');
    const live = $('[data-total-live]');
    optBtn.addEventListener('click', () => {
      const on = optBtn.getAttribute('aria-pressed') !== 'true';
      optBtn.setAttribute('aria-pressed', String(on));
      const total = on ? 440 : 290;
      set(total);
      if (line) line.classList.toggle('is-on', on);
      if (live) live.textContent = on ? 'Total\u202F: 440\u00A0€ HT, une fois, option comprise.' : 'Total\u202F: 290\u00A0€ HT, une fois.';
    });
  }

  /* ---------- languettes à détacher ---------- */
  const tabs = $$('[data-tab]');
  const tabLive = $('[data-tab-live]');
  const copy = async () => {
    try { await navigator.clipboard.writeText(EMAIL); return true; } catch (e) { return false; }
  };
  tabs.forEach((tab) => tab.addEventListener('click', async () => {
    const ok = await copy();
    if (tabLive) tabLive.textContent = ok ? `Adresse copiée\u202F: ${EMAIL}` : `Copie impossible. L’adresse\u202F: ${EMAIL}`;
    if (!ok) return;
    tab.classList.add('is-torn');
    const visible = tabs.filter((t) => !t.classList.contains('is-torn') && t.offsetParent !== null);
    const next = visible.find((t) => tabs.indexOf(t) > tabs.indexOf(tab)) || visible[0];
    if (next) { tabs.forEach((t) => t.setAttribute('tabindex', '-1')); next.removeAttribute('tabindex'); next.focus({ preventScroll: true }); }
    else { const m = $('.pform__send a'); if (m) m.focus({ preventScroll: true }); }
    setTimeout(() => tab.classList.add('is-gone'), reduce.matches ? 260 : 460);
  }));

  // une seule languette dans l’ordre de tabulation ; les flèches passent de l’une à l’autre
  tabs.forEach((tab) => tab.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const live = tabs.filter((t) => !t.classList.contains('is-torn') && t.offsetParent !== null);
    const i = live.indexOf(tab);
    const to = live[(i + (e.key === 'ArrowRight' ? 1 : -1) + live.length) % live.length];
    if (!to) return;
    e.preventDefault();
    tabs.forEach((t) => t.setAttribute('tabindex', '-1'));
    to.removeAttribute('tabindex');
    to.focus();
  }));

  /* ---------- le formulaire, honnête ---------- */
  const form = $('#pform');
  if (form) {
    const err = $('#p-err', form);
    const notice = $('#p-notice', form);
    const req = $$('[required]', form);
    req.forEach((i) => i.addEventListener('input', () => { if (i.value.trim()) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); } }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = req.filter((i) => !i.value.trim());
      req.forEach((i) => {
        if (missing.includes(i)) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', 'p-err'); }
        else { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); }
      });
      if (missing.length) { err.hidden = false; notice.hidden = true; missing[0].focus(); return; }
      err.hidden = true;
      notice.hidden = false;
      notice.setAttribute('tabindex', '-1');
      notice.focus();
    });
  }
})();
