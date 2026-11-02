window.apercuCharge = true;

(() => {
  'use strict';

  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => Array.from(parent.querySelectorAll(selecteur));
  const espaceInsecable = '\u00a0';
  const durees = {
    'coupe-femme': { nom: 'Shampoing coupe brushing', minutes: 45 },
    'coupe-homme': { nom: 'Shampooing coupe homme coiffage', minutes: 30 }
  };
  const horaires = {
    0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140],
    5: [540, 1140], 6: [540, 1080]
  };
  const formatHeureParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formatLong = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const formatJourCourt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
  });

  const etat = { prestation: null, jour: null, heure: null, etapeMax: 1, etapeActuelle: 1 };
  const formulaire = $('#parcours');
  const casesEtape = $$('[data-etape]', formulaire);
  const annonce = $('#annonce-parcours');
  const radios = $$('input[name="prestation"]', formulaire);
  const jours = $('#jours');
  const heures = $('#heures');
  const progression = $$('[data-aller-etape]');
  const boutonsSuite = $$('[data-suite]');
  const selectionPrestation = $('#selection-prestation');
  const selectionJour = $('#selection-jour');
  const selectionHeure = $('#selection-heure');
  const recapitulatif = $('#recapitulatif');

  function parties(date) {
    const sortie = {};
    formatHeureParis.formatToParts(date).forEach((element) => { sortie[element.type] = element.value; });
    return sortie;
  }

  function maintenantParis() {
    const p = parties(new Date());
    const midiUtc = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 12));
    return {
      date: midiUtc,
      annee: Number(p.year),
      mois: Number(p.month),
      jour: Number(p.day),
      minute: Number(p.hour) * 60 + Number(p.minute)
    };
  }

  const dateIso = (date) => date.toISOString().slice(0, 10);
  const ajouterJours = (date, nombre) => new Date(date.getTime() + nombre * 86400000);
  const majuscule = (texte) => texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);

  function heureLisible(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute === 0
      ? String(heure) + espaceInsecable + 'h'
      : String(heure) + espaceInsecable + 'h' + espaceInsecable + String(minute).padStart(2, '0');
  }

  function calculPaques(annee) {
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
  }

  const cacheFeries = new Map();
  function joursFeries(annee) {
    if (cacheFeries.has(annee)) return cacheFeries.get(annee);
    const jours = new Set(
      ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25']
        .map((jourMois) => String(annee) + '-' + jourMois)
    );
    const paques = calculPaques(annee);
    [1, 39, 50].forEach((decalage) => { jours.add(dateIso(new Date(paques + decalage * 86400000))); });
    cacheFeries.set(annee, jours);
    return jours;
  }

  function estJourFerie(date) {
    return joursFeries(date.getUTCFullYear()).has(dateIso(date));
  }

  function dureeChoisie() {
    return etat.prestation ? durees[etat.prestation] : null;
  }

  function texteJour(date) {
    return majuscule(formatLong.format(date));
  }

  function creerDates() {
    jours.replaceChildren();
    const aujourdhui = maintenantParis();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = ajouterJours(aujourdhui.date, decalage);
      const jourSemaine = date.getUTCDay();
      const horairesDuJour = horaires[jourSemaine];
      const ferie = estJourFerie(date);
      const ferme = horairesDuJour === null;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.jour = dateIso(date);
      bouton.setAttribute('aria-pressed', 'false');

      const nomJour = document.createElement('span');
      nomJour.className = 'jour__nom';
      nomJour.textContent = formatJourCourt.format(date).split(' ')[0].replace('.', '');
      const numeroJour = document.createElement('span');
      numeroJour.className = 'jour__date';
      numeroJour.textContent = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric', month: 'short', timeZone: 'UTC'
      }).format(date).replace('.', '');
      const etatJour = document.createElement('span');
      etatJour.className = 'jour__etat';

      if (ferme) {
        bouton.disabled = true;
        bouton.dataset.etat = 'ferme';
        etatJour.textContent = 'Fermé';
        bouton.setAttribute('aria-label', texteJour(date) + ', fermé selon les horaires publiés');
      } else if (ferie) {
        bouton.disabled = true;
        bouton.dataset.etat = 'confirmer';
        etatJour.textContent = 'À confirmer';
        bouton.setAttribute('aria-label', texteJour(date) + ', horaires à confirmer');
      } else {
        etatJour.textContent = decalage === 0 ? 'Aujourd’hui' : 'Ouvert';
        bouton.setAttribute('aria-label', texteJour(date) + ', horaires publiés');
        bouton.addEventListener('click', () => {
          etat.jour = date;
          etat.heure = null;
          $$('.jour', jours).forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
          afficherHeures();
          actualiserSelection();
          effacerErreur('erreur-jour');
          effacerErreur('erreur-heure');
          annoncer('Jour choisi' + espaceInsecable + ': ' + texteJour(date) + '.');
        });
      }

      bouton.append(nomJour, numeroJour, etatJour);
      jours.append(bouton);
    }
  }

  function pseudoPris(date, minute, duree) {
    const jourDuMois = date.getUTCDate();
    const numeroCreneau = Math.floor(minute / 30);
    return (jourDuMois + numeroCreneau + Math.floor(duree / 15)) % 9 === 0;
  }

  function afficherHeures() {
    heures.replaceChildren();
    if (!etat.jour || !etat.prestation) return;

    const duree = dureeChoisie();
    const ouvert = horaires[etat.jour.getUTCDay()];
    if (!ouvert || estJourFerie(etat.jour)) return;

    const aujourdhui = maintenantParis();
    const memeJour = dateIso(etat.jour) === dateIso(aujourdhui.date);
    const debut = ouvert[0];
    const dernierDebut = ouvert[1] - duree.minutes;
    let compte = 0;
    let disponibles = 0;

    for (let minute = debut; minute <= dernierDebut; minute += 30) {
      const passe = memeJour && minute <= aujourdhui.minute;
      const pris = !passe && pseudoPris(etat.jour, minute, duree.minutes);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      if (pris) bouton.classList.add('heure--prise');
      bouton.dataset.heure = String(minute);
      bouton.setAttribute('aria-pressed', String(etat.heure === minute));

      const texte = document.createElement('span');
      texte.textContent = heureLisible(minute);
      bouton.append(texte);

      if (passe || pris) {
        bouton.disabled = true;
        const motif = document.createElement('span');
        motif.className = 'heure__etat';
        motif.textContent = passe ? 'Passée' : 'Déjà pris';
        bouton.append(motif);
        bouton.setAttribute('aria-label', passe
          ? heureLisible(minute) + ', heure passée'
          : heureLisible(minute) + ', déjà pris dans cette simulation');
      } else {
        bouton.setAttribute('aria-label', heureLisible(minute));
        disponibles += 1;
        bouton.addEventListener('click', () => {
          etat.heure = minute;
          $$('.heure', heures).forEach((heure) => heure.setAttribute('aria-pressed', String(heure === bouton)));
          actualiserSelection();
          effacerErreur('erreur-heure');
          annoncer('Heure choisie' + espaceInsecable + ': ' + heureLisible(minute) + '.');
        });
      }

      heures.append(bouton);
      compte += 1;
    }

    if (compte === 0 || disponibles === 0) {
      const vide = document.createElement('p');
      vide.className = 'heures__vide';
      vide.textContent = 'Aucun créneau compatible ne reste ce jour. Choisissez une autre date.';
      heures.append(vide);
    }
  }

  function annoncer(message) {
    annonce.textContent = '';
    window.setTimeout(() => { annonce.textContent = message; }, 20);
  }

  function afficherErreur(id, message) {
    const cible = document.getElementById(id);
    if (cible) cible.textContent = message;
  }

  function effacerErreur(id) {
    afficherErreur(id, '');
  }

  function actualiserProgression() {
    progression.forEach((bouton) => {
      const numero = Number(bouton.dataset.allerEtape);
      bouton.disabled = numero > etat.etapeMax;
      if (numero === etat.etapeActuelle) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function actualiserSelection() {
    const service = dureeChoisie();
    selectionPrestation.textContent = service ? service.nom : '—';
    selectionJour.textContent = etat.jour ? texteJour(etat.jour) : '—';
    selectionHeure.textContent = etat.heure !== null ? heureLisible(etat.heure) : '—';

    if (service && etat.jour && etat.heure !== null) {
      recapitulatif.textContent = service.nom + ' · ' + texteJour(etat.jour) + ' à ' + heureLisible(etat.heure) + '. Tarif à confirmer avec le salon.';
    } else {
      recapitulatif.textContent = '';
    }
  }

  function allerAEtape(numero, avecFocus = true) {
    const destination = casesEtape.find((element) => Number(element.dataset.etape) === numero);
    if (!destination) return;

    casesEtape.forEach((element) => {
      if (element !== destination) element.hidden = true;
    });
    destination.hidden = false;
    destination.classList.add('etape--nouvelle');
    requestAnimationFrame(() => destination.classList.remove('etape--nouvelle'));

    etat.etapeActuelle = numero;
    actualiserProgression();
    annoncer('Étape ' + numero + ' sur 4' + espaceInsecable + ': ' + $('h3', destination).textContent + '.');
    if (avecFocus) $('h3', destination).focus();
  }

  function continuerDepuis(numero) {
    if (numero === 1) {
      const choix = $('input[name="prestation"]:checked', formulaire);
      if (!choix) {
        afficherErreur('erreur-prestation', 'Choisissez une prestation pour continuer.');
        return;
      }
      etat.prestation = choix.value;
      etat.jour = null;
      etat.heure = null;
      etat.etapeMax = 2;
      creerDates();
      actualiserSelection();
      allerAEtape(2);
      return;
    }

    if (numero === 2) {
      if (!etat.jour) {
        afficherErreur('erreur-jour', 'Choisissez un jour ouvert pour continuer.');
        return;
      }
      etat.etapeMax = Math.max(etat.etapeMax, 3);
      afficherHeures();
      actualiserSelection();
      allerAEtape(3);
      return;
    }

    if (numero === 3) {
      if (etat.heure === null) {
        afficherErreur('erreur-heure', 'Choisissez une heure disponible dans cette simulation.');
        return;
      }
      etat.etapeMax = Math.max(etat.etapeMax, 4);
      actualiserSelection();
      allerAEtape(4);
    }
  }

  function obtenirJour(date) {
    return { annee: date.getUTCFullYear(), mois: date.getUTCMonth() + 1, jour: date.getUTCDate() };
  }

  function heureUtcPourParis(date, minutes) {
    const jour = obtenirJour(date);
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const souhaite = Date.UTC(jour.annee, jour.mois - 1, jour.jour, heure, minute);
    let estimation = souhaite;
    for (let tentative = 0; tentative < 3; tentative += 1) {
      const p = parties(new Date(estimation));
      const observe = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
      estimation += souhaite - observe;
    }
    return estimation;
  }

  function dateCalendaire(instant) {
    return instant.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function echapperIcs(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function creerAgenda() {
    const service = dureeChoisie();
    if (!service || !etat.jour || etat.heure === null) return;

    const debut = heureUtcPourParis(etat.jour, etat.heure);
    const fin = heureUtcPourParis(etat.jour, etat.heure + service.minutes);
    const contenu = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Simulation de rendez-vous//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:simulation-imagin-coiffure-' + Date.now() + '@apercu.local',
      'DTSTAMP:' + dateCalendaire(new Date()),
      'DTSTART:' + dateCalendaire(new Date(debut)),
      'DTEND:' + dateCalendaire(new Date(fin)),
      'SUMMARY:' + echapperIcs("Simulation de rendez-vous — Imag'in Coiffure"),
      'DESCRIPTION:' + echapperIcs("Événement de démonstration. Aucun rendez-vous n'a été pris."),
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'rendez-vous-simulation-imagin-coiffure.ics';
    document.body.append(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      etat.prestation = radio.value;
      etat.jour = null;
      etat.heure = null;
      etat.etapeMax = 1;
      actualiserProgression();
      actualiserSelection();
      afficherErreur('erreur-prestation', '');
      annoncer(durees[radio.value].nom + ' sélectionnée.');
    });
  });

  boutonsSuite.forEach((bouton) => {
    bouton.addEventListener('click', () => continuerDepuis(Number(bouton.dataset.suite)));
  });

  $$('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerAEtape(Number(bouton.dataset.retour) - 1));
  });

  progression.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.allerEtape);
      if (!bouton.disabled) allerAEtape(numero);
    });
  });

  $('#telephone').addEventListener('input', () => effacerErreur('erreur-telephone'));
  $('#prenom').addEventListener('input', () => effacerErreur('erreur-prenom'));

  formulaire.addEventListener('submit', (event) => {
    event.preventDefault();
    const prenom = $('#prenom').value.trim();
    const telephone = $('#telephone').value.trim();
    const telephoneCompact = telephone.replace(/[\s().-]/g, '');
    const prenomValide = prenom.length >= 2;
    const telephoneValide = /^(?:\+33[67]\d{8}|0[67]\d{8})$/.test(telephoneCompact);

    afficherErreur('erreur-prenom', prenomValide ? '' : 'Saisissez un prénom d’au moins deux lettres.');
    afficherErreur('erreur-telephone', telephoneValide ? '' : 'Saisissez un numéro mobile français valide.');

    if (!prenomValide) { $('#prenom').focus(); return; }
    if (!telephoneValide) { $('#telephone').focus(); return; }

    const service = dureeChoisie();
    const confirmation = $('#confirmation');
    $('#texte-confirmation').textContent = prenom + ', votre sélection : ' + service.nom + ', ' + texteJour(etat.jour) + ' à ' + heureLisible(etat.heure) + '.';
    casesEtape.forEach((element) => { element.hidden = true; });
    $('.parcours__progression', formulaire).hidden = true;
    confirmation.hidden = false;
    $('#titre-confirmation').focus();
    annoncer('Simulation terminée. Aucun rendez-vous n’a été réservé et rien n’a été envoyé.');
  });

  $('#telecharger-agenda').addEventListener('click', creerAgenda);
  $('#recommencer').addEventListener('click', () => {
    formulaire.reset();
    etat.prestation = null;
    etat.jour = null;
    etat.heure = null;
    etat.etapeMax = 1;
    etat.etapeActuelle = 1;
    $('.parcours__progression', formulaire).hidden = false;
    $('#confirmation').hidden = true;
    casesEtape.forEach((element) => {
      element.hidden = Number(element.dataset.etape) !== 1;
      element.classList.remove('etape--nouvelle');
    });
    ['erreur-prestation', 'erreur-jour', 'erreur-heure', 'erreur-prenom', 'erreur-telephone'].forEach(effacerErreur);
    actualiserProgression();
    actualiserSelection();
    $('#titre-etape-1').focus();
    annoncer('La simulation recommence à la première étape.');
  });

  const boutonMenu = $('.menu-bouton');
  const menuMobile = $('#menu-mobile');
  let minuterieMenu;
  function fermerMenu(rendreFocus = false) {
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.setAttribute('aria-label', 'Ouvrir le sommaire');
    menuMobile.classList.remove('navigation-mobile--ouverte');
    window.clearTimeout(minuterieMenu);
    minuterieMenu = window.setTimeout(() => { menuMobile.hidden = true; }, 190);
    if (rendreFocus) boutonMenu.focus();
  }
  boutonMenu.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    if (ouvert) { fermerMenu(false); return; }
    window.clearTimeout(minuterieMenu);
    menuMobile.hidden = false;
    boutonMenu.setAttribute('aria-expanded', 'true');
    boutonMenu.setAttribute('aria-label', 'Fermer le sommaire');
    requestAnimationFrame(() => menuMobile.classList.add('navigation-mobile--ouverte'));
    $('a', menuMobile).focus();
  });
  $$('a', menuMobile).forEach((lien) => lien.addEventListener('click', () => fermerMenu(true)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
  });
  window.matchMedia('(min-width: 52.001rem)').addEventListener?.('change', (event) => {
    if (event.matches && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(false);
  });

  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, observation) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        observation.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });

    $$('[data-revelation], .mesure, .reperes').forEach((element, index) => {
      element.style.setProperty('--ordre', String(index));
      observateur.observe(element);
    });

    const barre = $('#barre-mobile');
    let rendezVousVisible = false;
    let piedVisible = false;
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target.id === 'rendez-vous') rendezVousVisible = entree.isIntersecting;
        if (entree.target.id === 'pied') piedVisible = entree.isIntersecting;
      });
      barre.classList.toggle('barre-mobile--masquee', rendezVousVisible || piedVisible);
    }, { threshold: 0, rootMargin: '0px 0px -36% 0px' });
    observateurBarre.observe($('#rendez-vous'));
    observateurBarre.observe($('#pied'));
  } else {
    document.documentElement.classList.remove('js');
  }

  window.setTimeout(() => document.body.classList.add('est-charge'), 40);
  actualiserProgression();
  actualiserSelection();
})();
