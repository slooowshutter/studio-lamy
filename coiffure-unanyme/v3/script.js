(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const horaires = {
    0: null,
    1: null,
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 18 * 60]
  };

  racine.classList.add('js');

  const attendre = (temps) => new Promise((resoudre) => window.setTimeout(resoudre, temps));
  const elements = (selecteur, parent = doc) => [...parent.querySelectorAll(selecteur)];

  function revelerHero() {
    const cadre = doc.querySelector('.hero-cadre');
    const morceaux = elements('[data-entree]', doc.querySelector('.hero-composition'));
    const entete = doc.querySelector('.hero-entete');
    if (!('IntersectionObserver' in window)) {
      racine.classList.remove('js');
      return;
    }
    requestAnimationFrame(() => {
      cadre?.classList.add('est-visible');
      const sequence = [...(entete ? [entete] : []), ...morceaux];
      sequence.forEach((morceau, index) => {
        window.setTimeout(() => morceau.classList.add('est-visible'), 55 + index * 72);
      });
    });
  }

  function revelerAffiches() {
    const affiches = elements('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      racine.classList.remove('js');
      return;
    }
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-visible');
        const numero = entree.target.querySelector('[data-compte]');
        if (numero) compterUneFois(numero);
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    affiches.forEach((affiche) => observateur.observe(affiche));
    window.setTimeout(() => affiches.forEach((affiche) => affiche.classList.add('est-visible')), 2600);
  }

  const nombresComptes = new WeakSet();
  function compterUneFois(element) {
    if (nombresComptes.has(element)) return;
    nombresComptes.add(element);
    const cible = Number(element.dataset.compte);
    if (mouvementReduit) {
      element.textContent = String(cible).padStart(2, '0');
      return;
    }
    const debut = performance.now();
    const duree = 360;
    element.textContent = '00';
    function avancer(maintenant) {
      const progression = Math.min(1, (maintenant - debut) / duree);
      const valeur = Math.floor(cible * progression);
      element.textContent = String(valeur).padStart(2, '0');
      if (progression < 1) requestAnimationFrame(avancer);
    }
    requestAnimationFrame(avancer);
  }

  function reglerBarreMobile() {
    const barre = doc.querySelector('.barre-mobile');
    if (!barre || !('IntersectionObserver' in window)) return;
    const zones = [doc.querySelector('#rendez-vous'), doc.querySelector('.pied-page')].filter(Boolean);
    const zonesVisibles = new Set();
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) zonesVisibles.add(entree.target);
        else zonesVisibles.delete(entree.target);
      });
      const masquer = zonesVisibles.size > 0;
      barre.classList.toggle('est-masquee', masquer);
      barre.inert = masquer;
      barre.setAttribute('aria-hidden', String(masquer));
    }, { threshold: 0.02 });
    zones.forEach((zone) => observateur.observe(zone));
  }

  revelerHero();
  revelerAffiches();
  reglerBarreMobile();

  const simulation = doc.querySelector('.simulation');
  if (!simulation) return;

  const formulaire = simulation.querySelector('.formulaire-demo');
  const etapes = elements('[data-etape]', simulation);
  const succes = simulation.querySelector('[data-succes]');
  const annonce = simulation.querySelector('[data-annonce]');
  const casesPrestation = elements('input[name="prestation"]', simulation);
  const conteneurJours = simulation.querySelector('[data-jours]');
  const conteneurHeures = simulation.querySelector('[data-heures]');
  const recapPrestation = simulation.querySelector('[data-recap-service]');
  const recapJour = simulation.querySelector('[data-recap-date]');
  const recapHeure = simulation.querySelector('[data-recap-heure]');
  const champPrenom = simulation.querySelector('#nom-demo');
  const champTelephone = simulation.querySelector('#telephone-demo');
  const boutonsModifier = elements('[data-modifier]', simulation);
  const etat = { prestation: null, duree: 0, jour: null, libelleJour: null, heure: null, etape: 1, transition: false };

  function morceauxDateParis(date = new Date()) {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(morceaux.filter((partie) => partie.type !== 'literal').map((partie) => [partie.type, Number(partie.value)]));
  }

  function cleDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function libelleDate(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(date);
  }

  function actualiserRecap() {
    recapPrestation.textContent = etat.prestation || 'Choisissez une prestation';
    recapJour.textContent = etat.libelleJour || 'Choisissez un jour';
    recapHeure.textContent = etat.heure ? `À ${etat.heure}` : 'Choisissez une heure';
    boutonsModifier.forEach((bouton) => {
      const numero = Number(bouton.dataset.modifier);
      bouton.disabled = (numero === 2 && !etat.jour) || (numero === 3 && !etat.heure);
    });
  }

  function annoncerEtape(numero) {
    const noms = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
    if (annonce) annonce.textContent = `Étape ${numero} sur 4 · ${noms[numero - 1]}`;
  }

  async function afficherEtape(numero, panneauCible = null) {
    if (etat.transition) return;
    const actuelle = etapes.find((etape) => !etape.hidden) || succes;
    const suivante = panneauCible || etapes.find((etape) => Number(etape.dataset.etape) === numero);
    if (!suivante || actuelle === suivante) return;
    etat.transition = true;
    suivante.hidden = false;
    suivante.classList.add('entree');
    suivante.setAttribute('aria-hidden', 'false');
    if (actuelle) {
      actuelle.classList.add('sortie');
      actuelle.setAttribute('aria-hidden', 'true');
    }
    requestAnimationFrame(() => suivante.classList.remove('entree'));
    await attendre(mouvementReduit ? 0 : 230);
    if (actuelle) {
      actuelle.hidden = true;
      actuelle.classList.remove('sortie');
    }
    etat.etape = numero;
    etat.transition = false;
    if (numero <= 4) annoncerEtape(numero);
    const titre = suivante.querySelector('h3');
    titre?.focus();
  }

  function creerJours() {
    if (!conteneurJours) return;
    conteneurJours.replaceChildren();
    const maintenant = morceauxDateParis();
    const depart = new Date(Date.UTC(maintenant.year, maintenant.month - 1, maintenant.day, 12));
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(depart.getTime() + index * 86400000);
      const cle = cleDate(date);
      const jourSemaine = date.getUTCDay();
      const estOuvert = horaires[jourSemaine] !== null;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.jour = cle;
      bouton.disabled = !estOuvert;
      bouton.setAttribute('aria-pressed', 'false');
      const nom = doc.createElement('span');
      nom.textContent = libelleDate(date, { weekday: 'short' }).replace('.', '');
      const quantieme = doc.createElement('small');
      quantieme.textContent = libelleDate(date, { day: 'numeric', month: 'short' }).replace('.', '');
      bouton.append(nom, quantieme);
      bouton.setAttribute('aria-label', estOuvert ? libelleDate(date) : `${libelleDate(date)}, fermé`);
      if (!estOuvert) {
        const ferme = doc.createElement('small');
        ferme.textContent = 'Fermé';
        bouton.append(ferme);
      }
      bouton.addEventListener('click', () => {
        elements('.jour', conteneurJours).forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
        etat.jour = cle;
        etat.libelleJour = libelleDate(date);
        etat.heure = null;
        actualiserRecap();
        dessinerHeures();
        viderErreur('jour');
      });
      conteneurJours.append(bouton);
    }
  }

  function estPrisDeFaconStable(cle, index) {
    const somme = cle.split('').reduce((total, caractere) => total + caractere.charCodeAt(0), 0);
    return (somme + index * 7) % 13 === 4 || (somme + index * 5) % 23 === 9;
  }

  function creerHeure(heure, minute) {
    return `${String(heure).padStart(2, '0')} h ${String(minute).padStart(2, '0')}`;
  }

  function minuteParis() {
    const maintenant = morceauxDateParis();
    return maintenant.hour * 60 + maintenant.minute;
  }

  function dessinerHeures() {
    if (!conteneurHeures || !etat.jour) return;
    conteneurHeures.replaceChildren();
    const date = dateDepuisCle(etat.jour);
    const plages = horaires[date.getUTCDay()];
    if (!plages || !etat.duree) return;
    const [ouverture, fermeture] = plages;
    const estAujourdHui = etat.jour === cleDate((() => {
      const maintenant = morceauxDateParis();
      return new Date(Date.UTC(maintenant.year, maintenant.month - 1, maintenant.day, 12));
    })());
    let index = 0;
    for (let instant = ouverture; instant + etat.duree <= fermeture; instant += 30, index += 1) {
      const heure = Math.floor(instant / 60);
      const minute = instant % 60;
      const libelle = creerHeure(heure, minute);
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      bouton.dataset.heure = libelle;
      bouton.setAttribute('aria-pressed', 'false');
      const passe = estAujourdHui && instant <= minuteParis();
      const pris = estPrisDeFaconStable(etat.jour, index);
      bouton.disabled = passe || pris;
      const texte = doc.createElement('span');
      texte.textContent = libelle;
      bouton.append(texte);
      bouton.setAttribute('aria-label', `${libelle}${passe ? ', passé' : pris ? ', déjà pris dans cette démonstration' : ''}`);
      if (passe || pris) {
        const detail = doc.createElement('small');
        detail.textContent = passe ? 'Passé' : 'Déjà pris';
        bouton.append(detail);
      }
      bouton.addEventListener('click', () => {
        elements('.heure', conteneurHeures).forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
        etat.heure = libelle;
        actualiserRecap();
        viderErreur('heure');
      });
      conteneurHeures.append(bouton);
    }
  }

  function viderErreur(nom) {
    const cible = simulation.querySelector(`[data-erreur-${nom}]`);
    if (cible) cible.textContent = '';
    if (nom === 'nom') champPrenom?.removeAttribute('aria-invalid');
    if (nom === 'telephone') champTelephone?.removeAttribute('aria-invalid');
  }

  function choisirPrestation(nom) {
    const radio = casesPrestation.find((element) => element.value === nom);
    if (!radio) return;
    radio.checked = true;
    etat.prestation = radio.value;
    etat.duree = Number(radio.dataset.duree);
    etat.jour = null;
    etat.libelleJour = null;
    etat.heure = null;
    elements('.jour', conteneurJours).forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
    actualiserRecap();
    dessinerHeures();
  }

  casesPrestation.forEach((radio) => radio.addEventListener('change', () => {
    etat.prestation = radio.value;
    etat.duree = Number(radio.dataset.duree);
    etat.jour = null;
    etat.libelleJour = null;
    etat.heure = null;
    elements('.jour', conteneurJours).forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
    actualiserRecap();
    viderErreur('service');
  }));

  elements('[data-suite]', simulation).forEach((bouton) => bouton.addEventListener('click', async () => {
    const suivante = Number(bouton.dataset.suite);
    if (suivante === 2 && !etat.prestation) {
      simulation.querySelector('[data-erreur-service]').textContent = 'Choisissez une prestation pour continuer.';
      return;
    }
    if (suivante === 3 && !etat.jour) {
      simulation.querySelector('[data-erreur-jour]').textContent = 'Choisissez un jour ouvert pour continuer.';
      return;
    }
    if (suivante === 3) dessinerHeures();
    if (suivante === 4 && !etat.heure) {
      simulation.querySelector('[data-erreur-heure]').textContent = 'Choisissez une heure disponible dans cette démonstration.';
      return;
    }
    await afficherEtape(suivante);
  }));

  elements('[data-retour]', simulation).forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.retour))));
  boutonsModifier.forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.modifier))));

  elements('[data-preselection]').forEach((bouton) => bouton.addEventListener('click', () => {
    choisirPrestation(bouton.dataset.preselection);
    afficherEtape(1);
    const destination = simulation.querySelector('#etape-service');
    destination?.scrollIntoView({ behavior: mouvementReduit ? 'auto' : 'smooth', block: 'center' });
  }));

  formulaire.addEventListener('submit', async (evenement) => {
    evenement.preventDefault();
    viderErreur('nom');
    viderErreur('telephone');
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    let valide = true;
    if (!prenom) {
      simulation.querySelector('[data-erreur-nom]').textContent = 'Saisissez votre prénom pour voir le récapitulatif.';
      champPrenom.setAttribute('aria-invalid', 'true');
      valide = false;
    }
    const telephoneNettoye = telephone.replace(/[\s().-]/g, '');
    if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(telephoneNettoye)) {
      simulation.querySelector('[data-erreur-telephone]').textContent = 'Saisissez un numéro de mobile français valide.';
      champTelephone.setAttribute('aria-invalid', 'true');
      valide = false;
    }
    if (!valide) {
      (champPrenom.getAttribute('aria-invalid') ? champPrenom : champTelephone).focus();
      return;
    }
    const texteSucces = simulation.querySelector('[data-texte-succes]');
    texteSucces.textContent = `${prenom}, la démonstration affiche ${etat.prestation.toLowerCase()} le ${etat.libelleJour} à ${etat.heure}.`;
    await afficherEtape(5, succes);
    if (annonce) annonce.textContent = 'Démonstration terminée. Aucun rendez-vous n’a été pris.';
  });

  simulation.querySelector('[data-recommencer]')?.addEventListener('click', async () => {
    formulaire.reset();
    etat.prestation = null;
    etat.duree = 0;
    etat.jour = null;
    etat.libelleJour = null;
    etat.heure = null;
    actualiserRecap();
    viderErreur('service');
    viderErreur('jour');
    viderErreur('heure');
    viderErreur('nom');
    viderErreur('telephone');
    elements('.jour', conteneurJours).forEach((jour) => jour.setAttribute('aria-pressed', 'false'));
    conteneurHeures.replaceChildren();
    await afficherEtape(1);
  });

  actualiserRecap();
  creerJours();
  etapes.forEach((etape, index) => {
    etape.hidden = index !== 0;
    etape.setAttribute('aria-hidden', String(index !== 0));
  });
  if (succes) succes.hidden = true;
  annoncerEtape(1);
})();
