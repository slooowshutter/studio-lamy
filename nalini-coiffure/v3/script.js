(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const select = (selector, context = doc) => context.querySelector(selector);
  const selectAll = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const NB = '\u00a0';
  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const hoursByDay = {
    0: null,
    1: null,
    2: [600, 1140],
    3: [660, 1140],
    4: [660, 1170],
    5: [600, 1140],
    6: [660, 1140]
  };
  const services = [
    { id: 'coupe-femme', label: 'Coupe femme + brushing, cheveux courts / mi-longs' },
    { id: 'coupe-homme', label: 'Coupe homme avec shampooing' },
    { id: 'coupe-tondeuse', label: 'Coupe tondeuse' },
    { id: 'coloration', label: 'Coloration racines + coupe + soin + brushing' }
  ];

  const hero = select('.hero');
  if (hero) {
    const start = () => window.requestAnimationFrame(() => window.requestAnimationFrame(() => hero.classList.add('is-ready')));
    if (doc.fonts && doc.fonts.ready) {
      Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 420))]).then(start);
    } else start();
  }

  const menuButton = select('.menu-button');
  const navigation = select('#navigation');
  if (menuButton && navigation) {
    const menuLabel = select('.menu-button__label', menuButton);
    const media = window.matchMedia('(max-width: 60rem)');
    const setMenu = (open, returnFocus) => {
      menuButton.setAttribute('aria-expanded', String(open));
      navigation.classList.toggle('is-open', open);
      menuLabel.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
      if (open) {
        const firstLink = select('a', navigation);
        if (firstLink) firstLink.focus({ preventScroll: true });
      } else if (returnFocus) {
        menuButton.focus({ preventScroll: true });
      }
    };
    menuButton.addEventListener('click', () => {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true', false);
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a') && media.matches) setMenu(false, false);
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false, true);
      }
    });
    media.addEventListener('change', (event) => {
      if (!event.matches && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, false);
    });
  }

  const revealItems = selectAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const formulaBody = select('.formula__body');
  const formulaLine = select('[data-draw-line]');
  if (formulaBody && formulaLine) {
    if ('IntersectionObserver' in window) {
      const formulaObserver = new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        formulaBody.classList.add('is-visible');
        observer.disconnect();
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
      formulaObserver.observe(formulaBody);
    } else formulaBody.classList.add('is-visible');
  }

  const parisWeekday = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long'
  }).format(new Date()).toLocaleLowerCase('fr-FR');
  const todayDayNumber = dayNames.indexOf(parisWeekday);
  const todayRow = select('.hours-table tr[data-day="' + todayDayNumber + '"]');
  if (todayRow) {
    todayRow.classList.add('is-today');
    const label = doc.createElement('span');
    label.className = 'hours-table__today';
    label.textContent = ' · aujourd’hui';
    select('th', todayRow).append(label);
  }

  const dock = select('[data-mobile-dock]');
  if (dock && 'IntersectionObserver' in window) {
    const pageParts = { hero: true, booking: false, footer: false };
    let dockIsVisible = false;
    let hideTimer = 0;
    const updateDock = () => {
      const shouldShow = !pageParts.hero && !pageParts.booking && !pageParts.footer;
      if (shouldShow === dockIsVisible) return;
      dockIsVisible = shouldShow;
      window.clearTimeout(hideTimer);
      if (shouldShow) {
        dock.hidden = false;
        dock.inert = false;
        dock.setAttribute('aria-hidden', 'false');
        doc.body.classList.add('dock-visible');
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => dock.classList.add('is-visible')));
      } else {
        dock.classList.remove('is-visible');
        dock.inert = true;
        dock.setAttribute('aria-hidden', 'true');
        doc.body.classList.remove('dock-visible');
        hideTimer = window.setTimeout(() => { dock.hidden = true; }, reducedMotion.matches ? 0 : 240);
      }
    };
    const watch = (element, key) => {
      if (!element) return;
      const observer = new IntersectionObserver(([entry]) => {
        pageParts[key] = entry.isIntersecting;
        updateDock();
      }, { threshold: 0 });
      observer.observe(element);
    };
    watch(hero, 'hero');
    watch(select('#rendez-vous'), 'booking');
    watch(select('#pied'), 'footer');
  }

  const app = select('[data-booking-app]');
  const panel = select('[data-booking-panel]');
  const summary = select('[data-booking-summary]');
  const live = select('[data-booking-live]');
  const fallback = select('[data-booking-fallback]');

  if (app && panel && summary) {
    const state = {
      step: 1,
      service: null,
      day: null,
      time: null,
      firstName: '',
      phone: ''
    };
    let transitionTimer = 0;

    app.hidden = false;
    if (fallback) fallback.hidden = true;

    function currentParisTime() {
      const parts = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      const values = {};
      parts.forEach((part) => { values[part.type] = part.value; });
      const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));
      return { date, iso: toIso(date), minute: Number(values.hour) * 60 + Number(values.minute) };
    }

    function toIso(date) {
      return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0');
    }

    function fromIso(value) {
      return new Date(value + 'T12:00:00Z');
    }

    function easterSunday(year) {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      return new Date(Date.UTC(year, month - 1, day, 12));
    }

    function frenchHolidays(year) {
      const easter = easterSunday(year);
      const shifted = (days) => new Date(easter.getTime() + days * 86400000);
      const dates = [
        year + '-01-01', year + '-05-01', year + '-05-08', year + '-07-14',
        year + '-08-15', year + '-11-01', year + '-11-11', year + '-12-25',
        toIso(shifted(1)), toIso(shifted(39)), toIso(shifted(50))
      ];
      return new Set(dates);
    }

    function isFrenchHoliday(date) {
      return frenchHolidays(date.getUTCFullYear()).has(toIso(date));
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function serviceById(id) {
      return services.find((item) => item.id === id) || null;
    }

    function selectedDate() {
      return state.day ? fromIso(state.day) : null;
    }

    function dateLabels(date) {
      const weekday = dayNames[date.getUTCDay()];
      return {
        weekday,
        shortWeekday: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace(/\.$/, ''),
        day: String(date.getUTCDate()),
        month: monthNames[date.getUTCMonth()],
        full: weekday + ' ' + date.getUTCDate() + ' ' + monthNames[date.getUTCMonth()]
      };
    }

    function minuteLabel(value) {
      const hour = Math.floor(value / 60);
      const minute = value % 60;
      return minute === 0 ? String(hour) + NB + 'h' : String(hour) + NB + 'h' + NB + String(minute).padStart(2, '0');
    }

    function stepHeading(number, title) {
      return '<p class="booking-step-label">Étape ' + number + ' sur 4</p>' +
        '<h3 id="titre-etape" tabindex="-1">' + title + '</h3>';
    }

    function navigationButtons(backLabel, nextLabel, disabled) {
      let html = '<div class="booking-nav">';
      if (backLabel) html += '<button class="action-button action-button--quiet" type="button" data-back>' + backLabel + '</button>';
      if (nextLabel) html += '<button class="action-button" type="button" data-next' + (disabled ? ' disabled' : '') + '>' + nextLabel + '</button>';
      html += '</div>';
      return html;
    }

    function renderServiceStep() {
      let html = stepHeading(1, 'Choisir une prestation');
      html += '<fieldset class="booking-fieldset"><legend>Prestation</legend><div class="booking-options">';
      services.forEach((service) => {
        html += '<label class="booking-option"><input type="radio" name="prestation" value="' + service.id + '"' +
          (state.service === service.id ? ' checked' : '') + '><span>' + escapeHtml(service.label) + '</span></label>';
      });
      html += '</div></fieldset>';
      html += '<p class="booking-step-note">Aucun prix ni aucune durée ne sont affichés ici.</p>';
      html += navigationButtons('', 'Continuer', !state.service);
      return html;
    }

    function renderDayStep() {
      const today = currentParisTime();
      let html = stepHeading(2, 'Choisir un jour');
      html += '<p class="booking-step-note">Choix illustratif sur les 14 prochains jours. Les disponibilités réelles sont à confirmer.</p>';
      html += '<div class="booking-days" role="group" aria-label="Choisir un jour">';
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(today.date.getTime() + offset * 86400000);
        const iso = toIso(date);
        const info = dateLabels(date);
        const closed = hoursByDay[date.getUTCDay()] === null;
        const holiday = isFrenchHoliday(date);
        const disabled = closed || holiday;
        const stateText = closed ? 'Fermé' : holiday ? 'Horaires à confirmer' : '';
        let label = 'Choisir ' + info.full;
        if (stateText) label += ' — ' + stateText.toLowerCase();
        html += '<button class="booking-day" type="button" data-jour="' + iso + '" aria-label="' + escapeHtml(label) +
          '" aria-pressed="' + String(state.day === iso) + '"' + (disabled ? ' disabled' : '') + '>';
        html += '<span>' + escapeHtml(info.shortWeekday) + '</span><span class="booking-day__date">' + info.day + '</span>';
        if (stateText) html += '<span class="booking-day__state">' + stateText + '</span>';
        html += '</button>';
      }
      html += '</div>';
      html += navigationButtons('Retour', 'Continuer', !state.day);
      return html;
    }

    function renderTimeStep() {
      const today = currentParisTime();
      const date = selectedDate();
      const dayInfo = dateLabels(date);
      const weekday = date.getUTCDay();
      const range = hoursByDay[weekday];
      let html = stepHeading(3, 'Choisir une heure');
      html += '<p class="booking-step-note">' + escapeHtml(dayInfo.full) + ' · horaire de départ illustratif, par pas de 30 minutes.</p>';
      html += '<div class="booking-times" role="group" aria-label="Choisir une heure">';
      let count = 0;
      for (let minute = range[0]; minute < range[1]; minute += 30) {
        const past = state.day === today.iso && minute <= today.minute;
        html += '<button class="booking-time" type="button" data-heure="' + minute + '" aria-pressed="' +
          String(state.time === minute) + '" aria-label="Choisir ' + escapeHtml(minuteLabel(minute)) +
          '"' + (past ? ' disabled' : '') + '>' + escapeHtml(minuteLabel(minute)) + '</button>';
        if (!past) count += 1;
      }
      html += '</div>';
      if (count === 0) html += '<p class="booking-step-note">Aucun horaire illustratif ne reste aujourd’hui. Choisissez un autre jour.</p>';
      html += '<p class="booking-step-note">Durée et disponibilité réelles à confirmer auprès du salon.</p>';
      html += navigationButtons('Retour', 'Continuer', state.time === null);
      return html;
    }

    function renderContactStep() {
      let html = stepHeading(4, 'Vos coordonnées');
      html += '<p class="booking-step-note">Ces coordonnées restent dans cette page et ne sont transmises à personne.</p>';
      html += '<form class="booking-form" data-contact-form novalidate>';
      html += '<label class="booking-label" for="prenom">Votre prénom';
      html += '<input id="prenom" name="prenom" type="text" autocomplete="given-name" required value="' + escapeHtml(state.firstName) +
        '" aria-describedby="erreur-prenom"></label><p class="booking-error" id="erreur-prenom" aria-live="polite" aria-atomic="true"></p>';
      html += '<label class="booking-label" for="mobile">Votre numéro de mobile';
      html += '<input id="mobile" name="mobile" type="tel" inputmode="tel" autocomplete="tel-national" required value="' +
        escapeHtml(state.phone) + '" aria-describedby="erreur-mobile"></label><p class="booking-error" id="erreur-mobile" aria-live="polite" aria-atomic="true"></p>';
      html += navigationButtons('Retour', '', false);
      html += '<div class="booking-nav"><button class="action-button" type="submit">Terminer la simulation</button></div>';
      html += '</form>';
      return html;
    }

    function renderSuccessStep() {
      let html = '<p class="booking-step-label">Parcours terminé</p>';
      html += '<div class="booking-success"><h3 class="booking-success__title" id="titre-etape" tabindex="-1">Simulation terminée, ' +
        '<span data-prenom-confirme></span>.</h3>';
      html += '<p>Votre choix est conservé uniquement dans cette page. Aucun rendez-vous n’a été transmis.</p>';
      html += '<p>Pour un rendez-vous réel, appelez Nalini Coiffure au <a href="tel:+33148249304">01&nbsp;48&nbsp;24&nbsp;93&nbsp;04</a> ou passez par <a href="https://www.planity.com/nalini-coiffure-75009-paris-p66" target="_blank" rel="noopener noreferrer">Planity</a>.</p>';
      html += '<button class="action-button action-button--quiet" type="button" data-restart>Recommencer la simulation</button></div>';
      return html;
    }

    function renderStep() {
      if (state.step === 1) panel.innerHTML = renderServiceStep();
      if (state.step === 2) panel.innerHTML = renderDayStep();
      if (state.step === 3) panel.innerHTML = renderTimeStep();
      if (state.step === 4) panel.innerHTML = renderContactStep();
      if (state.step === 5) panel.innerHTML = renderSuccessStep();
      if (state.step === 5) {
        const name = select('[data-prenom-confirme]', panel);
        if (name) name.textContent = state.firstName;
      }
      updateSummary();
      const heading = select('#titre-etape', panel);
      if (heading) {
        if (renderStep.ready) heading.focus();
        renderStep.ready = true;
        if (live) live.textContent = heading.textContent;
      } else if (live) live.textContent = 'Parcours terminé. Aucune demande n’a été envoyée.';
    }

    function updateSummary() {
      summary.replaceChildren();
      const title = doc.createElement('p');
      title.className = 'booking-summary__title';
      title.textContent = 'Votre sélection';
      summary.append(title);

      const choices = [];
      if (state.service) {
        const service = serviceById(state.service);
        if (service) choices.push({ step: 1, kind: 'Prestation', value: service.label });
      }
      if (state.day) {
        const date = selectedDate();
        choices.push({ step: 2, kind: 'Jour', value: dateLabels(date).full });
      }
      if (state.time !== null) choices.push({ step: 3, kind: 'Heure', value: minuteLabel(state.time) });

      if (!choices.length) {
        const empty = doc.createElement('p');
        empty.className = 'booking-summary__empty';
        empty.textContent = 'Aucun choix pour le moment.';
        summary.append(empty);
        return;
      }

      const list = doc.createElement('ol');
      list.className = 'booking-summary__list';
      choices.forEach((choice) => {
        const item = doc.createElement('li');
        item.className = 'booking-summary__item';
        const button = doc.createElement('button');
        button.type = 'button';
        button.dataset.returnStep = String(choice.step);
        button.setAttribute('aria-label', 'Modifier ' + choice.kind.toLowerCase() + ' : ' + choice.value);
        button.disabled = state.step === choice.step;
        const kind = doc.createElement('span');
        kind.className = 'booking-summary__kind';
        kind.textContent = choice.kind;
        const value = doc.createElement('span');
        value.className = 'booking-summary__value';
        value.textContent = choice.value;
        button.append(kind, value);
        item.append(button);
        list.append(item);
      });
      summary.append(list);
    }

    function changeStep(nextStep) {
      window.clearTimeout(transitionTimer);
      panel.classList.add('is-changing');
      const delay = reducedMotion.matches ? 0 : 220;
      transitionTimer = window.setTimeout(() => {
        state.step = nextStep;
        renderStep();
        panel.classList.remove('is-changing');
      }, delay);
    }

    panel.addEventListener('change', (event) => {
      if (event.target.matches('input[name="prestation"]')) {
        state.service = event.target.value;
        const next = select('[data-next]', panel);
        if (next) next.disabled = !state.service;
        updateSummary();
      }
    });

    panel.addEventListener('click', (event) => {
      const dayButton = event.target.closest('[data-jour]');
      if (dayButton && !dayButton.disabled) {
        state.day = dayButton.dataset.jour;
        state.time = null;
        selectAll('.booking-day', panel).forEach((button) => {
          button.setAttribute('aria-pressed', String(button.dataset.jour === state.day));
        });
        const next = select('[data-next]', panel);
        if (next) next.disabled = false;
        updateSummary();
        return;
      }
      const timeButton = event.target.closest('[data-heure]');
      if (timeButton && !timeButton.disabled) {
        state.time = Number(timeButton.dataset.heure);
        selectAll('.booking-time', panel).forEach((button) => {
          button.setAttribute('aria-pressed', String(Number(button.dataset.heure) === state.time));
        });
        const next = select('[data-next]', panel);
        if (next) next.disabled = false;
        updateSummary();
        return;
      }
      const nextButton = event.target.closest('[data-next]');
      if (nextButton && !nextButton.disabled) {
        changeStep(state.step + 1);
        return;
      }
      if (event.target.closest('[data-back]')) {
        changeStep(Math.max(1, state.step - 1));
        return;
      }
      const returnButton = event.target.closest('[data-return-step]');
      if (returnButton && !returnButton.disabled) {
        changeStep(Number(returnButton.dataset.returnStep));
        return;
      }
      if (event.target.closest('[data-restart]')) {
        state.step = 1;
        state.service = null;
        state.day = null;
        state.time = null;
        state.firstName = '';
        state.phone = '';
        changeStep(1);
      }
    });

    panel.addEventListener('input', (event) => {
      if (event.target.name === 'prenom') {
        state.firstName = event.target.value;
        if (event.target.value.trim().length >= 2) {
          select('#erreur-prenom', panel).textContent = '';
          event.target.setAttribute('aria-invalid', 'false');
        }
      }
      if (event.target.name === 'mobile') {
        state.phone = event.target.value;
        const digits = event.target.value.replace(/\D/g, '');
        if (/^(?:0[67]|33[67])\d{8}$/.test(digits)) {
          select('#erreur-mobile', panel).textContent = '';
          event.target.setAttribute('aria-invalid', 'false');
        }
      }
    });

    panel.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-contact-form]');
      if (!form) return;
      event.preventDefault();
      const nameInput = select('#prenom', form);
      const phoneInput = select('#mobile', form);
      const nameError = select('#erreur-prenom', form);
      const phoneError = select('#erreur-mobile', form);
      const cleanName = nameInput.value.trim();
      const digits = phoneInput.value.replace(/\D/g, '');
      const validPhone = /^(?:0[67]|33[67])\d{8}$/.test(digits);
      let firstInvalid = null;

      nameError.textContent = cleanName.length >= 2 ? '' : 'Saisissez votre prénom.';
      phoneError.textContent = validPhone ? '' : 'Saisissez un numéro de mobile français valide.';
      nameInput.setAttribute('aria-invalid', String(cleanName.length < 2));
      phoneInput.setAttribute('aria-invalid', String(!validPhone));
      if (cleanName.length < 2) firstInvalid = nameInput;
      else if (!validPhone) firstInvalid = phoneInput;
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      state.firstName = cleanName;
      state.phone = phoneInput.value.trim();
      changeStep(5);
    });

    selectAll('[data-book-service]').forEach((link) => {
      link.addEventListener('click', () => {
        const item = serviceById(link.dataset.bookService);
        if (!item) return;
        window.clearTimeout(transitionTimer);
        panel.classList.remove('is-changing');
        state.service = item.id;
        state.day = null;
        state.time = null;
        state.firstName = '';
        state.phone = '';
        state.step = 1;
        renderStep();
      });
    });

    renderStep();
  }

  if (dock && dock.hidden && !dock.hasAttribute('aria-hidden')) dock.setAttribute('aria-hidden', 'true');
  root.dataset.siteReady = 'true';
})();
