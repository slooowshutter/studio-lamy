document.documentElement.classList.add('js');

const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const elementsApparition = Array.from(document.querySelectorAll('.apparition'));
elementsApparition.forEach((element) => {
  const ticket = element.closest('li');
  if (ticket) {
    const rang = Array.from(ticket.parentElement.children).indexOf(ticket);
    element.style.setProperty('--retard', `${rang * 80}ms`);
  }
});

if (mouvementReduit || !('IntersectionObserver' in window)) {
  elementsApparition.forEach((element) => element.classList.add('est-visible'));
} else {
  const observateurApparition = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('est-visible');
        observateur.unobserve(entree.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  elementsApparition.forEach((element, indice) => {
    if (element.closest('.hero')) {
      window.setTimeout(() => element.classList.add('est-visible'), 80 + indice * 80);
    } else {
      observateurApparition.observe(element);
    }
  });
}

const boutonMenu = document.querySelector('.bouton-menu');
const navigation = document.querySelector('#navigation-principale');

function fermerNavigation() {
  if (!boutonMenu || !navigation) return;
  boutonMenu.setAttribute('aria-expanded', 'false');
  boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
  navigation.dataset.ouvert = 'non';
}

if (boutonMenu && navigation) {
  boutonMenu.addEventListener('click', () => {
    const estOuverte = boutonMenu.getAttribute('aria-expanded') === 'true';
    boutonMenu.setAttribute('aria-expanded', String(!estOuverte));
    boutonMenu.setAttribute('aria-label', estOuverte ? 'Ouvrir la navigation' : 'Fermer la navigation');
    navigation.dataset.ouvert = estOuverte ? 'non' : 'oui';
  });

  navigation.querySelectorAll('a').forEach((lien) => {
    lien.addEventListener('click', fermerNavigation);
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') {
      fermerNavigation();
      boutonMenu.focus();
    }
  });

  document.addEventListener('pointerdown', (evenement) => {
    if (boutonMenu.getAttribute('aria-expanded') === 'true'
      && !navigation.contains(evenement.target)
      && !boutonMenu.contains(evenement.target)) {
      fermerNavigation();
    }
  });
}

const barreMobile = document.querySelector('.barre-mobile');
const zoneReservation = document.querySelector('#reservation');
const piedDePage = document.querySelector('.pied-de-page');
const billetHero = document.querySelector('.billet-hero__actions');

if (barreMobile && zoneReservation && piedDePage && billetHero && 'IntersectionObserver' in window) {
  const visibilite = { hero: true, reservation: false, pied: false };
  const observateurBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.target === billetHero) visibilite.hero = entree.isIntersecting;
      if (entree.target === zoneReservation) visibilite.reservation = entree.isIntersecting;
      if (entree.target === piedDePage) visibilite.pied = entree.isIntersecting;
    });
    barreMobile.classList.toggle('est-visible', !visibilite.hero && !visibilite.reservation && !visibilite.pied);
  }, { threshold: 0.05 });

  observateurBarre.observe(billetHero);
  observateurBarre.observe(zoneReservation);
  observateurBarre.observe(piedDePage);
}

const formulaire = document.querySelector('#formulaire-reservation');
const panneaux = Array.from(document.querySelectorAll('.panneau-etape'));
const annonceEtape = document.querySelector('#etape-annoncee');
const panneauJours = document.querySelector('#choix-jours');
const panneauHeures = document.querySelector('#choix-heures');
const recapAvantEnvoi = document.querySelector('#recap-avant-envoi');
const confirmation = document.querySelector('#confirmation');
const billetImprime = document.querySelector('.billet-imprime');
const erreurJour = document.querySelector('#erreur-jour');
const erreurHeure = document.querySelector('#erreur-heure');

const titresEtapes = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
let etapeActive = 0;
let jourChoisi = null;
let heureChoisie = null;

const formatCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const formatLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

function cleLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function debutJournee(date) {
  const copie = new Date(date);
  copie.setHours(0, 0, 0, 0);
  return copie;
}

function prestationSelectionnee() {
  const radio = formulaire.querySelector('input[name="prestation"]:checked');
  if (!radio) return null;
  const nom = radio.closest('label').querySelector('.choix-prestation__nom').textContent.trim();
  const duree = Number(radio.dataset.duree);
  return { radio, nom, duree };
}

function heureEnTexte(minutes) {
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = String(minutes % 60).padStart(2, '0');
  return `${heures} h ${minutesRestantes}`;
}

function mettreAJourRecapitulatif() {
  const prestation = prestationSelectionnee();
  document.querySelector('#recap-prestation').textContent = prestation ? prestation.nom : 'À choisir';
  document.querySelector('#recap-jour').textContent = jourChoisi ? formatLong.format(jourChoisi) : 'À choisir';
  document.querySelector('#recap-heure').textContent = heureChoisie || 'À choisir';

  if (recapAvantEnvoi && prestation) {
    const jour = jourChoisi ? formatLong.format(jourChoisi) : 'jour à choisir';
    const heure = heureChoisie || 'heure à choisir';
    recapAvantEnvoi.textContent = `Récapitulatif\u00a0: ${prestation.nom}, ${jour}, ${heure}. Prix non affiché dans cette démonstration.`;
  }
}

function construireJours() {
  if (!panneauJours) return;
  panneauJours.replaceChildren();
  const aujourdHui = debutJournee(new Date());

  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(aujourdHui);
    date.setDate(aujourdHui.getDate() + decalage);
    const dimanche = date.getDay() === 0;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'bouton-jour';
    bouton.dataset.date = cleLocale(date);
    bouton.setAttribute('aria-pressed', 'false');
    bouton.disabled = dimanche;

    const nomJour = document.createElement('strong');
    nomJour.textContent = decalage === 0 ? 'Aujourd’hui' : formatJour.format(date);
    const dateCourte = document.createElement('span');
    dateCourte.textContent = formatCourt.format(date).replace('.', '');
    bouton.append(nomJour, dateCourte);

    if (dimanche) {
      const mention = document.createElement('span');
      mention.textContent = 'Fermé';
      bouton.append(mention);
      bouton.setAttribute('aria-label', `${formatLong.format(date)}, fermé`);
    } else {
      bouton.setAttribute('aria-label', `Choisir ${formatLong.format(date)}`);
      bouton.addEventListener('click', () => {
        jourChoisi = date;
        heureChoisie = null;
        erreurJour.textContent = '';
        panneauJours.querySelectorAll('.bouton-jour').forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        construireHeures();
        mettreAJourRecapitulatif();
      });
    }

    panneauJours.append(bouton);
  }
}

function estPrisDansSimulation(date, debut) {
  const cle = `${cleLocale(date)}-${debut}`;
  let somme = 17;
  for (let indice = 0; indice < cle.length; indice += 1) {
    somme = (somme * 31 + cle.charCodeAt(indice)) % 997;
  }
  return somme % 7 === 0;
}

function construireHeures(conserverHeure = false) {
  if (!panneauHeures) return;
  const heurePrecedente = conserverHeure ? heureChoisie : null;
  panneauHeures.replaceChildren();
  heureChoisie = null;

  if (!jourChoisi) {
    mettreAJourRecapitulatif();
    return;
  }

  const prestation = prestationSelectionnee();
  const duree = prestation ? prestation.duree : 0;
  const maintenant = new Date();
  const memeJour = cleLocale(jourChoisi) === cleLocale(maintenant);
  const minutesMaintenant = maintenant.getHours() * 60 + maintenant.getMinutes();
  let nombreDisponible = 0;

  for (let debut = 9 * 60; debut + duree <= 19 * 60; debut += 30) {
    const bouton = document.createElement('button');
    const heure = heureEnTexte(debut);
    const pris = estPrisDansSimulation(jourChoisi, debut);
    const passe = memeJour && debut <= minutesMaintenant;
    bouton.type = 'button';
    bouton.className = 'bouton-heure';
    bouton.setAttribute('aria-pressed', 'false');

    const heureTexte = document.createElement('strong');
    heureTexte.textContent = heure;
    bouton.append(heureTexte);

    if (pris) {
      bouton.disabled = true;
      bouton.classList.add('est-pris');
      bouton.setAttribute('aria-label', `${heure}, pris dans cette simulation`);
      const mention = document.createElement('span');
      mention.textContent = 'Pris en simulation';
      bouton.append(mention);
    } else if (passe) {
      bouton.disabled = true;
      bouton.setAttribute('aria-label', `${heure}, horaire passé`);
      const mention = document.createElement('span');
      mention.textContent = 'Passé';
      bouton.append(mention);
    } else {
      nombreDisponible += 1;
      if (heure === heurePrecedente) {
        heureChoisie = heure;
        bouton.setAttribute('aria-pressed', 'true');
      }
      bouton.setAttribute('aria-label', `Choisir ${heure}`);
      bouton.addEventListener('click', () => {
        heureChoisie = heure;
        erreurHeure.textContent = '';
        panneauHeures.querySelectorAll('.bouton-heure').forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        mettreAJourRecapitulatif();
      });
    }

    panneauHeures.append(bouton);
  }

  if (nombreDisponible === 0) {
    const note = document.createElement('p');
    note.className = 'aide-etape';
    note.textContent = 'Aucun créneau de démonstration restant ce jour. Choisissez une autre date.';
    panneauHeures.append(note);
  }

  mettreAJourRecapitulatif();
}

function changerEtape(nouvelleEtape) {
  if (nouvelleEtape < 0 || nouvelleEtape >= panneaux.length || nouvelleEtape === etapeActive) return;
  const ancienPanneau = panneaux[etapeActive];
  const nouveauPanneau = panneaux[nouvelleEtape];
  ancienPanneau.classList.add('est-sortant');
  nouveauPanneau.hidden = false;
  nouveauPanneau.classList.add('est-entrant');
  requestAnimationFrame(() => nouveauPanneau.classList.add('est-actif'));
  etapeActive = nouvelleEtape;
  annonceEtape.textContent = `Étape ${nouvelleEtape + 1} sur 4 · ${titresEtapes[nouvelleEtape]}`;
  nouveauPanneau.querySelector('h3').focus({ preventScroll: true });

  window.setTimeout(() => {
    ancienPanneau.hidden = true;
    ancienPanneau.classList.remove('est-sortant');
    nouveauPanneau.classList.remove('est-entrant', 'est-actif');
  }, mouvementReduit ? 180 : 250);
}

function annoncerErreur(element, message) {
  element.textContent = message;
}

if (formulaire) {
  construireJours();
  mettreAJourRecapitulatif();

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) {
      jourChoisi = null;
      heureChoisie = null;
      construireJours();
      construireHeures();
      mettreAJourRecapitulatif();
    }
  });

  formulaire.querySelectorAll('[data-action="suivant"]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etapeActive === 0) {
        changerEtape(1);
      } else if (etapeActive === 1) {
        if (!jourChoisi) {
          annoncerErreur(erreurJour, 'Choisissez un jour pour poursuivre.');
          panneauJours.querySelector('button:not(:disabled)')?.focus();
          return;
        }
        construireHeures(true);
        changerEtape(2);
      } else if (etapeActive === 2) {
        if (!heureChoisie) {
          annoncerErreur(erreurHeure, 'Choisissez une heure de démonstration pour poursuivre.');
          panneauHeures.querySelector('button:not(:disabled)')?.focus();
          return;
        }
        changerEtape(3);
      }
    });
  });

  formulaire.querySelectorAll('[data-action="precedent"]').forEach((bouton) => {
    bouton.addEventListener('click', () => changerEtape(etapeActive - 1));
  });

  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');

  prenom.addEventListener('input', () => {
    erreurPrenom.textContent = '';
    prenom.removeAttribute('aria-invalid');
  });

  telephone.addEventListener('input', () => {
    erreurTelephone.textContent = '';
    telephone.removeAttribute('aria-invalid');
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenomNettoye = prenom.value.trim();
    const telephoneCompact = telephone.value.replace(/[\s().-]/g, '');
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephoneCompact);
    let champEnErreur = null;

    if (!prenomNettoye) {
      annoncerErreur(erreurPrenom, 'Saisissez votre prénom.');
      prenom.setAttribute('aria-invalid', 'true');
      champEnErreur = prenom;
    }

    if (!telephoneValide) {
      annoncerErreur(erreurTelephone, 'Saisissez un numéro mobile français valide.');
      telephone.setAttribute('aria-invalid', 'true');
      if (!champEnErreur) champEnErreur = telephone;
    }

    if (champEnErreur) {
      champEnErreur.focus();
      return;
    }

    const prestation = prestationSelectionnee();
    document.querySelector('#confirmation-prestation').textContent = prestation.nom;
    document.querySelector('#confirmation-jour').textContent = formatLong.format(jourChoisi);
    document.querySelector('#confirmation-heure').textContent = heureChoisie;
    document.querySelector('#confirmation-prenom').textContent = prenomNettoye;
    formulaire.hidden = true;
    confirmation.hidden = false;
    annonceEtape.textContent = 'Démonstration terminée\u00a0: aucune réservation ni aucun message n’a été envoyé.';
    mettreAJourRecapitulatif();
    requestAnimationFrame(() => billetImprime.classList.add('est-imprime'));
    confirmation.focus();
  });

  document.querySelector('#recommencer').addEventListener('click', () => {
    formulaire.hidden = false;
    confirmation.hidden = true;
    billetImprime.classList.remove('est-imprime');
    formulaire.reset();
    etapeActive = 0;
    panneaux.forEach((panneau, indice) => {
      panneau.hidden = indice !== 0;
      panneau.classList.remove('est-sortant', 'est-entrant', 'est-actif');
    });
    prenom.value = '';
    telephone.value = '';
    prenom.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');
    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    erreurJour.textContent = '';
    erreurHeure.textContent = '';
    jourChoisi = null;
    heureChoisie = null;
    annonceEtape.textContent = 'Étape 1 sur 4 · Prestation';
    construireJours();
    construireHeures();
    mettreAJourRecapitulatif();
    panneaux[0].querySelector('h3').focus();
  });
}

document.querySelectorAll('[data-preselection]').forEach((lien) => {
  lien.addEventListener('click', () => {
    if (!formulaire) return;
    const radio = formulaire.querySelector(`input[name="prestation"][value="${lien.dataset.preselection}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (etapeActive !== 0) changerEtape(0);
    mettreAJourRecapitulatif();
  });
});
