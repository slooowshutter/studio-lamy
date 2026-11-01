/* Sam Coiffure · aperçu non officiel · plain JS, no library.
   Hours are read in Europe/Paris. Nothing is sent anywhere: the booking is a simulation. */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  if (window.matchMedia('(max-width: 759px)').matches) document.body.classList.add('has-dock');

  const NBSP = ' ';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, '0');

  /* Indicative services. None is published by the salon: durations and prices are placeholders, labelled as such on the page. */
  const SERVICES = {
    s01: { name: 'Coupe homme', dur: 30, price: 20 },
    s02: { name: 'Barbe', dur: 20, price: 12 },
    s03: { name: 'Coupe + barbe', dur: 45, price: 28 },
    s04: { name: 'Coupe femme', dur: 45, price: 35 },
    s05: { name: 'Brushing', dur: 30, price: 22 },
    s06: { name: 'Couleur (racines)', dur: 90, price: 55 },
    s07: { name: 'Coupe enfant', dur: 20, price: 14 }
  };

  /* Opening intervals in minutes after midnight (icoiffeur.fr, seen 01/11/2026, one source: à confirmer). */
  const HOURS = {
    0: [],
    1: [[540, 1110]],
    2: [[540, 1110]],
    3: [[540, 1110]],
    4: [[540, 1110]],
    5: [[510, 750], [870, 1110]],
    6: [[510, 1110]]
  };
  /* The ruler: 8 h to 19 h, 660 minutes. */
  const RULER_START = 480;
  const RULER_SPAN = 660;

  const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  const fmtT = (m) => (m % 60
    ? `${Math.floor(m / 60)}${NBSP}h${NBSP}${pad(m % 60)}`
    : `${Math.floor(m / 60)}${NBSP}h`);
  const fmtPrice = (p) => `${p}${NBSP}€`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pct = (m) => ((m - RULER_START) / RULER_SPAN) * 100;

  /* Paris calendar day as a serial number (days since 1970-01-01), plus the Paris clock. */
  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(date).map((p) => [p.type, p.value])
    );
    const y = +parts.year, m = +parts.month, d = +parts.day;
    const serial = Math.floor(Date.UTC(y, m - 1, d) / 864e5);
    return { serial, dow: new Date(serial * 864e5).getUTCDay(), mins: (+parts.hour) * 60 + (+parts.minute) };
  }

  /* Easter (Meeus/Jones/Butcher), as a serial day. */
  function easterSerial(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Math.floor(Date.UTC(y, month - 1, day) / 864e5);
  }
  const FIXED_HOLIDAYS = [
    [1, 1, 'Jour de l’an'], [5, 1, 'Fête du travail'], [5, 8, 'Victoire 1945'], [7, 14, 'Fête nationale'],
    [8, 15, 'Assomption'], [11, 1, 'Toussaint'], [11, 11, 'Armistice'], [12, 25, 'Noël']
  ];
  const holidayCache = {};
  function holidayAt(serial) {
    const y = new Date(serial * 864e5).getUTCFullYear();
    if (!holidayCache[y]) {
      const map = new Map();
      const e = easterSerial(y);
      map.set(e + 1, 'Lundi de Pâques');
      map.set(e + 39, 'Ascension');
      map.set(e + 50, 'Lundi de Pentecôte');
      FIXED_HOLIDAYS.forEach(([mo, da, label]) => map.set(Math.floor(Date.UTC(y, mo - 1, da) / 864e5), label));
      holidayCache[y] = map;
    }
    return holidayCache[y].get(serial) || null;
  }

  /* Closed: every Sunday, and 1 November (Toussaint, per icoiffeur.fr). Other holidays stay bookable, flagged à confirmer. */
  function intervalsFor(serial) {
    const dow = new Date(serial * 864e5).getUTCDay();
    if (dow === 0 || holidayAt(serial) === 'Toussaint') return [];
    return HOURS[dow] || [];
  }
  function nextOpening(now) {
    for (let i = 1; i <= 8; i++) {
      const serial = now.serial + i;
      const iv = intervalsFor(serial);
      if (iv.length) return { i, serial, start: iv[0][0] };
    }
    return null;
  }
  function nextText(now) {
    const n = nextOpening(now);
    if (!n) return '';
    const when = n.i === 1 ? 'demain' : DAYS_LONG[new Date(n.serial * 864e5).getUTCDay()];
    return `ouvre ${when} à ${fmtT(n.start)}`;
  }
  function statusText(now) {
    const iv = intervalsFor(now.serial);
    const hol = holidayAt(now.serial);
    if (!iv.length) {
      const toussaint = hol === 'Toussaint' ? ' (Toussaint)' : '';
      return `Fermé aujourd’hui${toussaint} · ${nextText(now)}`;
    }
    if (hol) return 'Jour férié · horaires à confirmer';
    const cur = iv.find(([a, b]) => now.mins >= a && now.mins < b);
    if (cur) return `Ouvert · jusqu’à ${fmtT(cur[1])}`;
    const before = iv.find(([a]) => now.mins < a);
    if (before && before === iv[0]) return `Fermé · ouvre à ${fmtT(before[0])}`;
    if (before) return `Pause déjeuner · reprend à ${fmtT(before[0])}`;
    return `Fermé · ${nextText(now)}`;
  }
  const isOpenNow = (now) => intervalsFor(now.serial).some(([a, b]) => now.mins >= a && now.mins < b);

  /* Ruler helpers */
  function buildLabels(container) {
    container.innerHTML = '';
    for (let k = 0; k <= 11; k++) {
      const el = document.createElement(container.tagName === 'OL' ? 'li' : 'span');
      el.className = 'ruler__lab' + (k === 11 ? ' ruler__lab--end' : '');
      el.style.setProperty('--k', k);
      el.textContent = String(8 + k);
      container.appendChild(el);
    }
  }
  function addBar(track, startMin, endMin, cls) {
    const bar = document.createElement('span');
    bar.className = cls;
    bar.style.left = `${pct(startMin)}%`;
    bar.style.width = `${((endMin - startMin) / RULER_SPAN) * 100}%`;
    track.appendChild(bar);
    return bar;
  }
  /* Needles are moved with transform (compositor), in px of the track's width. */
  const needles = [];
  function placeNeedle(el, mins) {
    el.dataset.mins = String(mins);
    el.style.transform = `translateX(${(pct(mins) / 100) * el.parentElement.clientWidth}px)`;
  }
  function relayNeedles() {
    needles.forEach((el) => { if (el.dataset.mins) placeNeedle(el, +el.dataset.mins); });
  }

  /* Hero */
  const heroTrack = $('[data-track]');
  const heroLabels = $('[data-labels]');
  const heroNeedle = $('[data-needle]');
  const statusEl = $('[data-status]');
  buildLabels(heroLabels);
  needles.push(heroNeedle);

  /* Week */
  const weekScale = $('[data-week-scale]');
  buildLabels(weekScale);
  const dayRows = $$('.day[data-dow]');
  let todayNeedle = null;

  function drawWeek(now) {
    dayRows.forEach((row) => {
      const dow = +row.dataset.dow;
      const track = $('.day__track', row);
      $$('.day__bar, .day__gap, .day__gap-label', track).forEach((n) => n.remove());
      row.classList.remove('is-today');
      $$('.day__today', row).forEach((n) => n.remove());
      const iv = HOURS[dow] || [];
      iv.forEach(([a, b]) => addBar(track, a, b, 'day__bar'));
      if (iv.length === 2) {
        const gapStart = iv[0][1], gapEnd = iv[1][0];
        const gap = addBar(track, gapStart, gapEnd, 'day__gap');
        const label = document.createElement('span');
        label.className = 'day__gap-label';
        label.style.left = gap.style.left;
        label.textContent = 'pause';
        track.appendChild(label);
      }
      if (dow === now.dow) {
        row.classList.add('is-today');
        const name = $('.day__name', row);
        name.insertAdjacentHTML('beforeend', '<span class="day__today">aujourd’hui</span>');
        if (!todayNeedle) {
          todayNeedle = document.createElement('span');
          todayNeedle.className = 'needle';
          todayNeedle.setAttribute('aria-hidden', 'true');
          todayNeedle.hidden = true;
          needles.push(todayNeedle);
        }
        track.appendChild(todayNeedle);
      }
    });
  }

  /* Bars are redrawn only when the Paris day changes; the status and the needles move every 30 s. */
  let drawnSerial = null;
  function refresh() {
    const now = parisNow();
    statusEl.textContent = statusText(now);

    if (now.serial !== drawnSerial) {
      drawnSerial = now.serial;
      $$('.ruler__bar', heroTrack).forEach((n) => n.remove());
      intervalsFor(now.serial).forEach(([a, b]) => addBar(heroTrack, a, b, 'ruler__bar'));
      drawWeek(now);
    }
    const open = isOpenNow(now);
    heroNeedle.hidden = !open;
    if (open) placeNeedle(heroNeedle, now.mins);
    if (todayNeedle) {
      todayNeedle.hidden = !open;
      if (open) placeNeedle(todayNeedle, now.mins);
    }
  }

  /* Days and slots for the booking */
  const state = { svc: null, serial: null, t: null };
  const form = $('[data-form]');
  const daysBox = $('[data-days]');
  const slotsBox = $('[data-slots]');
  const slotHint = $('[data-slot-hint]');
  const live = $('[data-live]');
  const sumTrack = $('[data-sum-track]');
  const sumBar = $('[data-sum-bar]');
  const sumLabels = $('[data-sum-labels]');
  buildLabels(sumLabels);

  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  }
  function dayLong(serial) {
    const d = new Date(serial * 864e5);
    return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
  }

  function buildDays(now) {
    daysBox.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const serial = now.serial + i;
      const d = new Date(serial * 864e5);
      const closed = intervalsFor(serial).length === 0;
      const hol = holidayAt(serial);
      const tag = closed ? (hol ? 'fermé · Toussaint' : 'fermé') : (hol ? 'férié · à confirmer' : '');
      const label = document.createElement('label');
      label.className = 'dayopt';
      label.innerHTML =
        `<input type="radio" name="day" value="${serial}"${closed ? ' disabled' : ''}>` +
        `<span class="dn">${DAYS_SHORT[d.getUTCDay()]}</span>` +
        `<span class="dd">${d.getUTCDate()}</span>` +
        `<span class="dm">${MONTHS_SHORT[d.getUTCMonth()]}</span>` +
        (tag ? `<span class="dtag">${tag}</span>` : '');
      daysBox.appendChild(label);
    }
  }

  function renderSlots() {
    slotsBox.innerHTML = '';
    if (!state.svc || !state.serial) {
      slotHint.textContent = 'Choisissez d’abord un jour.';
      return;
    }
    const svc = SERVICES[state.svc];
    const now = parisNow();
    const isToday = state.serial === now.serial;
    const starts = [];
    intervalsFor(state.serial).forEach(([a, b]) => {
      for (let t = a; t + svc.dur <= b; t += 30) starts.push(t);
    });
    let free = 0;
    starts.forEach((t) => {
      const past = isToday && t <= now.mins;
      const taken = !past && hash(`${state.serial}|${t}|${state.svc}`) % 5 === 0;
      if (!past && !taken) free++;
      const label = document.createElement('label');
      label.className = 'slotopt' + (past ? ' slotopt--past' : '');
      const note = past ? '<span class="vh">, passé</span>' : taken ? '<span class="vh">, déjà pris</span>' : '';
      label.innerHTML =
        `<input type="radio" name="slot" value="${t}"${past || taken ? ' disabled' : ''}>` +
        `<span>${fmtT(t)}</span>${note}`;
      slotsBox.appendChild(label);
    });
    if (!starts.length) {
      slotsBox.innerHTML = '<p class="slots__empty">Pas de créneau ce jour-là pour cette durée.</p>';
      slotHint.textContent = 'Essayez un autre jour.';
      return;
    }
    slotHint.textContent = free
      ? `${free}${NBSP}créneau${free > 1 ? 'x' : ''} libre${free > 1 ? 's' : ''}. Les heures barrées sont déjà prises.`
      : 'Plus de créneau libre ce jour-là. Essayez un autre jour.';
  }

  function updateSummary() {
    const svc = state.svc ? SERVICES[state.svc] : null;
    $$('.sum-open', sumTrack).forEach((n) => n.remove());
    if (state.serial) intervalsFor(state.serial).forEach(([a, b]) => addBar(sumTrack, a, b, 'sum-open'));
    $('[data-sum="svc"]').textContent = svc ? svc.name : 'à choisir';
    $('[data-sum="day"]').textContent = state.serial ? cap(dayLong(state.serial)) : 'à choisir';
    $('[data-sum="time"]').textContent = state.t ? fmtT(state.t) : 'à choisir';
    $('[data-sum="price"]').textContent = svc ? `${fmtPrice(svc.price)} (indicatif)` : 'à confirmer';
    if (svc && state.serial && state.t) {
      sumBar.hidden = false;
      sumBar.style.left = `${pct(state.t)}%`;
      sumBar.style.width = `${(svc.dur / RULER_SPAN) * 100}%`;
      sumBar.style.transform = 'scaleX(0)';
      void sumBar.offsetWidth;
      sumBar.style.transform = 'scaleX(1)';
    } else {
      sumBar.hidden = true;
    }
  }

  function updateSteps() {
    const enable = {
      1: true,
      2: !!state.svc,
      3: !!(state.svc && state.serial),
      4: !!(state.svc && state.serial && state.t)
    };
    $$('.step').forEach((btn) => {
      const n = +btn.dataset.go;
      btn.disabled = !enable[n];
      if (btn.getAttribute('aria-current') === 'step') btn.removeAttribute('aria-current');
    });
    $$('[data-next]').forEach((btn) => { btn.disabled = !enable[+btn.dataset.next]; });
    const current = $(`.step[data-go="${currentStep}"]`);
    if (current) current.setAttribute('aria-current', 'step');
  }

  /* Panels: one visible at a time, entering with a transition. */
  const panels = {};
  $$('[data-panel]').forEach((p) => { panels[p.dataset.panel] = p; });
  let currentStep = '1';
  function setPanel(name, { focus = true } = {}) {
    currentStep = name;
    Object.entries(panels).forEach(([key, p]) => {
      if (key === name) {
        p.hidden = false;
        void p.offsetHeight;
        p.classList.add('is-in');
      } else {
        p.classList.remove('is-in');
        p.hidden = true;
      }
    });
    updateSteps();
    if (focus) {
      const heading = $('.panel__title', panels[name]);
      if (heading) heading.focus();
    }
  }

  function setRecap() {
    const svc = SERVICES[state.svc];
    $('[data-recap]').textContent =
      `${svc.name}, ${dayLong(state.serial)} à ${fmtT(state.t)}. Prix indicatif${NBSP}: ${fmtPrice(svc.price)}.`;
  }

  /* Events: prestation, jour, heure */
  $$('input[name="svc"]').forEach((r) => {
    r.addEventListener('change', () => {
      state.svc = r.value;
      state.t = null;
      renderSlots();
      updateSummary();
      updateSteps();
    });
  });
  daysBox.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="day"]')) return;
    state.serial = +e.target.value;
    state.t = null;
    renderSlots();
    updateSummary();
    updateSteps();
  });
  slotsBox.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="slot"]')) return;
    state.t = +e.target.value;
    updateSummary();
    updateSteps();
  });

  /* Prestation buttons on the price list preselect the service and open the day step */
  $$('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.pick;
      const radio = $(`input[name="svc"][value="${id}"]`);
      if (radio) radio.checked = true;
      state.svc = id;
      state.t = null;
      renderSlots();
      updateSummary();
      setPanel('2');
      $('.panel__title', panels['2']).scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  });

  /* Steps, next and back */
  $$('[data-go], [data-next], [data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.go || btn.dataset.next || btn.dataset.back;
      if (target === '3' || target === '4') {
        if (target === '3' && !state.serial) return;
        if (target === '4' && !state.t) return;
      }
      if (target === '4') setRecap();
      setPanel(target);
    });
  });

  /* Coordonnées: loose French mobile check, inline messages, no network call */
  const fName = $('#f-name'), fTel = $('#f-tel'), eName = $('#e-name'), eTel = $('#e-tel');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    /* A slot may have passed while the panel was open: check again before confirming */
    const nowCheck = parisNow();
    if (state.t && state.serial === nowCheck.serial && state.t <= nowCheck.mins) {
      state.t = null;
      updateSummary();
      updateSteps();
      renderSlots();
      setPanel('3');
      live.textContent = 'Ce créneau est passé. Choisissez-en un autre.';
      return;
    }
    const name = fName.value.trim();
    const tel = fTel.value.replace(/[\s.\-]/g, '');
    const nameOk = name.length >= 2;
    const telOk = /^(?:\+33|0)[67]\d{8}$/.test(tel);
    fName.setAttribute('aria-invalid', String(!nameOk));
    fTel.setAttribute('aria-invalid', String(!telOk));
    eName.hidden = nameOk;
    eTel.hidden = telOk;
    if (!nameOk || !telOk) {
      live.textContent = 'Corrigez les champs signalés.';
      (nameOk ? fTel : fName).focus();
      return;
    }
    const svc = SERVICES[state.svc];
    $('[data-done-text]').textContent =
      `${svc.name}, ${dayLong(state.serial)} à ${fmtT(state.t)}, au nom de ${name}. ` +
      `Prix indicatif${NBSP}: ${fmtPrice(svc.price)}. Les horaires et les tarifs sont à confirmer avec le salon.`;
    live.textContent = 'Créneau noté, en simulation.';
    setPanel('done');
  });
  [fName, fTel].forEach((input) => {
    input.addEventListener('input', () => {
      input.setAttribute('aria-invalid', 'false');
      (input === fName ? eName : eTel).hidden = true;
    });
  });

  /* Done: .ics export, and start again */
  function parisToUtc(serial, mins) {
    const d = new Date(serial * 864e5);
    const guess = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(mins / 60), mins % 60);
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date(guess)).map((x) => [x.type, x.value])
    );
    const asParis = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return new Date(guess - (asParis - guess));
  }
  const icsStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  $('[data-ics]').addEventListener('click', () => {
    const svc = SERVICES[state.svc];
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Sam Coiffure//FR',
      'BEGIN:VEVENT',
      `UID:sam-coiffure-simulation-${Date.now()}@apercu`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(parisToUtc(state.serial, state.t))}`,
      `DTEND:${icsStamp(parisToUtc(state.serial, state.t + svc.dur))}`,
      `SUMMARY:Sam Coiffure\\, ${svc.name} (simulation)`,
      'LOCATION:8 rue Jacques Peirotes\\, 67000 Strasbourg',
      'DESCRIPTION:Aperçu non officiel. Aucune réservation n’a été faite.',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sam-coiffure-simulation.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('[data-again]').addEventListener('click', () => {
    state.svc = null; state.serial = null; state.t = null;
    $$('input[type="radio"]').forEach((r) => { r.checked = false; });
    form.reset();
    fName.setAttribute('aria-invalid', 'false');
    fTel.setAttribute('aria-invalid', 'false');
    eName.hidden = true; eTel.hidden = true;
    slotsBox.innerHTML = '';
    slotHint.textContent = '';
    updateSummary();
    setPanel('1');
  });

  /* Copy address (no clipboard permission is assumed) */
  const copyMsg = $('[data-copy-msg]');
  $('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('8 rue Jacques Peirotes, 67000 Strasbourg');
      copyMsg.textContent = 'Adresse copiée.';
    } catch (err) {
      copyMsg.textContent = 'Copie impossible ici. L’adresse est écrite au-dessus.';
    }
  });

  /* Menu: Escape closes and returns focus to the button */
  const menuBtn = $('.menu-btn');
  const nav = $('#menu');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Fermer' : 'Menu';
    nav.classList.toggle('is-open', open);
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  /* A click outside the header closes the menu; the desktop bar never shows it */
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.top')) setMenu(false); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    const open = menuBtn.getAttribute('aria-expanded') === 'true';
    if (e.key === 'Escape' && open) {
      setMenu(false);
      menuBtn.focus();
      return;
    }
    /* While the menu is open, Tab cycles inside the button and the links only */
    if (e.key === 'Tab' && open) {
      const items = [menuBtn, ...$$('a', nav)];
      const first = items[0];
      const last = items[items.length - 1];
      if (!items.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Mobile dock: shown once the hero CTAs and the booking are both off screen, never over the footer */
  const dock = $('[data-dock]');
  const dockWatch = { cta: false, book: false, foot: false };
  const dockTargets = [
    ['cta', $('.hero .ctas')], ['book', document.getElementById('reserver')], ['foot', $('.foot')]
  ].filter(([, el]) => el);
  if ('IntersectionObserver' in window) {
    const dockIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const key = dockTargets.find(([, el]) => el === en.target)[0];
        dockWatch[key] = en.isIntersecting;
      });
      dock.classList.toggle('is-on', !dockWatch.cta && !dockWatch.book && !dockWatch.foot);
    }, { threshold: 0 });
    dockTargets.forEach(([, el]) => dockIO.observe(el));
  }

  /* Reveal, once: rows draw their hairlines, bars grow, the map route wipes in */
  const groups = [
    ['.svc-list', '[data-svc-row]'],
    ['.week__list', '.day'],
    ['.form-lines', 'li']
  ];
  groups.forEach(([list, item]) => {
    $$(list).forEach((container) => {
      $$(item, container).forEach((el, i) => el.style.setProperty('--i', String(i)));
    });
  });
  const revealTargets = [...$$('[data-svc-row]'), ...$$('.day'), ...$$('.form-lines li'), $('.plan')].filter(Boolean);
  if ('IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          obs.unobserve(en.target);
        }
      });
    }, { threshold: 0.2 });
    revealTargets.forEach((el) => revealIO.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* Wordmark: a line wider than the hero column shrinks to fit, so the mask never clips a word */
  const heroWrap = $('.hero .wrap');
  function fitWordmark() {
    const cs = getComputedStyle(heroWrap);
    const avail = heroWrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    $$('.wm').forEach((el) => {
      el.style.fontSize = '';
      const size = parseFloat(getComputedStyle(el).fontSize);
      const range = document.createRange();
      range.selectNodeContents(el);
      const w = range.getBoundingClientRect().width;
      if (w > avail) el.style.fontSize = `${size * (avail / w) * 0.99}px`;
    });
  }

  /* Boot */
  const now0 = parisNow();
  buildDays(now0);
  renderSlots();
  updateSummary();
  setPanel('1', { focus: false });
  refresh();
  fitWordmark();
  if (document.fonts) document.fonts.ready.then(fitWordmark);
  window.addEventListener('resize', () => {
    relayNeedles();
    fitWordmark();
    if (window.innerWidth >= 1000) setMenu(false);
  }, { passive: true });
  setInterval(refresh, 30000);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
