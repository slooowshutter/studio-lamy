(() => {
  const boutonMenu = document.querySelector('.menu-bouton');
  const navigationMobile = document.querySelector('#navigation-mobile');
  const texteMenu = document.querySelector('[data-texte-menu]');

  function fermerMenu(rendreLeFocus = false) {
    if (!boutonMenu || !navigationMobile) return;
    boutonMenu.setAttribute('aria-expanded', 'false');
    navigationMobile.hidden = true;
    if (texteMenu) texteMenu.textContent = 'Menu';
    if (rendreLeFocus) boutonMenu.focus();
  }

  boutonMenu?.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    boutonMenu.setAttribute('aria-expanded', String(!ouvert));
    navigationMobile.hidden = ouvert;
    if (texteMenu) texteMenu.textContent = ouvert ? 'Menu' : 'Fermer';
    if (!ouvert) navigationMobile.querySelector('a')?.focus();
  });

  navigationMobile?.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerMenu();
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonMenu?.getAttribute('aria-expanded') === 'true') {
      fermerMenu(true);
    }
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('[data-entree]').forEach((element) => element.classList.add('is-visible'));
  });

  const revelations = [...document.querySelectorAll('[data-revelation]')];
  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    const indexParType = new Map();
    revelations.forEach((element) => {
      const type = element.dataset.revelation;
      const index = indexParType.get(type) || 0;
      indexParType.set(type, index + 1);
      element.style.transitionDelay = `${index * 55}ms`;
      observateurRevelation.observe(element);
    });
  } else {
    revelations.forEach((element) => element.classList.add('is-visible'));
  }

  const barreMobile = document.querySelector('.barre-mobile');
  const ciblesBarre = [document.querySelector('.hero__appel'), document.querySelector('#reserver'), document.querySelector('#pied')].filter(Boolean);
  if (barreMobile) {
    barreMobile.setAttribute('aria-hidden', 'true');
    barreMobile.querySelectorAll('a').forEach((lien) => { lien.tabIndex = -1; });
  }
  if (barreMobile && 'IntersectionObserver' in window && ciblesBarre.length) {
    const visibles = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) visibles.add(entree.target);
        else visibles.delete(entree.target);
      });
      barreMobile.classList.toggle('is-cachee', visibles.size > 0);
      barreMobile.setAttribute('aria-hidden', String(visibles.size > 0));
      if (visibles.size > 0) barreMobile.querySelectorAll('a').forEach((lien) => { lien.tabIndex = -1; });
      else barreMobile.querySelectorAll('a').forEach((lien) => { lien.removeAttribute('tabindex'); });
    }, { threshold: 0.12 });
    ciblesBarre.forEach((cible) => observateurBarre.observe(cible));
  } else if (barreMobile) {
    barreMobile.classList.remove('is-cachee');
    barreMobile.removeAttribute('aria-hidden');
    barreMobile.querySelectorAll('a').forEach((lien) => { lien.removeAttribute('tabindex'); });
  }

  const formulaire = document.querySelector('#formulaire-reservation');
  if (!formulaire) return;

  const etiquettePrestation = {
    'femme-courts': { nom: 'Conseil, shampoing, coupe et brushing', duree: 40, categorie: 'Femmes · cheveux courts' },
    'hommes-classique': { nom: 'Conseil, shampoing, coupe classique', duree: 30, categorie: 'Hommes' },
    garcons: { nom: 'Shampoing, coupe, séchage Garçons -12 ans', duree: 20, categorie: 'Enfants' }
  };
  const nomsEtapes = ['prestation', 'jour', 'heure', 'coordonnées'];
  const panneaux = [...formulaire.querySelectorAll('[data-etape]')];
  const boutonsEtapes = [...document.querySelectorAll('[data-aller-etape]')];
  const etat = { prestation: 'femme-courts', jour: '', heure: '', etape: 0, maximum: 0, transition: false };
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  const annonceEtape = document.querySelector('[data-annonce-etape]');
  const champPrenom = formulaire.querySelector('#prenom');
  const champTelephone = formulaire.querySelector('#telephone');
  const erreurs = {
    prestation: document.querySelector('[data-erreur-prestation]'),
    jour: document.querySelector('[data-erreur-jour]'),
    heure: document.querySelector('[data-erreur-heure]'),
    prenom: document.querySelector('[data-erreur-prenom]'),
    telephone: document.querySelector('[data-erreur-telephone]')
  };

  function elementRadio(nom) {
    return formulaire.querySelector(`input[name="${nom}"]:checked`);
  }

  function prestationActuelle() {
    return etiquettePrestation[etat.prestation] || etiquettePrestation['femme-courts'];
  }

  function dateParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    return {
      annee: Number(valeurs.year), mois: Number(valeurs.month), jour: Number(valeurs.day),
      heure: Number(valeurs.hour), minute: Number(valeurs.minute)
    };
  }

  function cleDate(date) {
    const annee = date.getUTCFullYear();
    const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
    const jour = String(date.getUTCDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function datesSimulees() {
    const maintenant = dateParis();
    const debut = Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour);
    const liste = [];
    for (let ecart = 0; ecart < 14; ecart += 1) {
      liste.push(new Date(debut + ecart * 86400000));
    }
    return liste;
  }

  function heuresOuverture(jourSemaine) {
    if (jourSemaine >= 2 && jourSemaine <= 5) return { debut: 9 * 60 + 30, fin: 19 * 60, nom: 'Mardi au vendredi' };
    if (jourSemaine === 6) return { debut: 9 * 60, fin: 16 * 60, nom: 'Samedi' };
    return null;
  }

  function heureTexte(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute === 0 ? `${heure} h` : `${heure} h 30`;
  }

  function etatJour(date) {
    const semaine = date.getUTCDay();
    if (semaine === 0) return { type: 'ferme', texte: 'Fermé', aria: 'fermé' };
    if (semaine === 1) return { type: 'incertain', texte: 'À confirmer', aria: 'horaires à confirmer' };
    return { type: 'ouvert', texte: 'Horaires Planity', aria: 'horaires publiés sur Planity' };
  }

  function libelleJour(date, court = false) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: court ? 'short' : 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
    }).format(date).replace(/\.$/, '');
  }

  function estIndisponibleDansLaDemonstration(cle, minutes) {
    const chiffres = cle.replaceAll('-', '').split('').reduce((somme, chiffre) => somme + Number(chiffre), 0);
    const sommeNom = etat.prestation.split('').reduce((somme, lettre) => somme + lettre.charCodeAt(0), 0);
    return (chiffres + minutes + sommeNom) % 5 === 0;
  }

  function heuresDuJour(cle, prestation = prestationActuelle()) {
    if (!cle) return [];
    const [annee, mois, jour] = cle.split('-').map(Number);
    const date = new Date(Date.UTC(annee, mois - 1, jour));
    const plage = heuresOuverture(date.getUTCDay());
    if (!plage) return [];
    const aujourdHui = dateParis();
    const memeJour = cle === `${aujourdHui.annee}-${String(aujourdHui.mois).padStart(2, '0')}-${String(aujourdHui.jour).padStart(2, '0')}`;
    const maintenantMinutes = aujourdHui.heure * 60 + aujourdHui.minute;
    const liste = [];
    for (let minutes = plage.debut; minutes + prestation.duree <= plage.fin; minutes += 30) {
      const dejaPasse = memeJour && minutes <= maintenantMinutes;
      liste.push({
        minutes,
        passe: dejaPasse,
        indisponible: !dejaPasse && estIndisponibleDansLaDemonstration(cle, minutes)
      });
    }
    return liste;
  }

  function mettreAJourResume() {
    const prestation = prestationActuelle();
    document.querySelector('[data-resume-prestation]').textContent = prestation.nom;
    const dateChoisie = etat.jour ? new Date(`${etat.jour}T00:00:00Z`) : null;
    document.querySelector('[data-resume-jour]').textContent = dateChoisie ? libelleJour(dateChoisie) : 'À choisir';
    const minutes = etat.heure === '' ? null : Number(etat.heure);
    document.querySelector('[data-resume-heure]').textContent = minutes === null ? 'À choisir' : heureTexte(minutes);
  }

  function creerJour(date) {
    const cle = cleDate(date);
    const statut = etatJour(date);
    const jour = document.createElement('label');
    jour.className = `jour jour--${statut.type}`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'jour';
    radio.value = cle;
    radio.disabled = statut.type !== 'ouvert';
    radio.checked = etat.jour === cle;
    radio.setAttribute('aria-label', `${libelleJour(date)}, ${statut.aria}`);
    const face = document.createElement('span');
    face.className = 'jour__face';
    const nom = document.createElement('span');
    nom.className = 'jour__nom';
    nom.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace(/\.$/, '');
    const numero = document.createElement('span');
    numero.className = 'jour__date';
    numero.textContent = String(date.getUTCDate());
    const etatElement = document.createElement('span');
    etatElement.className = 'jour__etat';
    etatElement.textContent = statut.type === 'ferme' ? 'Fermé' : statut.type === 'incertain' ? 'À confirmer' : 'Choisir';
    face.append(nom, numero, etatElement);
    jour.append(radio, face);
    return jour;
  }

  function dessinerJours() {
    const liste = document.querySelector('[data-liste-jours]');
    liste.replaceChildren(...datesSimulees().map(creerJour));
  }

  function creerGroupeHeures(nom) {
    const groupe = document.createElement('section');
    groupe.className = 'groupe-heures';
    const titre = document.createElement('h4');
    titre.textContent = nom;
    const grille = document.createElement('div');
    grille.className = 'grille-heures';
    groupe.append(titre, grille);
    return { groupe, grille };
  }

  function creerHeure(heure, cle) {
    const indisponible = heure.passe || heure.indisponible;
    const raison = heure.passe ? 'Heure déjà passée' : 'Non proposé dans cette démonstration';
    const etiquette = document.createElement('label');
    etiquette.className = 'heure';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'heure';
    radio.value = String(heure.minutes);
    radio.disabled = indisponible;
    radio.checked = etat.heure === String(heure.minutes) && !indisponible;
    radio.setAttribute('aria-label', `${heureTexte(heure.minutes)}, ${indisponible ? raison.toLowerCase() : 'proposé dans cette démonstration'}`);
    const face = document.createElement('span');
    face.className = 'heure__face';
    const temps = document.createElement('time');
    temps.dateTime = `${cle}T${String(Math.floor(heure.minutes / 60)).padStart(2, '0')}:${String(heure.minutes % 60).padStart(2, '0')}`;
    temps.textContent = heureTexte(heure.minutes);
    face.append(temps);
    if (indisponible) {
      const mention = document.createElement('small');
      mention.className = 'heure__raison';
      mention.textContent = raison;
      face.append(mention);
    }
    etiquette.append(radio, face);
    return etiquette;
  }

  function dessinerHeures() {
    const conteneur = document.querySelector('[data-liste-heures]');
    conteneur.replaceChildren();
    const plage = etat.jour ? heuresOuverture(new Date(`${etat.jour}T00:00:00Z`).getUTCDay()) : null;
    if (!etat.jour || !plage) {
      const vide = document.createElement('p');
      vide.className = 'jours__vide';
      vide.textContent = 'Choisissez un jour avec des horaires publiés pour voir les heures de démonstration.';
      conteneur.append(vide);
      return;
    }

    const disponibles = heuresDuJour(etat.jour);
    const avantMidi = disponibles.filter((heure) => heure.minutes < 12 * 60);
    const apresMidi = disponibles.filter((heure) => heure.minutes >= 12 * 60);
    [[avantMidi, 'Matin'], [apresMidi, 'Après-midi']].forEach(([heures, nom]) => {
      if (!heures.length) return;
      const { groupe, grille } = creerGroupeHeures(nom);
      heures.forEach((heure) => grille.append(creerHeure(heure, etat.jour)));
      conteneur.append(groupe);
    });
    if (!disponibles.some((heure) => !heure.passe)) {
      const vide = document.createElement('p');
      vide.className = 'jours__vide';
      vide.textContent = 'Il ne reste pas d’heure dans cette démonstration pour ce jour. Choisissez une autre date.';
      conteneur.append(vide);
    }
  }

  function actualiserProgression() {
    boutonsEtapes.forEach((bouton) => {
      const numero = Number(bouton.dataset.allerEtape);
      bouton.disabled = numero > etat.maximum || numero > etat.etape || etat.etape === 4;
      bouton.removeAttribute('aria-current');
      if (numero === etat.etape || (etat.etape === 4 && numero === 3)) bouton.setAttribute('aria-current', 'step');
    });
  }

  function annoncerEtape(numero) {
    if (!annonceEtape) return;
    if (numero === 4) {
      annonceEtape.textContent = 'Démonstration terminée. Aucun rendez-vous n’a été réservé.';
      return;
    }
    annonceEtape.textContent = `Étape ${numero + 1} sur 4 — ${nomsEtapes[numero]}.`;
  }

  function montrerEtape(numero, rendreLeFocus = true) {
    const ancienne = panneaux.find((panneau) => !panneau.hidden);
    const nouvelle = panneaux.find((panneau) => Number(panneau.dataset.etape) === numero);
    if (!nouvelle || ancienne === nouvelle || etat.transition) return;
    etat.etape = numero;
    etat.maximum = Math.max(etat.maximum, Math.min(numero, 3));
    actualiserProgression();
    annoncerEtape(numero);

    const activer = () => {
      if (ancienne) {
        ancienne.hidden = true;
        ancienne.classList.remove('is-sortante', 'is-active');
      }
      nouvelle.hidden = false;
      nouvelle.classList.add('is-entrante');
      requestAnimationFrame(() => {
        nouvelle.classList.remove('is-entrante');
        nouvelle.classList.add('is-active');
      });
      etat.transition = false;
      if (rendreLeFocus) nouvelle.querySelector('h3')?.focus({ preventScroll: true });
    };

    if (reduireMouvement.matches || !ancienne) {
      panneaux.forEach((panneau) => { panneau.hidden = panneau !== nouvelle; });
      nouvelle.classList.remove('is-entrante', 'is-sortante');
      nouvelle.classList.add('is-active');
      if (rendreLeFocus) nouvelle.querySelector('h3')?.focus({ preventScroll: true });
      return;
    }

    etat.transition = true;
    ancienne.classList.add('is-sortante');
    window.setTimeout(activer, 80);
  }

  function montrerErreur(cle, visible) {
    const champ = cle === 'prenom' ? champPrenom : cle === 'telephone' ? champTelephone : null;
    if (erreurs[cle]) erreurs[cle].hidden = !visible;
    if (champ) {
      if (visible) champ.setAttribute('aria-invalid', 'true');
      else champ.removeAttribute('aria-invalid');
    }
  }

  function mobileValide(valeur) {
    const normalise = valeur.replace(/[\s().-]/g, '');
    return /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(normalise);
  }

  champPrenom.addEventListener('input', () => {
    if (champPrenom.value.trim()) montrerErreur('prenom', false);
  });
  champTelephone.addEventListener('input', () => {
    if (mobileValide(champTelephone.value)) montrerErreur('telephone', false);
  });

  function choisirPrestation(valeur) {
    if (!etiquettePrestation[valeur]) return;
    etat.prestation = valeur;
    etat.heure = '';
    const radio = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
    if (radio) radio.checked = true;
    montrerErreur('prestation', false);
    mettreAJourResume();
    if (etat.jour) dessinerHeures();
  }

  function mettreAJourRecapitulatif() {
    const prestation = prestationActuelle();
    const date = etat.jour ? new Date(`${etat.jour}T00:00:00Z`) : null;
    const heure = etat.heure === '' ? '' : heureTexte(Number(etat.heure));
    const recap = document.querySelector('[data-recap-final]');
    recap.textContent = date ? `${prestation.nom} · ${prestation.duree} min · ${libelleJour(date)}${heure ? ` à ${heure}` : ''}.` : '';
  }

  formulaire.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      choisirPrestation(radio.value);
    });
  });

  document.querySelectorAll('[data-choisir]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etat.transition) return;
      choisirPrestation(bouton.dataset.choisir);
      etat.etape = 0;
      etat.maximum = 0;
      panneaux.forEach((panneau) => { panneau.hidden = Number(panneau.dataset.etape) !== 0; });
      panneaux.forEach((panneau) => panneau.classList.remove('is-sortante', 'is-entrante', 'is-active'));
      panneaux[0].classList.add('is-active');
      actualiserProgression();
      annoncerEtape(0);
      document.querySelector('#reserver').scrollIntoView({ behavior: reduireMouvement.matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => panneaux[0].querySelector('h3')?.focus({ preventScroll: true }), reduireMouvement.matches ? 0 : 280);
    });
  });

  formulaire.querySelector('[data-liste-jours]').addEventListener('change', (evenement) => {
    if (evenement.target.name !== 'jour') return;
    etat.jour = evenement.target.value;
    etat.heure = '';
    montrerErreur('jour', false);
    montrerErreur('heure', false);
    dessinerHeures();
    mettreAJourResume();
    mettreAJourRecapitulatif();
  });

  formulaire.querySelector('[data-liste-heures]').addEventListener('change', (evenement) => {
    if (evenement.target.name !== 'heure') return;
    etat.heure = evenement.target.value;
    montrerErreur('heure', false);
    mettreAJourResume();
    mettreAJourRecapitulatif();
  });

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etat.transition) return;
      if (etat.etape === 0) {
        const choix = elementRadio('prestation');
        if (!choix) { montrerErreur('prestation', true); return; }
        etat.prestation = choix.value;
        dessinerJours();
        montrerEtape(1);
      } else if (etat.etape === 1) {
        const choix = elementRadio('jour');
        if (!choix) { montrerErreur('jour', true); return; }
        etat.jour = choix.value;
        dessinerHeures();
        montrerErreur('jour', false);
        montrerEtape(2);
      } else if (etat.etape === 2) {
        const choix = elementRadio('heure');
        if (!choix) { montrerErreur('heure', true); return; }
        etat.heure = choix.value;
        montrerErreur('heure', false);
        mettreAJourRecapitulatif();
        montrerEtape(3);
      }
      mettreAJourResume();
    });
  });

  formulaire.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etat.transition || etat.etape < 1) return;
      montrerEtape(etat.etape - 1);
    });
  });

  boutonsEtapes.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.allerEtape);
      if (numero > etat.maximum || etat.transition || etat.etape === 4) return;
      montrerEtape(numero);
    });
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape !== 3) return;
    if (!etat.jour) {
      etat.etape = 1;
      dessinerJours();
      montrerErreur('jour', true);
      montrerEtape(1);
      return;
    }
    if (!etat.heure) {
      etat.etape = 2;
      dessinerHeures();
      montrerErreur('heure', true);
      montrerEtape(2);
      return;
    }
    const prenom = champPrenom.value.trim().replace(/\s+/g, ' ');
    const telephoneValide = mobileValide(champTelephone.value);
    montrerErreur('prenom', prenom.length === 0);
    montrerErreur('telephone', !telephoneValide);
    if (!prenom) { champPrenom.focus(); return; }
    if (!telephoneValide) { champTelephone.focus(); return; }
    document.querySelector('[data-message-succes]').textContent = `Merci ${prenom}. Votre choix est prêt dans cette démonstration.`;
    montrerEtape(4);
  });

  mettreAJourResume();
  dessinerJours();
})();
