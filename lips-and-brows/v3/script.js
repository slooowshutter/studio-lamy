(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const prefersLessMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileView = window.matchMedia("(max-width: 760px)");
  const nav = document.getElementById("navigation-principale");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileBar = document.querySelector(".mobile-bar");

  function setMobileBarHidden(hidden) {
    const shouldHide = hidden && mobileView.matches;
    document.body.classList.toggle("is-form-focused", shouldHide);
    mobileBar.inert = shouldHide;
    mobileBar.setAttribute("aria-hidden", String(shouldHide));
  }

  function setNavigationForViewport() {
    const narrow = mobileView.matches;
    menuButton.hidden = !narrow;
    nav.hidden = narrow;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Ouvrir la navigation");
    if (!narrow) setMobileBarHidden(false);
  }

  setNavigationForViewport();
  mobileView.addEventListener("change", setNavigationForViewport);

  menuButton.addEventListener("click", () => {
    const opening = nav.hidden;
    nav.hidden = !opening;
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute("aria-label", opening ? "Fermer la navigation" : "Ouvrir la navigation");
    if (opening) nav.querySelector("a")?.focus();
    else menuButton.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileView.matches && !nav.hidden) {
      nav.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Ouvrir la navigation");
      menuButton.focus();
    }
  });

  nav.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && mobileView.matches) {
      nav.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Ouvrir la navigation");
      const destination = document.getElementById(link.getAttribute("href").slice(1));
      const heading = destination?.matches("h1, h2, h3") ? destination : destination?.querySelector("h1, h2, h3");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      } else {
        menuButton.focus();
      }
    }
  });

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        if (entry.target.classList.contains("street-marker")) entry.target.classList.add("is-drawn");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -34px 0px" });

    document.querySelectorAll("[data-reveal]").forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 42}ms`;
      revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
    document.querySelector(".street-marker")?.classList.add("is-drawn");
  }

  const browMark = document.querySelector(".brow-mark");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => browMark?.classList.add("is-drawn"));
  });

  const hoursByDay = {
    0: null,
    1: { open: 9 * 60, close: 19 * 60 },
    2: { open: 9 * 60, close: 17 * 60 },
    3: { open: 8 * 60 + 30, close: 19 * 60 },
    4: { open: 9 * 60, close: 18 * 60 },
    5: { open: 9 * 60, close: 19 * 60 },
    6: { open: 9 * 60, close: 17 * 60 }
  };

  const panelNames = ["prestation", "jour", "heure", "coordonnees", "confirmation"];
  const panelTitles = {
    prestation: "La prestation",
    jour: "Le jour",
    heure: "L’heure",
    coordonnees: "Vos coordonnées",
    confirmation: "La confirmation simulée"
  };
  const state = { service: null, date: null, time: null, name: "", phone: "" };
  const panels = new Map([...document.querySelectorAll("[data-step-panel]")].map((panel) => [panel.dataset.stepPanel, panel]));
  const progress = document.getElementById("booking-progress");
  const announcement = document.getElementById("booking-announcement");
  const dayOptions = document.getElementById("day-options");
  const timeOptions = document.getElementById("time-options");
  const dayNext = document.querySelector('[data-next="heure"]');
  const timeNext = document.querySelector('[data-next="coordonnees"]');
  let activePanel = "prestation";
  let panelChange = 0;

  const summaryFields = {
    prestation: document.getElementById("summary-service"),
    jour: document.getElementById("summary-day"),
    heure: document.getElementById("summary-time"),
    coordonnees: document.getElementById("summary-contact")
  };

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatTime(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, "0")}\u00a0h\u00a0${String(minute).padStart(2, "0")}`;
  }

  function formatDay(date, options = { weekday: "long", day: "numeric", month: "long" }) {
    return new Intl.DateTimeFormat("fr-FR", options).format(date);
  }

  function setSummary(field, value, editName) {
    const target = summaryFields[field];
    if (target) target.textContent = value || "À choisir";
    const editButton = document.querySelector(`[data-edit="${editName || field}"]`);
    if (editButton) editButton.hidden = !value;
  }

  function announce(message) {
    announcement.textContent = "";
    window.requestAnimationFrame(() => { announcement.textContent = message; });
  }

  function updateProgress(panelName) {
    const visibleIndex = panelName === "confirmation" ? 4 : panelNames.indexOf(panelName) + 1;
    progress.textContent = `Étape ${visibleIndex} sur 4`;
  }

  function changePanel(panelName) {
    const nextPanel = panels.get(panelName);
    if (!nextPanel || panelName === activePanel) return;

    for (const [name, panel] of panels) {
      if (name !== activePanel && name !== panelName) {
        panel.hidden = true;
        panel.classList.remove("is-entering", "is-leaving");
      }
    }

    const previousPanel = panels.get(activePanel);
    const changeId = ++panelChange;
    previousPanel?.classList.add("is-leaving");
    nextPanel.hidden = false;
    nextPanel.classList.add("is-entering");
    activePanel = panelName;
    updateProgress(panelName);

    window.requestAnimationFrame(() => {
      nextPanel.classList.remove("is-entering");
      nextPanel.querySelector(".flow-heading")?.focus({ preventScroll: true });
    });
    window.setTimeout(() => {
      if (changeId !== panelChange) return;
      if (previousPanel) {
        previousPanel.hidden = true;
        previousPanel.classList.remove("is-leaving");
      }
    }, prefersLessMotion.matches ? 30 : 250);

    const stepLabel = panelTitles[panelName] || "la confirmation";
    announce(`Étape ${panelName === "confirmation" ? "finale" : panelNames.indexOf(panelName) + 1} : ${stepLabel}.`);
    if (panelName === "coordonnees") updateConfirmationRecap();
  }

  function clearTimeSelection() {
    state.time = null;
    setSummary("heure", "");
    timeNext.disabled = true;
    document.getElementById("time-error").hidden = true;
    timeOptions.replaceChildren();
  }

  function selectService(input) {
    state.service = {
      id: input.value,
      name: input.dataset.name,
      duration: Number(input.dataset.duration),
      price: Number(input.dataset.price)
    };
    state.date = null;
    clearTimeSelection();
    setSummary("prestation", state.service.name, "prestation");
    setSummary("jour", "");
    document.querySelector('[data-next="jour"]').disabled = false;
    dayNext.disabled = true;
    renderDays();
    announce(`${state.service.name} sélectionné. Durée : ${state.service.duration} minutes. Tarif Planity à confirmer : ${formatPrice(state.service.price)}.`);
  }

  function formatPrice(price) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);
  }

  function dayNameShort(date) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "");
  }

  function renderDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dayOptions.replaceChildren();

    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const closed = !hoursByDay[date.getDay()];
      const selected = state.date && dateKey(state.date) === dateKey(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `day-option${selected ? " is-selected" : ""}`;
      button.disabled = closed;
      button.setAttribute("aria-pressed", String(Boolean(selected)));
      button.setAttribute("aria-label", `${formatDay(date)}${closed ? ", fermé" : ", jour disponible dans cette simulation"}`);

      const weekday = document.createElement("span");
      weekday.className = "day-name";
      weekday.textContent = dayNameShort(date);
      const dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = String(date.getDate());
      button.append(weekday, dayNumber);

      if (closed) {
        const stateLabel = document.createElement("span");
        stateLabel.className = "day-state";
        stateLabel.textContent = "Fermé";
        button.append(stateLabel);
      }

      button.addEventListener("click", () => {
        state.date = date;
        setSummary("jour", formatDay(date), "jour");
        clearTimeSelection();
        dayNext.disabled = false;
        dayOptions.querySelectorAll(".day-option").forEach((other) => {
          const isChosen = other === button;
          other.classList.toggle("is-selected", isChosen);
          other.setAttribute("aria-pressed", String(isChosen));
        });
        document.getElementById("day-error").hidden = true;
        announce(`${formatDay(date)} sélectionné.`);
      });

      dayOptions.append(button);
    }
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function renderTimes() {
    const previousTime = state.time;
    clearTimeSelection();
    if (!state.date || !state.service) return;

    const hours = hoursByDay[state.date.getDay()];
    if (!hours) return;
    document.getElementById("slot-day-label").textContent = `${formatDay(state.date)} · durée ${state.service.duration} min · horaires indiqués par Planity, à confirmer.`;

    const now = new Date();
    const todayKey = dateKey(now);
    const sameDay = todayKey === dateKey(state.date);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let minute = hours.open; minute + state.service.duration <= hours.close; minute += 30) {
      const isPast = sameDay && minute <= currentMinutes;
      const taken = hashString(`${dateKey(state.date)}:${minute}:${state.service.id}`) % 5 === 1;
      const selected = minute === previousTime && !isPast && !taken;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `time-option${selected ? " is-selected" : ""}`;
      const timeLabel = document.createElement("span");
      timeLabel.className = "slot-time";
      timeLabel.textContent = formatTime(minute);
      button.append(timeLabel);
      if (isPast || taken) {
        const stateLabel = document.createElement("span");
        stateLabel.className = "slot-status";
        stateLabel.textContent = isPast ? "Passée" : "Déjà pris";
        button.append(stateLabel);
      }
      button.disabled = isPast || taken;
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", `${formatTime(minute)}, ${isPast ? "heure passée" : taken ? "pris dans cet exemple" : "disponible dans cette simulation"}`);
      if (taken && !isPast) {
        button.title = "Indisponible dans cet exemple";
        button.classList.add("is-taken");
      }

      if (selected) {
        state.time = minute;
        setSummary("heure", formatTime(minute), "heure");
        timeNext.disabled = false;
      }

      button.addEventListener("click", () => {
        state.time = minute;
        setSummary("heure", formatTime(minute), "heure");
        timeNext.disabled = false;
        timeOptions.querySelectorAll(".time-option").forEach((other) => {
          const isChosen = other === button;
          other.classList.toggle("is-selected", isChosen);
          other.setAttribute("aria-pressed", String(isChosen));
        });
        document.getElementById("time-error").hidden = true;
        announce(`${formatTime(minute)} sélectionné dans cette simulation.`);
      });

      timeOptions.append(button);
    }
  }

  function updateConfirmationRecap() {
    const recap = document.getElementById("confirmation-recap");
    if (!state.service || !state.date || state.time === null) return;
    const lines = [
      ["Prestation", state.service.name],
      ["Jour", formatDay(state.date)],
      ["Heure", formatTime(state.time)],
      ["Tarif Planity à confirmer", formatPrice(state.service.price)]
    ];
    recap.replaceChildren(...lines.map(([label, value]) => {
      const line = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label} : `;
      line.append(strong, document.createTextNode(value));
      return line;
    }));
  }

  document.querySelectorAll('input[name="service"]').forEach((input) => {
    input.addEventListener("change", () => selectService(input));
  });

  document.querySelectorAll("[data-next]").forEach((button) => {
    button.addEventListener("click", () => {
      const destination = button.dataset.next;
      if (destination === "jour" && !state.service) return;
      if (destination === "heure" && !state.date) {
        document.getElementById("day-error").hidden = false;
        return;
      }
      if (destination === "coordonnees" && state.time === null) {
        document.getElementById("time-error").hidden = false;
        return;
      }
      if (destination === "heure") renderTimes();
      changePanel(destination);
    });
  });

  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const destination = button.dataset.edit;
      if (destination === "heure") renderTimes();
      changePanel(destination);
    });
  });

  document.querySelectorAll("[data-preset]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const input = document.querySelector(`input[name="service"][value="${link.dataset.preset}"]`);
      if (!input) return;
      input.checked = true;
      selectService(input);
      changePanel("jour");
      document.getElementById("reserver").scrollIntoView({ block: "start" });
    });
  });

  const bookingName = document.getElementById("booking-name");
  const bookingPhone = document.getElementById("booking-phone");
  const nameError = document.getElementById("name-error");
  const phoneError = document.getElementById("phone-error");
  const bookingForm = document.getElementById("booking-form");

  bookingForm.addEventListener("focusin", () => setMobileBarHidden(true));
  bookingForm.addEventListener("focusout", () => {
    window.requestAnimationFrame(() => setMobileBarHidden(bookingForm.contains(document.activeElement)));
  });

  bookingName.addEventListener("input", () => {
    if (bookingName.value.trim()) {
      nameError.hidden = true;
      bookingName.removeAttribute("aria-invalid");
    }
  });

  bookingPhone.addEventListener("input", () => {
    const digits = bookingPhone.value.replace(/\D/g, "");
    if (/^(?:0[67]\d{8}|33[67]\d{8})$/.test(digits)) {
      phoneError.hidden = true;
      bookingPhone.removeAttribute("aria-invalid");
    }
  });

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const cleanName = bookingName.value.trim();
    const digits = bookingPhone.value.replace(/\D/g, "");
    const validPhone = /^(?:0[67]\d{8}|33[67]\d{8})$/.test(digits);
    const invalidName = cleanName.length === 0;

    nameError.hidden = !invalidName;
    phoneError.hidden = validPhone;
    if (invalidName) bookingName.setAttribute("aria-invalid", "true");
    else bookingName.removeAttribute("aria-invalid");
    if (!validPhone) bookingPhone.setAttribute("aria-invalid", "true");
    else bookingPhone.removeAttribute("aria-invalid");

    if (invalidName) {
      bookingName.focus();
      return;
    }
    if (!validPhone) {
      bookingPhone.focus();
      return;
    }

    state.name = cleanName;
    state.phone = bookingPhone.value.trim();
    setSummary("coordonnees", cleanName, "coordonnees");
    const success = document.getElementById("success-copy");
    success.textContent = `${cleanName}, votre sélection d’exemple porte sur ${state.service.name}, le ${formatDay(state.date)} à ${formatTime(state.time)}. Le tarif Planity à confirmer est de ${formatPrice(state.service.price)}.`;
    changePanel("confirmation");
  });

  renderDays();
})();
