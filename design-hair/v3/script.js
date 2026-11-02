(() => {
  'use strict';

  const panneau = document.querySelector('.hero');
  const annonce = document.querySelector('[data-booking-live]');
  const barreMobile = document.querySelector('.mobile-bar');
  const zoneSimulation = document.querySelector('#reservation');
  const piedPage = document.querySelector('.footer');
  const boutonMenu = document.querySelector('.nav-toggle');
  const menuPrincipal = document.querySelector('#menu-principal');
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fermerMenu(rendreFocus = false) {
    if (!boutonMenu || !menuPrincipal || boutonMenu.getAttribute('aria-expanded') !== 'true') return;
    boutonMenu.setAttribute('aria-expanded', 'false');
    menuPrincipal.hidden = true;
    if (rendreFocus) boutonMenu.focus();
  }

  if (boutonMenu && menuPrincipal) {
    boutonMenu.addEventListener('click', () => {
      const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
      boutonMenu.setAttribute('aria-expanded', String(!ouvert));
      menuPrincipal.hidden = ouvert;
    });
    menuPrincipal.querySelectorAll('a').forEach(lien => lien.addEventListener('click', () => fermerMenu()));
    document.addEventListener('keydown', evenement => {
      if (evenement.key === 'Escape') fermerMenu(true);
    });
    document.addEventListener('pointerdown', evenement => {
      if (!menuPrincipal.hidden && !menuPrincipal.contains(evenement.target) && evenement.target !== boutonMenu) fermerMenu();
    });
  }

  if (panneau) {
    panneau.classList.add('is-armed');
    requestAnimationFrame(() => requestAnimationFrame(() => panneau.classList.add('is-entered')));
  }

  const cibles = Array.from(document.querySelectorAll('[data-reveal]'));
  const adresse = document.querySelector('.address');
  if (adresse) cibles.push(adresse);
  if ('IntersectionObserver' in window) {
    cibles.forEach(cible => cible.classList.add('is-prepped'));
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-seen');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
    cibles.forEach(cible => observateur.observe(cible));
  }

  if (barreMobile && zoneSimulation && piedPage) {
    const zonesBarre = [zoneSimulation, piedPage];
    barreMobile.classList.add('is-hidden');
    if ('IntersectionObserver' in window) {
      const visibles = new Set();
      const observateurBarre = new IntersectionObserver(entrees => {
        entrees.forEach(entree => {
          if (entree.isIntersecting) visibles.add(entree.target);
          else visibles.delete(entree.target);
        });
        barreMobile.classList.toggle('is-hidden', visibles.size > 0);
      }, { threshold: 0 });
      zonesBarre.forEach(zone => observateurBarre.observe(zone));
    } else {
      let verificationDemandee = false;
      const verifier = () => {
        if (verificationDemandee) return;
        verificationDemandee = true;
        requestAnimationFrame(() => {
          const visibles = zonesBarre.some(zone => {
            const limites = zone.getBoundingClientRect();
            return limites.bottom > 0 && limites.top < window.innerHeight;
          });
          barreMobile.classList.toggle('is-hidden', visibles);
          verificationDemandee = false;
        });
      };
      window.addEventListener('scroll', verifier, { passive: true });
      window.addEventListener('resize', verifier, { passive: true });
      verifier();
    }
  }

  const formulaire = document.querySelector('#booking-form');
  if (!formulaire) {
    window.__siteReady = true;
    return;
  }

  const etapes = Array.from(formulaire.querySelectorAll('.book-step'));
  const listeJours = formulaire.querySelector('[data-date-list]');
  const listeHeures = formulaire.querySelector('[data-time-list]');
  const texteJour = formulaire.querySelector('[data-day-caption]');
  const recap = formulaire.querySelector('[data-recap]');
  const recapSucces = formulaire.querySelector('[data-success-recap]');
  const resumePrestation = document.querySelector('[data-summary-service]');
  const resumeJour = document.querySelector('[data-summary-date]');
  const resumeHeure = document.querySelector('[data-summary-time]');
  const champPrenom = formulaire.querySelector('#prenom');
  const champTelephone = formulaire.querySelector('#telephone');
  const erreurs = {
    prestation: formulaire.querySelector('#service-error'),
    jour: formulaire.querySelector('#date-error'),
    heure: formulaire.querySelector('#time-error'),
    prenom: formulaire.querySelector('#prenom-error'),
    telephone: formulaire.querySelector('#telephone-error')
  };
  const selection = { prestation: null, jour: null, heure: null };
  const datesOuvertes = { 2: true, 3: true, 4: true, 5: true, 6: true };
  let changementEnCours = false;

  function annoncer(texte) {
    if (annonce) annonce.textContent = texte;
  }

  function choisirPrestation(radio) {
    if (!radio) return;
    radio.checked = true;
    selection.prestation = {
      valeur: radio.value,
      nom: radio.dataset.nom,
      duree: Number(radio.dataset.duree)
    };
    resumePrestation.textContent = selection.prestation.nom;
    erreurs.prestation.textContent = '';
    formulaire.querySelectorAll('[name="service"]').forEach(champ => {
      champ.closest('.choice-row').classList.toggle('is-selected', champ.checked);
    });
    mettreAJourRecap();
    dessinerHeures();
  }

  function libelleJour(date) {
    const format = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const texte = format.format(date);
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  }

  function cleDate(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(annee, mois - 1, jour, 12, 0, 0, 0);
  }

  function dessinerJours() {
    if (!listeJours) return;
    listeJours.replaceChildren();
    const maintenant = new Date();
    const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const affichageJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
    const affichageDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdHui);
      date.setDate(aujourdHui.getDate() + decalage);
      const jourSemaine = date.getDay();
      const cle = cleDate(date);
      const ferme = !datesOuvertes[jourSemaine];
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'date-option';
      bouton.dataset.jour = cle;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', ferme ? `${libelleJour(date)}, fermé selon Planity` : `${libelleJour(date)}, jour de démonstration`);
      bouton.disabled = ferme;
      const jour = document.createElement('span');
      jour.textContent = affichageJour.format(date).replace('.', '');
      const dateTexte = document.createElement('small');
      dateTexte.textContent = ferme ? 'Fermé' : affichageDate.format(date).replace('.', '');
      bouton.append(jour, dateTexte);
      if (!ferme) {
        bouton.addEventListener('click', () => choisirJour(cle));
      }
      listeJours.append(bouton);
    }
  }

  function choisirJour(cle) {
    selection.jour = cle;
    selection.heure = null;
    resumeJour.textContent = libelleJour(dateDepuisCle(cle));
    resumeHeure.textContent = 'À choisir';
    listeJours.querySelectorAll('.date-option').forEach(bouton => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.jour === cle));
    });
    erreurs.jour.textContent = '';
    erreurs.heure.textContent = '';
    if (texteJour) texteJour.textContent = `${libelleJour(dateDepuisCle(cle))} · horaires de démonstration, à confirmer`;
    dessinerHeures();
    mettreAJourRecap();
  }

  function dejaPris(cle, minutes) {
    const jourNombre = Number(cle.replaceAll('-', ''));
    return (jourNombre + minutes * 7) % 11 === 0;
  }

  function dessinerHeures() {
    if (!listeHeures) return;
    listeHeures.replaceChildren();
    if (!selection.jour || !selection.prestation) return;
    const maintenant = new Date();
    const aujourdHui = cleDate(new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate()));
    const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
    const duree = selection.prestation.duree;

    for (let minute = 10 * 60; minute + duree <= 20 * 60; minute += 30) {
      const heure = Math.floor(minute / 60);
      const minutes = minute % 60;
      const valeur = `${String(heure).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-option';
      bouton.dataset.heure = valeur;
      bouton.setAttribute('aria-pressed', 'false');
      const libelle = document.createElement('span');
      libelle.textContent = `${heure} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}`;
      bouton.append(libelle);

      const passe = selection.jour === aujourdHui && minute <= minuteActuelle;
      const occupe = !passe && dejaPris(selection.jour, minute);
      if (passe) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${heure} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}, heure passée`);
        const note = document.createElement('small');
        note.textContent = 'Passé';
        bouton.append(note);
      } else if (occupe) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${heure} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}, déjà pris dans cette simulation`);
        const note = document.createElement('small');
        note.textContent = 'Déjà pris · démo';
        bouton.append(note);
      } else {
        bouton.setAttribute('aria-label', `${heure} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}, heure de démonstration`);
        bouton.addEventListener('click', () => choisirHeure(valeur));
      }
      listeHeures.append(bouton);
    }
  }

  function choisirHeure(valeur) {
    selection.heure = valeur;
    resumeHeure.textContent = valeur.replace(':', ' h ');
    listeHeures.querySelectorAll('.time-option').forEach(bouton => {
      bouton.setAttribute('aria-pressed', String(bouton.dataset.heure === valeur));
    });
    erreurs.heure.textContent = '';
    mettreAJourRecap();
  }

  function mettreAJourRecap() {
    if (!recap) return;
    const morceaux = [];
    if (selection.prestation) morceaux.push(selection.prestation.nom);
    if (selection.jour) morceaux.push(libelleJour(dateDepuisCle(selection.jour)));
    if (selection.heure) morceaux.push(selection.heure.replace(':', ' h '));
    recap.textContent = morceaux.length ? morceaux.join(' · ') : 'Votre sélection apparaîtra ici.';
  }

  function afficherEtape(numero) {
    if (changementEnCours) return;
    const precedente = etapes.find(etape => etape.classList.contains('is-current'));
    const suivante = etapes.find(etape => Number(etape.dataset.step) === numero);
    if (!suivante || precedente === suivante) return;
    changementEnCours = true;
    if (precedente) {
      precedente.classList.remove('is-current');
      precedente.classList.add('is-exiting');
    }
    window.setTimeout(() => {
      if (precedente) {
        precedente.hidden = true;
        precedente.classList.remove('is-exiting');
      }
      suivante.hidden = false;
      suivante.classList.add('is-entering');
      requestAnimationFrame(() => {
        suivante.classList.remove('is-entering');
        suivante.classList.add('is-current');
        const titre = suivante.querySelector('h3');
        if (titre) titre.focus({ preventScroll: true });
        suivante.scrollIntoView({ block: 'nearest', behavior: reduireMouvement ? 'auto' : 'smooth' });
        const messages = {
          1: 'Étape 1 sur 4 : choisir une prestation.',
          2: 'Étape 2 sur 4 : choisir un jour.',
          3: 'Étape 3 sur 4 : choisir une heure.',
          4: 'Étape 4 sur 4 : saisir vos coordonnées.',
          5: 'Simulation terminée. Rien n’a été envoyé.'
        };
        annoncer(messages[numero] || 'Étape de démonstration.');
        window.setTimeout(() => { changementEnCours = false; }, 250);
      });
    }, precedente ? 190 : 0);
  }

  function validerEtape(numero) {
    if (numero === 2 && !selection.prestation) {
      erreurs.prestation.textContent = 'Choisissez une prestation pour continuer.';
      formulaire.querySelector('[name="service"]')?.focus();
      return false;
    }
    if (numero === 3 && !selection.jour) {
      erreurs.jour.textContent = 'Choisissez un jour ouvert dans la simulation.';
      listeJours.querySelector('.date-option:not(:disabled)')?.focus();
      return false;
    }
    if (numero === 4 && !selection.heure) {
      erreurs.heure.textContent = 'Choisissez une heure proposée dans la simulation.';
      listeHeures.querySelector('.time-option:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  function effacerErreur(champ, zone) {
    champ.removeAttribute('aria-invalid');
    zone.textContent = '';
  }

  dessinerJours();
  dessinerHeures();

  formulaire.querySelectorAll('[data-next]').forEach(bouton => {
    bouton.addEventListener('click', () => {
      const destination = Number(bouton.dataset.next);
      if (validerEtape(destination)) afficherEtape(destination);
    });
  });
  formulaire.querySelectorAll('[data-back]').forEach(bouton => {
    bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.back)));
  });
  formulaire.querySelectorAll('[name="service"]').forEach(radio => {
    radio.addEventListener('change', () => choisirPrestation(radio));
  });

  document.querySelectorAll('[data-book-service]').forEach(lien => {
    lien.addEventListener('click', () => {
      const radio = formulaire.querySelector(`[name="service"][value="${CSS.escape(lien.dataset.bookService)}"]`);
      if (radio) choisirPrestation(radio);
      afficherEtape(1);
      annoncer('Prestation choisie pour la simulation.');
    });
  });

  champPrenom.addEventListener('input', () => effacerErreur(champPrenom, erreurs.prenom));
  champTelephone.addEventListener('input', () => effacerErreur(champTelephone, erreurs.telephone));
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    const prenom = champPrenom.value.trim();
    const chiffresTelephone = champTelephone.value.replace(/\D/g, '');
    const mobileValide = /^0[67]\d{8}$/.test(chiffresTelephone) || /^33[67]\d{8}$/.test(chiffresTelephone) || /^0033[67]\d{8}$/.test(chiffresTelephone);
    let valide = true;

    if (!prenom) {
      erreurs.prenom.textContent = 'Saisissez votre prénom.';
      champPrenom.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      effacerErreur(champPrenom, erreurs.prenom);
    }
    if (!mobileValide) {
      erreurs.telephone.textContent = 'Saisissez un numéro de mobile français valide.';
      champTelephone.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      effacerErreur(champTelephone, erreurs.telephone);
    }
    if (!valide) {
      (champPrenom.getAttribute('aria-invalid') ? champPrenom : champTelephone).focus();
      return;
    }

    const confirmation = `${prenom} · ${selection.prestation.nom} · ${libelleJour(dateDepuisCle(selection.jour))} à ${selection.heure.replace(':', ' h ')}`;
    recapSucces.textContent = confirmation;
    afficherEtape(5);
  });

  formulaire.querySelector('[data-restart]')?.addEventListener('click', () => {
    formulaire.reset();
    selection.prestation = null;
    selection.jour = null;
    selection.heure = null;
    resumePrestation.textContent = 'À choisir';
    resumeJour.textContent = 'À choisir';
    resumeHeure.textContent = 'À choisir';
    erreurs.prestation.textContent = '';
    erreurs.jour.textContent = '';
    erreurs.heure.textContent = '';
    erreurs.prenom.textContent = '';
    erreurs.telephone.textContent = '';
    dessinerJours();
    dessinerHeures();
    mettreAJourRecap();
    afficherEtape(1);
  });

  window.__siteReady = true;
})();
