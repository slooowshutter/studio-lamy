(() => {
  'use strict';

  /* Données publiées : iCoiffeur et Fresha, recherche du 17/11/2026.
     Aucune durée, aucun prix, aucune disponibilité réelle n’est déduit. */
  const HOURS = { 0: null, 1: [840, 1110], 2: [540, 1110], 3: [540, 1110], 4: [540, 1110], 5: [540, 1110], 6: [480, 1050] };
  const NB = '\u00a0';
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  // Début des fonctions vérifiables, sans accès au document.
  function parisNow(instant = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(instant).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function hoursFor(key) { return HOURS[dateFromKey(key).getUTCDay()]; }
  function formatHour(minutes) {
    const hour = Math.floor(minutes / 60);
    const part = minutes % 60;
    return `${hour}${NB}h${part ? NB + String(part).padStart(2, '0') : ''}`;
  }
  function slotsFor(key, instant = new Date()) {
    const span = hoursFor(key);
    const now = parisNow(instant);
    if (!span || key < now.key) return [];
    const slots = [];
    // Repères d’heure pour l’essai : l’espacement n’est pas une durée de prestation.
    for (let time = span[0]; time < span[1]; time += 60) {
      slots.push({ time, past: key === now.key && time <= now.minutes });
    }
    return slots;
  }
  function daysFor(instant = new Date()) {
    const first = dateFromKey(parisNow(instant).key);
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(first.getTime() + offset * 86400000);
      const key = date.toISOString().slice(0, 10);
      const closed = !hoursFor(key);
      return { date, key, closed, ended: !closed && !slotsFor(key, instant).some(slot => !slot.past) };
    });
  }
  function validPhone(value) {
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(value.replace(/[\s.()-]/g, ''));
  }
  // Fin des fonctions vérifiables.

  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => [...scope.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  doc.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) root.classList.add('keyboard');
  }, true);
  doc.addEventListener('pointerdown', () => root.classList.remove('keyboard'), true);
  const moves = () => !reducedMotion.matches && !root.classList.contains('keyboard');
  const folds = $$('.fold');
  let activeFold = folds[0];
  let activeStep = 0;
  let stepRevision = 0;
  const model = { choice: false, day: '', time: null, complete: false };

  /* Accordéon : un seul panneau ; les liens ouvrent leur vraie destination.
     Les panneaux fermés sortent immédiatement du parcours clavier. */
  function setFold(fold, open) {
    const button = $('.fold-toggle', fold);
    const body = $('.fold-body', fold);
    button.setAttribute('aria-expanded', String(open));
    fold.classList.toggle('is-open', open);
    body.inert = !open;
    body.setAttribute('aria-hidden', String(!open));
    fold.classList.remove('is-settled');
    if (open && !moves()) fold.classList.add('is-settled', 'was-opened');
    else if (open) {
      requestAnimationFrame(() => {
        if (fold.classList.contains('is-open')) fold.classList.add('is-settled', 'was-opened');
      });
    }
  }
  function openFold(id, focus = false) {
    const fold = doc.getElementById(id);
    if (!fold || !fold.classList.contains('fold')) return;
    folds.forEach(item => setFold(item, item === fold));
    activeFold = fold;
    root.classList.toggle('booking-open', fold.id === 'rendez-vous');
    if (focus) $('.fold-toggle', fold).focus({ preventScroll: true });
  }
  folds.forEach(fold => {
    setFold(fold, fold === activeFold);
    $('.fold-toggle', fold).addEventListener('click', () => {
      // Garder toujours un volet ouvert conserve un point de lecture stable.
      if (fold !== activeFold) {
        openFold(fold.id);
        requestAnimationFrame(() => $('.fold-toggle', fold).scrollIntoView({ block: 'nearest', behavior: 'instant' }));
      }
    });
    $('.fold-toggle', fold).addEventListener('keydown', event => {
      const index = folds.indexOf(fold);
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % folds.length;
      if (event.key === 'ArrowUp') next = (index - 1 + folds.length) % folds.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = folds.length - 1;
      if (next !== undefined) { event.preventDefault(); $('.fold-toggle', folds[next]).focus(); }
    });
  });
  $$('[data-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const id = link.dataset.open;
    openFold(id, true);
    history.replaceState(null, '', `#${id}`);
    doc.getElementById(id).scrollIntoView({ block: 'start', behavior: moves() ? 'smooth' : 'instant' });
  }));
  function openFromHash() {
    const hash = location.hash.slice(1);
    const target = doc.getElementById(hash);
    const fold = target && target.closest('.fold');
    if (fold) openFold(fold.id);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* La synthèse reste distincte de l’interface active, sans données stockées. */
  function updateSummary() {
    $('#recap-choix').textContent = model.choice ? 'Coiffure mixte' : 'À choisir';
    $('#recap-jour').textContent = model.day ? longFormatter.format(dateFromKey(model.day)) : 'À choisir';
    $('#recap-heure').textContent = model.time === null ? 'À choisir' : formatHour(model.time);
    const recap = model.day && model.time !== null
      ? `Votre essai${NB}: coiffure mixte, ${longFormatter.format(dateFromKey(model.day))} à ${formatHour(model.time)}. Aucune réservation réelle.`
      : '';
    $('#recap-confirmation').textContent = recap;
    const allowed = [true, model.choice, Boolean(model.choice && model.day), Boolean(model.choice && model.day && model.time !== null)];
    $$('.booking-steps button').forEach((button, index) => {
      button.disabled = !allowed[index] || model.complete;
      if (index === activeStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function announce(text) { $('#annonce-etape').textContent = text; }
  function showStep(index, focus = true) {
    const previous = $(`[data-pane="${activeStep}"]`);
    const next = $(`[data-pane="${index}"]`);
    const revision = ++stepRevision;
    const wasSame = activeStep === index;
    activeStep = index;
    $$('.booking-step').forEach(pane => {
      pane.classList.remove('is-arriving', 'is-departing');
      if (pane !== previous && pane !== next) pane.hidden = true;
    });
    next.hidden = false;
    next.inert = false;
    if (previous !== next) {
      previous.inert = true;
      if (moves()) {
        previous.classList.add('is-departing');
        next.classList.add('is-arriving');
      }
      // La lecture et le focus sont disponibles sans attendre la transition.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (stepRevision === revision) next.classList.remove('is-arriving');
      }));
      const finish = () => {
        if (stepRevision !== revision) return;
        previous.hidden = true;
        previous.classList.remove('is-departing');
      };
      if (!moves()) finish();
      else setTimeout(finish, 240);
    }
    if (focus && (!wasSame || index === 0)) $('h3', next).focus({ preventScroll: true });
    updateSummary();
    if (focus) {
      announce(`Étape ${Math.min(index + 1, 4)}${NB}: ${$('h3', next).textContent.trim()}`);
      if (window.innerWidth < 701) $('h3', next).scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  /* Jours : quatorze dates civiles de Paris, indépendantes du fuseau du visiteur. */
  function renderDays() {
    const container = $('#choix-jours');
    container.replaceChildren();
    daysFor().forEach(day => {
      const label = doc.createElement('label');
      label.className = 'day-option';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = day.key;
      input.disabled = day.closed || day.ended;
      input.checked = model.day === day.key;
      input.setAttribute('aria-label', `${longFormatter.format(day.date)}${day.closed ? ', fermé' : day.ended ? ', journée écoulée' : ', exemple de démonstration'}`);
      input.setAttribute('aria-describedby', 'erreur-jour');
      const content = doc.createElement('span');
      const weekday = doc.createElement('span'); weekday.className = 'day-name'; weekday.textContent = dayFormatter.format(day.date);
      const number = doc.createElement('span'); number.className = 'day-number'; number.textContent = String(day.date.getUTCDate());
      const month = doc.createElement('span'); month.className = 'day-month'; month.textContent = monthFormatter.format(day.date);
      content.append(weekday, number, month);
      if (day.closed || day.ended) {
        const state = doc.createElement('span'); state.className = 'day-state'; state.textContent = day.closed ? 'fermé' : 'écoulé'; content.append(state);
      }
      label.append(input, content); container.append(label);
      input.addEventListener('change', () => {
        model.day = day.key; model.time = null;
        $('#erreur-jour').textContent = ''; renderSlots(); updateSummary();
      });
    });
  }
  function renderSlots() {
    const container = $('#choix-heures');
    container.replaceChildren();
    if (!model.day) return;
    $('#jour-selectionne').textContent = longFormatter.format(dateFromKey(model.day));
    slotsFor(model.day).forEach(slot => {
      const label = doc.createElement('label'); label.className = 'slot-option';
      const input = doc.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(slot.time);
      input.checked = model.time === slot.time; input.disabled = slot.past;
      input.setAttribute('aria-label', `${formatHour(slot.time)}, ${slot.past ? 'heure écoulée' : 'heure de démonstration'}`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      const text = doc.createElement('span'); text.textContent = formatHour(slot.time);
      if (slot.past) { const note = doc.createElement('small'); note.textContent = 'heure écoulée'; text.append(note); }
      label.append(input, text); container.append(label);
      input.addEventListener('change', () => { model.time = slot.time; $('#erreur-heure').textContent = ''; updateSummary(); });
    });
  }
  const categoryInput = $('[name="categorie"]');
  categoryInput.setAttribute('aria-describedby', 'erreur-choix');
  categoryInput.addEventListener('change', () => { model.choice = categoryInput.checked; $('#erreur-choix').textContent = ''; updateSummary(); });

  function validCurrentChoice() {
    if (!model.day) return false;
    return slotsFor(model.day).some(slot => slot.time === model.time && !slot.past);
  }
  function advance(index) {
    if (index === 1) {
      if (!model.choice) { $('#erreur-choix').textContent = 'Choisissez la catégorie pour essayer le parcours.'; categoryInput.focus(); return; }
      renderDays();
    }
    if (index === 2) {
      if (!model.day || !daysFor().some(day => day.key === model.day && !day.closed && !day.ended)) {
        model.day = ''; model.time = null; renderDays(); renderSlots(); showStep(1);
        $('#erreur-jour').textContent = 'Choisissez un jour proposé pour l’essai.';
        announce('Choisissez un jour proposé pour l’essai.');
        const input = $('#choix-jours input:not(:disabled)'); if (input) input.focus(); return;
      }
      renderSlots();
    }
    if (index === 3 && !validCurrentChoice()) {
      model.time = null;
      if (!model.day || !daysFor().some(day => day.key === model.day && !day.closed && !day.ended)) {
        model.day = ''; renderDays(); renderSlots(); showStep(1);
        $('#erreur-jour').textContent = 'Choisissez à nouveau un jour pour l’essai.';
        announce('Le jour de l’essai est écoulé. Choisissez à nouveau.');
        const day = $('#choix-jours input:not(:disabled)'); if (day) day.focus();
        return;
      }
      showStep(2);
      $('#erreur-heure').textContent = 'Choisissez une heure proposée pour l’essai.';
      renderSlots(); updateSummary();
      announce('Choisissez une heure proposée pour l’essai.');
      const input = $('#choix-heures input:not(:disabled)'); if (input) input.focus(); return;
    }
    showStep(index);
  }
  $$('[data-next]').forEach(button => button.addEventListener('click', () => advance(Number(button.dataset.next))));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.back);
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    showStep(step);
  }));
  $$('.booking-steps button').forEach(button => button.addEventListener('click', () => {
    const step = Number(button.dataset.step);
    if (step > 0) advance(step);
    else showStep(step);
  }));

  /* Validation locale : aucun envoi réseau, aucune sauvegarde du formulaire. */
  const form = $('#formulaire');
  function fieldError(id, message) {
    const input = doc.getElementById(id);
    input.setAttribute('aria-invalid', String(Boolean(message)));
    doc.getElementById(`erreur-${id}`).textContent = message;
  }
  ['prenom', 'telephone'].forEach(id => doc.getElementById(id).addEventListener('input', () => fieldError(id, '')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const firstName = $('#prenom').value.trim();
    const phone = $('#telephone').value.trim();
    const nameError = firstName.length < 1 || !/\p{L}/u.test(firstName) ? 'Indiquez un prénom pour cet essai.' : '';
    const phoneError = validPhone(phone) ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.';
    fieldError('prenom', nameError); fieldError('telephone', phoneError);
    if (nameError || phoneError) {
      doc.getElementById(nameError ? 'prenom' : 'telephone').focus();
      announce('Vérifiez les champs indiqués avant de terminer l’essai.'); return;
    }
    if (!validCurrentChoice()) {
      model.time = null; renderDays(); renderSlots(); showStep(1);
      $('#erreur-jour').textContent = 'Le jour ou l’heure de cet essai est maintenant écoulé. Choisissez à nouveau.';
      return;
    }
    $('#message-fin').textContent = `${firstName}, vous avez essayé le parcours pour le ${longFormatter.format(dateFromKey(model.day))} à ${formatHour(model.time)}, en coiffure mixte.`;
    model.complete = true;
    form.reset();
    showStep(4);
    announce('Démonstration terminée. Aucun rendez-vous n’a été réservé. Rien n’a été envoyé.');
  });
  $('#recommencer').addEventListener('click', () => {
    model.choice = false; model.day = ''; model.time = null; model.complete = false;
    categoryInput.checked = false; form.reset();
    ['prenom', 'telephone'].forEach(id => fieldError(id, ''));
    $$('.form-error').forEach(node => { node.textContent = ''; });
    $('#message-fin').textContent = '';
    renderDays(); $('#choix-heures').replaceChildren(); showStep(0);
  });
  $('#demonstration').hidden = false;
  renderDays(); updateSummary();

  /* Révélations ponctuelles : chiffres de repérage, peigne, pli de l’adresse. */
  root.classList.add('js');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('was-seen'); observer.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    folds.forEach(fold => observer.observe(fold));
  } else folds.forEach(fold => fold.classList.add('was-seen'));
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  if (doc.fonts) Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 500))]).then(ready);
  else ready();
})();
