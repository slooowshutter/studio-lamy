/* Carré d’Art Reims Forum · aperçu non officiel
   Réservation simulée : rien n’est envoyé. Horaires relevés sur Planity (01/11/2026), fuseau Europe/Paris. */
(() => {
  'use strict';

  const NBSP = ' ';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const el = (tag, props = {}, kids = []) => {
    const n = document.createElement(tag);
    Object.assign(n, props);
    kids.forEach((k) => n.append(k));
    return n;
  };

  // Opening hours (Planity, 01/11/2026). Index = day of week, 0 = dimanche.
  const HOURS = { 0: null, 1: null, 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 18] };
  const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const PARIS = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  // ---------- Time helpers ----------
  function parisNow() {
    const p = {};
    PARIS.formatToParts(new Date()).forEach(({ type, value }) => { p[type] = value; });
    const y = +p.year;
    const mo = +p.month;
    const d = +p.day;
    return { y, mo, d, min: (+p.hour) * 60 + (+p.minute), dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
  }
  function addDays(y, mo, d, n) {
    const t = new Date(Date.UTC(y, mo - 1, d + n));
    return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
  }
  const sameDay = (a, b) => !!a && !!b && a.y === b.y && a.mo === b.mo && a.d === b.d;
  const longDay = (dt) => LONG_DAY.format(new Date(Date.UTC(dt.y, dt.mo - 1, dt.d)));
  const hm = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}${NBSP}h${m ? `${NBSP}${String(m).padStart(2, '0')}` : ''}`;
  };
  const durText = (min) => {
    if (min < 60) return `${min}${NBSP}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}${NBSP}h${m ? `${NBSP}${m}` : ''}`;
  };
  function parseDur(text) {
    const s = text.replace(/\s+/g, ' ').trim();
    let r = s.match(/^(\d+)\s*h\s*(\d+)?$/);
    if (r) return (+r[1]) * 60 + (+(r[2] || 0));
    r = s.match(/^(\d+)\s*min$/);
    return r ? +r[1] : 0;
  }

  // ---------- Services, read from the price list so the two never drift ----------
  const SERVICES = [];
  $$('#prestations .row[data-row]').forEach((row) => {
    const link = $('[data-book]', row);
    if (!link) return; // « Non réservables en ligne » rows have no data-book
    // The category heading sits right before each list of rows.
    const cat = row.closest('.rows').previousElementSibling.querySelector('span').textContent.trim();
    const det = $('.row__det', row);
    const raw = $('.row__price', row).textContent;
    SERVICES.push({
      id: link.dataset.book,
      cat,
      name: $('.row__name', row).textContent.trim(),
      det: det ? det.textContent.trim().toLowerCase() : '',
      min: parseDur($('.row__dur', row).textContent),
      price: +raw.match(/(\d+)/)[1],
      from: /à partir de/.test(raw),
    });
  });
  const SVC = Object.fromEntries(SERVICES.map((s) => [s.id, s]));
  const svcLabel = (s) => (s.det ? `${s.name}, ${s.det}` : s.name);
  const priceLabel = (s) => `${s.from ? 'à partir de ' : ''}${s.price}${NBSP}€`;
  // Each « Réserver » link names its service, so a list of identical buttons is usable with a screen reader.
  $$('[data-book]').forEach((a) => a.setAttribute('aria-label', `Réserver${NBSP}: ${svcLabel(SVC[a.dataset.book])}`));

  // ---------- Slots ----------
  // « Déjà pris » is deterministic: about one slot in six, the same every time for a given day and service.
  function slotsFor(dt, svc, now) {
    const h = HOURS[dt.dow];
    if (!h) return null;
    const out = [];
    const isToday = sameDay(dt, now);
    for (let t = h[0] * 60; t + svc.min <= h[1] * 60; t += 30) {
      const past = isToday && t < now.min + 15;
      const taken = ((dt.d * 17 + dt.mo * 5 + (t / 30) * 11 + svc.min) % 6) === 0;
      out.push({ t, state: past ? 'past' : taken ? 'taken' : 'free' });
    }
    return out;
  }

  // ---------- State ----------
  const state = { svc: null, day: null, t: null, name: '', tel: '' };
  let maxStep = 1; // the furthest step the user may open

  // ---------- The quote (sheet) ----------
  // Each line is written once, when its own value changes, so a new choice never refills the others.
  const quote = $('[data-quote]');
  const written = {};
  function writeLine(key, text, srText) {
    if (written[key] === text) return;
    written[key] = text;
    const box = $(`[data-fill="${key}"]`, quote);
    box.textContent = '';
    if (text === null) {
      box.append(el('span', { className: 'ql__blank' }, [el('span', { className: 'sr-only', textContent: srText })]));
      return;
    }
    const span = el('span', { className: 'ql__txt', textContent: text });
    box.append(span);
    requestAnimationFrame(() => requestAnimationFrame(() => span.classList.add('is-on')));
  }
  function syncQuote() {
    $('[data-stamp]').hidden = true; // any change means the sheet is no longer "Noté"
    writeLine('service', state.svc ? svcLabel(state.svc) : null, 'à choisir');
    writeLine('day', state.day ? longDay(state.day) : null, 'à choisir');
    writeLine('time', state.t !== null ? hm(state.t) : null, 'à choisir');
    writeLine('price', state.svc ? priceLabel(state.svc) : null, 'selon la prestation');
  }

  // ---------- Step 1: prestation ----------
  function renderServices() {
    const box = $('[data-services]');
    box.textContent = '';
    let cat = '';
    SERVICES.forEach((s) => {
      if (s.cat !== cat) {
        cat = s.cat;
        box.append(el('p', { className: 'opts__cat', textContent: cat }));
      }
      const input = el('input', { type: 'radio', name: 'svc', value: s.id });
      input.checked = !!state.svc && state.svc.id === s.id;
      const meta = `${durText(s.min)} · ${priceLabel(s)}`;
      const label = el('label', { className: 'opt' + (input.checked ? ' is-sel' : '') }, [
        input,
        el('span', { className: 'opt__name', textContent: svcLabel(s) }),
        el('span', { className: 'opt__meta', textContent: meta }),
      ]);
      box.append(label);
    });
  }
  function syncOpts() {
    $$('.opt', $('[data-services]')).forEach((lab) => {
      const input = $('input', lab);
      lab.classList.toggle('is-sel', input.checked);
    });
  }

  // ---------- Step 2: jour ----------
  function renderDays() {
    const box = $('[data-days]');
    box.textContent = '';
    const now = parisNow();
    const svc = state.svc || { min: 30 };
    for (let i = 0; i < 14; i++) {
      const dt = addDays(now.y, now.mo, now.d, i);
      const slots = slotsFor(dt, svc, now);
      let status = 'open';
      let sub = i === 0 ? 'auj.' : MONTH_SHORT[dt.mo - 1];
      if (!slots) { status = 'closed'; sub = 'fermé'; }
      else if (!slots.some((s) => s.state === 'free')) {
        status = 'full';
        sub = slots.every((s) => s.state === 'past') ? 'passé' : 'complet';
      }
      const selected = sameDay(state.day, dt);
      const input = el('input', { type: 'radio', name: 'day', value: `${dt.y}-${dt.mo}-${dt.d}` });
      input.disabled = status !== 'open';
      input.checked = selected;
      const label = el('label', {
        className: `day${status !== 'open' ? ' is-off' : ''}${selected ? ' is-sel' : ''}`,
      }, [
        input,
        el('span', { className: 'day__wd', textContent: DAY_SHORT[dt.dow] }),
        el('span', { className: 'day__d', textContent: String(dt.d) }),
        el('span', { className: 'day__s', textContent: sub }),
      ]);
      box.append(label);
    }
  }

  // ---------- Step 3: heure ----------
  function renderSlots() {
    const box = $('[data-slots]');
    const note = $('[data-slots-note]');
    box.textContent = '';
    const now = parisNow();
    const slots = state.day && state.svc ? slotsFor(state.day, state.svc, now) : null;
    if (!slots) {
      note.textContent = 'Fermé ce jour-là. Choisissez un autre jour.';
      return;
    }
    note.textContent = `${longDay(state.day)} · ${durText(state.svc.min)} de prestation · un créneau toutes les 30${NBSP}min.`;
    if (state.t !== null && !slots.some((s) => s.t === state.t && s.state === 'free')) state.t = null;
    slots.forEach((s) => {
      const free = s.state === 'free';
      const input = el('input', { type: 'radio', name: 'slot', value: String(s.t) });
      input.disabled = !free;
      input.checked = free && state.t === s.t;
      const suffix = s.state === 'taken' ? ', déjà pris' : s.state === 'past' ? ', passé' : '';
      box.append(el('label', {
        className: `slot${!free ? ' is-off' : ''}${input.checked ? ' is-sel' : ''}`,
      }, [input, document.createTextNode(hm(s.t)), el('span', { className: 'sr-only', textContent: suffix })]));
    });
  }

  // ---------- Step 4: coordonnées ----------
  const form = $('[data-form]');
  const fName = $('#f-name');
  const fTel = $('#f-tel');
  const NAME_OK = (v) => v.length >= 2 && /^[\p{L}'’ -]+$/u.test(v);
  const TEL_OK = (v) => /^(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4}$/.test(v);
  function setField(input, errEl, ok) {
    input.closest('.field').classList.toggle('is-bad', !ok);
    input.setAttribute('aria-invalid', String(!ok));
    errEl.hidden = ok;
  }
  function fillRecap(dl, rows) {
    dl.textContent = '';
    rows.forEach(([k, v]) => {
      dl.append(el('dt', { textContent: k }), el('dd', { textContent: v }));
    });
  }
  function renderRecap() {
    fillRecap($('[data-recap]'), [
      ['Prestation', svcLabel(state.svc)],
      ['Jour', longDay(state.day)],
      ['Heure', hm(state.t)],
      ['Prix indicatif', priceLabel(state.svc)],
    ]);
  }

  // ---------- Steps ----------
  const live = $('[data-live]');
  function announce(msg) {
    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 30);
  }
  const STEP_NAMES = { 1: 'prestation', 2: 'jour', 3: 'heure', 4: 'coordonnées', 5: 'devis noté' };
  function show(step, { focus = true, scroll = true } = {}) {
    maxStep = Math.max(maxStep, step);
    $$('[data-step]').forEach((p) => {
      const on = +p.dataset.step === step;
      if (on) {
        p.hidden = false;
        void p.offsetWidth; // commit the hidden state first, so the panel fades in
        p.classList.add('is-on');
      } else {
        p.hidden = true;
        p.classList.remove('is-on');
      }
    });
    $$('[data-goto]').forEach((b) => {
      const n = +b.dataset.goto;
      b.disabled = n > maxStep;
      if (n === step) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    if (step === 2) renderDays();
    if (step === 3) renderSlots();
    if (step === 4) renderRecap();
    const panel = $(`[data-step="${step}"]`);
    const heading = $('.panel__t', panel);
    if (scroll) panel.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    if (focus) heading.focus({ preventScroll: true });
    if (step < 5) announce(`Étape ${step} sur 4${NBSP}: ${STEP_NAMES[step]}.`);
  }
  function setErr(n, on) {
    const e = $(`#err-${n}`);
    if (e) e.hidden = !on;
  }

  // A new service changes the slots, so the time is chosen again and the steps after the service are closed.
  function setService(id) {
    state.svc = SVC[id];
    state.t = null;
    state.day = null;
    maxStep = Math.min(maxStep, 2);
    syncOpts();
    syncQuote();
  }
  function pick(id) {
    const input = $(`input[name="svc"][value="${id}"]`);
    if (input) input.checked = true;
    setService(id);
  }

  $('[data-services]').addEventListener('change', (e) => {
    if (e.target.name !== 'svc') return;
    setService(e.target.value);
    setErr(1, false);
  });
  // A new day also clears the time, so step 4 can never be reached without one.
  $('[data-days]').addEventListener('change', (e) => {
    if (e.target.name !== 'day') return;
    const [y, mo, d] = e.target.value.split('-').map(Number);
    state.day = { y, mo, d, dow: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() };
    state.t = null;
    maxStep = Math.min(maxStep, 3);
    $$('.day', $('[data-days]')).forEach((lab) => lab.classList.toggle('is-sel', $('input', lab).checked));
    syncQuote();
    setErr(2, false);
  });
  $('[data-slots]').addEventListener('change', (e) => {
    if (e.target.name !== 'slot') return;
    state.t = +e.target.value;
    $$('.slot', $('[data-slots]')).forEach((lab) => lab.classList.toggle('is-sel', $('input', lab).checked));
    syncQuote();
    setErr(3, false);
  });

  document.addEventListener('click', (e) => {
    const next = e.target.closest('[data-next]');
    const prev = e.target.closest('[data-prev]');
    const goto = e.target.closest('[data-goto]');
    if (next) {
      const n = +next.dataset.next;
      const ok = n === 1 ? !!state.svc : n === 2 ? !!state.day : n === 3 ? state.t !== null : true;
      if (n === 2 && state.day) {
        const free = slotsFor(state.day, state.svc, parisNow());
        if (!free || !free.some((s) => s.state === 'free')) {
          $('#err-2').textContent = 'Ce jour est complet pour cette prestation. Choisissez un autre jour.';
          setErr(2, true);
          return;
        }
      }
      setErr(n, !ok);
      if (!ok) {
        const msg = n === 1 ? 'Choisissez une prestation pour continuer.' : n === 2 ? 'Choisissez un jour pour continuer.' : 'Choisissez une heure pour continuer.';
        $(`#err-${n}`).textContent = msg;
        return;
      }
      show(n + 1);
    } else if (prev) {
      show(+prev.dataset.prev - 1);
    } else if (goto && !goto.disabled) {
      show(+goto.dataset.goto);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = !state.svc ? 1 : !state.day ? 2 : state.t === null ? 3 : 0;
    if (missing) { show(missing); return; }
    const name = fName.value.trim();
    const tel = fTel.value.trim();
    const okName = NAME_OK(name);
    const okTel = TEL_OK(tel);
    setField(fName, $('#err-name'), okName);
    setField(fTel, $('#err-tel'), okTel);
    if (!okName) { fName.focus(); return; }
    if (!okTel) { fTel.focus(); return; }
    state.name = name;
    state.tel = tel;
    $('[data-stamp]').hidden = false;
    fillRecap($('[data-done-recap]'), [
      ['Prestation', svcLabel(state.svc)],
      ['Jour', longDay(state.day)],
      ['Heure', hm(state.t)],
      ['Au nom de', name],
      ['Téléphone', tel],
      ['Prix indicatif', priceLabel(state.svc)],
    ]);
    show(5);
    announce(`Devis noté. Simulation${NBSP}: rien n’a été envoyé au salon.`);
  });

  // ---------- .ics (client-side, optional) ----------
  function icsText() {
    const pad = (n) => String(n).padStart(2, '0');
    const base = `${state.day.y}${pad(state.day.mo)}${pad(state.day.d)}T`;
    const start = `${base}${pad(Math.floor(state.t / 60))}${pad(state.t % 60)}00`;
    const endMin = state.t + state.svc.min;
    const end = `${base}${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => s.replace(/[,;]/g, (c) => `\\${c}`);
    const fold = (line) => line.match(/.{1,70}/g).join('\r\n ');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Apercu non officiel//FR',
      'BEGIN:VEVENT',
      `UID:${start}-carre-d-art-apercu`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Paris:${start}`,
      `DTEND;TZID=Europe/Paris:${end}`,
      fold(`SUMMARY:${esc(`Devis : ${svcLabel(state.svc)} (aperçu)`)}`),
      fold(`LOCATION:${esc('1 rue de l’Arbalète, 51100 Reims')}`),
      fold(`DESCRIPTION:${esc('Simulation d’aperçu. Rien n’a été envoyé au salon. Tarifs indicatifs.')}`),
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
  $('[data-ics]').addEventListener('click', () => {
    const blob = new Blob([icsText()], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: 'devis-carre-d-art-apercu.ics' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('[data-restart]').addEventListener('click', () => {
    Object.assign(state, { svc: null, day: null, t: null, name: '', tel: '' });
    maxStep = 1;
    form.reset();
    $$('.field', form).forEach((f) => f.classList.remove('is-bad'));
    $$('.err', form).forEach((e) => { e.hidden = true; });
    $('[data-stamp]').hidden = true;
    renderServices();
    syncQuote();
    show(1);
  });

  // « Réserver » in the price list preselects the service and opens step 1.
  $$('[data-book]').forEach((a) => {
    a.addEventListener('click', () => {
      pick(a.dataset.book);
      maxStep = 1;
      show(1, { scroll: false });
    });
  });

  // ---------- Live status and hours ----------
  function openInfo(now) {
    const h = HOURS[now.dow];
    if (h && now.min >= h[0] * 60 && now.min < h[1] * 60) {
      return { open: true, text: `Ouvert maintenant, jusqu’à ${h[1]}${NBSP}h` };
    }
    if (h && now.min < h[0] * 60) {
      return { open: false, text: `Fermé pour le moment, ouvre aujourd’hui à ${h[0]}${NBSP}h` };
    }
    for (let i = 1; i <= 7; i++) {
      const dt = addDays(now.y, now.mo, now.d, i);
      const hh = HOURS[dt.dow];
      if (hh) {
        const when = i === 1 ? 'demain' : DAY_NAMES[dt.dow];
        return { open: false, text: `Fermé, ouvre ${when} à ${hh[0]}${NBSP}h` };
      }
    }
    return { open: false, text: 'Fermé' };
  }
  function tickStatus() {
    const now = parisNow();
    const info = openInfo(now);
    $$('[data-status-text], [data-status-text2]').forEach((n) => { n.textContent = info.text; });
    $$('[data-status]').forEach((n) => n.classList.toggle('is-closed', !info.open));
    $$('[data-dow]').forEach((row) => {
      const dow = +row.dataset.dow;
      row.classList.toggle('is-today', dow === now.dow);
      row.classList.toggle('is-closed', !HOURS[dow]);
    });
  }
  tickStatus();
  setInterval(tickStatus, 60 * 1000);

  // ---------- Header and mobile menu ----------
  const header = $('[data-top]');
  const menuBtn = $('[data-menu]');
  const nav = $('[data-nav]');
  function setMenu(open) {
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.menu-btn__t', menuBtn).textContent = open ? 'Fermer' : 'Menu';
  }
  menuBtn.addEventListener('click', () => {
    const open = !header.classList.contains('is-open');
    setMenu(open);
    if (open) $('a', nav).focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  header.addEventListener('focusout', (e) => {
    if (header.classList.contains('is-open') && !header.contains(e.relatedTarget)) setMenu(false);
  });

  // Copy address
  $('[data-copy]').addEventListener('click', async (e) => {
    const text = e.currentTarget.dataset.copy;
    const live2 = $('[data-copy-live]');
    try {
      await navigator.clipboard.writeText(text);
      live2.textContent = 'Adresse copiée.';
    } catch (_) {
      live2.textContent = `Copie non disponible ici${NBSP}: l’adresse est écrite à côté.`;
    }
  });

  // ---------- Motion: once-only reveals, and the sticky mobile bar ----------
  const once = (nodes, opts = { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }) => {
    if (!('IntersectionObserver' in window)) { nodes.forEach((n) => n.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, opts);
    nodes.forEach((n) => io.observe(n));
  };
  once($$('[data-row]'));
  once($$('.blank'));
  once($$('.band'));
  once($$('[data-map]'));

  // Hero: the wordmark rises, then the sheet settles.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('.hero').classList.add('is-ready');
    $('[data-sheet]').classList.add('is-in');
  }));

  // Sticky « Appeler / Remplir le devis » on mobile, once the hero CTAs have left the screen and the footer is not in view.
  const bar = $('[data-bar]');
  let heroOut = false;
  let footOut = false;
  const syncBar = () => bar.classList.toggle('is-on', heroOut && !footOut);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { heroOut = !en.isIntersecting; syncBar(); }).observe($('[data-hero-ctas]'));
    new IntersectionObserver(([en]) => { footOut = en.isIntersecting; syncBar(); }).observe($('.foot'));
  }

  // Initial state
  renderServices();
  syncQuote();
  $('[data-step="1"]').classList.add('is-on');
})();
