window.__site = true;

(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const $ = (selecteur, parent = doc) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = doc) => Array.from(parent.querySelectorAll(selecteur));
  const decalage = '\u00a0';
  const nomsJours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const heuresOuverture = {
    0: null,
    1: null,
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 18 * 60]
  };
  const libellesPrestations = { coupe: 'Coupe femme', coloration: 'Coloration' };
  const etat = { prestation: '', jour: null, heure: '', prenom: '' };
  const panneauHero = $('.heros');
  const formulaire = $('#formulaire-rendez-vous');
  const panneauxEtapes = $$('[data-etape]');
  const indicateurs = $$('[data-indicateur]');
  const boutonsJours = $('#liste-jours');
  const choixHeures = $('#liste-heures');
  let etapeCourante = 0;

  const formatterParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formatterJourCourt = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'
  });
  const formatterJourLong = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });

  function maintenantParis() {
    const fragments = {};
    formatterParis.formatToParts(new Date()).forEach((fragment) => { fragments[fragment.type] = fragment.value; });
    const date = new Date(Date.UTC(Number(fragments.year), Number(fragments.month) - 1, Number(fragments.day), 12));
    return {
      date,
      annee: Number(fragments.year),
      mois: Number(fragments.month),
      jour: Number(fragments.day),
      minutes: Number(fragments.hour) * 60 + Number(fragments.minute)
    };
  }

  function formatHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const minutesRestantes = minutes % 60;
    return minutesRestantes ? `${heures}${decalage}h${decalage}${String(minutesRestantes).padStart(2, '0')}` : `${heures}${decalage}h`;
  }

  function debutAnimations() {
    requestAnimationFrame(() => requestAnimationFrame(() => panneauHero?.classList.add('heros--pret')));
  }
  if (doc.fonts?.ready) {
    Promise.race([doc.fonts.ready, new Promise((resoudre) => setTimeout(resoudre, 650))]).then(debutAnimations);
  } else {
    debutAnimations();
  }

  /* Navigation mobile, ouverte au clavier comme au toucher. */
  const boutonNavigation = $('.navigation__bouton');
  const navigationMobile = $('#navigation-mobile');
  if (boutonNavigation && navigationMobile) {
    const texteBoutonNavigation = $('.navigation__texte', boutonNavigation);
    const fermerNavigation = (rendreLeFocus) => {
      boutonNavigation.setAttribute('aria-expanded', 'false');
      boutonNavigation.setAttribute('aria-label', 'Ouvrir la navigation');
      if (texteBoutonNavigation) texteBoutonNavigation.textContent = 'Rubriques';
      navigationMobile.hidden = true;
      if (rendreLeFocus) boutonNavigation.focus();
    };
    boutonNavigation.addEventListener('click', () => {
      const ouverture = boutonNavigation.getAttribute('aria-expanded') !== 'true';
      boutonNavigation.setAttribute('aria-expanded', String(ouverture));
      boutonNavigation.setAttribute('aria-label', ouverture ? 'Fermer la navigation' : 'Ouvrir la navigation');
      if (texteBoutonNavigation) texteBoutonNavigation.textContent = ouverture ? 'Fermer' : 'Rubriques';
      navigationMobile.hidden = !ouverture;
      if (ouverture) $('a', navigationMobile)?.focus({ preventScroll: true });
    });
    navigationMobile.addEventListener('click', (evenement) => {
      const lien = evenement.target.closest('a');
      if (!lien) return;
      const cibleAncre = lien.getAttribute('href');
      fermerNavigation(false);
      if (cibleAncre?.startsWith('#')) {
        const cible = $(cibleAncre);
        const titre = cible?.querySelector('h2');
        requestAnimationFrame(() => titre?.focus({ preventScroll: true }));
      }
    });
    doc.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonNavigation.getAttribute('aria-expanded') === 'true') fermerNavigation(true);
    });
    window.matchMedia('(min-width: 52rem)').addEventListener('change', (evenement) => {
      if (evenement.matches) fermerNavigation(false);
    });
  }

  /* Les dates et heures suivent les horaires publiés, qui restent à confirmer. */
  function creerJours() {
    if (!boutonsJours) return;
    const maintenant = maintenantParis();
    const premierJour = maintenant.date;
    boutonsJours.replaceChildren();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(premierJour.getTime() + index * 86400000);
      const jourSemaine = date.getUTCDay();
      const plage = heuresOuverture[jourSemaine];
      const ouvert = plage !== null;
      const aujourdhuiTermine = index === 0 && ouvert && !plage.some((heure) => heure > maintenant.minutes && heure < plage[1]);
      const court = formatterJourCourt.format(date).replace('.', '');
      const complet = formatterJourLong.format(date);
      const libelle = complet.charAt(0).toLocaleUpperCase('fr-FR') + complet.slice(1);
      const numero = String(date.getUTCDate());
      const cleDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jours__bouton';
      bouton.dataset.jour = cleDate;
      bouton.disabled = !ouvert || aujourdhuiTermine;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', !ouvert ? `${libelle}, fermé` : aujourdhuiTermine ? `${libelle}, horaires terminés aujourd’hui` : libelle);
      bouton.innerHTML = `<span>${court}</span><span>${numero}</span>${!ouvert ? '<span>fermé</span>' : aujourdhuiTermine ? '<span>terminé</span>' : ''}`;
      if (ouvert && !aujourdhuiTermine) {
        bouton.addEventListener('click', () => {
          $$('.jours__bouton', boutonsJours).forEach((element) => element.setAttribute('aria-pressed', 'false'));
          bouton.setAttribute('aria-pressed', 'true');
          etat.jour = { cle: cleDate, nom: libelle, jourSemaine, date };
          etat.heure = '';
          $('#erreur-jour').hidden = true;
          $('#erreur-heure').hidden = true;
          creerHeures();
          actualiserResume();
        });
      }
      boutonsJours.append(bouton);
    }
  }

  function creerHeures() {
    if (!choixHeures || !etat.jour) return;
    const plage = heuresOuverture[etat.jour.jourSemaine];
    if (!plage) return;
    const maintenant = maintenantParis();
    const estAujourdHui = etat.jour.cle === `${maintenant.annee}-${String(maintenant.mois).padStart(2, '0')}-${String(maintenant.jour).padStart(2, '0')}`;
    choixHeures.replaceChildren();
    for (let minute = plage[0]; minute < plage[1]; minute += 60) {
      const heurePassee = estAujourdHui && minute <= maintenant.minutes;
      const valeur = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const libelle = `${String(Math.floor(minute / 60)).padStart(2, '0')}${decalage}h${decalage}00`;
      const etiquette = doc.createElement('label');
      etiquette.className = 'heure';
      const radio = doc.createElement('input');
      radio.type = 'radio';
      radio.name = 'heure';
      radio.value = valeur;
      radio.required = true;
      radio.disabled = heurePassee;
      radio.setAttribute('aria-label', heurePassee ? `${libelle}, heure passée` : `Demander ${libelle}`);
      const texte = doc.createElement('span');
      const indication = doc.createElement('span');
      indication.textContent = libelle;
      texte.append(indication);
      if (heurePassee) {
        const statut = doc.createElement('small');
        statut.textContent = 'passée';
        texte.append(statut);
      }
      radio.addEventListener('change', () => {
        etat.heure = valeur;
        $('#erreur-heure').hidden = true;
        actualiserResume();
      });
      etiquette.append(radio, texte);
      choixHeures.append(etiquette);
    }
  }

  function actualiserResume() {
    const valeurs = {
      prestation: libellesPrestations[etat.prestation] || 'À choisir',
      jour: etat.jour?.nom || 'À choisir',
      heure: etat.heure ? formatHeure(Number(etat.heure.slice(0, 2)) * 60 + Number(etat.heure.slice(3))) : 'À choisir',
      prenom: etat.prenom || '—'
    };
    Object.entries(valeurs).forEach(([cle, valeur]) => {
      const destination = $(`[data-resume="${cle}"]`);
      if (destination) destination.textContent = valeur;
    });
  }

  function ouvrirEtape(index) {
    etapeCourante = index;
    panneauxEtapes.forEach((panneau) => {
      const actif = Number(panneau.dataset.etape) === index;
      panneau.hidden = !actif;
      panneau.classList.remove('is-entering');
      if (actif && index !== 0) requestAnimationFrame(() => panneau.classList.add('is-entering'));
    });
    indicateurs.forEach((indicateur) => {
      const numero = Number(indicateur.dataset.indicateur);
      const actif = numero === Math.min(index, 3);
      indicateur.classList.toggle('etapes__active', actif);
      const bouton = $('.etapes__bouton', indicateur);
      if (bouton) bouton.disabled = numero >= index;
      if (actif) indicateur.setAttribute('aria-current', 'step');
      else indicateur.removeAttribute('aria-current');
    });
    const titre = $(`#titre-etape-${index}`);
    titre?.focus({ preventScroll: true });
  }

  function signalerErreur(id, visible, champ) {
    const erreur = $(`#${id}`);
    if (erreur) erreur.hidden = !visible;
    if (champ) champ.setAttribute('aria-invalid', String(visible));
  }

  function validerEtContinuer() {
    if (etapeCourante === 0) {
      const choix = formulaire.querySelector('input[name="prestation"]:checked');
      signalerErreur('erreur-prestation', !choix);
      if (!choix) { formulaire.querySelector('input[name="prestation"]')?.focus(); return; }
      etat.prestation = choix.value;
      actualiserResume();
    }
    if (etapeCourante === 1) {
      signalerErreur('erreur-jour', !etat.jour);
      if (!etat.jour) { $('.jours__bouton:not(:disabled)', formulaire)?.focus(); return; }
    }
    if (etapeCourante === 2) {
      signalerErreur('erreur-heure', !etat.heure);
      if (!etat.heure) { $('.heure input:not(:disabled)', formulaire)?.focus(); return; }
    }
    ouvrirEtape(etapeCourante + 1);
  }

  if (formulaire) {
    creerJours();
    $$('input[name="prestation"]', formulaire).forEach((radio) => radio.addEventListener('change', () => {
      etat.prestation = radio.value;
      $('#erreur-prestation').hidden = true;
      actualiserResume();
    }));
    $$('.jours__bouton', boutonsJours).forEach((bouton) => {
      bouton.addEventListener('click', () => { $('#erreur-jour').hidden = true; });
    });
    $$('[data-suite]', formulaire).forEach((bouton) => bouton.addEventListener('click', validerEtContinuer));
    $$('[data-retour]', formulaire).forEach((bouton) => bouton.addEventListener('click', () => ouvrirEtape(Math.max(0, etapeCourante - 1))));
    $$('[data-retour-etape]').forEach((bouton) => bouton.addEventListener('click', () => {
      const destination = Number(bouton.dataset.retourEtape);
      if (destination < etapeCourante) ouvrirEtape(destination);
    }));

    $$('[data-choix]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const cle = lien.dataset.choix;
        const radio = formulaire.querySelector(`input[name="prestation"][value="${cle}"]`);
        if (radio) {
          radio.checked = true;
          etat.prestation = cle;
          actualiserResume();
          ouvrirEtape(1);
        }
      });
    });

    const champPrenom = $('#prenom');
    const champTelephone = $('#telephone');
    champPrenom.addEventListener('input', () => {
      signalerErreur('erreur-prenom', false, champPrenom);
      signalerErreur('erreur-coordonnees', false);
      etat.prenom = champPrenom.value.trim();
      actualiserResume();
    });
    champTelephone.addEventListener('input', () => {
      signalerErreur('erreur-telephone', false, champTelephone);
      signalerErreur('erreur-coordonnees', false);
    });
    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      const prenomValide = champPrenom.value.trim().length > 0;
      const mobile = champTelephone.value.trim().replace(/[\s().\/-]/g, '');
      const telephoneValide = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/.test(mobile);
      signalerErreur('erreur-prenom', !prenomValide, champPrenom);
      signalerErreur('erreur-telephone', !telephoneValide, champTelephone);
      signalerErreur('erreur-coordonnees', !prenomValide || !telephoneValide);
      if (!prenomValide) { champPrenom.focus(); return; }
      if (!telephoneValide) { champTelephone.focus(); return; }
      etat.prenom = champPrenom.value.trim();
      actualiserResume();
      ouvrirEtape(4);
    });
    $('[data-recommencer]', formulaire).addEventListener('click', () => {
      formulaire.reset();
      etat.prestation = '';
      etat.jour = null;
      etat.heure = '';
      etat.prenom = '';
      $$('.jours__bouton', boutonsJours).forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
      choixHeures.replaceChildren();
      ['erreur-prestation', 'erreur-jour', 'erreur-heure', 'erreur-prenom', 'erreur-telephone', 'erreur-coordonnees'].forEach((id) => signalerErreur(id, false));
      [champPrenom, champTelephone].forEach((champ) => champ.removeAttribute('aria-invalid'));
      actualiserResume();
      ouvrirEtape(0);
    });
    actualiserResume();
  }

  /* Les prestations apparaissent une fois, chacune à son propre rythme. */
  const elementsReveles = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    elementsReveles.forEach((element) => observateur.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-visible'));
  }

  /* La barre fixe reste hors du chemin pendant le formulaire et le pied de page. */
  const barreMobile = $('[data-barre-mobile]');
  if (barreMobile && 'IntersectionObserver' in window) {
    const visible = { heros: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      const montrer = !visible.heros && !visible.reservation && !visible.pied;
      barreMobile.classList.toggle('is-visible', montrer);
      barreMobile.inert = !montrer;
      barreMobile.setAttribute('aria-hidden', String(!montrer));
    };
    [[panneauHero, 'heros'], [$('#rendez-vous'), 'reservation'], [$('#pied'), 'pied']].forEach(([element, cle]) => {
      if (!element) return;
      const observateur = new IntersectionObserver(([entree]) => {
        visible[cle] = entree.isIntersecting;
        actualiserBarre();
      }, { threshold: 0 });
      observateur.observe(element);
    });
    actualiserBarre();
  } else if (barreMobile) {
    barreMobile.inert = true;
    barreMobile.setAttribute('aria-hidden', 'true');
  }

  /* Garde le parcours reconfigurable après une rotation ou un changement de taille. */
  window.addEventListener('resize', () => {
    if (boutonNavigation && window.matchMedia('(min-width: 52rem)').matches && boutonNavigation.getAttribute('aria-expanded') === 'true') {
      boutonNavigation.setAttribute('aria-expanded', 'false');
      boutonNavigation.setAttribute('aria-label', 'Ouvrir la navigation');
      $('.navigation__texte', boutonNavigation).textContent = 'Rubriques';
      navigationMobile.hidden = true;
    }
  }, { passive: true });
})();
