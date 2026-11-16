window.__apercuCharge = true;

(() => {
  'use strict';

  const prestations = {
    'soin-homme': { nom: 'Soin homme', duree: 5 },
    'coupe-homme': { nom: 'Coupe Homme', duree: 30 },
    'barbe-tondeuse': { nom: 'Entretien barbe tondeuse', duree: 10 },
    'coupe-barbe': { nom: 'Coupe + Entretien Barbe Tondeuse', duree: 40 }
  };
  const horaires = {
    0: null,
    1: { ouverture: 600, fermeture: 1140 },
    2: { ouverture: 600, fermeture: 1140 },
    3: { ouverture: 600, fermeture: 1140 },
    4: { ouverture: 600, fermeture: 1140 },
    5: { ouverture: 600, fermeture: 1140 },
    6: { ouverture: 570, fermeture: 900 }
  };
  const dureeCreneau = 30;
  const nombreJours = 14;
  const etat = { prestation: '', jour: '', heure: '', prenom: '' };
  const racine = document.documentElement;
  const etapes = Array.from(document.querySelectorAll('[data-etape]'));
  const parcours = document.getElementById('parcours');
  const statutParcours = document.getElementById('etat-parcours');
  const choixJours = document.getElementById('choix-jours');
  const choixHeures = document.getElementById('choix-heures');
  const formulaire = document.getElementById('formulaire-simulation');
  const entreePrenom = document.getElementById('prenom');
  const entreeTelephone = document.getElementById('telephone');
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');

  function dateParisEtHeure() {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return {
      annee: Number(valeurs.year),
      mois: Number(valeurs.month),
      jour: Number(valeurs.day),
      minutes: Number(valeurs.hour) * 60 + Number(valeurs.minute)
    };
  }

  function dateCle(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateDepuisCle(cle) {
    const [annee, mois, jour] = cle.split('-').map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour));
  }

  function texteDate(date, options) {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(date);
  }

  function afficherErreursEtape(nom, texte) {
    const cible = document.getElementById(`erreur-${nom}`);
    if (cible) cible.textContent = texte;
  }

  function mettreAJourResume() {
    const prestation = prestations[etat.prestation];
    document.getElementById('resume-prestation').textContent = prestation ? `${prestation.nom} · ${prestation.duree} min` : 'À choisir';
    const jour = etat.jour ? dateDepuisCle(etat.jour) : null;
    document.getElementById('resume-jour').textContent = jour ? texteDate(jour, { weekday: 'long', day: 'numeric', month: 'long' }) : 'À choisir';
    document.getElementById('resume-heure').textContent = etat.heure || 'À choisir';
    document.querySelectorAll('[data-modifier]').forEach((bouton) => {
      const numero = Number(bouton.dataset.modifier);
      const choisi = numero === 0 ? Boolean(etat.prestation) : numero === 1 ? Boolean(etat.jour) : Boolean(etat.heure);
      bouton.disabled = !choisi;
    });
  }

  function fermerEtape(etape) {
    etape.hidden = true;
    etape.inert = true;
    etape.setAttribute('aria-hidden', 'true');
    etape.classList.remove('etape--sortie', 'etape--arrivee');
  }

  function afficherEtape(numero) {
    const actuelle = etapes.find((etape) => !etape.hidden);
    const suivante = etapes.find((etape) => Number(etape.dataset.etape) === numero);
    if (!suivante || actuelle === suivante) return;

    if (actuelle) {
      actuelle.classList.add('etape--sortie');
      actuelle.setAttribute('aria-hidden', 'true');
      actuelle.inert = true;
    }
    suivante.hidden = false;
    suivante.inert = false;
    suivante.setAttribute('aria-hidden', 'false');
    suivante.classList.add('etape--arrivee');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => suivante.classList.remove('etape--arrivee'));
    });

    const titre = suivante.querySelector('h3');
    if (titre) titre.focus({ preventScroll: true });
    const libellesEtapes = ['prestation', 'jour', 'heure', 'coordonnées'];
    statutParcours.textContent = numero < 4 ? `Étape ${numero + 1} sur 4, ${libellesEtapes[numero]}.` : 'Fin du parcours de démonstration.';

    if (actuelle) {
      const delai = reduireMouvement.matches ? 0 : 230;
      window.setTimeout(() => fermerEtape(actuelle), delai);
    }
  }

  function genererLesJours() {
    if (!choixJours) return;
    const maintenant = dateParisEtHeure();
    const aujourdHui = new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour));
    choixJours.replaceChildren();

    for (let decalage = 0; decalage < nombreJours; decalage += 1) {
      const date = new Date(aujourdHui);
      date.setUTCDate(date.getUTCDate() + decalage);
      const jour = date.getUTCDay();
      const cle = dateCle(date);
      const ouvert = Boolean(horaires[jour]);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.jour = cle;
      bouton.disabled = !ouvert;
      bouton.setAttribute('aria-pressed', String(etat.jour === cle));
      bouton.setAttribute('aria-label', ouvert
        ? texteDate(date, { weekday: 'long', day: 'numeric', month: 'long' })
        : `${texteDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}, fermé`);

      const nomJour = document.createElement('span');
      nomJour.textContent = texteDate(date, { weekday: 'short' }).replace('.', '');
      const numero = document.createElement('strong');
      numero.textContent = texteDate(date, { day: 'numeric' });
      const mois = document.createElement('span');
      mois.textContent = texteDate(date, { month: 'short' }).replace('.', '');
      bouton.append(nomJour, numero, mois);

      if (!ouvert) {
        const ferme = document.createElement('small');
        ferme.textContent = 'Fermé';
        bouton.append(ferme);
      }
      choixJours.append(bouton);
    }
  }

  function sommeDeterministe(texte) {
    let total = 0;
    for (let index = 0; index < texte.length; index += 1) {
      total = (total * 31 + texte.charCodeAt(index)) >>> 0;
    }
    return total;
  }

  function formaterHeure(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${String(heures).padStart(2, '0')}:${String(reste).padStart(2, '0')}`;
  }

  function genererLesHeures() {
    if (!choixHeures || !etat.jour || !prestations[etat.prestation]) return;
    const date = dateDepuisCle(etat.jour);
    const plage = horaires[date.getUTCDay()];
    const prestation = prestations[etat.prestation];
    choixHeures.replaceChildren();
    if (!plage) return;

    const maintenant = dateParisEtHeure();
    const aujourdhuiCle = dateCle(new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour)));
    const aujourdhui = etat.jour === aujourdhuiCle;
    const grilleFictive = sommeDeterministe(`${etat.jour}-${etat.prestation}`);

    for (let minute = plage.ouverture; minute + prestation.duree <= plage.fermeture; minute += dureeCreneau) {
      const heure = formaterHeure(minute);
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.dataset.heure = heure;
      bouton.setAttribute('aria-pressed', String(etat.heure === heure));
      const passee = aujourdhui && minute <= maintenant.minutes;
      const prisePourLaDemonstration = !passee && ((grilleFictive + minute) % 7 < 2);
      bouton.disabled = passee || prisePourLaDemonstration;

      const valeur = document.createElement('span');
      valeur.textContent = heure;
      bouton.append(valeur);
      if (passee || prisePourLaDemonstration) {
        const etatHeure = document.createElement('small');
        etatHeure.textContent = passee ? 'Passée' : 'Prise pour l’essai';
        bouton.append(etatHeure);
        bouton.setAttribute('aria-label', passee ? `${heure}, heure passée` : `${heure}, prise dans cette simulation`);
      } else {
        bouton.setAttribute('aria-label', `${heure}, heure fictive à choisir`);
      }
      choixHeures.append(bouton);
    }
  }

  function choisirPrestation(cle) {
    if (!prestations[cle]) return;
    etat.prestation = cle;
    etat.jour = '';
    etat.heure = '';
    document.querySelectorAll('input[name="prestation"]').forEach((champ) => {
      champ.checked = champ.value === cle;
    });
    afficherErreursEtape('prestation', '');
    afficherErreursEtape('jour', '');
    afficherErreursEtape('heure', '');
    mettreAJourResume();
    genererLesJours();
  }

  document.querySelectorAll('input[name="prestation"]').forEach((champ) => {
    champ.addEventListener('change', () => choisirPrestation(champ.value));
  });

  document.querySelectorAll('[data-prestation]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      choisirPrestation(bouton.dataset.prestation);
      afficherEtape(0);
      document.getElementById('reservation').scrollIntoView({ behavior: reduireMouvement.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('[data-suite]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const prochaine = Number(bouton.dataset.suite);
      if (prochaine === 1 && !etat.prestation) {
        afficherErreursEtape('prestation', 'Choisissez une prestation pour continuer.');
        document.querySelector('input[name="prestation"]')?.focus();
        return;
      }
      if (prochaine === 2 && !etat.jour) {
        afficherErreursEtape('jour', 'Choisissez un jour ouvert.');
        choixJours?.querySelector('button:not(:disabled)')?.focus();
        return;
      }
      if (prochaine === 3 && !etat.heure) {
        afficherErreursEtape('heure', 'Choisissez une heure libre pour cette démonstration.');
        choixHeures?.querySelector('button:not(:disabled)')?.focus();
        return;
      }
      if (prochaine === 2) genererLesHeures();
      afficherEtape(prochaine);
    });
  });

  document.querySelectorAll('[data-retour]').forEach((bouton) => {
    bouton.addEventListener('click', () => afficherEtape(Number(bouton.dataset.retour)));
  });

  document.querySelectorAll('[data-modifier]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!bouton.disabled) afficherEtape(Number(bouton.dataset.modifier));
    });
  });

  choixJours?.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('button[data-jour]');
    if (!bouton || bouton.disabled) return;
    etat.jour = bouton.dataset.jour;
    etat.heure = '';
    choixJours.querySelectorAll('[data-jour]').forEach((jour) => jour.setAttribute('aria-pressed', String(jour === bouton)));
    afficherErreursEtape('jour', '');
    afficherErreursEtape('heure', '');
    mettreAJourResume();
  });

  choixHeures?.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('button[data-heure]');
    if (!bouton || bouton.disabled) return;
    etat.heure = bouton.dataset.heure;
    choixHeures.querySelectorAll('[data-heure]').forEach((heure) => heure.setAttribute('aria-pressed', String(heure === bouton)));
    afficherErreursEtape('heure', '');
    mettreAJourResume();
  });

  function nettoyerTelephone(telephone) {
    let nettoye = telephone.replace(/[\s().-]/g, '');
    if (nettoye.startsWith('0033')) nettoye = `+33${nettoye.slice(4)}`;
    return nettoye;
  }

  function telephoneMobileValide(telephone) {
    return /^(?:0[67](?:\d{2}){4}|\+33[67](?:\d{2}){4})$/.test(nettoyerTelephone(telephone));
  }

  formulaire?.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = entreePrenom.value.trim();
    const telephone = entreeTelephone.value.trim();
    const erreurPrenom = document.getElementById('erreur-prenom');
    const erreurTelephone = document.getElementById('erreur-telephone');
    erreurPrenom.textContent = '';
    erreurTelephone.textContent = '';
    entreePrenom.removeAttribute('aria-invalid');
    entreeTelephone.removeAttribute('aria-invalid');

    let premierChampEnErreur = null;
    if (!prenom) {
      erreurPrenom.textContent = 'Saisissez votre prénom pour terminer la démonstration.';
      entreePrenom.setAttribute('aria-invalid', 'true');
      premierChampEnErreur = entreePrenom;
    }
    if (!telephoneMobileValide(telephone)) {
      erreurTelephone.textContent = 'Saisissez un mobile français commençant par 06, 07, +33 6 ou +33 7.';
      entreeTelephone.setAttribute('aria-invalid', 'true');
      premierChampEnErreur ||= entreeTelephone;
    }
    if (premierChampEnErreur) {
      premierChampEnErreur.focus();
      return;
    }

    etat.prenom = prenom;
    document.getElementById('texte-succes').textContent = `${prenom}, cette réservation était une simulation. Rien n’a été envoyé au salon.`;
    afficherEtape(4);
  });

  function revelerAuDefilement() {
    const elements = document.querySelectorAll('[data-revelation]');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('est-visible'));
      return;
    }
    const observateur = new IntersectionObserver((entrees, actif) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add('est-visible');
          actif.unobserve(entree.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -24px 0px' });
    elements.forEach((element) => observateur.observe(element));
  }

  genererLesJours();
  mettreAJourResume();
  revelerAuDefilement();
  parcours?.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape') {
      const active = etapes.find((etape) => !etape.hidden);
      if (active && Number(active.dataset.etape) > 0 && Number(active.dataset.etape) < 4) {
        afficherEtape(Number(active.dataset.etape) - 1);
      }
    }
  });
})();
