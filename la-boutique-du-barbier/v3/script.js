(() => {
  const racine = document.documentElement;
  const corps = document.body;
  racine.classList.add('js');

  const boutonNavigation = document.getElementById('bouton-navigation');
  const navigation = document.getElementById('navigation-principale');

  function fermerNavigation(rendreLeFocus = false) {
    if (!boutonNavigation || !navigation) return;
    boutonNavigation.setAttribute('aria-expanded', 'false');
    boutonNavigation.setAttribute('aria-label', 'Ouvrir les rubriques');
    navigation.classList.remove('est-ouverte');
    if (rendreLeFocus) boutonNavigation.focus();
  }

  if (boutonNavigation && navigation) {
    boutonNavigation.addEventListener('click', () => {
      const ouvert = boutonNavigation.getAttribute('aria-expanded') === 'true';
      boutonNavigation.setAttribute('aria-expanded', String(!ouvert));
      boutonNavigation.setAttribute('aria-label', ouvert ? 'Ouvrir les rubriques' : 'Fermer les rubriques');
      navigation.classList.toggle('est-ouverte', !ouvert);
      if (!ouvert) navigation.querySelector('a')?.focus();
    });

    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermerNavigation();
    });

    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonNavigation.getAttribute('aria-expanded') === 'true') {
        fermerNavigation(true);
      }
    });
  }

  window.requestAnimationFrame(() => {
    corps.classList.add('pret');
  });

  const elementsAReveler = [...document.querySelectorAll('[data-apparition]')];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (mouvementReduit || !('IntersectionObserver' in window)) {
    elementsAReveler.forEach((element) => element.classList.add('est-visible'));
  } else {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    elementsAReveler.forEach((element) => observateurRevelation.observe(element));
  }

  const etapeSujet = document.getElementById('etape-sujet');
  const etapeTrame = document.getElementById('etape-trame');
  const titreSujet = document.getElementById('titre-etape-sujet');
  const titreTrame = document.getElementById('titre-etape-trame');
  const boutonSuite = document.getElementById('bouton-suite');
  const boutonRetour = document.getElementById('bouton-retour');
  const sujetChoisi = document.getElementById('sujet-choisi');
  const messageErreur = document.getElementById('erreur-sujet');

  function changerEtape(etapeActuelle, etapeSuivante, titreSuivant) {
    etapeActuelle.classList.add('is-sortie');
    etapeSuivante.hidden = false;
    etapeSuivante.removeAttribute('inert');
    etapeSuivante.setAttribute('aria-hidden', 'false');
    etapeSuivante.classList.add('is-entree');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => etapeSuivante.classList.remove('is-entree'));
    });
    etapeActuelle.setAttribute('aria-hidden', 'true');
    etapeActuelle.setAttribute('inert', '');
    titreSuivant.focus({ preventScroll: true });
    window.setTimeout(() => {
      etapeActuelle.hidden = true;
      etapeActuelle.classList.remove('is-sortie');
    }, mouvementReduit ? 0 : 240);
  }

  if (boutonSuite && boutonRetour && etapeSujet && etapeTrame && titreSujet && titreTrame && sujetChoisi && messageErreur) {
    boutonSuite.addEventListener('click', () => {
      const choix = document.querySelector('input[name="sujet"]:checked');
      if (!choix) {
        messageErreur.hidden = false;
        document.querySelector('.choix-sujet input')?.focus();
        return;
      }
      messageErreur.hidden = true;
      sujetChoisi.textContent = choix.value;
      changerEtape(etapeSujet, etapeTrame, titreTrame);
    });

    document.querySelectorAll('input[name="sujet"]').forEach((choix) => {
      choix.addEventListener('change', () => {
        messageErreur.hidden = true;
      });
    });

    boutonRetour.addEventListener('click', () => {
      changerEtape(etapeTrame, etapeSujet, titreSujet);
    });
  }

  const barreMobile = document.getElementById('barre-mobile');
  const sectionAccueil = document.getElementById('accueil');
  const sectionAppel = document.getElementById('appel');
  const piedSite = document.querySelector('.pied-site');

  if (barreMobile && sectionAccueil && sectionAppel && piedSite) {
    if (!('IntersectionObserver' in window)) {
      barreMobile.classList.add('est-visible');
    } else {
      const visibles = { accueil: true, appel: false, pied: false };
      const actualiserBarre = () => {
        const afficher = !visibles.accueil && !visibles.appel && !visibles.pied;
        barreMobile.classList.toggle('est-visible', afficher);
      };
      const observateurBarre = new IntersectionObserver((entrees) => {
        entrees.forEach((entree) => {
          if (entree.target === sectionAccueil) visibles.accueil = entree.isIntersecting;
          if (entree.target === sectionAppel) visibles.appel = entree.isIntersecting;
          if (entree.target === piedSite) visibles.pied = entree.isIntersecting;
        });
        actualiserBarre();
      }, { threshold: 0.08 });

      observateurBarre.observe(sectionAccueil);
      observateurBarre.observe(sectionAppel);
      observateurBarre.observe(piedSite);
    }
  }
})();
