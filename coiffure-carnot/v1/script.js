/* Coiffure Carnot · aperçu. Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Coiffure Carnot',
    address: '90 rue François Chénieux, 87000 Limoges',
    phone: '05 55 79 59 85',
    // index = getUTCDay() (0 = dimanche). Plages en minutes depuis minuit. null = fermé.
    hours: {
      0: null,
      1: [[540, 1140]],
      2: [[540, 1140]],
      3: [[540, 1140]],
      4: [[540, 1140]],
      5: [[540, 720], [840, 1140]],
      6: [[540, 1140]]
    },
    step: 30,
    days: 14,
    uid: 'apercu.coiffure-carnot',
    ics: 'rdv-coiffure-carnot.ics'
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
  const hhmm = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  const iso2 = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
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

  /* ---------- entrée ---------- */
  // le titre attend la police (700 ms au plus) pour ne pas changer de fonte en montant
  const fontsReady = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, new Promise((r) => setTimeout(r, 700))]) : Promise.resolve();
  fontsReady.then(() => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready'))));

  // le coupe-chou s’ouvre quand on le voit, une seule fois
  const razor = $('[data-razor]');
  if (razor) {
    const svg = $('.razor', razor);
    if ('IntersectionObserver' in window && svg) {
      const rio = new IntersectionObserver((entries) => {
        const seen = entries.some((e) => e.isIntersecting && (e.intersectionRatio >= 0.6 || e.intersectionRect.height >= window.innerHeight * 0.5));
        if (seen) { razor.classList.add('is-open'); rio.disconnect(); }
      }, { threshold: [0, 0.3, 0.6] });
      rio.observe(svg);
    } else {
      razor.classList.add('is-open');
    }
  }

  /* ---------- ouvert / fermé ---------- */
  // prochain jour ouvert, en sautant les jours fériés
  function nextOpening() {
    const { t } = today();
    let skip = '';
    for (let k = 1; k <= 14; k++) {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + k, 12));
      const d = date.getUTCDay();
      if (CFG.hours[d] && !isHoliday(date)) return { when: k === 1 ? 'demain' : DAYS[d], at: CFG.hours[d][0][0], skip };
      if (CFG.hours[d] && !skip) skip = DAYS[d];
    }
    return null;
  }
  // un jour férié sauté : on le dit, sans affirmer que le salon est fermé
  const ferie = (n) => (n && n.skip ? ` (${n.skip} férié, horaires à confirmer)` : '');
  // jours fériés (fixes + calculés depuis Pâques) : le salon n’indique pas ses horaires ces jours-là
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
      const e = easter(y), D = 86400000;
      const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
      holidayCache[y] = new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((md) => y + '-' + md)
        .concat([iso(e + D), iso(e + 39 * D), iso(e + 50 * D)]));
    }
    return holidayCache[y].has(date.toISOString().slice(0, 10));
  }

  function status() {
    const el = $('[data-status]');
    const { t, dow, now } = today();
    if (!el) return;
    // un férié ne compte que s’il tombe un jour d’ouverture (le dimanche reste « fermé le dimanche »)
    if (CFG.hours[dow] && isHoliday(new Date(Date.UTC(t.y, t.m - 1, t.d, 12)))) {
      const n = nextOpening();
      $('[data-status-text]', el).textContent = 'Jour férié\u00a0: horaires à confirmer avec le salon'
        + (n ? `. Sinon, réouverture ${n.when} à ${hhmm(n.at)}${ferie(n)}` : '') + '.';
      el.classList.remove('is-open');
      return;
    }
    const spans = CFG.hours[dow];
    let txt;
    let open = false;
    if (spans) {
      const cur = spans.find(([a, b]) => now >= a && now < b);
      const later = spans.find(([a]) => now < a);
      if (cur) {
        open = true;
        const after = spans.find(([a]) => a >= cur[1]);
        txt = `Ouvert maintenant, jusqu’à ${hhmm(cur[1])}` + (after ? `, puis de ${hhmm(after[0])} à ${hhmm(after[1])}` : '');
      } else if (later && later === spans[0]) {
        txt = `Ouvre aujourd’hui à ${hhmm(later[0])}`;
      } else if (later) {
        txt = `Pause déjeuner. Réouverture à ${hhmm(later[0])}`;
      }
    }
    if (!txt) {
      const n = nextOpening(dow);
      txt = (spans ? 'Fermé pour aujourd’hui' : `Fermé le ${DAYS[dow]}`) + (n ? `. Réouverture ${n.when} à ${hhmm(n.at)}${ferie(n)}` : '');
    }
    $('[data-status-text]', el).textContent = txt + '.';
    el.classList.toggle('is-open', open);
  }
  status();
  setInterval(status, 60000);

  /* ---------- la semaine : aujourd’hui + maintenant ---------- */
  (function week() {
    const { dow, now } = today();
    const row = $(`.wk[data-dow="${dow}"]`);
    if (!row) return;
    row.classList.add('is-today');
    const { t } = today();
    const hol = CFG.hours[dow] && isHoliday(new Date(Date.UTC(t.y, t.m - 1, t.d, 12)));
    const d = $('.wk__d', row);
    if (d) d.insertAdjacentHTML('beforeend', `<span class="wk__today"><span class="sr-only">, </span>aujourd’hui${hol ? ' · férié, à confirmer' : ''}</span>`);
    if (hol) return;
    if (!CFG.hours[dow] || now < 480 || now > 1200) return;
    const track = $('.wk__track', row);
    const mark = doc.createElement('span');
    mark.className = 'wk__now';
    mark.style.setProperty('--t', (now / 60).toFixed(3));
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = `<span>${hhmm(now)}</span>`;
    track.appendChild(mark);
  })();

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.top__menu');
  const menu = $('#menu');
  if (menuBtn && menu) {
    const outside = () => [$('#main'), $('#foot'), $('#apercu')].filter(Boolean);
    let timer;
    const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
    const setMenu = (open, returnFocus) => {
      clearTimeout(timer);
      menuBtn.setAttribute('aria-expanded', String(open));
      $('.top__menu-label', menuBtn).textContent = open ? 'Fermer' : 'Menu';
      outside().forEach((n) => { n.inert = open; });
      const bar = $('[data-bar]');
      if (bar) bar.inert = open || !bar.classList.contains('is-on');
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
    menuBtn.addEventListener('click', () => setMenu(!isOpen(), true));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false, false); });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setMenu(false, true);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches && isOpen()) setMenu(false, false);
    });
  }

  /* ---------- révélations (une seule fois) ---------- */
  $$('[data-reveal="rows"] .item').forEach((el, i) => el.style.setProperty('--i', i));
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
      bar.inert = !on;
    };
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
     Réservation (simulation : rien n’est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  const services = $$('.item[data-id]').map((r) => ({
    id: r.dataset.id, name: r.dataset.name
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
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
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay(), holiday: isHoliday(date) };
    });
  })();
  const dayByIso = (iso) => days.find((d) => d.iso === iso);

  function slotsFor(day, dur) {
    const spans = CFG.hours[day.dow];
    if (!spans || day.holiday) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 30;
    const out = [];
    spans.forEach(([a, b]) => {
      for (let m = a; m + dur <= b; m += CFG.step) {
        const past = isToday && m <= now + 15;
        let taken = false;
        for (let k = m; k < m + dur; k += CFG.step) if (takenBase(k)) { taken = true; break; }
        out.push({ m, past, taken, free: !past && !taken });
      }
    });
    return out;
  }

  /* étape 1 : prestations, construites depuis la carte */
  $('[data-services]', form).innerHTML = services.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}</span><span class="opt__price">Sur appel</span>
    </label>`).join('');

  function renderDays() {
    const svc = svcById(state.service);
    const dur = CFG.step;
    const wrap = $('[data-days]', form);
    wrap.innerHTML = days.map((d) => {
      const open = !!CFG.hours[d.dow] && !d.holiday;
      const list = open ? slotsFor(d, dur) : [];
      const free = list.filter((s) => s.free).length;
      const over = open && list.length > 0 && list.every((s) => s.past);
      const dis = !open || free === 0;
      const why = d.holiday && CFG.hours[d.dow] ? 'férié' : !open ? 'fermé' : over ? 'terminé' : 'aucun horaire fictif';
      const tag = dis ? why : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (dis ? `, ${why}` : `, ${free} horaire${free > 1 ? 's' : ''} fictif${free > 1 ? 's' : ''}`);
      return `<label class="day"><input type="radio" name="day" value="${d.iso}" aria-label="${aria}"${dis ? ' disabled' : ''}${state.day === d.iso && !dis ? ' checked' : ''}><span aria-hidden="true"><span class="day__w">${fmtW.format(d.date)}</span><span class="day__d">${d.date.getUTCDate()}</span><span class="day__m">${tag}</span></span></label>`;
    }).join('');
    if (state.day && !$(`input[value="${state.day}"]:not(:disabled)`, wrap)) { state.day = null; state.time = null; }
  }

  function renderSlots() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const wrap = $('[data-slots]', form);
    const note = $('[data-slots-note]', form);
    if (!svc || !day) { wrap.innerHTML = ''; return; }
    const slots = slotsFor(day, CFG.step);
    const free = slots.filter((s) => s.free).length;
    const pause = CFG.hours[day.dow] && CFG.hours[day.dow].length > 1 ? ` Fermé de ${hhmm(CFG.hours[day.dow][0][1])} à ${hhmm(CFG.hours[day.dow][1][0])}.` : '';
    note.textContent = `${cap(fmtLong.format(day.date))} · ${free} horaire${free > 1 ? 's' : ''} fictif${free > 1 ? 's' : ''} pour ${svc.name.toLowerCase()}. Simulation, disponibilité non vérifiée.${pause}`;
    if (!free) {
      wrap.innerHTML = `<p class="slots__empty">Aucun horaire fictif pour ce jour. Choisissez un autre jour, ou appelez le ${CFG.phone.replace(/ /g, NB)}.</p>`;
      return;
    }
    const groups = [['Matin', 0, 720], ['Après-midi', 720, 1020], ['Fin de journée', 1020, 1440]];
    wrap.innerHTML = groups.map(([label, a, b], gi) => {
      const list = slots.filter((s) => s.m >= a && s.m < b);
      if (!list.length) return '';
      return `<div class="slots__g" role="group" aria-labelledby="sg-${gi}"><h4 id="sg-${gi}">${label}</h4><div class="slots__grid">${
        list.map((s) => {
          const why = s.past ? ', passé' : s.taken ? ', indisponible dans la simulation' : '';
          return `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${hhmm(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${iso2(s.m)}">${hhmm(s.m)}</time></span></label>`;
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
      `<small>${CFG.address} · Simulation</small>`;
  }

  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? svc.name : 'à choisir');
    set('day', day ? fmtLong.format(day.date) : '—');
    set('time', state.time != null ? hhmm(state.time) : '—');
    set('price', 'Par téléphone');
    const done = state.step === 5;
    const pick = $('[data-pick]', form);
    if (pick) {
      const bits = [];
      if (svc) bits.push(svc.name);
      if (day) bits.push(cap(fmtLong.format(day.date)));
      if (state.time != null) bits.push(hhmm(state.time));
      pick.hidden = !svc || done;
      pick.innerHTML = svc ? `<span>Votre sélection</span>${bits.join(' — ')}` : '';
    }
    $$('.carton__edit').forEach((b) => {
      const n = +b.dataset.goto;
      const has = n === 1 ? !!svc : n === 2 ? !!day : state.time != null;
      b.hidden = !has || done || n > state.max || n === state.step;
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
    if (live) live.textContent = step === 5 ? 'Réservation simulée enregistrée.' : `Étape ${step} sur 4 : ${LABELS[step]}.`;
    const h = $('.panel__t', current);
    if (h) h.focus({ preventScroll: true });
    const r = form.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
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
          const ok = slotsFor(dayByIso(state.day), CFG.step).some((s) => s.m === state.time && s.free);
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
    stepBtns.forEach((b) => { b.disabled = state.step === 5 || +b.dataset.goto > state.max; });
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

  // « Réserver » sur une ligne de la carte : présélection, puis le jour
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
    $('[data-done-title]', form).textContent = `C’est noté, ${state.name}.`;
    $('[data-done-when]', form).textContent =
      `${cap(fmtLong.format(day.date))} à ${hhmm(state.time)} · ${svc.name}. Simulation, 90 rue François Chénieux.`;
    go(5);
  });

  function restart(silent) {
    form.reset();
    Object.assign(state, { step: 1, max: 1, service: null, day: null, time: null, name: '' });
    [name, tel].forEach((i) => {
      i.removeAttribute('aria-invalid');
      if (i.dataset.hint) i.setAttribute('aria-describedby', i.dataset.hint); else i.removeAttribute('aria-describedby');
    });
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
      `SUMMARY:${esc(svc.name + ' · ' + CFG.shop)}`,
      `LOCATION:${esc(CFG.address)}`,
      `DESCRIPTION:${esc('Simulation depuis un aperçu non officiel : ce rendez-vous n’a pas été transmis au salon. Tél. ' + CFG.phone)}`,
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
