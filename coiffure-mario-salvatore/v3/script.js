document.documentElement.classList.add('js');

const menuButton = document.querySelector('.navigation__commande');
const mobileNavigation = document.querySelector('#navigation-mobile');

function closeNavigation(returnFocus = false) {
  if (!menuButton || !mobileNavigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Ouvrir la navigation');
  mobileNavigation.hidden = true;
  if (returnFocus) menuButton.focus();
}

if (menuButton && mobileNavigation) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? 'Ouvrir la navigation' : 'Fermer la navigation');
    mobileNavigation.hidden = open;
    if (!open) mobileNavigation.querySelector('a')?.focus();
  });

  mobileNavigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeNavigation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeNavigation(true);
    }
  });
}

const hero = document.querySelector('.hero');
if (hero) requestAnimationFrame(() => hero.classList.add('hero--visible'));

const revealRows = [...document.querySelectorAll('.reveal-ligne')];
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const order = revealRows.indexOf(entry.target);
      entry.target.style.transitionDelay = `${Math.max(0, order) * 55}ms`;
      entry.target.classList.add('est-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
  revealRows.forEach((row) => revealObserver.observe(row));
} else {
  revealRows.forEach((row) => row.classList.add('est-visible'));
}

const booking = document.querySelector('[data-parcours]');
if (booking) {
  const panels = [...booking.querySelectorAll('[data-panneau]')];
  const stepButtons = [...booking.querySelectorAll('[data-aller-etape]')];
  const announcement = booking.querySelector('[data-annonce-parcours]');
  const dayList = booking.querySelector('[data-jours]');
  const timeList = booking.querySelector('[data-heures]');
  const serviceInputs = [...booking.querySelectorAll('input[name="prestation"]')];
  const selectionService = document.querySelector('[data-selection-prestation]');
  const selectionDay = document.querySelector('[data-selection-jour]');
  const selectionTime = document.querySelector('[data-selection-heure]');
  const selectionAnnouncement = document.querySelector('[data-selection-annonce]');
  const firstName = booking.querySelector('#prenom');
  const phone = booking.querySelector('#telephone');
  const firstNameError = booking.querySelector('#erreur-prenom');
  const phoneError = booking.querySelector('#erreur-telephone');
  const detailsForm = booking.querySelector('[data-form-coordonnees]');
  const confirmButton = booking.querySelector('[data-confirmer]');
  const recap = booking.querySelector('[data-recapitulatif]');
  const finalRecap = booking.querySelector('[data-recapitulatif-final]');
  const now = new Date();
  const openMinute = 9 * 60 + 30;
  const closeMinute = 19 * 60 + 30;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentStep = 0;
  let unlockedStep = 0;
  let selectedDate = null;
  let selectedTime = '';

  const selectedService = () => serviceInputs.find((input) => input.checked);

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function fullDate(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long'
    }).format(date);
  }

  function shortWeekday(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
  }

  function shortMonth(date) {
    return new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
  }

  function minutesToTime(minutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  function updateSummary() {
    const service = selectedService();
    if (selectionService) selectionService.textContent = service ? service.dataset.libelle : 'Choisir une prestation';
    if (selectionDay) selectionDay.textContent = selectedDate ? fullDate(selectedDate) : 'Jour à choisir';
    if (selectionTime) selectionTime.textContent = selectedTime || 'Heure à choisir';
    if (selectionAnnouncement) {
      const spoken = [service?.dataset.libelle, selectedDate ? fullDate(selectedDate) : '', selectedTime]
        .filter(Boolean)
        .join(', ');
      selectionAnnouncement.textContent = spoken || 'Aucune sélection pour le moment.';
    }
    if (recap) fillRecap(recap);
  }

  function fillRecap(container) {
    const service = selectedService();
    const rows = [
      ['Prestation', service ? service.dataset.libelle : 'À choisir'],
      ['Durée', service ? `${service.dataset.duree} min` : 'À choisir'],
      ['Jour', selectedDate ? fullDate(selectedDate) : 'À choisir'],
      ['Heure', selectedTime || 'À choisir']
    ];
    container.replaceChildren();
    rows.forEach(([label, value]) => {
      const row = document.createElement('p');
      const key = document.createElement('span');
      const content = document.createElement('span');
      key.textContent = label;
      content.textContent = value;
      row.append(key, content);
      container.append(row);
    });
  }

  function announceStep(step) {
    if (!announcement) return;
    const labels = ['choisissez une prestation', 'choisissez un jour et une heure', 'indiquez vos coordonnées', 'vérifiez votre sélection'];
    announcement.textContent = step === 3
      ? 'Démonstration terminée. Aucune demande n’a été envoyée.'
      : `Étape ${step + 1} sur 3 : ${labels[step]}.`;
  }

  function goToStep(step, moveFocus = true) {
    if (step < 0 || step > 3 || step > unlockedStep) return;
    currentStep = step;
    panels.forEach((panel, index) => {
      const active = index === step;
      panel.hidden = !active;
      panel.classList.toggle('est-entrant', active && !reducedMotion);
      if (active && !reducedMotion) {
        window.setTimeout(() => panel.classList.remove('est-entrant'), 240);
      }
    });
    stepButtons.forEach((button) => {
      const index = Number(button.dataset.allerEtape);
      button.disabled = index > unlockedStep;
      button.classList.toggle('est-active', index === step);
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    announceStep(step);
    updateSummary();
    const heading = panels[step]?.querySelector('h3');
    if (moveFocus && heading) heading.focus({ preventScroll: true });
  }

  function isInPast(date, minute) {
    if (dateKey(date) !== dateKey(now)) return false;
    return minute < now.getHours() * 60 + now.getMinutes();
  }

  function isDemonstrationUnavailable(date, minute) {
    const key = `${dateKey(date)}-${minute}`;
    let total = 0;
    for (let index = 0; index < key.length; index += 1) total += key.charCodeAt(index) * (index + 3);
    return total % 11 === 0;
  }

  function drawTimes() {
    if (!timeList) return;
    timeList.replaceChildren();
    selectedTime = '';
    const service = selectedService();
    if (!selectedDate || selectedDate.getDay() === 0 || !service) {
      const note = document.createElement('p');
      note.textContent = 'Choisissez un jour ouvert.';
      timeList.append(note);
      updateSummary();
      return;
    }

    const duration = Number(service.dataset.duree);
    const lastStart = closeMinute - duration;
    let count = 0;
    for (let minute = openMinute; minute <= lastStart; minute += 30) {
      const button = document.createElement('button');
      const time = minutesToTime(minute);
      const past = isInPast(selectedDate, minute);
      const unavailable = isDemonstrationUnavailable(selectedDate, minute);
      button.type = 'button';
      button.className = 'heure';
      button.textContent = time;
      button.dataset.heure = time;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', unavailable
        ? `${time}, indisponible dans cette démonstration`
        : `${time}, créneau de démonstration`);
      button.disabled = past || unavailable;
      if (unavailable) button.title = 'Indisponible pour cette démonstration';
      if (past) button.title = 'Heure déjà passée';
      button.addEventListener('click', () => {
        selectedTime = time;
        timeList.querySelectorAll('.heure').forEach((item) => {
          const active = item === button;
          item.classList.toggle('est-selectionnee', active);
          item.setAttribute('aria-pressed', String(active));
        });
        updateSummary();
      });
      timeList.append(button);
      count += 1;
    }
    const legend = document.createElement('p');
    legend.className = 'heures__legende';
    legend.textContent = 'Les horaires suivent la plage affichée par le salon. Les créneaux barrés sont fictifs.';
    timeList.append(legend);
    if (count === 0) {
      const note = document.createElement('p');
      note.textContent = 'Aucun créneau ne tient dans les horaires affichés pour cette durée. Choisissez un autre jour.';
      timeList.prepend(note);
    }
    updateSummary();
  }

  function drawDays() {
    if (!dayList) return;
    dayList.replaceChildren();
    const dates = [];
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      dates.push(date);
      const closed = date.getDay() === 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'jour';
      button.disabled = closed;
      button.dataset.date = dateKey(date);
      const weekday = document.createElement('span');
      const number = document.createElement('span');
      weekday.className = 'jour__nom';
      number.className = 'jour__numero';
      weekday.textContent = shortWeekday(date);
      number.textContent = String(date.getDate());
      button.append(weekday, number);
      if (offset === 0 || date.getMonth() !== dates[offset - 1].getMonth()) {
        const month = document.createElement('span');
        month.className = 'jour__mois';
        month.textContent = shortMonth(date);
        button.append(month);
      }
      if (closed) {
        const state = document.createElement('span');
        state.className = 'jour__etat';
        state.textContent = 'Fermé';
        button.append(state);
      }
      button.setAttribute('aria-label', `${fullDate(date)}${closed ? ', fermé' : ', ouvert selon les horaires affichés'}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        selectedDate = date;
        selectedTime = '';
        dayList.querySelectorAll('.jour').forEach((item) => {
          const active = item === button;
          item.classList.toggle('est-selectionne', active);
          item.setAttribute('aria-pressed', String(active));
        });
        drawTimes();
      });
      dayList.append(button);
    }
    selectedDate = dates.find((date) => date.getDay() !== 0) || null;
    if (selectedDate) {
      dayList.querySelector(`[data-date="${dateKey(selectedDate)}"]`)?.classList.add('est-selectionne');
      dayList.querySelector(`[data-date="${dateKey(selectedDate)}"]`)?.setAttribute('aria-pressed', 'true');
    }
    drawTimes();
  }

  serviceInputs.forEach((input) => input.addEventListener('change', () => {
    selectedTime = '';
    unlockedStep = Math.min(unlockedStep, 1);
    if (selectedDate) drawTimes();
    updateSummary();
  }));

  dayList?.addEventListener('click', (event) => {
    if (event.target.closest('.jour')) unlockedStep = Math.min(unlockedStep, 1);
  });

  booking.querySelectorAll('[data-suite]').forEach((button) => button.addEventListener('click', () => {
    if (currentStep === 0 && selectedService()) {
      unlockedStep = Math.max(unlockedStep, 1);
      goToStep(1);
      return;
    }
    if (currentStep === 1 && selectedDate && selectedTime) {
      unlockedStep = Math.max(unlockedStep, 2);
      goToStep(2);
      return;
    }
    if (currentStep === 1) {
      if (announcement) announcement.textContent = 'Choisissez un jour ouvert et un créneau avant de continuer.';
      const note = document.createElement('p');
      note.className = 'heures__legende';
      note.textContent = selectedDate ? 'Choisissez une heure pour continuer.' : 'Choisissez un jour ouvert pour continuer.';
      timeList?.append(note);
    }
  }));

  booking.querySelectorAll('[data-retour]').forEach((button) => button.addEventListener('click', () => goToStep(currentStep - 1)));
  stepButtons.forEach((button) => button.addEventListener('click', () => goToStep(Number(button.dataset.allerEtape))));

  function validateDetails() {
    const nameOkay = firstName.value.trim().length > 0;
    const digits = phone.value.replace(/\D/g, '');
    const phoneOkay = /^(?:0[67]\d{8}|33[67]\d{8})$/.test(digits);
    firstName.setAttribute('aria-invalid', String(!nameOkay));
    phone.setAttribute('aria-invalid', String(!phoneOkay));
    firstNameError.textContent = nameOkay ? '' : 'Saisissez votre prénom pour continuer.';
    phoneError.textContent = phoneOkay ? '' : 'Saisissez un numéro de téléphone mobile français valide.';
    if (!nameOkay) {
      firstName.focus();
      return false;
    }
    if (!phoneOkay) {
      phone.focus();
      return false;
    }
    return true;
  }

  if (confirmButton) confirmButton.disabled = false;

  detailsForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateDetails()) return;
    fillRecap(finalRecap);
    unlockedStep = 3;
    panels[3].querySelector('h3').textContent = `Votre sélection est prête, ${firstName.value.trim()}.`;
    goToStep(3);
  });

  booking.querySelector('[data-recommencer]')?.addEventListener('click', () => {
    booking.querySelector('input[name="prestation"]').checked = true;
    firstName.value = '';
    phone.value = '';
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    firstNameError.textContent = '';
    phoneError.textContent = '';
    unlockedStep = 0;
    selectedTime = '';
    drawDays();
    goToStep(0);
  });

  firstName?.addEventListener('input', () => firstName.removeAttribute('aria-invalid'));
  phone?.addEventListener('input', () => phone.removeAttribute('aria-invalid'));

  if (dayList && timeList) drawDays();
  updateSummary();
  goToStep(0, false);
}

const mobileBar = document.querySelector('[data-barre-mobile]');
const heroActions = document.querySelector('.hero__liens');
const reservationSection = document.querySelector('#rendez-vous');
const footer = document.querySelector('.pied-page');
if (mobileBar && heroActions && reservationSection && footer && 'IntersectionObserver' in window) {
  const seen = { hero: true, reservation: false, footer: false };
  const updateBar = () => {
    const show = !seen.hero && !seen.reservation && !seen.footer;
    mobileBar.classList.toggle('est-visible', show);
  };
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === heroActions) seen.hero = entry.isIntersecting;
      if (entry.target === reservationSection) seen.reservation = entry.isIntersecting;
      if (entry.target === footer) seen.footer = entry.isIntersecting;
    });
    updateBar();
  }, { threshold: 0.01 });
  barObserver.observe(heroActions);
  barObserver.observe(reservationSection);
  barObserver.observe(footer);
}
