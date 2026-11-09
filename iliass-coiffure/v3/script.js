(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const qs = (selector, context = doc) => context.querySelector(selector);
  const qsa = (selector, context = doc) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const panels = qsa('[data-step]');
  const progressButtons = qsa('[data-step-link]');
  const dateList = qs('#date-list');
  const timeList = qs('#time-list');
  const form = qs('#booking-form');
  const live = qs('#booking-live');
  const success = qs('#booking-success');
  const mobileAction = qs('#mobile-action');
  const phoneFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const jourComplet = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const dateCourte = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const heureParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const heuresParJour = {
    0: null,
    1: null,
    2: [[540, 750], [840, 1140]],
    3: [[540, 750], [840, 1140]],
    4: [[540, 750], [840, 1140]],
    5: [[540, 750], [840, 1140]],
    6: [[540, 750], [840, 1140]]
  };
  const heuresSimulees = [540, 600, 660, 840, 900, 960, 1020, 1080];
  const delai = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  let etapeMax = 0;
  let prestationChoisie = '';
  let dateChoisie = null;
  let heureChoisie = null;
  let dateAujourdhui = null;
  let minuteActuelle = 0;

  function horlogeParis() {
    const pieces = {};
    for (const piece of phoneFormat.formatToParts(new Date())) pieces[piece.type] = piece.value;
    return {
      annee: Number(pieces.year),
      mois: Number(pieces.month),
      jour: Number(pieces.day),
      heure: Number(pieces.hour) % 24,
      minute: Number(pieces.minute)
    };
  }

  function obtenirDateCle(date) {
    return date.toISOString().slice(0, 10);
  }

  function dateAffichee(date, format) {
    return format.format(date);
  }

  function majHorloge() {
    const maintenant = horlogeParis();
    dateAujourdhui = new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour, 12));
    minuteActuelle = maintenant.heure * 60 + maintenant.minute;
  }

  function enMajusculeInitiale(texte) {
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  }

  function genererJours() {
    majHorloge();
    dateList.replaceChildren();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(dateAujourdhui.getTime() + decalage * 86400000);
      const jourSemaine = date.getUTCDay();
      const cle = obtenirDateCle(date);
      const ferme = heuresParJour[jourSemaine] === null;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'date-choice';
      bouton.dataset.date = cle;
      bouton.disabled = ferme;
      bouton.setAttribute('aria-pressed', 'false');
      const nomCourt = dateAffichee(date, jourCourt).replace('.', '');
      const nomComplet = enMajusculeInitiale(dateAffichee(date, jourComplet));
      bouton.setAttribute('aria-label', ferme ? `${nomComplet}, fermé` : `${nomComplet}, jour de démonstration`);

      const jour = doc.createElement('span');
      jour.className = 'date-choice__day';
      jour.textContent = enMajusculeInitiale(nomCourt);
      const valeur = doc.createElement('span');
      valeur.className = 'date-choice__date';
      valeur.textContent = dateAffichee(date, dateCourte).replace('.', '');
      const etat = doc.createElement('span');
      etat.className = 'date-choice__state';
      etat.textContent = ferme ? 'Fermé' : decalage === 0 ? 'Aujourd’hui' : 'Démo';
      bouton.append(jour, valeur, etat);
      if (ferme) bouton.classList.add('is-closed');
      if (dateChoisie && cle === obtenirDateCle(dateChoisie)) {
        bouton.classList.add('is-selected');
        bouton.setAttribute('aria-pressed', 'true');
      }
      dateList.append(bouton);
    }
  }

  function calculerBlocages(cle) {
    let total = 0;
    for (const caractere of cle) total = (total * 31 + caractere.charCodeAt(0)) >>> 0;
    const premier = total % heuresSimulees.length;
    const second = (premier + 3 + (total % 3)) % heuresSimulees.length;
    return new Set([premier, second]);
  }

  function heureLisible(minutes) {
    const heures = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minutesRestantes = String(minutes % 60).padStart(2, '0');
    return `${heures}\u00a0h\u00a0${minutesRestantes}`;
  }

  function genererHeures() {
    timeList.replaceChildren();
    if (!dateChoisie) return;
    majHorloge();
    const cle = obtenirDateCle(dateChoisie);
    const jourSemaine = dateChoisie.getUTCDay();
    const plages = heuresParJour[jourSemaine];
    if (!plages) return;
    const indisponibles = calculerBlocages(cle);

    heuresSimulees.forEach((minute, index) => {
      const dansUnePlage = plages.some(([debut, fin]) => minute >= debut && minute < fin);
      if (!dansUnePlage) return;
      const passe = cle === obtenirDateCle(dateAujourdhui) && minute <= minuteActuelle;
      const bloquePourLaDemo = indisponibles.has(index);
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'time-choice';
      bouton.dataset.heure = String(minute);
      bouton.disabled = passe || bloquePourLaDemo;
      bouton.setAttribute('aria-pressed', 'false');
      const heure = heureLisible(minute);
      const texte = doc.createElement('span');
      texte.className = 'time-choice__time';
      texte.textContent = heure;
      const etat = doc.createElement('span');
      etat.className = 'time-choice__state';
      if (passe) {
        etat.textContent = 'Passé';
        bouton.setAttribute('aria-label', `${heure}, heure passée`);
      } else if (bloquePourLaDemo) {
        etat.textContent = 'Indisponible en démo';
        bouton.setAttribute('aria-label', `${heure}, indisponible dans cette simulation`);
      } else {
        etat.textContent = 'Démo';
        bouton.setAttribute('aria-label', `${heure}, créneau de démonstration`);
      }
      if (!bouton.disabled && heureChoisie === minute) {
        bouton.classList.add('is-selected');
        bouton.setAttribute('aria-pressed', 'true');
      }
      bouton.append(texte, etat);
      timeList.append(bouton);
    });
  }

  function valeurChamp(nom) {
    if (nom === 'prestation') return prestationChoisie;
    if (nom === 'jour') return dateChoisie ? enMajusculeInitiale(dateAffichee(dateChoisie, jourComplet)) : '';
    if (nom === 'heure') return heureChoisie === null ? '' : heureLisible(heureChoisie);
    return '';
  }

  function majSelection() {
    const prestation = qs('#recap-prestation');
    const jour = qs('#recap-jour');
    const heure = qs('#recap-heure');
    const prenom = qs('#recap-nom');
    prestation.textContent = prestationChoisie || 'À choisir';
    jour.textContent = valeurChamp('jour') || 'À choisir';
    heure.textContent = valeurChamp('heure') || 'À choisir';
    prenom.textContent = qs('#nom').value.trim() || 'À saisir';

    qsa('[data-go-step]').forEach((bouton) => {
      const cible = Number(bouton.dataset.goStep);
      const rempli = cible === 0 ? Boolean(prestationChoisie) : cible === 1 ? Boolean(dateChoisie) : Boolean(heureChoisie);
      bouton.disabled = !rempli;
    });
  }

  function actualiserProgression(etapeCourante) {
    progressButtons.forEach((bouton, index) => {
      bouton.disabled = index > etapeMax;
      if (index === etapeCourante) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  async function afficherEtape(index) {
    const nouvelleEtape = panels[index];
    if (!nouvelleEtape || nouvelleEtape.hidden) {
      if (nouvelleEtape && nouvelleEtape.hidden) {
        nouvelleEtape.hidden = false;
        nouvelleEtape.inert = false;
        nouvelleEtape.setAttribute('aria-hidden', 'false');
      }
    }
    const ancienneEtape = panels.find((panneau) => panneau.classList.contains('is-active'));
    if (ancienneEtape === nouvelleEtape) return;

    if (ancienneEtape) {
      ancienneEtape.classList.remove('is-active', 'is-entering');
      ancienneEtape.hidden = true;
      ancienneEtape.inert = true;
      ancienneEtape.setAttribute('aria-hidden', 'true');
    }
    nouvelleEtape.hidden = false;
    nouvelleEtape.inert = false;
    nouvelleEtape.setAttribute('aria-hidden', 'false');
    nouvelleEtape.classList.add('is-active', 'is-entering');
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => nouvelleEtape.classList.remove('is-entering')));

    actualiserProgression(index);
    live.textContent = `Étape ${index + 1} sur 4 · ${qs('h3', nouvelleEtape).textContent}.`;
    qs('h3', nouvelleEtape).focus();
    if (index === 1) genererJours();
    if (index === 2) genererHeures();
    majSelection();
    await delai(0);
  }

  function afficherErreur(champ, message) {
    const messageErreur = qs(`[data-error="${champ}"]`);
    if (messageErreur) messageErreur.textContent = message;
    const entree = champ === 'prestation' ? null : champ === 'jour' || champ === 'heure' ? null : qs(`#${champ}`);
    if (entree) entree.setAttribute('aria-invalid', 'true');
  }

  function effacerErreur(champ) {
    const messageErreur = qs(`[data-error="${champ}"]`);
    if (messageErreur) messageErreur.textContent = '';
    const entree = champ === 'prestation' ? null : champ === 'jour' || champ === 'heure' ? null : qs(`#${champ}`);
    if (entree) entree.removeAttribute('aria-invalid');
  }

  function validerPrestation() {
    const valeur = qs('input[name="prestation"]:checked');
    if (!valeur) {
      afficherErreur('prestation', 'Choisissez une prestation pour continuer.');
      return false;
    }
    effacerErreur('prestation');
    prestationChoisie = valeur.value;
    return true;
  }

  function validerJour() {
    if (!dateChoisie) {
      afficherErreur('jour', 'Choisissez un jour ouvert dans cette simulation.');
      return false;
    }
    effacerErreur('jour');
    return true;
  }

  function validerHeure() {
    const selection = heureChoisie === null ? null : qs(`[data-heure="${heureChoisie}"]`, timeList);
    if (!selection || selection.disabled) {
      heureChoisie = null;
      majSelection();
      afficherErreur('heure', 'Choisissez une heure proposée dans cette simulation.');
      return false;
    }
    effacerErreur('heure');
    return true;
  }

  function validerCoordonnees() {
    const prenom = qs('#nom');
    const telephone = qs('#telephone');
    let valide = true;
    const valeurPrenom = prenom.value.trim();
    if (valeurPrenom.length < 2) {
      afficherErreur('nom', 'Saisissez un prénom d’au moins deux caractères.');
      valide = false;
    } else {
      effacerErreur('nom');
    }
    const numeroNormalise = telephone.value.replace(/[\s.()-]/g, '');
    const estMobileFrancais = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(numeroNormalise);
    if (!estMobileFrancais) {
      afficherErreur('telephone', 'Saisissez un numéro mobile français commençant par 06 ou 07.');
      valide = false;
    } else {
      effacerErreur('telephone');
    }
    if (!valide) {
      const premierInvalide = qs('[aria-invalid="true"]', panels[3]);
      if (premierInvalide) premierInvalide.focus();
    }
    majSelection();
    return valide;
  }

  function mettreAJourJoursChoisis(cible, valeur) {
    qsa(`${cible} button`).forEach((bouton) => {
      const choisi = bouton.dataset.date === valeur;
      bouton.classList.toggle('is-selected', choisi);
      bouton.setAttribute('aria-pressed', String(choisi));
    });
  }

  function choisirPrestation(valeur) {
    const radio = qs(`input[name="prestation"][value="${CSS.escape(valeur)}"]`);
    if (!radio) return;
    if (prestationChoisie !== valeur) heureChoisie = null;
    radio.checked = true;
    prestationChoisie = valeur;
    effacerErreur('prestation');
    etapeMax = Math.max(etapeMax, 1);
    actualiserProgression(0);
    majSelection();
  }

  function initialiserMenuMobile() {
    const bouton = qs('.menu-toggle');
    const menu = qs('#navigation-mobile');
    let fermetureMenu = 0;
    function fermerMenu(restaurerFocus) {
      window.clearTimeout(fermetureMenu);
      bouton.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      menu.inert = true;
      fermetureMenu = window.setTimeout(() => { menu.hidden = true; }, reduceMotion.matches ? 120 : 200);
      if (restaurerFocus) bouton.focus();
    }
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-expanded') === 'true';
      if (ouvert) {
        fermerMenu(false);
        return;
      }
      window.clearTimeout(fermetureMenu);
      menu.hidden = false;
      menu.inert = false;
      bouton.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => menu.classList.add('is-open')));
      qs('a', menu).focus({ preventScroll: true });
    });
    menu.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) fermerMenu(false);
    });
    doc.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermerMenu(true);
    });
  }

  function initialiserLignes() {
    const groupes = new Map();
    qsa('[data-cascade]').forEach((element) => {
      const parent = element.parentElement;
      if (!groupes.has(parent)) groupes.set(parent, []);
      groupes.get(parent).push(element);
    });
    if (!('IntersectionObserver' in window)) {
      qsa('[data-cascade]').forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        const lignes = groupes.get(entree.target) || [entree.target];
        lignes.forEach((ligne, index) => {
          ligne.style.setProperty('--delai', `${index * 40}ms`);
          ligne.classList.add('is-visible');
        });
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    groupes.forEach((lignes) => observateur.observe(lignes[0].parentElement));
  }

  function initialiserBarreMobile() {
    if (!('IntersectionObserver' in window)) return;
    const observateur = new IntersectionObserver((entrees) => {
      const visibles = entrees.filter((entree) => entree.isIntersecting).map((entree) => entree.target);
      const masquer = visibles.length > 0;
      if (masquer && mobileAction.contains(doc.activeElement)) {
        const destination = visibles.some((element) => element.classList.contains('site-footer'))
          ? qs('.footer-up')
          : qs('#titre-reserver');
        destination.focus({ preventScroll: true });
      }
      mobileAction.classList.toggle('is-away', masquer);
      mobileAction.setAttribute('aria-hidden', String(masquer));
      mobileAction.inert = masquer;
    }, { threshold: 0.15 });
    observateur.observe(qs('#reserver'));
    observateur.observe(qs('.site-footer'));
  }

  function initialiserRendezVous() {
    form.addEventListener('change', (evenement) => {
      if (evenement.target.name === 'prestation') {
        if (prestationChoisie !== evenement.target.value) heureChoisie = null;
        prestationChoisie = evenement.target.value;
        effacerErreur('prestation');
        majSelection();
      }
      if (evenement.target.id === 'nom') majSelection();
    });
    qs('#nom').addEventListener('input', majSelection);
    qs('#telephone').addEventListener('input', () => effacerErreur('telephone'));

    qsa('[data-next]').forEach((bouton) => bouton.addEventListener('click', async () => {
      const active = Number(qs('.booking-step.is-active').dataset.step);
      const valide = active === 0 ? validerPrestation() : active === 1 ? validerJour() : validerHeure();
      if (!valide) return;
      etapeMax = Math.max(etapeMax, active + 1);
      await afficherEtape(active + 1);
    }));
    qsa('[data-previous]').forEach((bouton) => bouton.addEventListener('click', () => {
      const active = Number(qs('.booking-step.is-active').dataset.step);
      afficherEtape(Math.max(0, active - 1));
    }));
    progressButtons.forEach((bouton) => bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.stepLink);
      if (cible <= etapeMax) afficherEtape(cible);
    }));
    qsa('[data-go-step]').forEach((bouton) => bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.goStep);
      if (!bouton.disabled) afficherEtape(cible);
    }));
    dateList.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-date]');
      if (!bouton || bouton.disabled) return;
      dateChoisie = new Date(`${bouton.dataset.date}T12:00:00Z`);
      heureChoisie = null;
      mettreAJourJoursChoisis('#date-list', bouton.dataset.date);
      effacerErreur('jour');
      majSelection();
    });
    timeList.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-heure]');
      if (!bouton || bouton.disabled) return;
      heureChoisie = Number(bouton.dataset.heure);
      qsa('[data-heure]', timeList).forEach((choix) => {
        const choisi = choix === bouton;
        choix.classList.toggle('is-selected', choisi);
        choix.setAttribute('aria-pressed', String(choisi));
      });
      effacerErreur('heure');
      majSelection();
    });
    qsa('[data-prestation]').forEach((lien) => lien.addEventListener('click', () => choisirPrestation(lien.dataset.prestation)));
    form.addEventListener('submit', (evenement) => {
      evenement.preventDefault();
      if (!validerCoordonnees()) return;
      qsa('.booking-progress, .booking-live, .booking-step', form).forEach((element) => { element.hidden = true; });
      success.hidden = false;
      live.textContent = 'Parcours terminé. Aucune demande n’a été envoyée.';
      majSelection();
      qs('h3', success).focus();
    });
    qs('#recommencer').addEventListener('click', () => {
      prestationChoisie = '';
      dateChoisie = null;
      heureChoisie = null;
      etapeMax = 0;
      form.reset();
      success.hidden = true;
      qsa('.booking-progress, .booking-live', form).forEach((element) => { element.hidden = false; });
      panels.forEach((panneau, index) => {
        panneau.hidden = index !== 0;
        panneau.inert = index !== 0;
        panneau.setAttribute('aria-hidden', String(index !== 0));
        panneau.classList.toggle('is-active', index === 0);
        panneau.classList.remove('is-entering');
      });
      qsa('[data-error]').forEach((element) => { element.textContent = ''; });
      qsa('[aria-invalid]', form).forEach((element) => element.removeAttribute('aria-invalid'));
      actualiserProgression(0);
      majSelection();
      qs('h3', panels[0]).focus();
    });
  }

  function lancerEntree() {
    window.__siteReady = true;
    window.requestAnimationFrame(() => {
      qsa('[data-intro]').forEach((element, index) => {
        window.setTimeout(() => element.classList.add('is-visible'), index * 95);
      });
    });
  }

  function initialiser() {
    initialiserMenuMobile();
    initialiserLignes();
    initialiserBarreMobile();
    initialiserRendezVous();
    genererJours();
    actualiserProgression(0);
    majSelection();
    lancerEntree();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', initialiser, { once: true });
  else initialiser();
})();
