(() => {
  "use strict";

  const racine = document.documentElement;
  racine.classList.add("js");

  const reduireMouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menuBouton = document.querySelector(".menu-bouton");
  const navigation = document.querySelector("#navigation");

  function fermerNavigation(rendreFocus = false) {
    if (!menuBouton || !navigation) return;
    menuBouton.setAttribute("aria-expanded", "false");
    menuBouton.setAttribute("aria-label", "Ouvrir la navigation");
    navigation.classList.remove("is-ouverte");
    if (rendreFocus) menuBouton.focus();
  }

  if (menuBouton && navigation) {
    menuBouton.addEventListener("click", () => {
      const ouverte = menuBouton.getAttribute("aria-expanded") === "true";
      menuBouton.setAttribute("aria-expanded", String(!ouverte));
      menuBouton.setAttribute("aria-label", ouverte ? "Ouvrir la navigation" : "Fermer la navigation");
      navigation.classList.toggle("is-ouverte", !ouverte);
      if (!ouverte) navigation.querySelector("a")?.focus({ preventScroll: true });
    });
    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) fermerNavigation(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuBouton.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        fermerNavigation(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (menuBouton.getAttribute("aria-expanded") === "true" && !event.target.closest(".entete")) {
        fermerNavigation(false);
      }
    });
  }

  const arrets = [...document.querySelectorAll(".arret")];
  const revelations = [...document.querySelectorAll("[data-revelation]")];
  if ("IntersectionObserver" in window && !reduireMouvement.matches) {
    const observateur = new IntersectionObserver((entrees, instance) => {
      for (const entree of entrees) {
        if (!entree.isIntersecting) continue;
        entree.target.classList.add("is-visible");
        instance.unobserve(entree.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
    arrets.forEach((arret) => observateur.observe(arret));
    revelations.forEach((elemento) => observateur.observe(elemento));
  } else {
    arrets.forEach((arret) => arret.classList.add("is-visible"));
    revelations.forEach((elemento) => elemento.classList.add("is-visible"));
  }

  const ligne = document.querySelector(".parcours__ligne");
  let defilementDemande = false;
  function dessinerParcours() {
    if (!ligne || reduireMouvement.matches) return;
    const boite = ligne.getBoundingClientRect();
    const pointLecture = window.innerHeight * 0.72;
    const progression = Math.max(0.02, Math.min(1, (pointLecture - boite.top) / boite.height));
    ligne.querySelector(".parcours__remplissage").style.transform = `scaleY(${progression})`;
    defilementDemande = false;
  }
  function demanderDessin() {
    if (defilementDemande) return;
    defilementDemande = true;
    window.requestAnimationFrame(dessinerParcours);
  }
  window.addEventListener("scroll", demanderDessin, { passive: true });
  window.addEventListener("resize", demanderDessin, { passive: true });
  reduireMouvement.addEventListener?.("change", demanderDessin);
  demanderDessin();

  const formulaire = document.querySelector("#formulaire-simulation");
  const reservation = document.querySelector(".reservation");
  const choixJours = document.querySelector("#choix-jours");
  const choixHeures = document.querySelector("#choix-heures");
  const recapitulatif = document.querySelector(".recapitulatif");
  const boutonsEtapes = [...document.querySelectorAll("[data-revenir]")];
  const sectionsEtapes = [...document.querySelectorAll("[data-etape]")];
  const messagesErreur = [...document.querySelectorAll("[data-erreur]")];
  const champPrenom = document.querySelector("#prenom");
  const champTelephone = document.querySelector("#telephone");
  const boutonAgenda = document.querySelector("#ajouter-agenda");

  const ordreEtapes = ["prestation", "jour", "heure", "coordonnees", "confirmation"];
  const etat = {
    etape: "prestation",
    visitees: new Set(["prestation"]),
    prestation: null,
    jour: null,
    heure: null,
    duree: 0,
    dateAffichee: "",
    heuresDisponibles: []
  };

  const nomsJours = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
  const nomsJoursCourts = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" });
  const dateComplete = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

  function dateParisAujourdhui() {
    const parties = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
  }

  function cleDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function jourSemaine(date) { return date.getUTCDay(); }
  function jourOuverture(numero) { return numero >= 1 && numero <= 6; }

  function texteJour(date) {
    return `${nomsJours.format(date)} ${dateComplete.format(date)}`;
  }

  function heureParisMaintenant() {
    const parties = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    return Number(valeurs.hour) * 60 + Number(valeurs.minute);
  }

  function afficherHoraire(minutes) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${String(heures).padStart(2, "0")} h ${String(reste).padStart(2, "0")}`;
  }

  function ouvrirDates() {
    if (!choixJours) return;
    choixJours.replaceChildren();
    const depart = dateParisAujourdhui();
    for (let decalage = 0; decalage < 10; decalage += 1) {
      const date = new Date(depart.getTime() + decalage * 86400000);
      const jour = jourSemaine(date);
      const ferme = !jourOuverture(jour);
      const cle = cleDate(date);
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "jour-simule";
      bouton.dataset.jour = cle;
      bouton.disabled = ferme;
      bouton.setAttribute("aria-pressed", String(etat.jour === cle));
      bouton.setAttribute("aria-label", ferme ? `${texteJour(date)}, fermé selon Planity` : texteJour(date));
      const nomCourt = nomsJoursCourts.format(date).replace(".", "");
      const jourEl = document.createElement("span");
      jourEl.textContent = nomCourt;
      const dateEl = document.createElement("span");
      dateEl.textContent = String(date.getUTCDate());
      bouton.append(jourEl, dateEl);
      if (ferme) {
        const fermeEl = document.createElement("small");
        fermeEl.textContent = "Fermé";
        bouton.append(fermeEl);
      }
      bouton.addEventListener("click", () => {
        if (bouton.disabled) return;
        etat.jour = cle;
        etat.dateAffichee = texteJour(date);
        etat.heure = null;
        choixJours.querySelectorAll("button").forEach((autre) => {
          autre.setAttribute("aria-pressed", String(autre === bouton));
        });
        actualiserRecapitulatif();
        if (etat.etape === "heure") ouvrirHeures();
        viderErreur("jour");
      });
      choixJours.append(bouton);
    }
  }

  function empreinte(texte) {
    let valeur = 0;
    for (let index = 0; index < texte.length; index += 1) {
      valeur = ((valeur << 5) - valeur + texte.charCodeAt(index)) | 0;
    }
    return Math.abs(valeur);
  }

  function ouvrirHeures() {
    if (!choixHeures || !etat.jour || !etat.prestation) return;
    choixHeures.replaceChildren();
    etat.heuresDisponibles = [];
    const [annee, mois, dia] = etat.jour.split("-").map(Number);
    const date = new Date(Date.UTC(annee, mois - 1, dia, 12));
    const jour = jourSemaine(date);
    if (!jourOuverture(jour)) return;

    const ouverture = 9 * 60;
    const fermeture = (jour === 6 ? 18 : 18.5) * 60;
    const duree = etat.duree;
    const dernierDepart = fermeture - duree;
    const aujourdHui = cleDate(dateParisAujourdhui()) === etat.jour;
    const heureActuelle = aujourdHui ? heureParisMaintenant() : -1;
    for (let minute = ouverture; minute <= dernierDepart; minute += 60) {
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "heure-simule";
      bouton.dataset.heure = String(minute);
      const heureTexte = document.createElement("span");
      heureTexte.textContent = afficherHoraire(minute);
      bouton.append(heureTexte);
      const heurePasse = aujourdHui && minute <= heureActuelle;
      const dejaPrise = empreinte(`${etat.jour}-${etat.prestation}-${minute}`) % 7 === 0;
      bouton.disabled = heurePasse || dejaPrise;
      bouton.setAttribute("aria-pressed", String(etat.heure === minute));
      if (heurePasse || dejaPrise) {
        const etatVisuel = document.createElement("small");
        etatVisuel.textContent = heurePasse ? "Passé" : "Déjà pris";
        bouton.append(etatVisuel);
      }
      if (heurePasse) bouton.setAttribute("aria-label", `${afficherHoraire(minute)}, heure passée`);
      else if (dejaPrise) bouton.setAttribute("aria-label", `${afficherHoraire(minute)}, déjà pris dans cette simulation`);
      else bouton.setAttribute("aria-label", `Choisir ${afficherHoraire(minute)}`);
      if (!bouton.disabled) etat.heuresDisponibles.push(minute);
      bouton.addEventListener("click", () => {
        if (bouton.disabled) return;
        etat.heure = minute;
        choixHeures.querySelectorAll("button").forEach((autre) => {
          autre.setAttribute("aria-pressed", String(autre === bouton));
        });
        actualiserRecapitulatif();
        viderErreur("heure");
      });
      choixHeures.append(bouton);
    }

    if (etat.heuresDisponibles.length === 0) {
      const vide = document.createElement("p");
      vide.className = "heure-indisponible";
      vide.textContent = "Aucun créneau simulé ne reste pour ce jour. Choisissez une autre date.";
      choixHeures.append(vide);
    }
  }

  function actualiserRecapitulatif() {
    const serviceTexte = document.querySelector("[data-recap='prestation']");
    const jourTexte = document.querySelector("[data-recap='jour']");
    const heureTexte = document.querySelector("[data-recap='heure']");
    if (serviceTexte) serviceTexte.textContent = etat.prestation || "À choisir";
    if (jourTexte) jourTexte.textContent = etat.dateAffichee || "À choisir";
    if (heureTexte) heureTexte.textContent = etat.heure === null ? "À choisir" : afficherHoraire(etat.heure);
    recapitulatif?.classList.toggle("is-rempli", Boolean(etat.prestation || etat.jour || etat.heure !== null));
    document.querySelector("#titre-recapitulatif").textContent = etat.prestation ? "Votre rendez-vous" : "À compléter";
  }

  function viderErreur(cle) {
    const message = messagesErreur.find((elemento) => elemento.dataset.erreur === cle);
    if (message) message.textContent = "";
  }

  function afficherErreur(cle, texte) {
    const message = messagesErreur.find((elemento) => elemento.dataset.erreur === cle);
    if (message) message.textContent = texte;
  }

  function rendreEtapes() {
    const etapeCourante = etat.etape === "confirmation" ? "coordonnees" : etat.etape;
    for (const bouton of boutonsEtapes) {
      const cle = bouton.dataset.revenir;
      const index = ordreEtapes.indexOf(cle);
      bouton.disabled = !etat.visitees.has(cle);
      if (cle === etapeCourante) bouton.setAttribute("aria-current", "step");
      else bouton.removeAttribute("aria-current");
      if (index >= 0 && etat.visitees.has(cle)) bouton.disabled = false;
    }
  }

  async function afficherEtape(cle) {
    if (!ordreEtapes.includes(cle) || (cle !== "confirmation" && !etat.visitees.has(cle))) return;
    const sortante = sectionsEtapes.find((section) => section.dataset.etape === etat.etape);
    const entrante = sectionsEtapes.find((section) => section.dataset.etape === cle);
    if (!entrante || cle === etat.etape) return;

    if (sortante && !reduireMouvement.matches) {
      const animation = sortante.animate(
        [{ opacity: 1, transform: "translateY(0) scale(1)" }, { opacity: 0, transform: "translateY(-5px) scale(.98)" }],
        { duration: 75, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
      try { await animation.finished; } catch (_) { /* Changement interrompu par une nouvelle étape. */ }
    }

    if (sortante) sortante.hidden = true;
    entrante.hidden = false;
    etat.etape = cle;
    rendreEtapes();
    if (!reduireMouvement.matches) {
      entrante.animate(
        [{ opacity: 0, transform: "translateY(8px) scale(.98)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
        { duration: 190, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
    }
    entrante.querySelector("h3")?.focus({ preventScroll: true });
  }

  function validerEtape(cle) {
    if (cle === "jour" && !etat.jour) {
      afficherErreur("jour", "Choisissez une date ouverte pour continuer.");
      return false;
    }
    if (cle === "heure" && etat.heure === null) {
      afficherErreur("heure", "Choisissez une heure disponible dans la simulation.");
      return false;
    }
    if (cle === "coordonnees") {
      const prenom = champPrenom.value.trim();
      const telephone = champTelephone.value.trim();
      const chiffres = telephone.replace(/\D/g, "");
      const mobileValide = /^(0[67]\d{8}|33[67]\d{8}|0033[67]\d{8})$/.test(chiffres);
      if (prenom.length < 2) {
        afficherErreur("coordonnees", "Saisissez un prénom d’au moins deux caractères.");
        champPrenom.focus();
        return false;
      }
      if (!mobileValide) {
        afficherErreur("coordonnees", "Saisissez un numéro de mobile français valide.");
        champTelephone.focus();
        return false;
      }
      viderErreur("coordonnees");
    }
    viderErreur(cle);
    return true;
  }

  function valeurPrestation() {
    return formulaire.querySelector("input[name='prestation']:checked");
  }

  formulaire?.addEventListener("change", (event) => {
    if (event.target.matches("input[name='prestation']")) {
      const selection = valeurPrestation();
      if (!selection) return;
      const prestationNouvelle = selection.dataset.nom;
      if (etat.prestation !== prestationNouvelle) {
        etat.jour = null;
        etat.heure = null;
        etat.dateAffichee = "";
        etat.visitees = new Set(["prestation"]);
      }
      etat.prestation = prestationNouvelle;
      etat.duree = Number(selection.dataset.duree);
      actualiserRecapitulatif();
      rendreEtapes();
      viderErreur("prestation");
    }
  });

  reservation?.addEventListener("click", async (event) => {
    const continuer = event.target.closest("[data-suivant]");
    if (continuer) {
      const actuelle = etat.etape;
      if (actuelle === "prestation") {
        const selection = valeurPrestation();
        if (!selection) {
          afficherErreur("prestation", "Choisissez une prestation pour continuer.");
          return;
        }
        etat.prestation = selection.dataset.nom;
        etat.duree = Number(selection.dataset.duree);
        etat.visitees.add("jour");
        ouvrirDates();
        actualiserRecapitulatif();
      } else {
        const valide = validerEtape(actuelle);
        if (!valide) return;
        const index = ordreEtapes.indexOf(actuelle);
        const suivante = ordreEtapes[index + 1];
        etat.visitees.add(suivante);
        if (suivante === "heure") ouvrirHeures();
      }
      const suivante = continuer.dataset.suivant;
      if (!etat.visitees.has(suivante)) etat.visitees.add(suivante);
      await afficherEtape(suivante);
      return;
    }

    const precedent = event.target.closest("[data-precedent]");
    if (precedent) {
      const cle = precedent.dataset.precedent;
      if (cle === "heure") ouvrirHeures();
      await afficherEtape(cle);
      return;
    }

    const retourDirect = event.target.closest("[data-revenir]");
    if (retourDirect && !retourDirect.disabled) {
      const cle = retourDirect.dataset.revenir;
      if (cle === "heure") ouvrirHeures();
      await afficherEtape(cle);
    }
  });

  formulaire?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validerEtape("coordonnees")) return;
    etat.visitees.add("confirmation");
    const message = document.querySelector("#message-confirmation");
    const date = etat.dateAffichee;
    const heure = afficherHoraire(etat.heure);
    const prenom = champPrenom.value.trim();
    message.textContent = `${prenom}, la simulation est terminée pour ${etat.prestation}, le ${date} à ${heure}. Aucun rendez-vous n’a été envoyé.`;
    await afficherEtape("confirmation");
  });

  function valeurIcs(texte) {
    return texte.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function heureParisVersUtc(jourIso, minutes) {
    const [annee, mois, jour] = jourIso.split("-").map(Number);
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const repereUtc = Date.UTC(annee, mois - 1, jour, heure, minute);
    const parties = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date(repereUtc));
    const valeurs = Object.fromEntries(parties.map((partie) => [partie.type, partie.value]));
    const repereParis = Date.UTC(
      Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day),
      Number(valeurs.hour), Number(valeurs.minute), Number(valeurs.second)
    );
    const decalage = repereParis - repereUtc;
    return new Date(repereUtc - decalage).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  boutonAgenda?.addEventListener("click", () => {
    if (!etat.jour || etat.heure === null) return;
    const [annee, mois, jour] = etat.jour.split("-");
    const debutMinutes = etat.heure;
    const finMinutes = debutMinutes + etat.duree;
    const debut = heureParisVersUtc(etat.jour, debutMinutes);
    const fin = heureParisVersUtc(etat.jour, finMinutes);
    const contenu = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Studio Lamy//Simulation de rendez-vous//FR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `DTSTART:${debut}`,
      `DTEND:${fin}`,
      `SUMMARY:${valeurIcs(`Simulation · ${etat.prestation}`)}`,
      `LOCATION:${valeurIcs("16 rue Taison, 57000 Metz")}`,
      `DESCRIPTION:${valeurIcs("Simulation uniquement. Aucun rendez-vous réel n’a été réservé.")}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const fichier = new Blob([contenu], { type: "text/calendar;charset=utf-8" });
    const adresseFichier = URL.createObjectURL(fichier);
    const lien = document.createElement("a");
    lien.href = adresseFichier;
    lien.download = `simulation-rendez-vous-${annee}${mois}${jour}.ics`;
    lien.setAttribute("aria-label", "Télécharger le fichier de calendrier de la simulation");
    document.body.append(lien);
    lien.click();
    lien.remove();
    window.setTimeout(() => URL.revokeObjectURL(adresseFichier), 1000);
  });

  if (formulaire && choixJours && choixHeures) {
    ouvrirDates();
    actualiserRecapitulatif();
    rendreEtapes();
  }
})();
