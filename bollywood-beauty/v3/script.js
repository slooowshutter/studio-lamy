document.documentElement.classList.add('js');

const boutonNavigation = document.querySelector('.navigation__declencheur');
const navigationPrincipale = document.querySelector('#navigation-principale');

if (boutonNavigation && navigationPrincipale) {
  const fermerNavigation = () => {
    boutonNavigation.setAttribute('aria-expanded', 'false');
    boutonNavigation.setAttribute('aria-label', 'Ouvrir la navigation');
    navigationPrincipale.removeAttribute('data-ouverte');
  };

  boutonNavigation.addEventListener('click', () => {
    const ouverte = boutonNavigation.getAttribute('aria-expanded') === 'true';
    if (ouverte) {
      fermerNavigation();
    } else {
      boutonNavigation.setAttribute('aria-expanded', 'true');
      boutonNavigation.setAttribute('aria-label', 'Fermer la navigation');
      navigationPrincipale.setAttribute('data-ouverte', 'oui');
      navigationPrincipale.querySelector('a')?.focus();
    }
  });

  navigationPrincipale.querySelectorAll('a').forEach((lien) => {
    lien.addEventListener('click', () => {
      fermerNavigation();
      const cible = document.querySelector(lien.getAttribute('href'));
      const titre = cible?.querySelector('h1, h2');
      if (titre) {
        titre.setAttribute('tabindex', '-1');
        titre.focus({ preventScroll: true });
        titre.addEventListener('blur', () => titre.removeAttribute('tabindex'), { once: true });
      }
    });
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonNavigation.getAttribute('aria-expanded') === 'true') {
      fermerNavigation();
      boutonNavigation.focus();
    }
  });
}

const elementsAReveler = document.querySelectorAll('[data-revelation]');
if ('IntersectionObserver' in window) {
  const observateur = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.setAttribute('data-visible', 'oui');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  elementsAReveler.forEach((element) => observateur.observe(element));
} else {
  elementsAReveler.forEach((element) => element.setAttribute('data-visible', 'oui'));
}

requestAnimationFrame(() => document.documentElement.classList.add('js-pret'));

const formulaire = document.querySelector('#formulaire-reservation');
const recapSoin = document.querySelector('#recap-soin');
const recapJour = document.querySelector('#recap-jour');
const recapHeure = document.querySelector('#recap-heure');
const annonceEtape = document.querySelector('#annonce-etape');
const groupesEtapes = [...document.querySelectorAll('.etape-reservation')];
const liensEtapes = [...document.querySelectorAll('[data-etape-lien]')];
const choixJours = document.querySelector('#choix-jours');
const choixHeures = document.querySelector('#choix-heures');
const confirmation = document.querySelector('#confirmation');
const texteConfirmation = document.querySelector('#texte-confirmation');
const boutonRecommencer = document.querySelector('#recommencer');

const etat = {
  soin: '',
  jour: null,
  heure: '',
  etape: 1,
  etapeLaPlusLoin: 1
};
let transitionEnCours = false;

const horairesAffiches = ['10:30', '12:00', '13:30', '15:30', '17:00', '18:30'];
const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatJourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

function formaterJour(jour) {
  const valeur = formatJour.format(jour);
  return valeur.charAt(0).toLocaleUpperCase('fr-FR') + valeur.slice(1);
}

function cleDuJour(jour) {
  const annee = jour.getFullYear();
  const mois = String(jour.getMonth() + 1).padStart(2, '0');
  const date = String(jour.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${date}`;
}

function mettreAJourRecapitulatif() {
  recapSoin.textContent = etat.soin || 'À choisir';
  recapJour.textContent = etat.jour ? formaterJour(etat.jour) : 'À choisir';
  recapHeure.textContent = etat.heure || 'À choisir';
}

function mettreAJourProgression() {
  liensEtapes.forEach((bouton) => {
    const numero = Number(bouton.dataset.etapeLien);
    const accessible = numero <= etat.etapeLaPlusLoin;
    bouton.disabled = !accessible;
    if (numero === etat.etape) {
      bouton.setAttribute('aria-current', 'step');
    } else {
      bouton.removeAttribute('aria-current');
    }
    if (accessible && numero !== etat.etape) {
      bouton.setAttribute('aria-label', `Revenir à l’étape ${numero} : ${['', 'soin', 'jour', 'heure', 'coordonnées'][numero]}`);
    } else {
      bouton.removeAttribute('aria-label');
    }
  });
}

function annoncerEtape(numero) {
  const noms = ['', 'Choisir un soin', 'Choisir un jour', 'Choisir une heure', 'Vos coordonnées'];
  annonceEtape.textContent = `Étape ${numero} sur 4 : ${noms[numero]}.`;
}

function afficherEtape(numero) {
  if (transitionEnCours || numero < 1 || numero > etat.etapeLaPlusLoin) return;
  const actuelle = groupesEtapes.find((element) => Number(element.dataset.etape) === etat.etape);
  const suivante = groupesEtapes.find((element) => Number(element.dataset.etape) === numero);
  if (!suivante || actuelle === suivante) return;

  const duree = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240;
  etat.etape = numero;
  mettreAJourProgression();
  annoncerEtape(numero);

  if (!actuelle) {
    transitionEnCours = true;
    suivante.hidden = false;
    suivante.classList.add('etape-reservation--active');
    suivante.querySelector('h3').focus({ preventScroll: true });
    transitionEnCours = false;
    return;
  }

  transitionEnCours = true;
  actuelle.classList.remove('etape-reservation--active', 'etape-reservation--entree');
  actuelle.classList.add('etape-reservation--sortie');
  window.setTimeout(() => {
    actuelle.hidden = true;
    actuelle.classList.remove('etape-reservation--sortie');
    suivante.hidden = false;
    suivante.classList.add('etape-reservation--entree');
    requestAnimationFrame(() => {
      suivante.classList.remove('etape-reservation--entree');
      suivante.classList.add('etape-reservation--active');
    });
    suivante.querySelector('h3').focus({ preventScroll: true });
    transitionEnCours = false;
  }, duree);
}

function creerChoixJours() {
  const aujourdHui = new Date();
  aujourdHui.setHours(12, 0, 0, 0);

  for (let decalage = 0; decalage < 10; decalage += 1) {
    const jour = new Date(aujourdHui);
    jour.setDate(aujourdHui.getDate() + decalage);

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.dataset.jour = cleDuJour(jour);
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', `Choisir le ${formaterJour(jour)}`);

    const nom = document.createElement('span');
    const jourCourt = formatJourCourt.format(jour).replace('.', '');
    nom.textContent = decalage === 0 ? 'Aujourd’hui' : jourCourt;

    const date = document.createElement('span');
    date.textContent = `${jour.getDate()} ${new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(jour).replace('.', '')}`;
    bouton.append(nom, date);

    bouton.addEventListener('click', () => {
      choixJours.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      etat.jour = jour;
      etat.heure = '';
      recapHeure.textContent = 'À choisir';
      document.querySelector('#erreur-jour').textContent = '';
      document.querySelector('#erreur-heure').textContent = '';
      afficherHoraires(jour);
      mettreAJourRecapitulatif();
      annonceEtape.textContent = `Jour choisi : ${formaterJour(jour)}. Les horaires sont des exemples de simulation.`;
    });

    choixJours.append(bouton);
  }
}

function valeurDeterministe(texte) {
  let total = 0;
  for (let index = 0; index < texte.length; index += 1) {
    total = ((total << 5) - total + texte.charCodeAt(index)) | 0;
  }
  return Math.abs(total);
}

function afficherHoraires(jour) {
  choixHeures.replaceChildren();
  const graine = valeurDeterministe(cleDuJour(jour));
  const indisponibles = new Set([graine % horairesAffiches.length, (graine + 3) % horairesAffiches.length]);

  horairesAffiches.forEach((horaire, index) => {
    const etiquette = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'heure';
    radio.value = horaire;
    const [heures, minutes] = horaire.split(':').map(Number);
    const maintenant = new Date();
    const estAujourdHui = cleDuJour(jour) === cleDuJour(maintenant);
    const estPasse = estAujourdHui && heures * 60 + minutes <= maintenant.getHours() * 60 + maintenant.getMinutes();
    const estIndisponible = indisponibles.has(index);
    radio.disabled = estPasse || estIndisponible;
    radio.setAttribute('aria-label', radio.disabled ? `${horaire.replace(':', ' h ')}, ${estPasse ? 'horaire passé' : 'déjà pris dans cette simulation'}` : `Choisir ${horaire.replace(':', ' h ')}`);

    const heure = document.createElement('span');
    heure.textContent = horaire.replace(':', ' h ');
    etiquette.append(radio, heure);

    if (radio.disabled) {
      const note = document.createElement('small');
      note.textContent = estPasse ? 'Heure passée' : 'Déjà pris · simulation';
      etiquette.append(note);
    }

    radio.addEventListener('change', () => {
      etat.heure = radio.value.replace(':', ' h ');
      document.querySelector('#erreur-heure').textContent = '';
      mettreAJourRecapitulatif();
      annonceEtape.textContent = `Heure choisie : ${etat.heure}.`;
    });

    choixHeures.append(etiquette);
  });
}

function validerEtape(numero) {
  if (numero === 1) {
    const choix = formulaire.querySelector('input[name="soin"]:checked');
    if (!choix) {
      document.querySelector('#erreur-soin').textContent = 'Choisissez un soin pour continuer.';
      formulaire.querySelector('.choix-soins').setAttribute('aria-invalid', 'true');
      formulaire.querySelector('input[name="soin"]')?.focus();
      return false;
    }
    etat.soin = choix.value;
    formulaire.querySelector('.choix-soins').removeAttribute('aria-invalid');
    mettreAJourRecapitulatif();
    document.querySelector('#erreur-soin').textContent = '';
  }

  if (numero === 2 && !etat.jour) {
    document.querySelector('#erreur-jour').textContent = 'Choisissez un jour pour continuer.';
    choixJours.querySelector('button')?.focus();
    return false;
  }

  if (numero === 3 && !etat.heure) {
    document.querySelector('#erreur-heure').textContent = 'Choisissez une heure de démonstration pour continuer.';
    choixHeures.querySelector('input:not(:disabled)')?.focus();
    return false;
  }

  return true;
}

formulaire.addEventListener('click', (evenement) => {
  const bouton = evenement.target.closest('[data-suivant], [data-precedent]');
  if (!bouton || transitionEnCours) return;

  const numero = etat.etape;
  if (bouton.hasAttribute('data-precedent')) {
    afficherEtape(numero - 1);
    return;
  }

  if (!validerEtape(numero)) return;
  etat.etapeLaPlusLoin = Math.max(etat.etapeLaPlusLoin, numero + 1);
  afficherEtape(numero + 1);
});

liensEtapes.forEach((bouton) => {
  bouton.addEventListener('click', () => {
    if (!transitionEnCours) afficherEtape(Number(bouton.dataset.etapeLien));
  });
});

formulaire.addEventListener('change', (evenement) => {
  if (evenement.target.name === 'soin') {
    etat.soin = evenement.target.value;
    document.querySelector('#erreur-soin').textContent = '';
    mettreAJourRecapitulatif();
  }
});

formulaire.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');
  const prenom = champPrenom.value.trim();
  const telephone = champTelephone.value.trim();
  const portableFrancais = /^(?:(?:\+33|0033)\s?[67]|0[67])(?:[\s.-]?\d{2}){4}$/.test(telephone);

  champPrenom.setAttribute('aria-invalid', String(prenom.length === 0));
  champTelephone.setAttribute('aria-invalid', String(!portableFrancais));
  erreurPrenom.textContent = prenom.length === 0 ? 'Indiquez votre prénom.' : '';
  erreurTelephone.textContent = portableFrancais ? '' : 'Saisissez un numéro de portable français valide.';

  if (prenom.length === 0 || !portableFrancais) {
    (prenom.length === 0 ? champPrenom : champTelephone).focus();
    return;
  }

  formulaire.hidden = true;
  confirmation.hidden = false;
  texteConfirmation.textContent = `${prenom}, votre simulation affiche ${etat.soin.toLocaleLowerCase('fr-FR')} le ${formaterJour(etat.jour)} à ${etat.heure}. Aucune réservation n’a été créée.`;
  mettreAJourRecapitulatif();
  document.querySelector('#titre-confirmation').focus();
});

boutonRecommencer.addEventListener('click', () => {
  formulaire.reset();
  formulaire.hidden = false;
  confirmation.hidden = true;
  etat.soin = '';
  etat.jour = null;
  etat.heure = '';
  etat.etape = 1;
  etat.etapeLaPlusLoin = 1;
  choixJours.querySelectorAll('button').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
  choixHeures.replaceChildren();
  document.querySelectorAll('.erreur-champ').forEach((message) => { message.textContent = ''; });
  document.querySelectorAll('.champ input').forEach((champ) => champ.removeAttribute('aria-invalid'));
  groupesEtapes.forEach((etape, index) => {
    etape.hidden = index !== 0;
    etape.classList.remove('etape-reservation--sortie', 'etape-reservation--entree', 'etape-reservation--active');
    if (index === 0) etape.classList.add('etape-reservation--active');
  });
  mettreAJourRecapitulatif();
  mettreAJourProgression();
  annoncerEtape(1);
  document.querySelector('#titre-etape-1').focus();
});

creerChoixJours();
mettreAJourRecapitulatif();
mettreAJourProgression();
annoncerEtape(1);
