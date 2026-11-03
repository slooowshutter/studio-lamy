/* Studio Lamy · « Édition ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 900px)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));

  /* ---------- entrée : les lignes du titre montent, une fois la police prête ---------- */
  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('350 1em Newsreader'), new Promise((r) => setTimeout(r, 700))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))));

  /* ---------- titre courant : la section en cours ---------- */
  const now = $('[data-now]');
  if (now && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) now.textContent = e.target.dataset.title || ''; });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-title]').forEach((s) => io.observe(s));
  }

  /* ---------- sommaire mobile ---------- */
  const btn = $('.rh__menu');
  const menu = $('#menu');
  if (btn && menu) {
    let timer;
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      btn.setAttribute('aria-expanded', String(open));
      $('.rh__menu-label', btn).textContent = open ? 'Fermer' : 'Sommaire';
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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 230);
        if (returnFocus) btn.focus();
      }
    };
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && btn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
  }

  /* ---------- révélations (une seule fois) ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- fiche spécimen : suit le pointeur avec un léger retard ---------- */
  const spec = $('[data-spec-card]');
  if (spec) {
    const cards = $$('.spec__card', spec);
    const pos = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let on = false;
    const show = (key) => {
      cards.forEach((c) => c.classList.toggle('is-active', c.dataset.specFor === key));
      spec.classList.add('is-on');
      on = true;
    };
    const hide = () => { spec.classList.remove('is-on'); on = false; };
    const tick = () => {
      const k = reduce.matches ? 1 : 0.18;
      pos.x += (pos.tx - pos.x) * k;
      pos.y += (pos.ty - pos.y) * k;
      spec.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
      if (on && (Math.abs(pos.tx - pos.x) > 0.3 || Math.abs(pos.ty - pos.y) > 0.3)) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const target = (x, y, jump) => {
      const w = 240;
      const h = 304;
      pos.tx = x > window.innerWidth - w - 60 ? x - 28 - w : x + 28;
      pos.ty = Math.max(56, Math.min(window.innerHeight - h - 16, y - h / 2));
      if (jump) { pos.x = pos.tx; pos.y = pos.ty; }
      if (!raf) raf = requestAnimationFrame(tick);
    };
    $$('.index__row').forEach((row) => {
      row.addEventListener('pointerenter', (e) => {
        if (!fine.matches || e.pointerType !== 'mouse') return;
        const first = !on;
        show(row.dataset.spec);
        target(e.clientX, e.clientY, first);
      });
      row.addEventListener('pointermove', (e) => {
        if (!fine.matches || e.pointerType !== 'mouse') return;
        if (!on) { show(row.dataset.spec); target(e.clientX, e.clientY, true); }
        else target(e.clientX, e.clientY, false);
      });
      row.addEventListener('pointerleave', (e) => {
        const next = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.index__row') : null;
        if (!next) hide();
      });
      row.addEventListener('focus', () => {
        if (!fine.matches || !row.matches(':focus-visible')) return;
        const r = row.getBoundingClientRect();
        show(row.dataset.spec);
        target(r.left + r.width * 0.42, r.bottom + 164, true);
      });
      row.addEventListener('blur', hide);
    });
    window.addEventListener('scroll', () => { if (on) hide(); }, { passive: true });
  }


  /* ---------- la lettre ---------- */
  const form = $('#letter');
  if (form) {
    const blanks = $$('input.blank', form);
    // Sans field-sizing : le blanc grandit avec son contenu
    if (!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'))) {
      blanks.forEach((i) => {
        const min = +i.getAttribute('size') || 8;
        const fit = () => { i.size = Math.max(min, Math.min(40, (i.value || '').length + 1)); };
        i.addEventListener('input', fit);
        fit();
      });
    }
    const err = $('#l-err', form);
    const notice = $('#l-notice', form);
    const ok = $('#l-ok', form);
    const submit = $('[data-submit]', form);
    const required = blanks.filter((i) => i.required);
    required.forEach((i) => i.addEventListener('input', () => {
      if (i.value.trim()) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); }
    }));
    const copyBtn = $('[data-copy]', form);
    if (copyBtn) copyBtn.addEventListener('click', () => {
      const copy = $('#l-copy', form);
      const done = () => { const c = $('[data-copied]', form); if (c) c.hidden = false; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copy.value).then(done, () => { copy.select(); });
      else { copy.select(); try { if (doc.execCommand('copy')) done(); } catch (_) {} }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const missing = required.filter((i) => !i.value.trim());
      required.forEach((i) => {
        const bad = missing.includes(i);
        if (bad) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', 'l-err'); }
        else { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); }
      });
      if (missing.length) {
        err.hidden = false;
        notice.hidden = true;
        ok.hidden = true;
        missing[0].focus();
        return;
      }
      err.hidden = true;
      const v = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
      const body = `Bonjour,\n\nJe m’appelle ${v('nom')}, je tiens ${v('commerce')}${v('ville') ? ' à ' + v('ville') : ''}. Vous pouvez me joindre au ${v('contact')}.\n\n${v('message') ? 'P.-S. : ' + v('message') + '\n\n' : ''}`;
      const subject = 'Mon site : ' + v('commerce');
      const fail = () => {
        $('[data-mailto]', notice).href = `mailto:studiolamy@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        $('#l-copy', notice).value = `À : studiolamy@proton.me\nObjet : ${subject}\n\n${body}`;
        notice.hidden = false;
        notice.setAttribute('tabindex', '-1');
        notice.focus({ preventScroll: false });
      };
      const payload = {
        access_key: form.dataset.accessKey,
        from_name: form.dataset.fromName,
        subject,
        nom: v('nom'),
        commerce: v('commerce'),
        ville: v('ville'),
        contact: v('contact'),
        message: v('message'),
        botcheck: form.elements.botcheck ? form.elements.botcheck.checked : false,
      };
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('contact'))) payload.replyto = v('contact');
      notice.hidden = true;
      ok.hidden = true;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      const ctrl = 'AbortController' in window ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : 0;
      fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then((r) => r.json().catch(() => ({})).then((j) => ({ okHttp: r.ok, j })))
        .then(({ okHttp, j }) => {
          if (!okHttp || !j || j.success !== true) throw new Error('envoi');
          form.reset();
          ok.hidden = false;
          ok.setAttribute('tabindex', '-1');
          ok.focus({ preventScroll: false });
        })
        .catch(fail)
        .finally(() => { clearTimeout(timer); submit.disabled = false; submit.removeAttribute('aria-busy'); });
    });
  }
})();
