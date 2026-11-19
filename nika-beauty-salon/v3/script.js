/* Réservation de démonstration, sans transmission de données. */
(() => {
  'use strict';

  const racine = document.documentElement;
  const corps = document.body;
  racine.classList.add('js');

  const selection = {
    prestation: 'hydralift',
    jour: '',
    heure: null,
    etape: 1,
    derniereEtape: 1
  };

  const prestations = {
    hydralift: { nom: 'HydraLift Signature', duree: 90, prix: 90 },
    'peau-nette': { nom: 'Soin Peau Nette', duree: 60, prix: 50 },
    'pose-star': { nom: 'Pose star', duree: 90, prix: 65 }
  };

  const heures = {
    1: [600, 930],
    2: [600, 1140],
    3: [600, 1140],
    4: [600, 1140],
    5: [600, 1140],
    6: [600, 1140]
  };

  const joursSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
  const joursCourts = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const moisCourts = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dateParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const NB = '\u00a0';
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selecteur, contexte = document) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => Array.from(contexte.querySelectorAll(selecteur));

  function numeroParis() {
    const morceaux = {};
    for (const partie of dateParis.formatToParts(new Date())) morceaux[partie.type] = partie.value;
    const annee = Number(morceaux.year);
    const mois = Number(morceaux.month);
    const jour = Number(morceaux.day);
    return {
      cle: `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`,
      minute: Number(morceaux.hour) * 60 + Number(morceaux.minute)
    };
  }

  function cleDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateDepuisCle(cle) {
    return new Date(`${cle}T12:00:00Z`);
  }

  function heureFrancaise(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}${NB}h${NB}${String(m).padStart(2, '0')}` : `${h}${NB}h`;
  }

  function dureeFrancaise(minutes) {
    if (minutes < 60) return `${minutes}${NB}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}${NB}h${NB}${String(m).padStart(2, '0')}` : `${h}${NB}h`;
  }

  function dateEnFrancais(cle) {
    const date = dateDepuisCle(cle);
    const phrase = dateLongue.format(date);
    return phrase.charAt(0).toLocaleUpperCase('fr-FR') + phrase.slice(1);
  }

  function obtenirJours() {
    const aujourdhui = numeroParis();
    const [annee, mois, jour] = aujourdhui.cle.split('-').map(Number);
    const liste = [];
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(Date.UTC(annee, mois - 1, jour + index, 12));
      liste.push({
        date,
        cle: cleDate(date),
        ferme: date.getUTCDay() === 0,
        aujourdhui: index === 0
      });
    }
    return liste;
  }

  function afficherJours() {
    const conteneur = $('[data-jours]');
    if (!conteneur) return;
    conteneur.replaceChildren();
    const jours = obtenirJours();

    if (!jours.some((jour) => !jour.ferme)) {
      $('[data-message-jours]').textContent = 'Aucun jour ouvert ne figure dans cette période.';
      return;
    }

    if (!selection.jour || !jours.some((jour) => jour.cle === selection.jour && !jour.ferme)) {
      selection.jour = jours.find((jour) => !jour.ferme).cle;
    }

    jours.forEach((jour) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = `jour${jour.cle === selection.jour ? ' est-choisi' : ''}`;
      bouton.disabled = jour.ferme;
      bouton.setAttribute('aria-pressed', String(jour.cle === selection.jour));
      const libelleJour = joursCourts.format(jour.date).replace('.', '');
      const mois = moisCourts.format(jour.date).replace('.', '');
      const date = document.createElement('span');
      date.className = 'jour__date';
      date.textContent = `${jour.date.getUTCDate()} ${mois}`;
      const nom = document.createElement('span');
      nom.className = 'jour__nom';
      nom.textContent = jour.aujourdhui && !jour.ferme ? 'Aujourd’hui' : libelleJour;
      bouton.append(nom, date);

      if (jour.ferme) {
        const etat = document.createElement('span');
        etat.className = 'jour__etat';
        etat.textContent = 'Fermé';
        bouton.append(etat);
        bouton.setAttribute('aria-label', `${libelleJour} ${date.textContent} : fermé selon les horaires Planity`);
      } else {
        bouton.setAttribute('aria-label', `${dateEnFrancais(jour.cle)} : sélectionner ce jour`);
        bouton.addEventListener('click', () => {
          selection.jour = jour.cle;
          selection.heure = null;
          selection.derniereEtape = Math.min(selection.derniereEtape, 2);
          afficherJours();
          afficherCreneaux();
          actualiserRecapitulatif();
          actualiserEtapes();
          $('[data-bouton-jour]').disabled = false;
          $('[data-message-jours]').textContent = `${dateEnFrancais(jour.cle)} sélectionné.`;
        });
      }
      conteneur.append(bouton);
    });
    $('[data-bouton-jour]').disabled = !selection.jour;
  }

  function empreinte(texte) {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) {
      valeur = (valeur * 31 + texte.charCodeAt(index)) | 0;
    }
    return Math.abs(valeur);
  }

  function afficherCreneaux() {
    const conteneur = $('[data-creneaux]');
    if (!conteneur || !selection.jour) return;
    conteneur.replaceChildren();
    const date = dateDepuisCle(selection.jour);
    const horaire = heures[date.getUTCDay()];
    const service = prestations[selection.prestation];
    const statut = $('[data-message-creneaux]');

    if (!horaire) {
      statut.textContent = 'Dimanche : fermé selon les horaires affichés sur Planity.';
      return;
    }

    const aujourdhui = numeroParis();
    const estAujourdhui = selection.jour === aujourdhui.cle;
    let nombre = 0;
    let nombreAVenir = 0;
    for (let debut = horaire[0]; debut + service.duree <= horaire[1]; debut += 30) {
      nombre += 1;
      const passe = estAujourdhui && debut <= aujourdhui.minute;
      if (!passe) nombreAVenir += 1;
      const heure = heureFrancaise(debut);
      const pris = !passe && empreinte(`${selection.jour}-${debut}-${selection.prestation}`) % 7 === 0;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = `creneau${selection.heure === debut ? ' est-choisi' : ''}`;
      bouton.disabled = passe || pris;
      bouton.setAttribute('aria-pressed', String(selection.heure === debut));
      bouton.setAttribute('aria-label', passe ? `${heure}, heure déjà passée` : pris ? `${heure}, déjà pris dans cette démonstration` : `${heure}, sélectionner ce créneau de démonstration`);
      const valeur = document.createElement('span');
      valeur.textContent = heure;
      bouton.append(valeur);

      if (passe || pris) {
        const etat = document.createElement('span');
        etat.className = 'creneau__etat';
        etat.textContent = passe ? 'Passé' : 'Déjà pris · démo';
        bouton.append(etat);
      } else {
        bouton.addEventListener('click', () => {
          selection.heure = debut;
          selection.derniereEtape = Math.max(selection.derniereEtape, 3);
          afficherCreneaux();
          actualiserRecapitulatif();
          actualiserEtapes();
          $('[data-bouton-heure]').disabled = false;
          statut.textContent = `${heure} sélectionné pour la démonstration.`;
        });
      }
      conteneur.append(bouton);
    }

    if (estAujourdhui && nombreAVenir === 0) {
      statut.textContent = 'Aucun créneau restant aujourd’hui dans cette démonstration. Choisissez un autre jour.';
      $('[data-bouton-heure]').disabled = true;
    } else if (nombre > 0) {
      statut.textContent = `Créneaux calculés selon la durée de ${service.nom}, dans les horaires affichés.`;
    } else {
      statut.textContent = 'Aucun créneau ne correspond à cette durée dans l’horaire affiché.';
      $('[data-bouton-heure]').disabled = true;
    }
  }

  function actualiserRecapitulatif() {
    const service = prestations[selection.prestation];
    $('[data-selection-prix]').textContent = `${service.prix}${NB}€`;
    $('[data-selection-duree]').textContent = dureeFrancaise(service.duree);
    $('[data-selection-jour]').textContent = selection.jour ? dateEnFrancais(selection.jour) : 'À choisir';
    $('[data-selection-heure]').textContent = selection.heure === null ? 'À choisir' : heureFrancaise(selection.heure);
    $('#titre-selection').innerHTML = service.nom === 'HydraLift Signature' ? 'HydraLift<br>Signature' : service.nom;
    const recapitulatif = $('[data-recapitulatif]');
    if (recapitulatif) {
      recapitulatif.replaceChildren();
      [
        ['Prestation', service.nom],
        ['Durée', dureeFrancaise(service.duree)],
        ['Prix indicatif', `${service.prix}${NB}€`],
        ['Jour', selection.jour ? dateEnFrancais(selection.jour) : 'À choisir'],
        ['Heure', selection.heure === null ? 'À choisir' : heureFrancaise(selection.heure)]
      ].forEach(([cle, valeur]) => {
        const etiquette = document.createElement('span');
        etiquette.textContent = cle;
        const contenu = document.createElement('strong');
        contenu.textContent = valeur;
        recapitulatif.append(etiquette, contenu);
      });
    }
  }

  function actualiserEtapes() {
    $$('[data-etape-nav]').forEach((bouton) => {
      const numero = Number(bouton.dataset.etapeNav);
      const actif = numero === selection.etape;
      bouton.disabled = numero > selection.derniereEtape;
      bouton.classList.toggle('est-active', actif);
      if (actif) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  let transitionEnCours = false;
  function allerAEtape(numero) {
    if (transitionEnCours || numero === selection.etape || numero > selection.derniereEtape) return;
    const actuelle = $(`[data-etape="${selection.etape}"]`);
    const suivante = $(`[data-etape="${numero}"]`);
    if (!actuelle || !suivante) return;
    transitionEnCours = true;
    actuelle.classList.add('est-sortie');
    $$('[data-etape-nav]').forEach((bouton) => { bouton.disabled = true; });

    const delai = reduireMouvement.matches ? 120 : 230;
    window.setTimeout(() => {
      actuelle.hidden = true;
      actuelle.classList.remove('est-sortie');
      suivante.hidden = false;
      suivante.classList.add('est-entree');
      requestAnimationFrame(() => {
        suivante.classList.remove('est-entree');
        selection.etape = numero;
        actualiserEtapes();
        const titre = $('h3[tabindex="-1"]', suivante);
        if (titre) titre.focus({ preventScroll: true });
        $('[data-statut-formulaire]').textContent = `Étape ${numero} sur 4.`;
        transitionEnCours = false;
      });
    }, delai);
  }

  function configurerPrestations() {
    $$('input[name="prestation"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        selection.prestation = radio.value;
        selection.heure = null;
        selection.derniereEtape = selection.jour ? 2 : 1;
        $('[data-bouton-heure]').disabled = true;
        afficherCreneaux();
        actualiserRecapitulatif();
        actualiserEtapes();
      });
    });

    $$('[data-choisir]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const radio = $(`input[name="prestation"][value="${lien.dataset.choisir}"]`);
        if (!radio) return;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function configurerEtapes() {
    $$('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', () => {
      const prochaine = Number(bouton.dataset.suivant);
      if (prochaine === 3 && !selection.jour) {
        $('[data-message-jours]').textContent = 'Choisissez d’abord un jour.';
        return;
      }
      if (prochaine === 4 && selection.heure === null) {
        $('[data-message-creneaux]').textContent = 'Choisissez d’abord un créneau.';
        return;
      }
      selection.derniereEtape = Math.max(selection.derniereEtape, prochaine);
      if (prochaine === 3) afficherCreneaux();
      if (prochaine === 4) actualiserRecapitulatif();
      allerAEtape(prochaine);
    }));

    $$('[data-precedent]').forEach((bouton) => bouton.addEventListener('click', () => allerAEtape(Number(bouton.dataset.precedent))));
    $$('[data-etape-nav]').forEach((bouton) => bouton.addEventListener('click', () => allerAEtape(Number(bouton.dataset.etapeNav))));
  }

  function validerCoordonnees() {
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    const erreurPrenom = $('#erreur-prenom');
    const erreurTelephone = $('#erreur-telephone');
    const nomNettoye = prenom.value.trim();
    const numeroNettoye = telephone.value.trim();
    const formatTelephone = /^(?:(?:\+33|0033)[\s.-]?[67](?:[\s.-]?\d{2}){4}|0[67](?:[\s.-]?\d{2}){4})$/;
    let correct = true;

    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    prenom.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');

    if (!nomNettoye) {
      erreurPrenom.textContent = 'Saisissez votre prénom pour continuer.';
      prenom.setAttribute('aria-invalid', 'true');
      correct = false;
    }
    if (!formatTelephone.test(numeroNettoye)) {
      erreurTelephone.textContent = 'Saisissez un numéro de portable français valide.';
      telephone.setAttribute('aria-invalid', 'true');
      correct = false;
    }
    if (!correct) {
      $('[aria-invalid="true"]').focus();
      $('[data-statut-formulaire]').textContent = 'Vérifiez les champs signalés.';
      return;
    }

    confirmer(nomNettoye);
  }

  function confirmer(prenom) {
    const service = prestations[selection.prestation];
    const texte = $('[data-confirmation-texte]');
    texte.textContent = `${prenom}, votre sélection de ${service.nom} est prévue le ${dateEnFrancais(selection.jour)} à ${heureFrancaise(selection.heure)}. Durée affichée : ${dureeFrancaise(service.duree)}. Prix indicatif : ${service.prix}${NB}€. Cette confirmation est fictive.`;
    $('.reservation__contenu').hidden = true;
    $('.etapes-reservation').hidden = true;
    const confirmation = $('[data-confirmation]');
    confirmation.hidden = false;
    confirmation.focus({ preventScroll: true });
  }

  function recommencer() {
    $('#formulaire-reservation').reset();
    selection.prestation = 'hydralift';
    selection.jour = '';
    selection.heure = null;
    selection.etape = 1;
    selection.derniereEtape = 1;
    $('.reservation__contenu').hidden = false;
    $('.etapes-reservation').hidden = false;
    $('[data-confirmation]').hidden = true;
    $$('[data-etape]').forEach((etape, index) => { etape.hidden = index !== 0; });
    $('[data-statut-formulaire]').textContent = '';
    $('[data-message-jours]').textContent = '';
    $('[data-message-creneaux]').textContent = '';
    $('#prenom').value = '';
    $('#telephone').value = '';
    afficherJours();
    afficherCreneaux();
    actualiserRecapitulatif();
    actualiserEtapes();
    $('#titre-etape-1').focus({ preventScroll: true });
  }

  function configurerRevelations() {
    const elements = $$('[data-revelation]');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('est-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
    elements.forEach((element) => observateur.observe(element));
  }

  function configurerNavigation() {
    const liens = $$('.navigation-panneau a');
    const indicateur = $('.navigation-panneau__indicateur');
    const sections = liens.map((lien) => $(lien.getAttribute('href'))).filter(Boolean);
    if (!liens.length || !indicateur) return;

    function activer(section) {
      const lien = liens.find((element) => element.hash === `#${section.id}`);
      if (!lien) return;
      liens.forEach((element) => {
        if (element === lien) element.setAttribute('aria-current', 'location');
        else element.removeAttribute('aria-current');
      });
      const y = lien.offsetTop + (lien.offsetHeight - indicateur.offsetHeight) / 2;
      indicateur.style.transform = `translateY(${y}px)`;
    }

    activer($('#repere'));
    if (!('IntersectionObserver' in window)) return;
    const observateur = new IntersectionObserver((entrees) => {
      const visibles = entrees.filter((entree) => entree.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visibles[0]) activer(visibles[0].target);
    }, { rootMargin: '-18% 0px -64% 0px', threshold: 0 });
    sections.forEach((section) => observateur.observe(section));
  }

  function preparerEntree() {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      corps.classList.add('entree-terminee');
      window.setTimeout(() => $('.chiffres-signature__anneaux').classList.add('anneaux-visibles'), 140);
    }));
  }

  function initialiser() {
    afficherJours();
    afficherCreneaux();
    actualiserRecapitulatif();
    actualiserEtapes();
    configurerPrestations();
    configurerEtapes();
    configurerRevelations();
    configurerNavigation();
    preparerEntree();

    $('#formulaire-reservation').addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      validerCoordonnees();
    });
    $('[data-recommencer]').addEventListener('click', recommencer);
  }

  initialiser();
})();
