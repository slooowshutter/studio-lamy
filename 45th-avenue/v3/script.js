(() => {
  'use strict';

  const page = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  page.classList.add('js');

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#menu-mobile');

  function closeMenu(returnFocus = false) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir le menu');
    mobileMenu.hidden = true;
    if (returnFocus) menuButton.focus();
  }

  if (menuButton && mobileMenu) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Ouvrir le menu' : 'Fermer le menu');
      mobileMenu.hidden = isOpen;
      if (!isOpen) mobileMenu.querySelector('a')?.focus();
    });
    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 820) closeMenu();
    }, { passive: true });
  }

  const revealItems = [...document.querySelectorAll('.reveal')];
  const hero = document.querySelector('.hero');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
    if (hero) {
      const heroObserver = new IntersectionObserver((entries, observer) => {
        if (!entries[0]?.isIntersecting) return;
        hero.classList.add('is-visible');
        observer.disconnect();
      }, { threshold: 0.05 });
      heroObserver.observe(hero);
    }

    const addressLine = document.querySelector('.address-line');
    if (addressLine) {
      const lineObserver = new IntersectionObserver((entries, observer) => {
        if (!entries[0]?.isIntersecting) return;
        addressLine.classList.add('in-view');
        observer.disconnect();
      }, { threshold: 0.28 });
      lineObserver.observe(addressLine);
    }
  } else {
    revealItems.forEach((item) => item.classList.add('in-view'));
    hero?.classList.add('is-visible');
    document.querySelector('.address-line')?.classList.add('in-view');
  }

  const mobileAction = document.querySelector('.mobile-action');
  const heroActions = document.querySelector('.hero__actions');
  const bookingSection = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  if ('IntersectionObserver' in window && mobileAction && heroActions && bookingSection && footer) {
    let heroActionsVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const updateMobileAction = () => {
      mobileAction.classList.toggle('is-visible', !heroActionsVisible && !bookingVisible && !footerVisible);
    };
    const actionObserver = new IntersectionObserver(([entry]) => {
      heroActionsVisible = entry.isIntersecting;
      updateMobileAction();
    }, { threshold: 0.05 });
    const bookingObserver = new IntersectionObserver(([entry]) => {
      bookingVisible = entry.isIntersecting;
      updateMobileAction();
    }, { threshold: 0.02 });
    const footerObserver = new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      updateMobileAction();
    }, { threshold: 0.02 });
    actionObserver.observe(heroActions);
    bookingObserver.observe(bookingSection);
    footerObserver.observe(footer);
  }

  const services = {
    homme: { name: 'Shampoing, coupe et coiffage', tarif: 30, duration: 30, durationCopy: '30 min selon Planity' },
    'coupe-courts': { name: 'Shampooing traitant, coupe et coiffage', tarif: 43, duration: 30, durationCopy: '30 min selon Planity' },
    'brushing-courts': { name: 'Shampooing et coiffage', tarif: 30, duration: 30, durationCopy: '30 min selon Planity' },
    'soin-redken': { name: 'Soin Redken', tarif: 35, duration: 20, durationCopy: '20 min' }
  };

  const hours = {
    2: { start: 9 * 60 + 30, end: 19 * 60 },
    3: { start: 9 * 60 + 30, end: 19 * 60 },
    4: { start: 9 * 60 + 30, end: 19 * 60 },
    5: { start: 9 * 60 + 30, end: 19 * 60 },
    6: { start: 9 * 60, end: 17 * 60 + 30 }
  };

  const bookingPanel = document.querySelector('#booking-panel');
  const stepRoot = document.querySelector('#booking-step');
  const announcement = document.querySelector('#booking-announcement');
  const progressItems = [...document.querySelectorAll('[data-progress]')];
  const recapService = document.querySelector('#recap-service');
  const recapDate = document.querySelector('#recap-date');
  const recapTime = document.querySelector('#recap-time');
  const recapPrice = document.querySelector('#recap-price');
  const state = { service: '', day: '', time: '', firstName: '', phone: '', step: 0, complete: false };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  function parisParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  }

  function dateKey(year, month, day) {
    return `${year}-${month}-${day}`;
  }

  function parisDayKey(date = new Date()) {
    const parts = parisParts(date);
    return dateKey(parts.year, parts.month, parts.day);
  }

  function datesForNextTwelveDays() {
    const today = parisParts();
    const start = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day), 12));
    const result = [];
    for (let offset = 0; offset < 12; offset += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + offset);
      const year = String(date.getUTCFullYear());
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const key = dateKey(year, month, day);
      const weekday = date.getUTCDay();
      const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
      const dateLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
      const longLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
      result.push({ key, weekday, dayLabel, dateLabel, longLabel, closed: weekday === 0 || weekday === 1 });
    }
    return result;
  }

  function currentParisMinutes() {
    const parts = parisParts();
    return Number(parts.hour) * 60 + Number(parts.minute);
  }

  function selectedService() {
    return services[state.service] || null;
  }

  function dateFromKey(key) {
    if (!key) return null;
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function fullDateLabel(key) {
    const date = dateFromKey(key);
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
  }

  function weekdayForKey(key) {
    const date = dateFromKey(key);
    return date ? date.getUTCDay() : -1;
  }

  function formatTime(minutes) {
    const hoursPart = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minutesPart = String(minutes % 60).padStart(2, '0');
    return `${hoursPart} h ${minutesPart}`;
  }

  function deterministicBusy(key, minute) {
    const seed = `${key}-${minute}`;
    let hash = 7;
    for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) % 997;
    return hash % 7 === 0;
  }

  function slotsForSelection() {
    const service = selectedService();
    const weekday = weekdayForKey(state.day);
    const schedule = hours[weekday];
    if (!service || !schedule) return [];
    const todayKey = parisDayKey();
    const nowMinutes = currentParisMinutes();
    const slots = [];
    for (let start = schedule.start; start + service.duration <= schedule.end; start += 30) {
      const past = state.day === todayKey && start <= nowMinutes;
      const busy = deterministicBusy(state.day, start);
      slots.push({ start, past, busy, disabled: past || busy });
    }
    return slots;
  }

  function updateRecap() {
    const service = selectedService();
    recapService.textContent = service ? service.name : 'À choisir';
    recapDate.textContent = state.day ? fullDateLabel(state.day) : 'À choisir';
    recapTime.textContent = state.time ? formatTime(Number(state.time)) : 'À choisir';
    recapPrice.textContent = service ? `${service.tarif} €` : '—';
  }

  function updateProgress() {
    const names = ['prestation', 'jour', 'heure', 'coordonnées'];
    progressItems.forEach((item) => {
      const index = Number(item.dataset.progress);
      item.classList.toggle('is-current', index === state.step && !state.complete);
      item.classList.toggle('is-complete', index < state.step || state.complete);
      item.disabled = !state.complete && index > state.step;
      if (index === state.step && !state.complete) {
        item.setAttribute('aria-current', 'step');
        item.setAttribute('aria-label', `Étape ${index + 1}, ${names[index]}, étape actuelle`);
      } else {
        item.removeAttribute('aria-current');
        item.setAttribute('aria-label', `Revenir à l’étape ${index + 1}, ${names[index]}`);
      }
    });
  }

  function setAnnouncement(message) {
    if (announcement) announcement.textContent = message;
  }

  function focusHeading() {
    window.requestAnimationFrame(() => {
      document.querySelector('#step-heading')?.focus({ preventScroll: true });
    });
  }

  function buttonsBack(nextLabel) {
    return `<div class="step-actions"><button class="button button--secondary" type="button" data-action="retour">Retour</button><button class="button button--primary" type="button" data-action="${nextLabel.action}">${nextLabel.text} <span aria-hidden="true">→</span></button></div>`;
  }

  function renderServices() {
    return `<h3 id="step-heading" tabindex="-1">Choisir une prestation</h3>
      <p class="step-note">Prix et durées publiés sur Planity, à confirmer avec le salon.</p>
      <fieldset class="service-options"><legend>Votre prestation</legend>
        ${Object.entries(services).map(([key, service]) => `<label class="booking-option">
          <input type="radio" name="prestation" value="${key}"${state.service === key ? ' checked' : ''}>
          <span class="booking-option__copy"><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.durationCopy)}</small></span>
          <span class="booking-option__price">${service.tarif}&nbsp;€</span>
        </label>`).join('')}
      </fieldset>
      <p class="step-error" id="step-error" aria-live="polite"></p>
      <div class="step-actions"><button class="button button--primary" type="button" data-action="continuer">Choisir un jour <span aria-hidden="true">→</span></button></div>`;
  }

  function renderDays() {
    const dates = datesForNextTwelveDays();
    const choices = dates.map((date) => `<button class="date-option" type="button" data-date="${date.key}" aria-label="${escapeHtml(`${date.longLabel}, ${date.weekday === 1 ? 'appeler le salon' : date.closed ? 'fermé' : 'choisir ce jour'}`)}" aria-pressed="${state.day === date.key}"${date.closed ? ' disabled' : ''}>
      <strong>${escapeHtml(date.dayLabel)}</strong><span>${escapeHtml(date.dateLabel)}</span>${date.weekday === 1 ? '<small>Appeler le salon</small>' : date.closed ? '<small>Fermé</small>' : ''}
    </button>`).join('');
    return `<h3 id="step-heading" tabindex="-1">Choisir un jour</h3>
      <p class="step-note">Douze jours à partir d’aujourd’hui. Dimanche fermé. Le lundi, appelez le salon.</p>
      <div class="date-options" aria-label="Jours proposés">${choices}</div>
      <p class="step-error" id="step-error" aria-live="polite">Choisissez une date pour voir les heures.</p>
      ${buttonsBack({ action: 'continuer-date', text: 'Continuer' })}`;
  }

  function renderTimes() {
    const slots = slotsForSelection();
    const choices = slots.map((slot) => {
      const label = formatTime(slot.start);
      const status = slot.past ? 'déjà passé' : slot.busy ? 'déjà pris dans cette simulation' : 'choisir cette heure';
      return `<button class="time-option${slot.busy && !slot.past ? ' is-booked' : ''}" type="button" data-time="${slot.start}" aria-label="${label}, ${status}" aria-pressed="${Number(state.time) === slot.start}"${slot.disabled ? ' disabled' : ''}><span>${label}</span>${slot.past ? '<small>Passé</small>' : slot.busy ? '<small>Déjà pris</small>' : ''}</button>`;
    }).join('');
    const empty = slots.length ? '' : '<p class="step-error">Aucun créneau simulé ne correspond à cette prestation ce jour-là. Choisissez un autre jour.</p>';
    return `<h3 id="step-heading" tabindex="-1">Choisir une heure</h3>
      <p class="step-note">${escapeHtml(fullDateLabel(state.day))}. Créneaux et disponibilités simulés, calculés d’après les horaires Planity. Rien n’est réservé.</p>
      <div class="time-options" aria-label="Heures simulées">${choices}</div>${empty}
      ${buttonsBack({ action: 'continuer-heure', text: 'Continuer' })}`;
  }

  function renderDetails() {
    const service = selectedService();
    const date = fullDateLabel(state.day);
    const time = formatTime(Number(state.time));
    return `<h3 id="step-heading" tabindex="-1">Vos coordonnées</h3>
      <p class="step-note">Ces informations restent dans cette page. Elles ne sont pas envoyées.</p>
      <form class="form-fields" novalidate>
        <label for="prenom">Votre prénom
          <input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="60" required aria-describedby="erreur-prenom" value="${escapeHtml(state.firstName)}">
          <span class="field-message" id="erreur-prenom"></span>
        </label>
        <label for="telephone">Votre téléphone mobile
          <input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" placeholder="06 12 34 56 78" required aria-describedby="erreur-telephone" value="${escapeHtml(state.phone)}">
          <span class="field-message" id="erreur-telephone"></span>
        </label>
        <p class="contact-recap"><strong>${escapeHtml(service.name)}</strong><br>${escapeHtml(date)} à ${escapeHtml(time)} · ${service.tarif}&nbsp;€ selon Planity<br>Durée ${escapeHtml(service.durationCopy)}</p>
        <div class="step-actions"><button class="button button--secondary" type="button" data-action="retour">Retour</button><button class="button button--primary" type="submit">Voir la confirmation <span aria-hidden="true">→</span></button></div>
      </form>`;
  }

  function renderSuccess() {
    const service = selectedService();
    return `<div class="booking-success">
      <h3 id="step-heading" tabindex="-1">Simulation terminée</h3>
      <p class="booking-success__recap">${escapeHtml(state.firstName)}, votre choix&nbsp;: ${escapeHtml(service.name)}, le ${escapeHtml(fullDateLabel(state.day))} à ${escapeHtml(formatTime(Number(state.time)))} · tarif Planity ${service.tarif}&nbsp;€.</p>
      <p>Aucun rendez-vous n’a été réservé ni transmis. Pour prendre un rendez-vous réel, utilisez Planity ou appelez le salon.</p>
      <div class="step-actions"><a class="button button--primary" href="https://www.planity.com/45th-avenue-33200-bordeaux" target="_blank" rel="noopener">Ouvrir Planity <span aria-hidden="true">↗</span></a><a class="button button--secondary" href="tel:+33556089300">Appeler le salon</a></div>
    </div>`;
  }

  function renderStep(announce = true) {
    if (!bookingPanel || !stepRoot) return;
    let markup;
    if (state.complete) markup = renderSuccess();
    else if (state.step === 0) markup = renderServices();
    else if (state.step === 1) markup = renderDays();
    else if (state.step === 2) markup = renderTimes();
    else markup = renderDetails();

    stepRoot.classList.remove('is-ready');
    stepRoot.innerHTML = markup;
    window.requestAnimationFrame(() => stepRoot.classList.add('is-ready'));
    updateProgress();
    updateRecap();
    if (announce) {
      const messages = ['Étape 1 sur 4, prestation.', 'Étape 2 sur 4, jour.', 'Étape 3 sur 4, heure.', 'Étape 4 sur 4, coordonnées.', 'Simulation terminée. Aucun rendez-vous n’a été transmis.'];
      setAnnouncement(messages[state.complete ? 4 : state.step]);
      focusHeading();
    }
  }

  function setFieldError(input, errorNode, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    errorNode.textContent = message;
  }

  function normalizePhone(value) {
    return value.trim().replace(/[\s().-]/g, '');
  }

  function validateContact(form) {
    const firstName = form.querySelector('#prenom');
    const phone = form.querySelector('#telephone');
    const firstNameError = form.querySelector('#erreur-prenom');
    const phoneError = form.querySelector('#erreur-telephone');
    const nameValue = firstName.value.trim();
    const phoneValue = normalizePhone(phone.value);
    const validPhone = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phoneValue);
    setFieldError(firstName, firstNameError, nameValue ? '' : 'Indiquez votre prénom.');
    setFieldError(phone, phoneError, validPhone ? '' : 'Saisissez un numéro mobile français valide.');
    if (!nameValue) {
      firstName.focus();
      setAnnouncement('Erreur. Indiquez votre prénom.');
      return false;
    }
    if (!validPhone) {
      phone.focus();
      setAnnouncement('Erreur. Saisissez un numéro mobile français valide.');
      return false;
    }
    state.firstName = nameValue;
    state.phone = phoneValue;
    return true;
  }

  if (bookingPanel && stepRoot) {
    bookingPanel.addEventListener('change', (event) => {
      if (!event.target.matches('input[name="prestation"]')) return;
      const changed = state.service !== event.target.value;
      state.service = event.target.value;
      if (changed) {
        state.day = '';
        state.time = '';
      }
      updateRecap();
      const service = selectedService();
      if (service) setAnnouncement(`${service.name} sélectionnée. Tarif Planity ${service.tarif} euros.`);
    });

    bookingPanel.addEventListener('click', (event) => {
      const dateButton = event.target.closest('[data-date]');
      const timeButton = event.target.closest('[data-time]');
      const actionButton = event.target.closest('[data-action]');
      const stepButton = event.target.closest('[data-go-step]');

      if (stepButton && !stepButton.disabled) {
        state.complete = false;
        state.step = Number(stepButton.dataset.goStep);
        renderStep();
        return;
      }

      if (dateButton && !dateButton.disabled) {
        state.day = dateButton.dataset.date;
        state.time = '';
        updateRecap();
        setAnnouncement(`Jour choisi : ${fullDateLabel(state.day)}. Vous pouvez continuer.`);
        return;
      }
      if (timeButton && !timeButton.disabled) {
        state.time = timeButton.dataset.time;
        updateRecap();
        setAnnouncement(`Heure choisie : ${formatTime(Number(state.time))}. Vous pouvez continuer.`);
        return;
      }
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      if (action === 'continuer') {
        if (!state.service) {
          const error = stepRoot.querySelector('#step-error');
          if (error) error.textContent = 'Choisissez une prestation pour continuer.';
          setAnnouncement('Choisissez une prestation pour continuer.');
          return;
        }
        state.step = 1;
        renderStep();
      } else if (action === 'retour') {
        state.step = Math.max(0, state.step - 1);
        renderStep();
      } else if (action === 'continuer-date') {
        if (!state.day) {
          const error = stepRoot.querySelector('#step-error');
          if (error) error.textContent = 'Choisissez une date pour continuer.';
          setAnnouncement('Choisissez une date pour continuer.');
          return;
        }
        state.step = 2;
        renderStep();
      } else if (action === 'continuer-heure') {
        if (!state.time) {
          const error = stepRoot.querySelector('#step-error');
          if (error) error.textContent = 'Choisissez une heure disponible pour continuer.';
          setAnnouncement('Choisissez une heure disponible pour continuer.');
          return;
        }
        state.step = 3;
        renderStep();
      }
    });

    bookingPanel.addEventListener('submit', (event) => {
      if (!event.target.matches('.form-fields')) return;
      event.preventDefault();
      if (!validateContact(event.target)) return;
      state.complete = true;
      renderStep();
    });
  }

  updateRecap();
  updateProgress();
  renderStep(false);
  if (reducedMotion.matches) {
    hero?.classList.add('is-visible');
    document.querySelector('.address-line')?.classList.add('in-view');
    revealItems.forEach((item) => item.classList.add('in-view'));
  }
})();
