(() => {
  document.documentElement.classList.add('js');

  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('#menu-mobile');
  const closeMobileNav = (restoreFocus = false) => {
    if (!menuToggle || !mobileNav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Ouvrir le menu');
    mobileNav.hidden = true;
    if (restoreFocus) menuToggle.focus();
  };

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const ouvert = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!ouvert));
      menuToggle.setAttribute('aria-label', ouvert ? 'Ouvrir le menu' : 'Fermer le menu');
      mobileNav.hidden = ouvert;
      if (!ouvert) mobileNav.querySelector('a')?.focus();
    });

    mobileNav.querySelectorAll('a').forEach((lien) => {
      lien.addEventListener('click', () => closeMobileNav());
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMobileNav(true);
      }
    });
  }

  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => hero?.classList.add('is-visible'));

  const revelationTargets = [...document.querySelectorAll('[data-revelation], .signature, .place')];
  if ('IntersectionObserver' in window) {
    const revelationObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        if (element.matches('.visit-list li')) {
          const rang = [...element.parentElement.children].indexOf(element);
          element.style.transitionDelay = `${Math.min(rang, 5) * 55}ms`;
        }
        element.classList.add('is-visible');
        observer.unobserve(element);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -4% 0px' });
    revelationTargets.forEach((element) => revelationObserver.observe(element));
  } else {
    revelationTargets.forEach((element) => element.classList.add('is-visible'));
  }

  const mobileBar = document.querySelector('#barre-mobile');
  if (mobileBar && 'IntersectionObserver' in window) {
    let heroPassed = false;
    let bookingVisible = false;
    let footerVisible = false;
    const updateMobileBar = () => {
      const show = heroPassed && !bookingVisible && !footerVisible && window.matchMedia('(max-width: 680px)').matches;
      mobileBar.hidden = !show;
      document.body.classList.toggle('barre-mobile-active', show);
    };
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.matches('.hero')) heroPassed = !entry.isIntersecting;
        if (entry.target.matches('.booking')) bookingVisible = entry.isIntersecting;
        if (entry.target.matches('.site-footer')) footerVisible = entry.isIntersecting;
      });
      updateMobileBar();
    }, { threshold: 0.02, rootMargin: '0px 0px -18% 0px' });
    document.querySelectorAll('.hero, .booking, .site-footer').forEach((element) => barObserver.observe(element));
    window.addEventListener('resize', updateMobileBar, { passive: true });
  }

  const offres = {
    brushing: { nom: 'Shampoing et brushing' },
    homme: { nom: 'Coupe homme classique ou taper' },
    ombre: { nom: 'Ombré hair, cheveux mi-longs' }
  };

  const selection = { prestation: '', jour: '', heure: '' };
  const zonesEtapes = [...document.querySelectorAll('.booking-step')];
  const annonce = document.querySelector('#annonce-reservation');
  const barreProgression = document.querySelector('#progression-etape');
  const zoneDates = document.querySelector('#jours-disponibles');
  const zoneHeures = document.querySelector('#heures-disponibles');
  const formulaire = document.querySelector('#formulaire-rendez-vous');
  const zoneSucces = document.querySelector('#confirmation');
  const resumePrestation = document.querySelector('#resume-prestation');
  const resumeJour = document.querySelector('#resume-jour');
  const resumeHeure = document.querySelector('#resume-heure');
  const recapConfirmation = document.querySelector('#recapitulatif-confirmation');
  const messageConfirmation = document.querySelector('#message-confirmation');
  const modifierBoutons = [...document.querySelectorAll('[data-modifier]')];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let etapeCourante = 1;
  let transitionEnCours = false;

  const dateLocale = (date, options) => new Intl.DateTimeFormat('fr-FR', options).format(date);
  const dateLocaleISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const heureTexte = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
  const prestationChoisie = () => offres[selection.prestation] || null;

  function dateChoisie() {
    if (!selection.jour) return null;
    return new Date(`${selection.jour}T12:00:00`);
  }

  function actualiserResume() {
    const prestation = prestationChoisie();
    resumePrestation.textContent = prestation ? prestation.nom : 'À choisir';
    const jour = dateChoisie();
    resumeJour.textContent = jour ? dateLocale(jour, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    resumeHeure.textContent = selection.heure || 'À choisir';
    modifierBoutons[0].disabled = !selection.prestation;
    modifierBoutons[1].disabled = !selection.jour;
    modifierBoutons[2].disabled = !selection.heure;
    if (prestation && jour && selection.heure) {
      recapConfirmation.textContent = `${prestation.nom} · ${dateLocale(jour, { weekday: 'long', day: 'numeric', month: 'long' })} à ${selection.heure}.`;
    } else {
      recapConfirmation.textContent = '';
    }
  }

  function actualiserProgression(numero) {
    barreProgression.style.transform = `scaleX(${numero / 4})`;
    annonce.textContent = `Étape ${numero} sur 4 : ${['choisissez une prestation.', 'choisissez un jour.', 'choisissez une heure.', 'indiquez vos coordonnées.'][numero - 1]}`;
  }

  async function afficherEtape(numero, mettreAuPoint = true) {
    if (transitionEnCours || numero < 1 || numero > 4) return;
    const etapeSuivante = zonesEtapes.find((element) => Number(element.dataset.etape) === numero);
    const etapeActuelle = zonesEtapes.find((element) => Number(element.dataset.etape) === etapeCourante);
    if (!etapeSuivante || etapeSuivante === etapeActuelle) return;

    transitionEnCours = true;
    if (zoneSucces && !zoneSucces.hidden) zoneSucces.hidden = true;
    etapeActuelle.inert = true;

    if (!etapeActuelle.hidden && !prefersReducedMotion.matches && typeof etapeActuelle.animate === 'function') {
      const sortie = etapeActuelle.animate(
        [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-5px)' }],
        { duration: 150, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' }
      );
      await sortie.finished.catch(() => {});
    }
    etapeActuelle.hidden = true;
    etapeActuelle.inert = false;
    etapeSuivante.hidden = false;
    etapeSuivante.inert = false;
    etapeCourante = numero;
    actualiserProgression(numero);

    if (!prefersReducedMotion.matches && typeof etapeSuivante.animate === 'function') {
      etapeSuivante.animate(
        [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 150, easing: 'cubic-bezier(.23, 1, .32, 1)' }
      );
    }
    if (mettreAuPoint) etapeSuivante.querySelector('h3')?.focus({ preventScroll: true });
    transitionEnCours = false;
  }

  function construireJours() {
    zoneDates.replaceChildren();
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    for (let rang = 0; rang < 14; rang += 1) {
      const jour = new Date(aujourdHui);
      jour.setDate(aujourdHui.getDate() + rang);
      const jourSemaine = jour.getDay();
      const dateISO = dateLocaleISO(jour);
      const fermeDimanche = jourSemaine === 0;
      const lundiAConfirmer = jourSemaine === 1;
      const indisponible = fermeDimanche || lundiAConfirmer;
      const libelleJour = dateLocale(jour, { weekday: 'long' });
      const libelleDate = dateLocale(jour, { day: 'numeric', month: 'short' }).replace('.', '');
      const nomEtat = fermeDimanche ? 'Fermé' : lundiAConfirmer ? 'À confirmer' : rang === 0 ? 'Aujourd’hui' : '';
      const etiquette = `${libelleJour} ${dateLocale(jour, { day: 'numeric', month: 'long' })}${fermeDimanche ? ' : fermé' : lundiAConfirmer ? ' : ouverture à confirmer' : ''}`;

      const label = document.createElement('label');
      label.className = 'date-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'jour';
      radio.value = dateISO;
      radio.disabled = indisponible;
      radio.setAttribute('aria-label', etiquette);
      const jourSpan = document.createElement('span');
      jourSpan.className = 'date-option__jour';
      jourSpan.textContent = libelleJour;
      const dateSpan = document.createElement('span');
      dateSpan.className = 'date-option__date';
      dateSpan.textContent = libelleDate;
      const etatSpan = document.createElement('span');
      etatSpan.className = 'date-option__etat';
      etatSpan.textContent = nomEtat;
      label.append(radio, jourSpan, dateSpan, etatSpan);
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        selection.jour = dateISO;
        selection.heure = '';
        construireHeures();
        actualiserResume();
        if (annonce) annonce.textContent = `Jour choisi : ${libelleJour} ${dateLocale(jour, { day: 'numeric', month: 'long' })}.`;
      });
      zoneDates.append(label);
    }
  }

  function construireHeures() {
    zoneHeures.replaceChildren();
    const jour = dateChoisie();
    const prestation = prestationChoisie();
    if (!jour || !prestation) return;
    const maintenant = new Date();
    const aujourdHui = dateLocaleISO(jour) === dateLocaleISO(maintenant);
    const minutesMaintenant = maintenant.getHours() * 60 + maintenant.getMinutes();
    const graine = jour.getDate() + (jour.getMonth() + 1) * 31;
    const prises = new Set([(graine % 14) + 1, ((graine * 3) % 15) + 3, ((graine * 5) % 16) + 5]);
    let rang = 0;

    for (let minutes = 8 * 60; minutes < 19 * 60; minutes += 30) {
      const passe = aujourdHui && minutes <= minutesMaintenant;
      const dejaPris = prises.has(rang);
      const texteHeure = heureTexte(minutes);
      const label = document.createElement('label');
      label.className = 'time-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'heure';
      radio.value = texteHeure;
      radio.disabled = passe || dejaPris;
      radio.setAttribute('aria-label', `${texteHeure}${passe ? ', créneau passé' : dejaPris ? ', déjà pris' : ''}`);
      const heure = document.createElement('span');
      heure.textContent = texteHeure;
      const etat = document.createElement('span');
      etat.className = 'time-option__etat';
      etat.textContent = passe ? 'Passé' : dejaPris ? 'Déjà pris' : '';
      label.append(radio, heure, etat);
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        selection.heure = texteHeure;
        actualiserResume();
        if (annonce) annonce.textContent = `Heure choisie : ${texteHeure}.`;
      });
      zoneHeures.append(label);
      rang += 1;
    }
  }

  document.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      selection.prestation = radio.value;
      selection.heure = '';
      if (selection.jour) construireHeures();
      actualiserResume();
      if (annonce) annonce.textContent = `Prestation choisie : ${offres[radio.value].nom}.`;
    });
  });

  document.querySelectorAll('[data-prestation]').forEach((lien) => {
    lien.addEventListener('click', () => {
      const valeur = lien.dataset.prestation;
      const radio = document.querySelector(`input[name="prestation"][value="${valeur}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  document.querySelectorAll('[data-suite]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (etapeCourante === 1 && !selection.prestation) {
        annonce.textContent = 'Choisissez une prestation avant de continuer.';
        document.querySelector('input[name="prestation"]')?.focus();
        return;
      }
      if (etapeCourante === 2 && !selection.jour) {
        annonce.textContent = 'Choisissez un jour ouvert avant de continuer.';
        zoneDates.querySelector('input:not(:disabled)')?.focus();
        return;
      }
      if (etapeCourante === 3 && !selection.heure) {
        annonce.textContent = 'Choisissez une heure disponible avant de continuer.';
        zoneHeures.querySelector('input:not(:disabled)')?.focus();
        return;
      }
      if (etapeCourante < 4) afficherEtape(etapeCourante + 1);
    });
  });

  document.querySelectorAll('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(etapeCourante - 1));
  });

  modifierBoutons.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const numero = Number(bouton.dataset.modifier);
      if (!bouton.disabled) afficherEtape(numero);
    });
  });

  function afficherErreur(champ, zone, message) {
    zone.textContent = message;
    champ.setAttribute('aria-invalid', 'true');
    champ.focus();
    annonce.textContent = message;
  }

  function effacerErreur(champ, zone) {
    zone.textContent = '';
    champ.removeAttribute('aria-invalid');
  }

  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const erreurPrenom = document.querySelector('#erreur-prenom');
  const erreurTelephone = document.querySelector('#erreur-telephone');
  champPrenom?.addEventListener('input', () => effacerErreur(champPrenom, erreurPrenom));
  champTelephone?.addEventListener('input', () => effacerErreur(champTelephone, erreurTelephone));

  formulaire?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const telephoneValide = /^(?:(?:\+33|0033)[67]|0[67])(?:[\s.-]?\d{2}){4}$/.test(telephone);
    if (prenom.length < 2) {
      afficherErreur(champPrenom, erreurPrenom, 'Indiquez un prénom d’au moins deux lettres.');
      return;
    }
    if (!telephoneValide) {
      afficherErreur(champTelephone, erreurTelephone, 'Indiquez un numéro de mobile français valide.');
      return;
    }

    const boutonConfirmation = formulaire.querySelector('button[type="submit"]');
    boutonConfirmation.disabled = true;
    const prestation = prestationChoisie();
    const jour = dateChoisie();
    messageConfirmation.textContent = `${prenom}, votre sélection porte sur ${prestation.nom}, le ${dateLocale(jour, { weekday: 'long', day: 'numeric', month: 'long' })} à ${selection.heure}.`;
    const etapeActuelle = zonesEtapes.find((element) => Number(element.dataset.etape) === 4);
    etapeActuelle.inert = true;
    if (!prefersReducedMotion.matches && typeof etapeActuelle.animate === 'function') {
      const sortie = etapeActuelle.animate(
        [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-5px)' }],
        { duration: 150, easing: 'cubic-bezier(.23, 1, .32, 1)', fill: 'forwards' }
      );
      await sortie.finished.catch(() => {});
    }
    etapeActuelle.hidden = true;
    etapeActuelle.inert = false;
    zoneSucces.hidden = false;
    if (!prefersReducedMotion.matches && typeof zoneSucces.animate === 'function') {
      zoneSucces.animate(
        [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 150, easing: 'cubic-bezier(.23, 1, .32, 1)' }
      );
    }
    annonce.textContent = 'Simulation terminée. Aucune réservation ni donnée n’a été envoyée.';
    zoneSucces.querySelector('h3')?.focus({ preventScroll: true });
  });

  document.querySelector('#recommencer')?.addEventListener('click', async () => {
    formulaire?.reset();
    const boutonConfirmation = formulaire?.querySelector('button[type="submit"]');
    if (boutonConfirmation) boutonConfirmation.disabled = false;
    document.querySelectorAll('input[name="prestation"]').forEach((radio) => { radio.checked = false; });
    selection.prestation = '';
    selection.jour = '';
    selection.heure = '';
    effacerErreur(champPrenom, erreurPrenom);
    effacerErreur(champTelephone, erreurTelephone);
    actualiserResume();
    construireJours();
    zoneHeures.replaceChildren();
    zoneSucces.hidden = true;
    etapeCourante = 4;
    await afficherEtape(1);
  });

  construireJours();
  actualiserResume();
})();
