document.documentElement.classList.add("js");

const page = document;
const hero = page.querySelector(".chapitre--hero");
const menuButton = page.querySelector(".entete__bouton");
const navigation = page.querySelector("#navigation");
const panels = [...page.querySelectorAll("[data-panneau]")];
const politeNotice = page.querySelector("#reservation-annonce");

function openNavigation(open) {
  if (!menuButton || !navigation) return;
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Masquer les chapitres" : "Afficher les chapitres");
  navigation.classList.toggle("navigation--ouverte", open);
  if (open) navigation.querySelector("a")?.focus();
}

menuButton?.addEventListener("click", () => {
  openNavigation(menuButton.getAttribute("aria-expanded") !== "true");
});

navigation?.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  openNavigation(false);
  if (!link.hash) return;
  const destination = page.getElementById(decodeURIComponent(link.hash.slice(1)));
  const heading = destination?.querySelector("h1, h2");
  if (!heading) return;
  heading.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => heading.focus({ preventScroll: true }));
});

page.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton?.getAttribute("aria-expanded") === "true") {
    openNavigation(false);
    menuButton.focus();
  }
});

requestAnimationFrame(() => requestAnimationFrame(() => hero?.classList.add("hero--pret")));

const revealItems = [...page.querySelectorAll("[data-reveal]")];
const revealCount = new Map();
for (const item of revealItems) {
  const group = item.closest(".chapitre") || item.parentElement;
  const index = revealCount.get(group) || 0;
  revealCount.set(group, index + 1);
  item.style.transitionDelay = `${Math.min(index % 5, 4) * 55}ms`;
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -3% 0px" });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const progressLine = page.querySelector("#progression-trait");
const progressMeter = page.querySelector("#progression-annonce");
let progressFrame = 0;

function updateProgress() {
  progressFrame = 0;
  const root = page.documentElement;
  const length = Math.max(1, root.scrollHeight - window.innerHeight);
  const ratio = Math.min(1, Math.max(0, window.scrollY / length));
  if (progressLine) progressLine.style.transform = `scaleY(${ratio})`;
  if (progressMeter) progressMeter.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
}

window.addEventListener("scroll", () => {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
}, { passive: true });
window.addEventListener("resize", () => {
  if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
}, { passive: true });
updateProgress();

const choiceInputs = [...page.querySelectorAll('input[name="prestation"]')];
const dayList = page.querySelector("[data-liste-jours]");
const hourList = page.querySelector("[data-liste-heures]");
const form = page.querySelector("#formulaire-reservation");
const selectedDayText = page.querySelector("[data-jour-choisi]");
const recapText = page.querySelector("[data-recapitulatif]");
const confirmText = page.querySelector("[data-confirmation]");
const serviceSummary = page.querySelector("[data-resume-prestation]");
const daySummary = page.querySelector("[data-resume-jour]");
const hourSummary = page.querySelector("[data-resume-heure]");
const editService = page.querySelector('[data-modifier="prestation"]');
const editDay = page.querySelector('[data-modifier="jour"]');
const editHour = page.querySelector('[data-modifier="heure"]');
const continueDay = page.querySelector('[data-action="continuer-jour"]');
const continueHour = page.querySelector('[data-action="continuer-heure"]');
const continueDetails = page.querySelector('[data-action="continuer-coordonnees"]');
const firstNameInput = page.querySelector("#prenom");
const phoneInput = page.querySelector("#telephone");
const firstNameError = page.querySelector("#erreur-prenom");
const phoneError = page.querySelector("#erreur-telephone");

const state = {
  prestation: null,
  jour: null,
  heure: null,
  prenom: "",
  telephone: "",
  etape: "prestation"
};

const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const shortDays = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const shortMonths = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const openByDay = new Map([
  [2, { opening: 9 * 60, closing: 19 * 60 }],
  [3, { opening: 9 * 60, closing: 19 * 60 }],
  [4, { opening: 9 * 60, closing: 19 * 60 }],
  [5, { opening: 9 * 60, closing: 19 * 60 }],
  [6, { opening: 9 * 60, closing: 17 * 60 }]
]);

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function copyDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function fullDate(date) {
  const weekday = dayNames[date.getDay()];
  return `${weekday} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function capitalized(value) {
  return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")} h ${String(remainder).padStart(2, "0")}`;
}

function selectedService() {
  return choiceInputs.find((input) => input.value === state.prestation) || null;
}

function updateSummary() {
  const service = selectedService();
  if (service) {
    if (serviceSummary) serviceSummary.textContent = service.dataset.nom;
  } else if (serviceSummary) {
    serviceSummary.textContent = "À choisir";
  }

  if (daySummary) daySummary.textContent = state.jour ? capitalized(fullDate(state.jour.date)) : "À choisir";
  if (hourSummary) hourSummary.textContent = state.heure || "À choisir";
  if (editService) editService.disabled = !state.prestation;
  if (editDay) editDay.disabled = !state.jour;
  if (editHour) editHour.disabled = !state.heure;

  const recap = [
    service ? service.dataset.nom : "",
    state.jour ? capitalized(fullDate(state.jour.date)) : "",
    state.heure || ""
  ].filter(Boolean);
  if (recapText) recapText.textContent = recap.length ? recap.join(" · ") : "Votre sélection apparaîtra ici.";
}

let stepTimer = 0;
let stepToken = 0;

function showStep(name, focus = true) {
  const target = panels.find((panel) => panel.dataset.panneau === name);
  if (!target) return;

  stepToken += 1;
  const ownToken = stepToken;
  if (stepTimer) window.clearTimeout(stepTimer);

  const current = panels.find((panel) => panel.dataset.panneau === state.etape && panel.classList.contains("is-active"));
  panels.forEach((panel) => {
    panel.classList.remove("is-leaving", "is-entering");
    if (panel !== current && panel !== target) panel.classList.remove("is-active");
  });

  if (current && current !== target) current.classList.add("is-leaving");
  target.classList.add("is-active");
  if (current !== target) target.classList.add("is-entering");
  requestAnimationFrame(() => {
    if (ownToken === stepToken) target.classList.remove("is-entering");
  });

  if (current && current !== target) {
    stepTimer = window.setTimeout(() => {
      if (ownToken !== stepToken) return;
      current.classList.remove("is-active", "is-leaving");
    }, 220);
  }

  state.etape = name;
  const number = name === "prestation" ? 1 : name === "jour" ? 2 : name === "heure" ? 3 : 4;
  if (politeNotice && name !== "confirmation") {
    politeNotice.textContent = `Étape ${number} sur 4. ${target.querySelector("h4")?.textContent.trim() || ""}`;
  }
  if (focus) target.querySelector("h4")?.focus({ preventScroll: true });
}

function createDayButton(date) {
  const weekday = date.getDay();
  const openHours = openByDay.get(weekday);
  const button = page.createElement("button");
  const dayText = page.createElement("span");
  const dateText = page.createElement("span");
  button.type = "button";
  button.className = "jour";
  button.dataset.date = dateKey(date);
  button.setAttribute("aria-pressed", "false");
  dayText.textContent = shortDays[weekday];
  if (openHours) {
    dateText.textContent = `${date.getDate()} ${shortMonths[date.getMonth()]}`;
    button.setAttribute("aria-label", `Choisir ${fullDate(date)}`);
    button.addEventListener("click", () => {
      dayList?.querySelectorAll(".jour").forEach((item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
      state.jour = { date: copyDate(date), hours: openHours };
      state.heure = null;
      if (continueHour) continueHour.disabled = true;
      if (continueDetails) continueDetails.disabled = true;
      if (selectedDayText) selectedDayText.textContent = `Créneaux proposés pour ${capitalized(fullDate(date))}.`;
      renderHours();
      updateSummary();
      if (continueHour) continueHour.disabled = false;
    });
  } else {
    button.disabled = true;
    button.classList.add("jour--ferme");
    dateText.textContent = "Fermé";
    button.setAttribute("aria-label", `${capitalized(dayNames[weekday])} ${date.getDate()} ${monthNames[date.getMonth()]} : fermé`);
  }
  button.append(dayText, dateText);
  return button;
}

function renderDays() {
  if (!dayList) return;
  dayList.replaceChildren();
  const today = copyDate(new Date());
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    dayList.append(createDayButton(date));
  }
}

function hashTime(dateString, slotIndex) {
  let value = 0;
  const seed = `${dateString}-${slotIndex}-sanmalerine`;
  for (let index = 0; index < seed.length; index += 1) value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  return value % 6 === 0;
}

function renderHours() {
  if (!hourList || !state.jour || !selectedService()) return;
  hourList.replaceChildren();
  const duration = Number(selectedService().dataset.duree);
  const { opening, closing } = state.jour.hours;
  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(state.jour.date);
  const now = new Date();

  for (let start = opening, index = 0; start + duration <= closing; start += 30, index += 1) {
    const time = formatTime(start);
    const button = page.createElement("button");
    const mainText = page.createElement("span");
    const note = page.createElement("span");
    button.type = "button";
    button.className = "heure";
    button.dataset.heure = time;
    button.setAttribute("aria-pressed", "false");
    mainText.textContent = time;

    if (state.heure === time) {
      button.classList.add("is-selected");
      button.setAttribute("aria-pressed", "true");
    }

    const isPast = selectedKey === todayKey && start <= now.getHours() * 60 + now.getMinutes();
    const isTaken = !isPast && hashTime(selectedKey, index);
    if (isPast) {
      button.disabled = true;
      button.classList.add("is-passe");
      note.textContent = "passé";
      button.setAttribute("aria-label", `${time}, créneau passé`);
    } else if (isTaken) {
      button.disabled = true;
      button.classList.add("is-pris");
      note.textContent = "déjà pris";
      button.setAttribute("aria-label", `${time}, déjà pris`);
    } else {
      note.textContent = "libre";
      button.setAttribute("aria-label", `Choisir ${time}`);
      button.addEventListener("click", () => {
        hourList.querySelectorAll(".heure").forEach((item) => {
          item.classList.remove("is-selected");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
        state.heure = time;
        updateSummary();
        if (continueDetails) continueDetails.disabled = false;
      });
    }
    button.append(mainText, note);
    hourList.append(button);
  }
}

choiceInputs.forEach((input) => {
  input.addEventListener("change", () => {
    state.prestation = input.value;
    state.jour = null;
    state.heure = null;
    renderDays();
    if (continueDay) continueDay.disabled = false;
    if (continueHour) continueHour.disabled = true;
    if (continueDetails) continueDetails.disabled = true;
    updateSummary();
  });
});

continueDay?.addEventListener("click", () => {
  if (!state.prestation) return;
  renderDays();
  showStep("jour");
});

continueHour?.addEventListener("click", () => {
  if (!state.jour) return;
  renderHours();
  showStep("heure");
});

continueDetails?.addEventListener("click", () => {
  if (!state.heure) return;
  showStep("coordonnees");
});

page.querySelector('[data-action="retour-prestation"]')?.addEventListener("click", () => showStep("prestation"));
page.querySelector('[data-action="retour-jour"]')?.addEventListener("click", () => showStep("jour"));
page.querySelector('[data-action="retour-heure"]')?.addEventListener("click", () => showStep("heure"));

page.querySelectorAll("[data-modifier]").forEach((button) => {
  button.addEventListener("click", () => showStep(button.dataset.modifier));
});

page.querySelectorAll("[data-preselection]").forEach((link) => {
  link.addEventListener("click", () => {
    const input = choiceInputs.find((candidate) => candidate.value === link.dataset.preselection);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    showStep("prestation", false);
  });
});

function clearValidation() {
  if (firstNameError) firstNameError.textContent = "";
  if (phoneError) phoneError.textContent = "";
  firstNameInput?.removeAttribute("aria-invalid");
  phoneInput?.removeAttribute("aria-invalid");
}

firstNameInput?.addEventListener("input", clearValidation);
phoneInput?.addEventListener("input", clearValidation);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearValidation();
  const firstName = firstNameInput?.value.trim() || "";
  const phoneRaw = phoneInput?.value.trim() || "";
  const phone = phoneRaw.replace(/[\s().-]/g, "");
  const validMobile = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(phone);
  let firstInvalid = null;

  if (firstName.length < 2) {
    if (firstNameError) firstNameError.textContent = "Indiquez un prénom d’au moins deux caractères.";
    firstNameInput?.setAttribute("aria-invalid", "true");
    firstInvalid = firstNameInput;
  }
  if (!validMobile) {
    if (phoneError) phoneError.textContent = "Indiquez un numéro de portable français commençant par 06 ou 07.";
    phoneInput?.setAttribute("aria-invalid", "true");
    firstInvalid ||= phoneInput;
  }

  if (firstInvalid) {
    firstInvalid.focus();
    politeNotice.textContent = "Vérifiez les champs signalés avant de continuer.";
    return;
  }

  if (!state.prestation || !state.jour || !state.heure) {
    politeNotice.textContent = "Choisissez une prestation, un jour et une heure avant de continuer.";
    showStep(!state.prestation ? "prestation" : !state.jour ? "jour" : "heure");
    return;
  }

  state.prenom = firstName;
  state.telephone = phoneRaw;
  const service = selectedService();
  if (confirmText) {
    confirmText.textContent = `${firstName}, voici votre récapitulatif : ${service.dataset.nom}, ${capitalized(fullDate(state.jour.date))} à ${state.heure}, au 33 rue Maryse Bastié à Lyon. Durée indiquée sur Planity : ${service.dataset.duree} min.`;
  }
  showStep("confirmation");
  if (politeNotice) politeNotice.textContent = "Simulation terminée. Aucun renseignement n’a été transmis au salon.";
});

page.querySelector('[data-action="recommencer"]')?.addEventListener("click", () => {
  state.prestation = null;
  state.jour = null;
  state.heure = null;
  state.prenom = "";
  state.telephone = "";
  choiceInputs.forEach((input) => { input.checked = false; });
  form?.reset();
  clearValidation();
  if (continueDay) continueDay.disabled = true;
  if (continueHour) continueHour.disabled = true;
  if (continueDetails) continueDetails.disabled = true;
  renderDays();
  updateSummary();
  if (politeNotice) politeNotice.textContent = "Rien n’est envoyé au salon. Les heures suivent les horaires publiés sur Planity.";
  showStep("prestation");
});

renderDays();
updateSummary();
showStep("prestation", false);
