/* Simulation locale. Aucune transmission, aucun stockage. */
(() => {
  'use strict';
  const heuresPubliees = { 0: null, 1: [840, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1140] };
  const prestations = {
    ciseaux: { nom: 'Shampooing + coupe intégrale aux ciseaux, finition tondeuse', duree: 30 },
    coiffage: { nom: 'Coupe + coiffage homme', duree: 30 },
    shampooing: { nom: 'Shampooing + coupe + coiffage homme', duree: 30 },
    barbe: { nom: 'Coupe + coiffage + barbe et soins', duree: 30 }
  };
  const formatParis = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  const formatSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const nb = '\u00a0';
  function heureParis(instant = new Date()) {
    const p = Object.fromEntries(formatParis.formatToParts(instant).map(m => [m.type, m.value]));
    return { cle: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), date: new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 12)) };
  }
  function ecrireHeure(minutes) {
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return `${h}${nb}h${m ? nb + String(m).padStart(2, '0') : ''}`;
  }
  function creerCreneaux(jour, duree, instant = new Date()) {
    const date = new Date(`${jour}T12:00:00Z`);
    const plage = heuresPubliees[date.getUTCDay()];
    if (!plage || !Number.isFinite(duree) || duree <= 0) return [];
    const present = heureParis(instant);
    const graine = Math.floor(date.getTime() / 86400000);
    const sortie = [];
    for (let minute = plage[0], i = 0; minute + duree <= plage[1]; minute += 30, i++) {
      const passe = jour < present.cle || (jour === present.cle && minute <= present.minutes);
      const occupe = (graine + i * 3) % 7 === 0;
      sortie.push({ minute, disponible: !passe && !occupe, raison: passe ? 'Horaire passé' : occupe ? 'Indisponible dans cet essai' : 'Créneau fictif' });
    }
    return sortie;
  }
  function creerJours(duree, instant = new Date()) {
    const maintenant = heureParis(instant);
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(maintenant.date.getTime() + i * 86400000);
      const cle = date.toISOString().slice(0, 10);
      const ferme = !heuresPubliees[date.getUTCDay()];
      return { date, cle, ferme, disponible: !ferme && creerCreneaux(cle, duree, instant).some(c => c.disponible) };
    });
  }
  function telephoneValide(valeur) {
    return /^(?:0|\+33|0033)[1-9]\d{8}$/.test(valeur.replace(/[\s.()\-]/g, ''));
  }
  /* Les fonctions de calendrier se vérifient aussi dans Node, sans navigateur. */
  if (typeof module !== 'undefined' && module.exports) module.exports = { heureParis, creerCreneaux, creerJours, telephoneValide, heuresPubliees };
  if (typeof document === 'undefined') return;

  const $ = selecteur => document.querySelector(selecteur);
  const $$ = selecteur => [...document.querySelectorAll(selecteur)];
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');
  let clavier = false;
  document.addEventListener('keydown', () => { clavier = true; }, { passive: true });
  document.addEventListener('pointerdown', () => { clavier = false; }, { passive: true });

  /* Trente divisions : un repère pour la demi-heure, sans compte à rebours. */
  const graduations = $('.graduations');
  for (let i = 0; i <= 30; i++) {
    const angle = Math.PI + i * Math.PI / 30;
    const ligne = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const interieur = i % 5 === 0 ? 117 : 123;
    ligne.setAttribute('x1', String(150 + Math.cos(angle) * interieur));
    ligne.setAttribute('y1', String(150 + Math.sin(angle) * interieur));
    ligne.setAttribute('x2', String(150 + Math.cos(angle) * 130));
    ligne.setAttribute('y2', String(150 + Math.sin(angle) * 130));
    graduations.append(ligne);
  }
  $$('.soleil path').forEach((rayon, i) => { rayon.style.animationDelay = `${i * 25}ms`; });
  document.documentElement.classList.add('entree');
  if ('IntersectionObserver' in window) {
    const elements = $$('[data-revelation]');
    const observer = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.isIntersecting) { entree.target.classList.add('visible'); observer.unobserve(entree.target); }
      });
    }, { threshold: .08 });
    elements.forEach(el => observer.observe(el));
    document.documentElement.classList.add('revelations');
    const barre = $('.barre-mobile');
    const zones = { heroDepasse: false, reservation: false, pied: false };
    barre.hidden = true;
    const observerBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target === $('.hero')) zones.heroDepasse = entree.boundingClientRect.bottom <= 0;
        if (entree.target === $('.reservation')) zones.reservation = entree.isIntersecting;
        if (entree.target === $('.pied')) zones.pied = entree.isIntersecting;
      });
      barre.hidden = !zones.heroDepasse || zones.reservation || zones.pied;
    });
    ['.hero', '.reservation', '.pied'].forEach(selecteur => observerBarre.observe($(selecteur)));
  }

  const etat = { prestation: 'ciseaux', jour: '', minute: null, etape: 0, accessible: 0 };
  const panneaux = $$('[data-panneau]');
  const boutonsEtape = $$('[data-etape]');
  const annonce = $('#annonce');
  let transitionEnCours = false;
  let animationSelection;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }
  function actualiserSelection() {
    const prestation = prestations[etat.prestation];
    $('#selection-prestation').textContent = prestation.nom;
    $('#selection-duree').textContent = `${prestation.duree}${nb}min`;
    $('#selection-jour').textContent = etat.jour ? formatJour.format(new Date(`${etat.jour}T12:00:00Z`)) : 'À choisir';
    $('#selection-heure').textContent = etat.minute !== null ? ecrireHeure(etat.minute) : 'À choisir';
    $$('[data-suivant="2"]').forEach(b => { b.disabled = !etat.jour; });
    $$('[data-suivant="3"]').forEach(b => { b.disabled = etat.minute === null; });
    boutonsEtape.forEach(b => {
      const n = Number(b.dataset.etape);
      b.disabled = n > etat.accessible;
      if (n === etat.etape) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    if (!reduire.matches && !clavier && $('.recapitulatif').animate) {
      if (animationSelection) animationSelection.cancel();
      animationSelection = $('.selection-prestation').animate([{ opacity: .5, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    }
  }
  function afficherJours() {
    const jours = $('#jours');
    jours.replaceChildren();
    creerJours(prestations[etat.prestation].duree).forEach(jour => {
      const label = element('label', 'jour');
      const input = element('input');
      input.type = 'radio'; input.name = 'jour'; input.value = jour.cle;
      input.disabled = !jour.disponible; input.checked = etat.jour === jour.cle;
      const statut = jour.ferme ? 'Fermé' : !jour.disponible ? 'Écoulé' : 'Essai';
      input.setAttribute('aria-label', `${formatJour.format(jour.date)} — ${jour.ferme ? 'fermé' : jour.disponible ? 'jour fictif de la simulation' : 'aucun créneau d’essai restant'}`);
      const texte = element('span');
      texte.append(element('span', '', formatSemaine.format(jour.date)), element('b', '', String(jour.date.getUTCDate())), element('span', '', formatMois.format(jour.date)), element('small', '', statut));
      label.append(input, texte); jours.append(label);
    });
  }
  function afficherHeures() {
    const heures = $('#heures'); heures.replaceChildren();
    if (!etat.jour) return;
    $('#rappel-jour').textContent = formatJour.format(new Date(`${etat.jour}T12:00:00Z`));
    const creneaux = creerCreneaux(etat.jour, prestations[etat.prestation].duree);
    $('#aucune-heure').hidden = creneaux.some(c => c.disponible);
    creneaux.forEach(creneau => {
      const label = element('label', 'heure'), input = element('input');
      input.type = 'radio'; input.name = 'heure'; input.value = String(creneau.minute);
      input.disabled = !creneau.disponible; input.checked = etat.minute === creneau.minute;
      input.setAttribute('aria-label', `${ecrireHeure(creneau.minute)} — ${creneau.raison}`);
      label.append(input, element('span', '', ecrireHeure(creneau.minute))); heures.append(label);
    });
  }
  async function allerEtape(numero, focus = true) {
    if (transitionEnCours || (numero > 0 && !prestations[etat.prestation]) || (numero > 1 && !etat.jour) || (numero > 2 && etat.minute === null)) return;
    const precedent = panneaux[etat.etape], suivant = panneaux[numero];
    if (numero === etat.etape) { if (focus) suivant.querySelector('h3').focus(); return; }
    const anime = !reduire.matches && !clavier && typeof precedent.animate === 'function';
    transitionEnCours = true;
    if (numero === 1) afficherJours();
    if (numero === 2) afficherHeures();
    try {
      if (anime) await precedent.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-5px)' }], { duration: 110, easing: 'cubic-bezier(0.23,1,0.32,1)' }).finished;
      precedent.hidden = true; suivant.hidden = false;
      etat.etape = numero; etat.accessible = Math.max(etat.accessible, Math.min(numero, 3));
      actualiserSelection();
      if (focus) {
        const titre = suivant.querySelector('h3');
        titre.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        titre.focus({ preventScroll: true });
      }
      annonce.textContent = numero === 4 ? 'Simulation terminée. Aucun rendez-vous pris.' : `Étape ${numero + 1} sur 4 : ${suivant.querySelector('h3').textContent}`;
      if (anime) await suivant.animate([{ opacity: 0, transform: 'translateX(5px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 110, easing: 'cubic-bezier(0.23,1,0.32,1)' }).finished;
    } finally { transitionEnCours = false; }
  }
  function choisirPrestation(cle) {
    if (!prestations[cle]) return;
    etat.prestation = cle; etat.jour = ''; etat.minute = null; etat.accessible = 0;
    $$('input[name="prestation"]').forEach(input => { input.checked = input.value === cle; });
    actualiserSelection();
  }
  $$('[data-prestation]').forEach(lien => lien.addEventListener('click', () => {
    choisirPrestation(lien.dataset.prestation);
    allerEtape(0);
  }));
  $$('input[name="prestation"]').forEach(input => input.addEventListener('change', () => choisirPrestation(input.value)));
  $('#jours').addEventListener('change', evenement => {
    if (evenement.target.name !== 'jour') return;
    etat.jour = evenement.target.value; etat.minute = null; etat.accessible = 2;
    actualiserSelection(); annonce.textContent = `Jour d’essai choisi : ${$('#selection-jour').textContent}.`;
  });
  $('#heures').addEventListener('change', evenement => {
    if (evenement.target.name !== 'heure') return;
    etat.minute = Number(evenement.target.value); etat.accessible = 3;
    actualiserSelection(); annonce.textContent = `Heure d’essai choisie : ${ecrireHeure(etat.minute)}.`;
  });
  $$('[data-suivant]').forEach(b => b.addEventListener('click', () => allerEtape(Number(b.dataset.suivant))));
  $$('[data-retour]').forEach(b => b.addEventListener('click', () => allerEtape(Number(b.dataset.retour))));
  boutonsEtape.forEach(b => b.addEventListener('click', () => allerEtape(Number(b.dataset.etape))));

  function validerChamp(champ) {
    let message = '';
    if (champ.id === 'prenom' && champ.value.trim() && !/^[\p{L}\p{M} ’'\-]{1,60}$/u.test(champ.value.trim())) message = 'Utilisez des lettres pour ce prénom d’essai, ou laissez le champ vide.';
    if (champ.id === 'telephone' && champ.value.trim() && !telephoneValide(champ.value.trim())) message = 'Utilisez dix chiffres avec un indicatif français, ou laissez ce champ vide.';
    const erreur = $(`#erreur-${champ.id}`);
    erreur.textContent = message; erreur.hidden = !message;
    if (message) champ.setAttribute('aria-invalid', 'true'); else champ.removeAttribute('aria-invalid');
    return !message;
  }
  const champs = [$('#prenom'), $('#telephone')];
  champs.forEach(champ => {
    champ.addEventListener('blur', () => validerChamp(champ));
    champ.addEventListener('input', () => {
      champ.removeAttribute('aria-invalid');
      $(`#erreur-${champ.id}`).hidden = true;
    });
  });
  $('#formulaire-essai').addEventListener('submit', evenement => {
    evenement.preventDefault();
    const erreurs = champs.filter(champ => !validerChamp(champ));
    if (erreurs.length) {
      erreurs[0].focus(); annonce.textContent = 'Vérifiez les champs d’essai signalés, ou laissez-les vides.'; return;
    }
    const restant = creerCreneaux(etat.jour, prestations[etat.prestation].duree).some(c => c.minute === etat.minute && c.disponible);
    if (!restant) {
      etat.minute = null; etat.accessible = 2; actualiserSelection();
      allerEtape(2).then(() => { annonce.textContent = 'Cet horaire d’essai est passé. Choisissez une autre heure ou un autre jour.'; }); return;
    }
    $('#resultat-recap').textContent = `${prestations[etat.prestation].nom} — ${formatJour.format(new Date(`${etat.jour}T12:00:00Z`))}, à ${ecrireHeure(etat.minute)}. Durée : ${prestations[etat.prestation].duree}${nb}min.`;
    champs.forEach(champ => { champ.value = ''; });
    allerEtape(4);
  });
  $('#recommencer').addEventListener('click', () => {
    $('#formulaire-essai').reset();
    champs.forEach(champ => { champ.removeAttribute('aria-invalid'); $(`#erreur-${champ.id}`).hidden = true; });
    choisirPrestation('ciseaux'); allerEtape(0);
  });
  $('#parcours').hidden = false;
  actualiserSelection();
})();
