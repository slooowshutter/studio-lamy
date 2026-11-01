(() => {
  const racine = document.documentElement;
  racine.classList.add('js');

  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entreesHero = [...document.querySelectorAll('.hero-entree')];
  requestAnimationFrame(() => entreesHero.forEach((element) => element.classList.add('is-visible')));

  const elementsReveles = [...document.querySelectorAll('[data-revelation]')];
  if (reduireMouvement || !('IntersectionObserver' in window)) {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  } else {
    const groupes = new Map();
    elementsReveles.forEach((element) => {
      const groupe = element.parentElement;
      const rang = groupes.get(groupe) || 0;
      groupes.set(groupe, rang + 1);
      element.style.transitionDelay = `${Math.min(rang * 55, 165)}ms`;
    });
    const observateur = new IntersectionObserver((entrees, observateurActif) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateurActif.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    elementsReveles.forEach((element) => observateur.observe(element));
  }

  const boutonMenu = document.querySelector('.bouton-menu');
  const menuMobile = document.querySelector('#navigation-mobile');
  const liensMenu = [...menuMobile.querySelectorAll('a')];
  const fermerMenu = (rendreFocus = false) => {
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.setAttribute('aria-label', 'Ouvrir le menu');
    menuMobile.hidden = true;
    if (rendreFocus) boutonMenu.focus();
  };
  boutonMenu.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    boutonMenu.setAttribute('aria-expanded', String(!ouvert));
    boutonMenu.setAttribute('aria-label', ouvert ? 'Ouvrir le menu' : 'Fermer le menu');
    menuMobile.hidden = ouvert;
    if (!ouvert) liensMenu[0].focus();
  });
  liensMenu.forEach((lien) => lien.addEventListener('click', () => {
    fermerMenu();
    const cible = document.querySelector(lien.getAttribute('href'));
    requestAnimationFrame(() => cible?.focus({ preventScroll: true }));
  }));
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
  });

  const barreMobile = document.querySelector('.barre-mobile');
  const declencheurBarre = document.querySelector('.hero__bas');
  const reservationSection = document.querySelector('#reserver');
  const piedPage = document.querySelector('.pied-de-page');
  if ('IntersectionObserver' in window) {
    const visibilite = { hero: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      const afficher = !visibilite.hero && !visibilite.reservation && !visibilite.pied;
      barreMobile.classList.toggle('est-visible', afficher);
      barreMobile.setAttribute('aria-hidden', String(!afficher));
      barreMobile.querySelectorAll('a').forEach((lien) => { lien.tabIndex = afficher ? 0 : -1; });
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === declencheurBarre) visibilite.hero = entree.isIntersecting;
        if (entree.target === reservationSection) visibilite.reservation = entree.isIntersecting;
        if (entree.target === piedPage) visibilite.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.04 });
    observateurBarre.observe(declencheurBarre);
    observateurBarre.observe(reservationSection);
    observateurBarre.observe(piedPage);
  } else {
    barreMobile.classList.add('est-visible');
  }

  const formulaire = document.querySelector('#formulaire-reservation');
  const panneaux = [...formulaire.querySelectorAll('[data-etape]')];
  const liensEtapes = [...document.querySelectorAll('[data-etape-lien]')];
  const annonceEtape = document.querySelector('#annonce-etape');
  const recapitulatif = document.querySelector('#recapitulatif');
  const joursZone = document.querySelector('#choix-jours');
  const heuresZone = document.querySelector('#choix-heures');
  const erreurCreneau = document.querySelector('#erreur-creneau');
  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');
  const recapFinal = document.querySelector('#recap-final');
  const messageSucces = document.querySelector('#message-succes');
  const services = {
    'bilan-ipl': { nom: 'Bilan épilation lumière pulsée', duree: 30, dureeTexte: '30\u00a0min', prix: '25\u00a0€', prixTexte: '25\u00a0€' },
    'pose-americaine': { nom: 'Pose américaine, sans dépose', duree: 45, dureeTexte: '45\u00a0min', prix: 'dès 57\u00a0€', prixTexte: 'à partir de 57\u00a0€' },
    'extension-gel': { nom: 'Extension gel', duree: 90, dureeTexte: '1\u00a0h\u00a030', prix: 'dès 70\u00a0€', prixTexte: 'à partir de 70\u00a0€' },
    'rehaussement': { nom: 'Rehaussement de cils', duree: 45, dureeTexte: '45\u00a0min', prix: '46\u00a0€', prixTexte: '46\u00a0€' }
  };
  const etat = { etape: 0, derniereEtape: 0, prestation: 'bilan-ipl', jour: null, heure: null };
  const formatHeure = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const formatDate = (date, options) => new Intl.DateTimeFormat('fr-FR', options).format(date);
  const dateLocale = (date) => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  const memeJour = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const cleDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  function actualiserLiensEtapes() {
    liensEtapes.forEach((lien, index) => {
      lien.disabled = index > etat.derniereEtape || (index === 2 && etat.heure === null) || etat.etape === 3;
    });
  }

  function serviceChoisi() { return services[etat.prestation]; }

  function horairesDuJour(date) {
    const jour = date.getDay();
    if (jour === 0) return null;
    return jour === 6 ? { ouverture: 9 * 60, fermeture: 13 * 60 + 45 } : { ouverture: 9 * 60 + 30, fermeture: 19 * 60 };
  }

  function estDejaPris(date, minutes) {
    const cle = `${cleDate(date)}-${minutes}`;
    let graine = 0;
    for (let index = 0; index < cle.length; index += 1) graine = (graine * 31 + cle.charCodeAt(index)) >>> 0;
    return graine % 5 === 1;
  }

  function mettreAJourRecap() {
    const service = serviceChoisi();
    const elements = [service.nom, `${service.dureeTexte} · ${service.prix}`];
    if (etat.jour) elements.push(dateLocale(etat.jour));
    if (etat.heure !== null) elements.push(formatHeure(etat.heure));
    recapitulatif.textContent = elements.join(' · ');
    if (etat.jour && etat.heure !== null) {
      recapFinal.textContent = `${service.nom} · ${dateLocale(etat.jour)} à ${formatHeure(etat.heure)} · ${service.prix}. Tarif Planity à confirmer avec le salon.`;
    } else if (etat.jour) recapFinal.textContent = `${service.nom} · ${dateLocale(etat.jour)} · choisissez un horaire pour continuer.`;
  }

  function choisirJour(date) {
    etat.jour = date;
    etat.heure = null;
    etat.derniereEtape = Math.min(etat.derniereEtape, 1);
    actualiserLiensEtapes();
    erreurCreneau.textContent = '';
    [...joursZone.querySelectorAll('.jour')].forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.jour === cleDate(date)));
    });
    afficherHeures();
    mettreAJourRecap();
  }

  function afficherJours() {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const dates = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(aujourdHui);
      date.setDate(date.getDate() + index);
      return date;
    });
    joursZone.replaceChildren();
    dates.forEach((date, index) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.jour = cleDate(date);
      bouton.setAttribute('aria-pressed', 'false');
      const jour = document.createElement('span');
      jour.textContent = formatDate(date, { weekday: 'short' }).replace('.', '');
      const numero = document.createElement('span');
      numero.textContent = formatDate(date, { day: 'numeric' });
      bouton.append(jour, numero);
      if (index === 0 || date.getDate() === 1) {
        const mois = document.createElement('span');
        mois.className = 'jour__mois';
        mois.textContent = formatDate(date, { month: 'short' }).replace('.', '');
        bouton.append(mois);
      }
      if (date.getDay() === 0) {
        bouton.disabled = true;
        const ferme = document.createElement('span');
        ferme.textContent = 'fermé';
        bouton.append(ferme);
        bouton.setAttribute('aria-label', `${dateLocale(date)}, fermé`);
      } else {
        bouton.setAttribute('aria-label', dateLocale(date));
        bouton.addEventListener('click', () => choisirJour(date));
      }
      joursZone.append(bouton);
    });
    const premierJourOuvert = dates.find((date) => date.getDay() !== 0);
    if (premierJourOuvert) choisirJour(premierJourOuvert);
  }

  function afficherHeures() {
    heuresZone.replaceChildren();
    if (!etat.jour) return;
    const horaires = horairesDuJour(etat.jour);
    if (!horaires) return;
    const service = serviceChoisi();
    const maintenant = new Date();
    const premierDepart = Math.ceil(horaires.ouverture / 30) * 30;
    let nombreCreneaux = 0;
    for (let minutes = premierDepart; minutes + service.duree <= horaires.fermeture; minutes += 30) {
      nombreCreneaux += 1;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'creneau';
      bouton.textContent = formatHeure(minutes);
      bouton.setAttribute('aria-pressed', 'false');
      const passe = memeJour(etat.jour, maintenant) && minutes <= maintenant.getHours() * 60 + maintenant.getMinutes();
      const pris = estDejaPris(etat.jour, minutes);
      if (passe || pris) {
        bouton.disabled = true;
        bouton.textContent += passe ? ' · passé' : ' · déjà pris';
        bouton.setAttribute('aria-label', `${formatHeure(minutes)}, ${passe ? 'heure passée' : 'déjà pris'}`);
      } else {
        bouton.setAttribute('aria-label', formatHeure(minutes));
        bouton.addEventListener('click', () => {
          etat.heure = minutes;
          erreurCreneau.textContent = '';
          [...heuresZone.querySelectorAll('.creneau')].forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
          mettreAJourRecap();
        });
      }
      heuresZone.append(bouton);
    }
    if (nombreCreneaux === 0) {
      const message = document.createElement('p');
      message.className = 'indisponible';
      message.textContent = 'Aucun horaire indicatif ne correspond à cette prestation.';
      heuresZone.append(message);
    }
  }

  function afficherEtape(numero) {
    const ancienPanneau = panneaux[etat.etape];
    const nouveauPanneau = panneaux[numero];
    if (!nouveauPanneau) return;
    if (numero === 2 && (!etat.jour || etat.heure === null)) {
      erreurCreneau.textContent = 'Choisissez un jour ouvert et un horaire disponible.';
      return;
    }
    if (ancienPanneau && ancienPanneau !== nouveauPanneau) {
      ancienPanneau.classList.remove('est-visible');
      const numeroAncien = Number(ancienPanneau.dataset.etape);
      window.setTimeout(() => {
        if (etat.etape !== numeroAncien) ancienPanneau.hidden = true;
      }, 230);
    }
    nouveauPanneau.hidden = false;
    nouveauPanneau.classList.remove('est-visible');
    requestAnimationFrame(() => nouveauPanneau.classList.add('est-visible'));
    etat.etape = numero;
    etat.derniereEtape = Math.max(etat.derniereEtape, numero);
    annonceEtape.textContent = ['Étape 1 sur 3\u00a0: prestation.', 'Étape 2 sur 3\u00a0: jour et heure.', 'Étape 3 sur 3\u00a0: coordonnées.', 'Simulation confirmée, sans envoi.'][numero];
    liensEtapes.forEach((lien, index) => {
      if (index === numero) lien.setAttribute('aria-current', 'step');
      else lien.removeAttribute('aria-current');
    });
    actualiserLiensEtapes();
    const titre = nouveauPanneau.querySelector('h3');
    requestAnimationFrame(() => titre?.focus());
  }

  function validerCoordonnees() {
    let valide = true;
    if (!champPrenom.value.trim()) {
      erreurPrenom.textContent = 'Indiquez votre prénom pour continuer.';
      champPrenom.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      erreurPrenom.textContent = '';
      champPrenom.removeAttribute('aria-invalid');
    }
    const telephone = champTelephone.value.trim();
    const mobileFrancais = /^(?:(?:\+|00)33\s?[67]|0[67])(?:[\s.-]?\d{2}){4}$/;
    if (!mobileFrancais.test(telephone)) {
      erreurTelephone.textContent = 'Entrez un numéro de mobile français valide, commençant par 06, 07, +336 ou +337.';
      champTelephone.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      erreurTelephone.textContent = '';
      champTelephone.removeAttribute('aria-invalid');
    }
    if (!valide) {
      (erreurPrenom.textContent ? champPrenom : champTelephone).focus();
    }
    return valide;
  }

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) {
      etat.prestation = evenement.target.value;
      etat.heure = null;
      etat.derniereEtape = Math.min(etat.derniereEtape, 1);
      actualiserLiensEtapes();
      mettreAJourRecap();
      if (etat.jour) afficherHeures();
    }
  });

  formulaire.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-action]');
    if (!bouton) return;
    if (bouton.dataset.action === 'retour') afficherEtape(Math.max(0, etat.etape - 1));
    if (bouton.dataset.action === 'continuer') {
      if (etat.etape === 0) afficherEtape(1);
      else if (etat.etape === 1) {
        if (!etat.jour || etat.heure === null) {
          erreurCreneau.textContent = 'Choisissez un jour ouvert et un horaire disponible.';
          return;
        }
        afficherEtape(2);
      }
    }
  });

  liensEtapes.forEach((lien) => lien.addEventListener('click', () => {
    const numero = Number(lien.dataset.etapeLien);
    if (!lien.disabled && numero <= etat.derniereEtape) afficherEtape(numero);
  }));

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape !== 2) return;
    if (!etat.jour || etat.heure === null) {
      afficherEtape(1);
      erreurCreneau.textContent = 'Choisissez un jour ouvert et un horaire disponible.';
      return;
    }
    if (!validerCoordonnees()) return;
    const service = serviceChoisi();
    messageSucces.textContent = `${champPrenom.value.trim()}, votre simulation concerne ${service.nom.toLocaleLowerCase('fr-FR')} le ${dateLocale(etat.jour)} à ${formatHeure(etat.heure)} (${service.prixTexte}). Appelez l’institut pour confirmer un vrai rendez-vous.`;
    afficherEtape(3);
  });

  [champPrenom, champTelephone].forEach((champ) => champ.addEventListener('input', () => {
    if (champ === champPrenom && champ.value.trim()) {
      erreurPrenom.textContent = '';
      champ.removeAttribute('aria-invalid');
    }
    if (champ === champTelephone && /^(?:(?:\+|00)33\s?[67]|0[67])(?:[\s.-]?\d{2}){4}$/.test(champ.value.trim())) {
      erreurTelephone.textContent = '';
      champ.removeAttribute('aria-invalid');
    }
  }));

  formulaire.querySelectorAll('input[name="prestation"]').forEach((champ) => {
    if (champ.checked) etat.prestation = champ.value;
  });
  afficherJours();
  mettreAJourRecap();

  const liensAncre = [...document.querySelectorAll('a[href^="#"]')];
  liensAncre.forEach((lien) => lien.addEventListener('click', (evenement) => {
    const cible = document.querySelector(lien.getAttribute('href'));
    if (cible && !reduireMouvement) {
      evenement.preventDefault();
      cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', lien.getAttribute('href'));
    }
  }));
})();
