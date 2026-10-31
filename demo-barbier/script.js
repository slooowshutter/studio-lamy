/* Ferrand, barbier · démo. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Ferrand, barbier (démo)',
    address: '9 rue des Pentes, 69004 Lyon (adresse fictive)',
    phone: '04 00 00 00 00 (fictif)',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    hours: { 0: null, 1: null, 2: [570, 1170], 3: [570, 1170], 4: [570, 1170], 5: [570, 1170], 6: [540, 1080] },
    step: 30,
    days: 14,
    uid: 'demo.ferrand',
    ics: 'rdv-ferrand-demo.ics'
  };

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAYS_S = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

  /* ---------- heure de Paris ---------- */
  const partsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function paris(d = new Date()) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  }
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (m) => Math.floor(m / 60) + ':' + pad(m % 60);
  const isoT = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- le mot FERRAND, ajusté à la largeur ---------- */
  const wm = $('.wm');
  const fitEl = $('[data-fit]');
  function fit() {
    if (!wm || !fitEl) return;
    wm.style.setProperty('--fit', '100px');
    fitEl.style.display = 'inline-flex';
    const w = fitEl.getBoundingClientRect().width;
    fitEl.style.display = '';
    const cs = getComputedStyle(wm);
    const avail = wm.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (w > 0) wm.style.setProperty('--fit', Math.min((100 * avail) / w, window.innerWidth * 0.42) + 'px');
  }
  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('1em "League Gothic"'), new Promise((r) => setTimeout(r, 700))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => {
    fit();
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  });
  let fitRaf = 0;
  if (doc.fonts && doc.fonts.addEventListener) doc.fonts.addEventListener('loadingdone', fit);
  window.addEventListener('resize', () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); }, { passive: true });

  /* ---------- le poteau : repli JS si animation-timeline n’existe pas ---------- */
  const stripes = $('.pole__stripes');
  if (stripes && !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) && !reduce.matches) {
    const desk = window.matchMedia('(min-width: 900px)');
    let ticking = false;
    const upd = () => {
      ticking = false;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      stripes.style.transform = desk.matches ? `translateY(${(-1400 * p).toFixed(1)}px)` : `translateX(${(-600 * p).toFixed(1)}px)`;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    upd();
  }

  /* ---------- ouvert / fermé + horaires du jour ---------- */
  (function status() {
    const { dow, now } = today();
    const row = $(`.hours tr[data-dow="${dow}"]`);
    if (row) row.classList.add('is-today');
    const el = $('[data-status]');
    if (!el) return;
    const h = CFG.hours[dow];
    let txt;
    let open = false;
    if (h && now < h[0]) txt = `Ouvre aujourd’hui à ${hhmm(h[0])}`;
    else if (h && now < h[1]) { txt = `Ouvert aujourd’hui jusqu’à ${hhmm(h[1])}`; open = true; }
    else {
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) { txt = `Fermé ${h ? 'pour aujourd’hui' : 'aujourd’hui'}, réouverture ${k === 1 ? 'demain' : DAYS[d]} ${hhmm(CFG.hours[d][0])}`; break; }
      }
    }
    $('[data-status-text]', el).textContent = txt + '.';
    el.classList.toggle('is-open', open);
  })();

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#demo'), $('[data-bar]')].filter(Boolean);
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
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true); });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
  }

  /* ---------- les fade charts ---------- */
  // clair à la nuque (peau), foncé vers le sommet (longueur)
  const RAMP = ['#74818E', '#56636F', '#3B4A5A', '#2A3542', '#111111'];
  $$('.chart[data-bands]').forEach((li) => {
    const mm = li.dataset.bands.split(',').map(Number);
    const labels = (li.dataset.labels || '').split('|');
    const fondu = +li.dataset.fondu || 0;
    const barbe = li.classList.contains('chart--barbe');
    const top = 20;
    const bottom = 168;
    const h = (bottom - top) / mm.length;
    const shades = RAMP.slice(-mm.length);
    let s = `<svg class="chart__svg" viewBox="0 0 260 190" aria-hidden="true" focusable="false">`;
    s += `<path d="M88 ${top - 4} V${bottom}" stroke="#111" stroke-width="1.5"/><path d="M88 ${bottom} H256" stroke="#111" stroke-width="1.5"/>`;
    mm.forEach((v, i) => {
      const y = bottom - (i + 1) * h;
      const len = 8 + 156 * Math.sqrt(v / 50);
      s += `<rect class="band" style="--i:${i}" x="89" y="${(y + 1.5).toFixed(1)}" width="${len.toFixed(1)}" height="${(h - 3).toFixed(1)}" fill="${shades[i]}"/>`;
      s += `<text x="80" y="${(y + h / 2 + 4).toFixed(1)}" text-anchor="end" font-size="11">${labels[i] || ''}</text>`;
    });
    if (fondu) {
      const y = bottom - fondu * h;
      s += `<path d="M84 ${y.toFixed(1)} H256" stroke="#C8102E" stroke-width="2.5"/>`;
    }
    s += `<text class="ax" x="92" y="184">${barbe ? 'cou' : 'nuque'}</text><text class="ax" x="92" y="12">${barbe ? 'menton' : 'sommet'}</text></svg>`;
    li.insertAdjacentHTML('afterbegin', s);
  });

  /* ---------- révélations (une seule fois) ---------- */
  $$('.board .cat').forEach((c) => $$('.row', c).forEach((r, i) => { r.style.transitionDelay = `${i * 50}ms`; }));
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('is-in'));

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.hero && !seen.book && !seen.foot);
    const watch = (sel, key) => { const el = $(sel); if (el) new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el); };
    watch('.hero__cta', 'hero');
    watch('#reserver', 'book');
    watch('#foot', 'foot');
  }

  /* =========================================================
     Réservation (démo : rien n'est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const cats = $$('.board .cat').map((c) => ({
    title: $('.cat__t', c).textContent.trim(),
    items: $$('[data-id]', c).map((r) => ({ id: r.dataset.id, name: r.dataset.name, min: +r.dataset.min, price: +r.dataset.price }))
  }));
  const services = cats.flatMap((c) => c.items);
  const svcById = (id) => services.find((s) => s.id === id);
  const staff = $$('.chair[data-staff]').map((c, i) => ({ id: c.dataset.staff, name: c.dataset.staffName, chair: i + 1, days: c.dataset.days.split(',').map(Number) }));
  const staffById = (id) => staff.find((s) => s.id === id);
  const daysLabel = (list) => list.map((d) => DAYS_S[d]).join(', ');

  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const TOTAL = 5;
  const LABELS = { 1: 'la prestation', 2: 'le fauteuil', 3: 'le jour', 4: 'l’heure', 5: 'vos coordonnées' };
  const state = { step: 1, max: 1, service: null, staff: 'any', day: null, time: null, name: '', who: null };

  const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const days = (() => {
    const { t } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay() };
    });
  })();
  const dayByIso = (v) => days.find((d) => d.iso === v);

  function slotsFor(day, dur, staffId) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const present = staff.filter((s) => s.days.includes(day.dow));
    const pool = staffId === 'any' ? present : present.filter((s) => s.id === staffId);
    if (!pool.length) return [];
    const { now } = today();
    const taken = (sid, b) => hash(day.iso + '|' + b + '|' + sid + '|' + CFG.uid) % 100 < 36;
    const out = [];
    for (let m = h[0]; m + dur <= h[1]; m += CFG.step) {
      const past = day.i === 0 && m <= now + 15;
      const who = pool.find((st) => { for (let b = m; b < m + dur; b += CFG.step) if (taken(st.id, b)) return false; return true; });
      out.push({ m, past, taken: !who, free: !past && !!who, who: who ? who.id : null });
    }
    return out;
  }

  // étape 1 : prestations par catégorie, depuis le tableau des tarifs
  $('[data-services]', form).innerHTML = cats.map((c) => `<p class="opts__cat" aria-hidden="true">${c.title}</p>` + c.items.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<small>${s.min}${NB}min</small></span>
      <span class="opt__price">${s.price}${NB}€</span>
    </label>`).join('')).join('');

  // étape 2 : le fauteuil
  $('[data-staff-opts]', form).innerHTML = [{ id: 'any', name: 'Peu importe', note: 'Le premier fauteuil libre' }]
    .concat(staff.map((s) => ({ id: s.id, name: s.name, note: `Fauteuil ${s.chair} · ${daysLabel(s.days)}` })))
    .map((o) => `
    <label class="opt">
      <input type="radio" name="staff" value="${o.id}"${o.id === 'any' ? ' checked' : ''}>
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${o.name}<small>${o.note}</small></span>
      <span></span>
    </label>`).join('');

  function renderDays() {
    const svc = svcById(state.service);
    const dur = svc ? svc.min : CFG.step;
    const st = staffById(state.staff);
    $('[data-days-note]', form).textContent = st ? `${st.name} est là${NB}: ${daysLabel(st.days)}. Fermé le dimanche et le lundi.` : 'Fermé le dimanche et le lundi.';
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow];
      const absent = open && st && !st.days.includes(d.dow);
      const list = open && !absent ? slotsFor(d, dur, state.staff) : [];
      const free = list.filter((s) => s.free).length;
      const over = list.length > 0 && list.every((s) => s.past);
      const dis = !open || absent || free === 0;
      const why = !open ? 'fermé' : absent ? 'absent' : over ? 'terminé' : 'complet';
      const tag = dis ? why : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (dis ? `, ${why}` : `, ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''}`);
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span aria-hidden="true"><span class="day__w">${fmtW.format(d.date)}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m">${tag}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  function renderSlots() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!svc || !day) { wrap.innerHTML = ''; return; }
    const slots = slotsFor(day, svc.min, state.staff);
    const free = slots.filter((s) => s.free).length;
    const st = staffById(state.staff);
    note.textContent = `${cap(fmtLong.format(day.date))}${st ? ', avec ' + st.name : ''} · ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''} pour ${svc.min}${NB}min.`;
    if (!free) { wrap.innerHTML = '<p class="slots__empty">Plus aucun créneau ce jour-là. Essayez un autre jour ou «&nbsp;Peu importe&nbsp;».</p>'; return; }
    const groups = [['Matin', 0, 720], ['Après-midi', 720, 1080], ['Soir', 1080, 1440]];
    wrap.innerHTML = groups.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${hhmm(s.m)}${s.past ? ', passé' : s.taken ? ', déjà pris' : ''}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${isoT(s.m)}">${hhmm(s.m)}</time></span></label>`).join('')
      }</div></div>`;
    }).join('');
    if (state.time != null && !slots.some((s) => s.m === state.time && s.free)) state.time = null;
  }

  function assigned() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return null;
    const slot = slotsFor(day, svc.min, state.staff).find((s) => s.m === state.time);
    return slot && slot.who ? staffById(slot.who) : null;
  }

  function renderRecap() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const who = assigned();
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}${who ? `, avec ${who.name} (fauteuil ${who.chair})` : ''}</span>` +
      `<span>${svc.min}${NB}min · ${svc.price}${NB}€</span><small>${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const st = staffById(state.staff);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? `${svc.name} · ${svc.min}${NB}min` : 'À choisir');
    set('staff', st ? `${st.name} · fauteuil ${st.chair}` : 'Peu importe');
    set('day', day ? cap(fmtLong.format(day.date)) : '—');
    set('time', state.time != null ? hhmm(state.time) : '—');
    set('price', svc ? `${svc.price}${NB}€` : '—');
    const done = state.step === 6;
    $$('.summary__edit').forEach((b) => {
      const n = +b.dataset.goto;
      const has = n === 1 ? !!svc : n === 2 ? state.max >= 2 : n === 3 ? !!day : state.time != null;
      b.hidden = !has || done || n > state.max;
    });
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [];
      if (svc) bits.push(`${svc.name} · ${svc.min}${NB}min · ${svc.price}${NB}€`);
      if (st) bits.push(st.name);
      if (day) bits.push(cap(fmtLong.format(day.date)));
      if (state.time != null) bits.push(hhmm(state.time));
      pick.hidden = !svc || done;
      pick.innerHTML = svc ? `<span>Votre sélection</span>${bits.join(' — ')}` : '';
    }
  }

  function show(panel, back) {
    panel.hidden = false;
    panel.classList.add(back ? 'is-enter-back' : 'is-enter');
    panel.getBoundingClientRect();
    requestAnimationFrame(() => panel.classList.remove('is-enter', 'is-enter-back'));
  }

  function go(step, opts = {}) {
    const from = state.step;
    state.step = step;
    state.max = Math.max(state.max, Math.min(step, TOTAL));
    if (step === 3) renderDays();
    if (step === 4) renderSlots();
    if (step === 5) renderRecap();
    let current;
    panels.forEach((p) => {
      const s = +p.dataset.step;
      if (s === step) { current = p; if (s !== from || p.hidden) show(p, step < from); } else p.hidden = true;
    });
    stepBtns.forEach((b) => {
      const n = +b.dataset.goto;
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = step === 6 || n > state.max;
    });
    $$('.err[data-err]', form).forEach((e) => { e.hidden = true; });
    panels.forEach((p) => p.removeAttribute('aria-describedby'));
    updateSummary();
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 6 ? 'Réservation simulée enregistrée.' : `Étape ${step} sur ${TOTAL}${NB}: ${LABELS[step]}.`;
    const h = $('.panel__t', current);
    if (h) h.focus({ preventScroll: true });
    const r = form.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  }

  function next() {
    const s = state.step;
    const fail = (n) => {
      const e = $(`[data-err="${n}"]`, form);
      if (e) e.hidden = false;
      const fs = $(`.panel[data-step="${n}"]`, form);
      if (fs) fs.setAttribute('aria-describedby', 'err-' + n);
      const first = $(`.panel[data-step="${n}"] input:not(:disabled)`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s === 3 && !state.day) return fail(3);
    if (s === 4 && state.time == null) return fail(4);
    if (s < TOTAL) go(s + 1);
  }

  function revalidate() {
    if (state.day) renderDays();
    if (state.day && state.time != null) {
      const ok = slotsFor(dayByIso(state.day), svcById(state.service) ? svcById(state.service).min : CFG.step, state.staff).some((s) => s.m === state.time && s.free);
      if (!ok) state.time = null;
    }
    if (!state.day) state.max = Math.min(state.max, 3);
    else if (state.time == null) state.max = Math.min(state.max, 4);
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'service') { state.service = t.value; revalidate(); }
    if (t.name === 'staff') { state.staff = t.value; revalidate(); }
    if (t.name === 'day') { state.day = t.value; state.time = null; state.max = Math.min(state.max, 4); }
    if (t.name === 'time') state.time = +t.value;
    const n = { service: 1, day: 3, time: 4 }[t.name];
    if (n) {
      const e2 = $(`[data-err="${n}"]`, form);
      if (e2) e2.hidden = true;
      const fs = $(`.panel[data-step="${n}"]`, form);
      if (fs) fs.removeAttribute('aria-describedby');
    }
    stepBtns.forEach((b) => { b.disabled = +b.dataset.goto > state.max; });
    updateSummary();
  });

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-prev]')) go(Math.max(1, state.step - 1));
    else if (e.target.closest('[data-restart]')) restart();
    else if (e.target.closest('[data-ics]')) downloadIcs();
  });
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 6) go(n);
  }));

  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    if (state.step === 6) restart(true);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    go(2);
  }));

  const name = $('#f-name', form);
  const tel = $('#f-tel', form);
  const fieldErr = (input, errId, bad) => {
    $('#' + errId).hidden = !bad;
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    const ids = [input.dataset.hint, bad ? errId : ''].filter(Boolean).join(' ');
    if (ids) input.setAttribute('aria-describedby', ids); else input.removeAttribute('aria-describedby');
    return !bad;
  };
  const telOk = (v) => /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(v.replace(/[\s.\-()]/g, ''));
  name.addEventListener('blur', () => { if (name.value) fieldErr(name, 'e-name', !name.value.trim()); });
  tel.addEventListener('blur', () => { if (tel.value) fieldErr(tel, 'e-tel', !telOk(tel.value)); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.step < TOTAL) { next(); return; }
    if (state.step !== TOTAL) return;
    const a = fieldErr(name, 'e-name', !name.value.trim());
    const b = fieldErr(tel, 'e-tel', !telOk(tel.value));
    if (!a) { name.focus(); return; }
    if (!b) { tel.focus(); return; }
    state.name = name.value.trim();
    state.who = assigned();
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    $('[data-done-when]', form).textContent = `${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}${state.who ? `, fauteuil ${state.who.chair} avec ${state.who.name}` : ''}. ${svc.name}, ${svc.min}${NB}min, ${svc.price}${NB}€.`;
    go(6);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, staff: 'any', day: null, time: null, name: '', who: null });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
    go(1, { silent: !!silent });
  }

  /* .ics en UTC, lignes CRLF pliées à 75 octets */
  function parisOffset(ms) { const p = paris(new Date(ms)); return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - ms) / 60000); }
  function toUTC(day, m) {
    const d = day.date;
    const wall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(m / 60), m % 60);
    return wall - parisOffset(wall - parisOffset(wall) * 60000) * 60000;
  }
  const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  function fold(line) {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = [];
    let cur = '';
    let n = 0;
    for (const ch of line) { const b = enc.encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
    out.push(cur);
    return out.join('\r\n ');
  }
  function downloadIcs() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    const start = toUTC(day, state.time);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Demo Ferrand//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${stamp(start)}-${svc.id}@${CFG.uid}`, `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + svc.min * 60000)}`,
      `SUMMARY:${esc(svc.name + ' · ' + CFG.shop)}`, `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc('Démo : commerce fictif, aucun rendez-vous réel.' + (state.who ? ' Fauteuil ' + state.who.chair + ', ' + state.who.name + '.' : ''))}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url; a.download = CFG.ics;
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  go(1, { silent: true });
})();
