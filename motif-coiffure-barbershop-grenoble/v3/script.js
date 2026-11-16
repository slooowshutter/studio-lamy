window.__site = 1;
(() => {
  'use strict';

  const doc = document;
  const corps = doc.body;
  const racine = doc.documentElement;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selection = { jour: null, heure: null };
  const $ = (selecteur, contexte = doc) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = doc) => Array.from(contexte.querySelectorAll(selecteur));
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const plages = {
    0: null,
    1: [[540, 1140]],
    2: [[540, 1140]],
    3: [[540, 1140]],
    4: [[540, 1140]],
    5: [[540, 750], [840, 1140]],
    6: [[540, 1140]]
  };
  const frJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const frDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const frDateCourte = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  function aujourdhuiParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return new Date(Date.UTC(Number(valeur.year), Number(valeur.month) - 1, Number(valeur.day), 12));
  }

  function heureParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeur = Object.fromEntries(parties.map((partie) => [partie.type, Number(partie.value)]));
    return valeur.hour * 60 + valeur.minute;
  }

  function dateIso(date) {
    return date.toISOString().slice(0, 10);
  }

  function ecrireHeure(minutes) {
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const reste = String(minutes % 60).padStart(2, '0');
    return `${heures}\u00a0h\u00a0${reste}`;
  }

  function installerEntree() {
    const demarrer = () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => corps.classList.add('pret')));
    };
    if (doc.fonts && doc.fonts.ready) {
      Promise.race([doc.fonts.ready, new Promise((fin) => window.setTimeout(fin, 650))]).then(demarrer);
    } else {
      demarrer();
    }
    window.setTimeout(demarrer, 850);
  }

  function installerRevelations() {
    const elements = $$('[data-revelation]');
    if (!('IntersectionObserver' in window) || reduit.matches) {
      elements.forEach((element) => element.classList.add('est-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees, suivi) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        suivi.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    elements.forEach((element) => observateur.observe(element));
  }

  function installerNavigation() {
    const bouton = $('.entete__bouton');
    const panneau = $('#navigation-mobile');
    if (!bouton || !panneau) return;

    function fermer(rendreFocus = false) {
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir la navigation');
      panneau.hidden = true;
      if (rendreFocus) bouton.focus();
    }

    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-expanded') === 'true';
      if (ouvert) {
        fermer();
        return;
      }
      bouton.setAttribute('aria-expanded', 'true');
      bouton.setAttribute('aria-label', 'Fermer la navigation');
      panneau.hidden = false;
      const premierLien = $('a', panneau);
      if (premierLien) window.requestAnimationFrame(() => premierLien.focus());
    });
    panneau.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermer();
    });
    doc.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermer(true);
    });
  }

  function creerJour(date, index) {
    const numero = date.getUTCDay();
    const ferme = plages[numero] === null;
    const iso = dateIso(date);
    const nomCourt = frJour.format(date).replace('.', '');
    const nomComplet = frDate.format(date);
    const etiquette = ferme
      ? `${nomComplet}, fermé selon les horaires publiés`
      : `Choisir ${nomComplet} pour la simulation`;
    const conteneur = doc.createElement('div');
    conteneur.className = 'journee';

    const entree = doc.createElement('input');
    entree.type = 'radio';
    entree.name = 'jour-simulation';
    entree.id = `jour-simulation-${index}`;
    entree.value = iso;
    entree.disabled = ferme;
    entree.setAttribute('aria-label', etiquette);

    const libelle = doc.createElement('label');
    libelle.className = 'journee__choix';
    libelle.htmlFor = entree.id;
    const nom = doc.createElement('span');
    nom.className = 'journee__nom';
    nom.textContent = nomCourt;
    const nombre = doc.createElement('span');
    nombre.className = 'journee__nombre';
    nombre.textContent = String(date.getUTCDate());
    const etat = doc.createElement('span');
    etat.className = 'journee__etat';
    etat.textContent = ferme ? 'fermé' : '\u00a0';
    libelle.append(nom, nombre, etat);
    conteneur.append(entree, libelle);
    entree.addEventListener('change', () => {
      if (!entree.checked) return;
      selection.jour = { date, iso, numero, nomComplet };
      selection.heure = null;
      $('[data-erreur-jour]').textContent = '';
      $('[data-recap-jour]').textContent = nomComplet;
      $('[data-recap-heure]').textContent = 'À choisir';
      construireHeures();
    });
    return conteneur;
  }

  function construireJours() {
    const conteneur = $('[data-choix-jours]');
    if (!conteneur) return;
    const premierJour = aujourdhuiParis();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(premierJour.getTime() + index * 86400000);
      conteneur.append(creerJour(date, index));
    }
  }

  function heureOccupee(date, minutes) {
    const graine = `${date}-${minutes}`;
    let valeur = 0;
    for (let index = 0; index < graine.length; index += 1) valeur = (valeur * 31 + graine.charCodeAt(index)) % 97;
    return valeur % 7 === 0;
  }

  function creerHeure(minutes, index, passee, occupee) {
    const conteneur = doc.createElement('div');
    conteneur.className = 'heure';
    const identifiant = `heure-simulation-${index}`;
    const entree = doc.createElement('input');
    entree.type = 'radio';
    entree.name = 'heure-simulation';
    entree.id = identifiant;
    entree.value = String(minutes);
    entree.disabled = passee || occupee;
    entree.setAttribute('aria-label', passee
      ? `${ecrireHeure(minutes)}, horaire passé`
      : occupee
        ? `${ecrireHeure(minutes)}, occupé dans la simulation uniquement`
        : `Choisir ${ecrireHeure(minutes)} pour la simulation`);
    const libelle = doc.createElement('label');
    libelle.className = `heure__choix${occupee ? ' heure__choix--occupee' : ''}`;
    libelle.htmlFor = identifiant;
    const texteHeure = doc.createElement('span');
    texteHeure.textContent = ecrireHeure(minutes);
    const etat = doc.createElement('small');
    etat.className = 'heure__etat';
    etat.textContent = passee ? 'passé' : occupee ? 'pris · simulation' : '\u00a0';
    libelle.append(texteHeure, etat);
    entree.addEventListener('change', () => {
      if (!entree.checked) return;
      selection.heure = minutes;
      $('[data-erreur-horaire]').textContent = '';
      $('[data-recap-heure]').textContent = ecrireHeure(minutes);
    });
    conteneur.append(entree, libelle);
    return conteneur;
  }

  function construireHeures() {
    const conteneur = $('[data-choix-heures]');
    if (!conteneur || !selection.jour) return;
    conteneur.replaceChildren();
    const plagesDuJour = plages[selection.jour.numero] || [];
    const maintenant = dateIso(selection.jour.date) === dateIso(aujourdhuiParis()) ? heureParis() : -1;
    const heures = [];
    plagesDuJour.forEach(([debut, fin]) => {
      for (let minute = debut; minute < fin; minute += 30) {
        const passee = minute < maintenant;
        const occupee = !passee && heureOccupee(selection.jour.iso, minute);
        heures.push({ minute, passee, occupee });
      }
    });
    heures.forEach(({ minute, passee, occupee }, index) => conteneur.append(creerHeure(minute, index, passee, occupee)));
    $('[data-jour-selectionne]').textContent = `${selection.jour.nomComplet} · horaires affichés à titre de simulation.`;
    if (!heures.some((heure) => !heure.passee && !heure.occupee)) {
      const message = doc.createElement('p');
      message.className = 'etape-formulaire__aide';
      message.textContent = 'Aucun horaire sélectionnable pour cette date dans la simulation. Choisissez un autre jour.';
      conteneur.append(message);
    }
  }

  function actualiserProgression(nom) {
    $$('[data-etape-indicateur]').forEach((indicateur) => {
      const active = indicateur.dataset.etapeIndicateur === nom;
      indicateur.classList.toggle('progression__etape--active', active);
      if (active) indicateur.setAttribute('aria-current', 'step');
      else indicateur.removeAttribute('aria-current');
    });
  }

  function afficherEtape(nom, focaliser = true) {
    const precedente = $('.etape-formulaire:not([hidden])');
    const suivante = $(`[data-etape="${nom}"]`);
    if (!suivante) return;
    const ouvrir = () => {
      if (precedente) {
        precedente.hidden = true;
        precedente.classList.remove('is-sortie');
      }
      suivante.hidden = false;
      suivante.classList.add('is-entree');
      actualiserProgression(nom);
      window.requestAnimationFrame(() => {
        suivante.classList.remove('is-entree');
        if (focaliser) $(`#titre-etape-${nom}`).focus();
      });
    };
    if (!precedente || precedente === suivante || reduit.matches) {
      ouvrir();
      return;
    }
    precedente.classList.add('is-sortie');
    window.setTimeout(ouvrir, 180);
  }

  function installerSimulation() {
    const formulaire = $('#formulaire-rendez-vous');
    if (!formulaire) return;
    construireJours();
    $('[data-prochaine-etape="horaire"]').addEventListener('click', () => {
      if (!selection.jour) {
        $('[data-erreur-jour]').textContent = 'Choisissez un jour pour continuer.';
        return;
      }
      afficherEtape('horaire');
    });
    $('[data-prochaine-etape="coordonnees"]').addEventListener('click', () => {
      if (selection.heure === null) {
        $('[data-erreur-horaire]').textContent = 'Choisissez un horaire pour continuer.';
        return;
      }
      afficherEtape('coordonnees');
    });
    $$('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(bouton.dataset.retour)));

    const prenom = $('#prenom');
    const telephone = $('#telephone');
    prenom.addEventListener('input', () => {
      prenom.removeAttribute('aria-invalid');
      $('#erreur-prenom').textContent = '';
    });
    telephone.addEventListener('input', () => {
      telephone.removeAttribute('aria-invalid');
      $('#erreur-telephone').textContent = '';
    });
    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      const prenomValide = prenom.value.trim().length > 0;
      const chiffres = telephone.value.replace(/\D/g, '');
      const numeroNormalise = chiffres.startsWith('0033') ? `0${chiffres.slice(4)}` : chiffres.startsWith('33') ? `0${chiffres.slice(2)}` : chiffres;
      const telephoneValide = /^0[67]\d{8}$/.test(numeroNormalise);
      $('#erreur-prenom').textContent = prenomValide ? '' : 'Indiquez votre prénom.';
      $('#erreur-telephone').textContent = telephoneValide ? '' : 'Indiquez un numéro de mobile français valide.';
      prenom.setAttribute('aria-invalid', String(!prenomValide));
      telephone.setAttribute('aria-invalid', String(!telephoneValide));
      if (!prenomValide) { prenom.focus(); return; }
      if (!telephoneValide) { telephone.focus(); return; }

      const jourTexte = selection.jour ? selection.jour.nomComplet : '';
      const heureTexte = selection.heure === null ? '' : ecrireHeure(selection.heure);
      $('[data-message-confirmation]').textContent = `${prenom.value.trim()}, le parcours du ${jourTexte} à ${heureTexte} a été simulé. Aucune demande n’a été transmise. Pour confirmer un rendez-vous, appelez MO’TIF au 07 68 78 85 46.`;
      const etape = $('.etape-formulaire:not([hidden])');
      if (etape) etape.hidden = true;
      $('[data-confirmation]').hidden = false;
      $('[data-confirmation]').classList.add('is-entree');
      actualiserProgression('coordonnees');
      window.requestAnimationFrame(() => {
        $('[data-confirmation]').classList.remove('is-entree');
        $('#titre-confirmation').focus();
      });
    });

    $('[data-recommencer]').addEventListener('click', () => {
      selection.jour = null;
      selection.heure = null;
      formulaire.reset();
      $('[data-confirmation]').hidden = true;
      $('[data-recap-jour]').textContent = 'À choisir';
      $('[data-recap-heure]').textContent = 'À choisir';
      $$('[aria-invalid="true"]', formulaire).forEach((champ) => champ.removeAttribute('aria-invalid'));
      $$('[id^="erreur-"]', formulaire).forEach((erreur) => { erreur.textContent = ''; });
      $$('[data-erreur-jour], [data-erreur-horaire]').forEach((erreur) => { erreur.textContent = ''; });
      afficherEtape('jour');
    });
  }

  function installerBarreMobile() {
    const barre = $('.barre-mobile');
    if (!barre) return;
    barre.classList.add('est-cachee');
    if (!('IntersectionObserver' in window)) {
      barre.classList.remove('est-cachee');
      return;
    }
    let heroVisible = true;
    let reservationVisible = false;
    let piedVisible = false;
    const actualiser = () => barre.classList.toggle('est-cachee', heroVisible || reservationVisible || piedVisible);
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target.classList.contains('hero')) heroVisible = entree.isIntersecting;
        if (entree.target.id === 'reservation') reservationVisible = entree.isIntersecting;
        if (entree.target.classList.contains('pied')) piedVisible = entree.isIntersecting;
      });
      actualiser();
    }, { threshold: 0.05 });
    observateur.observe($('.hero'));
    observateur.observe($('#reservation'));
    observateur.observe($('.pied'));
  }

  installerEntree();
  installerRevelations();
  installerNavigation();
  installerSimulation();
  installerBarreMobile();
})();
