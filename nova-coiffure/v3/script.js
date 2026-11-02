(() => {
  const pageHero = document.querySelector('.hero');
  const form = document.getElementById('formulaire-reservation');
  const bookingSteps = [...document.querySelectorAll('.etape-reservation')];
  const dateList = document.getElementById('choix-jours');
  const timeList = document.getElementById('choix-heures');
  const selectionService = document.getElementById('selection-prestation');
  const selectionDay = document.getElementById('selection-jour');
  const selectionTime = document.getElementById('selection-heure');
  const successPanel = document.getElementById('reussite-reservation');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const formatteurParis = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  let adresseAgenda = '';

  const state = {
    prestation: null,
    duree: 0,
    jour: null,
    heure: null,
    index: 0
  };

  const nomsEtapes = ['prestation', 'jour', 'heure', 'coordonnees'];
  function dateLocale(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'Europe/Paris' }).format(date);
  }

  function cleDate(date) {
    const morceaux = Object.fromEntries(formatteurParis.formatToParts(date).map(partie => [partie.type, partie.value]));
    return `${morceaux.year}-${morceaux.month}-${morceaux.day}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function jourChoisiTexte() {
    if (!state.jour) return 'Jour à choisir';
    const date = dateDepuisCle(state.jour);
    return dateLocale(date, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function heureChoisieTexte() {
    if (!state.heure) return 'Heure à choisir';
    const [heures, minutes] = state.heure.split(':');
    return `${Number(heures)} h ${minutes}`;
  }

  function majSelection() {
    selectionService.textContent = state.prestation || 'Prestation à choisir';
    selectionDay.textContent = jourChoisiTexte();
    selectionTime.textContent = heureChoisieTexte();
  }

  function afficherErreur(id, message) {
    const cible = document.getElementById(id);
    if (cible) cible.textContent = message;
  }

  function majAvancement(nomEtape) {
    document.querySelectorAll('.avancement [data-numero]').forEach((repere, index) => {
      repere.classList.toggle('etape-active', nomsEtapes[index] === nomEtape);
      if (nomsEtapes[index] === nomEtape) {
        repere.setAttribute('aria-current', 'step');
      } else {
        repere.removeAttribute('aria-current');
      }
    });
  }

  function afficherEtape(nomEtape, deplacerFocus = true) {
    const prochainIndex = nomsEtapes.indexOf(nomEtape);
    if (prochainIndex < 0 || prochainIndex === state.index) return;

    const precedente = bookingSteps[state.index];
    const suivante = bookingSteps[prochainIndex];
    state.index = prochainIndex;
    suivante.hidden = false;
    suivante.classList.add('entree-etape');
    if (deplacerFocus) suivante.querySelector('legend').focus({ preventScroll: true });
    majAvancement(nomEtape);

    requestAnimationFrame(() => {
      precedente.classList.add('sortie-etape');
      suivante.classList.remove('entree-etape');
    });

    window.setTimeout(() => {
      precedente.hidden = true;
      precedente.classList.remove('sortie-etape');
      if (nomEtape === 'coordonnees') majRecapitulatif();
      const limite = form.getBoundingClientRect().bottom;
      if (limite > window.innerHeight - 24 || form.getBoundingClientRect().top < 0) {
        form.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }, 250);
  }

  function creerJour(date) {
    const jourSemaine = date.getUTCDay();
    const dimanche = jourSemaine === 0;
    const cle = cleDate(date);
    const libelleLong = dateLocale(date, { weekday: 'long', day: 'numeric', month: 'long' });
    const libelleCourt = dateLocale(date, { weekday: 'short' }).replace('.', '');
    const label = document.createElement('label');
    label.className = 'choix-jour';
    label.setAttribute('aria-label', dimanche ? `${libelleLong}, fermé selon les horaires affichés` : libelleLong);

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'jour';
    radio.value = cle;
    radio.disabled = dimanche;
    radio.setAttribute('aria-label', label.getAttribute('aria-label'));

    const contenu = document.createElement('span');
    contenu.className = 'jour-texte';
    const jour = document.createElement('span');
    jour.textContent = dimanche ? 'Dim.' : `${libelleCourt}.`;
    const numero = document.createElement('strong');
    numero.textContent = String(date.getUTCDate());
    contenu.append(jour, numero);

    if (dimanche) {
      const fermeture = document.createElement('span');
      fermeture.className = 'jour-ferme';
      fermeture.textContent = 'Fermé';
      contenu.append(fermeture);
      label.classList.add('ferme');
    }

    label.append(radio, contenu);
    return label;
  }

  function creerJours() {
    const aujourdHui = Object.fromEntries(formatteurParis.formatToParts(new Date()).map(partie => [partie.type, partie.value]));
    const debut = new Date(Date.UTC(Number(aujourdHui.year), Number(aujourdHui.month) - 1, Number(aujourdHui.day), 12));
    dateList.replaceChildren();
    for (let index = 0; index < 14; index += 1) {
      const date = new Date(debut);
      date.setUTCDate(debut.getUTCDate() + index);
      dateList.append(creerJour(date));
    }
  }

  function graineStable(texte) {
    let graine = 17;
    for (const caractere of texte) {
      graine = (graine * 31 + caractere.charCodeAt(0)) % 104729;
    }
    return graine;
  }

  function formatHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const minute = String(minutes % 60).padStart(2, '0');
    return `${heures} h ${minute}`;
  }

  function creerHeures() {
    timeList.replaceChildren();
    if (!state.jour || !state.duree) return;

    const debutJournee = 9 * 60;
    const finJournee = 21 * 60;
    const maintenant = new Date();
    const estAujourdhui = cleDate(maintenant) === state.jour;
    const partiesActuelles = Object.fromEntries(formatteurParis.formatToParts(maintenant).map(partie => [partie.type, partie.value]));
    const minutesActuelles = Number(partiesActuelles.hour) * 60 + Number(partiesActuelles.minute);
    const candidats = [];

    for (let minute = debutJournee; minute + state.duree <= finJournee; minute += 30) {
      candidats.push(minute);
    }

    const futurs = candidats.filter(minute => !estAujourdhui || minute > minutesActuelles);
    const indexFuturs = new Map(futurs.map((minute, index) => [minute, index]));
    const graine = graineStable(`${state.jour}-${state.prestation}`);
    const pris = new Set();
    if (futurs.length > 5) {
      pris.add(graine % futurs.length);
      pris.add((graine + 5 + Math.floor(graine / 7)) % futurs.length);
    }

    candidats.forEach(minute => {
      const heure = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const dejaPasse = estAujourdhui && minute < minutesActuelles;
      const dejaPris = !dejaPasse && pris.has(indexFuturs.get(minute));
      const indisponible = dejaPasse || dejaPris;
      const label = document.createElement('label');
      label.className = 'choix-heure';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'heure';
      radio.value = heure;
      radio.disabled = indisponible;
      radio.setAttribute('aria-label', dejaPasse
        ? `${formatHeure(minute)}, heure déjà passée`
        : dejaPris
          ? `${formatHeure(minute)}, déjà pris dans cette simulation`
          : formatHeure(minute));

      const valeur = document.createElement('span');
      valeur.className = 'heure-texte';
      valeur.textContent = formatHeure(minute);
      label.append(radio, valeur);

      if (indisponible) {
        label.classList.add('indisponible');
        const etat = document.createElement('span');
        etat.className = 'etat-heure';
        etat.textContent = dejaPasse ? 'Déjà passé' : 'Déjà pris';
        label.append(etat);
      }
      timeList.append(label);
    });

    if (candidats.length === 0 || candidats.every(minute => estAujourdhui && minute < minutesActuelles)) {
      const message = document.createElement('p');
      message.className = 'a-confirmer';
      message.textContent = estAujourdhui
        ? 'Aucune heure ne reste aujourd’hui dans la plage affichée. Choisissez un autre jour.'
        : 'Aucune heure ne correspond à cette durée dans la plage affichée.';
      timeList.append(message);
    }
  }

  function validerAvant(nomEtape) {
    if (nomEtape === 'jour') {
      const choix = form.querySelector('input[name="prestation"]:checked');
      if (!choix) {
        afficherErreur('erreur-prestation', 'Choisissez une prestation pour continuer.');
        form.querySelector('input[name="prestation"]')?.focus();
        return false;
      }
      state.prestation = choix.value;
      state.duree = Number(choix.dataset.duree);
      afficherErreur('erreur-prestation', '');
      majSelection();
      return true;
    }
    if (nomEtape === 'heure') {
      if (!state.jour) {
        afficherErreur('erreur-jour', 'Choisissez un jour pour continuer.');
        form.querySelector('input[name="jour"]:not(:disabled)')?.focus();
        return false;
      }
      return true;
    }
    if (nomEtape === 'coordonnees') {
      if (!state.heure) {
        afficherErreur('erreur-heure', 'Choisissez une heure pour continuer.');
        form.querySelector('input[name="heure"]:not(:disabled)')?.focus();
        return false;
      }
      afficherErreur('erreur-heure', '');
      majRecapitulatif();
      return true;
    }
    return true;
  }

  function majRecapitulatif() {
    document.getElementById('recap-avant').textContent = `${state.prestation || 'Prestation à choisir'} · ${jourChoisiTexte()} · ${heureChoisieTexte()}`;
  }

  function telephoneValide(telephone) {
    const chiffres = telephone.replace(/\D/g, '');
    const national = chiffres.startsWith('33') && chiffres.length === 11 ? `0${chiffres.slice(2)}` : chiffres;
    return /^0[67]\d{8}$/.test(national);
  }

  function nettoyerTexteAgenda(texte) {
    return texte.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function creerFichierAgenda(prenom) {
    const [annee, mois, jour] = state.jour.split('-').map(Number);
    const [heure, minute] = state.heure.split(':').map(Number);
    const debut = `${String(annee).padStart(4, '0')}${String(mois).padStart(2, '0')}${String(jour).padStart(2, '0')}T${String(heure).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
    const finMinute = heure * 60 + minute + state.duree;
    const fin = `${String(annee).padStart(4, '0')}${String(mois).padStart(2, '0')}${String(jour).padStart(2, '0')}T${String(Math.floor(finMinute / 60)).padStart(2, '0')}${String(finMinute % 60).padStart(2, '0')}00`;
    const formatUtc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const uid = `${Date.now()}@nova-coiffure-apercu`;
    const lignes = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Studio Lamy//Nova Coiffure//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatUtc(new Date())}`,
      `DTSTART;TZID=Europe/Paris:${debut}`,
      `DTEND;TZID=Europe/Paris:${fin}`,
      `SUMMARY:${nettoyerTexteAgenda(`${state.prestation} — Nova Coiffure`)}`,
      `DESCRIPTION:${nettoyerTexteAgenda(`Simulation pour ${prenom}. Rien n’a été transmis au salon.`)}`,
      'LOCATION:6 rue Cail\\, 75010 Paris',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const fichier = new Blob([lignes.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    if (adresseAgenda) URL.revokeObjectURL(adresseAgenda);
    adresseAgenda = URL.createObjectURL(fichier);
    return adresseAgenda;
  }

  function terminerSimulation() {
    const prenom = document.getElementById('prenom');
    const telephone = document.getElementById('telephone-reservation');
    const message = document.getElementById('message-reussite');
    let valide = true;

    if (!prenom.value.trim()) {
      afficherErreur('erreur-prenom', 'Indiquez votre prénom pour continuer.');
      prenom.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      afficherErreur('erreur-prenom', '');
      prenom.removeAttribute('aria-invalid');
    }

    if (!telephoneValide(telephone.value.trim())) {
      afficherErreur('erreur-telephone', 'Saisissez un numéro mobile français valide.');
      telephone.setAttribute('aria-invalid', 'true');
      valide = false;
    } else {
      afficherErreur('erreur-telephone', '');
      telephone.removeAttribute('aria-invalid');
    }

    if (!valide) {
      (prenom.getAttribute('aria-invalid') ? prenom : telephone).focus();
      return;
    }

    const recap = `${state.prestation}, le ${jourChoisiTexte()} à ${heureChoisieTexte()}.`;
    message.textContent = `${prenom.value.trim()}, votre sélection : ${recap}`;
    document.getElementById('telecharger-agenda').href = creerFichierAgenda(prenom.value.trim());
    bookingSteps[state.index].hidden = true;
    successPanel.hidden = false;
    successPanel.querySelector('h3').focus({ preventScroll: true });
  }

  function recommencer() {
    form.reset();
    if (adresseAgenda) URL.revokeObjectURL(adresseAgenda);
    adresseAgenda = '';
    document.getElementById('telecharger-agenda').removeAttribute('href');
    state.prestation = null;
    state.duree = 0;
    state.jour = null;
    state.heure = null;
    state.index = 0;
    successPanel.hidden = true;
    bookingSteps.forEach((etape, index) => {
      etape.hidden = index !== 0;
      etape.classList.remove('sortie-etape', 'entree-etape');
    });
    document.getElementById('prenom').removeAttribute('aria-invalid');
    document.getElementById('telephone-reservation').removeAttribute('aria-invalid');
    ['erreur-prestation', 'erreur-jour', 'erreur-heure', 'erreur-prenom', 'erreur-telephone', 'erreur-coordonnees'].forEach(id => afficherErreur(id, ''));
    document.querySelectorAll('.avancement [data-numero]').forEach((repere, index) => {
      repere.classList.toggle('etape-active', index === 0);
      if (index === 0) repere.setAttribute('aria-current', 'step');
      else repere.removeAttribute('aria-current');
    });
    dateList.querySelectorAll('input').forEach(radio => { radio.checked = false; });
    timeList.replaceChildren();
    majSelection();
    bookingSteps[0].querySelector('legend').focus({ preventScroll: true });
  }

  function brancherReservation() {
    creerJours();
    majSelection();
    majAvancement('prestation');

    form.addEventListener('change', event => {
      if (event.target.name === 'prestation') {
        state.prestation = event.target.value;
        state.duree = Number(event.target.dataset.duree);
        state.heure = null;
        afficherErreur('erreur-prestation', '');
        if (state.jour) creerHeures();
        majSelection();
      }
      if (event.target.name === 'jour' && !event.target.disabled) {
        state.jour = event.target.value;
        state.heure = null;
        afficherErreur('erreur-jour', '');
        afficherErreur('erreur-heure', '');
        creerHeures();
        majSelection();
      }
      if (event.target.name === 'heure' && !event.target.disabled) {
        state.heure = event.target.value;
        afficherErreur('erreur-heure', '');
        majSelection();
      }
    });

    form.querySelectorAll('[data-suivant]').forEach(bouton => {
      bouton.addEventListener('click', () => {
        const suivant = bouton.dataset.suivant;
        if (!validerAvant(suivant)) return;
        afficherEtape(suivant);
      });
    });

    form.querySelectorAll('[data-precedent]').forEach(bouton => {
      bouton.addEventListener('click', () => afficherEtape(bouton.dataset.precedent));
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      terminerSimulation();
    });

    document.getElementById('recommencer').addEventListener('click', recommencer);

    document.querySelectorAll('[data-prestation]').forEach(lien => {
      lien.addEventListener('click', event => {
        const radio = form.querySelector(`input[name="prestation"][value="${CSS.escape(lien.dataset.prestation)}"]`);
        if (!radio) return;
        event.preventDefault();
        form.reset();
        if (adresseAgenda) URL.revokeObjectURL(adresseAgenda);
        adresseAgenda = '';
        document.getElementById('telecharger-agenda').removeAttribute('href');
        successPanel.hidden = true;
        state.index = 0;
        radio.checked = true;
        state.prestation = radio.value;
        state.duree = Number(radio.dataset.duree);
        state.jour = null;
        state.heure = null;
        bookingSteps.forEach((etape, index) => {
          etape.hidden = index !== 0;
          etape.classList.remove('sortie-etape', 'entree-etape');
        });
        ['erreur-prestation', 'erreur-jour', 'erreur-heure', 'erreur-prenom', 'erreur-telephone'].forEach(id => afficherErreur(id, ''));
        document.getElementById('prenom').removeAttribute('aria-invalid');
        document.getElementById('telephone-reservation').removeAttribute('aria-invalid');
        majAvancement('prestation');
        dateList.querySelectorAll('input').forEach(choix => { choix.checked = false; });
        timeList.replaceChildren();
        majSelection();
        afficherEtape('jour');
        document.getElementById('reserver').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }

  function brancherRevelations() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
      document.querySelectorAll('.ligne-animee').forEach(element => element.classList.add('visible'));
      return;
    }

    const observateur = new IntersectionObserver((entrees, actif) => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('visible');
        actif.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -28px 0px' });

    document.querySelectorAll('.reveal, .ligne-animee').forEach(element => observateur.observe(element));
  }

  function entreeInitiale() {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => pageHero.classList.add('entree-active'), 60);
    });
  }

  function preparerFormulaire() {
    form.addEventListener('input', event => {
      if (event.target.id === 'prenom' && event.target.value.trim()) {
        event.target.removeAttribute('aria-invalid');
        afficherErreur('erreur-prenom', '');
      }
      if (event.target.id === 'telephone-reservation' && telephoneValide(event.target.value.trim())) {
        event.target.removeAttribute('aria-invalid');
        afficherErreur('erreur-telephone', '');
      }
    });
  }

  brancherRevelations();
  entreeInitiale();
  brancherReservation();
  preparerFormulaire();
})();
