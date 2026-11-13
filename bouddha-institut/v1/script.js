/* Bouddha institut — un aperçu local. Aucune requête, aucun stockage. */
(() => {
  'use strict';
  const NB = '\u00a0';
  const services = {
    vernis: { label: 'Pose de vernis semi-permanent', duration: 30 },
    manucure: { label: 'Femme - Manucure orientale', duration: 30 },
    massage: { label: 'Femme - Massage du corps détente', duration: 60 }
  };
  // Tableau hebdomadaire Treatwell : mardi fermé, dimanche jusqu’à 19 h.
  const hours = { 0: [600,1140], 1: [600,1170], 2: null, 3: [600,1170], 4: [600,1170], 5: [600,1170], 6: [600,1170] };
  const parisFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const longFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).map(p => [p.type,p.value]));
    return { day: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  const utcDate = day => new Date(`${day}T12:00:00Z`);
  const longDay = day => longFormat.format(utcDate(day));
  const hourLabel = value => `${Math.floor(value/60)}${NB}h${value%60 ? NB+String(value%60).padStart(2,'0') : ''}`;
  function upcomingDays(now = parisNow()) {
    return Array.from({length:14}, (_,index) => {
      const date = utcDate(now.day);
      date.setUTCDate(date.getUTCDate()+index);
      const iso = date.toISOString().slice(0,10);
      const interval = hours[date.getUTCDay()];
      return { iso, date, closed: !interval, finished: !!interval && iso === now.day && now.minute >= interval[1]-30 };
    });
  }
  function slotsFor(day, duration, now = parisNow()) {
    const interval = hours[utcDate(day).getUTCDay()];
    if (!interval || day < now.day || ![30,60].includes(duration)) return [];
    const result = [];
    for (let minute=interval[0]; minute+duration<=interval[1]; minute+=30) {
      result.push({ minute, past: day === now.day && minute <= now.minute });
    }
    return result;
  }
  function validPhone(value) {
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(value.replace(/[\s.()\-]/g,''));
  }
  // Les fonctions de calendrier peuvent être vérifiées avec Node sans navigateur.
  if (typeof module !== 'undefined' && module.exports) module.exports = { services,hours,parisNow,upcomingDays,slotsFor,validPhone,hourLabel };
  if (typeof document === 'undefined') return;

  const doc = document;
  const $ = selector => doc.querySelector(selector);
  const $$ = selector => [...doc.querySelectorAll(selector)];
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = { step:0, service:null, day:null, time:null };
  let keyboard = false;
  let changeTimer = null;
  let frame = null;
  let transitionId = 0;
  root.classList.add('js');
  doc.addEventListener('keydown', () => { keyboard = true; root.classList.add('is-keyboard'); });
  doc.addEventListener('pointerdown', () => { keyboard = false; root.classList.remove('is-keyboard'); }, {passive:true});

  /* Entrée brève, indépendante du téléchargement des polices. */
  if (!reduce.matches) {
    $('.hero').classList.add('is-entering');
    setTimeout(() => $('.hero').classList.remove('is-entering'), 750);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, {threshold:.08});
    $$('[data-reveal]').forEach(element => {
      // Uniquement les surfaces hors champ ; aucune attente sur un contenu déjà lu.
      if (!reduce.matches && element.getBoundingClientRect().top > window.innerHeight) element.classList.add('is-armed');
      observer.observe(element);
    });
  }

  $('.booking-app').hidden = false;
  const form = $('#booking-form');
  const panel = $('#booking-panel');
  const panels = $$('[data-panel]');
  const progress = $$('[data-step]');
  const errors = $('#booking-error');
  const announce = text => { $('#booking-status').textContent = text; };
  const create = (tag,className,text) => {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function updateSummary() {
    $('#summary-service').textContent = state.service ? services[state.service].label : 'À choisir';
    $('#summary-day').textContent = state.day ? longDay(state.day) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? hourLabel(state.time) : 'À choisir';
    progress.forEach((button,index) => {
      button.disabled = state.step === 4 || (index>0 && !state.service) || (index>1 && !state.day) || (index>2 && state.time === null);
      if (index === state.step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
  }
  function renderDays() {
    const container = $('#days');
    container.replaceChildren();
    upcomingDays().forEach((day,index) => {
      const label = create('label','day-choice');
      const input = create('input');
      input.type = 'radio'; input.name = 'jour'; input.value = day.iso;
      input.checked = state.day === day.iso;
      input.disabled = day.closed || day.finished;
      const note = day.closed ? 'Fermé' : day.finished ? 'Terminé' : monthFormat.format(day.date);
      input.setAttribute('aria-label', `${longDay(day.iso)}${day.closed ? ', fermé' : day.finished ? ', journée terminée' : ', simulation'}`);
      label.append(input,create('span','',index === 0 ? 'Auj.' : shortDayFormat.format(day.date)),create('strong','',String(day.date.getUTCDate())),create('span','',note));
      container.append(label);
    });
  }
  function renderSlots() {
    const container = $('#slots');
    container.replaceChildren();
    if (!state.day || !state.service) return;
    const slots = slotsFor(state.day,services[state.service].duration);
    $('#no-slots').hidden = slots.some(slot => !slot.past);
    $('#slot-note').textContent = `${longDay(state.day)}. Créneaux de démonstration uniquement, sans lien avec les disponibilités du salon.`;
    slots.forEach(slot => {
      const label = create('label','slot-choice');
      const input = create('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.minute);
      input.checked = slot.minute === state.time; input.disabled = slot.past;
      input.setAttribute('aria-label', `${hourLabel(slot.minute)}${slot.past ? ', heure passée' : ', simulation'}`);
      label.append(input,create('span','',hourLabel(slot.minute)));
      container.append(label);
    });
  }
  function commitStep(target,focus = true) {
    state.step = target;
    panels.forEach((element,index) => { element.hidden = index !== target; });
    errors.textContent = '';
    $('#previous').hidden = target === 0 || target === 4;
    $('#next').hidden = target === 4;
    $('#next').innerHTML = target === 3 ? 'Terminer la simulation <span aria-hidden="true">→</span>' : 'Continuer <span aria-hidden="true">→</span>';
    if (target === 1) renderDays();
    if (target === 2) renderSlots();
    updateSummary();
    if (focus) {
      const heading = panels[target].querySelector('h3');
      heading.focus({preventScroll:true});
      const bounds = heading.getBoundingClientRect();
      const safeTop = window.matchMedia('(max-width: 760px)').matches ? $('.selection').getBoundingClientRect().height+18 : 24;
      heading.style.scrollMarginTop = `${safeTop}px`;
      if (bounds.top < safeTop || bounds.bottom > window.innerHeight-100) heading.scrollIntoView({block:'start',behavior:'instant'});
    }
    announce(target === 4 ? 'Simulation terminée. Aucun rendez-vous n’a été pris.' : `Étape ${target+1} sur 4. ${panels[target].querySelector('h3').textContent}`);
  }
  function showStep(target,focus = true) {
    clearTimeout(changeTimer);
    if (frame !== null) cancelAnimationFrame(frame);
    const currentId = ++transitionId;
    panel.classList.remove('is-leaving','is-arriving','no-motion');
    if (reduce.matches || keyboard || !focus) {
      panel.classList.add('no-motion');
      commitStep(target,focus);
      return;
    }
    panel.classList.add('is-leaving');
    changeTimer = setTimeout(() => {
      if (currentId !== transitionId) return;
      panel.classList.remove('is-leaving');
      panel.classList.add('is-arriving');
      commitStep(target,focus);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (currentId === transitionId) panel.classList.remove('is-arriving');
        });
      });
    },110);
  }
  function chooseService(id) {
    if (!(id in services)) return;
    if (state.service !== id) state.time = null;
    state.service = id;
    const input = form.querySelector(`input[name="soin"][value="${id}"]`);
    if (input) input.checked = true;
    updateSummary();
    errors.textContent = '';
  }
  function liveSelectionIsValid() {
    if (!state.service || !state.day || state.time === null) return false;
    return slotsFor(state.day,services[state.service].duration).some(slot => slot.minute === state.time && !slot.past);
  }
  function flagError(message,name) {
    errors.textContent = message;
    const first = form.querySelector(`input[name="${name}"]:not(:disabled)`);
    if (first) first.focus();
  }
  form.addEventListener('change',event => {
    const input = event.target;
    if (input.name === 'soin') chooseService(input.value);
    if (input.name === 'jour') { state.day = input.value; state.time = null; }
    if (input.name === 'heure') state.time = Number(input.value);
    if (['soin','jour','heure'].includes(input.name)) { errors.textContent = ''; updateSummary(); }
  });
  progress.forEach(button => button.addEventListener('click',() => showStep(Number(button.dataset.step))));
  $('#previous').addEventListener('click',() => showStep(Math.max(0,state.step-1)));
  $$('[data-choose]').forEach(link => link.addEventListener('click',event => {
    event.preventDefault();
    chooseService(link.dataset.choose);
    showStep(1);
    $('#essayer').scrollIntoView({behavior:reduce.matches || keyboard ? 'instant':'smooth',block:'start'});
  }));

  function clearFieldError(input) {
    input.removeAttribute('aria-invalid');
    $(`#${input.id}-error`).textContent = '';
  }
  [$('#prenom'),$('#telephone')].forEach(input => input.addEventListener('input',() => clearFieldError(input)));
  form.addEventListener('submit',event => {
    event.preventDefault();
    if (state.step === 0) {
      if (!state.service) return flagError('Choisissez une prestation pour poursuivre l’essai.','soin');
      showStep(1);
    } else if (state.step === 1) {
      if (!state.day) return flagError('Choisissez un jour pour poursuivre l’essai.','jour');
      if (state.day < parisNow().day) { state.day = null; renderDays(); updateSummary(); return flagError('Ce jour est passé. Choisissez une nouvelle date.','jour'); }
      showStep(2);
    } else if (state.step === 2) {
      if (state.time === null) return flagError('Choisissez une heure de démonstration.','heure');
      if (!liveSelectionIsValid()) { state.time = null; renderSlots(); updateSummary(); return flagError('Cette heure est passée. Choisissez une autre heure.','heure'); }
      showStep(3);
    } else if (state.step === 3) {
      const name = $('#prenom');
      const phone = $('#telephone');
      [name,phone].forEach(clearFieldError);
      let invalid = null;
      if (name.value.trim().length < 2) {
        name.setAttribute('aria-invalid','true'); $('#prenom-error').textContent = 'Indiquez un prénom d’au moins deux caractères.'; invalid = name;
      }
      if (!validPhone(phone.value)) {
        phone.setAttribute('aria-invalid','true'); $('#telephone-error').textContent = 'Indiquez un numéro français à dix chiffres, ou commençant par +33.'; invalid = invalid || phone;
      }
      if (invalid) { invalid.focus(); announce('Vérifiez les champs signalés avant de terminer la simulation.'); return; }
      if (!liveSelectionIsValid()) { state.time = null; showStep(2); announce('L’heure choisie est passée. Choisissez un nouveau créneau de démonstration.'); return; }
      $('#success-recap').textContent = `${services[state.service].label}, ${longDay(state.day)} à ${hourLabel(state.time)}. 165 Rue de Bagnolet, 75020 Paris.`;
      // Les coordonnées disparaissent dès la fin de l’essai.
      name.value = ''; phone.value = '';
      showStep(4);
    }
  });
  $('#restart').addEventListener('click',() => {
    form.reset(); state.service = null; state.day = null; state.time = null;
    [$('#prenom'),$('#telephone')].forEach(clearFieldError);
    showStep(0);
  });
  updateSummary();
})();
