document.documentElement.classList.add('js');

const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

if (menuToggle && mainNav) {
  const fermerMenu = (rendreFocus = false) => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    mainNav.classList.remove('is-open');
    if (rendreFocus) menuToggle.focus();
  };

  menuToggle.addEventListener('click', () => {
    const ouvert = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(ouvert));
    menuToggle.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    mainNav.classList.toggle('is-open', ouvert);
    if (ouvert) mainNav.querySelector('a')?.focus();
  });

  mainNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) fermerMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      fermerMenu(true);
    }
  });
}

const formulaire = document.querySelector('#booking-form');
const etapes = [...document.querySelectorAll('.booking-step')];
const progression = [...document.querySelectorAll('[data-retour-etape]')];
const etatReservation = document.querySelector('#etat-reservation');
const confirmation = document.querySelector('#confirmation');
const choixJour = document.querySelector('#choix-jour');
const choixHeure = document.querySelector('#choix-heure');
const selectionIndex = document.querySelector('.selection-index');
let etapeActive = 0;
let jourSelectionne = '';
let heureSelectionnee = '';
const minuteriesEtapes = new Map();

const moisFormate = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
});
const heureParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function partiesDateParis(date) {
  return Object.fromEntries(moisFormate.formatToParts(date).map((partie) => [partie.type, partie.value]));
}

function maintenantParis() {
  const instant = new Date();
  const parties = Object.fromEntries(heureParis.formatToParts(instant).map((partie) => [partie.type, partie.value]));
  return {
    jour: cleDate(instant),
    minute: Number(parties.hour) * 60 + Number(parties.minute),
  };
}

function cleDate(date) {
  const parties = partiesDateParis(date);
  return `${parties.year}-${parties.month}-${parties.day}`;
}

function dateDepuisCle(cle) {
  const [annee, mois, jour] = cle.split('-').map(Number);
  return new Date(annee, mois - 1, jour, 12, 0, 0, 0);
}

function phraseJour(cle, options = {}) {
  const date = dateDepuisCle(cle);
  const phrase = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', ...options,
  }).format(date);
  return phrase.charAt(0).toLocaleUpperCase('fr-FR') + phrase.slice(1);
}

function nomCourtJour(date) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' })
    .format(date).replace('.', '');
}

function dureeTexte(minutes) {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures && reste) return `${heures}\u00a0h\u00a0${String(reste).padStart(2, '0')}`;
  if (heures) return `${heures}\u00a0h`;
  return `${minutes}\u00a0min`;
}

function heureTexte(minutes) {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${String(heures).padStart(2, '0')}\u00a0h\u00a0${String(reste).padStart(2, '0')}`;
}

function prestationChoisie() {
  return formulaire?.querySelector('input[name="prestation"]:checked') || null;
}

function definirTexte(selecteur, texte) {
  document.querySelectorAll(selecteur).forEach((element) => { element.textContent = texte; });
}

function actualiserRecapitulatif() {
  const prestation = prestationChoisie();
  if (!prestation) return;
  const intitule = prestation.dataset.intitule || 'Prestation à choisir';
  const duree = dureeTexte(Number(prestation.dataset.duree || 0));
  const jour = jourSelectionne ? phraseJour(jourSelectionne) : 'Jour à choisir';
  const heure = heureSelectionnee ? heureTexte(Number(heureSelectionnee)) : 'Heure à choisir';
  definirTexte('[data-selection="prestation"], [data-recap="prestation"]', intitule);
  definirTexte('[data-selection="duree"], [data-recap="duree"]', duree);
  definirTexte('[data-selection="jour"], [data-recap="jour"]', jour);
  definirTexte('[data-selection="heure"], [data-recap="heure"]', heure);
}

function signalerErreur(nom, texte) {
  const champ = document.querySelector(`[data-erreur="${nom}"]`);
  if (champ) champ.textContent = texte;
}

function viderErreurs() {
  document.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
  document.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function afficherEtape(index, annoncer = true) {
  const cible = etapes[index];
  const ancienne = etapes[etapeActive];
  minuteriesEtapes.forEach((minuterie) => clearTimeout(minuterie));
  minuteriesEtapes.clear();
  etapes.forEach((etape) => {
    etape.classList.remove('step-is-leaving', 'step-is-entering');
    etape.hidden = etape !== ancienne;
  });

  if (cible && cible !== ancienne) {
    cible.hidden = false;
    if (!prefersReducedMotion) {
      ancienne?.classList.add('step-is-leaving');
      cible.classList.add('step-is-entering');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => cible.classList.remove('step-is-entering'));
      });
      if (ancienne) {
        const minuterie = window.setTimeout(() => {
          ancienne.hidden = true;
          ancienne.classList.remove('step-is-leaving');
          minuteriesEtapes.delete(ancienne);
        }, 250);
        minuteriesEtapes.set(ancienne, minuterie);
      }
    } else if (ancienne) {
      ancienne.hidden = true;
    }
  }

  etapeActive = index;
  progression.forEach((bouton, position) => {
    if (position <= index) bouton.disabled = false;
    else bouton.disabled = true;
    if (position === index) bouton.setAttribute('aria-current', 'step');
    else bouton.removeAttribute('aria-current');
  });
  const titre = etapes[index]?.querySelector('h3');
  if (titre) requestAnimationFrame(() => titre.focus({ preventScroll: true }));
  if (annoncer && etatReservation) {
    const titres = ['Étape 1 sur 4, prestation.', 'Étape 2 sur 4, jour.', 'Étape 3 sur 4, heure.', 'Étape 4 sur 4, coordonnées.'];
    etatReservation.textContent = titres[index];
  }
  viderErreurs();
  actualiserRecapitulatif();
}

function construireChoixJours() {
  if (!choixJour) return;
  choixJour.replaceChildren();
  const instant = new Date();
  const aujourdHui = cleDate(instant);
  const premier = dateDepuisCle(aujourdHui);

  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(premier);
    date.setDate(premier.getDate() + decalage);
    const cle = cleDate(date);
    const jourSemaine = date.getDay();
    const ouvertSelonFiche = jourSemaine >= 2 && jourSemaine <= 6;
    const id = `jour-${cle}`;
    const etiquette = document.createElement('label');
    etiquette.className = 'day-choice';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'jour';
    radio.value = cle;
    radio.id = id;
    radio.disabled = !ouvertSelonFiche;
    radio.setAttribute('aria-label', ouvertSelonFiche
      ? `${phraseJour(cle)} ; horaire de démonstration à confirmer`
      : `${phraseJour(cle)} ; ${jourSemaine === 1 ? 'fermé, lundi à confirmer' : 'fermé'}`);

    const contenu = document.createElement('span');
    const nombre = document.createElement('strong');
    nombre.textContent = String(date.getDate());
    const nom = document.createElement('small');
    nom.textContent = ouvertSelonFiche
      ? nomCourtJour(date)
      : (jourSemaine === 1 ? 'Fermé · à confirmer' : 'Fermé');
    etiquette.append(radio, contenu);
    contenu.append(nombre, nom);
    choixJour.append(etiquette);

    radio.addEventListener('change', () => {
      jourSelectionne = radio.value;
      heureSelectionnee = '';
      signalerErreur('jour', '');
      const maintenant = maintenantParis();
      construireChoixHeures(maintenant.jour, maintenant.minute);
      actualiserRecapitulatif();
    });
  }
}

function construireChoixHeures(aujourdHui, minuteActuelle) {
  if (!choixHeure || !jourSelectionne) return;
  choixHeure.replaceChildren();
  const prestation = prestationChoisie();
  const duree = Number(prestation?.dataset.duree || 0);
  const debutOuverture = 9 * 60;
  const finOuverture = 18 * 60 + 30;
  let nombreCreneaux = 0;

  for (let debut = debutOuverture; debut + duree <= finOuverture; debut += 30) {
    nombreCreneaux += 1;
    const id = `heure-${String(debut).padStart(3, '0')}`;
    const etiquette = document.createElement('label');
    etiquette.className = 'slot-choice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'heure';
    radio.value = String(debut);
    radio.id = id;
    const heurePasse = jourSelectionne === aujourdHui && debut <= minuteActuelle;
    radio.disabled = heurePasse;
    radio.setAttribute('aria-label', heurePasse ? `${heureTexte(debut)}, heure passée` : `${heureTexte(debut)}, créneau de démonstration`);
    const texte = document.createElement('span');
    texte.textContent = heureTexte(debut);
    if (heurePasse) {
      const etat = document.createElement('small');
      etat.textContent = 'Passé';
      texte.append(etat);
    }
    etiquette.append(radio, texte);
    choixHeure.append(etiquette);
    radio.addEventListener('change', () => {
      heureSelectionnee = radio.value;
      signalerErreur('heure', '');
      actualiserRecapitulatif();
    });
  }

  if (!nombreCreneaux) {
    const vide = document.createElement('p');
    vide.className = 'slot-empty';
    vide.textContent = 'Aucun créneau de démonstration ne tient dans cette plage horaire.';
    choixHeure.append(vide);
  }
}

function dateEtHeureValides() {
  const jour = formulaire?.querySelector('input[name="jour"]:checked');
  const heure = formulaire?.querySelector('input[name="heure"]:checked');
  return Boolean(jour && heure);
}

function suivant() {
  if (etapeActive === 0 && !prestationChoisie()) {
    signalerErreur('prestation', 'Choisissez une prestation pour continuer.');
    return;
  }
  if (etapeActive === 1) {
    const jour = formulaire?.querySelector('input[name="jour"]:checked');
    if (!jour) {
      signalerErreur('jour', 'Choisissez un jour ouvert dans la simulation.');
      return;
    }
  }
  if (etapeActive === 2) {
    const heure = formulaire?.querySelector('input[name="heure"]:checked');
    if (!heure) {
      signalerErreur('heure', 'Choisissez un horaire de démonstration.');
      return;
    }
  }
  afficherEtape(Math.min(etapeActive + 1, etapes.length - 1));
}

document.querySelectorAll('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', suivant));
document.querySelectorAll('[data-precedent]').forEach((bouton) => bouton.addEventListener('click', () => {
  afficherEtape(Math.max(etapeActive - 1, 0));
}));

progression.forEach((bouton) => bouton.addEventListener('click', () => {
  const cible = Number(bouton.dataset.retourEtape);
  if (!bouton.disabled && cible <= etapeActive) afficherEtape(cible);
}));

formulaire?.querySelectorAll('input[name="prestation"]').forEach((radio) => radio.addEventListener('change', () => {
  jourSelectionne = '';
  heureSelectionnee = '';
  formulaire.querySelectorAll('input[name="jour"]').forEach((choix) => { choix.checked = false; });
  choixHeure?.replaceChildren();
  actualiserRecapitulatif();
  signalerErreur('prestation', '');
}));

document.querySelectorAll('[data-prescription]').forEach((lien) => lien.addEventListener('click', () => {
  const valeur = lien.dataset.prescription;
  const radio = formulaire?.querySelector(`input[name="prestation"][value="${valeur}"]`);
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (etapeActive > 0) afficherEtape(0);
    actualiserRecapitulatif();
  }
}));

function telephoneMobileValide(telephone) {
  const nettoye = telephone.trim().replace(/[().\s.\-\u00a0]/g, '');
  return /^(?:\+33|0033|0)[67]\d{8}$/.test(nettoye);
}

function afficherConfirmation(prenom) {
  const prestation = prestationChoisie();
  const jour = jourSelectionne ? phraseJour(jourSelectionne) : '';
  const heure = heureTexte(Number(heureSelectionnee));
  const titre = document.createElement('h3');
  titre.tabIndex = -1;
  titre.textContent = 'Demande de démonstration prête.';
  const phrase = document.createElement('p');
  phrase.textContent = `${prenom}, votre choix simulé : ${prestation?.dataset.intitule || ''}, le ${jour} à ${heure}.`;
  const note = document.createElement('p');
  note.textContent = 'Rien n’a été envoyé et aucun rendez-vous n’est pris. Appelez le salon pour confirmer la prestation, la durée et l’horaire.';
  const appel = document.createElement('a');
  appel.href = 'tel:+33491735575';
  appel.textContent = 'Appeler le 04 91 73 55 75';
  const recommencer = document.createElement('button');
  recommencer.type = 'button';
  recommencer.textContent = 'Recommencer la simulation';
  recommencer.addEventListener('click', () => {
    formulaire.hidden = false;
    confirmation.hidden = true;
    if (selectionIndex) selectionIndex.hidden = false;
    formulaire.reset();
    const signature = formulaire.querySelector('input[name="prestation"][value="lissage-mi-longs"]');
    if (signature) signature.checked = true;
    jourSelectionne = '';
    heureSelectionnee = '';
    choixHeure?.replaceChildren();
    construireChoixJours();
    afficherEtape(0);
    formulaire.querySelector('h3')?.focus({ preventScroll: true });
  });
  confirmation.replaceChildren(titre, phrase, note, appel, recommencer);
  formulaire.hidden = true;
  confirmation.hidden = false;
  if (selectionIndex) selectionIndex.hidden = true;
  titre.focus({ preventScroll: true });
  if (etatReservation) etatReservation.textContent = 'La démonstration est terminée. Rien n’a été envoyé et aucun rendez-vous n’est pris.';
}

formulaire?.addEventListener('submit', (event) => {
  event.preventDefault();
  viderErreurs();
  if (!dateEtHeureValides()) {
    afficherEtape(jourSelectionne ? 2 : 1);
    signalerErreur(jourSelectionne ? 'heure' : 'jour', jourSelectionne
      ? 'Choisissez un horaire de démonstration.'
      : 'Choisissez un jour ouvert dans la simulation.');
    return;
  }
  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const prenomValide = Boolean(prenom?.value.trim());
  const telephoneValide = telephoneMobileValide(telephone?.value || '');
  if (!prenomValide) {
    prenom?.setAttribute('aria-invalid', 'true');
    document.querySelector('#erreur-prenom').textContent = 'Saisissez votre prénom pour terminer la démonstration.';
    prenom?.focus();
    return;
  }
  if (!telephoneValide) {
    telephone?.setAttribute('aria-invalid', 'true');
    document.querySelector('#erreur-telephone').textContent = 'Saisissez un numéro mobile français valide.';
    telephone?.focus();
    return;
  }
  afficherConfirmation(prenom.value.trim());
});

document.querySelector('#prenom')?.addEventListener('input', (event) => {
  event.currentTarget.removeAttribute('aria-invalid');
  document.querySelector('#erreur-prenom').textContent = '';
});
document.querySelector('#telephone')?.addEventListener('input', (event) => {
  event.currentTarget.removeAttribute('aria-invalid');
  document.querySelector('#erreur-telephone').textContent = '';
});

if (formulaire) {
  construireChoixJours();
  actualiserRecapitulatif();
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const elementsAReveler = [...document.querySelectorAll('[data-reveal]')];
if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  elementsAReveler.forEach((element) => element.classList.add('is-revealed'));
} else {
  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('is-revealed');
        instance.unobserve(entree.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -3% 0px' });
  elementsAReveler.forEach((element) => observateur.observe(element));
}

requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

const barreMobile = document.querySelector('#barre-mobile');
const signature = document.querySelector('.signature');
const reservation = document.querySelector('#rendez-vous');
const pied = document.querySelector('.site-footer');
if (barreMobile && signature && reservation && pied && 'IntersectionObserver' in window) {
  const visibilite = new Map([[signature, true], [reservation, false], [pied, false]]);
  const actualiserBarre = () => {
    const afficher = !visibilite.get(signature) && !visibilite.get(reservation) && !visibilite.get(pied);
    barreMobile.classList.toggle('is-visible', afficher);
  };
  const observateurBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => visibilite.set(entree.target, entree.isIntersecting));
    actualiserBarre();
  }, { threshold: 0.04 });
  [signature, reservation, pied].forEach((element) => observateurBarre.observe(element));
}
