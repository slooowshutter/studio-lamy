(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  requestAnimationFrame(() => body.classList.add('is-ready'));

  const menuButton = $('.menu-toggle');
  const navigation = $('.site-nav');
  const menuLabel = $('.menu-toggle__label');
  const closeMenu = (returnFocus = false) => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
    menuLabel.textContent = 'Ouvrir le menu';
    if (returnFocus) menuButton.focus();
  };

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      navigation.classList.toggle('is-open', open);
      menuLabel.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
      if (open) $('a', navigation)?.focus();
    });
    navigation.addEventListener('click', event => {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 680) closeMenu();
    }, { passive: true });
  }

  const revealItems = $$('.reveal');
  const drawItems = $$('.draw-line');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    root.classList.add('reveal-pending');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index % 3, 2) * 55}ms`;
      revealObserver.observe(item);
    });

    drawItems.forEach(item => item.classList.add('draw-ready'));
    const drawObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        drawObserver.unobserve(entry.target);
      });
    }, { threshold: 0.2 });
    drawItems.forEach(item => drawObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
    drawItems.forEach(item => item.classList.add('is-drawn'));
  }

  const mobileBar = $('.mobile-bar');
  const heroActions = $('.hero__actions');
  const bookingSection = $('#reserver');
  const footer = $('.site-footer');
  if (mobileBar && 'IntersectionObserver' in window && window.matchMedia('(max-width: 680px)').matches) {
    const visible = new Set();
    const updateBar = () => {
      const shouldShow = !visible.has('hero') && !visible.has('booking') && !visible.has('footer');
      mobileBar.classList.toggle('is-visible', shouldShow);
      mobileBar.classList.toggle('is-hidden', !shouldShow);
    };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target === heroActions ? 'hero' : entry.target === bookingSection ? 'booking' : 'footer';
        if (entry.isIntersecting) visible.add(key);
        else visible.delete(key);
      });
      updateBar();
    }, { threshold: 0.12 });
    if (heroActions) barObserver.observe(heroActions);
    if (bookingSection) barObserver.observe(bookingSection);
    if (footer) barObserver.observe(footer);
    updateBar();
  } else if (mobileBar) {
    mobileBar.classList.add('is-visible');
  }

  const services = {
    signature: {
      name: 'Taille de barbe sculptée et tracée façon Gentleman + serviette chaude + soins',
      duration: 20
    },
    rasage: {
      name: 'Rasage complet de la barbe à l’ancienne',
      duration: 20
    },
    coupe: {
      name: 'Homme — coupe aux ciseaux et tondeuse',
      duration: 30
    }
  };
  const state = { step: 1, service: '', date: '', time: '' };
  const form = $('#reservation-form');
  const dayBox = $('#jours-disponibles');
  const hourBox = $('#heures-disponibles');
  const announcement = $('#annonce-reservation');
  const progressButtons = $$('[data-aller-etape]');
  const panels = $$('.booking-panel');
  const selectionName = $('#resume-prestation');
  const selectionDate = $('#resume-jour');
  const selectionTime = $('#resume-heure');

  const toIsoDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const fromIsoDate = iso => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const longDate = date => new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
  const shortWeekday = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
  const shortMonth = date => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
  const formatHour = totalMinutes => {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours}\u00a0h` : `${hours}\u00a0h\u00a0${String(minutes).padStart(2, '0')}`;
  };
  const openingHours = weekday => {
    if (weekday >= 2 && weekday <= 5) return { open: 10 * 60, close: 19 * 60 };
    if (weekday === 6) return { open: 9 * 60, close: 19 * 60 };
    return null;
  };
  const updateSummary = () => {
    selectionName.textContent = state.service ? services[state.service].name : 'À choisir';
    selectionDate.textContent = state.date ? longDate(fromIsoDate(state.date)) : 'À choisir';
    selectionTime.textContent = state.time || 'À choisir';
  };
  const makeDateChoice = date => {
    const iso = toIsoDate(date);
    const open = openingHours(date.getDay());
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-choice';
    button.disabled = !open;
    button.setAttribute('aria-pressed', String(state.date === iso));
    const ariaDate = longDate(date);
    button.setAttribute('aria-label', open ? ariaDate : `${ariaDate}, fermé`);

    const weekday = document.createElement('span');
    weekday.className = 'date-choice__weekday';
    weekday.textContent = shortWeekday(date);
    const number = document.createElement('span');
    number.className = 'date-choice__number';
    number.textContent = `${date.getDate()} ${shortMonth(date)}`;
    button.append(weekday, number);

    if (!open) {
      const closed = document.createElement('span');
      closed.className = 'date-choice__state';
      closed.textContent = 'Fermé';
      button.append(closed);
    }
    button.addEventListener('click', () => {
      state.date = iso;
      state.time = '';
      updateSummary();
      renderDates();
      renderHours();
      announcement.textContent = `Jour choisi : ${ariaDate}.`;
    });
    return button;
  };
  const renderDates = () => {
    dayBox.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      dayBox.append(makeDateChoice(date));
    }
  };
  const slotIsTaken = (iso, minute, service) => {
    const input = `${iso}-${minute}-${service}`;
    let hash = 11;
    for (let i = 0; i < input.length; i += 1) hash = (hash * 31 + input.charCodeAt(i)) % 997;
    return hash % 7 === 2;
  };
  const addTimeChoice = (iso, minute, unavailable) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'time-choice';
    button.disabled = unavailable;
    button.setAttribute('aria-pressed', String(state.time === formatHour(minute)));
    const hour = formatHour(minute);
    button.setAttribute('aria-label', unavailable ? `${hour}, indisponible dans cette simulation` : hour);
    const label = document.createElement('span');
    label.textContent = hour;
    button.append(label);
    if (unavailable) {
      const stateLabel = document.createElement('span');
      stateLabel.className = 'time-choice__state';
      stateLabel.textContent = 'Indisponible';
      button.append(stateLabel);
    }
    button.addEventListener('click', () => {
      state.time = hour;
      updateSummary();
      $$('.time-choice', hourBox).forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      announcement.textContent = `Heure choisie : ${hour}.`;
    });
    return button;
  };
  const renderHours = () => {
    hourBox.replaceChildren();
    if (!state.date || !state.service) {
      const hint = document.createElement('p');
      hint.className = 'empty-slots';
      hint.textContent = 'Choisissez un jour pour afficher les heures proposées.';
      hourBox.append(hint);
      return;
    }

    const date = fromIsoDate(state.date);
    const hours = openingHours(date.getDay());
    if (!hours) return;
    const duration = services[state.service].duration;
    const now = new Date();
    let count = 0;
    for (let minute = hours.open; minute + duration <= hours.close; minute += 30) {
      const slotDate = fromIsoDate(state.date);
      slotDate.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
      const past = slotDate.getTime() < now.getTime();
      const taken = slotIsTaken(state.date, minute, state.service);
      const unavailable = past || taken;
      const choice = addTimeChoice(state.date, minute, unavailable);
      if (past) {
        choice.setAttribute('aria-label', `${formatHour(minute)}, heure passée`);
        const stateLabel = $('.time-choice__state', choice);
        if (stateLabel) stateLabel.textContent = 'Passée';
        else {
          const pastLabel = document.createElement('span');
          pastLabel.className = 'time-choice__state';
          pastLabel.textContent = 'Passée';
          choice.append(pastLabel);
        }
      }
      hourBox.append(choice);
      count += 1;
    }
    if (count === 0) {
      const hint = document.createElement('p');
      hint.className = 'empty-slots';
      hint.textContent = 'Aucun créneau de démonstration disponible ce jour. Choisissez une autre date.';
      hourBox.append(hint);
    }
  };

  const showStep = (step, announce = true) => {
    const previousStep = state.step;
    const previousPanel = $(`[data-etape="${previousStep}"]`);
    const nextPanel = $(`[data-etape="${step}"]`);
    if (!nextPanel) return;
    state.step = step;
    if (previousPanel !== nextPanel) {
      if (previousPanel) {
        previousPanel.hidden = true;
        previousPanel.classList.remove('is-entering', 'is-settled');
      }
      nextPanel.hidden = false;
      nextPanel.classList.add('is-entering');
      nextPanel.classList.remove('is-settled');
      requestAnimationFrame(() => {
        nextPanel.classList.remove('is-entering');
        nextPanel.classList.add('is-settled');
      });
    }

    progressButtons.forEach(button => {
      const buttonStep = Number(button.dataset.allerEtape);
      button.disabled = buttonStep > step;
      if (buttonStep === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    const heading = $(`#titre-etape-${step}`);
    heading?.focus({ preventScroll: true });
    if (announce) announcement.textContent = `Étape ${step} sur 4 : ${heading?.textContent.replace(/[?\u00a0]/g, '').trim() || ''}.`;
  };

  const setSelectedService = value => {
    if (!services[value]) return;
    state.service = value;
    state.time = '';
    const radio = $(`input[name="prestation"][value="${value}"]`, form);
    if (radio) radio.checked = true;
    updateSummary();
    if (state.date) renderHours();
    const error = $('#erreur-prestation');
    if (error) error.textContent = '';
  };

  if (form) {
    renderDates();
    updateSummary();
    renderHours();

    $$('input[name="prestation"]', form).forEach(radio => radio.addEventListener('change', () => {
      setSelectedService(radio.value);
      announcement.textContent = `Prestation choisie : ${services[radio.value].name}.`;
    }));

    $$('[data-prestation]').forEach(link => link.addEventListener('click', () => {
      setSelectedService(link.dataset.prestation);
    }));

    $$('[data-suivant]', form).forEach(button => button.addEventListener('click', () => {
      if (state.step === 1) {
        if (!state.service) {
          $('#erreur-prestation').textContent = 'Choisissez une prestation pour continuer.';
          return;
        }
      }
      if (state.step === 2 && !state.date) {
        $('#erreur-jour').textContent = 'Choisissez un jour pour continuer.';
        return;
      }
      if (state.step === 3 && !state.time) {
        $('#erreur-heure').textContent = 'Choisissez une heure disponible pour continuer.';
        return;
      }
      showStep(Math.min(state.step + 1, 4));
    }));

    $$('[data-precedent]', form).forEach(button => button.addEventListener('click', () => showStep(Math.max(state.step - 1, 1))));
    progressButtons.forEach(button => button.addEventListener('click', () => {
      const target = Number(button.dataset.allerEtape);
      if (target < state.step && !button.disabled) showStep(target);
    }));

    const firstName = $('#prenom');
    const phone = $('#telephone');
    firstName.addEventListener('input', () => {
      $('#erreur-prenom').textContent = '';
      firstName.removeAttribute('aria-invalid');
    });
    phone.addEventListener('input', () => {
      $('#erreur-telephone').textContent = '';
      phone.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const name = firstName.value.trim();
      const phoneValue = phone.value.trim();
      const compactPhone = phoneValue.replace(/[\s.()-]/g, '');
      const validPhone = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compactPhone);
      let valid = true;

      if (name.length < 2) {
        $('#erreur-prenom').textContent = 'Saisissez votre prénom.';
        firstName.setAttribute('aria-invalid', 'true');
        valid = false;
      } else {
        $('#erreur-prenom').textContent = '';
        firstName.removeAttribute('aria-invalid');
      }
      if (!validPhone) {
        $('#erreur-telephone').textContent = 'Saisissez un numéro de mobile français valide.';
        phone.setAttribute('aria-invalid', 'true');
        valid = false;
      } else {
        $('#erreur-telephone').textContent = '';
        phone.removeAttribute('aria-invalid');
      }
      if (!valid) {
        const invalidField = firstName.getAttribute('aria-invalid') ? firstName : phone;
        invalidField.focus();
        return;
      }

      const result = $('#resultat-reservation');
      result.replaceChildren();
      const heading = document.createElement('h3');
      heading.tabIndex = -1;
      heading.textContent = `Merci, ${name}.`;
      const message = document.createElement('p');
      message.textContent = 'La simulation est terminée. Aucun rendez-vous n’a été envoyé au salon.';
      const recap = document.createElement('p');
      recap.textContent = `${services[state.service].name} · ${longDate(fromIsoDate(state.date))} · ${state.time}.`;
      result.append(heading, message, recap);
      result.hidden = false;
      panels.forEach(panel => { panel.hidden = true; });
      $('.booking-steps').hidden = true;
      $('.booking-ticket').classList.add('booking-ticket--complete');
      announcement.textContent = 'Simulation terminée. Aucun rendez-vous n’a été envoyé.';
      heading.focus({ preventScroll: true });
    });

    form.addEventListener('reset', () => {
      state.step = 1;
      state.service = '';
      state.date = '';
      state.time = '';
      updateSummary();
      renderDates();
      renderHours();
    });
  }
})();
