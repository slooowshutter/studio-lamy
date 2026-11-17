(() => {
  'use strict';

  const documentFr = document;
  const racine = documentFr.documentElement;
  racine.classList.add('js');

  const selecteur = (requete, parent = documentFr) => parent.querySelector(requete);
  const tous = (requete, parent = documentFr) => [...parent.querySelectorAll(requete)];
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Entrée du panneau et dévoilements différents selon le contenu. */
  const panneau = selecteur('.panneau');
  requestAnimationFrame(() => requestAnimationFrame(() => panneau?.classList.add('is-ready')));

  const sections = tous('[data-reveler]');
  if ('IntersectionObserver' in window) {
    const observateurSections = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('is-visible');
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '-16% 0px -58% 0px', threshold: 0 });
    sections.forEach((section) => observateurSections.observe(section));
  } else {
    sections.forEach((section) => section.classList.add('is-visible'));
  }

  /* Repère mobile et panneau fixe synchronisés aux sections de lecture. */
  const liensNavigation = tous('.panneau__lien');
  const indicateur = selecteur('.panneau__indicateur');
  const sectionsNavigation = liensNavigation.map((lien) => selecteur(lien.getAttribute('href'))).filter(Boolean);
  const mettreAJourNavigation = (index) => {
    const lienActif = liensNavigation[index];
    if (!lienActif || !indicateur) return;
    liensNavigation.forEach((lien, i) => {
      if (i === index) lien.setAttribute('aria-current', 'location');
      else lien.removeAttribute('aria-current');
    });
    if (window.matchMedia('(max-width: 60rem)').matches) {
      indicateur.style.transform = `translateX(${index * 100}%)`;
    } else {
      indicateur.style.transform = `translateY(${index * 40}px)`;
    }
  };
  if ('IntersectionObserver' in window && sectionsNavigation.length) {
    const observateurNavigation = new IntersectionObserver((entrees) => {
      const visibles = entrees.filter((entree) => entree.isIntersecting);
      if (!visibles.length) return;
      visibles.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const indice = sectionsNavigation.indexOf(visibles[0].target);
      if (indice >= 0) mettreAJourNavigation(indice);
    }, { rootMargin: '-26% 0px -60% 0px', threshold: 0 });
    sectionsNavigation.forEach((section) => observateurNavigation.observe(section));
  }
  window.addEventListener('resize', () => {
    const index = Math.max(0, liensNavigation.findIndex((lien) => lien.getAttribute('aria-current') === 'location'));
    mettreAJourNavigation(index);
  }, { passive: true });

  /* Réservation fictive, sans envoi réseau ni stockage. */
  const formulaire = selecteur('#formulaire');
  if (!formulaire) return;
  formulaire.hidden = false;
  const sansJavascript = selecteur('.reservation__sans-js');
  if (sansJavascript) sansJavascript.hidden = true;

  const prestations = [
    { id: 'lissage', nom: 'Lissage', categorie: 'spécialité citée dans une fiche publique' },
    { id: 'balayage', nom: 'Balayage', categorie: 'spécialité citée dans une fiche publique' }
  ];
  const heuresOuverture = { debut: 9 * 60, fin: 18 * 60 + 30 };
  const joursDeLaSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
  const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const dateLongue = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const etapes = tous('.etape-formulaire', formulaire);
  const boutonsEtape = tous('[data-aller]', formulaire);
  const annonce = selecteur('[data-annonce]', formulaire);
  const selection = selecteur('[data-selection]', formulaire);
  const etat = { etape: 1, maximum: 1, prestation: null, jour: null, heure: null };

  const formaterDateLocale = (date) => {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, '0');
    const jour = String(date.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  };
  const dates = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return { index, date, iso: formaterDateLocale(date), jour: date.getDay() };
  });
  const dateParISO = (iso) => dates.find((item) => item.iso === iso);
  const heureTexte = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')} h ${String(minutes % 60).padStart(2, '0')}`;
  const identifiantStable = (texte) => {
    let empreinte = 2166136261;
    for (let index = 0; index < texte.length; index += 1) {
      empreinte ^= texte.charCodeAt(index);
      empreinte = Math.imul(empreinte, 16777619);
    }
    return empreinte >>> 0;
  };
  const prestationChoisie = () => prestations.find((prestation) => prestation.id === etat.prestation);

  selecteur('[data-choix]', formulaire).innerHTML = prestations.map((prestation) => `
    <label class="choix__option">
      <input type="radio" name="prestation" value="${prestation.id}">
      <span><strong>${prestation.nom}</strong><small>${prestation.categorie}</small></span>
    </label>`).join('');

  const remplirJours = () => {
    const conteneur = selecteur('[data-jours]', formulaire);
    conteneur.innerHTML = dates.map((item) => {
      const ferme = item.jour === 0;
      const samedi = item.jour === 6;
      const interdit = ferme || samedi;
      const libelleJour = joursDeLaSemaine.format(item.date);
      const etatJour = ferme ? 'Fermé' : samedi ? 'À confirmer' : item.index === 0 ? 'Aujourd’hui' : item.index === 1 ? 'Demain' : moisCourt.format(item.date).replace('.', '');
      const dateAria = dateLongue.format(item.date);
      const aideAria = ferme ? ', fermé selon les fiches' : samedi ? ', horaires à confirmer' : ', date de simulation';
      return `<label class="jour">
        <input type="radio" name="jour" value="${item.iso}" aria-label="${dateAria}${aideAria}"${interdit ? ' disabled' : ''}${etat.jour === item.iso && !interdit ? ' checked' : ''}>
        <span aria-hidden="true"><span class="jour__semaine">${libelleJour}</span><span class="jour__date">${item.date.getDate()}</span><span class="jour__etat">${etatJour}</span></span>
      </label>`;
    }).join('');
  };

  const heuresPourJour = (jour) => {
    if (!jour || jour.jour === 0 || jour.jour === 6) return [];
    const maintenant = new Date();
    const aujourdHui = formaterDateLocale(maintenant) === jour.iso;
    const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
    const horaires = [];
    for (let minute = heuresOuverture.debut; minute < heuresOuverture.fin; minute += 30) {
      const passe = aujourdHui && minute <= minuteActuelle;
      const indisponible = identifiantStable(`${jour.iso}|${minute}|glamour-coiffure`) % 100 < 21;
      horaires.push({ minute, passe, indisponible, disponible: !passe && !indisponible });
    }
    if (horaires.length && !horaires.some((horaire) => horaire.disponible)) {
      const premierFutur = horaires.find((horaire) => !horaire.passe);
      if (premierFutur) premierFutur.indisponible = false;
    }
    return horaires;
  };

  const remplirHeures = () => {
    const conteneur = selecteur('[data-heures]', formulaire);
    const note = selecteur('[data-note-heures]', formulaire);
    const jour = dateParISO(etat.jour);
    if (!jour) {
      conteneur.innerHTML = '';
      note.textContent = 'Créneaux fictifs, à confirmer avec le salon.';
      return;
    }
    note.textContent = `${dateLongue.format(jour.date)}. Heures situées dans la plage publique du lundi au vendredi ; durée à confirmer.`;
    const horaires = heuresPourJour(jour);
    conteneur.innerHTML = horaires.map((horaire) => {
      const heure = heureTexte(horaire.minute);
      const disponible = horaire.disponible;
      const libelle = disponible ? `${heure}, créneau fictif` : `${heure}, indisponible dans cette simulation`;
      const mention = disponible ? '' : '<small class="heure__indispo">Indisponible ici</small>';
      return `<label class="heure">
        <input type="radio" name="heure" value="${horaire.minute}" aria-label="${libelle}"${disponible ? '' : ' disabled'}${etat.heure === horaire.minute && disponible ? ' checked' : ''}>
        <span><time datetime="${String(Math.floor(horaire.minute / 60)).padStart(2, '0')}:${String(horaire.minute % 60).padStart(2, '0')}">${heure}</time>${mention}</span>
      </label>`;
    }).join('');
    if (etat.heure !== null && !horaires.some((horaire) => horaire.minute === etat.heure && horaire.disponible)) etat.heure = null;
  };

  const mettreAJourSelection = () => {
    const prestation = prestationChoisie();
    const jour = dateParISO(etat.jour);
    const morceaux = [];
    if (prestation) morceaux.push(prestation.nom);
    if (jour) morceaux.push(dateLongue.format(jour.date));
    if (etat.heure !== null) morceaux.push(heureTexte(etat.heure));
    selection.innerHTML = morceaux.length ? `<strong>Votre sélection</strong><span>${morceaux.join(' · ')}</span>` : '';
  };

  const libellesEtapes = { 1: 'la prestation', 2: 'le jour', 3: 'l’heure', 4: 'vos coordonnées' };
  const afficherEtape = (numero, options = {}) => {
    const precedente = etat.etape;
    etat.etape = numero;
    etat.maximum = Math.max(etat.maximum, numero);
    if (numero === 2) remplirJours();
    if (numero === 3) remplirHeures();
    const active = etapes.find((element) => Number(element.dataset.etape) === numero);
    etapes.forEach((element) => {
      const courant = element === active;
      const etaitMasquee = element.hidden;
      element.hidden = !courant;
      if (courant && (numero !== precedente || etaitMasquee)) {
        element.classList.remove('is-enter', 'is-enter-back');
        element.classList.add(numero < precedente ? 'is-enter-back' : 'is-enter');
        requestAnimationFrame(() => element.classList.remove('is-enter', 'is-enter-back'));
      }
    });
    boutonsEtape.forEach((bouton) => {
      const index = Number(bouton.dataset.aller);
      if (index === numero) bouton.setAttribute('aria-current', 'step');
      else bouton.removeAttribute('aria-current');
      bouton.disabled = index > etat.maximum;
    });
    tous('[data-erreur]', formulaire).forEach((erreur) => { erreur.hidden = true; });
    mettreAJourSelection();
    if (options.silencieux) return;
    annonce.textContent = `Étape ${numero} sur 4 : ${libellesEtapes[numero]}.`;
    selecteur('.etape-formulaire__titre', active)?.focus({ preventScroll: true });
    if (!options.sansDefilement) {
      const boite = formulaire.getBoundingClientRect();
      if (boite.top < 0 || boite.top > window.innerHeight * .66) {
        formulaire.scrollIntoView({ behavior: mouvementReduit.matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
  };

  const erreurEtape = (numero) => {
    const erreur = selecteur(`[data-erreur="${numero}"]`, formulaire);
    if (erreur) erreur.hidden = false;
    const premier = selecteur(`.etape-formulaire[data-etape="${numero}"] input:not(:disabled)`, formulaire);
    premier?.focus();
  };
  const suivant = () => {
    if (etat.etape === 1 && !etat.prestation) return erreurEtape(1);
    if (etat.etape === 2 && !etat.jour) return erreurEtape(2);
    if (etat.etape === 3 && etat.heure === null) return erreurEtape(3);
    if (etat.etape < 4) afficherEtape(etat.etape + 1);
  };

  formulaire.addEventListener('change', (evenement) => {
    const cible = evenement.target;
    if (cible.name === 'prestation') etat.prestation = cible.value;
    if (cible.name === 'jour') {
      etat.jour = cible.value;
      etat.heure = null;
      etat.maximum = Math.min(etat.maximum, 2);
    }
    if (cible.name === 'heure') etat.heure = Number(cible.value);
    const numero = cible.name === 'prestation' ? 1 : cible.name === 'jour' ? 2 : cible.name === 'heure' ? 3 : 0;
    if (numero) {
      const erreur = selecteur(`[data-erreur="${numero}"]`, formulaire);
      if (erreur) erreur.hidden = true;
    }
    boutonsEtape.forEach((bouton) => { bouton.disabled = Number(bouton.dataset.aller) > etat.maximum; });
    mettreAJourSelection();
  });

  formulaire.addEventListener('click', (evenement) => {
    if (evenement.target.closest('[data-suivant]')) suivant();
    else if (evenement.target.closest('[data-precedent]')) afficherEtape(Math.max(1, etat.etape - 1));
    else if (evenement.target.closest('[data-recommencer]')) recommencer();
  });
  boutonsEtape.forEach((bouton) => bouton.addEventListener('click', () => {
    const numero = Number(bouton.dataset.aller);
    if (numero <= etat.maximum) afficherEtape(numero);
  }));

  const prenom = selecteur('#prenom', formulaire);
  const telephone = selecteur('#telephone', formulaire);
  const mobileValide = (valeur) => /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(valeur.replace(/[\s.\-()]/g, ''));
  const validerChamp = (champ, erreur, invalide) => {
    erreur.hidden = !invalide;
    champ.setAttribute('aria-invalid', invalide ? 'true' : 'false');
    return !invalide;
  };
  prenom.addEventListener('blur', () => {
    if (prenom.value) validerChamp(prenom, selecteur('#erreur-prenom'), !prenom.value.trim());
  });
  telephone.addEventListener('blur', () => {
    if (telephone.value) validerChamp(telephone, selecteur('#erreur-telephone'), !mobileValide(telephone.value));
  });
  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (etat.etape < 4) return suivant();
    const prenomCorrect = validerChamp(prenom, selecteur('#erreur-prenom'), !prenom.value.trim());
    const telephoneCorrect = validerChamp(telephone, selecteur('#erreur-telephone'), !mobileValide(telephone.value));
    if (!prenomCorrect) { prenom.focus(); return; }
    if (!telephoneCorrect) { telephone.focus(); return; }

    const prestation = prestationChoisie();
    const jour = dateParISO(etat.jour);
    selecteur('[data-confirmation-titre]').textContent = `Merci, ${prenom.value.trim()}.`;
    selecteur('[data-confirmation-recap]').textContent = `${prestation.nom} · ${dateLongue.format(jour.date)} à ${heureTexte(etat.heure)}.`;
    etapes.forEach((etape) => { etape.hidden = true; });
    selecteur('.progression', formulaire).hidden = true;
    selection.hidden = true;
    selecteur('[data-confirmation]', formulaire).hidden = false;
    selecteur('[data-confirmation]', formulaire).focus({ preventScroll: true });
    annonce.textContent = 'Simulation terminée. Rien n’a été envoyé au salon.';
    selecteur('[data-erreur="4"]', formulaire).hidden = true;
  });

  function recommencer() {
    formulaire.reset();
    Object.assign(etat, { etape: 1, maximum: 1, prestation: null, jour: null, heure: null });
    selecteur('.progression', formulaire).hidden = false;
    selecteur('[data-confirmation]', formulaire).hidden = true;
    selecteur('[data-confirmation]', formulaire).removeAttribute('tabindex');
    selection.hidden = false;
    [prenom, telephone].forEach((champ) => champ.removeAttribute('aria-invalid'));
    tous('.champ .erreur', formulaire).forEach((erreur) => { erreur.hidden = true; });
    afficherEtape(1);
  }

  afficherEtape(1, { silencieux: true });
})();
