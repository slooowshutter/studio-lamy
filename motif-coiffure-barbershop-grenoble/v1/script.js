(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const all = (selector, node = document) => Array.from(node.querySelectorAll(selector));
  const byId = id => document.getElementById(id);

  // L’entrée ne masque le contenu qu’une fois le script disponible.
  root.classList.add('js');
  all('.entrance').forEach((element, index) => {
    element.style.setProperty('--delay', `${Math.min(index, 5) * 60}ms`);
  });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: .13 });
    all('[data-reveal]').forEach(element => reveals.observe(element));

    // Deux seuils de lecture, aucune boucle de défilement ou animation permanente.
    const shapes = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('has-passed', !entry.isIntersecting));
    }, { rootMargin: '-12% 0px -45% 0px', threshold: 0 });
    all('.hero-fact, .route-card').forEach(element => shapes.observe(element));
  } else {
    all('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  }

  // Horaires d’iCoiffeur, recherche fournie le 16/11/2026.
  // Le vendredi, retenir la pause la plus précoce : 12 h 30.
  const HOURS = {
    0: [],
    1: [[540, 1140]],
    2: [[540, 1140]],
    3: [[540, 1140]],
    4: [[540, 1140]],
    5: [[540, 750], [840, 1140]],
    6: [[540, 1140]]
  };

  const parisParts = date => {
    const entries = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]);
    const part = Object.fromEntries(entries);
    return { key: `${part.year}-${String(part.month).padStart(2, '0')}-${String(part.day).padStart(2, '0')}`, minutes: part.hour * 60 + part.minute };
  };
  const dateFromKey = key => new Date(`${key}T12:00:00Z`);
  const keyFromDate = date => date.toISOString().slice(0, 10);
  const fullDate = key => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateFromKey(key));
  const timeLabel = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;

  // Un point de démonstration par heure à l’intérieur des périodes sourcées.
  // L’intervalle appartient à l’interface, ce n’est pas une durée de prestation.
  const illustrativeTimes = (key, now = new Date()) => {
    const today = parisParts(now);
    return (HOURS[dateFromKey(key).getUTCDay()] || [])
      .flatMap(([start, end]) => {
        const times = [];
        for (let minute = start; minute < end; minute += 60) times.push(minute);
        return times;
      })
      .filter(minutes => key > today.key || (key === today.key && minutes > today.minutes));
  };

  let currentStep = 0;
  let furthestStep = 0;
  let transitionSerial = 0;
  let keyboardMode = false;
  let state = { request: '', day: '', time: null };
  const panels = all('.booking-step');
  const stepButtons = all('[data-step]');
  const app = byId('booking-app');
  const stepNames = ['Votre demande', 'Le jour', 'L’heure indicative', 'Le récapitulatif', 'La démonstration est terminée'];

  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
      keyboardMode = true;
      root.classList.add('keyboard-use');
    }
  });
  document.addEventListener('pointerdown', () => {
    keyboardMode = false;
    root.classList.remove('keyboard-use');
  }, { passive: true });

  function updateSummary() {
    byId('resume-demande').textContent = state.request || 'À choisir';
    byId('resume-jour').textContent = state.day ? fullDate(state.day) : 'À choisir';
    byId('resume-heure').textContent = state.time !== null ? timeLabel(state.time) : 'À choisir';
    stepButtons.forEach((button, index) => {
      button.disabled = index > furthestStep || currentStep === 4;
      if (index === currentStep) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
  }

  function clearError(id) { byId(id).textContent = ''; }
  function showError(id, text, focusElement) {
    byId(id).textContent = text;
    if (focusElement) focusElement.focus({ preventScroll: true });
  }

  function buildDays() {
    const today = parisParts(new Date());
    const origin = dateFromKey(today.key);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(origin);
      date.setUTCDate(origin.getUTCDate() + index);
      const key = keyFromDate(date);
      const closed = HOURS[date.getUTCDay()].length === 0;
      const elapsed = !closed && illustrativeTimes(key).length === 0;
      const label = document.createElement('label');
      label.className = 'day-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = key;
      input.disabled = closed || elapsed;
      input.checked = state.day === key;
      input.setAttribute('aria-label', `${fullDate(key)}${closed ? ', fermé selon les horaires publiés' : elapsed ? ', heures de démonstration écoulées' : ', pour la simulation'}`);
      input.setAttribute('aria-describedby', 'erreur-jour');
      const weekday = document.createElement('span');
      weekday.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const number = document.createElement('span');
      number.className = 'day-number'; number.textContent = date.getUTCDate();
      const status = document.createElement('span');
      status.className = 'day-state';
      status.textContent = closed ? 'Fermé' : elapsed ? 'Écoulé' : new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      label.append(input, weekday, number, status);
      fragment.append(label);
    }
    byId('jours').replaceChildren(fragment);
  }

  function buildTimes() {
    byId('jour-choisi').textContent = fullDate(state.day);
    const times = illustrativeTimes(state.day);
    const fragment = document.createDocumentFragment();
    times.forEach(minutes => {
      const label = document.createElement('label');
      label.className = 'slot-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'heure'; input.value = minutes;
      input.checked = state.time === minutes;
      input.setAttribute('aria-label', `${timeLabel(minutes)}, heure indicative de simulation`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      const text = document.createElement('span'); text.textContent = timeLabel(minutes);
      label.append(input, text); fragment.append(label);
    });
    if (!times.length) {
      const message = document.createElement('p'); message.className = 'empty-slots';
      message.textContent = 'Les heures de démonstration de ce jour sont écoulées. Revenez au choix du jour.';
      fragment.append(message);
    }
    byId('heures').replaceChildren(fragment);
  }

  const recap = () => `${state.request} · ${fullDate(state.day)} · ${timeLabel(state.time)}. Heure indicative, à confirmer par téléphone. Arrivée : Gustave Rivet, tram C et E, puis 20 boulevard Maréchal Joffre.`;

  function switchStep(next) {
    const serial = ++transitionSerial;
    const old = panels[currentStep];
    const target = panels[next];
    const animate = !reduceMotion.matches && !keyboardMode;
    old.classList.remove('is-changing');
    currentStep = next;
    furthestStep = Math.max(furthestStep, Math.min(next, 3));
    if (next === 1) buildDays();
    if (next === 2) buildTimes();
    if (next === 3) byId('recapitulatif').textContent = recap();
    if (next === 4) byId('recapitulatif-fin').textContent = recap();
    panels.forEach(panel => { panel.hidden = panel !== target; panel.classList.remove('is-changing'); });
    target.hidden = false;
    if (animate) {
      target.classList.add('is-changing');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (serial === transitionSerial) target.classList.remove('is-changing');
      }));
    }
    updateSummary();
    const heading = target.querySelector('h3');
    heading.focus({ preventScroll: true });
    // Le titre et les choix restent visibles sans saut sur la page entière.
    if (app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start', behavior: 'instant' });
    byId('statut-parcours').textContent = `${stepNames[next]}. ${next === 4 ? 'Rien n’a été envoyé.' : `Étape ${next + 1} sur 4.`}`;
  }

  function validateNext(next) {
    if (next === 1 && !state.request) {
      showError('erreur-demande', 'Choisissez la demande pour essayer le parcours.', document.querySelector('input[name="demande"]'));
      return;
    }
    if (next === 2 && (!state.day || !illustrativeTimes(state.day).length)) {
      showError('erreur-jour', 'Choisissez un jour comportant une heure de démonstration.', document.querySelector('input[name="jour"]:not(:disabled)'));
      return;
    }
    if (next === 3 && (state.time === null || !illustrativeTimes(state.day).includes(state.time))) {
      showError('erreur-heure', 'Choisissez une heure indicative. Si elle est écoulée, changez de jour.', document.querySelector('input[name="heure"]'));
      return;
    }
    switchStep(next);
  }

  app.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'demande') {
      state.request = input.value; clearError('erreur-demande');
    } else if (input.name === 'jour') {
      state.day = input.value; state.time = null;
      furthestStep = Math.min(furthestStep, 2); clearError('erreur-jour');
    } else if (input.name === 'heure') {
      state.time = Number(input.value); clearError('erreur-heure');
    }
    updateSummary();
  });
  all('[data-next]').forEach(button => button.addEventListener('click', () => validateNext(Number(button.dataset.next))));
  all('[data-back]').forEach(button => button.addEventListener('click', () => switchStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => switchStep(Number(button.dataset.step))));
  byId('finish-demo').addEventListener('click', () => {
    if (!illustrativeTimes(state.day).includes(state.time)) {
      switchStep(2);
      showError('erreur-heure', 'Cette heure indicative est écoulée. Choisissez un autre jour.', null);
      return;
    }
    switchStep(4);
  });
  byId('restart-demo').addEventListener('click', () => {
    state = { request: '', day: '', time: null }; furthestStep = 0;
    all('input[name="demande"]').forEach(input => { input.checked = false; });
    ['erreur-demande', 'erreur-jour', 'erreur-heure'].forEach(clearError);
    switchStep(0);
  });

  document.querySelector('input[name="demande"]').setAttribute('aria-describedby', 'erreur-demande');
  updateSummary();
  app.hidden = false;
})();
