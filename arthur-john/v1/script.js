(() => {
  'use strict';

  const racine = document.documentElement;
  racine.classList.add('js');
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clavier = false;
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Tab' || evenement.key === 'Enter' || evenement.key.startsWith('Arrow') || evenement.key === ' ') {
      clavier = true;
      racine.classList.add('sans-mouvement');
    }
  });
  document.addEventListener('pointerdown', () => {
    clavier = false;
    racine.classList.remove('sans-mouvement');
  }, { passive: true });

  if (!mouvementReduit.matches) racine.classList.add('anime');
  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-revelation]').forEach((element) => observateur.observe(element));
    racine.classList.add('revelations');
  }

  // Les seuls horaires utilisés sont ceux du tableau Planity retranscrit dans SOURCES.md.
  const horaires = { 0: null, 1: null, 2: [480, 1140], 3: [480, 1140], 4: [480, 1080], 5: [480, 1080], 6: [540, 1020] };
  const prestations = Array.from(document.querySelectorAll('[data-prestation]'), (element) => ({
    identifiant: element.dataset.prestation,
    nom: element.querySelector('h4').textContent.trim(),
    duree: Number(element.dataset.duree)
  }));
  const etat = { prestation: null, jour: null, heure: null, etape: 0, termine: false };
  const element = (selecteur) => document.querySelector(selecteur);
  const panneaux = Array.from(document.querySelectorAll('[data-panneau]'));
  const boutonsEtapes = Array.from(document.querySelectorAll('[data-etape]'));
  const panneau = element('#panneau-reservation');
  const annonce = element('#annonce-parcours');
  let changement = 0;
  let delai = null;

  function maintenantParis(instant = new Date()) {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant);
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return { cle: `${valeurs.year}-${valeurs.month}-${valeurs.day}`, minutes: Number(valeurs.hour) * 60 + Number(valeurs.minute) };
  }
  function dateDepuisCle(cle) { return new Date(`${cle}T12:00:00Z`); }
  function cleDepuisDate(date) { return date.toISOString().slice(0, 10); }
  function dateLongue(cle) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' }).format(dateDepuisCle(cle));
  }
  function heureLisible(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${heure}\u00a0h\u00a0${String(minute).padStart(2, '0')}` : `${heure}\u00a0h`;
  }
  function prestationChoisie() { return prestations.find((prestation) => prestation.identifiant === etat.prestation); }
  function creneaux(cle, duree, instant = maintenantParis()) {
    const plage = horaires[dateDepuisCle(cle).getUTCDay()];
    if (!plage || cle < instant.cle) return [];
    const resultat = [];
    const graine = Number(cle.replaceAll('-', ''));
    for (let minute = plage[0]; minute + duree <= plage[1]; minute += 30) {
      const passe = cle === instant.cle && minute <= instant.minutes;
      // Occupation purement illustrative et stable : aucun agenda distant n’est consulté.
      const occupe = (graine + minute / 30) % 7 === 2;
      resultat.push({ minute, indisponible: passe || occupe, raison: passe ? 'Heure passée' : 'Indisponible dans cet exemple' });
    }
    return resultat;
  }

  function creer(genre, classe, texte) {
    const noeud = document.createElement(genre);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }
  function radio(nom, valeur, selectionne, desactive = false) {
    const controle = creer('input');
    controle.type = 'radio'; controle.name = nom; controle.value = valeur;
    controle.checked = selectionne; controle.disabled = desactive;
    return controle;
  }

  function afficherPrestations() {
    const liste = element('#choix-prestations');
    liste.replaceChildren();
    prestations.forEach((prestation) => {
      const etiquette = creer('label');
      const controle = radio('prestation', prestation.identifiant, etat.prestation === prestation.identifiant);
      const texte = creer('span', 'texte-choix');
      texte.append(creer('span', '', prestation.nom), creer('small', '', `${prestation.duree}\u00a0min`));
      etiquette.append(controle, texte); liste.append(etiquette);
      controle.addEventListener('change', () => selectionnerPrestation(prestation.identifiant));
    });
  }
  function selectionnerPrestation(identifiant) {
    if (etat.prestation !== identifiant) { etat.jour = null; etat.heure = null; }
    etat.prestation = identifiant; etat.termine = false;
    element('#formulaire').reset();
    document.querySelectorAll('input[name="prestation"]').forEach((controle) => { controle.checked = controle.value === identifiant; });
    afficherJours(); actualiserResume();
  }
  function afficherJours() {
    const liste = element('#choix-jours'); liste.replaceChildren();
    const instant = maintenantParis();
    const depart = dateDepuisCle(instant.cle);
    const prestation = prestationChoisie();
    if (!prestation) return;
    const joursValides = new Set();
    for (let index = 0; index < 14; index++) {
      const jour = new Date(depart); jour.setUTCDate(jour.getUTCDate() + index);
      const cle = cleDepuisDate(jour);
      const ferme = !horaires[jour.getUTCDay()];
      const epuise = !ferme && !creneaux(cle, prestation.duree, instant).some((creneau) => !creneau.indisponible);
      if (!ferme && !epuise) joursValides.add(cle);
      const etiquette = creer('label', 'case-jour');
      const controle = radio('jour', cle, etat.jour === cle && !ferme && !epuise, ferme || epuise);
      const nomCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(jour);
      const mois = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'short' }).format(jour);
      const statut = ferme ? 'Fermé' : epuise ? 'Écoulé' : index === 0 ? 'Ce jour' : 'Exemple';
      controle.setAttribute('aria-label', `${dateLongue(cle)}, ${statut.toLowerCase()}`);
      etiquette.append(controle, creer('span', 'jour-court', nomCourt), creer('strong', '', String(jour.getUTCDate())), creer('span', 'mois', mois), creer('small', '', statut));
      liste.append(etiquette);
      controle.addEventListener('change', () => {
        if (etat.jour !== cle) etat.heure = null;
        etat.jour = cle; afficherHeures(); actualiserResume();
      });
    }
    if (etat.jour && !joursValides.has(etat.jour)) { etat.jour = null; etat.heure = null; }
    actualiserResume();
  }
  function afficherHeures() {
    const liste = element('#choix-heures'); liste.replaceChildren();
    if (!etat.jour || !prestationChoisie()) return;
    const plage = horaires[dateDepuisCle(etat.jour).getUTCDay()];
    element('#precision-heures').textContent = `${dateLongue(etat.jour)}. Plage publiée : ${heureLisible(plage[0])} – ${heureLisible(plage[1])}, à confirmer. Créneaux fictifs.`;
    const heures = creneaux(etat.jour, prestationChoisie().duree);
    if (etat.heure !== null && !heures.some((creneau) => creneau.minute === etat.heure && !creneau.indisponible)) etat.heure = null;
    heures.forEach((creneau) => {
      const etiquette = creer('label', 'case-heure');
      const controle = radio('heure', String(creneau.minute), etat.heure === creneau.minute, creneau.indisponible);
      controle.setAttribute('aria-label', `${heureLisible(creneau.minute)}${creneau.indisponible ? `, ${creneau.raison}` : ', exemple de créneau'}`);
      etiquette.append(controle, creer('span', '', heureLisible(creneau.minute))); liste.append(etiquette);
      controle.addEventListener('change', () => { etat.heure = creneau.minute; actualiserResume(); });
    });
    actualiserResume();
  }
  function actualiserResume() {
    element('#resume-prestation').textContent = prestationChoisie()?.nom || 'À choisir';
    element('#resume-jour').textContent = etat.jour ? dateLongue(etat.jour) : 'À choisir';
    element('#resume-heure').textContent = etat.heure !== null ? heureLisible(etat.heure) : 'À choisir';
    const resumeCompact = [prestationChoisie()?.nom, etat.jour ? dateLongue(etat.jour) : null, etat.heure !== null ? heureLisible(etat.heure) : null].filter(Boolean);
    element('#resume-mobile').textContent = resumeCompact.length ? resumeCompact.join(' · ') : 'Choisissez une prestation.';
    element('#tampon').textContent = etat.termine ? 'Essai terminé · sans réservation' : 'Simulation · sans envoi';
    document.querySelector('[data-suite="1"]').disabled = !etat.prestation;
    document.querySelector('[data-suite="2"]').disabled = !etat.jour;
    document.querySelector('[data-suite="3"]').disabled = etat.heure === null;
    boutonsEtapes.forEach((bouton, index) => {
      bouton.disabled = etat.termine || (index === 1 && !etat.prestation) || (index === 2 && !etat.jour) || (index === 3 && etat.heure === null);
      if (index === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function etapePermise(numero) {
    return numero === 0 || (numero === 1 && etat.prestation) || (numero === 2 && etat.jour) || (numero === 3 && etat.heure !== null) || (numero === 4 && etat.termine);
  }
  function aller(numero) {
    if (numero > 0 && numero < 4) {
      afficherJours();
      if (numero >= 2 && !etat.jour) numero = 1;
      if (numero >= 2) afficherHeures();
      if (numero === 3 && etat.heure === null) numero = 2;
    }
    if (!etapePermise(numero)) return;
    const jeton = ++changement;
    clearTimeout(delai);
    const appliquer = () => {
      if (jeton !== changement) return;
      etat.etape = numero;
      panneaux.forEach((contenu) => { contenu.hidden = Number(contenu.dataset.panneau) !== numero; });
      actualiserResume();
      const titre = panneaux[numero].querySelector('h3');
      titre.focus({ preventScroll: true });
      const position = titre.getBoundingClientRect();
      if (position.top < 20 || position.bottom > window.innerHeight - 90) titre.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      annonce.textContent = numero === 4 ? 'Simulation terminée. Aucun rendez-vous pris.' : `Étape ${numero + 1} sur 4 : ${titre.textContent}`;
      requestAnimationFrame(() => { if (jeton === changement) panneau.classList.remove('changement'); });
    };
    if (mouvementReduit.matches || clavier) { panneau.classList.remove('changement'); appliquer(); }
    else { panneau.classList.add('changement'); delai = setTimeout(appliquer, 100); }
  }

  boutonsEtapes.forEach((bouton) => bouton.addEventListener('click', () => aller(Number(bouton.dataset.etape))));
  document.querySelectorAll('[data-suite]').forEach((bouton) => bouton.addEventListener('click', () => aller(Number(bouton.dataset.suite))));
  document.querySelectorAll('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => aller(Number(bouton.dataset.retour))));
  document.querySelectorAll('[data-choisir]').forEach((lien) => lien.addEventListener('click', () => { selectionnerPrestation(lien.dataset.choisir); aller(1); }));

  function mobileValide(texte) {
    const nettoye = texte.replace(/[\s.()\-]/g, '');
    return /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(nettoye);
  }
  function signaler(champ, message) {
    element(`#erreur-${champ}`).textContent = message;
    if (message) element(`#${champ}`).setAttribute('aria-invalid', 'true');
    else element(`#${champ}`).removeAttribute('aria-invalid');
  }
  ['prenom', 'telephone'].forEach((champ) => element(`#${champ}`).addEventListener('input', () => signaler(champ, '')));
  element('#formulaire').addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = element('#prenom').value.trim();
    const telephone = element('#telephone').value.trim();
    const erreurPrenom = !prenom ? 'Saisissez un prénom, même fictif, pour continuer.' : '';
    const erreurTelephone = !mobileValide(telephone) ? 'Saisissez un mobile français valide pour cet essai.' : '';
    signaler('prenom', erreurPrenom); signaler('telephone', erreurTelephone);
    if (erreurPrenom || erreurTelephone) { element(erreurPrenom ? '#prenom' : '#telephone').focus(); return; }
    // Vérifier de nouveau l’heure si la page est restée ouverte longtemps.
    const toujoursDisponible = etat.jour && prestationChoisie() && creneaux(etat.jour, prestationChoisie().duree).some((creneau) => creneau.minute === etat.heure && !creneau.indisponible);
    if (!toujoursDisponible) {
      etat.heure = null; aller(2);
      element('#precision-heures').textContent = 'Ce créneau est maintenant passé. Choisissez une autre heure fictive ou revenez au choix du jour.';
      return;
    }
    etat.termine = true;
    element('#texte-resultat').textContent = `${prenom}, votre sélection d’essai : ${prestationChoisie().nom}, ${dateLongue(etat.jour)} à ${heureLisible(etat.heure)}.`;
    element('#formulaire').reset();
    aller(4);
  });
  element('#recommencer').addEventListener('click', () => {
    etat.prestation = null; etat.jour = null; etat.heure = null; etat.termine = false;
    element('#texte-resultat').textContent = '';
    element('#formulaire').reset();
    ['prenom', 'telephone'].forEach((champ) => signaler(champ, ''));
    afficherPrestations(); aller(0);
  });
  afficherPrestations(); actualiserResume();
  element('#atelier-reservation').hidden = false;

  if ('IntersectionObserver' in window) {
    const barre = element('.barre-mobile');
    let actionsDepassees = false;
    let reservationVisible = false;
    let piedVisible = false;
    const barreObservateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target.id === 'actions-hero') actionsDepassees = !entree.isIntersecting && entree.boundingClientRect.bottom < 0;
        if (entree.target.id === 'rendez-vous') reservationVisible = entree.isIntersecting;
        if (entree.target.id === 'pied') piedVisible = entree.isIntersecting;
      });
      barre.hidden = !actionsDepassees || reservationVisible || piedVisible;
    }, { threshold: 0 });
    ['#actions-hero', '#rendez-vous', '#pied'].forEach((selecteur) => barreObservateur.observe(element(selecteur)));
  }
})();
