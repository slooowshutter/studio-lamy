/* Onde, salon de coiffure · démo. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Onde, salon de coiffure (démo)',
    address: '12 rue de la Rivière, 33000 Bordeaux (adresse fictive)',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    hours: { 0: null, 1: null, 2: [600, 1140], 3: [600, 1140], 4: [600, 1260], 5: [600, 1140], 6: [540, 1080] },
    step: 30,
    days: 14,
    uid: 'demo.onde',
    ics: 'rdv-onde-demo.ics'
  };

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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
  const dur = (m) => (m < 60 ? `${m}${NB}min` : `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + pad(m % 60) : ''}`);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- entrée : titre masqué + ondes, une fois la police prête ---------- */
  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('250 1em "Noto Serif Display"'), new Promise((r) => setTimeout(r, 700))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))));

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
    else if (h && now < h[1]) { txt = `Ouvert aujourd’hui jusqu’à ${hhmm(h[1])}${dow === 4 ? ' (nocturne)' : ''}`; open = true; }
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

  /* ---------- la carte : filtres + indicateur clip-path ---------- */
  const filters = $('[data-filters]');
  if (filters) {
    const row = $('.filters__row', filters);
    const overlay = $('.filters__overlay', filters);
    const btns = $$('button', row);
    const cats = $$('.menu-cat');
    const statusEl = $('[data-filter-status]');
    const count = (list) => list.reduce((n, c) => n + $$('.item', c).length, 0);
    const place = (btn) => {
      const l = btn.offsetLeft;
      const t = btn.offsetTop;
      overlay.style.setProperty('--l', l + 'px');
      overlay.style.setProperty('--r', (row.offsetWidth - l - btn.offsetWidth) + 'px');
      overlay.style.setProperty('--t', t + 'px');
      overlay.style.setProperty('--b', (row.offsetHeight - t - btn.offsetHeight) + 'px');
    };
    const apply = (key) => {
      const show = cats.filter((c) => key === 'all' || c.dataset.cat === key);
      cats.forEach((c) => {
        const on = show.includes(c);
        if (on && c.hidden) {
          c.hidden = false;
          c.classList.add('is-out');
          c.getBoundingClientRect();
          requestAnimationFrame(() => c.classList.remove('is-out'));
        } else if (!on && !c.hidden) {
          c.hidden = true;
        }
      });
      const n = count(show);
      const label = key === 'all' ? '' : ' · ' + btns.find((b) => b.dataset.filter === key).textContent;
      statusEl.textContent = `${n} prestation${n > 1 ? 's' : ''}${label}`;
    };
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      place(b);
      apply(b.dataset.filter);
    }));
    const init = () => place(btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0]);
    init();
    window.addEventListener('resize', init, { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(init);
    statusEl.textContent = `${count(cats)} prestations`;
  }

  /* ---------- le nuancier ---------- */
  const fan = $('[data-fan]');
  const shade = $('[data-shade]');
  if (fan && shade) {
    const strands = $$('.strand', fan);
    const svcName = (id) => { const r = $(`[data-id="${id}"]`); return r ? r.dataset.name : id; };
    const pick = (s, announce = true) => {
      strands.forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
      $('[data-shade-code]', shade).textContent = s.dataset.code;
      $('[data-shade-name]', shade).textContent = s.dataset.label;
      $('[data-shade-text]', shade).textContent = s.dataset.text;
      $('[data-shade-svc]', shade).textContent = svcName(s.dataset.svc);
      $('[data-shade-book]', shade).dataset.book = s.dataset.svc;
      shade.style.setProperty('--shade', s.style.getPropertyValue('--c'));
      const sr = $('[data-shade-live]');
      if (sr && announce) sr.textContent = `${s.dataset.code}, ${s.dataset.label.toLowerCase()}${NB}: ${svcName(s.dataset.svc).toLowerCase()} conseillé.`;
    };
    strands.forEach((s) => s.addEventListener('click', () => pick(s)));
    pick(strands.find((s) => s.getAttribute('aria-pressed') === 'true') || strands[0], false);
  }

  /* ---------- révélations (une seule fois) ---------- */
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

  const groups = $$('.menu-cat').map((c) => ({
    key: c.dataset.cat,
    title: $('.menu-cat__t', c).textContent.trim(),
    items: $$('[data-id]', c).map((r) => ({ id: r.dataset.id, name: r.dataset.name, min: +r.dataset.min, price: +r.dataset.price, from: !!r.dataset.from, cat: c.dataset.cat }))
  }));
  const services = groups.flatMap((g) => g.items);
  const svcById = (id) => services.find((s) => s.id === id);
  const euro = (s) => `${s.from ? 'dès ' : ''}${s.price}${NB}€`;
  const staff = $$('.person[data-staff]').map((p) => ({ id: p.dataset.staff, name: p.dataset.staffName, days: p.dataset.days.split(',').map(Number), does: p.dataset.does.split(' ') }));
  const staffById = (id) => staff.find((s) => s.id === id);
  const canDo = (st, svcId) => !svcId || st.does.includes(svcId);

  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const TOTAL = 5;
  const LABELS = { 1: 'la prestation', 2: 'avec qui', 3: 'le jour', 4: 'l’heure', 5: 'vos coordonnées' };
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

  function slotsFor(day, svc, staffId) {
    const h = CFG.hours[day.dow];
    if (!h || !svc) return [];
    const present = staff.filter((s) => s.days.includes(day.dow) && canDo(s, svc.id));
    const pool = staffId === 'any' ? present : present.filter((s) => s.id === staffId);
    if (!pool.length) return [];
    const { now } = today();
    const taken = (sid, b) => hash(day.iso + '|' + b + '|' + sid + '|' + CFG.uid) % 100 < 34;
    const out = [];
    for (let m = h[0]; m + svc.min <= h[1]; m += CFG.step) {
      const past = day.i === 0 && m <= now + 15;
      const who = pool.find((st) => { for (let b = m; b < m + svc.min; b += CFG.step) if (taken(st.id, b)) return false; return true; });
      out.push({ m, past, taken: !who, free: !past && !!who, who: who ? who.id : null });
    }
    return out;
  }

  $('[data-services]', form).innerHTML = groups.map((g) => `<p class="opts__cat" aria-hidden="true">${g.title}</p>` + g.items.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<small>${dur(s.min)}</small></span>
      <span class="opt__price">${s.from ? '<small>dès </small>' : ''}${s.price}${NB}€</span>
    </label>`).join('')).join('');

  function renderStaff() {
    const svc = svcById(state.service);
    if (state.staff !== 'any' && svc && !canDo(staffById(state.staff), svc.id)) state.staff = 'any';
    $('[data-staff-opts]', form).innerHTML = [{ id: 'any', name: 'Peu importe', note: 'La première personne libre' }]
      .concat(staff.map((s) => ({ id: s.id, name: s.name, note: canDo(s, svc && svc.id) ? s.days.map((d) => DAYS[d].slice(0, 3)).join(', ') : 'ne fait pas cette prestation', off: !canDo(s, svc && svc.id) })))
      .map((o) => `
      <label class="opt">
        <input type="radio" name="staff" value="${o.id}"${state.staff === o.id ? ' checked' : ''}${o.off ? ' disabled' : ''}>
        <span class="opt__box" aria-hidden="true"></span>
        <span class="opt__name">${o.name}<small>${o.note}</small></span>
        <span></span>
      </label>`).join('');
  }

  function renderDays() {
    const svc = svcById(state.service);
    const st = staffById(state.staff);
    $('[data-days-note]', form).textContent = st ? `${st.name} est là le ${st.days.map((d) => DAYS[d]).join(', ')}.` : 'Fermé le dimanche et le lundi. Nocturne le jeudi jusqu’à 21:00.';
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow];
      const absent = open && st && !st.days.includes(d.dow);
      // personne de présent ce jour-là ne fait cette prestation (ex. : coupe homme le mardi)
      const nobody = open && !absent && svc && !staff.some((s) => s.days.includes(d.dow) && canDo(s, svc.id) && (!st || s.id === st.id));
      const list = open && !absent && !nobody ? slotsFor(d, svc, state.staff) : [];
      const free = list.filter((s) => s.free).length;
      const over = list.length > 0 && list.every((s) => s.past);
      const dis = !open || absent || nobody || free === 0;
      const absentTag = st ? 'absent' + (st.id === 'malo' ? '' : 'e') : '';
      const why = !open ? 'fermé' : absent ? absentTag : nobody ? 'indispo.' : over ? 'terminé' : 'complet';
      const whyTxt = absent ? `${st.name} ${absentTag}` : nobody ? 'personne pour cette prestation ce jour-là' : why;
      const tag = dis ? why : d.dow === 4 ? 'nocturne' : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (dis ? `, ${whyTxt}` : `, ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''}`);
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
    const slots = slotsFor(day, svc, state.staff);
    const free = slots.filter((s) => s.free).length;
    const st = staffById(state.staff);
    note.textContent = `${cap(fmtLong.format(day.date))}${st ? ', avec ' + st.name : ''} · ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''} pour ${dur(svc.min)}.`;
    if (!free) { wrap.innerHTML = '<p class="slots__empty">Plus aucun créneau ce jour-là. Essayez un autre jour, ou «&nbsp;Peu importe&nbsp;».</p>'; return; }
    const g = [['Matin', 0, 720], ['Après-midi', 720, 1080], ['Soir', 1080, 1440]];
    wrap.innerHTML = g.map(([label, a, b], gi) => {
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
    const slot = slotsFor(day, svc, state.staff).find((s) => s.m === state.time);
    return slot && slot.who ? staffById(slot.who) : null;
  }

  function renderRecap() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const who = assigned();
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}${who ? `, avec ${who.name}` : ''}</span>` +
      `<span>${dur(svc.min)} · ${euro(svc)}</span><small>${svc.cat === 'couleur' ? 'Test d’allergie 48 h avant si première coloration. ' : ''}${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const st = staffById(state.staff);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? `${svc.name} · ${dur(svc.min)}` : 'À choisir');
    set('staff', st ? st.name : 'Peu importe');
    set('day', day ? cap(fmtLong.format(day.date)) : '—');
    set('time', state.time != null ? hhmm(state.time) : '—');
    set('price', svc ? euro(svc) : '—');
    const skin = $('[data-skin]', form);
    if (skin) skin.hidden = !(svc && svc.cat === 'couleur');
    const done = state.step === 6;
    $$('.summary__edit').forEach((b) => {
      const n = +b.dataset.goto;
      const has = n === 1 ? !!svc : n === 2 ? state.max >= 2 : n === 3 ? !!day : state.time != null;
      b.hidden = !has || done || n > state.max;
    });
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [];
      if (svc) bits.push(`${svc.name} · ${dur(svc.min)} · ${euro(svc)}`);
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
    if (step === 2) renderStaff();
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
    const svc = svcById(state.service);
    if (state.staff !== 'any' && svc && !canDo(staffById(state.staff), svc.id)) state.staff = 'any';
    if (state.day) renderDays();
    if (state.day && state.time != null && !slotsFor(dayByIso(state.day), svc, state.staff).some((s) => s.m === state.time && s.free)) state.time = null;
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

  // « Réserver cette nuance » : présélection de la prestation conseillée
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
    $('[data-done-when]', form).textContent = `${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}${state.who ? `, avec ${state.who.name}` : ''}. ${svc.name}, ${dur(svc.min)}, ${euro(svc)}.`;
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
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Demo Onde//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${stamp(start)}-${svc.id}@${CFG.uid}`, `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(start + svc.min * 60000)}`,
      `SUMMARY:${esc(svc.name + ' · ' + CFG.shop)}`, `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc('Démo : salon fictif, aucun rendez-vous réel.' + (state.who ? ' Avec ' + state.who.name + '.' : ''))}`,
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
