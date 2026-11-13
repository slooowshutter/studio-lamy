/* Démonstration locale Aplumeria · aucune demande n’est transmise. */
(() => {
  'use strict';

  const doc = document;
  const body = doc.body;
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nbsp = '\u00a0';

  const horaires = {
    0: null,
    1: null,
    2: [570, 1140],
    3: [570, 1140],
    4: [570, 1140],
    5: [570, 1140],
    6: [570, 1110]
  };
  const formats = {
    long: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
    semaine: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' })
  };

  const sansPoint = (texte) => texte.replace(/\.$/, '');
  const majuscule = (texte) => texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  const formatHeure = (minutes) => `${Math.floor(minutes / 60)}${nbsp}h${minutes % 60 ? `${nbsp}${String(minutes % 60).padStart(2, '0')}` : ''}`;
  const formatHeureCourte = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const isoDate = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const dateLongue = (date) => majuscule(formats.long.format(date));

  function heureParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).reduce((objet, morceau) => {
      objet[morceau.type] = morceau.value;
      return objet;
    }, {});
    return {
      annee: Number(morceaux.year),
      mois: Number(morceaux.month),
      jour: Number(morceaux.day),
      minutes: Number(morceaux.hour) * 60 + Number(morceaux.minute)
    };
  }

  function dateAncree(annee, mois, jour) {
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function aujourdHuiParis() {
    const maintenant = heureParis();
    const date = dateAncree(maintenant.annee, maintenant.mois, maintenant.jour);
    return { date, maintenant, cle: isoDate(date) };
  }

  function revelerHero() {
    const pret = () => requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('is-ready')));
    if (doc.fonts && doc.fonts.ready) {
      Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 600))]).then(pret);
    } else {
      pret();
    }
  }
  revelerHero();

  /* Les blocs entrent une seule fois, avec un mouvement court. */
  const elementsAReveler = $$('.reveal, [data-row-reveal]');
  $$('[data-row-reveal]').forEach((ligne, index) => ligne.style.setProperty('--delai', `${index * 50}ms`));
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    elementsAReveler.forEach((element) => observateur.observe(element));
  } else {
    elementsAReveler.forEach((element) => element.classList.add('is-visible'));
  }

  /* La ligne du jour est repérée dans le tableau d’horaires. */
  const jourActuel = aujourdHuiParis().date.getUTCDay();
  const ligneDuJour = $(`.hours-table tr[data-weekday="${jourActuel}"]`);
  if (ligneDuJour) {
    ligneDuJour.classList.add('is-today');
    const entete = $('th', ligneDuJour);
    const indicateur = doc.createElement('span');
    indicateur.className = 'today-badge';
    indicateur.textContent = 'Aujourd’hui';
    entete.append(indicateur);
  }

  /* Réservation simulée, construite à partir des heures publiées sur Treatwell. */
  const form = $('#booking-form');
  const success = $('#booking-success');
  const stepList = $('.step-list');
  const stepPanels = $$('.booking-step');
  const stepLinks = $$('[data-step-link]');
  const live = $('#booking-live');
  const daysContainer = $('#day-options');
  const timesContainer = $('#time-options');
  const selected = { service: '', date: null, time: '' };
  let etapeActuelle = 0;
  let derniereEtape = 0;

  const resumeService = $('[data-summary-service]');
  const resumeJour = $('[data-summary-day]');
  const resumeHeure = $('[data-summary-time]');
  const inputPrenom = $('#prenom');
  const inputTelephone = $('#telephone');

  function annoncer(texte) {
    if (live) live.textContent = texte;
  }

  function majRecapitulatif() {
    if (resumeService) resumeService.textContent = selected.service || 'À choisir';
    if (resumeJour) resumeJour.textContent = selected.date ? dateLongue(selected.date) : 'À choisir';
    if (resumeHeure) resumeHeure.textContent = selected.time ? formatHeure(Number(selected.time)) : 'À choisir';
    const confirmation = $('#confirm-recap');
    if (confirmation) {
      confirmation.textContent = selected.service && selected.date && selected.time
        ? `${selected.service} · ${dateLongue(selected.date)} · ${formatHeure(Number(selected.time))}. Démonstration sans envoi.`
        : 'Choisissez une prestation, un jour et une heure pour continuer.';
    }
  }

  function mettreAJourLiensEtapes() {
    stepLinks.forEach((bouton) => {
      const numero = Number(bouton.dataset.stepLink);
      bouton.disabled = numero > derniereEtape;
      if (numero === etapeActuelle) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function allerAEtape(numero) {
    if (!stepPanels[numero] || numero > derniereEtape) return;
    if (numero === etapeActuelle) return;
    const precedente = stepPanels[etapeActuelle];
    const suivante = stepPanels[numero];
    const titre = $('[data-step-heading]', suivante);

    suivante.hidden = false;
    suivante.classList.add('is-entering');
    precedente.classList.add('is-leaving');
    etapeActuelle = numero;
    mettreAJourLiensEtapes();
    majRecapitulatif();
    requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.remove('is-entering')));

    if (titre) titre.focus({ preventScroll: true });
    annoncer(`Étape ${numero + 1} sur 4${nbsp}:${nbsp}${titre ? titre.textContent.replace(/^\d+\s*·\s*/, '') : ''}.`);
    window.setTimeout(() => {
      precedente.hidden = true;
      precedente.classList.remove('is-leaving');
    }, reduceMotion.matches ? 0 : 235);
  }

  function genererJours() {
    if (!daysContainer) return;
    const origine = aujourdHuiParis();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(origine.date.getTime() + index * 86400000);
      const jourSemaine = date.getUTCDay();
      const ouvert = horaires[jourSemaine] !== null;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'day-choice';
      bouton.dataset.date = isoDate(date);
      bouton.disabled = !ouvert;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', ouvert ? dateLongue(date) : `${dateLongue(date)}, fermé`);

      const nomJour = doc.createElement('span');
      nomJour.textContent = index === 0 ? 'Aujourd’hui' : sansPoint(formats.semaine.format(date));
      const nombre = doc.createElement('strong');
      nombre.textContent = String(date.getUTCDate());
      const mois = doc.createElement('span');
      mois.textContent = sansPoint(new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date));
      bouton.append(nomJour, nombre, mois);

      if (!ouvert) {
        const ferme = doc.createElement('span');
        ferme.className = 'closed-word';
        ferme.textContent = 'Fermé';
        bouton.append(ferme);
      }
      daysContainer.append(bouton);
    }

    daysContainer.addEventListener('click', (event) => {
      const bouton = event.target.closest('button[data-date]');
      if (!bouton || bouton.disabled) return;
      $$('.day-choice', daysContainer).forEach((choix) => {
        choix.classList.toggle('is-selected', choix === bouton);
        choix.setAttribute('aria-pressed', String(choix === bouton));
      });
      selected.date = dateAncree(...bouton.dataset.date.split('-').map(Number));
      selected.time = '';
      derniereEtape = Math.max(derniereEtape, 2);
      $('#day-error').textContent = '';
      genererHeures();
      majRecapitulatif();
      mettreAJourLiensEtapes();
      annoncer(`Jour choisi${nbsp}:${nbsp}${dateLongue(selected.date)}.`);
    });

  }

  function genererHeures() {
    if (!timesContainer || !selected.date) return;
    timesContainer.replaceChildren();
    const jour = selected.date.getUTCDay();
    const plage = horaires[jour];
    if (!plage) {
      const message = doc.createElement('p');
      message.textContent = 'Ce jour est fermé selon les horaires publiés sur Treatwell.';
      timesContainer.append(message);
      return;
    }

    const origine = aujourdHuiParis();
    const cleJour = isoDate(selected.date);
    const estAujourdHui = cleJour === origine.cle;
    const heures = [];
    for (let minutes = plage[0]; minutes < plage[1]; minutes += 60) heures.push(minutes);
    const prisPourLaDemo = heures.length > 2 ? (selected.date.getUTCDate() + jour * 3) % heures.length : -1;
    let nombreDisponible = 0;

    heures.forEach((minutes, index) => {
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-choice';
      bouton.dataset.minutes = String(minutes);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.textContent = formatHeureCourte(minutes);

      const estPasse = estAujourdHui && minutes <= origine.maintenant.minutes;
      const indisponibleDemo = index === prisPourLaDemo;
      if (estPasse || indisponibleDemo) {
        bouton.disabled = true;
        const precision = doc.createElement('small');
        precision.textContent = estPasse ? 'Passé' : 'Indisponible · démo';
        bouton.append(precision);
      } else {
        nombreDisponible += 1;
      }
      timesContainer.append(bouton);
    });

    if (nombreDisponible === 0) {
      const message = doc.createElement('p');
      message.className = 'time-empty';
      message.textContent = 'Aucune heure de démonstration restante pour ce jour.';
      timesContainer.append(message);
    }
  }

  function effacerErreur(elementId, champ) {
    const erreur = $(`#${elementId}`);
    if (erreur) erreur.textContent = '';
    if (champ) champ.removeAttribute('aria-invalid');
  }

  function validerEtape(numero) {
    if (numero === 0) {
      const radio = $('input[name="service"]:checked', form);
      if (!radio) {
        $('#service-error').textContent = 'Choisissez une spécialité pour continuer.';
        const premier = $('input[name="service"]', form);
        if (premier) premier.focus({ preventScroll: true });
        return false;
      }
      selected.service = radio.value;
      return true;
    }
    if (numero === 1) {
      if (!selected.date) {
        $('#day-error').textContent = 'Choisissez un jour ouvert pour continuer.';
        const premierJour = $('.day-choice:not(:disabled)', daysContainer);
        if (premierJour) premierJour.focus({ preventScroll: true });
        return false;
      }
      return true;
    }
    if (numero === 2) {
      if (!selected.time) {
        $('#time-error').textContent = 'Choisissez une heure disponible dans cette démonstration.';
        const premiereHeure = $('.time-choice:not(:disabled)', timesContainer);
        if (premiereHeure) premiereHeure.focus({ preventScroll: true });
        return false;
      }
      return true;
    }
    return true;
  }

  if (form && daysContainer && timesContainer) {
    genererJours();
    majRecapitulatif();

    $$('[data-next]', form).forEach((bouton) => bouton.addEventListener('click', () => {
      if (!validerEtape(etapeActuelle)) return;
      derniereEtape = Math.max(derniereEtape, etapeActuelle + 1);
      mettreAJourLiensEtapes();
      allerAEtape(etapeActuelle + 1);
    }));

    $$('[data-back]', form).forEach((bouton) => bouton.addEventListener('click', () => allerAEtape(Math.max(0, etapeActuelle - 1))));
    stepLinks.forEach((bouton) => bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.stepLink);
      if (cible <= derniereEtape) allerAEtape(cible);
    }));

    $$('input[name="service"]', form).forEach((radio) => radio.addEventListener('change', () => {
      selected.service = radio.value;
      derniereEtape = Math.max(derniereEtape, 1);
      effacerErreur('service-error');
      majRecapitulatif();
      mettreAJourLiensEtapes();
    }));

    if (timesContainer) timesContainer.addEventListener('click', (event) => {
      const bouton = event.target.closest('button[data-minutes]');
      if (!bouton || bouton.disabled) return;
      $$('.time-choice', timesContainer).forEach((choix) => {
        choix.classList.toggle('is-selected', choix === bouton);
        choix.setAttribute('aria-pressed', String(choix === bouton));
      });
      selected.time = bouton.dataset.minutes;
      derniereEtape = Math.max(derniereEtape, 3);
      $('#time-error').textContent = '';
      majRecapitulatif();
      mettreAJourLiensEtapes();
      annoncer(`Heure choisie${nbsp}:${nbsp}${formatHeure(Number(selected.time))}.`);
    });

    inputPrenom.addEventListener('input', () => effacerErreur('prenom-error', inputPrenom));
    inputTelephone.addEventListener('input', () => effacerErreur('telephone-error', inputTelephone));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (etapeActuelle !== 3 || !validerEtape(0) || !validerEtape(1) || !validerEtape(2)) return;

      const prenom = inputPrenom.value.trim();
      const telephone = inputTelephone.value.trim();
      let erreur = false;
      if (prenom.length < 2) {
        $('#prenom-error').textContent = 'Saisissez un prénom de deux lettres au minimum.';
        inputPrenom.setAttribute('aria-invalid', 'true');
        inputPrenom.focus();
        erreur = true;
      }
      if (!/^0[67](?:[ .-]?\d{2}){4}$/.test(telephone)) {
        $('#telephone-error').textContent = 'Saisissez un numéro mobile français commençant par 06 ou 07.';
        inputTelephone.setAttribute('aria-invalid', 'true');
        if (!erreur) inputTelephone.focus();
        erreur = true;
      }
      if (erreur) return;

      const titre = doc.createElement('h3');
      titre.tabIndex = -1;
      titre.textContent = 'Démonstration terminée';
      const accueil = doc.createElement('p');
      accueil.textContent = `Merci ${prenom}. Votre sélection reste une démonstration${nbsp}:${nbsp}aucun rendez-vous n’a été envoyé.`;
      const recap = doc.createElement('p');
      recap.textContent = `${selected.service} · ${dateLongue(selected.date)} · ${formatHeure(Number(selected.time))}.`;
      const suite = doc.createElement('p');
      suite.textContent = 'Pour réserver réellement, appelez Aplumeria ou utilisez sa fiche Treatwell.';
      const lien = doc.createElement('a');
      lien.href = 'https://www.treatwell.fr/salon/aplumeria/';
      lien.target = '_blank';
      lien.rel = 'noopener';
      lien.textContent = 'Ouvrir Treatwell ↗';
      success.replaceChildren(titre, accueil, recap, suite, lien);
      success.hidden = false;
      form.hidden = true;
      stepList.hidden = true;
      annoncer('Démonstration terminée. Aucune demande n’a été envoyée.');
      titre.focus({ preventScroll: true });
    });
  }

  /* Barre fixe : visible après le héros, masquée pendant le module et au pied de page. */
  const barreMobile = $('[data-bar]');
  if (barreMobile && 'IntersectionObserver' in window) {
    const presence = { hero: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      barreMobile.classList.toggle('is-visible', !presence.hero && !presence.reservation && !presence.pied);
    };
    const observerHero = new IntersectionObserver(([entree]) => {
      presence.hero = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.01 });
    const observerReservation = new IntersectionObserver(([entree]) => {
      presence.reservation = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.08 });
    const observerPied = new IntersectionObserver(([entree]) => {
      presence.pied = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.01 });
    const appel = $('.hero-call');
    const reservation = $('#reservation');
    const pied = $('#pied');
    if (appel) observerHero.observe(appel);
    if (reservation) observerReservation.observe(reservation);
    if (pied) observerPied.observe(pied);
  }
})();
