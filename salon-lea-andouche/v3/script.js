(() => {
  'use strict';

  const doc = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const one = (selector, scope = doc) => scope.querySelector(selector);
  const all = (selector, scope = doc) => Array.from(scope.querySelectorAll(selector));
  const NB = '\u00a0';
  const services = {
    diagnostic: { nom: 'Diagnostic et conseil', duree: 15 },
    'coupe-homme': { nom: 'Coupe homme + shampoing + coiffage', duree: 30 },
    'coupe-longue': { nom: 'Coupe homme + shampoing + coiffage · cheveux longs', duree: 45 },
    frange: { nom: 'Frange', duree: 10 }
  };
  const horaires = {
    0: null,
    1: null,
    2: [540, 1140],
    3: [540, 1140],
    4: [540, 1140],
    5: [540, 1140],
    6: [540, 960]
  };
  const selection = { service: null, date: null, heure: null };
  const joursCourts = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const dateParts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const noMotion = () => reduce.matches;
  const dateISO = date => date.toISOString().slice(0, 10);
  const capitaliser = value => value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1);

  function aujourdHuiAParis() {
    const parts = {};
    dateParts.formatToParts(new Date()).forEach(part => { parts[part.type] = part.value; });
    const midiUtc = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
    return { date: midiUtc, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  function actualiserSelection() {
    const textePrestation = selection.service ? services[selection.service].nom : 'À choisir';
    const texteJour = selection.date ? capitaliser(dateLongue.format(selection.date)) : 'À choisir';
    const texteHeure = selection.heure || 'À choisir';
    one('[data-resume-prestation]').textContent = textePrestation;
    one('[data-resume-jour]').textContent = texteJour;
    one('[data-resume-heure]').textContent = texteHeure;
    one('[data-revenir="0"]').disabled = !selection.service || etapeActive === 0;
    one('[data-revenir="0"]').hidden = !selection.service || etapeActive === 0;
    one('[data-revenir="1"]').disabled = !selection.date || etapeActive <= 1;
    one('[data-revenir="1"]').hidden = !selection.date || etapeActive <= 1;
    one('[data-revenir="2"]').disabled = !selection.heure || etapeActive <= 2;
    one('[data-revenir="2"]').hidden = !selection.heure || etapeActive <= 2;
    const recap = one('[data-recap-formulaire]');
    if (recap) recap.textContent = `${textePrestation} · ${texteJour} · ${texteHeure}`;
  }

  /* Entrée de l'affiche, sans masquer le contenu si le script ne démarre pas. */
  const affiche = one('.affiche');
  if (affiche) {
    requestAnimationFrame(() => affiche.classList.add('is-ready'));
  }

  /* Révélations ponctuelles, en variant le mouvement du premier panneau. */
  const panneaux = all('[data-revelation]');
  if ('IntersectionObserver' in window && !noMotion()) {
    const observateurPanneaux = new IntersectionObserver((entrees, observer) => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        const panneau = entree.target;
        panneau.classList.add('is-visible');
        const compteur = one('[data-compte]', panneau);
        if (compteur && !compteur.dataset.annime) {
          compteur.dataset.annime = 'oui';
          animerNumero(compteur, Number(compteur.dataset.compte));
        }
        observer.unobserve(panneau);
      });
    }, { threshold: .2, rootMargin: '0px 0px -5% 0px' });
    panneaux.forEach(panneau => observateurPanneaux.observe(panneau));
  } else {
    panneaux.forEach(panneau => panneau.classList.add('is-visible'));
  }

  function animerNumero(element, cible) {
    if (noMotion()) return;
    element.textContent = '00';
    const debut = performance.now();
    const duree = 420;
    function avancer(instant) {
      const progression = Math.min(1, (instant - debut) / duree);
      const valeur = Math.round(cible * progression);
      element.textContent = String(valeur).padStart(2, '0');
      if (progression < 1) requestAnimationFrame(avancer);
    }
    requestAnimationFrame(avancer);
  }

  /* Navigation pliable : fermeture à Échap et retour du focus au bouton. */
  const boutonNavigation = one('.entete__bouton');
  const navigation = one('#navigation');
  let minuterieNavigation;
  function ouvrirNavigation(ouvrir) {
    window.clearTimeout(minuterieNavigation);
    boutonNavigation.setAttribute('aria-expanded', String(ouvrir));
    boutonNavigation.setAttribute('aria-label', ouvrir ? 'Fermer la navigation' : 'Ouvrir la navigation');
    one('span', boutonNavigation).textContent = ouvrir ? '−' : '＋';
    if (ouvrir) {
      navigation.hidden = false;
      navigation.classList.remove('is-fermeture');
      one('a', navigation).focus();
      return;
    }
    navigation.classList.add('is-fermeture');
    minuterieNavigation = window.setTimeout(() => {
      navigation.hidden = true;
      navigation.classList.remove('is-fermeture');
    }, noMotion() ? 0 : 190);
    boutonNavigation.focus();
  }
  boutonNavigation.addEventListener('click', () => ouvrirNavigation(boutonNavigation.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) ouvrirNavigation(false);
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && boutonNavigation.getAttribute('aria-expanded') === 'true') ouvrirNavigation(false);
  });

  /* Calendrier sur quatorze jours, réglé sur les horaires Planity relevés. */
  const zoneJours = one('[data-jours]');
  const base = aujourdHuiAParis();
  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(base.date.getTime() + decalage * 86400000);
    const fermeture = horaires[date.getUTCDay()] === null;
    const bouton = doc.createElement('button');
    bouton.type = 'button';
    bouton.className = 'jour';
    bouton.dataset.date = dateISO(date);
    bouton.disabled = fermeture;
    bouton.setAttribute('aria-label', `${capitaliser(dateLongue.format(date))}${fermeture ? ', fermé' : ''}`);
    bouton.setAttribute('aria-pressed', 'false');
    const libelle = decalage === 0 ? 'Auj.' : decalage === 1 ? 'Demain' : fermeture ? 'Fermé' : '';
    const repereMois = date.getUTCDate() === 1 ? ` · ${moisCourt.format(date)}` : '';
    bouton.innerHTML = `<span>${joursCourts.format(date)}</span><span>${date.getUTCDate()}</span><span>${libelle}${repereMois}</span>`;
    bouton.addEventListener('click', () => choisirJour(date, bouton));
    zoneJours.append(bouton);
  }

  function choisirJour(date, bouton) {
    if (bouton.disabled) return;
    selection.date = date;
    selection.heure = null;
    all('.jour', zoneJours).forEach(jour => jour.setAttribute('aria-pressed', String(jour === bouton)));
    actualiserSelection();
    creerCreneaux(date);
    one('[data-annonce]').textContent = `${capitaliser(dateLongue.format(date))} sélectionné pour cette simulation.`;
  }

  function creerCreneaux(date) {
    const zone = one('[data-creneaux]');
    zone.replaceChildren();
    const heuresOuvertes = horaires[date.getUTCDay()];
    if (!heuresOuvertes) return;
    const [ouverture, fermeture] = heuresOuvertes;
    const duree = selection.service ? services[selection.service].duree : 0;
    const maintenant = aujourdHuiAParis();
    const dateEstAujourdhui = dateISO(maintenant.date) === dateISO(date);
    const periodes = [
      { nom: 'Matin', debut: 540, fin: 720 },
      { nom: 'Après-midi', debut: 720, fin: 1020 },
      { nom: 'Fin de journée', debut: 1020, fin: 1200 }
    ];
    let nombre = 0;
    periodes.forEach((periode, noPeriode) => {
      const groupe = doc.createElement('fieldset');
      groupe.className = 'creneaux__groupe';
      const legende = doc.createElement('legend');
      legende.textContent = periode.nom;
      groupe.append(legende);
      for (let minute = Math.max(ouverture, periode.debut); minute + duree <= Math.min(fermeture, periode.fin); minute += 30) {
        const heureVisuelle = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const heureEcoulee = dateEstAujourdhui && minute <= maintenant.minutes;
        const indisponibleDemo = !heureEcoulee && ((date.getUTCDate() + Math.floor(minute / 30) + noPeriode) % 7) === 0;
        const etiquette = doc.createElement('label');
        etiquette.className = 'creneau';
        const radio = doc.createElement('input');
        radio.type = 'radio';
        radio.name = 'heure';
        radio.value = heureVisuelle;
        radio.disabled = heureEcoulee || indisponibleDemo;
        radio.setAttribute('aria-label', `${heureVisuelle}${heureEcoulee ? ', déjà écoulée dans cette simulation' : indisponibleDemo ? ', indisponible dans cette simulation' : ''}`);
        const contenu = doc.createElement('span');
        contenu.innerHTML = `<time datetime="${dateISO(date)}T${heureVisuelle}:00">${heureVisuelle}</time>`;
        etiquette.append(radio, contenu);
        if (heureEcoulee || indisponibleDemo) {
          const mention = doc.createElement('span');
          mention.className = 'creneau__indication';
          mention.textContent = heureEcoulee ? 'Heure écoulée dans cette simulation' : 'Indisponible dans cette simulation';
          etiquette.append(mention);
        } else {
          nombre += 1;
          radio.addEventListener('change', () => {
            selection.heure = heureVisuelle;
            actualiserSelection();
            one('[data-erreur-heure]').textContent = '';
            one('[data-annonce]').textContent = `Heure ${heureVisuelle} sélectionnée pour cette simulation.`;
          });
        }
        groupe.append(etiquette);
      }
      if (groupe.querySelector('.creneau')) zone.append(groupe);
    });
    one('[data-aide-creneaux]').textContent = nombre
      ? `Créneaux de démonstration dans les heures Planity relevées. ${nombre}${NB}heures sélectionnables ; horaires à confirmer.`
      : 'Aucun créneau restant aujourd’hui dans cette simulation. Choisissez un autre jour ou passez par Planity.';
  }

  /* Étapes avec déplacement court, focus sur le titre et retour possible. */
  const etapes = all('[data-etape]');
  const annonce = one('[data-annonce]');
  let etapeActive = 0;
  let enTransition = false;
  function afficherEtape(cible) {
    if (enTransition || cible < 0 || cible > 3) return;
    const ancienne = one(`[data-etape="${etapeActive}"]`);
    const suivante = one(`[data-etape="${cible}"]`);
    if (!ancienne || !suivante || ancienne === suivante) return;
    enTransition = true;
    const duree = noMotion() ? 0 : 220;
    ancienne.classList.add('is-sortie');
    window.setTimeout(() => {
      ancienne.hidden = true;
      ancienne.classList.remove('is-sortie');
      suivante.hidden = false;
      suivante.classList.add('is-entree');
      etapeActive = cible;
      actualiserSelection();
      annonce.textContent = `Étape ${cible + 1} sur 4 — ${['prestation', 'jour', 'heure', 'coordonnées'][cible]}.`;
      requestAnimationFrame(() => {
        suivante.classList.remove('is-entree');
        one('h3', suivante).focus({ preventScroll: true });
        enTransition = false;
      });
    }, duree);
  }

  all('[data-suite]').forEach(bouton => bouton.addEventListener('click', () => {
    if (etapeActive === 0 && !selection.service) {
      one('[data-erreur-prestation]').textContent = 'Choisissez une prestation pour continuer.';
      one('input[name="prestation"]').focus();
      return;
    }
    if (etapeActive === 1 && !selection.date) {
      annonce.textContent = 'Choisissez un jour ouvert pour cette simulation.';
      one('[data-jours] .jour:not(:disabled)')?.focus();
      return;
    }
    if (etapeActive === 2 && !selection.heure) {
      one('[data-erreur-heure]').textContent = 'Choisissez une heure disponible dans cette simulation.';
      one('[data-creneaux] input:not(:disabled)')?.focus();
      return;
    }
    if (etapeActive < 3) afficherEtape(etapeActive + 1);
  }));

  all('[data-retour]').forEach(bouton => bouton.addEventListener('click', () => afficherEtape(etapeActive - 1)));

  all('[data-revenir]').forEach(bouton => bouton.addEventListener('click', () => {
    const cible = Number(bouton.dataset.revenir);
    if (!bouton.disabled && cible < etapeActive) afficherEtape(cible);
  }));

  all('input[name="prestation"]').forEach(radio => radio.addEventListener('change', () => {
    selection.service = radio.value;
    selection.date = null;
    selection.heure = null;
    actualiserSelection();
    one('[data-erreur-prestation]').textContent = '';
    all('.jour', zoneJours).forEach(jour => jour.setAttribute('aria-pressed', 'false'));
  }));

  all('[data-preselection]').forEach(bouton => bouton.addEventListener('click', () => {
    const valeur = bouton.dataset.preselection;
    const radio = one(`input[name="prestation"][value="${valeur}"]`);
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    etapeActive = 0;
    actualiserSelection();
    etapes.forEach((etape, index) => { etape.hidden = index !== 0; });
    one('#rendez-vous').scrollIntoView({ behavior: noMotion() ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => one('[data-etape="0"] h3').focus({ preventScroll: true }), noMotion() ? 0 : 300);
  }));

  one('[data-formulaire]').addEventListener('submit', event => {
    event.preventDefault();
    const prenom = one('#prenom');
    const telephone = one('#telephone');
    const erreurPrenom = one('[data-erreur-prenom]');
    const erreurTelephone = one('[data-erreur-telephone]');
    const telephoneNettoye = telephone.value.replace(/[\s().-]/g, '');
    const mobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(telephoneNettoye);
    erreurPrenom.textContent = prenom.value.trim() ? '' : 'Indiquez votre prénom pour compléter la simulation.';
    erreurTelephone.textContent = mobileValide ? '' : 'Saisissez un numéro mobile français commençant par 06, 07, +336 ou +337.';
    prenom.setAttribute('aria-invalid', String(!prenom.value.trim()));
    telephone.setAttribute('aria-invalid', String(!mobileValide));
    if (!prenom.value.trim()) { prenom.focus(); return; }
    if (!mobileValide) { telephone.focus(); return; }
    const dateChoisie = capitaliser(dateLongue.format(selection.date));
    one('[data-message-succes]').textContent = `Bonjour ${prenom.value.trim()}, la simulation porte sur ${services[selection.service].nom}, le ${dateChoisie} à ${selection.heure}.`;
    etapes.forEach(etape => { etape.hidden = true; });
    const succes = one('[data-succes]');
    succes.hidden = false;
    succes.focus({ preventScroll: true });
    all('[data-revenir]').forEach(bouton => { bouton.disabled = true; bouton.hidden = true; });
    annonce.textContent = 'Simulation terminée. Rien n’a été transmis.';
  });

  /* La barre mobile disparaît au-dessus du parcours et dans le pied de page. */
  const barre = one('[data-barre-mobile]');
  if ('IntersectionObserver' in window && barre) {
    let heroVisible = true;
    let parcoursVisible = false;
    let piedVisible = false;
    const actualiserBarre = () => {
      barre.classList.toggle('is-visible', !heroVisible && !parcoursVisible && !piedVisible);
      barre.classList.toggle('is-masquee', parcoursVisible || piedVisible);
    };
    const surveiller = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target.id === 'actions-affiche') heroVisible = entree.isIntersecting;
        if (entree.target.id === 'rendez-vous') parcoursVisible = entree.isIntersecting;
        if (entree.target.tagName === 'FOOTER') piedVisible = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: .05 });
    surveiller.observe(one('#actions-affiche'));
    surveiller.observe(one('#rendez-vous'));
    surveiller.observe(one('footer'));
  }

  actualiserSelection();
})();
window.__site = true;
