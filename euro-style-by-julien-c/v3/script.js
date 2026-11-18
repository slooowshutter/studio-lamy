(() => {
  const form = document.querySelector("#booking-form");
  if (!form) return;

  const steps = [...form.querySelectorAll(".booking-step[data-step]")];
  const successStep = document.querySelector("#booking-success");
  const liveStatus = document.querySelector("#booking-status");
  const dateGrid = document.querySelector("#date-grid");
  const timeGrid = document.querySelector("#time-grid");
  const nameField = document.querySelector("#customer-name");
  const phoneField = document.querySelector("#customer-phone");
  const choices = {
    "coupe-femme": "Coupe femme",
    "coupe-enfant": "Coupe enfant",
    coloration: "Coloration",
    balayage: "Balayage"
  };
  const state = { service: "", day: null, dayText: "", time: "" };
  let currentStep = 0;

  function calendarDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parisCalendarDate(date) {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));
  }

  function parisTimeMinutes(date) {
    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  }

  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }

  function frenchHolidayKeys(year) {
    const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
    const dates = new Set(fixed.map((part) => `${year}-${part}`));
    const easter = easterSunday(year);
    [1, 39, 50].forEach((offset) => {
      const date = new Date(easter);
      date.setUTCDate(date.getUTCDate() + offset);
      dates.add(calendarDateKey(date));
    });
    return dates;
  }

  const today = parisCalendarDate(new Date());
  const holidays = new Set([...frenchHolidayKeys(today.getUTCFullYear()), ...frenchHolidayKeys(today.getUTCFullYear() + 1)]);
  const fullDateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const dayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" });
  const monthFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short" });

  function capitalized(value) {
    return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
  }

  function dateLabel(date) {
    return capitalized(fullDateFormat.format(date));
  }

  function clearError(id) {
    const output = document.getElementById(id);
    if (output) output.textContent = "";
  }

  function showError(id, message, focusTarget) {
    const output = document.getElementById(id);
    if (output) output.textContent = message;
    if (focusTarget) focusTarget.focus();
  }

  function updateSummary() {
    document.querySelector("#summary-service").textContent = state.service || "À choisir";
    document.querySelector("#summary-day").textContent = state.dayText || "À choisir";
    document.querySelector("#summary-time").textContent = state.time || "À choisir";
    document.querySelectorAll(".summary-edit").forEach((button) => {
      const index = Number(button.dataset.jump);
      const complete = index === 0 ? Boolean(state.service) : index === 1 ? Boolean(state.day) : Boolean(state.time);
      button.disabled = !complete || index >= currentStep || successStep.hidden === false;
    });
  }

  function openStep(index) {
    if (index < 0 || index > steps.length - 1) return;
    steps[currentStep].hidden = true;
    currentStep = index;
    const panel = steps[currentStep];
    panel.hidden = false;
    panel.classList.add("is-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove("is-entering")));
    const title = panel.querySelector("h3");
    if (title) title.focus({ preventScroll: true });
    const labels = ["choisissez une prestation", "choisissez un jour", "choisissez une heure souhaitée", "renseignez vos coordonnées"];
    liveStatus.textContent = `Étape ${currentStep + 1} sur 4 : ${labels[currentStep]}.`;
    updateSummary();
  }

  function addDayChoice(date) {
    const key = calendarDateKey(date);
    const weekday = date.getUTCDay();
    const closed = weekday === 0 || weekday === 1 || holidays.has(key);
    const label = document.createElement("label");
    label.className = "date-option";
    if (closed) label.setAttribute("aria-disabled", "true");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "jour";
    input.value = key;
    input.disabled = closed;
    input.setAttribute("aria-label", `${dateLabel(date)}${closed ? " : fermé" : ""}`);

    const weekdayText = document.createElement("span");
    weekdayText.className = "date-option__day";
    weekdayText.textContent = dayFormat.format(date).replace(".", "");

    const numberText = document.createElement("span");
    numberText.className = "date-option__number";
      numberText.textContent = closed ? "×" : String(date.getUTCDate());
    if (closed) numberText.setAttribute("aria-hidden", "true");

    const monthText = document.createElement("span");
    monthText.className = "date-option__month";
    monthText.textContent = closed ? "Fermé" : monthFormat.format(date).replace(".", "");

    label.append(input, weekdayText, numberText, monthText);
    dateGrid.append(label);
    input.addEventListener("change", () => {
      state.day = new Date(date);
      state.dayText = dateLabel(date);
      state.time = "";
      clearError("day-error");
      buildTimeChoices(date);
      updateSummary();
    });
  }

  function generateDates() {
    const date = new Date(today);
    for (let index = 0; index < 14; index += 1) {
      const nextDate = new Date(date);
      nextDate.setUTCDate(date.getUTCDate() + index);
      addDayChoice(nextDate);
    }
  }

  function hoursForDay(date) {
    const weekday = date.getUTCDay();
    if (weekday >= 2 && weekday <= 4) return ["10:00", "11:30", "14:30", "16:00", "17:30"];
    if (weekday === 5) return ["10:00", "12:00", "15:00", "17:00"];
    if (weekday === 6) return ["10:00", "12:00", "14:30", "16:00"];
    return [];
  }

  function buildTimeChoices(date) {
    timeGrid.replaceChildren();
    const availableTimes = hoursForDay(date);
    let count = 0;
    const currentTime = new Date();
    const currentMinutes = parisTimeMinutes(currentTime);
    const chosenDateIsToday = calendarDateKey(date) === calendarDateKey(parisCalendarDate(currentTime));

    availableTimes.forEach((time) => {
      const [hour, minute] = time.split(":").map(Number);
      const isPast = chosenDateIsToday && hour * 60 + minute <= currentMinutes;
      const label = document.createElement("label");
      label.className = "time-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "heure";
      input.value = time;
      input.disabled = isPast;
      input.setAttribute("aria-label", isPast ? `${time}, déjà passé` : time);
      const timeText = document.createElement("span");
      timeText.textContent = isPast ? `${time} · passé` : time;
      label.append(input, timeText);
      timeGrid.append(label);
      if (!isPast) count += 1;
      input.addEventListener("change", () => {
        state.time = time;
        clearError("time-error");
        updateSummary();
      });
    });

    if (count === 0) {
      const note = document.createElement("p");
      note.className = "step-hint";
      note.textContent = "Aucune heure de démonstration ne reste aujourd’hui. Choisissez un autre jour.";
      timeGrid.append(note);
    }
  }

  function validateCurrentStep() {
    if (currentStep === 0) {
      const selected = form.querySelector('input[name="prestation"]:checked');
      if (!selected) {
        showError("service-error", "Choisissez une catégorie pour continuer.", form.querySelector('input[name="prestation"]'));
        return false;
      }
      state.service = choices[selected.value];
      clearError("service-error");
    } else if (currentStep === 1) {
      const selected = form.querySelector('input[name="jour"]:checked');
      if (!selected) {
        showError("day-error", "Choisissez un jour ouvert pour continuer.", dateGrid.querySelector('input[type="radio"]:not(:disabled)'));
        return false;
      }
      clearError("day-error");
    } else if (currentStep === 2) {
      const selected = form.querySelector('input[name="heure"]:checked');
      if (!selected) {
        const firstTime = timeGrid.querySelector('input[type="radio"]:not(:disabled)');
        showError("time-error", firstTime ? "Choisissez une heure souhaitée pour continuer." : "Choisissez un autre jour pour afficher une heure souhaitée.", firstTime);
        return false;
      }
      const [selectedHour, selectedMinute] = selected.value.split(":").map(Number);
      const selectedMinutes = selectedHour * 60 + selectedMinute;
      if (state.day && calendarDateKey(state.day) === calendarDateKey(parisCalendarDate(new Date())) && selectedMinutes <= parisTimeMinutes(new Date())) {
        state.time = "";
        buildTimeChoices(state.day);
        showError("time-error", "Cette heure est passée. Choisissez une autre heure.", timeGrid.querySelector('input[type="radio"]:not(:disabled)') || steps[currentStep].querySelector("h3"));
        return false;
      }
      clearError("time-error");
    }
    updateSummary();
    return true;
  }

  function normalizedPhone(value) {
    return value.trim().replace(/[\s().-]/g, "").replace(/^0033/, "+33");
  }

  function validPhone(value) {
    return /^(?:0[1-9]\d{8}|\+33[1-9]\d{8})$/.test(normalizedPhone(value));
  }

  function confirmSimulation() {
    clearError("name-error");
    clearError("phone-error");
    if (!nameField.value.trim()) {
      showError("name-error", "Indiquez votre prénom pour continuer.", nameField);
      return;
    }
    if (!validPhone(phoneField.value)) {
      showError("phone-error", "Saisissez un numéro de téléphone français valide.", phoneField);
      return;
    }
    steps[currentStep].hidden = true;
    successStep.hidden = false;
    successStep.classList.add("is-entering");
    requestAnimationFrame(() => requestAnimationFrame(() => successStep.classList.remove("is-entering")));
    document.querySelector("#success-copy").textContent = `${state.service} · ${state.dayText} · ${state.time}. Le parcours est terminé pour ${nameField.value.trim()}.`;
    liveStatus.textContent = "Simulation terminée. Rien n’a été envoyé.";
    successStep.querySelector("h3").focus({ preventScroll: true });
    updateSummary();
  }

  function restartSimulation() {
    state.service = "";
    state.day = null;
    state.dayText = "";
    state.time = "";
    form.reset();
    successStep.hidden = true;
    steps.forEach((step, index) => { step.hidden = index !== 0; });
    currentStep = 0;
    ["service-error", "day-error", "time-error", "name-error", "phone-error"].forEach(clearError);
    liveStatus.textContent = "Étape 1 sur 4 — choisissez une prestation.";
    updateSummary();
    steps[0].querySelector("h3").focus({ preventScroll: true });
  }

  form.querySelectorAll("input[name='prestation']").forEach((input) => {
    input.addEventListener("change", () => {
      state.service = choices[input.value];
      clearError("service-error");
      updateSummary();
    });
  });

  form.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      if (validateCurrentStep()) openStep(currentStep + 1);
    });
  });
  form.querySelectorAll("[data-prev]").forEach((button) => {
    button.addEventListener("click", () => openStep(currentStep - 1));
  });
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => openStep(Number(button.dataset.jump)));
  });
  document.querySelector("#confirm-booking").addEventListener("click", confirmSimulation);
  document.querySelector("#restart-booking").addEventListener("click", restartSimulation);

  generateDates();
  updateSummary();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        activeObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll("[data-reveal], .fact-context").forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll("[data-reveal], .fact-context").forEach((element) => element.classList.add("is-visible"));
  }
})();
