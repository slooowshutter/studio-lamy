/* Haircut & Beauty — parcours de rendez-vous simulé, sans envoi. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selecteur, parent = doc) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = doc) => Array.from(parent.querySelectorAll(selecteur));
  const espace = '\u00a0';
  const service = 'Soin du visage complet profond';
  const duree = 30;
  const horaires = {
    0: [],
    1: [[540, 1200]],
    2: [[540, 1200]],
    3: [[540, 1200]],
    4: [[540, 1200]],
    5: [[540, 720], [840, 1260]],
    6: [[540, 1200]]
  };
  const fmtDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const fmtJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });

  const parcours = {
    etape: 0,
    jour: null,
    heure: null,
    prenom: '',
    telephone: ''
  };
  let transitionEnCours = false;

  const vue = $('#vue-etape');
  const numeroEtape = $('#numero-etape');
  const annonceEtape = $('#annonce-etape');
  const resumeJour = $('#resume-jour');
  const resumeHeure = $('#resume-heure');
  const barreLecture = $('.lecture');
  const barreMobile = $('.barre-mobile');

  function partiesParis(date = new Date()) {
    const pieces = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const resultat = {};
    pieces.forEach((piece) => { resultat[piece.type] = piece.value; });
    return {
      annee: Number(resultat.year),
      mois: Number(resultat.month),
      jour: Number(resultat.day),
      heure: Number(resultat.hour) % 24,
      minute: Number(resultat.minute)
    };
  }

  function cleDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateParisCourante() {
    const p = partiesParis();
    return new Date(Date.UTC(p.annee, p.mois - 1, p.jour, 12));
  }

  function heureTexte(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return minute ? `${heure}${espace}h${espace}${String(minute).padStart(2, '0')}` : `${heure}${espace}h`;
  }

  function dateLongue(date) {
    const texte = fmtDate.format(date);
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  }

  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, (caractere) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caractere]));
  }

  function datesDisponibles() {
    const debut = dateParisCourante();
    return Array.from({ length: 14 }, (_, index) => new Date(debut.getTime() + index * 86400000));
  }

  function decalageJour(date) {
    return date.getUTCDay();
  }

  function hachage(texte) {
    let valeur = 2166136261;
    for (let i = 0; i < texte.length; i += 1) {
      valeur ^= texte.charCodeAt(i);
      valeur = Math.imul(valeur, 16777619);
    }
    return valeur >>> 0;
  }

  function creneauxPour(date) {
    const plages = horaires[decalageJour(date)] || [];
    const aujourdHui = cleDate(date) === cleDate(dateParisCourante());
    const maintenant = partiesParis();
    const minuteActuelle = maintenant.heure * 60 + maintenant.minute;
    const creneaux = [];

    plages.forEach(([ouverture, fermeture]) => {
      for (let minute = ouverture; minute + duree <= fermeture; minute += 30) {
        const passe = aujourdHui && minute <= minuteActuelle;
        const reserve = hachage(`${cleDate(date)}-${minute}`) % 5 === 0;
        creneaux.push({ minute, passe, reserve: reserve && !passe });
      }
    });
    return creneaux;
  }

  function mettreAJourResume() {
    resumeJour.textContent = parcours.jour ? dateLongue(parcours.jour) : 'À choisir';
    resumeHeure.textContent = parcours.heure === null ? 'À choisir' : heureTexte(parcours.heure);
    $('[data-etape-cible="1"]', $('.selection')).disabled = !parcours.jour;
    $('[data-etape-cible="2"]', $('.selection')).disabled = parcours.heure === null;
  }

  function boutonRetour(cible, libelle) {
    return `<button class="bouton bouton--clair" type="button" data-etape-cible="${cible}">Retour à ${libelle}</button>`;
  }

  function vuePrestation() {
    return `
      <section class="etape-vue" aria-labelledby="etape-titre">
        <h3 id="etape-titre" tabindex="-1">Choisir la prestation</h3>
        <p>Une seule prestation est proposée dans cette simulation, pour suivre la carte publiée.</p>
        <fieldset class="choix-prestation">
          <legend class="sr-only">Prestation simulée</legend>
          <label>
            <input type="radio" name="prestation" value="soin-visage" checked>
            <span class="choix-prestation__ligne"><span class="choix-prestation__nom">${service}</span><span class="choix-prestation__duree">30 min</span></span>
          </label>
        </fieldset>
        <div class="etape-actions"><button class="bouton" type="button" data-avancer="1">Choisir un jour <span aria-hidden="true">→</span></button></div>
      </section>`;
  }

  function vueJour() {
    const dates = datesDisponibles();
    const choix = dates.map((date, index) => {
      const ferme = horaires[decalageJour(date)].length === 0;
      const selectionne = parcours.jour && cleDate(date) === cleDate(parcours.jour);
      const petitJour = index === 0 ? 'Auj.' : index === 1 ? 'Demain' : fmtJour.format(date).replace('.', '');
      const numero = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' }).format(date);
      const nomAccessible = dateLongue(date);
      return `<button class="jour" type="button" data-jour="${cleDate(date)}" aria-label="${nomAccessible}${ferme ? ', fermé' : ''}" aria-pressed="${Boolean(selectionne)}"${ferme ? ' disabled' : ''}>
        <span class="jour__semaine">${petitJour}</span><span class="jour__date">${numero}</span><span class="jour__etat">${ferme ? 'Fermé' : index === 0 ? 'Aujourd’hui' : index === 1 ? 'Demain' : ''}</span>
      </button>`;
    }).join('');

    return `
      <section class="etape-vue" aria-labelledby="etape-titre">
        <h3 id="etape-titre" tabindex="-1">Choisir un jour</h3>
        <p>Les dimanches sont fermés selon les horaires affichés. Les autres dates restent simulées.</p>
        <div class="jours" aria-label="Choisir une date">${choix}</div>
        <div class="etape-actions">${boutonRetour(0, 'la prestation')}<button class="bouton" type="button" data-avancer="2"${parcours.jour ? '' : ' disabled'}>Voir les heures <span aria-hidden="true">→</span></button></div>
      </section>`;
  }

  function vueHeure() {
    const creneaux = creneauxPour(parcours.jour);
    const groupes = creneaux.map((creneau) => {
      const heure = heureTexte(creneau.minute);
      const identifiant = `heure-${creneau.minute}`;
      const bloque = creneau.passe || creneau.reserve;
      const choisi = parcours.heure === creneau.minute;
      const indication = creneau.passe ? 'heure passée' : creneau.reserve ? 'indisponible dans la simulation' : '';
      return `<label class="choix-creneau">
        <input type="radio" name="creneau" value="${creneau.minute}"${choisi ? ' checked' : ''}${bloque ? ' disabled' : ''}>
        <span class="choix-creneau__ligne"><time datetime="${cleDate(parcours.jour)}T${String(Math.floor(creneau.minute / 60)).padStart(2, '0')}:${String(creneau.minute % 60).padStart(2, '0')}" id="${identifiant}">${heure}</time>${indication ? `<span class="sr-only">, ${indication}</span>` : ''}</span>
      </label>`;
    }).join('');
    const libres = creneaux.filter((creneau) => !creneau.passe && !creneau.reserve).length;
    const contenu = creneaux.length ? `<fieldset class="creneaux"><legend>Heure · ${libres} créneau${libres > 1 ? 'x' : ''} simulé${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}</legend>${groupes}</fieldset><div class="legende-creneaux"><span><i aria-hidden="true"></i>Disponible dans la simulation</span><span><i class="indisponible" aria-hidden="true"></i>Indisponible dans la simulation</span></div>` : '<p>Aucun créneau dans les horaires affichés pour ce jour.</p>';

    return `
      <section class="etape-vue" aria-labelledby="etape-titre">
        <h3 id="etape-titre" tabindex="-1">Choisir une heure</h3>
        <p>${dateLongue(parcours.jour)} · créneaux calculés dans les horaires affichés.</p>
        ${contenu}
        <div class="etape-actions">${boutonRetour(1, 'le jour')}<button class="bouton" type="button" data-avancer="3"${parcours.heure === null ? ' disabled' : ''}>Continuer <span aria-hidden="true">→</span></button></div>
      </section>`;
  }

  function vueCoordonnees() {
    return `
      <section class="etape-vue" aria-labelledby="etape-titre">
        <h3 id="etape-titre" tabindex="-1">Vos coordonnées</h3>
        <p>${dateLongue(parcours.jour)} à ${heureTexte(parcours.heure)} · aucun prix n’est affiché dans cette simulation.</p>
        <form id="formulaire-coordonnees" novalidate>
          <div class="champ">
            <label for="prenom">Prénom</label>
            <input id="prenom" name="prenom" type="text" autocomplete="given-name" value="${echapper(parcours.prenom)}" required aria-describedby="erreur-prenom">
            <span class="champ__erreur" id="erreur-prenom"></span>
          </div>
          <div class="champ">
            <label for="telephone">Téléphone mobile</label>
            <input id="telephone" name="telephone" type="tel" autocomplete="tel" inputmode="tel" value="${echapper(parcours.telephone)}" required aria-describedby="erreur-telephone">
            <span class="champ__erreur" id="erreur-telephone"></span>
          </div>
          <p class="reservation__annonce">Ces informations restent dans cette page et ne sont pas envoyées.</p>
          <div class="etape-actions">${boutonRetour(2, 'l’heure')}<button class="bouton" type="submit">Terminer la simulation <span aria-hidden="true">→</span></button></div>
        </form>
      </section>`;
  }

  function vueConfirmation() {
    return `
      <section class="etape-vue confirmation" aria-labelledby="etape-titre">
        <h3 id="etape-titre" tabindex="-1">Simulation terminée</h3>
        <p>Aucun rendez-vous n’a été demandé ni transmis.</p>
        <p><strong>${service}</strong><br>30 min · ${dateLongue(parcours.jour)} à ${heureTexte(parcours.heure)}</p>
        <p>Pour prendre un rendez-vous réel, utilisez Planity ou appelez le salon.</p>
        <div class="etape-actions">
          <a class="bouton" href="https://www.planity.com/haircut-beauty-rue-de-vesoul-25000-besancon" target="_blank" rel="noopener">Continuer sur Planity <span aria-hidden="true">↗</span></a>
          <button class="bouton bouton--clair" type="button" data-recommencer>Recommencer</button>
        </div>
      </section>`;
  }

  function contenuEtape() {
    if (parcours.etape === 0) return vuePrestation();
    if (parcours.etape === 1) return vueJour();
    if (parcours.etape === 2) return vueHeure();
    if (parcours.etape === 3) return vueCoordonnees();
    return vueConfirmation();
  }

  function afficherEtape({ animer = true, annoncer = true, focaliser = true } = {}) {
    const doitAnimer = animer && Boolean(vue.innerHTML) && !reduce.matches;
    transitionEnCours = doitAnimer;
    const ancienneEtape = parcours.etape;
    const installer = () => {
      numeroEtape.textContent = ancienneEtape < 4 ? `Étape ${ancienneEtape + 1} sur 4` : 'Simulation terminée';
      vue.innerHTML = contenuEtape();
      vue.classList.remove('is-sortie', 'is-entree', 'is-active');
      mettreAJourResume();
      brancherEtape();
      if (doitAnimer) {
        requestAnimationFrame(() => {
          vue.classList.add('is-entree');
          requestAnimationFrame(() => vue.classList.add('is-active'));
        });
        window.setTimeout(() => {
          vue.classList.remove('is-entree', 'is-active');
          transitionEnCours = false;
          const titre = $('#etape-titre', vue);
          if (focaliser && titre) titre.focus({ preventScroll: true });
        }, 185);
      } else {
        transitionEnCours = false;
        if (focaliser) {
          const titre = $('#etape-titre', vue);
          if (titre) titre.focus({ preventScroll: true });
        }
      }
      if (annoncer) annonceEtape.textContent = ancienneEtape < 4 ? `Étape ${ancienneEtape + 1} sur 4. ${nomEtape(ancienneEtape)}.` : 'Simulation terminée. Aucun rendez-vous n’a été transmis.';
    };

    if (doitAnimer) {
      vue.classList.add('is-sortie');
      window.setTimeout(installer, 90);
    } else {
      installer();
    }
  }

  function nomEtape(numero) {
    return ['choisir la prestation', 'choisir un jour', 'choisir une heure', 'saisir vos coordonnées'][numero] || '';
  }

  function ouvrirEtape(cible) {
    if (transitionEnCours) return;
    if (parcours.etape === 3) {
      parcours.prenom = $('#prenom', vue)?.value || '';
      parcours.telephone = $('#telephone', vue)?.value || '';
    }
    parcours.etape = cible;
    afficherEtape();
  }

  function avancerVers(numero) {
    if (transitionEnCours) return;
    if (numero === 1) {
      parcours.jour = null;
      parcours.heure = null;
    }
    if (numero === 2 && parcours.jour) {
      parcours.heure = null;
    }
    parcours.etape = numero;
    afficherEtape();
  }

  function brancherEtape() {
    $$('[data-avancer]', vue).forEach((bouton) => bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.avancer);
      if (cible === 1) avancerVers(1);
      else if (cible === 2 && parcours.jour) avancerVers(2);
      else if (cible === 3 && parcours.heure !== null) avancerVers(3);
    }));

    $$('[data-etape-cible]', vue).forEach((bouton) => bouton.addEventListener('click', () => ouvrirEtape(Number(bouton.dataset.etapeCible))));

    $$('.jour:not(:disabled)', vue).forEach((bouton) => bouton.addEventListener('click', () => {
      const nouvelleDate = new Date(`${bouton.dataset.jour}T12:00:00Z`);
      parcours.jour = nouvelleDate;
      parcours.heure = null;
      $$('[data-jour]', vue).forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
      const continuer = $('[data-avancer="2"]', vue);
      if (continuer) continuer.disabled = false;
      mettreAJourResume();
      annonceEtape.textContent = `${dateLongue(nouvelleDate)} sélectionné. Choisissez une heure.`;
    }));

    $$('input[name="creneau"]:not(:disabled)', vue).forEach((radio) => radio.addEventListener('change', () => {
      parcours.heure = Number(radio.value);
      const continuer = $('[data-avancer="3"]', vue);
      if (continuer) continuer.disabled = false;
      mettreAJourResume();
      annonceEtape.textContent = `${heureTexte(parcours.heure)} sélectionnée.`;
    }));

    const formulaire = $('#formulaire-coordonnees', vue);
    if (formulaire) formulaire.addEventListener('submit', validerCoordonnees);

    const recommencer = $('[data-recommencer]', vue);
    if (recommencer) recommencer.addEventListener('click', () => {
      parcours.etape = 0;
      parcours.jour = null;
      parcours.heure = null;
      parcours.prenom = '';
      parcours.telephone = '';
      afficherEtape();
    });
  }

  function validerCoordonnees(evenement) {
    evenement.preventDefault();
    if (transitionEnCours) return;
    const prenom = $('#prenom', vue);
    const telephone = $('#telephone', vue);
    const erreurPrenom = $('#erreur-prenom', vue);
    const erreurTelephone = $('#erreur-telephone', vue);
    const mobile = /^(?:(?:\+|00)33\s?|0)[67](?:[\s.-]?\d{2}){4}$/;
    const prenomValide = prenom.value.trim().length > 0;
    const telephoneValide = mobile.test(telephone.value.trim());

    prenom.setAttribute('aria-invalid', String(!prenomValide));
    telephone.setAttribute('aria-invalid', String(!telephoneValide));
    erreurPrenom.textContent = prenomValide ? '' : 'Saisissez votre prénom.';
    erreurTelephone.textContent = telephoneValide ? '' : 'Vérifiez le numéro de mobile saisi.';

    if (!prenomValide) {
      prenom.focus();
      annonceEtape.textContent = 'Le prénom est nécessaire pour terminer la simulation.';
      return;
    }
    if (!telephoneValide) {
      telephone.focus();
      annonceEtape.textContent = 'Le numéro de mobile doit être vérifié.';
      return;
    }

    parcours.prenom = prenom.value.trim();
    parcours.telephone = telephone.value.trim();
    parcours.etape = 4;
    afficherEtape();
  }

  $$('[data-etape-cible]', $('.selection')).forEach((bouton) => bouton.addEventListener('click', () => {
    ouvrirEtape(Number(bouton.dataset.etapeCible));
  }));

  function animerLecture() {
    const blocs = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      blocs.forEach((bloc) => bloc.classList.add('is-visible'));
      return;
    }
    const observeur = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        if (entree.target.matches('.trait-visage, .ligne-soin')) entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    blocs.forEach((bloc, index) => {
      const groupe = bloc.closest('.rubriques, .gestes');
      if (groupe) {
        const rang = Array.from(groupe.querySelectorAll('[data-reveal]')).indexOf(bloc);
        bloc.style.setProperty('--delai', `${Math.max(0, rang) * 55}ms`);
      }
      if (bloc.closest('.chapitre--hero')) bloc.style.setProperty('--delai', `${index * 70}ms`);
      observeur.observe(bloc);
    });
  }

  function actualiserLecture() {
    let enAttente = false;
    const lire = () => {
      const hauteur = doc.documentElement.scrollHeight - window.innerHeight;
      const progression = hauteur > 0 ? Math.min(1, Math.max(0, window.scrollY / hauteur)) : 0;
      barreLecture.style.transform = `scaleY(${progression})`;
      enAttente = false;
    };
    const demander = () => {
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(lire);
    };
    window.addEventListener('scroll', demander, { passive: true });
    window.addEventListener('resize', demander, { passive: true });
    lire();
  }

  function masquerBarreSurSection() {
    const hero = $('.chapitre--hero');
    const reserver = $('.chapitre--reservation');
    const pied = $('.pied');
    let enAttente = false;
    const verifier = () => {
      if (window.innerWidth > 760) {
        barreMobile.classList.remove('is-visible');
        enAttente = false;
        return;
      }
      const reservation = reserver.getBoundingClientRect();
      const piedRect = pied.getBoundingClientRect();
      const reservationVisible = reservation.top < window.innerHeight && reservation.bottom > 0;
      const piedVisible = piedRect.top < window.innerHeight && piedRect.bottom > 0;
      const heroVisible = hero.getBoundingClientRect().bottom > 0;
      barreMobile.classList.toggle('is-visible', !heroVisible && !reservationVisible && !piedVisible);
      enAttente = false;
    };
    const demander = () => {
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(verifier);
    };
    window.addEventListener('scroll', demander, { passive: true });
    window.addEventListener('resize', demander, { passive: true });
    verifier();
  }

  animerLecture();
  actualiserLecture();
  afficherEtape({ animer: false, annoncer: false, focaliser: false });
  masquerBarreSurSection();
  window.__site = 1;
})();
