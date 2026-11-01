(() => {
  'use strict';
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let keyboard = false;
  document.addEventListener('keydown', () => {
    keyboard = true;
    root.classList.add('keyboard-input');
  });
  document.addEventListener('pointerdown', () => {
    keyboard = false;
    root.classList.remove('keyboard-input');
  }, { passive: true });

  const study = document.querySelector('.clipper-study');
  const partsButton = document.querySelector('.parts-toggle');
  partsButton.hidden = false;
  partsButton.addEventListener('click', () => {
    study.classList.add('has-interacted');
    const separated = study.classList.toggle('is-separated');
    partsButton.setAttribute('aria-pressed', String(separated));
    partsButton.firstChild.textContent = separated ? 'Réunir les pièces ' : 'Voir les pièces ';
    partsButton.querySelector('span').textContent = separated ? '−' : '+';
  });

  const form = document.querySelector('#preparation-form');
  const demo = document.querySelector('.demo-interface');
  const panels = Array.from(document.querySelectorAll('.form-step'));
  const steps = Array.from(document.querySelectorAll('[data-step]'));
  const success = document.querySelector('.demo-success');
  const summary = document.querySelector('.selection-summary');
  const announcement = document.querySelector('#step-announcement');
  const error = document.querySelector('#purpose-error');
  const brand = document.querySelector('#marque');
  const model = document.querySelector('#modele');
  const radios = Array.from(form.querySelectorAll('[name="sujet"]'));
  const purposeNames = {
    achat: 'Un achat de tondeuse',
    reparation: 'Une réparation de tondeuse',
    accessoires: 'Le rasage et les accessoires'
  };
  let step = 0;
  let furthest = 0;
  let entranceFrame;
  demo.hidden = false;

  function updateSummary() {
    const selected = radios.find(radio => radio.checked);
    document.querySelector('#summary-purpose').textContent = selected ? purposeNames[selected.value] : 'À choisir';
    document.querySelector('#summary-brand').textContent = brand.value.trim() || 'Non renseignée';
    document.querySelector('#summary-model').textContent = model.value.trim() || 'Non renseigné';
  }

  function enterPanel(panel, focus = true) {
    cancelAnimationFrame(entranceFrame);
    panels.forEach(item => item.classList.remove('is-entering'));
    success.classList.remove('is-entering');
    if (!keyboard && !reduceMotion.matches) {
      panel.classList.add('is-entering');
      entranceFrame = requestAnimationFrame(() => {
        entranceFrame = requestAnimationFrame(() => panel.classList.remove('is-entering'));
      });
    }
    if (focus) panel.querySelector('h3').focus({ preventScroll: true });
  }

  function showStep(next, focus = true) {
    demo.classList.toggle('is-back', next < step);
    step = next;
    furthest = Math.max(furthest, next);
    success.hidden = true;
    form.hidden = false;
    document.querySelector('.step-nav').hidden = false;
    panels.forEach((panel, i) => { panel.hidden = i !== next; });
    steps.forEach((button, i) => {
      button.disabled = i > furthest;
      if (i === next) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary();
    enterPanel(panels[next], focus);
    announcement.textContent = `Étape ${next + 1} sur 3 : ${['le sujet', 'le matériel', 'le récapitulatif'][next]}.`;
  }

  function hasPurpose() {
    if (radios.some(radio => radio.checked)) return true;
    error.textContent = 'Choisissez le sujet de votre appel pour continuer.';
    radios[0].focus();
    return false;
  }

  form.querySelectorAll('[data-next]').forEach(button => {
    button.addEventListener('click', () => {
      if (!hasPurpose()) return;
      showStep(Number(button.dataset.next));
    });
  });
  form.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => showStep(Number(button.dataset.back)));
  });
  steps.forEach(button => {
    button.addEventListener('click', () => {
      const next = Number(button.dataset.step);
      if (next > 0 && !hasPurpose()) return;
      showStep(next);
    });
  });
  radios.forEach(radio => radio.addEventListener('change', () => {
    error.textContent = '';
    updateSummary();
  }));
  brand.addEventListener('input', updateSummary);
  model.addEventListener('input', updateSummary);

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step !== 2) {
      if (hasPurpose()) showStep(step + 1);
      return;
    }
    if (!hasPurpose()) return;
    updateSummary();
    form.hidden = true;
    document.querySelector('.step-nav').hidden = true;
    success.hidden = false;
    summary.after(success);
    steps.forEach(button => button.removeAttribute('aria-current'));
    enterPanel(success);
    announcement.textContent = 'Démonstration terminée. Rien n’a été envoyé et aucun rendez-vous n’a été réservé.';
  });
  document.querySelector('.restart').addEventListener('click', () => {
    form.reset();
    error.textContent = '';
    furthest = 0;
    showStep(0);
  });
  document.querySelectorAll('.choose-purpose').forEach(link => {
    link.addEventListener('click', () => {
      const radio = radios.find(item => item.value === link.dataset.purpose);
      radio.checked = true;
      error.textContent = '';
      showStep(0, false);
      announcement.textContent = `${purposeNames[radio.value]} sélectionné. Étape 1 sur 3.`;
      if (keyboard) panels[0].querySelector('h3').focus({ preventScroll: true });
    });
  });

  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -25px 0px' });
    reveals.forEach(element => observer.observe(element));
    const bar = document.querySelector('.mobile-bar');
    const tracked = new Map();
    const barObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => tracked.set(entry.target, entry.isIntersecting));
      const away = Array.from(tracked.values()).some(Boolean);
      bar.classList.toggle('is-away', away);
      bar.inert = away;
      if (away) bar.setAttribute('aria-hidden', 'true');
      else bar.removeAttribute('aria-hidden');
    }, { threshold: 0 });
    [document.querySelector('.hero-actions'), document.querySelector('#preparer'), document.querySelector('#pied-de-page')].forEach(element => barObserver.observe(element));
  } else {
    reveals.forEach(element => element.classList.add('is-visible'));
  }

  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
  window.setTimeout(() => root.classList.add('ready'), 1000);
})();
