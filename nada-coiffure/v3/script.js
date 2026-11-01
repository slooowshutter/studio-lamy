/* Nada Coiffure · proposition 3 « Le sommaire ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Nada Coiffure',
    address: '5 rue de Clignancourt, 75018 Paris',
    phone: '01 42 23 91 98',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    // Planity, relevé le 30/10/2026 : lun–sam 9 h 30 – 19 h 30, dim 10 h 30 – 19 h 30.
    hours: { 0: [630, 1170], 1: [570, 1170], 2: [570, 1170], 3: [570, 1170], 4: [570, 1170], 5: [570, 1170], 6: [570, 1170] },
    satFlag: 6,
    step: 30,
    days: 14,
    uid: 'apercu-v3.nada-coiffure',
    ics: 'rdv-nada-coiffure.ics'
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
    return { t, date, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }
  const addDays = (date, n) => new Date(date.getTime() + n * 864e5);

  /* jours fériés (métropole) : signalés, horaires à confirmer */
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
  if (doc.fonts && doc.fonts.ready) Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(ready);
  else ready();

  /* ---------- aujourd’hui dans le tableau ---------- */
  (function markToday() {
    const row = $(`.hours__table tr[data-dow="${today().dow}"]`);
    if (!row) return;
    row.classList.add('is-today');
    const th = $('th', row);
    if (th) th.insertAdjacentHTML('beforeend', '<span class="today-tag">aujourd’hui</span>');
  })();

  /* ---------- ouvert / fermé (recalculé chaque minute) ---------- */
  function statusText() {
    const { dow, now, date } = today();
    const h = CFG.hours[dow];
    const flag = (d) => (d === CFG.satFlag ? ' (à confirmer)' : '');
    if (h && now < h[1] && isHoliday(date)) return { txt: `Jour férié${NB}: horaires à confirmer avec le salon.`, open: false };
    if (h && now < h[0]) return { txt: `Ouvre aujourd’hui à ${hfr(h[0])}${flag(dow)}, jusqu’à ${hfr(h[1])}.`, open: false };
    if (h && now < h[1]) return { txt: `Ouvert maintenant, jusqu’à ${hfr(h[1])}.`, open: true };
    for (let k = 1; k <= 7; k++) {
      const d = (dow + k) % 7;
      if (CFG.hours[d]) {
        const when = k === 1 ? 'demain' : DAYS[d];
        const hol = isHoliday(addDays(date, k)) ? ' (jour férié, à confirmer)' : flag(d);
        return { txt: `Fermé pour aujourd’hui. Réouverture ${when} à ${hfr(CFG.hours[d][0])}${hol}.`, open: false };
      }
    }
    return { txt: '', open: false };
  }
  function status() {
    const { txt, open } = statusText();
    const el = $('[data-status]');
    if (el) {
      const out = $('[data-status-text]', el);
      if (out.textContent !== txt) out.textContent = txt;
      el.classList.toggle('is-open', open);
    }
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
        timer = setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 210);
        if (returnFocus) menuBtn.focus();
      }
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true', true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    window.matchMedia('(min-width: 60rem)').addEventListener('change', (e) => {
      if (e.matches && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- le sommaire : le chapitre visible est marqué dans l’index ---------- */
  const chaps = $$('.chap[data-id]');
  const idxLinks = $$('[data-idx]');
  if ('IntersectionObserver' in window && chaps.length) {
    const mark = (id) => idxLinks.forEach((a) => {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    chaps.forEach((ch) => io2.observe(ch));
    // les grands numéros sortent de leur masque, une fois
    const io3 = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io3.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    chaps.forEach((ch) => io3.observe(ch));
  } else {
    chaps.forEach((ch) => ch.classList.add('is-in'));
  }

  /* ---------- le défilé : pause ---------- */
  const defile = $('[data-defile]');
  const defBtn = $('[data-defile-btn]');
  if (defile && defBtn) {
    defBtn.addEventListener('click', () => {
      const paused = defile.classList.toggle('is-paused');
      defBtn.textContent = paused ? 'Lecture' : 'Pause';
    });
  }

  /* ---------- barre mobile ---------- */
  const bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    const seen = { hero: true, rv: false, foot: false };
    const update = () => bar.classList.toggle('is-on', !seen.hero && !seen.rv && !seen.foot);
    const watch = (sel, key) => {
      const el = $(sel);
      if (!el) return;
      new IntersectionObserver(([e]) => { seen[key] = e.isIntersecting; update(); }).observe(el);
    };
    watch('.hero__cta', 'hero');
    watch('#rendez-vous', 'rv');
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

  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  /* =========================================================
     Réservation (essai : rien n’est envoyé)
     ========================================================= */
  const services = chaps.map((r, i) => ({
    id: r.dataset.id,
    n: String(i + 1).padStart(2, '0'),
    name: r.dataset.name,
    short: r.dataset.short || r.dataset.name,
    group: r.dataset.group,
    min: +r.dataset.min,
    price: +r.dataset.price,
    incl: r.dataset.incl
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const state = { step: 1, max: 1, service: null, day: null, time: null, name: '' };

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
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 27;
    const out = [];
    for (let m = h[0]; m + length <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      let taken = false;
      for (let b = m; b < m + length; b += CFG.step) if (takenBase(b)) { taken = true; break; }
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  $('[data-services]', form).innerHTML = ['Femme', 'Homme'].map((g) => {
    const list = services.filter((s) => s.group === g);
    return `<p class="opts__g" aria-hidden="true">${g}</p>` + list.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__n" aria-hidden="true">${s.n}</span>
      <span class="opt__name">${s.name}<span class="sr-only"> (${g.toLowerCase()})</span><small>${dur(s.min)} · ${s.incl}</small></span>
      <span class="opt__price">${s.price}${NB}€</span>
    </label>`).join('');
  }).join('');

  function renderDays() {
    const svc = svcById(state.service);
    const length = svc ? svc.min : CFG.step;
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const list = slotsFor(d, length);
      const free = list.filter((s) => s.free).length;
      const over = list.length > 0 && list.every((s) => s.past);
      const dis = free === 0;
      const why = over ? 'passé' : 'complet';
      const tag = dis ? why : d.hol ? 'férié' : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (d.hol ? ', jour férié, horaires à confirmer' : '') +
        (d.dow === CFG.satFlag && !dis ? ', ouverture du samedi à confirmer' : '') +
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
    note.textContent = `Simulation, disponibilités fictives. ${cap(fmtLong.format(day.date))}${NB}: ${plural(free, 'heure possible', 'heures possibles')} pour ${svc.short.toLowerCase()} (${dur(svc.min)}).` +
      (day.dow === CFG.satFlag ? ` Le samedi matin reste à confirmer.` : '') +
      (day.hol ? ` Jour férié${NB}: horaires à confirmer avec le salon.` : '');
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Ce jour-là, tout est pris. Un autre jour, ou le ${CFG.phone.replace(/ /g, NB)}.</p>`;
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
      `<strong>${svc.name}</strong><span>${cap(fmtLong.format(day.date))} à ${hfr(state.time)}</span>` +
      `<span>${dur(svc.min)} · ${svc.price}${NB}€ (tarif indicatif)</span><small>${CFG.address}</small>`;
  }

  function updatePick() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const set = (k, v, empty) => {
      const el = $(`[data-sel="${k}"]`);
      if (!el) return;
      el.textContent = v || empty;
      el.classList.toggle('is-empty', !v);
    };
    set('service', svc ? `${svc.n} · ${svc.short}` : '', 'à choisir');
    set('day', day ? fmtLong.format(day.date) : '', 'à choisir');
    set('time', state.time != null ? hfr(state.time) : '', 'à choisir');
    set('price', svc ? `${svc.price}${NB}€, indicatif` : '', 'selon la prestation');
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [
        svc ? `${svc.short}, ${svc.price}${NB}€` : 'prestation à choisir',
        day ? fmtLong.format(day.date) : 'jour à choisir',
        state.time != null ? hfr(state.time) : 'heure à choisir'
      ];
      pick.innerHTML = `<span>Votre sélection</span>${bits.join(' · ').replace(/&(?!amp;)/g, '&amp;')}`;
      pick.hidden = state.step === 5;
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
    updatePick();
    if (!current || opts.silent) return;
    if (live) live.textContent = step === 5 ? 'Rendez-vous d’essai noté, rien n’a été envoyé.' : `Étape ${step} sur 4${NB}: ${LABELS[step]}.`;
    const t = $('.panel__t', current);
    if (t) t.focus({ preventScroll: true });
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
    updatePick();
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

  // « Réserver » dans un chapitre : la prestation est cochée, on passe au jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    e.preventDefault();
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
    $('[data-done-title]', form).textContent = `C’est réservé, ${state.name}, pour l’essai.`;
    $('[data-done-when]', form).textContent =
      `${cap(fmtLong.format(day.date))} à ${hfr(state.time)}${NB}: ${svc.name.toLowerCase()}, ${dur(svc.min)}, ${svc.price}${NB}€ (indicatif). 5, rue de Clignancourt.`;
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null, name: '' });
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
      `SUMMARY:${esc('Essai · ' + svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc(`Essai sur un aperçu non officiel${NB}: le salon n’a rien reçu. Pour réserver${NB}: Planity ou ` + CFG.phone)}`,
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
