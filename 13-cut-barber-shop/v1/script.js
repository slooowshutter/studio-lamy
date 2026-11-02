/* 13 Cut · simulation locale, sans collecte ni dépendance. */
const carnet13 = (() => {
  'use strict';
  const prestations = [
    { id: 'tondeuse', nom: 'Coupe classique tondeuse homme', duree: 30 },
    { id: 'ciseaux', nom: 'Coupe classique tondeuse + ciseaux', duree: 30 },
    { id: 'enfant', nom: 'Coupe enfant de moins de 12 ans', duree: 30 },
    { id: 'contours', nom: 'Contours tondeuse + lame', duree: 10 },
    { id: 'forfait', nom: 'Forfait coupe tondeuse + barbe', duree: 30 },
    { id: 'barbe', nom: 'Taille de barbe (traçage, ciseaux, tondeuse, coupe-chou)', duree: 30 },
    { id: 'coloration', nom: 'Coloration', duree: 60 },
    { id: 'nattes', nom: 'Nattes collées simples', duree: 60 },
    { id: 'vanilles', nom: 'Vanilles, tête entière', duree: 120 },
    { id: 'locks', nom: 'Retwist locks', duree: 120 }
  ];
  // Source : Planity. Les divergences avec les annuaires sont signalées dans la page.
  const horaires = { 0: [645, 1080], 1: null, 2: [615, 1200], 3: [615, 1200], 4: [615, 1200], 5: [615, 1200], 6: [615, 1200] };
  const dateParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  function maintenant(date = new Date()) {
    const p = Object.fromEntries(dateParis.formatToParts(date).map(part => [part.type, part.value]));
    return { cle: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
  }
  function dateUTC(cle) { return new Date(`${cle}T12:00:00Z`); }
  function jours(date = new Date()) {
    const debut = dateUTC(maintenant(date).cle);
    return Array.from({ length: 14 }, (_, index) => {
      const jour = new Date(debut);
      jour.setUTCDate(debut.getUTCDate() + index);
      return { cle: jour.toISOString().slice(0, 10), date: jour, horaires: horaires[jour.getUTCDay()] };
    });
  }
  function creneaux(cle, duree, date = new Date()) {
    const plage = horaires[dateUTC(cle).getUTCDay()];
    if (!plage) return [];
    const present = maintenant(date);
    const graine = [...cle].reduce((somme, lettre) => somme + lettre.charCodeAt(0), 0);
    const liste = [];
    for (let minute = plage[0], index = 0; minute + duree <= plage[1]; minute += 15, index += 1) {
      const passe = cle < present.cle || (cle === present.cle && minute <= present.minutes);
      const indisponible = (graine + index) % 7 === 0;
      liste.push({ minute, desactive: passe || indisponible, raison: passe ? 'Passé' : indisponible ? 'Indisponible' : '' });
    }
    return liste;
  }
  function heure(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}\u00a0h${m ? `\u00a0${String(m).padStart(2, '0')}` : ''}`;
  }
  function duree(minutes) {
    return minutes >= 60 ? `${Math.floor(minutes / 60)}\u00a0h${minutes % 60 ? `\u00a0${minutes % 60}` : ''}` : `${minutes}\u00a0min`;
  }
  function mobile(valeur) { return /^(?:0|\+33|0033)[67]\d{8}$/.test(valeur.replace(/[\s.()\-]/g, '')); }
  return { prestations, horaires, maintenant, dateUTC, jours, creneaux, heure, duree, mobile };
})();

/* Interface */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (selecteur, contexte = document) => contexte.querySelector(selecteur);
  const $$ = (selecteur, contexte = document) => [...contexte.querySelectorAll(selecteur)];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { prestations, maintenant, dateUTC, jours, creneaux, heure, duree, mobile } = carnet13;
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const jourCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'short' });
  const etat = { etape: 0, prestation: null, jour: null, minute: null, fin: false };
  const panels = $$('.step-panel');
  const steps = $$('.steps button');
  const form = $('#booking-form');
  const app = $('.booking-app');
  let animationEtape;

  function element(balise, classe, texte) {
    const noeud = document.createElement(balise);
    if (classe) noeud.className = classe;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  }
  function radio(nom, valeur, desactive, coche) {
    const choix = document.createElement('input');
    choix.type = 'radio'; choix.name = nom; choix.value = valeur;
    choix.disabled = Boolean(desactive); choix.checked = Boolean(coche);
    return choix;
  }
  function annoncer(texte) { $('#booking-status').textContent = texte; }
  function selection() {
    $('#summary-service').textContent = etat.prestation ? etat.prestation.nom : 'Une prestation à choisir';
    $('#summary-day').textContent = etat.jour ? dateLongue.format(dateUTC(etat.jour)) : 'Un jour à choisir';
    $('#summary-time').textContent = etat.minute !== null ? heure(etat.minute) : 'Une heure à choisir';
  }
  function erreur(id, texte) {
    $(id).textContent = texte;
    if (texte) annoncer(texte);
  }
  function premierChoix(nom) {
    const cible = $(`input[name="${nom}"]:checked`) || $(`input[name="${nom}"]:not(:disabled)`);
    if (cible) cible.focus();
  }

  /* Des libellés réels et des durées sourcées, aucun tarif dans l’essai. */
  prestations.forEach(prestation => {
    const label = element('label', 'choice');
    const input = radio('prestation', prestation.id, false, false);
    input.setAttribute('aria-describedby', 'service-error');
    label.append(input, element('span', 'choice-name', prestation.nom), element('span', 'choice-duration', duree(prestation.duree)));
    $('#service-options').append(label);
  });

  function afficherJours() {
    const liste = $('#day-options');
    liste.replaceChildren();
    const prochains = jours();
    if (etat.jour && !prochains.some(jour => jour.cle === etat.jour)) {
      etat.jour = null; etat.minute = null; selection();
    }
    prochains.forEach(jour => {
      const fini = Boolean(jour.horaires) && !creneaux(jour.cle, etat.prestation.duree).some(creneau => !creneau.desactive);
      const desactive = !jour.horaires || fini;
      if (jour.cle === etat.jour && desactive) { etat.jour = null; etat.minute = null; selection(); }
      const label = element('label', 'calendar-choice');
      const input = radio('jour', jour.cle, desactive, jour.cle === etat.jour);
      input.setAttribute('aria-label', `${dateLongue.format(jour.date)}${!jour.horaires ? ', fermé' : fini ? ', écoulé' : ', jour d’essai'}`);
      input.setAttribute('aria-describedby', 'day-error');
      label.append(input, element('span', 'day-name', jourCourt.format(jour.date)), element('span', 'day-number', String(jour.date.getUTCDate())), element('span', 'day-month', moisCourt.format(jour.date)), element('span', 'day-state', !jour.horaires ? 'Fermé' : fini ? 'Écoulé' : jour.cle === maintenant().cle ? 'Aujourd’hui' : 'Essai'));
      liste.append(label);
    });
  }
  function afficherHeures() {
    const liste = $('#slot-options');
    liste.replaceChildren();
    $('#chosen-day').textContent = dateLongue.format(dateUTC(etat.jour));
    const heures = creneaux(etat.jour, etat.prestation.duree);
    if (!heures.some(creneau => creneau.minute === etat.minute && !creneau.desactive)) etat.minute = null;
    heures.forEach(creneau => {
      const label = element('label', 'slot-choice');
      const input = radio('heure', String(creneau.minute), creneau.desactive, creneau.minute === etat.minute);
      input.setAttribute('aria-label', `${heure(creneau.minute)}${creneau.raison ? `, ${creneau.raison.toLowerCase()}` : ''}, simulation`);
      input.setAttribute('aria-describedby', 'slot-error');
      label.append(input, element('span', 'slot-time', heure(creneau.minute)));
      if (creneau.raison) label.append(element('small', '', creneau.raison));
      liste.append(label);
    });
    if (!heures.some(creneau => !creneau.desactive)) liste.append(element('p', 'fine', 'Aucune heure d’essai disponible ce jour. Revenez au choix du jour.'));
    selection();
  }
  function navigation() {
    const maximum = etat.minute !== null ? 3 : etat.jour ? 2 : etat.prestation ? 1 : 0;
    steps.forEach((bouton, index) => {
      bouton.disabled = index > maximum;
      if (index === etat.etape) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
    });
  }
  function aller(etape, animer = false) {
    if (etape >= 1 && !etat.prestation) return;
    if (etape >= 2 && !etat.jour) return;
    if (etape >= 3 && etat.minute === null) return;
    if (animationEtape) animationEtape.cancel();
    if (etape === 1) afficherJours();
    if (etape === 2) afficherHeures();
    etat.etape = etape;
    panels.forEach((panel, index) => { panel.hidden = index !== etape; });
    navigation(); selection();
    const titre = $(`#step-title-${etape}`);
    titre.focus({ preventScroll: true });
    const position = titre.getBoundingClientRect();
    if (position.top < 16 || position.top > window.innerHeight * .65) titre.scrollIntoView({ block: 'start', behavior: 'instant' });
    annoncer(`Étape ${etape + 1} sur 4\u00a0: ${titre.textContent}`);
    if (animer && !mouvementReduit.matches && panels[etape].animate) {
      animationEtape = panels[etape].animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    }
  }

  form.addEventListener('change', evenement => {
    const input = evenement.target;
    if (input.name === 'prestation') {
      const nouvelle = prestations.find(prestation => prestation.id === input.value);
      if (etat.prestation?.id !== nouvelle.id) { etat.jour = null; etat.minute = null; }
      etat.prestation = nouvelle;
      erreur('#service-error', '');
    } else if (input.name === 'jour') {
      if (etat.jour !== input.value) etat.minute = null;
      etat.jour = input.value;
      erreur('#day-error', '');
    } else if (input.name === 'heure') {
      etat.minute = Number(input.value);
      erreur('#slot-error', '');
    }
    navigation(); selection();
  });
  $$('[data-next]').forEach(bouton => bouton.addEventListener('click', evenement => {
    const suivant = Number(bouton.dataset.next);
    if (suivant === 1 && !etat.prestation) { erreur('#service-error', 'Choisissez une prestation pour continuer.'); premierChoix('prestation'); return; }
    if (suivant === 2 && !etat.jour) { erreur('#day-error', 'Choisissez un jour pour continuer.'); premierChoix('jour'); return; }
    if (suivant === 3 && etat.minute === null) { erreur('#slot-error', 'Choisissez une heure d’essai pour continuer.'); premierChoix('heure'); return; }
    aller(suivant, evenement.detail > 0);
  }));
  $$('[data-back], [data-go]').forEach(bouton => bouton.addEventListener('click', evenement => {
    aller(Number(bouton.dataset.back ?? bouton.dataset.go), evenement.detail > 0);
  }));

  function validerChamp(input, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    $(`#${input.id}-error`).textContent = message;
    return !message;
  }
  $('#prenom').addEventListener('input', evenement => validerChamp(evenement.target, ''));
  $('#telephone').addEventListener('input', evenement => validerChamp(evenement.target, ''));
  form.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (etat.etape !== 3 || !etat.prestation || !etat.jour || etat.minute === null || etat.fin) return;
    const prenom = $('#prenom');
    const telephone = $('#telephone');
    const nomValide = validerChamp(prenom, prenom.value.trim().length ? '' : 'Indiquez un prénom pour cet essai.');
    const telValide = validerChamp(telephone, mobile(telephone.value) ? '' : 'Utilisez un numéro mobile français à 10 chiffres, commençant par 06 ou 07.');
    if (!nomValide || !telValide) {
      annoncer('Vérifiez les champs indiqués avant de terminer l’essai.');
      (!nomValide ? prenom : telephone).focus();
      return;
    }
    if (!creneaux(etat.jour, etat.prestation.duree).some(creneau => creneau.minute === etat.minute && !creneau.desactive)) {
      etat.minute = null;
      aller(2, evenement.detail > 0);
      erreur('#slot-error', 'Cette heure est passée. Choisissez une autre heure d’essai.');
      return;
    }
    etat.fin = true;
    $('#success-recap').textContent = `${prenom.value.trim()}, voici votre sélection d’essai\u00a0: ${etat.prestation.nom}, le ${dateLongue.format(dateUTC(etat.jour))} à ${heure(etat.minute)}.`;
    prenom.value = ''; telephone.value = '';
    $('.booking-columns').hidden = true;
    $('.steps').hidden = true;
    $('#success').hidden = false;
    $('#success-title').focus({ preventScroll: true });
    $('#success-title').scrollIntoView({ block: 'start', behavior: 'instant' });
    annoncer('Essai terminé. Aucun rendez-vous réservé, aucune donnée envoyée.');
  });
  $('#restart').addEventListener('click', evenement => {
    form.reset();
    etat.prestation = null; etat.jour = null; etat.minute = null; etat.fin = false;
    $$('.field-error').forEach(message => { message.textContent = ''; });
    $$('input[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    $('#success-recap').textContent = '';
    $('#success').hidden = true;
    $('.booking-columns').hidden = false;
    $('.steps').hidden = false;
    aller(0, evenement.detail > 0);
  });

  /* Une entrée chorégraphiée et des révélations ponctuelles par type de contenu. */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.isIntersecting) { entree.target.classList.add('is-visible'); observer.unobserve(entree.target); }
      });
    }, { threshold: .12 });
    $$('.section-rule, [data-reveal]').forEach(noeud => observer.observe(noeud));
    const barre = $('.mobile-bar');
    const cache = new Set();
    const observerBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => { if (entree.isIntersecting) cache.add(entree.target); else cache.delete(entree.target); });
      barre.classList.toggle('is-concealed', cache.size > 0);
    }, { threshold: 0 });
    [$('#simulation'), $('#pied')].forEach(noeud => observerBarre.observe(noeud));
  } else {
    $$('.section-rule, [data-reveal]').forEach(noeud => noeud.classList.add('is-visible'));
  }
  document.addEventListener('keydown', () => root.classList.add('keyboard'));
  document.addEventListener('pointerdown', () => root.classList.remove('keyboard'), { passive: true });
  mouvementReduit.addEventListener('change', () => { if (mouvementReduit.matches && animationEtape) animationEtape.cancel(); });
  app.hidden = false;
  window.sitePret = true;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));
})();
