document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const html = document.documentElement;

requestAnimationFrame(() => {
  requestAnimationFrame(() => html.classList.add("pret"));
});

const navigation = document.querySelector("#navigation-principale");
const boutonNavigation = document.querySelector(".bouton-navigation");
const mediaMobile = window.matchMedia("(max-width: 760px)");

function reglerNavigation() {
  if (!navigation || !boutonNavigation) return;
  if (mediaMobile.matches) {
    boutonNavigation.hidden = false;
    navigation.hidden = true;
    boutonNavigation.setAttribute("aria-expanded", "false");
    boutonNavigation.querySelector(".bouton-navigation__etat").textContent = "Ouvrir";
  } else {
    navigation.hidden = false;
    boutonNavigation.hidden = true;
    boutonNavigation.setAttribute("aria-expanded", "false");
  }
}

reglerNavigation();
mediaMobile.addEventListener("change", reglerNavigation);

function fermerNavigation(rendreFocus = false) {
  if (!navigation || !boutonNavigation || !mediaMobile.matches) return;
  navigation.hidden = true;
  boutonNavigation.setAttribute("aria-expanded", "false");
  boutonNavigation.querySelector(".bouton-navigation__etat").textContent = "Ouvrir";
  if (rendreFocus) boutonNavigation.focus();
}

boutonNavigation?.addEventListener("click", () => {
  const ouverture = boutonNavigation.getAttribute("aria-expanded") !== "true";
  boutonNavigation.setAttribute("aria-expanded", String(ouverture));
  navigation.hidden = !ouverture;
  boutonNavigation.querySelector(".bouton-navigation__etat").textContent = ouverture ? "Fermer" : "Ouvrir";
  if (ouverture) navigation.querySelector("a")?.focus();
});

navigation?.addEventListener("click", (event) => {
  const lien = event.target.closest("a");
  if (!lien) return;
  fermerNavigation();
  if (!lien.hash) return;
  const cible = document.querySelector(lien.hash);
  const titre = cible?.matches("h2") ? cible : cible?.querySelector("h2");
  if (!titre) return;
  titre.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => titre.focus({ preventScroll: true }));
  titre.addEventListener("blur", () => titre.removeAttribute("tabindex"), { once: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && boutonNavigation && !boutonNavigation.hidden && boutonNavigation.getAttribute("aria-expanded") === "true") {
    fermerNavigation(true);
  }
});

const elementsReveles = document.querySelectorAll("[data-revele]");
if ("IntersectionObserver" in window) {
  const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add("est-visible");
      observateur.unobserve(entree.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
  elementsReveles.forEach((element) => observateurRevelation.observe(element));
} else {
  elementsReveles.forEach((element) => element.classList.add("est-visible"));
}

const barreMobile = document.querySelector("#barre-mobile");
const actionsHero = document.querySelector(".hero__actions");
const sectionReservation = document.querySelector("#reservation");
const piedPage = document.querySelector(".pied-page");
let actionsHeroVisibles = true;
let reservationVisible = false;
let piedPageVisible = false;

function actualiserBarreMobile() {
  if (!barreMobile) return;
  if (!mediaMobile.matches) {
    barreMobile.hidden = true;
    return;
  }
  barreMobile.hidden = false;
  barreMobile.classList.toggle("est-masquee", actionsHeroVisibles || reservationVisible || piedPageVisible);
}

if (barreMobile && "IntersectionObserver" in window) {
  const observateurBarre = new IntersectionObserver((entrees) => {
    entrees.forEach((entree) => {
      if (entree.target === actionsHero) actionsHeroVisibles = entree.isIntersecting;
      if (entree.target === sectionReservation) reservationVisible = entree.isIntersecting;
      if (entree.target === piedPage) piedPageVisible = entree.isIntersecting;
    });
    actualiserBarreMobile();
  }, { threshold: 0.04 });
  [actionsHero, sectionReservation, piedPage].filter(Boolean).forEach((element) => observateurBarre.observe(element));
}
mediaMobile.addEventListener("change", actualiserBarreMobile);
actualiserBarreMobile();

const form = document.querySelector("#formulaire-reservation");
const datesContainer = document.querySelector("#choix-dates");
const heuresContainer = document.querySelector("#choix-heures");
const panneaux = [...document.querySelectorAll("[data-panneau]")];
const boutonsProgression = [...document.querySelectorAll("[data-etape]")];
const annonceEtape = document.querySelector("#annonce-etape");
const recapPrestation = document.querySelector("#recap-prestation");
const recapJour = document.querySelector("#recap-jour");
const recapHeure = document.querySelector("#recap-heure");
const recapPrix = document.querySelector("#recap-prix");
const resultat = document.querySelector("#resultat-reservation");
const telechargerRappel = document.querySelector("#telecharger-rappel");

panneaux.forEach((panneau, index) => {
  const estActif = index === 0;
  panneau.toggleAttribute("inert", !estActif);
  panneau.setAttribute("aria-hidden", String(!estActif));
});

const etat = {
  etape: 0,
  prestation: null,
  jour: null,
  heure: null
};

const joursSemaine = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const joursCourts = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function capitaliser(texte) {
  return texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);
}

function cleJour(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function creerJours() {
  if (!datesContainer) return;
  const maintenant = new Date();
  const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());

  for (let decalage = 0; decalage < 14; decalage += 1) {
    const date = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate() + decalage);
    const ferme = date.getDay() === 0 || date.getDay() === 1;
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "choix-date";
    bouton.disabled = ferme;
    bouton.dataset.jour = cleJour(date);
    bouton.setAttribute("aria-pressed", "false");
    bouton.setAttribute("aria-label", `${capitaliser(joursSemaine.format(date))} ${dateLongue.format(date).replace(/^\p{L}+\s/iu, "")}${ferme ? ", fermé" : ", proposé dans cette simulation"}`);

    const jour = document.createElement("span");
    jour.textContent = joursCourts.format(date).replace(".", "");
    const numero = document.createElement("strong");
    numero.textContent = String(date.getDate());
    bouton.append(jour, numero);

    if (ferme) {
      const fermeture = document.createElement("small");
      fermeture.textContent = "Fermé";
      bouton.append(fermeture);
    }

    bouton.addEventListener("click", () => choisirJour(date, bouton));
    datesContainer.append(bouton);
  }
}

function formatHeure(minutes) {
  const heures = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return `${heures} h ${String(minutesRestantes).padStart(2, "0")}`;
}

function actualiserRecapitulatif() {
  if (recapPrestation) recapPrestation.textContent = etat.prestation?.nom || "À choisir";
  if (recapJour) recapJour.textContent = etat.jour ? capitaliser(dateLongue.format(etat.jour)) : "À choisir";
  if (recapHeure) recapHeure.textContent = etat.heure ? formatHeure(etat.heure) : "À choisir";
  if (recapPrix) recapPrix.textContent = etat.prestation ? `${etat.prestation.prix}\u00a0€` : "—";
}

function etapeComplete(numero) {
  if (numero === 0) return Boolean(etat.prestation);
  if (numero === 1) return Boolean(etat.prestation && etat.jour);
  if (numero === 2) return Boolean(etat.prestation && etat.jour && etat.heure);
  return false;
}

function actualiserProgression() {
  boutonsProgression.forEach((bouton) => {
    const numero = Number(bouton.dataset.etape);
    bouton.disabled = numero !== etat.etape && !etapeComplete(numero);
    if (numero === etat.etape) bouton.setAttribute("aria-current", "step");
    else bouton.removeAttribute("aria-current");
  });
}

function afficherEtape(numero, deplacerFocus = true) {
  if (numero < 0 || numero > 3) return;
  if (numero > etat.etape && !etapeComplete(etat.etape)) return;

  etat.etape = numero;
  panneaux.forEach((panneau) => {
    const estActif = Number(panneau.dataset.panneau) === numero;
    panneau.classList.toggle("is-current", estActif);
    panneau.toggleAttribute("inert", !estActif);
    panneau.setAttribute("aria-hidden", String(!estActif));
  });
  actualiserProgression();

  const titre = panneaux[numero]?.querySelector("h3");
  if (titre && deplacerFocus) titre.focus({ preventScroll: true });
  if (annonceEtape) annonceEtape.textContent = `Étape ${numero + 1} sur 4\u00a0: ${titre?.textContent || "rendez-vous"}.`;
}

function choisirPrestation(radio, passerAuJour = false) {
  const nouvellePrestation = {
    cle: radio.value,
    nom: radio.dataset.nom,
    duree: Number(radio.dataset.duree),
    prix: Number(radio.dataset.prix)
  };
  const changement = etat.prestation?.cle !== nouvellePrestation.cle;
  etat.prestation = nouvellePrestation;
  if (changement) {
    etat.jour = null;
    etat.heure = null;
    if (heuresContainer) heuresContainer.replaceChildren();
    document.querySelector('[data-panneau="0"] [data-suite]')?.removeAttribute("disabled");
    document.querySelector('[data-panneau="1"] [data-suite]')?.setAttribute("disabled", "");
    document.querySelector('[data-panneau="2"] [data-suite]')?.setAttribute("disabled", "");
    datesContainer?.querySelectorAll(".choix-date").forEach((bouton) => bouton.setAttribute("aria-pressed", "false"));
  }
  actualiserRecapitulatif();
  actualiserProgression();
  if (passerAuJour) {
    afficherEtape(1);
    document.querySelector("#reservation")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  }
}

function choisirJour(date, boutonChoisi) {
  etat.jour = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  etat.heure = null;
  datesContainer.querySelectorAll(".choix-date").forEach((bouton) => bouton.setAttribute("aria-pressed", String(bouton === boutonChoisi)));
  document.querySelector('[data-panneau="1"] [data-suite]')?.removeAttribute("disabled");
  document.querySelector('[data-panneau="2"] [data-suite]')?.setAttribute("disabled", "");
  creerHeures();
  actualiserRecapitulatif();
  actualiserProgression();
}

function hashDeterministe(texte) {
  let valeur = 2166136261;
  for (let index = 0; index < texte.length; index += 1) {
    valeur ^= texte.charCodeAt(index);
    valeur = Math.imul(valeur, 16777619);
  }
  return valeur >>> 0;
}

function creerHeures() {
  if (!heuresContainer || !etat.jour || !etat.prestation) return;
  heuresContainer.replaceChildren();
  const maintenant = new Date();
  const aujourdHui = cleJour(maintenant) === cleJour(etat.jour);
  const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
  const fermeture = 20 * 60;

  for (let debut = 10 * 60; debut + etat.prestation.duree <= fermeture; debut += 30) {
    const bouton = document.createElement("button");
    const minutesPassees = aujourdHui && debut <= minuteActuelle;
    const dejaPris = hashDeterministe(`${cleJour(etat.jour)}-${etat.prestation.cle}-${debut}`) % 7 === 0;
    const indisponible = minutesPassees || dejaPris;
    bouton.type = "button";
    bouton.className = `choix-heure${dejaPris ? " est-pris" : ""}`;
    bouton.disabled = indisponible;
    bouton.setAttribute("aria-pressed", "false");
    bouton.dataset.heure = String(debut);

    const valeur = document.createElement("span");
    valeur.className = "choix-heure__valeur";
    valeur.textContent = formatHeure(debut);
    bouton.append(valeur);

    if (minutesPassees) {
      bouton.setAttribute("aria-label", `${formatHeure(debut)}, horaire passé`);
    } else if (dejaPris) {
      const mention = document.createElement("small");
      mention.className = "choix-heure__etat";
      mention.textContent = "Déjà pris · simulation";
      bouton.append(mention);
      bouton.setAttribute("aria-label", `${formatHeure(debut)}, déjà pris dans cette simulation`);
    } else {
      bouton.setAttribute("aria-label", `Choisir ${formatHeure(debut)}`);
    }

    if (!indisponible) {
      bouton.addEventListener("click", () => {
        etat.heure = debut;
        heuresContainer.querySelectorAll(".choix-heure").forEach((choix) => choix.setAttribute("aria-pressed", String(choix === bouton)));
        document.querySelector('[data-panneau="2"] [data-suite]')?.removeAttribute("disabled");
        actualiserRecapitulatif();
        actualiserProgression();
      });
    }
    heuresContainer.append(bouton);
  }
}

function effacerErreurs() {
  document.querySelectorAll(".erreur-champ").forEach((erreur) => { erreur.textContent = ""; });
  document.querySelectorAll("[aria-invalid='true']").forEach((champ) => champ.removeAttribute("aria-invalid"));
}

creerJours();
actualiserRecapitulatif();
actualiserProgression();

form?.querySelectorAll("input[name='prestation']").forEach((radio) => {
  radio.addEventListener("change", () => choisirPrestation(radio));
});

document.querySelectorAll("[data-choix-prestation]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    const radio = form?.querySelector(`input[name='prestation'][value='${bouton.dataset.choixPrestation}']`);
    if (!radio) return;
    radio.checked = true;
    choisirPrestation(radio, true);
  });
});

document.querySelectorAll("[data-suite]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    if (bouton.disabled) return;
    const panneau = Number(bouton.closest("[data-panneau]").dataset.panneau);
    effacerErreurs();
    afficherEtape(panneau + 1);
  });
});

document.querySelectorAll("[data-retour]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    effacerErreurs();
    afficherEtape(etat.etape - 1);
  });
});

boutonsProgression.forEach((bouton) => {
  bouton.addEventListener("click", () => {
    if (bouton.disabled) return;
    effacerErreurs();
    afficherEtape(Number(bouton.dataset.etape));
  });
});

function echapperICal(texte) {
  return String(texte).replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
}

function heureICal(date) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function preparerRappel() {
  if (!etat.jour || !etat.heure || !etat.prestation || !telechargerRappel) return;
  const debut = new Date(etat.jour.getFullYear(), etat.jour.getMonth(), etat.jour.getDate(), Math.floor(etat.heure / 60), etat.heure % 60);
  const fin = new Date(debut.getTime() + etat.prestation.duree * 60_000);
  const contenu = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studio Lamy//Golden Barber//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@golden-barber-apercu`,
    `DTSTAMP:${heureICal(new Date())}`,
    `DTSTART:${heureICal(debut)}`,
    `DTEND:${heureICal(fin)}`,
    `SUMMARY:${echapperICal(`${etat.prestation.nom} — Golden Barber`)}`,
    `LOCATION:${echapperICal("8 Rue Flatters, 80000 Amiens")}`,
    `DESCRIPTION:${echapperICal("Rappel de simulation uniquement : ce fichier ne réserve pas un rendez-vous.")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const fichier = new Blob([contenu], { type: "text/calendar;charset=utf-8" });
  telechargerRappel.href = URL.createObjectURL(fichier);
}

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  effacerErreurs();

  const prenom = document.querySelector("#prenom");
  const telephone = document.querySelector("#telephone");
  const erreurPrenom = document.querySelector("#erreur-prenom");
  const erreurTelephone = document.querySelector("#erreur-telephone");
  const telephoneNettoye = telephone.value.trim();
  const telephoneValide = /^(?:0[67](?:[ .-]?\d{2}){4}|\+33[ .-]?[67](?:[ .-]?\d{2}){4})$/.test(telephoneNettoye);
  let premierChampInvalide = null;

  if (!prenom.value.trim()) {
    erreurPrenom.textContent = "Indiquez votre prénom.";
    prenom.setAttribute("aria-invalid", "true");
    premierChampInvalide = prenom;
  }
  if (!telephoneValide) {
    erreurTelephone.textContent = "Saisissez un numéro de mobile français commençant par 06, 07 ou +33 6, +33 7.";
    telephone.setAttribute("aria-invalid", "true");
    premierChampInvalide ||= telephone;
  }
  if (premierChampInvalide) {
    premierChampInvalide.focus();
    return;
  }

  const titreResultat = document.querySelector("#titre-resultat");
  const messageResultat = document.querySelector("#message-resultat");
  if (titreResultat) titreResultat.textContent = `Votre sélection est prête, ${prenom.value.trim()}.`;
  if (messageResultat) messageResultat.textContent = `Aucun rendez-vous n’a été transmis à Golden Barber. Pour confirmer une réservation, utilisez Planity ou appelez le salon au 07 83 55 96 92.`;
  document.querySelector("#etapes-formulaire").hidden = true;
  document.querySelector(".progression").hidden = true;
  resultat.hidden = false;
  preparerRappel();
  actualiserRecapitulatif();
  titreResultat?.focus();
});
