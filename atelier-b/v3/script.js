(() => {
  const racine = document.documentElement;
  racine.classList.add('js');

  const preferencesMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  window.requestAnimationFrame(() => racine.classList.add('pret'));

  const menuBouton = document.querySelector('.sommaire__bouton');
  const navigation = document.querySelector('#navigation');

  function fermerSommaire(rendreFocus = false) {
    if (!menuBouton || !navigation) return;
    menuBouton.setAttribute('aria-expanded', 'false');
    menuBouton.setAttribute('aria-label', 'Ouvrir le sommaire');
    navigation.classList.remove('is-open');
    if (rendreFocus) menuBouton.focus();
  }

  if (menuBouton && navigation) {
    menuBouton.addEventListener('click', () => {
      const ouvert = menuBouton.getAttribute('aria-expanded') === 'true';
      menuBouton.setAttribute('aria-expanded', String(!ouvert));
      menuBouton.setAttribute('aria-label', ouvert ? 'Ouvrir le sommaire' : 'Fermer le sommaire');
      navigation.classList.toggle('is-open', !ouvert);
      if (!ouvert) navigation.querySelector('a')?.focus();
    });
    navigation.addEventListener('click', (event) => {
      const lien = event.target.closest('a');
      if (!lien) return;
      const destination = lien.getAttribute('href');
      const cible = destination && destination.startsWith('#') ? document.querySelector(destination) : null;
      const titre = cible?.matches('h1, h2, h3') ? cible : cible?.querySelector('h1, h2, h3');
      fermerSommaire(false);
      if (titre) {
        titre.setAttribute('tabindex', '-1');
        window.requestAnimationFrame(() => titre.focus({ preventScroll: true }));
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') fermerSommaire(true);
    });
  }

  const blocsRevelation = document.querySelectorAll('[data-revelation], .completer[data-revelation]');
  if ('IntersectionObserver' in window && !preferencesMouvement.matches) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('revele');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -5% 0px' });
    blocsRevelation.forEach((bloc) => observateurRevelation.observe(bloc));
  } else {
    blocsRevelation.forEach((bloc) => bloc.classList.add('revele'));
  }

  const ligneLecture = document.querySelector('[data-ligne-lecture]');
  let defilementDemande = false;
  function actualiserLecture() {
    if (!ligneLecture || preferencesMouvement.matches) return;
    if (defilementDemande) return;
    defilementDemande = true;
    window.requestAnimationFrame(() => {
      const hauteurDefilable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progression = Math.min(1, Math.max(0, window.scrollY / hauteurDefilable));
      ligneLecture.style.transform = `scaleY(${progression})`;
      defilementDemande = false;
    });
  }
  window.addEventListener('scroll', actualiserLecture, { passive: true });
  window.addEventListener('resize', actualiserLecture, { passive: true });
  actualiserLecture();

  const barreMobile = document.querySelector('.barre-mobile');
  const declencheurBarre = document.querySelector('.ouverture__liens');
  const zoneReservation = document.querySelector('.reservation');
  const pied = document.querySelector('.pied');
  if (barreMobile && 'IntersectionObserver' in window) {
    const zones = new Map([[declencheurBarre, false], [zoneReservation, false], [pied, false]].filter(([element]) => element));
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => zones.set(entree.target, entree.isIntersecting));
      const masquer = Boolean(zones.get(declencheurBarre)) || Boolean(zones.get(zoneReservation)) || Boolean(zones.get(pied));
      barreMobile.classList.toggle('est-masquee', masquer);
    }, { threshold: 0.02 });
    zones.forEach((_, element) => observateurBarre.observe(element));
    barreMobile.classList.add('est-masquee');
  } else if (barreMobile) {
    barreMobile.classList.add('est-masquee');
  }

  const cadreReservation = document.querySelector('[data-reservation]');
  if (!cadreReservation) return;

  const contenuEtape = cadreReservation.querySelector('[data-contenu-etape]');
  const selectionTexte = cadreReservation.querySelector('[data-selection]');
  const indicateurs = Array.from(cadreReservation.querySelectorAll('[data-indicateur]'));
  const prestations = [
    { id: 'shampoing-coupe', nom: 'Shampoing Coupe', duree: 30 },
    { id: 'coupe-brushing', nom: 'Shampoing Coupe Brushing - Cheveux courts/mi-long', duree: 30 },
    { id: 'couleur-coupe-brushing', nom: 'Couleur Coupe Brushing - Cheveux courts/mi-longs', duree: 90 }
  ];
  const fuseau = 'Europe/Paris';
  const etat = { etape: 0, prestation: prestations[0].id, jour: '', heure: '', prenom: '', telephone: '' };

  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere]));
  }

  function partiesParis(date) {
    const elements = new Intl.DateTimeFormat('fr-FR', {
      timeZone: fuseau,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(elements.map((partie) => [partie.type, partie.value]));
  }

  function isoParis(date) {
    const parties = partiesParis(date);
    return `${parties.year}-${parties.month}-${parties.day}`;
  }

  function joursAffiches() {
    const aujourdhui = partiesParis(new Date());
    const base = Date.UTC(Number(aujourdhui.year), Number(aujourdhui.month) - 1, Number(aujourdhui.day), 12);
    return Array.from({ length: 14 }, (_, decalage) => {
      const date = new Date(base + decalage * 86400000);
      const jourSemaine = date.getUTCDay();
      const estOuvert = jourSemaine >= 2 && jourSemaine <= 6;
      const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      const nomCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'short' }).format(date);
      const nomComplet = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, weekday: 'long' }).format(date);
      const jour = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, day: 'numeric' }).format(date);
      const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, month: 'short' }).format(date);
      const moisComplet = new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, month: 'long' }).format(date);
      const capitale = (mot) => mot.charAt(0).toLocaleUpperCase('fr-FR') + mot.slice(1).replace('.', '');
      return { iso, jourSemaine, estOuvert, nomCourt: capitale(nomCourt), nomComplet: capitale(nomComplet), jour, moisCourt: capitale(moisCourt), moisComplet: capitale(moisComplet) };
    });
  }

  function prestationChoisie() {
    return prestations.find((prestation) => prestation.id === etat.prestation) || prestations[0];
  }

  function jourChoisi() {
    return joursAffiches().find((jour) => jour.iso === etat.jour) || null;
  }

  function heuresLocales(date = new Date()) {
    const elements = new Intl.DateTimeFormat('fr-FR', {
      timeZone: fuseau,
      numberingSystem: 'latn',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const parties = Object.fromEntries(elements.map((partie) => [partie.type, partie.value]));
    return Number(parties.hour) * 60 + Number(parties.minute);
  }

  function listeHeures(jour) {
    if (!jour || !jour.estOuvert) return [];
    const ouverture = 9 * 60;
    const fermeture = jour.jourSemaine === 6 ? 17 * 60 : 18 * 60 + 30;
    const duree = prestationChoisie().duree;
    const maintenant = jour.iso === isoParis(new Date()) ? heuresLocales() : -1;
    const resultat = [];
    for (let minute = ouverture; minute + duree <= fermeture; minute += 30) {
      resultat.push({
        heure: `${String(Math.floor(minute / 60)).padStart(2, '0')} h ${String(minute % 60).padStart(2, '0')}`,
        estPasse: minute <= maintenant
      });
    }
    return resultat;
  }

  function mettreAJourSelection() {
    const prestation = prestationChoisie();
    const jour = jourChoisi();
    const morceaux = [`${prestation.nom} · ${prestation.duree} min`];
    if (jour) morceaux.push(`${jour.nomComplet} ${jour.jour} ${jour.moisComplet}`);
    if (etat.heure) morceaux.push(etat.heure);
    selectionTexte.textContent = morceaux.join(' · ');
  }

  function mettreAJourIndicateurs() {
    indicateurs.forEach((indicateur, index) => {
      if (index === Math.min(etat.etape, indicateurs.length - 1)) indicateur.setAttribute('aria-current', 'step');
      else indicateur.removeAttribute('aria-current');
    });
  }

  function afficherEtape(html, titreCible) {
    contenuEtape.innerHTML = `<div class="etape">${html}</div>`;
    const etape = contenuEtape.firstElementChild;
    window.requestAnimationFrame(() => etape.classList.add('etape--visible'));
    mettreAJourIndicateurs();
    mettreAJourSelection();
    const titre = contenuEtape.querySelector(titreCible);
    if (titre) window.setTimeout(() => titre.focus(), preferencesMouvement.matches ? 0 : 80);
  }

  function listeDatesHtml() {
    const dates = joursAffiches();
    if (!etat.jour) etat.jour = dates.find((jour) => jour.estOuvert)?.iso || '';
    return dates.map((jour) => {
      const choisi = etat.jour === jour.iso;
      const etiquette = `${jour.nomComplet} ${jour.jour} ${jour.moisComplet}${jour.estOuvert ? '' : ', fermé'}`;
      return `<button class="jour" type="button" data-jour="${jour.iso}" aria-label="${echapper(etiquette)}" aria-pressed="${choisi}"${jour.estOuvert ? '' : ' disabled'}><span class="jour__nom">${jour.nomCourt}</span><span class="jour__date">${jour.jour}</span><span class="jour__mois">${jour.moisCourt}</span>${jour.estOuvert ? '' : '<span class="jour__etat">Fermé</span>'}</button>`;
    }).join('');
  }

  function heuresHtml() {
    const jour = jourChoisi();
    const heures = listeHeures(jour);
    if (!jour) return '<p class="etape__aide">Choisissez un jour ouvert.</p>';
    if (!heures.length) return '<p class="etape__aide">Aucun créneau de démonstration ne reste aujourd’hui. Choisissez un autre jour.</p>';
    return `<h5 class="etape__titre">Heures de démonstration</h5><div class="liste-creneaux" role="group" aria-label="Heures de démonstration">${heures.map((creneau) => `<button class="creneau" type="button" data-heure="${creneau.heure}" aria-label="${creneau.heure}${creneau.estPasse ? ', heure passée' : ''}" aria-pressed="${etat.heure === creneau.heure}"${creneau.estPasse ? ' disabled' : ''}><span>${creneau.heure}</span>${creneau.estPasse ? '<span class="creneau__etat">Passé</span>' : ''}</button>`).join('')}</div>`;
  }

  function afficherPrestations() {
    const options = prestations.map((prestation, index) => {
      const coche = prestation.id === etat.prestation ? ' checked' : '';
      return `<label class="choix-prestation"><input type="radio" name="prestation" value="${prestation.id}"${coche}><span class="choix-prestation__nom">${prestation.nom}</span><span class="choix-prestation__duree">${prestation.duree} min</span></label>`;
    }).join('');
    afficherEtape(`<fieldset><legend class="etape__titre" id="titre-etape" tabindex="-1">Choisir une prestation publiée</legend><p class="etape__aide" id="aide-prestations">Durée affichée sur Planity. Aucun prix dans cette simulation.</p>${options}</fieldset><div class="etape__actions"><span></span><button class="action-etape action-etape--principale" type="button" data-action="suivant">Choisir un jour <span aria-hidden="true">→</span></button></div>`, '#titre-etape');
  }

  function afficherJours() {
    etat.jour = jourChoisi()?.iso || joursAffiches().find((jour) => jour.estOuvert)?.iso || '';
    const htmlDates = listeDatesHtml();
    afficherEtape(`<h4 class="etape__titre" id="titre-etape" tabindex="-1">Choisir un jour</h4><p class="etape__aide" id="aide-jours">Jours calculés depuis aujourd’hui. Le parcours et les disponibilités restent fictifs.</p><div class="liste-jours" role="group" aria-label="Jours de démonstration">${htmlDates}</div><div data-heures>${heuresHtml()}</div><div class="etape__actions"><button class="action-etape" type="button" data-action="precedent"><span aria-hidden="true">←</span> Prestation</button><button class="action-etape action-etape--principale" type="button" data-action="suivant"${etat.heure ? '' : ' disabled'}>Coordonnées <span aria-hidden="true">→</span></button></div>`, '#titre-etape');
    const suivant = contenuEtape.querySelector('[data-action="suivant"]');
    if (suivant && !etat.heure) suivant.disabled = true;
  }

  function afficherCoordonnees() {
    const jour = jourChoisi();
    if (!jour || !etat.heure) {
      etat.etape = 1;
      afficherJours();
      return;
    }
    const nomJour = `${jour.nomComplet} ${jour.jour} ${jour.moisComplet}`;
    const recapitulatif = `<div class="resume-demande"><p><strong>Prestation</strong> · ${echapper(prestationChoisie().nom)}</p><p><strong>Jour</strong> · ${echapper(nomJour)}</p><p><strong>Heure</strong> · ${echapper(etat.heure)}</p></div>`;
    const prenom = echapper(etat.prenom);
    const telephone = echapper(etat.telephone);
    afficherEtape(`<h4 class="etape__titre" id="titre-etape" tabindex="-1">Coordonnées de démonstration</h4><p class="etape__aide">Ces renseignements restent dans votre navigateur et seront effacés à la fermeture de la page.</p>${recapitulatif}<form data-formulaire novalidate><label class="champ" for="prenom">Prénom<input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${prenom}" aria-describedby="erreur-prenom" required><span class="erreur-champ" id="erreur-prenom" aria-live="polite"></span></label><label class="champ" for="telephone">Téléphone portable<input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Votre numéro" value="${telephone}" aria-describedby="erreur-telephone" required><span class="erreur-champ" id="erreur-telephone" aria-live="polite"></span></label><div class="etape__actions"><button class="action-etape" type="button" data-action="precedent"><span aria-hidden="true">←</span> Jour et heure</button><button class="action-etape action-etape--principale" type="submit">Terminer la simulation <span aria-hidden="true">→</span></button></div></form>`, '#titre-etape');
    const formulaire = contenuEtape.querySelector('[data-formulaire]');
    formulaire.addEventListener('input', (event) => {
      if (event.target.name === 'prenom') etat.prenom = event.target.value.trim();
      if (event.target.name === 'telephone') etat.telephone = event.target.value.trim();
      const erreur = contenuEtape.querySelector(`#erreur-${event.target.name}`);
      if (erreur) erreur.textContent = '';
      event.target.removeAttribute('aria-invalid');
    });
    formulaire.addEventListener('submit', (event) => {
      event.preventDefault();
      validerCoordonnees(formulaire);
    });
  }

  function telephoneValide(telephone) {
    const chiffres = telephone.replace(/\D/g, '');
    const international = /^\s*\+33/.test(telephone);
    return international ? chiffres.length === 11 && chiffres.startsWith('336') || chiffres.length === 11 && chiffres.startsWith('337') : chiffres.length === 10 && (chiffres.startsWith('06') || chiffres.startsWith('07'));
  }

  function validerCoordonnees(formulaire) {
    const champPrenom = formulaire.elements.namedItem('prenom');
    const champTelephone = formulaire.elements.namedItem('telephone');
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const erreurPrenom = contenuEtape.querySelector('#erreur-prenom');
    const erreurTelephone = contenuEtape.querySelector('#erreur-telephone');
    let valide = true;
    etat.prenom = prenom;
    etat.telephone = telephone;
    if (prenom.length < 2) {
      erreurPrenom.textContent = 'Saisissez un prénom de deux lettres au minimum.';
      champPrenom.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      erreurPrenom.textContent = '';
      champPrenom.removeAttribute('aria-invalid');
    }
    if (!telephoneValide(telephone)) {
      erreurTelephone.textContent = 'Saisissez un numéro de portable français commençant par 06 ou 07.';
      champTelephone.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      erreurTelephone.textContent = '';
      champTelephone.removeAttribute('aria-invalid');
    }
    if (!valide) {
      (prenom.length < 2 ? champPrenom : champTelephone).focus();
      return;
    }
    etat.etape = 3;
    afficherConfirmation();
  }

  function afficherConfirmation() {
    const jour = jourChoisi();
    const date = jour ? `${jour.nomComplet} ${jour.jour} ${jour.moisComplet}` : '';
    const morceaux = [prestationChoisie().nom, date, etat.heure];
    afficherEtape(`<div class="fin-simulation"><h4 id="titre-etape" tabindex="-1">Simulation terminée.</h4><p>Merci ${echapper(etat.prenom)}. Votre sélection reste affichée sur cet appareil.</p><div class="resume-demande">${morceaux.map((morceau) => `<p>${echapper(morceau)}</p>`).join('')}</div><p>Aucun rendez-vous n’a été pris et aucun renseignement n’a été envoyé.</p><a href="https://www.planity.com/atelier-b-14000-caen" target="_blank" rel="noopener">Prendre le rendez-vous réel sur Planity <span aria-hidden="true">↗</span></a></div>`, '#titre-etape');
    mettreAJourIndicateurs();
    selectionTexte.textContent = 'Parcours de démonstration terminé. Rien n’a été transmis.';
  }

  function mettreAJourHeuresEtResume() {
    const zoneHeures = contenuEtape.querySelector('[data-heures]');
    if (zoneHeures) zoneHeures.innerHTML = heuresHtml();
    const suivant = contenuEtape.querySelector('[data-action="suivant"]');
    if (suivant) suivant.disabled = !etat.heure;
    mettreAJourSelection();
  }

  contenuEtape.addEventListener('change', (event) => {
    if (event.target.matches('input[name="prestation"]')) {
      etat.prestation = event.target.value;
      etat.heure = '';
      mettreAJourSelection();
    }
  });

  contenuEtape.addEventListener('click', (event) => {
    const bouton = event.target.closest('button');
    if (!bouton) return;
    if (bouton.dataset.jour) {
      etat.jour = bouton.dataset.jour;
      etat.heure = '';
      contenuEtape.querySelectorAll('[data-jour]').forEach((jour) => jour.setAttribute('aria-pressed', String(jour.dataset.jour === etat.jour)));
      mettreAJourHeuresEtResume();
      return;
    }
    if (bouton.dataset.heure) {
      etat.heure = bouton.dataset.heure;
      contenuEtape.querySelectorAll('[data-heure]').forEach((heure) => heure.setAttribute('aria-pressed', String(heure.dataset.heure === etat.heure)));
      const suivant = contenuEtape.querySelector('[data-action="suivant"]');
      if (suivant) suivant.disabled = false;
      mettreAJourSelection();
      return;
    }
    if (bouton.dataset.action === 'suivant') {
      if (etat.etape === 0) {
        etat.etape = 1;
        afficherJours();
      } else if (etat.etape === 1 && etat.heure) {
        etat.etape = 2;
        afficherCoordonnees();
      }
    }
    if (bouton.dataset.action === 'precedent') {
      if (etat.etape === 1) {
        etat.etape = 0;
        afficherPrestations();
      } else if (etat.etape === 2) {
        etat.etape = 1;
        afficherJours();
      }
    }
  });

  document.querySelectorAll('a[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      if (!prestations.some((prestation) => prestation.id === lien.dataset.prestation)) return;
      etat.prestation = lien.dataset.prestation;
      etat.heure = '';
      etat.etape = 0;
      afficherPrestations();
    });
  });

  afficherPrestations();
})();
