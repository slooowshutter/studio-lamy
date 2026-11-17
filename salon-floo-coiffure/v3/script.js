(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');
  const un = (selecteur, parent = doc) => parent.querySelector(selecteur);
  const tous = (selecteur, parent = doc) => Array.from(parent.querySelectorAll(selecteur));
  const margeFine = '\u00a0';
  racine.classList.add('js');

  /* Un seul panneau ouvert ; tous les contenus restent présents dans le document. */
  const panneaux = tous('[data-panneau]');
  function ouvrirPanneau(panneau, donnerFocus = false) {
    panneaux.forEach((element) => {
      const ouvert = element === panneau;
      element.classList.toggle('est-ouvert', ouvert);
      const bouton = un('.panneau__declencheur', element);
      const corps = un('.panneau__corps', element);
      bouton.setAttribute('aria-expanded', String(ouvert));
      corps.inert = !ouvert;
    });
    if (donnerFocus && panneau) {
      const bouton = un('.panneau__declencheur', panneau);
      window.requestAnimationFrame(() => bouton.focus({ preventScroll: true }));
    }
  }
  panneaux.forEach((panneau) => {
    const bouton = un('.panneau__declencheur', panneau);
    bouton.addEventListener('click', () => {
      ouvrirPanneau(panneau.classList.contains('est-ouvert') ? null : panneau);
    });
  });
  const panneauInitial = un('.panneau.est-ouvert');
  ouvrirPanneau(panneauInitial);

  /* Les liens vers un chapitre l’ouvrent avant le déplacement du navigateur. */
  const boutonMenu = un('.bouton-menu');
  const menuTelephone = un('#menu-telephone');
  function reglerMenu(ouvert, rendreFocus = false) {
    if (!boutonMenu || !menuTelephone) return;
    boutonMenu.setAttribute('aria-expanded', String(ouvert));
    boutonMenu.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    menuTelephone.hidden = !ouvert;
    if (rendreFocus) boutonMenu.focus();
  }
  if (boutonMenu && menuTelephone) {
    boutonMenu.addEventListener('click', () => {
      reglerMenu(boutonMenu.getAttribute('aria-expanded') !== 'true');
    });
    doc.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') {
        reglerMenu(false, true);
      }
    });
  }
  tous('[data-ouvrir]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const panneau = un(`#${CSS.escape(lien.dataset.ouvrir)}`);
      if (panneau) ouvrirPanneau(panneau, true);
      if (menuTelephone && !menuTelephone.hidden) reglerMenu(false);
    });
  });

  /* Révélations rares, observées une fois ; sans prise en charge, le contenu reste visible. */
  if ('IntersectionObserver' in window) {
    racine.classList.add('reveils');
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -24px 0px' });
    tous('[data-reveler]').forEach((element) => observateur.observe(element));
  }

  /* Horaires issus des répertoires ; le jeudi retient la borne commune de 19 h. */
  const horaires = {
    0: null,
    1: null,
    2: { ouverture: 9 * 60, fermeture: 19 * 60 },
    3: { ouverture: 9 * 60, fermeture: 19 * 60 },
    4: { ouverture: 9 * 60, fermeture: 19 * 60 },
    5: { ouverture: 9 * 60, fermeture: 19 * 60 },
    6: { ouverture: 9 * 60, fermeture: 18 * 60 }
  };
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const formatterParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formatterJour = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const formatterCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const deuxChiffres = (nombre) => String(nombre).padStart(2, '0');
  function maintenantParis() {
    const parties = Object.fromEntries(formatterParis.formatToParts(new Date()).map((partie) => [partie.type, partie.value]));
    const date = new Date(Date.UTC(+parties.year, +parties.month - 1, +parties.day, 12));
    return { date, minute: (+parties.hour % 24) * 60 + +parties.minute };
  }
  const dateIso = (date) => date.toISOString().slice(0, 10);
  const dateTexte = (date) => {
    const texte = formatterJour.format(date);
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  };
  const heureTexte = (minute) => `${deuxChiffres(Math.floor(minute / 60))}${margeFine}h${margeFine}${deuxChiffres(minute % 60)}`;
  const ajouterJours = (date, nombre) => new Date(date.getTime() + nombre * 86400000);

  const formulaire = un('#formulaire-rdv');
  if (!formulaire) return;

  const listeJours = un('[data-choix-jour]', formulaire);
  const listeHeures = un('[data-choix-heure]', formulaire);
  const annonce = un('[data-annonce]', formulaire);
  const selectionPrestation = un('[data-selection-prestation]');
  const selectionJour = un('[data-selection-jour]');
  const selectionHeure = un('[data-selection-heure]');
  const recapitulatif = un('[data-recapitulatif]', formulaire);
  const etapesNavigation = tous('[data-aller]', formulaire);
  const etapes = tous('[data-etape]', formulaire);
  const champNom = un('#nom', formulaire);
  const champTelephone = un('#telephone', formulaire);
  const etat = { etape: 1, prestation: '', jour: null, heure: null };
  let minuteDuJour = maintenantParis().minute;
  let minuteurMasquer;

  function joursSuivants() {
    const debut = maintenantParis().date;
    minuteDuJour = maintenantParis().minute;
    return Array.from({ length: 14 }, (_, index) => {
      const date = ajouterJours(debut, index);
      const numeroJour = date.getUTCDay();
      const plage = horaires[numeroJour];
      const heuresFutures = plage && Array.from(
        { length: Math.ceil((plage.fermeture - plage.ouverture) / 30) },
        (_, position) => plage.ouverture + position * 30
      ).some((heure) => index > 0 || heure > minuteDuJour);
      return { date, index, numeroJour, plage, ouvert: Boolean(plage && heuresFutures) };
    });
  }
  let dates = joursSuivants();

  function mettreAJourSelection() {
    selectionPrestation.textContent = etat.prestation || 'À choisir';
    const jourChoisi = dates.find((jour) => dateIso(jour.date) === etat.jour);
    selectionJour.textContent = jourChoisi ? dateTexte(jourChoisi.date) : 'Jour à choisir';
    selectionHeure.textContent = etat.heure === null ? 'Heure à choisir' : heureTexte(etat.heure);
  }

  function mettreAJourRecapitulatif() {
    recapitulatif.replaceChildren();
    if (!etat.prestation) return;
    const jourChoisi = dates.find((jour) => dateIso(jour.date) === etat.jour);
    const titre = doc.createElement('strong');
    titre.textContent = etat.prestation;
    recapitulatif.append(titre);
    if (jourChoisi) {
      const date = doc.createElement('p');
      date.textContent = dateTexte(jourChoisi.date);
      recapitulatif.append(date);
    }
    if (etat.heure !== null) {
      const heure = doc.createElement('p');
      heure.textContent = heureTexte(etat.heure);
      recapitulatif.append(heure);
    }
  }

  function etapeAccessible(numero) {
    if (numero === 1) return true;
    if (numero === 2) return Boolean(etat.prestation);
    if (numero === 3) return Boolean(etat.prestation && etat.jour);
    if (numero === 4) return Boolean(etat.prestation && etat.jour && etat.heure !== null);
    return numero === 5;
  }

  function actualiserNavigation() {
    etapesNavigation.forEach((bouton) => {
      const numeroBouton = +bouton.dataset.aller;
      if (numeroBouton === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      bouton.disabled = etat.etape === 5 || !etapeAccessible(numeroBouton);
    });
  }

  function afficherEtape(numero, options = {}) {
    if (!etapeAccessible(numero)) return;
    const precedente = etat.etape;
    if (precedente === numero) return;
    etat.etape = numero;
    const ancienne = etapes.find((etape) => +etape.dataset.etape === precedente);
    const nouvelle = etapes.find((etape) => +etape.dataset.etape === numero);
    if (!nouvelle) return;
    window.clearTimeout(minuteurMasquer);
    etapes.forEach((etape) => {
      if (etape !== ancienne && etape !== nouvelle && !etape.hidden) {
        etape.hidden = true;
        etape.inert = true;
        etape.classList.remove('etape--entree', 'etape--sortie');
      }
    });
    if (ancienne && ancienne !== nouvelle && !ancienne.hidden) {
      ancienne.classList.add('etape--sortie');
      ancienne.inert = true;
      minuteurMasquer = window.setTimeout(() => {
        ancienne.hidden = true;
        ancienne.classList.remove('etape--sortie');
      }, reduire.matches ? 0 : 210);
    }
    nouvelle.classList.remove('etape--sortie');
    nouvelle.hidden = false;
    nouvelle.inert = false;
    nouvelle.classList.add('etape--entree');
    nouvelle.getBoundingClientRect();
    window.requestAnimationFrame(() => nouvelle.classList.remove('etape--entree'));
    actualiserNavigation();
    tous('[data-erreur]', formulaire).forEach((erreur) => { erreur.hidden = true; });
    if (champNom) champNom.removeAttribute('aria-invalid');
    if (champTelephone) champTelephone.removeAttribute('aria-invalid');
    mettreAJourSelection();
    mettreAJourRecapitulatif();
    if (options.annoncer !== false && annonce) {
      const libelles = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées', 5: 'la fin de la simulation' };
      annonce.textContent = numero === 5 ? 'La simulation est terminée. Aucune demande n’a été envoyée.' : `Étape ${numero} · ${libelles[numero]}.`;
    }
    const titre = un('.etape__titre', nouvelle);
    if (titre && options.focus !== false) titre.focus({ preventScroll: true });
  }

  function dessinerJours() {
    dates = joursSuivants();
    listeJours.replaceChildren();
    dates.forEach((jour) => {
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.disabled = !jour.ouvert;
      bouton.setAttribute('aria-pressed', String(etat.jour === dateIso(jour.date)));
      const court = doc.createElement('span');
      court.className = 'jour__nom';
      court.textContent = formatterCourt.format(jour.date).replace('.', '');
      const numero = doc.createElement('span');
      numero.textContent = String(jour.date.getUTCDate());
      bouton.append(court, numero);
      if (!jour.ouvert) {
        const fermeture = doc.createElement('span');
        fermeture.className = 'jour__nom';
        fermeture.textContent = 'Fermé';
        bouton.append(fermeture);
      }
      const nomComplet = dateTexte(jour.date);
      bouton.setAttribute('aria-label', jour.ouvert ? nomComplet : `${nomComplet}, fermé`);
      bouton.addEventListener('click', () => {
        etat.jour = dateIso(jour.date);
        etat.heure = null;
        tous('.jour', listeJours).forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
        afficherHeures();
        actualiserNavigation();
        mettreAJourSelection();
        mettreAJourRecapitulatif();
        un('[data-erreur="jour"]', formulaire).hidden = true;
      });
      listeJours.append(bouton);
    });
    if (etat.jour && !dates.some((jour) => dateIso(jour.date) === etat.jour && jour.ouvert)) {
      etat.jour = null;
      etat.heure = null;
    }
  }

  function afficherHeures() {
    listeHeures.replaceChildren();
    const jourChoisi = dates.find((jour) => dateIso(jour.date) === etat.jour);
    if (!jourChoisi || !jourChoisi.plage) return;
    const aujourdHui = jourChoisi.index === 0;
    const heures = [];
    for (let minute = jourChoisi.plage.ouverture; minute < jourChoisi.plage.fermeture; minute += 30) {
      if (!aujourdHui || minute > minuteDuJour) heures.push(minute);
    }
    heures.forEach((minute) => {
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      bouton.textContent = heureTexte(minute);
      bouton.setAttribute('aria-pressed', String(etat.heure === minute));
      bouton.addEventListener('click', () => {
        etat.heure = minute;
        tous('.heure', listeHeures).forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
        actualiserNavigation();
        mettreAJourSelection();
        mettreAJourRecapitulatif();
        un('[data-erreur="heure"]', formulaire).hidden = true;
      });
      listeHeures.append(bouton);
    });
    const annonceHeure = un('[data-aide-heure]', formulaire);
    const jour = jours[jourChoisi.numeroJour];
    annonceHeure.textContent = `Créneaux d’essai pour ${jour} dans les horaires publiés. Disponibilités non connectées.`;
  }

  function erreurEtape(nom, cible) {
    const message = un(`[data-erreur="${nom}"]`, formulaire);
    if (message) message.hidden = false;
    if (cible) cible.focus();
  }

  function suivant() {
    if (etat.etape === 1) {
      const choix = un('input[name="prestation"]:checked', formulaire);
      if (!choix) return erreurEtape('prestation', un('input[name="prestation"]', formulaire));
      etat.prestation = choix.value;
      dessinerJours();
      afficherEtape(2);
      return;
    }
    if (etat.etape === 2) {
      if (!etat.jour) return erreurEtape('jour', un('.jour:not(:disabled)', listeJours));
      afficherHeures();
      afficherEtape(3);
      return;
    }
    if (etat.etape === 3) {
      if (etat.heure === null) return erreurEtape('heure', un('.heure:not(:disabled)', listeHeures));
      afficherEtape(4);
    }
  }

  function telephoneValide(valeur) {
    const nettoye = valeur.replace(/[\s.()\-]/g, '');
    return /^(?:(?:\+|00)33[67]|0[67])\d{8}$/.test(nettoye);
  }

  function coordonneesValides() {
    let valide = true;
    const prenom = champNom.value.trim();
    const erreurNom = un('#erreur-nom');
    const erreurTelephone = un('#erreur-telephone');
    const nomOk = prenom.length > 0;
    const telOk = telephoneValide(champTelephone.value);
    erreurNom.hidden = nomOk;
    erreurTelephone.hidden = telOk;
    champNom.setAttribute('aria-invalid', String(!nomOk));
    champTelephone.setAttribute('aria-invalid', String(!telOk));
    if (!nomOk) { champNom.focus(); valide = false; }
    else if (!telOk) { champTelephone.focus(); valide = false; }
    return valide;
  }

  formulaire.addEventListener('click', (evenement) => {
    const suivantBouton = evenement.target.closest('[data-suivant]');
    const precedentBouton = evenement.target.closest('[data-precedent]');
    const recommencerBouton = evenement.target.closest('[data-recommencer]');
    const allerBouton = evenement.target.closest('[data-aller]');
    if (suivantBouton) suivant();
    if (precedentBouton) afficherEtape(Math.max(1, etat.etape - 1));
    if (recommencerBouton) recommencer();
    if (allerBouton && !allerBouton.disabled) afficherEtape(+allerBouton.dataset.aller);
  });

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.name !== 'prestation') return;
    etat.prestation = evenement.target.value;
    etat.jour = null;
    etat.heure = null;
    listeHeures.replaceChildren();
    actualiserNavigation();
    mettreAJourSelection();
    mettreAJourRecapitulatif();
    un('[data-erreur="prestation"]', formulaire).hidden = true;
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape !== 4 || !etat.prestation || !etat.jour || etat.heure === null || !coordonneesValides()) return;
    const jourChoisi = dates.find((jour) => dateIso(jour.date) === etat.jour);
    const confirmation = un('[data-confirmation]', formulaire);
    confirmation.textContent = `Simulation pour ${etat.prestation.toLowerCase()}, le ${dateTexte(jourChoisi.date)} à ${heureTexte(etat.heure)}. Ces informations ne sont pas une réservation et n’ont pas été envoyées.`;
    afficherEtape(5);
  });

  function recommencer() {
    formulaire.reset();
    etat.prestation = '';
    etat.jour = null;
    etat.heure = null;
    dessinerJours();
    afficherEtape(1, { annoncer: false });
    listeHeures.replaceChildren();
    mettreAJourSelection();
    champNom.removeAttribute('aria-invalid');
    champTelephone.removeAttribute('aria-invalid');
  }

  dessinerJours();
  mettreAJourSelection();
  mettreAJourRecapitulatif();
})();
