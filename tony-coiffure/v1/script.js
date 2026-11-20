/* Tony Coiffure — une simulation locale, aucun envoi ni stockage. */
'use strict';

const CALENDRIER_TONY = (() => {
  const prestations = [
    { id: 'homme', nom: 'Homme - Coupe, shampoing et coiffage', duree: 25, libelleDuree: '25\u00a0min' },
    { id: 'femme', nom: 'Femme - Coupe, soin shampoing et brushing', duree: 60, libelleDuree: '1\u00a0h' },
    { id: 'racines', nom: 'Coloration des racines PCK', duree: 60, libelleDuree: '1\u00a0h' }
  ];
  // Treatwell, relevé le 20/11/2026. Lundi : fermeture prudente à 18 h.
  const horaires = { 0: null, 1: [660, 1080], 2: [570, 1110], 3: [570, 1110], 4: [570, 1110], 5: [600, 1110], 6: [570, 1140] };
  const formatParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function maintenant(date = new Date()) {
    const morceaux = Object.fromEntries(formatParis.formatToParts(date).map(partie => [partie.type, partie.value]));
    return {
      jour: `${morceaux.year}-${morceaux.month}-${morceaux.day}`,
      minute: Number(morceaux.hour) * 60 + Number(morceaux.minute)
    };
  }
  function dateDuJour(cle) {
    return new Date(`${cle}T12:00:00Z`);
  }
  function jours(date = new Date()) {
    const debut = dateDuJour(maintenant(date).jour);
    return Array.from({ length: 14 }, (_, index) => {
      const jour = new Date(debut.getTime() + index * 86400000);
      return { cle: jour.toISOString().slice(0, 10), date: jour, semaine: jour.getUTCDay() };
    });
  }
  function heure(minute) {
    const heures = Math.floor(minute / 60);
    const reste = minute % 60;
    return reste ? `${heures}\u00a0h\u00a0${String(reste).padStart(2, '0')}` : `${heures}\u00a0h`;
  }
  function creneaux(cle, duree, date = new Date()) {
    const ouverture = horaires[dateDuJour(cle).getUTCDay()];
    if (!ouverture) return [];
    const present = maintenant(date);
    const resultat = [];
    const graine = Number(cle.replaceAll('-', ''));
    for (let minute = ouverture[0], index = 0; minute + duree <= ouverture[1]; minute += 30, index++) {
      const passe = cle < present.jour || (cle === present.jour && minute <= present.minute);
      // Disponibilité volontairement fictive, déterministe et explicitement étiquetée.
      const occupe = (graine + index) % 6 === 2;
      resultat.push({ minute, passe, occupe, disponible: !passe && !occupe });
    }
    return resultat;
  }
  const jourLong = cle => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(dateDuJour(cle));
  const telephoneValide = valeur => /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(valeur.replace(/[\s.()\-]/g, ''));
  return { prestations, horaires, maintenant, dateDuJour, jours, heure, creneaux, jourLong, telephoneValide };
})();

(() => {
  if (typeof document === 'undefined') return;
  const $ = (selecteur, contexte = document) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => Array.from(contexte.querySelectorAll(selecteur));
  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const modele = CALENDRIER_TONY;
  let clavier = false;
  let trameEntree;
  let trameSuite;
  let observateur;

  document.addEventListener('keydown', evenement => {
    if (evenement.key === 'Tab' || evenement.key === 'Enter' || evenement.key === ' ' || evenement.key.startsWith('Arrow')) {
      clavier = true;
      racine.classList.add('keyboard-input');
    }
  });
  document.addEventListener('pointerdown', () => {
    clavier = false;
    racine.classList.remove('keyboard-input');
  }, { passive: true });

  /* La carte se retourne une fois. Les textes sont visibles sans JavaScript. */
  function entree() {
    if (mouvementReduit.matches || clavier) return;
    document.body.classList.add('motion-ready');
    const carte = $('.postcard');
    carte.addEventListener('animationend', evenement => {
      if (evenement.animationName === 'postcard-arrival') carte.style.animation = 'none';
    });
  }
  requestAnimationFrame(entree);

  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    racine.classList.add('js');
    observateur = new IntersectionObserver(entrees => {
      for (const entree of entrees) {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateur.unobserve(entree.target);
        }
      }
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(element => observateur.observe(element));
  }
  mouvementReduit.addEventListener('change', evenement => {
    if (evenement.matches) {
      racine.classList.remove('js');
      document.body.classList.remove('motion-ready');
      observateur?.disconnect();
      $$('.step-panel').forEach(panneau => panneau.classList.remove('is-entering'));
    }
  });

  /* Les notes de source ouvrent directement leur volet. */
  function ouvrirSource() {
    if (location.hash.startsWith('#source-')) $('.sources').open = true;
  }
  document.addEventListener('click', evenement => {
    const lien = evenement.target.closest('a[href^="#source-"]');
    if (lien) $('.sources').open = true;
  });
  window.addEventListener('hashchange', ouvrirSource);
  ouvrirSource();

  /* Le jour courant est calculé à Paris, indépendamment du fuseau du visiteur. */
  const semaine = modele.dateDuJour(modele.maintenant().jour).getUTCDay();
  $(`tr[data-weekday="${semaine}"]`)?.classList.add('is-today');

  /* L’interface de rendez-vous n’a aucun appel réseau. */
  const etat = { prestation: null, jour: null, minute: null, etape: 0, termine: false };
  const formulaire = $('#booking-form');
  const panneaux = $$('[data-panel]');
  const etapes = $$('[data-step]');
  const annonce = $('#booking-announcement');
  const region = $('#simulation');
  const erreurs = ['#erreur-prestation', '#erreur-jour', '#erreur-heure'];

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }
  function radio(nom, valeur, desactive = false) {
    const champ = document.createElement('input');
    champ.type = 'radio';
    champ.name = nom;
    champ.value = valeur;
    champ.disabled = desactive;
    return champ;
  }
  function selection() {
    $('#recap-service').textContent = etat.prestation?.nom || 'Votre prestation';
    $('#recap-day').textContent = etat.jour ? modele.jourLong(etat.jour) : 'Votre jour';
    $('#recap-time').textContent = etat.minute !== null ? modele.heure(etat.minute) : 'Votre heure';
    etapes.forEach((bouton, index) => {
      bouton.disabled = etat.termine || (index > 0 && !etat.prestation) || (index > 1 && !etat.jour) || (index > 2 && etat.minute === null);
      if (index === etat.etape && !etat.termine) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function choisirPrestation(identifiant) {
    const choisie = modele.prestations.find(prestation => prestation.id === identifiant);
    if (!choisie) return;
    if (etat.prestation?.id !== identifiant) {
      etat.jour = null;
      etat.minute = null;
    }
    etat.prestation = choisie;
    $$('input[name="prestation"]').forEach(champ => { champ.checked = champ.value === identifiant; });
    $('#erreur-prestation').textContent = '';
    selection();
  }
  function dessinerPrestations() {
    const contenu = document.createDocumentFragment();
    modele.prestations.forEach(prestation => {
      const etiquette = element('label', 'service-option');
      const champ = radio('prestation', prestation.id);
      champ.setAttribute('aria-describedby', 'erreur-prestation');
      champ.addEventListener('change', () => choisirPrestation(prestation.id));
      etiquette.append(champ, element('span', '', prestation.nom), element('span', '', prestation.libelleDuree));
      contenu.append(etiquette);
    });
    $('#service-options').replaceChildren(contenu);
  }
  function dessinerJours() {
    if (!etat.prestation) return;
    const contenu = document.createDocumentFragment();
    const maintenant = new Date();
    const semaineCourte = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
    const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
    modele.jours(maintenant).forEach(jour => {
      const ferme = !modele.horaires[jour.semaine];
      const epuise = !ferme && !modele.creneaux(jour.cle, etat.prestation.duree, maintenant).some(creneau => creneau.disponible);
      const etiquette = element('label', 'day-option');
      const champ = radio('jour', jour.cle, ferme || epuise);
      const statut = ferme ? 'Fermé' : epuise ? 'Écoulé' : moisCourt.format(jour.date);
      champ.setAttribute('aria-label', `${modele.jourLong(jour.cle)}${ferme ? ', fermé' : epuise ? ', aucun créneau restant' : ', simulation'}`);
      champ.setAttribute('aria-describedby', 'erreur-jour');
      champ.checked = etat.jour === jour.cle && !champ.disabled;
      champ.addEventListener('change', () => {
        if (etat.jour !== jour.cle) etat.minute = null;
        etat.jour = jour.cle;
        $('#erreur-jour').textContent = '';
        selection();
      });
      etiquette.append(champ, element('span', 'day-week', semaineCourte.format(jour.date)), element('span', 'day-number', String(jour.date.getUTCDate())), element('span', 'day-status', statut));
      contenu.append(etiquette);
    });
    $('#days-options').replaceChildren(contenu);
  }
  function dessinerHeures() {
    if (!etat.prestation || !etat.jour) return;
    const contenu = document.createDocumentFragment();
    const creneaux = modele.creneaux(etat.jour, etat.prestation.duree);
    $('#slot-description').textContent = `${modele.jourLong(etat.jour)}. Créneaux fictifs : aucune disponibilité réelle n’est consultée. Le lundi, fermeture retenue à 18\u00a0h, à confirmer.`;
    creneaux.forEach(creneau => {
      const etiquette = element('label', 'slot-option');
      const champ = radio('heure', String(creneau.minute), !creneau.disponible);
      const statut = creneau.passe ? 'Écoulé' : creneau.occupe ? 'Pris, fictif' : 'Essai';
      champ.checked = etat.minute === creneau.minute && creneau.disponible;
      champ.setAttribute('aria-label', `${modele.heure(creneau.minute)}, ${statut.toLowerCase()}`);
      champ.setAttribute('aria-describedby', 'erreur-heure');
      champ.addEventListener('change', () => {
        etat.minute = creneau.minute;
        $('#erreur-heure').textContent = '';
        selection();
      });
      etiquette.append(champ, element('span', '', modele.heure(creneau.minute)), element('small', '', statut));
      contenu.append(etiquette);
    });
    if (!creneaux.some(creneau => creneau.disponible)) {
      contenu.append(element('p', 'step-help', 'Aucun créneau restant pour ce jour. Revenez au choix du jour.'));
    }
    $('#slots-options').replaceChildren(contenu);
  }
  function afficherEtape(index, deplacerFocus = true) {
    if (index > 0 && !etat.prestation) return;
    if (index > 1 && !etat.jour) return;
    if (index > 2 && etat.minute === null) return;
    cancelAnimationFrame(trameEntree);
    cancelAnimationFrame(trameSuite);
    etat.etape = index;
    if (index === 1) dessinerJours();
    if (index === 2) dessinerHeures();
    panneaux.forEach((panneau, numero) => {
      panneau.hidden = numero !== index;
      panneau.classList.remove('is-entering', 'instant-change');
    });
    const panneau = panneaux[index];
    if (mouvementReduit.matches || clavier) panneau.classList.add('instant-change');
    else {
      panneau.classList.add('is-entering');
      trameEntree = requestAnimationFrame(() => {
        trameSuite = requestAnimationFrame(() => panneau.classList.remove('is-entering'));
      });
    }
    selection();
    if (deplacerFocus) panneau.querySelector('h3').focus();
    annonce.textContent = `Étape ${index + 1} sur 4. ${panneau.querySelector('h3').textContent}`;
  }
  function verifierChoix(index) {
    let message = '';
    if (index === 0 && !etat.prestation) message = 'Choisissez une prestation pour continuer.';
    if (index === 1) {
      if (!etat.jour) message = 'Choisissez un jour pour continuer.';
      else if (!modele.creneaux(etat.jour, etat.prestation.duree).some(creneau => creneau.disponible)) {
        message = 'Ce jour n’a plus de créneau restant. Choisissez un autre jour.';
        etat.jour = null;
        etat.minute = null;
        dessinerJours();
        selection();
      }
    }
    if (index === 2) {
      if (etat.minute === null) message = 'Choisissez un créneau fictif pour continuer.';
      else if (!modele.creneaux(etat.jour, etat.prestation.duree).some(creneau => creneau.minute === etat.minute && creneau.disponible)) {
        message = 'Ce créneau est maintenant écoulé. Choisissez une autre heure.';
        etat.minute = null;
        dessinerHeures();
        selection();
      }
    }
    $(erreurs[index]).textContent = message;
    if (message) {
      const premier = panneaux[index].querySelector('input:not(:disabled)');
      premier?.focus();
    }
    return !message;
  }
  $$('[data-next]').forEach(bouton => bouton.addEventListener('click', () => {
    const index = Number(bouton.dataset.next);
    if (verifierChoix(index)) afficherEtape(index + 1);
  }));
  $$('[data-back]').forEach(bouton => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.back))));
  etapes.forEach(bouton => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.step))));

  function recommencer(deplacerFocus = true) {
    formulaire.reset();
    etat.prestation = null;
    etat.jour = null;
    etat.minute = null;
    etat.termine = false;
    $('#simulation-success').hidden = true;
    $('#success-recap').textContent = '';
    formulaire.hidden = false;
    $$('.form-error').forEach(message => { message.textContent = ''; });
    $$('input[aria-invalid]').forEach(champ => champ.removeAttribute('aria-invalid'));
    afficherEtape(0, deplacerFocus);
  }
  $$('[data-service]').forEach(lien => lien.addEventListener('click', () => {
    if (etat.termine) recommencer(false);
    choisirPrestation(lien.dataset.service);
    afficherEtape(1, false);
    // Le défilement natif garde l’introduction réelle et l’avertissement visibles.
    annonce.textContent = `${etat.prestation.nom} sélectionné pour la simulation. Choisissez un jour.`;
  }));
  $('#restart').addEventListener('click', () => recommencer());

  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    // Une validation par Entrée sur une étape intermédiaire suit la même progression.
    if (etat.etape < 3) {
      if (verifierChoix(etat.etape)) afficherEtape(etat.etape + 1);
      return;
    }
    if (!etat.prestation || !etat.jour || etat.minute === null) {
      afficherEtape(0);
      return;
    }
    if (!verifierChoix(2)) {
      afficherEtape(2);
      return;
    }
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    const prenomCorrect = prenom.value.trim().length >= 1;
    const telephoneCorrect = modele.telephoneValide(telephone.value);
    $('#erreur-prenom').textContent = prenomCorrect ? '' : 'Indiquez un prénom pour l’essai.';
    $('#erreur-telephone').textContent = telephoneCorrect ? '' : 'Indiquez un numéro français à dix chiffres, ou avec +33.';
    prenom.setAttribute('aria-invalid', String(!prenomCorrect));
    telephone.setAttribute('aria-invalid', String(!telephoneCorrect));
    if (!prenomCorrect || !telephoneCorrect) {
      (!prenomCorrect ? prenom : telephone).focus();
      return;
    }
    etat.termine = true;
    formulaire.hidden = true;
    const resultat = $('#simulation-success');
    resultat.hidden = false;
    $('#success-recap').textContent = `Pour ${prenom.value.trim()} : ${etat.prestation.nom}, le ${modele.jourLong(etat.jour)} à ${modele.heure(etat.minute)}. Cette sélection est fictive.`;
    // Les champs ne sont pas conservés, même après la fin de l’essai.
    prenom.value = '';
    telephone.value = '';
    selection();
    resultat.querySelector('h3').focus();
    annonce.textContent = 'Simulation terminée. Aucun rendez-vous n’est pris, aucune donnée n’a été envoyée.';
  });
  ['prenom', 'telephone'].forEach(identifiant => {
    $(`#${identifiant}`).addEventListener('input', evenement => {
      evenement.target.removeAttribute('aria-invalid');
      $(`#erreur-${identifiant}`).textContent = '';
    });
  });
  dessinerPrestations();
  afficherEtape(0, false);
  region.hidden = false;

  /* Mise à jour au retour sur l’onglet : un créneau écoulé ne peut pas être confirmé. */
  function rafraichir() {
    if (document.hidden || etat.termine) return;
    if (etat.etape === 1) dessinerJours();
    if (etat.etape === 2) dessinerHeures();
  }
  document.addEventListener('visibilitychange', rafraichir);
  window.addEventListener('pageshow', rafraichir);

  /* La barre mobile s’efface devant les actions déjà accessibles. */
  if ('IntersectionObserver' in window) {
    const barre = $('.mobile-bar');
    const blocages = new Set();
    const suivi = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.isIntersecting) blocages.add(entree.target);
        else blocages.delete(entree.target);
      });
      const masquer = blocages.size > 0;
      // Ne pas retirer du clavier un lien qui détient le focus.
      if (masquer && barre.contains(document.activeElement)) return;
      barre.classList.toggle('is-hidden', masquer);
      barre.inert = masquer;
    });
    ['.hero-actions', '.booking-section', '.site-footer'].forEach(selecteur => suivi.observe($(selecteur)));
  }
})();
