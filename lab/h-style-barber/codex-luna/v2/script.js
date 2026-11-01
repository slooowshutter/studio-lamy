(function () {
  'use strict';
  window.__site = true;

  const services = {
    cut: { name: 'Coupe de cheveux', minutes: 30, price: 20 },
    child: { name: 'Coupe enfant', minutes: 30, price: 15 },
    beard: { name: 'Taille de barbe', minutes: 20, price: 15 },
    combo: { name: 'Coupe + barbe', minutes: 45, price: 30 }
  };
  const schedule = {
    0: [],
    1: [[9, 19]],
    2: [[9, 19]],
    3: [[9, 19]],
    4: [[9, 12], [14, 19]],
    5: [[9, 19]],
    6: [[14, 18]]
  };
  const form = document.querySelector('#booking-form');
  if (!form) return;

  const stepViews = Array.from(form.querySelectorAll('[data-step]'));
  const meter = document.querySelector('.step-meter');
  const stepButtons = meter ? Array.from(meter.querySelectorAll('[data-jump-step]')) : [];
  const selected = { service: '', day: '', slot: '' };
  let activeStep = 0;
  let transitionToken = 0;
  let dates = [];
  let timeSlots = [];

  const byData = (selector, root) => (root || document).querySelector(selector);
  const errorNode = (name) => byData('[data-error="' + name + '"]', form);
  const money = (price) => price + '\u00a0€*';
  const pad = (value) => String(value).padStart(2, '0');
  const isoDate = (date) => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  const dateLong = (date) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);

  function currentService() {
    return services[selected.service] || null;
  }

  function updateSummary() {
    const service = currentService();
    const serviceNode = byData('[data-summary-service]');
    const slotNode = byData('[data-summary-slot]');
    const priceNode = byData('[data-summary-price]');
    if (serviceNode) serviceNode.textContent = service ? service.name : 'Choisissez une prestation';
    if (priceNode) priceNode.textContent = service ? money(service.price) : '—';
    let slotText = 'Jour et heure à choisir';
    if (selected.day) {
      const day = dates.find((item) => item.id === selected.day);
      slotText = day ? dateLong(day.date) : 'Jour à confirmer';
      if (selected.slot) slotText += ' · ' + selected.slot;
    }
    if (slotNode) slotNode.textContent = slotText;
    const confirm = byData('[data-confirm-summary]');
    if (confirm) {
      confirm.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = service ? service.name + ' · ' + money(service.price) : 'Prestation à choisir';
      const details = document.createElement('span');
      const day = dates.find((item) => item.id === selected.day);
      details.textContent = day && selected.slot ? dateLong(day.date) + ' à ' + selected.slot : 'Jour et heure à choisir';
      confirm.append(title, details);
    }
  }

  function announce(message) {
    const live = byData('[data-live-status]', form);
    if (live) live.textContent = message;
  }

  function clearErrors() {
    form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
  }

  function goToStep(index) {
    const previousStep = activeStep;
    const previousView = stepViews[previousStep];
    const nextView = stepViews[index];
    const token = ++transitionToken;
    activeStep = index;
    stepViews.forEach((view) => {
      if (view !== previousView && view !== nextView) {
        view.hidden = true;
        view.classList.remove('is-entering', 'is-leaving');
      }
    });
    if (previousView && previousView !== nextView) previousView.classList.add('is-leaving');
    if (nextView) {
      nextView.hidden = false;
      nextView.classList.remove('is-leaving');
      nextView.classList.add('is-entering');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (token === transitionToken) nextView.classList.remove('is-entering');
      }));
      window.setTimeout(() => {
        if (token !== transitionToken) return;
        if (previousView && previousView !== nextView) {
          previousView.hidden = true;
          previousView.classList.remove('is-leaving', 'is-entering');
        }
        nextView.classList.remove('is-entering', 'is-leaving');
      }, 240);
    }
    if (meter) {
      meter.hidden = index === 4;
    }
    stepButtons.forEach((button, buttonIndex) => {
      button.disabled = buttonIndex > index;
      if (buttonIndex === index) {
        button.classList.add('step-current');
        button.setAttribute('aria-current', 'step');
      } else {
        button.classList.remove('step-current');
        button.removeAttribute('aria-current');
      }
    });
    clearErrors();
    const heading = stepViews[index] && stepViews[index].querySelector('h3');
    if (heading) heading.focus();
    announce(index === 4 ? 'Simulation terminée.' : 'Étape ' + (index + 1) + ' sur 4.');
    updateSummary();
  }

  function drawDateStrip() {
    const strip = byData('[data-date-strip]');
    if (!strip) return;
    strip.replaceChildren();
    dates = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const weekday = date.getDay();
      const closed = schedule[weekday].length === 0;
      const button = document.createElement('button');
      const dayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
      const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
      button.type = 'button';
      button.className = 'date-card';
      button.disabled = closed;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', dateLong(date) + (closed ? ', fermé' : ''));
      button.dataset.date = isoDate(date);
      button.innerHTML = '<span></span><span></span><span></span>';
      button.children[0].textContent = dayName;
      button.children[1].textContent = pad(date.getDate());
      button.children[2].textContent = closed ? 'fermé' : monthName;
      if (!closed) {
        button.addEventListener('click', () => {
          selected.day = button.dataset.date;
          selected.slot = '';
          strip.querySelectorAll('.date-card').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
          dates.forEach((item) => { item.selected = item.id === selected.day; });
          drawSlots();
          updateSummary();
          const error = errorNode('day');
          if (error) error.textContent = '';
        });
      }
      strip.append(button);
      dates.push({ id: isoDate(date), date, weekday, closed, selected: false });
    }
  }

  function drawSlots() {
    const grid = byData('[data-slot-grid]');
    const help = byData('[data-time-help]');
    if (!grid) return;
    grid.replaceChildren();
    timeSlots = [];
    const dayInfo = dates.find((item) => item.id === selected.day);
    const service = currentService();
    if (!dayInfo || !service) {
      if (help) help.textContent = 'Choisissez d’abord une prestation et un jour.';
      return;
    }
    if (help) help.textContent = 'Exemples calculés selon les horaires provisoires. Les créneaux ne sont pas réels.';
    const now = new Date();
    const selectedDateIsToday = isoDate(now) === dayInfo.id;
    let slotIndex = 0;
    schedule[dayInfo.weekday].forEach((range, rangeIndex) => {
      const start = range[0] * 60;
      const close = range[1] * 60;
      for (let minute = start; minute + service.minutes <= close; minute += 30) {
        const hour = Math.floor(minute / 60);
        const mins = minute % 60;
        const label = pad(hour) + ':' + pad(mins);
        const past = selectedDateIsToday && (hour < now.getHours() || (hour === now.getHours() && mins <= now.getMinutes()));
        const alreadyTaken = ((dayInfo.date.getDate() + dayInfo.date.getMonth() + slotIndex * 3 + rangeIndex) % 7) === 2;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'slot-button';
        button.disabled = past || alreadyTaken;
        button.setAttribute('aria-pressed', 'false');
        button.dataset.slot = label;
        button.setAttribute('aria-label', label + (past ? ', heure passée' : alreadyTaken ? ', déjà pris' : ''));
        if (alreadyTaken && !past) button.innerHTML = '<span>' + label + '</span><small>déjà pris</small>';
        else button.textContent = label;
        if (!button.disabled) {
          button.addEventListener('click', () => {
            selected.slot = label;
            grid.querySelectorAll('.slot-button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
            const error = errorNode('slot');
            if (error) error.textContent = '';
            updateSummary();
          });
        }
        grid.append(button);
        timeSlots.push({ label, past, alreadyTaken });
        slotIndex += 1;
      }
    });
    if (!grid.children.length) {
      const empty = document.createElement('p');
      empty.className = 'step-help';
      empty.textContent = 'Aucun créneau de démonstration ne convient à cette durée.';
      grid.append(empty);
    }
  }

  function validateStep() {
    clearErrors();
    if (activeStep === 0 && !currentService()) {
      errorNode('service').textContent = 'Choisissez une prestation pour continuer.';
      return false;
    }
    if (activeStep === 1 && !selected.day) {
      errorNode('day').textContent = 'Choisissez un jour ouvert pour continuer.';
      return false;
    }
    if (activeStep === 2 && !selected.slot) {
      errorNode('slot').textContent = 'Choisissez une heure libre pour continuer.';
      return false;
    }
    if (activeStep === 3) {
      const name = byData('#guest-name');
      const phone = byData('#guest-phone');
      let ok = true;
      if (!name.value.trim() || name.value.trim().length < 2) {
        errorNode('name').textContent = 'Saisissez un prénom d’au moins deux caractères.';
        ok = false;
      }
      const normalized = phone.value.replace(/[\s().-]/g, '');
      if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalized)) {
        errorNode('phone').textContent = 'Saisissez un numéro mobile français commençant par 06 ou 07.';
        ok = false;
      }
      if (!ok) {
        const firstInvalid = form.querySelector('[data-error]:not(:empty)');
        if (firstInvalid && firstInvalid.previousElementSibling && firstInvalid.previousElementSibling.focus) firstInvalid.previousElementSibling.focus();
      }
      return ok;
    }
    return true;
  }

  function createCalendarFile() {
    const day = dates.find((item) => item.id === selected.day);
    const [year, month, date] = selected.day.split('-').map(Number);
    const [hour, minute] = selected.slot.split(':').map(Number);
    const start = new Date(year, month - 1, date, hour, minute);
    const finish = new Date(start.getTime() + currentService().minutes * 60000);
    const toIcs = (value) => value.getFullYear() + pad(value.getMonth() + 1) + pad(value.getDate()) + 'T' + pad(value.getHours()) + pad(value.getMinutes()) + '00';
    const escapeIcs = (value) => value.replace(/[\\;,]/g, (char) => '\\' + char).replace(/\n/g, '\\n');
    const stamp = toIcs(new Date());
    const title = escapeIcs('Simulation · ' + currentService().name + ' · H Style Barber shop');
    const description = escapeIcs('Simulation seulement : aucun rendez-vous n’a été transmis ou réservé. À confirmer avec le salon.');
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//H Style Preview//FR', 'BEGIN:VEVENT', 'UID:h-style-' + Date.now() + '@studiolamy', 'DTSTAMP:' + stamp, 'DTSTART:' + toIcs(start), 'DTEND:' + toIcs(finish), 'SUMMARY:' + title, 'LOCATION:5 Rue d’Auxonne\\, 21000 Dijon', 'DESCRIPTION:' + description, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const link = byData('[data-calendar]');
    if (link) {
      link.href = url;
      link.download = 'h-style-simulation.ics';
    }
    return day;
  }

  function finishSimulation() {
    const service = currentService();
    const day = createCalendarFile();
    const name = byData('#guest-name').value.trim();
    const recap = byData('[data-success-recap]');
    if (recap) recap.textContent = name + ', simulation pour ' + service.name.toLowerCase() + ', le ' + dateLong(day.date) + ' à ' + selected.slot + '. Montant indicatif : ' + money(service.price) + '.';
    goToStep(4);
  }

  form.addEventListener('change', (event) => {
    if (event.target.name === 'service') {
      selected.service = event.target.value;
      selected.day = '';
      selected.slot = '';
      drawDateStrip();
      drawSlots();
      const error = errorNode('service');
      if (error) error.textContent = '';
      updateSummary();
    }
  });
  form.addEventListener('click', (event) => {
    const next = event.target.closest('[data-next]');
    const back = event.target.closest('[data-back]');
    if (next) {
      if (!validateStep()) return;
      if (activeStep === 0) drawDateStrip();
      if (activeStep === 1) drawSlots();
      if (activeStep === 3) { finishSimulation(); return; }
      goToStep(activeStep + 1);
    }
    if (back && activeStep > 0) goToStep(activeStep - 1);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activeStep === 3 && validateStep()) finishSimulation();
  });
  stepButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetStep = Number(button.dataset.jumpStep);
      if (targetStep < activeStep) goToStep(targetStep);
    });
  });
  byData('[data-reset]')?.addEventListener('click', () => {
    form.reset();
    selected.service = '';
    selected.day = '';
    selected.slot = '';
    drawDateStrip();
    drawSlots();
    updateSummary();
    goToStep(0);
  });
  document.querySelectorAll('[data-select-service]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.selectService;
      const radio = form.querySelector('input[name="service"][value="' + value + '"]');
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      goToStep(0);
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelector('#reserver').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  function closeMenu(returnFocus) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    if (returnFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    mobileMenu.hidden = !open;
    if (open) mobileMenu.querySelector('a')?.focus();
  });
  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true); });

  if ('IntersectionObserver' in window) {
    const rows = document.querySelectorAll('.service-row');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    rows.forEach((row) => observer.observe(row));
    const dock = document.querySelector('.mobile-dock');
    const booking = document.querySelector('#reserver');
    const footer = document.querySelector('.site-footer');
    if (dock && booking && footer) {
      const dockObserver = new IntersectionObserver((entries) => {
        const isOnActionArea = entries.some((entry) => entry.isIntersecting);
        dock.classList.toggle('is-hidden', isOnActionArea);
      }, { threshold: 0.08 });
      dockObserver.observe(booking);
      dockObserver.observe(footer);
    }
  }

  updateSummary();
})();
