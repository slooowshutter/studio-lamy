(() => {
  const RACINE = document.documentElement;
  RACINE.classList.add('js');

  const SERVICES = {
    'demi-1-4': { nom: 'Tresses collées · demi-tête · 1 à 4', resume: 'Demi-tête · 1 à 4 tresses', duree: 30, prix: 48 },
    'demi-4-9': { nom: 'Tresses collées · demi-tête · 4 à 9', resume: 'Demi-tête · 4 à 9 tresses', duree: 60, prix: 58 },
    'entiere-1-4': { nom: 'Tresses collées · tête entière · 1 à 4', resume: 'Tête entière · 1 à 4 tresses', duree: 60, prix: 68 },
    'entiere-4-9': { nom: 'Tresses collées · tête entière · 4 à 9', resume: 'Tête entière · 4 à 9 tresses', duree: 60, prix: 78 },
    'coupe-homme': { nom: 'Forfait coupe homme', resume: 'Forfait coupe homme', duree: 30, prix: 28 },
    barbe: { nom: 'Forfait barbe', resume: 'Forfait barbe', duree: 30, prix: 19 },
    'coupe-barbe': { nom: 'Coupe + barbe', resume: 'Coupe + barbe', duree: 60, prix: 43 }
  };

  const HORAIRES = {
    0: null,
    1: null,
    2: { debut: 600, fin: 1200 },
    3: { debut: 600, fin: 1200 },
    4: { debut: 600, fin: 1200 },
    5: { debut: 600, fin: 1200 },
    6: { debut: 600, fin: 1080 }
  };

  const FORMATEUR_DATE = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
  });
  const FORMATEUR_COURT = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short'
  });
  const FORMATEUR_PARIS = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function extraire(parts) {
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function dateParis(offset = 0) {
    const parts = extraire(new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()));
    return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + offset, 12));
  }

  function cleDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function minutesEnHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${heures}\u00a0h${reste ? `\u00a0${String(reste).padStart(2, '0')}` : ''}`;
  }

  function formaterPrix(prix) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prix);
  }

  function afficherEtatHoraires() {
    const zone = document.querySelector('#etat-horaires');
    if (!zone) return;
    const maintenant = extraire(FORMATEUR_PARIS.formatToParts(new Date()));
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const indexJour = jours.indexOf(maintenant.weekday.toLocaleLowerCase('fr-FR'));
    const minuteActuelle = Number(maintenant.hour) * 60 + Number(maintenant.minute);
    const horaireDuJour = HORAIRES[indexJour];
    if (horaireDuJour && minuteActuelle >= horaireDuJour.debut && minuteActuelle < horaireDuJour.fin) {
      zone.textContent = `Ouvert aujourd’hui jusqu’à ${minutesEnHeure(horaireDuJour.fin)}.`;
      return;
    }
    if (horaireDuJour && minuteActuelle < horaireDuJour.debut) {
      zone.textContent = `Ouvre aujourd’hui à ${minutesEnHeure(horaireDuJour.debut)}.`;
      return;
    }
    for (let decalage = 1; decalage <= 7; decalage += 1) {
      const date = dateParis(decalage);
      const horaire = HORAIRES[date.getUTCDay()];
      if (!horaire) continue;
      const jour = FORMATEUR_DATE.format(date);
      zone.textContent = `Fermé actuellement · ouvre ${jour} à ${minutesEnHeure(horaire.debut)}.`;
      return;
    }
    zone.textContent = 'Consultez les horaires affichés ci-dessous.';
  }

  function lancerEntree() {
    const elements = document.querySelectorAll('.accueil .arrivee');
    requestAnimationFrame(() => {
      elements.forEach((element) => element.classList.add('est-entree'));
    });
  }

  function gererRevelations() {
    const elements = document.querySelectorAll('.reveal, .section-nombre, .section-repere');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('est-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees, actif) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        const element = entree.target;
        if (element.classList.contains('reveal')) {
          const groupe = element.parentElement;
          const freres = [...groupe.querySelectorAll(':scope > .reveal')];
          const rang = Math.max(0, freres.indexOf(element));
          element.style.setProperty('--delai-revelation', `${Math.min(rang * 64, 192)}ms`);
        }
        element.classList.add('est-visible');
        actif.unobserve(element);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -4% 0px' });
    elements.forEach((element) => observateur.observe(element));
  }

  function gererNavigationMobile() {
    const bouton = document.querySelector('.bouton-navigation');
    const navigation = document.querySelector('#navigation-principale');
    if (!bouton || !navigation) return;

    function fermer(rendreFocus = false) {
      navigation.classList.remove('is-ouverte');
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', 'Ouvrir la navigation');
      bouton.textContent = 'Ouvrir';
      if (rendreFocus) bouton.focus();
    }

    bouton.addEventListener('click', () => {
      const ouverte = bouton.getAttribute('aria-expanded') === 'true';
      if (ouverte) {
        fermer();
        return;
      }
      navigation.classList.add('is-ouverte');
      bouton.setAttribute('aria-expanded', 'true');
      bouton.setAttribute('aria-label', 'Fermer la navigation');
      bouton.textContent = 'Fermer';
      navigation.querySelector('a')?.focus();
    });

    navigation.querySelectorAll('a').forEach((lien) => lien.addEventListener('click', () => fermer()));
    document.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && bouton.getAttribute('aria-expanded') === 'true') fermer(true);
    });
  }

  function gererBarreMobile() {
    const barre = document.querySelector('.barre-mobile');
    const cibles = [document.querySelector('#reserver'), document.querySelector('.pied-page')].filter(Boolean);
    if (!barre || !('IntersectionObserver' in window)) return;
    const visibles = new Set();
    barre.inert = false;
    barre.removeAttribute('aria-hidden');
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) visibles.add(entree.target);
        else visibles.delete(entree.target);
      });
      const cachee = visibles.size > 0;
      barre.classList.toggle('est-cachee', cachee);
      barre.inert = cachee;
      if (cachee) barre.setAttribute('aria-hidden', 'true');
      else barre.removeAttribute('aria-hidden');
    }, { threshold: 0.01, rootMargin: '-28% 0px -35% 0px' });
    cibles.forEach((cible) => observateur.observe(cible));
  }

  function preparerFaits() {
    const jourDeReference = dateParis(0);
    const cleDuJour = cleDate(jourDeReference);
    const zoneJours = document.querySelector('[data-choix-jours]');
    if (!zoneJours) return { cleDuJour };

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = dateParis(decalage);
      const jour = date.getUTCDay();
      const horaire = HORAIRES[jour];
      const details = extraire(FORMATEUR_COURT.formatToParts(date));
      const nomComplet = FORMATEUR_DATE.format(date);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bouton-jour';
      bouton.dataset.date = cleDate(date);
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-label', horaire
        ? `${nomComplet}\u00a0: ouvert de ${minutesEnHeure(horaire.debut)} à ${minutesEnHeure(horaire.fin)}`
        : `${nomComplet}\u00a0: fermé`);

      const jourCourt = document.createElement('span');
      jourCourt.textContent = details.weekday.replace('.', '');
      const numero = document.createElement('strong');
      numero.textContent = details.day;
      const mois = document.createElement('span');
      mois.textContent = details.month.replace('.', '');
      bouton.append(jourCourt, numero, mois);

      if (!horaire) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${nomComplet}\u00a0: fermé`);
        const etat = document.createElement('span');
        etat.textContent = 'Fermé';
        bouton.append(etat);
      }
      zoneJours.append(bouton);
    }
    return { cleDuJour };
  }

  const { cleDuJour } = preparerFaits();
  afficherEtatHoraires();
  lancerEntree();
  gererRevelations();
  gererNavigationMobile();
  gererBarreMobile();

  const formulaire = document.querySelector('#formulaire-reservation');
  if (!formulaire) return;

  const panneaux = [...formulaire.querySelectorAll('[data-etape]')];
  const navigationEtapes = [...document.querySelectorAll('[data-etape-lien]')];
  const liensModification = [...document.querySelectorAll('[data-modifier]')];
  const annonce = document.querySelector('[data-annonce-etape]');
  const resumeFinal = document.querySelector('[data-resume-final]');
  const zoneHeures = document.querySelector('[data-choix-heures]');
  const selectionJour = document.querySelector('[data-jour-selectionne]');
  const messageJour = document.querySelector('[data-erreur-jour]');
  const messageHeure = document.querySelector('[data-erreur-heure]');
  const confirmation = document.querySelector('#confirmation');
  const lienCalendrier = document.querySelector('[data-lien-calendrier]');
  let etapeActuelle = 1;
  let prestationChoisie = null;
  let dateChoisie = null;
  let heureChoisie = null;

  function afficherResume() {
    const service = prestationChoisie ? SERVICES[prestationChoisie] : null;
    document.querySelector('[data-resume="prestation"]').textContent = service ? service.resume : 'À choisir';
    document.querySelector('[data-resume="jour"]').textContent = dateChoisie ? dateChoisie.nom : 'À choisir';
    document.querySelector('[data-resume="heure"]').textContent = heureChoisie === null ? 'À choisir' : minutesEnHeure(heureChoisie);
    document.querySelector('[data-resume="tarif"]').textContent = service ? formaterPrix(service.prix) : '—';
    resumeFinal.textContent = service && dateChoisie && heureChoisie
      ? `${service.nom} · ${dateChoisie.nom} à ${minutesEnHeure(heureChoisie)} · ${formaterPrix(service.prix)}`
      : '';
  }

  function rafraichirAcces() {
    const datesOk = Boolean(prestationChoisie);
    const heuresOk = datesOk && Boolean(dateChoisie);
    const coordonneesOk = heuresOk && Boolean(heureChoisie);
    navigationEtapes.forEach((bouton) => {
      const cible = Number(bouton.dataset.etapeLien);
      const accessible = cible === 1 || (cible === 2 && datesOk) || (cible === 3 && heuresOk) || (cible === 4 && coordonneesOk);
      bouton.disabled = !accessible;
      if (cible === etapeActuelle) bouton.setAttribute('aria-current', 'true');
      else bouton.removeAttribute('aria-current');
    });
    liensModification.forEach((bouton) => {
      const cible = Number(bouton.dataset.modifier);
      bouton.disabled = cible === 1 ? !prestationChoisie : cible === 2 ? !dateChoisie : !heureChoisie;
    });
    const continuerPrestation = document.querySelector('[data-suivant="2"]');
    const continuerJour = document.querySelector('[data-suivant="3"]');
    const continuerHeure = document.querySelector('[data-suivant="4"]');
    if (continuerPrestation) continuerPrestation.disabled = !prestationChoisie;
    if (continuerJour) continuerJour.disabled = !dateChoisie;
    if (continuerHeure) continuerHeure.disabled = !heureChoisie;
  }

  function passerA(etape, annoncer = true) {
    const cible = Number(etape);
    if (cible < 1 || cible > 4) return;
    if (cible > 1 && !prestationChoisie) return;
    if (cible > 2 && !dateChoisie) return;
    if (cible > 3 && !heureChoisie) return;
    etapeActuelle = cible;
    panneaux.forEach((panneau) => {
      const actif = Number(panneau.dataset.etape) === cible;
      panneau.classList.remove('est-actif');
      panneau.hidden = !actif;
    });
    const panneau = panneaux.find((element) => Number(element.dataset.etape) === cible);
    requestAnimationFrame(() => panneau.classList.add('est-actif'));
    rafraichirAcces();
    afficherResume();
    if (cible === 3 && dateChoisie) construireHeures();
    if (annoncer && annonce) {
      const titres = ['prestation', 'jour', 'heure', 'coordonnées'];
      annonce.textContent = `Étape ${cible} sur 4\u00a0: ${titres[cible - 1]}.`;
    }
    panneau.querySelector('h3')?.focus();
  }

  function selectionnerDate(bouton) {
    dateChoisie = {
      cle: bouton.dataset.date,
      nom: FORMATEUR_DATE.format(new Date(`${bouton.dataset.date}T12:00:00Z`)),
      jour: new Date(`${bouton.dataset.date}T12:00:00Z`).getUTCDay()
    };
    heureChoisie = null;
    document.querySelectorAll('.bouton-jour').forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
    if (messageJour) messageJour.textContent = '';
    rafraichirAcces();
    afficherResume();
  }

  function construireHeures() {
    if (!zoneHeures || !dateChoisie || !prestationChoisie) return;
    zoneHeures.replaceChildren();
    const horaire = HORAIRES[dateChoisie.jour];
    const service = SERVICES[prestationChoisie];
    if (!horaire || !service) return;
    const maintenantParts = extraire(FORMATEUR_PARIS.formatToParts(new Date()));
    const maintenantEnMinutes = Number(maintenantParts.hour) * 60 + Number(maintenantParts.minute);
    const aujourdHui = dateChoisie.cle === cleDuJour;
    const totalJour = Number(dateChoisie.cle.replaceAll('-', ''));
    const codeService = Object.keys(SERVICES).indexOf(prestationChoisie);
    const hasard = ((totalJour * 9301 + (codeService + 1) * 49297) % 233280) / 233280;
    const totalCreneaux = Math.floor((horaire.fin - horaire.debut - service.duree) / 30) + 1;
    const creneauReserve = Math.floor(hasard * Math.max(totalCreneaux, 1));

    if (selectionJour) selectionJour.textContent = `Créneaux du ${dateChoisie.nom}.`;
    if (messageHeure) messageHeure.textContent = '';

    for (let debut = horaire.debut, rang = 0; debut + service.duree <= horaire.fin; debut += 30, rang += 1) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bouton-heure';
      bouton.textContent = minutesEnHeure(debut);
      bouton.setAttribute('aria-pressed', 'false');
      const passe = aujourdHui && debut <= maintenantEnMinutes;
      const reserve = rang === creneauReserve && !passe;
      if (passe || reserve) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${minutesEnHeure(debut)}\u00a0: ${passe ? 'heure passée' : 'déjà réservé dans cette simulation'}`);
        const etat = document.createElement('small');
        etat.textContent = passe ? 'Passé' : 'Déjà réservé';
        bouton.append(etat);
      }
      bouton.dataset.heure = String(debut);
      zoneHeures.append(bouton);
    }
    const disponibles = [...zoneHeures.querySelectorAll('button:not(:disabled)')];
    if (disponibles.length === 0 && selectionJour) {
      selectionJour.textContent = `Aucun créneau restant le ${dateChoisie.nom}. Choisissez un autre jour.`;
    }
  }

  function obtenirTelephoneValide(valeur) {
    const compact = valeur.replace(/[\s().-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }

  function afficherErreur(champ, texte) {
    const zone = document.querySelector(`#erreur-${champ}`);
    const entree = document.querySelector(`#${champ}`);
    if (!zone || !entree) return;
    zone.textContent = texte;
    entree.setAttribute('aria-invalid', 'true');
  }

  function effacerErreur(champ) {
    const zone = document.querySelector(`#erreur-${champ}`);
    const entree = document.querySelector(`#${champ}`);
    if (!zone || !entree) return;
    zone.textContent = '';
    entree.removeAttribute('aria-invalid');
  }

  function dateParisEnUtc(cle, minute) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    const heure = Math.floor(minute / 60);
    const minuteReste = minute % 60;
    let utc = Date.UTC(annee, mois - 1, jour, heure, minuteReste);
    for (let essai = 0; essai < 2; essai += 1) {
      const parts = extraire(new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date(utc)));
      const valeurParis = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      utc += Date.UTC(annee, mois - 1, jour, heure, minuteReste) - valeurParis;
    }
    return new Date(utc);
  }

  function horodateUtc(date) {
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}00Z`;
  }

  function echapperCalendrier(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function creerLienCalendrier() {
    if (!lienCalendrier || !dateChoisie || !heureChoisie || !prestationChoisie) return;
    const debut = dateParisEnUtc(dateChoisie.cle, heureChoisie);
    const fin = new Date(debut.getTime() + SERVICES[prestationChoisie].duree * 60_000);
    const identifiant = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const contenu = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio Lamy//Apercu Histoire d’Homme//FR',
      'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${identifiant}@preview.invalid`, `DTSTAMP:${horodateUtc(new Date())}`,
      `DTSTART:${horodateUtc(debut)}`, `DTEND:${horodateUtc(fin)}`,
      `SUMMARY:${echapperCalendrier(`Rendez-vous simulé — Histoire d’Homme · ${SERVICES[prestationChoisie].resume}`)}`,
      `DESCRIPTION:${echapperCalendrier('Rendez-vous de démonstration. Aucune réservation réelle n’a été envoyée.')}`,
      `LOCATION:${echapperCalendrier('9/9 bis, rue d’Inkermann, 59000 Lille')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const fichier = new Blob([`\uFEFF${contenu}`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(fichier);
    if (lienCalendrier.dataset.urlPrecedente) URL.revokeObjectURL(lienCalendrier.dataset.urlPrecedente);
    lienCalendrier.href = url;
    lienCalendrier.download = 'rendez-vous-simule-histoire-d-homme.ics';
    lienCalendrier.dataset.urlPrecedente = url;
  }

  document.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      prestationChoisie = radio.value;
      dateChoisie = null;
      heureChoisie = null;
      document.querySelectorAll('.bouton-jour').forEach((bouton) => bouton.setAttribute('aria-pressed', 'false'));
      afficherResume();
      rafraichirAcces();
    });
  });

  document.querySelectorAll('[data-choisir]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const radio = document.querySelector(`input[name="prestation"][value="${bouton.dataset.choisir}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      passerA(2);
    });
  });

  document.querySelectorAll('.bouton-jour').forEach((bouton) => {
    bouton.addEventListener('click', () => selectionnerDate(bouton));
  });

  zoneHeures?.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('.bouton-heure');
    if (!bouton || bouton.disabled) return;
    heureChoisie = Number(bouton.dataset.heure);
    zoneHeures.querySelectorAll('.bouton-heure').forEach((element) => element.setAttribute('aria-pressed', String(element === bouton)));
    afficherResume();
    rafraichirAcces();
  });

  document.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const prochaine = Number(bouton.dataset.suivant);
      if (prochaine === 3) {
        if (!dateChoisie) {
          if (messageJour) messageJour.textContent = 'Choisissez un jour pour continuer.';
          return;
        }
        construireHeures();
      }
      passerA(prochaine);
    });
  });

  document.querySelectorAll('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => passerA(Number(bouton.dataset.retour)));
  });

  [...navigationEtapes, ...liensModification].forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const etape = bouton.dataset.etapeLien ?? bouton.dataset.modifier;
      passerA(Number(etape));
    });
  });

  ['prenom', 'telephone'].forEach((champ) => {
    document.querySelector(`#${champ}`)?.addEventListener('input', () => effacerErreur(champ));
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = document.querySelector('#prenom');
    const telephone = document.querySelector('#telephone');
    let valide = true;
    effacerErreur('prenom');
    effacerErreur('telephone');
    if (!prenom.value.trim()) {
      afficherErreur('prenom', 'Indiquez votre prénom.');
      prenom.focus();
      valide = false;
    }
    if (!obtenirTelephoneValide(telephone.value)) {
      afficherErreur('telephone', 'Indiquez un numéro mobile français valide, par exemple 06 12 34 56 78.');
      if (valide) telephone.focus();
      valide = false;
    }
    if (!valide || !prestationChoisie || !dateChoisie || !heureChoisie) return;

    const service = SERVICES[prestationChoisie];
    document.querySelector('[data-texte-confirmation]').textContent = `${prenom.value.trim()}, la maquette a noté ${service.nom.toLocaleLowerCase('fr-FR')} le ${dateChoisie.nom} à ${minutesEnHeure(heureChoisie)} · ${formaterPrix(service.prix)}.`;
    formulaire.hidden = true;
    confirmation.hidden = false;
    requestAnimationFrame(() => confirmation.classList.add('est-active'));
    navigationEtapes.forEach((bouton) => { bouton.disabled = true; });
    liensModification.forEach((bouton) => { bouton.disabled = true; });
    navigationEtapes.forEach((bouton) => {
      if (bouton.dataset.etapeLien === '4') bouton.setAttribute('aria-current', 'true');
      else bouton.removeAttribute('aria-current');
    });
    confirmation.querySelector('h3')?.focus();
    if (annonce) annonce.textContent = 'La simulation est terminée. Aucune réservation n’a été transmise.';
    creerLienCalendrier();
  });

  rafraichirAcces();
  afficherResume();
})();
