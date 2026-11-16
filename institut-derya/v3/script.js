document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const navButton = document.querySelector(".nav-toggle");
const navPanel = document.querySelector(".main-nav");

function closeNavigation(returnFocus = false) {
  if (!navButton || !navPanel) return;
  navButton.setAttribute("aria-expanded", "false");
  navButton.setAttribute("aria-label", "Ouvrir la navigation");
  navPanel.classList.remove("is-open");
  if (returnFocus) navButton.focus();
}

if (navButton && navPanel) {
  navButton.addEventListener("click", () => {
    const open = navButton.getAttribute("aria-expanded") !== "true";
    navButton.setAttribute("aria-expanded", String(open));
    navButton.setAttribute("aria-label", open ? "Fermer la navigation" : "Ouvrir la navigation");
    navPanel.classList.toggle("is-open", open);
    if (open) navPanel.querySelector("a")?.focus();
  });

  navPanel.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    const destination = link.getAttribute("href");
    closeNavigation();
    if (destination?.startsWith("#")) {
      const section = document.getElementById(destination.slice(1));
      requestAnimationFrame(() => section?.focus({ preventScroll: true }));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navButton.getAttribute("aria-expanded") === "true") {
      closeNavigation(true);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeNavigation();
  });
}

const revealItems = [...document.querySelectorAll("[data-reveal]")];
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  revealItems.forEach((item) => revealObserver.observe(item));
}

const mobileBar = document.getElementById("barre-mobile");
const heroAction = document.querySelector(".hero__action");
const bookingSection = document.getElementById("reserver");
const footer = document.querySelector(".site-footer");

if (mobileBar && heroAction && bookingSection && footer && "IntersectionObserver" in window) {
  let heroActionVisible = true;
  let bookingVisible = false;
  let footerVisible = false;
  const syncMobileBar = () => {
    const visible = !heroActionVisible && !bookingVisible && !footerVisible;
    mobileBar.classList.toggle("is-visible", visible);
    mobileBar.toggleAttribute("inert", !visible);
    mobileBar.setAttribute("aria-hidden", String(!visible));
  };
  const actionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === heroAction) heroActionVisible = entry.isIntersecting;
      if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
      if (entry.target === footer) footerVisible = entry.isIntersecting;
    });
    syncMobileBar();
  }, { threshold: 0.02 });
  [heroAction, bookingSection, footer].forEach((item) => actionObserver.observe(item));
} else if (mobileBar) {
  mobileBar.classList.add("is-visible");
  mobileBar.removeAttribute("inert");
  mobileBar.setAttribute("aria-hidden", "false");
}

const form = document.getElementById("parcours-reservation");
if (form) {
  const stepPanels = [...form.querySelectorAll(".flow-step")];
  const stepCount = document.getElementById("etape-courante");
  const progress = document.getElementById("progression");
  const continueButton = document.getElementById("continuer-etape");
  const confirmButton = document.getElementById("confirmer-simulation");
  const backButton = document.getElementById("retour-etape");
  const controls = document.getElementById("commandes-parcours");
  const dayContainer = document.getElementById("jours-disponibles");
  const timeContainer = document.getElementById("heures-disponibles");
  const timeStatus = document.getElementById("resume-creneaux");
  const statusMessage = document.createElement("p");
  statusMessage.className = "flow-error";
  statusMessage.id = "message-etape";
  statusMessage.setAttribute("role", "status");
  statusMessage.setAttribute("aria-live", "polite");
  controls.before(statusMessage);

  const selection = {
    prestation: null,
    jour: null,
    heure: null,
    prenom: "",
    telephone: ""
  };
  let activeStep = 1;
  let activeDayRadios = [];
  let activeTimeRadios = [];

  const parisTodayParts = () => {
    const parts = new Intl.DateTimeFormat("fr-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  };

  const parisClockParts = () => {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  };

  const keyForParts = (parts) => `${parts.year}-${parts.month}-${parts.day}`;
  const keyForDate = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  const dateForKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };

  const longDay = (key) => {
    const date = dateForKey(key);
    const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" }).format(date);
    const month = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "long" }).format(date);
    return `${weekday} ${date.getUTCDate()} ${month}`;
  };

  const shortDay = (date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" }).format(date).replace(/\.$/, "");
  const shortMonth = (date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" }).format(date).replace(/\.$/, "");
  const capitalise = (value) => value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);

  const todayParts = parisTodayParts();
  const todayKey = keyForParts(todayParts);
  const todayDate = dateForKey(todayKey);
  const todayClock = parisClockParts();
  const currentMinutes = Number(todayClock.hour) * 60 + Number(todayClock.minute);

  const updateSelection = () => {
    const serviceNode = document.getElementById("selection-prestation");
    const dayNode = document.getElementById("selection-jour");
    const timeNode = document.getElementById("selection-heure");
    serviceNode.textContent = selection.prestation ? `${selection.prestation.nom} · ${selection.prestation.duree} min` : "À choisir";
    dayNode.textContent = selection.jour ? capitalise(longDay(selection.jour)) : "À choisir";
    timeNode.textContent = selection.heure || "À choisir";
    renderRecap("recapitulatif");
  };

  const renderRecap = (elementId) => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.replaceChildren();
    const rows = [
      ["Prestation", selection.prestation ? `${selection.prestation.nom} · ${selection.prestation.duree} min` : "À choisir"],
      ["Jour", selection.jour ? capitalise(longDay(selection.jour)) : "À choisir"],
      ["Heure", selection.heure || "À choisir"]
    ];
    const text = rows.map(([label, value]) => `${label} : ${value}`).join(" · ");
    const line = document.createElement("p");
    line.textContent = text;
    target.append(line);
  };

  const buildDays = () => {
    dayContainer.replaceChildren();
    activeDayRadios = [];
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(todayDate);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = keyForDate(date);
      const weekday = date.getUTCDay();
      const isOpen = weekday >= 2 && weekday <= 6;
      const label = document.createElement("label");
      label.className = `day-choice${isOpen ? "" : " is-closed"}`;
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "jour";
      radio.value = key;
      radio.disabled = !isOpen;
      radio.setAttribute("aria-label", `${capitalise(longDay(key))}${isOpen ? "" : ", fermé selon les horaires récents"}`);
      radio.setAttribute("data-key", key);
      const face = document.createElement("span");
      face.className = "day-choice__face";
      const dayName = document.createElement("span");
      dayName.className = "day-choice__name";
      dayName.textContent = offset === 0 ? "Aujourd’hui" : shortDay(date);
      const number = document.createElement("span");
      number.className = "day-choice__number";
      number.textContent = String(date.getUTCDate());
      const month = document.createElement("span");
      month.className = "day-choice__month";
      month.textContent = shortMonth(date);
      face.append(dayName, number, month);
      if (!isOpen) {
        const closed = document.createElement("span");
        closed.className = "day-choice__closed";
        closed.textContent = "Fermé";
        face.append(closed);
      }
      label.append(radio, face);
      dayContainer.append(label);
      if (isOpen) activeDayRadios.push(radio);
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        selection.jour = key;
        selection.heure = null;
        updateSelection();
        continueButton.disabled = false;
        statusMessage.textContent = `Jour choisi : ${capitalise(longDay(key))}.`;
      });
    }
  };

  const hashText = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const addTimeGroup = (labelText, slots) => {
    if (slots.length === 0) return;
    const group = document.createElement("div");
    group.className = "time-group";
    const heading = document.createElement("h4");
    heading.textContent = labelText;
    const grid = document.createElement("div");
    grid.className = "time-grid";
    slots.forEach((slot) => {
      const label = document.createElement("label");
      label.className = `time-choice${slot.booked ? " is-booked" : ""}${slot.past ? " is-past" : ""}`;
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "heure";
      radio.value = slot.label;
      const unavailable = slot.booked || slot.past;
      radio.disabled = unavailable;
      radio.setAttribute("aria-label", slot.past ? `${slot.label}, heure passée` : slot.booked ? `${slot.label}, indisponible dans la simulation` : slot.label);
      const face = document.createElement("span");
      face.className = "time-choice__face";
      const time = document.createElement("time");
      time.dateTime = `${selection.jour}T${slot.label}`;
      time.textContent = slot.label;
      face.append(time);
      if (unavailable) {
        const state = document.createElement("span");
        state.className = "time-choice__state";
        state.textContent = slot.past ? "passé · simulation" : "indisponible · simulation";
        face.append(state);
      }
      label.append(radio, face);
      grid.append(label);
      if (!unavailable) activeTimeRadios.push(radio);
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        selection.heure = slot.label;
        updateSelection();
        continueButton.disabled = false;
        statusMessage.textContent = `Heure choisie : ${slot.label}. Disponibilité réelle à confirmer.`;
      });
    });
    group.append(heading, grid);
    timeContainer.append(group);
  };

  const renderTimes = () => {
    timeContainer.replaceChildren();
    activeTimeRadios = [];
    const previousTime = selection.heure;
    const duration = Number(selection.prestation?.duree || 15);
    const [year, month, day] = selection.jour.split("-").map(Number);
    const isToday = selection.jour === todayKey;
    const seed = hashText(`${selection.jour}-${selection.prestation.value}`);
    const groups = new Map([["Matin", []], ["Après-midi", []], ["Soir", []]]);
    for (let start = 10 * 60, index = 0; start + duration <= 20 * 60; start += 30, index += 1) {
      const hour = Math.floor(start / 60);
      const minute = start % 60;
      const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const past = isToday && start < currentMinutes;
      const pseudoReserved = !past && index !== 0 && ((seed + index * 17) % 7 === 0);
      const groupName = hour < 12 ? "Matin" : hour < 18 ? "Après-midi" : "Soir";
      groups.get(groupName).push({ label, booked: pseudoReserved, past });
    }
    groups.forEach((slots, label) => addTimeGroup(label, slots));
    const previousRadio = activeTimeRadios.find((radio) => radio.value === previousTime);
    if (previousRadio) previousRadio.checked = true;
    selection.heure = previousRadio ? previousTime : null;
    const selectableCount = activeTimeRadios.length;
    timeStatus.textContent = selectableCount > 0
      ? `Créneaux de démonstration entre 10 h et 20 h ; ${selectableCount} propositions dans cette simulation. Disponibilités réelles à confirmer.`
      : "Aucun créneau proposé pour ce jour dans la simulation. Choisissez un autre jour.";
    continueButton.disabled = !selection.heure;
    const dayLabel = document.getElementById("titre-etape-heure");
    if (dayLabel) dayLabel.setAttribute("aria-label", `Choisir une heure, ${capitalise(longDay(selection.jour))}`);
    if (year && month && day) statusMessage.textContent = "Les créneaux simulés sont affichés. Les disponibilités réelles sont à confirmer.";
  };

  const validateContact = () => {
    const nameInput = document.getElementById("prenom");
    const phoneInput = document.getElementById("telephone");
    const nameError = document.getElementById("erreur-prenom");
    const phoneError = document.getElementById("erreur-telephone");
    const nameValid = nameInput.value.trim().length > 0;
    const digits = phoneInput.value.replace(/[^\d+]/g, "");
    const phoneValid = /^(?:(?:\+33|0033)[67]|0[67])(?:[ .-]?\d){8}$/.test(digits);
    nameError.hidden = nameValid;
    phoneError.hidden = phoneValid;
    nameInput.setAttribute("aria-invalid", String(!nameValid));
    phoneInput.setAttribute("aria-invalid", String(!phoneValid));
    selection.prenom = nameInput.value.trim();
    selection.telephone = phoneInput.value.trim();
    statusMessage.textContent = !nameValid ? "Indiquez votre prénom." : !phoneValid ? "Vérifiez le numéro de téléphone mobile." : "";
    if (!nameValid) nameInput.focus();
    else if (!phoneValid) phoneInput.focus();
    return nameValid && phoneValid;
  };

  const renderSuccess = () => {
    const target = document.getElementById("recapitulatif-succes");
    target.replaceChildren();
    const line = document.createElement("p");
    line.textContent = `${selection.prenom} · ${selection.prestation.nom} · ${capitalise(longDay(selection.jour))} à ${selection.heure}.`;
    target.append(line);
    document.getElementById("message-succes").textContent = "Votre parcours est terminé. Aucune demande n’a été transmise à l’institut.";
  };

  const setStep = (nextStep, moveFocus = true) => {
    if (nextStep === 3 && selection.jour && selection.prestation) renderTimes();
    if (nextStep === 4) renderRecap("recapitulatif");
    if (nextStep === 5) renderSuccess();
    const currentPanel = stepPanels.find((panel) => Number(panel.dataset.step) === activeStep);
    const nextPanel = stepPanels.find((panel) => Number(panel.dataset.step) === nextStep);
    if (currentPanel && currentPanel !== nextPanel) {
      currentPanel.classList.remove("is-active");
      currentPanel.hidden = true;
    }
    if (nextPanel) {
      nextPanel.hidden = false;
      nextPanel.classList.remove("is-active");
      requestAnimationFrame(() => nextPanel.classList.add("is-active"));
    }
    activeStep = nextStep;
    const shownStep = Math.min(nextStep, 4);
    stepCount.textContent = nextStep === 5 ? "Simulation terminée" : `Étape ${shownStep} sur 4`;
    progress.style.transform = `scaleX(${nextStep === 5 ? 1 : shownStep / 4})`;
    backButton.hidden = nextStep <= 1 || nextStep >= 5;
    continueButton.hidden = nextStep >= 4;
    confirmButton.hidden = nextStep !== 4;
    controls.hidden = nextStep === 5;
    statusMessage.textContent = nextStep === 5 ? "Simulation terminée. Rien n’a été transmis." : "";
    updateSelection();
    if (moveFocus && nextPanel) {
      const heading = nextPanel.querySelector("h3");
      requestAnimationFrame(() => heading?.focus({ preventScroll: false }));
    }
  };

  const canContinue = () => {
    if (activeStep === 1) {
      if (selection.prestation) return true;
      const error = document.getElementById("erreur-prestation");
      error.hidden = false;
      statusMessage.textContent = error.textContent;
      return false;
    }
    if (activeStep === 2) {
      if (selection.jour) return true;
      statusMessage.textContent = "Choisissez un jour où l’institut est indiqué ouvert.";
      return false;
    }
    if (activeStep === 3) {
      if (selection.heure) return true;
      document.getElementById("erreur-heure").hidden = false;
      statusMessage.textContent = "Choisissez un créneau proposé pour continuer.";
      return false;
    }
    return true;
  };

  form.querySelectorAll('input[name="prestation"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selection.prestation = {
        value: radio.value,
        nom: radio.dataset.nom,
        duree: Number(radio.dataset.duree)
      };
      selection.jour = null;
      selection.heure = null;
      buildDays();
      document.getElementById("erreur-prestation").hidden = true;
      continueButton.disabled = false;
      statusMessage.textContent = `${selection.prestation.nom}, ${selection.prestation.duree} minutes. Durée relevée sur Treatwell.`;
      updateSelection();
    });
  });

  continueButton.addEventListener("click", () => {
    statusMessage.textContent = "";
    document.getElementById("erreur-heure").hidden = true;
    if (!canContinue()) return;
    if (activeStep === 1) setStep(2);
    else if (activeStep === 2) setStep(3);
    else if (activeStep === 3) setStep(4);
  });

  backButton.addEventListener("click", () => {
    if (activeStep > 1 && activeStep < 5) setStep(activeStep - 1);
  });

  document.querySelector(".selection-tile")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-modifier-etape]");
    if (!editButton) return;
    const targetStep = Number(editButton.dataset.modifierEtape);
    if (targetStep < activeStep && targetStep <= 3) setStep(targetStep);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeStep !== 4 || !validateContact()) return;
    setStep(5);
  });

  document.getElementById("telephone").addEventListener("input", () => {
    if (!document.getElementById("erreur-telephone").hidden) {
      document.getElementById("erreur-telephone").hidden = true;
      document.getElementById("telephone").setAttribute("aria-invalid", "false");
    }
  });
  document.getElementById("prenom").addEventListener("input", () => {
    if (!document.getElementById("erreur-prenom").hidden) {
      document.getElementById("erreur-prenom").hidden = true;
      document.getElementById("prenom").setAttribute("aria-invalid", "false");
    }
  });

  buildDays();
  updateSelection();
}
