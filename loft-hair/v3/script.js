document.documentElement.classList.add('js');

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuToggle && navigation) {
  menuToggle.hidden = false;
  const fermerMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = 'Ouvrir le menu';
    navigation.classList.remove('is-open');
  };
  menuToggle.addEventListener('click', () => {
    const ouvert = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!ouvert));
    menuToggle.textContent = ouvert ? 'Ouvrir le menu' : 'Fermer le menu';
    navigation.classList.toggle('is-open', !ouvert);
    if (!ouvert) navigation.querySelector('a')?.focus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      fermerMenu();
      menuToggle.focus();
    }
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) fermerMenu();
  });
}

const entreeObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

document.querySelectorAll('[data-reveal]').forEach((element, index) => {
  element.style.transitionDelay = `${(index % 4) * 55}ms`;
  entreeObserver.observe(element);
});

const rendezVous = document.querySelector('#rendez-vous');
const pied = document.querySelector('.site-footer');
const barreMobile = document.querySelector('.mobile-dock');
if (barreMobile && 'IntersectionObserver' in window) {
  const sectionsAmasquer = new Set();
  const barreObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) sectionsAmasquer.add(entry.target);
      else sectionsAmasquer.delete(entry.target);
    });
    barreMobile.hidden = sectionsAmasquer.size > 0;
  }, { threshold: 0.08 });
  if (rendezVous) barreObserver.observe(rendezVous);
  if (pied) barreObserver.observe(pied);
}

const heuresParJour = {
  0: null,
  1: { debut: 9 * 60, fin: 12 * 60 + 30 },
  2: { debut: 9 * 60, fin: 17 * 60 + 30 },
  3: null,
  4: { debut: 9 * 60, fin: 17 * 60 + 30 },
  5: { debut: 9 * 60, fin: 17 * 60 + 30 },
  6: { debut: 9 * 60, fin: 13 * 60 + 30 }
};

const fuseau = 'Europe/Paris';
const partiesDate = new Intl.DateTimeFormat('fr-FR', {
  timeZone: fuseau,
  year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(new Date());
const partie = (type) => partiesDate.find((element) => element.type === type)?.value;
const aujourdHui = new Date(Date.UTC(Number(partie('year')), Number(partie('month')) - 1, Number(partie('day'))));
const heureParis = new Intl.DateTimeFormat('fr-FR', {
  timeZone: fuseau, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(new Date());
const heureActuelle = Number(heureParis.find((element) => element.type === 'hour')?.value || 0) * 60
  + Number(heureParis.find((element) => element.type === 'minute')?.value || 0);

const formatterJour = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'short' });
const formatterDate = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, day: 'numeric', month: 'short' });
const formatterDateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'long', day: 'numeric', month: 'long' });
const formaterHeure = (minutes) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
const isoDate = (date) => date.toISOString().slice(0, 10);
const datesProposees = Array.from({ length: 14 }, (_, decalage) => new Date(aujourdHui.getTime() + decalage * 86400000));

const etapes = [...document.querySelectorAll('.booking-step')];
const progression = [...document.querySelectorAll('[data-progress]')];
const annonce = document.querySelector('#annonce-etape');
const formulaire = document.querySelector('#booking-form');
const confirmation = document.querySelector('#confirmation');
const choixJours = document.querySelector('#choix-jours');
const choixHeures = document.querySelector('#choix-heures');
const resumePrestation = document.querySelector('#resume-prestation');
const resumeJour = document.querySelector('#resume-jour');
const resumeHeure = document.querySelector('#resume-heure');
const recapFinal = document.querySelector('#recap-final');
const recapSucces = document.querySelector('#recap-succes');
const champPrenom = document.querySelector('#prenom');
const champTelephone = document.querySelector('#telephone');
let etapeCourante = 0;
let dateChoisie = null;
let heureChoisie = null;
let prestationChoisie = null;
let minuterieTransition = null;
let minuterieFocus = null;

const radiosPrestation = [...document.querySelectorAll('input[name="prestation"]')];

function annoncer(texte) {
  if (annonce) annonce.textContent = texte;
}

function miseAJourProgression() {
  progression.forEach((element, index) => {
    element.classList.toggle('is-current', index === etapeCourante);
    element.classList.toggle('is-done', index < etapeCourante);
    if (index === etapeCourante) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  });
}

function montrerEtape(index, annoncerEtape = true) {
  if (minuterieTransition) window.clearTimeout(minuterieTransition);
  if (minuterieFocus) window.clearTimeout(minuterieFocus);
  etapes.forEach((etape) => etape.classList.remove('is-changing'));
  const precedente = etapes[etapeCourante];
  const indexPrecedent = etapeCourante;
  const suivante = etapes[index];
  if (!suivante) return;
  etapes.forEach((etape) => {
    if (etape !== precedente && etape !== suivante) {
      etape.hidden = true;
      etape.inert = true;
    }
  });
  suivante.inert = false;
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  etapeCourante = index;
  miseAJourProgression();
  if (precedente && precedente !== suivante && !reduire) {
    precedente.inert = true;
    precedente.classList.add('is-changing');
    minuterieTransition = window.setTimeout(() => {
      if (etapeCourante !== indexPrecedent) precedente.hidden = true;
      precedente.classList.remove('is-changing');
      minuterieTransition = null;
    }, 220);
  } else if (precedente && precedente !== suivante) {
    precedente.hidden = true;
    precedente.inert = true;
  }
  suivante.hidden = false;
  suivante.classList.remove('is-entering');
  if (!reduire) requestAnimationFrame(() => {
    if (etapeCourante === index && !suivante.hidden) suivante.classList.add('is-entering');
  });
  if (annoncerEtape) {
    const titre = suivante.querySelector('h3')?.textContent || '';
    annoncer(`Étape ${index + 1} sur 4. ${titre}`);
  }
  minuterieFocus = window.setTimeout(() => {
    if (etapeCourante === index && !suivante.hidden) suivante.querySelector('h3')?.focus();
    minuterieFocus = null;
  }, reduire ? 0 : 230);
}

function lirePrestation() {
  const radio = radiosPrestation.find((element) => element.checked);
  if (!radio) return null;
  return {
    valeur: radio.value,
    libelle: radio.dataset.label,
    duree: Number(radio.dataset.duration || 0),
    dureeTexte: radio.dataset.dureeTexte || 'à confirmer'
  };
}

function miseAJourResume() {
  prestationChoisie = lirePrestation();
  resumePrestation.textContent = prestationChoisie?.libelle || 'À choisir';
  resumeJour.textContent = dateChoisie ? formatterDateLongue.format(dateChoisie) : 'À choisir';
  resumeHeure.textContent = heureChoisie ?? 'À choisir';
}

function cacherErreur(nom) {
  const erreur = document.querySelector(`[data-error="${nom}"]`);
  if (erreur) erreur.hidden = true;
}

function afficherErreur(nom) {
  const erreur = document.querySelector(`[data-error="${nom}"]`);
  if (erreur) erreur.hidden = false;
}

function remplirJours() {
  choixJours.replaceChildren();
  datesProposees.forEach((date) => {
    const codeJour = date.getUTCDay();
    const horaire = heuresParJour[codeJour];
    const bouton = document.createElement('button');
    const estFerme = !horaire;
    const jourCourt = formatterJour.format(date).replace('.', '');
    const jourDate = formatterDate.format(date).replace('.', '');
    bouton.type = 'button';
    bouton.className = 'day-choice';
    bouton.disabled = estFerme;
    bouton.dataset.date = isoDate(date);
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', estFerme
      ? `${jourCourt} ${jourDate}, fermé`
      : `${jourCourt} ${jourDate}, de ${formaterHeure(horaire.debut)} à ${formaterHeure(horaire.fin)}`);
    bouton.innerHTML = `<span>${jourCourt}</span><strong>${date.getUTCDate()}</strong><span>${estFerme ? 'Fermé' : `${formaterHeure(horaire.debut)}–${formaterHeure(horaire.fin)}`}</span>`;
    if (dateChoisie && isoDate(dateChoisie) === isoDate(date)) {
      bouton.classList.add('is-selected');
      bouton.setAttribute('aria-pressed', 'true');
    }
    bouton.addEventListener('click', () => {
      dateChoisie = date;
      heureChoisie = null;
      choixJours.querySelectorAll('.day-choice').forEach((jour) => {
        const selectionne = jour === bouton;
        jour.classList.toggle('is-selected', selectionne);
        jour.setAttribute('aria-pressed', String(selectionne));
      });
      cacherErreur('jour');
      remplirHeures();
      miseAJourResume();
    });
    choixJours.append(bouton);
  });
}

function estIndisponibleDansLaDemo(date, index) {
  const chiffres = isoDate(date).replaceAll('-', '').split('').reduce((somme, chiffre) => somme + Number(chiffre), 0);
  return (chiffres + index * 3) % 7 === 2;
}

function remplirHeures() {
  choixHeures.replaceChildren();
  if (!dateChoisie) return;
  const horaire = heuresParJour[dateChoisie.getUTCDay()];
  if (!horaire) {
    const message = document.createElement('p');
    message.className = 'no-slots';
    message.textContent = 'Le salon est indiqué fermé ce jour-là. Choisissez un autre jour.';
    choixHeures.append(message);
    return;
  }
  const duree = prestationChoisie?.duree || dureeInconnue;
  const dateIsoChoisie = isoDate(dateChoisie);
  for (let minutes = horaire.debut, index = 0; minutes < horaire.fin && minutes + duree <= horaire.fin; minutes += 30, index += 1) {
    const bouton = document.createElement('button');
    const heure = formaterHeure(minutes);
    const passe = dateIsoChoisie === isoDate(aujourdHui) && minutes <= heureActuelle;
    const demoIndisponible = estIndisponibleDansLaDemo(dateChoisie, index);
    const indisponible = passe || demoIndisponible;
    bouton.type = 'button';
    bouton.className = 'slot-choice';
    bouton.disabled = indisponible;
    bouton.dataset.heure = heure;
    bouton.setAttribute('aria-pressed', 'false');
    if (passe) bouton.setAttribute('aria-label', `${heure}, horaire déjà passé`);
    else if (demoIndisponible) bouton.setAttribute('aria-label', `${heure}, indisponible dans cette simulation`);
    else bouton.setAttribute('aria-label', `${heure}, horaire de démonstration`);
    bouton.innerHTML = `<strong>${heure}</strong>${indisponible ? '<span>Indisponible</span>' : '<span>Exemple</span>'}`;
    if (heureChoisie === heure && !indisponible) {
      bouton.classList.add('is-selected');
      bouton.setAttribute('aria-pressed', 'true');
    }
    bouton.addEventListener('click', () => {
      heureChoisie = heure;
      choixHeures.querySelectorAll('.slot-choice').forEach((creneau) => {
        const selectionne = creneau === bouton;
        creneau.classList.toggle('is-selected', selectionne);
        creneau.setAttribute('aria-pressed', String(selectionne));
      });
      cacherErreur('heure');
      miseAJourResume();
    });
    choixHeures.append(bouton);
  }
}

function validerAvantEtapeSuivante() {
  if (etapeCourante === 0 && !lirePrestation()) {
    afficherErreur('prestation');
    radiosPrestation[0]?.focus();
    return false;
  }
  if (etapeCourante === 1 && !dateChoisie) {
    afficherErreur('jour');
    choixJours.querySelector('.day-choice:not(:disabled)')?.focus();
    return false;
  }
  if (etapeCourante === 2 && !heureChoisie) {
    afficherErreur('heure');
    choixHeures.querySelector('.slot-choice:not(:disabled)')?.focus();
    return false;
  }
  return true;
}

document.querySelectorAll('[data-next]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    if (!validerAvantEtapeSuivante()) return;
    if (etapeCourante === 0) {
      dateChoisie = null;
      heureChoisie = null;
      remplirJours();
      miseAJourResume();
    }
    if (etapeCourante === 1) {
      remplirHeures();
      miseAJourResume();
    }
    if (etapeCourante === 2) {
      recapFinal.textContent = `${prestationChoisie?.libelle || 'Prestation à choisir'} · ${dateChoisie ? formatterDateLongue.format(dateChoisie) : 'jour à choisir'} · ${heureChoisie || 'heure à choisir'}.`;
    }
    montrerEtape(etapeCourante + 1);
  });
});

document.querySelectorAll('[data-back]').forEach((bouton) => {
  bouton.addEventListener('click', () => montrerEtape(Math.max(0, etapeCourante - 1)));
});

radiosPrestation.forEach((radio) => {
  radio.addEventListener('change', () => {
    cacherErreur('prestation');
    heureChoisie = null;
    miseAJourResume();
  });
});

document.querySelectorAll('[data-prestation]').forEach((lien) => {
  lien.addEventListener('click', () => {
    const radio = radiosPrestation.find((element) => element.value === lien.dataset.prestation);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
});

function afficherErreurChamp(champ, idErreur, invalide) {
  const erreur = document.querySelector(`#${idErreur}`);
  champ.setAttribute('aria-invalid', String(invalide));
  erreur.hidden = !invalide;
}

champPrenom.addEventListener('input', () => afficherErreurChamp(champPrenom, 'erreur-prenom', false));
champTelephone.addEventListener('input', () => afficherErreurChamp(champTelephone, 'erreur-telephone', false));

function confirmerDemande(event) {
  event.preventDefault();
  const prenom = champPrenom.value.trim();
  const telephone = champTelephone.value.trim();
  const formatMobile = /^(?:0[67](?:[\s.-]?\d{2}){4}|\+33[67](?:[\s.-]?\d{2}){4})$/;
  const erreurPrenom = !prenom;
  const erreurTelephone = !formatMobile.test(telephone);
  afficherErreurChamp(champPrenom, 'erreur-prenom', erreurPrenom);
  afficherErreurChamp(champTelephone, 'erreur-telephone', erreurTelephone);
  if (erreurPrenom || erreurTelephone) {
    (erreurPrenom ? champPrenom : champTelephone).focus();
    return;
  }
  const libelleJour = formatterDateLongue.format(dateChoisie);
  recapSucces.textContent = `${prenom}, votre sélection : ${prestationChoisie.libelle}, le ${libelleJour} à ${heureChoisie}. Durée affichée : ${prestationChoisie.dureeTexte}.`;
  etapes.forEach((etape) => { etape.hidden = true; etape.inert = true; });
  document.querySelector('.step-progress').hidden = true;
  formulaire.hidden = true;
  confirmation.hidden = false;
  annoncer('Récapitulatif de démonstration affiché. Aucune demande n’a été envoyée.');
  confirmation.querySelector('h3').focus();
}

formulaire.addEventListener('submit', confirmerDemande);

function echapperIcs(valeur) {
  return String(valeur).replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');
}

document.querySelector('#telecharger-agenda').addEventListener('click', () => {
  const dateHeure = `${isoDate(dateChoisie).replaceAll('-', '')}T${heureChoisie.replace(' h ', '').replace(':', '').padStart(4, '0')}00`;
  const contenu = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Demande de rendez-vous//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${Date.now()}@studiolamy.local`, `DTSTAMP:${new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${dateHeure}`, `SUMMARY:${echapperIcs(`LOFT HAIR — rendez-vous à confirmer`)}`,
    `LOCATION:${echapperIcs('9 Rue Cérès, 51100 Reims')}`,
    `DESCRIPTION:${echapperIcs(`Simulation uniquement. Prestation : ${prestationChoisie.libelle}. Durée affichée : ${prestationChoisie.dureeTexte}. Rien n’a été transmis au salon.`)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const fichier = new Blob([contenu], { type: 'text/calendar;charset=utf-8' });
  const lien = document.createElement('a');
  const url = URL.createObjectURL(fichier);
  lien.href = url;
  lien.download = 'demande-loft-hair.ics';
  lien.setAttribute('aria-label', 'Télécharger le récapitulatif pour l’agenda');
  document.body.append(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
});

document.querySelector('#recommencer').addEventListener('click', () => {
  formulaire.reset();
  formulaire.hidden = false;
  confirmation.hidden = true;
  document.querySelector('.step-progress').hidden = false;
  dateChoisie = null;
  heureChoisie = null;
  etapeCourante = 0;
  etapes.forEach((etape, index) => {
    etape.hidden = index !== 0;
    etape.inert = index !== 0;
  });
  radiosPrestation.forEach((radio) => { radio.checked = false; });
  champPrenom.removeAttribute('aria-invalid');
  champTelephone.removeAttribute('aria-invalid');
  document.querySelector('#erreur-prenom').hidden = true;
  document.querySelector('#erreur-telephone').hidden = true;
  cacherErreur('prestation');
  cacherErreur('jour');
  cacherErreur('heure');
  miseAJourProgression();
  miseAJourResume();
  annoncer('Simulation réinitialisée. Étape 1 sur 4. Quelle prestation ?');
  etapes[0].querySelector('h3').focus();
});

remplirJours();
miseAJourProgression();
miseAJourResume();
