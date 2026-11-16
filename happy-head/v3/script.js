(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const heures = {
    0: null,
    1: null,
    2: { debut: 9 * 60, fin: 18 * 60 + 30 },
    3: { debut: 9 * 60, fin: 18 * 60 + 30 },
    4: { debut: 9 * 60, fin: 18 * 60 + 30 },
    5: { debut: 9 * 60, fin: 18 * 60 + 30 },
    6: { debut: 8 * 60 + 30, fin: 17 * 60 }
  };

  const prestations = {
    homme: 'Coupe homme — Manu',
    coloration: 'Techniques de coloration — Sonia et Amandine',
    femme: 'Coupes femme — Sonia et Amandine'
  };

  const etat = { prestation: '', jour: null, heure: '' };
  const formulaire = document.querySelector('#formulaire-rendez-vous');
  const etapes = [...document.querySelectorAll('.booking-step')];
  const progression = [...document.querySelectorAll('[data-progress]')];
  const annonce = document.querySelector('#annonce-rendez-vous');
  const choixJours = document.querySelector('#choix-jours');
  const choixHeures = document.querySelector('#choix-heures');
  const confirmation = document.querySelector('#confirmation-rendez-vous');
  const champs = {
    prestation: document.querySelector('#erreur-prestation'),
    jour: document.querySelector('#erreur-jour'),
    heure: document.querySelector('#erreur-heure'),
    prenom: document.querySelector('#erreur-prenom'),
    telephone: document.querySelector('#erreur-telephone')
  };

  let etapeCourante = 1;
  let dateChoisie = null;

  function capitale(texte) {
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  }

  function dateLocale(date, options) {
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  function dateIsoLocale(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function heureTexte(minutes) {
    const heuresEntieres = Math.floor(minutes / 60);
    const minutesRestantes = minutes % 60;
    return `${String(heuresEntieres).padStart(2, '0')} h ${String(minutesRestantes).padStart(2, '0')}`;
  }

  function mettreAJourSelection() {
    document.querySelector('#recap-prestation').textContent = prestations[etat.prestation] || 'À choisir';
    document.querySelector('#recap-jour').textContent = etat.jour ? capitale(dateLocale(etat.jour, { weekday: 'long', day: 'numeric', month: 'long' })) : 'À choisir';
    document.querySelector('#recap-heure').textContent = etat.heure || 'À choisir';
  }

  function effacerErreur(nom) {
    const erreur = champs[nom];
    if (erreur) erreur.hidden = true;
    if (nom === 'prenom') document.querySelector('#prenom').removeAttribute('aria-invalid');
    if (nom === 'telephone') document.querySelector('#telephone').removeAttribute('aria-invalid');
  }

  function afficherErreur(nom) {
    const erreur = champs[nom];
    if (erreur) erreur.hidden = false;
    if (nom === 'prestation') document.querySelector('input[name="prestation"]').focus();
    if (nom === 'jour') choixJours.querySelector('button:not(:disabled)')?.focus();
    if (nom === 'heure') choixHeures.querySelector('button:not(:disabled)')?.focus();
    if (nom === 'prenom') document.querySelector('#prenom').focus();
    if (nom === 'telephone') document.querySelector('#telephone').focus();
  }

  function mettreAJourProgression(numero) {
    progression.forEach((element) => {
      if (Number(element.dataset.progress) === numero) element.setAttribute('aria-current', 'step');
      else element.removeAttribute('aria-current');
    });
  }

  function afficherEtape(numero) {
    etapeCourante = numero;
    const cible = etapes.find((element) => Number(element.dataset.etape) === numero);
    if (!cible) return;

    confirmation.hidden = true;
    etapes.forEach((element) => {
      if (element === cible) {
        element.hidden = false;
        element.classList.remove('etape-visible');
        requestAnimationFrame(() => element.classList.add('etape-visible'));
      } else {
        element.hidden = true;
        element.classList.remove('etape-visible');
      }
    });

    mettreAJourProgression(numero);
    annonce.textContent = `Étape ${numero} sur 4 : ${cible.querySelector('h3').textContent.replace(/[? ]/g, '').trim()}.`;
    cible.querySelector('h3').focus({ preventScroll: true });
  }

  function creerChoixJour(date) {
    const jourSemaine = date.getDay();
    const ouvert = heures[jourSemaine] !== null;
    const bouton = document.createElement('button');
    const nomJour = capitale(dateLocale(date, { weekday: 'short' }).replace('.', ''));
    const nomDate = dateLocale(date, { day: 'numeric', month: 'short' }).replace('.', '');
    bouton.className = 'date-choice';
    bouton.type = 'button';
    bouton.disabled = !ouvert;
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', ouvert ? `${nomJour} ${nomDate}` : `${nomJour} ${nomDate}, fermé`);
    bouton.innerHTML = `<span>${nomJour}</span><small>${nomDate}${ouvert ? '' : ' · Fermé'}</small>`;

    bouton.addEventListener('click', () => {
      dateChoisie = date;
      etat.jour = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      etat.heure = '';
      choixJours.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
      bouton.setAttribute('aria-pressed', 'true');
      effacerErreur('jour');
      effacerErreur('heure');
      creerChoixHeure(date);
      mettreAJourSelection();
      annonce.textContent = `Jour choisi : ${capitale(dateLocale(date, { weekday: 'long', day: 'numeric', month: 'long' }))}.`;
    });

    return bouton;
  }

  function creerCalendrier() {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const fragments = document.createDocumentFragment();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdHui);
      date.setDate(aujourdHui.getDate() + decalage);
      fragments.append(creerChoixJour(date));
    }

    choixJours.replaceChildren(fragments);
  }

  function creerChoixHeure(date) {
    const horaire = heures[date.getDay()];
    const fragments = document.createDocumentFragment();
    const maintenant = new Date();
    const memeJour = dateIsoLocale(date) === dateIsoLocale(maintenant);
    const minutesActuelles = maintenant.getHours() * 60 + maintenant.getMinutes();

    if (!horaire) {
      choixHeures.innerHTML = '<p>Le salon est fermé ce jour-là.</p>';
      return;
    }

    for (let minutes = horaire.debut; minutes < horaire.fin; minutes += 60) {
      const bouton = document.createElement('button');
      const texteHeure = heureTexte(minutes);
      const estPassee = memeJour && minutes <= minutesActuelles;
      bouton.className = 'time-choice';
      bouton.type = 'button';
      bouton.textContent = estPassee ? `${texteHeure} · Passée` : texteHeure;
      bouton.disabled = estPassee;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', estPassee ? `${texteHeure}, heure passée` : `${texteHeure}, heure souhaitée`);
      bouton.addEventListener('click', () => {
        etat.heure = texteHeure;
        choixHeures.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        effacerErreur('heure');
        mettreAJourSelection();
        annonce.textContent = `Heure souhaitée : ${texteHeure}.`;
      });
      fragments.append(bouton);
    }

    choixHeures.replaceChildren(fragments);
  }

  function numeroFrancaisValide(valeur) {
    const nettoye = valeur.trim().replace(/[\s().-]/g, '');
    return /^(?:(?:\+|00)33|0)[1-9]\d{8}$/.test(nettoye);
  }

  function verifierEtapeCourante() {
    if (etapeCourante === 1 && !etat.prestation) {
      afficherErreur('prestation');
      return false;
    }
    if (etapeCourante === 2 && !etat.jour) {
      afficherErreur('jour');
      return false;
    }
    if (etapeCourante === 3 && !etat.heure) {
      afficherErreur('heure');
      return false;
    }
    return true;
  }

  function mettreEnPlaceMenu() {
    const bouton = document.querySelector('.menu-toggle');
    const navigation = document.querySelector('#navigation-principale');
    bouton.hidden = false;

    const fermer = (rendreFocus = false) => {
      bouton.setAttribute('aria-expanded', 'false');
      bouton.querySelector('span').textContent = '＋';
      navigation.classList.remove('ouvert');
      if (rendreFocus) bouton.focus();
    };

    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-expanded') === 'true';
      bouton.setAttribute('aria-expanded', String(!ouvert));
      bouton.querySelector('span').textContent = ouvert ? '＋' : '−';
      navigation.classList.toggle('ouvert', !ouvert);
      if (!ouvert) navigation.querySelector('a')?.focus();
    });

    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermer(false);
    });

    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermer(true);
    });
  }

  function mettreEnPlaceRevelations() {
    const elements = [...document.querySelectorAll('[data-reveal]')];
    const panneauxRoles = [...document.querySelectorAll('.role-panel[data-reveal]')];
    panneauxRoles.forEach((element, index) => { element.style.transitionDelay = `${index * 60}ms`; });

    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('revele'));
      return;
    }

    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('revele');
          instance.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    elements.forEach((element) => observateur.observe(element));
  }

  function preparerCompteurs() {
    document.querySelectorAll('[data-compte]').forEach((element) => {
      const valeur = String(element.dataset.compte).padStart(2, '0');
      const defilement = document.createElement('span');
      const depart = document.createElement('span');
      const arrivee = document.createElement('span');
      defilement.className = 'numero-defile';
      depart.textContent = '00';
      arrivee.textContent = valeur;
      defilement.append(depart, arrivee);
      element.replaceChildren(defilement);
    });
  }

  function animerEntree() {
    const cadre = document.querySelector('.hero-frame');
    requestAnimationFrame(() => requestAnimationFrame(() => cadre.classList.add('entree-terminee')));
  }

  document.querySelectorAll('input[name="prestation"]').forEach((champ) => {
    champ.addEventListener('change', () => {
      etat.prestation = champ.value;
      effacerErreur('prestation');
      mettreAJourSelection();
      annonce.textContent = `Prestation choisie : ${prestations[etat.prestation]}.`;
    });
  });

  document.querySelectorAll('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const valeur = lien.dataset.prestation;
      const champ = document.querySelector(`input[name="prestation"][value="${valeur}"]`);
      if (!champ) return;
      champ.checked = true;
      champ.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  document.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (verifierEtapeCourante()) afficherEtape(etapeCourante + 1);
    });
  });

  document.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(etapeCourante - 1));
  });

  document.querySelector('#prenom').addEventListener('input', () => effacerErreur('prenom'));
  document.querySelector('#telephone').addEventListener('input', () => effacerErreur('telephone'));

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = document.querySelector('#prenom').value.trim();
    const telephone = document.querySelector('#telephone').value.trim();
    let valide = true;

    if (!prenom) {
      document.querySelector('#prenom').setAttribute('aria-invalid', 'true');
      afficherErreur('prenom');
      valide = false;
    }
    if (!numeroFrancaisValide(telephone)) {
      document.querySelector('#telephone').setAttribute('aria-invalid', 'true');
      afficherErreur('telephone');
      valide = false;
    }
    if (!valide) return;

    etapes.forEach((element) => { element.hidden = true; });
    confirmation.hidden = false;
    confirmation.classList.remove('etape-visible');
    requestAnimationFrame(() => confirmation.classList.add('etape-visible'));
    mettreAJourProgression(4);
    document.querySelector('#texte-confirmation').textContent = `${prenom}, votre demande de ${prestations[etat.prestation]} pour le ${capitale(dateLocale(dateChoisie, { weekday: 'long', day: 'numeric', month: 'long' }))} à ${etat.heure} est récapitulée ici.`;
    annonce.textContent = 'Simulation terminée. Aucune demande n’a été envoyée.';
    document.querySelector('#titre-confirmation').focus({ preventScroll: true });
  });

  document.querySelector('#recommencer').addEventListener('click', () => {
    etat.prestation = '';
    etat.jour = null;
    etat.heure = '';
    dateChoisie = null;
    formulaire.reset();
    document.querySelector('#prenom').removeAttribute('aria-invalid');
    document.querySelector('#telephone').removeAttribute('aria-invalid');
    Object.keys(champs).forEach(effacerErreur);
    choixJours.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
    choixHeures.replaceChildren(document.createTextNode('Choisissez d’abord un jour ouvert.'));
    mettreAJourSelection();
    afficherEtape(1);
  });

  mettreEnPlaceMenu();
  mettreAJourSelection();
  creerCalendrier();
  preparerCompteurs();
  mettreEnPlaceRevelations();
  animerEntree();
})();
