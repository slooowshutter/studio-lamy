(() => {
  'use strict';

  const racine = document.documentElement;
  const $ = (selecteur, contexte = document) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => Array.from(contexte.querySelectorAll(selecteur));
  const espaceFine = '\u00a0';
  const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const heuresExemple = [540, 660, 780, 900, 1020];
  const ouvertDe = 9 * 60;
  const fermeA = 19 * 60;
  const prestations = {
    coupe: 'Coupe de cheveux pour femme',
    extensions: 'Extensions de cheveux'
  };
  const choix = { prestation: '', jour: '', heure: '' };
  const etapes = $$('.booking-step');
  const formulaire = $('#formulaire-rendez-vous');
  const annonces = $('[data-annonce]');
  const compteur = $('[data-etape-courante]');
  const progression = $('[data-progression]');
  const joursEl = $('[data-jours]');
  const heuresEl = $('[data-heures]');
  const panneauSucces = $('[data-succes]');
  let etapeCourante = 0;
  let changementEnCours = false;

  function informationsParis(date = new Date()) {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const valeurs = Object.fromEntries(morceaux.map((partie) => [partie.type, partie.value]));
    return {
      annee: Number(valeurs.year), mois: Number(valeurs.month), jour: Number(valeurs.day),
      heure: Number(valeurs.hour) % 24, minute: Number(valeurs.minute)
    };
  }

  function dateParisEnDate(info) {
    return new Date(Date.UTC(info.annee, info.mois - 1, info.jour, 12));
  }

  function cleDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateAujourdhui() {
    return dateParisEnDate(informationsParis());
  }

  function heureTexte(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    return `${h}${espaceFine}h${espaceFine}${m}`;
  }

  function dateDeChoix(iso) {
    const [annee, moisNumero, jour] = iso.split('-').map(Number);
    return new Date(Date.UTC(annee, moisNumero - 1, jour, 12));
  }

  function texteDate(date) {
    return jourLong.format(date).replace(/^./, (lettre) => lettre.toLocaleUpperCase('fr-FR'));
  }

  function annonce(texte) {
    if (annonces) annonces.textContent = texte;
  }

  function miseAJourRecapitulatif() {
    const recapPrestation = $('[data-recap-prestation]');
    const recapDate = $('[data-recap-date]');
    if (recapPrestation) recapPrestation.textContent = prestations[choix.prestation] || 'À choisir';
    if (recapDate) {
      const date = choix.jour ? texteDate(dateDeChoix(choix.jour)) : '';
      const heure = choix.heure ? heureTexte(Number(choix.heure)) : '';
      recapDate.textContent = [date, heure].filter(Boolean).join(' · ') || 'À choisir';
    }
    $$('[data-modifier]').forEach((bouton) => {
      const cible = Number(bouton.dataset.modifier);
      const choisi = cible === 0 ? Boolean(choix.prestation) : cible === 1 ? Boolean(choix.jour) : Boolean(choix.heure);
      bouton.hidden = !choisi;
    });
  }

  function afficherEtape(numero, placerLeFocus = true) {
    if (changementEnCours || numero < 0 || numero >= etapes.length || numero === etapeCourante) return;
    const actuelle = etapes[etapeCourante];
    const suivante = etapes[numero];
    const reduire = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    changementEnCours = true;
    actuelle.classList.add('is-sortie');
    actuelle.setAttribute('aria-hidden', 'true');
    actuelle.inert = true;

    const terminer = () => {
      actuelle.hidden = true;
      actuelle.classList.remove('is-sortie');
      suivante.hidden = false;
      suivante.removeAttribute('aria-hidden');
      suivante.inert = false;
      suivante.classList.add('is-entree');
      etapeCourante = numero;
      if (compteur) compteur.textContent = String(numero + 1);
      if (progression) progression.style.transform = `scaleX(${(numero + 1) / etapes.length})`;
      const noms = ['Choisissez une prestation.', 'Choisissez un jour.', 'Choisissez une heure.', 'Indiquez vos coordonnées.'];
      annonce(`Étape ${numero + 1} sur ${etapes.length} · ${noms[numero]}`);
      requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.remove('is-entree')));
      if (placerLeFocus) {
        const titre = $('h3', suivante);
        if (titre) titre.focus({ preventScroll: true });
      }
      window.setTimeout(() => { changementEnCours = false; }, reduire ? 30 : 235);
    };

    window.setTimeout(terminer, reduire ? 0 : 220);
  }

  function genererJours() {
    if (!joursEl) return;
    const aujourdHui = dateAujourdhui();
    const aujourdHuiIso = cleDate(aujourdHui);
    const maintenant = informationsParis();
    const minutesMaintenant = maintenant.heure * 60 + maintenant.minute;
    joursEl.replaceChildren();

    for (let index = 0; index < 14; index += 1) {
      const date = new Date(aujourdHui.getTime() + index * 86400000);
      const iso = cleDate(date);
      const jour = date.getUTCDay();
      const ferme = jour === 1 || jour === 0;
      const termine = iso === aujourdHuiIso && (minutesMaintenant >= fermeA || !heuresExemple.some((heure) => heure > minutesMaintenant));
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'date-choice';
      bouton.dataset.jour = iso;
      bouton.disabled = ferme || termine;
      bouton.setAttribute('aria-pressed', String(choix.jour === iso));
      const libelleJour = jourCourt.format(date).replace('.', '');
      bouton.setAttribute('aria-label', `${nomsJours[jour]} ${date.getUTCDate()} ${mois.format(date)} ${date.getUTCFullYear()}${ferme ? ', fermé selon les horaires publiés' : termine ? ', plus aucun exemple d’heure pour aujourd’hui' : ''}`);
      bouton.setAttribute('aria-describedby', 'erreur-jour');

      const nom = document.createElement('span');
      nom.className = 'date-choice__day';
      nom.textContent = libelleJour;
      const nombre = document.createElement('span');
      nombre.className = 'date-choice__number';
      nombre.textContent = String(date.getUTCDate());
      bouton.append(nom, nombre);

      if (ferme) {
        bouton.classList.add('is-ferme');
        const note = document.createElement('span');
        note.className = 'date-choice__closed';
        note.textContent = 'Fermé';
        bouton.append(note);
      } else if (termine) {
        bouton.classList.add('is-termine');
        const note = document.createElement('span');
        note.className = 'date-choice__closed';
        note.textContent = 'Terminé';
        bouton.append(note);
      }
      if (choix.jour === iso) bouton.setAttribute('aria-pressed', 'true');
      bouton.addEventListener('click', () => {
        choix.jour = iso;
        choix.heure = '';
        $$('[data-jour]', joursEl).forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
        genererHeures();
        miseAJourRecapitulatif();
        const erreur = $('[data-erreur-jour]');
        if (erreur) erreur.hidden = true;
        annonce(`Jour choisi · ${texteDate(date)}.`);
      });
      joursEl.append(bouton);
    }
  }

  function genererHeures() {
    if (!heuresEl) return;
    heuresEl.replaceChildren();
    const aujourdHuiIso = cleDate(dateAujourdhui());
    const maintenant = informationsParis();
    const minuteActuelle = maintenant.heure * 60 + maintenant.minute;
    let nombreActif = 0;

    heuresExemple.forEach((minute) => {
      if (minute < ouvertDe || minute >= fermeA) return;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-choice';
      bouton.dataset.heure = String(minute);
      bouton.textContent = heureTexte(minute);
      const passe = choix.jour === aujourdHuiIso && minute <= minuteActuelle;
      bouton.disabled = passe;
      bouton.setAttribute('aria-pressed', String(Number(choix.heure) === minute));
      bouton.setAttribute('aria-describedby', 'erreur-heure');
      if (!passe) nombreActif += 1;
      bouton.addEventListener('click', () => {
        choix.heure = String(minute);
        $$('[data-heure]', heuresEl).forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
        miseAJourRecapitulatif();
        const erreur = $('[data-erreur-heure]');
        if (erreur) erreur.hidden = true;
        annonce(`Heure choisie · ${heureTexte(minute)}.`);
      });
      heuresEl.append(bouton);
    });

    const note = $('[data-note-heures]');
    if (note) note.hidden = nombreActif > 0;
  }

  function heureOuverture() {
    const info = informationsParis();
    const aujourdHui = dateParisEnDate(info);
    const jour = aujourdHui.getUTCDay();
    const heureActuelle = info.heure * 60 + info.minute;
    const statut = $('[data-statut]');
    if (!statut) return;

    if (jour === 1 || jour === 0 || heureActuelle < ouvertDe || heureActuelle >= fermeA) {
      if (jour === 1 || jour === 0) statut.textContent = 'Fermé aujourd’hui selon les horaires publiés';
      else if (heureActuelle < ouvertDe) statut.textContent = `Selon les horaires publiés · ouvre à ${heureTexte(ouvertDe)}`;
      else statut.textContent = 'Fermé aujourd’hui selon les horaires publiés';
      return;
    }
    statut.textContent = `Selon les horaires publiés · ouvert jusqu’à ${heureTexte(fermeA)}`;
  }

  function mettreEnPlaceMenu() {
    const bouton = $('.menu-toggle');
    const navigation = $('#navigation');
    if (!bouton || !navigation) return;
    const liens = $$('a', navigation);
    function fermerMenu(rendreFocus = false) {
      bouton.setAttribute('aria-expanded', 'false');
      navigation.classList.remove('is-ouvert');
      if (rendreFocus) bouton.focus();
    }
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-expanded') === 'true';
      bouton.setAttribute('aria-expanded', String(!ouvert));
      navigation.classList.toggle('is-ouvert', !ouvert);
      if (!ouvert && liens[0]) liens[0].focus();
    });
    liens.forEach((lien) => lien.addEventListener('click', () => fermerMenu(false)));
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 992) fermerMenu(false);
    }, { passive: true });
  }

  function configurerRevelations() {
    const cible = $$('.service-pill, .appointment-card, .hours-card, .address-card, .complete-card');
    const formes = $$('.hero__shape, .fact-section__seal');
    const reduire = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduire) return;
    cible.forEach((element, index) => {
      element.classList.add('revelation');
      element.style.transitionDelay = `${(index % 2) * 55}ms`;
    });
    if (!('IntersectionObserver' in window)) {
      cible.forEach((element) => element.classList.add('is-revealed'));
      formes.forEach((element) => element.classList.add('is-revealed'));
      return;
    }
    const observateur = new IntersectionObserver((entrees, observateurActif) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-revealed');
        observateurActif.unobserve(entree.target);
      });
    }, { threshold: .16, rootMargin: '0px 0px -5% 0px' });
    [...cible, ...formes].forEach((element) => observateur.observe(element));
  }

  function configurerBarreMobile() {
    const barre = $('[data-barre-mobile]');
    const actionsHero = $('.hero__actions');
    const reservation = $('#reservation');
    const pied = $('.site-footer');
    if (!barre || !actionsHero || !reservation || !pied || !('IntersectionObserver' in window)) return;
    const visible = new Map();
    const actualiser = () => {
      const actionsVisibles = visible.get(actionsHero) === true;
      const reservationVisible = visible.get(reservation) === true;
      const piedVisible = visible.get(pied) === true;
      barre.classList.toggle('is-visible', !actionsVisibles && !reservationVisible && !piedVisible && window.innerWidth <= 992);
    };
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => visible.set(entree.target, entree.isIntersecting));
      actualiser();
    }, { threshold: 0.01 });
    [actionsHero, reservation, pied].forEach((element) => observateur.observe(element));
    window.addEventListener('resize', actualiser, { passive: true });
  }

  function connecterPrestations() {
    $$('[data-choisir]').forEach((bouton) => {
      bouton.addEventListener('click', () => {
        const valeur = bouton.dataset.choisir;
        const radio = $(`input[name="prestation"][value="${valeur}"]`, formulaire);
        if (!radio) return;
        radio.checked = true;
        choix.prestation = valeur;
        choix.jour = '';
        choix.heure = '';
        miseAJourRecapitulatif();
        genererJours();
        genererHeures();
        const erreur = $('[data-erreur-prestation]');
        if (erreur) erreur.hidden = true;
        if (panneauSucces) panneauSucces.hidden = true;
        etapes.forEach((etape, index) => { etape.hidden = index !== 0; etape.inert = index !== 0; });
        etapeCourante = 0;
        afficherEtape(1, true);
        $('#reservation').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function validerEtContinuer() {
    if (etapeCourante === 0) {
      const selection = $('input[name="prestation"]:checked', formulaire);
      const erreur = $('[data-erreur-prestation]');
      if (!selection) {
        if (erreur) erreur.hidden = false;
        const premier = $('input[name="prestation"]', formulaire);
        if (premier) premier.focus();
        return;
      }
      choix.prestation = selection.value;
      if (erreur) erreur.hidden = true;
      miseAJourRecapitulatif();
    }
    if (etapeCourante === 1) {
      const erreur = $('[data-erreur-jour]');
      if (!choix.jour) {
        if (erreur) erreur.hidden = false;
        const premierOuvert = $('.date-choice:not(:disabled)', joursEl);
        if (premierOuvert) premierOuvert.focus();
        return;
      }
      if (erreur) erreur.hidden = true;
      genererHeures();
    }
    if (etapeCourante === 2) {
      const erreur = $('[data-erreur-heure]');
      if (!choix.heure) {
        if (erreur) erreur.hidden = false;
        const premierOuvert = $('.time-choice:not(:disabled)', heuresEl);
        if (premierOuvert) premierOuvert.focus();
        return;
      }
      if (erreur) erreur.hidden = true;
    }
    afficherEtape(etapeCourante + 1);
  }

  function validerCoordonnees() {
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    const erreurPrenom = $('[data-erreur-prenom]');
    const erreurTelephone = $('[data-erreur-telephone]');
    const telephoneNettoye = telephone.value.replace(/[\s().-]/g, '');
    const valideTelephone = /^(?:\+33|0)[1-9]\d{8}$/.test(telephoneNettoye);
    const validePrenom = prenom.value.trim().length > 0;
    erreurPrenom.hidden = validePrenom;
    erreurTelephone.hidden = valideTelephone;
    if (!validePrenom) { prenom.focus(); return false; }
    if (!valideTelephone) { telephone.focus(); return false; }
    return true;
  }

  function confirmerSimulation() {
    if (etapeCourante !== 3 || !validerCoordonnees()) return;
    const etape = etapes[3];
    etape.hidden = true;
    etape.inert = true;
    etape.setAttribute('aria-hidden', 'true');
    panneauSucces.hidden = false;
    annonce('Simulation terminée. Aucun rendez-vous n’a été transmis.');
    const titre = $('h3', panneauSucces);
    if (titre) { titre.tabIndex = -1; titre.focus(); }
  }

  function connecterFormulaire() {
    if (!formulaire) return;
    formulaire.addEventListener('click', (evenement) => {
      const continuer = evenement.target.closest('[data-suite]');
      const retour = evenement.target.closest('[data-retour]');
      const modifier = evenement.target.closest('[data-modifier]');
      const confirmer = evenement.target.closest('[data-confirmer]');
      if (continuer) validerEtContinuer();
      if (retour) afficherEtape(etapeCourante - 1);
      if (modifier) afficherEtape(Number(modifier.dataset.modifier));
      if (confirmer) confirmerSimulation();
    });
    formulaire.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter' && evenement.target.matches('#prenom, #telephone')) {
        evenement.preventDefault();
        $('[data-confirmer]', formulaire).click();
      }
    });
    formulaire.addEventListener('change', (evenement) => {
      if (evenement.target.matches('input[name="prestation"]')) {
        choix.prestation = evenement.target.value;
        choix.jour = '';
        choix.heure = '';
        miseAJourRecapitulatif();
        genererJours();
        genererHeures();
      }
    });
    ['prenom', 'telephone'].forEach((identifiant) => {
      const champ = $(`#${identifiant}`);
      if (!champ) return;
      champ.addEventListener('input', () => {
        const erreur = $(`[data-erreur-${identifiant}]`);
        if (erreur) erreur.hidden = true;
      });
    });
    const recommencer = $('[data-recommencer]');
    if (recommencer) recommencer.addEventListener('click', () => {
      choix.prestation = '';
      choix.jour = '';
      choix.heure = '';
      $$('input', formulaire).forEach((champ) => {
        if (champ.type === 'radio') champ.checked = false;
        else champ.value = '';
      });
      panneauSucces.hidden = true;
      etapes.forEach((etape, index) => {
        etape.hidden = index !== 0;
        etape.inert = index !== 0;
        etape.removeAttribute('aria-hidden');
      });
      etapeCourante = 0;
      if (compteur) compteur.textContent = '1';
      if (progression) progression.style.transform = 'scaleX(.25)';
      miseAJourRecapitulatif();
      genererJours();
      genererHeures();
      annonce('Étape 1 sur 4 · Choisissez une prestation.');
      const titre = $('h3', etapes[0]);
      if (titre) titre.focus();
    });
  }

  function marquerJourActuel() {
    const jour = dateAujourdhui().getUTCDay();
    const ligne = $(`[data-jour="${jour}"]`, $('.hours-list'));
    if (ligne) ligne.classList.add('is-aujourdhui');
  }

  function lancerEntree() {
    requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.remove('entree-en-attente')));
  }

  genererJours();
  genererHeures();
  miseAJourRecapitulatif();
  heureOuverture();
  marquerJourActuel();
  mettreEnPlaceMenu();
  configurerRevelations();
  configurerBarreMobile();
  connecterPrestations();
  connecterFormulaire();
  window.setInterval(heureOuverture, 60000);
  lancerEntree();
})();
