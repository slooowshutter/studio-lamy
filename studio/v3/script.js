/* Studio Lamy · « Bon de commande ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));

  /* ---------- menu mobile ---------- */
  const btn = $('.head__menu');
  const menu = $('#menu');
  if (btn && menu) {
    let timer;
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      btn.setAttribute('aria-expanded', String(open));
      $('.head__menu-label', btn).textContent = open ? 'Fermer' : 'Menu';
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
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches && btn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
  }

  /* ---------- révélations (une seule fois) ---------- */
  $$('.cases .case').forEach((c, i) => c.style.setProperty('--i', i));
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- le bon : cocher l’option tape la ligne ---------- */
  const opt = $('[data-opt]');
  if (opt) {
    const typedEl = $('.tick__label [data-typed]');
    const full = typedEl.dataset.typed;
    typedEl.setAttribute('aria-hidden', 'true');
    typedEl.insertAdjacentHTML('afterend', `<span class="sr-only">${full}</span>`);
    const q = $('[data-opt-q]');
    const m = $('[data-opt-m]');
    const total = $('[data-total]');
    const live = $('[data-total-live]');
    let timer = 0;
    // le reste de la ligne garde sa place (invisible) : rien ne saute pendant la frappe
    const type = (el, text, done) => {
      clearInterval(timer);
      if (reduce.matches) { el.textContent = text; if (done) done(); return; }
      el.innerHTML = '<span class="t-on"></span><span class="t-off"></span>';
      const on = el.firstChild;
      const off = el.lastChild;
      off.textContent = text;
      let i = 0;
      timer = setInterval(() => {
        i += 1;
        on.textContent = text.slice(0, i);
        off.textContent = text.slice(i);
        if (i >= text.length) { clearInterval(timer); el.textContent = text; if (done) done(); }
      }, 25);
    };
    const setTotal = (v) => {
      total.classList.add('is-swap');
      setTimeout(() => { total.textContent = v; total.classList.remove('is-swap'); }, reduce.matches ? 0 : 120);
    };
    opt.addEventListener('change', () => {
      if (opt.checked) {
        typedEl.classList.add('is-typed');
        type(typedEl, full, () => { q.textContent = '1'; m.textContent = '150,00'; setTotal('440,00'); });
        live.textContent = 'Option ajoutée. Total : 440,00 € HT, à régler seulement si vous gardez le site.';
      } else {
        clearInterval(timer);
        typedEl.classList.remove('is-typed');
        typedEl.textContent = full;
        q.textContent = '—';
        m.textContent = '—';
        setTotal('290,00');
        live.textContent = 'Option retirée. Total : 290,00 € HT.';
      }
    });
  }

  /* ---------- les bons remplis : une pile qu’on feuillette ---------- */
  const stack = $('[data-stack]');
  const nav = $('[data-stack-nav]');
  if (stack && nav) {
    const slips = $$('[data-slip]', stack);
    const pos = $('[data-pos]', nav);
    let order = slips.map((_, i) => i);
    const layout = (announce) => {
      order.forEach((idx, p) => {
        const s = slips[idx];
        s.dataset.p = String(p);
        s.style.setProperty('--p', p);
        s.inert = p !== 0;
        if (p !== 0) s.setAttribute('aria-hidden', 'true'); else s.removeAttribute('aria-hidden');
      });
      if (announce) pos.textContent = `${order[0] + 1} / ${slips.length}`;
    };
    let busy = false;
    // suivant : le bon du dessus glisse hors de la pile, puis passe dessous
    const next = () => {
      if (busy) return;
      const top = slips[order[0]];
      if (reduce.matches) { order.push(order.shift()); layout(true); return; }
      busy = true;
      top.classList.add('is-out');
      setTimeout(() => { top.classList.remove('is-out'); order.push(order.shift()); layout(true); busy = false; }, 180);
    };
    // précédent : le dernier bon revient par la gauche, sur le dessus
    const prev = () => {
      if (busy) return;
      const last = slips[order[order.length - 1]];
      if (!reduce.matches) {
        last.style.transition = 'none';
        last.classList.add('is-out');
        last.getBoundingClientRect();
        last.style.transition = '';
      }
      order.unshift(order.pop());
      layout(true);
      requestAnimationFrame(() => last.classList.remove('is-out'));
    };
    nav.hidden = false;
    $('[data-next]', nav).addEventListener('click', next);
    $('[data-prev]', nav).addEventListener('click', prev);
    let x0 = null;
    stack.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
    stack.addEventListener('pointerup', (e) => {
      if (x0 == null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (dx < -50) next(); else if (dx > 50) prev();
    });
    stack.addEventListener('pointercancel', () => { x0 = null; });
    layout(false);
  }

  /* ---------- votre demande : honnête ---------- */
  const form = $('#demande-form');
  if (form) {
    const err = $('#d-err', form);
    const notice = $('#d-notice', form);
    const req = $$('[required]', form);
    req.forEach((i) => i.addEventListener('input', () => { if (i.value.trim()) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); } }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = req.filter((i) => !i.value.trim());
      req.forEach((i) => {
        if (missing.includes(i)) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', 'd-err'); }
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
