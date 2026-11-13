/* Bruno Côté Salon · réservation de démonstration, sans envoi. */
window.__site = true;
(() => {
  'use strict';

  const racine = document.documentElement;
  racine.classList.add('js');
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const tous = (selecteur, parent = document) => Array.from(parent.querySelectorAll(selecteur));
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heuresOuverture = {
    0: null,
    1: null,
    2: [600, 1140],
    3: [600, 1140],
    4: [600, 1140],
    5: [600, 1140],
    6: [540, 960]
  };
  const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmtParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const fmtJourCourt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short'
  });
  const fmtJourLong = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });

  const navigationToggle = $('.nav-toggle');
  const navigationMobile = $('#navigation-mobile');

  function fermerNavigation(rendreLeFocus = false) {
    if (!navigationToggle || !navigationMobile) return;
    navigationToggle.setAttribute('aria-expanded', 'false');
    navigationToggle.setAttribute('aria-label', 'Ouvrir la navigation');
    navigationMobile.hidden = true;
    if (rendreLeFocus) navigationToggle.focus();
  }

  if (navigationToggle && navigationMobile) {
    navigationToggle.addEventListener('click', () => {
      const ouverte = navigationToggle.getAttribute('aria-expanded') === 'true';
      navigationToggle.setAttribute('aria-expanded', String(!ouverte));
      navigationToggle.setAttribute('aria-label', ouverte ? 'Ouvrir la navigation' : 'Fermer la navigation');
      navigationMobile.hidden = ouverte;
      if (!ouverte) {
        const premierLien = $('a', navigationMobile);
        if (premierLien) premierLien.focus();
      }
    });
    navigationMobile.addEventListener('click', (event) => {
      if (event.target.closest('a')) fermerNavigation(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navigationToggle.getAttribute('aria-expanded') === 'true') {
        fermerNavigation(true);
      }
    });
  }

  const hero = $('.hero');
  if (hero) requestAnimationFrame(() => hero.classList.add('is-ready'));

  const elementsReveles = tous('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });
    elementsReveles.forEach((element) => observateur.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  }

  const form = $('#booking-form');
  if (!form) return;
  const bookingUi = $('.booking-ui');

  const steps = tous('.booking-step', form);
  const stepOrder = ['prestation', 'jour', 'heure', 'coordonnees', 'confirmation'];
  const stepMap = new Map(steps.map((step) => [step.dataset.etape, step]));
  let etapeCourante = 'prestation';
  let jourChoisi = null;
  let heureChoisie = null;
  let minutesChoisies = null;

  function partiesParis(date = new Date()) {
    const parties = {};
    fmtParis.formatToParts(date).forEach((partie) => {
      parties[partie.type] = partie.value;
    });
    return {
      annee: Number(parties.year),
      mois: Number(parties.month),
      jour: Number(parties.day),
      heure: Number(parties.hour) % 24,
      minute: Number(parties.minute)
    };
  }

  function cleDate(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }

  function heureFr(minute) {
    const heure = Math.floor(minute / 60);
    const reste = minute % 60;
    return reste === 0 ? `${heure}\u00a0h` : `${heure}\u00a0h\u00a0${String(reste).padStart(2, '0')}`;
  }

  function joursAvenir() {
    const aujourdhui = partiesParis();
    return Array.from({ length: 14 }, (_, decalage) => {
      const date = new Date(Date.UTC(aujourdhui.annee, aujourdhui.mois - 1, aujourdhui.jour + decalage, 12));
      const semaine = date.getUTCDay();
      const plage = heuresOuverture[semaine];
      return {
        date,
        cle: cleDate(date),
        semaine,
        ouvert: Boolean(plage),
        heures: plage,
        libelleCourt: fmtJourCourt.format(date),
        libelleLong: fmtJourLong.format(date),
        libelleAcces: plage
          ? `${nomsJours[semaine]} ${fmtJourLong.format(date).replace(/^\S+\s*/, '')}, ouvert de ${heureFr(plage[0])} à ${heureFr(plage[1])}`
          : `${nomsJours[semaine]} ${fmtJourLong.format(date).replace(/^\S+\s*/, '')}, fermé`
      };
    });
  }

  const jours = joursAvenir();
  const conteneurJours = $('#choix-jours');
  const conteneurHeures = $('#choix-heures');
  const messageJour = $('#jour-choisi');
  const boutonSuivantJour = $('[data-suivante="heure"]', form);
  const boutonSuivantHeure = $('[data-suivante="coordonnees"]', form);
  const resumeJour = $('#resume-jour');
  const resumeHeure = $('#resume-heure');
  const resumeFinal = $('#recap-final');
  const boutonsResumeJour = tous('[data-retour="jour"]');
  const boutonsResumeHeure = tous('[data-retour="heure"]');
  const regionEtapes = $('#etapes-reservation');
  const annonceEtape = $('#annonce-etape');

  function prestationCourante() {
    const coche = $('input[name="prestation"]:checked', form);
    return coche ? 'Co-wash' : 'Prestation à choisir';
  }

  function actualiserProgression(nomEtape) {
    const rang = stepOrder.indexOf(nomEtape);
    tous('[data-progress]').forEach((etiquette) => {
      const index = stepOrder.indexOf(etiquette.dataset.progress);
      etiquette.classList.toggle('is-current', etiquette.dataset.progress === nomEtape);
      etiquette.classList.toggle('is-done', index >= 0 && index < rang);
      if (etiquette.dataset.progress === nomEtape) etiquette.setAttribute('aria-current', 'step');
      else etiquette.removeAttribute('aria-current');
    });
  }

  function changerEtape(nomEtape) {
    const suivante = stepMap.get(nomEtape);
    const precedente = stepMap.get(etapeCourante);
    if (!suivante || !precedente || nomEtape === etapeCourante) return;
    etapeCourante = nomEtape;
    suivante.hidden = false;
    suivante.inert = false;
    suivante.setAttribute('aria-hidden', 'false');
    suivante.classList.add('is-entering');
    precedente.inert = true;
    precedente.setAttribute('aria-hidden', 'true');
    precedente.classList.add('is-leaving');
    actualiserProgression(nomEtape);
    const nomsEtapes = { prestation: 'prestation', jour: 'jour', heure: 'heure', coordonnees: 'coordonnées', confirmation: 'confirmation' };
    if (regionEtapes) regionEtapes.setAttribute('aria-label', `Étape ${stepOrder.indexOf(nomEtape) + 1} sur 5\u00a0: ${nomsEtapes[nomEtape]}`);
    if (annonceEtape) annonceEtape.textContent = `Étape ${stepOrder.indexOf(nomEtape) + 1} sur 5\u00a0: ${nomsEtapes[nomEtape]}.`;

    requestAnimationFrame(() => {
      suivante.classList.remove('is-entering');
      suivante.classList.add('is-current');
    });

    const duree = reduire.matches ? 180 : 250;
    window.setTimeout(() => {
      precedente.hidden = true;
      precedente.classList.remove('is-current', 'is-leaving');
      suivante.classList.add('is-current');
      const titre = $('h3', suivante);
      if (titre) {
        titre.focus({ preventScroll: true });
        const boite = titre.getBoundingClientRect();
        if (boite.top < 20 || boite.bottom > window.innerHeight - 20) {
          titre.scrollIntoView({ behavior: reduire.matches ? 'auto' : 'smooth', block: 'center' });
        }
      }
    }, duree);
  }

  function afficherJours() {
    if (!conteneurJours) return;
    conteneurJours.replaceChildren();
    jours.forEach((jour) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'day-option';
      bouton.dataset.jour = jour.cle;
      bouton.setAttribute('aria-label', jour.libelleAcces);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.disabled = !jour.ouvert;

      const semaine = document.createElement('span');
      semaine.textContent = jour.libelleCourt.split(' ')[0].replace('.', '');
      const numero = document.createElement('strong');
      numero.textContent = String(jour.date.getUTCDate());
      const statut = document.createElement('span');
      statut.textContent = jour.ouvert ? 'ouvert' : 'fermé';
      bouton.append(semaine, numero, statut);
      conteneurJours.append(bouton);
    });
  }

  function petitHash(texte) {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) valeur = (valeur * 31 + texte.charCodeAt(index)) >>> 0;
    return valeur;
  }

  function afficherHeures(jour) {
    if (!conteneurHeures) return;
    conteneurHeures.replaceChildren();
    const plage = jour && jour.heures;
    if (!plage) return;
    const maintenant = partiesParis();
    const estAujourdhui = jour.cle === cleDate(new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour, 12)));
    const minuteActuelle = maintenant.heure * 60 + maintenant.minute;

    for (let minute = plage[0]; minute < plage[1]; minute += 30) {
      const indice = Math.floor((minute - plage[0]) / 30);
      const indisponibleDemo = petitHash(`${jour.cle}-${indice}`) % 7 === 2;
      const passe = estAujourdhui && minute <= minuteActuelle;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-option';
      bouton.dataset.heure = String(minute);
      bouton.textContent = heureFr(minute);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.disabled = indisponibleDemo || passe;
      if (indisponibleDemo) bouton.setAttribute('aria-label', `${heureFr(minute)}, indisponible dans cette démonstration`);
      else if (passe) bouton.setAttribute('aria-label', `${heureFr(minute)}, heure passée`);
      else bouton.setAttribute('aria-label', `${heureFr(minute)}, créneau de démonstration`);
      conteneurHeures.append(bouton);
    }
  }

  function actualiserRecapitulatif() {
    if ($('#resume-prestation')) $('#resume-prestation').textContent = prestationCourante();
    if (resumeJour) resumeJour.textContent = jourChoisi ? jourChoisi.libelleLong : 'À choisir';
    if (resumeHeure) resumeHeure.textContent = heureChoisie || 'À choisir';
    boutonsResumeJour.forEach((bouton) => { bouton.disabled = !jourChoisi; });
    boutonsResumeHeure.forEach((bouton) => { bouton.disabled = !heureChoisie; });
    if (resumeFinal) {
      const date = jourChoisi ? jourChoisi.libelleLong : 'jour à choisir';
      const heure = heureChoisie || 'heure à choisir';
      resumeFinal.textContent = `${prestationCourante()} · ${date} · ${heure}. Démonstration uniquement.`;
    }
  }

  afficherJours();
  steps.forEach((step) => {
    const actif = step.dataset.etape === 'prestation';
    step.hidden = !actif;
    step.inert = !actif;
    step.setAttribute('aria-hidden', String(!actif));
  });
  actualiserProgression(etapeCourante);
  actualiserRecapitulatif();

  form.addEventListener('change', (event) => {
    if (event.target.matches('input[name="prestation"]')) actualiserRecapitulatif();
  });

  if (conteneurJours) {
    conteneurJours.addEventListener('click', (event) => {
      const bouton = event.target.closest('[data-jour]');
      if (!bouton || bouton.disabled) return;
      jourChoisi = jours.find((jour) => jour.cle === bouton.dataset.jour) || null;
      heureChoisie = null;
      minutesChoisies = null;
      tous('.day-option', conteneurJours).forEach((option) => option.setAttribute('aria-pressed', String(option === bouton)));
      afficherHeures(jourChoisi);
      if (boutonSuivantJour) boutonSuivantJour.disabled = !jourChoisi;
      if (boutonSuivantHeure) boutonSuivantHeure.disabled = true;
      if ($('#erreur-jour')) $('#erreur-jour').textContent = '';
      if (messageJour && jourChoisi) {
        const ouverture = jourChoisi.heures.map(heureFr).join(' à ');
        messageJour.textContent = `${jourChoisi.libelleLong} · horaires publiés ${ouverture}. Disponibilités de démonstration.`;
      }
      actualiserRecapitulatif();
    });
  }

  if (conteneurHeures) {
    conteneurHeures.addEventListener('click', (event) => {
      const bouton = event.target.closest('[data-heure]');
      if (!bouton || bouton.disabled) return;
      minutesChoisies = Number(bouton.dataset.heure);
      heureChoisie = heureFr(minutesChoisies);
      tous('.time-option', conteneurHeures).forEach((option) => option.setAttribute('aria-pressed', String(option === bouton)));
      if (boutonSuivantHeure) boutonSuivantHeure.disabled = false;
      if ($('#erreur-heure')) $('#erreur-heure').textContent = '';
      actualiserRecapitulatif();
    });
  }

  bookingUi.addEventListener('click', (event) => {
    const aller = event.target.closest('[data-suivante]');
    if (aller && !aller.disabled) {
      if (aller.dataset.suivante === 'heure' && !jourChoisi) {
        $('#erreur-jour').textContent = 'Choisissez un jour ouvert pour continuer.';
        return;
      }
      if (aller.dataset.suivante === 'coordonnees' && !heureChoisie) {
        $('#erreur-heure').textContent = 'Choisissez un créneau de démonstration pour continuer.';
        return;
      }
      changerEtape(aller.dataset.suivante);
      return;
    }
    const retourEtape = event.target.closest('[data-precedente], [data-retour]');
    if (retourEtape) {
      const destination = retourEtape.dataset.precedente || retourEtape.dataset.retour;
      const destinationIndex = stepOrder.indexOf(destination);
      const courantIndex = stepOrder.indexOf(etapeCourante);
      if (destinationIndex >= 0 && destinationIndex < courantIndex) changerEtape(destination);
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const champPrenom = $('#prenom');
    const champTelephone = $('#telephone');
    const erreurPrenom = $('#erreur-prenom');
    const erreurTelephone = $('#erreur-telephone');
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.replace(/[\s().-]/g, '');
    const numeroMobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephone);

    erreurPrenom.textContent = prenom.length >= 2 ? '' : 'Saisissez un prénom de deux caractères au moins.';
    erreurTelephone.textContent = numeroMobileValide ? '' : 'Saisissez un numéro mobile français valide.';
    if (prenom.length < 2) {
      champPrenom.focus();
      return;
    }
    if (!numeroMobileValide) {
      champTelephone.focus();
      return;
    }
    if (!jourChoisi || !heureChoisie || minutesChoisies === null) {
      changerEtape(jourChoisi ? 'heure' : 'jour');
      return;
    }

    $('#message-succes').textContent = `Merci ${prenom}. Cette confirmation appartient à la démonstration : aucune demande n’a été envoyée au salon.`;
    $('#recap-succes').textContent = `${prestationCourante()} · ${jourChoisi.libelleLong} · ${heureChoisie}.`;
    changerEtape('confirmation');
  });
})();
