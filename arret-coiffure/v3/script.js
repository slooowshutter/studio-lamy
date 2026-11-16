document.documentElement.classList.add('js');

const prestations = {
  brushing: { nom: 'Brushing', duree: 30, dureeTexte: '30 min' },
  'coupe-courte': { nom: 'Coupe courte + brushing', duree: 30, dureeTexte: '30 min' },
  'coupe-carre': { nom: 'Coupe carré + brushing', duree: 60, dureeTexte: '1 h' },
  'coupe-mi-long': { nom: 'Coupe mi-long + brushing', duree: 60, dureeTexte: '1 h' },
  'coupe-homme': { nom: 'Coupe homme', duree: 30, dureeTexte: '30 min' },
  'coupe-homme-etudiant': { nom: 'Coupe homme étudiant', duree: 30, dureeTexte: '30 min' },
  barbe: { nom: 'Barbe', duree: 5, dureeTexte: '5 min' }
};

const horaires = {
  0: null,
  1: { ouverture: 9 * 60, fermeture: 19 * 60 },
  2: { ouverture: 9 * 60, fermeture: 19 * 60 },
  3: { ouverture: 9 * 60, fermeture: 19 * 60 },
  4: { ouverture: 9 * 60, fermeture: 19 * 60 },
  5: { ouverture: 9 * 60, fermeture: 19 * 60 },
  6: { ouverture: 8 * 60 + 30, fermeture: 16 * 60 }
};

const formulaire = document.querySelector('#formulaire-reservation');
const listePrestations = document.querySelector('.liste-prestations');
const etapeActive = document.querySelector('#etape-active');
const progression = document.querySelector('#progression-etapes');
const resumePrestation = document.querySelector('#resume-prestation');
const resumeDate = document.querySelector('#resume-date');
const resumeHeure = document.querySelector('#resume-heure');
const liensModification = document.querySelector('#liens-modification');
const panneau = document.querySelector('.panneau');
const etat = { etape: 'prestation', prestation: '', jour: null, heure: '', prenom: '', telephone: '' };

const ordreEtapes = ['prestation', 'jour', 'heure', 'coordonnees', 'confirmation'];
const libellesEtapes = {
  prestation: 'Choisir une prestation',
  jour: 'Choisir un jour',
  heure: 'Choisir un créneau',
  coordonnees: 'Vos coordonnées',
  confirmation: 'Fin de la simulation'
};

function echapper(texte) {
  return String(texte).replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caractere]);
}

function dateLocale(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
  return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function dateIdentite(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function heuresTexte(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function prochainNumero(étape) {
  return ordreEtapes.indexOf(étape) + 1;
}

function mettreAJourResume() {
  const prestation = prestations[etat.prestation];
  resumePrestation.textContent = prestation ? `${prestation.nom} · ${prestation.dureeTexte}` : 'Aucune prestation choisie';
  resumeDate.textContent = etat.jour ? dateLocale(etat.jour) : 'Aucun jour choisi';
  resumeHeure.textContent = etat.heure ? `Créneau de démonstration · ${etat.heure}` : 'Aucun créneau choisi';
  liensModification.replaceChildren();

  const liens = [];
  if (prestation && etat.etape !== 'prestation' && etat.etape !== 'confirmation') liens.push(['Modifier la prestation', 'prestation']);
  if (etat.jour && ['heure', 'coordonnees'].includes(etat.etape)) liens.push(['Modifier le jour', 'jour']);
  if (etat.heure && etat.etape === 'coordonnees') liens.push(['Modifier le créneau', 'heure']);
  liens.forEach(([texte, étape]) => {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.dataset.retour = étape;
    bouton.textContent = texte;
    liensModification.append(bouton);
  });
}

function changerEtape(étape, { historique = 'ajouter', focus = true } = {}) {
  if (!ordreEtapes.includes(étape)) return;
  etat.etape = étape;
  if (historique === 'ajouter') history.pushState({ etape: étape }, '', location.href);
  if (historique === 'remplacer') history.replaceState({ etape: étape }, '', location.href);
  afficherEtape(focus);
}

function afficherEtape(deplacerFocus = true) {
  const numéro = prochainNumero(etat.etape);
  progression.textContent = `Étape ${numéro} sur ${ordreEtapes.length}`;
  etapeActive.innerHTML = contenuEtape();
  etapeActive.classList.remove('etape-visible');
  requestAnimationFrame(() => etapeActive.classList.add('etape-visible'));
  mettreAJourResume();

  if (deplacerFocus) {
    requestAnimationFrame(() => {
      const titre = etapeActive.querySelector('h3');
      titre?.focus({ preventScroll: true });
    });
  }
  if (etat.etape === 'heure') annoncerCreneaux();
}

function contenuEtape() {
  if (etat.etape === 'prestation') return contenuPrestation();
  if (etat.etape === 'jour') return contenuJour();
  if (etat.etape === 'heure') return contenuHeure();
  if (etat.etape === 'coordonnees') return contenuCoordonnees();
  return contenuConfirmation();
}

function contenuPrestation() {
  const cartes = Object.entries(prestations).map(([identifiant, item]) => `
    <label class="choix-ligne">
      <input type="radio" name="prestation" value="${identifiant}" ${etat.prestation === identifiant ? 'checked' : ''}>
      <span class="choix-nom">${item.nom}</span><span class="choix-detail">${item.dureeTexte}</span>
    </label>`).join('');

  return `<h3 tabindex="-1">Choisir une prestation</h3>
    <p>La démonstration montre les prestations et les durées, sans afficher de prix ni de disponibilité réelle.</p>
    <fieldset class="choix-prestation"><legend>Prestation</legend>${cartes}</fieldset>
    <p id="erreur-prestation" class="erreur-champ" role="alert"></p>
    <button class="bouton bouton-corail" type="button" data-action="continuer">Choisir un jour <span aria-hidden="true">→</span></button>`;
}

function creerJours() {
  const maintenant = new Date();
  const jours = [];
  for (let décalage = 0; décalage < 14; décalage += 1) {
    const jour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + décalage, 12);
    jours.push({ jour, fermé: horaires[jour.getDay()] === null });
  }
  return jours;
}

function contenuJour() {
  const jours = creerJours();
  const choix = jours.map(({ jour, fermé }, index) => {
    const court = dateLocale(jour, { weekday: 'short' }).replace('.', '');
    const indication = fermé ? 'Fermé' : index === 0 ? 'Auj.' : index === 1 ? 'Demain' : '';
    const accessibilité = `${dateLocale(jour)}${fermé ? ', fermé' : ''}`;
    return `<button class="jour-bouton" type="button" data-jour="${dateIdentite(jour)}" aria-label="${echapper(accessibilité)}" ${fermé ? 'disabled' : ''}>
      <span>${echapper(court)}</span><strong>${jour.getDate()}</strong>${indication ? `<small>${indication}</small>` : ''}
    </button>`;
  }).join('');

  return `<button class="retour-etape" type="button" data-retour="prestation">← Modifier la prestation</button>
    <h3 tabindex="-1">Choisir un jour</h3>
    <p>Jours issus des horaires publiés. Dimanche est indiqué comme fermé.</p>
    <fieldset class="choix-jours"><legend>Jour du rendez-vous</legend>${choix}</fieldset>`;
}

function calculerCreneaux(jour) {
  const ouverture = horaires[jour.getDay()];
  if (!ouverture) return [];
  const prestation = prestations[etat.prestation];
  if (!prestation) return [];
  const maintenant = new Date();
  const aujourdhui = dateIdentite(jour) === dateIdentite(maintenant);
  const disponibles = [];
  for (let minute = ouverture.ouverture; minute + prestation.duree <= ouverture.fermeture; minute += 30) {
    const heure = heuresTexte(minute);
    const passé = aujourdhui && minute <= maintenant.getHours() * 60 + maintenant.getMinutes();
    const journee = jour.getDate();
    const occupeDansLaDemo = (minute / 30 + journee) % 7 === 3;
    disponibles.push({ heure, minute, passé, occupeDansLaDemo });
  }
  return disponibles;
}

function contenuHeure() {
  if (!etat.jour) return contenuJour();
  const creneaux = calculerCreneaux(etat.jour);
  const resteDisponible = creneaux.some(creneau => !creneau.passé && !creneau.occupeDansLaDemo);
  const plages = [
    { identifiant: 'matin', nom: 'Matin', debut: 0, fin: 720 },
    { identifiant: 'apres-midi', nom: 'Après-midi', debut: 720, fin: 1080 },
    { identifiant: 'soir', nom: 'Soir', debut: 1080, fin: 1440 }
  ];
  const lignes = plages.map(plage => {
    const horairesPlage = creneaux.filter(creneau => creneau.minute >= plage.debut && creneau.minute < plage.fin);
    if (!horairesPlage.length) return '';
    const choix = horairesPlage.map(creneau => {
      const identifiant = `heure-${plage.identifiant}-${creneau.heure.replace(':', '-')}`;
      const indisponible = creneau.passé || creneau.occupeDansLaDemo;
      const motifIndisponibilite = creneau.passé ? 'créneau déjà passé' : 'créneau indisponible dans cette démonstration';
      const libelleIndisponibilite = creneau.passé ? 'Déjà passé' : 'Déjà pris · démo';
      return `<div class="creneau-ligne">
        <input id="${identifiant}" type="radio" name="heure" value="${creneau.heure}" ${etat.heure === creneau.heure ? 'checked' : ''} ${indisponible ? `disabled aria-label="${creneau.heure}, ${motifIndisponibilite}"` : ''}>
        <label for="${identifiant}">${creneau.heure}${indisponible ? `<small class="indisponible-demo">${libelleIndisponibilite}</small>` : ''}</label>
      </div>`;
    }).join('');
    return `<div class="plage-creneaux" role="group" aria-labelledby="titre-plage-${plage.identifiant}">
      <h4 id="titre-plage-${plage.identifiant}">${plage.nom}</h4>
      <div class="grille-creneaux">${choix}</div>
    </div>`;
  }).join('');
  const message = creneaux.length ? 'Créneaux de démonstration, sans disponibilité réelle.' : 'Aucun créneau ne reste dans les horaires publiés pour ce jour.';

  return `<button class="retour-etape" type="button" data-retour="jour">← Modifier le jour</button>
    <h3 tabindex="-1" id="titre-creneaux">Créneaux du ${echapper(dateLocale(etat.jour))}</h3>
    <p id="annonce-creneaux" role="status">${message}</p>
    ${creneaux.length ? `<fieldset class="liste-creneaux"><legend>Heure de démonstration</legend>${lignes}</fieldset>
      ${resteDisponible ? '<p id="erreur-heure" class="erreur-champ" role="alert"></p><button class="bouton bouton-corail" type="button" data-action="continuer">Poursuivre <span aria-hidden="true">→</span></button>' : '<p class="erreur-champ">Aucun créneau restant dans cette démonstration.</p><button class="bouton bouton-contour" type="button" data-retour="jour">Choisir un autre jour</button>'}` : '<button class="bouton bouton-contour" type="button" data-retour="jour">Choisir un autre jour</button>'}`;
}

function annoncerCreneaux() {
  const statut = document.querySelector('#annonce-creneaux');
  if (!statut || !etat.jour) return;
  const ouverts = calculerCreneaux(etat.jour).filter(creneau => !creneau.passé && !creneau.occupeDansLaDemo).length;
  statut.textContent = `${ouverts} créneaux de démonstration le ${dateLocale(etat.jour)}. Aucune disponibilité réelle n’est vérifiée.`;
}

function contenuCoordonnees() {
  return `<button class="retour-etape" type="button" data-retour="heure">← Modifier le créneau</button>
    <h3 tabindex="-1">Vos coordonnées</h3>
    <p>Ces champs servent uniquement à parcourir la maquette. Ils restent dans cette page.</p>
    <div class="groupe-champs">
      <label for="prenom">Prénom</label>
      <input id="prenom" name="prenom" type="text" autocomplete="given-name" required value="${echapper(etat.prenom)}" aria-describedby="erreur-prenom">
      <p id="erreur-prenom" class="erreur-champ"></p>
    </div>
    <div class="groupe-champs">
      <label for="telephone">Téléphone mobile</label>
      <input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" required value="${echapper(etat.telephone)}" aria-describedby="erreur-telephone">
      <p id="erreur-telephone" class="erreur-champ"></p>
    </div>
    <div class="message-final recap-avant-envoi">
      <p><strong>${echapper(prestations[etat.prestation]?.nom || '')}</strong> · ${echapper(etat.jour ? dateLocale(etat.jour) : '')} · ${echapper(etat.heure)}</p>
    </div>
    <button class="bouton bouton-corail" type="submit">Terminer la simulation <span aria-hidden="true">→</span></button>`;
}

function contenuConfirmation() {
  const prestation = prestations[etat.prestation];
  return `<h3 tabindex="-1">La simulation est terminée.</h3>
    <div class="message-final">
      <p>Votre récapitulatif de démonstration&nbsp;: <strong>${echapper(prestation?.nom || '')}</strong>, ${echapper(etat.jour ? dateLocale(etat.jour) : '')} à ${echapper(etat.heure)}.</p>
      <p>Aucune demande n’a été envoyée au salon. Pour réserver, passez par Booksy ou téléphonez au <a href="tel:+33473923303">04&nbsp;73&nbsp;92&nbsp;33&nbsp;03</a>.</p>
    </div>
    <a class="bouton bouton-corail" href="https://booksy.com/fr-fr/61964_arret-coiffure_salon-de-coiffure_83401_clermont-ferrand" target="_blank" rel="noopener">Ouvrir Booksy <span aria-hidden="true">↗</span></a>`;
}

function validerCoordonnees() {
  const champPrenom = formulaire.querySelector('#prenom');
  const champTelephone = formulaire.querySelector('#telephone');
  const erreurPrenom = formulaire.querySelector('#erreur-prenom');
  const erreurTelephone = formulaire.querySelector('#erreur-telephone');
  const prénom = champPrenom.value.trim();
  const téléphone = champTelephone.value.trim();
  etat.prenom = prénom;
  etat.telephone = téléphone;

  const prenomValide = prénom.length >= 2;
  const téléphoneNormalisé = téléphone.replace(/[ .()-]/g, '');
  const téléphoneValide = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(téléphoneNormalisé);
  erreurPrenom.textContent = prenomValide ? '' : 'Saisissez un prénom de deux lettres au moins.';
  erreurTelephone.textContent = téléphoneValide ? '' : 'Saisissez un numéro de mobile français valide.';
  champPrenom.setAttribute('aria-invalid', String(!prenomValide));
  champTelephone.setAttribute('aria-invalid', String(!téléphoneValide));
  if (!prenomValide) { champPrenom.focus(); return false; }
  if (!téléphoneValide) { champTelephone.focus(); return false; }
  return true;
}

function initialiserRevelations() {
  const sections = document.querySelectorAll('.section');
  if (!('IntersectionObserver' in window)) {
    sections.forEach(section => section.classList.add('is-visible'));
    return;
  }
  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach(entree => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add('is-visible');
      instance.unobserve(entree.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  sections.forEach(section => observateur.observe(section));
}

function initialiserNavigation() {
  const navigation = document.querySelector('.navigation-repere');
  const liens = [...navigation.querySelectorAll('a')];
  const indicateur = navigation.querySelector('.indicateur-navigation');
  const sections = liens.map(lien => document.querySelector(lien.getAttribute('href'))).filter(Boolean);

  function deplacerIndicateur(lien) {
    if (matchMedia('(max-width: 700px)').matches) {
      const x = lien.offsetLeft - navigation.scrollLeft + lien.offsetWidth / 2 - indicateur.offsetWidth / 2;
      indicateur.style.setProperty('--repere-x', `${x}px`);
    } else {
      const y = lien.offsetTop - liens[0].offsetTop;
      indicateur.style.setProperty('--repere-y', `${y}px`);
    }
    liens.forEach(item => item.removeAttribute('aria-current'));
    lien.setAttribute('aria-current', 'location');
  }

  liens.forEach(lien => lien.addEventListener('click', () => deplacerIndicateur(lien)));
  deplacerIndicateur(liens[0]);
  window.addEventListener('resize', () => {
    const courant = navigation.querySelector('[aria-current="location"]') || liens[0];
    deplacerIndicateur(courant);
  }, { passive: true });

  if (!('IntersectionObserver' in window)) return;
  const observateur = new IntersectionObserver(entrees => {
    const visibles = entrees.filter(entree => entree.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visibles.length) return;
    const lien = liens.find(item => item.getAttribute('href') === `#${visibles[0].target.id}`);
    if (lien) deplacerIndicateur(lien);
  }, { threshold: [.1, .35, .65], rootMargin: '-15% 0px -60% 0px' });
  sections.forEach(section => observateur.observe(section));
}

function initialiserBarreMobile() {
  const barre = document.querySelector('.barre-mobile');
  const sectionIntro = document.querySelector('.section-repere');
  const pied = document.querySelector('.pied-page');
  if (!('IntersectionObserver' in window)) { barre.classList.add('visible'); return; }
  let introVisible = true;
  let piedVisible = false;
  function actualiser() { barre.classList.toggle('visible', !introVisible && !piedVisible); }
  const observateur = new IntersectionObserver(entrees => {
    entrees.forEach(entree => {
      if (entree.target === sectionIntro) introVisible = entree.isIntersecting;
      if (entree.target === pied) piedVisible = entree.isIntersecting;
    });
    actualiser();
  }, { threshold: .05 });
  observateur.observe(sectionIntro);
  observateur.observe(pied);
}

function heurePublique(minutes) {
  const heure = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return minute ? `${heure} h ${String(minute).padStart(2, '0')}` : `${heure} h`;
}

function initialiserHorairesDuJour() {
  const ligne = document.querySelector('#horaire-du-jour');
  const détails = document.querySelector('.details-horaires');
  const maintenant = new Date();
  const horaire = horaires[maintenant.getDay()];
  const nomJour = dateLocale(maintenant, { weekday: 'long' });
  ligne.innerHTML = horaire
    ? `<strong>Aujourd’hui · ${echapper(nomJour)}</strong><span>${heurePublique(horaire.ouverture)} – ${heurePublique(horaire.fermeture)}</span>`
    : `<strong>Aujourd’hui · ${echapper(nomJour)}</strong><span>Fermé</span>`;

  const pointDeRupture = matchMedia('(max-width: 700px)');
  const ajuster = () => { détails.open = !pointDeRupture.matches; };
  ajuster();
  pointDeRupture.addEventListener?.('change', ajuster);
}

formulaire.addEventListener('change', événement => {
  if (événement.target.matches('input[name="prestation"]')) {
    etat.prestation = événement.target.value;
    etat.jour = null;
    etat.heure = '';
    mettreAJourResume();
  }
  if (événement.target.matches('input[name="heure"]')) {
    etat.heure = événement.target.value;
    mettreAJourResume();
  }
});

listePrestations.addEventListener('click', événement => {
  const bouton = événement.target.closest('[data-prestation-demo]');
  if (!bouton || !prestations[bouton.dataset.prestationDemo]) return;
  etat.prestation = bouton.dataset.prestationDemo;
  etat.jour = null;
  etat.heure = '';
  changerEtape('jour');
  document.querySelector('#reserver').scrollIntoView();
});

formulaire.addEventListener('input', événement => {
  if (événement.target.id === 'prenom') etat.prenom = événement.target.value;
  if (événement.target.id === 'telephone') etat.telephone = événement.target.value;
});

formulaire.addEventListener('click', événement => {
  const boutonEtape = événement.target.closest('[data-action="continuer"]');
  if (boutonEtape) {
    if (etat.etape === 'prestation') {
      if (!etat.prestation) {
        const erreur = formulaire.querySelector('#erreur-prestation');
        if (erreur) erreur.textContent = 'Choisissez une prestation pour continuer.';
        formulaire.querySelector('input[name="prestation"]')?.focus();
        return;
      }
      changerEtape('jour');
    } else if (etat.etape === 'heure') {
      const creneauChoisi = calculerCreneaux(etat.jour).find(creneau => creneau.heure === etat.heure);
      if (!etat.heure || !creneauChoisi || creneauChoisi.passé || creneauChoisi.occupeDansLaDemo) {
        const erreur = formulaire.querySelector('#erreur-heure');
        if (erreur) erreur.textContent = 'Choisissez un créneau encore disponible dans cette démonstration.';
        formulaire.querySelector('.liste-creneaux input:not(:disabled)')?.focus();
        return;
      }
      changerEtape('coordonnees');
    }
  }

  const boutonJour = événement.target.closest('[data-jour]');
  if (boutonJour && !boutonJour.disabled) {
    const [année, mois, jour] = boutonJour.dataset.jour.split('-').map(Number);
    etat.jour = new Date(année, mois - 1, jour, 12);
    etat.heure = '';
    changerEtape('heure');
  }

  const retour = événement.target.closest('[data-retour]');
  if (retour) changerEtape(retour.dataset.retour, { historique: 'remplacer' });
});

formulaire.addEventListener('submit', événement => {
  événement.preventDefault();
  if (etat.etape !== 'coordonnees' || !validerCoordonnees()) return;
  changerEtape('confirmation');
  history.replaceState({ etape: 'confirmation' }, '', location.href);
});

liensModification.addEventListener('click', événement => {
  const retour = événement.target.closest('[data-retour]');
  if (retour) changerEtape(retour.dataset.retour, { historique: 'remplacer' });
});

window.addEventListener('popstate', événement => {
  changerEtape(ordreEtapes.includes(événement.state?.etape) ? événement.state.etape : 'prestation', { historique: 'aucun' });
});

initialiserRevelations();
initialiserNavigation();
initialiserBarreMobile();
initialiserHorairesDuJour();
afficherEtape(false);
requestAnimationFrame(() => panneau.classList.add('panneau-pret'));
