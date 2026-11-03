window.__site = 1;
(() => {
  'use strict';

  document.addEventListener('keydown', () => document.body.classList.add('navigation-clavier'));
  document.addEventListener('pointerdown', () => document.body.classList.remove('navigation-clavier'), { passive: true });

  const heuresPubliees = {
    0: null,
    1: null,
    2: null,
    3: [[540, 720], [840, 1110]],
    4: [[540, 1110]],
    5: [[540, 1140]],
    6: [[540, 960]]
  };
  const etat = { specialite: '', jour: '', heure: '', etape: 1 };
  const formulaire = document.querySelector('[data-formulaire]');
  const panneaux = [...document.querySelectorAll('[data-panneau]')];
  const annonce = document.querySelector('[data-annonce]');
  const listeJours = document.querySelector('[data-jours]');
  const listeHeures = document.querySelector('[data-heures]');
  const resumeService = document.querySelector('[data-resume-service]');
  const resumeJour = document.querySelector('[data-resume-jour]');
  const resumeHeure = document.querySelector('[data-resume-heure]');
  const resumeTexte = document.querySelector('[data-resume]');

  const dateParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(morceaux.map((part) => [part.type, part.value]));
    return `${valeur.year}-${valeur.month}-${valeur.day}`;
  };

  const heureParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(morceaux.map((part) => [part.type, Number(part.value)]));
    return valeur.hour * 60 + valeur.minute;
  };

  const dateDepuisISO = (iso) => new Date(`${iso}T12:00:00Z`);
  const texteJour = (iso, options = {}) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', ...options
  }).format(dateDepuisISO(iso));
  const deuxChiffres = (nombre) => String(nombre).padStart(2, '0');
  const heuresDuJour = (jour) => heuresPubliees[dateDepuisISO(jour).getUTCDay()];

  const creneauxPublies = (iso) => {
    const intervalles = heuresDuJour(iso) || [];
    const resultat = [];
    intervalles.forEach(([debut, fin]) => {
      for (let minute = debut; minute < fin; minute += 60) {
        resultat.push(minute);
      }
    });
    return resultat;
  };

  const heureEstPassee = (iso, minute) => dateParis() === iso && minute <= heureParis();
  const heuresAVenir = (iso) => creneauxPublies(iso).filter((minute) => !heureEstPassee(iso, minute));

  const libelleHeure = (minute) => `${deuxChiffres(Math.floor(minute / 60))} h ${deuxChiffres(minute % 60)}`;

  const creerJours = () => {
    if (!listeJours) return;
    const debut = dateDepuisISO(dateParis());
    const fragment = document.createDocumentFragment();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(debut);
      date.setUTCDate(date.getUTCDate() + decalage);
      const iso = `${date.getUTCFullYear()}-${deuxChiffres(date.getUTCMonth() + 1)}-${deuxChiffres(date.getUTCDate())}`;
      const numeroJour = date.getUTCDay();
      const incertain = numeroJour === 2;
      const ferme = heuresPubliees[numeroJour] === null && !incertain;
      const sansHeure = !ferme && !incertain && heuresAVenir(iso).length === 0;
      const identifiant = `jour-${iso}`;
      const caseJour = document.createElement('div');
      caseJour.className = 'choix-jour';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'jour';
      radio.id = identifiant;
      radio.value = iso;
      radio.disabled = ferme || incertain;
      radio.setAttribute('aria-label', texteJour(iso, { weekday: 'long', day: 'numeric', month: 'long' }));
      const libelle = document.createElement('label');
      libelle.htmlFor = identifiant;
      const semaine = document.createElement('span');
      semaine.textContent = texteJour(iso, { weekday: 'short' }).replace('.', '');
      const dateCourte = document.createElement('strong');
      dateCourte.textContent = deuxChiffres(date.getUTCDate());
      const etatJour = document.createElement('span');
      etatJour.textContent = ferme ? 'Fermé' : incertain ? 'À confirmer' : sansHeure ? 'Appeler' : texteJour(iso, { month: 'short' }).replace('.', '');
      libelle.append(semaine, dateCourte, etatJour);
      caseJour.append(radio, libelle);
      fragment.append(caseJour);
    }

    listeJours.replaceChildren(fragment);
  };

  const creerHeures = (iso) => {
    if (!listeHeures) return;
      const instants = creneauxPublies(iso);
    listeHeures.replaceChildren();
    if (instants.length === 0) {
      const note = document.createElement('p');
      note.className = 'aide-etape';
      note.textContent = 'Aucune heure restante dans les horaires publiés. Appelez le salon pour vérifier.';
      listeHeures.append(note);
      return;
    }

    const fragment = document.createDocumentFragment();
    instants.forEach((minute, index) => {
      const identifiant = `heure-${iso}-${index}`;
      const choix = document.createElement('div');
      choix.className = 'choix-heure';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'heure';
      radio.id = identifiant;
      radio.value = String(minute);
      const passee = heureEstPassee(iso, minute);
      radio.disabled = passee;
      if (passee) radio.setAttribute('aria-label', `${libelleHeure(minute)}, heure passée`);
      const libelle = document.createElement('label');
      libelle.htmlFor = identifiant;
      libelle.textContent = libelleHeure(minute);
      choix.append(radio, libelle);
      fragment.append(choix);
    });
    listeHeures.append(fragment);
    if (heuresAVenir(iso).length === 0) {
      const note = document.createElement('p');
      note.className = 'aide-etape';
      note.textContent = 'Aucune heure restante dans les horaires publiés. Appelez le salon pour vérifier.';
      listeHeures.append(note);
    }
  };

  const rafraichirResume = () => {
    if (resumeService) resumeService.textContent = etat.specialite || 'À choisir';
    if (resumeJour) resumeJour.textContent = etat.jour ? texteJour(etat.jour, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    if (resumeHeure) resumeHeure.textContent = etat.heure ? libelleHeure(Number(etat.heure)) : 'À choisir';
    if (resumeTexte) {
      resumeTexte.textContent = etat.specialite || etat.jour || etat.heure
        ? 'Votre demande reste à confirmer par téléphone.'
        : 'Rien n’est encore choisi.';
    }
  };

  const annoncer = (texte) => {
    if (annonce) annonce.textContent = texte;
  };

  const ouvrirEtape = (numero, immediat = false) => {
    const precedente = panneaux.find((panneau) => Number(panneau.dataset.panneau) === etat.etape);
    const suivante = panneaux.find((panneau) => Number(panneau.dataset.panneau) === numero);
    if (!suivante || !precedente || numero === etat.etape) return;
    const afficher = () => {
      precedente.hidden = true;
      precedente.classList.remove('est-sortant');
      suivante.hidden = false;
      suivante.classList.add('est-entrant');
      requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.remove('est-entrant')));
      etat.etape = numero;
      document.querySelectorAll('[data-etape-indicateur]').forEach((element) => {
        const correspond = Number(element.dataset.etapeIndicateur) === Math.min(numero, 4);
        if (correspond) element.setAttribute('aria-current', 'step');
        else element.removeAttribute('aria-current');
      });
      const titre = suivante.querySelector('[data-titre-etape]');
      if (titre) titre.focus({ preventScroll: true });
      annoncer(numero === 5 ? 'Récapitulatif de la simulation prêt.' : `Étape ${numero} sur 4 : ${titre ? titre.textContent : ''}`);
    };
    if (immediat || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('navigation-clavier')) {
      afficher();
      return;
    }
    precedente.classList.add('est-sortant');
    window.setTimeout(afficher, 230);
  };

  const afficherErreur = (nom, actif) => {
    const erreur = document.querySelector(`[data-erreur="${nom}"]`);
    if (erreur) erreur.hidden = !actif;
  };

  const validerEtape = () => {
    if (etat.etape === 1) {
      const choix = formulaire.querySelector('input[name="specialite"]:checked');
      afficherErreur('specialite', !choix);
      if (choix) { etat.specialite = choix.value; rafraichirResume(); return true; }
      formulaire.querySelector('input[name="specialite"]')?.focus();
      annoncer('Choisissez une spécialité pour continuer.');
      return false;
    }
    if (etat.etape === 2) {
      const choix = formulaire.querySelector('input[name="jour"]:checked');
      afficherErreur('jour', !choix);
      if (choix) { etat.jour = choix.value; rafraichirResume(); return true; }
      formulaire.querySelector('input[name="jour"]:not(:disabled)')?.focus();
      annoncer('Choisissez un jour pour continuer.');
      return false;
    }
    if (etat.etape === 3) {
      const choix = formulaire.querySelector('input[name="heure"]:checked');
      afficherErreur('heure', !choix);
      if (choix) { etat.heure = choix.value; rafraichirResume(); return true; }
      formulaire.querySelector('input[name="heure"]')?.focus();
      annoncer('Choisissez une heure à demander.');
      return false;
    }
    return true;
  };

  const mobileFrancaisValide = (valeur) => {
    const nettoye = valeur.replace(/[\s().-]/g, '');
    return /^(?:\+33|0033|0)[67]\d{8}$/.test(nettoye);
  };

  const afficherRecapitulatif = () => {
    const prenom = formulaire.elements.prenom.value.trim();
    const telephone = formulaire.elements.telephone.value.trim();
    const erreurPrenom = !prenom;
    const erreurTelephone = !mobileFrancaisValide(telephone);
    afficherErreur('prenom', erreurPrenom);
    afficherErreur('telephone', erreurTelephone);
    if (erreurPrenom) {
      formulaire.elements.prenom.focus();
      annoncer('Indiquez votre prénom.');
      return;
    }
    if (erreurTelephone) {
      formulaire.elements.telephone.focus();
      annoncer('Vérifiez le numéro de mobile français.');
      return;
    }
    const date = texteJour(etat.jour, { weekday: 'long', day: 'numeric', month: 'long' });
    const recap = document.querySelector('[data-recap-final]');
    recap.textContent = `${prenom}, vous avez choisi ${etat.specialite.toLowerCase()}, le ${date} à ${libelleHeure(Number(etat.heure))}. Ceci est un récapitulatif de démonstration.`;
    rafraichirResume();
    ouvrirEtape(5);
  };

  if (formulaire) {
    creerJours();
    rafraichirResume();

    formulaire.addEventListener('change', (evenement) => {
      const cible = evenement.target;
      if (cible.name === 'specialite') {
        etat.specialite = cible.value;
        afficherErreur('specialite', false);
        rafraichirResume();
        annoncer(`Spécialité choisie : ${cible.value}.`);
      }
      if (cible.name === 'jour') {
        etat.jour = cible.value;
        etat.heure = '';
        afficherErreur('jour', false);
        creerHeures(etat.jour);
        rafraichirResume();
        annoncer(`Jour choisi : ${texteJour(etat.jour, { weekday: 'long', day: 'numeric', month: 'long' })}.`);
      }
      if (cible.name === 'heure') {
        etat.heure = cible.value;
        afficherErreur('heure', false);
        rafraichirResume();
        annoncer(`Heure choisie : ${libelleHeure(Number(etat.heure))}.`);
      }
    });

    formulaire.addEventListener('click', (evenement) => {
      const suivant = evenement.target.closest('[data-suivant]');
      const retour = evenement.target.closest('[data-retour]');
      const recommencer = evenement.target.closest('[data-redemarrer]');
      if (suivant) {
        if (validerEtape()) ouvrirEtape(etat.etape + 1);
      }
      if (retour) ouvrirEtape(Math.max(1, etat.etape - 1));
      if (recommencer) {
        formulaire.reset();
        etat.specialite = '';
        etat.jour = '';
        etat.heure = '';
        etat.etape = 5;
        rafraichirResume();
        ouvrirEtape(1, true);
      }
    });

    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      if (etat.etape === 4) afficherRecapitulatif();
    });
  }

  document.querySelectorAll('[data-choix-service]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const radio = formulaire?.querySelector(`input[name="specialite"][value="${CSS.escape(lien.dataset.choixService)}"]`);
      if (radio) {
        radio.checked = true;
        etat.specialite = radio.value;
        afficherErreur('specialite', false);
        rafraichirResume();
      }
    });
  });

  const menuBouton = document.querySelector('.menu-bouton');
  const navigation = document.querySelector('.navigation');
  const fermerMenu = (rendreFocus = false) => {
    if (!menuBouton || !navigation) return;
    menuBouton.setAttribute('aria-expanded', 'false');
    menuBouton.setAttribute('aria-label', 'Ouvrir le menu');
    navigation.classList.remove('est-ouverte');
    if (rendreFocus) menuBouton.focus();
  };

  if (menuBouton && navigation) {
    menuBouton.addEventListener('click', () => {
      const ouvert = menuBouton.getAttribute('aria-expanded') === 'true';
      menuBouton.setAttribute('aria-expanded', String(!ouvert));
      menuBouton.setAttribute('aria-label', ouvert ? 'Ouvrir le menu' : 'Fermer le menu');
      navigation.classList.toggle('est-ouverte', !ouvert);
      if (!ouvert) navigation.querySelector('a')?.focus();
    });
    navigation.querySelectorAll('a').forEach((lien) => lien.addEventListener('click', () => fermerMenu(false)));
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
  }

  const boutonCopie = document.querySelector('[data-copier-adresse]');
  if (boutonCopie) {
    boutonCopie.addEventListener('click', async () => {
      const adresse = '18 avenue de la Concorde, 21000 Dijon';
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(adresse);
        } else {
          const champ = document.createElement('textarea');
          champ.value = adresse;
          champ.setAttribute('aria-label', 'Adresse du salon');
          champ.setAttribute('readonly', '');
          champ.style.position = 'fixed';
          champ.style.opacity = '0';
          document.body.append(champ);
          champ.select();
          const copie = document.execCommand('copy');
          champ.remove();
          if (!copie) throw new Error('Copie indisponible');
        }
        boutonCopie.textContent = 'Adresse copiée';
        window.setTimeout(() => { boutonCopie.textContent = 'Copier l’adresse'; }, 1800);
      } catch {
        boutonCopie.textContent = '18 avenue de la Concorde, 21000 Dijon';
      }
    });
  }

  const elementsReveles = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    elementsReveles.forEach((element) => observateurRevelation.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  }

  const barre = document.querySelector('.barre-mobile');
  const rendezVous = document.querySelector('#rendez-vous');
  const pied = document.querySelector('.pied-de-page');
  if (barre && rendezVous && pied && 'IntersectionObserver' in window) {
    const zonesMasquees = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) zonesMasquees.add(entree.target);
        else zonesMasquees.delete(entree.target);
      });
      barre.classList.toggle('est-masquee', zonesMasquees.size > 0);
    }, { threshold: 0.08 });
    observateurBarre.observe(rendezVous);
    observateurBarre.observe(pied);
  }
})();
