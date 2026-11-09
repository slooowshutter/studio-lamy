(() => {
  const panneaux = Array.from(document.querySelectorAll('[data-panneau]'));
  const barreMobile = document.querySelector('.mobile-bar');
  const entete = document.querySelector('.site-header');
  const pied = document.querySelector('.site-footer');
  const sectionRendezVous = document.querySelector('#panneau-rendez-vous');

  const temporisateursPanneau = new WeakMap();
  function reglerPanneau(panneau, ouvert) {
    const bouton = panneau.querySelector('.panel-toggle');
    const contenu = panneau.querySelector('.panel-fold');
    const interieur = panneau.querySelector('.panel-inner');
    const ancienTemporisateur = temporisateursPanneau.get(panneau);
    if (ancienTemporisateur) window.clearTimeout(ancienTemporisateur);
    bouton.setAttribute('aria-expanded', String(ouvert));
    contenu.setAttribute('aria-hidden', String(!ouvert));
    contenu.inert = !ouvert;
    if (ouvert) {
      panneau.classList.remove('is-collapsed');
      panneau.classList.add('is-open');
      requestAnimationFrame(() => {
        if (panneau.classList.contains('is-open')) interieur.classList.add('is-content-visible');
      });
    } else {
      panneau.classList.remove('is-open');
      interieur.classList.remove('is-content-visible');
      const temporisateur = window.setTimeout(() => {
        if (!panneau.classList.contains('is-open')) panneau.classList.add('is-collapsed');
      }, 230);
      temporisateursPanneau.set(panneau, temporisateur);
    }
  }

  panneaux.forEach((panneau) => {
    const ouvert = panneau.classList.contains('is-open');
    reglerPanneau(panneau, ouvert);
    panneau.querySelector('.panel-toggle').addEventListener('click', () => {
      const ouvrir = !panneau.classList.contains('is-open');
      panneaux.forEach((autre) => reglerPanneau(autre, autre === panneau && ouvrir));
      actualiserBarreMobile();
    });
  });

  function ouvrirPanneau(nom, faireDefiler = true) {
    const cible = panneaux.find((panneau) => panneau.dataset.panneau === nom);
    if (!cible) return;
    panneaux.forEach((panneau) => reglerPanneau(panneau, panneau === cible));
    actualiserBarreMobile();
    if (faireDefiler) {
      cible.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  document.querySelectorAll('[data-ouvrir-panneau]').forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      ouvrirPanneau(lien.dataset.ouvrirPanneau);
    });
  });

  requestAnimationFrame(() => {
    entete.classList.add('is-intro');
  });

  const elementsReveles = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-revealed');
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.22, rootMargin: '0px 0px -6% 0px' });
    elementsReveles.forEach((element, index) => {
      element.style.transitionDelay = `${index * 70}ms`;
      observateur.observe(element);
    });
  } else {
    elementsReveles.forEach((element) => element.classList.add('is-revealed'));
  }

  const services = [
    { id: 'vernis', nom: 'Pose de vernis (mains)', minutes: 15 },
    { id: 'semi', nom: 'Pose de vernis semi-permanent (mains)', minutes: 20 },
    { id: 'pieds', nom: 'Beauté des pieds sans vernis', minutes: 30 },
    { id: 'forfait', nom: 'Forfait mains et pieds avec vernis semi-permanent', minutes: 80 },
    { id: 'babyboomer', nom: 'Pose gel avec résine « BABYBOOMER »', minutes: 70 },
    { id: 'massage', nom: 'Massage relaxant corps', minutes: 60 },
    { id: 'visage', nom: 'Nettoyant, gommage, massage et masque du visage', minutes: 60 }
  ];
  const etapes = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];
  const racine = document.querySelector('#booking-view');
  const recap = document.querySelector('#selection-list');
  const etat = {
    etape: 0,
    service: 'babyboomer',
    jour: '',
    heure: '',
    prenom: '',
    telephone: '',
    termine: false
  };

  function serviceActuel() {
    return services.find((service) => service.id === etat.service) || services[4];
  }

  function dureeTexte(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return reste ? `${heures} h ${String(reste).padStart(2, '0')}` : `${heures} h`;
  }

  function dateParis(date = new Date()) {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    return Object.fromEntries(morceaux.filter((morceau) => morceau.type !== 'literal').map((morceau) => [morceau.type, morceau.value]));
  }

  function cleDuJour(decalage = 0) {
    const maintenant = dateParis();
    const date = new Date(Date.UTC(Number(maintenant.year), Number(maintenant.month) - 1, Number(maintenant.day) + decalage, 12));
    return date.toISOString().slice(0, 10);
  }

  function datePourCle(cle) {
    return new Date(`${cle}T12:00:00Z`);
  }

  function nomDuJour(cle, long = true) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: long ? 'long' : 'short' }).format(datePourCle(cle));
  }

  function dateComplete(cle) {
    const date = datePourCle(cle);
    const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(date);
    return `${nomDuJour(cle)}, ${jour}`;
  }

  function dateCourte(cle) {
    const date = datePourCle(cle);
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(date);
  }

  function dateEstDimanche(cle) {
    return datePourCle(cle).getUTCDay() === 0;
  }

  function libelleHeure(heure) {
    return heure.replace(':', ' h ');
  }

  function heureParisEnMinutes() {
    const maintenant = dateParis();
    return Number(maintenant.hour) * 60 + Number(maintenant.minute);
  }

  function estIndisponibleDansLaSimulation(cle, minute) {
    const jour = Number(cle.replaceAll('-', ''));
    const index = Math.floor(minute / 30);
    return (jour * 7 + index * 11) % 13 === 0 || (jour + index * 5) % 17 === 0;
  }

  function mettreAJourRecap() {
    recap.replaceChildren();
    const lignes = [
      { nom: 'Prestation', valeur: etat.service ? serviceActuel().nom : 'À choisir', etape: 0, disponible: true },
      { nom: 'Durée', valeur: etat.service ? dureeTexte(serviceActuel().minutes) : '—' },
      { nom: 'Jour', valeur: etat.jour ? dateComplete(etat.jour) : 'À choisir', etape: 1, disponible: Boolean(etat.jour) },
      { nom: 'Heure', valeur: etat.heure ? libelleHeure(etat.heure) : 'À choisir', etape: 2, disponible: Boolean(etat.heure) }
    ];
    lignes.forEach((ligne) => {
      const contenant = document.createElement('div');
      const terme = document.createElement('dt');
      const definition = document.createElement('dd');
      terme.textContent = ligne.nom;
      definition.textContent = ligne.valeur;
      contenant.append(terme, definition);
      if (Number.isInteger(ligne.etape) && ligne.disponible) {
        const modifier = document.createElement('button');
        modifier.type = 'button';
        modifier.className = 'summary-edit';
        modifier.dataset.etape = String(ligne.etape);
        modifier.textContent = 'Modifier';
        definition.append(document.createElement('br'), modifier);
      }
      recap.append(contenant);
    });
  }

  function enteteEtape(titre, index) {
    return `<div class="step-heading-row"><h3 class="step-heading" tabindex="-1">${titre}</h3><span class="step-count">Étape ${index + 1} sur ${etapes.length}</span></div>`;
  }

  function boutonRetour(index) {
    if (index === 0) return '';
    return '<button class="action-button action-button--back" type="button" data-retour>Retour à l’étape précédente</button>';
  }

  function contenuPrestation() {
    const choix = services.map((service) => `
      <label class="choice-label" for="prestation-${service.id}">
        <input id="prestation-${service.id}" name="prestation" type="radio" value="${service.id}" ${etat.service === service.id ? 'checked' : ''} required>
        <span class="choice-label__name">${service.nom}</span>
        <span class="choice-label__duration">${dureeTexte(service.minutes)}</span>
      </label>`).join('');
    return `<form class="step-view" data-form-etape="0" novalidate>
      ${enteteEtape('Choisir une prestation', 0)}
      <p class="step-note">Le menu affiche les durées. Aucun prix n’est inclus dans cette simulation.</p>
      <fieldset class="choice-list"><legend class="sr-only">Prestations proposées dans la simulation</legend>${choix}</fieldset>
      <div class="form-actions"><span></span><button class="action-button" type="submit">Continuer <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function contenuJour() {
    const aujourdHui = cleDuJour();
    const dates = Array.from({ length: 14 }, (_, index) => cleDuJour(index));
    const choix = dates.map((cle, index) => {
      const dimanche = dateEstDimanche(cle);
      const nom = dateComplete(cle);
      const jourNumerique = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric' }).format(datePourCle(cle));
      const indicateur = dimanche ? 'À confirmer' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : 'Choisir';
      return `<label class="date-label${dimanche ? ' is-unavailable' : ''}" for="jour-${cle}">
        <input id="jour-${cle}" name="jour" type="radio" value="${cle}" aria-label="${nom}${dimanche ? ', horaires à confirmer' : ''}" ${etat.jour === cle ? 'checked' : ''} ${dimanche ? 'disabled' : 'required'}>
        <span class="date-label__weekday">${nomDuJour(cle, false)}</span>
        <time class="date-label__day" datetime="${cle}">${jourNumerique}</time>
        <span class="date-label__state">${indicateur}</span>
      </label>`;
    }).join('');
    const message = aujourdHui ? 'Les dates sont générées pour cette simulation à partir du jour où vous la consultez. Le dimanche reste à confirmer.' : '';
    return `<form class="step-view" data-form-etape="1" novalidate>
      ${enteteEtape('Choisir un jour', 1)}
      <p class="step-note">${message}</p>
      <fieldset class="date-list"><legend class="sr-only">Choisir une date de rendez-vous simulée</legend>${choix}</fieldset>
      <p class="field-error" data-erreur="jour" aria-live="polite"></p>
      <div class="form-actions">${boutonRetour(1)}<button class="action-button" type="submit">Voir les heures <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function contenuHeure() {
    const service = serviceActuel();
    const debut = 10 * 60;
    const fin = 19 * 60 + 30;
    const groupes = [
      { nom: 'Matin', debut: debut, fin: 12 * 60 },
      { nom: 'Après-midi', debut: 12 * 60, fin: 18 * 60 },
      { nom: 'Soir', debut: 18 * 60, fin: fin }
    ];
    const aujourdHui = cleDuJour();
    let libres = 0;
    const html = groupes.map((groupe, index) => {
      const heures = [];
      for (let minute = groupe.debut; minute < groupe.fin; minute += 30) {
        if (minute < debut || minute + service.minutes > fin) continue;
        const dejaPasse = etat.jour === aujourdHui && minute <= heureParisEnMinutes();
        const indisponible = estIndisponibleDansLaSimulation(etat.jour, minute);
        const bloque = dejaPasse || indisponible;
        if (!bloque) libres += 1;
        const heure = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const id = `heure-${index}-${minute}`;
        const etatVisible = dejaPasse ? 'Passé' : indisponible ? 'Indisponible' : '';
        heures.push(`<label class="slot-label${bloque ? ' is-unavailable' : ''}" for="${id}"${bloque ? ` title="${dejaPasse ? 'Horaire déjà passé' : 'Indisponible dans cette simulation'}"` : ''}>
          <input id="${id}" name="heure" type="radio" value="${heure}" aria-label="${libelleHeure(heure)}${etatVisible ? `, ${etatVisible.toLowerCase()}` : ''}" ${etat.jour && etat.heure === heure ? 'checked' : ''} ${bloque ? 'disabled' : 'required'}>
          <time datetime="${etat.jour}T${heure}:00">${libelleHeure(heure)}</time>
        </label>`);
      }
      return `<fieldset class="slot-group"><legend>${groupe.nom}</legend><div class="slot-options">${heures.join('') || '<p class="slot-empty">Aucune heure ici.</p>'}</div></fieldset>`;
    }).join('');
    const date = etat.jour ? dateComplete(etat.jour) : '';
    return `<form class="step-view" data-form-etape="2" novalidate>
      ${enteteEtape('Choisir une heure', 2)}
      <p class="step-note">${service.nom} · ${dureeTexte(service.minutes)} · ${date}. Les heures indisponibles et les heures passées ne sont pas sélectionnables dans cette simulation.</p>
      <div class="slot-groups">${html}</div>
      <p class="slots-status" aria-live="polite">${libres} créneau${libres > 1 ? 'x' : ''} proposé${libres > 1 ? 's' : ''} dans la simulation.</p>
      <p class="field-error" data-erreur="heure" aria-live="polite"></p>
      <div class="form-actions">${boutonRetour(2)}<button class="action-button" type="submit">Continuer <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function contenuCoordonnees() {
    const service = serviceActuel();
    return `<form class="step-view" data-form-etape="3" novalidate>
      ${enteteEtape('Vérifier la sélection', 3)}
      <p class="step-note">Saisissez des coordonnées fictives pour voir l’écran de confirmation. Elles restent dans cette page et ne sont pas transmises.</p>
      <div class="booking-recap" aria-label="Récapitulatif du rendez-vous simulé">
        <p><strong>${service.nom}</strong> · ${dureeTexte(service.minutes)}</p>
        <p>${dateComplete(etat.jour)} · ${libelleHeure(etat.heure)}</p>
      </div>
      <div class="form-field">
        <label class="field-label" for="prenom">Prénom</label>
        <input class="booking-input" id="prenom" name="prenom" type="text" autocomplete="given-name" placeholder="Votre prénom" aria-describedby="erreur-prenom" required>
        <p class="field-error" id="erreur-prenom" data-erreur="prenom" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label class="field-label" for="telephone">Téléphone mobile</label>
        <input class="booking-input" id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Votre numéro de mobile" aria-describedby="erreur-telephone" required>
        <p class="field-error" id="erreur-telephone" data-erreur="telephone" aria-live="polite"></p>
      </div>
      <div class="form-actions">${boutonRetour(3)}<button class="action-button" type="submit">Afficher la confirmation <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function contenuSucces() {
    const section = document.createElement('section');
    section.className = 'step-view booking-success';
    section.setAttribute('aria-labelledby', 'titre-succes');
    section.innerHTML = '<p class="kicker"><span class="kicker-line" aria-hidden="true"></span>Fin de la démonstration</p><h3 id="titre-succes" tabindex="-1">Sélection enregistrée ici.</h3><p class="success-confirmation"></p><p>Aucun rendez-vous n’a été transmis au salon. Cette démonstration ne réserve pas de créneau.</p><p>Pour prendre rendez-vous, appelez Sunny Nails au <a href="tel:+33147343257">01&nbsp;47&nbsp;34&nbsp;32&nbsp;57</a>.</p><button class="action-button action-button--back" type="button" data-recommencer>Recommencer la simulation</button>';
    section.querySelector('.success-confirmation').textContent = `${etat.prenom} · ${serviceActuel().nom} · ${dateComplete(etat.jour)} à ${libelleHeure(etat.heure)}.`;
    return section;
  }

  function afficherEtape(animer = true) {
    const anciens = Array.from(racine.querySelectorAll('.step-view'));
    anciens.forEach((ancien) => ancien.classList.add('is-leaving'));
    let nouveau;
    if (etat.termine) nouveau = contenuSucces();
    else if (etat.etape === 0) nouveau = document.createRange().createContextualFragment(contenuPrestation()).firstElementChild;
    else if (etat.etape === 1) nouveau = document.createRange().createContextualFragment(contenuJour()).firstElementChild;
    else if (etat.etape === 2) nouveau = document.createRange().createContextualFragment(contenuHeure()).firstElementChild;
    else nouveau = document.createRange().createContextualFragment(contenuCoordonnees()).firstElementChild;
    if (!etat.termine && etat.etape === 3) {
      nouveau.querySelector('#prenom').value = etat.prenom;
      nouveau.querySelector('#telephone').value = etat.telephone;
    }
    racine.append(nouveau);
    if (!animer) nouveau.classList.add('is-visible');
    else requestAnimationFrame(() => nouveau.classList.add('is-visible'));
    window.setTimeout(() => anciens.forEach((ancien) => ancien.remove()), animer ? 250 : 0);
    mettreAJourRecap();
    const titre = nouveau.querySelector('h3');
    if (titre) titre.focus({ preventScroll: true });
  }

  racine.addEventListener('input', (evenement) => {
    if (evenement.target.id === 'prenom') etat.prenom = evenement.target.value;
    if (evenement.target.id === 'telephone') etat.telephone = evenement.target.value;
  });

  racine.addEventListener('change', (evenement) => {
    const cible = evenement.target;
    if (cible.name === 'prestation') {
      etat.service = cible.value;
      etat.jour = '';
      etat.heure = '';
    }
    if (cible.name === 'jour') {
      etat.jour = cible.value;
      etat.heure = '';
    }
    if (cible.name === 'heure') etat.heure = cible.value;
    mettreAJourRecap();
  });

  racine.addEventListener('click', (evenement) => {
    const retour = evenement.target.closest('[data-retour]');
    const modifier = evenement.target.closest('[data-etape]');
    const recommencer = evenement.target.closest('[data-recommencer]');
    if (retour) {
      etat.etape = Math.max(0, etat.etape - 1);
      afficherEtape();
    } else if (modifier) {
      etat.etape = Number(modifier.dataset.etape);
      etat.termine = false;
      afficherEtape();
    } else if (recommencer) {
      etat.etape = 0;
      etat.jour = '';
      etat.heure = '';
      etat.prenom = '';
      etat.telephone = '';
      etat.termine = false;
      afficherEtape();
    }
  });

  racine.addEventListener('submit', (evenement) => {
    const formulaire = evenement.target.closest('[data-form-etape]');
    if (!formulaire) return;
    evenement.preventDefault();
    const index = Number(formulaire.dataset.formEtape);
    const erreur = (nom, texte) => {
      const zone = formulaire.querySelector(`[data-erreur="${nom}"]`);
      if (zone) zone.textContent = texte;
    };
    if (index === 0) {
      const choisi = formulaire.querySelector('input[name="prestation"]:checked');
      if (!choisi) return erreur('prestation', 'Choisissez une prestation pour continuer.');
      etat.service = choisi.value;
      etat.jour = '';
      etat.heure = '';
      etat.etape = 1;
    } else if (index === 1) {
      const choisi = formulaire.querySelector('input[name="jour"]:checked');
      if (!choisi) return erreur('jour', 'Choisissez un jour proposé dans la simulation.');
      etat.jour = choisi.value;
      etat.heure = '';
      etat.etape = 2;
    } else if (index === 2) {
      const choisi = formulaire.querySelector('input[name="heure"]:checked');
      if (!choisi) return erreur('heure', 'Choisissez une heure proposée dans la simulation.');
      etat.heure = choisi.value;
      etat.etape = 3;
    } else if (index === 3) {
      const prenom = formulaire.querySelector('#prenom').value.trim();
      const telephone = formulaire.querySelector('#telephone').value.trim();
      const chiffres = telephone.replace(/\D/g, '');
      const telephoneValide = /^0[67]\d{8}$/.test(chiffres) || /^33[67]\d{8}$/.test(chiffres);
      if (prenom.length < 2) {
        erreur('prenom', 'Saisissez un prénom de deux caractères ou plus.');
        formulaire.querySelector('#prenom').focus();
        return;
      }
      if (!telephoneValide) {
        erreur('telephone', 'Saisissez un numéro de mobile français valide.');
        formulaire.querySelector('#telephone').focus();
        return;
      }
      etat.prenom = prenom;
      etat.telephone = telephone;
      etat.termine = true;
    }
    afficherEtape();
  });

  document.querySelectorAll('[data-preselection]').forEach((lien) => {
    lien.addEventListener('click', (evenement) => {
      evenement.preventDefault();
      etat.service = lien.dataset.preselection;
      etat.jour = '';
      etat.heure = '';
      etat.etape = 0;
      etat.termine = false;
      ouvrirPanneau('rendez-vous');
      afficherEtape(false);
      window.setTimeout(() => racine.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }), 70);
    });
  });

  mettreAJourRecap();
  afficherEtape(false);

  function actualiserBarreMobile() {
    if (!barreMobile || window.innerWidth > 620) return;
    const rendezVousOuvert = sectionRendezVous && sectionRendezVous.classList.contains('is-open');
    const piedVisible = pied && pied.getBoundingClientRect().top < window.innerHeight;
    const enteteVisible = entete && entete.getBoundingClientRect().bottom > 0;
    const afficher = !enteteVisible && !piedVisible && !rendezVousOuvert;
    barreMobile.classList.toggle('is-visible', afficher);
    barreMobile.classList.toggle('is-hidden', !afficher);
    barreMobile.inert = !afficher;
    document.body.classList.toggle('has-mobile-bar', afficher);
  }

  if (barreMobile && 'IntersectionObserver' in window) {
    const observateurBarre = new IntersectionObserver(() => actualiserBarreMobile(), { threshold: 0.02 });
    observateurBarre.observe(entete);
    observateurBarre.observe(pied);
    observateurBarre.observe(sectionRendezVous);
  }
  let miseAJourBarrePlanifiee = false;
  function planifierMiseAJourBarre() {
    if (miseAJourBarrePlanifiee) return;
    miseAJourBarrePlanifiee = true;
    requestAnimationFrame(() => {
      miseAJourBarrePlanifiee = false;
      actualiserBarreMobile();
    });
  }
  window.addEventListener('scroll', planifierMiseAJourBarre, { passive: true });
  window.addEventListener('resize', planifierMiseAJourBarre, { passive: true });
  actualiserBarreMobile();
})();
