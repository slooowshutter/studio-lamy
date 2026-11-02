(function () {
  "use strict";

  const documentHtml = document.documentElement;
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const selection = {
    prestation: "traditionnel",
    jour: "",
    heure: ""
  };
  const prestations = {
    traditionnel: { nom: "Coupe et Rasage Traditionnel", minutes: 60 },
    coupe: { nom: "Coupe Homme", minutes: 30 },
    shampoing: { nom: "Coupe + Shampoing", minutes: 30 },
    barbe: { nom: "Taille de barbe courte", minutes: 20 }
  };

  documentHtml.classList.add("js");

  const annoncer = (message) => {
    const zone = document.querySelector("[data-annonce]");
    if (zone) zone.textContent = message;
  };

  const initialiserNavigation = () => {
    const bouton = document.querySelector(".bouton-menu");
    const navigation = document.querySelector("#navigation-principale");
    if (!bouton || !navigation) return;
    const libelle = bouton.querySelector(".bouton-menu__libelle");
    const signe = bouton.querySelector('[aria-hidden="true"]');

    const reglerOuverture = (ouverte) => {
      bouton.setAttribute("aria-expanded", String(ouverte));
      navigation.classList.toggle("navigation--ouverte", ouverte);
      if (libelle) libelle.textContent = ouverte ? "Fermer" : "Parcourir";
      if (signe) signe.textContent = ouverte ? "−" : "+";
    };

    const fermer = (rendreFocus) => {
      reglerOuverture(false);
      if (rendreFocus) bouton.focus();
    };

    bouton.addEventListener("click", () => {
      const ouverte = bouton.getAttribute("aria-expanded") === "true";
      reglerOuverture(!ouverte);
      if (!ouverte) navigation.querySelector("a")?.focus();
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) fermer(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && bouton.getAttribute("aria-expanded") === "true") fermer(true);
    });
  };

  const initialiserRevelations = () => {
    const elements = [...document.querySelectorAll(".apparition")];
    const pli = document.querySelector(".pli");
    const dessinRue = document.querySelector(".rue");

    if (mouvementReduit || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("apparition--visible"));
      pli?.classList.add("pli--dessine");
      dessinRue?.classList.add("rue--visible");
      document.body.classList.add("page-chargee");
      return;
    }

    window.requestAnimationFrame(() => document.body.classList.add("page-chargee"));
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        const element = entree.target;
        if (element.matches(".pli")) element.classList.add("pli--dessine");
        else if (element.matches(".rue")) element.classList.add("rue--visible", "apparition--visible");
        else element.classList.add("apparition--visible");
        instance.unobserve(element);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -5% 0px" });

    elements.forEach((element) => observateur.observe(element));
    if (pli) observateur.observe(pli);
    if (dessinRue) observateur.observe(dessinRue);
  };

  const initialiserBarreMobile = () => {
    const barre = document.querySelector(".barre-mobile");
    const reservation = document.querySelector("#reservation");
    const pied = document.querySelector("#pied");
    if (!barre || !reservation || !pied || !("IntersectionObserver" in window)) return;

    barre.setAttribute("aria-hidden", "false");
    barre.inert = false;
    const visibles = new Set();
    const observateur = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) visibles.add(entree.target);
        else visibles.delete(entree.target);
      });
      const masquer = visibles.size > 0;
      if (masquer && barre.contains(document.activeElement)) {
        if (visibles.has(reservation)) document.querySelector("#titre-etape-1")?.focus({ preventScroll: true });
        else document.activeElement.blur();
      }
      barre.classList.toggle("barre-mobile--masquee", masquer);
      barre.setAttribute("aria-hidden", String(masquer));
      barre.inert = masquer;
    }, { threshold: 0.08 });
    observateur.observe(reservation);
    observateur.observe(pied);
  };

  const formulaire = document.querySelector("#formulaire-reservation");
  if (!formulaire) {
    initialiserNavigation();
    initialiserRevelations();
    initialiserBarreMobile();
    return;
  }

  const etapes = [...formulaire.querySelectorAll(".etape-formulaire")];
  const resumePrestation = document.querySelector("[data-resume-prestation]");
  const resumeJour = document.querySelector("[data-resume-jour]");
  const resumeHeure = document.querySelector("[data-resume-heure]");
  const joursConteneur = document.querySelector("[data-jours]");
  const heuresConteneur = document.querySelector("[data-heures]");
  const heureChoisie = document.querySelector("[data-jour-choisi]");
  const joursFormates = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
  const joursCourts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
  const dateParisFormatee = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
  const heureParisFormatee = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let etapeCourante = 1;

  const cleDate = (date) => {
    const parties = Object.fromEntries(dateParisFormatee.formatToParts(date).map((partie) => [partie.type, partie.value]));
    const annee = parties.year;
    const mois = parties.month;
    const jour = parties.day;
    return `${annee}-${mois}-${jour}`;
  };

  const trouverDate = (cle) => {
    const [annee, mois, jour] = cle.split("-").map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12, 0, 0, 0));
  };

  const mettreAJourResume = () => {
    const prestation = prestations[selection.prestation];
    if (resumePrestation) resumePrestation.textContent = prestation ? prestation.nom : "À choisir";
    if (resumeJour) resumeJour.textContent = selection.jour ? joursFormates.format(trouverDate(selection.jour)) : "À choisir";
    if (resumeHeure) resumeHeure.textContent = selection.heure || "À choisir";
  };

  const passerEtape = (numero, message) => {
    const precedente = etapes.find((etape) => Number(etape.dataset.etape) === etapeCourante);
    const suivante = etapes.find((etape) => Number(etape.dataset.etape) === numero);
    if (!suivante) return;

    if (precedente) precedente.hidden = true;
    suivante.hidden = false;
    suivante.classList.add("etape-formulaire--attente");
    window.requestAnimationFrame(() => suivante.classList.remove("etape-formulaire--attente"));
    etapeCourante = numero;

    const titre = suivante.querySelector(".etape-formulaire__titre");
    if (titre) {
      titre.focus({ preventScroll: true });
      titre.scrollIntoView({ behavior: mouvementReduit ? "auto" : "smooth", block: "center" });
    }
    mettreAJourResume();
    if (message) annoncer(message);
  };

  const effacerErreurs = () => {
    ["[data-erreur-jour]", "[data-erreur-heure]", "[data-erreur-prenom]", "[data-erreur-telephone]"].forEach((selecteur) => {
      const erreur = document.querySelector(selecteur);
      if (erreur) erreur.hidden = true;
    });
    ["#prenom", "#telephone"].forEach((selecteur) => document.querySelector(selecteur)?.removeAttribute("aria-invalid"));
  };

  const montrerErreur = (selecteur, cible, message) => {
    const erreur = document.querySelector(selecteur);
    if (erreur) erreur.hidden = false;
    if (cible) cible.focus();
    annoncer(message);
  };

  const ouvrirJour = (date) => {
    const jour = date.getUTCDay();
    return jour !== 0;
  };

  const creerJours = () => {
    if (!joursConteneur) return;
    const fragment = document.createDocumentFragment();
    const aujourdhui = trouverDate(cleDate(new Date()));

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdhui);
      date.setUTCDate(aujourdhui.getUTCDate() + decalage);
      const cle = cleDate(date);
      const ferme = !ouvrirJour(date);
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "jour";
      bouton.dataset.jour = cle;
      bouton.disabled = ferme;
      bouton.setAttribute("aria-pressed", "false");
      bouton.setAttribute("aria-label", ferme ? `${joursFormates.format(date)}, fermé` : `Choisir ${joursFormates.format(date)}`);

      const nomJour = document.createElement("span");
      nomJour.textContent = joursCourts.format(date).replace(".", "");
      const nombreJour = document.createElement("strong");
      nombreJour.textContent = String(date.getDate());
      const note = document.createElement("small");
      note.textContent = ferme ? "Fermé" : (decalage === 0 ? "Aujourd’hui" : "Ouvert");
      bouton.append(nomJour, nombreJour, note);

      bouton.addEventListener("click", () => {
        selection.jour = cle;
        selection.heure = "";
        joursConteneur.querySelectorAll(".jour").forEach((element) => element.setAttribute("aria-pressed", String(element === bouton)));
        if (document.querySelector("[data-erreur-jour]")) document.querySelector("[data-erreur-jour]").hidden = true;
        creerHeures();
        mettreAJourResume();
        annoncer(`Jour choisi : ${joursFormates.format(date)}.`);
      });
      fragment.append(bouton);
    }

    joursConteneur.replaceChildren(fragment);
  };

  const plagesOuverture = (date) => {
    switch (date.getUTCDay()) {
      case 1:
      case 2:
      case 3:
      case 4:
        return [[10 * 60, 13 * 60], [14 * 60, 19 * 60]];
      case 5:
        return [[9 * 60, 13 * 60], [14 * 60, 19 * 60]];
      case 6:
        return [[9 * 60, 12 * 60 + 30], [14 * 60, 18 * 60]];
      default:
        return [];
    }
  };

  const formatHeure = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")} h ${String(minutes % 60).padStart(2, "0")}`;

  const empreinte = (texte) => {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) valeur = (valeur * 31 + texte.charCodeAt(index)) >>> 0;
    return valeur;
  };

  const creerHeures = () => {
    if (!heuresConteneur || !selection.jour) return;
    const date = trouverDate(selection.jour);
    const duree = prestations[selection.prestation].minutes;
    const maintenant = new Date();
    const estAujourdhui = cleDate(maintenant) === selection.jour;
    const heureParis = Object.fromEntries(heureParisFormatee.formatToParts(maintenant).map((partie) => [partie.type, partie.value]));
    const maintenantMinutes = Number(heureParis.hour) * 60 + Number(heureParis.minute);
    const horaires = [];

    plagesOuverture(date).forEach(([debut, fin]) => {
      for (let depart = debut; depart + duree <= fin; depart += 60) horaires.push(depart);
    });

    if (heureChoisie) heureChoisie.textContent = `${joursFormates.format(date)} · créneaux de démonstration`;
    heuresConteneur.replaceChildren();
    const empreinteJour = empreinte(`${selection.jour}-${selection.prestation}`);
    const indisponibleIndex = horaires.length > 3 ? empreinteJour % horaires.length : -1;

    horaires.forEach((minutes, index) => {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "heure";
      bouton.dataset.heure = formatHeure(minutes);
      const heurePassee = estAujourdhui && minutes <= maintenantMinutes;
      const indisponibleSimulation = index === indisponibleIndex;
      bouton.disabled = heurePassee || indisponibleSimulation;
      bouton.setAttribute("aria-pressed", "false");
      if (indisponibleSimulation) bouton.classList.add("heure--indisponible");
      const etiquette = document.createElement("span");
      etiquette.textContent = formatHeure(minutes);
      const etat = document.createElement("small");
      etat.textContent = heurePassee ? "Passé" : (indisponibleSimulation ? "Indisponible" : "Simulation");
      bouton.setAttribute("aria-label", `${formatHeure(minutes)}, ${heurePassee ? "heure passée" : (indisponibleSimulation ? "indisponible dans la simulation" : "créneau de simulation")}`);
      bouton.append(etiquette, etat);
      bouton.addEventListener("click", () => {
        selection.heure = formatHeure(minutes);
        heuresConteneur.querySelectorAll(".heure").forEach((element) => element.setAttribute("aria-pressed", String(element === bouton)));
        const erreur = document.querySelector("[data-erreur-heure]");
        if (erreur) erreur.hidden = true;
        mettreAJourResume();
        annoncer(`Heure choisie : ${selection.heure}.`);
      });
      heuresConteneur.append(bouton);
    });

    if (!horaires.length) {
      const message = document.createElement("p");
      message.textContent = "Aucun créneau ne correspond à cette prestation dans les horaires publiés.";
      heuresConteneur.append(message);
    }
  };

  formulaire.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="prestation"]')) return;
    selection.prestation = event.target.value;
    selection.jour = "";
    selection.heure = "";
    mettreAJourResume();
    annoncer(`Prestation choisie : ${prestations[selection.prestation].nom}.`);
  });

  formulaire.querySelectorAll("[data-suite]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      effacerErreurs();
      if (etapeCourante === 1) {
        selection.prestation = formulaire.querySelector('input[name="prestation"]:checked')?.value || "traditionnel";
        selection.jour = "";
        selection.heure = "";
        creerJours();
        passerEtape(2, "Étape 2 sur 4 : choisissez un jour ouvert.");
        return;
      }
      if (etapeCourante === 2) {
        if (!selection.jour) {
          montrerErreur("[data-erreur-jour]", joursConteneur?.querySelector(".jour:not(:disabled)"), "Choisissez un jour ouvert pour continuer.");
          return;
        }
        creerHeures();
        passerEtape(3, "Étape 3 sur 4 : choisissez une heure de démonstration.");
        return;
      }
      if (etapeCourante === 3) {
        if (!selection.heure) {
          montrerErreur("[data-erreur-heure]", heuresConteneur?.querySelector(".heure:not(:disabled)"), "Choisissez une heure pour continuer.");
          return;
        }
        passerEtape(4, "Étape 4 sur 4 : indiquez un prénom et un téléphone.");
      }
    });
  });

  formulaire.querySelectorAll("[data-retour]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const cible = Math.max(1, etapeCourante - 1);
      passerEtape(cible, `Retour à l’étape ${cible}.`);
    });
  });

  const normaliserTelephone = (valeur) => {
    let telephone = valeur.replace(/[\s().-]/g, "");
    if (telephone.startsWith("+33")) telephone = `0${telephone.slice(3)}`;
    else if (telephone.startsWith("0033")) telephone = `0${telephone.slice(4)}`;
    return telephone;
  };

  formulaire.addEventListener("submit", (event) => {
    event.preventDefault();
    if (etapeCourante !== 4) return;
    effacerErreurs();
    const prenom = document.querySelector("#prenom");
    const telephone = document.querySelector("#telephone");
    const nom = prenom?.value.trim() || "";
    const numero = telephone?.value || "";

    if (!nom) {
      prenom?.setAttribute("aria-invalid", "true");
      montrerErreur("[data-erreur-prenom]", prenom, "Indiquez votre prénom.");
      return;
    }
    if (!/^0[67]\d{8}$/.test(normaliserTelephone(numero))) {
      telephone?.setAttribute("aria-invalid", "true");
      montrerErreur("[data-erreur-telephone]", telephone, "Entrez un numéro de mobile français valide.");
      return;
    }

    const confirmation = document.querySelector("[data-confirmation]");
    if (confirmation) {
      const date = joursFormates.format(trouverDate(selection.jour));
      confirmation.textContent = `${nom}, votre sélection de démonstration porte sur ${prestations[selection.prestation].nom}, le ${date} à ${selection.heure}.`;
    }
    passerEtape(5, "Simulation terminée. Aucune réservation n’a été transmise.");
  });

  document.querySelector("[data-recommencer]")?.addEventListener("click", () => {
    formulaire.reset();
    selection.prestation = "traditionnel";
    selection.jour = "";
    selection.heure = "";
    etapeCourante = 5;
    mettreAJourResume();
    document.querySelector("[data-confirmation]").textContent = "";
    passerEtape(1, "La simulation est prête à recommencer.");
  });

  document.querySelectorAll("[data-prestation]").forEach((lien) => {
    lien.addEventListener("click", () => {
      const valeur = lien.dataset.prestation;
      const radio = formulaire.querySelector(`input[name="prestation"][value="${valeur}"]`);
      if (!radio) return;
      radio.checked = true;
      selection.prestation = valeur;
      selection.jour = "";
      selection.heure = "";
      mettreAJourResume();
      creerJours();
      passerEtape(1, `Prestation choisie : ${prestations[valeur].nom}.`);
    });
  });

  mettreAJourResume();
  initialiserNavigation();
  initialiserRevelations();
  initialiserBarreMobile();
  window.__apercuPret = true;
})();
