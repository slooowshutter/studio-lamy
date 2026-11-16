window.__apercuChargee = true;
(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const selecteur = (requete, contexte = doc) => contexte.querySelector(requete);
  const tous = (requete, contexte = doc) => Array.from(contexte.querySelectorAll(requete));
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const durees = {
    eclaircissement: 180,
    coloration: 120,
    soin: 60,
    brushing: 60
  };
  const noms = {
    eclaircissement: 'Balayage, Ombré, Mèches et autres éclaircissement',
    coloration: 'Coloration racine + Soin + Coupe + Brushing (cheveux courts)',
    soin: 'Soin bot (FORFAIT)',
    brushing: 'Shampoing + Soin + Brushing'
  };
  const horaires = {
    0: null,
    1: null,
    2: [600, 1140],
    3: [600, 1140],
    4: [600, 1140],
    5: [600, 1140],
    6: [570, 1140]
  };
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const dateCourte = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const jourEtMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
  const formatParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const etat = { prestation: '', jour: null, heure: null, etape: 0, prenom: '', telephone: '' };

  const boutonNavigation = selecteur('[data-navigation-bouton]');
  const panneauNavigation = selecteur('#navigation-principale');
  const libelleNavigation = selecteur('[data-navigation-libelle]');
  const symboleNavigation = selecteur('[data-navigation-symbole]');
  const vueMobile = window.matchMedia('(max-width: 700px)');
  function fermerNavigation(rendreFocus = false) {
    if (!boutonNavigation || !panneauNavigation) return;
    panneauNavigation.classList.remove('est-ouverte');
    boutonNavigation.setAttribute('aria-expanded', 'false');
    if (libelleNavigation) libelleNavigation.textContent = 'Rubriques';
    if (symboleNavigation) symboleNavigation.textContent = '＋';
    if (rendreFocus) boutonNavigation.focus();
  }
  boutonNavigation?.addEventListener('click', () => {
    const ouvrir = boutonNavigation.getAttribute('aria-expanded') !== 'true';
    boutonNavigation.setAttribute('aria-expanded', String(ouvrir));
    if (libelleNavigation) libelleNavigation.textContent = ouvrir ? 'Fermer' : 'Rubriques';
    if (symboleNavigation) symboleNavigation.textContent = ouvrir ? '−' : '＋';
    panneauNavigation?.classList.toggle('est-ouverte', ouvrir);
  });
  panneauNavigation?.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerNavigation(true);
  });
  doc.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonNavigation?.getAttribute('aria-expanded') === 'true') {
      fermerNavigation(true);
    }
  });
  vueMobile.addEventListener('change', () => fermerNavigation());

  function horlogeParis() {
    const parties = {};
    formatParis.formatToParts(new Date()).forEach((partie) => { parties[partie.type] = partie.value; });
    const annee = Number(parties.year);
    const mois = Number(parties.month);
    const jour = Number(parties.day);
    return {
      date: new Date(annee, mois - 1, jour, 12),
      cle: `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`,
      minutes: Number(parties.hour) * 60 + Number(parties.minute)
    };
  }

  const hero = selecteur('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add('is-ready')));

  /* Révélations distinctes, une seule fois, avec un léger décalage par groupe. */
  const elementsRevele = tous('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        const groupe = elementsRevele.filter((element) => element.dataset.reveal === entree.target.dataset.reveal);
        const ordre = groupe.indexOf(entree.target);
        entree.target.style.transitionDelay = mouvementReduit.matches ? '0ms' : `${Math.max(0, ordre) * 55}ms`;
        entree.target.classList.add('est-revele');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    elementsRevele.forEach((element) => observateur.observe(element));
  } else {
    elementsRevele.forEach((element) => element.classList.add('est-revele'));
  }

  /* Le jour courant est indiqué dans les horaires publiés. */
  const maintenant = horlogeParis();
  const jourActuel = maintenant.date.getDay();
  tous('[data-jour]').forEach((ligne) => {
    ligne.classList.toggle('est-aujourdhui', Number(ligne.dataset.jour) === jourActuel);
  });

  const etapes = tous('[data-etape]');
  const compteEtape = selecteur('[data-etape-compteur]');
  const pointsEtape = tous('[data-point]');
  const choixJours = selecteur('[data-jours]');
  const choixHeures = selecteur('[data-heures]');
  const choixPrestation = tous('input[name="prestation"]');
  const resumePrestation = selecteur('[data-selection-prestation]');
  const resumeJour = selecteur('[data-selection-jour]');
  const resumeHeure = selecteur('[data-selection-heure]');

  function texteHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste ? `${heures} h ${String(reste).padStart(2, '0')}` : `${heures} h`;
  }

  function jourIso(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const nombre = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${nombre}`;
  }

  function creerJours() {
    if (!choixJours) return;
    choixJours.replaceChildren();
    const depart = horlogeParis().date;
    for (let indice = 0; indice < 14; indice += 1) {
      const date = new Date(depart);
      date.setDate(depart.getDate() + indice);
      const ferme = horaires[date.getDay()] === null;
      const libelleCourt = dateCourte.format(date).replace('.', '');
      const parties = libelleCourt.split(' ');
      const nomJour = parties[0];
      const numeroJour = String(date.getDate());
      const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date).replace('.', '');
      const label = doc.createElement('label');
      label.className = `jour${ferme ? ' est-ferme' : ''}`;
      const entree = doc.createElement('input');
      entree.type = 'radio';
      entree.name = 'jour-simulation';
      entree.value = jourIso(date);
      entree.disabled = ferme;
      entree.setAttribute('aria-label', `${jours[date.getDay()]} ${numeroJour} ${jourEtMois.format(date).replace(/^\d+\s/, '')}${ferme ? ', fermé' : ''}`);
      const nom = doc.createElement('span');
      nom.className = 'jour__nom';
      nom.textContent = nomJour;
      const chiffre = doc.createElement('span');
      chiffre.className = 'jour__nombre';
      chiffre.textContent = numeroJour;
      const moisTexte = doc.createElement('span');
      moisTexte.className = 'jour__mois';
      moisTexte.textContent = mois;
      label.append(entree, nom, chiffre, moisTexte);
      if (ferme) {
        const fermeTexte = doc.createElement('span');
        fermeTexte.className = 'jour__ferme';
        fermeTexte.textContent = 'fermé';
        label.append(fermeTexte);
      }
      entree.addEventListener('change', () => {
        if (!entree.checked) return;
        etat.jour = date;
        etat.heure = null;
        tous('.jour', choixJours).forEach((element) => element.classList.toggle('est-choisi', selecteur('input', element)?.checked));
        resumeJour.textContent = `${nomJour} ${numeroJour} ${mois}`;
        resumeHeure.textContent = 'Heure à choisir';
        selecteur('[data-erreur-jour]').hidden = true;
        selecteur('[data-annonce-jours]').textContent = `${jours[date.getDay()]} ${jourEtMois.format(date)} sélectionné pour la simulation.`;
        remplirHeures();
      });
      choixJours.append(label);
    }
  }

  function graineJour(date) {
    return Number(jourIso(date).replaceAll('-', ''));
  }

  function creerGroupeHeures(nom, horairesGroupe) {
    const groupe = doc.createElement('div');
    groupe.className = 'groupe-heures';
    const titre = doc.createElement('h4');
    titre.textContent = nom;
    const grille = doc.createElement('div');
    grille.className = 'choix-heures__liste';
    horairesGroupe.forEach(({ valeur, indisponible }) => {
      const label = doc.createElement('label');
      label.className = `heure${indisponible ? ' est-prise' : ''}`;
      const entree = doc.createElement('input');
      entree.type = 'radio';
      entree.name = 'heure-simulation';
      entree.value = String(valeur);
      entree.disabled = indisponible;
      entree.setAttribute('aria-label', `${texteHeure(valeur)}${indisponible ? ', déjà pris dans cette simulation' : ''}`);
      const texte = doc.createElement('span');
      texte.textContent = indisponible ? `${texteHeure(valeur)} · déjà pris` : texteHeure(valeur);
      label.append(entree, texte);
      entree.addEventListener('change', () => {
        if (!entree.checked) return;
        etat.heure = valeur;
        tous('.heure', choixHeures).forEach((element) => element.classList.toggle('est-choisie', selecteur('input', element)?.checked));
        resumeHeure.textContent = texteHeure(valeur);
        selecteur('[data-erreur-heure]').hidden = true;
      });
      grille.append(label);
    });
    groupe.append(titre, grille);
    return groupe;
  }

  function remplirHeures() {
    if (!choixHeures || !etat.jour) return;
    choixHeures.replaceChildren();
    const heuresJour = horaires[etat.jour.getDay()];
    const duree = durees[etat.prestation];
    const groupes = new Map([['Matin', []], ['Après-midi', []], ['Fin de journée', []]]);
    let nombreLibre = 0;
    const instantParis = horlogeParis();
    const aujourdhui = jourIso(etat.jour) === instantParis.cle;
    const depart = aujourdhui ? Math.max(heuresJour[0], Math.ceil(instantParis.minutes / 30) * 30) : heuresJour[0];
    for (let heure = depart; heure + duree <= heuresJour[1]; heure += 30) {
      const index = Math.floor((heure - heuresJour[0]) / 30);
      const indisponible = (graineJour(etat.jour) + index * 17 + Object.keys(durees).indexOf(etat.prestation) * 23) % 11 === 3;
      const nomGroupe = heure < 12 * 60 ? 'Matin' : heure < 17 * 60 ? 'Après-midi' : 'Fin de journée';
      groupes.get(nomGroupe).push({ valeur: heure, indisponible });
      if (!indisponible) nombreLibre += 1;
    }
    groupes.forEach((items, nom) => {
      if (items.length) choixHeures.append(creerGroupeHeures(nom, items));
    });
    const annonce = selecteur('[data-annonce-heures]');
    annonce.textContent = nombreLibre ? `${nombreLibre} créneau${nombreLibre > 1 ? 'x' : ''} disponible${nombreLibre > 1 ? 's' : ''} dans cette simulation.` : 'Aucun créneau affiché pour ce jour et cette prestation dans la simulation.';
    const resume = selecteur('[data-resume-jour]');
    resume.textContent = `${dateLongue.format(etat.jour)} · durée indiquée : ${Math.floor(duree / 60)} h${duree % 60 ? ` ${String(duree % 60).padStart(2, '0')}` : ''}.`;
  }

  function actualiserSelection() {
    resumePrestation.textContent = etat.prestation ? noms[etat.prestation] : 'Prestation à choisir';
    resumeJour.textContent = etat.jour ? `${jours[etat.jour.getDay()]} ${jourEtMois.format(etat.jour)}` : 'Jour à choisir';
    resumeHeure.textContent = etat.heure !== null ? texteHeure(etat.heure) : 'Heure à choisir';
    tous('[data-aller]').forEach((bouton) => {
      const pas = Number(bouton.dataset.aller);
      bouton.disabled = pas === 0 ? !etat.prestation : pas === 1 ? !etat.jour : etat.heure === null;
    });
  }

  function afficherEtape(nouvelleEtape, deplacement = true) {
    const etapePrecedente = etat.etape;
    etat.etape = nouvelleEtape;
    const indexProgression = Math.min(nouvelleEtape, 4);
    compteEtape.textContent = `Étape ${indexProgression + 1} sur 5`;
    pointsEtape.forEach((point) => {
      const index = Number(point.dataset.point);
      point.classList.toggle('est-active', index === indexProgression);
      point.classList.toggle('est-fait', index < indexProgression);
    });
    etapes.forEach((etape) => {
      const estCourante = Number(etape.dataset.etape) === nouvelleEtape;
      etape.hidden = !estCourante;
      etape.classList.remove('est-sortante', 'est-entrante', 'est-active');
      if (estCourante) {
        etape.classList.add('est-entrante');
        requestAnimationFrame(() => {
          etape.classList.remove('est-entrante');
          etape.classList.add('est-active');
        });
      }
    });
    if (deplacement && etapePrecedente !== nouvelleEtape) {
      const titre = selecteur(`#titre-etape-${nouvelleEtape}`);
      titre?.focus({ preventScroll: true });
    }
    actualiserSelection();
  }

  function mettreAJourPrestation(prestation) {
    etat.prestation = prestation;
    etat.jour = null;
    etat.heure = null;
    resumeJour.textContent = 'Jour à choisir';
    resumeHeure.textContent = 'Heure à choisir';
    selecteur('[data-erreur-prestation]').hidden = true;
    tous('input[name="jour-simulation"]', choixJours).forEach((entree) => { entree.checked = false; });
    tous('.jour', choixJours).forEach((element) => element.classList.remove('est-choisi'));
    choixHeures.replaceChildren();
    actualiserSelection();
  }

  choixPrestation.forEach((entree) => entree.addEventListener('change', () => {
    if (entree.checked) mettreAJourPrestation(entree.value);
  }));

  tous('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', () => {
    if (etat.etape === 0) {
      if (!etat.prestation) {
        selecteur('[data-erreur-prestation]').hidden = false;
        selecteur('input[name="prestation"]')?.focus();
        return;
      }
      afficherEtape(1);
    } else if (etat.etape === 1) {
      if (!etat.jour || horaires[etat.jour.getDay()] === null) {
        selecteur('[data-erreur-jour]').hidden = false;
        return;
      }
      remplirHeures();
      afficherEtape(2);
      const annonce = selecteur('[data-annonce-heures]');
      annonce.textContent = `${annonce.textContent} ${dateLongue.format(etat.jour)}.`;
    } else if (etat.etape === 2) {
      if (etat.heure === null) {
        selecteur('[data-erreur-heure]').hidden = false;
        return;
      }
      afficherEtape(3);
    }
  }));

  tous('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => {
    if (etat.etape === 1) afficherEtape(0);
    else if (etat.etape === 2) afficherEtape(1);
    else if (etat.etape === 3) afficherEtape(2);
    else if (etat.etape === 4) afficherEtape(3);
  }));

  tous('[data-aller]').forEach((bouton) => bouton.addEventListener('click', () => {
    if (!bouton.disabled) afficherEtape(Number(bouton.dataset.aller));
  }));

  tous('[data-choix]').forEach((lien) => lien.addEventListener('click', () => {
    const entree = selecteur(`input[name="prestation"][value="${lien.dataset.choix}"]`);
    if (entree) {
      entree.checked = true;
      mettreAJourPrestation(entree.value);
    }
  }));

  const formulaire = selecteur('.coordonnees');
  const prenom = selecteur('#prenom');
  const telephone = selecteur('#telephone');
  formulaire?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenomValide = prenom.value.trim().length > 0;
    const telephoneCompact = telephone.value.replace(/[\s().-]/g, '');
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephoneCompact);
    selecteur('[data-erreur-prenom]').hidden = prenomValide;
    selecteur('[data-erreur-telephone]').hidden = telephoneValide;
    prenom.setAttribute('aria-invalid', String(!prenomValide));
    telephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (!prenomValide) { prenom.focus(); return; }
    if (!telephoneValide) { telephone.focus(); return; }
    etat.prenom = prenom.value.trim();
    etat.telephone = telephone.value.trim();
    const texteRecap = `${etat.prenom} · ${noms[etat.prestation]} · ${dateLongue.format(etat.jour)} à ${texteHeure(etat.heure)}.`;
    selecteur('[data-recapitulatif]').textContent = texteRecap;
    afficherEtape(4);
  });

  selecteur('[data-confirmer]')?.addEventListener('click', () => {
    selecteur('[data-succes-recap]').textContent = `${etat.prenom}, votre simulation indique ${noms[etat.prestation]} le ${dateLongue.format(etat.jour)} à ${texteHeure(etat.heure)}.`;
    afficherEtape(5);
  });

  selecteur('[data-recommencer]')?.addEventListener('click', () => {
    formulaire?.reset();
    etat.prestation = '';
    etat.jour = null;
    etat.heure = null;
    etat.prenom = '';
    etat.telephone = '';
    prenom.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');
    selecteur('[data-erreur-prenom]').hidden = true;
    selecteur('[data-erreur-telephone]').hidden = true;
    tous('[data-erreur-prestation], [data-erreur-jour], [data-erreur-heure]').forEach((erreur) => { erreur.hidden = true; });
    tous('.jour', choixJours).forEach((jour) => jour.classList.remove('est-choisi'));
    choixHeures.replaceChildren();
    afficherEtape(0);
  });

  creerJours();
  actualiserSelection();

  /* Le bandeau mobile n'apparaît qu'après les actions du premier écran et se range au formulaire. */
  const barre = selecteur('[data-barre]');
  const actionsHero = selecteur('.hero__actions');
  const sectionReservation = selecteur('.rendez-vous');
  const pied = selecteur('.pied');
  if (barre && actionsHero && 'IntersectionObserver' in window) {
    const visibilite = new Map([[actionsHero, true], [sectionReservation, false], [pied, false]]);
    const observerBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => visibilite.set(entree.target, entree.isIntersecting));
      const formulaireVisible = visibilite.get(sectionReservation) || visibilite.get(pied);
      const afficher = !visibilite.get(actionsHero) && !formulaireVisible;
      barre.classList.toggle('est-visible', afficher);
      barre.inert = !afficher;
      barre.setAttribute('aria-hidden', String(!afficher));
    }, { threshold: 0.08 });
    [actionsHero, sectionReservation, pied].forEach((element) => observerBarre.observe(element));
  }
})();
