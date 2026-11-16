/* Doigts de Fée · simulation locale. Aucune requête, aucun stockage des coordonnées. */
(() => {
  'use strict';

  const SOINS = Object.freeze([
    { id: 'renforcement', nom: 'Gel - Renforcement ongles naturels', variante: 'Vernis coloré', minutes: 55, duree: '55\u00a0min' },
    { id: 'remplissage', nom: 'Manucure Gel / Remplissage sur ongles naturels', variante: 'Vernis coloré', minutes: 65, duree: '65\u00a0min' },
    { id: 'extension', nom: 'Gel - Extension d’ongles au chablon', variante: 'Vernis coloré', minutes: 80, duree: '80\u00a0min' }
  ]);
  // Source : https://doigtsdefee.mytreatwell.fr/ — minutes depuis minuit, heure de Paris.
  const HORAIRES = Object.freeze([null, [840, 1170], [660, 1170], [630, 1170], [630, 1170], [630, 1170], [660, 1170]]);
  const heureParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const deux = n => String(n).padStart(2, '0');

  function maintenantParis(instant = new Date()) {
    const p = Object.fromEntries(heureParis.formatToParts(instant).map(partie => [partie.type, partie.value]));
    return { jour: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateDuJour(cle) { return new Date(`${cle}T12:00:00Z`); }
  function joursSuivants(instant = new Date()) {
    const debut = dateDuJour(maintenantParis(instant).jour);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(debut.getTime() + i * 86400000);
      return { cle: date.toISOString().slice(0, 10), date };
    });
  }
  function heureFr(minutes) {
    return `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${deux(minutes % 60)}` : ''}`;
  }
  function creneaux(cle, soin, instant = new Date()) {
    const jour = dateDuJour(cle);
    const plage = HORAIRES[jour.getUTCDay()];
    if (!plage || !soin) return [];
    const maintenant = maintenantParis(instant);
    const resultat = [];
    for (let m = plage[0]; m + soin.minutes <= plage[1]; m += 30) {
      const passe = cle < maintenant.jour || (cle === maintenant.jour && m <= maintenant.minutes);
      const exemplePris = ((jour.getUTCDate() * 13 + jour.getUTCMonth() * 7 + m / 30 + soin.minutes) % 6) === 0;
      resultat.push({ minutes: m, fin: m + soin.minutes, indisponible: passe || exemplePris, raison: passe ? 'Passé' : exemplePris ? 'Exemple pris' : 'Exemple libre' });
    }
    return resultat;
  }
  function telephoneValide(numero) {
    return /^(?:0[1-9]\d{8}|(?:\+33|0033)[1-9]\d{8})$/.test(numero.replace(/[\s.()\-]/g, ''));
  }
  function prenomValide(prenom) { return prenom.trim().length > 0 && prenom.trim().length <= 70 && /\p{L}/u.test(prenom); }
  function echapper(valeur) { return String(valeur).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // Ces fonctions pures permettent de vérifier les fermetures, les durées et l’heure de Paris dans Node.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SOINS, HORAIRES, maintenantParis, dateDuJour, joursSuivants, heureFr, creneaux, telephoneValide, prenomValide };
    return;
  }

  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panneau = $('#panneau-etape');
  const formulaire = $('#formulaire-reservation');
  const statut = $('#statut-reservation');
  const etapes = $$('[data-etape]');
  let etat = { soin: null, jour: '', heure: null, prenom: '', telephone: '', termine: false };
  let etape = 0;
  let cadreAnimation = 0;
  let revision = 0;

  const animationAutorisee = () => !mouvementReduit.matches && !racine.classList.contains('clavier');
  const soinChoisi = () => SOINS.find(soin => soin.id === etat.soin);
  const dateChoisie = () => dateLongue.format(dateDuJour(etat.jour));
  const titreEtape = ['Quel soin au gel\u00a0?', 'Quel jour\u00a0?', 'À quelle heure\u00a0?', 'Pour qui\u00a0?'];
  const boutonRetour = () => etape > 0 ? '<button class="bouton bouton-secondaire" type="button" data-retour>Retour</button>' : '';
  const actions = libelle => `<p class="erreur-etape" id="erreur-etape" role="alert"></p><div class="actions-etape">${boutonRetour()}<button class="bouton" type="submit">${libelle}<span aria-hidden="true">→</span></button></div>`;

  function actualiserTexte(selecteur, texte) {
    const element = $(selecteur);
    if (element.textContent === texte) return;
    element.getAnimations?.().forEach(animation => animation.cancel());
    element.textContent = texte;
    if (animationAutorisee() && element.animate) {
      element.animate([{ opacity: .35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
      });
    }
  }
  function actualiserResume() {
    const soin = soinChoisi();
    actualiserTexte('#resume-soin', soin ? `${soin.nom} · ${soin.variante} · ${soin.duree}` : 'Un soin à choisir');
    actualiserTexte('#resume-jour', etat.jour ? dateChoisie() : 'Une date à choisir');
    actualiserTexte('#resume-heure', etat.heure !== null ? `${heureFr(etat.heure)} · heure de Paris` : 'Une heure à choisir');
    $('#resume-mobile').textContent = soin ? `Votre sélection\u00a0: ${soin.nom} · ${soin.duree}${etat.jour ? ` · ${dateChoisie()}` : ''}${etat.heure !== null ? ` · ${heureFr(etat.heure)}` : ''}. Simulation.` : 'Votre sélection se complète au fil de l’essai.';
    $('#cachet-selection').hidden = !etat.termine;
    etapes.forEach((bouton, i) => {
      const autorise = i === 0 || (i === 1 && !!etat.soin) || (i === 2 && !!etat.jour) || (i === 3 && etat.heure !== null);
      bouton.disabled = !autorise || etat.termine;
      if (i === etape && !etat.termine) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function erreurEtape(message) {
    const erreur = $('#erreur-etape');
    if (erreur) erreur.textContent = message;
  }
  function recupererCoordonnees() {
    if ($('#prenom')) etat.prenom = $('#prenom').value;
    if ($('#telephone')) etat.telephone = $('#telephone').value;
  }
  function choixSoins() {
    return `<h3 tabindex="-1" id="titre-etape">${titreEtape[0]}</h3>
      <p class="aide-etape">Variante «\u00a0Vernis coloré\u00a0» pour chaque soin. Durées publiées sur Treatwell, à confirmer. Aucun tarif dans cette simulation.</p>
      <fieldset class="groupe-choix"><legend class="sr-seulement">Choisir une prestation au gel</legend>
      ${SOINS.map(soin => `<label class="choix-soin"><input type="radio" name="soin" value="${soin.id}" ${etat.soin === soin.id ? 'checked' : ''}><span><span><strong>${echapper(soin.nom)}</strong><small>${soin.variante}</small></span><b>${soin.duree}</b></span></label>`).join('')}
      </fieldset>${actions('Choisir le jour')}`;
  }
  function choixJours() {
    const soin = soinChoisi();
    return `<h3 tabindex="-1" id="titre-etape">${titreEtape[1]}</h3>
      <p class="aide-etape">Quatorze jours à partir d’aujourd’hui, à l’heure de Paris. Horaires Treatwell à confirmer. Les disponibilités restent fictives.</p>
      <fieldset class="groupe-choix"><legend class="sr-seulement">Choisir un jour pour la simulation</legend><div class="jours">
      ${joursSuivants().map(({ cle, date }, index) => {
        const ferme = !HORAIRES[date.getUTCDay()];
        const termine = !ferme && !creneaux(cle, soin).some(creneau => !creneau.indisponible);
        const libelle = ferme ? 'Fermé' : termine ? 'Terminé' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : moisCourt.format(date);
        const accessibilite = `${dateLongue.format(date)}${ferme ? ', fermé' : termine ? ', aucun créneau restant' : ', simulation'}`;
        return `<label class="choix-jour"><input type="radio" name="jour" value="${cle}" aria-label="${accessibilite}" ${ferme || termine ? 'disabled' : ''} ${etat.jour === cle ? 'checked' : ''}><span><small>${jourCourt.format(date)}</small><b>${date.getUTCDate()}</b><em>${libelle}</em></span></label>`;
      }).join('')}
      </div></fieldset>${actions('Choisir l’heure')}`;
  }
  function choixHeures() {
    const options = creneaux(etat.jour, soinChoisi());
    const disponibles = options.filter(option => !option.indisponible).length;
    return `<h3 tabindex="-1" id="titre-etape">${titreEtape[2]}</h3>
      <p class="aide-etape">${echapper(dateChoisie())} · heure de Paris. Chaque créneau tient compte de la durée du soin. «\u00a0Exemple pris\u00a0» désigne un créneau fictif désactivé.</p>
      ${disponibles ? '' : '<p class="aide-etape">Il ne reste aucun créneau pour cet essai. Revenez au choix du jour.</p>'}
      <fieldset class="groupe-choix"><legend class="sr-seulement">Choisir une heure fictive</legend><div class="grille-heures">
      ${options.map(option => {
        const choisi = etat.heure === option.minutes;
        return `<label class="choix-heure"><input type="radio" name="heure" value="${option.minutes}" aria-label="${heureFr(option.minutes)}, ${option.raison.toLowerCase()}" ${option.indisponible ? 'disabled' : ''} ${choisi ? 'checked' : ''}><span><time datetime="${etat.jour}T${deux(Math.floor(option.minutes / 60))}:${deux(option.minutes % 60)}">${heureFr(option.minutes)}</time><small>${choisi ? 'Choisi' : option.raison}</small></span></label>`;
      }).join('')}
      </div></fieldset>${actions('Continuer')}`;
  }
  function coordonnees() {
    const soin = soinChoisi();
    return `<h3 tabindex="-1" id="titre-etape">${titreEtape[3]}</h3>
      <p class="aide-etape">Les champs servent seulement à essayer le parcours. Ils restent dans cette page et ne sont pas conservés après son rechargement. Les deux champs sont obligatoires.</p>
      <div class="recap-final"><p>${echapper(soin.nom)} · ${soin.variante} · ${soin.duree}</p><p>${echapper(dateChoisie())} à ${heureFr(etat.heure)} · simulation</p></div>
      <div class="champs"><div class="champ"><label for="prenom">Votre prénom</label><input id="prenom" name="prenom" type="text" autocomplete="given-name" maxlength="70" required aria-describedby="erreur-prenom" value="${echapper(etat.prenom)}"><p class="erreur-champ" id="erreur-prenom" role="alert"></p></div>
      <div class="champ"><label for="telephone">Votre téléphone</label><input id="telephone" name="telephone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" required aria-describedby="aide-telephone erreur-telephone" value="${echapper(etat.telephone)}"><small id="aide-telephone">Numéro français, avec 0, +33 ou 0033.</small><p class="erreur-champ" id="erreur-telephone" role="alert"></p></div></div>
      ${actions('Terminer la simulation')}`;
  }
  function resultat() {
    const soin = soinChoisi();
    return `<div class="resultat"><h3 tabindex="-1" id="titre-etape">L’essai est terminé.</h3>
      <p>Merci, ${echapper(etat.prenom.trim())}. Vous avez essayé le parcours. Rien n’a été envoyé et aucun rendez-vous n’est réservé.</p>
      <div class="recap-final"><p>${echapper(soin.nom)} · ${soin.variante} · ${soin.duree}</p><p>${echapper(dateChoisie())} à ${heureFr(etat.heure)} · sélection fictive</p></div>
      <p>Pour prendre rendez-vous chez Doigts de Fée, retrouvez les disponibilités réelles sur Treatwell ou appelez le salon.</p>
      <a class="bouton" href="https://www.treatwell.fr/salon/doigts-de-fee-gambetta/" target="_blank" rel="noopener">Réserver sur Treatwell <span aria-hidden="true">↗</span></a>
      <button class="lien" type="button" data-recommencer>Recommencer l’essai <span aria-hidden="true">↺</span></button></div>`;
  }
  function afficherEtape(destination, { focus = true, instantane = false } = {}) {
    recupererCoordonnees();
    const precedente = etape;
    etape = destination;
    const animer = animationAutorisee() && !instantane;
    const version = ++revision;
    cancelAnimationFrame(cadreAnimation);
    panneau.style.transition = 'none';
    panneau.classList.toggle('retour', destination < precedente);
    panneau.classList.toggle('changement', animer);
    panneau.innerHTML = etat.termine ? resultat() : [choixSoins, choixJours, choixHeures, coordonnees][destination]();
    actualiserResume();
    const titre = $('#titre-etape');
    // Une seule lecture de géométrie installe l’état initial et contrôle la visibilité du titre.
    const position = titre.getBoundingClientRect();
    if (focus) {
      if (position.top < 24 || position.bottom > window.innerHeight - 24) titre.scrollIntoView({ block: 'start', behavior: 'instant' });
      titre.focus({ preventScroll: true });
    }
    statut.textContent = etat.termine ? 'Simulation terminée. Aucun rendez-vous réservé.' : `Étape ${destination + 1} sur 4. ${titreEtape[destination]}`;
    if (animer) {
      cadreAnimation = requestAnimationFrame(() => {
        if (revision !== version) return;
        panneau.style.transition = '';
        panneau.classList.remove('changement');
      });
    } else panneau.style.transition = '';
  }
  function erreurChamp(id, valide, message) {
    const champ = $(`#${id}`);
    if (!champ) return;
    champ.setAttribute('aria-invalid', String(!valide));
    $(`#erreur-${id}`).textContent = valide ? '' : message;
  }
  function verifierChamp(id) {
    const champ = $(`#${id}`);
    if (!champ) return true;
    const valide = id === 'prenom' ? prenomValide(champ.value) : telephoneValide(champ.value);
    erreurChamp(id, valide, id === 'prenom' ? 'Indiquez votre prénom pour poursuivre l’essai.' : 'Vérifiez le numéro français, avec 0, +33 ou 0033 et neuf chiffres après l’indicatif.');
    return valide;
  }
  function creneauToujoursValide() {
    return etat.jour && joursSuivants().some(jour => jour.cle === etat.jour) && creneaux(etat.jour, soinChoisi()).some(option => option.minutes === etat.heure && !option.indisponible);
  }

  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'soin') {
      if (etat.soin !== champ.value) { etat.soin = champ.value; etat.jour = ''; etat.heure = null; }
    } else if (champ.name === 'jour') {
      if (etat.jour !== champ.value) { etat.jour = champ.value; etat.heure = null; }
    } else if (champ.name === 'heure') {
      etat.heure = Number(champ.value);
      $$('.choix-heure').forEach(label => {
        const input = $('input', label);
        const option = creneaux(etat.jour, soinChoisi()).find(creneau => creneau.minutes === Number(input.value));
        $('small', label).textContent = input.checked ? 'Choisi' : option.raison;
      });
    }
    erreurEtape('');
    actualiserResume();
  });
  formulaire.addEventListener('input', evenement => {
    if (evenement.target.name === 'prenom' || evenement.target.name === 'telephone') {
      recupererCoordonnees();
      if (evenement.target.getAttribute('aria-invalid') === 'true') verifierChamp(evenement.target.id);
    }
  });
  formulaire.addEventListener('focusout', evenement => {
    if (evenement.target.id === 'prenom' || evenement.target.id === 'telephone') verifierChamp(evenement.target.id);
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.termine) return;
    if (etape === 0 && !etat.soin) { erreurEtape('Choisissez un soin pour poursuivre la simulation.'); return; }
    if (etape === 1 && !etat.jour) { erreurEtape('Choisissez un jour pour poursuivre la simulation.'); return; }
    if (etape === 2 && etat.heure === null) { erreurEtape('Choisissez une heure pour poursuivre la simulation.'); return; }
    if (etape === 3) {
      recupererCoordonnees();
      const validePrenom = verifierChamp('prenom');
      const valideTelephone = verifierChamp('telephone');
      if (!validePrenom || !valideTelephone) { $(validePrenom ? '#telephone' : '#prenom').focus(); return; }
      if (!creneauToujoursValide()) {
        etat.heure = null;
        afficherEtape(2);
        erreurEtape('Ce créneau est passé ou n’est plus proposé pour cet essai. Choisissez une autre heure ou un autre jour.');
        return;
      }
      etat.termine = true;
      afficherEtape(3);
      return;
    }
    if (etape === 1 && !creneaux(etat.jour, soinChoisi()).some(option => !option.indisponible)) {
      etat.jour = ''; etat.heure = null;
      afficherEtape(1);
      erreurEtape('Cette journée est terminée. Choisissez une autre date pour l’essai.');
      return;
    }
    afficherEtape(etape + 1);
  });
  formulaire.addEventListener('click', evenement => {
    if (evenement.target.closest('[data-retour]')) afficherEtape(etape - 1);
    if (evenement.target.closest('[data-recommencer]')) {
      etat = { soin: null, jour: '', heure: null, prenom: '', telephone: '', termine: false };
      afficherEtape(0);
    }
  });
  etapes.forEach(bouton => bouton.addEventListener('click', () => {
    if (!bouton.disabled) afficherEtape(Number(bouton.dataset.etape));
  }));
  $$('[data-soin]').forEach(lien => lien.addEventListener('click', evenement => {
    if (!SOINS.some(soin => soin.id === lien.dataset.soin)) return;
    evenement.preventDefault();
    etat = { soin: lien.dataset.soin, jour: '', heure: null, prenom: '', telephone: '', termine: false };
    afficherEtape(1);
  }));

  $('#copier-adresse').addEventListener('click', async () => {
    const message = $('#statut-copie');
    try {
      await navigator.clipboard.writeText('Doigts de Fée - Gambetta, 18 rue des Gâtines, 75020 Paris');
      message.textContent = 'Adresse copiée.';
    } catch {
      message.textContent = 'Copie indisponible. Adresse à sélectionner\u00a0: 18 rue des Gâtines, 75020 Paris.';
    }
  });

  document.addEventListener('keydown', () => racine.classList.add('clavier'));
  document.addEventListener('pointerdown', () => racine.classList.remove('clavier'), { passive: true });
  document.addEventListener('focusin', evenement => {
    const parent = evenement.target.closest('[data-revelation]');
    if (parent) { parent.style.transitionDelay = '0ms'; parent.classList.add('visible'); }
  });

  if ('IntersectionObserver' in window) {
    const revelations = $$('[data-revelation]');
    if (!mouvementReduit.matches) {
      racine.classList.add('js');
      const observateur = new IntersectionObserver(entrees => {
        entrees.forEach(entree => {
          if (entree.isIntersecting) { entree.target.classList.add('visible'); observateur.unobserve(entree.target); }
        });
      }, { threshold: .12 });
      let ligne = 0;
      revelations.forEach(element => {
        if (element.dataset.revelation === 'ligne') element.style.transitionDelay = `${ligne++ * 60}ms`;
        observateur.observe(element);
      });
      requestAnimationFrame(() => racine.classList.add('entree'));
    }

    const barre = $('#barre-mobile');
    const visibilites = { actions: false, reservation: false, pied: false };
    const cibles = new Map([[$('#actions-hero'), 'actions'], [$('#rendez-vous'), 'reservation'], [$('footer'), 'pied']]);
    const observateurBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        const cle = cibles.get(entree.target);
        visibilites[cle] = cle === 'actions' ? entree.boundingClientRect.bottom < 0 : entree.isIntersecting;
      });
      barre.hidden = !visibilites.actions || visibilites.reservation || visibilites.pied;
    }, { threshold: 0 });
    cibles.forEach((_, element) => observateurBarre.observe(element));
  }

  $('#module-reservation').hidden = false;
  afficherEtape(0, { focus: false, instantane: true });
})();
