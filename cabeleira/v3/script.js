/* Cabeleira · proposition 3. Vanilla, sans dépendance. Moteur de réservation repris de la proposition 1. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Cabeleira',
    address: '167 avenue de Flandre, 75019 Paris',
    phone: '01 44 53 93 86',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    hours: { 0: [660, 1140], 1: [600, 1200], 2: [600, 1200], 3: [600, 1200], 4: [600, 1200], 5: [540, 1260], 6: [540, 1260] },
    step: 30,
    days: 14,
    uid: 'apercu.cabeleira',
    ics: 'rdv-cabeleira.ics'
  };

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

  /* ---------- entrée : seulement quand la police est là ---------- */
  let ready = false;
  const go2 = () => {
    if (ready) return;
    ready = true;
    requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
    setTimeout(() => $$('.nx.is-flip').forEach((n) => n.classList.remove('is-flip')), 890);
  };
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(go2);
  }
  setTimeout(go2, 500);

  /* ---------- ouvert / fermé, remis à jour chaque minute ---------- */
  function statusText() {
    const { t, dow, now } = today();
    const h = CFG.hours[dow];
    let txt;
    let short;
    let open = false;
    if (h && now < h[0]) {
      txt = `Ouvre aujourd’hui à ${hhmm(h[0])}, jusqu’à ${hhmm(h[1])}`;
      short = `Ouvre à ${hhmm(h[0])}`;
    } else if (h && now < h[1]) {
      txt = `Ouvert maintenant, jusqu’à ${hhmm(h[1])}`;
      short = `Ouvert. Jusqu’à ${hhmm(h[1])}`;
      open = true;
    } else {
      for (let k = 1; k <= 7; k++) {
        const d = (dow + k) % 7;
        if (CFG.hours[d]) {
          const when = k === 1 ? 'demain' : DAYS[d];
          txt = (h ? 'Fermé pour aujourd’hui' : `Fermé le ${DAYS[dow]}`) + `. Réouverture ${when} à ${hhmm(CFG.hours[d][0])}`;
          short = `Fermé. Réouverture ${when} ${hhmm(CFG.hours[d][0])}`;
          break;
        }
      }
    }
    const dateIn = (k) => new Date(Date.UTC(t.y, t.m - 1, t.d + k, 12));
    if (txt.startsWith('Fermé')) {
      for (let k = 1; k <= 7; k++) { if (CFG.hours[(dow + k) % 7]) { if (isHoliday(dateIn(k))) txt += ` (jour férié${NB}: à confirmer)`; break; } }
    } else if (isHoliday(dateIn(0))) {
      txt += ` (jour férié${NB}: à confirmer)`;
    }
    return { txt, short, open, dow, now };
  }
  function status() {
    const s = statusText();
    $$('.is-today').forEach((n) => n.classList.remove('is-today'));
    $$('[data-today-sr]').forEach((n) => n.remove());
    $$(`[data-dow="${s.dow}"]`).forEach((el) => {
      el.classList.add('is-today');
      const cell = el.tagName === 'TR' ? el.querySelector('th, td') : el;
      if (cell) cell.insertAdjacentHTML('beforeend', '<span class="sr-only" data-today-sr> (aujourd’hui)</span>');
    });
    [['[data-status]', '[data-status-text]'], ['[data-status-2]', '[data-status-text-2]']].forEach(([w, t]) => {
      const el = $(w);
      if (!el) return;
      $(t, el).textContent = s.txt + '.';
      el.classList.toggle('is-open', s.open);
    });
    $$('[data-status-short]').forEach((el) => { el.textContent = s.short + '.'; });
    const big = $('[data-status-big]');
    const small = $('[data-status-small]');
    if (big && small) {
      const rest = s.short.split('. ').slice(1).join('. ');
      big.textContent = s.open ? 'Ouvert.' : 'Fermé.';
      $$('.week tr.is-today th').forEach((th) => { th.dataset.state = s.open ? 'ouvert' : 'fermé'; });
      small.textContent = (s.open ? rest + '.' : s.short.startsWith('Ouvre') ? s.short + ' aujourd’hui.' : rest + '.') + (s.txt.includes('férié') ? ` Jour férié${NB}: à confirmer.` : '');
    }
    return s;
  }
  status();

  /* ---------- horloge de Paris (en-tête, décorative) ---------- */
  const clockEl = $('[data-clock]');
  const tick = () => { if (!clockEl) return; const p = paris(); clockEl.textContent = String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); };
  tick();
  setTimeout(() => { tick(); status(); setInterval(() => { tick(); status(); }, 60000); }, 60000 - (Date.now() % 60000) + 50);

  /* ---------- filtre des prestations ---------- */
  const chips = $$('[data-filter]');
  const fLive = $('[data-filter-live]');
  chips.forEach((c) => c.addEventListener('click', () => {
    const f = c.dataset.filter;
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const body = $('.dep tbody');
    if (body) body.classList.add('is-filtered');
    let n = 0;
    $$('.dep tr.pt').forEach((r) => {
      const on = f === 'all' || r.dataset.cat.split(' ').includes(f);
      if (on && r.hidden) {
        r.classList.add('is-fresh');
        r.hidden = false;
        requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove('is-fresh')));
      } else if (!on) r.hidden = true;
      if (on) n++;
    });
    if (fLive) fLive.textContent = `${n} prestation${n > 1 ? 's' : ''} affichée${n > 1 ? 's' : ''}.`;
  }));

  let barUpdate = () => {};

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu'), $('[data-bar]'), $('.top__mark'), $('.top__cta')].filter(Boolean);
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
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
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
    const update = () => {
      const on = !seen.hero && !seen.book && !seen.foot;
      bar.classList.toggle('is-on', on);
      // hors écran = hors d’atteinte au clavier
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
    watch('.hero', 'hero');
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

  const services = $$('.pt[data-id]').map((r) => ({
    id: r.dataset.id, name: r.dataset.name, min: +r.dataset.min, price: +r.dataset.price, from: r.dataset.from === '1'
  }));
  const eur = (s) => (s.from ? 'dès' + NB : '') + s.price + NB + '€';
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + String(m % 60).padStart(2, '0') : ''}` : `${m}${NB}min`);
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'votre nom', 5: 'confirmation' };
  const state = { step: 1, max: 1, service: null, day: null, time: null, name: '' };

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

  function slotsFor(day, dur) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 32;
    const out = [];
    for (let m = h[0]; m + dur <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      let taken = false;
      for (let b = m; b < m + dur; b += CFG.step) if (takenBase(b)) { taken = true; break; }
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* étape 1 : prestations, construites depuis le portant */
  const svcWrap = $('[data-services]', form);
  svcWrap.innerHTML = services.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<small>${dur(s.min)} · prix Planity</small></span>
      <span class="opt__price">${eur(s)}</span>
    </label>`).join('');

  function renderDays() {
    const svc = svcById(state.service);
    const dur = svc ? svc.min : CFG.step;
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow];
      const list = open ? slotsFor(d, dur) : [];
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
    const svc = svcById(state.service);
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
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    if (!svc || !day || state.time == null) return;
    $('[data-recap]', form).innerHTML =
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hhmm(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${eur(svc)} (prix Planity, à confirmer)</span><small>${CFG.address}</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? `${svc.name} · ${dur(svc.min)}` : 'À choisir');
    set('day', day ? cap(fmtLong.format(day.date)) : '—');
    set('time', state.time != null ? hhmm(state.time) : '—');
    set('price', svc ? eur(svc) : '—');
    const done = state.step === 5;
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [];
      if (svc) bits.push(`${svc.name} · ${dur(svc.min)} · ${eur(svc)}`);
      if (day) bits.push(cap(fmtLong.format(day.date)));
      if (state.time != null) bits.push(hhmm(state.time));
      pick.hidden = !svc || done;
      pick.innerHTML = svc ? `<span>Votre sélection</span>${bits.join(' — ')}` : '';
    }
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
    if (live) live.textContent = step === 5 ? 'Réservation simulée. Le récapitulatif est affiché.' : `Étape ${step} sur 4 : ${LABELS[step]}.`;
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
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
    const n = +b.dataset.goto;
    if (n <= state.max && state.step !== 5) go(n);
  }));

  // « Réserver » sur une étiquette du portant : présélection, puis le jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    if (state.step === 5) restart(true);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    const lines = [
      ['Jour', cap(fmtLong.format(day.date))],
      ['Prestation', svc.name],
      ['Durée', dur(svc.min)],
      ['Prix Planity', eur(svc)],
      ['Au nom de', state.name],
      ['Adresse', '167 av. de Flandre, Paris 19e']
    ];
    $('[data-done-time]', form).textContent = hhmm(state.time);
    $('[data-done-lines]', form).innerHTML = lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const done = $('[data-done]', form);
    done.classList.remove('is-printed');
    done.classList.add('is-printing');
    go(5);
    done.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      done.classList.remove('is-printing');
      done.classList.add('is-printed');
    }));
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => { i.removeAttribute('aria-invalid'); if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby'); });
    $$('.err', form).forEach((e) => { e.hidden = true; });
    const done = $('[data-done]', form);
    done.classList.remove('is-printing', 'is-printed');
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

  /* ---------- prochains créneaux, affichés sur le panneau ---------- */
  // relâchées par go2 quand les palettes du nom sont retombées
  const nextWrap = $('[data-next-slots]');
  let nextKey = '';
  function fillNext(flip) {
    if (!nextWrap) return;
    const svc = svcById('simple');
    if (!svc) return;
    const out = [];
    for (const d of days) {
      if (out.length >= 4) break;
      for (const s of slotsFor(d, svc.min)) {
        if (!s.free) continue;
        out.push({ d, s });
        if (out.length >= 4) break;
      }
    }
    if (!out.length) return;
    // même liste : on ne touche à rien (le focus clavier reste en place)
    const key = out.map((o) => o.d.iso + o.s.m).join('|');
    if (key === nextKey) return;
    const prev = nextKey ? nextKey.split('|') : [];
    nextKey = key;
    const act = doc.activeElement;
    const was = act && nextWrap.contains(act) ? $$('.nx__b', nextWrap).indexOf(act) : -1;
    const dayLabel = (d) => (d.i === 0 ? 'Auj.' : d.i === 1 ? 'Demain' : cap(fmtW.format(d.date)));
    const dayLong = (d) => (d.i === 0 ? 'aujourd’hui' : d.i === 1 ? 'demain' : fmtLong.format(d.date));
    nextWrap.innerHTML = out.map(({ d, s }, i) => `<li class="nx${flip ? ' is-flip' : ''}" style="--i:${i}"><button class="nx__b" type="button" data-pick-slot="${d.iso}|${s.m}" aria-label="Réserver une coupe simple ${dayLong(d)} à ${hhmm(s.m)}"><span class="nx__day">${dayLabel(d)}</span><span class="nx__t">${hhmm(s.m)}</span><span class="nx__s">${svc.name}<small>${dur(svc.min)}</small></span><span class="nx__p">${eur(svc)}</span><span class="nx__go" aria-hidden="true">Réserver →</span></button></li>`).join('');
    const keys = key.split('|');
    if (!flip && prev.length && !reduce.matches) {
      // mise à jour : seules les lignes qui changent basculent
      $$('.nx', nextWrap).forEach((n, i) => { if (keys[i] !== prev[i]) n.classList.add('is-flip'); });
      requestAnimationFrame(() => requestAnimationFrame(() => $$('.nx.is-flip', nextWrap).forEach((n) => n.classList.remove('is-flip'))));
    }
    // premier affichage : les lignes basculent une fois les palettes du nom retombées
    if (was > -1) { const b = $$('.nx__b', nextWrap)[Math.min(was, out.length - 1)]; if (b) b.focus({ preventScroll: true }); }
  }
  if (nextWrap) {
    fillNext(!reduce.matches);
    setTimeout(() => { fillNext(false); setInterval(() => fillNext(false), 60000); }, 60000 - (Date.now() % 60000) + 80);
    nextWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick-slot]');
      if (!b) return;
      const [iso, mm] = b.dataset.pickSlot.split('|');
      if (state.step === 5) restart(true);
      const input = $('input[name="service"][value="simple"]', form);
      if (input) input.checked = true;
      Object.assign(state, { service: 'simple', day: iso, time: +mm, max: 4 });
      go(4, { noScroll: true });
      form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  go(1, { silent: true });
})();
