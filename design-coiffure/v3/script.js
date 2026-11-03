window.__site = true;

const preferenceMouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
const formulaire = document.querySelector('#formulaire-rendez-vous');
const etapes = [...document.querySelectorAll('[data-etape]')];
const navigationEtapes = [...document.querySelectorAll('[data-etape-nav]')];
const annonceEtape = document.querySelector('#annonce-etape');
const confirmation = document.querySelector('#confirmation');
const choixJour = document.querySelector('#choix-jour');
const choixHeure = document.querySelector('#choix-heure');
const choix = { prestation: '', jour: null, heure: '', prenom: '' };
let etapeActive = 0;
let derniereEtapeAtteinte = 0;

const sources = {
  jours: new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' }),
  joursCourts: new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' }),
  datesCourtes: new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' }),
  datesLongues: new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }),
  dateActuelle: new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
  })
};

function mettreMajuscule(texte) {
  return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
}

function dateDeParis(maintenant = new Date()) {
  const morceaux = sources.dateActuelle.formatToParts(maintenant);
  const valeurs = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
  return new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
}

function formatDate(uneDate, formatter) {
  return mettreMajuscule(formatter.format(uneDate));
}

function cleDate(uneDate) {
  const annee = uneDate.getUTCFullYear();
  const mois = String(uneDate.getUTCMonth() + 1).padStart(2, '0');
  const jour = String(uneDate.getUTCDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function estOuvert(jourSemaine) {
  return jourSemaine >= 2 && jourSemaine <= 6;
}

function creerCalendrier() {
  const aujourdhui = dateDeParis();

  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(aujourdhui);
    date.setUTCDate(date.getUTCDate() + decalage);
    const jourSemaine = date.getUTCDay();
    const ouvert = estOuvert(jourSemaine);
    const bouton = document.createElement('button');
    const nomJour = document.createElement('span');
    const nomDate = document.createElement('span');
    const etatJour = document.createElement('span');

    bouton.type = 'button';
    bouton.className = 'choix-jour';
    bouton.dataset.date = cleDate(date);
    bouton.disabled = !ouvert;
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', `${formatDate(date, sources.jours)}, ${ouvert ? 'ouvert selon les horaires publiés, à confirmer' : 'fermé selon les horaires publiés, à confirmer'}`);

    nomJour.className = 'choix-jour__nom';
    nomJour.textContent = sources.joursCourts.format(date).replace('.', '');
    nomDate.className = 'choix-jour__date';
    nomDate.textContent = sources.datesCourtes.format(date).replace('.', '');
    etatJour.className = 'choix-jour__etat';
    etatJour.textContent = ouvert ? 'Selon horaires' : 'Fermé';

    bouton.append(nomJour, nomDate, etatJour);
    choixJour.append(bouton);
  }
}

function heureDeParis() {
  const valeur = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23'
  }).format(new Date());
  return Number(valeur);
}

function creerHeures(dateChoisie) {
  choixHeure.replaceChildren();
  choix.heure = '';
  const dateAujourdHui = dateDeParis();
  const memeJour = cleDate(dateChoisie) === cleDate(dateAujourdHui);
  const fermeture = dateChoisie.getUTCDay() === 6 ? 18 : 19;
  const heureCourante = heureDeParis();
  const heures = [];

  for (let heure = 9; heure < fermeture; heure += 1) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'choix-heure';
    bouton.dataset.heure = String(heure).padStart(2, '0') + ':00';
    bouton.setAttribute('aria-pressed', 'false');
    const heurePassee = memeJour && heure <= heureCourante;
    bouton.disabled = heurePassee;
    bouton.setAttribute('aria-label', `${heure} h${heurePassee ? ', heure passée' : ', heure souhaitée, disponibilité non vérifiée'}`);

    const valeur = document.createElement('span');
    valeur.textContent = `${heure} h`;
    bouton.append(valeur);

    if (heurePassee) {
      const etat = document.createElement('small');
      etat.textContent = 'Passée';
      bouton.append(etat);
    }

    bouton.addEventListener('click', () => {
      choixHeure.querySelectorAll('.choix-heure').forEach((ligne) => ligne.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      choix.heure = bouton.dataset.heure;
      document.querySelector('#erreur-heure').hidden = true;
      actualiserResume();
    });

    heures.push(bouton);
  }

  if (heures.some((bouton) => !bouton.disabled)) {
    choixHeure.append(...heures);
  } else {
    const message = document.createElement('p');
    message.className = 'aide-etape';
    message.textContent = 'Aucune heure restante dans les horaires publiés. Choisissez un autre jour.';
    choixHeure.append(message);
  }
}

function actualiserResume() {
  document.querySelector('#resume-prestation').textContent = choix.prestation || 'À choisir';
  document.querySelector('#resume-jour').textContent = choix.jour ? formatDate(choix.jour, sources.datesLongues) : 'À choisir';
  document.querySelector('#resume-heure').textContent = choix.heure ? choix.heure.replace(':', ' h ') : 'À choisir';
  document.querySelector('#resume-prenom').textContent = choix.prenom || '—';
}

function actualiserNavigation() {
  navigationEtapes.forEach((bouton, index) => {
    bouton.disabled = index > derniereEtapeAtteinte;
    if (index === etapeActive) {
      bouton.setAttribute('aria-current', 'step');
    } else {
      bouton.removeAttribute('aria-current');
    }
  });
}

function afficherEtape(index, annoncer = true) {
  if (index < 0 || index >= etapes.length) return;
  if (index > derniereEtapeAtteinte && index !== etapeActive + 1) return;
  if (index === etapeActive) return;

  const etapePrecedente = etapes[etapeActive];
  const etapeSuivante = etapes[index];
  etapePrecedente.hidden = true;
  etapeSuivante.classList.remove('etape-formulaire--entree');
  etapeSuivante.hidden = false;
  etapeSuivante.classList.add('etape-formulaire--entree');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    etapeSuivante.classList.remove('etape-formulaire--entree');
  }));
  etapeActive = index;
  derniereEtapeAtteinte = Math.max(derniereEtapeAtteinte, index);
  actualiserNavigation();
  actualiserResume();

  if (annoncer) {
    const titre = etapes[index].querySelector('.titre-etape');
    annonceEtape.textContent = `Étape ${index + 1} sur 4 : ${titre.textContent.replace(/^0\d\s*/, '').trim()}.`;
    titre.focus();
  }
}

function afficherErreur(id, montrer = true) {
  const message = document.querySelector(`#${id}`);
  if (message) message.hidden = !montrer;
}

function validerEtapeCourante() {
  if (etapeActive === 0) {
    const selection = formulaire.querySelector('input[name="prestation"]:checked');
    if (!selection) {
      afficherErreur('erreur-prestation');
      formulaire.querySelector('input[name="prestation"]').focus();
      return false;
    }
    choix.prestation = selection.value;
    afficherErreur('erreur-prestation', false);
    actualiserResume();
    return true;
  }

  if (etapeActive === 1) {
    if (!choix.jour) {
      afficherErreur('erreur-jour');
      choixJour.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    afficherErreur('erreur-jour', false);
    return true;
  }

  if (etapeActive === 2) {
    if (!choix.heure) {
      afficherErreur('erreur-heure');
      choixHeure.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    afficherErreur('erreur-heure', false);
    return true;
  }

  return true;
}

function preparerConfirmation() {
  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');
  const telephoneNettoye = telephone.value.replace(/[\s().-]/g, '');
  const mobileFrancais = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephoneNettoye);
  const prenomValide = prenom.value.trim().length > 0;

  erreurPrenom.hidden = prenomValide;
  erreurTelephone.hidden = mobileFrancais;
  prenom.setAttribute('aria-invalid', String(!prenomValide));
  telephone.setAttribute('aria-invalid', String(!mobileFrancais));

  if (!prenomValide) {
    prenom.focus();
    return false;
  }
  if (!mobileFrancais) {
    telephone.focus();
    return false;
  }

  choix.prenom = prenom.value.trim();
  actualiserResume();
  formulaire.hidden = true;
  confirmation.hidden = false;
  document.querySelector('#titre-confirmation').focus();
  return true;
}

function activerRevelations() {
  const lignes = [...document.querySelectorAll('[data-reveler]')];
  if (preferenceMouvementReduit.matches || !('IntersectionObserver' in window)) {
    lignes.forEach((ligne) => ligne.classList.add('visible'));
    return;
  }

  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('visible');
        instance.unobserve(entree.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

  lignes.forEach((ligne) => observateur.observe(ligne));
}

function connecterInteractions() {
  creerCalendrier();
  activerRevelations();
  actualiserResume();
  actualiserNavigation();

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) {
      choix.prestation = evenement.target.value;
      afficherErreur('erreur-prestation', false);
      actualiserResume();
    }
  });

  choixJour.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('.choix-jour');
    if (!bouton || bouton.disabled) return;

    choixJour.querySelectorAll('.choix-jour').forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
    bouton.setAttribute('aria-pressed', 'true');
    const [annee, mois, jour] = bouton.dataset.date.split('-').map(Number);
    choix.jour = new Date(Date.UTC(annee, mois - 1, jour, 12));
    afficherErreur('erreur-jour', false);
    document.querySelector('#erreur-heure').hidden = true;
    creerHeures(choix.jour);
    actualiserResume();
  });

  formulaire.querySelectorAll('[data-suivante]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (validerEtapeCourante()) afficherEtape(etapeActive + 1);
    });
  });

  formulaire.querySelectorAll('[data-precedente]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(etapeActive - 1));
  });

  navigationEtapes.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.etapeNav);
      if (cible <= derniereEtapeAtteinte) afficherEtape(cible);
    });
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (validerEtapeCourante()) preparerConfirmation();
  });

  document.querySelector('#modifier-demande').addEventListener('click', () => {
    confirmation.hidden = true;
    formulaire.hidden = false;
    afficherEtape(3);
  });

  document.querySelectorAll('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const option = [...formulaire.querySelectorAll('input[name="prestation"]')]
        .find((champ) => champ.value === lien.dataset.prestation);
      if (!option) return;
      option.checked = true;
      choix.prestation = option.value;
      afficherErreur('erreur-prestation', false);
      formulaire.hidden = false;
      confirmation.hidden = true;
      afficherEtape(0, false);
      actualiserResume();
    });
  });

  document.querySelector('#prenom').addEventListener('input', (evenement) => {
    evenement.target.removeAttribute('aria-invalid');
    document.querySelector('#erreur-prenom').hidden = true;
  });

  document.querySelector('#telephone').addEventListener('input', (evenement) => {
    evenement.target.removeAttribute('aria-invalid');
    document.querySelector('#erreur-telephone').hidden = true;
  });
}

connecterInteractions();
