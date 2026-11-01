'use strict';

/* Les dates sont des jours civils parisiens, indépendants du fuseau du navigateur. */
const donneesReservation = (() => {
  const prestations = [
    { id: 'demi-1', nom: 'Tresses collées · demi-tête', detail: '1 à 4 tresses', duree: 30, prix: 48 },
    { id: 'demi-2', nom: 'Tresses collées · demi-tête', detail: '4 à 9 tresses', duree: 60, prix: 58 },
    { id: 'entiere-1', nom: 'Tresses collées · tête entière', detail: '1 à 4 tresses', duree: 60, prix: 68 },
    { id: 'entiere-2', nom: 'Tresses collées · tête entière', detail: '4 à 9 tresses', duree: 60, prix: 78 },
    { id: 'coupe', nom: 'Shampoing, coupe et coiffage', detail: 'Coupe homme', duree: 30, prix: 28 },
    { id: 'etudiant', nom: 'Shampoing, coupe et coiffage étudiant', detail: 'Formule étudiante', duree: 30, prix: 23 },
    { id: 'coupe-barbe', nom: 'Coupe et taille de barbe', detail: 'Serviette chaude', duree: 60, prix: 43 },
    { id: 'barbe', nom: 'Taille de barbe et soin', detail: 'Serviette chaude', duree: 30, prix: 19 }
  ];
  const horaireParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function maintenantParis(instant = new Date()) {
    const morceaux = Object.fromEntries(horaireParis.formatToParts(instant).map(m => [m.type, m.value]));
    return { cle: `${morceaux.year}-${morceaux.month}-${morceaux.day}`, minute: Number(morceaux.hour) * 60 + Number(morceaux.minute) };
  }
  function dateDeCle(cle) { return new Date(`${cle}T12:00:00Z`); }
  function cleDeDate(date) { return date.toISOString().slice(0, 10); }
  function ouverture(cle) {
    const jour = dateDeCle(cle).getUTCDay();
    if (jour === 0 || jour === 1) return null;
    return { debut: 600, fin: jour === 6 ? 1080 : 1200 };
  }
  function prochainsJours(nombre = 14, maintenant = maintenantParis()) {
    const debut = dateDeCle(maintenant.cle);
    return Array.from({ length: nombre }, (_, i) => {
      const date = new Date(debut);
      date.setUTCDate(date.getUTCDate() + i);
      return { cle: cleDeDate(date), date, ouvert: Boolean(ouverture(cleDeDate(date))) };
    });
  }
  function heureLisible(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${heures}\u00a0h${reste ? `\u00a0${String(reste).padStart(2, '0')}` : ''}`;
  }
  function dureeLisible(duree) { return duree === 60 ? '1\u00a0h' : `${duree}\u00a0min`; }
  function jourLisible(cle) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateDeCle(cle));
  }
  function creneaux(cle, duree, maintenant = maintenantParis()) {
    const plage = ouverture(cle);
    if (!plage || ![30, 60].includes(duree)) return [];
    const empreinte = [...cle].reduce((total, caractere) => total * 31 + caractere.charCodeAt(0) >>> 0, 7);
    const resultat = [];
    for (let minute = plage.debut, i = 0; minute + duree <= plage.fin; minute += 30, i++) {
      const passe = cle < maintenant.cle || (cle === maintenant.cle && minute <= maintenant.minute);
      const pris = (empreinte + i * 3) % 11 < 2;
      resultat.push({ minute, libelle: heureLisible(minute), passe, pris, indisponible: passe || pris });
    }
    return resultat;
  }
  function mobileValide(valeur) {
    const telephone = valeur.replace(/[\s.()\-]/g, '').replace(/^0033/, '+33');
    return /^(?:0|\+33)[67]\d{8}$/.test(telephone);
  }
  return { prestations, maintenantParis, dateDeCle, prochainsJours, ouverture, creneaux, heureLisible, dureeLisible, jourLisible, mobileValide };
})();

(() => {
  if (typeof document === 'undefined') return;
  const $ = selecteur => document.querySelector(selecteur);
  const $$ = selecteur => [...document.querySelectorAll(selecteur)];
  const d = donneesReservation;
  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  let auClavier = false;
  let trameEntree = 0;
  const etat = { etape: 0, prestation: null, jour: '', heure: null, termine: false };

  document.addEventListener('keydown', () => { auClavier = true; racine.classList.add('clavier'); });
  document.addEventListener('pointerdown', () => { auClavier = false; racine.classList.remove('clavier'); }, { passive: true });

  function actualiserTranche(tranche) {
    const grande = tranche === 'grande';
    $('.figure-tresses').classList.toggle('tranche-grande', grande);
    $$('#choix-tranches button').forEach(bouton => bouton.setAttribute('aria-pressed', String(bouton.dataset.tranche === tranche)));
    $('#prix-demi').textContent = `${grande ? 58 : 48}\u00a0€`;
    $('#prix-entiere').textContent = `${grande ? 78 : 68}\u00a0€`;
    $('#legende-prix').textContent = `Pour ${grande ? '4 à 9' : '1 à 4'} tresses · tarifs publiés`;
  }
  $$('#choix-tranches button').forEach(bouton => bouton.addEventListener('click', () => actualiserTranche(bouton.dataset.tranche)));
  $('#choix-tranches').hidden = false;

  function accessible(etape) {
    return etape === 0 || (Boolean(etat.prestation) && (etape === 1 || (Boolean(etat.jour) && (etape === 2 || etat.heure !== null))));
  }
  function phraseSelection() {
    if (!etat.prestation) return '';
    const p = etat.prestation;
    return `${p.nom}, ${p.detail.toLocaleLowerCase('fr-FR')} · ${d.dureeLisible(p.duree)} · ${p.prix}\u00a0€${etat.jour ? ` · ${d.jourLisible(etat.jour)}` : ''}${etat.heure !== null ? ` à ${d.heureLisible(etat.heure)}` : ''}. Tarif publié sur Planity.`;
  }
  function actualiserSelection() {
    const p = etat.prestation;
    $('#selection-prestation').textContent = p ? `${p.nom} — ${p.detail} · ${d.dureeLisible(p.duree)}` : 'À choisir';
    $('#selection-jour').textContent = etat.jour ? d.jourLisible(etat.jour) : 'À choisir';
    $('#selection-heure').textContent = etat.heure !== null ? d.heureLisible(etat.heure) : 'À choisir';
    $('#selection-prix').textContent = p ? `${p.prix}\u00a0€` : '—';
    $('#recapitulatif-final').textContent = phraseSelection();
    $$('.etapes button').forEach(bouton => {
      const numero = Number(bouton.dataset.aller);
      bouton.disabled = etat.termine || !accessible(numero);
      if (numero === etat.etape && !etat.termine) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function animerEntree(element, retour = false) {
    cancelAnimationFrame(trameEntree);
    $$('.panneau, .resultat').forEach(p => p.classList.remove('arrivee', 'arrivee-retour'));
    if (mouvementReduit.matches || auClavier) return;
    const classe = retour ? 'arrivee-retour' : 'arrivee';
    element.classList.add(classe);
    trameEntree = requestAnimationFrame(() => {
      trameEntree = requestAnimationFrame(() => element.classList.remove(classe));
    });
  }
  function changerEtape(numero, deplacerFocus = true) {
    if (!accessible(numero) || etat.termine) return;
    const retour = numero < etat.etape;
    etat.etape = numero;
    if (numero === 1) remplirJours();
    if (numero === 2) remplirHeures();
    $$('.panneau').forEach(panneau => { panneau.hidden = Number(panneau.dataset.etape) !== numero; });
    const panneau = $(`[data-etape="${numero}"]`);
    animerEntree(panneau, retour);
    actualiserSelection();
    $('#annonce-etape').textContent = `Étape ${numero + 1} sur 4 : ${['prestation', 'jour', 'heure', 'coordonnées'][numero]}.`;
    if (deplacerFocus) $(`#titre-etape-${numero}`).focus();
  }
  function effacerErreur(nom) { $(`#erreur-${nom}`).textContent = ''; }

  d.prestations.forEach(p => {
    const label = document.createElement('label');
    label.className = 'choix-prestation';
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = 'prestation'; radio.value = p.id;
    radio.setAttribute('aria-describedby', 'erreur-prestation');
    const intitule = document.createElement('span'); intitule.className = 'intitule'; intitule.textContent = p.nom;
    const detail = document.createElement('small'); detail.textContent = `${p.detail} · ${d.dureeLisible(p.duree)}`;
    intitule.append(detail);
    const montant = document.createElement('span'); montant.className = 'montant'; montant.textContent = `${p.prix}\u00a0€`;
    label.append(radio, intitule, montant);
    $('#liste-prestations').append(label);
    radio.addEventListener('change', () => {
      if (etat.prestation?.id !== p.id) etat.heure = null;
      etat.prestation = p;
      effacerErreur('prestation');
      actualiserSelection();
      $('#annonce-etape').textContent = `Choix : ${p.nom}, ${p.detail}, ${p.prix}\u00a0€.`;
    });
  });

  function remplirJours() {
    const liste = $('#liste-jours'); liste.replaceChildren();
    d.prochainsJours().forEach((jour, index) => {
      const label = document.createElement('label'); label.className = 'choix-jour';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'jour'; radio.value = jour.cle;
      radio.disabled = !jour.ouvert; radio.checked = etat.jour === jour.cle;
      radio.setAttribute('aria-label', `${d.jourLisible(jour.cle)}${!jour.ouvert ? ', fermé' : ', jour d’exemple'}`);
      radio.setAttribute('aria-describedby', 'erreur-jour');
      const semaine = document.createElement('span'); semaine.className = 'jour-semaine';
      semaine.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(jour.date);
      const chiffre = document.createElement('span'); chiffre.className = 'jour-chiffre'; chiffre.textContent = jour.date.getUTCDate();
      const mois = document.createElement('span'); mois.className = 'jour-mois';
      mois.textContent = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(jour.date);
      const statut = document.createElement('span'); statut.className = 'statut-jour';
      statut.textContent = jour.ouvert ? (index === 0 ? 'Aujourd’hui' : 'Exemple') : 'Fermé';
      label.append(radio, semaine, chiffre, mois, statut); liste.append(label);
      radio.addEventListener('change', () => {
        if (etat.jour !== jour.cle) etat.heure = null;
        etat.jour = jour.cle; effacerErreur('jour'); actualiserSelection();
        $('#annonce-etape').textContent = `Jour choisi : ${d.jourLisible(etat.jour)}.`;
      });
    });
  }
  function remplirHeures() {
    const liste = $('#liste-heures'); liste.replaceChildren();
    if (!etat.prestation || !etat.jour) return;
    const creneaux = d.creneaux(etat.jour, etat.prestation.duree);
    const plage = d.ouverture(etat.jour);
    $('#aide-creneaux').textContent = `${d.jourLisible(etat.jour)} · ${d.heureLisible(plage.debut)} à ${d.heureLisible(plage.fin)} · durée ${d.dureeLisible(etat.prestation.duree)}. Les mentions « déjà pris » sont fictives.`;
    creneaux.forEach(creneau => {
      const label = document.createElement('label'); label.className = 'choix-heure';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'heure'; radio.value = String(creneau.minute);
      radio.disabled = creneau.indisponible; radio.checked = etat.heure === creneau.minute && !creneau.indisponible;
      const statut = creneau.passe ? 'Passé' : creneau.pris ? 'Déjà pris' : 'Exemple';
      radio.setAttribute('aria-label', `${creneau.libelle}, ${statut.toLocaleLowerCase('fr-FR')}`);
      radio.setAttribute('aria-describedby', 'erreur-heure');
      const heure = document.createElement('span'); heure.textContent = creneau.libelle;
      const note = document.createElement('small'); note.textContent = statut;
      label.append(radio, heure, note); liste.append(label);
      radio.addEventListener('change', () => {
        etat.heure = creneau.minute; effacerErreur('heure'); actualiserSelection();
        $('#annonce-etape').textContent = `Heure choisie : ${creneau.libelle}.`;
      });
    });
    if (!creneaux.some(c => !c.indisponible)) {
      const message = document.createElement('p'); message.className = 'note';
      message.textContent = 'Il ne reste plus d’heure d’exemple pour ce jour. Revenez au choix du jour.';
      liste.append(message);
    }
    if (etat.heure !== null && !creneaux.some(c => c.minute === etat.heure && !c.indisponible)) {
      etat.heure = null; actualiserSelection();
    }
  }

  function verifierChoix(nom, condition, message) {
    if (condition) { effacerErreur(nom); return true; }
    $(`#erreur-${nom}`).textContent = message;
    $(`input[name="${nom}"]:not(:disabled)`)?.focus();
    return false;
  }
  $('#vers-jour').addEventListener('click', () => {
    if (verifierChoix('prestation', Boolean(etat.prestation), 'Choisissez une prestation pour continuer.')) changerEtape(1);
  });
  $('#vers-heure').addEventListener('click', () => {
    if (verifierChoix('jour', Boolean(etat.jour), 'Choisissez un jour d’ouverture pour continuer.')) changerEtape(2);
  });
  $('#vers-coordonnees').addEventListener('click', () => {
    if (!verifierChoix('heure', etat.heure !== null, 'Choisissez une heure d’exemple pour continuer.')) return;
    const encoreValide = d.creneaux(etat.jour, etat.prestation.duree).some(c => c.minute === etat.heure && !c.indisponible);
    if (encoreValide) changerEtape(3);
    else { etat.heure = null; remplirHeures(); actualiserSelection(); $('#erreur-heure').textContent = 'Cette heure est maintenant passée. Choisissez une autre heure.'; }
  });
  $$('[data-aller]').forEach(bouton => bouton.addEventListener('click', () => changerEtape(Number(bouton.dataset.aller))));
  $$('[data-prestation]').forEach(bouton => bouton.addEventListener('click', () => {
    if (etat.termine) reinitialiser(false);
    const p = d.prestations.find(prestation => prestation.id === bouton.dataset.prestation);
    const radio = $(`input[name="prestation"][value="${p.id}"]`);
    radio.checked = true; radio.dispatchEvent(new Event('change'));
    changerEtape(1, false);
    $('#reserver').scrollIntoView({ behavior: mouvementReduit.matches || auClavier ? 'instant' : 'smooth', block: 'start' });
    $('#titre-etape-1').focus({ preventScroll: true });
  }));

  function validerChamp(champ) {
    const valeur = champ.value.trim();
    let message = '';
    if (champ.id === 'prenom' && (!/\p{L}/u.test(valeur) || valeur.length < 2)) message = 'Indiquez un prénom d’au moins deux caractères.';
    if (champ.id === 'telephone' && !d.mobileValide(valeur)) message = 'Indiquez un mobile français valide, à 10 chiffres ou au format +33.';
    $(`#erreur-${champ.id}`).textContent = message;
    champ.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  }
  ['prenom', 'telephone'].forEach(nom => {
    const champ = $(`#${nom}`);
    champ.addEventListener('blur', () => { if (champ.value || champ.getAttribute('aria-invalid') === 'true') validerChamp(champ); });
    champ.addEventListener('input', () => { if (champ.getAttribute('aria-invalid') === 'true') { effacerErreur(nom); champ.removeAttribute('aria-invalid'); } });
  });
  $('#formulaire-reservation').addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3 || etat.termine) return;
    const prenomValide = validerChamp($('#prenom'));
    const telephoneValide = validerChamp($('#telephone'));
    if (!prenomValide || !telephoneValide) { $(!prenomValide ? '#prenom' : '#telephone').focus(); return; }
    const encoreValide = etat.prestation && etat.jour && d.creneaux(etat.jour, etat.prestation.duree).some(c => c.minute === etat.heure && !c.indisponible);
    if (!encoreValide) {
      etat.heure = null; changerEtape(2);
      $('#erreur-heure').textContent = 'Cette heure est passée pendant votre essai. Choisissez une nouvelle heure.';
      return;
    }
    etat.termine = true;
    $('#recapitulatif-resultat').textContent = `${$('#prenom').value.trim()}, voici votre choix d’exemple : ${phraseSelection()}`;
    $('#formulaire-reservation').hidden = true; $('#resultat').hidden = false;
    actualiserSelection(); animerEntree($('#resultat'));
    $('#annonce-etape').textContent = 'Simulation terminée. Aucun rendez-vous réservé et aucune information envoyée.';
    $('#titre-resultat').focus();
  });
  function reinitialiser(deplacerFocus = true) {
    etat.prestation = null; etat.jour = ''; etat.heure = null; etat.termine = false;
    $('#formulaire-reservation').reset();
    $$('.erreur').forEach(e => { e.textContent = ''; });
    $$('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
    $('#recapitulatif-resultat').textContent = '';
    $('#resultat').hidden = true; $('#formulaire-reservation').hidden = false;
    changerEtape(0, deplacerFocus);
  }
  $('#recommencer').addEventListener('click', () => reinitialiser());
  $('#outil-reservation').hidden = false;
  actualiserSelection();

  /* Le contenu reste lisible si les observations ou JavaScript sont indisponibles. */
  if ('IntersectionObserver' in window) {
    const observation = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('apparu'); observation.unobserve(entree.target);
      });
    }, { threshold: .15 });
    $$('[data-revelation]').forEach(element => observation.observe(element));
    const visibilites = new Map();
    const barre = $('.barre-mobile');
    const observationBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => visibilites.set(entree.target, entree.isIntersecting));
      const masquer = [...visibilites.values()].some(Boolean);
      barre.classList.toggle('masquee', masquer);
      barre.inert = masquer;
    }, { threshold: 0 });
    observationBarre.observe($('#reserver')); observationBarre.observe($('.pied-page'));
  } else $$('[data-revelation]').forEach(element => element.classList.add('apparu'));
  racine.classList.add('js');
  requestAnimationFrame(() => requestAnimationFrame(() => racine.classList.add('entree-prete')));
})();
