(() => {
  'use strict';

  const racine = document.documentElement;
  racine.classList.add('js');

  const prestations = {
    kobido: { nom: 'Massage facial Kobido', duree: 60 },
    'coupe-barbe': { nom: 'Coupe + barbe', duree: 60 },
    'entretien-barbe': { nom: 'Entretien barbe', duree: 25 }
  };
  // Horaires affichés sur Planity ; le mercredi reste à confirmer.
  const horaires = {
    0: null,
    1: null,
    2: [9 * 60, 19 * 60],
    3: [9 * 60, 19 * 60],
    4: [9 * 60, 19 * 60],
    5: [9 * 60, 19 * 60],
    6: [9 * 60, 19 * 60]
  };
  const formulaire = document.querySelector('#formulaire-reservation');
  const annonce = document.querySelector('#annonce-flux');
  const etapes = [...document.querySelectorAll('[data-etape]')];
  const indicateurs = [...document.querySelectorAll('[data-indicateur]')];
  const boutonJour = document.querySelector('[data-suivant="3"]');
  const boutonHeure = document.querySelector('[data-suivant="4"]');
  const panneauHeros = document.querySelector('.heros__panneau');
  const eventail = document.querySelector('.heros__eventail');
  const barreMobile = document.querySelector('#barre-mobile');
  const sectionReservation = document.querySelector('#reservation');
  const pied = document.querySelector('.pied');

  let etapeActuelle = 1;
  let prestationChoisie = '';
  let jourChoisi = null;
  let heureChoisie = null;

  const formatDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  const formatJour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

  const dateCle = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const minutesEnTexte = minutes => {
    const heure = Math.floor(minutes / 60).toString().padStart(2, '0');
    const minute = (minutes % 60).toString().padStart(2, '0');
    return `${heure} h ${minute}`;
  };

  const dateEnTexte = date => {
    const texte = formatDate.format(date);
    return texte.charAt(0).toLocaleUpperCase('fr-FR') + texte.slice(1);
  };

  const dateAujourdHui = () => {
    const maintenant = new Date();
    return new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  };

  const annoncerEtape = (numero, phrase) => {
    etapeActuelle = numero;
    annonce.textContent = `Étape ${numero} sur 4 · ${phrase}`;
    indicateurs.forEach(indicateur => {
      const active = Number(indicateur.dataset.indicateur) === numero;
      indicateur.classList.toggle('est-active', active);
      if (active) indicateur.setAttribute('aria-current', 'true');
      else indicateur.removeAttribute('aria-current');
    });
  };

  const ouvrirEtape = (numero, phrase, focaliser = true) => {
    const cible = etapes.find(section => Number(section.dataset.etape) === numero);
    if (!cible) return;
    document.querySelector('#confirmation').hidden = true;
    etapes.forEach(section => {
      section.hidden = section !== cible;
      section.classList.remove('est-visible');
    });
    requestAnimationFrame(() => {
      if (!cible.hidden) cible.classList.add('est-visible');
    });
    annoncerEtape(numero, phrase);
    if (focaliser) {
      const titre = cible.querySelector('h3');
      titre?.focus({ preventScroll: true });
      titre?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  };

  const montrerErreur = (numero, message) => {
    const emplacement = formulaire.querySelector(`[data-erreur="${numero}"]`);
    if (emplacement) emplacement.textContent = message;
  };

  const viderErreur = numero => montrerErreur(numero, '');

  const mettreAJourRecapitulatif = () => {
    const prestation = prestations[prestationChoisie];
    document.querySelector('#recap-prestation').textContent = prestation ? prestation.nom : 'À choisir';
    document.querySelector('#recap-jour').textContent = jourChoisi ? dateEnTexte(jourChoisi) : 'À choisir';
    document.querySelector('#recap-heure').textContent = heureChoisie || 'À choisir';
  };

  const dessinerJours = () => {
    const liste = document.querySelector('#liste-jours');
    liste.replaceChildren();
    const aujourdhui = dateAujourdHui();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdhui);
      date.setDate(aujourdhui.getDate() + decalage);
      const heuresJour = horaires[date.getDay()];
      const bouton = document.createElement('button');
      const libelle = dateEnTexte(date);
      bouton.type = 'button';
      bouton.className = 'jour';
      bouton.dataset.date = dateCle(date);
      bouton.setAttribute('aria-label', heuresJour ? `Choisir ${libelle}` : `${libelle}, fermé`);
      bouton.setAttribute('aria-pressed', jourChoisi && dateCle(jourChoisi) === dateCle(date) ? 'true' : 'false');

      const jourCourt = document.createElement('span');
      jourCourt.textContent = formatJour.format(date).replace('.', '');
      const quantieme = document.createElement('span');
      quantieme.textContent = String(date.getDate());
      bouton.append(jourCourt, quantieme);

      if (!heuresJour) {
        bouton.disabled = true;
        bouton.classList.add('jour--ferme');
        const ferme = document.createElement('span');
        ferme.textContent = 'Fermé';
        bouton.append(ferme);
      } else {
        bouton.addEventListener('click', () => {
          jourChoisi = date;
          heureChoisie = null;
          boutonHeure.disabled = true;
          dessinerJours();
          dessinerHeures();
          document.querySelector('[data-suivant="3"]').disabled = false;
          boutonJour.disabled = false;
          mettreAJourRecapitulatif();
          annonce.textContent = `Étape 2 sur 4 · ${dateEnTexte(date)} sélectionné.`;
          [...liste.querySelectorAll('.jour')].find(element => element.dataset.date === dateCle(date))?.focus({ preventScroll: true });
          viderErreur(2);
          viderErreur(3);
        });
      }
      liste.append(bouton);
    }
  };

  const codeDisponibilite = texte => {
    let total = 0;
    for (let index = 0; index < texte.length; index += 1) {
      total = ((total << 5) - total + texte.charCodeAt(index)) | 0;
    }
    return Math.abs(total);
  };

  const dessinerHeures = () => {
    const liste = document.querySelector('#liste-heures');
    const resumeJour = document.querySelector('#resume-jour');
    liste.replaceChildren();

    if (!jourChoisi || !prestationChoisie) {
      liste.textContent = 'Sélectionnez d’abord une prestation et un jour.';
      resumeJour.textContent = 'Sélectionnez d’abord un jour.';
      return;
    }

    const [ouverture, fermeture] = horaires[jourChoisi.getDay()];
    const duree = prestations[prestationChoisie].duree;
    const cle = dateCle(jourChoisi);
    const aujourdHui = dateCle(jourChoisi) === dateCle(dateAujourdHui());
    const maintenant = new Date();
    const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
    let nombreDisponible = 0;
    resumeJour.textContent = `${dateEnTexte(jourChoisi)} · horaires simulés selon Planity, à confirmer`;

    for (let depart = ouverture; depart + duree <= fermeture; depart += 30) {
      const heure = minutesEnTexte(depart);
      const dejaPris = codeDisponibilite(`${cle}-${prestationChoisie}-${depart}`) % 7 === 0;
      const passe = aujourdHui && depart <= minuteActuelle;
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'heure';
      bouton.dataset.minute = String(depart);
      bouton.textContent = heure;

      if (dejaPris || passe) {
        bouton.disabled = true;
        bouton.setAttribute('aria-label', `${heure}, ${passe ? 'heure passée' : 'déjà pris'}`);
        if (dejaPris) {
          const mention = document.createElement('span');
          mention.className = 'visuellement-cache';
          mention.textContent = 'Déjà pris';
          bouton.append(mention);
        }
      } else {
        nombreDisponible += 1;
        bouton.setAttribute('aria-pressed', heureChoisie === heure ? 'true' : 'false');
        bouton.addEventListener('click', () => {
          heureChoisie = heure;
          dessinerHeures();
          boutonHeure.disabled = false;
          mettreAJourRecapitulatif();
          annonce.textContent = `Étape 3 sur 4 · ${heure} sélectionnée.`;
          [...liste.querySelectorAll('.heure')].find(element => element.dataset.minute === String(depart))?.focus({ preventScroll: true });
          viderErreur(3);
        });
      }
      liste.append(bouton);
    }

    if (nombreDisponible === 0) {
      liste.textContent = 'Aucune heure disponible dans la simulation pour cette journée.';
    }
  };

  const selectionner = numero => {
    if (numero === 1) {
      ouvrirEtape(1, 'Choisissez une prestation.');
      return;
    }
    if (numero === 2) {
      if (!prestationChoisie) {
        ouvrirEtape(1, 'Choisissez une prestation.');
        montrerErreur(1, 'Choisissez une prestation pour continuer.');
        return;
      }
      dessinerJours();
      ouvrirEtape(2, 'Choisissez un jour.');
      return;
    }
    if (numero === 3) {
      if (!jourChoisi) {
        ouvrirEtape(2, 'Choisissez un jour.');
        montrerErreur(2, 'Choisissez une journée ouverte pour continuer.');
        return;
      }
      dessinerHeures();
      ouvrirEtape(3, 'Choisissez une heure.');
      return;
    }
    if (numero === 4) {
      if (!heureChoisie) {
        ouvrirEtape(3, 'Choisissez une heure.');
        montrerErreur(3, 'Choisissez une heure disponible pour continuer.');
        return;
      }
      ouvrirEtape(4, 'Ajoutez vos coordonnées.');
    }
  };

  formulaire.addEventListener('change', evenement => {
    if (evenement.target.name !== 'prestation') return;
    prestationChoisie = evenement.target.value;
    heureChoisie = null;
    boutonHeure.disabled = true;
    mettreAJourRecapitulatif();
    annonce.textContent = `Étape 1 sur 4 · ${prestations[prestationChoisie].nom} sélectionnée.`;
    if (jourChoisi) dessinerHeures();
    viderErreur(1);
    viderErreur(3);
  });

  document.querySelectorAll('[data-suivant]').forEach(bouton => {
    bouton.addEventListener('click', () => {
      const destination = Number(bouton.dataset.suivant);
      if (destination === 2 && !prestationChoisie) {
        montrerErreur(1, 'Choisissez une prestation pour continuer.');
        return;
      }
      if (destination === 3 && !jourChoisi) {
        montrerErreur(2, 'Choisissez une journée ouverte pour continuer.');
        return;
      }
      if (destination === 4 && !heureChoisie) {
        montrerErreur(3, 'Choisissez une heure disponible pour continuer.');
        return;
      }
      selectionner(destination);
    });
  });

  document.querySelectorAll('[data-precedent]').forEach(bouton => {
    bouton.addEventListener('click', () => selectionner(Number(bouton.dataset.precedent)));
  });

  document.querySelectorAll('[data-modifier]').forEach(bouton => {
    bouton.addEventListener('click', () => selectionner(Number(bouton.dataset.modifier)));
  });

  const validerPrenom = () => {
    const champ = document.querySelector('#prenom');
    const erreur = document.querySelector('#erreur-prenom');
    const valeur = champ.value.trim();
    const valide = valeur.length > 0 && valeur.length <= 50;
    champ.setAttribute('aria-invalid', valide ? 'false' : 'true');
    erreur.textContent = valide ? '' : 'Saisissez votre prénom pour continuer.';
    return valide;
  };

  const validerTelephone = () => {
    const champ = document.querySelector('#telephone');
    const erreur = document.querySelector('#erreur-telephone');
    const chiffres = champ.value.replace(/[^0-9+]/g, '');
    const valide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(chiffres);
    champ.setAttribute('aria-invalid', valide ? 'false' : 'true');
    erreur.textContent = valide ? '' : 'Saisissez un numéro de mobile français valide.';
    return valide;
  };

  document.querySelector('#prenom').addEventListener('input', () => {
    if (document.querySelector('#prenom').getAttribute('aria-invalid') === 'true') validerPrenom();
  });
  document.querySelector('#telephone').addEventListener('input', () => {
    if (document.querySelector('#telephone').getAttribute('aria-invalid') === 'true') validerTelephone();
  });

  formulaire.addEventListener('submit', evenement => {
    evenement.preventDefault();
    if (!validerPrenom()) {
      document.querySelector('#prenom').focus();
      return;
    }
    if (!validerTelephone()) {
      document.querySelector('#telephone').focus();
      return;
    }

    etapes.forEach(section => { section.hidden = true; });
    const succes = document.querySelector('#confirmation');
    succes.hidden = false;
    indicateurs.forEach(indicateur => {
      indicateur.removeAttribute('aria-current');
    });
    annonce.textContent = 'Simulation terminée. Aucun rendez-vous n’a été enregistré.';
    const prenom = document.querySelector('#prenom').value.trim();
    document.querySelector('#message-confirmation').textContent = `${prenom}, votre sélection pour ${dateEnTexte(jourChoisi)} à ${heureChoisie} est affichée ici. Aucune donnée n’a été transmise au salon.`;
    document.querySelector('#titre-confirmation').focus({ preventScroll: true });
  });

  document.querySelector('#recommencer').addEventListener('click', () => {
    formulaire.reset();
    prestationChoisie = '';
    jourChoisi = null;
    heureChoisie = null;
    document.querySelector('#confirmation').hidden = true;
    document.querySelector('#prenom').removeAttribute('aria-invalid');
    document.querySelector('#telephone').removeAttribute('aria-invalid');
    document.querySelector('#erreur-prenom').textContent = '';
    document.querySelector('#erreur-telephone').textContent = '';
    document.querySelector('[data-suivant="3"]').disabled = true;
    document.querySelector('[data-suivant="4"]').disabled = true;
    mettreAJourRecapitulatif();
    ouvrirEtape(1, 'Choisissez une prestation.');
  });

  const attenteBoutonEtape = formulaire.querySelector('[data-suivant="3"]');
  attenteBoutonEtape.disabled = true;
  boutonHeure.disabled = true;
  mettreAJourRecapitulatif();

  const observerRevelation = 'IntersectionObserver' in window
    ? new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add('est-revele');
        observerRevelation.unobserve(entree.target);
      });
    }, { threshold: 0.16 })
    : null;

  document.querySelectorAll('[data-revelation]').forEach(element => {
    if (observerRevelation) observerRevelation.observe(element);
    else element.classList.add('est-revele');
  });

  const montrerHeros = () => {
    panneauHeros?.classList.add('est-visible');
    eventail?.classList.add('est-visible');
  };
  requestAnimationFrame(() => requestAnimationFrame(montrerHeros));

  if ('IntersectionObserver' in window && barreMobile) {
    const observerBarre = new IntersectionObserver(entrees => {
      const masquer = entrees.some(entree => entree.isIntersecting);
      barreMobile.classList.toggle('est-cachee', masquer);
    }, { threshold: 0.05 });
    if (sectionReservation) observerBarre.observe(sectionReservation);
    if (pied) observerBarre.observe(pied);
  }
})();
