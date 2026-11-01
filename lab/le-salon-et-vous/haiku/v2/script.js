/* Le Salon et Vous, aperçu : planning, réservation simulée, révélations.
   Tout se passe dans le navigateur. Rien n’est envoyé. */
(function () {
  'use strict';
  window.__site = true;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NBSP = ' ';

  /* ---------- Heure de Paris ---------- */
  var PARIS = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function parisNow(date) {
    var p = {};
    PARIS.formatToParts(date || new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, dow: DOW[p.weekday], min: (+p.hour) * 60 + (+p.minute) };
  }
  function parisOffset(ts) {
    var p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date(ts)).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ts / 1000) * 1000;
  }
  function parisToUTC(y, m, d, hh, mm) {
    var guess = Date.UTC(y, m - 1, d, hh, mm);
    return guess - parisOffset(guess);
  }
  function keyOf(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function easter(Y) {
    var a = Y % 19, b = Math.floor(Y / 100), c = Y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451), month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(Y, month - 1, day);
  }
  function holidays(Y) {
    var s = {};
    [Y, Y + 1].forEach(function (y) {
      ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].forEach(function (f) { s[y + '-' + f] = true; });
      s[keyOf(easter(y) + 864e5)] = true;   /* lundi de Pâques */
      s[keyOf(easter(y) + 39 * 864e5)] = true; /* Ascension */
      s[keyOf(easter(y) + 50 * 864e5)] = true; /* lundi de Pentecôte */
    });
    return s;
  }
  function isOpenDow(dow) { return dow >= 2 && dow <= 6; }
  var OPEN = 9 * 60 + 30, CLOSE = 19 * 60, STEP = 30, BLOCKS = (CLOSE - OPEN) / STEP;

  function hm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + NBSP + 'h' + (m ? NBSP + (m < 10 ? '0' : '') + m : '');
  }
  function durLabel(min) {
    if (min < 60) return min + NBSP + 'min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + NBSP + 'h' + (m ? NBSP + m : '');
  }
  function eur(n) { return n + NBSP + '€'; }

  /* Pris : déterministe selon la date et le créneau, jamais le même d’un chargement à l’autre */
  function taken(key, i) {
    var seed = 0;
    for (var c = 0; c < key.length; c++) seed = (seed * 31 + key.charCodeAt(c)) >>> 0;
    var x = Math.sin(seed * 0.00137 + i * 12.9898) * 43758.5453;
    return (x - Math.floor(x)) < 0.3;
  }

  /* ---------- Prestations (indicatives) ---------- */
  var SERVICES = [
    { id: 'S-01', name: 'Coupe femme', dur: 45, price: 65 },
    { id: 'S-02', name: 'Coupe enfant', dur: 30, price: 30 },
    { id: 'S-03', name: 'Coloration', dur: 75, price: 85 },
    { id: 'S-04', name: 'Balayage', dur: 120, price: 160 },
    { id: 'S-05', name: 'Soin kératine', dur: 120, price: 190 },
    { id: 'S-06', name: 'Brushing', dur: 30, price: 35 }
  ];
  function svcById(id) { return SERVICES.filter(function (s) { return s.id === id; })[0] || null; }

  /* ---------- Planning : aperçu du héros ---------- */
  var sheet = $('[data-sheet="hero"]');
  var WEEKDAY_SHORT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  var WEEKDAY_LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  var DAY_LONG_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  var DAY_LONG = { format: function (d) { return DAY_LONG_FMT.format(d).replace(/^1 /, '1er '); } };

  function nextOpenDays(n, now) {
    var out = [];
    var base = Date.UTC(now.y, now.m - 1, now.d);
    var skipToday = !isOpenDow(now.dow) || now.min >= CLOSE;
    for (var i = skipToday ? 1 : 0; out.length < n && i < 30; i++) {
      var ms = base + i * 864e5;
      var dow = new Date(ms).getUTCDay();
      if (isOpenDow(dow)) out.push({ ms: ms, key: keyOf(ms), dow: dow, offset: i });
    }
    return out;
  }

  function buildHeroSheet(now) {
    if (!sheet) return;
    var days = nextOpenDays(5, now);
    var todayKey = keyOf(Date.UTC(now.y, now.m - 1, now.d));
    var sampleCol = 1, sampleRow = 4, sampleLen = 4; /* un balayage de 2 h, pour montrer le geste */
    var html = '';
    html += '<div class="sheet__head"><p class="sheet__title">Planning</p><p class="sheet__sub">Les cinq prochains jours ouverts</p></div>';
    html += '<div class="sheet__days"><div></div>';
    days.forEach(function (d, ci) {
      var dt = new Date(d.ms);
      var isToday = d.key === todayKey;
      html += '<div class="sheet__day' + (isToday ? ' is-today' : '') + '"><span>' + WEEKDAY_SHORT.format(dt).replace('.', '') + '</span><b>' + dt.getUTCDate() + '</b></div>';
    });
    html += '</div>';
    html += '<div class="sheet__body">';
    var nowDiff = now.min - OPEN;
    var nowCol = -1, nowRow = -1, nowFrac = 0;
    days.forEach(function (d, ci) { if (d.key === todayKey && nowDiff >= 0 && nowDiff < CLOSE - OPEN) { nowCol = ci; nowRow = Math.floor(nowDiff / STEP); nowFrac = (nowDiff % STEP) / STEP; } });
    for (var ri = 0; ri < BLOCKS; ri++) {
      html += '<div class="sheet__t" style="--d:0ms">' + hm(OPEN + ri * STEP) + '</div>';
      days.forEach(function (d, ci) {
        var isPast = d.key === todayKey && (OPEN + ri * STEP) + STEP <= now.min;
        var isSample = ci === sampleCol && ri >= sampleRow && ri < sampleRow + sampleLen;
        var isTaken = !isSample && (isPast || taken(d.key, ri));
        var cls = 'sheet__c' + (isTaken ? ' sheet__c--taken' : '') + (ci === nowCol && ri === nowRow ? ' sheet__c--now' : '');
        var style = '--d:' + (ci * 80) + 'ms' + (ci === nowCol && ri === nowRow ? ';--now:' + Math.round(nowFrac * 100) + '%' : '');
        html += '<div class="' + cls + '" style="' + style + '"></div>';
      });
    }
    html += '<div class="sheet__blk" style="--ci:' + sampleCol + ';--ri:' + sampleRow + '"><span class="sheet__bn">Balayage</span><span>2' + NBSP + 'h</span></div>';
    html += '</div>';
    sheet.innerHTML = html;
    sheet.dataset.ready = '1';
  }

  /* ---------- Statut ouvert / fermé ---------- */
  var statusEl = $('[data-status]');
  function updateStatus(now) {
    if (!statusEl) return;
    var txt = $('[data-status-text]', statusEl);
    var holToday = !!HOL[keyOf(Date.UTC(now.y, now.m - 1, now.d))];
    var open = isOpenDow(now.dow) && !holToday && now.min >= OPEN && now.min < CLOSE;
    var msg;
    if (holToday && isOpenDow(now.dow)) msg = 'Jour férié, ouverture à confirmer.';
    else if (open) msg = 'Ouvert maintenant, jusqu’à 19' + NBSP + 'h.';
    else if (isOpenDow(now.dow) && now.min < OPEN) msg = 'Fermé pour l’instant · ouvre aujourd’hui à 9' + NBSP + 'h' + NBSP + '30.';
    else if (isOpenDow(now.dow) && now.dow < 6 && now.min >= CLOSE) msg = 'Fermé · ouvre demain à 9' + NBSP + 'h' + NBSP + '30.';
    else msg = 'Fermé · ouvre mardi à 9' + NBSP + 'h' + NBSP + '30.';
    txt.textContent = msg;
    statusEl.classList.toggle('status--open', open);
    var today = $('.tt li[data-dow="' + now.dow + '"]');
    $$('.tt li').forEach(function (li) { li.classList.toggle('is-today', li === today); });
  }

  /* ---------- Réservation ---------- */
  var S = { svc: null, day: null, time: null, done: false };
  var NOW = parisNow();
  var HOL = holidays(NOW.y);
  var panels = $$('[data-panel]');
  var stepBtns = $$('.steps__b');
  var live = $('#book-live');
  var summary = {
    svc: $('[data-sum="svc"]'), day: $('[data-sum="day"]'), time: $('[data-sum="time"]'), price: $('[data-sum="price"]')
  };

  function say(msg) { if (live) live.textContent = msg; }

  function setSum(el, text, set) {
    el.textContent = text;
    el.classList.toggle('is-set', !!set);
  }

  function renderSummary() {
    var svc = S.svc ? svcById(S.svc) : null;
    setSum(summary.svc, svc ? svc.name + ', ' + durLabel(svc.dur) : 'À choisir', svc);
    var dayTxt = '', dayOk = false;
    if (S.day) {
      var dms = Date.UTC(+S.day.slice(0, 4), +S.day.slice(5, 7) - 1, +S.day.slice(8, 10));
      dayTxt = WEEKDAY_LONG.format(new Date(dms)) + ' ' + DAY_LONG.format(new Date(dms));
      dayOk = true;
    }
    setSum(summary.day, dayTxt || 'À choisir', dayOk);
    var timeTxt = '';
    if (S.time !== null && svc) {
      timeTxt = hm(S.time) + ' – ' + hm(S.time + svc.dur);
    }
    setSum(summary.time, timeTxt || 'À choisir', !!timeTxt);
    setSum(summary.price, svc ? eur(svc.price) + ' indicatif' : ' ', !!svc);
  }

  function setStepState() {
    var ok = { 1: true, 2: !!S.svc, 3: !!S.svc && !!S.day, 4: !!S.svc && !!S.day && S.time !== null };
    stepBtns.forEach(function (b) {
      var n = +b.dataset.go;
      b.disabled = !ok[n];
      if (n === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('[data-next="2"]').disabled = !S.svc;
    $('[data-next="3"]').disabled = !S.day;
    $('[data-next="4"]').disabled = S.time === null;
  }

  var cur = 1;
  function show(n, opts) {
    opts = opts || {};
    cur = n;
    panels.forEach(function (p) {
      var on = +p.dataset.panel === n;
      p.hidden = !on;
      if (on && p.animate) p.animate(reduce.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: reduce.matches ? 200 : 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    });
    if (n === 3) renderSlots();
    setStepState();
    renderSummary();
    var h = $('.panel:not([hidden]) .panel__h');
    if (h && opts.focus !== false) h.focus();
    if (opts.scroll) $('#reserver').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    var titles = { 1: 'Étape 1 sur 4, prestation', 2: 'Étape 2 sur 4, jour', 3: 'Étape 3 sur 4, heure', 4: 'Étape 4 sur 4, coordonnées', 5: 'Demande notée, simulation' };
    say(titles[n] || '');
  }

  /* Étape 1 : prestations */
  var svcList = $('[data-svc-list]');
  function buildServices() {
    var html = '<legend class="sr">Prestations</legend>';
    SERVICES.forEach(function (s) {
      html += '<label class="svc"><input type="radio" name="svc" value="' + s.id + '"' + (S.svc === s.id ? ' checked' : '') + '>' +
        '<span class="svc__name">' + s.name + '</span><span class="svc__dur">' + durLabel(s.dur) + '</span><span class="svc__price">' + eur(s.price) + '</span></label>';
    });
    svcList.innerHTML = html;
    svcList.addEventListener('change', function (e) {
      if (e.target.name !== 'svc') return;
      S.svc = e.target.value;
      if (S.time !== null) {
        var svc = svcById(S.svc);
        var st = slotStatus(S.day, S.time, svc.dur);
        if (st !== 'free') S.time = null;
      }
      renderSummary();
      setStepState();
      say('Prestation choisie : ' + svcById(S.svc).name + '.');
    });
  }

  /* Étape 2 : jours */
  var daysEl = $('[data-days]');
  var holEl = $('[data-hol-note]');
  var DAYS = [];
  function buildDays() {
    var base = Date.UTC(NOW.y, NOW.m - 1, NOW.d);
    var html = '';
    var holNames = [];
    for (var i = 0; i < 14; i++) {
      var ms = base + i * 864e5;
      var dt = new Date(ms), dow = dt.getUTCDay(), key = keyOf(ms);
      var passed = i === 0 && NOW.min >= CLOSE;
      var closed = !isOpenDow(dow) || passed, hol = !!HOL[key] && !closed;
      DAYS.push({ key: key, closed: closed });
      if (hol) holNames.push(WEEKDAY_LONG.format(dt) + ' ' + DAY_LONG.format(dt));
      var w = WEEKDAY_SHORT.format(dt).replace('.', '');
      var sub = !isOpenDow(dow) ? 'fermé' : (passed ? 'passé' : (hol ? 'férié' : ''));
      var label = WEEKDAY_LONG.format(dt) + ' ' + DAY_LONG.format(dt) + (closed ? ', ' + sub : ', ouvert') + (hol ? ', férié, ouverture à confirmer' : '');
      html += '<button type="button" class="day" data-key="' + key + '" aria-pressed="false" aria-label="' + label + '"' + (closed ? ' disabled' : '') + '>' +
        '<span class="day__w" aria-hidden="true">' + w + '</span><span class="day__n" aria-hidden="true">' + dt.getUTCDate() + '</span>' +
        (sub ? '<span class="day__' + (closed ? 's' : 'h') + '" aria-hidden="true">' + sub + '</span>' : '') + '</button>';
    }
    daysEl.innerHTML = html;
    if (holEl) {
      holEl.hidden = !holNames.length;
      holEl.textContent = holNames.length ? 'Férié\u00a0: ' + holNames.join(' et ') + '. Ouverture à confirmer, réservable quand même.' : '';
    }
    daysEl.addEventListener('click', function (e) {
      var b = e.target.closest('.day');
      if (!b || b.disabled) return;
      S.day = b.dataset.key;
      S.time = null;
      $$('.day', daysEl).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      renderSummary();
      setStepState();
      say('Jour choisi : ' + b.getAttribute('aria-label') + '.');
    });
  }

  /* Étape 3 : heure */
  var slotsEl = $('[data-slots]');
  var dayNote = $('[data-day-note]');
  function slotStatus(key, startMin, dur) {
    var isToday = key === keyOf(Date.UTC(NOW.y, NOW.m - 1, NOW.d));
    var nowMin = parisNow().min;
    if (isToday && startMin <= nowMin) return 'past';
    if (startMin + dur > CLOSE) return 'late';
    var i0 = (startMin - OPEN) / STEP, n = Math.ceil(dur / STEP);
    for (var j = i0; j < i0 + n; j++) if (taken(key, j)) return 'taken';
    return 'free';
  }
  var STATUS_TXT = { free: 'libre', taken: 'pris', past: 'passé', late: 'trop tard pour la durée' };
  function renderSlots() {
    if (!slotsEl || !S.day) return;
    var svc = svcById(S.svc);
    var dms = Date.UTC(+S.day.slice(0, 4), +S.day.slice(5, 7) - 1, +S.day.slice(8, 10));
    var dayName = WEEKDAY_LONG.format(new Date(dms)) + ' ' + DAY_LONG.format(new Date(dms));
    var all = [];
    for (var i = 0; i < BLOCKS; i++) {
      var min = OPEN + i * STEP;
      all.push({ min: min, st: slotStatus(S.day, min, svc.dur) });
    }
    var anyFree = all.some(function (s) { return s.st === 'free'; });
    dayNote.textContent = dayName + ', pour ' + svc.name.toLowerCase() + ' (' + durLabel(svc.dur) + '). ' + (anyFree ? 'Choisissez l’heure de début.' : 'Plus de créneau libre ce jour-là pour cette durée.');
    var morning = all.filter(function (s) { return s.min < 14 * 60; });
    var afternoon = all.filter(function (s) { return s.min >= 14 * 60; });
    function col(list, title) {
      var h = '<div class="half"><p class="half__h">' + title + '</p>';
      list.forEach(function (s) {
        var st = s.st, pressed = S.time === s.min && st === 'free';
        var lbl = hm(s.min) + ', ' + STATUS_TXT[st];
        h += '<button type="button" class="slot" data-st="' + st + '" data-min="' + s.min + '" aria-pressed="' + (pressed ? 'true' : 'false') + '" aria-label="' + lbl + '"' + (st === 'free' ? '' : ' disabled') + '>' +
          '<span class="slot__t" aria-hidden="true">' + hm(s.min) + '</span><span class="slot__s" aria-hidden="true">' + STATUS_TXT[st] + '</span></button>';
      });
      return h + '</div>';
    }
    slotsEl.innerHTML = col(morning, 'Matin') + col(afternoon, 'Après-midi');
    var nextBtn = $('[data-next="4"]');
    if (S.time !== null && !all.some(function (s) { return s.min === S.time && s.st === 'free'; })) S.time = null;
    if (nextBtn) nextBtn.disabled = S.time === null;
  }
  if (slotsEl) {
    slotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.slot');
      if (!b || b.disabled) return;
      S.time = +b.dataset.min;
      $$('.slot', slotsEl).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (!reduce.matches && b.animate) {
        b.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
      }
      renderSummary();
      setStepState();
      say('Heure choisie : ' + hm(S.time) + '.');
    });
  }

  /* Étape 4 : coordonnées */
  var form = $('[data-form]');
  function fieldErr(name, msg) {
    var el = $('[data-err="' + name + '"]');
    var input = form.querySelector('[name="' + (name === 'prenom' ? 'prenom' : 'tel') + '"]');
    if (el) el.textContent = msg || '';
    if (input) {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    }
    return !msg;
  }
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.prenom.value.trim();
      var tel = form.tel.value.replace(/[\s.\-]/g, '');
      var ok1 = fieldErr('prenom', name.length < 2 ? 'Indiquez votre prénom.' : '');
      var ok2 = fieldErr('tel', /^(?:\+33|0033|0)[67]\d{8}$/.test(tel) ? '' : 'Un portable français, par exemple 06 12 34 56 78.');
      if (!ok1) form.prenom.focus();
      else if (!ok2) form.tel.focus();
      if (!ok1 || !ok2) { say('Le formulaire contient des erreurs.'); return; }
      S.name = name;
      S.tel = tel;
      S.done = true;
      renderDone();
      show(5);
    });
    form.addEventListener('input', function (e) {
      if (e.target.name === 'prenom') fieldErr('prenom', '');
      if (e.target.name === 'tel') fieldErr('tel', '');
    });
  }

  function renderDone() {
    var svc = svcById(S.svc);
    var dms = Date.UTC(+S.day.slice(0, 4), +S.day.slice(5, 7) - 1, +S.day.slice(8, 10));
    var html = '';
    html += '<div><dt>Prestation</dt><dd>' + svc.name + ', ' + durLabel(svc.dur) + '</dd></div>';
    html += '<div><dt>Jour</dt><dd>' + WEEKDAY_LONG.format(new Date(dms)) + ' ' + DAY_LONG.format(new Date(dms)) + '</dd></div>';
    html += '<div><dt>Heure</dt><dd class="tnum">' + hm(S.time) + ' – ' + hm(S.time + svc.dur) + '</dd></div>';
    html += '<div><dt>Prix</dt><dd class="tnum">' + eur(svc.price) + ' indicatif</dd></div>';
    html += '<div><dt>Au nom de</dt><dd>' + S.name.replace(/[<>&]/g, '') + '</dd></div>';
    $('[data-done]').innerHTML = '<dl style="margin:0">' + html + '</dl>';
  }

  /* Export .ics (heure de Paris convertie en UTC) */
  var icsBtn = $('[data-ics]');
  if (icsBtn) {
    icsBtn.addEventListener('click', function () {
      var svc = svcById(S.svc);
      var y = +S.day.slice(0, 4), m = +S.day.slice(5, 7), d = +S.day.slice(8, 10);
      var start = parisToUTC(y, m, d, Math.floor(S.time / 60), S.time % 60);
      var end = start + svc.dur * 60000;
      function stamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        'UID:' + stamp(start) + '-lesalonetvous@apercu.studio-lamy', 'DTSTAMP:' + stamp(Date.now()),
        'DTSTART:' + stamp(start), 'DTEND:' + stamp(end),
        'SUMMARY:' + svc.name + ' · Le Salon et Vous (aperçu)',
        'LOCATION:92 rue de Turenne\\, 75003 Paris',
        'DESCRIPTION:Aperçu non officiel. Rien n’a été envoyé au salon.',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'le-salon-et-vous.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      say('Fichier agenda téléchargé.');
    });
  }

  var resetBtn = $('[data-reset]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      S.svc = null; S.day = null; S.time = null; S.done = false;
      $$('input[name="svc"]').forEach(function (i) { i.checked = false; });
      $$('.day').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      form.reset();
      fieldErr('prenom', ''); fieldErr('tel', '');
      show(1, { scroll: false });
    });
  }

  /* Navigation par étapes */
  $$('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = +b.dataset.go;
      if (b.disabled) return;
      show(n, { scroll: false });
    });
  });
  $$('[data-next]').forEach(function (b) {
    b.addEventListener('click', function () { show(+b.dataset.next, { scroll: false }); });
  });

  /* Boutons « Choisir » de la liste de prix */
  $$('[data-pick]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.pick;
      S.svc = id;
      if (S.time !== null) S.time = null;
      var input = $('input[name="svc"][value="' + id + '"]');
      if (input) input.checked = true;
      renderSummary();
      show(2, { scroll: true });
      say('Prestation choisie : ' + svcById(id).name + '. Étape 2, le jour.');
    });
  });

  /* ---------- Menu mobile ---------- */
  var menuBtn = $('.top__menu');
  var menu = $('#menu');
  var header = $('.top');
  var inertEls = ['#main', '.foot', '[data-mbar]'].map(function (s) { return $(s); }).filter(Boolean);
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && header) menu.style.top = Math.round(header.getBoundingClientRect().bottom) + 'px';
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    inertEls.forEach(function (el) { el.inert = open; });
    if (open) { var first = $('a', menu); if (first) first.focus(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- Copier l’adresse ---------- */
  $$('[data-copy]').forEach(function (b) {
    var label = b.textContent;
    b.addEventListener('click', function () {
      var text = b.dataset.copy;
      var done = function (ok) {
        b.textContent = ok ? 'Adresse copiée' : 'Copie impossible';
        setTimeout(function () { b.textContent = label; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
  });

  /* ---------- Barre mobile ---------- */
  var mbar = $('[data-mbar]');
  var heroCta = $('[data-hero-cta]');
  var booking = $('#reserver');
  var footEl = $('.foot');
  var ticking = false;
  function mbarUpdate() {
    ticking = false;
    if (!mbar || !heroCta || !booking || !footEl) return;
    var vh = window.innerHeight;
    var ctaOut = heroCta.getBoundingClientRect().bottom < 0;
    var b = booking.getBoundingClientRect();
    var overBooking = b.top < vh * 0.7 && b.bottom > 0;
    var overFoot = footEl.getBoundingClientRect().top < vh;
    mbar.classList.toggle('is-on', ctaOut && !overBooking && !overFoot);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(mbarUpdate); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(mbarUpdate); }
  });

  /* ---------- Révélations (une seule fois) ---------- */
  var groups = new Map();
  $$('[data-reveal]').forEach(function (el) {
    var p = el.parentElement;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p).push(el);
  });
  groups.forEach(function (list) {
    list.forEach(function (el, i) { el.style.setProperty('--d', Math.min(i * 60, 480) + 'ms'); });
  });
  var wm = $('.wm');
  if (wm && !reduce.matches) requestAnimationFrame(function () { setTimeout(function () { wm.classList.add('in'); }, 60); });
  else if (wm) wm.classList.add('in');

  var targets = $$('[data-reveal]');
  if (sheet) targets.push(sheet);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('in'); });
  }

  /* ---------- La règle de la rue : repère de lecture, décoratif (v2) ---------- */
  var rail = $('[data-rail]');
  var railTrack = $('[data-rail-track]');
  var marker = $('[data-marker]');
  var railN = $('[data-rail-n]');
  var railRead = $('[data-rail-read]');
  var progress = $('[data-progress]');
  var railSecs = $$('[data-rail-label]');
  var railTicking = false;
  var railLast = '';
  var band = $('#le-salon');
  function buildRail() {
    var html = '';
    [10, 20, 30, 40, 50, 60, 70, 80, 90].forEach(function (n) {
      html += '<span class="rail__tick" style="top:' + ((n - 1) / 91 * 100).toFixed(3) + '%"><b>' + n + '</b></span>';
    });
    html += '<span class="rail__tick rail__tick--shop" style="top:100%"><b>92</b></span>';
    railTrack.insertAdjacentHTML('beforeend', html);
  }
  function railUpdate() {
    railTicking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var f = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (progress) progress.style.transform = 'translateX(' + ((f - 1) * 100).toFixed(2) + '%)';
    if (marker) marker.style.transform = 'translateY(' + (f * railTrack.clientHeight).toFixed(1) + 'px)';
    var n = String(Math.round(1 + f * 91));
    if (railN && railN.textContent !== n) railN.textContent = n;
    var label = 'Début de la rue';
    var cut = window.innerHeight * 0.4;
    railSecs.forEach(function (s) { if (s.getBoundingClientRect().top <= cut) label = s.dataset.railLabel; });
    if (band) { var bb = band.getBoundingClientRect(); rail.classList.toggle('is-ink', bb.top <= 140 && bb.bottom >= window.innerHeight - 72); }
    if (railRead && label !== railLast) { railRead.textContent = label; railLast = label; }
  }
  if (rail && railTrack) {
    buildRail();
    railUpdate();
    requestAnimationFrame(function () { rail.classList.add('on'); });
    var onRail = function () { if (!railTicking) { railTicking = true; requestAnimationFrame(railUpdate); } };
    window.addEventListener('scroll', onRail, { passive: true });
    window.addEventListener('resize', onRail);
  }

  /* ---------- Démarrage et rafraîchissement ---------- */
  /* Le planning est construit avant la première révélation : l’observateur ne voit que le conteneur. */
  buildHeroSheet(parisNow());
  updateStatus(parisNow());
  buildServices();
  buildDays();
  renderSummary();
  setStepState();
  mbarUpdate();

  setInterval(function () { var n = parisNow(); updateStatus(n); buildHeroSheet(n); }, 60000);
})();
