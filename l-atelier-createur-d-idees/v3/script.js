(() => {
  'use strict';

  const racine = document.documentElement;
  racine.classList.add('js');

  const hero = document.querySelector('.hero');
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  requestAnimationFrame(() => {
    if (hero) hero.classList.add('is-pret');
  });

  const elementsAReveler = [...document.querySelectorAll('[data-revelation]')];
  if (mouvementReduit.matches || !('IntersectionObserver' in window)) {
    elementsAReveler.forEach((element) => element.classList.add('is-visible'));
  } else {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });

    elementsAReveler.forEach((element) => observateurRevelation.observe(element));
  }

  const jours = {
    0: null,
    1: [570, 1140],
    2: [570, 1140],
    3: null,
    4: [570, 1140],
    5: [570, 1140],
    6: [510, 1020]
  };

  const formulaire = document.querySelector('#formulaire-reservation');
  const panneaux = [...document.querySelectorAll('[data-etape]')];
  const conteneurDates = document.querySelector('#liste-dates');
  const conteneurHeures = document.querySelector('#liste-heures');
  const valeurEtape = document.querySelector('#etape-actuelle');
  const recapitulatif = {
    prestation: document.querySelector('#recap-prestation'),
    date: document.querySelector('#recap-date'),
    heure: document.querySelector('#recap-heure')
  };
  const boutonModifier = [...document.querySelectorAll('[data-reprendre]')];
  const erreurs = {
    prestation: document.querySelector('#erreur-prestation'),
    date: document.querySelector('#erreur-date'),
    heure: document.querySelector('#erreur-heure'),
    prenom: document.querySelector('#erreur-prenom'),
    telephone: document.querySelector('#erreur-telephone')
  };

  let etapeActive = 0;
  let minuterieEtape = 0;
  let dateChoisie = null;
  let heureChoisie = '';

  const choixPrestation = () => formulaire.querySelector('input[name="prestation"]:checked');
  const dateCle = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const formateurDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
  const formateurCourte = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' });
  const formateurJour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' });

  function afficherErreur(element, afficher) {
    if (element) element.hidden = !afficher;
  }

  function formaterHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${String(heures).padStart(2, '0')} h ${String(reste).padStart(2, '0')}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(annee, mois - 1, jour, 12, 0, 0);
  }

  function heureAParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    const heures = Number(parties.find((partie) => partie.type === 'hour').value);
    const minutes = Number(parties.find((partie) => partie.type === 'minute').value);
    return heures * 60 + minutes;
  }

  function aujourdHuiAParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    return `${parties.find((partie) => partie.type === 'year').value}-${parties.find((partie) => partie.type === 'month').value}-${parties.find((partie) => partie.type === 'day').value}`;
  }

  function actualiserRecapitulatif() {
    const prestation = choixPrestation();
    recapitulatif.prestation.textContent = prestation ? prestation.value : 'À choisir';
    recapitulatif.date.textContent = dateChoisie ? formateurDate.format(dateChoisie) : 'À choisir';
    recapitulatif.heure.textContent = heureChoisie || 'À choisir';

    boutonModifier.forEach((bouton) => {
      const index = Number(bouton.dataset.reprendre);
      const complet = index === 0 ? Boolean(prestation)
        : index === 1 ? Boolean(dateChoisie)
          : Boolean(heureChoisie);
      bouton.hidden = !complet;
    });
  }

  function produireDates() {
    if (!conteneurDates) return;
    conteneurDates.replaceChildren();

    const dateParis = dateDepuisCle(aujourdHuiAParis());
    const jourCourant = dateCle(dateParis);

    for (let indice = 0; indice < 14; indice += 1) {
      const date = new Date(dateParis);
      date.setDate(dateParis.getDate() + indice);
      const horaires = jours[date.getDay()];
      const ferme = !horaires;
      const cle = dateCle(date);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix-date';
      bouton.dataset.date = cle;
      bouton.disabled = ferme;
      bouton.setAttribute('aria-pressed', 'false');

      const libelleJour = document.createElement('span');
      libelleJour.className = 'choix-date__jour';
      libelleJour.textContent = formateurJour.format(date).replace('.', '');

      const nombre = document.createElement('span');
      nombre.className = 'choix-date__nombre';
      nombre.textContent = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric' }).format(date);

      bouton.append(libelleJour, nombre);

      if (ferme) {
        const etatFerme = document.createElement('span');
        etatFerme.className = 'choix-date__ferme';
        etatFerme.textContent = 'fermé';
        bouton.append(etatFerme);
      } else if (cle === jourCourant) {
        const etatAujourdHui = document.createElement('span');
        etatAujourdHui.className = 'choix-date__ferme';
        etatAujourdHui.textContent = 'aujourd’hui';
        bouton.append(etatAujourdHui);
      }

      const dateLisible = formateurDate.format(date);
      bouton.setAttribute('aria-label', ferme ? `${dateLisible}, fermé` : dateLisible);
      conteneurDates.append(bouton);
    }
  }

  function produireHeures(date) {
    if (!conteneurHeures) return;
    conteneurHeures.replaceChildren();
    const horaires = jours[date.getDay()];

    if (!horaires) {
      const message = document.createElement('p');
      message.className = 'message-attente';
      message.textContent = 'Le salon est indiqué fermé ce jour-là.';
      conteneurHeures.append(message);
      return;
    }

    const [ouverture, fermeture] = horaires;
    const possibilites = [ouverture + 30, ouverture + 120, ouverture + 240, ouverture + 360, ouverture + 480, fermeture - 90]
      .filter((heure, indice, liste) => heure < fermeture && liste.indexOf(heure) === indice)
      .sort((a, b) => a - b);
    const cleDate = dateCle(date);
    const cleAujourdHui = aujourdHuiAParis();
    const minutesActuelles = heureAParis();

    possibilites.forEach((minutes) => {
      const heure = formaterHeure(minutes);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix-heure';
      bouton.dataset.heure = heure;
      bouton.textContent = heure;
      bouton.setAttribute('aria-pressed', 'false');

      const passee = cleDate === cleAujourdHui && minutes <= minutesActuelles;
      bouton.disabled = passee;
      if (passee) bouton.setAttribute('aria-label', `${heure}, heure déjà passée`);
      conteneurHeures.append(bouton);
    });
  }

  function retirerLesErreurs() {
    Object.values(erreurs).forEach((element) => afficherErreur(element, false));
    formulaire.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
  }

  function validerEtape(index) {
    retirerLesErreurs();

    if (index === 0 && !choixPrestation()) {
      afficherErreur(erreurs.prestation, true);
      formulaire.querySelector('input[name="prestation"]')?.focus();
      return false;
    }

    if (index === 1 && !dateChoisie) {
      afficherErreur(erreurs.date, true);
      return false;
    }

    if (index === 2 && !heureChoisie) {
      afficherErreur(erreurs.heure, true);
      return false;
    }

    return true;
  }

  function afficherEtape(index, animer = false) {
    if (index < 0 || index >= panneaux.length || index === etapeActive) return;
    if (minuterieEtape) {
      window.clearTimeout(minuterieEtape);
      panneaux.forEach((panneau, numero) => {
        if (numero === etapeActive) return;
        panneau.hidden = true;
        panneau.inert = false;
        panneau.classList.remove('etape--arrive', 'etape--active', 'etape--sortie');
      });
      minuterieEtape = 0;
    }
    const precedente = panneaux[etapeActive];
    const suivante = panneaux[index];
    const mouvementAutorise = animer && !mouvementReduit.matches;

    if (precedente) {
      if (mouvementAutorise) {
        precedente.inert = true;
        precedente.classList.remove('etape--arrive', 'etape--active');
        precedente.classList.add('etape--sortie');
        minuterieEtape = window.setTimeout(() => {
          precedente.hidden = true;
          precedente.inert = false;
          precedente.classList.remove('etape--sortie');
          minuterieEtape = 0;
        }, 240);
      } else {
        precedente.hidden = true;
        precedente.inert = false;
        precedente.classList.remove('etape--arrive', 'etape--active', 'etape--sortie');
      }
    }

    etapeActive = index;
    suivante.hidden = false;
    suivante.inert = false;
    suivante.classList.remove('etape--sortie', 'etape--active', 'etape--arrive');
    if (mouvementAutorise) {
      suivante.classList.add('etape--arrive');
      requestAnimationFrame(() => requestAnimationFrame(() => suivante.classList.add('etape--active')));
    }

    valeurEtape.textContent = String(index + 1);
    actualiserRecapitulatif();
    suivante.querySelector('.etape__titre')?.focus({ preventScroll: false });
  }

  function afficherConfirmation() {
    const confirmation = document.querySelector('#confirmation');
    const nom = document.querySelector('#prenom');
    const formulaireActif = panneaux[etapeActive];
    if (!nom.value.trim()) {
      nom.setAttribute('aria-invalid', 'true');
      afficherErreur(erreurs.prenom, true);
      nom.focus();
      return;
    }

    if (!validerEtape(2)) {
      if (formulaireActif) formulaireActif.hidden = false;
      return;
    }

    const telephone = document.querySelector('#telephone');
    const numero = telephone.value.replace(/[^\d+]/g, '');
    const mobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(numero);
    if (!mobileValide) {
      telephone.setAttribute('aria-invalid', 'true');
      afficherErreur(erreurs.telephone, true);
      telephone.focus();
      return;
    }

    formulaire.querySelectorAll('[data-etape]').forEach((panneau) => { panneau.hidden = true; });
    document.querySelector('#etapes-texte').hidden = true;
    confirmation.replaceChildren();

    const titre = document.createElement('h3');
    titre.id = 'titre-confirmation';
    titre.tabIndex = -1;
    titre.textContent = 'Simulation terminée';

    const recap = document.createElement('p');
    recap.textContent = `${choixPrestation().value} · ${formateurDate.format(dateChoisie)} · ${heureChoisie}.`;

    const note = document.createElement('p');
    note.textContent = 'Rien n’a été transmis. Pour confirmer les modalités d’un rendez-vous, contactez le salon par téléphone.';

    const telephoneSalon = document.createElement('a');
    telephoneSalon.href = 'tel:+33380303862';
    telephoneSalon.textContent = '03 80 30 38 62';
    note.append(' ', telephoneSalon, '.');

    confirmation.append(titre, recap, note);
    confirmation.hidden = false;
    actualiserRecapitulatif();
    titre.focus({ preventScroll: false });
  }

  if (formulaire && panneaux.length && conteneurDates && conteneurHeures) {
    produireDates();
    panneaux.forEach((panneau, index) => { panneau.hidden = index !== 0; });
    valeurEtape.textContent = '1';
    actualiserRecapitulatif();

    document.querySelectorAll('[data-preselection]').forEach((lien) => {
      lien.addEventListener('click', () => {
        const radio = [...formulaire.querySelectorAll('input[name="prestation"]')]
          .find((choix) => choix.value === lien.dataset.preselection);
        if (!radio) return;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    formulaire.addEventListener('change', (event) => {
      if (event.target.matches('input[name="prestation"]')) {
        afficherErreur(erreurs.prestation, false);
        actualiserRecapitulatif();
      }
    });

    conteneurDates.addEventListener('click', (event) => {
      const bouton = event.target.closest('button[data-date]');
      if (!bouton || bouton.disabled) return;
      dateChoisie = dateDepuisCle(bouton.dataset.date);
      heureChoisie = '';
      conteneurDates.querySelectorAll('button[data-date]').forEach((date) => date.setAttribute('aria-pressed', String(date === bouton)));
      produireHeures(dateChoisie);
      afficherErreur(erreurs.date, false);
      afficherErreur(erreurs.heure, false);
      actualiserRecapitulatif();
    });

    conteneurHeures.addEventListener('click', (event) => {
      const bouton = event.target.closest('button[data-heure]');
      if (!bouton || bouton.disabled) return;
      heureChoisie = bouton.dataset.heure;
      conteneurHeures.querySelectorAll('button[data-heure]').forEach((heure) => heure.setAttribute('aria-pressed', String(heure === bouton)));
      afficherErreur(erreurs.heure, false);
      actualiserRecapitulatif();
    });

    formulaire.querySelectorAll('[data-etape-suivante]').forEach((bouton) => {
      bouton.addEventListener('click', (event) => {
        if (!validerEtape(etapeActive)) return;
        afficherEtape(etapeActive + 1, event.detail > 0);
      });
    });

    formulaire.querySelectorAll('[data-etape-precedente]').forEach((bouton) => {
      bouton.addEventListener('click', (event) => afficherEtape(etapeActive - 1, event.detail > 0));
    });

    boutonModifier.forEach((bouton) => {
      bouton.addEventListener('click', (event) => afficherEtape(Number(bouton.dataset.reprendre), event.detail > 0));
    });

    document.querySelector('#confirmer-demande').addEventListener('click', afficherConfirmation);

    document.querySelectorAll('#prenom, #telephone').forEach((champ) => {
      champ.addEventListener('input', () => {
        champ.removeAttribute('aria-invalid');
        const erreurAssociee = document.querySelector(`#${champ.getAttribute('aria-describedby')}`);
        afficherErreur(erreurAssociee, false);
      });
    });
  }

  const menuMobile = document.querySelector('.menu-mobile');
  if (menuMobile) {
    menuMobile.querySelectorAll('a').forEach((lien) => {
      lien.addEventListener('click', () => { menuMobile.open = false; });
    });
    menuMobile.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !menuMobile.open) return;
      menuMobile.open = false;
      menuMobile.querySelector('summary')?.focus();
    });
  }

  const barreMobile = document.querySelector('.barre-mobile');
  const actionsHero = document.querySelector('.hero__actions');
  const sectionReservation = document.querySelector('#reserver');
  const piedDePage = document.querySelector('.pied-de-page');

  if (barreMobile && actionsHero && sectionReservation && piedDePage && 'IntersectionObserver' in window) {
    const visibles = { actions: true, reservation: false, pied: false };
    const actualiserBarre = () => {
      barreMobile.hidden = visibles.actions || visibles.reservation || visibles.pied;
      document.body.classList.toggle('barre-mobile-active', !barreMobile.hidden);
    };
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === actionsHero) visibles.actions = entree.isIntersecting;
        if (entree.target === sectionReservation) visibles.reservation = entree.isIntersecting;
        if (entree.target === piedDePage) visibles.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0.08 });

    observateurBarre.observe(actionsHero);
    observateurBarre.observe(sectionReservation);
    observateurBarre.observe(piedDePage);
  }
})();
