/* LE LABO BARBER · aperçu local, aucune transmission de données. */
(() => {
  'use strict';

  // Données exclusivement issues de Planity, relevées le 13 novembre 2026.
  const PRESTATIONS = {
    coupe: { nom: 'Coupe', duree: 30 },
    'coupe-barbe': { nom: 'Coupe + barbe', duree: 30 },
    barbe: { nom: 'Barbe', duree: 30 },
    enfant: { nom: 'Coupe enfant -10 ans', duree: 30 }
  };
  const HORAIRES = {
    0: [],
    1: [[600, 1140]], 2: [[600, 1140]], 3: [[600, 1140]], 4: [[600, 1140]],
    5: [[600, 780], [870, 1140]],
    6: [[600, 1140]]
  };
  const ESPACE = '\u00a0';
  const parisFormat = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  function maintenantParis(date = new Date()) {
    const parts = Object.fromEntries(parisFormat.formatToParts(date).map(p => [p.type, p.value]));
    const cle = `${parts.year}-${parts.month}-${parts.day}`;
    return { cle, minutes: Number(parts.hour) * 60 + Number(parts.minute), date: new Date(`${cle}T12:00:00Z`) };
  }
  function heure(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}${ESPACE}h${m ? ESPACE + String(m).padStart(2, '0') : ''}`;
  }
  function jourDepuis(cle) { return new Date(`${cle}T12:00:00Z`); }
  function creneaux(cle, duree, reference = maintenantParis()) {
    const date = jourDepuis(cle);
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(duree) || duree <= 0) return [];
    const plages = HORAIRES[date.getUTCDay()] || [];
    const resultat = [];
    const jourNombre = Math.floor(date.getTime() / 86400000);
    for (const [debut, fin] of plages) {
      for (let minute = debut; minute + duree <= fin; minute += 30) {
        const passe = cle < reference.cle || (cle === reference.cle && minute <= reference.minutes);
        // Indisponibilités d’exemple, jamais présentées comme l’agenda réel du salon.
        const exempleIndisponible = (jourNombre + Math.floor(minute / 30)) % 7 === 0;
        resultat.push({ minute, indisponible: passe || exempleIndisponible, raison: passe ? 'Passé' : exempleIndisponible ? 'Indisponible' : '' });
      }
    }
    return resultat;
  }
  function prochainsJours(duree, reference = maintenantParis()) {
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date(reference.date);
      date.setUTCDate(date.getUTCDate() + i);
      const cle = date.toISOString().slice(0, 10);
      const ferme = HORAIRES[date.getUTCDay()].length === 0;
      const restant = !ferme && creneaux(cle, duree, reference).some(s => !s.indisponible);
      return { date, cle, ferme, restant };
    });
  }
  function telephoneValide(valeur) {
    const normalise = valeur.replace(/[\s.()\-]/g, '');
    return /^(?:0|\+33|0033)[1-9]\d{8}$/.test(normalise);
  }

  // Début de l’interface.
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const app = $('.booking-app');
  const form = $('#reservation');
  const panes = $$('.booking-pane');
  const steps = $$('[data-step]');
  const annonce = $('#annonce-reservation');
  const selection = $('#selection');
  const etat = { prestation: '', jour: '', minute: null, etape: 0, termine: false };
  let animation = null;

  // Les actions au clavier répondent immédiatement.
  document.addEventListener('keydown', event => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) root.classList.add('keyboard-input');
  }, true);
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard-input'), { passive: true });
  function animer(element) {
    if (animation) animation.cancel();
    if (mouvementReduit.matches || root.classList.contains('keyboard-input') || !element.animate) return;
    animation = element.animate([
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function annoncer(texte) { annonce.textContent = texte; }
  function mettreEnVue(element) {
    element.focus({ preventScroll: true });
    const mobile = window.matchMedia('(max-width: 900px)').matches;
    const hauteurPanneau = mobile ? $('#panneau').getBoundingClientRect().height : 0;
    const marge = hauteurPanneau + $('.selection-summary').offsetHeight + 32;
    const position = element.getBoundingClientRect();
    if (position.top < marge || position.bottom > window.innerHeight - 130) {
      window.scrollTo({ top: Math.max(0, window.scrollY + position.top - marge), behavior: 'instant' });
    }
  }
  function resume() {
    if (!etat.prestation) return 'Choisissez une prestation pour commencer.';
    const lignes = [PRESTATIONS[etat.prestation].nom, `30${ESPACE}min`];
    if (etat.jour) lignes.push(dateLongue.format(jourDepuis(etat.jour)));
    if (etat.minute !== null) lignes.push(heure(etat.minute));
    return lignes.join(' · ');
  }
  function synchroniser() {
    selection.textContent = resume();
    const limites = [true, !!etat.prestation, !!etat.jour, etat.minute !== null];
    steps.forEach((button, index) => {
      button.disabled = !limites[index] || etat.termine;
      if (index === etat.etape && !etat.termine) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('[data-next="1"]').disabled = !etat.prestation;
    $('[data-next="2"]').disabled = !etat.jour;
    $('[data-next="3"]').disabled = etat.minute === null;
  }
  function montrerEtape(numero, focus = true) {
    if (etat.termine || numero < 0 || numero > 3) return;
    if ((numero > 0 && !etat.prestation) || (numero > 1 && !etat.jour) || (numero > 2 && etat.minute === null)) return;
    if (numero === 1) afficherJours();
    if (numero === 2) afficherHeures();
    etat.etape = numero;
    panes.forEach((pane, index) => { pane.hidden = numero !== index; });
    synchroniser();
    const actif = panes[numero];
    animer(actif);
    if (focus) {
      mettreEnVue($('h3', actif));
    }
    annoncer(`Étape ${numero + 1} sur 4. ${$('h3', actif).textContent} Votre sélection${ESPACE}: ${resume()}`);
  }
  function choisirPrestation(valeur) {
    if (!PRESTATIONS[valeur]) return;
    etat.prestation = valeur;
    etat.jour = '';
    etat.minute = null;
    $(`input[name="prestation"][value="${valeur}"]`).checked = true;
    synchroniser();
  }
  function afficherJours() {
    const groupe = $('.day-options');
    $$('label', groupe).forEach(label => label.remove());
    const duree = PRESTATIONS[etat.prestation].duree;
    const jours = prochainsJours(duree);
    if (etat.jour && !jours.some(j => j.cle === etat.jour && j.restant)) {
      etat.jour = '';
      etat.minute = null;
    }
    for (const jour of jours) {
      const label = document.createElement('label');
      label.className = 'day-option';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'jour'; radio.value = jour.cle;
      radio.disabled = !jour.restant;
      radio.checked = etat.jour === jour.cle;
      radio.setAttribute('aria-label', `${dateLongue.format(jour.date)}, ${jour.ferme ? 'fermé' : jour.restant ? 'exemple de jour' : 'aucun créneau restant dans l’exemple'}`);
      const texte = document.createElement('span');
      const nom = document.createElement('span'); nom.textContent = jourCourt.format(jour.date);
      const date = document.createElement('b'); date.textContent = jour.date.getUTCDate();
      const mois = document.createElement('small'); mois.textContent = jour.ferme ? 'Fermé' : jour.restant ? moisCourt.format(jour.date) : 'Écoulé';
      texte.append(nom, date, mois); label.append(radio, texte); groupe.append(label);
    }
  }
  function afficherHeures() {
    const groupe = $('.slot-options');
    $$('label, .slots-empty', groupe).forEach(element => element.remove());
    if (!etat.jour) return;
    const liste = creneaux(etat.jour, PRESTATIONS[etat.prestation].duree);
    if (etat.minute !== null && !liste.some(s => s.minute === etat.minute && !s.indisponible)) etat.minute = null;
    for (const slot of liste) {
      const label = document.createElement('label'); label.className = 'slot-option';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'heure'; radio.value = slot.minute;
      radio.disabled = slot.indisponible; radio.checked = etat.minute === slot.minute;
      radio.setAttribute('aria-label', `${heure(slot.minute)}, ${slot.raison || 'créneau d’exemple'}`);
      const texte = document.createElement('span');
      const valeur = document.createElement('b'); valeur.textContent = heure(slot.minute);
      texte.append(valeur);
      if (slot.raison) { const raison = document.createElement('small'); raison.textContent = slot.raison; texte.append(raison); }
      label.append(radio, texte); groupe.append(label);
    }
    if (!liste.some(slot => !slot.indisponible)) {
      const message = document.createElement('p'); message.className = 'slots-empty';
      message.textContent = 'Aucun créneau restant dans cet exemple. Choisissez un autre jour.';
      groupe.append(message);
    }
  }
  function effacerErreur(champ) {
    champ.removeAttribute('aria-invalid');
    $(`#erreur-${champ.id}`).textContent = '';
  }
  form.addEventListener('input', event => {
    if (event.target.id === 'prenom' || event.target.id === 'telephone') effacerErreur(event.target);
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (input.name === 'prestation') choisirPrestation(input.value);
    if (input.name === 'jour') { etat.jour = input.value; etat.minute = null; }
    if (input.name === 'heure') etat.minute = Number(input.value);
    synchroniser();
    annoncer(`Votre sélection${ESPACE}: ${resume()}`);
  });
  $$('[data-next], [data-back], [data-step]').forEach(button => {
    button.addEventListener('click', () => {
      const numero = button.dataset.next ?? button.dataset.back ?? button.dataset.step;
      montrerEtape(Number(numero));
    });
  });
  $$('[data-select]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      if (etat.termine) recommencer(false);
      choisirPrestation(link.dataset.select);
      montrerEtape(1);
    });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (etat.etape !== 3 || !etat.prestation || !etat.jour || etat.minute === null) return;
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    [prenom, telephone].forEach(effacerErreur);
    const erreurs = [];
    if (!prenom.value.trim()) erreurs.push([prenom, 'Indiquez un prénom pour essayer.']);
    if (!telephoneValide(telephone.value)) erreurs.push([telephone, 'Indiquez un numéro français à dix chiffres, ou au format +33.']);
    if (erreurs.length) {
      erreurs.forEach(([champ, message]) => {
        champ.setAttribute('aria-invalid', 'true');
        $(`#erreur-${champ.id}`).textContent = message;
      });
      mettreEnVue(erreurs[0][0]); annoncer('Vérifiez les champs indiqués avant de terminer l’essai.'); return;
    }
    const encorePossible = creneaux(etat.jour, PRESTATIONS[etat.prestation].duree).some(s => s.minute === etat.minute && !s.indisponible);
    if (!encorePossible) {
      etat.minute = null; montrerEtape(2);
      annoncer('Ce créneau d’exemple est maintenant passé. Choisissez une autre heure.'); return;
    }
    etat.termine = true;
    form.hidden = true;
    $('.result-summary').textContent = `${resume()} · 20 rue de la Rôtisserie, Tours.`;
    const resultat = $('.booking-result'); resultat.hidden = false;
    prenom.value = ''; telephone.value = '';
    synchroniser(); animer(resultat);
    mettreEnVue($('h3', resultat));
    annoncer('Simulation terminée. Aucun rendez-vous n’a été pris et rien n’a été envoyé au salon.');
  });
  function recommencer(focus = true) {
    if (animation) animation.cancel();
    etat.prestation = ''; etat.jour = ''; etat.minute = null; etat.etape = 0; etat.termine = false;
    form.reset();
    [$('#prenom'), $('#telephone')].forEach(effacerErreur);
    $('.booking-result').hidden = true; form.hidden = false;
    montrerEtape(0, focus);
  }
  $('.restart').addEventListener('click', () => recommencer());
  app.hidden = false;
  $('.no-script').hidden = true;
  synchroniser();

  // Copie locale ; repli sélectionnable si le navigateur refuse la copie.
  $('.copy-address').addEventListener('click', async () => {
    const adresse = '20 rue de la Rôtisserie, 37000 Tours';
    try {
      if (!navigator.clipboard) throw new Error('Copie indisponible');
      await navigator.clipboard.writeText(adresse);
      $('.copy-status').textContent = 'Adresse copiée.';
    } catch {
      $('.copy-status').textContent = `Copiez cette adresse${ESPACE}: ${adresse}`;
    }
  });

  // L’indicateur suit la section de lecture, sans écouteur de défilement.
  const navigation = $('.panel__nav');
  const liensNavigation = $$('a', navigation);
  const indicateur = $('.nav-marker');
  let sectionActive = 'repere';
  function marquerSection(id) {
    sectionActive = id;
    liensNavigation.forEach(link => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const lien = liensNavigation.find(link => link.hash === `#${id}`);
    if (lien && indicateur) indicateur.style.transform = `translate(${lien.offsetLeft - liensNavigation[0].offsetLeft}px, ${lien.offsetTop - liensNavigation[0].offsetTop}px)`;
  }
  if ('IntersectionObserver' in window) {
    const sections = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) marquerSection(entry.target.id);
    }, { rootMargin: '-20% 0px -60% 0px', threshold: 0 });
    $$('[data-section]').forEach(section => sections.observe(section));
    const revelations = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible'); revelations.unobserve(entry.target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    $$('[data-reveal]').forEach(element => revelations.observe(element));
    // La barre basse s’efface lorsqu’elle doublerait les actions déjà visibles.
    const barre = $('.mobile-actions');
    const visibles = new Set();
    const actions = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibles.add(entry.target.id);
        else visibles.delete(entry.target.id);
      }
      const masquer = visibles.size > 0;
      barre.classList.toggle('is-hidden', masquer);
      barre.inert = masquer;
    }, { threshold: 0 });
    [$('#reserver'), $('#pied')].forEach(element => actions.observe(element));
  } else {
    $$('[data-reveal]').forEach(element => element.classList.add('is-visible'));
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => marquerSection(sectionActive)).observe(navigation);
    new ResizeObserver(entries => {
      const hauteur = entries[0].target.getBoundingClientRect().height;
      root.style.setProperty('--panel-height', `${Math.ceil(hauteur)}px`);
    }).observe($('#panneau'));
  }
  mouvementReduit.addEventListener('change', () => { if (animation) animation.cancel(); });
  root.classList.add('js');
  // Aucun chargement de police ne retarde les interactions ou l’entrée.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
