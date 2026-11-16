(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...document.querySelectorAll('.panel')];
  const triggers = panels.map(panel => panel.querySelector('.panel__trigger'));
  const form = document.getElementById('preparation');
  const stages = [...form.querySelectorAll('[data-stage]')];
  const stepButtons = [...document.querySelectorAll('[data-step]')];
  const nameField = document.getElementById('prenom');
  const phoneField = document.getElementById('telephone');
  const wishField = document.getElementById('souhait');
  const live = document.getElementById('annonce-parcours');
  const serviceNames = { mariage: 'Coiffure de mariage', ceremonie: 'Coiffure de cérémonie' };
  let stage = 0;
  let reached = 0;
  let navigation = 0;

  document.addEventListener('keydown', event => {
    if (['Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) root.classList.add('keyboard');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), { passive: true });

  function setPanel(panel, shouldFocus = false) {
    panels.forEach(item => {
      const open = item === panel;
      const body = item.querySelector('.panel__body');
      const trigger = item.querySelector('.panel__trigger');
      if (!open && body.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
      body.inert = !open;
      body.setAttribute('aria-hidden', String(!open));
    });
    if (shouldFocus) panel.querySelector('.panel__trigger').focus({ preventScroll: true });
  }

  function settleAt(panel, focus = true) {
    const ticket = ++navigation;
    const delay = reduce.matches || root.classList.contains('keyboard') ? 0 : 310;
    window.setTimeout(() => {
      if (ticket !== navigation) return;
      const top = panel.getBoundingClientRect().top;
      if (top < 12 || top > window.innerHeight - 100) panel.scrollIntoView({ block: 'start', behavior: 'auto' });
      if (focus) panel.querySelector('.panel__trigger').focus({ preventScroll: true });
    }, delay);
  }

  triggers.forEach((trigger, index) => {
    trigger.addEventListener('click', () => {
      if (panels[index].classList.contains('is-open')) return;
      setPanel(panels[index]);
      settleAt(panels[index], false);
    });
    trigger.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % triggers.length;
      if (event.key === 'ArrowUp') next = (index + triggers.length - 1) % triggers.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = triggers.length - 1;
      if (next !== undefined) { event.preventDefault(); triggers[next].focus(); }
    });
  });

  function fromHash() {
    const panel = panels.find(item => `#${item.id}` === window.location.hash);
    if (panel) { setPanel(panel); settleAt(panel); }
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', event => {
      const panel = panels.find(item => `#${item.id}` === link.getAttribute('href'));
      if (!panel) return;
      event.preventDefault();
      if (link.dataset.service) {
        const radio = form.querySelector(`input[value="${link.dataset.service}"]`);
        radio.checked = true;
        showStage(0, false);
        updateSummary();
      }
      setPanel(panel);
      if (window.location.hash !== `#${panel.id}`) history.pushState(null, '', `#${panel.id}`);
      settleAt(panel);
    });
  });
  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', fromHash);

  function selectedService() { return form.querySelector('input[name="prestation"]:checked')?.value || ''; }
  function writeError(id, message, input) {
    document.getElementById(id).textContent = message;
    if (input) input.setAttribute('aria-invalid', String(Boolean(message)));
  }
  function validateService() {
    const valid = Boolean(selectedService());
    writeError('erreur-prestation', valid ? '' : 'Choisissez une prestation pour continuer.');
    if (!valid) form.querySelector('input[name="prestation"]').focus();
    return valid;
  }
  function validateDetails() {
    const nameValid = nameField.value.trim().length > 0;
    const phone = phoneField.value.replace(/[\s().-]/g, '');
    const phoneValid = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(phone);
    writeError('erreur-prenom', nameValid ? '' : 'Indiquez un prénom.', nameField);
    writeError('erreur-telephone', phoneValid ? '' : 'Indiquez un numéro français valide, avec 0 ou +33.', phoneField);
    if (!nameValid) nameField.focus(); else if (!phoneValid) phoneField.focus();
    return nameValid && phoneValid;
  }
  function updateSummary() {
    const service = serviceNames[selectedService()] || '';
    const name = nameField.value.trim();
    document.getElementById('selection-service').textContent = service || 'Une coiffure, une occasion.';
    document.getElementById('selection-prenom').textContent = name || 'Vous';
    const values = { service: service || 'À choisir', name: name || 'À préciser', phone: phoneField.value.trim() || 'À préciser', wish: wishField.value.trim() || 'Non renseigné' };
    document.querySelectorAll('[data-recap]').forEach(item => { item.textContent = values[item.dataset.recap]; });
  }

  function showStage(next, focus = true) {
    stage = next;
    reached = Math.max(reached, Math.min(next, 2));
    updateSummary();
    stages.forEach((item, index) => {
      item.hidden = index !== next;
      item.classList.remove('is-arriving');
    });
    stepButtons.forEach((button, index) => {
      button.disabled = index > reached || next === 3;
      if (index === next) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    const current = stages[next];
    if (!reduce.matches && !root.classList.contains('keyboard')) {
      current.classList.add('is-arriving');
      requestAnimationFrame(() => requestAnimationFrame(() => current.classList.remove('is-arriving')));
    }
    if (focus) {
      const heading = current.querySelector('.step-heading');
      heading.focus({ preventScroll: true });
      const bounds = heading.getBoundingClientRect();
      const mobileBar = document.querySelector('.mobile-bar');
      const safeBottom = window.innerHeight - mobileBar.getBoundingClientRect().height - 16;
      if (bounds.top < 16 || bounds.bottom > safeBottom) heading.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    live.textContent = ['Étape 1 sur 3 : choisissez une prestation.', 'Étape 2 sur 3 : précisez votre souhait.', 'Étape 3 sur 3 : vérifiez votre préparation.', 'Simulation terminée. Aucun rendez-vous réservé et rien envoyé.'][next];
  }
  function goTo(next) {
    if (next > 0 && !selectedService()) {
      showStage(0, false);
      validateService();
      return;
    }
    if (next > 1) {
      showStage(1, false);
      if (!validateDetails()) return;
    }
    showStage(next);
  }

  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.next))));
  document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStage(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.step))));
  form.addEventListener('change', event => {
    if (event.target.name === 'prestation') writeError('erreur-prestation', '');
    updateSummary();
  });
  form.addEventListener('input', event => {
    if (event.target === nameField) writeError('erreur-prenom', '', nameField);
    if (event.target === phoneField) writeError('erreur-telephone', '', phoneField);
    updateSummary();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (stage < 2) { goTo(stage + 1); return; }
    if (!validateService() || !validateDetails()) return;
    showStage(3);
  });
  document.getElementById('recommencer').addEventListener('click', () => {
    form.reset();
    reached = 0;
    ['erreur-prestation', 'erreur-prenom', 'erreur-telephone'].forEach(id => writeError(id, ''));
    nameField.removeAttribute('aria-invalid');
    phoneField.removeAttribute('aria-invalid');
    showStage(0);
  });

  setPanel(panels.find(panel => `#${panel.id}` === window.location.hash) || panels[0]);
  document.getElementById('parcours').hidden = false;
  root.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));

  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && !reduce.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.closest('.panel').classList.contains('is-open')) {
          entry.target.classList.add('is-seen');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .25 });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-seen'));
  if (window.location.hash) fromHash();
})();
