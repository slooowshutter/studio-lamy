(() => {
  const racine = document.documentElement;
  const menuBouton = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('#navigation');

  if (menuBouton && navigation) {
    const fermerMenu = (rendreFocus = false) => {
      menuBouton.setAttribute('aria-expanded', 'false');
      menuBouton.setAttribute('aria-label', 'Ouvrir les rubriques');
      navigation.classList.remove('is-open');
      if (rendreFocus) menuBouton.focus();
    };

    menuBouton.addEventListener('click', () => {
      const ouvert = menuBouton.getAttribute('aria-expanded') === 'true';
      menuBouton.setAttribute('aria-expanded', String(!ouvert));
      menuBouton.setAttribute('aria-label', ouvert ? 'Ouvrir les rubriques' : 'Fermer les rubriques');
      navigation.classList.toggle('is-open', !ouvert);
      if (!ouvert) navigation.querySelector('a')?.focus();
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) fermerMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') {
        fermerMenu(true);
      }
    });

    racine.classList.add('menu-ready');
  }

  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elementsReveles = [...document.querySelectorAll('[data-reveal]')];

  if (mouvementReduit || !('IntersectionObserver' in window)) {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  } else {
    const observateur = new IntersectionObserver((entrees, observer) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observer.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });

    elementsReveles.forEach((element) => observateur.observe(element));
  }

  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-entered')));
  }

  const panneauRendezVous = document.querySelector('.booking-stage');
  if (!panneauRendezVous) return;

  const panneaux = [...panneauRendezVous.querySelectorAll('.booking-panel')];
  const annonce = panneauRendezVous.querySelector('.booking-announcement');
  const progression = panneauRendezVous.querySelector('#booking-progress');
  const messagePrestation = panneauRendezVous.querySelector('#message-prestation');
  const recapitulePrestation = panneauRendezVous.querySelector('#recap-prestation');
  const confirmationPrestation = panneauRendezVous.querySelector('#succes-prestation');
  let etapeCourante = 0;
  let temporisateur = 0;
  let numeroTransition = 0;

  const prestationChoisie = () => panneauRendezVous.querySelector('input[name="prestation"]:checked');

  const afficherEtape = (nouvelleEtape) => {
    if (nouvelleEtape === etapeCourante || !panneaux[nouvelleEtape]) return;
    window.clearTimeout(temporisateur);
    const idTransition = ++numeroTransition;
    const ancienPanneau = panneaux[etapeCourante];
    const nouveauPanneau = panneaux[nouvelleEtape];
    ancienPanneau.classList.remove('is-active');
    ancienPanneau.classList.add('is-leaving');

    temporisateur = window.setTimeout(() => {
      if (idTransition !== numeroTransition) return;
      ancienPanneau.hidden = true;
      ancienPanneau.classList.remove('is-leaving');
      nouveauPanneau.hidden = false;
      nouveauPanneau.classList.add('is-entering');
      progression.textContent = `Étape ${nouvelleEtape + 1} sur ${panneaux.length}`;
      annonce.textContent = `Étape ${nouvelleEtape + 1} sur ${panneaux.length}.`;
      etapeCourante = nouvelleEtape;

      requestAnimationFrame(() => {
        nouveauPanneau.classList.remove('is-entering');
        nouveauPanneau.classList.add('is-active');
        nouveauPanneau.querySelector('h3')?.focus();
      });
    }, mouvementReduit ? 0 : 180);
  };

  panneauRendezVous.addEventListener('change', (event) => {
    if (event.target.matches('input[name="prestation"]')) {
      messagePrestation.textContent = '';
      panneauRendezVous.querySelectorAll('input[name="prestation"]').forEach((radio) => radio.removeAttribute('aria-invalid'));
      recapitulePrestation.textContent = event.target.value;
      confirmationPrestation.textContent = event.target.value;
    }
  });

  panneauRendezVous.addEventListener('click', (event) => {
    const bouton = event.target.closest('[data-action]');
    if (!bouton) return;
    const action = bouton.dataset.action;

    if (action === 'continuer') {
      const selection = prestationChoisie();
      if (!selection) {
        messagePrestation.textContent = 'Choisissez une prestation pour continuer.';
        panneauRendezVous.querySelectorAll('input[name="prestation"]').forEach((radio) => radio.setAttribute('aria-invalid', 'true'));
        panneauRendezVous.querySelector('input[name="prestation"]')?.focus();
        return;
      }
      recapitulePrestation.textContent = selection.value;
      afficherEtape(1);
    }

    if (action === 'retour') afficherEtape(Math.max(0, etapeCourante - 1));
    if (action === 'confirmer') afficherEtape(2);
    if (action === 'modifier') afficherEtape(0);
  });
})();
