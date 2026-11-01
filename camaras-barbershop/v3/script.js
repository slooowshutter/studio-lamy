(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(() => root.classList.add('is-ready'));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('primary-nav');

  const closeMenu = (returnFocus = false) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    menuButton.querySelector('.menu-toggle__label').textContent = 'Menu';
    if (returnFocus) menuButton.focus();
  };

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      menuButton.querySelector('.menu-toggle__label').textContent = open ? 'Fermer' : 'Menu';
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      }
    });
  }

  const revealItems = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && revealItems.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const mobileBar = document.querySelector('.mobile-bar');
  const heroSentinel = document.querySelector('.hero__link');
  const bookingSection = document.getElementById('reserver');
  const footerSection = document.getElementById('footer');
  if ('IntersectionObserver' in window && mobileBar && heroSentinel && bookingSection && footerSection) {
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const updateBar = () => {
      const visible = !heroVisible && !bookingVisible && !footerVisible;
      mobileBar.classList.toggle('is-visible', visible);
      mobileBar.inert = !visible;
      mobileBar.setAttribute('aria-hidden', String(!visible));
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroSentinel) heroVisible = entry.isIntersecting;
        if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
        if (entry.target === footerSection) footerVisible = entry.isIntersecting;
      });
      updateBar();
    }, { threshold: 0.02 });
    [heroSentinel, bookingSection, footerSection].forEach((element) => barObserver.observe(element));
  }

  const copyButton = document.querySelector('[data-copy-address]');
  const copyStatus = document.querySelector('.copy-status');
  if (copyButton && copyStatus) {
    copyButton.addEventListener('click', async () => {
      const text = copyButton.dataset.copyAddress;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const field = document.createElement('textarea');
          field.value = text;
          field.setAttribute('readonly', '');
          field.style.position = 'fixed';
          field.style.opacity = '0';
          document.body.append(field);
          field.select();
          document.execCommand('copy');
          field.remove();
        }
        copyStatus.textContent = 'Adresse copiée.';
      } catch {
        copyStatus.textContent = 'Copie indisponible. Sélectionnez l’adresse : 96 Av. Yves Brunaud, 31500 Toulouse.';
      }
    });
  }

  const panel = document.getElementById('booking-panel');
  if (!panel) return;

  const services = [
    { id: 'coupe', name: 'Coupe homme', duration: 30, durationLabel: '30 min · exemple, à confirmer', priceLabel: 'À confirmer' },
    { id: 'barbe', name: 'Taille de barbe', duration: 20, durationLabel: '20 min · exemple, à confirmer', priceLabel: 'À confirmer' },
    { id: 'combo', name: 'Coupe homme + barbe', duration: 60, durationLabel: '1 h · source Konfian, à confirmer', priceLabel: 'À partir de 30 €*' }
  ];
  const openingHours = {
    0: null,
    1: null,
    2: [10 * 60, 20 * 60],
    3: [10 * 60, 20 * 60],
    4: [10 * 60, 20 * 60],
    5: [10 * 60, 20 * 60],
    6: [10 * 60, 20 * 60]
  };
  const steps = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const state = { step: 0, service: null, day: null, time: null, firstName: '', phone: '' };
  const stepLabel = document.getElementById('booking-step-label');

  const parisParts = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      iso: `${value.year}-${value.month}-${value.day}`,
      minutes: Number(value.hour) * 60 + Number(value.minute)
    };
  };
  const pad = (n) => String(n).padStart(2, '0');
  const localDate = (iso) => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };
  const dateIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = () => localDate(parisParts().iso);
  const longDate = (iso) => new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris'
  }).format(localDate(iso));
  const shortWeekday = (date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' })
    .format(date).replace(/\.$/, '');
  const hourText = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${pad(h)}\u202Fh${m ? ` ${pad(m)}` : ''}`;
  };
  const selectedService = () => services.find((item) => item.id === state.service) || null;
  const selectedDay = () => state.day ? localDate(state.day) : null;

  const updateSummary = () => {
    const service = selectedService();
    const ids = ['summary-service', 'summary-day', 'summary-time', 'summary-price'];
    const values = [
      service ? service.name : 'À choisir',
      state.day ? longDate(state.day) : 'À choisir',
      state.time !== null ? hourText(state.time) : 'À choisir',
      service ? service.priceLabel : 'À confirmer'
    ];
    ids.forEach((id, index) => {
      const node = document.getElementById(id);
      if (node) node.textContent = values[index];
    });
    document.querySelectorAll('[data-go]').forEach((button) => {
      const target = Number(button.dataset.go);
      const complete = target === 0 ? Boolean(state.service) : target === 1 ? Boolean(state.day) : Boolean(state.time !== null);
      button.disabled = !complete || state.step === target;
    });
  };

  const setStepLabel = () => {
    if (!stepLabel) return;
    stepLabel.textContent = state.step < 4
      ? `Étape ${state.step + 1} sur 4 · ${steps[state.step]}`
      : 'Simulation terminée';
  };

  const serviceMarkup = () => services.map((service) => `
    <label class="service-option" for="service-${service.id}">
      <input id="service-${service.id}" type="radio" name="service" value="${service.id}"${state.service === service.id ? ' checked' : ''}>
      <span><span class="service-option__name">${service.name}</span><span class="service-option__detail">${service.durationLabel}</span></span>
      <span class="service-option__price">${service.priceLabel}</span>
    </label>`).join('');

  const dayMarkup = () => {
    const start = today();
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12);
      const iso = dateIso(date);
      const closed = !openingHours[date.getDay()];
      const caption = index === 0 ? 'Aujourd’hui' : shortWeekday(date);
      const full = longDate(iso);
      return `<label class="day-option" for="day-${iso}">
        <input id="day-${iso}" type="radio" name="day" value="${iso}" aria-label="${full}${closed ? ', fermé' : ''}"${closed ? ' disabled' : ''}${state.day === iso && !closed ? ' checked' : ''}>
        <span class="day-option__face"><strong>${caption}</strong><time datetime="${iso}">${date.getDate()}</time><small>${closed ? 'Fermé' : '\u00a0'}</small></span>
      </label>`;
    });
    return days.join('');
  };

  const hash = (value) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };
  const slotsFor = (iso) => {
    const date = localDate(iso);
    const hours = openingHours[date.getDay()];
    const service = selectedService();
    if (!hours || !service) return [];
    const now = parisParts();
    const slots = [];
    for (let minute = hours[0]; minute + service.duration <= hours[1]; minute += 30) {
      const isPast = iso < now.iso || (iso === now.iso && minute <= now.minutes);
      const booked = hash(`${iso}-${minute}`) % 7 === 0;
      slots.push({ minute, isPast, booked, available: !isPast && !booked });
    }
    return slots;
  };
  const slotMarkup = () => slotsFor(state.day).map((slot) => {
    const reason = slot.isPast ? 'déjà passé' : slot.booked ? 'déjà pris' : '';
    return `<label class="slot-option" for="time-${slot.minute}">
      <input id="time-${slot.minute}" type="radio" name="time" value="${slot.minute}" aria-label="${hourText(slot.minute)}${reason ? `, ${reason}` : ''}"${slot.available ? '' : ' disabled'}${state.time === slot.minute && slot.available ? ' checked' : ''}>
      <span>${hourText(slot.minute)}${reason ? `<small class="slot-option__reason"> · ${reason}</small>` : ''}</span>
    </label>`;
  }).join('');

  const stepContent = () => {
    if (state.step === 0) {
      return `<h3 class="step-title" id="step-title" tabindex="-1">Choisissez une prestation</h3>
        <p class="step-help">Durées et prix à vérifier avec le salon. Le troisième tarif vient d’un annuaire tiers.</p>
        <fieldset class="service-options"><legend>Prestations recensées</legend>${serviceMarkup()}</fieldset>
        <div class="step-actions"><button class="button" type="button" data-next${state.service ? '' : ' disabled'}>Continuer <span aria-hidden="true">→</span></button></div>
        <p class="booking-status" aria-live="polite"></p>`;
    }
    if (state.step === 1) {
      return `<h3 class="step-title" id="step-title" tabindex="-1">Choisissez un jour</h3>
        <p class="step-help">Base d’essai Planity&nbsp;: mardi–samedi, 10&nbsp;h–20&nbsp;h. Lundi et dimanche fermés. Horaires à confirmer.</p>
        <fieldset class="service-options"><legend>Les 14 prochains jours</legend><div class="day-strip">${dayMarkup()}</div></fieldset>
        <div class="step-actions"><button class="button button--quiet" type="button" data-back>Retour</button><button class="button" type="button" data-next${state.day ? '' : ' disabled'}>Voir les heures <span aria-hidden="true">→</span></button></div>
        <p class="booking-status" aria-live="polite">Les jours fériés sont à confirmer.</p>`;
    }
    if (state.step === 2) {
      const slots = slotMarkup();
      return `<h3 class="step-title" id="step-title" tabindex="-1">Choisissez une heure</h3>
        <p class="step-help">${longDate(state.day)} · horaires indicatifs, à confirmer.</p>
        ${slots ? `<fieldset class="service-options"><legend>Créneaux de démonstration</legend><div class="slot-grid">${slots}</div></fieldset>` : '<p class="booking-status">Aucun créneau ne reste aujourd’hui. Choisissez un autre jour.</p>'}
        <div class="step-actions"><button class="button button--quiet" type="button" data-back>Retour</button><button class="button" type="button" data-next${state.time !== null ? '' : ' disabled'}>Continuer <span aria-hidden="true">→</span></button></div>
        <p class="booking-status" aria-live="polite">Certains créneaux sont marqués « déjà pris » à titre d’exemple.</p>`;
    }
    if (state.step === 3) {
      return `<h3 class="step-title" id="step-title" tabindex="-1">Vos coordonnées</h3>
        <p class="step-help">Elles restent dans cette page de démonstration. Rien n’est transmis.</p>
        <form id="contact-form" novalidate>
          <div class="field"><label for="customer-name">Prénom</label><input id="customer-name" name="firstName" type="text" autocomplete="given-name" required aria-describedby="name-error" value="${escapeAttribute(state.firstName)}"><span class="field-error" id="name-error"></span></div>
          <div class="field"><label for="customer-phone">Téléphone mobile</label><input id="customer-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required aria-describedby="phone-error" placeholder="06 12 34 56 78" value="${escapeAttribute(state.phone)}"><span class="field-error" id="phone-error"></span></div>
          <p class="booking-status" id="form-status" aria-live="polite"></p>
          <div class="step-actions"><button class="button button--quiet" type="button" data-back>Retour</button><button class="button" type="submit">Confirmer l’essai <span aria-hidden="true">→</span></button></div>
        </form>`;
    }
    const service = selectedService();
    const recap = `${state.firstName ? `${state.firstName}, ` : ''}${longDate(state.day)} à ${hourText(state.time)} · ${service ? service.name : 'prestation'} · ${service ? service.priceLabel : 'tarif à confirmer'}.`;
    return `<h3 class="success-title step-title" id="step-title" tabindex="-1">C’est noté pour l’essai.</h3>
      <p class="success-summary" id="success-recap">${escapeText(recap)}</p>
      <p class="step-help">Aucun rendez-vous n’a été transmis au salon. Pour une demande réelle, appelez le <a href="tel:+33609989568">06 09 98 95 68</a>.</p>
      <div class="step-actions"><a class="button" href="tel:+33609989568">Appeler le salon</a><a class="button button--quiet" id="calendar-link" download="essai-rendez-vous-camaras.ics">Ajouter à mon agenda (.ics)</a></div>
      <p class="booking-status" aria-live="polite">Simulation terminée. Rien n’a été envoyé.</p>`;
  };

  const escapeText = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const escapeAttribute = escapeText;
  const render = (moveFocus = false) => {
    setStepLabel();
    panel.innerHTML = `<div class="step-screen">${stepContent()}</div>`;
    updateSummary();
    const screen = panel.querySelector('.step-screen');
    const title = panel.querySelector('#step-title');
    requestAnimationFrame(() => {
      screen?.classList.add('is-ready');
      if (moveFocus) title?.focus();
    });
    if (state.step === 4) {
      makeCalendarLink();
    }
  };

  const setError = (id, message) => {
    const node = document.getElementById(id);
    if (node) node.textContent = message;
  };
  const normalizePhone = (value) => value.replace(/[\s().-]/g, '');
  const validMobile = (value) => /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalizePhone(value));
  const submitDetails = (form) => {
    const name = form.elements.firstName.value.trim();
    const phone = form.elements.phone.value.trim();
    const nameOk = name.length > 0;
    const phoneOk = validMobile(phone);
    setError('name-error', nameOk ? '' : 'Indiquez votre prénom.');
    setError('phone-error', phoneOk ? '' : 'Entrez un numéro mobile français en 06 ou 07.');
    form.elements.firstName.setAttribute('aria-invalid', String(!nameOk));
    form.elements.phone.setAttribute('aria-invalid', String(!phoneOk));
    if (!nameOk || !phoneOk) {
      const firstInvalid = !nameOk ? form.elements.firstName : form.elements.phone;
      firstInvalid.focus();
      return;
    }
    state.firstName = name;
    state.phone = phone;
    state.step = 4;
    render(true);
  };

  const parisWallToUtc = (iso, minutes) => {
    const [year, month, day] = iso.split('-').map(Number);
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    let guess = desired;
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
    for (let count = 0; count < 3; count += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      guess += desired - represented;
    }
    return new Date(guess);
  };
  const icsDate = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escapeIcs = (value) => String(value).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const makeCalendarLink = () => {
    const anchor = document.getElementById('calendar-link');
    const service = selectedService();
    if (!anchor || !service || !state.day || state.time === null) return;
    const start = parisWallToUtc(state.day, state.time);
    const end = parisWallToUtc(state.day, state.time + service.duration);
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Camara//FR', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${Date.now()}@preview-camaras.studio-lamy`, `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcs(`${service.name} — Camara's barbershop`)}`,
      'LOCATION:96 Av. Yves Brunaud\, 31500 Toulouse',
      'DESCRIPTION:Essai privé. Rien n’a été transmis au salon.',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
    anchor.href = URL.createObjectURL(blob);
  };

  panel.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.name === 'service') {
      if (state.service !== input.value) {
        state.day = null;
        state.time = null;
      }
      state.service = input.value;
      const next = panel.querySelector('[data-next]');
      if (next) next.disabled = false;
      updateSummary();
    } else if (input.name === 'day') {
      state.day = input.value;
      state.time = null;
      const next = panel.querySelector('[data-next]');
      if (next) next.disabled = false;
      updateSummary();
    } else if (input.name === 'time') {
      state.time = Number(input.value);
      const next = panel.querySelector('[data-next]');
      if (next) next.disabled = false;
      updateSummary();
    }
  });

  panel.addEventListener('submit', (event) => {
    if (event.target instanceof HTMLFormElement && event.target.id === 'contact-form') {
      event.preventDefault();
      submitDetails(event.target);
    }
  });

  panel.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (event.target.name === 'firstName') {
      state.firstName = event.target.value;
      if (event.target.getAttribute('aria-invalid') === 'true' && event.target.value.trim()) {
        event.target.setAttribute('aria-invalid', 'false');
        setError('name-error', '');
      }
    }
    if (event.target.name === 'phone') {
      state.phone = event.target.value;
      if (event.target.getAttribute('aria-invalid') === 'true' && validMobile(event.target.value)) {
        event.target.setAttribute('aria-invalid', 'false');
        setError('phone-error', '');
      }
    }
  });

  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-next')) {
      const status = panel.querySelector('.booking-status');
      if ((state.step === 0 && !state.service) || (state.step === 1 && !state.day) || (state.step === 2 && state.time === null)) {
        if (status) status.textContent = 'Choisissez une option pour continuer.';
        return;
      }
      state.step += 1;
      render(true);
    } else if (button.hasAttribute('data-back')) {
      state.step = Math.max(0, state.step - 1);
      render(true);
    } else if (button.hasAttribute('data-go')) {
      state.step = Number(button.dataset.go);
      render(true);
    }
  });

  const selection = document.getElementById('selection');
  if (selection) {
    selection.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-go]');
      if (!button || button.disabled) return;
      state.step = Number(button.dataset.go);
      render(true);
    });
  }

  document.querySelectorAll('[data-book-service]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const serviceId = link.dataset.bookService;
      if (!services.some((service) => service.id === serviceId)) return;
      event.preventDefault();
      if (state.service !== serviceId) {
        state.day = null;
        state.time = null;
      }
      state.service = serviceId;
      state.step = 0;
      render(false);
      requestAnimationFrame(() => {
        document.getElementById('reserver').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        panel.querySelector('#step-title')?.focus({ preventScroll: true });
      });
    });
  });

  render(false);
})();
