/* AS Coiffure · proposition 2 « Deux portes ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'AS Coiffure',
    address: '15 place Catinat, 59800 Lille',
    phone: '03 20 54 01 04',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    // Planity, relevé le 30/10/2026 : lun–ven 9 h 30 – 19 h, samedi 8 h – 13 h (9 h selon un annuaire), dimanche fermé.
    hours: { 0: null, 1: [570, 1140], 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [480, 780] },
    satFlag: 6,
    grid: [480, 1140], // l'emploi du temps va de 8 h à 19 h
    step: 30,
    days: 14,
    uid: 'apercu-v2.as-coiffure',
    ics: 'rdv-as-coiffure.ics',
    // Tarifs relevés sur Planity (30/10/2026). est = durée non publiée, estimée.
    services: [
      { id: 'h-court', side: 'salon', g: 'Hommes', name: 'Coupe, cheveux courts', short: 'Coupe homme courte', min: 20, price: 26, note: 'shampoing, coupe, coiffage' },
      { id: 'h-long', side: 'salon', g: 'Hommes', name: 'Coupe, cheveux mi-longs à longs', short: 'Coupe homme mi-longue', min: 30, price: 31, note: 'shampoing, coupe, coiffage' },
      { id: 'barbe', side: 'salon', g: 'Hommes', name: 'Barbe', short: 'Barbe', min: 20, price: 22, note: 'taille et rasage' },
      { id: 'f-brush', side: 'salon', g: 'Femmes', name: 'Shampoing + brushing', short: 'Brushing', min: 30, est: true, price: 26, from: true, note: 'prix selon la longueur' },
      { id: 'f-coupe', side: 'salon', g: 'Femmes', name: 'Shampoing, coupe + brushing, cheveux courts', short: 'Coupe + brushing', min: 45, est: true, price: 39 },
      { id: 'f-racines', side: 'salon', g: 'Couleur', name: 'Racines + brushing', short: 'Racines + brushing', min: 90, est: true, price: 63, from: true, note: 'prix selon la longueur' },
      { id: 'ongles', side: 'salon', g: 'Ongles', name: 'Vernis semi-permanent', short: 'Semi-permanent', min: 45, est: true, price: 30, from: true },
      { id: 'hs-1', side: 'annexe', g: 'L’Annexe', name: 'Head spa Découverte', short: 'Head spa Découverte', min: 75, price: 80 },
      { id: 'hs-2', side: 'annexe', g: 'L’Annexe', name: 'Head spa Expert', short: 'Head spa Expert', min: 105, price: 180 },
      { id: 'hs-3', side: 'annexe', g: 'L’Annexe', name: 'Head spa Prestige (Tokio)', short: 'Head spa Prestige', min: 135, price: 260 },
      { id: 'consult', side: 'salon', g: 'Conseil', name: 'Consultation', short: 'Consultation', min: 15, price: 15, note: 'déduite de la facture finale' }
    ]
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
  const durOf = (s) => (s.est ? '≈' + NB : '') + dur(s.min);
  const priceOf = (s) => (s.from ? 'dès' + NB : '') + s.price + NB + '€';
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
    Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(ready);
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
  function status() {
    const { dow, now, date } = today();
    const el = $('[data-status]');
    if (!el) return;
    const h = CFG.hours[dow];
    const flag = (d) => (d === CFG.satFlag ? ' (à confirmer)' : '');
    let txt;
    let open = false;
    if (h && now < h[1] && isHoliday(date)) {
      txt = `Jour férié${NB}: horaires à confirmer avec le salon`;
    } else if (h && now < h[0]) {
      txt = `Ouvre aujourd’hui à ${hfr(h[0])}${flag(dow)}, jusqu’à ${hfr(h[1])}`;
    } else if (h && now < h[1]) {
      txt = dow === CFG.satFlag ? `Ouvert ce matin, jusqu’à ${hfr(h[1])} (horaires du samedi à confirmer)` : `Ouvert, jusqu’à ${hfr(h[1])} ce soir`;
      open = true;
    } else {
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) {
          const when = k === 1 ? 'demain' : DAYS[d];
          const hol = isHoliday(addDays(date, k)) ? ' (jour férié, à confirmer)' : flag(d);
          txt = (h ? 'Fermé pour aujourd’hui' : `Fermé le ${DAYS[dow]}`) + `. Réouverture ${when} à ${hfr(CFG.hours[d][0])}${hol}`;
          break;
        }
      }
    }
    const out = $('[data-status-text]', el);
    if (out.textContent !== txt + '.') out.textContent = txt + '.';
    el.classList.toggle('is-open', open);
  }
  status();
  setInterval(status, 60000);

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
    const seen = { hero: true, hero2: true, book: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.hero && !seen.hero2 && !seen.book && !seen.foot);
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.hero__head', 'hero');
    watch('#reserver', 'book');
    watch('.doors', 'hero2');
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

  /* ---------- la carte cherchable ---------- */
  const items = $$('[data-list] .it');
  const qInput = $('#q');
  const chips = $$('[data-chip]');
  const countEl = $('[data-count]');
  const emptyEl = $('[data-empty]');
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, "'").toLowerCase();
  items.forEach((it, i) => {
    it.dataset.text = norm(it.textContent + ' ' + (it.dataset.q || '') + ' ' + it.dataset.tags);
    if (i < 8) it.style.setProperty('--n', String(i));
  });
  let chip = 'tout';
  function filterList() {
    const words = norm(qInput ? qInput.value : '').split(/\s+/).filter(Boolean);
    let n = 0;
    items.forEach((it) => {
      const okChip = chip === 'tout' || it.dataset.tags.split(' ').includes(chip);
      const okText = words.every((w) => it.dataset.text.includes(w));
      it.hidden = !(okChip && okText);
      if (!it.hidden) n++;
    });
    if (countEl) countEl.textContent = n ? plural(n, 'prestation', 'prestations') : 'Aucune prestation';
    if (emptyEl) emptyEl.hidden = n > 0;
  }
  const setChip = (v) => {
    chip = v;
    chips.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.chip === v)));
    filterList();
  };
  chips.forEach((b) => b.addEventListener('click', () => setChip(b.dataset.chip)));
  let qTimer;
  if (qInput) qInput.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(filterList, 120); });
  $$('[data-chip-go]').forEach((a) => a.addEventListener('click', () => setChip(a.dataset.chipGo)));

  /* =========================================================
     Réserver (essai : rien n’est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const services = CFG.services;
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const state = { step: 1, max: 1, side: null, service: null, day: null, time: null, name: '' };

  // FNV-1a : créneaux « déjà pris » déterministes
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };

  const days = (() => {
    const { date } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const d = addDays(date, i);
      return { i, date: d, iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), hol: isHoliday(d) };
    });
  })();
  const dayByIso = (v) => days.find((d) => d.iso === v);

  function slotsFor(day, length) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 28;
    const out = [];
    for (let m = h[0]; m + length <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      let taken = false;
      for (let b = m; b < m + length; b += CFG.step) if (takenBase(b)) { taken = true; break; }
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* étape 1 : la liste des prestations */
  const svcWrap = $('[data-services]', form);
  const groups = [...new Set(services.map((s) => s.g))];
  svcWrap.innerHTML = groups.map((g) => `<div class="opts__grp" data-side="${services.find((s) => s.g === g).side}"><p class="opts__g" aria-hidden="true">${g}</p>` + services.filter((s) => s.g === g).map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<span class="sr-only"> (${g})</span><small>${durOf(s)}${s.est ? ', durée estimée' : ''}${s.note ? ' · ' + s.note : ''}</small></span>
      <span class="opt__price">${priceOf(s)}</span>
    </label>`).join('') + '</div>').join('');
  const SIDES = { salon: 'Le salon', annexe: 'L’Annexe' };
  function showSide(side) {
    $$('.opts__grp', svcWrap).forEach((g) => { g.hidden = !!side && g.dataset.side !== side; });
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
      const why = !open ? 'fermé' : over ? 'passé' : 'complet';
      const tag = dis ? why : d.hol ? 'férié' : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (d.hol ? ', jour férié, horaires à confirmer' : '') +
        (d.dow === CFG.satFlag && !dis ? ', ouverture à confirmer' : '') +
        (dis ? `, ${why}` : `, ${plural(free, 'créneau libre', 'créneaux libres')}`);
      const col = d.i === 0 ? ` style="grid-column-start:${((d.dow + 6) % 7) + 1}"` : '';
      return `<label class="day"${col}><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span aria-hidden="true"><span class="day__w">${fmtW.format(d.date).replace('.', '')}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m${d.hol && !dis ? ' day__m--hol' : ''}">${tag}</span></span></label>`;
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
    note.textContent = `${cap(fmtLong.format(day.date))}${NB}: ${plural(free, 'case libre', 'cases libres')} pour ${svc.short.toLowerCase()} (${durOf(svc)}).` +
      (day.dow === CFG.satFlag ? ` Le samedi, l’ouverture à 8${NB}h reste à confirmer.` : '') +
      (day.hol ? ` Jour férié${NB}: horaires à confirmer avec le salon.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Ce jour-là, l’emploi du temps est plein. Essayez le suivant, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    const parts = [['Matin', 0, 720], ['Après-midi', 720, 1020], ['Fin de journée', 1020, 1440]];
    wrap.innerHTML = parts.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', déjà pris' : `, jusqu’à ${hfr(s.m + svc.min)}`;
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
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))}, ${hfr(state.time)} → ${hfr(state.time + svc.min)}</span>` +
      `<span>${durOf(svc)} · ${priceOf(svc)} (tarif indicatif)</span><small>${CFG.address}</small>`;
  }

  /* « Votre ticket » : chaque ligne s’imprime quand elle change */
  const ticket = $('[data-ticket]');
  const bookSec = $('#reserver');
  function print(key, text, empty) {
    const dd = $(`[data-tk="${key}"]`);
    if (!dd) return;
    const v = text || empty;
    if (dd.textContent === v) return;
    dd.textContent = v;
    dd.classList.toggle('is-empty', !text);
    if (!text || typeof dd.animate !== 'function') return;
    dd.getAnimations().forEach((a) => a.cancel());
    if (reduce.matches) dd.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease' });
    else dd.animate([{ clipPath: 'inset(-10% 100% -10% 0)' }, { clipPath: 'inset(-10% -2% -10% 0)' }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const t = state.time;
    const side = svc ? svc.side : state.side;
    print('side', side ? SIDES[side] : '', 'à choisir');
    print('service', svc ? `${svc.short} · ${durOf(svc)}` : '', 'à choisir');
    print('day', day ? fmtLong.format(day.date) : '', 'à choisir');
    print('time', t != null && svc ? `${hfr(t)} → ${hfr(t + svc.min)}` : '', 'à choisir');
    print('price', svc ? `${priceOf(svc)}, indicatif` : '', 'selon la prestation');
    const done = state.step === 5;
    if (ticket) ticket.classList.toggle('is-done', done);
    if (bookSec) bookSec.classList.toggle('is-done', done);
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [
        side ? SIDES[side] : null,
        svc ? `${svc.short}, ${priceOf(svc)}` : null,
        day ? fmtShort.format(day.date) : null,
        t != null ? hfr(t) : null
      ].filter(Boolean);
      pick.innerHTML = `<span>Votre ticket</span>${bits.length ? bits.join(' · ') : 'à remplir'}`;
      pick.hidden = done;
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
    if (live) live.textContent = step === 5 ? 'Ticket d’essai imprimé sur cet écran seulement, rien n’a été envoyé.' : `Étape ${step} sur 4${NB}: ${LABELS[step]}.`;
    const ttl = $('.panel__t', current);
    if (ttl) ttl.focus({ preventScroll: true });
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
      const first = n === 1 ? $$('input[name="service"]', form).find((i) => !i.closest('[hidden]')) : $(`.panel[data-step="${n}"] input:not(:disabled)`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'side') {
      state.side = t.value;
      showSide(t.value);
      const cur = svcById(state.service);
      if (cur && cur.side !== t.value) {
        const r = $(`input[name="service"][value="${cur.id}"]`, form);
        if (r) r.checked = false;
        state.service = null; state.day = null; state.time = null; state.max = 1;
      }
    }
    if (t.name === 'service') {
      state.service = t.value;
      const sv = svcById(t.value);
      const sr = sv && $(`input[name="side"][value="${sv.side}"]`, form);
      if (sr && !sr.checked) { sr.checked = true; state.side = sv.side; }
      if (state.day) {
        renderDays();
        if (state.day && state.time != null) {
          const ok = slotsFor(dayByIso(state.day), svcById(state.service).min).some((s) => s.m === state.time && s.free);
          if (!ok) state.time = null;
        }
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
  stepBtns.forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 5) go(n);
  }));

  // « Réserver » sur la carte ou à L’Annexe : présélection, puis le jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    e.preventDefault();
    if (state.step === 5) restart(true);
    const sv = svcById(b.dataset.book);
    const sr = $(`input[name="side"][value="${sv.side}"]`, form);
    if (sr) { sr.checked = true; state.side = sv.side; showSide(sv.side); }
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
    state.name = name.value.trim();
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `Ticket imprimé, ${state.name}.`;
    $('[data-done-when]', form).textContent =
      `${cap(fmtLong.format(day.date))}, de ${hfr(state.time)} à ${hfr(state.time + svc.min)}${NB}: ${svc.short.toLowerCase()}, ${priceOf(svc)} (indicatif).`;
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, side: null, service: null, day: null, time: null, name: '' });
    showSide(null);
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
    $('[data-recap]', form).innerHTML = '';
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
      `SUMMARY:${esc(svc.short + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc(`Essai fait sur un aperçu non officiel${NB}: le salon n’a reçu aucune demande. Pour réserver${NB}: Planity ou ` + CFG.phone)}`,
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

  go(1, { silent: true });
})();
