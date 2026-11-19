(() => {
  const heroGrid = document.querySelector(".hero-grid");
  const navButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#navigation-principale");
  const mobileActions = document.querySelector(".mobile-actions");
  const bookingSection = document.querySelector("#simulation");
  const footer = document.querySelector(".site-footer");

  if (heroGrid) requestAnimationFrame(() => heroGrid.classList.add("is-ready"));

  if (navButton && nav) {
    const closeMenu = (returnFocus = false) => {
      nav.classList.remove("is-open");
      navButton.setAttribute("aria-expanded", "false");
      navButton.setAttribute("aria-label", "Ouvrir la navigation");
      if (returnFocus) navButton.focus();
    };

    navButton.addEventListener("click", () => {
      const opening = navButton.getAttribute("aria-expanded") !== "true";
      navButton.setAttribute("aria-expanded", String(opening));
      navButton.setAttribute("aria-label", opening ? "Fermer la navigation" : "Ouvrir la navigation");
      nav.classList.toggle("is-open", opening);
      if (opening) nav.querySelector("a")?.focus();
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a") && navButton.getAttribute("aria-expanded") === "true") closeMenu(true);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navButton.getAttribute("aria-expanded") === "true") {
        closeMenu(true);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMenu(false);
    }, { passive: true });
  }

  const revealElements = document.querySelectorAll(".reveal");
  const routeLine = document.querySelector(".route-line");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -28px 0px" });
    revealElements.forEach((element) => revealObserver.observe(element));

    if (routeLine) {
      const routeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-drawn");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.35 });
      routeObserver.observe(routeLine);
    }

    if (mobileActions && bookingSection && footer) {
      const hiddenSections = new Set();
      const actionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) hiddenSections.add(entry.target);
          else hiddenSections.delete(entry.target);
        });
        const shouldHide = hiddenSections.size > 0;
        mobileActions.classList.toggle("is-hidden", shouldHide);
        mobileActions.inert = shouldHide;
        if (shouldHide && mobileActions.contains(document.activeElement)) {
          const focusTarget = hiddenSections.has(bookingSection)
            ? document.querySelector("#titre-simulation")
            : footer.querySelector(".sources-heading h2");
          focusTarget?.focus({ preventScroll: true });
        }
      }, { threshold: 0.06 });
      actionObserver.observe(bookingSection);
      actionObserver.observe(footer);
    }
  } else {
    revealElements.forEach((element) => element.classList.add("is-revealed"));
    routeLine?.classList.add("is-drawn");
  }

  const form = document.querySelector("#booking-form");
  if (!form) return;

  const hoursByDay = {
    0: [[13 * 60, 19 * 60]],
    1: [[13 * 60, 19 * 60]],
    2: [[9 * 60, 19 * 60]],
    3: [[9 * 60, 19 * 60]],
    4: [[9 * 60, 19 * 60]],
    5: [[9 * 60, 12 * 60 + 30], [15 * 60, 20 * 60]],
    6: [[9 * 60, 19 * 60]]
  };

  const state = {
    currentStep: 0,
    selectedDate: null,
    selectedTime: null,
    motif: "À préciser avec le salon"
  };

  const steps = [...form.querySelectorAll(".booking-step")];
  const indicators = [...document.querySelectorAll("[data-step-indicator]")];
  const dateList = document.querySelector("#date-list");
  const timeList = document.querySelector("#time-list");
  const summaryMotif = document.querySelector("#recap-motif");
  const summaryDay = document.querySelector("#recap-jour");
  const summaryTime = document.querySelector("#recap-heure");
  const successPanel = document.querySelector("#booking-success");
  const successRecap = document.querySelector("#success-recap");
  const nameInput = document.querySelector("#nom-visiteur");
  const phoneInput = document.querySelector("#telephone-visiteur");

  const fullDateLabel = (date) => date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });

  const createDateLabel = (date) => {
    const weekday = date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(/\.$/, "");
    const dayAndMonth = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(/\.$/, "");
    return { weekday, dayAndMonth, full: fullDateLabel(date) };
  };

  const formatTime = (minuteCount) => {
    const hour = Math.floor(minuteCount / 60);
    const minute = minuteCount % 60;
    return `${hour}\u00a0h\u00a0${String(minute).padStart(2, "0")}`;
  };

  const slotsFor = (date, includePast = false) => {
    const ranges = hoursByDay[date.getDay()] || [];
    const now = new Date();
    const sameDate = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const slots = [];

    ranges.forEach(([start, end]) => {
      for (let minute = start; minute < end; minute += 30) {
        const past = sameDate && minute <= currentMinutes;
        if (includePast || !past) slots.push({ minute, past });
      }
    });
    return slots;
  };

  const renderDates = () => {
    if (!dateList) return;
    dateList.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let firstDate = null;

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      if (slotsFor(date).some((slot) => !slot.past) && !firstDate) firstDate = date;

      const label = createDateLabel(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-choice";
      button.setAttribute("aria-label", label.full);
      button.setAttribute("aria-pressed", "false");

      const weekday = document.createElement("span");
      weekday.textContent = label.weekday;
      const dayAndMonth = document.createElement("small");
      dayAndMonth.textContent = label.dayAndMonth;
      button.append(weekday, dayAndMonth);

      button.addEventListener("click", () => {
        state.selectedDate = date;
        state.selectedTime = null;
        dateList.querySelectorAll(".date-choice").forEach((choice) => choice.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        renderTimes();
        updateSummary();
        const error = document.querySelector('[data-error="jour"]');
        if (error) error.textContent = "";
      });
      dateList.append(button);
    }

    state.selectedDate = firstDate;
    if (firstDate) {
      const selected = [...dateList.querySelectorAll(".date-choice")].find((button) => button.getAttribute("aria-label") === createDateLabel(firstDate).full);
      selected?.setAttribute("aria-pressed", "true");
    }
    renderTimes();
    updateSummary();
  };

  const renderTimes = () => {
    if (!timeList) return;
    timeList.replaceChildren();
    if (!state.selectedDate) return;

    const slots = slotsFor(state.selectedDate, true);
    const futureSlots = slots.filter((slot) => !slot.past);
    slots.forEach(({ minute, past }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-choice";
      button.textContent = formatTime(minute);
      button.setAttribute("aria-pressed", "false");
      if (past) {
        button.disabled = true;
        button.classList.add("time-past");
        button.setAttribute("aria-label", `${formatTime(minute)}, heure passée`);
      }
      button.addEventListener("click", () => {
        if (button.disabled) return;
        state.selectedTime = minute;
        timeList.querySelectorAll(".time-choice").forEach((choice) => choice.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        const error = document.querySelector('[data-error="heure"]');
        if (error) error.textContent = "";
        updateSummary();
      });
      timeList.append(button);
    });

    if (!futureSlots.length) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "step-help";
      emptyMessage.textContent = "Aucune heure future ne reste aujourd’hui dans les horaires affichés. Choisissez un autre jour.";
      timeList.append(emptyMessage);
    }
  };

  const updateSummary = () => {
    if (summaryMotif) summaryMotif.textContent = state.motif;
    if (summaryDay) summaryDay.textContent = state.selectedDate ? fullDateLabel(state.selectedDate) : "À choisir";
    if (summaryTime) summaryTime.textContent = state.selectedTime === null ? "À choisir" : formatTime(state.selectedTime);
  };

  const showStep = (nextStep) => {
    const previous = state.currentStep;
    state.currentStep = nextStep;
    steps.forEach((step, index) => {
      if (index === nextStep) {
        step.hidden = false;
        step.dataset.direction = nextStep >= previous ? "avant" : "retour";
        step.classList.add("is-entering");
        requestAnimationFrame(() => requestAnimationFrame(() => step.classList.remove("is-entering")));
      } else {
        step.hidden = true;
        step.classList.remove("is-entering");
      }
    });
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle("step-current", index === nextStep);
      if (index === nextStep) indicator.setAttribute("aria-current", "step");
      else indicator.removeAttribute("aria-current");
    });
    steps[nextStep]?.querySelector("h3")?.focus({ preventScroll: true });
  };

  const clearError = (name) => {
    const error = document.querySelector(`[data-error="${name}"]`);
    if (error) error.textContent = "";
  };

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = state.currentStep;
      if (step === 1 && !state.selectedDate) {
        const error = document.querySelector('[data-error="jour"]');
        if (error) error.textContent = "Choisissez un jour pour continuer.";
        return;
      }
      if (step === 2 && state.selectedTime === null) {
        const error = document.querySelector('[data-error="heure"]');
        if (error) error.textContent = "Choisissez une heure de démonstration pour continuer.";
        return;
      }
      clearError(step === 1 ? "jour" : "heure");
      showStep(Math.min(step + 1, steps.length - 1));
    });
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(Math.max(state.currentStep - 1, 0)));
  });

  const validateName = () => {
    const valid = nameInput.value.trim().length > 0;
    nameInput.setAttribute("aria-invalid", String(!valid));
    document.querySelector("#erreur-nom").textContent = valid ? "" : "Indiquez votre prénom.";
    return valid;
  };

  const validatePhone = () => {
    const compact = phoneInput.value.replace(/[\s().-]/g, "");
    const valid = /^(?:0[67]\d{8}|\+33[67]\d{8}|0033[67]\d{8})$/.test(compact);
    phoneInput.setAttribute("aria-invalid", String(!valid));
    document.querySelector("#erreur-telephone").textContent = valid ? "" : "Saisissez un numéro de mobile français valide.";
    return valid;
  };

  nameInput.addEventListener("input", () => {
    if (nameInput.getAttribute("aria-invalid") === "true") validateName();
  });
  phoneInput.addEventListener("input", () => {
    if (phoneInput.getAttribute("aria-invalid") === "true") validatePhone();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const nameValid = validateName();
    const phoneValid = validatePhone();
    if (!nameValid || !phoneValid) {
      if (!nameValid) nameInput.focus();
      else phoneInput.focus();
      return;
    }
    if (state.selectedTime === null || !state.selectedDate) {
      showStep(state.selectedDate ? 2 : 1);
      return;
    }

    const recap = `${state.motif}, le ${fullDateLabel(state.selectedDate)} à ${formatTime(state.selectedTime)}.`;
    if (successRecap) successRecap.textContent = recap;
    form.hidden = true;
    indicators.forEach((indicator) => indicator.removeAttribute("aria-current"));
    const stepList = document.querySelector(".step-list");
    if (stepList) stepList.hidden = true;
    successPanel.hidden = false;
    successPanel.focus();
  });

  renderDates();

  // Les dates du parcours sont calculées localement; elles ne décrivent aucun créneau réel.
})();
