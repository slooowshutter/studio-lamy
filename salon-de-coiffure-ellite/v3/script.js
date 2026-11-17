(() => {
  'use strict';

  const documentRacine = document.documentElement;
  documentRacine.classList.add('js');
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selecteur = (requete, parent = document) => parent.querySelector(requete);
  const tous = (requete, parent = document) => Array.from(parent.querySelectorAll(requete));
  const espaceFine = '\u202f';
  const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const heureParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const horaires = {
    0: null,
    1: null,
    2: [540, 1140],
    3: [540, 1140],
    4: [540, 1140],
    5: [540, 1140],
    6: [540, 1020]
  };

  function dateActuelleParis() {
    const morceaux = {};
    for (const morceau of heureParis.formatToParts(new Date())) morceaux[morceau.type] = morceau.value;
    const date = new Date(Date.UTC(Number(morceaux.year), Number(morceaux.month) - 1, Number(morceaux.day), 12));
    return { date, minutes: Number(morceaux.hour) * 60 + Number(morceaux.minute) };
  }

  const ajouterJours = (date, nombre) => new Date(date.getTime() + nombre * 86400000);
  const cleDate = (date) => date.toISOString().slice(0, 10);
  const premiereMajuscule = (mot) => mot.charAt(0).toLocaleUpperCase('fr-FR') + mot.slice(1);
  const nomJour = (date) => premiereMajuscule(jourLong.format(date));
  const heureLisible = (minutes) => {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste ? `${heures}${espaceFine}h${espaceFine}${String(reste).padStart(2, '0')}` : `${heures}${espaceFine}h`;
  };
  const heureValeur = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const empreinte = (texte) => {
    let resultat = 2166136261;
    for (let index = 0; index < texte.length; index += 1) {
      resultat ^= texte.charCodeAt(index);
      resultat = Math.imul(resultat, 16777619);
    }
    return resultat >>> 0;
  };

  /* Navigation compacte : panneau simple, sans piège de focus. */
  const boutonMenu = selecteur('.bouton-menu');
  const menuMobile = selecteur('#navigation-mobile');
  if (boutonMenu && menuMobile) {
    const fermerMenu = (rendreFocus) => {
      boutonMenu.setAttribute('aria-expanded', 'false');
      boutonMenu.setAttribute('aria-label', 'Ouvrir le menu de navigation');
      menuMobile.hidden = true;
      menuMobile.classList.remove('est-ouvert');
      if (rendreFocus) boutonMenu.focus();
    };
    boutonMenu.addEventListener('click', () => {
      const ouvrir = boutonMenu.getAttribute('aria-expanded') !== 'true';
      boutonMenu.setAttribute('aria-expanded', String(ouvrir));
      boutonMenu.setAttribute('aria-label', ouvrir ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
      menuMobile.hidden = !ouvrir;
      if (ouvrir) {
        menuMobile.classList.add('est-ouvert');
        selecteur('a', menuMobile)?.focus();
      }
    });
    menuMobile.addEventListener('click', (evenement) => {
      const lien = evenement.target.closest('a');
      if (!lien) return;
      const destination = lien.getAttribute('href') || '';
      fermerMenu(!destination.startsWith('#'));
      if (destination.startsWith('#')) {
        requestAnimationFrame(() => document.getElementById(destination.slice(1))?.focus({ preventScroll: true }));
      }
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (evenement) => {
      if (evenement.matches && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    });
  }

  /* Les blocs apparaissent une seule fois, avec un mouvement propre à leur forme. */
  const blocsReveles = tous('[data-revele]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, observation) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          observation.unobserve(entree.target);
        }
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0 });
    blocsReveles.forEach((bloc) => observateur.observe(bloc));
  } else {
    blocsReveles.forEach((bloc) => bloc.classList.add('est-visible'));
  }

  const formulaire = selecteur('#formulaire-rendezvous');
  if (!formulaire) return;

  const etat = { etape: 1, maximum: 1, jour: null, heure: null, prenom: '' };
  const dureeMinutes = 90;
  const nombreJours = 14;
  const boutonsEtape = tous('[data-aller-etape]', formulaire);
  const panneaux = tous('[data-etape]', formulaire);
  const annonce = selecteur('[data-annonce]', formulaire);
  const champPrenom = selecteur('#prenom', formulaire);
  const champTelephone = selecteur('#telephone', formulaire);
  const groupeJours = selecteur('[data-choix-jours]', formulaire);
  const groupeHeures = selecteur('[data-choix-heures]', formulaire);
  const panneauConfirmation = selecteur('[data-confirmation]', formulaire);
  const maintenantParis = dateActuelleParis();
  let minuteurEtape = 0;
  let minuteurFocusEtape = 0;
  let versionEtape = 0;
  const jours = Array.from({ length: nombreJours }, (_, index) => {
    const date = ajouterJours(maintenantParis.date, index);
    return { index, date, cle: cleDate(date), semaine: date.getUTCDay(), heures: horaires[date.getUTCDay()] };
  });
  const nomPrestation = () => selecteur('input[name="prestation"]:checked', formulaire)?.dataset.nomPrestation || '';
  const heuresPrestation = () => Number(selecteur('input[name="prestation"]:checked', formulaire)?.dataset.duree || dureeMinutes);

  function annoncer(texte) {
    annonce.textContent = '';
    window.setTimeout(() => { annonce.textContent = texte; }, 20);
  }

  function actualiserSelection() {
    selecteur('[data-selection-prestation]', formulaire).textContent = nomPrestation() || 'Choisissez la prestation';
    selecteur('[data-selection-jour]', formulaire).textContent = etat.jour ? nomJour(etat.jour.date) : 'Choisissez un jour';
    selecteur('[data-selection-heure]', formulaire).textContent = etat.heure ? `À ${heureLisible(Number(etat.heure.split(':')[0]) * 60 + Number(etat.heure.split(':')[1]))}` : 'Choisissez une heure';
  }

  function creerChoixJour(jour) {
    const etiquette = document.createElement('label');
    etiquette.className = 'choix-jour';
    const champ = document.createElement('input');
    champ.type = 'radio';
    champ.name = 'jour';
    champ.value = jour.cle;
    champ.disabled = !jour.heures;
    champ.setAttribute('aria-label', nomJour(jour.date));
    const contenu = document.createElement('span');
    contenu.className = 'choix-jour__contenu';
    const semaine = document.createElement('span');
    semaine.className = 'choix-jour__semaine';
    semaine.textContent = jourCourt.format(jour.date).replace('.', '');
    const date = document.createElement('span');
    date.className = 'choix-jour__date';
    date.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(jour.date);
    const mois = document.createElement('span');
    mois.className = jour.heures ? 'choix-jour__mois' : 'choix-jour__ferme';
    mois.textContent = jour.heures ? moisCourt.format(jour.date).replace('.', '') : 'Fermé';
    contenu.append(semaine, date, mois);
    etiquette.append(champ, contenu);
    champ.addEventListener('change', () => {
      etat.jour = jour;
      etat.heure = null;
      selecteur('[data-erreur-jour]', formulaire).hidden = true;
      actualiserSelection();
      dessinerHeures(jour);
    });
    return etiquette;
  }

  function dessinerJours() {
    jours.forEach((jour) => groupeJours.append(creerChoixJour(jour)));
  }

  function creerChoixHeure(jour, minutes, numero) {
    const valeur = heureValeur(minutes);
    const heurePasse = jour.index === 0 && minutes <= maintenantParis.minutes + 15;
    const indisponibleFictif = !heurePasse && numero > 0 && empreinte(`${jour.cle}/${valeur}/ellite`) % 5 === 0;
    const etiquette = document.createElement('label');
    etiquette.className = 'choix-heure';
    const champ = document.createElement('input');
    champ.type = 'radio';
    champ.name = 'heure';
    champ.value = valeur;
    champ.disabled = heurePasse || indisponibleFictif;
    champ.setAttribute('aria-label', heurePasse ? `${heureLisible(minutes)}, créneau déjà passé` : indisponibleFictif ? `${heureLisible(minutes)}, indisponible dans cette simulation` : heureLisible(minutes));
    const contenu = document.createElement('span');
    contenu.className = 'choix-heure__contenu';
    const texte = document.createElement('span');
    texte.textContent = heureLisible(minutes);
    contenu.append(texte);
    if (heurePasse || indisponibleFictif) {
      const etatTexte = document.createElement('span');
      etatTexte.className = 'choix-heure__etat';
      etatTexte.textContent = heurePasse ? 'Déjà passé' : 'Indisponible dans la simulation';
      contenu.append(etatTexte);
    }
    etiquette.append(champ, contenu);
    champ.addEventListener('change', () => {
      etat.heure = valeur;
      selecteur('[data-erreur-heure]', formulaire).hidden = true;
      actualiserSelection();
    });
    return etiquette;
  }

  function dessinerHeures(jour) {
    groupeHeures.replaceChildren();
    etat.heure = null;
    if (!jour || !jour.heures) return;
    const [ouverture, fermeture] = jour.heures;
    let numero = 0;
    let heuresDisponibles = 0;
    for (let minutes = ouverture; minutes + heuresPrestation() <= fermeture; minutes += 30) {
      const choix = creerChoixHeure(jour, minutes, numero);
      if (!selecteur('input', choix).disabled) heuresDisponibles += 1;
      groupeHeures.append(choix);
      numero += 1;
    }
    if (heuresDisponibles === 0) {
      const aide = document.createElement('p');
      aide.className = 'panneau-etape__aide';
      aide.textContent = jour.index === 0 ? 'Aucun créneau futur ne reste aujourd’hui dans cette simulation. Choisissez un autre jour.' : 'Aucun créneau disponible dans cette simulation. Choisissez un autre jour.';
      groupeHeures.append(aide);
    }
  }

  function boutonEtapeCourante() {
    boutonsEtape.forEach((bouton) => {
      const numero = Number(bouton.dataset.allerEtape);
      if (numero <= etat.maximum) bouton.disabled = false;
      else bouton.disabled = true;
      if (numero === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function allerAEtape(numero) {
    if (numero < 1 || numero > 5 || numero > etat.maximum) return;
    window.clearTimeout(minuteurEtape);
    window.clearTimeout(minuteurFocusEtape);
    const versionCourante = ++versionEtape;
    const ancien = selecteur(`[data-etape="${etat.etape}"]`, formulaire);
    const suivant = selecteur(`[data-etape="${numero}"]`, formulaire);
    panneaux.forEach((panneau) => {
      panneau.classList.remove('est-sortie', 'est-entree');
      if (panneau !== ancien && panneau !== suivant) panneau.hidden = true;
    });
    if (ancien !== suivant) {
      if (reduireMouvement.matches) {
        ancien.hidden = true;
        suivant.hidden = false;
      } else {
        ancien.hidden = false;
        suivant.hidden = false;
        ancien.classList.add('est-sortie');
        suivant.classList.add('est-entree');
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (versionCourante === versionEtape) suivant.classList.remove('est-entree');
        }));
        minuteurEtape = window.setTimeout(() => {
          if (versionCourante !== versionEtape) return;
          ancien.hidden = true;
          ancien.classList.remove('est-sortie');
          suivant.classList.remove('est-entree');
        }, 230);
      }
    }
    etat.etape = numero;
    boutonEtapeCourante();
    if (numero === 5) remplirRecapitulatif();
    const titre = selecteur('h3', suivant);
    minuteurFocusEtape = window.setTimeout(() => {
      if (versionCourante === versionEtape) titre?.focus();
    }, ancien === suivant || reduireMouvement.matches ? 0 : 230);
    annoncer(`Étape ${numero} sur 5 : ${selecteur('h3', suivant)?.textContent || ''}`);
  }

  function validerJour() {
    const erreur = selecteur('[data-erreur-jour]', formulaire);
    if (!etat.jour || !etat.jour.heures) {
      erreur.hidden = false;
      selecteur('legend', groupeJours).focus();
      return false;
    }
    erreur.hidden = true;
    return true;
  }

  function validerHeure() {
    const erreur = selecteur('[data-erreur-heure]', formulaire);
    const champ = selecteur('input[name="heure"]:checked', formulaire);
    if (!etat.heure || !champ || champ.disabled) {
      erreur.hidden = false;
      selecteur('legend', groupeHeures).focus();
      return false;
    }
    erreur.hidden = true;
    return true;
  }

  function numeroMobileValide(valeur) {
    const numerique = valeur.replace(/[.\s()/-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(numerique);
  }

  function validerCoordonnees(placerFocus = true) {
    const prenomErreur = selecteur('#erreur-prenom');
    const telephoneErreur = selecteur('#erreur-telephone');
    const prenom = champPrenom.value.trim();
    const telephoneValide = numeroMobileValide(champTelephone.value.trim());
    const prenomValide = prenom.length > 0;
    prenomErreur.hidden = prenomValide;
    telephoneErreur.hidden = telephoneValide;
    champPrenom.setAttribute('aria-invalid', String(!prenomValide));
    champTelephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (!prenomValide && placerFocus) {
      champPrenom.focus();
      return false;
    }
    if (!telephoneValide && placerFocus) {
      champTelephone.focus();
      return false;
    }
    if (!prenomValide || !telephoneValide) return false;
    etat.prenom = prenom;
    return true;
  }

  function remplirRecapitulatif() {
    selecteur('[data-recap-prestation]', formulaire).textContent = nomPrestation();
    selecteur('[data-recap-jour]', formulaire).textContent = etat.jour ? nomJour(etat.jour.date) : '';
    const minutes = etat.heure ? Number(etat.heure.slice(0, 2)) * 60 + Number(etat.heure.slice(3)) : 0;
    selecteur('[data-recap-heure]', formulaire).textContent = etat.heure ? heureLisible(minutes) : '';
    selecteur('[data-recap-prenom]', formulaire).textContent = etat.prenom;
  }

  function verifierAvantRecapitulatif() {
    if (!etat.jour || !etat.jour.heures) {
      etat.maximum = Math.max(etat.maximum, 2);
      selecteur('[data-erreur-jour]', formulaire).hidden = false;
      allerAEtape(2);
      return false;
    }
    const choixHeure = selecteur('input[name="heure"]:checked', formulaire);
    if (!etat.heure || !choixHeure || choixHeure.disabled) {
      etat.maximum = Math.max(etat.maximum, 3);
      selecteur('[data-erreur-heure]', formulaire).hidden = false;
      allerAEtape(3);
      return false;
    }
    if (!validerCoordonnees(false)) {
      etat.maximum = Math.max(etat.maximum, 4);
      allerAEtape(4);
      const versionCourante = versionEtape;
      window.setTimeout(() => {
        if (versionCourante === versionEtape) (champPrenom.getAttribute('aria-invalid') === 'true' ? champPrenom : champTelephone).focus();
      }, reduireMouvement.matches ? 0 : 240);
      return false;
    }
    return true;
  }

  function montrerConfirmation() {
    if (!verifierAvantRecapitulatif()) return;
    window.clearTimeout(minuteurEtape);
    window.clearTimeout(minuteurFocusEtape);
    versionEtape += 1;
    remplirRecapitulatif();
    panneaux.forEach((panneau) => { panneau.hidden = true; });
    panneauConfirmation.hidden = false;
    boutonsEtape.forEach((bouton) => { bouton.disabled = true; bouton.removeAttribute('aria-current'); });
    const minutes = Number(etat.heure.slice(0, 2)) * 60 + Number(etat.heure.slice(3));
    const message = `Le parcours simulé affiche une demande de ${nomPrestation().toLocaleLowerCase('fr-FR')} pour ${etat.prenom}, le ${nomJour(etat.jour.date)} à ${heureLisible(minutes)}.`;
    selecteur('[data-message-confirmation]', formulaire).textContent = message;
    selecteur('h3', panneauConfirmation).focus();
    annoncer('Simulation terminée. Aucun rendez-vous ni message n’a été envoyé.');
  }

  function recommencer() {
    window.clearTimeout(minuteurEtape);
    window.clearTimeout(minuteurFocusEtape);
    versionEtape += 1;
    etat.etape = 1;
    etat.maximum = 1;
    etat.jour = null;
    etat.heure = null;
    etat.prenom = '';
    formulaire.reset();
    selecteur('input[name="prestation"]', formulaire).checked = true;
    panneauConfirmation.hidden = true;
    panneaux.forEach((panneau) => {
      panneau.hidden = panneau.dataset.etape !== '1';
      panneau.classList.remove('est-sortie', 'est-entree');
    });
    selecteur('[data-erreur-jour]', formulaire).hidden = true;
    selecteur('[data-erreur-heure]', formulaire).hidden = true;
    selecteur('#erreur-prenom').hidden = true;
    selecteur('#erreur-telephone').hidden = true;
    champPrenom.removeAttribute('aria-invalid');
    champTelephone.removeAttribute('aria-invalid');
    dessinerHeures(null);
    actualiserSelection();
    boutonEtapeCourante();
    selecteur('#titre-etape-1').focus();
    annoncer('Simulation recommencée à la première étape.');
  }

  tous('[data-etape-suivante]', formulaire).forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etat.etape === 2 && !validerJour()) return;
      if (etat.etape === 3 && !validerHeure()) return;
      if (etat.etape === 4 && !validerCoordonnees()) return;
      const prochaineEtape = Math.min(5, etat.etape + 1);
      etat.maximum = Math.max(etat.maximum, prochaineEtape);
      actualiserSelection();
      allerAEtape(prochaineEtape);
    });
  });
  tous('[data-etape-precedente]', formulaire).forEach((bouton) => bouton.addEventListener('click', () => allerAEtape(Math.max(1, etat.etape - 1))));
  boutonsEtape.forEach((bouton) => bouton.addEventListener('click', () => {
    const numero = Number(bouton.dataset.allerEtape);
    if (numero === 5 && !verifierAvantRecapitulatif()) return;
    allerAEtape(numero);
  }));
  selecteur('[data-confirmer]', formulaire).addEventListener('click', montrerConfirmation);
  selecteur('[data-recommencer]', formulaire).addEventListener('click', recommencer);
  formulaire.addEventListener('submit', (evenement) => evenement.preventDefault());
  selecteur('input[name="prestation"]', formulaire).addEventListener('change', actualiserSelection);

  dessinerJours();
  actualiserSelection();
  boutonEtapeCourante();
})();
