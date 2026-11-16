(() => {
  'use strict';

  window.__sitePret = true;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const un = (selecteur, racine = document) => racine.querySelector(selecteur);
  const plusieurs = (selecteur, racine = document) => [...racine.querySelectorAll(selecteur)];

  // Entrée du masthead en petites unités, sans retarder les contrôles.
  const elementsMasthead = [
    ...plusieurs('.masthead__ligne > *'),
    ...plusieurs('.reperes a')
  ];
  elementsMasthead.forEach((element, index) => {
    window.setTimeout(() => element.classList.add('visible'), reduit ? 0 : index * 40);
  });

  // Les titres et les lignes se révèlent une seule fois, par groupes de lecture.
  const groupes = new Map();
  plusieurs('.apparition, .ligne-index[data-apparition]').forEach((element) => {
    const groupe = element.parentElement;
    if (!groupes.has(groupe)) groupes.set(groupe, []);
    groupes.get(groupe).push(element);
  });
  const afficherGroupe = (groupe, elements) => {
    elements.forEach((element, index) => {
      window.setTimeout(() => element.classList.add('visible'), reduit ? 0 : index * 40);
    });
    groupe.classList?.add('groupe-visible');
  };
  if ('IntersectionObserver' in window && !reduit) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        afficherGroupe(entree.target, groupes.get(entree.target) || []);
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    groupes.forEach((_, groupe) => observateur.observe(groupe));
  } else {
    groupes.forEach((elements, groupe) => afficherGroupe(groupe, elements));
  }

  const nomsPrestations = new Map([
    ['coloration-meches', 'Coloration & mèches'],
    ['conseil-coupe', 'Conseil de coupe selon le visage'],
    ['coupe', 'Coupe'],
    ['soin', 'Soin des cheveux'],
    ['balayage', 'Balayage'],
    ['styles', 'Coiffure pour cheveux courts, bouclés ou frisés'],
    ['tissages', 'Tissage et pose d’extension']
  ]);
  const plagesHoraires = {
    0: null,
    1: null,
    2: [9, 19],
    3: [9, 19],
    4: [9, 18],
    5: [9, 19],
    6: [9, 19]
  };
  const etat = { etape: 1, max: 1, prestation: '', jour: '', heure: '', prenom: '' };
  const boutonsEtape = plusieurs('[data-etape]');
  const panneauxEtape = plusieurs('[data-panneau]');
  const annonce = un('.annonce-etape');
  const listeJours = un('#liste-jours');
  const listeCreneaux = un('#liste-creneaux');
  const confirmation = un('#confirmation');
  const formulaire = un('#demande-rendez-vous');
  const etapes = un('.etapes');
  const resumee = {
    prestation: un('#resume-prestation'),
    jour: un('#resume-jour'),
    heure: un('#resume-heure'),
    prenom: un('#resume-prenom')
  };
  let aujourdHui = '';
  let libelleJour = '';
  let libelleHeure = '';

  function dateParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeur = (type) => morceaux.find((partie) => partie.type === type)?.value || '';
    return { annee: Number(valeur('year')), mois: Number(valeur('month')), jour: Number(valeur('day')) };
  }

  function heureParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeur = (type) => Number(morceaux.find((partie) => partie.type === type)?.value || 0);
    return valeur('hour') * 60 + valeur('minute');
  }

  function dateDepuisIso(iso) {
    return new Date(`${iso}T12:00:00Z`);
  }

  function jourEnToutesLettres(iso) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateDepuisIso(iso));
  }

  function premierMotEnMajuscule(texte) {
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  }

  function heureEnLettres(minutes) {
    const heures = Math.floor(minutes / 60);
    const minutesRestantes = minutes % 60;
    return `${heures} h ${String(minutesRestantes).padStart(2, '0')}`;
  }

  function creerJours() {
    if (!listeJours) return;
    const base = dateParis();
    aujourdHui = `${base.annee}-${String(base.mois).padStart(2, '0')}-${String(base.jour).padStart(2, '0')}`;
    const depart = new Date(Date.UTC(base.annee, base.mois - 1, base.jour, 12));
    listeJours.textContent = '';

    for (let decalage = 0; decalage < 12; decalage += 1) {
      const date = new Date(depart);
      date.setUTCDate(depart.getUTCDate() + decalage);
      const iso = date.toISOString().slice(0, 10);
      const jourSemaine = date.getUTCDay();
      const plage = plagesHoraires[jourSemaine];
      const jour = premierMotEnMajuscule(new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' }).format(date));
      const dateCourte = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(date).replace('.', '');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour-simule';
      bouton.dataset.jour = iso;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.disabled = !plage;
      bouton.setAttribute('aria-label', plage
        ? `${jour} ${jourEnToutesLettres(iso).split(' ').slice(1).join(' ')}, ouvert de ${heureEnLettres(plage[0] * 60)} à ${heureEnLettres(plage[1] * 60)} dans la grille indicative`
        : `${jour} ${jourEnToutesLettres(iso).split(' ').slice(1).join(' ')}, fermé dans la grille indicative`);

      const nomJour = document.createElement('span');
      nomJour.textContent = jour;
      const dateJour = document.createElement('span');
      dateJour.textContent = plage ? dateCourte : `${dateCourte} · Fermé`;
      bouton.append(nomJour, dateJour);
      bouton.addEventListener('click', () => choisirJour(iso, `${jour} ${jourEnToutesLettres(iso).split(' ').slice(1).join(' ')}`));
      listeJours.append(bouton);
    }
  }

  function empreinte(texte) {
    let resultat = 0;
    for (let index = 0; index < texte.length; index += 1) {
      resultat = ((resultat << 5) - resultat + texte.charCodeAt(index)) | 0;
    }
    return Math.abs(resultat);
  }

  function creerCreneaux(iso) {
    if (!listeCreneaux) return;
    const date = dateDepuisIso(iso);
    const plage = plagesHoraires[date.getUTCDay()];
    listeCreneaux.textContent = '';
    if (!plage) {
      const message = document.createElement('p');
      message.className = 'attente-script';
      message.textContent = 'Ce jour est fermé dans la grille indicative.';
      listeCreneaux.append(message);
      return;
    }

    const maintenant = heureParis();
    let indexCreneau = 0;
    let nombrePropose = 0;
    for (let minute = plage[0] * 60; minute + 30 <= plage[1] * 60; minute += 30) {
      if (iso === aujourdHui && minute <= maintenant) continue;
      const estIndisponible = empreinte(`${iso}-${minute}`) % 9 === 0;
      const bouton = document.createElement('button');
      const libelle = heureEnLettres(minute);
      bouton.type = 'button';
      bouton.className = 'creneau';
      bouton.dataset.heure = libelle;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.disabled = estIndisponible;
      bouton.setAttribute('aria-label', estIndisponible
        ? `${libelle}, indisponible dans cette simulation`
        : `${libelle}, choix fictif dans cette simulation`);
      const heure = document.createElement('span');
      heure.textContent = libelle;
      bouton.append(heure);
      if (estIndisponible) {
        const statut = document.createElement('small');
        statut.textContent = 'Indisponible · aperçu';
        bouton.append(statut);
      }
      bouton.addEventListener('click', () => choisirHeure(libelle));
      listeCreneaux.append(bouton);
      indexCreneau += 1;
      nombrePropose += 1;
    }
    if (nombrePropose === 0) {
      const message = document.createElement('p');
      message.className = 'attente-script';
      message.textContent = 'Aucun horaire restant aujourd’hui dans la simulation. Choisissez un autre jour.';
      listeCreneaux.append(message);
    } else if (indexCreneau === 0) {
      listeCreneaux.setAttribute('aria-label', 'Aucun horaire restant dans la simulation');
    }
  }

  function mettreAJourResume() {
    if (resumee.prestation) resumee.prestation.textContent = nomsPrestations.get(etat.prestation) || 'À choisir';
    if (resumee.jour) resumee.jour.textContent = etat.jour ? premierMotEnMajuscule(libelleJour) : 'À choisir';
    if (resumee.heure) resumee.heure.textContent = etat.heure || 'À choisir';
    if (resumee.prenom) resumee.prenom.textContent = etat.prenom || 'À compléter';
  }

  function choisirJour(iso, libelle) {
    etat.jour = iso;
    libelleJour = libelle;
    etat.heure = '';
    libelleHeure = '';
    plusieurs('.jour-simule', listeJours).forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.jour === iso));
    });
    creerCreneaux(iso);
    mettreAJourResume();
    const erreur = un('#erreur-jour');
    if (erreur) erreur.hidden = true;
  }

  function choisirHeure(heure) {
    etat.heure = heure;
    libelleHeure = heure;
    plusieurs('.creneau', listeCreneaux).forEach((bouton) => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.heure === heure));
    });
    mettreAJourResume();
    const erreur = un('#erreur-heure');
    if (erreur) erreur.hidden = true;
  }

  function annoncerEtape(numero) {
    const messages = [
      'Étape 1 sur 4 — choisissez une prestation.',
      'Étape 2 sur 4 — choisissez un jour.',
      'Étape 3 sur 4 — choisissez une heure.',
      'Étape 4 sur 4 — indiquez vos coordonnées.'
    ];
    if (annonce) annonce.textContent = messages[numero - 1];
  }

  function afficherEtape(numero, donnerFocus = true) {
    if (numero < 1 || numero > 4 || numero > etat.max) return;
    etat.etape = numero;
    if (confirmation) confirmation.hidden = true;
    if (etapes) etapes.hidden = false;
    panneauxEtape.forEach((panneau) => {
      const actif = Number(panneau.dataset.panneau) === numero;
      panneau.hidden = !actif;
      panneau.classList.remove('actif');
      if (actif) {
        panneau.getBoundingClientRect();
        window.requestAnimationFrame(() => panneau.classList.add('actif'));
      }
    });
    boutonsEtape.forEach((bouton) => {
      const valeur = Number(bouton.dataset.etape);
      bouton.disabled = valeur > etat.max;
      if (valeur === numero) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    annoncerEtape(numero);
    if (donnerFocus) {
      const titre = un(`#titre-etape-${numero}`);
      window.requestAnimationFrame(() => titre?.focus({ preventScroll: true }));
    }
  }

  function validerEtape(numero) {
    const erreurPrestation = un('#erreur-prestation');
    const erreurJour = un('#erreur-jour');
    const erreurHeure = un('#erreur-heure');
    if (numero === 1) {
      const choix = un('input[name="prestation"]:checked');
      if (!choix) {
        erreurPrestation.hidden = false;
        un('input[name="prestation"]')?.focus();
        return false;
      }
      etat.prestation = choix.value;
      erreurPrestation.hidden = true;
      mettreAJourResume();
    }
    if (numero === 2 && !etat.jour) {
      erreurJour.hidden = false;
      un('.jour-simule:not(:disabled)')?.focus();
      return false;
    }
    if (numero === 3 && !etat.heure) {
      erreurHeure.hidden = false;
      un('.creneau:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  function verifierTelephone(texte) {
    const chiffres = texte.replace(/\D/g, '');
    return /^(?:0[67]\d{8}|33[67]\d{8}|0033[67]\d{8})$/.test(chiffres);
  }

  function validerCoordonnees() {
    const champPrenom = un('#prenom');
    const champTelephone = un('#telephone');
    const erreurPrenom = un('#erreur-prenom');
    const erreurTelephone = un('#erreur-telephone');
    const prenom = champPrenom.value.trim().replace(/\s+/g, ' ');
    const prenomValide = [...prenom].filter((caractere) => /\p{L}/u.test(caractere)).length >= 2;
    const telephoneValide = verifierTelephone(champTelephone.value);
    erreurPrenom.hidden = prenomValide;
    erreurTelephone.hidden = telephoneValide;
    champPrenom.setAttribute('aria-invalid', String(!prenomValide));
    champTelephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (!prenomValide) {
      champPrenom.focus();
      return false;
    }
    if (!telephoneValide) {
      champTelephone.focus();
      return false;
    }
    etat.prenom = prenom;
    mettreAJourResume();
    return true;
  }

  function confirmerSimulation() {
    if (!validerCoordonnees()) return;
    panneauxEtape.forEach((panneau) => { panneau.hidden = true; panneau.classList.remove('actif'); });
    if (etapes) etapes.hidden = true;
    if (annonce) annonce.textContent = 'La simulation est terminée. Aucun rendez-vous n’a été envoyé.';
    if (confirmation) {
      const resume = `${etat.prenom} : ${nomsPrestations.get(etat.prestation)}, ${libelleJour} à ${libelleHeure}. Aucun rendez-vous n’a été demandé et rien n’a été envoyé au salon.`;
      un('#texte-confirmation').textContent = resume;
      confirmation.hidden = false;
      confirmation.classList.remove('actif');
      confirmation.getBoundingClientRect();
      window.requestAnimationFrame(() => confirmation.classList.add('actif'));
      window.requestAnimationFrame(() => un('#titre-confirmation')?.focus({ preventScroll: true }));
    }
  }

  if (listeJours && listeCreneaux) {
    creerJours();
    listeJours.setAttribute('aria-describedby', 'erreur-jour');
    listeCreneaux.setAttribute('aria-describedby', 'erreur-heure');
  }

  plusieurs('input[name="prestation"]').forEach((choix) => {
    choix.addEventListener('change', () => {
      etat.prestation = choix.value;
      un('#erreur-prestation').hidden = true;
      mettreAJourResume();
    });
  });

  plusieurs('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const choix = un(`input[name="prestation"][value="${lien.dataset.prestation}"]`);
      if (!choix) return;
      choix.checked = true;
      etat.prestation = choix.value;
      etat.jour = '';
      etat.heure = '';
      libelleJour = '';
      libelleHeure = '';
      etat.max = 1;
      plusieurs('.jour-simule', listeJours).forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
      afficherEtape(1, false);
      mettreAJourResume();
    });
  });

  boutonsEtape.forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.etape)));
  });
  plusieurs('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!validerEtape(etat.etape)) return;
      const suivante = etat.etape + 1;
      etat.max = Math.max(etat.max, suivante);
      afficherEtape(suivante);
    });
  });
  plusieurs('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(etat.etape - 1));
  });
  formulaire?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape < 4) {
      if (!validerEtape(etat.etape)) return;
      const suivante = etat.etape + 1;
      etat.max = Math.max(etat.max, suivante);
      afficherEtape(suivante);
      return;
    }
    confirmerSimulation();
  });
  un('#prenom')?.addEventListener('input', (evenement) => {
    const prenom = evenement.currentTarget.value.trim().replace(/\s+/g, ' ');
    const valable = [...prenom].filter((caractere) => /\p{L}/u.test(caractere)).length >= 2;
    evenement.currentTarget.setAttribute('aria-invalid', String(!valable && prenom.length > 0));
    if (valable) un('#erreur-prenom').hidden = true;
  });
  un('#telephone')?.addEventListener('input', (evenement) => {
    const valable = verifierTelephone(evenement.currentTarget.value);
    evenement.currentTarget.setAttribute('aria-invalid', String(!valable && evenement.currentTarget.value.length > 0));
    if (valable) un('#erreur-telephone').hidden = true;
  });
  mettreAJourResume();

  // La barre de contact mobile disparaît pendant la lecture du héros, de la réservation et du pied de page.
  const barreMobile = un('.barre-mobile');
  const hero = un('.fait-signature');
  const piedPage = un('.pied-page');
  if (barreMobile && hero && piedPage && 'IntersectionObserver' in window) {
    const etatVisibilite = { hero: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      const masquer = etatVisibilite.hero || etatVisibilite.reservation || etatVisibilite.pied;
      barreMobile.classList.toggle('is-masquee', masquer);
      barreMobile.setAttribute('aria-hidden', String(masquer));
      barreMobile.inert = masquer;
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === hero) etatVisibilite.hero = entree.isIntersecting;
        if (entree.target === un('#reserver')) etatVisibilite.reservation = entree.isIntersecting;
        if (entree.target === piedPage) etatVisibilite.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.03 });
    observateurBarre.observe(hero);
    observateurBarre.observe(un('#reserver'));
    observateurBarre.observe(piedPage);
    actualiserBarre();
  }
})();
