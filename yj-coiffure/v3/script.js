document.documentElement.classList.add('js');

const navigation = document.querySelector('#navigation');
const boutonNavigation = document.querySelector('#navigation-commande');

if (navigation && boutonNavigation) {
  const fermerNavigation = (rendreFocus) => {
    navigation.classList.remove('is-visible');
    boutonNavigation.setAttribute('aria-expanded', 'false');
    boutonNavigation.setAttribute('aria-label', 'Afficher la navigation');
    if (rendreFocus) boutonNavigation.focus();
  };

  boutonNavigation.addEventListener('click', () => {
    const ouverte = boutonNavigation.getAttribute('aria-expanded') === 'true';
    boutonNavigation.setAttribute('aria-expanded', String(!ouverte));
    boutonNavigation.setAttribute('aria-label', ouverte ? 'Afficher la navigation' : 'Masquer la navigation');
    navigation.classList.toggle('is-visible', !ouverte);
    if (!ouverte) navigation.querySelector('a')?.focus();
  });

  navigation.querySelectorAll('a').forEach((lien) => {
    lien.addEventListener('click', () => fermerNavigation(true));
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && boutonNavigation.getAttribute('aria-expanded') === 'true') {
      fermerNavigation(true);
    }
  });
}

const revelations = document.querySelectorAll('[data-revelation]');
if ('IntersectionObserver' in window && revelations.length) {
  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach((entree) => {
      if (entree.isIntersecting) {
        entree.target.classList.add('est-visible');
        instance.unobserve(entree.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -5% 0px' });
  revelations.forEach((element) => observateur.observe(element));
} else {
  revelations.forEach((element) => element.classList.add('est-visible'));
}

const formulaire = document.querySelector('#formulaire-rdv');
const repli = document.querySelector('#rdv-fallback');
const recapitulatifTexte = document.querySelector('#recapitulatif-texte');
const groupeJours = document.querySelector('#jours');
const groupeHeures = document.querySelector('#heures');
const attenteHeures = document.querySelector('#heures-attente');
const confirmation = document.querySelector('#confirmation');
const confirmationTexte = document.querySelector('#confirmation-texte');
const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');

if (formulaire && repli && groupeJours && groupeHeures && attenteHeures) {
  formulaire.hidden = false;
  repli.hidden = true;

  const choix = { motif: '', jour: null, heure: '' };
  const panneaux = new Map(
    Array.from(formulaire.querySelectorAll('[data-panneau]')).map((panneau) => [panneau.dataset.panneau, panneau])
  );
  let etapeActive = 'motif';

  const formatteurDate = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long'
  });
  const partiesDate = (date) => {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const lire = (nom) => parties.find((partie) => partie.type === nom)?.value || '';
    return { annee: Number(lire('year')), mois: Number(lire('month')), jour: Number(lire('day')) };
  };
  const creerDateParis = (decalage) => {
    const maintenant = partiesDate(new Date());
    return new Date(Date.UTC(maintenant.annee, maintenant.mois - 1, maintenant.jour + decalage, 12));
  };
  const dateIso = (date) => [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  const heureParis = () => {
    const parties = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const lire = (nom) => Number(parties.find((partie) => partie.type === nom)?.value || 0);
    return lire('hour') * 60 + lire('minute');
  };
  const dateAujourdhui = dateIso(creerDateParis(0));

  const mettreAJourRecapitulatif = () => {
    if (!choix.motif) {
      recapitulatifTexte.textContent = 'Aucun choix pour le moment.';
      return;
    }
    const morceaux = [choix.motif];
    if (choix.jour) morceaux.push(formatteurDate.format(choix.jour.date));
    if (choix.heure) morceaux.push(choix.heure);
    recapitulatifTexte.textContent = morceaux.join(' · ');
  };

  const actualiserEtapes = () => {
    const dateChoisie = Boolean(choix.jour && choix.heure);
    formulaire.querySelectorAll('[data-etape]').forEach((bouton) => {
      const nom = bouton.dataset.etape;
      bouton.disabled = nom === 'date' ? !choix.motif : nom === 'coordonnees' ? !dateChoisie : false;
      if (nom === etapeActive) bouton.setAttribute('aria-current', 'true');
      else bouton.removeAttribute('aria-current');
    });
  };

  const allerA = (nom, rendreFocus = true) => {
    const panneauActuel = panneaux.get(etapeActive);
    const panneauSuivant = panneaux.get(nom);
    if (!panneauSuivant || nom === etapeActive) return;
    etapeActive = nom;
    actualiserEtapes();
    if (reduireMouvement.matches || !panneauActuel) {
      if (panneauActuel) panneauActuel.hidden = true;
      panneauSuivant.hidden = false;
      if (rendreFocus) panneauSuivant.querySelector('h3')?.focus();
      return;
    }

    panneauActuel.classList.add('is-sortie');
    panneauSuivant.hidden = false;
    panneauSuivant.classList.add('is-entree');
    window.requestAnimationFrame(() => panneauSuivant.classList.add('is-entree-active'));
    window.setTimeout(() => {
      panneauActuel.hidden = true;
      panneauActuel.classList.remove('is-sortie');
      panneauSuivant.classList.remove('is-entree', 'is-entree-active');
      if (rendreFocus) panneauSuivant.querySelector('h3')?.focus();
    }, 240);
  };

  const creerHeures = () => {
    groupeHeures.replaceChildren();
    choix.heure = '';
    if (!choix.jour) {
      attenteHeures.hidden = false;
      return;
    }
    attenteHeures.hidden = true;
    for (let minutes = 9 * 60 + 30; minutes <= 18 * 60 + 30; minutes += 60) {
      const heure = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.textContent = heure;
      bouton.setAttribute('aria-pressed', 'false');
      const dejaPasse = choix.jour.iso === dateAujourdhui && minutes <= heureParis();
      if (dejaPasse) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', heure + ', heure déjà passée');
      } else {
        bouton.setAttribute('aria-label', 'Choisir ' + heure + ' comme heure souhaitée');
        bouton.addEventListener('click', () => {
          choix.heure = heure;
          groupeHeures.querySelectorAll('button').forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
          document.querySelector('#erreur-date').textContent = '';
          mettreAJourRecapitulatif();
          actualiserEtapes();
        });
      }
      groupeHeures.append(bouton);
    }
  };

  const creerJours = () => {
    groupeJours.replaceChildren();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = creerDateParis(decalage);
      const jourSemaine = date.getUTCDay();
      const iso = dateIso(date);
      const bouton = document.createElement('button');
      const nomCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short' }).format(date).replace('.', '');
      const nomComplet = formatteurDate.format(date);
      const nomJour = document.createElement('span');
      const numeroJour = document.createElement('span');
      nomJour.textContent = nomCourt;
      numeroJour.textContent = String(date.getUTCDate());
      bouton.type = 'button';
      bouton.dataset.decalage = String(decalage);
      bouton.append(nomJour, numeroJour);
      bouton.setAttribute('aria-pressed', 'false');
      if (jourSemaine === 0) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', nomComplet + ', fermé');
        const fermeture = document.createElement('span');
        fermeture.className = 'jour__fermeture';
        fermeture.textContent = 'Fermé';
        bouton.append(fermeture);
      } else {
        bouton.setAttribute('aria-label', 'Choisir le ' + nomComplet);
        bouton.addEventListener('click', () => {
          choix.jour = { date, iso, libelle: nomComplet };
          groupeJours.querySelectorAll('button').forEach((autre) => autre.setAttribute('aria-pressed', String(autre === bouton)));
          document.querySelector('#erreur-date').textContent = '';
          creerHeures();
          mettreAJourRecapitulatif();
          actualiserEtapes();
        });
      }
      groupeJours.append(bouton);
    }
  };

  formulaire.querySelectorAll('input[name="motif"]').forEach((champ) => {
    champ.addEventListener('change', () => {
      choix.motif = champ.value;
      document.querySelector('#erreur-motif').textContent = '';
      mettreAJourRecapitulatif();
      actualiserEtapes();
    });
  });

  formulaire.querySelectorAll('[data-suivant]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const cible = bouton.dataset.suivant;
      if (etapeActive === 'motif' && !choix.motif) {
        document.querySelector('#erreur-motif').textContent = 'Choisissez un motif avant de continuer.';
        formulaire.querySelector('input[name="motif"]')?.focus();
        return;
      }
      if (etapeActive === 'date' && !(choix.jour && choix.heure)) {
        document.querySelector('#erreur-date').textContent = 'Choisissez un jour et une heure souhaitée.';
        return;
      }
      if (cible === 'coordonnees' && !(choix.jour && choix.heure)) return;
      allerA(cible);
    });
  });

  formulaire.querySelectorAll('[data-precedent]').forEach((bouton) => {
    bouton.addEventListener('click', () => allerA(bouton.dataset.precedent));
  });

  formulaire.querySelectorAll('[data-etape]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      if (!bouton.disabled && bouton.dataset.etape !== etapeActive) allerA(bouton.dataset.etape);
    });
  });

  const champPrenom = document.querySelector('#prenom');
  const champTelephone = document.querySelector('#telephone');
  const messagePrenom = document.querySelector('#erreur-prenom');
  const messageTelephone = document.querySelector('#erreur-telephone');

  champPrenom.addEventListener('input', () => {
    if (champPrenom.getAttribute('aria-invalid') === 'true') {
      champPrenom.removeAttribute('aria-invalid');
      messagePrenom.textContent = '';
    }
  });
  champTelephone.addEventListener('input', () => {
    if (champTelephone.getAttribute('aria-invalid') === 'true') {
      champTelephone.removeAttribute('aria-invalid');
      messageTelephone.textContent = '';
    }
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const mobileNormalise = telephone.replace(/[\s.\-\u00a0]/g, '');
    const prenomValide = prenom.length >= 2;
    const telephoneValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(mobileNormalise);

    champPrenom.setAttribute('aria-invalid', String(!prenomValide));
    champTelephone.setAttribute('aria-invalid', String(!telephoneValide));
    messagePrenom.textContent = prenomValide ? '' : 'Indiquez un prénom d’au moins deux caractères.';
    messageTelephone.textContent = telephoneValide ? '' : 'Saisissez un numéro de mobile français valide.';
    if (!prenomValide || !telephoneValide) {
      (prenomValide ? champTelephone : champPrenom).focus();
      return;
    }

    panneaux.forEach((panneau) => { panneau.hidden = true; });
    confirmation.hidden = false;
    confirmationTexte.textContent = prenom + ', voici votre souhait : ' + choix.motif + ', le ' + choix.jour.libelle + ' à ' + choix.heure + '.';
    formulaire.querySelectorAll('[data-etape]').forEach((bouton) => bouton.removeAttribute('aria-current'));
    confirmation.querySelector('h3')?.focus();
  });

  document.querySelector('#modifier-demande')?.addEventListener('click', () => {
    confirmation.hidden = true;
    etapeActive = 'coordonnees';
    panneaux.forEach((panneau, nom) => { panneau.hidden = nom !== 'coordonnees'; });
    actualiserEtapes();
    panneaux.get('coordonnees')?.querySelector('h3')?.focus();
  });

  creerJours();
  mettreAJourRecapitulatif();
  actualiserEtapes();
}
