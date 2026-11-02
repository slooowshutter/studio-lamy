/* ZEUS Coiffeur. Essai local ; aucune requête, aucun stockage. */
(() => {
  'use strict';
  const racine = document.documentElement;
  const $ = (selecteur, contexte = document) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => [...contexte.querySelectorAll(selecteur)];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clavier = false;
  document.addEventListener('keydown', () => { clavier = true; racine.classList.add('clavier'); });
  document.addEventListener('pointerdown', () => { clavier = false; racine.classList.remove('clavier'); }, { passive: true });

  // Une animation unique laisse ensuite la date et la ligne dans leur état final.
  requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret')));
  const aReveler = $$('[data-revelation]');
  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('vu');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .18 });
    aReveler.forEach(element => observateur.observe(element));
  } else aReveler.forEach(element => element.classList.add('vu'));
  mouvementReduit.addEventListener('change', evenement => {
    if (evenement.matches) aReveler.forEach(element => element.classList.add('vu'));
  });

  // La barre mobile se retire devant les coordonnées et le pied de page.
  const barre = $('.barre-mobile');
  if ('IntersectionObserver' in window) {
    const regions = new Map();
    const observateurBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => regions.set(entree.target, entree.isIntersecting));
      const masquer = [...regions.values()].some(Boolean);
      barre.classList.toggle('masquee', masquer);
      barre.inert = masquer;
    }, { threshold: 0 });
    [$('.hero-pied'), $('#rendez-vous'), $('#pied')].forEach(element => observateurBarre.observe(element));
  }

  const adresse = 'ZEUS Coiffeur, 9 rue du Faubourg-de-Pierre, 67000 Strasbourg';
  $('.copier').addEventListener('click', async () => {
    const message = $('#message-copie');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Copie indisponible');
      await navigator.clipboard.writeText(adresse);
      message.textContent = 'Adresse copiée.';
    } catch {
      message.textContent = 'Copiez cette adresse : 9 rue du Faubourg-de-Pierre, 67000 Strasbourg.';
    }
  });

  // Source : PagesJaunes, fiche 63795102, relevée dans le dossier du 02/11/2026.
  // Ces plages sont des bornes pour la démonstration, pas des disponibilités.
  // Aucune durée de prestation n’est supposée. Les heures sont des points de départ.
  const horaires = { 0: null, 1: [600, 1140], 2: [600, 1140], 3: [600, 1140], 4: [540, 1140], 5: [540, 1140], 6: null };
  const paris = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateCourte = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const etat = { etape: 0, maximum: 0, activite: '', jour: '', heure: null };
  const formulaire = $('#formulaire');
  const panneaux = $$('[data-panneau]');
  const boutonsEtapes = $$('[data-etape]');
  const erreurChoix = $('#erreur-choix');
  const nomsEtapes = ['Activité', 'Jour', 'Heure', 'Vos coordonnées'];
  let transitionEnCours = 0;
  let pulsation = 0;

  function maintenantParis(date = new Date()) {
    const morceaux = Object.fromEntries(paris.formatToParts(date).filter(partie => partie.type !== 'literal').map(partie => [partie.type, partie.value]));
    return { cle: `${morceaux.year}-${morceaux.month}-${morceaux.day}`, minutes: Number(morceaux.hour) * 60 + Number(morceaux.minute) };
  }
  function dateDe(cle) { return new Date(`${cle}T12:00:00Z`); }
  function cleDe(date) { return date.toISOString().slice(0, 10); }
  function heureTexte(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste ? `${heures}\u00a0h\u00a0${String(reste).padStart(2, '0')}` : `${heures}\u00a0h`;
  }
  function heuresDu(cle, maintenant = maintenantParis()) {
    const plage = horaires[dateDe(cle).getUTCDay()];
    if (!plage || cle < maintenant.cle) return [];
    const liste = [];
    for (let heure = plage[0]; heure < plage[1]; heure += 60) {
      liste.push({ minutes: heure, passe: cle === maintenant.cle && heure <= maintenant.minutes });
    }
    return liste;
  }
  function heureValide() {
    return etat.jour && heuresDu(etat.jour).some(heure => heure.minutes === etat.heure && !heure.passe);
  }
  function annoncer(texte) { $('#annonce').textContent = texte; }

  function radio(nom, valeur, texteAccessible) {
    const champ = document.createElement('input');
    champ.type = 'radio';
    champ.name = nom;
    champ.value = valeur;
    champ.setAttribute('aria-label', texteAccessible);
    return champ;
  }

  function creerJours() {
    const maintenant = maintenantParis();
    const debut = dateDe(maintenant.cle);
    const conteneur = $('#jours');
    conteneur.replaceChildren();
    for (let indice = 0; indice < 14; indice += 1) {
      const date = new Date(debut);
      date.setUTCDate(debut.getUTCDate() + indice);
      const cle = cleDe(date);
      const ferme = !horaires[date.getUTCDay()];
      const termine = !ferme && !heuresDu(cle, maintenant).some(heure => !heure.passe);
      const ligne = document.createElement('label');
      ligne.className = 'jour';
      const indication = ferme ? 'fermé selon PagesJaunes, à confirmer' : termine ? 'heures révolues' : 'jour de démonstration';
      const champ = radio('jour', cle, `${dateLongue.format(date)}, ${indication}`);
      champ.disabled = ferme || termine;
      champ.checked = etat.jour === cle;
      const libelle = document.createElement('span');
      libelle.textContent = jourCourt.format(date);
      const nombre = document.createElement('strong');
      nombre.textContent = date.getUTCDate();
      const note = document.createElement('small');
      note.textContent = ferme ? 'Fermé³' : termine ? 'Révolu' : moisCourt.format(date);
      ligne.append(champ, libelle, nombre, note);
      conteneur.append(ligne);
    }
    if (etat.jour && (!conteneur.querySelector(`input[value="${etat.jour}"]:not(:disabled)`))) {
      etat.jour = '';
      etat.heure = null;
      etat.maximum = Math.min(etat.maximum, 1);
    }
    actualiserResume(false);
    actualiserEtapes();
  }

  function creerHeures() {
    const conteneur = $('#heures');
    conteneur.replaceChildren();
    $('#jour-choisi').textContent = dateLongue.format(dateDe(etat.jour));
    const liste = heuresDu(etat.jour);
    liste.forEach(heure => {
      const ligne = document.createElement('label');
      ligne.className = 'heure';
      const texte = heureTexte(heure.minutes);
      const champ = radio('heure', String(heure.minutes), `${texte}, ${heure.passe ? 'heure révolue' : 'heure de démonstration'}`);
      champ.disabled = heure.passe;
      champ.checked = etat.heure === heure.minutes;
      const libelle = document.createElement('span');
      libelle.textContent = texte;
      ligne.append(champ, libelle);
      conteneur.append(ligne);
    });
    $('#sans-heure').hidden = liste.some(heure => !heure.passe);
    if (!heureValide()) {
      etat.heure = null;
      etat.maximum = Math.min(etat.maximum, 2);
      actualiserResume(false);
    }
    actualiserEtapes();
  }

  function actualiserResume(animer = true) {
    $('#recap-activite').textContent = etat.activite || 'À choisir';
    $('#recap-jour').textContent = etat.jour ? dateCourte.format(dateDe(etat.jour)) : 'À choisir';
    $('#recap-heure').textContent = etat.heure === null ? 'À choisir' : heureTexte(etat.heure);
    const trait = $('.selection-trait');
    clearTimeout(pulsation);
    trait.classList.remove('choix-change');
    if (animer && !clavier && !mouvementReduit.matches) {
      trait.classList.add('choix-change');
      pulsation = setTimeout(() => trait.classList.remove('choix-change'), 220);
    }
  }

  function actualiserEtapes() {
    boutonsEtapes.forEach((bouton, indice) => {
      bouton.disabled = indice > etat.maximum;
      if (indice === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function focaliser(element) {
    element.focus({ preventScroll: true });
    const resume = $('#selection');
    const limiteHaute = window.matchMedia('(max-width: 760px)').matches && !resume.hidden ? resume.offsetHeight + 24 : 24;
    element.style.scrollMarginTop = `${limiteHaute}px`;
    const position = element.getBoundingClientRect();
    if (position.top < limiteHaute || position.bottom > window.innerHeight - 100) element.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  function montrerEtape(indice, donnerFocus = true) {
    const ancienne = etat.etape;
    cancelAnimationFrame(transitionEnCours);
    if (indice === 1) creerJours();
    if (indice === 2) creerHeures();
    etat.etape = indice;
    panneaux.forEach((panneau, numero) => {
      panneau.classList.remove('entree', 'retour-entree');
      panneau.hidden = numero !== indice;
    });
    const panneau = panneaux[indice];
    if (!mouvementReduit.matches && !clavier && donnerFocus) {
      const classe = indice < ancienne ? 'retour-entree' : 'entree';
      panneau.classList.add(classe);
      panneau.getBoundingClientRect();
      transitionEnCours = requestAnimationFrame(() => panneau.classList.remove(classe));
    }
    actualiserEtapes();
    $('#precedent').hidden = indice === 0;
    $('#continuer').replaceChildren(document.createTextNode(indice === 3 ? 'Terminer la simulation ' : 'Continuer '));
    const fleche = document.createElement('span');
    fleche.setAttribute('aria-hidden', 'true');
    fleche.textContent = '→';
    $('#continuer').append(fleche);
    erreurChoix.textContent = '';
    annoncer(`Étape ${indice + 1} sur 4 : ${nomsEtapes[indice]}.`);
    if (donnerFocus) focaliser($('h3', panneau));
  }

  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'activite') etat.activite = champ.value;
    if (champ.name === 'jour') {
      if (etat.jour !== champ.value) {
        etat.heure = null;
        etat.maximum = Math.min(etat.maximum, 2);
      }
      etat.jour = champ.value;
    }
    if (champ.name === 'heure') etat.heure = Number(champ.value);
    erreurChoix.textContent = '';
    actualiserResume();
    actualiserEtapes();
  });

  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => {
    const indice = Number(bouton.dataset.etape);
    if (indice <= etat.maximum) montrerEtape(indice);
  }));
  $('#precedent').addEventListener('click', () => montrerEtape(Math.max(0, etat.etape - 1)));

  function verifierChamp(champ) {
    let message = '';
    if (champ.id === 'prenom' && !champ.value.trim()) message = 'Indiquez un prénom pour terminer l’essai.';
    if (champ.id === 'telephone') {
      const numero = champ.value.replace(/[\s.()\-\u00a0]/g, '');
      if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(numero)) message = 'Indiquez un numéro mobile français valide (06, 07 ou +33).';
    }
    champ.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(`#erreur-${champ.id}`).textContent = message;
    return !message;
  }
  $$('.champ input').forEach(champ => {
    champ.addEventListener('blur', () => { if (champ.value || champ.hasAttribute('aria-invalid')) verifierChamp(champ); });
    champ.addEventListener('input', () => {
      if (champ.getAttribute('aria-invalid') === 'true') {
        champ.removeAttribute('aria-invalid');
        $(`#erreur-${champ.id}`).textContent = '';
      }
    });
  });

  function choixManquant(message, selecteur) {
    erreurChoix.textContent = message;
    const premier = $(selecteur, panneaux[etat.etape]);
    if (premier) focaliser(premier);
  }

  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape === 0 && !etat.activite) return choixManquant('Choisissez une activité pour continuer.', 'input');
    if (etat.etape === 1) {
      if (!etat.jour) return choixManquant('Choisissez un jour de démonstration.', 'input:not(:disabled)');
      if (!heuresDu(etat.jour).some(heure => !heure.passe)) {
        etat.jour = '';
        etat.heure = null;
        creerJours();
        return choixManquant('Les heures de ce jour sont révolues. Choisissez un autre jour.', 'input:not(:disabled)');
      }
    }
    if (etat.etape === 2 && !heureValide()) {
      creerHeures();
      return choixManquant('Choisissez une heure de démonstration encore à venir.', 'input:not(:disabled)');
    }
    if (etat.etape < 3) {
      etat.maximum = Math.max(etat.maximum, etat.etape + 1);
      montrerEtape(etat.etape + 1);
      return;
    }
    // Une heure peut être devenue passée depuis le choix ; la revérifier au terme.
    if (!heureValide()) {
      etat.heure = null;
      etat.maximum = 2;
      montrerEtape(2);
      erreurChoix.textContent = 'Cette heure est désormais révolue. Choisissez une autre heure ou un autre jour.';
      return;
    }
    const champs = $$('.champ input');
    const invalides = champs.filter(champ => !verifierChamp(champ));
    if (invalides.length) { focaliser(invalides[0]); return; }
    $('#resultat-recap').textContent = `${etat.activite} · ${dateLongue.format(dateDe(etat.jour))} à ${heureTexte(etat.heure)}. Sélection de démonstration uniquement.`;
    formulaire.hidden = true;
    $('.etapes').hidden = true;
    const resultat = $('#resultat');
    resultat.hidden = false;
    if (!mouvementReduit.matches && !clavier) {
      resultat.classList.add('entree');
      resultat.getBoundingClientRect();
      requestAnimationFrame(() => resultat.classList.remove('entree'));
    }
    annoncer('La simulation est terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé.');
    focaliser($('h3', resultat));
  });

  $('#recommencer').addEventListener('click', () => {
    formulaire.reset();
    Object.assign(etat, { etape: 0, maximum: 0, activite: '', jour: '', heure: null });
    $$('.champ input').forEach(champ => champ.removeAttribute('aria-invalid'));
    $$('.erreur').forEach(element => { element.textContent = ''; });
    $('#resultat').hidden = true;
    formulaire.hidden = false;
    $('.etapes').hidden = false;
    actualiserResume(false);
    montrerEtape(0);
  });

  // Quand l’onglet revient au premier plan, actualiser les dates et heures révolues.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || formulaire.hidden) return;
    if (etat.etape === 1) creerJours();
    if (etat.etape === 2) creerHeures();
  });
  montrerEtape(0, false);
  $('#essai').hidden = false;
  $('#selection').hidden = false;
  window.zeusPret = true;
})();
