/* The Barber Marseille · aperçu « La ligne »
   Statut d’ouverture (heure de Paris), rampe de défilement, réservation simulée.
   Rien n’est envoyé à qui que ce soit. Aucune dépendance. */
(() => {
  'use strict';
  window.__site = true;

  const TZ = 'Europe/Paris';
  const OPEN = 10 * 60;            // 10 h 00
  const CLOSE = 19 * 60 + 30;      // 19 h 30
  const OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // lundi à samedi (getDay)
  // Jours fériés fixes, puis mobiles en 2026 (Pâques 5 avril : lundi de Pâques, Ascension, lundi de Pentecôte)
  const HOLIDAYS = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25', '04-06', '05-14', '05-25'];
  const WD_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const WD_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const NB = ' ';
  const TAKEN_RATE = 18;           // % de créneaux déjà pris, déterministes
  const PHONE_RE = /^(?:\+33|0033|0)[67]\d{8}$/;
  const NAME_RE = /^[\p{L}][\p{L}'’ -]{1,39}$/u;
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const live = $('#status');

  const fmtTime = (min) => `${Math.floor(min / 60)}${NB}h${min % 60 ? NB + pad(min % 60) : ''}`;
  const fmtDur = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}${NB}h${m ? NB + pad(m) : ''}` : `${m}${NB}min`;
  };
  const announce = (msg) => { if (live) live.textContent = msg; };

  /* Heure de Paris, indépendante du fuseau du visiteur */
  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const y = Number(get('year')), mo = Number(get('month')), d = Number(get('day'));
    return {
      y, mo, d,
      min: Number(get('hour')) * 60 + Number(get('minute')),
      wd: new Date(y, mo - 1, d).getDay()
    };
  }

  function status(n) {
    const hol = HOLIDAYS.includes(`${pad(n.mo)}-${pad(n.d)}`);
    const suffix = hol ? ' · férié, à confirmer' : '';
    if (OPEN_DAYS.includes(n.wd) && n.min >= OPEN && n.min < CLOSE) {
      return { open: true, text: `Ouvert · ferme à ${fmtTime(CLOSE)}${suffix}` };
    }
    for (let i = 0; i < 8; i++) {
      const wd = (n.wd + i) % 7;
      if (!OPEN_DAYS.includes(wd)) continue;
      if (i === 0 && n.min >= CLOSE) continue;
      const when = i === 0 ? 'ouvre' : i === 1 ? 'ouvre demain' : `ouvre ${WD_LONG[wd]}`;
      return { open: false, text: `Fermé · ${when} à ${fmtTime(OPEN)}` };
    }
    return { open: false, text: 'Fermé' };
  }

  function renderStatus() {
    const n = parisNow();
    const s = status(n);
    const heroText = $('[data-status]');
    const heroDot = $('[data-status-dot]');
    const boardText = $('[data-board-status]');
    if (heroText) heroText.textContent = s.text;
    if (heroDot) heroDot.classList.toggle('is-open', s.open);
    if (boardText) boardText.textContent = s.text;
    $$('.week tr[data-day]').forEach((tr) => {
      tr.classList.toggle('is-today', Number(tr.dataset.day) === n.wd);
    });
  }

  /* Révélations : une seule fois, à l’entrée dans l’écran */
  function initReveal() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.add('is-ready');
    }));
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* La ligne : progression au défilement et arrêt courant */
  function initRail() {
    const fill = $('.rail__fill');
    const stops = $$('.rail__stop');
    let ticking = false;
    const top = $('.progress__fill');
    const paint = () => {
      ticking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (fill) fill.style.transform = `scaleY(${p.toFixed(4)})`;
      if (top) top.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    window.addEventListener('resize', paint, { passive: true });
    paint();

    if (!('IntersectionObserver' in window)) return;
    const setOn = (id) => stops.forEach((a) => {
      const on = a.dataset.stop === id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setOn(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    stops.forEach((a) => {
      const sec = document.getElementById(a.dataset.stop);
      if (sec) io.observe(sec);
    });
  }

  /* Menu mobile */
  function initMenu() {
    const btn = $('.top__menu');
    const menu = $('#menu');
    if (!btn || !menu) return;
    const set = (open) => {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Fermer' : 'Menu';
    };
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      set(open);
      if (open) { const first = menu.querySelector('a'); if (first) first.focus(); }
    });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); }
    });
    window.matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* Le mot-symbole remplit sa colonne, à toutes les largeurs (polices mesurées, pas devinées) */
  function initFit() {
    const els = $$('[data-fit]');
    if (!els.length) return;
    const measure = (node) => {
      const r = document.createRange();
      r.selectNodeContents(node);
      return r.getBoundingClientRect().width;
    };
    const run = () => {
      els.forEach((el) => {
        el.style.fontSize = '';
        const avail = el.clientWidth;
        const lines = el.hasAttribute('data-fit-line') ? [el] : $$('[data-fit-line]', el);
        const need = Math.max(0, ...lines.map(measure));
        if (avail > 0 && need > 0) {
          const size = parseFloat(getComputedStyle(el).fontSize);
          const cap = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize);
          el.style.fontSize = `${Math.min(size * (avail / need) * 0.985, cap).toFixed(2)}px`;
        }
      });
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    run();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
    window.addEventListener('resize', schedule, { passive: true });
  }

  function initCopy() {
    const btn = $('[data-copy]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!navigator.clipboard) { announce('Copie impossible. Sélectionnez l’adresse à la main.'); return; }
      navigator.clipboard.writeText('71 rue de Rome, Marseille')
        .then(() => announce('Adresse copiée.'))
        .catch(() => announce('Copie impossible. Sélectionnez l’adresse à la main.'));
    });
  }

  /* ---------- Réservation simulée ---------- */

  const SVC = $$('.row[data-svc]').map((li) => ({
    id: li.dataset.svc,
    name: li.dataset.name,
    min: Number(li.dataset.min),
    priceText: li.querySelector('.row__price').textContent.trim(),
    group: li.closest('.grp').querySelector('h3').textContent.trim()
  }));
  const byId = Object.fromEntries(SVC.map((s) => [s.id, s]));

  const st = { step: 0, max: 0, svc: null, day: null, time: null, first: '', phone: '' };

  /* FNV-1a : même créneau, même résultat, à chaque visite */
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function dayLabel(key) {
    const [y, m, d] = key.split('-').map(Number);
    return `${WD_LONG[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`;
  }

  function buildServices() {
    const wrap = $('#svc-list');
    if (!wrap) return;
    const groups = [...new Set(SVC.map((s) => s.group))];
    groups.forEach((g) => {
      const fs = document.createElement('fieldset');
      fs.className = 'svc-grp';
      const lg = document.createElement('legend');
      lg.textContent = g;
      fs.append(lg);
      SVC.filter((s) => s.group === g).forEach((s) => {
        const label = document.createElement('label');
        label.className = 'svc';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'svc';
        input.value = s.id;
        const name = document.createElement('span');
        name.className = 'svc__name';
        name.textContent = s.name;
        const meta = document.createElement('span');
        meta.className = 'svc__meta';
        meta.textContent = `${fmtDur(s.min)} · ${s.priceText}`;
        label.append(input, name, meta);
        fs.append(label);
        input.addEventListener('change', () => {
          selectService(s.id);
          clearErr(0);
        });
      });
      wrap.append(fs);
    });
  }

  function buildDays() {
    const wrap = $('#days');
    if (!wrap) return;
    const n = parisNow();
    wrap.textContent = '';
    for (let i = 0; i < 14; i++) {
      const dt = new Date(n.y, n.mo - 1, n.d + i);
      const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate(), wd = dt.getDay();
      const key = `${y}-${pad(m)}-${pad(d)}`;
      const openDay = OPEN_DAYS.includes(wd);
      const hol = HOLIDAYS.includes(`${pad(m)}-${pad(d)}`);

      const label = document.createElement('label');
      label.className = 'day';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'day';
      input.value = key;
      input.disabled = !openDay;

      const box = document.createElement('span');
      box.className = 'day__box';
      const wdEl = document.createElement('span');
      wdEl.className = 'day__wd';
      wdEl.textContent = WD_SHORT[wd];
      const dEl = document.createElement('span');
      dEl.className = 'day__d';
      dEl.textContent = `${d} ${MONTHS[m - 1]}`;
      const stEl = document.createElement('span');
      stEl.className = 'day__st';
      stEl.textContent = !openDay ? 'fermé' : hol ? 'férié · à confirmer' : i === 0 ? 'aujourd’hui' : 'ouvert';
      box.append(wdEl, dEl, stEl);
      label.append(input, box);
      wrap.append(label);

      input.addEventListener('change', () => {
        st.day = key;
        st.time = null;
        st.max = Math.min(st.max, 2);
        clearErr(1);
        buildSlots();
        renderSummary();
      });
    }
  }

  function slotsFor(key, svc) {
    const n = parisNow();
    const isToday = key === `${n.y}-${pad(n.mo)}-${pad(n.d)}`;
    const out = [];
    for (let t = OPEN; t + svc.min <= CLOSE; t += 30) {
      const past = isToday && t < n.min + 30;
      let taken = false;
      for (let c = t; c < t + svc.min; c += 30) {
        if (hash(`${key}|${c}`) % 100 < TAKEN_RATE) { taken = true; break; }
      }
      out.push({ t, past, taken });
    }
    return out;
  }

  function buildSlots() {
    const wrap = $('#slots');
    if (!wrap) return;
    wrap.textContent = '';
    if (!st.svc || !st.day) return;
    const svc = byId[st.svc];
    const list = slotsFor(st.day, svc);
    list.forEach(({ t, past, taken }) => {
      const label = document.createElement('label');
      label.className = 'slot';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'time';
      input.value = String(t);
      input.disabled = past || taken;
      input.checked = t === st.time;
      const box = document.createElement('span');
      box.className = 'slot__box';
      box.textContent = fmtTime(t);
      if (past || taken) {
        const sm = document.createElement('small');
        sm.textContent = past ? 'passé' : 'déjà pris';
        box.append(sm);
      }
      label.append(input, box);
      wrap.append(label);
      input.addEventListener('change', () => {
        st.time = t;
        st.max = Math.min(st.max, 2); // un nouvel horaire : le billet n’est plus valide
        clearErr(2);
        renderSummary();
      });
    });
    if (st.step === 2 && !list.some((s) => !s.past && !s.taken)) {
      showErr(2, 'Aucun créneau libre pour cette prestation ce jour-là. Choisissez un autre jour.');
    }
  }

  function selectService(id) {
    if (st.svc !== id) {
      st.svc = id;
      st.time = null;
      st.max = Math.min(st.max, 1); // l’heure doit être choisie de nouveau
      const radio = document.getElementById('svc-' + id) || $(`input[name="svc"][value="${id}"]`);
      if (radio) radio.checked = true;
      buildSlots();
    }
    renderSummary();
  }

  /* Résumé « Votre sélection » */
  function renderSummary() {
    const svc = st.svc ? byId[st.svc] : null;
    const set = (key, text) => {
      const el = $(`[data-sel="${key}"]`);
      if (el) el.textContent = text;
    };
    set('svc', svc ? svc.name : 'Aucune');
    set('day', st.day ? dayLabel(st.day) : 'À choisir');
    set('time', st.time != null ? fmtTime(st.time) : 'À choisir');
    set('price', svc ? svc.priceText : NB);
  }

  function renderBillet() {
    const dl = $('#billet-dl');
    if (!dl) return;
    const svc = byId[st.svc];
    const rows = [
      ['Prestation', svc.name],
      ['Jour', dayLabel(st.day)],
      ['Heure', `${fmtTime(st.time)} · ${fmtDur(svc.min)}`],
      ['Prix', svc.priceText],
      ['Prénom', st.first],
      ['Téléphone', st.phone.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')]
    ];
    dl.textContent = '';
    rows.forEach(([k, v]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      div.append(dt, dd);
      dl.append(div);
    });
  }

  function showErr(i, msg) {
    const el = document.getElementById(`err-${i}`);
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    announce(msg);
  }
  function clearErr(i) {
    const el = document.getElementById(`err-${i}`);
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  function setFieldErr(input, errEl, msg) {
    if (msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    } else {
      errEl.textContent = '';
      errEl.hidden = true;
      input.removeAttribute('aria-invalid');
    }
    return !msg;
  }

  /* Étapes : chaque arrêt de la ligne */
  const stepEls = $$('.step');
  const tripBtns = $$('.trip__btn');
  const TITLES = ['Prestation', 'Jour', 'Heure', 'Contact', 'Billet'];

  function animateIn(el) {
    if (!el.animate) return;
    const frames = reduce.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }];
    el.animate(frames, { duration: 240, easing: EASE_OUT });
  }

  function go(i, opts = {}) {
    if (i < 0 || i > 4 || i > st.max) return;
    st.step = i;
    stepEls.forEach((el) => { el.hidden = Number(el.dataset.step) !== i; });
    tripBtns.forEach((b, k) => {
      b.disabled = k > st.max;
      b.classList.toggle('is-done', k < st.max);
      if (k === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    const el = stepEls[i];
    if (i === 2) buildSlots();
    if (opts.animate !== false) animateIn(el);
    if (opts.focus !== false) {
      const h = $('.step__h', el);
      if (h) h.focus();
    }
    if (opts.focus !== false) announce(`Étape ${i + 1} sur 5${NB}: ${TITLES[i]}`);
  }

  function validate(i) {
    if (i === 0 && !st.svc) return 'Choisissez une prestation.';
    if (i === 1 && !st.day) return 'Choisissez un jour ouvert.';
    if (i === 2 && st.time == null) return 'Choisissez un créneau libre.';
    return null;
  }

  function next() {
    const i = st.step;
    const msg = validate(i);
    if (msg) { showErr(i, msg); return; }
    clearErr(i);
    st.max = Math.max(st.max, i + 1);
    go(i + 1);
  }

  function initBooking() {
    buildServices();
    buildDays();
    renderSummary();

    $$('[data-next]').forEach((b) => b.addEventListener('click', next));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => go(st.step - 1)));
    tripBtns.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));

    $$('[data-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectService(btn.dataset.pick);
        clearErr(0);
        st.max = Math.max(st.max, 1);
        go(1);
        const sec = document.getElementById('reserver');
        if (sec && !sec.matches(':target')) sec.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
      });
    });

    const form = $('#book-form');
    const first = $('#f-first');
    const phone = $('#f-phone');
    const errFirst = $('#err-f-first');
    const errPhone = $('#err-f-phone');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = first.value.trim();
      const tel = phone.value.replace(/[\s.-]/g, '');
      const local = tel.replace(/^(?:\+33|0033)/, '0');
      const bad = [0, 1, 2].find((k) => validate(k));
      if (bad != null) {
        // Une étape amont a changé : on y revient avec le message, le billet ne s’imprime pas
        st.max = bad;
        go(bad);
        showErr(bad, validate(bad));
        return;
      }
      const okName = setFieldErr(first, errFirst, NAME_RE.test(name) ? '' : 'Indiquez votre prénom, deux lettres au moins.');
      const okPhone = setFieldErr(phone, errPhone, PHONE_RE.test(local) ? '' : 'Indiquez un portable français, par exemple 06 12 34 56 78.');
      if (!okName) { first.focus(); return; }
      if (!okPhone) { phone.focus(); return; }
      st.first = name;
      st.phone = local;
      st.max = Math.max(st.max, 4);
      renderBillet();
      go(4);
      announce('Simulation enregistrée. Rien n’a été envoyé au salon.');
      const billet = $('#billet');
      if (billet && billet.animate) {
        billet.animate(
          reduce.matches
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
          { duration: reduce.matches ? 200 : 700, easing: EASE_OUT }
        );
      }
    });
    first.addEventListener('input', () => { if (first.getAttribute('aria-invalid')) setFieldErr(first, errFirst, ''); });
    phone.addEventListener('input', () => { if (phone.getAttribute('aria-invalid')) setFieldErr(phone, errPhone, ''); });

    const ics = $('[data-ics]');
    if (ics) ics.addEventListener('click', downloadIcs);
    const reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', resetBooking);

    go(0, { animate: false, focus: false });
  }

  function downloadIcs() {
    if (!st.svc || !st.day || st.time == null) return;
    const svc = byId[st.svc];
    const [y, m, d] = st.day.split('-');
    const endMin = st.time + svc.min;
    const start = `${y}${m}${d}T${pad(Math.floor(st.time / 60))}${pad(st.time % 60)}00`;
    const end = `${y}${m}${d}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const esc = (s) => s.replace(/[\\;,]/g, (c) => '\\' + c);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${stamp}-${st.day}-${st.time}@apercu.invalid`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${esc('Rendez-vous · The Barber Marseille (simulation)')}`,
      `LOCATION:${esc('71 rue de Rome, Marseille')}`,
      `DESCRIPTION:${esc(svc.name + '. Aperçu : rien n’a été envoyé au salon.')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rendez-vous-the-barber.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function resetBooking() {
    st.svc = null; st.day = null; st.time = null; st.first = ''; st.phone = ''; st.max = 0;
    $$('input[name="svc"]').forEach((i) => { i.checked = false; });
    $$('input[name="day"]').forEach((i) => { i.checked = false; });
    $('#book-form').reset();
    ['f-first', 'f-phone'].forEach((id) => { const el = document.getElementById(id); if (el) el.removeAttribute('aria-invalid'); });
    ['err-f-first', 'err-f-phone'].forEach((id) => { const el = document.getElementById(id); if (el) { el.hidden = true; el.textContent = ''; } });
    [0, 1, 2].forEach(clearErr);
    buildSlots();
    renderSummary();
    go(0);
  }

  function init() {
    initReveal();
    initMenu();
    initCopy();
    initRail();
    initFit();
    renderStatus();
    setInterval(renderStatus, 60 * 1000);
    initBooking();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
