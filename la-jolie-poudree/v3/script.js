(() => {
  const racine = document.documentElement;
  racine.classList.add('js');
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-ready')));

  const panneaux = Array.from(document.querySelectorAll('[data-panneau]'));
  const panneauRendezVous = document.querySelector('[data-panneau="rendez-vous"]');
  const barreMobile = document.querySelector('.mobile-booking-bar');
  const pied = document.querySelector('.site-footer');
  let piedVisible = false;

  function actualiserBarreMobile() {
    if (!barreMobile) return;
    const cacher = Boolean(panneauRendezVous?.classList.contains('est-ouvert')) || piedVisible;
    barreMobile.classList.toggle('est-masque', cacher);
    barreMobile.setAttribute('aria-hidden', String(cacher));
    barreMobile.tabIndex = cacher ? -1 : 0;
  }

  function reglerPanneau(panneau, ouvert) {
    panneau.classList.toggle('est-ouvert', ouvert);
    const bouton = panneau.querySelector('.panel-trigger');
    const contenu = panneau.querySelector('.panel-body-frame');
    bouton.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) contenu.removeAttribute('inert');
    else contenu.setAttribute('inert', '');
  }

  panneaux.forEach((panneau, index) => reglerPanneau(panneau, index === 0));
  actualiserBarreMobile();

  function ouvrirPanneau(cle, allerAuPanneau = false) {
    const panneau = panneaux.find((element) => element.dataset.panneau === cle);
    if (!panneau) return;
    panneaux.forEach((element) => reglerPanneau(element, element === panneau));
    actualiserBarreMobile();
    if (allerAuPanneau) {
      panneau.scrollIntoView({ behavior: reduireMouvement ? 'auto' : 'smooth', block: 'start' });
      panneau.querySelector('.panel-trigger').focus({ preventScroll: true });
    }
  }

  panneaux.forEach((panneau) => {
    const bouton = panneau.querySelector('.panel-trigger');
    bouton.addEventListener('click', () => {
      const ouvrir = !panneau.classList.contains('est-ouvert');
      panneaux.forEach((element) => reglerPanneau(element, element === panneau && ouvrir));
      actualiserBarreMobile();
    });
  });

  document.querySelectorAll('[data-ouvrir-panneau]').forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      ouvrirPanneau(lien.dataset.ouvrirPanneau, true);
      history.replaceState(null, '', `#panneau-${lien.dataset.ouvrirPanneau}`);
    });
  });

  if ('IntersectionObserver' in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-revele');
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });

    document.querySelectorAll('[data-revelation]').forEach((element) => observateurRevelation.observe(element));

    if (pied && barreMobile) {
      const observateurPied = new IntersectionObserver((entrees) => {
        piedVisible = entrees.some((entree) => entree.isIntersecting);
        actualiserBarreMobile();
      }, { threshold: 0.02 });
      observateurPied.observe(pied);
    }
  } else {
    document.querySelectorAll('[data-revelation]').forEach((element) => element.classList.add('est-revele'));
  }

  const formulaire = document.querySelector('#simulateur');
  if (!formulaire) return;

  const etapes = Array.from(formulaire.querySelectorAll('.booking-step'));
  const jalons = Array.from(document.querySelectorAll('.step-marker'));
  const boutonPrecedent = document.querySelector('#precedent');
  const boutonContinuer = document.querySelector('#continuer');
  const messageEtape = document.querySelector('#booking-live');
  const listeJours = document.querySelector('#liste-jours');
  const listeHeures = document.querySelector('#liste-heures');
  const confirmation = document.querySelector('#confirmation');
  const formulaireRecommencer = document.querySelector('#recommencer');
  const erreurJour = document.querySelector('#erreur-jour');
  const erreurHeure = document.querySelector('#erreur-heure');
  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const joursOuverture = {
    1: { debut: 9 * 60, fin: 19 * 60 },
    2: { debut: 9 * 60, fin: 19 * 60 },
    3: { debut: 9 * 60, fin: 19 * 60 },
    4: { debut: 9 * 60, fin: 19 * 60 },
    5: { debut: 9 * 60, fin: 19 * 60 },
    6: { debut: 9 * 60, fin: 18 * 60 },
  };
  const dureeSoin = 65;
  let etapeActuelle = 0;
  let etapeAtteinte = 0;
  let jourChoisi = '';
  let heureChoisie = '';
  const minuteursEtapes = new Map();

  const formateurParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const formatJourCourt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short',
  });
  const formatJourLong = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  function partiesDate(date, formateur) {
    return Object.fromEntries(formateur.formatToParts(date).filter((partie) => partie.type !== 'literal').map((partie) => [partie.type, partie.value]));
  }

  function dateParisEtHeure() {
    const parties = partiesDate(new Date(), formateurParis);
    return {
      iso: `${parties.year}-${parties.month}-${parties.day}`,
      minutes: Number(parties.hour) * 60 + Number(parties.minute),
    };
  }

  function enDateUTC(iso) {
    return new Date(`${iso}T12:00:00Z`);
  }

  function jourSemaine(iso) {
    return enDateUTC(iso).getUTCDay();
  }

  function creerId(iso, heure) {
    return `choix-${iso.replaceAll('-', '')}-${heure.replace(':', '')}`;
  }

  function afficherJours() {
    const maintenant = dateParisEtHeure();
    const base = enDateUTC(maintenant.iso);
    const fragments = document.createDocumentFragment();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(base);
      date.setUTCDate(base.getUTCDate() + decalage);
      const iso = date.toISOString().slice(0, 10);
      const numeroJour = jourSemaine(iso);
      const ouvert = Boolean(joursOuverture[numeroJour]);
      const labelComplet = formatJourLong.format(date);
      const labelCourt = formatJourCourt.format(date).replace('.', '');
      const detail = ouvert ? (decalage === 0 ? 'Aujourd’hui' : labelComplet.split(' ').slice(-2).join(' ')) : 'Fermé';
      const identifiant = `jour-${iso.replaceAll('-', '')}`;
      const etiquette = document.createElement('label');
      etiquette.className = `day-choice${ouvert ? '' : ' is-ferme'}`;
      etiquette.setAttribute('aria-label', ouvert ? labelComplet : `${labelComplet}, fermé`);

      const entree = document.createElement('input');
      entree.type = 'radio';
      entree.name = 'jour';
      entree.value = iso;
      entree.id = identifiant;
      entree.disabled = !ouvert;
      entree.setAttribute('aria-describedby', 'erreur-jour');

      const face = document.createElement('span');
      face.className = 'day-face';
      const jour = document.createElement('span');
      jour.className = 'day-label';
      jour.textContent = labelCourt;
      const sous = document.createElement('span');
      sous.className = 'day-sub';
      sous.textContent = detail;
      face.append(jour, sous);
      etiquette.append(entree, face);
      fragments.append(etiquette);
    }
    listeJours.replaceChildren(fragments);

    listeJours.querySelectorAll('input[name="jour"]').forEach((entree) => {
      entree.addEventListener('change', () => {
        jourChoisi = entree.value;
        heureChoisie = '';
        erreurJour.textContent = '';
        listeJours.querySelectorAll('input').forEach((jour) => jour.removeAttribute('aria-invalid'));
        afficherHeures();
        actualiserRecap();
      });
    });
  }

  function empreinte(texte) {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) {
      valeur = ((valeur * 31) + texte.charCodeAt(index)) >>> 0;
    }
    return valeur;
  }

  function afficherHeures() {
    listeHeures.replaceChildren();
    erreurHeure.textContent = '';
    if (!jourChoisi) {
      const note = document.createElement('p');
      note.className = 'field-note';
      note.textContent = 'Choisissez d’abord un jour ouvert.';
      listeHeures.append(note);
      return;
    }

    const heureOuverture = joursOuverture[jourSemaine(jourChoisi)];
    if (!heureOuverture) return;
    const maintenant = dateParisEtHeure();
    const fragments = document.createDocumentFragment();
    let nombre = 0;

    for (let minute = heureOuverture.debut; minute + dureeSoin <= heureOuverture.fin; minute += 30) {
      const heures = String(Math.floor(minute / 60)).padStart(2, '0');
      const minutes = String(minute % 60).padStart(2, '0');
      const valeurHeure = `${heures}:${minutes}`;
      const identifiant = creerId(jourChoisi, valeurHeure);
      const estPasse = jourChoisi === maintenant.iso && minute <= maintenant.minutes;
      const indisponible = estPasse || empreinte(`${jourChoisi}-${valeurHeure}`) % 8 === 0;
      const etiquette = document.createElement('label');
      etiquette.className = `slot-choice${indisponible ? ' is-indisponible' : ''}`;
      const entree = document.createElement('input');
      entree.type = 'radio';
      entree.name = 'heure';
      entree.value = valeurHeure;
      entree.id = identifiant;
      entree.disabled = indisponible;
      entree.setAttribute('aria-describedby', 'erreur-heure');
      entree.setAttribute('aria-label', estPasse ? `${Number(heures)} h ${minutes}, horaire passé` : indisponible ? `${Number(heures)} h ${minutes}, déjà pris dans cette simulation` : `${Number(heures)} h ${minutes}`);

      const face = document.createElement('span');
      face.className = 'slot-face';
      const heure = document.createElement('span');
      heure.className = 'slot-label';
      heure.textContent = `${Number(heures)} h ${minutes}`;
      face.append(heure);
      if (indisponible) {
        const statut = document.createElement('span');
        statut.className = 'slot-sub';
        statut.textContent = estPasse ? 'Passé' : 'Pris · simulation';
        face.append(statut);
      }
      etiquette.append(entree, face);
      fragments.append(etiquette);
      nombre += 1;
    }

    if (nombre === 0) {
      const note = document.createElement('p');
      note.className = 'field-note';
      note.textContent = 'Aucun créneau de démonstration ne reste sur cette journée.';
      fragments.append(note);
    }
    listeHeures.replaceChildren(fragments);
    listeHeures.querySelectorAll('input[name="heure"]').forEach((entree) => {
      entree.addEventListener('change', () => {
        heureChoisie = entree.value;
        erreurHeure.textContent = '';
        listeHeures.querySelectorAll('input').forEach((heure) => heure.removeAttribute('aria-invalid'));
        actualiserRecap();
      });
    });
  }

  function afficherHeure(heure) {
    if (!heure) return 'À choisir';
    const [heures, minutes] = heure.split(':').map(Number);
    return `${heures} h ${String(minutes).padStart(2, '0')}`;
  }

  function actualiserRecap() {
    const prestation = formulaire.querySelector('input[name="prestation"]:checked');
    document.querySelector('#recap-prestation').textContent = prestation ? 'Indonésie ancestrale' : 'À choisir';
    document.querySelector('#recap-jour').textContent = jourChoisi ? formatJourLong.format(enDateUTC(jourChoisi)) : 'À choisir';
    document.querySelector('#recap-heure').textContent = afficherHeure(heureChoisie);
  }

  function actualiserJalons() {
    jalons.forEach((jalon, index) => {
      const actif = index === etapeActuelle;
      jalon.classList.toggle('est-actif', actif);
      jalon.classList.toggle('est-termine', index < etapeActuelle);
      jalon.setAttribute('aria-current', actif ? 'step' : 'false');
      jalon.disabled = index > etapeAtteinte;
    });
    boutonPrecedent.disabled = etapeActuelle === 0;
    boutonContinuer.textContent = etapeActuelle === 3 ? 'Confirmer la simulation' : 'Continuer';
    messageEtape.textContent = `Étape ${etapeActuelle + 1} sur 4.`;
  }

  function passerEtape(prochaine) {
    if (prochaine < 0 || prochaine >= etapes.length || prochaine === etapeActuelle) return;
    const indexPrecedent = etapeActuelle;
    const precedente = etapes[indexPrecedent];
    const suivante = etapes[prochaine];
    const minuteurReouverture = minuteursEtapes.get(prochaine);
    if (minuteurReouverture) window.clearTimeout(minuteurReouverture);
    minuteursEtapes.delete(prochaine);
    precedente.classList.remove('est-actif');
    precedente.setAttribute('aria-hidden', 'true');
    precedente.setAttribute('inert', '');
    const minuteurSortie = window.setTimeout(() => {
      if (etapeActuelle !== indexPrecedent) precedente.hidden = true;
      minuteursEtapes.delete(indexPrecedent);
    }, reduireMouvement ? 0 : 240);
    minuteursEtapes.set(indexPrecedent, minuteurSortie);
    suivante.hidden = false;
    suivante.removeAttribute('inert');
    suivante.setAttribute('aria-hidden', 'false');
    suivante.classList.remove('est-actif');
    void suivante.offsetWidth;
    requestAnimationFrame(() => suivante.classList.add('est-actif'));
    etapeActuelle = prochaine;
    etapeAtteinte = Math.max(etapeAtteinte, prochaine);
    actualiserJalons();
    window.setTimeout(() => suivante.querySelector('legend').focus({ preventScroll: true }), reduireMouvement ? 0 : 40);
  }

  function validerEtape() {
    if (etapeActuelle === 0) {
      const selection = formulaire.querySelector('input[name="prestation"]:checked');
      if (!selection) {
        messageEtape.textContent = 'Choisissez la prestation avant de continuer.';
        return false;
      }
      return true;
    }
    if (etapeActuelle === 1) {
      if (!jourChoisi) {
        erreurJour.textContent = 'Choisissez un jour ouvert pour continuer.';
        const premiereJournee = listeJours.querySelector('input:not(:disabled)');
        premiereJournee?.setAttribute('aria-invalid', 'true');
        messageEtape.textContent = 'Un jour ouvert est nécessaire pour poursuivre.';
        return false;
      }
      return true;
    }
    if (etapeActuelle === 2) {
      if (!heureChoisie) {
        erreurHeure.textContent = 'Choisissez un créneau disponible dans la simulation.';
        const premiereHeure = listeHeures.querySelector('input:not(:disabled)');
        premiereHeure?.setAttribute('aria-invalid', 'true');
        messageEtape.textContent = 'Un créneau de démonstration est nécessaire pour poursuivre.';
        return false;
      }
      return true;
    }

    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim().replace(/[\s.-]/g, '');
    const telephoneValide = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(telephone);
    document.querySelector('#erreur-prenom').textContent = prenom ? '' : 'Indiquez votre prénom.';
    document.querySelector('#erreur-telephone').textContent = telephoneValide ? '' : 'Saisissez un numéro de mobile français valide.';
    champPrenom.setAttribute('aria-invalid', String(!prenom));
    champTelephone.setAttribute('aria-invalid', String(!telephoneValide));
    if (!prenom || !telephoneValide) {
      messageEtape.textContent = 'Vérifiez les coordonnées avant de continuer.';
      (!prenom ? champPrenom : champTelephone).focus();
      return false;
    }
    return true;
  }

  function confirmerSimulation() {
    const dateFormatee = formatJourLong.format(enDateUTC(jourChoisi));
    const prestation = 'Indonésie ancestrale';
    document.querySelector('#confirmation-recap').textContent = `${champPrenom.value.trim()} · ${prestation} · ${dateFormatee} à ${afficherHeure(heureChoisie)}.`;
    formulaire.hidden = true;
    confirmation.hidden = false;
    requestAnimationFrame(() => confirmation.classList.add('est-actif'));
    document.querySelector('#confirmation-titre').focus({ preventScroll: true });
    messageEtape.textContent = 'Simulation terminée. Aucune demande n’a été envoyée.';
  }

  jalons.forEach((jalon) => {
    jalon.addEventListener('click', () => {
      const cible = Number(jalon.dataset.etape);
      if (cible <= etapeAtteinte) passerEtape(cible);
    });
  });
  boutonPrecedent.addEventListener('click', () => passerEtape(etapeActuelle - 1));
  boutonContinuer.addEventListener('click', () => {
    if (!validerEtape()) return;
    if (etapeActuelle === 3) confirmerSimulation();
    else passerEtape(etapeActuelle + 1);
  });
  formulaire.addEventListener('change', (evenement) => {
    if (evenement.target.name === 'prestation') actualiserRecap();
  });
  formulaireRecommencer.addEventListener('click', () => {
    minuteursEtapes.forEach((minuteur) => window.clearTimeout(minuteur));
    minuteursEtapes.clear();
    formulaire.reset();
    formulaire.hidden = false;
    confirmation.hidden = true;
    confirmation.classList.remove('est-actif');
    jourChoisi = '';
    heureChoisie = '';
    etapeActuelle = 0;
    etapeAtteinte = 0;
    etapes.forEach((etape, index) => {
      etape.hidden = index !== 0;
      etape.classList.toggle('est-actif', index === 0);
      etape.setAttribute('aria-hidden', String(index !== 0));
      if (index === 0) etape.removeAttribute('inert');
      else etape.setAttribute('inert', '');
    });
    champPrenom.value = '';
    champTelephone.value = '';
    document.querySelectorAll('.field-error').forEach((erreur) => { erreur.textContent = ''; });
    document.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
    afficherJours();
    afficherHeures();
    actualiserRecap();
    actualiserJalons();
    etapes[0].querySelector('legend').focus({ preventScroll: true });
  });

  afficherJours();
  afficherHeures();
  actualiserRecap();
  actualiserJalons();
  messageEtape.textContent = 'Étape 1 sur 4 : choisissez la prestation.';
})();
