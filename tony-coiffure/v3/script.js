(() => {
  'use strict';

  const documentPage = document;
  const pageRoot = document.documentElement;
  pageRoot.classList.add('js');

  const selectOne = (selector, scope = documentPage) => scope.querySelector(selector);
  const selectAll = (selector, scope = documentPage) => [...scope.querySelectorAll(selector)];
  const espaceFine = '\u00a0';
  const heuresParJour = {
    0: null,
    1: [11 * 60, 18 * 60],
    2: [9 * 60 + 30, 18 * 60 + 30],
    3: [9 * 60 + 30, 18 * 60 + 30],
    4: [9 * 60 + 30, 18 * 60 + 30],
    5: [10 * 60, 18 * 60 + 30],
    6: [9 * 60 + 30, 19 * 60]
  };
  const prestations = {
    homme: { nom: 'Homme — Coupe, shampoing et coiffage', duree: 25 },
    femme: { nom: 'Femme — Coupe, soin shampoing et brushing', duree: 60 },
    racines: { nom: 'Coloration des racines PCK', duree: 60 }
  };
  const formatterParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formatterJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatterDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const formatterDateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  const etat = {
    etape: 0,
    prestation: '',
    jour: '',
    heure: -1,
    nom: '',
    telephone: '',
    transitionEnCours: false,
    minuteActuelle: 0,
    dateAujourdhui: ''
  };

  function heureDeParis() {
    const parties = {};
    formatterParis.formatToParts(new Date()).forEach((partie) => {
      parties[partie.type] = partie.value;
    });
    return {
      date: `${parties.year}-${parties.month}-${parties.day}`,
      minute: Number(parties.hour) * 60 + Number(parties.minute)
    };
  }

  function dateDepuisISO(iso) {
    const [annee, mois, jour] = iso.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function dateVersISO(date) {
    return date.toISOString().slice(0, 10);
  }

  function heureFrancais(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute === 0 ? `${heure}${espaceFine}h` : `${heure}${espaceFine}h${espaceFine}${String(minute).padStart(2, '0')}`;
  }

  function actualiserResume() {
    const nomPrestation = etat.prestation ? prestations[etat.prestation].nom : 'À choisir';
    const nomJour = etat.jour ? formatterDateLongue.format(dateDepuisISO(etat.jour)) : 'À choisir';
    const heure = etat.heure >= 0 ? heureFrancais(etat.heure) : 'À choisir';
    selectOne('[data-recap-prestation]').textContent = nomPrestation;
    selectOne('[data-recap-jour]').textContent = nomJour;
    selectOne('[data-recap-heure]').textContent = heure;
  }

  function actualiserProgression() {
    selectAll('[data-etape-retour]').forEach((bouton) => {
      const numero = Number(bouton.dataset.etapeRetour);
      bouton.disabled = numero > etat.etape;
      if (numero === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function annoncerEtape(index) {
    const titres = ['Prestation', 'Jour', 'Heure', 'Coordonnées', 'Récapitulatif'];
    const annonce = selectOne('[data-annonce-etape]');
    if (annonce) annonce.textContent = `Étape ${Math.min(index + 1, 4)} sur 4 : ${titres[index]}.`;
  }

  function afficherEtape(index, options = {}) {
    if (index === etat.etape || etat.transitionEnCours) return;
    const panneauActuel = selectOne(`[data-etape="${etat.etape}"]`);
    const panneauSuivant = selectOne(`[data-etape="${index}"]`);
    if (!panneauSuivant) return;

    const terminer = () => {
      if (panneauActuel) {
        panneauActuel.hidden = true;
        panneauActuel.classList.remove('is-sortant');
        panneauActuel.style.removeProperty('opacity');
        panneauActuel.style.removeProperty('transform');
      }
      panneauSuivant.hidden = false;
      panneauSuivant.classList.add('is-entering');
      etat.etape = index;
      actualiserProgression();
      annoncerEtape(index);
      actualiserResume();
      requestAnimationFrame(() => panneauSuivant.classList.remove('is-entering'));
      if (options.focus !== false) {
        const titre = selectOne('h3', panneauSuivant);
        window.setTimeout(() => titre && titre.focus(), mouvementReduit.matches ? 0 : 30);
      }
      etat.transitionEnCours = false;
    };

    if (!panneauActuel || panneauActuel.hidden || mouvementReduit.matches) {
      terminer();
      return;
    }
    etat.transitionEnCours = true;
    panneauActuel.classList.add('is-sortant');
    window.setTimeout(terminer, 220);
  }

  function initialiserRevelations() {
    const affiches = selectAll('.revelation');
    const nombres = new WeakSet();
    function compterUneFois(element) {
      if (nombres.has(element) || mouvementReduit.matches) return;
      nombres.add(element);
      const cible = Number(element.dataset.compte || 0);
      const depart = performance.now();
      const duree = 360;
      element.textContent = '00';
      function imageSuivante(instant) {
        const progression = Math.min(1, (instant - depart) / duree);
        const valeur = Math.round(cible * progression);
        element.textContent = String(valeur).padStart(2, '0');
        if (progression < 1) requestAnimationFrame(imageSuivante);
      }
      requestAnimationFrame(imageSuivante);
    }
    if (!('IntersectionObserver' in window)) {
      affiches.forEach((affiche) => {
        affiche.classList.add('is-visible');
        compterUneFois(selectOne('[data-compte]', affiche));
      });
      return;
    }
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        compterUneFois(selectOne('[data-compte]', entree.target));
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -7% 0px' });
    affiches.forEach((affiche) => observateur.observe(affiche));
  }

  function initialiserNavigation() {
    const bouton = selectOne('.bouton-navigation');
    const navigation = selectOne('#navigation-mobile');
    if (!bouton || !navigation) return;
    const ouvrir = (ouvert) => {
      bouton.setAttribute('aria-expanded', String(ouvert));
      bouton.querySelector('span:first-child').textContent = ouvert ? 'Fermer la navigation' : 'Ouvrir la navigation';
      bouton.querySelector('.bouton-navigation__signe').textContent = ouvert ? '−' : '＋';
      navigation.hidden = !ouvert;
      if (ouvert) selectOne('a', navigation).focus();
    };
    bouton.addEventListener('click', () => ouvrir(bouton.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) {
        ouvrir(false);
      }
    });
    documentPage.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') {
        ouvrir(false);
        bouton.focus();
      }
    });
  }

  function ajouterJours() {
    const conteneur = selectOne('[data-jours]');
    if (!conteneur) return;
    const maintenant = heureDeParis();
    etat.dateAujourdhui = maintenant.date;
    etat.minuteActuelle = maintenant.minute;
    const dateAujourdhui = dateDepuisISO(maintenant.date);

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(dateAujourdhui.getTime() + decalage * 86400000);
      const iso = dateVersISO(date);
      const jourSemaine = date.getUTCDay();
      const ferme = heuresParJour[jourSemaine] === null;
      const bouton = documentPage.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour-choix';
      bouton.dataset.jour = iso;
      bouton.disabled = ferme;
      bouton.setAttribute('aria-pressed', 'false');
      const libelleLong = formatterDateLongue.format(date);
      bouton.setAttribute('aria-label', ferme ? `${libelleLong}, fermé` : libelleLong);
      const jour = documentPage.createElement('span');
      jour.textContent = formatterJour.format(date).replace('.', '');
      const numero = documentPage.createElement('span');
      numero.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
      bouton.append(jour, numero);
      if (ferme) {
        const etatFerme = documentPage.createElement('span');
        etatFerme.textContent = 'Fermé';
        bouton.append(etatFerme);
      }
      bouton.addEventListener('click', () => {
        if (bouton.disabled) return;
        selectAll('.jour-choix', conteneur).forEach((jourBouton) => jourBouton.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        etat.jour = iso;
        etat.heure = -1;
        selectOne('[data-suivant]', selectOne('[data-etape="1"]')).disabled = false;
        rendreHeures();
        actualiserResume();
      });
      conteneur.append(bouton);
    }
  }

  function codeStable(texte) {
    let code = 2166136261;
    for (let index = 0; index < texte.length; index += 1) {
      code ^= texte.charCodeAt(index);
      code = Math.imul(code, 16777619);
    }
    return code >>> 0;
  }

  function rendreHeures() {
    const conteneur = selectOne('[data-heures]');
    if (!conteneur || !etat.jour || !etat.prestation) return;
    conteneur.replaceChildren();
    const date = dateDepuisISO(etat.jour);
    const indexJour = date.getUTCDay();
    const plages = heuresParJour[indexJour];
    const duree = prestations[etat.prestation].duree;
    const disponibilites = documentPage.createElement('p');
    disponibilites.className = 'aide-disponibilite';
    disponibilites.textContent = 'Les créneaux barrés sont indiqués comme déjà pris dans cette simulation.';
    if (!plages) {
      conteneur.append(disponibilites);
      return;
    }
    let nombrePropose = 0;
    for (let debut = plages[0]; debut + duree <= plages[1]; debut += 30) {
      if (etat.jour === etat.dateAujourdhui && debut <= etat.minuteActuelle) continue;
      nombrePropose += 1;
      const bouton = documentPage.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure-choix';
      bouton.dataset.heure = String(debut);
      const heure = heureFrancais(debut);
      const dejaPris = codeStable(`${etat.jour}-${etat.prestation}-${debut}`) % 7 === 1;
      bouton.disabled = dejaPris;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', dejaPris ? `${heure}, déjà pris dans cette simulation` : heure);
      bouton.textContent = dejaPris ? `${heure} · pris` : heure;
      bouton.addEventListener('click', () => {
        if (bouton.disabled) return;
        selectAll('.heure-choix', conteneur).forEach((heureBouton) => heureBouton.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        etat.heure = debut;
        selectOne('[data-suivant]', selectOne('[data-etape="2"]')).disabled = false;
        actualiserResume();
      });
      conteneur.append(bouton);
    }
    if (nombrePropose === 0) {
      const vide = documentPage.createElement('p');
      vide.className = 'aide-disponibilite';
      vide.textContent = 'Aucun créneau restant dans cette simulation pour ce jour.';
      conteneur.append(vide);
    }
    conteneur.append(disponibilites);
  }

  function afficherErreur(selecteur, texte) {
    const message = selectOne(selecteur);
    if (message) message.textContent = texte;
  }

  function validerCoordonnees() {
    const champPrenom = selectOne('#prenom');
    const champTelephone = selectOne('#telephone');
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const numeroNormalise = telephone.replace(/[\s().-]/g, '').replace(/^\+33/, '0');
    const prenomCorrect = prenom.length > 0;
    const telephoneCorrect = /^0[67]\d{8}$/.test(numeroNormalise);
    champPrenom.setAttribute('aria-invalid', String(!prenomCorrect));
    champTelephone.setAttribute('aria-invalid', String(!telephoneCorrect));
    afficherErreur('[data-erreur-prenom]', prenomCorrect ? '' : 'Saisissez votre prénom.');
    afficherErreur('[data-erreur-telephone]', telephoneCorrect ? '' : 'Saisissez un numéro mobile français à 10 chiffres, commençant par 06 ou 07.');
    if (!prenomCorrect) {
      champPrenom.focus();
      return null;
    }
    if (!telephoneCorrect) {
      champTelephone.focus();
      return null;
    }
    return { prenom, telephone };
  }

  function creerConfirmation() {
    const zone = selectOne('[data-confirmation]');
    zone.replaceChildren();
    const titre = documentPage.createElement('h4');
    titre.textContent = 'Votre choix';
    const liste = documentPage.createElement('dl');
    const lignes = [
      ['Prestation', prestations[etat.prestation].nom],
      ['Jour', formatterDateLongue.format(dateDepuisISO(etat.jour))],
      ['Heure', heureFrancais(etat.heure)],
      ['Prénom', etat.nom],
      ['Téléphone', etat.telephone]
    ];
    lignes.forEach(([libelle, valeur]) => {
      const ligne = documentPage.createElement('div');
      const terme = documentPage.createElement('dt');
      const detail = documentPage.createElement('dd');
      terme.textContent = libelle;
      detail.textContent = valeur;
      ligne.append(terme, detail);
      liste.append(ligne);
    });
    zone.append(titre, liste);
  }

  function dateAgenda(iso, minutes) {
    const [annee, mois, jour] = iso.split('-');
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minutesReste = String(minutes % 60).padStart(2, '0');
    return `${annee}${mois}${jour}T${heures}${minutesReste}00`;
  }

  function echapperAgenda(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function telechargerRappel() {
    const depart = dateAgenda(etat.jour, etat.heure);
    const fin = dateAgenda(etat.jour, etat.heure + prestations[etat.prestation].duree);
    const horodatage = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const contenu = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Simulation locale//FR', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:${creerIdentifiant()}@studiolamy.local`, `DTSTAMP:${horodatage}`,
      `DTSTART;TZID=Europe/Paris:${depart}`, `DTEND;TZID=Europe/Paris:${fin}`,
      `SUMMARY:${echapperAgenda(`Simulation — ${prestations[etat.prestation].nom}`)}`,
      `LOCATION:${echapperAgenda('Tony Coiffure, 224 rue de Tolbiac, 75013 Paris')}`,
      `DESCRIPTION:${echapperAgenda('Rappel issu d’une simulation de réservation. Ce fichier ne confirme aucun rendez-vous. Appeler le 01 45 89 64 61 ou réserver sur Treatwell.')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
    const adresseFichier = URL.createObjectURL(fichier);
    const lien = documentPage.createElement('a');
    lien.href = adresseFichier;
    lien.download = 'rappel-simulation-tony-coiffure.ics';
    lien.hidden = true;
    documentPage.body.append(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(adresseFichier), 1000);
  }

  function creerIdentifiant() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  function initialiserReservation() {
    const formulaire = selectOne('[data-formulaire]');
    if (!formulaire) return;
    ajouterJours();
    actualiserResume();
    actualiserProgression();

    selectAll('input[name="prestation"]').forEach((champ) => {
      champ.addEventListener('change', () => {
        etat.prestation = champ.value;
        etat.jour = '';
        etat.heure = -1;
        selectOne('[data-suivant]', selectOne('[data-etape="0"]')).disabled = false;
        selectAll('.jour-choix').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
        selectOne('[data-suivant]', selectOne('[data-etape="1"]')).disabled = true;
        actualiserResume();
        rendreHeures();
      });
    });

    selectAll('[data-suivant]').forEach((bouton) => {
      bouton.addEventListener('click', () => {
        const prochaineEtape = etat.etape + 1;
        if (prochaineEtape === 2 && etat.jour) rendreHeures();
        if (prochaineEtape < 4) afficherEtape(prochaineEtape);
      });
    });
    selectAll('[data-precedent]').forEach((bouton) => {
      bouton.addEventListener('click', () => afficherEtape(Math.max(0, etat.etape - 1)));
    });
    selectAll('[data-etape-retour]').forEach((bouton) => {
      bouton.addEventListener('click', () => {
        const cible = Number(bouton.dataset.etapeRetour);
        if (cible < etat.etape) afficherEtape(cible);
      });
    });

    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      if (!validerCoordonnees()) return;
      etat.nom = selectOne('#prenom').value.trim();
      etat.telephone = selectOne('#telephone').value.trim();
      creerConfirmation();
      afficherErreur('[data-erreur-formulaire]', '');
      afficherEtape(4);
    });
    selectOne('[data-agenda]').addEventListener('click', telechargerRappel);
    selectOne('[data-recommencer]').addEventListener('click', () => {
      etat.prestation = '';
      etat.jour = '';
      etat.heure = -1;
      etat.nom = '';
      etat.telephone = '';
      selectAll('input[name="prestation"]').forEach((champ) => { champ.checked = false; });
      formulaire.reset();
      selectAll('.jour-choix').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
      selectOne('[data-suivant]', selectOne('[data-etape="0"]')).disabled = true;
      selectOne('[data-suivant]', selectOne('[data-etape="1"]')).disabled = true;
      selectOne('[data-suivant]', selectOne('[data-etape="2"]')).disabled = true;
      selectAll('[data-erreur-prenom], [data-erreur-telephone], [data-erreur-formulaire]').forEach((message) => { message.textContent = ''; });
      selectAll('#prenom, #telephone').forEach((champ) => champ.removeAttribute('aria-invalid'));
      actualiserResume();
      afficherEtape(0);
    });
  }

  function initialiserBarreMobile() {
    const barre = selectOne('.barre-mobile');
    if (!barre || !('IntersectionObserver' in window)) return;
    const sections = [selectOne('#reservation'), selectOne('.pied-page')].filter(Boolean);
    const visibles = new Set();
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) visibles.add(entree.target);
        else visibles.delete(entree.target);
      });
      barre.classList.toggle('est-cachee', visibles.size > 0);
    }, { threshold: 0.12 });
    sections.forEach((section) => observateur.observe(section));
  }

  function initialiserLiensPreselection() {
    selectAll('[data-choisir-prestation]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const valeur = lien.dataset.choisirPrestation;
        const choix = selectOne(`input[name="prestation"][value="${valeur}"]`);
        if (!choix) return;
        choix.checked = true;
        choix.dispatchEvent(new Event('change', { bubbles: true }));
        if (etat.etape !== 0) afficherEtape(0);
      });
    });
  }

  initialiserRevelations();
  initialiserNavigation();
  initialiserReservation();
  initialiserLiensPreselection();
  initialiserBarreMobile();
})();
