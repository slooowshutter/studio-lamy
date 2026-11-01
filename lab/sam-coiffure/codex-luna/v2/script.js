/* Sam Coiffure · aperçu. Module de démonstration sans envoi. */
window.__site = 1;
(() => {
  'use strict';

  const SERVICES = {
    cut: { name: 'Coupe homme', duration: 30, price: 20 },
    beard: { name: 'Entretien de barbe', duration: 20, price: 12 },
    combo: { name: 'Coupe + barbe', duration: 45, price: 28 }
  };
  // Source de base : PagesJaunes, relevé 01/10/2026. Le samedi diverge selon les annuaires.
  // Les prestations, durées, prix et créneaux restent des propositions à confirmer.
  const HOURS = {
    0: [],
    1: [{ start: 540, end: 1110 }],
    2: [{ start: 540, end: 1110 }],
    3: [{ start: 540, end: 1110 }],
    4: [{ start: 540, end: 1110 }],
    5: [{ start: 510, end: 750 }, { start: 870, end: 1110 }],
    6: []
  };
  const DAYCOUNT = 14;
  const state = { step: 1, service: null, day: null, time: null, dayIndex: 0, firstName: '', phone: '' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const money = value => `${value.toLocaleString('fr-FR')}&nbsp;€`;
  const dateISO = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const dateLabel = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  const shortDate = date => new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date).replace('.', '');
  const minsLabel = mins => `${String(Math.floor(mins / 60)).padStart(2, '0')} h ${String(mins % 60).padStart(2, '0')}`;
  const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  const serviceChoices = $('#serviceChoices');
  const dayChoices = $('#dayChoices');
  const timeChoices = $('#timeChoices');
  const slotStatus = $('#slotStatus');
  const bookingStatus = $('#bookingStatus');
  const steps = $$('.booking-step');
  const nextService = $('[data-next="2"]');
  const nextDate = $('[data-next="3"]');

  function updateSummary() {
    const selected = state.service ? SERVICES[state.service] : null;
    $('#summaryService').textContent = selected ? selected.name : 'Pas encore choisie';
    $('#summaryDay').textContent = state.day ? shortDate(state.day) : 'Pas encore choisi';
    $('#summaryTime').textContent = state.time ? minsLabel(state.time) : '—';
    $('#summaryPrice').innerHTML = selected ? money(selected.price) : '—';
  }

  function renderDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fragment = document.createDocumentFragment();
    let firstAvailable = null;

    for (let index = 0; index < DAYCOUNT; index += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const hours = HOURS[day.getDay()];
      const closed = !hours || hours.length === 0;
      if (!closed && !firstAvailable) firstAvailable = day;

      const label = document.createElement('label');
      label.className = `day-choice${closed ? ' is-closed' : ''}`;
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'bookingDay';
      input.value = dateISO(day);
      input.disabled = closed;
      input.setAttribute('aria-label', `${dateLabel(day)}${closed ? ', fermé selon les horaires retenus pour cette simulation' : ''}`);
      const weekday = document.createElement('small');
      weekday.textContent = index === 0 ? 'Aujourd’hui' : new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(day).replace('.', '');
      const number = document.createElement('strong');
      number.textContent = String(day.getDate());
      label.append(input, weekday, number);
      if (closed) {
        const stateLabel = document.createElement('small');
        stateLabel.className = 'day-state';
        stateLabel.textContent = 'fermé';
        label.append(stateLabel);
      }
      input.addEventListener('change', () => {
        state.day = new Date(`${input.value}T00:00:00`);
        state.time = null;
        state.dayIndex = index;
        $$('.day-choice', dayChoices).forEach(item => item.classList.toggle('is-selected', item === label));
        renderTimes();
        updateSummary();
      });
      fragment.append(label);
    }
    dayChoices.replaceChildren(fragment);

    if (firstAvailable) {
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const firstOpenIndex = Array.from(dayChoices.querySelectorAll('input')).findIndex(input => !input.disabled);
      const firstOpenInput = dayChoices.querySelectorAll('input')[firstOpenIndex];
      const firstOpenLabel = firstOpenInput.closest('label');
      if (firstOpenInput) {
        firstOpenInput.checked = true;
        firstOpenLabel.classList.add('is-selected');
        state.day = firstAvailable;
        state.dayIndex = firstOpenIndex;
      }
    }
    renderTimes();
    updateSummary();
  }

  function groupedSlots(slots) {
    return [
      { title: 'Matin', values: slots.filter(value => value.minute < 720) },
      { title: 'Après-midi', values: slots.filter(value => value.minute >= 720 && value.minute < 1020) },
      { title: 'Soir', values: slots.filter(value => value.minute >= 1020) }
    ].filter(group => group.values.length);
  }

  function renderTimes() {
    const selectedService = state.service ? SERVICES[state.service] : null;
    timeChoices.replaceChildren();
    state.time = null;
    nextDate.disabled = true;
    if (!state.day || !selectedService) {
      slotStatus.textContent = selectedService ? 'Choisissez un jour pour afficher les heures.' : 'Choisissez d’abord une prestation.';
      return;
    }

    const ranges = HOURS[state.day.getDay()] || [];
    const allSlots = [];
    ranges.forEach(range => {
      for (let minute = range.start; minute + selectedService.duration <= range.end; minute += 30) allSlots.push({ minute, end: range.end });
    });
    const now = new Date();
    const todayKey = dateISO(now);
    const isToday = dateISO(state.day) === todayKey;
    const available = [];
    const usedSlots = [];
    allSlots.forEach((slot, index) => {
      const past = isToday && slot.minute <= (now.getHours() * 60 + now.getMinutes());
      const hash = state.day.getFullYear() * 365 + Math.floor(state.day.getTime() / 86400000) + index * 11 + selectedService.duration;
      const taken = !past && hash % 9 === 0;
      const item = { ...slot, past, taken };
      (past || taken ? usedSlots : available).push(item);
    });

    if (!allSlots.length) {
      slotStatus.textContent = 'Aucun créneau dans cette simulation. Les horaires sont à confirmer.';
      return;
    }
    const slotsToShow = available.concat(usedSlots).sort((a, b) => a.minute - b.minute);
    const groups = groupedSlots(slotsToShow);
    groups.forEach(group => {
      const section = document.createElement('section');
      section.className = 'slot-group';
      const heading = document.createElement('h4');
      heading.textContent = group.title;
      const grid = document.createElement('div');
      grid.className = 'slot-grid';
      group.values.forEach(slot => {
        const label = document.createElement('label');
        const disabled = slot.past || slot.taken;
        label.className = `slot-choice${disabled ? ' is-booked' : ''}`;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'bookingTime';
        input.value = String(slot.minute);
        input.disabled = disabled;
        input.setAttribute('aria-label', `${minsLabel(slot.minute)}${slot.past ? ', heure passée' : slot.taken ? ', déjà pris' : ''}`);
        const time = document.createElement('time');
        const y = state.day.getFullYear();
        const m = String(state.day.getMonth() + 1).padStart(2, '0');
        const d = String(state.day.getDate()).padStart(2, '0');
        const hh = String(Math.floor(slot.minute / 60)).padStart(2, '0');
        const mm = String(slot.minute % 60).padStart(2, '0');
        time.dateTime = `${y}-${m}-${d}T${hh}:${mm}`;
        time.textContent = `${hh}:${mm}`;
        label.append(input, time);
        if (!disabled) {
          input.addEventListener('change', () => {
            state.time = slot.minute;
            $$('.slot-choice', timeChoices).forEach(item => item.classList.toggle('is-selected', item === label));
            nextDate.disabled = false;
            slotStatus.textContent = `${available.length} créneau${available.length > 1 ? 'x' : ''} disponible${available.length > 1 ? 's' : ''} pour ${dateLabel(state.day)}.`;
            updateSummary();
          });
        }
        grid.append(label);
      });
      section.append(heading, grid);
      timeChoices.append(section);
    });
    slotStatus.textContent = `${available.length} créneau${available.length > 1 ? 'x' : ''} disponible${available.length > 1 ? 's' : ''} pour ${dateLabel(state.day)}. Les heures barrées sont passées ou déjà prises dans la simulation.`;
    $('#timeLegend').textContent = `Choisissez une heure · ${dateLabel(state.day)}`;
  }

  function goToStep(step, push = true) {
    const target = Math.max(1, Math.min(4, Number(step)));
    const current = steps.find(item => Number(item.dataset.step) === state.step);
    const next = steps.find(item => Number(item.dataset.step) === target);
    if (!next) return;
    if (push && target !== state.step) history.pushState({ bookingStep: target }, '', `?etape=${target}`);
    if (current && current !== next) current.hidden = true;
    next.hidden = false;
    next.classList.remove('is-active');
    next.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      next.classList.remove('is-entering');
      next.classList.add('is-active');
    }));
    state.step = target;
    const labels = { 1: 'Choisir une prestation', 2: 'Choisir un jour et une heure', 3: 'Indiquer vos coordonnées', 4: 'Récapitulatif de la simulation' };
    bookingStatus.textContent = `Étape ${target} sur 4 · ${labels[target]}`;
    if (target === 3) {
      const service = SERVICES[state.service];
      $('#contactRecap').textContent = `${service.name} · ${dateLabel(state.day)} à ${minsLabel(state.time)} · ${service.price} € indicatifs`;
    }
    if (target === 4) renderSuccess();
    updateSummary();
    window.setTimeout(() => $(`#step${target}-title`)?.focus({ preventScroll: true }), 30);
  }

  function renderSuccess() {
    const service = SERVICES[state.service];
    $('#successTicket').innerHTML = `<h4>Sam Coiffure</h4><dl><div><dt>Pour</dt><dd>${safe(state.firstName)}</dd></div><div><dt>Prestation</dt><dd>${safe(service.name)}</dd></div><div><dt>Quand</dt><dd>${safe(dateLabel(state.day))} à ${safe(minsLabel(state.time))}</dd></div><div><dt>Tarif proposé</dt><dd>${service.price} €</dd></div></dl>`;
  }

  serviceChoices.addEventListener('change', event => {
    if (event.target.name !== 'service') return;
    state.service = event.target.value;
    nextService.disabled = false;
    renderTimes();
    updateSummary();
  });
  $$('[data-next]').forEach(button => button.addEventListener('click', () => goToStep(button.dataset.next)));
  $$('[data-back]').forEach(button => button.addEventListener('click', () => goToStep(button.dataset.back)));
  $$('[data-book-service]').forEach(button => button.addEventListener('click', () => {
    state.service = button.dataset.bookService;
    const choice = $(`input[name="service"][value="${state.service}"]`);
    if (choice) choice.checked = true;
    nextService.disabled = false;
    renderTimes();
    updateSummary();
    goToStep(2);
    $('#bookingPanel').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  $('#contactForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#firstName');
    const phone = $('#phone');
    const nameValue = name.value.trim();
    const phoneValue = phone.value.trim();
    const compactPhone = phoneValue.replace(/[\s().-]/g, '');
    const digits = compactPhone.replace(/\D/g, '');
    const frenchMobile = (digits.length === 10 && /^0[67]/.test(digits)) || (digits.length === 11 && digits.startsWith('33') && /^[67]/.test(digits.slice(2)));
    let valid = true;

    if (nameValue.length < 2) {
      $('#firstNameError').textContent = 'Indiquez un prénom d’au moins deux lettres.';
      name.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      $('#firstNameError').textContent = '';
      name.removeAttribute('aria-invalid');
    }
    if (!frenchMobile) {
      $('#phoneError').textContent = 'Entrez un numéro de mobile français, par exemple 06 12 34 56 78.';
      phone.setAttribute('aria-invalid', 'true');
      valid = false;
    } else {
      $('#phoneError').textContent = '';
      phone.removeAttribute('aria-invalid');
    }
    if (!valid) {
      $(`[aria-invalid="true"]`)?.focus();
      return;
    }
    state.firstName = nameValue;
    state.phone = phoneValue;
    goToStep(4);
  });

  $('#resetBooking').addEventListener('click', () => {
    state.service = null;
    state.time = null;
    state.firstName = '';
    state.phone = '';
    $('#contactForm').reset();
    $$('input[name="service"]').forEach(input => { input.checked = false; });
    nextService.disabled = true;
    nextDate.disabled = true;
    updateSummary();
    goToStep(1);
  });

  window.addEventListener('popstate', event => {
    if (event.state && event.state.bookingStep) goToStep(event.state.bookingStep, false);
    else goToStep(1, false);
  });

  function setupReveals() {
    const revealTargets = [$('.ticket-card'), ...$$('.service-row'), ...$$('.hours-row'), $('.schematic-map'), ...$$('.complete-list > li')].filter(Boolean);
    revealTargets.forEach((element, index) => {
      element.setAttribute('data-reveal', '');
      if (element.classList.contains('service-row')) element.style.setProperty('--reveal-delay', `${Math.min(index * 45, 180)}ms`);
    });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealTargets.forEach(element => element.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
    revealTargets.forEach(element => observer.observe(element));
  }

  function setupMobileBar() {
    const bar = $('#mobileBar');
    const heroActions = $('.hero-actions');
    const booking = $('#reservation');
    const footer = $('.site-footer');
    if (!bar || !heroActions || !booking || !footer) return;
    let heroVisible = true;
    let bookingVisible = false;
    let footerVisible = false;
    const update = () => bar.classList.toggle('is-visible', !heroVisible && !bookingVisible && !footerVisible);
    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; update(); }, { threshold: 0.05 });
      const bookingObserver = new IntersectionObserver(entries => { bookingVisible = entries[0].isIntersecting; update(); }, { threshold: 0.03 });
      const footerObserver = new IntersectionObserver(entries => { footerVisible = entries[0].isIntersecting; update(); }, { threshold: 0.01 });
      heroObserver.observe(heroActions);
      bookingObserver.observe(booking);
      footerObserver.observe(footer);
    } else {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        heroVisible = y < heroActions.offsetTop + heroActions.offsetHeight;
        bookingVisible = y + window.innerHeight > booking.offsetTop && y < booking.offsetTop + booking.offsetHeight;
        footerVisible = y + window.innerHeight > footer.offsetTop;
        update();
      }, { passive: true });
    }
  }

  renderDays();
  setupReveals();
  setupMobileBar();
})();
