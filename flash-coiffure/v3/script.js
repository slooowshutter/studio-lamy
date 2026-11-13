(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panneaux = Array.from(doc.querySelectorAll('[data-panneau]'));
  const boutonsPanneau = Array.from(doc.querySelectorAll('[data-bouton-panneau]'));
  const boutonMenu = doc.querySelector('.menu-bouton');
  const navigation = doc.querySelector('#navigation');
  const resumePrestation = doc.querySelector('[data-resume-prestation]');
  const resumeJour = doc.querySelector('[data-resume-jour]');
  const annonce = doc.querySelector('[data-annonce]');
  const boutonContinuerPrestation = doc.querySelector('[data-action="continuer-prestation"]');
  const boutonPreparer = doc.querySelector('[data-action="preparer"]');
  const groupeJours = doc.querySelector('[data-jours]');
  const dureeEtape = 240;
  let prestationChoisie = '';
  let jourChoisi = null;
  let etapeActuelle = 'prestation';
  let numeroTransitionEtape = 0;
  let restaurationEnCours = false;

  function ouvrirPanneau(identifiant, placerFocus = false) {
    const cible = panneaux.find((panneau) => panneau.dataset.panneau === identifiant);
    if (!cible) return;
    panneaux.forEach((panneau) => {
      const ouvert = panneau === cible;
      const bouton = panneau.querySelector('[data-bouton-panneau]');
      const contenu = panneau.querySelector('.panneau__contenu');
      panneau.classList.toggle('est-ouvert', ouvert);
      bouton.setAttribute('aria-expanded', String(ouvert));
      contenu.hidden = !ouvert;
      contenu.inert = !ouvert;
    });
    if (placerFocus) cible.querySelector('[data-bouton-panneau]').focus({ preventScroll: true });
  }

  boutonsPanneau.forEach((bouton) => {
    bouton.addEventListener('click', () => ouvrirPanneau(bouton.closest('[data-panneau]').dataset.panneau));
  });
  ouvrirPanneau('le-fait');

  function fermerMenu(placerFocus = false) {
    navigation.hidden = true;
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.setAttribute('aria-label', 'Afficher les rubriques');
    if (placerFocus) boutonMenu.focus();
  }

  boutonMenu.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    if (ouvert) {
      fermerMenu();
      return;
    }
    navigation.hidden = false;
    boutonMenu.setAttribute('aria-expanded', 'true');
    boutonMenu.setAttribute('aria-label', 'Masquer les rubriques');
    navigation.querySelector('a').focus();
  });

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
  });

  doc.querySelectorAll('[data-ouvrir]').forEach((lien) => {
    lien.addEventListener('click', (event) => {
      event.preventDefault();
      const identifiant = lien.dataset.ouvrir;
      fermerMenu();
      ouvrirPanneau(identifiant, true);
      doc.getElementById(identifiant).scrollIntoView({ behavior: mouvementReduit.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  doc.querySelectorAll('a[href="#note-fait"]').forEach((lien) => {
    lien.addEventListener('click', () => {
      ouvrirPanneau('sources');
      window.setTimeout(() => doc.getElementById('note-fait').scrollIntoView({ behavior: mouvementReduit.matches ? 'auto' : 'smooth', block: 'center' }), 40);
    });
  });

  function annoncer(texte) {
    annonce.textContent = texte;
  }

  function enregistrerEtat(methode = 'push') {
    if (restaurationEnCours) return;
    const parametres = new URLSearchParams();
    parametres.set('etape', etapeActuelle);
    if (prestationChoisie) parametres.set('prestation', prestationChoisie);
    if (jourChoisi) parametres.set('jour', jourChoisi.cle);
    const suffixe = parametres.toString();
    const adresse = `${window.location.pathname}${suffixe ? `?${suffixe}` : ''}${window.location.hash}`;
    const etat = { etape: etapeActuelle, prestation: prestationChoisie, jour: jourChoisi ? jourChoisi.cle : '' };
    window.history[`${methode}State`](etat, '', adresse);
  }

  function afficherEtape(nom, texteAnnonce, options = {}) {
    if (nom === etapeActuelle) return;
    const precedente = doc.querySelector(`[data-etape="${etapeActuelle}"]`);
    const suivante = doc.querySelector(`[data-etape="${nom}"]`);
    if (!precedente || !suivante) return;
    const numeroTransition = ++numeroTransitionEtape;
    const ordre = ['prestation', 'jour', 'pret'];
    const retour = ordre.indexOf(nom) < ordre.indexOf(etapeActuelle);
    doc.querySelectorAll('[data-etape]').forEach((etape) => {
      if (etape === precedente || etape === suivante) return;
      etape.hidden = true;
      etape.inert = true;
      etape.removeAttribute('data-mouvement');
    });
    etapeActuelle = nom;
    if (!options.sansHistorique) enregistrerEtat('push');
    if (mouvementReduit.matches) {
      precedente.hidden = true;
      precedente.inert = true;
      precedente.removeAttribute('data-mouvement');
      suivante.hidden = false;
      suivante.inert = false;
      suivante.removeAttribute('data-mouvement');
      suivante.querySelector('h3').focus({ preventScroll: true });
    } else {
      precedente.dataset.mouvement = retour ? 'sortie-vers-droite' : 'sortie-vers-gauche';
      precedente.inert = true;
      suivante.hidden = false;
      suivante.inert = false;
      suivante.dataset.mouvement = retour ? 'entree-depuis-gauche' : 'entree-depuis-droite';
      window.requestAnimationFrame(() => {
        if (numeroTransition !== numeroTransitionEtape) return;
        suivante.dataset.mouvement = 'visible';
      });
      suivante.querySelector('h3').focus({ preventScroll: true });
      window.setTimeout(() => {
        if (numeroTransition !== numeroTransitionEtape) return;
        precedente.hidden = true;
        precedente.removeAttribute('data-mouvement');
        suivante.removeAttribute('data-mouvement');
      }, dureeEtape);
    }
    annoncer(texteAnnonce);
  }

  doc.querySelectorAll('input[name="prestation"]').forEach((champ) => {
    champ.addEventListener('change', () => {
      prestationChoisie = champ.value;
      resumePrestation.textContent = prestationChoisie;
      boutonContinuerPrestation.disabled = false;
      doc.querySelector('[data-erreur-prestation]').hidden = true;
      annoncer(`Prestation choisie : ${prestationChoisie}.`);
      enregistrerEtat('replace');
    });
  });

  doc.querySelectorAll('[data-choisir-prestation]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const nom = bouton.dataset.choisirPrestation;
      const champ = Array.from(doc.querySelectorAll('input[name="prestation"]')).find((option) => option.value === nom);
      if (!champ) return;
      champ.checked = true;
      champ.dispatchEvent(new Event('change', { bubbles: true }));
      if (etapeActuelle !== 'prestation') afficherEtape('prestation', `Prestation choisie : ${nom}. Choisissez un jour pour poursuivre.`);
      ouvrirPanneau('rendez-vous');
      doc.getElementById('rendez-vous').scrollIntoView({ behavior: mouvementReduit.matches ? 'auto' : 'smooth', block: 'start' });
      champ.focus({ preventScroll: true });
    });
  });

  function creerBoutonJour(date, index) {
    const jourSemaine = date.getDay();
    const ouvert = jourSemaine >= 2 && jourSemaine <= 6;
    const nomComplet = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    const abregeJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace('.', '');
    const abregeMois = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
    const bouton = doc.createElement('button');
    bouton.className = 'jour';
    bouton.type = 'button';
    bouton.disabled = !ouvert;
    bouton.dataset.jour = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    bouton.setAttribute('aria-label', `${nomComplet}${ouvert ? '' : ', fermé'}`);
    bouton.setAttribute('aria-pressed', 'false');

    const semaine = doc.createElement('span');
    semaine.className = 'jour__semaine';
    semaine.textContent = index === 0 ? 'Auj.' : abregeJour;
    const numero = doc.createElement('span');
    numero.className = 'jour__numero';
    numero.textContent = String(date.getDate());
    const mois = doc.createElement('span');
    mois.className = 'jour__mois';
    mois.textContent = abregeMois;
    bouton.append(semaine, numero, mois);
    if (!ouvert) {
      const etat = doc.createElement('span');
      etat.className = 'jour__etat';
      etat.textContent = 'Fermé';
      bouton.append(etat);
    }
    bouton.addEventListener('click', () => {
      groupeJours.querySelectorAll('.jour').forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
      jourChoisi = { cle: bouton.dataset.jour, libelle: nomComplet };
      resumeJour.textContent = nomComplet;
      boutonPreparer.disabled = false;
      doc.querySelector('[data-erreur-jour]').hidden = true;
      annoncer(`Jour souhaité : ${nomComplet}.`);
      enregistrerEtat('replace');
    });
    return bouton;
  }

  function creerCalendrier() {
    const morceauxDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const valeursDate = Object.fromEntries(morceauxDate.map((morceau) => [morceau.type, morceau.value]));
    const aujourdHui = new Date(Number(valeursDate.year), Number(valeursDate.month) - 1, Number(valeursDate.day));
    const fragment = doc.createDocumentFragment();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate() + index);
      fragment.append(creerBoutonJour(date, index));
    }
    groupeJours.replaceChildren(fragment);
  }
  creerCalendrier();

  boutonContinuerPrestation.addEventListener('click', () => {
    if (!prestationChoisie) {
      doc.querySelector('[data-erreur-prestation]').hidden = false;
      annoncer('Choisissez une prestation pour continuer.');
      return;
    }
    afficherEtape('jour', 'Choisissez un jour d’ouverture dans la liste.');
  });

  doc.querySelector('[data-action="retour-prestation"]').addEventListener('click', () => {
    afficherEtape('prestation', 'Choisissez une prestation.');
  });

  boutonPreparer.addEventListener('click', () => {
    if (!jourChoisi) {
      doc.querySelector('[data-erreur-jour]').hidden = false;
      annoncer('Choisissez un jour d’ouverture pour continuer.');
      return;
    }
    afficherEtape('pret', `Votre choix est prêt : ${prestationChoisie}, ${jourChoisi.libelle}. Appelez le salon pour vérifier l’horaire.`);
  });

  doc.querySelector('[data-action="modifier-jour"]').addEventListener('click', () => {
    afficherEtape('jour', 'Choisissez un autre jour d’ouverture.');
  });

  doc.querySelector('[data-action="modifier-prestation"]').addEventListener('click', () => {
    afficherEtape('prestation', 'Choisissez une autre prestation.');
  });

  function appliquerEtatDemande(etat, auChargement = false) {
    restaurationEnCours = true;
    const nomPrestation = etat && typeof etat.prestation === 'string' ? etat.prestation : '';
    const champPrestation = Array.from(doc.querySelectorAll('input[name="prestation"]')).find((champ) => champ.value === nomPrestation);
    doc.querySelectorAll('input[name="prestation"]').forEach((champ) => { champ.checked = champ === champPrestation; });
    prestationChoisie = champPrestation ? champPrestation.value : '';
    resumePrestation.textContent = prestationChoisie || 'À choisir';
    boutonContinuerPrestation.disabled = !prestationChoisie;

    const boutonJour = etat && etat.jour ? Array.from(groupeJours.querySelectorAll('.jour')).find((bouton) => bouton.dataset.jour === etat.jour && !bouton.disabled) : null;
    groupeJours.querySelectorAll('.jour').forEach((bouton) => bouton.setAttribute('aria-pressed', String(bouton === boutonJour)));
    jourChoisi = boutonJour ? { cle: boutonJour.dataset.jour, libelle: boutonJour.getAttribute('aria-label') } : null;
    resumeJour.textContent = jourChoisi ? jourChoisi.libelle : 'À choisir';
    boutonPreparer.disabled = !jourChoisi;

    let etapeCible = etat && ['prestation', 'jour', 'pret'].includes(etat.etape) ? etat.etape : 'prestation';
    if (etapeCible !== 'prestation' && !prestationChoisie) etapeCible = 'prestation';
    if (etapeCible === 'pret' && !jourChoisi) etapeCible = 'jour';
    if (auChargement) {
      etapeActuelle = etapeCible;
      doc.querySelectorAll('[data-etape]').forEach((etape) => {
        const visible = etape.dataset.etape === etapeCible;
        etape.hidden = !visible;
        etape.inert = !visible;
        etape.removeAttribute('data-mouvement');
      });
    } else if (etapeCible !== etapeActuelle) {
      afficherEtape(etapeCible, 'Votre demande a été rétablie.', { sansHistorique: true });
    }
    restaurationEnCours = false;
  }

  const parametresInitials = new URLSearchParams(window.location.search);
  const demandeInitiale = {
    etape: parametresInitials.get('etape') || 'prestation',
    prestation: parametresInitials.get('prestation') || '',
    jour: parametresInitials.get('jour') || ''
  };
  appliquerEtatDemande(demandeInitiale, true);
  if (parametresInitials.has('etape')) {
    ouvrirPanneau('rendez-vous');
    window.requestAnimationFrame(() => doc.getElementById('rendez-vous').scrollIntoView({ behavior: 'auto', block: 'start' }));
  }
  enregistrerEtat('replace');

  window.addEventListener('popstate', (event) => {
    if (!event.state || typeof event.state !== 'object') return;
    const prestationRetablie = typeof event.state.prestation === 'string' ? event.state.prestation : '';
    const jourRetabli = typeof event.state.jour === 'string' ? event.state.jour : '';
    if (event.state.etape === etapeActuelle
      && prestationRetablie === prestationChoisie
      && jourRetabli === (jourChoisi ? jourChoisi.cle : '')) return;
    appliquerEtatDemande(event.state);
    ouvrirPanneau('rendez-vous');
  });

  const ciblesRevelation = [
    ...doc.querySelectorAll('.liste-prestations li'),
    ...doc.querySelectorAll('.horaires dl div'),
    ...doc.querySelectorAll('.liste-sources li'),
    doc.querySelector('.completer')
  ].filter(Boolean);

  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observeur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    ciblesRevelation.forEach((cible, index) => {
      cible.classList.add('revele');
      cible.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
      observeur.observe(cible);
    });
    racine.classList.add('observeur-actif');
  }

  const barre = doc.querySelector('.barre-fixe');
  const intro = doc.querySelector('.intro');
  const pied = doc.querySelector('.pied');
  if ('IntersectionObserver' in window) {
    let introVisible = true;
    let piedVisible = false;
    const actualiserBarre = () => barre.classList.toggle('est-visible', !introVisible && !piedVisible);
    const observeurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === intro) introVisible = entree.isIntersecting;
        if (entree.target === pied) piedVisible = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.01 });
    observeurBarre.observe(intro);
    observeurBarre.observe(pied);
  } else {
    barre.classList.add('est-visible');
  }
})();
