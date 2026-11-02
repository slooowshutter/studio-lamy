window.__site = 1;
(() => {
  'use strict';

  const documentRacine = document.documentElement;
  const corps = document.body;
  const menuBouton = document.querySelector('.menu-bouton');
  const navigation = document.querySelector('#navigation');
  const reservation = document.querySelector('#reservation');
  const formulaire = document.querySelector('#formulaire-rdv');
  const confirmation = document.querySelector('[data-confirmation]');
  const resume = document.querySelector('[data-resume]');
  const compteur = document.querySelector('[data-compteur]');
  const zonesEtape = Array.from(document.querySelectorAll('[data-panneau]'));
  const joursZone = document.querySelector('[data-jours]');
  const heuresZone = document.querySelector('[data-heures]');
  const recapZone = document.querySelector('[data-recapitulatif]');
  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const barreMobile = document.querySelector('[data-barre]');
  const fuseau = 'Europe/Paris';

  const horaires = {
    0: null,
    1: null,
    2: [630, 1140],
    3: [630, 1140],
    4: [750, 1140],
    5: [630, 1140],
    6: [630, 1080]
  };
  const prestations = {
    diagnostic: { nom: 'Diagnostic / conseil', duree: 30 },
    devis: { nom: 'Devis', duree: 15 }
  };
  const selection = { prestation: '', date: '', heure: null };
  let etapeActuelle = 1;
  let actionsVisibles = true;
  let reservationVisible = false;
  let piedVisible = false;

  const deuxChiffres = nombre => String(nombre).padStart(2, '0');

  function maintenantParis() {
    const morceaux = new Intl.DateTimeFormat('fr-FR', {
      timeZone: fuseau,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(morceaux.map(partie => [partie.type, partie.value]));
    return {
      annee: Number(valeurs.year),
      mois: Number(valeurs.month),
      jour: Number(valeurs.day),
      minutes: Number(valeurs.hour) * 60 + Number(valeurs.minute),
      cle: `${valeurs.year}-${valeurs.month}-${valeurs.day}`
    };
  }

  function cleDate(date) {
    return `${date.getUTCFullYear()}-${deuxChiffres(date.getUTCMonth() + 1)}-${deuxChiffres(date.getUTCDate())}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour));
  }

  function dateCourte(cle) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short'
    }).format(dateDepuisCle(cle));
  }

  function dateLongue(cle) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long'
    }).format(dateDepuisCle(cle));
  }

  function nomJour(date) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' }).format(date);
  }

  function heureTexte(minutes) {
    return `${Math.floor(minutes / 60)} h ${deuxChiffres(minutes % 60)}`;
  }

  function afficherResume() {
    if (!selection.prestation) {
      resume.textContent = 'Choisissez une prestation pour commencer.';
      return;
    }
    const prestation = prestations[selection.prestation];
    const elements = [`${prestation.nom} · ${prestation.duree} min`];
    if (selection.date) elements.push(dateLongue(selection.date));
    if (selection.heure !== null) elements.push(heureTexte(selection.heure));
    resume.textContent = elements.join(' · ');
  }

  function afficherJours() {
    const maintenant = maintenantParis();
    joursZone.replaceChildren();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour + decalage));
      const cle = cleDate(date);
      const plage = horaires[date.getUTCDay()];
      const nom = nomJour(date);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.date = cle;
      bouton.setAttribute('aria-pressed', String(selection.date === cle));
      bouton.setAttribute('aria-label', plage ? `${dateLongue(cle)}, horaires publiés` : `${dateLongue(cle)}, fermé`);
      const nomElement = document.createElement('span');
      nomElement.className = 'jour__nom';
      nomElement.textContent = dateCourte(cle);
      const etat = document.createElement('span');
      etat.className = 'jour__etat';
      if (!plage) {
        bouton.disabled = true;
        etat.textContent = 'Fermé';
      } else {
        etat.textContent = 'Choisir';
      }
      bouton.append(nomElement, etat);
      joursZone.append(bouton);
    }
  }

  function afficherHeures() {
    heuresZone.replaceChildren();
    const ancienMessage = document.querySelector('[data-message-heures]');
    if (ancienMessage) ancienMessage.remove();
    if (!selection.date || !selection.prestation) {
      const message = document.createElement('p');
      message.className = 'panneau-etape__aide';
      message.dataset.messageHeures = '';
      message.textContent = 'Choisissez d’abord un jour.';
      heuresZone.after(message);
      return;
    }

    const date = dateDepuisCle(selection.date);
    const plage = horaires[date.getUTCDay()];
    if (!plage) return;
    const prestation = prestations[selection.prestation];
    const maintenant = maintenantParis();
    const estAujourdHui = selection.date === maintenant.cle;
    let nombreAvenir = 0;
    for (let debut = plage[0]; debut + prestation.duree <= plage[1]; debut += 30) {
      const passe = estAujourdHui && debut <= maintenant.minutes;
      if (!passe) nombreAvenir += 1;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      bouton.dataset.heure = String(debut);
      bouton.setAttribute('aria-pressed', String(selection.heure === debut));
      bouton.disabled = passe;
      bouton.setAttribute('aria-label', passe ? `${heureTexte(debut)}, horaire déjà passé` : `${heureTexte(debut)}, heure de démonstration`);
      const heure = document.createElement('span');
      heure.textContent = heureTexte(debut);
      bouton.append(heure);
      if (passe) {
        const etat = document.createElement('span');
        etat.className = 'jour__etat';
        etat.textContent = 'Passé';
        bouton.append(etat);
      }
      heuresZone.append(bouton);
    }
    if (!nombreAvenir) {
      const message = document.createElement('p');
      message.className = 'panneau-etape__aide';
      message.dataset.messageHeures = '';
      message.textContent = 'Il ne reste pas d’heure de démonstration aujourd’hui. Choisissez un autre jour.';
      heuresZone.after(message);
    }
  }

  function afficherRecapitulatif() {
    recapZone.replaceChildren();
    const prestation = prestations[selection.prestation];
    const lignes = [
      `Prestation : ${prestation.nom}`,
      `Jour : ${dateLongue(selection.date)}`,
      `Heure : ${heureTexte(selection.heure)}`,
      `Prénom : ${champPrenom.value.trim() || 'à saisir'}`
    ];
    lignes.forEach(texte => {
      const ligne = document.createElement('p');
      ligne.textContent = texte;
      recapZone.append(ligne);
    });
  }

  function panneauActif(numero) {
    etapeActuelle = numero;
    zonesEtape.forEach(panneau => {
      const actif = Number(panneau.dataset.panneau) === numero;
      panneau.hidden = !actif;
      panneau.classList.remove('is-entree');
      if (actif) {
        panneau.classList.add('is-entree');
        requestAnimationFrame(() => requestAnimationFrame(() => panneau.classList.remove('is-entree')));
        const titre = panneau.querySelector('h3');
        requestAnimationFrame(() => titre.focus({ preventScroll: true }));
      }
    });
    compteur.textContent = String(numero);
    afficherResume();
    if (numero === 3) afficherHeures();
    if (numero === 4) afficherRecapitulatif();
  }

  function erreurEtape(identifiant, message) {
    const cible = document.querySelector(`#${identifiant}`);
    cible.textContent = message;
  }

  function validerTelephone(valeur) {
    const propre = valeur.replace(/[\s().-]/g, '');
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(propre);
  }

  function validerCoordonnees() {
    let valide = true;
    const prenomOk = champPrenom.value.trim().length > 0;
    document.querySelector('#erreur-prenom').textContent = prenomOk ? '' : 'Saisissez votre prénom.';
    champPrenom.setAttribute('aria-invalid', String(!prenomOk));
    if (!prenomOk) valide = false;
    const telephoneOk = validerTelephone(champTelephone.value);
    document.querySelector('#erreur-telephone').textContent = telephoneOk ? '' : 'Saisissez un numéro de mobile français valide.';
    champTelephone.setAttribute('aria-invalid', String(!telephoneOk));
    if (!telephoneOk) valide = false;
    return valide;
  }

  function texteConfirmation() {
    const recap = document.querySelector('[data-recapitulatif-succes]');
    recap.textContent = `${prestations[selection.prestation].nom} · ${dateLongue(selection.date)} · ${heureTexte(selection.heure)}.`;
  }

  function terminer() {
    if (!validerCoordonnees()) {
      const premierInvalide = document.querySelector('[aria-invalid="true"]');
      premierInvalide.focus();
      return;
    }
    texteConfirmation();
    formulaire.hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector('h3').focus();
  }

  function ouvrirMenu(ouvert, rendreFocus = false) {
    menuBouton.setAttribute('aria-expanded', String(ouvert));
    menuBouton.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
    navigation.classList.toggle('is-open', ouvert);
    if (ouvert) {
      navigation.querySelector('a').focus();
    } else if (rendreFocus) {
      menuBouton.focus();
    }
  }

  function actualiserBarreMobile() {
    if (!barreMobile) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;
    const visible = mobile && !actionsVisibles && !reservationVisible && !piedVisible;
    barreMobile.hidden = !visible;
    corps.classList.toggle('avec-barre', visible);
  }

  function demarrerRevelations() {
    if (!('IntersectionObserver' in window)) {
      documentRacine.classList.remove('js');
      return;
    }
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach(entree => {
        if (entree.isIntersecting) {
          entree.target.classList.add('is-visible');
          instance.unobserve(entree.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => observateur.observe(element));
  }

  function demarrerBarreMobile() {
    if (!('IntersectionObserver' in window)) return;
    const actions = document.querySelector('.hero__actions');
    const pied = document.querySelector('.pied');
    const observateur = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target === actions) actionsVisibles = entree.isIntersecting;
        if (entree.target === reservation) reservationVisible = entree.isIntersecting;
        if (entree.target === pied) piedVisible = entree.isIntersecting;
      });
      actualiserBarreMobile();
    }, { threshold: 0.04 });
    observateur.observe(actions);
    observateur.observe(reservation);
    observateur.observe(pied);
    window.matchMedia('(max-width: 760px)').addEventListener('change', actualiserBarreMobile);
  }

  function avancer() {
    if (etapeActuelle === 1) {
      if (!selection.prestation) {
        erreurEtape('erreur-prestation', 'Choisissez une prestation.');
        return;
      }
      erreurEtape('erreur-prestation', '');
      panneauActif(2);
      return;
    }
    if (etapeActuelle === 2) {
      if (!selection.date) {
        erreurEtape('erreur-jour', 'Choisissez un jour ouvert.');
        return;
      }
      erreurEtape('erreur-jour', '');
      panneauActif(3);
      return;
    }
    if (etapeActuelle === 3) {
      if (selection.heure === null) {
        erreurEtape('erreur-heure', 'Choisissez une heure de démonstration.');
        return;
      }
      erreurEtape('erreur-heure', '');
      panneauActif(4);
    }
  }

  if (menuBouton && navigation) {
    menuBouton.addEventListener('click', () => {
      ouvrirMenu(menuBouton.getAttribute('aria-expanded') !== 'true');
    });
    navigation.addEventListener('click', evenement => {
      if (evenement.target.closest('a')) ouvrirMenu(false);
    });
    document.addEventListener('keydown', evenement => {
      if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') ouvrirMenu(false, true);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', () => ouvrirMenu(false));
  }

  document.querySelectorAll('[data-choix-prestation]').forEach(bouton => {
    bouton.addEventListener('click', () => {
      const valeur = bouton.dataset.choixPrestation;
      const radio = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
      if (!radio) return;
      radio.checked = true;
      selection.prestation = valeur;
      selection.date = '';
      selection.heure = null;
      formulaire.hidden = false;
      confirmation.hidden = true;
      afficherJours();
      afficherResume();
      erreurEtape('erreur-prestation', '');
      panneauActif(1);
      const comportement = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      reservation.scrollIntoView({ behavior: comportement, block: 'start' });
    });
  });

  formulaire.addEventListener('change', evenement => {
    const cible = evenement.target;
    if (cible.name === 'prestation') {
      selection.prestation = cible.value;
      selection.date = '';
      selection.heure = null;
      afficherJours();
      afficherResume();
      erreurEtape('erreur-prestation', '');
    }
    if (cible === champPrenom || cible === champTelephone) {
      if (etapeActuelle === 4) afficherRecapitulatif();
    }
  });

  formulaire.addEventListener('click', evenement => {
    const jour = evenement.target.closest('[data-date]');
    const heure = evenement.target.closest('[data-heure]');
    const suite = evenement.target.closest('[data-suite]');
    const retour = evenement.target.closest('[data-retour]');
    if (jour && !jour.disabled) {
      selection.date = jour.dataset.date;
      selection.heure = null;
      joursZone.querySelectorAll('[data-date]').forEach(bouton => {
        bouton.setAttribute('aria-pressed', String(bouton.dataset.date === selection.date));
      });
      afficherHeures();
      afficherResume();
      erreurEtape('erreur-jour', '');
      erreurEtape('erreur-heure', '');
    }
    if (heure && !heure.disabled) {
      selection.heure = Number(heure.dataset.heure);
      heuresZone.querySelectorAll('[data-heure]').forEach(bouton => {
        bouton.setAttribute('aria-pressed', String(Number(bouton.dataset.heure) === selection.heure));
      });
      afficherResume();
      erreurEtape('erreur-heure', '');
    }
    if (suite) avancer();
    if (retour && etapeActuelle > 1) panneauActif(etapeActuelle - 1);
  });

  champPrenom.addEventListener('blur', () => {
    if (champPrenom.value) {
      const valide = champPrenom.value.trim().length > 0;
      champPrenom.setAttribute('aria-invalid', String(!valide));
      document.querySelector('#erreur-prenom').textContent = valide ? '' : 'Saisissez votre prénom.';
    }
  });
  champTelephone.addEventListener('blur', () => {
    if (champTelephone.value) {
      const valide = validerTelephone(champTelephone.value);
      champTelephone.setAttribute('aria-invalid', String(!valide));
      document.querySelector('#erreur-telephone').textContent = valide ? '' : 'Saisissez un numéro de mobile français valide.';
    }
  });
  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    terminer();
  });
  document.querySelector('[data-recommencer]').addEventListener('click', () => {
    formulaire.reset();
    formulaire.hidden = false;
    confirmation.hidden = true;
    selection.prestation = '';
    selection.date = '';
    selection.heure = null;
    champPrenom.removeAttribute('aria-invalid');
    champTelephone.removeAttribute('aria-invalid');
    document.querySelector('#erreur-prenom').textContent = '';
    document.querySelector('#erreur-telephone').textContent = '';
    afficherJours();
    panneauActif(1);
  });

  demarrerRevelations();
  demarrerBarreMobile();
  afficherJours();
  afficherHeures();
  afficherResume();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
})();
