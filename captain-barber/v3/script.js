(() => {
  'use strict';

  const documentPage = document;
  const windowPage = window;
  windowPage.__site = true;
  const motionReduite = windowPage.matchMedia('(prefers-reduced-motion: reduce)');
  const prestations = {
    'barbe-traditionnelle': { nom: 'Barbe traditionnelle (rituel vapeur & serviette chaude)', duree: 20 },
    'barbe-classique': { nom: 'Barbe classique, contour coupe-choux', duree: 15 },
    'coupe': { nom: 'Coupe', duree: 30 },
    'coupe-enfant': { nom: 'Coupe enfant (-12 ans)', duree: 30 }
  };
  const joursCourts = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const dateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' });
  const dateComplete = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const espaceInsecable = '\u00a0';
  const selecteur = (requete, racine = documentPage) => racine.querySelector(requete);
  const selectionneurs = (requete, racine = documentPage) => Array.from(racine.querySelectorAll(requete));
  const deuxChiffres = (nombre) => String(nombre).padStart(2, '0');
  const aujourdhuiParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    return {
      annee: Number(valeurs.year),
      mois: Number(valeurs.month),
      jour: Number(valeurs.day),
      minutes: (Number(valeurs.hour) % 24) * 60 + Number(valeurs.minute)
    };
  };
  const cleDate = (date) => `${date.getUTCFullYear()}-${deuxChiffres(date.getUTCMonth() + 1)}-${deuxChiffres(date.getUTCDate())}`;
  const dateParis = (decalage) => {
    const maintenant = aujourdhuiParis();
    return new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour + decalage, 12));
  };
  const capitale = (texte) => texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  const nomJour = (date) => joursCourts.format(date).replace('.', '');
  const jourLong = (date) => capitale(dateComplete.format(date));
  const heureFrancaise = (minutes) => {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste ? `${heures}${espaceInsecable}h${espaceInsecable}${deuxChiffres(reste)}` : `${heures}${espaceInsecable}h`;
  };
  const minutesDuree = (minutes) => `${minutes}${espaceInsecable}min`;

  const calculPaques = (annee) => {
    const a = annee % 19;
    const b = Math.floor(annee / 100);
    const c = annee % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(annee, mois - 1, jour, 12);
  };
  const joursFeries = new Map();
  const estJourFerie = (date) => {
    const annee = date.getUTCFullYear();
    if (!joursFeries.has(annee)) {
      const paques = calculPaques(annee);
      const ajouterJours = (nombre) => cleDate(new Date(paques + nombre * 86400000));
      joursFeries.set(annee, new Set([
        ...['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((jourFixe) => `${annee}-${jourFixe}`),
        ajouterJours(1), ajouterJours(39), ajouterJours(50)
      ]));
    }
    return joursFeries.get(annee).has(cleDate(date));
  };

  const formulaire = selecteur('#formulaire-reservation');
  const panneaux = selectionneurs('.booking-step', formulaire);
  const annonce = selecteur('#etat-reservation');
  const selection = { prestation: '', jour: '', heure: null, prenom: '', telephone: '' };
  let etapeCourante = 0;
  let reservationTerminee = false;

  function lirePrestation() {
    return prestations[selection.prestation] || null;
  }

  function mettreAJourResume() {
    const prestation = lirePrestation();
    const recapPrestation = selecteur('[data-recap-prestation]');
    const recapJour = selecteur('[data-recap-jour]');
    const recapHeure = selecteur('[data-recap-heure]');
    const recapPrenom = selecteur('[data-recap-prenom]');
    const recapMobile = selecteur('[data-recap-mobile]');
    if (recapPrestation) recapPrestation.textContent = prestation ? `${prestation.nom} · ${minutesDuree(prestation.duree)}` : 'À choisir';
    if (recapJour) recapJour.textContent = selection.jour ? jourLong(new Date(`${selection.jour}T12:00:00Z`)) : 'À choisir';
    if (recapHeure) recapHeure.textContent = selection.heure === null ? 'À choisir' : heureFrancaise(selection.heure);
    if (recapPrenom) recapPrenom.textContent = selection.prenom || 'À compléter';
    if (recapMobile) {
      const textePrestation = prestation ? `${prestation.nom} · ${minutesDuree(prestation.duree)}` : 'prestation à choisir';
      const texteJour = selection.jour ? jourLong(new Date(`${selection.jour}T12:00:00Z`)) : 'jour à choisir';
      const texteHeure = selection.heure === null ? 'heure à choisir' : heureFrancaise(selection.heure);
      recapMobile.textContent = `Votre sélection : ${textePrestation} · ${texteJour} · ${texteHeure}.`;
    }
    selectionneurs('[data-retour-etape]').forEach((bouton) => {
      const numero = Number(bouton.dataset.retourEtape);
      const peutRetourner = numero === 0 ? Boolean(selection.prestation) : numero === 1 ? Boolean(selection.jour) : numero === 2 ? selection.heure !== null : selection.heure !== null;
      bouton.hidden = !peutRetourner || reservationTerminee;
    });
  }

  function afficherEtape(numero, annoncer = true) {
    if (numero < 0 || numero > 3 || reservationTerminee) return;
    etapeCourante = numero;
    panneaux.forEach((panneau, index) => {
      if (index !== numero) {
        panneau.hidden = true;
        panneau.classList.remove('is-current', 'is-entering');
        return;
      }
      panneau.hidden = false;
      panneau.classList.remove('is-current');
      panneau.classList.add('is-entering');
      windowPage.requestAnimationFrame(() => windowPage.requestAnimationFrame(() => {
        panneau.classList.remove('is-entering');
        panneau.classList.add('is-current');
      }));
      const titre = selecteur('h3', panneau);
      if (titre) titre.focus({ preventScroll: true });
    });
    const textes = [
      'Choisissez une prestation.',
      'Choisissez un jour.',
      'Choisissez une heure.',
      'Indiquez vos coordonnées pour terminer la simulation.'
    ];
    if (annoncer && annonce) annonce.textContent = `Étape ${numero + 1} sur 4 · ${textes[numero]}`;
    mettreAJourResume();
  }

  function creerBoutonJour(date, decalage) {
    const cle = cleDate(date);
    const jourSemaine = date.getUTCDay();
    const ferie = estJourFerie(date);
    const nonDocumente = jourSemaine === 0 || ferie;
    const etiquette = documentPage.createElement('label');
    etiquette.className = `day-choice${nonDocumente ? ' is-unavailable' : ''}`;
    const radio = documentPage.createElement('input');
    radio.type = 'radio';
    radio.name = 'jour-rendez-vous';
    radio.value = cle;
    radio.disabled = nonDocumente;
    radio.setAttribute('aria-label', `${jourLong(date)}${nonDocumente ? ', horaires à confirmer' : ''}`);
    radio.checked = selection.jour === cle;
    const nom = documentPage.createElement('span');
    nom.className = 'day-choice__name';
    nom.textContent = decalage === 0 ? 'auj.' : nomJour(date);
    const jour = documentPage.createElement('span');
    jour.className = 'day-choice__date';
    jour.textContent = dateCourte.format(date);
    const etat = documentPage.createElement('span');
    etat.className = 'day-choice__state';
    etat.textContent = nonDocumente ? 'à confirmer' : '\u00a0';
    etiquette.append(radio, nom, jour, etat);
    if (nonDocumente) etiquette.setAttribute('aria-label', `${jourLong(date)} · horaires à confirmer`);
    return etiquette;
  }

  function remplirJours() {
    const liste = selecteur('#liste-jours');
    if (!liste) return;
    const fragment = documentPage.createDocumentFragment();
    for (let decalage = 0; decalage < 14; decalage += 1) fragment.append(creerBoutonJour(dateParis(decalage), decalage));
    liste.replaceChildren(fragment);
  }

  function estIndisponibleDansLaDemonstration(cle, prestation, minutes) {
    const texte = `${cle}|${prestation}|${minutes}`;
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) valeur = (valeur * 31 + texte.charCodeAt(index)) >>> 0;
    return valeur % 9 === 0;
  }

  function creerBoutonHeure(minutes, cle, raison) {
    const etiquette = documentPage.createElement('label');
    const bloquee = Boolean(raison);
    etiquette.className = `time-choice${bloquee ? ' is-unavailable' : ''}`;
    const radio = documentPage.createElement('input');
    radio.type = 'radio';
    radio.name = 'heure-rendez-vous';
    radio.value = String(minutes);
    radio.disabled = bloquee;
    radio.checked = selection.heure === minutes;
    const texte = heureFrancaise(minutes);
    radio.setAttribute('aria-label', raison ? `${texte}, ${raison}` : texte);
    const valeur = documentPage.createElement('span');
    valeur.textContent = texte;
    const etat = documentPage.createElement('span');
    etat.className = 'time-choice__state';
    etat.textContent = raison.includes('passé') ? 'passé' : raison ? 'indisponible · démo' : '\u00a0';
    etiquette.append(radio, valeur, etat);
    if (selection.heure === minutes) etiquette.classList.add('is-selected');
    return etiquette;
  }

  function remplirHeures() {
    const liste = selecteur('#liste-heures');
    const jourSelectionne = selecteur('#jour-selectionne');
    const prestation = lirePrestation();
    liste.replaceChildren();
    if (!selection.jour || !prestation) {
      liste.textContent = 'Choisissez d’abord une prestation et un jour.';
      return;
    }
    const date = new Date(`${selection.jour}T12:00:00Z`);
    const cle = selection.jour;
    const aujourdHui = aujourdhuiParis();
    const cleAujourdhui = `${aujourdHui.annee}-${deuxChiffres(aujourdHui.mois)}-${deuxChiffres(aujourdHui.jour)}`;
    const estAujourdhui = cle === cleAujourdhui;
    const premierCreneau = 10 * 60;
    const fin = 19 * 60;
    const fragment = documentPage.createDocumentFragment();
    for (let minutes = premierCreneau; minutes + prestation.duree <= fin; minutes += 30) {
      let raison = '';
      if (estAujourdhui && minutes <= aujourdHui.minutes) raison = 'horaire passé';
      else if (estIndisponibleDansLaDemonstration(cle, selection.prestation, minutes)) raison = 'indisponible dans la simulation';
      fragment.append(creerBoutonHeure(minutes, cle, raison));
    }
    liste.append(fragment);
    if (jourSelectionne) jourSelectionne.textContent = `Créneaux de démonstration pour le ${jourLong(date)} · entre 10 h et 19 h. Les heures barrées sont indisponibles dans cette démonstration, pas dans le planning réel.`;
  }

  function basculerErreur(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  function validerEtape(numero) {
    const prestation = lirePrestation();
    if (numero === 0) {
      const ok = Boolean(prestation);
      basculerErreur(selecteur('#erreur-prestation'), !ok);
      if (ok) afficherEtape(1);
      return ok;
    }
    if (numero === 1) {
      const ok = Boolean(selection.jour);
      basculerErreur(selecteur('#erreur-jour'), !ok);
      if (ok) { remplirHeures(); afficherEtape(2); }
      return ok;
    }
    if (numero === 2) {
      const ok = selection.heure !== null;
      basculerErreur(selecteur('#erreur-heure'), !ok);
      if (ok) afficherEtape(3);
      return ok;
    }
    return false;
  }

  function mettreAJourJourEtHeure() {
    selectionneurs('#liste-jours .day-choice').forEach((etiquette) => {
      const radio = selecteur('input', etiquette);
      etiquette.classList.toggle('is-selected', Boolean(radio && radio.checked));
    });
    selectionneurs('#liste-heures .time-choice').forEach((etiquette) => {
      const radio = selecteur('input', etiquette);
      etiquette.classList.toggle('is-selected', Boolean(radio && radio.checked));
    });
  }

  function dateHeureParisEnUTC(cle, minutes) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    const valeurInitiale = Date.UTC(annee, mois - 1, jour, heures, reste);
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(valeurInitiale));
    const valeurs = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    const heureParisEnUTC = Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), Number(valeurs.hour) % 24, Number(valeurs.minute), Number(valeurs.second));
    return new Date(valeurInitiale - (heureParisEnUTC - valeurInitiale));
  }

  function ligneCalendrier(date) {
    return date.toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z');
  }

  function telechargerCalendrier() {
    const prestation = lirePrestation();
    if (!prestation || !selection.jour || selection.heure === null) return;
    const debut = dateHeureParisEnUTC(selection.jour, selection.heure);
    const fin = new Date(debut.getTime() + prestation.duree * 60000);
    const maintenant = ligneCalendrier(new Date());
    const uid = `${selection.jour}-${selection.heure}@apercu-captain-barber`;
    const contenu = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Captain Barber//FR',
      'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', `UID:${uid}`,
      `DTSTAMP:${maintenant}`, `DTSTART:${ligneCalendrier(debut)}`, `DTEND:${ligneCalendrier(fin)}`,
      'SUMMARY:Rendez-vous simulé · Captain Barber',
      'DESCRIPTION:Simulation uniquement. Aucune réservation n’a été envoyée. Pour confirmer, consultez Planity : https://www.planity.com/captain-barber-83000-toulon',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
    const adresseFichier = URL.createObjectURL(fichier);
    const lien = documentPage.createElement('a');
    lien.href = adresseFichier;
    lien.download = 'rendez-vous-simule-captain-barber.ics';
    lien.click();
    windowPage.setTimeout(() => URL.revokeObjectURL(adresseFichier), 1000);
  }

  function terminerSimulation() {
    const prenom = selecteur('#prenom');
    const telephone = selecteur('#telephone');
    const erreurPrenom = selecteur('#erreur-prenom');
    const erreurTelephone = selecteur('#erreur-telephone');
    const nomValide = Boolean(prenom.value.trim());
    const telephoneNettoye = telephone.value.trim();
    const telephoneValide = /^(?:(?:\+|00)33|0)\s?[67](?:[\s.-]?\d{2}){4}$/.test(telephoneNettoye);
    basculerErreur(erreurPrenom, !nomValide);
    basculerErreur(erreurTelephone, !telephoneValide);
    prenom.setAttribute('aria-invalid', String(!nomValide));
    telephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (!nomValide || !telephoneValide) {
      annonce.textContent = 'Vérifiez les champs indiqués pour terminer la simulation.';
      (nomValide ? telephone : prenom).focus();
      return;
    }
    const prestation = lirePrestation();
    const date = new Date(`${selection.jour}T12:00:00Z`);
    selection.prenom = prenom.value.trim();
    selection.telephone = telephoneNettoye;
    const texteConfirmation = `${selection.prenom}, votre sélection de démonstration : ${prestation.nom}, le ${jourLong(date)} à ${heureFrancaise(selection.heure)}. Rien n’a été transmis à Captain Barber.`;
    selecteur('#message-confirmation').textContent = texteConfirmation;
    panneaux.forEach((panneau) => { panneau.hidden = true; panneau.classList.remove('is-current', 'is-entering'); });
    selecteur('#confirmation').hidden = false;
    reservationTerminee = true;
    annonce.textContent = 'Simulation terminée. Rien n’a été envoyé.';
    mettreAJourResume();
    selecteur('#confirmation h3').focus({ preventScroll: true });
  }

  if (formulaire) {
    remplirJours();
    panneaux[0].classList.add('is-current');
    formulaire.addEventListener('change', (evenement) => {
      const cible = evenement.target;
      if (cible.matches('input[name="prestation"]')) {
        selection.prestation = cible.value;
        selection.heure = null;
        remplirHeures();
        basculerErreur(selecteur('#erreur-prestation'), false);
        mettreAJourResume();
      } else if (cible.matches('input[name="jour-rendez-vous"]')) {
        selection.jour = cible.value;
        selection.heure = null;
        remplirHeures();
        basculerErreur(selecteur('#erreur-jour'), false);
        basculerErreur(selecteur('#erreur-heure'), false);
        mettreAJourJourEtHeure();
        mettreAJourResume();
      } else if (cible.matches('input[name="heure-rendez-vous"]')) {
        selection.heure = Number(cible.value);
        basculerErreur(selecteur('#erreur-heure'), false);
        mettreAJourJourEtHeure();
        mettreAJourResume();
      }
    });
    formulaire.addEventListener('click', (evenement) => {
      const suivant = evenement.target.closest('[data-suivant]');
      const precedent = evenement.target.closest('[data-precedent]');
      if (suivant) validerEtape(etapeCourante);
      if (precedent) afficherEtape(Math.max(0, etapeCourante - 1));
    });
    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      terminerSimulation();
    });
    formulaire.addEventListener('input', (evenement) => {
      const cible = evenement.target;
      if (cible.id === 'prenom') {
        selection.prenom = cible.value.trim();
        if (selection.prenom) {
          basculerErreur(selecteur('#erreur-prenom'), false);
          cible.setAttribute('aria-invalid', 'false');
        }
        mettreAJourResume();
      }
      if (cible.id === 'telephone') {
        const valide = /^(?:(?:\+|00)33|0)\s?[67](?:[\s.-]?\d{2}){4}$/.test(cible.value.trim());
        if (valide) {
          basculerErreur(selecteur('#erreur-telephone'), false);
          cible.setAttribute('aria-invalid', 'false');
        }
      }
    });
  }

  selectionneurs('[data-choix]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const radio = selecteur(`#choix-${lien.dataset.choix}`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  selectionneurs('[data-retour-etape]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.retourEtape)));
  });

  const boutonAgenda = selecteur('#ajouter-agenda');
  if (boutonAgenda) boutonAgenda.addEventListener('click', telechargerCalendrier);

  const menuBouton = selecteur('.menu-toggle');
  const menuMobile = selecteur('#menu-mobile');
  if (menuBouton && menuMobile) {
    const fermerMenu = (rendreFocus = false) => {
      menuBouton.setAttribute('aria-expanded', 'false');
      menuBouton.setAttribute('aria-label', 'Ouvrir le menu de navigation');
      menuMobile.hidden = true;
      if (rendreFocus) menuBouton.focus();
    };
    menuBouton.addEventListener('click', () => {
      const ouvert = menuBouton.getAttribute('aria-expanded') === 'true';
      if (ouvert) {
        fermerMenu(true);
      } else {
        menuBouton.setAttribute('aria-expanded', 'true');
        menuBouton.setAttribute('aria-label', 'Fermer le menu de navigation');
        menuMobile.hidden = false;
        const premierLien = selecteur('a', menuMobile);
        if (premierLien) premierLien.focus();
      }
    });
    menuMobile.addEventListener('click', (evenement) => {
      const lien = evenement.target.closest('a[href^="#"]');
      if (!lien) return;
      fermerMenu(false);
      const destination = documentPage.getElementById(lien.getAttribute('href').slice(1));
      const titre = destination && selecteur('h1, h2, h3', destination);
      if (titre) {
        titre.setAttribute('tabindex', '-1');
        windowPage.setTimeout(() => titre.focus({ preventScroll: true }), 0);
      }
    });
    documentPage.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    windowPage.matchMedia('(min-width: 900px)').addEventListener('change', (evenement) => {
      if (evenement.matches && menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    });
  }

  const entrees = [
    ...selectionneurs('.visit-list'),
    ...selectionneurs('.service-row'),
    ...selectionneurs('.ritual-art'),
    ...selectionneurs('.street-figure')
  ];
  if ('IntersectionObserver' in windowPage) {
    const observateur = new IntersectionObserver((entreesObservees, instance) => {
      entreesObservees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible', 'is-drawn');
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    entrees.forEach((element) => observateur.observe(element));
  } else {
    entrees.forEach((element) => element.classList.add('is-visible', 'is-drawn'));
  }

  const barreMobile = selecteur('[data-bar]');
  const heros = selecteur('#accueil');
  const zoneReservation = selecteur('#reservation');
  const piedPage = selecteur('#pied');
  if (barreMobile && heros && zoneReservation && piedPage && 'IntersectionObserver' in windowPage) {
    let herosVisible = true;
    let reservationVisible = false;
    let piedVisible = false;
    const observateurBarre = new IntersectionObserver((entreesObservees) => {
      entreesObservees.forEach((entree) => {
        if (entree.target === heros) herosVisible = entree.isIntersecting;
        if (entree.target === zoneReservation) reservationVisible = entree.isIntersecting;
        if (entree.target === piedPage) piedVisible = entree.isIntersecting;
      });
      const visible = !herosVisible && !reservationVisible && !piedVisible;
      barreMobile.hidden = !visible;
      barreMobile.classList.toggle('is-visible', visible);
      documentPage.body.classList.toggle('has-mobile-bar', visible);
    }, { threshold: 0.04 });
    observateurBarre.observe(heros);
    observateurBarre.observe(zoneReservation);
    observateurBarre.observe(piedPage);
  }

  windowPage.requestAnimationFrame(() => windowPage.requestAnimationFrame(() => documentPage.body.classList.add('is-ready')));
  if (motionReduite.matches) documentPage.body.classList.add('is-ready');
  mettreAJourResume();
})();
