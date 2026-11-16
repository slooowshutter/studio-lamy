document.documentElement.classList.add('js');

const prestations = {
  'semi-permanent': {
    nom: 'Manucure en vernis semi-permanent',
    duree: '45 min à 1 h 05 min',
    dureeMax: 65,
    decalage: 0
  },
  renforcement: {
    nom: 'Gel - Renforcement ongles naturels',
    duree: '55 min à 1 h 10 min',
    dureeMax: 70,
    decalage: 1
  },
  chablon: {
    nom: "Gel - Extension d'ongles au chablon",
    duree: '1 h 20 min à 1 h 35 min',
    dureeMax: 95,
    decalage: 2
  },
  'spa-pieds': {
    nom: 'Soin SPA Pieds & Vernis semi-permanent',
    duree: '55 min à 1 h',
    dureeMax: 60,
    decalage: 3
  }
};

const horaires = {
  0: null,
  1: [14 * 60, 19 * 60 + 30],
  2: [11 * 60, 19 * 60 + 30],
  3: [10 * 60 + 30, 19 * 60 + 30],
  4: [10 * 60 + 30, 19 * 60 + 30],
  5: [10 * 60 + 30, 19 * 60 + 30],
  6: [11 * 60, 19 * 60 + 30]
};

const libellesEtapes = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
const etat = { etape: 1, prestation: null, jour: null, heure: null, prenom: '', telephone: '' };
const formulaire = document.querySelector('#formulaire-reservation');
const zoneJours = document.querySelector('#choix-jours');
const zoneHeures = document.querySelector('#choix-heures');
const annonceEtape = document.querySelector('#annonce-etape');
const progression = document.querySelector('#progression');
const blocConfirme = document.querySelector('#billet-confirme');
const resumeFinal = document.querySelector('#recapitulatif-final');
const joursParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
});
const nomJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: 'UTC' });
const nomJourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
const nomMoisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const dateLongue = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
});

function dateParisAujourdhui() {
  const elements = Object.fromEntries(joursParis.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return new Date(Date.UTC(Number(elements.year), Number(elements.month) - 1, Number(elements.day)));
}

const aujourdhui = dateParisAujourdhui();

function datePourDecalage(decalage) {
  const copie = new Date(aujourdhui);
  copie.setUTCDate(copie.getUTCDate() + decalage);
  return copie;
}

function heureParisEnMinutes() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const elements = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(elements.hour) * 60 + Number(elements.minute);
}

function texteHeure(minutes) {
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return minutesRestantes === 0 ? `${heures} h` : `${heures} h ${String(minutesRestantes).padStart(2, '0')}`;
}

function dateEstAujourdhui(date) {
  return date.getUTCFullYear() === aujourdhui.getUTCFullYear()
    && date.getUTCMonth() === aujourdhui.getUTCMonth()
    && date.getUTCDate() === aujourdhui.getUTCDate();
}

function actualiserResume() {
  const prestation = etat.prestation ? prestations[etat.prestation] : null;
  document.querySelector('#resume-prestation').textContent = prestation ? prestation.nom : 'À choisir';
  document.querySelector('#resume-jour').textContent = etat.jour ? dateLongue.format(etat.jour) : 'À choisir';
  document.querySelector('#resume-heure').textContent = etat.heure === null ? 'À choisir' : texteHeure(etat.heure);
}

function actualiserEtapes() {
  progression.textContent = `${etat.etape} / 4`;
  annonceEtape.textContent = `Étape ${etat.etape} sur 4 — ${etat.etape === 1 ? 'choisissez une prestation.' : etat.etape === 2 ? 'choisissez un jour.' : etat.etape === 3 ? 'choisissez une heure.' : 'saisissez vos coordonnées.'}`;
  document.querySelectorAll('[data-retour-etape]').forEach((bouton) => {
    const numero = Number(bouton.dataset.retourEtape);
    bouton.disabled = numero > etat.etape;
    if (numero === etat.etape) bouton.setAttribute('aria-current', 'step');
    else bouton.removeAttribute('aria-current');
  });
}

function mettreAJourAdresseEtape(numero, ajouterHistorique) {
  if (!window.history || !window.history.replaceState) return;
  const adresse = new URL(window.location.href);
  adresse.searchParams.set('etape', ['prestation', 'jour', 'heure', 'coordonnees'][numero - 1]);
  const entree = { etape: numero };
  if (ajouterHistorique && window.history.pushState) window.history.pushState(entree, '', adresse);
  else window.history.replaceState(entree, '', adresse);
}

function changerEtape(numero, options = {}) {
  if (numero < 1 || numero > 4 || numero === etat.etape) return;
  const ancienne = document.querySelector(`[data-panneau="${etat.etape}"]`);
  const suivante = document.querySelector(`[data-panneau="${numero}"]`);
  const ancienneEtape = etat.etape;
  etat.etape = numero;
  actualiserEtapes();
  actualiserResume();

  if (numero === 3) dessinerHeures();

  if (ancienne) {
    ancienne.classList.add('sortie');
    ancienne.inert = true;
    ancienne.setAttribute('aria-hidden', 'true');
  }
  suivante.hidden = false;
  suivante.inert = false;
  suivante.setAttribute('aria-hidden', 'false');
  suivante.classList.add('en-attente');
  requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.remove('en-attente')));

  window.setTimeout(() => {
    if (ancienne && ancienneEtape !== etat.etape) {
      ancienne.hidden = true;
      ancienne.classList.remove('sortie');
    }
    const titre = suivante.querySelector('h3');
    if (titre && etat.etape === numero) titre.focus();
  }, 220);

  if (!options.sansHistorique) mettreAJourAdresseEtape(numero, options.remplacer !== true);
}

function montrerErreur(selecteur, visible) {
  const element = document.querySelector(selecteur);
  if (element) element.hidden = !visible;
}

function dessinerJours() {
  zoneJours.replaceChildren();
  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = datePourDecalage(decalage);
    const jour = date.getUTCDay();
    const ouvert = horaires[jour] !== null;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.dataset.date = date.toISOString().slice(0, 10);
    bouton.disabled = !ouvert;
    bouton.setAttribute('aria-pressed', 'false');
    const court = nomJourCourt.format(date).replace('.', '');
    const mois = nomMoisCourt.format(date).replace('.', '');
    bouton.setAttribute('aria-label', `${nomJour.format(date)} ${date.getUTCDate()} ${mois}${ouvert ? '' : ', fermé selon les horaires affichés'}`);
    bouton.innerHTML = `<strong>${court}</strong><span>${date.getUTCDate()} ${mois}${ouvert ? '' : ' · fermé'}</span>`;
    if (etat.jour && dateEstMemeJour(date, etat.jour)) bouton.setAttribute('aria-pressed', 'true');
    zoneJours.append(bouton);
  }
}

function dateEstMemeJour(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

function dateDepuisValeur(valeur) {
  const [annee, mois, jour] = valeur.split('-').map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour));
}

function dessinerHeures() {
  zoneHeures.replaceChildren();
  const prestation = etat.prestation ? prestations[etat.prestation] : null;
  const date = etat.jour;
  if (!prestation || !date) return;

  const plage = horaires[date.getUTCDay()];
  if (!plage) return;
  const [ouverture, fermeture] = plage;
  const derniereHeure = fermeture - prestation.dureeMax;
  const minuteActuelle = dateEstAujourdhui(date) ? heureParisEnMinutes() : -1;

  for (let minutes = ouverture, index = 0; minutes <= derniereHeure; minutes += 30, index += 1) {
    const bouton = document.createElement('button');
    const dejaPasse = dateEstAujourdhui(date) && minutes <= minuteActuelle;
    const prisDansLaDemo = index > 0 && (date.getUTCDate() + index + prestation.decalage) % 6 === 2;
    const indisponible = dejaPasse || prisDansLaDemo;
    bouton.type = 'button';
    bouton.textContent = texteHeure(minutes);
    bouton.dataset.minute = String(minutes);
    bouton.disabled = indisponible;
    bouton.setAttribute('aria-pressed', 'false');
    if (etat.heure === minutes) bouton.setAttribute('aria-pressed', 'true');
    if (dejaPasse) bouton.setAttribute('aria-label', `${texteHeure(minutes)}, heure déjà passée dans cette démonstration`);
    else if (prisDansLaDemo) bouton.setAttribute('aria-label', `${texteHeure(minutes)}, indisponible dans cette démonstration`);
    zoneHeures.append(bouton);
  }

  const jourTexte = dateLongue.format(date);
  document.querySelector('#note-creneaux').textContent = `Créneaux fictifs pour le ${jourTexte}, dans les heures Treatwell à confirmer. Les heures déjà passées et quelques heures simulées sont désactivées.`;
}

function selectionnerHeure(bouton) {
  zoneHeures.querySelectorAll('button').forEach((heure) => heure.setAttribute('aria-pressed', String(heure === bouton)));
  etat.heure = Number(bouton.dataset.minute);
  actualiserResume();
  montrerErreur('#erreur-heure', false);
}

function numeroMobileValide(valeur) {
  const normalise = valeur.replace(/[\s().-]/g, '');
  return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalise);
}

document.querySelectorAll('[data-continuer]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    const etape = Number(bouton.dataset.continuer);
    if (etape === 1) {
      const choisi = formulaire.querySelector('input[name="prestation"]:checked');
      montrerErreur('#erreur-prestation', !choisi);
      if (!choisi) return;
      etat.prestation = choisi.value;
      etat.jour = null;
      etat.heure = null;
      dessinerJours();
      actualiserResume();
      changerEtape(2);
    }
    if (etape === 2) {
      montrerErreur('#erreur-jour', !etat.jour);
      if (!etat.jour) return;
      etat.heure = null;
      actualiserResume();
      changerEtape(3);
    }
    if (etape === 3) {
      montrerErreur('#erreur-heure', etat.heure === null);
      if (etat.heure === null) return;
      changerEtape(4);
    }
  });
});

document.querySelectorAll('[data-preselection]').forEach((lien) => {
  lien.addEventListener('click', () => {
    const valeur = lien.dataset.preselection;
    const champ = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
    if (!champ) return;
    if (formulaire.hidden) {
      formulaire.hidden = false;
      blocConfirme.hidden = true;
    }
    champ.checked = true;
    champ.dispatchEvent(new Event('change', { bubbles: true }));
    if (etat.etape !== 1) changerEtape(1, { remplacer: true });
    actualiserResume();
  });
});

document.querySelectorAll('[data-retour]').forEach((bouton) => {
  bouton.addEventListener('click', () => changerEtape(Number(bouton.dataset.retour)));
});

document.querySelectorAll('[data-retour-etape]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    const numero = Number(bouton.dataset.retourEtape);
    if (numero < etat.etape) changerEtape(numero);
  });
});

formulaire.querySelectorAll('input[name="prestation"]').forEach((champ) => {
  champ.addEventListener('change', () => {
    if (etat.prestation !== champ.value) {
      etat.jour = null;
      etat.heure = null;
      dessinerJours();
      zoneHeures.replaceChildren();
    }
    etat.prestation = champ.value;
    actualiserResume();
    montrerErreur('#erreur-prestation', false);
  });
});

document.querySelector('#prenom').addEventListener('input', (evenement) => {
  const invalide = evenement.currentTarget.value.trim().length === 0;
  evenement.currentTarget.setAttribute('aria-invalid', String(invalide));
  montrerErreur('#erreur-prenom', invalide);
});

document.querySelector('#telephone').addEventListener('input', (evenement) => {
  const valeur = evenement.currentTarget.value.trim();
  const invalide = valeur.length > 0 && !numeroMobileValide(valeur);
  evenement.currentTarget.setAttribute('aria-invalid', String(invalide));
  montrerErreur('#erreur-telephone', invalide);
});

zoneJours.addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('button[data-date]');
  if (!bouton || bouton.disabled) return;
  zoneJours.querySelectorAll('button').forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
  etat.jour = dateDepuisValeur(bouton.dataset.date);
  etat.heure = null;
  actualiserResume();
  montrerErreur('#erreur-jour', false);
});

zoneHeures.addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('button[data-minute]');
  if (!bouton || bouton.disabled) return;
  selectionnerHeure(bouton);
});

formulaire.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  etat.prenom = prenom.value.trim();
  etat.telephone = telephone.value.trim();
  const prenomInvalide = etat.prenom.length === 0;
  const telephoneInvalide = !numeroMobileValide(etat.telephone);
  montrerErreur('#erreur-prenom', prenomInvalide);
  montrerErreur('#erreur-telephone', telephoneInvalide);
  prenom.setAttribute('aria-invalid', String(prenomInvalide));
  telephone.setAttribute('aria-invalid', String(telephoneInvalide));
  if (prenomInvalide) prenom.focus();
  else if (telephoneInvalide) telephone.focus();
  if (prenomInvalide || telephoneInvalide) return;

  const prestation = prestations[etat.prestation];
  const jour = dateLongue.format(etat.jour);
  resumeFinal.textContent = `${etat.prenom} · ${prestation.nom} · ${jour} à ${texteHeure(etat.heure)}.`;
  formulaire.hidden = true;
  blocConfirme.hidden = false;
  blocConfirme.classList.add('impression-en-cours');
  requestAnimationFrame(() => requestAnimationFrame(() => blocConfirme.classList.remove('impression-en-cours')));
  window.setTimeout(() => document.querySelector('#titre-confirme').focus(), 240);
  annonceEtape.textContent = 'Parcours terminé. Le billet est une simulation, rien n’a été envoyé.';
});

document.querySelector('#recommencer').addEventListener('click', () => {
  etat.etape = 4;
  etat.prestation = null;
  etat.jour = null;
  etat.heure = null;
  etat.prenom = '';
  etat.telephone = '';
  formulaire.reset();
  formulaire.hidden = false;
  blocConfirme.hidden = true;
  blocConfirme.classList.remove('impression-en-cours');
  document.querySelectorAll('[aria-invalid]').forEach((champ) => champ.removeAttribute('aria-invalid'));
  document.querySelectorAll('.erreur-champ').forEach((erreur) => { erreur.hidden = true; });
  changerEtape(1, { remplacer: true });
  actualiserResume();
});

window.addEventListener('popstate', (evenement) => {
  const numero = evenement.state && Number(evenement.state.etape);
  if (numero && numero < etat.etape) changerEtape(numero, { sansHistorique: true });
});

dessinerJours();
actualiserEtapes();
actualiserResume();
mettreAJourAdresseEtape(1, false);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('est-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.apparition').forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll('.apparition').forEach((element) => element.classList.add('est-visible'));
}

const barre = document.querySelector('.barre-mobile');
const pointsVisibilite = { hero: true, reservation: false, pied: false };
function actualiserBarre() {
  const visible = !pointsVisibilite.hero && !pointsVisibilite.reservation && !pointsVisibilite.pied;
  barre.classList.toggle('est-visible', visible);
  barre.setAttribute('aria-hidden', String(!visible));
  barre.inert = !visible;
}

if ('IntersectionObserver' in window) {
  const observerBarre = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.matches('.billet__actions')) pointsVisibilite.hero = entry.isIntersecting;
      if (entry.target.matches('#reservation')) pointsVisibilite.reservation = entry.isIntersecting;
      if (entry.target.matches('.pied-page')) pointsVisibilite.pied = entry.isIntersecting;
    });
    actualiserBarre();
  }, { threshold: 0.05 });
  observerBarre.observe(document.querySelector('.billet__actions'));
  observerBarre.observe(document.querySelector('#reservation'));
  observerBarre.observe(document.querySelector('.pied-page'));
} else {
  barre.classList.add('est-visible');
  barre.setAttribute('aria-hidden', 'false');
  barre.inert = false;
}
