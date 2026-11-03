(() => {
  'use strict';

  const racine = document.documentElement;
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const espace = '\u00a0';
  const prestations = {
    'resine-classique': { nom: 'Résine · vernis normal', duree: 45 },
    'resine-semi': { nom: 'Résine · semi-permanent', duree: 50 },
    remplissage: { nom: 'Remplissage résine · vernis normal', duree: 45 },
    'gel-classique': { nom: 'Gel · vernis normal', duree: 50 },
    'gel-semi': { nom: 'Gel · semi-permanent', duree: 60 }
  };
  const heures = {
    0: [600, 1080],
    1: [600, 1200],
    2: [600, 1200],
    3: [600, 1200],
    4: [600, 1200],
    5: [600, 1200],
    6: [600, 1200]
  };
  const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const state = { etape: 0, prestation: '', jour: '', heure: '', prenom: '' };
  const formulaire = $('#booking-form');
  const panneaux = $$('[data-panel]');
  const boutonsEtapes = $$('[data-step-link]');
  const suivant = $('[data-next]');
  const retour = $('[data-back]');
  const envoyer = $('[data-confirm]');
  const controles = $('[data-booking-controls]');
  const live = $('[data-live]');
  const listeDates = $('[data-date-list]');
  const listeHeures = $('[data-slot-list]');

  racine.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => $('.hero')?.classList.add('hero--entered')));

  /* Révélations ponctuelles, avec contenu de secours toujours visible. */
  const elementsReveles = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-revealed');
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -32px 0px' });
    elementsReveles.forEach((element) => observateur.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-revealed'));
  }

  /* Menu de navigation pour petit écran. */
  const boutonMenu = $('.menu-toggle');
  const menu = $('#navigation');
  function fermerMenu() {
    boutonMenu?.setAttribute('aria-expanded', 'false');
    boutonMenu?.setAttribute('aria-label', 'Ouvrir le menu de navigation');
    if (menu) menu.hidden = true;
  }
  boutonMenu?.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    boutonMenu.setAttribute('aria-expanded', String(!ouvert));
    boutonMenu.setAttribute('aria-label', ouvert ? 'Ouvrir le menu de navigation' : 'Fermer le menu de navigation');
    if (menu) menu.hidden = ouvert;
  });
  menu?.addEventListener('click', (event) => {
    if (event.target.closest('a')) fermerMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && boutonMenu?.getAttribute('aria-expanded') === 'true') {
      fermerMenu();
      boutonMenu.focus();
    }
  });

  /* Barre fixe masquée lorsque le parcours ou le pied de page est à l’écran. */
  const barreMobile = $('.mobile-bar');
  const liensBarre = $$('a', barreMobile || document);
  if (barreMobile && 'IntersectionObserver' in window) {
    const zonesVisibles = new Map();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => zonesVisibles.set(entree.target, entree.isIntersecting));
      const dansZone = [...zonesVisibles.values()].some(Boolean);
      barreMobile.classList.toggle('is-away', dansZone);
      barreMobile.setAttribute('aria-hidden', String(dansZone));
      liensBarre.forEach((lien) => { lien.tabIndex = dansZone ? -1 : 0; });
    }, { threshold: 0.04 });
    ['#reserver', '.site-footer'].forEach((selecteur) => {
      const cible = $(selecteur);
      if (cible) observateurBarre.observe(cible);
    });
  }

  function dateParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
  }
  const dateAujourdHui = dateParis();
  const dateFormateur = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const heureFr = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}${espace}h${minutes % 60 ? `${espace}${String(minutes % 60).padStart(2, '0')}` : ''}`;

  function creerJours() {
    if (!listeDates) return;
    listeDates.replaceChildren();
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(dateAujourdHui.getTime() + i * 86400000);
      const jour = date.getUTCDay();
      const libelle = dateFormateur.format(date).replace('.', '');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'date-choice';
      bouton.dataset.jour = date.toISOString().slice(0, 10);
      bouton.dataset.fermeture = String(heures[jour] === null);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.innerHTML = `<span>${nomsJours[jour]}</span><span>${libelle}</span>`;
      if (heures[jour] === null) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${libelle}, fermé`);
      }
      bouton.addEventListener('click', () => choisirJour(bouton, date));
      listeDates.append(bouton);
    }
  }

  function choisirJour(bouton, date) {
    $$('.date-choice', listeDates).forEach((element) => element.setAttribute('aria-pressed', 'false'));
    bouton.setAttribute('aria-pressed', 'true');
    state.jour = bouton.dataset.jour;
    state.heure = '';
    const libelle = dateLongue.format(date);
    $('[data-resume-date]').textContent = libelle;
    $('[data-resume-time]').textContent = 'À choisir';
    effacerErreur('[data-date-error]');
    creerCreneaux(date);
    actualiserEtapes();
  }

  function creerCreneaux(date) {
    if (!listeHeures) return;
    listeHeures.replaceChildren();
    const limites = heures[date.getUTCDay()];
    if (!limites) return;
    const prestation = prestations[state.prestation];
    if (!prestation) return;
    const [ouverture, fermeture] = limites;
    const aujourdhui = date.toISOString().slice(0, 10) === dateAujourdHui.toISOString().slice(0, 10);
    const instantParis = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const minutesMaintenant = Number(instantParis.find((partie) => partie.type === 'hour')?.value || 0) * 60
      + Number(instantParis.find((partie) => partie.type === 'minute')?.value || 0);
    let index = 0;
    for (let debut = ouverture; debut + prestation.duree <= fermeture; debut += 30) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'slot-choice';
      bouton.dataset.heure = String(debut);
      bouton.textContent = heureFr(debut);
      bouton.setAttribute('aria-pressed', 'false');
      const dejaPris = (index * 7 + date.getUTCDate() + prestation.duree) % 11 === 3;
      const passe = aujourdhui && debut <= minutesMaintenant;
      if (dejaPris || passe) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${heureFr(debut)}, ${passe ? 'heure passée' : 'déjà pris dans cette démonstration'}`);
      }
      bouton.addEventListener('click', () => {
        $$('.slot-choice', listeHeures).forEach((element) => element.setAttribute('aria-pressed', 'false'));
        bouton.setAttribute('aria-pressed', 'true');
        state.heure = bouton.dataset.heure;
        $('[data-resume-time]').textContent = heureFr(debut);
        effacerErreur('[data-slot-error]');
        actualiserEtapes();
      });
      listeHeures.append(bouton);
      index += 1;
    }
  }

  function afficherEtape(index) {
    const ancienne = panneaux.find((panneau) => !panneau.hidden);
    const prochaine = panneaux.find((panneau) => Number(panneau.dataset.panel) === index);
    if (!prochaine || ancienne === prochaine) return;
    state.etape = index;
    if (index === 1 && !listeDates?.children.length) creerJours();
    if (ancienne) {
      ancienne.classList.add('is-leaving');
      const fin = () => {
        ancienne.hidden = true;
        ancienne.classList.remove('is-leaving');
        ancienne.removeEventListener('transitionend', fin);
      };
      if (reduire.matches) fin();
      else ancienne.addEventListener('transitionend', fin, { once: true });
      window.setTimeout(() => { if (!ancienne.hidden) fin(); }, 260);
    }
    prochaine.hidden = false;
    prochaine.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => prochaine.classList.remove('is-entering')));
    boutonsEtapes.forEach((bouton) => {
      const numero = Number(bouton.dataset.stepLink);
      bouton.toggleAttribute('aria-current', numero === index);
      if (numero === index) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      const accessible = numero <= index;
      bouton.setAttribute('aria-disabled', String(!accessible));
      bouton.disabled = !accessible;
    });
    controles.hidden = index === 4;
    retour.disabled = index === 0;
    suivant.hidden = index >= 3;
    envoyer.hidden = index !== 3;
    const titre = $('.step-title', prochaine);
    window.setTimeout(() => titre?.focus(), reduire.matches ? 0 : 230);
    live.textContent = index < 4 ? `Étape ${index + 1} sur 4 : ${titre?.textContent || ''}` : 'Démonstration terminée.';
  }

  function effacerErreur(selecteur) {
    const erreur = $(selecteur);
    if (erreur) erreur.textContent = '';
  }
  function actualiserEtapes() {
    const prestationChoisie = Boolean(state.prestation);
    const jourChoisi = Boolean(state.jour);
    const heureChoisie = Boolean(state.heure);
    boutonsEtapes.forEach((bouton) => {
      const index = Number(bouton.dataset.stepLink);
      const accessible = index === 0 || (index === 1 && prestationChoisie) || (index === 2 && jourChoisi) || (index === 3 && heureChoisie);
      bouton.disabled = !accessible;
      bouton.setAttribute('aria-disabled', String(!accessible));
    });
  }

  function validerEtape() {
    if (state.etape === 0 && !state.prestation) {
      $('#service-error').textContent = 'Choisissez une prestation pour continuer.';
      return false;
    }
    if (state.etape === 1 && !state.jour) {
      $('[data-date-error]').textContent = 'Choisissez un jour dans cette démonstration.';
      return false;
    }
    if (state.etape === 2 && !state.heure) {
      $('[data-slot-error]').textContent = 'Choisissez une heure proposée.';
      return false;
    }
    return true;
  }

  $$('#booking-form input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.prestation = radio.value;
      state.jour = '';
      state.heure = '';
      const prestation = prestations[state.prestation];
      $('[data-resume-service]').textContent = prestation.nom;
      $('[data-resume-date]').textContent = 'À choisir';
      $('[data-resume-time]').textContent = 'À choisir';
      listeDates?.replaceChildren();
      listeHeures?.replaceChildren();
      effacerErreur('#service-error');
      actualiserEtapes();
    });
  });
  suivant?.addEventListener('click', () => {
    if (!validerEtape()) return;
    const prochain = state.etape + 1;
    if (prochain === 1) creerJours();
    if (prochain === 2) {
      const date = new Date(`${state.jour}T12:00:00Z`);
      creerCreneaux(date);
    }
    afficherEtape(prochain);
  });
  retour?.addEventListener('click', () => { if (state.etape > 0) afficherEtape(state.etape - 1); });
  boutonsEtapes.forEach((bouton) => bouton.addEventListener('click', () => {
    const index = Number(bouton.dataset.stepLink);
    if (index > state.etape || bouton.disabled) return;
    afficherEtape(index);
  }));

  function telephoneValide(valeur) {
    const chiffres = valeur.replace(/\D/g, '');
    if (valeur.trim().startsWith('+33')) return /^33[67]\d{8}$/.test(chiffres);
    return /^0[67]\d{8}$/.test(chiffres);
  }
  formulaire?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validerEtape()) return;
    const prenom = $('#customer-name').value.trim();
    const telephone = $('#customer-phone').value.trim();
    $('#name-error').textContent = prenom ? '' : 'Indiquez votre prénom pour terminer la démonstration.';
    $('#phone-error').textContent = telephoneValide(telephone) ? '' : 'Saisissez un numéro mobile français valide.';
    if (!prenom || !telephoneValide(telephone)) {
      (!prenom ? $('#customer-name') : $('#customer-phone')).focus();
      return;
    }
    state.prenom = prenom;
    $('[data-resume-name]').textContent = prenom;
    const prestation = prestations[state.prestation];
    const date = new Date(`${state.jour}T12:00:00Z`);
    $('[data-success-copy]').textContent = `${prenom}, votre choix simulé : ${prestation.nom}, le ${dateLongue.format(date)} à ${heureFr(Number(state.heure))}.`;
    afficherEtape(4);
  });

  $$('[data-preselect]').forEach((bouton) => bouton.addEventListener('click', () => {
    const valeur = bouton.dataset.preselect;
    const radio = $(`#booking-form input[value="${valeur}"]`);
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      afficherEtape(0);
      $('#reserver')?.scrollIntoView({ behavior: reduire.matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => radio.focus(), 250);
    }
  }));

  actualiserEtapes();
  creerJours();
})();
