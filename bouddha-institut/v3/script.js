document.documentElement.classList.add('js');

const preferenceMouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
const dureeEtape = 240;
const courbeEtape = 'cubic-bezier(.23, 1, .32, 1)';

const boutonMenu = document.querySelector('.navigation__bouton');
const liensMenu = document.querySelector('.navigation__liens');

function fermerMenu(rendreFocus) {
  boutonMenu.setAttribute('aria-expanded', 'false');
  boutonMenu.setAttribute('aria-label', 'Ouvrir le sommaire');
  liensMenu.dataset.ouvert = 'faux';
  if (rendreFocus) boutonMenu.focus();
}

boutonMenu.setAttribute('aria-label', 'Ouvrir le sommaire');
boutonMenu.addEventListener('click', () => {
  const estOuvert = boutonMenu.getAttribute('aria-expanded') === 'true';
  boutonMenu.setAttribute('aria-expanded', String(!estOuvert));
  boutonMenu.setAttribute('aria-label', estOuvert ? 'Ouvrir le sommaire' : 'Fermer le sommaire');
  liensMenu.dataset.ouvert = estOuvert ? 'faux' : 'vrai';
  if (!estOuvert) liensMenu.querySelector('a').focus();
});

liensMenu.addEventListener('click', (evenement) => {
  if (evenement.target.closest('a')) fermerMenu(false);
});

document.addEventListener('keydown', (evenement) => {
  if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') {
    fermerMenu(true);
  }
});

const hero = document.querySelector('.hero__cadre');
requestAnimationFrame(() => hero.classList.add('hero--allume'));

const elementsAReveler = [...document.querySelectorAll('[data-reveal]')];
if ('IntersectionObserver' in window && !preferenceMouvementReduit.matches) {
  const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      const groupe = entree.target.dataset.reveal;
      const freres = elementsAReveler.filter((element) => element.dataset.reveal === groupe);
      entree.target.style.transitionDelay = `${Math.max(0, freres.indexOf(entree.target)) * 60}ms`;
      entree.target.classList.add('est-visible');
      observateur.unobserve(entree.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });

  elementsAReveler.forEach((element) => observateurRevelation.observe(element));
} else {
  elementsAReveler.forEach((element) => element.classList.add('est-visible'));
}

const barreMobile = document.querySelector('.barre-mobile');
const ciblesBarre = [document.querySelector('#reservation'), document.querySelector('.pied-page')];
if ('IntersectionObserver' in window) {
  const visibles = new Set();
  const observateurBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) visibles.add(entree.target);
      else visibles.delete(entree.target);
    });
    barreMobile.classList.toggle('est-masquee', visibles.size > 0);
    barreMobile.setAttribute('aria-hidden', String(visibles.size > 0));
    barreMobile.inert = visibles.size > 0;
  }, { threshold: .01 });
  ciblesBarre.forEach((cible) => observateurBarre.observe(cible));
}

const panneauxEtape = [...document.querySelectorAll('.etape[data-etape]')];
const formulaire = document.querySelector('#formulaire-simulation');
const finSimulation = document.querySelector('#simulation-fin');
const repriseSimulation = document.querySelector('#reprendre-simulation');
const resumeSoin = document.querySelector('#resume-soin');
const resumeJour = document.querySelector('#resume-jour');
const resumeHeure = document.querySelector('#resume-heure');
const recapSimulation = document.querySelector('#recap-simulation');
const choixJours = document.querySelector('#choix-jours');
const choixHeures = document.querySelector('#choix-heures');
const annonceHeures = document.querySelector('#annonce-heures');

let familleChoisie = '';
let dateChoisie = null;
let heureChoisie = '';
let animationEtape = null;
let numeroTransition = 0;

function obtenirHeureParis() {
  const morceaux = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const valeur = Object.fromEntries(morceaux.map((partie) => [partie.type, partie.value]));
  return {
    annee: Number(valeur.year),
    mois: Number(valeur.month),
    jour: Number(valeur.day),
    heure: Number(valeur.hour),
    minute: Number(valeur.minute)
  };
}

function creerDateUTC(annee, mois, jour) {
  return new Date(Date.UTC(annee, mois - 1, jour, 12));
}

function dateEnTexte(date, options) {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'Europe/Paris' }).format(date);
}

function dateISO(date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

function viderErreur(id) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = '';
}

async function afficherEtape(numero) {
  const prochaine = panneauxEtape.find((panneau) => panneau.dataset.etape === String(numero));
  if (!prochaine) return;
  const actuelle = panneauxEtape.find((panneau) => !panneau.hidden);
  if (actuelle === prochaine) return;

  numeroTransition += 1;
  const transitionCourante = numeroTransition;
  if (animationEtape) animationEtape.cancel();

  if (actuelle && !preferenceMouvementReduit.matches && typeof actuelle.animate === 'function') {
    animationEtape = actuelle.animate(
      [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }],
      { duration: dureeEtape / 2, easing: courbeEtape, fill: 'forwards' }
    );
    try {
      await animationEtape.finished;
    } catch {
      return;
    }
    if (transitionCourante !== numeroTransition) return;
    animationEtape = null;
  }

  if (actuelle) actuelle.hidden = true;
  finSimulation.hidden = true;
  prochaine.hidden = false;

  if (typeof prochaine.animate === 'function') {
    const mouvements = preferenceMouvementReduit.matches
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }];
    animationEtape = prochaine.animate(mouvements, { duration: dureeEtape / 2, easing: courbeEtape });
  }

  const titre = prochaine.querySelector('h3');
  requestAnimationFrame(() => titre.focus());
}

function choisirFamille(valeur) {
  familleChoisie = valeur;
  resumeSoin.textContent = valeur;
  viderErreur('erreur-soin');
}

document.querySelectorAll('input[name="famille"]').forEach((choix) => {
  choix.addEventListener('change', () => choisirFamille(choix.value));
});

function creerJours() {
  const maintenant = obtenirHeureParis();
  const aujourdHui = Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour, 12);

  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(aujourdHui + decalage * 86400000);
    const jourSemaine = date.getUTCDay();
    const estFerme = jourSemaine === 2;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'jour';
    bouton.dataset.date = dateISO(date);
    bouton.disabled = estFerme;
    bouton.setAttribute('aria-pressed', 'false');

    const nomCourt = document.createElement('span');
    nomCourt.textContent = dateEnTexte(date, { weekday: 'short' }).replace('.', '');
    const numero = document.createElement('strong');
    numero.textContent = dateEnTexte(date, { day: 'numeric' });
    const mois = document.createElement('small');
    mois.textContent = estFerme ? 'fermé' : dateEnTexte(date, { month: 'short' }).replace('.', '');
    bouton.append(nomCourt, numero, mois);

    const libelleComplet = dateEnTexte(date, { weekday: 'long', day: 'numeric', month: 'long' });
    bouton.setAttribute('aria-label', estFerme ? `${libelleComplet}, fermé` : `${libelleComplet}, date de démonstration`);
    bouton.addEventListener('click', () => {
      choixJours.querySelectorAll('.jour').forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      dateChoisie = { date, iso: dateISO(date), libelle: libelleComplet, jourSemaine };
      resumeJour.textContent = libelleComplet;
      heureChoisie = '';
      resumeHeure.textContent = 'À choisir';
      annonceHeures.textContent = `Heures de démonstration pour ${libelleComplet}.`;
      viderErreur('erreur-jour');
      creerHeures();
    });
    choixJours.append(bouton);
  }
}

function creerHeures() {
  choixHeures.replaceChildren();
  heureChoisie = '';
  if (!dateChoisie) return;

  const maintenant = obtenirHeureParis();
  const estAujourdhui = dateChoisie.iso === `${maintenant.annee}-${String(maintenant.mois).padStart(2, '0')}-${String(maintenant.jour).padStart(2, '0')}`;
  let nombreHeures = 0;

  for (let heure = 10; heure <= 18; heure += 1) {
    if (estAujourdhui && (heure < maintenant.heure || (heure === maintenant.heure && maintenant.minute > 0))) continue;
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'heure';
    bouton.textContent = `${heure} h`;
    bouton.setAttribute('aria-pressed', 'false');
    bouton.addEventListener('click', () => {
      choixHeures.querySelectorAll('.heure').forEach((element) => element.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      heureChoisie = `${String(heure).padStart(2, '0')}:00`;
      resumeHeure.textContent = `${heure} h`;
      viderErreur('erreur-heure');
    });
    choixHeures.append(bouton);
    nombreHeures += 1;
  }

  if (nombreHeures === 0) {
    const message = document.createElement('p');
    message.className = 'etape__aide';
    message.textContent = 'Aucune heure de démonstration ne reste aujourd’hui. Choisissez un autre jour.';
    choixHeures.append(message);
  }
}

function afficherErreur(id, texte) {
  document.querySelector(`#${id}`).textContent = texte;
}

document.querySelectorAll('[data-suivant]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    const prochaine = Number(bouton.dataset.suivant);
    const actuelle = Number(bouton.closest('.etape').dataset.etape);

    if (actuelle === 1 && !familleChoisie) {
      afficherErreur('erreur-soin', 'Choisissez une famille de soins pour continuer.');
      return;
    }
    if (actuelle === 2 && !dateChoisie) {
      afficherErreur('erreur-jour', 'Choisissez une date de démonstration.');
      return;
    }
    if (actuelle === 3 && !heureChoisie) {
      afficherErreur('erreur-heure', 'Choisissez une heure de démonstration.');
      return;
    }
    afficherEtape(prochaine);
  });
});

document.querySelectorAll('[data-precedent]').forEach((bouton) => {
  bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.precedent)));
});

function afficherErreurChamp(champ, message) {
  champ.setAttribute('aria-invalid', 'true');
  document.querySelector(`#${champ.id === 'prenom' ? 'erreur-prenom' : 'erreur-telephone'}`).textContent = message;
}

function effacerErreurChamp(champ, idErreur) {
  champ.removeAttribute('aria-invalid');
  document.querySelector(`#${idErreur}`).textContent = '';
}

const champPrenom = document.querySelector('#prenom');
const champTelephone = document.querySelector('#telephone');

champPrenom.addEventListener('input', () => effacerErreurChamp(champPrenom, 'erreur-prenom'));
champTelephone.addEventListener('input', () => effacerErreurChamp(champTelephone, 'erreur-telephone'));

function mobileFrancaisValide(telephone) {
  const nettoye = telephone.replace(/[ .()-]/g, '');
  return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(nettoye);
}

formulaire.addEventListener('submit', (evenement) => {
  evenement.preventDefault();
  viderErreur('erreur-coordonnees');
  let premierChampEnErreur = null;

  if (!champPrenom.value.trim()) {
    afficherErreurChamp(champPrenom, 'Saisissez votre prénom.');
    premierChampEnErreur = champPrenom;
  }
  if (!mobileFrancaisValide(champTelephone.value.trim())) {
    afficherErreurChamp(champTelephone, 'Saisissez un numéro de mobile français valide.');
    if (!premierChampEnErreur) premierChampEnErreur = champTelephone;
  }

  if (premierChampEnErreur) {
    afficherErreur('erreur-coordonnees', 'Vérifiez les champs signalés.');
    premierChampEnErreur.focus();
    return;
  }

  recapSimulation.textContent = `${familleChoisie} · ${dateChoisie.libelle} · ${heureChoisie.replace(':00', ' h')}.`;
  formulaire.hidden = true;
  finSimulation.hidden = false;
  finSimulation.querySelector('h3').focus();
});

repriseSimulation.addEventListener('click', () => {
  formulaire.reset();
  effacerErreurChamp(champPrenom, 'erreur-prenom');
  effacerErreurChamp(champTelephone, 'erreur-telephone');
  familleChoisie = '';
  dateChoisie = null;
  heureChoisie = '';
  resumeSoin.textContent = 'À choisir';
  resumeJour.textContent = 'À choisir';
  resumeHeure.textContent = 'À choisir';
  choixJours.querySelectorAll('.jour').forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
  choixHeures.replaceChildren();
  formulaire.hidden = true;
  afficherEtape(1);
});

creerJours();
