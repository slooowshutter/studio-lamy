/* Yocolor, aperçu non officiel. Simulated booking: nothing is sent anywhere. */
(() => {
  'use strict';

  const root = document.documentElement;
  // The hidden starting states of the reveals only apply when this script runs; without JS, everything shows.
  root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '04 72 12 76 31';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  // Opening hours in decimal hours by day of week (Planity, 1 Nov 2026). null = closed.
  const HOURS = { 0: null, 1: [9.5, 17], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [8, 17] };
  const BRUSH = { court: 'FE-1', 'mi-long': 'FE-2', long: 'FE-3', xxl: 'FE-4' };
  const LONGUEUR_OF = { 'FE-1': 'court', 'FE-2': 'mi-long', 'FE-3': 'long', 'FE-4': 'xxl' };
  const STEP_NAMES = { 1: 'Prestation', 2: 'Jour', 3: 'Heure', 4: 'Coordonnées' };

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

  /* ---------- Data: the price table is the single source for bookable services ---------- */
  const services = [...document.querySelectorAll('tr[data-online="1"]')].map((tr) => ({
    id: tr.dataset.id,
    cat: tr.dataset.cat,
    min: Number(tr.dataset.min),
    prix: Number(tr.dataset.prix),
    name: tr.querySelector('.c-name').firstChild.textContent.trim(),
    durLabel: tr.querySelector('.c-dur').textContent.trim(),
    prixLabel: tr.querySelector('.c-prix').textContent.trim(),
  }));
  const byId = (id) => services.find((s) => s.id === id);

  /* ---------- State ---------- */
  const state = { besoin: 'brushing', longueur: 'court', traitement: 'aucun', service: 'FE-1', date: null, time: null, step: 1, maxStep: 1 };

  /* ---------- Fiche and result ---------- */
  const form = document.getElementById('fiche');
  const resTxt = document.querySelector('[data-result-txt]');
  const stamp = document.querySelector('[data-stamp]');
  let resTimer = null;

  function readFiche() {
    const q = (name) => {
      const input = form.querySelector(`input[name="${name}"]:checked`);
      return input ? input.value : null;
    };
    state.longueur = q('longueur') || state.longueur;
    state.traitement = q('traitement') || state.traitement;
    state.besoin = q('besoin') || state.besoin;
  }

  function resultFor() {
    if (state.besoin === 'balayage') {
      const traite = state.traitement !== 'aucun';
      return {
        stamp: 'Par téléphone',
        txt: traite
          ? `Par téléphone. Sur des cheveux traités au henné, au végétal, au bio, lissés ou permanentés, le médium, le blond intense et l’extrême ne sont pas possibles. Le balayage doux se demande au téléphone.`
          : `Par téléphone, au ${TEL}. Diagnostic recommandé pour le blond intense, obligatoire pour l’extrême-transformation.`,
      };
    }
    if (state.besoin === 'homme') {
      return { stamp: 'En ligne', txt: 'Réservable en ligne, 24 h/24. Coupe classique 30 €, technique 35 €, cheveux longs 45 €, coupe et barbe 55 €, entretien de barbe 25 €.' };
    }
    const svc = byId(state.service) || byId(BRUSH[state.longueur]);
    return { stamp: 'En ligne', txt: `Réservable en ligne, 24 h/24. ${svc.name} : ${svc.durLabel}, ${svc.prixLabel}.` };
  }

  function setResult() {
    const r = resultFor();
    if (reduce) {
      resTxt.textContent = r.txt;
      stamp.textContent = r.stamp;
      return;
    }
    resTxt.classList.add('is-out');
    clearTimeout(resTimer);
    resTimer = setTimeout(() => {
      resTxt.textContent = r.txt;
      stamp.textContent = r.stamp;
      resTxt.classList.remove('is-out');
    }, 130);
  }

  function syncFiche() {
    const set = (name, value) => {
      const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    };
    set('besoin', state.besoin);
    set('longueur', state.longueur);
    set('traitement', state.traitement);
  }

  /* ---------- Step 1: prestations ---------- */
  const list = document.querySelector('[data-services]');
  const phoneOnly = document.querySelector('[data-phone-only]');
  const hint1 = document.querySelector('[data-hint-1]');
  const next1 = document.querySelector('[data-next="2"]');

  function renderServices() {
    const isPhone = state.besoin === 'balayage';
    list.hidden = isPhone;
    phoneOnly.hidden = !isPhone;
    hint1.hidden = isPhone;
    list.replaceChildren();
    if (isPhone) {
      // Nothing to book online: the flow closes back to step 1 and Jour is no longer reachable.
      state.service = null;
      state.date = null;
      state.time = null;
      state.maxStep = 1;
      next1.disabled = true;
      if (state.step > 1) goStep(1, { focus: false });
      return;
    }
    const cat = state.besoin === 'homme' ? 'homme' : 'femme';
    services.filter((s) => s.cat === cat).forEach((s) => {
      const label = el('label', 'opt opt--svc');
      const input = el('input');
      input.type = 'radio';
      input.name = 'service';
      input.value = s.id;
      input.checked = state.service === s.id;
      const span = el('span');
      span.append(el('span', 'svc__n', s.name), el('span', 'svc__d', s.durLabel), el('span', 'svc__p', s.prixLabel));
      label.append(input, span);
      list.append(label);
    });
    next1.disabled = !state.service;
  }

  list.addEventListener('change', (e) => {
    if (e.target.name !== 'service') return;
    state.service = e.target.value;
    state.date = null;
    state.time = null;
    state.maxStep = Math.min(state.maxStep, 2);
    paintProgress();
    next1.disabled = false;
    setResult();
    updateSel();
  });

  /* ---------- Step 2 and 3: days and slots ---------- */
  const daysBox = document.querySelector('[data-days]');
  const slotsBox = document.querySelector('[data-slots]');
  const slotsHint = document.querySelector('[data-slots-hint]');
  const next2 = document.querySelector('[data-next="3"]');
  const next3 = document.querySelector('[data-next="4"]');

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
        el('span', null, DAYS_SHORT[d.getDay()]),
        el('strong', null, `${d.getDate()} ${MONTHS[d.getMonth()]}`),
        el('small', null, closed ? 'fermé' : free ? (d.getDay() === 1 ? 'à confirmer' : 'ouvert') : 'complet'),
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
    set('jour', day ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(day) : 'À choisir');
    set('heure', state.time != null ? fr(state.time / 60) : 'À choisir');
    set('prix', svc ? svc.prixLabel : '—');
  }

  /* ---------- Steps ---------- */
  const steps = [...document.querySelectorAll('.step[data-step]')];
  const progress = [...document.querySelectorAll('[data-goto]')];
  const live = document.querySelector('[data-live]');

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
    if (!focus) return;
    const heading = active.querySelector('.step__t');
    if (heading) heading.focus();
    if (n <= 4) live.textContent = `Étape ${n} sur 4 : ${STEP_NAMES[n].toLowerCase()}.`;
    if (n === 4) renderRecap();
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
  const coords = document.querySelector('[data-form]');
  const recapBox = document.querySelector('[data-recap]');
  const recapFinal = document.querySelector('[data-recap-final]');

  function recapItems() {
    const svc = byId(state.service);
    const day = selectedDay();
    return [
      ['Prestation', svc ? `${svc.name}, ${svc.durLabel}` : '—'],
      ['Jour', day ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(day) : '—'],
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
    const stamp2 = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Aperçu Yocolor//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:yocolor-apercu-${Date.now()}`, `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Paris:${stamp2(start)}`,
      `DURATION:PT${svc.min}M`,
      `SUMMARY:Yocolor : ${svc.name} (aperçu, simulation)`,
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

  /* ---------- Fiche changes reset the flow and refresh the offer ---------- */
  form.addEventListener('change', (e) => {
    if (!e.target.matches('input[type="radio"]')) return;
    const before = state.service;
    readFiche();
    if (state.besoin === 'brushing' && e.target.name === 'longueur') state.service = BRUSH[state.longueur];
    if (e.target.name === 'besoin') {
      state.service = state.besoin === 'homme' ? 'HO-1' : state.besoin === 'brushing' ? BRUSH[state.longueur] : null;
    }
    if (state.service !== before || e.target.name === 'besoin') {
      state.date = null;
      state.time = null;
      state.maxStep = Math.min(state.maxStep, 2);
      paintProgress();
    }
    setResult();
    renderServices();
    updateSel();
    if (state.service !== before && state.step > 1) goStep(1, { focus: false });
  });

  /* ---------- Table buttons preselect a service and sync the fiche ---------- */
  document.querySelectorAll('[data-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.pick;
      const svc = byId(id);
      state.service = id;
      state.besoin = svc.cat === 'homme' ? 'homme' : 'brushing';
      if (LONGUEUR_OF[id]) state.longueur = LONGUEUR_OF[id];
      state.date = null;
      state.time = null;
      state.maxStep = 1;
      syncFiche();
      setResult();
      renderServices();
      updateSel();
      document.getElementById('reserver').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      goStep(1);
    });
  });

  /* ---------- Opening status (Europe/Paris) ---------- */
  const statusEls = [document.querySelector('[data-status]'), document.querySelector('[data-status-2]')];

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
      if (!s || s.textContent === text) return;
      s.textContent = text;
    });
    const hero = document.querySelector('.status');
    if (hero) hero.dataset.state = openNow ? 'open' : 'closed';
    document.querySelectorAll('.horaires tbody tr').forEach((tr) => {
      tr.classList.toggle('is-today', Number(tr.dataset.dow) === dow);
    });
  }

  /* ---------- Menu ---------- */
  const top = document.querySelector('.top');
  const menuBtn = document.querySelector('[data-menu]');
  const nav = document.getElementById('nav');

  // While the menu is open, the page behind it is inert: focus stays in the menu.
  const behind = [...document.querySelectorAll('.skip, .apercu, main, .foot, .dock, .brand, .top__sub, .top__cta')];
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
  // The inline menu takes over at 720 px: a menu left open must not keep the page inert.
  window.matchMedia('(min-width: 720px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Copy address ---------- */
  const copyBtn = document.querySelector('[data-copy]');
  const copyLive = document.querySelector('[data-copy-live]');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.copy);
      copyLive.textContent = 'Adresse copiée.';
    } catch (err) {
      copyLive.textContent = 'Copie impossible ici. L’adresse est 102 avenue Lacassagne, 69003 Lyon.';
    }
  });

  /* ---------- Reveals, once ---------- */
  const reveal = (entries, io) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => reveal(entries, io), { threshold: 0.2 });
    document.querySelectorAll('[data-reveal]').forEach((table) => {
      table.querySelectorAll('tbody tr').forEach((tr, i) => tr.style.setProperty('--i', String(i)));
      io.observe(table);
    });
    document.querySelectorAll('.plan').forEach((p) => io.observe(p));

    // Dock: shown once the hero CTAs leave the screen, hidden over booking and footer.
    const heroCtas = document.querySelector('.hero .ctas');
    const booking = document.getElementById('reserver');
    const foot = document.querySelector('.foot');
    let heroOut = false;
    let inBooking = false;
    let inFoot = false;
    let overBooking = false;
    const dock = document.querySelector('[data-dock]');
    const paintDock = () => {
      const on = heroOut && !overBooking;
      dock.classList.toggle('is-on', on);
    };
    const dockIo = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.target === heroCtas) heroOut = !en.isIntersecting;
        if (en.target === booking) inBooking = en.isIntersecting;
        if (en.target === foot) inFoot = en.isIntersecting;
      });
      overBooking = inBooking || inFoot;
      paintDock();
    });
    [heroCtas, booking, foot].forEach((t) => t && dockIo.observe(t));
    document.body.classList.add('has-dock');
  } else {
    document.querySelectorAll('[data-reveal], .plan').forEach((n) => n.classList.add('is-in'));
  }

  /* ---------- Boot ---------- */
  // Once the tables are laid out as blocks (under 720 px) some browsers drop their semantics: restore them.
  document.querySelectorAll('.tarifs, .horaires').forEach((t) => {
    t.setAttribute('role', 'table');
    t.querySelectorAll('tr').forEach((r) => r.setAttribute('role', 'row'));
    t.querySelectorAll('td').forEach((c) => c.setAttribute('role', 'cell'));
    t.querySelectorAll('thead th').forEach((c) => c.setAttribute('role', 'columnheader'));
    t.querySelectorAll('th[scope="row"], th[scope="rowgroup"]').forEach((c) => c.setAttribute('role', 'rowheader'));
  });
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
  readFiche();
  syncFiche();
  renderServices();
  setResult();
  updateSel();
  goStep(1, { focus: false });
  updateStatus();
  setInterval(updateStatus, 60000);

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
})();
