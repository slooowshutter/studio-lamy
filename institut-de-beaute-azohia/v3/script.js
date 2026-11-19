(() => {
  "use strict";

  const racine = document.documentElement;
  racine.classList.add("js");

  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  const entete = document.querySelector(".site-header");
  const boutonNavigation = document.querySelector(".nav-toggle");
  const liensNavigation = document.querySelector(".site-nav__links");

  if (entete && boutonNavigation && liensNavigation) {
    const fermerNavigation = (rendreLeFocus = false) => {
      entete.removeAttribute("data-navigation-ouverte");
      boutonNavigation.setAttribute("aria-expanded", "false");
      boutonNavigation.setAttribute("aria-label", "Ouvrir la navigation");
      if (rendreLeFocus) boutonNavigation.focus();
    };

    boutonNavigation.addEventListener("click", () => {
      const estOuverte = entete.getAttribute("data-navigation-ouverte") === "true";
      if (estOuverte) {
        fermerNavigation();
        return;
      }
      entete.setAttribute("data-navigation-ouverte", "true");
      boutonNavigation.setAttribute("aria-expanded", "true");
      boutonNavigation.setAttribute("aria-label", "Fermer la navigation");
      const premierLien = liensNavigation.querySelector("a");
      if (premierLien && window.matchMedia("(max-width: 680px)").matches) premierLien.focus();
    });

    liensNavigation.addEventListener("click", (evenement) => {
      if (evenement.target.closest("a") && window.matchMedia("(max-width: 680px)").matches) fermerNavigation();
    });

    document.addEventListener("keydown", (evenement) => {
      if (evenement.key === "Escape" && entete.getAttribute("data-navigation-ouverte") === "true") {
        fermerNavigation(true);
      }
    });
  }

  const mosaïqueHero = document.querySelector(".hero-grid");
  if (mosaïqueHero) requestAnimationFrame(() => mosaïqueHero.classList.add("is-entered"));

  const elementsAReveler = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add("is-visible");
        observateur.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
    elementsAReveler.forEach((element) => observateurRevelation.observe(element));
  } else {
    elementsAReveler.forEach((element) => element.classList.add("is-visible"));
  }

  const reservation = document.querySelector("#reservation");
  const piedDePage = document.querySelector(".site-footer");
  const barreMobile = document.querySelector("#barre-mobile");
  if (barreMobile && "IntersectionObserver" in window) {
    const zonesSansBarre = new IntersectionObserver((entrees) => {
      const masquer = entrees.some((entree) => entree.isIntersecting);
      barreMobile.hidden = masquer;
    }, { threshold: 0.12 });
    if (reservation) zonesSansBarre.observe(reservation);
    if (piedDePage) zonesSansBarre.observe(piedDePage);
  }

  const formulaire = document.querySelector("#formulaire-simulation");
  if (!formulaire) return;

  const panneaux = Array.from(formulaire.querySelectorAll("[data-panneau]"));
  const boutonsEtapes = Array.from(document.querySelectorAll("[data-retour-etape]"));
  const boutonSuivantPrestation = document.querySelector('[data-suivant="1"]');
  const boutonSuivantJour = document.querySelector('[data-suivant="2"]');
  const boutonSuivantHeure = document.querySelector('[data-suivant="3"]');
  const listeJours = document.querySelector("#liste-jours");
  const listeHoraires = document.querySelector("#liste-horaires");
  const etatSimulation = document.querySelector("#etat-simulation");
  const annoncePrestation = document.querySelector("#recap-prestation");
  const annonceJour = document.querySelector("#recap-jour");
  const annonceHeure = document.querySelector("#recap-heure");
  const confirmation = document.querySelector("#confirmation-simulation");
  const formulaireEtapes = document.querySelector("#formulaire-simulation");
  const titreConfirmation = document.querySelector("#titre-confirmation");
  const texteConfirmation = document.querySelector("#recap-confirmation");
  const boutonRecommencer = document.querySelector("#recommencer");
  const champPrenom = document.querySelector("#prenom");
  const champTelephone = document.querySelector("#telephone");
  const erreurPrenom = document.querySelector("#erreur-prenom");
  const erreurTelephone = document.querySelector("#erreur-telephone");

  const horairesPublies = {
    0: null,
    1: null,
    2: [10 * 60, 19 * 60],
    3: [10 * 60, 19 * 60],
    4: [10 * 60, 18 * 60],
    5: [10 * 60, 19 * 60],
    6: [10 * 60, 19 * 60]
  };

  const nomsEtapes = ["la prestation", "le jour", "l’heure", "les coordonnées"];
  const etat = {
    prestation: null,
    date: null,
    heure: null,
    maximumEtape: 0,
    etapeActive: 0
  };

  const formaterDateLongue = (date) => new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

  const formaterDateCourte = (date) => new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date).replaceAll(".", "");

  const heureDepuisMinutes = (minutes) => {
    const heures = Math.floor(minutes / 60).toString().padStart(2, "0");
    const reste = (minutes % 60).toString().padStart(2, "0");
    return `${heures} h ${reste}`;
  };

  const cleDate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");

  const mettreAJourRecapitulatif = () => {
    annoncePrestation.textContent = etat.prestation ? etat.prestation.nom : "À choisir";
    annonceJour.textContent = etat.date ? formaterDateLongue(etat.date) : "À choisir";
    annonceHeure.textContent = etat.heure || "À choisir";
  };

  const mettreAJourEtapes = () => {
    boutonsEtapes.forEach((bouton, index) => {
      bouton.disabled = index > etat.maximumEtape || index >= etat.etapeActive;
      if (index === etat.etapeActive) bouton.setAttribute("aria-current", "step");
      else bouton.removeAttribute("aria-current");
    });
  };

  const afficherEtape = (index, options = {}) => {
    if (index < 0 || index > etat.maximumEtape || index >= panneaux.length) return;
    etat.etapeActive = index;
    panneaux.forEach((panneau, numero) => {
      if (numero === index) {
        panneau.hidden = false;
        requestAnimationFrame(() => panneau.classList.add("is-active"));
      } else {
        panneau.classList.remove("is-active");
        panneau.hidden = true;
      }
    });
    mettreAJourEtapes();
    if (index === 2) fabriquerHoraires();
    if (etatSimulation) etatSimulation.textContent = `Étape ${index + 1} sur 4 : ${nomsEtapes[index]}.`;
    if (options.focus !== false) {
      const titre = panneaux[index].querySelector("h3");
      if (titre) requestAnimationFrame(() => titre.focus({ preventScroll: true }));
    }
  };

  const fabriquerJours = () => {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const fragment = document.createDocumentFragment();
    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(debut);
      date.setDate(debut.getDate() + decalage);
      const ouvert = horairesPublies[date.getDay()] !== null;
      const identifiant = `jour-${cleDate(date)}`;
      const libelle = formaterDateCourte(date);
      const etiquette = document.createElement("label");
      etiquette.className = "date-option";
      etiquette.htmlFor = identifiant;
      const entree = document.createElement("input");
      entree.type = "radio";
      entree.name = "jour";
      entree.id = identifiant;
      entree.value = cleDate(date);
      entree.disabled = !ouvert;
      entree.setAttribute("aria-label", ouvert ? libelle : `${libelle}, fermé`);
      const jour = document.createElement("span");
      jour.className = "date-option__day";
      jour.textContent = libelle.split(" ")[0];
      const numero = document.createElement("strong");
      numero.className = "date-option__number";
      numero.textContent = String(date.getDate());
      const etatJour = document.createElement("span");
      etatJour.className = "date-option__state";
      etatJour.textContent = ouvert ? libelle.slice(libelle.indexOf(" ") + 1) : "Fermé";
      etiquette.append(entree, jour, numero, etatJour);
      fragment.append(etiquette);
    }
    listeJours.replaceChildren(listeJours.querySelector("legend"), fragment);
  };

  const fabriquerHoraires = () => {
    listeHoraires.replaceChildren();
    if (!etat.prestation || !etat.date) return;
    const plage = horairesPublies[etat.date.getDay()];
    if (!plage) return;
    const [ouverture, fermeture] = plage;
    const fragment = document.createDocumentFragment();
    let nombreDeCreneaux = 0;
    let heureChoisiePreservee = false;
    const maintenant = new Date();
    const dateEstAujourdhui = cleDate(etat.date) === cleDate(maintenant);
    for (let depart = ouverture; depart + etat.prestation.duree <= fermeture; depart += 30) {
      nombreDeCreneaux += 1;
      const bouton = document.createElement("button");
      bouton.className = "time-choice";
      bouton.type = "button";
      const libelleHeure = heureDepuisMinutes(depart);
      bouton.textContent = libelleHeure;
      const heureDejaPassee = dateEstAujourdhui && depart <= maintenant.getHours() * 60 + maintenant.getMinutes();
      bouton.setAttribute("aria-pressed", String(etat.heure === libelleHeure && !heureDejaPassee));
      bouton.disabled = heureDejaPassee;
      if (!heureDejaPassee && etat.heure === libelleHeure) heureChoisiePreservee = true;
      if (heureDejaPassee) bouton.setAttribute("aria-label", `${heureDepuisMinutes(depart)}, horaire déjà passé`);
      bouton.addEventListener("click", () => {
        etat.heure = heureDepuisMinutes(depart);
        listeHoraires.querySelectorAll(".time-choice").forEach((autre) => autre.setAttribute("aria-pressed", "false"));
        bouton.setAttribute("aria-pressed", "true");
        boutonSuivantHeure.disabled = false;
        mettreAJourRecapitulatif();
        if (etatSimulation) etatSimulation.textContent = `Horaire indicatif choisi : ${etat.heure}.`;
      });
      fragment.append(bouton);
    }
    if (nombreDeCreneaux === 0 || !fragment.childElementCount) {
      const message = document.createElement("p");
      message.className = "no-times";
      message.textContent = "Aucun horaire indicatif ne reste pour ce jour. Choisissez une autre date ou appelez Azohia.";
      listeHoraires.append(message);
      etat.heure = null;
      mettreAJourRecapitulatif();
      boutonSuivantHeure.disabled = true;
      return;
    }
    listeHoraires.append(fragment);
    boutonSuivantHeure.disabled = !heureChoisiePreservee;
    if (etat.heure && !heureChoisiePreservee) {
      etat.heure = null;
      mettreAJourRecapitulatif();
    }
  };

  const definirPrestation = (entree) => {
    etat.prestation = {
      valeur: entree.value,
      nom: entree.dataset.nom,
      duree: Number(entree.dataset.duree)
    };
    etat.date = null;
    etat.heure = null;
    etat.maximumEtape = Math.min(etat.maximumEtape, 1);
    boutonSuivantPrestation.disabled = false;
    boutonSuivantJour.disabled = true;
    boutonSuivantHeure.disabled = true;
    const entreeJour = listeJours.querySelector('input[name="jour"]:checked');
    if (entreeJour) entreeJour.checked = false;
    listeHoraires.replaceChildren();
    mettreAJourRecapitulatif();
    mettreAJourEtapes();
    if (etatSimulation) etatSimulation.textContent = `${etat.prestation.nom}, durée publiée : ${etat.prestation.duree} minutes.`;
  };

  const effacerErreur = (champ, zone) => {
    champ.removeAttribute("aria-invalid");
    zone.textContent = "";
  };

  const validerCoordonnees = () => {
    let premierChampInvalide = null;
    const prenom = champPrenom.value.trim();
    if (prenom.length < 2) {
      champPrenom.setAttribute("aria-invalid", "true");
      erreurPrenom.textContent = prenom ? "Saisissez au moins deux caractères." : "Saisissez votre prénom.";
      premierChampInvalide = champPrenom;
    } else {
      effacerErreur(champPrenom, erreurPrenom);
    }

    const telephone = champTelephone.value.trim().replace(/[\s().-]/g, "");
    const telephoneNormalise = telephone.replace(/^0033/, "+33");
    const mobileValide = /^(?:0[67]\d{8}|\+33[67]\d{8})$/.test(telephoneNormalise);
    if (!mobileValide) {
      champTelephone.setAttribute("aria-invalid", "true");
      erreurTelephone.textContent = "Saisissez un numéro de mobile français valide.";
      if (!premierChampInvalide) premierChampInvalide = champTelephone;
    } else {
      effacerErreur(champTelephone, erreurTelephone);
    }
    if (premierChampInvalide) {
      premierChampInvalide.focus();
      return false;
    }
    return true;
  };

  formulaire.querySelectorAll('input[name="prestation"]').forEach((entree) => {
    entree.addEventListener("change", () => definirPrestation(entree));
  });

  listeJours.addEventListener("change", (evenement) => {
    const entree = evenement.target.closest('input[name="jour"]');
    if (!entree || entree.disabled) return;
    const annee = Number(entree.value.slice(0, 4));
    const mois = Number(entree.value.slice(4, 6)) - 1;
    const jour = Number(entree.value.slice(6, 8));
    etat.date = new Date(annee, mois, jour);
    etat.heure = null;
    boutonSuivantJour.disabled = false;
    boutonSuivantHeure.disabled = true;
    listeHoraires.replaceChildren();
    mettreAJourRecapitulatif();
    if (etatSimulation) etatSimulation.textContent = `Jour indicatif choisi : ${formaterDateLongue(etat.date)}.`;
  });

  document.querySelectorAll("[data-suivant]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const prochaineEtape = Number(bouton.dataset.suivant);
      if ((prochaineEtape === 1 && !etat.prestation) || (prochaineEtape === 2 && !etat.date) || (prochaineEtape === 3 && !etat.heure)) return;
      etat.maximumEtape = Math.max(etat.maximumEtape, prochaineEtape);
      afficherEtape(prochaineEtape);
    });
  });

  document.querySelectorAll("[data-retour]").forEach((bouton) => {
    bouton.addEventListener("click", () => afficherEtape(Number(bouton.dataset.retour)));
  });

  boutonsEtapes.forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const etapeDemandee = Number(bouton.dataset.retourEtape);
      if (etapeDemandee < etat.etapeActive && etapeDemandee <= etat.maximumEtape) afficherEtape(etapeDemandee);
    });
  });

  formulaireEtapes.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (!validerCoordonnees()) return;
    const detail = `${etat.prestation.nom}, le ${formaterDateLongue(etat.date)} à ${etat.heure}.`;
    texteConfirmation.textContent = `Exemple sélectionné : ${detail}`;
    formulaireEtapes.hidden = true;
    confirmation.hidden = false;
    if (etatSimulation) etatSimulation.textContent = "Fin de la simulation. Aucune réservation n’a été transmise.";
    requestAnimationFrame(() => titreConfirmation.focus({ preventScroll: true }));
  });

  champPrenom.addEventListener("input", () => effacerErreur(champPrenom, erreurPrenom));
  champTelephone.addEventListener("input", () => effacerErreur(champTelephone, erreurTelephone));

  document.querySelectorAll("[data-prestation]").forEach((lien) => {
    lien.addEventListener("click", (evenement) => {
      const entree = formulaire.querySelector(`[name="prestation"][value="${lien.dataset.prestation}"]`);
      if (!entree) return;
      evenement.preventDefault();
      if (confirmation && !confirmation.hidden) {
        formulaireEtapes.hidden = false;
        confirmation.hidden = true;
        champPrenom.value = "";
        champTelephone.value = "";
        effacerErreur(champPrenom, erreurPrenom);
        effacerErreur(champTelephone, erreurTelephone);
      }
      entree.checked = true;
      definirPrestation(entree);
      etat.maximumEtape = Math.max(etat.maximumEtape, 1);
      afficherEtape(1);
      reservation.scrollIntoView({ behavior: mouvementReduit.matches ? "auto" : "smooth", block: "start" });
    });
  });

  const reinitialiser = () => {
    formulaireEtapes.reset();
    formulaireEtapes.hidden = false;
    confirmation.hidden = true;
    etat.prestation = null;
    etat.date = null;
    etat.heure = null;
    etat.maximumEtape = 0;
    etat.etapeActive = 0;
    boutonSuivantPrestation.disabled = true;
    boutonSuivantJour.disabled = true;
    boutonSuivantHeure.disabled = true;
    erreurPrenom.textContent = "";
    erreurTelephone.textContent = "";
    champPrenom.removeAttribute("aria-invalid");
    champTelephone.removeAttribute("aria-invalid");
    fabriquerJours();
    listeHoraires.replaceChildren();
    mettreAJourRecapitulatif();
    afficherEtape(0);
    if (etatSimulation) etatSimulation.textContent = "La simulation a été réinitialisée.";
  };

  if (boutonRecommencer) boutonRecommencer.addEventListener("click", reinitialiser);

  fabriquerJours();
  mettreAJourRecapitulatif();
  mettreAJourEtapes();
})();
