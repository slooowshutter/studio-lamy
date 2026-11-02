document.documentElement.classList.add('js');

const hero = document.querySelector('.hero');
requestAnimationFrame(() => hero?.classList.add('is-ready'));

const menuButton = document.querySelector('.menu-bouton');
const navigation = document.querySelector('#navigation');

function fermerMenu(rendreFocus = false) {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = 'Ouvrir le menu';
  navigation.classList.remove('nav--ouverte');
  if (rendreFocus) menuButton.focus();
}

menuButton?.addEventListener('click', () => {
  const ouvert = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!ouvert));
  menuButton.textContent = ouvert ? 'Ouvrir le menu' : 'Fermer le menu';
  navigation?.classList.toggle('nav--ouverte', !ouvert);
  if (!ouvert) navigation?.querySelector('a')?.focus();
});

navigation?.addEventListener('click', (event) => {
  if (event.target.closest('a')) fermerMenu();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') fermerMenu(true);
});

const elementsReveles = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add('is-visible');
      observateur.unobserve(entree.target);
    });
  }, { threshold: 0.28 });
  elementsReveles.forEach((element) => observateurRevelation.observe(element));
} else {
  elementsReveles.forEach((element) => element.classList.add('is-visible'));
}

const barreMobile = document.querySelector('.rappel-mobile');
const reservation = document.querySelector('#reserver');
const pied = document.querySelector('#pied');
const petitEcran = window.matchMedia('(max-width: 700px)');
let heroVisible = true;
let reservationVisible = false;
let piedVisible = false;

function actualiserBarreMobile() {
  if (!barreMobile || !petitEcran.matches) {
    barreMobile?.classList.remove('is-visible');
    return;
  }
  barreMobile.classList.toggle('is-visible', !heroVisible && !reservationVisible && !piedVisible);
}

if ('IntersectionObserver' in window) {
  const observateurBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.target === hero) heroVisible = entree.isIntersecting;
      if (entree.target === reservation) reservationVisible = entree.isIntersecting;
      if (entree.target === pied) piedVisible = entree.isIntersecting;
    });
    actualiserBarreMobile();
  }, { threshold: 0.04 });
  [hero, reservation, pied].filter(Boolean).forEach((element) => observateurBarre.observe(element));
} else {
  let barreMobileTrameEnAttente = false;
  window.addEventListener('scroll', () => {
    if (barreMobileTrameEnAttente) return;
    barreMobileTrameEnAttente = true;
    window.requestAnimationFrame(() => {
      heroVisible = hero ? hero.getBoundingClientRect().bottom > 0 : false;
      reservationVisible = reservation ? reservation.getBoundingClientRect().top < window.innerHeight && reservation.getBoundingClientRect().bottom > 0 : false;
      piedVisible = pied ? pied.getBoundingClientRect().top < window.innerHeight && pied.getBoundingClientRect().bottom > 0 : false;
      actualiserBarreMobile();
      barreMobileTrameEnAttente = false;
    });
  }, { passive: true });
}
petitEcran.addEventListener?.('change', actualiserBarreMobile);

const formulaire = document.querySelector('#formulaire-rendezvous');
const panneaux = [...document.querySelectorAll('[data-panneau]')];
const etapes = [...document.querySelectorAll('.progression__etape')];
const choixJours = document.querySelector('#choix-jours');
const choixHeures = document.querySelector('#choix-heures');
const confirmation = document.querySelector('#confirmation');
const annonce = document.querySelector('#message-confirmation');
const boutonAgenda = document.querySelector('#ajouter-agenda');
const boutonRecommencer = document.querySelector('#recommencer');
const nomInput = document.querySelector('#prenom');
const telephoneInput = document.querySelector('#telephone');

const donneesPrestations = [
  { nom: 'Coupe Homme « classique »', duree: 30 },
  { nom: 'Dégradé américain finition au rasoir', duree: 30 },
  { nom: 'Taille de barbe courte à la tondeuse', duree: 15 },
  { nom: 'Taille de barbe avec rasage traditionnel', duree: 20 }
];
const plagesPlanity = {
  0: { ouverture: 10 * 60, fermeture: 20 * 60 },
  1: { ouverture: 9 * 60, fermeture: 20 * 60 },
  2: { ouverture: 9 * 60, fermeture: 20 * 60 },
  3: { ouverture: 9 * 60, fermeture: 20 * 60 },
  4: { ouverture: 9 * 60, fermeture: 20 * 60 },
  5: { ouverture: 9 * 60, fermeture: 20 * 60 },
  6: { ouverture: 9 * 60, fermeture: 20 * 60 }
};

const selection = { prestation: null, date: null, heure: null, duree: 0 };
let etapeCourante = 1;
let transitionEnCours = false;
let datesDisponibles = [];

function formaterHeure(minutes) {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${String(heures).padStart(2, '0')}\u00a0h\u00a0${String(reste).padStart(2, '0')}`;
}

function formatDateCourte(date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date).replace('.', '');
}

function formatDateLongue(date) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

function dateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function selectionnerPrestation() {
  const cochee = formulaire?.querySelector('input[name="prestation"]:checked');
  if (!cochee) return null;
  return donneesPrestations.find((prestation) => prestation.nom === cochee.value) || null;
}

function mettreAJourRecapitulatif() {
  const prestation = selectionnerPrestation();
  const nomPrestation = prestation?.nom || 'Aucune prestation choisie';
  const jour = selection.date ? formatDateLongue(selection.date) : 'Choisissez un jour';
  const heure = selection.heure ? selection.heure : 'Puis une heure';
  const serviceDansFormulaire = document.querySelector('[data-recap="prestation"]');
  const jourDansFormulaire = document.querySelector('[data-recap="jour"]');
  const heureDansFormulaire = document.querySelector('[data-recap="heure"]');

  document.querySelector('#selection-prestation').textContent = nomPrestation;
  document.querySelector('#selection-jour').textContent = jour;
  document.querySelector('#selection-heure').textContent = heure;
  if (serviceDansFormulaire) serviceDansFormulaire.textContent = prestation?.nom || 'À choisir';
  if (jourDansFormulaire) jourDansFormulaire.textContent = selection.date ? formatDateLongue(selection.date) : 'À choisir';
  if (heureDansFormulaire) heureDansFormulaire.textContent = selection.heure || 'À choisir';
}

function genererDates() {
  if (!choixJours) return;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  datesDisponibles = Array.from({ length: 14 }, (_, indice) => {
    const date = new Date(aujourdHui);
    date.setDate(aujourdHui.getDate() + indice);
    return date;
  });
  choixJours.replaceChildren();

  datesDisponibles.forEach((date, indice) => {
    const plage = plagesPlanity[date.getDay()];
    const bouton = document.createElement('button');
    const libelle = document.createElement('span');
    bouton.type = 'button';
    bouton.dataset.date = dateLocale(date);
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', `${indice === 0 ? 'Aujourd’hui' : formatDateLongue(date)}, horaires selon Planity ${formaterHeure(plage.ouverture)} à ${formaterHeure(plage.fermeture)}, à confirmer`);
    libelle.textContent = indice === 0 ? 'Aujourd’hui' : formatDateCourte(date);
    bouton.append(libelle);
    bouton.addEventListener('click', () => {
      selection.date = date;
      selection.heure = null;
      choixJours.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
      genererHeures();
      mettreAJourRecapitulatif();
      document.querySelector('#erreur-jour').hidden = true;
    });
    choixJours.append(bouton);
  });
}

function obtenirPrestation() {
  const prestation = selectionnerPrestation();
  if (!prestation) return null;
  return prestation;
}

function genererHeures() {
  if (!choixHeures || !selection.date) return;
  const prestation = obtenirPrestation();
  if (!prestation) return;
  const plage = plagesPlanity[selection.date.getDay()];
  const maintenant = new Date();
  const estAujourdHui = dateLocale(maintenant) === dateLocale(selection.date);
  const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
  const dateCode = Number(dateLocale(selection.date).replaceAll('-', ''));
  choixHeures.replaceChildren();
  selection.heure = null;

  for (let minute = plage.ouverture; minute + prestation.duree <= plage.fermeture; minute += 30) {
    const dansLePasse = estAujourdHui && minute <= minuteActuelle;
    const occupeEnDemo = !dansLePasse && ((dateCode + Math.floor(minute / 30) * 7 + prestation.duree) % 11 === 0);
    const etiquette = document.createElement('label');
    const radio = document.createElement('input');
    const heure = document.createElement('span');
    radio.type = 'radio';
    radio.name = 'heure';
    radio.value = formaterHeure(minute);
    radio.disabled = dansLePasse || occupeEnDemo;
    heure.textContent = formaterHeure(minute);
    etiquette.append(radio, heure);
    if (dansLePasse) {
      etiquette.classList.add('est-passe');
      etiquette.setAttribute('aria-label', `${formaterHeure(minute)}, heure passée`);
    } else if (occupeEnDemo) {
      const note = document.createElement('small');
      note.textContent = 'Pris · exemple';
      etiquette.classList.add('est-pris');
      etiquette.setAttribute('aria-label', `${formaterHeure(minute)}, pris dans cette démonstration`);
      etiquette.append(note);
    }
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      selection.heure = radio.value;
      mettreAJourRecapitulatif();
      document.querySelector('#erreur-heure').hidden = true;
    });
    choixHeures.append(etiquette);
  }
  mettreAJourRecapitulatif();
}

function effacerErreurs() {
  document.querySelectorAll('.erreur-champ').forEach((element) => { element.hidden = true; });
  [nomInput, telephoneInput].forEach((champ) => champ?.removeAttribute('aria-invalid'));
}

function afficherPanneau(numero) {
  if (transitionEnCours || numero === etapeCourante || !formulaire) return;
  const precedent = panneaux.find((panneau) => Number(panneau.dataset.panneau) === etapeCourante);
  const suivant = panneaux.find((panneau) => Number(panneau.dataset.panneau) === numero);
  if (!precedent || !suivant) return;
  transitionEnCours = true;
  effacerErreurs();
  precedent.classList.add('est-sortant');
  precedent.setAttribute('aria-hidden', 'true');
  precedent.inert = true;
  window.setTimeout(() => {
    precedent.hidden = true;
    precedent.classList.remove('est-sortant');
    suivant.hidden = false;
    suivant.inert = false;
    suivant.removeAttribute('aria-hidden');
    suivant.classList.add('est-entrant');
    requestAnimationFrame(() => requestAnimationFrame(() => suivant.classList.remove('est-entrant')));
    etapeCourante = numero;
    transitionEnCours = false;
    etapes.forEach((etape) => {
      const active = Number(etape.dataset.indice) === numero;
      etape.classList.toggle('est-active', active);
      if (active) etape.setAttribute('aria-current', 'step');
      else etape.removeAttribute('aria-current');
    });
    suivant.querySelector('h3')?.focus({ preventScroll: true });
    mettreAJourRecapitulatif();
  }, 230);
}

function validerEtContinuer(numero) {
  if (numero === 2 && !selectionnerPrestation()) {
    document.querySelector('#erreur-prestation').hidden = false;
    formulaire?.querySelector('input[name="prestation"]')?.focus();
    return;
  }
  if (numero === 3 && !selection.date) {
    document.querySelector('#erreur-jour').hidden = false;
    choixJours?.querySelector('button')?.focus();
    return;
  }
  if (numero === 4 && !selection.heure) {
    document.querySelector('#erreur-heure').hidden = false;
    choixHeures?.querySelector('input:not(:disabled)')?.focus();
    return;
  }
  if (numero === 3) genererHeures();
  afficherPanneau(numero);
}

formulaire?.addEventListener('change', (event) => {
  if (event.target.matches('input[name="prestation"]')) {
    const prestation = selectionnerPrestation();
    selection.prestation = prestation?.nom || null;
    selection.duree = prestation?.duree || 0;
    selection.heure = null;
    mettreAJourRecapitulatif();
    document.querySelector('#erreur-prestation').hidden = true;
    if (selection.date) genererHeures();
  }
});

formulaire?.addEventListener('click', (event) => {
  const avancer = event.target.closest('[data-suivant]');
  const revenir = event.target.closest('[data-precedent]');
  if (avancer) validerEtContinuer(Number(avancer.dataset.suivant));
  if (revenir) afficherPanneau(Number(revenir.dataset.precedent));
});

function telephoneValide(valeur) {
  const epure = valeur.trim().replace(/[().\s-]/g, '');
  const national = epure.replace(/^(?:\+33|0033)/, '0');
  return /^0[67]\d{8}$/.test(national);
}

function afficherConfirmation() {
  const prestation = selectionnerPrestation();
  if (!prestation || !selection.date || !selection.heure || !nomInput || !telephoneInput) return;
  effacerErreurs();
  const prenomValide = nomInput.value.trim().length >= 2;
  const mobileValide = telephoneValide(telephoneInput.value);
  if (!prenomValide) {
    document.querySelector('#erreur-prenom').hidden = false;
    nomInput.setAttribute('aria-invalid', 'true');
    nomInput.focus();
    return;
  }
  if (!mobileValide) {
    document.querySelector('#erreur-telephone').hidden = false;
    telephoneInput.setAttribute('aria-invalid', 'true');
    telephoneInput.focus();
    return;
  }
  const prenom = nomInput.value.trim();
  const heure = selection.heure.replace('\u00a0h\u00a0', ':');
  annonce.textContent = `${prenom}, votre démonstration porte sur ${prestation.nom}, le ${formatDateLongue(selection.date)} à ${heure}.`;
  formulaire.hidden = true;
  confirmation.hidden = false;
  confirmation.querySelector('h3')?.focus({ preventScroll: true });
  actualiserBarreMobile();
}

formulaire?.addEventListener('submit', (event) => {
  event.preventDefault();
  afficherConfirmation();
});

function formaterDateAgenda(date, heure, duree) {
  const [heures, minutes] = heure.split('\u00a0h\u00a0').map(Number);
  const debut = new Date(date);
  debut.setHours(heures, minutes, 0, 0);
  const fin = new Date(debut.getTime() + duree * 60 * 1000);
  const ecrire = (moment) => {
    const annee = moment.getFullYear();
    const mois = String(moment.getMonth() + 1).padStart(2, '0');
    const jour = String(moment.getDate()).padStart(2, '0');
    const h = String(moment.getHours()).padStart(2, '0');
    const m = String(moment.getMinutes()).padStart(2, '0');
    return `${annee}${mois}${jour}T${h}${m}00`;
  };
  return { debut: ecrire(debut), fin: ecrire(fin) };
}

function echapperAgenda(texte) {
  return texte.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;');
}

boutonAgenda?.addEventListener('click', () => {
  const prestation = selectionnerPrestation();
  if (!prestation || !selection.date || !selection.heure) return;
  const dates = formaterDateAgenda(selection.date, selection.heure, prestation.duree);
  const contenu = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vintage barber 50 S//Simulation//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${dates.debut}`,
    `DTEND:${dates.fin}`,
    `SUMMARY:${echapperAgenda(`Démonstration — ${prestation.nom}`)}`,
    `DESCRIPTION:${echapperAgenda('Exemple local. Aucun rendez-vous n’a été réservé. Confirmez sur Planity.')}`,
    `LOCATION:${echapperAgenda('10 rue d’Antrechaus, 83000 Toulon')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
  const adresseTemporaire = URL.createObjectURL(fichier);
  const lienTemporaire = document.createElement('a');
  lienTemporaire.href = adresseTemporaire;
  lienTemporaire.download = 'rendez-vous-simule-vintage-barber.ics';
  document.body.append(lienTemporaire);
  lienTemporaire.click();
  lienTemporaire.remove();
  window.setTimeout(() => URL.revokeObjectURL(adresseTemporaire), 1000);
});

boutonRecommencer?.addEventListener('click', () => {
  formulaire?.reset();
  formulaire.hidden = false;
  confirmation.hidden = true;
  panneaux.forEach((panneau, indice) => {
    panneau.hidden = indice !== 0;
    panneau.inert = indice !== 0;
    panneau.removeAttribute('aria-hidden');
    panneau.classList.remove('est-sortant', 'est-entrant');
  });
  selection.prestation = null;
  selection.date = null;
  selection.heure = null;
  selection.duree = 0;
  etapeCourante = 1;
  transitionEnCours = false;
  etapes.forEach((etape, indice) => {
    const active = indice === 0;
    etape.classList.toggle('est-active', active);
    if (active) etape.setAttribute('aria-current', 'step');
    else etape.removeAttribute('aria-current');
  });
  choixJours?.querySelectorAll('button').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
  choixHeures?.replaceChildren();
  mettreAJourRecapitulatif();
  document.querySelector('#titre-etape-1')?.focus({ preventScroll: true });
});

genererDates();
mettreAJourRecapitulatif();
