(() => {
  const documentElement = document.documentElement;
  const body = document.body;
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heuresParJour = {
    0: null,
    1: [14 * 60, 19 * 60],
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 19 * 60]
  };
  const prestations = {
    ciseaux: { nom: 'Shampoing + coupe intégrale au ciseaux-finition tondeuse', duree: 30 },
    coiffage: { nom: 'Coupe + Coiffage', duree: 30 },
    barbe: { nom: 'Coupe + Coiffage + Barbe+soins', duree: 30 },
    shampooing: { nom: 'Shampoing + Coupe + Coiffage', duree: 30 },
    tondeuse: { nom: 'Shampoing + coupe tondeuse 1 seul sabot', duree: 30 },
    jeune: { nom: 'Coupe coiffage moins de 18ans', duree: 20 },
    court: { nom: 'Coupe a la garconne , coupe court ou coupe au carré court', duree: 45 }
  };
  const choix = { prestation: '', jour: null, heure: null };
  const formulaire = document.querySelector('#parcours');
  const etapes = [...document.querySelectorAll('.etape')];
  const boutonsProgression = [...document.querySelectorAll('.progression button')];
  const boutonsContinuer = [...document.querySelectorAll('[data-continuer]')];
  const boutonMenu = document.querySelector('.bouton-menu');
  const navigation = document.querySelector('#navigation');
  const journeeAujourdhui = new Date();
  let derniereEtape = 1;
  let identifiantChangement = 0;

  const rendreVisible = (element) => {
    if (element) element.classList.add('visible');
  };

  function cleDate(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function heureLisible(minutes) {
    const heures = Math.floor(minutes / 60);
    const minutesRestantes = String(minutes % 60).padStart(2, '0');
    return `${heures}\u00a0h\u00a0${minutesRestantes}`;
  }

  function dateLongue(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
  }

  function libelleJour(date, indice) {
    if (indice === 0) return 'Aujourd’hui';
    if (indice === 1) return 'Demain';
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
  }

  function dateCourte(date) {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
  }

  function statutBoutonsProgression() {
    boutonsProgression.forEach((bouton) => {
      const numero = Number(bouton.dataset.allerEtape);
      bouton.disabled = numero > derniereEtape;
      if (numero === document.querySelector('.etape:not([hidden])')?.dataset.etape * 1) {
        bouton.setAttribute('aria-current', 'step');
      } else {
        bouton.removeAttribute('aria-current');
      }
    });
    document.querySelectorAll('.resume__retours button').forEach((bouton) => {
      bouton.disabled = Number(bouton.dataset.allerEtape) > derniereEtape;
    });
  }

  function mettreAJourResume() {
    const prestation = prestations[choix.prestation];
    document.querySelector('#resume-prestation').textContent = prestation ? prestation.nom : 'À choisir';
    document.querySelector('#resume-duree').textContent = prestation ? `${prestation.duree}\u00a0min` : '—';
    document.querySelector('#resume-jour').textContent = choix.jour ? dateLongue(choix.jour) : '—';
    document.querySelector('#resume-heure').textContent = choix.heure || '—';
  }

  function annoncerEtape(numero) {
    const enonce = document.querySelector(`#titre-etape-${numero}`);
    const panneau = document.querySelector(`[data-etape="${numero}"]`);
    if (!enonce || !panneau) return;
    const changement = ++identifiantChangement;
    etapes.forEach((etape) => {
      if (etape !== panneau) {
        etape.hidden = true;
        etape.classList.remove('actif', 'entree', 'sortie');
      }
    });
    panneau.hidden = false;
    panneau.classList.remove('actif');
    panneau.classList.add('entree');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (changement !== identifiantChangement) return;
        panneau.classList.add('actif');
        panneau.classList.remove('entree');
      });
    });
    enonce.focus({ preventScroll: true });
    document.querySelector('#annonce-etape').textContent = `Étape ${numero} sur 4 : ${enonce.textContent}`;
    statutBoutonsProgression();
  }

  function afficherErreur(identifiant, texte) {
    const cible = document.getElementById(identifiant);
    if (cible) cible.textContent = texte;
  }

  function effacerErreurs() {
    document.querySelectorAll('.erreur-champ').forEach((erreur) => { erreur.textContent = ''; });
    document.querySelectorAll('[aria-invalid="true"]').forEach((champ) => champ.removeAttribute('aria-invalid'));
  }

  function allerEtape(numero) {
    if (numero < 1 || numero > derniereEtape) return;
    effacerErreurs();
    annoncerEtape(numero);
  }

  function validerEtape(numero) {
    effacerErreurs();
    if (numero === 1 && !choix.prestation) {
      afficherErreur('erreur-prestation', 'Choisissez une prestation pour continuer.');
      document.querySelector('input[name="prestation"]')?.focus();
      return false;
    }
    if (numero === 2 && !choix.jour) {
      afficherErreur('erreur-jour', 'Choisissez un jour ouvert pour continuer.');
      document.querySelector('#choix-jours button:not(:disabled)')?.focus();
      return false;
    }
    if (numero === 3 && !choix.jour) {
      afficherErreur('erreur-jour', 'Choisissez d’abord un jour pour afficher les heures.');
      annoncerEtape(2);
      return false;
    }
    if (numero === 3 && !choix.heure) {
      afficherErreur('erreur-heure', 'Choisissez une heure disponible pour continuer.');
      document.querySelector('#choix-heures button:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  function afficherJours() {
    const zone = document.querySelector('#choix-jours');
    zone.replaceChildren();
    for (let indice = 0; indice < 12; indice += 1) {
      const date = new Date(journeeAujourdhui.getFullYear(), journeeAujourdhui.getMonth(), journeeAujourdhui.getDate() + indice);
      const bouton = document.createElement('button');
      const estFerme = heuresParJour[date.getDay()] === null;
      bouton.type = 'button';
      bouton.className = 'bouton-jour';
      bouton.disabled = estFerme;
      bouton.setAttribute('aria-pressed', String(Boolean(choix.jour && cleDate(choix.jour) === cleDate(date))));
      bouton.setAttribute('aria-label', `${dateLongue(date)}${estFerme ? ', fermé' : ''}`);
      const premierTexte = document.createElement('span');
      premierTexte.textContent = estFerme ? 'Fermé' : libelleJour(date, indice);
      const secondTexte = document.createElement('span');
      secondTexte.className = 'bouton-jour__date';
      secondTexte.textContent = dateCourte(date);
      bouton.append(premierTexte, secondTexte);
      if (!estFerme) {
        bouton.addEventListener('click', () => {
          choix.jour = date;
          choix.heure = null;
          derniereEtape = Math.min(derniereEtape, 2);
          zone.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          afficherHeures();
          mettreAJourResume();
          statutBoutonsProgression();
          afficherErreur('erreur-jour', '');
        });
      }
      zone.append(bouton);
    }
  }

  function signatureIndisponibilite(date, minutes) {
    const chaine = `${cleDate(date)}-${minutes}`;
    let total = 0;
    for (let indice = 0; indice < chaine.length; indice += 1) {
      total = (total * 31 + chaine.charCodeAt(indice)) >>> 0;
    }
    return total % 7 === 0;
  }

  function afficherHeures() {
    const zone = document.querySelector('#choix-heures');
    const date = choix.jour;
    const prestation = prestations[choix.prestation];
    zone.replaceChildren();
    if (!date || !prestation) return;
    const heures = heuresParJour[date.getDay()];
    if (!heures) return;
    const [ouverture, fermeture] = heures;
    const maintenant = new Date();
    const aujourdhui = cleDate(date) === cleDate(maintenant);
    const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
    const legendes = document.createElement('div');
    legendes.className = 'legende-creneaux';
    legendes.innerHTML = '<span><i aria-hidden="true"></i>Disponible dans la démonstration</span><span class="indisponible"><i aria-hidden="true"></i>Indisponible pour la démonstration</span>';
    zone.before(legendes);
    for (let debut = ouverture; debut + prestation.duree <= fermeture; debut += 30) {
      const bouton = document.createElement('button');
      const passe = aujourdhui && debut <= minuteActuelle;
      const indisponible = signatureIndisponibilite(date, debut);
      bouton.type = 'button';
      bouton.className = 'bouton-heure';
      bouton.textContent = heureLisible(debut);
      bouton.disabled = passe || indisponible;
      bouton.setAttribute('aria-pressed', String(choix.heure === heureLisible(debut)));
      if (passe) bouton.setAttribute('aria-label', `${heureLisible(debut)}, heure passée`);
      else if (indisponible) bouton.setAttribute('aria-label', `${heureLisible(debut)}, indisponible pour la démonstration`);
      else bouton.setAttribute('aria-label', `${heureLisible(debut)}, disponible dans la démonstration`);
      if (!bouton.disabled) {
        bouton.addEventListener('click', () => {
          choix.heure = heureLisible(debut);
          zone.querySelectorAll('.bouton-heure').forEach((item) => item.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          mettreAJourResume();
          afficherErreur('erreur-heure', '');
        });
      }
      zone.append(bouton);
    }
    const ancienneLegende = document.querySelector('.legende-creneaux');
    if (ancienneLegende && ancienneLegende !== legendes) ancienneLegende.remove();
  }

  function changerPrestation(code) {
    if (!prestations[code]) return;
    if (choix.prestation !== code) derniereEtape = 1;
    choix.prestation = code;
    choix.jour = null;
    choix.heure = null;
    const radio = document.querySelector(`input[name="prestation"][value="${code}"]`);
    if (radio) radio.checked = true;
    afficherJours();
    mettreAJourResume();
    statutBoutonsProgression();
    effacerErreurs();
  }

  document.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => changerPrestation(radio.value));
  });

  boutonsContinuer.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.continuer);
      if (!validerEtape(numero)) return;
      derniereEtape = Math.max(derniereEtape, numero + 1);
      if (numero === 1) afficherJours();
      if (numero === 2) afficherHeures();
      mettreAJourResume();
      annoncerEtape(numero + 1);
    });
  });

  document.querySelectorAll('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerEtape(Number(bouton.dataset.retour) - 1));
  });
  document.querySelectorAll('[data-aller-etape]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerEtape(Number(bouton.dataset.allerEtape)));
  });

  document.querySelectorAll('[data-choisir]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      changerPrestation(bouton.dataset.choisir);
      derniereEtape = Math.max(derniereEtape, 2);
      mettreAJourResume();
      document.querySelector('#reserver').scrollIntoView({ behavior: reduireMouvement ? 'auto' : 'smooth', block: 'start' });
      annoncerEtape(2);
    });
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (!validerEtape(4)) return;
    effacerErreurs();
    const prenom = document.querySelector('#prenom');
    const telephone = document.querySelector('#telephone');
    const nomValide = prenom.value.trim().length > 0;
    const telephoneValide = /^(?:(?:\+33|0033|0)[\s.-]?(?:6|7))(?:[\s.-]?\d{2}){4}$/.test(telephone.value.trim());
    if (!nomValide) {
      prenom.setAttribute('aria-invalid', 'true');
      afficherErreur('erreur-prenom', 'Saisissez votre prénom pour continuer.');
      prenom.focus();
      return;
    }
    if (!telephoneValide) {
      telephone.setAttribute('aria-invalid', 'true');
      afficherErreur('erreur-telephone', 'Saisissez un numéro mobile français commençant par 06 ou 07.');
      telephone.focus();
      return;
    }
    if (!choix.prestation || !choix.jour || !choix.heure) {
      afficherErreur('erreur-coordonnees', 'Reprenez le parcours pour choisir une prestation, un jour et une heure.');
      return;
    }
    const confirmation = document.querySelector('#confirmation');
    const texteConfirmation = document.querySelector('#texte-confirmation');
    const prestation = prestations[choix.prestation];
    texteConfirmation.textContent = `${prenom.value.trim()}, votre démonstration porte sur « ${prestation.nom} », le ${dateLongue(choix.jour)} à ${choix.heure}. Aucun rendez-vous n’a été envoyé au salon.`;
    formulaire.querySelectorAll('.etape').forEach((etape) => { etape.hidden = true; });
    formulaire.querySelector('.progression').hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector('h3').focus({ preventScroll: true });
    document.querySelector('.resume h3').textContent = 'Démonstration';
    document.querySelectorAll('.resume__retours button').forEach((bouton) => { bouton.disabled = true; });
  });

  document.querySelector('#reprendre').addEventListener('click', () => {
    formulaire.reset();
    document.querySelector('#confirmation').hidden = true;
    formulaire.querySelector('.progression').hidden = false;
    document.querySelector('.resume h3').textContent = 'En cours';
    choix.prestation = '';
    choix.jour = null;
    choix.heure = null;
    derniereEtape = 1;
    mettreAJourResume();
    annoncerEtape(1);
    statutBoutonsProgression();
  });

  if (boutonMenu && navigation) {
    const fermerMenu = (rendreFocus = false) => {
      body.classList.remove('menu-ouvert');
      boutonMenu.setAttribute('aria-expanded', 'false');
      boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
      if (rendreFocus) boutonMenu.focus({ preventScroll: true });
    };
    boutonMenu.addEventListener('click', () => {
      const ouverture = boutonMenu.getAttribute('aria-expanded') !== 'true';
      body.classList.toggle('menu-ouvert', ouverture);
      boutonMenu.setAttribute('aria-expanded', String(ouverture));
      boutonMenu.setAttribute('aria-label', ouverture ? 'Fermer la navigation' : 'Ouvrir la navigation');
      if (ouverture) navigation.querySelector('a')?.focus({ preventScroll: true });
    });
    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermerMenu();
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
  }

  if ('IntersectionObserver' in window && !reduireMouvement) {
    const revelations = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        rendreVisible(entree.target);
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('[data-revelation], .liste-a-confirmer').forEach((element) => revelations.observe(element));

    const lignes = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .1 });
    document.querySelectorAll('.tableau-prestations tbody tr').forEach((ligne, indice) => {
      ligne.style.transitionDelay = `${indice * 45}ms`;
      lignes.observe(ligne);
    });

  } else {
    document.querySelectorAll('[data-revelation], .liste-a-confirmer, .tableau-prestations tbody tr').forEach(rendreVisible);
  }

  if ('IntersectionObserver' in window) {
    const barre = document.querySelector('.barre-mobile');
    const pointsDeMasquage = [document.querySelector('#reserver'), document.querySelector('.pied')].filter(Boolean);
    if (barre && pointsDeMasquage.length) {
      const zonesVisibles = new Set();
      const observateurBarre = new IntersectionObserver((entrees) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) zonesVisibles.add(entree.target);
          else zonesVisibles.delete(entree.target);
        });
        barre.classList.toggle('masquee', zonesVisibles.size > 0);
      }, { threshold: .06 });
      pointsDeMasquage.forEach((point) => observateurBarre.observe(point));
    }
  }

  mettreAJourResume();
  statutBoutonsProgression();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      body.classList.add('est-pret');
      documentElement.classList.add('js-actif');
    });
  });
})();
