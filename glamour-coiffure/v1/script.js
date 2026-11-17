/* Démonstration locale. Aucun envoi, stockage ou suivi. */
(() => {
  'use strict';
  const NB = '\u00a0';
  const HORAIRES = { 0: null, 1: [540, 1110], 2: [540, 1110], 3: [540, 1110], 4: [540, 1110], 5: [540, 1110], 6: [540, 990] };
  // Plages Planity : voir SOURCES.md. Aucune durée de prestation supposée.
  const PROJETS = { lissage: 'Lissage', balayage: 'Balayage' };
  const formatParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const formatCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

  function maintenantParis(instant = new Date()) {
    const p = {};
    formatParis.formatToParts(instant).forEach(partie => { if (partie.type !== 'literal') p[partie.type] = Number(partie.value); });
    return { cle: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, date: new Date(Date.UTC(p.year, p.month - 1, p.day, 12)), minutes: p.hour * 60 + p.minute };
  }
  function cleDate(date) { return date.toISOString().slice(0, 10); }
  function heureFr(minutes) {
    const m = minutes % 60;
    return `${Math.floor(minutes / 60)}${NB}h${m ? NB + String(m).padStart(2, '0') : ''}`;
  }
  function heuresDuJour(date, instant = new Date()) {
    const plage = HORAIRES[date.getUTCDay()];
    if (!plage) return [];
    const present = maintenantParis(instant);
    const cle = cleDate(date);
    const heures = [];
    // Un repère chaque heure, strictement avant la fermeture ; ce n’est pas une durée.
    for (let minute = plage[0]; minute < plage[1]; minute += 60) {
      heures.push({ minute, passe: cle < present.cle || (cle === present.cle && minute <= present.minutes) });
    }
    return heures;
  }
  function joursSuivants(instant = new Date()) {
    const present = maintenantParis(instant);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(present.date.getTime() + index * 86400000);
      const heures = heuresDuJour(date, instant);
      return { date, cle: cleDate(date), ferme: !HORAIRES[date.getUTCDay()], ecoule: heures.length > 0 && heures.every(h => h.passe), samedi: date.getUTCDay() === 6 };
    });
  }
  function telephoneValide(texte) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(texte.replace(/[\s.()\-]/g, '')); }
  function prenomValide(texte) { return texte.trim().length > 0 && texte.trim().length <= 60; }

  // Les fonctions pures sont vérifiables avec Node, sans simuler une disponibilité réelle.
  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = { HORAIRES, PROJETS, maintenantParis, heureFr, heuresDuJour, joursSuivants, telephoneValide, prenomValide };
    return;
  }
  window.glamourPret = true;
  const racine = document.documentElement;
  const $ = selecteur => document.querySelector(selecteur);
  const $$ = selecteur => Array.from(document.querySelectorAll(selecteur));
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clavier = false;
  document.addEventListener('keydown', evenement => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evenement.key)) {
      clavier = true;
      racine.classList.add('using-keyboard');
      $$('.reveal.attente').forEach(bloc => bloc.classList.remove('attente'));
    }
  });
  document.addEventListener('pointerdown', () => { clavier = false; racine.classList.remove('using-keyboard'); }, { passive: true });

  /* Les éléments ne sont masqués que lorsque leur observateur est prêt. */
  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.isIntersecting) {
          entree.target.classList.remove('attente');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    $$('.reveal').forEach(bloc => { bloc.classList.add('attente'); observateur.observe(bloc); });
  }

  const formulaire = $('#formulaire');
  const panneaux = $$('[data-panneau]');
  const boutonsEtapes = $$('[data-etape]');
  const resultat = $('#resultat');
  const etat = { etape: 0, atteinte: 0, projet: '', jour: null, heure: null, termine: false };
  const titres = ['Votre projet', 'Le jour souhaité', 'L’heure souhaitée', 'Les coordonnées d’essai'];
  const suites = ['Choisir le jour', 'Choisir l’heure', 'Continuer l’essai', 'Terminer la simulation'];
  let transitionNumero = 0;

  function annoncer(message) { $('#annonce').textContent = message; }
  function erreur(id, message) { $('#' + id).textContent = message; }
  function miseAJourResume() {
    $('#resume-projet').textContent = PROJETS[etat.projet] || 'À choisir';
    $('#resume-jour').textContent = etat.jour ? formatJour.format(etat.jour) : 'À choisir';
    $('#resume-heure').textContent = etat.heure !== null ? heureFr(etat.heure) : 'À choisir';
    const choix = [PROJETS[etat.projet], etat.jour && formatJour.format(etat.jour), etat.heure !== null && heureFr(etat.heure)].filter(Boolean);
    $('#resume-compact').textContent = choix.length ? 'Votre sélection : ' + choix.join(' · ') : '';
    $('#resume-compact').hidden = etat.etape === 0 || etat.termine || choix.length === 0;
    if (etat.projet && etat.jour && etat.heure !== null) $('#recapitulatif').textContent = recapitulatif();
  }
  function synchroniserEtapes() {
    boutonsEtapes.forEach((bouton, position) => {
      bouton.disabled = position > etat.atteinte;
      if (position === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function recapitulatif() { return `${PROJETS[etat.projet]} · ${formatJour.format(etat.jour)} · ${heureFr(etat.heure)} souhaitée. Démonstration uniquement, à confirmer par téléphone.`; }
  function animerEntree(element) {
    const numero = ++transitionNumero;
    if (mouvementReduit.matches || clavier) { element.classList.remove('is-entering'); return; }
    element.classList.add('is-entering');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (numero === transitionNumero) element.classList.remove('is-entering');
    }));
  }
  function montrerEtape(index, deplacerFocus = true) {
    etat.etape = index;
    etat.termine = false;
    resultat.hidden = true;
    formulaire.hidden = false;
    $('.steps').hidden = false;
    panneaux.forEach((panneau, position) => {
      panneau.hidden = position !== index;
      panneau.classList.remove('is-entering');
    });
    synchroniserEtapes();
    $('#retour').hidden = index === 0;
    $('#continuer').replaceChildren(document.createTextNode(suites[index] + NB));
    const fleche = document.createElement('span');
    fleche.setAttribute('aria-hidden', 'true');
    fleche.textContent = '→';
    $('#continuer').append(fleche);
    if (index === 1) afficherJours();
    if (index === 2) afficherHeures();
    miseAJourResume();
    animerEntree(panneaux[index]);
    if (deplacerFocus) {
      panneaux[index].querySelector('h3').focus({ preventScroll: true });
      // Sur téléphone, le panneau courant reste au-dessus de la barre d’action.
      panneaux[index].scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    annoncer(`Étape ${index + 1} sur 4. ${titres[index]}. Démonstration sans envoi.`);
  }
  function elementTexte(balise, texte) { const element = document.createElement(balise); element.textContent = texte; return element; }
  function afficherJours() {
    const conteneur = $('#jours');
    conteneur.replaceChildren();
    joursSuivants().forEach(jour => {
      const etiquette = document.createElement('label');
      etiquette.className = 'day-choice';
      const champ = document.createElement('input');
      champ.type = 'radio'; champ.name = 'jour'; champ.value = jour.cle;
      champ.checked = Boolean(etat.jour && cleDate(etat.jour) === jour.cle);
      champ.disabled = jour.ferme || jour.ecoule;
      const etatJour = jour.ferme ? 'fermé' : jour.ecoule ? 'écoulé' : jour.samedi ? 'à confirmer' : '';
      champ.setAttribute('aria-label', `${formatJour.format(jour.date)}${etatJour ? ', ' + etatJour : ''}`);
      const face = document.createElement('span'); face.className = 'day-face';
      face.setAttribute('aria-hidden', 'true');
      face.append(elementTexte('span', formatCourt.format(jour.date)), elementTexte('strong', String(jour.date.getUTCDate())), elementTexte('span', formatMois.format(jour.date)), elementTexte('small', etatJour));
      etiquette.append(champ, face); conteneur.append(etiquette);
    });
  }
  function afficherHeures() {
    const conteneur = $('#heures');
    conteneur.replaceChildren();
    if (!etat.jour) return;
    $('#jour-choisi').textContent = `${formatJour.format(etat.jour)}${etat.jour.getUTCDay() === 6 ? ' · samedi à confirmer' : ''}`;
    const heures = heuresDuJour(etat.jour);
    heures.forEach(heure => {
      const etiquette = document.createElement('label'); etiquette.className = 'time-choice';
      const champ = document.createElement('input');
      champ.type = 'radio'; champ.name = 'heure'; champ.value = String(heure.minute); champ.checked = etat.heure === heure.minute; champ.disabled = heure.passe;
      champ.setAttribute('aria-label', `${heureFr(heure.minute)}${heure.passe ? ', heure passée' : ', heure souhaitée de démonstration'}`);
      const face = elementTexte('span', heureFr(heure.minute)); face.setAttribute('aria-hidden', 'true');
      etiquette.append(champ, face); conteneur.append(etiquette);
    });
    if (heures.every(heure => heure.passe)) erreur('erreur-heure', 'Ces heures sont passées. Revenez au choix du jour.');
  }
  function jourEncoreValide() {
    return etat.jour && joursSuivants().some(jour => jour.cle === cleDate(etat.jour) && !jour.ferme && !jour.ecoule);
  }
  function heureEncoreValide() { return etat.jour && heuresDuJour(etat.jour).some(heure => heure.minute === etat.heure && !heure.passe); }
  function validerEtape() {
    if (etat.etape === 0 && !etat.projet) {
      erreur('erreur-projet', 'Choisissez le lissage ou le balayage pour continuer.');
      $('[name="projet"]').focus(); return false;
    }
    if (etat.etape === 1 && !jourEncoreValide()) {
      erreur('erreur-jour', 'Choisissez un jour encore disponible pour l’essai.');
      $('[name="jour"]:not(:disabled)')?.focus(); return false;
    }
    if (etat.etape === 2 && !heureEncoreValide()) {
      erreur('erreur-heure', 'Choisissez une heure à venir pour l’essai.');
      $('[name="heure"]:not(:disabled)')?.focus(); return false;
    }
    if (etat.etape === 3) {
      let premierInvalide = null;
      const prenom = $('#prenom'), telephone = $('#telephone');
      const nomBon = prenomValide(prenom.value), telephoneBon = telephoneValide(telephone.value);
      erreur('erreur-prenom', nomBon ? '' : 'Saisissez un prénom pour l’essai.');
      erreur('erreur-telephone', telephoneBon ? '' : 'Utilisez un numéro mobile français de 10 chiffres commençant par 06 ou 07, ou son format +33.');
      prenom.setAttribute('aria-invalid', String(!nomBon)); telephone.setAttribute('aria-invalid', String(!telephoneBon));
      if (!nomBon) premierInvalide = prenom;
      else if (!telephoneBon) premierInvalide = telephone;
      if (premierInvalide) { premierInvalide.focus(); return false; }
      if (!jourEncoreValide() || !heureEncoreValide()) {
        etat.heure = null; etat.atteinte = 2;
        montrerEtape(jourEncoreValide() ? 2 : 1);
        annoncer('L’heure choisie est maintenant passée. Choisissez une nouvelle heure ou un autre jour.');
        return false;
      }
    }
    return true;
  }
  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'projet') { etat.projet = champ.value; erreur('erreur-projet', ''); }
    if (champ.name === 'jour') {
      etat.jour = new Date(champ.value + 'T12:00:00Z'); etat.heure = null; etat.atteinte = Math.min(etat.atteinte, 2);
      synchroniserEtapes();
      erreur('erreur-jour', ''); erreur('erreur-heure', '');
    }
    if (champ.name === 'heure') { etat.heure = Number(champ.value); erreur('erreur-heure', ''); }
    miseAJourResume();
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (!validerEtape()) return;
    if (etat.etape < 3) {
      etat.atteinte = Math.max(etat.atteinte, etat.etape + 1);
      montrerEtape(etat.etape + 1);
    } else {
      etat.termine = true;
      miseAJourResume();
      formulaire.hidden = true;
      $('.steps').hidden = true;
      resultat.hidden = false;
      $('#recapitulatif-final').textContent = recapitulatif();
      animerEntree(resultat);
      $('#titre-resultat').focus({ preventScroll: true });
      resultat.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      annoncer('Essai terminé. Aucun rendez-vous n’est pris et rien n’a été envoyé.');
      // Les coordonnées ne sont pas nécessaires au récapitulatif : effacées immédiatement.
      $('#prenom').value = ''; $('#telephone').value = '';
    }
  });
  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => {
    const destination = Number(bouton.dataset.etape);
    if (destination <= etat.atteinte) montrerEtape(destination);
  }));
  $('#retour').addEventListener('click', () => montrerEtape(Math.max(0, etat.etape - 1)));
  function reinitialiser() {
    formulaire.reset(); etat.etape = 0; etat.atteinte = 0; etat.projet = ''; etat.jour = null; etat.heure = null;
    $$('.field-error').forEach(champ => { champ.textContent = ''; });
    $$('[aria-invalid]').forEach(champ => champ.removeAttribute('aria-invalid'));
  }
  $('#recommencer').addEventListener('click', () => { reinitialiser(); montrerEtape(0); });
  $$('[data-projet]').forEach(lien => lien.addEventListener('click', () => {
    if (etat.termine) reinitialiser();
    etat.projet = lien.dataset.projet;
    $(`[name="projet"][value="${etat.projet}"]`).checked = true;
    erreur('erreur-projet', '');
    // L’ancre effectue le défilement ; seul le titre reçoit le focus.
    montrerEtape(0, false);
    panneaux[0].querySelector('h3').focus({ preventScroll: true });
  }));
  ['prenom', 'telephone'].forEach(nom => $('#' + nom).addEventListener('input', () => {
    if ($('#' + nom).getAttribute('aria-invalid') === 'true') {
      const valide = nom === 'prenom' ? prenomValide($('#' + nom).value) : telephoneValide($('#' + nom).value);
      if (valide) { erreur('erreur-' + nom, ''); $('#' + nom).removeAttribute('aria-invalid'); }
    }
  }));
  // L’interface n’apparaît qu’après le raccordement de tous ses contrôles.
  $('#parcours').hidden = false;
  montrerEtape(0, false);
})();
