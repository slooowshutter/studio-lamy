(() => {
  'use strict';

  const motionReduite = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapitrePrincipal = document.querySelector('.chapter--hero');
  const ligneProgression = document.querySelector('.progress__fill');

  requestAnimationFrame(() => requestAnimationFrame(() => chapitrePrincipal?.classList.add('is-ready')));

  const groupesRevelation = document.querySelectorAll('.chapter:not(.chapter--hero), .sources');
  groupesRevelation.forEach((groupe, indexGroupe) => {
    const sens = indexGroupe % 2 === 0 ? 'right' : 'left';
    const tete = groupe.querySelector('.chapter__number, .sources__heading .chapter__number');
    if (tete) tete.dataset.reveal = 'number';
    const corps = groupe.querySelector('.chapter__body');
    if (corps) {
      Array.from(corps.children).forEach((element, indexElement) => {
        element.dataset.reveal = sens;
        element.style.setProperty('--reveal-delay', `${Math.min(indexElement * 55, 220)}ms`);
      });
    }
    groupe.querySelectorAll('.visit-list li, .hours-list > div, .sources__list li').forEach((element, indexElement) => {
      element.dataset.reveal = 'right';
      element.style.setProperty('--reveal-delay', `${Math.min(indexElement * 55, 220)}ms`);
    });
    const date = groupe.querySelector('.date-stamp');
    if (date) date.dataset.reveal = 'date';
    const lignesServices = groupe.querySelectorAll('.service-list li');
    lignesServices.forEach((element, indexElement) => {
      element.dataset.reveal = 'right';
      element.style.setProperty('--reveal-delay', `${indexElement * 60}ms`);
    });
  });

  const elementsReveles = document.querySelectorAll('[data-reveal]');
  if (motionReduite || !('IntersectionObserver' in window)) {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  } else {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    elementsReveles.forEach((element) => observateurRevelation.observe(element));
  }

  let attenteProgression = false;
  const actualiserProgression = () => {
    const hauteurDocument = document.documentElement.scrollHeight - window.innerHeight;
    const progression = hauteurDocument > 0 ? Math.min(1, Math.max(0, window.scrollY / hauteurDocument)) : 0;
    if (ligneProgression) ligneProgression.style.transform = `scaleY(${progression})`;
    attenteProgression = false;
  };
  window.addEventListener('scroll', () => {
    if (attenteProgression) return;
    attenteProgression = true;
    requestAnimationFrame(actualiserProgression);
  }, { passive: true });
  actualiserProgression();

  const boutonNavigation = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.navigation');
  const liensNavigation = navigation ? Array.from(navigation.querySelectorAll('a')) : [];
  const fermerNavigation = (rendreFocus = false) => {
    if (!boutonNavigation || !navigation) return;
    boutonNavigation.setAttribute('aria-expanded', 'false');
    boutonNavigation.textContent = 'Ouvrir la navigation';
    navigation.classList.remove('is-open');
    if (rendreFocus) boutonNavigation.focus();
  };
  boutonNavigation?.addEventListener('click', () => {
    const ouverte = boutonNavigation.getAttribute('aria-expanded') === 'true';
    boutonNavigation.setAttribute('aria-expanded', String(!ouverte));
    boutonNavigation.textContent = ouverte ? 'Ouvrir la navigation' : 'Fermer la navigation';
    navigation?.classList.toggle('is-open', !ouverte);
    if (!ouverte) liensNavigation[0]?.focus();
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonNavigation?.getAttribute('aria-expanded') === 'true') fermerNavigation(true);
  });
  liensNavigation.forEach((lien) => lien.addEventListener('click', () => {
    const menuOuvert = boutonNavigation?.getAttribute('aria-expanded') === 'true';
    fermerNavigation(false);
    if (!menuOuvert || !window.matchMedia('(max-width: 680px)').matches) return;
    const cible = lien.hash ? document.querySelector(lien.hash) : null;
    const titreCible = cible?.querySelector('h1, h2');
    if (!titreCible) return;
    if (!titreCible.hasAttribute('tabindex')) titreCible.setAttribute('tabindex', '-1');
    requestAnimationFrame(() => titreCible.focus({ preventScroll: true }));
  }));

  const barreMobile = document.querySelector('[data-mobile-bar]');
  if (barreMobile && 'IntersectionObserver' in window) {
    let actionPrincipaleVisible = true;
    let sectionReserveVisible = false;
    const actualiserBarre = () => {
      barreMobile.classList.toggle('is-visible', !actionPrincipaleVisible && !sectionReserveVisible);
    };
    const observateurHero = new IntersectionObserver((entrees) => {
      actionPrincipaleVisible = entrees.some((entree) => entree.isIntersecting);
      actualiserBarre();
    }, { threshold: 0.12 });
    const observateurFin = new IntersectionObserver((entrees) => {
      sectionReserveVisible = entrees.some((entree) => entree.isIntersecting);
      actualiserBarre();
    }, { threshold: 0.01 });
    const appelHero = document.querySelector('.hero__meta');
    const sectionReservation = document.querySelector('#chapitre-05');
    const piedDePage = document.querySelector('.site-foot');
    if (appelHero) observateurHero.observe(appelHero);
    [sectionReservation, piedDePage].filter(Boolean).forEach((element) => observateurFin.observe(element));
  }

  const formulaire = document.querySelector('#booking-form');
  if (!formulaire) return;

  const panneaux = Array.from(formulaire.querySelectorAll('.booking-panel'));
  const etatTexte = document.querySelector('[data-booking-status]');
  const champsRecap = {
    prestation: document.querySelector('[data-summary-service]'),
    jour: document.querySelector('[data-summary-day]'),
    heure: document.querySelector('[data-summary-time]')
  };
  const etat = { prestation: null, jour: null, heure: null, prenom: '', telephone: '' };
  const joursFrancais = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const datesFrancaises = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const nombresJour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' });
  const aujourdHuiParis = () => {
    const parties = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const annee = Number(parties.find((partie) => partie.type === 'year')?.value);
    const mois = Number(parties.find((partie) => partie.type === 'month')?.value);
    const jour = Number(parties.find((partie) => partie.type === 'day')?.value);
    return new Date(Date.UTC(annee, mois - 1, jour));
  };
  const dateAffichee = (date, options = {}) => new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(date);
  const jourActuel = aujourdHuiParis();
  const boutonsJour = document.querySelector('[data-days]');
  const boutonsHeure = document.querySelector('[data-slots]');
  const explicationJour = document.querySelector('[data-day-explanation]');
  const explicationHeure = document.querySelector('[data-slot-explanation]');
  const boutonsSuivants = Array.from(formulaire.querySelectorAll('[data-next]'));
  const lectureTempsParis = () => {
    const parties = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    return Number(parties.find((partie) => partie.type === 'hour')?.value) * 60 + Number(parties.find((partie) => partie.type === 'minute')?.value);
  };
  const ecrireTexte = (element, texte) => { if (element) element.textContent = texte; };

  const actualiserRecap = () => {
    ecrireTexte(champsRecap.prestation, etat.prestation ? `${etat.prestation.nom} · ${etat.prestation.duree} min` : 'À choisir');
    ecrireTexte(champsRecap.jour, etat.jour ? dateAffichee(etat.jour.date, { weekday: 'short', day: 'numeric', month: 'short' }) : 'À choisir');
    ecrireTexte(champsRecap.heure, etat.heure || 'À choisir');
  };

  const genererJours = () => {
    if (!boutonsJour) return;
    boutonsJour.replaceChildren();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(jourActuel);
      date.setUTCDate(date.getUTCDate() + decalage);
      const jourSemaine = date.getUTCDay();
      const ouvert = jourSemaine >= 1 && jourSemaine <= 4;
      const aConfirmer = jourSemaine === 5 || jourSemaine === 6;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'day-button';
      bouton.dataset.date = date.toISOString().slice(0, 10);
      bouton.disabled = !ouvert;
      bouton.setAttribute('aria-pressed', 'false');
      const nom = document.createElement('span');
      nom.className = 'day-button__name';
      nom.textContent = joursFrancais.format(date).replace('.', '');
      const numero = document.createElement('span');
      numero.className = 'day-button__number';
      numero.textContent = nombresJour.format(date);
      const etatJour = document.createElement('span');
      etatJour.className = 'day-button__state';
      if (decalage === 0) etatJour.textContent = 'Aujourd’hui';
      else if (!ouvert && aConfirmer) etatJour.textContent = 'à confirmer';
      else if (!ouvert) etatJour.textContent = 'fermé';
      else etatJour.textContent = '';
      const libelleDate = dateAffichee(date, { weekday: 'long', day: 'numeric', month: 'long' });
      bouton.setAttribute('aria-label', ouvert ? libelleDate : `${libelleDate}, ${aConfirmer ? 'horaires à confirmer' : 'fermé'}`);
      bouton.append(nom, numero, etatJour);
      bouton.addEventListener('click', () => choisirJour(date, bouton));
      boutonsJour.append(bouton);
    }
  };

  const choisirJour = (date, boutonChoisi) => {
    etat.jour = { date, cle: date.toISOString().slice(0, 10) };
    etat.heure = null;
    boutonsJour?.querySelectorAll('.day-button').forEach((bouton) => bouton.setAttribute('aria-pressed', String(bouton === boutonChoisi)));
    ecrireTexte(explicationJour, `Créneaux d’exemple pour le ${dateAffichee(date, { weekday: 'long', day: 'numeric', month: 'long' })}.`);
    const boutonHeureSuivant = formulaire.querySelector('[data-next="heure"]');
    if (boutonHeureSuivant) boutonHeureSuivant.disabled = false;
    genererHeures();
    actualiserRecap();
  };

  const genererHeures = () => {
    if (!boutonsHeure || !etat.jour) return;
    boutonsHeure.replaceChildren();
    const ensemble = document.createElement('fieldset');
    ensemble.className = 'slot-group';
    const legende = document.createElement('legend');
    legende.textContent = 'Choisir une heure de démonstration';
    ensemble.append(legende);
    const grille = document.createElement('div');
    grille.className = 'slot-list__grid';
    const aujourdHui = etat.jour.cle === jourActuel.toISOString().slice(0, 10);
    const minutesActuelles = aujourdHui ? lectureTempsParis() : -1;
    const cleDate = etat.jour.cle.split('-').map(Number).join('');
    let nombreDisponible = 0;
    for (let minutes = 10 * 60, indexCreneau = 0; minutes + etat.prestation.duree <= 19 * 60; minutes += 30, indexCreneau += 1) {
      const heure = String(Math.floor(minutes / 60)).padStart(2, '0');
      const minute = String(minutes % 60).padStart(2, '0');
      const valeur = `${heure}:${minute}`;
      const dejaPasse = aujourdHui && minutes <= minutesActuelles;
      const exempleIndisponible = (Number(cleDate.slice(-4)) + indexCreneau * 7) % 13 === 0;
      const indisponible = dejaPasse || exempleIndisponible;
      if (!indisponible) nombreDisponible += 1;
      const etiquette = document.createElement('label');
      etiquette.className = 'slot-choice';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'heure';
      radio.value = valeur;
      radio.disabled = indisponible;
      radio.setAttribute('aria-label', indisponible ? `${heure} h ${minute}, ${dejaPasse ? 'heure passée' : 'indisponible, exemple de simulation'}` : `${heure} h ${minute}`);
      radio.addEventListener('change', () => {
        etat.heure = valeur;
        boutonsHeure.querySelectorAll('.slot-choice').forEach((choix) => choix.classList.toggle('is-selected', choix === etiquette));
        const boutonContinuer = formulaire.querySelector('[data-next="coordonnees"]');
        if (boutonContinuer) boutonContinuer.disabled = false;
        actualiserRecap();
      });
      const libelle = document.createElement('span');
      libelle.className = 'slot-choice__time';
      libelle.textContent = `${heure} h ${minute}`;
      if (indisponible) etiquette.classList.add('is-unavailable');
      etiquette.append(radio, libelle);
      if (exempleIndisponible && !dejaPasse) {
        const raison = document.createElement('span');
        raison.className = 'slot-choice__reason';
        raison.textContent = 'exemple indisponible';
        etiquette.append(raison);
      }
      grille.append(etiquette);
    }
    ensemble.append(grille);
    boutonsHeure.append(ensemble);
    const libelleJour = dateAffichee(etat.jour.date, { weekday: 'long', day: 'numeric', month: 'long' });
    ecrireTexte(explicationHeure, `${nombreDisponible} créneaux disponibles dans cette simulation pour le ${libelleJour}. Les états indiqués comme indisponibles sont des exemples.`);
    const boutonContinuer = formulaire.querySelector('[data-next="coordonnees"]');
    if (boutonContinuer) boutonContinuer.disabled = true;
  };

  const nomsEtapes = { prestation: 'Choisir une prestation', jour: 'Choisir un jour', heure: 'Choisir une heure', coordonnees: 'Saisir les coordonnées' };
  let transitionEnCours = false;
  const afficherPanneau = (nomPanneau) => {
    if (transitionEnCours) return;
    const nouveau = panneaux.find((panneau) => panneau.dataset.panel === nomPanneau);
    const actuel = panneaux.find((panneau) => !panneau.hidden);
    if (!nouveau || nouveau === actuel) return;
    transitionEnCours = true;
    ecrireTexte(etatTexte, `Étape ${panneaux.indexOf(nouveau) + 1} sur 4 · ${nomsEtapes[nomPanneau]}`);
    if (!actuel || motionReduite) {
      if (actuel) actuel.hidden = true;
      nouveau.hidden = false;
      nouveau.classList.add('is-active');
      nouveau.querySelector('h3')?.focus();
      transitionEnCours = false;
      return;
    }
    actuel.classList.add('is-leaving');
    window.setTimeout(() => {
      actuel.hidden = true;
      actuel.classList.remove('is-leaving', 'is-active');
      nouveau.hidden = false;
      nouveau.classList.add('is-entering');
      requestAnimationFrame(() => {
        nouveau.classList.remove('is-entering');
        nouveau.classList.add('is-active');
        nouveau.querySelector('h3')?.focus();
        window.setTimeout(() => { transitionEnCours = false; }, 180);
      });
    }, 90);
  };

  formulaire.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const prestationModifiee = etat.prestation && etat.prestation.cle !== radio.value;
      etat.prestation = { cle: radio.value, nom: radio.dataset.nom, duree: Number(radio.dataset.duree) };
      const optionChoisie = radio.closest('.service-option');
      optionChoisie?.classList.add('is-selected');
      formulaire.querySelectorAll('.service-option').forEach((option) => {
        if (option !== optionChoisie) option.classList.remove('is-selected');
      });
      if (prestationModifiee) {
        etat.jour = null;
        etat.heure = null;
        boutonsJour?.querySelectorAll('.day-button').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
        boutonsHeure?.replaceChildren();
        ecrireTexte(explicationJour, 'Les jours fermés ou aux horaires incertains ne proposent pas de créneau.');
        ecrireTexte(explicationHeure, '');
        const boutonHeure = formulaire.querySelector('[data-next="heure"]');
        const boutonCoordonnees = formulaire.querySelector('[data-next="coordonnees"]');
        if (boutonHeure) boutonHeure.disabled = true;
        if (boutonCoordonnees) boutonCoordonnees.disabled = true;
      }
      const boutonSuivant = formulaire.querySelector('[data-next="jour"]');
      if (boutonSuivant) boutonSuivant.disabled = false;
      actualiserRecap();
    });
  });

  boutonsSuivants.forEach((bouton) => bouton.addEventListener('click', () => {
    const destination = bouton.dataset.next;
    if (destination === 'heure') {
      const choix = etat.jour;
      if (!choix) return;
      if (choix.date.getUTCDay() >= 5 || choix.date.getUTCDay() === 0) return;
    }
    afficherPanneau(destination);
  }));
  formulaire.querySelectorAll('[data-back]').forEach((bouton) => bouton.addEventListener('click', () => afficherPanneau(bouton.dataset.back)));

  const validerCoordonnees = () => {
    const entreePrenom = formulaire.querySelector('#prenom');
    const entreeTelephone = formulaire.querySelector('#telephone');
    const prenom = entreePrenom.value.trim();
    const telephone = entreeTelephone.value.trim();
    const erreurPrenom = document.querySelector('#prenom-erreur');
    const erreurTelephone = document.querySelector('#telephone-erreur');
    const formErreur = formulaire.querySelector('[data-form-error]');
    const chiffreTelephone = telephone.replace(/[\s.()-]/g, '');
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(chiffreTelephone);
    ecrireTexte(erreurPrenom, prenom.length >= 2 ? '' : 'Indiquez un prénom d’au moins deux caractères.');
    ecrireTexte(erreurTelephone, telephoneValide ? '' : 'Indiquez un numéro mobile français commençant par 06 ou 07.');
    ecrireTexte(formErreur, '');
    entreePrenom.setAttribute('aria-invalid', String(prenom.length < 2));
    entreeTelephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (prenom.length < 2) { entreePrenom.focus(); return false; }
    if (!telephoneValide) { entreeTelephone.focus(); return false; }
    etat.prenom = prenom;
    etat.telephone = telephone;
    return true;
  };

  const soumettre = (evenement) => {
    evenement.preventDefault();
    if (!etat.prestation || !etat.jour || !etat.heure) {
      ecrireTexte(formulaire.querySelector('[data-form-error]'), 'Choisissez une prestation, un jour et une heure avant de continuer.');
      return;
    }
    if (!validerCoordonnees()) return;
    panneaux.forEach((panneau) => { panneau.hidden = true; panneau.classList.remove('is-active', 'is-leaving', 'is-entering'); });
    const succes = formulaire.querySelector('[data-success]');
    const copie = formulaire.querySelector('[data-success-copy]');
    const jourTexte = dateAffichee(etat.jour.date, { weekday: 'long', day: 'numeric', month: 'long' });
    ecrireTexte(copie, `${etat.prenom} · ${etat.prestation.nom} · ${jourTexte} à ${etat.heure.replace(':', ' h ')}.`);
    succes.hidden = false;
    succes.focus();
    ecrireTexte(etatTexte, 'Récapitulatif de la simulation. Rien n’a été transmis.');
  };
  formulaire.addEventListener('submit', soumettre);

  formulaire.querySelector('[data-restart]')?.addEventListener('click', () => {
    etat.prestation = null;
    etat.jour = null;
    etat.heure = null;
    etat.prenom = '';
    etat.telephone = '';
    formulaire.reset();
    document.querySelector('[data-success]').hidden = true;
    const depart = panneaux[0];
    depart.hidden = false;
    depart.classList.add('is-active');
    const boutonJour = formulaire.querySelector('[data-next="jour"]');
    const boutonHeure = formulaire.querySelector('[data-next="heure"]');
    const boutonCoordonnees = formulaire.querySelector('[data-next="coordonnees"]');
    [boutonJour, boutonHeure, boutonCoordonnees].filter(Boolean).forEach((bouton) => { bouton.disabled = true; });
    formulaire.querySelectorAll('.service-option, .slot-choice').forEach((option) => option.classList.remove('is-selected'));
    ecrireTexte(etatTexte, 'Étape 1 sur 4 · Choisir une prestation');
    actualiserRecap();
    genererJours();
    depart.querySelector('h3')?.focus();
  });

  genererJours();
  actualiserRecap();
})();
