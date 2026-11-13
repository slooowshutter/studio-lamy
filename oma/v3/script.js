document.documentElement.classList.add("js");

const nomsPrestations = {
  "curly-m": { nom: "Curly M", duree: 90 },
  "curly-l": { nom: "Curly L", duree: 105 },
  "coupe-l": { nom: "Coupe L", duree: 75 },
  "coupe-prestige": { nom: "Coupe Prestige", duree: 30 }
};

const etat = {
  etape: 0,
  etapeMax: 0,
  prestation: "",
  jour: null,
  heure: "",
  transitionEnCours: false
};

const reductionMouvement = window.matchMedia("(prefers-reduced-motion: reduce)");
const parcours = document.querySelector(".parcours");
const traitAnime = document.querySelector(".parcours__trait span");
const noeuds = [...document.querySelectorAll("[data-revelation]")];
const heroTexte = document.querySelector(".hero__texte");

requestAnimationFrame(() => {
  heroTexte?.classList.add("hero--visible");
});

if ("IntersectionObserver" in window) {
  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add("is-revele");
      instance.unobserve(entree.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

  noeuds.forEach((noeud) => observateur.observe(noeud));
} else {
  noeuds.forEach((noeud) => noeud.classList.add("is-revele"));
}

let cadreTrait = 0;
function dessinerParcours() {
  if (!parcours || !traitAnime || reductionMouvement.matches) return;
  if (cadreTrait) return;
  cadreTrait = requestAnimationFrame(() => {
    const rectangle = parcours.getBoundingClientRect();
    const progression = (window.innerHeight * 0.7 - rectangle.top) / rectangle.height;
    const borne = Math.max(0, Math.min(1, progression));
    traitAnime.style.transform = `scaleY(${borne})`;
    cadreTrait = 0;
  });
}

window.addEventListener("scroll", dessinerParcours, { passive: true });
window.addEventListener("resize", dessinerParcours, { passive: true });
reductionMouvement.addEventListener?.("change", dessinerParcours);
dessinerParcours();

const boutonNavigation = document.querySelector(".bouton-navigation");
const navigationMobile = document.querySelector("#navigation-mobile");

function fermerNavigation(rendreFocus = false) {
  if (!boutonNavigation || !navigationMobile || !navigationMobile.classList.contains("navigation-mobile--ouverte")) return;
  navigationMobile.classList.remove("navigation-mobile--ouverte");
  boutonNavigation.setAttribute("aria-expanded", "false");
  boutonNavigation.setAttribute("aria-label", "Ouvrir la navigation");
  if (rendreFocus) boutonNavigation.focus();
}

boutonNavigation?.addEventListener("click", () => {
  if (!navigationMobile) return;
  const ouvre = !navigationMobile.classList.contains("navigation-mobile--ouverte");
  navigationMobile.classList.toggle("navigation-mobile--ouverte", ouvre);
  boutonNavigation.setAttribute("aria-expanded", String(ouvre));
  boutonNavigation.setAttribute("aria-label", ouvre ? "Fermer la navigation" : "Ouvrir la navigation");
  if (ouvre) navigationMobile.querySelector("a")?.focus();
});

navigationMobile?.querySelectorAll("a").forEach((lien) => {
  lien.addEventListener("click", () => fermerNavigation());
});

document.addEventListener("keydown", (evenement) => {
  if (evenement.key === "Escape") fermerNavigation(true);
});

document.addEventListener("click", (evenement) => {
  if (!navigationMobile || !navigationMobile.classList.contains("navigation-mobile--ouverte")) return;
  if (navigationMobile.contains(evenement.target) || boutonNavigation?.contains(evenement.target)) return;
  fermerNavigation();
});

const barreMobile = document.querySelector("#barre-mobile");
const pointDeReservation = document.querySelector("#reservation");
const piedPage = document.querySelector(".pied-page");

if (barreMobile && "IntersectionObserver" in window) {
  const observateurBas = new IntersectionObserver((entrees) => {
    const visible = entrees.some((entree) => entree.isIntersecting);
    barreMobile.classList.toggle("est-masquee", visible);
  }, { threshold: 0.02, rootMargin: "-8% 0px -12% 0px" });
  if (pointDeReservation) observateurBas.observe(pointDeReservation);
  if (piedPage) observateurBas.observe(piedPage);
}

const simulateur = document.querySelector("#simulateur");
const panneaux = [...document.querySelectorAll("[data-panneau]")];
const boutonsEtapes = [...document.querySelectorAll("[data-retour-etape]")];
const annonceEtape = document.querySelector("#annonce-etape");
const resumeChoix = document.querySelector("#resume-choix");
const jours = document.querySelector("#choix-jours");
const heures = document.querySelector("#choix-heures");
const formulaire = document.querySelector("#formulaire-simulation");
const recapitulatifFormulaire = document.querySelector("#recapitulatif-formulaire");

if (simulateur) {
  simulateur.hidden = false;
  creerJours();
  actualiserEtapes();
  actualiserResume();
}

function lireDateNantaise() {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const lire = (type) => Number(parties.find((partie) => partie.type === type)?.value || 0);
  return { annee: lire("year"), mois: lire("month"), jour: lire("day") };
}

function formatHeureParis(date) {
  const parties = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Number(parties.find((partie) => partie.type === "hour")?.value || 0) * 60
    + Number(parties.find((partie) => partie.type === "minute")?.value || 0);
}

function nomJour(date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" })
    .format(date).replace(/\.$/, "");
}

function dateCourte(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short"
  }).format(date).replace(/\.$/, "");
}

function dateLongue(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

function minutesEnHeure(minutes) {
  const heuresEntieres = Math.floor(minutes / 60);
  const minutesRestantes = minutes % 60;
  return `${heuresEntieres}\u00a0h\u00a0${String(minutesRestantes).padStart(2, "0")}`;
}

function creerJours() {
  if (!jours) return;
  jours.replaceChildren();
  const aujourdHui = lireDateNantaise();
  const debut = Date.UTC(aujourdHui.annee, aujourdHui.mois - 1, aujourdHui.jour);

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(debut + index * 86400000);
    const jourSemaine = date.getUTCDay();
    const ferme = jourSemaine === 0 || jourSemaine === 6;
    const bouton = document.createElement("button");
    const nom = document.createElement("strong");
    const detail = document.createElement("span");
    const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

    nom.textContent = dateCourte(date);
    detail.textContent = ferme ? "Fermé" : nomJour(date);
    bouton.type = "button";
    bouton.dataset.indexJour = String(index);
    bouton.dataset.dateNette = iso;
    bouton.disabled = ferme;
    bouton.setAttribute("aria-pressed", "false");
    bouton.setAttribute("aria-label", ferme
      ? `${nomJour(date)} ${dateCourte(date)} : fermé selon les heures de Planity`
      : `${nomJour(date)} ${dateCourte(date)}, jour fictif de démonstration`);
    bouton.append(nom, detail);
    bouton.addEventListener("click", () => choisirJour(bouton, date));
    jours.append(bouton);
  }
}

function prestationChoisie() {
  return nomsPrestations[etat.prestation] || null;
}

function choisirPrestation(cle, annoncer = true) {
  if (!nomsPrestations[cle]) return;
  const etaitDifferente = etat.prestation !== cle;
  etat.prestation = cle;
  if (etaitDifferente) {
    etat.jour = null;
    etat.heure = "";
    jours?.querySelectorAll("button").forEach((bouton) => bouton.setAttribute("aria-pressed", "false"));
    heures?.replaceChildren();
  }
  const radio = document.querySelector(`input[name="prestation"][value="${cle}"]`);
  if (radio) radio.checked = true;
  document.querySelectorAll("[data-erreur-prestation]").forEach((element) => { element.textContent = ""; });
  const erreur = document.querySelector("#erreur-prestation");
  if (erreur) erreur.textContent = "";
  if (radio) radio.removeAttribute("aria-invalid");
  actualiserResume();
  if (annoncer && annonceEtape) annonceEtape.textContent = `${nomsPrestations[cle].nom} sélectionnée pour la démonstration.`;
  actualiserRecapitulatif();
}

document.querySelectorAll("input[name='prestation']").forEach((radio) => {
  radio.addEventListener("change", () => choisirPrestation(radio.value));
});

document.querySelectorAll("[data-choisir-prestation]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    choisirPrestation(bouton.dataset.choisirPrestation);
    document.querySelector("#reservation")?.scrollIntoView({ behavior: reductionMouvement.matches ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => document.querySelector("input[name='prestation']:checked")?.focus(), 180);
  });
});

function choisirJour(bouton, date) {
  etat.jour = date;
  etat.heure = "";
  jours?.querySelectorAll("button").forEach((element) => element.setAttribute("aria-pressed", "false"));
  bouton.setAttribute("aria-pressed", "true");
  const erreur = document.querySelector("#erreur-jour");
  if (erreur) erreur.textContent = "";
  creerHeures();
  actualiserResume();
  actualiserRecapitulatif();
  if (annonceEtape) annonceEtape.textContent = `${dateLongue(date)} choisie pour la démonstration.`;
}

function creerHeures() {
  if (!heures) return;
  heures.replaceChildren();
  const prestation = prestationChoisie();
  if (!etat.jour || !prestation) return;

  const aujourdHui = lireDateNantaise();
  const dateChoisie = `${etat.jour.getUTCFullYear()}-${String(etat.jour.getUTCMonth() + 1).padStart(2, "0")}-${String(etat.jour.getUTCDate()).padStart(2, "0")}`;
  const dateAujourdhui = `${aujourdHui.annee}-${String(aujourdHui.mois).padStart(2, "0")}-${String(aujourdHui.jour).padStart(2, "0")}`;
  const estAujourdhui = dateChoisie === dateAujourdhui;
  const minutesActuelles = estAujourdhui ? formatHeureParis(new Date()) : -1;
  const duree = prestation.duree;

  for (let minutes = 9 * 60; minutes + duree <= 19 * 60; minutes += 30) {
    if (estAujourdhui && minutes <= minutesActuelles) continue;
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = minutesEnHeure(minutes);
    bouton.dataset.heure = String(minutes);
    bouton.setAttribute("aria-pressed", "false");
    bouton.setAttribute("aria-label", `${minutesEnHeure(minutes)}, heure fictive de démonstration`);
    bouton.addEventListener("click", () => choisirHeure(bouton, minutes));
    heures.append(bouton);
  }

  if (heures.childElementCount === 0) {
    const vide = document.createElement("p");
    vide.className = "aide-etape";
    vide.textContent = "Aucune heure de démonstration ne reste pour ce jour. Choisissez un autre jour.";
    heures.append(vide);
  }
}

function choisirHeure(bouton, minutes) {
  etat.heure = minutesEnHeure(minutes);
  heures?.querySelectorAll("button").forEach((element) => element.setAttribute("aria-pressed", "false"));
  bouton.setAttribute("aria-pressed", "true");
  const erreur = document.querySelector("#erreur-heure");
  if (erreur) erreur.textContent = "";
  actualiserResume();
  actualiserRecapitulatif();
  if (annonceEtape) annonceEtape.textContent = `${etat.heure} choisie pour la démonstration.`;
}

function actualiserResume() {
  if (!resumeChoix) return;
  const morceaux = [];
  const prestation = prestationChoisie();
  if (prestation) morceaux.push(prestation.nom);
  if (etat.jour) morceaux.push(dateLongue(etat.jour));
  if (etat.heure) morceaux.push(etat.heure);
  resumeChoix.textContent = morceaux.length ? morceaux.join(" · ") : "Aucun choix pour le moment.";
}

function actualiserRecapitulatif() {
  if (!recapitulatifFormulaire) return;
  const morceaux = [];
  const prestation = prestationChoisie();
  if (prestation) morceaux.push(prestation.nom);
  if (etat.jour) morceaux.push(dateLongue(etat.jour));
  if (etat.heure) morceaux.push(etat.heure);
  recapitulatifFormulaire.textContent = morceaux.length
    ? `Récapitulatif de démonstration : ${morceaux.join(" · ")}. Aucun rendez-vous n’est pris.`
    : "Choisissez une prestation, un jour et une heure pour afficher le récapitulatif.";
}

function actualiserEtapes() {
  boutonsEtapes.forEach((bouton) => {
    const numero = Number(bouton.dataset.retourEtape);
    bouton.disabled = numero > etat.etapeMax || etat.transitionEnCours || etat.etape === 4;
    if (numero === etat.etape) bouton.setAttribute("aria-current", "step");
    else bouton.removeAttribute("aria-current");
  });
}

function afficherEtape(nouvelleEtape, annonce = true) {
  if (etat.transitionEnCours || nouvelleEtape === etat.etape || !panneaux[nouvelleEtape]) return;
  const ancienne = panneaux[etat.etape];
  const suivante = panneaux[nouvelleEtape];
  const direction = nouvelleEtape > etat.etape ? "avant" : "retour";
  etat.transitionEnCours = true;
  actualiserEtapes();

  if (ancienne) ancienne.dataset.transition = "part";
  window.setTimeout(() => {
    if (ancienne) {
      ancienne.hidden = true;
      delete ancienne.dataset.transition;
    }
    suivante.hidden = false;
    suivante.dataset.transition = "arrive";
    requestAnimationFrame(() => {
      delete suivante.dataset.transition;
      const titre = suivante.querySelector("h3");
      titre?.focus({ preventScroll: true });
    });
    etat.etape = nouvelleEtape;
    etat.transitionEnCours = false;
    actualiserEtapes();
    if (annonceEtape && annonce) {
      const titre = suivante.querySelector("h3")?.textContent || "Étape";
      annonceEtape.textContent = `${titre}, étape ${nouvelleEtape + 1} sur 4.`;
    }
  }, direction === "avant" || direction === "retour" ? 220 : 0);
}

function validerEtapeCourante() {
  if (etat.etape === 0) {
    if (!prestationChoisie()) {
      const erreur = document.querySelector("#erreur-prestation");
      if (erreur) erreur.textContent = "Choisissez une prestation pour continuer.";
      document.querySelector("input[name='prestation']")?.focus();
      return false;
    }
  }
  if (etat.etape === 1 && !etat.jour) {
    const erreur = document.querySelector("#erreur-jour");
    if (erreur) erreur.textContent = "Choisissez un jour de démonstration.";
    return false;
  }
  if (etat.etape === 2 && !etat.heure) {
    const erreur = document.querySelector("#erreur-heure");
    if (erreur) erreur.textContent = "Choisissez une heure de démonstration.";
    return false;
  }
  return true;
}

document.querySelectorAll("[data-avancer]").forEach((bouton) => {
  bouton.addEventListener("click", () => {
    if (!validerEtapeCourante()) return;
    etat.etapeMax = Math.max(etat.etapeMax, etat.etape + 1);
    afficherEtape(etat.etape + 1);
  });
});

document.querySelectorAll("[data-reculer]").forEach((bouton) => {
  bouton.addEventListener("click", () => afficherEtape(etat.etape - 1));
});

boutonsEtapes.forEach((bouton) => {
  bouton.addEventListener("click", () => {
    const cible = Number(bouton.dataset.retourEtape);
    if (cible <= etat.etapeMax && cible < panneaux.length) afficherEtape(cible);
  });
});

function afficherErreur(champ, identifiant, message) {
  const erreur = document.getElementById(identifiant);
  champ?.setAttribute("aria-invalid", "true");
  if (erreur) erreur.textContent = message;
}

function effacerErreur(champ, identifiant) {
  const erreur = document.getElementById(identifiant);
  champ?.removeAttribute("aria-invalid");
  if (erreur) erreur.textContent = "";
}

const champPrenom = document.querySelector("#prenom");
const champTelephone = document.querySelector("#telephone");

champPrenom?.addEventListener("input", () => effacerErreur(champPrenom, "erreur-prenom"));
champTelephone?.addEventListener("input", () => effacerErreur(champTelephone, "erreur-telephone"));

formulaire?.addEventListener("submit", (evenement) => {
  evenement.preventDefault();
  const prenom = champPrenom?.value.trim() || "";
  const telephone = champTelephone?.value.trim() || "";
  const numerotation = telephone.replace(/[\s.()-]/g, "");
  const mobileValide = /^(?:(?:\+33|0033)[67]\d{8}|0[67]\d{8})$/.test(numerotation);
  let valide = true;

  if (prenom.length < 2) {
    afficherErreur(champPrenom, "erreur-prenom", "Saisissez un prénom d’au moins deux lettres.");
    valide = false;
  } else {
    effacerErreur(champPrenom, "erreur-prenom");
  }

  if (!mobileValide) {
    afficherErreur(champTelephone, "erreur-telephone", "Saisissez un numéro de mobile français valide.");
    valide = false;
  } else {
    effacerErreur(champTelephone, "erreur-telephone");
  }

  if (!valide) {
    const premierChampEnErreur = formulaire.querySelector("[aria-invalid='true']");
    premierChampEnErreur?.focus();
    return;
  }

  const erreurFormulaire = document.querySelector("#erreur-formulaire");
  if (erreurFormulaire) erreurFormulaire.textContent = "";
  const recap = document.querySelector("#recapitulatif-fin");
  const prestation = prestationChoisie();
  if (recap) {
    recap.textContent = `${prenom}, votre sélection de démonstration : ${prestation?.nom || "prestation"}, ${etat.jour ? dateLongue(etat.jour) : "jour non choisi"}, à ${etat.heure || "heure non choisie"}.`;
  }
  etat.etapeMax = 4;
  afficherEtape(4, false);
  if (annonceEtape) annonceEtape.textContent = "Récapitulatif prêt. Aucun rendez-vous n’a été pris et rien n’a été envoyé.";
});

document.querySelector("#recommencer")?.addEventListener("click", () => {
  etat.etape = 4;
  etat.transitionEnCours = false;
  etat.etapeMax = 3;
  etat.prestation = "";
  etat.jour = null;
  etat.heure = "";
  formulaire?.reset();
  const erreurFormulaire = document.querySelector("#erreur-formulaire");
  if (erreurFormulaire) erreurFormulaire.textContent = "";
  effacerErreur(champPrenom, "erreur-prenom");
  effacerErreur(champTelephone, "erreur-telephone");
  jours?.querySelectorAll("button").forEach((bouton) => bouton.setAttribute("aria-pressed", "false"));
  heures?.replaceChildren();
  actualiserResume();
  actualiserRecapitulatif();
  actualiserEtapes();
  afficherEtape(0);
});

document.querySelectorAll("a[href^='#']").forEach((lien) => {
  lien.addEventListener("click", () => fermerNavigation());
});
