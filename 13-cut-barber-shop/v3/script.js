"use strict";

document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.querySelector(".hero");

if (hero) {
  requestAnimationFrame(() => hero.classList.add("is-ready"));
}

const revealElements = [...document.querySelectorAll("[data-reveal]")];
if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealGroups = new Map();
  revealElements.forEach((element) => {
    if (element.dataset.reveal === "ligne") {
      const group = element.parentElement;
      const index = revealGroups.get(group) || 0;
      revealGroups.set(group, index + 1);
      element.style.transitionDelay = `${index * 55}ms`;
    }
  });
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

const mobileBar = document.getElementById("mobile-bar");
const heroActions = document.querySelector(".hero-actions");
const bookingSection = document.getElementById("reserver");
const footer = document.querySelector(".site-footer");

if (mobileBar && "IntersectionObserver" in window) {
  let heroAway = false;
  let bookingInView = false;
  let footerInView = false;
  const updateMobileBar = () => {
    const visible = heroAway && !bookingInView && !footerInView;
    mobileBar.classList.toggle("is-visible", visible);
    mobileBar.setAttribute("aria-hidden", String(!visible));
    mobileBar.inert = !visible;
  };
  const actionObserver = new IntersectionObserver(([entry]) => {
    heroAway = !entry.isIntersecting;
    updateMobileBar();
  }, { threshold: 0.05 });
  const bookingObserver = new IntersectionObserver(([entry]) => {
    bookingInView = entry.isIntersecting;
    updateMobileBar();
  }, { threshold: 0.08 });
  const footerObserver = new IntersectionObserver(([entry]) => {
    footerInView = entry.isIntersecting;
    updateMobileBar();
  }, { threshold: 0.04 });
  if (heroActions) actionObserver.observe(heroActions);
  if (bookingSection) bookingObserver.observe(bookingSection);
  if (footer) footerObserver.observe(footer);
}

const form = document.getElementById("booking-form");
if (form) {
  const stepNames = ["service", "jour", "heure", "coordonnees"];
  const panes = [...form.querySelectorAll(".booking-step")];
  const liveRegion = document.getElementById("booking-live");
  const dateStrip = document.getElementById("date-strip");
  const slotGroups = document.getElementById("slot-groups");
  const progressItems = [...document.querySelectorAll("[data-progress]")];
  const summaryService = document.getElementById("resume-prestation");
  const summaryDay = document.getElementById("resume-jour");
  const summaryTime = document.getElementById("resume-heure");
  const bookingState = { service: null, date: null, time: null, firstName: "", phone: "" };
  let activeStep = "service";
  let hidePaneTimer = 0;

  const services = {
    "coupe-tondeuse": { name: "Coupe Classique Tondeuse Homme", duration: 30 },
    "coupe-ciseaux": { name: "Coupe classique tondeuse + ciseaux", duration: 30 },
    "coupe-barbe": { name: "Coupe classique tondeuse + barbe", duration: 30 },
    contours: { name: "Contours (tondeuse + lame)", duration: 10 },
    "taille-barbe": { name: "Taille de Barbe (traçage + ciseaux + tondeuse + coupe choux)", duration: 30 }
  };

  const parisDateParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  };

  const parisToday = () => {
    const parts = parisDateParts();
    return `${parts.year}-${parts.month}-${parts.day}`;
  };

  const fromDateKey = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };

  const keyFromDate = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const dateParts = (key) => {
    const date = fromDateKey(key);
    return {
      date,
      weekday: new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(date),
      shortWeekday: new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: "UTC" }).format(date),
      full: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date),
      number: new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" }).format(date),
      month: new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date)
    };
  };

  const parisClock = () => {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  };

  const makeDateChoices = () => {
    if (!dateStrip) return;
    const today = parisToday();
    const [year, month, day] = today.split("-").map(Number);
    const firstDay = new Date(Date.UTC(year, month - 1, day, 12));
    dateStrip.replaceChildren();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(firstDay);
      date.setUTCDate(firstDay.getUTCDate() + offset);
      const key = keyFromDate(date);
      const details = dateParts(key);
      const closed = date.getUTCDay() === 1;
      const label = document.createElement("label");
      label.className = "date-choice";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "jour";
      radio.value = key;
      radio.disabled = closed;
      radio.setAttribute("aria-label", `${details.full}${closed ? ", fermé" : ""}`);

      const weekday = document.createElement("span");
      weekday.className = "date-weekday";
      weekday.textContent = details.shortWeekday;

      const number = document.createElement("span");
      number.className = "date-number";
      number.textContent = details.number;

      const hint = document.createElement("span");
      hint.className = "date-hint";
      hint.textContent = closed ? "Fermé" : offset === 0 ? "Aujourd’hui" : offset === 1 ? "Demain" : "";

      label.append(radio, weekday, number, hint);
      dateStrip.append(label);
    }
  };

  const hoursForDay = (key) => {
    const weekday = fromDateKey(key).getUTCDay();
    if (weekday === 1) return null;
    if (weekday === 0) return { start: 10 * 60 + 45, end: 18 * 60 };
    return { start: 10 * 60 + 15, end: 20 * 60 };
  };

  const timeText = (minutes) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, "0")} h ${String(minute).padStart(2, "0")}`;
  };

  const deterministicTaken = (key, index) => {
    let seed = 0;
    for (const character of key) seed = (seed + character.charCodeAt(0)) % 101;
    return (seed + index * 7) % 5 === 0;
  };

  const renderSlots = () => {
    if (!slotGroups) return;
    slotGroups.replaceChildren();
    bookingState.time = null;
    const hours = bookingState.date ? hoursForDay(bookingState.date) : null;
    const service = bookingState.service ? services[bookingState.service] : null;
    if (!hours || !service) return;

    const now = parisClock();
    const isToday = bookingState.date === parisToday();
    const groups = [
      { name: "Matin", start: hours.start, end: Math.min(hours.end, 12 * 60) },
      { name: "Après-midi", start: Math.max(hours.start, 12 * 60), end: Math.min(hours.end, 18 * 60) },
      { name: "Soir", start: Math.max(hours.start, 18 * 60), end: hours.end }
    ];
    let slotIndex = 0;
    let availableCount = 0;

    groups.forEach((group) => {
      const groupSlots = [];
      for (let start = group.start; start + service.duration <= group.end; start += 15) {
        const index = slotIndex;
        slotIndex += 1;
        const past = isToday && start <= now;
        const taken = deterministicTaken(bookingState.date, index);
        groupSlots.push({ start, past, taken });
        if (!past && !taken) availableCount += 1;
      }
      if (!groupSlots.length) return;

      const groupElement = document.createElement("section");
      groupElement.className = "slot-group";
      const heading = document.createElement("h4");
      heading.textContent = group.name;
      const grid = document.createElement("div");
      grid.className = "slot-grid";

      groupSlots.forEach(({ start, past, taken }) => {
        const unavailable = past || taken;
        const label = document.createElement("label");
        label.className = `slot-choice${unavailable ? " is-unavailable" : ""}`;

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "heure";
        radio.value = timeText(start);
        radio.disabled = unavailable;
        const spokenTime = timeText(start).replace(" h ", " heures ");
        radio.setAttribute("aria-label", unavailable ? `${spokenTime}, ${past ? "horaire passé" : "déjà pris dans cette simulation"}` : `Choisir ${spokenTime}`);

        const time = document.createElement("time");
        time.dateTime = `${bookingState.date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
        time.textContent = timeText(start);
        label.append(radio, time);
        if (unavailable) {
          const stateText = document.createElement("span");
          stateText.className = "visually-hidden";
          stateText.textContent = past ? "horaire passé" : "déjà pris dans cette simulation";
          label.append(stateText);
        }
        grid.append(label);
      });

      groupElement.append(heading, grid);
      slotGroups.append(groupElement);
    });

    const note = document.getElementById("slot-note");
    if (note) {
      const fullDate = dateParts(bookingState.date).full;
      note.textContent = `${availableCount} horaire${availableCount > 1 ? "s" : ""} de démonstration le ${fullDate}. Rien n’est réservé.`;
    }
    liveRegion.textContent = `${availableCount} horaire${availableCount > 1 ? "s" : ""} de démonstration le ${dateParts(bookingState.date).full}.`;
  };

  const updateSummary = () => {
    const service = bookingState.service ? services[bookingState.service] : null;
    summaryService.textContent = service ? service.name : "À choisir";
    summaryDay.textContent = bookingState.date ? dateParts(bookingState.date).full : "À choisir";
    summaryTime.textContent = bookingState.time || "À choisir";
    renderRecap();
  };

  const renderRecap = () => {
    const recap = document.getElementById("recap");
    if (!recap || !bookingState.service || !bookingState.date || !bookingState.time) return;
    const lines = [
      ["Prestation", services[bookingState.service].name],
      ["Jour", dateParts(bookingState.date).full],
      ["Heure", bookingState.time]
    ];
    recap.replaceChildren();
    lines.forEach(([label, value]) => {
      const line = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label} : `;
      line.append(strong, document.createTextNode(value));
      recap.append(line);
    });
  };

  const currentPane = () => panes.find((pane) => pane.dataset.step === activeStep);

  const showStep = (nextStep, { focus = true, announcement = true } = {}) => {
    const nextPane = panes.find((pane) => pane.dataset.step === nextStep);
    if (!nextPane) return;
    window.clearTimeout(hidePaneTimer);
    const oldPane = currentPane();
    if (oldPane === nextPane) {
      if (focus) nextPane.querySelector("h3")?.focus();
      return;
    }
    if (oldPane) oldPane.classList.remove("is-active");
    nextPane.hidden = false;
    requestAnimationFrame(() => nextPane.classList.add("is-active"));
    activeStep = nextStep;

    progressItems.forEach((item) => {
      if (item.dataset.progress === nextStep) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });

    const position = stepNames.indexOf(nextStep);
    if (announcement && nextStep !== "succes") liveRegion.textContent = `Étape ${position + 1} sur 4. ${nextPane.querySelector("h3")?.textContent || ""}.`;
    if (nextStep === "succes") liveRegion.textContent = "Simulation terminée. Aucune réservation n’a été envoyée.";
    if (focus) requestAnimationFrame(() => nextPane.querySelector("h3")?.focus());
    if (oldPane) {
      oldPane.classList.add("is-outgoing");
      hidePaneTimer = window.setTimeout(() => {
        oldPane.hidden = true;
        oldPane.classList.remove("is-outgoing");
      }, prefersReducedMotion ? 1 : 250);
    }
  };

  const clearError = (id) => {
    const field = document.getElementById(id);
    if (field) field.textContent = "";
  };

  const advance = (target) => {
    if (activeStep === "service" && !bookingState.service) {
      document.getElementById("erreur-prestation").textContent = "Choisissez une prestation pour continuer.";
      form.querySelector('input[name="prestation"]')?.focus();
      return;
    }
    if (activeStep === "jour" && !bookingState.date) {
      document.getElementById("erreur-jour").textContent = "Choisissez un jour ouvert dans la liste.";
      dateStrip.querySelector("input:not(:disabled)")?.focus();
      return;
    }
    if (activeStep === "heure" && !bookingState.time) {
      document.getElementById("erreur-heure").textContent = "Choisissez une heure disponible dans la simulation.";
      slotGroups.querySelector("input:not(:disabled)")?.focus();
      return;
    }
    if (target === "heure") renderSlots();
    if (target === "coordonnees") renderRecap();
    showStep(target);
  };

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.name === "prestation") {
      bookingState.service = target.value;
      bookingState.date = null;
      bookingState.time = null;
      dateStrip.querySelectorAll('input[name="jour"]').forEach((radio) => { radio.checked = false; });
      slotGroups.replaceChildren();
      clearError("erreur-prestation");
      clearError("erreur-jour");
      clearError("erreur-heure");
      updateSummary();
      return;
    }
    if (target.name === "jour") {
      bookingState.date = target.value;
      bookingState.time = null;
      clearError("erreur-jour");
      clearError("erreur-heure");
      renderSlots();
      updateSummary();
      return;
    }
    if (target.name === "heure") {
      bookingState.time = target.value;
      clearError("erreur-heure");
      updateSummary();
    }
  });

  form.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => advance(button.dataset.next));
  });
  form.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(button.dataset.back));
  });

  document.querySelectorAll("[data-preselect]").forEach((link) => {
    link.addEventListener("click", () => {
      const radio = form.querySelector(`input[name="prestation"][value="${link.dataset.preselect}"]`);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
      showStep("service");
    });
  });

  document.querySelectorAll("[data-edit]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showStep(link.dataset.edit);
    });
  });

  const firstNameField = document.getElementById("prenom");
  const phoneField = document.getElementById("telephone");
  firstNameField.addEventListener("input", () => {
    bookingState.firstName = firstNameField.value.trim();
    firstNameField.removeAttribute("aria-invalid");
    clearError("erreur-prenom");
  });
  phoneField.addEventListener("input", () => {
    bookingState.phone = phoneField.value.trim();
    phoneField.removeAttribute("aria-invalid");
    clearError("erreur-telephone");
  });

  const validFrenchMobile = (value) => {
    const digits = value.replace(/[\s().-]/g, "").replace(/^\+/, "").replace(/^00/, "");
    return /^(?:0[67]\d{8}|33[67]\d{8})$/.test(digits);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let firstInvalid = null;
    if (bookingState.firstName.length < 2) {
      firstNameField.setAttribute("aria-invalid", "true");
      document.getElementById("erreur-prenom").textContent = "Saisissez votre prénom, avec au moins deux caractères.";
      firstInvalid = firstNameField;
    }
    if (!validFrenchMobile(bookingState.phone)) {
      phoneField.setAttribute("aria-invalid", "true");
      document.getElementById("erreur-telephone").textContent = "Saisissez un numéro de portable français valide.";
      firstInvalid ||= phoneField;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      liveRegion.textContent = "Vérifiez les champs indiqués.";
      return;
    }

    const successRecap = document.getElementById("recap-succes");
    successRecap.replaceChildren();
    const lines = [
      ["Prénom", bookingState.firstName],
      ["Prestation", services[bookingState.service].name],
      ["Jour", dateParts(bookingState.date).full],
      ["Heure", bookingState.time]
    ];
    lines.forEach(([label, value]) => {
      const line = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label} : `;
      line.append(strong, document.createTextNode(value));
      successRecap.append(line);
    });
    showStep("succes");
  });

  document.getElementById("recommencer").addEventListener("click", () => {
    form.reset();
    bookingState.service = null;
    bookingState.date = null;
    bookingState.time = null;
    bookingState.firstName = "";
    bookingState.phone = "";
    firstNameField.removeAttribute("aria-invalid");
    phoneField.removeAttribute("aria-invalid");
    ["erreur-prestation", "erreur-jour", "erreur-heure", "erreur-prenom", "erreur-telephone"].forEach(clearError);
    slotGroups.replaceChildren();
    makeDateChoices();
    updateSummary();
    showStep("service");
  });

  makeDateChoices();
  updateSummary();
}
