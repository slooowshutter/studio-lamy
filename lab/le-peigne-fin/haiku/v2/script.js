/* Le Peigne Fin · aperçu non officiel. Réservation simulée : rien n’est envoyé. */
(function () {
  'use strict';
  window.__site = true;

  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var NBSP = ' ';

  // Horaires relevés le 1er novembre 2026 (annuaire-barber.com et icoiffeur.fr, qui concordent).
  // Minutes depuis minuit, indexées par getDay() (0 = dimanche). null = fermé.
  var HOURS = { 0: null, 1: [600, 1080], 2: [540, 1140], 3: [540, 1140], 4: [570, 1140], 5: [540, 1140], 6: [540, 1050] };
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var DAYS_S = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var STEP_NAMES = { 1: 'prestation', 2: 'jour', 3: 'heure', 4: 'coordonnées', 5: 'créneau noté' };
  var SLOT = 30;
  // Axe du registre des heures : de 9 h à 19 h, en minutes depuis minuit.
  var AXIS = [540, 1140];
  var ADDRESS = '117 route du Polygone, 67000 Strasbourg';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtT(m) {
    var h = Math.floor(m / 60), mm = m % 60;
    return h + NBSP + 'h' + (mm ? NBSP + pad(mm) : '');
  }
  function dayLabel(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  // Jours fériés : nationaux, Alsace-Moselle (vendredi saint, 26 décembre), lundi de Pâques, Ascension, lundi de Pentecôte.
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function holidays(y) {
    var set = {};
    [[1, 1], [5, 1], [5, 8], [7, 14], [8, 15], [11, 1], [11, 11], [12, 25], [12, 26]].forEach(function (f) {
      set[y + '-' + pad(f[0]) + '-' + pad(f[1])] = true;
    });
    var e = easter(y);
    [-2, 1, 39, 50].forEach(function (n) {
      set[key(new Date(e.getFullYear(), e.getMonth(), e.getDate() + n))] = true;
    });
    return set;
  }

  // Une réservation « déjà prise » est déterministe : même jour, même heure, même résultat.
  function isTaken(k, m) {
    var s = k + '|' + m, h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return Math.abs(h) % 7 < 2;
  }

  // Heure de Paris, indépendamment du fuseau de l’appareil.
  function parisNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday),
      min: (+o.hour) * 60 + (+o.minute)
    };
  }

  // Parties de l’heure de Paris pour un instant donné (les horaires du salon sont à Paris).
  function parisParts(ms) {
    var o = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = +p.value; });
    return o;
  }
  // Décalage de Paris en minutes : +60 l’hiver, +120 l’été.
  function parisOffset(ms) {
    var o = parisParts(ms);
    return Math.round((Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute) - ms) / 60000);
  }
  // Un mur de Paris, écrit en UTC, devient l’instant réel.
  function parisInstant(wall) { return wall - parisOffset(wall) * 60000; }
  // Aujourd’hui et l’heure qu’il est à Paris, en Date locale : sert à griser les jours et les créneaux passés.
  function parisDate() {
    var o = parisParts(Date.now());
    return new Date(o.year, o.month - 1, o.day, o.hour, o.minute);
  }

  // ----- statut « ouvert / fermé » -----
  function liveStatus() {
    var n = parisNow(), h = HOURS[n.day];
    if (h && n.min >= h[0] && n.min < h[1]) {
      return { open: true, text: 'Ouvert maintenant, jusqu’à ' + fmtT(h[1]) };
    }
    if (h && n.min < h[0]) {
      return { open: false, text: 'Fermé pour l’instant, ouvre aujourd’hui à ' + fmtT(h[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var d = (n.day + i) % 7, nh = HOURS[d];
      if (nh) {
        return { open: false, text: 'Fermé, ouvre ' + (i === 1 ? 'demain' : DAYS[d]) + ' à ' + fmtT(nh[0]) };
      }
    }
    return { open: false, text: 'Fermé pour l’instant' };
  }
  function renderLive() {
    var el = $('#live-status'), s = liveStatus();
    el.textContent = s.text;
    el.setAttribute('data-state', s.open ? 'open' : 'closed');
  }

  // ----- registre des heures : ligne du jour et trait de l’heure qu’il est -----
  function markToday() {
    var n = parisNow();
    $$('.tt__row[data-day]').forEach(function (li) {
      li.classList.toggle('is-today', +li.getAttribute('data-day') === n.day);
    });
    placeNow();
  }
  // Le trait écaille suit l’heure de Paris, uniquement quand le salon est ouvert.
  function placeNow() {
    var mark = $('.tt__now'), row = $('.tt__row.is-today');
    if (!mark || !row) { return; }
    var n = parisNow(), h = HOURS[n.day];
    var open = !!h && n.min >= h[0] && n.min < h[1];
    mark.hidden = !open;
    if (open) {
      $('.tt__track', row).appendChild(mark);
      mark.style.left = ((n.min - AXIS[0]) / (AXIS[1] - AXIS[0]) * 100) + '%';
    }
  }

  // ----- réservation -----
  var panels = $$('.panel');
  var st = { svc: null, day: null, time: null, first: '', max: 1 };

  function panelFor(n) { return $('.panel[data-step="' + n + '"]'); }

  // Une étape ne s’ouvre que si la précédente est complète (st.max = étape la plus avancée).
  function syncSteps() {
    $$('.steps__btn').forEach(function (b) {
      b.disabled = +b.getAttribute('data-goto') > st.max;
    });
  }

  function showStep(n, focus) {
    if (n === 4) { buildRows($('#recap'), recapRows()); }
    panels.forEach(function (p) {
      var on = +p.getAttribute('data-step') === n;
      if (on) {
        p.hidden = false;
        requestAnimationFrame(function () { p.classList.add('is-on'); });
      } else {
        p.classList.remove('is-on');
        p.hidden = true;
      }
    });
    $$('.steps__btn').forEach(function (b) {
      var k = +b.getAttribute('data-goto');
      if (k === n) { b.setAttribute('aria-current', 'step'); } else { b.removeAttribute('aria-current'); }
    });
    syncSteps();
    $('#live').textContent = n < 5
      ? 'Étape ' + n + ' sur 4' + NBSP + ': ' + STEP_NAMES[n] + '.'
      : 'Créneau noté. Simulation, rien n’a été envoyé.';
    if (focus !== false) {
      var h = $('.panel__h', panelFor(n)) || $('.ticket__h');
      if (h) { h.focus(); }
    }
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function setF(name, text, filled) {
    var dd = $('[data-f="' + name + '"]');
    var wasFilled = dd.hasAttribute('data-filled');
    dd.textContent = text;
    if (filled) { dd.setAttribute('data-filled', ''); } else { dd.removeAttribute('data-filled'); }
    // La fiche se remplit d’un trait, une fois par champ (transform/clip-path seulement).
    if (filled && !wasFilled && !reduceMotion.matches && dd.animate) {
      dd.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }
  function renderFiche() {
    setF('svc', st.svc || 'à choisir', !!st.svc);
    setF('day', st.day ? dayLabel(parseKey(st.day)) : 'à choisir', !!st.day);
    setF('time', st.time !== null ? fmtT(st.time) : 'à choisir', st.time !== null);
  }

  function recapRows() {
    return [
      ['Prestation', st.svc],
      ['Jour', dayLabel(parseKey(st.day))],
      ['Heure', fmtT(st.time)],
      ['Prix', 'à confirmer avec le salon']
    ];
  }
  function buildRows(list, rows) {
    list.innerHTML = '';
    rows.forEach(function (r) {
      var wrap = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      wrap.appendChild(dt); wrap.appendChild(dd);
      list.appendChild(wrap);
    });
  }

  function buildDays() {
    var box = $('#days');
    box.innerHTML = '';
    var now = parisDate();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var hol = holidays(today.getFullYear()), hol2 = holidays(today.getFullYear() + 1);
    for (var i = 0; i < 14; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var k = key(d), h = HOURS[d.getDay()];
      var closed = !h, isHol = !closed && !!(hol[k] || hol2[k]);
      // Aujourd’hui n’est plus proposé quand il ne reste aucun créneau.
      var passed = i === 0 && !closed && nowMin + 15 > h[1] - SLOT;
      var off = closed || passed;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day' + (off ? ' day--closed' : '') + (isHol ? ' day--holiday' : '');
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('data-key', k);
      b.disabled = off;
      var label = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
      b.setAttribute('aria-label', label + (closed ? ', fermé' : passed ? ', passé' : isHol ? ', férié, ouverture à confirmer' : ''));
      var w = document.createElement('span'); w.className = 'day__w'; w.textContent = DAYS_S[d.getDay()];
      var dn = document.createElement('span'); dn.className = 'day__d'; dn.textContent = d.getDate();
      var s = document.createElement('span'); s.className = 'day__s';
      s.textContent = closed ? 'fermé' : passed ? 'passé' : isHol ? 'férié' : '';
      b.appendChild(w); b.appendChild(dn); b.appendChild(s);
      box.appendChild(b);
    }
  }

  function buildSlots() {
    var box = $('#slots');
    box.innerHTML = '';
    if (!st.day) { return; }
    var d = parseKey(st.day), h = HOURS[d.getDay()];
    var now = parisDate(), isToday = key(now) === st.day, nowMin = now.getHours() * 60 + now.getMinutes();
    for (var m = h[0]; m + SLOT <= h[1]; m += SLOT) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot';
      b.textContent = fmtT(m);
      b.setAttribute('data-min', m);
      b.setAttribute('aria-pressed', 'false');
      var past = isToday && m < nowMin + 15, taken = isTaken(st.day, m);
      if (past || taken) {
        b.disabled = true;
        b.setAttribute('aria-label', fmtT(m) + (taken ? ', déjà pris' : ', passé'));
      }
      box.appendChild(b);
    }
  }

  function setErr(input, msg, text) {
    msg.textContent = text;
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function init() {
    var stepBtn = function (n) { return $('[data-next="' + n + '"]'); };

    // Étape 1 : prestation
    $$('input[name="svc"]').forEach(function (r) {
      r.addEventListener('change', function () {
        st.svc = r.value;
        $$('.opt').forEach(function (o) { o.classList.toggle('is-checked', o.querySelector('input').checked); });
        stepBtn(2).disabled = false;
        renderFiche();
      });
    });

    // Étape 2 : jour
    $('#days').addEventListener('click', function (e) {
      var b = e.target.closest('.day');
      if (!b || b.disabled) { return; }
      st.day = b.getAttribute('data-key');
      st.time = null;
      $$('.day').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      buildSlots();
      // Changer de jour invalide l’heure choisie : les étapes 3 et 4 se referment.
      st.max = Math.min(st.max, 3);
      stepBtn(3).disabled = false;
      stepBtn(4).disabled = true;
      syncSteps();
      renderFiche();
    });

    // Étape 3 : heure
    $('#slots').addEventListener('click', function (e) {
      var b = e.target.closest('.slot');
      if (!b || b.disabled) { return; }
      st.time = +b.getAttribute('data-min');
      $$('.slot').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      stepBtn(4).disabled = false;
      renderFiche();
    });

    // Navigation
    $$('[data-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-next');
        st.max = Math.max(st.max, n);
        showStep(n);
      });
    });
    $$('[data-back]').forEach(function (b) {
      b.addEventListener('click', function () { showStep(+b.getAttribute('data-back')); });
    });
    $$('.steps__btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-goto');
        if (n <= st.max) { showStep(n); }
      });
    });

    // Étape 4 : coordonnées
    var form = $('#book-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), tel = $('#f-tel');
      var okName = /^[\p{L}' -]{2,40}$/u.test(name.value.trim());
      var okTel = /^(?:\+33|0033|0)\s?[67](?:[\s.-]?\d{2}){4}$/.test(tel.value.trim());
      setErr(name, $('#e-name'), okName ? '' : 'Indiquez votre prénom, deux lettres au moins.');
      setErr(tel, $('#e-tel'), okTel ? '' : 'Un mobile français, par exemple 06 12 34 56 78.');
      if (!okName || !okTel) { (okName ? tel : name).focus(); return; }
      st.first = name.value.trim();
      buildRows($('#ticket-list'), recapRows().concat([['Au nom de', st.first]]));
      st.max = 5;
      showStep(5);
    });

    // Copier l’adresse
    $('#copy').addEventListener('click', function () {
      var s = $('#copy-s');
      var ko = 'Copie impossible sur cet appareil. L’adresse est juste au-dessus.';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(ADDRESS).then(
          function () { s.textContent = 'Adresse copiée.'; },
          function () { s.textContent = ko; }
        );
      } else {
        s.textContent = ko;
      }
    });

    // Recommencer
    $('[data-restart]').addEventListener('click', function () {
      st.svc = null; st.day = null; st.time = null; st.first = ''; st.max = 1;
      $$('input[name="svc"]').forEach(function (r) { r.checked = false; });
      $$('.opt').forEach(function (o) { o.classList.remove('is-checked'); });
      stepBtn(2).disabled = true; stepBtn(3).disabled = true; stepBtn(4).disabled = true;
      $('#f-name').value = ''; $('#f-tel').value = '';
      setErr($('#f-name'), $('#e-name'), ''); setErr($('#f-tel'), $('#e-tel'), '');
      buildDays(); $('#slots').innerHTML = '';
      renderFiche();
      showStep(1);
    });

    // Export .ics (généré dans le navigateur, rien n’est envoyé)
    $('#ics').addEventListener('click', function () {
      var d = parseKey(st.day);
      // L’heure de Paris est écrite en UTC : l’agenda affiche la bonne heure, où que se trouve la personne.
      var wall = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(st.time / 60), st.time % 60);
      var start = parisInstant(wall), end = start + SLOT * 60000;
      var fmt = function (ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
      var ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Le Peigne Fin//FR', 'BEGIN:VEVENT',
        'UID:' + Date.now() + '@apercu-le-peigne-fin', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
        'DTSTART:' + fmt(start), 'DTEND:' + fmt(end),
        'SUMMARY:Le Peigne Fin : ' + st.svc.toLowerCase() + ' (simulation)',
        'LOCATION:117 route du Polygone\\, 67000 Strasbourg',
        'DESCRIPTION:Simulation. Rien n’est envoyé au salon.',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'le-peigne-fin-simulation.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });

    buildDays();
    renderFiche();
    showStep(1, false);
  }

  // ----- menu mobile -----
  function initMenu() {
    var btn = $('.top__menu'), menu = $('#menu');
    var label = $('.top__menu-label', btn);
    var header = $('.top');
    // Pendant que le menu est ouvert, le reste de la page ne reçoit plus le focus.
    var behind = [$('main'), $('.foot'), $('#dock')];
    function setMenu(open, focus) {
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      behind.forEach(function (el) { el.inert = open; });
      label.textContent = open ? 'Fermer' : 'Menu';
      // Le panneau commence sous l’en-tête, qui peut être décalé par la bande d’aperçu.
      menu.style.top = open ? Math.round(header.getBoundingClientRect().bottom) + 'px' : '';
      document.body.style.overflow = open ? 'hidden' : '';
      if (open && focus !== false) { $('a', menu).focus(); }
      if (!open && focus !== false) { btn.focus(); }
    }
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { setMenu(false, false); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setMenu(false); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (m) {
      if (m.matches) { setMenu(false, false); }
    });
  }

  // ----- barre mobile « Appeler / Réserver » -----
  function initDock() {
    var dock = $('#dock'), book = $('#reserver'), foot = $('.foot');
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var b = book.getBoundingClientRect();
      var inBook = b.top < vh * 0.6 && b.bottom > 0;
      var inFoot = foot.getBoundingClientRect().top < vh;
      dock.classList.toggle('is-on', !inBook && !inFoot);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ----- révélations : une fois, au défilement -----
  function initReveal() {
    var targets = $$('.tt, .ledger, .reg, .bento, .plan');
    $$('.ledger__row').forEach(function (r, i) { r.style.setProperty('--d', (i * 70) + 'ms'); });
    $$('.reg li').forEach(function (r, i) { r.style.setProperty('--d', (i * 60) + 'ms'); });
    $$('.cell').forEach(function (r, i) { r.style.setProperty('--d', (i * 80) + 'ms'); });
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (t) { t.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    targets.forEach(function (t) { io.observe(t); });
  }

  function start() {
    markToday();
    renderLive();
    setInterval(function () { markToday(); renderLive(); }, 60000);
    init();
    initMenu();
    initDock();
    initReveal();
    // Le titre de l’accueil se joue une fois le premier rendu fait.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { doc.classList.add('is-ready'); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
