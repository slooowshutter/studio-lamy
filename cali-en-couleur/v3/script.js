(() => {
  const zoneHoraire = "Europe/Paris";
  const formulaire = document.querySelector("[data-formulaire]");
  const reservation = document.querySelector("[data-reservation]");
  if (!formulaire || !reservation) return;

  const prestations = {
    semi: { nom: "Dépose + vernis semi-permanent", duree: 45, dureeTexte: "45\u00a0min", prix: 33 },
    manucure: { nom: "Dépose, manucure + semi-permanent", duree: 60, dureeTexte: "1\u00a0h", prix: 43 },
    capsules: { nom: "Capsules gel + vernis couleur", duree: 90, dureeTexte: "1\u00a0h\u00a030", prix: 65 },
    paraffine: { nom: "Bain de paraffine", duree: 20, dureeTexte: "20\u00a0min", prix: 19 }
  };
  const panneaux = Array.from(formulaire.querySelectorAll("[data-panneau]"));
  const jours = reservation.querySelector("[data-choix-jours]");
  const heures = reservation.querySelector("[data-choix-heures]");
  const champPrenom = formulaire.elements.namedItem("prenom");
  const champTelephone = formulaire.elements.namedItem("telephone");
  const annonce = reservation.querySelector("[data-annonce-etape]");
  const confirmation = reservation.querySelector("[data-succes]");
  const minuteOuverture = 11 * 60;
  const minuteFermeture = 18 * 60 + 30;
  let etapeActive = 1;
  let prestationChoisie = "";
  let jourChoisi = "";
  let heureChoisie = "";
  const minuteActuelleParis = obtenirHeureParis(new Date());
  const dateActuelleParis = obtenirDateParis(new Date());
  const minuteriesMasquage = new Map();

  function partiesFrancaises(date, options = {}) {
    return new Intl.DateTimeFormat("fr-FR", { timeZone: zoneHoraire, ...options }).formatToParts(date);
  }

  function obtenirDateParis(date) {
    const morceaux = partiesFrancaises(date, { year: "numeric", month: "2-digit", day: "2-digit" });
    const valeur = (type) => morceaux.find((morceau) => morceau.type === type)?.value;
    return `${valeur("year")}-${valeur("month")}-${valeur("day")}`;
  }

  function obtenirHeureParis(date) {
    const morceaux = partiesFrancaises(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const heure = Number(morceaux.find((morceau) => morceau.type === "hour")?.value || 0);
    const minute = Number(morceaux.find((morceau) => morceau.type === "minute")?.value || 0);
    return heure * 60 + minute;
  }

  function dateDepuisISO(iso) {
    const [annee, mois, jour] = iso.split("-").map(Number);
    return new Date(Date.UTC(annee, mois - 1, jour, 12));
  }

  function libelleLong(iso) {
    const phrase = new Intl.DateTimeFormat("fr-FR", {
      timeZone: zoneHoraire,
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(dateDepuisISO(iso));
    return phrase.charAt(0).toLocaleUpperCase("fr-FR") + phrase.slice(1);
  }

  function libelleCourt(iso) {
    const date = dateDepuisISO(iso);
    const jour = new Intl.DateTimeFormat("fr-FR", { timeZone: zoneHoraire, weekday: "short" }).format(date);
    const numero = new Intl.DateTimeFormat("fr-FR", { timeZone: zoneHoraire, day: "numeric" }).format(date);
    return { jour: jour.replace(".", ""), numero };
  }

  function annoncer(texte) {
    annonce.textContent = "";
    window.requestAnimationFrame(() => { annonce.textContent = texte; });
  }

  function mettreAJourSelection() {
    const prestation = prestations[prestationChoisie];
    const boutonPrestation = reservation.querySelector('[data-modifier="1"]');
    const boutonJour = reservation.querySelector('[data-modifier="2"]');
    const boutonHeure = reservation.querySelector('[data-modifier="3"]');

    boutonPrestation.textContent = prestation ? prestation.nom : "À choisir";
    boutonJour.textContent = jourChoisi ? libelleLong(jourChoisi) : "À choisir";
    boutonHeure.textContent = heureChoisie || "À choisir";
    boutonPrestation.disabled = !prestation;
    boutonJour.disabled = !jourChoisi;
    boutonHeure.disabled = !heureChoisie;

    reservation.querySelector('[data-recap-prestation]').textContent = prestation ? prestation.nom : "À choisir";
    reservation.querySelector('[data-recap-creneau]').textContent = jourChoisi && heureChoisie
      ? `${libelleLong(jourChoisi)} · ${heureChoisie}`
      : "À choisir";
    reservation.querySelector('[data-recap-prix]').textContent = prestation ? `${prestation.prix}\u00a0€` : "À confirmer";
  }

  function mettreAJourCompteur() {
    reservation.querySelector("[data-compteur-etape]").textContent = `Étape ${etapeActive} sur 4`;
  }

  function allerAEtape(numero) {
    const cible = panneaux.find((panneau) => Number(panneau.dataset.panneau) === numero);
    if (!cible || numero < 1 || numero > 4) return;
    if (numero > 1 && !prestationChoisie) return;
    if (numero > 2 && !jourChoisi) return;
    if (numero > 3 && !heureChoisie) return;

    const ancien = panneaux.find((panneau) => panneau.classList.contains("is-active"));
    if (ancien && ancien !== cible) {
      ancien.classList.remove("is-active");
      ancien.classList.add("is-leaving");
      window.clearTimeout(minuteriesMasquage.get(ancien));
      const minuterie = window.setTimeout(() => {
        if (!ancien.classList.contains("is-active")) {
          ancien.hidden = true;
          ancien.classList.remove("is-leaving");
        }
      }, 190);
      minuteriesMasquage.set(ancien, minuterie);
    }

    panneaux.forEach((panneau) => {
      if (panneau !== cible && panneau !== ancien && !panneau.classList.contains("is-leaving")) {
        panneau.hidden = true;
        panneau.classList.remove("is-active", "is-entering");
      }
    });

    window.clearTimeout(minuteriesMasquage.get(cible));
    cible.hidden = false;
    cible.classList.remove("is-leaving", "is-active");
    cible.classList.add("is-entering");
    window.getComputedStyle(cible).opacity;
    window.requestAnimationFrame(() => {
      cible.classList.remove("is-entering");
      cible.classList.add("is-active");
      const titre = cible.querySelector(".step-title");
      if (titre) titre.focus({ preventScroll: true });
    });

    etapeActive = numero;
    mettreAJourCompteur();
    mettreAJourSelection();
    const phraseEtape = [
      "",
      "Choisissez une prestation.",
      "Choisissez un jour parmi les horaires affichés.",
      "Choisissez une heure fictive.",
      "Vérifiez le récapitulatif et indiquez vos coordonnées."
    ][numero];
    annoncer(`Étape ${numero} sur 4. ${phraseEtape}`);
  }

  function construireJours() {
    jours.replaceChildren();
    const [annee, mois, jour] = dateActuelleParis.split("-").map(Number);
    const debut = new Date(Date.UTC(annee, mois - 1, jour, 12));

    for (let index = 0; index < 14; index += 1) {
      const date = new Date(debut);
      date.setUTCDate(debut.getUTCDate() + index);
      const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      const estDimanche = date.getUTCDay() === 0;
      const court = libelleCourt(iso);
      const bouton = document.createElement("button");
      const libelleJour = libelleLong(iso);
      bouton.className = "date-chip";
      bouton.type = "button";
      bouton.dataset.date = iso;
      bouton.setAttribute("aria-label", `Choisir ${libelleJour}${estDimanche ? ", fermé" : ""}`);
      bouton.setAttribute("aria-pressed", "false");
      bouton.disabled = estDimanche;

      const jourTexte = document.createElement("span");
      jourTexte.className = "date-chip__day";
      jourTexte.textContent = court.jour;
      const numeroTexte = document.createElement("span");
      numeroTexte.className = "date-chip__number";
      numeroTexte.textContent = court.numero;
      bouton.append(jourTexte, numeroTexte);

      if (estDimanche) {
        const etat = document.createElement("span");
        etat.className = "date-chip__state";
        etat.textContent = "Fermé";
        bouton.append(etat);
      }
      jours.append(bouton);
    }
  }

  function heureTexte(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(heure).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function dejaPris(iso, indice) {
    const jourDuMois = Number(iso.slice(-2));
    return (jourDuMois * 7 + indice * 5) % 11 === 0;
  }

  function construireHeures() {
    heures.replaceChildren();
    const prestation = prestations[prestationChoisie];
    if (!prestation || !jourChoisi) return;
    reservation.querySelector("[data-jour-choisi]").textContent = `${libelleLong(jourChoisi)} · horaires fictifs à confirmer.`;

    let indice = 0;
    let disponibles = 0;
    for (let minutes = minuteOuverture; minutes + prestation.duree <= minuteFermeture; minutes += 30) {
      const passe = jourChoisi === dateActuelleParis && minutes <= minuteActuelleParis;
      const occupe = dejaPris(jourChoisi, indice);
      const indisponible = passe || occupe;
      if (!indisponible) disponibles += 1;

      const etiquette = document.createElement("label");
      etiquette.className = `slot-choice${indisponible ? " slot-choice--disabled" : ""}`;
      const entree = document.createElement("input");
      entree.type = "radio";
      entree.name = "heure";
      entree.value = heureTexte(minutes);
      entree.disabled = indisponible;
      entree.checked = !indisponible && heureTexte(minutes) === heureChoisie;
      entree.setAttribute("aria-label", `${heureTexte(minutes)}${passe ? ", passé" : occupe ? ", déjà pris" : ""}`);
      const heure = document.createElement("span");
      heure.className = "slot-choice__time";
      heure.textContent = heureTexte(minutes);
      etiquette.append(entree, heure);

      if (indisponible) {
        const etat = document.createElement("span");
        etat.className = "slot-choice__state";
        etat.textContent = passe ? "Passé" : "Déjà pris";
        etiquette.append(etat);
      }
      heures.append(etiquette);
      indice += 1;
    }

    if (disponibles === 0) {
      const vide = document.createElement("p");
      vide.className = "empty-slots";
      vide.textContent = "Aucun créneau fictif pour cette journée dans cette simulation. Choisissez un autre jour.";
      heures.append(vide);
    }
  }

  function telephoneValide(valeur) {
    let chiffres = valeur.trim().replace(/[().\s.-]/g, "");
    if (chiffres.startsWith("0033")) chiffres = `+33${chiffres.slice(4)}`;
    if (chiffres.startsWith("+33")) chiffres = `0${chiffres.slice(3)}`;
    chiffres = chiffres.replace(/\D/g, "");
    return /^0[67]\d{8}$/.test(chiffres);
  }

  function afficherErreur(champ, identifiant, texte) {
    champ.setAttribute("aria-invalid", texte ? "true" : "false");
    formulaire.querySelector(`#${identifiant}`).textContent = texte;
  }

  function validerCoordonnees() {
    const prenom = champPrenom.value.trim();
    const telephone = champTelephone.value.trim();
    const erreurPrenom = prenom ? "" : "Indiquez votre prénom.";
    const erreurTelephone = telephoneValide(telephone) ? "" : "Indiquez un numéro portable français valide, en 06 ou 07.";
    afficherErreur(champPrenom, "prenom-erreur", erreurPrenom);
    afficherErreur(champTelephone, "telephone-erreur", erreurTelephone);

    if (erreurPrenom || erreurTelephone) {
      (erreurPrenom ? champPrenom : champTelephone).focus();
      annoncer(erreurPrenom || erreurTelephone);
      return false;
    }
    return true;
  }

  formulaire.addEventListener("change", (evenement) => {
    if (evenement.target.name === "prestation") {
      prestationChoisie = evenement.target.value;
      jourChoisi = "";
      heureChoisie = "";
      construireJours();
      mettreAJourSelection();
      const continuer = formulaire.querySelector('[data-panneau="1"] [data-suivant="2"]');
      continuer.disabled = false;
      formulaire.querySelector('[data-panneau="2"] [data-suivant="3"]').disabled = true;
      formulaire.querySelector('[data-panneau="3"] [data-suivant="4"]').disabled = true;
      annoncer(`${prestations[prestationChoisie].nom} sélectionné. Prix publié sur Planity, à confirmer.`);
      return;
    }

    if (evenement.target.name === "heure") {
      heureChoisie = evenement.target.value;
      mettreAJourSelection();
      formulaire.querySelector('[data-panneau="3"] [data-suivant="4"]').disabled = false;
      annoncer(`${heureChoisie} sélectionnée.`);
    }
  });

  jours.addEventListener("click", (evenement) => {
    const bouton = evenement.target.closest("[data-date]");
    if (!bouton || bouton.disabled) return;
    jourChoisi = bouton.dataset.date;
    heureChoisie = "";
    jours.querySelectorAll("[data-date]").forEach((date) => date.setAttribute("aria-pressed", String(date === bouton)));
    construireHeures();
    mettreAJourSelection();
    formulaire.querySelector('[data-panneau="2"] [data-suivant="3"]').disabled = false;
    formulaire.querySelector('[data-panneau="3"] [data-suivant="4"]').disabled = true;
    annoncer(`${libelleLong(jourChoisi)} sélectionné. Choisissez une heure fictive.`);
  });

  reservation.querySelectorAll("[data-suivant], [data-precedent], [data-modifier]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const numero = Number(bouton.dataset.suivant || bouton.dataset.precedent || bouton.dataset.modifier);
      if (bouton.disabled) return;
      if (numero === 3 && jourChoisi) construireHeures();
      allerAEtape(numero);
    });
  });

  reservation.querySelectorAll("[data-prestation]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      const code = bouton.dataset.prestation;
      const entree = formulaire.querySelector(`input[name="prestation"][value="${code}"]`);
      if (!entree) return;
      entree.checked = true;
      prestationChoisie = code;
      jourChoisi = "";
      heureChoisie = "";
      construireJours();
      mettreAJourSelection();
      formulaire.querySelector('[data-panneau="1"] [data-suivant="2"]').disabled = false;
      formulaire.querySelector('[data-panneau="2"] [data-suivant="3"]').disabled = true;
      formulaire.querySelector('[data-panneau="3"] [data-suivant="4"]').disabled = true;
      reservation.scrollIntoView({ block: "start" });
      allerAEtape(2);
    });
  });

  champPrenom.addEventListener("input", () => afficherErreur(champPrenom, "prenom-erreur", ""));
  champTelephone.addEventListener("input", () => afficherErreur(champTelephone, "telephone-erreur", ""));
  champTelephone.addEventListener("blur", () => {
    if (champTelephone.value.trim()) {
      afficherErreur(champTelephone, "telephone-erreur", telephoneValide(champTelephone.value) ? "" : "Vérifiez le numéro\u00a0: il doit commencer par 06 ou 07.");
    }
  });

  formulaire.addEventListener("submit", (evenement) => {
    evenement.preventDefault();
    if (!validerCoordonnees()) return;
    const nom = champPrenom.value.trim();
    const prestation = prestations[prestationChoisie];
    reservation.querySelector("[data-message-succes]").textContent = `${nom}, la demande de rendez-vous pour ${prestation.nom.toLocaleLowerCase("fr-FR")} le ${libelleLong(jourChoisi)} à ${heureChoisie} est simulée. Le prix publié sur Planity est de ${prestation.prix}\u00a0€, à confirmer. Rien n’a été envoyé.`;
    formulaire.hidden = true;
    reservation.querySelector(".selection-summary").hidden = true;
    reservation.querySelector(".booking__topline").hidden = true;
    confirmation.hidden = false;
    confirmation.querySelector("[data-recommencer]").focus();
    annoncer("Demande simulée. Aucune réservation n’a été créée et rien n’a été transmis au salon.");
  });

  confirmation.querySelector("[data-recommencer]").addEventListener("click", () => {
    formulaire.reset();
    formulaire.hidden = false;
    reservation.querySelector(".selection-summary").hidden = false;
    reservation.querySelector(".booking__topline").hidden = false;
    confirmation.hidden = true;
    prestationChoisie = "";
    jourChoisi = "";
    heureChoisie = "";
    formulaire.querySelector('[data-panneau="1"] [data-suivant="2"]').disabled = true;
    formulaire.querySelector('[data-panneau="2"] [data-suivant="3"]').disabled = true;
    formulaire.querySelector('[data-panneau="3"] [data-suivant="4"]').disabled = true;
    panneaux.forEach((panneau) => {
      panneau.hidden = Number(panneau.dataset.panneau) !== 1;
      panneau.classList.toggle("is-active", Number(panneau.dataset.panneau) === 1);
      panneau.classList.remove("is-entering", "is-leaving");
    });
    construireJours();
    heures.replaceChildren();
    etapeActive = 1;
    mettreAJourCompteur();
    mettreAJourSelection();
    formulaire.querySelector("#titre-etape-1").focus();
    annoncer("Simulation réinitialisée. Choisissez une prestation.");
  });

  const boutonNavigation = document.querySelector(".nav-toggle");
  const navigation = document.querySelector("#navigation-principale");
  boutonNavigation.addEventListener("click", () => {
    const ouvert = boutonNavigation.getAttribute("aria-expanded") === "true";
    boutonNavigation.setAttribute("aria-expanded", String(!ouvert));
    boutonNavigation.setAttribute("aria-label", ouvert ? "Afficher la navigation" : "Masquer la navigation");
    navigation.classList.toggle("is-open", !ouvert);
  });

  navigation.querySelectorAll("a").forEach((lien) => {
    lien.addEventListener("click", () => {
      boutonNavigation.setAttribute("aria-expanded", "false");
      boutonNavigation.setAttribute("aria-label", "Afficher la navigation");
      navigation.classList.remove("is-open");
      const destination = lien.hash ? document.getElementById(lien.hash.slice(1)) : null;
      const titre = destination?.matches("h1, h2, h3") ? destination : destination?.querySelector("h1, h2, h3");
      if (titre) {
        titre.tabIndex = -1;
        window.requestAnimationFrame(() => titre.focus({ preventScroll: true }));
      }
    });
  });

  document.addEventListener("keydown", (evenement) => {
    if (evenement.key === "Escape" && boutonNavigation.getAttribute("aria-expanded") === "true") {
      boutonNavigation.setAttribute("aria-expanded", "false");
      boutonNavigation.setAttribute("aria-label", "Afficher la navigation");
      navigation.classList.remove("is-open");
      boutonNavigation.focus();
    }
  });

  construireJours();
  mettreAJourSelection();

  const elementsAReveler = document.querySelectorAll(".visit-step, .service-row, .reveal-line");
  if ("IntersectionObserver" in window) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      entrees.forEach((entree) => {
        if (!entree.isIntersecting) return;
        entree.target.classList.add("is-visible");
        instance.unobserve(entree.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -5% 0px" });
    elementsAReveler.forEach((element) => observateur.observe(element));
  } else {
    elementsAReveler.forEach((element) => element.classList.add("is-visible"));
  }

  document.documentElement.classList.add("js");
  window.requestAnimationFrame(() => document.querySelector(".hero").classList.add("is-entered"));
})();
