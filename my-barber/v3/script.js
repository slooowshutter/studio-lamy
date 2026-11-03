document.documentElement.classList.add("js");

const preferencesMouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");
const boutonNavigation = document.querySelector(".entete__commande");
const navigation = document.querySelector("#navigation-principale");

function reglerNavigationMobile() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  navigation.hidden = mobile && boutonNavigation.getAttribute("aria-expanded") !== "true";
  boutonNavigation.hidden = !mobile;
}

function fermerNavigation(rendreFocus = false) {
  boutonNavigation.setAttribute("aria-expanded", "false");
  boutonNavigation.setAttribute("aria-label", "Ouvrir la navigation");
  navigation.hidden = true;
  if (rendreFocus) boutonNavigation.focus();
}

reglerNavigationMobile();
window.matchMedia("(max-width: 760px)").addEventListener("change", reglerNavigationMobile);

boutonNavigation.addEventListener("click", () => {
  const ouverte = boutonNavigation.getAttribute("aria-expanded") === "true";
  if (ouverte) {
    fermerNavigation();
    return;
  }
  boutonNavigation.setAttribute("aria-expanded", "true");
  boutonNavigation.setAttribute("aria-label", "Fermer la navigation");
  navigation.hidden = false;
  navigation.querySelector("a")?.focus();
});

navigation.addEventListener("click", (event) => {
  if (event.target.closest("a") && window.matchMedia("(max-width: 760px)").matches) {
    fermerNavigation(true);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && boutonNavigation.getAttribute("aria-expanded") === "true") {
    fermerNavigation(true);
  }
});

const elementsEntree = [...document.querySelectorAll("[data-entree]")];
window.setTimeout(() => {
  elementsEntree.forEach((element) => element.classList.add("est-visible"));
  document.querySelector("[data-ruban]")?.classList.add("est-visible");
}, 70);

const elementsDeListes = document.querySelectorAll(
  ".liste-prestations li, .liste-a-completer li, .liste-sources li"
);
elementsDeListes.forEach((element, index) => {
  element.setAttribute("data-revelation", "");
  element.style.setProperty("--delai-revelation", `${(index % 4) * 55}ms`);
});

const elementsRevelation = [...document.querySelectorAll("[data-revelation]")];
if ("IntersectionObserver" in window && !preferencesMouvementReduit.matches) {
  const observateur = new IntersectionObserver((entrees, instance) => {
    entrees.forEach((entree) => {
      if (!entree.isIntersecting) return;
      entree.target.classList.add("est-visible");
      instance.unobserve(entree.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  elementsRevelation.forEach((element) => observateur.observe(element));
} else {
  elementsRevelation.forEach((element) => element.classList.add("est-visible"));
}

const prestations = [
  { id: "coupe-homme", nom: "Coupe Homme", duree: 30 },
  { id: "coupe-homme-cheveux-longs", nom: "Coupe Homme cheveux longs", duree: 40 },
  { id: "coupe-homme-barbe", nom: "Coupe Homme + Barbe", duree: 30 },
  { id: "barbe-courte", nom: "Barbe Courte", duree: 30 },
  { id: "barbe-longue", nom: "Barbe longue", duree: 30 }
];

const etat = {
  prestation: null,
  date: null,
  heure: null
};

let etapeActive = 0;
let etapeLaPlusLoin = 0;

const panneaux = [...document.querySelectorAll("[data-panneau]")];
const commandesEtapes = [...document.querySelectorAll("[data-etape]")];
const radiosPrestation = [...document.querySelectorAll('input[name="prestation"]')];
const listeJours = document.querySelector("#liste-jours");
const listeHeures = document.querySelector("#liste-heures");
const formulaire = document.querySelector("#formulaire-reservation");
const confirmation = document.querySelector("#confirmation");
const jourSelectionne = document.querySelector("#jour-selectionne");

function texteMajusculeInitial(texte) {
  return texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);
}

function formaterDate(date, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return texteMajusculeInitial(new Intl.DateTimeFormat("fr-FR", options).format(date));
}

function mettreAJourRecapitulatif() {
  document.querySelector("#recap-prestation").textContent = etat.prestation?.nom ?? "À choisir";
  document.querySelector("#recap-jour").textContent = etat.date ? formaterDate(etat.date) : "À choisir";
  document.querySelector("#recap-heure").textContent = etat.heure ?? "À choisir";
}

function mettreAJourCommandesEtapes() {
  commandesEtapes.forEach((commande) => {
    const numero = Number(commande.dataset.etape);
    commande.disabled = numero > etapeLaPlusLoin;
    if (numero === etapeActive) commande.setAttribute("aria-current", "step");
    else commande.removeAttribute("aria-current");
  });
}

function afficherEtape(numero, deplacerFocus = true) {
  if (numero > etapeLaPlusLoin || numero < 0 || numero > 3) return;
  etapeActive = numero;
  panneaux.forEach((panneau) => {
    const active = Number(panneau.dataset.panneau) === numero;
    panneau.hidden = !active;
    panneau.classList.toggle("est-en-entree", active);
  });
  confirmation.hidden = true;
  mettreAJourCommandesEtapes();
  const panneauActif = panneaux[numero];
  requestAnimationFrame(() => {
    panneauActif.classList.remove("est-en-entree");
    if (deplacerFocus) panneauActif.querySelector("h3")?.focus();
  });
}

function definirPrestation(id) {
  const choisie = prestations.find((prestation) => prestation.id === id);
  if (!choisie) return;
  etat.prestation = choisie;
  etat.date = null;
  etat.heure = null;
  etapeLaPlusLoin = 1;
  radiosPrestation.forEach((radio) => { radio.checked = radio.value === id; });
  mettreAJourRecapitulatif();
  mettreAJourCommandesEtapes();
  document.querySelector("#erreur-prestation").textContent = "";
}

radiosPrestation.forEach((radio) => {
  radio.addEventListener("change", () => definirPrestation(radio.value));
});

document.querySelectorAll("[data-prestation]").forEach((lien) => {
  lien.addEventListener("click", () => {
    definirPrestation(lien.dataset.prestation);
    afficherEtape(0, false);
  });
});

document.querySelector("[data-suivante='1']").addEventListener("click", () => {
  if (!etat.prestation) {
    document.querySelector("#erreur-prestation").textContent = "Choisissez une prestation pour continuer.";
    radiosPrestation[0]?.focus();
    return;
  }
  etapeLaPlusLoin = Math.max(etapeLaPlusLoin, 1);
  genererJours();
  afficherEtape(1);
});

document.querySelectorAll("[data-precedente]").forEach((bouton) => {
  bouton.addEventListener("click", () => afficherEtape(Number(bouton.dataset.precedente)));
});

commandesEtapes.forEach((commande) => {
  commande.addEventListener("click", () => afficherEtape(Number(commande.dataset.etape)));
});

function cleDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function datePaques(annee) {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(annee, mois - 1, jour);
}

function joursFeriesConnus(annee) {
  const fixes = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
  const dates = new Set(fixes.map((jourMois) => `${annee}-${jourMois}`));
  const paques = datePaques(annee);
  [1, 39, 50].forEach((decalage) => {
    const date = new Date(paques);
    date.setDate(date.getDate() + decalage);
    dates.add(cleDate(date));
  });
  return dates;
}

function ajouterBoutonJour(date, ferme, ferie) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "jour-propose";
  bouton.disabled = ferme || ferie;
  bouton.dataset.date = cleDate(date);
  bouton.setAttribute("aria-pressed", String(Boolean(etat.date && cleDate(etat.date) === cleDate(date))));

  const jourNom = document.createElement("span");
  jourNom.className = "jour-propose__nom";
  jourNom.textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(/\.$/, "");
  const jourNumero = document.createElement("span");
  jourNumero.className = "jour-propose__date";
  jourNumero.textContent = String(date.getDate()).padStart(2, "0");
  bouton.append(jourNom, jourNumero);

  const dateComplete = formaterDate(date);
  if (ferme) {
    const mention = document.createElement("span");
    mention.className = "jour-propose__ferme";
    mention.textContent = "Fermé";
    bouton.append(mention);
    bouton.setAttribute("aria-label", `${dateComplete}, fermé`);
  } else if (ferie) {
    const mention = document.createElement("span");
    mention.className = "jour-propose__ferme";
    mention.textContent = "À confirmer";
    bouton.append(mention);
    bouton.setAttribute("aria-label", `${dateComplete}, horaires à confirmer`);
  } else {
    bouton.setAttribute("aria-label", dateComplete);
    bouton.addEventListener("click", () => {
      etat.date = date;
      etat.heure = null;
      etapeLaPlusLoin = Math.max(etapeLaPlusLoin, 2);
      listeJours.querySelectorAll("button").forEach((element) => {
        element.setAttribute("aria-pressed", String(element === bouton));
      });
      mettreAJourRecapitulatif();
      genererHeures();
      afficherEtape(2);
    });
  }

  listeJours.append(bouton);
}

function genererJours() {
  listeJours.replaceChildren();
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);
  const joursFeries = joursFeriesConnus(debut.getFullYear());
  const joursFeriesAnneeProchaine = joursFeriesConnus(debut.getFullYear() + 1);
  for (let decalage = 0; decalage < 12; decalage += 1) {
    const date = new Date(debut);
    date.setDate(debut.getDate() + decalage);
    const estFerie = joursFeries.has(cleDate(date)) || joursFeriesAnneeProchaine.has(cleDate(date));
    ajouterBoutonJour(date, date.getDay() === 0, estFerie);
  }
}

function hacher(texte) {
  let valeur = 2166136261;
  for (let index = 0; index < texte.length; index += 1) {
    valeur ^= texte.charCodeAt(index);
    valeur = Math.imul(valeur, 16777619);
  }
  return valeur >>> 0;
}

function libelleHeure(minutes) {
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return `${heures}\u00a0h\u00a0${String(reste).padStart(2, "0")}`;
}

function ajouterBoutonHeure(minutes, date, prestation) {
  const heureTexte = libelleHeure(minutes);
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "heure-propose";
  bouton.setAttribute("aria-pressed", "false");
  const cle = `${cleDate(date)}|${minutes}|${prestation.id}`;
  const dejaPris = hacher(cle) % 7 === 0;
  const maintenant = new Date();
  const estAujourdHui = cleDate(date) === cleDate(maintenant);
  const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
  const passe = estAujourdHui && minutes <= minuteActuelle;
  const indisponible = dejaPris || passe;

  const valeur = document.createElement("span");
  valeur.textContent = heureTexte;
  bouton.append(valeur);

  if (indisponible) {
    bouton.disabled = true;
    const etatHeure = document.createElement("span");
    etatHeure.className = "heure-propose__etat";
    etatHeure.textContent = passe ? "Passé" : "Déjà pris";
    bouton.append(etatHeure);
    bouton.setAttribute("aria-label", passe ? `${heureTexte}, heure passée` : `${heureTexte}, déjà pris dans cette démonstration`);
    return bouton;
  }

  bouton.setAttribute("aria-label", `${heureTexte}, choisir cet horaire de démonstration`);
  bouton.addEventListener("click", () => {
    etat.heure = heureTexte;
    etapeLaPlusLoin = Math.max(etapeLaPlusLoin, 3);
    listeHeures.querySelectorAll("button").forEach((element) => {
      element.setAttribute("aria-pressed", String(element === bouton));
    });
    mettreAJourRecapitulatif();
    afficherEtape(3);
  });
  return bouton;
}

function genererHeures() {
  listeHeures.replaceChildren();
  if (!etat.date || !etat.prestation) return;
  const debutOuverture = 9 * 60;
  const finOuverture = 19 * 60;
  const derniereHeure = finOuverture - etat.prestation.duree;
  jourSelectionne.textContent = `${formaterDate(etat.date)} · les horaires publiés vont de 9 h à 19 h.`;
  for (let minutes = debutOuverture; minutes <= derniereHeure; minutes += 30) {
    listeHeures.append(ajouterBoutonHeure(minutes, etat.date, etat.prestation));
  }
}

const champs = {
  prenom: document.querySelector("#prenom"),
  telephone: document.querySelector("#telephone")
};

function validerTelephone(telephone) {
  const compact = telephone.replace(/[ .-]/g, "");
  return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
}

function afficherErreurChamp(champ, texte, identifiantErreur) {
  document.querySelector(`#${identifiantErreur}`).textContent = texte;
  if (texte) champ.setAttribute("aria-invalid", "true");
  else champ.removeAttribute("aria-invalid");
}

champs.prenom.addEventListener("input", () => afficherErreurChamp(champs.prenom, "", "erreur-prenom"));
champs.telephone.addEventListener("input", () => afficherErreurChamp(champs.telephone, "", "erreur-telephone"));

formulaire.addEventListener("submit", (event) => {
  event.preventDefault();
  const prenom = champs.prenom.value.trim();
  const telephone = champs.telephone.value.trim();
  const prenomValide = prenom.length > 0 && prenom.length <= 60;
  const telephoneValide = validerTelephone(telephone);

  afficherErreurChamp(champs.prenom, prenomValide ? "" : (prenom ? "Le prénom doit comporter 60 caractères au maximum." : "Saisissez votre prénom."), "erreur-prenom");
  afficherErreurChamp(champs.telephone, telephoneValide ? "" : "Saisissez un numéro de téléphone mobile français valide.", "erreur-telephone");

  if (!prenomValide || !telephoneValide || !etat.prestation || !etat.date || !etat.heure) {
    if (!etat.prestation) afficherEtape(0);
    else if (!etat.date) afficherEtape(1);
    else if (!etat.heure) afficherEtape(2);
    else (prenomValide ? champs.telephone : champs.prenom).focus();
    return;
  }

  const texte = `La demande pour ${etat.prestation.nom}, le ${formaterDate(etat.date)} à ${etat.heure}, est uniquement simulée.`;
  document.querySelector("#texte-confirmation").textContent = texte;
  formulaire.reset();
  panneaux.forEach((panneau) => { panneau.hidden = true; });
  confirmation.hidden = false;
  etapeActive = 3;
  mettreAJourCommandesEtapes();
  confirmation.querySelector("h3").focus();
});

document.querySelector("#recommencer").addEventListener("click", () => {
  formulaire.reset();
  radiosPrestation.forEach((radio) => { radio.checked = false; });
  etat.prestation = null;
  etat.date = null;
  etat.heure = null;
  etapeLaPlusLoin = 0;
  confirmation.hidden = true;
  afficherErreurChamp(champs.prenom, "", "erreur-prenom");
  afficherErreurChamp(champs.telephone, "", "erreur-telephone");
  mettreAJourRecapitulatif();
  afficherEtape(0);
});

mettreAJourRecapitulatif();
mettreAJourCommandesEtapes();
