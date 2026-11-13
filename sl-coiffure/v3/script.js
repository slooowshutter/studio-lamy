(() => {
  'use strict';

  const documentElement = document.documentElement;
  const body = document.body;
  const query = (selector, scope = document) => scope.querySelector(selector);
  const queryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  documentElement.classList.add('js');
  const ready = () => requestAnimationFrame(() => documentElement.classList.add('is-ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 500))]).then(ready);
  } else {
    ready();
  }

  /* Navigation mobile : le panneau reste dans le bandeau et rend le focus. */
  const menuButton = query('.menu-bouton');
  const navigation = query('#navigation');
  if (menuButton && navigation) {
    const backgroundParts = [query('.apercu'), query('#contenu'), query('.pied'), query('[data-barre-mobile]')].filter(Boolean);
    const closeNavigation = (returnFocus = false) => {
      navigation.classList.remove('is-ouverte');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
      backgroundParts.forEach((part) => { part.inert = false; });
      if (returnFocus) menuButton.focus();
    };
    const openNavigation = () => {
      navigation.classList.add('is-ouverte');
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'Fermer la navigation');
      backgroundParts.forEach((part) => { part.inert = true; });
      const firstLink = query('a', navigation);
      if (firstLink) firstLink.focus();
    };
    menuButton.addEventListener('click', () => {
      if (menuButton.getAttribute('aria-expanded') === 'true') closeNavigation(true);
      else openNavigation();
    });
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNavigation(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeNavigation(true);
    });
    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 58.01rem)').matches && menuButton.getAttribute('aria-expanded') === 'true') closeNavigation(false);
    }, { passive: true });
  }

  /* Les cartes se révèlent une fois, sans cacher le contenu si l’observateur manque. */
  const revealItems = queryAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible'));
  }

  /* Barre d’appel : elle apparaît après les boutons du premier écran. */
  const heroActions = query('.hero__actions');
  const bookingSection = query('#rendez-vous');
  const footer = query('.pied');
  if ('IntersectionObserver' in window && heroActions) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      body.classList.toggle('barre-active', !entry.isIntersecting);
    }, { threshold: 0.05 });
    heroObserver.observe(heroActions);
  } else {
    body.classList.add('barre-active');
  }
  if ('IntersectionObserver' in window) {
    const barHideObserver = new IntersectionObserver((entries) => {
      const overBooking = entries.some((entry) => entry.target === bookingSection && entry.isIntersecting);
      const overFooter = entries.some((entry) => entry.target === footer && entry.isIntersecting);
      body.classList.toggle('barre-cachee', overBooking || overFooter);
    }, { threshold: 0.08 });
    if (bookingSection) barHideObserver.observe(bookingSection);
    if (footer) barHideObserver.observe(footer);
  }

  /* Dates réellement calculées ; seuls les jours dont les horaires sont publiés restent actifs. */
  const dayContainer = query('#choix-jours');
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const selectedDaySummary = query('[data-recap-jour]');
  let selectedDay = null;
  let selectedDate = null;
  const weekdayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  const localDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const titleCase = (value) => value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);
  const readableDate = (date) => titleCase(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date));

  function buildDays() {
    if (!dayContainer) return;
    const parisParts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const parisDate = Object.fromEntries(parisParts.map((part) => [part.type, part.value]));
    const today = new Date(Date.UTC(Number(parisDate.year), Number(parisDate.month) - 1, Number(parisDate.day), 12));
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + offset);
      const dayIndex = date.getUTCDay();
      const weekday = weekdayNames[dayIndex];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jour';
      button.dataset.date = localDate(date);
      button.dataset.jour = weekday;
      button.setAttribute('aria-pressed', 'false');
      const dayName = document.createElement('span');
      dayName.textContent = titleCase(weekday);
      const dateNumber = document.createElement('b');
      dateNumber.textContent = String(date.getDate());
      const dateMonth = document.createElement('small');
      dateMonth.textContent = dateFormatter.format(date).replace('.', '');
      button.append(dayName, dateNumber, dateMonth);

      if (dayIndex === 0) {
        button.disabled = true;
        button.setAttribute('aria-label', `${readableDate(date)} · fermé`);
        dateMonth.textContent = 'Fermé';
      } else if (dayIndex === 1) {
        button.disabled = true;
        button.setAttribute('aria-label', `${readableDate(date)} · horaires à confirmer`);
        dateMonth.textContent = 'À confirmer';
      } else {
        button.setAttribute('aria-label', `Choisir ${readableDate(date)}`);
        button.addEventListener('click', () => chooseDay(button, date));
      }
      dayContainer.append(button);
    }
  }

  function chooseDay(button, date) {
    queryAll('.jour', dayContainer).forEach((dayButton) => dayButton.setAttribute('aria-pressed', 'false'));
    button.setAttribute('aria-pressed', 'true');
    selectedDay = button.dataset.jour;
    selectedDate = date;
    if (selectedDaySummary) selectedDaySummary.textContent = readableDate(date);
    const error = query('#erreur-jour');
    if (error) error.hidden = true;
  }
  buildDays();

  /* Parcours local : prestation, jour ouvert, ticket imprimable. Rien n’est envoyé. */
  const form = query('#formulaire-rendez-vous');
  const steps = queryAll('.etape[data-etape]');
  const confirmation = query('#confirmation');
  const status = query('#statut-simulation');
  const selectedServiceSummary = query('[data-recap-prestation]');
  const serviceRadios = queryAll('input[name="prestation"]');
  let activeStep = 1;
  let transitionTimer = 0;
  if (steps[0]) steps[0].classList.add('is-active');

  function selectedService() {
    const checked = serviceRadios.find((radio) => radio.checked);
    return checked ? checked.value : '';
  }
  function updateService() {
    const service = selectedService();
    if (selectedServiceSummary) selectedServiceSummary.textContent = service || 'Pas encore de prestation';
    const error = query('#erreur-prestation');
    if (error && service) error.hidden = true;
  }
  serviceRadios.forEach((radio) => radio.addEventListener('change', updateService));

  function changeStep(nextStep) {
    const oldStep = steps.find((step) => Number(step.dataset.etape) === activeStep);
    const newStep = steps.find((step) => Number(step.dataset.etape) === nextStep);
    if (!oldStep || !newStep) return;
    window.clearTimeout(transitionTimer);
    oldStep.classList.remove('is-active');
    oldStep.classList.add('is-sortie');
    newStep.hidden = false;
    newStep.classList.remove('is-sortie');
    void newStep.offsetWidth;
    newStep.classList.add('is-active');
    transitionTimer = window.setTimeout(() => {
      oldStep.hidden = true;
      oldStep.classList.remove('is-sortie');
      activeStep = nextStep;
      const heading = query('h3', newStep);
      if (heading) heading.focus({ preventScroll: true });
    }, reduceMotion.matches ? 100 : 240);
  }

  queryAll('[data-suivant]').forEach((button) => button.addEventListener('click', () => {
    if (!selectedService()) {
      const error = query('#erreur-prestation');
      error.hidden = false;
      serviceRadios[0].focus();
      return;
    }
    changeStep(2);
  }));
  queryAll('[data-precedent]').forEach((button) => button.addEventListener('click', () => changeStep(1)));

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!selectedService()) {
        changeStep(1);
        query('#erreur-prestation').hidden = false;
        return;
      }
      if (!selectedDay || !selectedDate) {
        const error = query('#erreur-jour');
        error.hidden = false;
        const firstAvailableDay = query('.jour:not(:disabled)', dayContainer);
        if (firstAvailableDay) firstAvailableDay.focus();
        return;
      }
      query('[data-sortie-prestation]').textContent = selectedService();
      query('[data-sortie-jour]').textContent = readableDate(selectedDate);
      steps.forEach((step) => { step.hidden = true; step.classList.remove('is-active'); });
      form.hidden = true;
      confirmation.hidden = false;
      requestAnimationFrame(() => query('.ticket--sortie', confirmation).classList.add('is-imprime'));
      status.textContent = 'Ticket de simulation imprimé · rien n’a été transmis.';
      const heading = query('#titre-confirmation');
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  /* Les tickets des prestations préremplissent la première étape. */
  queryAll('[data-choisir]').forEach((button) => button.addEventListener('click', () => {
    const choice = serviceRadios.find((radio) => radio.value === button.dataset.choisir);
    if (!choice) return;
    if (form.hidden) {
      form.hidden = false;
      confirmation.hidden = true;
      steps.forEach((step) => { step.hidden = Number(step.dataset.etape) !== 1; });
      activeStep = 1;
      steps[0].classList.add('is-active');
      query('.ticket--sortie', confirmation).classList.remove('is-imprime');
      selectedDay = null;
      selectedDate = null;
      queryAll('.jour', dayContainer).forEach((dayButton) => dayButton.setAttribute('aria-pressed', 'false'));
      if (selectedDaySummary) selectedDaySummary.textContent = 'Choisissez un jour dans la liste.';
      status.textContent = 'Simulation de réservation · rien n’est transmis.';
    }
    const needsPreviousStep = activeStep !== 1;
    if (needsPreviousStep) changeStep(1);
    choice.checked = true;
    updateService();
    document.getElementById('rendez-vous').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => query('#titre-etape-prestation').focus({ preventScroll: true }), needsPreviousStep && !reduceMotion.matches ? 250 : 0);
  }));

  queryAll('[data-recommencer]').forEach((button) => button.addEventListener('click', () => {
    confirmation.hidden = true;
    form.hidden = false;
    steps.forEach((step) => { step.hidden = Number(step.dataset.etape) !== 1; });
    steps[0].classList.add('is-active');
    query('.ticket--sortie', confirmation).classList.remove('is-imprime');
    serviceRadios.forEach((radio) => { radio.checked = false; });
    queryAll('.jour', dayContainer).forEach((dayButton) => dayButton.setAttribute('aria-pressed', 'false'));
    selectedDay = null;
    selectedDate = null;
    if (selectedServiceSummary) selectedServiceSummary.textContent = 'Pas encore de prestation';
    if (selectedDaySummary) selectedDaySummary.textContent = 'Choisissez un jour dans la liste.';
    status.textContent = 'Simulation de réservation · rien n’est transmis.';
    activeStep = 1;
    query('#titre-etape-prestation').focus();
  }));

  queryAll('[data-imprimer]').forEach((button) => button.addEventListener('click', () => {
    body.classList.add('is-impression');
    window.print();
  }));
  window.addEventListener('afterprint', () => body.classList.remove('is-impression'));

  /* Si un contrôle de menu est activé depuis une ancre, le focus suit la destination. */
  document.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || !menuButton || menuButton.getAttribute('aria-expanded') !== 'true') return;
    navigation.classList.remove('is-ouverte');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
    [query('.apercu'), query('#contenu'), query('.pied'), query('[data-barre-mobile]')].filter(Boolean).forEach((part) => { part.inert = false; });
  });
})();
