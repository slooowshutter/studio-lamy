(() => {
  'use strict';
  const racine = document.documentElement;
  const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clavier = false;
  document.addEventListener('keydown', () => { clavier = true; racine.dataset.entree = 'clavier'; });
  document.addEventListener('pointerdown', () => { clavier = false; racine.dataset.entree = 'pointeur'; }, { passive: true });

  // Tous les contenus restent lisibles si JavaScript ne s’exécute pas.
  racine.classList.add('js');
  const couverture = document.querySelector('.couverture');
  requestAnimationFrame(() => requestAnimationFrame(() => couverture.classList.add('entree-faite')));
  const revelations = document.querySelectorAll('[data-revelation]');
  if ('IntersectionObserver' in window && !reduction.matches) {
    const observation = new IntersectionObserver(entrees => {
      entrees.forEach((entree, i) => {
        if (!entree.isIntersecting) return;
        entree.target.style.transitionDelay = `${Math.min(i, 4) * 60}ms`;
        entree.target.classList.remove('a-reveler');
        observation.unobserve(entree.target);
      });
    }, { threshold: .12 });
    revelations.forEach(element => { element.classList.add('a-reveler'); observation.observe(element); });
    reduction.addEventListener('change', () => {
      if (reduction.matches) { observation.disconnect(); revelations.forEach(element => element.classList.remove('a-reveler')); }
    });
  }

  // Horaires publiés sur PagesJaunes ; divergences détaillées dans les sources.
  // Les heures sont des préférences de démonstration, jamais des disponibilités.
  const horaires = { 0: null, 1: null, 2: [9, 19], 3: [9, 19], 4: [10, 20], 5: [10, 20], 6: [9, 18] };
  const soins = {
    visage: 'Soins anti-âge Guinot',
    modelage: 'Modelage relaxant',
    ongles: 'Vernis semi-permanent OPI',
    cils: 'Rehaussement de cils',
    lumiere: 'Lumière pulsée',
    pressotherapie: 'Pressothérapie'
  };
  const formulaire = document.getElementById('formulaire');
  const carnet = document.getElementById('carnet');
  const panneaux = [...document.querySelectorAll('[data-panneau]')];
  const boutonsEtapes = [...document.querySelectorAll('[data-etape]')];
  const annonce = document.getElementById('annonce');
  const etat = { soin: '', jour: '', heure: '', etape: 0, atteinte: 0 };
  const prenom = document.getElementById('prenom');
  const telephone = document.getElementById('telephone');
  let dates = [];
  let panneauAnimation = 0;

  function maintenantParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const valeur = type => Number(morceaux.find(partie => partie.type === type).value);
    return { cle: `${valeur('year')}-${String(valeur('month')).padStart(2, '0')}-${String(valeur('day')).padStart(2, '0')}`, minutes: valeur('hour') * 60 + valeur('minute') };
  }
  function cleDate(date) { return date.toISOString().slice(0, 10); }
  function dateChoisie() { return dates.find(date => cleDate(date) === etat.jour); }
  function dateLongue(date) { return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date); }
  function estPassee(cle, heure) { const maintenant = maintenantParis(); return cle < maintenant.cle || (cle === maintenant.cle && heure * 60 <= maintenant.minutes); }
  function heuresPour(date) {
    const plage = horaires[date.getUTCDay()];
    return plage ? Array.from({ length: plage[1] - plage[0] }, (_, i) => plage[0] + i) : [];
  }
  function renseignerResume() {
    const valeurs = {
      'resume-soin': soins[etat.soin] || 'À choisir',
      'resume-jour': etat.jour ? dateLongue(dateChoisie()) : 'À noter',
      'resume-heure': etat.heure ? `${etat.heure}\u00a0h` : 'À préciser'
    };
    for (const [id, valeur] of Object.entries(valeurs)) {
      const champ = document.getElementById(id);
      if (champ.textContent === valeur) continue;
      champ.textContent = valeur;
      champ.classList.remove('ecriture');
      if (!reduction.matches && !clavier) {
        champ.classList.add('ecriture');
        requestAnimationFrame(() => requestAnimationFrame(() => champ.classList.remove('ecriture')));
      }
    }
    boutonsEtapes.forEach((bouton, i) => { bouton.disabled = i > etat.atteinte; });
    document.getElementById('resume-contact').hidden = etat.etape !== 3;
    document.getElementById('resume-prenom').textContent = prenom.value.trim() || 'À renseigner';
    document.getElementById('resume-telephone').textContent = telephone.value.trim();
  }
  function montrerEtape(numero, focus = true) {
    etat.etape = numero;
    etat.atteinte = Math.max(etat.atteinte, numero);
    cancelAnimationFrame(panneauAnimation);
    panneaux.forEach((panneau, i) => { panneau.hidden = i !== numero; panneau.classList.remove('arrivee'); });
    boutonsEtapes.forEach((bouton, i) => {
      if (i === numero) bouton.setAttribute('aria-current', 'step'); else bouton.removeAttribute('aria-current');
    });
    const panneau = panneaux[numero];
    if (!reduction.matches && !clavier) {
      panneau.classList.add('arrivee');
      panneauAnimation = requestAnimationFrame(() => { panneauAnimation = requestAnimationFrame(() => panneau.classList.remove('arrivee')); });
    }
    renseignerResume();
    annonce.textContent = `Étape ${numero + 1} sur 4. ${panneau.querySelector('h3').textContent}`;
    if (focus) {
      const titre = panneau.querySelector('h3');
      titre.focus({ preventScroll: true });
      if (titre.getBoundingClientRect().top < 20 || titre.getBoundingClientRect().top > window.innerHeight - 140) {
        titre.scrollIntoView({ block: 'start', behavior: clavier || reduction.matches ? 'instant' : 'smooth' });
      }
    }
  }
  function creerChoix(nom, valeur, classe, contenu, desactive, description) {
    const label = document.createElement('label');
    label.className = classe;
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = nom; radio.value = valeur; radio.disabled = desactive;
    radio.setAttribute('aria-label', description);
    radio.setAttribute('aria-describedby', `erreur-${nom}`);
    label.append(radio);
    for (const [balise, texte] of contenu) {
      const element = document.createElement(balise); element.textContent = texte; label.append(element);
    }
    return label;
  }
  function creerJours() {
    const jourActuel = maintenantParis().cle;
    const depart = new Date(`${jourActuel}T12:00:00Z`);
    dates = Array.from({ length: 14 }, (_, i) => new Date(depart.getTime() + i * 86400000));
    const conteneur = document.getElementById('jours');
    conteneur.replaceChildren();
    for (const date of dates) {
      const cle = cleDate(date);
      const ferme = !horaires[date.getUTCDay()];
      const termine = !ferme && heuresPour(date).every(heure => estPassee(cle, heure));
      const semaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date);
      const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date);
      const detail = ferme ? 'Fermé' : termine ? 'Passé' : mois;
      const label = creerChoix('jour', cle, 'jour', [['span', semaine], ['strong', String(date.getUTCDate())], ['small', detail]], ferme || termine, `${dateLongue(date)}${ferme ? ', fermé' : termine ? ', heures passées' : ', préférence de démonstration'}`);
      conteneur.append(label);
    }
  }
  function creerHeures() {
    const conteneur = document.getElementById('heures');
    conteneur.replaceChildren();
    const date = dateChoisie();
    if (!date) return;
    for (const heure of heuresPour(date)) {
      const passe = estPassee(etat.jour, heure);
      const label = creerChoix('heure', String(heure), 'heure', [['span', `${heure}\u00a0h`]], passe, `${heure} heures${passe ? ', heure passée' : ', préférence de démonstration'}`);
      conteneur.append(label);
    }
  }
  function effacerErreur(type) {
    document.getElementById(`erreur-${type}`).textContent = '';
    formulaire.querySelectorAll(`[name="${type}"]`).forEach(champ => champ.removeAttribute('aria-invalid'));
  }
  function erreur(type, texte) {
    document.getElementById(`erreur-${type}`).textContent = texte;
    const champs = formulaire.querySelectorAll(`[name="${type}"]`);
    champs.forEach(champ => champ.setAttribute('aria-invalid', 'true'));
    const champ = [...champs].find(element => !element.disabled);
    if (champ) champ.focus({ preventScroll: true });
  }

  formulaire.querySelectorAll('[name="soin"]').forEach(champ => champ.setAttribute('aria-describedby', 'erreur-soin'));
  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'soin') {
      etat.soin = champ.value;
      effacerErreur('soin');
    } else if (champ.name === 'jour') {
      etat.jour = champ.value; etat.heure = '';
      etat.atteinte = Math.min(etat.atteinte, 2);
      effacerErreur('jour'); effacerErreur('heure'); creerHeures();
    } else if (champ.name === 'heure') {
      etat.heure = champ.value;
      effacerErreur('heure');
    }
    renseignerResume();
  });
  document.querySelectorAll('[data-suite]').forEach(bouton => bouton.addEventListener('click', () => {
    const etape = Number(bouton.dataset.suite);
    if (etape === 0 && !etat.soin) { erreur('soin', 'Choisissez un soin pour continuer.'); return; }
    if (etape === 1 && !etat.jour) { erreur('jour', 'Choisissez un jour d’ouverture pour continuer.'); return; }
    if (etape === 2 && !etat.heure) { erreur('heure', 'Choisissez une heure de préférence pour continuer.'); return; }
    if (etape === 2 && estPassee(etat.jour, Number(etat.heure))) {
      etat.heure = ''; creerHeures(); renseignerResume(); erreur('heure', 'Cette heure est passée. Choisissez une autre heure.'); return;
    }
    montrerEtape(etape + 1);
  }));
  document.querySelectorAll('[data-retour]').forEach(bouton => bouton.addEventListener('click', () => montrerEtape(Number(bouton.dataset.retour))));
  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => montrerEtape(Number(bouton.dataset.etape))));

  document.querySelectorAll('[data-soin]').forEach(lien => lien.addEventListener('click', () => {
    reinitialiser(false);
    etat.soin = lien.dataset.soin;
    formulaire.querySelector(`[name="soin"][value="${etat.soin}"]`).checked = true;
    renseignerResume();
    montrerEtape(0, false);
  }));

  [prenom, telephone].forEach(champ => champ.addEventListener('input', () => { effacerErreur(champ.name); renseignerResume(); }));
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3) return;
    if (!etat.soin || !etat.jour || !etat.heure) { montrerEtape(0); return; }
    if (estPassee(etat.jour, Number(etat.heure))) {
      etat.heure = ''; creerHeures(); renseignerResume(); montrerEtape(2); erreur('heure', 'Cette heure est passée. Choisissez une autre heure.'); return;
    }
    if (!prenom.value.trim()) { erreur('prenom', 'Indiquez un prénom, réel ou fictif, pour terminer la simulation.'); return; }
    const numero = telephone.value.replace(/[\s.()\-]/g, '');
    if (!/^(?:0[1-9]|(?:\+33|0033)[1-9])\d{8}$/.test(numero)) {
      erreur('telephone', 'Indiquez un numéro français à dix chiffres ou au format international +33.'); return;
    }
    document.getElementById('prenom-resultat').textContent = prenom.value.trim();
    formulaire.hidden = true;
    document.querySelector('.etapes').hidden = true;
    document.getElementById('resultat').hidden = false;
    document.getElementById('titre-resultat').focus({ preventScroll: true });
    annonce.textContent = 'Simulation terminée. Aucun rendez-vous pris et aucune donnée envoyée.';
  });
  function reinitialiser(focus = true) {
    formulaire.reset();
    Object.assign(etat, { soin: '', jour: '', heure: '', etape: 0, atteinte: 0 });
    formulaire.hidden = false;
    document.querySelector('.etapes').hidden = false;
    document.getElementById('resultat').hidden = true;
    document.getElementById('prenom-resultat').textContent = '';
    ['soin', 'jour', 'heure', 'prenom', 'telephone'].forEach(effacerErreur);
    creerJours(); document.getElementById('heures').replaceChildren();
    montrerEtape(0, focus);
  }
  document.getElementById('recommencer').addEventListener('click', () => reinitialiser());
  creerJours();
  carnet.hidden = false;
  renseignerResume();

  // Repli natif vers les deux formules, même sans JavaScript. La destination
  // studio demandée est activée si cette page accompagne l’export de l’aperçu.
  async function preparerLiensStudio() {
    if (window.location.protocol === 'file:') return;
    const liens = [...document.querySelectorAll('[data-page-studio]')];
    const destination = new URL(liens[0].dataset.pageStudio, document.baseURI);
    try {
      const reponse = await fetch(destination.href, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (reponse.ok) liens.forEach(lien => { lien.href = destination.href; });
    } catch { /* Les deux formules locales restent accessibles. */ }
  }
  preparerLiensStudio();
})();
