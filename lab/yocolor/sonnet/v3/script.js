/* Yocolor · aperçu · v3 « Au 102 ». Vanilla, sans dépendance. */
(() => {
  'use strict';

  const CFG = {
    shop: 'Yocolor',
    address: '102 avenue Lacassagne, 69003 Lyon',
    phone: '04 72 12 76 31',
    // getUTCDay() : 0 = dimanche. Minutes depuis minuit. null = fermé. Le lundi est à confirmer.
    hours: { 0: null, 1: [570, 1020], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1020] },
    axis: 480, // 8 h : début de l’échelle
    step: 30,
    days: 14,
    uid: 'apercu.yocolor',
    ics: 'rdv-yocolor.ics'
  };
  const FAMS = [['ecl', 'Éclaircissements'], ['col', 'Couleur · gloss'], ['fem', 'Femme'], ['hom', 'Homme · barbier'], ['spa', 'Hair Spa'], ['soi', 'Soins · permanentes'], ['etu', 'Étudiants']];

  const doc = document;
  const root = doc.documentElement;
  root.classList.add('rv', 'ok');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

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
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const fh = (m) => `${Math.floor(m / 60)}${NB}h` + (m % 60 ? NB + pad(m % 60) : '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n}${NB}${n > 1 ? many : one}`;
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + pad(m % 60) : ''}` : `${m}${NB}min`);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLongRaw = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtLong = { format: (d) => fmtLongRaw.format(d).replace(/ 1 /, ' 1er ') };
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- jours fériés ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day, 12);
  }
  const holCache = {};
  function holidays(y) {
    if (holCache[y]) return holCache[y];
    const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    const e = easter(y);
    const set = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((md) => `${y}-${md}`));
    [1, 39, 50].forEach((n) => set.add(iso(e + n * 864e5)));
    return (holCache[y] = set);
  }
  const isHoliday = (date) => holidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));

  /* ---------- entrée du héros : les chiffres du 102 ---------- */
  $$('.num102__d').forEach((d, i) => d.style.setProperty('--k', i));
  let ready = false;
  const go2 = () => {
    if (ready) return;
    ready = true;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  };
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go2);
  setTimeout(go2, 1800);

  /* ---------- ouvert / fermé ---------- */
  function nextOpen(dow) {
    for (let k = 1; k <= 7; k++) {
      const d = (dow + k) % 7;
      if (CFG.hours[d]) return { k, d };
    }
    return null;
  }
  function renderStatus() {
    const { t, dow, now } = today();
    const h = CFG.hours[dow];
    const dateIn = (k) => new Date(Date.UTC(t.y, t.m - 1, t.d + k, 12));
    let txt, open = false;
    const monday = (d) => (d === 1 ? ` (horaire à confirmer)` : '');
    if (h && now < h[0]) {
      txt = `Ouvre aujourd’hui à ${fh(h[0])}, jusqu’à ${fh(h[1])}${monday(dow)}.`;
    } else if (h && now < h[1]) {
      txt = `Ouvert maintenant, jusqu’à ${fh(h[1])}${monday(dow)}.`;
      open = true;
    } else {
      const n = nextOpen(dow);
      const when = n.k === 1 ? 'demain' : DAYS[n.d];
      txt = `${h ? 'Fermé pour aujourd’hui' : `Fermé le ${DAYS[dow]}`}. Réouverture ${when} à ${fh(CFG.hours[n.d][0])}${monday(n.d)}.`;
      if (isHoliday(dateIn(n.k))) txt = txt.replace(/\.$/, ` (jour férié${NB}: à confirmer).`);
    }
    if (open && isHoliday(dateIn(0))) txt = txt.replace(/\.$/, ` (jour férié${NB}: à confirmer).`);
    const el = $('[data-status]');
    if (el) {
      $('[data-status-text]', el).textContent = txt;
      el.classList.toggle('is-open', open);
    }
    const door = $('[data-door]');
    if (door) {
      $('[data-door-face]', door).textContent = open ? 'Ouvert' : 'Fermé';
      door.classList.toggle('is-shut', !open);
      let sub, mon = false;
      if (open || (h && now < h[0])) {
        sub = open ? `${fh(h[0])} – ${fh(h[1])}` : `Ouvre ${fh(h[0])}`;
        mon = dow === 1 || isHoliday(dateIn(0));
      } else {
        const n = nextOpen(dow);
        sub = `${n.k === 1 ? 'Demain' : cap(DAYS[n.d])} ${fh(CFG.hours[n.d][0])}`;
        mon = n.d === 1 || isHoliday(dateIn(n.k));
      }
      $('[data-door-sub]', door).textContent = sub;
      const conf = $('[data-door-conf]', door);
      if (conf) conf.hidden = !mon;
    }
    $$('.wk__d').forEach((li) => li.classList.toggle('is-today', +li.dataset.dow === dow));
  }
  renderStatus();
  setInterval(renderStatus, 60000);

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  let barUpdate = () => {};
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
        barUpdate();
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 60em)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois, selon le contenu) ---------- */
  $$('.incl li').forEach((l, i) => l.style.setProperty('--i', i));
  const reveals = $$('[data-r], .incl');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- le numéro de la section, sur le rail ---------- */
  const railN = $('[data-rail-n]');
  const stripN = $('[data-strip-n]');
  const railBox = $('.rail__n');
  let curSec = '00';
  function setSec(n) {
    if (n === curSec) return;
    curSec = n;
    if (stripN) stripN.textContent = n;
    if (railN && railBox) {
      railBox.classList.add('is-swap');
      setTimeout(() => { railN.textContent = n; railBox.classList.remove('is-swap'); }, reduce.matches ? 0 : 150);
    }
  }
  if ('IntersectionObserver' in window) {
    const secs = $$('[data-sec]');
    const cur = new Set();
    const rio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) cur.add(e.target); else cur.delete(e.target); });
      const first = secs.find((s) => cur.has(s));
      if (first) setSec(pad(+first.dataset.sec));
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    secs.forEach((s) => rio.observe(s));
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, book: false, foot: false };
    const update = () => {
      const on = !seen.hero && !seen.book && !seen.foot;
      bar.classList.toggle('is-on', on);
      if (menuBtn && menuBtn.getAttribute('aria-expanded') === 'true') return;
      bar.inert = !on;
    };
    barUpdate = update;
    bar.inert = true;
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.hero__cta', 'hero');
    watch('#reserver', 'book');
    watch('#foot', 'foot');
  }

  /* ---------- copier l’adresse ---------- */
  $$('[data-copy]').forEach((b) => {
    const label = b.textContent;
    let t;
    b.addEventListener('click', async () => {
      const live = $('[data-copy-live]');
      clearTimeout(t);
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        b.textContent = 'Adresse copiée';
        if (live) live.textContent = 'Adresse copiée dans le presse-papiers.';
      } catch (err) {
        if (live) live.textContent = 'Copie impossible. Adresse' + NB + ': ' + b.dataset.copy;
      }
      t = setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

  /* ---------- la carte : plaques (filtre par famille) ---------- */
  const fams = $$('.fam');
  const plaques = $$('.pl');
  function setFilter(f) {
    fams.forEach((el) => {
      const show = el.dataset.fam === f;
      if (show && el.hidden) {
        el.hidden = false;
        el.classList.add('is-pre');
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('is-pre')));
      } else el.hidden = !show;
    });
    plaques.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.fam === f)));
  }
  plaques.forEach((p) => p.addEventListener('click', () => setFilter(p.dataset.fam)));
  setFilter('ecl');

  /* ---------- prestations lues dans le HTML ---------- */
  const services = [];
  const seenIds = new Set();
  $$('[data-book]').forEach((b) => {
    const id = b.dataset.book;
    if (seenIds.has(id)) return;
    seenIds.add(id);
    services.push({ id, name: b.dataset.name, min: +b.dataset.min, price: +b.dataset.price, from: b.dataset.from === '1', flag: b.dataset.flag || '', fam: b.dataset.fam });
  });
  const svcById = (id) => services.find((s) => s.id === id);
  const eur = (s) => (s.from ? 'dès' + NB : '') + s.price + NB + '€';

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
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const state = { step: 1, service: null, day: null, time: null, fam: 'ecl', name: '' };

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
  const dayByIso = (iso) => days.find((d) => d.iso === iso);

  // départs possibles : le service doit finir avant la fermeture
  function slotsFor(day, d) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const out = [];
    for (let m = h[0]; m + d <= h[1]; m += CFG.step) {
      const past = day.i === 0 && m <= now + 15;
      const taken = hash(`${day.iso}|${m}|${d}|${CFG.uid}`) % 100 < 30;
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* étape 1 : familles + prestations */
  const chipsWrap = $('[data-chips]', form);
  chipsWrap.innerHTML = FAMS.map(([id, label]) => `<button class="chip" type="button" data-fam="${id}" aria-pressed="false">${label}</button>`).join('');
  const svcWrap = $('[data-services]', form);
  svcWrap.innerHTML = services.map((s) => `
    <label class="opt" data-fam="${s.fam}" hidden>
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name.replace(/&/g, '&amp;')}<small>${dur(s.min)} · prix Planity</small></span>
      <span class="opt__price">${s.from ? '<small>dès</small>' : ''}${s.price}${NB}€</span>
    </label>`).join('');
  function showFam(f) {
    state.fam = f;
    $$('.chip', chipsWrap).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.fam === f)));
    $$('.opt', svcWrap).forEach((o) => { o.hidden = o.dataset.fam !== f; });
  }
  chipsWrap.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) showFam(c.dataset.fam); });
  showFam('ecl');

  let diagMsg = '';
  function renderDiag() {
    const s = svcById(state.service);
    diagMsg = '';
    $$('[data-diag]', form).forEach((n) => {
      if (!s || !s.flag) { n.hidden = true; n.textContent = ''; return; }
      n.innerHTML = (s.flag === 'must'
        ? 'Pour ce forfait, le salon exige un diagnostic (30' + NB + 'min, 30' + NB + '€). Pas de devis par téléphone ni en ligne.'
        : 'Avant un éclaircissement, le salon recommande un diagnostic (30' + NB + 'min, 30' + NB + '€). Pas de devis par téléphone ni en ligne.') +
        '<button class="link" type="button" data-pick-diag>Réserver plutôt le diagnostic</button>';
      n.hidden = false;
    });
    if (s && s.flag) {
      diagMsg = s.flag === 'must' ? 'Diagnostic exigé pour ce forfait' + NB + ': 30 minutes, 30 euros.' : 'Diagnostic recommandé avant un éclaircissement' + NB + ': 30 minutes, 30 euros.';
      if (live) live.textContent = diagMsg;
    }
  }

  function renderDays() {
    const s = svcById(state.service);
    const d = s ? s.min : CFG.step;
    const svcLine = $('[data-svc-line]', form);
    if (svcLine) svcLine.textContent = s ? `${s.name} · ${dur(s.min)} · ${eur(s)}` : '';
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((day) => {
      const open = !!CFG.hours[day.dow];
      const list = open ? slotsFor(day, d) : [];
      const free = list.filter((x) => x.free).length;
      const over = open && list.length > 0 && list.every((x) => x.past);
      const dis = !open || free === 0;
      const why = !open ? 'fermé' : over ? 'terminé' : list.length === 0 ? 'trop long' : 'complet';
      let tag = dis ? why : day.i === 0 ? 'aujourd’hui' : day.i === 1 ? 'demain' : fmtMon.format(day.date);
      let cls = 'day-o__m';
      const conf = !dis && (day.hol || day.dow === 1);
      if (conf) { tag = day.hol ? 'férié' : 'à confirmer'; cls += ' day-o__m--hol'; }
      const aria = cap(fmtLong.format(day.date)) +
        (dis ? `, ${why}` : `, ${plural(free, 'créneau libre', 'créneaux libres')}`) +
        (conf ? (day.hol ? ', jour férié, ouverture à confirmer' : ', lundi, ouverture à confirmer') : '');
      return `<label class="day-o"><input type="radio" name="day" value="${day.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === day.iso && !dis ? ' checked' : ''}><span class="day-o__f" aria-hidden="true"><span class="day-o__w">${fmtW.format(day.date)}</span><span class="day-o__d">${day.date.getUTCDate()}</span><span class="${cls}">${tag}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  function renderSlots() {
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!s || !day) { wrap.innerHTML = ''; return; }
    const slots = slotsFor(day, s.min);
    const free = slots.filter((x) => x.free).length;
    const last = slots.length ? slots[slots.length - 1].m : null;
    note.textContent = `${cap(fmtLong.format(day.date))} · ${plural(free, 'départ libre', 'départs libres')} · ${s.name} (${dur(s.min)})` +
      (last != null ? `. Dernier départ possible${NB}: ${fh(last)}.` : '.') +
      (day.hol ? ` Jour férié${NB}: ouverture à confirmer.` : day.dow === 1 ? ` Lundi${NB}: ouverture à confirmer.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Plus aucun départ ce jour-là. Choisissez un autre jour, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    const groups = [['Matin', 0, 720], ['Après-midi', 720, 1440]];
    wrap.innerHTML = groups.map(([label, a, b], gi) => {
      const list = slots.filter((x) => x.m >= a && x.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((x) => {
          const why = x.past ? ', passé' : x.taken ? ', déjà pris' : '';
          return `<label class="slot"><input type="radio" name="time" value="${x.m}" aria-label="${fh(x.m).replace(/\u00a0/g, ' ')}${why}"${x.free ? '' : ' disabled'}${state.time === x.m && x.free ? ' checked' : ''}><span class="slot__f" aria-hidden="true"><time datetime="${day.iso}T${hm(x.m)}">${hm(x.m)}</time></span></label>`;
        }).join('')
      }</div></div>`;
    }).join('');
    if (state.time != null && !slots.some((x) => x.m === state.time && x.free)) state.time = null;
  }

  function renderRecap() {
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    if (!s || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${s.name.replace(/&/g, '&amp;')}</strong><span>${cap(fmtLong.format(day.date))}, de ${fh(state.time)} à ${fh(state.time + s.min)}</span>` +
      `<span>${dur(s.min)} · ${eur(s)} (prix Planity, à confirmer)</span>`;
  }

  /* « Votre journée » : la colonne verticale, 8 h en haut, 19 h en bas */
  const dv = $('[data-dv]', form);
  const lane = $('[data-lane]', form);
  const block = $('[data-block]', form);
  const blockT = $('[data-block-t]', form);
  $$('.dv__axis li', form).forEach((l, i) => l.style.setProperty('--i', i));
  let lastBlockKey = '';
  function updateDayView() {
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    const h = day ? CFG.hours[day.dow] : CFG.hours[2];
    dv.style.setProperty('--open', h[0] - CFG.axis);
    dv.style.setProperty('--close', h[1] - CFG.axis);
    const hint = $('[data-hint]', form);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`, form); if (n) n.textContent = v; };
    set('day', day ? cap(fmtLong.format(day.date)) : 'À choisir');
    set('service', s ? `${s.name} · ${dur(s.min)}` : 'À choisir');
    set('time', s && state.time != null ? `${fh(state.time)} → ${fh(state.time + s.min)}` : '—');
    set('price', s ? eur(s) : '—');
    let show = false, ghost = false, start = 0, key = '';
    if (s && day) {
      const slots = slotsFor(day, s.min);
      const byM = new Map(slots.map((x) => [x.m, x]));
      let cells = '';
      for (let m = h[0]; m < h[1]; m += CFG.step) {
        const x = byM.get(m);
        let cls = 'c--late';
        if (x) cls = state.time === m ? 'c--pick' : x.past ? 'c--past' : x.taken ? 'c--taken' : 'c--free';
        cells += `<span class="c ${cls}" style="--m:${m}"></span>`;
      }
      lane.innerHTML = cells;
      const last = slots.length ? slots[slots.length - 1].m : null;
      if (state.time != null) {
        show = true; start = state.time;
        hint.textContent = `${fh(start)} → ${fh(start + s.min)}.` + (last != null ? ` Dernier départ possible${NB}: ${fh(last)}.` : '');
      } else {
        const first = slots.find((x) => x.free);
        if (first) { show = true; ghost = true; start = first.m; }
        hint.textContent = last != null
          ? `${dur(s.min)}${NB}: dernier départ possible à ${fh(last)}, pour finir avant ${fh(h[1])}.`
          : `${dur(s.min)}${NB}: trop long pour ce jour.`;
      }
      key = `${s.id}|${day.iso}|${start}|${ghost}`;
    } else {
      lane.innerHTML = '';
      hint.textContent = !s ? 'Choisissez une prestation' + NB + ': sa durée se place dans la journée.' : `${dur(s.min)} de chaise. Choisissez un jour pour la placer dans la journée.`;
    }
    block.hidden = !show;
    if (show) {
      block.style.setProperty('--bs', start);
      block.style.setProperty('--bd', s.min);
      block.classList.toggle('is-ghost', ghost);
      blockT.textContent = s.min >= 60 ? `${fh(start)} → ${fh(start + s.min)}` : '';
      if (key !== lastBlockKey && !reduce.matches && block.animate) {
        block.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 260, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
    }
    lastBlockKey = key;
    $$('.sum__e', form).forEach((b) => {
      const n = +b.dataset.goto;
      const has = n === 1 ? !!s : state.time != null;
      b.hidden = !has || state.step === 5 || (n === 3 && !day);
    });
  }

  const maxStep = () => (state.service ? (state.day ? (state.time != null ? 4 : 3) : 2) : 1);

  function show(panel, back) {
    panel.hidden = false;
    panel.classList.add(back ? 'is-enter-back' : 'is-enter');
    panel.getBoundingClientRect();
    requestAnimationFrame(() => panel.classList.remove('is-enter', 'is-enter-back'));
  }

  function go(step, opts = {}) {
    const from = state.step;
    state.step = step;
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
      b.disabled = step === 5 || n > maxStep();
    });
    $$('.err[data-err]', form).forEach((e) => { e.hidden = true; });
    updateDayView();
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Rien n’a été envoyé.' : `Étape ${step} sur 4${NB}: ${LABELS[step]}.` + (diagMsg && step < 3 ? ' ' + diagMsg : '');
    const hd = $('.panel__t', current);
    if (hd) hd.focus({ preventScroll: true });
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
      const panel = $(`.panel[data-step="${n}"]`, form);
      const first = $$('input:not(:disabled)', panel).find((i) => i.offsetParent !== null);
      const target = first || $('.panel__t', panel);
      if (target) target.focus();
    };
    if (s === 1 && !state.service) return fail(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  function pickService(id) {
    const s = svcById(id);
    if (!s) return;
    showFam(s.fam);
    const input = $(`input[name="service"][value="${id}"]`, form);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // « Réserver plutôt le diagnostic » : on reste à l’étape en cours, elle se recalcule
  function pickDiag() {
    pickService('diag');
    go(Math.max(1, Math.min(state.step, maxStep())), { noScroll: true });
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'service') {
      state.service = t.value;
      renderDiag();
      if (state.day) {
        const day = dayByIso(state.day);
        const ok = day && state.time != null && slotsFor(day, svcById(state.service).min).some((x) => x.m === state.time && x.free);
        if (!ok) state.time = null;
      }
    }
    if (t.name === 'day') { state.day = t.value; state.time = null; }
    if (t.name === 'time') state.time = +t.value;
    const n = t.name === 'service' ? 1 : t.name === 'day' ? 2 : t.name === 'time' ? 3 : 0;
    if (n) { const e2 = $(`[data-err="${n}"]`, form); if (e2) e2.hidden = true; }
    stepBtns.forEach((b) => { b.disabled = +b.dataset.goto > maxStep() || state.step === 5; });
    updateDayView();
  });

  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) next();
    else if (e.target.closest('[data-prev]')) go(Math.max(1, state.step - 1));
    else if (e.target.closest('[data-restart]')) restart();
    else if (e.target.closest('[data-ics]')) downloadIcs();
    else if (e.target.closest('[data-pick-diag]')) pickDiag();
  });
  $$('[data-goto]', form).forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= maxStep() && state.step !== 5) go(n);
  }));

  // « Réserver » sur une ligne du tableau : présélection, puis le jour
  doc.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    if (state.step === 5) restart(true);
    pickService(b.dataset.book);
    go(2, { noScroll: true });
    form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  });

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

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.step < 4) { next(); return; }
    if (state.step !== 4) return;
    const a = fieldErr(name, 'e-name', !name.value.trim());
    const b = fieldErr(tel, 'e-tel', !telOk(tel.value));
    if (!a) { name.focus(); return; }
    if (!b) { tel.focus(); return; }
    state.name = name.value.trim();
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    const lines = [
      ['Prestation', s.name],
      ['Jour', fmtShort.format(day.date)],
      ['De', fh(state.time)],
      ['À', fh(state.time + s.min)],
      ['Prix indicatif', eur(s)]
    ];
    $('[data-done-lines]', form).innerHTML = lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((x) => { x.hidden = true; });
    renderDiag();
    showFam('ecl');
    lastBlockKey = '';
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
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    if (!s || !day || state.time == null) return;
    const start = toUTC(day, state.time);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ' + CFG.shop + '//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${s.id}@${CFG.uid}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + s.min * 60000)}`,
      `SUMMARY:${icsEsc(s.name + ' · ' + CFG.shop)}`,
      `LOCATION:${icsEsc(CFG.address)}`,
      `DESCRIPTION:${icsEsc('Simulation depuis un aperçu non officiel : ce rendez-vous n’a pas été transmis au salon. Tél. ' + CFG.phone)}`,
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
