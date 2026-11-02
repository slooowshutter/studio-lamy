(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, context = doc) => context.querySelector(selector);
  const $$ = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const NB = '\u00a0';
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const heures = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 960] };
  const panneau = $$('[data-panneau]');
  const boutonEtape = $$('[data-aller-etape]');
  const form = $('#simulation');
  const bookingPanels = $('.booking-panels');
  const resultat = $('[data-result]');
  const annonce = $('[data-annonce]');
  let etape = 1;
  let minuteurMasquage = 0;
  let panneauEnAttente = null;
  let jourChoisi = null;
  let heureChoisie = null;

  const formatParts = (date, options) => new Intl.DateTimeFormat('fr-FR', options).formatToParts(date);
  function dateParis(date = new Date()) {
    const parts = {};
    formatParts(date, { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).forEach((part) => { parts[part.type] = part.value; });
    return { annee: Number(parts.year), mois: Number(parts.month), jour: Number(parts.day), heure: Number(parts.hour) % 24, minute: Number(parts.minute) };
  }
  function dateLocale(iso) {
    const [annee, mois, jour] = iso.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }
  function dateIso(date) { return date.toISOString().slice(0, 10); }
  function heureFr(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${heure}${NB}h${NB}${String(minute).padStart(2, '0')}`;
  }
  function jourFr(date) {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
  }
  function majusculeInitiale(texte) { return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1); }

  /* Entrée du premier écran */
  const entrer = () => requestAnimationFrame(() => requestAnimationFrame(() => doc.body.classList.add('is-ready')));
  if (doc.fonts && doc.fonts.ready) Promise.race([doc.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 500))]).then(entrer);
  else entrer();
  window.siteInitialise = true;

  /* La ligne des horaires marque le jour courant à Dijon. */
  const jourAujourdHui = jours.indexOf(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' }).format(new Date()).toLocaleLowerCase('fr-FR'));
  const ligneAujourdHui = $(`[data-jour="${jourAujourdHui}"]`);
  if (ligneAujourdHui) {
    ligneAujourdHui.setAttribute('data-aujourdhui', 'true');
    const nomJour = $('dt', ligneAujourdHui);
    const repere = doc.createElement('span');
    repere.className = 'today-note';
    repere.textContent = 'Aujourd’hui';
    nomJour.append(repere);
  }

  /* Menu mobile */
  const boutonMenu = $('.menu-button');
  const menu = $('#menu-mobile');
  if (boutonMenu && menu) {
    const arrierePlan = [$('#apercu'), $('#contenu'), $('#pied'), $('.mobile-bar')].filter(Boolean);
    let minuterieMenu = 0;
    const fermerMenu = (rendreFocus) => {
      window.clearTimeout(minuterieMenu);
      boutonMenu.setAttribute('aria-expanded', 'false');
      boutonMenu.querySelector('.menu-button__label').textContent = 'Menu';
      menu.classList.remove('is-open');
      arrierePlan.forEach((element) => { element.inert = false; });
      doc.body.style.overflow = '';
      minuterieMenu = window.setTimeout(() => { menu.hidden = true; }, reduce.matches ? 0 : 210);
      if (rendreFocus) boutonMenu.focus();
    };
    const ouvrirMenu = () => {
      window.clearTimeout(minuterieMenu);
      menu.hidden = false;
      arrierePlan.forEach((element) => { element.inert = true; });
      doc.body.style.overflow = 'hidden';
      boutonMenu.setAttribute('aria-expanded', 'true');
      boutonMenu.querySelector('.menu-button__label').textContent = 'Fermer';
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      const premierLien = $('a', menu);
      if (premierLien) premierLien.focus({ preventScroll: true });
    };
    boutonMenu.addEventListener('click', () => {
      if (boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
      else ouvrirMenu();
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) fermerMenu(false);
    });
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
    window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
      if (event.matches && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(false);
    });
  }

  /* Révélations sobres, lancées une seule fois. */
  const revelations = $$('[data-reveal]');
  const groupes = new Map();
  revelations.forEach((element) => {
    const cle = element.dataset.reveal;
    const index = groupes.get(cle) || 0;
    element.style.setProperty('--reveal-order', index);
    groupes.set(cle, index + 1);
  });
  const entrees = [$('.signature'), ...revelations, $('[data-street]')].filter(Boolean);
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((elements) => {
      elements.forEach((element) => {
        if (element.isIntersecting) {
          element.target.classList.add('is-visible');
          observateur.unobserve(element.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    entrees.forEach((element) => observateur.observe(element));
  } else {
    entrees.forEach((element) => element.classList.add('is-visible'));
  }

  /* Choix de prestations, jours et créneaux de démonstration. */
  const choixPrestations = $$('input[name="prestation"]');
  const choixJours = $('[data-jours]');
  const choixCreneaux = $('[data-creneaux]');
  const recapPrestation = $('[data-recap-service]');
  const recapJour = $('[data-recap-date]');
  const recapHeure = $('[data-recap-time]');
  const boutonSuivant = (numero) => $(`[data-panneau="${numero}"] [data-suivant]`);

  function prestationActuelle() { return choixPrestations.find((input) => input.checked) || null; }
  function majRecapitulatif() {
    const prestation = prestationActuelle();
    recapPrestation.textContent = prestation ? prestation.dataset.nom : 'À choisir';
    recapJour.textContent = jourChoisi ? majusculeInitiale(jourFr(dateLocale(jourChoisi))) : 'À choisir';
    recapHeure.textContent = heureChoisie ? heureFr(Number(heureChoisie)) : 'À choisir';
  }

  function dimanchePaques(annee) {
    const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mois = Math.floor((h + l - 7 * m + 114) / 31);
    const jour = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(annee, mois - 1, jour, 12);
  }
  function ferieNational(date) {
    const annee = date.getUTCFullYear();
    const fixes = ['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map((moisJour) => `${annee}-${moisJour}`);
    const paques = dimanchePaques(annee);
    const mobiles = [1, 39, 50].map((ecart) => dateIso(new Date(paques + ecart * 864e5)));
    return fixes.concat(mobiles).includes(dateIso(date));
  }
  function creerChoixJour() {
    choixJours.replaceChildren();
    const maintenant = dateParis();
    const aujourdHui = new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour, 12));
    for (let index = 0; index < 10; index += 1) {
      const date = new Date(aujourdHui.getTime() + index * 864e5);
      const iso = dateIso(date);
      const jour = date.getUTCDay();
      const ouvert = heures[jour] !== null;
      const ferie = ouvert && ferieNational(date);
      const libelle = majusculeInitiale(jourFr(date));
      const label = doc.createElement('label');
      label.className = 'choice-option';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'jour';
      input.value = iso;
      input.id = `jour-${iso}`;
      input.disabled = !ouvert || ferie;
      input.setAttribute('aria-label', ferie ? `${libelle}, horaires fériés à confirmer` : ouvert ? `Choisir ${libelle}` : `${libelle}, fermé`);
      const principal = doc.createElement('span');
      principal.className = 'choice-option__main';
      principal.textContent = libelle;
      const detail = doc.createElement('span');
      detail.className = 'choice-option__detail';
      detail.textContent = ferie ? 'Férié · à confirmer' : ouvert ? 'Horaires publiés' : 'Fermé';
      label.append(input, principal, detail);
      input.addEventListener('change', () => {
        if (!input.checked) return;
        jourChoisi = iso;
        heureChoisie = null;
        $('[data-erreur-jour]').textContent = '';
        boutonSuivant(2).disabled = false;
        creerChoixCreneaux();
        majRecapitulatif();
        actualiserEtapes();
      });
      choixJours.append(label);
    }
    const jourDejaChoisi = jourChoisi && $(`input[value="${jourChoisi}"]`, choixJours);
    if (jourDejaChoisi && !jourDejaChoisi.disabled) jourDejaChoisi.checked = true;
  }

  function creneauIndisponible(iso, service, index) {
    const graine = `${iso}:${service.value}:${index}`;
    let somme = 0;
    for (let position = 0; position < graine.length; position += 1) somme = (somme * 31 + graine.charCodeAt(position)) >>> 0;
    return somme % 7 === 2;
  }
  function creerChoixCreneaux() {
    choixCreneaux.replaceChildren();
    const service = prestationActuelle();
    const date = jourChoisi ? dateLocale(jourChoisi) : null;
    if (!service || !date) return;
    const jour = date.getUTCDay();
    const intervalle = heures[jour];
    if (!intervalle) return;
    const [ouverture, fermeture] = intervalle;
    const dateAujourdhui = dateIso(dateLocale(`${dateParis().annee}-${String(dateParis().mois).padStart(2, '0')}-${String(dateParis().jour).padStart(2, '0')}`));
    const maintenant = dateParis();
    const minutesCourantes = maintenant.heure * 60 + maintenant.minute;
    let indexCreneau = 0;
    for (let debut = ouverture; debut + Number(service.dataset.duree) <= fermeture; debut += 30) {
      const passe = jourChoisi === dateAujourdhui && debut <= minutesCourantes;
      const indisponible = !passe && creneauIndisponible(jourChoisi, service, indexCreneau);
      const label = doc.createElement('label');
      label.className = 'choice-option';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = 'heure';
      input.value = String(debut);
      input.disabled = passe || indisponible;
      input.setAttribute('aria-label', `${heureFr(debut)}${passe ? ', créneau passé' : indisponible ? ', indisponible dans cette simulation' : ''}`);
      const principal = doc.createElement('span');
      principal.className = 'choice-option__main';
      principal.textContent = heureFr(debut);
      const detail = doc.createElement('span');
      detail.className = 'choice-option__detail';
      detail.textContent = passe ? 'Passé' : indisponible ? 'Indisponible ici' : 'Dans les horaires';
      label.append(input, principal, detail);
      input.addEventListener('change', () => {
        if (!input.checked) return;
        heureChoisie = input.value;
        $('[data-erreur-heure]').textContent = '';
        boutonSuivant(3).disabled = false;
        majRecapitulatif();
        actualiserEtapes();
      });
      choixCreneaux.append(label);
      indexCreneau += 1;
    }
    const heureDejaChoisie = heureChoisie && $(`input[value="${heureChoisie}"]`, choixCreneaux);
    if (heureDejaChoisie && !heureDejaChoisie.disabled) heureDejaChoisie.checked = true;
  }

  function capaciteEtape() {
    if (!prestationActuelle()) return 1;
    if (!jourChoisi) return 1;
    if (!heureChoisie) return 2;
    return 3;
  }
  function actualiserEtapes() {
    const accessibleJusqua = capaciteEtape();
    boutonEtape.forEach((bouton) => {
      const numero = Number(bouton.dataset.allerEtape);
      bouton.disabled = numero > accessibleJusqua && numero !== etape;
      if (numero === etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    if (boutonSuivant(1)) boutonSuivant(1).disabled = !prestationActuelle();
    if (boutonSuivant(2)) boutonSuivant(2).disabled = !jourChoisi;
    if (boutonSuivant(3)) boutonSuivant(3).disabled = !heureChoisie;
  }

  function annonceEtape(numero) {
    const messages = {
      1: 'Étape 1 sur 4 — choisissez une prestation.',
      2: 'Étape 2 sur 4 — choisissez un jour parmi les jours ouverts.',
      3: 'Étape 3 sur 4 — choisissez une heure dans les horaires publiés.',
      4: 'Étape 4 sur 4 — indiquez vos coordonnées pour terminer la simulation.'
    };
    annonce.textContent = messages[numero];
  }

  function allerEtape(numero) {
    if (numero > capaciteEtape() + 1 || numero < 1 || numero > 4) return;
    const precedente = panneau.find((element) => Number(element.dataset.panneau) === etape);
    const suivante = panneau.find((element) => Number(element.dataset.panneau) === numero);
    if (!suivante || numero === etape) return;
    window.clearTimeout(minuteurMasquage);
    if (panneauEnAttente) {
      panneauEnAttente.hidden = true;
      panneauEnAttente.inert = true;
      panneauEnAttente.classList.remove('is-leaving', 'is-entering');
      panneauEnAttente = null;
    }
    if (precedente && precedente !== suivante) {
      precedente.classList.remove('is-entering');
      precedente.classList.add('is-leaving');
      precedente.inert = true;
      panneauEnAttente = precedente;
    }
    suivante.hidden = false;
    suivante.inert = false;
    suivante.classList.remove('is-leaving');
    suivante.classList.add('is-entering');
    const hauteurPanneaux = Math.max(bookingPanels.getBoundingClientRect().height, suivante.scrollHeight, precedente ? precedente.scrollHeight : 0);
    bookingPanels.style.minHeight = `${hauteurPanneaux}px`;
    requestAnimationFrame(() => suivante.classList.remove('is-entering'));
    etape = numero;
    annonceEtape(numero);
    actualiserEtapes();
    const titre = $('h3', suivante);
    if (titre) titre.focus({ preventScroll: true });
    const delai = reduce.matches ? 0 : 230;
    if (precedente && precedente !== suivante) {
      minuteurMasquage = window.setTimeout(() => {
        precedente.hidden = true;
        precedente.classList.remove('is-leaving');
        panneauEnAttente = null;
      }, delai);
    }
  }

  choixPrestations.forEach((input) => input.addEventListener('change', () => {
    const datePrec = jourChoisi;
    const heurePrec = heureChoisie;
    const choixJourExiste = datePrec && $(`input[value="${datePrec}"]`, choixJours);
    if (datePrec && (!choixJourExiste || !heures[dateLocale(datePrec).getUTCDay()] || ferieNational(dateLocale(datePrec)))) jourChoisi = null;
    if (datePrec !== jourChoisi || heurePrec) heureChoisie = null;
    boutonSuivant(1).disabled = false;
    boutonSuivant(2).disabled = !jourChoisi;
    if (jourChoisi) creerChoixCreneaux();
    majRecapitulatif();
    actualiserEtapes();
  }));

  $$('[data-suivant]').forEach((bouton) => bouton.addEventListener('click', () => {
    const parent = bouton.closest('[data-panneau]');
    const numero = Number(parent.dataset.panneau);
    if (numero === 1 && !prestationActuelle()) return;
    if (numero === 2 && !jourChoisi) {
      $('[data-erreur-jour]').textContent = 'Choisissez un jour ouvert.';
      return;
    }
    if (numero === 3 && !heureChoisie) {
      $('[data-erreur-heure]').textContent = 'Choisissez un créneau disponible.';
      return;
    }
    if (numero < 4) allerEtape(numero + 1);
  }));
  $$('[data-precedent]').forEach((bouton) => bouton.addEventListener('click', () => {
    const numero = Number(bouton.closest('[data-panneau]').dataset.panneau);
    allerEtape(numero - 1);
  }));
  boutonEtape.forEach((bouton) => bouton.addEventListener('click', () => {
    if (!bouton.disabled) allerEtape(Number(bouton.dataset.allerEtape));
  }));

  $$('[data-preselection]').forEach((lien) => lien.addEventListener('click', () => {
    const choix = choixPrestations.find((input) => input.value === lien.dataset.preselection);
    if (choix) {
      choix.checked = true;
      choix.dispatchEvent(new Event('change', { bubbles: true }));
      if (etape !== 1) allerEtape(1);
    }
  }));

  /* Contrôles des coordonnées, sans transmission ni stockage. */
  const prenom = $('#prenom');
  const telephone = $('#telephone');
  const erreurPrenom = $('[data-erreur-prenom]');
  const erreurTelephone = $('[data-erreur-telephone]');
  function validerPrenom() {
    const valide = prenom.value.trim().length > 0;
    prenom.setAttribute('aria-invalid', String(!valide));
    erreurPrenom.textContent = valide ? '' : 'Indiquez votre prénom.';
    return valide;
  }
  function validerTelephone() {
    const numero = telephone.value.replace(/[\s().-]/g, '');
    const valide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(numero);
    telephone.setAttribute('aria-invalid', String(!valide));
    erreurTelephone.textContent = valide ? '' : 'Saisissez un numéro de mobile français valide.';
    return valide;
  }
  prenom.addEventListener('blur', () => { if (prenom.dataset.touche) validerPrenom(); });
  telephone.addEventListener('blur', () => { if (telephone.dataset.touche) validerTelephone(); });
  [prenom, telephone].forEach((champ) => champ.addEventListener('input', () => {
    champ.dataset.touche = 'oui';
    if (champ === prenom && erreurPrenom.textContent) validerPrenom();
    if (champ === telephone && erreurTelephone.textContent) validerTelephone();
  }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    prenom.dataset.touche = 'oui';
    telephone.dataset.touche = 'oui';
    const nomValide = validerPrenom();
    const numeroValide = validerTelephone();
    if (!nomValide) { prenom.focus(); return; }
    if (!numeroValide) { telephone.focus(); return; }
    const service = prestationActuelle();
    const recap = `${service.dataset.nom} · ${majusculeInitiale(jourFr(dateLocale(jourChoisi)))} à ${heureFr(Number(heureChoisie))}.`;
    $('[data-resultat-recap]').textContent = recap;
    form.hidden = true;
    $('.booking-steps').hidden = true;
    annonce.textContent = 'Simulation terminée. Aucune demande n’a été envoyée.';
    resultat.hidden = false;
    resultat.focus();
  });

  /* Les dix prochains jours sont générés localement pour l’aperçu. */
  creerChoixJour();
  majRecapitulatif();
  actualiserEtapes();
})();
