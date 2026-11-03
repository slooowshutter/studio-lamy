window.__site = true;
(() => {
  'use strict';

  const prestations = [
    { nom: 'Cheveux courts', duree: 30 },
    { nom: 'Cheveux longs +3 cm sur les côtés', duree: 45 },
    { nom: 'Barbe courte ou longue sans rasage', duree: 30 },
    { nom: 'Barbe courte ou longue avec rituel à l’ancienne (taillage, rasage, serviettes chaude et froide)', duree: 40 },
    { nom: 'Rasage barbe complet à l’ancienne', duree: 40 },
    { nom: 'Coupe – cheveux courts', duree: 40 },
    { nom: 'Coupe de cheveux + 3 mois de repousse + shampoing', duree: 40 },
    { nom: 'Coupe de cheveux + rituel détente taille de barbe', duree: 60 },
    { nom: 'Rituel détente taille de barbe', duree: 30 },
    { nom: 'Rituel détente taille de barbe longue', duree: 30 }
  ];
  const horaires = {
    0: null,
    1: null,
    2: [8 * 60, 19 * 60],
    3: [8 * 60, 19 * 60],
    4: [8 * 60, 18 * 60],
    5: [8 * 60, 18 * 60],
    6: [9 * 60, 17 * 60]
  };
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const formateurParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const formateurJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formateurDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const $ = (selecteur, racine = document) => racine.querySelector(selecteur);
  const $$ = (selecteur, racine = document) => [...racine.querySelectorAll(selecteur)];
  const minuteTexte = (minute) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  const dateCle = (date) => date.toISOString().slice(0, 10);
  const dateParis = () => {
    const morceaux = {};
    for (const morceau of formateurParis.formatToParts(new Date())) morceaux[morceau.type] = morceau.value;
    const date = new Date(Date.UTC(Number(morceaux.year), Number(morceaux.month) - 1, Number(morceaux.day), 12));
    return { date, minute: Number(morceaux.hour) * 60 + Number(morceaux.minute) };
  };
  const reduire = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Mise en place de l’accordéon, avec un seul panneau développé. */
  const panneaux = $$('.panneau');
  const temporisations = new Map();
  function terminerFermeture(panneau) {
    panneau.classList.remove('panneau--ouvert', 'panneau--disparait', 'panneau--apparait', 'panneau--visible');
    const corps = $('.panneau__corps', panneau);
    if (corps) corps.inert = true;
  }
  function fermerPanneau(panneau, anime = true) {
    const bouton = $('.panneau__bouton', panneau);
    const corps = $('.panneau__corps', panneau);
    if (!bouton || !corps || bouton.getAttribute('aria-expanded') !== 'true') return;
    bouton.setAttribute('aria-expanded', 'false');
    corps.inert = true;
    if (anime && !reduire.matches) {
      panneau.classList.add('panneau--disparait');
      temporisations.set(panneau, window.setTimeout(() => terminerFermeture(panneau), 190));
    } else {
      terminerFermeture(panneau);
    }
  }
  function ouvrirPanneau(panneau, defiler = false) {
    if (!panneau) return;
    const bouton = $('.panneau__bouton', panneau);
    const corps = $('.panneau__corps', panneau);
    for (const autre of panneaux) {
      if (autre === panneau) continue;
      window.clearTimeout(temporisations.get(autre));
      if ($('.panneau__bouton', autre).getAttribute('aria-expanded') === 'true') fermerPanneau(autre, true);
      else if (autre.classList.contains('panneau--ouvert')) terminerFermeture(autre);
    }
    window.clearTimeout(temporisations.get(panneau));
    panneau.classList.remove('panneau--disparait', 'panneau--visible', 'panneau--apparait');
    const dejaOuvert = bouton.getAttribute('aria-expanded') === 'true';
    if (dejaOuvert && !defiler) {
      fermerPanneau(panneau, true);
      return;
    }
    panneau.classList.add('panneau--ouvert');
    bouton.setAttribute('aria-expanded', 'true');
    corps.inert = false;
    panneau.classList.add('panneau--apparait');
    requestAnimationFrame(() => requestAnimationFrame(() => panneau.classList.add('panneau--visible')));
    if (defiler) panneau.scrollIntoView({ behavior: reduire.matches ? 'auto' : 'smooth', block: 'start' });
    observerRevelations(panneau);
  }
  panneaux.forEach((panneau, index) => {
    const bouton = $('.panneau__bouton', panneau);
    const corps = $('.panneau__corps', panneau);
    const ouvert = index === 0;
    bouton.setAttribute('aria-expanded', String(ouvert));
    panneau.classList.toggle('panneau--ouvert', ouvert);
    if (corps) corps.inert = !ouvert;
    bouton.addEventListener('click', () => ouvrirPanneau(panneau));
  });

  /* Entrée de l’en-tête et apparitions uniques au défilement. */
  function observerRevelations(racine = document) {
    if (!observateur) return;
    $$('.prestation, .sources__liste li, .horaires__entete, .adresse__plan, .completer li', racine).forEach((element, index) => {
      if (element.dataset.surveille) return;
      element.dataset.surveille = 'oui';
      element.classList.add('a-reveler');
      if (element.classList.contains('prestation') || element.matches('.sources__liste li')) {
        element.dataset.famille = 'ligne';
        element.style.setProperty('--rang', String(Math.min(index, 5)));
      }
      observateur.observe(element);
    });
  }
  const observateur = 'IntersectionObserver' in window ? new IntersectionObserver((entrees, io) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add('est-visible');
      io.unobserve(entree.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -35px 0px' }) : null;
  observerRevelations();
  if (!observateur) $$('.prestation, .sources__liste li, .horaires__entete, .adresse__plan, .completer li').forEach((element) => element.classList.add('est-visible'));
  const lancerEntete = () => requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('est-pret')));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((resoudre) => window.setTimeout(resoudre, 600))]).then(lancerEntete);
  } else lancerEntete();

  /* Barre mobile : elle s’efface devant le formulaire et le pied de page. */
  const barre = $('.barre-mobile');
  if ('IntersectionObserver' in window && barre) {
    const zonesMasquees = [$('#panneau-rendez-vous'), $('.pied')];
    const visibles = new Set();
    const observerBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => entree.isIntersecting ? visibles.add(entree.target) : visibles.delete(entree.target));
      const reservationOuverte = $('#panneau-rendez-vous').classList.contains('panneau--ouvert');
      barre.hidden = reservationOuverte || visibles.size > 0;
    }, { threshold: .08 });
    zonesMasquees.forEach((zone) => zone && observerBarre.observe(zone));
    panneaux.forEach((panneau) => $('.panneau__bouton', panneau).addEventListener('click', () => {
      if (panneau.id === 'panneau-rendez-vous') barre.hidden = !panneau.classList.contains('panneau--ouvert');
    }));
  }

  /* Étapes du formulaire : valeurs de service et horaires issues de la page Planity. */
  const formulaire = $('#formulaire-rendez-vous');
  const etapes = $$('.etape', formulaire);
  const progression = $('#progression');
  const etat = { prestation: null, jour: null, heure: null, prenom: '', telephone: '' };
  let numeroEtape = 0;
  const nomsEtapes = ['Prestation', 'Jour', 'Heure', 'Coordonnées'];

  function dessinerPrestations() {
    const racine = $('#choix-prestations');
    prestations.forEach((prestation, index) => {
      const label = document.createElement('label');
      label.className = 'choix-ligne';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'prestation-simulation';
      radio.value = String(index);
      radio.setAttribute('aria-label', prestation.nom);
      const nom = document.createElement('span');
      nom.className = 'choix-ligne__nom';
      nom.textContent = prestation.nom;
      const duree = document.createElement('span');
      duree.className = 'choix-ligne__duree';
      duree.textContent = prestation.duree < 60 ? `${prestation.duree}\u00a0min` : '1\u00a0h';
      label.append(radio, nom, duree);
      radio.addEventListener('change', () => choisirPrestation(index));
      racine.append(label);
    });
  }
  function jourChoisiTexte() {
    if (!etat.jour) return 'À choisir';
    return `${formateurJour.format(etat.jour.date)} ${formateurDate.format(etat.jour.date)}`;
  }
  function choisirPrestation(index) {
    etat.prestation = index;
    etat.jour = null;
    etat.heure = null;
    $('#erreur-prestation').textContent = '';
    $('#selection-prestation').textContent = prestations[index].nom;
    $('#selection-jour').textContent = 'À choisir';
    $('#selection-heure').textContent = 'À choisir';
    $('[data-modifier="0"]').disabled = false;
    $('[data-modifier="1"]').disabled = true;
    $('[data-modifier="2"]').disabled = true;
    dessinerJours();
    $('#liste-creneaux').replaceChildren();
  }
  function dessinerJours() {
    const racine = $('#liste-jours');
    racine.replaceChildren();
    const aujourdHui = dateParis().date;
    for (let rang = 0; rang < 14; rang += 1) {
      const date = new Date(aujourdHui.getTime() + rang * 86400000);
      const jour = date.getUTCDay();
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.jour = dateCle(date);
      bouton.disabled = !horaires[jour];
      bouton.setAttribute('aria-pressed', String(etat.jour ? dateCle(etat.jour.date) === dateCle(date) : false));
      const semaine = document.createElement('span');
      semaine.className = 'jour__semaine';
      semaine.textContent = formateurJour.format(date).replace('.', '');
      const dateCourte = document.createElement('span');
      dateCourte.className = 'jour__date';
      dateCourte.textContent = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
      bouton.append(semaine, dateCourte);
      if (!horaires[jour]) {
        const ferme = document.createElement('span');
        ferme.className = 'jour__ferme';
        ferme.textContent = 'Fermé';
        bouton.append(ferme);
        bouton.setAttribute('aria-label', `${formateurJour.format(date)} ${formateurDate.format(date)}, fermé selon le tableau Planity`);
      } else {
        bouton.setAttribute('aria-label', `${formateurJour.format(date)} ${formateurDate.format(date)}`);
        bouton.addEventListener('click', () => choisirJour(date));
      }
      racine.append(bouton);
    }
  }
  function choisirJour(date) {
    etat.jour = date;
    etat.heure = null;
    $('#erreur-jour').textContent = '';
    $('#selection-jour').textContent = jourChoisiTexte();
    $('#selection-heure').textContent = 'À choisir';
    $('[data-modifier="1"]').disabled = false;
    $('[data-modifier="2"]').disabled = true;
    $('#aide-creneaux').textContent = `Créneaux fictifs pour ${jourChoisiTexte()} ; aucune réservation n’est vérifiée.`;
    dessinerJours();
    dessinerCreneaux();
  }
  function dessinerCreneaux() {
    const racine = $('#liste-creneaux');
    racine.replaceChildren();
    if (!etat.jour || etat.prestation === null) return;
    const jour = etat.jour.getUTCDay();
    const [debut, fin] = horaires[jour] || [];
    const duree = prestations[etat.prestation].duree;
    const maintenant = dateParis();
    const estAujourdHui = dateCle(etat.jour) === dateCle(maintenant.date);
    let index = 0;
    let ajoutes = 0;
    for (let heure = debut; heure + duree <= fin; heure += 30) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'creneau';
      bouton.textContent = minuteTexte(heure).replace(':', '\u00a0h\u00a0');
      const dejaPasse = estAujourdHui && heure <= maintenant.minute;
      const occupeDansSimulation = (heure / 30 + index * 5 + etat.prestation * 3) % 7 === 2;
      if (dejaPasse) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${bouton.textContent}, heure passée`);
      } else if (occupeDansSimulation) {
        bouton.disabled = true;
        bouton.classList.add('creneau--pris');
        bouton.setAttribute('aria-label', `${bouton.textContent}, indisponible dans cette simulation`);
        bouton.title = 'Indisponible dans cette simulation';
      } else {
        bouton.setAttribute('aria-pressed', String(etat.heure === heure));
        bouton.addEventListener('click', () => choisirHeure(heure));
      }
      racine.append(bouton);
      index += 1;
      ajoutes += 1;
    }
    if (ajoutes === 0) {
      const vide = document.createElement('p');
      vide.className = 'creneaux__vide';
      vide.textContent = 'Aucun créneau simulé ne reste pour ce jour. Choisissez une autre date.';
      racine.append(vide);
    }
  }
  function choisirHeure(heure) {
    etat.heure = heure;
    $('#erreur-heure').textContent = '';
    $('#selection-heure').textContent = minuteTexte(heure).replace(':', '\u00a0h\u00a0');
    $('[data-modifier="2"]').disabled = false;
    dessinerCreneaux();
    $('#recapitulatif-formulaire').innerHTML = recapitulatifHTML(false);
  }
  function recapitulatifHTML(avecPrenom) {
    const nom = etat.prestation === null ? 'À choisir' : prestations[etat.prestation].nom;
    const jour = jourChoisiTexte();
    const heure = etat.heure === null ? 'À choisir' : minuteTexte(etat.heure).replace(':', '\u00a0h\u00a0');
    const prenom = avecPrenom && etat.prenom ? `<p><strong>Prénom</strong> · ${echapper(etat.prenom)}</p>` : '';
    return `<div class="recapitulatif"><p class="recapitulatif__titre">Votre sélection</p><p><strong>Prestation</strong> · ${echapper(nom)}</p><p><strong>Jour</strong> · ${echapper(jour)}</p><p><strong>Heure</strong> · ${echapper(heure)}</p>${prenom}</div>`;
  }
  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, (caractere) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caractere]);
  }
  function changerEtape(numero, animer = true) {
    numeroEtape = numero;
    etapes.forEach((etape, index) => {
      etape.hidden = index !== numero;
      etape.classList.remove('etape--entree', 'etape--visible');
    });
    if (numero < 4) progression.textContent = `Étape ${numero + 1} sur 4 · ${nomsEtapes[numero]}`;
    else progression.textContent = 'Simulation terminée · rien n’a été transmis';
    const active = etapes[numero];
    if (active && animer && !reduire.matches) {
      active.classList.add('etape--entree');
      requestAnimationFrame(() => requestAnimationFrame(() => active.classList.add('etape--visible')));
    }
    const titre = active && $('.etape__titre', active);
    if (titre) titre.focus({ preventScroll: true });
  }
  function allerEtape(numero) {
    const panneauRdv = $('#panneau-rendez-vous');
    ouvrirPanneau(panneauRdv, true);
    changerEtape(numero, true);
  }

  dessinerPrestations();
  dessinerJours();
  $('[data-etape-suivante="1"]').addEventListener('click', () => {
    if (etat.prestation === null) { $('#erreur-prestation').textContent = 'Choisissez une prestation pour continuer.'; return; }
    changerEtape(1);
  });
  $('[data-etape-suivante="2"]').addEventListener('click', () => {
    if (!etat.jour) { $('#erreur-jour').textContent = 'Choisissez un jour ouvert pour continuer.'; return; }
    changerEtape(2);
  });
  $('[data-etape-suivante="3"]').addEventListener('click', () => {
    if (etat.heure === null) { $('#erreur-heure').textContent = 'Choisissez une heure disponible dans la simulation.'; return; }
    changerEtape(3);
    $('#recapitulatif-formulaire').innerHTML = recapitulatifHTML(false);
  });
  $$('.etape__actions [data-retour]').forEach((bouton) => bouton.addEventListener('click', () => changerEtape(Number(bouton.dataset.retour))));
  $$('.selection__modifier').forEach((bouton) => bouton.addEventListener('click', () => {
    if (!bouton.disabled) allerEtape(Number(bouton.dataset.modifier));
  }));
  $$('.prestation__choix').forEach((bouton) => bouton.addEventListener('click', () => {
    const index = Number(bouton.dataset.choisir);
    choisirPrestation(index);
    const radio = $(`input[value="${index}"]`, $('#choix-prestations'));
    if (radio) radio.checked = true;
    allerEtape(0);
  }));
  $('[data-ouvrir-reservation]').addEventListener('click', () => allerEtape(0));

  $('#prenom').addEventListener('input', (evenement) => {
    etat.prenom = evenement.currentTarget.value.trim();
    $('#selection-prenom').textContent = etat.prenom || '—';
    $('#erreur-prenom').textContent = '';
  });
  $('#telephone').addEventListener('input', () => { $('#erreur-telephone').textContent = ''; });
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const champPrenom = $('#prenom');
    const champTelephone = $('#telephone');
    const prenom = champPrenom.value.trim();
    const telephoneNettoye = champTelephone.value.replace(/\D/g, '');
    const telephoneNational = telephoneNettoye.startsWith('0033') ? telephoneNettoye.slice(4) : telephoneNettoye.startsWith('33') ? telephoneNettoye.slice(2) : telephoneNettoye;
    const telephoneValide = /^0?[1-9]\d{8}$/.test(telephoneNational);
    $('#erreur-prenom').textContent = prenom ? '' : 'Saisissez un prénom pour continuer.';
    $('#erreur-telephone').textContent = telephoneValide ? '' : 'Saisissez un numéro français valide.';
    if (!prenom || !telephoneValide) {
      (!prenom ? champPrenom : champTelephone).focus();
      return;
    }
    etat.prenom = prenom;
    etat.telephone = champTelephone.value.trim();
    $('#selection-prenom').textContent = prenom;
    $('#prenom-succes').textContent = prenom;
    $('#recapitulatif-succes').innerHTML = recapitulatifHTML(true);
    changerEtape(4);
  });
  $('[data-recommencer]').addEventListener('click', () => {
    etat.prestation = null;
    etat.jour = null;
    etat.heure = null;
    etat.prenom = '';
    etat.telephone = '';
    formulaire.reset();
    $('#selection-prestation').textContent = 'À choisir';
    $('#selection-jour').textContent = 'À choisir';
    $('#selection-heure').textContent = 'À choisir';
    $('#selection-prenom').textContent = '—';
    $$('.selection__modifier').forEach((bouton) => { bouton.disabled = true; });
    $('#liste-creneaux').replaceChildren();
    dessinerJours();
    changerEtape(0);
  });

  /* La date du jour est marquée dans le tableau sans annoncer « ouvert ». */
  const aujourdhui = dateParis().date.getUTCDay();
  const ligneAujourdhui = $(`[data-jour="${aujourdhui}"]`, $('.table-horaires'));
  if (ligneAujourdhui) {
    ligneAujourdhui.classList.add('is-today');
    const jour = $('th', ligneAujourdhui);
    if (jour) jour.innerHTML += '<span class="aujourdhui"> · aujourd’hui</span>';
  }

  window.setTimeout(lancerEntete, 900);
})();
