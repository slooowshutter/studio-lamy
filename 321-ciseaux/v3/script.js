(() => {
  const documentHtml = document.documentElement;
  const menuBouton = document.querySelector('.bouton-menu');
  const navigation = document.querySelector('#navigation-principale');
  const panneauEtapes = [...document.querySelectorAll('.panneau-etape')];
  const temporisateursSortie = new WeakMap();
  const boutonsEtapes = [...document.querySelectorAll('[data-aller-etape]')];
  const annonce = document.querySelector('#annonce-etape');
  const boutonConfirmer = document.querySelector('#confirmer-simulation');
  const boutonRecommencer = document.querySelector('#recommencer-simulation');
  const navigationEtapes = document.querySelector('.navigation-etapes');
  const resultat = document.querySelector('#resultat-simulation');
  const resumePrestation = document.querySelector('#resume-prestation');
  const resumeCreneau = document.querySelector('#resume-creneau');
  const barreMobile = document.querySelector('.barre-mobile');
  const dateCourte = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fuseauxOuverture = {
    0: [],
    1: [],
    2: [[540, 780], [840, 1140]],
    3: [[540, 720], [840, 1140]],
    4: [[540, 750], [840, 1140]],
    5: [[540, 780], [840, 1140]],
    6: [[540, 780]]
  };
  const etat = {
    etape: 1,
    maximumEtape: 1,
    prestation: '',
    duree: 0,
    jour: null,
    libelleJour: '',
    heure: ''
  };

  function preparerEntree() {
    const elementsHero = [...document.querySelectorAll('.entree-hero')];
    const ligneHero = document.querySelector('.entree-fil');
    requestAnimationFrame(() => {
      elementsHero.forEach((element, index) => {
        window.setTimeout(() => element.classList.add('est-visible'), index * 65);
      });
      if (ligneHero) window.setTimeout(() => ligneHero.classList.add('est-visible'), 180);
    });
  }

  function preparerRevelations() {
    const lignes = [
      ...document.querySelectorAll('.ligne-visite'),
      ...document.querySelectorAll('.liste-prestations li'),
      ...document.querySelectorAll('.liste-a-confirmer li')
    ];
    lignes.forEach((element, index) => {
      element.setAttribute('data-reveler', '');
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 60}ms`;
    });

    const cibles = [...document.querySelectorAll('[data-reveler], .fil-a-reveler')];
    if (!('IntersectionObserver' in window)) {
      cibles.forEach((element) => element.classList.add('est-visible'));
      return;
    }

    const observateur = new IntersectionObserver((entrees, observer) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          observer.unobserve(entree.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    cibles.forEach((element) => observateur.observe(element));
  }

  function afficherEtape(numero, annoncer = true) {
    const sortant = panneauEtapes.find((panneau) => Number(panneau.dataset.panneau) === etat.etape);
    const entrant = panneauEtapes.find((panneau) => Number(panneau.dataset.panneau) === numero);
    if (sortant && entrant && sortant !== entrant && !sortant.hidden) {
      sortant.inert = true;
      sortant.setAttribute('aria-hidden', 'true');
      sortant.classList.remove('est-visible');
      window.clearTimeout(temporisateursSortie.get(sortant));
      const delaiSortie = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 150 : 230;
      const temporisateur = window.setTimeout(() => {
        if (etat.etape !== Number(sortant.dataset.panneau)) sortant.hidden = true;
      }, delaiSortie);
      temporisateursSortie.set(sortant, temporisateur);
    }
    etat.etape = numero;
    etat.maximumEtape = Math.max(etat.maximumEtape, numero);
    resultat.hidden = true;
    resultat.classList.remove('est-visible');
    navigationEtapes.hidden = false;
    panneauEtapes.forEach((panneau) => {
      const actif = Number(panneau.dataset.panneau) === numero;
      if (actif) {
        window.clearTimeout(temporisateursSortie.get(panneau));
        panneau.hidden = false;
        panneau.inert = false;
        panneau.setAttribute('aria-hidden', 'false');
        panneau.classList.remove('est-visible');
        requestAnimationFrame(() => panneau.classList.add('est-visible'));
      }
    });
    boutonsEtapes.forEach((bouton) => {
      const numeroBouton = Number(bouton.dataset.allerEtape);
      bouton.disabled = numeroBouton > etat.maximumEtape;
      if (numeroBouton === numero) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    if (annoncer) {
      const titre = document.querySelector(`#titre-etape-${numero}`);
      annonce.textContent = `Étape ${numero} sur 4\u00a0: ${titre.textContent}.`;
      requestAnimationFrame(() => titre.focus());
    }
  }

  function minutesEnTexte(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, '0')}`;
  }

  function creerJours() {
    const liste = document.querySelector('#liste-jours');
    const fragment = document.createDocumentFragment();
    const aujourdHui = new Date();
    aujourdHui.setHours(12, 0, 0, 0);

    for (let decalage = 1; decalage <= 14; decalage += 1) {
      const jour = new Date(aujourdHui);
      jour.setDate(aujourdHui.getDate() + decalage);
      const ouvert = fuseauxOuverture[jour.getDay()].length > 0;
      const valeur = `${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, '0')}-${String(jour.getDate()).padStart(2, '0')}`;
      const etiquette = document.createElement('label');
      etiquette.className = `option-jour${ouvert ? '' : ' est-ferme'}`;

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'jour-simule';
      radio.value = valeur;
      radio.disabled = !ouvert;
      radio.setAttribute('aria-label', ouvert ? dateLongue.format(jour) : `${dateLongue.format(jour)}, fermé`);

      const nomJour = document.createElement('span');
      nomJour.className = 'jour-nom';
      nomJour.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(jour).replace('.', '');
      const dateJour = document.createElement('span');
      dateJour.className = 'jour-date';
      dateJour.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'numeric' }).format(jour);

      etiquette.append(radio, nomJour, dateJour);
      if (!ouvert) {
        const ferme = document.createElement('span');
        ferme.className = 'jour-ferme';
        ferme.textContent = 'Fermé';
        etiquette.append(ferme);
      }
      fragment.append(etiquette);
    }
    liste.append(fragment);
  }

  function convertirJour(valeur) {
    const [annee, mois, jour] = valeur.split('-').map(Number);
    return new Date(annee, mois - 1, jour, 12, 0, 0, 0);
  }

  function creerHeures() {
    const liste = document.querySelector('#liste-heures');
    liste.replaceChildren(Object.assign(document.createElement('legend'), {
      className: 'visuellement-cache',
      textContent: 'Heures simulées'
    }));
    if (!etat.jour) return;

    const date = convertirJour(etat.jour);
    const plages = fuseauxOuverture[date.getDay()];
    const fragment = document.createDocumentFragment();
    let compteur = 0;
    plages.forEach(([debut, fin]) => {
      for (let heure = debut; heure < fin; heure += 60) {
        if (etat.duree > 0 && heure + etat.duree > fin) continue;
        const id = `heure-simulee-${compteur}`;
        const etiquette = document.createElement('label');
        etiquette.className = 'option-heure';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'heure-simulee';
        radio.value = minutesEnTexte(heure);
        radio.id = id;
        radio.setAttribute('aria-label', `${minutesEnTexte(heure)}, créneau de démonstration`);
        const texte = document.createElement('span');
        texte.textContent = minutesEnTexte(heure);
        etiquette.append(radio, texte);
        fragment.append(etiquette);
        compteur += 1;
      }
    });
    liste.append(fragment);
  }

  function actualiserResume() {
    resumePrestation.textContent = etat.prestation || 'Aucune prestation';
    resumeCreneau.textContent = etat.libelleJour && etat.heure
      ? `${etat.libelleJour} · ${etat.heure}`
      : etat.libelleJour || 'Aucun créneau';
  }

  function rendreRecapitulatif() {
    const resume = `${etat.prestation}\n${etat.libelleJour} · ${etat.heure}`;
    document.querySelector('#recapitulatif-final').textContent = resume;
    document.querySelector('#resultat-recap').textContent = resume;
    actualiserResume();
  }

  function reglerMenu(ouvert, rendreFocus = false) {
    if (!menuBouton || !navigation) return;
    menuBouton.setAttribute('aria-expanded', String(ouvert));
    menuBouton.setAttribute('aria-label', ouvert ? 'Masquer le menu' : 'Afficher le menu');
    navigation.classList.toggle('est-ouverte', ouvert);
    menuBouton.querySelector('.menu-ouvert').hidden = ouvert;
    menuBouton.querySelector('.menu-ferme').hidden = !ouvert;
    if (ouvert) navigation.querySelector('a')?.focus();
    else if (rendreFocus) menuBouton.focus();
  }

  function reglerBarreMobile() {
    if (!barreMobile) return;
    if (!('IntersectionObserver' in window)) {
      if (window.matchMedia('(max-width: 760px)').matches) barreMobile.classList.add('est-visible');
      return;
    }
    const sections = {
      hero: false,
      reservation: false,
      pied: false
    };
    const mettreAJour = () => {
      const mobile = window.matchMedia('(max-width: 760px)').matches;
      barreMobile.classList.toggle('est-visible', mobile && sections.hero && !sections.reservation && !sections.pied);
    };
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target.id === 'accueil') sections.hero = !entree.isIntersecting;
        if (entree.target.id === 'reservation') sections.reservation = entree.isIntersecting;
        if (entree.target.id === 'pied-page') sections.pied = entree.isIntersecting;
      });
      mettreAJour();
    }, { threshold: 0.08 });
    ['accueil', 'reservation', 'pied-page'].forEach((identifiant) => {
      const section = document.getElementById(identifiant);
      if (section) observateur.observe(section);
    });
    window.addEventListener('resize', mettreAJour, { passive: true });
  }

  function recommencer() {
    etat.etape = 1;
    etat.maximumEtape = 1;
    etat.prestation = '';
    etat.duree = 0;
    etat.jour = null;
    etat.libelleJour = '';
    etat.heure = '';
    document.querySelectorAll('input[name="prestation"], input[name="jour-simule"], input[name="heure-simule"]').forEach((entree) => {
      entree.checked = false;
    });
    resultat.hidden = true;
    panneauEtapes.forEach((panneau) => { panneau.hidden = false; });
    document.querySelector('[data-panneau="2"]').hidden = true;
    document.querySelector('[data-panneau="3"]').hidden = true;
    document.querySelector('[data-panneau="4"]').hidden = true;
    navigationEtapes.hidden = false;
    const suite = document.querySelector('[data-panneau="1"] [data-suivant]');
    suite.disabled = true;
    actualiserResume();
    afficherEtape(1, false);
    annonce.textContent = 'Choisissez une prestation pour recommencer la simulation.';
    document.querySelector('#titre-etape-1').focus();
  }

  menuBouton?.addEventListener('click', () => {
    const ouvert = menuBouton.getAttribute('aria-expanded') !== 'true';
    reglerMenu(ouvert);
  });

  menuBouton?.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') {
      reglerMenu(false, true);
    }
  });

  navigation?.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') {
      reglerMenu(false, true);
    }
  });

  navigation?.querySelectorAll('a').forEach((lien) => {
    lien.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 760px)').matches) reglerMenu(false);
    });
  });

  document.querySelectorAll('input[name="prestation"]').forEach((entree) => {
    entree.addEventListener('change', () => {
      etat.prestation = entree.value;
      etat.duree = Number(entree.dataset.duree || 0);
      etat.maximumEtape = 1;
      etat.jour = null;
      etat.libelleJour = '';
      etat.heure = '';
      document.querySelectorAll('input[name="jour-simule"], input[name="heure-simule"]').forEach((radio) => { radio.checked = false; });
      document.querySelector('[data-panneau="1"] [data-suivant]').disabled = false;
      document.querySelector('[data-panneau="2"] [data-suivant]').disabled = true;
      document.querySelector('[data-panneau="3"] [data-suivant]').disabled = true;
      boutonsEtapes.forEach((bouton) => { bouton.disabled = Number(bouton.dataset.allerEtape) > 1; });
      actualiserResume();
      annonce.textContent = `${etat.prestation} sélectionné. Les jours fermés sont indiqués.`;
    });
  });

  document.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etat.etape === 1 && etat.prestation) afficherEtape(2);
      else if (etat.etape === 2 && etat.jour) {
        creerHeures();
        afficherEtape(3);
      } else if (etat.etape === 3 && etat.heure) {
        rendreRecapitulatif();
        afficherEtape(4);
      }
    });
  });

  document.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(Math.max(1, etat.etape - 1)));
  });

  boutonsEtapes.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.allerEtape);
      if (bouton.disabled) return;
      if (numero === 3) creerHeures();
      if (numero === 4) rendreRecapitulatif();
      afficherEtape(numero);
    });
  });

  document.querySelector('#liste-jours').addEventListener('change', (evenement) => {
    const entree = evenement.target.closest('input[name="jour-simule"]');
    if (!entree) return;
    etat.jour = entree.value;
    etat.maximumEtape = 2;
    etat.libelleJour = dateLongue.format(convertirJour(etat.jour));
    etat.heure = '';
    document.querySelector('[data-panneau="2"] [data-suivant]').disabled = false;
    document.querySelector('[data-panneau="3"] [data-suivant]').disabled = true;
    boutonsEtapes.forEach((bouton) => { bouton.disabled = Number(bouton.dataset.allerEtape) > 2; });
    actualiserResume();
    annonce.textContent = `${etat.libelleJour} sélectionné. Choisissez une heure simulée.`;
  });

  document.querySelector('#liste-heures').addEventListener('change', (evenement) => {
    const entree = evenement.target.closest('input[name="heure-simule"]');
    if (!entree) return;
    etat.heure = entree.value;
    etat.maximumEtape = 3;
    document.querySelector('[data-panneau="3"] [data-suivant]').disabled = false;
    boutonsEtapes.forEach((bouton) => { bouton.disabled = Number(bouton.dataset.allerEtape) > 3; });
    actualiserResume();
    annonce.textContent = `${etat.heure} sélectionnée pour le ${etat.libelleJour}. Créneau de démonstration.`;
  });

  boutonConfirmer?.addEventListener('click', () => {
    panneauEtapes.forEach((panneau) => {
      panneau.inert = true;
      panneau.setAttribute('aria-hidden', 'true');
      panneau.hidden = true;
      panneau.classList.remove('est-visible');
    });
    navigationEtapes.hidden = true;
    resultat.hidden = false;
    requestAnimationFrame(() => resultat.classList.add('est-visible'));
    annonce.textContent = 'Simulation terminée. Aucun rendez-vous n’a été envoyé.';
    document.querySelector('#titre-resultat').focus();
  });

  boutonRecommencer?.addEventListener('click', recommencer);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.entree-hero, .entree-fil').forEach((element) => element.classList.add('est-visible'));
  } else {
    preparerEntree();
  }
  preparerRevelations();
  creerJours();
  afficherEtape(1, false);
  document.querySelector('[data-panneau="1"]').classList.add('est-visible');
  reglerBarreMobile();
})();
