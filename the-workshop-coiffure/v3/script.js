(function () {
  "use strict";

  const racine = document.documentElement;
  const prefersMouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navigation = document.getElementById("menu-principal");
  const boutonMenu = document.querySelector(".bouton-menu");

  requestAnimationFrame(function () {
    racine.classList.add("page-ready");
  });

  function reglerMenu(ouvert) {
    boutonMenu.setAttribute("aria-expanded", String(ouvert));
    navigation.setAttribute("aria-hidden", String(!ouvert && window.matchMedia("(max-width: 680px)").matches));
    navigation.inert = !ouvert && window.matchMedia("(max-width: 680px)").matches;
    navigation.classList.toggle("est-ouverte", ouvert);
  }

  if (window.matchMedia("(min-width: 681px)").matches) {
    reglerMenu(true);
  } else {
    reglerMenu(false);
  }

  boutonMenu.addEventListener("click", function () {
    const ouvrir = boutonMenu.getAttribute("aria-expanded") !== "true";
    reglerMenu(ouvrir);
    if (ouvrir) {
      const premierLien = navigation.querySelector("a");
      if (premierLien) premierLien.focus();
    }
  });

  document.addEventListener("keydown", function (evenement) {
    if (evenement.key === "Escape" && boutonMenu.getAttribute("aria-expanded") === "true") {
      reglerMenu(false);
      boutonMenu.focus();
    }
  });

  navigation.querySelectorAll("a").forEach(function (lien) {
    lien.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 680px)").matches) reglerMenu(false);
    });
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 681px)").matches) {
      reglerMenu(true);
    } else if (boutonMenu.getAttribute("aria-expanded") === "true") {
      reglerMenu(false);
    }
  });

  const itemsVisite = document.querySelectorAll(".etapes-visite li");
  itemsVisite.forEach(function (element) {
    element.setAttribute("data-reveal-item", "");
  });

  const lignesPrestations = document.querySelectorAll(".liste-prestations li");
  lignesPrestations.forEach(function (element) {
    element.setAttribute("data-reveal-item", "");
  });

  const lignesHoraires = document.querySelectorAll(".liste-horaires > div");
  lignesHoraires.forEach(function (element) {
    element.setAttribute("data-reveal-item", "");
  });

  const reveils = document.querySelectorAll("[data-reveal], [data-reveal-item]");
  if ("IntersectionObserver" in window) {
    const observateurReveils = new IntersectionObserver(function (entrees, observateur) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add("revele");
          observateur.unobserve(entree.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    reveils.forEach(function (element) {
      observateurReveils.observe(element);
    });
  } else {
    reveils.forEach(function (element) {
      element.classList.add("revele");
    });
  }

  const barreMobile = document.getElementById("barre-mobile");
  const actionsHero = document.querySelector(".hero-actions");
  const zoneReservation = document.getElementById("reserver");
  const piedPage = document.querySelector(".pied-page");
  let actionsHeroVisibles = true;
  let reservationVisible = false;
  let piedVisible = false;

  function reglerBarreMobile() {
    const visible = !actionsHeroVisibles && !reservationVisible && !piedVisible;
    barreMobile.classList.toggle("est-visible", visible);
    barreMobile.setAttribute("aria-hidden", String(!visible));
    barreMobile.inert = !visible;
  }

  if ("IntersectionObserver" in window) {
    const observateurBarre = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.target === actionsHero) actionsHeroVisibles = entree.isIntersecting;
        if (entree.target === zoneReservation) reservationVisible = entree.isIntersecting;
        if (entree.target === piedPage) piedVisible = entree.isIntersecting;
      });
      reglerBarreMobile();
    }, { threshold: 0.04 });

    observateurBarre.observe(actionsHero);
    observateurBarre.observe(zoneReservation);
    observateurBarre.observe(piedPage);
  }

  const formulaire = document.getElementById("formulaire-reservation");
  const panneaux = Array.from(document.querySelectorAll(".panneau-etape"));
  const annonceEtape = document.getElementById("annonce-etape");
  const choixPrestations = Array.from(document.querySelectorAll('input[name="prestation"]'));
  const grilleJours = document.getElementById("grille-jours");
  const grilleHeures = document.getElementById("grille-heures");
  const aideHeures = document.getElementById("aide-heures");
  const confirmation = document.getElementById("confirmation");
  const formulaireRecap = document.querySelector(".resume-reservation");
  const messageConfirmation = document.getElementById("message-confirmation");
  const erreurs = {
    prestation: document.getElementById("erreur-prestation"),
    jour: document.getElementById("erreur-jour"),
    heure: document.getElementById("erreur-heure"),
    prenom: document.getElementById("erreur-prenom"),
    telephone: document.getElementById("erreur-telephone")
  };

  let etapeActuelle = 0;
  let prestationChoisie = null;
  let jourChoisi = null;
  let heureChoisie = null;
  let numeroTransition = 0;

  const resumePrestation = document.getElementById("resume-prestation");
  const resumeJour = document.getElementById("resume-jour");
  const resumeHeure = document.getElementById("resume-heure");
  const resumePrix = document.getElementById("resume-prix");
  const recapitulatifCourt = document.getElementById("recapitulatif-court");
  const annonceResume = document.getElementById("annonce-resume");

  function choisirDateDeCaen() {
    const parties = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const valeurs = {};
    parties.forEach(function (partie) {
      valeurs[partie.type] = partie.value;
    });
    return new Date(Date.UTC(Number(valeurs.year), Number(valeurs.month) - 1, Number(valeurs.day), 12));
  }

  function cleDate(date) {
    return date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0");
  }

  function texteDateLongue(date) {
    const texte = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(date);
    return texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);
  }

  function heureParisActuelle() {
    const parties = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const valeurs = {};
    parties.forEach(function (partie) {
      valeurs[partie.type] = partie.value;
    });
    return Number(valeurs.hour) * 60 + Number(valeurs.minute);
  }

  function memeJour(a, b) {
    return Boolean(a && b && cleDate(a) === cleDate(b));
  }

  function jourFerme(date) {
    const numeroJour = date.getUTCDay();
    return numeroJour === 0 || numeroJour === 3;
  }

  function heureEnTexte(minutes) {
    const heure = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return String(heure) + "\u00a0h\u00a0" + String(minute).padStart(2, "0");
  }

  function obtenirPrestationCochee() {
    const radio = choixPrestations.find(function (element) {
      return element.checked;
    });
    return radio || null;
  }

  function afficherResume() {
    const boutonModifier = document.querySelectorAll(".bouton-modifier");
    resumePrestation.childNodes[0].textContent = prestationChoisie ? prestationChoisie.nom + " " : "À choisir ";
    resumeJour.childNodes[0].textContent = jourChoisi ? texteDateLongue(jourChoisi) + " " : "À choisir ";
    resumeHeure.childNodes[0].textContent = heureChoisie ? heureEnTexte(heureChoisie) + " " : "À choisir ";
    resumePrix.textContent = prestationChoisie ? prestationChoisie.prix : "Indicatif";
    recapitulatifCourt.textContent = prestationChoisie && jourChoisi && heureChoisie
      ? prestationChoisie.nom + ", " + texteDateLongue(jourChoisi) + " à " + heureEnTexte(heureChoisie)
      : "aucun créneau choisi";

    boutonModifier.forEach(function (bouton) {
      const indice = Number(bouton.dataset.modifier);
      const disponible = (indice === 0 && Boolean(prestationChoisie))
        || (indice === 1 && Boolean(jourChoisi))
        || (indice === 2 && Boolean(heureChoisie));
      bouton.hidden = !disponible;
      bouton.disabled = !disponible;
    });
  }

  function annoncerResume() {
    const prestation = prestationChoisie ? prestationChoisie.nom + ", " + prestationChoisie.prix + ", tarif indicatif" : "prestation à choisir";
    const jour = jourChoisi ? texteDateLongue(jourChoisi) : "jour à choisir";
    const heure = heureChoisie !== null ? heureEnTexte(heureChoisie) : "heure à choisir";
    annonceResume.textContent = "Sélection mise à jour : " + prestation + " ; " + jour + " ; " + heure + ".";
  }

  function annoncerEtape(index) {
    const titres = [
      "Étape 1 sur 4 : choisir une prestation.",
      "Étape 2 sur 4 : choisir un jour.",
      "Étape 3 sur 4 : choisir une heure.",
      "Étape 4 sur 4 : indiquer vos coordonnées."
    ];
    annonceEtape.textContent = titres[index];
  }

  function afficherEtape(index) {
    if (index < 0 || index >= panneaux.length) return;
    const ancien = panneaux[etapeActuelle];
    const nouveau = panneaux[index];
    numeroTransition += 1;
    const numeroEnCours = numeroTransition;

    panneaux.forEach(function (panneau) {
      if (panneau !== ancien && panneau !== nouveau) {
        panneau.hidden = true;
        panneau.classList.remove("is-sortie", "is-entree");
      }
    });

    if (ancien !== nouveau && !ancien.hidden) {
      ancien.classList.add("is-sortie");
      window.setTimeout(function () {
        if (numeroEnCours !== numeroTransition) return;
        ancien.hidden = true;
        ancien.classList.remove("is-sortie");
      }, prefersMouvementReduit.matches ? 0 : 230);
    }

    nouveau.hidden = false;
    nouveau.classList.remove("is-sortie");
    nouveau.classList.add("is-entree");
    requestAnimationFrame(function () {
      nouveau.classList.remove("is-entree");
    });

    etapeActuelle = index;
    annoncerEtape(index);
    const titre = nouveau.querySelector("h3");
    if (titre) titre.focus();
  }

  function effacerErreurs() {
    Object.keys(erreurs).forEach(function (cle) {
      erreurs[cle].textContent = "";
    });
  }

  function afficherJours() {
    grilleJours.replaceChildren();
    const premierJour = choisirDateDeCaen();

    for (let decalage = 0; decalage < 14; decalage += 1) {
      const date = new Date(Date.UTC(
        premierJour.getUTCFullYear(),
        premierJour.getUTCMonth(),
        premierJour.getUTCDate() + decalage,
        12
      ));
      const ferme = jourFerme(date);
      const jourCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" }).format(date);
      const moisCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short" }).format(date);
      const bouton = document.createElement("button");
      bouton.className = "choix-jour";
      bouton.type = "button";
      bouton.dataset.cle = cleDate(date);
      bouton.setAttribute("aria-pressed", "false");
      bouton.setAttribute("aria-label", texteDateLongue(date) + (ferme ? ", fermé" : ", choisir ce jour"));
      bouton.disabled = ferme;
      const haut = document.createElement("strong");
      haut.textContent = jourCourt;
      const bas = document.createElement("span");
      bas.textContent = ferme ? "Fermé" : String(date.getUTCDate()) + " " + moisCourt;
      bouton.append(haut, bas);

      if (!ferme) {
        bouton.addEventListener("click", function () {
          jourChoisi = date;
          heureChoisie = null;
          grilleJours.querySelectorAll(".choix-jour").forEach(function (autre) {
            autre.setAttribute("aria-pressed", String(autre === bouton));
          });
          erreurs.jour.textContent = "";
          erreurs.heure.textContent = "";
          afficherHeures();
          afficherResume();
          annoncerResume();
        });
      }
      grilleJours.appendChild(bouton);
    }
  }

  function hashDeterministe(texte) {
    let valeur = 2166136261;
    for (let index = 0; index < texte.length; index += 1) {
      valeur ^= texte.charCodeAt(index);
      valeur = Math.imul(valeur, 16777619);
    }
    return (valeur >>> 0) % 100;
  }

  function afficherHeures() {
    grilleHeures.replaceChildren();
    if (!jourChoisi || !prestationChoisie) return;

    const ouverture = 9 * 60;
    const fermeture = 19 * 60;
    const duree = prestationChoisie.duree;
    let nombreAffiche = 0;
    const maintenant = heureParisActuelle();
    const aujourdhui = choisirDateDeCaen();

    for (let minutes = ouverture; minutes + duree <= fermeture; minutes += 30) {
      const depasse = memeJour(jourChoisi, aujourdhui) && minutes <= maintenant;
      const dejaPrisSimulation = hashDeterministe(cleDate(jourChoisi) + prestationChoisie.valeur + String(minutes)) < 17;
      const bouton = document.createElement("button");
      bouton.className = "choix-heure";
      bouton.type = "button";
      bouton.setAttribute("aria-pressed", "false");
      const heure = heureEnTexte(minutes);
      const etat = document.createElement("span");
      bouton.disabled = depasse || dejaPrisSimulation;

      if (depasse) {
        etat.textContent = "Passé";
        bouton.setAttribute("aria-label", heure + ", heure passée");
      } else if (dejaPrisSimulation) {
        etat.textContent = "Pris, simulation";
        bouton.setAttribute("aria-label", heure + ", indisponible dans cette simulation");
      } else {
        bouton.setAttribute("aria-label", heure + ", créneau de démonstration");
      }

      const valeurHeure = document.createElement("strong");
      valeurHeure.textContent = heure.replace(/\u00a0h\u00a0/, " h ");
      if (!bouton.disabled) {
        bouton.addEventListener("click", function () {
          heureChoisie = minutes;
          grilleHeures.querySelectorAll(".choix-heure").forEach(function (autre) {
            autre.setAttribute("aria-pressed", String(autre === bouton));
          });
          erreurs.heure.textContent = "";
          afficherResume();
          annoncerResume();
        });
      }

      bouton.append(valeurHeure);
      if (etat.textContent) bouton.append(etat);
      grilleHeures.appendChild(bouton);
      nombreAffiche += 1;
    }

    if (nombreAffiche === 0) {
      const vide = document.createElement("p");
      vide.className = "message-vide";
      vide.textContent = memeJour(jourChoisi, aujourdhui)
        ? "Aucun créneau de démonstration ne reste aujourd’hui. Choisissez un autre jour."
        : "Aucun créneau ne correspond à cette durée.";
      grilleHeures.appendChild(vide);
    }

    aideHeures.textContent = "Créneaux d’exemple générés selon les horaires Planity. Les mentions « pris » sont fictives et ne reflètent pas l’agenda du salon.";
  }

  choixPrestations.forEach(function (radio) {
    radio.addEventListener("change", function () {
      prestationChoisie = {
        valeur: radio.value,
        nom: radio.dataset.nom,
        duree: Number(radio.dataset.duree),
        dureeTexte: radio.dataset.dureeTexte,
        prix: radio.dataset.prix,
        prixNombre: Number(radio.dataset.prixNombre)
      };
      heureChoisie = null;
      erreurs.prestation.textContent = "";
      erreurs.heure.textContent = "";
      if (jourChoisi) afficherHeures();
      afficherResume();
      annoncerResume();
    });
  });

  document.querySelectorAll("[data-suivant]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      const destination = Number(bouton.dataset.suivant);
      if (etapeActuelle === 0) {
        prestationChoisie = prestationChoisie || (function () {
          const radio = obtenirPrestationCochee();
          return radio ? {
            valeur: radio.value,
            nom: radio.dataset.nom,
            duree: Number(radio.dataset.duree),
            dureeTexte: radio.dataset.dureeTexte,
            prix: radio.dataset.prix,
            prixNombre: Number(radio.dataset.prixNombre)
          } : null;
        }());
        if (!prestationChoisie) {
          erreurs.prestation.textContent = "Choisissez une prestation pour continuer.";
          return;
        }
      }
      if (etapeActuelle === 1 && !jourChoisi) {
        erreurs.jour.textContent = "Choisissez un jour ouvert pour continuer.";
        return;
      }
      if (etapeActuelle === 2 && heureChoisie === null) {
        erreurs.heure.textContent = "Choisissez un créneau de démonstration encore disponible.";
        return;
      }
      if (destination === 2) afficherHeures();
      afficherResume();
      afficherEtape(destination);
    });
  });

  document.querySelectorAll("[data-precedent]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      afficherEtape(Number(bouton.dataset.precedent));
    });
  });

  document.querySelectorAll("[data-modifier]").forEach(function (bouton) {
    bouton.addEventListener("click", function () {
      const cible = Number(bouton.dataset.modifier);
      if (cible < etapeActuelle) afficherEtape(cible);
    });
  });

  function numeroPortableValide(valeur) {
    const compact = valeur.replace(/[ .-]/g, "");
    return /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
  }

  function validerCoordonnees() {
    const prenom = document.getElementById("prenom");
    const telephone = document.getElementById("telephone");
    const prenomValide = prenom.value.trim().length >= 2;
    const telephoneValide = numeroPortableValide(telephone.value.trim());

    erreurs.prenom.textContent = prenomValide ? "" : "Indiquez un prénom d’au moins deux caractères.";
    erreurs.telephone.textContent = telephoneValide ? "" : "Saisissez un portable français commençant par 06, 07, +33 6 ou +33 7.";
    if (!prenomValide) prenom.setAttribute("aria-invalid", "true");
    else prenom.removeAttribute("aria-invalid");
    if (!telephoneValide) telephone.setAttribute("aria-invalid", "true");
    else telephone.removeAttribute("aria-invalid");

    if (!prenomValide) {
      prenom.focus();
      return false;
    }
    if (!telephoneValide) {
      telephone.focus();
      return false;
    }
    return true;
  }

  function dateHeureAgenda() {
    const annee = jourChoisi.getUTCFullYear();
    const mois = String(jourChoisi.getUTCMonth() + 1).padStart(2, "0");
    const jour = String(jourChoisi.getUTCDate()).padStart(2, "0");
    const heureDebut = Math.floor(heureChoisie / 60);
    const minuteDebut = heureChoisie % 60;
    const heureFinTotale = heureChoisie + prestationChoisie.duree;
    const heureFin = Math.floor(heureFinTotale / 60);
    const minuteFin = heureFinTotale % 60;
    const debut = String(annee) + mois + jour + "T" + String(heureDebut).padStart(2, "0") + String(minuteDebut).padStart(2, "0") + "00";
    const fin = String(annee) + mois + jour + "T" + String(heureFin).padStart(2, "0") + String(minuteFin).padStart(2, "0") + "00";
    return { debut: debut, fin: fin };
  }

  function echapperAgenda(texte) {
    return texte.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  }

  function telechargerAgenda() {
    const dates = dateHeureAgenda();
    const corps = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Studio Lamy//Apercu non officiel//FR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "DTSTART:" + dates.debut,
      "DTEND:" + dates.fin,
      "SUMMARY:" + echapperAgenda("Rendez-vous indicatif — The Workshop coiffure"),
      "DESCRIPTION:" + echapperAgenda("Simulation uniquement. Aucune réservation n’a été transmise."),
      "LOCATION:" + echapperAgenda("15 rue Montoir-Poissonnerie, 14000 Caen"),
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    const fichier = new Blob([corps], { type: "text/calendar;charset=utf-8" });
    const adresseTemporaire = URL.createObjectURL(fichier);
    const lienTemporaire = document.createElement("a");
    lienTemporaire.href = adresseTemporaire;
    lienTemporaire.download = "rendez-vous-indicatif-the-workshop.ics";
    lienTemporaire.setAttribute("aria-label", "Télécharger le rendez-vous indicatif dans le calendrier");
    document.body.appendChild(lienTemporaire);
    lienTemporaire.click();
    lienTemporaire.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(adresseTemporaire);
    }, 1500);
  }

  formulaire.addEventListener("submit", function (evenement) {
    evenement.preventDefault();
    if (!prestationChoisie || !jourChoisi || heureChoisie === null) {
      afficherEtape(!prestationChoisie ? 0 : !jourChoisi ? 1 : 2);
      return;
    }
    if (!validerCoordonnees()) return;

    const prenom = document.getElementById("prenom").value.trim();
    messageConfirmation.textContent = prenom + ", votre simulation concerne " + prestationChoisie.nom + ", le " + texteDateLongue(jourChoisi) + " à " + heureEnTexte(heureChoisie) + " (" + prestationChoisie.prix + ", tarif indicatif).";
    formulaire.hidden = true;
    confirmation.hidden = false;
    confirmation.classList.add("is-entree");
    requestAnimationFrame(function () {
      confirmation.classList.remove("is-entree");
    });
    formulaireRecap.setAttribute("aria-hidden", "true");
    formulaireRecap.inert = true;
    const titre = document.getElementById("titre-confirmation");
    titre.focus({ preventScroll: true });
  });

  document.getElementById("telecharger-agenda").addEventListener("click", telechargerAgenda);

  document.getElementById("recommencer").addEventListener("click", function () {
    formulaire.reset();
    formulaire.hidden = false;
    confirmation.hidden = true;
    formulaireRecap.removeAttribute("aria-hidden");
    formulaireRecap.inert = false;
    confirmation.classList.remove("is-entree");
    prestationChoisie = null;
    jourChoisi = null;
    heureChoisie = null;
    effacerErreurs();
    afficherJours();
    afficherResume();
    annoncerResume();
    afficherEtape(0);
  });

  afficherJours();
  afficherResume();
}());
