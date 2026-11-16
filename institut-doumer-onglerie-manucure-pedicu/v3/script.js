(() => {
  const racine = document.documentElement;
  racine.classList.add('js');

  const boutonMenu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.navigation');
  if (boutonMenu && navigation) {
    const fermerMenu = (rendreFocus = false) => {
      boutonMenu.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-open');
      if (rendreFocus) boutonMenu.focus();
    };
    boutonMenu.addEventListener('click', () => {
      const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
      boutonMenu.setAttribute('aria-expanded', String(!ouvert));
      navigation.classList.toggle('is-open', !ouvert);
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermerMenu();
    });
  }

  const elementsReveles = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const groupes = new Map();
    elementsReveles.forEach((element) => {
      const groupe = element.closest('.service-table, .index-list') || element.parentElement;
      const rang = groupes.get(groupe) || 0;
      element.style.setProperty('--delai', `${rang * 40}ms`);
      groupes.set(groupe, rang + 1);
    });
    const observateurLignes = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    elementsReveles.forEach((element) => observateurLignes.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  }

  const barreMobile = document.querySelector('.mobile-actions');
  const zoneReservation = document.querySelector('#reserver');
  const piedDePage = document.querySelector('.site-footer');
  if (barreMobile && 'IntersectionObserver' in window) {
    const zonesOccupees = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) zonesOccupees.add(entree.target);
        else zonesOccupees.delete(entree.target);
      });
      const masque = zonesOccupees.size > 0;
      barreMobile.classList.toggle('is-obscured', masque);
      barreMobile.inert = masque;
    }, { threshold: 0.12 });
    if (zoneReservation) observateurBarre.observe(zoneReservation);
    if (piedDePage) observateurBarre.observe(piedDePage);
  }

  const formulaire = document.querySelector('#formulaire-reservation');
  if (!formulaire) return;

  const etat = document.querySelector('#etat-reservation');
  const pas = [...formulaire.querySelectorAll('.booking-step')];
  const confirmation = document.querySelector('#confirmation');
  const listeJours = document.querySelector('#liste-jours');
  const listeHeures = document.querySelector('#liste-heures');
  const serviceRadios = [...formulaire.querySelectorAll('input[name="prestation"]')];
  const champs = {
    prenom: document.querySelector('#prenom'),
    telephone: document.querySelector('#telephone')
  };
  const erreurs = {
    prestation: document.querySelector('#erreur-prestation'),
    jour: document.querySelector('#erreur-jour'),
    heure: document.querySelector('#erreur-heure'),
    prenom: document.querySelector('#erreur-prenom'),
    telephone: document.querySelector('#erreur-telephone')
  };
  const recap = {
    prestation: document.querySelector('#recap-prestation'),
    jour: document.querySelector('#recap-jour'),
    heure: document.querySelector('#recap-heure'),
    prenom: document.querySelector('#recap-prenom')
  };
  const choix = { prestation: null, jour: null, libelleJour: null, heure: null, prenom: null };
  let etapeActuelle = 'prestation';
  let verrouTransition = false;

  const nomsEtapes = {
    prestation: 'Choisissez une prestation.',
    jour: 'Choisissez un jour.',
    heure: 'Choisissez une heure.',
    coordonnees: 'Renseignez vos coordonnées.'
  };
  const numeroEtapes = { prestation: 1, jour: 2, heure: 3, coordonnees: 4 };

  pas.forEach((section, index) => {
    section.hidden = index !== 0;
    section.classList.toggle('is-active', index === 0);
  });

  const libelleService = (valeur) => {
    const radio = serviceRadios.find((element) => element.value === valeur);
    if (!radio) return '';
    return radio.closest('label').querySelector('span').textContent.trim();
  };

  const dureeService = () => {
    const radio = serviceRadios.find((element) => element.value === choix.prestation);
    return radio ? Number(radio.dataset.duree) : 0;
  };

  const mettreAJourRecap = () => {
    recap.prestation.textContent = choix.prestation ? libelleService(choix.prestation) : 'À choisir';
    recap.jour.textContent = choix.libelleJour || 'À choisir';
    recap.heure.textContent = choix.heure || 'À choisir';
    recap.prenom.textContent = choix.prenom || '—';
  };

  const afficherEtape = (nom, initiale = false) => {
    if (verrouTransition || nom === etapeActuelle) return;
    const sectionActuelle = pas.find((element) => element.dataset.step === etapeActuelle);
    const suivante = pas.find((element) => element.dataset.step === nom);
    if (!sectionActuelle || !suivante) return;
    verrouTransition = true;
    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delaiSortie = initiale || mouvementReduit ? 0 : 150;
    sectionActuelle.classList.add('is-leaving');
    window.setTimeout(() => {
      sectionActuelle.hidden = true;
      sectionActuelle.classList.remove('is-active', 'is-leaving');
      suivante.hidden = false;
      suivante.classList.add('is-entering');
      etapeActuelle = nom;
      etat.textContent = `Étape ${numeroEtapes[nom]} sur 4 · ${nomsEtapes[nom]}`;
      window.requestAnimationFrame(() => {
        suivante.classList.add('is-active');
        suivante.classList.remove('is-entering');
      });
      window.setTimeout(() => {
        suivante.querySelector('h3')?.focus();
        verrouTransition = false;
      }, mouvementReduit ? 0 : 220);
    }, delaiSortie);
  };

  const masquerErreur = (erreur) => { if (erreur) erreur.hidden = true; };
  const montrerErreur = (erreur, cible) => {
    if (erreur) erreur.hidden = false;
    cible?.focus();
  };

  const aujourdHuiParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    return new Date(Date.UTC(Number(valeur.year), Number(valeur.month) - 1, Number(valeur.day), 12));
  };

  const formatterJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
  const formatterSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' });
  const formatterNombreJour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', timeZone: 'Europe/Paris' });
  const dates = [];
  const baseDate = aujourdHuiParis();

  for (let index = 0; index < 10; index += 1) {
    const date = new Date(baseDate.getTime() + index * 86400000);
    const cle = date.toISOString().slice(0, 10);
    const libelle = formatterJour.format(date);
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'date-choice';
    bouton.dataset.date = cle;
    bouton.dataset.libelle = libelle;
    bouton.setAttribute('aria-label', `Choisir ${libelle}`);
    bouton.setAttribute('aria-pressed', 'false');
    const nombre = document.createElement('span');
    nombre.textContent = formatterNombreJour.format(date);
    const jourSemaine = document.createElement('span');
    jourSemaine.textContent = formatterSemaine.format(date).replace('.', '');
    bouton.append(nombre, jourSemaine);
    bouton.addEventListener('click', () => {
      listeJours.querySelectorAll('.date-choice').forEach((element) => element.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      choix.jour = cle;
      choix.libelleJour = libelle;
      choix.heure = null;
      erreurs.jour.hidden = true;
      erreurs.heure.hidden = true;
      genererHeures();
      mettreAJourRecap();
    });
    listeJours.append(bouton);
    dates.push({ cle, libelle });
  }

  const minutesActuellesParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    return Number(valeur.hour) * 60 + Number(valeur.minute);
  };

  const cleAujourdhui = baseDate.toISOString().slice(0, 10);
  const estIndisponibleSimulation = (cleJour, minuteDepart, service) => {
    const texte = `${cleJour}-${minuteDepart}-${service}`;
    let somme = 0;
    for (let index = 0; index < texte.length; index += 1) somme = (somme * 31 + texte.charCodeAt(index)) >>> 0;
    return somme % 7 === 2;
  };

  const afficherHeure = (minute) => {
    const heures = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    return `${heures}\u00a0h\u00a0${minutes}`;
  };

  function genererHeures() {
    listeHeures.replaceChildren();
    choix.heure = null;
    if (!choix.prestation || !choix.jour) return;
    const duree = dureeService();
    const maintenant = choix.jour === cleAujourdhui ? minutesActuellesParis() : -1;
    const ouverture = 10 * 60 + 30;
    const fermeture = 20 * 60;
    for (let debut = ouverture; debut + duree <= fermeture; debut += 30) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-choice';
      bouton.dataset.heure = afficherHeure(debut);
      const heure = document.createElement('span');
      heure.textContent = afficherHeure(debut);
      bouton.append(heure);
      const passe = debut <= maintenant;
      const indisponible = !passe && estIndisponibleSimulation(choix.jour, debut, choix.prestation);
      if (passe || indisponible) {
        bouton.disabled = true;
        const mention = document.createElement('small');
        mention.textContent = passe ? 'Passé · simulation' : 'Déjà pris · simulation';
        bouton.append(mention);
        bouton.setAttribute('aria-label', passe ? `${afficherHeure(debut)}, passé dans la simulation` : `${afficherHeure(debut)}, déjà pris dans la simulation`);
      } else {
        bouton.setAttribute('aria-pressed', 'false');
        bouton.setAttribute('aria-label', `Choisir ${afficherHeure(debut)}`);
        bouton.addEventListener('click', () => {
          listeHeures.querySelectorAll('.time-choice:not(:disabled)').forEach((element) => element.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          choix.heure = bouton.dataset.heure;
          erreurs.heure.hidden = true;
          mettreAJourRecap();
        });
      }
      listeHeures.append(bouton);
    }
  }

  serviceRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      choix.prestation = radio.value;
      choix.heure = null;
      erreurs.prestation.hidden = true;
      erreurs.heure.hidden = true;
      if (choix.jour) genererHeures();
      mettreAJourRecap();
    });
  });

  document.querySelectorAll('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const radio = serviceRadios.find((element) => element.value === lien.dataset.prestation);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      if (etapeActuelle !== 'prestation') afficherEtape('prestation');
    });
  });

  formulaire.querySelectorAll('[data-next]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etapeActuelle === 'prestation' && !choix.prestation) {
        montrerErreur(erreurs.prestation, serviceRadios[0]);
        return;
      }
      if (etapeActuelle === 'jour' && !choix.jour) {
        montrerErreur(erreurs.jour, listeJours.querySelector('button'));
        return;
      }
      if (etapeActuelle === 'heure' && !choix.heure) {
        montrerErreur(erreurs.heure, listeHeures.querySelector('button:not(:disabled)'));
        return;
      }
      afficherEtape(bouton.dataset.next);
    });
  });

  formulaire.querySelectorAll('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(bouton.dataset.retour));
  });

  champs.prenom.addEventListener('input', () => masquerErreur(erreurs.prenom));
  champs.telephone.addEventListener('input', () => masquerErreur(erreurs.telephone));

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = champs.prenom.value.trim();
    const numero = champs.telephone.value.trim().replace(/[()\s.-]/g, '');
    const prenomValide = prenom.length > 0;
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(numero);
    erreurs.prenom.hidden = prenomValide;
    erreurs.telephone.hidden = telephoneValide;
    if (!prenomValide) { champs.prenom.focus(); return; }
    if (!telephoneValide) { champs.telephone.focus(); return; }
    if (!choix.prestation || !choix.jour || !choix.heure) {
      etat.textContent = 'Une étape manque. Revenez au choix de la prestation.';
      afficherEtape(!choix.prestation ? 'prestation' : !choix.jour ? 'jour' : 'heure');
      return;
    }
    choix.prenom = prenom;
    mettreAJourRecap();
    const recapConfirmation = document.querySelector('#recap-confirmation');
    recapConfirmation.textContent = `${prenom}, votre simulation indique ${libelleService(choix.prestation).toLowerCase()}, le ${choix.libelleJour} à ${choix.heure}.`;
    pas.find((element) => element.dataset.step === etapeActuelle).hidden = true;
    confirmation.hidden = false;
    confirmation.classList.add('is-entering');
    etat.textContent = 'Simulation terminée. Aucun rendez-vous n’a été transmis.';
    window.requestAnimationFrame(() => {
      confirmation.classList.add('is-visible');
      confirmation.classList.remove('is-entering');
    });
    window.setTimeout(() => confirmation.querySelector('h3')?.focus(), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  });

  mettreAJourRecap();
})();
