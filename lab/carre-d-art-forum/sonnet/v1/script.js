/* Carré d’Art Forum · aperçu. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Carré d’Art Forum',
    address: '1 rue de l’Arbalète, 51100 Reims',
    phone: '03 26 88 96 10',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    // Planity, relevé le 01/11/2026 : mar–ven 9 h – 19 h, sam 9 h – 18 h, lun et dim fermés.
    hours: { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] },
    step: 30,
    days: 14,
    uid: 'apercu.carre-d-art-forum',
    ics: 'rdv-carre-d-art-forum.ics'
  };
  const CATS = [
    ['femme', 'Femme'], ['homme', 'Homme'], ['couleur', 'Couleur'], ['meches', 'Mèches & ombré'],
    ['etudiants', 'Étudiants & enfants'], ['soins', 'Soin, mains & pieds'], ['lookbar', 'Look Bar']
  ];

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

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
  // « 9 h », « 14 h 30 » : l’heure à la française
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
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
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

  /* ---------- entrée ---------- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) {
    // le mot-symbole monte une fois l’Archivo chargée, sans attendre plus de 700 ms
    Promise.race([doc.fonts.load('800 1em Archivo').catch(() => null), new Promise((r) => setTimeout(r, 700))]).then(ready);
  } else {
    ready();
  }

  /* ---------- ouvert / fermé + aujourd’hui dans le tableau ---------- */
  (function status() {
    const { t, dow, now } = today();
    const row = $(`.hours__table tr[data-dow="${dow}"]`);
    if (row) {
      row.classList.add('is-today');
      const th = $('th', row);
      if (th) th.insertAdjacentHTML('beforeend', '<span class="today-tag">aujourd’hui</span>');
    }
    const el = $('[data-status]');
    const pill = $('[data-pill]');
    const h = CFG.hours[dow];
    const todayHoliday = isHoliday(new Date(Date.UTC(t.y, t.m - 1, t.d, 12)));
    let txt;
    let pillTxt;
    let open = false;
    if (h && now < h[1] && todayHoliday) {
      txt = `Férié${NB}: horaires à confirmer.`;
      pillTxt = 'Férié';
    } else if (h && now < h[0]) {
      txt = `Ouvre à ${hfr(h[0])}.`;
      pillTxt = 'Bientôt';
    } else if (h && now < h[1]) {
      txt = `Ouvert jusqu’à ${hfr(h[1])}.`;
      pillTxt = 'Ouvert';
      open = true;
    } else {
      pillTxt = 'Fermé';
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) {
          const when = k === 1 ? 'demain' : DAYS[d];
          txt = (h ? 'Fermé.' : `Fermé ce ${DAYS[dow]}.`) + ` Ouvre ${when} à ${hfr(CFG.hours[d][0])}.`;
          break;
        }
      }
    }
    if (el) $('[data-status-text]', el).textContent = txt;
    if (pill) {
      $('[data-pill-text]', pill).textContent = pillTxt;
      pill.classList.toggle('is-open', open);
    }
  })();

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu'), $('[data-bar]')].filter(Boolean);
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
    window.matchMedia('(min-width: 1180px)').addEventListener('change', (e) => {
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
    watch('.hero__cta', 'hero');
    watch('#rendez-vous', 'book');
    watch('#foot', 'foot');
  }

  /* ---------- questions : le texte monte de 6 px à l’ouverture ---------- */
  $$('.faq details').forEach((d) => d.addEventListener('toggle', () => {
    const a = $('.faq__a', d);
    if (!d.open || !a || reduce.matches || typeof a.animate !== 'function') return;
    a.getAnimations().forEach((x) => x.cancel());
    a.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: EASE_OUT });
  }));

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

  /* ---------- Look Bar : un euro la minute ---------- */
  (function lookBar() {
    const wrap = $('[data-lb]');
    if (!wrap) return;
    const price = $('[data-lb-price]', wrap);
    const btn = $('[data-lb-book]', wrap);
    wrap.addEventListener('change', (e) => {
      if (e.target.name !== 'lb') return;
      const v = e.target.value;
      price.textContent = v + NB + '€';
      btn.dataset.book = 'lb-' + v;
      if (typeof price.animate !== 'function') return;
      price.getAnimations().forEach((a) => a.cancel());
      if (reduce.matches) price.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
      else price.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: EASE_OUT });
    });
  })();

  /* =========================================================
     Réservation (simulation : rien n’est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const cleanText = (node) => {
    if (!node) return '';
    const c = node.cloneNode(true);
    $$('.sr-only', c).forEach((n) => n.remove());
    return c.textContent.replace(/[ \t\r\n]+/g, ' ').trim();
  };
  const services = $$('.row[data-id]').map((r) => ({
    id: r.dataset.id,
    cat: r.dataset.cat,
    name: r.dataset.name,
    short: r.dataset.short || r.dataset.name,
    min: +r.dataset.min,
    price: +r.dataset.price,
    from: !!$('.from', r),
    detail: cleanText($('.row__d', r))
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const card = $('[data-live-card]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const SR_EMPTY = { day: 'jour à choisir', time: 'heure à choisir', service: 'prestation à choisir', price: 'selon la prestation' };
  const state = { step: 1, max: 1, cat: 'femme', service: null, day: null, time: null, name: '' };

  // FNV-1a : créneaux « déjà pris » déterministes
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };

  const days = (() => {
    const { t } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay(), hol: isHoliday(date) };
    });
  })();
  const dayByIso = (v) => days.find((d) => d.iso === v);

  function slotsFor(day, length) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 26;
    const out = [];
    for (let m = h[0]; m + length <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      let taken = false;
      for (let b = m; b < m + length; b += CFG.step) if (takenBase(b)) { taken = true; break; }
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* le créneau se remplit dans la niche */
  function fill(key, text) {
    if (!card) return;
    const el = $(`[data-fill="${key}"]`, card);
    const sr = $(`[data-fill-sr="${key}"]`, card);
    if (!el || el.textContent === text) return;
    el.textContent = text;
    if (sr) sr.textContent = text ? '' : SR_EMPTY[key];
    if (!text || typeof el.animate !== 'function') return;
    el.getAnimations().forEach((a) => a.cancel());
    if (reduce.matches) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' });
    } else {
      el.animate([{ clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% -4% -10% 0)' }], { duration: 280, easing: EASE_OUT });
    }
  }

  /* étape 1 : l’arcade des catégories, puis les prestations de la catégorie */
  const catWrap = $('[data-cats]', form);
  const svcWrap = $('[data-services]', form);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  catWrap.setAttribute('role', 'radiogroup');
  catWrap.setAttribute('aria-label', 'Catégorie de prestations');
  catWrap.innerHTML = CATS.filter(([id]) => services.some((s) => s.cat === id)).map(([id, label]) =>
    `<label class="cat"><input type="radio" name="cat" value="${id}"${state.cat === id ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('');

  function renderServices() {
    svcWrap.innerHTML = services.filter((s) => s.cat === state.cat).map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}"${state.service === s.id ? ' checked' : ''}>
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${esc(s.name)}<small>${s.detail ? esc(s.detail) : dur(s.min)}</small></span>
      <span class="opt__price">${s.from ? 'dès' + NB : ''}${s.price}${NB}€</span>
    </label>`).join('');
  }

  function renderDays() {
    const svc = svcById(state.service);
    const length = svc ? svc.min : CFG.step;
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow];
      const list = open ? slotsFor(d, length) : [];
      const free = list.filter((s) => s.free).length;
      const over = open && list.length > 0 && list.every((s) => s.past);
      const dis = !open || free === 0;
      const why = !open ? 'fermé' : over ? 'terminé' : 'complet';
      const tag = dis ? why : d.hol ? 'férié' : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (d.hol ? ', jour férié, horaires à confirmer' : '') +
        (dis ? `, ${why}` : `, ${plural(free, 'créneau libre', 'créneaux libres')}`);
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span aria-hidden="true"><span class="day__w">${fmtW.format(d.date)}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m${d.hol && !dis ? ' day__m--hol' : ''}">${tag}</span></span></label>`;
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
    note.textContent = `${cap(fmtLong.format(day.date))} · ${plural(free, 'créneau libre', 'créneaux libres')} pour ${/^Look Bar/.test(svc.short) ? svc.short : svc.short.toLowerCase() + ' (' + dur(svc.min) + ')'}.` +
      (day.hol ? ` Jour férié${NB}: horaires à confirmer avec le salon.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Plus de place ce jour-là. Un autre jour, ou un appel au ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    const groups = [['Matin', 0, 720], ['Après-midi', 720, 1020], ['Fin de journée', 1020, 1440]];
    wrap.innerHTML = groups.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', déjà pris' : '';
          return `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${hfr(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${iso(s.m)}">${hfr(s.m)}</time></span></label>`;
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
      `<strong>${esc(svc.name)}</strong><span>${cap(fmtLong.format(day.date))} à ${hfr(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${svc.from ? 'dès' + NB : ''}${svc.price}${NB}€ (tarif indicatif)</span><small>${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    fill('service', svc ? svc.short : '');
    fill('price', svc ? `${svc.from ? 'dès' + NB : ''}${svc.price}${NB}€` : '');
    fill('day', day ? fmtLong.format(day.date) : '');
    fill('time', state.time != null ? hfr(state.time) : '');
    const pick = $('[data-pick]', form);
    if (pick) {
      const done = state.step === 5;
      pick.hidden = done || !(svc || day);
      pick.innerHTML = `<span>Votre créneau</span>${svc ? esc(svc.short) + ', ' + (svc.from ? 'dès' + NB : '') + svc.price + NB + '€' : '…'} · ${day ? fmtLong.format(day.date) : '…'} · ${state.time != null ? hfr(state.time) : '…'}`;
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
    if (live) live.textContent = step === 5 ? 'Rendez-vous simulé : rien n’a été envoyé au salon.' : `Étape ${step} sur 4 : ${LABELS[step]}.`;
    const h = $('.panel__t', current);
    if (h) h.focus({ preventScroll: true });
    if (!opts.noScroll) {
      const r = form.getBoundingClientRect();
      if (r.top < 0 || r.top > window.innerHeight * 0.6) form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  function next() {
    const s = state.step;
    const fail = (n) => {
      const e = $(`[data-err="${n}"]`, form);
      if (e) e.hidden = false;
      const fs = $(`.panel[data-step="${n}"]`, form);
      if (fs) fs.setAttribute('aria-describedby', 'err-' + n);
      const first = $(`.panel[data-step="${n}"] ${n === 1 ? 'input[name="service"]' : 'input:not(:disabled)'}`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  // une nouvelle prestation peut changer la durée : on revérifie le jour et l’heure
  function setService(id) {
    state.service = id;
    if (state.day) {
      renderDays();
      if (state.day && state.time != null) {
        const ok = slotsFor(dayByIso(state.day), svcById(id).min).some((s) => s.m === state.time && s.free);
        if (!ok) state.time = null;
      }
    }
    if (!state.day) state.max = Math.min(state.max, 2);
    else if (state.time == null) state.max = Math.min(state.max, 3);
    const e1 = $('[data-err="1"]', form);
    if (e1) e1.hidden = true;
    const fs = $('.panel[data-step="1"]', form);
    if (fs) fs.removeAttribute('aria-describedby');
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'cat') {
      state.cat = t.value;
      const cur = svcById(state.service);
      if (cur && cur.cat !== t.value) {
        state.service = null; state.day = null; state.time = null; state.max = 1;
        stepBtns.forEach((b) => { b.disabled = +b.dataset.goto > state.max; });
        updateSummary();
      }
      renderServices();
      return;
    }
    if (t.name === 'service') setService(t.value);
    if (t.name === 'day') { state.day = t.value; state.time = null; state.max = Math.min(state.max, 3); }
    if (t.name === 'time') state.time = +t.value;
    const n = t.name === 'day' ? 2 : t.name === 'time' ? 3 : 0;
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
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 5) go(n);
  }));

  // « Réserver » sur une ligne de la carte : présélection (catégorie comprise), puis le jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const svc = svcById(b.dataset.book);
    if (!svc) return;
    if (state.step === 5) restart(true);
    state.cat = svc.cat;
    const catInput = $(`input[name="cat"][value="${svc.cat}"]`, form);
    if (catInput) catInput.checked = true;
    state.service = svc.id;
    renderServices();
    setService(svc.id);
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
    state.name = name.value.trim();
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    $('[data-done-when]', form).textContent =
      `${cap(fmtLong.format(day.date))} à ${hfr(state.time)} · ${svc.name}, ${dur(svc.min)}, ${svc.from ? 'dès' + NB : ''}${svc.price}${NB}€ (indicatif).`;
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, cat: 'femme', service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
    renderServices();
    go(1, { silent: !!silent });
  }

  /* .ics, en UTC, lignes CRLF pliées à 75 octets */
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
  const icsEsc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
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
      `SUMMARY:${icsEsc(svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${icsEsc(CFG.address)}`,
      `DESCRIPTION:${icsEsc(`Essai, depuis un aperçu non officiel${NB}: ce rendez-vous n’a pas été transmis au salon. Tél. ` + CFG.phone)}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = url;
    a.download = CFG.ics;
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  renderServices();
  go(1, { silent: true });
})();
