(() => {
  const root = document.documentElement;
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

  if ("IntersectionObserver" in window) {
    root.classList.add("js");
    window.requestAnimationFrame(() => root.classList.add("is-ready"));

    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });

    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
  }

  const actionBar = document.querySelector(".action-bar");
  const heroActions = document.querySelector(".hero__actions");
  const bookingSection = document.querySelector(".booking-section");
  const siteFooter = document.querySelector(".site-footer");
  let heroActionsVisible = true;
  let bookingVisible = false;
  let footerVisible = false;
  let formHasFocus = false;

  const updateActionBar = () => {
    if (!actionBar) return;
    const show = !heroActionsVisible && !bookingVisible && !footerVisible && !formHasFocus;
    actionBar.classList.toggle("is-visible", show);
    actionBar.setAttribute("aria-hidden", String(!show));
    actionBar.querySelectorAll("a").forEach((link) => {
      link.tabIndex = show ? 0 : -1;
    });
  };

  if (actionBar && "IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === heroActions) heroActionsVisible = entry.isIntersecting;
        if (entry.target === bookingSection) bookingVisible = entry.isIntersecting;
        if (entry.target === siteFooter) footerVisible = entry.isIntersecting;
      }
      updateActionBar();
    }, { threshold: 0.01 });

    if (heroActions) visibilityObserver.observe(heroActions);
    if (bookingSection) visibilityObserver.observe(bookingSection);
    if (siteFooter) visibilityObserver.observe(siteFooter);
  }

  const bookingForm = document.querySelector("#booking-form");
  const panels = [...document.querySelectorAll("[data-step-panel]")];
  const progressButtons = [...document.querySelectorAll("[data-step-go]")];
  const status = document.querySelector("#booking-status");
  const dayChoices = document.querySelector("#day-choices");
  const timeChoices = document.querySelector("#time-choices");
  const summary = {
    service: document.querySelector("#selection-service"),
    day: document.querySelector("#selection-day"),
    time: document.querySelector("#selection-time"),
    name: document.querySelector("#selection-name")
  };

  if (!bookingForm || !dayChoices || !timeChoices) return;

  const state = {
    step: 0,
    highestStep: 0,
    service: document.querySelector('input[name="prestation"]:checked')?.value || "Coupe homme",
    date: null,
    time: null,
    name: ""
  };

  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const formatDate = (date, options) => new Intl.DateTimeFormat("fr-FR", options).format(date);
  const timeLabel = (hour) => `${pad(hour)} h 00`;

  const updateSummary = () => {
    summary.service.textContent = state.service;
    summary.day.textContent = state.date ? formatDate(state.date, { weekday: "long", day: "numeric", month: "long" }) : "À choisir";
    summary.time.textContent = state.time || "À choisir";
    summary.name.textContent = state.name || "À compléter";
  };

  const announceStep = () => {
    if (state.step === 4) {
      status.textContent = "Simulation terminée. Rien n’a été envoyé.";
      return;
    }
    const stepNames = ["prestation", "jour", "heure", "coordonnées"];
    status.textContent = `Étape ${state.step + 1} sur 4 · ${stepNames[state.step]}.`;
  };

  const showStep = (index, moveFocus = true) => {
    state.step = index;
    panels.forEach((panel) => {
      const active = Number(panel.dataset.stepPanel) === index;
      panel.hidden = !active;
      if (active) {
        panel.classList.add("is-entering");
        window.requestAnimationFrame(() => panel.classList.remove("is-entering"));
      }
    });

    progressButtons.forEach((button, stepIndex) => {
      const isCurrent = stepIndex === index;
      const isComplete = stepIndex < Math.min(index, 4);
      button.classList.toggle("is-current", isCurrent);
      button.classList.toggle("is-complete", isComplete);
      button.disabled = stepIndex > state.highestStep || index === 4;
      if (isCurrent) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    announceStep();
    updateSummary();
    if (moveFocus) {
      const heading = panels[index]?.querySelector("h3");
      window.setTimeout(() => heading?.focus(), motionPreference.matches ? 0 : 40);
    }
  };

  const renderDays = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 14; index += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + index);
      const isSunday = day.getDay() === 0;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-choice pressable";
      button.dataset.date = dateKey(day);
      button.disabled = isSunday;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", isSunday
        ? `${formatDate(day, { weekday: "long", day: "numeric", month: "long" })}, fermé`
        : `Exemple de date : ${formatDate(day, { weekday: "long", day: "numeric", month: "long" })}`);

      const weekday = document.createElement("span");
      weekday.className = "date-choice__week";
      weekday.textContent = formatDate(day, { weekday: "short" }).replace(".", "");
      const number = document.createElement("span");
      number.className = "date-choice__number";
      number.textContent = String(day.getDate());
      const month = document.createElement("span");
      month.className = "date-choice__month";
      month.textContent = formatDate(day, { month: "short" }).replace(".", "");

      button.append(weekday, number, month);
      if (isSunday) {
        const closed = document.createElement("span");
        closed.className = "date-choice__closed";
        closed.textContent = "Fermé";
        button.append(closed);
      }
      fragment.append(button);
    }

    dayChoices.replaceChildren(fragment);
  };

  const renderTimes = () => {
    timeChoices.replaceChildren();
    if (!state.date) return;

    const now = new Date();
    const sameDay = dateKey(state.date) === dateKey(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const hours = [9, 11, 13, 15, 17, 19];

    hours.forEach((hour, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-choice pressable";
      button.textContent = timeLabel(hour);
      button.dataset.time = timeLabel(hour);
      button.setAttribute("aria-pressed", "false");

      const passed = sameDay && hour * 60 <= currentMinutes;
      const exampleUnavailable = (state.date.getDate() + index) % 5 === 0;
      button.disabled = passed || exampleUnavailable;
      if (passed) button.setAttribute("aria-label", `${timeLabel(hour)}, heure passée`);
      else if (exampleUnavailable) button.setAttribute("aria-label", `${timeLabel(hour)}, indisponible dans cette simulation`);
      else button.setAttribute("aria-label", `Exemple de créneau à ${timeLabel(hour)}`);
      timeChoices.append(button);
    });
  };

  const clearErrors = () => {
    document.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
    document.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
  };

  const showChoiceError = (id, message) => {
    const error = document.querySelector(`#${id}`);
    error.textContent = message;
    error.setAttribute("role", "alert");
    error.tabIndex = -1;
    error.focus();
  };

  const validPhone = (value) => /^(?:(?:\+33|0033|0)[\s.-]?[67])(?:[\s.-]?\d{2}){4}$/.test(value.trim());

  document.querySelectorAll('input[name="prestation"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.service = input.value;
      updateSummary();
    });
  });

  dayChoices.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button || button.disabled) return;
    state.date = new Date(`${button.dataset.date}T00:00:00`);
    state.time = null;
    dayChoices.querySelectorAll("button[data-date]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    renderTimes();
    updateSummary();
    document.querySelector("#day-error").textContent = "";
  });

  timeChoices.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-time]");
    if (!button || button.disabled) return;
    state.time = button.dataset.time;
    timeChoices.querySelectorAll("button[data-time]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice === button)));
    updateSummary();
    document.querySelector("#time-error").textContent = "";
  });

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      clearErrors();
      if (state.step === 1 && !state.date) {
        showChoiceError("day-error", "Choisissez un jour pour poursuivre la simulation.");
        return;
      }
      if (state.step === 2 && !state.time) {
        showChoiceError("time-error", "Choisissez une heure disponible dans cette simulation.");
        return;
      }
      state.highestStep = Math.max(state.highestStep, state.step + 1);
      showStep(state.step + 1);
    });
  });

  document.querySelectorAll("[data-previous]").forEach((button) => {
    button.addEventListener("click", () => showStep(Math.max(0, state.step - 1)));
  });

  progressButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.stepGo);
      if (target <= state.highestStep) showStep(target);
    });
  });

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearErrors();
    const nameInput = document.querySelector("#booking-name");
    const phoneInput = document.querySelector("#booking-phone");
    const cleanName = nameInput.value.trim();
    const cleanPhone = phoneInput.value.trim();
    let firstInvalid = null;

    if (!cleanName) {
      document.querySelector("#name-error").textContent = "Saisissez votre prénom pour terminer la simulation.";
      nameInput.setAttribute("aria-invalid", "true");
      firstInvalid = nameInput;
    }
    if (!validPhone(cleanPhone)) {
      document.querySelector("#phone-error").textContent = "Saisissez un numéro de mobile français, par exemple 06 12 34 56 78.";
      phoneInput.setAttribute("aria-invalid", "true");
      firstInvalid ||= phoneInput;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    state.name = cleanName;
    updateSummary();
    const recap = document.querySelector("#success-recap");
    recap.textContent = `${state.service} · ${formatDate(state.date, { weekday: "long", day: "numeric", month: "long" })} à ${state.time} · ${cleanName}.`;
    showStep(4);
  });

  document.querySelector("#restart-booking")?.addEventListener("click", () => {
    bookingForm.reset();
    clearErrors();
    state.step = 0;
    state.highestStep = 0;
    state.service = document.querySelector('input[name="prestation"]:checked')?.value || "Coupe homme";
    state.date = null;
    state.time = null;
    state.name = "";
    dayChoices.querySelectorAll("button[data-date]").forEach((choice) => choice.setAttribute("aria-pressed", "false"));
    timeChoices.replaceChildren();
    updateSummary();
    showStep(0);
  });

  const fields = bookingForm.querySelectorAll("input");
  fields.forEach((field) => {
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") {
        field.removeAttribute("aria-invalid");
        document.querySelector(`#${field.getAttribute("aria-describedby")}`).textContent = "";
      }
      if (field.id === "booking-name") {
        state.name = field.value.trim();
        updateSummary();
      }
    });
  });

  bookingForm.addEventListener("focusin", () => {
    formHasFocus = true;
    updateActionBar();
  });
  bookingForm.addEventListener("focusout", () => {
    window.setTimeout(() => {
      formHasFocus = bookingForm.contains(document.activeElement);
      updateActionBar();
    }, 0);
  });

  renderDays();
  updateSummary();
  updateActionBar();
})();
