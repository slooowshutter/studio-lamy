document.documentElement.classList.add('js');
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('shown'); const number = entry.target.querySelector('[data-count]'); if (number && !matchMedia('(prefers-reduced-motion: reduce)').matches) { number.textContent = '00'; setTimeout(() => { number.textContent = number.dataset.count; }, 180); } observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  revealItems.forEach((item, index) => { item.style.transitionDelay = `${index * 60}ms`; observer.observe(item); });
} else revealItems.forEach(item => item.classList.add('shown'));

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-category]').forEach(row => { row.hidden = button.dataset.filter !== 'tout' && row.dataset.category !== button.dataset.filter; });
}));

const panel = document.querySelector('#booking-panel');
const summary = document.querySelector('#summary');
const count = document.querySelector('#step-count');
const restart = document.querySelector('#restart');
let service = '', day = null, time = '';
const formatDay = date => new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(date);
function updateSummary() { summary.textContent = [service, day ? formatDay(day) : '', time].filter(Boolean).join(' · ') || 'Aucune sélection pour le moment.'; restart.hidden = !service; }
function show(html, step, focus = true) {
  panel.innerHTML = html; count.textContent = step; panel.classList.remove('panel-enter'); void panel.offsetWidth; panel.classList.add('panel-enter');
  updateSummary(); if (focus) panel.querySelector('h3').focus();
}
function first(focus = true) {
  service = ''; day = null; time = '';
  show('<h3 tabindex="-1">Choisissez une prestation.</h3><p>Un choix pour essayer, sans envoi.</p><div class="choices"><button type="button" data-service="Coupe">Coupe <span>↗</span></button><button type="button" data-service="Barbe">Barbe <span>↗</span></button></div>', '01 / 04', focus);
}
function chooseDay() {
  day = null; time = '';
  const now = new Date(); const days = [];
  for (let i = 1; i <= 14; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    const closed = date.getDay() === 0 || date.getDay() === 6;
    days.push(`<button type="button" data-day="${i}" ${closed ? 'disabled' : ''}>${formatDay(date)}${closed ? '<br>Fermé' : ''}</button>`);
  }
  show(`<h3 tabindex="-1">Choisissez un jour.</h3><p>Horaires à confirmer. Les 14 prochains jours et les créneaux servent uniquement à la simulation.</p><div class="days">${days.join('')}</div><button class="back" type="button" data-back="service">← Modifier la prestation</button>`, '02 / 04');
}
function chooseTime() {
  const start = day.getDay() === 1 ? 13 * 60 + 30 : 9 * 60;
  const now = new Date(); const slots = [];
  for (let minute = start; minute < 19 * 60; minute += 30) {
    const hours = Math.floor(minute / 60), minutes = minute % 60;
    const date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
    const label = `${hours} h ${String(minutes).padStart(2, '0')}`;
    slots.push(`<button type="button" data-time="${label}" ${date <= now ? 'disabled' : ''}>${label}</button>`);
  }
  const available = slots.some(slot => !slot.includes('disabled'));
  show(`<h3 tabindex="-1">Choisissez une heure.</h3><p>${formatDay(day)} · Créneaux fictifs, horaires à confirmer.</p>${available ? `<div class="times">${slots.join('')}</div>` : '<p>Aucun horaire proposé pour ce jour. Choisissez un autre jour.</p>'}<button class="back" type="button" data-back="day">← Modifier le jour</button>`, '03 / 04');
}
function details() {
  show(`<h3 tabindex="-1">Vérifiez votre essai.</h3><p class="recap">${service} · ${formatDay(day)} · ${time}</p><p>Ces coordonnées restent dans votre navigateur et ne sont pas envoyées.</p><form class="booking-form" novalidate><label>Prénom<input name="prenom" autocomplete="given-name" aria-describedby="prenom-error"></label><p class="error" id="prenom-error"></p><label>Téléphone<input name="telephone" type="tel" autocomplete="tel" inputmode="tel" aria-describedby="telephone-error"></label><p class="error" id="telephone-error"></p><button class="button dark" type="submit">Confirmer la simulation →</button></form><button class="back" type="button" data-back="time">← Modifier l’heure</button>`, '04 / 04');
}
function done(name) {
  show(`<h3 tabindex="-1">Essai terminé, ${name}.</h3><p>Ce choix est une simulation. Aucun rendez-vous n’a été pris ni transmis au salon.</p><a class="button dark" href="https://www.planity.com/joakim-coiffeur-barbier-14000-caen">Réserver sur Planity ↗</a>`, '04 / 04');
}
panel.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target, name = form.elements.prenom.value.trim(), phone = form.elements.telephone.value.trim();
  const nameError = form.querySelector('#prenom-error'), phoneError = form.querySelector('#telephone-error');
  nameError.textContent = name ? '' : 'Indiquez votre prénom.';
  phoneError.textContent = /^(?:(?:\+33|0033)\s?[1-9]|0[1-9])(?:[\s.\-]?\d{2}){4}$/.test(phone) ? '' : 'Indiquez un numéro de téléphone français valide.';
  form.elements.prenom.setAttribute('aria-invalid', String(!name));
  form.elements.telephone.setAttribute('aria-invalid', String(Boolean(phoneError.textContent)));
  if (nameError.textContent || phoneError.textContent) { (nameError.textContent ? form.elements.prenom : form.elements.telephone).focus(); return; }
  // Inject user input as text, never as markup.
  done(''); panel.querySelector('h3').textContent = `Essai terminé, ${name}.`;
});
panel.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.service) { service = button.dataset.service; chooseDay(); }
  else if (button.dataset.day !== undefined) { const now = new Date(); day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Number(button.dataset.day), 12); chooseTime(); }
  else if (button.dataset.time) { time = button.dataset.time; details(); }
  else if (button.dataset.back === 'service') first();
  else if (button.dataset.back === 'day') chooseDay();
  else if (button.dataset.back === 'time') chooseTime();
});
restart.addEventListener('click', () => first());
