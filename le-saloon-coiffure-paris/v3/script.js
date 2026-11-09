(function () {
  "use strict";

  const page = document.documentElement;
  const form = document.querySelector("#formulaire-rendez-vous");
  const menuButton = document.querySelector(".entete__commande");
  const menu = document.querySelector("#navigation-mobile");
  const stickyBar = document.querySelector(".barre-mobile");
  const ligneParcours = document.querySelector(".parcours__ligne");
  const parisFormat = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hourCycle: "h23"
  });
  const joursFormat = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "short"
  });
  const state = { prestation: "", jour: null, heure: "", etape: 1 };
  const resumePrestation = document.querySelector("[data-resume-prestation]");
  const resumeJour = document.querySelector("[data-resume-jour]");
  const resumeHeure = document.querySelector("[data-resume-heure]");
  const annonce = document.querySelector("[data-annonce]");

  function partiesParis(date) {
    const value = {};
    parisFormat.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") value[part.type] = Number(part.value);
    });
    return value;
  }

  function dateParis(parts, decalage) {
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + decalage, 12));
  }

  function cleDate(date) {
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
  }

  function cleAujourdhui(parts) {
    return cleDate(new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12)));
  }

  function creerJours() {
    const cible = document.querySelector("[data-jours]");
    const maintenant = partiesParis(new Date());
    const aujourdhui = cleAujourdhui(maintenant);
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 14; index += 1) {
      const date = dateParis(maintenant, index);
      const jourSemaine = date.getUTCDay();
      const ferme = jourSemaine === 0 || jourSemaine === 1;
      const libelle = joursFormat.format(date).replace(".", "");
      const morceaux = libelle.split(" ");
      const bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "jour";
      bouton.dataset.cle = cleDate(date);
      bouton.dataset.libelle = libelle;
      bouton.disabled = ferme;
      bouton.setAttribute("aria-pressed", "false");
      bouton.setAttribute("aria-label", ferme ? morceaux[0] + " " + morceaux[1] + ", fermé" : morceaux[0] + " " + morceaux[1]);
      bouton.innerHTML = '<span class="jour__nom"></span><span class="jour__date"></span>' + (ferme ? '<span class="jour__ferme">Fermé</span>' : "");
      bouton.querySelector(".jour__nom").textContent = morceaux[0];
      bouton.querySelector(".jour__date").textContent = morceaux[1];
      if (bouton.dataset.cle === aujourdhui) bouton.dataset.aujourdhui = "oui";
      bouton.addEventListener("click", function () {
        cible.querySelectorAll(".jour").forEach(function (item) { item.setAttribute("aria-pressed", "false"); });
        bouton.setAttribute("aria-pressed", "true");
        state.jour = { cle: bouton.dataset.cle, libelle: bouton.dataset.libelle, aujourdhui: bouton.dataset.aujourdhui === "oui" };
        state.heure = "";
        resumeJour.textContent = state.jour.libelle;
        resumeHeure.textContent = "Heure à choisir";
        annonce.textContent = "Jour de démonstration choisi : " + state.jour.libelle + ". Les heures suivent à l’étape suivante.";
        document.querySelector("[data-erreur='2']").hidden = true;
        creerHeures();
      });
      fragment.appendChild(bouton);
    }
    cible.appendChild(fragment);
  }

  function creerHeures() {
    const cible = document.querySelector("[data-heures]");
    cible.replaceChildren();
    const maintenant = partiesParis(new Date());
    const minutesMaintenant = maintenant.hour * 60 + maintenant.minute;
    const aujourdhui = cleAujourdhui(maintenant);
    const fragment = document.createDocumentFragment();

    for (let minute = 10 * 60; minute <= 18 * 60; minute += 30) {
      const bouton = document.createElement("button");
      const heures = Math.floor(minute / 60);
      const minutes = minute % 60;
      const texte = String(heures).padStart(2, "0") + " h " + String(minutes).padStart(2, "0");
      bouton.type = "button";
      bouton.className = "heure";
      bouton.textContent = texte;
      bouton.disabled = Boolean(state.jour && state.jour.cle === aujourdhui && minute <= minutesMaintenant);
      bouton.setAttribute("aria-pressed", "false");
      bouton.addEventListener("click", function () {
        cible.querySelectorAll(".heure").forEach(function (item) { item.setAttribute("aria-pressed", "false"); });
        bouton.setAttribute("aria-pressed", "true");
        state.heure = texte;
        resumeHeure.textContent = texte;
        document.querySelector("[data-erreur='3']").hidden = true;
      });
      fragment.appendChild(bouton);
    }
    cible.appendChild(fragment);
  }

  function mettreAJourResume() {
    resumePrestation.textContent = state.prestation || "Prestation à choisir";
    resumeJour.textContent = state.jour ? state.jour.libelle : "Jour à choisir";
    resumeHeure.textContent = state.heure || "Heure à choisir";
  }

  function panneauEtape(numero) {
    return form.querySelector('[data-etape="' + numero + '"]');
  }

  function changerEtape(numero) {
    const precedent = panneauEtape(state.etape);
    const suivant = panneauEtape(numero);
    if (!suivant || numero < 1 || numero > 4) return;

    if (precedent && precedent !== suivant) {
      function afficherNouvelleEtape() {
        precedent.hidden = true;
        precedent.classList.remove("panneau--sortie", "panneau--entree", "panneau--visible");
        suivant.hidden = false;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          suivant.classList.add("panneau--entree");
          requestAnimationFrame(function () {
            suivant.classList.add("panneau--visible");
            window.setTimeout(function () {
              suivant.classList.remove("panneau--entree", "panneau--visible");
            }, 220);
          });
        }
        const titre = suivant.querySelector(".panneau__titre");
        if (titre) titre.focus();
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        afficherNouvelleEtape();
      } else {
        precedent.classList.add("panneau--sortie");
        window.setTimeout(afficherNouvelleEtape, 100);
      }
    } else {
      suivant.hidden = false;
    }

    state.etape = numero;
    form.querySelectorAll("[data-retour]").forEach(function (bouton) {
      const numeroBouton = Number(bouton.dataset.retour);
      bouton.disabled = numeroBouton > numero;
      if (numeroBouton === numero) bouton.setAttribute("aria-current", "step");
      else bouton.removeAttribute("aria-current");
    });
    annonce.textContent = "Étape " + numero + " sur 4.";
    mettreAJourResume();
  }

  function validerEtape() {
    const erreur = document.querySelector("[data-erreur='" + state.etape + "']");
    if (state.etape === 1 && !state.prestation) {
      erreur.hidden = false;
      return false;
    }
    if (state.etape === 2 && !state.jour) {
      erreur.hidden = false;
      return false;
    }
    if (state.etape === 3 && !state.heure) {
      erreur.hidden = false;
      return false;
    }
    if (erreur) erreur.hidden = true;
    return true;
  }

  function afficherRecapitulatif() {
    document.querySelector("[data-recapitulatif]").textContent =
      "Votre choix de démonstration : " + state.prestation + " · " + state.jour.libelle + " · " + state.heure + ". Aucun prix n’est affiché.";
  }

  function fermerMenu(rendreFocus) {
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    if (rendreFocus) menuButton.focus();
  }

  function initialiserMenu() {
    menuButton.addEventListener("click", function () {
      const ouverture = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(ouverture));
      menu.hidden = !ouverture;
      if (ouverture) menu.querySelector("a").focus();
    });
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) fermerMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) fermerMenu(true);
    });
  }

  function initialiserParcours() {
    const etapes = document.querySelectorAll(".etape");
    const parcours = document.querySelector(".parcours");
    function placerOrigine() {
      const lettre = document.querySelector(".hero__initial").getBoundingClientRect();
      const cadre = parcours.getBoundingClientRect();
      const origine = Math.max(0, lettre.top - cadre.top + lettre.height * 0.76);
      ligneParcours.style.top = origine + "px";
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      etapes.forEach(function (etape) { etape.classList.add("is-seen"); });
      document.querySelectorAll(".prix__ligne").forEach(function (ligne) { ligne.classList.add("is-seen"); });
      placerOrigine();
      ligneParcours.style.transform = "scaleY(1)";
      window.addEventListener("resize", placerOrigine);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(placerOrigine);
      return;
    }
    if ("IntersectionObserver" in window) {
      const observateur = new IntersectionObserver(function (entrees, observer) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            entree.target.classList.add("is-seen");
            observer.unobserve(entree.target);
          }
        });
      }, { threshold: 0.18 });
      etapes.forEach(function (etape) { observateur.observe(etape); });

      const lignes = document.querySelectorAll(".prix__ligne");
      const observateurPrix = new IntersectionObserver(function (entrees, observer) {
        entrees.forEach(function (entree) {
          if (entree.isIntersecting) {
            entree.target.classList.add("is-seen");
            observer.unobserve(entree.target);
          }
        });
      }, { threshold: 0.35 });
      lignes.forEach(function (ligne) { observateurPrix.observe(ligne); });
    } else {
      etapes.forEach(function (etape) { etape.classList.add("is-seen"); });
      document.querySelectorAll(".prix__ligne").forEach(function (ligne) { ligne.classList.add("is-seen"); });
    }

    let enAttente = false;
    function actualiserLigne() {
      const rectangle = parcours.getBoundingClientRect();
      const hauteur = Math.max(1, parcours.offsetHeight - ligneParcours.offsetTop);
      const seuil = window.innerHeight * 0.45;
      const depart = rectangle.top + ligneParcours.offsetTop;
      const progression = Math.max(0, Math.min(1, (seuil - depart) / hauteur));
      ligneParcours.style.transform = "scaleY(" + progression + ")";
      enAttente = false;
    }
    function demanderMiseAJour() {
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(actualiserLigne);
    }
    placerOrigine();
    window.addEventListener("scroll", demanderMiseAJour, { passive: true });
    window.addEventListener("resize", function () {
      placerOrigine();
      demanderMiseAJour();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        placerOrigine();
        demanderMiseAJour();
      });
    }
    actualiserLigne();
  }

  function initialiserBarreMobile() {
    if (!("IntersectionObserver" in window)) return;
    const cibleModule = document.querySelector("#rendez-vous");
    const ciblePied = document.querySelector(".pied");
    let moduleVisible = false;
    let piedVisible = false;
    const observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.target === cibleModule) moduleVisible = entree.isIntersecting;
        if (entree.target === ciblePied) piedVisible = entree.isIntersecting;
      });
      stickyBar.hidden = moduleVisible || piedVisible;
    }, { threshold: 0.08 });
    observateur.observe(cibleModule);
    observateur.observe(ciblePied);
  }

  page.classList.add("js");
  requestAnimationFrame(function () { page.classList.add("ready"); });
  form.hidden = false;
  creerJours();
  initialiserMenu();
  initialiserParcours();
  initialiserBarreMobile();

  form.addEventListener("change", function (event) {
    if (event.target.name === "prestation") {
      state.prestation = event.target.value;
      document.querySelector("[data-erreur='1']").hidden = true;
      mettreAJourResume();
    }
  });

  document.querySelectorAll("[data-choisir]").forEach(function (lien) {
    lien.addEventListener("click", function () {
      state.prestation = lien.dataset.choisir;
      const radio = Array.from(form.querySelectorAll('input[name="prestation"]')).find(function (item) { return item.value === state.prestation; });
      if (radio) radio.checked = true;
      mettreAJourResume();
    });
  });

  form.addEventListener("click", function (event) {
    const suivant = event.target.closest("[data-suivant]");
    const precedent = event.target.closest("[data-precedent]");
    const retour = event.target.closest("[data-retour]");
    if (suivant) {
      if (validerEtape()) {
        if (state.etape === 3) afficherRecapitulatif();
        changerEtape(Math.min(4, state.etape + 1));
      }
    }
    if (precedent) changerEtape(Math.max(1, state.etape - 1));
    if (retour && !retour.disabled) changerEtape(Number(retour.dataset.retour));
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const prenom = form.elements.prenom;
    const telephone = form.elements.telephone;
    const erreurPrenom = document.querySelector("[data-erreur-prenom]");
    const erreurTelephone = document.querySelector("[data-erreur-telephone]");
    const numero = telephone.value.replace(/[\s().-]/g, "");
    const numeroValide = /^(?:0[67]\d{8}|\+33[67]\d{8}|33[67]\d{8})$/.test(numero);
    const prenomValide = prenom.value.trim().length >= 2;
    erreurPrenom.hidden = prenomValide;
    erreurTelephone.hidden = numeroValide;
    prenom.setAttribute("aria-invalid", String(!prenomValide));
    telephone.setAttribute("aria-invalid", String(!numeroValide));
    if (!prenomValide) { prenom.focus(); return; }
    if (!numeroValide) { telephone.focus(); return; }
    if (!state.prestation || !state.jour || !state.heure) {
      changerEtape(1);
      return;
    }
    document.querySelector("[data-message-succes]").textContent =
      "Merci " + prenom.value.trim() + ". Vous avez parcouru les étapes pour " + state.prestation + ", " + state.jour.libelle + " à " + state.heure + ".";
    form.querySelectorAll("[data-etape]").forEach(function (panneau) { panneau.hidden = true; });
    form.querySelector(".etapes-formulaire").hidden = true;
    form.querySelector(".panneau--succes").hidden = false;
    state.etape = 5;
    resumeJour.textContent = state.jour.libelle;
    resumeHeure.textContent = state.heure;
    form.querySelector(".panneau--succes .panneau__titre").focus();
    annonce.textContent = "La démonstration est terminée. Rien n’a été envoyé.";
  });

  form.querySelector("[data-recommencer]").addEventListener("click", function () {
    form.reset();
    state.prestation = "";
    state.jour = null;
    state.heure = "";
    state.etape = 1;
    form.querySelector(".panneau--succes").hidden = true;
    form.querySelector(".etapes-formulaire").hidden = false;
    form.querySelectorAll("[data-etape]").forEach(function (panneau) { panneau.hidden = Number(panneau.dataset.etape) !== 1; });
    form.querySelectorAll("[data-retour]").forEach(function (bouton, index) {
      bouton.disabled = index !== 0;
      if (index === 0) bouton.setAttribute("aria-current", "step");
      else bouton.removeAttribute("aria-current");
    });
    document.querySelectorAll(".jour, .heure").forEach(function (bouton) { bouton.setAttribute("aria-pressed", "false"); });
    document.querySelector("[data-heures]").replaceChildren();
    document.querySelector("[data-erreur-prenom]").hidden = true;
    document.querySelector("[data-erreur-telephone]").hidden = true;
    mettreAJourResume();
    form.querySelector(".panneau__titre").focus();
  });
}());
