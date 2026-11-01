/* STARBOYZ · proposition 3 « Lecture en cours ». Vanilla, sans dépendance. */
window.__site = 1;
(() => {
  'use strict';

  const CFG = {
    shop: 'Star Boyz coiffure',
    address: '6 rue Blondel, 75003 Paris',
    phone: '07 53 09 26 21',
    // index = getUTCDay() (0 = dimanche). Minutes depuis minuit. null = fermé.
    hours: { 0: null, 1: [540, 1170], 2: [540, 1170], 3: [540, 1170], 4: [540, 1170], 5: [540, 1170], 6: [540, 1170] },
    step: 30,
    days: 14,
    queue: 4,
    queueService: 'coupe-homme',
    uid: 'apercu.starboyz',
    ics: 'rdv-starboyz.ics'
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
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  function paris(d = new Date()) {
    const o = {};
    for (const p of partsFmt.formatToParts(d)) o[p.type] = p.value;
    return { y: +o.year, m: +o.month, d: +o.day, h: (+o.hour) % 24, mi: +o.minute, s: +o.second };
  }
  const hhmm = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  const isoT = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtMon = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function today() {
    const t = paris();
    const date = new Date(Date.UTC(t.y, t.m - 1, t.d, 12));
    return { t, dow: date.getUTCDay(), now: t.h * 60 + t.mi };
  }
  function nextOpen(dow) {
    for (let k = 1; k <= 7; k++) {
      const d = (dow + k) % 7;
      if (CFG.hours[d]) return { when: k === 1 ? 'demain' : DAYS[d], at: hhmm(CFG.hours[d][0]) };
    }
    return null;
  }

  /* ---------- entrée ---------- */
  requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));

  /* ---------- la journée comme un morceau : tête de lecture en temps réel ---------- */
  (function player() {
    const track = $('[data-track]');
    const lit = $('[data-lit]');
    const head = $('[data-head]');
    const elE = $('[data-elapsed]');
    const reE = $('[data-remain]');
    const kE = $('[data-player-k]');
    const dot = $('[data-live-dot]');
    const stE = $('[data-status-text]');
    const { dow } = today();
    const row = $(`.hb tr[data-dow="${dow}"]`);
    if (row) row.classList.add('is-today');
    if (!track || !lit) return;

    const hms = (s) => {
      s = Math.max(0, Math.round(s));
      return Math.floor(s / 3600) + ':' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    };
    const hm = (s) => {
      const m = Math.max(0, Math.round(s / 60));
      const h = Math.floor(m / 60);
      return h ? `${h}${NB}h${NB}${String(m % 60).padStart(2, '0')}` : `${m}${NB}min`;
    };
    // secondes jusqu’à la prochaine ouverture (aujourd’hui plus tard, ou un jour suivant)
    const untilOpen = (d, nowS) => {
      const h = CFG.hours[d];
      if (h && nowS < h[0] * 60) return h[0] * 60 - nowS;
      for (let k = 1; k <= 7; k++) {
        const n = CFG.hours[(d + k) % 7];
        if (n) return (86400 - nowS) + (k - 1) * 86400 + n[0] * 60;
      }
      return 0;
    };
    let lastStatus = '';
    let p = 0;

    function place() {
      lit.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)`;
      head.style.transform = `translateX(${(p * track.clientWidth).toFixed(1)}px)`;
    }
    function tick() {
      const t = paris();
      const d = new Date(Date.UTC(t.y, t.m - 1, t.d, 12)).getUTCDay();
      const h = CFG.hours[d];
      const nowS = t.h * 3600 + t.mi * 60 + t.s;
      const ref = h || CFG.hours[1];
      const a = ref[0] * 60;
      const b = ref[1] * 60;
      const total = b - a;
      let el = 0;
      let k;
      let txt;
      let open = false;
      if (!h) {
        const n = nextOpen(d);
        k = 'En pause le dimanche';
        txt = `Fermé le ${DAYS[d]}. Reprise ${n.when} à ${n.at}.`;
      } else if (nowS < a) {
        k = 'En pause';
        txt = `Ouvre aujourd’hui à ${hhmm(h[0])}.`;
      } else if (nowS < b) {
        el = nowS - a;
        open = true;
        k = 'En lecture';
        txt = `Ouvert aujourd’hui jusqu’à ${hhmm(h[1])}, encore ${hm(b - nowS)}.`;
      } else {
        const n = nextOpen(d);
        el = total;
        k = 'Terminé pour aujourd’hui';
        txt = `Fermé pour aujourd’hui. Reprise ${n.when} à ${n.at}.`;
      }
      p = el / total;
      place();
      track.classList.toggle('is-live', open);
      elE.textContent = hms(el);
      if (open) reE.textContent = '−' + hms(total - el);
      else reE.textContent = `${h && nowS < a ? 'Ouverture' : 'Reprise'} dans ${hms(untilOpen(d, nowS))}`;
      kE.textContent = k;
      dot.classList.toggle('is-on', open);
      if (txt !== lastStatus) { stE.textContent = txt; lastStatus = txt; }
    }
    tick();
    let timer = setInterval(tick, 1000);
    doc.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!doc.hidden) { tick(); timer = setInterval(tick, 1000); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(track);
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
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
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
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
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
    watch('[data-hero-cta]', 'hero');
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
     Réservation (simulation : rien n'est envoyé)
     ========================================================= */
  const form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  const nojs = $('.nojs');
  if (nojs) nojs.remove();

  // la carte vit dans la playlist : chaque ligne porte ses données
  const services = $$('[data-id]').map((r) => ({
    id: r.dataset.id, name: r.dataset.name, min: +r.dataset.min, price: +r.dataset.price, opt: r.dataset.opt || ''
  }));
  const svcById = (id) => services.find((s) => s.id === id);
  const panels = $$('.panel', form);
  const stepBtns = $$('.steps__b', form);
  const live = $('[data-live]');
  const LABELS = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'confirmation' };
  const state = { step: 1, max: 1, service: null, day: null, time: null, name: '' };

  // FNV-1a : créneaux « déjà pris » déterministes
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };

  const buildDays = () => {
    const { t } = today();
    return Array.from({ length: CFG.days }, (_, i) => {
      const date = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12));
      return { i, date, iso: date.toISOString().slice(0, 10), dow: date.getUTCDay() };
    });
  };
  // reconstruite à minuit : « aujourd’hui » reste aujourd’hui
  let days = buildDays();
  const dayByIso = (iso) => days.find((d) => d.iso === iso);

  function slotsFor(day, dur) {
    const h = CFG.hours[day.dow];
    if (!h) return [];
    const { now } = today();
    const isToday = day.i === 0;
    const takenBase = (m) => hash(day.iso + '|' + m + '|' + CFG.uid) % 100 < 30;
    const out = [];
    for (let m = h[0]; m + dur <= h[1]; m += CFG.step) {
      const past = isToday && m <= now + 15;
      let taken = false;
      for (let b = m; b < m + dur; b += CFG.step) if (takenBase(b)) { taken = true; break; }
      out.push({ m, past, taken, free: !past && !taken });
    }
    return out;
  }

  /* ---------- à suivre : les prochains créneaux libres ---------- */
  const queue = $('[data-queue]');
  function renderQueue() {
    if (!queue) return;
    const svc = svcById(CFG.queueService);
    const items = [];
    for (const d of days) {
      for (const s of slotsFor(d, svc.min)) {
        if (s.free) items.push({ d, m: s.m });
        if (items.length >= CFG.queue) break;
      }
      if (items.length >= CFG.queue) break;
    }
    const html = items.map(({ d, m }, i) => {
      const when = d.i === 0 ? 'Aujourd’hui' : d.i === 1 ? 'Demain' : cap(fmtShort.format(d.date));
      return `<li><button class="q" type="button" data-q-day="${d.iso}" data-q-time="${m}"><span class="sr-only">Réserver </span><span class="q__n tnum" aria-hidden="true">0${i + 1}</span><span class="q__when">${when}<span class="sr-only">, </span></span><span class="q__time tnum">${hhmm(m)}</span><span class="q__svc"><span class="sr-only">, </span>${svc.name} · ${svc.min}${NB}min</span><span class="q__go" aria-hidden="true">→</span></button></li>`;
    }).join('');
    // on n’écrit que si la file a changé : le lecteur d’écran garde sa place
    if (html !== lastQueue) { queue.innerHTML = html; lastQueue = html; }
  }
  let lastQueue = '';
  renderQueue();
  // la file avance avec l’heure : on la recalcule chaque minute (sauf si on est dessus au clavier)
  setInterval(() => {
    if (doc.hidden) return;
    const fresh = buildDays();
    if (fresh[0].iso !== days[0].iso) {
      days = fresh;
      if (state.step === 2) renderDays();
    }
    if (queue && !queue.contains(doc.activeElement)) renderQueue();
  }, 60000);

  /* étape 1 : prestations, construites depuis la playlist */
  const svcWrap = $('[data-services]', form);
  svcWrap.innerHTML = services.map((s) => `
    <label class="opt">
      <input type="radio" name="service" value="${s.id}">
      <span class="opt__box" aria-hidden="true"></span>
      <span class="opt__name">${s.name}<small>${s.min}${NB}min${s.opt ? ' · ' + s.opt : ''}</small></span>
      <span class="opt__price">${s.price}${NB}€</span>
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
      const tag = dis ? why : d.i === 0 ? 'auj.' : d.i === 1 ? 'demain' : fmtMon.format(d.date);
      const aria = cap(fmtLong.format(d.date)) + (dis ? `, ${why}` : `, ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''}`);
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
    const slots = slotsFor(day, svc.min);
    const free = slots.filter((s) => s.free).length;
    note.textContent = `${cap(fmtLong.format(day.date))} · ${free} créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''} pour ${svc.name.toLowerCase()} (${svc.min}${NB}min).`;
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
          return `<label class="slot"><input type="radio" name="time" value="${s.m}" aria-label="${hhmm(s.m)}${why}"${s.free ? '' : ' disabled'}${state.time === s.m && s.free ? ' checked' : ''}><span aria-hidden="true"><time datetime="${day.iso}T${isoT(s.m)}">${hhmm(s.m)}</time></span></label>`;
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
      `<span>${svc.min}${NB}min · ${svc.price}${NB}€ (tarif indicatif, à confirmer)</span><small>${CFG.address}</small>`;
  }

  /* le mini-lecteur : récapitulatif + progression de la réservation */
  const prog = $('[data-mini-prog]');
  const stepNo = $('[data-mini-step]');
  function updateSummary() {
    const svc = svcById(state.service);
    const day = dayByIso(state.day);
    const set = (k, v) => { const n = $(`[data-sum="${k}"]`); if (n) n.textContent = v; };
    set('service', svc ? `${svc.name} · ${svc.min}${NB}min` : 'Aucune prestation choisie');
    set('day', day ? cap(fmtLong.format(day.date)) : 'Jour à choisir');
    set('time', state.time != null ? hhmm(state.time) : 'heure à choisir');
    set('price', svc ? `${svc.price}${NB}€` : '—');
    const n = Math.min(state.step, 4);
    if (prog) prog.style.transform = `scaleX(${state.step === 5 ? 1 : n / 4})`;
    if (stepNo) stepNo.textContent = String(n);
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

  // « Réserver » sur une ligne de la playlist : présélection, puis le jour
  $$('[data-book]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const input = $(`input[name="service"][value="${b.dataset.book}"]`, form);
    if (!input) return;
    if (state.step === 5) restart(true);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    go(2);
  }));

  // « À suivre » : prestation, jour et heure remplis, on passe au nom
  if (queue) queue.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q-day]');
    if (!b) return;
    if (state.step === 5) restart(true);
    const input = $(`input[name="service"][value="${CFG.queueService}"]`, form);
    if (input) input.checked = true;
    state.service = CFG.queueService;
    state.day = b.dataset.qDay;
    state.time = +b.dataset.qTime;
    renderDays();
    if (state.day && state.time != null && slotsFor(dayByIso(state.day), svcById(state.service).min).some((s) => s.m === state.time && s.free)) {
      state.max = 4;
      go(4);
    } else {
      state.max = Math.min(Math.max(state.max, 2), state.day ? 3 : 2);
      go(state.day ? 3 : 2);
    }
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
      `${cap(fmtLong.format(day.date))} à ${hhmm(state.time)} · ${svc.name}, ${svc.min}${NB}min, ${svc.price}${NB}€ (indicatif).`;
    go(5);
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
