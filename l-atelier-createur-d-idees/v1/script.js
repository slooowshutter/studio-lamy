/* L’Atelier — simulation locale, sans requête ni stockage. */
(() => {
  'use strict';

  const racine = document.documentElement;
  const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  let clavier = false;
  document.addEventListener('keydown', () => { clavier = true; racine.classList.add('clavier'); });
  document.addEventListener('pointerdown', () => { clavier = false; racine.classList.remove('clavier'); }, { passive: true });

  // Horaire en minutes, index 0 = dimanche. Recherche fournie, relevée le 03/11/2026.
  const horaires = { 0: null, 1: [570, 1140], 2: [570, 1140], 3: null, 4: [570, 1140], 5: [570, 1140], 6: [510, 1020] };
  const prestations = [
    { id: 'femme', nom: 'Coupe femme' },
    { id: 'homme', nom: 'Coupe homme' },
    { id: 'enfant', nom: 'Coupe enfant' },
    { id: 'coloration', nom: 'Coloration' },
    { id: 'balayage', nom: 'Balayage' }
  ];
  const formatParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const formatDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const espace = '\u00a0';
  const heureFr = minutes => `${Math.floor(minutes / 60)}${espace}h${minutes % 60 ? espace + String(minutes % 60).padStart(2, '0') : ''}`;
  const dateDepuisCle = cle => new Date(`${cle}T12:00:00Z`);
  function maintenant() {
    const parties = Object.fromEntries(formatParis.formatToParts(new Date()).map(p => [p.type, p.value]));
    const cle = `${parties.year}-${parties.month}-${parties.day}`;
    return { cle, minutes: +parties.hour * 60 + +parties.minute, date: dateDepuisCle(cle) };
  }
  function choixHeures(date) {
    const plage = horaires[date.getUTCDay()];
    if (!plage) return [];
    const resultat = [];
    // Pas de durée de prestation implicite : simples préférences toutes les demi-heures.
    for (let minute = plage[0]; minute < plage[1]; minute += 30) resultat.push(minute);
    return resultat;
  }
  function heureFuture(cle, minute) {
    const actuel = maintenant();
    return cle > actuel.cle || (cle === actuel.cle && minute > actuel.minutes);
  }
  function jourPossible(cle) {
    return choixHeures(dateDepuisCle(cle)).some(minute => heureFuture(cle, minute));
  }
  function actualiserSemaine() {
    const jour = maintenant().date.getUTCDay();
    $$('[data-jour]').forEach(ligne => ligne.classList.toggle('aujourdhui', +ligne.dataset.jour === jour));
  }
  actualiserSemaine();

  const etat = { prestation: '', jour: '', heure: null, etape: 0 };
  const module = $('#module');
  const formulaire = $('#formulaire');
  const panneaux = $$('[data-panneau]');
  const boutonsEtapes = $$('[data-etape]');
  let minuterie = null;
  let generation = 0;

  function annoncer(texte) { $('#annonce').textContent = texte; }
  function actualiserResume() {
    $('#resume-prestation').textContent = prestations.find(p => p.id === etat.prestation)?.nom || 'À choisir';
    $('#resume-jour').textContent = etat.jour ? formatDate.format(dateDepuisCle(etat.jour)) : 'À choisir';
    $('#resume-heure').textContent = etat.heure === null ? 'À choisir' : heureFr(etat.heure);
    boutonsEtapes.forEach((bouton, i) => {
      bouton.disabled = etat.etape === 4 || (i > 0 && !etat.prestation) || (i > 1 && !etat.jour) || (i > 2 && etat.heure === null);
      if (i === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function effacerErreurs() {
    $$('.erreur').forEach(element => { element.textContent = ''; });
    $$('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
  }
  function afficherEtape(numero, prendreFocus = true) {
    clearTimeout(minuterie);
    const tour = ++generation;
    const animer = !reduction.matches && !clavier && prendreFocus;
    const precedent = panneaux.find(p => !p.hidden);
    const suivant = panneaux[numero];
    etat.etape = numero;
    effacerErreurs();
    actualiserResume();
    function montrer() {
      if (tour !== generation) return;
      panneaux.forEach(panneau => { panneau.hidden = true; panneau.classList.remove('sortie', 'arrivee'); });
      suivant.hidden = false;
      if (animer) suivant.classList.add('arrivee');
      requestAnimationFrame(() => {
        if (tour !== generation) return;
        requestAnimationFrame(() => {
          if (tour !== generation) return;
          suivant.classList.remove('arrivee');
          if (prendreFocus) {
            const titre = $('h3', suivant);
            titre.focus({ preventScroll: true });
            titre.scrollIntoView({ block: 'nearest', behavior: 'instant' });
          }
        });
      });
      annoncer(numero === 4 ? 'Simulation terminée. Aucun rendez-vous n’a été pris.' : `Étape ${numero + 1} sur 4 : ${$('h3', suivant).textContent}`);
    }
    if (animer && precedent && precedent !== suivant) {
      precedent.classList.add('sortie');
      minuterie = setTimeout(montrer, 110);
    } else montrer();
  }

  function creerRadio(nom, valeur, libelle, classe, desactive = false) {
    const label = document.createElement('label');
    label.className = `choix ${classe}`;
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = nom; radio.value = valeur; radio.disabled = desactive;
    const texte = document.createElement('span');
    texte.className = classe === 'heure' ? 'libelle-heure' : 'libelle-choix';
    texte.textContent = libelle;
    label.append(radio, texte);
    return { label, radio, texte };
  }

  prestations.forEach(prestation => {
    const { label, radio } = creerRadio('prestation', prestation.id, prestation.nom, 'prestation');
    radio.setAttribute('aria-describedby', 'erreur-prestation');
    radio.addEventListener('change', () => {
      etat.prestation = prestation.id;
      $('#erreur-prestation').textContent = '';
      actualiserResume();
    });
    $('#choix-prestations').append(label);
  });

  function construireJours() {
    const actuel = maintenant();
    const fragment = document.createDocumentFragment();
    for (let decalage = 0; decalage < 14; decalage++) {
      const date = new Date(actuel.date.getTime() + decalage * 86400000);
      const cle = date.toISOString().slice(0, 10);
      const ferme = !horaires[date.getUTCDay()];
      const termine = !ferme && !jourPossible(cle);
      const { label, radio, texte } = creerRadio('jour', cle, '', 'jour', ferme || termine);
      radio.setAttribute('aria-describedby', 'erreur-jour');
      radio.checked = etat.jour === cle;
      texte.className = 'jour-texte';
      const semaine = document.createElement('span');
      semaine.textContent = formatJour.format(date);
      const numero = document.createElement('strong'); numero.textContent = date.getUTCDate();
      const mois = document.createElement('small'); mois.textContent = formatMois.format(date);
      texte.append(semaine, numero, mois);
      if (ferme || termine) { const mention = document.createElement('small'); mention.textContent = ferme ? 'Fermé' : 'Terminé'; texte.append(mention); }
      radio.addEventListener('change', () => {
        etat.jour = cle; etat.heure = null;
        $('#erreur-jour').textContent = '';
        construireHeures(); actualiserResume();
      });
      fragment.append(label);
    }
    $('#choix-jours').replaceChildren(fragment);
  }

  function construireHeures() {
    const fragment = document.createDocumentFragment();
    if (!etat.jour) return;
    const date = dateDepuisCle(etat.jour);
    $('#jour-selectionne').textContent = formatDate.format(date);
    choixHeures(date).forEach(minute => {
      const passee = !heureFuture(etat.jour, minute);
      const { label, radio } = creerRadio('heure', String(minute), heureFr(minute), 'heure', passee);
      radio.setAttribute('aria-describedby', 'erreur-heure');
      radio.checked = minute === etat.heure;
      if (passee) { const mention = document.createElement('small'); mention.textContent = 'Passée'; label.append(mention); }
      radio.addEventListener('change', () => { etat.heure = minute; $('#erreur-heure').textContent = ''; actualiserResume(); });
      fragment.append(label);
    });
    $('#choix-heures').replaceChildren(fragment);
  }

  function signaler(id, message, champ) {
    $(id).textContent = message;
    if (champ) { champ.setAttribute('aria-invalid', 'true'); champ.focus(); }
    annoncer(message);
    return false;
  }
  function validerSelection(numero) {
    if (numero >= 1 && !etat.prestation) return signaler('#erreur-prestation', 'Choisissez une prestation pour poursuivre.', $('input[name="prestation"]'));
    if (numero >= 2 && (!etat.jour || !jourPossible(etat.jour))) {
      etat.jour = ''; etat.heure = null;
      construireJours(); actualiserResume();
      if (etat.etape > 1) afficherEtape(1);
      return signaler('#erreur-jour', 'Choisissez un jour proposé pour poursuivre.', $('input[name="jour"]:not(:disabled)'));
    }
    if (numero >= 3 && (etat.heure === null || !heureFuture(etat.jour, etat.heure))) {
      etat.heure = null; construireHeures(); actualiserResume();
      if (etat.etape > 2) afficherEtape(2);
      return signaler('#erreur-heure', 'Choisissez une heure future pour cet essai.', $('input[name="heure"]:not(:disabled)'));
    }
    return true;
  }

  $$('[data-suivant]').forEach(bouton => bouton.addEventListener('click', () => {
    const numero = +bouton.dataset.suivant;
    if (!validerSelection(numero)) return;
    if (numero === 1) construireJours();
    if (numero === 2) construireHeures();
    afficherEtape(numero);
  }));
  $$('[data-retour]').forEach(bouton => bouton.addEventListener('click', () => afficherEtape(+bouton.dataset.retour)));
  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => {
    const numero = +bouton.dataset.etape;
    if (numero > etat.etape && !validerSelection(numero)) return;
    if (numero === 1) construireJours();
    if (numero === 2) construireHeures();
    afficherEtape(numero);
  }));

  $$('[data-prestation]').forEach(lien => lien.addEventListener('click', evenement => {
    evenement.preventDefault();
    etat.prestation = lien.dataset.prestation; etat.jour = ''; etat.heure = null;
    $$('input[name="prestation"]').forEach(radio => { radio.checked = radio.value === etat.prestation; });
    construireJours();
    afficherEtape(1, false);
    $('#rendez-vous').scrollIntoView({ behavior: reduction.matches || clavier ? 'instant' : 'smooth', block: 'start' });
    $('h3', panneaux[1]).focus({ preventScroll: true });
  }));

  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => { $(`#erreur-${id}`).textContent = ''; $(`#${id}`).removeAttribute('aria-invalid'); });
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3 || !validerSelection(3)) return;
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    const numero = telephone.value.replace(/[\s.()-]/g, '');
    effacerErreurs();
    let premier = null;
    if (!prenom.value.trim()) { $('#erreur-prenom').textContent = 'Indiquez un prénom pour cet essai.'; prenom.setAttribute('aria-invalid', 'true'); premier = prenom; }
    if (!/^(?:0|\+33|0033)[1-9]\d{8}$/.test(numero)) { $('#erreur-telephone').textContent = 'Indiquez un numéro français de dix chiffres, ou commençant par +33.'; telephone.setAttribute('aria-invalid', 'true'); premier ||= telephone; }
    if (premier) { premier.focus(); annoncer('Vérifiez les coordonnées signalées.'); return; }
    const nom = prestations.find(p => p.id === etat.prestation).nom;
    $('#recap-final').textContent = `${prenom.value.trim()}, votre essai : ${nom.toLocaleLowerCase('fr-FR')}, ${formatDate.format(dateDepuisCle(etat.jour))}, à ${heureFr(etat.heure)}.`;
    afficherEtape(4);
    // Les coordonnées ne sont pas nécessaires au récapitulatif conservé à droite.
    telephone.value = ''; prenom.value = '';
  });
  $('#recommencer').addEventListener('click', () => {
    formulaire.reset();
    Object.assign(etat, { prestation: '', jour: '', heure: null, etape: 0 });
    $('#recap-final').textContent = '';
    $('#choix-heures').replaceChildren();
    construireJours(); afficherEtape(0);
  });

  construireJours(); actualiserResume();
  module.hidden = false;

  // Le contenu reste visible si JavaScript ou l’observateur ne sont pas disponibles.
  if ('IntersectionObserver' in window && !reduction.matches) {
    const elements = $$('[data-revelation]');
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    let ligne = 0;
    elements.forEach(element => {
      if (element.dataset.revelation === 'ligne') element.style.transitionDelay = `${ligne++ * 60}ms`;
      observateur.observe(element);
    });
    racine.classList.add('mouvement');
    requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret')));
    reduction.addEventListener('change', evenement => {
      if (evenement.matches) { racine.classList.remove('mouvement'); observateur.disconnect(); }
    });
  }
})();
