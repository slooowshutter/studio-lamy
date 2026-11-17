(() => {
  const menu = document.querySelector('.bouton-menu');
  const navigation = document.querySelector('#navigation');

  if (menu && navigation) {
    menu.addEventListener('click', () => {
      const ouvert = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!ouvert));
      menu.querySelector('span').textContent = ouvert ? '＋' : '−';
      navigation.classList.toggle('navigation--visible', !ouvert);
      if (!ouvert) navigation.querySelector('a').focus();
    });

    navigation.addEventListener('click', (evenement) => {
      const lien = evenement.target.closest('a');
      if (!lien) return;
      menu.setAttribute('aria-expanded', 'false');
      menu.querySelector('span').textContent = '＋';
      navigation.classList.remove('navigation--visible');
      const destination = document.querySelector(lien.getAttribute('href'));
      const titre = destination && (destination.querySelector('h1, h2, h3') || destination);
      if (titre) {
        if (!titre.matches('a, button, input, select, textarea, [tabindex]')) titre.setAttribute('tabindex', '-1');
        titre.focus({ preventScroll: true });
      }
    });

    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        menu.setAttribute('aria-expanded', 'false');
        menu.querySelector('span').textContent = '＋';
        navigation.classList.remove('navigation--visible');
        menu.focus();
      }
    });
  }

  const elementsReveles = Array.from(document.querySelectorAll('[data-apparition]'));
  elementsReveles.forEach((element, index) => {
    if (element.closest('.liste-prestations')) {
      element.style.setProperty('--retard', (index % 5) * 55 + 'ms');
    }
  });

  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('apparition-visible');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    elementsReveles.forEach((element) => observateurRevelation.observe(element));

    const observateurFormes = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        entree.target.classList.toggle('forme-visible', entree.isIntersecting);
      });
    }, { threshold: 0.18 });

    document.querySelectorAll('[data-forme]').forEach((element) => observateurFormes.observe(element));
  } else {
    elementsReveles.forEach((element) => element.classList.add('apparition-visible'));
    document.querySelectorAll('[data-forme]').forEach((element) => element.classList.add('forme-visible'));
  }

  const formulaire = document.querySelector('#formulaire-rendez-vous');
  if (!formulaire) return;

  const panneauJours = formulaire.querySelector('[data-jours]');
  const panneauHeures = formulaire.querySelector('[data-heures]');
  const tousLesPanneaux = Array.from(formulaire.querySelectorAll('[data-panneau]'));
  const etiquetteEtape = document.querySelector('[data-etiquette-etape]');
  const progression = document.querySelector('[data-progression]');
  const commandesEtapes = Array.from(document.querySelectorAll('[data-aller-etape]'));
  const selectionPrestation = document.querySelector('[data-selection-prestation]');
  const selectionJour = document.querySelector('[data-selection-jour]');
  const selectionHeure = document.querySelector('[data-selection-heure]');
  const recapitulatif = document.querySelector('[data-recapitulatif]');
  const recapitulatifSucces = document.querySelector('[data-recapitulatif-succes]');
  const erreurCoordonnees = formulaire.querySelector('[data-erreur="coordonnees"]');

  const horaires = {
    2: { debut: 9, fin: 18 },
    3: { debut: 9, fin: 18 },
    4: { debut: 9, fin: 18 },
    5: { debut: 9, fin: 19 },
    6: { debut: 8, fin: 16 }
  };

  const formateurLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formateurCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  let etapeActuelle = 1;
  let derniereEtapeAtteinte = 1;
  let serviceChoisi = '';
  let jourChoisi = '';
  let heureChoisie = '';
  let minuterieEtape = 0;

  const heureParis = () => {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    return {
      heure: Number(morceaux.find((partie) => partie.type === 'hour').value),
      minute: Number(morceaux.find((partie) => partie.type === 'minute').value)
    };
  };

  const dateParisAujourdhui = () => {
    const morceaux = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    const annee = Number(morceaux.find((partie) => partie.type === 'year').value);
    const mois = Number(morceaux.find((partie) => partie.type === 'month').value);
    const jour = Number(morceaux.find((partie) => partie.type === 'day').value);
    return new Date(annee, mois - 1, jour, 12);
  };

  const dateVersTexte = (date) => {
    const jour = String(date.getDate()).padStart(2, '0');
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    return date.getFullYear() + '-' + mois + '-' + jour;
  };

  const texteDate = (texteIso) => {
    if (!texteIso) return '';
    const parties = texteIso.split('-').map(Number);
    const date = new Date(parties[0], parties[1] - 1, parties[2], 12);
    const phrase = formateurLong.format(date);
    return phrase.charAt(0).toLocaleUpperCase('fr-FR') + phrase.slice(1);
  };

  const echapperTexte = (texte) => String(texte).replace(/[&<>"']/g, (caractere) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caractere]);

  const heureTexte = (nombre) => String(nombre).padStart(2, '0') + ':00';

  const signalerErreur = (nom, message) => {
    const cible = formulaire.querySelector('[data-erreur="' + nom + '"]');
    if (cible) cible.textContent = message;
  };

  const viderErreurs = () => {
    formulaire.querySelectorAll('[data-erreur]').forEach((element) => { element.textContent = ''; });
  };

  const mettreAJourNavigationEtapes = () => {
    commandesEtapes.forEach((commande) => {
      const numero = Number(commande.dataset.allerEtape);
      commande.disabled = numero > derniereEtapeAtteinte;
      if (numero === Math.min(etapeActuelle, 4)) commande.setAttribute('aria-current', 'step');
      else commande.removeAttribute('aria-current');
    });
  };

  const mettreAJourRecapitulatif = () => {
    selectionPrestation.textContent = serviceChoisi || 'Prestation à choisir';
    selectionJour.textContent = jourChoisi ? texteDate(jourChoisi) : 'Jour à choisir';
    selectionHeure.textContent = heureChoisie ? 'À ' + heureChoisie : 'Heure à choisir';

    if (recapitulatif) {
      const lignes = [];
      if (serviceChoisi) lignes.push(serviceChoisi);
      if (jourChoisi) lignes.push(texteDate(jourChoisi));
      if (heureChoisie) lignes.push('À ' + heureChoisie);
      recapitulatif.textContent = lignes.length ? 'Votre choix : ' + lignes.join(' · ') : '';
    }
  };

  const mettreAJourEtape = () => {
    etiquetteEtape.textContent = etapeActuelle === 5 ? 'Simulation terminée' : 'Étape ' + etapeActuelle + ' sur 4';
    progression.dataset.etape = String(etapeActuelle);
    mettreAJourNavigationEtapes();
  };

  const reduitLesMouvements = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const allerAEtape = (cible) => {
    if (cible === etapeActuelle || cible < 1 || cible > 5 || (cible < 5 && cible > derniereEtapeAtteinte)) return;
    window.clearTimeout(minuterieEtape);
    viderErreurs();

    const ancienPanneau = formulaire.querySelector('[data-panneau="' + etapeActuelle + '"]');
    const nouveauPanneau = formulaire.querySelector('[data-panneau="' + cible + '"]');
    if (!ancienPanneau || !nouveauPanneau) return;

    etapeActuelle = cible;
    mettreAJourEtape();

    if (reduitLesMouvements) {
      ancienPanneau.hidden = true;
      nouveauPanneau.hidden = false;
      nouveauPanneau.querySelector('h3').focus({ preventScroll: true });
      return;
    }

    ancienPanneau.classList.add('etape--sortie');
    minuterieEtape = window.setTimeout(() => {
      ancienPanneau.hidden = true;
      ancienPanneau.classList.remove('etape--sortie');
      nouveauPanneau.hidden = false;
      nouveauPanneau.classList.add('etape--entree');
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          nouveauPanneau.classList.remove('etape--entree');
          nouveauPanneau.querySelector('h3').focus({ preventScroll: true });
        });
      });
    }, 230);
  };

  const construireJours = () => {
    const legende = panneauJours.querySelector('legend');
    panneauJours.replaceChildren(legende);
    const premierJour = dateParisAujourdhui();

    for (let decalage = 0; decalage < 12; decalage += 1) {
      const date = new Date(premierJour);
      date.setDate(premierJour.getDate() + decalage);
      const iso = dateVersTexte(date);
      const horaire = horaires[date.getDay()];
      const ferme = !horaire;
      const nomCourt = formateurCourt.format(date).replace('.', '');
      const nomLong = texteDate(iso);
      const nomCapitalise = nomCourt.charAt(0).toLocaleUpperCase('fr-FR') + nomCourt.slice(1);
      const etiquette = ferme ? nomLong + ' — fermé' : nomLong + ' — heures à confirmer';
      const label = document.createElement('label');
      label.className = 'jour';
      label.setAttribute('aria-label', etiquette);
      label.innerHTML = '<input type="radio" name="jour" value="' + iso + '"' + (ferme ? ' disabled' : '') + '>' +
        '<span class="jour__nom">' + echapperTexte(nomCapitalise) + '</span>' +
        '<span class="jour__numero">' + date.getDate() + '</span>' +
        (ferme ? '<span class="jour__ferme">Fermé</span>' : '');
      panneauJours.append(label);
    }
  };

  const construireHeures = () => {
    const legende = panneauHeures.querySelector('legend');
    panneauHeures.replaceChildren(legende);
    const jour = jourChoisi.split('-').map(Number);
    const date = new Date(jour[0], jour[1] - 1, jour[2], 12);
    const horaire = horaires[date.getDay()];
    if (!horaire) return;

    const heureActuelle = heureParis();
    const aujourdHui = jourChoisi === dateVersTexte(dateParisAujourdhui());
    let nombreCreneaux = 0;

    for (let heure = horaire.debut; heure < horaire.fin; heure += 1) {
      const dejaPasse = aujourdHui && (heure < heureActuelle.heure || (heure === heureActuelle.heure && heureActuelle.minute > 0));
      const nombre = Number(jour[2]);
      const dejaPris = ((nombre + heure * 3) % 5) === 0;
      const bloque = dejaPasse || dejaPris;
      const heureAffichee = heureTexte(heure);
      const label = document.createElement('label');
      label.className = 'creneau';
      label.setAttribute('aria-label', heureAffichee + (dejaPasse ? ' — heure passée' : dejaPris ? ' — exemple déjà pris' : ' — créneau fictif'));
      label.innerHTML = '<input type="radio" name="heure" value="' + heureAffichee + '"' + (bloque ? ' disabled' : '') + '>' +
        '<span class="creneau__heure">' + heureAffichee + '</span>' +
        '<span class="creneau__etat">' + (dejaPasse ? 'Passée' : dejaPris ? 'Déjà pris' : 'Exemple') + '</span>';
      panneauHeures.append(label);
      nombreCreneaux += 1;
    }

    if (nombreCreneaux === 0) {
      const note = document.createElement('p');
      note.className = 'etape__aide';
      note.textContent = 'Aucun exemple de créneau restant dans les horaires publiés aujourd’hui.';
      panneauHeures.append(note);
    }
  };

  const validerEtape = () => {
    viderErreurs();
    if (etapeActuelle === 1 && !serviceChoisi) {
      signalerErreur('prestation', 'Choisissez une prestation pour poursuivre.');
      formulaire.querySelector('input[name="prestation"]').focus();
      return false;
    }
    if (etapeActuelle === 2 && !jourChoisi) {
      signalerErreur('jour', 'Choisissez un jour où le salon est indiqué ouvert.');
      formulaire.querySelector('[data-jours] input:not(:disabled)').focus();
      return false;
    }
    if (etapeActuelle === 3 && !heureChoisie) {
      signalerErreur('heure', 'Choisissez un exemple de créneau disponible dans la simulation.');
      const premierChoix = formulaire.querySelector('[data-heures] input:not(:disabled)');
      if (premierChoix) premierChoix.focus();
      return false;
    }
    return true;
  };

  const telephoneValide = (valeur) => {
    const normalise = valeur.replace(/[\s().-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(normalise);
  };

  construireJours();
  mettreAJourRecapitulatif();
  mettreAJourEtape();

  formulaire.addEventListener('change', (evenement) => {
    const cible = evenement.target;
    if (cible.name === 'prestation') {
      serviceChoisi = cible.value;
      signalerErreur('prestation', '');
    }
    if (cible.name === 'jour') {
      jourChoisi = cible.value;
      heureChoisie = '';
      construireHeures();
      signalerErreur('jour', '');
    }
    if (cible.name === 'heure') {
      heureChoisie = cible.value;
      signalerErreur('heure', '');
    }
    mettreAJourRecapitulatif();
  });

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!validerEtape()) return;
      derniereEtapeAtteinte = Math.max(derniereEtapeAtteinte, etapeActuelle + 1);
      allerAEtape(etapeActuelle + 1);
    });
  });

  formulaire.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerAEtape(etapeActuelle - 1));
  });

  commandesEtapes.forEach((commande) => {
    commande.addEventListener('click', () => {
      const cible = Number(commande.dataset.allerEtape);
      if (cible <= derniereEtapeAtteinte) allerAEtape(cible);
    });
  });

  document.querySelectorAll('[data-preselection]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const nomPrestation = bouton.dataset.preselection;
      const choix = Array.from(formulaire.querySelectorAll('input[name="prestation"]'))
        .find((champ) => champ.value === nomPrestation);
      if (!choix) return;
      choix.checked = true;
      choix.dispatchEvent(new Event('change', { bubbles: true }));
      derniereEtapeAtteinte = Math.max(derniereEtapeAtteinte, 2);
      allerAEtape(2);
      document.querySelector('#reservation').scrollIntoView({ behavior: reduitLesMouvements ? 'auto' : 'smooth', block: 'start' });
    });
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etapeActuelle !== 4) return;
    const champPrenom = formulaire.querySelector('#prenom');
    const champTelephone = formulaire.querySelector('#telephone');
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    if (!prenom) {
      erreurCoordonnees.textContent = 'Indiquez votre prénom.';
      champPrenom.setAttribute('aria-invalid', 'true');
      champPrenom.focus();
      return;
    }
    champPrenom.removeAttribute('aria-invalid');
    if (!telephoneValide(telephone)) {
      erreurCoordonnees.textContent = 'Vérifiez le numéro de téléphone mobile saisi.';
      champTelephone.setAttribute('aria-invalid', 'true');
      champTelephone.focus();
      return;
    }
    champTelephone.removeAttribute('aria-invalid');

    derniereEtapeAtteinte = 4;
    recapitulatifSucces.textContent = serviceChoisi + ' · ' + texteDate(jourChoisi) + ' · ' + heureChoisie + ' · au nom de ' + prenom + '.';
    allerAEtape(5);
  });

  formulaire.querySelectorAll('#prenom, #telephone').forEach((champ) => {
    champ.addEventListener('input', () => {
      champ.removeAttribute('aria-invalid');
      if (!formulaire.querySelector('#prenom[aria-invalid="true"], #telephone[aria-invalid="true"]')) {
        erreurCoordonnees.textContent = '';
      }
    });
  });

  const recommencer = formulaire.querySelector('[data-recommencer]');
  recommencer.addEventListener('click', () => {
    formulaire.reset();
    formulaire.querySelectorAll('[aria-invalid]').forEach((champ) => champ.removeAttribute('aria-invalid'));
    viderErreurs();
    serviceChoisi = '';
    jourChoisi = '';
    heureChoisie = '';
    derniereEtapeAtteinte = 1;
    panneauHeures.replaceChildren(panneauHeures.querySelector('legend'));
    mettreAJourRecapitulatif();
    allerAEtape(1);
  });

  window.__apercuPret = true;
})();

