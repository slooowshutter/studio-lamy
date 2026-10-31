/* Imagine Hair · v2 « La phrase » · aperçu non officiel. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Imagine Hair',
    address: '138 rue Colbert, 59800 Lille',
    phone: '03 20 57 71 24',
    // 0 = dimanche. Minutes depuis minuit. Planity, relevé le 31/10/2026.
    hours: { 0: null, 1: null, 2: [540, 1140], 3: [540, 1110], 4: [540, 1110], 5: [540, 1140], 6: [540, 1020] },
    step: 30,
    days: 14,
    uid: 'apercu.imagine-hair.v2',
    ics: 'rdv-imagine-hair.ics'
  };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const LENS = ['c', 'm', 'l', 't'];
  const LEN = { c: 'courts', m: 'mi-longs', l: 'longs', t: 'très longs' };
  const CATS = { femme: 'Femme · coupe & brushing', couleur: 'Couleur', balayage: 'Balayage', permanente: 'Permanente', ybera: 'Ybera', homme: 'Homme', enfants: 'Enfants' };

  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  // iOS n’applique :active qu’avec un écouteur touchstart
  document.addEventListener('touchstart', () => {}, { passive: true });

  /* ---------- heure de Lille ---------- */
  const partsFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function paris(d = new Date()) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute };
  }
  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, date, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const hm = (m) => Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '');
  const slotTime = (m) => Math.floor(m / 60) + 'h' + pad(m % 60);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const euro = (n) => `${n}${NB}€`;
  const dur = (m) => (m < 60 ? `${m}${NB}min` : `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + pad(m % 60) : ''}`);

  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const n = h + l - 7 * m + 114;
    return Date.UTC(y, Math.floor(n / 31) - 1, (n % 31) + 1, 12);
  }
  const FIXED = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'];
  function holiday(date) {
    const md = pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
    if (FIXED.includes(md)) return true;
    const off = Math.round((date.getTime() - easter(date.getUTCFullYear())) / 86400000);
    return off === 1 || off === 39 || off === 50;
  }

  /* ---------- statut (héros + horaires) ---------- */
  function nextOpen(date) {
    for (let k = 1; k <= 14; k++) {
      const d = new Date(date.getTime() + k * 86400000);
      if (CFG.hours[d.getUTCDay()] && !holiday(d)) return { k, dow: d.getUTCDay() };
    }
    return null;
  }
  function status() {
    const { dow, now, date } = today();
    const h = CFG.hours[dow];
    const fer = h && holiday(date);
    const n = nextOpen(date);
    const re = n ? ` Réouverture ${n.k === 1 ? 'demain' : DAYS[n.dow]} à ${hm(CFG.hours[n.dow][0])}.` : '';
    let state = 'idle';
    let text;
    if (!h) text = `Fermé le ${DAYS[dow]}.` + re;
    else if (fer) text = `Jour férié${NB}: ouverture à confirmer avec le salon.` + re;
    else if (now < h[0]) { state = 'soon'; text = `Ouvre à ${hm(h[0])} aujourd’hui, jusqu’à ${hm(h[1])}.`; }
    else if (now < h[1]) { state = 'open'; text = `Ouvert aujourd’hui jusqu’à ${hm(h[1])}.`; }
    else text = 'Fermé pour aujourd’hui.' + re;
    [['[data-status]', '[data-status-text]'], ['[data-status-2]', '[data-status-text-2]']].forEach(([a, b]) => {
      const el = $(a);
      if (!el) return;
      el.dataset.state = state;
      $(b, el).textContent = text;
    });
    $$('.week tr.is-today').forEach((r) => { r.classList.remove('is-today'); const s = $('.week__today', r); if (s) s.remove(); });
    const row = $(`.week tr[data-dow="${dow}"]`);
    if (row) { row.classList.add('is-today'); $('th', row).insertAdjacentHTML('afterbegin', '<span class="week__today">aujourd’hui</span>'); }
  }
  status();
  setInterval(status, 60000);

  /* ---------- menu mobile ---------- */
  const top = $('.top');
  const menuBtn = $('.top__menu');
  const nav = $('#nav');
  if (top && menuBtn && nav) {
    menuBtn.hidden = false;
    top.classList.add('has-menu');
    const mq = window.matchMedia('(min-width: 1040px)');
    const setOpen = (open, focusBtn) => {
      top.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.top__menu-l', menuBtn).textContent = open ? 'Fermer' : 'Menu';
      if (open) requestAnimationFrame(() => { const first = $('a', nav); if (first) first.focus({ preventScroll: true }); });
      else if (focusBtn) menuBtn.focus();
    };
    menuBtn.addEventListener('click', () => setOpen(!top.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a') && !mq.matches) setOpen(false); });
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && top.classList.contains('is-open')) { e.preventDefault(); setOpen(false, true); } });
    doc.addEventListener('click', (e) => { if (top.classList.contains('is-open') && !top.contains(e.target)) setOpen(false); });
    const onMq = () => { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { cta: true, book: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.cta && !seen.book && !seen.foot);
    const watch = (sel, key) => { const el = $(sel); if (el) new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el); };
    watch('[data-hero-cta]', 'cta');
    watch('#reserver', 'book');
    watch('#foot', 'foot');
  } else if (bar) bar.classList.add('is-on');

  /* ---------- copier l’adresse ---------- */
  $$('[data-copy]').forEach((b) => {
    const label = b.textContent;
    b.addEventListener('click', async () => {
      const live = $('[data-copy-live]');
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Adresse copiée'; if (live) live.textContent = 'Adresse copiée dans le presse-papiers.'; }
      catch (err) { if (live) live.textContent = 'Copie impossible. Adresse : ' + b.dataset.copy; }
      setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

  /* ---------- les prestations (lues dans la carte) ---------- */
  const num = (v) => (v === '' || v == null ? null : +v);
  const services = $$('.item[data-id][data-p]').map((r) => {
    const p = r.dataset.p.split(',').map(num);
    const d = r.dataset.d.split(',').map(num);
    return { id: r.dataset.id, name: r.dataset.name, cat: r.dataset.cat, flat: p.length === 1, p, d };
  });
  const svcById = (id) => services.find((s) => s.id === id);
  const priceOf = (s, len) => (s.flat ? s.p[0] : s.p[LENS.indexOf(len)]);
  const durOf = (s, len) => (s.flat ? s.d[0] : s.d[LENS.indexOf(len)]);
  const okFor = (s, len) => priceOf(s, len) != null && durOf(s, len) != null;

  /* =========================================================
     La phrase : « Je viens pour …, mes cheveux sont … »
     ========================================================= */
  const phSvc = $('[data-ph-svc]');
  const phLen = $('[data-ph-len]');
  const phLenWrap = $('[data-ph-lenwrap]');
  const phClause = $('[data-ph-clause]');
  const phUnique = $('[data-ph-unique]');
  const ans = $('[data-ans]');
  const ansLive = $('[data-ans-live]');
  const ansBook = $('[data-ans-book]');
  const canFit = window.CSS && CSS.supports && CSS.supports('field-sizing', 'content');
  const ctx = doc.createElement('canvas').getContext('2d');
  function fit(sel) {
    if (canFit || !sel || !ctx) return;
    const cs = getComputedStyle(sel);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const txt = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
    const w = ctx.measureText(txt).width + parseFloat(cs.paddingRight) + parseFloat(cs.paddingLeft) + 4;
    sel.style.width = `${Math.ceil(w)}px`;
  }
  const fitAll = () => { fit(phSvc); fit(phLen); };

  let lenSink = () => {};
  function renderAnswer(announce) {
    if (!phSvc || !ans) return;
    const svc = svcById(phSvc.value);
    const len = phLen.value;
    if (!svc) return;
    phLenWrap.hidden = svc.flat;
    phClause.hidden = svc.flat;
    phUnique.hidden = !svc.flat;
    const ok = okFor(svc, len);
    const p = $('[data-ans-p]', ans);
    const n = $('[data-ans-n]', ans);
    const lenTxt = svc.flat ? 'prix unique' : `cheveux ${LEN[len]}`;
    if (ok) {
      p.innerHTML = `<span class="tnum">${euro(priceOf(svc, len))}</span>`;
      n.innerHTML = `${svc.name}, ${lenTxt} <span class="ans__d tnum">· ${dur(durOf(svc, len))}</span>`;
      ansBook.hidden = false;
    } else {
      p.innerHTML = '<span class="na">Prix à confirmer</span>';
      n.innerHTML = `${svc.name}, ${lenTxt}. Cette ligne n’est pas affichée sur Planity&nbsp;: prix à demander au salon.`;
      ansBook.hidden = true;
    }
    const call = $('[data-ans-call]', ans);
    const tel = $('[data-ans-tel]', ans);
    if (call) call.hidden = ok;
    if (tel) tel.hidden = !ok;
    if (!reduce.matches && announce) {
      ans.classList.add('is-new');
      ans.getBoundingClientRect();
      requestAnimationFrame(() => ans.classList.remove('is-new'));
    }
    if (announce && ansLive) ansLive.textContent = ok ? `${svc.name}, ${lenTxt}${NB}: ${priceOf(svc, len)} euros, ${dur(durOf(svc, len))}.` : `${svc.name}, ${lenTxt}${NB}: prix à confirmer.`;
    fitAll();
  }
  if (phSvc && phLen) {
    phSvc.addEventListener('change', () => renderAnswer(true));
    phLen.addEventListener('change', () => { renderAnswer(true); lenSink(phLen.value, 'phrase'); });
    renderAnswer(false);
    window.addEventListener('resize', fitAll, { passive: true });
  }

  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('500 1em Alegreya'), new Promise((r) => setTimeout(r, 700))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => { fitAll(); requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))); });

  /* =========================================================
     Réservation (simulation : rien n’est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const wide = window.matchMedia('(min-width: 960px)');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
  const firstLen = $('input[name="blen"]:checked', form);
  const state = { step: 1, max: 1, len: firstLen ? firstLen.value : 'm', service: null, day: null, time: null, name: '' };

  const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  // les quatorze jours suivent la date : reconstruits si la page reste ouverte après minuit
  const buildDays = () => {
    const { t } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay() };
    });
  };
  let days = buildDays();
  const todayIso = () => { const { t } = today(); return `${t.y}-${pad(t.m)}-${pad(t.d)}`; };
  const freshDays = () => { const { t } = today(); if (days[0].iso !== `${t.y}-${pad(t.m)}-${pad(t.d)}`) days = buildDays(); };
  const dayByIso = (v) => days.find((d) => d.iso === v);
  const curLength = () => { const s = svcById(state.service); return s ? durOf(s, state.len) : CFG.step; };

  function slotsFor(day, length) {
    const h = CFG.hours[day.dow];
    if (!h || holiday(day.date)) return [];
    const { now } = today();
    const taken = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 22;
    const out = [];
    for (let m = h[0]; m + length <= h[1]; m += CFG.step) {
      const past = day.iso === todayIso() && m <= now + 15;
      let tk = false;
      for (let b = m; b < m + length; b += CFG.step) if (taken(b)) { tk = true; break; }
      out.push({ m, past, taken: tk, free: !past && !tk });
    }
    return out;
  }

  function renderServices() {
    $('[data-services]', form).innerHTML = Object.keys(CATS).map((cat) => {
      const list = services.filter((s) => s.cat === cat);
      if (!list.length) return '';
      return `<div class="opts__g" role="group" aria-labelledby="og-${cat}"><h4 id="og-${cat}">${CATS[cat]}</h4>${
        list.map((s) => {
          const ok = okFor(s, state.len);
          const sub = !ok ? `pas de prix relevé pour cheveux ${LEN[state.len]}` : `${dur(durOf(s, state.len))}${s.flat ? ' · prix unique' : ''} · indicatif`;
          const aria = ok ? '' : ` aria-label="${s.name}, prix à confirmer pour cheveux ${LEN[state.len]}, indisponible ici"`;
          return `<label class="opt${ok ? '' : ' is-na'}"><input type="radio" name="service" value="${s.id}"${ok ? '' : ' disabled'}${aria}${state.service === s.id && ok ? ' checked' : ''}><span class="opt__name">${s.name}<small>${sub}</small></span><span class="opt__price">${ok ? euro(priceOf(s, state.len)) : 'à confirmer'}</span></label>`;
        }).join('')
      }</div>`;
    }).join('');
  }

  function renderDays() {
    freshDays();
    const length = curLength();
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const shut = !CFG.hours[d.dow];
      const fer = !shut && holiday(d.date);
      const open = !shut && !fer;
      const list = open ? slotsFor(d, length) : [];
      const free = list.filter((s) => s.free).length;
      const over = open && list.length > 0 && list.every((s) => s.past);
      const dis = !open || free === 0;
      const why = shut ? 'fermé' : fer ? 'férié' : over ? 'terminé' : 'complet';
      const tag = dis ? why : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      let aria = cap(fmtLong.format(d.date));
      if (shut) aria += ', fermé';
      else if (fer) aria += ', jour férié, ouverture à confirmer';
      else if (dis) aria += `, ${why}`;
      else aria += `, ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''}`;
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span class="day__c" aria-hidden="true"><span class="day__w">${fmtW.format(d.date).replace('.', '')}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m">${tag}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  function renderSlots() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!svc || !day) { wrap.innerHTML = ''; return; }
    const length = durOf(svc, state.len);
    const slots = slotsFor(day, length);
    const free = slots.filter((s) => s.free).length;
    note.textContent = `${cap(fmtLong.format(day.date))}, ouvert de ${hm(CFG.hours[day.dow][0])} à ${hm(CFG.hours[day.dow][1])} · ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''} pour ${dur(length)} de prestation.`;
    if (!free) { wrap.innerHTML = `<p class="slots__empty">Plus aucun créneau ce jour-là pour cette durée. Choisissez un autre jour, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`; return; }
    const parts = [['Matin', 0, 720], ['Après-midi', 720, 1020], ['Fin de journée', 1020, 1440]];
    wrap.innerHTML = parts.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', déjà pris' : '';
          return `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${slotTime(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${iso(s.m)}">${slotTime(s.m)}</time></span></label>`;
        }).join('')
      }</div></div>`;
    }).join('');
    if (state.time != null && !slots.some((s) => s.m === state.time && s.free)) state.time = null;
  }

  const lenWords = (svc) => (svc && !svc.flat ? `, cheveux ${LEN[state.len]}` : '');
  function renderRecap() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}${lenWords(svc)}</strong><span>${cap(fmtLong.format(day.date))} à ${hm(state.time)}</span>` +
      `<span>${dur(durOf(svc, state.len))} · ${euro(priceOf(svc, state.len))}</span><small>${CFG.address} · tarif indicatif, à confirmer avec Imagine Hair</small>`;
  }

  // la sélection s’écrit comme une phrase ; chaque mot souligné ramène à son étape
  const sumS = $('[data-sum-s]');
  const sumP = $('[data-sum-p]');
  let lastSum = '';
  let lastParts = [];
  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const done = state.step === 5;
    const btn = (n, txt) => `<button type="button" class="sw" data-goto="${n}"${done || n > state.max ? ' disabled' : ''}>${txt}</button>`;
    let parts;
    if (!svc) parts = [`<span class="sum__ph">Cheveux ${LEN[state.len]}. Choisissez une prestation&nbsp;: la phrase s’écrit ici.</span>`];
    else {
      parts = [btn(1, cap(svc.name.toLowerCase())), `<span>${svc.flat ? ', prix unique' : `, cheveux ${LEN[state.len]}`}</span>`];
      if (day) parts.push(`<span>, </span>${btn(2, fmtLong.format(day.date))}`);
      if (day && state.time != null) parts.push(`<span> à </span>${btn(3, hm(state.time))}`);
      parts.push('<span>.</span>');
    }
    const html = parts.join('');
    if (html !== lastSum) {
      // seul le morceau qui change apparaît en fondu (@starting-style)
      sumS.innerHTML = parts.map((p, i) => `<span class="seg${p !== lastParts[i] ? ' fresh' : ''}">${p}</span>`).join('');
      lastSum = html;
      lastParts = parts;
    }
    sumP.textContent = svc ? `${euro(priceOf(svc, state.len))} · ${dur(durOf(svc, state.len))}` : '';
    const ma = $('[data-mini-a]', form);
    const mp = $('[data-mini-p]', form);
    if (ma && mp) {
      const when = day ? `${fmtShort.format(day.date).replace(/\./g, '')}${state.time != null ? ', ' + slotTime(state.time) : ''} · ` : '';
      ma.textContent = svc ? `${when}${svc.name}${svc.flat ? '' : ', ' + LEN[state.len]}` : `Cheveux ${LEN[state.len]} · prestation à choisir`;
      mp.textContent = svc ? euro(priceOf(svc, state.len)) : '';
    }
  }
  sumS.addEventListener('click', (e) => {
    const b = e.target.closest('[data-goto]');
    if (!b || b.disabled) return;
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 5) go(n);
  });

  function show(panel, back) {
    panel.hidden = false;
    if (reduce.matches) return;
    panel.classList.add(back ? 'is-enter-back' : 'is-enter');
    panel.getBoundingClientRect();
    requestAnimationFrame(() => panel.classList.remove('is-enter', 'is-enter-back'));
  }

  const noticeEl = $('[data-notice]', form);
  function notify(msg) {
    if (!noticeEl) return;
    noticeEl.textContent = msg;
    noticeEl.hidden = !msg;
    if (msg && live) live.textContent = msg;
  }

  function go(step, opts = {}) {
    freshDays();
    let gone = false;
    if (state.day && !dayByIso(state.day)) { gone = true; state.day = null; state.time = null; state.max = Math.min(state.max, 2); if (step > 2) step = 2; }
    const from = state.step;
    state.step = step;
    state.max = Math.max(state.max, Math.min(step, 4));
    if (step === 1) renderServices();
    if (step === 2) renderDays();
    if (step === 3) renderSlots();
    if (step === 4) renderRecap();
    let current;
    panels.forEach((p) => {
      const s = +p.dataset.step;
      if (s === step) { current = p; if (s !== from || p.hidden) show(p, step < from); }
      else p.hidden = true;
    });
    stepBtns.forEach((b) => {
      const n = +b.dataset.goto;
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = step === 5 || n > state.max;
    });
    $$('.err[data-err]', form).forEach((e) => { e.hidden = true; });
    panels.forEach((p) => p.removeAttribute('aria-describedby'));
    updateSummary();
    if (!opts.silent) notify(gone ? `Le jour choisi est passé${NB}: choisissez-en un autre.` : '');
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Rien n’a été envoyé au salon.' : `${gone ? `Le jour choisi est passé${NB}: choisissez-en un autre.` + ' ' : ''}Étape ${step} sur 4${NB}: ${LABELS[step]}.`;
    const h = $('.panel__t', current);
    if (h) h.focus({ preventScroll: true });
    const target = step === 5 || !wide.matches ? $('[data-book-grid]') : form;
    const r = target.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  }

  function next() {
    const s = state.step;
    const fail = (n) => {
      const e = $(`[data-err="${n}"]`, form);
      if (e) e.hidden = false;
      const fs = $(`.panel[data-step="${n}"]`, form);
      if (fs) fs.setAttribute('aria-describedby', 'err-' + n);
      const first = $(`.panel[data-step="${n}"] input[name="${n === 1 ? 'service' : n === 2 ? 'day' : 'time'}"]:not(:disabled)`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s > 1 && !state.service) return go(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  function recheckTime() {
    if (!state.day) { state.max = Math.min(state.max, 2); return; }
    renderDays();
    if (!state.day) { state.max = Math.min(state.max, 2); return; }
    if (state.time != null && !slotsFor(dayByIso(state.day), curLength()).some((s) => s.m === state.time && s.free)) state.time = null;
    if (state.time == null) state.max = Math.min(state.max, 3);
  }

  function applyLen(len) {
    if (len === state.len) return;
    state.len = len;
    const b = $(`input[name="blen"][value="${len}"]`, form);
    if (b) b.checked = true;
    const svc = svcById(state.service);
    const lost = svc && !okFor(svc, len);
    const hadDay = state.day;
    const hadTime = state.time;
    if (lost) { state.service = null; state.max = 1; }
    else if (state.service) recheckTime();
    stepBtns.forEach((x) => { x.disabled = state.step === 5 || +x.dataset.goto > state.max; });
    updateSummary();
    let msg = '';
    if (lost) msg = `Aucun prix relevé pour «${NB}${svc.name.toLowerCase()}${NB}» en cheveux ${LEN[len]}${NB}: choisissez une autre prestation.`;
    else if (svc && hadDay && !state.day) msg = `Plus de créneau ce jour-là pour ${dur(curLength())} de prestation${NB}: choisissez un autre jour.`;
    else if (svc && hadTime != null && state.time == null) msg = `Créneau de ${slotTime(hadTime)} retiré${NB}: en cheveux ${LEN[len]}, la prestation dure ${dur(curLength())}.`;
    notify(msg);
    if (state.step === 1) { renderServices(); return; }
    if (state.step === 5) return;
    if (!state.service) { go(1, { silent: true }); return; }
    if (!state.day && state.step > 2) { go(2, { silent: true }); return; }
    if (state.step === 2) renderDays();
    if (state.step === 3) renderSlots();
    if (state.step === 4) { if (state.time == null) { go(3, { silent: true }); return; } renderRecap(); }
  }
  // la longueur de la phrase et celle de la réservation se suivent
  lenSink = (len, from) => {
    if (from !== 'phrase' && phLen && phLen.value !== len) { phLen.value = len; renderAnswer(false); }
    if (state.step !== 5) applyLen(len);
  };

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'blen') { lenSink(t.value, 'book'); return; }
    notify('');
    if (t.name === 'service') { state.service = t.value; recheckTime(); }
    if (t.name === 'day') { state.day = t.value; state.time = null; state.max = Math.min(state.max, 3); }
    if (t.name === 'time') state.time = +t.value;
    const n = t.name === 'service' ? 1 : t.name === 'day' ? 2 : t.name === 'time' ? 3 : 0;
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
  $$('[data-goto]', form).forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 5) go(n);
  }));

  function bookService(id, len) {
    const svc = svcById(id);
    if (!svc) return false;
    if (state.step === 5) restart(true);
    if (len) { if (phLen && phLen.value !== len) { phLen.value = len; renderAnswer(false); } applyLen(len); }
    if (!okFor(svc, state.len)) return false;
    state.service = svc.id;
    recheckTime();
    renderServices();
    go(2);
    return true;
  }
  // « Réserver ce créneau » : la phrase passe telle quelle dans la réservation
  if (ansBook) ansBook.addEventListener('click', (e) => { e.preventDefault(); bookService(phSvc.value, phLen.value); });
  // « Réserver » dans la carte : la longueur de la phrase est gardée
  // et la phrase du haut se met à jour ; si la longueur choisie n’a pas de prix, on prend la première qui en a un
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const svc = svcById(b.dataset.book);
    if (!svc) return;
    const was = phLen ? phLen.value : state.len;
    const len = svc.flat || okFor(svc, was) ? was : LENS.find((l) => okFor(svc, l));
    if (phSvc) phSvc.value = svc.id;
    if (phLen) phLen.value = len;
    renderAnswer(false);
    if (!bookService(svc.id, len)) { go(1); return; }
    if (len !== was) notify(`Pas de prix relevé pour cheveux ${LEN[was]}${NB}: la réservation passe en cheveux ${LEN[len]}.`);
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
    if (state.step < 4) { next(); return; }
    if (state.step !== 4) return;
    const a = fieldErr(name, 'e-name', !name.value.trim());
    const b = fieldErr(tel, 'e-tel', !telOk(tel.value));
    if (!a) { name.focus(); return; }
    if (!b) { tel.focus(); return; }
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc) { go(1); return; }
    if (!day) { go(2); return; }
    if (state.time == null) { go(3); return; }
    // le créneau a pu passer pendant qu’on remplissait le formulaire
    if (!slotsFor(day, durOf(svc, state.len)).some((s) => s.m === state.time && s.free)) {
      state.time = null; state.max = 3; go(3); notify(`Ce créneau est passé${NB}: choisissez une autre heure.`); return;
    }
    state.name = name.value.trim();
    $('[data-done-title]', form).textContent = `À ${fmtLong.format(day.date)}, ${state.name}.`;
    $('[data-done-when]', form).textContent = `${hm(state.time)} · ${svc.name}${lenWords(svc)} · ${dur(durOf(svc, state.len))} · ${euro(priceOf(svc, state.len))} (indicatif).`;
    go(5);
  });

  function restart(silent) {
    const keep = phLen ? phLen.value : state.len;
    form.reset();
    Object.assign(state, { step: 1, max: 1, len: keep, service: null, day: null, time: null, name: '' });
    const b = $(`input[name="blen"][value="${keep}"]`, form);
    if (b) b.checked = true;
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((x) => { x.hidden = true; });
    notify('');
    go(1, { silent: !!silent });
  }

  /* .ics en UTC, lignes CRLF pliées à 75 octets */
  function parisOffset(ms) { const p = paris(new Date(ms)); return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - ms) / 60000); }
  function toUTC(day, m) {
    const d = day.date;
    const wall = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(m / 60), m % 60);
    const guess = wall - parisOffset(wall) * 60000;
    return wall - parisOffset(guess) * 60000;
  }
  const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  function fold(line) {
    const enc = new TextEncoder();
    if (enc.encode(line).length <= 75) return line;
    const out = []; let cur = ''; let n = 0;
    for (const ch of line) { const b = enc.encode(ch).length; if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; } cur += ch; n += b; }
    out.push(cur);
    return out.join('\r\n ');
  }
  function downloadIcs() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    const start = toUTC(day, state.time);
    const length = durOf(svc, state.len);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ' + CFG.shop + '//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${svc.id}-${state.len}@${CFG.uid}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + length * 60000)}`,
      `SUMMARY:${esc(svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc('Simulation depuis un aperçu non officiel\u00a0: ce rendez-vous n’a pas été transmis au salon. Tarif et durée indicatifs. Tél. ' + CFG.phone)}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url; a.download = CFG.ics;
    doc.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  if (phLen && phLen.value !== state.len) applyLen(phLen.value);
  go(1, { silent: true });
})();
