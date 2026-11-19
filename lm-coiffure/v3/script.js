window.__site = 1;
(() => {
  'use strict';

  const doc = document;
  const racine = doc.documentElement;
  const reduireMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menuBouton = doc.querySelector('.navigation__bouton');
  const menu = doc.querySelector('.navigation');
  const barreMobile = doc.querySelector('.barre-mobile');
  const zoneIntro = doc.querySelector('.ouverture');
  const zoneRendezVous = doc.querySelector('.rendez-vous');
  const pied = doc.querySelector('.pied');
  const formulaire = doc.querySelector('#formulaire-rendez-vous');
  const panneau = doc.querySelector('#contenu-etape');
  const joursSouhaites = {
    prestation: '',
    jour: '',
    prenom: '',
    telephone: ''
  };
  let etapeActuelle = 1;
  let changementEnCours = false;

  function ouvrirMenu(ouvrir) {
    if (!menuBouton || !menu) return;
    menuBouton.setAttribute('aria-expanded', String(ouvrir));
    menuBouton.setAttribute('aria-label', ouvrir ? 'Fermer la navigation' : 'Ouvrir la navigation');
    menu.classList.toggle('ouverte', ouvrir);
    if (ouvrir) {
      const premierLien = menu.querySelector('a');
      if (premierLien) premierLien.focus();
    } else {
      menuBouton.focus();
    }
  }

  if (menuBouton && menu) {
    menuBouton.addEventListener('click', () => {
      ouvrirMenu(menuBouton.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', (evenement) => {
      if (evenement.target.closest('a')) ouvrirMenu(false);
    });
    doc.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Escape' && menuBouton.getAttribute('aria-expanded') === 'true') {
        ouvrirMenu(false);
      }
    });
  }

  function mettreAJourProgression() {
    doc.querySelectorAll('[data-progression]').forEach((element) => {
      const estActif = Number(element.dataset.progression) === etapeActuelle;
      if (estActif) element.setAttribute('aria-current', 'step');
      else element.removeAttribute('aria-current');
    });
  }

  function afficherResume() {
    const resumePrestation = doc.querySelector('#resume-prestation');
    const resumeJour = doc.querySelector('#resume-jour');
    const resumeContact = doc.querySelector('#resume-contact');
    if (resumePrestation) resumePrestation.textContent = joursSouhaites.prestation || 'À choisir';
    if (resumeJour) {
      if (!joursSouhaites.jour) resumeJour.textContent = 'Non défini';
      else {
        const date = new Date(`${joursSouhaites.jour}T12:00:00`);
        resumeJour.textContent = new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).format(date);
      }
    }
    if (resumeContact) resumeContact.textContent = joursSouhaites.prenom ? `${joursSouhaites.prenom} · coordonnées saisies` : 'Non renseignées';
  }

  function enregistrerRetard() {
    panneau.querySelectorAll('.apparition').forEach((element, index) => {
      element.style.setProperty('--retard', `${Math.min(index * 40, 240)}ms`);
      element.classList.add('visible');
    });
  }

  function passerA(nouvelleEtape) {
    if (!panneau || changementEnCours) return;
    changementEnCours = true;
    etapeActuelle = nouvelleEtape;
    mettreAJourProgression();
    panneau.classList.add('sortie');

    const delai = reduireMouvement.matches ? 0 : 110;
    window.setTimeout(() => {
      panneau.innerHTML = contenuEtape(nouvelleEtape);
      panneau.classList.remove('sortie');
      panneau.classList.add('entree');
      enregistrerRetard();
      afficherResume();

      window.requestAnimationFrame(() => {
        panneau.classList.remove('entree');
        const titre = panneau.querySelector('#titre-etape');
        if (titre) titre.focus();
        changementEnCours = false;
      });
    }, delai);
  }

  function contenuEtape(numero) {
    if (numero === 1) {
      return `
        <h3 class="reservation__titre" id="titre-etape" tabindex="-1">Choisissez un repère</h3>
        <fieldset class="choix" aria-describedby="aide-prestation erreur-prestation">
          <legend>Prestation envisagée</legend>
          <label class="choix__ligne" for="prestation-coupe"><input id="prestation-coupe" type="radio" name="prestation" value="Coupe" ${joursSouhaites.prestation === 'Coupe' ? 'checked' : ''}><span>Coupe</span><span class="etat">À confirmer</span></label>
          <label class="choix__ligne" for="prestation-coloration"><input id="prestation-coloration" type="radio" name="prestation" value="Coloration" ${joursSouhaites.prestation === 'Coloration' ? 'checked' : ''}><span>Coloration</span><span class="etat">À confirmer</span></label>
          <label class="choix__ligne" for="prestation-meches"><input id="prestation-meches" type="radio" name="prestation" value="Mèches" ${joursSouhaites.prestation === 'Mèches' ? 'checked' : ''}><span>Mèches</span><span class="etat">À confirmer</span></label>
          <p class="aide" id="aide-prestation">Choix tirés de mentions d’annuaire, à valider par téléphone.</p>
          <p class="erreur" id="erreur-prestation" role="alert" hidden>Choisissez un repère ou appelez le salon.</p>
        </fieldset>
        <div class="reservation__actions"><span class="reservation__indication">Étape 1 sur 3</span><button class="bouton bouton--violet" type="button" data-action="suivante">Continuer <span aria-hidden="true">→</span></button></div>`;
    }

    if (numero === 2) {
      const minimum = dateLocaleCourante();
      return `
        <h3 class="reservation__titre" id="titre-etape" tabindex="-1">Quel jour vous conviendrait&nbsp;?</h3>
        <div class="reservation__champ">
          <label for="jour-souhaite">Jour souhaité <span>(facultatif)</span></label>
          <input id="jour-souhaite" name="jour-souhaite" type="date" min="${minimum}" value="${joursSouhaites.jour}" autocomplete="off" aria-describedby="aide-jour">
          <small class="reservation__aide" id="aide-jour">Cette date exprime une préférence, pas une disponibilité. À confirmer par téléphone.</small>
        </div>
        <div class="reservation__boutons">
          <button class="bouton bouton--clair" type="button" data-action="precedente">← Précédent</button>
          <button class="bouton bouton--violet" type="button" data-action="suivante">Continuer <span aria-hidden="true">→</span></button>
        </div>`;
    }

    if (numero === 3) {
      return `
        <h3 class="reservation__titre" id="titre-etape" tabindex="-1">Comment vous joindre&nbsp;?</h3>
        <div class="reservation__champ">
          <label for="prenom-rendez-vous">Prénom</label>
          <input id="prenom-rendez-vous" name="prenom" type="text" autocomplete="given-name" maxlength="60" value="${echapper(joursSouhaites.prenom)}" required aria-describedby="erreur-prenom">
          <small class="erreur" id="erreur-prenom" role="alert" hidden>Saisissez votre prénom.</small>
        </div>
        <div class="reservation__champ">
          <label for="telephone-rendez-vous">Téléphone</label>
          <input id="telephone-rendez-vous" name="telephone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="24" value="${echapper(joursSouhaites.telephone)}" required aria-describedby="aide-telephone erreur-telephone">
          <small class="reservation__aide" id="aide-telephone">Aucune donnée ne sera envoyée depuis cette simulation.</small>
          <small class="erreur" id="erreur-telephone" role="alert" hidden>Vérifiez le numéro saisi.</small>
        </div>
        <div class="reservation__boutons">
          <button class="bouton bouton--clair" type="button" data-action="precedente">← Précédent</button>
          <button class="bouton bouton--violet" type="button" data-action="terminer">Terminer la simulation</button>
        </div>`;
    }

    return '';
  }

  function dateLocaleCourante() {
    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
    const jour = String(maintenant.getDate()).padStart(2, '0');
    return `${annee}-${mois}-${jour}`;
  }

  function choixPrestation() {
    const choisie = formulaire.querySelector('input[name="prestation"]:checked');
    return choisie ? choisie.value : '';
  }

  function afficherErreurPrestation(afficher) {
    const erreur = doc.querySelector('#erreur-prestation');
    if (erreur) erreur.hidden = !afficher;
  }

  function numeroValide(valeur) {
    const chiffres = valeur.replace(/[\s().-]/g, '');
    return /^(?:(?:\+|00)33|0)[67]\d{8}$/.test(chiffres);
  }

  function terminerSimulation() {
    if (changementEnCours) return;
    const champPrenom = doc.querySelector('#prenom-rendez-vous');
    const champTelephone = doc.querySelector('#telephone-rendez-vous');
    const erreurPrenom = doc.querySelector('#erreur-prenom');
    const erreurTelephone = doc.querySelector('#erreur-telephone');
    const prenom = champPrenom ? champPrenom.value.trim() : '';
    const telephone = champTelephone ? champTelephone.value.trim() : '';
    const prenomValide = prenom.length > 0;
    const telephoneEstValide = numeroValide(telephone);

    if (erreurPrenom) erreurPrenom.hidden = prenomValide;
    if (erreurTelephone) erreurTelephone.hidden = telephoneEstValide;
    if (champPrenom) champPrenom.setAttribute('aria-invalid', String(!prenomValide));
    if (champTelephone) champTelephone.setAttribute('aria-invalid', String(!telephoneEstValide));
    if (!prenomValide) { champPrenom.focus(); return; }
    if (!telephoneEstValide) { champTelephone.focus(); return; }

    joursSouhaites.prenom = prenom;
    joursSouhaites.telephone = telephone;
    afficherResume();
    changementEnCours = true;
    panneau.classList.add('sortie');
    window.setTimeout(() => {
      panneau.innerHTML = `
        <div class="reussite">
          <p class="reussite__repere">Simulation terminée</p>
          <h3 class="reservation__titre" id="titre-etape" tabindex="-1">Rien n’a été envoyé.</h3>
          <p class="reussite__texte">${echapper(prenom)}, votre préférence pour ${echapper(joursSouhaites.prestation)}${joursSouhaites.jour ? ` le ${formaterJour(joursSouhaites.jour)}` : ''} est seulement affichée ici. Appelez le salon pour confirmer la prestation, le jour et la disponibilité.</p>
          <p class="reussite__texte">06&nbsp;58&nbsp;06&nbsp;96&nbsp;73</p>
          <div class="reservation__boutons">
            <a class="bouton bouton--violet" href="tel:+33658069673">Appeler le salon</a>
            <button class="bouton bouton--clair" type="button" data-action="recommencer">Recommencer</button>
          </div>
        </div>`;
      panneau.classList.remove('sortie');
      panneau.classList.add('entree');
      window.requestAnimationFrame(() => {
        panneau.classList.remove('entree');
        const titre = panneau.querySelector('#titre-etape');
        if (titre) titre.focus();
        changementEnCours = false;
      });
    }, reduireMouvement.matches ? 0 : 110);
  }

  function formaterJour(valeur) {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(`${valeur}T12:00:00`));
  }

  function echapper(valeur) {
    return valeur.replace(/[&<>"']/g, (caractere) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caractere]));
  }

  function reinitialiserSimulation() {
    joursSouhaites.prestation = '';
    joursSouhaites.jour = '';
    joursSouhaites.prenom = '';
    joursSouhaites.telephone = '';
    etapeActuelle = 1;
    mettreAJourProgression();
    panneau.innerHTML = contenuEtape(1);
    afficherResume();
    panneau.classList.add('entree');
    window.requestAnimationFrame(() => {
      panneau.classList.remove('entree');
      const titre = panneau.querySelector('#titre-etape');
      if (titre) titre.focus();
    });
  }

  if (formulaire && panneau) {
    formulaire.addEventListener('input', (evenement) => {
      if (evenement.target.name === 'prenom') joursSouhaites.prenom = evenement.target.value.trim();
      if (evenement.target.name === 'telephone') joursSouhaites.telephone = evenement.target.value.trim();
      afficherResume();
    });
    formulaire.addEventListener('change', (evenement) => {
      if (evenement.target.name === 'prestation') {
        joursSouhaites.prestation = choixPrestation();
        afficherErreurPrestation(false);
        afficherResume();
      }
      if (evenement.target.name === 'jour-souhaite') {
        joursSouhaites.jour = evenement.target.value;
        afficherResume();
      }
    });

    formulaire.addEventListener('click', (evenement) => {
      const bouton = evenement.target.closest('[data-action]');
      if (!bouton) return;
      const action = bouton.dataset.action;

      if (action === 'suivante' && etapeActuelle === 1) {
        joursSouhaites.prestation = choixPrestation();
        if (!joursSouhaites.prestation) {
          afficherErreurPrestation(true);
          formulaire.querySelector('input[name="prestation"]')?.focus();
          return;
        }
        passerA(2);
      } else if (action === 'suivante' && etapeActuelle === 2) {
        const champJour = doc.querySelector('#jour-souhaite');
        joursSouhaites.jour = champJour ? champJour.value : '';
        afficherResume();
        passerA(3);
      } else if (action === 'precedente' && etapeActuelle > 1) {
        passerA(etapeActuelle - 1);
      } else if (action === 'terminer') {
        terminerSimulation();
      } else if (action === 'recommencer') {
        reinitialiserSimulation();
      }
    });

    formulaire.addEventListener('submit', (evenement) => evenement.preventDefault());
  }

  const elementsAReveler = doc.querySelectorAll('.apparition, .chronologie');
  if ('IntersectionObserver' in window) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        const element = entree.target;
        const parent = element.parentElement;
        const freres = parent ? Array.from(parent.children).filter((enfant) => enfant.matches('.apparition, .chronologie')) : [];
        const rang = freres.indexOf(element);
        const retard = element.hasAttribute('data-delai') ? Number(element.dataset.delai) : Math.max(0, rang) * 40;
        element.style.setProperty('--retard', `${retard}ms`);
        if (element.classList.contains('chronologie')) {
          element.querySelectorAll('.chronologie__traits span').forEach((trait, index) => {
            trait.style.setProperty('--retard', `${retard + index * 40}ms`);
          });
        }
        element.classList.add('visible');
        instance.unobserve(element);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
    elementsAReveler.forEach((element) => observateur.observe(element));
  } else {
    elementsAReveler.forEach((element) => element.classList.add('visible'));
  }

  if (barreMobile && 'IntersectionObserver' in window) {
    let introductionVisible = true;
    let rendezVousVisible = false;
    let piedVisible = false;
    const observerBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === zoneIntro) introductionVisible = entree.isIntersecting;
        if (entree.target === zoneRendezVous) rendezVousVisible = entree.isIntersecting;
        if (entree.target === pied) piedVisible = entree.isIntersecting;
      });
      barreMobile.classList.toggle('cachee', introductionVisible || rendezVousVisible || piedVisible);
    }, { threshold: 0.06 });
    if (zoneIntro) observerBarre.observe(zoneIntro);
    if (zoneRendezVous) observerBarre.observe(zoneRendezVous);
    if (pied) observerBarre.observe(pied);
  } else if (barreMobile) {
    barreMobile.classList.remove('cachee');
  }

  racine.classList.add('js');
})();
