/* Gentleman Barber Shop — simulation locale, sans transmission ni stockage. */
(() => {
  'use strict';

  const racine = document.documentElement;
  const $ = (selecteur, parent = document) => parent.querySelector(selecteur);
  const $$ = (selecteur, parent = document) => [...parent.querySelectorAll(selecteur)];
  const reduction = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prestations = {
    gentleman: { nom: 'Barbe sculptée et tracée façon Gentleman', complement: 'Serviette chaude + soins', duree: 20 },
    contour: { nom: 'Taille et contour barbe', complement: '', duree: 20 },
    rasage: { nom: 'Rasage complet de la barbe à l’ancienne', complement: '', duree: 20 },
    coupe: { nom: 'Homme — coupe aux ciseaux et tondeuse', complement: '', duree: 30 }
  };
  // Treatwell, recherche fournie du 02/11/2026 ; divergences signalées sur la page.
  // Minutes depuis minuit. Dimanche et lundi fermés.
  const horaires = [null, null, [600, 1140], [600, 1140], [600, 1140], [600, 1140], [540, 1140]];
  const formatParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const formatLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const etat = { prestation: 'gentleman', jour: '', heure: null, etape: 0 };
  const formulaire = $('#formulaire');
  const panneaux = $$('[data-panneau]');
  const boutonsEtapes = $$('[data-etape]');
  const resultat = $('#resultat');
  let changement = 0;
  let clavier = false;
  let derniereMinute = '';

  function maintenantParis() {
    const parties = Object.fromEntries(formatParis.formatToParts(new Date()).map(p => [p.type, p.value]));
    return {
      date: new Date(Date.UTC(+parties.year, +parties.month - 1, +parties.day, 12)),
      minutes: +parties.hour * 60 + +parties.minute
    };
  }
  const cleJour = date => date.toISOString().slice(0, 10);
  const dateDeCle = cle => new Date(`${cle}T12:00:00Z`);
  const heureTexte = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;
  const dureeTexte = prestation => `${prestation.duree}\u00a0min`;

  function creneaux(date) {
    const plage = horaires[date.getUTCDay()];
    if (!plage) return [];
    const actuel = maintenantParis();
    const cle = cleJour(date);
    const aujourdhui = cleJour(actuel.date);
    const resultatCreneaux = [];
    for (let minute = plage[0]; minute + prestations[etat.prestation].duree <= plage[1]; minute += 30) {
      const passe = cle < aujourdhui || (cle === aujourdhui && minute <= actuel.minutes);
      const indisponible = (date.getUTCDate() * 7 + date.getUTCMonth() + minute / 30) % 5 === 1;
      resultatCreneaux.push({ minute, desactive: passe || indisponible, motif: passe ? 'Heure passée' : 'Indisponible dans la simulation' });
    }
    return resultatCreneaux;
  }

  function element(genre, texte, classe) {
    const noeud = document.createElement(genre);
    if (texte !== undefined) noeud.textContent = texte;
    if (classe) noeud.className = classe;
    return noeud;
  }

  function construireJours() {
    const liste = $('#jours');
    const fragment = document.createDocumentFragment();
    const actuel = maintenantParis();
    for (let i = 0; i < 14; i++) {
      const date = new Date(actuel.date.getTime() + i * 86400000);
      const cle = cleJour(date);
      const ferme = !horaires[date.getUTCDay()];
      const complet = !ferme && !creneaux(date).some(c => !c.desactive);
      const label = element('label', undefined, 'choix-jour');
      const radio = element('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = cle;
      radio.disabled = ferme || complet;
      radio.checked = cle === etat.jour && !radio.disabled;
      radio.setAttribute('aria-label', `${formatLong.format(date)}${ferme ? ', fermé selon Treatwell' : complet ? ', aucun créneau dans la simulation' : ', simulation'}`);
      radio.setAttribute('aria-describedby', 'erreur-jour');
      label.append(radio, element('span', formatJour.format(date)), element('strong', String(date.getUTCDate())), element('span', formatMois.format(date)));
      label.append(element('small', ferme ? 'Fermé' : complet ? 'Passé' : 'À confirmer'));
      fragment.append(label);
    }
    liste.replaceChildren(fragment);
    if (etat.jour && !$$('input[name="jour"]', liste).some(r => r.checked)) {
      etat.jour = ''; etat.heure = null;
    }
  }

  function construireHeures() {
    const liste = $('#heures');
    const fragment = document.createDocumentFragment();
    if (!etat.jour) { liste.replaceChildren(); return; }
    const plage = creneaux(dateDeCle(etat.jour));
    plage.forEach(creneau => {
      const label = element('label', undefined, 'choix-heure');
      const radio = element('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = String(creneau.minute);
      radio.disabled = creneau.desactive;
      radio.checked = etat.heure === creneau.minute && !creneau.desactive;
      radio.setAttribute('aria-label', `${heureTexte(creneau.minute)}${creneau.desactive ? `, ${creneau.motif.toLowerCase()}` : ', créneau de simulation'}`);
      radio.setAttribute('aria-describedby', 'aide-heure erreur-heure');
      label.append(radio, element('span', heureTexte(creneau.minute)));
      fragment.append(label);
    });
    liste.replaceChildren(fragment);
    if (etat.heure !== null && !plage.some(c => c.minute === etat.heure && !c.desactive)) etat.heure = null;
    $('#aide-heure').textContent = `${formatLong.format(dateDeCle(etat.jour))}. Créneaux fictifs dans les horaires Treatwell. Les horaires barrés sont désactivés dans cette simulation.`;
  }

  function mettreAJour() {
    const prestation = prestations[etat.prestation];
    $('#resume-prestation').textContent = prestation.nom;
    $('#resume-complement').textContent = [prestation.complement, dureeTexte(prestation)].filter(Boolean).join(' · ');
    $('#resume-jour').textContent = etat.jour ? formatLong.format(dateDeCle(etat.jour)) : 'À choisir';
    $('#resume-heure').textContent = etat.heure !== null ? heureTexte(etat.heure) : 'À choisir';
    const derniereEtape = etat.heure !== null ? 3 : etat.jour ? 2 : 1;
    boutonsEtapes.forEach((bouton, i) => {
      bouton.disabled = i > derniereEtape;
      if (i === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }

  function entrer(panneau) {
    const numero = ++changement;
    panneau.classList.remove('arrive');
    if (reduction.matches || clavier) return;
    panneau.classList.add('arrive');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (numero === changement) panneau.classList.remove('arrive');
    }));
  }

  function afficherEtape(index, deplacerFocus = true) {
    if (index > 1 && !etat.jour) index = 1;
    if (index > 2 && etat.heure === null) index = 2;
    if (index === 1) construireJours();
    if (index === 2) {
      construireHeures();
      if (!etat.jour) { afficherEtape(1, deplacerFocus); return; }
    }
    etat.etape = index;
    resultat.hidden = true; formulaire.hidden = false;
    $('.etapes').hidden = false;
    panneaux.forEach((p, i) => { p.hidden = i !== index; p.classList.remove('arrive'); });
    mettreAJour();
    const panneau = panneaux[index];
    entrer(panneau);
    $('#annonce-etape').textContent = `Étape ${index + 1} sur 4. ${$('h3', panneau).textContent}`;
    if (deplacerFocus) {
      $('h3', panneau).focus({ preventScroll: true });
      panneau.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  document.addEventListener('keydown', () => { clavier = true; racine.classList.add('sans-mouvement'); }, { passive: true });
  document.addEventListener('pointerdown', () => { clavier = false; racine.classList.remove('sans-mouvement'); }, { passive: true });

  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => afficherEtape(+bouton.dataset.etape)));
  $$('[data-suivant]').forEach(bouton => bouton.addEventListener('click', () => {
    const cible = +bouton.dataset.suivant;
    if (cible === 2 && !etat.jour) {
      $('#erreur-jour').textContent = 'Choisissez un jour pour continuer.';
      $('input[name="jour"]:not(:disabled)')?.focus(); return;
    }
    if (cible === 3) {
      construireHeures();
      if (etat.heure === null) {
        $('#erreur-heure').textContent = 'Choisissez une heure pour continuer.';
        $('input[name="heure"]:not(:disabled)')?.focus(); return;
      }
    }
    afficherEtape(cible);
  }));

  formulaire.addEventListener('change', evenement => {
    const champ = evenement.target;
    if (champ.name === 'prestation') {
      etat.prestation = champ.value; etat.heure = null;
      construireJours();
    } else if (champ.name === 'jour') {
      etat.jour = champ.value; etat.heure = null;
      $('#erreur-jour').textContent = '';
    } else if (champ.name === 'heure') {
      etat.heure = +champ.value;
      $('#erreur-heure').textContent = '';
    }
    mettreAJour();
  });

  $$('[data-choisir]').forEach(lien => lien.addEventListener('click', evenement => {
    evenement.preventDefault();
    history.replaceState(null, '', '#rendez-vous');
    etat.prestation = lien.dataset.choisir; etat.heure = null;
    $(`input[name="prestation"][value="${etat.prestation}"]`).checked = true;
    afficherEtape(1);
  }));

  function verifierChamp(champ) {
    let message = '';
    if (champ.id === 'prenom' && !champ.value.trim()) message = 'Indiquez votre prénom pour essayer la confirmation.';
    if (champ.id === 'telephone') {
      const numero = champ.value.replace(/[\s.()\-]/g, '');
      if (!/^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(numero)) message = 'Indiquez un mobile français valide, commençant par 06, 07 ou +33.';
    }
    $(`#erreur-${champ.id}`).textContent = message;
    if (message) champ.setAttribute('aria-invalid', 'true');
    else champ.removeAttribute('aria-invalid');
    return !message;
  }

  [$('#prenom'), $('#telephone')].forEach(champ => {
    champ.addEventListener('blur', () => { if (champ.value || champ.hasAttribute('aria-invalid')) verifierChamp(champ); });
    champ.addEventListener('input', () => {
      if (champ.hasAttribute('aria-invalid')) {
        champ.removeAttribute('aria-invalid'); $(`#erreur-${champ.id}`).textContent = '';
      }
    });
  });

  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3) return;
    const prenomValide = verifierChamp($('#prenom'));
    const telephoneValide = verifierChamp($('#telephone'));
    if (!prenomValide || !telephoneValide) { (prenomValide ? $('#telephone') : $('#prenom')).focus(); return; }
    // Contrôle de l'heure à nouveau, même si le visiteur a laissé l'onglet ouvert.
    construireJours(); construireHeures();
    if (!etat.jour || etat.heure === null) {
      afficherEtape(etat.jour ? 2 : 1);
      $('#annonce-etape').textContent = 'Ce créneau de simulation n’est plus proposé. Choisissez à nouveau le jour et l’heure.';
      return;
    }
    $('#resultat-texte').textContent = `${$('#prenom').value.trim()}, vous avez essayé le choix «\u00a0${prestations[etat.prestation].nom}\u00a0», le ${formatLong.format(dateDeCle(etat.jour))} à ${heureTexte(etat.heure)}.`;
    formulaire.hidden = true; $('.etapes').hidden = true; resultat.hidden = false;
    entrer(resultat);
    $('#titre-resultat').focus({ preventScroll: true });
    resultat.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    $('#annonce-etape').textContent = 'Simulation terminée. Aucun rendez-vous réservé, aucune information envoyée.';
  });

  $('#recommencer').addEventListener('click', () => {
    formulaire.reset(); etat.prestation = 'gentleman'; etat.jour = ''; etat.heure = null;
    $$('.erreur').forEach(p => { p.textContent = ''; });
    $$('[aria-invalid]').forEach(champ => champ.removeAttribute('aria-invalid'));
    afficherEtape(0);
  });

  // Aucune boucle de défilement : chaque élément est observé puis libéré.
  if ('IntersectionObserver' in window && !reduction.matches) {
    const observateur = new IntersectionObserver(entrees => {
      let decalage = 0;
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        if (entree.target.dataset.revelation === 'ligne') {
          entree.target.style.transitionDelay = `${Math.min(decalage, 180)}ms`;
          decalage += 60;
        }
        entree.target.classList.remove('attend'); observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    $$('[data-revelation]').forEach(noeud => { noeud.classList.add('attend'); observateur.observe(noeud); });
  }
  const barre = $('.barre-mobile');
  if ('IntersectionObserver' in window) {
    const visibles = new Set();
    const observateurBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => entree.isIntersecting ? visibles.add(entree.target) : visibles.delete(entree.target));
      const masquer = visibles.size > 0;
      barre.classList.toggle('masquee', masquer);
      barre.inert = masquer;
      if (masquer) barre.setAttribute('aria-hidden', 'true');
      else barre.removeAttribute('aria-hidden');
    }, { threshold: 0 });
    [$('#rendez-vous'), $('#pied')].forEach(noeud => observateurBarre.observe(noeud));
  }
  reduction.addEventListener('change', () => {
    if (reduction.matches) $$('[data-revelation]').forEach(noeud => noeud.classList.remove('attend'));
  });

  $('#simulation').hidden = false;
  mettreAJour();
  window.gentlemanPret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('pret')));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || formulaire.hidden) return;
    const moment = maintenantParis();
    const minute = `${cleJour(moment.date)}-${moment.minutes}`;
    if (minute === derniereMinute) return;
    derniereMinute = minute;
    const avaitUnJour = !!etat.jour;
    const avaitUneHeure = etat.heure !== null;
    construireJours(); construireHeures(); mettreAJour();
    if ((avaitUnJour && !etat.jour) || (avaitUneHeure && etat.heure === null)) {
      afficherEtape(etat.jour ? 2 : 1, false);
      $('#annonce-etape').textContent = 'Le calendrier de simulation a été actualisé. Vérifiez à nouveau votre choix.';
    }
  });
})();
