document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const preferenceMouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));

  const elementsReveles = $$('[data-reveal]');
  const dessins = $$('[data-dessin], [data-rue]');

  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    elementsReveles.forEach((element) => observateurRevelation.observe(element));

    const observateurDessin = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-in');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.16 });

    dessins.forEach((element) => observateurDessin.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
    dessins.forEach((element) => element.classList.add('is-in'));
  }

  const barreMobile = $('[data-barre]');
  const hero = $('.hero');
  const reservation = $('#rendez-vous');
  const pied = $('#pied');

  if (barreMobile && hero && reservation && pied && 'IntersectionObserver' in window) {
    const visibilite = { hero: true, reservation: false, pied: false };
    const mettreAJourBarre = () => {
      barreMobile.classList.toggle('is-visible', !visibilite.hero && !visibilite.reservation && !visibilite.pied);
    };
    const observerBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        const role = entree.target === hero ? 'hero' : entree.target === reservation ? 'reservation' : 'pied';
        visibilite[role] = entree.isIntersecting;
      });
      mettreAJourBarre();
    }, { threshold: 0.01 });
    [hero, reservation, pied].forEach((element) => observerBarre.observe(element));
  }

  const formulaire = $('#formulaire');
  if (!formulaire) return;

  const panneaux = $$('[data-panneau]', formulaire);
  const boutonsEtapes = $$('[data-aller]', formulaire);
  const annonceEtape = $('#annonce-etape');
  const champJour = $('#jour-souhaite');
  const champPrenom = $('#prenom');
  const champTelephone = $('#telephone');
  const confirmation = $('#confirmation');
  const ticketPrestation = $('[data-ticket-prestation]');
  const ticketJour = $('[data-ticket-jour]');
  const recapPrestation = $('[data-recap-prestation]');
  const recapJour = $('[data-recap-jour]');
  const recapPrenom = $('[data-recap-prenom]');
  const delaiEtape = preferenceMouvementReduit.matches ? 0 : 230;
  const nomsEtapes = ['prestation', 'jour souhaité', 'coordonnées', 'récapitulatif'];
  const choixPrestation = () => $('input[name="prestation"]:checked', formulaire)?.value || '';
  const valeurJour = () => champJour.value || '';
  const etat = { etape: 1, maximum: 1, prestation: '', jour: '', transition: false };

  if (champJour) {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
    const jour = String(maintenant.getDate()).padStart(2, '0');
    champJour.min = `${annee}-${mois}-${jour}`;
  }

  const afficherErreur = (identifiant, element, visible) => {
    const erreur = document.getElementById(identifiant);
    if (erreur) erreur.hidden = !visible;
    if (element) {
      if (visible) element.setAttribute('aria-invalid', 'true');
      else element.removeAttribute('aria-invalid');
    }
  };

  const jourEnFrancais = (valeur) => {
    if (!valeur) return 'À confirmer';
    const date = new Date(`${valeur}T12:00:00`);
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  };

  const mettreAJourRecapitulatif = () => {
    const prestation = choixPrestation() || 'À choisir';
    const jourLisible = jourEnFrancais(valeurJour());
    if (ticketPrestation) ticketPrestation.textContent = prestation;
    if (ticketJour) ticketJour.textContent = jourLisible;
    if (recapPrestation) recapPrestation.textContent = prestation;
    if (recapJour) recapJour.textContent = jourLisible;
    if (recapPrenom) recapPrenom.textContent = champPrenom.value.trim() || 'À renseigner';
  };

  const mettreAJourProgression = () => {
    boutonsEtapes.forEach((bouton) => {
      const numero = Number(bouton.dataset.aller);
      if (numero === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      bouton.disabled = numero > etat.maximum || etat.etape === 5;
    });
    if (annonceEtape) {
      annonceEtape.textContent = etat.etape === 5
        ? 'Simulation terminée. Rien n’a été envoyé.'
        : `Étape ${etat.etape} sur 4 — ${nomsEtapes[etat.etape - 1]}.`;
    }
  };

  const montrerEtape = (numero, options = {}) => {
    if (etat.transition) return;
    const suivante = panneaux.find((panneau) => Number(panneau.dataset.panneau) === numero);
    if (!suivante) return;
    const actuelle = panneaux.find((panneau) => !panneau.hidden);
    if (actuelle === suivante) {
      if (options.focus) $(`h3`, suivante)?.focus();
      return;
    }

    etat.etape = numero;
    etat.transition = true;
    etat.maximum = Math.max(etat.maximum, numero);
    mettreAJourProgression();
    mettreAJourRecapitulatif();

    const entrer = () => {
      if (actuelle) actuelle.hidden = true;
      suivante.hidden = false;
      suivante.classList.add('is-entrant');
      requestAnimationFrame(() => {
        suivante.classList.remove('is-entrant');
        if (options.focus) $(`h3`, suivante)?.focus();
        etat.transition = false;
      });
    };

    if (actuelle && delaiEtape) {
      actuelle.classList.add('is-sortant');
      window.setTimeout(() => {
        actuelle.classList.remove('is-sortant');
        entrer();
      }, delaiEtape);
    } else {
      entrer();
    }
  };

  const validerEtape = (numero) => {
    if (numero === 1) {
      const choix = choixPrestation();
      afficherErreur('erreur-prestation', $('.choix', formulaire), !choix);
      if (!choix) {
        $('input[name="prestation"]', formulaire)?.focus();
        return false;
      }
      etat.prestation = choix;
      return true;
    }

    if (numero === 2) {
      const valeur = valeurJour();
      const jourMinimum = champJour.min;
      const invalide = !valeur || valeur < jourMinimum;
      afficherErreur('erreur-jour', champJour, invalide);
      if (invalide) {
        champJour.focus();
        return false;
      }
      etat.jour = valeur;
      return true;
    }

    if (numero === 3) {
      const prenomValide = Boolean(champPrenom.value.trim());
      const telephoneNettoye = champTelephone.value.replace(/[\s().-]/g, '');
      const telephoneValide = /^(?:(?:\+|00)33|0)[1-9]\d{8}$/.test(telephoneNettoye);
      afficherErreur('erreur-prenom', champPrenom, !prenomValide);
      afficherErreur('erreur-telephone', champTelephone, !telephoneValide);
      if (!prenomValide) {
        champPrenom.focus();
        return false;
      }
      if (!telephoneValide) {
        champTelephone.focus();
        return false;
      }
      return true;
    }
    return true;
  };

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) {
      etat.prestation = choixPrestation();
      afficherErreur('erreur-prestation', $('.choix', formulaire), false);
      mettreAJourRecapitulatif();
    }
    if (evenement.target === champJour) {
      etat.jour = valeurJour();
      afficherErreur('erreur-jour', champJour, false);
      mettreAJourRecapitulatif();
    }
  });

  champPrenom.addEventListener('input', () => {
    afficherErreur('erreur-prenom', champPrenom, false);
    mettreAJourRecapitulatif();
  });

  champTelephone.addEventListener('input', () => afficherErreur('erreur-telephone', champTelephone, false));

  formulaire.addEventListener('click', (evenement) => {
    const continuer = evenement.target.closest('[data-suivant]');
    const precedent = evenement.target.closest('[data-precedent]');
    const aller = evenement.target.closest('[data-aller]');

    if (continuer) {
      const panneau = continuer.closest('[data-panneau]');
      const numero = Number(panneau.dataset.panneau);
      if (validerEtape(numero)) montrerEtape(numero + 1, { focus: true });
    } else if (precedent) {
      const panneau = precedent.closest('[data-panneau]');
      montrerEtape(Number(panneau.dataset.panneau) - 1, { focus: true });
    } else if (aller && !aller.disabled) {
      montrerEtape(Number(aller.dataset.aller), { focus: true });
    }
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape !== 4 || !validerEtape(1) || !validerEtape(2) || !validerEtape(3)) return;
    mettreAJourRecapitulatif();
    panneaux.forEach((panneau) => { panneau.hidden = true; });
    if (confirmation) confirmation.hidden = false;
    etat.etape = 5;
    mettreAJourProgression();
    $(`#titre-confirmation`, confirmation)?.focus();
  });

  mettreAJourRecapitulatif();
  mettreAJourProgression();
});
