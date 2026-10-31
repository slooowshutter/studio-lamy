/* Oxypur coiffure · v3 « La une » · aperçu. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Oxypur coiffure',
    address: '357 rue de Vaugirard, 75015 Paris',
    phone: '01 40 43 92 57',
    // 0 = dimanche. Relevé (Pages Jaunes via Mappy) : jeudi, vendredi, samedi.
    // Fermé d’après un extrait Pages Jaunes (31/10/2026, à confirmer) : les autres jours.
    hours: { 0: null, 1: null, 2: null, 3: null, 4: [510, 1140], 5: [510, 1140], 6: [540, 1080] },
    step: 30,
    days: 14,
    uid: 'apercu.oxypur.v3',
    ics: 'rdv-oxypur.ics'
  };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';

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
    return { t, date, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const slotTime = (m) => Math.floor(m / 60) + 'h' + pad(m % 60);
  const prose = (m) => Math.floor(m / 60) + 'h' + (m % 60 ? pad(m % 60) : '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtFull = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
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

  /* ---------- la manchette s’imprime quand Literata est là (700 ms max) ---------- */
  const fontReady = doc.fonts && doc.fonts.load
    ? Promise.race([doc.fonts.load('600 1em Literata'), new Promise((r) => setTimeout(r, 700))]).catch(() => {})
    : Promise.resolve();
  fontReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))));

  /* ---------- la date du jour, le gros titre, les horaires ---------- */
  const dateline = $('[data-dateline]');
  const headline = $('[data-headline]');
  function nextOpen(date) {
    for (let k = 1; k <= 14; k++) {
      const d = new Date(date.getTime() + k * 86400000);
      const h = CFG.hours[d.getUTCDay()];
      if (h && !holiday(d)) return { k, d, dow: d.getUTCDay(), h };
    }
    return null;
  }
  function edition() {
    const { dow, now, date } = today();
    if (dateline) dateline.innerHTML = `<span class="dl">${cap(fmtFull.format(date))}</span> <span class="dl"><span aria-hidden="true">· </span>Paris 15<sup>e</sup></span>`;
    $$('.hrs tr.is-today').forEach((tr) => { tr.classList.remove('is-today'); const s = $('.hrs__today', tr); if (s) s.remove(); });
    const row = $(`.hrs tr[data-dow="${dow}"]`);
    if (row) { row.classList.add('is-today'); $('th', row).insertAdjacentHTML('afterbegin', '<span class="hrs__today">aujourd’hui</span>'); }
    if (!headline) return;
    const h = CFG.hours[dow];
    const n = nextOpen(date);
    const when = n ? (n.k === 1 ? 'demain' : DAYS[n.dow]) : '';
    const re = n ? `réouverture ${when} à ${prose(n.h[0])}` : 'réouverture à confirmer';
    let t;
    if (!h) t = `Fermé ce ${DAYS[dow]} (à confirmer)${NB}: ${re}.`;
    else if (holiday(date)) t = `Jour férié${NB}: ouverture à confirmer avec le salon.`;
    else if (now < h[0]) t = `Ouverture aujourd’hui à ${prose(h[0])}, jusqu’à ${prose(h[1])}.`;
    else if (now < h[1]) t = `Ouvert aujourd’hui jusqu’à ${prose(h[1])}.`;
    else t = `Fermé pour ce soir${NB}: ${re}.`;
    headline.textContent = t;
    const td = $('[data-today]');
    if (td) td.textContent = t;
  }
  edition();
  setInterval(edition, 60000);

  /* ---------- menu mobile ---------- */
  const top = $('.top');
  const menuBtn = $('.top__menu');
  const nav = $('#nav');
  if (top && menuBtn && nav) {
    menuBtn.hidden = false;
    top.classList.add('has-menu');
    const mq = window.matchMedia('(min-width: 1240px)');
    const setOpen = (open, focusBtn) => {
      top.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.top__menu-l', menuBtn).textContent = open ? 'Fermer' : 'Sommaire';
      if (open) requestAnimationFrame(() => { const first = $('a', nav); if (first) first.focus({ preventScroll: true }); });
      else if (focusBtn) menuBtn.focus();
    };
    menuBtn.addEventListener('click', () => setOpen(!top.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a') && !mq.matches) setOpen(false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && top.classList.contains('is-open')) { e.preventDefault(); setOpen(false, true); }
    });
    doc.addEventListener('click', (e) => {
      if (top.classList.contains('is-open') && !top.contains(e.target)) setOpen(false);
    });
    const onMq = () => { if (mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { cta: true, book: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.cta && !seen.book && !seen.foot);
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('[data-hero-cta]', 'cta');
    watch('#bulletin', 'book');
    watch('#foot', 'foot');
  } else if (bar) bar.classList.add('is-on');

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

  /* =========================================================
     Le bulletin (simulation : rien n’est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const services = $$('.row[data-id]').map((r) => ({
    id: r.dataset.id, name: r.dataset.name, min: +r.dataset.min, price: +r.dataset.price,
    cat: r.closest('.lg').dataset.cat
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const groups = $$('.lg').map((g) => ({ cat: g.dataset.cat, label: $('.lg__t', g).textContent.trim() }));
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
  const state = { step: 1, max: 1, service: null, day: null, time: null, name: '' };

  const t0 = today();
  const couponNo = `357-${pad(t0.t.m)}${pad(t0.t.d)}`;
  const cn = $('[data-coupon-no]');
  if (cn) cn.textContent = couponNo;

  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };
  const days = Array.from({ length: CFG.days }, (_, i) => {
    const date = new Date(Date.UTC(t0.t.y, t0.t.m - 1, t0.t.d + i, 12));
    return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay() };
  });
  const dayByIso = (v) => days.find((d) => d.iso === v);
  const curLength = () => { const s = svcById(state.service); return s ? s.min : CFG.step; };

  function slotsFor(day, length) {
    const h = CFG.hours[day.dow];
    if (!h || holiday(day.date)) return [];
    const { now } = today();
    const taken = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 30;
    const out = [];
    for (let m = h[0]; m + length <= h[1]; m += CFG.step) {
      const past = day.i === 0 && m <= now + 15;
      let tk = false;
      for (let b = m; b < m + length; b += CFG.step) if (taken(b)) { tk = true; break; }
      out.push({ m, past, taken: tk, free: !past && !tk });
    }
    return out;
  }

  $('[data-services]', form).innerHTML = groups.map((g) => {
    const list = services.filter((s) => s.cat === g.cat);
    if (!list.length) return '';
    return `<div class="opts__g" role="group" aria-labelledby="og-${g.cat}"><h4 id="og-${g.cat}">${g.label}</h4>${
      list.map((s) => `
      <label class="opt">
        <input type="radio" name="service" value="${s.id}">
        <span class="opt__name">${s.name}<small>${dur(s.min)} · indicatif</small></span>
        <span class="opt__price">${euro(s.price)}</span>
      </label>`).join('')
    }</div>`;
  }).join('');

  function renderDays() {
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
      if (shut) aria += ', fermé (à confirmer)';
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
    const slots = slotsFor(day, svc.min);
    const free = slots.filter((s) => s.free).length;
    const h = CFG.hours[day.dow];
    note.textContent = `${cap(fmtLong.format(day.date))}, ouvert de ${prose(h[0])} à ${prose(h[1])} · ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''} pour ${svc.name.toLowerCase()} (${dur(svc.min)}).`;
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Plus aucun créneau ce jour-là. Choisissez un autre jour, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
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

  function renderRecap() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${slotTime(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${euro(svc.price)}</span><small>${CFG.address} · tarif indicatif, à confirmer avec Oxypur</small>`;
  }

  // les champs imprimés du bulletin se remplissent
  function write(key, val, empty) {
    const n = $(`[data-sum="${key}"]`);
    if (!n) return;
    n.classList.toggle('is-empty', !!empty);
    if (n.textContent === val) return;
    n.textContent = val;
    if (!empty && !reduce.matches) {
      n.classList.add('is-new');
      n.getBoundingClientRect();
      requestAnimationFrame(() => n.classList.remove('is-new'));
    }
  }
  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    write('service', svc ? `${svc.name}, ${dur(svc.min)}` : 'à choisir', !svc);
    write('day', day ? cap(fmtLong.format(day.date)) : NB, !day);
    write('time', state.time != null ? slotTime(state.time) : NB, state.time == null);
    write('price', svc ? `${euro(svc.price)} (indicatif)` : NB, !svc);
  }

  function show(panel, back) {
    panel.hidden = false;
    if (reduce.matches) return;
    panel.classList.add(back ? 'is-enter-back' : 'is-enter');
    panel.getBoundingClientRect();
    requestAnimationFrame(() => panel.classList.remove('is-enter', 'is-enter-back'));
  }

  function go(step, opts = {}) {
    const from = state.step;
    state.step = step;
    state.max = Math.max(state.max, Math.min(step, 4));
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
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Rien n’a été envoyé au salon.' : `Étape ${step} sur 4 : ${LABELS[step]}.`;
    const h = $('.panel__t', current);
    if (h) h.focus({ preventScroll: true });
    const target = $('[data-book-grid]');
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
      const first = $(`.panel[data-step="${n}"] input:not(:disabled)`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'service') {
      state.service = t.value;
      if (state.day) {
        renderDays();
        if (state.day && state.time != null && !slotsFor(dayByIso(state.day), curLength()).some((s) => s.m === state.time && s.free)) state.time = null;
      }
      if (!state.day) state.max = Math.min(state.max, 2);
      else if (state.time == null) state.max = Math.min(state.max, 3);
    }
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

  // « réserver » dans les tarifs : la prestation est déjà cochée
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    if (state.step === 5) restart(true);
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
    if (state.step < 4) { next(); return; }
    if (state.step !== 4) return;
    const a = fieldErr(name, 'e-name', !name.value.trim());
    const b = fieldErr(tel, 'e-tel', !telOk(tel.value));
    if (!a) { name.focus(); return; }
    if (!b) { tel.focus(); return; }
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc) { go(1); return; }
    if (!day || state.time == null) { go(day ? 3 : 2); return; }
    state.name = name.value.trim();
    $('[data-done-k]', form).textContent = `Reçu n°${NB}${couponNo}-${iso(state.time).replace(':', '')}`;
    $('[data-done-title]', form).textContent = `Bulletin rempli, ${state.name}.`;
    $('[data-done-when]', form).textContent = `${cap(fmtLong.format(day.date))} à ${slotTime(state.time)} · ${svc.name}, ${dur(svc.min)}, ${euro(svc.price)} (indicatif).`;
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((x) => { x.hidden = true; });
    go(1, { silent: !!silent });
  }

  /* .ics en UTC, lignes CRLF pliées à 75 octets */
  function parisOffset(ms) {
    const p = paris(new Date(ms));
    return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - ms) / 60000);
  }
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
    const out = [];
    let cur = '';
    let n = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
      cur += ch; n += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }
  function downloadIcs() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    const start = toUTC(day, state.time);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ' + CFG.shop + '//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${svc.id}@${CFG.uid}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + svc.min * 60000)}`,
      `SUMMARY:${esc(svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc('Simulation depuis un aperçu non officiel : ce rendez-vous n’a pas été transmis au salon. Tarif et durée indicatifs. Tél. ' + CFG.phone)}`,
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
