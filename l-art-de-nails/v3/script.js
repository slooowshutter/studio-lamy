(() => {
  const corps = document.body;
  const hero = document.querySelector(".hero");
  const sections = [...document.querySelectorAll(".booking-step")];
  const formulaire = document.querySelector("#formulaire-reservation");
  const compteur = document.querySelector("#etape-compteur");
  const barreProgression = document.querySelector(".booking-form__progress span");
  const boutonSuivant = document.querySelector("#suivant-etape");
  const boutonRetour = document.querySelector("#retour-etape");
  const navigationEtapes = document.querySelector("#navigation-etapes");
  const annonce = document.querySelector("#annonce-etape");
  const grilleJours = document.querySelector("#liste-jours");
  const grilleHeures = document.querySelector("#grille-heures");
  const resumePrestation = document.querySelector("#resume-prestation");
  const resumeJour = document.querySelector("#resume-jour");
  const resumeHeure = document.querySelector("#resume-heure");
  const resumeMobilePrestation = document.querySelector("#resume-mobile-prestation");
  const resumeMobileDate = document.querySelector("#resume-mobile-date");
  const barreMobile = document.querySelector("#barre-mobile");
  const barreReservation = document.querySelector("#barre-reservation");
  const piedContact = document.querySelector(".footer__shop");
  const donnees = {
    prestation: null,
    jour: null,
    heure: null,
    etape: 0,
    derniereInteraction: "pointeur"
  };
  let herosVisible = true;
  let reservationVisible = false;
  let piedVisible = false;
  const temporisateursMasquage = new WeakMap();

  const prestations = {
    vernis: { nom: "Mains - Pose de vernis", duree: 20 },
    semi: { nom: "Mains - Pose de vernis semi-permanent", duree: 30 },
    depose: { nom: "Mains - Dépose de vernis semi-permanent et nouvelle pose", duree: 40 },
    manucure: { nom: "Femme - Manucure", duree: 25 }
  };

  const etapesVisibles = ["prestation", "jour", "heure", "coordonnees", "confirmation"];
  const auClavier = () => donnees.derniereInteraction === "clavier";
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");

  const actualiserBarres = () => {
    const resumeVisible = reservationVisible && donnees.etape < 3;
    const actionsVisibles = !herosVisible && !reservationVisible && !piedVisible;
    barreReservation.classList.toggle("is-visible", resumeVisible);
    barreReservation.setAttribute("aria-hidden", resumeVisible ? "false" : "true");
    corps.dataset.barreRendezvous = resumeVisible ? "visible" : "masquee";
    barreMobile.classList.toggle("is-visible", actionsVisibles);
    barreMobile.setAttribute("aria-hidden", actionsVisibles ? "false" : "true");
  };

  document.addEventListener("pointerdown", () => {
    donnees.derniereInteraction = "pointeur";
    corps.dataset.interaction = "pointeur";
    document.documentElement.dataset.interaction = "pointeur";
  }, { passive: true });

  document.addEventListener("keydown", event => {
    if (["Tab", "Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      donnees.derniereInteraction = "clavier";
      corps.dataset.interaction = "clavier";
      document.documentElement.dataset.interaction = "clavier";
    }
  });

  const dateLocale = date => new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long"
  }).format(date);

  const dateCourte = date => new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short"
  }).format(date).replace(/\.$/, "");

  const valeurDate = date => {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, "0");
    const jour = String(date.getDate()).padStart(2, "0");
    return `${annee}-${mois}-${jour}`;
  };

  const estDimanche = date => date.getDay() === 0;

  const effacerErreur = id => {
    const erreur = document.getElementById(id);
    if (erreur) erreur.textContent = "";
  };

  const afficherErreur = (id, message) => {
    const erreur = document.getElementById(id);
    if (erreur) erreur.textContent = message;
  };

  const mettreAJourResume = () => {
    const prestation = donnees.prestation ? prestations[donnees.prestation] : null;
    resumePrestation.textContent = prestation ? prestation.nom : "La prestation choisie s’inscrira ici.";
    resumeJour.textContent = donnees.jour ? dateLocale(donnees.jour) : "À choisir";
    resumeHeure.textContent = donnees.heure ? donnees.heure.replace(":", " h ") : "À choisir";
    resumeMobilePrestation.textContent = prestation ? `${prestation.nom} · ${prestation.duree} min` : "Choisissez une prestation";
    if (donnees.jour && donnees.heure) {
      resumeMobileDate.textContent = `${dateCourte(donnees.jour)} · ${donnees.heure.replace(":", " h ")}`;
    } else if (donnees.jour) {
      resumeMobileDate.textContent = `${dateCourte(donnees.jour)} · heure à choisir`;
    } else {
      resumeMobileDate.textContent = "Jour et heure à choisir";
    }
  };

  const afficherJours = () => {
    const maintenant = new Date();
    const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    grilleJours.replaceChildren();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(aujourdhui);
      date.setDate(aujourdhui.getDate() + decalage);
      const bouton = document.createElement("button");
      const estFerme = estDimanche(date);
      const estChoisi = donnees.jour && valeurDate(date) === valeurDate(donnees.jour);
      bouton.type = "button";
      bouton.className = "date-chip";
      bouton.disabled = estFerme;
      bouton.setAttribute("aria-label", `${dateLocale(date)}${estFerme ? ", fermé" : ""}`);
      bouton.setAttribute("aria-pressed", estChoisi ? "true" : "false");
      bouton.dataset.date = valeurDate(date);
      bouton.innerHTML = `<span class="date-chip__day">${decalage === 0 ? "Aujourd’hui" : date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(/\.$/, "")}</span><span class="date-chip__number">${date.getDate()}</span><span class="date-chip__closed">${estFerme ? "Fermé" : ""}</span>`;

      bouton.addEventListener("click", () => {
        if (estFerme) return;
        donnees.jour = date;
        donnees.heure = null;
        effacerErreur("erreur-jour");
        afficherJours();
        afficherHeures();
        mettreAJourResume();
        afficherEtape(2, true);
        const nombreCreneaux = grilleHeures.querySelectorAll(".time-choice input:not(:disabled)").length;
        annonce.textContent = `${dateLocale(date)}. ${nombreCreneaux} créneaux de démonstration affichés.`;
      });

      grilleJours.append(bouton);
    }
  };

  const creerHeure = minutes => {
    const heures = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minutesRestantes = String(minutes % 60).padStart(2, "0");
    return `${heures}:${minutesRestantes}`;
  };

  const afficherHeures = () => {
    grilleHeures.replaceChildren();
    const prestation = donnees.prestation ? prestations[donnees.prestation] : null;
    if (!prestation || !donnees.jour) return;

    const maintenant = new Date();
    const memeJour = valeurDate(donnees.jour) === valeurDate(maintenant);
    const minuteActuelle = maintenant.getHours() * 60 + maintenant.getMinutes();
    const ouvert = 10 * 60;
    const fermeture = 19 * 60;
    const groupe = document.createDocumentFragment();

    for (let minute = ouvert; minute + prestation.duree <= fermeture; minute += 15) {
      const heure = creerHeure(minute);
      const id = `heure-${heure.replace(":", "-")}`;
      const enveloppe = document.createElement("div");
      const entree = document.createElement("input");
      const etiquette = document.createElement("label");
      const passe = memeJour && minute <= minuteActuelle;
      enveloppe.className = "time-choice";
      entree.type = "radio";
      entree.name = "heure";
      entree.id = id;
      entree.value = heure;
      entree.checked = donnees.heure === heure;
      entree.disabled = passe;
      entree.setAttribute("aria-label", `Choisir ${heure.replace(":", " h ")}`);
      entree.setAttribute("aria-describedby", "erreur-heure");
      etiquette.htmlFor = id;
      etiquette.textContent = heure.replace(":", " h ");
      entree.addEventListener("change", () => {
        donnees.heure = heure;
        effacerErreur("erreur-heure");
        mettreAJourResume();
      });
      enveloppe.append(entree, etiquette);
      groupe.append(enveloppe);
    }

    grilleHeures.append(groupe);
    if (!grilleHeures.children.length) {
      const message = document.createElement("p");
      message.className = "booking-step__help";
      message.textContent = "Aucun créneau de démonstration ne reste aujourd’hui. Choisissez un autre jour.";
      grilleHeures.append(message);
    }
  };

  const afficherEtape = (index, deplacerFocus = false) => {
    const limite = Math.max(0, Math.min(index, etapesVisibles.length - 1));
    const ancienneEtape = donnees.etape;
    donnees.etape = limite;
    const idCible = etapesVisibles[limite];

    if (idCible === "heure") afficherHeures();
    if (idCible === "coordonnees") afficherRecap("recapitulatif");
    if (idCible === "confirmation") afficherRecap("recapitulatif-final", document.querySelector("#prenom").value.trim());

    sections.forEach((section, position) => {
      const doitAfficher = section.dataset.etape === idCible;
      if (doitAfficher) {
        const temporisateur = temporisateursMasquage.get(section);
        if (temporisateur) window.clearTimeout(temporisateur);
        temporisateursMasquage.delete(section);
        section.hidden = false;
        section.classList.remove("is-leaving");
        section.classList.add("is-entering");
        if (limite === 4) section.classList.add("is-current");
        requestAnimationFrame(() => {
          section.classList.remove("is-entering");
          section.classList.add("is-current");
        });
      } else if (!section.hidden) {
        section.classList.remove("is-current", "is-entering");
        if (!auClavier() && !mouvementReduit.matches && position === ancienneEtape) {
          section.classList.add("is-leaving");
          const temporisateur = window.setTimeout(() => {
            section.hidden = true;
            section.classList.remove("is-leaving");
            temporisateursMasquage.delete(section);
          }, 190);
          temporisateursMasquage.set(section, temporisateur);
        } else {
          section.hidden = true;
          section.classList.remove("is-leaving");
        }
      }
    });

    const etapeFinale = limite === 4;
    compteur.textContent = etapeFinale ? "Simulation terminée" : `Étape ${limite + 1} sur 4`;
    barreProgression.style.transform = `scaleX(${etapeFinale ? 1 : (limite + 1) / 4})`;
    boutonRetour.hidden = limite === 0 || etapeFinale;
    boutonSuivant.hidden = limite >= 3;
    navigationEtapes.hidden = etapeFinale;
    document.querySelector(".booking-form__disclaimer").hidden = etapeFinale;
    actualiserBarres();

    if (deplacerFocus) {
      const titre = document.querySelector(`[data-etape="${idCible}"] h3`);
      window.setTimeout(() => {
        if (!titre) return;
        titre.scrollIntoView({ behavior: mouvementReduit.matches || auClavier() ? "auto" : "smooth", block: "nearest" });
        titre.focus({ preventScroll: true });
      }, auClavier() ? 0 : 30);
    }

    if (limite !== ancienneEtape) {
      annonce.textContent = `Étape ${Math.min(limite + 1, 4)} sur 4. ${document.querySelector(`[data-etape="${idCible}"] h3`)?.textContent || ""}`;
    }
  };

  const afficherRecap = (id, prenom = "") => {
    const cible = document.getElementById(id);
    if (!cible) return;
    const prestation = donnees.prestation ? prestations[donnees.prestation] : null;
    const lignes = [
      ["Prestation", prestation ? `${prestation.nom} · ${prestation.duree} min` : "À choisir"],
      ["Jour", donnees.jour ? dateLocale(donnees.jour) : "À choisir"],
      ["Début", donnees.heure ? donnees.heure.replace(":", " h ") : "À choisir"]
    ];
    if (prenom) lignes.unshift(["Prénom", prenom]);
    cible.replaceChildren();
    lignes.forEach(([libelle, valeur]) => {
      const ligne = document.createElement("p");
      const titre = document.createElement("span");
      const texte = document.createElement("strong");
      titre.textContent = libelle;
      texte.textContent = valeur;
      ligne.append(titre, texte);
      cible.append(ligne);
    });
  };

  const validerEtape = () => {
    if (donnees.etape === 0) {
      const choix = formulaire.querySelector('input[name="prestation"]:checked');
      if (!choix) {
        afficherErreur("erreur-prestation", "Choisissez une prestation pour continuer.");
        formulaire.querySelector('input[name="prestation"]')?.focus();
        return false;
      }
      donnees.prestation = choix.value;
      effacerErreur("erreur-prestation");
      mettreAJourResume();
      afficherJours();
    } else if (donnees.etape === 1 && !donnees.jour) {
      afficherErreur("erreur-jour", "Choisissez un jour pour continuer.");
      grilleJours.focus();
      return false;
    } else if (donnees.etape === 2 && !donnees.heure) {
      afficherErreur("erreur-heure", "Choisissez une heure de début pour continuer.");
      grilleHeures.querySelector("input:not(:disabled)")?.focus();
      return false;
    }
    return true;
  };

  const defilerVers = element => {
    element.scrollIntoView({ behavior: mouvementReduit.matches || auClavier() ? "auto" : "smooth", block: "start" });
  };

  boutonSuivant.addEventListener("click", () => {
    if (!validerEtape()) return;
    if (donnees.etape === 1) {
      afficherEtape(2, true);
      return;
    }
    afficherEtape(donnees.etape + 1, true);
  });

  boutonRetour.addEventListener("click", () => {
    afficherEtape(donnees.etape - 1, true);
  });

  formulaire.querySelectorAll('input[name="prestation"]').forEach(entree => {
    entree.addEventListener("change", () => {
      donnees.prestation = entree.value;
      donnees.heure = null;
      afficherHeures();
      mettreAJourResume();
      effacerErreur("erreur-prestation");
    });
  });

  document.querySelectorAll("[data-prestation]").forEach(bouton => {
    bouton.addEventListener("click", () => {
      const entree = formulaire.querySelector(`input[name="prestation"][value="${bouton.dataset.prestation}"]`);
      if (!entree) return;
      entree.checked = true;
      entree.dispatchEvent(new Event("change", { bubbles: true }));
      afficherEtape(0, false);
      defilerVers(formulaire);
      window.setTimeout(() => entree.focus({ preventScroll: true }), mouvementReduit.matches || auClavier() ? 0 : 280);
    });
  });

  formulaire.addEventListener("submit", event => {
    event.preventDefault();
    if (!validerEtape()) return;

    const prenom = document.querySelector("#prenom");
    const telephone = document.querySelector("#telephone");
    const valeurPrenom = prenom.value.trim();
    const valeurTelephone = telephone.value.trim();
    const telephoneValide = /^(?:(?:\+33|0033)[ .-]?[1-9](?:[ .-]?\d{2}){4}|0[1-9](?:[ .-]?\d{2}){4})$/.test(valeurTelephone);
    let valide = true;

    if (!valeurPrenom) {
      afficherErreur("erreur-prenom", "Saisissez votre prénom pour compléter la simulation.");
      prenom.setAttribute("aria-invalid", "true");
      valide = false;
    } else {
      effacerErreur("erreur-prenom");
      prenom.removeAttribute("aria-invalid");
    }

    if (!telephoneValide) {
      afficherErreur("erreur-telephone", "Saisissez un numéro de téléphone français valide.");
      telephone.setAttribute("aria-invalid", "true");
      valide = false;
    } else {
      effacerErreur("erreur-telephone");
      telephone.removeAttribute("aria-invalid");
    }

    if (!valide) {
      const premierChampInvalide = formulaire.querySelector('[aria-invalid="true"]');
      premierChampInvalide?.focus();
      return;
    }

    afficherEtape(4, true);
  });

  document.querySelector("#nouvelle-simulation").addEventListener("click", () => {
    formulaire.reset();
    donnees.prestation = null;
    donnees.jour = null;
    donnees.heure = null;
    afficherJours();
    mettreAJourResume();
    afficherEtape(0, true);
  });

  document.querySelector("#continuer-mobile").addEventListener("click", () => boutonSuivant.click());

  const navLiens = [...document.querySelectorAll(".nav a")];
  const sectionsNav = navLiens.map(lien => document.querySelector(lien.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observateurNav = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        navLiens.forEach(lien => {
          const actif = lien.getAttribute("href") === `#${entree.target.id}`;
          if (actif) lien.setAttribute("aria-current", "location");
          else lien.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-25% 0px -60% 0px" });
    sectionsNav.forEach(section => observateurNav.observe(section));

    const observateurRevelation = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (!entree.isIntersecting) return;
        const element = entree.target;
        element.classList.add("is-visible");
        observateurRevelation.unobserve(element);
      });
    }, { threshold: .12, rootMargin: "0px 0px -4% 0px" });
    document.querySelectorAll(".reveal").forEach(element => observateurRevelation.observe(element));

    document.querySelectorAll(".service-row").forEach((ligne, index) => {
      ligne.style.setProperty("--delai", `${index * 55}ms`);
      observateurRevelation.observe(ligne);
    });

    const cibleReservation = document.querySelector("#reservation");
    const observateurBarre = new IntersectionObserver(entrees => {
      entrees.forEach(entree => {
        if (entree.target === hero) herosVisible = entree.isIntersecting;
        if (entree.target === cibleReservation) reservationVisible = entree.isIntersecting;
        if (entree.target === piedContact) piedVisible = entree.isIntersecting;
      });
      actualiserBarres();
    }, { threshold: .02 });
    observateurBarre.observe(hero);
    observateurBarre.observe(cibleReservation);
    observateurBarre.observe(piedContact);
  } else {
    document.querySelectorAll(".reveal, .service-row").forEach(element => element.classList.add("is-visible"));
  }

  afficherJours();
  mettreAJourResume();
  afficherEtape(0, false);
  window.requestAnimationFrame(() => hero.classList.add("is-ready"));
})();
