(() => {
  'use strict';

  const racine = document.documentElement;
  racine.classList.add('js');

  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('.contenu > section[id], .pied[id]')];
  const liensRubriques = [...document.querySelectorAll('.panneau__liste a')];
  const conteneurRubriques = document.querySelector('.panneau__menu');
  const listeRubriques = document.querySelector('#liste-rubriques');
  const navigation = document.querySelector('.panneau__navigation');
  const basculeNavigation = document.querySelector('.panneau__bascule');
  const indicateurNavigation = document.querySelector('.panneau__indicateur');

  requestAnimationFrame(() => racine.classList.add('est-pret'));

  const reveler = document.querySelectorAll('[data-revelation]');
  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    reveler.forEach((element, index) => {
      element.style.setProperty('--rang', String(index));
      observateurRevelation.observe(element);
    });
  } else {
    reveler.forEach((element) => element.classList.add('est-visible'));
  }

  function fermerRubriques(rendreFocus = false) {
    navigation.classList.remove('est-ouvert');
    basculeNavigation.setAttribute('aria-expanded', 'false');
    basculeNavigation.querySelector('.panneau__bascule-signe').textContent = '+';
    if (rendreFocus) basculeNavigation.focus();
  }

  basculeNavigation.addEventListener('click', () => {
    const ouvert = basculeNavigation.getAttribute('aria-expanded') === 'true';
    basculeNavigation.setAttribute('aria-expanded', String(!ouvert));
    navigation.classList.toggle('est-ouvert', !ouvert);
    basculeNavigation.querySelector('.panneau__bascule-signe').textContent = ouvert ? '+' : '−';
    if (!ouvert) requestAnimationFrame(() => placerIndicateur(document.querySelector('.panneau__liste a[aria-current="location"]')));
  });

  listeRubriques.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerRubriques(false);
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && navigation.classList.contains('est-ouvert')) fermerRubriques(true);
  });

  function placerIndicateur(lien) {
    if (!lien || !indicateurNavigation || getComputedStyle(conteneurRubriques).display === 'none') return;
    const haut = lien.getBoundingClientRect().top - conteneurRubriques.getBoundingClientRect().top + (lien.offsetHeight - indicateurNavigation.offsetHeight) / 2;
    indicateurNavigation.style.transform = `translateY(${Math.max(0, haut)}px)`;
  }

  function choisirRubrique(id) {
    liensRubriques.forEach((lien) => {
      const actif = lien.getAttribute('href') === `#${id}`;
      if (actif) lien.setAttribute('aria-current', 'location');
      else lien.removeAttribute('aria-current');
      if (actif) placerIndicateur(lien);
    });
  }

  if ('IntersectionObserver' in window) {
    const observateurRubriques = new IntersectionObserver((entrees) => {
      const visibles = entrees.filter((entree) => entree.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visibles.length) choisirRubrique(visibles[0].target.id);
    }, { rootMargin: '-18% 0px -63% 0px', threshold: [0, .15, .35, .6] });
    sections.forEach((section) => observateurRubriques.observe(section));
  }

  window.addEventListener('resize', () => {
    const lienActif = document.querySelector('.panneau__liste a[aria-current="location"]');
    placerIndicateur(lienActif);
  }, { passive: true });

  const prestations = {
    'coupe-homme': { nom: 'Homme - Coupe, shampoing et coiffage', duree: 25 },
    'taille-barbe': { nom: 'Homme - Taille de la barbe', duree: 25 },
    'coupe-garcon': { nom: 'Garçon - Coupe', duree: 30 },
    'coupe-barbe': { nom: 'Homme - Coupe, shampoing et taille de la barbe', duree: 40 },
    shampoing: { nom: 'Homme - Shampoing', duree: 25 },
    contours: { nom: 'Homme - Coupe des contours', duree: 20 }
  };

  const formulaire = document.querySelector('#formulaire-reservation');
  const confirmation = document.querySelector('#confirmation');
  const choixJours = document.querySelector('#choix-jours');
  const choixHeures = document.querySelector('#choix-heures');
  const noteCreneaux = document.querySelector('#note-creneaux');
  const sectionsEtapes = [...formulaire.querySelectorAll('[data-etape]')];
  const avancement = [...document.querySelectorAll('[data-avancement]')];
  const resumePrestation = document.querySelector('#resume-prestation');
  const resumeJour = document.querySelector('#resume-jour');
  const resumeHeure = document.querySelector('#resume-heure');
  const recapitulatifFinal = document.querySelector('#recapitulatif-final');
  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const sectionReservation = document.querySelector('#reservation');

  let etapeActuelle = 1;
  let minuteurEtape = 0;
  let prestationChoisie = '';
  let jourChoisi = null;
  let heureChoisie = '';
  let rappelAgenda = null;

  function texteJour(date, long = false) {
    const options = long
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { weekday: 'short', day: 'numeric', month: 'short' };
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  function dateLocale(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function creerChoixJour(date, index) {
    const etiquette = document.createElement('label');
    etiquette.className = 'choix__jour';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'jour';
    radio.value = dateLocale(date);
    radio.required = index === 0;
    radio.dataset.jour = radio.value;

    const jour = document.createElement('strong');
    jour.textContent = index === 0 ? 'Aujourd’hui' : texteJour(date);

    const dateCourte = document.createElement('small');
    dateCourte.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);

    etiquette.append(radio, jour, dateCourte);
    return etiquette;
  }

  function remplirJours() {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const jours = [];
    for (let decalage = 0; decalage < 12; decalage += 1) {
      const date = new Date(debut);
      date.setDate(debut.getDate() + decalage);
      jours.push(date);
    }
    choixJours.replaceChildren(...jours.map(creerChoixJour));
  }

  function plageDuJour(date) {
    if (!date) return null;
    const dimanche = date.getDay() === 0;
    // Plage commune conservatrice : dimanche 10 h–18 h tient compte des trois horaires publiés.
    return dimanche ? { ouverture: 10 * 60, fermeture: 18 * 60 } : { ouverture: 9 * 60 + 30, fermeture: 19 * 60 + 30 };
  }

  function minutesEnHeure(minutes) {
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const reste = String(minutes % 60).padStart(2, '0');
    return `${heures}:${reste}`;
  }

  function estDejaPris(date, index) {
    const graine = date.getDate() + date.getMonth() * 3;
    return (index + graine) % 7 === 2 || (index * 5 + graine) % 19 === 4;
  }

  function estPasse(date, heure) {
    const maintenant = new Date();
    if (dateLocale(date) !== dateLocale(maintenant)) return false;
    const [heures, minutes] = heure.split(':').map(Number);
    const instant = new Date(date);
    instant.setHours(heures, minutes, 0, 0);
    return instant <= maintenant;
  }

  function creerChoixHeure(heure, indisponible, statut) {
    const etiquette = document.createElement('label');
    etiquette.className = 'choix__heure';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'heure';
    radio.value = heure;
    radio.required = true;
    radio.disabled = indisponible;

    const texte = document.createElement('span');
    texte.textContent = heure;
    etiquette.append(radio, texte);
    if (statut) {
      const mention = document.createElement('small');
      mention.textContent = statut;
      etiquette.append(mention);
    }
    return etiquette;
  }

  function remplirHeures() {
    choixHeures.replaceChildren();
    heureChoisie = '';
    resumeHeure.textContent = 'À choisir';
    const plage = plageDuJour(jourChoisi);
    const prestation = prestations[prestationChoisie];
    if (!plage || !prestation) return;

    let index = 0;
    for (let heure = plage.ouverture; heure + prestation.duree <= plage.fermeture; heure += 30) {
      const valeur = minutesEnHeure(heure);
      const passe = estPasse(jourChoisi, valeur);
      const pris = !passe && estDejaPris(jourChoisi, index);
      const statut = passe ? 'passé' : pris ? 'déjà pris' : '';
      choixHeures.append(creerChoixHeure(valeur, passe || pris, statut));
      index += 1;
    }

    if (choixHeures.children.length === 0) {
      const vide = document.createElement('p');
      vide.className = 'etape__note';
      vide.textContent = 'Aucun créneau de démonstration disponible ce jour-là.';
      choixHeures.append(vide);
    }

    noteCreneaux.textContent = jourChoisi.getDay() === 0
      ? 'Dimanche : créneaux de démonstration limités à 10 h–18 h, plage commune prudente des horaires publiés.'
      : 'Lundi–samedi : créneaux de démonstration de 9 h 30 à 19 h 30, selon les plages publiées.';
  }

  function actualiserAvancement(numero) {
    avancement.forEach((element, index) => {
      if (index + 1 === numero) element.setAttribute('aria-current', 'step');
      else element.removeAttribute('aria-current');
    });
  }

  function montrerEtape(numero, placerFocus = true) {
    window.clearTimeout(minuteurEtape);
    const precedente = sectionsEtapes[etapeActuelle - 1];
    const suivante = sectionsEtapes[numero - 1];
    etapeActuelle = numero;
    actualiserAvancement(numero);
    if (precedente === suivante) {
      if (placerFocus) suivante.querySelector('h3').focus();
      return;
    }

    precedente.inert = true;
    precedente.classList.remove('est-affichee', 'est-entree');
    precedente.classList.add('est-sortie');
    const delai = reduireMouvement ? 0 : 220;
    minuteurEtape = window.setTimeout(() => {
      precedente.hidden = true;
      precedente.classList.remove('est-sortie');
      suivante.hidden = false;
      suivante.inert = false;
      suivante.classList.add('est-entree');
      requestAnimationFrame(() => {
        suivante.classList.remove('est-entree');
        suivante.classList.add('est-affichee');
        if (placerFocus) suivante.querySelector('h3').focus();
      });
    }, delai);
  }

  function afficherErreurRadio(nom, id, message) {
    const erreur = document.querySelector(`#${id}`);
    erreur.textContent = message;
    const radio = formulaire.querySelector(`input[name="${nom}"]:not(:disabled)`);
    if (radio) radio.focus();
  }

  function choisirPrestation(id) {
    if (!prestations[id]) return false;
    prestationChoisie = id;
    formulaire.querySelectorAll('input[name="prestation"]').forEach((radio) => {
      radio.checked = radio.value === id;
    });
    resumePrestation.textContent = prestations[id].nom;
    return true;
  }

  function actualiserJour() {
    const radio = formulaire.querySelector('input[name="jour"]:checked');
    if (!radio) return false;
    const morceaux = radio.value.split('-').map(Number);
    jourChoisi = new Date(morceaux[0], morceaux[1] - 1, morceaux[2]);
    jourChoisi.setHours(0, 0, 0, 0);
    resumeJour.textContent = texteJour(jourChoisi, true);
    remplirHeures();
    return true;
  }

  function actualiserHeure() {
    const radio = formulaire.querySelector('input[name="heure"]:checked');
    if (!radio) return false;
    heureChoisie = radio.value;
    resumeHeure.textContent = heureChoisie;
    return true;
  }

  function effacerErreur(id) {
    const erreur = document.querySelector(`#${id}`);
    if (erreur) erreur.textContent = '';
  }

  function majEtatChamp(champ, erreur, message, valide) {
    champ.setAttribute('aria-invalid', String(!valide));
    erreur.textContent = valide ? '' : message;
    return valide;
  }

  function validerCoordonnees() {
    const prenomValide = champPrenom.value.trim().length > 0;
    const telephoneValide = /^(?:0[67](?:[ .-]?\d{2}){4}|\+33[ .-]?[67](?:[ .-]?\d{2}){4}|0033[ .-]?[67](?:[ .-]?\d{2}){4})$/.test(champTelephone.value.trim());
    const prenomOK = majEtatChamp(champPrenom, document.querySelector('#erreur-prenom'), 'Saisissez votre prénom.', prenomValide);
    const telephoneOK = majEtatChamp(champTelephone, document.querySelector('#erreur-telephone'), 'Saisissez un numéro mobile français valide.', telephoneValide);
    if (!prenomOK) champPrenom.focus();
    else if (!telephoneOK) champTelephone.focus();
    return prenomOK && telephoneOK;
  }

  formulaire.addEventListener('change', (evenement) => {
    const cible = evenement.target;
    if (cible.name === 'prestation') {
      choisirPrestation(cible.value);
      effacerErreur('erreur-prestation');
      if (jourChoisi) remplirHeures();
    }
    if (cible.name === 'jour') {
      actualiserJour();
      effacerErreur('erreur-jour');
      heureChoisie = '';
      resumeHeure.textContent = 'À choisir';
    }
    if (cible.name === 'heure') {
      actualiserHeure();
      effacerErreur('erreur-heure');
    }
  });

  formulaire.addEventListener('input', (evenement) => {
    if (evenement.target === champPrenom && champPrenom.value.trim()) {
      champPrenom.removeAttribute('aria-invalid');
      effacerErreur('erreur-prenom');
    }
    if (evenement.target === champTelephone && champTelephone.value.trim()) {
      champTelephone.removeAttribute('aria-invalid');
      effacerErreur('erreur-telephone');
    }
  });

  formulaire.addEventListener('click', (evenement) => {
    const suite = evenement.target.closest('[data-suite]');
    const retour = evenement.target.closest('[data-retour]');
    if (suite) {
      if (etapeActuelle === 1) {
        if (!prestationChoisie) return afficherErreurRadio('prestation', 'erreur-prestation', 'Choisissez une prestation pour continuer.');
        remplirJours();
        montrerEtape(2);
      } else if (etapeActuelle === 2) {
        if (!actualiserJour()) return afficherErreurRadio('jour', 'erreur-jour', 'Choisissez un jour pour continuer.');
        montrerEtape(3);
      } else if (etapeActuelle === 3) {
        if (!actualiserHeure()) return afficherErreurRadio('heure', 'erreur-heure', 'Choisissez une heure pour continuer.');
        montrerEtape(4);
      }
    }
    if (retour) montrerEtape(Number(retour.dataset.retour));
  });

  document.querySelectorAll('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      const id = lien.dataset.prestation;
      if (!prestations[id]) return;
      evenement.preventDefault();
      choisirPrestation(id);
      remplirJours();
      montrerEtape(2);
      sectionReservation.scrollIntoView({ behavior: reduireMouvement ? 'auto' : 'smooth', block: 'start' });
      choisirRubrique('reservation');
    });
  });

  document.querySelectorAll('[data-modifier]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.modifier);
      if (numero === 2 && !prestationChoisie) return montrerEtape(1);
      if (numero === 3 && !jourChoisi) return montrerEtape(2);
      montrerEtape(numero);
    });
  });

  function formaterDateAgenda(date) {
    const dateFormatee = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const heureFormatee = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
    return `${dateFormatee}T${heureFormatee}00`;
  }

  function echapperAgenda(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function telechargerAgenda() {
    if (!rappelAgenda) return;
    const debut = new Date(rappelAgenda.date);
    const fin = new Date(rappelAgenda.date);
    const [heures, minutes] = heureChoisie.split(':').map(Number);
    debut.setHours(heures, minutes, 0, 0);
    fin.setHours(heures, minutes + prestations[prestationChoisie].duree, 0, 0);
    const contenu = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Apercu Sam Coiffeur//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART;TZID=Europe/Paris:${formaterDateAgenda(debut)}`,
      `DTEND;TZID=Europe/Paris:${formaterDateAgenda(fin)}`,
      `SUMMARY:${echapperAgenda('Rappel fictif · Sam Coiffeur')}`,
      `LOCATION:${echapperAgenda('22 rue Frémicourt, 75015 Paris')}`,
      `DESCRIPTION:${echapperAgenda('Simulation uniquement. Aucun rendez-vous n’a été transmis au salon.')}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
    const adresse = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = adresse;
    lien.download = 'rappel-simulation-sam-coiffeur.ics';
    document.body.append(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(adresse), 1000);
  }

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (!validerCoordonnees()) return;
    if (!prestationChoisie || !jourChoisi || !heureChoisie) {
      montrerEtape(!prestationChoisie ? 1 : !jourChoisi ? 2 : 3);
      return;
    }

    const dateLongue = texteJour(jourChoisi, true);
    recapitulatifFinal.textContent = `${champPrenom.value.trim()}, ${prestations[prestationChoisie].nom}, ${dateLongue} à ${heureChoisie}. Ceci est un rappel fictif.`;
    rappelAgenda = { date: new Date(jourChoisi) };
    formulaire.hidden = true;
    confirmation.hidden = false;
    confirmation.classList.add('est-entree');
    requestAnimationFrame(() => confirmation.classList.add('est-affichee'));
    confirmation.querySelector('h3').focus();
  });

  document.querySelector('#telecharger-agenda').addEventListener('click', telechargerAgenda);

  document.querySelector('#recommencer').addEventListener('click', () => {
    formulaire.reset();
    confirmation.hidden = true;
    confirmation.classList.remove('est-entree', 'est-affichee');
    formulaire.hidden = false;
    sectionsEtapes.forEach((etape, index) => {
      etape.hidden = index !== 0;
      etape.inert = index !== 0;
      etape.classList.remove('est-sortie', 'est-entree', 'est-affichee');
    });
    prestationChoisie = '';
    jourChoisi = null;
    heureChoisie = '';
    rappelAgenda = null;
    resumePrestation.textContent = 'À choisir';
    resumeJour.textContent = 'À choisir';
    resumeHeure.textContent = 'À choisir';
    champPrenom.removeAttribute('aria-invalid');
    champTelephone.removeAttribute('aria-invalid');
    document.querySelectorAll('.erreur').forEach((erreur) => { erreur.textContent = ''; });
    etapeActuelle = 1;
    actualiserAvancement(1);
    sectionsEtapes[0].querySelector('h3').focus();
  });

  const sourcesDeNavigation = document.querySelectorAll('.panneau__liste a');
  sourcesDeNavigation.forEach((lien) => {
    lien.addEventListener('click', () => choisirRubrique(lien.hash.slice(1)));
  });

  sectionsEtapes.forEach((etape, index) => {
    etape.inert = index !== 0;
    if (index === 0) etape.classList.add('est-affichee');
  });
  remplirJours();
  placerIndicateur(document.querySelector('.panneau__liste a[aria-current="location"]'));
})();
