(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const un = (selecteur, contexte = doc) => contexte.querySelector(selecteur);
  const tous = (selecteur, contexte = doc) => Array.from(contexte.querySelectorAll(selecteur));
  const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)');
  const durees = { court: 60, 'mi-long': 90, long: 120 };
  const noms = {
    court: 'Forfait cheveux court',
    'mi-long': 'Forfait cheveux mi-long',
    long: 'Forfait cheveux long'
  };
  const heuresOuverture = {
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 17 * 60]
  };
  const formulaire = un('#formulaire-rendez-vous');
  const recapForfait = un('#recap-forfait');
  const recapJour = un('#recap-jour');
  const recapHeure = un('#recap-heure');
  const choixJours = un('#choix-jours');
  const choixHeures = un('#choix-heures');
  const etapes = tous('.etape-formulaire');
  const pointsEtape = tous('.etapes__element');
  let indiceEtape = 0;
  let etapeLaPlusAvancee = 0;
  let jourChoisi = null;
  let heureChoisie = null;
  let delaiTransition = 0;

  function dateDeParis() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    const date = new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
    return { date, minutes: Number(valeurs.hour) * 60 + Number(valeurs.minute) };
  }

  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const formatCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const formatHeure = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}\u00a0h\u00a0${String(minutes % 60).padStart(2, '0')}`;
  const dateIso = (date) => date.toISOString().slice(0, 10);

  function forfaitActif() {
    return un('input[name="forfait"]:checked', formulaire)?.value || 'court';
  }

  function annonce(texte) {
    un('#annonce-etape').textContent = texte;
  }

  function actualiserRecapitulatif() {
    const forfait = forfaitActif();
    const duree = durees[forfait];
    recapForfait.textContent = `${noms[forfait]} · ${duree}\u00a0min`;
    recapJour.textContent = jourChoisi ? formatJour.format(jourChoisi) : 'À choisir';
    recapHeure.textContent = heureChoisie || 'À choisir';
  }

  function etablirEtape(nouvelIndice) {
    if (nouvelIndice < 0 || nouvelIndice > 3) return;
    if (nouvelIndice === indiceEtape) return;
    if (nouvelIndice >= 2 && !jourChoisi) {
      un('#message-jour').textContent = 'Choisissez un jour pour continuer.';
      etablirEtape(1);
      return;
    }
    if (nouvelIndice >= 3 && !heureChoisie) {
      un('#message-heure').textContent = 'Choisissez une heure pour continuer.';
      etablirEtape(2);
      return;
    }

    window.clearTimeout(delaiTransition);
    const ancienne = etapes[indiceEtape];
    const suivante = etapes[nouvelIndice];
    ancienne.classList.add('sortante');
    delaiTransition = window.setTimeout(() => {
      ancienne.classList.remove('est-courante', 'sortante');
      suivante.classList.add('est-courante', 'entre');
      indiceEtape = nouvelIndice;
      etapeLaPlusAvancee = Math.max(etapeLaPlusAvancee, nouvelIndice);
      pointsEtape.forEach((point, index) => {
        point.classList.toggle('est-actif', index === nouvelIndice);
        point.classList.toggle('est-termine', index < nouvelIndice);
        const boutonEtape = un('.etapes__bouton', point);
        boutonEtape.disabled = index > etapeLaPlusAvancee;
        if (index === nouvelIndice) boutonEtape.setAttribute('aria-current', 'step');
        else boutonEtape.removeAttribute('aria-current');
      });
      const libelles = ['choisir un forfait', 'choisir un jour', 'choisir une heure', 'saisir vos coordonnées'];
      annonce(`Étape ${nouvelIndice + 1} sur 4 — ${libelles[nouvelIndice]}.`);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => suivante.classList.remove('entre'));
      });
      const titre = un('.etape-formulaire__titre', suivante);
      titre?.focus({ preventScroll: true });
    }, mouvementReduit.matches ? 0 : 210);
  }

  function rendreJours() {
    choixJours.replaceChildren();
    const { date: aujourdhui } = dateDeParis();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdhui);
      date.setUTCDate(date.getUTCDate() + decalage);
      const jourSemaine = date.getUTCDay();
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix-jour';
      bouton.setAttribute('aria-pressed', 'false');
      bouton.dataset.date = dateIso(date);
      const libelleJour = doc.createElement('span');
      libelleJour.textContent = decalage === 0 ? 'Aujourd’hui' : formatCourt.format(date).split(' ')[0].replace('.', '');
      const libelleDate = doc.createElement('span');
      libelleDate.textContent = formatCourt.format(date).replace(/^[^ ]+\s/, '');
      const etatJour = doc.createElement('span');
      etatJour.className = 'choix-jour__etat';

      if (jourSemaine === 0) {
        bouton.disabled = true;
        etatJour.textContent = 'Fermé';
        bouton.setAttribute('aria-label', `${formatJour.format(date)}, fermé`);
      } else if (jourSemaine === 1) {
        bouton.disabled = true;
        etatJour.textContent = 'À confirmer';
        bouton.setAttribute('aria-label', `${formatJour.format(date)}, horaire à confirmer`);
      } else {
        bouton.setAttribute('aria-label', `${formatJour.format(date)}, choisir ce jour`);
        bouton.addEventListener('click', () => {
          jourChoisi = date;
          heureChoisie = null;
          tous('.choix-jour', choixJours).forEach((jour) => {
            const choisi = jour === bouton;
            jour.classList.toggle('est-choisi', choisi);
            jour.setAttribute('aria-pressed', String(choisi));
            const jourFormate = formatJour.format(new Date(`${jour.dataset.date}T12:00:00Z`));
            jour.setAttribute('aria-label', choisi ? `${jourFormate}, sélectionné` : `${jourFormate}, choisir ce jour`);
          });
          un('#message-jour').textContent = '';
          rendreHeures();
          actualiserRecapitulatif();
          un('#message-heure').textContent = 'Choisissez une heure proposée dans cette simulation.';
        });
      }
      bouton.append(libelleJour, libelleDate, etatJour);
      choixJours.append(bouton);
    }
  }

  function rendreHeures() {
    choixHeures.replaceChildren();
    heureChoisie = null;
    const jour = jourChoisi;
    if (!jour) return;
    const horaire = heuresOuverture[jour.getUTCDay()];
    if (!horaire) return;

    const { date: aujourdhui, minutes: maintenant } = dateDeParis();
    const duree = durees[forfaitActif()];
    let compteur = 0;
    for (let debut = horaire[0]; debut + duree <= horaire[1]; debut += 30) {
      if (dateIso(jour) === dateIso(aujourdhui) && debut <= maintenant) continue;
      const bouton = doc.createElement('button');
      bouton.type = 'button';
      bouton.className = 'choix-heure';
      bouton.setAttribute('aria-pressed', 'false');
      const texteHeure = document.createElement('span');
      texteHeure.textContent = formatHeure(debut);
      const dejaPris = ((jour.getUTCDate() * 7 + debut / 30) % 11) === 4;
      bouton.append(texteHeure);
      if (dejaPris) {
        bouton.disabled = true;
        bouton.classList.add('est-pris');
        bouton.setAttribute('aria-label', `${formatHeure(debut)}, déjà pris dans cette simulation`);
        const etat = document.createElement('small');
        etat.textContent = 'Déjà pris';
        bouton.append(etat);
      } else {
        bouton.setAttribute('aria-label', `Choisir ${formatHeure(debut)}`);
        bouton.addEventListener('click', () => {
          heureChoisie = formatHeure(debut);
          tous('.choix-heure', choixHeures).forEach((heure) => {
            const choisie = heure === bouton;
            heure.classList.toggle('est-choisi', choisie);
            heure.setAttribute('aria-pressed', String(choisie));
            heure.setAttribute('aria-label', choisie ? `${formatHeure(debut)}, heure choisie` : `Choisir ${heure.querySelector('span').textContent}`);
          });
          un('#message-heure').textContent = '';
          actualiserRecapitulatif();
        });
      }
      choixHeures.append(bouton);
      compteur += 1;
    }
    if (!compteur) {
      un('#message-heure').textContent = 'Aucune heure ne reste dans les horaires publiés pour cette date et ce forfait.';
    }
  }

  function validerCoordonnees() {
    const prenom = un('#prenom');
    const telephone = un('#telephone');
    const erreurPrenom = un('#erreur-prenom');
    const erreurTelephone = un('#erreur-telephone');
    const nom = prenom.value.trim();
    const numero = telephone.value.trim();
    const mobile = /^(?:0[67](?:[ .-]?\d{2}){4}|\+33[ .-]?[67](?:[ .-]?\d{2}){4}|0033[ .-]?[67](?:[ .-]?\d{2}){4})$/;
    let valide = true;

    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    prenom.removeAttribute('aria-invalid');
    telephone.removeAttribute('aria-invalid');

    if (nom.length < 2) {
      erreurPrenom.textContent = 'Saisissez un prénom d’au moins deux caractères.';
      prenom.setAttribute('aria-invalid', 'true');
      valide = false;
    }
    if (!mobile.test(numero)) {
      erreurTelephone.textContent = 'Saisissez un numéro de mobile français commençant par 06 ou 07.';
      telephone.setAttribute('aria-invalid', 'true');
      valide = false;
    }
    if (!valide) {
      (nom.length < 2 ? prenom : telephone).focus();
    }
    return valide;
  }

  un('input[name="forfait"]', formulaire).addEventListener('change', () => {
    heureChoisie = null;
    rendreHeures();
    actualiserRecapitulatif();
  });

  tous('[data-suivant]', formulaire).forEach((bouton) => bouton.addEventListener('click', () => {
    if (indiceEtape === 1 && !jourChoisi) {
      un('#message-jour').textContent = 'Choisissez un jour pour continuer.';
      return;
    }
    if (indiceEtape === 2 && !heureChoisie) {
      un('#message-heure').textContent = 'Choisissez une heure pour continuer.';
      return;
    }
    etablirEtape(indiceEtape + 1);
  }));

  tous('[data-precedent]', formulaire).forEach((bouton) => bouton.addEventListener('click', () => etablirEtape(indiceEtape - 1)));

  tous('[data-etape-lien]').forEach((bouton) => bouton.addEventListener('click', () => {
    const destination = Number(bouton.dataset.etapeLien);
    if (destination <= etapeLaPlusAvancee) etablirEtape(destination);
  }));

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    if (!validerCoordonnees()) return;
    const prenom = un('#prenom').value.trim();
    const jour = formatJour.format(jourChoisi);
    const phrase = `${prenom}, cette simulation concerne ${noms[forfaitActif()].toLowerCase()}, le ${jour} à ${heureChoisie}.`;
    un('#confirmation-texte').textContent = phrase;
    formulaire.hidden = true;
    un('.recapitulatif').hidden = true;
    pointsEtape.forEach((point) => { un('.etapes__bouton', point).disabled = true; });
    const confirmation = un('#confirmation');
    confirmation.hidden = false;
    confirmation.focus();
  });

  un('#reprendre').addEventListener('click', () => {
    un('#confirmation').hidden = true;
    formulaire.hidden = false;
    un('.recapitulatif').hidden = false;
    etapeLaPlusAvancee = 3;
    etablirEtape(0);
  });

  tous('[data-choisir]').forEach((lien) => lien.addEventListener('click', () => {
    const option = un(`input[name="forfait"][value="${lien.dataset.choisir}"]`, formulaire);
    if (option) {
      option.checked = true;
      option.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }));

  rendreJours();
  actualiserRecapitulatif();

  /* Menu accessible : lien de fermeture, Échap et retour du focus. */
  const boutonMenu = un('.navigation__bouton');
  const liensMenu = un('#navigation-liens');
  function fermerMenu(rendreFocus = false) {
    boutonMenu.setAttribute('aria-expanded', 'false');
    boutonMenu.querySelector('.navigation__texte').textContent = 'Ouvrir le menu';
    liensMenu.classList.remove('est-ouverte');
    if (rendreFocus) boutonMenu.focus();
  }
  boutonMenu.addEventListener('click', () => {
    const ouvert = boutonMenu.getAttribute('aria-expanded') === 'true';
    boutonMenu.setAttribute('aria-expanded', String(!ouvert));
    boutonMenu.querySelector('.navigation__texte').textContent = ouvert ? 'Ouvrir le menu' : 'Fermer le menu';
    liensMenu.classList.toggle('est-ouverte', !ouvert);
    if (!ouvert) un('a', liensMenu).focus();
  });
  liensMenu.addEventListener('click', (evenement) => {
    if (evenement.target.closest('a')) fermerMenu();
  });
  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonMenu.getAttribute('aria-expanded') === 'true') fermerMenu(true);
  });

  /* Les apparitions restent décoratives : elles ne retardent aucun contenu. */
  const hero = un('.hero');
  window.requestAnimationFrame(() => hero.classList.add('est-charge'));
  if (mouvementReduit.matches || !('IntersectionObserver' in window)) {
    root.classList.remove('mouvement-ok');
    tous('.reveal').forEach((element) => element.classList.add('est-visible'));
  } else {
    root.classList.add('mouvement-ok');
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          instance.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    tous('.reveal').forEach((element) => observateur.observe(element));
  }

  /* La barre mobile accompagne le parcours, puis s’efface devant la réservation. */
  const barreMobile = un('.barre-mobile');
  const actionsHero = un('.hero__actions');
  let heroVisible = true;
  let sectionReserveeVisible = false;
  let piedVisible = false;
  function actualiserBarre() {
    const afficher = !heroVisible && !sectionReserveeVisible && !piedVisible;
    barreMobile.classList.toggle('est-visible', afficher);
    barreMobile.setAttribute('aria-hidden', String(!afficher));
    if (afficher) barreMobile.removeAttribute('inert');
    else barreMobile.setAttribute('inert', '');
  }
  if ('IntersectionObserver' in window) {
    const observateurHero = new IntersectionObserver(([entree]) => {
      heroVisible = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.05 });
    observateurHero.observe(actionsHero);
    const observateurReserve = new IntersectionObserver(([entree]) => {
      sectionReserveeVisible = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.01 });
    observateurReserve.observe(un('#rendez-vous'));
    const observateurPied = new IntersectionObserver(([entree]) => {
      piedVisible = entree.isIntersecting;
      actualiserBarre();
    }, { threshold: 0.01 });
    observateurPied.observe(un('.pied'));
  }
})();
