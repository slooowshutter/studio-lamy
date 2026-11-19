document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const siteHeader = document.querySelector('.site-header');
const siteNav = document.querySelector('.site-nav');

function closeMenu(returnFocus) {
  if (!menuButton || !siteHeader) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
  siteHeader.classList.remove('menu-open');
  if (returnFocus) menuButton.focus();
}

if (menuButton && siteHeader && siteNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Ouvrir la navigation' : 'Fermer la navigation');
    siteHeader.classList.toggle('menu-open', !isOpen);
    if (!isOpen) {
      const firstLink = siteNav.querySelector('a');
      if (firstLink) firstLink.focus();
    }
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });
}

const sign = document.querySelector('[data-sign]');
const heroEntrance = document.querySelector('.hero');
if (sign) {
  requestAnimationFrame(() => {
    sign.classList.add('is-lit');
    if (heroEntrance) heroEntrance.classList.add('is-ready');
  });
}

const revealItems = document.querySelectorAll('.reveal, .price-panel');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -34px 0px' });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const mobileActions = document.querySelector('.mobile-actions');
const hero = document.querySelector('#accueil');
const bookingSection = document.querySelector('#reservation');
const footer = document.querySelector('.site-footer');

if (mobileActions && hero && bookingSection && footer && 'IntersectionObserver' in window) {
  const visibility = { hero: true, booking: false, footer: false };
  const updateActions = () => {
    const show = !visibility.hero && !visibility.booking && !visibility.footer;
    mobileActions.classList.toggle('is-visible', show);
    mobileActions.setAttribute('aria-hidden', String(!show));
    mobileActions.inert = !show;
  };
  const actionsObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === hero) visibility.hero = entry.isIntersecting;
      if (entry.target === bookingSection) visibility.booking = entry.isIntersecting;
      if (entry.target === footer) visibility.footer = entry.isIntersecting;
    });
    updateActions();
  }, { threshold: 0.05 });
  actionsObserver.observe(hero);
  actionsObserver.observe(bookingSection);
  actionsObserver.observe(footer);
} else if (mobileActions) {
  mobileActions.classList.add('is-visible');
  mobileActions.setAttribute('aria-hidden', 'false');
  mobileActions.inert = false;
}

const form = document.querySelector('#booking-form');
const formTrack = document.querySelector('.step-track');
const steps = form ? Array.from(form.querySelectorAll('[data-step]')) : [];
const indicators = Array.from(document.querySelectorAll('[data-step-indicator]'));
const success = document.querySelector('#booking-success');
const motifInput = document.querySelector('#motif-demande');
const momentInput = document.querySelector('#moment-demande');
const firstNameInput = document.querySelector('#prenom');
const phoneInput = document.querySelector('#telephone');
const summaryMotif = document.querySelector('[data-summary-motif]');
const summaryMoment = document.querySelector('[data-summary-moment]');
let currentStep = 0;
let summaryTimer;

function updateSummary(force) {
  window.clearTimeout(summaryTimer);
  const writeSummary = () => {
    const motif = motifInput.value.trim();
    const moment = momentInput.value.trim();
    summaryMotif.textContent = motif || 'À préciser';
    summaryMoment.textContent = moment || 'À convenir';
  };
  if (force) writeSummary();
  else summaryTimer = window.setTimeout(writeSummary, 350);
}

function setFieldError(input, errorId, message) {
  const error = document.getElementById(errorId);
  error.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function moveToStep(index) {
  currentStep = index;
  steps.forEach((step, stepIndex) => {
    const active = stepIndex === index;
    step.hidden = !active;
    step.setAttribute('aria-hidden', String(!active));
    step.classList.toggle('is-current', active);
    step.classList.toggle('is-entering', active);
  });
  indicators.forEach((indicator, indicatorIndex) => {
    const active = indicatorIndex === index;
    indicator.classList.toggle('is-current', active);
    if (active) indicator.setAttribute('aria-current', 'step');
    else indicator.removeAttribute('aria-current');
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const activeStep = steps[index];
      if (activeStep) activeStep.classList.remove('is-entering');
    });
  });
  const heading = steps[index].querySelector('h3');
  if (heading) heading.focus({ preventScroll: true });
}

function clearFieldErrors() {
  setFieldError(motifInput, 'motif-erreur', '');
  setFieldError(firstNameInput, 'prenom-erreur', '');
  setFieldError(phoneInput, 'telephone-erreur', '');
}

if (form && steps.length === 2 && motifInput && momentInput && firstNameInput && phoneInput && success) {
  [motifInput, momentInput].forEach((input) => {
    input.addEventListener('input', updateSummary);
  });

  form.querySelector('[data-next]').addEventListener('click', () => {
    const motif = motifInput.value.trim();
    setFieldError(motifInput, 'motif-erreur', motif ? '' : 'Indiquez votre demande ou appelez le salon.');
    if (!motif) {
      motifInput.focus();
      return;
    }
    updateSummary(true);
    moveToStep(1);
  });

  form.querySelector('[data-back]').addEventListener('click', () => moveToStep(0));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (currentStep === 0) {
      form.querySelector('[data-next]').click();
      return;
    }
    const firstName = firstNameInput.value.trim();
    const phone = phoneInput.value.trim().replace(/[ .-]/g, '');
    const phoneIsValid = /^(?:\+33|0)[67]\d{8}$/.test(phone);
    setFieldError(firstNameInput, 'prenom-erreur', firstName ? '' : 'Saisissez votre prénom.');
    setFieldError(phoneInput, 'telephone-erreur', phoneIsValid ? '' : 'Saisissez un numéro mobile français valide.');
    if (!firstName) {
      firstNameInput.focus();
      return;
    }
    if (!phoneIsValid) {
      phoneInput.focus();
      return;
    }

    updateSummary(true);
    form.hidden = true;
    formTrack.hidden = true;
    success.hidden = false;
    success.classList.add('is-entering');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => success.classList.remove('is-entering'));
    });
    const heading = success.querySelector('h3');
    if (heading) heading.focus({ preventScroll: true });
  });

  success.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    clearFieldErrors();
    summaryMotif.textContent = 'À préciser';
    summaryMoment.textContent = 'À convenir';
    success.hidden = true;
    form.hidden = false;
    formTrack.hidden = false;
    moveToStep(0);
  });
}
