window.__site = true;
(() => {
  'use strict';

  const documentPage = document;
  const racine = documentPage.documentElement;
  const respecterMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selecteur, parent = documentPage) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = documentPage) => Array.from(parent.querySelectorAll(selecteur));
  const espaceInsecable = '\u00a0';
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const horaires = {
    0: null,
    1: [14 * 60, 18 * 60 + 30],
    2: [9 * 60, 18 * 60 + 30],
    3: [9 * 60, 18 * 60 + 30],
    4: [9 * 60, 18 * 60 + 30],
    5: [9 * 60, 18 * 60 + 30],
    6: [8 * 60, 17 * 60 + 30]
  };
  const etapes = $$('.flow-step');
  const recapMotif = $('[data-recap-motif]');
  const recapJour = $('[data-recap-jour]');
  const recapHeure = $('[data-recap-heure]');
  const statutSimulation = $('.flow-status');
  const formulaire = $('#booking-form');
  const resultat = $('#billet-imprime');
  const champPrenom = $('#prenom');
  const champTelephone = $('#telephone');
  const selected = { jour: null, heure: null };
  let etapeActuelle = 1;
  let transitionEnCours = false;

  function dateParis() {
    const elements = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = {};
    elements.forEach((element) => { valeurs[element.type] = element.value; });
    const date = new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
    return { date, minute: (Number(valeurs.hour) % 24) * 60 + Number(valeurs.minute) };
  }

  function dateIso(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function ajouterJours(date, nombre) {
    return new Date(date.getTime() + nombre * 86400000);
  }

  function heureFr(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${heures}${espaceInsecable}h${espaceInsecable}${String(reste).padStart(2, '0')}`;
  }

  function dateCourte(date) {
    return `${jours[date.getUTCDay()].slice(0, 3)}. ${date.getUTCDate()} ${mois[date.getUTCMonth()]}`;
  }

  function dateLongue(date) {
    return `${jours[date.getUTCDay()]} ${date.getUTCDate()} ${mois[date.getUTCMonth()]}`;
  }

  function dimanchePaques(annee) {
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
    const numeroMois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(annee, numeroMois - 1, jour, 12));
  }

  const joursFeries = new Map();
  function estJourFerie(date) {
    const annee = date.getUTCFullYear();
    if (!joursFeries.has(annee)) {
      const paques = dimanchePaques(annee);
      const dateMobile = (decalage) => dateIso(new Date(paques.getTime() + decalage * 86400000));
      const fixes = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((jourMois) => `${annee}-${jourMois}`);
      joursFeries.set(annee, new Set([...fixes, dateMobile(1), dateMobile(39), dateMobile(50)]));
    }
    return joursFeries.get(annee).has(dateIso(date));
  }

  function actualiserJourDansTableau(date) {
    const numero = date.getUTCDay();
    $$('[data-jour-semaine]').forEach((ligne) => {
      const estAujourdhui = Number(ligne.dataset.jourSemaine) === numero;
      if (estAujourdhui) ligne.setAttribute('data-aujourdhui', 'oui');
      else ligne.removeAttribute('data-aujourdhui');
    });
  }

  function remplirJours() {
    const zoneJours = $('[data-jours]');
    if (!zoneJours) return;
    const maintenant = dateParis();
    const aujourdHui = maintenant.date;
    actualiserJourDansTableau(aujourdHui);

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = ajouterJours(aujourdHui, decalage);
      const jourSemaine = date.getUTCDay();
      const fermetureHebdomadaire = horaires[jourSemaine] === null;
      const jourFerie = estJourFerie(date);
      const bouton = documentPage.createElement('button');
      const libelleJour = jours[jourSemaine];
      const nomDate = dateLongue(date);
      bouton.className = 'day-choice';
      bouton.type = 'button';
      bouton.dataset.jour = dateIso(date);
      bouton.disabled = fermetureHebdomadaire || jourFerie;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', fermetureHebdomadaire
        ? `${nomDate}, fermé`
        : jourFerie ? `${nomDate}, ouverture à confirmer pour ce jour férié` : `${nomDate}${decalage === 0 ? ', aujourd’hui' : ''}`);

      const petitJour = documentPage.createElement('span');
      petitJour.textContent = libelleJour.slice(0, 3);
      const nombre = documentPage.createElement('strong');
      nombre.textContent = String(date.getUTCDate());
      const indication = documentPage.createElement('span');
      if (fermetureHebdomadaire) indication.textContent = 'fermé';
      else if (jourFerie) indication.textContent = 'à confirmer';
      else if (decalage === 0) indication.textContent = 'aujourd’hui';
      bouton.append(petitJour, nombre, indication);

      if (!bouton.disabled) {
        bouton.addEventListener('click', () => choisirJour(date));
      }
      zoneJours.append(bouton);
    }
  }

  function choisirJour(date) {
    selected.jour = date;
    selected.heure = null;
    recapJour.textContent = dateLongue(date);
    recapHeure.textContent = 'À choisir';
    $$('[data-jours] .day-choice').forEach((bouton) => {
      const choisi = bouton.dataset.jour === dateIso(date);
      bouton.setAttribute('aria-pressed', String(choisi));
    });
    remplirHeures(date);
    $('[data-erreur-jour]').hidden = true;
    $('[data-erreur-heure]').hidden = true;
  }

  function heureIndisponibleDansLaDemo(iso, minutes) {
    const jourDuMois = Number(iso.slice(-2));
    const numeroCreneau = minutes / 30;
    return (jourDuMois + numeroCreneau) % 7 === 0;
  }

  function remplirHeures(date) {
    const zoneHeures = $('[data-heures]');
    if (!zoneHeures) return;
    zoneHeures.replaceChildren();
    const iso = dateIso(date);
    const plage = horaires[date.getUTCDay()];
    if (!plage) return;

    const aujourdHui = dateIso(date) === dateIso(dateParis().date);
    const minuteActuelle = dateParis().minute;
    for (let minutes = plage[0]; minutes <= plage[1]; minutes += 30) {
      const bouton = documentPage.createElement('button');
      const fictivementPris = heureIndisponibleDansLaDemo(iso, minutes);
      const dejaPasse = aujourdHui && minutes <= minuteActuelle;
      bouton.className = 'time-choice';
      bouton.type = 'button';
      bouton.dataset.heure = String(minutes);
      bouton.disabled = fictivementPris || dejaPasse;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${heureFr(minutes)}${fictivementPris ? ', indisponible dans cette simulation' : dejaPasse ? ', heure passée' : ''}`);
      bouton.textContent = heureFr(minutes);
      if (fictivementPris) {
        const precision = documentPage.createElement('small');
        precision.textContent = 'exemple';
        bouton.append(precision);
      } else if (dejaPasse) {
        const precision = documentPage.createElement('small');
        precision.textContent = 'passée';
        bouton.append(precision);
      } else {
        bouton.addEventListener('click', () => choisirHeure(minutes));
      }
      zoneHeures.append(bouton);
    }
  }

  function choisirHeure(minutes) {
    selected.heure = minutes;
    recapHeure.textContent = heureFr(minutes);
    $$('[data-heures] .time-choice').forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(Number(bouton.dataset.heure) === minutes));
    });
    $('[data-erreur-heure]').hidden = true;
  }

  function motifChoisi() {
    const entree = $('input[name="motif"]:checked');
    return entree ? entree.value : '';
  }

  function actualiserMotif() {
    recapMotif.textContent = motifChoisi() || 'À préciser';
  }

  function afficherEtape(numero) {
    if (transitionEnCours || numero < 1 || numero > etapes.length) return;
    transitionEnCours = true;
    const actuelle = etapes[etapeActuelle - 1];
    const suivante = etapes[numero - 1];
    if (actuelle === suivante) {
      transitionEnCours = false;
      return;
    }
    actuelle.classList.add('is-leaving');
    const delai = respecterMouvement.matches ? 0 : 220;
    window.setTimeout(() => {
      actuelle.hidden = true;
      actuelle.classList.remove('is-active', 'is-leaving');
      suivante.hidden = false;
      suivante.classList.add('is-active', 'is-entering');
      etapeActuelle = numero;
      actualiserMotif();
      statutSimulation.textContent = `Étape ${numero} sur quatre : ${$('h3', suivante).textContent}`;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          suivante.classList.remove('is-entering');
          $('h3', suivante).focus({ preventScroll: true });
          transitionEnCours = false;
        });
      });
    }, delai);
  }

  function validerEtContinuer() {
    if (etapeActuelle === 1) {
      if (!motifChoisi()) {
        statutSimulation.textContent = 'Choisissez un motif à préciser.';
        return;
      }
      actualiserMotif();
      afficherEtape(2);
      return;
    }
    if (etapeActuelle === 2) {
      if (!selected.jour) {
        $('[data-erreur-jour]').hidden = false;
        $('[data-erreur-jour]').focus?.();
        statutSimulation.textContent = 'Choisissez un jour ouvert pour continuer.';
        return;
      }
      afficherEtape(3);
      return;
    }
    if (etapeActuelle === 3) {
      if (selected.heure === null) {
        $('[data-erreur-heure]').hidden = false;
        statutSimulation.textContent = 'Choisissez une heure disponible pour continuer.';
        return;
      }
      afficherEtape(4);
    }
  }

  function validerCoordonnees() {
    const prenom = champPrenom.value.trim();
    const telephoneBrut = champTelephone.value.trim();
    const telephone = telephoneBrut.replace(/[\s().-]/g, '');
    const mobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephone);
    const erreurPrenom = $('#erreur-prenom');
    const erreurTelephone = $('#erreur-telephone');

    champPrenom.setAttribute('aria-invalid', String(prenom.length === 0));
    champTelephone.setAttribute('aria-invalid', String(!mobileValide));
    erreurPrenom.hidden = prenom.length > 0;
    erreurTelephone.hidden = mobileValide;
    if (!prenom.length) {
      champPrenom.focus();
      statutSimulation.textContent = 'Le prénom est nécessaire pour compléter ce billet de démonstration.';
      return false;
    }
    if (!mobileValide) {
      champTelephone.focus();
      statutSimulation.textContent = 'Le numéro de mobile ne semble pas valide.';
      return false;
    }
    return true;
  }

  function imprimerBillet() {
    const dateChoisie = selected.jour;
    const sortieDate = `${dateLongue(dateChoisie)} à ${heureFr(selected.heure)}`;
    $('[data-sortie-prenom]').textContent = champPrenom.value.trim();
    $('[data-sortie-motif]').textContent = motifChoisi();
    $('[data-sortie-date]').textContent = sortieDate;
    resultat.hidden = false;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resultat.classList.add('is-printed');
        $('#titre-impression').focus({ preventScroll: true });
        statutSimulation.textContent = 'Billet de simulation imprimé. Rien n’a été envoyé et aucun rendez-vous n’est réservé.';
        if (!respecterMouvement.matches) resultat.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  /* En-tête compact, sans piège de focus. */
  const boutonMenu = $('.menu-toggle');
  const menuMobile = $('#menu-mobile');
  function fermerMenu(rendreFocus) {
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
    $('.menu-toggle__text', boutonMenu).textContent = 'Navigation';
    menuMobile.hidden = true;
    if (rendreFocus) boutonMenu.focus();
  }
  if (boutonMenu && menuMobile) {
    boutonMenu.addEventListener('click', () => {
      const ouvrir = boutonMenu.getAttribute('aria-expanded') !== 'true';
      boutonMenu.setAttribute('aria-expanded', String(ouvrir));
      boutonMenu.setAttribute('aria-label', ouvrir ? 'Fermer la navigation' : 'Ouvrir la navigation');
      $('.menu-toggle__text', boutonMenu).textContent = ouvrir ? 'Fermer' : 'Navigation';
      menuMobile.hidden = !ouvrir;
      if (ouvrir) $('a', menuMobile).focus();
    });
    menuMobile.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermerMenu(false);
    });
    documentPage.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (evenement) => {
      if (evenement.matches && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    });
  }

  /* Dates générées d’après l’heure de Paris et les plages listées. */
  remplirJours();
  actualiserMotif();
  if (formulaire) {
    $$('[data-suite]', formulaire).forEach((bouton) => bouton.addEventListener('click', validerEtContinuer));
    $$('[data-retour]', formulaire).forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(etapeActuelle - 1)));
    $('input[name="motif"]', formulaire).addEventListener('change', actualiserMotif);
    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      if (validerCoordonnees()) imprimerBillet();
    });
    [champPrenom, champTelephone].forEach((champ) => champ.addEventListener('input', () => {
      if (champ.hasAttribute('aria-invalid')) champ.removeAttribute('aria-invalid');
      if (champ.id === 'prenom') $('#erreur-prenom').hidden = true;
      if (champ.id === 'telephone') $('#erreur-telephone').hidden = true;
    }));
  }

  /* Le rail se dévoile une seule fois, avec un léger décalage de talon. */
  const ciblesRevelees = $$('.reveal, .ticket-rail, .hours-list > div, .completion-list li, .source-list li');
  if (respecterMouvement.matches || !('IntersectionObserver' in window)) {
    ciblesRevelees.forEach((element) => element.classList.add('is-visible'));
  } else {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ciblesRevelees.forEach((element) => observateur.observe(element));
  }

  /* Le rappel mobile s’efface devant le formulaire et le pied de page. */
  const dockMobile = $('[data-dock]');
  if (dockMobile && 'IntersectionObserver' in window) {
    const elementsDansLeChamp = new Set();
    const observateurDock = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) elementsDansLeChamp.add(entree.target);
        else elementsDansLeChamp.delete(entree.target);
      });
      const masquerDock = elementsDansLeChamp.size > 0;
      dockMobile.classList.toggle('is-obscured', masquerDock);
      dockMobile.setAttribute('aria-hidden', String(masquerDock));
      dockMobile.inert = masquerDock;
    }, { threshold: 0.12 });
    ['#rendez-vous', '#pied'].forEach((selecteur) => {
      const element = $(selecteur);
      if (element) observateurDock.observe(element);
    });
  }

  window.requestAnimationFrame(() => window.requestAnimationFrame(() => documentPage.body.classList.add('is-ready')));
})();
