document.addEventListener('DOMContentLoaded', () => {
  const prefereReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('entree-terminee')));

  const elementsReveles = document.querySelectorAll('[data-apparition], .trace-rue');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, observateurActif) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-apparu');
          observateurActif.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    elementsReveles.forEach((element) => observateur.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('est-apparu'));
  }

  const boutonMenu = document.querySelector('.bouton-menu');
  const navigation = document.querySelector('#navigation-principale');
  const texteMenu = document.querySelector('.bouton-menu__texte');
  const navigationPetite = window.matchMedia('(max-width: 680px)');
  let navigationOuverte = false;

  function reglerNavigation(ouverte, rendreFocus = false) {
    navigationOuverte = navigationPetite.matches && ouverte;
    if (navigationPetite.matches) {
      navigation.toggleAttribute('inert', !navigationOuverte);
      navigation.setAttribute('aria-hidden', String(!navigationOuverte));
      if (navigationOuverte) navigation.setAttribute('data-ouvert', 'oui');
      else navigation.removeAttribute('data-ouvert');
      boutonMenu.setAttribute('aria-expanded', String(navigationOuverte));
      boutonMenu.setAttribute('aria-label', navigationOuverte ? 'Fermer la navigation' : 'Ouvrir la navigation');
      texteMenu.textContent = navigationOuverte ? 'Fermer' : 'Navigation';
      if (rendreFocus && navigationOuverte) navigation.querySelector('a')?.focus();
    } else {
      navigation.removeAttribute('inert');
      navigation.removeAttribute('aria-hidden');
      navigation.removeAttribute('data-ouvert');
      boutonMenu.setAttribute('aria-expanded', 'false');
      boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
      texteMenu.textContent = 'Navigation';
    }
  }

  if (boutonMenu && navigation) {
    reglerNavigation(false);
    boutonMenu.addEventListener('click', () => reglerNavigation(!navigationOuverte, true));
    navigation.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) reglerNavigation(false);
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && navigationOuverte) {
        reglerNavigation(false);
        boutonMenu.focus();
      }
    });
    navigationPetite.addEventListener('change', () => reglerNavigation(false));
  }

  const barreMobile = document.querySelector('#barre-mobile');
  const actionsHero = document.querySelector('.hero__actions');
  const reservation = document.querySelector('#reserver');
  const piedPage = document.querySelector('#pied-page');
  if ('IntersectionObserver' in window && barreMobile && actionsHero && reservation && piedPage) {
    let actionsHeroVisibles = true;
    let reservationVisible = false;
    let piedPageVisible = false;
    const actualiserBarre = () => {
      const afficher = navigationPetite.matches && !actionsHeroVisibles && !reservationVisible && !piedPageVisible;
      if (afficher) barreMobile.setAttribute('data-visible', 'oui');
      else barreMobile.removeAttribute('data-visible');
      barreMobile.toggleAttribute('inert', !afficher);
      barreMobile.setAttribute('aria-hidden', String(!afficher));
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === actionsHero) actionsHeroVisibles = entree.isIntersecting;
        if (entree.target === reservation) reservationVisible = entree.isIntersecting;
        if (entree.target === piedPage) piedPageVisible = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.04 });
    observateurBarre.observe(actionsHero);
    observateurBarre.observe(reservation);
    observateurBarre.observe(piedPage);
    navigationPetite.addEventListener('change', actualiserBarre);
  }

  const prestations = {
    'coupe-homme': { nom: 'Coupe Homme', duree: 15 },
    'brushing-court': { nom: 'Coupe + Brushing court', duree: 30 },
    coloration: { nom: 'Coloration Coupe Brushing', duree: 90 }
  };
  const horaires = {
    0: null,
    1: { ouverture: '10:00', fermeture: '18:00' },
    2: { ouverture: '09:00', fermeture: '19:00' },
    3: { ouverture: '09:00', fermeture: '19:00' },
    4: { ouverture: '09:00', fermeture: '17:00' },
    5: { ouverture: '09:00', fermeture: '19:00' },
    6: { ouverture: '09:00', fermeture: '18:00' }
  };
  const formulaire = document.querySelector('#formulaire-reservation');
  const etapes = [...document.querySelectorAll('.etape-reservation')];
  const confirmation = document.querySelector('#confirmation');
  const boutonsProgression = [...document.querySelectorAll('[data-aller-etape]')];
  const erreurEtape = document.querySelector('#erreur-etape');
  const annonceEtape = document.querySelector('#annonce-etape');
  const recapPrestation = document.querySelector('#recap-prestation');
  const recapJour = document.querySelector('#recap-jour');
  const recapHeure = document.querySelector('#recap-heure');
  const joursConteneur = document.querySelector('#choix-jours');
  const heuresConteneur = document.querySelector('#choix-heures');
  const aucunCreneau = document.querySelector('#aucun-creneau');
  const prenom = document.querySelector('#prenom');
  const telephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');

  let etapeActive = 0;
  let etapeAccessible = 0;
  let changementEnCours = false;
  let prestationChoisie = '';
  let jourChoisi = null;
  let heureChoisie = '';
  let joursProposes = [];

  function partiesHeureParis(date = new Date()) {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return {
      heure: Number(parties.find((partie) => partie.type === 'hour').value),
      minute: Number(parties.find((partie) => partie.type === 'minute').value)
    };
  }

  function dateParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const annee = Number(parties.find((partie) => partie.type === 'year').value);
    const mois = Number(parties.find((partie) => partie.type === 'month').value);
    const jour = Number(parties.find((partie) => partie.type === 'day').value);
    return new Date(annee, mois - 1, jour, 12);
  }

  function minutesDepuisMinuit(heure) {
    const [heures, minutes] = heure.split(':').map(Number);
    return heures * 60 + minutes;
  }

  function texteHeure(minutes) {
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const reste = String(minutes % 60).padStart(2, '0');
    return `${heures}\u00a0h\u00a0${reste}`;
  }

  function nomJour(date, format = 'long') {
    return new Intl.DateTimeFormat('fr-FR', { weekday: format }).format(date);
  }

  function libelleJour(offset, date) {
    if (offset === 0) return 'Aujourd’hui';
    if (offset === 1) return 'Demain';
    return `Dans ${offset} jours`;
  }

  function mettreAJourResume() {
    recapPrestation.textContent = prestations[prestationChoisie]?.nom ?? 'À choisir';
    recapJour.textContent = jourChoisi ? `${jourChoisi.libelle} · ${jourChoisi.jourNom}` : 'À choisir';
    recapHeure.textContent = heureChoisie || 'À choisir';
  }

  function reglerProgression() {
    boutonsProgression.forEach((bouton, indice) => {
      bouton.disabled = indice > etapeAccessible;
      if (indice === etapeActive) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function effacerErreurEtape() {
    erreurEtape.textContent = '';
    erreurEtape.hidden = true;
  }

  function afficherErreurEtape(texte) {
    erreurEtape.textContent = texte;
    erreurEtape.hidden = false;
  }

  function afficherEtape(indice, { focus = true } = {}) {
    if (changementEnCours || indice < 0 || indice > etapeAccessible || !etapes[indice]) return;
    if (indice === etapeActive) return;
    changementEnCours = true;
    const ancienneEtape = etapes[etapeActive];
    ancienneEtape.dataset.phase = 'sortie';
    effacerErreurEtape();
    const delai = prefereReduit ? 0 : 190;
    window.setTimeout(() => {
      ancienneEtape.hidden = true;
      ancienneEtape.removeAttribute('data-phase');
      etapeActive = indice;
      const nouvelleEtape = etapes[indice];
      nouvelleEtape.hidden = false;
      nouvelleEtape.dataset.phase = 'entree';
      requestAnimationFrame(() => nouvelleEtape.removeAttribute('data-phase'));
      annonceEtape.textContent = `Étape ${indice + 1} sur 4 : ${nouvelleEtape.querySelector('h3').textContent}.`;
      reglerProgression();
      if (focus) nouvelleEtape.querySelector('h3').focus();
      changementEnCours = false;
    }, delai);
  }

  function creerJours() {
    const aujourdHui = dateParis();
    joursProposes = [];
    joursConteneur.replaceChildren();
    for (let decalage = 0; decalage < 12; decalage += 1) {
      const date = new Date(aujourdHui);
      date.setDate(aujourdHui.getDate() + decalage);
      const jourSemaine = date.getDay();
      const horaire = horaires[jourSemaine];
      const bouton = document.createElement('button');
      const principal = document.createElement('strong');
      const secondaire = document.createElement('small');
      bouton.type = 'button';
      bouton.className = 'choix-jour';
      bouton.dataset.decalage = String(decalage);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${libelleJour(decalage, date)}, ${nomJour(date)}${horaire ? '' : ', fermé'}`);
      principal.textContent = libelleJour(decalage, date);
      secondaire.textContent = nomJour(date, 'short');
      bouton.append(principal, secondaire);
      if (!horaire) {
        bouton.disabled = true;
        const etat = document.createElement('small');
        etat.className = 'choix-jour__ferme';
        etat.textContent = 'Fermé';
        bouton.append(etat);
      }
      bouton.addEventListener('click', () => choisirJour(decalage));
      joursConteneur.append(bouton);
      joursProposes.push({ decalage, date, jourSemaine, horaire, libelle: libelleJour(decalage, date), jourNom: nomJour(date) });
    }
  }

  function choisirJour(decalage) {
    const jour = joursProposes.find((proposition) => proposition.decalage === decalage);
    if (!jour || !jour.horaire) return;
    jourChoisi = jour;
    heureChoisie = '';
    etapeAccessible = Math.min(etapeAccessible, 2);
    joursConteneur.querySelectorAll('.choix-jour').forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(Number(bouton.dataset.decalage) === decalage));
    });
    recapHeure.textContent = 'À choisir';
    creerHeures();
    mettreAJourResume();
    reglerProgression();
    effacerErreurEtape();
  }

  function creerHeures() {
    heuresConteneur.replaceChildren();
    aucunCreneau.hidden = true;
    const service = prestations[prestationChoisie];
    const horaire = jourChoisi?.horaire;
    if (!service || !horaire) return;

    const debut = minutesDepuisMinuit(horaire.ouverture);
    const fin = minutesDepuisMinuit(horaire.fermeture);
    const maintenant = partiesHeureParis();
    const minuteActuelle = maintenant.heure * 60 + maintenant.minute;
    let nombre = 0;

    for (let debutCreneau = debut; debutCreneau + service.duree <= fin; debutCreneau += 30) {
      if (jourChoisi.decalage === 0 && debutCreneau <= minuteActuelle) continue;
      const bouton = document.createElement('button');
      const texte = document.createElement('strong');
      bouton.type = 'button';
      bouton.className = 'choix-heure';
      bouton.dataset.minute = String(debutCreneau);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `Choisir ${texteHeure(debutCreneau)}`);
      texte.textContent = texteHeure(debutCreneau);
      bouton.append(texte);
      bouton.addEventListener('click', () => {
        heureChoisie = texteHeure(debutCreneau);
        etapeAccessible = Math.max(etapeAccessible, 3);
        heuresConteneur.querySelectorAll('.choix-heure').forEach((autre) => {
          autre.setAttribute('aria-pressed', String(autre === bouton));
        });
        mettreAJourResume();
        reglerProgression();
        effacerErreurEtape();
      });
      heuresConteneur.append(bouton);
      nombre += 1;
    }
    aucunCreneau.hidden = nombre > 0;
  }

  function avancerEtape() {
    effacerErreurEtape();
    if (etapeActive === 0) {
      const selection = formulaire.querySelector('input[name="prestation"]:checked');
      if (!selection) {
        afficherErreurEtape('Choisissez une prestation pour continuer.');
        formulaire.querySelector('input[name="prestation"]')?.focus();
        return;
      }
      prestationChoisie = selection.value;
      etapeAccessible = Math.max(etapeAccessible, 1);
      creerJours();
      reglerProgression();
      afficherEtape(1);
      return;
    }
    if (etapeActive === 1) {
      if (!jourChoisi) {
        afficherErreurEtape('Choisissez un jour ouvert pour continuer.');
        joursConteneur.querySelector('button:not(:disabled)')?.focus();
        return;
      }
      etapeAccessible = Math.max(etapeAccessible, 2);
      creerHeures();
      reglerProgression();
      afficherEtape(2);
      return;
    }
    if (etapeActive === 2) {
      if (!heureChoisie) {
        afficherErreurEtape('Choisissez une heure de démonstration pour continuer.');
        heuresConteneur.querySelector('button')?.focus();
        return;
      }
      etapeAccessible = Math.max(etapeAccessible, 3);
      reglerProgression();
      afficherEtape(3);
    }
  }

  formulaire?.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) {
      const ancienChoix = prestationChoisie;
      prestationChoisie = evenement.target.value;
      if (ancienChoix && ancienChoix !== prestationChoisie) {
        jourChoisi = null;
        heureChoisie = '';
        etapeAccessible = Math.min(etapeAccessible, 1);
        recapJour.textContent = 'À choisir';
        recapHeure.textContent = 'À choisir';
        joursConteneur.replaceChildren();
        heuresConteneur.replaceChildren();
      }
      mettreAJourResume();
      reglerProgression();
      effacerErreurEtape();
    }
  });

  document.querySelectorAll('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', avancerEtape));
  document.querySelectorAll('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(etapeActive - 1)));
  boutonsProgression.forEach((bouton) => bouton.addEventListener('click', () => {
    const indice = Number(bouton.dataset.allerEtape);
    if (!bouton.disabled) afficherEtape(indice);
  }));

  document.querySelectorAll('[data-preselection]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const valeur = bouton.dataset.preselection;
      const radio = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('#reserver').scrollIntoView({ behavior: prefereReduit ? 'auto' : 'smooth', block: 'start' });
      if (etapeActive !== 0) afficherEtape(0, { focus: false });
    });
  });

  function telephoneMobileValide(valeur) {
    const nettoye = valeur.replace(/[\s().-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(nettoye);
  }

  formulaire?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etapeActive !== 3) return;
    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    let valide = true;
    if (!prenom.value.trim()) {
      erreurPrenom.textContent = 'Indiquez votre prénom.';
      valide = false;
    }
    if (!telephoneMobileValide(telephone.value.trim())) {
      erreurTelephone.textContent = 'Saisissez un numéro de téléphone mobile français valide.';
      valide = false;
    }
    if (!valide) {
      (erreurPrenom.textContent ? prenom : telephone).focus();
      return;
    }

    const recap = document.querySelector('#recap-confirmation');
    const prenomSaisi = prenom.value.trim();
    recap.textContent = `${prenomSaisi}, la simulation indique ${prestations[prestationChoisie].nom}, ${jourChoisi.libelle.toLowerCase()} (${jourChoisi.jourNom}) à ${heureChoisie}.`;
    etapes[etapeActive].hidden = true;
    confirmation.hidden = false;
    confirmation.dataset.phase = 'entree';
    requestAnimationFrame(() => confirmation.removeAttribute('data-phase'));
    annonceEtape.textContent = 'La simulation est terminée. Aucun rendez-vous n’a été transmis.';
    confirmation.querySelector('h3').focus();
  });

  document.querySelector('#recommencer')?.addEventListener('click', () => {
    formulaire.reset();
    prestationChoisie = '';
    jourChoisi = null;
    heureChoisie = '';
    etapeActive = 0;
    etapeAccessible = 0;
    etapes.forEach((etape, indice) => {
      etape.hidden = indice !== 0;
      etape.removeAttribute('data-phase');
    });
    confirmation.hidden = true;
    confirmation.removeAttribute('data-phase');
    joursConteneur.replaceChildren();
    heuresConteneur.replaceChildren();
    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    mettreAJourResume();
    reglerProgression();
    annonceEtape.textContent = 'Nouvelle simulation. Étape 1 sur 4 : choisir une prestation.';
    document.querySelector('#titre-etape-prestation').focus();
  });

  creerJours();
  mettreAJourResume();
  reglerProgression();
});
