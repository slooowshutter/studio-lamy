/* Maxime Dayan. Simulation locale : aucune requête, aucune donnée conservée. */
(() => {
  'use strict';
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let auClavier = false;
  document.addEventListener('keydown', () => { auClavier = true; }, { capture: true });
  document.addEventListener('pointerdown', () => { auClavier = false; }, { capture: true, passive: true });

  // Les lignes et les cadres arrivent une seule fois, après la mise en place des polices.
  const ouvrir = () => requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret')));
  if (document.fonts) Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 550))]).then(ouvrir);
  else ouvrir();
  if ('IntersectionObserver' in window && !mouvementReduit.matches) {
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.remove('attente');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    $$('[data-revelation]').forEach((element, index) => {
      element.classList.add('attente');
      if (element.dataset.revelation === 'ligne') element.style.transitionDelay = `${(index % 3) * 60}ms`;
      observateur.observe(element);
    });
  }

  const prestations = [
    { id: 'brushing', nom: 'Shampoing, soin et brushing', precision: 'Femme · Cheveux courts', duree: 20 },
    { id: 'coupe', nom: 'Shampoing, soin, coupe et brushing', precision: 'Femme · Cheveux courts', duree: 45 },
    { id: 'homme', nom: 'Coupe, shampoing et coiffage', precision: 'Homme', duree: 35 },
    { id: 'relooking', nom: 'Relooking coiffure', precision: 'Conseils en colorimétrie, coloration et coupe', duree: 180 }
  ];
  // Source : Planity, 02/11/2026. Lundi–vendredi 11 h 30–19 h 30. Week-end fermé.
  const horaires = { 1: [690, 1170], 2: [690, 1170], 3: [690, 1170], 4: [690, 1170], 5: [690, 1170] };
  const etat = { etape: 0, prestation: '', jour: '', heure: null, prenom: '', telephone: '', termine: false };
  const formulaire = $('#formulaire');
  const feuillet = $('#feuillet');
  const continuer = $('#continuer');
  const retour = $('#retour');
  const annonce = $('#annonce');
  const parcours = $('.parcours');
  let changement = false;
  let numeroHistorique = 0;
  let etapeAtteinte = 0;
  history.replaceState({ ...(history.state || {}), maximeEtape: 0, maximeNumero: 0 }, '');
  const espace = '\u00a0';
  const formatJour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const formatCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const horlogeParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const echapper = texte => String(texte).replace(/[&<>"']/g, lettre => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[lettre]));
  const nomHeure = minutes => `${Math.floor(minutes / 60)}${espace}h${minutes % 60 ? espace + String(minutes % 60).padStart(2, '0') : ''}`;
  const nomDuree = minutes => minutes === 180 ? `3${espace}h` : `${minutes}${espace}min`;
  const dateDe = cle => new Date(`${cle}T12:00:00Z`);
  const prestationChoisie = () => prestations.find(prestation => prestation.id === etat.prestation);

  function maintenantParis() {
    const parties = {};
    horlogeParis.formatToParts(new Date()).forEach(partie => { parties[partie.type] = partie.value; });
    return { cle: `${parties.year}-${parties.month}-${parties.day}`, minutes: Number(parties.hour) * 60 + Number(parties.minute) };
  }
  function joursProchains() {
    const depart = dateDe(maintenantParis().cle);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(depart.getTime() + index * 86400000);
      return { date, cle: date.toISOString().slice(0, 10), ouvert: Boolean(horaires[date.getUTCDay()]) };
    });
  }
  function creneauxPour(cle, prestation = prestationChoisie()) {
    if (!cle || !prestation) return [];
    const fenetre = horaires[dateDe(cle).getUTCDay()];
    if (!fenetre) return [];
    const actuel = maintenantParis();
    const nombreJour = Math.floor(dateDe(cle).getTime() / 86400000);
    const resultat = [];
    for (let minute = fenetre[0]; minute + prestation.duree <= fenetre[1]; minute += 30) {
      const passe = cle < actuel.cle || (cle === actuel.cle && minute <= actuel.minutes);
      // Indisponibilités fictives déterministes : aucune lecture d’un agenda réel.
      const occupe = (nombreJour + minute / 30 + prestation.duree) % 5 === 0;
      resultat.push({ minute, indisponible: passe || occupe, motif: passe ? 'Passé' : occupe ? 'Déjà pris' : '' });
    }
    return resultat;
  }
  function heureValide() {
    return creneauxPour(etat.jour).some(creneau => creneau.minute === etat.heure && !creneau.indisponible);
  }
  function jourValide() {
    return joursProchains().some(jour => jour.cle === etat.jour && jour.ouvert && creneauxPour(jour.cle).some(creneau => !creneau.indisponible));
  }
  function annoncer(texte) { annonce.textContent = texte; }
  function etapeAccessible(index) {
    if (index === 0) return true;
    if (!prestationChoisie()) return false;
    if (index === 1) return true;
    if (!jourValide()) return false;
    return index === 2 || heureValide();
  }
  function resumer() {
    $('#resume-prestation').textContent = prestationChoisie() ? `${prestationChoisie().nom} · ${nomDuree(prestationChoisie().duree)}` : 'À choisir';
    $('#resume-jour').textContent = etat.jour ? formatJour.format(dateDe(etat.jour)) : 'À choisir';
    $('#resume-heure').textContent = etat.heure !== null ? nomHeure(etat.heure) : 'À choisir';
    $$('.etapes button').forEach((bouton, index) => {
      bouton.disabled = etat.termine || index > etapeAtteinte || !etapeAccessible(index);
      if (index === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function erreur(identifiant, texte) {
    const cible = $(`#${identifiant}`);
    if (cible) cible.textContent = texte;
    annoncer(texte);
  }
  function titre(texte, aide) {
    return `<h3 tabindex="-1" id="titre-etape">${texte}</h3><p class="aide-etape">${aide}</p>`;
  }
  function dessinerPrestation() {
    return titre('Quelle prestation\u00a0?', 'Choisissez une prestation pour essayer le parcours, sans prise de rendez-vous.') +
      `<fieldset><legend class="sr-seul">La prestation</legend><div class="choix-prestations">${prestations.map(prestation => `<label class="choix-prestation"><input type="radio" name="prestation" value="${prestation.id}" ${etat.prestation === prestation.id ? 'checked' : ''} aria-describedby="erreur-choix"><span>${prestation.nom}<small>${prestation.precision} · ${nomDuree(prestation.duree)}</small></span></label>`).join('')}</div></fieldset><p class="erreur" id="erreur-choix"></p>`;
  }
  function dessinerJours() {
    const liste = joursProchains();
    return titre('Quel jour\u00a0?', 'Quatorze jours à parcourir. Horaires Planity à confirmer ; jours fériés à vérifier auprès du salon.') +
      `<fieldset><legend class="sr-seul">Le jour du rendez-vous fictif</legend><div class="jours">${liste.map(jour => {
        const reste = jour.ouvert && creneauxPour(jour.cle).some(creneau => !creneau.indisponible);
        const statut = !jour.ouvert ? 'Fermé' : !reste ? 'Complet' : '';
        return `<label class="choix-case"><input type="radio" name="jour" value="${jour.cle}" ${reste ? '' : 'disabled'} ${etat.jour === jour.cle ? 'checked' : ''} aria-label="${echapper(formatJour.format(jour.date))}${statut ? ' : ' + statut : ''}" aria-describedby="erreur-choix"><span><span>${formatCourt.format(jour.date)}</span><b>${jour.date.getUTCDate()}</b><span>${formatMois.format(jour.date)}</span><small>${statut || (jour.cle === maintenantParis().cle ? 'Aujourd’hui' : 'Choisir')}</small></span></label>`;
      }).join('')}</div></fieldset><p class="erreur" id="erreur-choix"></p>`;
  }
  function dessinerHeures() {
    const liste = creneauxPour(etat.jour);
    const groupes = [{ nom: 'Avant midi', test: minute => minute < 720 }, { nom: 'L’après-midi', test: minute => minute >= 720 }];
    return titre('À quelle heure\u00a0?', `${echapper(formatJour.format(dateDe(etat.jour)))}. Ces horaires sont fictifs ; les mentions «\u00a0déjà pris\u00a0» servent uniquement à l’essai.`) +
      groupes.map(groupe => {
        const heures = liste.filter(creneau => groupe.test(creneau.minute));
        if (!heures.length) return '';
        return `<fieldset class="groupe-heures"><legend>${groupe.nom}</legend><div class="horaires-choix">${heures.map(creneau => `<label class="choix-case"><input type="radio" name="heure" value="${creneau.minute}" ${creneau.indisponible ? 'disabled' : ''} ${etat.heure === creneau.minute ? 'checked' : ''} aria-label="${nomHeure(creneau.minute)}${creneau.motif ? ' : ' + creneau.motif : ''}" aria-describedby="erreur-choix"><span><span>${nomHeure(creneau.minute)}</span>${creneau.motif ? `<small>${creneau.motif}</small>` : ''}</span></label>`).join('')}</div></fieldset>`;
      }).join('') + '<p class="erreur" id="erreur-choix"></p>';
  }
  function dessinerCoordonnees() {
    return titre('Relire votre sélection.', 'Des coordonnées d’essai suffisent. Elles restent dans cette page et seront effacées à la fin de la simulation.') +
      `<div class="recapitulatif"><p>${echapper(prestationChoisie().nom)} · ${nomDuree(prestationChoisie().duree)}</p><p>${echapper(formatJour.format(dateDe(etat.jour)))} à ${nomHeure(etat.heure)}</p><p>Maxime Dayan · 24 Rue Sainte-Foy, 75002 Paris</p></div><div class="champ"><label for="prenom">Prénom</label><input id="prenom" name="prenom" autocomplete="given-name" maxlength="60" value="${echapper(etat.prenom)}" aria-describedby="erreur-prenom" required><p class="erreur" id="erreur-prenom"></p></div><div class="champ"><label for="telephone">Téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" value="${echapper(etat.telephone)}" aria-describedby="erreur-telephone" required><p class="erreur" id="erreur-telephone"></p></div><p class="aide-etape" style="margin-top:18px">Terminer cet essai ne réserve aucun créneau au salon.</p>`;
  }
  const dessins = [dessinerPrestation, dessinerJours, dessinerHeures, dessinerCoordonnees];
  function dessiner(focaliser = false) {
    feuillet.innerHTML = dessins[etat.etape]();
    continuer.innerHTML = etat.etape === 3 ? 'Terminer l’essai <span aria-hidden="true">→</span>' : 'Continuer <span aria-hidden="true">→</span>';
    retour.hidden = etat.etape === 0;
    resumer();
    if (focaliser) $('#titre-etape').focus({ preventScroll: true });
  }
  function memoriserCoordonnees() {
    if ($('#prenom')) etat.prenom = $('#prenom').value;
    if ($('#telephone')) etat.telephone = $('#telephone').value;
  }
  async function aller(etape, options = {}) {
    if (changement || etat.termine) return;
    if (!prestationChoisie()) etape = 0;
    else if (!jourValide()) etape = Math.min(etape, 1);
    else if (!heureValide()) etape = Math.min(etape, 2);
    memoriserCoordonnees();
    changement = true;
    const sansMouvement = mouvementReduit.matches || auClavier || options.instantane;
    parcours.classList.toggle('sans-animation', Boolean(sansMouvement));
    if (!sansMouvement) {
      feuillet.classList.add('sortie');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    etat.etape = etape;
    etapeAtteinte = Math.max(etapeAtteinte, etape);
    if (options.historique !== false) {
      numeroHistorique += 1;
      history.pushState({ maximeEtape: etape, maximeNumero: numeroHistorique }, '', '#simulation');
    }
    feuillet.classList.remove('sortie');
    if (!sansMouvement) feuillet.classList.add('entree');
    dessiner(true);
    annoncer(`Étape ${etape + 1} sur 4. ${$('#titre-etape').textContent}`);
    const position = $('#titre-etape').getBoundingClientRect();
    if (position.top < 24 || position.top > window.innerHeight - 160) $('#titre-etape').scrollIntoView({ block: 'start', behavior: 'instant' });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      feuillet.classList.remove('entree');
      changement = false;
    }));
  }
  function terminer() {
    etat.termine = true;
    etat.prenom = '';
    etat.telephone = '';
    parcours.classList.add('parcours-termine');
    feuillet.innerHTML = `<div class="succes">${titre('Essai terminé.', 'Aucun rendez-vous n’a été pris.')}<p>${echapper(prestationChoisie().nom)}<br>${echapper(formatJour.format(dateDe(etat.jour)))} à ${nomHeure(etat.heure)}.</p><p class="note">Vos coordonnées d’essai sont effacées. Pour un vrai rendez-vous, contactez le salon.</p><a class="lien-trace" href="https://maximedayan.mytreatwell.fr/" target="_blank" rel="noopener">Réserver sur Treatwell <span aria-hidden="true">↗</span></a></div>`;
    $('.actions-parcours').hidden = true;
    resumer();
    $('#titre-etape').focus({ preventScroll: true });
    annoncer('Essai terminé. Aucun rendez-vous pris, aucune donnée envoyée.');
    const recommencer = document.createElement('button');
    recommencer.type = 'button';
    recommencer.className = 'retour lien-trace';
    recommencer.textContent = 'Recommencer l’essai';
    recommencer.addEventListener('click', () => {
      etat.termine = false;
      etat.etape = 0;
      etat.prestation = '';
      etat.jour = '';
      etat.heure = null;
      etapeAtteinte = 0;
      parcours.classList.remove('parcours-termine');
      $('.actions-parcours').hidden = false;
      dessiner(true);
      annoncer('Nouvel essai. Étape 1 sur 4.');
    });
    $('.succes').appendChild(recommencer);
  }

  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'prestation') {
      etat.prestation = champ.value;
      etat.heure = null;
      etapeAtteinte = Math.min(etapeAtteinte, 1);
    }
    if (champ.name === 'jour') { etat.jour = champ.value; etat.heure = null; etapeAtteinte = Math.min(etapeAtteinte, 2); }
    if (champ.name === 'heure') etat.heure = Number(champ.value);
    if ($('#erreur-choix')) $('#erreur-choix').textContent = '';
    resumer();
  });
  formulaire.addEventListener('input', evenement => {
    if (evenement.target.matches('#prenom, #telephone')) {
      evenement.target.removeAttribute('aria-invalid');
      $(`#erreur-${evenement.target.id}`).textContent = '';
    }
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (changement || etat.termine) return;
    if (etat.etape === 0 && !prestationChoisie()) { erreur('erreur-choix', 'Choisissez une prestation pour continuer.'); $('[name="prestation"]').focus(); return; }
    if (etat.etape === 1 && !jourValide()) {
      etat.jour = '';
      etat.heure = null;
      dessiner();
      erreur('erreur-choix', 'Choisissez un jour avec un créneau d’essai encore disponible.');
      $('[name="jour"]:not(:disabled)')?.focus();
      return;
    }
    if (etat.etape === 2 && !jourValide()) {
      etat.jour = '';
      etat.heure = null;
      aller(1).then(() => erreur('erreur-choix', 'Choisissez un nouveau jour pour poursuivre cet essai.'));
      return;
    }
    if (etat.etape === 2 && !heureValide()) {
      etat.heure = null;
      dessiner();
      erreur('erreur-choix', 'Choisissez une heure encore disponible dans cette simulation.');
      $('[name="heure"]:not(:disabled)')?.focus();
      return;
    }
    if (etat.etape === 3) {
      memoriserCoordonnees();
      const prenom = etat.prenom.trim();
      const telephone = etat.telephone.replace(/[\s().-]/g, '');
      const prenomValide = prenom.length > 0;
      const telephoneValide = /^(?:0|\+33|0033)[1-9]\d{8}$/.test(telephone);
      $('#erreur-prenom').textContent = prenomValide ? '' : 'Indiquez un prénom pour cet essai.';
      $('#erreur-telephone').textContent = telephoneValide ? '' : 'Indiquez un numéro français à dix chiffres ou commençant par +33.';
      $('#prenom').setAttribute('aria-invalid', String(!prenomValide));
      $('#telephone').setAttribute('aria-invalid', String(!telephoneValide));
      if (!prenomValide || !telephoneValide) {
        (prenomValide ? $('#telephone') : $('#prenom')).focus();
        annoncer('Vérifiez les coordonnées d’essai indiquées.');
        return;
      }
      if (!jourValide() || !heureValide()) {
        etat.heure = null;
        aller(jourValide() ? 2 : 1).then(() => annoncer('Le temps a passé : choisissez un nouveau créneau fictif.'));
        return;
      }
      terminer();
      return;
    }
    aller(etat.etape + 1);
  });
  retour.addEventListener('click', () => aller(Math.max(0, etat.etape - 1)));
  $$('.etapes button').forEach(bouton => bouton.addEventListener('click', () => aller(Number(bouton.dataset.etape))));
  $$('.essai-prestation').forEach(lien => lien.addEventListener('click', () => {
    etat.prestation = lien.dataset.prestation;
    etat.heure = null;
    etapeAtteinte = 0;
    etat.termine = false;
    parcours.classList.remove('parcours-termine');
    $('.actions-parcours').hidden = false;
    aller(0, { instantane: true });
  }));
  window.addEventListener('popstate', evenement => {
    if (etat.termine || typeof evenement.state?.maximeEtape !== 'number') return;
    let cible = evenement.state.maximeEtape;
    if (!prestationChoisie()) cible = 0;
    else if (!jourValide()) cible = Math.min(cible, 1);
    else if (!heureValide()) cible = Math.min(cible, 2);
    aller(cible, { historique: false, instantane: true });
  });

  // La barre mobile n’apparaît qu’après le premier appel à l’action ; elle quitte le formulaire libre.
  const barre = $('.barre-mobile');
  if ('IntersectionObserver' in window) {
    let sousLeHero = false;
    let dansReservation = false;
    let dansPied = false;
    const actualiserBarre = () => {
      const visible = sousLeHero && !dansReservation && !dansPied;
      barre.classList.toggle('visible', visible);
      barre.inert = !visible;
    };
    const suivre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target.matches('.hero-actions')) sousLeHero = !entree.isIntersecting && entree.boundingClientRect.bottom < 0;
        if (entree.target.id === 'rendez-vous') dansReservation = entree.isIntersecting;
        if (entree.target.id === 'pied') dansPied = entree.isIntersecting;
      });
      actualiserBarre();
    });
    [$('.hero-actions'), $('#rendez-vous'), $('#pied')].forEach(element => suivre.observe(element));
    barre.inert = true;
  } else { barre.classList.add('visible'); }

  parcours.hidden = false;
  dessiner();
  window.__maximePret = true;
})();
