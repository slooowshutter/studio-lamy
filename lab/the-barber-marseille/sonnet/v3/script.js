/* The Barber Marseille · aperçu · v3 « La caisse ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'The Barber Marseille',
    address: '71 rue de Rome, 13001 Marseille',
    phone: '09 54 66 63 46',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé. Planity : lundi–samedi 10:00–19:30.
    hours: { 0: null, 1: [600, 1170], 2: [600, 1170], 3: [600, 1170], 4: [600, 1170], 5: [600, 1170], 6: [600, 1170] },
    step: 30,
    days: 14,
    uid: 'apercu.the-barber-marseille',
    ics: 'rdv-the-barber-marseille.ics'
  };

  /* Carte relevée sur Planity le 01/11/2026 : indicative. from = prix « dès ». */
  const S = (id, name, min, price, from) => ({ id, name, min, price, from: !!from });
  const SVC = {};
  [
    S('coiffage', 'Coupe coiffage', 30, 20),
    S('transformation', 'Coupe transformation', 30, 25),
    S('longs', 'Coupe cheveux longs', 30, 35),
    S('coiffage+barbe', 'Coupe coiffage + barbe', 30, 30),
    S('transformation+barbe', 'Coupe transformation + barbe', 45, 35),
    S('longs+barbe', 'Coupe cheveux longs + barbe', 45, 45),
    S('keratine', 'Coupe + lissage express + masque à la kératine', 45, 45),
    S('barbe-classique', 'Barbe classique', 15, 15),
    S('barbe-ciseaux', 'Barbe tondeuse et ciseaux', 30, 20),
    S('barbe-longue', 'Barbe longue', 30, 25),
    S('barbe-ancienne', 'Barbe à l’ancienne', 30, 25),
    S('barbe-couleur', 'Coloration barbe + taille de barbe', 30, 30),
    S('enfant', 'Coupe enfant (6 à 10 ans)', 30, 10),
    S('soin-visage', 'Soin visage Premium', 45, 30),
    S('meches', 'Mèches ou balayage + coupe', 135, 65, true),
    S('decolo', 'Décoloration tête entière + coupe', 135, 75, true),
    S('coloration', 'Coloration + coupe coiffage', 105, 50, true),
    S('coloration-barbe', 'Coloration + coupe coiffage + barbe', 120, 65, true),
    S('lissage', 'Lissage brésilien + coupe coiffage', 120, 95, true),
    S('perm-courts', 'Permanente + coupe, cheveux courts', 105, 45, true),
    S('perm-mi', 'Permanente + coupe, cheveux mi-longs', 120, 55, true),
    S('perm-longs', 'Permanente + coupe, cheveux longs', 135, 65, true)
  ].forEach((s) => { SVC[s.id] = s; });
  // une coupe + la barbe = le forfait de la carte
  const FORFAIT = { coiffage: 'coiffage+barbe', transformation: 'transformation+barbe', longs: 'longs+barbe' };
  const GROUPS = [
    { t: 'Coupe homme', ids: ['coiffage', 'transformation', 'longs'], toggle: true },
    { t: 'Barbe', ids: ['barbe-classique', 'barbe-ciseaux', 'barbe-longue', 'barbe-ancienne', 'barbe-couleur'] },
    { t: 'Soin visage', ids: ['soin-visage'] },
    { t: 'Enfant, 6 à 10 ans', ids: ['enfant'] },
    { t: 'Lissage et permanente', ids: ['keratine', 'lissage', 'perm-courts', 'perm-mi', 'perm-longs'] },
    { t: 'Couleur et éclaircissement', ids: ['meches', 'decolo', 'coloration', 'coloration-barbe'] }
  ];

  const doc = document;
  const root = doc.documentElement;
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
  const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, one, many) => `${n}${NB}${n > 1 ? many : one}`;
  const euro = (n) => `${n}${NB}€`;
  const dur = (min) => (min >= 60 ? `${Math.floor(min / 60)}${NB}h${min % 60 ? NB + String(min % 60).padStart(2, '0') : ''}` : `${min}${NB}min`);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* ---------- jours fériés (France métropolitaine) ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(y, month - 1, day, 12);
  }
  const holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    const e = easter(y);
    const DAY = 864e5;
    const set = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((md) => `${y}-${md}`));
    [1, 39, 50].forEach((n) => set.add(iso(e + n * DAY)));
    return (holidayCache[y] = set);
  }
  const isHoliday = (date) => holidays(date.getUTCFullYear()).has(date.toISOString().slice(0, 10));

  /* ---------- le mot-marque, ajusté à la largeur ---------- */
  const fits = $$('[data-fit]');
  function textWidth(node) {
    const r = doc.createRange();
    r.selectNodeContents(node);
    return r.getBoundingClientRect().width;
  }
  function fit() {
    fits.forEach((el) => {
      const line = $('.wm__line', el) || el.firstElementChild;
      if (!line) return;
      el.style.removeProperty('--fit');
      const size = parseFloat(getComputedStyle(line).fontSize);
      const w = textWidth(line);
      const avail = el.clientWidth;
      if (!w || !avail) return;
      el.style.setProperty('--fit', Math.min(230, (size * avail / w) * 0.992).toFixed(2) + 'px');
    });
  }
  let fitRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fit);
  }, { passive: true });

  /* ---------- entrée : seulement quand la police est là ---------- */
  let ready = false;
  const go2 = () => {
    if (ready) return;
    ready = true;
    fit();
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  };
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(go2);
    doc.fonts.load('800 1em "Bricolage Grotesque"').then(fit, () => {});
    doc.fonts.addEventListener('loadingdone', fit);
  }
  setTimeout(go2, 600);

  /* ---------- ouvert / fermé, tableau, règle ---------- */
  (function status() {
    const { dow, now } = today();
    $$('[data-dow]').forEach((n) => { if (+n.dataset.dow === dow) n.classList.add('is-today'); });
    const h = CFG.hours[dow];
    let txt;
    let open = false;
    if (h && now < h[0]) {
      txt = `Ouvre aujourd’hui à ${hhmm(h[0])}, jusqu’à ${hhmm(h[1])}`;
    } else if (h && now < h[1]) {
      txt = `Ouvert maintenant, jusqu’à ${hhmm(h[1])}`;
      open = true;
    } else {
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) {
          const when = k === 1 ? 'demain' : DAYS[d];
          txt = (h ? 'Fermé pour aujourd’hui' : `Fermé le ${DAYS[dow]}`) + `. Réouverture ${when} à ${hhmm(CFG.hours[d][0])}`;
          break;
        }
      }
    }
    // jours fériés : on ne promet rien
    const { t } = today();
    const dateIn = (k) => new Date(Date.UTC(t.y, t.m - 1, t.d + k, 12));
    if (txt.startsWith('Fermé')) {
      for (let k = 1; k <= 7; k++) { if (CFG.hours[(dow + k) % 7]) { if (isHoliday(dateIn(k))) txt += ` (jour férié${NB}: à confirmer)`; break; } }
    } else if (isHoliday(dateIn(0))) {
      txt += ` (jour férié${NB}: à confirmer)`;
    }
    const el = $('[data-status]');
    if (el) {
      $('[data-status-text]', el).textContent = txt + '.';
      el.classList.toggle('is-open', open);
    }
  })();

  let barUpdate = () => {};

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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 250);
        barUpdate();
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    $('.top__cta').addEventListener('click', () => { if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 1040px)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois), tuiles en cascade ---------- */
  const reveals = $$('[data-reveal]');
  $$('.bento').forEach((b) => {
    $$(':scope > [data-reveal]', b).forEach((el, i) => el.style.setProperty('--td', Math.min(i, 5) * 60 + 'ms'));
  });
  const enter = (el) => { el.classList.add('is-in'); };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { enter(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
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
    watch('[data-hero-cta]', 'hero');
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
        if (live) live.textContent = 'Copie impossible. Adresse : ' + b.dataset.copy;
      }
      t = setTimeout(() => { b.textContent = label; }, 2200);
    });
  });

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
  const summary = $('[data-summary]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'votre nom', 5: 'confirmation' };
  const state = { step: 1, max: 1, base: null, barbe: false, day: null, time: null, name: '' };

  const current = () => {
    if (!state.base) return null;
    const id = state.barbe && FORFAIT[state.base] ? FORFAIT[state.base] : state.base;
    return SVC[id];
  };
  const priceTxt = (s) => (s.from ? `dès${NB}${euro(s.price)}` : euro(s.price));

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
  const dayByIso = (iso) => days.find((d) => d.iso === iso);

  // des rendez-vous « déjà pris », en blocs de 30 à 90 minutes
  function booked(day) {
    const h = CFG.hours[day.dow];
    const out = [];
    if (!h) return out;
    let m = h[0];
    while (m < h[1]) {
      if (hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 24) {
        const len = (hash(day.iso + '#' + m + CFG.uid) % 3 + 1) * 30;
        out.push([m, m + len]);
        m += len + CFG.step;
      } else m += CFG.step;
    }
    return out;
  }
  function slotsFor(day, d) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const blocks = booked(day);
    const out = [];
    for (let m = h[0]; m + d <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      const taken = blocks.some(([a, b]) => m < b && m + d > a);
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* étape 1 : la carte, par rubrique, avec le « plus » */
  const svcWrap = $('[data-services]', form);
  svcWrap.innerHTML = GROUPS.map((g, gi) => {
    const rows = g.ids.map((id) => {
      const s = SVC[id];
      return `<label class="opt"><input type="radio" name="service" value="${id}"><span class="opt__box" aria-hidden="true"></span><span class="opt__name">${s.name}<small>${dur(s.min)} · indicatif</small></span><span class="opt__price">${s.from ? '<small>dès</small>' : ''}${euro(s.price)}</span></label>`;
    }).join('');
    const sw = g.toggle
      ? `<label class="plus-sw is-off" data-plus-sw><input type="checkbox" name="barbe" value="1" disabled aria-describedby="plus-note"><span class="plus-sw__mark" aria-hidden="true"><svg class="ic"><use href="#plus"/></svg></span><span class="plus-sw__t">Ajouter la barbe<small id="plus-note" data-plus-note>Choisissez d’abord une coupe</small></span><span class="plus-sw__p" data-plus-p>+${NB}10${NB}€</span></label>`
      : '';
    return `<div class="optgrp" role="group" aria-labelledby="og-${gi}"><h4 class="optgrp__t" id="og-${gi}">${g.t}</h4>${rows}${sw}</div>`;
  }).join('');
  const sw = $('[data-plus-sw]', form);
  const swInput = $('input', sw);
  const swNote = $('[data-plus-note]', form);

  function syncSwitch() {
    const isCoupe = !!(state.base && FORFAIT[state.base]);
    swInput.disabled = !isCoupe;
    sw.classList.toggle('is-off', !isCoupe);
    if (!isCoupe) { state.barbe = false; swInput.checked = false; swNote.textContent = 'Choisissez d’abord une coupe'; return; }
    swInput.checked = state.barbe;
    const f = SVC[FORFAIT[state.base]];
    const b = SVC[state.base];
    swNote.textContent = `Forfait de la carte${NB}: ${euro(f.price)} · ${dur(f.min)} (au lieu de ${euro(b.price)} · ${dur(b.min)})`;
  }

  function renderDays() {
    const svc = current();
    const d0 = svc ? svc.min : CFG.step;
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow];
      const list = open ? slotsFor(d, d0) : [];
      const free = list.filter((s) => s.free).length;
      const over = open && list.length > 0 && list.every((s) => s.past);
      const dis = !open || free === 0;
      const why = !open ? 'fermé' : over ? 'terminé' : 'complet';
      let tag = dis ? why : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      let cls = 'day__m';
      if (!dis && d.hol) { tag = 'férié'; cls += ' day__m--hol'; }
      const aria = cap(fmtLong.format(d.date)) +
        (dis ? `, ${why}` : `, ${plural(free, 'créneau libre', 'créneaux libres')}`) +
        (d.hol && !dis ? ', jour férié, ouverture à confirmer' : '');
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span aria-hidden="true"><span class="day__w">${fmtW.format(d.date)}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="${cls}">${tag}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  function renderSlots() {
    const svc = current();
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!svc || !day) { wrap.innerHTML = ''; return; }
    const slots = slotsFor(day, svc.min);
    const free = slots.filter((s) => s.free).length;
    note.textContent = `${cap(fmtLong.format(day.date))} · ${plural(free, 'créneau libre', 'créneaux libres')} pour ${svc.name.toLowerCase()} (${dur(svc.min)}).` +
      (day.hol ? ` Jour férié${NB}: ouverture à confirmer.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Plus aucun créneau ce jour-là. Choisissez un autre jour, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    const groups = [['Matin', 0, 720], ['Après-midi', 720, 1080], ['Soir', 1080, 1440]];
    wrap.innerHTML = groups.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', déjà pris' : '';
          return `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${hhmm(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${hhmm(s.m)}">${hhmm(s.m)}</time></span></label>`;
        }).join('')
      }</div></div>`;
    }).join('');
    if (state.time != null && !slots.some((s) => s.m === state.time && s.free)) state.time = null;
  }

  function renderRecap() {
    const svc = current();
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${priceTxt(svc)} (tarif indicatif)</span><small>${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = current();
    const day = dayByIso(state.day);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? `${svc.name} · ${dur(svc.min)}` : 'À choisir');
    set('day', day ? cap(fmtLong.format(day.date)) : '—');
    set('time', state.time != null ? hhmm(state.time) : '—');
    set('price', svc ? priceTxt(svc) : '—');
    const mini = $('[data-mini-t]');
    if (mini) {
      const bits = [svc ? svc.name : 'Prestation à choisir'];
      if (day) bits.push(fmtW.format(day.date) + ' ' + day.date.getUTCDate());
      if (state.time != null) bits.push(hhmm(state.time));
      if (svc) bits.push(priceTxt(svc));
      mini.textContent = bits.join(' · ');
    }
    const done = state.step === 5;
    $$('.summary__edit').forEach((b) => {
      const n = +b.dataset.goto;
      const has = n === 1 ? !!svc : n === 2 ? !!day : state.time != null;
      b.hidden = !has || done || n > state.max;
    });
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
    let cur;
    panels.forEach((p) => {
      const s = +p.dataset.step;
      if (s === step) { cur = p; if (s !== from || p.hidden) show(p, step < from); }
      else p.hidden = true;
    });
    stepBtns.forEach((b) => {
      const n = +b.dataset.goto;
      if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = step === 5 || n > state.max;
    });
    $$('.err[data-err]', form).forEach((e) => { e.hidden = true; });
    panels.forEach((p) => p.removeAttribute('aria-describedby'));
    if (summary) summary.dataset.step = String(step);
    updateSummary();
    if (!cur || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Le bon est affiché.' : `Étape ${step} sur 4 : ${LABELS[step]}.`;
    const h = $('.panel__t', cur);
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
      const first = $(`.panel[data-step="${n}"] input:not(:disabled)`, form);
      if (first) first.focus();
    };
    if (s === 1 && !state.base) return fail(1);
    if (s === 2 && !state.day) return fail(2);
    if (s === 3 && state.time == null) return fail(3);
    if (s < 4) go(s + 1);
  }

  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'service') {
      state.base = t.value;
      if (!FORFAIT[state.base]) state.barbe = false;
      syncSwitch();
    }
    if (t.name === 'barbe') { state.barbe = t.checked; syncSwitch(); }
    if (t.name === 'service' || t.name === 'barbe') {
      // la durée a pu changer : on revalide jour et heure
      if (state.day) {
        renderDays();
        if (state.day && state.time != null) {
          const ok = slotsFor(dayByIso(state.day), current().min).some((s) => s.m === state.time && s.free);
          if (!ok) state.time = null;
        }
      }
      if (!state.day) state.max = Math.min(state.max, 2);
      else if (state.time == null) state.max = Math.min(state.max, 3);
    }
    if (t.name === 'day') { state.day = t.value; state.time = null; state.max = Math.min(state.max, 3); }
    if (t.name === 'time') state.time = +t.value;
    const n = t.name === 'service' || t.name === 'barbe' ? 1 : t.name === 'day' ? 2 : t.name === 'time' ? 3 : 0;
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
    if (n <= state.max && state.step !== 5) go(n);
  }));

  // « Réserver » sur une ligne de la carte : présélection (« coiffage+barbe » = coupe + le plus), puis le jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const [base, plus] = b.dataset.book.split('+');
    const input = $(`input[name="service"][value="${base}"]`, form);
    if (!input) return;
    if (state.step === 5) restart(true);
    input.checked = true;
    state.barbe = plus === 'barbe';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (state.barbe) { swInput.checked = true; swInput.dispatchEvent(new Event('change', { bubbles: true })); }
    go(2, { noScroll: true });
    form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
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
    const svc = current();
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    const nm = $('[data-sum="name"]');
    if (nm) nm.textContent = state.name;
    const nrow = $('[data-name-row]');
    if (nrow) nrow.hidden = false;
    const sim = $('[data-sim]');
    if (sim) sim.hidden = false;
    const wrap = $('.t-rcpt-wrap');
    wrap.classList.add('is-printing');
    go(5);
    wrap.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove('is-printing')));
    if (!window.matchMedia('(min-width: 1000px)').matches) wrap.scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, base: null, barbe: false, day: null, time: null, name: '' });
    syncSwitch();
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
    const nrow = $('[data-name-row]');
    if (nrow) nrow.hidden = true;
    const sim = $('[data-sim]');
    if (sim) sim.hidden = true;
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
    const svc = current();
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    const start = toUTC(day, state.time);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu ' + CFG.shop + '//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${svc.id.replace(/[^a-z0-9]/g, '')}@${CFG.uid}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(start + svc.min * 60000)}`,
      `SUMMARY:${icsEsc(svc.name + ' · ' + CFG.shop)}`,
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

  syncSwitch();
  go(1, { silent: true });
})();
