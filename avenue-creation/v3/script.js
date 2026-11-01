(() => {
  const hero = document.querySelector('.hero');
  const booking = document.querySelector('#reserver');
  const footer = document.querySelector('.site-footer');
  const stickyBar = document.querySelector('.sticky-bar');

  const prestations = {
    coupe: { nom: 'Coupe' },
    coloration: { nom: 'Coloration' },
    meches: { nom: 'Mèches ou balayage' },
    soin: { nom: 'Soin des cheveux' }
  };

  const horaires = {
    2: { ouverture: 9 * 60, fermeture: 17 * 60 },
    3: { ouverture: 9 * 60, fermeture: 15 * 60 },
    4: { ouverture: 9 * 60, fermeture: 17 * 60 },
    5: { ouverture: 9 * 60, fermeture: 17 * 60 },
    6: { ouverture: 8 * 60 + 30, fermeture: 16 * 60 }
  };

  const formatCourt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Paris'
  });
  const formatLong = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris'
  });

  const form = document.querySelector('#booking-form');
  const panels = Array.from(document.querySelectorAll('.booking-step'));
  const stepLinks = Array.from(document.querySelectorAll('[data-step-link]'));
  const dayOptions = document.querySelector('#day-options');
  const timeOptions = document.querySelector('#time-options');
  const live = document.querySelector('#booking-live');
  const successPanel = document.querySelector('#booking-success');
  const successHeading = document.querySelector('#titre-confirmation');
  const successRecap = document.querySelector('#success-recap');
  const selectedDayLabel = document.querySelector('#selected-day-label');
  const summary = {
    service: document.querySelector('#selection-service'),
    date: document.querySelector('#selection-date'),
    time: document.querySelector('#selection-time'),
    price: document.querySelector('#selection-price')
  };

  let currentStep = 0;
  let furthestStep = 0;
  let chosenService = '';
  let chosenDate = null;
  let chosenTime = '';
  let dates = [];

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function chosenServiceData() {
    return prestations[chosenService] || null;
  }

  function formatHeure(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${String(hours).padStart(2, '0')} h ${String(rest).padStart(2, '0')}`;
  }

  function updateSummary() {
    const service = chosenServiceData();
    setText(summary.service, service ? service.nom : 'À choisir');
    setText(summary.date, chosenDate ? formatLong.format(chosenDate) : 'À choisir');
    setText(summary.time, chosenTime || 'À choisir');
    setText(summary.price, 'Appelez le salon');
  }

  function setLive(message) {
    setText(live, message);
  }

  function showStep(index) {
    if (index < 0 || index > 3 || index > furthestStep) return;
    const outgoingIndex = currentStep;
    const outgoing = panels[outgoingIndex];
    const incoming = panels[index];
    currentStep = index;

    if (outgoing && outgoing !== incoming) {
      outgoing.classList.remove('is-visible');
      outgoing.setAttribute('aria-hidden', 'true');
      outgoing.inert = true;
      window.setTimeout(() => {
        if (currentStep !== outgoingIndex) outgoing.hidden = true;
      }, 235);
    }

    incoming.hidden = false;
    incoming.inert = false;
    incoming.setAttribute('aria-hidden', 'false');
    incoming.classList.remove('is-visible');
    window.requestAnimationFrame(() => incoming.classList.add('is-visible'));

    stepLinks.forEach((link, linkIndex) => {
      link.classList.toggle('is-current', linkIndex === index);
      link.disabled = linkIndex > furthestStep;
      if (linkIndex === index) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });

    const heading = incoming.querySelector('h3');
    if (heading) heading.focus();
    if (index === 1) renderDays();
    if (index === 2) renderTimes();
    setLive(`Étape ${index + 1} sur 4. ${['Choisissez une prestation.', 'Choisissez un jour ouvert.', 'Choisissez un créneau.', 'Renseignez vos coordonnées.'][index]}`);
  }

  function updateProgress() {
    stepLinks.forEach((link, index) => {
      link.disabled = index > furthestStep;
    });
  }

  function midnightOf(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function makeDays() {
    const today = midnightOf(new Date());
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      return { date, open: Boolean(horaires[date.getDay()]) };
    });
  }

  function renderDays() {
    dates = makeDays();
    dayOptions.replaceChildren();
    dates.forEach(({ date, open }, index) => {
      const button = document.createElement('button');
      const label = document.createElement('strong');
      const detail = document.createElement('span');
      const shortLabel = formatCourt.format(date).replace('.', '');
      button.type = 'button';
      button.className = 'day-choice';
      button.disabled = !open;
      button.setAttribute('aria-pressed', String(Boolean(chosenDate && midnightOf(chosenDate).getTime() === date.getTime())));
      button.setAttribute('aria-label', `${formatLong.format(date)}${open ? ', ouvert selon les horaires relevés' : ', fermé'}`);
      label.textContent = shortLabel;
      detail.textContent = open ? (index === 0 ? 'Aujourd’hui' : 'Ouvert') : 'Fermé';
      if (!open) detail.className = 'closed-mark';
      if (chosenDate && midnightOf(chosenDate).getTime() === date.getTime()) button.classList.add('is-selected');
      button.append(label, detail);
      button.addEventListener('click', () => {
        chosenDate = date;
        chosenTime = '';
        furthestStep = Math.min(furthestStep, 2);
        renderDays();
        dayOptions.querySelector('.is-selected')?.focus({ preventScroll: true });
        updateSummary();
        setLive(`${formatLong.format(date)} sélectionné. Choisissez un créneau à l’étape suivante.`);
      });
      dayOptions.append(button);
    });
  }

  function slotIsTaken(date, minutes) {
    const stamp = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const serviceIndex = Object.keys(prestations).indexOf(chosenService);
    return ((stamp + minutes * 7 + serviceIndex * 13) % 11) === 0 || ((stamp + minutes * 3 + serviceIndex * 5) % 17) === 0;
  }

  function isPastToday(date, minutes) {
    const now = new Date();
    return midnightOf(date).getTime() === midnightOf(now).getTime() && minutes <= now.getHours() * 60 + now.getMinutes();
  }

  function renderTimes() {
    timeOptions.replaceChildren();
    const service = chosenServiceData();
    const hours = chosenDate && horaires[chosenDate.getDay()];
    if (!chosenDate || !hours || !service) {
      setText(selectedDayLabel, 'Choisissez un jour ouvert à l’étape précédente.');
      return;
    }

    setText(selectedDayLabel, `${formatLong.format(chosenDate)} · créneaux fictifs, générés pour la démonstration.`);
    let count = 0;
    for (let start = hours.ouverture; start < hours.fermeture; start += 30) {
      const taken = slotIsTaken(chosenDate, start);
      const past = isPastToday(chosenDate, start);
      const button = document.createElement('button');
      const time = formatHeure(start);
      const detail = document.createElement('span');
      button.type = 'button';
      button.className = 'time-choice';
      button.setAttribute('aria-pressed', String(chosenTime === time));
      button.setAttribute('aria-label', `${time}${taken ? ', déjà pris dans cette simulation' : past ? ', heure passée' : ', disponible dans cette simulation'}`);
      button.disabled = taken || past;
      if (taken) button.classList.add('is-taken');
      if (chosenTime === time) button.classList.add('is-selected');
      button.append(document.createTextNode(time));
      detail.textContent = taken ? 'Déjà pris' : past ? 'Passé' : 'Exemple';
      button.append(detail);
      button.addEventListener('click', () => {
        chosenTime = time;
        renderTimes();
        timeOptions.querySelector('.is-selected')?.focus({ preventScroll: true });
        updateSummary();
        setLive(`${time} sélectionné pour ${formatLong.format(chosenDate)}.`);
      });
      timeOptions.append(button);
      count += 1;
    }

    if (count === 0) {
      const note = document.createElement('p');
      note.textContent = 'Aucun créneau fictif pour ce jour. Revenez au choix du jour ou de la prestation.';
      timeOptions.append(note);
    }
  }

  function showError(id, visible) {
    const error = document.getElementById(id);
    if (error) error.hidden = !visible;
  }

  function validateStep(index) {
    if (index === 0) {
      const selected = form.querySelector('input[name="prestation"]:checked');
      showError('erreur-prestation', !selected);
      if (selected) {
        chosenService = selected.value;
        return true;
      }
      return false;
    }
    if (index === 1) {
      const valid = Boolean(chosenDate && horaires[chosenDate.getDay()]);
      showError('erreur-jour', !valid);
      return valid;
    }
    if (index === 2) {
      const valid = Boolean(chosenTime);
      showError('erreur-heure', !valid);
      return valid;
    }
    return true;
  }

  form.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const changed = chosenService !== radio.value;
      chosenService = radio.value;
      if (changed) {
        chosenDate = null;
        chosenTime = '';
        furthestStep = Math.min(furthestStep, 1);
        if (currentStep >= 1) renderDays();
        if (currentStep >= 2) renderTimes();
      }
      showError('erreur-prestation', false);
      updateSummary();
      setLive(`${prestations[chosenService].nom} sélectionné. Tarifs et durées : appelez le salon.`);
    });
  });

  document.querySelectorAll('[data-preselection]').forEach((link) => {
    link.addEventListener('click', () => {
      const serviceName = link.dataset.preselection;
      const radio = form.querySelector(`input[name="prestation"][value="${serviceName}"]`);
      if (!radio) return;
      if (!successPanel.hidden) document.querySelector('#restart-booking').click();
      radio.checked = true;
      chosenDate = null;
      chosenTime = '';
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      furthestStep = 1;
      updateProgress();
      showStep(1);
    });
  });

  form.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validateStep(currentStep)) {
        const error = panels[currentStep].querySelector('.field-error:not([hidden])');
        if (error) error.focus?.();
        return;
      }
      furthestStep = Math.max(furthestStep, currentStep + 1);
      updateProgress();
      updateSummary();
      showStep(currentStep + 1);
    });
  });

  form.querySelectorAll('[data-previous]').forEach((button) => {
    button.addEventListener('click', () => showStep(currentStep - 1));
  });

  stepLinks.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.stepLink);
      if (index <= furthestStep) showStep(index);
    });
  });

  const firstName = document.querySelector('#prenom');
  const phone = document.querySelector('#telephone');
  const contactError = document.querySelector('#erreur-coordonnees');

  function validateContact() {
    const validName = firstName.value.trim().length >= 2;
    const rawPhone = phone.value.trim().replace(/[ .()-]/g, '');
    const validPhone = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(rawPhone);
    showError('erreur-prenom', !validName);
    showError('erreur-telephone', !validPhone);
    firstName.setAttribute('aria-invalid', String(!validName));
    phone.setAttribute('aria-invalid', String(!validPhone));
    contactError.hidden = validName && validPhone;
    if (!validName) firstName.focus();
    else if (!validPhone) phone.focus();
    return validName && validPhone;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateContact()) return;
    const service = chosenServiceData();
    const date = chosenDate ? formatLong.format(chosenDate) : 'jour à confirmer';
    successRecap.textContent = `${service.nom} · ${date} à ${chosenTime}. Cette sélection est fictive.`;
    panels[currentStep].hidden = true;
    panels[currentStep].classList.remove('is-visible');
    panels[currentStep].setAttribute('aria-hidden', 'true');
    panels[currentStep].inert = true;
    successPanel.hidden = false;
    successHeading.focus();
    setLive('Simulation terminée. Aucune demande ne sera envoyée.');
  });

  document.querySelector('#restart-booking').addEventListener('click', () => {
    form.reset();
    currentStep = 0;
    chosenService = '';
    chosenDate = null;
    chosenTime = '';
    furthestStep = 0;
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0;
      panel.inert = index !== 0;
      panel.setAttribute('aria-hidden', String(index !== 0));
      panel.classList.toggle('is-visible', index === 0);
    });
    successPanel.hidden = true;
    firstName.removeAttribute('aria-invalid');
    phone.removeAttribute('aria-invalid');
    ['erreur-prestation', 'erreur-jour', 'erreur-heure', 'erreur-prenom', 'erreur-telephone', 'erreur-coordonnees'].forEach((id) => showError(id, false));
    updateProgress();
    updateSummary();
    setLive('Choisissez une prestation pour commencer.');
    panels[0].querySelector('h3').focus();
  });

  let revealObserver;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        if (entry.target.matches('.signature-trace, .street-figure')) entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    document.querySelectorAll('.reveal, .signature-trace, .street-figure').forEach((item) => revealObserver.observe(item));
  } else {
    document.querySelectorAll('.reveal, .signature-trace, .street-figure').forEach((item) => {
      item.classList.add('is-revealed', 'is-drawn');
    });
  }

  if ('IntersectionObserver' in window && stickyBar) {
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const updateSticky = () => {
      const show = !heroVisible && !bookingVisible && !footerVisible;
      stickyBar.classList.toggle('is-visible', show);
      stickyBar.classList.toggle('is-hidden', !show);
    };
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === booking) bookingVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      updateSticky();
    }, { threshold: 0.08 });
    [hero, booking, footer].forEach((item) => { if (item) stickyObserver.observe(item); });
  }

  document.documentElement.classList.add('js');
  window.requestAnimationFrame(() => hero.classList.add('is-entered'));
  updateSummary();
})();
