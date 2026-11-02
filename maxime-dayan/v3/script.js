window.__site = true;

(() => {
  'use strict';

  const doc = document;
  const $ = (selector, scope = doc) => scope.querySelector(selector);
  const $$ = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const fmtDateLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtDatePart = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const publishedHours = { 1: [690, 1170], 2: [690, 1170], 3: [690, 1170], 4: [690, 1170], 5: [690, 1170] };
  const durations = new Map([
    ['Femme - Shampoing, soin et brushing Cheveux courts', 20],
    ['Femme - Shampoing, soin et brushing Cheveux mi-longs', 25],
    ['Femme - Shampoing, soin et brushing Cheveux longs', 30],
    ['Femme - Shampoing, soin, coupe et brushing Cheveux court', 45],
    ['Femme - Shampoing, soin, coupe et brushing Cheveux mi-long', 60],
    ['Homme - Coupe, shampoing et coiffage', 35],
    ['Homme - Coupe, shampoing, coiffage & taille de la barbe', 50]
  ]);

  function demoUnavailable(date, minutes) {
    const source = dateCode(date) + ':' + minutes;
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 5 === 0;
  }

  function parisParts(date = new Date()) {
    const parts = {};
    fmtDatePart.formatToParts(date).forEach((part) => { parts[part.type] = part.value; });
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      minute: (Number(parts.hour) % 24) * 60 + Number(parts.minute)
    };
  }

  function parisToday() {
    const p = parisParts();
    return new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  }

  function dateCode(date) { return date.toISOString().slice(0, 10); }

  function dateLabel(date) {
    return fmtDateLong.format(date).replace(/^./, (letter) => letter.toLocaleUpperCase('fr-FR'));
  }

  function visibleTime(minutes) {
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }

  function cleanShortDay(date) { return fmtDay.format(date).replace(/\.$/, ''); }

  const form = $('#parcours');
  const panels = new Map($$('[data-etape]', form).map((panel) => [panel.dataset.etape, panel]));
  let activeStep = 'prestation';
  let selectedService = '';
  let selectedDay = null;
  let selectedTime = null;
  let transitionTimer = 0;

  function userServiceName(service) { return service; }

  function updateSummary() {
    $('[data-recap-prestation]').textContent = selectedService ? userServiceName(selectedService) : 'À choisir';
    $('[data-recap-jour]').textContent = selectedDay ? dateLabel(selectedDay) : 'À choisir';
    $('[data-recap-heure]').textContent = selectedTime === null ? 'À choisir' : visibleTime(selectedTime).replace(':', NB + 'h' + NB);
  }

  function showStep(name, moveFocus = true) {
    const oldPanel = panels.get(activeStep);
    const nextPanel = panels.get(name);
    if (!nextPanel || nextPanel === oldPanel) return;
    window.clearTimeout(transitionTimer);
    if (oldPanel) {
      oldPanel.classList.remove('is-active');
      oldPanel.inert = true;
      oldPanel.setAttribute('aria-hidden', 'true');
    }
    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.removeAttribute('aria-hidden');
    nextPanel.classList.remove('is-active');
    requestAnimationFrame(() => requestAnimationFrame(() => nextPanel.classList.add('is-active')));
    activeStep = name;
    transitionTimer = window.setTimeout(() => {
      if (oldPanel) oldPanel.hidden = true;
      if (moveFocus) {
        const heading = $('h3[tabindex="-1"]', nextPanel);
        if (heading) heading.focus({ preventScroll: true });
      }
    }, 235);
  }

  function addDays(date, amount) { return new Date(date.getTime() + amount * 86400000); }

  function renderDays() {
    const rail = $('[data-jours]');
    if (!rail) return;
    rail.replaceChildren();
    const today = parisToday();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = addDays(today, offset);
      const dow = date.getUTCDay();
      const isOpen = Boolean(publishedHours[dow]);
      const button = doc.createElement('button');
      const weekday = doc.createElement('span');
      const number = doc.createElement('span');
      const status = doc.createElement('span');
      button.type = 'button';
      button.className = 'jour';
      button.dataset.date = dateCode(date);
      button.disabled = !isOpen;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', dateLabel(date) + (isOpen ? ', jour de démonstration' : ', fermé selon les horaires publiés'));
      weekday.className = 'jour__semaine';
      weekday.textContent = fmtDay.format(date).replace(/\.$/, '');
      number.className = 'jour__date';
      number.textContent = String(date.getUTCDate());
      status.className = 'jour__etat';
      status.textContent = !isOpen ? 'Fermé' : offset === 0 ? 'Aujourd’hui' : offset === 1 ? 'Demain' : 'Exemple';
      button.append(weekday, number, status);
      button.addEventListener('click', () => {
        selectedDay = date;
        selectedTime = null;
        $$('[data-jours] .jour').forEach((dayButton) => dayButton.setAttribute('aria-pressed', String(dayButton === button)));
        $('[data-erreur-jour]').textContent = '';
        updateSummary();
        renderTimes();
      });
      rail.append(button);
    }
  }

  function renderTimes() {
    const root = $('[data-heures]');
    if (!root) return;
    root.replaceChildren();
    const selectedServiceRadio = $('input[name="prestation"]:checked', form);
    const duration = selectedServiceRadio ? durations.get(selectedServiceRadio.value) : null;
    const chosenDow = selectedDay ? selectedDay.getUTCDay() : null;
    const schedule = publishedHours[chosenDow];
    const dayLine = $('[data-jour-selectionne]');
    if (!selectedDay || !schedule || !duration) {
      dayLine.textContent = 'Choisissez d’abord une prestation et un jour de démonstration.';
      return;
    }

    const sameDay = dateCode(selectedDay) === dateCode(parisToday());
    const now = sameDay ? parisParts().minute : -1;
    const choices = [];
    for (let minute = schedule[0]; minute + duration <= schedule[1]; minute += 90) choices.push(minute);
    dayLine.textContent = 'Heures de démonstration pour ' + dateLabel(selectedDay) + '. Elles ne correspondent pas aux disponibilités réelles.';
    if (!choices.length) {
      dayLine.textContent += ' Aucun horaire d’exemple ne reste pour cette date ; choisissez un autre jour.';
      return;
    }

    const unavailable = new Set(choices.filter((minutes) => demoUnavailable(selectedDay, minutes)));
    if (unavailable.size === choices.length) unavailable.delete(choices[choices.length - 1]);

    choices.forEach((minutes, index) => {
      const wrapper = doc.createElement('div');
      const input = doc.createElement('input');
      const label = doc.createElement('label');
      const time = doc.createElement('span');
      const status = doc.createElement('span');
      const id = 'heure-exemple-' + index;
      const isPast = sameDay && minutes <= now;
      const isUnavailable = unavailable.has(minutes);
      wrapper.className = 'heure';
      input.type = 'radio';
      input.name = 'heure';
      input.id = id;
      input.value = String(minutes);
      input.required = true;
      input.disabled = isPast || isUnavailable;
      label.htmlFor = id;
      time.textContent = visibleTime(minutes);
      label.append(time);
      if (isPast || isUnavailable) {
        status.className = 'heure__etat';
        status.textContent = isPast ? 'Passé' : 'Indisponible (démo)';
        label.append(status);
      }
      input.addEventListener('change', () => {
        selectedTime = minutes;
        $('[data-erreur-heure]').textContent = '';
        updateSummary();
      });
      wrapper.append(input, label);
      root.append(wrapper);
    });
    if (sameDay && !choices.some((minute) => minute > now && !unavailable.has(minute))) {
      dayLine.textContent += ' Aucune heure de démonstration ne reste pour aujourd’hui ; choisissez un autre jour.';
    }
  }

  function setError(selector, message) {
    const element = $(selector);
    if (element) element.textContent = message;
  }
  function clearError(selector) { setError(selector, ''); }

  function continueFromStep() {
    if (activeStep === 'prestation') {
      const radio = $('input[name="prestation"]:checked', form);
      if (!radio) {
        setError('[data-erreur-prestation]', 'Choisissez une prestation pour continuer.');
        const firstChoice = $('input[name="prestation"]', form);
        if (firstChoice) firstChoice.focus();
        return;
      }
      selectedService = radio.value;
      updateSummary();
      showStep('jour');
      return;
    }
    if (activeStep === 'jour') {
      if (!selectedDay) {
        setError('[data-erreur-jour]', 'Choisissez un jour de démonstration.');
        const firstOpenDay = $$('[data-jours] .jour').find((button) => !button.disabled);
        if (firstOpenDay) firstOpenDay.focus();
        return;
      }
      clearError('[data-erreur-jour]');
      renderTimes();
      showStep('heure');
      return;
    }
    if (activeStep === 'heure') {
      if (selectedTime === null || !$('input[name="heure"]:checked', form)) {
        const firstTime = $('input[name="heure"]:not(:disabled)', form);
        setError('[data-erreur-heure]', firstTime ? 'Choisissez une heure de démonstration.' : 'Aucune heure d’exemple ne reste pour ce jour. Revenez au choix du jour.');
        if (firstTime) firstTime.focus();
        else $('[data-precedent]', panels.get('heure')).focus();
        return;
      }
      clearError('[data-erreur-heure]');
      showStep('coordonnees');
    }
  }

  function validPhone(value) {
    return /^(?:(?:\+33|0033)[\s.-]?[67]|0[67])(?:[\s.-]?\d{2}){4}$/.test(value.trim());
  }

  function submitDemo(event) {
    event.preventDefault();
    if (activeStep !== 'coordonnees') return;
    const nameInput = $('#prenom');
    const phoneInput = $('#telephone');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    let firstInvalid = null;

    if (name.length < 2) {
      nameInput.setAttribute('aria-invalid', 'true');
      setError('[data-erreur-prenom]', 'Saisissez un prénom d’au moins deux lettres.');
      firstInvalid = nameInput;
    } else {
      nameInput.removeAttribute('aria-invalid');
      clearError('[data-erreur-prenom]');
    }
    if (!validPhone(phone)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      setError('[data-erreur-telephone]', 'Saisissez un numéro de téléphone mobile français valide.');
      firstInvalid = firstInvalid || phoneInput;
    } else {
      phoneInput.removeAttribute('aria-invalid');
      clearError('[data-erreur-telephone]');
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const recap = userServiceName(selectedService) + ' · ' + dateLabel(selectedDay) + ' à ' + visibleTime(selectedTime).replace(':', NB + 'h' + NB) + '.';
    $('[data-recap]').textContent = recap;
    showStep('confirmation');
  }

  function resetDemo() {
    form.reset();
    selectedService = '';
    selectedDay = null;
    selectedTime = null;
    clearError('[data-erreur-prestation]');
    clearError('[data-erreur-jour]');
    clearError('[data-erreur-heure]');
    ['[data-erreur-prenom]', '[data-erreur-telephone]'].forEach(clearError);
    [$('#prenom'), $('#telephone')].forEach((input) => input && input.removeAttribute('aria-invalid'));
    $$('[data-jours] .jour').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    updateSummary();
    renderTimes();
    showStep('prestation');
  }

  if (form) {
    renderDays();
    updateSummary();
    $$('[data-suivant]', form).forEach((button) => button.addEventListener('click', continueFromStep));
    $$('[data-precedent]', form).forEach((button) => button.addEventListener('click', () => {
      const previous = { jour: 'prestation', heure: 'jour', coordonnees: 'heure' }[activeStep];
      if (previous) showStep(previous);
    }));
    $$('input[name="prestation"]', form).forEach((radio) => radio.addEventListener('change', () => {
      selectedService = radio.value;
      selectedTime = null;
      clearError('[data-erreur-prestation]');
      updateSummary();
      if (selectedDay) renderTimes();
    }));
    $('#prenom').addEventListener('input', (event) => {
      if (event.currentTarget.value.trim().length >= 2) {
        event.currentTarget.removeAttribute('aria-invalid');
        clearError('[data-erreur-prenom]');
      }
    });
    $('#telephone').addEventListener('input', (event) => {
      if (validPhone(event.currentTarget.value)) {
        event.currentTarget.removeAttribute('aria-invalid');
        clearError('[data-erreur-telephone]');
      }
    });
    form.addEventListener('submit', submitDemo);
    $('[data-recommencer]').addEventListener('click', resetDemo);
  }

  const ready = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) {
    Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 700))]).then(ready);
  } else {
    ready();
  }

  const revealTargets = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add('is-revealed'));
  }

  const copyButton = $('[data-copier-adresse]');
  if (copyButton) {
    const status = $('[data-retour-copie]');
    copyButton.addEventListener('click', async () => {
      const address = '24 rue Sainte-Foy, 75002 Paris';
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Copie non disponible');
        await navigator.clipboard.writeText(address);
        status.textContent = 'Adresse copiée.';
      } catch {
        status.textContent = 'Adresse à copier : ' + address + '.';
      }
    });
  }

  const mobileBar = $('[data-barre-mobile]');
  const introActions = $('[data-actions-intro]');
  const reservation = $('#reservation');
  const footer = $('#pied');
  if (mobileBar && introActions && 'IntersectionObserver' in window) {
    let introVisible = true;
    let reservationVisible = false;
    let footerVisible = false;
    let hideTimer = 0;
    const updateBar = () => {
      const shouldShow = !introVisible && !reservationVisible && !footerVisible;
      window.clearTimeout(hideTimer);
      if (shouldShow) {
        mobileBar.hidden = false;
        mobileBar.inert = false;
        requestAnimationFrame(() => mobileBar.classList.add('is-visible'));
      } else {
        mobileBar.classList.remove('is-visible');
        mobileBar.inert = true;
        hideTimer = window.setTimeout(() => { mobileBar.hidden = true; }, 270);
      }
    };
    const introObserver = new IntersectionObserver((entries) => {
      introVisible = entries[0].isIntersecting;
      updateBar();
    }, { threshold: 0.01 });
    introObserver.observe(introActions);
    const lowerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === reservation) reservationVisible = entry.isIntersecting;
        if (entry.target === footer) footerVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.01 });
    if (reservation) lowerObserver.observe(reservation);
    if (footer) lowerObserver.observe(footer);
  }
})();
