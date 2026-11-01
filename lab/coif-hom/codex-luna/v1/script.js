(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const parisTime = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date).reduce((map, part) => (map[part.type] = part.value, map), {});
    return { y: +parts.year, m: +parts.month, d: +parts.day, h: +parts.hour, mi: +parts.minute };
  };
  const iso = date => date.toISOString().slice(0, 10);
  const currentParis = parisTime();
  const todayISO = iso(new Date(Date.UTC(currentParis.y, currentParis.m - 1, currentParis.d, 12)));
  const shortDays = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const months = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });
  const hours = { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1020] };
  const services = $$(".service-row[data-id]").map(row => ({
    id: row.dataset.id, name: row.dataset.name, min: Number(row.dataset.min), price: Number(row.dataset.price)
  }));
  const state = { service: null, date: null, time: null, step: 1 };
  const summary = (key, value) => {
    const target = $('[data-summary="' + key + '"]');
    if (target) target.textContent = value || "—";
  };
  const service = () => services.find(item => item.id === state.service);
  const dateLabel = (date, long = false) => {
    const value = long
      ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date)
      : shortDays[date.getUTCDay()] + " " + date.getUTCDate();
    return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
  };
  const updateSummary = () => {
    const chosen = service();
    summary("service", chosen ? chosen.name : "À choisir");
    summary("date", state.date ? dateLabel(new Date(state.date + "T12:00:00Z"), true) : "—");
    summary("time", state.time || "—");
    summary("price", chosen ? chosen.price + " €" : "—");
  };
  const easter = year => {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(year, month - 1, day, 12);
  };
  const isFrenchHoliday = date => {
    const year = date.getUTCFullYear();
    const fixed = new Set(["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map(value => year + "-" + value));
    const easterDate = easter(year), day = 86400000;
    [1, 39, 50].forEach(offset => fixed.add(iso(new Date(easterDate + offset * day))));
    return fixed.has(iso(date));
  };

  // Affichage de l’ouverture selon l’heure de Paris et les horaires publiés.
  const todayDate = new Date(Date.UTC(currentParis.y, currentParis.m - 1, currentParis.d, 12));
  const todayHours = hours[todayDate.getUTCDay()];
  const status = $("[data-status]");
  const todayRow = $('.hours-table tr[data-day="' + todayDate.getUTCDay() + '"]');
  if (todayRow) todayRow.classList.add("is-today");
  if (status) {
    if (!todayHours) status.textContent = "Fermé aujourd’hui · horaires publics à confirmer";
    else if (currentParis.h * 60 + currentParis.mi < todayHours[0])
      status.textContent = "Ouvre aujourd’hui à 09 h · horaires à confirmer";
    else if (currentParis.h * 60 + currentParis.mi < todayHours[1]) {
      status.textContent = "Ouvert maintenant · horaires publiés, à confirmer";
      status.parentElement.classList.add("is-open");
    } else status.textContent = "Fermé pour aujourd’hui · horaires publics à confirmer";
    if (isFrenchHoliday(todayDate)) status.textContent += " · jour férié, ouverture à confirmer";
  }

  // La fiche s’imprime une fois, en restant immobile si la personne préfère réduire les animations.
  const record = $(".record");
  if (record && record.animate) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const entrance = record.animate(
      reduceMotion
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "translateY(-12px) rotate(-1deg)" }, { opacity: 1, transform: "translateY(0) rotate(1.15deg)" }],
      { duration: reduceMotion ? 160 : 620, easing: "cubic-bezier(.23, 1, .32, 1)", fill: "both" }
    );
    entrance.onfinish = () => entrance.cancel();
  }

  // Menu mobile : fermeture à Échap et focus géré.
  const toggle = $(".menu-toggle"), menu = $("#menu-mobile");
  if (toggle && menu) {
    let menuTimer = 0;
    const closeMenu = returnFocus => {
      window.clearTimeout(menuTimer);
      toggle.setAttribute("aria-expanded", "false");
      $(".menu-toggle__text", toggle).textContent = "Menu";
      menu.classList.remove("is-open");
      menuTimer = window.setTimeout(() => { menu.hidden = true; }, 240);
      if (returnFocus) toggle.focus({ preventScroll: true });
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      $(".menu-toggle__text", toggle).textContent = open ? "Fermer" : "Menu";
      if (open) {
        window.clearTimeout(menuTimer);
        menu.hidden = false;
        requestAnimationFrame(() => menu.classList.add("is-open"));
        $("a", menu).focus({ preventScroll: true });
      } else closeMenu(true);
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("a")) closeMenu(true);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") closeMenu(true);
    });
  }

  // Douze jours générés selon l’heure de Paris, avec les jours fermés désactivés.
  const dateStrip = $("[data-dates]");
  if (dateStrip) {
    for (let offset = 0; offset < 12; offset++) {
      const date = new Date(Date.UTC(currentParis.y, currentParis.m - 1, currentParis.d + offset, 12));
      const day = date.getUTCDay(), open = Boolean(hours[day]);
      const dateISO = iso(date), holiday = isFrenchHoliday(date);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "date-option";
      button.dataset.date = dateISO;
      button.disabled = !open;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", dateLabel(date, true) + (open ? "" : ", fermé") + (holiday ? ", jour férié, ouverture à confirmer" : ""));
      const label = document.createElement("span");
      label.textContent = shortDays[day];
      const number = document.createElement("strong");
      number.textContent = date.getUTCDate();
      const note = document.createElement("small");
      note.textContent = open ? (holiday ? "Férié · à confirmer" : months.format(date)) : "Fermé";
      button.append(label, number, note);
      if (!offset && open) button.setAttribute("aria-current", "date");
      dateStrip.append(button);
    }
  }

  const panels = $$("[data-panel]");
  const stepButtons = $$("[data-step-button]");
  const enableStep = (number, enabled = true) => {
    const button = $('[data-step-button="' + number + '"]');
    if (button) button.disabled = !enabled;
  };
  const setError = (name, message) => {
    const target = $('[data-error="' + name + '"]');
    if (target) target.textContent = message;
  };
  const updateConfirmRecap = () => {
    const chosen = service(), target = $("[data-confirm-recap]");
    const day = state.date ? dateLabel(new Date(state.date + "T12:00:00Z"), true) : "jour à choisir";
    if (target && chosen) target.textContent = chosen.name + " · " + day + " à " + (state.time || "heure à choisir") + " · " + chosen.price + " € indicatifs.";
  };
  const setStep = number => {
    state.step = number;
    const nextPanel = $('[data-panel="' + number + '"]');
    panels.forEach(panel => {
      panel.hidden = panel !== nextPanel;
      panel.inert = panel !== nextPanel;
    });
    if (nextPanel) {
      nextPanel.getAnimations().forEach(animation => animation.cancel());
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const animation = nextPanel.animate(
        reduceMotion
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: reduceMotion ? 100 : 220, easing: "cubic-bezier(.23, 1, .32, 1)" }
      );
    }
    stepButtons.forEach(button => {
      const n = Number(button.dataset.stepButton);
      button.classList.toggle("is-current", n === number);
      if (n === number) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    const heading = $('[data-panel="' + number + '"] h3');
    if (heading) heading.focus({ preventScroll: true });
    if (number === 4) updateConfirmRecap();
  };
  const renderTimes = () => {
    const target = $("[data-times]");
    const dayCaption = $("[data-selected-date]");
    if (!target || !state.date) return;
    const date = new Date(state.date + "T12:00:00Z");
    const day = date.getUTCDay(), range = hours[day], chosen = service();
    if (!range || !chosen) return;
    dayCaption.textContent = dateLabel(date, true) + (isFrenchHoliday(date) ? " · jour férié, ouverture à confirmer" : "");
    target.replaceChildren();
    state.time = null;
    const starts = [];
    for (let minute = range[0]; minute + chosen.min <= range[1]; minute += 30) starts.push(minute);
    starts.forEach((minute, index) => {
      const label = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
      const seed = [...state.date].reduce((total, char) => total + char.charCodeAt(0), 0);
      const booked = (index * 7 + seed) % 6 === 2;
      const past = state.date === todayISO && minute <= currentParis.h * 60 + currentParis.mi;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-option";
      button.textContent = booked ? label + " · déjà pris" : label;
      button.dataset.time = label;
      button.disabled = booked || past;
      button.setAttribute("aria-pressed", "false");
      if (booked) button.setAttribute("aria-label", label + ", déjà pris");
      if (past) button.setAttribute("aria-label", label + ", heure passée");
      target.append(button);
    });
    enableStep(3, false);
    setError("time", "");
    updateSummary();
  };

  dateStrip?.addEventListener("click", event => {
    const button = event.target.closest("[data-date]");
    if (!button || button.disabled) return;
    $$(".date-option", dateStrip).forEach(option => option.setAttribute("aria-pressed", String(option === button)));
    state.date = button.dataset.date;
    state.time = null;
    enableStep(3, true);
    enableStep(4, false);
    renderTimes();
    updateSummary();
  });
  $("[data-times]")?.addEventListener("click", event => {
    const button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    $$("[data-time]").forEach(option => option.setAttribute("aria-pressed", String(option === button)));
    state.time = button.dataset.time;
    enableStep(4, true);
    setError("time", "");
    updateSummary();
  });
  $$(".service-options input").forEach(input => input.addEventListener("change", () => {
    state.service = input.value;
    enableStep(2, true);
    state.date = null;
    state.time = null;
    enableStep(3, false);
    enableStep(4, false);
    $$("[data-date]").forEach(button => button.setAttribute("aria-pressed", "false"));
    $("[data-times]")?.replaceChildren();
    updateSummary();
    setError("service", "");
  }));
  stepButtons.forEach(button => button.addEventListener("click", () => {
    const number = Number(button.dataset.stepButton);
    if (!button.disabled && number < state.step) setStep(number);
  }));
  $$("[data-next]").forEach(button => button.addEventListener("click", () => {
    const step = Number(button.dataset.next);
    if (step === 1 && !state.service) return setError("service", "Choisissez une prestation pour continuer.");
    if (step === 2 && !state.date) return setError("date", "Choisissez un jour ouvert.");
    if (step === 3 && !state.time) return setError("time", "Choisissez une heure disponible.");
    setStep(step + 1);
  }));
  $$("[data-back]").forEach(button => button.addEventListener("click", () => setStep(Number(button.dataset.back) - 1)));
  $$("[data-book]").forEach(link => link.addEventListener("click", () => {
    const input = $('.service-options input[value="' + link.dataset.book + '"]');
    if (input) {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setStep(1);
    }
  }));

  const form = $("#booking-form");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const nameInput = form.elements.firstName;
    const phoneInput = form.elements.phone;
    const name = nameInput.value.trim(), phoneDigits = phoneInput.value.trim().replace(/\D/g, "");
    setError("name", "");
    setError("phone", "");
    if (name.length < 2) {
      setError("name", "Indiquez un prénom d’au moins deux lettres.");
      nameInput.focus();
      return;
    }
    if (!/^(0[67]\d{8}|33[67]\d{8})$/.test(phoneDigits)) {
      setError("phone", "Entrez un numéro mobile français valide.");
      phoneInput.focus();
      return;
    }
    if (!state.service || !state.date || !state.time) {
      setStep(1);
      setError("service", "Reprenez votre sélection pour continuer.");
      return;
    }
    const chosen = service(), date = new Date(state.date + "T12:00:00Z");
    const fullDate = dateLabel(date, true);
    $("[data-success-copy]").textContent = name + ", demande simulée pour " + chosen.name.toLocaleLowerCase("fr-FR") + " le " + fullDate + " à " + state.time + ". Prix indicatif : " + chosen.price + " €.";
    panels.forEach(panel => { panel.hidden = true; });
    stepButtons.forEach(button => { button.disabled = true; });
    const success = $("[data-success]");
    success.hidden = false;
    success.focus();
    updateSummary();
    form.dataset.calendarStart = state.date.replaceAll("-", "") + "T" + state.time.replace(":", "") + "00";
    form.dataset.calendarName = "Coif Hom · " + chosen.name;
  });
  $("[data-calendar]")?.addEventListener("click", () => {
    const start = form.dataset.calendarStart, chosen = service();
    const endMinute = Number(state.time.slice(0, 2)) * 60 + Number(state.time.slice(3)) + chosen.min;
    const end = state.date.replaceAll("-", "") + "T" + String(Math.floor(endMinute / 60)).padStart(2, "0") + String(endMinute % 60).padStart(2, "0") + "00";
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const content = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Studio Lamy//Coif Hom Preview//FR",
      "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "DTSTAMP:" + stamp,
      "DTSTART;TZID=Europe/Paris:" + start, "DTEND;TZID=Europe/Paris:" + end,
      "SUMMARY:" + form.dataset.calendarName, "LOCATION:21 rue Sainte-Hélène\\, 69002 Lyon",
      "DESCRIPTION:Simulation de rendez-vous. Rien n’a été réservé ni envoyé.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "coif-hom-rendez-vous.ics";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $("[data-reset]")?.addEventListener("click", () => {
    form.reset();
    state.service = null; state.date = null; state.time = null;
    stepButtons.forEach((button, index) => { button.disabled = index !== 0; });
    $("[data-success]").hidden = true;
    $$("[data-date]").forEach(button => button.setAttribute("aria-pressed", "false"));
    updateSummary();
    setStep(1);
  });

  // La barre mobile disparaît devant le module et le pied de page.
  const sticky = $("[data-sticky]");
  if (sticky && "IntersectionObserver" in window) {
    const seen = { hero: true, booking: false, footer: false };
    const update = () => {
      const visible = !seen.hero && !seen.booking && !seen.footer;
      sticky.classList.toggle("is-on", visible);
      sticky.inert = !visible;
    };
    [[".hero", "hero"], ["#reserver", "booking"], ["#pied", "footer"]].forEach(pair => {
      const element = $(pair[0]), key = pair[1];
      if (element) new IntersectionObserver(([entry]) => {
        seen[key] = entry.isIntersecting;
        update();
      }).observe(element);
    });
    update();
  }
})();
