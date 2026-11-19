/* S1 l’autre salon : parcours local de préparation d’appel, sans réseau ni stockage. */
(() => {
  'use strict';
  const racine = document.documentElement;
  const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chercher = (selecteur) => document.querySelector(selecteur);
  const tous = (selecteur) => Array.from(document.querySelectorAll(selecteur));
  const panneaux = tous('[data-panneau]');
  const boutonsEtapes = tous('[data-etape]');
  const motifs = tous('input[name="motif"]');
  const prenom = chercher('#prenom');
  const telephone = chercher('#telephone');
  const annonce = chercher('#annonce-parcours');
  const retraits = new Map();
  let etape = 0;
  let etapeAtteinte = 0;
  let motif = '';
  let numeroTransition = 0;
  let clavier = false;

  let indexLettre = 0;
  function preparerLettre(lettre) {
    lettre.classList.add('lettre-manchette');
    lettre.style.transitionDelay = `${indexLettre++ * 18}ms`;
  }
  tous('.manchette-s1 > span').forEach(preparerLettre);
  tous('.manchette-nom > span').forEach((mot) => {
    const texte = mot.textContent;
    mot.textContent = '';
    Array.from(texte).forEach((caractere) => {
      const lettre = document.createElement('span');
      lettre.textContent = caractere;
      preparerLettre(lettre);
      mot.appendChild(lettre);
    });
  });

  document.addEventListener('keydown', () => {
    clavier = true;
    racine.classList.add('au-clavier');
  });
  document.addEventListener('pointerdown', () => {
    clavier = false;
    racine.classList.remove('au-clavier');
  }, { passive: true });

  function actualiserSelection() {
    chercher('#selection-motif').textContent = motif || 'À choisir';
    chercher('#recap-motif').textContent = motif || 'À choisir';
    chercher('#recap-prenom').textContent = prenom.value.trim() || 'À renseigner';
    chercher('#recap-telephone').textContent = telephone.value.trim() || 'À renseigner';
    chercher('#resultat-motif').textContent = motif || 'À choisir';
  }

  function actualiserEtapes() {
    boutonsEtapes.forEach((bouton, index) => {
      bouton.disabled = etape === 3 || index > etapeAtteinte;
      if (index === etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function afficherEtape(prochaine, focaliser = true) {
    if (prochaine < 0 || prochaine > 3) return;
    if (prochaine >= 2) {
      if (!motif) { afficherEtape(0); return; }
      const prenomValide = validerPrenom();
      const telephoneValide = validerTelephone();
      if (!prenomValide || !telephoneValide) {
        afficherEtape(1, false);
        (prenomValide ? telephone : prenom).focus();
        return;
      }
    }
    const ancien = panneaux[etape];
    const nouveau = panneaux[prochaine];
    const numero = ++numeroTransition;
    const instantane = reduction.matches || clavier;
    etape = prochaine;
    etapeAtteinte = Math.max(etapeAtteinte, Math.min(prochaine, 2));
    panneaux.forEach((panneau) => {
      clearTimeout(retraits.get(panneau));
      panneau.inert = panneau !== nouveau;
      panneau.setAttribute('aria-hidden', String(panneau !== nouveau));
      if (panneau !== nouveau) {
        panneau.classList.remove('actif');
        if (instantane || panneau !== ancien) panneau.hidden = true;
        else retraits.set(panneau, setTimeout(() => { if (panneau !== panneaux[etape]) panneau.hidden = true; }, 250));
      }
    });
    nouveau.hidden = false;
    nouveau.inert = false;
    if (instantane) nouveau.classList.add('actif');
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      if (numero === numeroTransition) nouveau.classList.add('actif');
    }));
    actualiserEtapes();
    actualiserSelection();
    const titre = nouveau.querySelector('h3');
    annonce.textContent = prochaine === 3 ? 'Simulation terminée. Rien n’a été envoyé.' : `Étape ${prochaine + 1} sur 3 : ${titre.textContent}`;
    if (focaliser) titre.focus();
  }

  function erreur(champ, identifiant, message) {
    chercher(identifiant).textContent = message;
    if (message) champ.setAttribute('aria-invalid', 'true');
    else champ.removeAttribute('aria-invalid');
  }

  function validerPrenom() {
    const valeur = prenom.value.trim();
    const valide = valeur.length >= 2 && /\p{L}/u.test(valeur);
    erreur(prenom, '#erreur-prenom', valide ? '' : 'Indiquez votre prénom, avec au moins deux caractères.');
    return valide;
  }

  function validerTelephone() {
    const valeur = telephone.value.replace(/[\s.()\-]/g, '');
    const valide = /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(valeur);
    erreur(telephone, '#erreur-telephone', valide ? '' : 'Indiquez un numéro français de dix chiffres, ou avec +33.');
    return valide;
  }

  motifs.forEach((radio) => {
    radio.setAttribute('aria-describedby', 'erreur-motif');
    radio.addEventListener('change', () => {
      motif = radio.value;
      chercher('#erreur-motif').textContent = '';
      motifs.forEach((element) => element.removeAttribute('aria-invalid'));
      actualiserSelection();
      annonce.textContent = `Motif sélectionné : ${motif}.`;
    });
  });

  chercher('#suite-motif').addEventListener('click', () => {
    if (!motif) {
      chercher('#erreur-motif').textContent = 'Choisissez un motif pour continuer cet essai.';
      motifs.forEach((radio) => radio.setAttribute('aria-invalid', 'true'));
      motifs[0].focus();
      return;
    }
    afficherEtape(1);
  });

  chercher('#formulaire-coordonnees').addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    afficherEtape(2);
  });
  [prenom, telephone].forEach((champ) => champ.addEventListener('input', () => {
    etapeAtteinte = Math.min(etapeAtteinte, 1);
    actualiserEtapes();
    actualiserSelection();
  }));
  prenom.addEventListener('blur', () => { if (prenom.value || prenom.hasAttribute('aria-invalid')) validerPrenom(); });
  telephone.addEventListener('blur', () => { if (telephone.value || telephone.hasAttribute('aria-invalid')) validerTelephone(); });

  boutonsEtapes.forEach((bouton, index) => bouton.addEventListener('click', () => {
    if (index <= etapeAtteinte) afficherEtape(index);
  }));
  tous('[data-retour]').forEach((bouton) => bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.retour))));
  chercher('#terminer').addEventListener('click', () => afficherEtape(3));

  chercher('#recommencer').addEventListener('click', () => {
    motif = '';
    motifs.forEach((radio) => { radio.checked = false; radio.removeAttribute('aria-invalid'); });
    chercher('#formulaire-coordonnees').reset();
    erreur(prenom, '#erreur-prenom', '');
    erreur(telephone, '#erreur-telephone', '');
    chercher('#erreur-motif').textContent = '';
    etapeAtteinte = 0;
    afficherEtape(0);
  });

  tous('[data-motif]').forEach((lien) => lien.addEventListener('click', () => {
    motif = lien.dataset.motif;
    motifs.forEach((radio) => { radio.checked = radio.value === motif; });
    chercher('#erreur-motif').textContent = '';
    motifs.forEach((radio) => radio.removeAttribute('aria-invalid'));
    etapeAtteinte = 0;
    afficherEtape(0, false);
  }));

  panneaux.forEach((panneau, index) => {
    panneau.inert = index !== 0;
    panneau.setAttribute('aria-hidden', String(index !== 0));
  });
  chercher('#application-rdv').hidden = false;
  chercher('#sans-script').hidden = true;

  // Le contenu n’est masqué qu’après installation complète de son observateur.
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('vu');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    tous('[data-revelation]').forEach((element) => observateur.observe(element));
    const barre = chercher('.barre-mobile');
    const zones = new Set();
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) zones.add(entree.target);
        else zones.delete(entree.target);
      });
      barre.classList.toggle('masquee', zones.size > 0);
    }, { threshold: 0 });
    observateurBarre.observe(chercher('#reserver'));
    observateurBarre.observe(chercher('#sources'));
  } else tous('[data-revelation]').forEach((element) => element.classList.add('vu'));

  racine.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret')));
})();
