(() => {
  const documentRoot = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panneaux = [...document.querySelectorAll('[data-panneau]')];
  const minuteries = new Map();

  const definirEtatPanneau = (panneau, ouvert) => {
    panneau.querySelector('summary').setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  };

  const fermerPanneau = (panneau, garderTransition = false) => {
    window.clearTimeout(minuteries.get(panneau));
    panneau.classList.remove('is-ouvert');
    definirEtatPanneau(panneau, false);
    if (garderTransition && !mouvementReduit) {
      minuteries.set(panneau, window.setTimeout(() => {
        panneau.open = false;
      }, 230));
    } else {
      panneau.open = false;
    }
  };

  const ouvrirPanneau = (panneau) => {
    if (!panneau) return;
    if (panneau.open && panneau.classList.contains('is-ouvert')) return;
    window.clearTimeout(minuteries.get(panneau));
    panneaux.forEach((autre) => {
      if (autre !== panneau && autre.open) fermerPanneau(autre);
    });
    panneau.open = true;
    definirEtatPanneau(panneau, false);
    window.requestAnimationFrame(() => {
      panneau.classList.add('is-ouvert');
      definirEtatPanneau(panneau, true);
    });
  };

  panneaux.forEach((panneau) => {
    const resume = panneau.querySelector('summary');
    definirEtatPanneau(panneau, panneau.open);
    if (panneau.open) panneau.classList.add('is-ouvert');
    resume.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      if (panneau.open && panneau.classList.contains('is-ouvert')) {
        fermerPanneau(panneau, true);
      } else {
        ouvrirPanneau(panneau);
      }
    });
  });

  const defilerVers = (element) => {
    if (!element) return;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'start' });
    }, 40);
  };

  document.querySelectorAll('a[href^="#"]').forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      const cible = document.getElementById(decodeURIComponent(lien.hash.slice(1)));
      const panneau = cible && cible.closest('[data-panneau]');
      if (!panneau) return;
      evenement.preventDefault();
      history.pushState(null, '', lien.hash);
      ouvrirPanneau(panneau);
      defilerVers(cible);
    });
  });

  const formulaire = document.getElementById('formulaire-simulation');
  const etapePrestation = document.getElementById('etape-prestation');
  const etapeMoment = document.getElementById('etape-moment');
  const etapeFin = document.getElementById('etape-fin');
  const annonceEtape = document.getElementById('etat-etape');
  const resumePrestation = document.getElementById('resume-prestation');
  const resumeMoment = document.getElementById('resume-moment');
  const annonceChoix = document.getElementById('annonce-choix');
  const continuer = document.getElementById('continuer-jour');
  const valider = document.getElementById('valider-simulation');
  const annonceFin = document.getElementById('annonce-simulation');
  const recapFin = document.getElementById('recap-fin');
  let prestationChoisie = '';
  let momentChoisi = '';
  let transitionEnCours = false;

  const mettreAJourResume = (annoncer = false) => {
    resumePrestation.textContent = prestationChoisie || 'Choisissez une prestation.';
    resumeMoment.textContent = momentChoisi ? `${momentChoisi} · moment préféré` : 'Aucun moment choisi.';
    if (annoncer && annonceChoix) {
      const morceaux = [];
      if (prestationChoisie) morceaux.push(`Prestation choisie : ${prestationChoisie}.`);
      if (momentChoisi) morceaux.push(`Moment préféré : ${momentChoisi}.`);
      annonceChoix.textContent = morceaux.join(' ');
    }
  };

  const afficherEtape = (etapeActuelle, prochaineEtape, texteEtape, identifiantTitre) => {
    if (transitionEnCours) return;
    transitionEnCours = true;
    const duree = mouvementReduit ? 0 : 220;
    etapeActuelle.classList.add('est-sortante');
    window.setTimeout(() => {
      etapeActuelle.hidden = true;
      etapeActuelle.classList.remove('est-sortante');
      prochaineEtape.hidden = false;
      prochaineEtape.classList.add('est-entrante');
      annonceEtape.textContent = texteEtape;
      mettreAJourResume();
      const titre = document.getElementById(identifiantTitre);
      if (titre) titre.focus({ preventScroll: true });
      window.requestAnimationFrame(() => prochaineEtape.classList.remove('est-entrante'));
      transitionEnCours = false;
    }, duree);
  };

  if (formulaire) {
    formulaire.addEventListener('submit', (evenement) => evenement.preventDefault());

    formulaire.querySelectorAll('input[name="prestation"]').forEach((champ) => {
      champ.addEventListener('change', () => {
        prestationChoisie = champ.value;
        continuer.disabled = false;
        mettreAJourResume(true);
      });
    });

    formulaire.querySelectorAll('input[name="moment"]').forEach((champ) => {
      champ.addEventListener('change', () => {
        momentChoisi = champ.value;
        valider.disabled = false;
        mettreAJourResume(true);
      });
    });

    continuer.addEventListener('click', () => {
      if (!prestationChoisie) return;
      afficherEtape(etapePrestation, etapeMoment, 'Étape 2 sur 2 · Votre moment préféré', 'titre-etape-moment');
    });

    document.getElementById('retour-prestation').addEventListener('click', () => {
      afficherEtape(etapeMoment, etapePrestation, 'Étape 1 sur 2 · Votre prestation', 'titre-etape-prestation');
    });

    valider.addEventListener('click', () => {
      if (!prestationChoisie || !momentChoisi) return;
      recapFin.textContent = `${prestationChoisie} · ${momentChoisi} comme moment préféré.`;
      annonceFin.textContent = 'La simulation est prête. Rien n’a été envoyé.';
      afficherEtape(etapeMoment, etapeFin, 'Simulation terminée · rien n’a été envoyé', 'titre-etape-fin');
    });

    document.getElementById('modifier-simulation').addEventListener('click', () => {
      annonceFin.textContent = '';
      afficherEtape(etapeFin, etapePrestation, 'Étape 1 sur 2 · Votre prestation', 'titre-etape-prestation');
    });
  }

  document.querySelectorAll('[data-choisir]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const valeur = bouton.dataset.choisir;
      const champ = [...document.querySelectorAll('input[name="prestation"]')].find((option) => option.value === valeur);
      if (!champ) return;
      ouvrirPanneau(document.getElementById('rendezvous'));
      champ.checked = true;
      champ.dispatchEvent(new Event('change', { bubbles: true }));
      defilerVers(document.getElementById('rendezvous'));
    });
  });

  const elementsReveles = [...document.querySelectorAll('.liste-prestations li, .a-completer li, .adresse-bloc')];
  elementsReveles.forEach((element) => element.classList.add('revelation'));
  if (mouvementReduit || !('IntersectionObserver' in window)) {
    elementsReveles.forEach((element) => element.setAttribute('data-visible', ''));
  } else {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.setAttribute('data-visible', '');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    elementsReveles.forEach((element) => observateur.observe(element));
  }

  if (mouvementReduit) documentRoot.classList.add('est-chargee');
  else window.requestAnimationFrame(() => documentRoot.classList.add('est-chargee'));
})();
