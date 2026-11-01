/* Yocolor · aperçu · v2 « La fiche du diagnostic ». Vanilla, sans dépendance. */
(() => {
  'use strict';

  const CFG = {
    shop: 'Yocolor',
    address: '102 avenue Lacassagne, 69003 Lyon',
    phone: '04 72 12 76 31',
    // getUTCDay() : 0 = dimanche. Minutes depuis minuit. null = fermé. Le lundi est à confirmer.
    hours: { 0: null, 1: [570, 1020], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [480, 1020] },
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
    $$('.stamp').forEach((s) => { s.textContent = open ? 'Ouvert' : 'Fermé'; s.classList.toggle('is-shut', !open); });
    const row = $(`.week tbody tr[data-dow="${dow}"]`);
    $$('.week tbody tr').forEach((r) => r.classList.toggle('is-today', r === row));
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
    window.matchMedia('(min-width: 62em)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois, selon le contenu) ---------- */
  $$('.bt').forEach((t, i) => t.style.setProperty('--i', i));
  $$('.lns').forEach((l) => $$('.ln', l).forEach((r, i) => r.style.setProperty('--i', i)));
  $$('.subs__b').forEach((b, i) => { b.style.setProperty('--i', i); });
  $$('.incl li').forEach((l, i) => l.style.setProperty('--i', i));
  $$('.week tbody tr').forEach((r, i) => { r.dataset.r = 'row'; r.style.setProperty('--i', i); });
  $$('.tab tbody tr').forEach((r, i) => { r.dataset.r = 'row'; r.style.setProperty('--i', i); });
  $$('.stamp').forEach((s) => { s.dataset.r = 'stamp'; });
  const reveals = $$('[data-r], .incl, .subs__b');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- sommaire en marge : la section en cours ---------- */
  const railLinks = $$('[data-rail] a');
  if (railLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(railLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const secs = $$('[data-sec]');
    const cur = new Set();
    const mark = () => {
      const first = secs.find((s) => cur.has(s.id));
      railLinks.forEach((a) => a.removeAttribute('aria-current'));
      const a = first && byId.get(first.id);
      if (a) a.setAttribute('aria-current', 'true');
    };
    const rio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) cur.add(e.target.id); else cur.delete(e.target.id); });
      mark();
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
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
    watch('#fiche', 'hero');
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

  /* ---------- la carte : prestations lues dans le HTML ---------- */
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
     La fiche : trois questions, une lecture de la carte
     ========================================================= */
  const LEN = {
    court: { word: 'courts', def: 'aux lobes d’oreille', idx: 0, label: 'court' },
    mi: { word: 'mi-longs', def: 'aux épaules', idx: 1, label: 'mi-long' },
    long: { word: 'longs', def: 'aux omoplates', idx: 2, label: 'long' },
    xxl: { word: 'XXL', def: 'au milieu du dos', idx: 3, label: 'XXL' }
  };
  const ROWS = {
    brush: ['b-c', 'b-m', 'b-l', 'b-x'],
    col: ['col-c', 'col-m', 'col-l', 'col-x'],
    olap: ['o-c', 'o-m', 'o-l', 'o-x'],
    perm: ['pe-c', 'pe-m', 'pe-l', null]
  };
  const BAD = 'Pas possible sur des cheveux traités (colorations végétales, henné, couleur bio, lissage, défrisage, permanente).';
  const fiche = { len: null, trt: null, want: null };
  const ficheForm = $('#fiche-form');
  const lecture = $('[data-lecture]');
  const mx = $('[data-mx]');
  const hl = $('[data-hl]');

  function readLines(f) {
    const L = LEN[f.len];
    const out = [];
    const add = (id, o = {}) => out.push(Object.assign({ id }, o));
    if (f.want === 'ecl') {
      const bad = f.trt === 'oui';
      add('diag', { tag: f.trt === 'nsp' ? 'Dans le doute, ici' : 'Pour commencer', note: 'Recommandé avant tout éclaircissement. Pas de devis par téléphone ni en ligne.' });
      add('soft', { note: bad ? 'La carte ne l’exclut pas pour ces cheveux. À confirmer au diagnostic.' : 'Technique, Olaplex, mini-protocole Tokio Inkarami, 3D toners, K18, coupe et brushing.' });
      const maybe = f.trt === 'nsp' ? ' Impossible si les cheveux ont déjà reçu l’un des traitements listés' + NB + ': à vérifier au diagnostic.' : '';
      add('med', { out: bad, note: bad ? BAD : 'Mêmes soins inclus. Diagnostic recommandé.' + maybe });
      add('int', { out: bad, note: bad ? BAD : 'Mêmes soins inclus. Diagnostic recommandé.' + maybe });
      add('ext', { out: bad, tag: bad ? '' : 'Diagnostic obligatoire', note: bad ? BAD : 'De 450 à 800' + NB + '€ selon la carte. Mêmes soins inclus.' + maybe });
    } else if (f.want === 'rac') {
      add(ROWS.col[L.idx], { note: `Racines, «${NB}à partir de${NB}». Cheveux ${L.def}.` + (f.trt === 'oui' ? ` Cheveux déjà traités${NB}: à signaler au salon avant de réserver.` : '') });
      if (f.len === 'court') add('col-cc', { note: 'Racines et coupe.' });
      add('diag', { tag: 'Mèches, balayage', note: 'Pour éclaircir plutôt que colorer les racines, le diagnostic vient d’abord.' });
    } else if (f.want === 'cou') {
      add(ROWS.brush[L.idx], { note: `Shampooing inclus. Cheveux ${L.def}. La coupe femme seule n’apparaît pas dans le relevé Planity (carte partielle).` });
      if (f.len === 'court') add('gar', { tag: 'Plus court encore', note: 'Rasé ou presque, selon le guide Planity.' });
      add('h-cl', { tag: 'Côté barbier', note: 'Shampooing, coupe, coiffage.' });
      add('h-te', { tag: 'Côté barbier', note: 'Taper, mullet, burst fade, middlepart.' });
      add('h-lo', { tag: 'Côté barbier', note: 'Shampooing inclus.' });
    } else if (f.want === 'soi') {
      add(ROWS.olap[L.idx], { note: `Brushing inclus. Cheveux ${L.def}.` });
      add(null, { text: 'Hair Spa', note: 'Cinq rituels, de 1' + NB + 'h' + NB + '15 à 2' + NB + 'h, de 115 à 270' + NB + '€.', durT: '1' + NB + 'h' + NB + '15 – 2' + NB + 'h', priceT: '115 – 270' + NB + '€', href: '#g-4' });
    } else if (f.want === 'per') {
      const id = ROWS.perm[L.idx];
      if (id) add(id, { note: 'Shampooing inclus.' + (f.trt === 'oui' ? ` Cheveux déjà traités${NB}: à signaler au salon avant de réserver.` : '') });
      else add(null, { text: 'Permanente XXL', note: 'Pas de ligne XXL sur la carte relevée. À confirmer avec Yocolor.', durT: '—', priceT: 'à confirmer', href: '' });
    }
    return out;
  }

  const WANT = { ecl: 'éclaircissement', rac: 'couleur de racines', cou: 'coupe et coiffage', soi: 'soin profond', per: 'permanente' };
  const TRT = { oui: 'déjà traités', non: 'sans traitement de la liste', nsp: 'traitements à vérifier' };

  function renderLecture() {
    const sumEl = $('[data-sum-fiche]');
    const empty = $('[data-empty]', lecture);
    const list = $('[data-list]', lecture);
    const foot = $('[data-foot]', lecture);
    const live = $('[data-fiche-live]', lecture);
    if (!(fiche.len && fiche.trt && fiche.want)) {
      const miss = [!fiche.len && 'la longueur', !fiche.trt && 'les traitements', !fiche.want && 'ce que vous cherchez'].filter(Boolean);
      sumEl.textContent = miss.length === 3 ? 'Trois réponses, puis les lignes qui vous concernent.' : `Il manque ${miss.join(' et ')}.`;
      empty.hidden = false; list.hidden = true; foot.hidden = true;
      return;
    }
    const lines = readLines(fiche);
    sumEl.textContent = `Cheveux ${LEN[fiche.len].word} · ${TRT[fiche.trt]} · ${WANT[fiche.want]}`;
    list.innerHTML = lines.map((l, i) => {
      const s = l.id ? svcById(l.id) : null;
      const name = s ? s.name : l.text;
      const durT = s ? dur(s.min) : l.durT;
      const priceT = s ? (s.from ? '<small>dès</small>' : '') + s.price + NB + '€' : l.priceT;
      const tag = l.tag ? `<span class="lr__tag">${l.tag}</span>` : '';
      let act = '';
      if (l.out) act = `<span class="lr__out">Pas possible</span>`;
      else if (s) act = `<button class="btn btn--sm" type="button" data-book="${s.id}">Réserver<span class="sr-only"> : ${s.name}</span></button>`;
      else if (l.href) act = `<a class="btn btn--ghost btn--sm" href="${l.href}">Voir la carte</a>`;
      return `<li class="lr${l.out ? ' is-out' : ''} is-pre" style="--i:${i}"><p class="lr__name">${name.replace(/&/g, '&amp;')}</p><p class="lr__meta">${tag}${l.note || ''}</p><span class="lr__dur">${durT}</span><span class="lr__price">${priceT}</span>${act}</li>`;
    }).join('');
    empty.hidden = true; list.hidden = false; foot.hidden = false;
    list.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.lr', list).forEach((x) => x.classList.remove('is-pre'))));
    const n = lines.filter((l) => !l.out).length;
    if (live) live.textContent = `${plural(n, 'ligne', 'lignes')} de la carte pour des cheveux ${LEN[fiche.len].word}, ${TRT[fiche.trt]}, ${WANT[fiche.want]}.`;
  }

  function ficheText() {
    const lines = readLines(fiche).filter((l) => !l.out);
    const row = (l) => {
      const s = l.id ? svcById(l.id) : null;
      return s ? `- ${s.name}, ${dur(s.min)}, ${eur(s)}`.replace(/\u00a0/g, ' ') : `- ${l.text}, ${l.durT}, ${l.priceT}`.replace(/\u00a0/g, ' ');
    };
    return [
      'Fiche Yocolor (aperçu non officiel de Studio Lamy)',
      `Longueur : ${LEN[fiche.len].label}`,
      `Traitements déjà reçus : ${{ oui: 'oui', non: 'non', nsp: 'je ne sais pas' }[fiche.trt]}`,
      `Recherche : ${WANT[fiche.want]}`,
      'Lignes de la carte (Planity, 01/11/2026, tarifs indicatifs à confirmer) :',
      ...lines.map(row),
      'Une lecture de la carte, pas un devis ni un diagnostic.'
    ].join('\n');
  }

  function placeHl(instant) {
    if (!mx || !hl) return;
    const th = fiche.len ? $(`thead th[data-col="${fiche.len}"]`, mx) : null;
    const visible = th && th.offsetParent !== null;
    if (!visible) { hl.classList.remove('is-on'); return; }
    const wr = hl.parentElement.getBoundingClientRect();
    const r = th.getBoundingClientRect();
    hl.style.width = r.width + 'px';
    hl.style.top = (r.bottom - wr.top - 3) + 'px';
    if (instant || !hl.classList.contains('is-on')) hl.style.transition = 'none';
    hl.style.transform = `translateX(${r.left - wr.left}px)`;
    hl.getBoundingClientRect();
    hl.style.transition = '';
    hl.classList.add('is-on');
  }
  function syncLen() {
    if (!mx) return;
    if (fiche.len) mx.dataset.len = fiche.len; else delete mx.dataset.len;
    $$('.mx__h', mx).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.len === fiche.len)));
    placeHl();
  }
  let rz;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => placeHl(true)); });

  if (ficheForm) {
    ficheForm.addEventListener('submit', (e) => e.preventDefault());
    ficheForm.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.name || !(t.name in fiche)) return;
      fiche[t.name] = t.value;
      if (t.name === 'len') syncLen();
      renderLecture();
    });
  }
  if (mx) {
    mx.addEventListener('click', (e) => {
      const b = e.target.closest('.mx__h');
      if (!b) return;
      const input = $(`input[name="len"][value="${b.dataset.len}"]`, ficheForm);
      if (!input) return;
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  const copyFiche = $('[data-copy-fiche]');
  if (copyFiche) {
    const label = copyFiche.textContent;
    let ct;
    copyFiche.addEventListener('click', async () => {
      const live = $('[data-fiche-live]', lecture);
      clearTimeout(ct);
      try {
        await navigator.clipboard.writeText(ficheText());
        copyFiche.textContent = 'Fiche copiée';
        if (live) live.textContent = 'Fiche copiée dans le presse-papiers.';
      } catch (err) {
        if (live) live.textContent = 'Copie impossible.';
      }
      ct = setTimeout(() => { copyFiche.textContent = label; }, 2200);
    });
  }
  renderLecture();

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

  /* « Ma fiche de rendez-vous » : se remplit au fil des choix */
  function updateSlip() {
    const s = svcById(state.service);
    const day = dayByIso(state.day);
    const hint = $('[data-hint]', form);
    const set = (k, v, filled) => {
      const n = $(`[data-sum="${k}"]`, form);
      if (!n) return;
      n.textContent = v;
      if (k !== 'line') n.classList.toggle('is-filled', !!filled);
    };
    const when = day ? cap(fmtLong.format(day.date)) : 'À choisir';
    set('day', when, !!day);
    set('service', s ? `${s.name} · ${dur(s.min)}` : 'À choisir', !!s);
    set('time', s && state.time != null ? `${fh(state.time)} → ${fh(state.time + s.min)}` : '—', s && state.time != null);
    set('price', s ? eur(s) : '—', !!s);
    const parts = [];
    if (s) parts.push(s.name);
    if (day) parts.push(cap(fmtLong.format(day.date)));
    if (s && state.time != null) parts.push(`${fh(state.time)} → ${fh(state.time + s.min)}`);
    if (s) parts.push(eur(s));
    set('line', parts.length ? parts.join(' · ') : 'Rien de choisi pour l’instant.');
    if (!s) {
      hint.textContent = 'Choisissez une prestation' + NB + ': elle s’écrit sur la fiche.';
    } else if (!day) {
      hint.textContent = `${dur(s.min)} de chaise. Choisissez un jour pour la placer.`;
    } else {
      const slots = slotsFor(day, s.min);
      const last = slots.length ? slots[slots.length - 1].m : null;
      const h = CFG.hours[day.dow];
      hint.textContent = state.time != null
        ? `${fh(state.time)} → ${fh(state.time + s.min)}.` + (last != null ? ` Dernier départ possible${NB}: ${fh(last)}.` : '')
        : last != null ? `Dernier départ possible à ${fh(last)}, pour finir avant ${fh(h[1])}.` : 'Trop long pour ce jour.';
    }
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
    updateSlip();
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Rien n’a été envoyé.' : `Étape ${step} sur 4${NB}: ${LABELS[step]}.` + (diagMsg && step < 3 ? ' ' + diagMsg : '');
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
    updateSlip();
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

  // « Réserver » sur une case de la carte ou une ligne de la lecture : présélection, puis le jour
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
