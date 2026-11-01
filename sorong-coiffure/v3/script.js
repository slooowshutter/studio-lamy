(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const services = {
    coupe: { name: "Forfait coupe homme", duration: 30, price: 28 },
    degrade: { name: "Dégradé à blanc rasoir", duration: 30, price: 30 },
    crane: { name: "Rasage du crâne", duration: 30, price: 30 },
    barbe: { name: "Taille de barbe à la tondeuse", duration: 30, price: 16 },
    "coupe-barbe": { name: "Forfait coupe + barbe", duration: 60, price: 44 }
  };

  const hours = {
    0: null,
    1: null,
    2: { open: 9 * 60, close: 19 * 60 },
    3: { open: 9 * 60, close: 19 * 60 },
    4: { open: 9 * 60, close: 19 * 60 },
    5: { open: 9 * 60, close: 19 * 60 },
    6: { open: 9 * 60, close: 18 * 60 + 30 }
  };

  const state = {
    service: null,
    date: null,
    time: null,
    currentStep: 1,
    confirmed: false,
    transitionTimer: null
  };

  const form = document.querySelector("#booking-form");
  const panels = [...document.querySelectorAll(".booking-step")];
  const stepButtons = [...document.querySelectorAll(".booking-steps [data-goto]")];
  const dateOptions = document.querySelector("#date-options");
  const slotOptions = document.querySelector("#slot-options");
  const summaryService = document.querySelector("#summary-service");
  const summaryDuration = document.querySelector("#summary-duration");
  const summaryDay = document.querySelector("#summary-day");
  const summaryTime = document.querySelector("#summary-time");
  const summaryPrice = document.querySelector("#summary-price");
  const slotDayLabel = document.querySelector("#slot-day-label");
  const bookingStatus = document.querySelector("#booking-status");
  const confirmationRecap = document.querySelector("#confirmation-recap");
  const firstName = document.querySelector("#first-name");
  const phone = document.querySelector("#phone");
  const nameError = document.querySelector("#name-error");
  const phoneError = document.querySelector("#phone-error");
  const serviceError = document.querySelector("#service-error");
  const dateError = document.querySelector("#date-error");
  const slotError = document.querySelector("#slot-error");

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function dateFromKey(key) {
    const parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12);
  }

  function formatDate(key, options = { weekday: "long", day: "numeric", month: "long" }) {
    return new Intl.DateTimeFormat("fr-FR", options).format(dateFromKey(key));
  }

  function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return String(hour).padStart(2, "0") + "\u00a0h\u00a0" + String(minute).padStart(2, "0");
  }

  function money(price) {
    return String(price) + "\u00a0€";
  }

  function setError(element, message) {
    element.textContent = message;
  }

  function updateSummary() {
    summaryService.textContent = state.service ? state.service.name : "Pas encore de prestation";
    summaryDuration.textContent = state.service ? state.service.duration + "\u00a0min" : "—";
    summaryDay.textContent = state.date ? formatDate(state.date) : "À choisir";
    summaryTime.textContent = state.time || "À choisir";
    summaryPrice.textContent = state.service ? money(state.service.price) : "—";
  }

  function canVisitStep(step) {
    if (step === 1) return true;
    if (step === 2) return Boolean(state.service);
    if (step === 3) return Boolean(state.service && state.date);
    if (step === 4) return Boolean(state.service && state.date && state.time);
    if (step === 5) return state.confirmed;
    return false;
  }

  function refreshStepNavigation() {
    for (const button of stepButtons) {
      const step = Number(button.dataset.goto);
      button.disabled = !canVisitStep(step);
      if (step === state.currentStep) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
  }

  function showStep(step, focusHeading = true) {
    if (!canVisitStep(step) || step < 1 || step > panels.length) return;
    if (state.transitionTimer) window.clearTimeout(state.transitionTimer);

    const nextPanel = panels.find((panel) => Number(panel.dataset.step) === step);
    const previousPanel = panels.find((panel) => Number(panel.dataset.step) === state.currentStep);
    if (!nextPanel) return;
    if (state.currentStep === step && !nextPanel.hidden) return;

    state.currentStep = step;
    nextPanel.hidden = false;
    nextPanel.inert = false;
    nextPanel.classList.remove("is-leaving");
    nextPanel.classList.add("is-entering");

    if (previousPanel && previousPanel !== nextPanel) {
      previousPanel.inert = true;
      previousPanel.classList.remove("is-active");
      previousPanel.classList.add("is-leaving");
    }

    refreshStepNavigation();
    bookingStatus.textContent = "Étape " + step + " sur " + panels.length + " : " + nextPanel.querySelector("h3").textContent;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        nextPanel.classList.remove("is-entering");
        nextPanel.classList.add("is-active");
      });
    });

    const finish = () => {
      for (const panel of panels) {
        if (panel !== nextPanel) {
          panel.hidden = true;
          panel.inert = true;
          panel.classList.remove("is-active", "is-leaving", "is-entering");
        }
      }
      nextPanel.inert = false;
      if (focusHeading) nextPanel.querySelector("h3").focus({ preventScroll: true });
      state.transitionTimer = null;
    };
    state.transitionTimer = window.setTimeout(finish, reduceMotion ? 0 : 235);
  }

  function renderDates() {
    dateOptions.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const key = localDateKey(date);
      const open = hours[date.getDay()];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-option";
      button.dataset.date = key;
      button.setAttribute("aria-pressed", String(state.date === key));
      button.setAttribute("aria-label", formatDate(key) + (open ? "" : ", fermé"));
      button.setAttribute("aria-describedby", "date-error");
      button.disabled = !open;

      const weekday = document.createElement("span");
      weekday.className = "date-weekday";
      weekday.textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "");
      const number = document.createElement("span");
      number.className = "date-number";
      number.textContent = String(date.getDate());
      const month = document.createElement("span");
      month.className = "date-month";
      month.textContent = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(".", "");

      button.append(weekday, number, month);
      if (!open) {
        const closed = document.createElement("span");
        closed.className = "date-closed";
        closed.textContent = "fermé";
        button.append(closed);
      }
      button.addEventListener("click", () => selectDate(key));
      dateOptions.append(button);
    }
  }

  function updateDateSelection() {
    dateOptions.querySelectorAll("[data-date]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.date === state.date));
    });
  }

  function updateSlotSelection() {
    slotOptions.querySelectorAll("[data-time]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.time === state.time));
    });
  }

  function deterministicNumber(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      value ^= text.charCodeAt(i);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function isPastSlot(dateKey, minutes) {
    if (dateKey !== localDateKey(new Date())) return false;
    const now = new Date();
    return minutes <= now.getHours() * 60 + now.getMinutes();
  }

  function renderSlots() {
    slotOptions.replaceChildren();
    if (!state.date || !state.service) return;

    const day = dateFromKey(state.date);
    const opening = hours[day.getDay()];
    slotDayLabel.textContent = "Créneaux de démonstration pour " + formatDate(state.date) + " · disponibilité réelle à confirmer.";
    if (!opening) return;

    let index = 0;
    let availableCount = 0;
    for (let minutes = opening.open; minutes + state.service.duration <= opening.close; minutes += 30) {
      const time = formatTime(minutes);
      const past = isPastSlot(state.date, minutes);
      const busy = index > 1 && deterministicNumber(state.date + "-" + state.service.id + "-" + minutes) % 5 === 0;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot-option";
      button.dataset.time = time;
      button.setAttribute("aria-pressed", String(state.time === time));
      button.setAttribute("aria-describedby", "slot-error");

      const timeLabel = document.createElement("span");
      timeLabel.className = "slot-time";
      timeLabel.textContent = time;
      button.append(timeLabel);

      if (busy) {
        button.disabled = true;
        button.dataset.busy = "true";
        button.setAttribute("aria-label", time + ", déjà pris dans cette simulation");
        const busyLabel = document.createElement("small");
        busyLabel.textContent = "déjà pris";
        button.append(busyLabel);
      } else if (past) {
        button.disabled = true;
        button.dataset.past = "true";
        button.setAttribute("aria-label", time + ", horaire passé");
        const pastLabel = document.createElement("small");
        pastLabel.textContent = "passé";
        button.append(pastLabel);
      } else {
        availableCount += 1;
        button.addEventListener("click", () => selectTime(time));
      }

      slotOptions.append(button);
      index += 1;
    }

    if (availableCount === 0) {
      const empty = document.createElement("p");
      empty.className = "no-slots";
      empty.textContent = "Aucun créneau de démonstration disponible ce jour-là. Choisissez une autre date.";
      slotOptions.append(empty);
    }
  }

  function selectService(id) {
    const selected = services[id];
    if (!selected) return;
    if (state.service && state.service.id !== id) {
      state.date = null;
      state.time = null;
      state.confirmed = false;
    }
    state.service = Object.assign({}, selected, { id: id });
    form.querySelectorAll('input[name="service"]').forEach((input) => {
      input.checked = input.value === id;
    });
    setError(serviceError, "");
    setError(dateError, "");
    setError(slotError, "");
    updateSummary();
    renderDates();
    refreshStepNavigation();
  }

  function selectDate(key) {
    const date = dateFromKey(key);
    if (!hours[date.getDay()]) return;
    state.date = key;
    state.time = null;
    state.confirmed = false;
    setError(dateError, "");
    setError(slotError, "");
    updateSummary();
    updateDateSelection();
    renderSlots();
    refreshStepNavigation();
  }

  function selectTime(time) {
    state.time = time;
    state.confirmed = false;
    setError(slotError, "");
    updateSummary();
    updateSlotSelection();
    refreshStepNavigation();
  }

  form.querySelectorAll('input[name="service"]').forEach((input) => {
    input.addEventListener("change", () => selectService(input.value));
  });

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = state.currentStep;
      if (current === 1 && !state.service) {
        setError(serviceError, "Choisissez une prestation pour continuer.");
        return;
      }
      if (current === 2 && !state.date) {
        setError(dateError, "Choisissez un jour où le salon est ouvert.");
        return;
      }
      if (current === 3 && !state.time) {
        setError(slotError, "Choisissez un horaire de démonstration.");
        return;
      }
      showStep(current + 1);
    });
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showStep(Math.max(1, state.currentStep - 1)));
  });

  stepButtons.forEach((button) => {
    button.addEventListener("click", () => showStep(Number(button.dataset.goto)));
  });

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.dataset.service;
      if (!services[id]) return;
      event.preventDefault();
      selectService(id);
      showStep(1, false);
      document.querySelector("#reservation").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      window.setTimeout(() => document.querySelector("#step-title-1").focus({ preventScroll: true }), reduceMotion ? 0 : 280);
    });
  });

  function setFieldError(input, errorElement, message) {
    input.setAttribute("aria-invalid", String(Boolean(message)));
    setError(errorElement, message);
  }

  firstName.addEventListener("input", () => setFieldError(firstName, nameError, ""));
  phone.addEventListener("input", () => setFieldError(phone, phoneError, ""));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.currentStep !== 4) return;

    const name = firstName.value.trim();
    const normalizedPhone = phone.value.replace(/[\s().-]/g, "").replace(/^\+33/, "0").replace(/^0033/, "0");
    const validName = name.length > 0;
    const validPhone = /^0[67]\d{8}$/.test(normalizedPhone);
    setFieldError(firstName, nameError, validName ? "" : "Indiquez votre prénom.");
    setFieldError(phone, phoneError, validPhone ? "" : "Saisissez un numéro mobile français valide.");

    if (!validName || !validPhone) {
      (validName ? phone : firstName).focus();
      return;
    }

    state.confirmed = true;
    const serviceText = state.service
      ? state.service.name + ", " + state.service.duration + "\u00a0minutes, " + money(state.service.price)
      : "";
    confirmationRecap.textContent = name + ", votre aperçu concerne " + serviceText + ", le " + formatDate(state.date) + " à " + state.time + ".";
    updateSummary();
    showStep(5);
  });

  document.querySelector("#reset-booking").addEventListener("click", () => {
    form.reset();
    state.service = null;
    state.date = null;
    state.time = null;
    state.currentStep = 5;
    state.confirmed = false;
    updateSummary();
    renderDates();
    slotOptions.replaceChildren();
    showStep(1);
  });

  function observeReveals() {
    const reveals = document.querySelectorAll(".reveal");
    const drawings = document.querySelectorAll(".draw-path");
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((element) => element.classList.add("is-visible"));
      drawings.forEach((path) => path.classList.add("is-drawn"));
      return;
    }
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(entry.target.classList.contains("draw-path") ? "is-drawn" : "is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach((element) => observer.observe(element));
    drawings.forEach((path) => observer.observe(path));
  }

  panels.forEach((panel) => {
    const active = Number(panel.dataset.step) === 1;
    panel.hidden = !active;
    panel.inert = !active;
    if (active) panel.classList.add("is-active");
  });
  renderDates();
  updateSummary();
  refreshStepNavigation();
  bookingStatus.textContent = "Étape 1 sur " + panels.length + " : " + panels[0].querySelector("h3").textContent;
  observeReveals();
  requestAnimationFrame(() => root.classList.add("is-loaded"));
})();
