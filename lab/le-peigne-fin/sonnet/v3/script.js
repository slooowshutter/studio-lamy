/* Le Peigne Fin · aperçu, proposition 3 « Le comptoir ». Vanilla, sans dépendance. Une dent = 30 min. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Le Peigne Fin',
    address: '117 route du Polygone, Strasbourg',
    phone: '03 88 84 04 88',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    // annuaire-barber, relevé le 01/11/2026 (à confirmer) : lun 10 h–18 h, mar/mer/ven 9 h–19 h, jeu 9 h 30–19 h, sam 9 h–17 h 30, dim fermé.
    hours: { 0: null, 1: [600, 1080], 2: [540, 1140], 3: [540, 1140], 4: [570, 1140], 5: [540, 1140], 6: [540, 1050] },
    step: 30,
    ax0: 540,   // 9 h : début de l’axe des peignes
    axn: 20,    // 20 dents : 9 h → 19 h
    days: 14,
    uid: 'apercu.le-peigne-fin.v3',
    ics: 'rdv-le-peigne-fin.ics'
  };

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
  // « 9 h 30 », « 14 h »
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
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }

  /* jours fériés : métropole + droit local d’Alsace-Moselle (Vendredi saint, 26 décembre) */
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
      holidayCache[y] = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25', '12-26'].map((s) => `${y}-${s}`).concat([add(-2), add(1), add(39), add(50)]));
    }
    return holidayCache[y].has(date.toISOString().slice(0, 10));
  }

  // FNV-1a : créneaux « déjà pris » déterministes
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };

  /* ---------- le peigne d’une journée : 20 dents, 9 h → 19 h ---------- */
  function dayCells(day) {
    const h = CFG.hours[day.dow];
    const { now } = today();
    return Array.from({ length: CFG.axn }, (_, i) => {
      const m = CFG.ax0 + i * CFG.step;
      const open = !!h && m >= h[0] && m + CFG.step <= h[1];
      const taken = open && hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 26;
      const past = open && day.i === 0 && m <= now + 15;
      return { i, m, open, taken, past };
    });
  }

  /* ---------- entrée ---------- */
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) {
    Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(ready);
  } else {
    ready();
  }

  /* ---------- ouvert / fermé, peigne du héros, ligne du jour ---------- */
  // les peignes de la semaine sont construits une fois ; ensuite on ne touche qu’aux classes
  $$('.week > li').forEach((li, r) => {
    const hh = CFG.hours[+li.dataset.dow];
    li.style.setProperty('--r', r);
    $('.week__c', li).innerHTML = '<ol>' + Array.from({ length: CFG.axn }, (_, i) => {
      const m = CFG.ax0 + i * CFG.step;
      const open = !!hh && m >= hh[0] && m + CFG.step <= hh[1];
      return `<li class="t${open ? '' : ' is-stub'}" style="--i:${i}"></li>`;
    }).join('') + '</ol>';
  });

  function status() {
    const { t, dow, now } = today();
    const todayDate = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    const h = CFG.hours[dow];
    const hol = isHoliday(todayDate);
    const dayEl = $('[data-today-day]');
    if (dayEl) dayEl.textContent = cap(DAYS[dow]);

    // peigne du héros : les dents closes sont des moignons, la dent cuivre est l’heure en cours
    $$('[data-hero-comb] .tooth').forEach((el, i) => {
      const m = CFG.ax0 + i * CFG.step;
      const open = !!h && m >= h[0] && m + CFG.step <= h[1];
      el.classList.toggle('is-stub', !open);
      el.classList.toggle('is-past', open && m + CFG.step <= now);
      el.classList.toggle('is-now', open && m <= now && now < m + CFG.step);
    });
    const cap1 = $('[data-comb-cap]');
    if (cap1) {
      cap1.textContent = h
        ? `Le peigne d’aujourd’hui (${DAYS[dow]})${NB}: de ${hfr(h[0])} à ${hfr(h[1])}, une dent par demi-heure. La dent cuivre est la demi-heure en cours.`
        : `Aujourd’hui (${DAYS[dow]}), le salon est fermé${NB}: le peigne n’a pas de dents.`;
    }

    // tableau des horaires : la dent cuivre du jour
    $$('.week > li').forEach((li) => {
      const d = +li.dataset.dow;
      const hh = CFG.hours[d];
      li.classList.toggle('is-today', d === dow);
      if (d === dow && !$('.today-tag', li)) $('.week__d', li).insertAdjacentHTML('beforeend', '<span class="today-tag">aujourd’hui</span>');
      else if (d !== dow) { const stale = $('.today-tag', li); if (stale) stale.remove(); }
      $$('.week__c li', li).forEach((el, i) => {
        const m = CFG.ax0 + i * CFG.step;
        el.classList.toggle('is-now', d === dow && !!hh && m >= hh[0] && m + CFG.step <= hh[1] && m <= now && now < m + CFG.step);
      });
    });

    const el = $('[data-status]');
    if (!el) return;
    let txt;
    let open = false;
    if (h && now < h[1] && hol) {
      txt = `Jour férié${NB}: ouverture à confirmer avec le salon`;
    } else if (h && now < h[0]) {
      txt = `Ouvre aujourd’hui à ${hfr(h[0])}, jusqu’à ${hfr(h[1])}`;
    } else if (h && now < h[1]) {
      txt = `Ouvert aujourd’hui jusqu’à ${hfr(h[1])}`;
      open = true;
    } else {
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) {
          const when = k === 1 ? 'demain' : DAYS[d];
          const hh = isHoliday(new Date(Date.UTC(t.y, t.m - 1, t.d + k, 12))) ? ' (férié, ouverture à confirmer)' : '';
          txt = (h ? 'Fermé ce soir' : `Fermé le ${DAYS[dow]}`) + `. Réouverture ${when} à ${hfr(CFG.hours[d][0])}${hh}`;
          break;
        }
      }
    }
    $('[data-status-text]', el).textContent = txt + '.';
    el.classList.toggle('is-open', open);
  }
  status();
  setInterval(() => { if (!doc.hidden) status(); }, 60000);

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
    const mark = $('.top__mark');
    if (mark) mark.addEventListener('click', () => { if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false); });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
  $$('.miss3 .cell').forEach((el, k) => el.style.setProperty('--k', k));
  $$('.t3__comb li').forEach((el, k) => el.style.setProperty('--j', k));
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- les tuiles arrivent dans l’ordre de lecture, une seule fois ---------- */
  const tiles = $$('[data-tile]');
  if ('IntersectionObserver' in window && tiles.length) {
    const tio = new IntersectionObserver((entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((e, i) => {
          e.target.style.setProperty('--n', Math.min(i, 6));
          e.target.classList.add('is-in');
          tio.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    tiles.forEach((t) => tio.observe(t));
  } else {
    tiles.forEach((t) => t.classList.add('is-in'));
  }

  // le téléphone d’exemple : les cellules arrivent, une dent devient cuivre, le bouton se confirme (une seule fois)
  const still = $('[data-still]');
  if (still) {
    if ('IntersectionObserver' in window && !reduce.matches) {
      const sio = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { still.classList.add('is-played'); sio.disconnect(); }
      }, { threshold: 0.45 });
      sio.observe(still);
    } else {
      still.classList.add('is-played');
    }
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
    watch('.t1', 'hero');
    watch('#reserver', 'book');
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
        if (live) live.textContent = 'Copie impossible. Adresse' + NB + ': ' + b.dataset.copy;
      }
      setTimeout(() => { b.textContent = label; }, 2200);
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

  const services = $$('.row[data-id]').map((r) => ({
    id: r.dataset.id,
    name: r.dataset.name,
    short: r.dataset.short || r.dataset.name,
    min: +r.dataset.min,
    price: +r.dataset.price,
    desc: $('.row__desc', r).textContent.trim()
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const state = { step: 1, max: 1, service: null, day: null, time: null, name: '' };

  // libellés des étapes (le nom complet reste lisible pour les lecteurs d’écran)
  stepBtns.forEach((b) => {
    const n = $('.steps__n', b);
    const label = b.textContent.replace(n.textContent, '').trim();
    b.innerHTML = `<span class="steps__n">${n.textContent}</span><span class="steps__l">${label}</span>`;
  });

  const days = (() => {
    const { t } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay(), hol: isHoliday(date) };
    });
  })();
  const dayByIso = (v) => days.find((d) => d.iso === v);

  // les dents proposées pour une prestation de `length` minutes
  function slotsFor(day, length) {
    const need = Math.ceil(length / CFG.step);
    const cells = dayCells(day);
    return cells.filter((c) => c.open).map((c) => {
      const run = cells.slice(c.i, c.i + need);
      const short = run.length < need || run.some((x) => !x.open);
      const blocked = run.some((x) => x.taken);
      const taken = c.taken;
      const past = c.past;
      return { m: c.m, i: c.i, past, taken, short: !taken && short, blocked: !taken && !short && blocked, free: !past && !short && !blocked && !taken };
    });
  }

  /* peigne de résumé / de succès */
  function renderMcomb(box, day, start, length) {
    if (!box) return;
    const need = Math.ceil((length || CFG.step) / CFG.step);
    const cells = day ? dayCells(day) : null;
    const lis = Array.from({ length: CFG.axn }, (_, i) => {
      if (!cells) return '<li style="opacity:.35"></li>';
      const c = cells[i];
      const sel = start != null && c.m >= start && c.m < start + need * CFG.step;
      const cls = [!c.open ? 'is-stub' : '', c.open && c.taken ? 'is-taken' : '', sel ? 'is-sel' : ''].filter(Boolean).join(' ');
      return `<li${cls ? ` class="${cls}"` : ''}></li>`;
    }).join('');
    box.innerHTML = `<div class="mcomb"><ol>${lis}</ol></div>` +
      '<div class="mcomb__ax"><span style="grid-column:1">9' + NB + 'h</span><span style="grid-column:7">12' + NB + 'h</span><span style="grid-column:13">15' + NB + 'h</span><span style="grid-column:20;justify-self:end">19' + NB + 'h</span></div>';
  }

  function sumText(key, text, sub) {
    const el = $(`[data-sum="${key}"]`);
    if (!el) return;
    const empty = el.dataset.empty || el.innerHTML;
    if (!el.dataset.empty) el.dataset.empty = empty;
    const next = text || empty;
    if (el.dataset.cur === next) return;
    el.dataset.cur = next;
    if (text) el.textContent = text; else el.innerHTML = empty;
    if (text && typeof el.animate === 'function') {
      el.getAnimations().forEach((a) => a.cancel());
      el.animate(reduce.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE_OUT });
    }
  }

  /* étape 1 : prestations, construites depuis la carte */
  const svcWrap = $('[data-services]', form);
  svcWrap.innerHTML = services.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<small>${dur(s.min)} · ${s.min / CFG.step === 1 ? 'une dent' : s.min / CFG.step + NB + 'dents'}</small></span>
      <span class="opt__price">${s.price}${NB}€</span>
    </label>`).join('');

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
      const aria = cap(fmtLong.format(d.date)) + (d.hol ? ', jour férié, ouverture à confirmer' : '') +
        (dis ? `, ${why}` : `, ${plural(free, 'créneau libre', 'créneaux libres')}`);
      const ticks = Array.from({ length: 8 }, (_, k) => `<i${open && k < Math.round(8 * free / Math.max(list.length, 1)) ? '' : ' class="off"'}></i>`).join('');
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span class="day__box" aria-hidden="true"><span class="day__w">${fmtW.format(d.date).replace('.', '')}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m${d.hol && !dis ? ' day__m--hol' : ''}">${tag}</span><span class="day__mini">${open ? ticks : ''}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  const BLOCKS = [[540, 720], [720, 900], [900, 1080], [1080, 1140]];
  const NAMES = ['Matin', 'Midi', 'Après-midi', 'Fin de journée'];
  const wideSlots = window.matchMedia('(min-width: 560px)');
  const pad = (n) => { const c = wideSlots.matches ? 6 : 3; return '<span class="slot--pad" aria-hidden="true"></span>'.repeat((c - (n % c)) % c); };

  function renderSlots() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!svc || !day) { wrap.innerHTML = ''; return; }
    const slots = slotsFor(day, svc.min);
    const free = slots.filter((s) => s.free).length;
    const need = svc.min / CFG.step;
    note.textContent = `${cap(fmtLong.format(day.date))} · ${plural(free, 'dent libre', 'dents libres')} pour ${svc.name.toLowerCase()} (${dur(svc.min)}, ${need === 1 ? 'une dent' : need + NB + 'dents'}).` +
      (day.hol ? ` Jour férié${NB}: ouverture à confirmer avec le salon.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Plus de dent libre ce jour-là. Un autre jour, ou un appel au ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    wrap.innerHTML = BLOCKS.map(([a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${NAMES[gi]} · ${hfr(a)} – ${hfr(b)}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', déjà pris' : s.short ? ', trop court pour cette prestation' : s.blocked ? ', la dent suivante est prise' : '';
          return `<label class="slot${s.past ? ' is-past' : ''}" data-m="${s.m}"><input type="radio" name="time" value="${s.m}" aria-label="${hfr(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span class="slot__shape" aria-hidden="true"><time datetime="${day.iso}T${iso(s.m)}">${hfr(s.m)}</time><i class="slot__t"></i></span></label>`;
        }).join('') + pad(list.length)
      }</div></div>`;
    }).join('');
    if (state.time != null && !slots.some((s) => s.m === state.time && s.free)) state.time = null;
    markSpan();
  }

  // une prestation de 60 min allume deux dents
  function markSpan() {
    const svc = svcById(state.service);
    const len = svc ? svc.min : CFG.step;
    $$('.slot', form).forEach((l) => {
      const m = +l.dataset.m;
      l.classList.toggle('is-span', state.time != null && m > state.time && m < state.time + len);
    });
  }

  function renderRecap() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hfr(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${svc.price}${NB}€ (tarif indicatif)</span><small>${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    sumText('service', svc ? svc.short : '');
    sumText('price', svc ? `${svc.price}${NB}€` : '');
    sumText('day', day ? cap(fmtLong.format(day.date)) : '');
    sumText('time', state.time != null ? hfr(state.time) : '');
    renderMcomb($('[data-sum-comb]'), day, state.time, svc ? svc.min : CFG.step);
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
    if (live) live.textContent = step === 5 ? 'Réservation d’essai notée. Rien n’a été envoyé.' : `Étape ${step} sur 4${NB}: ${LABELS[step]}.`;
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
      if (e) { e.hidden = false; if (live) live.textContent = e.textContent; }
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
        if (state.day && state.time != null) {
          const ok = slotsFor(dayByIso(state.day), svcById(state.service).min).some((s) => s.m === state.time && s.free);
          if (!ok) state.time = null;
        }
      }
      if (!state.day) state.max = Math.min(state.max, 2);
      else if (state.time == null) state.max = Math.min(state.max, 3);
    }
    if (t.name === 'day') { state.day = t.value; state.time = null; state.max = Math.min(state.max, 3); }
    if (t.name === 'time') { state.time = +t.value; markSpan(); }
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

  // « Réserver » sur une ligne de la carte : présélection, puis le jour
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
    state.name = name.value.trim();
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `Noté, ${state.name}.`;
    $('[data-done-when]', form).textContent =
      `${cap(fmtLong.format(day.date))} à ${hfr(state.time)} · ${svc.name}, ${dur(svc.min)}, ${svc.price}${NB}€ (indicatif).`;
    renderMcomb($('[data-done-comb]', form), day, state.time, svc.min);
    go(5);
    const done = $('.panel--done', form);
    if (done && !reduce.matches) {
      done.classList.add('is-printing');
      setTimeout(() => done.classList.remove('is-printing'), 760);
    } else if (done) {
      done.classList.add('is-printing');
      setTimeout(() => done.classList.remove('is-printing'), 340);
    }
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
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
      `SUMMARY:${esc('Essai · ' + svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc(`Réservation d’essai, depuis un aperçu non officiel${NB}: ce rendez-vous n’a pas été transmis au salon. Tél. ` + CFG.phone)}`,
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

  wideSlots.addEventListener('change', () => { if (state.step === 3) renderSlots(); });

  go(1, { silent: true });
})();
