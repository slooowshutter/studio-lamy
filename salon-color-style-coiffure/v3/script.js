(() => {
  const corps = document.body;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => requestAnimationFrame(() => corps.classList.add('is-ready')));

  const boutonMenu = document.querySelector('.entete__menu');
  const menuMobile = document.querySelector('#menu-mobile');
  const texteMenu = document.querySelector('[data-texte-menu]');
  if (boutonMenu && menuMobile) {
    const fermerMenu = (rendreFocus) => {
      menuMobile.hidden = true;
      boutonMenu.setAttribute('aria-expanded', 'false');
      boutonMenu.setAttribute('aria-label', 'Ouvrir la navigation');
      texteMenu.textContent = 'Sections';
      if (rendreFocus) boutonMenu.focus();
    };
    boutonMenu.addEventListener('click', () => {
      const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
      if (ouvert) fermerMenu(false);
      else {
        menuMobile.hidden = false;
        boutonMenu.setAttribute('aria-expanded', 'true');
        boutonMenu.setAttribute('aria-label', 'Fermer la navigation');
        texteMenu.textContent = 'Fermer';
      }
    });
    menuMobile.querySelectorAll('a').forEach((lien) => lien.addEventListener('click', () => {
      const cible = document.querySelector(lien.getAttribute('href'));
      fermerMenu(false);
      window.setTimeout(() => {
        const titre = cible?.matches('h1, h2, h3') ? cible : cible?.querySelector('h1, h2, h3');
        if (titre) {
          titre.setAttribute('tabindex', '-1');
          titre.focus({ preventScroll: true });
        }
      }, 0);
    }));
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    document.addEventListener('click', (evenement) => {
      if (boutonMenu.getAttribute('aria-expanded') === 'true' && !menuMobile.contains(evenement.target) && !boutonMenu.contains(evenement.target)) fermerMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 64rem)').matches && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    }, { passive: true });
  }

  const revelations = [...document.querySelectorAll('[data-revelation]')];
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-revealed');
          instance.unobserve(entree.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    revelations.forEach((element) => observateur.observe(element));
  } else {
    revelations.forEach((element) => element.classList.add('is-revealed'));
  }

  const barre = document.querySelector('.barre-mobile');
  if (barre && 'IntersectionObserver' in window) {
    const zones = [document.querySelector('#rendez-vous'), document.querySelector('.pied')].filter(Boolean);
    const visibles = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) visibles.add(entree.target);
        else visibles.delete(entree.target);
      });
      barre.classList.toggle('is-masquee', visibles.size > 0);
    }, { threshold: 0.04 });
    zones.forEach((zone) => observateurBarre.observe(zone));
  }

  const formulaire = document.querySelector('#formulaire');
  if (!formulaire) return;

  const nomsPrestations = {
    brushing: 'Shampoing + coupe + brushing',
    sechage: 'Shampoing + coupe + séchage',
    masculin: 'Forfait masculin',
    barbe: 'Barbe sans soin',
    couleur: 'Couleur + shampoing + coupe + brushing',
    meches: 'Mèches + shampoing + coupe + brushing'
  };
  const debutHoraires = {
    2: [9 * 60, 12 * 60],
    3: [9 * 60, 18 * 60],
    4: [9 * 60, 18 * 60],
    5: [9 * 60, 19 * 60],
    6: [8 * 60 + 30, 17 * 60]
  };
  const etapes = [...formulaire.querySelectorAll('[data-etape]')];
  const indicateurs = [...formulaire.querySelectorAll('[data-etape-indicateur]')];
  const annonce = formulaire.querySelector('[data-annonce]');
  const jours = formulaire.querySelector('[data-jours]');
  const heures = formulaire.querySelector('[data-heures]');
  const choixService = [...formulaire.querySelectorAll('input[name="prestation"]')];
  const recapPrestation = document.querySelector('[data-recap-prestation]');
  const recapJour = document.querySelector('[data-recap-jour]');
  const recapHeure = document.querySelector('[data-recap-heure]');
  const prenom = formulaire.querySelector('#prenom');
  const telephone = formulaire.querySelector('#telephone');
  const etat = { prestation: '', jour: null, jourAffiche: '', heure: '' };
  let etapeActuelle = 0;
  let temporisateurEtape = 0;

  const heureLisible = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;

  function dateDeReims() {
    const parties = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
  }

  function texteDate(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(date);
  }

  function majRecapitulatif() {
    recapPrestation.textContent = nomsPrestations[etat.prestation] || 'À choisir';
    recapJour.textContent = etat.jourAffiche || 'À choisir';
    recapHeure.textContent = etat.heure || 'À choisir';
  }

  function effacerErreur(nom) {
    const erreur = formulaire.querySelector(`[data-erreur="${nom}"]`);
    if (erreur) erreur.hidden = true;
  }

  function afficherErreur(nom) {
    const erreur = formulaire.querySelector(`[data-erreur="${nom}"]`);
    if (erreur) erreur.hidden = false;
  }

  function annoncerEtape(index) {
    const libelles = ['choisissez une prestation', 'choisissez un jour', 'choisissez une heure', 'renseignez vos coordonnées'];
    const nombres = ['une', 'deux', 'trois', 'quatre'];
    annonce.textContent = index < 4 ? `Étape ${nombres[index]} sur quatre : ${libelles[index]}.` : 'Simulation terminée. Rien n’a été envoyé au salon.';
    indicateurs.forEach((indicateur, i) => {
      if (i === index) indicateur.setAttribute('aria-current', 'step');
      else indicateur.removeAttribute('aria-current');
    });
  }

  function afficherEtape(index, avecFocus = true) {
    window.clearTimeout(temporisateurEtape);
    const precedente = etapes[etapeActuelle];
    const suivante = etapes[index];
    if (precedente === suivante) return;

    precedente.classList.remove('is-entrante');
    precedente.classList.add('is-sortante');
    temporisateurEtape = window.setTimeout(() => {
      precedente.hidden = true;
      precedente.classList.remove('is-sortante');
      suivante.hidden = false;
      suivante.classList.add('is-entrante');
      requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.remove('is-entrante')));
      etapeActuelle = index;
      annoncerEtape(index);
      if (avecFocus) suivante.querySelector('h3')?.focus({ preventScroll: true });
    }, mouvementReduit ? 0 : 240);
  }

  function creerJours() {
    const aujourdHui = dateDeReims();
    const fragments = document.createDocumentFragment();
    jours.replaceChildren();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdHui.getTime() + decalage * 86400000);
      const semaine = date.getUTCDay();
      const jourLong = texteDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
      const jourCourt = texteDate(date, { weekday: 'short' });
      const jourNumero = texteDate(date, { day: 'numeric', month: 'short' });
      const horaires = debutHoraires[semaine];
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.jour = date.toISOString().slice(0, 10);
      bouton.dataset.jourLong = jourLong;
      bouton.setAttribute('aria-label', horaires ? jourLong : `${jourLong}, fermé`);
      bouton.innerHTML = `<span>${jourCourt.charAt(0).toLocaleUpperCase('fr-FR')}${jourCourt.slice(1)}</span><span>${jourNumero.replace('.', '')}</span>${horaires ? '' : '<span class="ferme">Fermé</span>'}`;
      bouton.disabled = !horaires;
      if (decalage === 0) bouton.setAttribute('aria-current', 'date');
      bouton.addEventListener('click', () => {
        jours.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        etat.jour = date;
        etat.jourAffiche = jourLong.charAt(0).toLocaleUpperCase('fr-FR') + jourLong.slice(1);
        etat.heure = '';
        heures.replaceChildren();
        effacerErreur('jour');
        majRecapitulatif();
        annonce.textContent = `Jour choisi : ${etat.jourAffiche}.`;
        creerHeures(date, decalage);
      });
      fragments.append(bouton);
    }
    jours.append(fragments);
  }

  function creerHeures(date, decalage) {
    const semaine = date.getUTCDay();
    const plage = debutHoraires[semaine];
    heures.replaceChildren();
    if (!plage) return;
    const [ouverture, fermeture] = plage;
    const maintenant = new Date();
    const partiesHeure = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(maintenant);
    const valeursHeure = Object.fromEntries(partiesHeure.map((partie) => [partie.type, partie.value]));
    const minutesMaintenant = Number(valeursHeure.hour) * 60 + Number(valeursHeure.minute);
    const memeJour = decalage === 0;
    const liste = document.createDocumentFragment();
    let nombre = 0;
    let nombreDisponible = 0;

    for (let minute = ouverture; minute < fermeture; minute += 60) {
      const heurePassee = memeJour && minute <= minutesMaintenant;
      const indiceService = Math.max(0, Object.keys(nomsPrestations).indexOf(etat.prestation));
      const dejaPris = !heurePassee && (decalage * 7 + nombre * 13 + indiceService * 3) % 9 === 0;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.heure = heureLisible(minute);
      bouton.innerHTML = `<span>${heureLisible(minute)}</span>${heurePassee ? '<span class="deja-pris">Passé</span>' : dejaPris ? '<span class="deja-pris">Déjà pris</span>' : ''}`;
      bouton.disabled = heurePassee || dejaPris;
      bouton.setAttribute('aria-label', heurePassee ? `${heureLisible(minute)}, heure passée` : dejaPris ? `${heureLisible(minute)}, déjà pris dans cette démonstration` : `Choisir ${heureLisible(minute)}`);
      if (!bouton.disabled) nombreDisponible += 1;
      bouton.addEventListener('click', () => {
        heures.querySelectorAll('button').forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        etat.heure = heureLisible(minute);
        effacerErreur('heure');
        majRecapitulatif();
        annonce.textContent = `Heure choisie : ${etat.heure}.`;
      });
      liste.append(bouton);
      nombre += 1;
    }

    if (!liste.childNodes.length) {
      const message = document.createElement('p');
      message.className = 'reservation__aide';
      message.textContent = 'Aucun créneau de démonstration ne reste aujourd’hui. Choisissez un autre jour.';
      heures.append(message);
    } else {
      heures.append(liste);
      if (nombreDisponible === 0) {
        const message = document.createElement('p');
        message.className = 'reservation__aide';
        message.textContent = 'Aucun créneau de démonstration ne reste aujourd’hui. Choisissez un autre jour.';
        heures.append(message);
      }
    }
  }

  function validerEtape() {
    if (etapeActuelle === 0) {
      const selection = choixService.find((radio) => radio.checked);
      if (!selection) {
        afficherErreur('prestation');
        choixService[0]?.focus();
        return false;
      }
      etat.prestation = selection.value;
    }
    if (etapeActuelle === 1 && !etat.jour) {
      afficherErreur('jour');
      jours.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    if (etapeActuelle === 2 && !etat.heure) {
      afficherErreur('heure');
      heures.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    majRecapitulatif();
    return true;
  }

  choixService.forEach((radio) => radio.addEventListener('change', () => {
    if (etat.prestation && etat.prestation !== radio.value) {
      etat.jour = null;
      etat.jourAffiche = '';
      etat.heure = '';
      jours.querySelectorAll('button').forEach((bouton) => bouton.removeAttribute('aria-pressed'));
      heures.replaceChildren();
    }
    etat.prestation = radio.value;
    effacerErreur('prestation');
    majRecapitulatif();
    annonce.textContent = `Prestation choisie : ${nomsPrestations[etat.prestation]}.`;
  }));

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', () => {
    if (validerEtape()) afficherEtape(Math.min(etapeActuelle + 1, 3));
  }));
  formulaire.querySelectorAll('[data-precedent]').forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(Math.max(etapeActuelle - 1, 0))));

  document.querySelectorAll('[data-choisir]').forEach((bouton) => bouton.addEventListener('click', () => {
    const radio = choixService.find((element) => element.value === bouton.dataset.choisir);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (etapeActuelle !== 0) afficherEtape(0);
    document.querySelector('#rendez-vous').scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth' });
    window.setTimeout(() => formulaire.querySelector('[data-etape="0"] h3')?.focus({ preventScroll: true }), mouvementReduit ? 0 : 350);
  }));

  function afficherErreurChamp(champ, messageId, invalide) {
    const message = document.getElementById(messageId);
    champ.setAttribute('aria-invalid', invalide ? 'true' : 'false');
    message.hidden = !invalide;
    return !invalide;
  }

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etapeActuelle !== 3) return;
    const nomValide = prenom.value.trim().length >= 2;
    const telephoneNettoye = telephone.value.trim().replace(/[ .()-]/g, '');
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(telephoneNettoye);
    const prenomOk = afficherErreurChamp(prenom, 'erreur-prenom', !nomValide);
    const telephoneOk = afficherErreurChamp(telephone, 'erreur-telephone', !telephoneValide);
    if (!prenomOk || !telephoneOk || !etat.prestation || !etat.jour || !etat.heure) {
      afficherErreur('selection');
      formulaire.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    effacerErreur('selection');
    const nomService = nomsPrestations[etat.prestation];
    const recapitulatif = document.querySelector('[data-recapitulatif-final]');
    recapitulatif.textContent = `${prenom.value.trim()}, votre simulation porte sur ${nomService}, le ${etat.jourAffiche} à ${etat.heure}. Rien n’a été envoyé au salon.`;
    afficherEtape(4);
  });

  [prenom, telephone].forEach((champ) => champ.addEventListener('input', () => {
    champ.removeAttribute('aria-invalid');
    const erreur = document.getElementById(champ === prenom ? 'erreur-prenom' : 'erreur-telephone');
    erreur.hidden = true;
  }));

  formulaire.querySelector('[data-recommencer]')?.addEventListener('click', () => {
    formulaire.reset();
    etat.prestation = '';
    etat.jour = null;
    etat.jourAffiche = '';
    etat.heure = '';
    jours.querySelectorAll('button').forEach((bouton) => bouton.removeAttribute('aria-pressed'));
    heures.replaceChildren();
    formulaire.querySelectorAll('.erreur').forEach((erreur) => { erreur.hidden = true; });
    formulaire.querySelectorAll('[aria-invalid]').forEach((champ) => champ.removeAttribute('aria-invalid'));
    majRecapitulatif();
    afficherEtape(0);
  });

  creerJours();
  annoncerEtape(0);
  majRecapitulatif();
})();
