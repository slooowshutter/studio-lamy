(() => {
  'use strict';

  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionReady = () => document.documentElement.classList.add('motion-ready');

  const menuButton = one('.menu-toggle');
  const navigation = one('#navigation');
  if (menuButton && navigation) {
    const closeMenu = (returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.querySelector('span').textContent = 'Navigation';
      navigation.classList.remove('is-open');
      if (returnFocus) menuButton.focus();
    };
    menuButton.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.querySelector('span').textContent = opening ? 'Fermer la navigation' : 'Navigation';
      navigation.classList.toggle('is-open', opening);
      if (opening) one('a', navigation)?.focus();
    });
    navigation.addEventListener('click', (event) => {
      const link = event.target.closest('a');
      if (!link) return;
      closeMenu();
      if (!link.hash) return;
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      const heading = target?.matches('h1, h2, h3') ? target : target?.querySelector('h1, h2, h3');
      if (!heading) return;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      window.setTimeout(() => heading.focus({ preventScroll: true }), 0);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
      if (event.matches) closeMenu();
    });
  }

  const revealItems = all('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const mobileActions = one('[data-actions]');
  if (mobileActions && 'IntersectionObserver' in window) {
    const visible = { hero: true, form: false, footer: false };
    const updateActions = () => {
      mobileActions.hidden = visible.hero || visible.form || visible.footer;
    };
    const observeForActions = (selector, key) => {
      const target = one(selector);
      if (!target) return;
      const observer = new IntersectionObserver(([entry]) => {
        visible[key] = entry.isIntersecting;
        updateActions();
      }, { threshold: 0.08 });
      observer.observe(target);
    };
    observeForActions('.hero-action', 'hero');
    observeForActions('.booking', 'form');
    observeForActions('.site-footer', 'footer');
  }

  const form = one('#formulaire-appel');
  const noScript = one('.no-script');
  if (!form) {
    motionReady();
    return;
  }
  form.hidden = false;
  if (noScript) noScript.hidden = true;

  const steps = all('.flow-step', form);
  const stepButtons = all('[data-aller]', form);
  const announcement = one('[data-annonce]', form);
  const successPanel = one('[data-succes]', form);
  const chosenProject = () => one('input[name="projet"]:checked', form)?.value || '';
  const state = { step: 1, furthest: 1, completed: false };

  const clearErrors = () => {
    all('[data-erreur], .form-error[id]', form).forEach((error) => { error.hidden = true; });
    all('[aria-invalid="true"]', form).forEach((field) => field.removeAttribute('aria-invalid'));
  };

  const showStep = (number, options = {}) => {
    if (number < 1 || number > 3 || number > state.furthest) return;
    state.step = number;
    state.completed = false;
    successPanel.hidden = true;
    clearErrors();
    steps.forEach((panel) => {
      const isCurrent = Number(panel.dataset.etape) === number;
      panel.hidden = !isCurrent;
      panel.classList.remove('is-entering', 'is-settled');
      if (isCurrent) panel.classList.add('is-entering');
    });
    stepButtons.forEach((button) => {
      const index = Number(button.dataset.aller);
      if (index === number) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = index > state.furthest;
    });
    const current = one(`.flow-step[data-etape="${number}"]`, form);
    const heading = one('h3', current);
    if (announcement) announcement.textContent = `Étape ${number} sur 3, ${['', 'projet', 'détails', 'coordonnées'][number]}.`;
    if (!options.silent && heading) heading.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      current?.classList.remove('is-entering');
      current?.classList.add('is-settled');
    });
    if (!options.silent && options.scroll !== false) {
      const bounds = form.getBoundingClientRect();
      if (bounds.top < 0 || bounds.top > window.innerHeight * 0.66) {
        form.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
  };

  const failStep = (number, message, focusTarget) => {
    const error = one(`[data-erreur="${number}"]`, form);
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    const target = focusTarget || one(`.flow-step[data-etape="${number}"] input:not(:disabled)`, form);
    target?.focus();
  };

  form.addEventListener('change', (event) => {
    if (event.target.name !== 'projet') return;
    one('[data-erreur="1"]', form).hidden = true;
    state.furthest = Math.max(state.furthest, 2);
    stepButtons.forEach((button) => { button.disabled = Number(button.dataset.aller) > state.furthest; });
    updateSummary();
  });

  form.addEventListener('click', (event) => {
    const advance = event.target.closest('[data-suite]');
    const previous = event.target.closest('[data-precedent]');
    const jump = event.target.closest('[data-aller]');
    const restart = event.target.closest('[data-recommencer]');

    if (advance) {
      if (state.step === 1 && !chosenProject()) {
        failStep(1, 'Choisissez le sujet à évoquer.');
        return;
      }
      if (state.step < 3) {
        state.furthest = Math.max(state.furthest, state.step + 1);
        showStep(state.step + 1);
      }
      return;
    }
    if (previous) {
      showStep(state.step - 1);
      return;
    }
    if (jump) {
      const destination = Number(jump.dataset.aller);
      if (!jump.disabled) showStep(destination);
      return;
    }
    if (restart) {
      form.reset();
      state.furthest = 1;
      state.completed = false;
      clearErrors();
      updateSummary();
      one('[data-titre-succes]', form).textContent = '';
      one('[data-recap]', form).textContent = '';
      showStep(1, { silent: true, scroll: false });
      if (announcement) announcement.textContent = 'Préparation recommencée.';
    }
  });

  const validFrenchPhone = (value) => /^(?:(?:\+|00)33|0)[1-9](?:\d{2}){4}$/.test(value.replace(/[\s.\-()]/g, ''));
  const nameInput = one('#nom', form);
  const phoneInput = one('#telephone', form);
  const setValidity = (field, errorId, invalid) => {
    const error = one(`#${errorId}`, form);
    if (error) error.hidden = !invalid;
    if (invalid) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    return !invalid;
  };

  nameInput.addEventListener('blur', () => {
    if (nameInput.value.trim()) setValidity(nameInput, 'erreur-nom', false);
  });
  phoneInput.addEventListener('blur', () => {
    if (phoneInput.value.trim()) setValidity(phoneInput, 'erreur-telephone', !validFrenchPhone(phoneInput.value));
  });

  const chosenDateText = (value) => {
    if (!value) return '';
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  };

  const updateSummary = () => {
    const project = one('[data-selection-project]', form);
    const date = one('[data-selection-date]', form);
    const context = one('[data-selection-context]', form);
    if (project) project.textContent = chosenProject() || 'À choisir';
    if (date) date.textContent = chosenDateText(one('#date-souhaitee', form).value) || 'Non précisée';
    if (context) context.textContent = one('#contexte', form).value.trim() || 'À ajouter si besoin';
  };
  one('#date-souhaitee', form).addEventListener('change', updateSummary);
  one('#contexte', form).addEventListener('blur', updateSummary);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step !== 3) return;
    const nameOk = setValidity(nameInput, 'erreur-nom', !nameInput.value.trim());
    const phoneOk = setValidity(phoneInput, 'erreur-telephone', !validFrenchPhone(phoneInput.value));
    if (!nameOk) { nameInput.focus(); return; }
    if (!phoneOk) { phoneInput.focus(); return; }

    const name = nameInput.value.trim();
    const project = chosenProject();
    const date = chosenDateText(one('#date-souhaitee', form).value);
    const context = one('#contexte', form).value.trim();
    const details = [project, date ? `Date souhaitée : ${date}` : '', context ? `Précision : ${context}` : ''].filter(Boolean).join(' · ');
    updateSummary();
    one('[data-titre-succes]', form).textContent = `Votre appel est préparé, ${name}.`;
    one('[data-recap]', form).textContent = details;
    steps.forEach((panel) => { panel.hidden = true; });
    successPanel.hidden = false;
    successPanel.focus({ preventScroll: true });
    stepButtons.forEach((button) => {
      button.disabled = true;
      button.removeAttribute('aria-current');
    });
    state.completed = true;
    if (announcement) announcement.textContent = 'Préparation terminée. Rien n’a été envoyé et aucun rendez-vous n’est réservé.';
    successPanel.classList.add('is-settled');
    if (successPanel.getBoundingClientRect().top > window.innerHeight * 0.7) {
      successPanel.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    }
  });

  showStep(1, { silent: true, scroll: false });
  updateSummary();
  motionReady();
})();
