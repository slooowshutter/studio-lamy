(() => {
  const selecteur = (cible, parent = document) => parent.querySelector(cible);
  const selecteurs = (cible, parent = document) => [...parent.querySelectorAll(cible)];
  const prefersReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const services = {
    'coupe-homme': { nom: 'Coupe Homme', duree: 30 },
    'coupe-etudiant': { nom: 'Coupe Étudiant', duree: 30 },
    'coupe-barbe': { nom: 'Coupe Homme + Barbe', duree: 40 },
    barbe: { nom: 'Barbe', duree: 25 },
    rasage: { nom: 'Rasage', duree: 30 }
  };
  const horaires = {
    0: [],
    1: [],
    2: [[10 * 60, 12 * 60], [14 * 60, 19 * 60]],
    3: [[10 * 60, 12 * 60], [14 * 60, 19 * 60]],
    4: [[10 * 60, 12 * 60], [14 * 60, 19 * 60]],
    5: [[10 * 60, 12 * 60], [14 * 60, 19 * 60]],
    6: [[10 * 60, 15 * 60]]
  };
  const formatLong = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const etat = { prestation: '', jour: null, heure: null, etape: 1 };
  let maintenantParis = obtenirMaintenantParis();
  let minuteurEtape;
  let etapeCible = null;

  function obtenirMaintenantParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(morceaux.map((morceau) => [morceau.type, morceau.value]));
    return {
      annee: Number(valeurs.year),
      mois: Number(valeurs.month),
      jour: Number(valeurs.day),
      minute: Number(valeurs.hour) * 60 + Number(valeurs.minute)
    };
  }

  function dateFranceDuJour() {
    return new Date(Date.UTC(maintenantParis.annee, maintenantParis.mois - 1, maintenantParis.jour));
  }

  function dateCle(date) {
    return date.toISOString().slice(0, 10);
  }

  function majSelection() {
    const nomPrestation = etat.prestation ? services[etat.prestation].nom : 'À choisir';
    const nomJour = etat.jour ? formaterJour(etat.jour) : 'À choisir';
    const nomHeure = etat.heure || 'À choisir';
    selecteur('#selection-prestation').textContent = nomPrestation;
    selecteur('#selection-jour').textContent = nomJour;
    selecteur('#selection-heure').textContent = nomHeure;
    selecteurs('[data-modifier]').forEach((bouton) => {
      const numero = Number(bouton.dataset.modifier);
      bouton.disabled = numero === 1 ? !etat.prestation : numero === 2 ? !etat.jour : !etat.heure;
      bouton.setAttribute('aria-disabled', String(bouton.disabled));
    });
    const recapitulatif = selecteur('#recapitulatif-confirmation');
    if (recapitulatif) {
      recapitulatif.innerHTML = `
        <p><strong>Prestation :</strong> ${echapper(nomPrestation)}</p>
        <p><strong>Jour :</strong> ${echapper(nomJour)}</p>
        <p><strong>Heure :</strong> ${echapper(nomHeure)}</p>
      `;
    }
  }

  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, (caractere) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[caractere]);
  }

  function majEtape(numero) {
    etat.etape = numero;
    selecteur('#compteur-etape').textContent = `${numero} / 4`;
    selecteurs('[data-repere-etape]').forEach((repere) => {
      const actif = Number(repere.dataset.repereEtape) === numero;
      repere.classList.toggle('est-active', actif);
      if (actif) repere.setAttribute('aria-current', 'step');
      else repere.removeAttribute('aria-current');
    });
    const noms = ['Choisir une prestation', 'Choisir un jour', 'Choisir une heure', 'Vos coordonnées'];
    selecteur('#annonce-etape').textContent = `Étape ${numero} sur 4 : ${noms[numero - 1]}.`;
    selecteur(`[data-continuer="${numero}"]`)?.focus({ preventScroll: true });
  }

  function afficherEtape(numero) {
    if (numero < 1 || numero > 4 || numero === etapeCible) return;
    if (numero === etat.etape && etapeCible === null) return;
    window.clearTimeout(minuteurEtape);
    const presente = selecteur('.etape-reservation:not([hidden])');
    if (numero === etat.etape) {
      presente?.classList.remove('is-sortie');
      etapeCible = null;
      return;
    }
    const suivante = selecteur(`[data-etape="${numero}"]`);
    if (!presente || !suivante) return;
    etapeCible = numero;
    const terminer = () => {
      if (etapeCible !== numero) return;
      presente.hidden = true;
      presente.classList.remove('is-sortie');
      suivante.hidden = false;
      suivante.classList.add('is-entree');
      requestAnimationFrame(() => {
        if (etapeCible !== numero) return;
        suivante.classList.remove('is-entree');
        majEtape(numero);
        selecteur('h3', suivante).focus({ preventScroll: true });
        etapeCible = null;
      });
    };
    if (prefersReduit.matches) {
      terminer();
      return;
    }
    presente.classList.add('is-sortie');
    minuteurEtape = window.setTimeout(terminer, 220);
  }

  function formaterJour(date) {
    const valeur = formatLong.format(date);
    return valeur.charAt(0).toLocaleUpperCase('fr-FR') + valeur.slice(1);
  }

  function genererJours() {
    const conteneur = selecteur('#grille-jours');
    if (!conteneur) return;
    const premierJour = dateFranceDuJour();
    conteneur.replaceChildren();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(premierJour.getTime() + decalage * 86400000);
      const numeroJour = date.getUTCDay();
      const ferme = horaires[numeroJour].length === 0;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix-jour';
      bouton.dataset.date = dateCle(date);
      bouton.disabled = ferme;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${formaterJour(date)}${ferme ? ', fermé' : ''}`);
      const nomAffiche = decalage === 0 ? 'Auj.' : decalage === 1 ? 'Dem.' : nomsJours[numeroJour].slice(0, 3) + '.';
      const numeroAffiche = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric' }).format(date);
      bouton.innerHTML = `<span>${echapper(nomAffiche)}</span><span>${numeroAffiche}</span>${ferme ? '<small class="jour-ferme">Fermé</small>' : ''}`;
      if (etat.jour && dateCle(etat.jour) === dateCle(date)) bouton.setAttribute('aria-pressed', 'true');
      bouton.addEventListener('click', () => {
        if (bouton.disabled) return;
        etat.jour = date;
        etat.heure = null;
        selecteurs('.choix-jour', conteneur).forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
        selecteur('[data-continuer="2"]').disabled = false;
        selecteur('#erreur-jour').textContent = '';
        genererHeures();
        majSelection();
      });
      conteneur.append(bouton);
    }
  }

  function libelleHeure(minutes) {
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const reste = String(minutes % 60).padStart(2, '0');
    return `${heures} h ${reste}`;
  }

  function genererHeures() {
    const conteneur = selecteur('#grille-heures');
    const texteDate = selecteur('#date-choisie');
    if (!conteneur || !etat.jour) return;
    const jourSem = etat.jour.getUTCDay();
    const duree = services[etat.prestation].duree;
    const plages = horaires[jourSem];
    conteneur.replaceChildren();
    etat.heure = null;
    selecteur('[data-continuer="3"]').disabled = true;
    const aujourdhui = dateCle(etat.jour) === dateCle(dateFranceDuJour());
    const groupes = [
      { nom: 'Matin', plages: plages.filter(([debut]) => debut < 12 * 60) },
      { nom: 'Après-midi', plages: plages.filter(([debut]) => debut >= 12 * 60) }
    ];
    let total = 0;
    let libres = 0;
    groupes.forEach((groupe) => {
      const heures = [];
      groupe.plages.forEach(([debut, fin]) => {
        for (let minute = debut; minute + duree <= fin; minute += 30) {
          heures.push({ minute, passe: aujourdhui && minute <= maintenantParis.minute });
        }
      });
      if (!heures.length) return;
      total += heures.length;
      const bloc = document.createElement('section');
      bloc.className = 'groupe-creneaux';
      const titre = document.createElement('h4');
      titre.textContent = groupe.nom;
      const grille = document.createElement('div');
      grille.className = 'grille-heures-groupe';
      heures.forEach(({ minute, passe }) => {
        const heure = libelleHeure(minute);
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'choix-heure';
        bouton.disabled = passe;
        bouton.setAttribute('aria-pressed', 'false');
        if (passe) bouton.setAttribute('aria-label', `${heure}, passé`);
        else libres += 1;
        const temps = document.createElement('time');
        temps.dateTime = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        temps.textContent = heure;
        bouton.append(temps);
        if (passe) {
          const mentionPassee = document.createElement('small');
          mentionPassee.textContent = 'Passé';
          bouton.append(mentionPassee);
        }
        bouton.addEventListener('click', () => {
          if (bouton.disabled) return;
          etat.heure = heure;
          selecteurs('.choix-heure', conteneur).forEach((choix) => choix.setAttribute('aria-pressed', String(choix === bouton)));
          selecteur('[data-continuer="3"]').disabled = false;
          selecteur('#erreur-heure').textContent = '';
          majSelection();
        });
        grille.append(bouton);
      });
      bloc.append(titre, grille);
      conteneur.append(bloc);
    });
    if (total === 0 || libres === 0) {
      const aucun = document.createElement('p');
      aucun.className = 'aucun-creneau';
      aucun.textContent = total === 0 ? 'Aucun créneau de démonstration ne correspond à cette prestation.' : 'Aucun créneau de démonstration ne reste pour ce jour.';
      conteneur.append(aucun);
    }
    const dateEtCompteur = formaterJour(etat.jour);
    const annonceNombre = libres === 0 ? 'aucun créneau de démonstration ne reste' : `${libres} créneau${libres > 1 ? 'x' : ''} de démonstration proposé${libres > 1 ? 's' : ''}`;
    texteDate.textContent = `${dateEtCompteur} · ${annonceNombre}.`;
    majSelection();
  }

  function verifierTelephone(valeur) {
    let chiffres = valeur.replace(/[^\d+]/g, '');
    if (chiffres.startsWith('+33')) chiffres = `0${chiffres.slice(3)}`;
    if (chiffres.startsWith('0033')) chiffres = `0${chiffres.slice(4)}`;
    return /^0[67]\d{8}$/.test(chiffres);
  }

  function afficherErreur(champ, message) {
    const champEl = selecteur(champ);
    const erreur = selecteur(`#erreur-${champ.replace('#', '')}`);
    if (champEl) champEl.setAttribute('aria-invalid', String(Boolean(message)));
    if (erreur) erreur.textContent = message;
  }

  function verifierCoordonnees() {
    const prenom = selecteur('#prenom').value.trim();
    const telephone = selecteur('#telephone').value.trim();
    const prenomValide = prenom.length >= 2;
    const telephoneValide = verifierTelephone(telephone);
    afficherErreur('#prenom', prenomValide ? '' : 'Indiquez un prénom d’au moins deux lettres.');
    afficherErreur('#telephone', telephoneValide ? '' : 'Saisissez un numéro de mobile français valide.');
    if (!prenomValide) selecteur('#prenom').focus();
    else if (!telephoneValide) selecteur('#telephone').focus();
    return prenomValide && telephoneValide;
  }

  function mettreEnPlaceRevelations() {
    const hero = selecteur('.hero');
    if (hero) requestAnimationFrame(() => hero.classList.add('is-visible'));
    if (!('IntersectionObserver' in window)) {
      selecteurs('[data-reveal]').forEach((element) => element.classList.add('revele'));
      selecteurs('[data-ligne]').forEach((element) => element.classList.add('ligne-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees, observateurActif) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add(entree.target.hasAttribute('data-ligne') ? 'ligne-visible' : 'revele');
        observateurActif.unobserve(entree.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    selecteurs('[data-reveal], [data-ligne]').forEach((element) => observateur.observe(element));
  }

  function mettreEnPlaceNavigation() {
    const bouton = selecteur('.bouton-menu');
    const navigation = selecteur('#navigation-principale');
    if (!bouton || !navigation) return;
    const premierLien = selecteur('a', navigation);
    function fermerNavigation(rendreFocus = false) {
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir la navigation');
      navigation.classList.remove('is-open');
      if (rendreFocus) bouton.focus();
    }
    bouton.addEventListener('click', () => {
      const ouverte = bouton.getAttribute('aria-expanded') === 'true';
      if (ouverte) fermerNavigation(true);
      else {
        bouton.setAttribute('aria-expanded', 'true');
        bouton.setAttribute('aria-label', 'Fermer la navigation');
        navigation.classList.add('is-open');
        requestAnimationFrame(() => premierLien?.focus());
      }
    });
    navigation.addEventListener('click', (evenement) => {
      const lien = evenement.target.closest('a');
      if (!lien) return;
      const cible = lien.hash ? document.querySelector(lien.hash) : null;
      const titre = cible?.matches('h1, h2, h3') ? cible : selecteur('h1, h2, h3', cible || document);
      fermerNavigation(false);
      requestAnimationFrame(() => titre?.focus({ preventScroll: true }));
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermerNavigation(true);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 979) fermerNavigation(false);
    }, { passive: true });
  }

  function mettreEnPlaceBarreMobile() {
    const barre = selecteur('#barre-mobile');
    const actionsHero = selecteur('#actions-hero');
    const reservation = selecteur('#reserver');
    const pied = selecteur('.pied-page');
    if (!barre || !actionsHero || !reservation || !pied) return;
    const etatObservations = { heroVisible: true, reservationVisible: false, piedVisible: false };
    const actualiser = () => {
      const mobile = window.matchMedia('(max-width: 700px)').matches;
      const visible = mobile && !etatObservations.heroVisible && !etatObservations.reservationVisible && !etatObservations.piedVisible;
      barre.classList.toggle('est-visible', visible);
      barre.inert = !visible;
    };
    if (!('IntersectionObserver' in window)) return;
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === actionsHero) etatObservations.heroVisible = entree.isIntersecting;
        if (entree.target === reservation) etatObservations.reservationVisible = entree.isIntersecting;
        if (entree.target === pied) etatObservations.piedVisible = entree.isIntersecting;
      });
      actualiser();
    }, { threshold: 0.01 });
    [actionsHero, reservation, pied].forEach((element) => observateur.observe(element));
    window.addEventListener('resize', actualiser, { passive: true });
  }

  function mettreEnPlaceCopieAdresse() {
    const bouton = selecteur('#copier-adresse');
    const annonce = selecteur('#etat-copie');
    if (!bouton || !annonce) return;
    bouton.addEventListener('click', async () => {
      const adresse = '32 Rue Tran, 64000 Pau';
      try {
        await navigator.clipboard.writeText(adresse);
        annonce.textContent = 'Adresse copiée.';
      } catch {
        annonce.textContent = 'La copie automatique n’est pas disponible sur cet appareil.';
      }
    });
  }

  function mettreEnPlaceReservation() {
    const formulaire = selecteur('#formulaire-reservation');
    if (!formulaire) return;
    genererJours();
    majSelection();
    selecteurs('input[name="prestation"]', formulaire).forEach((caseService) => {
      caseService.addEventListener('change', () => {
        etat.prestation = caseService.value;
        etat.jour = null;
        etat.heure = null;
        selecteur('[data-continuer="1"]').disabled = false;
        selecteur('[data-continuer="2"]').disabled = true;
        selecteur('[data-continuer="3"]').disabled = true;
        selecteurs('.choix-jour').forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
        majSelection();
      });
    });
    selecteurs('[data-continuer]').forEach((bouton) => {
      bouton.addEventListener('click', () => {
        const etape = Number(bouton.dataset.continuer);
        if (etape === 1 && !etat.prestation) return;
        if (etape === 2 && !etat.jour) {
          selecteur('#erreur-jour').textContent = 'Choisissez un jour pour continuer.';
          return;
        }
        if (etape === 3 && !etat.heure) {
          selecteur('#erreur-heure').textContent = 'Choisissez une heure pour continuer.';
          return;
        }
        if (etape === 2) genererJours();
        if (etape === 3) genererHeures();
        afficherEtape(etape + 1);
      });
    });
    selecteurs('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.retour))));
    selecteurs('[data-modifier]').forEach((bouton) => bouton.addEventListener('click', () => {
      if (!bouton.disabled) afficherEtape(Number(bouton.dataset.modifier));
    }));
    selecteurs('[data-prestation]').forEach((lien) => lien.addEventListener('click', () => {
      const identifiant = lien.dataset.prestation;
      const entree = selecteur(`input[name="prestation"][value="${identifiant}"]`, formulaire);
      if (!entree) return;
      entree.checked = true;
      entree.dispatchEvent(new Event('change', { bubbles: true }));
      selecteurs('.ligne-prestation').forEach((ligne) => ligne.classList.remove('is-choisie'));
      lien.closest('.ligne-prestation')?.classList.add('is-choisie');
      window.setTimeout(() => afficherEtape(2), 60);
    }));
    selecteurs('.champ-formulaire input').forEach((champ) => champ.addEventListener('input', () => {
      champ.removeAttribute('aria-invalid');
      selecteur(`#erreur-${champ.id}`).textContent = '';
    }));
    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      if (!verifierCoordonnees()) return;
      const prenom = selecteur('#prenom').value.trim();
      selecteur('#message-confirmation').textContent = `${prenom}, votre choix simulé : ${services[etat.prestation].nom}, le ${formaterJour(etat.jour)} à ${etat.heure}.`;
      formulaire.hidden = true;
      selecteur('#confirmation').hidden = false;
      selecteur('#confirmation').focus();
    });
  }

  mettreEnPlaceRevelations();
  mettreEnPlaceNavigation();
  mettreEnPlaceBarreMobile();
  mettreEnPlaceCopieAdresse();
  mettreEnPlaceReservation();
})();
