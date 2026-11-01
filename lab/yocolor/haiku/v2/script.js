/* Yocolor, aperçu non officiel. Simulated booking: nothing is sent anywhere. Shared by v2 and v3. */
(() => {
  'use strict';

  const root = document.documentElement;
  // The hidden starting states of the reveals only apply when this script runs; without JS, everything shows.
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '04 72 12 76 31';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  // Opening hours in decimal hours by day of week (Planity, 1 Nov 2026). null = closed.
  const HOURS = { 0: null, 1: [9.5, 17], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [8, 17] };
  const STEP_NAMES = { 1: 'Prestation', 2: 'Jour', 3: 'Heure', 4: 'Coordonnées' };
  const BOARD_START = 8 * 60; // the planning board runs 08:00 to 19:00
  const BOARD_SPAN = 11 * 60;

  const pad = (n) => String(n).padStart(2, '0');
  const fr = (dec) => {
    const h = Math.floor(dec);
    const m = Math.round((dec - h) * 60);
    return m ? `${h} h ${pad(m)}` : `${h} h`;
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  // Paris wall-clock time as a local Date, so the hours match the salon's time zone.
  const parisNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const LONG_DATE = (d) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);

  /* ---------- Data: the price rows in the HTML are the single source for bookable services ---------- */
  const services = [...document.querySelectorAll('[data-svc]')].map((n) => ({
    id: n.dataset.id,
    cat: n.dataset.cat,
    min: Number(n.dataset.min),
    name: n.dataset.name,
    durLabel: n.dataset.dur,
    prixLabel: n.dataset.price,
  }));
  const byId = (id) => services.find((s) => s.id === id);

  /* ---------- State ---------- */
  const state = { service: null, date: null, time: null, step: 1, maxStep: 1 };

  /* ---------- Elements ---------- */
  const steps = [...document.querySelectorAll('.step[data-step]')];
  const progress = [...document.querySelectorAll('[data-goto]')];
  const live = document.querySelector('[data-live]');
  const list = document.querySelector('[data-services]');
  const next1 = document.querySelector('[data-next="2"]');
  const daysBox = document.querySelector('[data-days]');
  const slotsBox = document.querySelector('[data-slots]');
  const slotsHint = document.querySelector('[data-slots-hint]');
  const next2 = document.querySelector('[data-next="3"]');
  const next3 = document.querySelector('[data-next="4"]');
  const coords = document.querySelector('[data-form]');
  const recapBox = document.querySelector('[data-recap]');
  const recapFinal = document.querySelector('[data-recap-final]');

  /* ---------- Step 1: prestations ---------- */
  function renderServices() {
    list.replaceChildren();
    [['femme', 'Femme'], ['homme', 'Homme']].forEach(([cat, label]) => {
      list.append(el('p', 'svc-group', label));
      services.filter((s) => s.cat === cat).forEach((s) => {
        const lab = el('label', 'opt opt--svc');
        const input = el('input');
        input.type = 'radio';
        input.name = 'service';
        input.value = s.id;
        input.checked = state.service === s.id;
        const span = el('span');
        span.append(el('span', 'svc__n', s.name), el('span', 'svc__d', s.durLabel), el('span', 'svc__p', s.prixLabel));
        lab.append(input, span);
        list.append(lab);
      });
    });
    next1.disabled = !state.service;
  }

  list.addEventListener('change', (e) => {
    if (e.target.name !== 'service') return;
    state.service = e.target.value;
    state.date = null;
    state.time = null;
    state.maxStep = 1;
    paintProgress();
    next1.disabled = false;
    updateSel();
  });

  /* ---------- Steps 2 and 3: days and slots ---------- */
  function slotsFor(day, dur) {
    const h = HOURS[day.getDay()];
    if (!h) return [];
    const start = Math.round(h[0] * 60);
    const end = Math.round(h[1] * 60);
    const pnow = parisNow();
    const today = sameDay(day, pnow);
    const nowMin = today ? pnow.getHours() * 60 + pnow.getMinutes() + 30 : -1;
    const out = [];
    for (let t = start; t + dur <= end; t += 30) {
      const past = t < nowMin;
      // Deterministic "déjà pris" pattern, so the same day always shows the same gaps.
      const taken = !past && (day.getDate() * 7 + day.getMonth() * 3 + (t / 30) * 5) % 6 === 0;
      out.push({ t, past, taken });
    }
    return out;
  }

  function renderDays() {
    daysBox.replaceChildren();
    const svc = byId(state.service);
    const today = parisNow();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const closed = !HOURS[d.getDay()];
      const free = !closed && svc && slotsFor(d, svc.min).some((s) => !s.past && !s.taken);
      const label = el('label', 'opt');
      const input = el('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      input.disabled = closed || !free;
      input.checked = state.date === input.value;
      const span = el('span');
      span.append(
        el('span', 'day__w', DAYS_SHORT[d.getDay()]),
        el('strong', 'day__d', String(d.getDate())),
        el('small', null, `${MONTHS[d.getMonth()]}`),
        el('small', 'day__s', closed ? 'fermé' : free ? (d.getDay() === 1 ? 'à confirmer' : 'ouvert') : 'complet'),
      );
      label.append(input, span);
      daysBox.append(label);
    }
    next2.disabled = !state.date;
  }

  daysBox.addEventListener('change', (e) => {
    if (e.target.name !== 'jour') return;
    state.date = e.target.value;
    state.time = null;
    // A new day means a new time: the flow can reach the time step again, not the form.
    state.maxStep = Math.min(state.maxStep, 3);
    next2.disabled = false;
    updateSel();
  });

  function selectedDay() {
    if (!state.date) return null;
    const [y, m, d] = state.date.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function renderSlots() {
    slotsBox.replaceChildren();
    const day = selectedDay();
    const svc = byId(state.service);
    if (!day || !svc) return;
    const slots = slotsFor(day, svc.min);
    const open = slots.filter((s) => !s.past && !s.taken);
    slotsHint.textContent = open.length
      ? 'Créneaux selon les horaires du jour. Barrés : déjà pris.'
      : 'Plus de créneau ce jour-là. Choisissez un autre jour.';
    slots.forEach((s) => {
      const label = el('label', 'opt');
      const input = el('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = String(s.t);
      input.disabled = s.past || s.taken;
      input.checked = state.time === s.t;
      const span = el('span');
      span.append(el('span', null, fr(s.t / 60)));
      if (s.taken) span.append(el('small', null, 'déjà pris'));
      else if (s.past) span.append(el('small', null, 'passé'));
      label.append(input, span);
      slotsBox.append(label);
    });
    next3.disabled = !state.time;
  }

  slotsBox.addEventListener('change', (e) => {
    if (e.target.name !== 'heure') return;
    state.time = Number(e.target.value);
    next3.disabled = false;
    updateSel();
  });

  /* ---------- Selection summary ---------- */
  function updateSel() {
    const svc = byId(state.service);
    const day = selectedDay();
    const set = (key, text) => {
      document.querySelector(`[data-sel="${key}"]`).textContent = text;
    };
    set('service', svc ? `${svc.name}, ${svc.durLabel}` : 'À choisir');
    set('jour', day ? LONG_DATE(day) : 'À choisir');
    set('heure', state.time != null ? fr(state.time / 60) : 'À choisir');
    set('prix', svc ? svc.prixLabel : '—');
  }

  /* ---------- Steps ---------- */
  // Progress buttons open only the steps the flow has reached (disabled ones are ignored).
  function paintProgress() {
    progress.forEach((b) => { b.disabled = Number(b.dataset.goto) > state.maxStep; });
  }

  function goStep(n, { focus = true } = {}) {
    if (n <= 4 && n > state.maxStep) n = state.maxStep;
    state.step = n;
    state.maxStep = Math.max(state.maxStep, n);
    if (n === 2) renderDays();
    if (n === 3) renderSlots();
    if (n === 4) renderRecap();
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    const active = steps.find((s) => Number(s.dataset.step) === n);
    if (!reduce) {
      // Entrance: start from the offset state, flush the style, then let the transition run.
      active.classList.add('is-from');
      void active.offsetWidth;
      requestAnimationFrame(() => active.classList.remove('is-from'));
    }
    paintProgress();
    progress.forEach((b) => {
      if (Number(b.dataset.goto) === n) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    if (n <= 4) live.textContent = `Étape ${n} sur 4 : ${STEP_NAMES[n].toLowerCase()}.`;
    if (!focus) return;
    const heading = active.querySelector('.step__t');
    if (heading) heading.focus();
  }

  document.querySelectorAll('[data-next]').forEach((b) => {
    b.addEventListener('click', () => goStep(Number(b.dataset.next)));
  });
  document.querySelectorAll('[data-back]').forEach((b) => {
    b.addEventListener('click', () => goStep(Number(b.dataset.back)));
  });
  progress.forEach((b) => {
    b.addEventListener('click', () => goStep(Number(b.dataset.goto)));
  });

  /* ---------- Step 4: coordonnées and confirmation ---------- */
  function recapItems() {
    const svc = byId(state.service);
    const day = selectedDay();
    return [
      ['Prestation', svc ? `${svc.name}, ${svc.durLabel}` : '—'],
      ['Jour', day ? LONG_DATE(day) : '—'],
      ['Heure', state.time != null ? fr(state.time / 60) : '—'],
      ['Prix', svc ? `${svc.prixLabel}, indicatif` : '—'],
    ];
  }

  function fillDl(dl, items) {
    dl.replaceChildren();
    items.forEach(([k, v]) => {
      const row = el('div');
      row.append(el('dt', null, k), el('dd', null, v));
      dl.append(row);
    });
  }

  function renderRecap() {
    fillDl(recapBox, recapItems());
  }

  const validators = {
    prenom: (v) => {
      const t = v.trim();
      if (t.length < 2) return 'Indiquez un prénom.';
      if (!/^[\p{L}’' -]+$/u.test(t)) return 'Le prénom ne contient que des lettres.';
      return '';
    },
    tel: (v) => {
      const t = v.replace(/[\s.-]/g, '');
      if (!/^(?:\+33|0033|0)[67]\d{8}$/.test(t)) return 'Un numéro mobile, par exemple 06 12 34 56 78.';
      return '';
    },
  };

  coords.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = { prenom: coords.elements.prenom, tel: coords.elements.tel };
    let firstBad = null;
    Object.keys(validators).forEach((key) => {
      const input = inputs[key];
      const msg = validators[key](input.value);
      const errBox = document.querySelector(`[data-err="${key}"]`);
      errBox.textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !firstBad) firstBad = input;
    });
    if (firstBad) {
      firstBad.focus();
      return;
    }
    fillDl(recapFinal, [...recapItems(), ['Prénom', coords.elements.prenom.value.trim()], ['Mobile', coords.elements.tel.value.trim()]]);
    goStep(5);
    live.textContent = 'Demande notée. Simulation, rien n’a été envoyé.';
  });

  /* ---------- Calendar file (client-side) ---------- */
  document.querySelector('[data-ics]').addEventListener('click', () => {
    const svc = byId(state.service);
    const day = selectedDay();
    if (!svc || !day || state.time == null) return;
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(state.time / 60), state.time % 60);
    const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Aperçu Yocolor//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:yocolor-apercu-${Date.now()}`, `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Paris:${stamp(start)}`,
      `DURATION:PT${svc.min}M`,
      `SUMMARY:Yocolor : ${svc.name} (aperçu, simulation)`,
      'LOCATION:102 avenue Lacassagne, 69003 Lyon',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = el('a');
    a.href = url;
    a.download = 'yocolor-rendez-vous.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  /* ---------- Table and card buttons preselect a service ---------- */
  document.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.service = btn.dataset.pick;
      state.date = null;
      state.time = null;
      state.maxStep = 1;
      renderServices();
      updateSel();
      document.getElementById('reserver').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      goStep(1);
    });
  });

  /* ---------- Opening status (Europe/Paris), the board's now line and today's marks ---------- */
  const statusEls = [document.querySelector('[data-status]'), document.querySelector('[data-status-2]')].filter(Boolean);
  const nowLine = document.querySelector('[data-now]');

  function updateStatus() {
    const now = parisNow();
    const dow = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const h = HOURS[dow];
    let text;
    let openNow = false;
    if (h && mins >= h[0] * 60 && mins < h[1] * 60) {
      openNow = true;
      text = `Ouvert maintenant · ferme à ${fr(h[1])}`;
    } else {
      let next = null;
      for (let i = 0; i < 8 && !next; i += 1) {
        const d = (dow + i) % 7;
        const hh = HOURS[d];
        if (!hh) continue;
        if (i === 0 && mins < hh[0] * 60) next = { d, today: true, t: hh[0] };
        else if (i > 0) next = { d, today: false, t: hh[0] };
      }
      text = next && next.today
        ? `Fermé pour l’instant · ouvre à ${fr(next.t)}`
        : next ? `Fermé maintenant · ouvre ${DAYS[next.d]} à ${fr(next.t)}` : 'Fermé';
    }
    // Monday's hours are the one point the sources disagree on: say so wherever Monday comes up.
    if (dow === 1 || text.includes('lundi')) text += ' · lundi à confirmer';
    statusEls.forEach((s) => {
      if (s.textContent !== text) s.textContent = text;
    });
    const hero = document.querySelector('.status');
    if (hero) hero.dataset.state = openNow ? 'open' : 'closed';
    if (nowLine) {
      nowLine.hidden = !openNow;
      if (openNow) nowLine.style.top = `${((mins - BOARD_START) / BOARD_SPAN) * 100}%`;
    }
    document.querySelectorAll('[data-dow]').forEach((n) => {
      n.classList.toggle('is-today', Number(n.dataset.dow) === dow);
    });
  }

  /* ---------- Menu: the page behind it is inert while it is open ---------- */
  const top = document.querySelector('.top');
  const menuBtn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');
  const behind = [...document.querySelectorAll('.skip, .apercu, main, .foot, [data-dock], .brand, .top__sub, .top__cta')];

  function setMenu(open) {
    top.toggleAttribute('data-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    behind.forEach((n) => { n.inert = open; });
    if (open) nav.querySelector('a').focus();
  }
  menuBtn.addEventListener('click', () => {
    const open = !top.hasAttribute('data-open');
    setMenu(open);
    if (!open) menuBtn.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (!top.hasAttribute('data-open')) return;
    if (e.key === 'Escape') {
      setMenu(false);
      menuBtn.focus();
      return;
    }
    if (e.key !== 'Tab') return;
    // Tab wraps between the menu links and the close button.
    const items = [...nav.querySelectorAll('a'), menuBtn];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  window.matchMedia('(min-width: 800px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Copy address ---------- */
  const copyBtn = document.querySelector('[data-copy]');
  const copyLive = document.querySelector('[data-copy-live]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.copy);
        copyLive.textContent = 'Adresse copiée.';
      } catch (err) {
        copyLive.textContent = 'Copie impossible ici. L’adresse est 102 avenue Lacassagne, 69003 Lyon.';
      }
    });
  }

  /* ---------- Reveals, once ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.18 });
    document.querySelectorAll('[data-reveal]').forEach((n) => {
      [...n.children].forEach((c, i) => c.style.setProperty('--i', String(i)));
      io.observe(n);
    });

    // Mobile sticky bar: shown once the hero CTAs leave the screen, hidden over the booking and the footer.
    const dock = document.querySelector('[data-dock]');
    const heroCtas = document.querySelector('.hero .ctas');
    const booking = document.getElementById('reserver');
    const foot = document.querySelector('.foot');
    if (dock && heroCtas && booking && foot) {
      let heroOut = false;
      let overBooking = false;
      let inBooking = false;
      let inFoot = false;
      const paintDock = () => dock.classList.toggle('is-on', heroOut && !overBooking);
      const dockIo = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.target === heroCtas) heroOut = !en.isIntersecting;
          if (en.target === booking) inBooking = en.isIntersecting;
          if (en.target === foot) inFoot = en.isIntersecting;
        });
        overBooking = inBooking || inFoot;
        paintDock();
      });
      [heroCtas, booking, foot].forEach((t) => dockIo.observe(t));
    }
  } else {
    document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-in'));
  }

  /* ---------- Boot ---------- */
  // Wordmark: each letter rises from the mask, 25 ms apart.
  const wordmark = document.querySelector('.wordmark__in');
  if (wordmark) {
    const word = wordmark.textContent;
    wordmark.textContent = '';
    [...word].forEach((c, i) => {
      const s = el('span', 'ch', c);
      s.style.setProperty('--i', String(i));
      wordmark.append(s);
    });
  }
  renderServices();
  updateSel();
  goStep(1, { focus: false });
  updateStatus();
  setInterval(updateStatus, 60000);

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
