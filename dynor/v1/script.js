/* DYNOR — la préparation d’un échange. Aucune donnée n’est envoyée ou stockée. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  // Le contenu ne reste jamais masqué si l’initialisation est interrompue.
  const safety = window.setTimeout(() => {
    root.classList.add('entered');
    $$('.is-pending').forEach(item => item.classList.remove('is-pending'));
  }, 1800);

  window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.add('entered')));
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('is-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px 28px 0px' });
    $$('[data-reveal]').forEach(item => {
      item.classList.add('is-pending');
      if (item.dataset.reveal === 'row') {
        const index = $$('.menu-row').indexOf(item);
        item.style.transitionDelay = `${index * 60}ms`;
      }
      observer.observe(item);
    });
    window.clearTimeout(safety);
  }
  document.addEventListener('keydown', () => root.classList.add('keyboard'), { passive: true });
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), { passive: true });
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      root.classList.add('entered');
      $$('.is-pending').forEach(item => item.classList.remove('is-pending'));
    }
  });

  const app = $('.booking-app');
  const form = $('#preparation');
  const panels = $$('[data-panel]');
  const stepButtons = $$('[data-go]', $('.steps'));
  const names = { coloration: 'Coloration', meches: 'Mèches', balayage: 'Balayage', coupe: 'Coupe sur cheveux longs', brushing: 'Brushing' };
  const firstName = $('#prenom');
  const phone = $('#telephone');
  const project = $('#projet');
  const status = $('#parcours-status');
  let step = 0;
  let completed = 0;
  let frame = 0;
  let finished = false;

  function focusVisible(element) {
    element.focus({ preventScroll: true });
    const bounds = element.getBoundingClientRect();
    const bottomInset = window.matchMedia('(max-width: 720px)').matches ? 100 : 24;
    if (bounds.top < 24 || bounds.bottom > window.innerHeight - bottomInset) {
      element.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }
  function selectedService() { return $('input[name="prestation"]:checked')?.value || ''; }
  function updateSummary() {
    const service = selectedService();
    $('[data-selection]').textContent = service ? names[service] : 'Un sujet à choisir.';
    $('[data-recap="service"]').textContent = service ? names[service] : 'À choisir';
    $('[data-recap="projet"]').textContent = project.value.trim() || 'Sans note';
    $('[data-recap="prenom"]').textContent = firstName.value.trim();
    $('[data-recap="telephone"]').textContent = phone.value.trim();
  }
  function validateService() {
    const valid = !!selectedService();
    $('#prestation-error').textContent = valid ? '' : 'Choisissez un sujet pour continuer.';
    $$('input[name="prestation"]').forEach(input => {
      input.setAttribute('aria-describedby', 'prestation-error');
      input.setAttribute('aria-invalid', String(!valid));
    });
    if (!valid) {
      if (step !== 0) showStep(0, false);
      focusVisible($('input[name="prestation"]'));
    }
    return valid;
  }
  function validateField(input) {
    const value = input.value.trim();
    let message = '';
    if (input === firstName && !value) message = 'Indiquez votre prénom pour continuer.';
    if (input === phone && !/^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(value.replace(/[\s.()\-]/g, ''))) message = 'Indiquez un numéro français à dix chiffres, ou commençant par +33.';
    $(`#${input.id}-error`).textContent = message;
    input.setAttribute('aria-invalid', String(!!message));
    return !message;
  }
  function validateDetails() {
    const firstNameValid = validateField(firstName);
    const phoneValid = validateField(phone);
    if (!firstNameValid || !phoneValid) {
      if (step !== 1) showStep(1, false);
      focusVisible(firstNameValid ? phone : firstName);
    }
    return firstNameValid && phoneValid;
  }
  function showStep(next, focus = true) {
    const previous = step;
    step = next;
    window.cancelAnimationFrame(frame);
    panels.forEach(panel => {
      panel.hidden = Number(panel.dataset.panel) !== step;
      panel.classList.remove('is-entering', 'is-backward');
    });
    const target = panels[next];
    if (!reduced.matches && !root.classList.contains('keyboard')) {
      target.classList.add('is-entering');
      if (next < previous) target.classList.add('is-backward');
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => target.classList.remove('is-entering', 'is-backward'));
      });
    }
    stepButtons.forEach((button, index) => {
      button.disabled = finished || index > completed;
      if (index === next) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    updateSummary();
    status.textContent = next === 3 ? 'Fin de la simulation. Rien n’a été envoyé. Aucun rendez-vous n’est pris.' : `Étape ${next + 1} sur 3\u00a0: ${['le sujet', 'votre note', 'relire'][next]}.`;
    if (focus) focusVisible($('h3', target));
  }
  function goTo(next) {
    if (finished || next > completed) return;
    if (next > 0 && !validateService()) return;
    if (next > 1 && !validateDetails()) return;
    showStep(next);
  }
  $$('[data-go]').forEach(button => button.addEventListener('click', () => goTo(Number(button.dataset.go))));
  $$('[data-next]').forEach(button => button.addEventListener('click', () => {
    const next = Number(button.dataset.next);
    if (next === 1 && !validateService()) return;
    if (next === 2 && (!validateService() || !validateDetails())) return;
    completed = Math.max(completed, next);
    showStep(next);
  }));
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => {
    validateService();
    updateSummary();
  }));
  [firstName, phone].forEach(input => {
    input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid') === 'true') validateField(input); });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
      updateSummary();
    });
  });
  project.addEventListener('input', updateSummary);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step === 0) { $('[data-next="1"]').click(); return; }
    if (step === 1) { $('[data-next="2"]').click(); return; }
    if (finished || !validateService() || !validateDetails()) return;
    finished = true;
    $('[data-success-recap]').textContent = `Votre sujet\u00a0: ${names[selectedService()]}. Gardez votre point de départ et votre envie en tête pour l’appel.`;
    showStep(3);
  });
  $('#recommencer').addEventListener('click', () => {
    form.reset();
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    $$('.field-error', form).forEach(error => { error.textContent = ''; });
    finished = false;
    completed = 0;
    showStep(0);
  });
  $$('[data-service]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const input = $(`input[name="prestation"][value="${button.dataset.service}"]`);
    input.checked = true;
    finished = false;
    completed = Math.max(completed, 1);
    validateService();
    showStep(0, false);
    $('h3', panels[0]).scrollIntoView({ behavior: reduced.matches || root.classList.contains('keyboard') ? 'instant' : 'smooth', block: 'start' });
    $('h3', panels[0]).focus({ preventScroll: true });
  }));
  showStep(0, false);
  app.hidden = false;
})();
