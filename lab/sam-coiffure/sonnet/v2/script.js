/* Sam Coiffure · aperçu non officiel · v2 « La planche » · rien n’est envoyé nulle part */
(function () {
  'use strict';
  window.__site = true;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NB = ' ';
  var EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

  /* ------------------------------------------------------------------ */
  /* Données : horaires relevés sur icoiffeur.fr le 01/11/2026 (à confirmer) */
  /* minutes depuis minuit ; 0 = dimanche */
  var HOURS = {
    1: [[540, 1110]], 2: [[540, 1110]], 3: [[540, 1110]], 4: [[540, 1110]],
    5: [[510, 750], [870, 1110]],
    6: [[510, 1110]],
    0: []
  };
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var DAYS_S = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var STEP_MIN = 30;

  /* ------------------------------------------------------------------ */
  /* Heure de Paris, jours fériés (dont ceux propres à l’Alsace-Moselle)  */
  var fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23'
  });
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function parisNow() {
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, dow: new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay() };
  }
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
      f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mo - 1, da));
  }
  var ferieCache = {};
  function feries(y) {
    if (ferieCache[y]) return ferieCache[y];
    var e = easter(y), set = {};
    function add(dt) { set[dt.getUTCMonth() + 1 + '-' + dt.getUTCDate()] = 1; }
    function plus(n) { return new Date(e.getTime() + n * 864e5); }
    ['1-1', '1-5', '8-5', '14-7', '15-8', '1-11', '11-11', '25-12'].forEach(function (k) {
      var q = k.split('-'); set[+q[1] + '-' + +q[0]] = 1;
    });
    add(plus(1)); add(plus(39)); add(plus(50));
    add(plus(-2));            /* Vendredi saint : férié en Alsace-Moselle */
    set['12-26'] = 1;         /* 26 décembre : férié en Alsace-Moselle */
    return (ferieCache[y] = set);
  }
  function isFerie(y, m, d) { return !!feries(y)[m + '-' + d]; }

  function hm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return h + NB + 'h' + (m ? NB + (m < 10 ? '0' : '') + m : '');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function fromNow(now, plusDays) { return new Date(Date.UTC(now.y, now.m - 1, now.d + plusDays)); }
  function longDate(dt) { return DAYS[dt.getUTCDay()] + ' ' + (dt.getUTCDate() === 1 ? '1er' : dt.getUTCDate()) + ' ' + MONTHS[dt.getUTCMonth()]; }

  /* ------------------------------------------------------------------ */
  /* Statut en direct (héros)                                            */
  function nextOpening(now) {
    for (var i = 1; i <= 7; i++) {
      var dt = fromNow(now, i), iv = HOURS[dt.getUTCDay()];
      if (iv && iv.length) {
        var label = i === 1 ? 'demain' : DAYS[dt.getUTCDay()];
        return { label: label, at: iv[0][0], ferie: isFerie(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) };
      }
    }
    return null;
  }
  function computeStatus(now) {
    var t = now.h * 60 + now.min, iv = HOURS[now.dow] || [], i, nx;
    if (!iv.length) {
      nx = nextOpening(now);
      return { open: false, short: 'Fermé · rouvre ' + nx.label + ', ' + hm(nx.at) + (nx.ferie ? ' (férié ?)' : '') };
    }
    if (isFerie(now.y, now.m, now.d)) {
      return { open: false, short: 'Jour férié · ouverture à confirmer' };
    }
    for (i = 0; i < iv.length; i++) {
      if (t >= iv[i][0] && t < iv[i][1]) {
        var left = iv[i][1] - t;
        if (left <= 45) return { open: true, short: 'Ouvert · ferme dans ' + left + NB + 'min' };
        return { open: true, short: 'Ouvert · jusqu’à ' + hm(iv[i][1]) };
      }
    }
    for (i = 0; i < iv.length; i++) {
      if (t < iv[i][0]) {
        var pause = i > 0;
        return { open: false, short: (pause ? 'Pause de midi · rouvre à ' : 'Fermé · ouvre à ') + hm(iv[i][0]) };
      }
    }
    nx = nextOpening(now);
    return { open: false, short: 'Fermé · rouvre ' + nx.label + ', ' + hm(nx.at) + (nx.ferie ? ' (férié ?)' : '') };
  }
  function paintStatus() {
    var now = parisNow(), s = computeStatus(now);
    var box = $('[data-status]'), clock = $('[data-clock]'), short = $('[data-status-short]');
    if (clock) clock.textContent = pad(now.h) + ':' + pad(now.min);
    if (short) short.textContent = s.short;
    if (box) box.classList.toggle('is-closed', !s.open);
    $$('.week tr,.week2__row').forEach(function (tr) {
      var on = +tr.getAttribute('data-dow') === now.dow;
      tr.classList.toggle('is-today', on);
      if (tr.tagName === 'TR') { if (on) tr.setAttribute('aria-current', 'date'); else tr.removeAttribute('aria-current'); }
    });
    var mark = $('[data-now]'), m = now.h * 60 + now.min;
    if (mark) {
      var inRange = m >= 480 && m <= 1140;
      mark.classList.toggle('is-on', inRange);
      if (inRange) mark.style.setProperty('--now', ((m - 480) / 660 * 100).toFixed(2));
    }
  }
  paintStatus();
  setInterval(function () { if (!document.hidden) paintStatus(); }, 15000);

  /* ------------------------------------------------------------------ */
  /* Entrée : le nom s’écrit, l’écran glisse puis raconte sa petite histoire */
  var hero = $('.hero');
  if (hero) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-in'); }); });
  }

  /* Cellules et figures : une seule fois, décalage selon la place dans la bande */
  var tiles = $$('.band:not(.hero) .tile');
  tiles.forEach(function (t) {
    var sib = $$(':scope > .tile', t.parentNode), idx = sib.indexOf(t);
    t.style.setProperty('--i', Math.min(Math.max(idx, 0), 5));
  });
  var revealEls = tiles.concat($$('[data-reveal]:not(.tile)'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------------ */
  /* L’écran du héros : choisir un jour, une heure, garder l’heure       */
  var shotTile = $('.t-shot');
  if (shotTile) {
    var nowS = parisNow(), dayBox = $('[data-shot-days]', shotTile), slotBox = $('[data-shot-slots]', shotTile);
    var target = -1, i0, dtS;
    function isOpenDay(dt) { return !!(HOURS[dt.getUTCDay()] && HOURS[dt.getUTCDay()].length); }
    for (i0 = 1; i0 < 8 && target < 0; i0++) {
      dtS = fromNow(nowS, i0);
      if (isOpenDay(dtS) && !isFerie(dtS.getUTCFullYear(), dtS.getUTCMonth() + 1, dtS.getUTCDate())) target = i0;
    }
    if (target < 0) target = 1;
    /* trois jours autour de la cible : la veille, le jour choisi, le lendemain */
    for (i0 = target - 1; i0 <= target + 1; i0++) {
      dtS = fromNow(nowS, i0);
      var chip = document.createElement('span');
      chip.className = 'sd' + (isOpenDay(dtS) ? '' : ' is-closed') + (i0 === target ? ' is-target' : '');
      chip.innerHTML = '<span class="sd__w">' + DAYS_S[dtS.getUTCDay()] + '</span><span class="sd__d">' + dtS.getUTCDate() + '</span>';
      dayBox.appendChild(chip);
    }
    [600, 630, 660].forEach(function (m) {
      var sl = document.createElement('span');
      sl.className = 'ss' + (m === 660 ? ' is-taken' : '') + (m === 630 ? ' is-target' : '');
      sl.textContent = hm(m);
      slotBox.appendChild(sl);
    });
    for (i0 = 0; i0 < 3; i0++) {
      var ph = document.createElement('span');
      ph.className = 'ss ss--ph';
      ph.innerHTML = '<i></i>';
      slotBox.appendChild(ph);
    }
    var tdt = fromNow(nowS, target);
    $('[data-shot-msg]', shotTile).textContent = longDate(tdt) + ' · ' + hm(630);
    var played = false;
    var play = function () {
      if (played) return; played = true;
      var steps = [['s-day', 900], ['s-slot', 1500], ['s-press', 2100], ['s-done', 2300], ['s-note', 2700]];
      steps.forEach(function (st) {
        if (reduce) shotTile.classList.add(st[0]);
        else setTimeout(function () { shotTile.classList.add(st[0]); }, st[1]);
      });
      if (!reduce) setTimeout(function () { shotTile.classList.remove('s-press'); }, 2300);
      else shotTile.classList.remove('s-press');
    };
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { play(); io2.disconnect(); } }, { threshold: 0.35 });
      io2.observe(shotTile);
    } else play();
  }

  /* ------------------------------------------------------------------ */
  /* Menu mobile                                                         */
  var menuBtn = $('.top__menu'), menu = $('#menu');
  var inertTargets = [$('main'), $('.foot'), $('.bar'), $('.apercu'), $('.strip')];
  function setInert(on) { inertTargets.forEach(function (el) { if (el) { if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }); }
  function openMenu() {
    var head = $('.top');
    menu.style.top = (head ? Math.max(0, head.getBoundingClientRect().bottom) : 60) + 'px';
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.querySelector('.top__menu-label').textContent = 'Fermer';
    setInert(true);
    document.documentElement.style.overflow = 'hidden';
    var first = $('a', menu); if (first) first.focus({ preventScroll: true });
  }
  function closeMenu(returnFocus) {
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.querySelector('.top__menu-label').textContent = 'Menu';
    setInert(false);
    document.documentElement.style.overflow = '';
    setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    if (returnFocus) menuBtn.focus({ preventScroll: true });
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      if (menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(true); else openMenu();
    });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960 && menuBtn.getAttribute('aria-expanded') === 'true') closeMenu(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Barre mobile : visible une fois les boutons du héros passés, cachée */
  /* sur le module de réservation et le pied de page                     */
  var bar = $('[data-bar]');
  if (bar && 'IntersectionObserver' in window) {
    var vis = { hero: true, book: false, foot: false };
    var sync = function () { bar.classList.toggle('is-on', !vis.hero && !vis.book && !vis.foot); };
    var watch = function (el, key) {
      if (!el) return;
      new IntersectionObserver(function (es) { vis[key] = es[0].isIntersecting; sync(); }).observe(el);
    };
    watch($('.cta') || $('.hero'), 'hero'); watch($('#garder'), 'book'); watch($('#foot'), 'foot');
  }

  /* ------------------------------------------------------------------ */
  /* Questions : la réponse apparaît en douceur (transition WAAPI)       */
  $$('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      var a = $('.faq__a', d);
      if (!d.open || !a || !a.animate) return;
      a.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 150 : 220, easing: EASE });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Copier l’adresse                                                    */
  $$('[data-copy]').forEach(function (btn) {
    var old = btn.textContent, timer = null;
    btn.addEventListener('click', function () {
      var txt = btn.getAttribute('data-copy'), live = $('[data-copy-live]');
      var done = function () {
        btn.textContent = 'Adresse copiée';
        if (live) live.textContent = 'Adresse copiée dans le presse-papiers.';
        clearTimeout(timer);
        timer = setTimeout(function () { btn.textContent = old; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
      } else fallbackCopy(txt, done);
    });
  });
  function fallbackCopy(txt, cb) {
    var ta = document.createElement('textarea');
    ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-100px;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { /* rien */ }
    document.body.removeChild(ta);
  }

  /* ------------------------------------------------------------------ */
  /* Réservation simulée : garder une heure                              */
  var form = $('#book-form');
  if (!form) return;
  form.hidden = false;
  $$('.nojs').forEach(function (el) { el.hidden = true; });

  var SERVICES = $$('.row[data-id]').map(function (li) {
    return { id: li.getAttribute('data-id'), name: li.getAttribute('data-name'), min: +li.getAttribute('data-min'), price: +li.getAttribute('data-price') };
  });
  var state = { step: 1, max: 1, service: null, day: null, time: null };
  var live = $('[data-live]');
  var panels = $$('.panel', form);
  var stepBtns = $$('.steps__b', form);
  var servicesBox = $('[data-services]', form), daysBox = $('[data-days]', form), slotsBox = $('[data-slots]', form);
  var now0 = parisNow();

  function announce(msg) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); } }
  function svcById(id) { return SERVICES.filter(function (s) { return s.id === id; })[0] || null; }
  function euro(n) { return n + NB + '€'; }

  /* le fil de la plaque : chaque choix s’y grave */
  function fill(key, text) {
    var el = $('[data-fill="' + key + '"]'), sr = $('[data-fill-sr="' + key + '"]');
    if (!el) return;
    var prev = el.textContent;
    el.textContent = text;
    if (sr) sr.hidden = !!text;
    if (el._anim) { el._anim.cancel(); el._anim = null; }
    if (text && text !== prev && !reduce && el.animate) {
      el._anim = el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 280, easing: EASE });
    }
  }

  /* 1 · prestations */
  SERVICES.forEach(function (s) {
    var lab = document.createElement('label');
    lab.className = 'opt';
    lab.innerHTML = '<input type="radio" name="service" value="' + s.id + '"><span class="opt__r" aria-hidden="true"></span>' +
      '<span class="opt__t"><span class="opt__n">' + s.name + '</span><span class="opt__d">' + s.min + NB + 'min</span></span>' +
      '<span class="opt__p">' + euro(s.price) + '</span>';
    servicesBox.appendChild(lab);
  });
  servicesBox.addEventListener('change', function (e) {
    if (e.target.name !== 'service') return;
    setService(e.target.value);
  });
  function setService(id, fromMenu) {
    var s = svcById(id);
    if (!s) return;
    var changed = !state.service || state.service.id !== s.id;
    state.service = s;
    var r = $('input[name="service"][value="' + id + '"]', servicesBox); if (r) r.checked = true;
    fill('service', s.name);
    fill('price', euro(s.price) + ' (indicatif)');
    if (changed) { state.time = null; fill('time', ''); state.max = Math.min(state.max, state.day ? 3 : 2); renderSlots(); syncSteps(); }
    hide('err-1');
    var pick = $('[data-pick]', form);
    if (pick) {
      pick.hidden = !fromMenu;
      if (fromMenu) pick.textContent = 'Prestation choisie depuis la carte' + NB + ': ' + s.name + ', ' + s.min + NB + 'min, ' + euro(s.price) + ' (indicatif).';
    }
  }

  /* 2 · jours : deux semaines, dimanche fermé, fériés signalés */
  for (var i = 0; i < 14; i++) {
    (function (i) {
      var dt = fromNow(now0, i), dow = dt.getUTCDay(), closed = !(HOURS[dow] && HOURS[dow].length);
      var ferie = isFerie(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      var key = dateKey(dt);
      var lab = document.createElement('label');
      lab.className = 'day' + (closed ? ' is-closed' : '') + (ferie && !closed ? ' is-ferie' : '');
      lab.innerHTML = '<input type="radio" name="day" value="' + key + '"' + (closed ? ' disabled' : '') + '>' +
        '<span class="day__w">' + DAYS_S[dow] + '</span><span class="day__d">' + dt.getUTCDate() + '</span>' +
        '<span class="day__m">' + MONTHS_S[dt.getUTCMonth()] + '</span>' +
        (closed ? '<span class="day__x">fermé</span>' : (ferie ? '<span class="day__x" aria-hidden="true">férié&nbsp;?</span><span class="sr-only">jour férié, ouverture à confirmer</span>' : '')) +
        (closed ? '<span class="sr-only">' + longDate(dt) + ', fermé</span>' : '');
      lab._dt = dt;
      daysBox.appendChild(lab);
    })(i);
  }
  daysBox.addEventListener('change', function (e) {
    if (e.target.name !== 'day') return;
    var dt = e.target.closest('.day')._dt;
    state.day = dt; state.time = null; state.max = Math.min(state.max, 3);
    fill('day', longDate(dt)); fill('time', '');
    renderSlots(); syncSteps(); hide('err-2');
  });

  /* 3 · heures : créneaux de 30 min qui tiennent dans la durée, "déjà pris" déterministes */
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function renderSlots() {
    slotsBox.innerHTML = '';
    var note = $('[data-slots-note]', form);
    if (!state.day || !state.service) { if (note) note.textContent = 'Choisissez d’abord une prestation et un jour.'; return; }
    var dow = state.day.getUTCDay(), iv = HOURS[dow] || [], dur = state.service.min;
    var key = dateKey(state.day), isToday = key === dateKey(fromNow(now0, 0));
    var nowMin = parisNow(); nowMin = nowMin.h * 60 + nowMin.min;
    var free = 0, total = 0, list = [];
    iv.forEach(function (range, idx) {
      for (var t = range[0]; t + dur <= range[1]; t += STEP_MIN) {
        var past = isToday && t <= nowMin + 15;
        var taken = !past && hash(key + '|' + t + '|' + state.service.id.length) % 100 < 28;
        list.push({ t: t, past: past, taken: taken, rng: idx });
      }
    });
    list.forEach(function (s) { total++; if (!s.past && !s.taken) free++; });
    if (free < 2) { var n = 0; list.forEach(function (s) { if (!s.past && s.taken && n < 2 - free) { s.taken = false; n++; } }); }
    var lastRng = -1;
    list.forEach(function (s) {
      if (lastRng !== -1 && s.rng !== lastRng) {
        var gap = document.createElement('span');
        gap.className = 'slot is-gap';
        gap.textContent = 'Pause de midi, ' + hm(iv[0][1]) + ' – ' + hm(iv[1][0]) + '.';
        slotsBox.appendChild(gap);
      }
      lastRng = s.rng;
      var lab = document.createElement('label');
      var off = s.past || s.taken;
      lab.className = 'slot' + (off ? ' is-taken' : '');
      lab.innerHTML = '<input type="radio" name="time" value="' + s.t + '"' + (off ? ' disabled' : '') + (!off && s.t === state.time ? ' checked' : '') + '>' + hm(s.t) +
        (off ? '<span class="sr-only">' + (s.past ? ', passé' : ', déjà pris') + '</span>' : '');
      slotsBox.appendChild(lab);
    });
    if (note) {
      var fin = state.service.min + NB + 'min';
      note.textContent = list.length ? 'Créneaux toutes les 30' + NB + 'minutes pour ' + state.service.name.toLowerCase() + ' (' + fin + '). Barrés' + NB + ': déjà pris ou passés.' : 'Aucun créneau ne tient ce jour-là pour cette prestation.';
      if (isToday && !free && list.length) note.textContent = 'Plus de créneau aujourd’hui. Essayez un autre jour.';
    }
  }
  slotsBox.addEventListener('change', function (e) {
    if (e.target.name !== 'time') return;
    state.time = +e.target.value;
    fill('time', hm(state.time)); hide('err-3');
  });

  /* navigation entre étapes */
  function show(id) { var el = document.getElementById(id); if (el) el.hidden = false; }
  function hide(id) { var el = document.getElementById(id); if (el) el.hidden = true; }
  function syncSteps() {
    stepBtns.forEach(function (b, idx) {
      var k = idx + 1;
      b.disabled = k > state.max || state.step === 5;
      b.classList.toggle('is-done', state.step === 5);
      if (k === state.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }
  function goStep(n, opts) {
    opts = opts || {};
    if (n === 4 && state.time == null) n = 3;
    state.step = n; if (n <= 4) state.max = Math.max(state.max, n);
    panels.forEach(function (p) {
      var on = +p.getAttribute('data-step') === n;
      p.hidden = !on;
      if (on && !opts.silent && p.animate) {
        if (p._a) p._a.cancel();
        p._a = p.animate(reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 150 : 240, easing: EASE });
      }
    });
    syncSteps();
    var p = panels.filter(function (x) { return +x.getAttribute('data-step') === n; })[0];
    var h = p && $('.panel__t', p);
    if (h && opts.focus !== false) h.focus({ preventScroll: opts.noScroll });
    var titles = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'l’heure est gardée, en simulation' };
    announce(n === 5 ? 'Simulation terminée' + NB + ': ' + titles[5] + '.' : 'Étape ' + n + ' sur 4' + NB + ': ' + titles[n] + '.');
    if (n === 3) renderSlots();
    if (n === 4) renderRecap();
  }
  form.addEventListener('click', function (e) {
    var t = e.target.closest('[data-next],[data-prev],[data-goto],[data-restart],[data-ics]');
    if (!t) return;
    if (t.hasAttribute('data-next')) next();
    else if (t.hasAttribute('data-prev')) goStep(state.step - 1);
    else if (t.hasAttribute('data-goto')) { if (!t.disabled) goStep(+t.getAttribute('data-goto')); }
    else if (t.hasAttribute('data-restart')) restart();
    else if (t.hasAttribute('data-ics')) downloadIcs();
  });
  function flag(id, msg) { var el = document.getElementById(id); if (el) { if (msg) el.textContent = msg; el.hidden = false; } }
  function next() {
    if (state.step === 1) { if (!state.service) return flag('err-1'); goStep(2); }
    else if (state.step === 2) { if (!state.day) return flag('err-2'); goStep(3); }
    else if (state.step === 3) { if (state.time == null) return flag('err-3'); goStep(4); }
  }

  /* 4 · coordonnées */
  function normTel(v) { return v.replace(/[\s.\-()]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0'); }
  function telOk(v) { return /^0[67]\d{8}$/.test(normTel(v)); }
  var nameIn = $('#f-name'), telIn = $('#f-tel');
  function check(input, ok, errId) {
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    document.getElementById(errId).hidden = ok;
    return ok;
  }
  nameIn.addEventListener('blur', function () { if (nameIn.value) check(nameIn, nameIn.value.trim().length >= 2, 'e-name'); });
  telIn.addEventListener('blur', function () { if (telIn.value) check(telIn, telOk(telIn.value), 'e-tel'); });
  nameIn.addEventListener('input', function () { if (nameIn.getAttribute('aria-invalid') === 'true') check(nameIn, nameIn.value.trim().length >= 2, 'e-name'); });
  telIn.addEventListener('input', function () { if (telIn.getAttribute('aria-invalid') === 'true') check(telIn, telOk(telIn.value), 'e-tel'); });

  function whenText() { return longDate(state.day) + ' à ' + hm(state.time); }
  function renderRecap() {
    var r = $('[data-recap]', form);
    if (!state.service || !state.day || state.time == null) { r.innerHTML = ''; return; }
    var end = state.time + state.service.min;
    r.innerHTML = '<dl><dt>Prestation</dt><dd>' + state.service.name + '</dd><dt>Quand</dt><dd>' + whenText() + '</dd><dt>Durée</dt><dd>' + state.service.min + NB + 'min, jusqu’à ' + hm(end) + '</dd><dt>Prix</dt><dd>' + euro(state.service.price) + ' (indicatif, à confirmer)</dd><dt>Lieu</dt><dd>8, rue Jacques-Peirotes, Strasbourg</dd></dl>';
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (state.step !== 4) return;
    var a = check(nameIn, nameIn.value.trim().length >= 2, 'e-name');
    var b = check(telIn, telOk(telIn.value), 'e-tel');
    if (!a) { nameIn.focus(); return; }
    if (!b) { telIn.focus(); return; }
    var first = nameIn.value.trim();
    first = first.charAt(0).toUpperCase() + first.slice(1);
    state.name = first;
    var slot = $('[data-card-slot]', form), live0 = $('[data-live-card]');
    var clone = live0.cloneNode(true);
    clone.removeAttribute('data-live-card');
    $$('[data-fill]', clone).forEach(function (el) { el.removeAttribute('data-fill'); });
    $$('[data-fill-sr]', clone).forEach(function (el) { el.hidden = true; });
    var dl = $('.plaque__lines', clone);
    var row = document.createElement('div'); row.className = 'plaque__l';
    row.innerHTML = '<dt>Au nom de</dt><dd><span class="plaque__fill"></span></dd>';
    $('.plaque__fill', row).textContent = first;
    dl.appendChild(row);
    clone.classList.add('is-done');
    clone.querySelector('[data-stamp]').removeAttribute('data-stamp');
    slot.innerHTML = ''; slot.appendChild(clone);
    live0.classList.add('is-done');
    if (live0.parentNode) live0.parentNode.classList.add('is-done');
    $('[data-done-when]', form).textContent = first + ', c’est noté pour ' + whenText() + NB + ': ' + state.service.name.toLowerCase() + ', ' + euro(state.service.price) + ' (indicatif).';
    goStep(5);
  });

  function restart() {
    state.service = null; state.day = null; state.time = null; state.max = 1;
    $$('input[type=radio]', form).forEach(function (r) { r.checked = false; });
    nameIn.value = ''; telIn.value = '';
    nameIn.removeAttribute('aria-invalid'); telIn.removeAttribute('aria-invalid');
    ['service', 'day', 'time', 'price'].forEach(function (k) { fill(k, ''); });
    $('[data-live-card]').classList.remove('is-done');
    $('[data-live-card]').parentNode.classList.remove('is-done');
    var pick = $('[data-pick]', form); pick.hidden = true;
    slotsBox.innerHTML = '';
    goStep(1);
  }

  /* .ics, heure locale flottante, généré dans le navigateur */
  function icsDate(dt, min) { return dateKey(dt).replace(/-/g, '') + 'T' + pad(Math.floor(min / 60)) + pad(min % 60) + '00'; }
  function downloadIcs() {
    if (!state.service || !state.day || state.time == null) return;
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Sam Coiffure//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + stamp + '-sam-coiffure-apercu@studiolamy', 'DTSTAMP:' + stamp,
      'DTSTART:' + icsDate(state.day, state.time), 'DTEND:' + icsDate(state.day, state.time + state.service.min),
      'SUMMARY:Sam Coiffure (simulation) - ' + state.service.name,
      'LOCATION:8 rue Jacques-Peirotes\\, 67000 Strasbourg',
      'DESCRIPTION:Simulation depuis un apercu non officiel. ',
      ' Rien n\'a ete envoye au salon\\; on entre sans rendez-vous.',
      'END:VEVENT', 'END:VCALENDAR'];
    var blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'sam-coiffure-simulation.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* depuis la carte : « Réserver » choisit la prestation et ouvre l’étape 2 */
  $$('[data-book]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (state.step === 5) restart();
      setService(a.getAttribute('data-book'), true);
      goStep(2, { focus: false, silent: false });
      var sec = $('.book') || $('#garder');
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      setTimeout(function () { var h = $('[data-step="2"] .panel__t', form); if (h) h.focus({ preventScroll: true }); }, reduce ? 0 : 450);
    });
  });

  goStep(1, { focus: false, silent: true });
  announce('');
})();
