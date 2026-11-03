(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const hours = {
    0: null,
    1: null,
    2: [570, 1140],
    3: [570, 1140],
    4: [570, 1140],
    5: [570, 1140],
    6: [570, 1110]
  };
  const services = [
    { id: 'homme', name: 'Shampoing Coupe Coiffage', duration: 30 },
    { id: 'etudiant', name: 'Shampooing Coupe Coiffage Etudiant', duration: 30 },
    { id: 'courts', name: 'Shampoing Coupe Brushing - Cheveux Courts', duration: 50 },
    { id: 'milongs', name: 'Shampoing+Coupe Brushing - Cheveux Mi-Longs', duration: 55 },
    { id: 'longs', name: 'Shampoing Coupe Brushing - Cheveux Longs', duration: 60 },
    { id: 'brushing', name: 'Shampoing Brushing - Cheveux Courts', duration: 40 }
  ];
  const state = { step: 0, service: null, date: null, time: null, name: '', phone: '' };
  const panel = $('#booking-panel');
  const stepCount = $('#step-count');
  const announcement = $('#step-announcement');
  const summaryEdit = $('#summary-edit');
  const summaryEditList = $('#summary-edit-list');

  if (window.__revealFallback) window.clearTimeout(window.__revealFallback);

  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const frenchDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const shortWeekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const parisNowFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function parisNow() {
    const parts = {};
    for (const part of parisNowFormat.formatToParts(new Date())) parts[part.type] = part.value;
    return {
      year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
      minutes: Number(parts.hour) * 60 + Number(parts.minute)
    };
  }

  function parisBaseDate() {
    const now = parisNow();
    return new Date(Date.UTC(now.year, now.month - 1, now.day, 12));
  }

  function isoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function dayFromISO(value) {
    return new Date(`${value}T12:00:00Z`);
  }

  function cap(value) {
    return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  }

  function frenchTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${hour}${NB}h${NB}${String(minute).padStart(2, '0')}` : `${hour}${NB}h`;
  }

  function shortTime(minutes) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  function isSimulatedUnavailable(date, minutes) {
    const seed = `${date}-${minutes}`;
    const value = Array.from(seed).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
    return value % 6 === 0;
  }

  function candidateTimes(dateValue, service) {
    const date = dayFromISO(dateValue);
    const schedule = hours[date.getUTCDay()];
    if (!schedule || !service) return [];
    const [start, close] = schedule;
    const today = parisNow();
    const sameDay = dateValue === isoDate(parisBaseDate());
    const result = [];
    for (let minute = start; minute + service.duration <= close; minute += 30) {
      const past = sameDay && minute <= today.minutes;
      result.push({ minute, past, unavailable: !past && isSimulatedUnavailable(dateValue, minute) });
    }
    return result;
  }

  function updateSummary() {
    $('#summary-service').textContent = state.service ? state.service.name : 'À choisir';
    $('#summary-day').textContent = state.date ? cap(frenchDate.format(dayFromISO(state.date))) : 'À choisir';
    $('#summary-time').textContent = state.time !== null ? frenchTime(state.time) : 'À choisir';
    const hasSelection = Boolean(state.service);
    summaryEdit.hidden = !hasSelection;
    summaryEdit.setAttribute('aria-expanded', String(!summaryEditList.hidden));
    const completed = [Boolean(state.service), Boolean(state.date), state.time !== null];
    $$('[data-etape]', summaryEditList).forEach((button) => {
      button.hidden = !completed[Number(button.dataset.etape)];
    });
  }

  function setStepText(title, current) {
    stepCount.textContent = current === 4 ? 'Simulation terminée' : `Étape ${current} sur 4`;
    announcement.textContent = current === 4 ? 'Confirmation de la simulation' : `${title} · étape ${current} sur 4`;
  }

  function stepHeading(title, help) {
    return `<h3 id="etape-titre" tabindex="-1">${title}</h3><p class="step-help">${help}</p>`;
  }

  function errorLine(message) {
    return `<p class="form-error" id="erreur-etape" role="status" aria-live="polite">${message}</p>`;
  }

  function renderServiceStep() {
    const choices = services.map((service) => `
      <label class="choice-row">
        <input type="radio" name="prestation" value="${service.id}" ${state.service?.id === service.id ? 'checked' : ''}>
        <span class="choice-row__body"><span class="choice-row__name">${escapeHTML(service.name)}</span><span class="choice-row__duration">${service.duration}${NB}min</span></span>
      </label>`).join('');
    return `<form class="flow-form" data-step="0">
      ${stepHeading('Choisissez la prestation', 'Durées relevées sur Planity. Aucun tarif n’apparaît dans cette simulation.')}
      <fieldset class="choice-list" aria-label="Prestations proposées dans la simulation">${choices}</fieldset>
      ${errorLine('')}
      <div class="step-actions"><span></span><button class="step-button" type="submit">Continuer vers le jour</button></div>
    </form>`;
  }

  function renderDayStep() {
    const base = parisBaseDate();
    const days = Array.from({ length: 14 }, (_, index) => new Date(base.getTime() + index * 86400000));
    const choices = days.map((date) => {
      const value = isoDate(date);
      const closed = hours[date.getUTCDay()] === null;
      const checked = state.date === value;
      const dayName = shortWeekday.format(date).replace(/\.$/, '');
      const month = shortMonth.format(date).replace(/\.$/, '');
      const accessible = `${cap(frenchDate.format(date))}${closed ? ' · fermé' : ''}`;
      return `<label class="day-choice">
        <input type="radio" name="jour" value="${value}" ${checked ? 'checked' : ''} ${closed ? 'disabled' : ''} aria-label="${escapeHTML(accessible)}">
        <span class="day-choice__face"><span class="day-choice__name">${escapeHTML(dayName)}</span><span class="day-choice__number">${date.getUTCDate()}</span><span class="day-choice__closed">${closed ? 'Fermé' : escapeHTML(month)}</span></span>
      </label>`;
    }).join('');
    return `<form class="flow-form" data-step="1">
      ${stepHeading('Choisissez un jour', 'Jours fermés désactivés selon les horaires publiés. Horaires à confirmer.')}
      <fieldset class="choice-list" aria-label="Choisissez un jour d’ouverture"><div class="day-list">${choices}</div></fieldset>
      ${errorLine('')}
      <div class="step-actions"><button class="step-button step-button--back" type="button" data-retour="0">Précédent</button><button class="step-button" type="submit">Voir les heures</button></div>
    </form>`;
  }

  function renderTimeStep() {
    const choices = candidateTimes(state.date, state.service);
    const buttons = choices.map((choice) => {
      const selected = state.time === choice.minute;
      const disabled = choice.past || choice.unavailable;
      const label = choice.past ? `${frenchTime(choice.minute)} · heure passée` : choice.unavailable ? `${frenchTime(choice.minute)} · indisponible dans la simulation` : `Choisir ${frenchTime(choice.minute)}`;
      return `<button class="time-choice" type="button" data-heure="${choice.minute}" aria-pressed="${selected}" aria-label="${label}" ${disabled ? 'disabled' : ''}><span>${frenchTime(choice.minute)}</span>${choice.unavailable ? '<small>Indisponible</small>' : ''}</button>`;
    }).join('');
    return `<form class="flow-form" data-step="2">
      ${stepHeading('Choisissez une heure', 'Créneaux de démonstration dans les horaires affichés. Les indisponibilités sont fictives.')}
      ${choices.length ? `<div class="time-list" aria-label="Heures simulées">${buttons}</div>` : '<p class="no-times">Aucun créneau simulé ne reste ce jour. Choisissez un autre jour.</p>'}
      ${errorLine('')}
      <div class="step-actions"><button class="step-button step-button--back" type="button" data-retour="1">Précédent</button><button class="step-button" type="submit">Continuer</button></div>
    </form>`;
  }

  function renderContactStep() {
    return `<form class="flow-form" data-step="3" novalidate>
      ${stepHeading('Vos coordonnées', 'Elles servent uniquement à compléter cette démonstration. Rien ne sera envoyé.')}
      <div class="field-stack">
        <div class="form-field"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" maxlength="50" value="${escapeHTML(state.name)}" aria-describedby="erreur-etape" placeholder="Votre prénom"></div>
        <div class="form-field"><label for="telephone">Téléphone mobile</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="${escapeHTML(state.phone)}" aria-describedby="erreur-etape" placeholder="06 12 34 56 78"></div>
      </div>
      ${errorLine('')}
      <div class="step-actions"><button class="step-button step-button--back" type="button" data-retour="2">Précédent</button><button class="step-button" type="submit">Confirmer la simulation</button></div>
    </form>`;
  }

  function renderSuccessStep() {
    const selectedDay = state.date ? cap(frenchDate.format(dayFromISO(state.date))) : '';
    return `<div class="success-card">
      <h3 id="etape-titre" tabindex="-1">C’est noté pour la démonstration.</h3>
      <p>${escapeHTML(state.name)}, la carte indique <strong>${escapeHTML(state.service.name)}</strong>, le <strong>${escapeHTML(selectedDay)}</strong> à <strong>${escapeHTML(frenchTime(state.time))}</strong>.</p>
      <p>Rien n’a été envoyé et aucun rendez-vous n’a été réservé.</p>
      <div class="step-actions"><button class="step-button" type="button" data-recommencer>Recommencer</button></div>
    </div>`;
  }

  function render(options = {}) {
    let title;
    if (state.step === 0) {
      title = 'Choisissez la prestation';
      panel.innerHTML = renderServiceStep();
    } else if (state.step === 1) {
      title = 'Choisissez un jour';
      panel.innerHTML = renderDayStep();
    } else if (state.step === 2) {
      title = 'Choisissez une heure';
      panel.innerHTML = renderTimeStep();
    } else if (state.step === 3) {
      title = 'Vos coordonnées';
      panel.innerHTML = renderContactStep();
    } else {
      title = 'Confirmation de la simulation';
      panel.innerHTML = renderSuccessStep();
    }
    setStepText(title, Math.min(state.step + 1, 4));
    updateSummary();
    if (options.focus) {
      const heading = $('#etape-titre', panel);
      if (heading) heading.focus({ preventScroll: true });
    }
  }

  let transitionPending = false;
  function changeStep(next) {
    if (next < 0 || next > 4 || next === state.step || transitionPending) return;
    transitionPending = true;
    panel.classList.add('is-leaving');
    const wait = reduceMotion.matches ? 0 : 120;
    window.setTimeout(() => {
      state.step = next;
      render({ focus: true });
      panel.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        panel.classList.remove('is-entering');
        transitionPending = false;
      }));
    }, wait);
  }

  function findService(id) {
    return services.find((service) => service.id === id) || null;
  }

  function showError(message) {
    const error = $('#erreur-etape', panel);
    if (error) error.textContent = message;
  }

  panel.addEventListener('change', (event) => {
    const control = event.target;
    if (control.name === 'prestation') {
      if (state.service?.id !== control.value) {
        state.date = null;
        state.time = null;
      }
      state.service = findService(control.value);
      updateSummary();
    }
    if (control.name === 'jour') {
      state.date = control.value;
      state.time = null;
      updateSummary();
    }
  });

  panel.addEventListener('click', (event) => {
    const timeButton = event.target.closest('[data-heure]');
    if (timeButton) {
      state.time = Number(timeButton.dataset.heure);
      $$('.time-choice', panel).forEach((button) => button.setAttribute('aria-pressed', String(button === timeButton)));
      updateSummary();
    }
    const backButton = event.target.closest('[data-retour]');
    if (backButton) changeStep(Number(backButton.dataset.retour));
    if (event.target.closest('[data-recommencer]')) {
      state.step = 0;
      state.service = null;
      state.date = null;
      state.time = null;
      state.name = '';
      state.phone = '';
      summaryEditList.hidden = true;
      render({ focus: true });
    }
  });

  panel.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    if (state.step === 0) {
      const selected = $('input[name="prestation"]:checked', form);
      if (selected && state.service?.id !== selected.value) {
        state.date = null;
        state.time = null;
        state.service = findService(selected.value);
      }
      if (!state.service) return showError('Choisissez une prestation pour continuer.');
      state.time = null;
      updateSummary();
      changeStep(1);
      return;
    }
    if (state.step === 1) {
      const selected = $('input[name="jour"]:checked', form);
      if (selected && !selected.disabled) state.date = selected.value;
      if (!state.date) return showError('Choisissez un jour d’ouverture.');
      state.time = null;
      updateSummary();
      changeStep(2);
      return;
    }
    if (state.step === 2) {
      const available = candidateTimes(state.date, state.service).some((choice) => choice.minute === state.time && !choice.past && !choice.unavailable);
      if (!available) return showError('Choisissez un créneau simulé encore disponible.');
      changeStep(3);
      return;
    }
    if (state.step === 3) {
      const name = String($('[name="prenom"]', form).value).trim();
      const phone = String($('[name="telephone"]', form).value).trim();
      const mobile = /^(?:0[67](?:[\s.-]?\d{2}){4}|(?:\+33|0033)[67](?:[\s.-]?\d{2}){4})$/.test(phone);
      if (!name) {
        showError('Indiquez votre prénom pour compléter la démonstration.');
        $('[name="prenom"]', form).setAttribute('aria-invalid', 'true');
        return;
      }
      if (!mobile) {
        showError('Saisissez un numéro de téléphone mobile français valide.');
        $('[name="telephone"]', form).setAttribute('aria-invalid', 'true');
        return;
      }
      state.name = name;
      state.phone = phone;
      changeStep(4);
    }
  });

  panel.addEventListener('input', (event) => {
    if (event.target.name === 'prenom') {
      state.name = event.target.value;
      event.target.removeAttribute('aria-invalid');
    }
    if (event.target.name === 'telephone') {
      state.phone = event.target.value;
      event.target.removeAttribute('aria-invalid');
    }
  });

  $('#summary-edit').addEventListener('click', () => {
    summaryEditList.hidden = !summaryEditList.hidden;
    summaryEdit.setAttribute('aria-expanded', String(!summaryEditList.hidden));
  });
  summaryEditList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-etape]');
    if (!button) return;
    summaryEditList.hidden = true;
    changeStep(Number(button.dataset.etape));
  });

  doc.addEventListener('click', (event) => {
    const preselect = event.target.closest('[data-choisir-prestation]');
    if (!preselect) return;
    const service = findService(preselect.dataset.choisirPrestation);
    if (!service) return;
    event.preventDefault();
    state.service = service;
    state.date = null;
    state.time = null;
    state.step = 1;
    render({ focus: true });
    $('#reservation').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });

  const menuButton = $('.menu-toggle');
  const mobileMenu = $('#menu-mobile');
  let menuCloseTimer = 0;
  function closeMenu(returnFocus = false) {
    if (mobileMenu.hidden) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
    mobileMenu.classList.remove('is-open');
    window.clearTimeout(menuCloseTimer);
    menuCloseTimer = window.setTimeout(() => { mobileMenu.hidden = true; }, reduceMotion.matches ? 0 : 180);
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    if (opening) {
      window.clearTimeout(menuCloseTimer);
      mobileMenu.hidden = false;
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'Fermer la navigation');
      requestAnimationFrame(() => mobileMenu.classList.add('is-open'));
      const firstLink = $('a', mobileMenu);
      if (firstLink) firstLink.focus();
    } else closeMenu();
  });
  mobileMenu.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    if (link.hash) {
      const destination = doc.getElementById(decodeURIComponent(link.hash.slice(1)));
      const heading = destination?.matches('h1, h2, h3') ? destination : destination?.querySelector('h1, h2, h3');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        closeMenu();
        window.setTimeout(() => heading.focus({ preventScroll: true }), reduceMotion.matches ? 0 : 190);
        return;
      }
    }
    closeMenu();
  });
  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true);
  });
  doc.addEventListener('click', (event) => {
    if (!mobileMenu.hidden && !mobileMenu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });

  if ('IntersectionObserver' in window) {
    const reveals = $$('[data-reveal]');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        if (entry.target.dataset.reveal === 'pastilles') {
          $$(':scope > *', entry.target).forEach((item, index) => item.style.setProperty('--stagger', `${Math.min(index * 65, 195)}ms`));
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((element) => revealObserver.observe(element));

    const morphObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-morphed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 });
    $$('[data-morph]').forEach((element) => morphObserver.observe(element));

    const stickyBar = $('.mobile-booking');
    const watched = { hero: false, booking: false, footer: false };
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.id === 'hero-actions') watched.hero = entry.isIntersecting;
        if (entry.target.id === 'reservation') watched.booking = entry.isIntersecting;
        if (entry.target.classList.contains('site-footer')) watched.footer = entry.isIntersecting;
      });
      stickyBar.classList.toggle('is-visible', !watched.hero && !watched.booking && !watched.footer);
      stickyBar.classList.toggle('is-suppressed', watched.booking || watched.footer);
    }, { threshold: 0, rootMargin: '0px 0px -2% 0px' });
    const heroActions = $('.hero__actions');
    if (heroActions) {
      heroActions.id = 'hero-actions';
      stickyObserver.observe(heroActions);
    }
    stickyObserver.observe($('#reservation'));
    stickyObserver.observe($('.site-footer'));
  } else {
    $$('[data-reveal]').forEach((element) => element.classList.add('is-visible'));
    $$('[data-morph]').forEach((element) => element.classList.add('is-morphed'));
  }

  render();
  requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
})();
