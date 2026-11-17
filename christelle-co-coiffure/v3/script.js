(() => {
  const racine = document.documentElement;
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const annonce = document.getElementById('annonce-etape');
  const formulaire = document.getElementById('formulaire-rendez-vous');
  const panneaux = [...document.querySelectorAll('[data-panneau]')];
  const points = [...document.querySelectorAll('[data-point]')];
  const avancement = document.querySelector('.reservation__avancement');
  const choixDates = document.getElementById('choix-dates');
  const choixHeures = document.getElementById('choix-heures');
  const recapPrestation = document.getElementById('recap-prestation');
  const recapDate = document.getElementById('recap-date');
  const recapHeure = document.getElementById('recap-heure');
  const confirmation = document.getElementById('confirmation');
  const recapitulatif = document.getElementById('recapitulatif');
  const erreurDate = document.getElementById('erreur-date');
  const erreurHeure = document.getElementById('erreur-heure');
  const menuBouton = document.querySelector('.menu-bouton');
  const menuMobile = document.getElementById('menu-mobile');
  const barreMobile = document.querySelector('.barre-mobile');
  const ligneActive = document.querySelector('.parcours__ligne-active');
  let dateChoisie = null;
  let heureChoisie = null;
  let minuteurMenu = 0;
  let imageLigneEnAttente = false;

  function annoncer(texte) {
    annonce.textContent = '';
    window.setTimeout(() => { annonce.textContent = texte; }, 20);
  }

  function prestationChoisie() {
    const choix = formulaire.querySelector('input[name="prestation"]:checked');
    return choix ? choix.value + ' · à confirmer' : 'À préciser avec le salon';
  }

  function mettreAJourRecapitulatif() {
    recapPrestation.textContent = prestationChoisie();
    recapDate.textContent = dateChoisie ? dateChoisie.libelle : 'À choisir';
    recapHeure.textContent = heureChoisie ? heureChoisie.libelle + ' · à confirmer' : 'À choisir';
  }

  function afficherEtape(index, options = {}) {
    const { focus = true, annoncerChangement = true } = options;
    panneaux.forEach((panneau, numero) => {
      if (numero === index) {
        panneau.hidden = false;
        panneau.classList.add('est-en-entree');
        requestAnimationFrame(() => requestAnimationFrame(() => panneau.classList.remove('est-en-entree')));
      } else {
        panneau.hidden = true;
        panneau.classList.remove('est-en-entree');
      }
    });

    points.forEach((point, numero) => {
      point.classList.toggle('reservation__point--actif', numero === index);
      point.classList.toggle('reservation__point--termine', numero < index);
      point.disabled = numero > index;
      if (numero === index) point.setAttribute('aria-current', 'step');
      else point.removeAttribute('aria-current');
    });
    avancement.setAttribute('aria-label', 'Étape ' + (index + 1) + ' sur ' + panneaux.length);
    if (focus) panneaux[index].querySelector('legend').focus({ preventScroll: true });

    const intitulés = [
      'Choisissez une prestation à confirmer avec le salon.',
      'Choisissez un jour pour cette simulation.',
      'Choisissez une heure fictive à confirmer.',
      'Indiquez vos coordonnées pour le récapitulatif.'
    ];
    if (annoncerChangement) annoncer('Étape ' + (index + 1) + ' sur ' + panneaux.length + '. ' + intitulés[index]);
    mettreAJourRecapitulatif();
  }

  function afficherDates() {
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    const formaterJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
    const formaterCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
    const formaterComplet = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdHui);
      date.setDate(aujourdHui.getDate() + decalage);
      const jour = date.getDay();
      const dimanche = jour === 0;
      const samedi = jour === 6;
      const isoDate = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      const plusAucuneHeure = decalage === 0 && heuresPourJour(jour).every((heure) => new Date(isoDate + 'T' + heure + ':00') <= new Date());
      const bouton = document.createElement('button');
      const libelleComplet = formaterComplet.format(date);
      const libelleCourt = formaterCourt.format(date).replace('.', '');
      const libelleJour = decalage === 0 ? 'Aujourd’hui' : formaterJour.format(date);

      bouton.className = 'date-choix';
      bouton.type = 'button';
      bouton.dataset.date = isoDate;
      bouton.setAttribute('aria-pressed', 'false');

      const jourTexte = document.createElement('span');
      jourTexte.className = 'date-choix__jour';
      jourTexte.textContent = libelleJour;
      const nombre = document.createElement('span');
      nombre.className = 'date-choix__nombre';
      nombre.textContent = libelleCourt;
      const etat = document.createElement('span');
      etat.className = 'date-choix__etat';

      if (dimanche) {
        bouton.disabled = true;
        etat.textContent = 'Fermé';
        bouton.setAttribute('aria-label', libelleComplet + ', fermé selon les annuaires consultés');
      } else if (samedi) {
        bouton.disabled = true;
        etat.textContent = 'À confirmer';
        bouton.setAttribute('aria-label', libelleComplet + ', horaires à confirmer par téléphone');
      } else if (plusAucuneHeure) {
        bouton.disabled = true;
        etat.textContent = 'Passé';
        bouton.setAttribute('aria-label', libelleComplet + ', heures de démonstration déjà passées');
      } else {
        etat.textContent = 'Exemple';
        bouton.setAttribute('aria-label', libelleComplet + ', jour fictif pour la démonstration, disponibilité à confirmer');
        bouton.addEventListener('click', () => {
          choixDates.querySelectorAll('.date-choix:not(:disabled)').forEach((autre) => autre.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          dateChoisie = { libelle: libelleComplet, date: bouton.dataset.date, jour };
          heureChoisie = null;
          erreurDate.hidden = true;
          erreurHeure.hidden = true;
          choixHeures.replaceChildren();
          mettreAJourRecapitulatif();
          annoncer(libelleComplet + ' choisi pour la démonstration. Disponibilité à confirmer avec le salon.');
        });
      }

      bouton.append(jourTexte, nombre, etat);
      choixDates.append(bouton);
    }
  }

  function heuresPourJour(jour) {
    const heuresPublieesEnCommun = {
      1: ['10:00', '12:00', '14:00', '16:00'],
      2: ['09:00', '11:00', '13:00', '15:00'],
      3: ['09:00', '11:00', '13:00', '15:00', '17:00'],
      4: ['09:00', '11:00', '13:00', '15:00'],
      5: ['09:00', '11:00', '13:00', '15:00']
    };
    return heuresPublieesEnCommun[jour] || [];
  }

  function afficherHeures() {
    choixHeures.replaceChildren();
    if (!dateChoisie) return;

    const maintenant = new Date();
    const estAujourdHui = dateChoisie.date === [
      maintenant.getFullYear(),
      String(maintenant.getMonth() + 1).padStart(2, '0'),
      String(maintenant.getDate()).padStart(2, '0')
    ].join('-');

    if (heureChoisie && heureChoisie.date === dateChoisie.date) {
      const heureDejaPasse = new Date(dateChoisie.date + 'T' + heureChoisie.valeur + ':00') <= maintenant;
      if (heureDejaPasse) {
        heureChoisie = null;
        mettreAJourRecapitulatif();
      }
    }

    heuresPourJour(dateChoisie.jour).forEach((heure) => {
      const [heures, minutes] = heure.split(':').map(Number);
      const dateHeure = new Date(dateChoisie.date + 'T' + heure + ':00');
      const estPasse = estAujourdHui && dateHeure <= maintenant;
      const estChoisie = Boolean(heureChoisie && heureChoisie.date === dateChoisie.date && heureChoisie.valeur === heure);
      const bouton = document.createElement('button');
      const valeurVisible = heures + (minutes ? '\u00a0h\u00a0' + String(minutes).padStart(2, '0') : '\u00a0h');
      bouton.className = 'heure-choix';
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', String(estChoisie));
      bouton.disabled = estPasse;

      const texte = document.createElement('span');
      texte.className = 'heure-choix__texte';
      texte.textContent = valeurVisible;
      const etat = document.createElement('span');
      etat.className = 'heure-choix__etat';
      etat.textContent = estPasse ? 'Passée' : 'Exemple';
      bouton.setAttribute('aria-label', valeurVisible + (estPasse ? ', heure passée' : ', heure de démonstration à confirmer'));

      if (!estPasse) {
        bouton.addEventListener('click', () => {
          choixHeures.querySelectorAll('.heure-choix:not(:disabled)').forEach((autre) => autre.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          heureChoisie = { valeur: heure, libelle: valeurVisible, date: dateChoisie.date };
          erreurHeure.hidden = true;
          mettreAJourRecapitulatif();
          annoncer(valeurVisible + ' choisi comme heure fictive. Disponibilité à confirmer auprès du salon.');
        });
      }

      choixHeures.append(bouton);
    });
  }

  function ouvrirMenu() {
    window.clearTimeout(minuteurMenu);
    menuMobile.hidden = false;
    requestAnimationFrame(() => menuMobile.classList.add('is-ouvert'));
    menuBouton.setAttribute('aria-expanded', 'true');
    const premierLien = menuMobile.querySelector('a');
    if (premierLien) premierLien.focus();
  }

  function fermerMenu(rendreFocus = false) {
    if (menuMobile.hidden) return;
    menuMobile.classList.remove('is-ouvert');
    menuBouton.setAttribute('aria-expanded', 'false');
    window.clearTimeout(minuteurMenu);
    minuteurMenu = window.setTimeout(() => { menuMobile.hidden = true; }, reduireMouvement ? 0 : 210);
    if (rendreFocus) menuBouton.focus();
  }

  menuBouton.addEventListener('click', () => {
    if (menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu();
    else ouvrirMenu();
  });
  menuMobile.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerMenu();
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape') fermerMenu(true);
  });

  avancement.addEventListener('click', (evenement) => {
    const cible = evenement.target.closest('[data-aller]');
    if (cible && !cible.disabled) afficherEtape(Number(cible.dataset.aller));
  });

  document.querySelector('.liste-prestations').addEventListener('click', (evenement) => {
    const lien = evenement.target.closest('[data-prestation]');
    if (!lien) return;
    const radio = [...formulaire.querySelectorAll('input[name="prestation"]')].find((option) => option.value === lien.dataset.prestation);
    if (!radio) return;
    radio.checked = true;
    afficherEtape(0, { annoncerChangement: false });
    annoncer(lien.dataset.prestation + ', à confirmer, choisi pour la simulation.');
  });

  formulaire.addEventListener('click', (evenement) => {
    const suivant = evenement.target.closest('[data-suite]');
    const retour = evenement.target.closest('[data-retour]');
    if (suivant) {
      const cible = Number(suivant.dataset.suite);
      if (cible === 2 && !dateChoisie) {
        erreurDate.hidden = false;
        annoncer('Choisissez un jour pour poursuivre.');
        const premierJour = choixDates.querySelector('.date-choix:not(:disabled)');
        if (premierJour) premierJour.focus();
        return;
      }
      if (cible === 2) afficherHeures();
      if (cible === 3 && !heureChoisie) {
        erreurHeure.hidden = false;
        annoncer('Choisissez une heure de démonstration pour poursuivre.');
        const premiereHeure = choixHeures.querySelector('.heure-choix:not(:disabled)');
        if (premiereHeure) premiereHeure.focus();
        return;
      }
      afficherEtape(cible);
    }
    if (retour) afficherEtape(Number(retour.dataset.retour));
  });

  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.matches('input[name="prestation"]')) mettreAJourRecapitulatif();
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = document.getElementById('prenom');
    const telephone = document.getElementById('telephone');
    const erreurPrenom = document.getElementById('erreur-prenom');
    const erreurTelephone = document.getElementById('erreur-telephone');
    let numero = telephone.value.replace(/[^\d]/g, '');
    if (numero.startsWith('0033')) numero = '0' + numero.slice(4);
    else if (numero.startsWith('33')) numero = '0' + numero.slice(2);
    const telephoneValide = /^0[1-9]\d{8}$/.test(numero);
    const prenomValide = prenom.value.trim().length > 0;

    erreurPrenom.hidden = prenomValide;
    erreurTelephone.hidden = telephoneValide;
    prenom.setAttribute('aria-invalid', String(!prenomValide));
    telephone.setAttribute('aria-invalid', String(!telephoneValide));

    if (!dateChoisie || !heureChoisie) {
      if (!dateChoisie) {
        afficherEtape(1);
        erreurDate.hidden = false;
      } else {
        afficherEtape(2);
        afficherHeures();
        erreurHeure.hidden = false;
      }
      annoncer('Vérifiez le jour et l’heure de démonstration choisis.');
      return;
    }
    if (!prenomValide || !telephoneValide) {
      if (!prenomValide) prenom.focus();
      else telephone.focus();
      annoncer('Vérifiez les coordonnées indiquées.');
      return;
    }

    mettreAJourRecapitulatif();
    recapitulatif.textContent = prenom.value.trim() + ', cette simulation reprend « ' + prestationChoisie() + ' », le ' + dateChoisie.libelle + ' à ' + heureChoisie.libelle + '. Tout reste à confirmer par téléphone.';
    panneaux.forEach((panneau) => { panneau.hidden = true; });
    confirmation.hidden = false;
    confirmation.focus();
    annoncer('Simulation terminée. Aucun rendez-vous n’est réservé et aucune demande n’a été envoyée.');
  });

  document.getElementById('recommencer').addEventListener('click', () => {
    formulaire.reset();
    dateChoisie = null;
    heureChoisie = null;
    choixDates.querySelectorAll('.date-choix').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
    choixHeures.replaceChildren();
    confirmation.hidden = true;
    document.getElementById('prenom').value = '';
    document.getElementById('telephone').value = '';
    document.getElementById('prenom').removeAttribute('aria-invalid');
    document.getElementById('telephone').removeAttribute('aria-invalid');
    document.getElementById('erreur-prenom').hidden = true;
    document.getElementById('erreur-telephone').hidden = true;
    erreurDate.hidden = true;
    erreurHeure.hidden = true;
    afficherEtape(0);
  });

  afficherDates();
  mettreAJourRecapitulatif();
  afficherEtape(0, { focus: false, annoncerChangement: false });

  const noeuds = [...document.querySelectorAll('.etape')];
  if ('IntersectionObserver' in window && !reduireMouvement) {
    const observateurParcours = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .18, rootMargin: '0px 0px -7% 0px' });
    noeuds.forEach((noeud) => observateurParcours.observe(noeud));
  } else {
    noeuds.forEach((noeud) => noeud.classList.add('is-visible'));
  }

  function actualiserLigne() {
    imageLigneEnAttente = false;
    if (reduireMouvement) {
      ligneActive.style.transform = 'scaleY(1)';
      return;
    }
    const ligne = document.querySelector('.parcours__ligne');
    const rect = ligne.getBoundingClientRect();
    const depart = window.scrollY + rect.top;
    const fin = window.scrollY + rect.bottom - window.innerHeight * .48;
    const avancementLigne = Math.max(0, Math.min(1, (window.scrollY - depart) / Math.max(1, fin - depart)));
    ligneActive.style.transform = 'scaleY(' + avancementLigne + ')';
  }

  function demanderActualisationLigne() {
    if (imageLigneEnAttente) return;
    imageLigneEnAttente = true;
    requestAnimationFrame(actualiserLigne);
  }

  window.addEventListener('scroll', demanderActualisationLigne, { passive: true });
  window.addEventListener('resize', demanderActualisationLigne, { passive: true });
  demanderActualisationLigne();

  if ('IntersectionObserver' in window) {
    const etats = { hero: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      const masquer = etats.hero || etats.reservation || etats.pied;
      barreMobile.hidden = masquer;
      document.body.classList.toggle('barre-active', !masquer);
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target.id === 'accueil') etats.hero = entree.isIntersecting;
        if (entree.target.id === 'rendez-vous') etats.reservation = entree.isIntersecting;
        if (entree.target.tagName === 'FOOTER') etats.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: .08 });
    observateurBarre.observe(document.getElementById('accueil'));
    observateurBarre.observe(document.getElementById('rendez-vous'));
    observateurBarre.observe(document.querySelector('footer'));
  }

  requestAnimationFrame(() => racine.classList.add('initialise'));
})();
