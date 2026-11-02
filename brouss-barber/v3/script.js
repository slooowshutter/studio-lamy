document.documentElement.classList.add('js');

const tous = (selecteur, contexte = document) => [...contexte.querySelectorAll(selecteur)];
const un = (selecteur, contexte = document) => contexte.querySelector(selecteur);
const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

// Navigation mobile : le panneau est visible sans JavaScript et se replie ensuite sous forme de menu.
const boutonMenu = un('.menu-toggle');
const navigation = un('#navigation');
const formatMobile = window.matchMedia('(max-width: 760px)');

function reglerNavigation() {
  boutonMenu.hidden = !formatMobile.matches;
  if (formatMobile.matches) {
    navigation.hidden = boutonMenu.getAttribute('aria-expanded') !== 'true';
  } else {
    navigation.hidden = false;
    boutonMenu.setAttribute('aria-expanded', 'false');
  }
}

reglerNavigation();
formatMobile.addEventListener('change', reglerNavigation);

boutonMenu.addEventListener('click', () => {
  const ouverte = boutonMenu.getAttribute('aria-expanded') === 'true';
  boutonMenu.setAttribute('aria-expanded', String(!ouverte));
  navigation.hidden = ouverte;
  if (!ouverte) un('a', navigation)?.focus();
});

navigation.addEventListener('keydown', (evenement) => {
  if (evenement.key === 'Escape' && formatMobile.matches && !navigation.hidden) {
    navigation.hidden = true;
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.focus();
  }
});

navigation.addEventListener('click', (evenement) => {
  if (evenement.target.closest('a') && formatMobile.matches) {
    navigation.hidden = true;
    boutonMenu.setAttribute('aria-expanded', 'false');
  }
});

// Révélations ponctuelles ; le texte reste visible si le navigateur ne les prend pas en charge.
const elementsReveles = [
  ...tous('[data-reveal]'),
  ...tous('[data-trait="rue"]'),
  un('.signature__line')
].filter(Boolean);

function montrerTout() {
  elementsReveles.forEach((element) => element.setAttribute('data-visible', ''));
}

if (mouvementReduit.matches || !('IntersectionObserver' in window)) {
  montrerTout();
} else {
  const observateur = new IntersectionObserver((entrees, observer) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.setAttribute('data-visible', '');
      observer.unobserve(entree.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  elementsReveles.forEach((element) => observateur.observe(element));
}

// Réservation de démonstration : les seuls services proposés sont ceux relevés sur Planity.
const prestations = {
  'james-dean': { nom: 'Coupe James Dean', duree: 30 },
  'victor-hugo': { nom: '« À la Victor Hugo » — soin complet', duree: 30 },
  chabal: { nom: 'Forfait Chabal', duree: 60 }
};

const formulaire = un('#formulaire-rendez-vous');
const etat = { prestation: '', jour: '', heure: '', etape: '1', transition: 0 };
const panneaux = tous('.booking-panel', formulaire);
const listeJours = un('#liste-jours');
const listeHeures = un('#liste-heures');
const annonceEtape = un('#annonce-etape');
const plageHoraire = un('#plage-horaire');
const resume = {
  prestation: un('[data-resume="prestation"]'),
  jour: un('[data-resume="jour"]'),
  heure: un('[data-resume="heure"]')
};

function dateParisMaintenant() {
  const morceaux = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const valeur = Object.fromEntries(morceaux.map((partie) => [partie.type, partie.value]));
  return new Date(Number(valeur.year), Number(valeur.month) - 1, Number(valeur.day), 12);
}

function cleDate(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function libelleJour(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
  }).format(date);
}

function heuresParis() {
  const morceaux = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const valeur = Object.fromEntries(morceaux.map((partie) => [partie.type, partie.value]));
  return Number(valeur.hour) * 60 + Number(valeur.minute);
}

function jourFerme(date) {
  return date.getDay() === 0 || date.getDay() === 1;
}

function creerDates() {
  const depart = dateParisMaintenant();
  const jours = Array.from({ length: 14 }, (_, index) => new Date(
    depart.getFullYear(), depart.getMonth(), depart.getDate() + index, 12
  ));

  listeJours.replaceChildren();
  jours.forEach((date, index) => {
    const cle = cleDate(date);
    const ferme = jourFerme(date);
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'date-choice';
    bouton.dataset.jour = cle;
    bouton.disabled = ferme;
    bouton.setAttribute('aria-label', `${libelleJour(date)}${ferme ? ', fermé' : ''}`);
    bouton.setAttribute('aria-pressed', 'false');

    const nomCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(date);
    const numero = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit' }).format(date);
    bouton.innerHTML = `<span>${nomCourt}</span><strong>${numero}</strong><small>${ferme ? 'Fermé' : index === 0 ? 'Aujourd’hui' : ''}</small>`;
    bouton.addEventListener('click', () => {
      etat.jour = cle;
      etat.heure = '';
      tous('.date-choice', listeJours).forEach((choix) => choix.setAttribute('aria-pressed', String(choix === bouton)));
      mettreResume();
      creerCreneaux();
      effacerErreur('jour');
    });
    listeJours.append(bouton);
  });
}

function intervalles(date) {
  const jour = date.getDay();
  if (jour >= 2 && jour <= 5) return [[9 * 60, 12 * 60], [14 * 60, 19 * 60]];
  if (jour === 6) return [[9 * 60, 17 * 60]];
  return [];
}

function hachage(texte) {
  let valeur = 2166136261;
  for (let index = 0; index < texte.length; index += 1) {
    valeur ^= texte.charCodeAt(index);
    valeur = Math.imul(valeur, 16777619);
  }
  return valeur >>> 0;
}

function heureTexte(minutes) {
  const heure = String(Math.floor(minutes / 60)).padStart(2, '0');
  const minute = String(minutes % 60).padStart(2, '0');
  return `${heure} h ${minute}`;
}

function creerCreneaux() {
  listeHeures.replaceChildren();
  if (!etat.jour || !etat.prestation) {
    listeHeures.textContent = 'Choisissez une prestation et un jour ouvert.';
    return;
  }

  const date = new Date(`${etat.jour}T12:00:00`);
  const duree = prestations[etat.prestation].duree;
  const maintenant = cleDate(dateParisMaintenant()) === etat.jour ? heuresParis() : -1;
  const creneaux = [];

  intervalles(date).forEach(([debut, fin]) => {
    for (let minute = debut; minute + duree <= fin; minute += 15) creneaux.push(minute);
  });

  if (creneaux.length === 0 || (maintenant >= 0 && creneaux.every((minute) => minute < maintenant))) {
    listeHeures.textContent = 'Aucun créneau restant ce jour-là. Choisissez une autre date.';
    return;
  }

  const premierCreneauFutur = creneaux.findIndex((minute) => maintenant < 0 || minute >= maintenant);
  creneaux.forEach((minute, index) => {
    const passe = maintenant >= 0 && minute < maintenant;
    const dejaPris = !passe && index !== premierCreneauFutur && hachage(`${etat.jour}|${minute}|${etat.prestation}`) % 5 === 0;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'time-choice';
    bouton.disabled = passe || dejaPris;
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', `${heureTexte(minute)}${passe ? ', passé' : dejaPris ? ', déjà pris' : ''}`);
    bouton.innerHTML = `<span>${heureTexte(minute)}</span>${passe ? '<small>Passé</small>' : dejaPris ? '<small>Déjà pris</small>' : ''}`;
    bouton.addEventListener('click', () => {
      etat.heure = String(minute);
      tous('.time-choice', listeHeures).forEach((choix) => choix.setAttribute('aria-pressed', String(choix === bouton)));
      mettreResume();
      effacerErreur('heure');
    });
    listeHeures.append(bouton);
  });
}

function jourLisible(cle) {
  if (!cle) return 'À choisir';
  const date = new Date(`${cle}T12:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

function mettreResume() {
  resume.prestation.textContent = etat.prestation ? prestations[etat.prestation].nom : 'À choisir';
  resume.jour.textContent = jourLisible(etat.jour);
  resume.heure.textContent = etat.heure ? heureTexte(Number(etat.heure)) : 'À choisir';
}

function mettreProgression(etape) {
  tous('[data-progression]').forEach((element) => {
    const numero = Number(element.dataset.progression);
    const bouton = un('button', element);
    if (numero === Number(etape)) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
    bouton.disabled = numero >= Number(etape);
  });
}

function allerA(etape, annonce = true) {
  const panneauActif = panneaux.find((panneau) => panneau.dataset.etape === String(etape));
  panneaux.forEach((panneau) => {
    const actif = panneau === panneauActif;
    panneau.hidden = !actif;
    if (actif) panneau.setAttribute('data-entering', '');
    else panneau.removeAttribute('data-entering');
  });
  etat.etape = String(etape);

  if (etape !== 'terminee') {
    mettreProgression(etape);
    const noms = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    annonceEtape.textContent = `Étape ${etape} sur 4. ${noms[Number(etape) - 1]}.`;
  } else {
    tous('[data-progression]').forEach((element) => {
      element.removeAttribute('aria-current');
      un('button', element).disabled = true;
    });
    annonceEtape.textContent = 'Simulation terminée. Rien n’a été envoyé au salon.';
  }

  const titreActif = un('h3', panneauActif);
  const afficherEtape = () => {
    titreActif.focus();
    panneauActif.removeAttribute('data-entering');
  };

  if (mouvementReduit.matches) afficherEtape();
  else window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    panneauActif.removeAttribute('data-entering');
    if (annonce) window.setTimeout(() => titreActif.focus(), 220);
  }));
}

function montrerErreur(cle) {
  const element = un(`[data-erreur="${cle}"]`);
  if (element) element.hidden = false;
}

function effacerErreur(cle) {
  const element = un(`[data-erreur="${cle}"]`);
  if (element) element.hidden = true;
}

formulaire.addEventListener('change', (evenement) => {
  if (evenement.target.name !== 'prestation') return;
  etat.prestation = evenement.target.value;
  etat.heure = '';
  mettreResume();
  creerCreneaux();
  effacerErreur('prestation');
});

un('.booking-demo').addEventListener('click', (evenement) => {
  const suite = evenement.target.closest('[data-suite]');
  const retour = evenement.target.closest('[data-retour]');
  const retourEtape = evenement.target.closest('[data-retour-etape]');

  if (suite) {
    const destination = suite.dataset.suite;
    if (destination === '2' && !etat.prestation) {
      montrerErreur('prestation');
      un('input[name="prestation"]', formulaire)?.focus();
      return;
    }
    if (destination === '3' && !etat.jour) {
      montrerErreur('jour');
      un('.date-choice:not(:disabled)', listeJours)?.focus();
      return;
    }
    if (destination === '4' && !etat.heure) {
      montrerErreur('heure');
      un('.time-choice:not(:disabled)', listeHeures)?.focus();
      return;
    }
    if (destination === '3') creerCreneaux();
    allerA(destination);
  }
  if (retour) allerA(retour.dataset.retour);
  if (retourEtape && !retourEtape.disabled) allerA(retourEtape.dataset.retourEtape);
});

const champPrenom = un('#prenom');
const champTelephone = un('#telephone');
champPrenom.addEventListener('input', () => { un('#erreur-prenom').hidden = true; });
champTelephone.addEventListener('input', () => { un('#erreur-telephone').hidden = true; });

formulaire.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  const prenomValide = champPrenom.value.trim().length > 0;
  const chiffres = champTelephone.value.replace(/\D/g, '');
  const telephoneValide = /^(?:0[67]\d{8}|33[67]\d{8}|0033[67]\d{8})$/.test(chiffres);
  un('#erreur-prenom').hidden = prenomValide;
  un('#erreur-telephone').hidden = telephoneValide;

  if (!prenomValide || !telephoneValide) {
    montrerErreur('coordonnees');
    (prenomValide ? champTelephone : champPrenom).focus();
    return;
  }

  effacerErreur('coordonnees');
  allerA('terminee');
});

const champPrenomEtTelephone = formulaire.querySelectorAll('#prenom, #telephone');
champPrenomEtTelephone.forEach((champ) => champ.addEventListener('input', () => effacerErreur('coordonnees')));

creerDates();
mettreResume();
