const racine = document.documentElement;
racine.classList.add('js');
requestAnimationFrame(() => racine.classList.add('hero-ready'));

const boutonsMenu = document.querySelector('.bouton-menu');
const navigation = document.querySelector('#navigation-principale');

function fermerNavigation(rendreFocus = false) {
  if (!boutonsMenu || !navigation) return;
  boutonsMenu.setAttribute('aria-expanded', 'false');
  boutonsMenu.setAttribute('aria-label', 'Ouvrir la navigation');
  navigation.classList.remove('est-ouverte');
  if (rendreFocus) boutonsMenu.focus();
}

if (boutonsMenu && navigation) {
  boutonsMenu.addEventListener('click', () => {
    const estOuverte = boutonsMenu.getAttribute('aria-expanded') === 'true';
    boutonsMenu.setAttribute('aria-expanded', String(!estOuverte));
    boutonsMenu.setAttribute('aria-label', estOuverte ? 'Ouvrir la navigation' : 'Fermer la navigation');
    navigation.classList.toggle('est-ouverte', !estOuverte);
    if (!estOuverte) navigation.querySelector('a')?.focus();
  });

  navigation.addEventListener('click', (événement) => {
    const lien = événement.target.closest('a[href^="#"]');
    if (lien && window.matchMedia('(max-width: 760px)').matches) {
      fermerNavigation();
      const cible = document.querySelector(lien.getAttribute('href'));
      const titre = cible?.querySelector('h1, h2') || cible;
      if (titre) {
        titre.setAttribute('tabindex', '-1');
        requestAnimationFrame(() => titre.focus({ preventScroll: true }));
      }
    }
  });

  document.addEventListener('keydown', (événement) => {
    if (événement.key === 'Escape' && boutonsMenu.getAttribute('aria-expanded') === 'true') {
      fermerNavigation(true);
    }
  });
}

const élémentsÀRévéler = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const observateurRévélation = new IntersectionObserver((entrées, observateur) => {
    entrées.forEach((entrée) => {
      if (!entrée.isIntersecting) return;
      entrée.target.classList.add('is-visible');
      observateur.unobserve(entrée.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  élémentsÀRévéler.forEach((élément) => observateurRévélation.observe(élément));
} else {
  élémentsÀRévéler.forEach((élément) => élément.classList.add('is-visible'));
}

const barreMobile = document.querySelector('.barre-mobile');
const sectionAccueil = document.querySelector('#accueil');
const sectionRéservation = document.querySelector('#rendez-vous');
const piedDePage = document.querySelector('.pied-de-page');
if (barreMobile && sectionAccueil && sectionRéservation && piedDePage && 'IntersectionObserver' in window) {
  const visibilités = { accueil: true, réservation: false, pied: false };
  const observateurBarre = new IntersectionObserver((entrées) => {
    entrées.forEach((entrée) => {
      if (entrée.target === sectionAccueil) visibilités.accueil = entrée.isIntersecting;
      if (entrée.target === sectionRéservation) visibilités.réservation = entrée.isIntersecting;
      if (entrée.target === piedDePage) visibilités.pied = entrée.isIntersecting;
    });
    const afficher = !visibilités.accueil && !visibilités.réservation && !visibilités.pied;
    barreMobile.classList.toggle('est-visible', afficher && window.matchMedia('(max-width: 760px)').matches);
  }, { threshold: 0.08 });
  observateurBarre.observe(sectionAccueil);
  observateurBarre.observe(sectionRéservation);
  observateurBarre.observe(piedDePage);
  window.addEventListener('resize', () => {
    const afficher = !visibilités.accueil && !visibilités.réservation && !visibilités.pied;
    barreMobile.classList.toggle('est-visible', afficher && window.matchMedia('(max-width: 760px)').matches);
  }, { passive: true });
}

const formulaire = document.querySelector('#formulaire-réservation');
if (formulaire) {
  const étapes = [...formulaire.querySelectorAll('.étape-formulaire')];
  const progression = [...formulaire.querySelectorAll('[data-aller-etape]')];
  const choixJours = document.querySelector('#choix-jours');
  const choixHeures = document.querySelector('#choix-heures');
  const annonce = document.createElement('p');
  annonce.className = 'visuellement-masqué';
  annonce.setAttribute('aria-live', 'polite');
  annonce.setAttribute('aria-atomic', 'true');
  annonce.id = 'annonce-réservation';
  formulaire.prepend(annonce);

  const récapPrestation = document.querySelector('#récap-prestation');
  const récapJour = document.querySelector('#récap-jour');
  const récapHeure = document.querySelector('#récap-heure');
  const champPrénom = document.querySelector('#prénom');
  const champTéléphone = document.querySelector('#téléphone');
  const confirmation = document.querySelector('#confirmation');
  const boutonRecommencer = document.querySelector('#recommencer');
  const formatTéléphoneMobile = /^(?:(?:\+33|0033)[\s.-]?|0)[67](?:[\s.-]?\d{2}){4}$/;
  let étapeActive = 0;
  let jourChoisi = null;
  let heureChoisie = null;
  let changementEnCours = false;

  const horairesPubliés = {
    2: { début: 9, fin: 19 },
    3: { début: 9, fin: 19 },
    4: { début: 10, fin: 20 },
    5: { début: 10, fin: 20 },
    6: { début: 9, fin: 18 }
  };

  function dateDeTours() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(new Date());
    const valeur = (type) => Number(parties.find((partie) => partie.type === type)?.value);
    return new Date(Date.UTC(valeur('year'), valeur('month') - 1, valeur('day'), 12));
  }

  function heureDeTours() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeur = (type) => Number(parties.find((partie) => partie.type === type)?.value);
    return valeur('hour') * 60 + valeur('minute');
  }

  function jourLong(date) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris'
    }).format(date);
  }

  function construireJours() {
    const premierJour = dateDeTours();
    choixJours.replaceChildren();
    for (let rang = 0; rang < 14; rang += 1) {
      const date = new Date(premierJour);
      date.setUTCDate(premierJour.getUTCDate() + rang);
      const horaires = horairesPubliés[date.getUTCDay()];
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.jour = String(date.getTime());
      bouton.disabled = !horaires;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${jourLong(date)}${horaires ? '' : ', fermé selon les horaires publiés'}`);

      const nomJour = document.createElement('span');
      nomJour.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'Europe/Paris' }).format(date).replace(/\.$/, '');
      const numéroJour = document.createElement('span');
      numéroJour.textContent = String(date.getUTCDate());
      bouton.append(nomJour, numéroJour);
      if (!horaires) {
        const étatFermé = document.createElement('span');
        étatFermé.textContent = 'Fermé';
        bouton.append(étatFermé);
      }

      bouton.addEventListener('click', () => {
        if (!horaires) return;
        jourChoisi = date;
        heureChoisie = null;
        choixJours.querySelectorAll('button').forEach((élément) => {
          élément.setAttribute('aria-pressed', String(élément === bouton));
        });
        récapJour.textContent = jourLong(date);
        récapHeure.textContent = 'À choisir';
        document.querySelector('#erreur-jour').textContent = '';
        construireHeures(horaires, date);
        actualiserProgression();
        annoncer(`Jour choisi : ${jourLong(date)}.`);
      });
      choixJours.append(bouton);
    }
  }

  function construireHeures(horaires, date) {
    choixHeures.replaceChildren();
    const minutesMaintenant = heureDeTours();
    const estAujourdHui = date.toISOString().slice(0, 10) === dateDeTours().toISOString().slice(0, 10);
    let nombreÀVenir = 0;
    for (let heure = horaires.début; heure < horaires.fin; heure += 1) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      const heureAffichée = `${String(heure).padStart(2, '0')} h`;
      const heureTexte = document.createElement('span');
      heureTexte.textContent = heureAffichée;
      const estPassée = estAujourdHui && heure * 60 < minutesMaintenant;
      bouton.disabled = estPassée;
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', `${String(heure).padStart(2, '0')} heures${estPassée ? ', heure passée' : ', créneau simulé'}`);
      bouton.append(heureTexte);
      if (estPassée) {
        const étatPassé = document.createElement('span');
        étatPassé.textContent = 'Passée';
        bouton.append(étatPassé);
      } else nombreÀVenir += 1;
      bouton.addEventListener('click', () => {
        if (bouton.disabled) return;
        heureChoisie = heure;
        choixHeures.querySelectorAll('button').forEach((élément) => {
          élément.setAttribute('aria-pressed', String(élément === bouton));
        });
        récapHeure.textContent = heureAffichée;
        document.querySelector('#erreur-heure').textContent = '';
        actualiserProgression();
        annoncer(`Heure simulée choisie : ${heureAffichée}.`);
      });
      choixHeures.append(bouton);
    }
    if (nombreÀVenir === 0) {
      const note = document.createElement('p');
      note.className = 'note-source';
      note.textContent = 'Aucun créneau simulé restant aujourd’hui. Choisissez un autre jour.';
      choixHeures.append(note);
    }
  }

  function annoncer(message) {
    annonce.textContent = '';
    window.setTimeout(() => { annonce.textContent = message; }, 25);
  }

  function prestationActuelle() {
    return formulaire.querySelector('input[name="prestation"]:checked')?.value || '';
  }

  function mettreÀJourRécapitulatif() {
    récapPrestation.textContent = prestationActuelle() || 'À choisir';
  }

  function validerÉtape(index) {
    if (index === 0 && !prestationActuelle()) {
      document.querySelector('#erreur-prestation').textContent = 'Choisissez une prestation pour poursuivre.';
      formulaire.querySelector('input[name="prestation"]')?.focus();
      return false;
    }
    if (index === 1 && !jourChoisi) {
      document.querySelector('#erreur-jour').textContent = 'Choisissez un jour ouvert pour poursuivre.';
      choixJours.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    if (index === 2 && heureChoisie === null) {
      document.querySelector('#erreur-heure').textContent = 'Choisissez une heure simulée pour poursuivre.';
      choixHeures.querySelector('button:not(:disabled)')?.focus();
      return false;
    }
    return true;
  }

  function actualiserProgression() {
    progression.forEach((bouton, rang) => {
      bouton.classList.toggle('est-active', rang === étapeActive);
      if (rang === étapeActive) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      if (rang === 0) bouton.disabled = false;
      if (rang === 1) bouton.disabled = !prestationActuelle();
      if (rang === 2) bouton.disabled = !prestationActuelle() || !jourChoisi;
      if (rang === 3) bouton.disabled = !prestationActuelle() || !jourChoisi || heureChoisie === null;
    });
  }

  function afficherÉtape(rang) {
    if (changementEnCours || rang === étapeActive || rang < 0 || rang >= étapes.length) return;
    if (rang > étapeActive && !validerÉtape(étapeActive)) return;
    changementEnCours = true;
    const ancienneÉtape = étapes[étapeActive];
    const nouvelleÉtape = étapes[rang];
    ancienneÉtape.classList.remove('est-visible', 'est-entrée');
    ancienneÉtape.classList.add('est-sortie');
    const durée = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    window.setTimeout(() => {
      ancienneÉtape.hidden = true;
      ancienneÉtape.classList.remove('est-sortie');
      nouvelleÉtape.hidden = false;
      nouvelleÉtape.classList.add('est-entrée');
      nouvelleÉtape.offsetWidth;
      requestAnimationFrame(() => {
        nouvelleÉtape.classList.remove('est-entrée');
        nouvelleÉtape.classList.add('est-visible');
      });
      étapeActive = rang;
      actualiserProgression();
      nouvelleÉtape.querySelector('h3')?.focus();
      annoncer(`Étape ${rang + 1} sur 4 : ${nouvelleÉtape.querySelector('h3')?.textContent || ''}.`);
      window.setTimeout(() => { changementEnCours = false; }, durée);
    }, durée);
  }

  formulaire.querySelectorAll('input[name="prestation"]').forEach((entrée) => {
    entrée.addEventListener('change', () => {
      document.querySelector('#erreur-prestation').textContent = '';
      mettreÀJourRécapitulatif();
      actualiserProgression();
    });
  });

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherÉtape(étapeActive + 1));
  });

  formulaire.querySelectorAll('[data-précédent]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherÉtape(étapeActive - 1));
  });

  progression.forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!bouton.disabled) afficherÉtape(Number(bouton.dataset.allerEtape));
    });
  });

  function contrôlerCoordonnée(champ, erreur, message) {
    const invalide = !champ.value.trim();
    champ.setAttribute('aria-invalid', String(invalide));
    erreur.textContent = invalide ? message : '';
    return !invalide;
  }

  champPrénom.addEventListener('input', () => {
    if (champPrénom.value.trim()) {
      champPrénom.setAttribute('aria-invalid', 'false');
      document.querySelector('#erreur-prénom').textContent = '';
    }
  });

  function validerTéléphone(afficherErreur = false) {
    const valide = formatTéléphoneMobile.test(champTéléphone.value.trim());
    const erreur = document.querySelector('#erreur-téléphone');
    if (valide) {
      champTéléphone.setAttribute('aria-invalid', 'false');
      erreur.textContent = '';
    } else if (afficherErreur) {
      champTéléphone.setAttribute('aria-invalid', 'true');
      erreur.textContent = 'Saisissez un numéro de mobile français valide.';
    } else {
      champTéléphone.removeAttribute('aria-invalid');
      erreur.textContent = '';
    }
    return valide;
  }

  champTéléphone.addEventListener('input', () => {
    if (champTéléphone.getAttribute('aria-invalid') === 'true') validerTéléphone(true);
  });

  formulaire.addEventListener('submit', (événement) => {
    événement.preventDefault();
    const prénomValide = contrôlerCoordonnée(champPrénom, document.querySelector('#erreur-prénom'), 'Saisissez votre prénom.');
    const téléphoneValide = validerTéléphone(true);
    if (!prénomValide) {
      champPrénom.focus();
      return;
    }
    if (!téléphoneValide) {
      champTéléphone.focus();
      return;
    }
    const texteConfirmation = document.querySelector('#texte-confirmation');
    texteConfirmation.textContent = `La simulation retient « ${prestationActuelle()} », le ${jourLong(jourChoisi)} à ${String(heureChoisie).padStart(2, '0')} h. Aucun rendez-vous n’a été pris et vos coordonnées n’ont pas été transmises.`;
    étapes[étapeActive].hidden = true;
    formulaire.querySelector('.progression').hidden = true;
    confirmation.hidden = false;
    document.querySelector('#titre-confirmation').focus();
    annoncer('Simulation terminée. Aucune demande n’a été envoyée.');
  });

  boutonRecommencer.addEventListener('click', () => {
    formulaire.reset();
    confirmation.hidden = true;
    formulaire.querySelector('.progression').hidden = false;
    étapes.forEach((étape, rang) => {
      étape.hidden = rang !== 0;
      étape.classList.remove('est-sortie', 'est-entrée', 'est-visible');
    });
    étapeActive = 0;
    jourChoisi = null;
    heureChoisie = null;
    récapJour.textContent = 'À choisir';
    récapHeure.textContent = 'À choisir';
    document.querySelectorAll('.erreur-champ').forEach((élément) => { élément.textContent = ''; });
    champPrénom.removeAttribute('aria-invalid');
    champTéléphone.removeAttribute('aria-invalid');
    construireJours();
    actualiserProgression();
    mettreÀJourRécapitulatif();
    étapes[0].querySelector('h3')?.focus();
    annoncer('La simulation a été réinitialisée.');
  });

  construireJours();
  actualiserProgression();
}
