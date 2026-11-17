(() => {
  const corps = document.body;
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');

  const hero = document.querySelector('.hero');
  if (hero) {
    requestAnimationFrame(() => {
      hero.classList.add('hero--pret');
      requestAnimationFrame(() => hero.classList.add('hero--allume'));
    });
  }

  const menuBouton = document.querySelector('.menu-bouton');
  const menu = document.querySelector('#menu-mobile');
  if (menuBouton && menu) {
    const elementsEnArriere = [document.querySelector('.apercu'), document.querySelector('main'), document.querySelector('.pied'), document.querySelector('.barre-mobile')].filter(Boolean);
    const fermerMenu = (rendreFocus = false) => {
      menuBouton.setAttribute('aria-expanded', 'false');
      menuBouton.querySelector('.menu-bouton__texte').textContent = 'Ouvrir le menu';
      elementsEnArriere.forEach((element) => { element.inert = false; });
      menu.hidden = true;
      if (rendreFocus) menuBouton.focus();
    };
    menuBouton.addEventListener('click', () => {
      const ouvert = menuBouton.getAttribute('aria-expanded') === 'true';
      if (ouvert) {
        fermerMenu(true);
        return;
      }
      menu.hidden = false;
      menuBouton.setAttribute('aria-expanded', 'true');
      menuBouton.querySelector('.menu-bouton__texte').textContent = 'Fermer le menu';
      elementsEnArriere.forEach((element) => { element.inert = true; });
      menu.querySelector('a').focus();
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) fermerMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
      if (event.matches && menuBouton.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    });
  }

  const elementsAReveler = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-in');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    elementsAReveler.forEach((element) => observateur.observe(element));
    corps.classList.add('reveals-ready');
  } else {
    elementsAReveler.forEach((element) => element.classList.add('is-in'));
  }

  const barreMobile = document.querySelector('[data-barre]');
  if (barreMobile && 'IntersectionObserver' in window) {
    const visibilite = new Map();
    const mettreAJourBarre = () => {
      const boutonHeroVisible = visibilite.get(document.querySelector('.hero__actions')) ?? true;
      const simulationVisible = visibilite.get(document.querySelector('.rendez-vous')) ?? false;
      const piedVisible = visibilite.get(document.querySelector('.pied')) ?? false;
      barreMobile.dataset.cachee = boutonHeroVisible || simulationVisible || piedVisible ? 'oui' : 'non';
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => visibilite.set(entree.target, entree.isIntersecting));
      mettreAJourBarre();
    }, { threshold: 0.01 });
    [document.querySelector('.hero__actions'), document.querySelector('.rendez-vous'), document.querySelector('.pied')].filter(Boolean).forEach((element) => observateurBarre.observe(element));
  }

  const formulaire = document.querySelector('#formulaire-simulation');
  if (!formulaire) return;

  const cadreSimulation = document.querySelector('#simulation-cadre');
  const listeJours = document.querySelector('#liste-jours');
  const listeHeures = document.querySelector('#liste-heures');
  const recapitulatif = document.querySelector('#recapitulatif');
  const annonce = document.querySelector('#annonce-etape');
  const succes = document.querySelector('#simulation-succes');
  const boutonRecommencer = document.querySelector('#recommencer');
  const boutonEnvoi = formulaire.querySelector('[type="submit"]');
  const panneauxEtapes = [...formulaire.querySelectorAll('.etape')];
  const liensEtapes = [...document.querySelectorAll('[data-etape-lien]')];
  const erreurs = {
    activite: document.querySelector('#erreur-activite'),
    jour: document.querySelector('#erreur-jour'),
    heure: document.querySelector('#erreur-heure'),
  };
  const choix = { activite: '', jour: null, heure: '' };
  let etapeCourante = 1;
  let etapeAccessible = 1;
  let enTransition = false;

  cadreSimulation.dataset.pret = 'oui';
  boutonEnvoi.disabled = false;

  const heuresOuverture = (jour) => {
    if (jour === 0) return [[13 * 60 + 30, 19 * 60 + 30]];
    if (jour === 5) return [[9 * 60, 13 * 60], [14 * 60 + 45, 19 * 60 + 30]];
    return [[9 * 60, 19 * 60 + 30]];
  };

  const dateAmiens = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(new Date());
    const valeur = (type) => Number(morceaux.find((partie) => partie.type === type)?.value);
    return new Date(Date.UTC(valeur('year'), valeur('month') - 1, valeur('day'), 12));
  };

  const maintenantAmiens = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date());
    const valeur = (type) => Number(morceaux.find((partie) => partie.type === type)?.value);
    return valeur('hour') * 60 + valeur('minute');
  };

  const cleDate = (date) => date.toISOString().slice(0, 10);
  const libelleDateLong = (date) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
  const libelleDateCourt = (date) => new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  }).format(date).replace('.', '');
  const formaterHeure = (minutes) => {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(heure).padStart(2, '0')} h ${String(minute).padStart(2, '0')}`;
  };
  const minutesPourDate = (date) => {
    const maintenant = dateAmiens();
    if (cleDate(date) !== cleDate(maintenant)) return null;
    return maintenantAmiens();
  };

  const fabriquerHeures = (date) => {
    const heureActuelle = minutesPourDate(date);
    const resultats = [];
    heuresOuverture(date.getUTCDay()).forEach(([debut, fin]) => {
      for (let heure = debut; heure < fin; heure += 30) {
        if (heureActuelle !== null && heure <= heureActuelle) continue;
        resultats.push(heure);
      }
    });
    return resultats;
  };

  const vider = (element) => { while (element.firstChild) element.removeChild(element.firstChild); };
  const mettreAJourRecapitulatif = () => {
    vider(recapitulatif);
    const lignes = [
      ['Activité', choix.activite || 'À préciser'],
      ['Jour', choix.jour ? libelleDateLong(choix.jour) : 'À choisir'],
      ['Heure', choix.heure || 'À choisir'],
    ];
    lignes.forEach(([titre, contenu]) => {
      const terme = document.createElement('dt');
      terme.textContent = titre;
      const valeur = document.createElement('dd');
      valeur.textContent = contenu;
      recapitulatif.append(terme, valeur);
    });
  };

  const mettreAJourLiensEtapes = () => {
    liensEtapes.forEach((bouton) => {
      const numero = Number(bouton.dataset.etapeLien);
      if (numero === etapeCourante) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      bouton.disabled = numero > etapeAccessible || numero === etapeCourante;
    });
  };

  const rendreEtapeActive = (numero, rendreFocus = true) => {
    etapeCourante = numero;
    panneauxEtapes.forEach((panneau) => {
      const actif = Number(panneau.dataset.etape) === numero;
      panneau.setAttribute('aria-hidden', String(!actif));
      panneau.classList.remove('is-sortie', 'is-entree');
    });
    mettreAJourLiensEtapes();
    mettreAJourRecapitulatif();
    annonce.textContent = `Étape ${numero} sur 4 : ${panneauxEtapes[numero - 1].querySelector('h4').textContent}`;
    if (rendreFocus) panneauxEtapes[numero - 1].querySelector('h4').focus({ preventScroll: true });
  };

  const allerAEtape = (numero) => {
    if (enTransition || numero === etapeCourante || numero > etapeAccessible) return;
    const ancienne = panneauxEtapes[etapeCourante - 1];
    const nouvelle = panneauxEtapes[numero - 1];
    ancienne.classList.remove('is-entree');
    ancienne.classList.add('is-sortie');
    enTransition = true;
    const delai = reduireMouvement.matches ? 0 : 230;
    window.setTimeout(() => {
      ancienne.classList.remove('is-sortie');
      ancienne.setAttribute('aria-hidden', 'true');
      nouvelle.setAttribute('aria-hidden', 'false');
      nouvelle.classList.add('is-entree');
      etapeCourante = numero;
      mettreAJourLiensEtapes();
      mettreAJourRecapitulatif();
      annonce.textContent = `Étape ${numero} sur 4 : ${nouvelle.querySelector('h4').textContent}`;
      requestAnimationFrame(() => {
        nouvelle.classList.remove('is-entree');
        nouvelle.querySelector('h4').focus({ preventScroll: true });
      });
      enTransition = false;
    }, delai);
  };

  const dessinerJours = () => {
    vider(listeJours);
    const premierJour = dateAmiens();
    for (let decalage = 0; decalage < 10; decalage += 1) {
      const date = new Date(premierJour);
      date.setUTCDate(date.getUTCDate() + decalage);
      const heures = fabriquerHeures(date);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.disabled = heures.length === 0;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${libelleDateLong(date)}${heures.length ? '' : ', aucune heure restante dans la plage publiée'}`);
      const dateCourte = document.createElement('span');
      dateCourte.textContent = libelleDateCourt(date);
      const indice = document.createElement('small');
      indice.textContent = decalage === 0 ? (heures.length ? 'Aujourd’hui' : 'Terminé') : (heures.length ? 'À confirmer' : 'Terminé');
      bouton.append(dateCourte, indice);
      bouton.addEventListener('click', () => {
        if (bouton.disabled) return;
        choix.jour = date;
        choix.heure = '';
        listeJours.querySelectorAll('.jour').forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
        document.querySelector('#erreur-jour').hidden = true;
        dessinerHeures(date);
        mettreAJourRecapitulatif();
      });
      listeJours.append(bouton);
    }
  };

  const dessinerHeures = (date) => {
    vider(listeHeures);
    fabriquerHeures(date).forEach((heure) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      bouton.textContent = formaterHeure(heure);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.addEventListener('click', () => {
        choix.heure = formaterHeure(heure);
        listeHeures.querySelectorAll('.heure').forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
        document.querySelector('#erreur-heure').hidden = true;
        mettreAJourRecapitulatif();
      });
      listeHeures.append(bouton);
    });
  };

  const selectionner = (nom) => formulaire.querySelector(`input[name="${nom}"]:checked`);
  formulaire.querySelectorAll('input[name="activite"]').forEach((champ) => {
    champ.addEventListener('change', () => {
      choix.activite = champ.value;
      erreurs.activite.hidden = true;
      mettreAJourRecapitulatif();
    });
  });

  const verifierEtape = (numero) => {
    if (numero === 1 && !selectionner('activite')) {
      erreurs.activite.hidden = false;
      selectionner('activite')?.focus();
      return false;
    }
    if (numero === 2 && !choix.jour) {
      erreurs.jour.hidden = false;
      listeJours.querySelector('.jour:not(:disabled)')?.focus();
      return false;
    }
    if (numero === 3 && !choix.heure) {
      erreurs.heure.hidden = false;
      listeHeures.querySelector('.heure')?.focus();
      return false;
    }
    return true;
  };

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!verifierEtape(etapeCourante)) return;
      const suivante = etapeCourante + 1;
      etapeAccessible = Math.max(etapeAccessible, suivante);
      allerAEtape(suivante);
    });
  });
  formulaire.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerAEtape(Math.max(1, etapeCourante - 1)));
  });
  liensEtapes.forEach((bouton) => {
    bouton.addEventListener('click', () => allerAEtape(Number(bouton.dataset.etapeLien)));
  });

  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');
  const numeroValide = (valeur) => /^0[67]\d{8}$/.test(valeur.replace(/\D/g, ''));
  const verifierCoordonnees = () => {
    const prenomValide = champPrenom.value.trim().length > 0;
    const telephoneCorrect = numeroValide(champTelephone.value);
    erreurPrenom.hidden = prenomValide;
    erreurTelephone.hidden = telephoneCorrect;
    champPrenom.setAttribute('aria-invalid', String(!prenomValide));
    champTelephone.setAttribute('aria-invalid', String(!telephoneCorrect));
    return prenomValide && telephoneCorrect;
  };
  [champPrenom, champTelephone].forEach((champ) => champ.addEventListener('input', () => {
    if (champ === champPrenom && champ.value.trim()) erreurPrenom.hidden = true;
    if (champ === champTelephone && numeroValide(champ.value)) erreurTelephone.hidden = true;
    champ.setAttribute('aria-invalid', 'false');
    document.querySelector('#erreur-coordonnees').hidden = true;
  }));

  formulaire.addEventListener('submit', (event) => {
    event.preventDefault();
    if (etapeCourante !== 4) return;
    if (!verifierCoordonnees()) {
      document.querySelector('#erreur-coordonnees').hidden = false;
      (champPrenom.value.trim() ? champTelephone : champPrenom).focus();
      return;
    }
    const detail = document.createElement('p');
    detail.className = 'recap-succes';
    detail.textContent = `${choix.activite} · ${choix.jour ? libelleDateLong(choix.jour) : ''} · ${choix.heure}`;
    succes.querySelector('.sur-titre').insertAdjacentElement('afterend', detail);
    cadreSimulation.dataset.terminee = 'oui';
    succes.hidden = false;
    succes.focus();
    annonce.textContent = 'Simulation terminée. Rien n’a été envoyé.';
  });

  const recommencer = () => {
    formulaire.reset();
    choix.activite = '';
    choix.jour = null;
    choix.heure = '';
    etapeCourante = 1;
    etapeAccessible = 1;
    delete cadreSimulation.dataset.terminee;
    vider(listeHeures);
    const ancienDetail = succes.querySelector('.recap-succes');
    if (ancienDetail) ancienDetail.remove();
    succes.hidden = true;
    panneauxEtapes.forEach((panneau, index) => {
      panneau.setAttribute('aria-hidden', String(index !== 0));
      panneau.classList.remove('is-sortie', 'is-entree');
    });
    liensEtapes.forEach((bouton) => { bouton.disabled = false; });
    document.querySelector('#erreur-coordonnees').hidden = true;
    Object.values(erreurs).forEach((erreur) => { erreur.hidden = true; });
    dessinerJours();
    mettreAJourLiensEtapes();
    mettreAJourRecapitulatif();
    panneauxEtapes[0].querySelector('h4').focus();
  };
  boutonRecommencer.addEventListener('click', recommencer);

  dessinerJours();
  mettreAJourRecapitulatif();
  rendreEtapeActive(1, false);
})();
