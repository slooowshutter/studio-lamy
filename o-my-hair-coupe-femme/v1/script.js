'use strict';

/* Les dates sont des choix d’essai, jamais des disponibilités du salon. */
const SalonCalendar = (() => {
  const opening = [660, 1080]; // Profil Treatwell : 11:00–18:00, mardi–samedi.
  const parisFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const key = date => date.toISOString().slice(0, 10);
  const time = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  function paris(now = new Date()) {
    const parts = Object.fromEntries(parisFormatter.formatToParts(now).map(part => [part.type, part.value]));
    return { date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, 12)), minute: +parts.hour * 60 + +parts.minute };
  }
  function closed(date) { return [0, 1].includes(date.getUTCDay()); }
  function slots(date, now = new Date()) {
    if (!date || closed(date)) return [];
    const current = paris(now);
    return Array.from({ length: (opening[1] - opening[0]) / 60 }, (_, index) => {
      const minute = opening[0] + index * 60;
      const past = key(date) < key(current.date) || (key(date) === key(current.date) && minute <= current.minute);
      const unavailable = (date.getUTCDate() + date.getUTCMonth() + index) % 5 === 3;
      return { minute, available: !past && !unavailable, reason: past ? 'Heure passée' : unavailable ? 'Indisponible dans l’essai' : '' };
    });
  }
  function days(now = new Date()) {
    const current = paris(now);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(current.date);
      date.setUTCDate(date.getUTCDate() + index);
      const isClosed = closed(date);
      const available = !isClosed && slots(date, now).some(slot => slot.available);
      return { date, key: key(date), available, reason: isClosed ? 'Fermé selon Treatwell' : !available ? 'Sans heure d’essai' : '' };
    });
  }
  function validPhone(value) { return /^(?:0|\+33|0033)[1-9]\d{8}$/.test(value.replace(/[\s.()\-]/g, '')); }
  return { opening, key, time, paris, closed, slots, days, validPhone };
})();

/* Interface locale : aucun stockage persistant et aucun envoi réseau. */
function startSalon() {
  const root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panel = $('#panneau-reservation');
  const steps = $('.booking__steps');
  const announce = $('#annonce-reservation');
  const study = $('[data-study]');
  const services = [
    { id: 'highlight', name: 'Balayage HIGHLIGHT' },
    { id: 'gloss', name: 'Coloration GLOSS' },
    { id: 'coupe', name: 'Coupe' },
    { id: 'brushing', name: 'Brushing' },
    { id: 'soin', name: 'Soin capillaire' }
  ];
  const initial = () => ({ service: null, date: null, minute: null, step: 0, reached: 0, success: false });
  let state = initial();
  let transitionTimer;
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const serviceName = () => services.find(service => service.id === state.service)?.name || 'Choisissez un sujet';
  const selectedDate = () => state.date ? new Date(`${state.date}T12:00:00Z`) : null;
  const moment = () => state.date ? `${dateFormat.format(selectedDate())}${state.minute !== null ? ` à ${SalonCalendar.time(state.minute)}` : ' · heure à choisir'}` : 'Jour et heure souhaités à choisir';
  const nextButton = label => `<button class="button button--solid" type="submit">${label} <span aria-hidden="true">→</span></button>`;
  const errorLine = '<p class="inline-error" id="erreur-etape" role="alert"></p>';

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) root.setAttribute('data-clavier', '');
  });
  document.addEventListener('pointerdown', () => root.removeAttribute('data-clavier'), { passive: true });

  function summary() {
    $('#resume-sujet').textContent = serviceName();
    $('#resume-moment').textContent = moment();
    $$('[data-step]').forEach(button => {
      const index = +button.dataset.step;
      button.disabled = index > state.reached;
      if (index === state.step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    steps.hidden = state.success;
  }

  function focusHeading() {
    const heading = panel.querySelector('h3');
    heading?.focus({ preventScroll: true });
  }

  function renderSubject() {
    return `<h3 tabindex="-1">Quel sujet vous intéresse&nbsp;?</h3>
      <p>Un point de départ pour en parler avec le salon. Tarif et durée à confirmer.</p>
      <form novalidate><fieldset class="booking__choices"><legend class="sr-only">Choisir une prestation pour l’essai</legend>
      ${services.map(service => `<label class="choice-row"><input type="radio" name="sujet" value="${service.id}" ${state.service === service.id ? 'checked' : ''} aria-describedby="erreur-etape"><span>${service.name}</span></label>`).join('')}
      </fieldset>${errorLine}${nextButton('Choisir le jour')}</form>`;
  }

  function renderDay() {
    const days = SalonCalendar.days();
    return `<h3 tabindex="-1">Quel jour souhaiteriez-vous venir&nbsp;?</h3>
      <p>Les quatorze prochains jours, à la date de Paris. Lundi et dimanche sont fermés selon le profil Treatwell. Horaires à confirmer.</p>
      <form novalidate><fieldset><legend class="sr-only">Choisir un jour pour l’essai</legend><div class="date-grid">
      ${days.map(day => `<label class="date-option"><input type="radio" name="jour" value="${day.key}" ${day.available ? '' : 'disabled'} ${state.date === day.key ? 'checked' : ''} aria-label="${escape(dateFormat.format(day.date))}${day.reason ? `, ${day.reason}` : ', choix pour l’essai'}" aria-describedby="erreur-etape"><span><span>${shortDay.format(day.date)}</span><b>${day.date.getUTCDate()}</b><span>${shortMonth.format(day.date)}</span>${!day.available ? `<small>${SalonCalendar.closed(day.date) ? 'Fermé' : 'Passé'}</small>` : ''}</span></label>`).join('')}
      </div></fieldset>${errorLine}${nextButton('Choisir l’heure souhaitée')}</form>`;
  }

  function renderTime() {
    return `<h3 tabindex="-1">À quelle heure souhaiteriez-vous venir&nbsp;?</h3>
      <p>${escape(dateFormat.format(selectedDate()))}. Il s’agit d’une heure de début souhaitée. Durée et heure de fin à confirmer avec le salon.</p>
      <form novalidate><fieldset><legend class="sr-only">Choisir une heure pour l’essai</legend><div class="time-grid">
      ${SalonCalendar.slots(selectedDate()).map(slot => `<label class="time-option"><input type="radio" name="heure" value="${slot.minute}" ${slot.available ? '' : 'disabled'} ${state.minute === slot.minute ? 'checked' : ''} aria-label="${SalonCalendar.time(slot.minute)}${slot.reason ? `, ${slot.reason}` : ', choix pour l’essai'}" aria-describedby="erreur-etape"><span><b>${SalonCalendar.time(slot.minute)}</b>${slot.reason ? `<small>${slot.reason}</small>` : ''}</span></label>`).join('')}
      </div></fieldset><p class="small-copy">Les choix indisponibles servent uniquement à illustrer le parcours. Ils ne correspondent pas au planning du salon.</p>${errorLine}${nextButton('Vérifier mon essai')}</form>`;
  }

  function recap() {
    return `<dl class="recap"><div><dt>Votre sujet</dt><dd>${escape(serviceName())}</dd></div><div><dt>Jour souhaité</dt><dd>${escape(dateFormat.format(selectedDate()))}</dd></div><div><dt>Heure souhaitée</dt><dd>${SalonCalendar.time(state.minute)}</dd></div></dl>`;
  }

  function renderDetails() {
    return `<h3 tabindex="-1">Vérifier l’essai.</h3><p>Utilisez des coordonnées fictives. Elles restent dans cette page, sans envoi ni conservation après rechargement.</p>
      ${recap()}<form novalidate>
      <div class="field"><label for="prenom-essai">Prénom pour l’essai</label><input id="prenom-essai" name="prenom" autocomplete="given-name" maxlength="60" required aria-describedby="erreur-prenom"><p id="erreur-prenom" class="inline-error" role="alert"></p></div>
      <div class="field"><label for="telephone-essai">Téléphone pour l’essai</label><input id="telephone-essai" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="22" required aria-describedby="erreur-telephone"><p id="erreur-telephone" class="inline-error" role="alert"></p></div>
      <p class="small-copy">Ce bouton termine une simulation. Pour prendre rendez-vous, contactez directement O...My Hair.</p>${errorLine}${nextButton('Terminer la simulation')}</form>`;
  }

  function renderSuccess() {
    return `<div class="booking__success"><span class="label">Fin de la simulation</span><h3 tabindex="-1">Votre fil est prêt.</h3><p><strong>Aucun rendez-vous n’a été réservé.</strong> Aucune coordonnée n’a été envoyée. Voici uniquement le récapitulatif de votre essai.</p>${recap()}<a class="text-link" href="tel:+33148241853">Appeler pour réserver <span aria-hidden="true">↗</span></a><br><a class="text-link" href="https://omyhair.mytreatwell.fr/" target="_blank" rel="noopener">Réserver sur Treatwell <span class="sr-only">(nouvel onglet)</span><span aria-hidden="true">↗</span></a><br><button class="button button--line" type="button" data-restart>Recommencer l’essai <span aria-hidden="true">↗</span></button></div>`;
  }

  function render(focus = true) {
    panel.innerHTML = state.success ? renderSuccess() : [renderSubject, renderDay, renderTime, renderDetails][state.step]();
    summary();
    if (focus) focusHeading();
  }

  function go(step, { animate = true } = {}) {
    clearTimeout(transitionTimer);
    if (step >= 2) {
      const day = SalonCalendar.days().find(item => item.key === state.date && item.available);
      if (!day) {
        state.date = null;
        state.minute = null;
        state.reached = 1;
        state.step = 1;
        state.success = false;
        render();
        announce.textContent = 'Ce jour ne peut plus être choisi dans l’essai. Choisissez un nouveau jour.';
        $('#erreur-etape').textContent = 'Ce jour ne peut plus être choisi dans l’essai. Choisissez un nouveau jour.';
        return;
      }
    }
    if (step >= 3 && !SalonCalendar.slots(selectedDate()).some(item => item.minute === state.minute && item.available)) {
      state.minute = null;
      state.reached = 2;
      state.step = 2;
      state.success = false;
      render();
      announce.textContent = 'Cette heure est maintenant passée ou indisponible pour l’essai. Choisissez une autre heure.';
      $('#erreur-etape').textContent = 'Cette heure est maintenant passée ou indisponible pour l’essai. Choisissez une autre heure.';
      return;
    }
    const commit = () => {
      state.step = step;
      state.reached = Math.max(state.reached, step);
      render();
      announce.textContent = state.success ? 'Simulation terminée. Aucun rendez-vous réservé, aucune coordonnée envoyée.' : `Étape ${step + 1} sur 4 : ${['le sujet', 'le jour', 'l’heure souhaitée', 'la vérification de l’essai'][step]}.`;
      requestAnimationFrame(() => panel.classList.remove('is-changing'));
    };
    if (animate && !reduced.matches && !root.hasAttribute('data-clavier')) {
      panel.classList.add('is-changing');
      transitionTimer = setTimeout(commit, 110);
    } else {
      panel.classList.remove('is-changing');
      commit();
    }
  }

  function changeStudy(value) {
    study.dataset.choice = value;
    $('#fil-choisi').innerHTML = value === 'gloss' ? 'Coloration<br>GLOSS.' : 'Balayage<br>HIGHLIGHT.';
    $('#continuer-fil').dataset.service = value;
    $$('input[name="technique"]').forEach(input => { input.checked = input.value === value; });
  }

  function chooseSubject(value, focus = false) {
    if (!services.some(service => service.id === value)) return;
    clearTimeout(transitionTimer);
    panel.classList.remove('is-changing');
    state = { ...initial(), service: value };
    if (['highlight', 'gloss'].includes(value)) changeStudy(value);
    render(focus);
  }

  $$('input[name="technique"]').forEach(input => input.addEventListener('change', () => chooseSubject(input.value)));
  $$('[data-service]').forEach(link => link.addEventListener('click', () => chooseSubject(link.dataset.service, true)));
  $$('[data-step]').forEach(button => button.addEventListener('click', () => {
    const step = +button.dataset.step;
    if (step <= state.reached && step !== state.step) go(step);
  }));

  panel.addEventListener('change', event => {
    const input = event.target;
    const error = $('#erreur-etape');
    if (error) error.textContent = '';
    if (input.name === 'sujet') {
      const changed = state.service !== input.value;
      state.service = input.value;
      if (changed) { state.date = null; state.minute = null; state.reached = 0; }
      if (['highlight', 'gloss'].includes(input.value)) changeStudy(input.value);
    }
    if (input.name === 'jour') {
      if (state.date !== input.value) { state.minute = null; state.reached = 1; }
      state.date = input.value;
    }
    if (input.name === 'heure') state.minute = +input.value;
    summary();
  });

  panel.addEventListener('input', event => {
    if (event.target.matches('#prenom-essai, #telephone-essai')) {
      event.target.removeAttribute('aria-invalid');
      const message = document.getElementById(event.target.getAttribute('aria-describedby'));
      if (message) message.textContent = '';
    }
  });

  function error(message, fieldName) {
    $('#erreur-etape').textContent = message;
    panel.querySelector(`input[name="${fieldName}"]:not(:disabled)`)?.focus();
  }

  panel.addEventListener('submit', event => {
    event.preventDefault();
    clearTimeout(transitionTimer);
    if (state.step === 0) {
      if (!state.service) return error('Choisissez un sujet pour poursuivre l’essai.', 'sujet');
      go(1);
    } else if (state.step === 1) {
      const day = SalonCalendar.days().find(item => item.key === state.date && item.available);
      if (!day) return error('Choisissez un jour encore proposé dans cet essai.', 'jour');
      go(2);
    } else if (state.step === 2) {
      const slot = SalonCalendar.slots(selectedDate()).find(item => item.minute === state.minute && item.available);
      if (!slot) {
        state.minute = null;
        render(false);
        return error('Choisissez une heure encore proposée pour cet essai.', 'heure');
      }
      go(3);
    } else if (state.step === 3) {
      const firstName = $('#prenom-essai');
      const phone = $('#telephone-essai');
      const errors = [];
      if (!firstName.value.trim()) errors.push([firstName, 'erreur-prenom', 'Saisissez un prénom fictif pour l’essai.']);
      if (!SalonCalendar.validPhone(phone.value)) errors.push([phone, 'erreur-telephone', 'Utilisez dix chiffres commençant par 0, ou le format +33 suivi de neuf chiffres.']);
      ['erreur-prenom', 'erreur-telephone'].forEach(id => { document.getElementById(id).textContent = ''; });
      [firstName, phone].forEach(input => input.removeAttribute('aria-invalid'));
      if (errors.length) {
        errors.forEach(([input, id, message]) => { input.setAttribute('aria-invalid', 'true'); document.getElementById(id).textContent = message; });
        errors[0][0].focus();
        return;
      }
      // Les champs disparaissent ici. Aucune coordonnée n’est copiée dans l’état.
      state.success = true;
      go(3);
    }
  });

  panel.addEventListener('click', event => {
    if (event.target.closest('[data-restart]')) {
      state = initial();
      go(0);
    }
  });

  $('#simulateur').hidden = false;
  render(false);

  const bar = $('#barre-mobile');
  let heroPassed = false, bookingVisible = false, footerVisible = false;
  function updateBar() {
    const visible = heroPassed && !bookingVisible && !footerVisible;
    bar.classList.toggle('is-visible', visible);
    bar.inert = !visible;
    bar.setAttribute('aria-hidden', String(!visible));
  }
  if ('IntersectionObserver' in window) {
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.id === 'actions-accueil') heroPassed = entry.boundingClientRect.bottom < 0;
        if (entry.target.id === 'rendez-vous') bookingVisible = entry.isIntersecting;
        if (entry.target.id === 'sources') footerVisible = entry.isIntersecting;
      });
      updateBar();
    });
    ['#actions-accueil', '#rendez-vous', '#sources'].forEach(selector => barObserver.observe($(selector)));
    bar.hidden = false;
    updateBar();
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); reveal.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    $$('[data-number], [data-line], [data-study]').forEach(element => reveal.observe(element));
  } else {
    $$('[data-number], [data-line], [data-study]').forEach(element => element.classList.add('is-visible'));
  }

  const progress = $('#progression');
  let scrollRange = 1, ticking = false;
  function updateProgress() {
    ticking = false;
    if (!reduced.matches) progress.style.transform = `scaleY(${Math.min(1, Math.max(0, window.scrollY / scrollRange))})`;
  }
  function measure() { scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); updateProgress(); }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  $('.studio-offer').addEventListener('toggle', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  if (document.fonts?.ready) document.fonts.ready.then(measure);
  measure();

  // Le contenu est lisible par défaut : seule l’interface opérationnelle active les entrées.
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => $('.hero').classList.add('is-visible')));
}

if (typeof module === 'object' && module.exports) module.exports = SalonCalendar;
else startSalon();
