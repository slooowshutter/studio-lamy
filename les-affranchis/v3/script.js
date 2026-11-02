(() => {
  'use strict';

  const racine = document.documentElement;
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  racine.classList.add('js');

  const menu = document.querySelector('#navigation');
  const boutonMenu = document.querySelector('.menu-toggle');
  const estLarge = window.matchMedia('(min-width: 800px)');

  function fermerMenu(rendreLaMain = false) {
    if (!menu || !boutonMenu) return;
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
    if (!estLarge.matches) menu.hidden = true;
    if (rendreLaMain) boutonMenu.focus();
  }

  function reglerNavigation() {
    if (!menu || !boutonMenu) return;
    if (estLarge.matches) {
      menu.hidden = false;
      boutonMenu.setAttribute('aria-expanded', 'false');
    } else if (boutonMenu.getAttribute('aria-expanded') !== 'true') {
      menu.hidden = true;
    }
  }

  if (menu && boutonMenu) {
    reglerNavigation();
    boutonMenu.addEventListener('click', () => {
      const ouvrir = boutonMenu.getAttribute('aria-expanded') !== 'true';
      boutonMenu.setAttribute('aria-expanded', String(ouvrir));
      boutonMenu.setAttribute('aria-label', ouvrir ? 'Fermer la navigation' : 'Ouvrir la navigation');
      menu.hidden = !ouvrir && !estLarge.matches;
      if (ouvrir && !estLarge.matches) {
        const premierLien = menu.querySelector('a');
        if (premierLien) premierLien.focus();
      }
    });
    menu.addEventListener('click', (event) => {
      const lien = event.target.closest('a[href^="#"]');
      if (!lien || estLarge.matches) return;
      const destination = document.querySelector(lien.getAttribute('href'));
      fermerMenu(false);
      if (destination) {
        const cible = destination.matches('h1, h2, h3') ? destination : destination.querySelector('h1, h2, h3');
        if (cible) {
          cible.setAttribute('tabindex', '-1');
          window.setTimeout(() => cible.focus({ preventScroll: true }), 0);
        }
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true' && !estLarge.matches) {
        event.preventDefault();
        fermerMenu(true);
      }
    });
    estLarge.addEventListener('change', reglerNavigation);
  }

  requestAnimationFrame(() => racine.classList.add('is-ready'));

  const revelables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduireMouvement.matches) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
    revelables.forEach((element) => observateurRevelation.observe(element));
  } else {
    revelables.forEach((element) => element.classList.add('is-visible'));
  }

  const barreMobile = document.querySelector('.mobile-bar');
  const lienHero = document.querySelector('.hero__link');
  const reservation = document.querySelector('#reserver');
  const pied = document.querySelector('.site-footer');
  if (barreMobile && lienHero && reservation && pied && 'IntersectionObserver' in window) {
    const presence = { hero: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      const visible = !presence.hero && !presence.reservation && !presence.pied;
      barreMobile.classList.toggle('is-visible', visible);
      barreMobile.setAttribute('aria-hidden', String(!visible));
      barreMobile.inert = !visible;
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === lienHero) presence.hero = entree.isIntersecting;
        if (entree.target === reservation) presence.reservation = entree.isIntersecting;
        if (entree.target === pied) presence.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.08 });
    observateurBarre.observe(lienHero);
    observateurBarre.observe(reservation);
    observateurBarre.observe(pied);
  }

  const formulaire = document.querySelector('#formulaire');
  if (!formulaire) return;

  const panneaux = [...formulaire.querySelectorAll('.booking-panel')];
  const boutonsEtape = [...document.querySelectorAll('.booking-steps [data-etape]')];
  const selectionTexte = document.querySelector('#selection-texte');
  const annonceEtape = document.querySelector('#annonce-etape');
  const listeJours = document.querySelector('#liste-jours');
  const listeHeures = document.querySelector('#liste-heures');
  const confirmation = document.querySelector('#confirmation');
  const texteConfirmation = document.querySelector('#texte-confirmation');
  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const etiquetteEtapes = ['prestation', 'jour', 'heure', 'coordonnées'];
  const horaires = {
    0: [14, 21],
    1: [10, 19],
    2: [10, 20],
    3: [10, 21],
    4: [10, 20],
    5: [10, 21],
    6: [10, 21]
  };
  const etat = { etape: 1, etapeMax: 1, prestation: '', jour: '', heure: '', indiceJour: 0 };

  const formatDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
  const formatJourCourt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', timeZone: 'UTC'
  });

  function dateParisAujourdHui() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeur = (type) => morceaux.find((partie) => partie.type === type).value;
    return new Date(Date.UTC(Number(valeur('year')), Number(valeur('month')) - 1, Number(valeur('day'))));
  }

  function dateISO(date) {
    const annee = date.getUTCFullYear();
    const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
    const jour = String(date.getUTCDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function formaterHeure(heure) {
    return `${String(heure).padStart(2, '0')} h`;
  }

  function dateChoisie() {
    if (!etat.jour) return null;
    const [annee, mois, jour] = etat.jour.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour));
  }

  function mettreAJourSelection() {
    const morceaux = [];
    if (etat.prestation) morceaux.push(etat.prestation);
    const date = dateChoisie();
    if (date) morceaux.push(formatDate.format(date));
    if (etat.heure) morceaux.push(formaterHeure(Number(etat.heure.split(':')[0])));
    selectionTexte.textContent = morceaux.length ? morceaux.join(' · ') : 'Rien choisi pour le moment.';
  }

  function effacerErreur(identifiant) {
    const erreur = document.querySelector(`#${identifiant}`);
    if (erreur) erreur.hidden = true;
  }

  function genererJours() {
    if (!listeJours) return;
    const aujourdHui = dateParisAujourdHui();
    const jours = [];
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(aujourdHui);
      date.setUTCDate(aujourdHui.getUTCDate() + index);
      const iso = dateISO(date);
      const semaine = date.getUTCDay();
      const heures = horaires[semaine];
      const ferme = !heures;
      const jourCourt = formatJourCourt.format(date).replace('.', '');
      const jourLong = formatDate.format(date);
      const libelle = index === 0 ? `Aujourd’hui, ${jourLong}` : jourLong;
      jours.push(`<div class="date-choice">
        <input id="jour-${iso}" type="radio" name="jour" value="${iso}" aria-label="${libelle}${ferme ? ', fermé' : ''}"${ferme ? ' disabled' : ''}>
        <label for="jour-${iso}"><span>${index === 0 ? 'Aujourd’hui' : jourCourt}</span><span class="date-choice__day">${date.getUTCDate()}</span><time datetime="${iso}">${date.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '')}</time>${ferme ? '<span>fermé</span>' : ''}</label>
      </div>`);
    }
    listeJours.innerHTML = jours.join('');
  }

  function minutesAParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const heure = Number(morceaux.find((partie) => partie.type === 'hour').value);
    const minute = Number(morceaux.find((partie) => partie.type === 'minute').value);
    return heure * 60 + minute;
  }

  function genererHeures() {
    if (!listeHeures || !etat.jour) return;
    const date = dateChoisie();
    const jourSemaine = date.getUTCDay();
    const heures = horaires[jourSemaine];
    if (!heures) {
      listeHeures.innerHTML = '<p>Aucun horaire publié pour ce jour. À confirmer avec le salon.</p>';
      return;
    }
    const [ouverture, fermeture] = heures;
    const aujourdHui = dateISO(dateParisAujourdHui()) === etat.jour;
    const maintenant = minutesAParis();
    const choix = [];
    for (let heure = ouverture; heure < fermeture; heure += 1) {
      const dejaPasse = aujourdHui && heure * 60 <= maintenant;
      const prisDansLaDemo = ((etat.indiceJour + 1) * 13 + heure * 7) % 6 === 0;
      const indisponible = dejaPasse || prisDansLaDemo;
      const valeur = `${String(heure).padStart(2, '0')}:00`;
      const id = `heure-${etat.jour}-${heure}`;
      const libelle = formaterHeure(heure);
      const raison = dejaPasse ? 'heure déjà passée' : 'indisponible dans cette simulation';
      choix.push(`<div class="time-choice">
        <input id="${id}" type="radio" name="heure" value="${valeur}" aria-label="${libelle}${indisponible ? `, ${raison}` : ''}"${indisponible ? ' disabled' : ''}>
        <label for="${id}">${libelle}</label>
      </div>`);
    }
    listeHeures.innerHTML = choix.length ? choix.join('') : '<p>Aucune heure future dans cette démonstration.</p>';
    const aide = document.createElement('p');
    aide.className = 'time-list__note';
    aide.textContent = 'Les heures grisées illustrent une indisponibilité fictive.';
    listeHeures.append(aide);
  }

  function afficherEtape(numero) {
    const precedente = etat.etape;
    etat.etape = numero;
    etat.etapeMax = Math.max(etat.etapeMax, numero);
    panneaux.forEach((panneau) => {
      const active = Number(panneau.dataset.panneau) === numero;
      panneau.hidden = false;
      panneau.classList.toggle('is-active', active);
      panneau.setAttribute('aria-hidden', String(!active));
      panneau.inert = !active;
    });
    boutonsEtape.forEach((bouton) => {
      const etape = Number(bouton.dataset.etape);
      if (etape === numero) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      bouton.disabled = etape > etat.etapeMax;
    });
    if (numero === 2 && listeJours && !listeJours.childElementCount) genererJours();
    if (numero === 3) genererHeures();
    annonceEtape.textContent = `Étape ${numero} sur 4 — ${etiquetteEtapes[numero - 1]}.`;
    mettreAJourSelection();
    const titre = panneaux[numero - 1].querySelector('h3');
    if (titre && numero !== precedente) requestAnimationFrame(() => titre.focus({ preventScroll: true }));
  }

  function suivant() {
    if (etat.etape === 1) {
      if (!etat.prestation) {
        document.querySelector('#erreur-prestation').hidden = false;
        document.querySelector('input[name="prestation"]').focus();
        return;
      }
      effacerErreur('erreur-prestation');
      afficherEtape(2);
      return;
    }
    if (etat.etape === 2) {
      if (!etat.jour) {
        document.querySelector('#erreur-jour').hidden = false;
        const premierJour = document.querySelector('input[name="jour"]:not(:disabled)');
        if (premierJour) premierJour.focus();
        return;
      }
      effacerErreur('erreur-jour');
      afficherEtape(3);
      return;
    }
    if (etat.etape === 3) {
      if (!etat.heure) {
        document.querySelector('#erreur-heure').hidden = false;
        const premiereHeure = document.querySelector('input[name="heure"]:not(:disabled)');
        if (premiereHeure) premiereHeure.focus();
        return;
      }
      effacerErreur('erreur-heure');
      afficherEtape(4);
    }
  }

  function mobileValide(valeur) {
    const nettoye = valeur.replace(/[\s.\u00a0-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(nettoye);
  }

  function validerCoordonnees() {
    const nomValide = prenom.value.trim().length >= 2;
    const telValide = mobileValide(telephone.value.trim());
    document.querySelector('#erreur-prenom').hidden = nomValide;
    document.querySelector('#erreur-telephone').hidden = telValide;
    prenom.setAttribute('aria-invalid', String(!nomValide));
    telephone.setAttribute('aria-invalid', String(!telValide));
    const erreurGenerale = document.querySelector('#erreur-coordonnees');
    erreurGenerale.hidden = nomValide && telValide;
    if (!nomValide) prenom.focus();
    else if (!telValide) telephone.focus();
    return nomValide && telValide;
  }

  function terminerSimulation() {
    const date = dateChoisie();
    const heure = Number(etat.heure.split(':')[0]);
    texteConfirmation.textContent = `${etat.prestation} · ${formatDate.format(date)} à ${formaterHeure(heure)}. Rien n’a été transmis au salon. Pour confirmer un vrai rendez-vous, utilisez Planity.`;
    confirmation.hidden = false;
    document.querySelector('.booking-success__title').setAttribute('tabindex', '-1');
    document.querySelector('.booking-success__title').focus({ preventScroll: true });
    annonceEtape.textContent = 'Simulation terminée. Rien n’a été envoyé.';
  }

  function recommencer() {
    formulaire.reset();
    Object.assign(etat, { etape: 1, etapeMax: 1, prestation: '', jour: '', heure: '', indiceJour: 0 });
    confirmation.hidden = true;
    document.querySelector('#erreur-prestation').hidden = true;
    document.querySelector('#erreur-jour').hidden = true;
    document.querySelector('#erreur-heure').hidden = true;
    document.querySelector('#erreur-prenom').hidden = true;
    document.querySelector('#erreur-telephone').hidden = true;
    document.querySelector('#erreur-coordonnees').hidden = true;
    prenom.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');
    afficherEtape(1);
    const titre = document.querySelector('#titre-etape-1');
    titre.focus({ preventScroll: true });
  }

  panneaux.forEach((panneau, index) => {
    panneau.hidden = false;
    const active = index === 0;
    panneau.classList.toggle('is-active', active);
    panneau.setAttribute('aria-hidden', String(!active));
    panneau.inert = !active;
  });
  genererJours();
  mettreAJourSelection();

  formulaire.addEventListener('change', (event) => {
    if (event.target.name === 'prestation') {
      etat.prestation = event.target.value;
      effacerErreur('erreur-prestation');
      mettreAJourSelection();
    }
    if (event.target.name === 'jour') {
      etat.jour = event.target.value;
      etat.indiceJour = [...listeJours.querySelectorAll('input[name="jour"]')].findIndex((input) => input.value === etat.jour);
      etat.heure = '';
      effacerErreur('erreur-jour');
      mettreAJourSelection();
    }
    if (event.target.name === 'heure') {
      etat.heure = event.target.value;
      effacerErreur('erreur-heure');
      mettreAJourSelection();
    }
  });

  formulaire.addEventListener('click', (event) => {
    if (event.target.closest('[data-suivant]')) suivant();
    if (event.target.closest('[data-precedent]')) afficherEtape(Math.max(1, etat.etape - 1));
  });

  boutonsEtape.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.etape);
      if (numero <= etat.etapeMax) afficherEtape(numero);
    });
  });

  formulaire.addEventListener('submit', (event) => {
    event.preventDefault();
    if (etat.etape !== 4 || !validerCoordonnees()) return;
    terminerSimulation();
  });

  formulaire.addEventListener('click', (event) => {
    if (event.target.closest('[data-recommencer]')) recommencer();
  });
})();
