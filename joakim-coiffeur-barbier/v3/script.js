document.documentElement.classList.add('js');

(() => {
  const corps = document.body;
  const boutonSommaire = document.querySelector('[data-bouton-sommaire]');
  const sommaire = document.querySelector('#sommaire');
  const requeteMobile = window.matchMedia('(max-width: 900px)');

  function fermerSommaire(rendreFocus = false) {
    if (!boutonSommaire || !sommaire) return;
    boutonSommaire.setAttribute('aria-expanded', 'false');
    boutonSommaire.setAttribute('aria-label', 'Ouvrir le sommaire');
    boutonSommaire.querySelector('span:first-child').textContent = 'Sommaire';
    boutonSommaire.querySelector('.entete__signe').textContent = '＋';
    sommaire.removeAttribute('data-ouvert');
    window.setTimeout(() => {
      if (boutonSommaire.getAttribute('aria-expanded') === 'false' && requeteMobile.matches) {
        sommaire.hidden = true;
      }
    }, 180);
    if (rendreFocus) boutonSommaire.focus();
  }

  function ouvrirSommaire() {
    if (!boutonSommaire || !sommaire) return;
    sommaire.hidden = false;
    boutonSommaire.setAttribute('aria-expanded', 'true');
    boutonSommaire.setAttribute('aria-label', 'Fermer le sommaire');
    boutonSommaire.querySelector('span:first-child').textContent = 'Fermer';
    boutonSommaire.querySelector('.entete__signe').textContent = '−';
    requestAnimationFrame(() => sommaire.setAttribute('data-ouvert', 'oui'));
    window.setTimeout(() => sommaire.querySelector('a')?.focus(), 30);
  }

  function adapterSommaire() {
    if (!sommaire || !boutonSommaire) return;
    if (requeteMobile.matches) {
      if (boutonSommaire.getAttribute('aria-expanded') !== 'true') sommaire.hidden = true;
    } else {
      sommaire.hidden = false;
      sommaire.setAttribute('data-ouvert', 'oui');
      boutonSommaire.setAttribute('aria-expanded', 'false');
      boutonSommaire.querySelector('span:first-child').textContent = 'Sommaire';
      boutonSommaire.querySelector('.entete__signe').textContent = '＋';
    }
  }

  if (boutonSommaire && sommaire) {
    boutonSommaire.addEventListener('click', () => {
      if (boutonSommaire.getAttribute('aria-expanded') === 'true') fermerSommaire();
      else ouvrirSommaire();
    });
    sommaire.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a') && requeteMobile.matches) fermerSommaire();
    });
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && boutonSommaire.getAttribute('aria-expanded') === 'true') fermerSommaire(true);
    });
    requeteMobile.addEventListener?.('change', adapterSommaire);
    adapterSommaire();
  }

  const elementsAReveler = document.querySelectorAll('.reveal, .signature, .adresse');
  document.querySelectorAll('.etapes-visite__ligne').forEach((element, index) => {
    element.style.transitionDelay = `${index * 55}ms`;
  });
  document.querySelectorAll('.prestation').forEach((element, index) => {
    element.style.transitionDelay = `${index * 60}ms`;
  });

  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, observer) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observer.unobserve(entree.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    elementsAReveler.forEach((element) => observateur.observe(element));
  } else {
    elementsAReveler.forEach((element) => element.classList.add('is-visible'));
  }

  const simulation = document.querySelector('[data-simulation]');
  const formulaire = document.querySelector('#formulaire-reservation');

  if (simulation && formulaire) {
    const prestations = {
      coupe: { nom: 'Shampoing + Coupe + Séchage', duree: 25 },
      taper: { nom: 'Taper', duree: 25 },
      barbe: { nom: 'Service Traditionnel', duree: 25 },
      'coupe-barbe': { nom: 'Coupe homme + Barbe Service Traditionnel', duree: 50 }
    };
    const horaires = {
      1: { ouverture: 13 * 60 + 30, fermeture: 19 * 60 },
      2: { ouverture: 9 * 60, fermeture: 19 * 60 },
      3: { ouverture: 9 * 60, fermeture: 19 * 60 },
      4: { ouverture: 9 * 60, fermeture: 19 * 60 },
      5: { ouverture: 9 * 60, fermeture: 19 * 60 }
    };
    const etat = { etape: 1, maximum: 1, prestation: '', jour: '', heure: '', prenom: '', telephone: '' };
    const panneaux = [...simulation.querySelectorAll('[data-panneau]')];
    const boutonsEtapes = [...simulation.querySelectorAll('[data-aller-etape]')];
    const annonce = simulation.querySelector('#annonce-reservation');
    const champPrenom = simulation.querySelector('#prenom');
    const champTelephone = simulation.querySelector('#telephone');
    let enTransition = false;

    function heureEnTexte(minutes) {
      const heures = Math.floor(minutes / 60);
      const reste = minutes % 60;
      return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, '0')}`;
    }

    function dateLocale(date) {
      const annee = date.getFullYear();
      const mois = String(date.getMonth() + 1).padStart(2, '0');
      const jour = String(date.getDate()).padStart(2, '0');
      return `${annee}-${mois}-${jour}`;
    }

    function lireDate(iso) {
      const [annee, mois, jour] = iso.split('-').map(Number);
      return new Date(annee, mois - 1, jour, 12);
    }

    function jourComplet(date) {
      return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    }

    function jourCourt(date) {
      return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date).replace(/\.$/, '');
    }

    function prestationChoisie() {
      return prestations[etat.prestation] || null;
    }

    function mettreAJourResume() {
      const prestation = prestationChoisie();
      const jour = etat.jour ? jourComplet(lireDate(etat.jour)) : '';
      const resumePrestation = simulation.querySelector('[data-resume-prestation]');
      const resumeJour = simulation.querySelector('[data-resume-jour]');
      const resumeHeure = simulation.querySelector('[data-resume-heure]');

      resumePrestation.textContent = prestation ? prestation.nom : 'Aucune prestation choisie.';
      resumeJour.textContent = jour || 'Aucun jour choisi.';
      resumeHeure.textContent = etat.heure ? `Vers ${etat.heure}.` : 'Aucune heure choisie.';

      if (prestation && jour && etat.heure) {
        const recap = `${prestation.nom} · ${jour} · ${etat.heure}`;
        simulation.querySelector('[data-recap-final]').textContent = recap;
        simulation.querySelector('[data-recap-succes]').textContent = recap;
      } else {
        simulation.querySelector('[data-recap-final]').textContent = '';
      }
    }

    function annoncerEtape() {
      const noms = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
      if (etat.etape === 5) {
        annonce.textContent = 'Simulation terminée. Aucune demande n’a été envoyée au salon.';
        return;
      }
      annonce.textContent = `Étape ${etat.etape} sur 4 : ${noms[etat.etape]}.`;
    }

    function actualiserEtapes() {
      boutonsEtapes.forEach((bouton) => {
        const numero = Number(bouton.dataset.allerEtape);
        bouton.disabled = numero > etat.maximum;
        if (numero === etat.etape) bouton.setAttribute('aria-current', 'step');
        else bouton.removeAttribute('aria-current');
      });
    }

    function afficherPanneau(numero, deplacerFocus = true) {
      const cible = panneaux.find((panneau) => Number(panneau.dataset.panneau) === numero);
      if (!cible) return;
      const actif = panneaux.find((panneau) => !panneau.hidden);
      if (actif === cible) {
        etat.etape = numero;
        actualiserEtapes();
        annoncerEtape();
        if (deplacerFocus) cible.querySelector('h3')?.focus({ preventScroll: true });
        return;
      }
      if (enTransition) return;
      enTransition = true;
      if (actif) {
        actif.classList.add('is-sortant');
        window.setTimeout(() => {
          actif.hidden = true;
          actif.classList.remove('is-sortant');
          cible.hidden = false;
          cible.classList.add('is-entrant');
          requestAnimationFrame(() => {
            cible.classList.remove('is-entrant');
            etat.etape = numero;
            actualiserEtapes();
            annoncerEtape();
            if (deplacerFocus) cible.querySelector('h3')?.focus({ preventScroll: true });
            enTransition = false;
          });
        }, 180);
      }
    }

    function rendreJours() {
      const destination = simulation.querySelector('[data-jours]');
      const maintenant = new Date();
      const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 12);
      const jours = [];

      for (let index = 0; index < 14; index += 1) {
        const date = new Date(debut);
        date.setDate(debut.getDate() + index);
        jours.push(date);
      }

      destination.innerHTML = jours.map((date, index) => {
        const iso = dateLocale(date);
        const ouvert = Boolean(horaires[date.getDay()]);
        const etatJour = ouvert ? 'Ouvert' : 'Fermé';
        const libelle = `${jourComplet(date)}, ${ouvert ? 'ouvert selon Planity, horaires à confirmer' : 'fermé selon Planity'}${index === 0 ? ', aujourd’hui' : ''}`;
        return `<label class="jour"><input type="radio" name="jour" value="${iso}" aria-label="${libelle}"${ouvert ? '' : ' disabled'}><span><span class="jour__nom">${jourCourt(date)}</span><time class="jour__date" datetime="${iso}">${date.getDate()}</time><span class="jour__etat">${etatJour}</span></span></label>`;
      }).join('');

      destination.querySelectorAll('input[name="jour"]').forEach((champ) => {
        champ.addEventListener('change', () => {
          etat.jour = champ.value;
          etat.heure = '';
          rendreHeures();
          mettreAJourResume();
          actualiserEtapes();
        });
      });
    }

    function hashTexte(texte) {
      let valeur = 0;
      for (const caractere of texte) valeur = (valeur * 31 + caractere.charCodeAt(0)) >>> 0;
      return valeur;
    }

    function rendreHeures() {
      const destination = simulation.querySelector('[data-heures]');
      const date = etat.jour ? lireDate(etat.jour) : null;
      const plage = date ? horaires[date.getDay()] : null;
      const prestation = prestationChoisie();
      if (!plage || !prestation) {
        destination.innerHTML = '<p class="aucun-creneau">Choisissez d’abord un jour et une prestation.</p>';
        return;
      }

      const maintenant = new Date();
      const aujourdhui = dateLocale(maintenant) === etat.jour;
      const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
      const premiereHeure = aujourdhui ? Math.ceil(minuteActuelle / 30) * 30 : plage.ouverture;
      const graine = hashTexte(etat.jour);
      const creneaux = [];

      for (let minute = Math.max(plage.ouverture, premiereHeure); minute + prestation.duree <= plage.fermeture; minute += 30) {
        const ecoule = aujourdhui && minute < minuteActuelle;
        const simuleIndisponible = (Math.floor(minute / 30) + graine) % 9 === 0;
        creneaux.push({ minute, ecoule, simuleIndisponible });
      }

      const libres = creneaux.filter((creneau) => !creneau.ecoule && !creneau.simuleIndisponible);
      if (libres.length === 0 && creneaux.length > 0) libres.push(creneaux[0]);
      const minutesLibres = new Set(libres.map((creneau) => creneau.minute));

      if (creneaux.length === 0) {
        destination.innerHTML = '<p class="aucun-creneau">Aucun créneau de démonstration ne reste sur cette journée.</p>';
        return;
      }

      destination.innerHTML = creneaux.map((creneau) => {
        const heure = heureEnTexte(creneau.minute);
        const libre = minutesLibres.has(creneau.minute);
        const raison = creneau.ecoule ? 'créneau passé' : (libre ? 'créneau de démonstration disponible' : 'créneau indisponible dans cette simulation');
        const iso = `${String(Math.floor(creneau.minute / 60)).padStart(2, '0')}:${String(creneau.minute % 60).padStart(2, '0')}`;
        return `<label class="heure"><input type="radio" name="heure" value="${iso}" aria-label="${heure}, ${raison}"${libre ? '' : ' disabled'}><span>${heure}</span></label>`;
      }).join('');

      destination.querySelectorAll('input[name="heure"]').forEach((champ) => {
        champ.addEventListener('change', () => {
          etat.heure = heureEnTexte(Number(champ.value.slice(0, 2)) * 60 + Number(champ.value.slice(3, 5)));
          mettreAJourResume();
          actualiserEtapes();
        });
      });
    }

    function texteErreur(selecteur, message) {
      const cible = simulation.querySelector(selecteur);
      if (cible) cible.textContent = message;
    }

    function validerEtape(numero) {
      if (numero === 1 && !etat.prestation) {
        texteErreur('[data-erreur-prestation]', 'Choisissez une prestation pour continuer.');
        return false;
      }
      if (numero === 2 && !etat.jour) {
        texteErreur('[data-erreur-jour]', 'Choisissez un jour ouvert pour la simulation.');
        return false;
      }
      if (numero === 3 && !etat.heure) {
        texteErreur('[data-erreur-heure]', 'Choisissez une heure disponible dans la simulation.');
        return false;
      }
      return true;
    }

    function continuer() {
      const numero = etat.etape;
      if (!validerEtape(numero)) {
        const cible = simulation.querySelector(`[data-erreur-${numero === 1 ? 'prestation' : numero === 2 ? 'jour' : 'heure'}]`);
        cible?.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (numero === 1) {
        etat.maximum = Math.max(etat.maximum, 2);
        afficherPanneau(2);
      } else if (numero === 2) {
        etat.maximum = Math.max(etat.maximum, 3);
        afficherPanneau(3);
      } else if (numero === 3) {
        etat.maximum = Math.max(etat.maximum, 4);
        mettreAJourResume();
        afficherPanneau(4);
      }
    }

    simulation.querySelectorAll('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', continuer));
    simulation.querySelectorAll('[data-precedent]').forEach((bouton) => bouton.addEventListener('click', () => {
      if (etat.etape > 1) afficherPanneau(etat.etape - 1);
    }));

    boutonsEtapes.forEach((bouton) => bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.allerEtape);
      if (!bouton.disabled) afficherPanneau(numero);
    }));

    formulaire.querySelectorAll('input[name="prestation"]').forEach((champ) => {
      champ.addEventListener('change', () => {
        etat.prestation = champ.value;
        etat.jour = '';
        etat.heure = '';
        texteErreur('[data-erreur-prestation]', '');
        mettreAJourResume();
        rendreHeures();
      });
    });

    function effacerErreursCoordonnees() {
      texteErreur('[data-erreur-prenom]', '');
      texteErreur('[data-erreur-telephone]', '');
      texteErreur('[data-erreur-coordonnees]', '');
      champPrenom.removeAttribute('aria-invalid');
      champTelephone.removeAttribute('aria-invalid');
    }

    champPrenom.addEventListener('input', effacerErreursCoordonnees);
    champTelephone.addEventListener('input', effacerErreursCoordonnees);

    formulaire.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      effacerErreursCoordonnees();
      const prenom = champPrenom.value.trim();
      const telephone = champTelephone.value.trim();
      const telephoneCompact = telephone.replace(/[\s().-]/g, '');
      const mobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephoneCompact);

      if (!prenom) {
        texteErreur('[data-erreur-prenom]', 'Indiquez votre prénom.');
        champPrenom.setAttribute('aria-invalid', 'true');
        champPrenom.focus();
        return;
      }
      if (!mobileValide) {
        texteErreur('[data-erreur-telephone]', 'Saisissez un numéro mobile français commençant par 06, 07, +336 ou +337.');
        champTelephone.setAttribute('aria-invalid', 'true');
        champTelephone.focus();
        return;
      }

      etat.prenom = prenom;
      etat.telephone = telephone;
      mettreAJourResume();
      etat.maximum = 5;
      afficherPanneau(5);
    });

    document.querySelectorAll('[data-preselection]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const valeur = lien.dataset.preselection;
        const champ = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
        if (!champ) return;
        champ.checked = true;
        champ.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    rendreJours();
    rendreHeures();
    mettreAJourResume();
    actualiserEtapes();
    panneaux.forEach((panneau) => {
      panneau.hidden = Number(panneau.dataset.panneau) !== 1;
    });
    simulation.dataset.initialisee = 'oui';
    annoncerEtape();
  }

  requestAnimationFrame(() => corps.classList.add('pret'));
})();
