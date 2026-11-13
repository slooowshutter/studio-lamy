/* Les horaires et durées proviennent du relevé Planity. Aucun envoi réseau. */
const CMMCSimulation = (() => {
  'use strict';
  const coupes = Object.freeze({
    courts: { nom: 'Cheveux courts', minutes: 40 },
    'mi-longs': { nom: 'Cheveux mi-longs', minutes: 40 },
    longs: { nom: 'Cheveux longs', minutes: 45 }
  });
  // Dimanche fermé ; lundi exclu car les sources divergent.
  const horaires = Object.freeze({ 2: [570, 1140], 3: [570, 1140], 4: [570, 1140], 5: [570, 1140], 6: [540, 960] });
  const fmtParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const fmtLong = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const fmtMois = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const fmtResume = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const cle = date => date.toISOString().slice(0, 10);
  function paris(instant = new Date()) {
    const morceaux = Object.fromEntries(fmtParis.formatToParts(instant).map(p => [p.type, p.value]));
    const date = new Date(Date.UTC(+morceaux.year, +morceaux.month - 1, +morceaux.day, 12));
    return { date, cle: cle(date), minute: +morceaux.hour * 60 + +morceaux.minute };
  }
  function duree(coupe, soin) { return (coupes[coupe]?.minutes || 0) + (soin ? 30 : 0); }
  function creneaux(date, minutes, instant = new Date()) {
    const plage = horaires[date.getUTCDay()];
    if (!plage || minutes <= 0) return [];
    const maintenant = paris(instant);
    const dateCle = cle(date);
    const resultat = [];
    for (let heure = plage[0]; heure + minutes <= plage[1]; heure += 30) {
      const passe = dateCle < maintenant.cle || (dateCle === maintenant.cle && heure <= maintenant.minute);
      const pris = (date.getUTCDate() + Math.floor(heure / 30)) % 5 === 1;
      resultat.push({ heure, desactive: passe || pris, note: passe ? 'Passé' : pris ? 'Pris' : '' });
    }
    return resultat;
  }
  function jours(minutes, instant = new Date()) {
    const maintenant = paris(instant);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(maintenant.date.getTime() + i * 86400000);
      const semaine = date.getUTCDay();
      const note = semaine === 0 ? 'Fermé' : semaine === 1 ? 'À confirmer' : !creneaux(date, minutes, instant).some(h => !h.desactive) ? 'Passé' : '';
      return { date, cle: cle(date), note, desactive: Boolean(note) };
    });
  }
  function heureFr(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function telephoneValide(texte) { return /^(?:0[67]|\+33[67])\d{8}$/.test(texte.replace(/[\s.()\-]/g, '')); }
  return { coupes, horaires, paris, duree, creneaux, jours, heureFr, telephoneValide, cle, fmtLong, fmtCourt, fmtMois, fmtResume };
})();

if (typeof document !== 'undefined') (() => {
  'use strict';
  const $ = (s, contexte = document) => contexte.querySelector(s);
  const $$ = (s, contexte = document) => Array.from(contexte.querySelectorAll(s));
  const racine = document.documentElement;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const logique = CMMCSimulation;
  let clavier = false;
  document.addEventListener('keydown', evenement => {
    if (!evenement.metaKey && !evenement.ctrlKey && !evenement.altKey) {
      clavier = true;
      racine.classList.add('au-clavier');
    }
  });
  document.addEventListener('pointerdown', () => { clavier = false; racine.classList.remove('au-clavier'); }, { passive: true });

  /* Accordéon principal : une seule région ouverte, focus exclus du volet replié. */
  const panneaux = $$('.panneau');
  const declencheurs = $$('.declencheur');
  function ouvrir(panneau) {
    panneaux.forEach(p => {
      const ouvert = p === panneau;
      p.classList.toggle('est-ouvert', ouvert);
      $('.declencheur', p).setAttribute('aria-expanded', String(ouvert));
      $('.panneau-corps', p).inert = !ouvert;
    });
  }
  declencheurs.forEach((bouton, index) => {
    bouton.addEventListener('click', () => { ouvrir(bouton.closest('.panneau')); });
    bouton.addEventListener('keydown', evenement => {
      let destination;
      if (evenement.key === 'ArrowDown') destination = (index + 1) % declencheurs.length;
      if (evenement.key === 'ArrowUp') destination = (index - 1 + declencheurs.length) % declencheurs.length;
      if (evenement.key === 'Home') destination = 0;
      if (evenement.key === 'End') destination = declencheurs.length - 1;
      if (destination !== undefined) { evenement.preventDefault(); declencheurs[destination].focus(); }
    });
  });
  function cibleDuFragment(fragment) {
    try { return document.getElementById(decodeURIComponent(fragment.slice(1))); } catch { return null; }
  }
  function ouvrirFragment() {
    const cible = cibleDuFragment(location.hash);
    ouvrir(cible?.closest('.panneau') || panneaux[0]);
  }
  ouvrirFragment();
  window.addEventListener('hashchange', ouvrirFragment);

  /* La figure sert les quatre gestes publiés, sans représentation de résultat. */
  const nomsTemps = ['Le bain', 'Le soin modelant', 'Le masque', 'Le sérum'];
  const boutonsTemps = $$('[data-etape-soin]');
  boutonsTemps.forEach(bouton => bouton.addEventListener('click', () => {
    const index = Number(bouton.dataset.etapeSoin);
    boutonsTemps.forEach(b => {
      const actif = b === bouton;
      b.classList.toggle('est-actif', actif);
      b.setAttribute('aria-pressed', String(actif));
    });
    $('.meche').dataset.temps = String(index);
    $('[data-legende-soin]').textContent = `0${index + 1} / 04 · ${nomsTemps[index]}`;
    $('.progression-soin i').style.transform = `translateX(${index * 100}%)`;
  }));

  /* Simulation : tous les calculs et toutes les données restent dans la page. */
  const etat = { coupe: '', soin: true, jour: '', heure: null, etape: 0, atteinte: 0, termine: false };
  const vues = $$('[data-vue]');
  const navEtapes = $$('[data-aller-etape]');
  const formulaire = $('#formulaire-reservation');
  const resultat = $('#confirmation');
  const erreurs = ['#erreur-prestation', '#erreur-jour', '#erreur-heure', '#erreur-coordonnees'];
  let revisionTransition = 0;
  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }
  function dateChoisie() { return etat.jour ? new Date(`${etat.jour}T12:00:00Z`) : null; }
  function minutesChoisies() { return logique.duree(etat.coupe, etat.soin); }
  function annoncer(texte) { $('#annonce-reservation').textContent = texte; }
  function recapitulatif() {
    $('#recap-coupe').textContent = logique.coupes[etat.coupe]?.nom || 'À choisir';
    $('#recap-soin').textContent = etat.soin ? 'ALPHA SLEEK · en complément' : 'Sans ajout du soin';
    $('#recap-jour').textContent = etat.jour ? logique.fmtLong.format(dateChoisie()) : 'À choisir';
    $('#recap-heure').textContent = etat.heure === null ? 'À choisir' : logique.heureFr(etat.heure);
    navEtapes.forEach((bouton, i) => {
      bouton.disabled = etat.termine || i > etat.atteinte;
      if (!etat.termine && i === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    $('.selection-motif').classList.toggle('avec-soin', etat.soin);
    const bref = [];
    if (etat.coupe) {
      bref.push(logique.coupes[etat.coupe].nom + (etat.soin ? ' + ALPHA SLEEK' : ', sans soin'));
      if (etat.jour) bref.push(logique.fmtResume.format(dateChoisie()));
      if (etat.heure !== null) bref.push(logique.heureFr(etat.heure));
    }
    $('#recap-mobile-texte').textContent = bref.length ? bref.join(' · ') : 'Choisissez une coupe pour commencer.';
  }
  function nouvellePrestation() {
    etat.jour = '';
    etat.heure = null;
    etat.atteinte = 0;
    erreurs.forEach(id => $(id).textContent = '');
    recapitulatif();
  }
  function afficherJours() {
    const conteneur = $('#choix-jours');
    conteneur.replaceChildren();
    const dates = logique.jours(minutesChoisies());
    if (!dates.some(j => j.cle === etat.jour && !j.desactive)) {
      etat.jour = ''; etat.heure = null;
      etat.atteinte = Math.min(etat.atteinte, 1);
    }
    dates.forEach(jour => {
      const label = element('label', 'choix-jour');
      const radio = element('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = jour.cle;
      radio.disabled = jour.desactive; radio.checked = etat.jour === jour.cle;
      radio.setAttribute('aria-label', `${logique.fmtLong.format(jour.date)}${jour.note ? `, ${jour.note}` : ', pour la simulation'}`);
      const corps = element('span');
      corps.append(element('span', '', logique.fmtCourt.format(jour.date)), element('b', '', String(jour.date.getUTCDate())), element('small', '', logique.fmtMois.format(jour.date)));
      if (jour.note) corps.append(element('small', '', jour.note));
      radio.addEventListener('change', () => {
        etat.jour = jour.cle; etat.heure = null;
        etat.atteinte = Math.min(etat.atteinte, 1);
        $('#erreur-jour').textContent = '';
        afficherHeures(); recapitulatif();
        annoncer(`Jour choisi pour la simulation : ${logique.fmtLong.format(jour.date)}.`);
      });
      label.append(radio, corps); conteneur.append(label);
    });
    recapitulatif();
  }
  function afficherHeures() {
    const conteneur = $('#choix-heures');
    conteneur.replaceChildren();
    if (!etat.jour) return;
    const date = dateChoisie();
    $('#jour-selectionne').textContent = logique.fmtLong.format(date);
    const heures = logique.creneaux(date, minutesChoisies());
    if (!heures.some(h => h.heure === etat.heure && !h.desactive)) {
      etat.heure = null;
      etat.atteinte = Math.min(etat.atteinte, 2);
    }
    heures.forEach(heure => {
      const label = element('label', 'choix-heure');
      const radio = element('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = String(heure.heure);
      radio.disabled = heure.desactive; radio.checked = etat.heure === heure.heure;
      radio.setAttribute('aria-label', `${logique.heureFr(heure.heure)}, ${heure.note === 'Pris' ? 'indisponible pour cet exemple' : heure.note || 'créneau fictif'}`);
      const corps = element('span');
      corps.append(element('b', '', logique.heureFr(heure.heure)));
      if (heure.note) corps.append(element('small', '', heure.note));
      radio.addEventListener('change', () => {
        etat.heure = heure.heure; $('#erreur-heure').textContent = '';
        recapitulatif(); annoncer(`Heure fictive choisie : ${logique.heureFr(heure.heure)}.`);
      });
      label.append(radio, corps); conteneur.append(label);
    });
    if (!heures.some(h => !h.desactive)) conteneur.append(element('p', 'petit', 'Plus de créneau pour cet essai ce jour-là. Revenez au choix du jour.'));
    recapitulatif();
  }
  function transitionEntree(vue) {
    const revision = ++revisionTransition;
    vues.forEach(v => v.classList.remove('prepare'));
    resultat.classList.remove('prepare');
    if (reduit.matches || clavier) return;
    vue.classList.add('prepare');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (revision === revisionTransition) vue.classList.remove('prepare');
    }));
  }
  function afficherEtape(numero, avecFocus = true) {
    if (etat.termine) return;
    if (numero > 0 && !logique.coupes[etat.coupe]) numero = 0;
    if (numero > 1 && !logique.jours(minutesChoisies()).some(j => j.cle === etat.jour && !j.desactive)) {
      etat.jour = ''; etat.heure = null;
      etat.atteinte = 1; numero = 1;
    }
    if (numero > 2 && !logique.creneaux(dateChoisie(), minutesChoisies()).some(h => h.heure === etat.heure && !h.desactive)) {
      etat.heure = null; etat.atteinte = 2; numero = 2;
    }
    etat.etape = numero;
    etat.atteinte = Math.max(etat.atteinte, numero);
    if (numero === 1) afficherJours();
    if (numero === 2) afficherHeures();
    vues.forEach((v, i) => v.hidden = i !== numero);
    formulaire.hidden = false; resultat.hidden = true;
    transitionEntree(vues[numero]); recapitulatif();
    const titre = $('h3', vues[numero]);
    annoncer(`Étape ${numero + 1} sur 4. ${titre.textContent}`);
    if (avecFocus) {
      titre.focus({ preventScroll: true });
      titre.scrollIntoView({ behavior: 'instant', block: 'nearest' });
    }
  }
  function verifierEtape(numero) {
    let message = '';
    if (numero === 0 && !logique.coupes[etat.coupe]) message = 'Choisissez la longueur de vos cheveux pour continuer.';
    if (numero === 1 && !logique.jours(minutesChoisies()).some(j => j.cle === etat.jour && !j.desactive)) message = 'Choisissez un jour disponible pour cet essai.';
    if (numero === 2 && (!etat.jour || !logique.creneaux(dateChoisie(), minutesChoisies()).some(h => h.heure === etat.heure && !h.desactive))) message = 'Choisissez une heure fictive pour continuer.';
    $(erreurs[numero]).textContent = message;
    if (message) {
      const premier = $('input:not(:disabled)', vues[numero]);
      premier?.focus(); annoncer(message);
    }
    return !message;
  }
  $$('input[name="coupe"]').forEach(radio => radio.addEventListener('change', () => {
    etat.coupe = radio.value; nouvellePrestation();
    annoncer(`${logique.coupes[etat.coupe].nom}, sélection pour la simulation.`);
  }));
  $('#ajout-soin').addEventListener('change', evenement => { etat.soin = evenement.target.checked; nouvellePrestation(); });
  $$('[data-suivant]').forEach(b => b.addEventListener('click', () => {
    const numero = Number(b.dataset.suivant);
    if (verifierEtape(numero)) afficherEtape(numero + 1);
  }));
  $$('[data-retour]').forEach(b => b.addEventListener('click', () => afficherEtape(Number(b.dataset.retour))));
  navEtapes.forEach(b => b.addEventListener('click', () => afficherEtape(Number(b.dataset.allerEtape))));

  const champs = { prenom: $('#prenom'), telephone: $('#telephone') };
  function verifierChamp(nom) {
    const champ = champs[nom];
    const correct = nom === 'prenom' ? champ.value.trim().length > 0 : logique.telephoneValide(champ.value);
    $(`#erreur-${nom}`).textContent = correct ? '' : nom === 'prenom' ? 'Saisissez un prénom pour cet essai.' : 'Utilisez un numéro mobile français commençant par 06, 07, +33 6 ou +33 7.';
    champ.setAttribute('aria-invalid', String(!correct));
    return correct;
  }
  Object.entries(champs).forEach(([nom, champ]) => {
    champ.addEventListener('blur', () => { if (champ.value || champ.hasAttribute('aria-invalid')) verifierChamp(nom); });
    champ.addEventListener('input', () => {
      if (champ.getAttribute('aria-invalid') === 'true') { champ.removeAttribute('aria-invalid'); $(`#erreur-${nom}`).textContent = ''; }
    });
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3) { if (verifierEtape(etat.etape)) afficherEtape(etat.etape + 1); return; }
    const prenomCorrect = verifierChamp('prenom');
    const telephoneCorrect = verifierChamp('telephone');
    if (!prenomCorrect || !telephoneCorrect) {
      $('#erreur-coordonnees').textContent = 'La simulation attend les deux champs indiqués ci-dessus.';
      (prenomCorrect ? champs.telephone : champs.prenom).focus();
      annoncer('Complétez les champs signalés pour terminer la simulation.'); return;
    }
    const choixEncoreValide = etat.jour && logique.creneaux(dateChoisie(), minutesChoisies()).some(h => h.heure === etat.heure && !h.desactive);
    if (!choixEncoreValide) {
      etat.heure = null; afficherEtape(2);
      const message = etat.etape === 1 ? 'Ce jour ne propose plus de créneau pour cet essai. Choisissez un autre jour.' : 'Cette heure est maintenant passée. Choisissez une nouvelle heure, ou revenez au choix du jour.';
      $(erreurs[etat.etape]).textContent = message;
      annoncer(message); return;
    }
    etat.termine = true;
    $('#recap-final').textContent = `Récapitulatif de l’essai : ${logique.coupes[etat.coupe].nom.toLowerCase()}${etat.soin ? ', avec ALPHA SLEEK' : ', sans ajout du soin'}, ${logique.fmtLong.format(dateChoisie())} à ${logique.heureFr(etat.heure)}.`;
    formulaire.hidden = true; resultat.hidden = false;
    transitionEntree(resultat); recapitulatif();
    champs.prenom.value = ''; champs.telephone.value = '';
    $('#titre-confirmation').focus({ preventScroll: true });
    $('#titre-confirmation').scrollIntoView({ behavior: 'instant', block: 'nearest' });
    annoncer('Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.');
  });
  function reinitialiser() {
    formulaire.reset();
    Object.assign(etat, { coupe: '', soin: true, jour: '', heure: null, etape: 0, atteinte: 0, termine: false });
    erreurs.forEach(id => $(id).textContent = '');
    Object.entries(champs).forEach(([nom, champ]) => { champ.removeAttribute('aria-invalid'); $(`#erreur-${nom}`).textContent = ''; });
    afficherEtape(0);
  }
  $('#recommencer').addEventListener('click', reinitialiser);

  /* Les liens ouvrent leur panneau avant de déplacer la lecture et le focus. */
  document.addEventListener('click', evenement => {
    const lien = evenement.target.closest('a[href^="#"]');
    if (!lien || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey || evenement.altKey) return;
    const cible = cibleDuFragment(lien.hash);
    if (!cible) return;
    evenement.preventDefault();
    const panneau = cible.closest('.panneau');
    if (lien.dataset.coupe) {
      if (etat.termine) reinitialiser();
      const coupe = lien.dataset.coupe;
      etat.coupe = coupe; etat.soin = true;
      $(`input[name="coupe"][value="${coupe}"]`).checked = true;
      $('#ajout-soin').checked = true;
      nouvellePrestation(); afficherEtape(0, false);
    }
    if (panneau) ouvrir(panneau);
    history.pushState(null, '', lien.hash);
    const focus = panneau ? $('.declencheur', panneau) : cible;
    if (!focus.hasAttribute('tabindex') && !['A', 'BUTTON', 'INPUT'].includes(focus.tagName)) focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
    cible.scrollIntoView({ behavior: reduit.matches || clavier ? 'instant' : 'smooth', block: 'start' });
  });

  const adresse = '89 Rue de Marseille, 69007 Lyon';
  const boutonCopie = $('#copier-adresse');
  boutonCopie.hidden = false;
  boutonCopie.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Copie non disponible');
      await navigator.clipboard.writeText(adresse);
      $('#message-copie').textContent = 'Adresse copiée.';
    } catch {
      $('#message-copie').textContent = `À copier : ${adresse}.`;
    }
  });

  /* Progression d’apparition à usage unique. Aucun gestionnaire de défilement. */
  const reperes = $$('[data-repere]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver(entrees => entrees.forEach(entree => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add('est-visible'); observateur.unobserve(entree.target);
    }), { threshold: .12 });
    reperes.forEach((repere, i) => { repere.style.transitionDelay = `${(i % 3) * 50}ms`; observateur.observe(repere); });
  } else reperes.forEach(repere => repere.classList.add('est-visible'));

  // Tous les gestionnaires sont prêts avant le repli des régions.
  $('#simulation').hidden = false;
  $('.sans-script').hidden = true;
  racine.classList.add('js');
  recapitulatif();
  requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('est-pret')));
})();
