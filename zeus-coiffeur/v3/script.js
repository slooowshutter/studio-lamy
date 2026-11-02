(() => {
  const racine = document.documentElement;
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");

  const boutonNavigation = document.querySelector(".bouton-navigation");
  const navigation = document.querySelector("#navigation-principale");
  const liensNavigation = navigation ? [...navigation.querySelectorAll("a")] : [];
  const petitEcran = window.matchMedia("(max-width: 759px)");

  function fermerNavigation(rendreFocus = false) {
    if (!boutonNavigation || !navigation) return;
    navigation.removeAttribute("data-ouvert");
    navigation.inert = petitEcran.matches;
    navigation.setAttribute("aria-hidden", petitEcran.matches ? "true" : "false");
    boutonNavigation.setAttribute("aria-expanded", "false");
    boutonNavigation.setAttribute("aria-label", "Ouvrir la navigation");
    if (rendreFocus) boutonNavigation.focus();
  }

  function adapterNavigation() {
    if (!boutonNavigation || !navigation) return;
    if (petitEcran.matches) {
      fermerNavigation();
    } else {
      navigation.removeAttribute("data-ouvert");
      navigation.inert = false;
      navigation.setAttribute("aria-hidden", "false");
      boutonNavigation.setAttribute("aria-expanded", "false");
      boutonNavigation.setAttribute("aria-label", "Ouvrir la navigation");
    }
  }

  if (boutonNavigation && navigation) {
    adapterNavigation();
    petitEcran.addEventListener("change", adapterNavigation);
    boutonNavigation.addEventListener("click", () => {
      const ouverture = boutonNavigation.getAttribute("aria-expanded") !== "true";
      if (!ouverture) {
        fermerNavigation(true);
        return;
      }
      navigation.setAttribute("data-ouvert", "");
      navigation.inert = false;
      navigation.setAttribute("aria-hidden", "false");
      boutonNavigation.setAttribute("aria-expanded", "true");
      boutonNavigation.setAttribute("aria-label", "Fermer la navigation");
      liensNavigation[0]?.focus();
    });
    navigation.addEventListener("keydown", (evenement) => {
      if (evenement.key === "Escape" && petitEcran.matches) {
        fermerNavigation(true);
      }
    });
    liensNavigation.forEach((lien) => {
      lien.addEventListener("click", () => {
        if (petitEcran.matches) {
          const destination = lien.hash ? document.querySelector(lien.hash) : null;
          fermerNavigation();
          if (destination) {
            destination.setAttribute("tabindex", "-1");
            window.requestAnimationFrame(() => donnerFocus(destination));
          }
        }
      });
    });
    document.addEventListener("pointerdown", (evenement) => {
      if (!petitEcran.matches || boutonNavigation.getAttribute("aria-expanded") !== "true") return;
      if (!navigation.contains(evenement.target) && !boutonNavigation.contains(evenement.target)) {
        fermerNavigation();
      }
    });
  }

  const etapes = [...document.querySelectorAll(".etape-formulaire")];
  const annonceEtape = document.querySelector("#annonce-etape");
  let etapeActive = 0;
  const nettoyagesEtapes = new Map();
  const entreesEtapes = new WeakMap();

  function donnerFocus(element) {
    if (!element) return;
    try {
      element.focus({ preventScroll: true });
    } catch {
      element.focus();
    }
  }

  function changerEtape(index) {
    if (index < 0 || index >= etapes.length || index === etapeActive) return;
    const precedente = etapes[etapeActive];
    const suivante = etapes[index];
    [precedente, suivante].forEach((etape) => {
      const nettoyage = nettoyagesEtapes.get(etape);
      if (nettoyage) window.clearTimeout(nettoyage);
      nettoyagesEtapes.delete(etape);
    });

    const jetonEntree = Symbol("etape active");
    entreesEtapes.set(suivante, jetonEntree);

    precedente.inert = true;
    precedente.setAttribute("aria-hidden", "true");
    precedente.classList.remove("transition-entree");
    precedente.classList.add("transition-sortie");

    suivante.inert = false;
    suivante.setAttribute("aria-hidden", "false");
    suivante.classList.remove("transition-sortie");
    suivante.classList.add("active", "transition-entree");
    etapeActive = index;

    const titre = suivante.querySelector("h3");
    donnerFocus(titre);
    if (annonceEtape) {
      annonceEtape.textContent = index === 3
        ? "Demande simulée. Aucune réservation n’a été enregistrée et rien n’a été envoyé."
        : `Étape ${index + 1} sur 3.`;
    }

    window.requestAnimationFrame(() => {
      if (entreesEtapes.get(suivante) === jetonEntree && suivante.classList.contains("active")) {
        suivante.classList.remove("transition-entree");
      }
    });

    const nettoyage = window.setTimeout(() => {
      if (precedente !== etapes[etapeActive]) {
        precedente.classList.remove("active", "transition-sortie", "transition-entree");
      }
      nettoyagesEtapes.delete(precedente);
    }, mouvementReduit.matches ? 0 : 240);
    nettoyagesEtapes.set(precedente, nettoyage);
  }

  if (etapes.length) {
    etapes.forEach((etape, index) => {
      const active = index === 0;
      etape.classList.toggle("active", active);
      etape.inert = !active;
      etape.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  const choixCategorie = [...document.querySelectorAll('input[name="categorie"]')];
  const champJour = document.querySelector("#jour-souhaite");
  const champPrenom = document.querySelector("#prenom");
  const champTelephone = document.querySelector("#telephone-visiteur");
  const valeurCategorie = document.querySelector("[data-recap-categorie]");
  const valeurJour = document.querySelector("[data-recap-jour]");
  const valeurPrenom = document.querySelector("[data-recap-prenom]");
  const recapitulatifFinal = document.querySelector("#recapitulatif-final");

  if (champJour) {
    const aujourdHui = new Date();
    const annee = aujourdHui.getFullYear();
    const mois = String(aujourdHui.getMonth() + 1).padStart(2, "0");
    const jour = String(aujourdHui.getDate()).padStart(2, "0");
    champJour.min = `${annee}-${mois}-${jour}`;
  }

  function categorieChoisie() {
    return choixCategorie.find((choix) => choix.checked)?.value || "";
  }

  function dateFormatee(valeur) {
    if (!valeur) return "";
    const date = new Date(`${valeur}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "long",
      timeZone: "Europe/Paris",
    }).format(date);
  }

  function mettreAJourRecapitulatif() {
    if (valeurCategorie) valeurCategorie.textContent = categorieChoisie() || "À choisir";
    if (valeurJour) valeurJour.textContent = dateFormatee(champJour?.value) || "À choisir";
    if (valeurPrenom) valeurPrenom.textContent = champPrenom?.value.trim() || "—";
  }

  choixCategorie.forEach((choix) => choix.addEventListener("change", () => {
    const erreur = document.querySelector("#erreur-categorie");
    if (erreur) erreur.textContent = "";
    mettreAJourRecapitulatif();
    if (annonceEtape) annonceEtape.textContent = `Catégorie choisie : ${choix.value}.`;
  }));
  champJour?.addEventListener("input", () => {
    const erreur = document.querySelector("#erreur-jour");
    if (erreur) erreur.textContent = "";
    champJour.removeAttribute("aria-invalid");
    mettreAJourRecapitulatif();
    const jourChoisi = dateFormatee(champJour.value);
    if (jourChoisi && annonceEtape) {
      annonceEtape.textContent = `Jour souhaité : ${jourChoisi}. Les disponibilités ne sont pas vérifiées.`;
    }
  });
  champPrenom?.addEventListener("input", () => {
    const erreur = document.querySelector("#erreur-prenom");
    if (erreur) erreur.textContent = "";
    champPrenom.removeAttribute("aria-invalid");
    mettreAJourRecapitulatif();
  });
  champTelephone?.addEventListener("input", () => {
    const erreur = document.querySelector("#erreur-telephone");
    if (erreur) erreur.textContent = "";
    champTelephone.removeAttribute("aria-invalid");
  });

  function signalerErreur(champ, identifiant, message) {
    const zone = document.querySelector(identifiant);
    if (zone) zone.textContent = message;
    if (champ) champ.setAttribute("aria-invalid", "true");
  }

  function effacerErreur(champ, identifiant) {
    const zone = document.querySelector(identifiant);
    if (zone) zone.textContent = "";
    champ?.removeAttribute("aria-invalid");
  }

  function dateValide() {
    if (!champJour?.value) return false;
    const maintenant = new Date();
    const aujourdHui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const choisie = new Date(`${champJour.value}T12:00:00`);
    return !Number.isNaN(choisie.getTime()) && choisie >= aujourdHui;
  }

  function telephoneFrancaisValide(valeur) {
    const nettoye = valeur.trim().replace(/[\s().-]/g, "");
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8}|0033[1-9]\d{8})$/.test(nettoye);
  }

  document.querySelectorAll("[data-suivant]").forEach((bouton) => {
    bouton.addEventListener("click", () => {
      if (etapeActive === 0) {
        if (!categorieChoisie()) {
          const erreur = document.querySelector("#erreur-categorie");
          if (erreur) erreur.textContent = "Choisissez une catégorie pour continuer.";
          donnerFocus(choixCategorie[0]);
          return;
        }
        changerEtape(1);
      } else if (etapeActive === 1) {
        if (!dateValide()) {
          signalerErreur(champJour, "#erreur-jour", "Choisissez un jour souhaité, aujourd’hui ou plus tard.");
          donnerFocus(champJour);
          return;
        }
        effacerErreur(champJour, "#erreur-jour");
        changerEtape(2);
      }
    });
  });

  document.querySelectorAll("[data-precedent]").forEach((bouton) => {
    bouton.addEventListener("click", () => changerEtape(etapeActive - 1));
  });

  document.querySelector("#confirmer-simulation")?.addEventListener("click", () => {
    const prenomValide = Boolean(champPrenom?.value.trim());
    const telephoneValide = Boolean(champTelephone && telephoneFrancaisValide(champTelephone.value));
    if (!prenomValide) {
      signalerErreur(champPrenom, "#erreur-prenom", "Saisissez votre prénom pour voir le récapitulatif.");
      donnerFocus(champPrenom);
      return;
    }
    effacerErreur(champPrenom, "#erreur-prenom");
    if (!telephoneValide) {
      signalerErreur(champTelephone, "#erreur-telephone", "Saisissez un numéro de téléphone français valide.");
      donnerFocus(champTelephone);
      return;
    }
    effacerErreur(champTelephone, "#erreur-telephone");
    mettreAJourRecapitulatif();
    if (recapitulatifFinal) {
      recapitulatifFinal.textContent = `${champPrenom.value.trim()} — ${categorieChoisie()}, jour souhaité : ${dateFormatee(champJour.value)}.`;
    }
    changerEtape(3);
  });

  document.querySelector("#recommencer")?.addEventListener("click", () => {
    choixCategorie.forEach((choix) => { choix.checked = false; });
    if (champJour) champJour.value = "";
    if (champPrenom) champPrenom.value = "";
    if (champTelephone) champTelephone.value = "";
    document.querySelectorAll(".erreur-champ").forEach((zone) => { zone.textContent = ""; });
    document.querySelectorAll(".champ").forEach((champ) => champ.removeAttribute("aria-invalid"));
    if (recapitulatifFinal) recapitulatifFinal.textContent = "";
    mettreAJourRecapitulatif();
    changerEtape(0);
  });

  const cibleRevelations = [...document.querySelectorAll("[data-revelation], .ligne-rue")];
  if (!mouvementReduit.matches && "IntersectionObserver" in window) {
    const observateurRevelation = new IntersectionObserver((entrees, observateur) => {
      entrees.forEach((entree) => {
        if (entree.isIntersecting) {
          entree.target.classList.add("visible");
          observateur.unobserve(entree.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });
    cibleRevelations.forEach((cible) => observateurRevelation.observe(cible));
  } else {
    cibleRevelations.forEach((cible) => cible.classList.add("visible"));
  }

  const barreMobile = document.querySelector(".barre-mobile");
  const hero = document.querySelector(".hero");
  const reservation = document.querySelector("#reserver");
  const piedPage = document.querySelector(".pied-page");
  if (barreMobile && "IntersectionObserver" in window) {
    barreMobile.inert = true;
    barreMobile.setAttribute("aria-hidden", "true");
    const etatSections = { hero: true, reservation: false, pied: false };
    function actualiserBarre() {
      const visible = !etatSections.hero && !etatSections.reservation && !etatSections.pied;
      barreMobile.classList.toggle("visible", visible);
      barreMobile.inert = !visible;
      barreMobile.setAttribute("aria-hidden", visible ? "false" : "true");
    }
    const observateurBarre = new IntersectionObserver((entrees) => {
      entrees.forEach((entree) => {
        if (entree.target === hero) etatSections.hero = entree.isIntersecting;
        if (entree.target === reservation) etatSections.reservation = entree.isIntersecting;
        if (entree.target === piedPage) etatSections.pied = entree.isIntersecting;
      });
      actualiserBarre();
    }, { threshold: 0, rootMargin: "-12% 0px -12% 0px" });
    if (hero) observateurBarre.observe(hero);
    if (reservation) observateurBarre.observe(reservation);
    if (piedPage) observateurBarre.observe(piedPage);
  } else if (barreMobile) {
    barreMobile.classList.add("visible");
    barreMobile.inert = false;
    barreMobile.setAttribute("aria-hidden", "false");
  }

  racine.classList.add("js");
  if (mouvementReduit.matches) {
    document.querySelectorAll(".entree-hero, [data-revelation], .ligne-rue").forEach((element) => element.classList.add("visible"));
  } else {
    window.requestAnimationFrame(() => {
      document.querySelectorAll(".entree-hero").forEach((element) => element.classList.add("visible"));
    });
  }
})();
