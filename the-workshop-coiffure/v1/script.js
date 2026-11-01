(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  let keyboard = false;

  root.classList.add("js");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-ready")));
  document.addEventListener("keydown", () => {
    keyboard = true;
    document.body.dataset.input = "keyboard";
    root.dataset.input = "keyboard";
  });
  document.addEventListener("pointerdown", () => {
    keyboard = false;
    document.body.dataset.input = "pointer";
    root.dataset.input = "pointer";
  }, { passive: true });

  const revealElements = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealElements.forEach(element => {
      if (element.dataset.reveal === "row") {
        const siblings = $$(".price-row", element.parentElement);
        element.style.transitionDelay = `${siblings.indexOf(element) % 4 * 60}ms`;
      }
      observer.observe(element);
    });
    reduceMotion.addEventListener("change", event => {
      if (event.matches) {
        observer.disconnect();
        revealElements.forEach(element => element.classList.add("in-view"));
      }
    });
  } else {
    revealElements.forEach(element => element.classList.add("in-view"));
  }

  const studyToggle = $(".study-toggle");
  studyToggle.hidden = false;
  studyToggle.addEventListener("click", () => {
    const art = $(".strand-art");
    const isLight = art.dataset.light !== "true";
    art.dataset.light = String(isLight);
    studyToggle.setAttribute("aria-pressed", String(isLight));
    studyToggle.innerHTML = `${isLight ? "Voir le tracé sombre" : "Éclaircir le tracé"} <span aria-hidden="true">↗</span>`;
  });

  // Toutes les dates et heures du parcours utilisent le fuseau du salon.
  const parisClock = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long"
  });
  const shortWeekday = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
  const shortMonth = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" });
  function parisNow() {
    const parts = Object.fromEntries(parisClock.formatToParts(new Date()).map(part => [part.type, part.value]));
    return { key: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }
  function nextDays() {
    const start = dateFromKey(parisNow().key);
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(date.getUTCDate() + index);
      return { date, key: date.toISOString().slice(0, 10), closed: [0, 3].includes(date.getUTCDay()) };
    });
  }
  function formatTime(minute) {
    const hour = Math.floor(minute / 60);
    const remainder = minute % 60;
    return `${hour}\u00a0h${remainder ? `\u00a0${String(remainder).padStart(2, "0")}` : ""}`;
  }
  function durationLabel(minutes) { return minutes === 60 ? "1\u00a0h" : `${minutes}\u00a0min`; }
  const todayRow = $(`tr[data-weekday="${dateFromKey(parisNow().key).getUTCDay()}"]`);
  if (todayRow) todayRow.classList.add("today");

  const services = {
    "coupe-courts": { name: "Shampoing, coupe et brushing · cheveux courts", duration: 45, price: 44 },
    "coupe-longs": { name: "Shampoing, coupe et brushing · cheveux longs", duration: 60, price: 59 },
    "brushing-courts": { name: "Brushing · cheveux courts", duration: 30, price: 32 },
    "brushing-longs": { name: "Brushing · cheveux longs", duration: 45, price: 44 },
    "coupe-homme": { name: "Shampoing, coupe et coiffage homme · cheveux courts", duration: 30, price: 29 }
  };
  const state = { service: "", day: "", time: null, step: 0, complete: false };
  const form = $("#reservation-form");
  const panels = $$("[data-panel]");
  const stepButtons = $$("[data-step]");
  const headings = ["Choisir une prestation", "Choisir un jour", "Choisir une heure", "Vos coordonnées"];
  const serviceInputs = $$("input[name='prestation']");
  const announcement = $("#booking-announcement");
  $(".booking-workspace").hidden = false;
  $(".selection-sheet").hidden = false;

  function slotsFor(key, duration) {
    const now = parisNow();
    const day = nextDays().find(item => item.key === key);
    if (!day || day.closed) return [];
    const seed = Number(key.replaceAll("-", ""));
    const slots = [];
    for (let minute = 540; minute + duration <= 1140; minute += 30) {
      const past = key < now.key || (key === now.key && minute <= now.minute);
      const taken = (seed + minute / 30) % 5 === 0;
      slots.push({ minute, disabled: past || taken, reason: past ? "Passé" : taken ? "Déjà pris" : "" });
    }
    return slots;
  }
  function clearErrors() {
    $$(".field-error", form).forEach(element => { element.textContent = ""; });
    $$("[aria-invalid]", form).forEach(element => element.removeAttribute("aria-invalid"));
  }
  function summary() {
    const service = services[state.service];
    $("#summary-service").textContent = service ? `${service.name} · ${durationLabel(service.duration)}` : "Une prestation à choisir";
    $("#summary-day").textContent = state.day ? dayFormatter.format(dateFromKey(state.day)) : "Un jour à choisir";
    $("#summary-time").textContent = state.time === null ? "Une heure à choisir" : formatTime(state.time);
    $("#summary-price").textContent = service ? `${service.price}\u00a0€` : "—";
    $("#form-recap").textContent = service && state.day && state.time !== null
      ? `${service.name}. ${dayFormatter.format(dateFromKey(state.day))} à ${formatTime(state.time)}, ${durationLabel(service.duration)}. Tarif indicatif\u00a0: ${service.price}\u00a0€, à confirmer avec le salon.`
      : "";
    let unlocked = 0;
    if (service) unlocked = 1;
    if (state.day && service) unlocked = 2;
    if (state.time !== null && state.day && service) unlocked = 3;
    stepButtons.forEach((button, index) => {
      button.disabled = index > unlocked;
      if (index === state.step) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }
  function showStep(step, moveFocus = true) {
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    state.step = step;
    clearErrors();
    panels.forEach(panel => { panel.hidden = Number(panel.dataset.panel) !== step; });
    $(".step-nav").hidden = step === 4;
    const panel = panels[step];
    panel.classList.remove("entering");
    if (!reduceMotion.matches && !keyboard && moveFocus) {
      panel.classList.add("entering");
      requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove("entering")));
    }
    summary();
    announcement.textContent = step === 4 ? "Simulation terminée. Aucun rendez-vous pris, aucune donnée envoyée." : `Étape ${step + 1} sur 4\u00a0: ${headings[step]}.`;
    if (moveFocus) {
      const title = $("h3", panel);
      title.focus({ preventScroll: true });
      title.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches || keyboard ? "instant" : "smooth" });
    }
  }
  function renderDays() {
    const dayList = $("#day-list");
    dayList.replaceChildren();
    nextDays().forEach(({ date, key, closed }) => {
      const label = document.createElement("label");
      label.className = "date-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "jour";
      input.value = key;
      input.disabled = closed;
      input.checked = key === state.day;
      input.setAttribute("aria-describedby", "days-note day-error");
      input.setAttribute("aria-label", `${dayFormatter.format(date)}${closed ? ", fermé" : ""}`);
      const face = document.createElement("span");
      const weekday = document.createElement("span");
      weekday.textContent = shortWeekday.format(date);
      const number = document.createElement("span");
      number.className = "date-number";
      number.textContent = String(date.getUTCDate());
      const month = document.createElement("span");
      month.textContent = shortMonth.format(date);
      face.append(weekday, number, month);
      if (closed) {
        const status = document.createElement("small");
        status.textContent = date.getUTCDay() === 3 ? "Fermé*" : "Fermé";
        face.append(status);
      }
      label.append(input, face);
      dayList.append(label);
    });
  }
  function renderSlots() {
    const slotList = $("#slot-list");
    slotList.replaceChildren();
    const slots = services[state.service] ? slotsFor(state.day, services[state.service].duration) : [];
    slots.forEach(({ minute, disabled, reason }) => {
      const label = document.createElement("label");
      label.className = "time-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "heure";
      input.value = String(minute);
      input.disabled = disabled;
      input.checked = state.time === minute;
      input.setAttribute("aria-describedby", "slots-note slot-error");
      input.setAttribute("aria-label", `${formatTime(minute)}${reason ? `, ${reason.toLowerCase()}` : ", créneau fictif"}`);
      const face = document.createElement("span");
      const hour = document.createElement("span");
      hour.textContent = formatTime(minute);
      face.append(hour);
      if (reason) {
        const note = document.createElement("small");
        note.textContent = reason;
        face.append(note);
      }
      label.append(input, face);
      slotList.append(label);
    });
    if (!slots.some(slot => !slot.disabled)) {
      const note = document.createElement("p");
      note.className = "caption";
      note.textContent = "Il ne reste aucun créneau d’exemple pour ce jour. Revenez au choix du jour pour en essayer un autre.";
      slotList.append(note);
    }
  }
  function pickService(value) {
    if (!services[value]) return;
    if (state.complete) resetBooking(false);
    if (state.service !== value) {
      state.day = "";
      state.time = null;
    }
    state.service = value;
    serviceInputs.forEach(input => { input.checked = input.value === value; });
    $("#service-error").textContent = "";
    summary();
  }
  function focusRadio(name) {
    const input = $(`input[name='${name}']:checked`, form) || $(`input[name='${name}']:not(:disabled)`, form);
    if (input) input.focus();
  }
  function validDate() {
    return nextDays().some(day => day.key === state.day && !day.closed);
  }
  function validSlot() {
    return services[state.service] && slotsFor(state.day, services[state.service].duration).some(slot => slot.minute === state.time && !slot.disabled);
  }
  serviceInputs.forEach(input => input.addEventListener("change", () => pickService(input.value)));
  $("#day-list").addEventListener("change", event => {
    if (event.target.name !== "jour") return;
    state.day = event.target.value;
    state.time = null;
    $("#day-error").textContent = "";
    summary();
  });
  $("#slot-list").addEventListener("change", event => {
    if (event.target.name !== "heure") return;
    state.time = Number(event.target.value);
    $("#slot-error").textContent = "";
    summary();
  });
  $$("[data-next]").forEach(button => button.addEventListener("click", () => {
    const target = Number(button.dataset.next);
    if (target === 1 && !services[state.service]) {
      $("#service-error").textContent = "Choisissez une prestation pour poursuivre cet essai.";
      focusRadio("prestation");
      return;
    }
    if (target === 2 && !validDate()) {
      $("#day-error").textContent = "Choisissez un jour proposé hors des jours de fermeture.";
      focusRadio("jour");
      return;
    }
    if (target === 3 && !validSlot()) {
      state.time = null;
      renderSlots();
      summary();
      $("#slot-error").textContent = "Choisissez un créneau disponible pour cet exemple.";
      focusRadio("heure");
      return;
    }
    showStep(target);
  }));
  $$("[data-back]").forEach(button => button.addEventListener("click", () => showStep(Number(button.dataset.back))));
  stepButtons.forEach(button => button.addEventListener("click", () => showStep(Number(button.dataset.step))));
  $$("[data-service]").forEach(link => link.addEventListener("click", event => {
    event.preventDefault();
    pickService(link.dataset.service);
    showStep(1);
  }));
  function checkName() {
    const input = $("#prenom");
    const valid = /\p{L}/u.test(input.value.trim()) && input.value.trim().length <= 60;
    $("#name-error").textContent = valid ? "" : "Indiquez un prénom, même fictif, pour essayer la confirmation.";
    input.setAttribute("aria-invalid", String(!valid));
    return valid;
  }
  function checkPhone() {
    const input = $("#telephone");
    const normalized = input.value.replace(/[\s.()-]/g, "");
    const valid = /^(?:0[67]\d{8}|(?:\+33|0033)[67]\d{8})$/.test(normalized);
    $("#phone-error").textContent = valid ? "" : "Saisissez 10 chiffres commençant par 06 ou 07, ou le même numéro avec +33.";
    input.setAttribute("aria-invalid", String(!valid));
    return valid;
  }
  $("#prenom").addEventListener("blur", checkName);
  $("#telephone").addEventListener("blur", checkPhone);
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (state.step !== 3) return;
    const nameValid = checkName();
    const phoneValid = checkPhone();
    if (!nameValid || !phoneValid) {
      $(!nameValid ? "#prenom" : "#telephone").focus();
      return;
    }
    // Le créneau est contrôlé à nouveau : une heure peut être passée depuis la sélection.
    if (!validDate() || !validSlot()) {
      state.time = null;
      if (!validDate()) {
        state.day = "";
        showStep(1);
        $("#day-error").textContent = "La date n’est plus proposée. Choisissez un autre jour pour cet essai.";
      } else {
        showStep(2);
        $("#slot-error").textContent = "Ce créneau est passé. Choisissez une autre heure pour cet essai.";
      }
      return;
    }
    const service = services[state.service];
    $("#success-recap").textContent = `Votre exemple\u00a0: ${service.name}, ${dayFormatter.format(dateFromKey(state.day))} à ${formatTime(state.time)}. Durée\u00a0: ${durationLabel(service.duration)}. Tarif indicatif\u00a0: ${service.price}\u00a0€, à confirmer avec le salon.`;
    $("#prenom").value = "";
    $("#telephone").value = "";
    state.complete = true;
    showStep(4);
  });
  function resetBooking(moveFocus = true) {
    state.service = "";
    state.day = "";
    state.time = null;
    state.complete = false;
    form.reset();
    $("#success-recap").textContent = "";
    showStep(0, moveFocus);
  }
  $(".restart").addEventListener("click", () => resetBooking());
  showStep(0, false);
})();
