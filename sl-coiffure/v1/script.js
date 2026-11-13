(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prestations = {
    coupe: { nom: 'Coupe', titre: 'La coupe', texte: 'La coupe des cheveux est mentionnée sur le profil L’Oréal Professionnel de SL COIFFURE.' },
    coloration: { nom: 'Coloration', titre: 'La coloration', texte: 'Le profil L’Oréal Professionnel mentionne la coloration, ainsi que les noms iNOA et DIA COLOR.' },
    balayage: { nom: 'French Balayage', titre: 'French Balayage', texte: 'French Balayage figure parmi les prestations du profil L’Oréal Professionnel du salon.' }
  };
  const heuresPubliees = { 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const etat = { etape: 0, atteint: 0, prestation: '', date: '', heure: null, termine: false };
  const formulaire = $('#simulation-formulaire');
  const panneaux = $$('[data-panneau]');
  const boutonsEtapes = $$('[data-etape]');
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  const formatLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  let derniereAnimation;
  let clavier = false;
  document.addEventListener('keydown', () => { clavier = true; document.documentElement.classList.add('clavier'); }, true);
  document.addEventListener('pointerdown', () => { clavier = false; document.documentElement.classList.remove('clavier'); }, true);
  function focaliser(element) {
    element.focus({ preventScroll: true });
    const resume = $('.resume-mobile');
    const marge = resume.offsetHeight ? resume.offsetHeight + 28 : 24;
    const position = element.getBoundingClientRect();
    if (position.top < marge || position.bottom > window.innerHeight - 24) {
      window.scrollTo({ top: window.scrollY + position.top - marge, behavior: 'instant' });
    }
  }
  const animer = element => {
    if (derniereAnimation) derniereAnimation.cancel();
    if (!mouvementReduit.matches && !clavier && element.animate) {
      derniereAnimation = element.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  };
  function parisMaintenant() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = Object.fromEntries(parties.map(x => [x.type, x.value]));
    return { iso: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  const dateDepuisIso = iso => new Date(`${iso}T12:00:00Z`);
  const heureLisible = minutes => `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${String(minutes % 60).padStart(2, '0')}` : ''}`;
  function heuresPour(iso) {
    const maintenant = parisMaintenant();
    const plage = heuresPubliees[dateDepuisIso(iso).getUTCDay()];
    if (!plage || iso < maintenant.iso) return [];
    const resultat = [];
    // Uniquement des heures de début fictives ; aucune durée de prestation n’est supposée.
    for (let minute = plage[0]; minute < plage[1]; minute += 60) {
      if (iso !== maintenant.iso || minute > maintenant.minutes) resultat.push(minute);
    }
    return resultat;
  }
  function selectionValide() {
    return Boolean(prestations[etat.prestation] && etat.date && heuresPour(etat.date).includes(etat.heure));
  }
  function creerChoix(nom, valeur, classe, contenu, desactive = false) {
    const label = document.createElement('label');
    label.className = classe;
    const input = document.createElement('input');
    input.type = 'radio'; input.name = nom; input.value = valeur; input.disabled = desactive;
    label.append(input);
    contenu.forEach(([texte, classeTexte, balise]) => {
      const morceau = document.createElement(balise || 'span');
      if (classeTexte) morceau.className = classeTexte;
      morceau.textContent = texte;
      label.append(morceau);
    });
    return label;
  }
  function dessinerJours() {
    const maintenant = parisMaintenant();
    const depart = dateDepuisIso(maintenant.iso);
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 14; i++) {
      const d = new Date(depart); d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const semaine = d.getUTCDay();
      const disponible = heuresPour(iso).length > 0;
      const statut = semaine === 1 ? 'À confirmer' : semaine === 0 ? 'Fermé' : !disponible ? 'Passé' : formatMois.format(d);
      const label = creerChoix('jour', iso, 'jour', [
        [formatJour.format(d)], [String(d.getUTCDate()), 'jour-nombre'], [statut, '', 'small']
      ], !disponible);
      $('input', label).setAttribute('aria-label', `${formatLong.format(d)}${!disponible ? `, ${statut.toLowerCase()}` : ', jour de démonstration'}`);
      $('input', label).checked = iso === etat.date;
      fragment.append(label);
    }
    $('#jours').replaceChildren(fragment);
  }
  function dessinerHeures() {
    const fragment = document.createDocumentFragment();
    const heures = heuresPour(etat.date);
    heures.forEach(minute => {
      const label = creerChoix('heure', String(minute), 'heure', [[heureLisible(minute)]]);
      $('input', label).checked = minute === etat.heure;
      fragment.append(label);
    });
    $('#heures').replaceChildren(fragment);
    $('#heures-champ').hidden = false;
    $('#titre-heures').textContent = `Heure de démonstration · ${formatLong.format(dateDepuisIso(etat.date))}`;
    $('#message-heures').textContent = heures.length ? `Heures de démonstration pour le ${formatLong.format(dateDepuisIso(etat.date))}. Aucune disponibilité réelle indiquée.` : 'Les heures de ce jour sont passées. Choisissez un autre jour.';
  }
  function mettreAJourSelection() {
    $('#selection-prestation').textContent = prestations[etat.prestation]?.nom || 'À choisir';
    if (etat.date) {
      const d = dateDepuisIso(etat.date);
      $('#selection-jour').textContent = String(d.getUTCDate());
      $('#selection-mois').textContent = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
    } else {
      $('#selection-jour').textContent = 'À vous';
      $('#selection-mois').textContent = 'de choisir';
    }
    $('#selection-heure').textContent = etat.heure === null ? 'À choisir' : heureLisible(etat.heure);
    const selection = [prestations[etat.prestation]?.nom || 'Prestation à choisir'];
    if (etat.date) selection.push(new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(dateDepuisIso(etat.date)));
    if (etat.heure !== null) selection.push(heureLisible(etat.heure));
    $('#resume-mobile-texte').textContent = selection.join(' · ');
  }
  function allerEtape(numero) {
    etat.etape = numero;
    etat.atteint = Math.max(etat.atteint, numero);
    panneaux.forEach((panneau, i) => { panneau.hidden = i !== numero; });
    boutonsEtapes.forEach((bouton, i) => {
      bouton.disabled = i > etat.atteint;
      if (i === numero) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    if (numero === 1) {
      dessinerJours();
      if (etat.date) dessinerHeures();
    }
    $('#retour').hidden = numero === 0;
    $('#continuer').textContent = ['Choisir la date →', 'Continuer →', 'Terminer la simulation →'][numero];
    $('#erreur-parcours').textContent = '';
    $('#annonce-etape').textContent = `Étape ${numero + 1} sur 3 : ${['prestation', 'date et heure de démonstration', 'coordonnées'][numero]}.`;
    animer(panneaux[numero]);
    mettreAJourSelection();
    focaliser($('h3', panneaux[numero]));
  }
  function afficherPrestation(id, anime = true) {
    if (!prestations[id]) return;
    $$('[data-prestation]').forEach(bouton => bouton.setAttribute('aria-pressed', String(bouton.dataset.prestation === id)));
    $('#nom-prestation').textContent = prestations[id].titre;
    $('#texte-prestation').textContent = prestations[id].texte;
    $('.essayer-prestation').dataset.essayer = id;
    if (anime) animer($('#detail-prestation'));
  }
  $$('[data-prestation]').forEach(bouton => bouton.addEventListener('click', () => afficherPrestation(bouton.dataset.prestation)));
  $('.essayer-prestation').addEventListener('click', event => {
    if (etat.termine) reinitialiser();
    const id = event.currentTarget.dataset.essayer;
    etat.prestation = id;
    $(`input[name="prestation"][value="${id}"]`).checked = true;
    allerEtape(0);
  });
  boutonsEtapes.forEach(bouton => bouton.addEventListener('click', () => allerEtape(Number(bouton.dataset.etape))));
  $('#retour').addEventListener('click', () => allerEtape(Math.max(0, etat.etape - 1)));
  formulaire.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') etat.prestation = input.value;
    if (input.name === 'jour') {
      etat.date = input.value; etat.heure = null;
      dessinerHeures();
    }
    if (input.name === 'heure') etat.heure = Number(input.value);
    $('#erreur-parcours').textContent = '';
    mettreAJourSelection();
  });
  function validerChamp(id) {
    const champ = $(`#${id}`);
    const valeur = champ.value.trim();
    let erreur = '';
    if (id === 'prenom' && !valeur) erreur = 'Indiquez un prénom, même fictif, pour poursuivre cet essai.';
    if (id === 'telephone' && !/^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(valeur.replace(/[\s.()\-]/g, ''))) erreur = 'Indiquez un numéro français à dix chiffres ou commençant par +33.';
    $(`#erreur-${id}`).textContent = erreur;
    champ.setAttribute('aria-invalid', String(Boolean(erreur)));
    return !erreur;
  }
  ['prenom', 'telephone'].forEach(id => {
    $(`#${id}`).addEventListener('blur', () => { if ($(`#${id}`).value || $(`#${id}`).getAttribute('aria-invalid') === 'true') validerChamp(id); });
  });
  formulaire.addEventListener('submit', event => {
    event.preventDefault();
    if (etat.etape === 0) {
      if (!prestations[etat.prestation]) { $('#erreur-parcours').textContent = 'Choisissez une prestation pour essayer le parcours.'; focaliser($('input[name="prestation"]')); return; }
      allerEtape(1); return;
    }
    if (!selectionValide()) {
      allerEtape(1);
      $('#erreur-parcours').textContent = 'Choisissez un jour et une heure de démonstration encore à venir.';
      return;
    }
    if (etat.etape === 1) { allerEtape(2); return; }
    const prenomValide = validerChamp('prenom');
    const telephoneValide = validerChamp('telephone');
    if (!prenomValide || !telephoneValide) {
      $('#erreur-parcours').textContent = 'Vérifiez les champs signalés pour terminer la simulation.';
      focaliser($(prenomValide ? '#telephone' : '#prenom')); return;
    }
    etat.termine = true;
    formulaire.hidden = true;
    $('.etapes').hidden = true;
    $('#recapitulatif-final').textContent = `${$('#prenom').value.trim()}, votre essai : ${prestations[etat.prestation].nom}, ${formatLong.format(dateDepuisIso(etat.date))} à ${heureLisible(etat.heure)}. Tarif, durée et disponibilité à confirmer par téléphone.`;
    $('#prenom').value = ''; $('#telephone').value = '';
    $('#resultat').hidden = false;
    $('#annonce-etape').textContent = 'Simulation terminée. Aucune réservation, aucun envoi.';
    animer($('#resultat'));
    focaliser($('h3', $('#resultat')));
  });
  function reinitialiser() {
    formulaire.reset();
    Object.assign(etat, { etape: 0, atteint: 0, prestation: '', date: '', heure: null, termine: false });
    formulaire.hidden = false; $('.etapes').hidden = false; $('#resultat').hidden = true;
    $('#heures-champ').hidden = true; $('#message-heures').textContent = '';
    $('#recapitulatif-final').textContent = '';
    ['prenom', 'telephone'].forEach(id => { $(`#${id}`).removeAttribute('aria-invalid'); $(`#erreur-${id}`).textContent = ''; });
    allerEtape(0);
  }
  $('#recommencer').addEventListener('click', reinitialiser);
  $('#module-reservation').hidden = false;
  dessinerJours();
  // Le mouvement reste un ajout : rien ne dépend d’une animation pour être lisible.
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.entree').forEach(e => e.classList.add('est-visible'))));
  // Une fois l’arrivée terminée, les boutons retrouvent leur réponse de 160 ms.
  setTimeout(() => $$('.entree').forEach(e => e.classList.remove('entree')), 1000);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entrees => entrees.forEach(entree => {
      if (entree.isIntersecting) { entree.target.classList.add('est-visible'); observer.unobserve(entree.target); }
    }), { threshold: .12 });
    $$('[data-revelation]').forEach(e => observer.observe(e));
    const reservation = $('#rendez-vous');
    const pied = $('.pied');
    let dansReservation = false, dansPied = false;
    const barre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target === reservation) dansReservation = entree.isIntersecting;
        if (entree.target === pied) dansPied = entree.isIntersecting;
      });
      $('.barre-mobile').classList.toggle('est-masquee', dansReservation || dansPied);
    }, { threshold: 0 });
    barre.observe(reservation); barre.observe(pied);
  } else $$('[data-revelation]').forEach(e => e.classList.add('est-visible'));
  const galet = $('[data-galet]');
  const hero = $('.hero');
  let hauteurHero = hero.offsetHeight;
  let debutHero = hero.offsetTop;
  let enAttente = false;
  function mettreEnForme() {
    enAttente = false;
    if (mouvementReduit.matches) { galet.style.transform = ''; return; }
    const progression = Math.min(1, Math.max(0, (window.scrollY - debutHero) / hauteurHero));
    galet.style.transform = `rotate(${-8 + progression * 11}deg) scale(${1 + progression * .035}, ${1 - progression * .025})`;
  }
  window.addEventListener('scroll', () => {
    if (!enAttente && !mouvementReduit.matches) { enAttente = true; requestAnimationFrame(mettreEnForme); }
  }, { passive: true });
  window.addEventListener('resize', () => { hauteurHero = hero.offsetHeight; debutHero = hero.offsetTop; mettreEnForme(); }, { passive: true });
  mouvementReduit.addEventListener('change', () => { if (derniereAnimation) derniereAnimation.cancel(); mettreEnForme(); });
  mettreEnForme();
})();
