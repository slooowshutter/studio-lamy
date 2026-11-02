/* Gentlemen 76 : aperçu non officiel. Aucune transmission ni conservation de données. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const services = {
    'coupe-homme': 'Coupe homme',
    barbe: 'Taille et soin de la barbe',
    rasage: 'Rasage traditionnel',
    'coupe-enfant': 'Coupe enfant'
  };
  // Horaires publiés dans le dossier de recherche : lundi–samedi 09:00–19:30.
  // Les heures du parcours ne représentent aucune disponibilité réelle ni durée de prestation.
  const opening = 9 * 60;
  const closing = 19 * 60 + 30;
  const state = { service: '', day: '', minute: null, step: 0 };
  const form = $('#formulaire-rdv');
  const panels = $$('[data-panneau]');
  const stepButtons = $$('[data-etape]');
  const announcement = $('#annonce-parcours');
  const partFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const shortDayFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  let panelAnimation = null;

  document.addEventListener('keydown', () => { root.dataset.saisie = 'clavier'; }, true);
  document.addEventListener('pointerdown', () => { root.dataset.saisie = 'pointeur'; }, true);
  const mayAnimate = () => !reducedMotion.matches && root.dataset.saisie !== 'clavier';

  function parisNow() {
    const parts = Object.fromEntries(partFormatter.formatToParts(new Date())
      .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return {
      iso: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }

  function asDay(iso) { return new Date(`${iso}T12:00:00Z`); }
  function displayDay(iso) { return iso ? dayFormatter.format(asDay(iso)) : 'À choisir'; }
  function displayTime(minute) {
    if (minute === null) return 'À choisir';
    return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  }

  function daysAhead() {
    const today = asDay(parisNow().iso);
    return Array.from({ length: 14 }, (_, offset) => {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() + offset);
      return { iso: day.toISOString().slice(0, 10), day, offset };
    });
  }

  function availableDay(iso) {
    const entry = daysAhead().find((day) => day.iso === iso);
    return Boolean(entry && entry.day.getUTCDay() !== 0);
  }

  function timeChoices(iso) {
    if (!availableDay(iso)) return [];
    const now = parisNow();
    const choices = [];
    for (let minute = opening; minute < closing; minute += 60) {
      choices.push({ minute, past: iso === now.iso && minute <= now.minutes });
    }
    return choices;
  }

  function usableDay(iso) { return timeChoices(iso).some((choice) => !choice.past); }

  function validTime() {
    return timeChoices(state.day).some((choice) => choice.minute === state.minute && !choice.past);
  }

  function writeSelection(id, content) {
    const node = $(id);
    if (node.textContent === content) return;
    node.getAnimations?.().forEach((animation) => animation.cancel());
    node.textContent = content;
    if (mayAnimate() && node.animate) {
      node.animate([{ opacity: .25, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }

  function updateSummary() {
    writeSelection('#selection-prestation', services[state.service] || 'À choisir');
    writeSelection('#selection-jour', displayDay(state.day));
    writeSelection('#selection-heure', displayTime(state.minute));
    $('#recapitulatif-texte').textContent = state.service && state.day && state.minute !== null
      ? `${services[state.service]} · ${displayDay(state.day)} · ${displayTime(state.minute)}` : '';
    stepButtons.forEach((button, index) => {
      button.disabled = index > 0 && (!state.service || (index > 1 && !state.day) || (index > 2 && state.minute === null));
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function announce(message) { announcement.textContent = message; }

  function radioChoice(name, value, labelText, checked, disabled) {
    const label = document.createElement('label');
    label.className = 'choix-case';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = String(value);
    input.checked = checked;
    input.disabled = disabled;
    input.setAttribute('aria-label', labelText);
    input.setAttribute('aria-describedby', name === 'jour' ? 'erreur-jour' : 'erreur-heure');
    label.append(input);
    return label;
  }

  function renderDays() {
    const now = parisNow();
    $('#jours').replaceChildren(...daysAhead().map(({ day, iso, offset }) => {
      const closed = day.getUTCDay() === 0;
      const ended = !closed && iso === now.iso && timeChoices(iso).every((choice) => choice.past);
      const status = closed ? 'Fermé' : ended ? 'Heures passées' : offset === 0 ? 'Aujourd’hui' : offset === 1 ? 'Demain' : '';
      const label = radioChoice('jour', iso, `${displayDay(iso)}${status ? `, ${status.toLocaleLowerCase('fr-FR')}` : ''}`, state.day === iso, closed || ended);
      const weekday = document.createElement('span');
      weekday.textContent = shortDayFormatter.format(day);
      const number = document.createElement('span');
      number.className = 'jour-nombre';
      number.textContent = day.getUTCDate();
      const month = document.createElement('span');
      month.className = 'jour-mois';
      month.textContent = monthFormatter.format(day);
      const statusNode = document.createElement('span');
      statusNode.className = 'etat-jour';
      statusNode.textContent = status || '\u00a0';
      label.append(weekday, number, month, statusNode);
      return label;
    }));
  }

  function renderTimes() {
    $('#jour-choisi').textContent = displayDay(state.day);
    $('#heures').replaceChildren(...timeChoices(state.day).map(({ minute, past }) => {
      const label = radioChoice('heure', minute, `${displayTime(minute)}${past ? ', heure passée' : ', heure de démonstration'}`, state.minute === minute, past);
      const time = document.createElement('span');
      time.textContent = displayTime(minute);
      label.append(time);
      if (past) {
        const status = document.createElement('small');
        status.textContent = 'Passée';
        label.append(status);
      }
      return label;
    }));
  }

  function showStep(step, focus = true) {
    const previous = state.step;
    let staleMessage = '';
    if (step >= 1 && step <= 3 && state.day && !usableDay(state.day)) {
      state.day = '';
      state.minute = null;
      step = 1;
      staleMessage = 'Le jour choisi n’offre plus d’heure de démonstration. Choisissez un autre jour.';
    } else if (step >= 2 && step <= 3 && !state.day) {
      step = 1;
      staleMessage = 'Choisissez un jour ouvert pour continuer.';
    } else if (step === 3 && !validTime()) {
      state.minute = null;
      step = 2;
      staleMessage = 'Cette heure est passée pendant votre essai. Choisissez une autre heure.';
    }
    state.step = step;
    panelAnimation?.cancel();
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    if (staleMessage) $(step === 1 ? '#erreur-jour' : '#erreur-heure').textContent = staleMessage;
    panels.forEach((panel) => { panel.hidden = Number(panel.dataset.panneau) !== step; });
    $('.etapes').hidden = step === 4;
    updateSummary();
    const panel = panels[step];
    if (step !== previous && mayAnimate() && panel.animate) {
      const distance = step > previous ? 8 : -8;
      panelAnimation = panel.animate(
        [{ transform: `translateX(${distance}px)`, opacity: .2 }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
      );
    }
    if (focus) {
      const heading = step === 4 ? $('#titre-resultat') : $(`#titre-etape-${step}`);
      heading.focus({ preventScroll: true });
      const rect = heading.getBoundingClientRect();
      if (rect.top < 24 || rect.bottom > window.innerHeight - 100) heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    announce(staleMessage || (step === 4 ? 'Démonstration terminée. Aucun rendez-vous n’a été pris.' : `Étape ${step + 1} sur 4 : ${['prestation', 'jour', 'heure', 'récapitulatif'][step]}.`));
  }

  function chooseService(value) {
    if (!Object.hasOwn(services, value)) return;
    state.service = value;
    const input = $(`input[name="prestation"][value="${value}"]`);
    input.checked = true;
    $('#erreur-prestation').textContent = '';
    updateSummary();
  }

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (input.name === 'prestation') chooseService(input.value);
    if (input.name === 'jour') {
      if (state.day !== input.value) state.minute = null;
      state.day = input.value;
      $('#erreur-jour').textContent = '';
      updateSummary();
      announce(`${displayDay(state.day)} sélectionné pour la démonstration.`);
    }
    if (input.name === 'heure') {
      state.minute = Number(input.value);
      $('#erreur-heure').textContent = '';
      updateSummary();
      announce(`${displayTime(state.minute)} sélectionnée pour la démonstration.`);
    }
  });

  function advanceTo(next) {
    if (next === 1 && !state.service) {
      $('#erreur-prestation').textContent = 'Choisissez une prestation pour continuer.';
      $('input[name="prestation"]').focus();
      return;
    }
    if (next >= 2 && state.day && !usableDay(state.day)) {
      showStep(next);
      return;
    }
    if (next === 2 && !availableDay(state.day)) {
      $('#erreur-jour').textContent = 'Choisissez un jour ouvert pour continuer.';
      $('#jours input:not(:disabled)')?.focus();
      return;
    }
    if (next === 3 && !validTime()) {
      state.minute = null;
      renderTimes();
      updateSummary();
      $('#erreur-heure').textContent = 'Choisissez une heure de démonstration qui n’est pas déjà passée.';
      $('#heures input:not(:disabled)')?.focus();
      return;
    }
    showStep(next);
  }

  $$('[data-suite]').forEach((button) => button.addEventListener('click', () => advanceTo(Number(button.dataset.suite))));

  $$('[data-retour]').forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.retour))));
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    if (!button.disabled) showStep(Number(button.dataset.etape));
  }));

  $$('[data-prestation]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    chooseService(link.dataset.prestation);
    showStep(0, false);
    $('#rendez-vous').scrollIntoView({ block: 'start', behavior: mayAnimate() ? 'smooth' : 'instant' });
    $('#titre-rdv').setAttribute('tabindex', '-1');
    $('#titre-rdv').focus({ preventScroll: true });
    announce(`${services[state.service]} sélectionnée. Parcours de démonstration, aucune réservation réelle.`);
  }));

  const firstName = $('#prenom');
  const telephone = $('#telephone');
  const validPhone = (value) => /^(?:0|(?:\+|00)33)[1-9]\d{8}$/.test(value.replace(/[\s.()\-]/g, ''));

  function validateField(input) {
    const isName = input === firstName;
    const valid = isName ? /\p{L}/u.test(input.value.trim()) : validPhone(input.value.trim());
    const message = isName ? 'Indiquez votre prénom pour terminer l’essai.' : 'Indiquez un numéro français valide à dix chiffres, ou avec l’indicatif +33.';
    input.setAttribute('aria-invalid', String(!valid));
    $(isName ? '#erreur-prenom' : '#erreur-telephone').textContent = valid ? '' : message;
    return valid;
  }

  [firstName, telephone].forEach((input) => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        $(input === firstName ? '#erreur-prenom' : '#erreur-telephone').textContent = '';
      }
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 3) return;
    if (!usableDay(state.day)) {
      state.day = '';
      state.minute = null;
      showStep(1);
      $('#erreur-jour').textContent = 'Le jour choisi n’est plus proposé. Choisissez un autre jour.';
      return;
    }
    if (!validTime()) {
      state.minute = null;
      showStep(2);
      $('#erreur-heure').textContent = 'Cette heure est passée pendant votre essai. Choisissez une autre heure.';
      return;
    }
    const nameValid = validateField(firstName);
    const phoneValid = validateField(telephone);
    if (!nameValid || !phoneValid) {
      (!nameValid ? firstName : telephone).focus();
      announce('Vérifiez les champs indiqués avant de terminer l’essai.');
      return;
    }
    $('#message-resultat').textContent = `${firstName.value.trim()}, voici votre sélection de démonstration : ${services[state.service]}, ${displayDay(state.day)} à ${displayTime(state.minute)}.`;
    // Les coordonnées sont immédiatement effacées des champs une fois l’essai terminé.
    firstName.value = '';
    telephone.value = '';
    showStep(4);
  });

  $('#recommencer').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { service: '', day: '', minute: null });
    $$('.erreur').forEach((node) => { node.textContent = ''; });
    [firstName, telephone].forEach((input) => input.removeAttribute('aria-invalid'));
    $('#message-resultat').textContent = '';
    showStep(0);
  });

  $$('input[name="prestation"]').forEach((input) => input.setAttribute('aria-describedby', 'erreur-prestation'));
  $('#parcours').hidden = false;
  updateSummary();

  const revealNodes = $$('[data-revelation]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .1, rootMargin: '0px 0px -24px 0px' });
    revealNodes.forEach((node) => observer.observe(node));
  } else revealNodes.forEach((node) => node.classList.add('visible'));

  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('pret')));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      panelAnimation?.cancel();
      $$('.fiche-selection dd').forEach((node) => node.getAnimations?.().forEach((animation) => animation.cancel()));
      revealNodes.forEach((node) => node.classList.add('visible'));
    }
  });
})();
