/* Coiffure Unanyme — aperçu local, aucune transmission. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 960px)');
  const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const nbsp = '\u00a0';
  let keyboard = false;
  let stepAnimation;
  let summaryAnimation;

  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('keyboard-use');
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-use');
  }, { passive: true });

  // Planity : mardi–vendredi 09:00–19:00 ; samedi 09:00–18:00.
  // Durées : Forfait Homme 30 min, forfait femme longs 1 h,
  // coloration ton sur ton 1 h 20 min, barbe 20 min. Voir SOURCES.md.
  const hours = [null, null, [540, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1080]];
  const services = [
    { id: 'homme', name: 'Forfait Homme', duration: 30, durationLabel: `30${nbsp}min` },
    { id: 'femme', name: 'Forfait coupe femme cheveux longs', duration: 60, durationLabel: `60${nbsp}min` },
    { id: 'coloration', name: 'Coloration ton sur ton +shampoing brushing', duration: 80, durationLabel: `80${nbsp}min` },
    { id: 'barbe', name: 'Barbe', duration: 20, durationLabel: `20${nbsp}min` }
  ];
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const state = { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false };

  function parisNow(date = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(date).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function dateKey(date) { return date.toISOString().slice(0, 10); }
  function formatTime(minutes) {
    const remainder = minutes % 60;
    return `${Math.floor(minutes / 60)}${nbsp}h${remainder ? nbsp + String(remainder).padStart(2, '0') : ''}`;
  }
  function selectedService() { return services.find(service => service.id === state.service); }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }
  function days() {
    const today = dateFromKey(parisNow().key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() + index);
      return { date, key: dateKey(date), weekday: date.getUTCDay(), index };
    });
  }
  function slots(key, service = selectedService(), now = parisNow()) {
    if (!service || !key || key < now.key) return [];
    const date = dateFromKey(key);
    const interval = hours[date.getUTCDay()];
    if (!interval) return [];
    const result = [];
    const daySeed = Math.floor(date.getTime() / 86400000);
    for (let time = interval[0]; time + service.duration <= interval[1]; time += 30) {
      const past = key === now.key && time <= now.minutes;
      // Un motif déterministe de créneaux écartés illustre les états désactivés.
      // Il ne représente jamais une disponibilité ou une réservation réelle.
      const excluded = (daySeed + time / 30) % 7 === 2;
      result.push({ time, disabled: past || excluded, reason: past ? 'Horaire déjà passé' : excluded ? 'Créneau écarté pour cet essai' : 'Créneau de démonstration' });
    }
    return result;
  }
  function isSelectableDay(key) {
    return days().some(day => day.key === key) && slots(key).some(slot => !slot.disabled);
  }
  function isSelectableTime() {
    return isSelectableDay(state.day) && slots(state.day).some(slot => slot.time === state.time && !slot.disabled);
  }

  const module = $('.booking-module');
  const content = $('#step-content');
  const progress = $$('.booking-progress button');
  const status = $('#booking-status');

  function updateSummary(animate = true) {
    $('#summary-service').textContent = selectedService()?.name || 'À choisir';
    $('#summary-day').textContent = state.day ? longDateFormatter.format(dateFromKey(state.day)) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? formatTime(state.time) : 'À choisir';
    const summary = $('.selection-summary dl');
    if (animate && !keyboard && !reducedMotion.matches && summary.animate) {
      summaryAnimation?.cancel();
      summaryAnimation = summary.animate([{ opacity: .45, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: ease });
    }
  }
  function updateProgress() {
    const allowed = [true, Boolean(state.service), Boolean(state.service && state.day), Boolean(state.service && state.day && state.time !== null)];
    progress.forEach((button, index) => {
      button.disabled = !allowed[index] || state.done;
      if (state.step === index && !state.done) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }
  function focusTitle() {
    const heading = $('.step-title', content);
    heading?.focus({ preventScroll: true });
    const box = heading?.getBoundingClientRect();
    const topInset = mobile.matches ? 105 : 24;
    if (box && (box.top < topInset || box.bottom > window.innerHeight - 90)) {
      heading.scrollIntoView({ block: 'start', behavior: keyboard || reducedMotion.matches ? 'instant' : 'smooth' });
    }
  }
  function changeStep(next, moveFocus = true) {
    const previous = state.step;
    state.step = next;
    renderStep();
    updateProgress();
    updateSummary(false);
    stepAnimation?.cancel();
    if (!keyboard && !reducedMotion.matches && content.animate) {
      stepAnimation = content.animate([
        { opacity: 0, transform: `translateX(${next < previous ? -10 : 10}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 220, easing: ease });
    }
    status.textContent = `Étape ${next + 1} sur 4${nbsp}: ${['choisir une prestation', 'choisir un jour', 'choisir une heure', 'vos coordonnées'][next]}. Simulation uniquement.`;
    if (moveFocus) focusTitle();
  }
  function actions(nextLabel = 'Continuer', submit = false) {
    return `<p class="step-error" id="step-error" role="alert"></p><div class="step-actions">${state.step > 0 ? '<button class="back-button" type="button" data-back>Retour</button>' : ''}<button class="button" type="${submit ? 'submit' : 'button'}" ${submit ? '' : 'data-next'}>${nextLabel}<span aria-hidden="true">→</span></button></div>`;
  }
  function renderStep() {
    if (state.step === 0) {
      content.innerHTML = `<h3 class="step-title" tabindex="-1">Ce qui vous amène.</h3><p class="step-help">Sélectionnez une prestation pour cet essai.</p><fieldset class="radio-list" aria-describedby="step-error"><legend class="sr-only">Votre prestation</legend>${services.map(service => `<label class="radio-row"><input type="radio" name="prestation" value="${service.id}" ${state.service === service.id ? 'checked' : ''}><span>${service.name}<small>${service.durationLabel}</small></span></label>`).join('')}</fieldset>${actions()}`;
    } else if (state.step === 1) {
      content.innerHTML = `<h3 class="step-title" tabindex="-1">Quel jour vous irait&nbsp;?</h3><p class="step-help">Les 14 prochains jours. Fermetures exceptionnelles à confirmer au téléphone.</p><div class="date-grid" role="group" aria-label="Jours de la simulation" aria-describedby="step-error">${days().map(day => {
        const closed = !hours[day.weekday];
        const disabled = closed || !slots(day.key).some(slot => !slot.disabled);
        const note = closed ? 'Fermé' : disabled ? 'Terminé' : monthFormatter.format(day.date);
        return `<button class="date-choice" type="button" data-day="${day.key}" ${disabled ? 'disabled' : ''} aria-pressed="${state.day === day.key}" aria-label="${longDateFormatter.format(day.date)}${closed ? ', fermé' : disabled ? ', horaires passés' : ', simulation'}"><span>${dayNames[day.weekday].slice(0, 3)}.</span><strong>${day.date.getUTCDate()}</strong><small>${note}</small></button>`;
      }).join('')}</div>${actions()}`;
    } else if (state.step === 2) {
      content.innerHTML = `<h3 class="step-title" tabindex="-1">Et à quelle heure&nbsp;?</h3><p class="step-help">${longDateFormatter.format(dateFromKey(state.day))}. Les horaires ci-dessous illustrent le module.</p><div class="time-grid" role="group" aria-label="Heures de la simulation" aria-describedby="step-error">${slots(state.day).map(slot => `<button class="time-choice" type="button" data-time="${slot.time}" ${slot.disabled ? 'disabled' : ''} aria-pressed="${state.time === slot.time}" aria-label="${formatTime(slot.time)}, ${slot.reason.toLowerCase()}">${formatTime(slot.time)}</button>`).join('')}</div><p class="slot-legend">Barrés&nbsp;: horaires passés ou créneaux écartés pour cet essai. Aucune disponibilité réelle n’est affichée.</p>${actions()}`;
    } else {
      content.innerHTML = `<h3 class="step-title" tabindex="-1">Dernière étape de l’essai.</h3><p class="step-help">Les deux champs sont obligatoires pour tester la validation. Rien ne quitte cette page.</p><div class="field"><label for="first-name">Prénom</label><input id="first-name" name="prenom" autocomplete="given-name" maxlength="80" required value="${escapeHtml(state.firstName)}" aria-describedby="name-error"><p class="field-error" id="name-error" aria-live="polite"></p></div><div class="field"><label for="phone-number">Téléphone portable</label><input id="phone-number" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="22" required value="${escapeHtml(state.phone)}" aria-describedby="phone-hint phone-error"><p class="field-hint" id="phone-hint">Un numéro français commençant par 06 ou 07.</p><p class="field-error" id="phone-error" aria-live="polite"></p></div><p class="confirmation-note">Le bouton ci-dessous termine seulement la simulation. Pour un rendez-vous, utilisez Planity ou appelez le salon.</p>${actions('Terminer l’essai', true)}`;
    }
  }
  function error(message) {
    $('#step-error').textContent = message;
  }
  function next() {
    if (state.step === 0 && !state.service) {
      error('Choisissez une prestation pour continuer.');
      $('input[name="prestation"]', content)?.focus();
      return;
    }
    if (state.step === 1 && !isSelectableDay(state.day)) {
      error('Choisissez un jour proposé dans la simulation.');
      $('.date-choice:not(:disabled)', content)?.focus();
      return;
    }
    if (state.step === 2 && !isSelectableTime()) {
      error('Choisissez une heure proposée. Les horaires passés sont désactivés.');
      $('.time-choice:not(:disabled)', content)?.focus();
      return;
    }
    changeStep(state.step + 1);
  }
  function validateField(input) {
    const name = input.id === 'first-name';
    const value = input.value.trim();
    const normalized = value.replace(/[\s().-]/g, '').replace(/^(?:\+33|0033)/, '0');
    const valid = name ? value.length > 0 : /^0[67]\d{8}$/.test(normalized);
    const message = valid ? '' : name ? 'Indiquez votre prénom pour tester la validation.' : 'Saisissez un numéro portable français complet, commençant par 06 ou 07.';
    input.setAttribute('aria-invalid', String(!valid));
    $(name ? '#name-error' : '#phone-error').textContent = message;
    return valid;
  }
  function success() {
    state.done = true;
    state.firstName = '';
    state.phone = '';
    content.innerHTML = `<div class="success-state"><p class="small-label">Simulation terminée</p><h3 class="step-title" tabindex="-1">Le repère est posé.</h3><p>Vous avez parcouru toutes les étapes. <strong>Aucun rendez-vous n’a été pris.</strong> Rien n’a été envoyé au salon.</p><div class="success-recap"><p>${selectedService().name}</p><p>${longDateFormatter.format(dateFromKey(state.day))}<br>à ${formatTime(state.time)}</p><p>12 rue Copernic, 44000 Nantes<br>Récapitulatif de démonstration.</p></div><a class="text-link" href="https://www.planity.com/coiffure-unanyme-44000-nantes" target="_blank" rel="noopener">Réserver sur Planity <span aria-hidden="true">↗</span></a><button class="back-button" type="button" data-restart>Recommencer l’essai</button></div>`;
    updateProgress();
    status.textContent = 'Simulation terminée. Aucun rendez-vous n’a été pris. Rien n’a été envoyé au salon.';
    focusTitle();
    if (!keyboard && !reducedMotion.matches && content.animate) {
      stepAnimation?.cancel();
      stepAnimation = content.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250, easing: ease });
    }
  }

  module.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-next')) next();
    else if (button.hasAttribute('data-back')) changeStep(state.step - 1);
    else if (button.hasAttribute('data-step')) changeStep(Number(button.dataset.step));
    else if (button.hasAttribute('data-day')) {
      if (state.day !== button.dataset.day) { state.day = button.dataset.day; state.time = null; }
      $$('.date-choice', content).forEach(day => day.setAttribute('aria-pressed', String(day === button)));
      error(''); updateSummary(); updateProgress();
    } else if (button.hasAttribute('data-time')) {
      state.time = Number(button.dataset.time);
      $$('.time-choice', content).forEach(time => time.setAttribute('aria-pressed', String(time === button)));
      error(''); updateSummary(); updateProgress();
    } else if (button.hasAttribute('data-restart')) {
      Object.assign(state, { step: 0, service: '', day: '', time: null, firstName: '', phone: '', done: false });
      changeStep(0);
    }
  });
  module.addEventListener('change', event => {
    if (event.target.name !== 'prestation') return;
    if (state.service !== event.target.value) {
      state.service = event.target.value;
      state.day = ''; state.time = null;
    }
    error(''); updateSummary(); updateProgress();
  });
  content.addEventListener('input', event => {
    if (event.target.id === 'first-name') state.firstName = event.target.value;
    if (event.target.id === 'phone-number') state.phone = event.target.value;
    if (event.target.matches('.field input') && event.target.hasAttribute('aria-invalid')) validateField(event.target);
  });
  content.addEventListener('focusout', event => {
    if (event.target.matches('.field input') && event.target.value) validateField(event.target);
  });
  $('#simulation-form').addEventListener('submit', event => {
    event.preventDefault();
    if (state.done) return;
    if (state.step < 3) { next(); return; }
    if (!isSelectableTime()) {
      state.time = null;
      changeStep(2);
      error('Ce créneau est passé depuis votre sélection. Choisissez une autre heure pour cet essai.');
      return;
    }
    const fields = $$('.field input', content);
    const valid = fields.map(validateField);
    const firstInvalid = valid.indexOf(false);
    if (firstInvalid !== -1) { fields[firstInvalid].focus(); return; }
    success();
  });
  $$('[data-service]').forEach(link => link.addEventListener('click', () => {
    state.service = link.dataset.service;
    state.day = ''; state.time = null; state.done = false;
    changeStep(0, false);
    // L’ancre conduit au module ; le focus suit le titre sans saut supplémentaire.
    requestAnimationFrame(() => $('.step-title', content).focus({ preventScroll: true }));
  }));

  // La navigation suit la colonne de lecture, sans gestionnaire de défilement.
  const links = $$('.panel-nav a');
  const cursor = $('.nav-cursor');
  let activeLink = links[0];
  function markActive(link) {
    activeLink = link;
    links.forEach(item => item === link ? item.setAttribute('aria-current', 'location') : item.removeAttribute('aria-current'));
    cursor.style.transform = `translateY(${link.offsetTop}px)`;
  }
  links.forEach(link => link.addEventListener('click', () => markActive(link)));
  const panel = $('.fixed-panel');
  function fitPanel() {
    // Si la fenêtre est courte, le bas du panneau reste atteignable au défilement.
    if (mobile.matches) panel.style.removeProperty('top');
    else panel.style.top = `${Math.min(0, window.innerHeight - panel.offsetHeight)}px`;
  }
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      const active = entries.find(entry => entry.isIntersecting);
      if (active) {
        const link = links.find(item => item.hash === `#${active.target.id}`);
        if (link) markActive(link);
      }
    }, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
    links.forEach(link => sectionObserver.observe($(link.hash)));

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    $$('[data-reveal], [data-reveal-group]').forEach(element => revealObserver.observe(element));
  } else {
    $$('[data-reveal], [data-reveal-group]').forEach(element => element.classList.add('is-visible'));
  }
  let resizeFrame;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { markActive(activeLink); fitPanel(); });
  }, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => { fitPanel(); markActive(activeLink); });
    }).observe(panel);
  }
  reducedMotion.addEventListener('change', () => {
    stepAnimation?.cancel(); summaryAnimation?.cancel();
  });

  // Actualiser un essai laissé ouvert : aucune heure passée ne reste confirmable.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || state.done) return;
    if (state.day && !isSelectableDay(state.day)) {
      state.day = ''; state.time = null;
      if (state.step > 0) changeStep(1, false);
    } else if (state.time !== null && !isSelectableTime()) {
      state.time = null;
      if (state.step > 1) changeStep(2, false);
    } else if (state.step === 1 || state.step === 2) {
      renderStep();
    }
    updateSummary(false); updateProgress();
  });

  renderStep();
  updateProgress();
  module.hidden = false;
  root.classList.add('js');
  // Les textes restent immédiatement accessibles ; seule l’entrée visuelle attend.
  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => {
    root.classList.add('is-ready'); markActive(activeLink); fitPanel();
    // Libérer les contrôles après l’entrée : leur pression retrouve ses 160 ms.
    setTimeout(() => $$('.entrance').forEach(element => element.classList.remove('entrance')), 900);
  }));
  if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 500))]).then(ready);
  else ready();
})();
