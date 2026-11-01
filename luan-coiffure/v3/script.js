document.documentElement.classList.add("js");

const services = {
  coupe: { name: "Coupe de cheveux", duration: 30, price: 25 },
  barbe: { name: "Taille de barbe", duration: 20, price: 15 },
  ensemble: { name: "Coupe + barbe", duration: 45, price: 35 }
};

const state = {
  serviceId: "",
  dateKey: "",
  time: "",
  name: "",
  phone: ""
};

const steps = [...document.querySelectorAll(".booking-step")];
const progressCurrent = document.querySelector("#progress-current");
const progressBar = document.querySelector("#progress-bar");
const summaryService = document.querySelector("#summary-service");
const summaryDate = document.querySelector("#summary-date");
const summaryTime = document.querySelector("#summary-time");
const summaryPrice = document.querySelector("#summary-price");
const summaryEdit = document.querySelector("#summary-edit");
const bookingForm = document.querySelector("#booking-form");
const bookingSuccess = document.querySelector("#booking-success");
const nextButtons = [...document.querySelectorAll(".next-step")];
const dayList = document.querySelector("#day-list");
const slotList = document.querySelector("#slot-list");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentStep = 1;
let stepMoving = false;
let parisTodayKey = "";

const dateParts = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const nowParisKey = (date = new Date()) => {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const utcDateForKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const dateLabel = (key, style = "long") => {
  const options = style === "short"
    ? { weekday: "short", day: "numeric", month: "short" }
    : { weekday: "long", day: "numeric", month: "long" };
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(utcDateForKey(key));
};

const currentParisMinutes = () => {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
};

const service = () => services[state.serviceId] || null;
const formatTime = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  return `${hours} h ${mins}`;
};

const setSummary = () => {
  const chosen = service();
  summaryService.textContent = chosen ? chosen.name : "Aucune prestation choisie";
  summaryDate.textContent = state.dateKey ? dateLabel(state.dateKey) : "Jour à choisir";
  summaryTime.textContent = state.time || "Heure à choisir";
  summaryPrice.textContent = chosen ? `${chosen.price} €` : "—";
  summaryEdit.hidden = !chosen;
};

const updateProgress = () => {
  progressCurrent.textContent = `Étape ${currentStep} sur 4`;
  progressBar.style.transform = `scaleX(${currentStep / 4})`;
};

const updateNextButtons = () => {
  nextButtons[0].disabled = !state.serviceId;
  nextButtons[1].disabled = !state.dateKey;
  nextButtons[2].disabled = !state.time;
};

const setService = (id) => {
  if (!services[id]) return;
  state.serviceId = id;
  state.dateKey = "";
  state.time = "";
  document.querySelectorAll('input[name="service"]').forEach((input) => {
    input.checked = input.value === id;
  });
  document.querySelectorAll(".day-choice").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  slotList.replaceChildren();
  updateNextButtons();
  setSummary();
};

const buildDays = () => {
  parisTodayKey = nowParisKey();
  const start = utcDateForKey(parisTodayKey);
  dayList.replaceChildren();

  for (let index = 0; index < 12; index += 1) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    const key = [
      day.getUTCFullYear(),
      String(day.getUTCMonth() + 1).padStart(2, "0"),
      String(day.getUTCDate()).padStart(2, "0")
    ].join("-");
    const closed = day.getUTCDay() === 0;
    const button = document.createElement("button");
    const label = dateLabel(key, "short").replace(".", "");
    const weekday = label.split(" ")[0];
    const number = label.split(" ")[1];
    button.type = "button";
    button.className = "day-choice";
    button.dataset.date = key;
    button.disabled = closed;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", closed ? `${dateLabel(key)}, fermé` : dateLabel(key));
    button.innerHTML = `<span>${weekday}</span><strong>${number}</strong><small>${closed ? "Fermé" : "Choisir"}</small>`;
    dayList.append(button);
  }
};

const hoursForDate = (key) => {
  const weekday = utcDateForKey(key).getUTCDay();
  if (weekday === 0) return null;
  if (weekday === 1) return { open: 12 * 60, close: 19 * 60 };
  if (weekday === 6) return { open: 8 * 60, close: 17 * 60 };
  return { open: 9 * 60, close: 19 * 60 };
};

const hashSlot = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const renderSlots = () => {
  slotList.replaceChildren();
  state.time = "";
  updateNextButtons();
  setSummary();

  const chosen = service();
  const hours = hoursForDate(state.dateKey);
  if (!chosen || !hours) return;

  document.querySelector("#slot-date-label").textContent =
    `${dateLabel(state.dateKey)} · durée indicative de ${chosen.duration} min.`;

  const todayKey = nowParisKey();
  const nowMinutes = currentParisMinutes();
  let availableCount = 0;

  for (let minute = hours.open; minute + chosen.duration <= hours.close; minute += 30) {
    const time = formatTime(minute);
    const past = state.dateKey === todayKey && minute <= nowMinutes;
    const booked = !past && hashSlot(`${state.dateKey}-${minute}-${state.serviceId}`) % 7 === 0;
    const label = document.createElement("label");
    const input = document.createElement("input");
    const visibleTime = document.createElement("span");
    const status = document.createElement("small");

    label.className = "slot-label";
    input.type = "radio";
    input.name = "time";
    input.value = time;
    input.disabled = past || booked;
    input.setAttribute("aria-label", `${time}${past ? ", passé" : booked ? ", déjà pris" : ""}`);
    visibleTime.textContent = time;
    status.className = "slot-state";
    status.textContent = past ? "Passé" : booked ? "Déjà pris" : "";
    if (!past && !booked) availableCount += 1;

    label.append(input, visibleTime, status);
    slotList.append(label);
  }

  if (availableCount === 0) {
    const empty = document.createElement("p");
    empty.className = "slot-empty";
    empty.textContent = "Aucun créneau restant pour cette date. Choisissez un autre jour.";
    slotList.append(empty);
  }
};

const recapLine = (label, value) => {
  const row = document.createElement("p");
  const key = document.createElement("span");
  const val = document.createElement("strong");
  key.textContent = label;
  val.textContent = value;
  row.append(key, val);
  return row;
};

const renderConfirmRecap = () => {
  const chosen = service();
  const recap = document.querySelector("#confirm-recap");
  recap.replaceChildren(
    recapLine("Prestation", chosen ? chosen.name : "À choisir"),
    recapLine("Jour", state.dateKey ? dateLabel(state.dateKey) : "À choisir"),
    recapLine("Heure", state.time || "À choisir"),
    recapLine("Tarif indicatif", chosen ? `${chosen.price} €` : "À confirmer")
  );
};

const showStep = (nextStep) => {
  if (stepMoving || nextStep < 1 || nextStep > 4) return;
  const current = steps.find((step) => Number(step.dataset.step) === currentStep);
  const next = steps.find((step) => Number(step.dataset.step) === nextStep);
  if (!current || !next || current === next) return;

  stepMoving = true;
  current.classList.add("is-leaving");
  window.setTimeout(() => {
    current.hidden = true;
    current.classList.remove("is-leaving");
    next.hidden = false;
    next.classList.add("is-entering");
    currentStep = nextStep;
    updateProgress();
    if (nextStep === 3) renderSlots();
    if (nextStep === 4) renderConfirmRecap();
    requestAnimationFrame(() => {
      next.classList.remove("is-entering");
      const heading = next.querySelector("h3");
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "center"
      });
    });
    window.setTimeout(() => { stepMoving = false; }, 250);
  }, 90);
};

const validateField = (input, messageNode, test, message) => {
  const valid = test(input.value);
  input.setAttribute("aria-invalid", valid ? "false" : "true");
  messageNode.textContent = valid ? "" : message;
  return valid;
};

const mobileIsValid = (value) => {
  const normalized = value.replace(/[\s().-]/g, "");
  return /^(?:(?:\+33|0033)0?[67]\d{8}|0[67]\d{8})$/.test(normalized);
};

const showSuccess = () => {
  const chosen = service();
  const recap = document.querySelector("#success-recap");
  recap.replaceChildren(
    recapLine("Pour", state.name),
    recapLine("Prestation", chosen.name),
    recapLine("Jour", dateLabel(state.dateKey)),
    recapLine("Heure", state.time),
    recapLine("Montant indicatif", `${chosen.price} €`)
  );
  bookingForm.hidden = true;
  bookingSuccess.hidden = false;
  summaryService.textContent = chosen.name;
  summaryDate.textContent = dateLabel(state.dateKey);
  summaryTime.textContent = state.time;
  summaryPrice.textContent = `${chosen.price} €`;
  summaryEdit.hidden = true;
  bookingSuccess.querySelector("h3").focus({ preventScroll: true });
};

const openCalendarFile = () => {
  const chosen = service();
  if (!chosen || !state.dateKey || !state.time) return;
  const startMinutes = Number(state.time.slice(0, 2)) * 60 + Number(state.time.slice(-2));
  const endMinutes = startMinutes + chosen.duration;
  const datePart = state.dateKey.replaceAll("-", "");
  const timePart = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;
  const escapeICS = (value) => value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studio Lamy//Luan Coiffure preview//FR",
    "BEGIN:VEVENT",
    `DTSTART:${datePart}T${timePart(startMinutes)}`,
    `DTEND:${datePart}T${timePart(endMinutes)}`,
    `SUMMARY:${escapeICS(`Rendez-vous — Luan Coiffure — ${chosen.name}`)}`,
    `DESCRIPTION:${escapeICS("Simulation à confirmer auprès du salon. Rien n’a été envoyé.")}`,
    `LOCATION:${escapeICS("9 rue Eugène-Gilbert, 63000 Clermont-Ferrand")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "rendez-vous-luan-coiffure.ics";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

const revealObserver = ("IntersectionObserver" in window)
  ? new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        if (entry.target.id === "prestations") {
          entry.target.querySelectorAll(".service-row").forEach((row, index) => {
            window.setTimeout(() => {
              row.classList.remove("is-row-hidden");
              row.classList.add("is-row-visible");
            }, index * 65);
          });
        }
        if (entry.target.id === "visite") {
          entry.target.querySelectorAll(".visit-steps li").forEach((row, index) => {
            window.setTimeout(() => row.classList.add("is-step-visible"), index * 65);
          });
        }
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15 })
  : null;

document.querySelectorAll("[data-reveal]").forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("is-visible");
});
document.querySelectorAll(".service-row").forEach((row) => {
  if (revealObserver) row.classList.add("is-row-hidden");
  else row.classList.add("is-row-visible");
});
if (!revealObserver) {
  document.querySelectorAll(".visit-steps li").forEach((row) => row.classList.add("is-step-visible"));
}

requestAnimationFrame(() => {
  document.body.classList.add("is-ready");
});

const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector("#site-nav");
const setMenuOpen = (open) => {
  menuToggle.setAttribute("aria-expanded", String(open));
  siteNav.classList.toggle("is-open", open);
  if (open) siteNav.querySelector("a").focus();
};
menuToggle.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});
siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuToggle.focus();
  }
});

buildDays();
updateProgress();
updateNextButtons();
setSummary();

document.querySelectorAll('input[name="service"]').forEach((input) => {
  input.addEventListener("change", () => setService(input.value));
});

document.querySelectorAll("[data-select-service]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!bookingSuccess.hidden) {
      bookingSuccess.hidden = true;
      bookingForm.hidden = false;
    }
    setService(button.dataset.selectService);
    if (currentStep !== 1) showStep(1);
    document.querySelector("#reserver").scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "start"
    });
  });
});

dayList.addEventListener("click", (event) => {
  const button = event.target.closest(".day-choice");
  if (!button || button.disabled) return;
  state.dateKey = button.dataset.date;
  state.time = "";
  dayList.querySelectorAll(".day-choice").forEach((day) => {
    day.setAttribute("aria-pressed", String(day === button));
  });
  document.querySelector("#day-error").textContent = "";
  updateNextButtons();
  setSummary();
});

slotList.addEventListener("change", (event) => {
  if (event.target.name !== "time") return;
  state.time = event.target.value;
  document.querySelector("#slot-error").textContent = "";
  updateNextButtons();
  setSummary();
});

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (stepMoving) return;
    if (currentStep === 1 && !state.serviceId) return;
    if (currentStep === 2 && !state.dateKey) {
      document.querySelector("#day-error").textContent = "Choisissez un jour pour continuer.";
      return;
    }
    if (currentStep === 3 && !state.time) {
      document.querySelector("#slot-error").textContent = "Choisissez une heure pour continuer.";
      return;
    }
    showStep(currentStep + 1);
  });
});

document.querySelectorAll(".back-step").forEach((button) => {
  button.addEventListener("click", () => showStep(currentStep - 1));
});

summaryEdit.addEventListener("click", () => {
  if (state.serviceId) showStep(1);
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nameInput = document.querySelector("#first-name");
  const phoneInput = document.querySelector("#mobile");
  const nameError = document.querySelector("#name-error");
  const phoneError = document.querySelector("#phone-error");
  const validName = validateField(
    nameInput,
    nameError,
    (value) => value.trim().length >= 2,
    "Entrez un prénom d’au moins deux caractères."
  );
  const validPhone = validateField(
    phoneInput,
    phoneError,
    mobileIsValid,
    "Entrez un numéro mobile français valide, par exemple 06 12 34 56 78."
  );
  if (!validName || !validPhone) {
    (validName ? phoneInput : nameInput).focus();
    return;
  }
  state.name = nameInput.value.trim();
  state.phone = phoneInput.value.trim();
  showSuccess();
});

document.querySelector("#reset-booking").addEventListener("click", () => {
  state.serviceId = "";
  state.dateKey = "";
  state.time = "";
  state.name = "";
  state.phone = "";
  bookingForm.reset();
  bookingForm.hidden = false;
  bookingSuccess.hidden = true;
  steps.forEach((step, index) => { step.hidden = index !== 0; });
  currentStep = 1;
  updateProgress();
  updateNextButtons();
  setSummary();
  document.querySelector("#step-one-title").focus();
});

document.querySelector("#calendar-download").addEventListener("click", openCalendarFile);

const addressButton = document.querySelector("#copy-address");
const addressStatus = document.querySelector("#copy-status");
addressButton.addEventListener("click", async () => {
  const address = "9 rue Eugène-Gilbert, 63000 Clermont-Ferrand";
  try {
    await navigator.clipboard.writeText(address);
    addressStatus.textContent = "Adresse copiée.";
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = address;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    fallback.remove();
    addressStatus.textContent = copied ? "Adresse copiée." : "Copie indisponible sur cet appareil.";
  }
});

const mobileBar = document.querySelector("#mobile-bar");
if ("IntersectionObserver" in window) {
  let heroVisible = true;
  let inBooking = false;
  let inFooter = false;
  const updateMobileBar = () => {
    const show = !heroVisible && !inBooking && !inFooter;
    mobileBar.classList.toggle("is-visible", show);
    mobileBar.classList.toggle("is-hidden-context", inBooking || inFooter);
  };
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target.classList.contains("hero-cta")) heroVisible = entry.isIntersecting;
      if (entry.target.id === "reserver") inBooking = entry.isIntersecting;
      if (entry.target.id === "site-footer") inFooter = entry.isIntersecting;
    });
    updateMobileBar();
  }, { threshold: 0.05 });
  barObserver.observe(document.querySelector(".hero-cta"));
  barObserver.observe(document.querySelector("#reserver"));
  barObserver.observe(document.querySelector("#site-footer"));
}

window.addEventListener("pageshow", () => {
  if (nowParisKey() !== parisTodayKey) buildDays();
});
