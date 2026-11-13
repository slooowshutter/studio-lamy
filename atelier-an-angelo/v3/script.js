(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const all = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const one = (selector, scope = doc) => scope.querySelector(selector);

  const accordionPanels = all('[data-accordion]');
  accordionPanels.forEach((panel, index) => {
    const trigger = one('.panel-trigger', panel);
    const body = one('.panel-clip', panel);
    const open = index === 0;
    panel.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    body.setAttribute('aria-hidden', String(!open));
    body.inert = !open;
  });
  root.classList.add('js');

  function setPanel(panel, open) {
    const trigger = one('.panel-trigger', panel);
    const body = one('.panel-clip', panel);
    if (!open && body.contains(doc.activeElement)) trigger.focus();
    panel.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    body.setAttribute('aria-hidden', String(!open));
    body.inert = !open;
  }

  accordionPanels.forEach((panel) => {
    one('.panel-trigger', panel).addEventListener('click', () => {
      const opening = !panel.classList.contains('is-open');
      accordionPanels.forEach((other) => setPanel(other, other === panel && opening));
    });
  });

  const menuButton = one('.menu-toggle');
  const mainNav = one('.primary-nav');
  if (menuButton && mainNav) {
    mainNav.dataset.ouvert = 'false';
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      mainNav.dataset.ouvert = 'false';
      if (returnFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      mainNav.dataset.ouvert = String(opening);
      if (opening && window.matchMedia('(max-width: 760px)').matches) one('a', mainNav).focus();
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    all('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => {
        if (menuButton.getAttribute('aria-expanded') === 'true') closeMenu(false);
      });
    });
  }

  all('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('href').slice(1);
      const target = doc.getElementById(id);
      const panel = target && target.closest('[data-accordion]');
      if (panel && !panel.classList.contains('is-open')) {
        accordionPanels.forEach((other) => setPanel(other, other === panel));
      }
    });
  });

  const flow = one('#simulation-rendez-vous');
  if (flow) {
    const hours = {
      0: null,
      1: null,
      2: { debut: 9 * 60, fin: 19 * 60 },
      3: { debut: 9 * 60, fin: 13 * 60 },
      4: { debut: 10 * 60, fin: 20 * 60 },
      5: { debut: 9 * 60, fin: 19 * 60 },
      6: { debut: 9 * 60, fin: 19 * 60 }
    };
    const services = {
      homme: { nom: 'Coupe homme, shampooing, coiffage et après-shampooing', duree: 30 },
      junior: { nom: 'Shampooing et coupe junior, jusqu’à 10 ans', duree: 30 },
      transformation: { nom: 'Coupe transformation', duree: 60 }
    };
    const selection = { prestation: '', jour: null, heure: '' };
    const Paris = 'Europe/Paris';
    const dayNames = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
    const shortDayNames = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
    const fullDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const numberDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' });
    const monthYearDate = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: Paris });
    const parisClock = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: Paris });
    const stepMessage = one('#message-etape');
    const dayList = one('#liste-jours');
    const slotList = one('#liste-horaires');
    const dateSummary = one('#resume-jour');
    const stepPanels = all('[data-flow-step]', flow);
    const nextButtons = all('[data-next]', flow);
    const recapService = one('#selection-prestation');
    const recapDay = one('#selection-jour');
    const recapTime = one('#selection-heure');
    const editButtons = all('[data-edit]', flow);
    const serviceRadios = all('input[name="prestation"]', flow);

    function parisToday() {
      const parts = Object.fromEntries(monthYearDate.formatToParts(new Date()).map((part) => [part.type, part.value]));
      return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
    }

    function dayKey(date) {
      return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
    }

    function selectedService() { return services[selection.prestation] || null; }

    function updateSummary() {
      recapService.textContent = selectedService() ? selectedService().nom : 'À choisir';
      recapDay.textContent = selection.jour ? fullDate.format(selection.jour.date) : 'À choisir';
      recapTime.textContent = selection.heure || 'À choisir';
      editButtons.forEach((button) => {
        const step = Number(button.dataset.edit);
        const ready = step === 1 ? Boolean(selection.prestation) : step === 2 ? Boolean(selection.jour) : Boolean(selection.heure);
        button.hidden = !ready;
      });
      const formRecap = one('#recap-formulaire');
      const successRecap = one('#recap-succes');
      const recapText = [selectedService()?.nom, selection.jour ? fullDate.format(selection.jour.date) : '', selection.heure].filter(Boolean).join(' · ');
      if (formRecap) formRecap.textContent = recapText;
      if (successRecap) successRecap.textContent = recapText;
    }

    function setNextEnabled(step, enabled) {
      const button = one(`[data-next="${step}"]`, flow);
      if (button) button.disabled = !enabled;
    }

    function showStep(step, shouldFocus = true) {
      stepPanels.forEach((panel) => {
        const isCurrent = Number(panel.dataset.flowStep) === step;
        panel.hidden = !isCurrent;
        panel.inert = !isCurrent;
        panel.setAttribute('aria-hidden', String(!isCurrent));
        panel.classList.remove('is-active');
      });
      const current = one(`[data-flow-step="${step}"]`, flow);
      if (!current) return;
      window.requestAnimationFrame(() => current.classList.add('is-active'));
      const heading = one('.booking-step__title', current);
      if (step < 5) stepMessage.textContent = `Étape ${step} sur 4. ${['', 'Choisissez une prestation.', 'Choisissez un jour.', 'Choisissez une heure.', 'Saisissez vos coordonnées.'][step]}`;
      else stepMessage.textContent = 'Simulation terminée. Aucune demande n’a été envoyée.';
      if (step === 2) renderDays();
      if (step === 3 && selection.jour) renderSlots();
      updateSummary();
      if (shouldFocus && heading) heading.focus({ preventScroll: true });
    }

    function renderDays() {
      dayList.replaceChildren();
      const today = parisToday();
      const todayKey = dayKey(today);
      const fragment = doc.createDocumentFragment();
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(today.getTime());
        date.setUTCDate(today.getUTCDate() + offset);
        const day = date.getUTCDay();
        const isOpen = Boolean(hours[day]);
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'day-option';
        button.disabled = !isOpen;
        button.setAttribute('aria-pressed', String(Boolean(selection.jour && dayKey(selection.jour.date) === dayKey(date))));
        const labelDate = fullDate.format(date);
        button.setAttribute('aria-label', `${labelDate}${isOpen ? '' : ', fermé'}`);
        const weekday = doc.createElement('span');
        weekday.className = 'day-option__weekday';
        weekday.textContent = shortDayNames.format(date).replace('.', '');
        const number = doc.createElement('span');
        number.className = 'day-option__date';
        number.textContent = numberDate.format(date);
        const state = doc.createElement('span');
        state.className = 'day-option__state';
        state.textContent = isOpen ? (dayKey(date) === todayKey ? 'Aujourd’hui' : 'Ouvert') : 'Fermé';
        button.append(weekday, number, state);
        if (isOpen) {
          button.addEventListener('click', () => {
            selection.jour = { date, key: dayKey(date), weekday: dayNames.format(date), today: dayKey(date) === todayKey };
            selection.heure = '';
            all('.day-option', dayList).forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            dateSummary.textContent = labelDate;
            stepMessage.textContent = `${labelDate} sélectionné. Choisissez ensuite une heure.`;
            renderSlots();
            setNextEnabled(3, true);
            setNextEnabled(4, false);
            updateSummary();
          });
        }
        fragment.append(button);
      }
      dayList.append(fragment);
      setNextEnabled(3, Boolean(selection.jour));
    }

    function parisMinutesNow() {
      const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map((part) => [part.type, part.value]));
      return Number(parts.hour) * 60 + Number(parts.minute);
    }

    function renderSlots() {
      slotList.replaceChildren();
      if (!selection.jour || !selectedService()) return;
      const hoursToday = hours[selection.jour.date.getUTCDay()];
      if (!hoursToday) return;
      const today = dayKey(parisToday());
      const isToday = selection.jour.key === today;
      const nowMinutes = parisMinutesNow();
      const duration = selectedService().duree;
      const groups = [
        { nom: 'Matin', debut: hoursToday.debut, fin: Math.min(hoursToday.fin, 12 * 60) },
        { nom: 'Après-midi', debut: Math.max(hoursToday.debut, 12 * 60), fin: Math.min(hoursToday.fin, 18 * 60) },
        { nom: 'Soir', debut: Math.max(hoursToday.debut, 18 * 60), fin: hoursToday.fin }
      ];
      groups.forEach((group, groupIndex) => {
        if (group.debut >= group.fin) return;
        const fieldset = doc.createElement('fieldset');
        fieldset.className = 'slot-group';
        const legend = doc.createElement('legend');
        legend.textContent = group.nom;
        fieldset.append(legend);
        const list = doc.createElement('div');
        list.className = 'slot-list';
        let count = 0;
        for (let minute = group.debut; minute + duration <= group.fin; minute += 30) {
          const slotIndex = Math.floor((minute - hoursToday.debut) / 30);
          const isPast = isToday && minute <= nowMinutes;
          const isTaken = (selection.jour.date.getUTCDate() * 7 + slotIndex * 11 + duration + groupIndex) % 6 === 2;
          const inputId = `heure-${selection.jour.key}-${minute}`;
          const label = doc.createElement('label');
          label.className = `slot-option${isTaken ? ' slot-option--taken' : ''}`;
          const input = doc.createElement('input');
          input.type = 'radio';
          input.name = 'heure-simulation';
          input.value = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
          input.id = inputId;
          input.disabled = isTaken || isPast;
          input.checked = selection.heure === input.value;
          const time = doc.createElement('time');
          time.dateTime = `${selection.jour.key}T${input.value}:00`;
          time.textContent = input.value;
          const state = doc.createElement('span');
          state.className = 'visually-hidden';
          state.textContent = isPast ? 'Heure passée' : isTaken ? 'Déjà pris dans la simulation' : '';
          label.append(input, time, state);
          if (isTaken || isPast) {
            label.classList.add('slot-option--taken');
            label.setAttribute('aria-label', `${input.value}, ${isPast ? 'heure passée' : 'déjà pris dans la simulation'}`);
          }
          if (!isTaken && !isPast) {
            input.addEventListener('change', () => {
              selection.heure = input.value;
              setNextEnabled(4, true);
              stepMessage.textContent = `${input.value} sélectionnée. Vous pouvez saisir vos coordonnées.`;
              updateSummary();
            });
          }
          list.append(label);
          count += 1;
        }
        if (count) {
          fieldset.append(list);
          slotList.append(fieldset);
        }
      });
      if (!slotList.children.length) {
        const note = doc.createElement('p');
        note.className = 'booking-hint';
        note.textContent = 'Aucun créneau ne correspond à cette durée dans les heures restantes.';
        slotList.append(note);
      }
      setNextEnabled(4, Boolean(selection.heure));
    }

    function isFrenchMobile(value) {
      const digits = value.replace(/\D/g, '');
      const national = digits.startsWith('0033') ? `0${digits.slice(4)}` : digits.startsWith('33') ? `0${digits.slice(2)}` : digits;
      return /^0[67]\d{8}$/.test(national);
    }

    function clearFieldError(input, error) {
      input.removeAttribute('aria-invalid');
      error.hidden = true;
      error.textContent = '';
    }

    const form = one('#formulaire-rendez-vous');
    if (form) {
      const firstName = one('#prenom', form);
      const phone = one('#telephone', form);
      const firstNameError = one('#erreur-prenom', form);
      const phoneError = one('#erreur-telephone', form);
      firstName.addEventListener('input', () => clearFieldError(firstName, firstNameError));
      phone.addEventListener('input', () => clearFieldError(phone, phoneError));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearFieldError(firstName, firstNameError);
        clearFieldError(phone, phoneError);
        let valid = true;
        if (!firstName.value.trim()) {
          firstNameError.textContent = 'Indiquez votre prénom.';
          firstNameError.hidden = false;
          firstName.setAttribute('aria-invalid', 'true');
          valid = false;
        }
        if (!isFrenchMobile(phone.value.trim())) {
          phoneError.textContent = 'Saisissez un numéro de téléphone mobile français valide.';
          phoneError.hidden = false;
          phone.setAttribute('aria-invalid', 'true');
          valid = false;
        }
        if (!valid) {
          (firstNameError.hidden ? phone : firstName).focus();
          return;
        }
        showStep(5);
      });
    }

    serviceRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        selection.prestation = radio.value;
        selection.heure = '';
        setNextEnabled(2, true);
        setNextEnabled(4, false);
        updateSummary();
        if (selection.jour) renderSlots();
      });
    });

    nextButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const next = Number(button.dataset.next);
        if (next === 2 && !selection.prestation) {
          stepMessage.textContent = 'Choisissez une prestation avant de continuer.';
          return;
        }
        if (next === 3 && !selection.jour) {
          stepMessage.textContent = 'Choisissez un jour avant de continuer.';
          return;
        }
        if (next === 4 && !selection.heure) {
          stepMessage.textContent = 'Choisissez une heure avant de continuer.';
          return;
        }
        showStep(next);
      });
    });

    all('[data-back]', flow).forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
    editButtons.forEach((button) => button.addEventListener('click', () => showStep(Number(button.dataset.edit))));
    const restart = one('#recommencer', flow);
    if (restart) {
      restart.addEventListener('click', () => {
        selection.prestation = '';
        selection.jour = null;
        selection.heure = '';
        serviceRadios.forEach((radio) => { radio.checked = false; });
        form.reset();
        clearFieldError(one('#prenom', form), one('#erreur-prenom', form));
        clearFieldError(one('#telephone', form), one('#erreur-telephone', form));
        setNextEnabled(2, false);
        setNextEnabled(3, false);
        setNextEnabled(4, false);
        showStep(1);
      });
    }

    setNextEnabled(2, false);
    setNextEnabled(3, false);
    setNextEnabled(4, false);
    showStep(1, false);
  }

  const revealItems = all('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = entry.target;
        item.classList.add('is-revealed');
        if (item.classList.contains('service-row')) {
          const rows = all('.service-row[data-reveal]');
          item.style.setProperty('--reveal-delay', `${rows.indexOf(item) * 55}ms`);
        }
        observer.unobserve(item);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));

    const stage = one('.strand-stage');
    if (stage) {
      const stageObserver = new IntersectionObserver((entries, observer) => {
        if (!entries[0].isIntersecting) return;
        stage.classList.add('is-seen');
        observer.disconnect();
      }, { threshold: 0.2 });
      stageObserver.observe(stage);
    }

    const intro = one('.intro');
    if (intro) {
      const introObserver = new IntersectionObserver((entries, observer) => {
        if (!entries[0].isIntersecting) return;
        intro.classList.add('is-seen');
        observer.disconnect();
      }, { threshold: 0.08 });
      introObserver.observe(intro);
    }
  } else {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
    const intro = one('.intro');
    if (intro) intro.classList.add('is-seen');
    const stage = one('.strand-stage');
    if (stage) stage.classList.add('is-seen');
  }

  const actionBar = one('.mobile-actions');
  const intro = one('.intro');
  const bookingPanel = one('#rendez-vous');
  const footer = one('.site-footer');
  if (actionBar) {
    actionBar.setAttribute('aria-hidden', 'true');
    actionBar.inert = true;
  }
  if (actionBar && intro && bookingPanel && footer && 'IntersectionObserver' in window && window.matchMedia('(max-width: 760px)').matches) {
    const visible = { intro: true, booking: false, footer: false };
    const updateBar = () => {
      const shouldShow = !visible.intro && !visible.booking && !visible.footer;
      actionBar.classList.toggle('is-visible', shouldShow);
      actionBar.setAttribute('aria-hidden', String(!shouldShow));
      actionBar.inert = !shouldShow;
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === intro) visible.intro = entry.isIntersecting;
        if (entry.target === bookingPanel) visible.booking = entry.isIntersecting;
        if (entry.target === footer) visible.footer = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.01 });
    barObserver.observe(intro);
    barObserver.observe(bookingPanel);
    barObserver.observe(footer);
  }
})();
