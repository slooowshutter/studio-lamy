/* Salon SLH — simulation locale, sans requête, stockage ni envoi. */
(() => {
  'use strict';
  const $ = (s, parent = document) => parent.querySelector(s);
  const $$ = (s, parent = document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const NB = '\u00a0';
  const services = [
    { id: 'courts', name: 'Shampoing, coupe & brushing', detail: 'Cheveux courts', price: 40 },
    { id: 'mi-longs', name: 'Shampoing, coupe & brushing', detail: 'Cheveux mi-longs', price: 44 },
    { id: 'longs', name: 'Shampoing, coupe & brushing', detail: 'Cheveux longs', price: 48 },
    { id: 'homme', name: 'Coupe homme', detail: 'Classique ou dégradé américain / taper', price: 23 },
    { id: 'barbe', name: 'Entretien de barbe', detail: '', price: 12 },
    { id: 'petit', name: 'Enfant de moins de 3 ans', detail: '', price: 14 },
    { id: 'garcon', name: 'Garçon de moins de 12 ans', detail: '', price: 17 },
    { id: 'fille', name: 'Fille de moins de 12 ans', detail: '', price: 26 }
  ];
  // Valeurs Planity / PagesJaunes ; la divergence FNC est visible dans la page.
  const hours = { 0: null, 1: null, 2: [540,1110], 3: [540,1110], 4: [540,1110], 5: [540,1110], 6: [540,960] };
  const state = { service: null, date: null, time: null, step: 0 };
  const money = n => `${n}${NB}€`;
  const clock = m => `${Math.floor(m / 60)}${NB}h${m % 60 ? NB + String(m % 60).padStart(2,'0') : ''}`;
  const iso = d => d.toISOString().slice(0,10);
  const utcDate = s => new Date(`${s}T12:00:00Z`);
  const fullDate = d => new Intl.DateTimeFormat('fr-FR',{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
  const dayName = d => new Intl.DateTimeFormat('fr-FR',{ weekday: 'short', timeZone: 'UTC' }).format(d);
  const monthName = d => new Intl.DateTimeFormat('fr-FR',{ month: 'short', timeZone: 'UTC' }).format(d);
  const parisFormat = new Intl.DateTimeFormat('en-GB',{ timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  function parisNow(date = new Date()) {
    const p = Object.fromEntries(parisFormat.formatToParts(date).map(v => [v.type,v.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, minutes: (+p.hour % 24) * 60 + +p.minute };
  }
  function holiday(date) {
    const year = date.getUTCFullYear();
    const md = iso(date).slice(5);
    if (['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'].includes(md)) return true;
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = Date.UTC(year,month - 1,day,12);
    return [1,39,50].some(offset => iso(new Date(easter + offset * 86400000)) === iso(date));
  }
  function nextDays(now = parisNow()) {
    const start = utcDate(now.date);
    return Array.from({length: 14},(_,n) => new Date(start.getTime() + n * 86400000));
  }
  function slotsFor(date, service, now = parisNow()) {
    const range = hours[date.getUTCDay()];
    if (!range || !service) return [];
    const seed = Number(iso(date).replaceAll('-',''));
    const slots = [];
    for (let time = range[0]; time < range[1]; time += 15) {
      const past = iso(date) < now.date || (iso(date) === now.date && time <= now.minutes);
      const busy = ((seed + time * 17) % 11) < 2;
      slots.push({ time, disabled: past || busy, reason: past ? 'Passé' : busy ? 'Déjà pris' : 'Disponible' });
    }
    return slots;
  }
  const canEnter = step => step === 0 || (step === 1 && !!state.service) || (step === 2 && !!state.date && !!state.service) || (step === 3 && state.time !== null && !!state.date && !!state.service);
  const announce = text => { $('#booking-status').textContent = text; };
  let keyboard = false;
  let paneAnimation = null;
  document.addEventListener('keydown',event => {
    if (['Tab','Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      keyboard = true;
      root.classList.add('keyboard-mode');
    }
  });
  document.addEventListener('pointerdown',() => { keyboard = false; root.classList.remove('keyboard-mode'); },{passive: true});

  function summary() {
    const service = state.service;
    $('#summary-service').textContent = service ? `${service.name}${service.detail ? ' · ' + service.detail : ''}` : 'Votre prestation';
    $('#summary-date').textContent = state.date ? fullDate(utcDate(state.date)) : 'Votre jour';
    $('#summary-time').textContent = state.time !== null ? clock(state.time) : 'Votre heure';
    $('#summary-price').textContent = service ? money(service.price) : '—';
    $('#summary-duration').textContent = 'Durée à confirmer auprès du salon.';
    $$('[data-step]').forEach(button => {
      const step = +button.dataset.step;
      button.disabled = !canEnter(step);
      if (state.step === step) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    $$('[data-next]').forEach(button => {
      const next = +button.dataset.next;
      button.disabled = !canEnter(next);
    });
  }

  function renderServices() {
    const fieldset = $('#service-choices');
    services.forEach(service => {
      const label = document.createElement('label');
      label.className = 'service-choice';
      label.innerHTML = `<input type="radio" name="service" value="${service.id}"><span class="choice-copy">${service.name}<small>${service.detail || 'Durée à confirmer auprès du salon'}</small></span><span class="choice-price">${money(service.price)}</span>`;
      fieldset.append(label);
    });
    fieldset.addEventListener('change',event => {
      const service = services.find(s => s.id === event.target.value);
      if (!service) return;
      if (state.service?.id !== service.id) { state.date = null; state.time = null; }
      state.service = service;
      summary();
      announce(`${service.name}${service.detail ? ', ' + service.detail : ''}, tarif indicatif ${money(service.price)}. Vous pouvez choisir le jour.`);
    });
  }

  function renderDays() {
    const fieldset = $('#day-choices');
    fieldset.replaceChildren();
    const legend = document.createElement('legend');
    legend.className = 'sr-only'; legend.textContent = 'Choisir un jour'; fieldset.append(legend);
    const now = parisNow();
    let selectedStillValid = false;
    nextDays(now).forEach((date,index) => {
      const key = iso(date), closed = !hours[date.getUTCDay()];
      const ended = !closed && !slotsFor(date,state.service,now).some(slot => !slot.disabled);
      const isHoliday = holiday(date), disabled = closed || ended;
      const status = closed ? 'Fermé' : ended ? 'Terminé' : isHoliday ? 'Férié*' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : monthName(date);
      const label = document.createElement('label'); label.className = 'day-choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'day'; input.value = key; input.disabled = disabled;
      input.setAttribute('aria-label',`${fullDate(date)}${closed ? ', fermé' : ended ? ', aucun créneau restant' : isHoliday ? ', jour férié, ouverture à confirmer' : ''}`);
      input.checked = state.date === key && !disabled;
      if (input.checked) selectedStillValid = true;
      const span = document.createElement('span');
      span.innerHTML = `<span class="day-label">${dayName(date)}</span><strong>${date.getUTCDate()}</strong><small>${status}</small>`;
      label.append(input,span); fieldset.append(label);
    });
    if (!selectedStillValid) { state.date = null; state.time = null; }
    $('#day-note').textContent = '* Jour férié : ouverture à confirmer au salon. Toutes les disponibilités de cet aperçu sont fictives.';
    summary();
  }

  function renderTimes() {
    const fieldset = $('#time-choices'); fieldset.replaceChildren();
    const legend = document.createElement('legend'); legend.className = 'sr-only'; legend.textContent = 'Choisir une heure'; fieldset.append(legend);
    if (!state.date || !state.service) return;
    const date = utcDate(state.date), slots = slotsFor(date,state.service);
    $('#selected-day').textContent = fullDate(date) + (holiday(date) ? ' · férié, ouverture à confirmer' : '');
    let lastPeriod = '';
    slots.forEach(slot => {
      const period = slot.time < 720 ? 'Matin' : 'Après-midi';
      if (period !== lastPeriod) {
        const title = document.createElement('p'); title.className = 'time-period'; title.textContent = period;
        fieldset.append(title); lastPeriod = period;
      }
      const label = document.createElement('label'); label.className = 'time-choice';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'time'; input.value = String(slot.time);
      input.disabled = slot.disabled;
      input.checked = state.time === slot.time && !slot.disabled;
      input.setAttribute('aria-label',`${clock(slot.time)}, ${slot.reason.toLowerCase()}`);
      const span = document.createElement('span');
      span.innerHTML = `<b>${clock(slot.time)}</b><small>${slot.reason}</small>`;
      label.append(input,span); fieldset.append(label);
    });
    if (!slots.some(slot => slot.time === state.time && !slot.disabled)) state.time = null;
    const count = slots.filter(slot => !slot.disabled).length;
    $('#time-note').textContent = count ? `${count} créneaux fictifs sélectionnables. Horaires et disponibilité à confirmer auprès du salon.` : 'Aucun créneau restant pour ce jour. Revenez au choix du jour.';
    summary();
  }

  function focusHeading(step) {
    const heading = $(`#step-title-${step}`);
    heading.focus({preventScroll: true});
    const rect = heading.getBoundingClientRect();
    if (rect.top < 24 || rect.bottom > innerHeight - 110) heading.scrollIntoView({ block: 'start', behavior: keyboard || reduced.matches ? 'instant' : 'smooth' });
  }

  function showStep(step,{focus = true} = {}) {
    if (step < 4 && !canEnter(step)) return;
    const previous = state.step;
    if (step === 1) renderDays();
    if (step === 2) renderTimes();
    if (step === 3 && !slotValid()) {
      state.time = null; showStep(2); announce('Ce créneau n’est plus sélectionnable. Choisissez une autre heure.'); return;
    }
    if (paneAnimation) paneAnimation.cancel();
    state.step = step;
    $$('[data-pane]').forEach(pane => { pane.hidden = +pane.dataset.pane !== step; });
    summary();
    const pane = $(`[data-pane="${step}"]`);
    if (!reduced.matches && !keyboard && pane.animate && previous !== step) {
      const offset = step > previous ? 10 : -10;
      paneAnimation = pane.animate([{opacity: 0,transform: `translateX(${offset}px)`},{opacity: 1,transform: 'translateX(0)'}],{duration: 240,easing: 'cubic-bezier(0.23,1,0.32,1)'});
    }
    if (focus) focusHeading(step);
    announce(step === 4 ? 'Simulation terminée. Aucun rendez-vous n’a été pris et aucune donnée n’a été envoyée.' : `Étape ${step + 1} sur 4${NB}: ${$('#step-title-' + step).textContent}`);
  }
  function slotValid() {
    if (!state.date || !state.service || state.time === null) return false;
    if (!nextDays().some(date => iso(date) === state.date)) return false;
    return slotsFor(utcDate(state.date),state.service).some(slot => slot.time === state.time && !slot.disabled);
  }
  function reset() {
    state.service = null; state.date = null; state.time = null;
    $('#contact-form').reset();
    $$('input[name="service"]').forEach(input => { input.checked = false; });
    ['first-name','phone'].forEach(id => { $(`#${id}`).removeAttribute('aria-invalid'); $(`#${id}-error`).textContent = ''; });
    $('#success-copy').textContent = ''; $('#success-recap').textContent = '';
    showStep(0);
  }
  function validateField(id) {
    const input = $('#' + id), value = input.value.trim();
    let error = '';
    if (id === 'first-name' && !value) error = 'Indiquez un prénom, même un prénom d’exemple.';
    if (id === 'phone' && !/^(?:0[67]|(?:\+33|0033)[67])\d{8}$/.test(value.replace(/[\s().-]/g,''))) error = 'Indiquez un mobile français à 10 chiffres commençant par 06 ou 07, ou son format +33.';
    input.setAttribute('aria-invalid',String(!!error));
    $('#' + id + '-error').textContent = error;
    return !error;
  }
  function bootBooking() {
    renderServices();
    $('#booking-sheet').hidden = false;
    $('#day-choices').addEventListener('change',event => {
      if (!event.target.matches('input[name="day"]')) return;
      if (state.date !== event.target.value) state.time = null;
      state.date = event.target.value; summary();
      announce(`Jour choisi${NB}: ${fullDate(utcDate(state.date))}. Vous pouvez choisir l’heure.`);
    });
    $('#time-choices').addEventListener('change',event => {
      if (!event.target.matches('input[name="time"]')) return;
      state.time = +event.target.value; summary();
      announce(`Heure choisie${NB}: ${clock(state.time)}. Vous pouvez continuer.`);
    });
    $$('[data-next]').forEach(button => button.addEventListener('click',() => showStep(+button.dataset.next)));
    $$('[data-back]').forEach(button => button.addEventListener('click',() => showStep(+button.dataset.back)));
    $$('[data-step]').forEach(button => button.addEventListener('click',() => showStep(+button.dataset.step)));
    $$('[data-pick]').forEach(button => button.addEventListener('click',() => {
      const radio = $(`input[name="service"][value="${button.dataset.pick}"]`);
      radio.checked = true; radio.dispatchEvent(new Event('change',{bubbles: true}));
      showStep(1);
    }));
    ['first-name','phone'].forEach(id => {
      $('#' + id).addEventListener('blur',() => validateField(id));
      $('#' + id).addEventListener('input',() => {
        if ($('#' + id).getAttribute('aria-invalid') === 'true') { $('#' + id).removeAttribute('aria-invalid'); $('#' + id + '-error').textContent = ''; }
      });
    });
    $('#contact-form').addEventListener('submit',event => {
      event.preventDefault();
      const nameValid = validateField('first-name'), phoneValid = validateField('phone');
      if (!nameValid || !phoneValid) {
        announce('Vérifiez les champs indiqués avant de terminer la simulation.');
        $(nameValid ? '#phone' : '#first-name').focus(); return;
      }
      if (!slotValid()) { state.time = null; showStep(1); announce('Le jour ou l’heure a expiré. Choisissez un nouveau créneau fictif.'); return; }
      // Les saisies utilisateur sont toujours écrites avec textContent.
      $('#success-copy').textContent = `${$('#first-name').value.trim()}, voici le résultat de votre essai à Brest.`;
      $('#success-recap').textContent = `${state.service.name}${state.service.detail ? ' · ' + state.service.detail : ''} — ${fullDate(utcDate(state.date))}, ${clock(state.time)}. ${money(state.service.price)}, tarif relevé sur Planity.`;
      showStep(4);
    });
    $('#restart').addEventListener('click',reset);
    summary();
  }
  function bootMotion() {
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
    const targets = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduced.matches) targets.forEach(el => el.classList.add('is-visible'));
    else {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
        });
      },{threshold: .12});
      targets.forEach(el => observer.observe(el));
    }
    reduced.addEventListener('change',() => {
      if (reduced.matches) { if (paneAnimation) paneAnimation.cancel(); targets.forEach(el => el.classList.add('is-visible')); }
    });
    const bar = $('.mobile-bar');
    if (!('IntersectionObserver' in window)) { bar.classList.add('is-visible'); return; }
    const visibility = { hero: true, booking: false, footer: false };
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const key = entry.target.id === 'hero-actions' ? 'hero' : entry.target.id === 'reserver' ? 'booking' : 'footer';
        visibility[key] = entry.isIntersecting;
      });
      const show = !visibility.hero && !visibility.booking && !visibility.footer;
      bar.classList.toggle('is-visible',show);
      bar.inert = !show;
    },{threshold: 0});
    [$('#hero-actions'),$('#reserver'),$('#footer')].forEach(el => barObserver.observe(el));
  }
  try {
    bootBooking(); bootMotion();
    window.slhReady = true;
  } catch (error) {
    root.classList.remove('js');
    $('#booking-sheet').hidden = true;
    const fallback = document.createElement('p');
    fallback.className = 'no-js';
    fallback.textContent = 'Le simulateur est indisponible. Pour réserver réellement, utilisez le lien Planity ci-dessus ou appelez le 02 98 43 10 01.';
    $('#booking-sheet').before(fallback);
    console.error('Simulation indisponible',error);
  }
})();
