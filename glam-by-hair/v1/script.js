(() => {
  'use strict';
  const racine = document.documentElement;
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const mouvementReduit = matchMedia('(prefers-reduced-motion: reduce)');
  const heureParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  // Horaires Planity, reproduits dans SOURCES.md. 0 : dimanche ; 1 : lundi.
  const horaires = [null, null, [540, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1020]];
  const duree = 90;
  const etat = { etape: 0, jour: '', minute: null, atteinte: 0 };
  let clavier = false;
  let minuterieEcran;
  let cadreEcran;
  let ancienEcran;

  function maintenantParis() {
    const parties = {};
    heureParis.formatToParts(new Date()).forEach(partie => { parties[partie.type] = partie.value; });
    const date = new Date(Date.UTC(+parties.year, +parties.month - 1, +parties.day, 12));
    return { date, cle: date.toISOString().slice(0, 10), minute: +parties.hour * 60 + +parties.minute };
  }
  function dateDepuis(cle) { return new Date(`${cle}T12:00:00Z`); }
  function heureFr(minute) {
    return `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  }
  function creneauxPour(cle) {
    const date = dateDepuis(cle);
    if (Number.isNaN(date.getTime())) return [];
    const plage = horaires[date.getUTCDay()];
    if (!plage) return [];
    const present = maintenantParis();
    const resultat = [];
    for (let minute = plage[0]; minute + duree <= plage[1]; minute += 30) {
      const passe = cle < present.cle || (cle === present.cle && minute <= present.minute);
      // Répartition fictive et déterministe : aucune disponibilité réelle n’est consultée.
      const exemplePris = ((date.getUTCDate() * 7 + Math.floor(minute / 30)) % 7 === 0);
      resultat.push({ minute, indisponible: passe || exemplePris, raison: passe ? 'Passé' : exemplePris ? 'Exemple pris' : '' });
    }
    return resultat;
  }
  function annoncer(texte) { $('#annonce-parcours').textContent = texte; }
  function erreur(id, texte) { $(`#${id}`).textContent = texte; }

  document.addEventListener('keydown', evenement => {
    if (!['Shift','Control','Alt','Meta'].includes(evenement.key)) {
      clavier = true;
      racine.classList.add('clavier');
    }
  }, true);
  document.addEventListener('pointerdown', () => {
    clavier = false;
    racine.classList.remove('clavier');
  }, true);

  function afficherEntree() { requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret'))); }
  // La lecture et les liens sont disponibles pendant l’entrée.
  if (document.fonts) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 550))]).then(afficherEntree);
  else afficherEntree();

  const apparitions = $$('.apparition');
  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observation = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        observation.unobserve(entree.target);
      });
    }, { threshold: .08 });
    apparitions.forEach(element => { element.classList.add('preparee'); observation.observe(element); });
  }
  mouvementReduit.addEventListener('change', () => {
    if (mouvementReduit.matches) apparitions.forEach(element => element.classList.add('visible'));
  });

  const liensReperes = $$('.reperes a');
  const curseur = $('.reperes-curseur');
  function activerRepere(id) {
    liensReperes.forEach(lien => {
      const actif = lien.hash === `#${id}`;
      if (actif) {
        lien.setAttribute('aria-current', 'location');
        curseur.style.transform = `translateY(${lien.offsetTop - liensReperes[0].offsetTop}px)`;
      } else lien.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window) {
    const reperesVisibles = new Map();
    const suivi = new IntersectionObserver(entrees => {
      entrees.forEach(entree => reperesVisibles.set(entree.target, entree.isIntersecting));
      const visibles = $$('[data-repere]').filter(element => reperesVisibles.get(element));
      if (visibles.length) activerRepere(visibles[0].id);
    }, { rootMargin: '-12% 0px -52% 0px', threshold: 0 });
    $$('[data-repere]').forEach(section => suivi.observe(section));
  }
  liensReperes.forEach(lien => lien.addEventListener('click', () => activerRepere(lien.hash.slice(1))));

  const gestes = $('.gestes');
  const choixGestes = $$('[data-geste-choix]');
  function choisirGeste(indice) {
    gestes.dataset.geste = String(indice);
    choixGestes.forEach((bouton, i) => bouton.setAttribute('aria-pressed', String(i === indice)));
    $$('[data-geste-texte]').forEach((texte, i) => texte.setAttribute('aria-hidden', String(i !== indice)));
    $('#annonce-geste').textContent = $('[data-geste-texte="' + indice + '"] p').textContent;
  }
  choixGestes.forEach((bouton, indice) => bouton.addEventListener('click', () => choisirGeste(indice)));
  choisirGeste(0);

  const ecrans = $$('[data-ecran]');
  function rafraichirResume() {
    $('#selection-creneau').textContent = etat.jour ? `${dateLongue.format(dateDepuis(etat.jour))}${etat.minute !== null ? ` · ${heureFr(etat.minute)}` : ' · Heure à choisir'}` : 'Jour et heure à choisir';
  }
  function construireJours() {
    const conteneur = $('#jours');
    conteneur.replaceChildren();
    const present = maintenantParis();
    let choixEncoreValide = false;
    for (let decalage = 0; decalage < 14; decalage++) {
      const date = new Date(present.date.getTime() + decalage * 86400000);
      const cle = date.toISOString().slice(0, 10);
      const ferme = !horaires[date.getUTCDay()];
      const sansCreneau = !ferme && !creneauxPour(cle).some(creneau => !creneau.indisponible);
      const etiquette = document.createElement('label');
      etiquette.className = 'choix';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'jour'; input.value = cle;
      input.disabled = ferme || sansCreneau;
      input.setAttribute('aria-describedby', 'erreur-jour');
      input.setAttribute('aria-label', `${dateLongue.format(date)}${ferme ? ', fermé' : sansCreneau ? ', sans créneau de démonstration' : ', date de démonstration'}`);
      input.checked = etat.jour === cle && !input.disabled;
      if (input.checked) choixEncoreValide = true;
      const texte = document.createElement('span');
      const semaine = document.createElement('span'); semaine.className = 'jour-semaine'; semaine.textContent = jourCourt.format(date);
      const numero = document.createElement('strong'); numero.className = 'jour-date'; numero.textContent = date.getUTCDate();
      const mois = document.createElement('span'); mois.className = 'jour-mois'; mois.textContent = ferme ? 'Fermé' : sansCreneau ? 'Sans créneau' : moisCourt.format(date);
      texte.append(semaine, numero, mois); etiquette.append(input, texte); conteneur.append(etiquette);
      input.addEventListener('change', () => {
        etat.jour = cle; etat.minute = null; etat.atteinte = 1;
        erreur('erreur-jour', ''); input.removeAttribute('aria-invalid');
        rafraichirResume(); actualiserEtapes();
        annoncer(`${dateLongue.format(date)} sélectionné pour la simulation. Choisissez ensuite une heure.`);
      });
    }
    if (etat.jour && !choixEncoreValide) { etat.jour = ''; etat.minute = null; etat.atteinte = 1; rafraichirResume(); }
  }
  function construireCreneaux() {
    const conteneur = $('#creneaux');
    conteneur.replaceChildren();
    $('#jour-choisi').textContent = dateLongue.format(dateDepuis(etat.jour));
    const creneaux = creneauxPour(etat.jour);
    if (!creneaux.some(creneau => !creneau.indisponible)) {
      const note = document.createElement('p'); note.textContent = 'Aucun créneau de démonstration restant ce jour-là. Revenez choisir un autre jour.'; conteneur.append(note);
    }
    if (etat.minute !== null && !creneaux.some(creneau => creneau.minute === etat.minute && !creneau.indisponible)) { etat.minute = null; etat.atteinte = 2; rafraichirResume(); }
    creneaux.forEach(creneau => {
      const etiquette = document.createElement('label'); etiquette.className = 'choix';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'heure'; input.value = creneau.minute;
      input.disabled = creneau.indisponible; input.checked = etat.minute === creneau.minute && !creneau.indisponible;
      input.setAttribute('aria-label', `${heureFr(creneau.minute)}, ${creneau.raison || 'créneau de démonstration'}`);
      input.setAttribute('aria-describedby', 'erreur-heure');
      const texte = document.createElement('span');
      const heure = document.createElement('strong'); heure.textContent = heureFr(creneau.minute);
      texte.append(heure);
      if (creneau.raison) { const statut = document.createElement('small'); statut.className = 'etat-creneau'; statut.textContent = creneau.raison; texte.append(statut); }
      etiquette.append(input, texte); conteneur.append(etiquette);
      input.addEventListener('change', () => {
        etat.minute = creneau.minute;
        erreur('erreur-heure', ''); rafraichirResume();
        annoncer(`${heureFr(creneau.minute)} sélectionné pour la simulation.`);
      });
    });
  }
  function actualiserEtapes() {
    $$('[data-etape]').forEach((bouton, indice) => {
      bouton.disabled = etat.etape === 4 || indice > etat.atteinte;
      if (indice === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function changerEtape(numero, memoriser = true) {
    if (numero > 1 && !etat.jour) numero = 1;
    if (numero > 2 && etat.minute === null) numero = 2;
    clearTimeout(minuterieEcran); cancelAnimationFrame(cadreEcran);
    if (ancienEcran) { ancienEcran.hidden = true; ancienEcran.classList.remove('sort'); }
    const precedent = ecrans[etat.etape];
    const cible = ecrans[numero];
    etat.etape = numero; etat.atteinte = Math.max(etat.atteinte, numero);
    if (numero === 1) construireJours();
    if (numero === 2) construireCreneaux();
    actualiserEtapes(); rafraichirResume();
    ecrans.forEach(ecran => { if (ecran !== precedent && ecran !== cible) ecran.hidden = true; });
    cible.hidden = false; cible.inert = false; cible.classList.remove('sort');
    const animer = !mouvementReduit.matches && !clavier && cible !== precedent;
    if (animer) {
      precedent.inert = true; precedent.classList.add('sort');
      cible.classList.add('entre');
      ancienEcran = precedent;
      cadreEcran = requestAnimationFrame(() => requestAnimationFrame(() => cible.classList.remove('entre')));
      minuterieEcran = setTimeout(() => { precedent.hidden = true; precedent.classList.remove('sort'); ancienEcran = null; }, 240);
    } else {
      if (precedent !== cible) precedent.hidden = true;
      cible.classList.remove('entre'); ancienEcran = null;
    }
    const titre = $('h3', cible);
    titre.focus({ preventScroll: true });
    const rectangle = titre.getBoundingClientRect();
    if (rectangle.top < 88 || rectangle.bottom > innerHeight - 110) titre.scrollIntoView({ block: 'center', behavior: (clavier || mouvementReduit.matches) ? 'instant' : 'smooth' });
    annoncer(numero === 4 ? 'Simulation terminée. Aucun rendez-vous pris ni aucune donnée envoyée.' : `Étape ${numero + 1} sur 4 : ${titre.textContent}`);
    if (memoriser) history.pushState({ simulationGlam: true, etape: numero }, '', `${location.pathname}${location.search}#simulation`);
  }
  function validerAvant(numero) {
    if (numero >= 2 && !etat.jour) {
      erreur('erreur-jour', 'Choisissez une date de démonstration.');
      annoncer('Choisissez une date avant de continuer.');
      $('#jours input:not(:disabled)')?.focus(); return false;
    }
    if (numero >= 3 && (etat.minute === null || !creneauxPour(etat.jour).some(creneau => creneau.minute === etat.minute && !creneau.indisponible))) {
      etat.minute = null; erreur('erreur-heure', 'Choisissez un créneau de démonstration disponible.');
      annoncer('Choisissez une heure avant de continuer.');
      $('#creneaux input:not(:disabled)')?.focus(); rafraichirResume(); return false;
    }
    return true;
  }
  $$('[data-suivant]').forEach(bouton => bouton.addEventListener('click', () => {
    const numero = +bouton.dataset.suivant;
    if (validerAvant(numero)) changerEtape(numero);
  }));
  $$('[data-retour]').forEach(bouton => bouton.addEventListener('click', () => changerEtape(+bouton.dataset.retour)));
  $$('[data-etape]').forEach(bouton => bouton.addEventListener('click', () => changerEtape(+bouton.dataset.etape)));
  window.addEventListener('popstate', evenement => {
    if (evenement.state?.simulationGlam) changerEtape(Math.min(evenement.state.etape, etat.atteinte), false);
    else if (etat.etape > 0) changerEtape(0, false);
  });

  $('#formulaire').addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3) return;
    const prenom = $('#prenom'); const telephone = $('#telephone');
    const prenomValide = prenom.value.trim().length > 0;
    const numero = telephone.value.replace(/[\s().-]/g, '');
    const telephoneValide = /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(numero);
    prenom.setAttribute('aria-invalid', String(!prenomValide));
    telephone.setAttribute('aria-invalid', String(!telephoneValide));
    erreur('erreur-prenom', prenomValide ? '' : 'Indiquez un prénom pour terminer l’essai.');
    erreur('erreur-telephone', telephoneValide ? '' : 'Indiquez un numéro français de 10 chiffres, ou au format +33.');
    if (!prenomValide || !telephoneValide) {
      (prenomValide ? telephone : prenom).focus();
      annoncer('Vérifiez les coordonnées indiquées. Rien n’a été envoyé.'); return;
    }
    if (!creneauxPour(etat.jour).some(creneau => creneau.minute === etat.minute && !creneau.indisponible)) {
      etat.minute = null; changerEtape(2); erreur('erreur-heure', 'Ce créneau est maintenant passé. Choisissez une autre heure de démonstration.'); return;
    }
    $('#resultat-texte').textContent = `Votre sélection d’essai : Rituel serenity, ${dateLongue.format(dateDepuis(etat.jour))} à ${heureFr(etat.minute)}, pour une durée de 1\u00a0h\u00a030.`;
    // Les coordonnées ne servent qu’à illustrer la validation locale et sont effacées ici.
    prenom.value = ''; telephone.value = '';
    changerEtape(4);
  });
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('input', () => { $(`#${id}`).removeAttribute('aria-invalid'); erreur(`erreur-${id}`, ''); });
  });
  $('#recommencer').addEventListener('click', () => {
    etat.jour = ''; etat.minute = null; etat.atteinte = 0;
    $('#formulaire').reset();
    $$('.erreur').forEach(element => { element.textContent = ''; });
    $$('#formulaire [aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    $('#resultat-texte').textContent = '';
    changerEtape(0); actualiserEtapes();
  });

  $('.parcours').hidden = false;
  // La classe n’est ajoutée qu’une fois tous les contrôles initialisés.
  racine.classList.add('js');
})();
