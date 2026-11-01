"use strict";

const SERVICES = [
  { id: "coupe-femme", name: "Coupe femme" },
  { id: "coupe-homme", name: "Coupe homme" },
  { id: "brushing", name: "Brushing" },
  { id: "coloration", name: "Coloration" }
];

function parisClock(instant = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(instant);
  const part = type => parts.find(value => value.type === type).value;
  return {
    key: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute"))
  };
}

function daysAhead(clock = parisClock()) {
  const base = new Date(`${clock.key}T12:00:00Z`);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key, number: date.getUTCDate(),
      weekday: date.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" }),
      month: date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }),
      closed: [0, 1].includes(date.getUTCDay()), today: index === 0
    };
  });
}

function timeLabel(minutes) {
  return `${Math.floor(minutes / 60)}\u00a0h\u00a0${String(minutes % 60).padStart(2, "0")}`;
}

function dateLabel(key, options = {}) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC", ...options
  });
}

function slotsFor(key, service, clock = parisClock()) {
  if (!key || !service) return [];
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
  if (!service || [0, 1].includes(weekday) || key < clock.key) return [];
  const seed = Number(key.replaceAll("-", ""));
  const result = [];
  for (let start = 600; start < (weekday === 6 ? 1065 : 1140); start += 30) {
    const past = key === clock.key && start <= clock.minutes;
    const taken = (seed + start / 30) % 6 === 0;
    result.push({ start, disabled: past || taken, reason: past ? "Passé" : taken ? "Déjà pris" : "Disponible" });
  }
  return result;
}

function validMobile(value) {
  return /^(?:0|\+33|0033)[67]\d{8}$/.test(value.replace(/[\s().-]/g, ""));
}

function escapeCalendar(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  const result = [];
  let part = "";
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      result.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += size;
  }
  result.push(part);
  return result.join("\r\n");
}

function calendarText(key, minutes, service, now = new Date()) {
  const compact = key.replaceAll("-", "");
  const local = value => `${compact}T${String(Math.floor(value / 60)).padStart(2, "0")}${String(value % 60).padStart(2, "0")}00`;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Studio Lamy//Exemple de rendez-vous//FR", "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE", "TZID:Europe/Paris",
    "BEGIN:DAYLIGHT", "DTSTART:19700329T020000", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "DTSTART:19701025T030000", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD", "END:VTIMEZONE",
    "BEGIN:VEVENT", `UID:exemple-${compact}-${minutes}@studiolamy.local`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;TZID=Europe/Paris:${local(minutes)}`,
    `SUMMARY:${escapeCalendar(`SIMULATION — ${service.name} — Hair Show Coiffure`)}`,
    `LOCATION:${escapeCalendar("7 rue des Filatiers, 31000 Toulouse")}`,
    `DESCRIPTION:${escapeCalendar("EXEMPLE\u00a0: aucun rendez-vous réservé. Aucun message envoyé au salon. Tarifs et horaires à confirmer auprès du salon. Pour un vrai rendez-vous\u00a0: 05 32 59 40 18.")}`,
    "STATUS:TENTATIVE", "END:VEVENT", "END:VCALENDAR", ""
  ].map(foldCalendarLine).join("\r\n");
}

function initPage() {
  const root = document.documentElement;
  root.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let keyboard = false;
  document.addEventListener("keydown", event => {
    if (["Tab", "Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      keyboard = true;
      root.classList.add("keyboard-use");
    }
  });
  document.addEventListener("pointerdown", () => {
    keyboard = false;
    root.classList.remove("keyboard-use");
  }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-ready")));
  const reveals = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    reveals.forEach(element => observer.observe(element));
  } else {
    reveals.forEach(element => element.classList.add("is-visible"));
  }

  const get = id => document.getElementById(id);
  const state = { step: 0, reached: 0, service: null, day: null, time: null, success: false };
  const panels = [...document.querySelectorAll("[data-panel]")];
  const stepButtons = [...document.querySelectorAll("[data-step]")];
  const form = get("booking-form");
  const announcement = get("booking-announcement");
  const error = get("booking-error");
  const next = get("next-step");
  const back = get("back-step");
  let transitionFrame;
  get("booking-app").hidden = false;

  function announce(message) { announcement.textContent = message; }

  function radioOption(container, name, value, label, disabled, checked, className) {
    const row = document.createElement("label");
    row.className = className;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.disabled = disabled;
    input.checked = checked;
    input.setAttribute("aria-label", label);
    row.append(input);
    container.append(row);
    return row;
  }

  function addText(parent, tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    parent.append(element);
    return element;
  }

  function renderDays() {
    const container = get("day-options");
    container.replaceChildren();
    daysAhead().forEach(day => {
      const label = `${dateLabel(day.key)}, ${day.closed ? "fermé" : "horaires à confirmer"}`;
      const row = radioOption(container, "jour", day.key, label, day.closed, state.day === day.key, "day-option");
      addText(row, "span", day.weekday);
      addText(row, "strong", String(day.number));
      addText(row, "small", day.closed ? "Fermé" : day.today ? "Aujourd’hui" : day.month);
    });
  }

  function renderSlots() {
    const container = get("slot-options");
    container.replaceChildren();
    if (!state.day || !state.service) return;
    get("slot-context").textContent = `${dateLabel(state.day)} · créneaux fictifs, horaires à confirmer.`;
    const slots = slotsFor(state.day, state.service);
    slots.forEach(slot => {
      const row = radioOption(container, "heure", String(slot.start), `${timeLabel(slot.start)}, ${slot.reason.toLowerCase()}`, slot.disabled, state.time === slot.start, "slot-option");
      addText(row, "span", timeLabel(slot.start));
      if (slot.disabled) addText(row, "small", slot.reason);
    });
    if (!slots.some(slot => !slot.disabled)) addText(container, "p", "Plus de créneau d’exemple ce jour-là. Choisissez un autre jour avec Retour.");
  }

  function makeRecap(container) {
    container.replaceChildren();
    if (!state.service || !state.day || state.time === null) return;
    addText(container, "p", state.service.name);
    addText(container, "p", `${dateLabel(state.day, { year: "numeric" })} à ${timeLabel(state.time)}`);
  }

  function updateSummary() {
    syncStepButtons();
    const date = get("summary-date");
    if (state.day) {
      date.replaceChildren();
      addText(date, "span", dateLabel(state.day, { weekday: undefined, month: "long" }));
      date.append(document.createElement("br"));
      addText(date, "em", dateLabel(state.day, { weekday: "long", day: undefined, month: undefined }));
    } else {
      date.innerHTML = "Votre date<br><em>reste à choisir.</em>";
    }
    get("summary-service").textContent = state.service ? state.service.name : "À choisir";
    get("summary-time").textContent = state.time !== null ? timeLabel(state.time) : "À choisir";
    const compact = [
      state.service ? state.service.name : "Prestation à choisir",
      state.day ? dateLabel(state.day) : "jour à choisir",
      state.time !== null ? timeLabel(state.time) : "heure à choisir"
    ];
    get("mobile-selection").textContent = `Votre sélection\u00a0: ${compact.join(" · ")}.`;
    makeRecap(get("confirmation-recap"));
  }

  function syncStepButtons() {
    stepButtons.forEach((button, index) => {
      button.disabled = index > state.reached;
      if (index === state.step) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }

  function enterPanel(panel) {
    if (transitionFrame) cancelAnimationFrame(transitionFrame);
    panel.classList.remove("entering");
    if (!reduceMotion.matches && !keyboard) {
      panel.classList.add("entering");
      transitionFrame = requestAnimationFrame(() => {
        transitionFrame = requestAnimationFrame(() => panel.classList.remove("entering"));
      });
    }
    panel.querySelector("h3").focus({ preventScroll: true });
    if (window.innerWidth < 700) {
      get("booking-app").scrollIntoView({ behavior: keyboard || reduceMotion.matches ? "instant" : "smooth", block: "start" });
    }
  }

  function goTo(step, moveFocus = true) {
    const lastValidStep = !state.service ? 0 : !state.day ? 1 : state.time === null ? 2 : 3;
    step = Math.max(0, Math.min(step, lastValidStep));
    state.step = step;
    state.reached = Math.min(Math.max(state.reached, step), lastValidStep);
    state.success = false;
    form.hidden = false;
    get("booking-success").hidden = true;
    error.textContent = "";
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    if (step === 1) renderDays();
    if (step === 2) renderSlots();
    syncStepButtons();
    const labels = ["Choisir le jour", "Choisir l’heure", "Renseigner mes coordonnées", "Terminer la simulation"];
    next.replaceChildren(document.createTextNode(labels[step] + " "));
    const arrow = addText(next, "span", "→");
    arrow.setAttribute("aria-hidden", "true");
    back.hidden = step === 0;
    updateSummary();
    announce(`Étape ${step + 1} sur 4\u00a0: ${panels[step].querySelector("h3").textContent}`);
    if (moveFocus) enterPanel(panels[step]);
  }

  function setService(id) {
    const selected = SERVICES.find(service => service.id === id);
    if (!selected) return;
    if (state.service?.id !== selected.id) {
      state.service = selected;
      state.day = null;
      state.time = null;
      state.reached = 0;
    }
    document.querySelectorAll('input[name="prestation"]').forEach(input => { input.checked = input.value === id; });
    updateSummary();
    announce(`${selected.name}. Choisissez ensuite le jour.`);
  }

  function validateField(input) {
    let message = "";
    if (input.id === "prenom" && (!/[\p{L}]/u.test(input.value.trim()) || input.value.trim().length > 60)) message = "Indiquez un prénom contenant au moins une lettre.";
    if (input.id === "telephone" && !validMobile(input.value)) message = "Indiquez un mobile français à 10 chiffres, commençant par 06 ou 07 (ou +33).";
    get(`${input.id}-error`).textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
    return !message;
  }

  form.addEventListener("change", event => {
    const input = event.target;
    error.textContent = "";
    if (input.name === "prestation") setService(input.value);
    if (input.name === "jour") {
      if (state.day !== input.value) { state.time = null; state.reached = 1; }
      state.day = input.value;
      updateSummary();
      announce(`${dateLabel(state.day)} sélectionné. Choisissez ensuite l’heure.`);
    }
    if (input.name === "heure") {
      state.time = Number(input.value);
      updateSummary();
      announce(`${timeLabel(state.time)} sélectionné.`);
    }
  });

  [get("prenom"), get("telephone")].forEach(input => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => { if (input.getAttribute("aria-invalid") === "true") validateField(input); });
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (state.step === 0 && !state.service) {
      error.textContent = "Choisissez une prestation d’exemple pour continuer.";
      document.querySelector('input[name="prestation"]').focus();
      return;
    }
    if (state.step === 1 && !state.day) {
      error.textContent = "Choisissez un jour disponible pour continuer.";
      get("day-options").querySelector("input:not(:disabled)")?.focus();
      return;
    }
    if (state.step === 2 && state.time === null) {
      error.textContent = "Choisissez une heure disponible pour continuer.";
      get("slot-options").querySelector("input:not(:disabled)")?.focus();
      return;
    }
    if (state.step < 3) { goTo(state.step + 1); return; }
    if (!state.service || !state.day || state.time === null) { goTo(3); return; }
    const fields = [get("prenom"), get("telephone")];
    const invalid = fields.filter(input => !validateField(input));
    if (invalid.length) { invalid[0].focus(); return; }
    // Revalider le créneau si l’onglet est resté ouvert jusqu’à son heure de début.
    if (!slotsFor(state.day, state.service).some(slot => slot.start === state.time && !slot.disabled)) {
      state.time = null;
      state.reached = 2;
      goTo(2);
      error.textContent = "Cette heure est maintenant passée. Choisissez un autre créneau d’exemple.";
      return;
    }
    state.success = true;
    form.hidden = true;
    get("booking-success").hidden = false;
    makeRecap(get("success-recap"));
    stepButtons.forEach(button => { button.removeAttribute("aria-current"); });
    announce("Simulation terminée. Aucun rendez-vous réservé, aucune information envoyée au salon.");
    enterPanel(get("booking-success"));
  });

  back.addEventListener("click", () => goTo(Math.max(0, state.step - 1)));
  stepButtons.forEach(button => button.addEventListener("click", () => {
    const target = Number(button.dataset.step);
    if (target <= state.reached) goTo(target);
  }));
  document.querySelectorAll(".choose-service").forEach(button => {
    button.addEventListener("click", () => {
      setService(button.dataset.service);
      goTo(1);
      get("reserver").scrollIntoView({ behavior: keyboard || reduceMotion.matches ? "instant" : "smooth", block: "start" });
    });
  });
  get("restart-booking").addEventListener("click", () => {
    form.reset();
    Object.assign(state, { step: 0, reached: 0, service: null, day: null, time: null, success: false });
    document.querySelectorAll(".field-error").forEach(element => { element.textContent = ""; });
    [get("prenom"), get("telephone")].forEach(input => input.removeAttribute("aria-invalid"));
    goTo(0);
  });
  get("calendar-button").addEventListener("click", () => {
    if (!state.success) return;
    const blob = new Blob([calendarText(state.day, state.time, state.service)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exemple-rendez-vous-hair-show.ics";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Fichier calendrier d’exemple téléchargé. Aucun rendez-vous réel n’a été pris.");
  });
  goTo(0, false);
}

if (typeof document !== "undefined") initPage();
