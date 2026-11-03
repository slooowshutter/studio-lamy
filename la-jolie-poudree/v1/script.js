(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const horaires = { 0: null, 1: [540, 1140], 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] };
  const soins = {
    indonesie: { nom: 'Indonésie ancestrale', duree: 65, texte: '1\u00a0h\u00a005' },
    manucure: { nom: 'Manucure combinée russe', duree: 30, texte: '30\u00a0min' },
    couleur: { nom: 'Pose de semi permanent couleur', duree: 30, texte: '30\u00a0min' }
  };
  const etat = { soin: null, jour: null, heure: null, etape: 0, maximum: 0, termine: false };
  const formatLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });
  const formatMois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
  let cadreAnimation = null;

  // Les dates civiles et l’heure courante sont celles de Paris, quel que soit l’appareil.
  function maintenantParis(instant = new Date()) {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(instant);
    const valeurs = Object.fromEntries(morceaux.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    return { jour: Date.UTC(valeurs.year, valeurs.month - 1, valeurs.day), minute: valeurs.hour * 60 + valeurs.minute };
  }
  const cleJour = date => date.toISOString().slice(0, 10);
  const dateDepuisCle = cle => new Date(`${cle}T12:00:00Z`);
  const texteHeure = minute => `${Math.floor(minute / 60)}\u00a0h${minute % 60 ? `\u00a0${String(minute % 60).padStart(2, '0')}` : ''}`;

  function creneaux(cle, duree, instant = new Date()) {
    const date = dateDepuisCle(cle);
    const plage = horaires[date.getUTCDay()];
    if (!plage) return [];
    const courant = maintenantParis(instant);
    const jour = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const graine = Math.floor(jour / 86400000);
    const liste = [];
    for (let minute = plage[0], index = 0; minute + duree <= plage[1]; minute += 30, index++) {
      const passe = jour < courant.jour || (jour === courant.jour && minute <= courant.minute);
      const exempleIndisponible = (graine + index * 7) % 6 === 0;
      liste.push({ minute, passe, indisponible: passe || exempleIndisponible });
    }
    return liste;
  }

  // Les révélations ne se préparent qu’une fois le programme prêt à les afficher.
  function installerMouvement() {
    if (!('IntersectionObserver' in window)) return;
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        observateur.unobserve(entree.target);
      });
    }, { threshold: .12 });
    $$('[data-reveler]').forEach(element => observateur.observe(element));
    root.classList.add('js');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('pret')));
  }

  function annoncer(texte) { $('#annonce').textContent = texte; }

  function actualiserSelection() {
    const soin = soins[etat.soin];
    $('#selection-soin').textContent = soin ? soin.nom : 'À choisir';
    $('#selection-duree').textContent = soin ? soin.texte : '—';
    $('#selection-jour').textContent = etat.jour ? formatLong.format(dateDepuisCle(etat.jour)) : 'À choisir';
    $('#selection-heure').textContent = etat.heure !== null ? texteHeure(etat.heure) : 'À choisir';
    $$('[data-etape]').forEach(bouton => {
      const numero = Number(bouton.dataset.etape);
      bouton.disabled = numero > etat.maximum || etat.termine;
      if (numero === etat.etape && !etat.termine) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
    $('[data-suite="1"]').disabled = !etat.soin;
    $('[data-suite="2"]').disabled = !etat.jour;
    $('[data-suite="3"]').disabled = etat.heure === null;
    $('#aide-soin').textContent = soin ? `${soin.texte} pour ce soin.` : 'Choisissez un soin pour continuer.';
    if (soin && etat.jour && etat.heure !== null) {
      $('#recap-final').textContent = `Votre essai\u00a0: ${soin.nom}, ${formatLong.format(dateDepuisCle(etat.jour))} à ${texteHeure(etat.heure)}, pour ${soin.texte}. Aucune réservation réelle.`;
    }
  }

  function montrerEtape(numero, prendreFocus = true) {
    if (numero > etat.maximum || etat.termine) return;
    if (cadreAnimation !== null) cancelAnimationFrame(cadreAnimation);
    etat.etape = numero;
    const panneau = $(`[data-panneau="${numero}"]`);
    $$('[data-panneau]').forEach(element => {
      element.hidden = element !== panneau;
      element.classList.remove('entree-etape');
    });
    if (!mouvementReduit.matches && !root.classList.contains('clavier')) {
      panneau.classList.add('entree-etape');
      cadreAnimation = requestAnimationFrame(() => {
        cadreAnimation = requestAnimationFrame(() => {
          panneau.classList.remove('entree-etape');
          cadreAnimation = null;
        });
      });
    }
    actualiserSelection();
    annoncer(`Étape ${numero + 1} sur 4\u00a0: ${$('h3', panneau).textContent}`);
    if (prendreFocus) $('h3', panneau).focus();
  }

  function creerRadio(nom, valeur, libelle, desactive = false) {
    const etiquette = document.createElement('label');
    etiquette.className = 'case-choix';
    const radio = document.createElement('input');
    radio.type = 'radio'; radio.name = nom; radio.value = valeur; radio.disabled = desactive;
    radio.setAttribute('aria-label', libelle);
    etiquette.append(radio);
    return { etiquette, radio };
  }
  function ajouterTexte(parent, texte, classe) {
    const element = document.createElement('span');
    element.className = classe;
    element.textContent = texte;
    parent.append(element);
  }

  function remplirJours() {
    const conteneur = $('#jours');
    const courant = maintenantParis();
    conteneur.replaceChildren();
    for (let index = 0; index < 14; index++) {
      const date = new Date(courant.jour + index * 86400000);
      const cle = cleJour(date);
      const ferme = !horaires[date.getUTCDay()];
      const termine = !ferme && etat.soin && !creneaux(cle, soins[etat.soin].duree).some(h => !h.indisponible);
      const indisponible = ferme || termine;
      const statut = ferme ? 'Fermé' : termine ? 'Passé' : 'Exemple';
      const { etiquette, radio } = creerRadio('jour', cle, `${formatLong.format(date)} — ${statut.toLowerCase()}`, indisponible);
      radio.checked = etat.jour === cle;
      ajouterTexte(etiquette, formatJour.format(date), 'jour-nom');
      ajouterTexte(etiquette, String(date.getUTCDate()), 'jour-chiffre');
      ajouterTexte(etiquette, formatMois.format(date), 'jour-mois');
      ajouterTexte(etiquette, statut, 'jour-etat');
      conteneur.append(etiquette);
    }
  }

  function remplirHeures() {
    const conteneur = $('#heures');
    conteneur.replaceChildren();
    if (!etat.jour || !etat.soin) return;
    $('#jour-choisi').textContent = formatLong.format(dateDepuisCle(etat.jour));
    const liste = creneaux(etat.jour, soins[etat.soin].duree);
    liste.forEach(heure => {
      const motif = heure.passe ? 'heure passée' : heure.indisponible ? 'exemple indisponible' : 'exemple sélectionnable';
      const { etiquette, radio } = creerRadio('heure', String(heure.minute), `${texteHeure(heure.minute)} — ${motif}`, heure.indisponible);
      radio.checked = etat.heure === heure.minute && !heure.indisponible;
      ajouterTexte(etiquette, texteHeure(heure.minute), 'heure-texte');
      conteneur.append(etiquette);
    });
    if (!liste.some(h => !h.indisponible)) {
      const message = document.createElement('p');
      message.className = 'aide';
      message.textContent = 'Aucune heure d’exemple restante pour ce jour. Choisissez un autre jour.';
      conteneur.append(message);
    }
  }

  function choisirSoin(cle) {
    if (!soins[cle]) return;
    etat.soin = cle; etat.jour = null; etat.heure = null; etat.maximum = 1;
    $$('input[name="prestation"]').forEach(radio => { radio.checked = radio.value === cle; });
    remplirJours();
    actualiserSelection();
    annoncer(`${soins[cle].nom}, ${soins[cle].texte}. Choisissez ensuite un jour.`);
  }

  function verifierChamp(champ) {
    const valeur = champ.value.trim();
    const correct = champ.id === 'prenom'
      ? valeur.length > 0
      : /^(?:0[67]|\+33[67]|0033[67])\d{8}$/.test(valeur.replace(/[\s.()\-]/g, ''));
    const message = correct ? '' : champ.id === 'prenom' ? 'Indiquez un prénom pour terminer l’essai.' : 'Indiquez un numéro portable français valide.';
    champ.setAttribute('aria-invalid', String(!correct));
    $(`#erreur-${champ.id}`).textContent = message;
    return correct;
  }

  function reinitialiser() {
    Object.assign(etat, { soin: null, jour: null, heure: null, etape: 0, maximum: 0, termine: false });
    $('#formulaire').reset();
    $('#formulaire').hidden = false;
    $('#resultat').hidden = true;
    $('#resultat-texte').textContent = '';
    $('#recap-final').textContent = '';
    $$('.erreur').forEach(element => { element.textContent = ''; });
    $$('.champs input').forEach(champ => champ.removeAttribute('aria-invalid'));
    actualiserSelection();
    montrerEtape(0);
  }

  function installerReservation() {
    $('#demonstration').hidden = false;
    $('#formulaire').addEventListener('change', evenement => {
      const champ = evenement.target;
      if (champ.name === 'prestation') choisirSoin(champ.value);
      if (champ.name === 'jour') {
        etat.jour = champ.value; etat.heure = null; etat.maximum = 2;
        remplirHeures(); actualiserSelection();
        annoncer(`${formatLong.format(dateDepuisCle(etat.jour))}. Choisissez ensuite une heure d’exemple.`);
      }
      if (champ.name === 'heure') {
        etat.heure = Number(champ.value); etat.maximum = 3;
        actualiserSelection(); annoncer(`${texteHeure(etat.heure)} sélectionné pour la démonstration.`);
      }
    });
    $$('[data-suite]').forEach(bouton => bouton.addEventListener('click', () => {
      const cible = Number(bouton.dataset.suite);
      if (cible === 1) remplirJours();
      if (cible === 2) remplirHeures();
      montrerEtape(cible);
    }));
    $$('[data-retour]').forEach(bouton => bouton.addEventListener('click', () => montrerEtape(Number(bouton.dataset.retour))));
    $$('[data-etape]').forEach(bouton => bouton.addEventListener('click', () => montrerEtape(Number(bouton.dataset.etape))));
    $$('[data-preselection]').forEach(lien => lien.addEventListener('click', () => {
      if (etat.termine) reinitialiser();
      choisirSoin(lien.dataset.preselection);
      montrerEtape(0, false);
    }));
    $$('.champs input').forEach(champ => champ.addEventListener('input', () => {
      if (champ.getAttribute('aria-invalid') === 'true') verifierChamp(champ);
    }));
    $('#formulaire').addEventListener('submit', evenement => {
      evenement.preventDefault();
      const soin = soins[etat.soin];
      if (!soin || !etat.jour || etat.heure === null) return;
      const selectionValide = creneaux(etat.jour, soin.duree).some(h => h.minute === etat.heure && !h.indisponible);
      if (!selectionValide) {
        etat.heure = null; etat.maximum = 2;
        remplirHeures(); montrerEtape(2);
        annoncer('Cette heure d’exemple est passée. Choisissez une autre heure.');
        return;
      }
      const champs = $$('.champs input');
      const resultats = champs.map(verifierChamp);
      if (resultats.includes(false)) {
        champs[resultats.indexOf(false)].focus();
        annoncer('Vérifiez les champs indiqués.');
        return;
      }
      etat.termine = true;
      $('#formulaire').hidden = true;
      $('#resultat').hidden = false;
      $('#resultat-texte').textContent = `${$('#prenom').value.trim()}, votre sélection d’exemple\u00a0: ${soin.nom}, ${formatLong.format(dateDepuisCle(etat.jour))} à ${texteHeure(etat.heure)}, durée ${soin.texte}.`;
      $('#telephone').value = '';
      $('#prenom').value = '';
      actualiserSelection();
      $('#resultat h3').focus();
      annoncer('Démonstration terminée. Aucun rendez-vous n’a été pris, rien n’a été envoyé.');
    });
    $('#recommencer').addEventListener('click', reinitialiser);
    actualiserSelection();
  }

  document.addEventListener('keydown', evenement => {
    if (['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evenement.key)) root.classList.add('clavier');
  });
  document.addEventListener('pointerdown', () => root.classList.remove('clavier'), { passive: true });
  // Pas de réseau, de stockage, de formulaire envoyé ou de disponibilité réelle.
  installerReservation();
  installerMouvement();
})();
